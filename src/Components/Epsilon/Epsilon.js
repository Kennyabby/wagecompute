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
import { useState, useEffect, useRef, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import renderMarkdownLite from './markdownLite'
import streamEpsilonMessage from './streamEpsilon'

const STYLE_OPTIONS = [
    { value: 'quick', label: 'Quick' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'detailed', label: 'Detailed' },
]
const STYLE_STORAGE_KEY = 'epsilon-response-style'
const THEME_STORAGE_KEY = 'epsilon-theme'

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
    const { server, fetchServer } = useContext(ContextProvider)
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
    const [style, setStyle] = useState(() => {
        try { return localStorage.getItem(STYLE_STORAGE_KEY) || 'balanced' } catch (e) { return 'balanced' }
    })
    const [theme, setTheme] = useState(resolveDefaultTheme)
    const [conversations, setConversations] = useState([])
    const [conversationsLoaded, setConversationsLoaded] = useState(false)
    const [activeConversationId, setActiveConversationId] = useState(null)
    const bottomRef = useRef(null)
    const inputRef = useRef(null)
    const mountedRef = useRef(true)
    const abortControllerRef = useRef(null)

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

    useEffect(() => {
        if (expanded && !conversationsLoaded) loadConversations()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expanded])

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
        setTimeout(() => inputRef.current?.focus(), 50)
    }

    const selectConversation = async (conversationId) => {
        if (conversationId === activeConversationId) return
        abortControllerRef.current?.abort()
        setSending(false)
        setToolStatus(null)
        setMenuOpen(false)
        setError('')
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

    const sendMessage = async () => {
        const text = draft.trim()
        if (!text || sending) return
        setError('')
        setDraft('')
        const now = Date.now()
        setMessages((prev) => [...prev, { role: 'user', text, at: now }, { role: 'assistant', text: '', at: null, streaming: true }])
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
                if (type === 'text_delta') {
                    setToolStatus(null)
                    setMessages((prev) => {
                        const lastIdx = prev.length - 1
                        if (!prev[lastIdx]?.streaming) return prev
                        const next = [...prev]
                        next[lastIdx] = { ...next[lastIdx], text: next[lastIdx].text + (data.text || '') }
                        return next
                    })
                } else if (type === 'tool_start') {
                    setToolStatus('Checking the data…')
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
                    let proposal = null
                    if (data.pendingScriptProposal) {
                        proposal = { ...data.pendingScriptProposal, kind: 'script', title: 'Proposed correction', status: 'pending' }
                    } else if (data.pendingPurchaseOrderProposal) {
                        proposal = { ...data.pendingPurchaseOrderProposal, kind: 'purchase_order', title: 'Proposed purchase order', status: 'pending' }
                    }
                    setMessages((prev) => {
                        const lastIdx = prev.length - 1
                        if (!prev[lastIdx]?.streaming) return prev
                        const next = [...prev]
                        next[lastIdx] = { ...next[lastIdx], text: data.text || next[lastIdx].text, at: Date.now(), streaming: false, proposal }
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
            {messages.length === 0 && (
                <div className="epsilon-empty-state">
                    <div className="epsilon-empty-mark">ε</div>
                    <p>Ask me how to do something, why a transaction is blocked, what your numbers mean, or to generate a report.</p>
                </div>
            )}
            {messages.map((m, i) => (
                <div key={i} className={`epsilon-bubble-row epsilon-bubble-row-${m.role}`}>
                    <div className={`epsilon-bubble epsilon-bubble-${m.role}`}>
                        {m.streaming && !m.text && !toolStatus && (
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
            {error && <div className="epsilon-error">{error}</div>}
            <div ref={bottomRef} />
        </div>
    )

    const inputRowJsx = (
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
    )

    const sidebarJsx = (
        <div className="epsilon-sidebar">
            <button className="epsilon-sidebar-new-btn" onClick={startNewChat}>+ New chat</button>
            <div className="epsilon-sidebar-list">
                {conversations.length === 0 && (
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
