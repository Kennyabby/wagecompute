// Epsilon — the AI assistant launcher + chat panel, mounted once at the
// App.js root (alongside Notify/the update-progress banner) so it's present
// across every module without per-page wiring. Talks to
// wageserver/UserModule/AIAssistant/epsilon.js's streaming
// POST /ai/epsilon/message/stream (via streamEpsilon.js), the blocking
// POST /ai/epsilon/message (kept only for the confirm-action follow-ups),
// GET /ai/epsilon/conversations, GET /ai/epsilon/history, and
// POST /ai/epsilon/clear — the same authenticated fetchServer every other
// component already uses, so it's automatically tenant/permission-scoped to
// whoever is logged in.
import './Epsilon.css'
import { useState, useEffect, useRef, useContext, useMemo } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import renderMarkdownLite from './markdownLite'
import streamEpsilonMessage from './streamEpsilon'
import { generatePDF, generateExcel } from '../../utils/exportUtils'
import { getSpeechSupport, speak, stopSpeaking } from '../../Resources/speechVoice'

const STYLE_OPTIONS = [
    { value: 'quick', label: 'Quick' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'detailed', label: 'Detailed' },
]
const STYLE_STORAGE_KEY = 'epsilon-response-style'
const THEME_STORAGE_KEY = 'epsilon-theme'
const AUTO_SPEAK_STORAGE_KEY = 'epsilon-auto-speak'

// Friendly status text per backend tool name (see epsilon.js's TOOLS list) —
// falls back to a title-cased version of the raw name for any tool not
// listed here, so a newly-added tool never shows up blank.
const TOOL_STATUS_LABELS = {
    diagnose_blockage: 'Checking why that’s blocked…',
    trace_record_history: 'Tracing the transaction history…',
    who_can_approve: 'Checking who can approve this…',
    check_document_approval_status: 'Checking approval status…',
    list_approval_requests: 'Checking the approvals queue…',
    check_session_close_readiness: 'Checking session close readiness…',
    search_directory: 'Looking that up…',
    explain_topic: 'Looking that up…',
    interpret_accounting_view: 'Reading the accounting figures…',
    generate_report: 'Generating the report…',
    recommend_reorders: 'Checking stock levels…',
    propose_purchase_order: 'Drafting a purchase order…',
    propose_script_correction: 'Preparing a data correction…',
    analyze_profit_opportunities: 'Analyzing revenue and expenses…',
    explain_purchase_reversal_block: 'Checking the purchase reversal…',
    explain_reconciliation_status: 'Checking reconciliation status…',
    explain_accommodation_balance: 'Checking the accommodation balance…',
    explain_rental_balance: 'Checking the rental balance…',
    explain_sales_debt: 'Checking outstanding sales debt…',
    explain_outstanding_shortage: 'Checking the outstanding shortage…',
    explain_account_validity: 'Checking the account…',
    explain_chart_of_accounts_block: 'Checking the chart of accounts…',
    explain_gl_mapping: 'Checking the GL mapping…',
    explain_order_discrepancy: 'Checking the order discrepancy…',
    explain_module_entitlement: 'Checking your plan entitlement…',
    explain_payslip: 'Reading the payslip…',
    explain_attendance_block: 'Checking attendance…',
    explain_employee_receivable: 'Checking the employee receivable…',
    explain_partner_aging: 'Checking partner aging…',
    check_partner_ledger_drift: 'Checking the partner ledger…',
    explain_asset_value: 'Checking asset value…',
    explain_depreciation_due: 'Checking depreciation…',
}
const toolStatusLabel = (toolName) => (
    TOOL_STATUS_LABELS[toolName]
    || `Checking ${String(toolName || '').replace(/_/g, ' ')}…`
)

const formatTime = (date) => {
    try {
        return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch (e) {
        return ''
    }
}

const formatRelativeTime = (timestamp) => {
    if (!timestamp) return ''
    const diffMs = Date.now() - Number(timestamp)
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    try { return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) } catch (e) { return '' }
}

const resolveDefaultTheme = () => {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY)
        if (stored === 'light' || stored === 'dark') return stored
    } catch (e) { /* ignore */ }
    try {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    } catch (e) { /* ignore */ }
    return 'light'
}

const Epsilon = () => {
    const { server, fetchServer, company, companyRecord } = useContext(ContextProvider)
    // Same shape every real export caller already builds (e.g.
    // BusinessPartners.js) — exportUtils.js's generatePDF reads
    // companyInfo.name directly with no fallback, so this must never be
    // undefined by the time an export button is clickable.
    const companyInfo = useMemo(() => ({
        name: companyRecord?.name || company || 'Company',
        address: companyRecord?.address || '',
        phone: companyRecord?.phone || companyRecord?.mobile || '',
        email: companyRecord?.email || companyRecord?.emailid || '',
    }), [company, companyRecord])
    const [open, setOpen] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [messages, setMessages] = useState([]) // { role: 'user'|'assistant', text, at, streaming?, proposal? }
    const [draft, setDraft] = useState('')
    const [sending, setSending] = useState(false)
    const [toolStatus, setToolStatus] = useState(null)
    const [historyLoaded, setHistoryLoaded] = useState(false)
    const [error, setError] = useState('')
    const [copiedIndex, setCopiedIndex] = useState(null)
    const [expandedThinkingIndex, setExpandedThinkingIndex] = useState(null)
    const [style, setStyle] = useState(() => {
        try { return localStorage.getItem(STYLE_STORAGE_KEY) || 'balanced' } catch (e) { return 'balanced' }
    })
    const [theme, setTheme] = useState(resolveDefaultTheme)
    const [conversations, setConversations] = useState([])
    const [conversationsLoaded, setConversationsLoaded] = useState(false)
    const [activeConversationId, setActiveConversationId] = useState(null)
    // A thought typed while Epsilon is still streaming a reply — can't be
    // injected into that in-flight request (the API has no such thing), so
    // it's queued and auto-sent as soon as the current reply finishes,
    // rather than making the user watch the reply finish, remember what
    // they wanted to add, and retype it into a brand new message.
    const [queuedFollowUp, setQueuedFollowUp] = useState('')
    // Voice input/output — both entirely browser-native (SpeechRecognition /
    // speechSynthesis); no audio ever reaches our backend, only the
    // resulting text (same as a typed message). See speechVoice.js.
    const { sttSupported, ttsSupported } = useMemo(() => getSpeechSupport(), [])
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [voicePreference, setVoicePreference] = useState({ gender: 'female', accent: 'en-US' })
    const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(() => {
        try { return localStorage.getItem(AUTO_SPEAK_STORAGE_KEY) === 'true' } catch (e) { return false }
    })
    // Full-screen "voice mode" (the orb) — a continuous listen-respond-speak
    // loop, distinct from the small mic-into-textbox affordance: tapping the
    // mic opens this instead of just dictating one message.
    const [voiceModeOpen, setVoiceModeOpen] = useState(false)
    const [voicePhase, setVoicePhase] = useState('idle') // idle | listening | processing | speaking
    const voiceModeOpenRef = useRef(false)
    useEffect(() => { voiceModeOpenRef.current = voiceModeOpen }, [voiceModeOpen])
    const bottomRef = useRef(null)
    const inputRef = useRef(null)
    const mountedRef = useRef(true)
    const abortControllerRef = useRef(null)
    const recognitionRef = useRef(null)
    const recognitionCancelledRef = useRef(false)
    // Drives the orb's live reactive pulse (a CSS custom property, --level,
    // read straight off the DOM node via rAF — deliberately NOT React state,
    // since this updates far too often, ~60fps, for setState to be sane).
    const orbCoreRef = useRef(null)
    const micStreamRef = useRef(null)
    const audioCtxRef = useRef(null)
    const analyserRef = useRef(null)
    const levelRafRef = useRef(null)
    const speakLevelRef = useRef(0)
    const speakRafRef = useRef(null)
    const speakBoundaryFiredRef = useRef(false)
    const speakFallbackTimerRef = useRef(null)
    const speakFallbackIntervalRef = useRef(null)
    // Mirrors queuedFollowUp for reliable reads from inside sendMessage's
    // async closure — the closure's own `queuedFollowUp` binding is captured
    // at call time and won't see a state update made mid-stream via setState.
    const queuedFollowUpRef = useRef('')
    // Mirrors `sending` for the same reason, but critically also for the
    // SpeechRecognition 'onend' callback: that callback closes over whatever
    // render was active when listening started, so reading the `sending`
    // state directly there can be stale by the time the user actually stops
    // talking. A ref's `.current` is always live regardless of which
    // render's closure reads it.
    const sendingRef = useRef(false)
    useEffect(() => { sendingRef.current = sending }, [sending])

    useEffect(() => () => {
        mountedRef.current = false
        abortControllerRef.current?.abort()
        recognitionRef.current?.abort()
        stopSpeaking()
        stopLevelMeter()
        stopSpeakLevelLoop()
    }, [])

    // Tenant-wide voice preference an admin set in Settings > Billing >
    // Epsilon AI — fetched once the panel is actually opened (same trigger
    // as history loading; no point fetching before the user ever opens it).
    const [voicePrefLoaded, setVoicePrefLoaded] = useState(false)
    useEffect(() => {
        // Needed for STT too (recognition.lang), not just TTS — fetch
        // whenever either voice capability exists, not only when speaking
        // replies back is possible.
        if (!open || voicePrefLoaded || (!ttsSupported && !sttSupported)) return
        (async () => {
            const resp = await fetchServer('GET', {}, 'ai/epsilon/voice-preference', server)
            if (!mountedRef.current) return
            if (!resp.err && resp.ok) {
                setVoicePreference({ gender: resp.voiceGender || 'female', accent: resp.voiceAccent || 'en-US' })
            }
            setVoicePrefLoaded(true)
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    // Real vendor list, for the editable vendor picker on a purchase-order
    // proposal's table — same generic gateway (getDocsDetails, collection:
    // 'Vendors') Purchase.js itself uses to populate its own vendor
    // dropdown, so this is always the same registered-vendor list a human
    // filling the real form would see. Fetched once the panel opens, not
    // gated on an actual proposal existing yet — cheap, and avoids a visible
    // delay the first time a purchase_order card appears.
    const [vendorsList, setVendorsList] = useState([])
    const [vendorsListLoaded, setVendorsListLoaded] = useState(false)
    useEffect(() => {
        if (!open || vendorsListLoaded || !company) return
        (async () => {
            const resp = await fetchServer('POST', { database: company, collection: 'Vendors' }, 'getDocsDetails', server)
            if (!mountedRef.current) return
            if (!resp.err && Array.isArray(resp.record)) setVendorsList(resp.record)
            setVendorsListLoaded(true)
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, company])

    useEffect(() => {
        if (!open || historyLoaded) return
        (async () => {
            const resp = await fetchServer('GET', {}, 'ai/epsilon/history', server)
            if (!mountedRef.current) return
            if (!resp.err && resp.ok && Array.isArray(resp.messages)) {
                setMessages(resp.messages)
                if (resp.conversationId) setActiveConversationId(resp.conversationId)
            }
            setHistoryLoaded(true)
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const loadConversations = async () => {
        const resp = await fetchServer('GET', {}, 'ai/epsilon/conversations', server)
        if (!mountedRef.current) return
        if (!resp.err && resp.ok && Array.isArray(resp.conversations)) {
            setConversations(resp.conversations)
        }
        setConversationsLoaded(true)
    }

    // Manual refresh — re-fetches whatever conversation is currently open
    // (not necessarily the most recent one) plus the sidebar list, without
    // requiring a full close/reopen of the widget. Resets the loaded flags
    // first so the same loading state the initial open uses shows here too,
    // rather than silently swapping content in.
    const [isRefreshingChat, setIsRefreshingChat] = useState(false)
    const refreshChat = async () => {
        if (isRefreshingChat) return
        setIsRefreshingChat(true)
        setHistoryLoaded(false)
        try {
            const resp = await fetchServer(
                'GET',
                activeConversationId ? { conversationId: activeConversationId } : {},
                'ai/epsilon/history',
                server
            )
            if (!mountedRef.current) return
            if (!resp.err && resp.ok && Array.isArray(resp.messages)) {
                setMessages(resp.messages)
                if (resp.conversationId) setActiveConversationId(resp.conversationId)
            }
        } finally {
            if (mountedRef.current) setHistoryLoaded(true)
        }
        if (conversationsLoaded) {
            setConversationsLoaded(false)
            await loadConversations()
        }
        if (mountedRef.current) setIsRefreshingChat(false)
    }

    useEffect(() => {
        if (expanded && !conversationsLoaded) loadConversations()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expanded])

    // Collapsed and expanded are two separate, mutually-exclusive DOM
    // subtrees (see the conditional render below) — switching `expanded`
    // unmounts one and mounts the other, so bottomRef points at a brand new
    // node that has never been scrolled. Without `expanded` in the deps,
    // this effect never re-ran on that toggle, which is why expanding used
    // to land at the top of the conversation instead of the last message.
    // Jump instantly on open/expand transitions (nothing to animate through
    // yet); keep the smooth scroll for new messages arriving while already open.
    const prevExpandedRef = useRef(expanded)
    useEffect(() => {
        if (!open || !bottomRef.current) return
        const justToggledExpanded = prevExpandedRef.current !== expanded
        prevExpandedRef.current = expanded
        bottomRef.current.scrollIntoView({ behavior: justToggledExpanded ? 'auto' : 'smooth' })
    }, [messages.length, sending, open, expanded])

    useEffect(() => {
        if (open) {
            // Focus shortly after the panel mounts/animates in.
            const t = setTimeout(() => inputRef.current?.focus(), 80)
            return () => clearTimeout(t)
        }
    }, [open, expanded])

    // Lets any other component open Epsilon pre-seeded with a question —
    // e.g. an "Ask Epsilon why" affordance next to a blocked-action error —
    // without that component needing to import/control this one directly.
    // Same wc:*-CustomEvent convention App.js already uses for dashboard-
    // summary updates. No call sites wire this up yet (a fast follow, not
    // part of this pass) — the mechanism is just ready for when they do.
    useEffect(() => {
        const handler = (e) => {
            setOpen(true)
            if (e.detail?.question) setDraft(e.detail.question)
        }
        window.addEventListener('wc:epsilon-ask', handler)
        return () => window.removeEventListener('wc:epsilon-ask', handler)
    }, [])

    const changeStyle = (value) => {
        setStyle(value)
        try { localStorage.setItem(STYLE_STORAGE_KEY, value) } catch (e) { /* ignore */ }
        setMenuOpen(false)
    }

    const toggleTheme = () => {
        setTheme((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark'
            try { localStorage.setItem(THEME_STORAGE_KEY, next) } catch (e) { /* ignore */ }
            return next
        })
    }

    // Text-mode convenience — reads every reply aloud without opening full
    // voice mode. A personal preference (like theme/style), not tenant
    // policy, so it lives in localStorage rather than the server.
    const toggleAutoSpeak = () => {
        setAutoSpeakEnabled((prev) => {
            const next = !prev
            try { localStorage.setItem(AUTO_SPEAK_STORAGE_KEY, String(next)) } catch (e) { /* ignore */ }
            if (!next) stopEpsilonSpeaking()
            return next
        })
    }

    const clearQueuedFollowUp = () => {
        queuedFollowUpRef.current = ''
        setQueuedFollowUp('')
    }

    // Purely a client-side reset now — no server call. The next message sent
    // creates a fresh conversation server-side; nothing is deleted here.
    const startNewChat = () => {
        setMenuOpen(false)
        abortControllerRef.current?.abort()
        setSending(false)
        setToolStatus(null)
        setMessages([])
        setActiveConversationId(null)
        setError('')
        clearQueuedFollowUp()
        setTimeout(() => inputRef.current?.focus(), 50)
    }

    const selectConversation = async (conversationId) => {
        if (conversationId === activeConversationId) return
        abortControllerRef.current?.abort()
        setSending(false)
        setToolStatus(null)
        setMenuOpen(false)
        setError('')
        clearQueuedFollowUp()
        setMessages([])
        setActiveConversationId(conversationId)
        const resp = await fetchServer('GET', { conversationId }, 'ai/epsilon/history', server)
        if (!mountedRef.current) return
        if (!resp.err && resp.ok && Array.isArray(resp.messages)) {
            setMessages(resp.messages)
        }
    }

    const deleteConversation = async (conversationId, e) => {
        e?.stopPropagation()
        setConversations((prev) => prev.filter((c) => c.conversationId !== conversationId))
        if (conversationId === activeConversationId) {
            startNewChat()
        }
        await fetchServer('POST', { conversationId }, 'ai/epsilon/clear', server)
    }

    // ===== Orb reactivity: real mic amplitude while listening, word-boundary
    // pulses (with a timed fallback for voices that never fire them) while
    // speaking. Both funnel into the same --level CSS custom property on the
    // orb core, set directly via the DOM (not React state — this updates at
    // up to 60fps, way too hot a path for setState/re-render). =====

    const setOrbLevel = (level) => {
        orbCoreRef.current?.style.setProperty('--level', String(level))
    }

    const stopLevelMeter = () => {
        if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current)
        levelRafRef.current = null
        micStreamRef.current?.getTracks().forEach((t) => t.stop())
        micStreamRef.current = null
        analyserRef.current = null
        if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null }
        setOrbLevel(0)
    }

    // A second, independent getUserMedia stream purely for amplitude —
    // SpeechRecognition never exposes the raw audio it's listening to.
    // Purely a visual nicety: if the browser refuses a second mic stream (or
    // the user dismisses a second permission prompt), voice input itself is
    // completely unaffected — this just silently leaves the orb static.
    const startLevelMeter = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            if (!recognitionRef.current) { stream.getTracks().forEach((t) => t.stop()); return }
            micStreamRef.current = stream
            const AudioCtx = window.AudioContext || window.webkitAudioContext
            const ctx = new AudioCtx()
            audioCtxRef.current = ctx
            const source = ctx.createMediaStreamSource(stream)
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 256
            analyser.smoothingTimeConstant = 0.55
            source.connect(analyser)
            analyserRef.current = analyser
            const data = new Uint8Array(analyser.frequencyBinCount)
            const tick = () => {
                if (!analyserRef.current) return
                analyser.getByteFrequencyData(data)
                let sum = 0
                for (let i = 0; i < data.length; i++) sum += data[i]
                const avg = sum / data.length / 255
                setOrbLevel(Math.min(1, avg * 2.4))
                levelRafRef.current = requestAnimationFrame(tick)
            }
            tick()
        } catch (e) { /* visual nicety only — see comment above */ }
    }

    const stopSpeakLevelLoop = () => {
        if (speakRafRef.current) cancelAnimationFrame(speakRafRef.current)
        speakRafRef.current = null
        if (speakFallbackTimerRef.current) clearTimeout(speakFallbackTimerRef.current)
        speakFallbackTimerRef.current = null
        if (speakFallbackIntervalRef.current) clearInterval(speakFallbackIntervalRef.current)
        speakFallbackIntervalRef.current = null
        speakLevelRef.current = 0
        setOrbLevel(0)
    }

    const startSpeakLevelLoop = () => {
        speakBoundaryFiredRef.current = false
        const decay = () => {
            speakLevelRef.current *= 0.85
            if (speakLevelRef.current < 0.02) speakLevelRef.current = 0
            setOrbLevel(speakLevelRef.current)
            speakRafRef.current = requestAnimationFrame(decay)
        }
        speakRafRef.current = requestAnimationFrame(decay)
        // Some voices never fire 'onboundary' at all — if none has landed
        // shortly after speech starts, fall back to a steady synthetic pulse
        // so the orb still looks alive rather than sitting dead-still.
        speakFallbackTimerRef.current = setTimeout(() => {
            if (speakBoundaryFiredRef.current) return
            speakFallbackIntervalRef.current = setInterval(() => { speakLevelRef.current = 0.75 }, 260)
        }, 450)
    }

    const bumpSpeakLevel = () => {
        speakBoundaryFiredRef.current = true
        if (speakFallbackIntervalRef.current) { clearInterval(speakFallbackIntervalRef.current); speakFallbackIntervalRef.current = null }
        speakLevelRef.current = 1
    }

    const stopEpsilonSpeaking = () => {
        stopSpeaking()
        stopSpeakLevelLoop()
        setIsSpeaking(false)
    }

    // Stops the current SpeechRecognition session. `cancel: true` (mic
    // clicked again, orb tapped while listening, voice mode closed) discards
    // whatever was heard so far; `cancel: false` (browser detected trailing
    // silence on its own — the built-in "user stopped talking" signal) keeps
    // it and 'onend' below sends it.
    const stopListening = (cancel = false) => {
        if (!recognitionRef.current) return
        recognitionCancelledRef.current = cancel
        if (cancel) recognitionRef.current.abort()
        else recognitionRef.current.stop()
    }

    const startListening = () => {
        if (!sttSupported) return
        if (isListening) { stopListening(true); return }
        // Clear any leftover error from a previous attempt/turn before this
        // one starts — otherwise the onend fallback's setError(prev => prev
        // || …) below could preserve a stale, unrelated message instead of
        // reflecting THIS attempt's own outcome.
        setError('')
        // Never let Epsilon's own voice bleed into the mic.
        stopEpsilonSpeaking()
        const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognitionCtor()
        // Deliberately NOT voicePreference.accent — that's an admin-set
        // preference for how EPSILON's spoken replies sound (TTS), matched
        // loosely/gracefully against whatever voices the browser happens to
        // have (see speechVoice.js's pickVoice). Speech RECOGNITION is a
        // completely different, much stricter API — confirmed live: setting
        // recognition.lang to "en-NG" (a real, valid accent option in this
        // same Settings screen) made recognition silently produce zero
        // results on every attempt, with no visible cause (the resulting
        // empty transcript looked identical to "the user said nothing" —
        // see the onerror/onend fix below for the other half of this).
        // en-US is universally supported by every browser implementing this
        // API and handles a wide range of real accents reasonably well.
        recognition.lang = 'en-US'
        recognition.continuous = false
        recognition.interimResults = true
        recognition.maxAlternatives = 1
        let finalTranscript = ''
        recognitionCancelledRef.current = false

        recognition.onresult = (event) => {
            let interim = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const chunk = event.results[i][0].transcript
                if (event.results[i].isFinal) finalTranscript += chunk
                else interim += chunk
            }
            setDraft((finalTranscript + interim).trim())
        }
        // 'aborted' is the one real silent case — it only fires when WE
        // called recognition.abort() ourselves (the user cancelled), so
        // there's nothing to tell them that they don't already know.
        // Everything else, including 'no-speech', now surfaces something —
        // confirmed live: silently swallowing 'no-speech' made a genuine
        // recognition failure (e.g. an unsupported language, confirmed
        // separately above) look EXACTLY like "you didn't say anything",
        // with zero visible difference between the two — "I don't see any
        // sign that a prompt was sent at all" had no way to be diagnosed.
        recognition.onerror = (event) => {
            if (event.error === 'aborted') return
            setError(
                event.error === 'not-allowed' || event.error === 'service-not-allowed'
                    ? 'Microphone access was denied — allow microphone permission in your browser to use voice input.'
                    : event.error === 'no-speech'
                        ? "Didn't catch anything — tap the mic and try again."
                        : `Voice input failed (${event.error}) — please try again.`
            )
        }
        // Browsers fire 'onend' automatically once they detect the speaker
        // has stopped talking (a short trailing silence) — exactly the
        // "smartly know when the user is done talking" behavior, with no
        // custom silence-detection code needed.
        recognition.onend = () => {
            setIsListening(false)
            recognitionRef.current = null
            stopLevelMeter()
            const finalText = finalTranscript.trim()
            if (finalText && !recognitionCancelledRef.current) {
                if (voiceModeOpenRef.current) setVoicePhase('processing')
                sendMessage(finalText)
            } else if (voiceModeOpenRef.current) {
                setVoicePhase('idle')
                // No transcript and no error already set (onerror covers the
                // known failure cases above) — still don't leave this
                // silent; e.g. the browser can end recognition with neither
                // a result nor an error event at all in some edge cases.
                if (!finalText && !recognitionCancelledRef.current) {
                    setError((prev) => prev || "Didn't catch anything — tap the mic and try again.")
                }
            }
        }
        recognitionRef.current = recognition
        setDraft('')
        setIsListening(true)
        setVoicePhase('listening')
        try {
            recognition.start()
            startLevelMeter()
        } catch (e) {
            setIsListening(false)
            recognitionRef.current = null
            setVoicePhase('idle')
        }
    }

    // Mic click in the composer — opens the full-screen voice conversation
    // (the orb), not just a one-off dictation into the text box.
    const openVoiceMode = () => {
        if (!sttSupported) return
        setError('')
        setVoiceModeOpen(true)
        startListening()
    }

    const closeVoiceMode = () => {
        setVoiceModeOpen(false)
        setVoicePhase('idle')
        stopListening(true)
        stopEpsilonSpeaking()
    }

    // Tap-to-interrupt, ChatGPT-style: tapping the orb while it's talking
    // cuts it off and starts listening again (barge-in); tapping while
    // listening cancels; tapping while idle starts a turn. Ignored mid
    // 'processing' — nothing sensible to interrupt mid tool-call.
    const handleOrbClick = () => {
        if (voicePhase === 'speaking') {
            stopEpsilonSpeaking()
            startListening()
        } else if (voicePhase === 'listening') {
            stopListening(true)
            setVoicePhase('idle')
        } else if (voicePhase === 'idle') {
            startListening()
        }
    }

    // overrideText is passed by three callers now: a typed Enter/Send (undefined,
    // reads draft), a completed voice transcription (startListening's 'onend'
    // below), and the internal auto-fired queued follow-up (the 'done' handling
    // further down). The first two must still queue if a turn is already
    // in flight — checked via sendingRef, not the closed-over `sending` state,
    // since the mic callback's closure can be stale by the time it fires.
    // The auto-fire is different: it already knows 'done' just landed for
    // THIS turn, so it must send unconditionally — skipQueueCheck exists
    // because sendingRef itself is a ref synced by a useEffect, which hasn't
    // necessarily flushed yet by the time this same tick calls it, and
    // without the bypass the queued message would get silently re-queued
    // with nothing left to ever fire it again.
    const sendMessage = async (overrideText, { skipQueueCheck = false } = {}) => {
        const text = (overrideText ?? draft).trim()
        if (!text) return
        if (sendingRef.current && !skipQueueCheck) {
            // Can't inject this into the reply that's already streaming — the
            // API has no such thing — so queue it (appending to anything
            // already queued) and it fires automatically the instant this
            // turn's 'done' event lands, further down. Applies equally to a
            // typed message and a voice-transcribed one (mic onend calls
            // sendMessage the same way Enter does).
            setQueuedFollowUp((prev) => {
                const combined = prev ? `${prev}\n${text}` : text
                queuedFollowUpRef.current = combined
                return combined
            })
            setDraft('')
            return
        }
        setError('')
        setDraft('')
        const now = Date.now()
        setMessages((prev) => [...prev, { role: 'user', text, at: now }, { role: 'assistant', text: '', thinking: '', at: null, streaming: true }])
        setSending(true)
        setToolStatus(null)

        abortControllerRef.current = new AbortController()
        let settled = false

        await streamEpsilonMessage({
            server,
            body: { message: text, style, conversationId: activeConversationId },
            signal: abortControllerRef.current.signal,
            onEvent: (type, data) => {
                if (!mountedRef.current) return
                if (type === 'thinking_delta') {
                    setMessages((prev) => {
                        const lastIdx = prev.length - 1
                        if (!prev[lastIdx]?.streaming) return prev
                        const next = [...prev]
                        next[lastIdx] = { ...next[lastIdx], thinking: (next[lastIdx].thinking || '') + (data.text || '') }
                        return next
                    })
                } else if (type === 'text_delta') {
                    setToolStatus(null)
                    setMessages((prev) => {
                        const lastIdx = prev.length - 1
                        if (!prev[lastIdx]?.streaming) return prev
                        const next = [...prev]
                        next[lastIdx] = { ...next[lastIdx], text: next[lastIdx].text + (data.text || '') }
                        return next
                    })
                } else if (type === 'tool_start') {
                    setToolStatus(toolStatusLabel(data.tools?.[0]))
                } else if (type === 'tool_end') {
                    setToolStatus(null)
                } else if (type === 'done') {
                    settled = true
                    setSending(false)
                    setToolStatus(null)
                    if (data.conversationId) setActiveConversationId(data.conversationId)
                    if (!data.ok) {
                        setMessages((prev) => {
                            const lastIdx = prev.length - 1
                            if (prev[lastIdx]?.streaming) return prev.slice(0, lastIdx)
                            return prev
                        })
                        setError(data.mess || 'Epsilon ran into an error. Please try again.')
                        // Don't auto-relisten into an error loop — leave voice
                        // mode open (if it is) with the orb idle so the user
                        // can read/hear the problem and tap to retry.
                        if (voiceModeOpenRef.current) setVoicePhase('idle')
                        return
                    }
                    // An array, not a single value — a request spanning several
                    // locations/vendors in one turn (e.g. "use vendor X for bar1
                    // and vip, vendor Y for kitchen") makes the model call
                    // propose_purchase_order once per location, and each one
                    // needs its own independent confirm button. A single
                    // `pendingPurchaseOrderProposal` used to keep only the last
                    // one, silently dropping the rest (confirmed live: three
                    // proposed, only one ever confirmable).
                    const proposals = []
                    if (data.pendingScriptProposal) {
                        proposals.push({ ...data.pendingScriptProposal, kind: 'script', title: 'Proposed correction', status: 'pending' })
                    }
                    if (Array.isArray(data.pendingPurchaseOrderProposals)) {
                        data.pendingPurchaseOrderProposals.forEach((p) => {
                            proposals.push({ ...p, kind: 'purchase_order', title: 'Proposed purchase order', status: 'pending' })
                        })
                    }
                    // Read-only, no confirm step — a sibling to proposals, not
                    // a variant of it.
                    const report = data.pendingReport || null
                    setMessages((prev) => {
                        const lastIdx = prev.length - 1
                        if (!prev[lastIdx]?.streaming) return prev
                        const next = [...prev]
                        next[lastIdx] = { ...next[lastIdx], text: data.text || next[lastIdx].text, at: Date.now(), streaming: false, proposals, report }
                        return next
                    })
                    if (conversationsLoaded) loadConversations()
                    // Spoken replies: either the standalone "read replies aloud"
                    // toggle (text-mode convenience) or full voice mode (always
                    // speaks, and loops back into listening once done — a real
                    // back-and-forth conversation, not click-mic-every-turn).
                    if (ttsSupported && (autoSpeakEnabled || voiceModeOpenRef.current) && data.text) {
                        speak(data.text, {
                            gender: voicePreference.gender,
                            accent: voicePreference.accent,
                            onStart: () => {
                                setIsSpeaking(true)
                                startSpeakLevelLoop()
                                if (voiceModeOpenRef.current) setVoicePhase('speaking')
                            },
                            onBoundary: bumpSpeakLevel,
                            onEnd: () => {
                                setIsSpeaking(false)
                                stopSpeakLevelLoop()
                                if (voiceModeOpenRef.current) startListening()
                            },
                            onError: () => {
                                setIsSpeaking(false)
                                stopSpeakLevelLoop()
                                if (voiceModeOpenRef.current) setVoicePhase('idle')
                            },
                        })
                    } else if (voiceModeOpenRef.current) {
                        // Voice mode but nothing to speak (empty reply) — go
                        // straight back to listening rather than stalling.
                        startListening()
                    }
                }
            },
        })

        if (mountedRef.current && !settled) {
            setSending(false)
            setToolStatus(null)
        }

        // Fire whatever got queued while this turn was streaming — read from
        // the ref (not the `queuedFollowUp` closed-over above, which is
        // stale by now) so this sees updates made mid-stream via setState.
        if (mountedRef.current && queuedFollowUpRef.current) {
            const queued = queuedFollowUpRef.current
            clearQueuedFollowUp()
            sendMessage(queued, { skipQueueCheck: true })
        }
    }

    const CONFIRM_ENDPOINTS = {
        script: 'ai/epsilon/scripts/confirm',
        purchase_order: 'ai/epsilon/purchase-orders/confirm',
    }

    // Updates just the one proposal matching this token, wherever it lives —
    // a message can hold several (see the proposals array built above), so
    // this must patch by token within the array, not replace a single value.
    const updateProposal = (token, patch) => {
        setMessages((prev) => prev.map((m) => (
            Array.isArray(m.proposals) && m.proposals.some((p) => p.token === token)
                ? { ...m, proposals: m.proposals.map((p) => (p.token === token ? { ...p, ...patch } : p)) }
                : m
        )))
    }

    // Purchase-order proposals are deliberately non-expiring and re-runnable
    // server-side (see purchaseAdvisor.js) — dismissing one is the only
    // thing that actually removes it, so this tells the server to forget it
    // too, not just hide the card locally. Script-correction proposals stay
    // one-shot/short-lived server-side, so a local-only hide is enough for
    // those (the token naturally expires and was likely already consumed).
    const dismissProposal = async (token, kind) => {
        updateProposal(token, { status: 'dismissed' })
        if (kind === 'purchase_order') {
            fetchServer('POST', { token }, 'ai/epsilon/purchase-orders/dismiss', server).catch(() => {})
        }
    }

    // unitCostOverrides/vendorId only apply to purchase_order — a real order
    // can hold several product lines (keyed by productId) and one editable
    // vendor; the confirm route ignores both for every other proposal kind.
    const confirmProposal = async (token, kind, poEdits) => {
        updateProposal(token, { status: 'running' })
        const body = { token }
        if (kind === 'purchase_order') {
            const lines = poEdits?.preview?.lines || []
            const overrides = {}
            lines.forEach((line) => {
                const edited = poEdits?.editedLines?.[line.productId]
                overrides[line.productId] = (edited !== undefined && edited !== '') ? Number(edited) : line.unitCost
            })
            if (Object.keys(overrides).length) body.unitCostOverrides = overrides
            if (poEdits?.editedVendorId) body.vendorId = poEdits.editedVendorId
            if (poEdits?.excludedProductIds?.length) body.excludeProductIds = poEdits.excludedProductIds
            const acceptedDate = poEdits?.editedPostingDate ?? poEdits?.preview?.suggestedOrderDate
            if (acceptedDate) body.postingDate = acceptedDate
        }
        // Confirmed live: a request that never gets a response (the backend
        // route used to have no try/catch, so an exception there left the
        // connection hanging with nothing ever sent back) left this stuck on
        // "Running…" forever with zero feedback — the backend is fixed, but
        // this timeout + try/catch is a second, independent guarantee that
        // this specific "stuck" state can never happen again regardless of
        // cause (a slow proxy, a dropped connection, anything else unforeseen).
        let resp
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30000)
            resp = await fetchServer('POST', body, CONFIRM_ENDPOINTS[kind] || CONFIRM_ENDPOINTS.script, server, controller.signal)
            clearTimeout(timeoutId)
        } catch (e) {
            resp = { err: true, mess: 'That action timed out or the connection was lost — please try again.' }
        }
        if (!mountedRef.current) return
        if (resp.err || !resp.ok) {
            // Purchase orders stay interactive after a failed run (kind stays
            // pending-equivalent, not a dead end) — the user should be able
            // to fix the price/etc and just try again without re-asking
            // Epsilon to propose it from scratch.
            updateProposal(token, { status: kind === 'purchase_order' ? 'pending' : 'error', resultMess: resp.mess || 'That action failed to run.' })
            return
        }
        const resultMess = kind === 'purchase_order'
            ? `Purchase order ${resp.documentNo || ''} created.`
            : 'Applied successfully.'
        // Purchase orders go back to 'pending' (fully interactive — edit
        // price, run again) rather than a terminal 'done'; only Dismiss
        // actually ends this card's life, per the user's explicit ask.
        updateProposal(token, kind === 'purchase_order'
            ? { status: 'pending', resultMess, resultOutput: resp.output }
            : { status: 'done', resultMess, resultOutput: resp.output })
    }

    // exportUtils.js's generatePDF/generateExcel expect columns as
    // {name, reference, numeric?} (see BusinessPartners.js's own callers) —
    // a different shape from the {key, label} the report card's own inline
    // table uses, so it's adapted here rather than changing either contract.
    const exportReport = (report, format) => {
        const columns = (report.tabular?.columns || []).map((col) => ({ name: col.label, reference: col.key }))
        const rows = report.tabular?.rows || []
        const dateRange = report.fromDate && report.toDate ? { startDate: report.fromDate, endDate: report.toDate } : null
        try {
            if (format === 'pdf') {
                generatePDF(rows, columns, companyInfo, dateRange, report.title || 'Report')
            } else {
                generateExcel(rows, columns, companyInfo, dateRange, report.title || 'Report')
            }
        } catch (e) {
            setError(`Could not export this report as ${format === 'pdf' ? 'PDF' : 'Excel'}.`)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const copyMessage = (text, index) => {
        try {
            navigator.clipboard.writeText(text)
            setCopiedIndex(index)
            setTimeout(() => setCopiedIndex((cur) => (cur === index ? null : cur)), 1500)
        } catch (e) { /* clipboard unavailable — silently no-op */ }
    }

    const renderOptionsMenu = () => (
        <div className="epsilon-menu" onMouseLeave={() => setMenuOpen(false)}>
            <button className="epsilon-menu-item" onClick={startNewChat}>+ New chat</button>
            <div className="epsilon-menu-divider" />
            <div className="epsilon-menu-label">Response style</div>
            {STYLE_OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    className={`epsilon-menu-item epsilon-style-item ${style === opt.value ? 'active' : ''}`}
                    onClick={() => changeStyle(opt.value)}
                >
                    {style === opt.value ? '✓ ' : ''}{opt.label}
                </button>
            ))}
            <div className="epsilon-menu-divider" />
            <button className="epsilon-menu-item" onClick={toggleTheme}>
                {theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}
            </button>
        </div>
    )

    const messagesListJsx = (
        <div className="epsilon-messages">
            {/* Distinguish "still fetching history" from "genuinely no history
                yet" — without this, opening the chat showed the empty-state
                invite text immediately, then had it pop away and get replaced
                by real messages a moment later once ai/epsilon/history
                actually resolved, which read as if nothing was happening. */}
            {!historyLoaded && messages.length === 0 && (
                <div className="epsilon-empty-state epsilon-loading-state">
                    <div className="epsilon-empty-mark epsilon-loading-mark">ε</div>
                    <p>Loading your conversation…</p>
                </div>
            )}
            {historyLoaded && messages.length === 0 && (
                <div className="epsilon-empty-state">
                    <div className="epsilon-empty-mark">ε</div>
                    <p>Ask me how to do something, why a transaction is blocked, what your numbers mean, or to generate a report.</p>
                </div>
            )}
            {messages.map((m, i) => (
                <div key={i} className={`epsilon-bubble-row epsilon-bubble-row-${m.role}`}>
                    <div className={`epsilon-bubble epsilon-bubble-${m.role}`}>
                        {m.role === 'assistant' && m.thinking && (
                            m.streaming && !m.text ? (
                                <div className="epsilon-thinking-live">
                                    <span className="epsilon-thinking-live-label">Thinking…</span>
                                    <div className="epsilon-thinking-live-text">{m.thinking}</div>
                                </div>
                            ) : (
                                <div className="epsilon-thinking-block">
                                    <button
                                        type="button"
                                        className="epsilon-thinking-toggle"
                                        onClick={() => setExpandedThinkingIndex((cur) => (cur === i ? null : i))}
                                    >
                                        {expandedThinkingIndex === i ? '▾' : '▸'} Thinking process
                                    </button>
                                    {expandedThinkingIndex === i && (
                                        <div className="epsilon-thinking-text">{m.thinking}</div>
                                    )}
                                </div>
                            )
                        )}
                        {m.streaming && !m.text && !m.thinking && !toolStatus && (
                            <span className="epsilon-typing-inline">
                                <span className="epsilon-typing-dot" />
                                <span className="epsilon-typing-dot" />
                                <span className="epsilon-typing-dot" />
                            </span>
                        )}
                        {m.streaming && toolStatus && <span className="epsilon-tool-status">🔧 {toolStatus}</span>}
                        {m.role === 'assistant' ? renderMarkdownLite(m.text) : m.text}
                        {m.streaming && m.text ? <span className="epsilon-cursor" /> : null}
                        {(!m.streaming || m.text) && (
                            <div className="epsilon-bubble-footer">
                                {m.at ? <span className="epsilon-bubble-time">{formatTime(m.at)}</span> : null}
                                {!m.streaming && (
                                    <button
                                        className="epsilon-copy-btn"
                                        onClick={() => copyMessage(m.text, i)}
                                        title="Copy"
                                        aria-label="Copy message"
                                    >
                                        {copiedIndex === i ? 'Copied' : 'Copy'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    {Array.isArray(m.proposals) && m.proposals.filter((p) => p.status !== 'dismissed').map((p) => (
                        <div className={`epsilon-proposal-card ${p.kind === 'purchase_order' ? 'epsilon-po-card' : ''}`} key={p.token}>
                            <div className="epsilon-proposal-title">{p.title}</div>
                            {p.description && <div className="epsilon-proposal-desc">{p.description}</div>}
                            {p.kind === 'purchase_order' && p.preview && (
                                <div className="epsilon-proposal-desc">
                                    {p.preview.location}
                                </div>
                            )}
                            {p.kind === 'purchase_order' && p.preview && (
                                <div className="epsilon-po-vendor-row">
                                    <span>Vendor</span>
                                    <select
                                        value={p.editedVendorId ?? p.preview.vendorId ?? ''}
                                        disabled={p.status !== 'pending'}
                                        onChange={(e) => updateProposal(p.token, { editedVendorId: e.target.value })}
                                    >
                                        {/* Covers both an inferred/matched real vendor with no
                                            _id yet selected here, and a not-yet-created vendor
                                            (newVendorName on the backend) — either way, this
                                            shows what will actually be used unless the user
                                            explicitly picks a different real one below. */}
                                        {!p.preview.vendorId && <option value="">{p.preview.vendor}</option>}
                                        {vendorsList.map((v) => (
                                            <option key={v._id} value={v._id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {p.kind === 'purchase_order' && p.preview && (
                                <div className="epsilon-po-vendor-row">
                                    <span>Order by</span>
                                    <input
                                        type="date"
                                        className="epsilon-po-date-input"
                                        value={p.editedPostingDate ?? p.preview.suggestedOrderDate ?? p.preview.postingDate ?? ''}
                                        disabled={p.status !== 'pending'}
                                        onChange={(e) => updateProposal(p.token, { editedPostingDate: e.target.value })}
                                    />
                                </div>
                            )}
                            {p.kind === 'purchase_order' && p.preview?.orderDateBasis && (
                                <div className="epsilon-proposal-note">{p.preview.orderDateBasis}</div>
                            )}
                            {p.kind === 'purchase_order' && Array.isArray(p.preview?.lines) && (() => {
                                const excluded = p.excludedProductIds || []
                                const visibleLines = p.preview.lines.filter((line) => !excluded.includes(line.productId))
                                const anyFlagged = visibleLines.some((line) => line.categoryLooksOffForLocation)
                                return (
                                    <>
                                        {anyFlagged && (
                                            <div className="epsilon-po-warning-banner">
                                                ⚠ A highlighted product's category doesn't match what's normally bought for this location (see Settings &gt; Warehouses) — likely a stock-tagging mix-up. Remove it if it doesn't belong here.
                                            </div>
                                        )}
                                        <table className="epsilon-po-table">
                                            <thead>
                                                <tr><th>Product</th><th>Qty</th><th>Unit cost (₦)</th><th>Total</th><th /></tr>
                                            </thead>
                                            <tbody>
                                                {visibleLines.map((line) => {
                                                    const edited = p.editedLines?.[line.productId]
                                                    const cost = (edited !== undefined && edited !== '') ? Number(edited) : Number(line.unitCost) || 0
                                                    const total = cost * (Number(line.quantity) || 0)
                                                    return (
                                                        <tr key={line.productId} className={line.categoryLooksOffForLocation ? 'epsilon-po-row-warning' : ''}>
                                                            <td title={line.categoryLooksOffForLocation ? `Category: ${line.categoryName || line.category} — not normally bought for this location` : undefined}>
                                                                {line.categoryLooksOffForLocation ? '⚠ ' : ''}{line.productName}
                                                            </td>
                                                            <td>{line.quantity} {line.purchaseUom}</td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    className="epsilon-po-cost-input"
                                                                    value={edited ?? line.unitCost ?? ''}
                                                                    disabled={p.status !== 'pending'}
                                                                    onChange={(e) => updateProposal(p.token, {
                                                                        editedLines: { ...(p.editedLines || {}), [line.productId]: e.target.value },
                                                                    })}
                                                                />
                                                            </td>
                                                            <td className="epsilon-po-line-total">{total.toLocaleString()}</td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="epsilon-po-remove-btn"
                                                                    disabled={p.status !== 'pending'}
                                                                    title="Remove this product from the order"
                                                                    aria-label="Remove"
                                                                    onClick={() => updateProposal(p.token, { excludedProductIds: [...excluded, line.productId] })}
                                                                >×</button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td colSpan={3}>Total</td>
                                                    <td className="epsilon-po-line-total">
                                                        {visibleLines.reduce((sum, line) => {
                                                            const edited = p.editedLines?.[line.productId]
                                                            const cost = (edited !== undefined && edited !== '') ? Number(edited) : Number(line.unitCost) || 0
                                                            return sum + cost * (Number(line.quantity) || 0)
                                                        }, 0).toLocaleString()}
                                                    </td>
                                                    <td />
                                                </tr>
                                            </tfoot>
                                        </table>
                                        {!visibleLines.length && (
                                            <div className="epsilon-proposal-note">Every product was removed — dismiss this order or re-ask Epsilon to propose it again.</div>
                                        )}
                                    </>
                                )
                            })()}
                            {p.preview?.output && (
                                <pre className="epsilon-proposal-preview">{p.preview.output}</pre>
                            )}
                            {p.note && <div className="epsilon-proposal-note">{p.note}</div>}
                            {/* Purchase orders revert to 'pending' after every run (success
                                or failure) instead of a terminal 'done'/'error' — the card
                                stays fully interactive (editable price, runnable again)
                                until the user explicitly dismisses it, per the user's
                                explicit ask that these never just expire on their own. */}
                            {p.kind === 'purchase_order' && p.status === 'pending' && p.resultMess && (
                                <div className="epsilon-proposal-status epsilon-proposal-status-done">
                                    {p.resultMess}
                                </div>
                            )}
                            {p.status === 'pending' && (
                                <div className="epsilon-proposal-actions">
                                    <button
                                        className="epsilon-proposal-run-btn"
                                        disabled={p.kind === 'purchase_order' && Array.isArray(p.preview?.lines) && (p.excludedProductIds || []).length >= p.preview.lines.length}
                                        onClick={() => confirmProposal(p.token, p.kind, p)}
                                    >Run it</button>
                                    <button className="epsilon-proposal-dismiss-btn" onClick={() => dismissProposal(p.token, p.kind)}>Dismiss</button>
                                </div>
                            )}
                            {p.status === 'running' && (
                                <div className="epsilon-proposal-status">Running…</div>
                            )}
                            {(p.status === 'done' || p.status === 'error') && (
                                <div className={`epsilon-proposal-status ${p.status === 'error' ? 'epsilon-proposal-status-error' : 'epsilon-proposal-status-done'}`}>
                                    {p.resultMess}
                                    {p.resultOutput && <pre className="epsilon-proposal-preview">{p.resultOutput}</pre>}
                                </div>
                            )}
                        </div>
                    ))}
                    {m.report && (
                        <div className="epsilon-report-card">
                            <div className="epsilon-report-title">{m.report.title || 'Report'}</div>
                            {(m.report.fromDate || m.report.location) && (
                                <div className="epsilon-report-meta">
                                    {m.report.fromDate && m.report.toDate ? `${m.report.fromDate} – ${m.report.toDate}` : ''}
                                    {m.report.location ? ` · ${m.report.location}` : ''}
                                </div>
                            )}
                            {m.report.tabular?.rows?.length ? (
                                <div className="epsilon-md-table-wrap">
                                    <table className="epsilon-md-table">
                                        <thead>
                                            <tr>{m.report.tabular.columns.map((col) => <th key={col.key}>{col.label}</th>)}</tr>
                                        </thead>
                                        <tbody>
                                            {m.report.tabular.rows.slice(0, 100).map((row, rowIdx) => (
                                                <tr key={rowIdx}>
                                                    {m.report.tabular.columns.map((col) => <td key={col.key}>{String(row[col.key] ?? '')}</td>)}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {m.report.tabular.rows.length > 100 && (
                                        <div className="epsilon-report-truncated">Showing first 100 of {m.report.tabular.rows.length} rows — export for the full report.</div>
                                    )}
                                </div>
                            ) : (
                                <div className="epsilon-report-empty">No tabular data to display for this report.</div>
                            )}
                            {!!m.report.tabular?.rows?.length && (
                                <div className="epsilon-report-actions">
                                    <button className="epsilon-report-export-btn" onClick={() => exportReport(m.report, 'pdf')}>Export as PDF</button>
                                    <button className="epsilon-report-export-btn" onClick={() => exportReport(m.report, 'excel')}>Export as Excel</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
            {error && <div className="epsilon-error">{error}</div>}
            <div ref={bottomRef} />
        </div>
    )

    const inputRowJsx = (
        <div className="epsilon-input-wrap">
            {queuedFollowUp && (
                <div className="epsilon-queued-chip">
                    <span className="epsilon-queued-chip-label">Will send after this reply:</span>
                    <span className="epsilon-queued-chip-text">{queuedFollowUp}</span>
                    <button
                        type="button"
                        className="epsilon-queued-chip-edit"
                        title="Move back into the input to edit"
                        aria-label="Edit queued message"
                        onClick={() => {
                            setDraft((prev) => (prev ? `${queuedFollowUp}\n${prev}` : queuedFollowUp))
                            clearQueuedFollowUp()
                            inputRef.current?.focus()
                        }}
                    >✎</button>
                    <button
                        type="button"
                        className="epsilon-queued-chip-remove"
                        title="Remove"
                        aria-label="Remove queued message"
                        onClick={clearQueuedFollowUp}
                    >×</button>
                </div>
            )}
            <div className="epsilon-input-row">
                <textarea
                    ref={inputRef}
                    className="epsilon-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={sending ? "Add something before Epsilon replies..." : "Ask Epsilon..."}
                    rows={1}
                    maxLength={4000}
                />
                {sttSupported && (
                    <button
                        type="button"
                        className="epsilon-mic-btn"
                        onClick={openVoiceMode}
                        aria-label="Talk to Epsilon"
                        title="Talk to Epsilon"
                    >🎤</button>
                )}
                <button
                    className="epsilon-send-btn"
                    onClick={() => sendMessage()}
                    disabled={!draft.trim()}
                    aria-label={sending ? 'Queue for after this reply' : 'Send'}
                    title={sending ? 'Queue — sends automatically once Epsilon finishes replying' : 'Send'}
                >
                    {sending ? '⏱' : '➤'}
                </button>
            </div>
        </div>
    )

    // Fills whichever container renders it (the collapsed panel or the
    // expanded main pane) rather than the whole screen — position:absolute
    // against that container's own position:relative, not position:fixed —
    // so the rest of the page (and, in expanded mode, the conversation
    // sidebar) stays visible/usable alongside a voice conversation.
    const voiceOverlayJsx = voiceModeOpen && (
        <div className="epsilon-voice-overlay" role="dialog" aria-label="Voice conversation with Epsilon">
            <button className="epsilon-voice-close" onClick={closeVoiceMode} aria-label="Exit voice mode" title="Exit voice mode">×</button>
            <div
                className={`epsilon-orb epsilon-orb-${voicePhase}`}
                onClick={handleOrbClick}
                role="button"
                tabIndex={0}
                aria-label={voicePhase === 'speaking' ? 'Tap to interrupt' : 'Tap to talk'}
            >
                <span className="epsilon-orb-ring epsilon-orb-ring-1" />
                <span className="epsilon-orb-ring epsilon-orb-ring-2" />
                <span className="epsilon-orb-core" ref={orbCoreRef} />
            </div>
            <div className="epsilon-voice-caption">
                {voicePhase === 'listening' && (draft || 'Listening…')}
                {voicePhase === 'processing' && 'Thinking…'}
                {voicePhase === 'speaking' && 'Speaking…'}
                {voicePhase === 'idle' && (error || 'Tap the orb to talk')}
            </div>
        </div>
    )

    const sidebarJsx = (
        <div className="epsilon-sidebar">
            <button className="epsilon-sidebar-new-btn" onClick={startNewChat}>+ New chat</button>
            <div className="epsilon-sidebar-list">
                {!conversationsLoaded && conversations.length === 0 && (
                    <div className="epsilon-sidebar-empty epsilon-sidebar-loading">Loading conversations…</div>
                )}
                {conversationsLoaded && conversations.length === 0 && (
                    <div className="epsilon-sidebar-empty">No conversations yet.</div>
                )}
                {conversations.map((c) => (
                    <div
                        key={c.conversationId}
                        className={`epsilon-sidebar-item ${c.conversationId === activeConversationId ? 'active' : ''}`}
                        onClick={() => selectConversation(c.conversationId)}
                    >
                        <div className="epsilon-sidebar-item-text">
                            <div className="epsilon-sidebar-item-title">{c.title || 'New chat'}</div>
                            <div className="epsilon-sidebar-item-time">{formatRelativeTime(c.updatedAt)}</div>
                        </div>
                        <button
                            className="epsilon-sidebar-item-delete"
                            onClick={(e) => deleteConversation(c.conversationId, e)}
                            title="Delete chat"
                            aria-label="Delete chat"
                        >🗑</button>
                    </div>
                ))}
            </div>
            <div className="epsilon-sidebar-footer">
                <div className="epsilon-sidebar-footer-label">Response style</div>
                <div className="epsilon-sidebar-style-row">
                    {STYLE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            className={`epsilon-sidebar-style-btn ${style === opt.value ? 'active' : ''}`}
                            onClick={() => changeStyle(opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <button className="epsilon-sidebar-theme-btn" onClick={toggleTheme}>
                    {theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}
                </button>
            </div>
        </div>
    )

    return (
        <div className="epsilon-root" data-theme={theme}>
            {open && expanded && (
                <div className="epsilon-overlay" onClick={() => setExpanded(false)}>
                    <div className="epsilon-expanded-shell" role="dialog" aria-label="Epsilon assistant" onClick={(e) => e.stopPropagation()}>
                        {sidebarJsx}
                        <div className="epsilon-expanded-main">
                            <div className="epsilon-panel-header">
                                <span className="epsilon-mark epsilon-mark-small">ε</span>
                                <div className="epsilon-panel-title-wrap">
                                    <span className="epsilon-panel-title">Epsilon</span>
                                    <span className="epsilon-panel-subtitle">AI assistant</span>
                                </div>
                                <div className="epsilon-header-actions">
                                    {ttsSupported && isSpeaking && !voiceModeOpen && (
                                        <button className="epsilon-icon-btn" onClick={stopEpsilonSpeaking} aria-label="Stop speaking" title="Stop speaking">⏹</button>
                                    )}
                                    {ttsSupported && (
                                        <button className={`epsilon-icon-btn ${autoSpeakEnabled ? 'epsilon-speaker-active' : ''}`} onClick={toggleAutoSpeak} aria-label={autoSpeakEnabled ? 'Voice replies on' : 'Voice replies off'} title={autoSpeakEnabled ? 'Voice replies on — click to mute' : 'Read replies aloud'}>
                                            {autoSpeakEnabled ? '🔊' : '🔇'}
                                        </button>
                                    )}
                                    <button className="epsilon-icon-btn" onClick={refreshChat} disabled={isRefreshingChat} aria-label="Refresh" title="Refresh conversation">
                                        <span className={isRefreshingChat ? 'epsilon-refresh-spinning' : ''}>↻</span>
                                    </button>
                                    <button className="epsilon-icon-btn" onClick={() => setExpanded(false)} aria-label="Collapse" title="Collapse">⤡</button>
                                    <button className="epsilon-icon-btn" onClick={() => { setOpen(false); setExpanded(false) }} aria-label="Close" title="Close">×</button>
                                </div>
                            </div>
                            {messagesListJsx}
                            {inputRowJsx}
                            {voiceOverlayJsx}
                        </div>
                    </div>
                </div>
            )}
            {open && !expanded && (
                <div className="epsilon-panel" role="dialog" aria-label="Epsilon assistant">
                    <div className="epsilon-panel-header">
                        <span className="epsilon-mark epsilon-mark-small">ε</span>
                        <div className="epsilon-panel-title-wrap">
                            <span className="epsilon-panel-title">Epsilon</span>
                            <span className="epsilon-panel-subtitle">AI assistant</span>
                        </div>
                        <div className="epsilon-header-actions">
                            {ttsSupported && isSpeaking && !voiceModeOpen && (
                                <button className="epsilon-icon-btn" onClick={stopEpsilonSpeaking} aria-label="Stop speaking" title="Stop speaking">⏹</button>
                            )}
                            {ttsSupported && (
                                <button className={`epsilon-icon-btn ${autoSpeakEnabled ? 'epsilon-speaker-active' : ''}`} onClick={toggleAutoSpeak} aria-label={autoSpeakEnabled ? 'Voice replies on' : 'Voice replies off'} title={autoSpeakEnabled ? 'Voice replies on — click to mute' : 'Read replies aloud'}>
                                    {autoSpeakEnabled ? '🔊' : '🔇'}
                                </button>
                            )}
                            <button className="epsilon-icon-btn" onClick={refreshChat} disabled={isRefreshingChat} aria-label="Refresh" title="Refresh conversation">
                                <span className={isRefreshingChat ? 'epsilon-refresh-spinning' : ''}>↻</span>
                            </button>
                            <button className="epsilon-icon-btn" onClick={() => setExpanded(true)} aria-label="Expand" title="Expand">⤢</button>
                            <button
                                className="epsilon-icon-btn"
                                onClick={() => setMenuOpen((v) => !v)}
                                aria-label="Options"
                                title="Options"
                            >⋯</button>
                            <button className="epsilon-icon-btn" onClick={() => setOpen(false)} aria-label="Close" title="Close">×</button>
                        </div>
                        {menuOpen && renderOptionsMenu()}
                    </div>
                    {messagesListJsx}
                    {inputRowJsx}
                    {voiceOverlayJsx}
                </div>
            )}
            <button
                className="epsilon-launcher"
                onClick={() => setOpen((prev) => !prev)}
                aria-label={open ? 'Close Epsilon' : 'Open Epsilon'}
                title="Epsilon — AI assistant"
            >
                <span className="epsilon-mark">ε</span>
            </button>
        </div>
    )
}

export default Epsilon
