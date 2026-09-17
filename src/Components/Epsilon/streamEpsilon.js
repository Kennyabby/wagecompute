// Streams one Epsilon turn over POST /ai/epsilon/message/stream, parsing
// `data: {...}\n\n` SSE frames from the raw fetch response body as they
// arrive. fetchServer.js always awaits a full `.json()` response, so it
// can't be reused here — this mirrors its own auth (httpOnly cookie +
// same-tab Authorization header) and its one-shot 401-refresh-and-retry, in
// miniature, rather than duplicating the whole helper.
import { getInMemoryAccessToken, setInMemoryAccessToken } from '../../Resources/ClientServerAPIConn/fetchServer'

const buildRequest = (body, signal) => ({
    method: 'POST',
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
        ...(getInMemoryAccessToken() ? { Authorization: `Bearer ${getInMemoryAccessToken()}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
})

// onEvent(type, data) is called for every parsed frame — 'text_delta',
// 'tool_start', 'tool_end', and a final 'done' carrying everything the
// non-streaming route returns in one shot (ok, text, conversationId,
// pendingScriptProposal, pendingPurchaseOrderProposal, mess/code on failure).
// Always resolves — never throws — 'done' with ok:false covers every error
// path so callers don't need a try/catch of their own.
const streamEpsilonMessage = async ({ server, body, onEvent, signal }) => {
    let resp
    try {
        resp = await fetch(`${server}/ai/epsilon/message/stream`, buildRequest(body, signal))
    } catch (e) {
        if (e.name === 'AbortError') return
        onEvent('done', { ok: false, mess: 'Could not connect to server. Please check your internet connection.' })
        return
    }

    if (resp.status === 401 || resp.status === 403) {
        try {
            const tokenResp = await fetch(`${server}/token`, { method: 'POST', credentials: 'include' })
            if (tokenResp.ok) {
                const tokenData = await tokenResp.json().catch(() => ({}))
                if (tokenData?.accessToken) setInMemoryAccessToken(tokenData.accessToken)
                resp = await fetch(`${server}/ai/epsilon/message/stream`, buildRequest(body, signal))
            }
        } catch (e) {
            if (e.name === 'AbortError') return
            // fall through — resp still holds the original 401/403 response
        }
    }

    if (resp.status === 401 || resp.status === 403) {
        onEvent('done', { ok: false, mess: 'Session expired. Please log in again.' })
        return
    }

    // A request blocked before any stream opens (disabled, no seat, no
    // tokens, rate-limited) comes back as plain JSON on a 200 — the exact
    // same shape the non-streaming route returns, never an event-stream
    // body. Only an actual opened stream has this content-type.
    const contentType = resp.headers.get('content-type') || ''
    if (!contentType.includes('text/event-stream') || !resp.body) {
        const payload = await resp.json().catch(() => ({}))
        onEvent('done', { ok: false, mess: 'Epsilon ran into an error. Please try again.', ...payload })
        return
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const frames = buffer.split('\n\n')
            buffer = frames.pop() || '' // last piece may be an incomplete frame — kept for the next read
            for (const frame of frames) {
                const line = frame.split('\n').find((l) => l.startsWith('data: '))
                if (!line) continue
                try {
                    const event = JSON.parse(line.slice(6))
                    onEvent(event.type, event)
                } catch (e) { /* malformed frame — skip it, don't break the whole stream */ }
            }
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            onEvent('done', { ok: false, mess: 'Connection to Epsilon was interrupted. Please try again.' })
        }
    }
}

export default streamEpsilonMessage
