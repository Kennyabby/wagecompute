import { useState, useEffect, useContext, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import MODULE_ICONS from '../../Resources/moduleIcons'
import '../Login/Login.css'

const TOKEN_KEY = 'offline-portal-token'
const ONE_MONTH_MS = 31 * 24 * 60 * 60 * 1000

// The offline customer's own account — separate from any tenant/dashboard
// login. Only ever shows subscription status, the license key, and
// renew/terminate/reset-activation/register-new-license actions (see plan:
// "must not have access online to those modules"). Mirrors the desktop
// TenantSetup screen's visual style (reuses Login.css) rather than
// inventing a new design.
const OfflineLicensePortal = () => {
  const { server } = useContext(ContextProvider)
  const navigate = useNavigate()
  const [stage, setStage] = useState('login') // login | dashboard
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [account, setAccount] = useState(null)
  const [license, setLicense] = useState(null)
  const [branches, setBranches] = useState([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  // "Register for a new license" — distinct from Renew (same key, extended
  // expiry): issues a brand new key under this same account, e.g. after a
  // termination, or just to start over with a different module set.
  const [showNewLicensePicker, setShowNewLicensePicker] = useState(false)
  const [moduleCatalog, setModuleCatalog] = useState([])
  const [offlinePricing, setOfflinePricing] = useState({})
  const [selectedModules, setSelectedModules] = useState([])

  const authedFetch = useCallback((path, options = {}) => {
    const token = window.localStorage.getItem(TOKEN_KEY)
    return fetch(`${server}/${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    }).then(r => r.json())
  }, [server])

  const loadMe = useCallback(async () => {
    const resp = await authedFetch('offline-license-portal/me')
    if (resp.ok) {
      setAccount(resp.account)
      setLicense(resp.license)
      setBranches(resp.branches || [])
      setStage('dashboard')
    } else {
      window.localStorage.removeItem(TOKEN_KEY)
      setStage('login')
    }
  }, [authedFetch])

  useEffect(() => {
    document.title = "License Portal | Enterprise Compute Central"
    if (window.localStorage.getItem(TOKEN_KEY)) loadMe()
  }, [loadMe])

  useEffect(() => {
    fetch(`${server}/platform-modules`).then(r => r.json()).then((data) => {
      if (data?.ok) {
        setModuleCatalog(data.catalog || [])
        setOfflinePricing(data.offlinePricing || {})
      }
    }).catch(() => {})
  }, [server])

  const handleLogin = async () => {
    setMessage('')
    setBusy(true)
    const resp = await authedFetch('offline-license-portal/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    setBusy(false)
    if (!resp.ok) {
      setMessage(resp.mess || 'Incorrect email or password.')
      return
    }
    window.localStorage.setItem(TOKEN_KEY, resp.token)
    await loadMe()
  }

  const handleRenew = async () => {
    setBusy(true)
    const resp = await authedFetch('offline-license-portal/renew/paystack/initialize', { method: 'POST' })
    setBusy(false)
    if (resp.ok) {
      window.location.href = resp.authorizationUrl
    } else {
      setMessage(resp.mess || 'Could not start renewal.')
    }
  }

  const handleTerminate = async () => {
    if (!window.confirm('Terminate your license? This cannot be undone from here.')) return
    setBusy(true)
    const resp = await authedFetch('offline-license-portal/terminate', { method: 'POST' })
    setBusy(false)
    setMessage(resp.mess || '')
    if (resp.ok) await loadMe()
  }

  const handleResetActivation = async () => {
    if (!window.confirm('Reset device activation? Your current device will need to re-enter the license key.')) return
    setBusy(true)
    const resp = await authedFetch('offline-license-portal/reset-activation', { method: 'POST' })
    setBusy(false)
    setMessage(resp.mess || '')
  }

  // Client-side dependency expansion for snappy checkbox UX only — the
  // server (resolveModuleDependencies) always re-resolves and is
  // authoritative for what's actually billed/granted.
  const toggleModule = (key) => {
    setSelectedModules((prev) => {
      const isSelected = prev.includes(key)
      let next = isSelected ? prev.filter((k) => k !== key) : [...prev, key]
      if (!isSelected) {
        let changed = true
        while (changed) {
          changed = false
          moduleCatalog.forEach((m) => {
            if (next.includes(m.key) && m.deps?.length) {
              m.deps.forEach((dep) => {
                if (!next.includes(dep)) { next.push(dep); changed = true }
              })
            }
          })
        }
      }
      return next
    })
  }

  const newLicenseTotalNaira = selectedModules.reduce((sum, key) => sum + (Number(offlinePricing[key]) || 0), 0)

  const handleRegisterNewLicense = async () => {
    if (!selectedModules.length) {
      setMessage('Select at least one module.')
      return
    }
    setBusy(true)
    const resp = await authedFetch('offline-license-portal/register-new-license/paystack/initialize', {
      method: 'POST',
      body: JSON.stringify({ modules: selectedModules }),
    })
    setBusy(false)
    if (resp.ok) {
      window.location.href = resp.authorizationUrl
    } else {
      setMessage(resp.mess || 'Could not start a new license purchase.')
    }
  }

  const daysRemaining = license?.expiresAt ? Math.ceil((license.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)) : null
  const showCountdown = license?.expiresAt ? (license.expiresAt - Date.now()) <= ONE_MONTH_MS : false

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-side-form">
          <div className="form-header">
            <h2>Offline License Portal</h2>
            <p>Manage your Enterprise Compute desktop license.</p>
          </div>
          <div className="login-form">
            {message && <div className="recovery-card-wrap" style={{ color: '#c0392b', marginBottom: '12px' }}>{message}</div>}

            {stage === 'login' && (
              <>
                <div className="input-group">
                  <label>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <button className="main-login-btn" disabled={busy} onClick={handleLogin}>
                  {busy ? 'Signing in...' : 'Sign In'}
                </button>
                <p style={{ marginTop: '16px' }}>
                  No offline license yet? <span style={{ color: 'var(--ec-secondary)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => navigate('/signup')}>Purchase one</span>
                </p>
              </>
            )}

            {stage === 'dashboard' && account && !showNewLicensePicker && (
              <>
                <h3>{account.companyName}</h3>
                {!license && <p>No license on this account yet.</p>}
                {license && (
                  <>
                    <p>Status: <strong>{license.status}</strong></p>
                    {showCountdown ? (
                      <p style={{ color: '#c0392b', fontWeight: 'bold' }}>
                        {daysRemaining > 0 ? `${daysRemaining} day(s) remaining — renewal due soon` : 'Your license has expired'}
                      </p>
                    ) : (
                      <p>Renews on {new Date(license.expiresAt).toLocaleDateString()}</p>
                    )}
                    <div className="input-group">
                      <label>License Key</label>
                      <input readOnly value={license.licenseKey} onClick={(e) => e.target.select()} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {license.status !== 'terminated' && (
                        <button className="main-login-btn" style={{ width: 'auto', padding: '10px 18px' }} disabled={busy} onClick={handleRenew}>Renew</button>
                      )}
                      <button className="main-login-btn" style={{ width: 'auto', padding: '10px 18px', background: '#888' }} disabled={busy} onClick={handleResetActivation}>Reset Device Activation</button>
                      {license.status !== 'terminated' && (
                        <button className="main-login-btn" style={{ width: 'auto', padding: '10px 18px', background: '#c0392b' }} disabled={busy} onClick={handleTerminate}>Terminate</button>
                      )}
                    </div>
                    {branches.length > 0 && (
                      <div style={{ marginTop: '20px' }}>
                        <label>Workspaces (branches)</label>
                        {branches.map((b) => <div key={b.subdomain}>{b.subdomain} {b.isPrimary ? '(primary)' : ''}</div>)}
                      </div>
                    )}
                  </>
                )}
                <div style={{ marginTop: '20px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '16px' }}>
                  <p>{license?.status === 'terminated' ? 'Your license was terminated — register for a new one to keep using the desktop app.' : 'Want a fresh license key (e.g. a different module set, or a new key to re-enter in the app)?'}</p>
                  <button className="main-login-btn" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => setShowNewLicensePicker(true)}>
                    Register for a New License
                  </button>
                </div>
              </>
            )}

            {stage === 'dashboard' && showNewLicensePicker && (
              <>
                <h3>Register a New License</h3>
                <p>This issues a brand new license key (a new purchase) under your existing account. Enter the new key in the desktop app's license screen once payment completes.</p>
                {/* Epsilon excluded — never available on the offline/desktop
                    build (no Anthropic key, no per-seat billing there); the
                    server already strips it from computeOfflinePrice too. */}
                <div className='module-picker-grid'>
                  {moduleCatalog.filter(m => m.tier === 'standard' && m.key !== 'epsilon').map((m) => {
                    const Icon = MODULE_ICONS[m.key]
                    return (
                      <label key={m.key} className='module-picker-chip'>
                        <input type="checkbox" checked={selectedModules.includes(m.key)} onChange={() => toggleModule(m.key)} />
                        {Icon && <span className='module-picker-icon'><Icon /></span>}
                        <span className='module-picker-name'>{m.name}</span>
                        <span className='module-picker-price'>₦{(Number(offlinePricing[m.key]) || 0).toLocaleString()}/yr</span>
                      </label>
                    )
                  })}
                </div>
                <div style={{ marginTop: '12px', fontWeight: 'bold', textAlign: 'right' }}>
                  Total: ₦{newLicenseTotalNaira.toLocaleString()}/yr
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button className="main-login-btn" disabled={busy} onClick={handleRegisterNewLicense}>
                    {busy ? 'Redirecting to payment...' : 'Continue to Payment'}
                  </button>
                  <button className="main-login-btn" style={{ background: '#888' }} onClick={() => setShowNewLicensePicker(false)}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OfflineLicensePortal
