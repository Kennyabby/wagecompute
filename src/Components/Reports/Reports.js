import './Reports.css'

import { useState, useEffect, useContext, useRef } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import html2pdf from 'html2pdf.js';

const Reports = ()=>{
    const { storePath,
        server, 
        fetchServer,
        companyRecord,
        company, getDate, years, monthDays,
        employees, months, expenses, sales, rentals, purchase, attendance,
        alert,alertState,alertTimeout,actionMessage, 
        setAlert, setAlertState, setAlertTimeout, setActionMessage
    } = useContext(ContextProvider)

    useEffect(()=>{
        storePath('reports')  
    },[storePath])

    const [filterFrom, setFilterFrom] = useState(new Date(new Date().getFullYear(), 0, 2).toISOString().slice(0,10))
    const [filterTo, setFilterTo] = useState(new Date(Date.now()).toISOString().slice(0,10))
    const reports = ['PROFIT OR LOSS', 'TRIAL BALANCE', 'BALANCE SHEET']
    const [curReport, setCurReport] = useState({
        title:reports[0], 
        data:[],
        description: 'Statement of profit or Loss and Other Comprehensive Income for'.toUpperCase(),
        columns: ['Month','Sales Income', 'Other Income','Purchases', 'Gross Profit', 'Admin Expenses', 'Net Profit']
    })
    const reportRef = useRef(null)
    const handleReportSelection = (e)=>{
        const name = e.target.getAttribute('name')
        if (name){
            if (name==='PROFIT OR LOSS'){
                setCurReport({
                    title:name,
                    data:getPandLdata(filterFrom, filterTo),
                    description: 'Statement of profit or Loss and Other Comprehensive Income for'.toUpperCase(),
                    columns: ['Month','Sales Income', 'Other Income','Purchases', 'Gross Profit', 'Admin Expenses', 'Net Profit']
                })
            }else if (name==='TRIAL BALANCE'){
                setCurReport({
                    title:name,
                    description: 'Trial Balance for'.toUpperCase(),
                    data:getTrialBalance(filterFrom, filterTo),
                    columns:['Month', 'Description', 'Credit', 'Debit']
                })
            }else if (name==='BALANCE SHEET'){
                setCurReport({
                    title:name,
                    description: 'Balance Sheet Report for'.toUpperCase(),
                    data:getBalanceSheet(filterFrom, filterTo),
                    columns:['Month']
                })
            }
        }
    }

    useEffect(()=>{
        if (curReport.title === 'PROFIT OR LOSS'){
            setCurReport((curReport)=>{                
                return {...curReport, data:getPandLdata(filterFrom,filterTo)}
            })
        }else if (curReport.title === 'TRIAL BALANCE'){
            setCurReport((curReport)=>{                
                return {...curReport, data:getTrialBalance(filterFrom,filterTo)}
            })
        }else if (curReport.title === 'BALANCE SHEET'){
            setCurReport((curReport)=>{                
                return {...curReport, data:getBalanceSheet(filterFrom,filterTo)}
            })
        }
    },[filterFrom,filterTo, expenses, sales, rentals, purchase])

    const getBalanceSheet = (filterFrom, filterTo)=>{
        return getAlldata(filterFrom, filterTo)
    }

    const getTrialBalance = (filterFrom, filterTo)=>{
        return getAlldata(filterFrom, filterTo)
    }

    const getPandLdata = (filterFrom, filterTo) =>{
        return getAlldata(filterFrom, filterTo)
    }
    const getAlldata = (filterFrom, filterTo)=>{
        var saledata = []
        sales.forEach((sale)=>{
            const {postingDate, totalCashSales, totalBankSales, 
                    totalDebt, totalShortage, totalDebtRecovered} = sale
            if (filterFrom <= postingDate && filterTo >= postingDate){                
                var reportSale = {}
                reportSale.postingDate = postingDate
                reportSale.docType = 'sales'
                reportSale.salesAmount = Number(totalCashSales) + Number(totalBankSales) 
                + Number(totalDebt) + Number(totalShortage) + Number(totalDebtRecovered?totalDebtRecovered:0)
                
                saledata = saledata.concat(reportSale)
            }
        })
        const monthlySalesData = getMonthWiseReport(saledata)

        var rentalData = []
        rentals.forEach((rental)=>{
            const {paymentDate, paymentAmount} = rental
            if (filterFrom <= paymentDate && filterTo >= paymentDate){
                var reportRental = {}
                reportRental.postingDate = paymentDate
                reportRental.docType = 'rentals'
                reportRental.rentalAmount = Number(paymentAmount)
    
                rentalData = rentalData.concat(reportRental)
            }
        })
        const monthlyRentalData = getMonthWiseReport(rentalData)

        var purchaseData = []
        purchase.forEach((pur)=>{
            const {postingDate, purchaseAmount} = pur
            if (filterFrom <= postingDate && filterTo >= postingDate){                
                var reportPurchase = {}
                reportPurchase.postingDate = postingDate
                reportPurchase.docType = 'purchase'
                reportPurchase.purchaseAmount = Number(purchaseAmount)
    
                purchaseData = purchaseData.concat(reportPurchase)
            }
        })
        const monthlyPurchaseData = getMonthWiseReport(purchaseData)

        var expenseData = []
        expenses.forEach((exp)=>{
            const {postingDate, expensesAmount} = exp
            if (filterFrom <= postingDate && filterTo >= postingDate){                
                var reportExpenses = {}
                reportExpenses.postingDate = postingDate
                reportExpenses.docType = 'expenses'
                reportExpenses.expenseAmount = Number(expensesAmount)
                expenseData = expenseData.concat(reportExpenses)
            }
        })        

        var payrollData = []
        attendance.forEach((att)=>{
            const {year, month, payees} = att
            payees.forEach((payee)=>{   
                const postingDate = new Date(Number(year), months.indexOf(month), monthDays[month]+1).toISOString().slice(0,10)
                if (filterFrom <= postingDate && filterTo >= postingDate){                
                    var reportSalary = {}
                    const totalPay = Number(payee['Total Pay']?payee['Total Pay']:0)
                    const adjustment = Number(payee.adjustment) ? Number(payee.adjustment) : 0
                    const bonus = Number(payee['bonus']) ? Number(payee['bonus']): 0 
                    const penalties = Number(payee['penalties']) ? Number(payee['penalties']) : 0
                    const shortages = Number(payee['shortages'])? Number(payee['shortages']) : 0
                    const debtDue = Number(payee['debtDue'])? Number(payee['debtDue']) : 0
                    const salaryAmount = totalPay + adjustment + bonus
                    + penalties - shortages - debtDue
    
                    reportSalary.postingDate = postingDate
                    reportSalary.docType = 'salary'
                    reportSalary.salaryAmount = salaryAmount
    
                    expenseData = expenseData.concat(reportSalary)
                }
            })
        }) 
        const monthlyExpenseData = getMonthWiseReport(expenseData)

        return combinedMonthReport([...monthlySalesData,...monthlyRentalData,
            ...monthlyExpenseData,...monthlyPurchaseData
        ])
    }

    const getMonthWiseReport = (data) => {
        const monthIndex = ['01','02','03','04','05','06','07','08','09','10','11','12']
        var newData = []
        monthIndex.forEach((month)=>{  
            var newRecord = {}          
            var sumSalesAmount = 0
            var sumRentalAmount = 0
            var sumPurchaseAmount = 0
            var sumExpenseAmount = 0
            data.forEach((record)=>{
                const {postingDate, salesAmount, rentalAmount, purchaseAmount, expenseAmount} = record
                if (postingDate.split('-')[1] === month){
                    sumSalesAmount += salesAmount ? salesAmount : 0
                    sumRentalAmount += rentalAmount ? rentalAmount : 0
                    sumPurchaseAmount += purchaseAmount ? purchaseAmount : 0
                    sumExpenseAmount += expenseAmount ? expenseAmount : 0
                }
            })
            newRecord.month = months[Number(month)-1]
            newRecord.salesAmount = sumSalesAmount
            newRecord.rentalAmount = sumRentalAmount
            newRecord.purchaseAmount = sumPurchaseAmount
            newRecord.expenseAmount = sumExpenseAmount
            newData = newData.concat(newRecord)
        })
        return newData
    }

    const combinedMonthReport = (monthlyReports)=>{
        var combinedReports = []
        months.forEach((month)=>{
            var monthlyRecord = {}
            var sumSalesAmount = 0
            var sumRentalAmount = 0
            var sumPurchaseAmount = 0
            var sumExpenseAmount = 0
            monthlyReports.forEach((report)=>{
                const {salesAmount, rentalAmount, purchaseAmount, expenseAmount} = report
                if (report.month === month){
                    sumSalesAmount += salesAmount
                    sumRentalAmount += rentalAmount
                    sumPurchaseAmount += purchaseAmount 
                    sumExpenseAmount += expenseAmount
                }
            })                        
            monthlyRecord.month = month
            monthlyRecord.salesAmount = sumSalesAmount
            monthlyRecord.rentalAmount = sumRentalAmount
            monthlyRecord.purchaseAmount = sumPurchaseAmount
            monthlyRecord.expenseAmount = sumExpenseAmount

            combinedReports = combinedReports.concat(monthlyRecord)
        })
        return combinedReports
    }

    const printToPDF = () => {
        const element = reportRef.current;
        const options = {
            margin:       0.2,
            filename:     `${curReport.title} REPORT - ${new Date(filterTo).getFullYear()}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'A4', orientation: 'landscape' }
        };
        html2pdf().set(options).from(element).save();
    };
    return (
        <>
            <div className='reports'>
                <div className='reports-list' onClick={handleReportSelection}>
                    {reports.map((report, id)=>{
                        return <div className={'report-card'+(curReport.title===report?' report-selected':'')} name={report} key={id}>
                            {report}
                        </div>
                    })}
                </div>
                <div className='reports-cover'>
                    <div className='reports-view' ref={reportRef}>
                        <div className='report-invhead'>
                            <div className="billfrom">
                                <h4 className='company report-company' style={{ color: '#325aa8' }}><strong>{companyRecord.name.toUpperCase()}</strong></h4>
                                <p className='billfromitem report-billfrom'>{`Address: ${companyRecord.address}, ${companyRecord.city}, ${companyRecord.state}, ${companyRecord.country}.`}</p>
                                <p className='billfromitem report-billfrom'>{`Email: ${companyRecord.emailid}`}</p>
                            </div>
                        </div>
                        {curReport.title?<div className='reports-onview'>
                            <div className='report-title'>
                                {curReport.description + ` YEAR ${new Date(filterTo).getFullYear()}`}
                            </div>
                            <div className='report-table'>
                                <table>
                                    <thead>
                                        <tr>
                                            {curReport.columns?.map((col, index)=>{
                                                return <th key={index}>{col}</th>
                                            })}                                            
                                        </tr>                                        
                                    </thead>
                                    <tbody>
                                        {curReport.title === 'PROFIT OR LOSS' && curReport.data.map((report, index)=>{
                                            return <tr key={index}>
                                                <td>{report.month}</td>
                                                <td>{'₦'+(report.salesAmount).toLocaleString()}</td>
                                                <td>{'₦'+(report.rentalAmount).toLocaleString()}</td>
                                                <td>{'₦'+(report.purchaseAmount).toLocaleString()}</td>
                                                <td>{'₦'+(report.salesAmount + report.rentalAmount - report.purchaseAmount).toLocaleString()}</td>
                                                <td>{'₦'+(report.expenseAmount).toLocaleString()}</td>
                                                <td>{'₦'+(report.salesAmount + report.rentalAmount - report.purchaseAmount - report.expenseAmount).toLocaleString()}</td>
                                            </tr>
                                        })}
                                        {curReport.title === 'TRIAL BALANCE' && curReport.data.map((report, index)=>{
                                            return <tr key={index}>
                                                <td>{report.month}</td>
                                                <td>{'SALES INCOME || ADMIN & OTHER EXPENSES'}</td>
                                                <td>{'₦'+(report.salesAmount + report.rentAmount).toLocaleString()}</td>
                                                <td>{'₦'+(report.purchaseAmount + report.expenseAmount).toLocaleString()}</td>                                                
                                            </tr>
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <th>Total Amount</th>                                            
                                            {curReport.title === 'PROFIT OR LOSS' && 
                                                [''].map((arg, index)=>{
                                                    var totalSalesAmount = 0
                                                    curReport.data.forEach((report)=>{
                                                        totalSalesAmount += report.salesAmount 
                                                    })          
                                                    return <th>{'₦'+totalSalesAmount.toLocaleString()}</th>                                          
                                                })
                                            }                                         
                                            {curReport.title === 'PROFIT OR LOSS' && 
                                                [''].map((arg, index)=>{
                                                    var totalRentalAmount = 0
                                                    curReport.data.forEach((report)=>{
                                                        totalRentalAmount += report.rentalAmount 
                                                    })          
                                                    return <th>{'₦'+totalRentalAmount.toLocaleString()}</th>                                          
                                                })
                                            }                                         
                                            {curReport.title === 'PROFIT OR LOSS' && 
                                                [''].map((arg, index)=>{
                                                    var totalPurchaseAmount = 0
                                                    curReport.data.forEach((report)=>{
                                                        totalPurchaseAmount += report.purchaseAmount 
                                                    })          
                                                    return <th>{'₦'+totalPurchaseAmount.toLocaleString()}</th>                                          
                                                })
                                            }                                         
                                            {curReport.title === 'PROFIT OR LOSS' && 
                                                [''].map((arg, index)=>{
                                                    var totalSalesAmount = 0
                                                    var totalRentalAmount = 0
                                                    var totalPurchaseAmount = 0
                                                    curReport.data.forEach((report)=>{
                                                        totalSalesAmount += report.salesAmount 
                                                        totalRentalAmount += report.rentalAmount 
                                                        totalPurchaseAmount += report.purchaseAmount 
                                                    })          
                                                    return <th>{'₦'+(totalSalesAmount + totalRentalAmount - totalPurchaseAmount).toLocaleString()}</th>                                          
                                                })
                                            }                                         
                                            {curReport.title === 'PROFIT OR LOSS' && 
                                                [''].map((arg, index)=>{
                                                    var totalExpenseAmount = 0
                                                    curReport.data.forEach((report)=>{
                                                        totalExpenseAmount += report.expenseAmount 
                                                    })          
                                                    return <th>{'₦'+totalExpenseAmount.toLocaleString()}</th>                                          
                                                })
                                            }                                                                                     
                                            {curReport.title === 'PROFIT OR LOSS' && 
                                                [''].map((arg, index)=>{
                                                    var totalSalesAmount = 0
                                                    var totalRentalAmount = 0
                                                    var totalPurchaseAmount = 0
                                                    var totalExpenseAmount = 0
                                                    curReport.data.forEach((report)=>{
                                                        totalSalesAmount += report.salesAmount 
                                                        totalRentalAmount += report.rentalAmount
                                                        totalPurchaseAmount += report.purchaseAmount
                                                        totalExpenseAmount += report.expenseAmount
                                                    })          
                                                    return <th>{'₦'+(totalSalesAmount + totalRentalAmount - totalPurchaseAmount - totalExpenseAmount).toLocaleString()}</th>                                          
                                                })
                                            }
                                            {curReport.title === 'TRIAL BALANCE' && 
                                                [''].map((arg, index)=>{
                                                    var totalSalesAmount = 0
                                                    var totalRentalAmount = 0
                                                    curReport.data.forEach((report)=>{
                                                        totalSalesAmount += report.salesAmount 
                                                        totalRentalAmount += report.rentalAmount 
                                                    })          
                                                    return <th>{'₦'+(totalSalesAmount + totalRentalAmount).toLocaleString()}</th>                                          
                                                })
                                            }                                         
                                            {curReport.title === 'TRIAL BALANCE' && 
                                                [''].map((arg, index)=>{
                                                    var totalPurchaseAmount = 0
                                                    var totalExpenseAmount = 0
                                                    curReport.data.forEach((report)=>{
                                                        totalPurchaseAmount += report.purchaseAmount
                                                        totalExpenseAmount += report.expenseAmount
                                                    })          
                                                    return <th>{'₦'+(totalPurchaseAmount + totalExpenseAmount).toLocaleString()}</th>                                          
                                                })
                                            }                                                                                                                                 
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                        </div> 
                        :<div className='no-report'>
                            <div>Select Report To View!</div>
                        </div>}
                    </div>
                    <div className='reports-filter'>
                        <div className='inp-cov'>
                            <div className='inpcov reppad'>
                                <div>Date From</div>
                                <input 
                                    className='forminp inppad'
                                    name='salesfrom'
                                    type='date'
                                    placeholder='From'
                                    value={filterFrom}
                                    disabled={companyRecord.status!=='admin'}
                                    onChange={(e)=>{
                                        setFilterFrom(e.target.value)
                                    }}
                                />
                            </div>
                            <div className='inpcov reppad'>
                                <div>Date To</div>
                                <input 
                                    className='forminp inppad'
                                    name='salesto'
                                    type='date'
                                    placeholder='To'
                                    value={filterTo}
                                    disabled={companyRecord.status!=='admin'}
                                    onChange={(e)=>{
                                        setFilterTo(e.target.value)
                                    }}
                                />
                            </div>
                        </div>
                        <div 
                            className='print-report'
                            onClick={printToPDF}
                        >
                            Print Report
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Reports