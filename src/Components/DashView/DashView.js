import './DashView.css'
import PaymentReceiptsModal from './PaymentReceiptsModal'
import React from 'react'
import {useEffect, useMemo, useState, useCallback, useRef } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
    FaExclamationTriangle, 
    FaInfoCircle, 
    FaStore, 
    FaTruck, 
    FaBell, 
    FaChartLine, 
    FaShoppingCart, 
    FaBoxes, 
    FaHistory 
} from 'react-icons/fa';
// Charts (install: npm i recharts)
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar, PieChart, Pie, Cell, LabelList } from 'recharts'
import { getAppCache, setAppCache } from '../../Resources/offlineDb';

const fmt = (n)=> Number(n||0).toLocaleString()
const DASHBOARD_SUMMARY_ENGINE_VERSION = 5
// Minimum gap between background (SSE-triggered) recommend_reorders
// refetches — that computation runs a couple of real aggregates and
// wc:dashboard-summary-update can fire often during normal POS activity;
// without a floor here every single event re-ran it, which visibly
// flickered the "Generate PO" button enabled/disabled on each round trip.
const REORDER_REFRESH_THROTTLE_MS = 20000

const DashView = () =>{
    // Modal state for payment receipts
    const [showReceiptsModal, setShowReceiptsModal] = useState(false)
    const {
        storePath,
        fetchServer, server, company, companyRecord,
        products, getProducts, getProductsStockReport,
        sales, getSales, saleFrom, saleTo,
        purchase, getPurchase,
        expenses, getExpenses,
        accommodations, getAccommodations,
        rentals, getRentals,
        employees, getEmployees, getSessionEnd,
        salesSessions, lastActiveSessions, sessionManagers,
        setAlert, setAlertState, setAlertTimeout
    } = useContext(ContextProvider)
    // Default date range (current month)
    const defaultFromDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10)
    const defaultToDate = new Date().toISOString().slice(0,10)
    
    const [fromDate, setFromDate] = useState(saleFrom || defaultFromDate)
    const [toDate, setToDate] = useState(saleTo || defaultToDate)
    const [draftFromDate, setDraftFromDate] = useState(saleFrom || defaultFromDate)
    const [draftToDate, setDraftToDate] = useState(saleTo || defaultToDate)
    const dashboardRequestRef = useRef(0)
        // Which location's low-stock popup is open — null means closed. The
        // location NAME, not an index into `restock` — `restock` can now
        // refresh live while the popup is open (see the wc:inventory-stock-
        // changed listener below), and an index would silently point at
        // whatever location happens to reorder into that slot instead of
        // the one actually being viewed.
        const [lowStockModalLocation, setLowStockModalLocation] = useState(null)
    // Filters
    const [locationFilter, setLocationFilter] = useState('')
    const [productFilter, setProductFilter] = useState('')
    const [employeeFilter, setEmployeeFilter] = useState('')
    const [seasonFilter, setSeasonFilter] = useState('')
    
    const navigate = useNavigate()
    
    // Handle season filter change
    const handleSeasonChange = (season) => {
        setSeasonFilter(season)
        const now = new Date()
        let startDate, endDate
        
        switch(season) {
            case 'Q1':
                startDate = new Date(now.getFullYear(), 0, 1) // Jan 1
                endDate = new Date(now.getFullYear(), 2, 31)  // Mar 31
                break
            case 'Q2':
                startDate = new Date(now.getFullYear(), 3, 1)  // Apr 1
                endDate = new Date(now.getFullYear(), 5, 30)   // Jun 30
                break
            case 'Q3':
                startDate = new Date(now.getFullYear(), 6, 1)  // Jul 1
                endDate = new Date(now.getFullYear(), 8, 30)   // Sep 30
                break
            case 'Q4':
                startDate = new Date(now.getFullYear(), 9, 1)  // Oct 1
                endDate = new Date(now.getFullYear(), 11, 31)  // Dec 31
                break
            default:
                // If 'All' or invalid, use default date range
                setDraftFromDate(defaultFromDate)
                setDraftToDate(defaultToDate)
                setFromDate(defaultFromDate)
                setToDate(defaultToDate)
                return
        }
        
        const nextFrom = startDate.toISOString().slice(0,10)
        const nextTo = endDate.toISOString().slice(0,10)
        setDraftFromDate(nextFrom)
        setDraftToDate(nextTo)
        setFromDate(nextFrom)
        setToDate(nextTo)
    }
    
    // Handle clear all filters
    const handleClearFilters = () => {
        setDraftFromDate(defaultFromDate)
        setDraftToDate(defaultToDate)
        setFromDate(defaultFromDate)
        setToDate(defaultToDate)
        setLocationFilter('')
        setProductFilter('')
        setEmployeeFilter('')
        setSeasonFilter('')
    }

    const handleApplyDateFilters = () => {
        if (!draftFromDate || !draftToDate) return
        setFromDate(draftFromDate)
        setToDate(draftToDate)
    }

    // Loading
    const [loading, setLoading] = useState(false)
    const [dashErr, setDashErr] = useState('')

    // Aggregates
    const [kpis, setKpis] = useState({
        salesAmount: 0,
        salesQty: 0,
        purchasesAmount: 0,
        purchasesQty: 0,
        expensesAmount: 0,
        inventoryQty: 0,
        inventoryValue: 0,
        inventorySales: 0,
    })
    const [topProducts, setTopProducts] = useState([])
    const [topLocations, setTopLocations] = useState([])
    const [topEmployeesSales, setTopEmployeesSales] = useState([])
    const [topEmployeesServices, setTopEmployeesServices] = useState([])
    const [series, setSeries] = useState([]) // [{date, sales, expenses, purchases, accommodations, rentals}]
    const [restock, setRestock] = useState([])
    // Reorder recommendations — the single source of truth for low stock
    // (GET /purchase/recommendReorders, same function Epsilon's own
    // recommend_reorders tool calls). lastReorderFetchedAt gates the
    // "Automatically generate PO for inspection" button: it only enables
    // once this dashboard has genuinely loaded fresh data, never on stale
    // or empty state.
    const [reorderRecommendations, setReorderRecommendations] = useState([])
    const [lastReorderFetchedAt, setLastReorderFetchedAt] = useState(null)
    const [topExpenseCategories, setTopExpenseCategories] = useState([])
    const [topProductsBySales, setTopProductsBySales] = useState([])
    const [topPurchaseItems, setTopPurchaseItems] = useState([])
    const [productLocationBreakdown, setProductLocationBreakdown] = useState([]) // [{pid, name, locations:[{location, qty}]}]
    const [productLocationSalesBreakdown, setProductLocationSalesBreakdown] = useState([]) // [{pid, name, locations:[{location, amount}]}]
    const [monthlySeries, setMonthlySeries] = useState([]) // [{month:'Jan', sales, purchases, expenses, accommodations, rentals}]
    const [revenueMix, setRevenueMix] = useState([]) // [{name:'Sales', value:...}, ...]
    const [posSessions, setPosSessions] = useState({
        activeSessions: [],
        lastActiveSessions: [],
        lastDeliverySessions: []
    })
    const [dashboardReceipts, setDashboardReceipts] = useState([])
    const [dashboardSummaryKey, setDashboardSummaryKey] = useState('')
    const [dashboardMeta, setDashboardMeta] = useState({
        productCatalog: [],
        employeeCatalog: [],
        priceIssues: [],
        locationOptions: [],
        productOptions: [],
        employeeOptions: [],
    })

    // Build a cache key for the current dashboard filters
    const makeDashCacheKey = () => {
        if (!company) return null;
        const db = company || 'global';
        return [
            'dash',
            db,
            fromDate,
            toDate,
            locationFilter || 'all',
            productFilter || 'all',
            employeeFilter || 'all',
            seasonFilter || 'all',
        ].join(':');
    };

    const makeDashSummaryKey = () => {
        if (!company) return ''
        return [
            fromDate,
            toDate,
            locationFilter || 'all',
            productFilter || 'all',
            employeeFilter || 'all',
            seasonFilter || 'all',
        ].join('|')
    }

    const isUsableDashboardSnapshot = (snap, expectedSummaryKey = makeDashSummaryKey()) => {
        const engineMatches = Number(snap?._rollups?.engineVersion || 0) === DASHBOARD_SUMMARY_ENGINE_VERSION
        const snapshotKey = snap?._summaryKey || snap?.summaryKey || ''
        return engineMatches && (!snapshotKey || snapshotKey === expectedSummaryKey)
    }

    // Apply a cached or freshly-computed snapshot into React state
    const applyDashSnapshot = (snap) => {
        if (!snap) return;
        if (snap.kpis) setKpis(snap.kpis);
        if (Array.isArray(snap.series)) setSeries(snap.series);
        if (Array.isArray(snap.monthlySeries)) setMonthlySeries(snap.monthlySeries);
        if (Array.isArray(snap.revenueMix)) setRevenueMix(snap.revenueMix);
        // restock is intentionally NOT restored from this cache snapshot —
        // it's owned exclusively by loadReorderRecommendations now (see
        // below), which always fetches live so it can never disagree with
        // what Epsilon itself would suggest reordering.
        if (Array.isArray(snap.topProducts)) setTopProducts(snap.topProducts);
        if (Array.isArray(snap.topLocations)) setTopLocations(snap.topLocations);
        if (Array.isArray(snap.topProductsBySales)) setTopProductsBySales(snap.topProductsBySales);
        if (Array.isArray(snap.topPurchaseItems)) setTopPurchaseItems(snap.topPurchaseItems);
        if (Array.isArray(snap.productLocationBreakdown)) setProductLocationBreakdown(snap.productLocationBreakdown);
        if (Array.isArray(snap.productLocationSalesBreakdown)) setProductLocationSalesBreakdown(snap.productLocationSalesBreakdown);
        if (Array.isArray(snap.topEmployeesSales)) setTopEmployeesSales(snap.topEmployeesSales);
        if (Array.isArray(snap.topEmployeesServices)) setTopEmployeesServices(snap.topEmployeesServices);
        if (Array.isArray(snap.topExpenseCategories)) setTopExpenseCategories(snap.topExpenseCategories);
        if (Array.isArray(snap.paymentReceipts)) setDashboardReceipts(snap.paymentReceipts);
        if (snap.posSessions) {
            setPosSessions({
                activeSessions: Array.isArray(snap.posSessions.activeSessions) ? snap.posSessions.activeSessions : [],
                lastActiveSessions: Array.isArray(snap.posSessions.lastActiveSessions) ? snap.posSessions.lastActiveSessions : [],
                lastDeliverySessions: Array.isArray(snap.posSessions.lastDeliverySessions) ? snap.posSessions.lastDeliverySessions : [],
            });
        }
        setDashboardMeta({
            productCatalog: Array.isArray(snap.productCatalog) ? snap.productCatalog : [],
            employeeCatalog: Array.isArray(snap.employeeCatalog) ? snap.employeeCatalog : [],
            priceIssues: Array.isArray(snap.priceIssues) ? snap.priceIssues : [],
            locationOptions: Array.isArray(snap.locationOptions) ? snap.locationOptions : [],
            productOptions: Array.isArray(snap.productOptions) ? snap.productOptions : [],
            employeeOptions: Array.isArray(snap.employeeOptions) ? snap.employeeOptions : [],
        });
    };

    useEffect(()=>{
        storePath('dashboard')  
        document.title = 'Dashboard | Enterprise Compute Central'
    },[storePath])

    // Helper: filter arbitrary records by date range using common date fields
    const filterByDate = (list, from, to, dateKeys=['postingDate','expensesDate','expenseDate','createdAt','date','salesDate','sessionDate'])=>{
        if (!Array.isArray(list)) return []
        const fromT = new Date(from).getTime()
        const toT = new Date(to).getTime()
        return list.filter(it=>{
            let dVal = null
            for (const k of dateKeys){
                if (it && it[k] !== undefined && it[k] !== null){ dVal = it[k]; break }
            }
            if (!dVal) return false
            const t = (typeof dVal === 'string') ? new Date(dVal).getTime() : Number(dVal||0)
            if (!t) return false
            // Season filter (Q1-Q4) if set
            if (seasonFilter){
                const m = new Date(t).getMonth() // 0-11
                const inQuarter = (q)=>{
                    if (q==='Q1') return m>=0 && m<=2
                    if (q==='Q2') return m>=3 && m<=5
                    if (q==='Q3') return m>=6 && m<=8
                    if (q==='Q4') return m>=9 && m<=11
                    return true
                }
                if (!inQuarter(seasonFilter)) return false
            }
            return t >= fromT && t <= toT
        })
    }

    const loadDashData = async(force = false)=>{
        const dashboardUserId = companyRecord?.emailid
        if (!company || !dashboardUserId) return
        const requestId = Date.now()
        dashboardRequestRef.current = requestId

        setDashErr('')

        const cacheKey = makeDashCacheKey();
        const summaryCacheKey = `dashboard-summary-${makeDashSummaryKey()}`
        let hydratedFromCache = false

        // 1) Try to hydrate from IndexedDB app cache first (for snappy UI)
        if (summaryCacheKey && !force) {
            try {
                const cached = await getAppCache(company, dashboardUserId, summaryCacheKey);
                if (cached && cached.data && isUsableDashboardSnapshot(cached.data)) {
                    applyDashSnapshot(cached.data);
                    setDashboardSummaryKey(makeDashSummaryKey())
                    hydratedFromCache = true
                    setLoading(false)
                }
            } catch (e) {
                console.warn('DashView: getAppCache failed', e);
            }
        }

        if (!hydratedFromCache) {
            setLoading(true)
        }

        try{
            const summaryResponse = await fetchServer('POST', {
                fromDate,
                toDate,
                locationFilter,
                productFilter,
                employeeFilter,
                seasonFilter,
                forceRefresh: !!force
            }, 'getDashboardSummary', server)

            if (summaryResponse && !summaryResponse.ok) {
                if (dashboardRequestRef.current !== requestId) return
                console.error('🔴 [DASHBOARD] Server aggregation failed:', summaryResponse.mess || summaryResponse.error);
                setDashErr(summaryResponse.mess || summaryResponse.error || 'Server-side dashboard aggregation failed.');
                setLoading(false);
                return;
            }

            if (summaryResponse?.ok && summaryResponse?.snapshot) {
                if (dashboardRequestRef.current !== requestId) return
                const resolvedSummaryKey = summaryResponse.summaryKey || makeDashSummaryKey()
                const snapshotToCache = {
                    ...(summaryResponse.snapshot || {}),
                    _summaryKey: resolvedSummaryKey,
                    _filters: { fromDate, toDate, locationFilter, productFilter, employeeFilter, seasonFilter },
                }
                applyDashSnapshot(snapshotToCache)
                setDashboardSummaryKey(resolvedSummaryKey)
                if (summaryResponse.summaryKey) {
                    try {
                        await setAppCache(company, dashboardUserId, `dashboard-summary-${summaryResponse.summaryKey}`, snapshotToCache)
                    } catch (cacheError) {
                        console.warn('DashView: setAppCache failed', cacheError)
                    }
                }
                setLoading(false)
                return
            }

            // Format dates for MongoDB query
            const formattedStartDate = new Date(fromDate).toISOString().split('T')[0];
            const formattedEndDate = new Date(toDate).toISOString().split('T')[0];
            const openingFilter = {
                $expr: {
                    postingDate: { $lt: formattedStartDate },
                }
            }

            const filter = {
                $expr: {
                    $and: [
                        { $gte: ["$postingDate", formattedStartDate] },
                        { $lte: ["$postingDate", formattedEndDate] }
                    ],
                },
            }
            
            // const filter = { postingStamp: { $gte: formattedStartDate, $lte: formattedEndDate } }
            if (locationFilter) {
                filter.location = locationFilter
                openingFilter.location = locationFilter
            }
            if (productFilter) {
                filter.productId = productFilter
                openingFilter.productId = locationFilter
            }
            // Query InventoryTransactions once for range
            
            const resp = await fetchServer('POST', {
                database: company,
                collection: 'InventoryTransactions',
                prop: filter
            }, 'getDocsDetails', server)
            // const openingResp = await fetchServer('POST', {
            //     database: company,
            //     collection: 'InventoryTransactions',
            //     prop: openingFilter
            // }, 'getDocsDetails', server)
            // const [resp, openingResp] = await Promise.all([
            //     fetchServer('POST', {
            //         database: company,
            //         collection: 'InventoryTransactions',
            //         prop: filter
            //     }, 'getDocsDetails', server),
            //     fetchServer('POST', {
            //         database: company,
            //         collection: 'InventoryTransactions',
            //         prop: openingFilter
            //     }, 'getDocsDetails', server)
            // ]);

            const productIds = products
                .filter(product => product.salesPrice || product.vipPrice )
                .map(product => product.i_d);
            let salesAmount=0, salesQty=0, purchasesAmount=0, purchasesQty=0
            let cogs=0 // cost of goods sold for sales
            const byProduct = new Map()
            const byLocation = new Map()
            const byDate = new Map() // date -> {sales, purchases}
            const productLocMap = new Map() // pid -> Map(location -> qty)
            if ((resp?.record) && (Array.isArray(resp.record))){
                resp.record.forEach(t=>{
                    const type = String(t.entryType||'').toLowerCase()
                    const qty = Math.abs(Number(t.baseQuantity||t.quantity||0))
                    const totSales = Math.abs(Number(t.totalSales||0))
                    const totCost = Math.abs(Number(t.totalCost||0))
                    // const totCost = Math.abs(Number(t.totalCost||0))
                    const loc = t.location || 'Unknown'
                    const pid = t.productId || t.i_d || 'Unknown'
                    const d = (t.postingDate && typeof t.postingDate === 'string') ? t.postingDate : new Date(Number(t.createdAt||0)).toISOString().slice(0,10)
                    // Apply season filter if set (Q1-Q4)
                    if (seasonFilter){
                        const m = new Date(d).getMonth()
                        const inQ = (q)=> q==='Q1'? (m>=0&&m<=2) : q==='Q2'? (m>=3&&m<=5) : q==='Q3'? (m>=6&&m<=8) : q==='Q4'? (m>=9&&m<=11) : true
                        if (!inQ(seasonFilter)) return
                    }

                    if (type === 'sale' || type === 'sales'){
                        salesQty += qty
                        salesAmount += (totSales || (totCost))
                        cogs += totCost 
                        byProduct.set(pid, (byProduct.get(pid)||0) + qty)
                        byLocation.set(loc, (byLocation.get(loc)||0) + (totSales || totCost))
                        const cur = byDate.get(d) || { sales:0, purchases:0 }
                        cur.sales += (totSales || 0)
                        byDate.set(d, cur)
                        // product-location qty breakdown
                        if (!productLocMap.get(pid)) productLocMap.set(pid, new Map())
                        const lm = productLocMap.get(pid)
                        lm.set(loc, (lm.get(loc)||0) + qty)
                    }
                    if (type === 'purchase'){
                        purchasesQty += qty
                        purchasesAmount += (totCost)                        
                        const cur = byDate.get(d) || { sales:0, purchases:0 }
                        cur.purchases += totCost
                        byDate.set(d, cur)
                    }
                })
            }
            // Inventory aggregates from products
            let inventoryQty = 0, inventoryValue = 0, inventorySales = 0
            if (products && Array.isArray(products)){
                products.forEach(p=>{
                    let totalInventory = Number(p?.stockSummary?.closingQty) || Number(p.totalStock||0)
                    inventoryQty += totalInventory
                    inventoryValue += Number(p?.stockSummary?.closingCost || 0)
                    // inventoryValue += (purchasesAmount/purchasesQty)*Number(p.totalStock||0)
                    inventorySales += Number(p?.stockSummary?.closingSalesValue || 0)
                })
            }

            // Track sales by product (for amount breakdown)
            const salesByProduct = new Map()
            const productSalesMap = new Map() // For tracking sales amounts by product and location
            const salesRecords = resp.record || []
            
            const saleTransactions = salesRecords.filter(t => {
                const type = String(t.entryType || '').toLowerCase()
                return type === 'sale' || type === 'sales' || type === 'pos'
            })
            
            // Process sales transactions to track amounts by product and location
            saleTransactions.forEach(t => {
                const pid = t.productId || t.i_d || 'Unknown'
                const location = t.location || 'Unknown'
                const amount = Math.abs(Number(t.totalSales || t.amount || 0))
                
                if (amount > 0) {
                    // Update product sales map (for location-based sales amount breakdown)
                    if (!productSalesMap.has(pid)) {
                        productSalesMap.set(pid, new Map())
                    }
                    const locationMap = productSalesMap.get(pid)
                    locationMap.set(location, (locationMap.get(location) || 0) + amount)
                }
            })
            saleTransactions.forEach(t => {
                const pid = t.productId || t.i_d || 'Unknown'
                const amount = Math.abs(Number(t.totalSales || t.totalCost || 0))
                if (amount > 0) {
                    const current = salesByProduct.get(pid) || 0
                    salesByProduct.set(pid, current + amount)
                }
            })

            // Top Products (by sales amount)
            const topSalesProducts = Array.from(salesByProduct.entries())
                .map(([pid, amount]) => ({
                    pid,
                    name: products?.find(p => (p.i_d || p.productId) === pid)?.name || `Product ${pid}`,
                    amount
                }))
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 3) // Top 3 products by sales amount

            // Track purchases by product
            const purchasesByProduct = new Map()
            resp.record.filter(t => (t.entryType || '').toLowerCase() === 'purchase').forEach(t => {
                const pid = t.productId || t.i_d || 'Unknown'
                const amount = Math.abs(Number(t.totalCost || t.amount || 0))
                if (amount > 0) {
                    purchasesByProduct.set(pid, (purchasesByProduct.get(pid) || 0) + amount)
                }
            })

            // Top Purchase Items
            const topPurchaseItemsList = Array.from(purchasesByProduct.entries())
                .map(([pid, amount]) => ({
                    pid,
                    name: products?.find(p => (p.i_d || p.productId) === pid)?.name || `Item ${pid}`,
                    amount
                }))
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 3) // Top 3 purchase items by amount

            // Top Products (by qty sold in range) - keep existing for restock logic
            const topProdArr = Array.from(byProduct.entries())
                .map(([pid, qty])=>({ pid, qty }))
                .sort((a,b)=> b.qty - a.qty)

            // Top Locations (by sales amount)
            const topLocArr = Array.from(byLocation.entries())
                .map(([location, amount])=>({ location, amount }))
                .sort((a,b)=> b.amount - a.amount)

            // Restock alerts used to be computed here from a separate,
            // client-side-only heuristic (avg daily sales * 7, floored at 7
            // units) that disagreed with Epsilon's own recommend_reorders
            // tool — a tenant could see one "low stock" list here and a
            // different one if they asked the AI. Both now read the exact
            // same source (GET /purchase/recommendReorders, which just
            // wraps recommend_reorders) — see loadReorderRecommendations
            // and the effect that calls it, below. Restock state is set
            // there, not here.
            if (dashboardRequestRef.current !== requestId) return

            const { total: expensesTotal, topExpenses } = sumExpenses(expenses, fromDate, toDate)
            // Store top data for KPI displays
            setTopExpenseCategories(topExpenses)
            setTopProductsBySales(topSalesProducts)
            setTopPurchaseItems(topPurchaseItemsList)
            
            // Debug log to verify top sales products data
            // Build daily expenses map
            const expByDate = buildExpensesByDate(expenses, fromDate, toDate)

            // Accommodations & Rentals revenues
            const { total: accomTotal, byDate: accomByDate } = sumByDate(accommodations, fromDate, toDate, 'accommodationAmount')
            const { total: rentalTotal, byDate: rentalByDate } = sumByDate(rentals, fromDate, toDate, 'rentalAmount')

            // Debts (from sales): look for totalDebt and totalDebtRecovered fields if present
            const { debtTotal, debtRecovered } = sumDebts(sales, fromDate, toDate)

            // Build sales-by-date from sales documents (exclude accommodation rows)
            const salesByDateFromSalesDocs = new Map()
            filterByDate(sales, fromDate, toDate).forEach(doc=>{
                const dStr = (doc.postingDate && typeof doc.postingDate==='string') ? doc.postingDate : (doc.createdAt ? new Date(Number(doc.createdAt)).toISOString().slice(0,10) : '')
                const rows = Array.isArray(doc.record) ? doc.record : []
                const sum = rows.reduce((acc, r)=>{
                    if (!r || r.isAccommodation) return acc
                    return acc + Number(r.totalSales||0)
                }, 0)
                if (dStr && sum>0) salesByDateFromSalesDocs.set(dStr, (salesByDateFromSalesDocs.get(dStr)||0) + sum)
            })

            // Reconcile sales per date: prefer sales.record totals when present, else use InventoryTransactions sales
            const allDates = new Set([
                ...Object.keys(expByDate),
                ...Object.keys(accomByDate),
                ...Object.keys(rentalByDate),
                ...Array.from(byDate.keys()),
                ...Array.from(salesByDateFromSalesDocs.keys())
            ])
            
            let reconciledSalesTotal = 0
            let expectedSalesTotal = 0
            const seriesData = Array.from(allDates).sort().map(date=>{
                const inv = byDate.get(date) || {sales:0, purchases:0}
                const salesVal = salesByDateFromSalesDocs.has(date) ? (salesByDateFromSalesDocs.get(date)||0) : (inv.sales||0)
                const salesVal1 = (inv.sales||0)
                expectedSalesTotal += Number(salesVal || 0) 
                reconciledSalesTotal += Number(salesVal1 || 0)
                return {
                    date,
                    sales: salesVal,
                    purchases: inv.purchases||0,
                    expenses: expByDate[date]||0,
                    accommodations: accomByDate[date]||0,
                    rentals: rentalByDate[date]||0
                }
            })

            const kpisData = { 
                expectedSalesAmount: expectedSalesTotal,
                salesAmount: reconciledSalesTotal, salesQty, 
                purchasesAmount, purchasesQty, 
                expensesAmount: expensesTotal, 
                inventoryQty, inventoryValue, inventorySales,
                accommodationsAmount: accomTotal,
                rentalsAmount: rentalTotal,
                debtTotal, debtRecovered,
                cogs,
                grossProfit: (reconciledSalesTotal + accomTotal + rentalTotal) - cogs,
                netProfit: ((reconciledSalesTotal + accomTotal + rentalTotal) - cogs) - expensesTotal
            }
            setKpis(kpisData)
            // Revenue mix for pie
            const revenueMixData = [
                { name: 'Sales', value: Number(reconciledSalesTotal||0) },
                { name: 'Accommodation', value: Number(accomTotal||0) },
                { name: 'Rentals', value: Number(rentalTotal||0) }
            ]
            setRevenueMix(revenueMixData)
            // Get the year from the selected date range
            const selectedYear = new Date(fromDate).getFullYear()
            const yearStart = new Date(selectedYear, 0, 1) // Jan 1 of selected year
            const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59) // Last millisecond of Dec 31
            
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
            const monthAgg = new Map()
            
            // Initialize all months with zeros
            months.forEach(month => {
                monthAgg.set(month, { 
                    month, 
                    sales: 0, 
                    purchases: 0, 
                    expenses: 0, 
                    accommodations: 0, 
                    rentals: 0 
                })
            })
            
            // Process raw data for the selected year (not filtered by date range)
            const processData = (data, type) => {
                if (!Array.isArray(data)) {
                    return
                }
                
                let processedCount = 0
                data.forEach(item => {
                    if (!item.postingDate && !item.paymentDate) return
                    const dt = new Date(item.postingDate || item.paymentDate)                    
                    if (dt.getFullYear() !== selectedYear) return
                    const monthKey = months[dt.getMonth()]
                    const current = monthAgg.get(monthKey)
                    if (!current) return
                    let amount = 0
                    switch(type) {
                        case 'sale':
                            amount = Math.abs(Number((
                                item.totalBankSales + item.totalCashSales + item.totalDebt + item.totalShortage
                            ) || item.amount || 0))
                            current.sales += amount
                            break
                        case 'purchase':
                            amount = Math.abs(Number(item.purchaseAmount || item.amount || 0))
                            current.purchases += amount
                            break
                        case 'expense':
                            amount = Math.abs(Number(item.expensesAmount || item.amount || 0))
                            current.expenses += amount
                            break
                        case 'accommodation':
                            amount = Math.abs(Number(item.accommodationAmount || item.amount || 0))
                            current.accommodations += amount
                            current.sales -= amount
                            break
                        case 'rental':
                            amount = Math.abs(Number(item.rentalAmount || item.amount || 0))
                            current.rentals += amount
                            break
                    }
                    if (amount > 0) processedCount++
                })
            }
            
            // Process each data type
            
            processData(sales, 'sale')
            processData(purchase, 'purchase')
            processData(expenses, 'expense')
            processData(accommodations, 'accommodation')
            processData(rentals, 'rental')
            
            // Convert to array in month order, ensuring all months are included
            const monthlyData = months.map(month => {
                const data = monthAgg.get(month)
                // Ensure all required fields are numbers
                return {
                    month: data.month,
                    sales: Number(data.sales || 0),
                    purchases: Number(data.purchases || 0),
                    expenses: Number(data.expenses || 0),
                    accommodations: Number(data.accommodations || 0),
                    rentals: Number(data.rentals || 0)
                }
            })
            
            setMonthlySeries(monthlyData)
            const topProductsData = topProdArr.slice(0,10)
            const topLocationsData = topLocArr.slice(0,10)
            setTopProducts(topProductsData)
            setTopLocations(topLocationsData)
            // Build productLocationBreakdown (quantity based)
            const prodLocArr = topProdArr.slice(0,10).map(p=>{
                const lm = productLocMap.get(p.pid) || new Map()
                const locations = Array.from(lm.entries()).map(([location, qty])=>({ location, qty }))
                    .sort((a,b)=> b.qty - a.qty)
                return { pid: p.pid, name: productName(p.pid), locations }
            })
            setProductLocationBreakdown(prodLocArr)
            
            // Build productLocationSalesBreakdown (amount based)
            // First, get all products with their total sales amount
            const productsWithSales = Array.from(productSalesMap.entries()).map(([pid, locationMap]) => {
                const totalAmount = Array.from(locationMap.values()).reduce((sum, amt) => sum + amt, 0)
                return { pid, totalAmount }
            })
            
            // Sort products by total sales amount (descending) and take top 10
            const topProductsBySales = productsWithSales
                .sort((a, b) => b.totalAmount - a.totalAmount)
                .slice(0, 10)
            
            // Build the final array with location breakdowns for top products
            const prodSalesLocArr = topProductsBySales.map(({pid}) => {
                const sm = productSalesMap.get(pid) || new Map()
                const locations = Array.from(sm.entries())
                    .map(([location, amount]) => ({ 
                        location, 
                        amount: Number(amount || 0) 
                    }))
                    .sort((a, b) => b.amount - a.amount)
                return { 
                    pid, 
                    name: productName(pid), 
                    locations,
                    totalAmount: Array.from(sm.values()).reduce((sum, amt) => sum + amt, 0)
                }
            })
            setProductLocationSalesBreakdown(prodSalesLocArr)
            // Top Employees split: Sales vs Services (Accommodation + Rentals)
            const empSalesMap = new Map()
            const empServiceMap = new Map()
            const accomDatesInSales = new Set()
            // Sales documents contain a `record` array with per-employee rows
            filterByDate(sales, fromDate, toDate).forEach(doc=>{
                const rows = Array.isArray(doc.record) ? doc.record : []
                rows.forEach(r=>{
                    const id = employeeIdResolver(r.employeeId)
                    const amt = Number(r.totalSales||0)
                    if (!id || !amt) return
                    // Accommodation rows contribute to Services; others to Sales
                    if (r.isAccommodation) {
                        if (doc.postingDate) accomDatesInSales.add(doc.postingDate)
                        empServiceMap.set(id, (empServiceMap.get(id)||0) + amt)
                    } else {
                        empSalesMap.set(id, (empSalesMap.get(id)||0) + amt)
                    }
                })
            })
            // Include separate accommodations module only for dates that do NOT appear in sales' accommodation rows
            filterByDate(accommodations, fromDate, toDate).forEach(a=>{
                const rawId = a.employeeId || a.handlerId
                const id = employeeIdResolver(rawId)
                if (locationFilter && a.location && a.location !== locationFilter) return
                if (!id) return
                const ad = (a.postingDate && typeof a.postingDate==='string') ? a.postingDate : (a.date ? String(a.date).slice(0,10) : (a.createdAt ? new Date(Number(a.createdAt)).toISOString().slice(0,10) : ''))
                if (ad && accomDatesInSales.has(ad)) return
                empServiceMap.set(id, (empServiceMap.get(id)||0) + Number(a.accommodationAmount||0))
            })
            filterByDate(rentals, fromDate, toDate).forEach(r=>{
                const rawId = r.employeeId || r.handlerId
                const id = employeeIdResolver(rawId)
                if (locationFilter && r.location && r.location !== locationFilter) return
                if (!id) return
                empServiceMap.set(id, (empServiceMap.get(id)||0) + Number(r.rentalAmount||0))
            })
            const empSalesArr = Array.from(empSalesMap.entries()).map(([employeeId, amount])=>({ employeeId, amount }))
                .filter(e=> !employeeFilter || String(e.employeeId)===String(employeeFilter))
                .sort((a,b)=> b.amount - a.amount).slice(0,5)
            const empServicesArr = Array.from(empServiceMap.entries()).map(([employeeId, amount])=>({ employeeId, amount }))
                .filter(e=> !employeeFilter || String(e.employeeId)===String(employeeFilter))
                .sort((a,b)=> b.amount - a.amount).slice(0,5)
            setTopEmployeesSales(empSalesArr)
            setTopEmployeesServices(empServicesArr)
            
            setSeries(seriesData)

            // 2) After computing everything, persist a snapshot to IndexedDB app cache
            if (cacheKey) {
                const snapshot = {
                    kpis: kpisData,
                    series: seriesData,
                    monthlySeries: monthlyData,
                    revenueMix: revenueMixData,
                    topProducts: topProductsData,
                    topLocations: topLocationsData,
                    topProductsBySales: topSalesProducts,
                    topPurchaseItems: topPurchaseItemsList,
                    productLocationBreakdown: prodLocArr,
                    productLocationSalesBreakdown: prodSalesLocArr,
                    topEmployeesSales: empSalesArr,
                    topEmployeesServices: empServicesArr,
                    topExpenseCategories: topExpenses,
                };
                try {
                    await setAppCache(company, dashboardUserId, cacheKey, snapshot);
                } catch (e) {
                    console.warn('DashView: setAppCache failed', e);
                }
            }

        }catch(err){
            if (dashboardRequestRef.current !== requestId) return
            console.error('[DASHBOARD] Failed to load dashboard data:', err);
            setDashErr('Failed to load dashboard data. Please try again or check the console for details.')
        }finally{
            if (dashboardRequestRef.current === requestId) {
                setLoading(false)
            }
        }
    }

    const sumExpenses = (list, from, to)=>{
        if (!Array.isArray(list)) return { total: 0, topExpenses: [] }
        const fromT = new Date(from).getTime()
        const toT = new Date(to).getTime()
        const expenseMap = new Map() // To track expenses by category
        
        const total = list.reduce((acc, e)=>{
            const d = e.postingDate || e.expensesDate || e.expenseDate || e.createdAt
            const t = (typeof d === 'string') ? new Date(d).getTime() : Number(d||0)
            if (!t || t < fromT || t > toT) return acc
            
            const amount = Number(e.expensesAmount || e.purchaseAmount || e.amount || e.totalAmount || 0)
            if (amount <= 0) return acc
            
            // Track by category if available
            const category = e.expenseCategory || e.category || 'Uncategorized'
            expenseMap.set(category, (expenseMap.get(category) || 0) + amount)
            
            return acc + amount
        }, 0)
        
        // Get top 3 expense categories
        const topExpenses = Array.from(expenseMap.entries())
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3)
        
        return { total, topExpenses }
    }

    const buildExpensesByDate = (list, from, to)=>{
        const map = {}
        if (!Array.isArray(list)) return map
        const fromT = new Date(from).getTime()
        const toT = new Date(to).getTime()
        list.forEach(e=>{
            const d = e.postingDate || e.expensesDate || e.expenseDate || e.createdAt
            const iso = (typeof d === 'string') ? d : new Date(Number(d||0)).toISOString().slice(0,10)
            const t = (typeof d === 'string') ? new Date(d).getTime() : Number(d||0)
            if (!t || t < fromT || t > toT) return
            map[iso] = (map[iso]||0) + Number(e.expensesAmount || e.purchaseAmount || e.amount || e.totalAmount || 0)
        })
        return map
    }

    const sumByDate = (list, from, to, amountField)=>{
        const map = {}
        let total = 0
        if (!Array.isArray(list)) return { total, byDate: map }
        const fromT = new Date(from).getTime()
        const toT = new Date(to).getTime()
        list.forEach(e=>{
            const d = e.postingDate || e.date || e.createdAt
            const iso = (typeof d === 'string') ? d : new Date(Number(d||0)).toISOString().slice(0,10)
            const t = (typeof d === 'string') ? new Date(d).getTime() : Number(d||0)
            if (!t || t < fromT || t > toT) return
            const amt = Number(e[amountField] || e.totalAmount || e.amount || 0)
            map[iso] = (map[iso]||0) + amt
            total += amt
        })
        return { total, byDate: map }
    }

    const sumDebts = (list, from, to)=>{
        let debtTotal = 0, debtRecovered = 0
        if (!Array.isArray(list)) return { debtTotal, debtRecovered }
        filterByDate(list, from, to).forEach(s=>{
            debtTotal += Number(s.totalDebt || s.debt || 0)
            debtRecovered += Number(s.totalDebtRecovered || s.debtRecovered || 0)
        })
        return { debtTotal, debtRecovered }
    }

    useEffect(()=>{
        if (Array.isArray(lastActiveSessions)){
            let activeSessions = lastActiveSessions.filter(s => s.active && getSessionEnd(s.start) <= Date.now())
            let endedCount = (lastActiveSessions?.filter(s => s.end))?.length;
            if (activeSessions.length > 0 && companyRecord?.status === 'admin'){
                setAlertState('info')
                setAlert('Session as ended. Please Stop Session Manager')
                setAlertTimeout(5000)
            }

            if (endedCount && endedCount === lastActiveSessions?.length && companyRecord?.status === 'admin'){
                setAlertState('info')
                setAlert('All sesisons ended, Please Start Session Manager!')
                setAlertTimeout(8000)
            }
        }
    },[salesSessions, lastActiveSessions, companyRecord])

    useEffect(() => {
        loadDashData();        
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromDate, toDate, locationFilter, productFilter, employeeFilter, seasonFilter, company, companyRecord?.emailid])

    useEffect(() => {
        const handleDashboardSummaryUpdate = (event) => {
            const summary = event?.detail?.summary
            if (!summary || event?.detail?.company !== company) return
            const expectedKey = makeDashSummaryKey()
            if (summary.summaryKey !== expectedKey) return
            if (!isUsableDashboardSnapshot(summary.snapshot || {})) return
            setDashboardSummaryKey(summary.summaryKey)
            applyDashSnapshot(summary.snapshot || {})
        }

        window.addEventListener('wc:dashboard-summary-update', handleDashboardSummaryUpdate)
        return () => window.removeEventListener('wc:dashboard-summary-update', handleDashboardSummaryUpdate)
    }, [company, fromDate, toDate, locationFilter, productFilter, employeeFilter, seasonFilter])

    // Single source of truth for low stock — see the state declarations
    // above for why. Grouped by location here only to keep the existing
    // restock-panel JSX (location list -> expand -> product list) working
    // unchanged; the underlying numbers now come from recommend_reorders.
    //
    // This computation (sales-velocity aggregate + stock aggregate) isn't
    // free, and wc:dashboard-summary-update can fire frequently during
    // normal POS activity — calling it unthrottled on every single event
    // made the "Generate PO" button visibly flicker enabled/disabled on
    // every round trip. reorderFetchInFlightRef/lastReorderFetchStartRef
    // throttle background (non-forced) refreshes to at most once every
    // REORDER_REFRESH_THROTTLE_MS. isFirstLoad only affects whether a
    // failure clears the panel — the button's enabled state is driven
    // purely by lastReorderFetchedAt/reorderRecommendations (see the JSX
    // below), so a background refresh never touches it at all.
    const reorderFetchInFlightRef = useRef(false)
    const lastReorderFetchStartRef = useRef(0)
    const loadReorderRecommendations = useCallback(async (options = {}) => {
        if (!company) return
        const force = options.force === true
        if (!force) {
            if (reorderFetchInFlightRef.current) return
            if (Date.now() - lastReorderFetchStartRef.current < REORDER_REFRESH_THROTTLE_MS) return
        }
        reorderFetchInFlightRef.current = true
        lastReorderFetchStartRef.current = Date.now()
        const isFirstLoad = !lastReorderFetchedAt
        try {
            const query = locationFilter ? `?location=${encodeURIComponent(locationFilter)}` : ''
            const resp = await fetchServer('GET', {}, `purchase/recommendReorders${query}`, server)
            if (resp?.err || !resp?.ok || resp?.authorized === false) {
                if (isFirstLoad) setReorderRecommendations([])
                return
            }
            // categoryLooksOffForLocation (recommend_reorders/computeReorderRecommendations,
            // wageserver/UserModule/AIAssistant/purchaseAdvisor.js) flags a
            // recommendation whose product category isn't in that location's own
            // admin-configured allowed-categories list (General Settings >
            // Warehouses) — confirmed live: real kitchen items (Chicken,
            // Native soup, Cat-fish, Goat meat...) were showing up under
            // drinks-only locations (open bar1/bar2/vip) purely from a
            // stock-location-tagging data issue, not a real need there.
            // Epsilon's own purchase-order proposal flow already excludes
            // these; this dashboard widget reads the exact same backend data
            // and needs the same filter, or its per-location counts/lists
            // (and the "no low stock" empty state) lie.
            const recommendations = (Array.isArray(resp.recommendations) ? resp.recommendations : [])
                .filter((rec) => !rec.categoryLooksOffForLocation)
            setReorderRecommendations(recommendations)
            const grouped = {}
            recommendations.forEach((rec) => {
                const location = rec.location || 'Unspecified'
                if (!grouped[location]) grouped[location] = []
                grouped[location].push({
                    id: rec.productId,
                    name: rec.productName,
                    stock: rec.currentStock,
                    threshold: rec.threshold,
                    daysUntilStockout: rec.daysUntilStockout,
                })
            })
            setRestock(Object.entries(grouped).map(([location, lowStockProducts]) => ({ location, lowStockProducts })))
            setLastReorderFetchedAt(Date.now())
        } catch (e) {
            if (isFirstLoad) setReorderRecommendations([])
        } finally {
            reorderFetchInFlightRef.current = false
        }
    }, [company, locationFilter, fetchServer, server, lastReorderFetchedAt])

    useEffect(() => {
        loadReorderRecommendations({ force: true })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [company, locationFilter])

    useEffect(() => {
        const handleRefresh = () => loadReorderRecommendations()
        window.addEventListener('wc:dashboard-summary-update', handleRefresh)
        // wc:dashboard-summary-update only fires once the (separate, cached,
        // debounced) DashboardSummaries rebuild pipeline gets around to it —
        // an indirect, potentially delayed signal for "stock actually
        // changed". wc:inventory-stock-changed (App.js's SSE handling for
        // the Purchase/InventoryTransactions collections — dispatched the
        // moment a receipt or any other stock-moving write lands) is the
        // direct one, confirmed live to be missing before this fix: a just-
        // received PO would not reliably refresh this widget at all.
        // computeReorderRecommendations itself is never cached (a live Mongo
        // aggregation every call, see purchaseAdvisor.js) — the staleness
        // was purely about WHEN this widget re-fetched it, not stale data
        // being returned once it did.
        window.addEventListener('wc:inventory-stock-changed', handleRefresh)
        return () => {
            window.removeEventListener('wc:dashboard-summary-update', handleRefresh)
            window.removeEventListener('wc:inventory-stock-changed', handleRefresh)
        }
    }, [loadReorderRecommendations])

    // Escape closes the low-stock popup — the only close mechanism other
    // modals in this app implement is backdrop-click + an X button (kept
    // below too), but a real popup should also respond to Escape.
    useEffect(() => {
        if (lowStockModalLocation === null) return
        const handleKeyDown = (e) => { if (e.key === 'Escape') setLowStockModalLocation(null) }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [lowStockModalLocation])

    // Opens Epsilon pre-seeded, reusing its already-built
    // recommend_reorders -> propose_purchase_order -> confirm chain rather
    // than writing a second, parallel path to create a Purchase document.
    const handleAutoGeneratePoForInspection = () => {
        window.dispatchEvent(new CustomEvent('wc:epsilon-ask', {
            detail: { question: 'Generate a purchase order for inspection covering the current low-stock items.' },
        }))
    }

    // Helpers to map names
    const productName = useMemo(()=>{
        const map = new Map()
        ;(dashboardMeta.productCatalog || []).forEach(p=>{
            map.set(p.value, p.label || 'Product')
        })
        ;(products||[]).forEach(p=>{
            if (!map.has(p.i_d || p.productId)) {
                map.set(p.i_d || p.productId, p.name || p.productName || p.description || 'Product')
            }
        })
        return (id)=> map.get(id) || id
    },[dashboardMeta.productCatalog, products])

    const employeeName = useMemo(()=>{
        const byId = new Map()
        const byEmail = new Map()
        ;(dashboardMeta.employeeCatalog || []).forEach(e=>{
            if (e?.value) byId.set(String(e.value), e.label || e.value)
        })
        ;(employees||[]).forEach(e=>{
            const parts = [e.firstName, e.otherName, e.lastName].filter(Boolean)
            const fallback = e.fullName || e.name
            const nm = (parts.length ? parts.join(' ') : (fallback||'Employee')).trim()
            if (e.i_d && !byId.has(String(e.i_d))) byId.set(String(e.i_d), `${nm} (${e.i_d})`)
            if (e.emailid && !byEmail.has(String(e.emailid).toLowerCase())) byEmail.set(String(e.emailid).toLowerCase(), `${nm} (${e.i_d||e.emailid})`)
        })
        return (id)=>{
            if (id === undefined || id === null) return 'N/A'
            const k = String(id)
            return byId.get(k) || byEmail.get(k.toLowerCase()) || k
        }
    },[dashboardMeta.employeeCatalog, employees])

    // Resolve any given employee identifier to canonical employee i_d when possible
    const employeeIdResolver = useMemo(()=>{
        const byId = new Map()
        const byEmail = new Map()
        ;(dashboardMeta.employeeCatalog || []).forEach(e=>{
            if (e?.value) byId.set(String(e.value), String(e.value))
        })
        ;(employees||[]).forEach(e=>{
            if (e.i_d && !byId.has(String(e.i_d))) byId.set(String(e.i_d), String(e.i_d))
            if (e.emailid && !byEmail.has(String(e.emailid).toLowerCase())) byEmail.set(String(e.emailid).toLowerCase(), String(e.i_d||e.emailid))
        })
        return (raw)=>{
            if (raw === undefined || raw === null) return undefined
            const k = String(raw)
            return byId.get(k) || byEmail.get(k.toLowerCase()) || k
        }
    },[dashboardMeta.employeeCatalog, employees])

    // Best/Worst sales days based    // Find best and worst days by revenue with detailed analysis
    const { best: bestDay, worst: worstDay, bestDaySales, worstDaySales } = useMemo(()=>{
        if (!Array.isArray(series) || !series.length) return { best:null, worst:null, bestDaySales: null, worstDaySales: null }
        
        // Calculate total revenue per day
        const withRev = series.map(d=>({ 
            date: d.date, 
            rev: Number(d.sales||0) + Number(d.accommodations||0) + Number(d.rentals||0), 
            exp: Number(d.expenses||0),
            sales: Number(d.sales||0),
            accommodations: Number(d.accommodations||0),
            rentals: Number(d.rentals||0),
            dateObj: d.date ? new Date(d.date) : null
        })).filter(d => d.dateObj && !isNaN(d.dateObj.getTime())) // Filter out invalid dates
        
        if (!withRev.length) return { best:null, worst:null, bestDaySales: null, worstDaySales: null }
        
        // Sort by total revenue
        const sortedByRev = [...withRev].sort((a,b) => b.rev - a.rev)
        
        // Sort by sales amount only
        const sortedBySales = [...withRev].sort((a,b) => b.sales - a.sales)
        
        // Format dates for display
        const formatDate = (dateStr) => {
            if (!dateStr) return ''
            const date = new Date(dateStr)
            return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            })
        }
        
        // Analyze best day
        const best = sortedByRev[0]
        const bestSales = sortedBySales[0]
        let bestAnalysis = ''
        if (best) {
            const dayOfWeek = best.dateObj?.toLocaleDateString('en-US', { weekday: 'long' }) || ''
            const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday'
            const isHoliday = false // Could be enhanced with holiday checking
            
            bestAnalysis = `${isWeekend ? 'Weekend' : 'Weekday'} (${dayOfWeek})`
            if (best.accommodations / best.rev > 0.5) bestAnalysis += ', strong accommodation sales'
            if (best.rentals / best.rev > 0.3) bestAnalysis += ', high rental volume'
            if (best.exp > best.rev * 0.5) bestAnalysis += ', high marketing spend'
            if (isHoliday) bestAnalysis += ', holiday period'
        }
        
        // Analyze worst day
        const worst = sortedByRev[sortedByRev.length - 1]
        const worstSales = sortedBySales[sortedBySales.length - 1]
        let worstAnalysis = ''
        if (worst) {
            const dayOfWeek = worst.dateObj?.toLocaleDateString('en-US', { weekday: 'long' }) || ''
            const isWeekday = !['Saturday', 'Sunday'].includes(dayOfWeek)
            const isHoliday = false // Could be enhanced with holiday checking
            
            worstAnalysis = `${isWeekday ? 'Weekday' : 'Weekend'} (${dayOfWeek})`
            if (worst.rev === 0) {
                worstAnalysis += ', no sales recorded'
            } else {
                if (worst.exp === 0) worstAnalysis += ', no marketing spend'
                if (worst.accommodations === 0) worstAnalysis += ', no accommodation sales'
                if (worst.rentals === 0) worstAnalysis += ', no rentals'
                if (isHoliday) worstAnalysis += ', holiday period'
            }
        }
        
        return { 
            best: best ? { ...best, formattedDate: formatDate(best.date), analysis: bestAnalysis } : null, 
            worst: worst ? { ...worst, formattedDate: formatDate(worst.date), analysis: worstAnalysis } : null,
            bestDaySales: bestSales ? { ...bestSales, formattedDate: formatDate(bestSales.date) } : null,
            worstDaySales: worstSales ? { ...worstSales, formattedDate: formatDate(worstSales.date) } : null
        }
    },[series])

    // Build filter option lists
    const locationOptions = useMemo(()=>{
        if (dashboardMeta.locationOptions?.length) {
            return dashboardMeta.locationOptions
        }
        const set = new Set()
        // from products stock map
        ;(products||[]).forEach(p=>{
            Object.keys(p.locationStock||{}).forEach(l=>{ if (l) set.add(l) })
        })
        // from transactional modules
        // console.log(sales)
        ;(sales||[]).forEach(s=>{ if (s.location) set.add(s.location) })
        ;(accommodations||[]).forEach(a=>{ if (a.location) set.add(a.location) })
        ;(rentals||[]).forEach(r=>{ if (r.location) set.add(r.location) })
        return Array.from(set).sort()
    },[dashboardMeta.locationOptions, products, sales, accommodations, rentals])

    const productOptions = useMemo(()=>{
        if (dashboardMeta.productOptions?.length) {
            return dashboardMeta.productOptions
        }
        return (products||[]).map(p=>({ value: p.i_d || p.productId, label: p.name || p.productName || p.description || 'Product' }))
    },[dashboardMeta.productOptions, products])

    const employeeOptions = useMemo(()=>{
        if (dashboardMeta.employeeOptions?.length) {
            return dashboardMeta.employeeOptions
        }
        return (employees||[]).map(emp=>{
            const parts = [emp.firstName, emp.otherName, emp.lastName].filter(Boolean)
            const fallback = emp.fullName || emp.name
            const label = (parts.length ? parts.join(' ') : (fallback||'Employee')).trim()
            return { value: String(emp.i_d || ''), label: `${label} (${emp.i_d||emp.emailid||''})` }
        }).filter(e=> e.value)
    },[dashboardMeta.employeeOptions, employees])

    return(
        <>
            <div className='dashview'>
                {/* Receipts Modal Trigger State */}
                <PaymentReceiptsModal open={showReceiptsModal} onClose={()=>setShowReceiptsModal(false)} paymentReceipts={dashboardReceipts} />
                {/* Filters */}
                <div className='dash-filters'>
                    <div className='filter-group1'>
                        <label>From</label>
                        <input type='date' value={draftFromDate} onChange={e=>setDraftFromDate(e.target.value)} />
                    </div>
                    <div className='filter-group1'>
                        <label>To</label>
                        <input type='date' value={draftToDate} onChange={e=>setDraftToDate(e.target.value)} />
                    </div>
                    <div className='filter-group1'>
                        <label>Presets</label>
                        <div className='btn-group' style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                            <button className='btn-secondary' onClick={()=>{ const d=new Date(); const s=d.toISOString().slice(0,10); setDraftFromDate(s); setDraftToDate(s); setFromDate(s); setToDate(s) }}>Today</button>
                            <button className='btn-secondary' onClick={()=>{ const now=new Date(); const s=new Date(now.getFullYear(), now.getMonth(), 2).toISOString().slice(0,10); const e=new Date(now.getFullYear(), now.getMonth()+1, 1).toISOString().slice(0,10); setDraftFromDate(s); setDraftToDate(e); setFromDate(s); setToDate(e) }}>MTD</button>
                            <button className='btn-secondary' onClick={()=>{ const now=new Date(); const q=Math.floor(now.getMonth()/3); const s=new Date(now.getFullYear(), q*3, 2).toISOString().slice(0,10); const e=new Date(now.getFullYear(), q*3+3, 1).toISOString().slice(0,10); setDraftFromDate(s); setDraftToDate(e); setFromDate(s); setToDate(e) }}>QTD</button>
                            <button className='btn-secondary' onClick={()=>{ const now=new Date(); const s=new Date(now.getFullYear(), 0, 2).toISOString().slice(0,10); const e=new Date(now.getFullYear(), 11, 32).toISOString().slice(0,10); setDraftFromDate(s); setDraftToDate(e); setFromDate(s); setToDate(e) }}>YTD</button>
                            <button className='btn-secondary' onClick={handleApplyDateFilters} disabled={!draftFromDate || !draftToDate || (draftFromDate === fromDate && draftToDate === toDate)}>Apply Dates</button>
                            <button className='btn-secondary' onClick={handleClearFilters}>Clear All Filters</button>
                        </div>
                    </div>
                    <div className='filter-group1'>
                        <label>Location</label>
                        <select value={locationFilter} onChange={e=>setLocationFilter(e.target.value)}>
                            <option value=''>All</option>
                            {locationOptions.map((l,i)=>(<option value={l} key={i}>{l}</option>))}
                        </select>
                    </div>
                    <div className='filter-group1'>
                        <label>Product</label>
                        <select value={productFilter} onChange={e=>setProductFilter(e.target.value)}>
                            <option value=''>All</option>
                            {productOptions.map(p=>(<option value={p.value} key={p.value}>{p.label}</option>))}
                        </select>
                    </div>
                    <div className='filter-group1'>
                        <label>Employee</label>
                        <select value={employeeFilter} onChange={e=>setEmployeeFilter(e.target.value)}>
                            <option value=''>All</option>
                            {employeeOptions.map(eo=>(<option value={eo.value} key={eo.value}>{eo.label}</option>))}
                        </select>
                    </div>
                    <div className='filter-group1'>
                        <label>Season</label>
                        <select value={seasonFilter} onChange={e => handleSeasonChange(e.target.value)}>
                            <option value=''>All</option>
                            <option value='Q1'>Q1 (Jan-Mar)</option>
                            <option value='Q2'>Q2 (Apr-Jun)</option>
                            <option value='Q3'>Q3 (Jul-Sep)</option>
                            <option value='Q4'>Q4 (Oct-Dec)</option>
                        </select>
                    </div>
                    <button className='btn-primary' onClick={() => loadDashData(true)} disabled={loading}>{loading?'Loading...':'Refresh'}</button>
                </div>

                {dashErr && (
                    <div className='dash-error' style={{
                        background: '#fff1f0', 
                        border: '1px solid #ffa39e', 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        color: '#cf1322',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontWeight: '500'
                    }}>
                        <FaExclamationTriangle style={{fontSize: '20px'}} />
                        <span>{dashErr}</span>
                    </div>
                )}

                {/* Alerts & Notifications Section */}
                <div className='section-header'>
                    <h2><FaBell className='icon' /> Alerts & Notifications</h2>
                </div>
                
                <div className='alert-section'> 
                        {/* Access Payment Receipts Alert */}
                        <div className='alert-panel payment-receipts-alert' style={{marginBottom: '24px', background: '#f0f4f2', border: '2px solid #173829', borderRadius: '10px', cursor: 'pointer', padding: '16px', boxSizing: 'border-box', width: '100%', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'stretch'}} onClick={()=>{
                            window.scrollTo({
                                top: 0,
                                left: 0,
                                behavior: "smooth"
                            });
                            setShowReceiptsModal(true)
                        }}>
                            <h3 style={{display:'flex',alignItems:'center',flexWrap:'wrap',fontSize:'1.15em',marginBottom:'12px', color: '#173829'}}><FaInfoCircle style={{color:'#173829',marginRight:8}}/> Access Payment Receipts</h3>
                            <div style={{display:'flex',flexWrap:'wrap',gap:'16px',justifyContent:'space-between',marginTop:'4px',marginBottom:'8px'}}>
                                    <div style={{flex:'1 1 120px',minWidth:'120px',fontWeight:'bold',color:'#173829',textAlign:'center',padding:'8px 0'}}>
                                            Recovery<br/><span style={{color:'#173829',fontWeight:'600',fontSize:'1.2em'}}>{dashboardReceipts.filter(r=>r.paymentModule==='recovery').length}</span>
                                    </div>
                                    <div style={{flex:'1 1 120px',minWidth:'120px',fontWeight:'bold',color:'#173829',textAlign:'center',padding:'8px 0'}}>
                                            Accommodation<br/><span style={{color:'#173829',fontWeight:'600',fontSize:'1.2em'}}>{dashboardReceipts.filter(r=>r.paymentModule==='accommodation').length}</span>
                                    </div>
                                    <div style={{flex:'1 1 120px',minWidth:'120px',fontWeight:'bold',color:'#173829',textAlign:'center',padding:'8px 0'}}>
                                            POS<br/><span style={{color:'#173829',fontWeight:'600',fontSize:'1.2em'}}>{dashboardReceipts.filter(r=>String(r.paymentModule || '').split(' ').includes('POS')).length}</span>
                                    </div>
                            </div>
                            {/* Duplicates by payPoint summary */}
                            {/* <div style={{margin:'10px 0',padding:'8px',background:'#fff',borderRadius:'8px',boxShadow:'0 2px 8px rgba(25,118,210,0.06)',color:'#1976d2',fontWeight:'bold',fontSize:'0.98em'}}>
                                {(() => {
                                    // Group by payPoint and count duplicate receipts
                                    const payPointMap = {};
                                    dashboardReceipts.forEach(r => {
                                        if (!r.paymentReceipt || !(r.payPoint || r.paymentPoint)) return;
                                        const key = r.payPoint || r.paymentPoint;
                                        if (!payPointMap[key]) payPointMap[key] = {};
                                        payPointMap[key][r.paymentReceipt] = (payPointMap[key][r.paymentReceipt] || 0) + 1;
                                    });
                                    const summary = Object.entries(payPointMap).map(([payPoint, receipts]) => {
                                        const dupCount = Object.values(receipts).filter(count => count > 1).reduce((a,b)=>a+b,0);
                                        return { payPoint, dupCount };
                                    }).filter(s => s.dupCount > 0);
                                    if (summary.length === 0) return 'No duplicate receipts found by payPoint.';
                                    return (
                                        <span>
                                            Duplicate Receipts by PayPoint:<br/>
                                            {summary.map(s => (
                                                <span key={s.payPoint} style={{display:'block',margin:'2px 0'}}>PayPoint <b>{s.payPoint}</b>: <span style={{color:'#d32f2f'}}>{s.dupCount}</span> duplicate{(s.dupCount>1)?'s':''}</span>
                                            ))}
                                        </span>
                                    );
                                })()}
                            </div> */}
                            <div style={{fontSize:'0.95em',color:'#555',marginTop:'4px',textAlign:'center'}}>Click to view, filter, and manage all payment receipts</div>
                        </div>
                        
                    {/* Low Stock Alerts */}
                    <div className='alert-panel'>
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px'}}>
                            <h3><FaExclamationTriangle className='icon' /> Stock Alerts</h3>
                            <button
                                type='button'
                                onClick={handleAutoGeneratePoForInspection}
                                // Driven only by whether data has ever loaded / is non-empty —
                                // a background SSE-triggered refresh (see loadReorderRecommendations)
                                // never toggles a separate loading flag, so this never flickers.
                                disabled={!lastReorderFetchedAt || reorderRecommendations.length === 0}
                                title={!lastReorderFetchedAt ? 'Waiting for current stock data to load…' : reorderRecommendations.length === 0 ? 'Nothing currently below its reorder threshold' : 'Ask Epsilon to draft a purchase order for these items'}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #173829',
                                    background: (!lastReorderFetchedAt || reorderRecommendations.length === 0) ? '#f0f3f1' : '#173829',
                                    color: (!lastReorderFetchedAt || reorderRecommendations.length === 0) ? '#9aa89f' : '#fff',
                                    fontWeight: 700,
                                    fontSize: '0.85em',
                                    cursor: (!lastReorderFetchedAt || reorderRecommendations.length === 0) ? 'default' : 'pointer',
                                }}
                            >
                                Automatically Generate PO for Inspection
                            </button>
                        </div>
                        <div className='alert-content'>
                                {/* A location box used to expand its item list inline, right in the
                                    dashboard flow — pushing everything below it down and changing the
                                    panel's height/shape every time (confirmed live: "distorting the
                                    dashboard size and shape"). Now it just opens a popup instead; the
                                    dashboard layout never moves. */}
                                {restock.length > 0 ? (
                                    <div className='location-labels-row' style={{display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px'}}>
                                        {restock.map((locAlert, locIdx) => (
                                            <div
                                                key={`location-label-${locIdx}`}
                                                className='location-label'
                                                style={{
                                              fontWeight: 'bold',
                                              cursor: 'pointer',
                                              padding: '8px 16px',
                                              borderRadius: '6px',
                                              background: '#fff',
                                              border: '1px solid #ddd',
                                                }}
                                                onClick={() => setLowStockModalLocation(locAlert.location)}
                                            >
                                                {locAlert.location} <span style={{color:'#c00', fontWeight:'normal'}}>({locAlert.lowStockProducts.length})</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className='no-alerts'>No low stock items by location</div>
                                )}

                                {lowStockModalLocation !== null && (() => {
                                    // Looked up by name, live, every render — not captured once at
                                    // click time — so if this widget refreshes while the popup is
                                    // open (e.g. a PO for this exact location just got received),
                                    // what's shown updates or clears itself instead of going stale.
                                    const activeLocAlert = restock.find((r) => r.location === lowStockModalLocation)
                                    return (
                                        <div className='dash-lowstock-modal-overlay' onClick={() => setLowStockModalLocation(null)}>
                                            <div className='dash-lowstock-modal-content' onClick={(e) => e.stopPropagation()} role='dialog' aria-modal='true' aria-label={`Low stock at ${lowStockModalLocation}`}>
                                                <div className='dash-lowstock-modal-header'>
                                                    <h4>{lowStockModalLocation}{activeLocAlert ? ` — ${activeLocAlert.lowStockProducts.length} low stock item${activeLocAlert.lowStockProducts.length === 1 ? '' : 's'}` : ''}</h4>
                                                    <button
                                                        type='button'
                                                        className='dash-lowstock-modal-close'
                                                        onClick={() => setLowStockModalLocation(null)}
                                                        aria-label='Close'
                                                        title='Close'
                                                    >&times;</button>
                                                </div>
                                                <div className='dash-lowstock-modal-body'>
                                                    <div className='alert-items'>
                                                        {activeLocAlert && activeLocAlert.lowStockProducts.length > 0 ? (
                                                            activeLocAlert.lowStockProducts.map((item, idx) => (
                                                                <div key={`low-stock-${lowStockModalLocation}-${idx}`} className='alert-item'>
                                                                    <span className='alert-item-name'>{item.name}</span>
                                                                    <span className='alert-item-detail'>Stock: {fmt(item.stock)} (Reorder at: {Math.ceil(item.threshold)})</span>
                                                                    <span className='alert-item-detail'>{item.daysUntilStockout !== null && item.daysUntilStockout !== undefined ? `Runs out in ~${item.daysUntilStockout} day${item.daysUntilStockout === 1 ? '' : 's'} at current sales pace` : 'No recent sales pace to estimate runout'}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className='no-alerts'>Nothing here is low on stock anymore.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })()}

                            {/* Price Discrepancy Alerts */}
                            {(() => {
                                const priceIssues = dashboardMeta.priceIssues?.length
                                    ? dashboardMeta.priceIssues
                                    : (products?.filter(p => 
                                        p.costPrice > 0 && p.salesPrice > 0 && p.costPrice > p.salesPrice
                                    ).slice(0, 5) || []);
                                
                                return priceIssues.length > 0 ? (
                                    <div className='alert-category'>
                                        <h4>Price Discrepancies ({priceIssues.length})</h4>
                                        <div className='alert-items'>
                                            {priceIssues.map((item, idx) => (
                                                <div key={`price-issue-${idx}`} className='alert-item warning'>
                                                    <span className='alert-item-name'>{item.label || item.name || 'Unnamed Product'}</span>
                                                    <span className='alert-item-detail'>
                                                        {`Cost: ₦${fmt(item.costPrice)} > Sales: ₦${fmt(item.salesPrice)}`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    </div>

                    {/* POS Sessions */}
                    <div className='alert-panel'>
                        <h3><FaStore className='icon' /> POS Sessions</h3>
                        <div className='alert-content'>
                            {posSessions.activeSessions.length > 0 ? (
                                <div className='alert-category'>
                                    <h4>Active Sessions ({posSessions.activeSessions.length})</h4>
                                    <div className='alert-items'>
                                        {posSessions.activeSessions.slice(0, 3).map((session, idx) => (
                                            <div key={`active-${idx}`} className='alert-item success'>
                                                <span className='alert-item-name'>{session.wrh || 'Unknown Location'}</span>
                                                <span className='alert-item-detail'>
                                                    Started: {new Date(session.start).toLocaleString()}
                                                    {employeeName(session.employee_id) && ` for ${employeeName(session.employee_id)}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className='no-alerts'>No active POS sessions</div>
                            )}

                            {posSessions.lastActiveSessions.length > 0 && (
                                <div className='alert-category'>
                                    <h4>Last Active by Location</h4>
                                    <div className='alert-items'>
                                        {posSessions.lastActiveSessions.slice(0, 3).map((session, idx) => (
                                            <div key={`last-${idx}`} className='alert-item'>
                                                <span className='alert-item-name'>{session.wrh || 'Unknown Location'}</span>
                                                <span className='alert-item-detail'>
                                                    {session.end 
                                                        ? `Ended: ${new Date(session.end).toLocaleString()}` 
                                                        : `Started: ${new Date(session.start).toLocaleString()}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Delivery Sessions */}
                    <div className='alert-panel'>
                        <h3><FaTruck className='icon' /> Delivery Sessions</h3>
                        <div className='alert-content'>
                            {posSessions.lastDeliverySessions.length > 0 ? (
                                <div className='alert-items'>
                                    {posSessions.lastDeliverySessions.map((session, idx) => (
                                        <div key={`delivery-${idx}`} className='alert-item'>
                                            <span className='alert-item-name'>
                                                {session.active === true ? '🟢 ' : '⚪ '}
                                                {employeeName(session.employee_id) || `Delivery #${idx + 1}`}
                                            </span>
                                            <span className='alert-item-detail'>
                                                {session.active === true ? 'Active' : 'Inactive'} • {session.wrh || 'No address'}
                                            </span>
                                            <span className='alert-item-time'>
                                                {new Date(session.end || session.start).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className='no-alerts'>No recent delivery sessions</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Financial Overview */}
                <div className='section-header'>
                    <h2><FaChartLine className='icon' /> Financial Overview</h2>
                </div>
                    
                <div className='financial-summary'>
                    <div className='financial-card'>
                        <h3>Total Revenue</h3>
                        <div className='amount'>₦ {fmt((kpis.salesAmount || 0) + (kpis.accommodationsAmount || 0) + (kpis.rentalsAmount || 0))}</div>
                    </div>
                    {/* <div className='financial-card'>
                        <h3>Sales</h3>
                        <div className='amount'>₦ {fmt(kpis.salesAmount || 0)}</div>
                    </div> */}
                    <div className='financial-card' onClick={()=>{
                        navigate('/inventory')
                    }}>
                        <h3>COGS</h3>
                        <div className='amount'>₦ {fmt(kpis.cogs || 0)}</div>
                    </div>
                    <div className='financial-card'>
                        <h3>Gross Profit</h3>
                        <div className={`amount ${(kpis.grossProfit || 0) >= 0 ? 'profit' : 'loss'}`}>
                            ₦ {fmt(kpis.grossProfit || 0)}
                        </div>
                    </div>
                    <div className='financial-card' onClick={()=>{
                        navigate('/expenses')
                    }}>
                        <h3>Total Expenses</h3>
                        <div className='amount'>₦ {fmt(kpis.expensesAmount || 0)}</div>
                    </div> 
                    <div className='financial-card'>
                        <h3>Net Profit</h3>
                        <div className={`amount ${(kpis.netProfit || 0) >= 0 ? 'profit' : 'loss'}`}
                            style={{color: (kpis.netProfit||0) < 0 ? '#da1e28' : '#24a148'}}    
                        >
                            ₦ {fmt(kpis.netProfit || 0)}
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                <div className='kpi-grid'>
                    <div className='kpi-card' onClick={()=>{
                        navigate('/inventory')
                    }}>
                        <div className='kpi-label'>Product Sales Amount</div>
                        <div className='kpi-value'>₦ {fmt(kpis.salesAmount)}</div>
                        <div className='kpi-sub'>{fmt(kpis.salesQty)} units</div>
                        {topProductsBySales.length > 0 && (
                            <div className='kpi-sub' style={{fontSize: '0.8em'}}>
                                {topProductsBySales.map((prod, i) => (
                                    <div key={i} style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                        {prod.name}: ₦{fmt(prod.amount)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className='kpi-card' onClick={()=>{
                        navigate('/accommodations')
                    }}>
                        <div className='kpi-label'>Accommodations</div>
                        <div className='kpi-value'>₦ {fmt(kpis.accommodationsAmount)}</div>
                    </div>
                    <div className='kpi-card' onClick={()=>{
                        navigate('/sales')
                    }}>
                        <div className='kpi-label' >Rentals</div>
                        <div className='kpi-value'>₦ {fmt(kpis.rentalsAmount)}</div>
                    </div>
                    <div className='kpi-card' onClick={()=>{
                        navigate('/sales')
                    }}> 
                        <div className='kpi-label'>Debts</div>
                        <div className='kpi-value'>₦ {fmt(kpis.debtTotal)}</div>
                        <div className='kpi-sub'>Recovered: ₦ {fmt(kpis.debtRecovered)}</div>
                    </div>
                    <div className='kpi-card' onClick={()=>{
                        navigate('/inventory')
                    }}>
                        <div className='kpi-label'>Inventory</div>
                        <div className='kpi-value'>{fmt(kpis.inventoryQty)} units</div>
                        <div className='kpi-sub'>₦ {fmt(kpis.inventoryValue)} (Cost value)</div>
                        <div className='kpi-sub'>₦ {fmt(kpis.inventorySales)} (Retail value of stock on hand)</div>
                    </div>
                    <div className='kpi-card' onClick={()=>{
                        navigate('/purchase')
                    }}>
                        <div className='kpi-label'>Direct Purchases</div>
                        <div className='kpi-value'>₦ {fmt(kpis.purchasesAmount)}</div>
                        <div className='kpi-sub'>{fmt(kpis.purchasesQty)} units</div>
                        {topPurchaseItems.length > 0 && (
                            <div className='kpi-sub' style={{fontSize: '0.8em'}}>
                                {topPurchaseItems.map((item, i) => (
                                    <div key={i} style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                        {item.name}: ₦{fmt(item.amount)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>             
                    <div className='kpi-card'>
                        <div className='kpi-label'>Gross Profit</div>
                        <div className='kpi-value'>₦ {fmt(kpis.grossProfit||0)}</div>
                    </div>
                    <div className='kpi-card' onClick={()=>{
                        navigate('/expenses')
                    }}>
                        <div className='kpi-label'>Expenses</div>
                        <div className='kpi-value'>₦ {fmt(kpis.expensesAmount)}</div>
                        {topExpenseCategories.length > 0 && (
                            <div className='kpi-sub' style={{fontSize: '0.8em', marginTop: '4px'}}>
                                {topExpenseCategories.map((exp, i) => (
                                    <div key={i} style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                        {exp.name}: ₦{fmt(exp.amount)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>  
                    <div className='kpi-card'>
                        <div className='kpi-label'>Net Profit</div>
                        <div className='kpi-value' style={{color: (kpis.netProfit||0) < 0 ? '#da1e28' : '#24a148'}}>₦ {fmt(kpis.netProfit||0)}</div>
                    </div>
                </div>

                {/* Panels */}
                <div className='panel-grid'>
                    <div className='panel'>
                        <div className='panel-title'>Sales vs Expenses vs Purchases (incl. Accommodation & Rentals)</div>
                        <div style={{width:'100%', height:300}}>
                            <ResponsiveContainer>
                                <AreaChart data={series} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#173829" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#173829" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#da1e28" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#da1e28" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#24a148" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#24a148" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorAccom" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#41755a" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#41755a" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorRentals" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#739985" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#739985" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" interval={0} angle={-20} textAnchor="end" height={60} />
                                    <YAxis width={90} tickFormatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} domain={[0, 'auto']} allowDecimals={false} />
                                    <Tooltip formatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} />
                                    <Legend />
                                    <Area type="monotone" dataKey="sales" stroke="#173829" fillOpacity={1} fill="url(#colorSales)" name="Sales" />
                                    <Area type="monotone" dataKey="expenses" stroke="#da1e28" fillOpacity={1} fill="url(#colorExpenses)" name="Expenses" />
                                    <Area type="monotone" dataKey="purchases" stroke="#24a148" fillOpacity={1} fill="url(#colorPurchases)" name="Purchases" />
                                    <Area type="monotone" dataKey="accommodations" stroke="#41755a" fillOpacity={1} fill="url(#colorAccom)" name="Accommodations" />
                                    <Area type="monotone" dataKey="rentals" stroke="#739985" fillOpacity={1} fill="url(#colorRentals)" name="Rentals" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className='panel'>
                        <div className='panel-title'>Monthly Performance ({new Date(fromDate).getFullYear()})</div>
                        <div style={{width:'100%', height:350}}>
                            <ResponsiveContainer>
                                <BarChart 
                                    data={monthlySeries} 
                                    margin={{top:20, right:20, left:10, bottom:40}}
                                    barGap={0}
                                    barCategoryGap="10%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="month" 
                                        interval={0}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis 
                                        width={90} 
                                        tickFormatter={(v)=>`₦${Number(v).toLocaleString()}`} 
                                        domain={[0, 'auto']}
                                        allowDecimals={false}
                                    />
                                    <Tooltip 
                                        formatter={(value, name) => [`₦${Number(value).toLocaleString()}`, name]}
                                        labelFormatter={(label) => `${label} ${new Date(fromDate).getFullYear()}`}
                                    />
                                    <Legend />
                                    <Bar dataKey="sales" stackId="rev" fill="#173829" name="Sales" />
                                    <Bar dataKey="accommodations" stackId="rev" fill="#41755a" name="Accommodation" />
                                    <Bar dataKey="rentals" stackId="rev" fill="#739985" name="Rentals" />
                                    <Bar dataKey="purchases" stackId="cost" fill="#24a148" name="Purchases" />
                                    <Bar dataKey="expenses" stackId="cost" fill="#da1e28" name="Expenses" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className='panel'>
                        <div className='panel-title'>Top Selling Products (Qty)</div>
                        <div style={{width:'100%', height:300}}>
                            <ResponsiveContainer>
                                <BarChart data={topProducts.map(p=>({ name: productName(p.pid), qty: p.qty }))} margin={{ top: 10, right: 40, left: 10, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                                    <YAxis width={90} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="qty" fill="#24a148" name="Qty" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className='panel'>
                        <div className='panel-title'>Top Selling Products (Sales Amount)</div>
                        <div style={{width:'100%', height:300}}>
                            <ResponsiveContainer>
                                <BarChart 
                                    data={productLocationSalesBreakdown
                                        .sort((a, b) => b.totalAmount - a.totalAmount)
                                        .slice(0, 10)
                                        .map(p => ({
                                            name: p.name,
                                            amount: p.totalAmount,
                                            formattedAmount: `₦${fmt(p.totalAmount)}`
                                        }))}
                                    margin={{ top: 10, right: 40, left: 10, bottom: 40 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="name" 
                                        interval={0} 
                                        angle={-20} 
                                        textAnchor="end" 
                                        height={60} 
                                    />
                                    <YAxis 
                                        width={90} 
                                        tickFormatter={(value) => `₦${fmt(value)}`}
                                    />
                                    <Tooltip 
                                        formatter={(value) => [`₦${fmt(value)}`, 'Sales Amount']}
                                        labelFormatter={(name) => `Product: ${name}`}
                                    />
                                    <Bar 
                                        dataKey="amount" 
                                        fill="#173829" 
                                        name="Sales Amount"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className='panel'>
                        <div className='panel-title'>Top Locations (Sales Amount)</div>
                        <div style={{width:'100%', height:280}}>
                            <ResponsiveContainer>
                                <BarChart data={topLocations} margin={{ top: 10, right: 40, left: 10, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="location" interval={0} angle={-20} textAnchor="end" height={60} />
                                    <YAxis width={90} tickFormatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} domain={[0, 'auto']} allowDecimals={false} />
                                    <Tooltip formatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} />
                                    <Bar dataKey="amount" fill="#173829" name="Amount (₦)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className='panel'>
                        <div className='panel-title'>Top Employees - Sales</div>
                        <div style={{width:'100%', height:300}}>
                            <ResponsiveContainer>
                                <BarChart data={topEmployeesSales.map(e=>({ name: employeeName(e.employeeId), amount: e.amount }))} margin={{ top: 10, right: 40, left: 10, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                                    <YAxis width={90} tickFormatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} domain={[0, 'auto']} allowDecimals={false} />
                                    <Tooltip formatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} />
                                    <Bar dataKey="amount" fill="#41755a" name="Amount" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className='panel'>
                        <div className='panel-title'>Top Employees - Accommodation + Rentals</div>
                        <div style={{width:'100%', height:300}}>
                            <ResponsiveContainer>
                                <BarChart data={topEmployeesServices.map(e=>({ name: employeeName(e.employeeId), amount: e.amount }))} margin={{ top: 10, right: 40, left: 10, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                                    <YAxis width={90} tickFormatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} domain={[0, 'auto']} allowDecimals={false} />
                                    <Tooltip formatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} />
                                    <Bar dataKey="amount" fill="#739985" name="Amount" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className='panel'>
                        <div className='panel-title'>Revenue Mix</div>
                        <div style={{width:'100%', height:260}}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Tooltip formatter={(v)=>`₦ ${fmt(v)}`} />
                                    <Legend />
                                    <Pie dataKey="value" data={revenueMix} nameKey="name" outerRadius={80} label>
                                        {revenueMix.map((e,i)=> <Cell key={`c-${i}`} fill={["#173829","#41755a","#739985"][i%3]} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>                    

                    <div className='panel'>
                        <div className='panel-title'>Top Products by Location (Qty)</div>
                        <div className='list-table'>
                            <div className='list-head'>
                                <div>Product</div>
                                <div>Location</div>
                                <div>Qty</div>
                            </div>
                            {productLocationBreakdown.flatMap((pl)=> pl.locations.map((l,idx)=> (
                                <div className='list-row' key={`qty-${pl.pid}-${l.location}-${idx}`}>
                                    <div>{pl.name}</div>
                                    <div>{l.location}</div>
                                    <div>{fmt(l.qty)}</div>
                                </div>
                            )))}
                            {!productLocationBreakdown.length && <div className='empty-row'>No data</div>}
                        </div>
                    </div>

                    <div className='panel'>
                        <div className='panel-title'>Top Products by Location (Sales Amount)</div>
                        <div className='list-table'>
                            <div className='list-head'>
                                <div>Product</div>
                                <div>Location</div>
                                <div>Amount (₦)</div>
                            </div>
                            {productLocationSalesBreakdown.flatMap((pl)=> pl.locations.map((l,idx)=> (
                                <div className='list-row' key={`amt-${pl.pid}-${l.location}-${idx}`}>
                                    <div>{pl.name}</div>
                                    <div>{l.location}</div>
                                    <div>₦ {fmt(l.amount)}</div>
                                </div>
                            )))}
                            {!productLocationSalesBreakdown.length && <div className='empty-row'>No data</div>}
                        </div>
                    </div>

                    <div className='panel'>
                        <div className='panel-title'>Insights</div>
                        <ul className='insights'>
                            <li className='insight-item'>{`Revenue (Sales+Accom+Rentals): ₦ ${fmt((kpis.salesAmount||0)+(kpis.accommodationsAmount||0)+(kpis.rentalsAmount||0))}. COGS: ₦ ${fmt(kpis.cogs||0)}. Gross Profit: ₦ ${fmt(kpis.grossProfit||0)}. Expenses: ₦ ${fmt(kpis.expensesAmount||0)}. Net Profit: ₦ ${fmt(kpis.netProfit||0)}.`}</li>
                            
                            {/* Top Product by Sales Amount */}
                            {productLocationSalesBreakdown[0]?.totalAmount > 0 && (
                                <li className='insight-item'>
                                    {`Top product by revenue: ${productLocationSalesBreakdown[0]?.name} (₦ ${fmt(productLocationSalesBreakdown[0]?.totalAmount)})`}
                                </li>
                            )}
                            
                            {/* Best/Worst Days */}
                            {bestDay && (
                                <li className='insight-item'>
                                    {`Best day: ${bestDay.formattedDate} (₦ ${fmt(bestDay.rev)}) - ${bestDay.analysis}.`}
                                </li>
                            )}
                            {worstDay && worstDay.rev > 0 && (
                                <li className='insight-item'>
                                    {`Worst day: ${worstDay.formattedDate} (₦ ${fmt(worstDay.rev)}) - ${worstDay.analysis}.`}
                                </li>
                            )}
                            {bestDaySales && bestDaySales.sales > 0 && (
                                <li className='insight-item'>
                                    {`Highest sales day: ${bestDaySales.formattedDate} (₦ ${fmt(bestDaySales.sales)} in sales).`}
                                </li>
                            )}
                            {worstDaySales && worstDaySales.sales === 0 && (
                                <li className='insight-item'>
                                    {`No sales recorded on ${worstDaySales.formattedDate}. Consider promotions or events.`}
                                </li>
                            )}
                            
                            {/* Other Insights */}
                            <li className='insight-item'>{topLocations[0]?`Best location: ${topLocations[0].location} (₦ ${fmt(topLocations[0].amount)}).`:'Best location: N/A'}</li>
                            <li className='insight-item'>{topEmployeesSales[0]?`Top sales employee: ${employeeName(topEmployeesSales[0].employeeId)} (₦ ${fmt(topEmployeesSales[0].amount)}).`:'Top sales employee: N/A'}</li>
                            <li className='insight-item'>{topEmployeesSales[1]?`Second top sales employee: ${employeeName(topEmployeesSales[1].employeeId)} (₦ ${fmt(topEmployeesSales[1].amount)}).`:'Top sales employee: N/A'}</li>
                            <li className='insight-item'>{topEmployeesServices[0]?`Top services employee: ${employeeName(topEmployeesServices[0].employeeId)} (₦ ${fmt(topEmployeesServices[0].amount)}).`:'Top services employee: N/A'}</li>
                            
                            {/* Financial Alerts */}
                            {(kpis.debtTotal||0) > 0 && (
                                <li className='insight-item'>{`Debts outstanding: ₦ ${fmt(kpis.debtTotal - (kpis.debtRecovered||0))}. Prioritize recovery.`}</li>
                            )}
                            {(kpis.netProfit||0) < 0 && (
                                <li className='insight-item'>Loss detected: Tighten expense controls, review pricing/COGS; push high-margin items; reduce low-turnover stock.</li>
                            )}
                            {(kpis.netProfit||0) >= 0 && (
                                <li className='insight-item'>Profit achieved: Scale best-sellers, keep 14+ days stock, replicate best locations/employees tactics.</li>
                            )}
                            {monthlySeries.some(m => m.expenses > m.sales) && (
                                <li className='insight-item'>Alert: Some months have expenses exceeding sales. Investigate cost drivers.</li>
                            )}
                            {monthlySeries.some(m => m.sales === 0 && (m.purchases > 0 || m.expenses > 0)) && (
                                <li className='insight-item'>Low activity: Months with spend but no sales. Review marketing and operations.</li>
                            )}
                            {series.length > 2 && (()=>{ 
                                const a=series.at(-1).sales, b=series.at(-2).sales; 
                                return a > b * 2 
                            })() && (
                                <li className='insight-item'>Spike detected: Recent day sales more than 2x previous day. Validate for promo/fraud.</li>
                            )}
                            {series.length > 2 && (()=>{ 
                                const a=series.at(-1).sales, b=series.at(-2).sales; 
                                return b > a * 2 
                            })() && (
                                <li className='insight-item'>Drop detected: Recent day sales less than half of previous day. Check stockouts/staffing.</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </>
    )
}

export default DashView

