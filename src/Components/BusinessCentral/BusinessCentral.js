import './BusinessCentral.css'

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from '../Shared/ui/PageShell'
import { createBcApi } from './bcApi'
import { formatAgo } from './bcFormat'
import BCDashboard from './BCDashboard'
import BCReports from './BCReports'
import BCTransactions from './BCTransactions'
import BCBankStatement from './BCBankStatement'
import BCEInvoice from './BCEInvoice'
import BCChanges from './BCChanges'
import BCSync from './BCSync'
import BCLive from './BCLive'
import BCConnection from './BCConnection'
import BCDocClasses from './BCDocClasses'
import BCAccessUsers from './BCAccessUsers'
import BCTransfer from './BCTransfer'
import { BCAccessProvider, makeAccess } from './bcAccess'
import { SUB_KEYS, updateUrl, useUrlState } from './bcUrl'

const POLL_MS = 5000
// How often Business Central is looked at for changes while the module is open.
const LIVE_POLL_MS = 45000
const CHOSEN_CONNECTION = 'bc.connectionId'

// Which connection this browser last used. Storage can be unavailable (a
// private window, blocked site data), in which case the primary is used.
const rememberedConnection = () => {
    try { return window.localStorage.getItem(CHOSEN_CONNECTION) || '' } catch (failure) { return '' }
}
const rememberConnection = (id) => {
    try { if (id) window.localStorage.setItem(CHOSEN_CONNECTION, id); else window.localStorage.removeItem(CHOSEN_CONNECTION) } catch (failure) { /* not remembered, nothing else lost */ }
}

// "12 new, 3 changed and 1 removed" across a batch of changes.
const summariseChanges = (changes) => {
    const total = changes.reduce((sum, change) => ({ added: sum.added + (change.added || 0), changed: sum.changed + (change.changed || 0), removed: sum.removed + (change.removed || 0) }), { added: 0, changed: 0, removed: 0 })
    const parts = [
        total.added ? `${total.added.toLocaleString()} new` : '',
        total.changed ? `${total.changed.toLocaleString()} changed` : '',
        total.removed ? `${total.removed.toLocaleString()} removed` : '',
    ].filter(Boolean)
    const tables = [...new Set(changes.map((change) => change.table))]
    const where = tables.length > 2 ? `${tables.slice(0, 2).join(', ')} and ${tables.length - 2} more` : tables.join(' and ')
    if (!parts.length) return `Business Central data was checked again (${where}).`
    const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]
    return `Synced from Business Central: ${list} (${where}).`
}

const BusinessCentral = () => {
    const { fetchServer, server, storePath, setAlert, setAlertState, setAlertTimeout } = useContext(ContextProvider)
    const [connectionId, setConnectionId] = useState(rememberedConnection)
    const api = useMemo(() => createBcApi(fetchServer, server, connectionId), [fetchServer, server, connectionId])
    const [adding, setAdding] = useState(false)
    // Goes up when Business Central is found to have changed, which makes
    // the dashboard and the open report load again.
    const [dataVersion, setDataVersion] = useState(0)
    const seenChange = useRef(null)

    // The tab and the open report live in the address, so a refresh lands
    // where the reader was. Moving to another tab drops what belonged to the
    // one left (its report, its section).
    const [tab, setTabInUrl] = useUrlState('tab', 'dashboard')
    const setTab = useCallback((next) => setTabInUrl(next, SUB_KEYS), [setTabInUrl])
    const [info, setInfo] = useState(null)
    const [status, setStatus] = useState(null)
    const [history, setHistory] = useState([])
    const [lookups, setLookups] = useState(null)
    const [reportInUrl] = useUrlState('report', '')
    const reportKey = reportInUrl || null
    // The filters a report was opened with (from a dashboard tile, say) are
    // kept in the address with it, so a refresh opens it the same way.
    const [presetInUrl] = useUrlState('preset', '')
    const reportPreset = useMemo(() => {
        if (!presetInUrl) return null
        try { return { values: JSON.parse(presetInUrl), stamp: presetInUrl } } catch (failure) { return null }
    }, [presetInUrl])
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

    // The status (last sync, a sync running, what changed) is for everyone who
    // can open the module, so their figures follow each scheduled sync.
    // History belongs to the Data Sync tab and is asked for only by those who
    // have it: a refused request here used to set off the sign-out.
    const seesHistory = useRef(false)
    const loadSync = useCallback(async (withHistory = seesHistory.current) => {
        try {
            const [current, past] = await Promise.all([api.getSyncStatus(), withHistory ? api.getSyncHistory().catch(() => ({ runs: [] })) : { runs: [] }])
            setStatus(current)
            setHistory(past.runs)
        } catch (failure) {
            // The status strip is secondary. A failed refresh keeps showing
            // the last known state instead of replacing the page with an error.
        }
    }, [api])

    const loadLookups = useCallback(async () => {
        try {
            const response = await api.getLookups()
            setLookups(response.lookups)
            // A kept list is used at once. If the server is bringing it up to
            // date, it is fetched once more shortly after.
            if (response.stale) setTimeout(() => { api.getLookups().then((fresh) => setLookups(fresh.lookups)).catch(() => {}) }, 8000)
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
        seesHistory.current = !response.access || response.access.admin || (response.access.tabs || []).includes('data')
        await Promise.all([stored ? loadSync() : null, response.connection.discoveredAt ? loadLookups() : null])
    }, [loadInfo, loadSync, loadLookups])

    useEffect(() => { refreshAll() }, [refreshAll])

    const stored = info?.storageMode === 'stored'

    // The server answers with the primary connection when the one this
    // browser remembered has been removed. Follow it.
    const servedId = info?.connection?.id || ''
    useEffect(() => {
        if (info && servedId !== connectionId && (servedId || connectionId)) {
            rememberConnection(servedId === 'connection' ? '' : servedId)
            if (servedId === 'connection' && !connectionId) return
            setConnectionId(servedId === 'connection' ? '' : servedId)
        }
    }, [info, servedId, connectionId])

    const switchConnection = (id) => {
        const next = id === 'connection' ? '' : id
        rememberConnection(next)
        seenChange.current = null
        setAdding(false)
        setInfo(null)
        setLookups(null)
        setStatus(null)
        updateUrl({ tab: '', ...SUB_KEYS })
        setConnectionId(next)
    }

    // While the module is open, Business Central is looked at for changes
    // every so often. Anything found is announced and the figures on screen
    // are loaded again, so nobody is left reading numbers that have moved.
    const liveReady = !!info?.connection?.discoveredAt && !stored
    useEffect(() => {
        if (!liveReady) return undefined
        let active = true
        const look = async () => {
            try {
                const { live } = await api.getLiveStatus()
                if (!active) return
                if (seenChange.current === null) { seenChange.current = live.seq || 0; return }
                if ((live.seq || 0) <= seenChange.current) return
                const fresh = (live.changes || []).filter((change) => change.id > seenChange.current)
                seenChange.current = live.seq
                if (!fresh.length) return
                notify('info', summariseChanges(fresh))
                setDataVersion((version) => version + 1)
            } catch (failure) {
                // A missed look is made up for by the next one.
            }
        }
        look()
        const timer = setInterval(look, LIVE_POLL_MS)
        return () => { active = false; clearInterval(timer) }
    }, [api, liveReady, notify])

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

    // `datasets` limits the run to those tables. Reloading one table is quick
    // for setup tables and is not worth a warning; the whole company is.
    const startSync = async (mode, datasets) => {
        if (mode === 'full' && !datasets?.length && !window.confirm('A full reload reads every table again from the start. On a large company this can take a long time and puts load on the Business Central server. Continue?')) return
        setBusy(true)
        try {
            const response = await api.startSync(mode, datasets)
            setStatus((current) => ({ ...(current || { state: {} }), run: response.run, running: true }))
        } catch (failure) {
            notify('error', failure.message)
            loadSync()
        } finally {
            setBusy(false)
        }
    }

    // Builds every stored summary again and drops kept answers, then has
    // every page load again.
    const rebuild = async () => {
        setBusy('rebuild')
        try {
            await api.rebuildSummaries()
            notify('success', 'Summaries rebuilt. The figures on every page are worked out again.')
            setDataVersion((version) => version + 1)
        } catch (failure) {
            notify('error', failure.message)
        } finally {
            setBusy(false)
        }
    }

    const readAgain = async () => {
        setBusy(true)
        try {
            await api.refreshLive()
            notify('info', 'Reading everything from Business Central again. The figures follow as it finishes.')
        } catch (failure) {
            notify('error', failure.message)
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

    // `preset` is the set of filters to open the report with. The stamp makes
    // the same report open afresh when it is reached again with other filters.
    const openReport = (key, preset) => {
        // One step in the history, so Back returns to where the report was opened from.
        updateUrl({ ...SUB_KEYS, tab: 'reports', report: key, preset: preset ? JSON.stringify(preset) : '' })
    }
    const pickReport = (key) => updateUrl({ report: key || '', preset: '' })

    // When reports run live, the list of branches comes from the ledger
    // entries, which have not been read when the page first opens. Once a
    // report or the dashboard has loaded they have, so the dropdowns are
    // fetched again.
    const branchesPending = !!lookups && lookups.branchesKnown === false
    const onDataLoaded = useCallback(() => {
        if (branchesPending) loadLookups()
    }, [branchesPending, loadLookups])

    if (loadError && !info) {
        return <PageShell maxWidth={1400}><div className='bc-root'><div className='bc-banner bc-banner-error'>{loadError}</div></div></PageShell>
    }
    if (!info) {
        return <PageShell maxWidth={1400}><div className='bc-root'><p className='bc-empty'>Loading Business Central Reports...</p></div></PageShell>
    }

    const { connection, datasets, secretsConfigured } = info
    // What this user may do here. The Connection tab is what an admin had.
    const access = makeAccess(info.access || (info.canManage ? null : { admin: false, tabs: ['dashboard', 'transactions', 'reports', 'bank', 'einvoice', 'changes', 'data'], actions: [], reports: { all: true, custom: true } }))
    const canManage = access.canTab('connection')
    const connections = info.connections || []
    // In live mode there is no sync time. The reload signal is the count of
    // changes picked up instead.
    // What the pages watch to know the data has changed: a finished sync,
    // changes picked up live, or summaries rebuilt by hand.
    const lastSyncedAt = stored ? `${connection?.lastSyncFinishedAt || 0}|${dataVersion}` : dataVersion

    const addConnectionPage = (
        <BCConnection
            key='new'
            adding
            template={connection}
            api={api}
            connection={null}
            datasets={datasets}
            secretsConfigured={secretsConfigured}
            syncRunning={false}
            onChanged={refreshAll}
            onCreated={(id) => { notify('success', 'Connection added.'); switchConnection(id) }}
            onCancel={() => setAdding(false)}
            notify={notify}
        />
    )
    const switcher = (connections.length > 1 || canManage) && connection ? (
        <div className='bc-switcher'>
            {connections.length > 1 && (
                <select className='bc-input' aria-label='Business Central connection' value={connection.id} onChange={(event) => switchConnection(event.target.value)}>
                    {connections.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.company && entry.company !== entry.name ? ` (${entry.company})` : ''}</option>)}
                </select>
            )}
            {canManage && <button type='button' className='bc-button' onClick={() => setAdding(true)}>Add connection</button>}
        </div>
    ) : null
    const hasData = Object.values(status?.state || {}).some((entry) => entry.lastSyncedAt)

    const connectionPage = (
        <BCConnection
            key={connection?.id || 'first'}
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
                    {access.admin && <BCTransfer api={api} connection={null} onChanged={refreshAll} notify={notify} />}
                </div>
            </PageShell>
        )
    }

    if (adding) {
        return (
            <PageShell maxWidth={1400}>
                <div className='bc-root'>
                    <header className='bc-header'>
                        <div>
                            <h1>Business Central Reports</h1>
                            <p className='bc-muted'>Add a connection</p>
                        </div>
                    </header>
                    {addConnectionPage}
                </div>
            </PageShell>
        )
    }

    const tabs = [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'transactions', label: 'Transactions' },
        { key: 'reports', label: 'Reports' },
        { key: 'bank', label: 'Bank statements' },
        { key: 'einvoice', label: 'E-Invoicing' },
        // The change log compares Business Central with a stored copy, so it
        // only exists when there is one.
        ...(stored ? [{ key: 'changes', label: 'Changes' }] : []),
        { key: 'data', label: stored ? 'Data Sync' : 'Data' },
        ...(canManage ? [{ key: 'connection', label: 'Connection' }] : []),
        // Who may do what in the module: for admins.
        ...(access.admin ? [{ key: 'access', label: 'Access' }] : []),
    ].filter((entry) => entry.key === 'access' || entry.key === 'connection' || access.canTab(entry.key))
    // A tab the user may not open falls back to the first one they may.
    const activeTab = tabs.some((entry) => entry.key === tab) ? tab : (tabs[0]?.key || '')
    const wantsData = ['dashboard', 'reports', 'transactions', 'bank'].includes(activeTab)
    const notDiscovered = !connection.company || !connection.discoveredAt
    const needsFirstSync = stored && !hasData

    let chip = 'Live from Business Central'
    if (stored) chip = running ? 'Syncing now' : `Synced ${formatAgo(connection?.lastSyncFinishedAt || 0).toLowerCase()}`

    return (
        <BCAccessProvider value={access}>
        <PageShell maxWidth={1400}>
            <div className='bc-root'>
                <header className='bc-header'>
                    <div>
                        <h1>Business Central Reports</h1>
                        <p className='bc-muted'>{connection.name && connection.name !== connection.company ? `${connection.name}: ` : ''}{connection.company || 'No company selected'}</p>
                    </div>
                    {switcher}
                    <div className='bc-header-actions'>
                        {access.can('sync.run') && (stored
                            ? <button type='button' className='bc-button' disabled={busy || running} onClick={() => startSync('incremental')}>{running ? 'Syncing...' : 'Sync now'}</button>
                            : <button type='button' className='bc-button' disabled={busy} onClick={readAgain}>Read everything again</button>)}
                        {stored && access.can('sync.rebuild') && <button type='button' className='bc-button' disabled={busy || running} title='Builds every summary again from the stored data, so changes in how figures are worked out show at once' onClick={rebuild}>{busy === 'rebuild' ? 'Rebuilding...' : 'Rebuild summaries'}</button>}
                    </div>
                    <button type='button' className='bc-sync-chip' disabled={!access.canTab('data')} onClick={() => setTab('data')}>
                        <span className={`bc-dot ${running ? 'bc-dot-live' : ''} ${!stored ? 'bc-dot-on' : ''}`} />
                        {chip}
                    </button>
                </header>

                {info.moving && <div className='bc-banner bc-banner-info'>This connection is being moved between workspaces. Reports and syncs are held until the move has finished{access.admin ? '; its progress is on the Connection tab' : ''}.</div>}
                {info.boundElsewhere && <div className='bc-banner bc-banner-error'>{connection.company} now belongs to another workspace, so it cannot be used here. {access.admin ? 'Remove this connection on the Connection tab, or ask that workspace for a transfer code.' : 'Ask an admin.'}</div>}
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
                        {activeTab === 'dashboard' && <BCDashboard api={api} lookups={lookups} lastSyncedAt={lastSyncedAt} syncedAt={connection?.lastSyncFinishedAt || 0} live={!stored} canManage={canManage} onOpenReport={openReport} onLoaded={onDataLoaded} onDiscovered={refreshAll} />}
                        {activeTab === 'transactions' && <BCTransactions api={api} lookups={lookups} lastSyncedAt={lastSyncedAt} onLoaded={onDataLoaded} onGoTo={setTab} />}
                        {activeTab === 'bank' && <BCBankStatement api={api} lookups={lookups} />}
                        {activeTab === 'reports' && <BCReports api={api} lookups={lookups} lastSyncedAt={lastSyncedAt} openKey={reportKey} openPreset={reportPreset} onOpenKey={pickReport} onGoTo={setTab} onLoaded={onDataLoaded} notify={notify} />}
                    </>
                )}
                {/* Works from its own staging records, so it does not wait for the live reading the reports need. */}
                {activeTab === 'einvoice' && !notDiscovered && <BCEInvoice api={api} notify={notify} />}
                {activeTab === 'einvoice' && notDiscovered && <div className='bc-banner bc-banner-info'>Finish the Business Central connection first. E-invoicing reads posted invoices through it.</div>}
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
                {activeTab === 'connection' && canManage && !notDiscovered && <BCDocClasses api={api} notify={notify} />}
                {activeTab === 'connection' && access.admin && <BCTransfer api={api} connection={connection} connections={connections} onChanged={refreshAll} notify={notify} />}
                {activeTab === 'access' && access.admin && <BCAccessUsers api={api} notify={notify} />}
                {!tabs.length && <div className='bc-banner bc-banner-info'>Your access to Business Central does not include any of its pages yet. An admin can give it on the Access tab.</div>}
            </div>
        </PageShell>
        </BCAccessProvider>
    )
}

export default BusinessCentral
