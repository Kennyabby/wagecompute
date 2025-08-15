import './DashView.css'

import {useEffect, useMemo, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'
// Charts (install: npm i recharts)
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

const fmt = (n)=> Number(n||0).toLocaleString()

const DashView = () =>{
    const {
        storePath,
        fetchServer, server, company,
        products, getProductsWithStock,
        sales, getSales, saleFrom, saleTo,
        purchase, getPurchase,
        expenses, getExpenses,
        accommodations, getAccommodations,
        rentals, getRentals,
        employees, getEmployees,
    } = useContext(ContextProvider)

    // Filters
    const [fromDate, setFromDate] = useState(saleFrom || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10))
    const [toDate, setToDate] = useState(saleTo || new Date().toISOString().slice(0,10))
    const [locationFilter, setLocationFilter] = useState('')
    const [productFilter, setProductFilter] = useState('')
    const [employeeFilter, setEmployeeFilter] = useState('')
    const [seasonFilter, setSeasonFilter] = useState('')

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
    })
    const [topProducts, setTopProducts] = useState([])
    const [topLocations, setTopLocations] = useState([])
    const [topEmployeesSales, setTopEmployeesSales] = useState([])
    const [topEmployeesServices, setTopEmployeesServices] = useState([])
    const [series, setSeries] = useState([]) // [{date, sales, expenses, purchases, accommodations, rentals}]
    const [restock, setRestock] = useState([])
    const [topExpenseCategories, setTopExpenseCategories] = useState([])
    const [topProductsBySales, setTopProductsBySales] = useState([])
    const [topPurchaseItems, setTopPurchaseItems] = useState([])
    const [productLocationBreakdown, setProductLocationBreakdown] = useState([]) // [{pid, name, locations:[{location, qty}]}]
    const [monthlySeries, setMonthlySeries] = useState([]) // [{month:'Jan', sales, purchases, expenses, accommodations, rentals}]
    const [revenueMix, setRevenueMix] = useState([]) // [{name:'Sales', value:...}, ...]

    useEffect(()=>{
        storePath('dashboard')  
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

    // Ensure base data
    useEffect(()=>{
        const cmp_val = window.localStorage.getItem('sessn-cmp')
        if (cmp_val && company){
            if (!products?.length){
                getProductsWithStock(cmp_val, products)
            }
            if (!purchase?.length){
                getPurchase(cmp_val)
            }
            if (!expenses?.length){
                getExpenses(cmp_val)
            }
            if (!sales?.length){
                getSales(cmp_val)
            }
            if (!accommodations?.length){
                getAccommodations(cmp_val)
            }
            if (!rentals?.length){
                getRentals(cmp_val)
            }
            if (!employees?.length){
                getEmployees(cmp_val)
            }
        }
    },[company])

    const loadDashData = async()=>{
        if (!company) return
        setLoading(true)
        setDashErr('')
        try{
            const filter = { postingDate: { $gte: fromDate, $lte: toDate } }
            if (locationFilter) filter.location = locationFilter
            if (productFilter) filter.productId = productFilter
            // Query InventoryTransactions once for range
            const resp = await fetchServer('POST', {
                database: company,
                collection: 'InventoryTransactions',
                prop: filter
            }, 'getDocsDetails', server)

            let salesAmount=0, salesQty=0, purchasesAmount=0, purchasesQty=0
            let cogs=0 // cost of goods sold for sales
            const byProduct = new Map()
            const byLocation = new Map()
            const byDate = new Map() // date -> {sales, purchases}
            const productLocMap = new Map() // pid -> Map(location -> qty)
            if (resp?.record && Array.isArray(resp.record)){
                resp.record.forEach(t=>{
                    const type = String(t.entryType||'').toLowerCase()
                    const qty = Math.abs(Number(t.baseQuantity||t.quantity||0))
                    const totSales = Math.abs(Number(t.totalSales||0))
                    const totCost = Math.abs(Number(t.totalCost||0))
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
                        cur.sales += (totSales || totCost)
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
            let inventoryQty = 0, inventoryValue = 0
            if (products && Array.isArray(products)){
                products.forEach(p=>{
                    inventoryQty += Number(p.totalStock||0)
                    inventoryValue += Number(p.totalCost||0)
                })
            }

            // Track sales by product (for amount breakdown)
            const salesByProduct = new Map()
            const salesRecords = resp.record || []
            
            const saleTransactions = salesRecords.filter(t => {
                const type = String(t.entryType || '').toLowerCase()
                return type === 'sale' || type === 'sales'
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

            // Average daily sales for each product in range using transactions -> better restock logic
            const dayCount = Math.max(1, (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000*60*60*24) + 1)
            const avgDailySales = new Map() // pid -> avg qty/day
            topProdArr.forEach(({pid, qty})=>{
                avgDailySales.set(pid, Number(qty)/dayCount)
            })
            // Restock if stock < 7 days of avg sales
            const restockList = (products||[])
                .map(p=>{
                    const pid = p.i_d || p.productId || p.name
                    const avg = avgDailySales.get(pid) || 0
                    const threshold = avg * 7
                    const stock = Number(p.totalStock||0)
                    return { id: pid, name: p.name, stock, threshold }
                })
                .filter(r=> r.threshold>0 && r.stock <= r.threshold)
                .sort((a,b)=> (a.stock - b.stock))
                .slice(0, 10)

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
            const seriesData = Array.from(allDates).sort().map(date=>{
                const inv = byDate.get(date) || {sales:0, purchases:0}
                const salesVal = salesByDateFromSalesDocs.has(date) ? (salesByDateFromSalesDocs.get(date)||0) : (inv.sales||0)
                reconciledSalesTotal += Number(salesVal||0)
                return {
                    date,
                    sales: salesVal,
                    purchases: inv.purchases||0,
                    expenses: expByDate[date]||0,
                    accommodations: accomByDate[date]||0,
                    rentals: rentalByDate[date]||0
                }
            })

            setKpis({ 
                salesAmount: reconciledSalesTotal, salesQty, 
                purchasesAmount, purchasesQty, 
                expensesAmount: expensesTotal, 
                inventoryQty, inventoryValue,
                accommodationsAmount: accomTotal,
                rentalsAmount: rentalTotal,
                debtTotal, debtRecovered,
                cogs,
                grossProfit: (reconciledSalesTotal + accomTotal + rentalTotal) - cogs,
                netProfit: ((reconciledSalesTotal + accomTotal + rentalTotal) - cogs) - expensesTotal
            })
            // Revenue mix for pie
            setRevenueMix([
                { name: 'Sales', value: Number(reconciledSalesTotal||0) },
                { name: 'Accommodation', value: Number(accomTotal||0) },
                { name: 'Rentals', value: Number(rentalTotal||0) }
            ])
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
            setTopProducts(topProdArr.slice(0,10))
            setTopLocations(topLocArr.slice(0,10))
            setRestock(restockList)
            // Build productLocationBreakdown
            const prodLocArr = topProdArr.slice(0,10).map(p=>{
                const lm = productLocMap.get(p.pid) || new Map()
                const locations = Array.from(lm.entries()).map(([location, qty])=>({ location, qty }))
                    .sort((a,b)=> b.qty - a.qty)
                return { pid: p.pid, name: productName(p.pid), locations }
            })
            setProductLocationBreakdown(prodLocArr)
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
        }catch(err){
            setDashErr('Failed to load dashboard data')
        }finally{
            setLoading(false)
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
        loadDashData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[fromDate, toDate, locationFilter, productFilter, employeeFilter, company, products, sales, accommodations, rentals])

    // Helpers to map names
    const productName = useMemo(()=>{
        const map = new Map()
        ;(products||[]).forEach(p=>{
            map.set(p.i_d || p.productId, p.name || p.productName || p.description || 'Product')
        })
        return (id)=> map.get(id) || id
    },[products])

    const employeeName = useMemo(()=>{
        const byId = new Map()
        const byEmail = new Map()
        ;(employees||[]).forEach(e=>{
            const parts = [e.firstName, e.otherName, e.lastName].filter(Boolean)
            const fallback = e.fullName || e.name
            const nm = (parts.length ? parts.join(' ') : (fallback||'Employee')).trim()
            if (e.i_d) byId.set(String(e.i_d), `${nm} (${e.i_d})`)
            if (e.emailid) byEmail.set(String(e.emailid).toLowerCase(), `${nm} (${e.i_d||e.emailid})`)
        })
        return (id)=>{
            if (id === undefined || id === null) return 'N/A'
            const k = String(id)
            return byId.get(k) || byEmail.get(k.toLowerCase()) || k
        }
    },[employees])

    // Resolve any given employee identifier to canonical employee i_d when possible
    const employeeIdResolver = useMemo(()=>{
        const byId = new Map()
        const byEmail = new Map()
        ;(employees||[]).forEach(e=>{
            if (e.i_d) byId.set(String(e.i_d), String(e.i_d))
            if (e.emailid) byEmail.set(String(e.emailid).toLowerCase(), String(e.i_d||e.emailid))
        })
        return (raw)=>{
            if (raw === undefined || raw === null) return undefined
            const k = String(raw)
            return byId.get(k) || byEmail.get(k.toLowerCase()) || k
        }
    },[employees])

    // Best/Worst sales days based on (sales+accommodations+rentals)
    const bestWorstDays = useMemo(()=>{
        if (!Array.isArray(series) || !series.length) return { best:null, worst:null }
        const withRev = series.map(d=>({ date: d.date, rev: Number(d.sales||0)+Number(d.accommodations||0)+Number(d.rentals||0), exp: Number(d.expenses||0) }))
        const best = withRev.reduce((a,b)=> b.rev > (a?.rev||-Infinity) ? b : a, null)
        const worst = withRev.reduce((a,b)=> b.rev < (a?.rev||Infinity) ? b : a, null)
        return { best, worst }
    },[series])

    // Build filter option lists
    const locationOptions = useMemo(()=>{
        const set = new Set()
        // from products stock map
        ;(products||[]).forEach(p=>{
            Object.keys(p.locationStock||{}).forEach(l=>{ if (l) set.add(l) })
        })
        // from transactional modules
        ;(sales||[]).forEach(s=>{ if (s.location) set.add(s.location) })
        ;(accommodations||[]).forEach(a=>{ if (a.location) set.add(a.location) })
        ;(rentals||[]).forEach(r=>{ if (r.location) set.add(r.location) })
        return Array.from(set).sort()
    },[products, sales, accommodations, rentals])

    const productOptions = useMemo(()=>{
        return (products||[]).map(p=>({ value: p.i_d || p.productId, label: p.name || p.productName || p.description || 'Product' }))
    },[products])

    const employeeOptions = useMemo(()=>{
        return (employees||[]).map(emp=>{
            const parts = [emp.firstName, emp.otherName, emp.lastName].filter(Boolean)
            const fallback = emp.fullName || emp.name
            const label = (parts.length ? parts.join(' ') : (fallback||'Employee')).trim()
            return { value: String(emp.i_d || ''), label: `${label} (${emp.i_d||emp.emailid||''})` }
        }).filter(e=> e.value)
    },[employees])

    return(
        <>
            <div className='dashview'>
                {/* Filters */}
                <div className='dash-filters'>
                    <div className='filter-group'>
                        <label>From</label>
                        <input type='date' value={fromDate} onChange={e=>setFromDate(e.target.value)} />
                    </div>
                    <div className='filter-group'>
                        <label>To</label>
                        <input type='date' value={toDate} onChange={e=>setToDate(e.target.value)} />
                    </div>
                    <div className='filter-group'>
                        <label>Presets</label>
                        <div className='btn-group' style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                            <button className='btn-secondary' onClick={()=>{ const d=new Date(); const s=d.toISOString().slice(0,10); setFromDate(s); setToDate(s) }}>Today</button>
                            <button className='btn-secondary' onClick={()=>{ const now=new Date(); const s=new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10); const e=new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10); setFromDate(s); setToDate(e) }}>MTD</button>
                            <button className='btn-secondary' onClick={()=>{ const now=new Date(); const q=Math.floor(now.getMonth()/3); const s=new Date(now.getFullYear(), q*3, 1).toISOString().slice(0,10); const e=new Date(now.getFullYear(), q*3+3, 0).toISOString().slice(0,10); setFromDate(s); setToDate(e) }}>QTD</button>
                            <button className='btn-secondary' onClick={()=>{ const now=new Date(); const s=new Date(now.getFullYear(), 0, 1).toISOString().slice(0,10); const e=new Date(now.getFullYear(), 11, 31).toISOString().slice(0,10); setFromDate(s); setToDate(e) }}>YTD</button>
                            <button className='btn-secondary' onClick={()=>{ setLocationFilter(''); setProductFilter(''); setEmployeeFilter(''); setSeasonFilter('') }}>Clear</button>
                        </div>
                    </div>
                    <div className='filter-group'>
                        <label>Location</label>
                        <select value={locationFilter} onChange={e=>setLocationFilter(e.target.value)}>
                            <option value=''>All</option>
                            {locationOptions.map((l,i)=>(<option value={l} key={i}>{l}</option>))}
                        </select>
                    </div>
                    <div className='filter-group'>
                        <label>Product</label>
                        <select value={productFilter} onChange={e=>setProductFilter(e.target.value)}>
                            <option value=''>All</option>
                            {productOptions.map(p=>(<option value={p.value} key={p.value}>{p.label}</option>))}
                        </select>
                    </div>
                    <div className='filter-group'>
                        <label>Employee</label>
                        <select value={employeeFilter} onChange={e=>setEmployeeFilter(e.target.value)}>
                            <option value=''>All</option>
                            {employeeOptions.map(eo=>(<option value={eo.value} key={eo.value}>{eo.label}</option>))}
                        </select>
                    </div>
                    <div className='filter-group'>
                        <label>Season</label>
                        <select value={seasonFilter} onChange={e=>setSeasonFilter(e.target.value)}>
                            <option value=''>All</option>
                            <option value='Q1'>Q1 (Jan-Mar)</option>
                            <option value='Q2'>Q2 (Apr-Jun)</option>
                            <option value='Q3'>Q3 (Jul-Sep)</option>
                            <option value='Q4'>Q4 (Oct-Dec)</option>
                        </select>
                    </div>
                    <button className='btn-primary' onClick={loadDashData} disabled={loading}>{loading?'Loading...':'Refresh'}</button>
                </div>

                {dashErr && <div className='dash-error'>{dashErr}</div>}

                {/* Financial Summary */}
                <div className='financial-summary'>
                    <div className='financial-card'>
                        <h3>Total Revenue</h3>
                        <div className='amount'>₦ {fmt((kpis.salesAmount || 0) + (kpis.accommodationsAmount || 0) + (kpis.rentalsAmount || 0))}</div>
                    </div>
                    {/* <div className='financial-card'>
                        <h3>Sales</h3>
                        <div className='amount'>₦ {fmt(kpis.salesAmount || 0)}</div>
                    </div> */}
                    <div className='financial-card'>
                        <h3>COGS</h3>
                        <div className='amount'>₦ {fmt(kpis.cogs || 0)}</div>
                    </div>
                    <div className='financial-card'>
                        <h3>Gross Profit</h3>
                        <div className={`amount ${(kpis.grossProfit || 0) >= 0 ? 'profit' : 'loss'}`}>
                            ₦ {fmt(kpis.grossProfit || 0)}
                        </div>
                    </div>
                    <div className='financial-card'>
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
                    <div className='kpi-card'>
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
                    <div className='kpi-card'>
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
                        <div className='kpi-label'>Inventory</div>
                        <div className='kpi-value'>{fmt(kpis.inventoryQty)} units</div>
                        <div className='kpi-sub'>₦ {fmt(kpis.inventoryValue)}</div>
                    </div>
                    <div className='kpi-card'>
                        <div className='kpi-label'>Accommodations</div>
                        <div className='kpi-value'>₦ {fmt(kpis.accommodationsAmount)}</div>
                    </div>
                    <div className='kpi-card'>
                        <div className='kpi-label'>Rentals</div>
                        <div className='kpi-value'>₦ {fmt(kpis.rentalsAmount)}</div>
                    </div>
                    <div className='kpi-card'>
                        <div className='kpi-label'>Debts</div>
                        <div className='kpi-value'>₦ {fmt(kpis.debtTotal)}</div>
                        <div className='kpi-sub'>Recovered: ₦ {fmt(kpis.debtRecovered)}</div>
                    </div>
                    <div className='kpi-card'>
                        <div className='kpi-label'>Gross Profit</div>
                        <div className='kpi-value'>₦ {fmt(kpis.grossProfit||0)}</div>
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
                                            <stop offset="5%" stopColor="#0f62fe" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#0f62fe" stopOpacity={0}/>
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
                                            <stop offset="5%" stopColor="#8a3ffc" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8a3ffc" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorRentals" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#007d79" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#007d79" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" interval={0} angle={-20} textAnchor="end" height={60} />
                                    <YAxis width={90} tickFormatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} domain={[0, 'auto']} allowDecimals={false} />
                                    <Tooltip formatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} />
                                    <Legend />
                                    <Area type="monotone" dataKey="sales" stroke="#0f62fe" fillOpacity={1} fill="url(#colorSales)" name="Sales" />
                                    <Area type="monotone" dataKey="expenses" stroke="#da1e28" fillOpacity={1} fill="url(#colorExpenses)" name="Expenses" />
                                    <Area type="monotone" dataKey="purchases" stroke="#24a148" fillOpacity={1} fill="url(#colorPurchases)" name="Purchases" />
                                    <Area type="monotone" dataKey="accommodations" stroke="#8a3ffc" fillOpacity={1} fill="url(#colorAccom)" name="Accommodations" />
                                    <Area type="monotone" dataKey="rentals" stroke="#007d79" fillOpacity={1} fill="url(#colorRentals)" name="Rentals" />
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
                                    <Bar dataKey="sales" stackId="rev" fill="#0f62fe" name="Sales" />
                                    <Bar dataKey="accommodations" stackId="rev" fill="#8a3ffc" name="Accommodation" />
                                    <Bar dataKey="rentals" stackId="rev" fill="#007d79" name="Rentals" />
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
                        <div className='panel-title'>Top Locations (Sales Amount)</div>
                        <div style={{width:'100%', height:280}}>
                            <ResponsiveContainer>
                                <BarChart data={topLocations} margin={{ top: 10, right: 40, left: 10, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="location" interval={0} angle={-20} textAnchor="end" height={60} />
                                    <YAxis width={90} tickFormatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} domain={[0, 'auto']} allowDecimals={false} />
                                    <Tooltip formatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} />
                                    <Bar dataKey="amount" fill="#0f62fe" name="Amount (₦)" />
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
                                    <Bar dataKey="amount" fill="#8a3ffc" name="Amount" />
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
                                    <Bar dataKey="amount" fill="#a56eff" name="Amount" />
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
                                        {revenueMix.map((e,i)=> <Cell key={`c-${i}`} fill={["#0088FE","#00C49F","#FFBB28"][i%3]} />)}
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
                                <div className='list-row' key={`${pl.pid}-${l.location}-${idx}`}>
                                    <div>{pl.name}</div>
                                    <div>{l.location}</div>
                                    <div>{fmt(l.qty)}</div>
                                </div>
                            )))}
                            {!productLocationBreakdown.length && <div className='empty-row'>No data</div>}
                        </div>
                    </div>

                    <div className='panel'>
                        <div className='panel-title'>Products To Restock</div>
                        <div className='list-table'>
                            <div className='list-head'>
                                <div>Product</div>
                                <div>Stock</div>
                                <div>7-day Threshold</div>
                                <div>Coverage (days)</div>
                                <div>Warning</div>
                            </div>
                            {restock.map((r,i)=>(
                                <div className='list-row' key={i}>
                                    <div>{r.name || r.id}</div>
                                    <div>{fmt(r.stock)}</div>
                                    <div>{fmt(Math.ceil(r.threshold))}</div>
                                    <div>{r.threshold>0 ? (r.stock/ (r.threshold/7)).toFixed(1) : 'N/A'}</div>
                                    <div>{r.threshold>0 && (r.stock/ (r.threshold/7)) < 3 ? 'Low stock' : ''}</div>
                                </div>
                            ))}
                            {!restock.length && <div className='empty-row'>No low-stock items</div>}
                        </div>
                    </div>

                    <div className='panel'>
                        <div className='panel-title'>Insights</div>
                        <ul className='insights'>
                            <li className='insight-item'>{`Revenue (Sales+Accom+Rentals): ₦ ${fmt((kpis.salesAmount||0)+(kpis.accommodationsAmount||0)+(kpis.rentalsAmount||0))}. COGS: ₦ ${fmt(kpis.cogs||0)}. Gross Profit: ₦ ${fmt(kpis.grossProfit||0)}. Expenses: ₦ ${fmt(kpis.expensesAmount||0)}. Net Profit: ₦ ${fmt(kpis.netProfit||0)}.`}</li>
                            <li className='insight-item'>{topProducts[0]?`Top product: ${productName(topProducts[0].pid)} with ${fmt(topProducts[0].qty)} units.`:'Top product: N/A'}</li>
                            <li className='insight-item'>{topLocations[0]?`Best location: ${topLocations[0].location} (₦ ${fmt(topLocations[0].amount)}).`:'Best location: N/A'}</li>
                            <li className='insight-item'>{topEmployeesSales[0]?`Top sales employee: ${employeeName(topEmployeesSales[0].employeeId)} (₦ ${fmt(topEmployeesSales[0].amount)}).`:'Top sales employee: N/A'}</li>
                            <li className='insight-item'>{topEmployeesServices[0]?`Top services employee (Accom+Rentals): ${employeeName(topEmployeesServices[0].employeeId)} (₦ ${fmt(topEmployeesServices[0].amount)}).`:'Top services employee: N/A'}</li>
                            {(kpis.debtTotal||0)>0 && <li className='insight-item'>{`Debts outstanding: ₦ ${fmt(kpis.debtTotal - (kpis.debtRecovered||0))}. Prioritize recovery.`}</li>}
                            {(kpis.netProfit||0) < 0 && <li className='insight-item'>Loss detected: tighten expense controls, review pricing/COGS; push high-margin items; reduce low-turnover stock.</li>}
                            {(kpis.netProfit||0) >= 0 && <li className='insight-item'>Profit achieved: scale best-sellers, keep 14+ days stock, replicate best locations/employees tactics.</li>}
                            {monthlySeries.some(m=>m.expenses>m.sales) && <li className='insight-item'>Alert: Some months have expenses exceeding sales. Investigate cost drivers.</li>}
                            {monthlySeries.some(m=>m.sales===0 && (m.purchases>0||m.expenses>0)) && <li className='insight-item'>Low activity: Months with spend but no sales. Review marketing and operations.</li>}
                            {series.length>2 && (()=>{ const a=series.at(-1).sales, b=series.at(-2).sales; return a> b*2 })() && <li className='insight-item'>Spike detected: Recent day sales more than 2x previous day. Validate for promo/fraud.</li>}
                            {series.length>2 && (()=>{ const a=series.at(-1).sales, b=series.at(-2).sales; return b> a*2 })() && <li className='insight-item'>Drop detected: Recent day sales less than half of previous day. Check stockouts/staffing.</li>}
                        </ul>
                    </div>
                </div>
            </div>
        </>
    )
}

export default DashView

