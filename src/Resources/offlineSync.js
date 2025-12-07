// Helper for syncing offline pendingChanges to the live database
// This is intended to be called from an Admin-only action (e.g. a "Sync Offline POS" button).

import { loadPendingChanges, markPendingChangeSynced } from './offlineDb';

/**
 * Sync all pendingChanges for a given company + user.
 *
 * @param {string} company      - MongoDB database / company name
 * @param {string} userId       - Typically companyRecord.emailid
 * @param {Function} fetchServer - The existing fetchServer function from ContextProvider
 * @param {string} server       - The SERVER base URL from ContextProvider
 * @returns {Promise<Array<{id: string, status: 'ok' | 'error', error?: string}>>}
 */
export async function syncPendingChanges(company, userId, fetchServer, server) {
  const changes = await loadPendingChanges(company, userId);
  const results = [];

  for (const change of changes) {
    try {
      switch (change.entityType) {
        case 'order':
          await syncOrderChange(change, company, fetchServer, server);
          break;
        case 'session':
          await syncSessionChange(change, company, fetchServer, server);
          break;
        case 'inventory':
          await syncInventoryChange(change, company, fetchServer, server);
          break;
        case 'table':
          await syncTableChange(change, company, fetchServer, server);
          break;
        default:
          // Unknown type; skip but still mark as synced to avoid blocking the queue
          break;
      }

      await markPendingChangeSynced(company, userId, change.id);
      results.push({ id: change.id, status: 'ok' });
    } catch (e) {
      // Leave this change in the queue for a later retry
      results.push({ id: change.id, status: 'error', error: e?.message || String(e) });
      throw new Error(e?.message || String(e));
    }
  }

  return results;
}

// =============================
// Internal sync handlers
// =============================

async function syncOrderChange(change, company, fetchServer, server) {
  const { op, payload } = change;

  if (!payload) return;

  delete payload._id
  if (op === 'create') {
    const resp = await fetchServer('POST', {
      database: company,
      collection: 'Orders',
      update: payload,
    }, 'createDoc', server);

    if (resp && resp.err) {
      throw new Error(resp.mess || 'Failed to create order');
    }
  } else if (op === 'update') {
    if (!payload.orderNumber) return;
    const resp = await fetchServer('POST', {
      database: company,
      collection: 'Orders',
      prop: [{ orderNumber: payload.orderNumber }, { ...payload }],
    }, 'updateOneDoc', server);

    if (resp && resp.err) {
      throw new Error(resp.mess || 'Failed to update order');
    }
  }
}

async function syncSessionChange(change, company, fetchServer, server) {
  const { op, payload } = change;
  if (!payload) return;

  delete payload._id

  if (op === 'create') {
    const resp = await fetchServer('POST', {
      database: company,
      collection: 'POSSessions',
      update: payload,
    }, 'createDoc', server);

    if (resp && resp.err) {
      throw new Error(resp.mess || 'Failed to create session');
    }
  } else if (op === 'update') {
    if (!payload.start) return;
    const resp = await fetchServer('POST', {
      database: company,
      collection: 'POSSessions',
      prop: [{ start: payload.start }, { ...payload }],
    }, 'updateOneDoc', server);

    if (resp && resp.err) {
      throw new Error(resp.mess || 'Failed to update session');
    }
  } else if (op === 'delete') {
    if (!payload.start) return;
    const resp = await fetchServer('POST', {
      database: company,
      collection: 'POSSessions',
      update: { start: payload.start },
    }, 'removeDoc', server);

    if (resp && resp.err) {
      throw new Error(resp.mess || 'Failed to delete session');
    }
  }
}

async function syncInventoryChange(change, company, fetchServer, server) {
  const { op, payload } = change;
  if (!payload || !Array.isArray(payload.transactions)) return;
  if (op !== 'create') return;

  delete payload._id
  for (const txn of payload.transactions) {
    const resp = await fetchServer('POST', {
      database: company,
      collection: 'InventoryTransactions',
      update: txn,
    }, 'createDoc', server);

    if (resp && resp.err) {
      throw new Error(resp.mess || 'Failed to create inventory transaction');
    }
  }
}

async function syncTableChange(change, company, fetchServer, server) {
  const { op, payload } = change;
  if (!payload || !payload.i_d) return;
  
  delete payload._id
  if (op === 'create') {
    const resp = await fetchServer('POST', {
      database: company,
      collection: 'Tables',
      update: payload,
    }, 'createDoc', server);

    if (resp && resp.err) {
      throw new Error(resp.mess || 'Failed to create table');
    }
  } else if (op === 'update') {
    const resp = await fetchServer('POST', {
      database: company,
      collection: 'Tables',
      prop: [{ i_d: payload.i_d }, { ...payload }],
    }, 'updateOneDoc', server);

    if (resp && resp.err) {
      throw new Error(resp.mess || 'Failed to update table');
    }
  } else if (op === 'delete') {
    const resp = await fetchServer('POST', {
      database: company,
      collection: 'Tables',
      update: { i_d: payload.i_d },
    }, 'removeDoc', server);

    if (resp && resp.err) {
      throw new Error(resp.mess || 'Failed to delete table');
    }
  }
}