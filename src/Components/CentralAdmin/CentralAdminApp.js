import './CentralAdmin.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import MODULE_ICONS from '../../Resources/moduleIcons'

// Same single source of truth as the tenant app (App.js) — REACT_APP_API_URL.
// Previously fell back to the hardcoded "https://api.epxcentral.com" — a
// plausible-looking but not-yet-live domain — whenever the env var wasn't
// set for whatever hosting target serves admin.epxcentral.com/admin.localhost.
// That silently sent every request to a dead/parked address with no warning,
// which the browser and this file's own catch block both report identically
// to a real CORS block ("Network error or CORS failure"). Falling back to
// localhost instead (matching App.js exactly) turns the same misconfiguration
// into an obvious, diagnosable failure rather than a mysterious one.
const SERVER = process.env.REACT_APP_API_URL || "http://localhost:3001"
if (process.env.NODE_ENV === 'production' && SERVER.includes('localhost')) {
  console.error('CONFIGURATION ERROR: REACT_APP_API_URL is not set for this production build — Central Admin API calls will target localhost and fail.')
}
const ADMIN_TOKEN_KEY = 'central-admin-access-token'

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})


const dateFormatter = new Intl.DateTimeFormat('en-NG', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const formatMoney = (value) => currencyFormatter.format(Number(value || 0))
const formatDateTime = (value) => {
  if (!value) return '--'
  const d = new Date(isNaN(value) ? value : Number(value))
  return isNaN(d.getTime()) ? '--' : dateFormatter.format(d)
}
const formatStatus = (value) => String(value || 'unconfigured').replace(/_/g, ' ')

const getStoredAdminToken = () => window.localStorage.getItem(ADMIN_TOKEN_KEY) || ''
const storeAdminToken = (token = '') => {
  if (token) window.localStorage.setItem(ADMIN_TOKEN_KEY, token)
  }
const clearAdminToken = () => window.localStorage.removeItem(ADMIN_TOKEN_KEY)

const requestAdmin = async (method, endpoint, body) => {
  try {
    const token = getStoredAdminToken()
    const response = await fetch(`${SERVER}/${endpoint}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    
    const payload = await response.json().catch(() => ({}))
    return {
      ok: response.ok,
      status: response.status,
      err: !response.ok,
      ...payload,
    }
  } catch (err) {
    console.error('Request Admin Error:', err)
    return {
      ok: false,
      status: 0,
      err: true,
      mess: 'Network error or CORS failure. Check console for details.',
    }
  }
}

const CentralAdminApp = () => {
  const [adminUser, setAdminUser] = useState(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [sessionsData, setSessionsData] = useState({ activeSessions: [], recentHistory: [] })
  const [sessionFilter, setSessionFilter] = useState({ database: '', emailid: '' })
  const [isSessionsLoading, setIsSessionsLoading] = useState(false)
  const [platformLogs, setPlatformLogs] = useState({ logs: [], total: 0 })
  const [logFilter, setLogFilter] = useState({ 
    level: '', 
    source: '', 
    tenant: '', 
    collection: '',
    userId: '',
    device: '',
    fromDate: '',
    toDate: '',
    search: '', 
    skip: 0 
  })
  const [healthSummary, setHealthSummary] = useState({ errorTrend: [], sourceBreakdown: [], topTenants: [] })
  const [isHealthLoading, setIsHealthLoading] = useState(false)
  const [snapshot, setSnapshot] = useState({
    generatedAt: 0,
    summary: {},
    tenants: [],
    recentPayments: [],
    recentOrders: [],
    recentActivities: [],
    adminUsers: [],
    plans: [],
    settings: { defaultFreeTrialDays: 14 },
  })
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  })
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [migrationTenant, setMigrationTenant] = useState('')
  const [migrationRunAll, setMigrationRunAll] = useState(false)
  const [migrationDropOldIndexes, setMigrationDropOldIndexes] = useState(false)
  const [migrationRunning, setMigrationRunning] = useState(false)
  const [migrationOutcome, setMigrationOutcome] = useState(null)
  const [planForm, setPlanForm] = useState({
    key: '',
    name: '',
    description: '',
    amountNaira: 0,
    interval: 'monthly',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [manualForm, setManualForm] = useState({
    database: '',
    months: 1,
    amountNaira: 92000,
    paidAt: new Date().toISOString().slice(0, 10),
    note: '',
  })
  const [trialForm, setTrialForm] = useState({
    database: '',
    trialDays: 14,
    trialStartAt: new Date().toISOString().slice(0, 10),
    note: '',
  })
  
  useEffect(()=>{
      document.title = 'Central Admin | Enterprise Compute Central'
  },[])

  const [globalSettingsForm, setGlobalSettingsForm] = useState({
    defaultFreeTrialDays: 14,
    desktopOfflineIntervalDays: 15,
    epsilonEnabled: true,
    epsilonModel: 'claude-sonnet-5',
    epsilonFastModel: 'claude-haiku-4-5-20251001',
    epsilonFastModelEnabled: true,
    epsilonTokenPriceNaira: 5,
    epsilonRateLimitTokens: 50000,
    epsilonRateLimitWindowHours: 5,
    epsilonUsdToNgn: 1600,
    epsilonModelRatesUsd: {
      'claude-sonnet-5': {
        inputPerM: 3, outputPerM: 15, cacheWritePerM: 3.75, cacheReadPerM: 0.3,
      },
      'claude-haiku-4-5-20251001': {
        inputPerM: 1, outputPerM: 5, cacheWritePerM: 1.25, cacheReadPerM: 0.1,
      },
    },
  })
  const [offlineAccounts, setOfflineAccounts] = useState([])
  const [offlineModulePricing, setOfflineModulePricing] = useState([])
  const [desktopReleases, setDesktopReleases] = useState([])
  const [deletingReleaseVersion, setDeletingReleaseVersion] = useState(null)
  const [deleteReleaseResults, setDeleteReleaseResults] = useState({})
  const [editingLicense, setEditingLicense] = useState(null) // { licenseId, modules, expiresAt, status }
  const [newOfflineLicenseForm, setNewOfflineLicenseForm] = useState(null)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [isBusy, setIsBusy] = useState(false)
  const [actionDatabase, setActionDatabase] = useState('')
  const [isReconcilingPending, setIsReconcilingPending] = useState(false)
  const [tenantFilter, setTenantFilter] = useState('')
  const [selectedTenant, setSelectedTenant] = useState('')
  const [tenantDetails, setTenantDetails] = useState(null)
  const [tenantDetailsLoading, setTenantDetailsLoading] = useState(false)
  const [draftModules, setDraftModules] = useState([])
  const [epsilonSeatsGrantDraft, setEpsilonSeatsGrantDraft] = useState(null)
  const [isGrantingEpsilonSeats, setIsGrantingEpsilonSeats] = useState(false)
  const [epsilonUsage, setEpsilonUsage] = useState(null)
  const [epsilonUsageLoading, setEpsilonUsageLoading] = useState(false)
  const [epsilonTokensGrantDraft, setEpsilonTokensGrantDraft] = useState(null)
  const [isGrantingEpsilonTokens, setIsGrantingEpsilonTokens] = useState(false)
  const [epsilonOverview, setEpsilonOverview] = useState(null)
  // Standalone tenant-picker form on the Epsilon AI Usage tab — grants seats
  // directly by database, without first drilling into the Tenants tab's
  // per-tenant detail view (where the same free-grant action already
  // existed, just hard to find). Deliberately separate state/handler from
  // handleGrantEpsilonSeats above, which is wired to that drill-down view's
  // own tenantDetails/epsilonSeatsGrantDraft state.
  const [epsilonSubForm, setEpsilonSubForm] = useState({ database: '', seats: 1 })
  const [isCreatingEpsilonSub, setIsCreatingEpsilonSub] = useState(false)
  // Direct per-employee grant — a tenant's own super admin cannot edit their
  // own profile from Settings > Team Access (that screen only edits other
  // employees), so a seat granted to them here from Central Admin had no
  // self-service way to actually reach them. This is the immediate fix.
  const [epsilonEmployeeGrantForm, setEpsilonEmployeeGrantForm] = useState({ database: '', emailid: '' })
  const [isGrantingEmployeeAccess, setIsGrantingEmployeeAccess] = useState(false)
  // Holds the emailid currently being reset (or '' when idle) — a string,
  // not a boolean, so only that one row's button shows "Resetting..." when
  // several rows each have their own reset button (see the tenant profiles
  // table below).
  const [isResettingEmployeeRateLimit, setIsResettingEmployeeRateLimit] = useState('')
  // Which employee's Epsilon seat is currently being granted/revoked from
  // the tenant-detail table — an emailid string while in flight, '' when idle.
  const [isTogglingAiAccess, setIsTogglingAiAccess] = useState('')
  // The tenant detail drill-down used to stack ~9 unrelated sections
  // (billing, modules, Epsilon seats/tokens/usage, WC + tenant profile
  // tables, employees, activity) into one continuous two-column scroll with
  // no separation. Split into sub-tabs instead — the stats grid stays
  // always visible above them since it's a genuine at-a-glance summary.
  const [tenantDetailTab, setTenantDetailTab] = useState('billing')
  // Admin Settings stacked 3 unrelated concerns (account security, pricing
  // plans, global config) in one continuous scroll — split into sub-tabs.
  const [settingsSubTab, setSettingsSubTab] = useState('security')
  // Controlled + explicit-save, replacing an earlier onBlur-triggered save —
  // onBlur fired (and showed a "saved" notice) any time focus left the
  // field for any reason, including just clicking a Refresh button
  // elsewhere on the same tab, which looked like a spontaneous, unrequested
  // save to anyone using the page.
  const [epsilonSeatPriceDraft, setEpsilonSeatPriceDraft] = useState(0)
  const [isSavingSeatPrice, setIsSavingSeatPrice] = useState(false)
  // Deliberately NOT the shared isBusy flag — that's also toggled by
  // unrelated background loads on this same tab (loadOfflineModulePricing,
  // loadEpsilonOverview), which made this button flash "Saving..." any time
  // one of those fired, not just when this action itself was in flight.
  const [isSavingTokenPrice, setIsSavingTokenPrice] = useState(false)
  const [isSavingModules, setIsSavingModules] = useState(false)
  const [isCleaningTestData, setIsCleaningTestData] = useState(false)
  const [enquiries, setEnquiries] = useState([])
  const [selectedEnquiry, setSelectedEnquiry] = useState(null)
  const [replyText, setReplyText] = useState('')
  const chatBottomRef = useRef(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Auto-scroll to latest message whenever replies update
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedEnquiry?.replies?.length, selectedEnquiry?._id])

  const getUnreadCount = (enq) => {
    if (!enq) return 0;
    let count = 0;
    // If the enquiry itself is unread (main message)
    if (enq.read === false || enq.read === undefined) count++;
    // Add unread replies from visitor
    if (enq.replies) {
      count += enq.replies.filter(r => r.repliedBy === 'visitor' && !r.read).length;
    }
    return count;
  }

  const totalSupportUnread = enquiries.reduce((acc, enq) => acc + getUnreadCount(enq), 0);

  const setNotice = (type, message) => {
    setFeedback({ type, message });
    setTimeout(()=>{
      setFeedback({type: '', message: ''})
    },4000)
  }

  const loadEnquiries = async () => {
    try {
      const response = await requestAdmin('GET', 'central/support/enquiries')
      if (!response.err && response.ok) {
        setEnquiries(response.enquiries || [])
      }
    } catch (err) {
      console.error('Failed to load enquiries', err)
    }
  }

  const handleSendReply = async () => {
    if (!selectedEnquiry || !replyText.trim()) return
    setIsBusy(true)
    try {
      const response = await requestAdmin('POST', 'central/support/reply', {
        enquiryId: selectedEnquiry._id,
        replyMessage: replyText
      })
      if (!response.err) {
        setNotice('success', 'Reply sent successfully!')
        setReplyText('')
        refreshSelectedEnquiry()
        loadEnquiries() // Refresh list for status update
      } else {
        setNotice('error', response.error || 'Failed to send reply.')
      }
    } catch (err) {
      setNotice('error', 'Network error.')
    } finally {
      setIsBusy(false)
    }
  }

  const refreshSelectedEnquiry = async () => {
    if (!selectedEnquiry) return
    setIsBusy(true)
    try {
      const updated = await requestAdmin('GET', `central/support/enquiry/${selectedEnquiry._id}`)
      if (!updated.err && updated.ok) setSelectedEnquiry(updated.enquiry)
    } catch (err) {
      console.error('Refresh error', err)
    } finally {
      setIsBusy(false)
    }
  }

  const loadSessions = async (db = '', email = '') => {
    setIsSessionsLoading(true)
    try {
      const response = await requestAdmin('POST', 'admin/tenant/user-sessions', { database: db, emailid: email })
      if (!response.err && response.ok) {
        setSessionsData({
          activeSessions: response.activeSessions || [],
          recentHistory: response.recentHistory || []
        })
      }
    } catch (err) {
      console.error('Failed to load sessions', err)
    } finally {
      setIsSessionsLoading(false)
    }
  }

  const fetchLogs = async (filter) => {
    try {
      const response = await requestAdmin('POST', 'admin/platform/logs', filter)
      if (!response.err && response.ok) {
        setPlatformLogs({ logs: response.logs, total: response.total })
      }
    } catch (err) {
      console.error('Log fetch error', err)
    }
  }

  const loadPlatformHealth = async () => {
    setIsHealthLoading(true)
    try {
      const [logsRes, healthRes] = await Promise.all([
        requestAdmin('POST', 'admin/platform/logs', logFilter),
        requestAdmin('GET', 'admin/platform/health-summary')
      ])
      if (!logsRes.err && logsRes.ok) setPlatformLogs({ logs: logsRes.logs, total: logsRes.total })
      if (!healthRes.err && healthRes.ok) setHealthSummary(healthRes)
    } catch (err) {
      console.error('Failed to load health data', err)
    } finally {
      setIsHealthLoading(false)
    }
  }

  const loadSnapshot = async () => {
    setIsBusy(true)
    try {
      loadEnquiries() // Also load enquiries
      const response = await requestAdmin('POST', 'admin/dashboard/snapshot', {})
      if (response.err || !response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearAdminToken()
          setAdminUser(null)
        }
        throw new Error(response.mess || 'Unable to load central admin snapshot.')
      }
      setSnapshot({
        generatedAt: response.generatedAt || Date.now(),
        summary: response.summary || {},
        tenants: response.tenants || [],
        recentPayments: response.recentPayments || [],
        recentOrders: response.recentOrders || [],
        recentActivities: response.recentActivities || [],
        adminUsers: response.adminUsers || [],
        plans: response.plans || [],
        settings: response.settings || { defaultFreeTrialDays: 14 },
      })
      setGlobalSettingsForm({
        defaultFreeTrialDays: response.settings?.defaultFreeTrialDays || 14,
        desktopOfflineIntervalDays: response.settings?.desktopOfflineIntervalDays || 15,
        epsilonEnabled: response.settings?.epsilonEnabled !== false,
        epsilonModel: response.settings?.epsilonModel || 'claude-sonnet-5',
        epsilonFastModel: response.settings?.epsilonFastModel || 'claude-haiku-4-5-20251001',
        epsilonFastModelEnabled: response.settings?.epsilonFastModelEnabled !== false,
        epsilonTokenPriceNaira: response.settings?.epsilonTokenPriceNaira || 5,
        epsilonRateLimitTokens: response.settings?.epsilonRateLimitTokens || 50000,
        epsilonRateLimitWindowHours: response.settings?.epsilonRateLimitWindowHours || 5,
        epsilonUsdToNgn: response.settings?.epsilonUsdToNgn || 1600,
        epsilonModelRatesUsd: response.settings?.epsilonModelRatesUsd || {
          'claude-sonnet-5': {
            inputPerM: 3, outputPerM: 15, cacheWritePerM: 3.75, cacheReadPerM: 0.3,
          },
          'claude-haiku-4-5-20251001': {
            inputPerM: 1, outputPerM: 5, cacheWritePerM: 1.25, cacheReadPerM: 0.1,
          },
        },
      })
      setManualForm((current) => ({
        ...current,
        database: current.database || response.tenants?.[0]?.database || '',
      }))
      setTrialForm((current) => ({
        ...current,
        database: current.database || response.tenants?.[0]?.database || '',
      }))
    } catch (error) {
      setNotice('error', error.message || 'Unable to load central admin snapshot.')
    } finally {
      setIsBusy(false)
    }
  }

  // "Refresh Central Data" previously only called loadSnapshot — the core
  // tenants/payments/settings snapshot — leaving every section added since
  // (offline licenses, offline module pricing, desktop releases, live
  // sessions, platform health) stale until its own tab was clicked again.
  // This refreshes everything the whole app can show, in parallel, from one
  // button, regardless of which tab happens to be active — each loader
  // already sets only the state relevant to its own section, so calling
  // ones for tabs the admin isn't currently looking at is harmless.
  const refreshAllCentralAdminData = async () => {
    await Promise.all([
      loadSnapshot(),
      loadSessions(),
      loadPlatformHealth(),
      loadOfflineLicenses(),
      loadOfflineModulePricing(),
      loadDesktopReleases(),
    ])
  }

  const checkAuth = async () => {
    setIsAuthChecking(true)
    const response = await requestAdmin('POST', 'admin/auth/me', {})
    if (!response.err && response.ok && response.admin) {
      setAdminUser(response.admin)
      await loadSnapshot()
    } else {
      clearAdminToken()
      setAdminUser(null)
    }
    setIsAuthChecking(false)
  }

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!adminUser) return

    const token = getStoredAdminToken()
    const sse = new EventSource(`${SERVER}/central/support/stream?token=${token}`)

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'reply') {
          // Update selected enquiry if it's the one being viewed
          setSelectedEnquiry(prev => {
            if (prev && prev._id === data.enquiryId) {
              const updatedReplies = [...(prev.replies || []), data.reply]
              return { ...prev, replies: updatedReplies, status: 'replied' }
            }
            return prev
          })
          // Also update in list
          setEnquiries(prev => prev.map(enq => 
            enq._id === data.enquiryId ? { ...enq, status: 'replied' } : enq
          ))
        } else {
          // New enquiry
          setEnquiries(prev => [data, ...prev])
          setNotice('info', `New support enquiry from ${data.name}`)
        }
      } catch (err) {
        console.error('SSE Parse Error', err)
      }
    }

    sse.onerror = (err) => {
      console.error('SSE Connection Error', err)
      sse.close()
    }

    return () => sse.close()
  }, [adminUser])

  // Keeps the Epsilon seat-price field showing the live value whenever
  // module pricing (re)loads, without fighting an admin who is mid-edit —
  // see epsilonSeatPriceDraft's own comment for why this replaced onBlur.
  useEffect(() => {
    const row = offlineModulePricing.find((m) => m.key === 'epsilon')
    if (row) setEpsilonSeatPriceDraft(row.priceNaira || 0)
  }, [offlineModulePricing])

  const handleLoginInput = (event) => {
    const { name, value } = event.target
    setLoginForm((current) => ({ ...current, [name]: value }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setIsBusy(true)
    setNotice('', '')
    const response = await requestAdmin('POST', 'admin/auth/login', loginForm)
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Unable to log in to central admin.')
      setIsBusy(false)
      return
    }
    if (response.accessToken) {
      storeAdminToken(response.accessToken)
    }
    setAdminUser(response.admin || null)
    if (response.mustChangePassword) {
      setActiveTab('settings')
      setNotice('error', 'Password change required before continuing.')
    } else {
      setActiveTab('overview')
      setNotice('success', 'Central admin login successful.')
    }
    await loadSnapshot()
    setIsBusy(false)
  }

  const handleLogout = async () => {
    setIsBusy(true)
    await requestAdmin('POST', 'admin/auth/logout', {})
    clearAdminToken()
    setAdminUser(null)
    setSnapshot({
      generatedAt: 0,
      summary: {},
      tenants: [],
      recentPayments: [],
      recentOrders: [],
      recentActivities: [],
      adminUsers: [],
      plans: [],
    })
    setIsBusy(false)
  }

  const handlePasswordInput = (event) => {
    const { name, value } = event.target
    setPasswordForm((current) => ({ ...current, [name]: value }))
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setNotice('error', 'Current and new passwords are required.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setNotice('error', 'New password confirmation does not match.')
      return
    }
    setIsBusy(true)
    const response = await requestAdmin('POST', 'admin/auth/change-password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Unable to change admin password.')
      setIsBusy(false)
      return
    }
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setNotice('success', response.mess || 'Admin password changed successfully.')
    await checkAuth()
    setIsBusy(false)
  }

  const handleRunDocumentNumberingMigration = async () => {
    if (!migrationRunAll && !migrationTenant) {
      setNotice('error', 'Select a tenant, or check "Run for all tenants".')
      return
    }
    if (migrationDropOldIndexes && !window.confirm(
      'Dropping old indexes is a one-way step. Only do this once you have confirmed the new app build (with clientTxnId/documentNo) is live for the affected tenant(s). Continue?'
    )) {
      return
    }
    setMigrationRunning(true)
    setMigrationOutcome(null)
    const response = await requestAdmin('POST', 'admin/maintenance/run-document-numbering-migration', {
      ...(migrationRunAll ? { all: true } : { database: migrationTenant }),
      dropOldIndexes: migrationDropOldIndexes,
    })
    setMigrationRunning(false)
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Migration failed.')
      setMigrationOutcome({ ok: false, mess: response.mess, log: response.log || [] })
      return
    }
    setNotice('success', 'Migration completed.')
    setMigrationOutcome({ ok: true, results: response.results || [], log: response.log || [] })
  }

  const handleManualField = (event) => {
    const { name, value } = event.target
    setManualForm((current) => ({
      ...current,
      [name]: ['months', 'amountNaira'].includes(name) ? Number(value) : value,
    }))
  }

  const handleTrialField = (event) => {
    const { name, value } = event.target
    setTrialForm((current) => ({
      ...current,
      [name]: name === 'trialDays' ? Number(value) : value,
    }))
  }

  const handleManualMarkPaid = async (event) => {
    event.preventDefault()
    if (!manualForm.database) {
      setNotice('error', 'Select a tenant database first.')
      return
    }
    setActionDatabase(manualForm.database)
    const response = await requestAdmin('POST', 'billing/adminMarkCompanySubscriptionPaid', manualForm)
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Unable to create or extend the tenant subscription.')
      setActionDatabase('')
      return
    }
    setNotice('success', 'Tenant subscription created/updated successfully.')
    await loadSnapshot()
    setActionDatabase('')
  }

  const handleTogglePause = async (database, manualPauseDB) => {
    setActionDatabase(database)
    const response = await requestAdmin('POST', 'billing/adminSetCompanyPause', { database, manualPauseDB })
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Unable to update tenant suspension state.')
      setActionDatabase('')
      return
    }
    setNotice('success', manualPauseDB ? 'Tenant suspended successfully.' : 'Tenant restored successfully.')
    await loadSnapshot()
    setActionDatabase('')
  }

  const handleTrialAction = async (trialAction, databaseOverride = '') => {
    const database = databaseOverride || trialForm.database
    if (!database) {
      setNotice('error', 'Select a tenant database for the trial action first.')
      return
    }
    setActionDatabase(database)
    const response = await requestAdmin('POST', 'billing/adminManageCompanyTrial', {
      database,
      trialAction,
      trialDays: trialForm.trialDays,
      trialStartAt: trialForm.trialStartAt,
      note: trialForm.note,
    })
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Unable to update tenant free trial state.')
      setActionDatabase('')
      return
    }
    const successLabel = trialAction === 'create'
      ? 'Free trial created successfully.'
      : (trialAction === 'extend'
        ? 'Free trial extended successfully.'
        : (trialAction === 'resume' ? 'Free trial resumed successfully.' : 'Free trial suspended successfully.'))
    setNotice('success', successLabel)
    await loadSnapshot()
    if (selectedTenant === database) {
      await loadTenantDetails(database)
    }
    setActionDatabase('')
  }

  const handleTenantBillingControl = async (database, action, authorizationCode = '') => {
    if (!database) {
      setNotice('error', 'Select a tenant database first.')
      return
    }
    setActionDatabase(database)
    const endpoint = action === 'remove-card'
      ? 'billing/adminRemoveCompanyCard'
      : 'billing/adminCancelCompanySubscription'
    const response = await requestAdmin('POST', endpoint, { database, authorizationCode })
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Unable to update tenant Paystack subscription settings.')
      setActionDatabase('')
      return
    }
    setNotice('success', action === 'remove-card' ? 'Tenant card removal processed.' : 'Tenant auto-renewal cancelled.')
    await loadSnapshot()
    if (selectedTenant === database) {
      await loadTenantDetails(database)
    }
    setActionDatabase('')
  }

  // Client-side optimistic dependency expansion only, for responsive
  // checkbox behavior — wageserver's moduleCatalog.js's resolveModuleDependencies
  // always re-resolves server-side before anything is actually saved.
  const resolveModuleDepsClientSide = (catalog, selection) => {
    const selected = new Set(selection)
    let changed = true
    while (changed) {
      changed = false
      ;(catalog || []).forEach((app) => {
        if (selected.has(app.key) && app.deps?.length) {
          app.deps.forEach((dep) => {
            if (!selected.has(dep)) { selected.add(dep); changed = true }
          })
        }
      })
    }
    return Array.from(selected)
  }

  const toggleDraftModule = (key) => {
    setDraftModules((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return resolveModuleDepsClientSide(tenantDetails?.moduleCatalog, Array.from(next))
    })
  }

  // Shared by both offline-license admin forms (manual create + edit) — a
  // checkbox picker with the same automatic-dependency-expansion behavior
  // as toggleDraftModule above, plus an always-visible, non-interactive list
  // of essential/free modules (auto-granted to every tenant regardless of
  // selection — see resolveEffectiveModules in moduleCatalog.js — so there's
  // nothing to check, just something worth showing so an admin isn't left
  // wondering why core modules aren't in the picker).
  const toggleOfflineFormModule = (currentModules, setModules, key) => {
    const next = new Set(currentModules)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setModules(resolveModuleDepsClientSide(offlineModulePricing, Array.from(next)))
  }

  const renderOfflineModulePicker = (selectedModules, setModules) => (
    <div className='full'>
      <span style={{ display: 'block', marginBottom: 6 }}>Modules</span>
      <div style={{ fontSize: 12, color: 'var(--ca-text-muted)', marginBottom: 8 }}>
        Essential (always included automatically, no selection needed): {offlineModulePricing.filter(m => m.tier === 'free').map(m => m.name).join(', ') || '—'}
      </div>
      {/* Epsilon is never offered here — it's excluded from the Electron/
          offline build entirely (no Anthropic key, no per-seat billing
          concept there), so a desktop license could never actually use it
          even if selected. */}
      <div className='ca-module-grid'>
        {offlineModulePricing.filter(m => m.tier === 'standard' && m.key !== 'epsilon').map((m) => {
          const Icon = MODULE_ICONS[m.key]
          return (
            <label key={m.key} className='ca-module-chip'>
              <input
                type='checkbox'
                checked={selectedModules.includes(m.key)}
                onChange={() => toggleOfflineFormModule(selectedModules, setModules, m.key)}
              />
              {Icon && <span className='ca-module-icon'><Icon /></span>}
              <span className='ca-module-chip-name'>{m.name}</span>
              <span className='ca-module-chip-price'>₦{Number(m.offlineYearlyPriceNaira || 0).toLocaleString()}/yr</span>
            </label>
          )
        })}
      </div>
    </div>
  )

  const handleSaveTenantModules = async () => {
    if (!selectedTenant) return
    setIsSavingModules(true)
    const response = await requestAdmin('POST', 'billing/adminSetTenantModules', { database: selectedTenant, modules: draftModules })
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Unable to update tenant modules.')
      setIsSavingModules(false)
      return
    }
    setNotice('success', 'Tenant modules updated.')
    await loadTenantDetails(selectedTenant)
    setIsSavingModules(false)
  }

  const handleGrantEpsilonSeats = async (database) => {
    if (!database) return
    const seats = epsilonSeatsGrantDraft !== null
      ? epsilonSeatsGrantDraft
      : Number(tenantDetails.companyProfile?.epsilonSeats || 0)
    setIsGrantingEpsilonSeats(true)
    const response = await requestAdmin('POST', 'admin/billing/grantEpsilonSeats', { database, seats })
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Unable to update Epsilon seats.')
      setIsGrantingEpsilonSeats(false)
      return
    }
    setNotice('success', `Epsilon seats set to ${response.epsilonSeats}.`)
    setEpsilonSeatsGrantDraft(null)
    await loadTenantDetails(database)
    setIsGrantingEpsilonSeats(false)
  }

  const handleEpsilonSubField = (e) => {
    const { name, value } = e.target
    setEpsilonSubForm((prev) => ({ ...prev, [name]: value }))
  }

  // Same admin/billing/grantEpsilonSeats endpoint as handleGrantEpsilonSeats
  // — a free grant that bypasses Paystack entirely, exactly like the manual
  // "Create or extend tenant subscription" form does for the general
  // subscription. Setting seats to 0 here is how an admin revokes an
  // Epsilon subscription this same way, without a separate control.
  const handleCreateEpsilonSubscription = async (e) => {
    e.preventDefault()
    if (!epsilonSubForm.database) {
      setNotice('error', 'Select a tenant first.')
      return
    }
    const seats = Math.max(0, Math.floor(Number(epsilonSubForm.seats) || 0))
    setIsCreatingEpsilonSub(true)
    const response = await requestAdmin('POST', 'admin/billing/grantEpsilonSeats', { database: epsilonSubForm.database, seats })
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Unable to create the Epsilon subscription for this tenant.')
      setIsCreatingEpsilonSub(false)
      return
    }
    setNotice('success', `Epsilon subscription set for ${epsilonSubForm.database} — ${response.epsilonSeats} seat(s) granted.`)
    // Keep the drill-down view in sync if the admin already has this same
    // tenant open there.
    if (epsilonSubForm.database === selectedTenant) {
      await loadTenantDetails(epsilonSubForm.database)
    }
    setIsCreatingEpsilonSub(false)
  }

  const handleEpsilonEmployeeGrantField = (e) => {
    const { name, value } = e.target
    setEpsilonEmployeeGrantForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleGrantEmployeeEpsilonAccess = async (e) => {
    e.preventDefault()
    if (!epsilonEmployeeGrantForm.database || !epsilonEmployeeGrantForm.emailid) {
      setNotice('error', 'Select a tenant and enter the employee email.')
      return
    }
    setIsGrantingEmployeeAccess(true)
    const response = await requestAdmin('POST', 'admin/billing/epsilon/grant-employee-access', {
      database: epsilonEmployeeGrantForm.database,
      emailid: epsilonEmployeeGrantForm.emailid.trim(),
    })
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Unable to grant Epsilon access to this employee.')
      setIsGrantingEmployeeAccess(false)
      return
    }
    setNotice('success', `Epsilon access granted to ${response.emailid}. They may need to log out and back in for it to appear.`)
    setIsGrantingEmployeeAccess(false)
  }

  // Deliberately platform-operator-only (see epsilonBilling.js's route
  // comment) — a workspace's own admin can't self-serve an early rate-limit
  // reset, since that would defeat the point of the limit. Takes explicit
  // database/emailid so it works both from the standalone form below AND
  // from a per-row button next to every actual AI-seat holder in the
  // tenant detail view (Profile.aiAccess) — not just whichever email
  // happens to be typed into the form, so the action is genuinely
  // available for every seated user, not only the one the operator already
  // knows to look for.
  const handleResetEmployeeRateLimit = async (database, emailid) => {
    if (!database || !emailid) {
      setNotice('error', 'Select a tenant and enter the employee email.')
      return
    }
    setIsResettingEmployeeRateLimit(emailid)
    const response = await requestAdmin('POST', 'admin/billing/epsilon/reset-rate-limit', { database, emailid })
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Unable to reset this employee\'s rate limit.')
      setIsResettingEmployeeRateLimit('')
      return
    }
    setNotice('success', response.mess || 'Rate limit reset.')
    setIsResettingEmployeeRateLimit('')
  }

  // Operator-level grant/revoke of one employee's Epsilon seat, straight
  // from the tenant-detail table — the platform side of the same toggle a
  // tenant's own admin already has in their Settings > Team Access screen
  // (Profile.aiAccess). Deliberately does NOT check the tenant's purchased
  // seat count/usedSeats here: this is a support/override action (same
  // spirit as Reset Rate Limit above, which a tenant can't self-serve
  // either), not the normal per-tenant seat-purchase flow — an operator
  // granting access is an intentional exception, not something that should
  // be silently blocked by a seat count a tenant admin would also be bound
  // by. Reuses the existing /admin/billing/epsilon/grant-employee-access
  // route (billing.js) — already supported true/false, it just had no
  // general-purpose UI in Central Admin before this.
  const handleToggleEmployeeAiAccess = async (database, emailid, nextAiAccess) => {
    if (!database || !emailid) {
      setNotice('error', 'Select a tenant and enter the employee email.')
      return
    }
    setIsTogglingAiAccess(emailid)
    const response = await requestAdmin('POST', 'admin/billing/epsilon/grant-employee-access', { database, emailid, aiAccess: nextAiAccess })
    if (response.err || !response.ok) {
      setNotice('error', response.mess || `Unable to ${nextAiAccess ? 'grant' : 'revoke'} Epsilon access for this employee.`)
      setIsTogglingAiAccess('')
      return
    }
    setNotice('success', `Epsilon access ${nextAiAccess ? 'granted to' : 'revoked from'} ${emailid}.`)
    // Refetch the whole tenant-detail view (same pattern the tenant-facing
    // Settings screen uses after its own aiAccess toggle) rather than
    // patching tenantDetails.tenantProfiles locally — keeps this in sync
    // with whatever else loadTenantDetails already bundles for this tenant.
    await loadTenantDetails(database)
    setIsTogglingAiAccess('')
  }

  const handleSaveEpsilonSeatPrice = async () => {
    setIsSavingSeatPrice(true)
    await handleUpdateModulePricing(
      'epsilon',
      Number(epsilonSeatPriceDraft) || 0,
      offlineModulePricing.find((m) => m.key === 'epsilon')?.offlineYearlyPriceNaira
    )
    setIsSavingSeatPrice(false)
  }

  const handleVerifyPendingPayments = async () => {
    setIsReconcilingPending(true)
    setNotice('', '')
    const response = await requestAdmin('POST', 'billing/adminVerifyPendingPayments', {})
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Unable to reconcile pending Paystack payments.')
      setIsReconcilingPending(false)
      return
    }
    const paidCount = Array.isArray(response.results)
      ? response.results.filter((entry) => entry?.result?.ok || entry?.result?.status === 'paid').length
      : 0
    setNotice('success', `Pending Paystack reconciliation complete. Checked ${response.checked || 0} order(s); recovered ${paidCount} paid transaction(s).`)
    await loadSnapshot()
    setIsReconcilingPending(false)
  }

  const handleCleanupTestData = async () => {
    if (!window.confirm("Are you sure you want to delete ALL test-mode subscription orders and payments? This action will affect both central and tenant databases and cannot be undone.")) return;
    
    setIsCleaningTestData(true)
    setNotice('', '')
    try {
      const response = await requestAdmin('POST', 'admin/billing/cleanup-test-data', {})
      if (response.err || !response.ok) {
        throw new Error(response.mess || 'Unable to cleanup test data.')
      }
      setNotice('success', response.mess || 'Test data cleanup successful.')
      await loadSnapshot()
    } catch (error) {
      setNotice('error', error.message || 'Cleanup failed.')
    } finally {
      setIsCleaningTestData(false)
    }
  }

  const handleDeleteTransaction = async (reference, database) => {
    if (!window.confirm(`Delete test transaction ${reference}?`)) return;
    setIsBusy(true);
    try {
      const response = await requestAdmin('POST', 'admin/billing/delete-single-transaction', { reference, database });
      if (response.err || !response.ok) throw new Error(response.mess || 'Deletion failed.');
      setNotice('success', 'Transaction removed.');
      await loadSnapshot();
    } catch (error) {
      setNotice('error', error.message);
    } finally {
      setIsBusy(false);
    }
  }

  const handleUpdatePlan = async (e) => {
    if (e) e.preventDefault();
    if (!planForm.key) return;
    setIsBusy(true);
    try {
      const response = await requestAdmin('POST', 'admin/billing/update-plan', { plan: planForm });
      if (response.err || !response.ok) throw new Error(response.mess || 'Failed to update plan.');
      setNotice('success', response.mess);
      await loadSnapshot();
    } catch (error) {
      setNotice('error', error.message);
    } finally {
      setIsBusy(false);
    }
  }

  const handleCreatePlan = async (e) => {
    if (e) e.preventDefault();
    if (!planForm.key) return;
    setIsBusy(true);
    try {
      const response = await requestAdmin('POST', 'admin/billing/create-plan', { plan: planForm });
      if (response.err || !response.ok) throw new Error(response.mess || 'Failed to create plan.');
      setNotice('success', response.mess);
      setPlanForm({ key: '', name: '', description: '', amountNaira: 0, interval: 'monthly' });
      await loadSnapshot();
    } catch (error) {
      setNotice('error', error.message);
    } finally {
      setIsBusy(false);
    }
  }

  const handleDeletePlan = async (key) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${key}"?`)) return;
    setIsBusy(true);
    try {
      const response = await requestAdmin('POST', 'admin/billing/delete-plan', { key });
      if (response.err || !response.ok) throw new Error(response.mess || 'Failed to delete plan.');
      setNotice('success', response.mess);
      await loadSnapshot();
    } catch (error) {
      setNotice('error', error.message);
    } finally {
      setIsBusy(false);
    }
  }

  const handleUpdateGlobalSettings = async (e) => {
    if (e) e.preventDefault();
    setIsBusy(true);
    try {
      const response = await requestAdmin('POST', 'admin/settings/update-global', globalSettingsForm);
      if (response.err || !response.ok) throw new Error(response.mess || 'Failed to update settings.');
      setNotice('success', response.mess);
      await loadSnapshot();
    } catch (error) {
      setNotice('error', error.message);
    } finally {
      setIsBusy(false);
    }
  }

  const editPlan = (plan) => {
    setPlanForm({ ...plan });
  }

  // ================================================================
  // Offline licenses — full visibility + direct edit, per requirement.
  // ================================================================
  const loadOfflineLicenses = async () => {
    setIsBusy(true)
    try {
      const response = await requestAdmin('GET', 'admin/offline-licenses/list')
      if (response.err || !response.ok) throw new Error(response.mess || 'Failed to load offline licenses.')
      setOfflineAccounts(response.accounts || [])
    } catch (error) {
      setNotice('error', error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const loadDesktopReleases = async () => {
    setIsBusy(true)
    try {
      const response = await requestAdmin('GET', 'admin/desktop-releases/list')
      if (response.err || !response.ok) throw new Error(response.mess || 'Failed to load desktop releases.')
      setDesktopReleases(response.releases || [])
    } catch (error) {
      setNotice('error', error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const handleDeleteDesktopRelease = async (version) => {
    if (!window.confirm(
      `Permanently delete desktop release v${version}? This removes its installer and blockmap from Google Drive and its record from the database. This cannot be undone.` +
      (desktopReleases[0]?.version === version ? '\n\nThis is the CURRENT version — deleting it means the next most recent release becomes what desktop installs auto-update to.' : '')
    )) return;

    setDeletingReleaseVersion(version);
    setDeleteReleaseResults((prev) => ({ ...prev, [version]: null }));
    try {
      const response = await requestAdmin('POST', `admin/desktop-releases/${encodeURIComponent(version)}/delete`);
      setDeleteReleaseResults((prev) => ({ ...prev, [version]: response }));
      if (response.err && !response.results) throw new Error(response.mess || 'Failed to delete release.');
      if (response.ok) {
        setNotice('success', response.mess || 'Release deleted.');
        await loadDesktopReleases();
      } else {
        setNotice('error', response.mess || 'Some files could not be deleted — see details below.');
      }
    } catch (error) {
      setDeleteReleaseResults((prev) => ({ ...prev, [version]: { ok: false, mess: error.message, results: [] } }));
      setNotice('error', error.message);
    } finally {
      setDeletingReleaseVersion(null);
    }
  }

  // Per-file success/failure with reasons for the most recent delete attempt
  // on this version — stays visible until the next attempt or a page
  // navigation, rather than the 4-second auto-clearing toast, since a
  // partial failure needs the admin to actually read which file failed and
  // why before retrying.
  const renderReleaseDeleteResult = (version) => {
    const result = deleteReleaseResults[version];
    if (!result) return null;
    return (
      <div style={{ marginTop: 6, fontSize: 12 }}>
        {(result.results || []).map((r) => (
          <div key={r.name} style={{ color: r.success ? '#2e7d32' : '#c62828' }}>
            {r.success ? '✓' : '✗'} {r.name} — {r.reason}
          </div>
        ))}
        {!result.ok && <p style={{ color: '#c62828', margin: '4px 0 0' }}>{result.mess}</p>}
      </div>
    );
  }

  const loadOfflineModulePricing = async () => {
    setIsBusy(true)
    try {
      const response = await requestAdmin('GET', 'admin/billing/module-pricing/list')
      if (response.err || !response.ok) throw new Error(response.mess || 'Failed to load module pricing.')
      setOfflineModulePricing(response.pricing || [])
    } catch (error) {
      setNotice('error', error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const handleUpdateModulePricing = async (key, priceNaira, offlineYearlyPriceNaira) => {
    setIsBusy(true)
    try {
      const response = await requestAdmin('POST', 'admin/billing/update-module-pricing', { key, priceNaira, offlineYearlyPriceNaira })
      if (response.err || !response.ok) throw new Error(response.mess || 'Failed to update module pricing.')
      setNotice('success', response.mess)
      await loadOfflineModulePricing()
    } catch (error) {
      setNotice('error', error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const handleUpdateOfflineLicense = async (e) => {
    if (e) e.preventDefault()
    if (!editingLicense?.licenseId) return
    setIsBusy(true)
    try {
      const response = await requestAdmin('POST', 'admin/offline-licenses/update', editingLicense)
      if (response.err || !response.ok) throw new Error(response.mess || 'Failed to update license.')
      setNotice('success', response.mess)
      setEditingLicense(null)
      await loadOfflineLicenses()
    } catch (error) {
      setNotice('error', error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const handleCreateOfflineLicense = async (e) => {
    if (e) e.preventDefault()
    if (!newOfflineLicenseForm) return
    setIsBusy(true)
    try {
      const response = await requestAdmin('POST', 'admin/offline-licenses/create', newOfflineLicenseForm)
      if (response.err || !response.ok) throw new Error(response.mess || 'Failed to create license.')
      setNotice('success', response.mess)
      setNewOfflineLicenseForm(null)
      await loadOfflineLicenses()
    } catch (error) {
      setNotice('error', error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const filteredTenants = useMemo(() => {
    const token = tenantFilter.trim().toLowerCase()
    if (!token) return snapshot.tenants
    return (snapshot.tenants || []).filter((tenant) => (
      String(tenant.companyName || '').toLowerCase().includes(token) ||
      String(tenant.database || '').toLowerCase().includes(token) ||
      String(tenant.subdomain || '').toLowerCase().includes(token)
    ))
  }, [snapshot.tenants, tenantFilter])

  const tenantConnectionGroups = useMemo(() => {
    const groups = (sessionsData.activeSessions || []).reduce((acc, session) => {
      const db = session.tenant || session.db || 'unknown';
      if (!acc[db]) acc[db] = [];
      acc[db].push(session);
      return acc;
    }, {});
    return Object.entries(groups);
  }, [sessionsData.activeSessions]);

  const overviewMetrics = useMemo(() => ([
    { label: 'Tracked Tenants', value: snapshot.summary.totalTenants || 0, note: 'All registered workspaces the central admin can inspect.' },
    { label: 'Active Subscriptions', value: snapshot.summary.activeTenants || 0, note: 'Currently active and available to use.' },
    { label: 'Trial Workspaces', value: snapshot.summary.trialTenants || 0, note: 'Tenants currently operating on the free-trial window.' },
    { label: 'Workspace Users', value: snapshot.summary.totalUsers || 0, note: 'All user records connected across the tenant estate.' },
    { label: 'Employees on Record', value: snapshot.summary.totalEmployees || 0, note: 'Live employee footprints across tenant databases.' },
    { label: 'Live Active Sessions', value: snapshot.summary.totalActiveSessions || 0, note: 'Users currently logged into the platform estate.' },
    { 
      label: 'Platform Health', 
      value: snapshot.summary.health?.toUpperCase() || 'HEALTHY', 
      note: `Detected ${snapshot.summary.totalErrors24h || 0} issues in last 24h.`,
      status: snapshot.summary.health 
    },
  ]), [snapshot.summary])

  const loadTenantDetails = async (database) => {
    if (!database) return
    setSelectedTenant(database)
    setManualForm((current) => ({ ...current, database }))
    setTrialForm((current) => ({ ...current, database }))
    setTenantDetailsLoading(true)
    try {
      const response = await requestAdmin('POST', 'admin/tenant/details', { database })
      if (response.err || !response.ok) {
        throw new Error(response.mess || 'Unable to load tenant details.')
      }
      setTenantDetails(response)
      const allKeys = (response.moduleCatalog || []).map((m) => m.key)
      setDraftModules(Array.isArray(response.enabledModules) ? response.enabledModules : allKeys)
    } catch (error) {
      setNotice('error', error.message || 'Unable to load tenant details.')
    } finally {
      setTenantDetailsLoading(false)
    }
    loadEpsilonTenantUsage(database)
  }

  const loadEpsilonTenantUsage = async (database) => {
    if (!database) return
    setEpsilonUsageLoading(true)
    try {
      const response = await requestAdmin('GET', `billing/epsilon/tenant-usage?database=${encodeURIComponent(database)}`)
      if (response.err || !response.ok) throw new Error(response.mess || 'Unable to load Epsilon usage.')
      setEpsilonUsage(response)
    } catch (error) {
      setEpsilonUsage(null)
      setNotice('error', error.message || 'Unable to load Epsilon usage.')
    } finally {
      setEpsilonUsageLoading(false)
    }
  }

  const handleGrantEpsilonTokens = async (database) => {
    if (!database) return
    const tokens = epsilonTokensGrantDraft !== null
      ? epsilonTokensGrantDraft
      : Number(epsilonUsage?.epsilonTokenBalance || 0)
    setIsGrantingEpsilonTokens(true)
    const response = await requestAdmin('POST', 'admin/billing/epsilon/grant-tokens', { database, tokens })
    if (response.err || !response.ok) {
      setNotice('error', response.mess || 'Unable to update Epsilon token balance.')
      setIsGrantingEpsilonTokens(false)
      return
    }
    setNotice('success', `Epsilon token balance set to ${response.epsilonTokenBalance.toLocaleString()}.`)
    setEpsilonTokensGrantDraft(null)
    await loadEpsilonTenantUsage(database)
    setIsGrantingEpsilonTokens(false)
  }

  const loadEpsilonOverview = async () => {
    try {
      const response = await requestAdmin('GET', 'billing/epsilon/overview')
      if (response.err || !response.ok) return
      setEpsilonOverview(response)
    } catch (error) {
      // Non-fatal — the overview cards just stay empty; the rest of the
      // dashboard doesn't depend on this.
    }
  }

  if (isAuthChecking) {
    return (
      <div className='ca-loading-view'>
        <div className='ca-loading-content'>
          <div className='ca-loading-mark'>EC</div>
          <h2>Initialising Control Plane</h2>
          <p>Connecting to secure infrastructure...</p>
          <div className='ca-loading-bar'>
            <div className='ca-loading-progress'></div>
          </div>
          <span className='ca-loading-status'>Authenticating administrator...</span>
        </div>
      </div>
    )
  }

  if (!adminUser) {
    return (
      <div className='ca-login-page'>
        <div className='ca-login-card'>
          <div className='ca-login-mark'>EC</div>
          <div className='ca-login-kicker'>Enterprise Compute Central Admin</div>
          <h1>Independent platform control plane</h1>
          {feedback.message ? <div className={`ca-alert ${feedback.type}`}>{feedback.message}</div> : null}
          <form className='ca-login-form' onSubmit={handleLogin}>
            <label>
              <span>Admin username</span>
              <div className='ca-input-with-icon'>
                <span className='ca-input-icon'>👤</span>
                <input name='username' value={loginForm.username} onChange={handleLoginInput} />
              </div>
            </label>
            <label>
              <span>Password</span>
              <div className='ca-input-with-icon'>
                <span className='ca-input-icon'>🔒</span>
                <input name='password' type={showLoginPassword ? 'text' : 'password'} value={loginForm.password} onChange={handleLoginInput} />
                <button type='button' className='ca-toggle-pass' onClick={() => setShowLoginPassword((prev) => !prev)} tabIndex={-1}>
                  {showLoginPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </label>
            <button type='submit' disabled={isBusy}>{isBusy ? 'Signing in...' : 'Sign in to Central Admin'}</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={`ca-shell ${isSidebarCollapsed ? 'collapsed' : ''} ${isSidebarOpen ? 'mob-open' : ''}`}>
      <div className='ca-mobile-header'>
        <button className='ca-menu-toggle' onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? '✕' : '☰'}
        </button>
        <strong>Central Admin</strong>
      </div>

      <aside className={`ca-sidebar ${isSidebarOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <button className='ca-collapse-toggle' onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
          {isSidebarCollapsed ? '→' : '←'}
        </button>

        <div className='ca-brand'>
          <div className='ca-brand-mark'>EC</div>
          {!isSidebarCollapsed && (
            <div>
              <strong>Central Admin</strong>
              <span>admin.localhost / admin.epxcentral.com</span>
            </div>
          )}
        </div>

        {!isSidebarCollapsed && (
          <div className='ca-admin-badge'>
            <strong>{adminUser.displayName || adminUser.username}</strong>
            <span>{adminUser.mustChangePassword ? 'Password change recommended' : 'Access verified'}</span>
          </div>
        )}

        <nav className='ca-nav'>
          {[
            ['overview', 'Overview', '📊'],
            ['tenants', 'Tenants', '🏢'],
            ['sessions', 'User Sessions', '👥'],
            ['connectivity', 'Live Connectivity', '📡'],
            ['health', 'System Health', '🩺'],
            ['subscriptions', 'Subscriptions', '💳'],
            ['epsilonUsage', 'Epsilon AI Usage', '🤖'],
            ['offlineLicenses', 'Offline Licenses', '🔑'],
            ['desktopReleases', 'Desktop Releases', '💿'],
            ['support', 'Help & Support', '💬'],
            ['maintenance', 'Maintenance', '🛠️'],
            ['settings', 'Settings', '⚙️'],
          ].map(([key, label, icon]) => (
            <button
              key={key}
              className={`ca-nav-item ${activeTab === key ? 'active' : ''}`}
              title={isSidebarCollapsed ? label : ''}
              onClick={() => {
                setActiveTab(key);
                setIsSidebarOpen(false); // Close on mobile
                if (key === 'support') loadEnquiries();
                if (key === 'sessions' || key === 'connectivity') loadSessions();
                if (key === 'health') loadPlatformHealth();
                if (key === 'epsilonUsage') { loadEpsilonOverview(); loadOfflineModulePricing(); }
                if (key === 'offlineLicenses') { loadOfflineLicenses(); loadOfflineModulePricing(); }
                if (key === 'desktopReleases') loadDesktopReleases();
              }}
            >
              <span className='ca-nav-icon'>
                {icon}
                {key === 'support' && totalSupportUnread > 0 && (
                  <span className='ca-nav-badge'>{totalSupportUnread}</span>
                )}
              </span>
              {!isSidebarCollapsed && <span className='ca-nav-label'>{label}</span>}
            </button>
          ))}
        </nav>

        <div className='ca-sidebar-footer'>
          <button className='ca-ghost-btn' onClick={refreshAllCentralAdminData} disabled={isBusy} title={isSidebarCollapsed ? "Refresh" : ""}>
             {isSidebarCollapsed ? '🔄' : (isBusy ? 'Refreshing...' : 'Refresh Central Data')}
          </button>
          {!isSidebarCollapsed && <button className='ca-logout-btn' onClick={handleLogout}>Log out</button>}
          {isSidebarCollapsed && <button className='ca-logout-btn' onClick={handleLogout} title="Logout">🚪</button>}
        </div>
      </aside>

      <main className={`ca-main ca-${activeTab}-active`}>
        <header className='ca-header'>
          <div>
            <div className='ca-page-kicker'>Central admin platform</div>
            <h2>{activeTab === 'overview' ? 'Global operations view' : activeTab === 'tenants' ? 'Tenant estate' : activeTab === 'subscriptions' ? 'Subscriptions & billing' : activeTab === 'epsilonUsage' ? 'Epsilon AI usage & billing' : activeTab === 'offlineLicenses' ? 'Offline licenses' : activeTab === 'desktopReleases' ? 'Desktop app releases' : activeTab === 'maintenance' ? 'Maintenance & migrations' : 'Admin settings'}</h2>
            <p>Generated {formatDateTime(snapshot.generatedAt || Date.now())}</p>
          </div>
          <div className='ca-header-actions'>
            <div className='ca-header-chip'>
              <strong>{snapshot.summary.totalTenants || 0}</strong>
              <span>Tenants</span>
            </div>
            <div className='ca-header-chip warning'>
              <strong>{snapshot.summary.expiringSoon || 0}</strong>
              <span>Expiring</span>
            </div>
            <div className='ca-header-chip danger'>
              <strong>{snapshot.summary.suspendedTenants || 0}</strong>
              <span>Suspended</span>
            </div>
            <input
              className='ca-search'
              placeholder='Search company or database'
              value={tenantFilter}
              onChange={(event) => setTenantFilter(event.target.value)}
            />
          </div>
        </header>

        {feedback.message ? <div className={`ca-alert ${feedback.type}`}>{feedback.message}</div> : null}

        {activeTab === 'overview' && (
          <>
            <section className='ca-summary-grid'>
              {overviewMetrics.map((metric) => (
                <div className='ca-card' key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <p>{metric.note}</p>
                </div>
              ))}
              <div className='ca-card ca-card-accent'>
                <span>Attention Queue</span>
                <strong>{(snapshot.summary.expiringSoon || 0) + (snapshot.summary.suspendedTenants || 0)}</strong>
                <p>Expiring and suspended tenants that may require admin intervention.</p>
              </div>
              <div className='ca-card ca-card-accent danger'>
                <span>Admin Accounts</span>
                <strong>{snapshot.adminUsers.length}</strong>
                <p>Central admin identities with direct platform oversight permissions.</p>
              </div>
            </section>

            <section className='ca-grid-two'>
              <div className='ca-panel'>
                <div className='ca-panel-head'>
                  <h3>Recent tenant activity</h3>
                </div>
                <div className='ca-table-wrap'>
                  <table className='ca-table'>
                    <thead>
                      <tr>
                        <th>Tenant</th>
                        <th>Database</th>
                        <th>Last activity</th>
                        <th>Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTenants.length ? filteredTenants.slice(0, 8).map((tenant) => (
                        <tr key={tenant.database}>
                          <td>{tenant.companyName}</td>
                          <td>{tenant.database}</td>
                          <td>{formatDateTime(tenant.lastActivityAt)}</td>
                          <td>{tenant.usersCount || 0}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan='4' className='ca-empty'>No tenant records have been discovered yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className='ca-panel'>
                <div className='ca-panel-head'>
                  <h3>Central admin activity</h3>
                </div>
                <div className='ca-table-wrap'>
                  <table className='ca-table'>
                    <thead>
                      <tr>
                        <th>Actor</th>
                        <th>Action</th>
                        <th>Target</th>
                        <th>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.recentActivities.length ? snapshot.recentActivities.map((entry, index) => (
                        <tr key={`${entry.createdAt}-${index}`}>
                          <td>{entry.actor || '--'}</td>
                          <td>{entry.action || '--'}</td>
                          <td>{entry.target || '--'}</td>
                          <td>{formatDateTime(entry.createdAt)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan='4' className='ca-empty'>No admin activity recorded yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'tenants' && (
          <>
            <section className='ca-panel'>
              <div className='ca-panel-head'>
                <h3>All tenants, usage status, users, profiles, and database footprint</h3>
              </div>
              <div className='ca-table-wrap'>
                <table className='ca-table wide'>
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Subdomain</th>
                      <th>Subscription</th>
                      <th>Users</th>
                      <th>Profiles</th>
                      <th>Employees</th>
                      <th>Data size</th>
                      <th>Last activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.length ? filteredTenants.map((tenant) => (
                      <tr key={tenant.database} className={selectedTenant === tenant.database ? 'selected' : ''} onClick={() => loadTenantDetails(tenant.database)}>
                        <td>
                          <strong>{tenant.companyName}</strong>
                          <span>{tenant.database}</span>
                        </td>
                        <td>{tenant.subdomain || '--'}</td>
                        <td><span className={`ca-badge ${String(tenant.subscription?.statusLabel || '').toLowerCase()}`}>{formatStatus(tenant.subscription?.statusLabel)}</span></td>
                        <td>{tenant.usersCount || 0}</td>
                        <td>{tenant.profilesCount || 0}</td>
                        <td>{tenant.employeesCount || 0}</td>
                        <td>{tenant.dataSizeMb || 0} MB</td>
                        <td>{formatDateTime(tenant.lastActivityAt)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan='8' className='ca-empty'>No tenants are available yet. The central admin will populate this table as tenant records are discovered.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {(selectedTenant || tenantDetailsLoading) && (
              <section className='ca-panel'>
                <div className='ca-panel-head'>
                  <h3>{tenantDetailsLoading ? 'Loading tenant details...' : `Tenant detail: ${tenantDetails?.companyProfile?.name || selectedTenant}`}</h3>
                </div>
                {!tenantDetailsLoading && tenantDetails && (
                  <>
                    <div className='ca-mini-grid'>
                      <div className='ca-mini-card'><span>Database</span><strong>{tenantDetails.companyProfile?.db || '--'}</strong></div>
                      <div className='ca-mini-card'><span>Subdomain</span><strong>{tenantDetails.companyProfile?.subdomain || '--'}</strong></div>
                      <div className='ca-mini-card'><span>Subscription</span><strong>{formatStatus(tenantDetails.subscriptionStatus?.statusLabel)}</strong></div>
                      <div className='ca-mini-card'><span>Expires</span><strong>{formatDateTime(tenantDetails.subscriptionStatus?.expiresAt)}</strong></div>
                      <div className='ca-mini-card'><span>Trial status</span><strong>{formatStatus(tenantDetails.subscriptionStatus?.trialSuspended ? 'trial_suspended' : (tenantDetails.subscriptionStatus?.trialActive ? 'trial_active' : tenantDetails.subscriptionStatus?.trialExpired ? 'trial_expired' : 'not_on_trial'))}</strong></div>
                      <div className='ca-mini-card'><span>Trial expiry</span><strong>{formatDateTime(tenantDetails.subscriptionStatus?.trialExpiresAt)}</strong></div>
                      <div className='ca-mini-card'>
                        <span>Access channel</span>
                        <strong>{tenantDetails.offlineLicenseInfo ? `Offline (${tenantDetails.offlineLicenseInfo.isPrimary ? 'primary' : 'branch'})` : 'Online'}</strong>
                      </div>
                      {tenantDetails.offlineLicenseInfo && (
                        <>
                          <div className='ca-mini-card'><span>Offline license key</span><strong>{tenantDetails.offlineLicenseInfo.licenseKey || '--'}</strong></div>
                          <div className='ca-mini-card'><span>Offline license status</span><strong>{formatStatus(tenantDetails.offlineLicenseInfo.licenseStatus)}</strong></div>
                          <div className='ca-mini-card'><span>Offline license expires</span><strong>{formatDateTime(tenantDetails.offlineLicenseInfo.expiresAt)}</strong></div>
                        </>
                      )}
                    </div>

                    <div className='ca-detail-tabs'>
                      <button type='button' className={`ca-detail-tab ${tenantDetailTab === 'billing' ? 'active' : ''}`} onClick={() => setTenantDetailTab('billing')}>Billing</button>
                      <button type='button' className={`ca-detail-tab ${tenantDetailTab === 'modules' ? 'active' : ''}`} onClick={() => setTenantDetailTab('modules')}>Modules</button>
                      <button type='button' className={`ca-detail-tab ${tenantDetailTab === 'epsilon' ? 'active' : ''}`} onClick={() => setTenantDetailTab('epsilon')}>Epsilon AI</button>
                      <button type='button' className={`ca-detail-tab ${tenantDetailTab === 'users' ? 'active' : ''}`} onClick={() => setTenantDetailTab('users')}>Users</button>
                      <button type='button' className={`ca-detail-tab ${tenantDetailTab === 'activity' ? 'active' : ''}`} onClick={() => setTenantDetailTab('activity')}>Activity</button>
                    </div>

                    {tenantDetailTab === 'billing' && (
                      <div className='ca-detail-stack'>
                        <div className='ca-control-strip'>
                          <div>
                            <strong>Paystack card subscription</strong>
                            <span>{tenantDetails.subscriptionStatus?.subscriptionAutoRenew ? 'Auto-renewal is enabled for this tenant.' : 'No active auto-renewal is currently enabled.'}</span>
                          </div>
                          <div className='ca-inline-action-row'>
                            <button
                              className='ca-inline-btn danger'
                              onClick={() => handleTenantBillingControl(selectedTenant, 'cancel-subscription')}
                              disabled={actionDatabase === selectedTenant}
                            >
                              {actionDatabase === selectedTenant ? 'Updating...' : 'Cancel Auto-renewal'}
                            </button>
                            <button
                              className='ca-inline-btn danger'
                              onClick={() => handleTenantBillingControl(selectedTenant, 'remove-card', tenantDetails.subscriptionCards?.[0]?.authorizationCode || '')}
                              disabled={actionDatabase === selectedTenant || !tenantDetails.subscriptionCards?.length}
                            >
                              {actionDatabase === selectedTenant ? 'Updating...' : 'Remove Linked Card'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {tenantDetailTab === 'modules' && (
                      <div className='ca-detail-stack'>
                        <div className='ca-control-strip ca-module-panel'>
                          <div>
                            <strong>Enabled modules</strong>
                            <span>Only checked modules are available to this tenant's admin and employees. Dependencies are selected automatically.</span>
                          </div>
                          <div className='ca-module-grid'>
                            {/* Epsilon is deliberately excluded here — unlike every
                                other module, its real entitlement isn't
                                enabledModules membership at all, but a dedicated
                                seat count (see the Epsilon AI tab). Checking it
                                in this generic grid would add 'epsilon' to
                                enabledModules with zero seats behind it, which
                                is a misleading, broken state. */}
                            {(tenantDetails.moduleCatalog || []).filter((app) => app.key !== 'epsilon').map((app) => {
                              const Icon = MODULE_ICONS[app.key]
                              return (
                              <label key={app.key} className={`ca-module-chip ${app.tier === 'free' ? 'locked' : ''}`}>
                                <input
                                  type='checkbox'
                                  checked={app.tier === 'free' || draftModules.includes(app.key)}
                                  disabled={app.tier === 'free'}
                                  onChange={() => toggleDraftModule(app.key)}
                                />
                                {Icon && <span className='ca-module-icon'><Icon /></span>}
                                <span>{app.name}{app.tier === 'free' ? ' (always on)' : ''}</span>
                              </label>
                              )
                            })}
                          </div>
                          <div className='ca-inline-action-row'>
                            <button
                              className='ca-inline-btn primary'
                              onClick={handleSaveTenantModules}
                              disabled={isSavingModules}
                            >
                              {isSavingModules ? 'Saving...' : 'Save Modules'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {tenantDetailTab === 'epsilon' && (
                      <div className='ca-detail-stack'>
                        <div className='ca-control-strip'>
                          <div>
                            <strong>Epsilon AI seats (free grant)</strong>
                            <span>
                              Sets this tenant's Epsilon seat count directly, bypassing payment — the other way a
                              tenant gets seats is the tenant admin purchasing them from Settings &gt; Billing.
                              Currently: {Number(tenantDetails.companyProfile?.epsilonSeats || 0)} seat(s).
                            </span>
                          </div>
                          <div className='ca-inline-action-row'>
                            <input
                              type='number'
                              min='0'
                              style={{ width: 100 }}
                              defaultValue={Number(tenantDetails.companyProfile?.epsilonSeats || 0)}
                              key={selectedTenant}
                              onBlur={(e) => setEpsilonSeatsGrantDraft(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                            />
                            <button
                              className='ca-inline-btn primary'
                              onClick={() => handleGrantEpsilonSeats(selectedTenant)}
                              disabled={isGrantingEpsilonSeats}
                            >
                              {isGrantingEpsilonSeats ? 'Saving...' : 'Set Epsilon Seats'}
                            </button>
                          </div>
                        </div>

                        <div className='ca-control-strip'>
                          <div>
                            <strong>Epsilon AI token balance (free grant)</strong>
                            <span>
                              Sets this tenant's token balance directly, bypassing payment — separate from seats. The
                              other way a tenant gets tokens is a seat purchase, which also funds the wallet at the
                              configured ₦-per-1000-tokens rate (Settings tab). Currently: {(epsilonUsage?.epsilonTokenBalance ?? 0).toLocaleString()} token(s).
                            </span>
                          </div>
                          <div className='ca-inline-action-row'>
                            <input
                              type='number'
                              min='0'
                              style={{ width: 140 }}
                              defaultValue={epsilonUsage?.epsilonTokenBalance ?? 0}
                              key={`${selectedTenant}-tokens`}
                              onBlur={(e) => setEpsilonTokensGrantDraft(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                            />
                            <button
                              className='ca-inline-btn primary'
                              onClick={() => handleGrantEpsilonTokens(selectedTenant)}
                              disabled={isGrantingEpsilonTokens}
                            >
                              {isGrantingEpsilonTokens ? 'Saving...' : 'Set Token Balance'}
                            </button>
                          </div>
                        </div>

                        <section className='ca-panel'>
                          <div className='ca-panel-head'>
                            <div className='ca-panel-title'>
                              <h3>Epsilon AI usage — this tenant</h3>
                              <p>Lifetime purchased: {(epsilonUsage?.epsilonTokensPurchasedTotal ?? 0).toLocaleString()} tokens · consumed: {(epsilonUsage?.epsilonTokensConsumedTotal ?? 0).toLocaleString()} tokens</p>
                            </div>
                            <button className='ca-inline-btn' onClick={() => loadEpsilonTenantUsage(selectedTenant)} disabled={epsilonUsageLoading}>
                              {epsilonUsageLoading ? 'Loading...' : '🔄 Refresh'}
                            </button>
                          </div>

                          {epsilonUsage?.dailySeries?.length ? (
                            <div style={{ width: '100%', height: 220, marginBottom: 20 }}>
                              <ResponsiveContainer>
                                <AreaChart data={epsilonUsage.dailySeries}>
                                  <CartesianGrid strokeDasharray='3 3' />
                                  <XAxis dataKey='date' tick={{ fontSize: 11 }} />
                                  <YAxis tick={{ fontSize: 11 }} />
                                  <Tooltip formatter={(value, name) => [value.toLocaleString(), name === 'totalTokens' ? 'Tokens' : 'Naira']} />
                                  <Area type='monotone' dataKey='totalTokens' stroke='#10b981' fill='#10b981' fillOpacity={0.4} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <div className='ca-empty'>No daily usage yet for the last 30 days.</div>
                          )}

                          <div className='ca-table-wrap'>
                            <table className='ca-table'>
                              <thead>
                                <tr><th>Employee</th><th>Messages</th><th>Tokens</th><th>≈ Naira</th><th>Last used</th></tr>
                              </thead>
                              <tbody>
                                {epsilonUsage?.perUser?.length ? epsilonUsage.perUser.map((row) => (
                                  <tr key={row.userEmail}>
                                    <td>{row.userEmail}</td>
                                    <td>{row.messageCount}</td>
                                    <td>{row.totalTokens.toLocaleString()}</td>
                                    <td>₦{row.totalNaira.toLocaleString()}</td>
                                    <td>{formatDateTime(row.lastUsedAt)}</td>
                                  </tr>
                                )) : (
                                  <tr><td colSpan='5' className='ca-empty'>No Epsilon usage recorded for this tenant yet.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      </div>
                    )}

                    {tenantDetailTab === 'users' && (
                      <div className='ca-detail-stack'>
                        <div className='ca-table-wrap'>
                          <table className='ca-table'>
                            <thead>
                              <tr>
                                <th>Employee ID</th>
                                <th>Name</th>
                                <th>Dismissed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tenantDetails.employees?.length ? tenantDetails.employees.map((employee, index) => (
                                <tr key={`${employee.i_d}-${index}`}>
                                  <td>{employee.i_d}</td>
                                  <td>{`${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '--'}</td>
                                  <td>{employee.dismissalDate ? 'Yes' : 'No'}</td>
                                </tr>
                              )) : <tr><td colSpan='3' className='ca-empty'>No employee records found.</td></tr>}
                            </tbody>
                          </table>
                        </div>

                        {(() => {
                          // Computed straight from what's already loaded — no
                          // extra fetch — and reused by both the summary line
                          // and the Grant button's disabled state right below,
                          // so they can never disagree with each other.
                          const epsilonSeatsTotal = Number(tenantDetails.companyProfile?.epsilonSeats || 0)
                          const epsilonSeatsUsed = (tenantDetails.tenantProfiles || []).filter((p) => p.aiAccess === true).length
                          const epsilonSeatsFull = epsilonSeatsTotal <= 0 || epsilonSeatsUsed >= epsilonSeatsTotal
                          return (
                            <div className='ca-table-wrap'>
                              <div style={{ padding: '10px 14px', fontSize: '13px', color: '#5b6b63' }}>
                                Epsilon seats: <strong>{epsilonSeatsUsed} of {epsilonSeatsTotal}</strong> in use
                                {epsilonSeatsFull && (epsilonSeatsTotal > 0
                                  ? ' — all seats are in use; revoke one below before granting another.'
                                  : ' — this tenant has not purchased/been granted any Epsilon seats yet.')}
                              </div>
                              <table className='ca-table'>
                                <thead>
                                  <tr>
                                    <th>Tenant profiles</th>
                                    <th>Status</th>
                                    <th>Permissions</th>
                                    <th>Epsilon AI</th>
                                  </tr>
                                </thead>
                            <tbody>
                              {tenantDetails.tenantProfiles?.length ? tenantDetails.tenantProfiles.map((profile, index) => (
                                <tr key={`${profile.emailid}-${index}`}>
                                  <td>{profile.emailid}</td>
                                  <td>{profile.status || profile.access || '--'}</td>
                                  <td>{Array.isArray(profile.permissions) ? profile.permissions.slice(0, 4).join(', ') : '--'}</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                      <button
                                        className='ca-inline-btn'
                                        type='button'
                                        onClick={() => handleToggleEmployeeAiAccess(selectedTenant, profile.emailid, !profile.aiAccess)}
                                        disabled={isTogglingAiAccess === profile.emailid || (!profile.aiAccess && epsilonSeatsFull)}
                                        title={
                                          profile.aiAccess
                                            ? 'Revoke this employee\'s Epsilon seat'
                                            : epsilonSeatsFull
                                              ? 'No spare seats — revoke one from another employee first, or purchase more.'
                                              : 'Grant this employee an Epsilon seat'
                                        }
                                      >
                                        {isTogglingAiAccess === profile.emailid
                                          ? (profile.aiAccess ? 'Revoking...' : 'Granting...')
                                          : (profile.aiAccess ? 'Revoke Seat' : 'Grant Seat')}
                                      </button>
                                      {profile.aiAccess && (
                                        <button
                                          className='ca-inline-btn'
                                          type='button'
                                          onClick={() => handleResetEmployeeRateLimit(selectedTenant, profile.emailid)}
                                          disabled={isResettingEmployeeRateLimit === profile.emailid}
                                        >
                                          {isResettingEmployeeRateLimit === profile.emailid ? 'Resetting...' : 'Reset Rate Limit'}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )) : <tr><td colSpan='4' className='ca-empty'>No tenant profile records found.</td></tr>}
                                </tbody>
                              </table>
                            </div>
                          )
                        })()}

                        <div className='ca-table-wrap'>
                          <table className='ca-table'>
                            <thead>
                              <tr>
                                <th>Central users</th>
                                <th>Name</th>
                                <th>Tenant DB</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tenantDetails.wcProfiles?.length ? tenantDetails.wcProfiles.map((profile, index) => (
                                <tr key={`${profile.emailid}-${index}`}>
                                  <td>{profile.emailid}</td>
                                  <td>{profile.name || '--'}</td>
                                  <td>{profile.db || '--'}</td>
                                </tr>
                              )) : <tr><td colSpan='3' className='ca-empty'>No WCDatabase profile records found.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {tenantDetailTab === 'activity' && (
                      <div className='ca-detail-stack'>
                        <div className='ca-activity-columns'>
                          <div>
                            <h4>Recent sales</h4>
                            <ul className='ca-activity-list'>
                              {(tenantDetails.recentSales || []).map((entry, index) => (
                                <li key={`sale-${index}`}>{entry.customerName || 'Sale'} • {formatDateTime(entry.postingDate)}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4>Recent orders</h4>
                            <ul className='ca-activity-list'>
                              {(tenantDetails.recentOrders || []).map((entry, index) => (
                                <li key={`order-${index}`}>{entry.orderNumber || 'Order'} • {formatDateTime(entry.createdAt)}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4>Recent expenses</h4>
                            <ul className='ca-activity-list'>
                              {(tenantDetails.recentExpenses || []).map((entry, index) => (
                                <li key={`expense-${index}`}>{entry.category || 'Expense'} • {formatDateTime(entry.postingDate)}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}

        {activeTab === 'subscriptions' && (
          <>
            <section className='ca-grid-two'>
              <form className='ca-panel' onSubmit={handleManualMarkPaid}>
                <div className='ca-panel-head'>
                  <h3>Create or extend tenant subscription</h3>
                </div>
                <div className='ca-form-grid'>
                  <label>
                    <span>Tenant database</span>
                    <select name='database' value={manualForm.database} onChange={handleManualField}>
                      <option value=''>Select tenant</option>
                      {snapshot.tenants.map((tenant) => (
                        <option key={tenant.database} value={tenant.database}>{tenant.companyName} ({tenant.database})</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Months</span>
                    <input type='number' min='1' name='months' value={manualForm.months} onChange={handleManualField} />
                  </label>
                  <label>
                    <span>Amount (NGN)</span>
                    <input type='number' min='0' name='amountNaira' value={manualForm.amountNaira} onChange={handleManualField} />
                  </label>
                  <label>
                    <span>Paid date</span>
                    <input type='date' name='paidAt' value={manualForm.paidAt} onChange={handleManualField} />
                  </label>
                  <label className='full'>
                    <span>Note</span>
                    <input type='text' name='note' value={manualForm.note} onChange={handleManualField} />
                  </label>
                </div>
                <button className='ca-primary-btn' type='submit' disabled={actionDatabase === manualForm.database}>
                  {actionDatabase === manualForm.database ? 'Processing...' : 'Apply Subscription'}
                </button>
              </form>

              <div className='ca-panel'>
                <div className='ca-panel-head'>
                  <h3>Tenant subscription controls</h3>
                  <div className='ca-panel-head-actions'>
                    <button className='ca-inline-btn' onClick={handleVerifyPendingPayments} disabled={isReconcilingPending}>
                      {isReconcilingPending ? 'Checking Paystack...' : 'Verify Pending Paystack Orders'}
                    </button>
                    <button className='ca-inline-btn danger' onClick={handleCleanupTestData} disabled={isCleaningTestData || !snapshot.summary.testDataCount}>
                      {isCleaningTestData ? 'Cleaning...' : `Purge Test Data (${snapshot.summary.testDataCount || 0})`}
                    </button>
                  </div>
                </div>
                <div className='ca-trial-control-card'>
                  <div className='ca-trial-control-head'>
                    <div>
                      <h4>Free trial controls</h4>
                      <p>Start, extend, or suspend a tenant free trial without affecting the subscription orders and payments history.</p>
                    </div>
                  </div>
                  <div className='ca-form-grid'>
                    <label>
                      <span>Tenant database</span>
                      <select name='database' value={trialForm.database} onChange={handleTrialField}>
                        <option value=''>Select tenant</option>
                        {snapshot.tenants.map((tenant) => (
                          <option key={tenant.database} value={tenant.database}>{tenant.companyName} ({tenant.database})</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Trial days</span>
                      <input type='number' min='1' name='trialDays' value={trialForm.trialDays} onChange={handleTrialField} />
                    </label>
                    <label>
                      <span>Trial start date</span>
                      <input type='date' name='trialStartAt' value={trialForm.trialStartAt} onChange={handleTrialField} />
                    </label>
                    <label className='full'>
                      <span>Admin note</span>
                      <input type='text' name='note' value={trialForm.note} onChange={handleTrialField} />
                    </label>
                  </div>
                  <div className='ca-inline-action-row'>
                    <button
                      className='ca-inline-btn'
                      onClick={() => handleTrialAction('create')}
                      disabled={actionDatabase === trialForm.database}
                    >
                      {actionDatabase === trialForm.database ? 'Updating...' : 'Create Trial'}
                    </button>
                    <button
                      className='ca-inline-btn'
                      onClick={() => handleTrialAction('extend')}
                      disabled={actionDatabase === trialForm.database}
                    >
                      {actionDatabase === trialForm.database ? 'Updating...' : 'Extend Trial'}
                    </button>
                    <button
                      className='ca-inline-btn danger'
                      onClick={() => handleTrialAction('suspend')}
                      disabled={actionDatabase === trialForm.database}
                    >
                      {actionDatabase === trialForm.database ? 'Updating...' : 'Suspend Trial'}
                    </button>
                    <button
                      className='ca-inline-btn'
                      onClick={() => handleTrialAction('resume')}
                      disabled={actionDatabase === trialForm.database}
                    >
                      {actionDatabase === trialForm.database ? 'Updating...' : 'Resume Trial'}
                    </button>
                  </div>
                </div>
                <div className='ca-table-wrap'>
                  <table className='ca-table'>
                    <thead>
                      <tr>
                        <th>Tenant</th>
                        <th>Status</th>
                        <th>Trial</th>
                        <th>Expires</th>
                        <th>Amount</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTenants.length ? filteredTenants.slice(0, 12).map((tenant) => (
                        <tr key={tenant.database}>
                          <td>{tenant.companyName}</td>
                          <td><span className={`ca-badge ${String(tenant.subscription?.statusLabel || '').toLowerCase()}`}>{formatStatus(tenant.subscription?.statusLabel)}</span></td>
                          <td>{formatDateTime(tenant.subscription?.trialExpiresAt)}</td>
                          <td>{formatDateTime(tenant.subscription?.expiresAt)}</td>
                          <td>{formatMoney(tenant.subscription?.amountNaira || 0)}</td>
                          <td>
                            <div className='ca-table-action-stack'>
                              <button
                                className='ca-inline-btn'
                                onClick={() => handleTogglePause(tenant.database, !tenant.manualPauseDB)}
                                disabled={actionDatabase === tenant.database}
                              >
                                {actionDatabase === tenant.database ? 'Updating...' : (tenant.manualPauseDB ? 'Restore' : 'Suspend')}
                              </button>
                              <button
                                className='ca-inline-btn'
                                onClick={() => handleTrialAction('extend', tenant.database)}
                                disabled={actionDatabase === tenant.database}
                              >
                                {actionDatabase === tenant.database ? 'Updating...' : 'Add Trial Days'}
                              </button>
                              <button
                                className='ca-inline-btn'
                                onClick={() => handleTrialAction('resume', tenant.database)}
                                disabled={actionDatabase === tenant.database}
                              >
                                {actionDatabase === tenant.database ? 'Updating...' : 'Resume Trial'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan='6' className='ca-empty'>No tenant subscription records have been discovered yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className='ca-grid-two'>
              <div className='ca-panel'>
                <div className='ca-panel-head'>
                  <h3>Recent subscription payments</h3>
                </div>
                <div className='ca-table-wrap'>
                  <table className='ca-table'>
                    <thead>
                      <tr>
                        <th>Tenant</th>
                        <th>Invoice</th>
                        <th>Paid</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.recentPayments.length ? snapshot.recentPayments.map((payment, index) => (
                        <tr key={`${payment.reference}-${index}`}>
                          <td>
                            {payment.companyName || payment.database}
                            {payment.licenseAccountId && <span className="ca-badge mini" style={{ marginLeft: '8px', fontSize: '9px', padding: '2px 6px' }}>OFFLINE</span>}
                            {payment.isTest && <span className="ca-badge danger mini" style={{ marginLeft: '8px', fontSize: '9px', padding: '2px 6px' }}>TEST</span>}
                          </td>
                          <td>{payment.invoiceNumber || '--'}</td>
                          <td>{formatDateTime(payment.paidAt || payment.createdAt)}</td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              {formatMoney(payment.amountNaira)}
                              {payment.isTest && (
                                <button className="ca-inline-btn danger mini" onClick={() => handleDeleteTransaction(payment.reference, payment.database)} style={{ minHeight: '24px', padding: '0 8px', fontSize: '10px' }}>Delete</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan='4' className='ca-empty'>No subscription payments recorded yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className='ca-panel'>
                <div className='ca-panel-head'>
                  <h3>Recent subscription orders</h3>
                </div>
                <div className='ca-table-wrap'>
                  <table className='ca-table'>
                    <thead>
                      <tr>
                        <th>Tenant</th>
                        <th>Order</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.recentOrders.length ? snapshot.recentOrders.map((order, index) => (
                        <tr key={`${order.reference}-${index}`}>
                          <td>
                            {order.companyName || order.database}
                            {order.isTest && <span className="ca-badge danger mini" style={{ marginLeft: '8px', fontSize: '9px', padding: '2px 6px' }}>TEST</span>}
                          </td>
                          <td>{order.orderNumber || '--'}</td>
                          <td>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               <span className={`ca-badge ${String(order.status || '').toLowerCase()}`}>{formatStatus(order.status)}</span>
                               {order.isTest && (
                                 <button className="ca-inline-btn danger mini" onClick={() => handleDeleteTransaction(order.reference, order.database)} style={{ minHeight: '24px', padding: '0 8px', fontSize: '10px' }}>Delete</button>
                               )}
                             </div>
                          </td>
                          <td>{formatDateTime(order.createdAt)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan='4' className='ca-empty'>No subscription orders recorded yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'maintenance' && (
          <>
            <section className='ca-panel' style={{ marginBottom: 24 }}>
              <div className='ca-panel-head'>
                <h3>Document-numbering migration (Phase 2)</h3>
              </div>
              <div className='ca-panel-content'>
                <p className='ca-panel-description'>
                  Backfills a real, sequential documentNo and a clientTxnId idempotency key onto every existing
                  Sales/Purchase/Expenses/Approvals/Departments/Positions/Accommodations/Rentals/Attendance/POSSessions/SessionManagers/InventoryTransactions
                  record, and builds the new unique index that prevents duplicate postings. Safe to re-run — already-migrated
                  records are left untouched, so this can be run repeatedly against live production data before the
                  corresponding app update is published (each run just catches up anything created since the last run).
                </p>

                <label className='ca-checkbox-row'>
                  <input
                    type='checkbox'
                    checked={migrationRunAll}
                    onChange={(e) => setMigrationRunAll(e.target.checked)}
                  />
                  <span>Run for all tenants</span>
                </label>

                {!migrationRunAll && (
                  <div className='ca-form-grid' style={{ padding: 0, marginTop: 16 }}>
                    <label>
                      <span>Tenant</span>
                      <select value={migrationTenant} onChange={(e) => setMigrationTenant(e.target.value)}>
                        <option value=''>Select a tenant…</option>
                        {snapshot.tenants.map((t) => (
                          <option key={t.database} value={t.database}>{t.companyName}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                <label className='ca-checkbox-row ca-checkbox-row-warning'>
                  <input
                    type='checkbox'
                    checked={migrationDropOldIndexes}
                    onChange={(e) => setMigrationDropOldIndexes(e.target.checked)}
                  />
                  <span>Also drop old indexes (one-way — only after the new app build is confirmed live)</span>
                </label>

                <button
                  type='button'
                  className='ca-primary-btn'
                  style={{ marginTop: 20, marginLeft: 0 }}
                  disabled={migrationRunning}
                  onClick={handleRunDocumentNumberingMigration}
                >
                  {migrationRunning ? 'Running…' : 'Run migration'}
                </button>

                {migrationOutcome && (
                  <div className='ca-migration-outcome'>
                    <h4>{migrationOutcome.ok ? 'Results' : 'Error'}</h4>
                    {!migrationOutcome.ok && <p className='ca-error-text'>{migrationOutcome.mess}</p>}
                    {migrationOutcome.ok && migrationOutcome.results.map((tenantResult) => (
                      <div key={tenantResult.database} className='ca-migration-tenant-result'>
                        <strong>{tenantResult.database}</strong>
                        <div className='ca-table-wrap'>
                          <table className='ca-table wide'>
                            <thead>
                              <tr><th>Collection</th><th>Docs</th><th>clientTxnId backfilled</th><th>documentNo backfilled</th><th>Counter</th><th>Old index dropped</th></tr>
                            </thead>
                            <tbody>
                              {tenantResult.results.map((r, idx) => (
                                <tr key={`${r.collection}-${idx}`}>
                                  <td>{r.collection}</td>
                                  <td>{r.docs ?? '—'}</td>
                                  <td>{r.backfilledTxnId ?? '—'}</td>
                                  <td>{r.backfilledDocNo ?? '—'}</td>
                                  <td>{r.counterAdvancedTo ?? '—'}</td>
                                  <td>{r.droppedOldIndex ? <span className='ca-badge active'>Yes</span> : <span className='ca-badge unconfigured'>No</span>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    <details className='ca-raw-log'>
                      <summary>Raw log</summary>
                      <pre>{(migrationOutcome.log || []).join('\n')}</pre>
                    </details>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'desktopReleases' && (
          <>
            <section className='ca-panel' style={{ marginBottom: 24 }}>
              <div className='ca-panel-head'><h3>Current version</h3></div>
              <div className='ca-panel-content'>
                {!desktopReleases.length && <p>No desktop release published yet — run "npm run release" from the Electron wrapper project.</p>}
                {desktopReleases[0] && (
                  <div className='ca-tenant-card'>
                    <h4>v{desktopReleases[0].version}</h4>
                    <p>Published {formatDateTime(desktopReleases[0].publishedAt)} by {desktopReleases[0].publishedBy || '--'}</p>
                    <p>Download method: <strong>{desktopReleases[0].downloadMethod || 'direct'}</strong>{desktopReleases[0].downloadMethod === 'proxy' && ' (Drive public links didn\'t work for this release — routed through wageserver instead)'}</p>
                    {(desktopReleases[0].files || []).map((f) => (
                      <div key={f.name} style={{ padding: '4px 0' }}>
                        {f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB) — <a href={f.downloadLink} target='_blank' rel='noreferrer'>Download</a>
                      </div>
                    ))}
                    <button
                      className='ca-inline-btn danger mini'
                      style={{ marginTop: 8 }}
                      disabled={deletingReleaseVersion === desktopReleases[0].version}
                      onClick={() => handleDeleteDesktopRelease(desktopReleases[0].version)}
                    >
                      {deletingReleaseVersion === desktopReleases[0].version ? 'Deleting…' : 'Delete this release'}
                    </button>
                    {renderReleaseDeleteResult(desktopReleases[0].version)}
                  </div>
                )}
              </div>
            </section>

            <section className='ca-panel'>
              <div className='ca-panel-head'><h3>Release history</h3></div>
              <div className='ca-panel-content'>
                {desktopReleases.slice(1).map((release) => (
                  <div key={release.version} className='ca-tenant-card'>
                    <h4>v{release.version}</h4>
                    <p>Published {formatDateTime(release.publishedAt)} by {release.publishedBy || '--'} — download method: {release.downloadMethod || 'direct'}</p>
                    {(release.files || []).map((f) => (
                      <div key={f.name} style={{ padding: '4px 0' }}>
                        {f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB) — <a href={f.downloadLink} target='_blank' rel='noreferrer'>Download</a>
                      </div>
                    ))}
                    <button
                      className='ca-inline-btn danger mini'
                      style={{ marginTop: 8 }}
                      disabled={deletingReleaseVersion === release.version}
                      onClick={() => handleDeleteDesktopRelease(release.version)}
                    >
                      {deletingReleaseVersion === release.version ? 'Deleting…' : 'Delete this release'}
                    </button>
                    {renderReleaseDeleteResult(release.version)}
                  </div>
                ))}
                {desktopReleases.length <= 1 && <p className='ca-empty'>No earlier releases yet.</p>}
              </div>
            </section>
          </>
        )}

        {activeTab === 'offlineLicenses' && (
          <>
            <section className='ca-panel' style={{ marginBottom: 24 }}>
              <div className='ca-panel-head'>
                <h3>Offline license accounts</h3>
                <button className='ca-primary-btn' onClick={() => setNewOfflineLicenseForm({ email: '', password: '', fullName: '', companyName: '', primarySubdomain: '', modules: [] })}>
                  + Manually Create License
                </button>
              </div>
              <div className='ca-panel-content'>
                {offlineAccounts.length === 0 && <p>No offline license accounts yet.</p>}
                {offlineAccounts.map((account) => (
                  <div key={account.accountId} className='ca-tenant-card'>
                    <h4>{account.companyName} — {account.email}</h4>
                    <p>Primary subdomain: {account.primarySubdomain} | Account status: {account.status}</p>
                    {(account.licenses || []).map((license) => (
                      <div key={license.licenseId} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 10, marginTop: 8 }}>
                        <div><strong>License key:</strong> {license.licenseKey}</div>
                        <div><strong>Status:</strong> {license.status}</div>
                        <div><strong>Expires:</strong> {new Date(license.expiresAt).toLocaleDateString()} ({Math.ceil((license.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))} day(s) remaining)</div>
                        <div><strong>Modules:</strong> {(license.modules || []).join(', ') || 'none'}</div>
                        <div><strong>Branches:</strong> {(license.branches || []).map(b => b.subdomain).join(', ') || 'none'}</div>
                        <button className='ca-secondary-btn' style={{ marginTop: 8 }}
                          onClick={() => setEditingLicense({ licenseId: license.licenseId, modules: license.modules || [], expiresAt: license.expiresAt, status: license.status })}>
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            {editingLicense && (
              <section className='ca-panel' style={{ marginBottom: 24 }}>
                <div className='ca-panel-head'><h3>Edit license</h3></div>
                <form className='ca-form-grid' onSubmit={handleUpdateOfflineLicense}>
                  {renderOfflineModulePicker(editingLicense.modules || [], (mods) => setEditingLicense({ ...editingLicense, modules: mods }))}
                  <label>
                    <span>Expires at</span>
                    <input type='date' value={new Date(editingLicense.expiresAt).toISOString().slice(0, 10)}
                      onChange={(e) => setEditingLicense({ ...editingLicense, expiresAt: new Date(e.target.value).getTime() })} />
                  </label>
                  <label>
                    <span>Status</span>
                    <select value={editingLicense.status} onChange={(e) => setEditingLicense({ ...editingLicense, status: e.target.value })}>
                      <option value='active'>active</option>
                      <option value='expired'>expired</option>
                      <option value='terminated'>terminated</option>
                    </select>
                  </label>
                  <div className='full'>
                    <button className='ca-primary-btn' type='submit' disabled={isBusy}>Save</button>
                    <button className='ca-secondary-btn' type='button' onClick={() => setEditingLicense(null)}>Cancel</button>
                  </div>
                </form>
              </section>
            )}

            {newOfflineLicenseForm && (
              <section className='ca-panel' style={{ marginBottom: 24 }}>
                <div className='ca-panel-head'><h3>Manually create offline license</h3></div>
                <form className='ca-form-grid' onSubmit={handleCreateOfflineLicense}>
                  <label><span>Email</span><input type='email' value={newOfflineLicenseForm.email} onChange={(e) => setNewOfflineLicenseForm({ ...newOfflineLicenseForm, email: e.target.value })} required /></label>
                  <label><span>Password</span><input type='text' value={newOfflineLicenseForm.password} onChange={(e) => setNewOfflineLicenseForm({ ...newOfflineLicenseForm, password: e.target.value })} required /></label>
                  <label><span>Full name</span><input type='text' value={newOfflineLicenseForm.fullName} onChange={(e) => setNewOfflineLicenseForm({ ...newOfflineLicenseForm, fullName: e.target.value })} required /></label>
                  <label><span>Company name</span><input type='text' value={newOfflineLicenseForm.companyName} onChange={(e) => setNewOfflineLicenseForm({ ...newOfflineLicenseForm, companyName: e.target.value })} required /></label>
                  <label><span>Primary subdomain</span><input type='text' value={newOfflineLicenseForm.primarySubdomain} onChange={(e) => setNewOfflineLicenseForm({ ...newOfflineLicenseForm, primarySubdomain: e.target.value })} required /></label>
                  {renderOfflineModulePicker(newOfflineLicenseForm.modules, (mods) => setNewOfflineLicenseForm({ ...newOfflineLicenseForm, modules: mods }))}
                  <div className='full'>
                    <button className='ca-primary-btn' type='submit' disabled={isBusy}>Create</button>
                    <button className='ca-secondary-btn' type='button' onClick={() => setNewOfflineLicenseForm(null)}>Cancel</button>
                  </div>
                </form>
              </section>
            )}

            <section className='ca-panel'>
              <div className='ca-panel-head'><h3>Offline yearly module pricing</h3></div>
              <div className='ca-panel-content'>
                {offlineModulePricing.map((m) => (
                  <div key={m.key} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0' }}>
                    <span style={{ flex: 1 }}>{m.name}{m.key === 'epsilon' ? ' (per seat/month)' : ''}</span>
                    <span>{m.key === 'epsilon' ? 'Per seat, monthly:' : 'Online monthly:'} ₦</span>
                    <input type='number' style={{ width: 120 }} defaultValue={m.priceNaira}
                      onBlur={(e) => handleUpdateModulePricing(m.key, Number(e.target.value), m.offlineYearlyPriceNaira)} />
                    {m.key !== 'epsilon' && (
                      <>
                        <input type='number' style={{ width: 140 }} defaultValue={m.offlineYearlyPriceNaira}
                          onBlur={(e) => handleUpdateModulePricing(m.key, m.priceNaira, Number(e.target.value))} />
                        <span>/yr</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === 'settings' && (
          <>
            <div className='ca-detail-tabs' style={{ marginBottom: 24, padding: 0 }}>
              <button type='button' className={`ca-detail-tab ${settingsSubTab === 'security' ? 'active' : ''}`} onClick={() => setSettingsSubTab('security')}>Security</button>
              <button type='button' className={`ca-detail-tab ${settingsSubTab === 'plans' ? 'active' : ''}`} onClick={() => setSettingsSubTab('plans')}>Plans</button>
              <button type='button' className={`ca-detail-tab ${settingsSubTab === 'global' ? 'active' : ''}`} onClick={() => setSettingsSubTab('global')}>Global Settings</button>
            </div>

            {settingsSubTab === 'security' && (
            <section className='ca-grid-two' style={{ marginBottom: 24 }}>
              <form className='ca-panel' onSubmit={handleChangePassword}>
                <div className='ca-panel-head'>
                  <h3>Change central admin password</h3>
                </div>
                <div className='ca-form-grid'>
                  <label>
                    <span>Current password</span>
                    <input type='password' name='currentPassword' value={passwordForm.currentPassword} onChange={handlePasswordInput} />
                  </label>
                  <label>
                    <span>New password</span>
                    <input type='password' name='newPassword' value={passwordForm.newPassword} onChange={handlePasswordInput} />
                  </label>
                  <label className='full'>
                    <span>Confirm new password</span>
                    <input type='password' name='confirmPassword' value={passwordForm.confirmPassword} onChange={handlePasswordInput} />
                  </label>
                </div>
                <button className='ca-primary-btn' type='submit' disabled={isBusy}>
                  {isBusy ? 'Updating...' : 'Change Password'}
                </button>
              </form>

              <div className='ca-panel'>
                <div className='ca-panel-head'>
                  <h3>Admin accounts</h3>
                </div>
                <div className='ca-table-wrap'>
                  <table className='ca-table'>
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Must change password</th>
                        <th>Last login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.adminUsers.length ? snapshot.adminUsers.map((user) => (
                        <tr key={user.username}>
                          <td>{user.username}</td>
                          <td>{user.mustChangePassword ? 'Yes' : 'No'}</td>
                          <td>{formatDateTime(user.lastLoginAt)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan='3' className='ca-empty'>No central admin accounts found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
            )}

            {settingsSubTab === 'plans' && (
            <section className='ca-panel'>
              <div className='ca-panel-head'>
                <h3>Platform Pricing & Plans</h3>
                <span style={{ fontSize: 13, color: 'var(--ca-text-muted)' }}>Changes here sync immediately to the Pricing Page and all new tenant checkouts</span>
              </div>
              <div className='ca-panel-content'>
                <div className='ca-plan-editor'>
                  {(snapshot.plans || []).length === 0 && (
                    <p className='ca-empty'>No pricing plans found. Plans are auto-seeded on server start.</p>
                  )}
                  {(snapshot.plans || []).map((plan) => (
                    <div key={plan.key} className={`ca-plan-card ${planForm.key === plan.key ? 'editing' : ''}`}>
                      <div className='ca-plan-card-head'>
                        <div>
                          <strong style={{ fontSize: 17 }}>{plan.name}</strong>
                          <p style={{ margin: '4px 0 0', color: 'var(--ca-text-muted)', fontSize: 13 }}>{plan.description}</p>
                          {plan.features && plan.features.length > 0 && (
                            <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--ca-text-muted)' }}>
                              {plan.features.map((f) => <li key={f}>{f}</li>)}
                            </ul>
                          )}
                        </div>
                        <div className='ca-plan-price-info'>
                          <strong>{formatMoney(plan.amountNaira)}</strong>
                          <span style={{ fontSize: 13, color: 'var(--ca-text-muted)', display: 'block' }}>per {plan.interval}</span>
                          <button
                            className='ca-inline-btn'
                            style={{ marginTop: 12 }}
                            onClick={() => editPlan(plan)}
                            type='button'
                          >
                            {planForm.key === plan.key ? 'Editing...' : 'Edit Plan'}
                          </button>
                          {plan.key !== 'standard-monthly' && (
                            <button
                              className='ca-inline-btn danger'
                              style={{ marginTop: 8, display: 'block', width: '100%' }}
                              onClick={() => handleDeletePlan(plan.key)}
                              type='button'
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {!planForm.key && (
                  <button
                    className='ca-primary-btn'
                    style={{ marginTop: 24 }}
                    onClick={() => setPlanForm({ key: 'new-plan-' + Date.now(), name: 'New Plan', description: '', amountNaira: 0, interval: 'monthly' })}
                  >
                    Add New Pricing Plan
                  </button>
                )}

                {planForm.key && (
                  <form
                    className='ca-form-grid'
                    onSubmit={(snapshot.plans || []).some(p => p.key === planForm.key) ? handleUpdatePlan : handleCreatePlan}
                    style={{ marginTop: 32, paddingTop: 28, borderTop: '2px solid var(--ca-border)' }}
                  >
                    <div className='full' style={{ marginBottom: 4 }}>
                      <h4 style={{ margin: 0 }}>Editing: {planForm.name}</h4>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ca-text-muted)' }}>Changes affect new tenant checkouts and the public Pricing Page immediately after saving.</p>
                    </div>
                    <label className='full'>
                      <span>Plan display name</span>
                      <input
                        type='text'
                        value={planForm.name}
                        onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                        required
                      />
                    </label>
                    <label>
                      <span>Price (NGN)</span>
                      <input
                        type='number'
                        min='0'
                        value={planForm.amountNaira}
                        onChange={(e) => setPlanForm({ ...planForm, amountNaira: Number(e.target.value) })}
                        required
                      />
                    </label>
                    <label>
                      <span>Billing interval</span>
                      <select
                        value={planForm.interval}
                        onChange={(e) => setPlanForm({ ...planForm, interval: e.target.value })}
                      >
                        <option value='monthly'>Monthly</option>
                        <option value='yearly'>Yearly</option>
                      </select>
                    </label>
                    <label className='full'>
                      <span>Short description</span>
                      <input
                        type='text'
                        value={planForm.description}
                        onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                      />
                    </label>
                    <div className='full' style={{ display: 'flex', gap: 12 }}>
                      <button className='ca-primary-btn' type='submit' disabled={isBusy}>
                        {isBusy ? 'Saving...' : 'Save Plan Changes'}
                      </button>
                      <button
                        className='ca-inline-btn'
                        type='button'
                        onClick={() => setPlanForm({ key: '', name: '', description: '', amountNaira: 0, interval: 'monthly' })}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>
            )}

            {settingsSubTab === 'global' && (
            <section className='ca-panel'>
              <div className='ca-panel-head'>
                <h3>Global Platform Settings</h3>
              </div>
              <div className='ca-panel-content'>
                <form className='ca-form-grid' onSubmit={handleUpdateGlobalSettings}>
                  <label>
                    <span>Default free trial days</span>
                    <input
                      type='number'
                      min='1'
                      value={globalSettingsForm.defaultFreeTrialDays}
                      onChange={(e) => setGlobalSettingsForm({ ...globalSettingsForm, defaultFreeTrialDays: Number(e.target.value) })}
                      required
                    />
                  </label>
                  <label>
                    <span>Offline desktop: must connect within (days)</span>
                    <input
                      type='number'
                      min='1'
                      value={globalSettingsForm.desktopOfflineIntervalDays}
                      onChange={(e) => setGlobalSettingsForm({ ...globalSettingsForm, desktopOfflineIntervalDays: Number(e.target.value) })}
                      required
                    />
                  </label>
                  <label>
                    <span>Epsilon (AI assistant)</span>
                    <select
                      value={globalSettingsForm.epsilonEnabled ? 'enabled' : 'disabled'}
                      onChange={(e) => setGlobalSettingsForm({ ...globalSettingsForm, epsilonEnabled: e.target.value === 'enabled' })}
                    >
                      <option value='enabled'>Enabled</option>
                      <option value='disabled'>Disabled</option>
                    </select>
                  </label>
                  <label>
                    <span>Epsilon model</span>
                    <input
                      type='text'
                      value={globalSettingsForm.epsilonModel}
                      onChange={(e) => setGlobalSettingsForm({ ...globalSettingsForm, epsilonModel: e.target.value })}
                      placeholder='claude-sonnet-5'
                      title="Must be a model that supports thinking:{type:'adaptive'} — epsilon.js's getCompletion always requests it. An older model that only supports thinking via budget_tokens (or none at all) will reject every request outright."
                    />
                  </label>
                  {/* Epsilon token price lives on the Epsilon AI Usage tab
                      now, next to the per-seat price it's priced alongside —
                      editing it here too would be two places for the same
                      value with no indication either was just changed
                      elsewhere. */}
                  <label>
                    <span>Epsilon rate limit (tokens per window)</span>
                    <input
                      type='number'
                      min='0'
                      value={globalSettingsForm.epsilonRateLimitTokens}
                      onChange={(e) => setGlobalSettingsForm({ ...globalSettingsForm, epsilonRateLimitTokens: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    <span>Epsilon rate limit window (hours)</span>
                    <input
                      type='number'
                      min='1'
                      value={globalSettingsForm.epsilonRateLimitWindowHours}
                      onChange={(e) => setGlobalSettingsForm({ ...globalSettingsForm, epsilonRateLimitWindowHours: Number(e.target.value) })}
                    />
                  </label>
                  <div className='full'>
                    <button className='ca-primary-btn' type='submit' disabled={isBusy}>
                      {isBusy ? 'Saving...' : 'Update Settings'}
                    </button>
                  </div>
                </form>
              </div>
            </section>
            )}
          </>
        )}

        {activeTab === 'sessions' && (
          <div className='ca-sessions-container'>
            <div className='ca-sessions-header'>
              <div className='ca-form-grid'>
                <label>
                  <span>Filter by Tenant</span>
                  <select 
                    value={sessionFilter.database} 
                    onChange={(e) => {
                      const db = e.target.value;
                      setSessionFilter(prev => ({ ...prev, database: db }));
                      loadSessions(db, sessionFilter.emailid);
                    }}
                  >
                    <option value=''>All Tenants</option>
                    {snapshot.tenants.map(t => <option key={t.database} value={t.database}>{t.companyName}</option>)}
                  </select>
                </label>
                <label>
                  <span>Filter by User ID</span>
                  <input 
                    type='text' 
                    placeholder='Email address'
                    value={sessionFilter.emailid}
                    onChange={(e) => setSessionFilter(prev => ({ ...prev, emailid: e.target.value }))}
                    onBlur={() => loadSessions(sessionFilter.database, sessionFilter.emailid)}
                  />
                </label>
              </div>
            </div>

            <div className='ca-grid-two'>
              <section className='ca-panel'>
                <div className='ca-panel-head'>
                  <h3>Active User Sessions ({sessionsData.activeSessions.length})</h3>
                </div>
                <div className='ca-table-wrap'>
                  <table className='ca-table'>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Tenant</th>
                        <th>Login At</th>
                        <th>Last Activity</th>
                        <th>IP / Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isSessionsLoading ? (
                        <tr><td colSpan='5' className='ca-empty'>Loading sessions...</td></tr>
                      ) : sessionsData.activeSessions.length ? sessionsData.activeSessions.map((s) => (
                        <tr key={s._id}>
                          <td>
                            <strong>{s.userName}</strong>
                            <div style={{fontSize: '11px', color: 'var(--ca-text-muted)'}}>{s.userId}</div>
                          </td>
                          <td>{s.tenant || s.db}</td>
                          <td>{formatDateTime(s.loginAt)}</td>
                          <td>{formatDateTime(s.lastActivityAt)}</td>
                          <td>
                            <div style={{fontSize: '11px'}}>{s.ip}</div>
                            <div style={{fontSize: '10px', color: 'var(--ca-text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{s.userAgent}</div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan='5' className='ca-empty'>No active sessions found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className='ca-panel'>
                <div className='ca-panel-head'>
                  <h3>Recent Session History ({sessionsData.recentHistory.length})</h3>
                </div>
                <div className='ca-table-wrap'>
                  <table className='ca-table'>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Tenant</th>
                        <th>Duration</th>
                        <th>Logout At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isSessionsLoading ? (
                        <tr><td colSpan='4' className='ca-empty'>Loading history...</td></tr>
                      ) : sessionsData.recentHistory.length ? sessionsData.recentHistory.map((s) => (
                        <tr key={s._id}>
                          <td>
                            <strong>{s.userName}</strong>
                            <div style={{fontSize: '11px', color: 'var(--ca-text-muted)'}}>{s.userId}</div>
                          </td>
                          <td>{s.tenant || s.db}</td>
                          <td>{Math.round(((s.logoutAt - s.loginAt) / 60000))} mins</td>
                          <td>{formatDateTime(s.logoutAt)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan='4' className='ca-empty'>No recent session history.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        )}
        {activeTab === 'health' && (
          <div className='ca-health-view'>
            <section className='ca-health-stats'>
              <div className='ca-card ca-stat-card'>
                <div className='ca-stat-icon status'></div>
                <div className='ca-stat-info'>
                  <span>System Integrity</span>
                  <strong className={`status-${snapshot.summary.health}`}>{snapshot.summary.health?.toUpperCase() || 'HEALTHY'}</strong>
                  <p>Overall platform performance level</p>
                </div>
              </div>
              <div className='ca-card ca-stat-card'>
                <div className='ca-stat-icon errors'></div>
                <div className='ca-stat-info'>
                  <span>Active Anomalies</span>
                  <strong>{snapshot.summary.totalErrors24h || 0}</strong>
                  <p>Critical events in the last 24 hours</p>
                </div>
              </div>
              <div className='ca-card ca-stat-card'>
                <div className='ca-stat-icon sources'></div>
                <div className='ca-stat-info'>
                  <span>Telemetry Sources</span>
                  <strong>{healthSummary.sourceBreakdown?.length || 0}</strong>
                  <p>Connected monitoring nodes</p>
                </div>
              </div>
              <div className='ca-card ca-stat-card'>
                <div className='ca-stat-icon active-users'></div>
                <div className='ca-stat-info'>
                  <span>Active Connections</span>
                  <strong>{sessionsData.activeSessions?.length || 0}</strong>
                  <p>Users currently online across all tenants</p>
                </div>
              </div>
            </section>

            <div className='ca-health-grid'>
              <div className='ca-logs-section'>
                <div className='ca-panel'>
                  <div className='ca-panel-head'>
                    <div className='ca-panel-title'>
                      <h3>Operational Intelligence Logs</h3>
                      <p>Unified diagnostic telemetry from all platform modules</p>
                    </div>
                    <button className='ca-inline-btn' onClick={loadPlatformHealth} disabled={isHealthLoading}>
                      {isHealthLoading ? 'Refreshing...' : '🔄 Refresh Data'}
                    </button>
                  </div>

                  <div className='ca-log-filter-bar'>
                    <div className='ca-filter-group'>
                      <select value={logFilter.level} onChange={(e) => {
                        const newFilter = { ...logFilter, level: e.target.value, skip: 0 };
                        setLogFilter(newFilter);
                        fetchLogs(newFilter);
                      }}>
                        <option value=''>All Severities</option>
                        <option value='info'>Info</option>
                        <option value='warn'>Warning</option>
                        <option value='error'>Error</option>
                        <option value='critical'>Critical</option>
                      </select>

                      <select value={logFilter.source} onChange={(e) => {
                        const newFilter = { ...logFilter, source: e.target.value, skip: 0 };
                        setLogFilter(newFilter);
                        fetchLogs(newFilter);
                      }}>
                        <option value=''>All Sources</option>
                        <option value='mongo'>Database (Mongo)</option>
                        <option value='auth'>Authentication</option>
                        <option value='sse'>Real-time (SSE)</option>
                        <option value='api'>API Engine</option>
                        <option value='accounting'>Accounting</option>
                        <option value='poller'>Poller Service</option>
                      </select>
                      <select value={logFilter.tenant} onChange={(e) => {
                        const newFilter = { ...logFilter, tenant: e.target.value, skip: 0 };
                        setLogFilter(newFilter);
                        fetchLogs(newFilter);
                      }}>
                        <option value=''>All Tenants</option>
                        {snapshot.tenants.map(t => (
                          <option key={t.database} value={t.database}>{t.companyName}</option>
                        ))}
                      </select>

                      {logFilter.tenant && (
                        <input 
                          type='text' 
                          placeholder='Filter Collection...' 
                          value={logFilter.collection}
                          onChange={(e) => setLogFilter({...logFilter, collection: e.target.value})}
                          onBlur={() => fetchLogs({...logFilter, skip: 0})}
                        />
                      )}
                    </div>

                    <div className='ca-filter-group'>
                      <input 
                        type='date' 
                        title='From Date'
                        value={logFilter.fromDate}
                        onChange={(e) => {
                          const newFilter = { ...logFilter, fromDate: e.target.value, skip: 0 };
                          setLogFilter(newFilter);
                          fetchLogs(newFilter);
                        }}
                      />
                      <input 
                        type='date' 
                        title='To Date'
                        value={logFilter.toDate}
                        onChange={(e) => {
                          const newFilter = { ...logFilter, toDate: e.target.value, skip: 0 };
                          setLogFilter(newFilter);
                          fetchLogs(newFilter);
                        }}
                      />
                      {logFilter.tenant && (
                        <input 
                          type='text' 
                          placeholder='Filter User ID...' 
                          value={logFilter.userId}
                          onChange={(e) => setLogFilter({...logFilter, userId: e.target.value})}
                          onBlur={() => fetchLogs({...logFilter, skip: 0})}
                        />
                      )}
                      <input 
                        type='text' 
                        placeholder='Filter Device/Browser...' 
                        value={logFilter.device}
                        onChange={(e) => setLogFilter({...logFilter, device: e.target.value})}
                        onBlur={() => fetchLogs({...logFilter, skip: 0})}
                      />
                      <input 
                        type='text' 
                        placeholder='Search Messages, IP, Device, User...' 
                        value={logFilter.search}
                        className='ca-search-large'
                        onChange={(e) => setLogFilter({...logFilter, search: e.target.value})}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const newFilter = { ...logFilter, skip: 0 };
                            fetchLogs(newFilter);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className='ca-table-wrap logs-table-container'>
                    <table className='ca-table logs-table'>
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Level</th>
                          <th>Source</th>
                          <th>Tenant</th>
                          <th>Collection</th>
                          <th>User</th>
                          <th>IP & Device</th>
                          <th>Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isHealthLoading ? (
                          <tr><td colSpan='8' className='ca-empty'>Acquiring platform telemetry...</td></tr>
                        ) : platformLogs?.logs?.length ? (platformLogs?.logs || [])?.map((log) => (
                          <tr key={log._id} className={`log-row level-${log.level}`}>
                            <td className='log-time'>{formatDateTime(log.timestamp)}</td>
                            <td><span className={`ca-badge log-badge ${log.level}`}>{log.level}</span></td>
                            <td><strong className='ca-log-source-text'>{log.source || 'system'}</strong></td>
                            <td><span className='ca-log-tenant-text'>{log.tenant || 'global'}</span></td>
                            <td>{log.collection ? <code className='ca-mini-tag'>{log.collection}</code> : '-'}</td>
                            <td><span className='ca-log-user-text'>{log.userId || '-'}</span></td>
                            <td>
                              <div className='log-env-info'>
                                <span className='log-ip'>{log.env?.ip || '-'}</span>
                                <small className='log-ua' title={log.env?.userAgent}>{log.env?.userAgent ? (log.env.userAgent.length > 20 ? log.env.userAgent.slice(0, 20) + '...' : log.env.userAgent) : '-'}</small>
                              </div>
                            </td>
                            <td className='log-message-cell'>
                              <div className='log-msg-wrap'>
                                <p>{log.message}</p>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan='8' className='ca-empty'>No diagnostic logs match the current filters.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className='ca-pagination-modern'>
                    <div className='ca-pag-info'>
                      Showing <strong>{logFilter.skip + 1}</strong> - <strong>{Math.min(logFilter.skip + 100, platformLogs.total)}</strong> of <strong>{platformLogs.total}</strong> events
                    </div>
                    <div className='ca-pag-actions'>
                      <button 
                        className='ca-inline-btn'
                        disabled={logFilter.skip === 0}
                        onClick={() => {
                          const newSkip = Math.max(0, logFilter.skip - 100);
                          const newFilter = { ...logFilter, skip: newSkip };
                          setLogFilter(newFilter);
                          fetchLogs(newFilter);
                        }}
                      >Previous</button>
                      <button 
                        className='ca-inline-btn'
                        disabled={logFilter.skip + 100 >= platformLogs.total}
                        onClick={() => {
                          const newSkip = logFilter.skip + 100;
                          const newFilter = { ...logFilter, skip: newSkip };
                          setLogFilter(newFilter);
                          fetchLogs(newFilter);
                        }}
                      >Next Page</button>
                    </div>
                  </div>
                </div>
              </div>

              <aside className='ca-health-metrics'>
                <div className='ca-panel'>
                  <div className='ca-panel-head'><h3>Anomalies by Source</h3></div>
                  <div className='ca-metrics-list'>
                    {healthSummary.sourceBreakdown?.map(item => (
                      <div className='ca-metric-row' key={item._id}>
                        <span className='ca-metric-label'>{item._id || 'unknown'}</span>
                        <div className='ca-metric-bar-wrap'>
                          <div className='ca-metric-bar' style={{width: `${Math.min(100, (item.count / (snapshot.summary.totalErrors24h || 1)) * 100)}%`}}></div>
                        </div>
                        <span className='ca-metric-value'>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className='ca-panel' style={{marginTop: '24px'}}>
                  <div className='ca-panel-head'><h3>Impacted Tenants</h3></div>
                  <div className='ca-metrics-list'>
                    {healthSummary.topTenants?.map(item => (
                      <div className='ca-metric-row' key={item._id}>
                        <span className='ca-metric-label'>{item._id || 'Platform'}</span>
                        <span className='ca-metric-value text-danger'>{item.count} alerts</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className='ca-panel' style={{marginTop: '24px'}}>
                  <div className='ca-panel-head'><h3>Live Monitors</h3></div>
                  <div className='ca-monitors'>
                    <div className='ca-monitor-item'>
                      <div className='ca-monitor-dot active'></div>
                      <span>Database Engine</span>
                      <strong className='text-success'>Online</strong>
                    </div>
                    <div className='ca-monitor-item'>
                      <div className='ca-monitor-dot active'></div>
                      <span>SSE Broadcast</span>
                      <strong className='text-success'>Healthy</strong>
                    </div>
                    <div className='ca-monitor-item'>
                      <div className='ca-monitor-dot active'></div>
                      <span>Mail Transport</span>
                      <strong className='text-success'>Ready</strong>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        {activeTab === 'epsilonUsage' && (
          <div className='ca-health-view'>
            <section className='ca-health-stats'>
              <div className='ca-card ca-stat-card'>
                <div className='ca-stat-icon status'></div>
                <div className='ca-stat-info'>
                  <span>Tokens Today</span>
                  <strong>{(epsilonOverview?.today?.totalTokens || 0).toLocaleString()}</strong>
                  <p>≈ ₦{(epsilonOverview?.today?.totalNaira || 0).toLocaleString()} across every workspace</p>
                </div>
              </div>
              <div className='ca-card ca-stat-card'>
                <div className='ca-stat-icon errors'></div>
                <div className='ca-stat-info'>
                  <span>Tokens This Month</span>
                  <strong>{(epsilonOverview?.month?.totalTokens || 0).toLocaleString()}</strong>
                  <p>≈ ₦{(epsilonOverview?.month?.totalNaira || 0).toLocaleString()} across every workspace</p>
                </div>
              </div>
              <div className='ca-card ca-stat-card'>
                <div className='ca-stat-icon status'></div>
                <div className='ca-stat-info'>
                  <span>Real Margin This Month</span>
                  <strong>₦{(epsilonOverview?.month?.marginNaira || 0).toLocaleString()}</strong>
                  <p>
                    ₦{(epsilonOverview?.month?.totalNaira || 0).toLocaleString()} charged − real Anthropic cost
                    (${(epsilonOverview?.month?.totalUsd || 0).toLocaleString()} ≈ ₦{(epsilonOverview?.month?.totalNgnEquivalent || 0).toLocaleString()} at ₦{epsilonOverview?.usdToNgn || '—'}/$).
                    {(epsilonOverview?.month?.costCoveredTokens || 0) < (epsilonOverview?.month?.totalTokens || 0) && ' Some tokens predate cost tracking and are excluded — this is a floor, not the exact figure.'}
                  </p>
                </div>
              </div>
              <div className='ca-card ca-stat-card'>
                <div className='ca-stat-icon sources'></div>
                <div className='ca-stat-info'>
                  <span>Active Tenants (30d)</span>
                  <strong>{epsilonOverview?.topTenants?.length || 0}</strong>
                  <p>Workspaces that have sent Epsilon at least one message</p>
                </div>
              </div>
              <div className='ca-card ca-stat-card'>
                <div className='ca-stat-icon active-users'></div>
                <div className='ca-stat-info'>
                  <span>Active Users (30d)</span>
                  <strong>{epsilonOverview?.topUsers?.length || 0}</strong>
                  <p>Employees that have sent Epsilon at least one message</p>
                </div>
              </div>
            </section>

            <section className='ca-grid-two'>
              <form className='ca-panel' onSubmit={handleCreateEpsilonSubscription}>
                <div className='ca-panel-head'>
                  <h3>Create Epsilon subscription for a tenant</h3>
                </div>
                <div className='ca-panel-content'>
                  <p className='ca-panel-note'>
                    Free grant, bypasses Paystack entirely — same as the manual subscription/offline-license forms.
                    Set seats to 0 to revoke.
                  </p>
                  <div className='ca-form-grid'>
                    <label>
                      <span>Tenant database</span>
                      <select name='database' value={epsilonSubForm.database} onChange={handleEpsilonSubField}>
                        <option value=''>Select tenant</option>
                        {snapshot.tenants.map((tenant) => (
                          <option key={tenant.database} value={tenant.database}>{tenant.companyName} ({tenant.database})</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Seats</span>
                      <input type='number' min='0' name='seats' value={epsilonSubForm.seats} onChange={handleEpsilonSubField} />
                    </label>
                  </div>
                  <button className='ca-primary-btn' type='submit' disabled={isCreatingEpsilonSub}>
                    {isCreatingEpsilonSub ? 'Processing...' : 'Create Epsilon Subscription'}
                  </button>
                </div>
              </form>

              <div className='ca-panel'>
                <div className='ca-panel-head'>
                  <h3>Epsilon pricing</h3>
                </div>
                <div className='ca-panel-content'>
                  <p className='ca-panel-note'>
                    What every tenant actually pays for Epsilon — both figures feed the pricing page and the
                    in-app purchase flow directly. These were previously only editable from Offline Licenses
                    (per-seat price) and Admin Settings (token rate); consolidated here since they are both
                    Epsilon-specific.
                  </p>
                  <div className='ca-form-grid'>
                    <label>
                      <span>Price per seat, per month (₦)</span>
                      <input
                        type='number'
                        min='0'
                        value={epsilonSeatPriceDraft}
                        onChange={(e) => setEpsilonSeatPriceDraft(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Token price (₦ per 1,000 tokens)</span>
                      <input
                        type='number'
                        min='0'
                        value={globalSettingsForm.epsilonTokenPriceNaira}
                        onChange={(e) => setGlobalSettingsForm({ ...globalSettingsForm, epsilonTokenPriceNaira: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                  <div className='ca-panel-head-actions'>
                    <button className='ca-primary-btn' type='button' onClick={handleSaveEpsilonSeatPrice} disabled={isSavingSeatPrice}>
                      {isSavingSeatPrice ? 'Saving...' : 'Save Seat Price'}
                    </button>
                    <button
                      className='ca-primary-btn'
                      type='button'
                      onClick={async () => {
                        setIsSavingTokenPrice(true)
                        await handleUpdateGlobalSettings()
                        setIsSavingTokenPrice(false)
                      }}
                      disabled={isSavingTokenPrice}
                    >
                      {isSavingTokenPrice ? 'Saving...' : 'Save Token Price'}
                    </button>
                  </div>
                </div>
              </div>

              <div className='ca-panel'>
                <div className='ca-panel-head'>
                  <h3>Epsilon real cost / margin tracking</h3>
                </div>
                <div className='ca-panel-content'>
                  <p className='ca-panel-note'>
                    What Epsilon actually costs from Anthropic, vs. the token price charged above — the gap is
                    real margin (see the "Real Margin This Month" card). Manually maintained: Anthropic's rates
                    and the exchange rate both drift over time and aren't fetched automatically, so keep these
                    current yourself.
                  </p>
                  <div className='ca-form-grid'>
                    <label>
                      <span>Exchange rate (₦ per $1)</span>
                      <input
                        type='number'
                        min='0'
                        value={globalSettingsForm.epsilonUsdToNgn}
                        onChange={(e) => setGlobalSettingsForm({ ...globalSettingsForm, epsilonUsdToNgn: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      <span>Fast model (tried first, escalates only if a tool call is needed)</span>
                      <input
                        type='text'
                        value={globalSettingsForm.epsilonFastModel}
                        onChange={(e) => setGlobalSettingsForm({ ...globalSettingsForm, epsilonFastModel: e.target.value })}
                        placeholder='claude-haiku-4-5-20251001'
                      />
                    </label>
                    <label>
                      <span>Fast-model routing</span>
                      <select
                        value={globalSettingsForm.epsilonFastModelEnabled ? 'enabled' : 'disabled'}
                        onChange={(e) => setGlobalSettingsForm({ ...globalSettingsForm, epsilonFastModelEnabled: e.target.value === 'enabled' })}
                      >
                        <option value='enabled'>Enabled</option>
                        <option value='disabled'>Disabled (Sonnet-only)</option>
                      </select>
                    </label>
                  </div>
                  {Object.entries(globalSettingsForm.epsilonModelRatesUsd || {}).map(([modelId, rates]) => (
                    <div key={modelId} style={{ marginTop: 16 }}>
                      <p className='ca-panel-note' style={{ marginBottom: 4 }}><strong>{modelId}</strong> — USD per 1,000,000 tokens</p>
                      <div className='ca-form-grid'>
                        {['inputPerM', 'outputPerM', 'cacheWritePerM', 'cacheReadPerM'].map((field) => (
                          <label key={field}>
                            <span>{field.replace('PerM', '')}</span>
                            <input
                              type='number'
                              min='0'
                              step='0.01'
                              value={rates[field]}
                              onChange={(e) => setGlobalSettingsForm({
                                ...globalSettingsForm,
                                epsilonModelRatesUsd: {
                                  ...globalSettingsForm.epsilonModelRatesUsd,
                                  [modelId]: { ...rates, [field]: Number(e.target.value) },
                                },
                              })}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className='ca-panel-head-actions'>
                    <button className='ca-primary-btn' type='button' onClick={handleUpdateGlobalSettings} disabled={isBusy}>
                      {isBusy ? 'Saving...' : 'Save Cost Tracking Config'}
                    </button>
                  </div>
                </div>
              </div>

              <form className='ca-panel' style={{ gridColumn: '1 / -1' }} onSubmit={handleGrantEmployeeEpsilonAccess}>
                <div className='ca-panel-head'>
                  <h3>Grant an employee Epsilon access directly</h3>
                </div>
                <div className='ca-panel-content'>
                  <p className='ca-panel-note'>
                    Bypasses Team Access entirely — use this when a tenant's own super admin needs a seat right
                    now (they cannot edit their own profile from Settings, so a seat granted to them above has
                    no self-service way to actually reach them). The rate-limit reset below uses the same
                    tenant/email fields — deliberately platform-operator-only: a workspace admin resetting their
                    own limit would defeat the point of having one.
                  </p>
                  <div className='ca-form-grid'>
                    <label>
                      <span>Tenant database</span>
                      <select name='database' value={epsilonEmployeeGrantForm.database} onChange={handleEpsilonEmployeeGrantField}>
                        <option value=''>Select tenant</option>
                        {snapshot.tenants.map((tenant) => (
                          <option key={tenant.database} value={tenant.database}>{tenant.companyName} ({tenant.database})</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Employee email</span>
                      <input type='email' name='emailid' value={epsilonEmployeeGrantForm.emailid} onChange={handleEpsilonEmployeeGrantField} placeholder='admin@company.com' />
                    </label>
                  </div>
                  <div className='ca-panel-head-actions'>
                    <button className='ca-primary-btn' type='submit' disabled={isGrantingEmployeeAccess}>
                      {isGrantingEmployeeAccess ? 'Granting...' : 'Grant Epsilon Access'}
                    </button>
                    <button
                      className='ca-primary-btn'
                      type='button'
                      onClick={() => handleResetEmployeeRateLimit(epsilonEmployeeGrantForm.database, epsilonEmployeeGrantForm.emailid.trim())}
                      disabled={!!isResettingEmployeeRateLimit}
                    >
                      {isResettingEmployeeRateLimit ? 'Resetting...' : 'Reset Their Rate Limit Now'}
                    </button>
                  </div>
                </div>
              </form>
            </section>

            <div className='ca-health-grid'>
              <div className='ca-logs-section'>
                <div className='ca-panel'>
                  <div className='ca-panel-head'>
                    <div className='ca-panel-title'>
                      <h3>Top tenants using Epsilon (last 30 days)</h3>
                      <p>Who's actually using the AI assistant — click a tenant in the Tenants tab for the full per-user breakdown and chart.</p>
                    </div>
                    <button className='ca-inline-btn' onClick={loadEpsilonOverview}>🔄 Refresh</button>
                  </div>
                  <div className='ca-table-wrap'>
                    <table className='ca-table'>
                      <thead>
                        <tr><th>Tenant</th><th>Tokens</th><th>≈ Naira</th></tr>
                      </thead>
                      <tbody>
                        {epsilonOverview?.topTenants?.length ? epsilonOverview.topTenants.map((row) => (
                          <tr key={row.database}>
                            <td>
                              <strong>{row.companyName}</strong>
                              <button className='ca-inline-btn' style={{ marginLeft: 10 }} onClick={() => { setActiveTab('tenants'); loadTenantDetails(row.database); }}>View</button>
                            </td>
                            <td>{row.totalTokens.toLocaleString()}</td>
                            <td>₦{row.totalNaira.toLocaleString()}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan='3' className='ca-empty'>No Epsilon usage recorded in the last 30 days.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <aside className='ca-health-metrics'>
                <div className='ca-panel'>
                  <div className='ca-panel-head'><h3>Top users (last 30 days)</h3></div>
                  <div className='ca-metrics-list'>
                    {epsilonOverview?.topUsers?.length ? epsilonOverview.topUsers.map((row) => (
                      <div className='ca-metric-row ca-metric-row-userlist' key={`${row.database}:${row.userEmail}`}>
                        <span className='ca-metric-label ca-metric-label-wide' title={`${row.userEmail} (${row.companyName})`}>
                          {row.userEmail} <small>({row.companyName})</small>
                        </span>
                        <span className='ca-metric-value ca-metric-value-wide'>{row.totalTokens.toLocaleString()} tok</span>
                      </div>
                    )) : (
                      <div className='ca-empty'>No user activity yet.</div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        {activeTab === 'connectivity' && (
          <div className='ca-connectivity-view'>
            <section className='ca-panel'>
              <div className='ca-panel-head'>
                <div className='ca-panel-title'>
                  <h3>Connected Tenants & Active Users</h3>
                  <p>Real-time view of current platform utilization across all workspaces</p>
                </div>
                <button className='ca-inline-btn' onClick={loadSessions} disabled={isSessionsLoading}>
                   {isSessionsLoading ? 'Scanning...' : '🔄 Refresh Connectivity'}
                </button>
              </div>
              
              <div className='ca-connectivity-grid'>
                {tenantConnectionGroups.map(([db, users]) => {
                    const tenantInfo = snapshot.tenants.find(t => t.database === db);
                    return (
                      <div className='ca-tenant-con-card' key={db}>
                        <div className='ca-tenant-con-head'>
                          <div>
                            <strong>{tenantInfo?.companyName || db}</strong>
                            <span>{db}</span>
                          </div>
                          <div className='ca-con-badge'>{users.length} Active</div>
                        </div>
                        <div className='ca-tenant-con-users'>
                          {users.map(u => (
                            <div className='ca-con-user-row' key={u._id}>
                              <div className='ca-con-user-info'>
                                <strong>{u.userName}</strong>
                                <span>{u.userId}</span>
                              </div>
                              <div className='ca-con-user-meta'>
                                <span>{u.ip}</span>
                                <span>{formatDateTime(u.lastActivityAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                
                {sessionsData.activeSessions.length === 0 && (
                  <div className='ca-empty' style={{gridColumn: '1/-1'}}>
                    No active connections detected at the moment.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'support' && (
          <div className={`ca-support-layout ${!!selectedEnquiry ? 'has-selection' : ''}`}>
            <div className='ca-support-sidebar'>
              <div className='ca-panel-head'>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <h3>Visitor Enquiries</h3>
                  <button 
                    className='ca-inline-btn' 
                    onClick={loadEnquiries} 
                    disabled={isBusy} 
                    style={{ padding: '4px 8px' }}
                    title="Refresh list"
                  >
                    {isBusy ? '...' : '🔄'}
                  </button>
                </div>
              </div>
              <div className='ca-support-list'>
                {enquiries.length ? enquiries.map((enq) => (
                  <div 
                    key={enq._id} 
                    className={`ca-support-item ${selectedEnquiry?._id === enq._id ? 'active' : ''} ${enq.status}`}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedEnquiry(enq);
                      setNotice('info', `Viewing enquiry from ${enq.name}`);
                      
                      // Mark as read in backend
                      if (getUnreadCount(enq) > 0) {
                        try {
                          await requestAdmin('POST', 'central/support/mark-as-read', { enquiryId: enq._id });
                          // Update local state to reflect read status
                          setEnquiries(prev => prev.map(item => 
                            item._id === enq._id 
                              ? { ...item, read: true, replies: (item.replies || []).map(r => r.repliedBy === 'visitor' ? { ...r, read: true } : r) } 
                              : item
                          ));
                        } catch (err) {
                          console.error('Failed to mark as read', err);
                        }
                      }
                    }}
                  >
                    <div className='ca-support-item-head'>
                      <strong>{enq.name}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getUnreadCount(enq) > 0 && (
                          <span className='ca-unread-pill'>{getUnreadCount(enq)}</span>
                        )}
                        <span className={`ca-badge ${enq.status}`}>{enq.status}</span>
                      </div>
                    </div>
                    <p className='ca-support-item-sub'>{enq.subject}</p>
                    <span className='ca-support-item-time'>{formatDateTime(enq.createdAt)}</span>
                  </div>
                )) : <div className='ca-empty'>No enquiries found.</div>}
              </div>
            </div>

            <div className='ca-support-main'>
              {selectedEnquiry ? (
                <div className='ca-support-conversation'>
                  <div className='ca-panel-head'>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <button 
                          className='ca-back-btn'
                          onClick={() => setSelectedEnquiry(null)}
                        >
                          ← Back
                        </button>
                        <h3>{selectedEnquiry.subject}</h3>
                        <button 
                          className='ca-inline-btn' 
                          onClick={refreshSelectedEnquiry} 
                          disabled={isBusy}
                          title="Refresh conversation"
                        >
                          {isBusy ? '...' : '🔄'}
                        </button>
                      </div>
                      <p>From: {selectedEnquiry.name} ({selectedEnquiry.email})</p>
                      <div className='ca-support-meta'>
                        {selectedEnquiry.tenant && (
                          <span title="Source Tenant">🏢 {selectedEnquiry.tenant}</span>
                        )}
                        {selectedEnquiry.visitorUserEmail && selectedEnquiry.visitorUserEmail !== selectedEnquiry.email && (
                          <span title="Visitor Account Email">👤 {selectedEnquiry.visitorUserEmail}</span>
                        )}
                      </div>
                    </div>
                    <span className='ca-support-item-time'>{formatDateTime(selectedEnquiry.createdAt)}</span>
                  </div>

                  <div className='ca-support-chat'>
                    <div className='ca-chat-msg visitor'>
                      <div className='ca-chat-bubble'>
                        <p>{selectedEnquiry.message}</p>
                        <span className='ca-chat-time'>{formatDateTime(selectedEnquiry.createdAt)}</span>
                      </div>
                    </div>

                    {selectedEnquiry.replies?.map((reply, idx) => {
                      const isVisitorReply = reply.repliedBy === 'visitor' || reply.source === 'email-reply'
                      return (
                        <div key={idx} className={`ca-chat-msg ${isVisitorReply ? 'visitor' : 'admin'}`}>
                          <div className='ca-chat-bubble'>
                            <p>{reply.message}</p>
                            <span className='ca-chat-time'>
                              {formatDateTime(reply.repliedAt)}
                              {' · '}
                              {isVisitorReply
                                ? `${reply.fromName || reply.from || selectedEnquiry.name} (via email)`
                                : `Admin${reply.repliedBy ? ` — ${reply.repliedBy}` : ''}`}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={chatBottomRef} />
                  </div>

                  <div className='ca-support-reply-box'>
                    <textarea 
                      placeholder='Type your reply here... (Visitor will receive this via email)' 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <div className='ca-reply-actions'>
                      <button 
                        className='ca-primary-btn' 
                        onClick={handleSendReply}
                        disabled={isBusy || !replyText.trim()}
                        title="Send Reply"
                      >
                        {isBusy ? '...' : '➤'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='ca-support-empty'>
                  <div className='ca-empty-icon'>💬</div>
                  <h3>Select an enquiry to view conversation</h3>
                  <p>All replies will be logged and forwarded to the visitor's email address instantly.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default CentralAdminApp
