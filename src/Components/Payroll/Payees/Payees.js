import {useState, useEffect, useContext, useRef} from 'react'
import ContextProvider from '../../../Resources/ContextProvider';
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import Barcode from 'react-barcode';

    

const Payee = ({setViewPayee, selectedMonth, selectedYear})=>{
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
        resoluton: Resolution.MEDIUM = 3,
        page: {
           // margin is in MM, default is Margin.NONE = 0
        //    margin: Margin.SMALL,
           margin: Margin.SMALL,
           // default is 'A4'
           format: 'A4',
           // default is 'portrait'
           orientation: 'portrait',
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
        filename: 'StaffPayRoll.pdf'
     };

    return(
        <>
        {<div className='payslip'>
                    <div className='cancelslip'
                        onClick= {()=>{
                            setViewPayee(false)
                        }}
                    >
                        Cancel
                    </div>
                    <div className='mainslip'>
                        <div className="container"  ref={targetRef}>
                        <div className="container">
                        <div className="row">
                            <div >
                                <div className="col-md-12">
                                    <div className="row">
                                       <div className='invhead'>
                                            {/* <img src={''} className='invlogo'/> */}
                                            <div className="billfrom">
                                                <h4 className='company' style={{ color: '#325aa8' }}><strong>{companyRecord.name.toUpperCase()}</strong></h4>
                                                <p className='billfromitem'>{`Address: ${companyRecord.address}, ${companyRecord.city}, ${companyRecord.state}, ${companyRecord.country}.`}</p>
                                                <p className='billfromitem'>{`Email: ${companyRecord.emailid}`}</p>
                                                <p className='billfromitem'>Created Date: <b>{getDate()}</b></p>
                                            </div>
                                       </div>
                                        
                                    </div>
                                    <br />
                                    {/* <div className="ttlrow">
                                        <div >
                                            <h2 className="col-md-12" style={{ color: '#325aa8' }} >STAFF PAY SLIP</h2>
                                            <div className='invnum'>
                                                <h5 className='col-md-0'> Id: {InvoiceNumber}</h5>
                                                <Barcode value={`4n%${InvoiceNumber}+ut%`} width={1} height={50} displayValue={false} />
                                            </div>
                                        </div>
                                    </div> */}
                                    <br />
                                    
                                    <div>
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th><h8 className='theader'>S/N</h8></th>
                                                    <th><h8 className='theader'>NAME</h8></th>
                                                    <th><h8 className='theader'>SEX</h8></th>
                                                    <th><h8 className='theader'>ACCOUNT NUMBER</h8></th>
                                                    <th><h8 className='theader'>BANK</h8></th>
                                                    <th><h8 className='theader'>UNIT/POSITION</h8></th>
                                                    <th><h8 className='theader'>DATE OF EMPLOYMENT</h8></th>
                                                    <th><h8 className='theader'>BASIC RATE</h8></th>
                                                    <th><h8 className='theader'>GROSS SALARY PER ANNUM</h8></th>
                                                    <th><h8 className='theader'>GROSS SALARY PER MONTH</h8></th>
                                                    <th><h8 className='theader'>ACTUAL GROSS SALARY</h8></th>
                                                    <th><h8 className='theader'>DEDUCTIONS</h8></th>
                                                    <th><h8 className='theader'>NET PAY</h8></th>
                                                    {/* <th><h8 className='theader'>MODE OF PAYMENT</h8></th> */}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {
                                                    employees.map((employee,index)=>{
                                                        var count=0
                                                        const attd = attendance.filter((att)=>{
                                                            count++
                                                            if (att.month === selectedMonth && att.year === selectedYear && count===3){
                                                                return att
                                                            }
                                                        })
                                                        
                                                        const payees = attd[0].payees.filter((payee)=>{
                                                            if (payee['Person ID'] === employee.i_d){
                                                                return payee
                                                            }
                                                        })

                                                        if (payees.length){
                                                            console.log(payees,employee)
                                                            return (
                                                                <tr key={index} >       
                                                                    <td className='trow'>{index+1}</td>                                                                         
                                                                    <td className='trow'>{`${employee.lastName} ${employee.firstName} ${employee.otherName}`}</td>                                                                         
                                                                    <td className='trow'>{employee.gender}</td>                                                                         
                                                                    <td className='trow'>{employee.phoneNo}</td>                                                                         
                                                                    <td className='trow'>{employee.bankName}</td>                                                                         
                                                                    <td className='trow'>{employee.position}</td>                                                                         
                                                                    <td className='trow'>{employee.hiredDate}</td>                                                                         
                                                                    <td className='trow'>{parseFloat(employee.salary/monthDays[selectedMonth]).toFixed(2)}</td>                                                                         
                                                                    <td className='trow'>{employee.salary}</td>                                                                         
                                                                    <td className='trow'>{employee.salary*12}</td>                                                                         
                                                                    <td className='trow'>{parseFloat(payees[0]['Total Pay']).toFixed(2)}</td>                                                                         
                                                                    <td className='trow'>{employee.deductions}</td>                                                                         
                                                                    <td className='trow'>{employee.salary}</td>                                                                         
                                                                    {/* <td className='trow'>{employee.paymentMode}</td>                                                                          */}
                                                                    {/* <td className="col-md-3"><i className="fas fa-rupee-sign" area-hidden="false"></i> ₦ {'VALUE'}</td> */}
                                                                </tr>
                                                            )
                                                        }
                                                    })
                                                }
                                                {/* {
                                                    attendance.map((att)=>{
                                                        if (att.month === selectedMonth && att.year === selectedYear){
                                                            var count = 0
                                                            att.payees.map((payee)=>{
                                                                count++
                                                                if(count===2){
                                                                    console.log(att.payees)
                                                                    employees.map((employee,index)=>{
                                                                        var ct=0
                                                                        if(payee['Person ID'] === employee.i_d){
                                                                            ct++
                                                                            console.log(ct)
                                                                            return (
                                                                                <tr key={index} >                                                                                
                                                                                    <td className="col-md-3"><i className="fas fa-rupee-sign" area-hidden="false"></i> ₦ {'VALUE'}</td>
                                                                                </tr>
                                                                            )
                                                                        }
                                                                    })
                                                                }
                                                            })
                                                        }
                                                        
                                                    })
                                                } */}
                                                
                                            </tbody>
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
                            generatePDF(targetRef, options)
                            // setViewSchedule(false)
                            // resetField()
                        }
                    }
                >
                    PRINT SLIP
                </button>
                </div>
                </div>}
        </>
    )
}

export default Payee