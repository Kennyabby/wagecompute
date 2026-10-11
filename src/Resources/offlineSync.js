// offlineSync.js
// STRICT offline → online sync with server acknowledgment

import { loadPendingChanges, markPendingChangeSynced, queuePendingChange } from './offlineDb';

// How to reach the server, handed over once by App.js. Kept here so a screen
// can submit a change without passing these along every time.
let transport = { fetchServer: null, server: '' };
export function setSyncTransport(fetchServer, server) {
  transport = { fetchServer, server };
}

const onDesktop = () => typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

// Changes posted straight away go one after another, in the order they were
// made, so an order is never updated before the request that created it.
let line = Promise.resolve();

/**
 * Submits one change (an order, a table, a session, stock) made on the POS
 * or Delivery screens.
 *
 * In the browser a change is put in the local queue and sent by the next
 * sync, which is what lets those screens keep working while the internet is
 * down. The desktop app has no such problem: its server is on the same
 * machine. Queueing there only made every sale, delivery and payment wait
 * for a sync, so on the desktop the change is posted at once.
 *
 * `immediate` asks for the same in the browser, for an action whose result
 * has to be seen at once, such as cancelling an order.
 *
 * A change that cannot be posted (the connection dropped, the server
 * refused it) goes into the queue instead, so it is retried by the next sync
 * and never lost. Resolves once the change is posted or queued.
 */
export function submitChange(company, userId, change, { immediate = false } = {}) {
  if (!transport.fetchServer || !(immediate || onDesktop())) return queuePendingChange(company, userId, change);
  const run = line.then(async () => {
    try {
      return await processChange(change, company, transport.fetchServer, transport.server);
    } catch (error) {
      console.warn(`[OfflineSync] ${change.entityType}:${change.op} could not be posted at once, queued instead`, error?.message || error);
      return queuePendingChange(company, userId, change);
    }
  });
  line = run.catch(() => {});
  return run;
}

/**
 * Sync all pendingChanges for a given company + user.
 */
export async function syncPendingChanges(
  company,
  userId,
  fetchServer,
  server,
  retries = 3
) {
  const changes = await loadPendingChanges(company, userId);
  const results = [];

  for (const change of changes) {
    let attempt = 0;
    let synced = false;
    let lastError = null;

    while (attempt < retries && !synced) {
      try {
        const resp = await processChange(change, company, fetchServer, server);

        if (resp?.isDuplicate) {
          console.warn(`[OfflineSync] Duplicate detected for ${change.entityType}:${change.op}. Removing from queue.`, change.id);
        }

        // ✅ mark ONLY after server confirms success (or duplicate resolution)
        await markPendingChangeSynced(company, userId, change.id);

        results.push({ id: change.id, status: resp?.isDuplicate ? 'duplicate_resolved' : 'ok' });
        synced = true;
      } catch (err) {
        attempt++;
        lastError = err;

        console.warn(
          `[OfflineSync] ${change.entityType}:${change.op} failed (attempt ${attempt})`,
          err.message || err
        );

        if (attempt < retries) {
          await delay(500 * Math.pow(2, attempt)); // exponential backoff
        }
      }
    }

    if (!synced) {
      results.push({
        id: change.id,
        status: 'error',
        error: lastError?.message || String(lastError)
      });
    }
  }

  return results;
}

// =====================================================
// Utilities
// =====================================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stripId(payload) {
  if (!payload) return payload;
  const { _id, ...rest } = payload;
  return rest;
}

function assertCreate(resp) {
  if (!resp || resp.isDelivered !== true) {
    throw new Error('Create not acknowledged by server');
  }
}

function assertUpdate(resp) {
  if (!resp || resp.updated !== true) {
    throw new Error('Update not applied on server');
  }
}

function assertDelete(resp) {
  if (!resp || resp.isRemoved !== true) {
    throw new Error('Delete not applied on server');
  }
}

// =====================================================
// Dispatcher
// =====================================================

export async function processChange(change, company, fetchServer, server) {
  switch (change.entityType) {
    case 'order':
      return syncOrder(change, company, fetchServer, server);
    case 'session':
      return syncSession(change, company, fetchServer, server);
    case 'sessionManagers':
      return syncSessionManager(change, company, fetchServer, server);
    case 'inventory':
      return syncInventory(change, company, fetchServer, server);
    case 'table':
      return syncTable(change, company, fetchServer, server);
    default:
      throw new Error(`Unknown entityType: ${change.entityType}`);
  }
}

// =====================================================
// ORDER
// =====================================================

async function syncOrder(change, company, fetchServer, server) {
  const { op, payload } = change;
  if (!payload) throw new Error('Missing order payload');

  if (op === 'create') {
    const resp = await fetchServer(
      'POST',
      { database: company, collection: 'Orders', update: payload },
      'createDoc',
      server
    );
    assertCreate(resp);
  }

  if (op === 'update') {
    if (!payload.orderNumber) {
      throw new Error('Missing orderNumber for order update');
    }

    const resp = await fetchServer(
      'POST',
      {
        database: company,
        collection: 'Orders',
        prop: [{ orderNumber: payload.orderNumber }, stripId(payload)]
      },
      'updateOneDoc',
      server
    );
    assertUpdate(resp);
  }
}

// =====================================================
// POS SESSION
// =====================================================

async function syncSessionManager(change, company, fetchServer, server) {
  const { op, payload } = change;
  if (!payload) throw new Error('Missing session manager payload');

  if (op === 'create') {
    const resp = await fetchServer(
      'POST',
      { database: company, collection: 'SessionManagers', update: payload },
      'createDoc',
      server
    );
    assertCreate(resp);
  }

  if (op === 'update') {
    if (!payload.start) {
      throw new Error('Missing start for session manager update');
    }

    const resp = await fetchServer(
      'POST',
      {
        database: company,
        collection: 'SessionManagers',
        prop: [{ start: payload.start }, stripId(payload)]
      },
      'updateOneDoc',
      server
    );
    assertUpdate(resp);
  }

  if (op === 'delete') {
    const resp = await fetchServer(
      'POST',
      {
        database: company,
        collection: 'SessionManagers',
        update: { start: payload.start }
      },
      'removeDoc',
      server
    );
    assertDelete(resp);
  }
}

async function syncSession(change, company, fetchServer, server) {
  const { op, payload } = change;
  if (!payload) throw new Error('Missing session payload');

  if (op === 'create') {
    const resp = await fetchServer(
      'POST',
      { database: company, collection: 'POSSessions', update: payload },
      'createDoc',
      server
    );
    assertCreate(resp);
  }

  if (op === 'update') {
    if (!payload.start) {
      throw new Error('Missing start for session update');
    }

    const resp = await fetchServer(
      'POST',
      {
        database: company,
        collection: 'POSSessions',
        prop: [{ start: payload.start }, stripId(payload)]
      },
      'updateOneDoc',
      server
    );
    assertUpdate(resp);
  }

  if (op === 'delete') {
    const resp = await fetchServer(
      'POST',
      {
        database: company,
        collection: 'POSSessions',
        update: { start: payload.start }
      },
      'removeDoc',
      server
    );
    assertDelete(resp);
  }
}

// =====================================================
// INVENTORY (BATCH SAFE)
// =====================================================

async function syncInventory(change, company, fetchServer, server) {
  const { payload } = change;
  if (!payload?.transactions?.length) return;

  const docs = payload.transactions.map(stripId);

  const resp = await fetchServer(
    'POST',
    {
      database: company,
      collection: 'InventoryTransactions',
      update: docs
    },
    'createManyDocs',
    server
  );

  if (!resp || resp.isDelivered !== true) {
    throw new Error('Inventory batch not fully delivered');
  }
}

// =====================================================
// TABLE
// =====================================================

async function syncTable(change, company, fetchServer, server) {
  const { op, payload } = change;
  if (!payload?.i_d) throw new Error('Missing table i_d');

  if (op === 'create') {
    const resp = await fetchServer(
      'POST',
      { database: company, collection: 'Tables', update: payload },
      'createDoc',
      server
    );
    assertCreate(resp);
  }

  if (op === 'update') {
    const resp = await fetchServer(
      'POST',
      {
        database: company,
        collection: 'Tables',
        prop: [{ i_d: payload.i_d }, stripId(payload)]
      },
      'updateOneDoc',
      server
    );
    assertUpdate(resp);
  }

  if (op === 'delete') {
    const resp = await fetchServer(
      'POST',
      {
        database: company,
        collection: 'Tables',
        update: { i_d: payload.i_d }
      },
      'removeDoc',
      server
    );
    assertDelete(resp);
  }
}
