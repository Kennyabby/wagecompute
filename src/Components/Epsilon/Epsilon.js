// Epsilon — the AI assistant launcher + chat panel, mounted once at the
// App.js root (alongside Notify/the update-progress banner) so it's present
// across every module without per-page wiring. Talks to
// wageserver/UserModule/AIAssistant/epsilon.js's POST /ai/epsilon/message,
// /ai/epsilon/clear, and GET /ai/epsilon/history — the same authenticated
// fetchServer every other component already uses, so it's automatically
// tenant/permission-scoped to whoever is logged in.
import './Epsilon.css'
import { useState, useEffect, useRef, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import renderMarkdownLite from './markdownLite'

const STYLE_OPTIONS = [
    { value: 'quick', label: 'Quick' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'detailed', label: 'Detailed' },
]
const STYLE_STORAGE_KEY = 'epsilon-response-style'

const formatTime = (date) => {
    try {
        return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch (e) {
        return ''
    }
}

const Epsilon = () => {
    const { server, fetchServer } = useContext(ContextProvider)
    const [open, setOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [messages, setMessages] = useState([]) // { role: 'user'|'assistant', text, at }
    const [draft, setDraft] = useState('')
    const [sending, setSending] = useState(false)
    const [historyLoaded, setHistoryLoaded] = useState(false)
    const [error, setError] = useState('')
    const [copiedIndex, setCopiedIndex] = useState(null)
    const [style, setStyle] = useState(() => {
        try { return localStorage.getItem(STYLE_STORAGE_KEY) || 'balanced' } catch (e) { return 'balanced' }
    })
    const bottomRef = useRef(null)
    const inputRef = useRef(null)
    const mountedRef = useRef(true)

    useEffect(() => () => { mountedRef.current = false }, [])

    useEffect(() => {
        if (!open || historyLoaded) return
        (async () => {
            const resp = await fetchServer('GET', {}, 'ai/epsilon/history', server)
            if (!mountedRef.current) return
            if (!resp.err && resp.ok && Array.isArray(resp.messages)) {
                setMessages(resp.messages)
            }
            setHistoryLoaded(true)
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    useEffect(() => {
        if (open && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages.length, sending, open])

    useEffect(() => {
        if (open) {
            // Focus shortly after the panel mounts/animates in.
            const t = setTimeout(() => inputRef.current?.focus(), 80)
            return () => clearTimeout(t)
        }
    }, [open])

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

    const startNewChat = async () => {
        setMenuOpen(false)
        setMessages([])
        setError('')
        // Fire-and-forget-ish, but awaited so a failure doesn't silently
        // leave stale server-side history the next real message would still
        // load — if this fails the user just sees the same conversation
        // resume next time the panel reopens, not a broken state.
        await fetchServer('POST', {}, 'ai/epsilon/clear', server)
    }

    const sendMessage = async () => {
        const text = draft.trim()
        if (!text || sending) return
        setError('')
        setDraft('')
        const now = Date.now()
        setMessages((prev) => [...prev, { role: 'user', text, at: now }])
        setSending(true)

        const resp = await fetchServer('POST', { message: text, style }, 'ai/epsilon/message', server)
        if (!mountedRef.current) return
        setSending(false)

        if (resp.err || !resp.ok) {
            setError(resp.mess || 'Epsilon ran into an error. Please try again.')
            return
        }
        // Two independent proposal kinds can come back from one turn (a
        // script correction or a purchase order) — each has its own confirm
        // endpoint, so the card carries which one it is.
        let proposal = null
        if (resp.pendingScriptProposal) {
            proposal = { ...resp.pendingScriptProposal, kind: 'script', title: 'Proposed correction', status: 'pending' }
        } else if (resp.pendingPurchaseOrderProposal) {
            proposal = { ...resp.pendingPurchaseOrderProposal, kind: 'purchase_order', title: 'Proposed purchase order', status: 'pending' }
        }
        setMessages((prev) => [...prev, { role: 'assistant', text: resp.text, at: Date.now(), proposal }])
    }

    const CONFIRM_ENDPOINTS = {
        script: 'ai/epsilon/scripts/confirm',
        purchase_order: 'ai/epsilon/purchase-orders/confirm',
    }

    // Updates just the proposal on whichever message currently holds this
    // token — there's only ever one live proposal at a time in practice, but
    // matching by token (not "the last message") keeps this correct even if
    // that ever changes.
    const updateProposal = (token, patch) => {
        setMessages((prev) => prev.map((m) => (
            m.proposal?.token === token ? { ...m, proposal: { ...m.proposal, ...patch } } : m
        )))
    }

    const dismissProposal = (token) => updateProposal(token, { status: 'dismissed' })

    const confirmProposal = async (token, kind) => {
        updateProposal(token, { status: 'running' })
        const resp = await fetchServer('POST', { token }, CONFIRM_ENDPOINTS[kind] || CONFIRM_ENDPOINTS.script, server)
        if (!mountedRef.current) return
        if (resp.err || !resp.ok) {
            updateProposal(token, { status: 'error', resultMess: resp.mess || 'That action failed to run.' })
            return
        }
        const resultMess = kind === 'purchase_order'
            ? `Purchase order ${resp.documentNo || ''} created.`
            : 'Applied successfully.'
        updateProposal(token, { status: 'done', resultMess, resultOutput: resp.output })
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

    return (
        <div className="epsilon-root">
            {open && (
                <div className="epsilon-panel" role="dialog" aria-label="Epsilon assistant">
                    <div className="epsilon-panel-header">
                        <span className="epsilon-mark epsilon-mark-small">ε</span>
                        <div className="epsilon-panel-title-wrap">
                            <span className="epsilon-panel-title">Epsilon</span>
                            <span className="epsilon-panel-subtitle">AI assistant</span>
                        </div>
                        <div className="epsilon-header-actions">
                            <button
                                className="epsilon-icon-btn"
                                onClick={() => setMenuOpen((v) => !v)}
                                aria-label="Options"
                                title="Options"
                            >⋯</button>
                            <button className="epsilon-icon-btn" onClick={() => setOpen(false)} aria-label="Close" title="Close">×</button>
                        </div>
                        {menuOpen && (
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
                            </div>
                        )}
                    </div>
                    <div className="epsilon-messages">
                        {messages.length === 0 && (
                            <div className="epsilon-empty-state">
                                <div className="epsilon-empty-mark">ε</div>
                                <p>Ask me how to do something, why a transaction is blocked, what your numbers mean, or to generate a report.</p>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`epsilon-bubble-row epsilon-bubble-row-${m.role}`}>
                                <div className={`epsilon-bubble epsilon-bubble-${m.role}`}>
                                    {m.role === 'assistant' ? renderMarkdownLite(m.text) : m.text}
                                    <div className="epsilon-bubble-footer">
                                        {m.at ? <span className="epsilon-bubble-time">{formatTime(m.at)}</span> : null}
                                        {m.role === 'assistant' && (
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
                                </div>
                                {m.proposal && m.proposal.status !== 'dismissed' && (
                                    <div className="epsilon-proposal-card">
                                        <div className="epsilon-proposal-title">{m.proposal.title}</div>
                                        {m.proposal.description && <div className="epsilon-proposal-desc">{m.proposal.description}</div>}
                                        {m.proposal.kind === 'purchase_order' && m.proposal.preview && (
                                            <div className="epsilon-proposal-desc">
                                                {m.proposal.preview.quantity}× {m.proposal.preview.productName} from {m.proposal.preview.vendor}
                                                {m.proposal.preview.unitCost ? ` @ ${m.proposal.preview.unitCost}/unit (est. total ${m.proposal.preview.purchaseAmount})` : ''}
                                                {' — posting '}{m.proposal.preview.postingDate}
                                            </div>
                                        )}
                                        {m.proposal.preview?.output && (
                                            <pre className="epsilon-proposal-preview">{m.proposal.preview.output}</pre>
                                        )}
                                        {m.proposal.note && <div className="epsilon-proposal-note">{m.proposal.note}</div>}
                                        {m.proposal.status === 'pending' && (
                                            <div className="epsilon-proposal-actions">
                                                <button className="epsilon-proposal-run-btn" onClick={() => confirmProposal(m.proposal.token, m.proposal.kind)}>Run it</button>
                                                <button className="epsilon-proposal-dismiss-btn" onClick={() => dismissProposal(m.proposal.token)}>Dismiss</button>
                                            </div>
                                        )}
                                        {m.proposal.status === 'running' && (
                                            <div className="epsilon-proposal-status">Running…</div>
                                        )}
                                        {(m.proposal.status === 'done' || m.proposal.status === 'error') && (
                                            <div className={`epsilon-proposal-status ${m.proposal.status === 'error' ? 'epsilon-proposal-status-error' : 'epsilon-proposal-status-done'}`}>
                                                {m.proposal.resultMess}
                                                {m.proposal.resultOutput && <pre className="epsilon-proposal-preview">{m.proposal.resultOutput}</pre>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {sending && (
                            <div className="epsilon-bubble-row epsilon-bubble-row-assistant">
                                <div className="epsilon-bubble epsilon-bubble-assistant epsilon-bubble-typing">
                                    <span className="epsilon-typing-dot" />
                                    <span className="epsilon-typing-dot" />
                                    <span className="epsilon-typing-dot" />
                                </div>
                            </div>
                        )}
                        {error && <div className="epsilon-error">{error}</div>}
                        <div ref={bottomRef} />
                    </div>
                    <div className="epsilon-input-row">
                        <textarea
                            ref={inputRef}
                            className="epsilon-input"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Epsilon..."
                            rows={1}
                            maxLength={4000}
                        />
                        <button className="epsilon-send-btn" onClick={sendMessage} disabled={sending || !draft.trim()} aria-label="Send">
                            ➤
                        </button>
                    </div>
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
