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

const STYLE_OPTIONS = [
    { value: 'quick', label: 'Quick' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'detailed', label: 'Detailed' },
]
const STYLE_STORAGE_KEY = 'epsilon-response-style'
const THEME_STORAGE_KEY = 'epsilon-theme'

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
    const bottomRef = useRef(null)
    const inputRef = useRef(null)
    const mountedRef = useRef(true)
    const abortControllerRef = useRef(null)
    // Mirrors queuedFollowUp for reliable reads from inside sendMessage's
    // async closure — the closure's own `queuedFollowUp` binding is captured
    // at call time and won't see a state update made mid-stream via setState.
    const queuedFollowUpRef = useRef('')

    useEffect(() => () => {
        mountedRef.current = false
        abortControllerRef.current?.abort()
    }, [])

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

    // overrideText is set only when this call is the auto-fired queued
    // follow-up (see the 'done' handling below) — never a real user action,
    // so it must never itself be treated as "still sending, queue it".
    const sendMessage = async (overrideText) => {
        const text = (overrideText ?? draft).trim()
        if (!text) return
        if (sending && overrideText === undefined) {
            // Can't inject this into the reply that's already streaming — the
            // API has no such thing — so queue it (appending to anything
            // already queued) and it fires automatically the instant this
            // turn's 'done' event lands, further down.
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
            sendMessage(queued)
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

    const confirmProposal = async (token, kind, editedUnitCost) => {
        updateProposal(token, { status: 'running' })
        // unitCost is only meaningful for purchase_order — the confirm route
        // ignores it for every other kind. Undefined/blank means "use
        // whatever was already computed at propose time," not "zero."
        const body = { token }
        if (kind === 'purchase_order' && editedUnitCost !== undefined && editedUnitCost !== '') {
            body.unitCost = Number(editedUnitCost)
        }
        const resp = await fetchServer('POST', body, CONFIRM_ENDPOINTS[kind] || CONFIRM_ENDPOINTS.script, server)
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
                        <div className="epsilon-proposal-card" key={p.token}>
                            <div className="epsilon-proposal-title">{p.title}</div>
                            {p.description && <div className="epsilon-proposal-desc">{p.description}</div>}
                            {p.kind === 'purchase_order' && p.preview && (
                                <div className="epsilon-proposal-desc">
                                    {p.preview.quantity}× {p.preview.productName} from {p.preview.vendor}
                                    {' — posting '}{p.preview.postingDate}
                                </div>
                            )}
                            {p.kind === 'purchase_order' && p.status === 'pending' && (
                                <label className="epsilon-proposal-price-field">
                                    <span>Unit cost (₦)</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={p.editedUnitCost ?? p.preview?.unitCost ?? ''}
                                        placeholder="0.00"
                                        onChange={(e) => updateProposal(p.token, { editedUnitCost: e.target.value })}
                                    />
                                    {(() => {
                                        const cost = Number(p.editedUnitCost ?? p.preview?.unitCost ?? 0)
                                        const qty = Number(p.preview?.quantity ?? 0)
                                        return cost > 0 && qty > 0
                                            ? <span className="epsilon-proposal-price-total">est. total {(cost * qty).toLocaleString()}</span>
                                            : null
                                    })()}
                                </label>
                            )}
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
                                    <button className="epsilon-proposal-run-btn" onClick={() => confirmProposal(p.token, p.kind, p.editedUnitCost)}>Run it</button>
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
                                    <button className="epsilon-icon-btn" onClick={refreshChat} disabled={isRefreshingChat} aria-label="Refresh" title="Refresh conversation">
                                        <span className={isRefreshingChat ? 'epsilon-refresh-spinning' : ''}>↻</span>
                                    </button>
                                    <button className="epsilon-icon-btn" onClick={() => setExpanded(false)} aria-label="Collapse" title="Collapse">⤡</button>
                                    <button className="epsilon-icon-btn" onClick={() => { setOpen(false); setExpanded(false) }} aria-label="Close" title="Close">×</button>
                                </div>
                            </div>
                            {messagesListJsx}
                            {inputRowJsx}
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
