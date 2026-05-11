import './SubPages.css'
import { useState, useEffect, useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from './NavBar'
import Footer from './Footer'
import ContextProvider from '../../Resources/ContextProvider'

const FALLBACK_STANDARD_PRICE = 92000
const FREE_TRIAL_DAYS = 14
// App catalog for the platform - all 15 actual apps with dependencies
// Free trial includes core + HR + basic accounting; Standard adds operations and full suite
// Price varies based on selected apps, max 92,000 NGN
const APPS = [
  // Core apps (always included)
  { key: 'dashboard', name: 'Dashboard', category: 'core', deps: [], tier: 'free' },
  { key: 'settings', name: 'Settings', category: 'core', deps: [], tier: 'free' },
  
  // HR & People Management (interdependent)
  { key: 'employees', name: 'Employees', category: 'hr', deps: [], tier: 'free' },
  { key: 'departments', name: 'Departments', category: 'hr', deps: ['employees'], tier: 'free' },
  { key: 'positions', name: 'Positions', category: 'hr', deps: ['employees', 'departments'], tier: 'free' },
  { key: 'attendance', name: 'Attendance', category: 'hr', deps: ['employees'], tier: 'free' },
  { key: 'payroll', name: 'Payroll', category: 'hr', deps: ['employees', 'attendance', 'departments', 'positions'], tier: 'standard' },
  
  // Operations & Inventory (standard tier)
  { key: 'inventory', name: 'Inventory', category: 'ops', deps: [], tier: 'standard' },
  { key: 'purchase', name: 'Purchase', category: 'ops', deps: ['inventory'], tier: 'standard' },
  
  // Sales & Delivery (standard tier)
  { key: 'sales', name: 'Sales', category: 'sales', deps: ['inventory'], tier: 'standard' },
  { key: 'delivery', name: 'Delivery', category: 'sales', deps: ['sales'], tier: 'standard' },
  { key: 'pos', name: 'POS', category: 'sales', deps: ['sales', 'inventory'], tier: 'standard' },
  
  // Hospitality & Services (standard tier)
  { key: 'accommodation', name: 'Accommodation', category: 'services', deps: [], tier: 'standard' },
  
  // Finance & Accounting (standard tier)
  { key: 'expenses', name: 'Expenses', category: 'accounting', deps: [], tier: 'standard' },
  { key: 'journals', name: 'Journals & COA', category: 'accounting', deps: ['expenses'], tier: 'standard' },
]

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`

const RESERVED_SUBDOMAINS = new Set(['www', 'admin', 'localhost'])

const detectWorkspaceSubdomain = () => {
  const hostname = window.location.hostname || ''
  if (!hostname) return ''

  if (hostname.endsWith('.localhost')) {
    const root = hostname.replace(/\.localhost$/, '')
    return RESERVED_SUBDOMAINS.has(root) ? '' : root
  }

  const hostParts = hostname.split('.').filter(Boolean)
  if (hostParts.length >= 3) {
    const candidate = hostParts[0].toLowerCase()
    return RESERVED_SUBDOMAINS.has(candidate) ? '' : candidate
  }

  return ''
}

const buildWorkspacePricingUrl = (subdomain) => {
  if (!subdomain) return ''
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const port = window.location.port ? `:${window.location.port}` : ''
  // Redirect into tenant's public pricing route so checkout can continue inside the tenant
  const query = `?billing=1&src=public_pricing`

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
    return `${protocol}//${subdomain}.localhost${port}/pricing${query}`
  }

  const hostParts = hostname.split('.').filter(Boolean)
  const rootDomain = hostParts.length >= 2 ? hostParts.slice(-2).join('.') : hostname
  return `${protocol}//${subdomain}.${rootDomain}/pricing${query}`
}

const buildTenantBaseUrl = (subdomain) => {
  if (!subdomain) return ''
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const port = window.location.port ? `:${window.location.port}` : ''

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
    return `${protocol}//${subdomain}.localhost${port}`
  }

  const hostParts = hostname.split('.').filter(Boolean)
  const rootDomain = hostParts.length >= 2 ? hostParts.slice(-2).join('.') : hostname
  return `${protocol}//${subdomain}.${rootDomain}`
}

const getAppInitials = (name) => {
  if (!name) return ''
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase()
  return (parts[0][0] + (parts[1][0] || '')).toUpperCase()
}

const PricingPage = () => {
  const { storePath, fetchServer, server } = useContext(ContextProvider)
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('standard')
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [teamSize, setTeamSize] = useState(8)
  const [checkoutForm, setCheckoutForm] = useState({
    workspaceSubdomain: '',
  })
  const [selectedOptionalApps, setSelectedOptionalApps] = useState([])
  const [checkoutState, setCheckoutState] = useState({
    loading: false,
    verifying: false,
    type: '',
    message: '',
    reference: '',
    paystackMode: '',
  })
  const [disablePaystackPayment, setDisablePaystackPayment] = useState(false)
  const [liveStandardPlan, setLiveStandardPlan] = useState(null)
  const [liveTrialDays, setLiveTrialDays] = useState(FREE_TRIAL_DAYS)
  const [workspaceCheck, setWorkspaceCheck] = useState({
    checking: false,
    exists: null,
    companyName: '',
    detectedFromHost: false,
    resolvedUrl: '',
  })

  useEffect(() => {
    const loadPlatformConfig = async () => {
      try {
        const response = await fetch(`${server}/platform-plans`)
        const data = await response.json()
        if (data.ok) {
          const standard = (data.plans || []).find(p => p.key === 'standard-monthly')
          if (standard) setLiveStandardPlan(standard)
          if (data.settings?.defaultFreeTrialDays) setLiveTrialDays(data.settings.defaultFreeTrialDays)
          if (data.disablePaystackPayment) setDisablePaystackPayment(true)
        }
      } catch (err) {
        console.error('Failed to load platform config', err)
      }
    }
    loadPlatformConfig()
  }, [server])

  const plans = useMemo(() => ([
    {
      key: 'free',
      name: 'Free Trial',
      priceLabel: '0',
      period: `for ${liveTrialDays} days`,
      desc: 'Start with the full Standard experience before payment is required.',
      highlight: false,
      badge: 'Best for first setup',
      features: [
        `${liveTrialDays}-day free access to the Standard plan`,
        'Multiple users can explore the same tenant workspace',
        'All core apps, accounting, approvals, dashboard summaries, and offline sync',
        'Expiry warning banner with direct upgrade path before suspension',
      ],
      cta: 'Start Free Trial',
      action: () => navigate('/signup'),
    },
    {
      key: 'standard',
      name: liveStandardPlan?.name || 'Standard',
      priceLabel: formatCurrency(liveStandardPlan?.amountNaira ?? FALLBACK_STANDARD_PRICE),
      period: '/month',
      desc: 'Monthly subscription for multiple users with full access to all apps.',
      highlight: true,
      badge: 'Recommended for live teams',
      features: [
        'Multiple users on one tenant workspace',
        'All operational apps: POS, Delivery, Inventory, HR, Payroll, Sales, Purchase, Expenses, Accommodation',
        'Journals, Chart of Accounts, ledgers, Trial Balance, Balance Sheet, and Profit & Loss',
        'Live dashboard summaries, SSE sync, approvals, and offline-ready workflows',
      ],
      cta: 'Proceed to Paystack',
      action: () => {
        setSelectedPlan('standard')
        document.getElementById('pricing-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      },
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      priceLabel: 'Custom',
      period: '',
      desc: 'For advanced rollouts, implementation partnerships, and specialized operating models.',
      highlight: false,
      badge: 'Custom scope',
      features: [
        'Custom onboarding and rollout sequencing',
        'Commercial terms for large teams and special deployments',
        'Tailored implementation support and account management',
        'Scoping for bespoke integrations and operational extensions',
      ],
      cta: 'Talk to Sales',
      action: () => navigate('/help'),
    },
  ]), [navigate, liveStandardPlan, liveTrialDays])

  const faqs = [
    {
      q: 'What does the Standard subscription include?',
      a: 'The Standard plan gives your tenant multiple-user access to every core operational app and the full accounting experience, including journals, COA, ledgers, Balance Sheet, Trial Balance, Profit and Loss, approvals, offline sync, and live dashboard summaries.',
    },
    {
      q: 'Can I start with a free trial first?',
      a: `Yes. New tenants start with a ${liveTrialDays}-day free Standard trial. During that window the platform shows a warning banner as expiry approaches, and payment becomes required after the trial ends.`,
    },
    {
      q: 'Can Paystack run in test mode or live mode?',
      a: 'Yes. The platform now supports both Paystack test keys and live keys so billing can be validated safely before going live in production.',
    },
    {
      q: 'How is billing handled?',
      a: 'Existing tenants are routed into their own workspace billing flow, where Paystack checkout is verified against the tenant order and can still be reconciled later if a network issue delayed the first update.',
    },
    {
      q: 'Do I need a separate license for each module?',
      a: 'No. The Standard subscription is positioned as one monthly platform plan for all apps in the workspace, rather than separate module purchases.',
    },
  ]

  const comparison = [
    { feature: 'Users', free: 'Multiple users', standard: 'Multiple users', enterprise: 'Custom' },
    { feature: 'Apps included', free: 'All apps', standard: 'All apps', enterprise: 'All apps + bespoke scope' },
    { feature: 'Accounting suite', free: 'Included', standard: 'Included', enterprise: 'Included' },
    { feature: 'Trial / billing', free: `${FREE_TRIAL_DAYS}-day trial`, standard: 'Monthly plan', enterprise: 'Custom quote' },
    { feature: 'Dashboard summaries', free: 'Live', standard: 'Live', enterprise: 'Live + tailored rollout' },
    { feature: 'Offline support', free: 'Included', standard: 'Included', enterprise: 'Included' },
    { feature: 'Approvals & workflow', free: 'Included', standard: 'Included', enterprise: 'Included' },
    { feature: 'Commercial model', free: 'Zero upfront', standard: `NGN ${Number(liveStandardPlan?.amountNaira ?? FALLBACK_STANDARD_PRICE).toLocaleString()} / month`, enterprise: 'Custom quote' },
  ]

  const calculator = useMemo(() => {
    const activePlan = selectedPlan === 'free' ? 'free' : 'standard'
    
    if (activePlan === 'free') {
      // Free tier: core + basic HR + basic accounting = 0 cost
      const freeApps = APPS.filter(a => a.tier === 'free')
      return {
        activePlan,
        monthlyTotal: 0,
        yearlyTotal: 0,
        billedTotal: 0,
        appCount: freeApps.length,
        appsList: freeApps.map(a => a.name),
        selectedApps: [],
      }
    }
    
    // Standard tier: all apps selectable, price based on what's selected, max live plan price
    const standardApps = APPS.filter(a => a.tier === 'standard')
    const coreApps = APPS.filter(a => a.tier === 'free' || a.tier === 'core')
    const standardPrice = liveStandardPlan?.amountNaira ?? FALLBACK_STANDARD_PRICE

    // Selected apps within standard tier
    const selectedStandardApps = standardApps.filter(a => selectedOptionalApps.includes(a.key))

    // Price as proportion of selected apps vs total standard apps
    const pricePercentage = standardApps.length > 0 ? selectedStandardApps.length / standardApps.length : 0
    const monthlyTotal = Math.round(standardPrice * pricePercentage)
    const yearlyTotal = monthlyTotal * 12
    const billedTotal = billingCycle === 'yearly' ? yearlyTotal : monthlyTotal
    
    const allSelectedApps = [...coreApps, ...selectedStandardApps]
    
    return {
      activePlan,
      monthlyTotal,
      yearlyTotal,
      billedTotal,
      appCount: allSelectedApps.length,
      appsList: allSelectedApps.map(a => a.name),
      selectedApps: selectedStandardApps.map(a => a.key),
      standardAppCount: standardApps.length,
      selectedStandardCount: selectedStandardApps.length,
    }
  }, [billingCycle, selectedPlan, selectedOptionalApps, liveStandardPlan])

  useEffect(() => {
    storePath('pricing')
    document.title = 'Pricing - Enterprise Compute'
  }, [storePath])

  useEffect(() => {
    const detectedSubdomain = detectWorkspaceSubdomain()
    if (!detectedSubdomain) return
    setCheckoutForm((current) => (
      current.workspaceSubdomain ? current : { ...current, workspaceSubdomain: detectedSubdomain }
    ))
    setWorkspaceCheck((current) => ({
      ...current,
      detectedFromHost: true,
      resolvedUrl: buildWorkspacePricingUrl(detectedSubdomain),
    }))
  }, [])

  useEffect(() => {
    const subdomain = String(checkoutForm.workspaceSubdomain || '').trim().toLowerCase()
    if (!subdomain || subdomain.length < 3) {
      setWorkspaceCheck((current) => ({
        ...current,
        checking: false,
        exists: null,
        companyName: '',
        resolvedUrl: subdomain ? buildWorkspacePricingUrl(subdomain) : '',
      }))
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setWorkspaceCheck((current) => ({
        ...current,
        checking: true,
        resolvedUrl: buildWorkspacePricingUrl(subdomain),
      }))
      const response = await fetchServer('POST', { subdomain }, 'checkCompanyExists', server)
      if (cancelled) return
      setWorkspaceCheck((current) => ({
        ...current,
        checking: false,
        exists: response?.err ? null : !!response?.exists,
        companyName: response?.companyName || '',
        resolvedUrl: buildWorkspacePricingUrl(subdomain),
      }))
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [checkoutForm.workspaceSubdomain, fetchServer, server])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setCheckoutForm((current) => ({
      ...current,
      [name]: name === 'workspaceSubdomain' ? value.toLowerCase().replace(/[^a-z0-9-]/g, '') : value,
    }))
  }

  const handleSubscribe = async (event) => {
    event.preventDefault()
    if (selectedPlan !== 'standard') {
      navigate('/signup')
      return
    }

    const subdomain = String(checkoutForm.workspaceSubdomain || '').trim().toLowerCase()
    if (disablePaystackPayment) {
      const msg = 'Paystack automated checkout is temporarily suspended. Contact the Enterprise Compute Central Admin for Manual activation of subscription after proof payment is sent to them.'
      window.alert(msg)
      setCheckoutState({
        loading: false,
        verifying: false,
        type: 'error',
        message: msg,
        reference: '',
        paystackMode: '',
      })
      return
    }

    if (!subdomain) {
      setCheckoutState({
        loading: false,
        verifying: false,
        type: 'error',
        message: 'Enter the tenant workspace subdomain first so we can route you into the correct billing environment.',
        reference: '',
        paystackMode: '',
      })
      return
    }

    setCheckoutState({
      loading: true,
      verifying: false,
      type: 'info',
      message: 'Checking workspace and preparing your tenant billing redirect...',
      reference: '',
      paystackMode: '',
    })

    const response = await fetchServer('POST', { subdomain }, 'checkCompanyExists', server)
    if (response?.err || !response?.exists) {
      setCheckoutState({
        loading: false,
        verifying: false,
        type: 'error',
        message: 'We could not find that workspace subdomain. Start a free trial instead, or confirm the tenant URL.',
        reference: '',
        paystackMode: '',
      })
      return
    }

    // Create an order on the tenant and redirect to the returned checkout URL.
    setCheckoutState({
      loading: true,
      verifying: false,
      type: 'info',
      message: 'Workspace located. Creating order and redirecting to checkout...',
      reference: '',
      paystackMode: '',
    })

    try {
      // If we are already on the tenant host, initialize subscription here (tenant endpoint requires auth)
      const currentHostSubdomain = detectWorkspaceSubdomain()
      if (currentHostSubdomain && currentHostSubdomain === subdomain) {
        const payload = {
          months: billingCycle === 'yearly' ? 12 : 1,
        }
        const initResp = await fetchServer('POST', payload, 'billing/initializeTenantSubscription', server)
        if (initResp?.err || !initResp?.authorizationUrl) {
          setCheckoutState({ loading: false, verifying: false, type: 'error', message: initResp?.mess || initResp?.message || 'Could not initiate checkout.', reference: '', paystackMode: '' })
          return
        }
        window.location.href = initResp.authorizationUrl
        return
      }

      // Otherwise, redirect the visitor into the tenant pricing page so the tenant flow can initialize checkout there
      const targetUrl = buildWorkspacePricingUrl(subdomain)
      setCheckoutState({ loading: true, verifying: false, type: 'info', message: `Workspace located. Redirecting you to ${targetUrl} so subscription checkout happens inside the tenant billing settings.`, reference: '', paystackMode: '' })
      window.location.href = targetUrl
      return
    } catch (err) {
      setCheckoutState({ loading: false, verifying: false, type: 'error', message: err?.message || 'Unexpected error creating order', reference: '', paystackMode: '' })
    }
  }

    // -----------------------
    // App selection helpers
    // -----------------------
  const resolveSelectionWithDeps = (selection) => {
    // Start with selected apps
    const selected = new Set(selection || [])
    
    // Iteratively add dependencies until stable
    let changed = true
    while (changed) {
      changed = false
      APPS.forEach((app) => {
        // If this app is selected and has dependencies, add its dependencies
        if (selected.has(app.key) && app.deps && app.deps.length > 0) {
          app.deps.forEach((dep) => {
            if (!selected.has(dep)) {
              selected.add(dep)
              changed = true
            }
          })
        }
      })
    }
    
    // Return only standard tier apps (free tier is always included)
    return Array.from(selected).filter(k => {
      const app = APPS.find(x => x.key === k)
      return app && app.tier === 'standard'
    })
  }
  
  const toggleOptionalApp = (key) => {
    setSelectedOptionalApps((prev) => {
      const next = new Set(prev || [])
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      // Resolve dependencies and return the array of standard-tier app keys
      return resolveSelectionWithDeps(Array.from(next))
    })
  }

  return (
    <div className="ec-landing">
      <NavBar />

      <section className="sp-hero">
        <div className="sp-hero-inner">
          <div className="ec-hero-kicker">Platform Pricing</div>
          <h1>Flexible Start, Clean Upgrade Path, One Operating Platform</h1>
          <p>
            Start with a free Standard trial, forecast your operating cost by team size,
            and move into secure Paystack billing when you are ready to go live.
          </p>
          <div className="sp-badge-row">
            <span className="sp-plan-chip">14-day free trial</span>
            <span className="sp-plan-chip">Multiple users</span>
            <span className="sp-plan-chip">All apps included</span>
            <span className="sp-plan-chip">Test and live Paystack support</span>
          </div>
        </div>
      </section>

      {(checkoutState.message || checkoutState.verifying) && (
        <section className="ec-section" style={{ paddingTop: 0 }}>
          <div className={`sp-status-banner ${checkoutState.type || 'info'}`}>
            <strong>{checkoutState.type === 'success' ? 'Payment Confirmed' : checkoutState.type === 'error' ? 'Checkout Update' : 'Subscription Status'}</strong>
            <p>{checkoutState.message}</p>
            {checkoutState.reference ? <span>Reference: {checkoutState.reference}</span> : null}
            {checkoutState.paystackMode ? <span>Paystack mode: {checkoutState.paystackMode}</span> : null}
          </div>
        </section>
      )}

      <section className="ec-section" style={{ paddingTop: 0, marginTop: -40 }}>
        <div className="sp-pricing-grid">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`sp-pricing-card ${plan.highlight ? 'featured' : 'supporting'} ${selectedPlan === plan.key ? 'selected' : ''}`}
              onClick={() => setSelectedPlan(plan.key)}
            >
              <div className="sp-pricing-badge-row">
                <div className="sp-pricing-mini-badge">{plan.badge}</div>
                {plan.highlight ? <div className="sp-popular-badge">Best Fit for Live Teams</div> : null}
              </div>
              <h3>{plan.name}</h3>
              <div className="sp-price">
                <span className="sp-amount">{plan.priceLabel}</span>
                {plan.period ? <span className="sp-period">{plan.period}</span> : null}
              </div>
              <p className="sp-plan-desc">{plan.desc}</p>
              <button className={`sp-plan-cta ${plan.highlight ? 'primary' : ''}`} onClick={plan.action}>
                {plan.cta}
              </button>
              <ul className="sp-feature-list">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span className="sp-check">+</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="ec-section" id="pricing-checkout">
        <div className="sp-checkout-shell">
          <div className="sp-checkout-grid-layout">
            <div className="sp-checkout-card sp-calculator-card">
              <div className="ec-section-kicker">Plan Calculator</div>
              <h2>Estimate your platform cost before checkout</h2>
              <p>
                Adjust the team size and compare free-trial access with the Standard operating plan.
                This helps you see the effective cost per user while keeping one shared tenant for the whole team.
              </p>

              <div className="sp-calculator-controls">
                <div className="sp-billing-toggle">
                  <button
                    className={selectedPlan === 'free' ? 'active' : ''}
                    onClick={() => setSelectedPlan('free')}
                    type="button"
                  >
                    Free Trial
                  </button>
                  <button
                    className={selectedPlan === 'standard' ? 'active' : ''}
                    onClick={() => setSelectedPlan('standard')}
                    type="button"
                  >
                    Standard
                  </button>
                </div>

                <div className="sp-billing-toggle">
                  <button
                    className={billingCycle === 'monthly' ? 'active' : ''}
                    onClick={() => setBillingCycle('monthly')}
                    type="button"
                  >
                    Monthly View
                  </button>
                  <button
                    className={billingCycle === 'yearly' ? 'active' : ''}
                    onClick={() => setBillingCycle('yearly')}
                    type="button"
                  >
                    Annual View
                  </button>
                </div>
              </div>

              <div className="sp-calculator-slider-card">
                <div className="sp-calculator-slider-head">
                  <span>Expected team size</span>
                  <strong>{teamSize} user{teamSize > 1 ? 's' : ''}</strong>
                </div>
                <input
                  className="sp-calculator-slider"
                  type="range"
                  min="1"
                  max="120"
                  step="1"
                  value={teamSize}
                  onChange={(event) => setTeamSize(Number(event.target.value))}
                />
                <div className="sp-calculator-slider-scale">
                  <span>1</span>
                  <span>60</span>
                  <span>120</span>
                </div>
              </div>

              <div className="sp-optional-apps-card">
                <div className="ec-section-kicker">Optional Modules</div>
                <p style={{ marginTop: 6, marginBottom: 12 }}>
                  Select optional modules to include in your Standard plan. Dependencies are selected automatically.
                </p>
                <div className="sp-optional-list">
                  {selectedPlan === 'standard' && APPS.filter(a => a.tier === 'standard').map(app => (
                    <div key={app.key} className="sp-app-card">
                      <label className="sp-app-select">
                        <input
                          type="checkbox"
                          checked={selectedOptionalApps.includes(app.key)}
                          onChange={() => toggleOptionalApp(app.key)}
                        />
                        <div className="sp-app-logo" aria-hidden>
                          {getAppInitials(app.name)}
                        </div>
                        <div className="sp-app-meta">
                          <strong>{app.name}</strong>
                          <div className="sp-app-deps">{app.deps && app.deps.length ? `Requires: ${app.deps.map(d => (APPS.find(x => x.key === d) || {}).name || d).join(', ')}` : ''}</div>
                        </div>
                        <div className="sp-app-tag">Included</div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sp-calculator-summary-grid">
                <div className="sp-calculator-summary-card">
                  <span>Selected plan</span>
                  <strong>{calculator.activePlan === 'free' ? 'Free Trial' : 'Standard'}</strong>
                  <p>{calculator.activePlan === 'free' ? `${FREE_TRIAL_DAYS}-day full-access trial` : 'Multiple users + selected apps'}</p>
                </div>
                <div className="sp-calculator-summary-card">
                  <span>{billingCycle === 'yearly' ? 'Annual projection' : 'Monthly cost'}</span>
                  <strong>{formatCurrency(calculator.billedTotal)}</strong>
                  <p>{calculator.activePlan === 'free' ? 'No upfront charge during trial.' : (billingCycle === 'yearly' ? 'Annual projection based on selected apps.' : 'Actual Paystack checkout amount based on selected apps.')}</p>
                </div>
                <div className="sp-calculator-summary-card">
                  <span>Users</span>
                  <strong>Unlimited</strong>
                  <p>Multiple users in your tenant workspace</p>
                </div>
                <div className="sp-calculator-summary-card">
                  <span>Apps included</span>
                  <strong>{calculator.appCount}</strong>
                  <p>Core + selected operational and accounting apps</p>
                </div>
              </div>

              <div className="sp-plan-meta">
                <div>
                  <span>Free trial includes</span>
                  <strong>{APPS.filter(a => a.tier === 'free').slice(0,5).map(a=>a.name).join(', ')}</strong>
                </div>
                <div>
                  <span>Accounting stack</span>
                  <strong>COA, ledgers, TB, BS, P&amp;L</strong>
                </div>
                <div>
                  <span>Billing flow</span>
                  <strong>{'Trial -> Paystack -> Confirmation'}</strong>
                </div>
              </div>
            </div>

            <div className="sp-checkout-card">
              <div className="ec-section-kicker">Tenant Billing Access</div>
              <h2>{selectedPlan === 'free' ? 'Start with the free trial' : 'Open the tenant billing workspace'}</h2>
              <p>
                {selectedPlan === 'free'
                  ? `Create a tenant and begin your ${FREE_TRIAL_DAYS}-day Standard trial. You will get warning banners before the trial ends and can upgrade to Paystack checkout any time before suspension.`
                  : `Use the tenant subdomain to route into the correct workspace. If you are already on a tenant host, the workspace field is detected automatically and the pricing flow can push you straight into that tenant's billing settings.`}
              </p>

              <div className="sp-checkout-highlights">
                <div className="sp-checkout-highlight">
                  <span>Users</span>
                  <strong>{teamSize} planned user{teamSize > 1 ? 's' : ''}</strong>
                </div>
                <div className="sp-checkout-highlight">
                  <span>Billing basis</span>
                  <strong>{selectedPlan === 'free' ? `${FREE_TRIAL_DAYS}-day trial` : 'Monthly subscription'}</strong>
                </div>
                <div className="sp-checkout-highlight">
                  <span>Payment stack</span>
                  <strong>Tenant billing + Paystack confirmation</strong>
                </div>
              </div>

              {selectedPlan === 'free' ? (
                <div className="sp-free-trial-pane">
                  <div className="sp-input-help">
                    The free trial is ideal when you want to set up the workspace, invite your team, test workflows,
                    and confirm the fit before the first payment is required.
                  </div>
                  <button className="sp-checkout-submit" type="button" onClick={() => navigate('/signup')}>
                    Create Tenant and Start Free Trial
                  </button>
                </div>
              ) : (
                <form className="sp-checkout-grid" onSubmit={handleSubscribe}>
                  <label className="sp-input-group">
                    <span>Workspace subdomain</span>
                    <input
                      type="text"
                      name="workspaceSubdomain"
                      value={checkoutForm.workspaceSubdomain}
                      onChange={handleInputChange}
                      placeholder="your-workspace"
                      required
                    />
                  </label>
                  <div className="sp-input-group">
                    <span>Workspace status</span>
                    <div className={`sp-workspace-status-card ${workspaceCheck.exists === true ? 'success' : workspaceCheck.exists === false ? 'error' : ''}`}>
                      <strong>
                        {workspaceCheck.checking
                          ? 'Checking workspace...'
                          : workspaceCheck.exists === true
                            ? 'Workspace located'
                            : workspaceCheck.exists === false
                              ? 'Workspace not found'
                              : (workspaceCheck.detectedFromHost ? 'Detected from current host' : 'Enter a tenant subdomain')}
                      </strong>
                      <p>
                        {workspaceCheck.exists === true
                          ? `We found the tenant workspace${workspaceCheck.companyName ? ` for ${workspaceCheck.companyName}` : ''}.`
                          : workspaceCheck.exists === false
                            ? 'That subdomain is not registered yet.'
                            : (workspaceCheck.detectedFromHost
                              ? 'The current host already looks like a tenant workspace, so billing can continue there.'
                              : 'If the tenant exists, we will route you into its billing settings page.')}
                      </p>
                    </div>
                  </div>

                  <div className="sp-input-help">
                    {workspaceCheck.resolvedUrl
                      ? `Resolved workspace path: ${workspaceCheck.resolvedUrl}`
                      : 'On the public host, enter the tenant subdomain and we will route you to the correct workspace billing page. On a tenant subdomain host, this field is auto-detected and can be reused immediately.'}
                  </div>

                  <button className="sp-checkout-submit" type="submit" disabled={checkoutState.loading || checkoutState.verifying}>
                    {checkoutState.loading ? 'Processing...' : 'Proceed to payment'}
                  </button>
                  <button className="sp-confirm-secondary-btn" type="button" onClick={() => navigate('/signup')}>
                    No workspace yet? Start Free Trial
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="ec-section" style={{ background: 'var(--ec-light-bg)' }}>
        <div className="ec-section-header">
          <div className="ec-section-kicker">Plan Comparison</div>
          <h2 className="ec-section-title">Commercial Fit at a Glance</h2>
        </div>
        <div className="sp-comparison-table">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free Trial</th>
                <th className="highlight-col">Standard</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.feature}>
                  <td className="sp-feature-name">{row.feature}</td>
                  <td>{row.free}</td>
                  <td className="highlight-col">{row.standard}</td>
                  <td>{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ec-section">
        <div className="ec-section-header">
          <div className="ec-section-kicker">FAQ</div>
          <h2 className="ec-section-title">Questions Before You Subscribe?</h2>
        </div>
        <div className="sp-faq-list">
          {faqs.map((faq, index) => (
            <div key={faq.q} className={`sp-faq-item ${openFaq === index ? 'open' : ''}`} onClick={() => setOpenFaq(openFaq === index ? null : index)}>
              <div className="sp-faq-q">
                <span>{faq.q}</span>
                <span className="sp-faq-toggle">{openFaq === index ? '-' : '+'}</span>
              </div>
              {openFaq === index ? <div className="sp-faq-a">{faq.a}</div> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="ec-final-cta">
        <h2>Ready to roll out the platform?</h2>
        <p>Start with the free trial, or move straight into the Standard plan when your team is ready for production billing.</p>
        <div className="ec-hero-btns" style={{ justifyContent: 'center' }}>
          <button className="ec-btn-primary" onClick={() => navigate('/signup')}>
            Start Free Trial
          </button>
          <button className="ec-btn-secondary" onClick={() => document.getElementById('pricing-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            Review Standard Checkout
          </button>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default PricingPage
