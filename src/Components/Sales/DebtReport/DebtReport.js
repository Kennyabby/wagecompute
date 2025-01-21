import './DebtReport.css'
import {useState, useContext, useRef, useEffect} from 'react'
import ContextProvider from '../../../Resources/ContextProvider'
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import html2pdf from 'html2pdf.js';

const DebtReport = ({
    reportDebts, multiple,
    recoveryMonth,
    setShowDebtReport,
    recoveryEmployeeId
})=>{
    const [InvoiceNumber, setInvoiceNumber] = useState('')
    
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
        filename: `DEBT REPORT - ${recoveryMonth}.pdf`
    };

    const printToPDF = () => {
        const element = targetRef.current;
        const options = {
            margin:       0.1,
            filename:     `DEBT REPORT - ${recoveryMonth}.pdf`,
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
                            setShowDebtReport(false)
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
                                                <p className='billfrompayee'>{`Address: ${companyRecord.address}, ${companyRecord.city}, ${companyRecord.state}, ${companyRecord.country}.`}</p>
                                                <p className='billfrompayee'>{`Email: ${companyRecord.emailid}`}</p>
                                                {/* <p className='billfrompayee'>{`SALES FROM `}<b>{`${getDate(fromDate)}`}</b>{` TO `}<b>{`${getDate(toDate)}`}</b></p> */}
                                                <p className='billfrompayee'><b>{'DEBT AND RECOVERY REPORT FOR THE MONTH - ' + recoveryMonth}</b></p>
                                            </div>
                                       </div>
                                    </div>
                                    <div className='tablecover'>
                                        {!multiple && employees.map((emp)=>{
                                            if (emp.i_d===recoveryEmployeeId){
                                                return(
                                                    <div>{`(${emp.i_d}) ${emp.firstName} ${emp.lastName}`}</div>                                                        
                                                )                                                                                                                
                                            }
                                        })} 
                                        <table className="table payeetable">   
                                            <thead>
                                                {multiple ? <tr>
                                                    <th><h8 className='theader'>EMPLOYEES</h8></th>
                                                    <th><h8 className='theader'>TOTAL DEBT</h8></th>
                                                    <th><h8 className='theader'>TOTAL DEBT RECOVERED</h8></th>                                                    
                                                    <th><h8 className='theader'>OUTSTANDING DEBT</h8></th>
                                                </tr>:
                                                
                                                <tr>
                                                    <th><h8 className='theader'>POSTING DATE</h8></th>
                                                    <th><h8 className='theader'>TRANFERED FROM</h8></th>
                                                    <th><h8 className='theader'>DEBT</h8></th>                                                    
                                                    <th><h8 className='theader'>RECOVERED</h8></th>
                                                    <th><h8 className='theader'>OUTSTANDING DEBT</h8></th>
                                                </tr>}
                                            </thead>
                                            <tbody>
                                                {multiple ? reportDebts?.map((debtReport, index)=>{
                                                    return <tr key={index}>
                                                        {employees.map((emp)=>{
                                                            if (emp.i_d===debtReport.i_d){
                                                                return(
                                                                    <td className='ttrow'>{emp.firstName}</td>                                                        
                                                                )                                                                                                                
                                                            }
                                                        })} 
                                                        <td className='ttrow'>{'₦'+debtReport.totalDebt.toLocaleString()}</td>
                                                        <td className='ttrow'>{'₦'+debtReport.totalDebtRecovered.toLocaleString()}</td>
                                                        <td className='ttrow'>{'₦'+debtReport.totalOutstanding.toLocaleString()}</td>
                                                    </tr>
                                                }) : 
                                                reportDebts?.map((debtReport, index)=>{
                                                    return <tr key={index}>
                                                        <td className='ttrow'>{debtReport.postingDate}</td>
                                                        {debtReport.transferedFrom !== 'Sales Debt' ? employees.map((emp)=>{
                                                            if (emp.i_d===debtReport.transferedFrom){
                                                                return(
                                                                    <td className='ttrow'>{emp.firstName}</td>                                                        
                                                                )                                                                                                                
                                                            }
                                                        }):
                                                        <td className='ttrow'>{debtReport.transferedFrom}</td>
                                                        }                                                        
                                                        <td className='ttrow'>{'₦'+debtReport.debt.toLocaleString()}</td>
                                                        <td className='ttrow'>{'₦'+debtReport.debtRecovered.toLocaleString()}</td>
                                                        <td className='ttrow'>{'₦'+debtReport.debtOutstanding.toLocaleString()}</td>
                                                    </tr>
                                                })}                                                                                                                                                
                                            </tbody>
                                            {multiple ? <tfoot>
                                                <tr>
                                                    <th className='ttrow'>TOTAL</th>
                                                    {[''].map((args, id)=>{
                                                        var sumTotalDebt = 0
                                                        reportDebts?.forEach((debtReport)=>{
                                                            sumTotalDebt += debtReport.totalDebt
                                                        })
                                                        return <th className='ttrow' key={id}>{'₦'+sumTotalDebt.toLocaleString()}</th>
                                                    })}                                                                                        
                                                    {[''].map((args, id)=>{
                                                        var sumTotalDebtRecovered = 0
                                                        reportDebts?.forEach((debtReport)=>{
                                                            sumTotalDebtRecovered += debtReport.totalDebtRecovered
                                                        })
                                                        return <th className='ttrow' key={id}>{'₦'+sumTotalDebtRecovered.toLocaleString()}</th>
                                                    })}                                                                                        
                                                    {[''].map((args, id)=>{
                                                        var sumTotalOutstanding = 0
                                                        reportDebts?.forEach((debtReport)=>{
                                                            sumTotalOutstanding += debtReport.totalOutstanding
                                                        })
                                                        return <th className='ttrow' key={id}>{'₦'+sumTotalOutstanding.toLocaleString()}</th>
                                                    })}                                                                                        
                                                </tr>
                                            </tfoot> : 
                                            <tfoot>
                                                <tr>
                                                    <th className='ttrow'>TOTAL</th>                                                                                        
                                                    <th></th>                                                                                        
                                                    {[''].map((args, id)=>{
                                                        var sumTotalDebt = 0
                                                        reportDebts?.forEach((debtReport)=>{
                                                            sumTotalDebt += debtReport.debt
                                                        })
                                                        return <th className='ttrow' key={id}>{'₦'+sumTotalDebt.toLocaleString()}</th>
                                                    })}
                                                    {[''].map((args, id)=>{
                                                        var sumTotalDebtRecovered = 0
                                                        reportDebts?.forEach((debtReport)=>{
                                                            sumTotalDebtRecovered += debtReport.debtRecovered
                                                        })
                                                        return <th className='ttrow' key={id}>{'₦'+sumTotalDebtRecovered.toLocaleString()}</th>
                                                    })}                                                                                        
                                                    {[''].map((args, id)=>{
                                                        var sumTotalOutstanding = 0
                                                        reportDebts?.forEach((debtReport)=>{
                                                            sumTotalOutstanding += debtReport.debtOutstanding
                                                        })
                                                        return <th className='ttrow' key={id}>{'₦'+sumTotalOutstanding.toLocaleString()}</th>
                                                    })}       
                                                </tr>
                                            </tfoot>
                                            }
                                        </table>                                        
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
                    PRINT REPORT
                </button>
              </div>
            </div>}
        </>
    )
}

export default DebtReport