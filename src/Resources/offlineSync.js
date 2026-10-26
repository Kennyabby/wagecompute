// offlineSync.js
//
// Every change the POS and Delivery screens make goes into this device's
// queue first and is then sent to the server's /pos/ops/apply, oldest first.
//
// The queue entry's id is the change's id for good. The server keeps every
// id it has applied, so a change sent twice (a timeout after the server had
// already saved it, two flushes at once, the till reopened the next day) is
// applied once. An entry leaves the queue only when the server says it is
// done, or that it kept it for review.
//
// The device also tells the server what it still holds, so a session is not
// ended while its sales are still on their way here, and admins can see
// which device is holding what.

import { loadPendingChanges, markPendingChangeSynced, queuePendingChange, updatePendingChange } from './offlineDb';
import { generateClientTxnId, getTerminalId } from './clientTxnId';

// How to reach the server, handed over once by App.js. Kept here so a screen
// can submit a change without passing these along every time.
let transport = { fetchServer: null, server: '' };
export function setSyncTransport(fetchServer, server) {
  transport = { fetchServer, server };
}

const onDesktop = () => typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

const BATCH = 25;
// The server's answers that let a change leave the queue. "conflict" means
// it was kept on the server for someone to review.
const DONE = new Set(['applied', 'conflict']);
// While anything is waiting, the queue is retried this often, and the
// server is told what is still here at least this often.
export const RETRY_MS = 30 * 1000;
const REPORT_MS = 60 * 1000;

const emit = (name, detail) => {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch (e) { /* no window in tests */ }
};

// What a change is about, for the server's list of what each device holds
// and for the session close check.
export function describeChange(change) {
  const payload = change?.payload || {};
  switch (change?.entityType) {
    case 'order':
      return { key: payload.orderNumber || change.clientId || null, sessionId: payload.sessionId ?? change.snapshot?.sessionId ?? null, handlerId: payload.handlerId || change.snapshot?.handlerId || null };
    case 'session':
    case 'sessionManagers':
      return { key: payload.start ?? change.clientId ?? null, sessionId: payload.start ?? null, handlerId: payload.employee_id || null };
    case 'table':
      return { key: payload.i_d ?? change.clientId ?? null, sessionId: null, handlerId: null };
    case 'inventory': {
      const first = Array.isArray(payload.transactions) ? payload.transactions[0] : null;
      return { key: first?.orderNumber || null, sessionId: first?.sessionId ?? null, handlerId: first?.handlerId || null };
    }
    default:
      return { key: null, sessionId: null, handlerId: null };
  }
}

const toOp = (change) => ({
  opId: change.id,
  entityType: change.entityType,
  op: change.op,
  action: change.action || null,
  clientId: change.clientId ?? null,
  payload: change.payload,
  snapshot: change.snapshot || null,
  clientCreatedAt: change.createdAt || null,
});

// The server's last answer for each change sent from this page, so a screen
// that waited for one (submitChange with immediate) can say what happened.
const answers = new Map();
export function getChangeResult(id) {
  return answers.get(id) || null;
}

const lastReport = new Map();
// Also the device's heartbeat: sent at least every REPORT_MS even with
// nothing queued, so the server knows when a till was last in touch. A till
// that went quiet without logging out may hold sales it could not report,
// and ending its session warns about that (wageserver posOps closeCheck).
async function reportOutbox(company, userId, remaining, fetchServer, server, { force = false, closing = false } = {}) {
  const key = `${company}|${userId}`;
  const previous = lastReport.get(key);
  const signature = remaining.map((c) => `${c.id}:${c.attempts || 0}`).join(',');
  if (!force && !closing && previous && previous.signature === signature && Date.now() - previous.at < REPORT_MS) return;
  const pending = remaining.map((change) => ({
    opId: change.id,
    entityType: change.entityType,
    op: change.op,
    action: change.action || null,
    ...describeChange(change),
    createdAt: change.createdAt || null,
    attempts: change.attempts || 0,
    lastError: change.lastError || null,
    status: change.lastStatus || null,
  }));
  const resp = await fetchServer('POST', { terminalId: getTerminalId(), pending, ...(closing ? { closing: true } : {}) }, 'pos/outbox/report', server).catch(() => null);
  if (resp && !resp.err) lastReport.set(key, { signature, at: Date.now() });
}

async function drain(company, userId, fetchServer, server) {
  const changes = await loadPendingChanges(company, userId);
  const results = [];
  const left = [];
  let stopped = false;

  for (let index = 0; index < changes.length; index += BATCH) {
    const batch = changes.slice(index, index + BATCH);
    if (stopped) {
      left.push(...batch);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetchServer('POST', {
      terminalId: getTerminalId(),
      tzOffset: new Date().getTimezoneOffset(),
      ops: batch.map(toOp),
    }, 'pos/ops/apply', server);

    if (!resp || resp.err || !Array.isArray(resp.results)) {
      // The connection or the server failed. Everything stays queued, in
      // order, and the next flush starts from the same place.
      stopped = true;
      const error = resp?.mess || 'Could not reach the server';
      for (const change of batch) {
        // eslint-disable-next-line no-await-in-loop
        await updatePendingChange(company, userId, change.id, { attempts: (change.attempts || 0) + 1, lastError: error, lastTriedAt: Date.now() });
        left.push({ ...change, attempts: (change.attempts || 0) + 1, lastError: error });
        results.push({ id: change.id, status: 'error', error });
      }
      continue;
    }

    const byId = new Map(resp.results.map((r) => [r.opId, r]));
    for (const change of batch) {
      const answer = byId.get(change.id) || { status: 'retry', message: 'No answer for this change' };
      answers.set(change.id, answer);
      if (DONE.has(answer.status)) {
        // eslint-disable-next-line no-await-in-loop
        await markPendingChangeSynced(company, userId, change.id);
        if (answer.status === 'conflict') emit('wc:pos-sync-conflict', { change, message: answer.message });
        results.push({ id: change.id, status: answer.status === 'conflict' ? 'conflict' : (answer.duplicate ? 'duplicate_resolved' : 'ok'), warning: answer.warning || null, message: answer.message || null });
      } else {
        const patch = { attempts: (change.attempts || 0) + 1, lastError: answer.message || answer.status, lastStatus: answer.status, lastTriedAt: Date.now() };
        // eslint-disable-next-line no-await-in-loop
        await updatePendingChange(company, userId, change.id, patch);
        left.push({ ...change, ...patch });
        results.push({ id: change.id, status: 'error', error: patch.lastError, serverStatus: answer.status });
      }
    }
  }

  await reportOutbox(company, userId, left, fetchServer, server).catch(() => {});
  emit('wc:pos-sync-state', { company, userId, pending: left.length, stuck: left.filter((c) => c.lastStatus === 'rejected').length });
  return results;
}

// One flush at a time per queue. A flush asked for while one is running
// runs again straight after it, so a change queued mid-flush is never left
// for the next timer.
const flights = new Map();

/**
 * Sends everything queued for this company and user. Resolves with one
 * result per change attempted: status 'ok', 'duplicate_resolved',
 * 'conflict' (kept on the server for review) or 'error' (still queued).
 */
export function syncPendingChanges(company, userId, fetchServer = transport.fetchServer, server = transport.server) {
  if (!company || !userId || !fetchServer) return Promise.resolve([]);
  const key = `${company}|${userId}`;
  const flight = flights.get(key);
  if (flight) {
    flight.again = true;
    return flight.promise;
  }
  const entry = { again: false, promise: null };
  entry.promise = (async () => {
    let results = [];
    do {
      entry.again = false;
      // eslint-disable-next-line no-await-in-loop
      results = results.concat(await drain(company, userId, fetchServer, server));
    } while (entry.again);
    return results;
  })().finally(() => flights.delete(key));
  flights.set(key, entry);
  return entry.promise;
}

/**
 * Submits one change (an order, a table, a session, stock) made on the POS
 * or Delivery screens. It is written to this device's queue first, so it
 * survives a dropped connection, a closed tab or a crash, and then sent at
 * once.
 *
 * `immediate` waits until the queue has been sent (or the attempt failed),
 * for an action whose result has to be on the server before the screen
 * moves on, such as cancelling an order. The desktop app always waits: its
 * server is on the same machine.
 *
 * Never throws: a change that could not be sent stays queued and is retried.
 * Resolves with the change's id.
 */
export async function submitChange(company, userId, change, { immediate = false } = {}) {
  const queued = { ...change, id: change.id || generateClientTxnId(), createdAt: change.createdAt || Date.now() };
  const id = await queuePendingChange(company, userId, queued);
  if (!id) {
    // No local storage on this device (private window, storage blocked).
    // Sent straight to the server; if that fails there is nowhere to keep
    // it, so the caller is told.
    if (!transport.fetchServer) throw new Error('This change could not be saved on this device');
    await processChange(queued, company, transport.fetchServer, transport.server);
    return queued.id;
  }
  const flushing = syncPendingChanges(company, userId).catch(() => []);
  if (immediate || onDesktop()) await flushing;
  return id;
}

/**
 * Sends one change straight to the server and throws unless the server
 * applied it (or kept it for review). Kept for callers that need the answer
 * in hand; the id it carries makes a later resend of the same change
 * harmless.
 */
export async function processChange(change, company, fetchServer, server) {
  const withId = change.id ? change : { ...change, id: generateClientTxnId(), createdAt: change.createdAt || Date.now() };
  const resp = await fetchServer('POST', {
    terminalId: getTerminalId(),
    tzOffset: new Date().getTimezoneOffset(),
    ops: [toOp(withId)],
  }, 'pos/ops/apply', server);
  const answer = Array.isArray(resp?.results) ? resp.results[0] : null;
  if (!answer || !DONE.has(answer.status)) {
    throw new Error(answer?.message || resp?.mess || `${change.entityType}:${change.op} was not applied on the server`);
  }
  return { ...answer, isDuplicate: answer.duplicate === true };
}

/**
 * Keeps the queue moving in the background: every RETRY_MS while anything
 * is queued, and as soon as the connection comes back. Returns a stop
 * function.
 */
export function startBackgroundSync(company, userId) {
  if (!company || !userId || typeof window === 'undefined') return () => {};
  const tick = async () => {
    const pending = await loadPendingChanges(company, userId);
    if (pending.length) await syncPendingChanges(company, userId).catch(() => {});
    else await reportOutbox(company, userId, [], transport.fetchServer, transport.server).catch(() => {});
  };
  const timer = setInterval(tick, RETRY_MS);
  const onOnline = () => { tick(); };
  window.addEventListener('online', onOnline);
  tick();
  return () => {
    clearInterval(timer);
    window.removeEventListener('online', onOnline);
  };
}

/**
 * Tells the server this device is signing out, with whatever it still holds.
 * A till closed this way is not reported as gone quiet.
 */
export async function reportDeviceClosed(company, userId, fetchServer = transport.fetchServer, server = transport.server) {
  if (!company || !userId || !fetchServer) return;
  const pending = await loadPendingChanges(company, userId).catch(() => []);
  await reportOutbox(company, userId, pending, fetchServer, server, { closing: true }).catch(() => {});
}

/** How many changes this device still holds, and how many the server refused. */
export async function getQueueSummary(company, userId) {
  const pending = await loadPendingChanges(company, userId);
  return {
    pending: pending.length,
    refused: pending.filter((c) => c.lastStatus === 'rejected').length,
    oldestAt: pending.reduce((min, c) => (c.createdAt && (!min || c.createdAt < min) ? c.createdAt : min), null),
    changes: pending,
  };
}

/**
 * Before a session (or the business day) is closed: sends what this device
 * holds, then asks the server whether anything for it is still missing on
 * any device. `scope` is { sessionId, handlerId } for one session, or
 * { from, to } for a whole day.
 */
export async function checkReadyToClose(company, userId, scope, fetchServer = transport.fetchServer, server = transport.server) {
  await syncPendingChanges(company, userId, fetchServer, server).catch(() => []);
  const local = await getQueueSummary(company, userId);
  const belongs = (change) => {
    const { sessionId, handlerId } = describeChange(change);
    if (scope?.sessionId !== undefined && scope?.sessionId !== null) return String(sessionId) === String(scope.sessionId);
    if (scope?.from !== undefined && scope?.to !== undefined) {
      if (scope.handlerId && handlerId !== scope.handlerId) return false;
      const stamp = Number(sessionId ?? change.createdAt);
      return Number.isFinite(stamp) && stamp >= scope.from && stamp < scope.to;
    }
    return false;
  };
  const localLeft = local.changes.filter(belongs);
  const resp = await fetchServer('POST', scope || {}, 'pos/sessions/closeCheck', server);
  if (!resp || resp.err) {
    return { ready: false, offline: true, localLeft, tills: [], stuck: [], message: resp?.mess || 'Could not reach the server to check that everything has synced.' };
  }
  return { ready: !localLeft.length && resp.ready === true, localLeft, tills: resp.tills || [], stuck: resp.stuck || [], quiet: resp.quiet || [] };
}

/**
 * One line for a confirmation: tills of this session that stopped checking
 * in without signing out, so may hold sales they could not send.
 */
export function describeQuiet(check) {
  const quiet = check?.quiet || [];
  if (!quiet.length) return '';
  const list = quiet.map((till) => `${till.user || 'a device'}'s device ${till.terminalId}, last in touch ${new Date(till.lastSeenAt).toLocaleTimeString()}`).join('; ');
  return `No sales are known to be missing, but ${list}. Anything sold on it since then has not reached the server yet.`;
}

/** One line for the screen: why a session cannot close yet. */
export function describeNotReady(check) {
  if (!check || check.ready) return '';
  if (check.offline) return `${check.message} Connect to the internet and try again.`;
  const parts = [];
  if (check.localLeft?.length) parts.push(`${check.localLeft.length} change(s) on this device have not reached the server yet`);
  (check.tills || []).forEach((till) => {
    const orders = till.orderNumbers?.length ? ` (orders ${till.orderNumbers.slice(0, 5).join(', ')}${till.orderNumbers.length > 5 ? ', ...' : ''})` : '';
    const seen = till.lastSeenAt ? `, last seen ${new Date(till.lastSeenAt).toLocaleString()}` : '';
    parts.push(`${till.count} change(s) still on ${till.user || 'a device'}'s device ${till.terminalId}${orders}${seen}`);
  });
  (check.stuck || []).slice(0, 3).forEach((row) => parts.push(`${row.entityType} ${row.key || ''} ${row.status === 'rejected' ? 'was refused' : 'is waiting'}: ${row.message || ''}`.trim()));
  return `Not everything for this session has synced: ${parts.join('; ')}.`;
}
