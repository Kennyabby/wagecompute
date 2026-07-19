import './Journals.css'
import { useState, useContext, useEffect, useMemo, useRef } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { MdSearch, MdAdd, MdEdit, MdDelete, MdFilterList, MdOutlineAccountBalance, MdOutlineReceiptLong, MdClose, MdRefresh, MdAnalytics, MdPictureAsPdf, MdDeleteSweep } from 'react-icons/md'
import { FaFileExcel } from 'react-icons/fa'
import jsPDF from 'jspdf'
import { generateExcel } from '../../utils/exportUtils'
import { getAppCache, setAppCache } from '../../Resources/offlineDb'
import { generateOperationId, checkPostingOperationStatus, usePostingOperationProgress } from '../../Resources/postingOperations'

const ACCOUNTING_UI_CACHE_VERSION = 6
const buildJournalCacheScope = (fromDate, toDate, filters = {}) => ({
    fromDate: String(fromDate || ''),
    toDate: String(toDate || ''),
    filters: filters || {},
})

const isJournalCacheForScope = (cachedData, fromDate, toDate) => {
    if (!cachedData?.balances) return false
    const cachedFrom = cachedData.fromDate || cachedData.cacheScope?.fromDate || cachedData.meta?.fromDate
    const cachedTo = cachedData.toDate || cachedData.cacheScope?.toDate || cachedData.meta?.toDate
    return String(cachedFrom || '') === String(fromDate || '') && String(cachedTo || '') === String(toDate || '')
}

const buildJournalCachePayload = ({ fromDate, toDate, balances = {}, reports = {}, rawLedger = {}, meta = {}, includeRawLedger = false }) => ({
    fromDate,
    toDate,
    cacheScope: buildJournalCacheScope(fromDate, toDate),
    balances,
    reports,
    rawLedger: includeRawLedger ? rawLedger : {},
    meta,
})

const Journals = () => {
    const {
        server, fetchServer, company, companyRecord,
        setAlertState, setAlert, setAlertTimeout,
        chartOfAccounts, getChartOfAccounts, storePath,
    } = useContext(ContextProvider)

    useEffect(() => {
        storePath('journals')
        document.title = 'Accounting > Journals | Enterprise Compute Central'
    }, [storePath])

    const [activeTab, setActiveTab] = useState('COA') // 'COA', 'JOURNALS', or 'REPORTS'
    
    // COA State — coaData is the context chartOfAccounts (always fresh via SSE + cache)
    const coaData = chartOfAccounts || []
    const [searchTerm, setSearchTerm]   = useState('')
    const [filterCategory, setFilterCategory] = useState('All')
    const [filterType, setFilterType]   = useState('All')
    const [sortConfig, setSortConfig] = useState({ key: 'g/l code', direction: 'asc' })
    const [collapsedHeaders, setCollapsedHeaders] = useState(new Set())
    
    // Date Filters
    const formatDateInput = (value) => {
        const date = value instanceof Date ? value : new Date(value)
        if (Number.isNaN(date.getTime())) return ''
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const [fromDate, setFromDate] = useState(formatDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
    const [toDate, setToDate] = useState(formatDateInput(new Date()))
    const [draftFromDate, setDraftFromDate] = useState(formatDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
    const [draftToDate, setDraftToDate] = useState(formatDateInput(new Date()))

    const setDatePreset = (preset) => {
        const now = new Date();
        let from, to;
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (preset === 'MTD') {
            from = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (preset === 'YTD') {
            from = new Date(now.getFullYear(), 0, 1);
        } else if (preset === 'QTR') {
            const q = Math.floor(now.getMonth() / 3);
            from = new Date(now.getFullYear(), q * 3, 1);
        } else if (preset === '30D') {
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else {
            from = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        const f = formatDateInput(from);
        const t = formatDateInput(to);
        setDraftFromDate(f);
        setDraftToDate(t);
        setFromDate(f);
        setToDate(t);
    }

    const applyAccountingDateRange = () => {
        if (!draftFromDate || !draftToDate) return;
        setFromDate(draftFromDate);
        setToDate(draftToDate);
    }

    const toggleHeader = (glCode) => {
        setCollapsedHeaders(prev => {
            const next = new Set(prev);
            if (next.has(glCode)) next.delete(glCode);
            else next.add(glCode);
            return next;
        });
    };

    const [isLoading, setIsLoading]         = useState(false)
    const [isBalancesLoading, setIsBalancesLoading] = useState(false)
    const [isSaving, setIsSaving]           = useState(false)
    const [balances, setBalances]           = useState({})   // { '11010': { debit, credit } }
    const [rawLedger, setRawLedger]         = useState({})   // { '11010': [ { date, desc, debit, credit, source } ] }
    const [reportData, setReportData]       = useState({
        trialBalance: { rows: [], totals: { debit: 0, credit: 0, openingBalance: 0, net: 0 } },
        profitLoss: {
            revenue: [],
            costOfSales: [],
            expenses: [],
            totals: { revenue: 0, costOfSales: 0, grossProfit: 0, expenses: 0, netIncome: 0 }
        },
        balanceSheet: {
            assets: [],
            liabilities: [],
            equity: [],
            totals: { assets: 0, liabilities: 0, equity: 0, liabilitiesAndEquity: 0 }
        }
    })
    const [reportRangeKey, setReportRangeKey] = useState('')
    const [accountingSnapshotMeta, setAccountingSnapshotMeta] = useState(null)

    // Drill-down modal
    const [drillDown, setDrillDown] = useState(null) // { glCode, accountName, side: 'debit'|'credit'|'net' }

    // Init progress dialog
    const [initProgress, setInitProgress] = useState(null) // null = hidden | { steps: [], done: false }

    const [showCOAModal, setShowCOAModal]     = useState(false)
    const [showJournalModal, setShowJournalModal] = useState(false)
    const [showMappingsModal, setShowMappingsModal] = useState(false)
    const [imbalanceAnalysis, setImbalanceAnalysis] = useState(null)
    const [reportType, setReportType] = useState('PL'); // 'PL' | 'TB' | 'BS'
    const [accountingMappings, setAccountingMappings] = useState(null)
    const [isMappingsLoading, setIsMappingsLoading] = useState(false)
    const [isMappingsSaving, setIsMappingsSaving] = useState(false)
    const [isDrillDownLoading, setIsDrillDownLoading] = useState(false)
    const balanceRequestRef = useRef(0)
    const journalsPageRef = useRef(null)

    // Closing balances UI/state
    const [lastClosing, setLastClosing] = useState(null)
    const [lastClosingDetails, setLastClosingDetails] = useState(null)
    const [monthlyClosings, setMonthlyClosings] = useState([])
    const [pendingClosings, setPendingClosings] = useState([])
    const [auditEntries, setAuditEntries] = useState([])
    const [showClosingDetailsModal, setShowClosingDetailsModal] = useState(false)
    const [showClosingsModal, setShowClosingsModal] = useState(false)
    const [showPendingModal, setShowPendingModal] = useState(false)
    const [showAuditModal, setShowAuditModal] = useState(false)
    const [isClosingLoading, setIsClosingLoading] = useState(false)
    const [isClosingAction, setIsClosingAction] = useState(false)
    const [closingToolbarOpen, setClosingToolbarOpen] = useState(true)

    const loadLastClosing = async () => {
        if (!company) return
        setIsClosingLoading(true)
        try {
            const resp = await fetchServer('GET', { beforeDate: fromDate }, 'accounting/last-closing', server)
            if (resp && resp.ok) {
                setLastClosing(resp.closing || null)
            }
        } catch (e) {
            console.error('Error loading last closing', e)
        } finally {
            setIsClosingLoading(false)
        }
    }

    const handleViewClosing = async () => {
        if (!lastClosing) return;
        setIsClosingLoading(true);
        try {
            const resp = await fetchServer('GET', { from: lastClosing.closingDate, to: lastClosing.closingDate }, 'accounting/closings', server);
            if (resp && resp.ok) {
                setLastClosingDetails((resp.closings && resp.closings[0]) || lastClosing);
                setShowClosingDetailsModal(true);
            } else {
                setAlertState('error'); setAlert(resp?.mess || 'Failed to load closing'); setAlertTimeout(3000);
            }
        } catch (e) {
            console.error('view closing failed', e);
        } finally {
            setIsClosingLoading(false);
        }
    }

    const loadMonthlyClosings = async () => {
        if (!company) return []
        setIsClosingLoading(true)
        try {
            const closingEnd = monthEndFor(toDate)
            const resp = await fetchServer('GET', { to: closingEnd }, 'accounting/closings', server)
            const rows = resp?.ok ? (resp.closings || []) : []
            setMonthlyClosings(rows)
            return rows
        } catch (e) {
            console.error('load monthly closings failed', e)
            setAlertState('error')
            setAlert(e.message || 'Failed to load monthly closings')
            setAlertTimeout(4000)
            return []
        } finally {
            setIsClosingLoading(false)
        }
    }

    const handleOpenClosingsModal = async () => {
        await loadMonthlyClosings()
        setShowClosingsModal(true)
    }

    const loadPendingClosings = async () => {
        if (!company) return;
        setIsClosingLoading(true);
        try {
            const resp = await fetchServer('GET', {}, 'accounting/pending-closings', server);
            if (resp && resp.ok) setPendingClosings(resp.pending || []);
        } catch (e) {
            console.error('load pending closings failed', e);
        } finally {
            setIsClosingLoading(false);
        }
    }

    const handleOpenPendingModal = async () => {
        await loadPendingClosings();
        setShowPendingModal(true);
    }

    const handleViewAudit = async (closingDate) => {
        if (!closingDate) return;
        setIsClosingLoading(true);
        try {
            const resp = await fetchServer('GET', { closingDate }, 'accounting/closing-audit', server);
            if (resp && resp.ok) setAuditEntries(resp.audit || []);
            setShowAuditModal(true);
        } catch (e) {
            console.error('load audit failed', e);
        } finally {
            setIsClosingLoading(false);
        }
    }

    const handleProcessPendingItem = async (closingDate, adminOverride = false) => {
        if (!closingDate) return;
        setIsClosingAction(true);
        try {
            // enqueue recompute for that single closingDate and trigger processing
            await fetchServer('POST', { events: [], enqueue: true }, 'accounting/detect-affected-closings', server).catch(() => {});
            // Directly call recompute for that date
            const resp = await fetchServer('POST', {}, `accounting/closing/${closingDate}/recompute`, server);
            if (resp && resp.ok) {
                setAlertState('success'); setAlert('Recompute requested for ' + closingDate); setAlertTimeout(3000);
                await loadPendingClosings();
            } else {
                setAlertState('error'); setAlert(resp?.mess || 'Failed to request recompute'); setAlertTimeout(4000);
            }
        } catch (e) {
            console.error('process pending item failed', e);
            setAlertState('error'); setAlert(e.message || 'Failed to request recompute'); setAlertTimeout(4000);
        } finally {
            setIsClosingAction(false);
        }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (company) loadLastClosing()
    }, [company, fromDate])

    const monthEndFor = (dateStr) => {
        const [year, month] = String(dateStr || formatDateInput(new Date())).split('-').map(Number)
        const last = new Date(year, month, 0)
        return formatDateInput(last)
    }

    const getModalOverlayStyle = () => {
        const rect = journalsPageRef.current?.getBoundingClientRect?.()
        if (!rect) return undefined

        return {
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
        }
    }

    const handleComputeClosing = async (includeRaw = false) => {
        if (!company || !companyRecord) return
        const closingDate = monthEndFor(toDate)
        setIsClosingAction(true)
        try {
            const resp = await fetchServer('POST', { closingDate, includeRawLedger: includeRaw }, `accounting/compute-closing`, server)
            if (resp && resp.ok) {
                setLastClosing(resp.closing || null)
                loadBalances(true)
                setAlertState('success')
                setAlert(resp.mess || 'Closing computed')
                setAlertTimeout(3000)
            } else {
                setAlertState('error')
                setAlert(resp?.mess || 'Failed to compute closing')
                setAlertTimeout(4000)
            }
        } catch (e) {
            console.error('compute closing failed', e)
            setAlertState('error')
            setAlert(e.message || 'Failed to compute closing')
            setAlertTimeout(4000)
        } finally {
            setIsClosingAction(false)
        }
    }

    const handleBuildMissingMonthlyClosings = async (includeRawLedger = false) => {
        if (!company || !companyRecord) return
        const closingEnd = monthEndFor(toDate)
        setIsClosingAction(true)
        try {
            const resp = await fetchServer('POST', {
                toDate: closingEnd,
                includeRawLedger,
                status: 'draft',
            }, 'accounting/compute-closings-range', server)
            if (resp && resp.ok) {
                setAlertState('success')
                setAlert(`Monthly closings ${includeRawLedger ? 'with ledger snapshots ' : ''}built through ${closingEnd}. ${resp.persistedCount || 0} month(s) saved. Refreshing balances now.`)
                setAlertTimeout(4000)
                await loadLastClosing()
                await loadMonthlyClosings()
                await hydrateFullAccountingSnapshot(true)
            } else {
                const failed = (resp?.results || []).filter((row) => !row.ok)
                const failedPreview = failed.slice(0, 3).map((row) => `${row.date}: ${row.error || 'failed'}`).join(' | ')
                setAlertState('error')
                setAlert(failedPreview || resp?.mess || 'Failed to build monthly closings')
                setAlertTimeout(8000)
                await loadMonthlyClosings()
            }
        } catch (e) {
            console.error('build missing monthly closings failed', e)
            setAlertState('error')
            setAlert(e.message || 'Failed to build monthly closings')
            setAlertTimeout(5000)
        } finally {
            setIsClosingAction(false)
        }
    }

    const handleSetClosingStatus = async (status, closingDate = lastClosing?.closingDate) => {
        if (!closingDate) return
        setIsClosingAction(true)
        try {
            const resp = await fetchServer('POST', { status }, `accounting/closing/${closingDate}/status`, server)
            if (resp && resp.ok) {
                if (closingDate === lastClosing?.closingDate) setLastClosing(resp.closing || null)
                setMonthlyClosings((prev) => prev.map((row) => row.closingDate === closingDate ? (resp.closing || row) : row))
                setAlertState('success')
                setAlert(resp.mess || 'Status updated')
                setAlertTimeout(3000)
            } else {
                setAlertState('error')
                setAlert(resp?.mess || 'Failed to update status')
                setAlertTimeout(4000)
            }
        } catch (e) {
            console.error('set status failed', e)
            setAlertState('error')
            setAlert(e.message || 'Failed to update status')
            setAlertTimeout(4000)
        } finally {
            setIsClosingAction(false)
        }
    }

    const handleRecomputeClosing = async (closingDate = lastClosing?.closingDate, includeRawLedger = false) => {
        if (!closingDate) return
        setIsClosingAction(true)
        try {
            const resp = await fetchServer('POST', { includeRawLedger }, `accounting/closing/${closingDate}/recompute`, server)
            if (resp && resp.ok) {
                if (closingDate === lastClosing?.closingDate) setLastClosing(resp.closing || null)
                setMonthlyClosings((prev) => prev.map((row) => row.closingDate === closingDate ? (resp.closing || row) : row))
                loadBalances(true)
                setAlertState('success')
                setAlert(resp.mess || 'Closing recomputed')
                setAlertTimeout(3000)
            } else {
                setAlertState('error')
                setAlert(resp?.mess || 'Failed to recompute closing')
                setAlertTimeout(4000)
            }
        } catch (e) {
            console.error('recompute failed', e)
            setAlertState('error')
            setAlert(e.message || 'Failed to recompute closing')
            setAlertTimeout(4000)
        } finally {
            setIsClosingAction(false)
        }
    }

    const handleDetectAffectedClosings = async () => {
        if (!company) return;
        setIsClosingAction(true);
        try {
            const events = [];
            if (drillDown && drillDown.glCode && rawLedger[drillDown.glCode]) {
                rawLedger[drillDown.glCode].forEach(row => {
                    events.push({ collection: row.source || 'GeneralLedgerEntries', op: 'update', data: { postingDate: row.date || row.postingDate || row.createdAt, ...row } });
                });
            }

            const resp = await fetchServer('POST', { events, enqueue: true }, 'accounting/detect-affected-closings', server);
            if (resp && resp.ok) {
                setAlertState('success');
                setAlert(resp.mess || `Detected ${resp.affected?.length || 0} affected closings`);
                setAlertTimeout(3000);
                await loadPendingClosings();
            } else {
                setAlertState('error'); setAlert(resp?.mess || 'Failed to detect affected closings'); setAlertTimeout(4000);
            }
        } catch (e) {
            console.error('detect affected closings failed', e);
            setAlertState('error'); setAlert(e.message || 'Failed to detect affected closings'); setAlertTimeout(4000);
        } finally {
            setIsClosingAction(false);
        }
    }

    const handleTriggerPendingRecomputes = async (adminOverride = false) => {
        if (!company) return;
        setIsClosingAction(true);
        try {
            const resp = await fetchServer('POST', { adminOverride: !!adminOverride, includeRawLedger: false }, 'accounting/trigger-pending-closing-recomputes', server);
            if (resp && resp.ok) {
                setAlertState('success'); setAlert(resp.mess || 'Triggered pending recomputes'); setAlertTimeout(3000);
            } else {
                setAlertState('error'); setAlert(resp?.mess || 'Failed to trigger recomputes'); setAlertTimeout(4000);
            }
        } catch (e) {
            console.error('trigger pending recomputes failed', e);
            setAlertState('error'); setAlert(e.message || 'Failed to trigger recomputes'); setAlertTimeout(4000);
        } finally {
            setIsClosingAction(false);
        }
    }

    // One-click historical backlog: posts a real GeneralLedgerEntries record
    // for every existing Purchase/Inventory/Assets/BusinessPartners document
    // that doesn't already have one — safe to re-run (server-side dedup
    // skips anything already posted), so this can also be used later to pick
    // up any gap after new historical data is imported.
    //
    // The server responds immediately with an operationId and keeps running
    // in the background — progress comes from the PostingOperations SSE feed
    // (usePostingOperationProgress below), and the operationId is persisted
    // to localStorage so reloading this page mid-run reattaches to the same
    // operation instead of losing all visibility (or, worse, tempting a
    // second concurrent run).
    const glBacklogStorageKey = `wc-gl-backlog-op-${company || ''}`;
    const [glBacklogOperationId, setGlBacklogOperationId] = useState(() => {
        try { return window.localStorage.getItem(glBacklogStorageKey) || null; } catch (e) { return null; }
    });
    const glBacklogOperation = usePostingOperationProgress(glBacklogOperationId);

    useEffect(() => {
        if (!glBacklogOperationId || !server) return;
        // Reattach: fetch the current state immediately on mount/reload
        // instead of waiting for the next SSE event, since the run may have
        // finished (or failed) while this tab was closed.
        checkPostingOperationStatus(glBacklogOperationId, server).then((status) => {
            if (!status || status.status === 'unknown') {
                try { window.localStorage.removeItem(glBacklogStorageKey); } catch (e) {}
                setGlBacklogOperationId(null);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [server]);

    useEffect(() => {
        if (!glBacklogOperation || glBacklogOperation.status === 'in-progress') return;
        // Finished (completed or failed) — surface a final summary and clear
        // the reattach pointer so a fresh run starts clean next time.
        setAlertState(glBacklogOperation.status === 'completed' ? 'success' : 'error');
        setAlert(`Backlog ${glBacklogOperation.status}: ${glBacklogOperation.posted || 0} posted, ${glBacklogOperation.alreadyPresent || 0} already present, ${glBacklogOperation.skipped || 0} skipped${glBacklogOperation.errors?.length ? `, ${glBacklogOperation.errors.length} errors` : ''}.`);
        setAlertTimeout(8000);
        try { window.localStorage.removeItem(glBacklogStorageKey); } catch (e) {}
        setGlBacklogOperationId(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [glBacklogOperation?.status]);

    const handlePopulateGeneralLedgerBacklog = async () => {
        if (!company) return;
        if (!window.confirm('This posts real General Ledger entries for all historical Purchase, Inventory, Asset, and Business Partner records that don\'t have one yet. It can take a while for a tenant with a lot of history. Continue?')) {
            return;
        }
        const operationId = generateOperationId();
        try {
            const resp = await fetchServer('POST', { operationId }, 'accounting/populateGeneralLedgerBacklog', server);
            if (resp && resp.ok) {
                try { window.localStorage.setItem(glBacklogStorageKey, resp.operationId || operationId); } catch (e) {}
                setGlBacklogOperationId(resp.operationId || operationId);
                setAlertState('success'); setAlert(`Backlog run started — ${resp.total || 0} records to process.`); setAlertTimeout(4000);
            } else {
                setAlertState('error'); setAlert(resp?.mess || 'Failed to start General Ledger backlog'); setAlertTimeout(4000);
            }
        } catch (e) {
            console.error('populate GL backlog failed', e);
            setAlertState('error'); setAlert(e.message || 'Failed to start General Ledger backlog'); setAlertTimeout(4000);
        }
    }

    const buildImbalanceSnapshot = (ledgerSource = rawLedger) => {
        const groups = {}; // { "source:id": { d: 0, c: 0, rows: [] } }
        const categoryTotals = { Asset: 0, Liability: 0, Equity: 0, Revenue: 0, Expense: 0 };
        
        Object.keys(ledgerSource).forEach(code => {
            const acc = flattenedAccounts.find(a => String(a['g/l code']) === String(code));
            const cat = acc?.category || 'Other';
            
            ledgerSource[code].forEach(row => {
                const gid = `${row.source}:${row.id || row.date}`;
                if (!groups[gid]) groups[gid] = { d: 0, c: 0, rows: [] };
                const amt = row._amt || 0;
                if (row._side === 'debit') {
                    groups[gid].d += amt;
                    if (categoryTotals[cat] !== undefined) categoryTotals[cat] += amt;
                } else {
                    groups[gid].c += amt;
                    if (categoryTotals[cat] !== undefined) categoryTotals[cat] -= amt;
                }
                groups[gid].rows.push({ ...row, code });
            });
        });

        const unbalanced = Object.entries(groups)
            .filter(([id, g]) => Math.abs(g.d - g.c) > 0.01)
            .map(([id, g]) => ({ id, ...g }));

        // Correct totals: Sum only leaf accounts to avoid double-counting headers
        const leafAccs = flattenedAccounts.filter(a => a.headerType === 'leaf');
        const totalD = leafAccs.reduce((s, a) => s + (a.debitBalance || 0), 0);
        const totalC = leafAccs.reduce((s, a) => s + (a.creditBalance || 0), 0);
        const openingGap = leafAccs.reduce((s, a) => s + (a.openingBalance || 0), 0);
        const periodGap = leafAccs.reduce((s, a) => s + (a.periodNetBalance || 0), 0);
        const closingGap = leafAccs.reduce((s, a) => s + (a.netBalance || 0), 0);
        const affectedAccounts = leafAccs
            .filter((account) => Math.abs(account.openingBalance || 0) > 0.01 || Math.abs(account.periodNetBalance || 0) > 0.01 || Math.abs(account.netBalance || 0) > 0.01)
            .map((account) => ({
                code: account['g/l code'],
                name: account.name,
                category: account.category,
                opening: account.openingBalance || 0,
                period: account.periodNetBalance || 0,
                closing: account.netBalance || 0,
                impact: Math.abs(account.netBalance || 0),
            }))
            .sort((a, b) => b.impact - a.impact)
            .slice(0, 15);

        return {
            totalD,
            totalC,
            difference: totalD - totalC,
            openingGap,
            periodGap,
            closingGap,
            unbalancedDocs: unbalanced,
            affectedAccounts,
            categoryTotals
        };
    };

    const hydrateFullAccountingSnapshot = async (forceRefresh = false, options = {}) => {
        if (!company || !companyRecord) return;
        const requestId = Date.now()
        balanceRequestRef.current = requestId
        const userId = companyRecord?.emailid || 'admin'
        const snapshotCacheKey = `journal-snapshot-v${ACCOUNTING_UI_CACHE_VERSION}-${fromDate}-${toDate}`
        const balanceOnlyCacheKey = `journal-balances-v${ACCOUNTING_UI_CACHE_VERSION}-${fromDate}-${toDate}`
        const includeRawLedger = options?.includeRawLedger === true
        const traceId = `journal-${activeTab}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const startedAt = Date.now()
        console.info('[JOURNALS] hydrate snapshot start', {
            traceId,
            activeTab,
            endpoint: activeTab === 'COA' && !includeRawLedger ? 'accounting/coa-balances' : 'getAccountingSummary',
            fromDate,
            toDate,
            forceRefresh,
            includeRawLedger,
        })

        if (!forceRefresh) {
            try {
                const cacheKey = activeTab === 'COA' ? balanceOnlyCacheKey : snapshotCacheKey
                const cached = await getAppCache(company, userId, cacheKey)
                const cachedData = cached?.data || cached || null
                if (isJournalCacheForScope(cachedData, fromDate, toDate)) {
                    setBalances(cachedData.balances || {})
                    setAccountingSnapshotMeta(cachedData.meta || null)
                    if (cachedData.reports) {
                        setReportData(cachedData.reports)
                        setReportRangeKey(`${fromDate}|${toDate}`)
                    }
                    if (activeTab !== 'COA') {
                        setRawLedger(cachedData.rawLedger || {})
                    }
                } else if (cachedData?.balances) {
                    console.info('[JOURNALS] ignored stale accounting cache', {
                        traceId,
                        requestedFrom: fromDate,
                        requestedTo: toDate,
                        cachedFrom: cachedData.fromDate || cachedData.cacheScope?.fromDate || cachedData.meta?.fromDate,
                        cachedTo: cachedData.toDate || cachedData.cacheScope?.toDate || cachedData.meta?.toDate,
                    })
                }
            } catch (cacheError) {
                console.error('Error reading journal cache:', cacheError)
            }
        }

        setIsBalancesLoading(true);

        const endpoint = activeTab === 'COA' && !includeRawLedger ? 'accounting/coa-balances' : 'getAccountingSummary'
        const resp = await fetchServer("POST", {
            fromDate,
            toDate,
            forceRefresh,
            includeRawLedger,
            traceId,
        }, endpoint, server);
        console.info('[JOURNALS] hydrate snapshot response', {
            traceId,
            durationMs: Date.now() - startedAt,
            ok: resp?.ok,
            error: resp?.err,
            balanceAccounts: Object.keys(resp?.balances || {}).length,
            rawLedgerAccounts: Object.keys(resp?.rawLedger || {}).length,
            hasReports: Boolean(resp?.reports && Object.keys(resp.reports || {}).length),
            serverTraceId: resp?.meta?.traceId,
        })

        if (resp.err || !resp.ok) {
            if (balanceRequestRef.current === requestId) {
                setIsBalancesLoading(false);
            }
            throw new Error(resp.mess || 'Failed to load accounting snapshot');
        }

        if (balanceRequestRef.current !== requestId) {
            return
        }
        const nextReports = resp.reports || {
            trialBalance: { rows: [], totals: { debit: 0, credit: 0, openingBalance: 0, net: 0 } },
            profitLoss: {
                revenue: [],
                costOfSales: [],
                expenses: [],
                totals: { revenue: 0, costOfSales: 0, grossProfit: 0, expenses: 0, netIncome: 0 }
            },
            balanceSheet: {
                assets: [],
                liabilities: [],
                equity: [],
                totals: { assets: 0, liabilities: 0, equity: 0, liabilitiesAndEquity: 0 }
            }
        }
        setIsBalancesLoading(false);
        setBalances(resp.balances || {});
        setAccountingSnapshotMeta(resp.meta || null);
        setReportData(nextReports);
        setReportRangeKey(`${fromDate}|${toDate}`);
        const cachePayload = buildJournalCachePayload({
            fromDate,
            toDate,
            balances: resp.balances || {},
            reports: nextReports,
            rawLedger: resp.rawLedger || {},
            meta: resp.meta || {},
            includeRawLedger: !(activeTab === 'COA' && !includeRawLedger),
        })
        if (activeTab === 'COA' && !includeRawLedger) {
            await setAppCache(company, userId, balanceOnlyCacheKey, cachePayload)
        } else {
            setRawLedger(resp.rawLedger || {});
            await setAppCache(company, userId, snapshotCacheKey, cachePayload)
        }
        return resp;
    }

    const analyzeImbalances = async () => {
        setIsBalancesLoading(true)
        try {
            const traceId = `journal-analyze-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            const resp = await fetchServer('POST', {
                fromDate,
                toDate,
                traceId,
            }, 'accounting/analyze-imbalances', server)

            if (resp?.ok) {
                setImbalanceAnalysis({
                    ...(resp.summary || {}),
                    totalD: resp.summary?.totalD || 0,
                    totalC: resp.summary?.totalC || 0,
                    difference: resp.summary?.difference || 0,
                    openingGap: resp.summary?.openingGap || 0,
                    periodGap: resp.summary?.periodGap || 0,
                    closingGap: resp.summary?.closingGap || 0,
                    unbalancedDocs: resp.unbalancedDocs || [],
                    affectedAccounts: resp.affectedAccounts || [],
                    categoryTotals: resp.categoryTotals || {},
                    findings: resp.findings || [],
                    meta: resp.meta || {},
                })
                return
            }

            let ledgerSource = rawLedger
            if (!Object.keys(rawLedger || {}).length) {
                const snapshot = await hydrateFullAccountingSnapshot(false, { includeRawLedger: true })
                ledgerSource = snapshot.rawLedger || {}
            }
            setImbalanceAnalysis(buildImbalanceSnapshot(ledgerSource))
        } catch (error) {
            setAlertState('error')
            setAlert(error.message || 'Failed to analyze imbalances')
            setAlertTimeout(4000)
        } finally {
            setIsBalancesLoading(false)
        }
    };

    const exportToPDF = () => {
        const isTrialBalance = reportType === 'TB'
        const doc = new jsPDF({ orientation: isTrialBalance ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
        const compName = companyRecord?.name || 'Enterprise Compute';
        const title = reportType === 'PL'
            ? 'Profit and Loss Statement'
            : reportType === 'BS'
                ? 'Balance Sheet'
                : 'Trial Balance';
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 12;
        let y = 16;
        const fmt = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const safeFileName = (name) => String(name || 'Report').replace(/[\\/:*?"<>|]+/g, '_');

        const addHeader = () => {
            y = 16;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.text(`${compName} - ${title}`, margin, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.text(`Period: ${fromDate} to ${toDate}`, margin, y);
            y += 9;
        };

        const ensureSpace = (height = 8) => {
            if (y + height <= pageHeight - 12) return;
            doc.addPage();
            addHeader();
        };

        const drawStatementRow = (label, amount, bold = false) => {
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            doc.setFontSize(bold ? 9 : 8.5);
            const valueText = fmt(amount);
            const valueWidth = 42;
            const labelLines = doc.splitTextToSize(String(label || ''), pageWidth - (margin * 2) - valueWidth - 8);
            const rowHeight = Math.max(6, labelLines.length * 4.2);
            ensureSpace(rowHeight + 2);
            doc.text(labelLines, margin, y);
            doc.text(valueText, pageWidth - margin, y, { align: 'right' });
            y += rowHeight;
        };

        const drawSection = (label, rows = [], amountSide = 'amount') => {
            ensureSpace(12);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(20, 83, 45);
            doc.text(label, margin, y);
            doc.setTextColor(0, 0, 0);
            y += 6;
            rows.forEach((row) => drawStatementRow(`${row.code ? `${row.code} - ` : ''}${row.name}`, row[amountSide]));
            y += 2;
        };

        addHeader();

        if (reportType === 'PL') {
            const { revenue, costOfSales, expenses, totals } = reportData.profitLoss;
            drawSection('REVENUE', revenue);
            drawStatementRow('Total Revenue', totals.revenue, true);
            drawSection('COST OF SALES', costOfSales);
            drawStatementRow('Total Cost of Sales', totals.costOfSales, true);
            drawStatementRow('Gross Profit', totals.grossProfit, true);
            drawSection('EXPENSES', expenses);
            drawStatementRow('Total Operating Expenses', totals.expenses, true);
            drawStatementRow('Net Income / (Loss)', totals.netIncome, true);
            doc.save(`${safeFileName(`ProfitLoss_${compName}`)}.pdf`);
            return;
        }

        if (reportType === 'BS') {
            const { assets, liabilities, equity, totals } = reportData.balanceSheet;
            drawSection('ASSETS', assets);
            drawStatementRow('Total Assets', totals.assets, true);
            drawSection('LIABILITIES', liabilities);
            drawStatementRow('Total Liabilities', totals.liabilities, true);
            drawSection('EQUITY', equity);
            drawStatementRow('Total Equity', totals.equity, true);
            drawStatementRow('Total Liabilities + Equity', totals.liabilitiesAndEquity, true);
            doc.save(`${safeFileName(`BalanceSheet_${compName}`)}.pdf`);
            return;
        }

        const columns = [
            { label: 'G/L Code', x: margin, width: 22, align: 'left' },
            { label: 'Account Name', x: margin + 24, width: 70, align: 'left' },
            { label: 'Opening', x: margin + 112, width: 30, align: 'right' },
            { label: 'Debit', x: margin + 143, width: 30, align: 'right' },
            { label: 'Credit', x: margin + 174, width: 30, align: 'right' },
            { label: 'Period Net', x: margin + 205, width: 30, align: 'right' },
            { label: 'Closing Net', x: margin + 238, width: 32, align: 'right' },
        ];

        const drawTbHeader = () => {
            ensureSpace(12);
            doc.setFillColor(20, 83, 45);
            doc.rect(margin, y - 4, pageWidth - (margin * 2), 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            columns.forEach((col) => {
                doc.text(col.label, col.align === 'right' ? col.x + col.width : col.x, y + 1, { align: col.align });
            });
            doc.setTextColor(0, 0, 0);
            y += 8;
        };

        drawTbHeader();
        doc.setFontSize(7);
        reportData.trialBalance.rows.forEach((row) => {
            const nameLines = doc.splitTextToSize(String(row.name || ''), columns[1].width);
            const rowHeight = Math.max(5.5, nameLines.length * 3.5);
            if (y + rowHeight > pageHeight - 12) {
                doc.addPage();
                addHeader();
                drawTbHeader();
            }
            doc.setFont('helvetica', 'normal');
            doc.text(String(row.code || ''), columns[0].x, y);
            doc.text(nameLines, columns[1].x, y);
            doc.text(fmt(row.openingBalance || 0), columns[2].x + columns[2].width, y, { align: 'right' });
            doc.text(fmt(row.debit), columns[3].x + columns[3].width, y, { align: 'right' });
            doc.text(fmt(row.credit), columns[4].x + columns[4].width, y, { align: 'right' });
            doc.text(fmt(row.periodNet || 0), columns[5].x + columns[5].width, y, { align: 'right' });
            doc.text(fmt(row.net), columns[6].x + columns[6].width, y, { align: 'right' });
            y += rowHeight;
        });

        ensureSpace(9);
        doc.line(margin, y - 2, pageWidth - margin, y - 2);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        const totals = reportData.trialBalance.totals || {};
        doc.text('TOTALS', columns[1].x, y + 2);
        doc.text(fmt(totals.openingBalance || 0), columns[2].x + columns[2].width, y + 2, { align: 'right' });
        doc.text(fmt(totals.debit), columns[3].x + columns[3].width, y + 2, { align: 'right' });
        doc.text(fmt(totals.credit), columns[4].x + columns[4].width, y + 2, { align: 'right' });
        doc.text(fmt(totals.periodNet || 0), columns[5].x + columns[5].width, y + 2, { align: 'right' });
        doc.text(fmt(totals.net), columns[6].x + columns[6].width, y + 2, { align: 'right' });
        doc.save(`${safeFileName(`TrialBalance_${compName}`)}.pdf`);
    };

    const exportToExcel = () => {
        const compInfo = { name: companyRecord?.name || 'Enterprise' };
        const dRange = { startDate: fromDate, endDate: toDate };
        const skipAutoTotals = { skipAutoTotals: true };

        if (reportType === 'PL') {
            const { revenue, costOfSales, expenses, totals } = reportData.profitLoss;
            const data = [
                ...revenue.map((row) => ({ section: 'Revenue', code: row.code, name: row.name, amount: row.amount })),
                { section: 'Revenue', code: '', name: 'Total Revenue', amount: totals.revenue },
                ...costOfSales.map((row) => ({ section: 'Cost of Sales', code: row.code, name: row.name, amount: row.amount })),
                { section: 'Cost of Sales', code: '', name: 'Total Cost of Sales', amount: totals.costOfSales },
                { section: 'Summary', code: '', name: 'Gross Profit', amount: totals.grossProfit },
                ...expenses.map((row) => ({ section: 'Expenses', code: row.code, name: row.name, amount: row.amount })),
                { section: 'Expenses', code: '', name: 'Total Operating Expenses', amount: totals.expenses },
                { section: 'Summary', code: '', name: 'Net Income / (Loss)', amount: totals.netIncome },
            ];
            generateExcel(data, [
                { name: 'Section', reference: 'section' },
                { name: 'G/L Code', reference: 'code' },
                { name: 'Account Name', reference: 'name' },
                { name: 'Amount', reference: 'amount', numeric: true }
            ], compInfo, dRange, 'Profit and Loss Report', skipAutoTotals);
            return;
        }

        if (reportType === 'BS') {
            const { assets, liabilities, equity, totals } = reportData.balanceSheet;
            const data = [
                ...assets.map((row) => ({ section: 'Assets', code: row.code, name: row.name, amount: row.amount })),
                { section: 'Assets', code: '', name: 'Total Assets', amount: totals.assets },
                ...liabilities.map((row) => ({ section: 'Liabilities', code: row.code, name: row.name, amount: row.amount })),
                { section: 'Liabilities', code: '', name: 'Total Liabilities', amount: totals.liabilities },
                ...equity.map((row) => ({ section: 'Equity', code: row.code, name: row.name, amount: row.amount })),
                { section: 'Equity', code: '', name: 'Total Equity', amount: totals.equity },
                { section: 'Summary', code: '', name: 'Total Liabilities + Equity', amount: totals.liabilitiesAndEquity },
            ];
            generateExcel(data, [
                { name: 'Section', reference: 'section' },
                { name: 'G/L Code', reference: 'code' },
                { name: 'Account Name', reference: 'name' },
                { name: 'Amount', reference: 'amount', numeric: true }
            ], compInfo, dRange, 'Balance Sheet Report', skipAutoTotals);
            return;
        }

        const tbRows = [
            ...(reportData.trialBalance.rows || []).map((row) => ({
                code: row.code,
                name: row.name,
                openingBalance: row.openingBalance || 0,
                debit: row.debit || 0,
                credit: row.credit || 0,
                periodNet: row.periodNet || 0,
                net: row.net || 0,
            })),
            {
                code: '',
                name: 'TOTALS',
                openingBalance: reportData.trialBalance.totals?.openingBalance || 0,
                debit: reportData.trialBalance.totals?.debit || 0,
                credit: reportData.trialBalance.totals?.credit || 0,
                periodNet: reportData.trialBalance.totals?.periodNet || 0,
                net: reportData.trialBalance.totals?.net || 0,
            },
        ];

        generateExcel(tbRows, [
            { name: 'G/L Code', reference: 'code' },
            { name: 'Account Name', reference: 'name' },
            { name: 'Opening Balance', reference: 'openingBalance', numeric: true },
            { name: 'Debit', reference: 'debit', numeric: true },
            { name: 'Credit', reference: 'credit', numeric: true },
            { name: 'Period Net Balance', reference: 'periodNet', numeric: true },
            { name: 'Closing Net Balance', reference: 'net', numeric: true }
        ], compInfo, dRange, 'Trial Balance Report', skipAutoTotals);
    };

    const exportDrillDownToExcel = (accountCode) => {
        const glCode = String(accountCode || drillDown?.glCode || '')
        // build a global lookup of transaction keys -> lines so we can infer counterpart accounts
        const globalMap = {};
        Object.keys(rawLedger || {}).forEach(accCode => {
            (rawLedger[accCode] || []).forEach(line => {
                const key = `${line.source || ''}:${line.id || line.sourceId || line.date || ''}`;
                if (!globalMap[key]) globalMap[key] = [];
                globalMap[key].push({ accountCode: accCode, line });
            })
        })

        const rows = (rawLedger?.[glCode] || []).map(r => {
            const key = `${r.source || ''}:${r.id || r.sourceId || r.date || ''}`;
            const peers = globalMap[key] || [];
            const debitAccounts = peers.filter(p => Number(p.line.debit || 0) > 0).map(p => String(p.accountCode));
            const creditAccounts = peers.filter(p => Number(p.line.credit || 0) > 0).map(p => String(p.accountCode));
            const resolveNames = (codes) => codes.map(c => {
                const acc = flattenedAccounts.find(a => String(a['g/l code']) === String(c));
                return acc ? `${c} - ${acc.name}` : c;
            }).join(', ');

            return {
                Date: r.date ? new Date(Number(r.date) || r.date).toLocaleDateString() : '',
                postingDate: r.postingDate || r.date || '',
                createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
                accountCode: r.accountCode || r.accountcode || glCode,
                accountName: r.accountName || r.acountName || '',
                accountType: r.accountType || '',
                Description: r.desc || r.note || '',
                'Debit Account': resolveNames(debitAccounts),
                'Credit Account': resolveNames(creditAccounts),
                balAccountCode: r.balAccountCode || '',
                balAccountType: r.balAccountType || '',
                documentNo: r.documentNo || '',
                documentType: r.documentType || '',
                entryType: r.entryType || '',
                entryNo: r.entryNo || '',
                handlerId: r.handlerId || '',
                Source: r.source || '',
                sourceId: r.sourceId || r.id || '',
                amount: Number(r.amount || r.debit || r.credit || 0),
                Debit: Number(r.debit || 0),
                Credit: Number(r.credit || 0),
                meta: r.meta ? JSON.stringify(r.meta) : '',
            }
        });

        const compInfo = { name: companyRecord?.name || 'Enterprise' };
        const dRange = { startDate: fromDate, endDate: toDate };
        generateExcel([
            ...rows,
        ], [
            { name: 'Date', reference: 'Date' },
            { name: 'Posting Date', reference: 'postingDate' },
            { name: 'Created At', reference: 'createdAt' },
            { name: 'Account Code', reference: 'accountCode' },
            { name: 'Account Name', reference: 'accountName' },
            { name: 'Account Type', reference: 'accountType' },
            { name: 'Description', reference: 'Description' },
            { name: 'Debit Account', reference: 'Debit Account' },
            { name: 'Credit Account', reference: 'Credit Account' },
            { name: 'Bal Account Code', reference: 'balAccountCode' },
            { name: 'Bal Account Type', reference: 'balAccountType' },
            { name: 'Document No', reference: 'documentNo' },
            { name: 'Document Type', reference: 'documentType' },
            { name: 'Entry Type', reference: 'entryType' },
            { name: 'Entry No', reference: 'entryNo' },
            { name: 'Handler Id', reference: 'handlerId' },
            { name: 'Source', reference: 'Source' },
            { name: 'Source Id', reference: 'sourceId' },
            { name: 'Amount', reference: 'amount', numeric: true },
            { name: 'Debit', reference: 'Debit', numeric: true },
            { name: 'Credit', reference: 'Credit', numeric: true },
            { name: 'Meta', reference: 'meta' },
        ], compInfo, dRange, `Ledger_${glCode}`);
    }

    const exportDrillDownToPDF = (accountCode) => {
        const glCode = String(accountCode || drillDown?.glCode || '')
        const ledgerRows = (rawLedger?.[glCode] || []);
        // build global map once
        const globalMap = {};
        Object.keys(rawLedger || {}).forEach(accCode => {
            (rawLedger[accCode] || []).forEach(line => {
                const k = `${line.source || ''}:${line.id || line.sourceId || line.date || ''}`;
                if (!globalMap[k]) globalMap[k] = [];
                globalMap[k].push({ accountCode: accCode, line });
            })
        })

        const rows = ledgerRows.map(r => ({
            date: r.date ? new Date(Number(r.date) || r.date).toLocaleDateString() : '',
            postingDate: r.postingDate || r.date || '',
            createdAt: r.createdAt || '',
            accountCode: r.accountCode || r.accountcode || glCode,
            accountName: r.accountName || r.acountName || '',
            accountType: r.accountType || '',
            desc: r.desc || r.note || '',
            source: r.source || '',
            sourceId: r.sourceId || r.id || '',
            debit: Number(r.debit || 0),
            credit: Number(r.credit || 0),
            amount: Number(r.amount || r.debit || r.credit || 0),
            balAccountCode: r.balAccountCode || '',
            balAccountType: r.balAccountType || '',
            documentNo: r.documentNo || '',
            documentType: r.documentType || '',
            entryType: r.entryType || '',
            entryNo: r.entryNo || '',
            handlerId: r.handlerId || '',
            meta: r.meta || {},
            id: r.id || r.sourceId || r.date,
        }));

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 12;
        let y = 16;
        const fmt = (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(`${companyRecord?.name || 'Enterprise'} - Ledger ${glCode}`, margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Period: ${fromDate} to ${toDate}`, margin, y);
        y += 8;

        // header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Date', margin, y);
        doc.text('Description', margin + 30, y);
        doc.text('Debit Account', margin + 30 + 60, y);
        doc.text('Credit Account', margin + 30 + 160, y);
        doc.text('Debit', pageWidth - margin - 40, y, { align: 'right' });
        doc.text('Credit', pageWidth - margin, y, { align: 'right' });
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        let totalD = 0, totalC = 0;
        rows.forEach((r) => {
            if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 20; }
            const descLines = doc.splitTextToSize(String(r.desc || ''), 80);
            doc.text(r.date || '', margin, y);
            doc.text(descLines, margin + 30, y);

            // compute peer accounts from prebuilt globalMap
            const key = `${r.source || ''}:${r.id || r.sourceId || r.date || ''}`;
            const peers = globalMap[key] || [];
            const debitAccounts = peers.filter(p => Number(p.line.debit || 0) > 0).map(p => String(p.accountCode));
            const creditAccounts = peers.filter(p => Number(p.line.credit || 0) > 0).map(p => String(p.accountCode));
            const resolveNames = (codes) => codes.map(c => {
                const acc = flattenedAccounts.find(a => String(a['g/l code']) === String(c));
                return acc ? `${c} - ${acc.name}` : c;
            }).join(', ');

            doc.text(resolveNames(debitAccounts), margin + 30 + 60, y);
            doc.text(resolveNames(creditAccounts), margin + 30 + 160, y);
            doc.text(fmt(r.debit), pageWidth - margin - 40, y, { align: 'right' });
            doc.text(fmt(r.credit), pageWidth - margin, y, { align: 'right' });

            // metadata line (smaller font)
            const metaText = `Acct: ${r.acountName || ''} (${r.accountcode || ''}) Type: ${r.accountType || ''} | Bal: ${r.balAccountCode || ''} (${r.balAccountType || ''}) | Doc: ${r.documentType || ''} ${r.documentNo || ''} | Entry Type: ${r.entryType || ''} | Entry: ${r.entryNo || ''} | Handler: ${r.handlerId || ''} | Src: ${r.source || ''}/${r.sourceId || ''} | Created: ${r.createdAt || ''}`;
            const metaLines = doc.splitTextToSize(metaText, pageWidth - (margin * 2));
            doc.setFontSize(7);
            doc.text(metaLines, margin + 30, y + Math.max(6, descLines.length * 4));
            doc.setFontSize(8);

            y += Math.max(5, descLines.length * 4) + (metaLines.length * 4);
            totalD += r.debit || 0;
            totalC += r.credit || 0;
        });

        // totals
        if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.text('TOTALS', margin + 30, y + 6);
        doc.text(fmt(totalD), pageWidth - margin - 40, y + 6, { align: 'right' });
        doc.text(fmt(totalC), pageWidth - margin, y + 6, { align: 'right' });

        doc.save(`Ledger_${glCode}.pdf`);
    }

    // COA Form State
    const [editAcc, setEditAcc] = useState(null)
    const [coaForm, setCoaForm] = useState({
        name: '',
        'g/l code': '',
        parentSectionId: '',
        category: 'Asset',
        type: 'Balance Sheet'
    })

    // Journals Form State
    const [journalForm, setJournalForm] = useState({
        postingDate: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
        lines: [
            { accountCode: '', accountName: '', debit: 0, credit: 0 },
            { accountCode: '', accountName: '', debit: 0, credit: 0 }
        ]
    })

    // Load COA via context (also refreshes SSE cache)
    const loadCOA = async () => {
        if (!company || !companyRecord) return;
        
        setIsLoading(true);
        try {
            await getChartOfAccounts(company)
        } catch (error) {
            console.error('Error loading COA:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Load when company/tab changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (company && activeTab === 'COA') {
            loadCOA()
        }
    }, [company, activeTab])

    // Reload balances whenever accounting views or dates change — force refresh to avoid stale stored summaries
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (company && ['COA', 'REPORTS'].includes(activeTab)) {
            if (activeTab === 'REPORTS' && reportRangeKey === `${fromDate}|${toDate}`) return
            // loadBalances(true)
            hydrateFullAccountingSnapshot(false, { includeRawLedger: false }).catch((error) => {
                console.error('Error loading accounting snapshot:', error)
            })

        }
    }, [company, activeTab, fromDate, toDate])

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const handleLiveAccountingUpdate = (event) => {
            const snapshot = event?.detail?.snapshot
            if (!snapshot || event?.detail?.company !== company) return
            if (String(snapshot.fromDate) !== String(fromDate) || String(snapshot.toDate) !== String(toDate)) return
            const scopedFilters = snapshot?.filters?.filters || snapshot?.filters || {}
            const hasScopedFilters = Object.keys(scopedFilters || {}).some((key) => (
                !['fromDate', 'toDate'].includes(key) &&
                scopedFilters[key] !== undefined &&
                scopedFilters[key] !== null &&
                scopedFilters[key] !== ''
            ))
            if (hasScopedFilters) return

            setBalances(snapshot.balances || {})
            setAccountingSnapshotMeta(snapshot.meta || null)
            if (snapshot.rawLedger && Object.keys(snapshot.rawLedger || {}).length) {
                setRawLedger(snapshot.rawLedger || {})
            }
            setReportData(snapshot.reports || {
                trialBalance: { rows: [], totals: { debit: 0, credit: 0, openingBalance: 0, net: 0 } },
                profitLoss: {
                    revenue: [],
                    costOfSales: [],
                    expenses: [],
                    totals: { revenue: 0, costOfSales: 0, grossProfit: 0, expenses: 0, netIncome: 0 }
                },
                balanceSheet: {
                    assets: [],
                    liabilities: [],
                    equity: [],
                    totals: { assets: 0, liabilities: 0, equity: 0, liabilitiesAndEquity: 0 }
                }
            })
            setReportRangeKey(`${fromDate}|${toDate}`)
            setIsBalancesLoading(false)
        }

            window.addEventListener('wc:accounting-live-update', handleLiveAccountingUpdate)
        return () => window.removeEventListener('wc:accounting-live-update', handleLiveAccountingUpdate)
    }, [company, fromDate, toDate])

    const loadBalances = async (forceRefresh = false) => {
        if (!company || !companyRecord) return;
        const requestId = Date.now()
        balanceRequestRef.current = requestId
        const userId = companyRecord?.emailid || 'admin'
        const snapshotCacheKey = `journal-snapshot-v${ACCOUNTING_UI_CACHE_VERSION}-${fromDate}-${toDate}`
        const balanceOnlyCacheKey = `journal-balances-v${ACCOUNTING_UI_CACHE_VERSION}-${fromDate}-${toDate}`
        const traceId = `journal-load-${activeTab}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const startedAt = Date.now()
        console.info('[JOURNALS] load balances start', {
            traceId,
            activeTab,
            endpoint: activeTab === 'COA' ? 'accounting/coa-balances' : 'getAccountingSummary',
            fromDate,
            toDate,
            forceRefresh,
        })

        if (!forceRefresh) {
            try {
                const cacheKey = activeTab === 'COA' ? balanceOnlyCacheKey : snapshotCacheKey
                const cached = await getAppCache(company, userId, cacheKey)
                const cachedData = cached?.data || cached || null
                if (isJournalCacheForScope(cachedData, fromDate, toDate)) {
                    setBalances(cachedData.balances || {})
                    setAccountingSnapshotMeta(cachedData.meta || null)
                    if (cachedData.reports) {
                        setReportData(cachedData.reports)
                        setReportRangeKey(`${fromDate}|${toDate}`)
                    }
                    if (activeTab !== 'COA') {
                        setRawLedger(cachedData.rawLedger || {})
                    }
                } else if (cachedData?.balances) {
                    console.info('[JOURNALS] ignored stale accounting cache', {
                        traceId,
                        requestedFrom: fromDate,
                        requestedTo: toDate,
                        cachedFrom: cachedData.fromDate || cachedData.cacheScope?.fromDate || cachedData.meta?.fromDate,
                        cachedTo: cachedData.toDate || cachedData.cacheScope?.toDate || cachedData.meta?.toDate,
                    })
                }
            } catch (cacheError) {
                console.error('Error reading journal cache:', cacheError)
            }
        }

        setIsBalancesLoading(true);

        try {
            const endpoint = activeTab === 'COA' ? 'accounting/coa-balances' : 'getAccountingSummary'
            const payload = { fromDate, toDate, forceRefresh, includeRawLedger: false, traceId };
            const resp = await fetchServer("POST", payload, endpoint, server);
            console.info('[JOURNALS] load balances response', {
                traceId,
                durationMs: Date.now() - startedAt,
                ok: resp?.ok,
                error: resp?.err,
                balanceAccounts: Object.keys(resp?.balances || {}).length,
                rawLedgerAccounts: Object.keys(resp?.rawLedger || {}).length,
                hasReports: Boolean(resp?.reports && Object.keys(resp.reports || {}).length),
                serverTraceId: resp?.meta?.traceId,
            })

            if (resp.err || !resp.ok) {
                throw new Error(resp.mess || 'Failed to load accounting snapshot');
            }

            if (balanceRequestRef.current !== requestId) {
                return
            }

            setBalances(resp.balances || {});
            setAccountingSnapshotMeta(resp.meta || null);
            const nextReports = resp.reports || {
                trialBalance: { rows: [], totals: { debit: 0, credit: 0, openingBalance: 0, net: 0 } },
                profitLoss: {
                    revenue: [],
                    costOfSales: [],
                    expenses: [],
                    totals: { revenue: 0, costOfSales: 0, grossProfit: 0, expenses: 0, netIncome: 0 }
                },
                balanceSheet: {
                    assets: [],
                    liabilities: [],
                    equity: [],
                    totals: { assets: 0, liabilities: 0, equity: 0, liabilitiesAndEquity: 0 }
                }
            };
            setReportData(nextReports);
            setReportRangeKey(`${fromDate}|${toDate}`);
            const cachePayload = buildJournalCachePayload({
                fromDate,
                toDate,
                balances: resp.balances || {},
                reports: nextReports,
                rawLedger: resp.rawLedger || {},
                meta: resp.meta || {},
                includeRawLedger: activeTab !== 'COA',
            })
            if (activeTab === 'COA') {
                await setAppCache(company, userId, balanceOnlyCacheKey, cachePayload)
            } else {
                setRawLedger(resp.rawLedger || {});
                await setAppCache(company, userId, snapshotCacheKey, cachePayload)
            }
        } catch (e) {
            console.error('Error loading balances:', e);
            setAlertState('error')
            setAlert(e.message || 'Failed to load accounting balances')
            setAlertTimeout(4000)
        } finally {
            if (balanceRequestRef.current === requestId) {
                setIsBalancesLoading(false);
            }
        }
    }

    // Flatten COA data for table — include headers, sub-headers and leaf accounts
    const flattenedAccounts = useMemo(() => {
        let accounts = [];
        
        coaData.forEach(section => {
            // Add the main header (e.g. Assets 10001)
            accounts.push({
                ...section,
                headerType: 'header',
                parentSection: 'Root',
                parentSectionId: null
            });

            if (section.accounts && Array.isArray(section.accounts)) {
                section.accounts.forEach(acc => {
                    if (!acc['g/l code']) return;
                    accounts.push({
                        ...acc,
                        parentSection:   section.name,
                        parentSectionId: section._id,
                        category: acc.category || section.category || 'N/A',
                        type:     acc.type     || section.type     || 'N/A',
                        headerType: acc['header-type'] || 'leaf'
                    });
                });
            }
        });

        // Calculate balances including range aggregation for headers
        const results = accounts.map(acc => {
            const isRange = acc.headerType === 'header' || acc.headerType === 'sub-header';
            let opening = 0, debit = 0, credit = 0, periodNet = 0, net = 0;

            if (isRange) {
                const start = Number(acc['begin-code'] || acc['g/l code']);
                const end   = Number(acc['end-code']   || start);
                
                // Sum all leaf accounts in balances that fall in this range
                Object.keys(balances).forEach(code => {
                    const c = Number(code);
                    if (c >= start && c <= end) {
                        const bal = balances[code] || {};
                        if (bal.rollupDetail || bal.rolledUpTo) return;
                        opening += (bal.openingDebit || 0) - (bal.openingCredit || 0);
                        debit += bal.periodDebit ?? bal.debit ?? 0;
                        credit += bal.periodCredit ?? bal.credit ?? 0;
                        periodNet += bal.periodNet ?? ((bal.periodDebit || 0) - (bal.periodCredit || 0));
                        net += bal.net || 0;
                    }
                });
            } else {
                const glKey = String(acc['g/l code']);
                const bal   = balances[glKey] || {};
                opening = (bal.openingDebit || 0) - (bal.openingCredit || 0);
                debit  = bal.periodDebit ?? bal.debit ?? 0;
                credit = bal.periodCredit ?? bal.credit ?? 0;
                periodNet = bal.periodNet ?? (debit - credit);
                net = bal.net ?? (opening + debit - credit);
            }
            const balanceMeta = balances[String(acc['g/l code'])] || {};

            return {
                ...acc,
                rollupDetail: Boolean(balanceMeta.rollupDetail || balanceMeta.rolledUpTo),
                rollupParent: Boolean(balanceMeta.rollupParent),
                rollupParentCode: balanceMeta.rolledUpTo || null,
                rollupParentName: balanceMeta.rolledUpToName || '',
                openingBalance: opening,
                debitBalance:  debit,
                creditBalance: credit,
                periodNetBalance: periodNet,
                netBalance:    net
            };
        });

        // Apply filters
        let filtered = results.filter(acc => {
            const matchesSearch = acc.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  String(acc['g/l code'])?.includes(searchTerm);
            const matchesCategory = filterCategory === 'All' || acc.category === filterCategory;
            const matchesType     = filterType     === 'All' || acc.type     === filterType;
            return matchesSearch && matchesCategory && matchesType;
        });

        // Handle Expand/Collapse Logic
        // We hide rows if their parent header/sub-header is collapsed
        let visibleRows = [];
        filtered.forEach(acc => {
            // Find parent header/sub-header if it's a leaf or sub-header
            let isHidden = false;
            if (acc.headerType === 'leaf' || acc.headerType === 'sub-header') {
                // Check if any range parent is collapsed
                coaData.forEach(root => {
                    const start = Number(root['begin-code']);
                    const end = Number(root['end-code']);
                    const code = Number(acc['g/l code']);
                    if (code >= start && code <= end && code !== Number(root['g/l code'])) {
                        if (collapsedHeaders.has(root['g/l code'])) isHidden = true;
                    }
                });
            }
            if (!isHidden) visibleRows.push(acc);
        });

        // Apply sorting to visible rows
        visibleRows.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            
            if (sortConfig.key === 'g/l code') {
                valA = a.rollupDetail && a.rollupParentCode ? Number(a.rollupParentCode) + (Number(a['g/l code'] || 0) / 100000000) : Number(valA || 0);
                valB = b.rollupDetail && b.rollupParentCode ? Number(b.rollupParentCode) + (Number(b['g/l code'] || 0) / 100000000) : Number(valB || 0);
            } else {
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return visibleRows;
    }, [coaData, searchTerm, filterCategory, filterType, balances, sortConfig, collapsedHeaders])

    const handleRequestSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const leafAccountOptions = useMemo(() => {
        const seen = new Set()
        return flattenedAccounts
            .filter((account) => account.headerType === 'leaf')
            .filter((account) => {
                const code = String(account['g/l code'])
                if (seen.has(code)) return false
                seen.add(code)
                return true
            })
            .map((account) => ({
                code: account['g/l code'],
                label: `${account['g/l code']} - ${account.name}`
            }))
    }, [flattenedAccounts])

    const updateMappingField = (moduleName, field, value) => {
        setAccountingMappings((prev) => ({
            ...prev,
            modules: {
                ...(prev?.modules || {}),
                [moduleName]: {
                    ...(prev?.modules?.[moduleName] || {}),
                    [field]: value
                }
            }
        }))
    }

    const updateMappingListField = (moduleName, listField, index, field, value) => {
        setAccountingMappings((prev) => {
            const list = [...(prev?.modules?.[moduleName]?.[listField] || [])]
            list[index] = {
                ...list[index],
                [field]: value
            }
            return {
                ...prev,
                modules: {
                    ...(prev?.modules || {}),
                    [moduleName]: {
                        ...(prev?.modules?.[moduleName] || {}),
                        [listField]: list
                    }
                }
            }
        })
    }

    const loadAccountingMappings = async () => {
        if (!company) return
        setIsMappingsLoading(true)
        try {
            const resp = await fetchServer("POST", {}, "getAccountingMappings", server)
            if (resp.err || !resp.ok) {
                throw new Error(resp.mess || 'Failed to load accounting mappings')
            }
            setAccountingMappings(resp.mappings || null)
            setShowMappingsModal(true)
        } catch (error) {
            setAlertState('error')
            setAlert(error.message || 'Failed to load accounting mappings')
            setAlertTimeout(4000)
        } finally {
            setIsMappingsLoading(false)
        }
    }

    const handleSaveAccountingMappings = async () => {
        if (!accountingMappings) return
        setIsMappingsSaving(true)
        try {
            const resp = await fetchServer("POST", {
                mappings: accountingMappings
            }, "updateAccountingMappings", server)
            if (resp.err || !resp.ok) {
                throw new Error(resp.mess || 'Failed to save accounting mappings')
            }
            setAccountingMappings(resp.mappings || accountingMappings)
            setAlertState('success')
            setAlert(resp.mess || 'Accounting mappings saved successfully!')
            setAlertTimeout(3000)
            setShowMappingsModal(false)
            // loadBalances(true)
            hydrateFullAccountingSnapshot(true).catch((error) => {
                console.error('Error refreshing accounting snapshot after saving mappings:', error)
            })
        } catch (error) {
            setAlertState('error')
            setAlert(error.message || 'Failed to save accounting mappings')
            setAlertTimeout(4000)
        } finally {
            setIsMappingsSaving(false)
        }
    }

    // ---- COA Logic ----
    const handleOpenCOAModal = (acc = null) => {
        if (acc) {
            setEditAcc(acc)
            setCoaForm({
                name: acc.name,
                'g/l code': acc['g/l code'],
                parentSectionId: acc.parentSectionId,
                category: acc.category,
                type: acc.type
            })
        } else {
            setEditAcc(null)
            setCoaForm({
                name: '',
                'g/l code': '',
                parentSectionId: coaData[0]?._id || '',
                category: 'Asset',
                type: 'Balance Sheet'
            })
        }
        setShowCOAModal(true)
    }

    const handleParentSectionChange = (e) => {
        const parentId = e.target.value;
        const parentSec = coaData.find(sec => sec._id === parentId);
        
        if (parentSec) {
            let maxCode = parentSec['begin-code'] || parentSec['g/l code'];
            if (parentSec.accounts && parentSec.accounts.length > 0) {
                maxCode = Math.max(...parentSec.accounts.map(a => Number(a['g/l code'])));
            }
            
            setCoaForm(prev => ({
                ...prev,
                parentSectionId: parentId,
                category: parentSec.category || 'Asset',
                type: parentSec.type || 'Balance Sheet',
                'g/l code': maxCode + 10
            }));
        } else {
            setCoaForm(prev => ({ ...prev, parentSectionId: parentId }));
        }
    }

    const handleSaveCOA = async () => {
        if (!coaForm.name || !coaForm['g/l code'] || !coaForm.parentSectionId) {
            setAlertState('error')
            setAlert('Please fill out all required fields (Name, G/L Code, Parent Section).')
            setAlertTimeout(3000)
            return
        }

        setIsSaving(true)
        try {
            const sectionToUpdate = coaData.find(sec => sec._id === coaForm.parentSectionId);
            if (!sectionToUpdate) throw new Error("Section not found");

            const { _id, ...sectionWithoutId } = sectionToUpdate;
            const updatedSection = { ...sectionWithoutId, accounts: [...(sectionToUpdate.accounts || [])] };
            
            const accPayload = {
                "g/l code": Number(coaForm['g/l code']),
                name: coaForm.name,
                category: coaForm.category,
                type: coaForm.type,
                "header-code": sectionToUpdate["g/l code"]
            };

            if (editAcc) {
                const accIndex = updatedSection.accounts.findIndex(a => Number(a['g/l code']) === Number(editAcc['g/l code']));
                if (accIndex !== -1) {
                    updatedSection.accounts[accIndex] = accPayload;
                } else {
                    updatedSection.accounts.push(accPayload);
                }
            } else {
                updatedSection.accounts.push(accPayload);
            }

            const resp = await fetchServer("POST", {
                database: company,
                collection: "ChartOfAccounts",
                prop: [{ name: sectionToUpdate.name }, updatedSection]
            }, "updateOneDoc", server);

            if (resp.err) {
                throw new Error(resp.mess || "Failed to update Chart of Accounts");
            }

            setAlertState('success')
            setAlert('Account saved successfully!')
            setAlertTimeout(3000)
            setShowCOAModal(false)
            loadCOA()
        } catch (e) {
            setAlertState('error')
            setAlert(e.message || "An error occurred")
            setAlertTimeout(3000)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteCOA = async (acc) => {
        if (!window.confirm(`Are you sure you want to delete ${acc.name}?`)) return;
        
        setIsSaving(true)
        try {
            const sectionToUpdate = coaData.find(sec => sec._id === acc.parentSectionId);
            if (!sectionToUpdate) throw new Error("Section not found");

            const { _id, ...sectionWithoutId } = sectionToUpdate;
            const updatedSection = { 
                ...sectionWithoutId, 
                accounts: sectionToUpdate.accounts.filter(a => Number(a['g/l code']) !== Number(acc['g/l code'])) 
            };
            
            const resp = await fetchServer("POST", {
                database: company,
                collection: "ChartOfAccounts",
                prop: [{ name: sectionToUpdate.name }, updatedSection]
            }, "updateOneDoc", server);

            if (resp.err) {
                throw new Error(resp.mess || "Failed to update Chart of Accounts");
            }

            setAlertState('success')
            setAlert('Account deleted successfully!')
            setAlertTimeout(3000)
            loadCOA()
        } catch (e) {
            setAlertState('error')
            setAlert(e.message || "An error occurred")
            setAlertTimeout(3000)
        } finally {
            setIsSaving(false)
        }
    }

    const handleOpenDrillDown = async (acc, side) => {
        const glCode = String(acc['g/l code'])
        setDrillDown({ glCode, accountName: acc.name, side });
        if (rawLedger?.[glCode]) return

        setIsDrillDownLoading(true)
        try {
            const resp = await fetchServer("POST", {
                fromDate,
                toDate,
                accountCode: glCode,
                filters: { accountCode: Number(glCode) },
                includeRawLedger: true
            }, "accounting/account-ledger", server)

            if (resp.err || !resp.ok) {
                throw new Error(resp.mess || 'Failed to load account ledger')
            }

            setRawLedger((prev) => ({
                ...(prev || {}),
                [glCode]: Array.isArray(resp.ledger) ? resp.ledger : []
            }))
            // setDrillDown((prev) => prev?.glCode === glCode ? {
            //     ...prev,
            //     balance: resp.balance || null,
            //     openingBaseClosingDate: resp.meta?.openingBaseClosingDate || resp.meta?.openingBaseClosing?.closingDate || null,
            // } : prev)
        } catch (error) {
            setAlertState('error')
            setAlert(error.message || 'Failed to load account ledger')
            setAlertTimeout(4000)
        } finally {
            setIsDrillDownLoading(false)
        }
    }

    const handleClearCache = async () => {
        if (!company || !companyRecord) return;
        const userId = companyRecord?.emailid || 'admin';
        
        setAlertState('info');
        setAlert('Clearing local cache...');
        
        try {
            // 1. Clear COA cache
            await setAppCache(company, userId, 'chartOfAccounts', null);
            
            // 2. Clear current period balances cache
            const balCacheKey = `journal-balances-v${ACCOUNTING_UI_CACHE_VERSION}-${fromDate}-${toDate}`;
            const ledCacheKey = `journal-ledger-v${ACCOUNTING_UI_CACHE_VERSION}-${fromDate}-${toDate}`;
            const snapshotCacheKey = `journal-snapshot-v${ACCOUNTING_UI_CACHE_VERSION}-${fromDate}-${toDate}`;
            await setAppCache(company, userId, balCacheKey, null);
            await setAppCache(company, userId, ledCacheKey, null);
            await setAppCache(company, userId, snapshotCacheKey, null);
            
            setAlertState('success');
            setAlert('Cache cleared! Force reloading fresh data...');
            setAlertTimeout(3000);
            
            // 3. Clear local states to force the UI to show the full-page loader on fresh load
            setBalances({});
            setAccountingSnapshotMeta(null);
            setRawLedger({});
            setReportData({
                trialBalance: { rows: [], totals: { debit: 0, credit: 0, openingBalance: 0, net: 0 } },
                profitLoss: {
                    revenue: [],
                    costOfSales: [],
                    expenses: [],
                    totals: { revenue: 0, costOfSales: 0, grossProfit: 0, expenses: 0, netIncome: 0 }
                },
                balanceSheet: {
                    assets: [],
                    liabilities: [],
                    equity: [],
                    totals: { assets: 0, liabilities: 0, equity: 0, liabilitiesAndEquity: 0 }
                }
            });
            
            // 4. Trigger fresh load
            loadCOA();
            hydrateFullAccountingSnapshot(true);
        } catch (error) {
            console.error('Error clearing cache:', error);
            setAlertState('error');
            setAlert('Failed to clear cache');
        }
    };

    const handleInitializeCOA = async () => {
        // Show progress dialog immediately (no window.confirm)
        setInitProgress({ steps: [{ label: 'Connecting to server...', status: 'pending' }], done: false });
        setIsSaving(true);
        try {
            const addStep = (label, status = 'pending') =>
                setInitProgress(prev => prev ? { ...prev, steps: [...prev.steps, { label, status }] } : prev);
            const completeStep = (label, status = 'success') =>
                setInitProgress(prev => prev ? {
                    ...prev,
                    steps: prev.steps.map(s => s.label === label ? { ...s, status } : s)
                } : prev);

            completeStep('Connecting to server...', 'success');
            addStep('Sending initialization request to backend...');

            const resp = await fetchServer("POST", {}, "initializeChartOfAccounts", server);

            completeStep('Sending initialization request to backend...', resp.ok ? 'success' : 'error');

            if (!resp.ok) throw new Error(resp.mess || 'Failed to initialize');

            // Show per-section results if server returned details
            const sections = [
                'Assets','Liabilities','Equity','Revenue','Expenses','Cost of Goods Sold'
            ];
            sections.forEach(s => addStep(`Checking: ${s}`, 'success'));

            addStep(`✔ ${resp.insertedSections} section(s) added, ${resp.insertedAccounts} account(s) merged.`, 'success');

            setInitProgress(prev => prev ? { ...prev, done: true, summary: resp.mess } : prev);
            loadCOA();
            hydrateFullAccountingSnapshot(true).catch((error) => {
                console.error('Error loading accounting snapshot after initialization:', error);
            });
        } catch (e) {
            setInitProgress(prev => prev ? {
                ...prev,
                done: true,
                error: e.message || 'Initialization failed'
            } : prev);
        } finally {
            setIsSaving(false);
        }
    }

    const renderDrillDown = () => {
        if (!drillDown) return null;
        const rows = rawLedger[drillDown.glCode] || [];
        const filtered = drillDown.side === 'net' ? rows : rows.filter(r => r._side === drillDown.side);
        const totalD = filtered.reduce((s, r) => s + (r.debit  || 0), 0);
        const totalC = filtered.reduce((s, r) => s + (r.credit || 0), 0);
        const fmtAmt = (n) => n ? n.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-';
        const fmtDate = (d) => d ? new Date(Number(d) || d).toLocaleDateString() : '-';
        const sideLabel = drillDown.side === 'net' ? 'All' : drillDown.side === 'debit' ? 'Debit' : 'Credit';
        const balanceHint = drillDown.balance
            ? `Balance: debit ${fmtAmt(drillDown.balance.debit)} / credit ${fmtAmt(drillDown.balance.credit)} / net ${fmtAmt(drillDown.balance.net)}`
            : '';

        return (
            <div className="journals-modal-overlay" style={getModalOverlayStyle()} onClick={() => setDrillDown(null)}>
                <div className="journals-modal modal-large dd-modal" onClick={e => e.stopPropagation()}>
                    <div className="journals-modal-header">
                        <div>
                            <h2>Ledger Drill-Down</h2>
                            <p className="dd-subtitle">G/L {drillDown.glCode} &mdash; {drillDown.accountName} &mdash; <span className="dd-side-label">{sideLabel}</span></p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button className="j-btn-secondary" onClick={() => exportDrillDownToExcel(drillDown.glCode)} disabled={(rawLedger?.[drillDown.glCode] || []).length === 0} title="Export ledger to Excel"><FaFileExcel /></button>
                            <button className="j-btn-secondary" onClick={() => exportDrillDownToPDF(drillDown.glCode)} disabled={(rawLedger?.[drillDown.glCode] || []).length === 0} title="Export ledger to PDF"><MdPictureAsPdf /></button>
                            <button className="journals-modal-close" onClick={() => setDrillDown(null)}><MdClose /></button>
                        </div>
                    </div>
                    <div className="journals-modal-body dd-body">
                        {isDrillDownLoading ? (
                            <div className="dd-empty">Loading ledger entries...</div>
                        ) : filtered.length === 0 ? (
                            <div className="dd-empty">
                                <strong>No period ledger lines found for this account/filter.</strong>
                                {balanceHint && <span>{balanceHint}</span>}
                                {drillDown.openingBaseClosingDate && (
                                    <span>This balance may include opening values from the stored closing on {drillDown.openingBaseClosingDate}.</span>
                                )}
                            </div>
                        ) : (
                            <table className="dd-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Source</th>
                                        <th>Document Type</th>
                                        <th>Entry Type</th>
                                        <th>Handler Id</th>
                                        <th className="num-col">Debit</th>
                                        <th className="num-col">Credit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((r, i) => (
                                        <tr key={i}>
                                            <td className="dd-date">{fmtDate(r.date)}</td>
                                            <td className="dd-desc">{r.desc}</td>
                                            <td><span className={`dd-source-badge src-${(r.source||'').toLowerCase()}`}>{r.source}</span></td>
                                            <td className="dd-doctype">{r.documentType || ''}</td>
                                            <td className="dd-entrytype">{r.entryType || ''}</td>
                                            <td className="dd-handler">{r.handlerId || ''}</td>
                                            <td className="num-col dd-debit">{fmtAmt(r.debit)}</td>
                                            <td className="num-col dd-credit">{fmtAmt(r.credit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="dd-totals">
                                        <td colSpan="6"><strong>Totals ({filtered.length} transactions)</strong></td>
                                        <td className="num-col" style={{ color: '#1d4ed8', fontWeight: 700 }}>{fmtAmt(totalD)}</td>
                                        <td className="num-col" style={{ color: '#7c3aed', fontWeight: 700 }}>{fmtAmt(totalC)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>
                </div>

                {/* closing-panel moved to header for consistent placement */}
            </div>
        );
    }

    const renderInitProgress = () => {
        if (!initProgress) return null;
        return (
            <div className="journals-modal-overlay" style={getModalOverlayStyle()}>
                <div className="journals-modal init-modal">
                    <div className="journals-modal-header">
                        <h2>Initializing Chart of Accounts</h2>
                    </div>
                    <div className="journals-modal-body">
                        <div className="init-steps">
                            {initProgress.steps.map((s, i) => (
                                <div key={i} className={`init-step step-${s.status}`}>
                                    <span className="init-step-icon">
                                        {s.status === 'success' ? '✔' : s.status === 'error' ? '✘' : '⏳'}
                                    </span>
                                    <span className="init-step-label">{s.label}</span>
                                </div>
                            ))}
                        </div>
                        {!initProgress.done && (
                            <div className="init-progress-bar">
                                <div className="init-progress-fill" />
                            </div>
                        )}
                        {initProgress.done && !initProgress.error && (
                            <div className="init-done-msg success">
                                <strong>Done!</strong> {initProgress.summary}
                            </div>
                        )}
                        {initProgress.done && initProgress.error && (
                            <div className="init-done-msg error">
                                <strong>Error:</strong> {initProgress.error}
                            </div>
                        )}
                    </div>
                    {initProgress.done && (
                        <div className="journals-modal-footer">
                            <button className="j-btn-primary" onClick={() => setInitProgress(null)}>Close</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const renderPendingModal = () => {
        if (!showPendingModal) return null;
        return (
            <div className="journals-modal-overlay" style={getModalOverlayStyle()}>
                <div className="journals-modal">
                    <div className="journals-modal-header">
                        <h3>Pending Closing Recomputes</h3>
                        <button className="link-like" onClick={() => setShowPendingModal(false)}>Close</button>
                    </div>
                    <div className="journals-modal-body">
                        {isClosingLoading ? <div>Loading...</div> : (
                            <table className="pending-table">
                                <thead><tr><th>Closing Date</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {pendingClosings.map(p => (
                                        <tr key={p.closingDate}>
                                            <td>{p.closingDate}</td>
                                            <td>{p.status}</td>
                                            <td>
                                                <button className="btn" onClick={() => handleProcessPendingItem(p.closingDate)}>Recompute</button>
                                                <button className="btn" onClick={() => handleViewAudit(p.closingDate)}>Audit</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const renderClosingsModal = () => {
        if (!showClosingsModal) return null
        const fmtClosing = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        const summarizeClosing = (closing) => {
            const rows = Object.values(closing?.balances || {}).filter((row) => !row?.rollupDetail)
            const debit = rows.reduce((sum, row) => sum + Number(row?.debit || 0), 0)
            const credit = rows.reduce((sum, row) => sum + Number(row?.credit || 0), 0)
            const rawLedgerAccounts = Object.keys(closing?.rawLedger || {}).length
            return {
                debit,
                credit,
                net: debit - credit,
                accounts: rows.length,
                rawLedgerAccounts,
            }
        }

        return (
            <div className="journals-modal-overlay" style={getModalOverlayStyle()} onClick={() => setShowClosingsModal(false)}>
                <div className="journals-modal modal-large closing-list-modal" onClick={(event) => event.stopPropagation()}>
                    <div className="journals-modal-header">
                        <div>
                            <h3>Monthly Closing Builds</h3>
                            <p className="dd-subtitle">Review every saved month-end snapshot, lock completed months, and rebuild draft months when source records change.</p>
                        </div>
                        <button className="journals-modal-close" onClick={() => setShowClosingsModal(false)}><MdClose /></button>
                    </div>
                    <div className="journals-modal-body">
                        <div className="closing-list-actions">
                            <button className="j-btn-secondary" onClick={loadMonthlyClosings} disabled={isClosingLoading}>Refresh List</button>
                            <button className="j-btn-primary" onClick={() => handleBuildMissingMonthlyClosings(false)} disabled={isClosingAction}>Build Missing Months</button>
                            <button className="j-btn-secondary" onClick={() => handleBuildMissingMonthlyClosings(true)} disabled={isClosingAction} title="Stores raw ledger traces inside each closing snapshot. Heavier, but useful for audit months.">Build Missing with Ledgers</button>
                        </div>
                        {isClosingLoading ? (
                            <div className="closing-loading">Loading monthly closing builds...</div>
                        ) : (
                            <div className="analysis-table-wrapper">
                                <table className="analysis-table closing-list-table">
                                    <thead>
                                        <tr>
                                            <th>Month End</th>
                                            <th>Status</th>
                                            <th>Computed Range</th>
                                            <th className="num-col">Debit</th>
                                            <th className="num-col">Credit</th>
                                            <th className="num-col">Net</th>
                                            <th>Snapshot</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlyClosings.length ? monthlyClosings.map((closing) => {
                                            const summary = summarizeClosing(closing)
                                            return (
                                                <tr key={closing.closingDate}>
                                                    <td>{closing.closingDate}</td>
                                                    <td><span className={`closing-status-pill ${closing.status || 'draft'}`}>{closing.status || 'draft'}</span></td>
                                                    <td>{closing.computedFrom || 'N/A'} to {closing.computedTo || 'N/A'}</td>
                                                    <td className="num-col">{fmtClosing(summary.debit)}</td>
                                                    <td className="num-col">{fmtClosing(summary.credit)}</td>
                                                    <td className={`num-col ${Math.abs(summary.net) < 0.01 ? 'text-success' : 'text-danger'}`}>{fmtClosing(summary.net)}</td>
                                                    <td>{summary.accounts} accounts, {summary.rawLedgerAccounts ? `${summary.rawLedgerAccounts} ledger groups` : 'no raw ledger'}</td>
                                                    <td className="closing-row-actions">
                                                        <button className="j-btn-secondary btn-sm" onClick={() => { setLastClosingDetails(closing); setShowClosingDetailsModal(true); }}>View</button>
                                                        {closing.status !== 'confirmed' && closing.status !== 'locked' && (
                                                            <button className="j-btn-secondary btn-sm" onClick={() => handleSetClosingStatus('confirmed', closing.closingDate)} disabled={isClosingAction}>Confirm</button>
                                                        )}
                                                        {closing.status !== 'locked' && (
                                                            <button className="j-btn-danger btn-sm" onClick={() => handleSetClosingStatus('locked', closing.closingDate)} disabled={isClosingAction}>Lock</button>
                                                        )}
                                                        {closing.status !== 'locked' && (
                                                            <button className="j-btn-secondary btn-sm" onClick={() => handleRecomputeClosing(closing.closingDate, false)} disabled={isClosingAction}>Rebuild</button>
                                                        )}
                                                        {closing.status !== 'locked' && (
                                                            <button className="j-btn-secondary btn-sm" onClick={() => handleRecomputeClosing(closing.closingDate, true)} disabled={isClosingAction}>Rebuild + Ledgers</button>
                                                        )}
                                                        <button className="j-btn-secondary btn-sm" onClick={() => handleViewAudit(closing.closingDate)}>Audit</button>
                                                    </td>
                                                </tr>
                                            )
                                        }) : (
                                            <tr>
                                                <td colSpan="8" className="empty-row">No monthly closings have been built yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const renderClosingDetailsModal = () => {
        if (!showClosingDetailsModal || !lastClosingDetails) return null;
        const closingBalances = lastClosingDetails.balances || {}
        const rows = Object.entries(closingBalances)
            .map(([code, values]) => {
                const account = flattenedAccounts.find((item) => String(item['g/l code']) === String(code))
                return {
                    code,
                    name: account?.name || `Account ${code}`,
                    debit: Number(values?.debit || 0),
                    credit: Number(values?.credit || 0),
                }
            })
            .sort((first, second) => Number(first.code) - Number(second.code))

        return (
            <div className="journals-modal-overlay" style={getModalOverlayStyle()} onClick={() => setShowClosingDetailsModal(false)}>
                <div className="journals-modal modal-large" onClick={(event) => event.stopPropagation()}>
                    <div className="journals-modal-header">
                        <div>
                            <h3>Closing Details</h3>
                            <p className="dd-subtitle">Closing date: {lastClosingDetails.closingDate}</p>
                        </div>
                        <button className="journals-modal-close" onClick={() => setShowClosingDetailsModal(false)}><MdClose /></button>
                    </div>
                    <div className="journals-modal-body">
                        <div className="coa-info-grid" style={{ marginBottom: '18px' }}>
                            <div className="coa-info-card">
                                <span className="coa-info-label">Status</span>
                                <strong>{lastClosingDetails.status || 'draft'}</strong>
                            </div>
                            <div className="coa-info-card">
                                <span className="coa-info-label">Computed From</span>
                                <strong>{lastClosingDetails.computedFrom || 'N/A'}</strong>
                            </div>
                            <div className="coa-info-card">
                                <span className="coa-info-label">Computed To</span>
                                <strong>{lastClosingDetails.computedTo || 'N/A'}</strong>
                            </div>
                            <div className="coa-info-card">
                                <span className="coa-info-label">Accounts Captured</span>
                                <strong>{rows.length}</strong>
                            </div>
                        </div>

                        <div className="coa-table-wrapper">
                            <table className="coa-table">
                                <thead>
                                    <tr>
                                        <th>G/L Code</th>
                                        <th>Account</th>
                                        <th className="num-col">Debit</th>
                                        <th className="num-col">Credit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length ? rows.map((row) => (
                                        <tr key={`closing-${row.code}`}>
                                            <td>{row.code}</td>
                                            <td>{row.name}</td>
                                            <td className="num-col">{row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="num-col">{row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="empty-row">No balances were stored for this closing.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const renderAuditModal = () => {
        if (!showAuditModal) return null;
        return (
            <div className="journals-modal-overlay" style={getModalOverlayStyle()}>
                <div className="journals-modal">
                    <div className="journals-modal-header">
                        <h3>Closing Audit</h3>
                        <button className="link-like" onClick={() => setShowAuditModal(false)}>Close</button>
                    </div>
                    <div className="journals-modal-body">
                        {isClosingLoading ? <div>Loading...</div> : (
                            <div>
                                {auditEntries.map(a => (
                                    <div key={a._id} className="audit-row">
                                        <div><strong>{a.action}</strong> by {a.actor?.id} at {new Date(a.when).toLocaleString()}</div>
                                        <div>{JSON.stringify(a.details)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const renderMappingSelect = (value, onChange, label) => (
        <div className="j-form-group" style={{ minWidth: '220px' }}>
            <label>{label}</label>
            <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
                <option value="">Select G/L account</option>
                {leafAccountOptions.map((option) => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                ))}
            </select>
        </div>
    )

    const renderMappingsModal = () => {
        if (!showMappingsModal) return null

        const modules = accountingMappings?.modules || {}
        const simpleCardStyle = { border: '1px solid #dbe3f5', borderRadius: '16px', padding: '16px', marginBottom: '16px', background: '#f8fbff' }
        const listTableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '12px' }

        const renderListMapping = (title, rows = [], onChange, field = 'accountCode') => (
            <div style={simpleCardStyle}>
                <h3 style={{ margin: '0 0 12px 0' }}>{title}</h3>
                <table style={listTableStyle}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Section</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Linked G/L Account</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={`${title}-${row.key}-${index}`}>
                                <td style={{ padding: '8px', borderTop: '1px solid #e5e7eb' }}>{row.label || row.key}</td>
                                <td style={{ padding: '8px', borderTop: '1px solid #e5e7eb' }}>
                                    <select
                                        className='forminp'
                                        value={row[field] || ''}
                                        onChange={(e) => onChange(index, e.target.value)}
                                    >
                                        <option value="">Select G/L account</option>
                                        {leafAccountOptions.map((option) => (
                                            <option key={option.code} value={option.code}>{option.label}</option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )

        return (
            <div className="journals-modal-overlay" style={getModalOverlayStyle()} onClick={() => !isMappingsSaving && setShowMappingsModal(false)}>
                <div className="journals-modal modal-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px' }}>
                    <div className="journals-modal-header">
                        <div>
                            <h2>Operation to G/L Links</h2>
                            <p style={{ margin: '4px 0 0', color: '#64748b' }}>
                                Configure the G/L accounts each operational section should affect. Existing mappings stay intact unless you change them.
                            </p>
                        </div>
                        <button className="journals-modal-close" onClick={() => setShowMappingsModal(false)}><MdClose /></button>
                    </div>
                    <div className="journals-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <div style={simpleCardStyle}>
                            <h3 style={{ margin: '0 0 12px 0' }}>Orders</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {renderMappingSelect(modules.orders?.revenueAccount, (value) => updateMappingField('orders', 'revenueAccount', value), 'Revenue Account')}
                                {renderMappingSelect(modules.orders?.receivableAccount, (value) => updateMappingField('orders', 'receivableAccount', value), 'Receivable Account')}
                            </div>
                        </div>

                        <div style={simpleCardStyle}>
                            <h3 style={{ margin: '0 0 12px 0' }}>Inventory and Costing</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {renderMappingSelect(modules.inventory?.inventoryAccount, (value) => updateMappingField('inventory', 'inventoryAccount', value), 'Inventory Account')}
                                {renderMappingSelect(modules.inventory?.payableAccount, (value) => updateMappingField('inventory', 'payableAccount', value), 'Inventory Payable')}
                                {renderMappingSelect(modules.inventory?.costOfSalesAccount, (value) => updateMappingField('inventory', 'costOfSalesAccount', value), 'Cost of Sales')}
                                {renderMappingSelect(modules.inventory?.adjustmentAccount, (value) => updateMappingField('inventory', 'adjustmentAccount', value), 'Adjustment Account')}
                            </div>
                        </div>

                        <div style={simpleCardStyle}>
                            <h3 style={{ margin: '0 0 12px 0' }}>Direct Purchase</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {renderMappingSelect(modules.purchase?.directExpenseAccount, (value) => updateMappingField('purchase', 'directExpenseAccount', value), 'Default Purchase Account')}
                                {renderMappingSelect(modules.purchase?.payableAccount, (value) => updateMappingField('purchase', 'payableAccount', value), 'Purchase Payable')}
                            </div>
                        </div>

                        {renderListMapping('Purchase Categories', modules.purchase?.categoryMappings || [], (index, value) => updateMappingListField('purchase', 'categoryMappings', index, 'accountCode', value))}
                        {renderListMapping('Expense Categories', modules.expenses?.categoryMappings || [], (index, value) => updateMappingListField('expenses', 'categoryMappings', index, 'accountCode', value))}

                        <div style={simpleCardStyle}>
                            <h3 style={{ margin: '0 0 12px 0' }}>Sales and Recovery</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {renderMappingSelect(modules.sales?.productRevenueAccount, (value) => updateMappingField('sales', 'productRevenueAccount', value), 'Product Revenue')}
                                {renderMappingSelect(modules.sales?.serviceRevenueAccount, (value) => updateMappingField('sales', 'serviceRevenueAccount', value), 'Service Revenue')}
                                {renderMappingSelect(modules.sales?.employeeReceivableAccount, (value) => updateMappingField('sales', 'employeeReceivableAccount', value), 'Employee Receivable')}
                                {renderMappingSelect(modules.sales?.salaryPayableAccount, (value) => updateMappingField('sales', 'salaryPayableAccount', value), 'Salary Payable')}
                            </div>
                        </div>

                        {renderListMapping('Sales Points', modules.sales?.salesPointMappings || [], (index, value) => updateMappingListField('sales', 'salesPointMappings', index, 'revenueAccount', value), 'revenueAccount')}

                        <div style={simpleCardStyle}>
                            <h3 style={{ margin: '0 0 12px 0' }}>Accommodation</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {renderMappingSelect(modules.accommodations?.revenueAccount, (value) => updateMappingField('accommodations', 'revenueAccount', value), 'Default Revenue')}
                                {renderMappingSelect(modules.accommodations?.receivableAccount, (value) => updateMappingField('accommodations', 'receivableAccount', value), 'Receivable Account')}
                            </div>
                        </div>

                        {renderListMapping('Accommodation Rooms', modules.accommodations?.roomMappings || [], (index, value) => updateMappingListField('accommodations', 'roomMappings', index, 'revenueAccount', value), 'revenueAccount')}

                        <div style={simpleCardStyle}>
                            <h3 style={{ margin: '0 0 12px 0' }}>Rentals</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {renderMappingSelect(modules.rentals?.revenueAccount, (value) => updateMappingField('rentals', 'revenueAccount', value), 'Default Revenue')}
                                {renderMappingSelect(modules.rentals?.receivableAccount, (value) => updateMappingField('rentals', 'receivableAccount', value), 'Receivable Account')}
                            </div>
                        </div>

                        {renderListMapping('Rental Spaces', modules.rentals?.spaceMappings || [], (index, value) => updateMappingListField('rentals', 'spaceMappings', index, 'revenueAccount', value), 'revenueAccount')}

                        <div style={simpleCardStyle}>
                            <h3 style={{ margin: '0 0 12px 0' }}>Payroll</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {renderMappingSelect(modules.payroll?.salaryExpenseAccount, (value) => updateMappingField('payroll', 'salaryExpenseAccount', value), 'Salary Expense')}
                                {renderMappingSelect(modules.payroll?.salaryPayableAccount, (value) => updateMappingField('payroll', 'salaryPayableAccount', value), 'Salary Payable')}
                                {renderMappingSelect(modules.payroll?.employeeReceivableAccount, (value) => updateMappingField('payroll', 'employeeReceivableAccount', value), 'Employee Receivable')}
                            </div>
                        </div>

                        {renderListMapping('Payment Methods', modules.paymentMethods || [], (index, value) => {
                            setAccountingMappings((prev) => {
                                const list = [...(prev?.modules?.paymentMethods || [])]
                                list[index] = { ...list[index], accountCode: value }
                                return { ...prev, modules: { ...(prev?.modules || {}), paymentMethods: list } }
                            })
                        })}
                    </div>
                    <div className="journals-modal-footer">
                        <button className="j-btn-secondary" onClick={() => setShowMappingsModal(false)} disabled={isMappingsSaving}>Cancel</button>
                        <button className="j-btn-primary" onClick={handleSaveAccountingMappings} disabled={isMappingsSaving}>
                            {isMappingsSaving ? 'Saving...' : 'Save Links'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ---- Journal Logic ----
    const handleAddJournalLine = () => {
        setJournalForm(prev => ({
            ...prev,
            lines: [...prev.lines, { accountCode: '', accountName: '', debit: 0, credit: 0 }]
        }))
    }

    const handleRemoveJournalLine = (index) => {
        setJournalForm(prev => ({
            ...prev,
            lines: prev.lines.filter((_, i) => i !== index)
        }))
    }

    const handleJournalLineChange = (index, field, value) => {
        setJournalForm(prev => {
            const newLines = [...prev.lines];
            newLines[index][field] = value;
            if (field === 'accountCode') {
                const acc = flattenedAccounts.find(a => String(a['g/l code']) === String(value));
                if (acc) newLines[index].accountName = acc.name;
            }
            return { ...prev, lines: newLines };
        })
    }

    const handleSaveJournal = async () => {
        // Validate Debits == Credits
        let totalDebit = 0;
        let totalCredit = 0;
        journalForm.lines.forEach(l => {
            totalDebit += Number(l.debit) || 0;
            totalCredit += Number(l.credit) || 0;
        })

        if (totalDebit !== totalCredit) {
            setAlertState('error')
            setAlert(`Total Debits (${totalDebit}) must equal Total Credits (${totalCredit})`)
            setAlertTimeout(4000)
            return;
        }

        if (totalDebit === 0) {
            setAlertState('error')
            setAlert('Journal entry must have a non-zero amount.')
            setAlertTimeout(3000)
            return;
        }

        setIsSaving(true)
        try {
            const payload = {
                ...journalForm,
                totalAmount: totalDebit,
                createdAt: Date.now(),
                handlerId: companyRecord?.emailid
            }

            const resp = await fetchServer("POST", payload, "createGeneralLedgerEntry", server);

            if (resp.err || !resp.ok) {
                throw new Error(resp.mess || "Failed to save Journal Entry");
            }

            setAlertState('success')
            setAlert('Journal Entry posted successfully!')
            setAlertTimeout(3000)
            setShowJournalModal(false)
            setJournalForm({
                postingDate: new Date().toISOString().split('T')[0],
                reference: '',
                notes: '',
                lines: [
                    { accountCode: '', accountName: '', debit: 0, credit: 0 },
                    { accountCode: '', accountName: '', debit: 0, credit: 0 }
                ]
            })
            hydrateFullAccountingSnapshot(true).catch((error) => {
                console.error('Error refreshing accounting snapshot after saving journal entry:', error);
            });
        } catch (e) {
            setAlertState('error')
            setAlert(e.message || "An error occurred")
            setAlertTimeout(3000)
        } finally {
            setIsSaving(false)
        }
    }

    const renderCOAModal = () => {
        if (!showCOAModal) return null;
        return (
            <div className="journals-modal-overlay" style={getModalOverlayStyle()}>
                <div className="journals-modal fade-in">
                    <div className="journals-modal-header">
                        <h2>{editAcc ? 'Edit Account' : 'Create New Account'}</h2>
                        <button className="journals-modal-close" onClick={() => setShowCOAModal(false)}>×</button>
                    </div>
                    <div className="journals-modal-body">
                        <div className="j-form-group">
                            <label>Parent Section</label>
                            <select 
                                value={coaForm.parentSectionId} 
                                onChange={handleParentSectionChange}
                            >
                                <option value="">Select Parent Section</option>
                                {coaData.map(sec => (
                                    <option key={sec._id} value={sec._id}>{sec['g/l code']} - {sec.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="j-form-row">
                            <div className="j-form-group">
                                <label>G/L Code</label>
                                <input 
                                    type="number" 
                                    value={coaForm['g/l code']} 
                                    onChange={(e) => setCoaForm({...coaForm, 'g/l code': e.target.value})}
                                />
                            </div>
                            <div className="j-form-group flex-2">
                                <label>Account Name</label>
                                <input 
                                    type="text" 
                                    value={coaForm.name} 
                                    onChange={(e) => setCoaForm({...coaForm, name: e.target.value})}
                                    placeholder="e.g. Office Supplies"
                                />
                            </div>
                        </div>
                        <div className="j-form-row">
                            <div className="j-form-group">
                                <label>Category</label>
                                <select 
                                    value={coaForm.category} 
                                    onChange={(e) => setCoaForm({...coaForm, category: e.target.value})}
                                    disabled
                                >
                                    <option value="Asset">Asset</option>
                                    <option value="Liability">Liability</option>
                                    <option value="Equity">Equity</option>
                                    <option value="Revenue">Revenue</option>
                                    <option value="Expense">Expense</option>
                                </select>
                            </div>
                            <div className="j-form-group">
                                <label>Statement Type</label>
                                <select 
                                    value={coaForm.type} 
                                    onChange={(e) => setCoaForm({...coaForm, type: e.target.value})}
                                    disabled
                                >
                                    <option value="Balance Sheet">Balance Sheet</option>
                                    <option value="Income Statement">Income Statement</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="journals-modal-footer">
                        <button className="j-btn-secondary" onClick={() => setShowCOAModal(false)}>Cancel</button>
                        <button className="j-btn-primary" onClick={handleSaveCOA} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Account'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const renderJournalModal = () => {
        if (!showJournalModal) return null;
        let tDebit = 0, tCredit = 0;
        journalForm.lines.forEach(l => {
            tDebit += Number(l.debit) || 0;
            tCredit += Number(l.credit) || 0;
        });

        return (
            <div className="journals-modal-overlay" style={getModalOverlayStyle()}>
                <div className="journals-modal modal-large fade-in">
                    <div className="journals-modal-header">
                        <h2>Create Journal Entry</h2>
                        <button className="journals-modal-close" onClick={() => setShowJournalModal(false)}>×</button>
                    </div>
                    <div className="journals-modal-body">
                        <div className="j-form-row">
                            <div className="j-form-group">
                                <label>Date</label>
                                <input 
                                    type="date" 
                                    value={journalForm.postingDate} 
                                    onChange={(e) => setJournalForm({...journalForm, postingDate: e.target.value})}
                                />
                            </div>
                            <div className="j-form-group">
                                <label>Reference #</label>
                                <input 
                                    type="text" 
                                    value={journalForm.reference} 
                                    onChange={(e) => setJournalForm({...journalForm, reference: e.target.value})}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                        <div className="j-form-group">
                            <label>Description / Notes</label>
                            <input 
                                type="text" 
                                value={journalForm.notes} 
                                onChange={(e) => setJournalForm({...journalForm, notes: e.target.value})}
                                placeholder="Purpose of entry"
                            />
                        </div>

                        <div className="j-lines-table">
                            <div className="j-lines-header">
                                <div className="jl-acc">Account</div>
                                <div className="jl-amt">Debit</div>
                                <div className="jl-amt">Credit</div>
                                <div className="jl-act"></div>
                            </div>
                            {journalForm.lines.map((line, idx) => (
                                <div className="j-line-row" key={idx}>
                                    <div className="jl-acc">
                                        <select 
                                            value={line.accountCode} 
                                            onChange={(e) => handleJournalLineChange(idx, 'accountCode', e.target.value)}
                                        >
                                            <option value="">Select Account</option>
                                            {flattenedAccounts.filter(a => a.headerType === 'leaf').map(a => (
                                                <option key={a['g/l code']} value={a['g/l code']}>
                                                    {a['g/l code']} - {a.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="jl-amt">
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={line.debit || ''} 
                                            onChange={(e) => handleJournalLineChange(idx, 'debit', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="jl-amt">
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={line.credit || ''} 
                                            onChange={(e) => handleJournalLineChange(idx, 'credit', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="jl-act">
                                        <button className="j-btn-icon" onClick={() => handleRemoveJournalLine(idx)} disabled={journalForm.lines.length <= 2}>
                                            <MdDelete />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button className="j-add-line-btn" onClick={handleAddJournalLine}>+ Add Line</button>
                        </div>

                        <div className="j-lines-summary">
                            <div className={`j-summary-box ${tDebit !== tCredit ? 'error' : 'success'}`}>
                                <span>Total Debits: <strong>{tDebit.toFixed(2)}</strong></span>
                                <span>Total Credits: <strong>{tCredit.toFixed(2)}</strong></span>
                                {tDebit !== tCredit && <span className="j-diff">Difference: {Math.abs(tDebit - tCredit).toFixed(2)}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="journals-modal-footer">
                        <button className="j-btn-secondary" onClick={() => setShowJournalModal(false)}>Cancel</button>
                        <button 
                            className="j-btn-primary" 
                            onClick={handleSaveJournal} 
                            disabled={isSaving || (tDebit !== tCredit) || tDebit === 0}
                        >
                            {isSaving ? 'Posting...' : 'Post Journal Entry'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const renderImbalanceAnalysis = () => {
        if (!imbalanceAnalysis) return null;
        const { difference, openingGap, periodGap, closingGap, unbalancedDocs, affectedAccounts = [], findings = [], totalD, totalC, categoryTotals = {} } = imbalanceAnalysis;
        
        return (
            <div className="journals-modal-overlay" style={getModalOverlayStyle()} onClick={() => setImbalanceAnalysis(null)}>
                <div className="journals-modal modal-large fade-in" onClick={e => e.stopPropagation()}>
                    <div className="journals-modal-header">
                        <div>
                            <h2>Trial Balance Smart Analysis</h2>
                            <p className={`dd-subtitle ${Math.abs(difference) < 0.01 ? 'text-success' : 'text-danger'}`}>
                                Status: <strong>{Math.abs(difference) < 0.01 ? 'Balanced' : 'Imbalance Detected'}</strong>
                            </p>
                        </div>
                        <button className="journals-modal-close" onClick={() => setImbalanceAnalysis(null)}><MdClose /></button>
                    </div>
                    <div className="journals-modal-body">
                        <div className="analysis-dashboard">
                            <div className="analysis-summary-grid">
                                <div className="analysis-card">
                                    <span className="card-label">Total Debits</span>
                                    <h3 className="card-val">{totalD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                </div>
                                <div className="analysis-card">
                                    <span className="card-label">Total Credits</span>
                                    <h3 className="card-val">{totalC.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                </div>
                                <div className={`analysis-card ${Math.abs(difference) < 0.01 ? 'balanced' : 'unbalanced'}`}>
                                    <span className="card-label">Net Gap</span>
                                    <h3 className="card-val">{difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                </div>
                            </div>

                            <div className="categorical-explanation">
                                <h3>Financial Component Breakdown</h3>
                                <p>This breakdown explains how the net balance is composed across major account categories:</p>
                                <div className="analysis-summary-grid">
                                    <div className={`analysis-card ${Math.abs(openingGap || 0) < 0.01 ? 'balanced' : 'unbalanced'}`}>
                                        <span className="card-label">Opening Gap</span>
                                        <h3 className="card-val">{(openingGap || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                    </div>
                                    <div className={`analysis-card ${Math.abs(periodGap || 0) < 0.01 ? 'balanced' : 'unbalanced'}`}>
                                        <span className="card-label">Period Gap</span>
                                        <h3 className="card-val">{(periodGap || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                    </div>
                                    <div className={`analysis-card ${Math.abs(closingGap || 0) < 0.01 ? 'balanced' : 'unbalanced'}`}>
                                        <span className="card-label">Closing Gap</span>
                                        <h3 className="card-val">{(closingGap || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                    </div>
                                </div>
                                <div className="analysis-grid">
                                    {Object.entries(categoryTotals).map(([cat, val]) => (
                                        <div key={cat} className="analysis-stat-card">
                                            <div className="stat-header">
                                                <span className={`coa-badge badge-${cat.toLowerCase()}`}>{cat}</span>
                                            </div>
                                            <div className="stat-body">
                                                <div className="stat-label">Net Position</div>
                                                <div className={`stat-value ${val < 0 ? 'neg' : val > 0 ? 'pos' : ''}`}>
                                                    ₦{val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="unbalanced-section">
                            {findings.length > 0 && (
                                <div className="unbalanced-list" style={{ marginBottom: 18 }}>
                                    <div className="unbalanced-header">
                                        <h3>Diagnostic Findings</h3>
                                    </div>
                                    <div className="analysis-grid">
                                        {findings.map((finding, index) => (
                                            <div className="analysis-stat-card" key={`${finding.type}-${index}`}>
                                                <div className="stat-header">
                                                    <span className={`coa-badge ${finding.severity === 'high' ? 'badge-expense' : 'badge-asset'}`}>{finding.type}</span>
                                                </div>
                                                <div className="stat-body">
                                                    <div className="stat-label">{finding.message}</div>
                                                    <div className="analysis-note" style={{ marginTop: 8 }}>{finding.evidence}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {affectedAccounts.length > 0 && (
                                <div className="unbalanced-list" style={{ marginBottom: 18 }}>
                                    <div className="unbalanced-header">
                                        <h3>Largest Account Drivers</h3>
                                    </div>
                                    <p className="analysis-note">These accounts contribute the largest remaining opening, period, or closing net positions. If document groups below are balanced, the gap is likely from opening balances, rollup metadata, or a source posting missing its opposite ledger.</p>
                                    <div className="analysis-table-wrapper">
                                        <table className="analysis-table">
                                            <thead>
                                                <tr>
                                                    <th>Account</th>
                                                    <th>Category</th>
                                                    <th className="num-col">Opening</th>
                                                    <th className="num-col">Period</th>
                                                    <th className="num-col">Closing</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {affectedAccounts.map((account) => (
                                                    <tr key={account.code}>
                                                        <td>{account.code} - {account.name}</td>
                                                        <td>{account.category}</td>
                                                        <td className="num-col">{account.opening.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        <td className="num-col">{account.period.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        <td className="num-col">{account.closing.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {unbalancedDocs.length > 0 ? (
                                <div className="unbalanced-list">
                                    <div className="unbalanced-header">
                                        <h3>Suspected Imbalances ({unbalancedDocs.length})</h3>
                                        <button className="j-btn-secondary btn-sm" onClick={exportToPDF}><MdPictureAsPdf /> Export Report</button>
                                    </div>
                                    <p className="analysis-note">The following transaction groups are mathematically unbalanced:</p>
                                    <div className="analysis-table-wrapper">
                                        <table className="analysis-table">
                                            <thead>
                                                <tr>
                                                    <th>Reference/Source</th>
                                                    <th>Date</th>
                                                    <th className="num-col">Debits</th>
                                                    <th className="num-col">Credits</th>
                                                    <th className="num-col">Gap</th>
                                                    <th>Likely Cause</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {unbalancedDocs.map((doc, idx) => (
                                                    <tr key={idx}>
                                                        <td>
                                                            <div className="doc-id-link">{doc.id}</div>
                                                            <div className="doc-source-tag">{doc.rows[0]?.source}</div>
                                                        </td>
                                                        <td>{new Date(doc.rows[0]?.date).toLocaleDateString()}</td>
                                                        <td className="num-col">{(doc.d || doc.debit || 0).toLocaleString()}</td>
                                                        <td className="num-col">{(doc.c || doc.credit || 0).toLocaleString()}</td>
                                                        <td className="num-col text-danger">{(doc.gap || ((doc.d || 0) - (doc.c || 0))).toLocaleString()}</td>
                                                        <td>{doc.likelyCause || 'Check the missing opposite posting line or account mapping.'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="analysis-success">
                                    <div className="success-icon">✔</div>
                                    <h3>All Transactions Balance</h3>
                                    <p>Every document in the ledger has equal debits and credits. Any remaining Trial Balance gap likely comes from opening balances or untracked accounts.</p>
                                    <button className="j-btn-primary" style={{marginTop: '20px'}} onClick={exportToPDF}>Download Trial Balance Report</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const renderCOA = () => {
        return (
            <div className="coa-container fade-in">
                <div className="coa-toolbar">
                    <div className="coa-search-box">
                        <MdSearch className="coa-search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search by Account Name or G/L Code..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="coa-actions-group">
                        <div className="coa-export-btns">
                            <button className="j-btn-secondary" onClick={exportToExcel} title="Export to Excel">
                                <FaFileExcel /> Excel
                            </button>
                            <button className="j-btn-secondary" onClick={exportToPDF} title="Export to PDF">
                                <MdPictureAsPdf /> PDF
                            </button>
                            <button className="j-btn-secondary" onClick={analyzeImbalances} title="Analyze Trial Balance">
                                <MdAnalytics /> Analyze
                            </button>
                        </div>
                        <div className="coa-main-btns">
                            <button className="coa-refresh-btn coa-clear-cache-btn" onClick={handleClearCache} title="Clear Local Cache (Force Refresh)">
                                <MdDeleteSweep />
                            </button>
                            <button className={`coa-refresh-btn ${(isLoading || isBalancesLoading) ? 'is-syncing' : ''}`} onClick={() => { loadCOA(); hydrateFullAccountingSnapshot(true).catch((error) => { console.error('Error refreshing accounting snapshot:', error); }); }} title="Refresh Data">
                                <MdRefresh />
                            </button>
                            <button className="coa-add-btn" onClick={loadAccountingMappings} disabled={isMappingsLoading}>
                                <MdOutlineReceiptLong /> {isMappingsLoading ? 'Loading Links...' : 'Operation Links'}
                            </button>
                            <button className="coa-add-btn" onClick={() => handleOpenCOAModal()}>
                                <MdAdd /> New Account
                            </button>
                            <button className="coa-add-btn init-btn" onClick={handleInitializeCOA}>
                                <MdOutlineAccountBalance /> Initialize Default
                            </button>
                        </div>
                    </div>
                </div>


                <div className="coa-filter-bar">
                    <div className="coa-filter-group">
                        <MdFilterList className="coa-filter-icon" />
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                            <option value="All">All Categories</option>
                            <option value="Asset">Asset</option>
                            <option value="Liability">Liability</option>
                            <option value="Equity">Equity</option>
                            <option value="Revenue">Revenue</option>
                            <option value="Expense">Expense</option>
                        </select>
                    </div>
                    <div className="coa-filter-group">
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                            <option value="All">All Types</option>
                            <option value="Balance Sheet">Balance Sheet</option>
                            <option value="Income Statement">Income Statement</option>
                        </select>
                    </div>
                    <div className="coa-filter-group coa-date-range">
                        <input
                            type="date"
                            value={draftFromDate}
                            onChange={(e) => setDraftFromDate(e.target.value)}
                            title="From Date"
                        />
                        <span>to</span>
                        <input
                            type="date"
                            value={draftToDate}
                            onChange={(e) => setDraftToDate(e.target.value)}
                            title="To Date"
                        />
                        <div className="coa-date-presets">
                            <button className="preset-btn" onClick={applyAccountingDateRange} disabled={!draftFromDate || !draftToDate || (draftFromDate === fromDate && draftToDate === toDate)}>Apply</button>
                            <button className="preset-btn" onClick={() => setDatePreset('MTD')}>MTD</button>
                            <button className="preset-btn" onClick={() => setDatePreset('YTD')}>YTD</button>
                            <button className="preset-btn" onClick={() => setDatePreset('QTR')}>QTR</button>
                            <button className="preset-btn" onClick={() => setDatePreset('30D')}>30D</button>
                        </div>
                    </div>
                </div>

                <div className="coa-table-wrapper">
                    {isBalancesLoading && (balances && Object.keys(balances).length === 0) && (
                        <div className="balances-loading-overlay">
                            <div className="loading-spinner"></div>
                            <span>Calculating Balances...</span>
                        </div>
                    )}
                    {isLoading && (coaData.length === 0) ? (
                        <div className="coa-loading">
                            <div className="loading-spinner"></div>
                            <p>Loading Chart of Accounts...</p>
                        </div>
                    ) : (() => {
                        const leafAccounts = flattenedAccounts.filter(a => a.headerType === 'leaf' && !a.rollupDetail);
                        const totalOpening = leafAccounts.reduce((s, a) => s + (a.openingBalance || 0), 0);
                        const totalDebit  = leafAccounts.reduce((s, a) => s + a.debitBalance,  0);
                        const totalCredit = leafAccounts.reduce((s, a) => s + a.creditBalance, 0);
                        const totalPeriodNet = leafAccounts.reduce((s, a) => s + (a.periodNetBalance || 0), 0);
                        const totalNet    = leafAccounts.reduce((s, a) => s + (a.netBalance || 0), 0);
                        
                        const fmt = (n) => {
                            if (isBalancesLoading && (balances && Object.keys(balances).length === 0)) return '...';
                            return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        };

                        
                        const netColor = (n) => n < 0 ? '#dc2626' : n > 0 ? '#059669' : '#6b7280';

                        return (
                        <table className="coa-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleRequestSort('g/l code')} className="sortable">
                                        G/L Code {sortConfig.key === 'g/l code' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleRequestSort('name')} className="sortable">
                                        Account Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleRequestSort('category')} className="sortable">
                                        Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>Statement</th>
                                    <th className="num-col">Opening Balance</th>
                                    <th className="num-col">Debit</th>
                                    <th className="num-col">Credit</th>
                                    <th className="num-col">Period Net</th>
                                    <th className="num-col">Closing Net</th>
                                    <th>Section</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {flattenedAccounts.length > 0 ? flattenedAccounts.map((acc, idx) => (
                                    <tr key={idx} className={`coa-row-${acc.headerType} ${acc.rollupDetail ? 'coa-row-rollup-detail' : ''} ${acc.rollupParent ? 'coa-row-rollup-parent' : ''} ${collapsedHeaders.has(acc['g/l code']) ? 'is-collapsed' : ''}`}>
                                        <td className="coa-code-cell">{acc['g/l code']}</td>
                                        <td className="coa-name-cell" style={{ paddingLeft: acc.rollupDetail ? '64px' : acc.headerType === 'sub-header' ? '20px' : acc.headerType === 'leaf' ? '40px' : '0px' }}>
                                            {acc.headerType !== 'leaf' && (
                                                <span className="expand-icon" onClick={() => toggleHeader(acc['g/l code'])}>
                                                    {collapsedHeaders.has(acc['g/l code']) ? '▶' : '▼'}
                                                </span>
                                            )}
                                            <span onClick={() => acc.headerType !== 'leaf' ? toggleHeader(acc['g/l code']) : null} style={{ cursor: acc.headerType !== 'leaf' ? 'pointer' : 'default' }}>
                                                {acc.name}
                                            </span>
                                            {acc.rollupDetail && <span className="coa-rollup-chip">under {acc.rollupParentName || 'Bank'}</span>}
                                            {acc.rollupParent && <span className="coa-rollup-chip parent">bank total</span>}
                                        </td>
                                        <td>
                                            <span className={`coa-badge badge-${acc.category?.toLowerCase()}`}>
                                                {acc.category}
                                            </span>
                                        </td>
                                        <td>{acc.type}</td>
                                        <td className="num-col" style={{ color: '#475569', fontWeight: 600 }}>
                                            {fmt(acc.openingBalance || 0)}
                                        </td>
                                        <td className="num-col bal-clickable" style={{ color: '#1d4ed8', fontWeight: 500 }}
                                            onClick={() => handleOpenDrillDown(acc, 'debit')} title="Click to see debit transactions">
                                            {fmt(acc.debitBalance)}
                                        </td>
                                        <td className="num-col bal-clickable" style={{ color: '#7c3aed', fontWeight: 500 }}
                                            onClick={() => handleOpenDrillDown(acc, 'credit')} title="Click to see credit transactions">
                                            {fmt(acc.creditBalance)}
                                        </td>
                                        <td className="num-col bal-clickable" style={{ fontWeight: 700, color: netColor(acc.periodNetBalance) }}
                                            onClick={() => handleOpenDrillDown(acc, 'net')} title="Click to see period transactions">
                                            {fmt(acc.periodNetBalance || 0)}
                                        </td>
                                        <td className="num-col bal-clickable" style={{ fontWeight: 700, color: netColor(acc.netBalance) }}
                                            onClick={() => handleOpenDrillDown(acc, 'net')} title="Click to see closing balance transactions">
                                            {fmt(acc.netBalance)}
                                        </td>
                                        <td>{acc.rollupDetail ? (acc.rollupParentName || 'Bank') : acc.parentSection}</td>
                                        <td className="coa-actions">
                                            <button className="coa-action-btn edit" title="Edit" onClick={() => handleOpenCOAModal(acc)}><MdEdit /></button>
                                            <button className="coa-action-btn delete" title="Delete" onClick={() => handleDeleteCOA(acc)}><MdDelete /></button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="11" className="coa-empty-state">No accounts found matching your filters.</td>
                                    </tr>
                                )}
                            </tbody>
                            {flattenedAccounts.length > 0 && (
                                <tfoot>
                                    <tr className="coa-totals-row">
                                        <td colSpan="4"><strong>Totals ({leafAccounts.length} posting accounts)</strong></td>
                                        <td className="num-col" style={{ color: '#475569', fontWeight: 700 }}>{fmt(totalOpening)}</td>
                                        <td className="num-col" style={{ color: '#1d4ed8', fontWeight: 700 }}>{fmt(totalDebit)}</td>
                                        <td className="num-col" style={{ color: '#7c3aed', fontWeight: 700 }}>{fmt(totalCredit)}</td>
                                        <td className="num-col" style={{ fontWeight: 700, color: netColor(totalPeriodNet) }}>{fmt(totalPeriodNet)}</td>
                                        <td className="num-col coa-tb-net" style={{ fontWeight: 700, color: netColor(totalNet) }} onClick={analyzeImbalances} title="Click to analyze Trial Balance">
                                            {fmt(totalNet)}
                                            <MdAnalytics className="tb-icon" />
                                        </td>
                                        <td colSpan="2"></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                        );
                    })()}
                </div>
            </div>
        )
    }

    const renderReports = () => {
        const fmt = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })
        const { profitLoss, trialBalance, balanceSheet } = reportData
        const openReportLedger = (row, side = 'net') => {
            if (!row?.code) return
            handleOpenDrillDown({ 'g/l code': row.code, name: row.name }, side)
        }
        const renderLedgerAmount = (row, value, side = 'net') => (
            <button
                type="button"
                className="report-ledger-link"
                onClick={() => openReportLedger(row, side)}
                title={`View ledger entries for ${row?.name || 'this account'}`}
            >
                {fmt(value)}
            </button>
        )
        
        return (
            <div className="reports-wrapper fade-in">
                <div className="reports-nav">
                    <button className={reportType === 'PL' ? 'active' : ''} onClick={() => setReportType('PL')}>Profit & Loss</button>
                    <button className={reportType === 'TB' ? 'active' : ''} onClick={() => setReportType('TB')}>Trial Balance</button>
                    <button className={reportType === 'BS' ? 'active' : ''} onClick={() => setReportType('BS')}>Balance Sheet</button>
                </div>
                
                <div className="report-content-card">
                    <div className="report-card-header">
                        <div className="report-titles">
                            <h2>{reportType === 'PL' ? 'Income Statement' : reportType === 'BS' ? 'Balance Sheet' : 'Trial Balance'}</h2>
                            <p className="report-period">Period: {new Date(fromDate).toLocaleDateString()} — {new Date(toDate).toLocaleDateString()}</p>
                        </div>
                        <div className="report-btns">
                            <button className="j-btn-secondary" onClick={exportToExcel}><FaFileExcel /> Excel</button>
                            <button className="j-btn-primary" onClick={exportToPDF}><MdPictureAsPdf /> PDF Report</button>
                        </div>
                    </div>

                    {reportType === 'PL' ? (
                        <div className="pl-body">
                            <div className="pl-sect">
                                <div className="pl-sect-head">REVENUE</div>
                                {profitLoss.revenue.map((row) => (
                                    <div className="pl-line" key={row.code}>
                                        <span>{row.name}</span>
                                        <span className="num">{renderLedgerAmount(row, row.amount, 'credit')}</span>
                                    </div>
                                ))}
                                <div className="pl-subtotal">
                                    <span>Total Revenue</span>
                                    <span className="num">{fmt(profitLoss.totals.revenue)}</span>
                                </div>
                            </div>

                            <div className="pl-sect">
                                <div className="pl-sect-head">COST OF SALES</div>
                                {profitLoss.costOfSales.map((row) => (
                                    <div className="pl-line" key={row.code}>
                                        <span>{row.name}</span>
                                        <span className="num">{renderLedgerAmount(row, row.amount, 'debit')}</span>
                                    </div>
                                ))}
                                <div className="pl-subtotal">
                                    <span>Total Cost of Sales</span>
                                    <span className="num">{fmt(profitLoss.totals.costOfSales)}</span>
                                </div>
                            </div>

                            <div className="pl-major-row gross">
                                <span>GROSS PROFIT</span>
                                <span className="num">{fmt(profitLoss.totals.grossProfit)}</span>
                            </div>

                            <div className="pl-sect">
                                <div className="pl-sect-head">EXPENSES</div>
                                {profitLoss.expenses.map((row) => (
                                    <div className="pl-line" key={row.code}>
                                        <span>{row.name}</span>
                                        <span className="num">{renderLedgerAmount(row, row.amount, 'debit')}</span>
                                    </div>
                                ))}
                                <div className="pl-subtotal">
                                    <span>Total Operating Expenses</span>
                                    <span className="num">{fmt(profitLoss.totals.expenses)}</span>
                                </div>
                            </div>

                            <div className="pl-major-row net">
                                <span>NET INCOME / (LOSS)</span>
                                <span className="num">{fmt(profitLoss.totals.netIncome)}</span>
                            </div>
                        </div>
                    ) : reportType === 'BS' ? (
                        <div className="pl-body">
                            <div className="pl-sect">
                                <div className="pl-sect-head">ASSETS</div>
                                {balanceSheet.assets.map((row) => (
                                    <div className="pl-line" key={`asset-${row.code}`}>
                                        <span>{row.name}</span>
                                        <span className="num">{renderLedgerAmount(row, row.amount, 'debit')}</span>
                                    </div>
                                ))}
                                <div className="pl-subtotal">
                                    <span>Total Assets</span>
                                    <span className="num">{fmt(balanceSheet.totals.assets)}</span>
                                </div>
                            </div>

                            <div className="pl-sect">
                                <div className="pl-sect-head">LIABILITIES</div>
                                {balanceSheet.liabilities.map((row) => (
                                    <div className="pl-line" key={`liability-${row.code}`}>
                                        <span>{row.name}</span>
                                        <span className="num">{renderLedgerAmount(row, row.amount, 'credit')}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pl-sect">
                                <div className="pl-sect-head">EQUITY</div>
                                {balanceSheet.equity.map((row) => (
                                    <div className="pl-line" key={`equity-${row.code}`}>
                                        <span>{row.name}</span>
                                        <span className="num">{renderLedgerAmount(row, row.amount, 'credit')}</span>
                                    </div>
                                ))}
                                <div className="pl-subtotal">
                                    <span>Total Liabilities + Equity</span>
                                    <span className="num">{fmt(balanceSheet.totals.liabilitiesAndEquity)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="tb-body">
                            <table className="report-grid">
                                <thead>
                                    <tr>
                                        <th>Account Details</th>
                                        <th className="num">Opening Balance</th>
                                        <th className="num">Debit</th>
                                        <th className="num">Credit</th>
                                        <th className="num">Period Net</th>
                                        <th className="num">Closing Net</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trialBalance.rows.map((row) => {
                                        return (
                                            <tr key={row.code}>
                                                <td>
                                                    <span className="tb-code">{row.code}</span>
                                                    <span className="tb-name">{row.name}</span>
                                                </td>
                                                <td className="num">{fmt(row.openingBalance || 0)}</td>
                                                <td className="num">{renderLedgerAmount(row, row.debit, 'debit')}</td>
                                                <td className="num">{renderLedgerAmount(row, row.credit, 'credit')}</td>
                                                <td className="num">{renderLedgerAmount(row, row.periodNet || 0, 'net')}</td>
                                                <td className="num">{renderLedgerAmount(row, row.net, 'net')}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td>TOTALS</td>
                                        <td className="num">{fmt(trialBalance.totals.openingBalance || 0)}</td>
                                        <td className="num">{fmt(trialBalance.totals.debit)}</td>
                                        <td className="num">{fmt(trialBalance.totals.credit)}</td>
                                        <td className="num">{fmt(trialBalance.totals.periodNet || 0)}</td>
                                        <td className="num">{fmt(trialBalance.totals.net)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const closingActionHelp = [
        {
            label: 'Build Closing',
            title: 'Compute and save the monthly closing balances for the selected period end. This keeps future reports from recalculating from day one.',
        },
        {
            label: 'Build with Ledger',
            title: 'Build the same monthly closing and also store detailed ledger traces for audit. This is heavier, so use it when you need proof lines.',
        },
        {
            label: 'Find Late Changes',
            title: 'Detect backdated or changed transactions that may affect previous closings and add those closings to the recheck queue.',
        },
        {
            label: 'Review Queue',
            title: 'Open the list of closing dates waiting to be reprocessed.',
        },
        {
            label: 'Run Queue',
            title: 'Recompute queued closings that are not locked, then refresh accounting summaries.',
        },
        {
            label: 'Admin Override Run',
            title: 'Admin-only queue processing for locked closings. Use carefully when a locked period must be corrected.',
        },
    ]

    const renderJournalPostings = () => {
        return (
            <div className="journal-postings-container fade-in">
                <div className="journal-empty-state">
                    <div className="journal-empty-icon"><MdOutlineReceiptLong /></div>
                    <h3>Journal Postings</h3>
                    <p>Standard journal entry capabilities will appear here. You can debit and credit your active chart of accounts.</p>
                    <button className="coa-add-btn" style={{marginTop: '20px'}} onClick={() => setShowJournalModal(true)}>
                        <MdAdd /> Create Journal Entry
                    </button>
                </div>
            </div>
        )
    }

    const renderClosingPanel = () => {
        return (
            <div className="header-closing-panel">
                <div className={`closing-toolbar ${closingToolbarOpen ? '' : 'collapsed'}`}>
                    <button className="closing-toggle" onClick={() => setClosingToolbarOpen(v => !v)} title={closingToolbarOpen ? 'Collapse' : 'Expand'}>
                        {closingToolbarOpen ? '▾' : '▸'}
                    </button>

                    {isClosingLoading ? (
                        <div className="closing-loading">Checking last monthly closing...</div>
                    ) : (
                        <>
                            <div className="closing-meta" style={{ display: closingToolbarOpen ? 'block' : 'none' }}>
                                <div className="closing-line">Last: {lastClosing ? lastClosing.closingDate : 'None'} {lastClosing && <button className="link-like" onClick={handleViewClosing}>View</button>}</div>
                                <div className="closing-line">Status: {lastClosing ? (lastClosing.status || 'draft') : 'n/a'}</div>
                                {accountingSnapshotMeta?.openingStatus && (
                                    <div className={`closing-line opening-status ${accountingSnapshotMeta.openingStatus === 'ready' ? 'ready' : 'warning'}`}>
                                        Opening: {accountingSnapshotMeta.openingStatus === 'ready'
                                            ? `From ${accountingSnapshotMeta.openingSource?.closingDate || accountingSnapshotMeta.fromClosing || 'saved closing'}`
                                            : (accountingSnapshotMeta.openingMessage || 'Opening balances need monthly closings.')}
                                    </div>
                                )}
                            </div>

                            <div className="closing-actions" style={{ display: closingToolbarOpen ? 'flex' : 'none' }}>
                                <button className="j-btn-primary" onClick={() => handleComputeClosing(false)} disabled={isClosingAction} title={closingActionHelp[0].title}>Build Closing</button>
                                <button className="j-btn-secondary" onClick={() => handleComputeClosing(true)} disabled={isClosingAction} title={closingActionHelp[1].title}>Build with Ledger</button>
                                {lastClosing && lastClosing.status !== 'confirmed' && (
                                    <button className="j-btn-secondary" onClick={() => handleSetClosingStatus('confirmed')} disabled={isClosingAction} title="Mark the closing as reviewed. Confirmed closings can still be corrected before they are locked.">Confirm Closing</button>
                                )}
                                {lastClosing && lastClosing.status !== 'locked' && (
                                    <button className="j-btn-danger" onClick={() => handleSetClosingStatus('locked')} disabled={isClosingAction} title="Lock the closing to prevent normal recompute. Admin override is required to change it.">Lock Closing</button>
                                )}
                                {lastClosing && (
                                    <button className="j-btn-secondary" onClick={() => handleRecomputeClosing()} disabled={isClosingAction} title="Rebuild the currently selected last closing from the latest source records.">Rebuild Closing</button>
                                )}
                                <button className="j-btn-primary" onClick={() => handleBuildMissingMonthlyClosings(false)} disabled={isClosingAction} title="Build missing month-end closing snapshots so opening balances load from saved closings instead of recalculating all history.">Build Monthly Closings</button>
                                <button className="j-btn-secondary" onClick={() => handleBuildMissingMonthlyClosings(true)} disabled={isClosingAction} title="Build monthly closings and store raw ledger traces in each closing snapshot for audit drill-down.">Build Monthly + Ledgers</button>
                                <button className="j-btn-secondary" onClick={handleOpenClosingsModal} disabled={isClosingAction} title="View all monthly closing builds, summaries, audit state, and locking controls.">Monthly Closing List</button>
                                <button className="j-btn-secondary" onClick={() => handleDetectAffectedClosings()} disabled={isClosingAction} title={closingActionHelp[2].title}>Find Late Changes</button>
                                <button className="j-btn-secondary" onClick={handleOpenPendingModal} disabled={isClosingAction} title={closingActionHelp[3].title}>Review Queue</button>
                                <button className="j-btn-secondary" onClick={() => handleTriggerPendingRecomputes(false)} disabled={isClosingAction} title={closingActionHelp[4].title}>Run Queue</button>
                                {companyRecord?.status === 'admin' && (
                                    <button className="j-btn-danger" onClick={() => handleTriggerPendingRecomputes(true)} disabled={isClosingAction} title={closingActionHelp[5].title}>Admin Override Run</button>
                                )}
                                {companyRecord?.status === 'admin' && (
                                    <button className="j-btn-danger" onClick={handlePopulateGeneralLedgerBacklog} disabled={isClosingAction || !!glBacklogOperationId} title="One-time (re-runnable) tool: posts real General Ledger entries for existing Purchase, Inventory, Asset, and Business Partner records that don't have one yet, including into already-locked historical periods.">
                                        {glBacklogOperationId ? 'Backlog Running…' : 'Populate GL Backlog'}
                                    </button>
                                )}
                            </div>
                            {glBacklogOperationId && (
                                <div className="closing-meta" style={{ display: 'block' }}>
                                    <div className="closing-line">
                                        General Ledger backlog: {glBacklogOperation
                                            ? `${glBacklogOperation.completed || 0} / ${glBacklogOperation.total || '?'} processed (${glBacklogOperation.posted || 0} posted, ${glBacklogOperation.alreadyPresent || 0} already present, ${glBacklogOperation.skipped || 0} skipped${glBacklogOperation.errors?.length ? `, ${glBacklogOperation.errors.length} errors` : ''})`
                                            : 'connecting…'}
                                    </div>
                                </div>
                            )}
                            <details className="accounting-actions-help" style={{ display: closingToolbarOpen ? 'block' : 'none' }}>
                                <summary>What do these closing actions do?</summary>
                                <div className="accounting-actions-help-grid">
                                    {closingActionHelp.map((item) => (
                                        <div className="accounting-actions-help-card" key={item.label}>
                                            <strong>{item.label}</strong>
                                            <span>{item.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className='journals-page' ref={journalsPageRef}>
            <div className='journals-header'>
                <div className="journals-header-top">
                    <div className="journals-header-content">
                        <h1 className='journals-title'>Financial Accounting</h1>
                        <p className='journals-subtitle'>Manage your Chart of Accounts and post manual Journal Entries</p>
                    </div>
                    
                    {(isLoading || isBalancesLoading) && (coaData.length > 0) && (
                        <div className="background-sync-badge">
                            <div className="sync-spinner-small"></div>
                            <span>Syncing balances...</span>
                        </div>
                    )}
                </div>
                
                <div className="journals-tabs">
                    <button 
                        className={`journal-tab ${activeTab === 'COA' ? 'active' : ''}`}
                        onClick={() => setActiveTab('COA')}
                    >
                        <MdOutlineAccountBalance /> Chart of Accounts
                    </button>
                    <button 
                        className={`journal-tab ${activeTab === 'JOURNALS' ? 'active' : ''}`}
                        onClick={() => setActiveTab('JOURNALS')}
                    >
                        <MdOutlineReceiptLong /> Journal Postings
                    </button>
                    <button 
                        className={`journal-tab ${activeTab === 'REPORTS' ? 'active' : ''}`}
                        onClick={() => setActiveTab('REPORTS')}
                    >
                        <MdAnalytics /> Reports
                    </button>
                </div>
                {renderClosingPanel && renderClosingPanel()}
            </div>

            <div className='journals-content'>
                {activeTab === 'COA' ? renderCOA() : 
                 activeTab === 'JOURNALS' ? renderJournalPostings() :
                 renderReports()}
            </div>
            
            {renderCOAModal()}
            {renderMappingsModal()}
            {renderJournalModal()}
            {renderDrillDown()}
            {renderImbalanceAnalysis()}
            {renderClosingsModal()}
            {renderClosingDetailsModal()}
            {renderPendingModal && renderPendingModal()}
            {renderAuditModal && renderAuditModal()}
            {renderInitProgress()}
        </div>
    )
}

export default Journals
