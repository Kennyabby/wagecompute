// Electron desktop build only — replaces BillingSettingsPanel in the
// "Billing & Plan" settings tab (relabeled "License" for this build — see
// Settings.js). This app was paid for once via the offline license, not
// through any in-app subscription, so nothing here initiates payment; it
// just shows this install's current license status (read from the LOCAL
// bundled backend, same /desktop/license/* routes TenantSetup already
// uses) and links out to the real license portal for renewal/management.
import { useState, useEffect, useContext, useCallback } from 'react'
import { motion } from 'framer-motion'
import ContextProvider from '../../Resources/ContextProvider'

const DesktopLicensePanel = ({ variants }) => {
    const { server } = useContext(ContextProvider)
    const [status, setStatus] = useState(null)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')

    const loadStatus = useCallback(async () => {
        try {
            const resp = await fetch(`${server}/desktop/license/status`)
            const data = await resp.json()
            setStatus(data)
        } catch (e) {
            setStatus({ ok: false })
        }
    }, [server])

    useEffect(() => { loadStatus() }, [loadStatus])

    const handleRecheck = async () => {
        setBusy(true)
        setMessage('')
        try {
            const resp = await fetch(`${server}/desktop/license/recheck`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
            const data = await resp.json()
            setMessage(data.reachedCentral ? 'License status refreshed.' : 'Could not reach the license server — showing the last known status.')
        } catch (e) {
            setMessage('Could not reach the license server — showing the last known status.')
        }
        await loadStatus()
        setBusy(false)
    }

    const daysRemaining = status?.expiresAt ? Math.ceil((status.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)) : null

    return (
        <motion.div
            className='general-settings'
            initial="initial" animate="animate" exit="exit" variants={variants}
            transition={{ duration: 0.4 }}
        >
            <div className='sidebar-title'>License</div>
            {message && <p>{message}</p>}
            {!status?.activated && <p>No license activated on this install.</p>}
            {status?.activated && (
                <>
                    <div style={{ margin: '16px 0' }}>
                        <div>Status</div>
                        <input className='forminp' value={status.licenseStatus || ''} disabled />
                    </div>
                    <div style={{ margin: '16px 0' }}>
                        <div>Expires</div>
                        <input className='forminp' value={status.expiresAt ? `${new Date(status.expiresAt).toLocaleDateString()} (${daysRemaining} day(s) remaining)` : '--'} disabled />
                    </div>
                    <div style={{ margin: '16px 0' }}>
                        <div>Licensed Modules</div>
                        <input className='forminp' value={(status.modules || []).join(', ') || 'none'} disabled />
                    </div>
                </>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className='savebtn' disabled={busy} onClick={handleRecheck}>{busy ? 'Checking...' : 'Recheck Now'}</button>
                <button className='savebtn' onClick={() => window.electronAPI?.openExternalLink?.('https://epxcentral.com/offline-license-portal/login')}>
                    Manage License (Renew / Terminate)
                </button>
            </div>
        </motion.div>
    )
}

export default DesktopLicensePanel
