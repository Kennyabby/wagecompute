import './Expenses.css'
import { useEffect, useContext, useState} from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import html2pdf from 'html2pdf.js';
import { useScroll } from 'framer-motion'
import { MdAdd } from 'react-icons/md'
import { FaPlus } from "react-icons/fa";
import { FaTableCells, FaPrint } from 'react-icons/fa6'
import { FaAngleDown, FaAngleUp } from "react-icons/fa";
import ExpensesReport from './ExpensesReport/ExpensesReport'

const Expenses = ()=>{

    const { storePath,
        server, 
        fetchServer,
        companyRecord,
        company, getDate,
        chartOfAccounts, setChartOfAccounts, getChartOfAccounts,
        employees, getEmployees, months, getExpenses, setExpenses, expenses,
        alert,alertState,alertTimeout,actionMessage, 
        setAlert, setAlertState, setAlertTimeout, setActionMessage
    } = useContext(ContextProvider)
    const [expensesStatus, setExpensesStatus] = useState('Post Expenses')
    const [expensesDate, setExpensesDate] = useState(new Date(Date.now()).toISOString().slice(0,10))
    const [curExpense, setCurExpense] = useState(null)
    const [deleteCount, setDeleteCount] = useState(0)
    const [isView, setIsView] = useState(false)
    const [showReport, setShowReport] = useState(false)
    const [expenseFrom, setExpenseFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
    const [expenseTo, setExpenseTo] = useState(new Date(Date.now()).toISOString().slice(0, 10))
    const [reportExpense, setReportExpense] = useState(null)
    const [expenseCode, setExpenseCode] = useState(null)
    const [allExpenseAccounts, setAllExpenseAccounts] = useState([])
    const [showExpenseModal, setShowExpenseModal] = useState(false)
    const defaultFields = {
        expensesDepartment:'',
        expensesHandler:'',
        expenseCategory:'',
        expensesAmount:'',
        expensesBank:'',
        expensesVendor:'',
        expensesDescription:'',
    }
    const payPoints = [
        'moniepoint1', 'moniepoint2', 
        'moniepoint3', 'moniepoint4', 
        'cash'
    ]
    const [fields, setFields] = useState({...defaultFields})
    const departments = ['Admin']
    const [expensesCategory, setExpensesCategory] = useState([])
    useEffect(()=>{
        storePath('expenses')  
    },[storePath])
    useEffect(()=>{
        const expenseLedger = chartOfAccounts.find((acc)=>{
            return acc.name === 'Expenses'                
        })
        if (expenseLedger){
            setExpenseCode(expenseLedger['g/l code'])
            var allExpenseAccounts = expenseLedger.accounts
            setAllExpenseAccounts(allExpenseAccounts)
            var expensesCategory = allExpenseAccounts.filter((account)=>{
                return ![null, undefined].includes(account.type)
            })
            setExpensesCategory(expensesCategory)
        }
    },[chartOfAccounts])
    useEffect(()=>{
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        const intervalId = setInterval(()=>{
          if (cmp_val){
            getEmployees(cmp_val)
            getExpenses(cmp_val)
          }
        },10000)
        return () => clearInterval(intervalId);
    },[window.localStorage.getItem('sessn-cmp')])
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
        if (curExpense === null || exp.createdAt !== curExpense?.createdAt){
            setCurExpense(exp)
            setFields({...exp})
            setIsView(true)            
        }
    }
    const addExpenses = async ()=>{
        if (fields.expensesAmount && fields.expenseCategory && 
            fields.expensesDepartment && fields.expensesHandler &&
            fields.expensesVendor && fields.expensesBank
        ){
            setExpensesStatus('Posting Expenses...')
            setAlertState('info')
            setAlert('Posting Expenses...')
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
                setAlertState('info')
                setAlert(resps.mess)
                setAlertTimeout(5000)
                setExpensesStatus('Post Expenses')
              }else{
                setExpensesStatus('Post Expenses')
                setExpenses(newExpenses)
                setCurExpense(newExpense)
                setIsView(true)
                setFields({...newExpense})
                setAlertState('success')
                setAlert('Expenses Record Posted Successfully!')
                setAlertTimeout(5000)
                getExpenses(company)
              }
        }else{
            setAlertState('error')
            setAlert('All Fields Are Required! Kindly Fill All.')
            setAlertTimeout(5000)
        }
    }

    const deleteExpenses = async (expense)=>{
        if (deleteCount === expense.createdAt){
            setAlertState('info')
            setAlert('Deleting Expenses...')
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Expenses", 
                update: {createdAt: expense.createdAt}
            }, "removeDoc", server)
            if (resps.err){
                console.log(resps.mess)
                setAlertState('info')
                setAlert(resps.mess)
                setAlertTimeout(5000)
            }else{
                setIsView(false)
                setCurExpense(null)
                setFields({...defaultFields})
                setAlertState('success')
                setAlert('Expenses Deleted Successfully!')
                setAlertTimeout(5000)
                setDeleteCount(0)
                getExpenses(company)
            }        
        }else{
            setDeleteCount(expense.createdAt)
            setTimeout(()=>{
                setDeleteCount(0)
            },12000)
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

    const addExpenseCategory = async (newExpenseAccount) =>{
        setAlertState('info')
        setAlert('Creating New Expense Account...')
        setAlertTimeout(100000)
        const resp = await fetchServer("POST", {
            database: company,
            collection: "ChartOfAccounts",
            prop: [{'name':'Expenses'}, {accounts: [...allExpenseAccounts || [], newExpenseAccount]}]
        }, "updateOneDoc", server)
        if (resp.err){
            setAlertState('error')
            setAlert('Could not create new category. No internet connection!')
            setAlertTimeout(10)
            return
        }else{
            setAlertState('success')
            setAlert('New Expense Account Has Been Added!')
            setTimeout(10)
            return
        }
    }
    const printToPDF = (e) => {        
        const element = e.target.parentElement.parentElement
        const options = {
            margin:       0.1,
            filename:     `EXPENSE DESCRIPTION.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'A4', orientation: 'portrait' }
        };
        html2pdf().set(options).from(element).save();        
    };

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
                    }).map((exp,index)=>{                        
                        const {
                            createdAt,postingDate, 
                            expensesAmount, expensesDepartment,
                            expenseCategory,expensesHandler, expensesVendor,
                            expensesDescription
                        } = exp
                        var handlerName = ''
                        employees.forEach((emp)=>{
                            if (emp.i_d === expensesHandler){
                                handlerName = `${emp.firstName} ${emp.lastName}`
                            }
                        })
                        return(
                            <div className={'dept  desc-relt' + (curExpense?.createdAt===createdAt?' curview':'')} key={index} 
                                onClick={(e)=>{
                                    handleViewClick(exp)
                                }}
                            >
                                <div className='dets sldets'>
                                    {(curExpense?.createdAt === createdAt && curExpense.showDetails) && 
                                        <FaPrint 
                                            className='desc-btn-top'
                                            onClick={(e)=>{printToPDF(e)}}
                                        />
                                    }
                                    {(curExpense?.createdAt === createdAt && curExpense.showDetails) ? 
                                        (<FaAngleUp 
                                            className='desc-btn-bottom'
                                            onClick={()=>{
                                                setCurExpense((curExpense)=>{
                                                    return {...curExpense, showDetails: false}
                                                })
                                            }}
                                        />) 
                                        : (curExpense?.createdAt === createdAt && <FaAngleDown 
                                            className='desc-btn-bottom'
                                            onClick={()=>{
                                                setCurExpense((curExpense)=>{
                                                    return {...curExpense, showDetails: true}
                                                })
                                            }}
                                        />)}
                                    <div>Posting Date: <b>{getDate(postingDate)}</b></div>
                                    <div>Expenses Department: <b>{expensesDepartment}</b></div>                                    
                                    <div>Expenses Category: <b>{expenseCategory}</b></div>                                    
                                    <div>Expenses Amount: <b>{'₦'+(Number(expensesAmount)).toLocaleString()}</b></div>                                    
                                    <div className='deptdesc'>{`Expenses Handled By:`} <b>{`${handlerName}`}</b></div>
                                    {(curExpense?.createdAt === createdAt && curExpense?.showDetails) && <div>
                                        <div>Expenses Vendor: <b>{expensesVendor}</b></div>                                    
                                        <div className='exp-desc'>Description of Items:</div>
                                        <pre className='exp-dets'>{expensesDescription}</pre>
                                    </div>}
                                </div>
                                {(companyRecord.status==='admin') && <div 
                                    className='edit'
                                    name='delete'         
                                    style={{color:'red'}}                           
                                    onClick={()=>{                                        
                                        setAlertState('info')
                                        setAlert('You are about to delete the selected Expense Record. Please Delete again if you are sure!')
                                        setAlertTimeout(5000)                                                                                    
                                        deleteExpenses(exp)
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
                            {companyRecord.status === 'admin' && <div><FaPlus
                                className='add-expense'
                                onClick={()=>{
                                    setShowExpenseModal(true)
                                }}
                            /> Expense Account</div>}
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
                                        <option key={index} value={category.name}>{`${category.name} ${category['g/l code']}`}</option>
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
                        <div className='inpcov'>
                            <div>Expenses Bank</div>
                            <select
                                className='forminp'
                                name='expensesBank'
                                type='text'
                                value={fields.expensesBank}
                                diabled={isView}
                            >
                                <option value={''}>Select Expenses Bank</option>
                                {payPoints.map((payPoint,id)=>{
                                    return <option key={id} value={payPoint}>{payPoint.toUpperCase()}</option>
                                })}
                            </select>
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
            {showExpenseModal && <AddExpenseAccount
                isOpen={showExpenseModal}
                onClose={()=>{
                    setShowExpenseModal(false)
                }}                
                expenseCode={expenseCode}
                addExpenseCategory={addExpenseCategory}
                allExpenseAccounts={allExpenseAccounts}
            />}
        </>
    )
}

export default Expenses

const AddExpenseAccount = ({ 
    isOpen, onClose, expenseCode,
    addExpenseCategory, allExpenseAccounts
}) => {
    const [defaultGLCode, setDefaultGLCode] = useState(Number(expenseCode) + 20)
    const [accountDetails, setAccountDetails] = useState({
        'header-code': expenseCode,
        'sub-header-code': null,
        'g/l code': defaultGLCode,
        'name': '',
        'type': ''
    })

    const subHeaders = allExpenseAccounts.filter((account)=>{
        return account['header-type'] === 'sub-header'
    })

    const accountTypes = [
        'Balance Sheet',
        'Income Statement'
    ]

    useEffect(()=>{
        if (accountDetails['sub-header-code']){
            var allCategoryCodes = allExpenseAccounts.filter((account)=>{
                return Number(account['sub-header-code']) === Number(accountDetails['sub-header-code'])
            })
            var lastCode = allCategoryCodes[allCategoryCodes.length -1]?.['g/l code']
            console.log(lastCode)
            if (lastCode){
                setDefaultGLCode(Number(lastCode) + 10)
                setAccountDetails((accountDetails)=>{
                    return {...accountDetails, ['g/l code']: Number(lastCode)+10}
                })
            }else{
                setDefaultGLCode(Number(expenseCode) + 20)
            }
        }
    },[accountDetails['sub-header-code']])

    const handleChange = (e) => {
        const { name, value } = e.target
        setAccountDetails(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        // Add logic to save new expense account
        addExpenseCategory(accountDetails)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Add New Expense Account</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Sub Header</label>
                        <select 
                            name="sub-header-code"
                            value={accountDetails['sub-header-code']}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Sub Header</option>
                            {subHeaders.map((header, idx) => (
                                <option key={idx} value={header['g/l code']}>{`${header.name} ${header['g/l code']}`}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Account Type</label>
                        <select
                            name="type" 
                            value={accountDetails.type}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Account Type</option>
                            {accountTypes.map((type, idx) => (
                                <option key={idx} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>G/L Code</label>
                        <input
                            type="number"
                            name="g/l code"
                            value={accountDetails['g/l code']}
                            onChange={handleChange}
                            placeholder="Enter G/L code"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Account Name</label>
                        <input
                            type="text"
                            name="name"
                            value={accountDetails.name}
                            onChange={handleChange}
                            placeholder="Enter account name"
                            required
                        />
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose}>Cancel</button>
                        <button type="submit">Add Account</button>
                    </div>
                </form>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 500px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                }

                .form-group {
                    margin-bottom: 15px;
                }

                label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                }

                input, select {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .modal-footer {
                    margin-top: 20px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }

                button {
                    padding: 8px 16px;
                    border-radius: 4px;
                    border: none;
                    cursor: pointer;
                }

                button[type="submit"] {
                    background-color: #4CAF50;
                    color: white;
                }

                button[type="button"] {
                    background-color: #f1f1f1;
                }
            `}</style>
        </div>
    )
}