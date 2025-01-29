import './AccommodationReport.css'
import {useState, useContext, useRef, useEffect} from 'react'
import ContextProvider from '../../../Resources/ContextProvider'
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import html2pdf from 'html2pdf.js';

const AccommodationReceipt = ({
    curAccommodation,    
    setShowReceipt,
})=>{
    const [InvoiceNumber, setInvoiceNumber] = useState('')    
    const targetRef = useRef(null)
    const {storePath,
        getDate,
        company, companyRecord,
        customers,
    } = useContext(ContextProvider)
   
    const getInvoiceNumber = () =>{
        const invdate = Date.now()
        return "INV_"+company+invdate
    }
    const {customerId, createdAt, arrivalDate, departureDate, arrivalTime, departureTime,
        accommodationAmount, postingDate, roomNo
    } = curAccommodation
    const {i_d, fullName, address, email, phoneNo, stateOfOrigin, localGovernmentArea,
    } = customers?.filter((customer)=>{
        if (customer.i_d === customerId){
            return customer
        }
    })[0]
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
        filename: `ACCOMMODATION RECEIPT ${createdAt} - FOR CUSTOMER ${fullName.toUpperCase()}.pdf`
    };

    const printToPDF = () => {
        const element = targetRef.current;
        const options = {
            margin:       0.1,
            filename:     `ACCOMMODATION RECEIPT ${createdAt} - FOR CUSTOMER ${fullName.toUpperCase()}.pdf`,
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
                                                <p className='billfromitem'>{`Address: ${companyRecord.address}, ${companyRecord.city}, ${companyRecord.state}, ${companyRecord.country}.`}</p>
                                                <p className='billfromitem'>{`Phone: +234 906 4648 510, Email: ${companyRecord.emailid}`}</p>
                                            </div>
                                       </div>
                                    </div>                                
                                </div>
                            </div>
                        </div>
                        <div className='rcpt-body'>
                            <div className='rcpt-ttl'>
                                <span>GUEST REGISTRATION FORMS</span>
                                <span>{`ROOM NO: ${roomNo}`}</span>
                            </div>
                            <div className='rcpt-dtl'>
                                <div className='rcpt-field'><b>FULL NAMES: </b>{fullName.toUpperCase()}</div>
                                <div className='rcpt-field'><b>ADDRESS: </b>{address.toUpperCase()}</div>
                                <div className='rcpt-field'><b>EMAIL: </b>{email}</div>
                                <div className='rcpt-field'><b>PHONE NO: </b>{phoneNo}</div>
                                <div className='rcpt-field'><b>STATE OF ORIGIN: </b>{stateOfOrigin.toUpperCase()}</div>
                                <div className='rcpt-field'><b>L.G.A.: </b>{localGovernmentArea.toUpperCase()}</div>
                                <div className='rcpt-field'><b>ARRIVAL DATE: </b>{getDate(arrivalDate)}</div>
                                <div className='rcpt-field'><b>DEPARTURE DATE: </b>{getDate(departureDate)}</div>
                                <div className='rcpt-field'><b>ARRIVAL TIME: </b>{arrivalTime}</div>
                                <div className='rcpt-field'><b>DEPARTURE TIME: </b>{departureTime}</div>
                                <div className='rcpt-field'><b>AMOUNT: </b>{accommodationAmount.toLocaleString()}</div>
                                <div className='rcpt-field'><b>SIGN: </b>{`......................................`}</div>
                                <div className='rcpt-field'><b>DATE: </b>{getDate(postingDate)}</div>
                            </div>
                            <div className='rcpt-info'>
                                    ATTENTION:
                                    SMOKING OF CIGARETTES OR ANY KIND OF DRUGS IN THE ROOMIS HIGHLY PROHIBITED.
                                    CIGARETTE SMOKING IS SONLY ALLOWED OUTSIDE THE GREEN AREA. NO WEAPONS OF ANY TYPE IS ALLOWED HERE.
                                    GUEST ARE NOT ALLOWED TO BRING IN ANY KIND OF FOOD OR DRINKS INTO THE PREMISES FOR SAFETY AND SECURITY REASONS.
                                    CCTV IS INSTALLED ALL OVER THE PREMISES, PLEASE BEWEARE!!!!!!!!!!!!!!!!!!!!!!!!!!!!                                 
                            </div>
                            <div className='rcpt-info1'>
                                    <h5><b><u>CLEAN AIR</u></b></h5>
                                    <div>IN ORDER TO KEEP OUR HOTEL SMOKE-FREE WE WILL CHARGE A SUM OF <b>10,000</b> CLEASING FEE
                                    IF SIGNS OF SMOKING ARE FOUND IN THIS ROOM. ALSO, THE MANAGEMENT WILL CHECK YOU OUT WITHOUT REFUND.
                                    THANKS FOR YOUR UNDERSTANDING.
                                    </div>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>CHECK-IN TIME (12 NOON)</th>
                                                <th>CHECK-OUT TIME (12 NOON)</th>
                                                <th>LATE CHECK-OUT TIME WILL BE CHARGED 50%</th>
                                            </tr>
                                        </thead>
                                    </table>
                                    <div className='rcpt-agd'>ON SIGNING THIS REGISTRATION FORM</div>
                            </div>
                            <div className='rcpt-info'>
                                WE AGREE THAT THE OWNER WILL NOT BE RESPONSIBLE FOR VALUABLES LEFT IN THE ROOMS 
                                OR PUBLIC AREA OF THIS HOTEL AT ANYTIME BY MYSELF OR ANY VISITOR. FOOD AND BEVERAGES FROM 
                                OUTSIDE ARE NOT ALLOWED INTO THE HOTEL. THIS APPLICATION IS SUBJECT TO THE HOTEL'S DISPLAY RULES AND REGULATION.
                            </div>

                            <div className='rcpt-bx'><b>GUEST NAME: </b>{fullName.toUpperCase()}</div>
                            <div className='rcpt-bx'><b>GUEST SIGNATURE: </b>{'.................................................'}</div>

                            <div className='rcpt-footer'>
                                <div>THANK YOU FOR YOUR PATRONAGE.</div>
                                <div><u>MANAGEMENT</u></div>
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