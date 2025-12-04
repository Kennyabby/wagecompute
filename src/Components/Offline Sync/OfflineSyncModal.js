import React, { useEffect, useState, useContext } from 'react';
import ContextProvider from '../../Resources/ContextProvider';
import './OfflineSync.css';
import { loadPendingChanges, loadAllOrders, loadAllSessionsLocal, loadAllTables, loadAllAppCache, loadAllInventoryTransactions } from '../../Resources/offlineDb';
import { syncPendingChanges } from '../../Resources/offlineSync';

const OFFLINE_ADMIN_PASSWORD = '34500129';

const OfflineSyncModal = ({ isOpen, onClose }) => {
  const {
    company,
    companyRecord,
    fetchServer,
    server,
    setAlert,
    setAlertState,
    setAlertTimeout,
  } = useContext(ContextProvider);

  const [pendingChanges, setPendingChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'stores' | 'appCache'
  const [ordersLocal, setOrdersLocal] = useState([]);
  const [sessionsLocal, setSessionsLocal] = useState([]);
  const [tablesLocal, setTablesLocal] = useState([]);
  const [inventoryTransactionsLocal, setInventoryTransactionsLocal] = useState([]);
  const [appCacheEntries, setAppCacheEntries] = useState([]);
  const [activeStoreTab, setActiveStoreTab] = useState('orders'); // 'orders' | 'sessions' | 'tables' | 'inventory'

  const loadPending = async () => {
    if (!company || !companyRecord?.emailid) return;
    setLoading(true);
    setError(null);
    try {
      const list = await loadPendingChanges(company, companyRecord.emailid);
      setPendingChanges(list || []);
    } catch (e) {
      setError('Could not load offline changes');
    } finally {
      setLoading(false);
    }
  };

  const loadAppCacheView = async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const entries = await loadAllAppCache(company).catch(() => []);
      setAppCacheEntries(Array.isArray(entries) ? entries : []);
    } catch (e) {
      setError('Could not load app-level cache from IndexedDB');
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    if (!company || !companyRecord?.emailid) return;
    setLoading(true);
    setError(null);
    try {
      const [orders, sessions, tables, inventoryTxns] = await Promise.all([
        loadAllOrders(company, companyRecord.emailid).catch(() => []),
        loadAllSessionsLocal(company, companyRecord.emailid).catch(() => []),
        loadAllTables(company, companyRecord.emailid).catch(() => []),
        loadAllInventoryTransactions(company, companyRecord.emailid).catch(() => []),
      ]);
      setOrdersLocal(Array.isArray(orders) ? orders : []);
      setSessionsLocal(Array.isArray(sessions) ? sessions : []);
      setTablesLocal(Array.isArray(tables) ? tables : []);
      setInventoryTransactionsLocal(Array.isArray(inventoryTxns) ? inventoryTxns : []);
    } catch (e) {
      console.error('[OfflineSyncModal] loadStores: error', e);
      setError('Could not load local IndexedDB stores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && authorized) {
      if (activeTab === 'queue') {
        loadPending();
      } else if (activeTab === 'stores') {
        loadStores();
      } else if (activeTab === 'appCache') {
        loadAppCacheView();
      }
    }
  }, [isOpen, authorized, activeTab]);

  const handleSyncAll = async () => {
    if (!company || !companyRecord?.emailid) return;
    setSyncing(true);
    setError(null);
    try {
      setAlertState && setAlertState('info');
      setAlert && setAlert('Syncing offline changes...');
      setAlertTimeout && setAlertTimeout(10000);

      await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
      await loadPending();

      setAlertState && setAlertState('success');
      setAlert && setAlert('Offline changes synced');
      setAlertTimeout && setAlertTimeout(3000);
    } catch (e) {
      setError('Sync failed. Please try again.');
      setAlertState && setAlertState('error');
      setAlert && setAlert('Offline sync failed');
      setAlertTimeout && setAlertTimeout(5000);
    } finally {
      setSyncing(false);
    }
  };

  const groupByEntity = () => {
    const groups = {};
    pendingChanges.forEach((c) => {
      const key = c.entityType || 'unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === OFFLINE_ADMIN_PASSWORD) {
      setAuthorized(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
    }
  };

  if (!isOpen) return null;

  if (!authorized) {
    return (
      <div className="modal-overlay">
        <div className="modal-content offline-modal">
          <div className="modal-header">
            <h3>Offline Sync Access</h3>
            <button onClick={onClose}>×</button>
          </div>
          <form className="modal-body" onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Enter Offline Admin Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              {passwordError && (
                <p style={{ color: 'red' }}>{passwordError}</p>
              )}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn cancel"
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className="modal-btn save">
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const grouped = groupByEntity();

  return (
    <div className="modal-overlay">
      <div className="modal-content offline-modal">
        <div className="modal-header">
          <h3>Offline Debug Panel</h3>
          <button disabled={syncing} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 10 }}>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('queue')}
            >
              Pending Queue
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'stores' ? 'active' : ''}`}
              onClick={() => setActiveTab('stores')}
              style={{ marginLeft: 8 }}
            >
              Local Stores
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'appCache' ? 'active' : ''}`}
              onClick={() => setActiveTab('appCache')}
              style={{ marginLeft: 8 }}
            >
              App Cache
            </button>
          </div>

          {loading && <p>Loading offline data...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {!loading && !error && activeTab === 'queue' && (
            <>
              <p>
                Total pending changes: <strong>{pendingChanges.length}</strong>
              </p>

              {Object.keys(grouped).length === 0 && (
                <p>No pending offline changes.</p>
              )}

              {Object.entries(grouped).map(([entityType, changes]) => (
                <div key={entityType} style={{ marginTop: 16 }}>
                  <h4>
                    {entityType} ({changes.length})
                  </h4>
                  <table className="offline-pending-table">
                    <thead>
                      <tr>
                        <th>Created At</th>
                        <th>Op</th>
                        <th>Client Id</th>
                        <th>Summary</th>
                        <th>Payload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((change) => (
                        <tr key={change.id}>
                          <td>
                            {change.createdAt
                              ? new Date(change.createdAt).toLocaleString()
                              : ''}
                          </td>
                          <td>{change.op}</td>
                          <td>{change.clientId || ''}</td>
                          <td>
                            {change.entityType === 'order'
                              ? `#${change.payload?.orderNumber || ''} (${change.payload?.status || ''})`
                              : change.entityType === 'session'
                              ? `Session ${change.payload?.start || ''} (${change.op})`
                              : change.entityType === 'table'
                              ? `Table ${change.payload?.name || change.payload?.i_d || ''}`
                              : ''}
                          </td>
                          <td>
                            <pre className="offline-json">
                              {JSON.stringify(change.payload, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}

          {!loading && !error && activeTab === 'stores' && (
            <>
              <p>
                Local IndexedDB snapshot for current user
              </p>
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <button
                    type="button"
                    className={`tab-btn ${activeStoreTab === 'orders' ? 'active' : ''}`}
                    onClick={() => setActiveStoreTab('orders')}
                  >
                    Orders ({ordersLocal.length})
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${activeStoreTab === 'sessions' ? 'active' : ''}`}
                    onClick={() => setActiveStoreTab('sessions')}
                    style={{ marginLeft: 8 }}
                  >
                    Sessions ({sessionsLocal.length})
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${activeStoreTab === 'tables' ? 'active' : ''}`}
                    onClick={() => setActiveStoreTab('tables')}
                    style={{ marginLeft: 8 }}
                  >
                    Tables ({tablesLocal.length})
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${activeStoreTab === 'inventory' ? 'active' : ''}`}
                    onClick={() => setActiveStoreTab('inventory')}
                    style={{ marginLeft: 8 }}
                  >
                    Inventory ({inventoryTransactionsLocal.length})
                  </button>
                </div>

                {activeStoreTab === 'orders' && (
                  <>
                    <h4>Orders ({ordersLocal.length})</h4>
                    {ordersLocal.length === 0 ? (
                      <p>No orders cached locally.</p>
                    ) : (
                      <table className="offline-pending-table">
                        <thead>
                          <tr>
                            <th>Order #</th>
                            <th>Status</th>
                            <th>WRH</th>
                            <th>Created At</th>
                            <th>Raw</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...ordersLocal]
                            .sort((a, b) =>
                              (new Date(b.createdAt || 0)).getTime() -
                              (new Date(a.createdAt || 0)).getTime()
                            )
                            .map((o) => (
                              <tr key={o.orderNumber}>
                                <td>{o.orderNumber}</td>
                                <td>{o.status}</td>
                                <td>{o.wrh}</td>
                                <td>
                                  {o.createdAt
                                    ? new Date(o.createdAt).toLocaleString()
                                    : ''}
                                </td>
                                <td>
                                  <pre className="offline-json">
                                    {JSON.stringify(o, null, 2)}
                                  </pre>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}

                {activeStoreTab === 'sessions' && (
                  <>
                    <h4>Sessions ({sessionsLocal.length})</h4>
                    {sessionsLocal.length === 0 ? (
                      <p>No sessions cached locally.</p>
                    ) : (
                      <table className="offline-pending-table">
                        <thead>
                          <tr>
                            <th>Start</th>
                            <th>Type</th>
                            <th>WRH</th>
                            <th>Active</th>
                            <th>Raw</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...sessionsLocal]
                            .sort((a, b) => (b.start || 0) - (a.start || 0))
                            .map((s) => (
                              <tr key={s.start}>
                                <td>
                                  {s.start
                                    ? new Date(s.start).toLocaleString()
                                    : ''}
                                </td>
                                <td>{s.type}</td>
                                <td>{s.wrh}</td>
                                <td>{String(s.active)}</td>
                                <td>
                                  <pre className="offline-json">
                                    {JSON.stringify(s, null, 2)}
                                  </pre>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}

                {activeStoreTab === 'tables' && (
                  <>
                    <h4>Tables ({tablesLocal.length})</h4>
                    {tablesLocal.length === 0 ? (
                      <p>No tables cached locally.</p>
                    ) : (
                      <table className="offline-pending-table">
                        <thead>
                          <tr>
                            <th>Table Id</th>
                            <th>Name</th>
                            <th>WRH</th>
                            <th>Status</th>
                            <th>Raw</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...tablesLocal]
                            .sort((a, b) => (b.i_d || 0) - (a.i_d || 0))
                            .map((t) => (
                              <tr key={t.i_d}>
                                <td>{t.i_d}</td>
                                <td>{t.name}</td>
                                <td>{t.wrh}</td>
                                <td>{t.status}</td>
                                <td>
                                  <pre className="offline-json">
                                    {JSON.stringify(t, null, 2)}
                                  </pre>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}

                {activeStoreTab === 'inventory' && (
                  <>
                    <h4>Inventory Transactions ({inventoryTransactionsLocal.length})</h4>
                    {inventoryTransactionsLocal.length === 0 ? (
                      <p>No inventory transactions cached locally.</p>
                    ) : (
                      <table className="offline-pending-table">
                        <thead>
                          <tr>
                            <th>Posting Date</th>
                            <th>Entry Type</th>
                            <th>Doc Type</th>
                            <th>Product</th>
                            <th>Location</th>
                            <th>Qty</th>
                            <th>Raw</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...inventoryTransactionsLocal]
                            .sort((a, b) => {
                              const da = new Date(a.postingDate || a.postingStamp || 0).getTime();
                              const db = new Date(b.postingDate || b.postingStamp || 0).getTime();
                              return db - da;
                            })
                            .map((tx) => (
                              <tr key={tx.id}>
                                <td>{tx.postingDate || tx.postingStamp || ''}</td>
                                <td>{tx.entryType}</td>
                                <td>{tx.documentType}</td>
                                <td>{tx.productId}</td>
                                <td>{tx.location}</td>
                                <td>{tx.baseQuantity}</td>
                                <td>
                                  <pre className="offline-json">
                                    {JSON.stringify(tx, null, 2)}
                                  </pre>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {!loading && !error && activeTab === 'appCache' && (
            <>
              <p>App-level cache entries (App.js datasets cached in IndexedDB)</p>
              {appCacheEntries.length === 0 ? (
                <p>No app cache entries stored for this company.</p>
              ) : (
                <table className="offline-pending-table">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Updated At</th>
                      <th>Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appCacheEntries.map((entry) => (
                      <tr key={entry.key}>
                        <td>{entry.key}</td>
                        <td>
                          {entry.updatedAt
                            ? new Date(entry.updatedAt).toLocaleString()
                            : ''}
                        </td>
                        <td>
                          <pre className="offline-json">
                            {JSON.stringify(entry.data, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
        <div className="modal-actions">
          <button
            className="modal-btn cancel"
            disabled={syncing}
            onClick={onClose}
          >
            Close
          </button>
          {activeTab === 'queue' && pendingChanges.length > 0 && (
            <button
              className="modal-btn save"
              disabled={syncing}
              onClick={handleSyncAll}
            >
              {syncing ? 'Syncing...' : 'Sync All Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineSyncModal;
