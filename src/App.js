import { useEffect, useState, useCallback } from 'react';
import './App.css';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import ContextProvider from './Resources/ContextProvider';
import PauseView from './Components/PauseView/PauseView';
import LoadingPage from './Components/LoadingPage/LoadingPage';
import LandingPage from './Components/LandingPage/LandingPage';
import PricingPage from './Components/LandingPage/PricingPage';
import CommunityPage from './Components/LandingPage/CommunityPage';
import PaymentConfirmPage from './Components/LandingPage/PaymentConfirmPage';
import HelpPage from './Components/LandingPage/HelpPage';
import Login from './Components/Login/Login';
import Signup from './Components/Login/Signup';
import ForgotPassword from './Components/Login/ForgotPassword';
import DatabaseNotFound from './Components/LandingPage/DatabaseNotFound';
import LicenseExpired from './Components/LandingPage/LicenseExpired';
import Profile from './Components/Profile/Profile';
import Dashboard from './Components/Dashboard/Dashboard';
import DashView from './Components/DashView/DashView';
import FormPage from './Components/FormPage/FormPage';
import Notify from './Resources/Notify/Notify';
import AuthNotify from './Resources/Notify/AuthNotify';
import AboutPage from './Components/LandingPage/AboutPage';
import CareersPage from './Components/LandingPage/CareersPage';
import PartnersPage from './Components/LandingPage/PartnersPage';
import DocsPage from './Components/LandingPage/DocsPage';
import LegalPage from './Components/LandingPage/LegalPage';

import { read, utils, writeFileXLSX } from 'xlsx';
import { AnimatePresence, motion } from 'framer-motion';
import fetchServer from './Resources/ClientServerAPIConn/fetchServer'
import createSSE from './Resources/ClientServerAPIConn/sseClient'
import { syncPendingChanges } from './Resources/offlineSync';
import {
  getAppCache,
  setAppCache,
  clearAppCache,
  loadPosSnapshot,
  savePosSnapshot,
  queuePendingChange,
  loadPendingChanges,
  loadAllOrders,
  loadAllTables,
  loadAllSessionsLocal,
  putOrder,
  putTable,
  putSession,
} from './Resources/offlineDb';

const SERVER = "https://api.epxcentral.com"
// const SERVER = "http://localhost:3001"
// const SERVER = ""

const DEFAULT_APPROVAL_CONFIG = {
  name: 'approvalConfig',
  modules: {
    sales: {
      finalLevel: 1,
      type: 'rank',
      approverIds: {
        'emailid': { rank: 1, sections: ['all'] }
      },
    },
    accommodation: {
      finalLevel: 1,
      type: 'rank',
      approverIds: {
        'emailid': { rank: 1, sections: ['all'] }
      },
    },
    purchase: {
      finalLevel: 1,
      type: 'rank',
      approverIds: {
        'emailid': { rank: 1, sections: ['all'] }
      },
    },
    expense: {
      finalLevel: 1,
      type: 'rank',
      approverIds: {
        'emailid': { rank: 1, sections: ['all'] }
      },
    },
    attendance: {
      finalLevel: 0,
      type: 'rank',
      approverIds: {
        'emailid': { rank: 0, sections: ['all'] }
      },
    },
    inventory: {
      finalLevel: 1,
      type: 'rank',
      approverIds: {
        'emailid': { rank: 1, sections: ['all'] }
      },
    },
  },
};

// App-level cache helpers now backed by IndexedDB (appCache store)
const CACHE_TTL_MS = 1 * 60 * 1000; // 1 minute TTL

const makeCacheKey = (company, resource) => {
  const db = company || 'global';
  return `wc-cache:${db}:${resource}`;
};

// getCached returns a Promise resolving to cached data or null
const getCached = async (companyKey, resource, emailid) => {
  const rec = await getAppCache(companyKey, emailid, resource);
  if (!rec) return null;
  // if (!rec || !rec.updatedAt) return null;
  // const isFresh = Date.now() - rec.updatedAt < CACHE_TTL_MS;
  // return isFresh ? rec.data : null;
  return rec.data;
};

// Fire-and-forget writes; failures are logged inside offlineDb
const setCached = (companyKey, resource, data, emailid) => {
  setAppCache(companyKey, emailid, resource, data);
};

const clearCache = (companyKey, resource, emailid) => {
  clearAppCache(companyKey, emailid, resource);
};

const getCollectionItemKey = (item = {}) =>
  item?._id ||
  item?.i_d ||
  item?.orderNumber ||
  item?.start ||
  item?.emailid ||
  item?.name ||
  item?.no ||
  null;

const matchesSseFilter = (item = {}, filter = {}) => {
  if (!filter || typeof filter !== 'object') return false;
  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return true;
    }
    return String(item?.[key]) === String(value);
  });
};

const applySseCollectionChange = (existing = [], payload = {}) => {
  const current = Array.isArray(existing) ? existing : [];
  const op = payload?.op;
  const data = payload?.data;

  if (op === 'remove') {
    const filter = data?.filter || data || {};
    return current.filter((item) => !matchesSseFilter(item, filter));
  }

  if ((op === 'update' || op === 'updateMany') && Array.isArray(data) && data.length === 2 && !getCollectionItemKey(data[0])) {
    const [filter, patch] = data;
    return current.map((item) => (matchesSseFilter(item, filter) ? { ...item, ...patch } : item));
  }

  const incoming = Array.isArray(data) ? data : data ? [data] : [];
  const map = {};
  current.forEach((item) => {
    const key = getCollectionItemKey(item);
    if (key) map[key] = item;
  });
  incoming.forEach((item) => {
    const key = getCollectionItemKey(item);
    if (key) map[key] = item;
  });

  if (Object.keys(map).length > 0) {
    return Object.values(map);
  }

  return current;
};

const ACCOUNTING_UI_CACHE_VERSION = 5;

function App() {

  const [showLoading, setShowLoading] = useState(true)
  const [viewAccess, setViewAccess] = useState(null)
  const [pauseView, setPauseView] = useState(!window.localStorage.getItem('ps-vw'))
  const [showSubscriptionBanner, setShowSubscriptionBanner] = useState(false)
  const [saleNextFrom, setSaleNextFrom] = useState(null)
  const [saleFrom, setSaleFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0, 10))
  const [saleTo, setSaleTo] = useState(new Date(Date.now()).toISOString().slice(0, 10))

  const [isLive, setIsLive] = useState(false)
  const [liveErrorMessages, setLiveErrorMessages] = useState('Loading...')
  const [sessions, setSessions] = useState(null);
  const [tables, setTables] = useState([]);
  const [posOrders, setPosOrders] = useState([]);
  const [allPosOrders, setAllPosOrders] = useState([])
  const [deliverySessions, setDeliverySessions] = useState(null)
  const [salesSessions, setSalesSessions] = useState(null)
  const [allSalesSessions, setAllSalesSessions] = useState(null)
  const [allDeliverySessions, setAllDeliverySessions] = useState(null)
  const [lastActiveSessions, setLastActiveSessions] = useState([])
  const [sessionManagers, setSessionManagers] = useState([])

  const [approvals, setApprovals] = useState([])
  const [approvalStatus, setApprovalStatus] = useState(false)
  const [approvalMessage, setApprovalMessage] = useState('')
  const [curApproval, setCurApproval] = useState(null)
  const [showApprovalBox, setShowApprovalBox] = useState(false)

  const [paymentReceipts, setPaymentReceipts] = useState([])
  const [alert, setAlert] = useState('')
  const [alertState, setAlertState] = useState(null)
  const [alertTimeout, setAlertTimeout] = useState(100000)
  const [actionMessage, setActionMessage] = useState('')
  const [action, setAction] = useState('')
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(location.pathname);
  const [cancel, setCancel] = useState('')

  const [sessId, setSessID] = useState(null)
  const [companyRecord, setCompanyRecord] = useState(null)
  const [loginMessage, setLoginMessage] = useState('')
  const [profiles, setProfiles] = useState([])
  const [DBProfiles, setDBProfiles] = useState([])
  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])
  const [employees, setEmployees] = useState([])
  const [customers, setCustomers] = useState([])
  const [reloadCount, setReloadCount] = useState(0)
  const [settings, setSettings] = useState([])
  const [settingsLoadState, setSettingsLoadState] = useState({ loading: false, loaded: false, company: null })
  const [colSettings, setColSettings] = useState({})
  const [posSettings, setPosSettings] = useState({})
  const [paymentMethods, setPaymentMethods] = useState([])
  const [wrhs, setWrhs] = useState([])
  const [recoveryVal, setRecoveryVal] = useState(false)
  const [accommodationVal, setAccommodationVal] = useState(false)
  const [enableBlockVal, setEnableBlockVal] = useState(false)
  const [editAccess, setEditAccess] = useState({})
  const [posWrhAccess, setPosWrhAccess] = useState({})
  const [deliveryWrhAccess, setDeliveryWrhAccess] = useState({})
  const [allowBacklogs, setAllowBacklogs] = useState(false)
  const [changingSettings, setChangingSettings] = useState(false)

  const [chartOfAccounts, setChartOfAccounts] = useState([])
  const [chartOfAccountsLoadState, setChartOfAccountsLoadState] = useState({ loading: false, loaded: false, company: null })
  const [accountingLiveBalances, setAccountingLiveBalances] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [sales, setSales] = useState([])
  const [salesLoadCount, setSalesLoadCount] = useState(0)
  const [nextSales, setNextSales] = useState(null)
  const [allSessions, setAllSessions] = useState([])
  const [products, setProducts] = useState([])
  const [accommodations, setAccommodations] = useState([])
  const [purchase, setPurchase] = useState([])
  const [expenses, setExpenses] = useState([])
  const [rentals, setRentals] = useState([])
  const [company, setCompany] = useState(null)
  const [loadedCurPath, setLoadedCurPath] = useState('')
  const [loadingState, setLoadingState] = useState(true)
  const [path, setPath] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSSEConnected, setIsSSEConnected] = useState(false)
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false)
  const [isProduction, setIsProduction] = useState(false)
  const [subscriptionState, setSubscriptionState] = useState(null)
  
  const Navigate = useNavigate()
  
  const intervalPeriod = 3600000; // 60 minutes
  // Guarded fetchServer: when SSE is connected and initial sync done,
  // serve getDocsDetails requests from in-memory state/cache to avoid redundant network calls.
  const guardedFetchServer = async (method, body, endpoint, serverParam, signal) => {
    // Only intercept read calls when SSE is active and initial sync completed
    try {
      if (endpoint === 'getDocsDetails' && isSSEConnected && isInitialSyncDone) {
        const collRaw = body && (body.collection || body.collectionName || '')
        const coll = String(collRaw || '').trim();

        // mapping from server collection name -> { cacheKey, getter }
        const collectionMap = {
          // 'Orders': { cacheKey: 'posOrders', getter: () => posOrders },
          // 'POSSessions': { cacheKey: 'allSessions', getter: () => allSessions },
          'Products': { cacheKey: 'products', getter: () => products },
          'Sales': { cacheKey: 'sales', getter: () => sales },
          'Purchase': { cacheKey: 'purchase', getter: () => purchase },
          'Expenses': { cacheKey: 'expenses', getter: () => expenses },
          'Accommodations': { cacheKey: 'accommodations', getter: () => accommodations },
          'Tables': { cacheKey: 'tables', getter: () => tables },
        };

        // find mapping case-insensitively
        const mapKey = Object.keys(collectionMap).find(k => k.toLowerCase() === (coll || '').toLowerCase());
        if (mapKey) {
          try {
            const rec = collectionMap[mapKey].getter() || [];
            // if in-memory empty, try app cache
            if ((!rec || (Array.isArray(rec) && rec.length === 0)) && collectionMap[mapKey].cacheKey) {
              const cached = await getCached(company, collectionMap[mapKey].cacheKey, companyRecord?.emailid).catch(() => null);
              if (cached) return { err: false, record: cached };
            }
            return { err: false, record: rec };
          } catch (e) {/* fallthrough to cache/fetch */ }
        }

        // If no direct mapping, try several cache key variants (collection name variants)
        const candidates = [];
        if (coll) candidates.push(coll);
        const lower = coll.toLowerCase();
        if (lower && !candidates.includes(lower)) candidates.push(lower);
        const lcFirst = coll.charAt(0).toLowerCase() + coll.slice(1);
        if (lcFirst && !candidates.includes(lcFirst)) candidates.push(lcFirst);
        // common custom mappings
        if (coll.toLowerCase() === 'orders' && !candidates.includes('posOrders')) candidates.push('posOrders');

        for (const key of candidates) {
          try {
            const cached = await getCached(company, key, companyRecord?.emailid).catch(() => null);
            if (cached) return { err: false, record: cached };
          } catch (e) { }
        }
        // As a last-ditch, attempt to return an empty array rather than hitting the network for huge queries
        // return { err: false, record: [] };
        return await fetchServer(method, body, endpoint, serverParam, signal)
      }
    } catch (e) {
      console.warn('guardedFetchServer error', e)
    }
    // default: call original fetchServer
    return await fetchServer(method, body, endpoint, serverParam, signal)
  }

  const pathList = ['', 'login', 'profile', 'dashboard',
    'employees', 'departments', 'positions', 'attendance', 'payroll', 'pos', 'delivery', 'sales', 'inventory', 'assets', 'accommodations', 'purchase', 'expenses', 'reports', 'journals', 'settings', 'test']
  const dashList = ['dashboard',
    'employees', 'departments', 'positions', 'attendance', 'payroll', 'pos', 'delivery', 'sales', 'inventory', 'assets', 'accommodations', 'purchase', 'expenses', 'reports', 'journals', 'settings']
  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY',
    'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ]
  const monthDays = {
    'JANUARY': 31, 'FEBRUARY': 28, 'MARCH': 31, 'APRIL': 30, 'MAY': 31, 'JUNE': 30, 'JULY': 31,
    'AUGUST': 31, 'SEPTEMBER': 30, 'OCTOBER': 31, 'NOVEMBER': 30, 'DECEMBER': 31
  }
  const years = ['2040', '2039', '2038', '2037', '2036', '2035', '2034', '2033', '2032', '2031', '2030', '2029', '2028', '2027', '2026', '2025', '2024', '2023',
    '2022', '2021', '2020']

  const initialYear = '2025'


  const refreshSubscriptionState = async (seedStatus = null) => {
    if (seedStatus) {
      setSubscriptionState(seedStatus)
      if (seedStatus.isSuspended) {
        window.localStorage.removeItem('ps-vw')
      } else {
        window.localStorage.setItem('ps-vw', 'true')
      }
      setPauseView(false)
      setShowLoading(false)
      return seedStatus
    }

    const response = await fetchServer("POST", {
      prop: {}
    }, "getActivationDetails", SERVER)

    if (!response.err && response.currentStatus) {
      setSubscriptionState(response.currentStatus)
      if (response.currentStatus.isSuspended) {
        window.localStorage.removeItem('ps-vw')
      } else {
        window.localStorage.setItem('ps-vw', 'true')
      }
      setPauseView(false)
      setShowLoading(false)
      return response.currentStatus
    }

    return null
  }

  useEffect(() => {
    if (!company || !companyRecord?.emailid) return;

    const id = setInterval(() => {
      if (!(company && companyRecord?.emailid)) return;

      (async () => {
        try {
          const pending = await loadPendingChanges(company, companyRecord.emailid);
          if (!pending || !pending.length) {
            // Nothing to sync; skip to avoid noisy toasts
            return;
          }

          // const timeLabel = new Date().toLocaleTimeString();
          // setAlertState('info');
          // setAlert(`Offline Sync by Background sync started at ${timeLabel}`);
          // setAlertTimeout(5000);

          await syncPendingChanges(company, companyRecord.emailid, fetchServer, SERVER);

          // const doneLabel = new Date().toLocaleTimeString();
          // setAlertState('success');
          // setAlert(`Offline Sync by Background sync completed at ${doneLabel}`);
          // setAlertTimeout(5000);
        } catch (e) {
          // const failLabel = new Date().toLocaleTimeString();
          // setAlertState('error');
          // setAlert(`Offline Sync by Background sync failed at ${failLabel}`);
          // setAlertTimeout(5000);
        }
      })();
    }, 5 * 60 * 1000); // every 5 minutes

    return () => clearInterval(id);
  }, [company, companyRecord?.emailid]);

  useEffect(() => {
    // subscribe to server-sent events for realtime updates
    let es = null
    try {
      es = createSSE(SERVER, async (payload) => {
        // payload: { database, collection, op, data }
        if (!company || !companyRecord?.emailid || !payload || payload.database !== company) return;
        const coll = payload.collection
        try {
          switch (coll) {
            case 'Orders':
              // apply server-sent orders into IndexedDB with conflict-aware logic
              if (Array.isArray(payload.data)) {
                import('./Resources/offlineDb').then(async ({ putOrder, loadPendingChanges, markPendingChangeSynced }) => {
                  try {
                    const pending = await loadPendingChanges(company, companyRecord?.emailid).catch(() => []);
                    for (const o of payload.data) {
                      try {
                        const match = pending.find(p => p.entityType === 'order' && ((p.clientId && p.clientId === o.orderNumber) || (p.payload && p.payload.orderNumber === o.orderNumber)));
                        if (match) {
                          // If this was a local create that was synced, apply and remove pending
                          if (match.op === 'create') {
                            await putOrder(company, companyRecord?.emailid, o).catch(() => { });
                            // await markPendingChangeSynced(company, companyRecord?.emailid, match.id).catch(()=>{});
                          } else {
                            // skip applying server update when there is a pending local change
                            console.debug('SSE: skipping server order update due to pending local change', o.orderNumber)
                          }
                        } else {
                          await putOrder(company, companyRecord?.emailid, o).catch(() => { });
                        }
                      } catch (e) { console.warn('SSE: failed applying order', e) }
                    }

                    // update in-memory cache/state without doing a full server refresh
                    try {
                      const existing = Array.isArray(posOrders) ? [...posOrders] : [];
                      const map = {};
                      existing.forEach(co => { if (co && co.orderNumber) map[co.orderNumber] = co });
                      payload.data.forEach(o => { if (o && o.orderNumber) map[o.orderNumber] = o });
                      const merged = Object.values(map);
                      // setPosOrders(merged);
                      // setAllPosOrders(merged)
                      setCached(company, 'posOrders', merged, companyRecord?.emailid);
                    } catch (e) {/* ignore cache update failures */ }
                  } catch (e) {
                    console.error('SSE Orders apply error', e)
                  }
                })
              } else if (payload.data && typeof payload.data === 'object') {
                import('./Resources/offlineDb').then(async ({ putOrder, loadPendingChanges, markPendingChangeSynced }) => {
                  try {
                    const o = payload.data;
                    const pending = await loadPendingChanges(company, companyRecord?.emailid).catch(() => []);
                    const match = pending.find(p => p.entityType === 'order' && ((p.clientId && p.clientId === o.orderNumber) || (p.payload && p.payload.orderNumber === o.orderNumber)));
                    if (match) {
                      if (match.op === 'create') {
                        await putOrder(company, companyRecord?.emailid, o).catch(() => { });
                        // await markPendingChangeSynced(company, companyRecord?.emailid, match.id).catch(()=>{});
                      } else {
                        console.debug('SSE: skipping server order update due to pending local change', o.orderNumber)
                      }
                    } else {
                      await putOrder(company, companyRecord?.emailid, o).catch(() => { });
                    }

                    // update state/cache
                    try {
                      const existing = Array.isArray(posOrders) ? [...posOrders] : [];
                      const map = {};
                      existing.forEach(co => { if (co && co.orderNumber) map[co.orderNumber] = co });
                      if (o && o.orderNumber) map[o.orderNumber] = o;
                      const merged = Object.values(map);
                      // setPosOrders(merged);
                      // setAllPosOrders(merged)
                      setCached(company, 'posOrders', merged, companyRecord?.emailid);
                    } catch (e) { }
                  } catch (e) { console.error('SSE Orders apply error', e) }
                })
              }
              break;
            case 'POSSessions':
              // apply server-sent POS sessions into IndexedDB with conflict-aware logic
              if (Array.isArray(payload.data)) {
                import('./Resources/offlineDb').then(async ({ putSession, loadPendingChanges, markPendingChangeSynced }) => {
                  try {
                    const pending = await loadPendingChanges(company, companyRecord?.emailid).catch(() => []);
                    for (const s of payload.data) {
                      try {
                        const match = pending.find(p => p.entityType === 'session' && ((p.clientId && p.clientId === s.start) || (p.payload && p.payload.start === s.start)));
                        if (match) {
                          if (match.op === 'create') {
                            await putSession(company, companyRecord?.emailid, s).catch(() => { });
                            // await markPendingChangeSynced(company, companyRecord?.emailid, match.id).catch(()=>{});
                          } else {
                            console.debug('SSE: skipping server session update due to pending local change', s.start)
                          }
                        } else {
                          await putSession(company, companyRecord?.emailid, s).catch(() => { });
                        }
                      } catch (e) { console.warn('SSE: failed applying session', e) }
                    }

                    // merge into in-memory session caches (allSessions and sales/delivery subsets)
                    try {
                      const existing = Array.isArray(allSessions) ? [...allSessions] : [];
                      const map = {};
                      existing.forEach(ss => { if (ss && ss.start != null) map[ss.start] = ss });
                      payload.data.forEach(ss => { if (ss && ss.start != null) map[ss.start] = ss });
                      const merged = Object.values(map);
                      // setAllSessions(merged);
                      setCached(company, 'allSessions', merged, companyRecord?.emailid);

                      // derive sales/delivery session lists
                      const salesList = merged.filter(m => m.type === 'sales');
                      const deliveryList = merged.filter(m => m.type === 'delivery');
                      // setAllSalesSessions(salesList);
                      setSalesSessions(salesList.filter(s => s.employee_id === companyRecord?.emailid));
                      setDeliverySessions(deliveryList);
                    } catch (e) { }
                  } catch (e) {
                    console.error('SSE POSSessions apply error', e)
                  }
                })
              } else if (payload.data && typeof payload.data === 'object') {
                import('./Resources/offlineDb').then(async ({ putSession, loadPendingChanges, markPendingChangeSynced }) => {
                  try {
                    const s = payload.data;
                    const pending = await loadPendingChanges(company, companyRecord?.emailid).catch(() => []);
                    const match = pending.find(p => p.entityType === 'session' && ((p.clientId && p.clientId === s.start) || (p.payload && p.payload.start === s.start)));
                    if (match) {
                      if (match.op === 'create') {
                        await putSession(company, companyRecord?.emailid, s).catch(() => { });
                        // await markPendingChangeSynced(company, companyRecord?.emailid, match.id).catch(()=>{});
                      } else {
                        console.debug('SSE: skipping server session update due to pending local change', s.start)
                      }
                    } else {
                      await putSession(company, companyRecord?.emailid, s).catch(() => { });
                    }

                    try {
                      const existing = Array.isArray(allSessions) ? [...allSessions] : [];
                      const map = {};
                      existing.forEach(ss => { if (ss && ss.start != null) map[ss.start] = ss });
                      if (s && s.start != null) map[s.start] = s;
                      const merged = Object.values(map);
                      // setAllSessions(merged);
                      setCached(company, 'allSessions', merged, companyRecord?.emailid);
                    } catch (e) { }
                  } catch (e) { console.error('SSE POSSessions apply error', e) }
                })
              }
              break;
            case 'Products':
              try {
                setProducts((prev) => {
                  const merged = applySseCollectionChange(prev, payload);
                  setCached(company, 'products', merged, companyRecord?.emailid);
                  return merged;
                });
              } catch (e) {
                console.error('SSE Products apply error', e);
                setReloadCount(c => c + 1)
              }
              break;
            case 'Sales':
              try {
                setSales((prev) => {
                  const merged = applySseCollectionChange(prev, payload);
                  setCached(company, 'sales', merged, companyRecord?.emailid);
                  return merged;
                });
              } catch (e) {
                console.error('SSE Sales apply error', e);
                setReloadCount(c => c + 1)
              }
              break;
            case 'Purchase':
              try {
                setPurchase((prev) => {
                  const merged = applySseCollectionChange(prev, payload);
                  setCached(company, 'purchase', merged, companyRecord?.emailid);
                  return merged;
                });
              } catch (e) {
                console.error('SSE Purchase apply error', e);
                setReloadCount(c => c + 1)
              }
              break;
            case 'Expenses':
              try {
                setExpenses((prev) => {
                  const merged = applySseCollectionChange(prev, payload);
                  setCached(company, 'expenses', merged, companyRecord?.emailid);
                  return merged;
                });
              } catch (e) {
                console.error('SSE Expenses apply error', e);
                setReloadCount(c => c + 1)
              }
              break;
            case 'Accommodations':
              try {
                setAccommodations((prev) => {
                  const merged = applySseCollectionChange(prev, payload);
                  setCached(company, 'accommodations', merged, companyRecord?.emailid);
                  return merged;
                });
              } catch (e) {
                console.error('SSE Accommodations apply error', e);
                setReloadCount(c => c + 1)
              }
              break;
            case 'Rentals':
              try {
                setRentals((prev) => {
                  const merged = applySseCollectionChange(prev, payload);
                  setCached(company, 'rentals', merged, companyRecord?.emailid);
                  return merged;
                });
              } catch (e) {
                console.error('SSE Rentals apply error', e);
                setReloadCount(c => c + 1)
              }
              break;
            case 'Attendance':
              try {
                setAttendance((prev) => {
                  const merged = applySseCollectionChange(prev, payload);
                  setCached(company, 'attendance', merged, companyRecord?.emailid);
                  return merged;
                });
              } catch (e) {
                console.error('SSE Attendance apply error', e);
                setReloadCount(c => c + 1)
              }
              break;
            case 'Settings':
              try {
                setSettings((prev) => {
                  const merged = applySseCollectionChange(prev, payload);
                  setCached(company, 'settings', merged, companyRecord?.emailid);
                  return merged;
                });
              } catch (e) {
                console.error('SSE Settings apply error', e);
                setReloadCount(c => c + 1)
              }
              break;
            case 'ChartOfAccounts':
              try {
                setChartOfAccounts((prev) => {
                  const merged = applySseCollectionChange(prev, payload);
                  setCached(company, 'chartOfAccounts', merged, companyRecord?.emailid);
                  return merged;
                });
              } catch (e) {
                console.error('SSE ChartOfAccounts apply error', e);
                setReloadCount(c => c + 1)
              }
              break;
            case 'Approvals':
              try {
                setApprovals((prev) => {
                  const merged = applySseCollectionChange(prev, payload);
                  setCached(company, 'approvals', merged, companyRecord?.emailid);
                  return merged;
                });
              } catch (e) {
                console.error('SSE Approvals apply error', e);
                setReloadCount(c => c + 1)
              }
              break;
            case 'AccountingLiveBalances':
              try {
                const liveSnapshot = payload.data || null;
                setAccountingLiveBalances(liveSnapshot);
                setCached(company, 'accountingLiveBalances', liveSnapshot, companyRecord?.emailid);
                if (liveSnapshot?.fromDate && liveSnapshot?.toDate) {
                  const liveSnapshotKey = `journal-snapshot-v${ACCOUNTING_UI_CACHE_VERSION}-${liveSnapshot.fromDate}-${liveSnapshot.toDate}`;
                  setCached(company, liveSnapshotKey, {
                    balances: liveSnapshot.balances || {},
                    reports: liveSnapshot.reports || {},
                  }, companyRecord?.emailid);
                }
                window.dispatchEvent(new CustomEvent('wc:accounting-live-update', {
                  detail: {
                    company,
                    snapshot: liveSnapshot,
                  }
                }));
              } catch (e) {
                console.error('SSE AccountingLiveBalances apply error', e);
              }
              break;
            case 'AccountingSummaries':
              try {
                const summaryDoc = payload.data || null;
                const scopedFilters = summaryDoc?.filters?.filters || summaryDoc?.filters || {};
                const hasScopedFilters = Object.keys(scopedFilters || {}).some((key) => (
                  !['fromDate', 'toDate'].includes(key) &&
                  scopedFilters[key] !== undefined &&
                  scopedFilters[key] !== null &&
                  scopedFilters[key] !== ''
                ));
                if (summaryDoc?.fromDate && summaryDoc?.toDate && !hasScopedFilters) {
                  const summaryKey = `journal-snapshot-v${ACCOUNTING_UI_CACHE_VERSION}-${summaryDoc.fromDate}-${summaryDoc.toDate}`;
                  setCached(company, summaryKey, {
                    balances: summaryDoc.balances || {},
                    reports: summaryDoc.reports || {},
                  }, companyRecord?.emailid);
                  window.dispatchEvent(new CustomEvent('wc:accounting-live-update', {
                    detail: {
                      company,
                      snapshot: summaryDoc,
                    }
                  }));
                }
              } catch (e) {
                console.error('SSE AccountingSummaries apply error', e);
              }
              break;
            case 'DashboardSummaries':
              try {
                const summaryDoc = payload.data || null;
                if (summaryDoc?.summaryKey) {
                  setCached(company, `dashboard-summary-${summaryDoc.summaryKey}`, summaryDoc.snapshot || {}, companyRecord?.emailid);
                }
                window.dispatchEvent(new CustomEvent('wc:dashboard-summary-update', {
                  detail: {
                    company,
                    summary: summaryDoc,
                  }
                }));
              } catch (e) {
                console.error('SSE DashboardSummaries apply error', e);
              }
              break;
            case 'SubscriptionStatus':
              try {
                const nextStatus = payload.data || null;
                if (nextStatus) {
                  setSubscriptionState(nextStatus);
                  if (nextStatus.isSuspended) {
                    window.localStorage.removeItem('ps-vw');
                    const currentPath = window.location.pathname || '';
                    if (!currentPath.endsWith('/settings')) {
                      Navigate('/settings');
                    }
                  } else {
                    window.localStorage.setItem('ps-vw', 'true');
                  }
                  setPauseView(false);
                }
              } catch (e) {
                console.error('SSE SubscriptionStatus apply error', e);
              }
              break;
            case 'InventoryTransactions':
              // apply inventory transactions into IndexedDB with conflict-aware logic
              if (Array.isArray(payload.data)) {
                import('./Resources/offlineDb').then(async ({ putInventoryTransactions, loadPendingChanges }) => {
                  try {
                    const pending = await loadPendingChanges(company, companyRecord?.emailid).catch(() => []);
                    const pendingInvIds = new Set(pending.filter(p => p.entityType === 'inventory' && (p.clientId || p.payload?.id)).map(p => p.clientId || p.payload?.id).filter(Boolean));
                    const toApply = payload.data.filter(txn => {
                      const id = txn.id || txn._id || txn.i_d;
                      return !(id && pendingInvIds.has(id));
                    });
                    if (toApply.length) {
                      await putInventoryTransactions(company, companyRecord?.emailid, toApply).catch(() => { });
                    }
                  } catch (e) { console.error('SSE InventoryTransactions apply error', e) }
                  // recompute lightweight stock view (best-effort)
                  try {
                    if (products) {
                      getProductsWithStock(company, products)
                    }
                  } catch (e) { }
                })
              } else if (payload.data && typeof payload.data === 'object') {
                import('./Resources/offlineDb').then(async ({ putInventoryTransactions, loadPendingChanges }) => {
                  try {
                    const txn = payload.data;
                    const pending = await loadPendingChanges(company, companyRecord?.emailid).catch(() => []);
                    const pendingInvIds = new Set(pending.filter(p => p.entityType === 'inventory' && (p.clientId || p.payload?.id)).map(p => p.clientId || p.payload?.id).filter(Boolean));
                    const id = txn.id || txn._id || txn.i_d;
                    if (!id || !pendingInvIds.has(id)) {
                      await putInventoryTransactions(company, companyRecord?.emailid, [txn]).catch(() => { });
                    }
                  } catch (e) { console.error('SSE InventoryTransactions apply error', e) }
                  try {
                    if (products) {
                      getProductsWithStock(company, products)
                    }
                  } catch (e) { }
                })
              }
              break;
            default:
              // fallback: trigger a reload count so dependent hooks refresh
              setReloadCount((c) => c + 1)
          }
        } catch (e) {
          console.error('SSE handler error', e)
        }
      }, (err) => {
        console.warn('SSE error', err)
        setIsSSEConnected(false)
      })
      if (es) {
        es.onopen = () => { setIsSSEConnected(true) }
      }
    } catch (e) {
      console.warn('Could not create SSE', e)
    }
    return () => { if (es) { try { es.close() } catch (e) { } setIsSSEConnected(false) } }
  }, [company, companyRecord])

  useEffect(() => {    
    getViewAccess()
    var cmp_val = window.localStorage.getItem('sessn-cmp')    
    if (cmp_val){
      getSettings(cmp_val, companyRecord)
      getChartOfAccounts(cmp_val, companyRecord)
      const intervalId = setInterval(() => {
        if (cmp_val && companyRecord?.emailid) {
          getSettings(cmp_val)
          getChartOfAccounts(cmp_val)
        }
      }, intervalPeriod)
      return () => clearInterval(intervalId);
    }
  }, [window.localStorage.getItem('sessn-cmp')])

  useEffect(() => {
    if (settings?.length && window.localStorage.getItem('sessn-id')) {
      const updateThisUserState = async () => {
        if (companyRecord?.status !== 'admin') {
          var sid = window.localStorage.getItem('sessn-id')
          const resp = await fetchServer("POST", {
            sessionId: sid
          }, "getUserProfileDetails", SERVER)
          if (![null, undefined].includes(resp.record)) {
            setCompanyRecord(resp.record)
            setRecoveryVal(resp.record.enableDebtRecovery)
            setEnableBlockVal(!resp.record.enableLogin)
            setAllowBacklogs(resp.record.permissions?.includes('allowBacklogs') ||
              resp.record.permissions?.includes('all')
            )
            setEditAccess((editAccess) => {
              return {
                ...editAccess,
                employees: (resp.record.permissions?.includes('edit_employees') || resp.record.permissions?.includes('all'))
              }
            })
          }
        }
      }

      updateThisUserState()
      const colSetFilt = settings.filter((setting) => {
        return setting.name === 'import_columns'
      })
      delete colSetFilt[0]?._id
      setColSettings(colSetFilt[0] ? colSetFilt[0] : {})

      const posSetFilt = settings.filter((setting) => {
        return setting.name === 'posSettings'
      })
      delete posSetFilt[0]?._id
      setPosSettings(posSetFilt[0] ? posSetFilt[0] : {})

      const paySetFilt = settings.filter((setting) => {
        return setting.name === 'paymentMethods'
      })
      delete paySetFilt[0]?._id
      setPaymentMethods(paySetFilt[0]?.name ? [...paySetFilt[0].paymentMethods] : [])

      const wrhSetFilt = settings.filter((setting) => {
        return setting.name === 'warehouses'
      })
      delete wrhSetFilt[0]?._id
      setWrhs(wrhSetFilt[0]?.name ? [...wrhSetFilt[0].warehouses] : [])
    }
  }, [settings, changingSettings, window.localStorage.getItem('sessn-id')])

  useEffect(() => {
    if (wrhs.length && companyRecord?.emailid) {
      let wrhsPosObj = {}
      let wrhsDeliveryObj = {}
      wrhs.forEach((wrh) => {
        if (!wrh.purchase) {
          wrhsPosObj[wrh.name] = (companyRecord.permissions.includes(`pos_${wrh.name}`) || companyRecord.permissions.includes('all'))
          wrhsDeliveryObj[wrh.name] = (companyRecord.permissions.includes(`delivery_${wrh.name}`) || companyRecord.permissions.includes('all'))
        }
      })
      // console.log('WRH ACCESS OBJ', wrhsPosObj, wrhsDeliveryObj)
      setPosWrhAccess((posWrhAccess) => {
        return { ...posWrhAccess, ...wrhsPosObj }
      })
      setDeliveryWrhAccess((deliveryWrhAccess) => {
        return {
          ...deliveryWrhAccess,
          ...wrhsDeliveryObj
        }
      })
    }
  }, [companyRecord, wrhs])

  // On First Mount: hydrate quickly, subscribe to SSE (above), flush local pending changes, then fetch authoritative data
  useEffect(() => {
    if (company && companyRecord?.emailid && loadedCurPath && window.location.pathname !== '/payment/confirm') {
      (async () => {
        try {
          // quick hydrate from cached getters so UI shows something fast
          try {
            getEmployees(company)
            getApprovals(company)
            mergeAndPersistSessions()
            mergeAndPersistOrders()
            getProducts(company)
            getChartOfAccounts(company)
          } catch (e) { }

          setIsHydrated(true)

          // Now fetch authoritative datasets (retain original ordering/logic)
          try {
            if (companyRecord.status === 'admin') {
              window.localStorage.removeItem('lgt-vw')
              const targetPath = '/' + loadedCurPath;
              if (window.location.pathname !== targetPath) {
                Navigate(targetPath + window.location.search);
              }
              getEmployees(company)
              getAccommodations(company)
              getSales(company)
              getPosOrders({ company: company, companyRecord: companyRecord })
              fetchProfiles(company)
              getDepartments(company)
              getPositions(company)
              getCustomers(company)
              fetchTables(company)
              getLastActiveSessions(company, companyRecord)
              fetchSessions(company, "sales", companyRecord)
              fetchSessions(company, "delivery", companyRecord)
              fetchSessionManagers(company, companyRecord)
              fetchAllSessions({ company: company, companyRecord: companyRecord })
              getRentals(company)
              getPurchase(company)
              getExpenses(company)
              getAttendance(company)
              setTimeout(() => { setLoadedCurPath('') }, 500);
            }
          } catch (e) { console.warn('Initial authoritative fetch failed', e) }

          // Flush pending local changes after routing so offline sync cannot hold
          // users on the login screen.
          try {
            await syncPendingChanges(company, companyRecord?.emailid, fetchServer, SERVER)
          } catch (e) {
            console.warn('Initial syncPendingChanges failed', e)
          }

          setIsInitialSyncDone(true)
        } catch (e) {
          console.error('Initial mount sequence failed', e)
        }
      })()
    }
  }, [company, companyRecord, loadedCurPath])

  useEffect(() => {
    if (companyRecord?.status !== 'admin' && window.location.pathname !== '/payment/confirm') {
      if (enableBlockVal) {
        logout()
      } else {
        if (!reloadCount) {
          const hasDeliveryAccess = companyRecord?.permissions.includes('delivery')
          const hasPosAccess = companyRecord?.permissions.includes('pos')
          const hasEmployeeAccess = companyRecord?.permissions.includes('employees')
          const hasSalesAccess = companyRecord?.permissions.includes('sales')
          const hasAccomAccess = companyRecord?.permissions.includes('accommodations')
          const hasAttendanceAccess = companyRecord?.permissions.includes('attendance')
          const hasPurchaseAccess = companyRecord?.permissions.includes('purchase')
          const hasExpensesAccess = companyRecord?.permissions.includes('expenses')
          const hasInventoryAccess = companyRecord?.permissions.includes('inventory')
          const hasAssetsAccess = companyRecord?.permissions.includes('assets')
          if (companyRecord?.permissions.includes('employees')) {
            getEmployees(company)
            getDepartments(company)
            getPositions(company)
            window.localStorage.removeItem('lgt-vw')
            if (window.location.pathname !== '/employees') Navigate('/employees' + window.location.search)
          }
          if (companyRecord?.permissions.includes('attendance')) {
            getAttendance(company)
            window.localStorage.removeItem('lgt-vw')
            if (window.location.pathname !== '/attendance') Navigate('/attendance' + window.location.search)
          }
          if (companyRecord?.permissions.includes('purchase')) {
            getPurchase(company)
            window.localStorage.removeItem('lgt-vw')
            if (window.location.pathname !== '/purchase') Navigate('/purchase' + window.location.search)
          }
          if (companyRecord?.permissions.includes('expenses')) {
            getExpenses(company)
            window.localStorage.removeItem('lgt-vw')
            if (window.location.pathname !== '/expenses') Navigate('/expenses' + window.location.search)
          }
          if (companyRecord?.permissions.includes('inventory') ||
            companyRecord?.permissions.includes('pos') ||
            companyRecord?.permissions.includes('delivery')
          ) {
            getProducts(company)
            if (window.location.pathname !== '/inventory') Navigate('/inventory' + window.location.search)
          }
          if (hasAssetsAccess && !hasInventoryAccess && !hasPosAccess && !hasDeliveryAccess) {
            window.localStorage.removeItem('lgt-vw')
            if (window.location.pathname !== '/assets') Navigate('/assets' + window.location.search)
          }
          if (companyRecord?.permissions.includes('delivery')) {
            if (companyRecord?.permissions.includes('access_delivery_sessions')) {
              fetchAllSessions({ company, companyRecord })
              getPosOrders({ company: company, companyRecord: companyRecord })
              getLastActiveSessions(company, companyRecord)
              fetchSessionManagers(company, companyRecord)
            }
            fetchProfiles(company)
            fetchSessions(company, "delivery", companyRecord)
            fetchTables(company)
            if (window.location.pathname !== '/delivery') Navigate('/delivery' + window.location.search)
          }
          if (companyRecord?.permissions.includes('pos')) {
            if (companyRecord?.permissions.includes('access_pos_sessions')) {
              fetchAllSessions({ company, companyRecord })
              getPosOrders({ company: company, companyRecord: companyRecord })
              getLastActiveSessions(company, companyRecord)
              fetchSessionManagers(company, companyRecord)
            }
            if (!hasDeliveryAccess) {
              fetchProfiles(company)
              fetchTables(company)
            }
            fetchSessions(company, "sales", companyRecord)
            if (window.location.pathname !== '/pos') Navigate('/pos' + window.location.search)
          }
          if (companyRecord?.permissions.includes('accommodations')) {
            getCustomers(company)
            getAccommodations(company)
            if (window.location.pathname !== '/accommodations') Navigate('/accommodations' + window.location.search)
          }
          if (companyRecord?.permissions.includes('sales')) {
            if (!hasAccomAccess) {
              getAccommodations(company)
            }
            getSales(company)
            getRentals(company)
            if (!hasDeliveryAccess && !hasPosAccess) {
              fetchAllSessions({ company, companyRecord })
            }
            if (!hasPosAccess) {
              fetchSessions(company, "sales", companyRecord)
            } if (!hasDeliveryAccess) {
              fetchSessions(company, "delivery", companyRecord)
            }
            // getSales(company, 'first', saleFrom, saleTo, 10)
            window.localStorage.removeItem('lgt-vw')
            if (window.location.pathname !== '/sales') Navigate('/sales' + window.location.search)
          }
        }
      }
    }
  }, [enableBlockVal, reloadCount, companyRecord, company])

  useEffect(() => {
    obtainPaymentReceipts()
  }, [posOrders, sales, accommodations, allSessions])

  useEffect(() => {
    if (pauseView) {
      if (companyRecord && viewAccess === '405') {
        logout()
      }
    }
  }, [pauseView, companyRecord, viewAccess])

  useEffect(() => {
    setPauseView(!window.localStorage.getItem('ps-vw'))
  }, [window.localStorage.getItem('ps-vw')])

  const logout = async () => {
    try {
      const resps = await fetchServer("POST", {
        record: companyRecord
      }, "closeSession", SERVER)
      if (resps.err) {
        console.log(resps.mess)
      }
    } catch (error) {
      console.warn('Remote session close failed; clearing local session.', error)
    } finally {
      removeSessions()
      if (!pauseView) {
        window.localStorage.setItem('lgt-mess', 'Login Access Denied. Please Request For Access!')
      }
      Navigate('/login')
    }
  }

  const getSessionEnd = (sessionStart) => {
    const curPosSetting = posSettings?.posSettings?.find((sett) => {
      return sett.active
    })
    // configured Sessions
    let curClosingHour = Number(curPosSetting?.sessHour || 0)
    // 11am sessions 
    let fromDate = new Date('12/12/2025')
    let toDate = new Date('2/2/2026')
    fromDate.setHours(8, 0, 0, 0);
    toDate.setHours(11, 0, 0, 0);
    const fromDateTime = fromDate.getTime()
    const toDateTime = toDate.getTime()
    if (fromDateTime <= sessionStart && sessionStart <= toDateTime) {
      curClosingHour = 11
    }
    // previous 8am Sessions
    if (sessionStart < fromDateTime) {
      curClosingHour = 8
    }
    const closingHour = curClosingHour
    const sessionStartDate = new Date(sessionStart);
    const sessionEndDate = new Date(sessionStartDate);

    // Set the session end time to 8am of the same day
    sessionEndDate.setHours(closingHour, 0, 0, 0);

    // If the session started after 8am, set the end time to 8am of the next day
    if (sessionStartDate.getTime() >= sessionEndDate.getTime()) {
      sessionEndDate.setDate(sessionStartDate.getDate() + 1);
    }

    return sessionEndDate.getTime();
  };

  const getSessionStart = (timestamp) => {
    const curPosSetting = posSettings?.posSettings?.find((sett) => {
      return sett.active
    })

    // configured Sessions
    let curClosingHour = Number(curPosSetting?.sessHour || 0)
    // 11am sessions 
    let fromDate = new Date('12/12/2025')
    let toDate = new Date('2/2/2026')
    fromDate.setHours(8, 0, 0, 0);
    toDate.setHours(11, 0, 0, 0);
    const fromDateTime = fromDate.getTime()
    const toDateTime = toDate.getTime()
    if (fromDateTime <= timestamp && timestamp <= toDateTime) {
      curClosingHour = 11
    }
    // previous 8am Sessions
    if (timestamp < fromDateTime) {
      curClosingHour = 8
    }
    const closingHour = curClosingHour
    const date = new Date(timestamp);

    // Candidate session start at 11:00 AM same day
    const sessionStart = new Date(date);
    sessionStart.setHours(closingHour, 0, 0, 0);

    // If timestamp is BEFORE today's 11am,
    // then the session started at 11am the PREVIOUS day
    if (date.getTime() < sessionStart.getTime()) {
      sessionStart.setDate(sessionStart.getDate() - 1);
    }

    return sessionStart.getTime();
  };

  const getPendingSalesDates = (sales)=>{
      const pendingDates = []
      const salesDates = sales.map((sale)=>{return getDate(sale.postingDate)})
      const now = new Date()
      const today = new Date(now)
      const currDay = today.getDate()
      for (let i=0; i<=sales.length; i++){
          let today = new Date(now)
          const dateDay = today.setDate(currDay - (i+1))
          const dayCheck = salesDates.find((salesDate)=>{return getDate(dateDay) === salesDate})
          if (!dayCheck){
              pendingDates.push(getDate(dateDay))
          }else{
              break
          }
      }
      return pendingDates
  }

  const shuffleList = (array) => {
    var currentIndex = array.length,
      randomIndex,
      temporaryValue
    while (0 !== currentIndex) {
      var randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1
      temporaryValue = array[currentIndex]
      array[currentIndex] = array[randomIndex]
      array[randomIndex] = temporaryValue
    }
    return array
  }

  const generateCode = (length) => {
    let number = '0123456789987654321001234567899876543210'
    if (length && length <= number.length) {
      var list = number.split('')
      var shuffledList = shuffleList(list)
      const code = shuffledList.slice(0, length).join('')
      return code
    } else {
      return null
    }
  }

  const removeComma = (value) => {
    let numberValue = value
    if (value) {
      numberValue = parseInt(value.replace(/,/g, ''), 10);
    }
    return numberValue
  }

  const generateSeries = (pre, array, id) => {

    let max = 0
    array.forEach((obj => {
      let idVal = Number(obj[id].slice(pre.split('').length,))
      if (idVal > max) {
        max = idVal
      }
    }))
    let numPart = max + 1;
    let newNumber = pre + numPart.toString().padStart(5, "0");

    return newNumber;

  }

  const getEmployeeName = (employeeId) => {
    const emp = employees?.find((employee) => {
      return employeeId === employee.i_d
    })
    if (emp) {
      return `${emp.firstName} ${emp.lastName}`
    } else {
      return 'Default'
    }
  }

  const getApprovalConfig = (module, section, approverId) => {
    const respConfig = {
      isApprover: false
    }

    const approvalDoc = settings?.find((setting) => setting?.name === 'approvalConfig')
    const moduleApprovers = approvalDoc?.modules || DEFAULT_APPROVAL_CONFIG.modules
    const moduleApproval = moduleApprovers[module]
    const canApprove = ![null, undefined].includes(moduleApproval?.approverIds?.[approverId])
    if (canApprove) {
      const approverSections = moduleApproval?.approverIds?.[approverId].sections
      if (approverSections.includes('all') || approverSections.includes(section)) {
        respConfig.isApprover = true
        const approvalType = moduleApproval.type
        const finalLevel = moduleApproval.finalLevel
        const approverLevel = moduleApproval.approverIds?.[approverId][approvalType]
        respConfig.approverLevel = approverLevel
        respConfig.finalLevel = finalLevel
      }
    }

    return respConfig
  }

  const postApprovalUpdate = async (company, module, section, curApproval) => {
    const { isApprover, approverLevel, finalLevel } = getApprovalConfig(module, section, companyRecord?.emailid)
    if (isApprover) {
      let sectionApprovers = []
      if (Array.isArray(curApproval?.approvers)) {
        sectionApprovers = sectionApprovers.concat(curApproval.approvers)
      }
      if (sectionApprovers.length <= approverLevel) {
        setAlertState('info')
        setAlert('Updating Approval...')
        setAlertTimeout(100000)

        const updatedSectionApprovers = sectionApprovers.concat(companyRecord?.emailid)
        const approvalState = {
          approvers: (approvalStatus ? updatedSectionApprovers : sectionApprovers),
          approved: (finalLevel === approverLevel ? approvalStatus : false),
          message: approvalMessage,
          createdAt: curApproval.createdAt,
          lastUpdatedBy: companyRecord?.emailid
        }
        if (approvalStatus) {
          approvalState.approvedBy = companyRecord?.emailid
        }
        const resp = await updateApproval(company, module, section, {
          ...approvalState
        })
        if (resp.completed) {
          getApprovals(company, companyRecord)
          setAlertState('success')
          setAlert('Approval Updated!')
          setAlertTimeout(1000)
          setApprovalStatus(false)
          setApprovalMessage('')
          setShowApprovalBox(false)
          setCurApproval({
            ...curApproval,
            ...approvalState
          })
        } else {
          setAlertState('error')
          setAlert(resp.mess)
          setAlertTimeout(5000)
          setApprovalStatus(false)
          setApprovalMessage('')
        }
      } else {
        setAlertState('error')
        setAlert((finalLevel === approverLevel || sectionApprovers.length < approverLevel) ? 'Verification is Pending. Awaiting Approval Verification!' : 'Verification already done!')
        setAlertTimeout(5000)
      }
    } else {
      setAlertState('error')
      setAlert('You Have No Approval Permissions For This Section!')
      setAlertTimeout(5000)
    }
  }

  const runApprovalWorkFlow = async (postingDate, curApproval, module, section, data, runApproval, link) => {
    const { isApprover, approverLevel, finalLevel } = getApprovalConfig(module, section, companyRecord?.emailid)
    const canPostWithoutApproval = isApprover
    const executePostAction = async () => {
      await runApproval()
      if (curApproval?.createdAt) {
        removeApproval(company, module, section, {
          createdAt: curApproval.createdAt,
          postingDate: curApproval.postingDate
        })
      }
      return true
    }

    const executeApprovalAction = async (previous) => {
      if (canPostWithoutApproval) {
        await executePostAction()
        return true
      } else {
        setAlertState('info')
        setAlert('Sending Approval Request...')
        setAlertTimeout(100000)
        const approvalData = {
          data: data,
          createdAt: previous?.createdAt ? previous.createdAt : new Date().getTime(),
          postingDate: postingDate,
          isApproval: true,
          handlerId: companyRecord?.emailid,
          messages: previous?.createdAt ? [
            ...(Array.isArray(previous.messages) ? previous.messages : []),
            { message: previous.message, createdAt: new Date().getTime() }
          ] : []
        }
        if (link) {
          approvalData.link = link
        }
        const resp = await requestApproval(company, module, section, approvalData)
        if (resp.completed) {
          if (previous?.createdAt) {
            removeApproval(company, module, section, {
              createdAt: previous.createdAt,
              postingDate: previous.postingDate
            })
          }
          setAlertState('success')
          setAlert('Approval Request Sent Successfully!')
          setAlertTimeout(1000)
          getApprovals(company, companyRecord)
          setCurApproval(approvalData)
          return true
        } else {
          setAlertState('error')
          setAlert(resp.mess)
          setAlertTimeout(5000)
          return true
        }
      }
    }

    if (![null, undefined].includes(curApproval)) {
      if (curApproval.approved) {
        executePostAction()
        return true
      } else {
        if (!curApproval.message) {
          if (canPostWithoutApproval) {
            setShowApprovalBox(true)
          } else {
            setAlertState('info')
            setAlert('Already sent for approval. Please wait for response!')
            setAlertTimeout(5000)
            return true
          }
        } else {
          executeApprovalAction(curApproval)
          return true
        }
      }
    } else {
      executeApprovalAction()
      return true
    }
  }

  const requestApproval = async (company, module, section, data) => {
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Approvals",
      update: {
        ...data,
        module: module,
        section: section
      }
    }, "createDoc", SERVER)
    if (!resp.err) {
      const adminEmail = companyRecord?.email || companyRecord?.companyEmail || companyRecord?.contactEmail || ''
      if (adminEmail) {
        fetchServer("POST", {
          details: {
            to: adminEmail,
            subject: `Approval request: ${module} / ${section}`,
            type: 'html',
            message: `<p>A new approval request has been submitted in ${company}.</p><p><b>Module:</b> ${module}</p><p><b>Section:</b> ${section}</p><p><b>Requested by:</b> ${companyRecord?.emailid || ''}</p>`
          }
        }, "mailUser", SERVER).catch(() => { })
      }
      return { completed: resp.isDelivered, mess: resp.mess }
    } else {
      return { completed: false, mess: resp.mess }
    }
  }

  const getApprovals = async (company) => {
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Approvals",
      prop: {}
    }, "getDocsDetails", SERVER)
    if (Array.isArray(resp.record)) {
      setApprovals(resp.record)
    }
  }

  const updateApproval = async (company, module, section, update) => {
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Approvals",
      prop: [{ module: module, section: section, createdAt: update.createdAt }, { ...update }]
    }, "updateOneDoc", SERVER)
    if (!resp.err) {
      return { completed: resp.updated, mess: resp.mess }
    } else {
      return { completed: false, mess: resp.mess }
    }
  }

  const removeApproval = async (company, module, section, update) => {
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Approvals",
      update: {
        module: module,
        section: section,
        createdAt: update.createdAt,
        postingDate: update.postingDate
      }
    }, "removeDoc", SERVER)
    if (!resp.err) {
      getApprovals(company)
      return { completed: resp.isRemoved, mess: resp.mess }
    } else {
      return { completed: false, mess: resp.mess }
    }
  }

  const exportFile = useCallback((data, fileName) => {
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Data");
    writeFileXLSX(wb, `${fileName}.xlsx`);
  }, []);

  const importFile = async ({ event, fields, pivot, start }) => {
    return new Promise((resolve, reject) => {
      const file = event.target.files[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      const reader = new FileReader();

      const columns = Object.keys(fields);

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = read(data, { type: "array" });

          const sheetNames = workbook.SheetNames;
          const firstSheetName = sheetNames[pivot];
          const worksheet = workbook.Sheets[firstSheetName];

          const jsonData = utils.sheet_to_json(worksheet, { header: 1 });

          const knownColumnName = columns[0]; // First column name as reference
          let headerRowIndex = null;

          // Find the header row
          for (let i = 0; i < jsonData.length; i++) {
            if (jsonData[i].includes(knownColumnName)) {
              headerRowIndex = i;
              break;
            }
          }

          let headerfound = true
          if (headerRowIndex === null) {
            headerfound = false
            headerRowIndex = 0
          }

          // Extract headers and rows starting from the header row
          const headers = jsonData[headerRowIndex];
          columns.forEach((column) => {
            fields[column] = "";
          });
          let startIndex = headerRowIndex + 2
          let rows = jsonData.slice(headerRowIndex + 1);
          if (start && start > (headerRowIndex + 2)) {
            rows = jsonData.slice(start - 1)
            startIndex = start
          }
          // Map rows to objects
          const result = rows.map((row) => {
            let obj = {};
            row.forEach((cell, index) => {
              obj[headers[index]] = cell;
            });
            return obj;
          });

          resolve({
            headerfound,
            headers,
            startIndex,
            sheetNames,
            result,
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };


  const storePath = (path) => {
    setPath(path)
    window.localStorage.setItem('curr-path', path)
  }

  const getLastActiveSessions = async (company, companyRecord) =>{
    if (company && companyRecord?.emailid){
      const sessionDays = 7 * 24 * 60 * 60 * 1000
      const allowedFromDays = Date.now() - sessionDays
      const lastSessionStart = getSessionStart(allowedFromDays)
      const sessionsResponse = await fetchServer("POST", {
        database: company,
        collection: "POSSessions",
        prop: {start: { $gte: lastSessionStart }}
      }, "getDocsDetails", SERVER);

      if (!sessionsResponse.err){
        if (Array.isArray(sessionsResponse?.record) && sessionsResponse.record?.length){
          mergeAndPersistSessions(sessionsResponse.record)
          setLastActiveSessions(sessionsResponse?.record)          
        }
      } else {
        if (sessionsResponse.mess !== 'Request aborted') {
          console.log(sessionsResponse.mess)
          setIsLive(false)
          setLiveErrorMessages('Slow Network. Check Connection')      
        }
      }
    }
  }

  const fetchSessionManagers = async (company, companyRecord) => {
    // console.log('fetching sessions for',type)
    if (company && companyRecord?.emailid) {
      const sessionDays = 2 * 24 * 60 * 60 * 1000
      const allowedFromDays = Date.now() - sessionDays
      const sessionsResponse = await fetchServer("POST", {
        database: company,
        collection: "SessionManagers",
        prop: {start: { $gte: allowedFromDays }}
      }, "getDocsDetails", SERVER);

      if (!sessionsResponse.err) {
        if (Array.isArray(sessionsResponse.record) && sessionsResponse.record?.length){
          setSessionManagers(sessionsResponse.record)
        }
      } else {
        if (sessionsResponse.mess !== 'Request aborted') {
          console.log(sessionsResponse.mess)
          setIsLive(false)
          setLiveErrorMessages('Slow Network. Check Connection')
        }
      }
    }
  }

  const fetchSessionsByRange = async (company, companyRecord, dateRange) => {
    // console.log('fetching sessions for',type)
    if (company && companyRecord?.emailid) {
      const {start, end} = dateRange
      const startDate = new Date(start).getTime()
      const endDate = new Date(end).getTime()
      const sessionStart = getSessionStart(startDate)
      const sessionEnd = getSessionEnd(endDate)
      const sessionsResponse = await fetchServer("POST", {
        database: company,
        collection: "POSSessions",
        prop: {start: { $gte: sessionStart, $lte: sessionEnd }}
      }, "getDocsDetails", SERVER);

      if (!sessionsResponse.err) {
        if (Array.isArray(sessionsResponse.record) && sessionsResponse.record?.length){
          mergeAndPersistSessions(sessionsResponse.record)
        }
      } else {
        if (sessionsResponse.mess !== 'Request aborted') {
          console.log(sessionsResponse.mess)
          setIsLive(false)
          setLiveErrorMessages('Slow Network. Check Connection')
        }
      }
    }
  }
  
  const fetchOrdersByRange = async (company, companyRecord, dateRange) => {
    // console.log('fetching sessions for',type)
    if (company && companyRecord?.emailid) {
      const {start, end} = dateRange
      const startDate = new Date(start).getTime()
      const endDate = new Date(end).getTime()
      const sessionStart = getSessionStart(startDate)
      const sessionEnd = getSessionEnd(endDate)
      const ordersResponse = await fetchServer("POST", {
        database: company,
        collection: "Orders",
        prop: {createdAt: { $gte: sessionStart, $lte: sessionEnd }}
      }, "getDocsDetails", SERVER);

      if (!ordersResponse.err) {
        if (Array.isArray(ordersResponse.record) && ordersResponse.record?.length){
          mergeAndPersistOrders(ordersResponse.record)
        }
      } else {
        if (ordersResponse.mess !== 'Request aborted') {
          console.log(ordersResponse.mess)
          setIsLive(false)
          setLiveErrorMessages('Slow Network. Check Connection')
        }
      }
    }
  }



  const fetchSessions = async (company, type, companyRecord) => {
    // console.log('fetching sessions for',type)
    if (company && companyRecord?.emailid) {
      const sessionsResponse = await fetchServer("POST", {
        database: company,
        collection: "POSSessions",
        prop: { type: type, employee_id: companyRecord.emailid }
      }, "getDocsDetails", SERVER);

      if (!sessionsResponse.err) {
        // console.log('no errors occured')
        if (sessionsResponse.mess) {
          setIsLive(false)
          // setLiveErrorMessages(sessionsResponse.mess)
        } else if (Array.isArray(sessionsResponse.record)) {
          // console.log('sessions fetched successfully')
          const thisSessions = sessionsResponse.record
          // setSessions(thisSessions)
          // console.log('setting the sessions for', type)
          // console.log('for',type,':', thisSessions)
          if (type === 'sales') {
            setSalesSessions(thisSessions)
            setCached(company, 'salesSessions', thisSessions, companyRecord?.emailid)

          }
          if (type === 'delivery') {
            setDeliverySessions(thisSessions)
            // console.log('line 854, on Mount:',thisSessions.find(session=>session.active))
            setCached(company, 'deliverySessions', thisSessions, companyRecord?.emailid)
          }

          // Mirror all sessions into IndexedDB sessions store for Offline Debug Panel
          try {
            if (company && companyRecord?.emailid && Array.isArray(sessionsResponse.record)) {
              for (const s of sessionsResponse.record) {
                if (s && s.start != null) {
                  await putSession(company, companyRecord.emailid, s);
                }
              }
            }
          } catch (e) {
            console.warn('fetchSessions: putSession failed', e);
          }
        }
      } else {
        if (sessionsResponse.mess !== 'Request aborted') {
          console.log(sessionsResponse.mess)          
          setIsLive(false)
          setLiveErrorMessages('Slow Network. Check Connection')
        }
      }
    }
  }

  // Fetch POS and delivery sessions
  const fetchAllSessions = async ({ company, setState, companyRecord }) => {
    if (!company || !companyRecord) return;
    try {
      if (company && companyRecord?.emailid) {
        // const cachedAllSalesSession = await getCached(company, 'allSalesSessions', companyRecord?.emailid)
        // const cachedAllDeliverySession = await getCached(company, 'allDeliverySessions', companyRecord?.emailid)             
        // if (cachedAllSalesSession){
        //   setAllSalesSessions(cachedAllSalesSession)
        // }
        // if (cachedAllDeliverySession){
        //   setAllDeliverySessions(cachedAllDeliverySession)
        // }
      }

      const sessionDays = 30 * 24 * 60 * 60 * 1000
      const allowedFromDays = Date.now() - sessionDays

      const { resp, resp1, sessionsResponse } = await Promise.all([
        await fetchServer("POST", {
          database: company,
          collection: "POSSessions",
          prop: {
            type: 'delivery',
            start: { $gte: allowedFromDays }
          }
        }, "getDocsDetails", SERVER),

        await fetchServer("POST", {
          database: company,
          collection: "POSSessions",
          prop: {
            type: 'sales',
            start: { $gte: allowedFromDays }
          }
        }, "getDocsDetails", SERVER),

        await getAllSessions(company)
      ])

      if (resp?.record && Array.isArray(resp.record)) {
        // console.log('fetched deliveries', resp.record)
        // setAllDeliverySessions(resp.record)
        // setCached(company, 'allDeliverySessions', resp.record, companyRecord?.emailid)                            
        // for (const s of resp.record) {
        //   await putSession(company, companyRecord?.emailid, s).catch(()=>{});
        // }
        mergeAndPersistSessions(resp.record)
      }

      if (resp1?.record && Array.isArray(resp1.record)) {
        // console.log('fetched sales', resp1.record)
        // setAllSalesSessions(resp1.record)
        // setAllSessions(resp1.record)            
        // setCached(company, 'allSalesSessions', resp1.record, companyRecord?.emailid)                           
        // for (const s of resp1.record) {
        //   await putSession(company, companyRecord?.emailid, s).catch(()=>{});
        // }
        mergeAndPersistSessions(resp1.record)
      }

      if (Array.isArray(sessionsResponse)) {
        // Sort all sessions by start time (newest first)
        const allSessions = sessionsResponse.sort((a, b) => new Date(b.start) - new Date(a.start));

        // Get and sort sales sessions (newest first)
        const salesSessions = allSessions
          .filter(s => s.type === 'sales')
          .sort((a, b) => new Date(b.start) - new Date(a.start));

        // Get and sort delivery sessions (newest first)
        const deliverySessions = allSessions
          .filter(s => s.type === 'delivery')
          .sort((a, b) => new Date(b.start) - new Date(a.start));

        // Get active sales sessions
        const activeSessions = salesSessions.filter(s => s.active);

        // Get last active sessions by location (most recent per location)
        const lastActiveByLocation = [];
        const locationMap = new Map();

        salesSessions.forEach(session => {
          if (session.wrh && !locationMap.has(session.wrh)) {
            locationMap.set(session.wrh, session);
            lastActiveByLocation.push(session);
          }
        });

        // Get 5 most recent delivery sessions
        const lastDeliverySessions = deliverySessions.slice(0, 5);
        setAllSessions(allSessions)

        if (setState !== null) {
          setState({
            activeSessions,
            lastActiveSessions: lastActiveByLocation,
            lastDeliverySessions
          });
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchTables = async (company) => {
    const tablesResponse = await fetchServer("POST", {
      database: company,
      collection: "Tables"
    }, "getDocsDetails", SERVER);
    if (!tablesResponse.err) {
      if (!tablesResponse.mess) {
        setTables(tablesResponse.record)

        // Mirror tables into IndexedDB tables store for Offline Debug Panel
        try {
          if (company && companyRecord?.emailid && Array.isArray(tablesResponse.record)) {
            for (const t of tablesResponse.record) {
              if (t && t.i_d != null) {
                await putTable(company, companyRecord.emailid, t);
              }
            }
          }
        } catch (e) {
          console.warn('fetchTables: putTable failed', e);
        }
      }
    } else {
      if (tablesResponse.mess !== 'Request aborted') {
        setIsLive(false)
        setLiveErrorMessages('Slow Network. Check Connection')
      }
    }
  }

  const removeSessions = (path) => {
    window.localStorage.removeItem('sess-recg-id')
    window.localStorage.removeItem('idt-curr-usr')
    window.localStorage.removeItem('sessn-id')
    window.localStorage.removeItem('curr-path')
    window.localStorage.removeItem('slvw')
    window.localStorage.removeItem('sldtl')
    window.localStorage.removeItem('sessn-cmp')
    window.localStorage.removeItem('pos-wrh')
    setSessID(null)
    setCompanyRecord(null)
    setCompany(null)
    setLoadedCurPath('')
    const isPublicPath = ['/', '/payment/confirm', '/login', '/signup', '/forgot-password', '/pricing'].includes(window.location.pathname);
    if (!isPublicPath) Navigate('/login')
  }

  const loadPage = async (propVal, currPath) => {
    // Removed destructive Navigate('/') that was stripping paths on refresh
    var cmp_val = window.localStorage.getItem('sessn-cmp')
    setCompany(cmp_val)
    const resp = await fetchServer("POST", {
      sessionId: propVal
    }, "getUserProfileDetails", SERVER)
    if ([null, undefined].includes(resp.record)) {
      removeSessions()
    } else {
      window.localStorage.setItem('lgt-vw', 'user')
      setCompanyRecord(resp.record)
      setAllowBacklogs(resp.record?.permissions?.includes('allowBacklogs') ||
        resp.record?.permissions?.includes('all')
      )     
      if (resp.record?.status !== 'admin') {
        setEditAccess((editAccess) => {
          return {
            ...editAccess,
            employees: resp.record?.permissions?.includes('edit_employees')
          }
        })
        setRecoveryVal(resp.record?.enableDebtRecovery)
        setEnableBlockVal(!resp.record?.enableLogin)
      }
      setLoadedCurPath(currPath)
      const targetPath = '/' + (currPath || 'dashboard');
      if (
        currPath &&
        window.location.pathname !== targetPath &&
        window.location.pathname !== '/payment/confirm'
      ) {
        Navigate(targetPath + window.location.search);
      }
    }
  }

  const getViewAccess = async () => {
    if (!window.localStorage.getItem('acc-vw')) {
      const resps = await fetchServer("POST", {
        prop: {}
      }, "getActivationDetails", SERVER)

      if (resps.isProduction !== undefined) {
        setIsProduction(resps.isProduction)
      }

      if (resps.err) {
        if (resps.status === 404 || resps.mess === "Invalid Tenant") {
          setShowLoading(false)
          setPauseView(false)          
          Navigate('/database-not-found')
        } else {
          setShowLoading(false)
          setViewAccess('405')
        }
      } else {
        if (resps.currentStatus) {
          setSubscriptionState(resps.currentStatus)
        }
        const workspaceSuspended = !!(resps.currentStatus?.isSuspended || !resps.isActive)
        const isConfirming = window.location.pathname === '/payment/confirm'

        if (workspaceSuspended && !isConfirming) {
          window.localStorage.removeItem('ps-vw')
          setViewAccess(false)
          setShowLoading(false)
          setPauseView(false)
          if (window.location.pathname !== '/license-expired') {
            Navigate('/license-expired')
          }
        } else if (!resps.mess) {
          setViewAccess(!resps.isActive)
          window.localStorage.setItem('ps-vw', 'true')
          setShowLoading(false)
          setPauseView(false)
        } else {
          setPauseView(false)
          setViewAccess(false)
          setShowLoading(false)
        }
      }
    } else {
      setShowLoading(false)
      setPauseView(false)
    }
  }

  const obtainPaymentReceipts = async () => {
    if (company && companyRecord?.emailid) {
      const cached = await getCached(company, 'paymentReceipts', companyRecord?.emailid)
      if (cached) {
        setPaymentReceipts(cached)
      }
      const paymentPoints = paymentMethods.map((method) => method.name)
      const recoveryReceipts = []
      const accommodationReceipts = []
      const posOrderReceipts = []
      const dateBoundary = new Date('2025-07-01').toISOString().slice(0, 10)

      let paymentReceipts = []
      if (sales.length) {
        sales?.forEach((sale) => {
          (sale.recoveryList || []).forEach((recovery) => {
            if (paymentPoints.includes(recovery.recoveryPoint)) {
              let dateVar = new Date(recovery.recoveryDate).toISOString().slice(0, 10)
              if (dateVar >= dateBoundary) {
                recoveryReceipts.push({
                  paymentModule: 'recovery',
                  paymentPoint: recovery.recoveryPoint,
                  paymentAmount: Number(recovery.recoveryAmount),
                  paymentReceipt: Number(recovery.recoveryReceipt) || recovery.recoveryReceipt,
                  paymentFor: `For ${sale.postingDate} Debt`,
                  paymentDate: recovery.recoveryDate,
                  paymentHandler: recovery.recoveryEmployeeId,
                  paymentModuleRef: sale.createdAt,
                  paymentApprover: 'Default'
                })
              }
            }
          })
        })
      }
      if (accommodations.length) {
        accommodations?.forEach((acc) => {
          let dateVar = new Date(acc.postingDate).toISOString().slice(0, 10)
          if (paymentPoints.includes(acc.payPoint)) {
            if (dateVar >= dateBoundary) {
              accommodationReceipts.push({
                paymentModule: 'accommodation',
                paymentPoint: acc.payPoint,
                paymentAmount: Number(acc.paymentAmount),
                paymentReceipt: Number(acc.paymentReceipt) || acc.paymentReceipt,
                paymentFor: `For Room ${acc.roomNo}`,
                paymentDate: acc.postingDate,
                paymentHandler: acc.employeeId,
                paymentModuleRef: acc.createdAt,
                paymentApprover: 'Default'
              })
            }
          }
        })
      }

      if (allPosOrders.length && allSessions.length) {
        allPosOrders?.forEach((order) => {
          if (order.salesPosts && order.status !== 'cancelled') {
            Object.keys(order.salesPosts).forEach((payPoint) => {
              if (paymentPoints.includes(payPoint)) {
                // if (!order.createdAt){
                //   console.log(order, order.createdAt)
                // }
                let dateVar = order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : dateBoundary
                if (dateVar >= dateBoundary) {
                  const location = order.salesPosts[payPoint]
                  const receiptNo = (payPoint === 'cash') ? 'cash' : order.receipts[payPoint]
                  const amount = Number(order[payPoint])
                  const session = allSessions?.find(session => (session.start === order.sessionId))
                  const sessionApprover = session?.endedby || 'Active Session'
                  posOrderReceipts.push({
                    paymentModule: `POS Order-${location}`,
                    paymentPoint: payPoint,
                    paymentAmount: amount,
                    paymentReceipt: Number(receiptNo) || receiptNo,
                    paymentFor: `(${location})-${order.orderNumber} Ordered from ${order.wrh}`,
                    paymentTable: order.tableId,
                    paymentOrder: order.orderNumber,
                    paymentDate: dateVar,
                    paymentHandler: order.handlerId,
                    paymentModuleRef: order.createdAt,
                    paymentApprover: sessionApprover
                  })
                }
              }
            })
          }
        })
      }

      paymentReceipts = [
        ...recoveryReceipts,
        ...accommodationReceipts,
        ...posOrderReceipts
      ]
      setPaymentReceipts(paymentReceipts)
      setCached(company, 'paymentReceipts', paymentReceipts, companyRecord?.emailid)
    }
  }

  const fetchProfiles = async (company) => {
    if (company && companyRecord?.emailid) {
      const cached = await getCached(company, 'profiles', companyRecord?.emailid);
      if (cached && Array.isArray(cached)) {
        setProfiles(cached);
      }
      const resps = await fetchServer("POST", {
        database: company,
        collection: "Profile",
        prop: { 'verified': true }
      }, "getDocsDetails", SERVER)
      if (resps.err) {
        console.log(resps.mess)
      } else if (Array.isArray(resps.record)) {
        setProfiles(resps.record)
        setCached(company, 'profiles', resps.record, companyRecord?.emailid)
      }
    }
  }

  const fetchDBProfiles = async (company) => {
    if (company && companyRecord?.emailid) {
      const cached = await getCached(company, 'dbProfiles', companyRecord?.emailid);
      if (cached && Array.isArray(cached)) {
        setDBProfiles(cached);
      }
      const resps = await fetchServer("POST", {
        prop: { 'db': company }
      }, "fetchDBProfiles", SERVER)
      if (resps.err) {
        console.log(resps.mess)
      } else if (Array.isArray(resps.record)) {
        setDBProfiles(resps.record)
        setCached(company, 'dbProfiles', resps.record, companyRecord?.emailid)
      }
    }
  }

  const getChartOfAccounts = async (company) => {
    if (company && companyRecord?.emailid) {
      setChartOfAccountsLoadState({ loading: true, loaded: false, company })
      try {
        const cached = await getCached(company, 'chartOfAccounts', companyRecord?.emailid);
        if (cached && Array.isArray(cached)) {
          setChartOfAccounts(cached);
          setChartOfAccountsLoadState({ loading: true, loaded: true, company })
        }
        const resp = await fetchServer("POST", {
          database: company,
          collection: "ChartOfAccounts",
          prop: {}
        }, "getDocsDetails", SERVER)
        if (Array.isArray(resp.record)) {
          setChartOfAccounts(resp.record)
          setCached(company, 'chartOfAccounts', resp.record, companyRecord?.emailid)
        }
      } finally {
        setChartOfAccountsLoadState({ loading: false, loaded: true, company })
      }
    }
  };

  const mergeAndPersistOrders = async (orders) => {
    try {
      const pending = await loadPendingChanges(company, companyRecord.emailid);
      const pendingOrders = pending.filter(c => c.entityType === 'order').map(c => c.payload).filter(Boolean);
      const pendingOrderNums = new Set(pendingOrders.map(o => o.orderNumber));

      const localOrders = await loadAllOrders(company, companyRecord.emailid).catch(() => []);
      const localMap = {};
      for (const l of localOrders) if (l && l.orderNumber) localMap[l.orderNumber] = l;

      const serverOrders = orders ? orders : [];
      const map = {};
      // start with server
      for (const s of serverOrders) if (s && s.orderNumber) map[s.orderNumber] = s;
      // override with local stored orders (but not pending creates which are authoritative)
      for (const [k, v] of Object.entries(localMap)) {
        if (!pendingOrderNums.has(k)) map[k] = map[k] || v;
      }
      // finally apply pending orders (create/update) to override server
      for (const p of pendingOrders) if (p && p.orderNumber) map[p.orderNumber] = p;

      const merged = Object.values(map);
      setPosOrders(merged);
      setAllPosOrders(merged)
      // persist server orders to IndexedDB except those that are pending locally
      for (const o of serverOrders) {
        if (o && o.orderNumber != null && !pendingOrderNums.has(o.orderNumber)) {
          await putOrder(company, companyRecord.emailid, o);
        }
      }
    } catch (e) {
      console.warn('POS Orders: mergeAndPersist failed', e);
      if (orders?.length) {
        setPosOrders(orders);
        setAllPosOrders(orders)
      }
    }
  };

  const mergeAndPersistSessions = async (sessions) => {
    if (!company || !companyRecord?.emailid) return
    try {
      const pending = await loadPendingChanges(company, companyRecord.emailid);
      const pendingSessions = pending.filter(c => c.entityType === 'session').map(c => c.payload).filter(Boolean);
      const pendingSessionNums = new Set(pendingSessions.map(o => o.orderNumber));

      const localSessions = await loadAllSessionsLocal(company, companyRecord.emailid).catch(() => []);
      const localMap = {};
      for (const l of localSessions) if (l && l.start) localMap[l.start] = l;

      const serverSessions = sessions || [];
      const map = {};
      // start with server
      for (const s of serverSessions) if (s && s.start) map[s.start] = s;
      // override with local stored orders (but not pending creates which are authoritative)
      for (const [k, v] of Object.entries(localMap)) {
        if (!pendingSessionNums.has(k)) map[k] = map[k] || v;
      }
      // finally apply pending orders (create/update) to override server
      for (const p of pendingSessions) if (p && p.start) map[p.start] = p;

      const merged = Object.values(map);
      setAllSessions(merged);
      setAllSalesSessions(merged.filter(sess => sess.type === 'sales'))
      setAllDeliverySessions(merged.filter(sess => sess.type === 'delivery'))
      // persist server orders to IndexedDB except those that are pending locally
      for (const o of serverSessions) {
        if (o && o.start != null && !pendingSessionNums.has(o.start)) {
          await putSession(company, companyRecord.emailid, o);
        }
      }
    } catch (e) {
      console.warn('POS Sessions: mergeAndPersist failed', e);
      if (sessions.length) {
        setAllSessions(sessions);
        setAllSalesSessions(sessions.filter(sess => sess.type === 'sales'))
        setAllDeliverySessions(sessions.filter(sess => sess.type === 'delivery'))
      }
    }
  };

  const getAllSessions = async (company) => {
    if (!company || !companyRecord?.emailid) return [];

    try {
      // Check cache first
      // const cached = await getCached(company, 'allSessions', companyRecord?.emailid);
      // if (cached && Array.isArray(cached)) {
      //   setAllSessions(cached);
      // }

      const totalDays = 35;       // total lookback period
      const batchDays = 7;        // fetch 7 days per batch
      const now = Date.now();
      const startDate = now - totalDays * 24 * 60 * 60 * 1000;

      // Generate all batch ranges
      const batches = [];
      for (let from = startDate; from < now; from += batchDays * 24 * 60 * 60 * 1000) {
        const to = Math.min(from + batchDays * 24 * 60 * 60 * 1000, now);
        batches.push({ from, to });
      }

      // Fetch all batches in parallel
      const results = []
      const batchPromises = batches.map(({ from, to }) =>
        fetchServer("POST", {
          database: company,
          collection: "POSSessions",
          prop: { start: { $gte: from, $lt: to } }
        }, "getDocsDetails", SERVER)
          .then(async (resp) => {
            if (resp.record && Array.isArray(resp.record)) {
              results.push(resp.record)
              mergeAndPersistSessions(results)
              return (
                resp.record
              )
            }
            else if (resp.err || resp.mess) {
              mergeAndPersistSessions(results)
              return []
            }
            else {
              return []
            }

          })
          .catch(e => {
            console.error(`Batch fetch failed [${new Date(from).toISOString()} - ${new Date(to).toISOString()}]`, e);
            return [];
          })
      );

      // Wait for all batch fetches to complete
      const batchResults = await Promise.all(batchPromises);

      // Flatten into a single array
      let allSessions = batchResults.flat();

      // Safety check
      if (allSessions.length > 1000000) {
        console.warn("⚠️ getAllSessions: too many records, truncating to 1,000,000");
        allSessions = allSessions.slice(0, 1000000);
      }

      // Save to state and cache
      if (allSessions.length) {
        mergeAndPersistSessions(allSessions)
        // setAllSessions(allSessions);
        // setCached(company, 'allSessions', allSessions, companyRecord?.emailid);
        // for (const s of allSessions) {
        //   await putSession(company, companyRecord?.emailid, s).catch(()=>{});
        // }
      }

      return allSessions;

    } catch (e) {
      console.error('getAllSessions failed', e);
      return [];
    }
  };



  const getPosOrders = async ({ company, option, filter, companyRecord }) => {
    if (company && companyRecord?.emailid) {
      // const cached = await getCached(company, 'posOrders', companyRecord?.emailid);
      // if (cached && Array.isArray(cached) && companyRecord?.emailid) {
      //   setPosOrders(cached);
      // }
      let prop = {}
      let filterDate = new Date('01/01/1970').getTime()
      if (filter?.start) {
        filterDate = filter.start
      }
      const sessionStart = getSessionStart(filterDate)
      const sessionEnd = getSessionEnd(filterDate)
      const isPosAdmin = companyRecord?.status === 'admin' ||
        companyRecord?.permissions.includes('access_pos_sessions')
      const isDeliveryAdmin = companyRecord?.status === 'admin' ||
        companyRecord?.permissions.includes('access_delivery_sessions')
      switch (option) {
        case 'tableOrders':
          prop = {
            ...(!isPosAdmin && filter.type === 'sales' && { sessionId: filter.sessionId }),
            tableId: filter.tableId,
            ...(!isPosAdmin && filter.type === 'sales' && { handlerId: filter.handlerId }),
            ...((filter.type === 'sales' || (filter.type === 'delivery' && filter.wrh !== 'kitchen')) && { wrh: filter.wrh }),
            ...(((isPosAdmin && filter.type === 'sales') || filter.type === 'delivery') && { createdAt: { $gte: sessionStart, $lte: sessionEnd } })
          }
      }
      if (option) {
        // console.log('fetching pos orders with...', prop)
        const resp = await fetchServer("POST", {
          database: company,
          collection: "Orders",
          prop: { ...prop }
        }, "getDocsDetails", SERVER)

        if (resp.record && Array.isArray(resp.record)) {
          // console.log('table Response: ',resp.record)
          // console.log('For getPosOrder: Printing Orders createdAt...', resp.record)
          // resp.record?.forEach((ord)=>{
          //   console.log(ord?.createdAt)
          // })
          mergeAndPersistOrders(resp.record);
          // console.log("allOrders list:", resp.record)
          // console.log('allOrders:', resp.record.find((order)=> order.orderNumber === 'ORD-251213-89997400'))
          // setCached(company, 'posOrders', resp.record, companyRecord?.emailid)
          // const cached = await getCached(company, 'posOrders', companyRecord?.emailid);
          // if (cached && Array.isArray(cached) && companyRecord?.emailid) {
          // }
        }
        return resp
        // return {record: []}
      } else {
        const orderDays = 30 * 24 * 60 * 60 * 1000
        const allowedFromDays = Date.now() - orderDays
        const resp = await fetchServer("POST", {
          database: company,
          collection: "Orders",
          prop: { createdAt: { $gte: allowedFromDays } }
        }, "getDocsDetails", SERVER)

        if (resp.record && Array.isArray(resp.record)) {
          // console.log('For getPosOrder else section: Printing Orders createdAt...', resp.record)
          // resp.record?.forEach((ord)=>{
          //   console.log(ord?.createdAt)
          // })
          mergeAndPersistOrders(resp.record);
          // console.log("allOrders list:", resp.record)
          // console.log('allOrders:', resp.record.find((order)=> order.orderNumber === 'ORD-251213-89997400'))
          // setCached(company, 'posOrders', resp.record, companyRecord?.emailid)          
        }
      }
    }
  }

  const getDepartments = async (company) => {
    const cached = await getCached(company, 'departments', companyRecord?.emailid);
    if (cached) {
      setDepartments(cached);
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Departments",
      prop: {}
    }, "getDocsDetails", SERVER)
    if (resp.record) {
      setDepartments(resp.record)
      setCached(company, 'departments', resp.record, companyRecord?.emailid)
    }
  }

  const getPositions = async (company) => {
    const cached = await getCached(company, 'positions', companyRecord?.emailid);
    if (cached) {
      setPositions(cached);
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Positions",
      prop: {}
    }, "getDocsDetails", SERVER)
    if (resp.record) {
      setPositions(resp.record)
      setCached(company, 'positions', resp.record, companyRecord?.emailid)
    }
  }

  const getEmployees = async (company) => {
    const cached = await getCached(company, 'employees', companyRecord?.emailid);
    if (cached) {
      setEmployees(cached);
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Employees",
      prop: {}
    }, "getDocsDetails", SERVER)
    if (resp.record) {
      setEmployees(resp.record)
      setCached(company, 'employees', resp.record, companyRecord?.emailid)
    }
  };

  const getCustomers = async (company) => {
    const cached = await getCached(company, 'customers', companyRecord?.emailid);
    if (cached) {
      setCustomers(cached);
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Customers",
      prop: {}
    }, "getDocsDetails", SERVER)
    if (resp.record) {
      setCustomers(resp.record)
      setCached(company, 'customers', resp.record, companyRecord?.emailid)
    }
  }

  const getAttendance = async (company) => {
    const cached = await getCached(company, 'attendance', companyRecord?.emailid);
    if (cached) {
      setAttendance(cached);
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Attendance",
      prop: {}
    }, "getDocsDetails", SERVER)
    if (resp.record) {
      setAttendance(resp.record)
      setCached(company, 'attendance', resp.record, companyRecord?.emailid)
    }
  }

  const getSales = async (company, scope) => {

    var defaultEndPoint = 'getDocsDetails'
    const salesDays = 60 * 24 * 60 * 60 * 1000
    const allowedFromDays = Date.now() - salesDays
    const allSalesDays = 365 * 24 * 60 * 60 * 1000
    const allAllowedFromDays = Date.now() - allSalesDays
    const body = {
      database: company,
      collection: "Sales",
      ...(scope === 'all' ? { prop: { createdAt: { $gte: allAllowedFromDays } } } : { prop: { createdAt: { $gte: allowedFromDays } } })
    }

    const cached = await getCached(company, 'sales', companyRecord?.emailid);
    if (cached && Array.isArray(cached)) {
      setSales(cached);
    }
    const resp = await fetchServer("POST", {
      ...body
    }, defaultEndPoint, SERVER)

    if (resp.record && Array.isArray(resp.record)) {
      setSales(resp.record)
      try {
        setCached(company, 'sales', resp.record, companyRecord?.emailid)
      } catch (e) { }
    }
    if (resp.err) {
      setSalesLoadCount(0)
    }
  }

  const getProducts = async (company) => {
    const cached = await getCached(company, 'products', companyRecord?.emailid);
    if ((!products || !products.length) && cached && cached.length) {
      setProducts(cached);
    }
    const knownFields = [
      "_id", "i_d", "name", "salesPrice", "shortRestPrice", "costPrice", "category",
      "purchaseVat", "salesVat", "salesUom", "purchaseUom",
      "buyTo", "createdAt", "type", "markUp", "vipPrice", "imgId", "viewLink", "downloadLink"
    ];

    // Build a projection object like { _id: 1, i_d: 1, name: 1, ... }
    const projection = Object.fromEntries(knownFields.map(key => [key, 1]));
    
    // const curPosSetting = posSettings?.posSettings?.find((sett) => {
    //   return sett.active
    // })
    
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Products",
      prop: {},
      project: projection
    }, "getDocsDetails", SERVER);
    if (Array.isArray(resp.record) && resp.record.length) {
      setProducts(resp.record);
      setCached(company, 'products', resp.record, companyRecord?.emailid);
      getProductsWithStock(company, resp.record)
    }
  };

  useEffect(()=>{
    // console.log('products: ',products)
  },[products])

  const getProductsWithStock = async (company, products) => {
    if (!company || !companyRecord?.emailid) {
      return products;
    }
    const cached = await getCached(company, 'productsWithStock', companyRecord?.emailid);
    if (cached && cached.length) {
      setProducts(cached);
    }
    // console.log('calculating products with stock..')
    // 1. Fetch aggregated stock and cost from InventoryTransactions
    const stockResp = await fetchServer(
      "POST",
      {
        database: company,
        collection: "InventoryTransactions",
        prop: [
          {
            $group: {
              _id: {
                productId: "$productId",
                location: "$location"
              },
              totalStock: {
                $sum: {
                  $cond: [
                    { $isNumber: "$baseQuantity" },
                    "$baseQuantity",
                    mongoNumber("$baseQuantity")
                  ]
                }
              },
              totalCost: {
                $sum: {
                  $cond: [
                    { $isNumber: "$totalCost" },
                    "$totalCost",
                    mongoNumber("$totalCost")
                  ]
                }
              },
              totalSales: {
                $sum: {
                  $cond: [
                    { $isNumber: "$totalSales" },
                    "$totalSales",
                    mongoNumber("$totalSales")
                  ]
                }
              }
            }
          }
        ]
      },
      "aggregateDocs",
      SERVER
    );
    if (stockResp.record) {
      const stockData = stockResp.record || [];
      // 2. Organize stock by productId and location
      const stockMap = {}; // { productId: { locationA: { qty, cost }, ... } }

      stockData.forEach(item => {
        const { productId, location } = item._id;
        if (!stockMap[productId]) stockMap[productId] = {};
        stockMap[productId][location] = {
          quantity: item.totalStock,
          cost: item.totalCost,
          sales: item.totalSales
        };
      });

      // 3. Enrich products with location-wise stock and cost
      const enrichedProducts = (products || []).map(product => {
        const stockInfo = stockMap[product.i_d] || {};

        // Sum up total stock and total cost across all locations
        const totalStock = Object.values(stockInfo).reduce((sum, loc) => sum + Number(loc.quantity), 0);
        const totalCost = Object.values(stockInfo).reduce((sum, loc) => sum + Number(loc.cost), 0);
        const totalSales = Object.values(stockInfo).reduce((sum, loc) => sum + Number(loc.sales), 0);

        return {
          ...product,
          locationStock: stockInfo, // now includes both quantity and cost
          totalStock,
          totalCost,
          totalSales
        };
      });

      // 4. Set enriched products
      setProducts(enrichedProducts)
      setCached(company, 'productsWithStock', enrichedProducts, companyRecord?.emailid)
      return enrichedProducts;
    }
    return products;
  };

  const makeStockReportCacheKey = (dateRange = {}) => {
    const keyPayload = {
      startDate: dateRange.startDate || null,
      endDate: dateRange.endDate || null,
      location: dateRange.location || 'all',
      transactionType: dateRange.transactionType || 'all',
      productId: dateRange.productId || null,
    };
    return `productsStockReport:${JSON.stringify(keyPayload)}`;
  };

  const mongoNumber = (field) => ({
    $convert: { input: field, to: 'double', onError: 0, onNull: 0 },
  });

  /**
   * Get a comprehensive stock report with detailed movement information
   * @param {string} company - Company database name
   * @param {Array} products - Array of product objects
   * @param {Object} dateRange - Object containing startDate and endDate
   * @returns {Promise<Array>} - Array of products with detailed stock information
   */
  const getProductsStockReport = async (company, products, dateRange = {}) => {
    if (!company || !companyRecord?.emailid) {
      return products;
    }
    const safeProducts = Array.isArray(products) ? products : [];
    try {
      const cacheKey = makeStockReportCacheKey(dateRange);
      const cached = await getCached(company, cacheKey, companyRecord?.emailid);
      if (cached && cached.length) {
        setProducts(cached);
      }
      // Set default date range if not provided (current month to date)
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
      const location = dateRange.location || 'all';
      const transactionType = dateRange.transactionType || 'all';
      const productId = dateRange.productId || null;
      // console.log(startDate, endDate)
      // Format dates for MongoDB query
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];

      // Get all products that have a salesPrice or vipPrice (to match TransactionHistory logic)
      const productIds = safeProducts
        .filter(product => product.salesPrice || product.vipPrice || product.i_d)
        .map(product => product.i_d || product.productId);

      // 1. Get opening stock (stock before start date)
      const openingStockResp = await fetchServer(
        "POST",
        {
          database: company,
          collection: "InventoryTransactions",
          prop: [
            {
              $match: {
                postingDate: { $lt: formattedStartDate },
                ...(location !== 'all' && { location }),
                ...(productId && { productId }),
                ...(transactionType !== 'all' && {
                  $or: [
                    { entryType: transactionType },
                    { documentType: transactionType }
                  ].filter(Boolean)
                })
              }
            },
            {
              $group: {
                _id: {
                  productId: "$productId",
                  location: "$location"
                },
                openingQuantity: {
                  $sum: {
                    $cond: [
                      { $isNumber: "$baseQuantity" },
                      "$baseQuantity",
                      mongoNumber("$baseQuantity")
                    ]
                  }
                },
                // Purchases
                purchasedQty: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$entryType", "Purchase"] }
                        ]
                      },
                      {
                        $cond: [
                          { $isNumber: "$baseQuantity" },
                          "$baseQuantity",
                          mongoNumber("$baseQuantity")
                        ]
                      },
                      0
                    ]
                  }
                },
                purchaseCost: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$entryType", "Purchase"] },
                          { $in: ["$productId", productIds] }
                        ]
                      },
                      {
                        $cond: [
                          { $isNumber: "$totalCost" },
                          "$totalCost",
                          mongoNumber("$totalCost")
                        ]
                      },
                      0
                    ]
                  }
                },
                openingCost: {
                  $sum: {
                    $cond: [
                      { $isNumber: "$totalCost" },
                      "$totalCost",
                      mongoNumber("$totalCost")
                    ]
                  }
                }
              }
            }
          ]
        },
        "aggregateDocs",
        SERVER
      );

      // 2. Get transactions within date range
      const transactionsResp = await fetchServer(
        "POST",
        {
          database: company,
          collection: "InventoryTransactions",
          prop: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $gte: ["$postingDate", formattedStartDate] },
                    { $lte: ["$postingDate", formattedEndDate] }
                  ],
                },
                ...(location !== 'all' && { location }),
                ...(productId && { productId }),
                ...(transactionType !== 'all' && {
                  $or: [
                    { entryType: transactionType },
                    { documentType: transactionType }
                  ].filter(Boolean)
                })
              }
            },
            {
              $project: {
                productId: 1,
                location: 1,
                baseQuantity: 1,
                totalCost: 1,
                totalSales: 1,
                documentType: 1,
                entryType: 1,
                postingDate: 1,
                postingStamp: 1
              }
            },
            {
              $group: {
                _id: {
                  productId: "$productId",
                  location: "$location"
                },
                // Purchases
                purchasedQty: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$entryType", "Purchase"] }
                        ]
                      },
                      {
                        $cond: [
                          { $isNumber: "$baseQuantity" },
                          "$baseQuantity",
                          mongoNumber("$baseQuantity")
                        ]
                      },
                      0
                    ]
                  }
                },
                purchaseCost: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$entryType", "Purchase"] }
                        ]
                      },
                      {
                        $cond: [
                          { $isNumber: "$totalCost" },
                          "$totalCost",
                          mongoNumber("$totalCost")
                        ]
                      },
                      0
                    ]
                  }
                },
                // Sales
                soldQty: {
                  $sum: {
                    $cond: [
                      { $eq: ["$entryType", "Sales"] },
                      {
                        $cond: [
                          { $isNumber: "$baseQuantity" },
                          "$baseQuantity",
                          mongoNumber("$baseQuantity")
                        ]
                      },
                      0
                    ]
                  }
                },
                salesValue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$entryType", "Sales"] },
                      {
                        $cond: [
                          { $isNumber: "$totalSales" },
                          "$totalSales",
                          mongoNumber("$totalSales")
                        ]
                      },
                      0
                    ]
                  }
                },
                costOfGoodsSold: {
                  $sum: {
                    $cond: [
                      { $eq: ["$entryType", "Sales"] },
                      {
                        $cond: [
                          { $isNumber: "$totalCost" },
                          "$totalCost",
                          mongoNumber("$totalCost")
                        ]
                      },
                      0
                    ]
                  }
                },
                // Transfers
                transferInQty: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$documentType", "Transfer Receipt"] },
                          { $gt: ["$baseQuantity", 0] }
                        ]
                      },
                      {
                        $cond: [
                          { $isNumber: "$baseQuantity" },
                          "$baseQuantity",
                          mongoNumber("$baseQuantity")
                        ]
                      },
                      0
                    ]
                  }
                },
                transferInCost: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$documentType", "Transfer Receipt"] },
                          { $gt: ["$baseQuantity", 0] }
                        ]
                      },
                      {
                        $cond: [
                          { $isNumber: "$totalCost" },
                          "$totalCost",
                          mongoNumber("$totalCost")
                        ]
                      },
                      0
                    ]
                  }
                },
                transferOutQty: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$documentType", "Transfer Shipment"] },
                          { $lt: ["$baseQuantity", 0] }
                        ]
                      },
                      {
                        $cond: [
                          { $isNumber: "$baseQuantity" },
                          "$baseQuantity",
                          mongoNumber("$baseQuantity")
                        ]
                      },
                      0
                    ]
                  }
                },
                transferOutCost: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$documentType", "Transfer Shipment"] },
                          { $lt: ["$baseQuantity", 0] }
                        ]
                      },
                      {
                        $cond: [
                          { $isNumber: "$totalCost" },
                          "$totalCost",
                          mongoNumber("$totalCost")
                        ]
                      },
                      0
                    ]
                  }
                },
                // Positive Adjustments
                positiveAdjustmentQty: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$documentType", "Positive Adjustment"] },
                          { $gt: ["$baseQuantity", 0] }
                        ]
                      },
                      {
                        $cond: [
                          { $isNumber: "$baseQuantity" },
                          "$baseQuantity",
                          mongoNumber("$baseQuantity")
                        ]
                      },
                      0
                    ]
                  }
                },
                positiveAdjustmentCost: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$documentType", "Positive Adjustment"] },
                          { $gt: ["$baseQuantity", 0] }
                        ]
                      },
                      {
                        $cond: [
                          { $isNumber: "$totalCost" },
                          "$totalCost",
                          mongoNumber("$totalCost")
                        ]
                      },
                      0
                    ]
                  }
                },
                // Negative Adjustments
                negativeAdjustmentQty: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $in: ["$documentType", ["Negative Adjustment", "Damage/Loss Note"]] },
                          { $lt: ["$baseQuantity", 0] }
                        ]
                      },
                      {
                        $cond: [
                          { $isNumber: "$baseQuantity" },
                          "$baseQuantity",
                          mongoNumber("$baseQuantity")
                        ]
                      },
                      0
                    ]
                  }
                },
                negativeAdjustmentCost: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $in: ["$documentType", ["Negative Adjustment", "Damage/Loss Note"]] },
                          { $lt: ["$baseQuantity", 0] }
                        ]
                      },
                      {
                        $cond: [
                          { $isNumber: "$totalCost" },
                          "$totalCost",
                          mongoNumber("$totalCost")
                        ]
                      },
                      0
                    ]
                  }
                }
              }
            }
          ]
        },
        "aggregateDocs",
        SERVER
      );

      // 3. Process and merge the data
      const stockMap = {};
      const purchaseInfo = {}

      // Process opening stock
      if (openingStockResp.record) {
        openingStockResp.record.forEach(item => {
          const { productId, location } = item._id;
          if (!stockMap[productId]) stockMap[productId] = {};
          if (!purchaseInfo[productId]) purchaseInfo[productId] = {};
          if (!stockMap[productId][location]) {
            stockMap[productId][location] = createEmptyStockData();
          }
          if (!purchaseInfo[productId].purchasedQty) purchaseInfo[productId].purchasedQty = 0;
          if (!purchaseInfo[productId].purchaseCost) purchaseInfo[productId].purchaseCost = 0;
          purchaseInfo[productId].purchasedQty += item.purchasedQty || 0;
          purchaseInfo[productId].purchaseCost += item.purchaseCost || 0;
          stockMap[productId][location].openingQuantity = item.openingQuantity || 0;
          stockMap[productId][location].openingCost = (true && item.purchasedQty) ? Number(((item.purchaseCost / item.purchasedQty) * item.openingQuantity).toFixed(2)) : 0;
          stockMap[productId][location].closingQty = item.openingQuantity || 0;
          const closingCost = (true && item.purchasedQty) ? Number(((item.purchaseCost / item.purchasedQty) * item.openingQuantity).toFixed(2)) : 0;
          // products.find(p => p.i_d === productId)?.salesPrice
          stockMap[productId][location].closingCost = closingCost
          stockMap[productId][location].closingSalesValue = stockMap[productId][location].closingQty * (products.find(p => p.i_d === productId)?.salesPrice || 0);
          stockMap[productId][location].averageCost = item.openingQuantity !== 0 ? Number((closingCost / item.openingQuantity).toFixed(2)) : 0;

        });
      }

      if (transactionsResp.record) {
        transactionsResp.record.forEach(item => {
          const { productId } = item._id;
          if (!purchaseInfo[productId]) purchaseInfo[productId] = {};
          if (!purchaseInfo[productId].purchasedQty) purchaseInfo[productId].purchasedQty = 0;
          if (!purchaseInfo[productId].purchaseCost) purchaseInfo[productId].purchaseCost = 0;
          purchaseInfo[productId].purchasedQty += item.purchasedQty || 0;
          purchaseInfo[productId].purchaseCost += item.purchaseCost || 0;
        })
      }

      // Process transactions within date range
      if (transactionsResp.record) {
        transactionsResp.record.forEach(item => {
          const { productId, location } = item._id;
          if (!stockMap[productId]) stockMap[productId] = {};
          if (!stockMap[productId][location]) {
            stockMap[productId][location] = createEmptyStockData();
          }

          // Update with transaction data
          const locationData = stockMap[productId][location];
          locationData.purchasedQty = item.purchasedQty || 0;
          locationData.purchaseCost = item.purchaseCost || 0;
          locationData.soldQty = item.soldQty || 0;
          locationData.salesValue = item.salesValue || 0;
          locationData.costOfGoodsSold = item.costOfGoodsSold || 0;

          locationData.transferInQty = item.transferInQty || 0;
          locationData.transferInCost = item.transferInCost || 0;
          locationData.transferOutQty = item.transferOutQty || 0;
          locationData.transferOutCost = item.transferOutCost || 0;

          // Positive adjustments
          locationData.positiveAdjustmentQty = item.positiveAdjustmentQty || 0;
          locationData.positiveAdjustmentCost = item.positiveAdjustmentCost || 0;

          // Negative adjustments
          locationData.negativeAdjustmentQty = item.negativeAdjustmentQty || 0;
          locationData.negativeAdjustmentCost = item.negativeAdjustmentCost || 0;

          // Net adjustments
          locationData.netAdjustmentQty = (item.positiveAdjustmentQty || 0) + (item.negativeAdjustmentQty || 0);
          locationData.netAdjustmentCost = (item.positiveAdjustmentCost || 0) + (item.negativeAdjustmentCost || 0);

          // Calculate closing quantities
          locationData.closingQty = (locationData.openingQuantity || 0) +
            (locationData.purchasedQty || 0) +
            (locationData.transferInQty || 0) +
            (locationData.transferOutQty || 0) +
            (locationData.soldQty || 0) +
            (locationData.netAdjustmentQty || 0);

          // Calculate closing cost (using average cost method)
          const totalCost = purchaseInfo[productId].purchaseCost
          const totalQty = purchaseInfo[productId].purchasedQty

          locationData.averageCost = totalQty !== 0 ? totalCost / totalQty : 0;
          locationData.closingCost = true ? (locationData.closingQty * locationData.averageCost) : 0;
          locationData.closingSalesValue = locationData.closingQty * (safeProducts.find(p => p.i_d === productId)?.salesPrice || 0);
        });
      }

      // 4. Enrich products with the calculated stock data
      const enrichedProducts = safeProducts.map(product => {
        const locationData = stockMap[product.i_d] || {};

        // Calculate totals across all locations
        const totals = Object.values(locationData).reduce((acc, loc) => ({
          openingQuantity: (acc.openingQuantity || 0) + (loc.openingQuantity || 0),
          openingCost: (acc.openingCost || 0) + (loc.openingCost || 0),
          purchasedQty: (acc.purchasedQty || 0) + (loc.purchasedQty || 0),
          purchaseCost: (acc.purchaseCost || 0) + (loc.purchaseCost || 0),
          soldQty: (acc.soldQty || 0) + (loc.soldQty || 0),
          salesValue: (acc.salesValue || 0) + (loc.salesValue || 0),
          costOfGoodsSold: (acc.costOfGoodsSold || 0) + (loc.costOfGoodsSold || 0),

          // Transfer fields
          transferInQty: (acc.transferInQty || 0) + (loc.transferInQty || 0),
          transferOutQty: (acc.transferOutQty || 0) + (loc.transferOutQty || 0),
          transferInCost: (acc.transferInCost || 0) + (loc.transferInCost || 0),
          transferOutCost: (acc.transferOutCost || 0) + (loc.transferOutCost || 0),

          // Adjustment fields
          positiveAdjustmentQty: (acc.positiveAdjustmentQty || 0) + (loc.positiveAdjustmentQty || 0),
          positiveAdjustmentCost: (acc.positiveAdjustmentCost || 0) + (loc.positiveAdjustmentCost || 0),
          negativeAdjustmentQty: (acc.negativeAdjustmentQty || 0) + (loc.negativeAdjustmentQty || 0),
          negativeAdjustmentCost: (acc.negativeAdjustmentCost || 0) + (loc.negativeAdjustmentCost || 0),
          netAdjustmentQty: (acc.netAdjustmentQty || 0) + (loc.netAdjustmentQty || 0),
          netAdjustmentCost: (acc.netAdjustmentCost || 0) + (loc.netAdjustmentCost || 0),

          // Closing values
          closingQty: (acc.closingQty || 0) + (loc.closingQty || 0),
          averageCost: (acc.averageCost || 0) + (loc.closingQty ? ((loc.closingQty) / (loc.closingCost)) : 0),
          closingCost: (acc.closingCost || 0) + (loc.closingCost || 0),
          closingSalesValue: (acc.closingSalesValue || 0) + (loc.closingSalesValue || 0)
        }), createEmptyStockData());

        // Calculate net adjustments
        const netAdjustmentQty = (totals.positiveAdjustmentQty || 0) + (totals.negativeAdjustmentQty || 0);
        const netAdjustmentCost = (totals.positiveAdjustmentCost || 0) + (totals.negativeAdjustmentCost || 0);

        // Add net adjustments to totals for backward compatibility
        totals.netAdjustmentQty = netAdjustmentQty;
        totals.netAdjustmentCost = netAdjustmentCost;

        // Calculate average cost
        const totalQty = (totals.purchasedQty || 0);
        const totalCost = (totals.purchaseCost || 0);
        totals.averageCost = totalQty !== 0 ? totalCost / totalQty : 0;

        return {
          ...product,
          locationStockDetails: locationData,
          stockSummary: totals
        };
      });
      if (companyRecord?.status === 'admin' && !products[0]?.stockSummary) {
        // setAlertState('info');
        // setAlert('inventory data ready!');
        // setAlertTimeout(3000);
      }
      setProducts(enrichedProducts)
      const freshCacheKey = makeStockReportCacheKey(dateRange);
      setCached(company, freshCacheKey, enrichedProducts, companyRecord?.emailid);
      return enrichedProducts;
    } catch (error) {
      console.error('Error in getProductsStockReport:', error);
      setAlertState('error');
      setAlert('Error loading inventory report data');
      setAlertTimeout(5000);
      return products; // Return original products in case of error
    }
  };

  // Helper function to create an empty stock data object
  const createEmptyStockData = () => ({
    openingQty: 0,
    openingCost: 0,
    purchasedQty: 0,
    purchaseCost: 0,
    soldQty: 0,
    salesValue: 0,
    costOfGoodsSold: 0,
    transferInQty: 0,
    transferInCost: 0,
    transferOutQty: 0,
    transferOutCost: 0,
    positiveAdjustmentQty: 0,
    positiveAdjustmentCost: 0,
    negativeAdjustmentQty: 0,
    negativeAdjustmentCost: 0,
    netAdjustmentQty: 0,
    netAdjustmentCost: 0,
    closingQty: 0,
    closingCost: 0,
    closingSalesValue: 0,
    averageCost: 0
  });

  const getAccommodations = async (company, scope) => {
    try {
      const accommodationDays = 60 * 24 * 60 * 60 * 1000
      const allowedFromDays = Date.now() - accommodationDays
      const resp = await fetchServer("POST", {
        database: company,
        collection: "Accommodations",
        ...(scope === 'all' ? { prop: {} } : { prop: { createdAt: { $gte: allowedFromDays } } })
      }, "getDocsDetails", SERVER)
      if (resp.record) {
        setAccommodations(resp.record)
        setCached(company, 'accommodations', resp.record, companyRecord?.emailid)
      }
      if (resp.err) {
        const cached = await getCached(company, 'accommodations', companyRecord?.emailid);
        if (cached) {
          setAccommodations(cached);
        }
      }
    } catch (e) {
      const cached = await getCached(company, 'accommodations', companyRecord?.emailid);
      if (cached) {
        setAccommodations(cached);
      }
    }
  }

  const getPurchase = async (company, scope) => {
    const cached = await getCached(company, 'purchase', companyRecord?.emailid);
    if (cached) {
      setPurchase(cached);
    }
    const purchaseDays = 60 * 24 * 60 * 60 * 1000
    const allowedFromDays = Date.now() - purchaseDays
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Purchase",
      ...(scope === 'all' ? { prop: {} } : { prop: { createdAt: { $gte: allowedFromDays } } })
    }, "getDocsDetails", SERVER)
    if (resp.record) {
      setPurchase(resp.record)
      setCached(company, 'purchase', resp.record, companyRecord?.emailid)
    }
  }

  const getExpenses = async (company, scope) => {
    const cached = await getCached(company, 'expenses', companyRecord?.emailid);
    if (cached) {
      setExpenses(cached);
    }
    const expensesDays = 60 * 24 * 60 * 60 * 1000
    const allowedFromDays = Date.now() - expensesDays
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Expenses",
      ...(scope === 'all' ? { prop: {} } : { prop: { createdAt: { $gte: allowedFromDays } } })
    }, "getDocsDetails", SERVER)
    if (resp.record) {
      setExpenses(resp.record)
      setCached(company, 'expenses', resp.record, companyRecord?.emailid)
    }
  }

  const getRentals = async (company, scope) => {
    const cached = await getCached(company, 'rentals', companyRecord?.emailid);
    if (cached) {
      setRentals(cached);
    }
    const rentalDays = 365 * 24 * 60 * 60 * 1000
    const allowedFromDays = Date.now() - rentalDays
    const body = {
      database: company,
      collection: "Sales",
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Rentals",
      ...(scope === 'all' ? { prop: {} } : { prop: { createdAt: { $gte: allowedFromDays } } })
    }, "getDocsDetails", SERVER)
    if (resp?.record) {
      setRentals(resp?.record)
      setCached(company, 'rentals', resp.record, companyRecord?.emailid)
    }
  }

  const getSettings = async (company) => {
    if (!company) return
    setSettingsLoadState({ loading: true, loaded: false, company })
    try {
      const cached = await getCached(company, 'settings', companyRecord?.emailid);
      if (cached) {
        setSettings(cached);
        setSettingsLoadState({ loading: true, loaded: true, company })
      }
      const resp = await fetchServer("POST", {
        collection: "Settings",
        prop: {}
      }, "getDocsDetails", SERVER)
      if (resp.record) {
        setSettings(resp.record)
        setCached(company, 'settings', resp.record, companyRecord?.emailid)
      }
    } finally {
      setSettingsLoadState({ loading: false, loaded: true, company })
    }
  };

  const getImage = async (body) => {
    const resp = await fetchServer("POST",
      body,
      "getImgUrl",
      SERVER
    )
    if (resp.err) {
      console.log(resp.mess)
      return ''
    } else {
      return resp.url
    }
  }

  function excelDateToTimestamp(excelDateValue) {
    if (String(excelDateValue).split('').includes('/') ||
      String(excelDateValue).split('').includes('-')) {
      return excelDateValue
    } else {
      const secondsInDay = 86400; // 24 hours * 60 minutes * 60 seconds
      const millisecondsInDay = secondsInDay * 1000;

      // Excel epoch is December 30, 1899
      const excelEpoch = new Date('1899-12-30').getTime();

      // Convert Excel date value to JavaScript timestamp
      var timestamp = excelEpoch + (Number(excelDateValue) - 1) * millisecondsInDay;
      if (excelDateValue >= 60) {
        timestamp += millisecondsInDay; // Add one day for dates after February 29, 1900
      }

      return timestamp;
    }
  }

  const getDate = (dateval) => {
    const current = dateval ? new Date(dateval) : new Date();
    const date = `${current.getDate()}/${current.getMonth() + 1}/${current.getFullYear()}`;
    return date
  }

  useEffect(() => {
    var currPath = window.localStorage.getItem('curr-path')
    if (currPath !== null && pathList.includes(currPath)) {
      var cmp_val = window.localStorage.getItem('sessn-cmp')
      setCompany(cmp_val)
      if (!cmp_val) {
        removeSessions()
      } else {
        var sid = window.localStorage.getItem('sessn-id')
        var sess = 0
        if (sid !== null) {
          sid.split('').forEach((chr) => {
            sess += chr.codePointAt(0)
          })
          const sesn = window.localStorage.getItem('sess-recg-id')
          const session = window.localStorage.getItem('idt-curr-usr')
          if (sesn !== null && session != null) {
            let isValid = false;
            if (sesn.includes('-')) {
              const [timestamp, expectedSess] = sesn.split('-');
              isValid = (timestamp === session && Number(expectedSess) === sess);
            } else {
              isValid = (Math.round(Number(sesn) / Number(session)) === sess || Number(sesn) / Number(session) === sess);
            }
            if (isValid) {
              loadPage(sid, currPath)
            } else {
              removeSessions()
            }
          } else {
            removeSessions()
          }
        } else {
          removeSessions(currPath)
        }
      }
    } else {
      removeSessions()
    }
  }, [sessId])

  useEffect(()=>{
    const showSubscriptionBanner = !!(
      companyRecord?.emailid &&
      subscriptionState &&
      !['/', '/pricing', '/community', '/help', '/login', '/signup', '/forgot-password', '/license-expired', '/database-not-found', '/payment/confirm'].includes(location.pathname) &&
      (subscriptionState.warningActive || subscriptionState.isSuspended || (subscriptionState.trialActive && !subscriptionState.hasConfiguredSubscription))
    )
    setShowSubscriptionBanner(showSubscriptionBanner)
  },[companyRecord, subscriptionState, location.pathname])


  return (
    <>
      <ContextProvider.Provider value={{
        fetchServer: guardedFetchServer,
        server: SERVER, viewAccess, getViewAccess, 
        intervalPeriod,
        showLoading, setShowLoading,
        pauseView, setPauseView,
        loginMessage, setLoginMessage,
        generateCode, generateSeries,
        exportFile, importFile,
        getSessionEnd, getSessionStart,
        companyRecord, setCompanyRecord,
        chartOfAccounts, setChartOfAccounts, getChartOfAccounts,
        chartOfAccountsLoadState,
        accountingLiveBalances, setAccountingLiveBalances,
        showSubscriptionBanner, setShowSubscriptionBanner,
        subscriptionState, setSubscriptionState, refreshSubscriptionState,
        profiles, setProfiles, fetchProfiles,
        DBProfiles, setDBProfiles, fetchDBProfiles,
        departments, setDepartments, getDepartments,
        positions, setPositions, getPositions,
        employees, setEmployees, getEmployees,
        customers, setCustomers, getCustomers,
        attendance, setAttendance, getAttendance,
        allSessions, setAllSessions, getAllSessions,
        sessions, setSessions, fetchSessions, fetchAllSessions, fetchSessionsByRange,
        salesSessions, setSalesSessions, allSalesSessions, setAllSalesSessions,
        posOrders, setPosOrders, fetchOrdersByRange,
        deliverySessions, setDeliverySessions, allDeliverySessions, setAllDeliverySessions,
        getPosOrders, getEmployeeName,
        sessionManagers, setSessionManagers, fetchSessionManagers,
        getLastActiveSessions, lastActiveSessions, setLastActiveSessions,
        mergeAndPersistOrders, mergeAndPersistSessions,
        isLive, setIsLive, liveErrorMessages, setLiveErrorMessages,
        tables, setTables, fetchTables,

        approvals, setApprovals, getApprovals,
        runApprovalWorkFlow, requestApproval, postApprovalUpdate,
        updateApproval, removeApproval,
        approvalStatus, setApprovalStatus,
        approvalMessage, setApprovalMessage,
        curApproval, setCurApproval,
        showApprovalBox, setShowApprovalBox,

        saleFrom, setSaleFrom,
        saleTo, setSaleTo,
        saleNextFrom, setSaleNextFrom,
        salesLoadCount, setSalesLoadCount,
        sales, setSales, getSales, getPendingSalesDates,
        nextSales, setNextSales,
        products, setProducts, getProducts,
        getProductsWithStock, getProductsStockReport,
        accommodations, setAccommodations, getAccommodations,
        purchase, setPurchase, getPurchase,
        expenses, setExpenses, getExpenses,
        rentals, setRentals, getRentals,
        paymentReceipts, obtainPaymentReceipts,

        settings, setSettings, getSettings,
        settingsLoadState,
        colSettings, setColSettings,
        posSettings, setPosSettings,
        paymentMethods, setPaymentMethods,
        wrhs, setWrhs,
        recoveryVal, setRecoveryVal,
        accommodationVal, setAccommodationVal,
        allowBacklogs, setAllowBacklogs,
        editAccess, setEditAccess,
        posWrhAccess, setPosWrhAccess,
        deliveryWrhAccess, setDeliveryWrhAccess,
        enableBlockVal, setEnableBlockVal,
        changingSettings, setChangingSettings,

        setAlert, setAlertState, setAlertTimeout,
        alert, alertState, alertTimeout, actionMessage,
        setAction, setActionMessage,
        storePath,
        months, monthDays, years, initialYear,
        path,
        dashList,
        loadPage,
        getImage,
        excelDateToTimestamp,
        getDate,
        removeComma,
        removeSessions,
        sessId,
        company
      }}>        

        {!pauseView ? <Routes>
          <Route path='/' element={<LandingPage />}></Route>
          <Route path='/loading' element={<LoadingPage />}></Route>
          <Route path='/pricing' element={<PricingPage />}></Route>
          <Route path='/payment/confirm' element={<PaymentConfirmPage />}></Route>
          <Route path='/community' element={<CommunityPage />}></Route>
          <Route path='/help' element={<HelpPage />}></Route>
          <Route path='/about' element={<AboutPage />}></Route>
          <Route path='/careers' element={<CareersPage />}></Route>
          <Route path='/partners' element={<PartnersPage />}></Route>
          <Route path='/docs' element={<DocsPage />}></Route>
          <Route path='/tutorials' element={<DocsPage />}></Route>
          <Route path='/api' element={<DocsPage />}></Route>
          <Route path='/privacy' element={<LegalPage type="privacy" />}></Route>
          <Route path='/terms' element={<LegalPage type="terms" />}></Route>
          <Route path='/cookie-policy' element={<LegalPage type="cookies" />}></Route>
          <Route path='/security' element={<LegalPage type="security" />}></Route>
          <Route path='/login' element={<Login />}></Route>
          <Route path='/signup' element={<Signup />}></Route>
          <Route path='/forgot-password' element={<ForgotPassword />}></Route>
          <Route path='/database-not-found' element={<DatabaseNotFound isProduction={isProduction} />}></Route>
          <Route path='/license-expired' element={<LicenseExpired />}></Route>
          <Route path='/profile' element={<Profile />}></Route>
          <Route path='/test' element={<FormPage />}></Route>
          <Route path='/dash' element={<DashView />}></Route>
          <Route path='/:id' element={<Dashboard />}></Route>
        </Routes> :
          <PauseView />
        }
        {!actionMessage && (
          isAuthPage ? (
            <AuthNotify
              notifyMessage={alert}
              notifyState={alertState}
              timeout={alertTimeout}
              onClose={() => setAlert('')}
            />
          ) : (
            <Notify
              notifyMessage={alert}
              notifyState={alertState}
              timeout={alertTimeout}
              actionMessage={actionMessage}
              action={action}
              cancel={cancel}
            />
          )
        )}
      </ContextProvider.Provider>
    </>
  );
}

export default App;
