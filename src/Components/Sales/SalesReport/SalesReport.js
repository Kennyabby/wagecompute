import './SalesReport.css'
import {useState, useContext, useRef, useEffect} from 'react'
import ContextProvider from '../../../Resources/ContextProvider'
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import html2pdf from 'html2pdf.js';

const SalesReport = ({
    reportSales,multiple,
    selectedMonth,
    selectedYear,
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
        filename: `StaffPayRoll - ${selectedMonth}, ${selectedYear}.pdf`
     };

    const printToPDF = () => {
        const element = targetRef.current;
        const options = {
            margin:       0.2,
            filename:     `SALES REPORT - ${selectedMonth}, ${selectedYear}.pdf`,
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
                                                <p className='billfrompayee'>{`SALES FOR `}<b>{`${!multiple && new Date(reportSales.createdAt).getDate()} ${selectedMonth}, ${selectedYear}.`}</b></p>                                                                                   
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
                                                    {!multiple && reportSales.record.map((sale)=>{
                                                        return(
                                                            employees.map((emp)=>{
                                                                if (emp.i_d === sale.employeeId){
                                                                    return(
                                                                        <th><h8 className='theader'>{emp.firstName}</h8></th>                                                        
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })}
                                                    <th><h8 className='theader'>TOTAL</h8></th>
                                                    {/* <th><h8 className='theader'>MODE OF PAYMENT</h8></th> */}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className='ttrow'> </td>                                                        
                                                    {!multiple && reportSales.record.map((sale)=>{
                                                        return(
                                                            employees.map((emp)=>{
                                                                if (emp.i_d === sale.employeeId){
                                                                    return(
                                                                        <td className='ttrow'>₦</td>
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })}
                                                    <td className='ttrow'>₦</td>                                                        
                                                </tr>
                                                <tr>
                                                    <td className='ttrow'>SALES</td>                                                        
                                                    {!multiple && reportSales.record.map((sale)=>{
                                                        return(
                                                            employees.map((emp)=>{
                                                                if (emp.i_d === sale.employeeId){
                                                                    return(
                                                                        <td className='ttrow'>{(Number(sale.cashSales)+Number(sale.bankSales)+Number(sale.debt)+Number(sale.shortage)).toLocaleString()}</td>
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })}
                                                    {!multiple && <td className='ttrow'>{(Number(reportSales.totalCashSales)+Number(reportSales.totalBankSales)+Number(reportSales.totalDebt)+Number(reportSales.totalShortage)).toLocaleString()}</td>}                                                        
                                                </tr>
                                                <tr>
                                                    <td className='ttrow'>DEBT</td>                                                        
                                                    {!multiple && reportSales.record.map((sale)=>{
                                                        return(
                                                            employees.map((emp)=>{
                                                                if (emp.i_d === sale.employeeId){
                                                                    return(
                                                                        <td className='ttrow'>{(Number(sale.debt)+Number(sale.shortage)).toLocaleString()}</td>
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })}
                                                    {!multiple && <td className='ttrow'>{(Number(reportSales.totalDebt)+Number(reportSales.totalShortage)).toLocaleString()}</td>}
                                                </tr>
                                                <tr>
                                                    <td className='ttrow'>TOTAL</td>                                                        
                                                    {!multiple && reportSales.record.map((sale)=>{
                                                        return(
                                                            employees.map((emp)=>{
                                                                if (emp.i_d === sale.employeeId){
                                                                    return(
                                                                        <td className='ttrow'>{(Number(sale.cashSales)+Number(sale.bankSales)).toLocaleString()}</td>
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })}
                                                    {!multiple && <td className='ttrow'>{(Number(reportSales.totalCashSales)+Number(reportSales.totalBankSales)).toLocaleString()}</td>}
                                                </tr>                                                                                                
                                            </tbody>
                                        </table>
                                        <div>SUMMARY OF DAILY COLLECTIONS</div>
                                        <table className="table payeetable">   
                                            <thead>
                                                <tr>
                                                    <th><h8 className='theader'>NAMES</h8></th>
                                                    {!multiple && reportSales.record.map((sale)=>{
                                                        return(
                                                            employees.map((emp)=>{
                                                                if (emp.i_d === sale.employeeId){
                                                                    return(
                                                                        <th><h8 className='theader'>{emp.firstName}</h8></th>                                                        
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })}
                                                    <th><h8 className='theader'>TOTAL</h8></th>
                                                    {/* <th><h8 className='theader'>MODE OF PAYMENT</h8></th> */}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className='ttrow'>PAYMENT POINT</td>                                                        
                                                    {!multiple && reportSales.record.map((sale)=>{
                                                        return(
                                                            employees.map((emp)=>{
                                                                if (emp.i_d === sale.employeeId){
                                                                    return(
                                                                        <td className='ttrow'>₦</td>
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })}
                                                    <td className='ttrow'>₦</td>                                                        
                                                </tr>
                                                {Object.keys(payPoints).map((payPoint)=>{
                                                    var totalPaypointAmount = 0
                                                    return (
                                                        <tr>
                                                            <td className='ttrow'>{payPoint.toUpperCase()}</td>                                                        
                                                            {!multiple && reportSales.record.map((record)=>{                                                        
                                                                return (
                                                                    employees.map((emp)=>{
                                                                        if (record.employeeId === emp.i_d){
                                                                            return(
                                                                                reportSales.record.map((sale)=>{
                                                                                    if (emp.i_d === sale.employeeId){
                                                                                        var totalpaypoint = 0
                                                                                        Object.keys(salesUnits).map((unit)=>{
                                                                                            totalpaypoint += Number(sale[unit][payPoint])
                                                                                        })
                                                                                        totalPaypointAmount+= totalpaypoint
                                                                                        return(
                                                                                            <td className='ttrow'>{(totalpaypoint).toLocaleString()}</td>
                                                                                        )
                                                                                    }
                                                                                })
                                                                            )
                                                                        }
                                                                    })
                                                                )
                                                            })}
                                                            {!multiple && <td className='ttrow'>{(totalPaypointAmount).toLocaleString()}</td>}                                                        
                                                        </tr>
                                                    )
                                                })}                                               
                                                <tr>
                                                    <td className='ttrow'>TOTAL</td>                                                        
                                                    {!multiple && reportSales.record.map((sale)=>{
                                                        return(
                                                            employees.map((emp)=>{
                                                                if (emp.i_d === sale.employeeId){
                                                                    return(
                                                                        <td className='ttrow'>{(Number(sale.cashSales)+Number(sale.bankSales)).toLocaleString()}</td>
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })}
                                                    {!multiple && <td className='ttrow'>{(Number(reportSales.totalCashSales)+Number(reportSales.totalBankSales)).toLocaleString()}</td>}
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
                                                    {/* <th><h8 className='theader'>MODE OF PAYMENT</h8></th> */}
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
                                                                var totalPaypointAmount = 0
                                                                
                                                                !multiple && reportSales.record.forEach((sale)=>{
                                                                    totalPaypointAmount += Number(sale[salesunit][paypoint])                                                                            
                                                                })
                                                                totalSaleUnitAmount += totalPaypointAmount
                                                                return (
                                                                    <td className='ttrow'>{totalPaypointAmount.toLocaleString()}</td>                                                        
                                                                )
                                                            })}
                                                            {!multiple && <td className='ttrow'>{(totalSaleUnitAmount).toLocaleString()}</td>}                                                        
                                                            {!multiple &&                                  
                                                                reportSales.record.map((sale1)=>{
                                                                    var ct = 0
                                                                    
                                                                    return (
                                                                        Object.keys(salesUnits).map((salesunit1)=>{
                                                                            var sum = 0         
                                                                            if (salesunit1===salesunit){
                                                                                Object.keys(payPoints).forEach((payPoint)=>{
                                                                                    sum += Number(sale1[salesunit1][payPoint])
                                                                                })
                                                                                if (sum && !cursaleunits.includes(salesunit1)){
                                                                                    ct++
                                                                                    cursaleunits = cursaleunits.concat(salesunit1)
                                                                                    if (sum){
                                                                                        return (
                                                                                            <td className='ttrow'>{(Number(sale1.debt)+Number(sale1.shortage)).toLocaleString()}</td>
                                                                                        )
                                                                                    }                                                                                
                                                                                }
                                                                            }
                                                                        })  
                                                                    )                                                         
                                                                })                           
                                                            }                                                        
                                                            {!multiple &&                                  
                                                                reportSales.record.map((sale1)=>{
                                                                    var ct = 0
                                                                    
                                                                    return (
                                                                        Object.keys(salesUnits).map((salesunit1)=>{
                                                                            var sum = 0         
                                                                            if (salesunit1===salesunit){
                                                                                Object.keys(payPoints).forEach((payPoint)=>{
                                                                                    sum += Number(sale1[salesunit1][payPoint])
                                                                                })
                                                                                if (sum && !cursaleunits1.includes(salesunit1)){
                                                                                    ct++
                                                                                    cursaleunits1 = cursaleunits.concat(salesunit1)
                                                                                    if (sum){
                                                                                        return (
                                                                                            <td className='ttrow'>{(Number(sale1.debt)+Number(sale1.shortage)+totalSaleUnitAmount).toLocaleString()}</td>
                                                                                        )
                                                                                    }                                                                                
                                                                                }
                                                                            }
                                                                        })  
                                                                    )                                                         
                                                                })                           
                                                            }                                                        
                                                            {/* {!multiple && <td className='ttrow'>{(reportSales.totalDebt).toLocaleString()}</td>}                                                         */}
                                                        </tr>
                                                    )
                                                })}                                               
                                                <tr>
                                                    <td className='ttrow'>TOTAL</td>  
                                                    {Object.keys(payPoints).map((payPoint)=>{
                                                        var totalPaypointAmount = 0
                                                        {!multiple && reportSales.record.forEach((record)=>{                                                        
                                                            employees.forEach((emp)=>{
                                                                if (record.employeeId === emp.i_d){
                                                                    reportSales.record.map((sale)=>{
                                                                        if (emp.i_d === sale.employeeId){
                                                                            var totalpaypoint = 0
                                                                            Object.keys(salesUnits).map((unit)=>{
                                                                                totalpaypoint += Number(sale[unit][payPoint])
                                                                            })
                                                                            totalPaypointAmount += totalpaypoint                                                                            
                                                                        }
                                                                    })
                                                                    
                                                                }
                                                            })
                                                            
                                                        })}
                                                        return (                                                            
                                                            !multiple && <td className='ttrow'>{(totalPaypointAmount).toLocaleString()}</td>
                                                        )
                                                    })}
                                                    {!multiple && <td className='ttrow'>{(Number(reportSales.totalCashSales)+Number(reportSales.totalBankSales)).toLocaleString()}</td>}
                                                    {!multiple && <td className='ttrow'>{(Number(reportSales.totalDebt)+Number(reportSales.totalShortage)).toLocaleString()}</td>}
                                                    {!multiple && <td className='ttrow'>{(Number(reportSales.totalDebt)+Number(reportSales.totalShortage)+Number(reportSales.totalCashSales)+Number(reportSales.totalBankSales)).toLocaleString()}</td>}
                                                </tr>                                                                                                
                                            </tbody>
                                        </table>
                                        <div>DAILY DEBT RECOVERY</div>
                                        <table className="table payeetable">   
                                            <thead>
                                                <tr>
                                                    <th><h8 className='theader'>NAMES</h8></th>
                                                    {!multiple && reportSales.record.map((sale)=>{
                                                        return(
                                                            employees.map((emp)=>{
                                                                if (emp.i_d === sale.employeeId){
                                                                    return(
                                                                        <th><h8 className='theader'>{emp.firstName}</h8></th>                                                        
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })}
                                                    <th><h8 className='theader'>TOTAL</h8></th>
                                                    {/* <th><h8 className='theader'>MODE OF PAYMENT</h8></th> */}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className='ttrow'> </td>                                                        
                                                    {!multiple && reportSales.record.map((sale)=>{
                                                        return(
                                                            employees.map((emp)=>{
                                                                if (emp.i_d === sale.employeeId){
                                                                    return(
                                                                        <td className='ttrow'>₦</td>
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })}
                                                    <td className='ttrow'>₦</td>                                                        
                                                </tr>
                                                <tr>
                                                    <td className='ttrow'>DEBT</td>                                                        
                                                    {!multiple && reportSales.record.map((sale)=>{
                                                        return(
                                                            employees.map((emp)=>{
                                                                if (emp.i_d === sale.employeeId){
                                                                    return(
                                                                        <td className='ttrow'>{(Number(sale.debt)+Number(sale.shortage)).toLocaleString()}</td>
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })}
                                                    {!multiple && <td className='ttrow'>{(Number(reportSales.totalDebt)+Number(reportSales.totalShortage)).toLocaleString()}</td>}                                                        
                                                </tr>
                                                <tr>
                                                    <td className='ttrow'>DEBTS RECOVERED</td>                                                        
                                                    {!multiple && reportSales.record.map((sale)=>{
                                                        return(
                                                            employees.map((emp)=>{
                                                                if (emp.i_d === sale.employeeId){
                                                                    return(
                                                                        <td className='ttrow'>{(Number(sale.debtRecovered)).toLocaleString()}</td>
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })}
                                                    {!multiple && <td className='ttrow'>{(Number(reportSales.totalDebtRecovered ? reportSales.totalDebtRecovered : 0)).toLocaleString()}</td>}
                                                </tr>
                                                <tr>
                                                    <td className='ttrow'>OUTSTANDING DEBT</td>                                                        
                                                    {!multiple && reportSales.record.map((sale)=>{
                                                        return(
                                                            employees.map((emp)=>{
                                                                if (emp.i_d === sale.employeeId){
                                                                    return(
                                                                        <td className='ttrow'>{(Number(sale.debt)+Number(sale.shortage)-Number(sale.debtRecovered)).toLocaleString()}</td>
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })}
                                                    {!multiple && <td className='ttrow'>{(Number(reportSales.totalDebt)+Number(reportSales.totalShortage)-Number(reportSales.totalDebtRecovered ? reportSales.totalDebtRecovered : 0)).toLocaleString()}</td>}
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