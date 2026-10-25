// A stand-in for the browser's EventSource that the tests drive by hand.
class FakeEventSource {
  static instances = []
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2
  constructor(url) {
    this.url = url
    this.readyState = FakeEventSource.CONNECTING
    this.listeners = {}
    FakeEventSource.instances.push(this)
  }
  addEventListener(name, fn) { (this.listeners[name] = this.listeners[name] || []).push(fn) }
  emit(name, data, lastEventId = '') {
    const event = { data: typeof data === 'string' ? data : JSON.stringify(data), lastEventId }
    if (name === 'message') this.onmessage && this.onmessage(event)
    else (this.listeners[name] || []).forEach((fn) => fn(event))
  }
  open() { this.readyState = FakeEventSource.OPEN; this.onopen && this.onopen() }
  refuse() { this.readyState = FakeEventSource.CLOSED; this.onerror && this.onerror(new Error('refused')) }
  close() { this.readyState = FakeEventSource.CLOSED }
}

// Plain function: this project's Jest setup resets jest.fn mocks before each test.
let mockRefreshes = 0
jest.mock('./fetchServer', () => ({
  refreshAccessToken: async () => { mockRefreshes += 1; return 'new-token' },
}))

// eslint-disable-next-line import/first
import createSSE from './sseClient'

beforeEach(() => {
  jest.useFakeTimers()
  FakeEventSource.instances = []
  mockRefreshes = 0
  global.EventSource = FakeEventSource
})
afterEach(() => { jest.useRealTimers() })

const flush = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve() }

test('a refused reconnect (expired token) refreshes the token and connects again, resuming from the last event', async () => {
  const seen = []
  const status = []
  const live = createSSE('https://api.test', (payload) => seen.push(payload), () => {}, { onStatus: (s) => status.push(s) })
  const first = FakeEventSource.instances[0]
  first.open()
  first.emit('hello', { boot: 'b1' })
  first.emit('message', { collection: 'POSSessions', op: 'update' }, 'b1-7')
  first.refuse()
  expect(status).toEqual([true, false])
  jest.advanceTimersByTime(1000)
  await flush()
  expect(mockRefreshes).toBe(1)
  expect(FakeEventSource.instances).toHaveLength(2)
  expect(FakeEventSource.instances[1].url).toBe('https://api.test/sse/changes?lastEventId=b1-7')
  FakeEventSource.instances[1].open()
  expect(status).toEqual([true, false, true])
  expect(seen).toHaveLength(1)
  live.close()
})

test('a server that cannot replay the gap asks the app to reload', () => {
  const resyncs = []
  const live = createSSE('https://api.test', () => {}, () => {}, { onResync: (d) => resyncs.push(d) })
  FakeEventSource.instances[0].open()
  FakeEventSource.instances[0].emit('resync', { reason: 'server restarted' })
  expect(resyncs).toEqual([{ reason: 'server restarted' }])
  live.close()
})

test('reopening with nothing to resume from also reloads, the first open does not', () => {
  const resyncs = []
  const live = createSSE('https://api.test', () => {}, () => {}, { onResync: (d) => resyncs.push(d) })
  const es = FakeEventSource.instances[0]
  es.open()
  es.emit('hello', { boot: 'b1' })
  expect(resyncs).toHaveLength(0)
  es.emit('hello', { boot: 'b1' })
  expect(resyncs).toEqual([{ reason: 'reconnected' }])
  live.close()
})

test('a connection silent for 45 seconds is replaced; pings keep it', async () => {
  const live = createSSE('https://api.test', () => {}, () => {})
  const es = FakeEventSource.instances[0]
  es.open()
  for (let i = 0; i < 6; i += 1) {
    jest.advanceTimersByTime(10000)
    es.emit('ping', String(Date.now()))
  }
  expect(FakeEventSource.instances).toHaveLength(1)
  jest.advanceTimersByTime(60000)
  await flush()
  jest.advanceTimersByTime(1000)
  await flush()
  expect(FakeEventSource.instances.length).toBeGreaterThan(1)
  live.close()
})

test('a change too large to send makes the app reload that collection instead of applying a summary', () => {
  const seen = []
  const resyncs = []
  const live = createSSE('https://api.test', (p) => seen.push(p), () => {}, { onResync: (d) => resyncs.push(d) })
  FakeEventSource.instances[0].open()
  FakeEventSource.instances[0].emit('message', { collection: 'Orders', data: { summary: 'Payload too large for broadcast' } }, 'b1-9')
  expect(seen).toHaveLength(0)
  expect(resyncs).toEqual([{ reason: 'large change', collection: 'Orders' }])
  live.close()
})
