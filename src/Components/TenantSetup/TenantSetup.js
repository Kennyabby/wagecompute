// Electron desktop build only — the pre-login local workspace manager
// (App.js renders this instead of LandingPage at '/' when
// window.electronAPI.isElectron is set, which only ever happens inside the
// desktop shell — see electron/preload.js). Mirrors Odoo's on-premise
// database manager: a single master password (independent of any user's own
// login) gates listing/creating tenant databases in the bundled local
// MongoDB, before the normal Login screen is ever reached.
//
// Ahead of all of that now sits the offline-license gate (see
// wageserver/UserModule/Users/userLogin.js's /desktop/license/* routes and
// wageserver/UserModule/OfflineLicense/offlineLicense.js on the central
// side): a purchased, verified license key is required before the master
// password / workspace picker is ever reached at all, and the app can be
// locked out again later if it goes too long without reconnecting or its
// license lapses — both checked here since this is the one place already
// positioned to react to the result.
import '../Login/Login.css'
import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import { setDesktopTenant } from '../../Resources/ClientServerAPIConn/fetchServer'
import applogo from '../../Resources/assets/images/enterprisecompute.png'

// These desktop-only routes run before any tenant/session exists, so they're
// called directly with fetch (not the shared fetchServer helper, which is
// built around an already-known tenant/session) — same server origin either
// way, since `server` here already resolves to window.location.origin for
// the desktop build (App.js's SERVER constant), i.e. wherever
// electron/main.js's spawned wageserver actually ends up listening.
const callDesktop = async (server, path, body, setupToken) => {
    try {
        const resp = await fetch(`${server}/${path}`, {
            method: body === undefined ? 'GET' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(setupToken ? { 'x-desktop-setup-token': setupToken } : {}),
            },
            credentials: 'include',
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        })
        const data = await resp.json().catch(() => ({}))
        return { ...data, ok: resp.ok && data.ok !== false }
    } catch (e) {
        return { ok: false, mess: 'Could not connect to the local server. Please try again.' }
    }
}

const emptyCreateFields = {
    companyName: '', subdomain: '', fullName: '', emailid: '', password: '',
    address: '', city: '', country: 'Nigeria', state: '',
}

const TenantSetup = () => {
    const { server } = useContext(ContextProvider)
    const Navigate = useNavigate()

    // 'termsChecking' | 'termsGate' |
    // 'licenseChecking' | 'licenseActivate' | 'licenseBlocked' |
    // 'checking' | 'setMaster' | 'enterMaster' | 'picker' | 'create'
    const [stage, setStage] = useState('termsChecking')
    const [termsAgreed, setTermsAgreed] = useState(false)
    const [licenseKeyInput, setLicenseKeyInput] = useState('')
    const [licenseBlockInfo, setLicenseBlockInfo] = useState(null) // { reachedCentral, mess }
    const [masterPassword, setMasterPassword] = useState('')
    const [masterPasswordConfirm, setMasterPasswordConfirm] = useState('')
    const [setupToken, setSetupToken] = useState('')
    const [tenants, setTenants] = useState([])
    const [createFields, setCreateFields] = useState({ ...emptyCreateFields })
    const [message, setMessage] = useState('')
    const [busy, setBusy] = useState(false)

    const proceedPastLicenseGate = async () => {
        const resp = await callDesktop(server, 'desktop/hasMasterPassword')
        setStage(resp.ok && resp.hasMasterPassword ? 'enterMaster' : 'setMaster')
    }

    const runLicenseRecheck = async ({ blocking }) => {
        const resp = await callDesktop(server, 'desktop/license/recheck', {})
        if (resp.blocked) {
            setLicenseBlockInfo({
                reachedCentral: !!resp.reachedCentral,
                mess: resp.reachedCentral
                    ? (resp.mess || 'Your license is no longer valid. Please renew or contact support.')
                    : 'This app needs to connect to the internet to continue. Please connect to a stable internet connection and try again.',
            })
            if (blocking) setStage('licenseBlocked')
        } else if (blocking) {
            await proceedPastLicenseGate()
        }
        return resp
    }

    const startLicenseFlow = async () => {
        const status = await callDesktop(server, 'desktop/license/status')
        if (!status.ok || !status.activated) {
            setStage('licenseActivate')
            return
        }
        const blocked = status.overdue || status.licenseStatus !== 'active'
        if (blocked) {
            await runLicenseRecheck({ blocking: true })
        } else {
            await proceedPastLicenseGate()
            // Opportunistic, non-blocking — lets a well-connected install
            // silently pick up a renewed expiry/updated modules/reset
            // connectivity deadline on any day it happens to be online,
            // not just on its deadline day.
            runLicenseRecheck({ blocking: false })
        }
    }

    // The very first thing this screen ever checks — nothing else (license
    // activation, master password, workspace creation) is reachable until
    // this install has a recorded, timestamped acceptance. Runs once on
    // launch; the license flow below only starts once this clears.
    useEffect(() => {
        (async () => {
            const status = await callDesktop(server, 'desktop/terms/status')
            if (status.ok && status.accepted) {
                await startLicenseFlow()
            } else {
                setStage('termsGate')
            }
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleAcceptTerms = async () => {
        if (!termsAgreed) {
            setMessage('You must agree to the Terms of Service and Privacy Policy to continue.')
            return
        }
        setMessage('')
        setBusy(true)
        const resp = await callDesktop(server, 'desktop/terms/accept', {})
        setBusy(false)
        if (!resp.ok) {
            setMessage(resp.mess || 'Could not record your acceptance. Please try again.')
            return
        }
        setStage('licenseChecking')
        await startLicenseFlow()
    }

    const handleActivateLicense = async () => {
        setMessage('')
        if (!licenseKeyInput.trim()) {
            setMessage('Enter your license key.')
            return
        }
        setBusy(true)
        const resp = await callDesktop(server, 'desktop/license/activate', { licenseKey: licenseKeyInput.trim() })
        setBusy(false)
        if (!resp.ok) {
            setMessage(resp.mess || 'License activation failed.')
            return
        }
        await proceedPastLicenseGate()
    }

    const handleRetryLicenseBlock = async () => {
        setBusy(true)
        await runLicenseRecheck({ blocking: true })
        setBusy(false)
    }

    const loadTenants = async (token) => {
        const resp = await callDesktop(server, 'desktop/listLocalTenants', undefined, token)
        if (resp.ok) {
            setTenants(resp.tenants || [])
            setStage('picker')
        } else {
            setMessage(resp.mess || 'Could not load local workspaces.')
        }
    }

    const handleSetMasterPassword = async () => {
        setMessage('')
        if (masterPassword.length < 8) {
            setMessage('Master password must be at least 8 characters.')
            return
        }
        if (masterPassword !== masterPasswordConfirm) {
            setMessage('Passwords do not match.')
            return
        }
        setBusy(true)
        const resp = await callDesktop(server, 'desktop/setMasterPassword', { password: masterPassword })
        if (!resp.ok) {
            setBusy(false)
            setMessage(resp.mess || 'Could not set the master password.')
            return
        }
        const verifyResp = await callDesktop(server, 'desktop/verifyMasterPassword', { password: masterPassword })
        setBusy(false)
        if (!verifyResp.ok) {
            setMessage(verifyResp.mess || 'Master password was set, but verification failed — please try entering it.')
            setStage('enterMaster')
            return
        }
        setSetupToken(verifyResp.setupToken)
        await loadTenants(verifyResp.setupToken)
    }

    const handleVerifyMasterPassword = async () => {
        setMessage('')
        setBusy(true)
        const resp = await callDesktop(server, 'desktop/verifyMasterPassword', { password: masterPassword })
        setBusy(false)
        if (!resp.ok) {
            setMessage(resp.mess || 'Could not verify the master password.')
            return
        }
        setSetupToken(resp.setupToken)
        await loadTenants(resp.setupToken)
    }

    const handleSelectTenant = (tenant) => {
        setDesktopTenant(tenant.db)
        Navigate('/login')
    }

    const handleCreateFieldChange = (e) => {
        const { name, value } = e.target
        setCreateFields((prev) => {
            const updated = { ...prev, [name]: value }
            if (name === 'companyName' && !prev.subdomain) {
                updated.subdomain = value.toLowerCase().replace(/[^a-z0-9]/g, '')
            }
            return updated
        })
    }

    const handleCreateTenant = async () => {
        setMessage('')
        const { companyName, fullName, emailid, password } = createFields
        if (!companyName || !fullName || !emailid || !password) {
            setMessage('Company name, your name, email, and password are all required.')
            return
        }
        if (password.length < 8) {
            setMessage('Password must be at least 8 characters.')
            return
        }
        setBusy(true)
        // Requires being online for this one call — see
        // /desktop/license/create-branch — to confirm the subdomain against
        // the offline license (exact match for the very first workspace,
        // unique-per-account for any later branch). Every later app launch
        // does not need to repeat this.
        const resp = await callDesktop(server, 'desktop/license/create-branch', createFields, setupToken)
        setBusy(false)
        if (!resp.ok) {
            setMessage(resp.mess || 'Could not create the local workspace.')
            return
        }
        setDesktopTenant(resp.tenant.db)
        Navigate('/login')
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-side-form">
                    <div className="form-header">
                        <div className="mobile-logo">
                            <img src={applogo} alt="Enterprise Compute" style={{ height: '40px' }} />
                        </div>
                        <h2>Enterprise Compute — Desktop</h2>
                        <p>Local workspace manager</p>
                    </div>

                    <div className="login-form">
                        {message && <div className="recovery-card-wrap" style={{ color: '#c0392b', marginBottom: '12px' }}>{message}</div>}

                        {stage === 'termsChecking' && <p>Loading...</p>}

                        {stage === 'termsGate' && (
                            <>
                                <p>Before you continue, please review our Terms of Service and Privacy Policy. These open in your default web browser.</p>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                                    <button type="button" className="main-login-btn" style={{ width: 'auto', padding: '8px 16px', background: '#888' }}
                                        onClick={() => window.electronAPI?.openExternalLink?.('https://epxcentral.com/terms')}>
                                        View Terms of Service
                                    </button>
                                    <button type="button" className="main-login-btn" style={{ width: 'auto', padding: '8px 16px', background: '#888' }}
                                        onClick={() => window.electronAPI?.openExternalLink?.('https://epxcentral.com/privacy')}>
                                        View Privacy Policy
                                    </button>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} style={{ marginTop: '3px' }} />
                                    <span>I have read and agree to the Terms of Service and Privacy Policy.</span>
                                </label>
                                <button className="main-login-btn" style={{ marginTop: '16px' }} disabled={busy || !termsAgreed} onClick={handleAcceptTerms}>
                                    {busy ? 'Continuing...' : 'Continue'}
                                </button>
                            </>
                        )}

                        {stage === 'licenseChecking' && <p>Checking your license...</p>}

                        {stage === 'licenseActivate' && (
                            <>
                                <p>Enter your Enterprise Compute offline license key to continue. You can find or purchase one from the license portal on our website.</p>
                                <div className="input-group">
                                    <label>License Key</label>
                                    <input
                                        type="text"
                                        placeholder="EC-XXXX-XXXX-XXXX-XXXX"
                                        value={licenseKeyInput}
                                        onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                                    />
                                </div>
                                <button className="main-login-btn" disabled={busy} onClick={handleActivateLicense}>
                                    {busy ? 'Activating...' : 'Activate License'}
                                </button>
                            </>
                        )}

                        {stage === 'licenseBlocked' && licenseBlockInfo && (
                            <>
                                <p>{licenseBlockInfo.mess}</p>
                                <button className="main-login-btn" disabled={busy} onClick={handleRetryLicenseBlock}>
                                    {busy ? 'Checking...' : 'Retry'}
                                </button>
                                {licenseBlockInfo.reachedCentral && (
                                    <button className="main-login-btn" style={{ marginTop: '10px', background: '#888' }} onClick={() => { setLicenseKeyInput(''); setStage('licenseActivate') }}>
                                        Enter a Different License Key
                                    </button>
                                )}
                            </>
                        )}

                        {stage === 'checking' && <p>Checking local setup...</p>}

                        {stage === 'setMaster' && (
                            <>
                                <p>First time setup — choose a master password for this installation. It's separate from any user login and is required every time this app opens the workspace manager.</p>
                                <div className="input-group">
                                    <label>Master Password</label>
                                    <input type="password" value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} />
                                </div>
                                <div className="input-group">
                                    <label>Confirm Master Password</label>
                                    <input type="password" value={masterPasswordConfirm} onChange={(e) => setMasterPasswordConfirm(e.target.value)} />
                                </div>
                                <button className="main-login-btn" disabled={busy} onClick={handleSetMasterPassword}>
                                    {busy ? 'Setting up...' : 'Set Master Password'}
                                </button>
                            </>
                        )}

                        {stage === 'enterMaster' && (
                            <>
                                <div className="input-group">
                                    <label>Master Password</label>
                                    <input type="password" value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} />
                                </div>
                                <button className="main-login-btn" disabled={busy} onClick={handleVerifyMasterPassword}>
                                    {busy ? 'Verifying...' : 'Unlock'}
                                </button>
                            </>
                        )}

                        {stage === 'picker' && (
                            <>
                                <p>Select a workspace to continue:</p>
                                {tenants.length === 0 && <p>No local workspaces yet — create one below.</p>}
                                {tenants.map((tenant) => (
                                    <div
                                        key={tenant.db}
                                        className="input-group"
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                        onClick={() => handleSelectTenant(tenant)}
                                    >
                                        <span>{tenant.name}</span>
                                        <button className="main-login-btn" style={{ width: 'auto', padding: '6px 14px' }}>Continue</button>
                                    </div>
                                ))}
                                <button className="main-login-btn" style={{ marginTop: '16px' }} onClick={() => setStage('create')}>
                                    + Create New Workspace
                                </button>
                            </>
                        )}

                        {stage === 'create' && (
                            <div className="form-grid">
                                <div className="input-group">
                                    <label>Company Name</label>
                                    <input name="companyName" value={createFields.companyName} onChange={handleCreateFieldChange} />
                                </div>
                                <div className="input-group">
                                    <label>Workspace Id</label>
                                    <input name="subdomain" value={createFields.subdomain} onChange={handleCreateFieldChange} />
                                </div>
                                <div className="input-group">
                                    <label>Your Full Name</label>
                                    <input name="fullName" value={createFields.fullName} onChange={handleCreateFieldChange} />
                                </div>
                                <div className="input-group">
                                    <label>Your Email</label>
                                    <input name="emailid" type="email" value={createFields.emailid} onChange={handleCreateFieldChange} />
                                </div>
                                <div className="input-group">
                                    <label>Password</label>
                                    <input name="password" type="password" value={createFields.password} onChange={handleCreateFieldChange} />
                                </div>
                                <div className="input-group">
                                    <label>Address</label>
                                    <input name="address" value={createFields.address} onChange={handleCreateFieldChange} />
                                </div>
                                <div className="input-group">
                                    <label>City</label>
                                    <input name="city" value={createFields.city} onChange={handleCreateFieldChange} />
                                </div>
                                <div className="input-group">
                                    <label>State</label>
                                    <input name="state" value={createFields.state} onChange={handleCreateFieldChange} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button className="main-login-btn" disabled={busy} onClick={handleCreateTenant}>
                                        {busy ? 'Creating...' : 'Create Workspace'}
                                    </button>
                                    <button className="main-login-btn" style={{ background: '#888' }} onClick={() => setStage('picker')}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TenantSetup
