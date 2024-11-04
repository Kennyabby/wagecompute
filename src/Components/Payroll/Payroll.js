import './Payroll.css'

import {useEffect, useState, useRef, useContext } from 'react'
import Payee from './Payees/Payees';
import ContextProvider from '../../Resources/ContextProvider'
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import Barcode from 'react-barcode';
const Payroll = () =>{
    const {storePath,
        server, fetchServer,
        getDate,
        company, companyRecord,
        monthDays,months, years,
        employees, sales,
        attendance, getAttendance
    } = useContext(ContextProvider)
    const [selectedMonth, setSelectedMonth] = useState('')
    const [selectedYear, setSelectedYear] = useState('')
    const targetRef = useRef(null)
    const [viewSlip, setViewSlip] = useState(false)
    const [viewSlipStatus, setViewSlipStatus] = useState('Save and view pay slip')
    const [viewPayee, setViewPayee] = useState(false)
    const [adjustment, setAdjustment] = useState('')
    const [debtDue, setDebtDue] = useState('')
    const [shortages, setShortages] = useState('')
    const [penalties, setPenalties] = useState('')
    const [bonus, setBonus] = useState('')
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
        filename: curEmployee? (`${curEmployee.firstName} ${curEmployee.otherName} ${curEmployee.lastName} - PaySlip (${curAtt?.month},${curAtt?.year})`+'.pdf'): 'Payslip.pdf'
     };

    const handleViewClick = (e,index,employee)=>{
        setCurEmployee(employee)
    }

    const handlePayeeUpdate = async(payee, attNo, adjustment, bonus, shortages, debtDue, penalties)=>{
        if (viewSlipStatus === 'Save and view pay slip'){
            setViewSlipStatus('Saving hold on ...')
            var payees;
            attendance.forEach((att)=>{
                if(att.no === attNo){
                    payees = att.payees
                }
            })
            var updPayee;
            payees.forEach((pyee)=>{
                if (pyee['Person ID']===payee['Person ID']){
                    updPayee = {...payee,adjustment,bonus,shortages,debtDue,penalties}
                }
            })
            const ftrPayees = payees.filter((py)=>{
                return py['Person ID'] !== payee['Person ID']
            })
            const updPayees = [...ftrPayees, updPayee]
    
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Attendance", 
                prop: [{no: attNo}, {payees: updPayees}]
            }, "updateOneDoc", server)
              
            if (resps.err){
                console.log(resps.mess)
            }else{
                getAttendance(company)
                setViewSlipStatus('Save and view pay slip')
                setViewSlip(true)
            }
        }
     }
    return(
        <>
            <div className='payroll'>
                {viewPayee && 
                    <Payee
                        setViewPayee={setViewPayee}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                    />
                }
                {viewSlip && <div className='payslip'>
                    <div className='cancelslip'
                        onClick= {()=>{
                            setViewSlip(false)
                            setCurAtt(null)
                            setTotalPay(0)
                            setShortages('')
                            setDebtDue('')
                            setPenalties('')
                            setBonus('')
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
                                                <p className='billfromitem'>Created Date: <b>{date}</b></p>
                                            </div>
                                       </div>
                                        <div className='billtoview'>
                                            <div className="billto">
                                                <br />
                                                <p className='billtoitem'><b>{`Employee ID: `}</b>{curEmployee.i_d}</p>
                                                <p className='billtoitem'><b>{`Bank Name: `}</b>{curEmployee.bankName}</p>
                                                <p className='billtoitem'><b>{`Bank Branch: `}</b>{curEmployee.bankBranch}</p>
                                                <p className='billtoitem'><b>{'Account No: '}</b>{curEmployee.accountNo}</p>
                                                <p className='billtoitem'><b>{'Payment Date: '}</b>{`${monthDays[curAtt.month]} ${curAtt.month}, ${curAtt.year}.`}</p>
                                                <p className='billtoitem'><b>{'Date Engaged: '}</b>{curEmployee.hiredDate}</p>

                                            </div>
                                            <div className="billto">
                                                <br />
                                                <p className='billtoitem'><b>{`Name: `}</b>{`${curEmployee.firstName} ${curEmployee.otherName} ${curEmployee.lastName}`}</p>
                                                <p className='billtoitem'><b>{`Address: `}</b>{curEmployee.address}</p>
                                                <p className='billtoitem'><b>{`Phone No: `}</b>{curEmployee.phoneNo}</p>
                                                <p className='billtoitem'><b>{'Date of Birth: '}</b>{curEmployee.dateOfBirth}</p>
                                                <p className='billtoitem'><b>{'Sex: '}</b>{curEmployee.gender}</p>
                                                <p className='billtoitem'><b>{'Department/Position: '}</b>{curEmployee.department+'/'+curEmployee.position}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <br />
                                    <div className="ttlrow">
                                        <div >
                                            <h2 className="col-md-12" style={{ color: '#325aa8' }} >STAFF PAY SLIP</h2>
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
                                                    <th><h5>Expected Work Days: {curEmployee.expectedWorkDays?curEmployee.expectedWorkDays:monthDays[curAtt.month]}</h5></th>
                                                    <th><h5>Actual Work Days: {
                                                        curAtt.payees.length?
                                                        curAtt.payees.map((payee, index) => {
                                                            if(payee['Person ID']===curEmployee.i_d){
                                                                return (
                                                                        <label key={index}>{payee['Total Days']}</label>                                                                    
                                                                )
                                                            }
                                                        }):null
                                                    }</h5></th>
                                                    <th><h5>Absent Days: {
                                                        curAtt.payees.length?
                                                        curAtt.payees.map((payee, index) => {
                                                            if(payee['Person ID']===curEmployee.i_d){
                                                                return (
                                                                        <label key={index}>{Number((curEmployee.expectedWorkDays?curEmployee.expectedWorkDays:monthDays[curAtt.month]))-Number(payee['Total Days'])}</label>
                                                                )
                                                            }
                                                        }):null
                                                    }</h5></th>
                                                </tr>
                                            </thead>
                                        </table>
                                    </div>
                                    <div>
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th><h5>Descriptions</h5></th>
                                                    <th><h5>Deductions</h5></th>
                                                    <th><h5>Gross Earnings</h5></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {
                                                    curAtt.payees.length?
                                                    curAtt.payees.map((payee, index) => {
                                                        if(payee['Person ID']===curEmployee.i_d){
                                                            return (
                                                                <tr key={index} >
                                                                    <td className="col-md-3">
                                                                    <p>
                                                                        <strong>Salary/Wages: </strong>
                                                                    </p>
                                                                    </td>
                                                                    <td className="col-md-3"></td>
                                                                    <td className="col-md-3"><i className="fas fa-rupee-sign" area-hidden="false"></i> ₦ {Number(totalPay).toLocaleString()} </td>
                                                                </tr>
                                                            )
                                                        }
                                                    }):null
                                                }
                                                <tr>
                                                    <td className="col-md-3">
                                                    <p>
                                                        <strong>Salary Adjustment: </strong>
                                                    </p>
                                                    </td>
                                                    <td className="col-md-3"></td>
                                                    <td className="col-md-3"><i className="fas fa-rupee-sign" area-hidden="true"></i> ₦ {Number(adjustment).toLocaleString()}  </td>
                                                </tr>
                                                <tr>
                                                    <td className="col-md-3">
                                                    <p>
                                                        <strong>Bonuses: </strong>
                                                    </p>
                                                    </td>
                                                    <td className="col-md-3"></td>
                                                    <td className="col-md-3"><i className="fas fa-rupee-sign" area-hidden="true"></i> ₦ {Number(bonus).toLocaleString()}  </td>
                                                </tr>
                                                <tr>
                                                    <td className="text-right">
                                                        
                                                        <p>
                                                            <strong>Debt Due: </strong>
                                                        </p>
                                                        <p>
                                                            <strong>Shortages: </strong>
                                                        </p>
                                                        <p>
                                                            <strong>Penalties: </strong>
                                                        </p>
                                                    </td>
                                                    <td>
                                                        <p>
                                                            <strong><i className="fas fa-rupee-sign" area-hidden="false"></i> ₦ {Number(debtDue).toLocaleString()} </strong>
                                                        </p>
                                                        <p>
                                                            <strong><i className="fas fa-rupee-sign" area-hidden="false"></i> ₦ {Number(shortages).toLocaleString()}</strong>
                                                        </p>
                                                        <p>
                                                            <strong><i className="fas fa-rupee-sign" area-hidden="false"></i> ₦ {Number(penalties).toLocaleString()}</strong>
                                                        </p>
                                                    </td>
                                                    <td>
                                                        <p>
                                                            <strong><i className="fas fa-rupee-sign" area-hidden="false"></i> - </strong>
                                                        </p>
                                                        <p>
                                                            <strong><i className="fas fa-rupee-sign" area-hidden="false"></i> - </strong>
                                                        </p>
                                                        <p>
                                                            <strong><i className="fas fa-rupee-sign" area-hidden="false"></i> - </strong>
                                                        </p>
                                                        <p>
                                                            <strong><i className="fas fa-rupee-sign" area-hidden="false"></i> ₦ {(Number(debtDue) + Number(shortages) + Number(penalties)).toLocaleString()}</strong>
                                                        </p>
                                                    </td>
                                                </tr>
                                                <tr style={{ color: '#F81D2D' }}>
                                                    <td className="text-right"><h4><strong>Net Pay:</strong></h4></td>
                                                    <td className="text-right"><h4><strong></strong></h4></td>
                                                    <td className="text-left"><h4><strong><i className="fas fa-rupee-sign" area-hidden="true"></i> ₦ {Number(parseFloat((Number(totalPay)+Number(adjustment)+Number(bonus))-(Number(debtDue)+Number(shortages)+Number(penalties))).toFixed(2)).toLocaleString()} </strong></h4></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div className='signature'>                                
                                <div className='sign'>
                                    <div>(ACCOUNT OFFICER/CASHIER)</div>
                                </div>
                                <div className='sign'>
                                    <div>(MANAGING DIRECTOR)</div>
                                </div>
                            </div>
                            <div>
                                <div>Customer debt repayment after 24hrs = 20%.</div>
                                <div>Staff debt repayment after a week and must not exceed as graduated below;</div>
                                <div> Manager: ₦6,000</div>
                                <div> Supervisor: ₦5,000</div>
                                <div> HOD: ₦4,000</div>
                                <div> Others: ₦3,000</div>
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
                <div className='payeeinpcov'>
                    <div className='inpcov formpad'>
                        <div>Month</div>
                        <select 
                            className='forminp prinp'
                            name='selectedMonth'
                            type='text'
                            placeholder='Select Month'
                            value={selectedMonth}
                            onChange={(e)=>{
                                setSelectedMonth(e.target.value)
                            }}
                        >
                            <option value={''}>Select Month</option>
                            {months.map((month, index)=>{
                                return(
                                    <option key={index} value={month}>
                                        {month}
                                    </option>
                                )
                            })}
                        </select>
                    </div>
                    <div className='inpcov formpad'>
                        <div>Year</div>
                        <select 
                            className='forminp prinp'
                            name='selectedYear'
                            type='text'
                            placeholder='Select Year'
                            value={selectedYear}
                            onChange={(e)=>{
                                setSelectedYear(e.target.value)
                            }}
                        >
                            <option value={''}>Select Year</option>
                            {years.map((year, index)=>{
                                return(
                                    <option key={index} value={year}>
                                        {year}
                                    </option>
                                )
                            })}
                        </select>
                    </div>
                </div>
                <div 
                    className='viewpayeebtn'
                    onClick={()=>{
                        setViewPayee(true)
                    }}
                >VIEW STAFF PAYROLL</div>
                {employees.filter((ftremp)=>{
                    if (!ftremp.dismissalDate){
                        return ftremp
                    }
                }).map((employee, index)=>{
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
                        {`${curEmployee.firstName} ${curEmployee.otherName} ${curEmployee.lastName} (${curEmployee.i_d})`}
                    </div>}
                    {curEmployee && <div className='paydesc'>
                        <div><b>Department: </b>{`${curEmployee.department}`}</div>
                        <div><b>Position: </b>{`${curEmployee.position}`}</div>
                    </div>}
                    {curEmployee && 
                        attendance.map((att,id)=>{
                            return <PayAttendance
                                key={id}
                                att = {att}
                                curAtt={curAtt}
                                sales={sales}
                                setDebtDue={setDebtDue}
                                setShortages={setShortages}
                                setPenalties={setPenalties}
                                setBonus={setBonus}
                                setAdjustment={setAdjustment}
                                curEmployee={curEmployee}
                                setViewSlip={setViewSlip}
                                setCurAtt={setCurAtt}
                                setTotalPay={setTotalPay}
                                handlePayeeUpdate={handlePayeeUpdate}
                                monthDays={monthDays}
                                viewSlipStatus={viewSlipStatus}
                                months={months}
                            />
                        })
                    }
                </div>
            </div>
        </>
    )
}

export default Payroll

const PayAttendance = ({att, curAtt, setDebtDue, setShortages, sales,
    setPenalties, setBonus, setAdjustment, curEmployee, setViewSlip, setCurAtt,
    setTotalPay, handlePayeeUpdate, monthDays, viewSlipStatus, months
})=>{
    const [subDebtDue, setSubDebtDue] = useState('')
    const [subShortages, setSubShortages] = useState('')
    const [subPenalties, setSubPenalties] = useState('')
    const [subBonus, setSubBonus] = useState('')
    const [subAdjustment, setSubAdjustment] = useState('')
    const {payees} = att
    
    useEffect(()=>{
        const {payees} = att
        setSubDebtDue('')
        setSubShortages('')
        setSubPenalties('')
        setSubBonus('')
        setSubAdjustment('')
        payees.forEach((payee)=>{
            if (payee['Person ID']===curEmployee.i_d){
                if (payee.debtDue){
                    setSubDebtDue(payee.debtDue)
                }
                if (payee.shortages){
                    setSubShortages(payee.shortages)
                }
                if(payee.penalties){
                    setSubPenalties(payee.penalties)
                }
                if(payee.bonus){
                    setSubBonus(payee.bonus)
                }
                if(payee.adjustment){
                    setSubAdjustment(payee.adjustment)
                }
            }
        })
        var saleDebt = ''
        var saleShortage = ''
        sales.forEach((sale)=>{
            sale.record.forEach((record)=>{
                if (record.employeeId === curEmployee.i_d){
                    if (att.month === months[new Date(sale.postingDate).getMonth()]){
                        saleDebt = Number(saleDebt)+Number(record.debt) - Number(record.debtRecovered)
                        saleShortage = Number(saleShortage)+Number(record.shortage) + (Number(saleDebt)<0 ? Number(saleDebt): 0)
                    }
                }
            })
        })
        if (saleDebt && saleDebt>0){
            setSubDebtDue(saleDebt)
        }
        if (saleShortage){
            setSubShortages(saleShortage)
        }
    },[att, curEmployee])

    return (
        <>
            <div className='pyrl'>
                <div><b>Attendance No: </b>{`${att.no} for ${att.month}, ${att.year}.`}</div>
                <div className='calatr'>
                    {payees.map((payee, id1)=>{

                        if (payee['Person ID']===curEmployee.i_d){
                            const expectedWorkDays = Number(curEmployee.expectedWorkDays?curEmployee.expectedWorkDays:monthDays[att.month])
                            const totalPay = Number(parseFloat((curEmployee.salary/expectedWorkDays)*payee['Total Days']).toFixed(2)).toLocaleString()
                            return <div key={id1}>
                                <div><b>Total Days Worked:{'->'}</b> {`(${payee['Total Days']})`}</div>
                                <div><b>Total Hours Worked:{'->'}</b> {`(${payee['Total Hours']})`}</div>
                                <div><b>Total Pay (Naira):{'->'}</b> {`(${totalPay})`}</div>
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
                        <label className='ddclbl'>Salary Adjustment</label>
                        <input 
                            className='forminp prinp'
                            name='adjustment'
                            type='number'
                            placeholder='Adjustment'
                            value={subAdjustment}
                            onChange={(e)=>{
                                setSubAdjustment(e.target.value)
                            }}
                        />
                    </div>
                    <div className='inpcov formpad'>
                        <label className='ddclbl'>Bonus</label>
                        <input 
                            className='forminp prinp'
                            name='bonus'
                            type='number'
                            placeholder='Bonus'
                            value={subBonus}
                            onChange={(e)=>{
                                setSubBonus(e.target.value)
                            }}
                        />
                    </div>
                    <div className='inpcov formpad'>
                    <label className='ddclbl'>Debt Due</label>
                        <input 
                            className='forminp prinp'
                            name={curEmployee.i_d}
                            type='number'
                            placeholder='Debt Due'
                            value={subDebtDue}
                            onChange={(e)=>{
                                setSubDebtDue(e.target.value)
                            }}
                        />
                    </div>
                    <div className='inpcov formpad'>
                        <label className='ddclbl'>Shortages</label>
                        <input 
                            className='forminp prinp'
                            name='shortages'
                            type='number'
                            placeholder='Shortages'
                            value={subShortages}
                            onChange={(e)=>{
                                setSubShortages(e.target.value)
                            }}
                        />
                    </div>
                    <div className='inpcov formpad'>
                        <label className='ddclbl'>Penalties</label>
                        <input 
                            className='forminp prinp'
                            name='penalties'
                            type='number'
                            placeholder='Penalties Fine'
                            value={subPenalties}
                            onChange={(e)=>{
                                setSubPenalties(e.target.value)
                            }}
                        />
                    </div>
                    
                </div>
                <div className='viewslip'
                    onClick={()=>{
                        setCurAtt(att)
                        setAdjustment(subAdjustment?subAdjustment:'')
                        setBonus(subBonus?subBonus:'')
                        setDebtDue(subDebtDue?subDebtDue:'')
                        setPenalties(subPenalties?subPenalties:'')
                        setShortages(subShortages?subShortages:'')
                        const {payees} = att
                        payees.forEach(payee => {
                            if (payee['Person ID']===curEmployee.i_d){
                                const expectedWorkDays = Number(curEmployee.expectedWorkDays?curEmployee.expectedWorkDays:monthDays[att.month])
                                const totalPay = parseFloat((curEmployee.salary/expectedWorkDays)*payee['Total Days']).toFixed(2)
                                setTotalPay(totalPay)
                                if (payee.adjustment === subAdjustment && payee.bonus === subBonus && 
                                    payee.shortages === subShortages && payee.penalties === subPenalties && 
                                    payee.debtDue===subDebtDue
                                ){
                                    setViewSlip(true)                                
                                }else{
                                    handlePayeeUpdate(payee, att.no, subAdjustment, subBonus, subShortages, subDebtDue, subPenalties)
                                                                
                                }
                            }
                        })
                    }}
                >{(att.no===curAtt?.no) ? viewSlipStatus : 'Save and view pay slip'}</div>
            </div>
        </>
    )
}