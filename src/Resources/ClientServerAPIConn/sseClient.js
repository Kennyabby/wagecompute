import { refreshAccessToken } from './fetchServer'

// The live connection to the server (Server-Sent Events), kept open all day.
//
// The browser's own EventSource gives up for good when a reconnect is
// refused, which is what happened once the 4-hour access token had expired:
// the next network drop, or a server restart, left the page with no live
// updates until someone reloaded it, so a Session Manager started or a
// session ended on one device was not seen on the others. This keeps it
// alive:
//   - a refused reconnect refreshes the token and tries again, backing off
//     from 1 to 30 seconds;
//   - the server pings every 15 seconds, so 45 seconds of silence means the
//     connection is dead even when the browser has not noticed, and it is
//     replaced;
//   - when the tab becomes visible again or the network comes back, a stale
//     connection is replaced at once;
//   - every reconnect sends the id of the last event seen, and the server
//     replays what was missed or answers "resync", which calls onResync so
//     the app reloads what it shows.

const PING_TIMEOUT_MS = 45 * 1000
const STALE_ON_RETURN_MS = 20 * 1000
const MAX_RETRY_MS = 30 * 1000

export default function createSSE(server, onMessage, onError, { onOpen, onResync, onStatus } = {}) {
  const base = `${server.replace(/\/$/, '')}/sse/changes`
  let es = null
  let closed = false
  let lastEventId = null
  let lastSeen = Date.now()
  let retryMs = 1000
  let reconnectTimer = null
  let hasOpened = false
  let connectedState = null

  const setConnected = (value) => {
    if (connectedState === value) return
    connectedState = value
    onStatus && onStatus(value)
  }
  const seen = () => { lastSeen = Date.now() }

  const connect = () => {
    if (closed) return
    const url = lastEventId ? `${base}?lastEventId=${encodeURIComponent(lastEventId)}` : base
    es = new EventSource(url, { withCredentials: true })
    seen()

    es.onopen = () => {
      retryMs = 1000
      seen()
      setConnected(true)
      onOpen && onOpen()
    }
    es.onmessage = (e) => {
      seen()
      if (e.lastEventId) lastEventId = e.lastEventId
      try {
        const payload = JSON.parse(e.data)
        // A broadcast too large to send says only which collection changed.
        if (payload?.data?.summary === 'Payload too large for broadcast') {
          onResync && onResync({ reason: 'large change', collection: payload.collection })
          return
        }
        onMessage && onMessage(payload)
      } catch (err) {
        onError && onError(err)
      }
    }
    es.addEventListener('ping', seen)
    es.addEventListener('hello', () => {
      seen()
      // Reopened without an event id to resume from: anything sent while it
      // was down is unknown, so everything shown is reloaded.
      if (hasOpened && !lastEventId) onResync && onResync({ reason: 'reconnected' })
      hasOpened = true
    })
    es.addEventListener('resync', (e) => {
      seen()
      let detail = {}
      try { detail = JSON.parse(e.data) } catch (err) { /* no detail */ }
      onResync && onResync(detail)
    })
    es.onerror = (err) => {
      setConnected(false)
      onError && onError(err)
      // CONNECTING: the browser is already retrying, with the last event id.
      // CLOSED: it has given up (usually a refused, expired token).
      if (es && es.readyState === EventSource.CLOSED) scheduleReconnect(true)
    }
  }

  const scheduleReconnect = (refreshFirst) => {
    if (closed || reconnectTimer) return
    const wait = retryMs
    retryMs = Math.min(retryMs * 2, MAX_RETRY_MS)
    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null
      if (closed) return
      if (refreshFirst) {
        try { await refreshAccessToken(server) } catch (e) { /* the reconnect says whether it worked */ }
      }
      try { es && es.close() } catch (e) { /* already closed */ }
      connect()
    }, wait)
  }

  const replaceIfStale = (limit) => {
    if (closed) return
    if (Date.now() - lastSeen > limit || !es || es.readyState === EventSource.CLOSED) {
      setConnected(false)
      try { es && es.close() } catch (e) { /* already closed */ }
      retryMs = 1000
      scheduleReconnect(true)
    }
  }

  const watchdog = setInterval(() => replaceIfStale(PING_TIMEOUT_MS), 10 * 1000)
  const onVisible = () => { if (document.visibilityState === 'visible') replaceIfStale(STALE_ON_RETURN_MS) }
  const onOnline = () => replaceIfStale(0)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)

  connect()

  return {
    close() {
      closed = true
      clearInterval(watchdog)
      clearTimeout(reconnectTimer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      try { es && es.close() } catch (e) { /* already closed */ }
      setConnected(false)
    },
    get readyState() { return es ? es.readyState : 2 },
  }
}
