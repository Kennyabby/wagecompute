import './SalesReport.css'
import {useState, useContext, useRef, useEffect} from 'react'
import ContextProvider from '../../../Resources/ContextProvider'
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import html2pdf from 'html2pdf.js';

const SalesReport = ({
    reportSales,multiple,
    fromDate,
    toDate,
    saleEmployee,
    setShowReport,
})=>{
    const [InvoiceNumber, setInvoiceNumber] = useState('')
    const payPoints = {
        'moniepoint1':'', 'moniepoint2':'', 
        'moniepoint3':'', 'cash':''
    }
    const salesUnits = {
        'open bar1':{...payPoints}, 'open bar2':{...payPoints}, 
        'kitchen':{...payPoints}, 'vip':{...payPoints}, 
        'accomodation':{...payPoints}
    }
    const targetRef = useRef(null)
    const [reportEmployees, setReportEmployees] = useState([])
    const [reportAllSales, setReportAllSales] = useState({})
    const [reportAllPayPoints, setReportAllPaypoints] = useState({})
    const [reportAllSalesUnits, setReportAllSalesUnits] = useState({})
    const [reportAllSalesDebts, setReportAllSalesDebts] = useState({})

    const {storePath,
        getDate,
        company, companyRecord,
        monthDays,
        employees,
        attendance
    } = useContext(ContextProvider)
   
    const getInvoiceNumber = () =>{
        const invdate = Date.now()
        return "INV_"+company+invdate
    }

    useEffect(()=>{
        var reportEmps = []
        reportSales.record.forEach((sale)=>{
             employees.forEach((emp)=>{
                 if (emp.i_d === sale.employeeId && !reportEmps.includes(emp)){
                     reportEmps = reportEmps.concat(emp)
                     setReportEmployees((reportEmployees)=>{
                         return [...reportEmployees,emp]
                     })                        
                 }
             })                            
         })
     
         employees.forEach((emp)=>{
             var sumBankSales = 0
             var sumCashSales = 0
             var sumDebt = 0
             var sumShortage = 0
             var sumDebtRecovered = 0
             var allDebt = 0
             var allSales = 0
             var allDebtRecovered = 0
             reportSales.record.forEach((sale)=>{
                 if (emp.i_d === sale.employeeId){
                     sumBankSales += Number(sale.bankSales)
                     sumCashSales += Number(sale.cashSales)
                     sumDebt += Number(sale.debt)
                     sumShortage += Number(sale.shortage)
                     sumDebtRecovered += Number(sale.debtRecovered ? sale.debtRecovered: 0)
                     allSales += Number(sale.bankSales) + Number(sale.cashSales) + Number(sale.debt) + Number(sale.shortage)
                     allDebt += Number(sale.debt) + Number(sale.shortage)
                     allDebtRecovered += Number(sale.debtRecovered ? sale.debtRecovered: 0)
                 }
             })                            
             setReportAllSales((reportAllSales)=>{
                 return {...reportAllSales, [emp.i_d]:{allSales,allDebt,allDebtRecovered}}
             })
         })
   
         var newPayPoints = {}
         Object.keys(payPoints).forEach((payPoint)=>{
             newPayPoints[payPoint]={}               
             reportSales.record.forEach((record)=>{                                                        
                 employees.forEach((emp)=>{
                     if (record.employeeId === emp.i_d){
                         newPayPoints[payPoint][emp.i_d] = 0
                         var totalpaypoint = 0
                         reportSales.record.forEach((sale)=>{
                             if (emp.i_d === sale.employeeId){
                                 Object.keys(salesUnits).forEach((unit)=>{
                                     totalpaypoint += Number(sale[unit][payPoint])
                                 })                         
                             }
                         })                                
                         newPayPoints[payPoint][emp.i_d] = totalpaypoint                                                           
                     }
                 })                    
             })     
         })
         setReportAllPaypoints(newPayPoints) 
         
         var newSaleUnits = {}
         Object.keys(salesUnits).forEach((saleunit)=>{
             newSaleUnits[saleunit] = {}
             Object.keys(payPoints).forEach((paypoint)=>{
                 newSaleUnits[saleunit][paypoint] = 0
                 reportSales.record.forEach((record)=>{
                     newSaleUnits[saleunit][paypoint] += Number(record[saleunit][paypoint])
                 })
             })
         })
         setReportAllSalesUnits(newSaleUnits)

         var newDebtUnits = {}
         Object.keys(salesUnits).forEach((saleunit)=>{
            newDebtUnits[saleunit] = 0
             reportSales.record.forEach((record)=>{
                 if (record.salesPoint === saleunit){
                     newDebtUnits[saleunit] += Number(record.debt) + Number(record.shortage)
                 }
             })               
         })
         setReportAllSalesDebts(newDebtUnits)
    },[reportSales])
    
    const options = {
        // default is `save`
        // method: 'open',
        method: 'save',
        // default is Resolution.MEDIUM = 3, which should be enough, higher values
        // increases the image quality but also the size of the PDF, so be careful
        // using values higher than 10 when having multiple pages generated, it
        // might cause the page to crash or hang.
        // resolution: Resolution.HIGH,
        resoluton: Resolution.MEDIUM = 5,
        page: {
           // margin is in MM, default is Margin.NONE = 0
        //    margin: Margin.SMALL,
           margin: Margin.SMALL,
           // default is 'A4'
           format: 'A4',
           // default is 'portrait'
           orientation: 'landscape',
        },
        canvas: {
           // default is 'image/jpeg' for better size performance
           mimeType: 'image/jpeg',
           qualityRatio: 1
        },
        // Customize any value passed to the jsPDF instance and html2canvas
        // function. You probably will not need this and things can break, 
        // so use with caution.
        overrides: {
           // see https://artskydj.github.io/jsPDF/docs/jsPDF.html for more options
           pdf: {
              compress: true
           },
           // see https://html2canvas.hertzen.com/configuration for more options
           canvas: {
              useCORS: true
           }
        },
        filename: `SALES REPORT - FROM ${getDate(fromDate)} TO ${getDate(toDate)}.pdf`
    };

    const printToPDF = () => {
        const element = targetRef.current;
        const options = {
            margin:       0.2,
            filename:     `SALES REPORT - FROM ${getDate(fromDate)} TO ${getDate(toDate)}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'A4', orientation: 'portrait' }
        };
        html2pdf().set(options).from(element).save();
    };
    return(
        <>
            {<div className='payslip'>
                    <div className='cancelslip'
                        onClick= {()=>{
                            setShowReport(false)
                        }}
                    >
                        Cancel
                    </div>
                    <div className='mainslip'>
                        <div className=""  ref={targetRef}>
                        <div className="">
                        <div className="row payeerow">
                            <div>
                                <div className="">
                                    <div className="row payeerow">
                                       <div className='invhead'>
                                            <div className="billfrom">
                                                <h4 className='payeecompany' style={{ color: '#325aa8' }}><strong>{companyRecord.name.toUpperCase()}</strong></h4>
                                                {/* <p className='billfrompayee'>{`Address: ${companyRecord.address}, ${companyRecord.city}, ${companyRecord.state}, ${companyRecord.country}.`}</p>
                                                <p className='billfrompayee'>{`Email: ${companyRecord.emailid}`}</p> */}
                                                <p className='billfrompayee'>{`SALES FROM `}<b>{`${getDate(fromDate)}`}</b>{` TO `}<b>{`${getDate(toDate)}`}</b></p>                                                                                   
                                                <p className='billfrompayee'>Created Date: <b>{getDate()}</b></p>
                                            </div>
                                       </div>
                                    </div>
                                    <div className='tablecover'>
                                        <div>SALES SUMMARY</div>
                                        <table className="table payeetable">   
                                            <thead>
                                                <tr>
                                                    <th><h8 className='theader'>NAMES</h8></th>
                                                    {reportEmployees.map((emp)=>{
                                                        return(
                                                            <th><h8 className='theader'>{emp.firstName}</h8></th>                                                        
                                                        )                                                        
                                                    })}
                                                    <th><h8 className='theader'>TOTAL</h8></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className='ttrow'> </td>                                                        
                                                    {reportEmployees.map((emp)=>{
                                                        return(
                                                            <th><h8 className='ttrow'>{'₦'}</h8></th>                                                        
                                                        )                                                                                                                
                                                    })}                                                    
                                                    <td className='ttrow'>₦</td>                                                        
                                                </tr>
                                                <tr>
                                                    <td className='ttrow'>SALES</td>
                                                    {reportEmployees.map((emp)=>{
                                                        return(
                                                            <td className='ttrow'>{(reportAllSales[emp.i_d]['allSales']).toLocaleString()}</td>
                                                        )                                                        
                                                    })} 
                                                    {<td className='ttrow'>{(Number(reportSales.totalCashSales)+Number(reportSales.totalBankSales)+Number(reportSales.totalDebt)+Number(reportSales.totalShortage)).toLocaleString()}</td>}                                                        
                                                </tr>
                                                <tr>
                                                    <td className='ttrow'>DEBT</td>                                                        
                                                    {reportEmployees.map((emp)=>{
                                                        return(
                                                            <td className='ttrow'>{(reportAllSales[emp.i_d]['allDebt']).toLocaleString()}</td>
                                                        )                                                        
                                                    })}
                                                    {<td className='ttrow'>{(Number(reportSales.totalDebt)+Number(reportSales.totalShortage)).toLocaleString()}</td>}
                                                </tr>
                                                <tr>
                                                    <td className='ttrow'>TOTAL</td>                                                        
                                                    {reportEmployees.map((emp)=>{
                                                        return(
                                                            <td className='ttrow'>{(reportAllSales[emp.i_d]['allSales'] - reportAllSales[emp.i_d]['allDebt']).toLocaleString()}</td>
                                                        )                                                                
                                                    })}                                                   
                                                    {<td className='ttrow'>{(Number(reportSales.totalCashSales)+Number(reportSales.totalBankSales)).toLocaleString()}</td>}
                                                </tr>                                                                                                
                                            </tbody>
                                        </table>
                                        <div>SUMMARY OF DAILY COLLECTIONS</div>
                                        <table className="table payeetable">   
                                            <thead>
                                                <tr>
                                                    <th><h8 className='theader'>NAMES</h8></th>
                                                        {reportEmployees.map((emp)=>{
                                                            return(
                                                                <th><h8 className='theader'>{emp.firstName}</h8></th>                                                        
                                                            )                                                        
                                                        })}
                                                    <th><h8 className='theader'>TOTAL</h8></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                <td className='ttrow'>PAYMENT POINT</td>                                                        
                                                    {reportEmployees.map((emp)=>{
                                                        return(
                                                            <th><h8 className='ttrow'>{'₦'}</h8></th>                                                        
                                                        )                                                                                                                
                                                    })}                                                    
                                                    <td className='ttrow'>₦</td>                                                        
                                                </tr>
                                                {Object.keys(payPoints).map((payPoint)=>{
                                                    var totalPaypointAmount = 0
                                                    return (
                                                        <tr>
                                                            <td className='ttrow'>{payPoint.toUpperCase()}</td>                                                        
                                                            {reportEmployees.map((emp)=>{
                                                                totalPaypointAmount += reportAllPayPoints[payPoint][emp.i_d]
                                                                return(
                                                                    <td className='ttrow'>{(reportAllPayPoints[payPoint][emp.i_d]).toLocaleString()}</td>                                                                    
                                                                )
                                                                
                                                            })}                                                                                                                        
                                                            <td className='ttrow'>{(totalPaypointAmount).toLocaleString()}</td>                                                       
                                                        </tr>
                                                    )
                                                })}                                               
                                                <tr>
                                                    <td className='ttrow'>TOTAL</td>  
                                                    {reportEmployees.map((emp)=>{
                                                        return(
                                                            <td className='ttrow'>{(reportAllSales[emp.i_d]['allSales'] - reportAllSales[emp.i_d]['allDebt']).toLocaleString()}</td>
                                                        )                                                                
                                                    })}                                                      
                                                    
                                                    {<td className='ttrow'>{(Number(reportSales.totalCashSales)+Number(reportSales.totalBankSales)).toLocaleString()}</td>}
                                                </tr>                                                                                                
                                            </tbody>
                                        </table>
                                        <div>DAILY SALES SUMMARY</div>
                                        <table className="table payeetable">   
                                            <thead>
                                                <tr>
                                                    <th><h8 className='theader'>PAYMENT POINT</h8></th>
                                                    {Object.keys(payPoints).map((paypoint)=>{
                                                        return(
                                                            <th><h8 className='theader'>{paypoint.toUpperCase()}</h8></th>
                                                        )
                                                    })}
                                                    <th><h8 className='theader'>SUB TOTAL</h8></th>
                                                    <th><h8 className='theader'>DEBT</h8></th>
                                                    <th><h8 className='theader'>TOTAL</h8></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className='ttrow'>SALES UNIT</td>                                                        
                                                    {Object.keys(payPoints).map(()=>{
                                                        return(
                                                            <td className='ttrow'>₦</td>
                                                        )
                                                    })}
                                                    <td className='ttrow'>₦</td>                                                        
                                                    <td className='ttrow'>₦</td>                                                        
                                                    <td className='ttrow'>₦</td>                                                        
                                                </tr>
                                                {Object.keys(salesUnits).map((salesunit)=>{
                                                    var totalSaleUnitAmount = 0
                                                    var cursaleunits = []
                                                    var cursaleunits1 = []
                                                    return (
                                                        <tr>
                                                            <td className='ttrow'>{salesunit.toUpperCase()}</td>                                                        
                                                            {Object.keys(payPoints).map((paypoint)=>{  
                                                                if (reportAllSalesUnits[salesunit]){
                                                                    totalSaleUnitAmount += reportAllSalesUnits[salesunit][paypoint]                                                            
                                                                    return (
                                                                        <td className='ttrow'>{reportAllSalesUnits[salesunit][paypoint].toLocaleString()}</td>                                                        
                                                                    )
                                                                }else{
                                                                    return (
                                                                        <td className='ttrow'>0</td>                                                        
                                                                    )
                                                                } 
                                                            })}
                                                            {<td className='ttrow'>{(totalSaleUnitAmount).toLocaleString()}</td>}                                                        
                                                            {reportAllSalesDebts[salesunit]!==undefined && <td className='ttrow'>{(reportAllSalesDebts[salesunit]).toLocaleString()}</td>}                                                        
                                                            {reportAllSalesDebts[salesunit]!==undefined && <td className='ttrow'>{(totalSaleUnitAmount + reportAllSalesDebts[salesunit]).toLocaleString()}</td>}                                                                                                                                                                            
                                                        </tr>
                                                    )
                                                })}                                               
                                                <tr>
                                                    <td className='ttrow'>TOTAL</td>  
                                                    {Object.keys(payPoints).map((paypoint)=>{
                                                        var totalPaypointAmount = 0
                                                        Object.keys(salesUnits).forEach((salesunit)=>{
                                                            if (reportAllSalesUnits[salesunit]){
                                                                totalPaypointAmount += reportAllSalesUnits[salesunit][paypoint]
                                                            }
                                                        })
                                                        return (                                                            
                                                            <td className='ttrow'>{(totalPaypointAmount).toLocaleString()}</td>
                                                        )                                                                                                                
                                                    })}
                                                    {<td className='ttrow'>{(Number(reportSales.totalCashSales)+Number(reportSales.totalBankSales)).toLocaleString()}</td>}
                                                    {<td className='ttrow'>{(Number(reportSales.totalDebt)+Number(reportSales.totalShortage)).toLocaleString()}</td>}
                                                    {<td className='ttrow'>{(Number(reportSales.totalDebt)+Number(reportSales.totalShortage)+Number(reportSales.totalCashSales)+Number(reportSales.totalBankSales)).toLocaleString()}</td>}
                                                </tr>                                                                                                
                                            </tbody>
                                        </table>
                                        <div style={{marginTop:'120px'}}></div>
                                        <div>DAILY DEBT RECOVERY</div>
                                        <table className="table payeetable">   
                                            <thead>
                                                <tr>
                                                    <th><h8 className='theader'>NAMES</h8></th>
                                                    {reportEmployees.map((emp)=>{
                                                        return(
                                                            <th><h8 className='theader'>{emp.firstName}</h8></th>                                                        
                                                        )                                                                
                                                    })}
                                                    
                                                    <th><h8 className='theader'>TOTAL</h8></th>
                                                    {/* <th><h8 className='theader'>MODE OF PAYMENT</h8></th> */}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className='ttrow'> </td>   
                                                    {reportEmployees.map((emp)=>{
                                                        return(
                                                            <td className='ttrow'>₦</td>
                                                        )                                                                
                                                    })}                                                                                                         
                                                    <td className='ttrow'>₦</td>                                                        
                                                </tr>
                                                <tr>
                                                    <td className='ttrow'>DEBT</td> 
                                                    {reportEmployees.map((emp)=>{
                                                        return(
                                                            <td className='ttrow'>{(reportAllSales[emp.i_d]['allDebt']).toLocaleString()}</td>
                                                        )                                                        
                                                    })}                                                                                                           
                                                    {<td className='ttrow'>{(Number(reportSales.totalDebt)+Number(reportSales.totalShortage)).toLocaleString()}</td>}                                                        
                                                </tr>
                                                <tr>
                                                    <td className='ttrow'>DEBTS RECOVERED</td>     
                                                    {reportEmployees.map((emp)=>{
                                                        return(
                                                            <td className='ttrow'>{(reportAllSales[emp.i_d]['allDebtRecovered']).toLocaleString()}</td>
                                                        )                                                        
                                                    })}                                                                                                        
                                                    {<td className='ttrow'>{(Number(reportSales.totalDebtRecovered ? reportSales.totalDebtRecovered : 0)).toLocaleString()}</td>}
                                                </tr>
                                                <tr>
                                                    <td className='ttrow'>OUTSTANDING DEBT</td>                                                        
                                                    {reportEmployees.map((emp)=>{
                                                        return(
                                                            <td className='ttrow'>{(reportAllSales[emp.i_d]['allDebt'] - reportAllSales[emp.i_d]['allDebtRecovered']).toLocaleString()}</td>
                                                        )                                                        
                                                    })}
                                                    {<td className='ttrow'>{(Number(reportSales.totalDebt)+Number(reportSales.totalShortage)-Number(reportSales.totalDebtRecovered ? reportSales.totalDebtRecovered : 0)).toLocaleString()}</td>}
                                                </tr>                                                                                                
                                            </tbody>
                                        </table>
                                        {/* <div className='signature'>                                
                                           
                                            <div className='sign'>
                                                <div>SIGNED BY: (MANAGING DIRECTOR)</div>
                                            </div>
                                        </div> */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <button 
                    className='invbutton'
                    onClick={
                        () => {
                            // generatePDF(targetRef, options)
                            printToPDF()
                            // setViewSchedule(false)
                            // resetField()
                        }
                    }
                >
                    PRINT PAYEE
                </button>
              </div>
            </div>}
        </>
    )
}

export default SalesReport