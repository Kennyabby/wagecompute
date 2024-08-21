import './Payroll.css'

import {useEffect, useState, useRef, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import Barcode from 'react-barcode';
const Payroll = () =>{
    const {storePath,
        server, fetchServer,
        getDate,
        company, companyRecord,
        employees,
        attendance
    } = useContext(ContextProvider)
    const targetRef = useRef(null)
    const [viewSlip, setViewSlip] = useState(false)
    const [debtDue, setDebtDue] = useState('')
    const [shortages, setShortages] = useState('')
    const [totalPay, setTotalPay] = useState(0)
    const [curEmployee, setCurEmployee] = useState(null)
    const [curAtt, setCurAtt] = useState(null)
    const [InvoiceNumber, setInvoiceNumber] = useState('')
    const [date, setDate] = useState('')
    useEffect(()=>{
        storePath('payroll')  
    },[storePath])
    useEffect(()=>{
        setInvoiceNumber(getInvoiceNumber())
    },[company])
    useEffect(()=>{
        setDate(getDate())
    },[getDate])
    const getInvoiceNumber = () =>{
        const invdate = Date.now()
        return "INV_"+company+invdate
    }
    const options = {
        // default is `save`
        // method: 'open',
        method: 'open',
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
        filename: InvoiceNumber+'.pdf'
     };

    const handleViewClick = (e,index,employee)=>{
        setCurEmployee(employee)

    }
    return(
        <>
            <div className='payroll'>
                {viewSlip && <div className='payslip'>
                    <div className='cancelslip'
                        onClick= {()=>{
                            setViewSlip(false)
                            setCurAtt(null)
                            setTotalPay(0)
                            setShortages('')
                            setDebtDue('')
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
                                                <p className='billfromitem'>{`Address: ${companyRecord.address}`}</p>
                                                <p className='billfromitem'>{`Email: ${companyRecord.emailid}`}</p>
                                                <p className='billfromitem'>Created Date: <b>{date}</b></p>
                                            </div>
                                       </div>
                                        <div>
                                        <div className="billto">
                                                <br />
                                                <p className='billtoitem'><b>{`For: `}</b>{`${curEmployee.firstName} ${curEmployee.lastName}`}</p>
                                                <p className='billtoitem'><b>{`Month: `}</b>{curAtt.month}</p>
                                                <p className='billtoitem'><b>{'Year: '}</b>{curAtt.year}</p>
                                                <p className='billtoitem'><b>{'Department: '}</b>{curEmployee.department}</p>
                                                <p className='billtoitem'><b>{'Position: '}</b>{curEmployee.position}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <br />
                                    <div className="ttlrow">
                                        <div >
                                            <h2 className="col-md-12" style={{ color: '#325aa8' }} >SALARY SLIP</h2>
                                            <div className='invnum'>
                                                <h5 className='col-md-0'> Id: {InvoiceNumber}</h5>
                                                <Barcode value={`4n%${InvoiceNumber}+ut%`} width={1} height={50} displayValue={false} />
                                            </div>
                                        </div>
                                    </div>
                                    <br />
                                    <div>
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th><h5>Description</h5></th>
                                                    <th><h5>Earnings (₦)</h5></th>
                                                    <th><h5>Total Pay</h5></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {
                                                    curAtt.payees.length?
                                                    curAtt.payees.map((payee, index) => {
                                                        if(payee['ID']===curEmployee.i_d){
                                                            return (
                                                                <tr key={index} >
                                                                    <td className="col-md-5">{'For '+payee['Total Days']+' Days'}</td>
                                                                    <td className="col-md-5">{'For '+payee['Total Hours']+' Hours'}</td>
                                                                    <td className="col-md-3"><i className="fas fa-rupee-sign" area-hidden="true"></i> ₦ {totalPay}  </td>
                                                                </tr>
                                                            )
                                                        }
                                                    }):null
                                                }
                                                <tr>
                                                    <td className="text-right">
                                                        <p>
                                                            <strong>Salary/Wages: </strong>
                                                        </p>
                                                        <p>
                                                            <strong>Debt Due: </strong>
                                                        </p>
                                                        <p>
                                                            <strong>Shortages: </strong>
                                                        </p>
                                                    </td>
                                                    <td>
                                                        <p>
                                                            <strong><i className="fas fa-rupee-sign" area-hidden="true"></i> ₦ {Number(totalPay)}</strong>
                                                        </p>
                                                        <p>
                                                            <strong><i className="fas fa-rupee-sign" area-hidden="true"></i> ₦ {Number(debtDue)} </strong>
                                                        </p>
                                                        <p>
                                                            <strong><i className="fas fa-rupee-sign" area-hidden="true"></i> ₦ {Number(shortages)}</strong>
                                                        </p>
                                                    </td>
                                                </tr>
                                                <tr style={{ color: '#F81D2D' }}>
                                                    <td className="text-right"><h4><strong>Total:</strong></h4></td>
                                                    <td className="text-left"><h4><strong><i className="fas fa-rupee-sign" area-hidden="true"></i> ₦ {Number(totalPay)-(Number(debtDue)+Number(shortages))} </strong></h4></td>
                                                </tr>
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
                <div className='emplist'>
                {employees.map((employee, index)=>{
                    const {i_d, 
                        firstName, lastName,
                        department, position,
                    } = employee
                    return(
                        <div className={'dept' + (curEmployee?.i_d===i_d?' curview':'')} key={index} i_d={i_d} 
                            onClick={(e)=>{
                                handleViewClick(e,index,employee)
                            }}
                        >
                            <div className='dets'>
                                <div><b>Employee ID: </b>{i_d}</div>
                                <div> <b>Name:</b>{` ${firstName} ${lastName}`}</div>
                                <div className='deptdesc'>{`${department} Department`}</div>
                                <div className='deptdesc'><b>Position:</b>{` ${position}`}</div>
                            </div>
                            <div 
                            className='edit'
                            name='edit'
                            >Edit</div>
                        </div>
                    )
                  })}
                </div>
                <div className='empview payview'>
                    {curEmployee && <div className='formtitle'>
                        {`${curEmployee.firstName} ${curEmployee.lastName} (${curEmployee.i_d})`}
                    </div>}
                    {curEmployee && <div className='paydesc'>
                        <div><b>Department: </b>{`${curEmployee.department}`}</div>
                        <div><b>Position: </b>{`${curEmployee.position}`}</div>
                    </div>}
                    {curEmployee && 
                        attendance.map((att,id)=>{
                            const {payees} = att
                            return <div className='pyrl' key={id}>
                                <div><b>Attendance No: </b>{`${att.no} for ${att.month}, ${att.year}.`}</div>
                                <div className='calatr'>
                                    {payees.map((payee, id1)=>{
                                        const {ID} = payee

                                        if (ID===curEmployee.i_d){
                                            
                                            return <div key={id1}>
                                                <div><b>Total Days Worked:{'->'}</b> {`(${payee['Total Days']})`}</div>
                                                <div><b>Total Hours Worked:{'->'}</b> {`(${payee['Total Hours']})`}</div>
                                                <div><b>Total Pay (Naira):{'->'}</b> {`(${parseFloat(payee['Total Pay']).toFixed(2)})`}</div>
                                            </div>
                                        }else{
                                            <div>
                                                Employee Not Present in This Attendance
                                            </div>
                                        }
                                    })}
                                </div>
                                <div className='deptetr'>
                                     <div className='inpcov formpad'>
                                        <input 
                                            className='forminp'
                                            name='deptDue'
                                            type='number'
                                            placeholder='Dept Due'
                                            value={debtDue}
                                            onChange={(e)=>{
                                                setDebtDue(e.target.value)
                                            }}
                                        />
                                    </div>
                                     <div className='inpcov formpad'>
                                        <input 
                                            className='forminp'
                                            name='shortages'
                                            type='number'
                                            placeholder='Shortages'
                                            value={shortages}
                                            onChange={(e)=>{
                                                setShortages(e.target.value)
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className='viewslip'
                                    onClick={()=>{
                                        setViewSlip(true)
                                        setCurAtt(att)
                                        const {payees} = att
                                        payees.forEach(payee => {
                                            if (payee['ID']===curEmployee.i_d){
                                                setTotalPay(parseFloat(payee['Total Pay']).toFixed(2))
                                            }
                                        });
                                    }}
                                >View Pay Slip</div>
                            </div>
                        })
                    }
                </div>
            </div>
        </>
    )
}

export default Payroll