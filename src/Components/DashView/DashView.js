import './DashView.css'

import {useEffect, useMemo, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'
// Charts (install: npm i recharts)
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar } from 'recharts'

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
    const [restock, setRestock] = useState([])
    const [series, setSeries] = useState([]) // [{date, sales, expenses, purchases, accommodations, rentals}]
    const [productLocationBreakdown, setProductLocationBreakdown] = useState([]) // [{pid, name, locations:[{location, qty}]}]

    useEffect(()=>{
        storePath('dashboard')  
    },[storePath])

    // Helper: filter arbitrary records by date range using common date fields
    const filterByDate = (list, from, to, dateKeys=['postingDate','expensesDate','expenseDate','createdAt','date'])=>{
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

            // Top Products (by qty sold in range)
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

            const expensesTotal = sumExpenses(expenses, fromDate, toDate)
            // Build daily expenses map
            const expByDate = buildExpensesByDate(expenses, fromDate, toDate)

            // Accommodations & Rentals revenues
            const { total: accomTotal, byDate: accomByDate } = sumByDate(accommodations, fromDate, toDate, 'accommodationAmount')
            const { total: rentalTotal, byDate: rentalByDate } = sumByDate(rentals, fromDate, toDate, 'rentalAmount')

            // Debts (from sales): look for totalDebt and totalDebtRecovered fields if present
            const { debtTotal, debtRecovered } = sumDebts(sales, fromDate, toDate)

            // Merge byDate + expenses into series array sorted by date
            const keys = new Set([
                ...Object.keys(expByDate),
                ...Object.keys(accomByDate),
                ...Object.keys(rentalByDate),
                ...Array.from(byDate.keys())
            ])
            const seriesData = Array.from(keys).sort().map(date=>{
                const d = byDate.get(date) || {sales:0, purchases:0}
                return { 
                    date, 
                    sales: d.sales||0, 
                    purchases: d.purchases||0, 
                    expenses: expByDate[date]||0,
                    accommodations: accomByDate[date]||0,
                    rentals: rentalByDate[date]||0
                }
            })

            setKpis({ 
                salesAmount, salesQty, 
                purchasesAmount, purchasesQty, 
                expensesAmount: expensesTotal, 
                inventoryQty, inventoryValue,
                accommodationsAmount: accomTotal,
                rentalsAmount: rentalTotal,
                debtTotal, debtRecovered,
                cogs,
                grossProfit: (salesAmount + accomTotal + rentalTotal) - cogs,
                netProfit: ((salesAmount + accomTotal + rentalTotal) - cogs) - expensesTotal
            })
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
            filterByDate(sales, fromDate, toDate).forEach(s=>{
                const id = s.employeeId || s.employee || s.handlerId
                const amt = Number(s.totalSalesAmount || s.totalAmount || s.amount || 0)
                if (!id) return
                empSalesMap.set(id, (empSalesMap.get(id)||0) + amt)
            })
            const empServiceMap = new Map()
            filterByDate(accommodations, fromDate, toDate).forEach(a=>{
                const id = a.employeeId || a.handlerId
                if (!id) return
                empServiceMap.set(id, (empServiceMap.get(id)||0) + Number(a.accommodationAmount||0))
            })
            filterByDate(rentals, fromDate, toDate).forEach(r=>{
                const id = r.employeeId || r.handlerId
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
        if (!Array.isArray(list)) return 0
        const fromT = new Date(from).getTime()
        const toT = new Date(to).getTime()
        return list.reduce((acc, e)=>{
            const d = e.postingDate || e.expensesDate || e.expenseDate || e.createdAt
            const t = (typeof d === 'string') ? new Date(d).getTime() : Number(d||0)
            if (!t || t < fromT || t > toT) return acc
            return acc + Number(e.expensesAmount || e.purchaseAmount || e.amount || e.totalAmount || 0)
        }, 0)
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
        const map = new Map()
        ;(employees||[]).forEach(e=>{
            const parts = [e.firstName, e.otherName, e.lastName].filter(Boolean)
            const fallback = e.fullName || e.name
            const nm = (parts.length ? parts.join(' ') : (fallback||'Employee')).trim()
            if (e.i_d) map.set(String(e.i_d), `${nm} (${e.i_d})`)
        })
        return (id)=> map.get(String(id)) || String(id)
    },[employees])

    // Best/Worst sales days based on (sales+accommodations+rentals)
    const bestWorstDays = useMemo(()=>{
        if (!Array.isArray(series) || !series.length) return { best:null, worst:null }
        const withRev = series.map(d=>({ date: d.date, rev: Number(d.sales||0)+Number(d.accommodations||0)+Number(d.rentals||0), exp: Number(d.expenses||0) }))
        const best = withRev.reduce((a,b)=> b.rev > (a?.rev||-Infinity) ? b : a, null)
        const worst = withRev.reduce((a,b)=> b.rev < (a?.rev||Infinity) ? b : a, null)
        return { best, worst }
    },[series])

    return(
        <>
            <div className='dashview'>
                <div className='dash-filters'>
                    <div className='filter-group'>
                        <label>From</label>
                        <input type='date' value={fromDate} onChange={e=>setFromDate(e.target.value)} />
                    </div>
                    <div className='filter-group'>
                        <label>To</label>
                        <input type='date' value={toDate} onChange={e=>setToDate(e.target.value)} />
                    </div>
                    <div className='filter-group' style={{gap:6}}>
                        <label style={{visibility:'hidden'}}>Presets</label>
                        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                            <button className='btn-secondary' onClick={()=>{
                                const d=new Date(); const s=d.toISOString().slice(0,10); setFromDate(s); setToDate(s)
                            }}>Today</button>
                            <button className='btn-secondary' onClick={()=>{
                                const now=new Date(); const s=new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10); const e=new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10); setFromDate(s); setToDate(e)
                            }}>MTD</button>
                            <button className='btn-secondary' onClick={()=>{
                                const now=new Date(); const q=Math.floor(now.getMonth()/3); const s=new Date(now.getFullYear(), q*3, 1).toISOString().slice(0,10); const e=new Date(now.getFullYear(), q*3+3, 0).toISOString().slice(0,10); setFromDate(s); setToDate(e)
                            }}>QTD</button>
                            <button className='btn-secondary' onClick={()=>{
                                const now=new Date(); const s=new Date(now.getFullYear(), 0, 1).toISOString().slice(0,10); const e=new Date(now.getFullYear(), 11, 31).toISOString().slice(0,10); setFromDate(s); setToDate(e)
                            }}>YTD</button>
                            <button className='btn-secondary' onClick={()=>{
                                setLocationFilter(''); setProductFilter(''); setEmployeeFilter(''); setSeasonFilter('')
                            }}>Clear Filters</button>
                        </div>
                    </div>
                    <div className='filter-group'>
                        <label>Location</label>
                        <input list='loc-list' placeholder='All' value={locationFilter} onChange={e=>setLocationFilter(e.target.value)} />
                        <datalist id='loc-list'>
                            {Array.from(new Set((products||[]).flatMap(p=>Object.keys(p.locationStock||{})))).map((l,i)=>(<option value={l} key={i} />))}
                        </datalist>
                    </div>
                    <div className='filter-group'>
                        <label>Product</label>
                        <input list='prod-list' placeholder='All' value={productFilter} onChange={e=>setProductFilter(e.target.value)} />
                        <datalist id='prod-list'>
                            {(products||[]).map(p=>(<option value={p.i_d} key={p.i_d}>{p.name}</option>))}
                        </datalist>
                    </div>
                    <div className='filter-group'>
                        <label>Employee</label>
                        <input list='emp-list' placeholder='All' value={employeeFilter} onChange={e=>setEmployeeFilter(e.target.value)} />
                        <datalist id='emp-list'>
                                    {(employees||[]).map(emp=>{
                                const parts = [emp.firstName, emp.otherName, emp.lastName].filter(Boolean)
                                const fallback = emp.fullName || emp.name
                                const label = (parts.length ? parts.join(' ') : (fallback||'Employee')).trim()
                                return (<option value={emp.i_d} key={emp.i_d}>{label} ({emp.i_d})</option>)
                            })}
                        </datalist>
                    </div>
                    <div className='filter-group'>
                        <label>Season</label>
                        <input placeholder='All' value={seasonFilter} onChange={e=>setSeasonFilter(e.target.value)} />
                    </div>
                    <button className='btn-primary' onClick={loadDashData} disabled={loading}>{loading?'Loading...':'Refresh'}</button>
                </div>

                {dashErr && <div className='dash-error'>{dashErr}</div>}

                <div className='kpi-grid'>
                    <div className='kpi-card'>
                        <div className='kpi-label'>Sales Amount</div>
                        <div className='kpi-value'>₦ {fmt(kpis.salesAmount)}</div>
                        <div className='kpi-sub'>{fmt(kpis.salesQty)} units</div>
                    </div>
                    <div className='kpi-card'>
                        <div className='kpi-label'>Expenses</div>
                        <div className='kpi-value'>₦ {fmt(kpis.expensesAmount)}</div>
                    </div>
                    <div className='kpi-card'>
                        <div className='kpi-label'>Direct Purchases</div>
                        <div className='kpi-value'>₦ {fmt(kpis.purchasesAmount)}</div>
                        <div className='kpi-sub'>{fmt(kpis.purchasesQty)} units</div>
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

                <div className='panel'>
                    <div className='panel-title'>Profit & Loss Summary</div>
                    <div className='list-table'>
                        <div className='list-head'>
                            <div>Metric</div>
                            <div>Amount</div>
                        </div>
                        <div className='list-row'>
                            <div>Revenue (Sales + Accom + Rentals)</div>
                            <div>₦ {fmt((kpis.salesAmount||0)+(kpis.accommodationsAmount||0)+(kpis.rentalsAmount||0))}</div>
                        </div>
                        <div className='list-row'>
                            <div>COGS</div>
                            <div>₦ {fmt(kpis.cogs||0)}</div>
                        </div>
                        <div className='list-row'>
                            <div>Gross Profit</div>
                            <div>₦ {fmt(kpis.grossProfit||0)}</div>
                        </div>
                        <div className='list-row'>
                            <div>Operating Expenses</div>
                            <div>₦ {fmt(kpis.expensesAmount||0)}</div>
                        </div>
                        <div className='list-row'>
                            <div>Net Profit</div>
                            <div style={{color: (kpis.netProfit||0) < 0 ? '#da1e28' : '#24a148'}}>₦ {fmt(kpis.netProfit||0)}</div>
                        </div>
                    </div>
                </div>

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
                        <div className='panel-title'>Top Selling Products (Qty)</div>
                        <div style={{width:'100%', height:300}}>
                            <ResponsiveContainer>
                                <BarChart data={topProducts.map(p=>({ name: productName(p.pid), qty: p.qty }))} margin={{ top: 10, right: 40, left: 10, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" hide={false} interval={0} angle={-20} textAnchor="end" height={60} />
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
                                    <XAxis dataKey="name" hide={false} interval={0} angle={-20} textAnchor="end" height={60} />
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
                                    <XAxis dataKey="name" hide={false} interval={0} angle={-20} textAnchor="end" height={60} />
                                    <YAxis width={90} tickFormatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} domain={[0, 'auto']} allowDecimals={false} />
                                    <Tooltip formatter={(v)=>`₦ ${Number(v||0).toLocaleString()}`} />
                                    <Bar dataKey="amount" fill="#a56eff" name="Amount" />
                                </BarChart>
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
                            <li className='insight-item'>{(kpis.debtTotal||0)>0?`Debts outstanding: ₦ ${fmt(kpis.debtTotal - (kpis.debtRecovered||0))}. Focus on recovery via reminders and incentives.`:'No outstanding debt recorded in range.'}</li>
                            <li className='insight-item'>{(kpis.netProfit||0) < 0 ? 'Loss detected: tighten expense controls, review pricing and COGS; push high-margin products and reduce low-turnover inventory.' : 'Profit achieved: scale best-sellers, maintain stock above 14-day coverage, and replicate best locations/employees tactics.'}</li>
                            <li className='insight-item'>Low stock warnings are based on 7-day average sales coverage. Replenish items below threshold to avoid stockouts.</li>
                            <li className='insight-item'>Use Top Products by Location to allocate stock to high-demand branches; plan transfers before peak days.</li>
                            <li className='insight-item'>Ensure debt recovery workflows and late-fee policies are consistently applied to improve cash flow.</li>
                            <li className='insight-item'>{bestWorstDays.best?`Best sales day: ${bestWorstDays.best.date} (₦ ${fmt(bestWorstDays.best.rev)}). Replicate promos/stocking.`:'Best sales day: N/A'}</li>
                            <li className='insight-item'>{bestWorstDays.worst?`Lowest sales day: ${bestWorstDays.worst.date} (₦ ${fmt(bestWorstDays.worst.rev)}). Investigate staffing, inventory levels, and pricing.`:'Lowest sales day: N/A'}</li>
                            <li className='insight-item'>Consider bundling top products and offering location-specific promotions during off-peak days.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </>
    )
}

export default DashView