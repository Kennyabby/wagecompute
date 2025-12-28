// offlineSync.js
// Bulletproof offline pendingChanges sync

import { loadPendingChanges, markPendingChangeSynced } from './offlineDb';

/**
 * Sync all pendingChanges for a given company + user.
 *
 * @param {string} company      - MongoDB database / company name
 * @param {string} userId       - Typically companyRecord.emailid
 * @param {Function} fetchServer - The existing fetchServer function from ContextProvider
 * @param {string} server       - The SERVER base URL from ContextProvider
 * @param {number} [retries=3]  - Number of retries for each change
 * @returns {Promise<Array<{id: string, status: 'ok' | 'error', error?: string}>>}
 */
export async function syncPendingChanges(company, userId, fetchServer, server, retries = 3) {
  const changes = await loadPendingChanges(company, userId);
  const results = [];

  for (const change of changes) {
    let attempt = 0;
    let synced = false;
    let lastError = null;

    while (attempt < retries && !synced) {
      try {
        await processChange(change, company, fetchServer, server);
        await markPendingChangeSynced(company, userId, change.id); // only mark after success
        results.push({ id: change.id, status: 'ok' });
        synced = true;
      } catch (err) {
        attempt++;
        lastError = err;
        console.warn(`[Offline Sync] Attempt ${attempt} failed for change ${change.id}:`, err.message || err);

        if (attempt < retries) {
          await delay(500 * Math.pow(2, attempt)); // exponential backoff
        }
      }
    }

    if (!synced) {
      results.push({ id: change.id, status: 'error', error: lastError?.message || String(lastError) });
    }
  }

  return results;
}

// =============================
// Utility: delay for backoff
// =============================
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================
// Process individual change
// =============================
async function processChange(change, company, fetchServer, server) {
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
      console.warn(`[Offline Sync] Unknown entityType: ${change.entityType}`);
  }
}

// =============================
// Helpers
// =============================
function removeId(payload) {
  if (!payload) return payload;
  const { _id, ...rest } = payload; // remove _id safely
  return rest;
}

// =============================
// Individual sync handlers
// =============================
async function syncOrderChange(change, company, fetchServer, server) {
  const { op, payload } = change;
  if (!payload) return;

  if (op === 'create') {
    const resp = await fetchServer('POST', { database: company, collection: 'Orders', update: payload }, 'createDoc', server);
    if (resp?.err) throw new Error(resp.mess || 'Failed to create order');
  } else if (op === 'update') {
    if (!payload.orderNumber) throw new Error('Missing orderNumber for update');
    const updatePayload = removeId(payload);
    const resp = await fetchServer('POST', { database: company, collection: 'Orders', prop: [{ orderNumber: payload.orderNumber }, updatePayload] }, 'updateOneDoc', server);
    if (resp?.err) throw new Error(resp.mess || 'Failed to update order');
  }
}

async function syncSessionChange(change, company, fetchServer, server) {
  const { op, payload } = change;
  if (!payload) return;

  const updatePayload = removeId(payload);

  if (op === 'create') {
    const resp = await fetchServer('POST', { database: company, collection: 'POSSessions', update: payload }, 'createDoc', server);
    if (resp?.err) throw new Error(resp.mess || 'Failed to create session');
  } else if (op === 'update') {
    if (!payload.start) throw new Error('Missing start for session update');
    const resp = await fetchServer('POST', { database: company, collection: 'POSSessions', prop: [{ start: payload.start }, updatePayload] }, 'updateOneDoc', server);
    if (resp?.err) throw new Error(resp.mess || 'Failed to update session');
  } else if (op === 'delete') {
    if (!payload.start) throw new Error('Missing start for session delete');
    const resp = await fetchServer('POST', { database: company, collection: 'POSSessions', update: { start: payload.start } }, 'removeDoc', server);
    if (resp?.err) throw new Error(resp.mess || 'Failed to delete session');
  }
}

async function syncInventoryChange(change, company, fetchServer, server) {
  const { op, payload } = change;
  if (!payload || !Array.isArray(payload.transactions)) return;
  if (op !== 'create') return;

  // Batch send all transactions in one request to reduce roundtrips
  const txnPayloads = payload.transactions.map(txn => removeId(txn));
  if (!txnPayloads.length) return;

  const resp = await fetchServer('POST', { database: company, collection: 'InventoryTransactions', update: txnPayloads }, 'createManyDocs', server);
  if (resp?.err) throw new Error(resp.mess || 'Failed to create inventory transactions (batch)');
}

async function syncTableChange(change, company, fetchServer, server) {
  const { op, payload } = change;
  if (!payload || !payload.i_d) return;

  const updatePayload = removeId(payload);

  if (op === 'create') {
    const resp = await fetchServer('POST', { database: company, collection: 'Tables', update: payload }, 'createDoc', server);
    if (resp?.err) throw new Error(resp.mess || 'Failed to create table');
  } else if (op === 'update') {
    const resp = await fetchServer('POST', { database: company, collection: 'Tables', prop: [{ i_d: payload.i_d }, updatePayload] }, 'updateOneDoc', server);
    if (resp?.err) throw new Error(resp.mess || 'Failed to update table');
  } else if (op === 'delete') {
    const resp = await fetchServer('POST', { database: company, collection: 'Tables', update: { i_d: payload.i_d } }, 'removeDoc', server);
    if (resp?.err) throw new Error(resp.mess || 'Failed to delete table');
  }
}
