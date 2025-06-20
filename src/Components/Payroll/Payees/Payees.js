import {useState, useEffect, useContext, useRef} from 'react'
import ContextProvider from '../../../Resources/ContextProvider';
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import html2pdf from 'html2pdf.js';
import Barcode from 'react-barcode';

    

const Payee = ({setViewPayee, selectedMonth, selectedYear})=>{
    const [InvoiceNumber, setInvoiceNumber] = useState('')
    var totalGrossSalaryPerAnnum = 0
    var totalGrossSalaryPerMonth = 0
    var totalActualGrossSalary = 0
    var totalDeductions = 0
    var totalNetPay = 0

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
             filename:     `StaffPayRoll - ${selectedMonth}, ${selectedYear}.pdf`,
             image:        { type: 'jpeg', quality: 0.98 },
             html2canvas:  { scale: 2 },
             jsPDF:        { unit: 'in', format: 'A4', orientation: 'landscape' }
         };
         html2pdf().set(options).from(element).save();
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
                        <div className=""  ref={targetRef}>
                        <div className="">
                        <div className="pr-row payeerow">
                            <div>
                                <div className="">
                                    <div className="pr-row payeerow">
                                       <div className='invhead'>
                                            <div className="billfrom">
                                                <h4 className='payeecompany' style={{ color: '#325aa8' }}><strong>{companyRecord.name.toUpperCase()}</strong></h4>
                                                <p className='billfrompayee'>{`Address: ${companyRecord.address}, ${companyRecord.city}, ${companyRecord.state}, ${companyRecord.country}.`}</p>
                                                <p className='billfrompayee'>{`Email: ${companyRecord.emailid}`}</p>
                                                <p className='billfrompayee'>Created Date: <b>{getDate()}</b></p>
                                                <p className='billfrompayee'>{`STAFF PAYROLL FOR THE MONTH OF `}<b>{`${selectedMonth}, ${selectedYear}.`}</b></p>                                                                                   
                                            </div>
                                       </div>
                                    </div>
                                    
                                    <div className='tablecover'>
                                        <table className="pr-table">   
                                            <thead>
                                                <tr className='theader'>
                                                    <th><h8 className='theader'>S/N</h8></th>
                                                    <th><h8 className='theader'>ID</h8></th>
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
                                                    [''].map((args)=>{
                                                        var kt = 0
                                                        return(
                                                            employees.map((employee,index)=>{
                                                                var count=0
                                                                const attd = attendance.filter((att)=>{
                                                                    if (att.month === selectedMonth && att.year === selectedYear){
                                                                        count++
                                                                        if (count===1){
                                                                            return att
                                                                        }
                                                                    }
                                                                })
                                                                var payees = []
                                                                if (attd.length){
                                                                    payees = attd[0].payees.filter((payee)=>{
                                                                        if (payee['Person ID'] === employee.i_d && !employee.dismissalDate){
                                                                            return payee
                                                                        }
                                                                    })
                                                                }
                                                                if (payees.length){
                                                                    kt++
                                                                    var deductions = 0
                                                                    var bonus = 0
                                                                    var adjustment = 0
                                                                    if (payees[0].shortages){
                                                                        deductions+=Number(payees[0].shortages)
                                                                    }
                                                                    if (payees[0].prevDebt){
                                                                        deductions+=Number(payees[0].prevDebt)
                                                                    }
                                                                    if (payees[0].debtDue){
                                                                        deductions+=Number(payees[0].debtDue)
                                                                    }
                                                                    if (payees[0].penalties){
                                                                        deductions+=Number(payees[0].penalties)
                                                                    }
                                                                    if (payees[0].bonus){
                                                                        bonus+=Number(payees[0].bonus)
                                                                    }
                                                                    if (payees[0].adjustment){
                                                                        adjustment+=Number(payees[0].adjustment)
                                                                    }
                                                                    const expectedWorkDays = Number(employee.expectedWorkDays?employee.expectedWorkDays:monthDays[attd[0].month])
                                                                    const totalPay = Number(parseFloat((employee.salary/expectedWorkDays)*payees[0]['Total Days']).toFixed(2))
                                                                    const grossSalaryPerAnnum = employee.salary*12
                                                                    totalGrossSalaryPerAnnum += grossSalaryPerAnnum
                                                                    const grossSalaryPerMonth = Number(employee.salary)
                                                                    totalGrossSalaryPerMonth += grossSalaryPerMonth
                                                                    const actualGrossSalary = Number(parseFloat(totalPay+adjustment+bonus).toFixed(2))
                                                                    totalActualGrossSalary += actualGrossSalary         
                                                                    totalDeductions += deductions
                                                                    const netPay = Number(parseFloat(totalPay+adjustment+bonus-deductions).toFixed(2))
                                                                    totalNetPay += netPay
                                                                    return (
                                                                        <>
                                                                            <tr key={index}>       
                                                                                <td className='trow'>{kt}</td>                                                                         
                                                                                <td className='trow'>{employee.i_d}</td>                                                                         
                                                                                <td className='trow'>{`${employee.lastName} ${employee.firstName} ${employee.otherName}`}</td>                                                                         
                                                                                <td className='trow'>{employee.gender}</td>                                                                         
                                                                                <td className='trow'>{employee.accountNo}</td>                                                                         
                                                                                <td className='trow'>{employee.bankName}</td>                                                                         
                                                                                <td className='trow'>{employee.position}</td>                                                                         
                                                                                <td className='trow'>{employee.hiredDate}</td>                                                                         
                                                                                <td className='trow'>₦{Number(parseFloat(employee.salary/monthDays[selectedMonth]).toFixed(2)).toLocaleString()}</td>                                                                         
                                                                                <td className='trow'>₦{grossSalaryPerAnnum.toLocaleString()}</td>                                                                         
                                                                                <td className='trow'>₦{grossSalaryPerMonth.toLocaleString()}</td>                                                                         
                                                                                <td className='trow'>₦{actualGrossSalary.toLocaleString()}</td>                                                                         
                                                                                <td className='trow'>₦{deductions.toLocaleString()}</td>                                                                         
                                                                                <td className='trow'>₦{netPay.toLocaleString()}</td>                                                                         
                                                                                {/* <td className='trow'>{employee.paymentMode}</td>                                                                          */}
                                                                                {/* <td className="col-md-3"><i className="fas fa-rupee-sign" area-hidden="false"></i> ₦ {'VALUE'}</td> */}
                                                                            </tr>
                                                                            {/* <div style={{ pageBreakAfter: 'always' }}></div> */}
                                                                        </>
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    })
                                                }
                                                <tr>       
                                                    <td className='ttrow'></td>
                                                    <td className='ttrow'></td>                                                                         
                                                    <td className='ttrow'></td>                                                                         
                                                    <td className='ttrow'></td>                                                                         
                                                    <td className='ttrow'></td>                                                                         
                                                    <td className='ttrow'></td>                                                                         
                                                    <td className='ttrow'></td>                                                                         
                                                    <td className='ttrow'>TOTAL :</td>                                                                         
                                                    <td className='ttrow'></td>                                                                         
                                                    <td className='ttrow'>₦{totalGrossSalaryPerAnnum.toLocaleString()}</td>                                                                         
                                                    <td className='ttrow'>₦{totalGrossSalaryPerMonth.toLocaleString()}</td>                                                                         
                                                    <td className='ttrow'>₦{totalActualGrossSalary.toLocaleString()}</td>                                                                         
                                                    <td className='ttrow'>₦{totalDeductions.toLocaleString()}</td>                                                                         
                                                    <td className='ttrow'>₦{totalNetPay.toLocaleString()}</td>                                                                         
                                                    {/* <td className='trow'>{employee.paymentMode}</td>                                                                          */}
                                                    {/* <td className="col-md-3"><i className="fas fa-rupee-sign" area-hidden="false"></i> ₦ {'VALUE'}</td> */}
                                                </tr>
                                                
                                            </tbody>
                                        </table>
                                        <div className='signature'>                                
                                           
                                            <div className='sign'>
                                                <div>SIGNED BY: (MANAGING DIRECTOR)</div>
                                            </div>
                                        </div>
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

export default Payee