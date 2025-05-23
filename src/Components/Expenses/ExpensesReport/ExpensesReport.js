import './ExpensesReport.css'
import {useState, useContext, useRef, useEffect} from 'react'
import ContextProvider from '../../../Resources/ContextProvider'
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import html2pdf from 'html2pdf.js';

const ExpensesReport = ({
    reportExpense,
    fromDate,
    toDate,
    setShowReport,
})=>{
    const [InvoiceNumber, setInvoiceNumber] = useState('')    
    const departments = ['Admin']
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
        
     },[reportExpense])
    
    const calculateExpenseAmount =(dept)=>{
        var reportDeptAmount = 0
        reportExpense.forEach((exp)=>{
            if (exp.expensesDepartment===dept){
                reportDeptAmount += Number(exp.expensesAmount)
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
        filename: `EXPENSES REPORT - FROM ${getDate(fromDate)} TO ${getDate(toDate)}.pdf`
    };

    const printToPDF = () => {
        const element = targetRef.current;
        const options = {
            margin:       0.1,
            filename:     `EXPENSES REPORT - FROM ${getDate(fromDate)} TO ${getDate(toDate)}.pdf`,
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
                                                <p className='billfrompayee'>{`EXPENSES REPORT FROM `}<b>{`${getDate(fromDate)}`}</b>{` TO `}<b>{`${getDate(toDate)}`}</b></p>                                                                                   
                                                <p className='billfrompayee'>Created Date: <b>{getDate()}</b></p>
                                            </div>
                                       </div>
                                    </div>
                                    <div className='tablecover'>
                                        {departments.map((department)=>{
                                            const totalPurchaseAmount = reportExpense?calculateExpenseAmount(department):0
                                            const categories = []
                                            reportExpense.forEach((exp)=>{
                                                if (exp.expensesDepartment===department){
                                                    if (!categories.includes(exp.expenseCategory.toUpperCase())){
                                                        categories.push(exp.expenseCategory.toUpperCase())
                                                    }
                                                }                                       
                                            })
                                            return (
                                                <div className='purtablecv'>
                                                    <div>{`${department.toUpperCase()} EXPENSES REPORT`}</div>
                                                    <table className="table payeetable">   
                                                        <thead>
                                                            <tr>
                                                                <th><h8 className='theader'>DATE</h8></th>
                                                                <th><h8 className='theader'>HANDLER</h8></th>
                                                                <th><h8 className='theader'>VENDOR</h8></th>
                                                                <th><h8 className='theader'>CATEGORY</h8></th>
                                                                <th><h8 className='theader'>DESCRIPTION</h8></th>
                                                                <th><h8 className='theader'>AMOUNT</h8></th>
                                                                
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {categories.map((cat)=>{
                                                                const totalCatAmount = reportExpense?reportExpense.filter(exp=>exp.expenseCategory.toUpperCase()===cat && exp.expensesDepartment===department).reduce((acc, exp)=> acc + Number(exp.expensesAmount), 0):0                                                                
                                                                // console.log(cat, totalCatAmount)
                                                                return(
                                                                    <>
                                                                        {reportExpense?.sort((a,b)=>{
                                                                            return a.postingDate - b.postingDate
                                                                        }).map((exp)=>{
                                                                            if (exp.expensesDepartment === department && exp.expenseCategory.toUpperCase()===cat){
                                                                                return(
                                                                                    <tr>
                                                                                        <td><h8 className='ttrow'>{getDate(exp.postingDate)}</h8></td>                                                        
                                                                                        <td><h8 className='ttrow'>{employees.filter((emp)=>{
                                                                                            return emp.i_d === exp.expensesHandler
                                                                                        })[0].firstName}</h8></td>                                                        
                                                                                        <td><h8 className='ttrow'>{exp.expensesVendor}</h8></td>                                                        
                                                                                        <td><h8 className='ttrow'>{exp.expenseCategory.toUpperCase()}</h8></td>                                                        
                                                                                        <td><h8 className='ttrow exp-dets'>{exp.expensesDescription.toUpperCase()}</h8></td>                                                        
                                                                                        <td><h8 className='ttrow'>{'₦'+Number(exp.expensesAmount).toLocaleString()}</h8></td>                                                        
                                                                                    </tr>
                                                                                )                                                                                                                
                                                                            }
                                                                        })}       
                                                                        <tr>
                                                                            <td className='ttrow'>{`${cat} SUB-TOTAL`}</td>                                                        
                                                                            <td className='ttrow'></td>                                                        
                                                                            <td className='ttrow'></td>                                                        
                                                                            <td className='ttrow'></td>                                                        
                                                                            <td className='ttrow'></td>                                                        
                                                                            <td className='ttrow'>{'₦'+totalCatAmount.toLocaleString()}</td>                                                      
                                                                        </tr>                                                                                                                                             
                                                                    </>
                                                                )
                                                            })}
                                                            <tr>
                                                                <td className='ttrow'>TOTAL</td>                                                        
                                                                <td className='ttrow'></td>                                                        
                                                                <td className='ttrow'></td>                                                        
                                                                <td className='ttrow'></td>                                                        
                                                                <td className='ttrow'></td>                                                        
                                                                <td className='ttrow'>{'₦'+totalPurchaseAmount.toLocaleString()}</td>                                                      
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

export default ExpensesReport