import './AccommodationReport.css'
import {useState, useContext, useRef, useEffect} from 'react'
import ContextProvider from '../../../Resources/ContextProvider'
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import html2pdf from 'html2pdf.js';

const AccommodationReceipt = ({
    rentalSale,    
    month,
    setShowReceipt,
})=>{
    const [InvoiceNumber, setInvoiceNumber] = useState('')    
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
        filename: `${rentalSale.rentalSpace.toUpperCase()} RENTAL RECEIPT - FOR ${rentalSale.paymentMonth}.pdf`
    };

    const printToPDF = () => {
        const element = targetRef.current;
        const options = {
            margin:       0.1,
            filename:     `${rentalSale.rentalSpace.toUpperCase()} RENTAL RECEIPT - FOR ${rentalSale.paymentMonth}.pdf`,
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
                            setShowReceipt(false)
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
                                                <p className='billfromitem'>{`Address: ${companyRecord.address}, ${companyRecord.city}, ${companyRecord.state}, ${companyRecord.country}.`}</p>
                                                <p className='billfromitem'>{`Phone: +234 906 4648 510, Email: ${companyRecord.emailid}`}</p>
                                                <p className='billfromitem'><b>{`RENTAL RECEIPT FOR THE MONTH OF ${rentalSale.paymentMonth}`}</b></p>
                                                <p className='billfromitem'>Created Date: <b>{getDate()}</b></p>
                                            </div>
                                       </div>
                                    </div>                                
                                </div>
                            </div>
                        </div>
                        <div className='rcpt-body'>
                            <div className='rcpt-row'>
                                <div className='rcpt-row-item'><b>MONTH:</b> <span>{` ${month}`}</span></div>
                                <div className='rcpt-row-item'><b>DATE:</b> <span>{` ${rentalSale.paymentDate}`}</span></div>
                            </div>
                            <div className='rcpt-row-item'><b>RECEIVED FROM:</b> <span>{` ${rentalSale.receivedFrom}`}</span></div>
                            <div className='rcpt-row-item'><b>AMOUNT PAID:</b> <span>{` ${rentalSale.paymentAmount}`}</span></div>
                            <div className='rcpt-row-item'><b>BEING PAYMENT FOR:</b> <span>{ `${rentalSale.rentalSpace.toUpperCase()}`}</span></div>
                            <div className='rcpt-row-item'><b>FOR THE MONTH OF:</b> <span>{` ${rentalSale.paymentMonth}`}</span></div>
                            <div className='rcpt-row rcpt-border'>
                                <div>
                                    <div className='rcpt-row-hgt'>OLD BALANCE</div>
                                    <div>{`${rentalSale.rentalDebt}`}</div>
                                </div>
                                <div>
                                    <div className='rcpt-row-hgt'>TOTAL AMOUNT</div>
                                    <div>{`${Number(rentalSale.rentalDebt)+Number(rentalSale.rentalAmount)}`}</div>
                                </div>
                                <div>
                                    <div className='rcpt-row-hgt'>AMOUNT PAID</div>
                                    <div>{`${rentalSale.paymentAmount}`}</div>
                                </div>
                                <div>
                                    <div className='rcpt-row-hgt'>BALANCE REMAINING</div>
                                    <div>{`${rentalSale.balanceRemaining}`}</div>
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
                    PRINT RECEIPT
                </button>
              </div>
            </div>}
        </>
    )
}

export default AccommodationReceipt