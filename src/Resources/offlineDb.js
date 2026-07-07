// Simple IndexedDB helper for offline POS/Delivery snapshots, generic app cache, and pending changes
// DB is per-company and per-user.

const DB_VERSION = 6;
const POS_STORE = 'posSnapshot';
const DELIVERY_STORE = 'deliverySnapshot';
const PENDING_STORE = 'pendingChanges';

const ORDERS_STORE = 'orders';
const SESSIONS_STORE = 'posSessions';
const SESSIONMANAGERS_STORE = 'sessionManagers'
const TABLES_STORE = 'tables';
const INVENTORY_TXN_STORE = 'inventoryTransactions';
const APP_CACHE_STORE = 'appCache'; // generic key/value cache for App.js datasets

function getDbName(company, userId) {
  const dbPart = company || 'global';
  const userPart = userId || 'anon';
  return `wc-offline:${dbPart}:${userPart}`;
}

function openUserDb(company, userId) {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(getDbName(company, userId), DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(POS_STORE)) {
        db.createObjectStore(POS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DELIVERY_STORE)) {
        db.createObjectStore(DELIVERY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(ORDERS_STORE)) {
        db.createObjectStore(ORDERS_STORE, { keyPath: 'orderNumber' });
      }
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: 'start' });
      }
      if (!db.objectStoreNames.contains(TABLES_STORE)) {
        db.createObjectStore(TABLES_STORE, { keyPath: 'i_d' });
      }
      if (!db.objectStoreNames.contains(INVENTORY_TXN_STORE)) {
        db.createObjectStore(INVENTORY_TXN_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(APP_CACHE_STORE)) {
        db.createObjectStore(APP_CACHE_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

// =============================
// Generic App cache store (App.js datasets)
// =============================

export async function getAppCache(company, userId, cacheKey) {
  try {
    const db = await openUserDb(company, userId);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(APP_CACHE_STORE, 'readonly');
      const store = tx.objectStore(APP_CACHE_STORE);
      const req = store.get(cacheKey);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error || new Error('Failed to read app cache'));
    });
  } catch (e) {
    console.warn('offlineDb:getAppCache failed', e);
    return null;
  }
}

export async function setAppCache(company, userId, cacheKey, data) {
  try {
    const db = await openUserDb(company, userId);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(APP_CACHE_STORE, 'readwrite');
      const store = tx.objectStore(APP_CACHE_STORE);
      const record = { key: cacheKey, data, updatedAt: Date.now() };
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to write app cache'));
    });
  } catch (e) {
    console.warn('offlineDb:setAppCache failed', e);
  }
}

export async function clearAppCache(company, userId, cacheKey) {
  try {
    const db = await openUserDb(company, userId);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(APP_CACHE_STORE, 'readwrite');
      const store = tx.objectStore(APP_CACHE_STORE);
      const req = store.delete(cacheKey);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to delete app cache'));
    });
  } catch (e) {
    console.warn('offlineDb:clearAppCache failed', e);
  }
}

export async function loadAllAppCache(company, userId) {
  try {
    const db = await openUserDb(company, userId);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(APP_CACHE_STORE, 'readonly');
      const store = tx.objectStore(APP_CACHE_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(Array.isArray(req.result) ? req.result : []);
      };
      req.onerror = () => reject(req.error || new Error('Failed to read all app cache'));
    });
  } catch (e) {
    console.warn('offlineDb:loadAllAppCache failed', e);
    return [];
  }
}

// Feature caches (Journals, DashView, etc.) key their entries with an
// embedded version number (e.g. `journal-snapshot-v6-...`) so a version bump
// stops reading old entries — but nothing ever deleted the orphaned old-version
// entries, so they'd sit in IndexedDB forever. This is an age-based sweep
// instead of a version-list (which would need updating here every time a
// feature bumps its own version number): anything not touched in 30 days is
// almost certainly an orphaned/abandoned entry from a prior version or a
// dataset the user no longer views, not a currently-active cache.
const APP_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function sweepStaleAppCache(company, userId) {
  try {
    const entries = await loadAllAppCache(company, userId);
    const cutoff = Date.now() - APP_CACHE_MAX_AGE_MS;
    const stale = entries.filter((entry) => (entry.updatedAt || 0) < cutoff);
    if (!stale.length) return 0;
    await Promise.all(stale.map((entry) => clearAppCache(company, userId, entry.key)));
    return stale.length;
  } catch (e) {
    console.warn('offlineDb:sweepStaleAppCache failed', e);
    return 0;
  }
}

export async function initOfflineDb(company, userId) {
  try {
    const db = await openUserDb(company, userId);
    db.close();
    // Fire-and-forget — don't block app startup on cache housekeeping.
    sweepStaleAppCache(company, userId).catch(() => {});
  } catch (e) {
    // Fail silently; app will just behave as online-only.
    console.warn('offlineDb:init failed', e);
  }
}

export async function loadPosSnapshot(company, userId) {
  try {
    const db = await openUserDb(company, userId);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(POS_STORE, 'readonly');
      const store = tx.objectStore(POS_STORE);
      const req = store.get('snapshot');

      req.onsuccess = () => {
        resolve(req.result?.data || null);
      };
      req.onerror = () => reject(req.error || new Error('Failed to read POS snapshot'));
    });
  } catch (e) {
    console.warn('offlineDb:loadPosSnapshot failed', e);
    return null;
  }
}

export async function savePosSnapshot(company, userId, snapshot) {
  try {
    const db = await openUserDb(company, userId);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(POS_STORE, 'readwrite');
      const store = tx.objectStore(POS_STORE);
      const req = store.put({ id: 'snapshot', data: snapshot, updatedAt: Date.now() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to write POS snapshot'));
    });
  } catch (e) {
    console.warn('offlineDb:savePosSnapshot failed', e);
  }
}

export async function loadDeliverySnapshot(company, userId) {
  try {
    const db = await openUserDb(company, userId);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DELIVERY_STORE, 'readonly');
      const store = tx.objectStore(DELIVERY_STORE);
      const req = store.get('snapshot');

      req.onsuccess = () => {
        resolve(req.result?.data || null);
      };
      req.onerror = () => reject(req.error || new Error('Failed to read Delivery snapshot'));
    });
  } catch (e) {
    console.warn('offlineDb:loadDeliverySnapshot failed', e);
    return null;
  }
}

export async function saveDeliverySnapshot(company, userId, snapshot) {
  try {
    const db = await openUserDb(company, userId);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DELIVERY_STORE, 'readwrite');
      const store = tx.objectStore(DELIVERY_STORE);
      const req = store.put({ id: 'snapshot', data: snapshot, updatedAt: Date.now() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to write Delivery snapshot'));
    });
  } catch (e) {
    console.warn('offlineDb:saveDeliverySnapshot failed', e);
  }
}

// =============================
// Entity stores (orders, sessions, tables, inventory)
// =============================

async function withStore(company, userId, storeName, mode, fn) {
  const db = await openUserDb(company, userId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    fn(store, resolve, reject, tx);
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
  });
}

export function loadAllOrders(company, userId) {
  return withStore(company, userId, ORDERS_STORE, 'readonly', (store, resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      resolve(Array.isArray(req.result) ? req.result : []);
    };
    req.onerror = () => reject(req.error || new Error('Failed to read orders'));
  });
}

export function putOrder(company, userId, order) {
  return withStore(company, userId, ORDERS_STORE, 'readwrite', (store, resolve, reject) => {
    try {
      const req = store.put(order);
      req.onsuccess = () => {
        // small debug log - can be removed after diagnosis
        try { console.debug('offlineDb:putOrder success', (order && order.orderNumber) || null); } catch(e){}
        resolve();
      };
      req.onerror = (e) => {
        console.warn('offlineDb:putOrder failed', { company, userId, order, error: req.error || e });
        reject(req.error || new Error('Failed to write order'));
      };
    } catch (e) {
      console.error('offlineDb:putOrder threw', { company, userId, order, error: e });
      reject(e);
    }
  });
}

export function deleteOrder(company, userId, orderNumber) {
  return withStore(company, userId, ORDERS_STORE, 'readwrite', (store, resolve, reject) => {
    const req = store.delete(orderNumber);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Failed to delete order'));
  });
}

export function loadAllSessionsLocal(company, userId) {
  return withStore(company, userId, SESSIONS_STORE, 'readonly', (store, resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      resolve(Array.isArray(req.result) ? req.result : []);
    };
    req.onerror = () => reject(req.error || new Error('Failed to read sessions'));
  });
}

export function putSessionManager(company, userId, sessionManager) {
  return withStore(company, userId, SESSIONMANAGERS_STORE, 'readwrite', (store, resolve, reject) => {
    try {
      const req = store.put(sessionManager);
      req.onsuccess = () => {
        try { console.debug('offlineDb:putSessionManager success', (sessionManager && sessionManager.start) || null); } catch(e){}
        resolve();
      };
      req.onerror = (e) => {
        console.warn('offlineDb:putSessionManager failed', { company, userId, sessionManager, error: req.error || e });
        reject(req.error || new Error('Failed to write session manageer'));
      };
    } catch (e) {
      console.error('offlineDb:putSessionManager threw', { company, userId, sessionManager, error: e });
      reject(e);
    }
  });
}

export function putSession(company, userId, session) {
  return withStore(company, userId, SESSIONS_STORE, 'readwrite', (store, resolve, reject) => {
    try {
      const req = store.put(session);
      req.onsuccess = () => {
        try { console.debug('offlineDb:putSession success', (session && session.start) || null); } catch(e){}
        resolve();
      };
      req.onerror = (e) => {
        console.warn('offlineDb:putSession failed', { company, userId, session, error: req.error || e });
        reject(req.error || new Error('Failed to write session'));
      };
    } catch (e) {
      console.error('offlineDb:putSession threw', { company, userId, session, error: e });
      reject(e);
    }
  });
}

export function loadAllTables(company, userId) {
  return withStore(company, userId, TABLES_STORE, 'readonly', (store, resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      resolve(Array.isArray(req.result) ? req.result : []);
    };
    req.onerror = () => reject(req.error || new Error('Failed to read tables'));
  });
}

export function putTable(company, userId, table) {
  return withStore(company, userId, TABLES_STORE, 'readwrite', (store, resolve, reject) => {
    if (!table || table.i_d == null) {
      resolve();
      return;
    }
    try {
      const req = store.put(table);
      req.onsuccess = () => {
        try { console.debug('offlineDb:putTable success', table.i_d); } catch(e){}
        resolve();
      };
      req.onerror = (e) => {
        console.warn('offlineDb:putTable failed', { company, userId, table, error: req.error || e });
        reject(req.error || new Error('Failed to write table'));
      };
    } catch (e) {
      console.error('offlineDb:putTable threw', { company, userId, table, error: e });
      reject(e);
    }
  });
}

export function putInventoryTransactions(company, userId, transactions) {
  return withStore(
    company,
    userId,
    INVENTORY_TXN_STORE,
    'readwrite',
    (store, resolve, reject) => {
      try {
        transactions.forEach((txn) => {
          const id = txn.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          store.put({ ...txn, id });
        });
        resolve();
      } catch (e) {
        reject(e);
      }
    }
  );
}

export function loadAllInventoryTransactions(company, userId) {
  return withStore(
    company,
    userId,
    INVENTORY_TXN_STORE,
    'readonly',
    (store, resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(Array.isArray(req.result) ? req.result : []);
      };
      req.onerror = () => reject(req.error || new Error('Failed to read inventory transactions'));
    }
  );
}

// =============================
// Pending changes (offline queue)
// =============================

// change = {
//   id: string,                 // unique queue id
//   entityType: 'order' | 'session' | 'inventory',
//   op: 'create' | 'update' | 'delete',
//   clientId?: string,          // for locally created entities
//   serverId?: string,          // filled after first successful sync
//   payload: any,
//   createdAt: number,
// }

export async function queuePendingChange(company, userId, change) {
  try {
    const db = await openUserDb(company, userId);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PENDING_STORE, 'readwrite');
      const store = tx.objectStore(PENDING_STORE);
      const id = change.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const record = {
        id,
        createdAt: Date.now(),
        ...change,
      };
      const req = store.put(record);

      req.onsuccess = () => resolve(id);
      req.onerror = () => reject(req.error || new Error('Failed to queue pending change'));
    });
  } catch (e) {
    console.warn('offlineDb:queuePendingChange failed', e);
    return null;
  }
}

export async function loadPendingChanges(company, userId) {
  try {
    const db = await openUserDb(company, userId);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PENDING_STORE, 'readonly');
      const store = tx.objectStore(PENDING_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = Array.isArray(req.result) ? req.result : [];
        // sort oldest first
        list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        resolve(list);
      };
      req.onerror = () => reject(req.error || new Error('Failed to load pending changes'));
    });
  } catch (e) {
    console.warn('offlineDb:loadPendingChanges failed', e);
    return [];
  }
}

export async function markPendingChangeSynced(company, userId, id) {
  try {
    const db = await openUserDb(company, userId);
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PENDING_STORE, 'readwrite');
      const store = tx.objectStore(PENDING_STORE);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to delete pending change'));
    });
  } catch (e) {
    console.warn('offlineDb:markPendingChangeSynced failed', e);
  }
}
