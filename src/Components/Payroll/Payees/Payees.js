import {useState, useEffect, useContext, useRef, useCallback} from 'react'
import ContextProvider from '../../../Resources/ContextProvider';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
        months,
        monthDays,
        employees,
        attendance, 
    } = useContext(ContextProvider)

    const getInvoiceNumber = () =>{
        const invdate = Date.now()
        return "INV_"+company+invdate
    }
    const formatNumberForPDF = (value) => {
        if (value === null || value === undefined) {
            console.warn('Null or undefined value provided to formatNumberForPDF');
            return '0.00';
        }
        
        // Convert to number if it's a string
        let num;
        if (typeof value === 'string') {
            // Remove any non-numeric characters except decimal point and negative sign
            const numericString = value.replace(/[^0-9.-]/g, '');
            num = parseFloat(numericString);
        } else {
            num = Number(value);
        }
        
        // Check if the value is a valid number
        if (isNaN(num)) {
            console.warn('Invalid number value:', value);
            return '0.00';
        }
        
        // Format with thousand separators and 2 decimal places
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true
        });
    };

    const formatNumber = (value) => {
        if (typeof value !== 'number' || isNaN(value)) return '0.00';
        return value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true
        });
    };

    const generatePDF = useCallback(() => {
        try {
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 5;
            
            // Center company header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            const companyName = companyRecord?.name || 'Company Name';
            const companyNameWidth = doc.getTextWidth(companyName);
            doc.text(companyName, (pageWidth - companyNameWidth) / 2, 15);
            
            // Center company address and date
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            const address = companyRecord?.address || 'Company Address';
            const addressWidth = doc.getTextWidth(address);
            doc.text(address, (pageWidth - addressWidth) / 2, 23);
            
            const email = `Email: ${companyRecord?.emailid || 'info@company.com'}`;
            const emailWidth = doc.getTextWidth(email);
            doc.text(email, (pageWidth - emailWidth) / 2, 28);
            
            const dateText = `Created Date: ${getDate()}`;
            const dateWidth = doc.getTextWidth(dateText);
            doc.text(dateText, (pageWidth - dateWidth) / 2, 33);
            
            // Add centered title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            const titleText = `STAFF PAYROLL FOR THE MONTH OF ${selectedMonth?.toUpperCase()}, ${selectedYear}`;
            const titleWidth = doc.getTextWidth(titleText);
            doc.text(titleText, (pageWidth - titleWidth) / 2, 43);
            
            // Prepare table data
            const columns = [
                { header: 'S/N', dataKey: 'sn', width: 10 },
                { header: 'ID', dataKey: 'id', width: 15 },
                { header: 'NAME', dataKey: 'name', width: 40 },
                { header: 'SEX', dataKey: 'gender', width: 15 },
                { header: 'ACCOUNT NUMBER', dataKey: 'accountNo', width: 30 },
                { header: 'BANK', dataKey: 'bankName', width: 30 },
                { header: 'UNIT/POSITION', dataKey: 'position', width: 30 },
                { header: 'DATE OF EMPLOYMENT', dataKey: 'hiredDate', width: 25 },
                { header: 'BASIC RATE (Naira)', dataKey: 'basicRate', width: 25 },
                { header: 'GROSS SALARY PER ANNUM (Naira)', dataKey: 'grossPerAnnum', width: 30 },
                { header: 'GROSS SALARY PER MONTH (Naira)', dataKey: 'grossPerMonth', width: 30 },
                { header: 'ACTUAL GROSS SALARY (Naira)', dataKey: 'actualGross', width: 30 },
                { header: 'DEDUCTIONS (Naira)', dataKey: 'deductions', width: 25 },
                { header: 'NET PAY (Naira)', dataKey: 'netPay', width: 30 }
            ];
            
            // Prepare table rows
            let totalGrossPerAnnum = 0;
            let totalGrossPerMonth = 0;
            let totalActualGross = 0;
            let totalDeductions = 0;
            let totalNetPay = 0;

            const rows = [];
            let kt = 0;

            // Filter out dismissed employees
            const activeEmployees = employees.filter(emp => !emp.dismissalDate);
            
            activeEmployees.forEach((employee) => {
                const empAttendance = attendance.find(a => 
                    a.month === selectedMonth && 
                    a.year === selectedYear &&
                    a.payees.some(p => p['Person ID'] === employee.i_d)
                );

                if (!empAttendance) return;

                const payee = empAttendance.payees.find(p => p['Person ID'] === employee.i_d);
                if (!payee) return;

                kt++;
                
                // Calculate values
                const expectedWorkDays = Number(employee.expectedWorkDays || monthDays[selectedMonth]);
                const totalDays = Number(payee['Total Days'] || 0);
                const basicRate = employee.salary / monthDays[selectedMonth];
                const grossPerAnnum = employee.salary * 12;
                const grossPerMonth = employee.salary;
                const actualGross = (employee.salary / expectedWorkDays) * totalDays;
                
                // Calculate deductions
                let deductions = 0;
                if (payee.shortages) deductions += Number(payee.shortages);
                if (payee.prevDebt) deductions += Number(payee.prevDebt);
                if (payee.debtDue) deductions += Number(payee.debtDue);
                if (payee.penalties) deductions += Number(payee.penalties);
                
                const netPay = actualGross - deductions;
                
                // Update totals
                totalGrossPerAnnum += Number(grossPerAnnum);
                totalGrossPerMonth += Number(grossPerMonth);
                totalActualGross += Number(actualGross);
                totalDeductions += Number(deductions);
                totalNetPay += Number(netPay);
                
                // Add row with debug logging
                const rowData = {
                    sn: kt.toString(),
                    id: employee.i_d,
                    name: `${employee.lastName} ${employee.firstName} ${employee.otherName || ''}`.trim(),
                    gender: employee.gender,
                    accountNo: employee.accountNo,
                    bankName: employee.bankName,
                    position: employee.position,
                    hiredDate: employee.hiredDate,
                    basicRate: basicRate,
                    grossPerAnnum: grossPerAnnum,
                    grossPerMonth: grossPerMonth,
                    actualGross: actualGross,
                    deductions: deductions,
                    netPay: netPay
                };

                // Log raw values for debugging
                console.log('Raw values before formatting:', {
                    basicRate,
                    grossPerAnnum,
                    grossPerMonth,
                    actualGross,
                    deductions,
                    netPay,
                    employeeId: employee.i_d,
                    employeeName: employee.firstName
                });

                // Format all numeric values
                const formattedRow = {
                    ...rowData,
                    basicRate: formatNumberForPDF(rowData.basicRate),
                    grossPerAnnum: formatNumberForPDF(rowData.grossPerAnnum),
                    grossPerMonth: formatNumberForPDF(rowData.grossPerMonth),
                    actualGross: formatNumberForPDF(rowData.actualGross),
                    deductions: formatNumberForPDF(rowData.deductions),
                    netPay: formatNumberForPDF(rowData.netPay)
                };

                rows.push(formattedRow);
            });
            
            // Add totals row
            const totals = {
                sn: 'TOTAL',
                id: '',
                name: '',
                gender: '',
                accountNo: '',
                bankName: '',
                position: '',
                hiredDate: '',
                basicRate: '',
                grossPerAnnum: formatNumberForPDF(totalGrossPerAnnum),
                grossPerMonth: formatNumberForPDF(totalGrossPerMonth),
                actualGross: formatNumberForPDF(totalActualGross),
                deductions: formatNumberForPDF(totalDeductions),
                netPay: formatNumberForPDF(totalNetPay)
            };
            
            // Add the table
            autoTable(doc, {
                head: [columns.map(col => col.header)],
                body: [...rows.map(row => columns.map(col => row[col.dataKey])), 
                       columns.map(col => totals[col.dataKey] || '')],
                startY: 50,
                margin: { top: 50 },
                styles: {
                    fontSize: 7,
                    cellPadding: 1.5,
                    overflow: 'linebreak',
                    lineWidth: 0.1,
                    textColor: [0, 0, 0],
                    font: 'helvetica'
                },
                headStyles: {
                    fillColor: [50, 90, 168],
                    textColor: 255,
                    fontStyle: 'bold',
                    lineWidth: 0.1,
                    fontSize: 6
                },
                columnStyles: Object.fromEntries(columns.map(col => [col.dataKey, { 
                    cellWidth: col.width,
                    minCellHeight: 5,
                    halign: ['sn', 'id', 'name', 'gender', 'accountNo', 'bankName', 'position', 'hiredDate'].includes(col.dataKey) ? 'left' : 'right'
                }])),
                didDrawPage: function(data) {
                    const pageCount = doc.internal.getNumberOfPages();
                    const currentPage = data.pageNumber;
                    
                    // Add page number at bottom right
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    const pageText = `Page ${currentPage} of ${pageCount}`;
                    doc.text(pageText, pageWidth - 20, pageHeight - 10);
                    
                    // Only add signature on the last page
                    if (currentPage === pageCount) {
                        // Add some space before the signature
                        const signatureY = data.cursor.y + 10;
                        
                        // Add a line for the signature
                        doc.setDrawColor(0);
                        doc.setLineWidth(0.1);
                        doc.line(20, signatureY + 15, 60, signatureY + 15);
                        
                        // Add signature text
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(10);
                        doc.text('SIGNED BY: (MANAGING DIRECTOR)', 20, signatureY);
                        
                        // Add date below signature
                        // doc.setFont('helvetica', 'normal');
                        // doc.setFontSize(8);
                        // doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, signatureY + 10);
                    }
                }
            });
            
            // Save the PDF
            doc.save(`Payroll-${selectedMonth}-${selectedYear}.pdf`);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please check console for details.');
        }
    }, [employees, attendance, selectedMonth, selectedYear, companyRecord, monthDays]);

    

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
                                                                    var count = 0
                                                                    const attd = attendance.filter((att)=>{
                                                                        if (att.month === selectedMonth && att.year === selectedYear){
                                                                            count++
                                                                            if (count === 1){
                                                                                return att
                                                                            }
                                                                        }
                                                                    })
                                                                    var payees = []
                                                                    if (attd.length){
                                                                        payees = attd[0].payees.filter((payee)=>{
                                                                            if (payee['Person ID'] === employee.i_d 
                                                                                && (!employee.dismissalDate || new Date(employee.dismissalDate) >= new Date(`${selectedYear}-${months.indexOf(selectedMonth)}-01`))
                                                                            ){
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
                                                                                    <td className='trow'>₦{formatNumber(employee.salary/monthDays[selectedMonth])}</td>                                                                         
                                                                                    <td className='trow'>₦{formatNumber(grossSalaryPerAnnum)}</td>                                                                         
                                                                                    <td className='trow'>₦{formatNumber(grossSalaryPerMonth)}</td>                                                                         
                                                                                    <td className='trow'>₦{formatNumber(actualGrossSalary)}</td>                                                                         
                                                                                    <td className='trow'>₦{formatNumber(deductions)}</td>                                                                         
                                                                                    <td className='trow'>₦{formatNumber(netPay)}</td>                                                                         
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
                                                        <td className='ttrow'>₦{formatNumber(totalGrossSalaryPerAnnum)}</td>                                                                         
                                                        <td className='ttrow'>₦{formatNumber(totalGrossSalaryPerMonth)}</td>                                                                         
                                                        <td className='ttrow'>₦{formatNumber(totalActualGrossSalary)}</td>                                                                         
                                                        <td className='ttrow'>₦{formatNumber(totalDeductions)}</td>                                                                         
                                                        <td className='ttrow'>₦{formatNumber(totalNetPay)}</td>                                                                         
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
                        onClick={generatePDF}
                    >
                        EXPORT TO PDF
                    </button>
                </div>
            </div>}
        </>
    )
}

export default Payee