import './BusinessCentral.css'

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from '../Shared/ui/PageShell'
import { createBcApi } from './bcApi'
import { formatAgo } from './bcFormat'
import BCDashboard from './BCDashboard'
import BCReports from './BCReports'
import BCChanges from './BCChanges'
import BCSync from './BCSync'
import BCLive from './BCLive'
import BCConnection from './BCConnection'

const POLL_MS = 5000

const BusinessCentral = () => {
    const { fetchServer, server, storePath, setAlert, setAlertState, setAlertTimeout } = useContext(ContextProvider)
    const api = useMemo(() => createBcApi(fetchServer, server), [fetchServer, server])

    const [tab, setTab] = useState('dashboard')
    const [info, setInfo] = useState(null)
    const [status, setStatus] = useState(null)
    const [history, setHistory] = useState([])
    const [lookups, setLookups] = useState(null)
    const [reportKey, setReportKey] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [busy, setBusy] = useState(false)
    const wasRunning = useRef(false)

    useEffect(() => {
        storePath('business-central')
        document.title = 'Business Central Reports | Enterprise Compute Central'
    }, [storePath])

    const notify = useCallback((type, message) => {
        setAlertState(type)
        setAlert(message)
        setAlertTimeout(6000)
    }, [setAlert, setAlertState, setAlertTimeout])

    const loadInfo = useCallback(async () => {
        try {
            const response = await api.getConnection()
            setInfo(response)
            setLoadError('')
            return response
        } catch (failure) {
            setLoadError(failure.message)
            return null
        }
    }, [api])

    const loadSync = useCallback(async () => {
        try {
            const [current, past] = await Promise.all([api.getSyncStatus(), api.getSyncHistory()])
            setStatus(current)
            setHistory(past.runs)
        } catch (failure) {
            // The status strip is secondary. A failed refresh keeps showing
            // the last known state instead of replacing the page with an error.
        }
    }, [api])

    const loadLookups = useCallback(async () => {
        try {
            setLookups((await api.getLookups()).lookups)
        } catch (failure) {
            setLookups(null)
        }
    }, [api])

    const refreshAll = useCallback(async () => {
        const response = await loadInfo()
        if (!response?.connection) {
            setStatus(null)
            setHistory([])
            setLookups(null)
            return
        }
        // Sync status only exists for a stored copy. Live reading has none.
        const stored = response.storageMode === 'stored'
        if (!stored) { setStatus(null); setHistory([]) }
        await Promise.all([stored ? loadSync() : null, response.connection.discoveredAt ? loadLookups() : null])
    }, [loadInfo, loadSync, loadLookups])

    useEffect(() => { refreshAll() }, [refreshAll])

    const stored = info?.storageMode === 'stored'

    // Live progress of a sync arrives over the app's existing server-sent
    // event stream (App.js re-dispatches it as this window event).
    useEffect(() => {
        const onUpdate = (event) => {
            const run = event.detail?.run
            if (!run) return
            setStatus((current) => ({ ...(current || { state: {} }), run, running: run.status === 'running' }))
        }
        window.addEventListener('wc:bc-sync-update', onUpdate)
        return () => window.removeEventListener('wc:bc-sync-update', onUpdate)
    }, [])

    // Polling covers the case where the event stream is down, and also picks
    // up a run started by the scheduler or by another user.
    const running = stored && !!status?.running
    useEffect(() => {
        if (!info?.connection || !stored) return undefined
        const timer = setInterval(loadSync, running ? POLL_MS : POLL_MS * 12)
        return () => clearInterval(timer)
    }, [info?.connection, stored, running, loadSync])

    // When a run finishes, everything derived from the data is stale.
    useEffect(() => {
        if (wasRunning.current && !running) refreshAll()
        wasRunning.current = running
    }, [running, refreshAll])

    const startSync = async (mode) => {
        if (mode === 'full' && !window.confirm('A full reload reads every table again from the start. On a large company this can take a long time and puts load on the Business Central server. Continue?')) return
        setBusy(true)
        try {
            const response = await api.startSync(mode)
            setStatus((current) => ({ ...(current || { state: {} }), run: response.run, running: true }))
        } catch (failure) {
            notify('error', failure.message)
            loadSync()
        } finally {
            setBusy(false)
        }
    }

    const cancelSync = async () => {
        setBusy(true)
        try {
            await api.cancelSync()
            notify('info', 'Stopping the sync. Rows already read are kept.')
            await loadSync()
        } catch (failure) {
            notify('error', failure.message)
        } finally {
            setBusy(false)
        }
    }

    const openReport = (key) => { setReportKey(key); setTab('reports') }

    if (loadError && !info) {
        return <PageShell maxWidth={1400}><div className='bc-root'><div className='bc-banner bc-banner-error'>{loadError}</div></div></PageShell>
    }
    if (!info) {
        return <PageShell maxWidth={1400}><div className='bc-root'><p className='bc-empty'>Loading Business Central Reports...</p></div></PageShell>
    }

    const { connection, datasets, canManage, secretsConfigured } = info
    const lastSyncedAt = stored ? (connection?.lastSyncFinishedAt || 0) : 0
    const hasData = Object.values(status?.state || {}).some((entry) => entry.lastSyncedAt)

    const connectionPage = (
        <BCConnection
            api={api}
            connection={connection}
            datasets={datasets}
            secretsConfigured={secretsConfigured}
            syncRunning={running}
            onChanged={refreshAll}
            notify={notify}
        />
    )

    if (!connection) {
        return (
            <PageShell maxWidth={1400}>
                <div className='bc-root'>
                    <header className='bc-header'>
                        <div>
                            <h1>Business Central Reports</h1>
                            <p className='bc-muted'>Connect your Business Central server to see its ledgers, items and documents as dashboards and reports here.</p>
                        </div>
                    </header>
                    {canManage ? connectionPage : (
                        <div className='bc-banner bc-banner-info'>Business Central is not connected yet. An admin needs to set up the connection first.</div>
                    )}
                </div>
            </PageShell>
        )
    }

    const tabs = [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'reports', label: 'Reports' },
        // The change log compares Business Central with a stored copy, so it
        // only exists when there is one.
        ...(stored ? [{ key: 'changes', label: 'Changes' }] : []),
        { key: 'data', label: stored ? 'Data Sync' : 'Data' },
        ...(canManage ? [{ key: 'connection', label: 'Connection' }] : []),
    ]
    const activeTab = tabs.some((entry) => entry.key === tab) ? tab : 'dashboard'
    const wantsData = activeTab === 'dashboard' || activeTab === 'reports'
    const notDiscovered = !connection.company || !connection.discoveredAt
    const needsFirstSync = stored && !hasData

    let chip = 'Live from Business Central'
    if (stored) chip = running ? 'Syncing now' : `Synced ${formatAgo(lastSyncedAt).toLowerCase()}`

    return (
        <PageShell maxWidth={1400}>
            <div className='bc-root'>
                <header className='bc-header'>
                    <div>
                        <h1>Business Central Reports</h1>
                        <p className='bc-muted'>{connection.company || 'No company selected'}</p>
                    </div>
                    <button type='button' className='bc-sync-chip' onClick={() => setTab('data')}>
                        <span className={`bc-dot ${running ? 'bc-dot-live' : ''} ${!stored ? 'bc-dot-on' : ''}`} />
                        {chip}
                    </button>
                </header>

                <nav className='bc-tabs' aria-label='Business Central sections'>
                    {tabs.map((entry) => (
                        <button key={entry.key} type='button' className={activeTab === entry.key ? 'active' : ''} aria-current={activeTab === entry.key ? 'page' : undefined} onClick={() => setTab(entry.key)}>
                            {entry.label}
                        </button>
                    ))}
                </nav>

                {wantsData && notDiscovered && (
                    <div className='bc-card bc-first-sync'>
                        <h3>The connection is not finished</h3>
                        <p className='bc-muted'>Choose the company and save the connection so the published pages can be read.</p>
                        {canManage && <button type='button' className='bc-button bc-button-primary' onClick={() => setTab('connection')}>Open Connection</button>}
                    </div>
                )}
                {wantsData && !notDiscovered && needsFirstSync && (
                    <div className='bc-card bc-first-sync'>
                        <h3>{running ? 'The first sync is running' : 'No data has been synced yet'}</h3>
                        <p className='bc-muted'>
                            {running
                                ? 'Dashboards and reports fill in as each table finishes. The first load reads full ledger history, so it can take a while.'
                                : 'This workspace keeps a stored copy of Business Central. Run the first sync to fill it.'}
                        </p>
                        <button type='button' className='bc-button bc-button-primary' onClick={() => setTab('data')}>Open Data Sync</button>
                    </div>
                )}
                {wantsData && !notDiscovered && !needsFirstSync && (
                    <>
                        {activeTab === 'dashboard' && <BCDashboard api={api} lookups={lookups} lastSyncedAt={lastSyncedAt} live={!stored} onOpenReport={openReport} />}
                        {activeTab === 'reports' && <BCReports api={api} lookups={lookups} lastSyncedAt={lastSyncedAt} openKey={reportKey} onOpenKey={setReportKey} onGoTo={setTab} />}
                    </>
                )}
                {activeTab === 'changes' && <BCChanges api={api} datasets={datasets} lastSyncedAt={lastSyncedAt} onGoTo={setTab} />}
                {activeTab === 'data' && stored && (
                    <BCSync
                        api={api}
                        connection={connection}
                        datasets={datasets}
                        status={status}
                        history={history}
                        canManage={canManage}
                        busy={busy}
                        onStart={startSync}
                        onCancel={cancelSync}
                        onGoTo={setTab}
                    />
                )}
                {activeTab === 'data' && !stored && <BCLive api={api} canManage={canManage} notify={notify} onGoTo={setTab} />}
                {activeTab === 'connection' && canManage && connectionPage}
            </div>
        </PageShell>
    )
}

export default BusinessCentral
