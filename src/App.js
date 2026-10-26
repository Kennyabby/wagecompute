import { useEffect, useState, useCallback, useRef, useMemo, useContext } from 'react';
import './App.css';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import ContextProvider from './Resources/ContextProvider';
import PauseView from './Components/PauseView/PauseView';
import LoadingPage from './Components/LoadingPage/LoadingPage';
import LandingPage from './Components/LandingPage/LandingPage';
import TenantSetup from './Components/TenantSetup/TenantSetup';
import Epsilon from './Components/Epsilon/Epsilon';
import PricingPage from './Components/LandingPage/PricingPage';
import CommunityPage from './Components/LandingPage/CommunityPage';
import PaymentConfirmPage from './Components/LandingPage/PaymentConfirmPage';
import { landingPathOf } from './Components/Shared/modulePages';
import HelpPage from './Components/LandingPage/HelpPage';
import Login from './Components/Login/Login';
import Signup from './Components/Login/Signup';
import ForgotPassword from './Components/Login/ForgotPassword';
import OfflineLicensePortal from './Components/LandingPage/OfflineLicensePortal';
import OfflineLicensePaymentComplete from './Components/LandingPage/OfflineLicensePaymentComplete';
import DatabaseNotFound from './Components/LandingPage/DatabaseNotFound';
import LicenseExpired from './Components/LandingPage/LicenseExpired';
import TenantRenewal from './Components/LandingPage/TenantRenewal';
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
// Public site: product, industry, solution, customer, resource and company
// pages. All of these are session-free, see the PUBLIC_EXACT /
// PUBLIC_PREFIXES lists in removeSessions(), which must stay in step with the
// <Routes> block at the bottom of this file.
import ProductsPage from './Components/LandingPage/ProductsPage';
import ProductDetailPage from './Components/LandingPage/ProductDetailPage';
import IndustriesPage from './Components/LandingPage/IndustriesPage';
import IndustryDetailPage from './Components/LandingPage/IndustryDetailPage';
import SolutionsPage from './Components/LandingPage/SolutionsPage';
import CustomersPage from './Components/LandingPage/CustomersPage';
import CustomerStoryPage from './Components/LandingPage/CustomerStoryPage';
import ResourcesPage from './Components/LandingPage/ResourcesPage';
import EventsPage from './Components/LandingPage/EventsPage';
import { BlogPage, BlogPostPage } from './Components/LandingPage/BlogPage';
import NewsroomPage from './Components/LandingPage/NewsroomPage';
import TrustCenterPage from './Components/LandingPage/TrustCenterPage';
import ServicesPage from './Components/LandingPage/ServicesPage';
import TrainingPage from './Components/LandingPage/TrainingPage';
import IntegrationsPage from './Components/LandingPage/IntegrationsPage';
import WhyPage from './Components/LandingPage/WhyPage';
import RoiCalculatorPage from './Components/LandingPage/RoiCalculatorPage';
import ContactPage from './Components/LandingPage/ContactPage';

import { read, utils, writeFileXLSX } from 'xlsx';
import { AnimatePresence, motion } from 'framer-motion';
import fetchServer, { setConnectivityStatus, callDesktop } from './Resources/ClientServerAPIConn/fetchServer'
import createSSE from './Resources/ClientServerAPIConn/sseClient'
import { syncPendingChanges, setSyncTransport, startBackgroundSync, reportDeviceClosed } from './Resources/offlineSync';
import { buildPaymentReceipts } from './Resources/paymentReceipts';
import { canSeeBacklog, isInCurrentDay } from './Resources/viewWindow';
import { useConnectionStatus } from './Resources/useConnectionStatus';
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
  putOrder,
  putTable,
  putSession,
  sweepStaleAppCache,
} from './Resources/offlineDb';

// Single source of truth for the API base URL: set REACT_APP_API_URL in the
// environment used for each build (CRA inlines REACT_APP_* vars at build time).
// Falls back to localhost only for local dev when the var isn't set.
// Electron desktop build only: wageserver always serves this same bundle
// from whatever port it's actually listening on (electron/main.js sets that
// via PORT, currently 5001, kept off 3001 so a web-dev backend can run
// alongside it), window.location.origin is always correct there rather
// than a hardcoded port guess, and window.electronAPI only exists when
// electron/preload.js ran, so the web build's fallback is untouched.
const SERVER = process.env.REACT_APP_API_URL
  || (window.electronAPI?.isElectron ? window.location.origin : "http://localhost:3001")
// const SERVER = process.env.REACT_APP_API_URL || "https://api.epxcentral.com"
// POS and Delivery submit their changes through offlineSync, which needs to
// know how to reach the server.
setSyncTransport(fetchServer, SERVER)
if (process.env.NODE_ENV === 'production' && SERVER.includes('localhost')) {
  // Loud, unmissable warning rather than a silent guaranteed-to-fail deploy.
  // A real build-time check belongs in CI, but this catches it at runtime too.
  console.error('CONFIGURATION ERROR: REACT_APP_API_URL is not set for this production build. API calls will target localhost and fail.')
}

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
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minute TTL, used opt-in via getCached's ttlMs param

const makeCacheKey = (company, resource) => {
  const db = company || 'global';
  return `wc-cache:${db}:${resource}`;
};

// getCached returns a Promise resolving to cached data or null.
// ttlMs is opt-in: omitted (the ~20 existing call sites), this behaves
// exactly as before, cached data of any age is returned, purely to paint
// instantly while the caller still always re-fetches live afterward. Passed
// explicitly, a stale entry (older than ttlMs) is treated as a miss (null),
// letting a caller skip the live re-fetch entirely when data is fresh enough
//, see fetchProfiles/fetchDBProfiles/getChartOfAccounts/getEmployees/
// getSettings's useCache param, added to fix the Settings page always
// re-fetching everything (including modules Settings doesn't even need,
// like employees/chart of accounts) on every mount/refresh.
const getCached = async (companyKey, resource, emailid, ttlMs) => {
  const rec = await getAppCache(companyKey, emailid, resource);
  if (!rec) return null;
  if (ttlMs && rec.updatedAt && (Date.now() - rec.updatedAt >= ttlMs)) return null;
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

// The documents a live event carries: a created or updated document, a list
// of them, or none for a removal.
const sseDocs = (payload = {}) => {
  if (payload?.op === 'remove') return [];
  const data = payload?.data;
  if (Array.isArray(data)) return data.filter((d) => d && typeof d === 'object');
  return data && typeof data === 'object' ? [data] : [];
};

// Like applySseCollectionChange, keyed by a field the caller names. Sessions
// and Session Manager runs are matched by start and orders by order number:
// one made on a till before it reached the server has no _id, so matching on
// _id kept the till's stale copy next to the server's.
const upsertByKey = (prev, payload, keyOf) => {
  const current = Array.isArray(prev) ? prev : [];
  if (payload?.op === 'remove') {
    const filter = payload?.data?.filter || payload?.data || {};
    return current.filter((item) => !matchesSseFilter(item, filter));
  }
  const data = payload?.data;
  if ((payload?.op === 'update' || payload?.op === 'updateMany') && Array.isArray(data) && data.length === 2 && data[0] && keyOf(data[0]) == null && !data[0]._id) {
    const [filter, patch] = data;
    return current.map((item) => (matchesSseFilter(item, filter) ? { ...item, ...patch } : item));
  }
  const incoming = sseDocs(payload).filter((doc) => keyOf(doc) != null);
  if (!incoming.length) return current;
  const keyless = current.filter((item) => keyOf(item) == null);
  const map = new Map(current.filter((item) => keyOf(item) != null).map((item) => [String(keyOf(item)), item]));
  incoming.forEach((doc) => {
    const key = String(keyOf(doc));
    map.set(key, { ...(map.get(key) || {}), ...doc });
  });
  return [...map.values(), ...keyless];
};

const ACCOUNTING_UI_CACHE_VERSION = 6;

// Electron desktop build only, rendered at '/', the route Electron's
// BrowserWindow always loads on launch (electron/main.js:
// mainWindow.loadURL('http://127.0.0.1:5001')). Used to previously always
// mean "show TenantSetup", which meant the terms/license/master-password
// chain ran on *every* launch, even for a database already set up and in
// daily use. Now: TenantSetup (and its master-password gate) only renders
// on a true first run (no database ever selected yet) or when explicitly
// requested via Settings > Databases (?desktopSwitch=1, set by that panel's
// "Switch or Create Database" button). Otherwise this tries to silently
// resume the already-selected database's session (using whatever refresh
// token Electron's main process may have stored for it, see
// electron/main.js and wageserver's POST /desktop/session/resume) and falls
// back to that database's own direct login screen if it can't.
const DesktopEntry = () => {
  const { loadPage } = useContext(ContextProvider)
  const Navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const forceSwitch = params.get('desktopSwitch') === '1'
  const selectedDb = window.localStorage.getItem('desktop-selected-tenant')
  const showPicker = forceSwitch || !selectedDb

  useEffect(() => {
    if (showPicker) return // TenantSetup (rendered below) owns this case entirely
    ;(async () => {
      const refreshToken = await window.electronAPI?.getTenantRefreshToken?.(selectedDb)
      if (refreshToken) {
        const resp = await callDesktop(SERVER, 'desktop/session/resume', { refreshToken, db: selectedDb })
        if (resp.ok && resp.id) {
          const now = Date.now()
          let sess = 0
          String(resp.id).split('').forEach((chr) => { sess += chr.codePointAt(0) })
          window.localStorage.setItem('sessn-cmp', selectedDb)
          window.localStorage.setItem('sess-recg-id', now + '-' + sess)
          window.localStorage.setItem('idt-curr-usr', now + '')
          window.localStorage.setItem('sessn-id', resp.id)
          if (resp.refreshToken) window.electronAPI?.saveTenantRefreshToken?.(selectedDb, resp.refreshToken)
          window.electronAPI?.notifyUserLoggedIn?.()
          loadPage(resp.id, 'dashboard', { fresh: true })
          return
        }
      }
      // No stored token, or it was rejected (expired / explicitly logged
      // out / mismatched), that database's own direct tenant login (see
      // Login.js's isElectron-gated isRootDomainLogin) is exactly what
      // should show next, no master password involved.
      Navigate('/login')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (showPicker) return <TenantSetup mode={forceSwitch ? 'switch' : 'initial'} />
  return <div className="login-page"><div className="login-container"><p style={{ padding: 40 }}>Loading...</p></div></div>
}

function App() {

  const [showLoading, setShowLoading] = useState(true)
  const [viewAccess, setViewAccess] = useState(null)
  const [pauseView, setPauseView] = useState(!window.localStorage.getItem('ps-vw'))
  const [centralCompany, setCentralCompany] = useState(null)
  const [showSubscriptionBanner, setShowSubscriptionBanner] = useState(false)
  // Electron desktop build only, reflects electron-updater's download
  // progress (see electron/main.js's 'update-download-progress'/
  // 'update-downloaded-ready' IPC events, bridged via electron/preload.js).
  // null = nothing in progress, so the banner below stays hidden.
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState(null)
  // Starts expanded (so the "keep this app open" warning is actually seen
  // once, right when a download starts) but collapsible to a one-line pill
  //, the full text is long enough that leaving it permanently expanded
  // would sit on top of page content for however long the download takes.
  const [updateBannerCollapsed, setUpdateBannerCollapsed] = useState(false)

  useEffect(() => {
    if (!window.electronAPI?.onUpdateDownloadProgress) return
    const unsubscribeProgress = window.electronAPI.onUpdateDownloadProgress((progress) => {
      setUpdateDownloadProgress({ percent: progress?.percent || 0, done: false, version: progress?.version || null })
    })
    const unsubscribeDownloaded = window.electronAPI.onUpdateDownloaded?.((info) => {
      setUpdateDownloadProgress((prev) => ({ percent: 100, done: true, version: info?.version || prev?.version || null }))
      setUpdateBannerCollapsed(false) // re-expand for the "downloaded" state even if collapsed mid-download
    })
    return () => {
      unsubscribeProgress?.()
      unsubscribeDownloaded?.()
    }
  }, [])
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
  // Shared across Inventory's Overview/Transaction History, Stock, and
  // Adjustments pages, each has its own "Apply Filters" button, but they
  // all read from and write to this single date range so that applying a
  // new range in one page updates what the others show/report too, instead
  // of one page's numbers silently reflecting a different period than what
  // its own date picker still displays.
  const [inventoryDateRange, setInventoryDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  })
  // The global SSE subscription effect below has [company, companyRecord] as
  // its only deps (re-subscribing on every products change would tear down
  // and reopen the EventSource constantly), its message handler therefore
  // closes over whatever `products` was at subscribe time. A ref sidesteps
  // that stale closure without changing the effect's dependency array.
  const productsRef = useRef(products)
  // What the live connection calls into. Reassigned on every render (below
  // the session and order functions), so an event always reaches the
  // current versions without reconnecting.
  const liveRef = useRef({ applyOrders: () => {}, applySessions: () => {}, resync: () => {} })
  const lastResyncRef = useRef(0)
  useEffect(() => { productsRef.current = products }, [products])
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
  // isBrowserOnline (real OS-level internet, navigator.onLine) is exposed
  // separately from isFullyConnected, the desktop build's sidebar indicator
  // wants the former specifically (see SideNav.js): its own server is always
  // local and effectively always reachable, so isFullyConnected's
  // health-ping-to-server component isn't a meaningful signal there the way
  // it is for the web build. Real internet status still matters to show
  // (Epsilon, license checks, and update checks all need it), it's just not
  // something to treat as an error/offline-mode problem the way the web
  // build correctly does.
  const { isFullyConnected, isBrowserOnline } = useConnectionStatus(SERVER, isSSEConnected)

  useEffect(() => {
    setConnectivityStatus(isFullyConnected)
  }, [isFullyConnected])

  const Navigate = useNavigate()
  
  const intervalPeriod = 3600000; // 60 minutes
  // The fetch handed to every screen. A read of a whole collection the live
  // connection keeps current is answered from memory while that connection
  // is up. Anything filtered goes to the server: this used to answer every
  // read from memory or from a cache found by name, whatever its filter, so
  // a till re-reading orders or sessions to check them got the old list back.
  const guardedFetchServer = async (method, body, endpoint, serverParam, signal) => {
    try {
      const filter = body?.prop
      const unfiltered = filter === undefined || filter === null || (typeof filter === 'object' && !Array.isArray(filter) && Object.keys(filter).length === 0)
      if (endpoint === 'getDocsDetails' && unfiltered && isSSEConnected && isInitialSyncDone) {
        const coll = String(body?.collection || body?.collectionName || '').trim().toLowerCase()
        const inMemory = {
          products: () => products,
          sales: () => sales,
          purchase: () => purchase,
          expenses: () => expenses,
          accommodations: () => accommodations,
          tables: () => tables,
        }[coll]
        const rec = inMemory ? inMemory() : null
        if (Array.isArray(rec) && rec.length) return { err: false, record: rec }
      }
    } catch (e) {
      console.warn('guardedFetchServer error', e)
    }
    return await fetchServer(method, body, endpoint, serverParam, signal)
  }

  // 'license-expired' and 'renew' must be here too, a suspended tenant can
  // now log in and land on /license-expired (see LicenseExpired.js's
  // storePath('license-expired')). Without them in this list, refreshing
  // while there hit the `else` branch below and called removeSessions()
  // unconditionally, wiping a perfectly valid login and bouncing to /login.
  // This whole path only became reachable once a suspended tenant could log
  // in at all, so the gap was latent until now.
  const pathList = ['', 'login', 'profile', 'dashboard', 'license-expired', 'renew',
    'employees', 'departments', 'positions', 'attendance', 'payroll', 'pos', 'delivery', 'sales', 'business-partners', 'inventory', 'assets', 'accommodations', 'purchase', 'expenses', 'reports', 'journals', 'business-central', 'settings', 'test']
  const dashList = ['dashboard',
    'employees', 'departments', 'positions', 'attendance', 'payroll', 'pos', 'delivery', 'sales', 'business-partners', 'inventory', 'assets', 'accommodations', 'purchase', 'expenses', 'reports', 'journals', 'business-central', 'settings']
  // Must mirror the free-tier keys in wageserver/UserModule/Billing/moduleCatalog.js
  // exactly, these are always available regardless of what a tenant purchased.
  const FREE_TIER_MODULE_KEYS = ['dashboard', 'settings', 'employees', 'departments', 'positions', 'attendance']
  // Tenant-level module entitlement ceiling, mirrors the exact logic of
  // wageserver/UserModule/Billing/moduleCatalog.js's resolveEffectiveModules,
  // computed here from data already fetched (centralCompany, subscriptionState)
  // rather than a new network call. Full trial access and the "no field yet"
  // grandfather clause both intentionally return every module, see that
  // file's comments for why.
  const isTrialFullAccess = !!subscriptionState?.trialActive && !subscriptionState?.hasConfiguredSubscription
  const tenantEnabledModules = Array.isArray(centralCompany?.enabledModules) ? centralCompany.enabledModules : null
  const enabledModules = isTrialFullAccess || !tenantEnabledModules
    ? dashList
    : Array.from(new Set([...FREE_TIER_MODULE_KEYS, ...tenantEnabledModules]))
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


  // Re-fetches the central CompanyProfiles record, the source of
  // `enabledModules`, so a tenant admin adding modules (or a central admin
  // changing them) is reflected in nav/route gating without a full page
  // reload. Exposed via context for any component that mutates entitlements.
  const refreshCentralCompany = async () => {
    try {
      const cpResp = await fetchServer('POST', {}, 'getCompanyProfile', SERVER)
      if (cpResp && !cpResp.err && cpResp.record) setCentralCompany(cpResp.record)
    } catch (e) { /* ignore */ }
  }

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

  // Keeps this device's queue of POS changes moving: retried every 30
  // seconds while anything is waiting and as soon as the connection returns,
  // and the server is told what is still here (Resources/offlineSync.js).
  // It used to be every 5 minutes, long enough for a till to be closed with
  // sales the server had never seen.
  useEffect(() => {
    if (!company || !companyRecord?.emailid) return;
    return startBackgroundSync(company, companyRecord.emailid);
  }, [company, companyRecord?.emailid]);

  useEffect(() => {
    // Electron desktop build: before a workspace is selected there's no
    // tenant to scope this connection to, and EventSource can't carry the
    // x-desktop-tenant header fetchServer.js attaches to normal requests
    // (browsers don't support custom headers on EventSource at all), the
    // request would reach InitializeApp.js's tenant-resolution middleware
    // with nothing identifying a tenant and 404 as "Invalid Tenant". Skip
    // connecting until TenantSetup has actually picked one.
    if (window.electronAPI?.isElectron && !window.localStorage.getItem('desktop-selected-tenant')) {
      return
    }
    // Only once someone is signed in. On the login page there is no token,
    // and the connection, which now keeps retrying, would ask the server for
    // one every 30 seconds for nothing.
    if (!company || !companyRecord?.emailid) return
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
              // Straight into what the screens show, keyed by order number,
              // with this device's own unsent change on top. It used to go
              // only to the cache, so an order paid or cancelled on another
              // till was not seen here until a reload.
              liveRef.current.applyOrders(payload)
              break;
            case 'POSSessions':
              // Every list a screen reads sessions from, keyed by the
              // session's start (a session made offline has no _id until the
              // server has it). A session started or ended on another device
              // used to reach none of them.
              liveRef.current.applySessions(payload)
              break;
            case 'SessionManagers':
              setSessionManagers((prev) => upsertByKey(prev, payload, (item) => item?.start))
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
                // A real, direct "stock may have changed" signal, e.g. the
                // Dashboard's low-stock widget listens for this so a
                // just-received PO reliably refreshes it, instead of
                // depending on the separate DashboardSummaries rebuild
                // pipeline's own (indirect, potentially delayed) broadcast.
                window.dispatchEvent(new CustomEvent('wc:inventory-stock-changed', { detail: { company, collection: 'Purchase' } }));
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
                  // Matched by name, unique per settings record. Several
                  // screens delete _id from the records they read (in place),
                  // so matching by _id added every live change as a second
                  // copy and the screens kept reading the old one.
                  const merged = upsertByKey(prev, payload, (item) => item?.name);
                  setCached(company, 'settings', merged, companyRecord?.emailid);
                  return merged;
                });
              } catch (e) {
                console.error('SSE Settings apply error', e);
                setReloadCount(c => c + 1)
              }
              break;
            case 'Tables':
              try {
                setTables((prev) => {
                  const merged = applySseCollectionChange(prev, payload);
                  setCached(company, 'tables', merged, companyRecord?.emailid);
                  return merged;
                });
              } catch (e) {
                console.error('SSE Tables apply error', e);
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
            case 'PostingOperations':
              // Live posting-progress feed (single postings and the GL
              // backlog run alike), re-dispatched as a plain CustomEvent,
              // same fan-out pattern as accounting-live/dashboard-summary
              // below, so any page can subscribe via
              // Resources/postingOperations.js's usePostingOperationProgress
              // without adding another case here.
              try {
                window.dispatchEvent(new CustomEvent('wc:posting-progress-update', {
                  detail: payload.data || null,
                }));
              } catch (e) {
                console.error('SSE PostingOperations apply error', e);
              }
              break;
            case 'AccountingLiveBalances':
              try {
                const liveSnapshot = payload.data || null;
                setAccountingLiveBalances(liveSnapshot);
                setCached(company, 'accountingLiveBalances', liveSnapshot, companyRecord?.emailid);
                if (liveSnapshot?.fromDate && liveSnapshot?.toDate) {
                  const liveSnapshotKey = `journal-snapshot-v${ACCOUNTING_UI_CACHE_VERSION}-${liveSnapshot.fromDate}-${liveSnapshot.toDate}`;
                  const liveBalanceKey = `journal-balances-v${ACCOUNTING_UI_CACHE_VERSION}-${liveSnapshot.fromDate}-${liveSnapshot.toDate}`;
                  const liveCachePayload = {
                    fromDate: liveSnapshot.fromDate,
                    toDate: liveSnapshot.toDate,
                    cacheScope: {
                      fromDate: liveSnapshot.fromDate,
                      toDate: liveSnapshot.toDate,
                      filters: {},
                    },
                    balances: liveSnapshot.balances || {},
                    reports: liveSnapshot.reports || {},
                    rawLedger: liveSnapshot.rawLedger || {},
                    meta: liveSnapshot.meta || {},
                  };
                  setCached(company, liveSnapshotKey, liveCachePayload, companyRecord?.emailid);
                  setCached(company, liveBalanceKey, { ...liveCachePayload, rawLedger: {} }, companyRecord?.emailid);
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
                  const balanceSummaryKey = `journal-balances-v${ACCOUNTING_UI_CACHE_VERSION}-${summaryDoc.fromDate}-${summaryDoc.toDate}`;
                  const summaryCachePayload = {
                    fromDate: summaryDoc.fromDate,
                    toDate: summaryDoc.toDate,
                    cacheScope: {
                      fromDate: summaryDoc.fromDate,
                      toDate: summaryDoc.toDate,
                      filters: {},
                    },
                    balances: summaryDoc.balances || {},
                    reports: summaryDoc.reports || {},
                    rawLedger: summaryDoc.rawLedger || {},
                    meta: summaryDoc.meta || {},
                  };
                  setCached(company, summaryKey, summaryCachePayload, companyRecord?.emailid);
                  setCached(company, balanceSummaryKey, { ...summaryCachePayload, rawLedger: {} }, companyRecord?.emailid);
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
            case 'BCSyncRuns':
              // Progress of a Business Central sync. The module keeps its own
              // state, so this only hands the update on to whichever page is open.
              window.dispatchEvent(new CustomEvent('wc:bc-sync-update', { detail: { company, run: payload.data || null } }));
              break;
            case 'DashboardSummaries':
              try {
                const summaryDoc = payload.data || null;
                if (summaryDoc?.summaryKey) {
                  setCached(company, `dashboard-summary-${summaryDoc.summaryKey}`, {
                    ...(summaryDoc.snapshot || {}),
                    _summaryKey: summaryDoc.summaryKey,
                    _filters: summaryDoc.filters || null,
                  }, companyRecord?.emailid);
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
              // Same direct "stock may have changed" signal as the Purchase
              // case above, fires on every stock-moving write (receipts,
              // transfers, sales, adjustments...), not just purchases.
              try {
                window.dispatchEvent(new CustomEvent('wc:inventory-stock-changed', { detail: { company, collection: 'InventoryTransactions' } }));
              } catch (e) { /* ignore */ }
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
                  // recompute stock view (best-effort), uses the ref so this
                  // reads current products regardless of when this effect
                  // last re-subscribed, and calls the same complete,
                  // date-scoped aggregation every other stock surface uses
                  // (Stock Report/Overview/Adjustments) rather than the
                  // separate, incomplete, unconditional one.
                  try {
                    if (productsRef.current) {
                      getProductsStockReport(company, productsRef.current)
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
                    if (productsRef.current) {
                      getProductsStockReport(company, productsRef.current)
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
      }, {
        onStatus: (connected) => setIsSSEConnected(connected),
        onResync: (detail) => liveRef.current.resync(detail),
      })
    } catch (e) {
      console.warn('Could not create SSE', e)
    }
    return () => { if (es) { try { es.close() } catch (e) { } setIsSSEConnected(false) } }
    // Only who is signed in, where. companyRecord is replaced with a new
    // object on every profile refresh; reconnecting each time dropped the
    // events sent in between.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, companyRecord?.emailid])

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

  // Local IndexedDB housekeeping only, clears stale cached entries older than
  // the app-cache TTL. Never touches the server/live database.
  useEffect(() => {
    if (company && companyRecord?.emailid) {
      sweepStaleAppCache(company, companyRecord.emailid).catch(() => {});
    }
  }, [company, companyRecord?.emailid])

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
        await refreshCentralCompany()
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
          // A default module chosen for this user in Settings is where they
          // land. The blocks below still load each permitted module's data;
          // without a default they also pick the page, as they always have.
          const landing = landingPathOf(companyRecord, enabledModules)
          const go = (path) => {
            if (!landing && window.location.pathname !== path) Navigate(path + window.location.search)
          }
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
            go('/employees')
          }
          if (companyRecord?.permissions.includes('attendance')) {
            getAttendance(company)
            window.localStorage.removeItem('lgt-vw')
            go('/attendance')
          }
          if (companyRecord?.permissions.includes('purchase')) {
            getPurchase(company)
            window.localStorage.removeItem('lgt-vw')
            go('/purchase')
          }
          if (companyRecord?.permissions.includes('expenses')) {
            getExpenses(company)
            window.localStorage.removeItem('lgt-vw')
            go('/expenses')
          }
          if (companyRecord?.permissions.includes('inventory') ||
            companyRecord?.permissions.includes('pos') ||
            companyRecord?.permissions.includes('delivery')
          ) {
            getProducts(company)
            go('/inventory')
          }
          if (hasAssetsAccess && !hasInventoryAccess && !hasPosAccess && !hasDeliveryAccess) {
            window.localStorage.removeItem('lgt-vw')
            go('/assets')
          }
          if (companyRecord?.permissions.includes('delivery')) {
            if (companyRecord?.permissions.includes('access_delivery_sessions') || companyRecord?.permissions.includes('manage_session_manager')) {
              fetchAllSessions({ company, companyRecord })
              getPosOrders({ company: company, companyRecord: companyRecord })
              getLastActiveSessions(company, companyRecord)
              fetchSessionManagers(company, companyRecord)
            }
            fetchProfiles(company)
            fetchSessions(company, "delivery", companyRecord)
            fetchTables(company)
            go('/delivery')
          }
          if (companyRecord?.permissions.includes('pos')) {
            if (companyRecord?.permissions.includes('access_pos_sessions') || companyRecord?.permissions.includes('manage_session_manager')) {
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
            go('/pos')
          }
          if (companyRecord?.permissions.includes('accommodations')) {
            getCustomers(company)
            getAccommodations(company)
            go('/accommodations')
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
            go('/sales')
          }
          // Session Manager's "post pending sales before starting today's
          // session" check (PointOfSales.js's canUpdateSession) reads the
          // `sales` state populated here, which otherwise only ever loads
          // for an admin or someone with the full, unrelated 'sales' module
          // permission. Without it, sales.length stays 0 forever for a
          // manage_session_manager-only holder, so the effect that computes
          // canUpdateSession never even runs its body (see its own `if
          // (sales.length)` guard) and it's stuck at its initial `false`.
          // Meaning they'd get redirected to /sales for "pending postings"
          // on every single attempt to start Session Manager, even with
          // zero actually pending. Deliberately NOT reusing the 'sales'
          // block above, that also navigates to /sales and loads
          // rentals/accommodations, none of which this narrower permission
          // should pull in on its own.
          if (!companyRecord?.permissions.includes('sales') && companyRecord?.permissions.includes('manage_session_manager')) {
            getSales(company)
          }
          if (landing && window.location.pathname !== landing) {
            window.localStorage.removeItem('lgt-vw')
            Navigate(landing + window.location.search)
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
    // A last try at sending what this device holds. Whatever is still
    // queued stays on this device for this user, and the server keeps
    // listing it for admins until it arrives.
    if (company && companyRecord?.emailid) {
      await Promise.race([
        (async () => {
          await syncPendingChanges(company, companyRecord.emailid, fetchServer, SERVER).catch(() => [])
          // Signed out on purpose, with whatever is left: this till is not
          // reported as gone quiet when its session is ended.
          await reportDeviceClosed(company, companyRecord.emailid, fetchServer, SERVER)
        })(),
        new Promise((resolve) => setTimeout(resolve, 8000)),
      ])
    }
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
      // Electron desktop build only: an explicit logout must fully
      // invalidate this database's ability to be silently resumed later via
      // Settings > Databases, otherwise the cached refresh token would let
      // someone switch straight back in without a password. No-op on web.
      if (company) window.electronAPI?.clearTenantRefreshToken?.(company)
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

  const getPendingSalesDates = ()=>{
      const pendingDates = []
      const fouldSales = []
      const skippedDates = []
      const salesDates = sales.map((sale)=>{return sale.postingDate})
      const now = new Date()
      const today = new Date(now)
      const currDay = today.getDate()
      for (let i=0; i<=10; i++){     
          today.setDate(today.getDate() - 1)
          const dateDay = today
          const dayCheck = salesDates.find((salesDate)=>{
            if (salesDate === formatDateToDefault(dateDay)) {
              fouldSales.push(salesDate)
            }
            return salesDate === formatDateToDefault(dateDay)
          })
          if (!dayCheck){
              pendingDates.push(formatDateToDefault(dateDay))
          }else{
              skippedDates.push(formatDateToDefault(dateDay))
          }
      }
      // console.log('pending days', pendingDates)
      // console.log('skipped days', skippedDates)
      // console.log('found sales', fouldSales)
      return pendingDates
  }

  const isSameDate = (date1, date2) => {
    const d1 = new Date(date1).getDay()
    const d2 = new Date(date2).getDay()

    const m1 = new Date(date1).getMonth()
    const m2 = new Date(date2).getMonth()

    const y1 = new Date(date1).getFullYear()
    const y2 = new Date(date2).getFullYear()

    return d1 === d2 && m1 === m2 && y1 === y2
  }

  const formatDateToDefault = (date) => {
    const d = new Date(date).toISOString().slice(0, 10)
    return d
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
    // A record with no ID, or one that does not follow the series (an
    // imported code, say), is skipped. It used to throw or turn the
    // largest number into NaN, which froze the series at 00001.
    ;(array || []).forEach((obj => {
      const raw = obj?.[id]
      if (typeof raw !== 'string' || !raw.startsWith(pre)) return
      let idVal = Number(raw.slice(pre.split('').length,))
      if (!Number.isFinite(idVal)) return
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

  // Whether this workspace ties POS sessions to the Session Manager: it has
  // to be started before a session can start, and stopped before one can
  // end. Set per POS mode (Settings, POS Settings) and read from the active
  // one. Off unless switched on. Every screen that behaves differently with
  // it reads this one value, so they cannot disagree.
  const activePosMode = (settings || []).find((setting) => setting?.name === 'posSettings')?.posSettings?.find((mode) => mode?.active)
  const sessionManagerRequired = activePosMode?.requireSessionManager === true
  // Whether ending a user's session waits for the Session Manager to be
  // stopped. On, as it always was, unless switched off in Settings, POS
  // Settings, the only place it is set. Only means anything where the
  // Session Manager is in use.
  const sessionManagerStopRequired = sessionManagerRequired && activePosMode?.stopManagerBeforeEnd !== false

  const getApprovalConfig = (module, section, approverId) => {
    const respConfig = {
      isApprover: false
    }

    const approvalDoc = settings?.find((setting) => setting?.name === 'approvalConfig')
    const moduleApprovers = approvalDoc?.modules || DEFAULT_APPROVAL_CONFIG.modules
    const moduleApproval = moduleApprovers[module]
    // The approver list is typed by hand on the Approval Rules tab, so a
    // user ID entered as "Sales" has to match the account "sales", with or
    // without a stray space. An exact-key lookup silently left such a user
    // out, and they kept being asked to request approval.
    const wanted = String(approverId || '').trim().toLowerCase()
    const listedKey = wanted ? Object.keys(moduleApproval?.approverIds || {}).find((key) => String(key).trim().toLowerCase() === wanted) : undefined
    const listed = listedKey !== undefined ? moduleApproval.approverIds[listedKey] : null
    const sectionWanted = String(section || '').toLowerCase()
    if (listed) {
      const approverSections = (Array.isArray(listed.sections) ? listed.sections : ['all']).map((entry) => String(entry).toLowerCase())
      if (approverSections.includes('all') || approverSections.includes(sectionWanted)) {
        respConfig.isApprover = true
        const approvalType = moduleApproval.type
        const finalLevel = moduleApproval.finalLevel
        const approverLevel = listed[approvalType]
        respConfig.approverLevel = approverLevel
        respConfig.finalLevel = finalLevel
      }
    }

    // Someone not on the list can still hold the authority another way: as
    // an admin, through the 'all' permission, or through the Approval
    // Authority checkbox for this very posting on Team Access
    // (approve_postpurchase for section postPurchase, and so on). Those
    // checkboxes used to change only what a button said, so a user could be
    // shown "Post" and still have a request sent, or the other way round.
    // They are given the final level, since none of these has a rank.
    const isSelf = wanted && wanted === String(companyRecord?.emailid || '').trim().toLowerCase()
    if (!respConfig.isApprover && isSelf && moduleApproval) {
      const held = (companyRecord?.permissions || []).map((entry) => String(entry).toLowerCase())
      if (companyRecord?.status === 'admin' || held.includes('all') || held.includes(`approve_${sectionWanted}`)) {
        respConfig.isApprover = true
        respConfig.approverLevel = moduleApproval.finalLevel
        respConfig.finalLevel = moduleApproval.finalLevel
      }
    }

    return respConfig
  }

  // Whether the signed-in user posts this kind of transaction directly. The
  // screens use it for what their button says, so the wording and what the
  // button then does come from the same answer.
  const canApproveSection = (module, section) => getApprovalConfig(module, section, companyRecord?.emailid).isApprover

  // Whether the signed-in user raised this approval request. Where a module
  // is not set to post on approval, the requester posts it once approved,
  // whether or not they also hold that module's posting permission.
  const isOwnApproval = (approval) => {
    const mine = String(companyRecord?.emailid || '').trim().toLowerCase()
    return !!mine && String(approval?.handlerId || '').trim().toLowerCase() === mine
  }

  // What the screens and side-panel badges are given. Without admin status
  // or allowBacklogs, a request dated before the current day
  // (Resources/viewWindow.js) is not shown, pending or approved: it can
  // still be raised, and once approved it is posted on approval or by
  // whoever holds the authority. An approver still sees the earlier ones
  // waiting for their approval, or nobody could approve them.
  const visibleApprovals = useMemo(() => {
    if (canSeeBacklog(companyRecord, allowBacklogs)) return approvals
    return (approvals || []).filter((appr) => (
      isInCurrentDay(appr?.postingDate, getSessionStart)
      || (!appr?.approved && getApprovalConfig(appr?.module, appr?.section, companyRecord?.emailid).isApprover)
    ))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvals, companyRecord, allowBacklogs, settings])

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
          // Settings > Approval Rules can have the server post the record
          // as soon as the final approver approves (wageserver
          // UserModule/Approvals/autoPost.js). Say what it did, so nobody
          // posts it again by hand or waits for a posting that failed.
          const autoPost = resp.autoPost
          if (autoPost?.status === 'posted') {
            setAlertState('success')
            setAlert(`Approved and posted automatically${autoPost.postedFor ? ` for ${autoPost.postedFor}` : ''}${autoPost.documentNo ? ` (${autoPost.documentNo})` : ''}.`)
            setAlertTimeout(4000)
          } else if (autoPost?.status === 'failed') {
            setAlertState('error')
            setAlert(`Approved, but it could not be posted automatically: ${autoPost.error}. It can still be posted by hand.`)
            setAlertTimeout(8000)
          } else {
            setAlertState('success')
            setAlert('Approval Updated!')
            setAlertTimeout(1000)
          }
          setApprovalStatus(false)
          setApprovalMessage('')
          setShowApprovalBox(false)
          // A posted approval no longer exists; leaving it open would offer
          // Post again and record it twice.
          setCurApproval(autoPost?.status === 'posted' ? null : {
            ...curApproval,
            ...approvalState,
            ...(autoPost?.status === 'failed' ? { autoPost: { status: 'failed', error: autoPost.error } } : {})
          })
          if (autoPost?.status === 'posted') {
            window.dispatchEvent(new CustomEvent('wc:approval-auto-posted', { detail: { module, section, ...autoPost } }))
          }
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
        // An approval the server posted on approval is deleted there. A
        // screen opened before that still holds it, and posting from it
        // would record the same thing twice.
        const stillThere = await fetchServer("POST", {
          database: company,
          collection: "Approvals",
          prop: { module, section, createdAt: curApproval.createdAt }
        }, "getDocsDetails", SERVER).catch(() => null)
        const gone = stillThere && !stillThere.err && Array.isArray(stillThere.record)
          ? stillThere.record.length === 0
          : !(approvals || []).some((appr) => appr.module === module && appr.section === section && appr.createdAt === curApproval.createdAt)
        if (gone) {
          setAlertState('info')
          setAlert('This request was already posted when it was approved. Nothing was posted again.')
          setAlertTimeout(5000)
          setCurApproval(null)
          getApprovals(company, companyRecord)
          return true
        }
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
      return { completed: resp.updated, mess: resp.mess, autoPost: resp.autoPost || null }
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
          // Set from the RECONCILED result (server data with local pending
          // changes overlaid), not the raw server response directly.
          // Confirmed live as a real race: ending a POS session updates
          // allSalesSessions immediately (via this same reconcile, from
          // stopSession's own mergeAndPersistSessions call), correctly
          // clearing PointOfSales.js's activeSessions. But this function
          // also gets called around the same actions (session
          // manager start/stop) and used to set lastActiveSessions from the
          // UNMERGED server response, which, if the just-ended session
          // hadn't finished syncing to the server yet, still showed it as
          // active. PointOfSales.js's activeSessions effect reacts to
          // BOTH allSalesSessions and lastActiveSessions changes, so that
          // stale, unreconciled value could overwrite the correct one that
          // was just set, moments earlier, in the same render pass, which
          // is exactly why "Please end all POS sessions" kept showing even
          // after every session had actually ended.
          const reconciled = await mergeAndPersistSessions(sessionsResponse.record)
          setLastActiveSessions(reconciled)
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

      // An array, not an object: destructured as one, all three were
      // undefined and every session this fetched was thrown away.
      const [resp, resp1, sessionsResponse] = await Promise.all([
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
        // getAllSessions has already merged these into the session lists,
        // with this device's unsent changes on top; setting them raw here
        // would undo that.

        if (typeof setState === 'function') {
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
    // Every route registered without requiring a session (see the <Routes>
    // block below) belongs here, this was missing most of them (privacy,
    // terms, and the rest of the public marketing/docs pages), so visiting
    // any of those with no active session force-redirected to /login even
    // though the page itself needs no session at all.
    //
    // Split into exact paths and prefixes because the public site now has
    // detail routes (/products/pos, /industries/retail, /customers/<slug>,
    // /blog/<slug>) whose slugs cannot be enumerated here. None of these
    // prefixes collide with a tenant module route, those are the single
    // segments in dashList (dashboard, employees, pos, inventory, …) and are
    // deliberately kept out of the public namespace.
    // NB: deliberately not named `path`, removeSessions already takes a
    // parameter of that name.
    const currentPath = window.location.pathname;
    const PUBLIC_EXACT = [
      '/', '/loading', '/payment/confirm', '/login', '/signup', '/forgot-password',
      '/pricing', '/renew', '/license-expired', '/database-not-found',
      // Marketing and company
      '/about', '/careers', '/partners', '/community', '/contact', '/press',
      '/why-enterprise-compute', '/roi-calculator', '/solutions',
      // Product, industry and customer indexes
      '/products', '/industries', '/customers',
      // Resources, learning and platform
      '/resources', '/events', '/blog', '/docs', '/tutorials', '/api',
      '/help', '/services', '/training', '/integrations', '/trust-center',
      // Legal
      '/privacy', '/terms', '/cookie-policy', '/security',
      // Offline licence portal
      '/offline-license-portal/login', '/offline-license/payment-complete',
    ];
    const PUBLIC_PREFIXES = ['/products/', '/industries/', '/customers/', '/blog/'];
    const isPublicPath =
      PUBLIC_EXACT.includes(currentPath) ||
      PUBLIC_PREFIXES.some((prefix) => currentPath.startsWith(prefix));
    if (!isPublicPath) Navigate('/login')
  }

  // `fresh` is a sign-in that did not ask for a particular page. Only then
  // does an admin's default module apply, so a refresh keeps the page in use.
  // Users who are not admins are placed by the permission effect above,
  // which applies their default module itself.
  const loadPage = async (propVal, currPath, { fresh = false } = {}) => {
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
      const landing = fresh ? landingPathOf(resp.record, enabledModules) : null
      if (landing) currPath = landing.slice(1)
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
    // Electron desktop build: never calls /getActivationDetails at all, not
    // just before a workspace is selected. This app was paid for once,
    // manually, outside the app (or licensed via the offline-license system,
    // see LicenseActivation.js), there is no online trial/subscription
    // state for a locally-created tenant to check, and this codepath (built
    // for hosted-tenant billing) has no concept of the offline license that
    // actually gates usage now. That gating happens earlier, in
    // LicenseActivation/TenantSetup, before this ever runs.
    if (window.electronAPI?.isElectron) {
      // pauseView defaults to true (no 'ps-vw' flag set yet on a fresh
      // launch) and PauseView.js renders a bare empty <label> while it's
      // true. Setting it false here isn't enough on its own, a separate
      // effect (App.js, watching window.localStorage.getItem('ps-vw'))
      // unconditionally re-runs setPauseView(!ps-vw) on mount too, and
      // since nothing in this early-return path ever wrote 'ps-vw', that
      // effect immediately flipped pauseView back to true right after this
      // set it false, which is exactly why the window stayed permanently
      // blank instead of ever reaching TenantSetup. Writing the same flag
      // the normal success path writes (below) keeps both effects agreeing.
      window.localStorage.setItem('ps-vw', 'true')
      setPauseView(false)
      setShowLoading(false)
      return
    }
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
        // Previously only excluded '/payment/confirm', a suspended tenant
        // could never even reach the login form (this redirect fired before
        // it could render), so "Manage Subscription" led to a dead end: no
        // session, no way to log in, nothing to click. '/login' and '/renew'
        // (the public self-service renewal page) must stay reachable while
        // suspended.
        const isConfirming = ['/payment/confirm', '/login', '/renew'].includes(window.location.pathname)

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
      const paymentReceipts = buildPaymentReceipts({ sales, accommodations, orders: allPosOrders, sessions: allSessions })
      setPaymentReceipts(paymentReceipts)
      setCached(company, 'paymentReceipts', paymentReceipts, companyRecord?.emailid)
    }
  }

  // useCache: opt-in, only passed true by callers that are fine with data up
  // to CACHE_TTL_MS old (e.g. a plain page load/refresh), skips the live
  // re-fetch entirely when the cache is that fresh. Defaults false so every
  // existing call site (almost all of them post-save refreshes that must
  // see this tenant's own just-written change) keeps its current always-
  // fetch-live behavior unchanged.
  const fetchProfiles = async (company, _unused, useCache = false) => {
    if (company && companyRecord?.emailid) {
      const cached = await getCached(company, 'profiles', companyRecord?.emailid, useCache ? CACHE_TTL_MS : undefined);
      if (cached && Array.isArray(cached)) {
        setProfiles(cached);
        if (useCache) return
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

  const fetchDBProfiles = async (company, _unused, useCache = false) => {
    if (company && companyRecord?.emailid) {
      const cached = await getCached(company, 'dbProfiles', companyRecord?.emailid, useCache ? CACHE_TTL_MS : undefined);
      if (cached && Array.isArray(cached)) {
        setDBProfiles(cached);
        if (useCache) return
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

  const getChartOfAccounts = async (company, _unused, useCache = false) => {
    if (company && companyRecord?.emailid) {
      setChartOfAccountsLoadState({ loading: true, loaded: false, company })
      try {
        const cached = await getCached(company, 'chartOfAccounts', companyRecord?.emailid, useCache ? CACHE_TTL_MS : undefined);
        if (cached && Array.isArray(cached)) {
          setChartOfAccounts(cached);
          setChartOfAccountsLoadState({ loading: true, loaded: true, company })
          if (useCache) return
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

      // Object.values(map) has no defined order beyond insertion order, which
      // shifts between calls whenever the server's own tie-break order for
      // same-createdAt rows isn't identical run to run (or local/pending
      // records get merged in at different points), visible as View
      // Reports' session/order cards and pay-point/location breakdown rows
      // randomly swapping position on every periodic refresh. Sorting here,
      // once, right after the merge, makes every consumer's render order
      // deterministic regardless of how it got assembled.
      const merged = Object.values(map).sort((a, b) => {
        const diff = (Number(b?.createdAt) || 0) - (Number(a?.createdAt) || 0);
        return diff !== 0 ? diff : String(a?.orderNumber || '').localeCompare(String(b?.orderNumber || ''));
      });
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

  // Merges sessions the server sent into what the screens show, keyed by
  // start, with this device's unsent changes on top. It used to rebuild the
  // lists from this device's own stored copy plus whatever was passed in, so
  // a call with a few sessions brought back old, stale copies of all the
  // others (a session ended on another device showed as live again).
  // Returns the sessions passed in, as merged.
  const mergeAndPersistSessions = async (sessions) => {
    const server = (Array.isArray(sessions) ? sessions : []).filter((session) => session && session.start != null)
    if (!company || !companyRecord?.emailid) return server
    const byStart = (a, b) => (Number(b?.start) || 0) - (Number(a?.start) || 0) || String(a?._id || '').localeCompare(String(b?._id || ''))
    try {
      const overlaid = await overlayPending('session', 'start', server)
      // Sessions started on this device that the server has not received.
      const pending = await loadPendingChanges(company, companyRecord.emailid).catch(() => [])
      const known = new Set(overlaid.map((session) => String(session.start)))
      const unsent = pending
        .filter((change) => change.entityType === 'session' && change.payload?.start != null && !known.has(String(change.payload.start)))
        .map((change) => change.payload)
      const docs = [...overlaid, ...unsent]
      const into = (keep) => (list) => upsertByKey(list || [], { op: 'update', data: docs.filter(keep) }, (item) => item?.start).sort(byStart)
      setAllSessions(into(() => true))
      setAllSalesSessions(into((session) => session.type === 'sales'))
      setAllDeliverySessions(into((session) => session.type === 'delivery'))
      for (const session of server) {
        // eslint-disable-next-line no-await-in-loop
        await putSession(company, companyRecord.emailid, session).catch(() => { })
      }
      return [...docs].sort(byStart)
    } catch (e) {
      console.warn('POS Sessions: mergeAndPersist failed', e);
      return server
    }
  };

  // This device's unsent changes, laid over what the server sent, so a live
  // event never shows a till its own change undone while that change is
  // still on its way.
  const overlayPending = async (entityType, keyField, docs) => {
    if (!docs.length) return docs
    const pending = await loadPendingChanges(company, companyRecord?.emailid).catch(() => [])
    const byKey = new Map()
    pending.filter((c) => c.entityType === entityType).forEach((c) => {
      const key = c.payload?.[keyField] ?? c.clientId
      if (key != null) byKey.set(String(key), { ...(byKey.get(String(key)) || {}), ...c.payload })
    })
    return docs.map((doc) => (byKey.has(String(doc[keyField])) ? { ...doc, ...byKey.get(String(doc[keyField])) } : doc))
  }

  const applyLiveSessions = async (payload) => {
    const me = companyRecord?.emailid
    if (payload?.op === 'remove') {
      const drop = (list) => (Array.isArray(list) ? upsertByKey(list, payload, (item) => item?.start) : list)
      setAllSessions(drop); setAllSalesSessions(drop); setAllDeliverySessions(drop)
      setLastActiveSessions(drop); setSalesSessions(drop); setDeliverySessions(drop)
      return
    }
    const docs = await overlayPending('session', 'start', sseDocs(payload).filter((doc) => doc.start != null))
    if (!docs.length) return
    const weekAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
    // Lists still null have not loaded yet; their first load brings these.
    const into = (keep) => (list) => (list === null ? list : upsertByKey(list, { op: 'update', data: docs.filter(keep) }, (item) => item?.start))
    setAllSessions(into(() => true))
    setAllSalesSessions(into((doc) => doc.type === 'sales'))
    setAllDeliverySessions(into((doc) => doc.type === 'delivery'))
    setLastActiveSessions(into((doc) => Number(doc.start) >= weekAgo))
    setSalesSessions(into((doc) => doc.type === 'sales' && doc.employee_id === me))
    setDeliverySessions(into((doc) => doc.type === 'delivery' && doc.employee_id === me))
    if (company && me) docs.forEach((doc) => putSession(company, me, doc).catch(() => { }))
  }

  const applyLiveOrders = async (payload) => {
    const me = companyRecord?.emailid
    if (payload?.op === 'remove') {
      const drop = (list) => upsertByKey(list, payload, (item) => item?.orderNumber)
      setPosOrders(drop); setAllPosOrders(drop)
      return
    }
    const docs = await overlayPending('order', 'orderNumber', sseDocs(payload).filter((doc) => doc.orderNumber))
    if (!docs.length) return
    const into = (list) => upsertByKey(list, { op: 'update', data: docs }, (item) => item?.orderNumber)
      .sort((a, b) => (Number(b?.createdAt) || 0) - (Number(a?.createdAt) || 0) || String(a?.orderNumber || '').localeCompare(String(b?.orderNumber || '')))
    setPosOrders(into)
    setAllPosOrders(into)
    if (company && me) docs.forEach((doc) => putOrder(company, me, doc).catch(() => { }))
  }

  // After events may have been missed (the connection was down too long, or
  // the server restarted), everything the POS and its boards show is fetched
  // again. At most once every 5 seconds, however many screens ask.
  const resyncLiveData = (detail = {}) => {
    if (!company || !companyRecord?.emailid) return
    if (Date.now() - lastResyncRef.current < 5000) return
    lastResyncRef.current = Date.now()
    getLastActiveSessions(company, companyRecord)
    fetchAllSessions({ company, companyRecord })
    fetchSessions(company, 'sales', companyRecord)
    fetchSessions(company, 'delivery', companyRecord)
    fetchSessionManagers(company, companyRecord)
    fetchTables(company)
    getPosOrders({ company, companyRecord })
    getApprovals(company)
    getSettings(company, companyRecord)
    try { window.dispatchEvent(new CustomEvent('wc:live-resync', { detail })) } catch (e) { /* no window */ }
  }

  liveRef.current = { applyOrders: applyLiveOrders, applySessions: applyLiveSessions, resync: resyncLiveData }

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
              results.push(...resp.record)
              // A flat list of sessions; a list of lists matched none of them.
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

  const getEmployees = async (company, _unused, useCache = false) => {
    const cached = await getCached(company, 'employees', companyRecord?.emailid, useCache ? CACHE_TTL_MS : undefined);
    if (cached) {
      setEmployees(cached);
      if (useCache) return
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

      // Cancelled orders' Shipments are left in InventoryTransactions
      // untouched (staff already have a manual Adjustment workaround for
      // correcting stock when a cancellation's reversal misses, and
      // touching the ledger here risks double-correcting it), but their
      // revenue never happened, so the sales VALUE figure below excludes
      // them. soldQty (and therefore closingQty/physical stock) is
      // deliberately left alone regardless of cancellation status.
      // Best-effort: if this lookup fails (network blip), fall back to no
      // exclusions rather than aborting the whole report, a transient miss
      // here should degrade to the old behavior, not break page load.
      let cancelledOrderNumbers = [];
      try {
        const cancelledOrdersResp = await fetchServer(
          "POST",
          {
            database: company,
            collection: "Orders",
            prop: [
              { $match: { status: 'cancelled', orderNumber: { $exists: true } } },
              { $group: { _id: null, orderNumbers: { $addToSet: "$orderNumber" } } }
            ]
          },
          "aggregateDocs",
          SERVER
        );
        cancelledOrderNumbers = cancelledOrdersResp?.record?.[0]?.orderNumbers || [];
      } catch (e) {
        console.warn('getProductsStockReport: cancelled-orders lookup failed, proceeding without exclusion', e);
      }

      // The Overview "SALES" card must always tally with the Dashboard and
      // Chart of Accounts, which are both driven by GeneralLedgerEntries.
      // The authoritative, GL-reconciled figure (cancellations reversed via
      // reverseGeneralLedgerEntriesForSource, no duplicate-posting risk).
      // The InventoryTransactions-derived salesValue above stays as the
      // source for the per-product/per-location breakdown table (useful for
      // seeing WHICH products sold), but it can drift from GL when a
      // shipment is duplicated or a record goes missing, data-integrity
      // issues that get investigated/corrected separately and shouldn't
      // require touching live records just to make this card's total
      // correct. GL has no location/product granularity, so this override
      // only applies to the fully-unscoped "all locations, all products"
      // view the summary card actually represents.
      // Best-effort too: if GL is unreachable, glSalesValue stays null and
      // the card falls back to the per-product IT sum (the pre-existing
      // behavior) rather than breaking the report.
      let glSalesValue = null;
      if (location === 'all' && !productId) {
        try {
          const glSalesResp = await fetchServer(
            "POST",
            {
              database: company,
              collection: "GeneralLedgerEntries",
              prop: [
                { $match: { postingDate: { $gte: formattedStartDate, $lte: formattedEndDate }, sourceCollection: 'Orders' } },
                { $unwind: "$lines" },
                { $match: { "lines.accountCode": { $in: [41010, 41020] } } },
                { $group: { _id: null, credit: { $sum: "$lines.credit" }, debit: { $sum: "$lines.debit" } } },
              ]
            },
            "aggregateDocs",
            SERVER
          );
          // Net of debit, a reversed/cancelled order's revenue un-recognition
          // posts as a debit against this same account; summing credit alone
          // would keep counting revenue that was later reversed.
          const row = glSalesResp?.record?.[0];
          glSalesValue = row ? (row.credit || 0) - (row.debit || 0) : null;
        } catch (e) {
          console.warn('getProductsStockReport: GL sales lookup failed, falling back to per-product sum', e);
        }
      }

      // 1. Get opening stock (stock before start date)
      const openingStockResp = await fetchServer(
        "POST",
        {
          database: company,
          collection: "InventoryTransactions",
          prop: [
            // Some historical InventoryTransactions documents have no
            // postingDate field at all, a raw postingDate match silently
            // excludes them from BOTH this "opening stock" query and the
            // "in-range" query below, since neither $lt nor $gte/$lte ever
            // matches a missing field. That made closing stock come out
            // higher than the true ledger total (confirmed: excluded docs
            // were net-negative, i.e. mostly sales, so dropping them
            // inflated the count) instead of matching the Dashboard's own
            // unconditional aggregation. Falling back to createdAt (then to
            // the epoch, so a doc with neither field still lands in
            // "opening" rather than vanishing) keeps every document in
            // exactly one of the two buckets.
            {
              $addFields: {
                __effPostingDate: {
                  $ifNull: [
                    '$postingDate',
                    { $dateToString: { format: '%Y-%m-%d', date: { $convert: { input: '$createdAt', to: 'date', onError: new Date(0), onNull: new Date(0) } } } }
                  ]
                }
              }
            },
            {
              $match: {
                __effPostingDate: { $lt: formattedStartDate },
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
            // Same missing-postingDate fallback as the opening-stock query
            // above, without it, undated documents fall into neither
            // bucket and closing stock comes out higher than the truth.
            {
              $addFields: {
                __effPostingDate: {
                  $ifNull: [
                    '$postingDate',
                    { $dateToString: { format: '%Y-%m-%d', date: { $convert: { input: '$createdAt', to: 'date', onError: new Date(0), onNull: new Date(0) } } } }
                  ]
                }
              }
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $gte: ["$__effPostingDate", formattedStartDate] },
                    { $lte: ["$__effPostingDate", formattedEndDate] }
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
                postingStamp: 1,
                orderNumber: 1
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
                      {
                        $and: [
                          { $eq: ["$entryType", "Sales"] },
                          { $not: [{ $in: ["$orderNumber", cancelledOrderNumbers] }] }
                        ]
                      },
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
                      {
                        $and: [
                          { $eq: ["$entryType", "Sales"] },
                          { $not: [{ $in: ["$orderNumber", cancelledOrderNumbers] }] }
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
                },
                // Production/Assembly/Deassembly, previously had no bucket
                // at all here, so any product with production activity in
                // the selected range silently diverged from Adjustments/
                // Products/Dashboard/Chart-of-Accounts, which all count
                // these via a different, complete pipeline. baseQuantity is
                // already signed correctly at posting time (negative for
                // consumption, positive for output), so these sum
                // unconditionally like purchasedQty/soldQty above rather
                // than filtering by sign like the adjustment buckets.
                productionConsumptionQty: {
                  $sum: {
                    $cond: [
                      { $eq: ["$entryType", "Consumption"] },
                      { $cond: [{ $isNumber: "$baseQuantity" }, "$baseQuantity", mongoNumber("$baseQuantity")] },
                      0
                    ]
                  }
                },
                productionConsumptionCost: {
                  $sum: {
                    $cond: [
                      { $eq: ["$entryType", "Consumption"] },
                      { $cond: [{ $isNumber: "$totalCost" }, "$totalCost", mongoNumber("$totalCost")] },
                      0
                    ]
                  }
                },
                productionOutputQty: {
                  $sum: {
                    $cond: [
                      { $eq: ["$entryType", "Output"] },
                      { $cond: [{ $isNumber: "$baseQuantity" }, "$baseQuantity", mongoNumber("$baseQuantity")] },
                      0
                    ]
                  }
                },
                productionOutputCost: {
                  $sum: {
                    $cond: [
                      { $eq: ["$entryType", "Output"] },
                      { $cond: [{ $isNumber: "$totalCost" }, "$totalCost", mongoNumber("$totalCost")] },
                      0
                    ]
                  }
                },
                productionVarianceQty: {
                  $sum: {
                    $cond: [
                      { $eq: ["$entryType", "Variance"] },
                      { $cond: [{ $isNumber: "$baseQuantity" }, "$baseQuantity", mongoNumber("$baseQuantity")] },
                      0
                    ]
                  }
                },
                productionVarianceCost: {
                  $sum: {
                    $cond: [
                      { $eq: ["$entryType", "Variance"] },
                      { $cond: [{ $isNumber: "$totalCost" }, "$totalCost", mongoNumber("$totalCost")] },
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

          // Production/Assembly/Deassembly
          locationData.productionConsumptionQty = item.productionConsumptionQty || 0;
          locationData.productionConsumptionCost = item.productionConsumptionCost || 0;
          locationData.productionOutputQty = item.productionOutputQty || 0;
          locationData.productionOutputCost = item.productionOutputCost || 0;
          locationData.productionVarianceQty = item.productionVarianceQty || 0;
          locationData.productionVarianceCost = item.productionVarianceCost || 0;

          // Calculate closing quantities
          locationData.closingQty = (locationData.openingQuantity || 0) +
            (locationData.purchasedQty || 0) +
            (locationData.transferInQty || 0) +
            (locationData.transferOutQty || 0) +
            (locationData.soldQty || 0) +
            (locationData.netAdjustmentQty || 0) +
            (locationData.productionConsumptionQty || 0) +
            (locationData.productionOutputQty || 0) +
            (locationData.productionVarianceQty || 0);

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

          // Production/Assembly/Deassembly
          productionConsumptionQty: (acc.productionConsumptionQty || 0) + (loc.productionConsumptionQty || 0),
          productionConsumptionCost: (acc.productionConsumptionCost || 0) + (loc.productionConsumptionCost || 0),
          productionOutputQty: (acc.productionOutputQty || 0) + (loc.productionOutputQty || 0),
          productionOutputCost: (acc.productionOutputCost || 0) + (loc.productionOutputCost || 0),
          productionVarianceQty: (acc.productionVarianceQty || 0) + (loc.productionVarianceQty || 0),
          productionVarianceCost: (acc.productionVarianceCost || 0) + (loc.productionVarianceCost || 0),

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
      // Non-index property on the array, ignored by .map/.forEach/JSON
      // rendering of the product list, read explicitly by summary cards
      // that need the GL-tallying total instead of the per-product sum.
      if (glSalesValue !== null) {
        enrichedProducts.glSalesValue = Math.round(glSalesValue * 100) / 100;
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
    productionConsumptionQty: 0,
    productionConsumptionCost: 0,
    productionOutputQty: 0,
    productionOutputCost: 0,
    productionVarianceQty: 0,
    productionVarianceCost: 0,
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

  const getSettings = async (company, _unused, useCache = false) => {
    if (!company) return
    setSettingsLoadState({ loading: true, loaded: false, company })
    try {
      const cached = await getCached(company, 'settings', companyRecord?.emailid, useCache ? CACHE_TTL_MS : undefined);
      if (cached) {
        setSettings(cached);
        setSettingsLoadState({ loading: true, loaded: true, company })
        if (useCache) return
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
              // Electron desktop build only: a resumed/persisted session
              // never goes through Login.js's own validateLogin() success
              // path, so without this, electron/main.js's hasUserLoggedIn
              // flag (which gates the update-available prompt) would stay
              // false for the entire lifetime of any session that started
              // from an already-open app rather than a fresh login, the
              // exact case of someone leaving the app open across days,
              // which is precisely when the periodic update check matters
              // most. No-op on the web build.
              window.electronAPI?.notifyUserLoggedIn?.()
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
    // Electron desktop build: no in-app billing/trial UI at all, regardless
    // of the offline-license system, this app was never going to sell
    // subscriptions from inside itself (see getViewAccess above).
    if (window.electronAPI?.isElectron) {
      setShowSubscriptionBanner(false)
      return
    }
    const showSubscriptionBanner = !!(
      companyRecord?.emailid &&
      subscriptionState &&
      !['/', '/pricing', '/community', '/help', '/login', '/signup', '/forgot-password', '/license-expired', '/database-not-found', '/payment/confirm', '/renew'].includes(location.pathname) &&
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
        pauseView, setPauseView, centralCompany, refreshCentralCompany,
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
        isSSEConnected, isFullyConnected, isBrowserOnline,
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

        approvals: visibleApprovals, setApprovals, getApprovals,
        runApprovalWorkFlow, requestApproval, postApprovalUpdate, canApproveSection, isOwnApproval,
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
        inventoryDateRange, setInventoryDateRange,
        accommodations, setAccommodations, getAccommodations,
        purchase, setPurchase, getPurchase,
        expenses, setExpenses, getExpenses,
        rentals, setRentals, getRentals,
        paymentReceipts, obtainPaymentReceipts,

        settings, setSettings, getSettings,
        settingsLoadState,
        colSettings, setColSettings,
        posSettings, setPosSettings, sessionManagerRequired, sessionManagerStopRequired,
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
        enabledModules,
        loadPage,
        getImage,
        excelDateToTimestamp,
        getDate, isSameDate, formatDateToDefault,
        removeComma,
        removeSessions,
        sessId,
        company
      }}>        

        {!pauseView ? <Routes>
          {/* window.electronAPI only exists when electron/preload.js ran.
              I.e. only inside the desktop shell (see electron/main.js's
              webPreferences.preload). A normal web page never has this, so
              LandingPage renders exactly as it always has for the web build. */}
          <Route path='/' element={window.electronAPI?.isElectron ? <DesktopEntry /> : <LandingPage />}></Route>
          <Route path='/loading' element={<LoadingPage />}></Route>
          <Route path='/pricing' element={<PricingPage />}></Route>
          <Route path='/payment/confirm' element={<PaymentConfirmPage />}></Route>
          <Route path='/community' element={<CommunityPage />}></Route>
          <Route path='/help' element={<HelpPage />}></Route>
          <Route path='/about' element={<AboutPage />}></Route>
          <Route path='/careers' element={<CareersPage />}></Route>
          <Route path='/partners' element={<PartnersPage />}></Route>
          <Route path='/contact' element={<ContactPage />}></Route>
          <Route path='/press' element={<NewsroomPage />}></Route>

          {/* Public site. Every path here is a multi-segment route or a
              single segment that is NOT in dashList, so none of them can
              shadow a tenant module route caught by '/:id' further down. */}
          <Route path='/products' element={<ProductsPage />}></Route>
          <Route path='/products/:slug' element={<ProductDetailPage />}></Route>
          <Route path='/industries' element={<IndustriesPage />}></Route>
          <Route path='/industries/:slug' element={<IndustryDetailPage />}></Route>
          <Route path='/solutions' element={<SolutionsPage />}></Route>
          <Route path='/customers' element={<CustomersPage />}></Route>
          <Route path='/customers/:slug' element={<CustomerStoryPage />}></Route>
          <Route path='/why-enterprise-compute' element={<WhyPage />}></Route>
          <Route path='/roi-calculator' element={<RoiCalculatorPage />}></Route>
          <Route path='/resources' element={<ResourcesPage />}></Route>
          <Route path='/events' element={<EventsPage />}></Route>
          <Route path='/blog' element={<BlogPage />}></Route>
          <Route path='/blog/:slug' element={<BlogPostPage />}></Route>
          <Route path='/services' element={<ServicesPage />}></Route>
          <Route path='/training' element={<TrainingPage />}></Route>
          <Route path='/integrations' element={<IntegrationsPage />}></Route>
          <Route path='/trust-center' element={<TrustCenterPage />}></Route>

          <Route path='/docs' element={<DocsPage />}></Route>
          <Route path='/tutorials' element={<DocsPage />}></Route>
          <Route path='/api' element={<DocsPage />}></Route>
          <Route path='/privacy' element={<LegalPage type="privacy" />}></Route>
          <Route path='/terms' element={<LegalPage type="terms" />}></Route>
          <Route path='/cookie-policy' element={<LegalPage type="cookies" />}></Route>
          <Route path='/security' element={<LegalPage type="security" />}></Route>
          <Route path='/login' element={<Login />}></Route>
          <Route path='/signup' element={<Signup />}></Route>
          <Route path='/offline-license-portal/login' element={<OfflineLicensePortal />}></Route>
          <Route path='/offline-license/payment-complete' element={<OfflineLicensePaymentComplete />}></Route>
          <Route path='/forgot-password' element={<ForgotPassword />}></Route>
          <Route path='/database-not-found' element={<DatabaseNotFound isProduction={isProduction} />}></Route>
          <Route path='/license-expired' element={<LicenseExpired />}></Route>
          <Route path='/renew' element={<TenantRenewal />}></Route>
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
        {updateDownloadProgress && (
          <div style={{
            position: 'fixed', bottom: 16, right: 16, zIndex: 99999, maxWidth: 300,
            background: '#173829', color: '#fff',
            borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.25)', fontSize: 13,
            overflow: 'hidden',
          }}>
            <div
              onClick={() => setUpdateBannerCollapsed((collapsed) => !collapsed)}
              style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer' }}
            >
              <span>
                {updateDownloadProgress.done
                  ? `Update${updateDownloadProgress.version ? ` v${updateDownloadProgress.version}` : ''} downloaded`
                  : `Downloading${updateDownloadProgress.version ? ` v${updateDownloadProgress.version}` : ''}: ${Math.round(updateDownloadProgress.percent)}%`}
              </span>
              <span style={{ opacity: 0.75, flexShrink: 0 }}>{updateBannerCollapsed ? '▸' : '▾'}</span>
            </div>
            {!updateBannerCollapsed && (
              <div style={{ padding: '0 14px 12px', opacity: 0.9, lineHeight: 1.4 }}>
                {updateDownloadProgress.done
                  ? "Installing shortly. A popup will let you install now or ask again later."
                  : 'Keep this app open until the download finishes. Closing it now cancels the download and it will not resume, so you would need to start over.'}
              </div>
            )}
          </div>
        )}
        {/* Online platform only (see the Epsilon plan), not shown in the
            Electron desktop build, on login/signup/forgot-password, or
            before a session is actually established. Mounted once here so
            it's available across every module without per-page wiring.
            Additionally requires this specific employee's own aiAccess
            toggle (Settings > Team Access), Epsilon is a paid, per-seat
            add-on, never on by default for anyone, admins included; the
            backend enforces this independently regardless of what's shown
            here, but hiding the button for someone without a seat avoids a
            confusing "AI assistant" bubble that just replies "you don't
            have access" every time. Same known staleness as every other
            permission field here: a toggle change only reaches an already
            logged-in session on its next login/token refresh, not live. */}
        {!window.electronAPI?.isElectron && !isAuthPage && companyRecord && companyRecord.aiAccess === true && (
          <Epsilon />
        )}
      </ContextProvider.Provider>
    </>
  );
}

export default App;
