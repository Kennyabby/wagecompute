import './CentralAdmin.css'
import { useEffect, useMemo, useRef, useState } from 'react'

const SERVER = "https://api.epxcentral.com"
// const SERVER = "http://localhost:3001"
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
    username: 'admin',
    password: 'admin123',
  })
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
  })
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [isBusy, setIsBusy] = useState(false)
  const [actionDatabase, setActionDatabase] = useState('')
  const [isReconcilingPending, setIsReconcilingPending] = useState(false)
  const [tenantFilter, setTenantFilter] = useState('')
  const [selectedTenant, setSelectedTenant] = useState('')
  const [tenantDetails, setTenantDetails] = useState(null)
  const [tenantDetailsLoading, setTenantDetailsLoading] = useState(false)
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
        defaultFreeTrialDays: response.settings?.defaultFreeTrialDays || 14
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
    setActiveTab('overview')
    setNotice('success', 'Central admin login successful.')
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
    } catch (error) {
      setNotice('error', error.message || 'Unable to load tenant details.')
    } finally {
      setTenantDetailsLoading(false)
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
          <div className='ca-login-kicker'>Enterprise Compute Central Admin</div>
          <h1>Independent platform control plane</h1>
          <p>
            Manage all tenants, subscriptions, database usage, users, profiles, and platform-level controls from one secure admin surface.
          </p>
          <div className='ca-login-points'>
            <div><strong>Tenants</strong><span>Watch the full estate from one place</span></div>
            <div><strong>Subscriptions</strong><span>Control renewals, suspensions, and billing</span></div>
            <div><strong>Accounts</strong><span>Inspect users, profiles, and live activity</span></div>
          </div>
          {feedback.message ? <div className={`ca-alert ${feedback.type}`}>{feedback.message}</div> : null}
          <form className='ca-login-form' onSubmit={handleLogin}>
            <label>
              <span>Admin username</span>
              <input name='username' value={loginForm.username} onChange={handleLoginInput} />
            </label>
            <label>
              <span>Password</span>
              <input name='password' type='password' value={loginForm.password} onChange={handleLoginInput} />
            </label>
            <button type='submit' disabled={isBusy}>{isBusy ? 'Signing in...' : 'Sign in to Central Admin'}</button>
          </form>
          <div className='ca-default-cred'>
            Default bootstrap credentials: <strong>admin</strong> / <strong>admin123</strong>
          </div>
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
            ['support', 'Help & Support', '💬'],
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
          <button className='ca-ghost-btn' onClick={loadSnapshot} disabled={isBusy} title={isSidebarCollapsed ? "Refresh" : ""}>
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
            <h2>{activeTab === 'overview' ? 'Global operations view' : activeTab === 'tenants' ? 'Tenant estate' : activeTab === 'subscriptions' ? 'Subscriptions & billing' : 'Admin settings'}</h2>
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
              <section className='ca-grid-two'>
              <div className='ca-panel'>
                <div className='ca-panel-head'>
                  <h3>{tenantDetailsLoading ? 'Loading tenant details...' : `Tenant accounts and profiles: ${tenantDetails?.companyProfile?.name || selectedTenant}`}</h3>
                </div>
                {!tenantDetailsLoading && tenantDetails && (
                  <div className='ca-detail-stack'>
                    <div className='ca-mini-grid'>
                      <div className='ca-mini-card'><span>Database</span><strong>{tenantDetails.companyProfile?.db || '--'}</strong></div>
                      <div className='ca-mini-card'><span>Subdomain</span><strong>{tenantDetails.companyProfile?.subdomain || '--'}</strong></div>
                      <div className='ca-mini-card'><span>Subscription</span><strong>{formatStatus(tenantDetails.subscriptionStatus?.statusLabel)}</strong></div>
                      <div className='ca-mini-card'><span>Expires</span><strong>{formatDateTime(tenantDetails.subscriptionStatus?.expiresAt)}</strong></div>
                      <div className='ca-mini-card'><span>Trial status</span><strong>{formatStatus(tenantDetails.subscriptionStatus?.trialSuspended ? 'trial_suspended' : (tenantDetails.subscriptionStatus?.trialActive ? 'trial_active' : tenantDetails.subscriptionStatus?.trialExpired ? 'trial_expired' : 'not_on_trial'))}</strong></div>
                      <div className='ca-mini-card'><span>Trial expiry</span><strong>{formatDateTime(tenantDetails.subscriptionStatus?.trialExpiresAt)}</strong></div>
                    </div>

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

                    <div className='ca-table-wrap'>
                      <table className='ca-table'>
                        <thead>
                          <tr>
                            <th>Tenant profiles</th>
                            <th>Status</th>
                            <th>Permissions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tenantDetails.tenantProfiles?.length ? tenantDetails.tenantProfiles.map((profile, index) => (
                            <tr key={`${profile.emailid}-${index}`}>
                              <td>{profile.emailid}</td>
                              <td>{profile.status || profile.access || '--'}</td>
                              <td>{Array.isArray(profile.permissions) ? profile.permissions.slice(0, 4).join(', ') : '--'}</td>
                            </tr>
                          )) : <tr><td colSpan='3' className='ca-empty'>No tenant profile records found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className='ca-panel'>
                <div className='ca-panel-head'>
                  <h3>Employees and recent operational activity</h3>
                </div>
                {!tenantDetailsLoading && tenantDetails && (
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
              </div>
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

        {activeTab === 'settings' && (
          <>
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
                  <div className='full'>
                    <button className='ca-primary-btn' type='submit' disabled={isBusy}>
                      {isBusy ? 'Saving...' : 'Update Settings'}
                    </button>
                  </div>
                </form>
              </div>
            </section>
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
