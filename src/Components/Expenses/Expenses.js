import './Expenses.css'
import { useEffect, useContext, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useScroll } from 'framer-motion'
import { MdAdd } from 'react-icons/md'
import { FaTableCells } from 'react-icons/fa6'
import ExpensesReport from './ExpensesReport/ExpensesReport'

const Expenses = ()=>{

    const { storePath,
        server, 
        fetchServer,
        companyRecord,
        company, getDate,
        employees, months, getExpenses, setExpenses, expenses,
        alert,alertState,alertTimeout,actionMessage, 
        setAlert, setAlertState, setAlertTimeout, setActionMessage
    } = useContext(ContextProvider)
    const [expensesStatus, setExpensesStatus] = useState('Post Expenses')
    const [expensesDate, setExpensesDate] = useState(new Date(Date.now()).toISOString().slice(0,10))
    const [curExpense, setCurExpense] = useState(null)
    const [isView, setIsView] = useState(false)
    const [showReport, setShowReport] = useState(false)
    const [expenseFrom, setExpenseFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
    const [expenseTo, setExpenseTo] = useState(new Date(Date.now()).toISOString().slice(0, 10))
    const [reportExpense, setReportExpense] = useState(null)
    const defaultFields = {
        expensesDepartment:'',
        expensesHandler:'',
        expenseCategory:'',
        expensesAmount:'',
        expensesVendor:'',
        expensesDescription:'',
    }
    const [fields, setFields] = useState({...defaultFields})
    const departments = ['Admin']
    const expensesCategory = ['Electrical Repairs', 'Plumbing Repairs', 'MTN Subscription',
         'DSTV Subscription', 'Diesel & Lubricant', 'Generator Repairs',
        'Sewage Evacuation', 'Sanitation & Waste','Musical Expenses',
        'Admin Expenses', 'Printing and Stationery', 'Furniture Maintenance',
        'Transport', 'NEPA', 'PR', 'Telephone Subscription', 'Adhoc Staff',
        'Fitting & Lighting', 'Laundry Services', 'Staff Uniform', 'CCTV Maintenance',
        'Entertainment', 'Building Maintenance', 'Computer Maintenance', 'Cooking gas',
        'Salary & Wages', 'First Aid', 'Hiring', 'Donation', 'Staff Welfare',
        'Director Remuneration', 'Medical', 'General Maintenance'
    ]    
    useEffect(()=>{
        storePath('expenses')  
    },[storePath])

    useEffect(()=>{
        if (companyRecord.status!=='admin'){
            setExpenseFrom(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
        }
    },[companyRecord])
    const handleExpensesEntry = (e)=>{
        const name = e.target.getAttribute('name')
        const value = e.target.value

        if (name){
            setFields((fields)=>{
                return {...fields, [name]:value}
            })
        }
    }
    const handleViewClick = (exp) =>{
        setCurExpense(exp)
        setFields({...exp})
        setIsView(true)
    }
    const addExpenses = async ()=>{
        if (fields.expensesAmount && fields.expenseCategory && 
            fields.expensesDepartment && fields.expensesHandler
        ){
            setExpensesStatus('Posting Expenses...')
            const newExpense = {
                ...fields,
                postingDate:expensesDate,
                createdAt: Date.now()
            }
            const newExpenses = [newExpense, ...expenses]
            
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Expenses", 
                update: newExpense
              }, "createDoc", server)
                                          
              if (resps.err){
                console.log(resps.mess)
                setExpensesStatus('Post Expenses')
              }else{
                setExpensesStatus('Post Expenses')
                setExpenses(newExpenses)
                setCurExpense(newExpense)
                setIsView(true)
                setFields({...newExpense})
                getExpenses(company)
              }
        }
    }

    const deleteExpenses = async (expense)=>{
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Expenses", 
            update: {createdAt: expense.createdAt}
        }, "removeDoc", server)
        if (resps.err){
            console.log(resps.mess)
            // setAlertState('info')
            // setAlert(resps.mess)
            // setAlertTimeout(5000)
        }else{
            setIsView(false)
            setCurExpense(null)
            // setCurExpenseDate(null)
            setFields({...defaultFields})
            // setAlertState('success')
            // setAlert('Expenses Deleted Successfully!')
            // setDeleteCount(0)
            // setAlertTimeout(5000)
            getExpenses(company)
        }        
    }
    const calculateReportExpense = ()=>{
        var filteredReportExpenses = expenses.sort((a,b) => {
            return b.postingDate - a.postingDate
        }).filter((ftrexpense)=>{
            const expPostingDate = new Date(ftrexpense.postingDate).getTime()
            const fromDate = new Date(expenseFrom).getTime()
            const toDate = new Date(expenseTo).getTime()
            if ( expPostingDate>= fromDate && expPostingDate<=toDate
            ){
                return ftrexpense
            }
        })
        setReportExpense(filteredReportExpenses)
    }
    return (
        <>
            <div className='expenses'>
                {showReport && <ExpensesReport
                    reportExpense = {reportExpense}
                    multiple={true}
                    setShowReport={(value)=>{
                        setShowReport(value)                        
                    }}              
                    fromDate = {expenseFrom}
                    toDate = {expenseTo}      
                    // selectedMonth={selectedMonth}
                    // selectedYear={selectedYear}
                />}
                <div className='purlst'>
                    {companyRecord.status==='admin' && <FaTableCells                         
                        className='allslrepicon'
                        onClick={()=>{
                            calculateReportExpense()
                            if (expenseTo && expenseFrom){                                
                                setShowReport(true)
                            }
                        }}
                    />}
                    {<MdAdd 
                        className='add slsadd'
                        onClick={()=>{
                            setIsView(false)
                            setFields({...defaultFields})
                            setCurExpense(null)
                        }}
                    />}
                    <div className='payeeinpcov'>
                        <div className='inpcov formpad'>
                            <div>Date From</div>
                            <input 
                                className='forminp prinps'
                                name='expensesfrom'
                                type='date'
                                placeholder='From'
                                value={expenseFrom}
                                disabled={companyRecord.status!=='admin'}
                                onChange={(e)=>{
                                    setExpenseFrom(e.target.value)
                                }}
                            />
                        </div>
                        <div className='inpcov formpad'>
                            <div>Date To</div>
                            <input 
                                className='forminp prinps'
                                name='expensesto'
                                type='date'
                                placeholder='To'
                                value={expenseTo}
                                disabled={companyRecord.status!=='admin'}
                                onChange={(e)=>{
                                    setExpenseTo(e.target.value)
                                }}
                            />
                        </div>
                    </div>
                    {expenses.filter((expfltr)=>{
                        if (expfltr.postingDate >= expenseFrom && expfltr.postingDate <= expenseTo){
                            return expfltr
                        }
                    }).map((pur, index)=>{
                        const {
                            createdAt,postingDate, 
                            expensesAmount, expensesDepartment,
                            expenseCategory,expensesHandler 
                        } = pur
                        var handlerName = ''
                        employees.forEach((emp)=>{
                            if (emp.i_d === expensesHandler){
                                handlerName = `${emp.firstName} ${emp.lastName}`
                            }
                        })
                        return(
                            <div className={'dept' + (curExpense?.createdAt===createdAt?' curview':'')} key={index} 
                                onClick={(e)=>{
                                    handleViewClick(pur)
                                }}
                            >
                                <div className='dets sldets'>
                                    <div>Posting Date: <b>{getDate(postingDate)}</b></div>
                                    <div>Expenses Department: <b>{expensesDepartment}</b></div>                                    
                                    <div>Expenses Category: <b>{expenseCategory}</b></div>                                    
                                    <div>Expenses Amount: <b>{'₦'+(Number(expensesAmount)).toLocaleString()}</b></div>                                    
                                    <div className='deptdesc'>{`Expenses Handled By:`} <b>{`${handlerName}`}</b></div>
                                </div>
                                {(companyRecord.status==='admin') && <div 
                                    className='edit'
                                    name='delete'         
                                    style={{color:'red'}}                           
                                    onClick={()=>{                                        
                                        // setAlertState('info')
                                        // setAlert('You are about to delete the selected Expenses. Please Delete again if you are sure!')
                                        // setAlertTimeout(5000)                                                                                    
                                        deleteExpenses(expenses)
                                    }}
                                >
                                    Delete
                                </div>}
                            </div>
                        )
                    })}
                </div>
                <div className='purinfo'>
                    <div className='purinfotitle'>EXPENSES ENTRY</div>
                    <div className='purinfocontent' onChange={handleExpensesEntry}>
                        <div className='inpcov'>
                            <div>Select Department</div>
                            <select 
                                className='forminp'
                                name='expensesDepartment'
                                type='text'
                                value={fields.expensesDepartment}  
                                disabled={isView}                              
                            >
                                <option value=''>Select Department</option>
                                {departments.map((dept, index)=>{
                                    return (
                                        <option key={index} value={dept}>{dept}</option>
                                    )
                                })}
                            </select>
                        </div>
                        <div className='inpcov'>
                            <div>Vendor</div>
                            <input 
                                className='forminp'
                                name='expensesVendor'
                                type='text'
                                placeholder='Vendor'
                                value={fields.expensesVendor}
                                disabled={isView}
                            />
                        </div>
                        <div className='inpcov'>
                            <div>Select Expenses Handler</div>
                            <select 
                                className='forminp'
                                name='expensesHandler'
                                type='text'
                                value={fields.expensesHandler}     
                                disabled={isView}                           
                            >
                                <option value=''>Select Expenses Handler</option>
                                {employees.map((employee)=>{
                                    return (
                                        <option 
                                            key={employee.i_d}
                                            value={employee.i_d}
                                        >
                                            {`(${employee.i_d}) ${employee.firstName.toUpperCase()} ${employee.lastName.toUpperCase()} - ${employee.position}`}
                                        </option>
                                    )
                                })}
                            </select>
                        </div>
                        <div className='inpcov'>
                            <div>Expense Category</div>
                            <select 
                                className='forminp'
                                name='expenseCategory'
                                type='text'
                                value={fields.expenseCategory}
                                disabled={isView}
                            >
                                <option value=''>Expense Category</option>
                                {expensesCategory.sort((a,b) => a - b).map((category, index)=>{
                                    return (
                                        <option key={index} value={category}>{category}</option>
                                    )
                                })}
                            </select>
                        </div>
                        <div className='inpcov'>
                            <div>Description of Item</div>
                            <textarea 
                                className='forminp  exparea'
                                name='expensesDescription'
                                type='text'
                                placeholder='Description of Item'
                                value={fields.expensesDescription}
                                disabled={isView}
                            />
                        </div>
                        <div className='inpcov'>
                            <div>Expenses Amount</div>
                            <input 
                                className='forminp'
                                name='expensesAmount'
                                type='number'
                                placeholder='Expenses Amount'
                                value={fields.expensesAmount}
                                disabled={isView}
                            />
                        </div>
                    </div>
                    {!isView && <div className='expensesbuttom'>
                        <div className='inpcov'>
                            <input 
                                className='forminp'
                                name='expensesdate'
                                type='date'
                                placeholder='Expenses Date'
                                value={expensesDate}
                                onChange={(e)=>{
                                    setExpensesDate(e.target.value)
                                }}
                            />
                        </div>
                        <div 
                            className='expensesbutton'
                            onClick={addExpenses}
                        >{expensesStatus}</div>
                    </div>}
                </div>
            </div>
        </>
    )
}

export default Expenses