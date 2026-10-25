import { businessDayOf, orderBusinessFields, deliveryBusinessFields } from './businessDay';

// The device mockQueue, in memory, in place of IndexedDB.
let mockQueue = [];
// Plain functions: this project's Jest setup resets jest.fn mocks before each test.
jest.mock('./offlineDb', () => ({
  loadPendingChanges: async () => [...mockQueue].sort((a, b) => a.createdAt - b.createdAt),
  queuePendingChange: async (company, userId, change) => {
    mockQueue.push({ ...change });
    return change.id;
  },
  markPendingChangeSynced: async (company, userId, id) => {
    mockQueue = mockQueue.filter((c) => c.id !== id);
  },
  updatePendingChange: async (company, userId, id, patch) => {
    mockQueue = mockQueue.map((c) => (c.id === id ? { ...c, ...patch } : c));
  },
}));

// eslint-disable-next-line import/first
import { syncPendingChanges, submitChange, setSyncTransport, checkReadyToClose, describeNotReady, getChangeResult } from './offlineSync';

// A server that applies everything unless told otherwise per opId.
const makeServer = (answers = {}) => {
  const calls = [];
  const fetchServer = async (method, body, endpoint) => {
    calls.push({ endpoint, body });
    if (endpoint === 'pos/ops/apply') {
      if (answers.down) return { err: true, mess: 'Could not connect to server' };
      return { ok: true, results: body.ops.map((op) => ({ opId: op.opId, status: answers[op.opId] || 'applied', message: answers[`${op.opId}:message`] || null })) };
    }
    if (endpoint === 'pos/sessions/closeCheck') return { ok: true, ready: !answers.tills, tills: answers.tills || [], stuck: [] };
    return { ok: true };
  };
  return { fetchServer, calls };
};

const change = (id, entityType, extra = {}) => ({ id, entityType, op: 'create', payload: { orderNumber: id, sessionId: 100 }, createdAt: Number(id.replace(/\D/g, '')) || Date.now(), ...extra });

beforeEach(() => { mockQueue = []; });

describe('business day', () => {
  // Session closing at 8: anything before 8am belongs to the day before.
  const getSessionStart = (ts) => {
    const d = new Date(ts);
    const start = new Date(d);
    start.setHours(8, 0, 0, 0);
    if (d < start) start.setDate(start.getDate() - 1);
    return start.getTime();
  };

  test('an order at 01:30 counts for the day before, at 23:59:59, keeping its real time', () => {
    const placed = new Date(2026, 9, 26, 1, 30).getTime();
    const day = businessDayOf(placed, getSessionStart);
    expect(day.businessDate).toBe('2026-10-25');
    expect(day.overnight).toBe(true);
    expect(day.effectiveAt).toBe(new Date(2026, 9, 25, 23, 59, 59).getTime());
    expect(orderBusinessFields(placed, getSessionStart)).toEqual({ businessDate: '2026-10-25', overnight: true, postingDate: '2026-10-25', postingStamp: day.effectiveAt });
  });

  test('a daytime order and a delivery at 09:00 keep their own day and time', () => {
    const delivered = new Date(2026, 9, 26, 9, 0).getTime();
    expect(deliveryBusinessFields(delivered, getSessionStart)).toEqual({ deliveryBusinessDate: '2026-10-26', deliveryPostingStamp: delivered, deliveredOvernight: false });
  });
});

describe('POS queue', () => {
  test('applied changes leave the queue and the device reports what is left', async () => {
    mockQueue = [change('o1', 'order'), change('o2', 'order', { op: 'update', action: 'pay' })];
    const { fetchServer, calls } = makeServer();
    const results = await syncPendingChanges('co', 'u', fetchServer, 'srv');
    expect(results.map((r) => r.status)).toEqual(['ok', 'ok']);
    expect(mockQueue).toHaveLength(0);
    const sent = calls.find((c) => c.endpoint === 'pos/ops/apply').body.ops;
    expect(sent.map((op) => op.opId)).toEqual(['o1', 'o2']);
    expect(sent[1].action).toBe('pay');
  });

  test('when the server cannot be reached nothing is lost and the order is kept', async () => {
    mockQueue = [change('o1', 'order'), change('o2', 'order')];
    const { fetchServer } = makeServer({ down: true });
    const results = await syncPendingChanges('co', 'u', fetchServer, 'srv');
    expect(results.every((r) => r.status === 'error')).toBe(true);
    expect(mockQueue.map((c) => c.id)).toEqual(['o1', 'o2']);
    expect(mockQueue[0].attempts).toBe(1);
    expect(mockQueue[0].lastError).toMatch(/connect/);
  });

  test('a change the server is waiting on stays, one it kept for review goes, with a notice', async () => {
    mockQueue = [change('o1', 'order'), change('o2', 'order')];
    const { fetchServer, calls } = makeServer({ o1: 'waiting', o2: 'conflict', 'o2:message': 'already paid' });
    const notices = [];
    const listener = (event) => notices.push(event.detail.message);
    window.addEventListener('wc:pos-sync-conflict', listener);
    await syncPendingChanges('co', 'u', fetchServer, 'srv');
    window.removeEventListener('wc:pos-sync-conflict', listener);
    expect(mockQueue.map((c) => c.id)).toEqual(['o1']);
    expect(mockQueue[0].lastStatus).toBe('waiting');
    expect(notices).toEqual(['already paid']);
    const report = calls.find((c) => c.endpoint === 'pos/outbox/report').body;
    expect(report.pending).toEqual([expect.objectContaining({ opId: 'o1', key: 'o1', sessionId: 100, status: 'waiting' })]);
  });

  test('flushes asked for at the same time send each change once', async () => {
    mockQueue = [change('o1', 'order')];
    const { fetchServer, calls } = makeServer();
    await Promise.all([
      syncPendingChanges('co', 'u', fetchServer, 'srv'),
      syncPendingChanges('co', 'u', fetchServer, 'srv'),
      syncPendingChanges('co', 'u', fetchServer, 'srv'),
    ]);
    const sentIds = calls.filter((c) => c.endpoint === 'pos/ops/apply').flatMap((c) => c.body.ops.map((op) => op.opId));
    expect(sentIds).toEqual(['o1']);
  });

  test('a submitted change is queued with a lasting id, sent at once, and never throws', async () => {
    const { fetchServer, calls } = makeServer({ down: true });
    setSyncTransport(fetchServer, 'srv');
    const id = await submitChange('co', 'u', { entityType: 'order', op: 'create', payload: { orderNumber: 'X' } }, { immediate: true });
    expect(id).toBeTruthy();
    expect(mockQueue).toHaveLength(1);
    expect(mockQueue[0].id).toBe(id);
    expect(calls.filter((c) => c.endpoint === 'pos/ops/apply')[0].body.ops[0].opId).toBe(id);
  });

  test('a screen that waited for a change can read what the server said', async () => {
    const { fetchServer } = makeServer({ 'o-cancel': 'applied', 'o-cancel:message': '1 stock line(s) returned.' });
    setSyncTransport(fetchServer, 'srv');
    const id = await submitChange('co', 'u', { id: 'o-cancel', entityType: 'order', op: 'update', action: 'cancel', payload: { orderNumber: 'K' } }, { immediate: true });
    expect(getChangeResult(id)).toEqual(expect.objectContaining({ status: 'applied', message: '1 stock line(s) returned.' }));
    expect(mockQueue).toHaveLength(0);
  });

  test('a session cannot close while this device or another holds its sales', async () => {
    mockQueue = [change('o1', 'order')];
    const { fetchServer } = makeServer({ o1: 'waiting', tills: [{ user: 'ada@x', terminalId: 'T2', count: 2, orderNumbers: ['ORD-9'] }] });
    const check = await checkReadyToClose('co', 'u', { sessionId: 100 }, fetchServer, 'srv');
    expect(check.ready).toBe(false);
    expect(check.localLeft).toHaveLength(1);
    const text = describeNotReady(check);
    expect(text).toMatch(/1 change\(s\) on this device/);
    expect(text).toMatch(/ada@x's device T2 \(orders ORD-9\)/);
  });

  test('with everything synced the session can close', async () => {
    const { fetchServer } = makeServer();
    const check = await checkReadyToClose('co', 'u', { sessionId: 100 }, fetchServer, 'srv');
    expect(check.ready).toBe(true);
    expect(describeNotReady(check)).toBe('');
  });
});
