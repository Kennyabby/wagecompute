import './Reports.css'

import { useState, useEffect, useContext, useRef } from 'react'
import { syncPendingChanges } from '../../Resources/offlineSync';
import ContextProvider from '../../Resources/ContextProvider'
import html2pdf from 'html2pdf.js';
import { MdFullscreen, MdFullscreenExit, MdDownload, MdClose } from 'react-icons/md';

const Reports = () => {
    const { storePath,
        server, intervalPeriod,
        fetchServer,
        companyRecord,
        company, getDate, years, monthDays,
        employees, months, expenses, sales, rentals, purchase, attendance,
        getSales, getRentals, getPurchase, getExpenses,
        alert, alertState, alertTimeout, actionMessage,
        setAlert, setAlertState, setAlertTimeout, setActionMessage
    } = useContext(ContextProvider)

    const [cogsMap, setCogsMap] = useState({}) // { 'YYYY-MM-DD': amount }
    const [cogsLoading, setCogsLoading] = useState(false)
    const [cogsError, setCogsError] = useState(null)
    const [filterFrom, setFilterFrom] = useState(new Date(new Date().getFullYear(), 0, 2).toISOString().slice(0, 10))
    const [filterTo, setFilterTo] = useState(new Date(Date.now()).toISOString().slice(0, 10))
    const [pendingFrom, setPendingFrom] = useState(filterFrom)
    const [pendingTo, setPendingTo] = useState(filterTo)
    const [isFullScreen, setIsFullScreen] = useState(false)

    useEffect(() => {
        storePath('reports')
    }, [storePath])

    useEffect(() => {
        // fetch COGS mapping for current overall range
        (async () => {
            var cmp_val = window.localStorage.getItem('sessn-cmp')
            getSales(cmp_val, 'all')
            getRentals(cmp_val, 'all')
            getPurchase(cmp_val, 'all')
            getExpenses(cmp_val, 'all')
            try {
                const formattedStart = new Date(filterFrom).toISOString().split('T')[0]
                const formattedEnd = new Date(filterTo).toISOString().split('T')[0]
                const q = {
                    database: cmp_val,
                    collection: 'InventoryTransactions',
                    prop: [
                        { $match: { postingDate: { $gte: formattedStart, $lte: formattedEnd }, entryType: 'Sales' } },
                        { $group: { _id: '$postingDate', cogs: { $sum: { $cond: [{ $isNumber: '$totalCost' }, '$totalCost', { $toDouble: '$totalCost' }] } } } }
                    ]
                }
                const resp = await fetchServer('POST', q, 'aggregateDocs', server)
                const map = {}
                if (resp && resp.record) {
                    resp.record.forEach(r => {
                        if (r._id) map[r._id] = r.cogs || 0
                    })
                }
                setCogsMap(map)
            } catch (e) {
                console.warn('fetch COGS failed', e)
            }
        })()
        const intervalId = setInterval(() => {
            var cmp_val = window.localStorage.getItem('sessn-cmp')
            if (cmp_val) {
                // refresh cogs map periodically
                (async () => {
                    getSales(cmp_val, 'all')
                    getRentals(cmp_val, 'all')
                    getPurchase(cmp_val, 'all')
                    getExpenses(cmp_val, 'all')
                    try {
                        const formattedStart = new Date(filterFrom).toISOString().split('T')[0]
                        const formattedEnd = new Date(filterTo).toISOString().split('T')[0]
                        const q = {
                            database: cmp_val,
                            collection: 'InventoryTransactions',
                            prop: [
                                { $match: { postingDate: { $gte: formattedStart, $lte: formattedEnd }, entryType: 'Sales' } },
                                { $group: { _id: '$postingDate', cogs: { $sum: { $cond: [{ $isNumber: '$totalCost' }, '$totalCost', { $toDouble: '$totalCost' }] } } } }
                            ]
                        }
                        const resp = await fetchServer('POST', q, 'aggregateDocs', server)
                        const map = {}
                        if (resp && resp.record) {
                            resp.record.forEach(r => {
                                if (r._id) map[r._id] = r.cogs || 0
                            })
                        }
                        setCogsMap(map)
                    } catch (e) {
                        console.warn('refresh COGS failed', e)
                    }
                })()
                // getAttendance(cmp_val)
            }
        }, intervalPeriod)
        return () => clearInterval(intervalId);
    }, [window.localStorage.getItem('sessn-cmp')])
    const [isSyncing, setIsSyncing] = useState(false)
    const reports = ['PROFIT OR LOSS', 'TRIAL BALANCE', 'BALANCE SHEET']
    const [curReport, setCurReport] = useState({
        title: reports[0],
        data: [],
        description: 'Statement of profit or Loss and Other Comprehensive Income for'.toUpperCase(),
        columns: ['Month', 'Sales Income', 'COGS', 'Gross Profit', 'Other Income', 'Admin Expenses', 'Net Profit']
    })
    const reportRef = useRef(null)
    const handleReportSelection = (e) => {
        const name = e.target.getAttribute('name')
        if (name) {
            if (name === 'PROFIT OR LOSS') {
                setCurReport({
                    title: name,
                    data: getPandLdata(filterFrom, filterTo),
                    description: 'Statement of profit or Loss and Other Comprehensive Income for'.toUpperCase(),
                    columns: ['Month', 'Sales Income', 'COGS', 'Gross Profit', 'Other Income', 'Admin Expenses', 'Net Profit']
                })
            } else if (name === 'TRIAL BALANCE') {
                setCurReport({
                    title: name,
                    description: 'Trial Balance for'.toUpperCase(),
                    data: getTrialBalance(filterFrom, filterTo),
                    columns: ['Month', 'Description', 'Credit', 'Debit', 'Balance']
                })
            } else if (name === 'BALANCE SHEET') {
                setCurReport({
                    title: name,
                    description: 'Balance Sheet Report for'.toUpperCase(),
                    data: getBalanceSheet(filterFrom, filterTo),
                    columns: ['Month']
                })
            }
        }
    }

    useEffect(() => {
        if (curReport.title === 'PROFIT OR LOSS') {
            setCurReport((curReport) => {
                return { ...curReport, data: getPandLdata(filterFrom, filterTo) }
            })
        } else if (curReport.title === 'TRIAL BALANCE') {
            setCurReport((curReport) => {
                return { ...curReport, data: getTrialBalance(filterFrom, filterTo) }
            })
        } else if (curReport.title === 'BALANCE SHEET') {
            setCurReport((curReport) => {
                return { ...curReport, data: getBalanceSheet(filterFrom, filterTo) }
            })
        }
    }, [filterFrom, filterTo, expenses, sales, rentals, purchase, cogsMap])

    useEffect(() => {
        fetchCogsForRange(filterFrom, filterTo)
    }, [filterFrom, filterTo])

    const getBalanceSheet = (filterFrom, filterTo) => {
        return getAlldata(filterFrom, filterTo)
    }

    const handleSyncOfflineReports = async () => {
        if (!company || !companyRecord?.emailid) return;
        setIsSyncing(true);
        setAlertState('info');
        setAlert('Syncing offline Report changes...');
        setAlertTimeout(10000);
        try {
            const results = await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
            const cmp_val = window.localStorage.getItem('sessn-cmp');
            if (cmp_val) {
                await Promise.all([
                    getSales(cmp_val, 'all'),
                    getRentals(cmp_val, 'all'),
                    getPurchase(cmp_val, 'all'),
                    getExpenses(cmp_val, 'all')
                ])
            }
            if (Array.isArray(results)) {
                const failed = results.filter(r => r.status === 'error');
                if (failed.length) {
                    setAlertState('error');
                    setAlert(`${failed.length} change(s) failed to sync; retry later.`);
                    setAlertTimeout(5000);
                } else {
                    setAlertState('success');
                    setAlert('Offline Reports Sync complete');
                    setAlertTimeout(1000);
                }
            } else {
                setAlertState('success');
                setAlert('Offline Reports Sync complete');
                setAlertTimeout(1000);
            }
        } catch (e) {
            setAlertState('error');
            setAlert('Offline Reports Sync failed. Please try again.');
            setAlertTimeout(3000);
        } finally {
            setIsSyncing(false);
        }
    }
    const fetchCogsForRange = async (from, to) => {
        const cmp_val = window.localStorage.getItem('sessn-cmp')
        if (!cmp_val) return
        setCogsLoading(true)
        setCogsError(null)
        try {
            const formattedStart = new Date(from).toISOString().split('T')[0]
            const formattedEnd = new Date(to).toISOString().split('T')[0]
            const q = {
                database: cmp_val,
                collection: 'InventoryTransactions',
                prop: [
                    { $match: { postingDate: { $gte: formattedStart, $lte: formattedEnd }, entryType: 'Sales' } },
                    { $group: { _id: '$postingDate', cogs: { $sum: { $cond: [{ $isNumber: '$totalCost' }, '$totalCost', { $toDouble: '$totalCost' }] } } } }
                ]
            }
            const resp = await fetchServer('POST', q, 'aggregateDocs', server)
            const map = {}
            if (resp && resp.record) {
                resp.record.forEach(r => { if (r._id) map[r._id] = r.cogs || 0 })
            }
            setCogsMap(map)
            setCogsError(null)
        } catch (e) {
            console.warn('fetch COGS failed', e)
            setCogsError('Failed to fetch COGS. Reports may be incomplete.')
            setAlertState('error')
            setAlert('Failed to fetch COGS. Reports may be incomplete.')
            setAlertTimeout(5000)
        } finally {
            setCogsLoading(false)
        }
    }
    const getTrialBalance = (filterFrom, filterTo) => {
        return getAlldata(filterFrom, filterTo)
    }

    const getPandLdata = (filterFrom, filterTo) => {
        return getAlldata(filterFrom, filterTo)
    }
    const getAlldata = (filterFrom, filterTo) => {
        var saledata = []
        sales.forEach((sale) => {
            const { postingDate, totalCashSales, totalBankSales,
                totalDebt, totalShortage, totalDebtRecovered } = sale
            if (filterFrom <= postingDate && filterTo >= postingDate) {
                var reportSale = {}
                reportSale.postingDate = postingDate
                reportSale.docType = 'sales'
                reportSale.salesAmount = Number(totalCashSales) + Number(totalBankSales)
                    + Number(totalDebt) + Number(totalShortage)

                saledata = saledata.concat(reportSale)
            }
        })
        const monthlySalesData = getMonthWiseReport(saledata)

        var rentalData = []
        rentals.forEach((rental) => {
            const { paymentDate, paymentAmount } = rental
            if (filterFrom <= paymentDate && filterTo >= paymentDate) {
                var reportRental = {}
                reportRental.postingDate = paymentDate
                reportRental.docType = 'rentals'
                reportRental.rentalAmount = Number(paymentAmount)
                rentalData = rentalData.concat(reportRental)
            }
        })
        const monthlyRentalData = getMonthWiseReport(rentalData)

        // Prefer COGS (cost of goods sold) aggregated from InventoryTransactions for Sales
        var cogsData = []
        if (cogsMap && Object.keys(cogsMap).length) {
            Object.keys(cogsMap).forEach(d => {
                if (filterFrom <= d && filterTo >= d) {
                    cogsData.push({ postingDate: d, docType: 'cogs', cogsAmount: Math.abs(Number(cogsMap[d] || 0)) })
                }
            })
        }
        const monthlyCogsData = getMonthWiseReport(cogsData)

        var purchaseData = []
        purchase.forEach((pur) => {
            const { postingDate, purchaseAmount } = pur
            if (filterFrom <= postingDate && filterTo >= postingDate) {
                var reportPurchase = {}
                reportPurchase.postingDate = postingDate
                reportPurchase.docType = 'purchase'
                reportPurchase.purchaseAmount = Number(purchaseAmount)

                purchaseData = purchaseData.concat(reportPurchase)
            }
        })
        const monthlyPurchaseData = getMonthWiseReport(purchaseData)

        var expenseData = []
        expenses.forEach((exp) => {
            const { postingDate, expensesAmount } = exp
            if (filterFrom <= postingDate && filterTo >= postingDate) {
                var reportExpenses = {}
                reportExpenses.postingDate = postingDate
                reportExpenses.docType = 'expenses'
                reportExpenses.expenseAmount = Number(expensesAmount)
                expenseData = expenseData.concat(reportExpenses)
            }
        })

        var payrollData = []
        attendance.forEach((att) => {
            const { year, month, payees } = att
            payees.forEach((payee) => {
                const postingDate = new Date(Number(year), months.indexOf(month), monthDays[month] + 1).toISOString().slice(0, 10)
                if (filterFrom <= postingDate && filterTo >= postingDate) {
                    var reportSalary = {}
                    const totalPay = Number(payee['Total Pay'] ? payee['Total Pay'] : 0)
                    const adjustment = Number(payee.adjustment) ? Number(payee.adjustment) : 0
                    const bonus = Number(payee['bonus']) ? Number(payee['bonus']) : 0
                    const penalties = Number(payee['penalties']) ? Number(payee['penalties']) : 0
                    const shortages = Number(payee['shortages']) ? Number(payee['shortages']) : 0
                    const debtDue = Number(payee['debtDue']) ? Number(payee['debtDue']) : 0
                    const prevDebt = Number(payee['prevDebt']) ? Number(payee['prevDebt']) : 0
                    const salaryAmount = totalPay + adjustment + bonus
                        - penalties - shortages - debtDue - prevDebt

                    reportSalary.postingDate = postingDate
                    reportSalary.docType = 'salary'
                    reportSalary.salaryAmount = Number(salaryAmount || 0)
                    expenseData = expenseData.concat(reportSalary)
                }
            })
        })
        const monthlyExpenseData = getMonthWiseReport(expenseData)

        return combinedMonthReport([...monthlySalesData, ...monthlyRentalData,
        ...monthlyExpenseData, ...monthlyPurchaseData, ...monthlyCogsData
        ])
    }

    const getMonthWiseReport = (data) => {
        const monthIndex = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
        var newData = []
        monthIndex.forEach((month) => {
            var newRecord = {}
            var sumSalesAmount = 0
            var sumRentalAmount = 0
            var sumPurchaseAmount = 0
            var sumCogsAmount = 0
            var sumExpenseAmount = 0
            data.forEach((record) => {
                const { postingDate, salesAmount, rentalAmount, purchaseAmount, cogsAmount, expenseAmount, salaryAmount } = record
                if (postingDate.split('-')[1] === month) {
                    sumSalesAmount += salesAmount ? salesAmount : 0
                    sumRentalAmount += rentalAmount ? rentalAmount : 0
                    sumPurchaseAmount += purchaseAmount ? purchaseAmount : 0
                    sumCogsAmount += cogsAmount ? cogsAmount : 0
                    sumExpenseAmount += (expenseAmount || salaryAmount || 0)
                }
            })
            newRecord.month = months[Number(month) - 1]
            newRecord.salesAmount = sumSalesAmount
            newRecord.rentalAmount = sumRentalAmount
            newRecord.purchaseAmount = sumPurchaseAmount
            newRecord.cogsAmount = sumCogsAmount
            newRecord.expenseAmount = sumExpenseAmount
            newData = newData.concat(newRecord)
        })
        return newData
    }

    const combinedMonthReport = (monthlyReports) => {
        var combinedReports = []
        months.forEach((month) => {
            var monthlyRecord = {}
            var sumSalesAmount = 0
            var sumRentalAmount = 0
            var sumPurchaseAmount = 0
            var sumCogsAmount = 0
            var sumExpenseAmount = 0

            monthlyReports.forEach((report) => {
                const { salesAmount, rentalAmount, purchaseAmount, cogsAmount, expenseAmount, salaryAmount } = report
                if (report.month === month) {
                    sumSalesAmount += salesAmount
                    sumRentalAmount += rentalAmount
                    sumPurchaseAmount += purchaseAmount
                    sumCogsAmount += cogsAmount
                    sumExpenseAmount += (expenseAmount || salaryAmount || 0)
                }
            })
            monthlyRecord.month = month
            monthlyRecord.salesAmount = sumSalesAmount
            monthlyRecord.rentalAmount = sumRentalAmount
            monthlyRecord.purchaseAmount = sumPurchaseAmount
            monthlyRecord.cogsAmount = sumCogsAmount
            monthlyRecord.expenseAmount = sumExpenseAmount

            combinedReports = combinedReports.concat(monthlyRecord)
        })
        return combinedReports
    }

    const cummulativeBalance = (data, month) => {
        var balance = 0
        var sumSalesAmount = 0
        var sumRentalAmount = 0
        var sumPurchaseAmount = 0
        var sumCogsAmount = 0
        var sumExpenseAmount = 0
        data.forEach((record) => {
            const { salesAmount, rentalAmount, purchaseAmount, cogsAmount, expenseAmount, salaryAmount } = record
            if (months.indexOf(record.month) <= months.indexOf(month)) {
                sumSalesAmount += salesAmount
                sumRentalAmount += rentalAmount
                sumPurchaseAmount += purchaseAmount
                sumCogsAmount += cogsAmount
                sumExpenseAmount += (expenseAmount || salaryAmount || 0)
            }
        })
        balance = sumSalesAmount + sumRentalAmount - sumPurchaseAmount - sumExpenseAmount
        return balance
    }

    const printToPDF = () => {
        const element = reportRef.current;
        const options = {
            margin: 0.2,
            filename: `${curReport.title} REPORT - ${new Date(filterTo).getFullYear()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' }
        };
        html2pdf().set(options).from(element).save();
    };

    return (
        <>
            <div className={`reports ${isFullScreen ? 'reports-fullview-active' : ''}`}>
                {!isFullScreen && (
                    <div className='reports-sidebar'>
                        <div className='reports-sidebar-header'>
                            <div className='reports-kicker'>Insights & Analytics</div>
                            <h2 className='reports-title'>Reports</h2>
                            <p className='reports-subtitle'>Generate and analyze financial statements for your organization.</p>
                        </div>
                        <div className='reports-list' onClick={handleReportSelection}>
                            {reports.map((report, id) => {
                                return (
                                    <div 
                                        className={'report-card' + (curReport.title === report ? ' report-selected' : '')} 
                                        name={report} 
                                        key={id}
                                    >
                                        {report}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                <div className='reports-cover'>
                    <div className='reports-main'>
                        {curReport.title ? (
                            <div className='reports-view-wrapper'>
                                {isFullScreen && (
                                    <div className='fullview-actions'>
                                        <button className='fullview-btn download' onClick={printToPDF}>
                                            <MdDownload size={18} /> Download PDF
                                        </button>
                                        <button className='fullview-btn close' onClick={() => setIsFullScreen(false)}>
                                            <MdClose size={18} /> Exit Full View
                                        </button>
                                    </div>
                                )}
                                
                                <div className='reports-view' ref={reportRef}>
                                    {!isFullScreen && (
                                        <div className='fullview-guide'>
                                            <p className='fullview-note'>Download the report after view full screen</p>
                                            <div 
                                                className='view-toggle-btn' 
                                                onClick={() => setIsFullScreen(true)}
                                            >
                                                <MdFullscreen size={20} /> Full View
                                            </div>
                                        </div>
                                    )}

                                    <div className='report-invhead'>
                                        <div className="billfrom">
                                            <h4 className='company report-company' style={{ color: '#173829' }}>
                                                <strong>{companyRecord.name.toUpperCase()}</strong>
                                            </h4>
                                            <p className='billfromitem report-billfrom'>{`Address: ${companyRecord.address}, ${companyRecord.city}, ${companyRecord.state}, ${companyRecord.country}.`}</p>
                                            <p className='billfromitem report-billfrom'>{`Email: ${companyRecord.emailid}`}</p>
                                        </div>
                                    </div>
                                    <div className='reports-onview'>
                                        <div className='report-title'>
                                            {curReport.description + ` YEAR ${new Date(filterTo).getFullYear()}`}
                                        </div>
                                        {cogsLoading && (
                                            <div className='report-loading'>
                                                Updating cost of goods... Please wait.
                                            </div>
                                        )}
                                        {cogsError && (
                                            <div className='report-error'>
                                                {cogsError}
                                                <button onClick={() => fetchCogsForRange(filterFrom, filterTo)}>Retry</button>
                                            </div>
                                        )}
                                        <div className='report-table-scroll'>
                                            <div className='report-table'>
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            {curReport.columns?.map((col, index) => {
                                                                return <th key={index}>{col}</th>
                                                            })}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {curReport.title === 'PROFIT OR LOSS' && curReport.data.map((report, index) => {
                                                            return (
                                                                <tr key={index}>
                                                                    <td>{report.month}</td>
                                                                    <td>{'₦' + (report.salesAmount).toLocaleString()}</td>
                                                                    <td>{'₦' + (report.cogsAmount || report.purchaseAmount).toLocaleString()}</td>
                                                                    <td>{'₦' + (report.salesAmount - (report.cogsAmount || report.purchaseAmount)).toLocaleString()}</td>
                                                                    <td>{'₦' + (report.rentalAmount).toLocaleString()}</td>
                                                                    <td>{'₦' + (report.expenseAmount).toLocaleString()}</td>
                                                                    <td>{'₦' + (report.salesAmount + report.rentalAmount - (report.cogsAmount || report.purchaseAmount) - report.expenseAmount).toLocaleString()}</td>
                                                                </tr>
                                                            )
                                                        })}
                                                        {curReport.title === 'TRIAL BALANCE' && (
                                                            <tr>
                                                                <td>{`1ST JANUARY`}</td>
                                                                <td>{`OPENING BALANCE, ${new Date(filterFrom).getFullYear()}`}</td>
                                                                <td></td>
                                                                <td></td>
                                                                <td>{'₦' +
                                                                    cummulativeBalance(
                                                                        getAlldata('2024-01-01',
                                                                            new Date(new Date(filterFrom).getFullYear() - 1,
                                                                                months.indexOf('DECEMBER'),
                                                                                monthDays['DECEMBER'] + 1
                                                                            ).toISOString().slice(0, 10)
                                                                        ), 'DECEMBER'
                                                                    ).toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {curReport.title === 'TRIAL BALANCE' &&
                                                            [''].map((args, index) => {
                                                                var cummulativeSum = cummulativeBalance(
                                                                    getAlldata('2024-01-01',
                                                                        new Date(new Date(filterTo).getFullYear() - 1,
                                                                            months.indexOf('DECEMBER'),
                                                                            monthDays['DECEMBER'] + 1
                                                                        ).toISOString().slice(0, 10)
                                                                    ), 'DECEMBER'
                                                                )
                                                                return curReport.data.map((report, index) => {
                                                                    cummulativeSum += report.salesAmount + report.rentalAmount - (report.cogsAmount || report.purchaseAmount) - report.expenseAmount
                                                                    return (
                                                                        <tr key={index}>
                                                                            <td>{report.month}</td>
                                                                            <td>{'SALES INCOME || ADMIN & OTHER EXPENSES'}</td>
                                                                            <td>{'₦' + (report.salesAmount + report.rentalAmount).toLocaleString()}</td>
                                                                            <td>{'₦' + ((report.cogsAmount || report.purchaseAmount) + report.expenseAmount).toLocaleString()}</td>
                                                                            <td>{'₦' + (cummulativeSum).toLocaleString()}</td>
                                                                        </tr>
                                                                    )
                                                                })
                                                            })
                                                        }
                                                    </tbody>
                                                    <tfoot>
                                                        {curReport.title === 'PROFIT OR LOSS' && (
                                                            <tr>
                                                                <th>Total Amount</th>
                                                                {[''].map((arg, index) => {
                                                                    var totalSalesAmount = 0
                                                                    curReport.data.forEach((report) => {
                                                                        totalSalesAmount += report.salesAmount
                                                                    })
                                                                    return <th key={'total-sales'}>{'₦' + totalSalesAmount.toLocaleString()}</th>
                                                                })}
                                                                {[''].map((arg, index) => {
                                                                    var totalPurchaseAmount = 0
                                                                    curReport.data.forEach((report) => {
                                                                        totalPurchaseAmount += (report.cogsAmount || report.purchaseAmount)
                                                                    })
                                                                    return <th key={'total-purchase'}>{'₦' + totalPurchaseAmount.toLocaleString()}</th>
                                                                })}
                                                                {[''].map((arg, index) => {
                                                                    var totalSalesAmount = 0
                                                                    var totalPurchaseAmount = 0
                                                                    curReport.data.forEach((report) => {
                                                                        totalSalesAmount += report.salesAmount
                                                                        totalPurchaseAmount += (report.cogsAmount || report.purchaseAmount)
                                                                    })
                                                                    return <th key={'total-gross'}>{'₦' + (totalSalesAmount - totalPurchaseAmount).toLocaleString()}</th>
                                                                })}
                                                                {[''].map((arg, index) => {
                                                                    var totalRentalAmount = 0
                                                                    curReport.data.forEach((report) => {
                                                                        totalRentalAmount += report.rentalAmount
                                                                    })
                                                                    return <th key={'total-rental'}>{'₦' + totalRentalAmount.toLocaleString()}</th>
                                                                })}
                                                                {[''].map((arg, index) => {
                                                                    var totalExpenseAmount = 0
                                                                    curReport.data.forEach((report) => {
                                                                        totalExpenseAmount += report.expenseAmount
                                                                    })
                                                                    return <th key={'total-expense'}>{'₦' + totalExpenseAmount.toLocaleString()}</th>
                                                                })}
                                                                {[''].map((arg, index) => {
                                                                    var totalSalesAmount = 0
                                                                    var totalRentalAmount = 0
                                                                    var totalPurchaseAmount = 0
                                                                    var totalExpenseAmount = 0
                                                                    curReport.data.forEach((report) => {
                                                                        totalSalesAmount += report.salesAmount
                                                                        totalRentalAmount += report.rentalAmount
                                                                        totalPurchaseAmount += (report.cogsAmount || report.purchaseAmount)
                                                                        totalExpenseAmount += report.expenseAmount
                                                                    })
                                                                    return <th key={'total-net'}>{'₦' + (totalSalesAmount + totalRentalAmount - totalPurchaseAmount - totalExpenseAmount).toLocaleString()}</th>
                                                                })}
                                                            </tr>
                                                        )}
                                                        {curReport.title === 'TRIAL BALANCE' && (
                                                            <tr>
                                                                <th>Total Amount</th>
                                                                <th>{`CLOSING BALANCE, ${new Date(filterTo).getFullYear()}`}</th>
                                                                <th></th>
                                                                <th></th>
                                                                {[''].map((arg, index) => {
                                                                    var totalSalesAmount = 0
                                                                    var totalRentalAmount = 0
                                                                    var totalPurchaseAmount = 0
                                                                    var totalExpenseAmount = 0
                                                                    curReport.data.forEach((report) => {
                                                                        totalSalesAmount += report.salesAmount
                                                                        totalRentalAmount += report.rentalAmount
                                                                        totalPurchaseAmount += (report.cogsAmount || report.purchaseAmount)
                                                                        totalExpenseAmount += report.expenseAmount
                                                                    })
                                                                    var cummulativeSum = cummulativeBalance(
                                                                        getAlldata('2024-01-01',
                                                                            new Date(new Date(filterTo).getFullYear() - 1,
                                                                                months.indexOf('DECEMBER'),
                                                                                monthDays['DECEMBER'] + 1
                                                                            ).toISOString().slice(0, 10)
                                                                        ), 'DECEMBER'
                                                                    )
                                                                    return <th key={'total-closing'}>{'₦' + (cummulativeSum + totalSalesAmount + totalRentalAmount - totalPurchaseAmount - totalExpenseAmount).toLocaleString()}</th>
                                                                })}
                                                            </tr>
                                                        )}
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className='no-report'>
                                <div>Select a report from the sidebar to begin.</div>
                            </div>
                        )}
                    </div>

                    {!isFullScreen && (
                        <div className='reports-right-panel'>
                            <div className='panel-section'>
                                <h4 className='panel-section-title'>Reporting Period</h4>
                                <div className='inp-cov'>
                                    <div className='inpcov reppad'>
                                        <div>Date From</div>
                                        <input
                                            className='forminp inppad'
                                            name='salesfrom'
                                            type='date'
                                            value={filterFrom}
                                            disabled={companyRecord.status !== 'admin'}
                                            onChange={(e) => setFilterFrom(e.target.value)}
                                        />
                                    </div>
                                    <div className='inpcov reppad'>
                                        <div>Date To</div>
                                        <input
                                            className='forminp inppad'
                                            name='salesto'
                                            type='date'
                                            value={filterTo}
                                            disabled={companyRecord.status !== 'admin'}
                                            onChange={(e) => setFilterTo(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button 
                                className="action-btn" 
                                onClick={() => fetchCogsForRange(filterFrom, filterTo)}
                            >
                                Apply Report Filter
                            </button>

                            <div className='panel-section'>
                                <h4 className='panel-section-title'>Actions</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <button 
                                        className="action-btn" 
                                        style={{ background: '#f8faf9', color: '#173829', border: '1px solid #173829' }}
                                        onClick={handleSyncOfflineReports} 
                                        disabled={isSyncing}
                                    >
                                        {isSyncing ? 'Syncing...' : 'Sync Offline Data'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export default Reports
