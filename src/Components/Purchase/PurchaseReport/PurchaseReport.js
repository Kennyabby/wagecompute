import './PurchaseReport.css'
import {useState, useContext, useRef, useEffect} from 'react'
import ContextProvider from '../../../Resources/ContextProvider'
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import html2pdf from 'html2pdf.js';

const PurchaseReport = ({
    reportPurchases,
    fromDate,
    toDate,
    setShowReport,
})=>{
    const [InvoiceNumber, setInvoiceNumber] = useState('')    
    const departments = ['Bar', 'Kitchen', 'Musical', 'Security & Safety', 'Admin']
    const targetRef = useRef(null)
    const {storePath,
        getDate,
        company, companyRecord,
        employees,
    } = useContext(ContextProvider)
   
    const getInvoiceNumber = () =>{
        const invdate = Date.now()
        return "INV_"+company+invdate
    }

    useEffect(()=>{
        
     },[reportPurchases])
    
    const calculatePurchaseAmount =(dept)=>{
        var reportDeptAmount = 0
        reportPurchases.forEach((pur)=>{
            if (pur.purchaseDepartment===dept){
                reportDeptAmount += Number(pur.purchaseAmount)
            }                                       
        })
        return reportDeptAmount
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
        filename: `PURCHASE REPORT - FROM ${getDate(fromDate)} TO ${getDate(toDate)}.pdf`
    };

    const printToPDF = () => {
        const element = targetRef.current;
        const options = {
            margin:       0.1,
            filename:     `PURCHASE REPORT - FROM ${getDate(fromDate)} TO ${getDate(toDate)}.pdf`,
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
                                                <p className='billfrompayee'>{`PURCHASE FROM `}<b>{`${getDate(fromDate)}`}</b>{` TO `}<b>{`${getDate(toDate)}`}</b></p>                                                                                   
                                                <p className='billfrompayee'>Created Date: <b>{getDate()}</b></p>
                                            </div>
                                       </div>
                                    </div>
                                    <div className='tablecover'>
                                        {departments.map((department)=>{
                                            const totalPurchaseAMont = reportPurchases?calculatePurchaseAmount(department):0
                                        
                                            return (
                                                <div className='purtablecv'>
                                                    <div>{`${department.toUpperCase()} - DIRECT COST REPORT`}</div>
                                                    <table className="table payeetable">   
                                                        <thead>
                                                            <tr>
                                                                <th><h8 className='theader'>DATE</h8></th>
                                                                <th><h8 className='theader'>SUPPLIERS</h8></th>
                                                                <th><h8 className='theader'>DETAIL OF ITEMS</h8></th>
                                                                <th><h8 className='theader'>AMOUNT</h8></th>
                                                                
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {reportPurchases?.map((pur)=>{
                                                                if (pur.purchaseDepartment === department){
                                                                    return(
                                                                        <tr>
                                                                            <td><h8 className='ttrow'>{getDate(pur.postingDate)}</h8></td>                                                        
                                                                            <td><h8 className='ttrow'>{pur.purchaseVendor}</h8></td>                                                        
                                                                            <td><h8 className='ttrow'>{pur.itemCategory}</h8></td>                                                        
                                                                            <td><h8 className='ttrow'>{'₦'+Number(pur.purchaseAmount).toLocaleString()}</h8></td>                                                        
                                                                        </tr>
                                                                    )                                                                                                                
                                                                }
                                                            })}                                                                                                                                                    
                                                            <tr>
                                                                <td className='ttrow'>TOTAL</td>                                                        
                                                                <td className='ttrow'></td>                                                        
                                                                <td className='ttrow'></td>                                                        
                                                                <td className='ttrow'>{'₦'+totalPurchaseAMont.toLocaleString()}</td>                                                      
                                                            </tr>                                                                                                
                                                        </tbody>
                                                    </table>                                        
                                                </div>
                                            )
                                        })}
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

export default PurchaseReport