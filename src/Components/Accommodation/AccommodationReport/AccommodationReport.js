import './AccommodationReport.css'
import {useState, useContext, useRef, useEffect} from 'react'
import ContextProvider from '../../../Resources/ContextProvider'
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import html2pdf from 'html2pdf.js';

const AccommodationReport = ({
    rooms,
    reportSales, multiple,
    fromDate, toDate,
    setShowReport,
    accommodationCustomer
})=>{
    const [InvoiceNumber, setInvoiceNumber] = useState('')
    
    const targetRef = useRef(null)

    const {storePath,
        getDate,
        company, companyRecord,
        monthDays,
        employees, customers,
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
        filename: `ACCOMMODATION REPORT - FROM ${getDate(fromDate)} TO ${getDate(toDate)}.pdf`,
    };

    const printToPDF = () => {
        const element = targetRef.current;
        const options = {
            margin:       0.1,
            filename:     `ACCOMMODATION REPORT - FROM ${getDate(fromDate)} TO ${getDate(toDate)}.pdf`,
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
                        Close
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
                                                <p className='billfrompayee'>{`ACCOMMODATION REPORT FROM `}<b>{`${getDate(fromDate)}`}</b>{` TO `}<b>{`${getDate(toDate)}`}</b></p>                                                                                   
                                                <p className='billfrompayee'>Created Date: <b>{getDate()}</b></p>
                                            </div>
                                       </div>
                                    </div>
                                    <div className='tablecover'>
                                        {!multiple && customers.map((customer)=>{
                                            if (customer.i_d===accommodationCustomer){
                                                return(
                                                    <div>{`${customer.fullName} (${customer.phoneNo})`}</div>                                                        
                                                )                                                                                                                
                                            }
                                        })} 
                                        <br/>
                                        <table className="table payeetable">                                               
                                            <thead>
                                                {multiple ? <tr>
                                                    <th><h8 className='theader'>CUSTOMERS</h8></th>
                                                    <th><h8 className='theader'>PHONE NO</h8></th>
                                                    {Object.keys(rooms).map((roomNo)=>{
                                                        return isNaN(roomNo) ? <th><h8 className='theader'>REST</h8></th> : <th><h8 className='theader'>{`RM ${roomNo}`}</h8></th>
                                                    })}
                                                    <th><h8 className='theader'>RM DAYS</h8></th>                                                    
                                                    <th><h8 className='theader'>RM AMOUNT</h8></th>                                                    
                                                    <th><h8 className='theader'>RM PAYMENTS</h8></th>
                                                    <th><h8 className='theader'>OUTSTANDING</h8></th>
                                                </tr>:
                                                
                                                <tr>
                                                    <th><h8 className='theader'>POSTING DATE</h8></th>
                                                    <th><h8 className='theader'>ROOM NO</h8></th>
                                                    <th><h8 className='theader'>ACCOMMODATION DAYS</h8></th>                                                    
                                                    <th><h8 className='theader'>ACCOMMODATION AMOUNT</h8></th>
                                                    <th><h8 className='theader'>PAYMENT AMOUNT</h8></th>
                                                    <th><h8 className='theader'>PAY POINT</h8></th>
                                                    <th><h8 className='theader'>RECEIPT NO</h8></th>
                                                    <th><h8 className='theader'>HANDLED BY</h8></th>
                                                    
                                                </tr>}
                                            </thead>
                                            <tbody>
                                                {multiple ? reportSales?.map((saleReport, index)=>{
                                                    return <tr key={index}>
                                                        {customers.map((customer)=>{
                                                            if (customer.i_d===saleReport.customerId){
                                                                return(
                                                                    <td>{`${customer.fullName}`}</td>                                                        
                                                                )                                                                                                                
                                                            }
                                                        })}
                                                        <td className='ttrow'>{saleReport.phoneNo}</td>
                                                        {Object.keys(rooms).map((roomNo)=>{
                                                            return <td className='ttrow'>{Number(saleReport.roomDays[roomNo] || 0).toLocaleString()}</td>
                                                        })}
                                                        <td className='ttrow'>{saleReport.totalAccommodationDays}</td>
                                                        <td className='ttrow'>{'₦'+saleReport.totalAccommodationAmount.toLocaleString()}</td>
                                                        <td className='ttrow'>{'₦'+saleReport.totalPaymentAmount.toLocaleString()}</td>
                                                        <td className='ttrow'>{'₦'+(Number(saleReport.totalAccommodationAmount) -Number(saleReport.totalPaymentAmount)).toLocaleString()}</td>
                                                    </tr>
                                                }) : 
                                                reportSales?.map((saleReport, index)=>{
                                                    return <tr key={index}>
                                                        <td className='ttrow'>{saleReport.postingDate}</td>
                                                        <td className='ttrow'>{'ROOM '+saleReport.roomNo}</td>
                                                        <td className='ttrow'>{saleReport.accommodationDays}</td>
                                                        <td className='ttrow'>{'₦'+saleReport.accommodationAmount.toLocaleString()}</td>
                                                        <td className='ttrow'>{'₦'+saleReport.paymentAmount.toLocaleString()}</td>
                                                        <td className='ttrow'>{saleReport.payPoint.toUpperCase()}</td>                                                        
                                                        <td className='ttrow'>{saleReport.paymentReceipt}</td>                                                        
                                                        {
                                                            employees.map((emp)=>{
                                                                if (emp.i_d===saleReport.employeeId){
                                                                    return(
                                                                        <td className='ttrow'>{`${emp.firstName} ${emp.lastName}`}</td>                                                      
                                                                    )                                                                                                                
                                                                }
                                                            })
                                                        }
                                                    </tr>
                                                })}                                                                                                                                                
                                            </tbody>
                                            {multiple ? <tfoot>
                                                <tr>
                                                    <th className='theader'>TOTAL</th>
                                                    <th></th>
                                                    {Object.keys(rooms).map((roomNo, id)=>{
                                                        var sumTotalDays = 0
                                                        reportSales?.forEach((saleReport)=>{
                                                            sumTotalDays += Number(saleReport.roomDays[roomNo] || 0)
                                                        })
                                                        return <th className='theader' key={id}>{sumTotalDays.toLocaleString()}</th>
                                                    })}                                                                                        
                                                    {[''].map((args, id)=>{
                                                        var sumTotalDays = 0
                                                        reportSales?.forEach((saleReport)=>{
                                                            sumTotalDays += Number(saleReport.totalAccommodationDays)
                                                        })
                                                        return <th className='theader' key={id}>{sumTotalDays.toLocaleString()}</th>
                                                    })}                                                                                        
                                                    {[''].map((args, id)=>{
                                                        var sumTotalAmount = 0
                                                        reportSales?.forEach((saleReport)=>{
                                                            sumTotalAmount += Number(saleReport.totalAccommodationAmount)
                                                        })
                                                        return <th className='theader' key={id}>{'₦'+sumTotalAmount.toLocaleString()}</th>
                                                    })}     
                                                    {[''].map((args, id)=>{
                                                        var sumTotalPayment = 0
                                                        reportSales?.forEach((saleReport)=>{
                                                            sumTotalPayment += Number(saleReport.totalPaymentAmount)
                                                        })
                                                        return <th className='theader' key={id}>{'₦'+sumTotalPayment.toLocaleString()}</th>
                                                    })}                                                                                    
                                                    {[''].map((args, id)=>{
                                                        var sumTotalAmount = 0
                                                        var sumTotalPayment = 0
                                                        
                                                        reportSales?.forEach((saleReport)=>{
                                                            sumTotalAmount += Number(saleReport.totalAccommodationAmount)
                                                            sumTotalPayment += Number(saleReport.totalPaymentAmount)
                                                        })
                                                        return <th className='theader' key={id}>{'₦'+(Number(sumTotalAmount)-Number(sumTotalPayment)).toLocaleString()}</th>
                                                    })}                                                                                  
                                                </tr>
                                            </tfoot> : 
                                            <tfoot>
                                                <tr>
                                                    <th className='theader'>TOTAL</th>                                                                                        
                                                    <th></th>                                                                                        
                                                    {[''].map((args, id)=>{
                                                        var sumTotalDays = 0
                                                        reportSales?.forEach((saleReport)=>{
                                                            sumTotalDays += Number(saleReport.accommodationDays)
                                                        })
                                                        return <th className='theader' key={id}>{sumTotalDays.toLocaleString()}</th>
                                                    })}                                                                                        
                                                    {[''].map((args, id)=>{
                                                        var sumTotalAmount = 0
                                                        reportSales?.forEach((saleReport)=>{
                                                            sumTotalAmount += Number(saleReport.accommodationAmount)
                                                        })
                                                        return <th className='theader' key={id}>{'₦'+sumTotalAmount.toLocaleString()}</th>
                                                    })}                                                                                        
                                                    {[''].map((args, id)=>{
                                                        var sumTotalPayment = 0
                                                        reportSales?.forEach((saleReport)=>{
                                                            sumTotalPayment += Number(saleReport.paymentAmount)
                                                        })
                                                        return <th className='theader' key={id}>{'₦'+sumTotalPayment.toLocaleString()}</th>
                                                    })}
                                                    <th></th>
                                                    <th></th>
                                                    <th></th>
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

export default AccommodationReport