import './Sales.css'
import { useState, useEffect, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { FaTableCells } from "react-icons/fa6";
import SalesReport from './SalesReport/SalesReport';
import Notify from '../../Resources/Notify/Notify';
import { MdAdd } from "react-icons/md";
import { RxReset } from "react-icons/rx";
import { MdDelete } from "react-icons/md";

const Sales = ()=>{
    const {storePath, 
        fetchServer, 
        server, 
        companyRecord,
        company, 
        employees, setEmployees, getEmployees,
        sales, setSales, getSales, months, 
        getDate, removeComma, 
        alert,alertState,alertTimeout,actionMessage,
        setAlert, setAlertState, setAlertTimeout, setActionMessage
    } = useContext(ContextProvider)

    const payPoints = {
        'moniepoint1':'', 'moniepoint2':'', 
        'moniepoint3':'', 'cash':''
    }
    const salesUnits = {
        'open bar1':{...payPoints}, 'open bar2':{...payPoints}, 
        'kitchen':{...payPoints}, 'vip':{...payPoints}, 
        'accomodation':{...payPoints}
    }
    const [showReport, setShowReport] = useState(false)
    const [reportSales, setReportSales] = useState(null)
    const [isMultiple, setIsMultiple] = useState(false)
    const [saleFrom, setSaleFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
    const [saleTo, setSaleTo] = useState(new Date(Date.now()).toISOString().slice(0, 10))
    const [saleEmployee, setSaleEmployee] = useState('')
    const [addEmployeeId, setAddEmployeeId] = useState('')
    const [recoveryEmployeeId, setRecoveryEmployeeId] = useState('')
    const [recoveryMonth, setRecoveryMonth] = useState(months[new Date(Date.now()).getMonth()])
    const [addTotalSales, setAddTotalSales] = useState('')
    const [deleteCount, setDeleteCount] = useState(0)
    const [salesOpts, setSalesOpts] = useState('sales')
    const [postStatus, setPostStatus] = useState('Post Sales')
    const [recoveryStatus, setRecoveryStatus] = useState('Post Recovery')
    const [postingDate, setPostingDate] = useState('')
    const [curSale, setCurSale] = useState(null)
    const [curSaleDate, setCurSaleDate] = useState(null)
    const defaultFields = {
        employeeId: '',
        totalSales: '',
        cashSales:'',
        bankSales:'',
        debt:'',
        salesPoint:'',
        shortage:'',
        debtRecovered:'',
        ...salesUnits
    }

    const defaultRecoveryFields = {
        recoveryAmount: '',
        recoverySales: '',
        recoveryPoint: '',
        recoveryDate: '',
        recoveryTransferId:''
    }

    const [fields, setFields] = useState([])
    const [recoveryFields, setRecoveryFields] = useState([])
    const [isView, setIsView] = useState(false)

    useEffect(()=>{
        storePath('sales')  
    },[storePath])

    useEffect(()=>{
        if (curSale){
            setPostingDate(curSale.postingDate)
        }else{
            setPostingDate(new Date(Date.now()).toISOString().slice(0, 10))
        }
    },[curSale])
    useEffect(()=>{
        if (companyRecord.status!=='admin'){
            setSaleFrom(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
        }
    },[companyRecord])
    useEffect(()=>{
        if (saleEmployee){
            calculateReportSales()
        }else{
            setReportSales(null)
        }
    },[saleEmployee])
    useEffect(()=>{
        if (reportSales){
            handleViewClick(reportSales)
        }
    },[reportSales])
    const handleFieldChange = ({index, e})=>{
        const name = e.target.getAttribute('name')
        const category = e.target.getAttribute('category')
        const value = e.target.value
        setFields((fields)=>{
            if (category && category!=='cash'){
                var ct = 0
                Object.keys(salesUnits).forEach((salesUnit)=>{
                    var ct1 = 0                    
                    Object.keys(fields[index][salesUnit]).forEach((payPoint)=>{                    
                        if(category!==payPoint && payPoint!=='cash'){                
                            ct1 += Number(fields[index][salesUnit][payPoint])
                        }else{
                            if (name !== salesUnit && payPoint!=='cash') {
                                ct1 += Number(fields[index][salesUnit][payPoint])
                            }
                        }
                    })
                    ct += Number(ct1)
                })
                fields[index] = {
                    ...fields[index], 
                    bankSales: (ct+Number(value))?ct+Number(value):'',
                    [name]:{
                        ...fields[index][name], 
                        [category]:value
                    }
                }
            }else if (category && category === 'cash'){
                var ct = 0
                Object.keys(salesUnits).forEach((salesUnit)=>{
                    var ct1 = 0                    
                    Object.keys(fields[index][salesUnit]).forEach((payPoint)=>{                    
                        if(name !== salesUnit && payPoint === category){                
                            ct1 += Number(fields[index][salesUnit][payPoint])
                        }
                    })
                    ct += Number(ct1)
                })
                fields[index] = {
                    ...fields[index], 
                    cashSales: (ct+Number(value))?ct+Number(value):'',
                    [name]:{
                        ...fields[index][name], 
                        [category]:value
                    }
                }
            }
            else{
                fields[index] = {...fields[index], [name]:value}
            }
            return [...fields]
        })
    }
    
    const handleRecoveryFieldChange = ({index, e})=>{
        const name = e.target.getAttribute('name')
        const value = e.target.value        
        if (name === 'recoverySales' && value){
            const selectedText = e.target.selectedOptions[0].text
            setRecoveryFields((fields)=>{
                fields[index] = {...fields[index], [name]:value, 
                    recoveryAmount:removeComma(selectedText.split('₦')[1]),
                    recoveryMaxAmount:removeComma(selectedText.split('₦')[1])
                }
                return [...fields]
            })
        }else if (name === 'recoveryAmount' && value){
            setRecoveryFields((fields)=>{
                if (value <= fields[index]['recoveryMaxAmount']){
                    fields[index] = {...fields[index], [name]:value}
                }
                return [...fields]
            })
        }else{
            setRecoveryFields((fields)=>{
                fields[index] = {...fields[index], [name]:value}
                return [...fields]
            })
        }  
    }

    const acceptSalesDebt = ()=>{
        setFields((fields)=>{
            fields.forEach((field)=>{
                const netTotal = Number(field.cashSales) + Number(field.bankSales)+ Number(field.debt) + Number(field.shortage)
                const debtDue = Number(field.totalSales) - netTotal 
                if (debtDue){
                    field.debt = Number(field.debt) + debtDue
                }
            })
            return [...fields]
        })
    }

    const addSales = async ()=> { 
        if (postingDate){
            setPostStatus('Posting Sales...')
            var totalCashSales = 0
            var totalDebt = 0      
            var totalShortage = 0 
            var totalBankSales = 0 
            fields.forEach((field)=>{
                totalCashSales += Number(field.cashSales)
                totalDebt += Number(field.debt)
                totalShortage += Number(field.shortage)
                totalBankSales += Number(field.bankSales)
            })
            const newSale = {
                postingDate: postingDate,
                createdAt: new Date().getTime(),
                totalCashSales,
                totalBankSales,
                totalDebt,
                totalShortage,
                record: [...fields]
            }
    
            const newSales = [newSale, ...sales]        
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Sales", 
                update: newSale
            }, "createDoc", server)
            
            if (resps.err){
                console.log(resps.mess)
                setAlertState('info')
                setAlert(resps.mess)
                setAlertTimeout(5000)
                setPostStatus('Post Sales')
            }else{
                setSales(newSales)
                setCurSale(newSale)
                setCurSaleDate(newSale.postingDate)
                setIsView(true)
                setFields([...(newSale.record)])
                getSales(company)
                setAlertState('success')
                setAlert('Sales Posted Successfully!')
                setAlertTimeout(5000)
                setPostStatus('Post Sales')
            }
        }
    }

    const handleViewClick = (sale) =>{
        setCurSale(sale)
        setCurSaleDate(sale.postingDate)
        setSalesOpts('sales')
        setFields([...(sale.record)])
        setIsView(true)
    }

    const deleteSales = async (sale)=>{
        if (deleteCount === sale.createdAt) {
            setAlertState('info')
            setAlert('Deleting...')
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Sales", 
                update: {createdAt: sale.createdAt}
            }, "removeDoc", server)
            if (resps.err){
                console.log(resps.mess)
                setAlertState('info')
                setAlert(resps.mess)
                setAlertTimeout(5000)
            }else{
                setIsView(false)
                setCurSale(null)
                setCurSaleDate(null)
                setFields([])
                setAddEmployeeId('')
                setRecoveryEmployeeId('')            
                setAlertState('success')
                setAlert('Sales Deleted Successfully!')
                setDeleteCount(0)
                setAlertTimeout(5000)
                getSales(company)
            }
        }else{
            setDeleteCount(sale.createdAt)
            setTimeout(()=>{
                setDeleteCount(0)
            },12000)
        }
    }

    const handleSalesOpts = (e)=>{
        const name = e.target.getAttribute('name')
        if (name){
            setSalesOpts(name)
        }
    }

    const postRecovery = async()=>{
        setRecoveryStatus('Posting Recovery ....')
        recoveryFields.forEach( async(field)=>{
            if(recoveryEmployeeId === (field.recoverySales).slice(0,field.recoverySales.indexOf('-'))){
                console.log('updating Employee...')
                var updtEmployee = {}
                employees.forEach((employee)=>{
                    if (employee.i_d === recoveryEmployeeId){
                        var totalDebtRecovered = employee.employeeDebtRecoverd ? employee.employeeDebtRecoverd : 0
                        var employeeRecoveredList = employee.recoveryList !== undefined? employee.recoveryList : []
                        employee.employeeDebtList?.forEach((empDebt,index)=>{
                            if (                                                        
                                months[new Date(empDebt.postingDate).getMonth()] === recoveryMonth &&
                                new Date(empDebt.postingDate).getFullYear() === new Date(Date.now()).getFullYear() &&
                                field.recoverySales === `${recoveryEmployeeId}-${index}`                                                        
                            ){
                                const alreadyRecovered = empDebt.debtRecovered ? empDebt.debtRecovered : 0
                                empDebt.debtRecovered = Number(alreadyRecovered) + Number(field.recoveryAmount)
                                totalDebtRecovered += Number(field.recoveryAmount)
                                const recoveredList = empDebt.recoverdList !== undefined? empDebt.recoverdList: [] 
                                const recoveryDetails ={
                                    recoveryAmount:field.recoveryAmount,
                                    recoveryPoint:field.recoveryPoint,
                                    recoveryDate: field.recoveryDate,
                                    recoveryEmployeeId: recoveryEmployeeId,
                                    recoveryTransferId: field.recoveryTransferId
                                }
                                empDebt.recoverdList = recoveredList.concat(recoveryDetails)
                                employeeRecoveredList = employeeRecoveredList.concat(recoveryDetails)
                            }
                        })
                        employee.emploeeeDebtRecoverd = totalDebtRecovered
                        employee.recoveryList = employeeRecoveredList
                        updtEmployee={...employee}
                    }
                })
                const ftrEmployees = employees.filter((employee)=>{
                    return employee.i_d !== updtEmployee.i_d
                })
                const updatedEmployees = [updtEmployee, ...ftrEmployees]
                const updatedEmployee = {...updtEmployee}  
                delete updatedEmployee._id
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Employees", 
                    prop: [{i_d: updtEmployee.i_d}, updatedEmployee]
                }, "updateOneDoc", server)
                  
                if (resps.err){
                    console.log(resps.mess)
                    setAlertState('info')
                    setAlert(resps.mess)
                    setAlertTimeout(5000)
                    setRecoveryStatus('Post Recovery')
                }else{                
                    setEmployees(updatedEmployees)
                    getEmployees(company)
                    setRecoveryFields([])
                    setRecoveryStatus('Post Recovery')
                    setRecoveryEmployeeId('')
                }
            }else{
                var updtSale = {}
                sales.forEach((sale,index)=>{
                    if (                                                        
                        months[new Date(sale.postingDate).getMonth()] === recoveryMonth &&
                        new Date(sale.postingDate).getFullYear() === new Date(Date.now()).getFullYear() &&
                        Number(field.recoverySales) === sale.createdAt                                               
                    ){
                        var totalDebtRecovered = sale.totalDebtRecovered ? sale.totalDebtRecovered : 0
                        var saleRecoveredList = sale.recoveryList !== undefined? sale.recoveryList : [] 
                        sale.record.forEach((record, index)=>{
                            if (record.employeeId === recoveryEmployeeId && record.debt){
                                const alreadyRecovered = record.debtRecovered ? record.debtRecovered : 0
                                record.debtRecovered = Number(alreadyRecovered) + Number(field.recoveryAmount)
                                totalDebtRecovered += Number(field.recoveryAmount)
                                const recoveredList = record.recoverdList !== undefined? record.recoverdList: [] 
                                const recoveryDetails ={
                                    recoveryAmount:field.recoveryAmount,
                                    recoveryPoint:field.recoveryPoint,
                                    recoveryDate: field.recoveryDate,
                                    recoveryEmployeeId: recoveryEmployeeId,
                                    recoveryTransferId: field.recoveryTransferId
                                }
                                record.recoverdList = recoveredList.concat(recoveryDetails)
                                saleRecoveredList = saleRecoveredList.concat(recoveryDetails)
                                    
                            }
                        })                                                          
                        sale.totalDebtRecovered = totalDebtRecovered
                        sale.recoveryList = saleRecoveredList
                        updtSale={...sale}
                    }
                })
                const ftrSales = sales.filter((sales)=>{
                    return sales.createdAt !== updtSale.createdAt
                })
                const updatedSales = [updtSale, ...ftrSales]
                const updatedSale = {...updtSale}  
                delete updatedSale._id
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Sales", 
                    prop: [{createdAt: updtSale.createdAt}, updatedSale]
                }, "updateOneDoc", server)
                  
                if (resps.err){
                    console.log(resps.mess)
                    setAlertState('info')
                    setAlert(resps.mess)
                    setAlertTimeout(5000)
                    setRecoveryStatus('Post Recovery')
                }else{                
                    setSales(updatedSales)
                    getSales(company)
                    setRecoveryFields([])
                    setRecoveryStatus('Post Recovery')
                    setRecoveryEmployeeId('')
                }                            
            }
            if (field.recoveryPoint === 'Employee'){
                const targetEmployee = employees.filter((emp)=>{
                    return emp.i_d === field.recoveryTransferId
                })
                const employeeDebt = targetEmployee[0]['employeeDebt'] ? targetEmployee[0]['employeeDebt'] : 0
                var employeeDebtList = targetEmployee[0]['employeeDebtList']!==undefined?targetEmployee[0]['employeeDebtList'] : [] 
                var newEmployeeDebtList = employeeDebtList.concat({
                    transferedFrom: recoveryEmployeeId,            
                    postingDate: field.recoveryDate,
                    debtAmount: Number(field.recoveryAmount),
                })
                const updatedEmployee = {
                    ...targetEmployee[0],
                    employeeDebt: Number(employeeDebt)+Number(field.recoveryAmount),
                    employeeDebtList: newEmployeeDebtList
                }
                const filteredEmp = employees.filter((emp)=>{
                    return emp.i_d!==updatedEmployee.i_d
                })
                const updatedEmployees = [...filteredEmp, updatedEmployee]
                delete updatedEmployee._id
                const resps1 = await fetchServer("POST", {
                    database: company,
                    collection: "Employees", 
                    prop: [{i_d: updatedEmployee.i_d}, updatedEmployee]
                }, "updateOneDoc", server)
                if (resps1.err){
                    console.log(resps1.mess)
                }else{
                    setEmployees(updatedEmployees)
                    getEmployees(company)
                }
            }
        })
        
        
    }

    const calculateReportSales = ()=>{
        var filteredReportSales = {                                                                
            totalCashSales:0,
            totalBankSales:0,
            totalDebt:0,
            totalShortage:0,
            totalDebtRecovered:0,
            postingDate:saleFrom,
            createdAt: Date.now(),
            record: []
        }
        sales.filter((ftrsale)=>{
            const slPostingDate = new Date(ftrsale.postingDate).getTime()
            const fromDate = new Date(saleFrom).getTime()
            const toDate = new Date(saleTo).getTime()
            if ( slPostingDate>= fromDate && slPostingDate<=toDate
            ){
                return ftrsale
            }
        }).forEach((sale)=>{        
            if (!saleEmployee){
                filteredReportSales['totalCashSales'] += sale['totalCashSales'] ? sale['totalCashSales'] : 0
                filteredReportSales['totalBankSales'] += sale['totalBankSales'] ? sale['totalBankSales'] : 0
                filteredReportSales['totalDebt'] += sale['totalDebt'] ? sale['totalDebt'] : 0
                filteredReportSales['totalShortage'] += sale['totalShortage'] ? sale['totalShortage'] : 0
                filteredReportSales['totalDebtRecovered'] += sale['totalDebtRecovered'] ? sale['totalDebtRecovered'] : 0
                filteredReportSales['record'] = filteredReportSales['record'].concat(sale['record'])
            }else{                                    
                var totalBankSales = 0
                var totalCashSales = 0
                var totalDebt = 0
                var totalShortage = 0
                var totalDebtRecovered = 0
                sale['record'].forEach((record)=>{
                    if (record.employeeId === saleEmployee){
                        record['postingDate'] = sale.postingDate
                        totalBankSales += Number(record.bankSales)
                        totalCashSales += Number(record.cashSales)
                        totalDebt += Number(record.debt)
                        totalShortage += Number(record.shortage)
                        totalDebtRecovered += record.debtRecovered? Number(record.debtRecovered) : 0
                        filteredReportSales['record'] = filteredReportSales['record'].concat(record)
                    }
                })
                // console.log(saleRecord)
                filteredReportSales['totalCashSales'] += totalCashSales
                filteredReportSales['totalBankSales'] += totalBankSales
                filteredReportSales['totalDebt'] += totalDebt
                filteredReportSales['totalShortage'] += totalShortage
                filteredReportSales['totalDebtRecovered'] += totalDebtRecovered
                
            }                        
        })
        setReportSales(filteredReportSales)
        setIsMultiple(true)        
    }
    return (
        <>
            <div className='sales'>         
                {showReport && <SalesReport
                    reportSales = {reportSales}
                    multiple={isMultiple}
                    setShowReport={(value)=>{
                        setShowReport(value)
                        if (!saleEmployee){
                            setReportSales(null)
                        }
                    }}              
                    fromDate = {saleFrom}
                    toDate = {saleTo}      
                    // selectedMonth={selectedMonth}
                    // selectedYear={selectedYear}
                />}    
                {actionMessage && <Notify        
                    notifyMessage={alert}
                    notifyState = {alertState}
                    timeout = {alertTimeout}
                    actionMessage={actionMessage}
                    action={()=>{
                        setActionMessage('Calculating...')
                        acceptSalesDebt()
                    }}
                />}   
                <div className='emplist saleslist'>    
                    {companyRecord.status==='admin' && <FaTableCells                         
                        className='allslrepicon'
                        onClick={()=>{
                            calculateReportSales()
                            if (saleTo && saleFrom){                                
                                setShowReport(true)
                            }
                        }}
                    />}
                    <div className='payeeinpcov'>
                        <div className='inpcov formpad'>
                            <div>Date From</div>
                            <input 
                                className='forminp prinps'
                                name='salesfrom'
                                type='date'
                                placeholder='From'
                                value={saleFrom}
                                disabled={companyRecord.status!=='admin'}
                                onChange={(e)=>{
                                    setSaleFrom(e.target.value)
                                    setSaleEmployee('')
                                }}
                            />
                        </div>
                        <div className='inpcov formpad'>
                            <div>Date To</div>
                            <input 
                                className='forminp prinps'
                                name='salesto'
                                type='date'
                                placeholder='To'
                                value={saleTo}
                                disabled={companyRecord.status!=='admin'}
                                onChange={(e)=>{
                                    setSaleTo(e.target.value)
                                    setSaleEmployee('')
                                }}
                            />
                        </div>
                    </div>                                                       
                    {companyRecord.status==='admin' && <div className='inpcov fltinpcov'>
                        <select 
                            className='forminp'
                            name='employeeId'
                            type='text'
                            value={saleEmployee}
                            onChange={(e)=>{
                                setSaleEmployee(e.target.value)                                
                            }}
                        >
                            <option value=''>All Sales Persons</option>
                            {employees.filter((fltemp)=>{
                                if (fltemp.dismissalDate){
                                    if (new Date(fltemp.dismissalDate).getMonth() >= new Date(saleFrom).getMonth()){
                                        return fltemp
                                    }
                                }else{
                                    return fltemp
                                }
                            }).map((employee)=>{
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
                    </div>}
                    {(reportSales? [reportSales] : sales).filter((ftrsale)=>{
                        const slCreatedAt = new Date(ftrsale.postingDate).getTime()
                        const fromDate = new Date(saleFrom).getTime()
                        const toDate = new Date(saleTo).getTime()

                        if ( slCreatedAt>= fromDate && slCreatedAt<=toDate
                        ){
                            return ftrsale
                        }
                    }).map((sale, index)=>{
                        const {createdAt, postingDate, totalCashSales, totalDebt, record, 
                            totalShortage, totalDebtRecovered, totalBankSales, recoveryList 
                        } = sale 
                        // console.log(recoveryList)
                        return(
                            <div className={'dept' + (curSale?.createdAt===createdAt?' curview':'')} key={index} 
                                onClick={(e)=>{
                                    handleViewClick(sale)
                                }}
                            >
                                <div className='dets sldets'>
                                    <div>Posting Date: <b>{getDate(postingDate)}</b></div>
                                    <div>Total Sales: <b>{'₦'+(Number(totalCashSales)+Number(totalBankSales)+Number(totalDebt)+Number(totalShortage)).toLocaleString()}</b></div>
                                    <div>Bank: <b>{'₦'+totalBankSales?.toLocaleString()}</b></div>
                                    <div>Cash: <b>{'₦'+totalCashSales.toLocaleString()}</b></div>
                                    <div>Debts: <b>{'₦'+(Number(totalDebt)+Number(totalShortage)-Number(totalDebtRecovered?totalDebtRecovered:0)).toLocaleString()}</b></div>
                                    <div>Recovered: <b>{'₦'+(Number(totalDebtRecovered?totalDebtRecovered:0)).toLocaleString()}</b></div>
                                    {/* <div>Shortages: <b>{'₦'+totalShortage.toLocaleString()}</b></div> */}
                                    <div className='deptdesc'>{`Number of Sales Made:`} <b>{`${record.length}`}</b></div>
                                </div>
                                {(companyRecord.status==='admin' && !saleEmployee) && <div 
                                    className='edit'
                                    name='delete'         
                                    style={{color:'red'}}                           
                                    onClick={()=>{                                        
                                        setAlertState('info')
                                        setAlert('You are about to delete the selected Sales. Please Delete again if you are sure!')
                                        setAlertTimeout(5000)
                                                                                    
                                        deleteSales(sale)
                                    }}
                                >
                                    Delete
                                </div>}
                            </div>
                        )
                  })}
                </div>
                <div className='empview salesview'>
                    {isView && salesOpts==='sales' && 
                        companyRecord.status==='admin' && 
                        <FaTableCells                         
                            className='slrepicon'
                            onClick={()=>{
                                setReportSales(curSale)
                                setIsMultiple(false)
                                setShowReport(true)
                                
                            }}
                        />
                    }
                    {salesOpts === 'sales' && ( (fields.length && !isView) ? 
                        <RxReset
                            className='slsadd'
                            onClick={()=>{
                                setIsView(false)
                                setFields([])
                                setAddEmployeeId('')
                                setCurSale(null)
                            }}
                        /> : 
                        <MdAdd 
                            className='add slsadd'
                            onClick={()=>{
                                setIsView(false)
                                setFields([])
                                setAddEmployeeId('')
                                setCurSale(null)
                            }}
                        />)
                    }
                    <div className='formtitle padtitle'>
                        <div className={'frmttle'}>
                            {`DAILY SALES`}
                        </div> 
                        {/* <div className='yesbtn popbtn delbtn'
                                onClick={()=>{}}
                        >Delete</div> */}
                    </div>
                    
                    <div className='salesfm'>
                        {<div className='salesopts' onClick={handleSalesOpts}>
                            <div name='sales' className={salesOpts==='sales' ? 'slopts': ''}>Sales</div>
                            <div name='rentals' className={salesOpts==='rentals' ? 'slopts': ''}>Rentals</div>
                            {<div name='recovery' className={salesOpts==='recovery' ? 'slopts': ''}>Debt Recovery</div>}
                        </div>}
                        {salesOpts==='sales' && (!isView && <div className='addnewsales'>
                            <div className='inpcov'>
                                <div>Employee ID</div>
                                <select 
                                    className='forminp'
                                    name='employeeId'
                                    type='text'
                                    value={addEmployeeId}                                    
                                    onChange={(e)=>{
                                        setAddEmployeeId(e.target.value)
                                    }}
                                >
                                    <option value=''>Select Sales Person</option>
                                    {employees.filter((fltemp)=>{
                                        var ct = 0
                                        fields.forEach((field)=>{
                                            if (fltemp.i_d === field.employeeId){
                                                ct++
                                                if (['vip','accomodation'].includes(field.salesPoint)){
                                                    ct--
                                                }
                                            }
                                        })
                                        if (!ct){
                                            if (fltemp.dismissalDate){
                                                if (new Date(fltemp.dismissalDate).getMonth() >= new Date(saleFrom).getMonth()){
                                                    return fltemp
                                                }
                                            }else{
                                                return fltemp
                                            }
                                        }
                                    }).map((employee)=>{
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
                                <div>Total Sales</div>
                                <input 
                                    className='forminp'
                                    name='totalSales'
                                    type='number'
                                    placeholder='Total Sales'
                                    value={addTotalSales}
                                    onChange={(e)=>{
                                        setAddTotalSales(e.target.value)
                                    }}
                                />
                            </div>
                            <div className='addempsales'
                                style={{
                                    cursor:(addEmployeeId&&addTotalSales)?'pointer':'not-allowed'
                                }}
                                onClick={()=>{
                                    if (addEmployeeId && addTotalSales){
                                        setFields((fields)=>{
                                            return [{...defaultFields, employeeId:addEmployeeId, totalSales:addTotalSales},...fields]
                                        })
                                        setAddEmployeeId('')
                                        setAddTotalSales('')
                                    }
                                }}
                            >
                                Add Employee Sales
                            </div>                                                
                        </div>)} 
                        {salesOpts === 'recovery' && <div className='addnewrecovery'>
                            <div className='inpcov'>
                                <div>Employee ID</div>
                                <select 
                                    className='forminp'
                                    name='employeeId'
                                    type='text'
                                    value={recoveryEmployeeId}
                                    onChange={(e)=>{
                                        setRecoveryEmployeeId(e.target.value)
                                        setRecoveryFields([])
                                    }}
                                >
                                    <option value=''>Select Sales Person</option>
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
                            
                            <div className='addempsales'
                                style={{
                                    cursor:recoveryEmployeeId?'pointer':'not-allowed'
                                }}
                                onClick={()=>{
                                    if (recoveryEmployeeId){
                                        setRecoveryFields((fields)=>{
                                            return [...fields, {...defaultRecoveryFields}]
                                        })                                       
                                    }
                                }}
                            >
                                Add Recovery Amount
                            </div>
                        </div>}
                        {
                            salesOpts==='recovery' && recoveryFields.map((field, index)=>{
                                return (
                                    <div className='recoveryblk' key={index}>
                                        <MdDelete 
                                            className='recoverydelete'
                                            onClick={()=>{
                                                setRecoveryFields((fields)=>{
                                                    const updfields = fields.filter((ftrfield)=>{
                                                        return ftrfield!== field
                                                    })
                                                    return [...updfields]
                                                })
                                            }}
                                        />                                        
                                        <div className='inpcov'>
                                            <div>Select Recovery Debts</div>
                                            <select 
                                                className='forminp'
                                                name='recoverySales'
                                                type='text'
                                                value={field.recoverySales}
                                                onChange={(e)=>{
                                                    handleRecoveryFieldChange({index, e})
                                                }}
                                            >
                                                <option value=''>Select Recovery Debts</option>
                                                {sales.map((sale)=>{
                                                    if (                                                        
                                                        months[new Date(sale.postingDate).getMonth()] === recoveryMonth &&
                                                        new Date(sale.postingDate).getFullYear() === new Date(Date.now()).getFullYear()                                                        
                                                    ){
                                                        return (
                                                            sale.record.map((record,index)=>{
                                                                if (record.employeeId === recoveryEmployeeId && (Number(record.debt)+Number(record.shortage) - Number(record.debtRecovered)) > 0){
                                                                    return (
                                                                        <option key={index} value={sale.createdAt}>{`${sale.postingDate} - ${Number(record.debtRecovered) > 0 ? 'Remaining Debt': 'Debt' }: ${'₦'+ (Number(record.debt)+Number(record.shortage) - Number(record.debtRecovered)).toLocaleString()}`}</option>
                                                                    )
                                                                    
                                                                }
                                                            })                                                          
                                                        )
                                                    }
                                                })}
                                                {employees.map((employee)=>{
                                                    if (employee.i_d === recoveryEmployeeId){
                                                        return (
                                                            employee.employeeDebtList?.map((empDebt,index)=>{
                                                                if (                                                        
                                                                    months[new Date(empDebt.postingDate).getMonth()] === recoveryMonth &&
                                                                    new Date(empDebt.postingDate).getFullYear() === new Date(Date.now()).getFullYear()                                                        
                                                                ){
                                                                    return (
                                                                        <option key={index} value={`${recoveryEmployeeId}-${index}`}>{`${empDebt.postingDate} - ${Number(empDebt.debtRecovered) > 0 ? 'Remaining Debt': 'Debt' }: ${'₦'+ (Number(empDebt.debtAmount) - Number(empDebt.debtRecovered?empDebt.debtRecovered:0)).toLocaleString()}`}</option>                                                                                                                                 
                                                                    )
                                                                }
                                                            })
                                                        )
                                                    }
                                                })}
                                            </select>
                                        </div>
                                        <div className='inpcov'>
                                            <div>Recovery Amount</div>
                                            <input 
                                                className='forminp'
                                                // style={{pointer: 'not-allowed'}}
                                                name='recoveryAmount'
                                                type='number'
                                                placeholder='Recovery Amount'
                                                value={field.recoveryAmount}
                                                disabled={field.recoverySales?false:true}
                                                onChange={(e)=>{
                                                    handleRecoveryFieldChange({index, e})
                                                }}
                                            />
                                        </div>
                                        <div className='inpcov'>
                                            <div>Recovery Point</div>
                                            <select 
                                                className='forminp'
                                                name='recoveryPoint'
                                                type='text'
                                                value={field.recoveryPont}
                                                onChange={(e)=>{
                                                    handleRecoveryFieldChange({index, e})
                                                }}
                                            >
                                                <option value=''>Select Recovery Point</option>
                                                {Object.keys(payPoints).map((paypoint,index)=>{
                                                    return (
                                                        <option key={index} value={paypoint}>{`${paypoint.toUpperCase()}`}</option>
                                                    )
                                                })}
                                                <option value='Employee'>EMPLOYEE</option>
                                            </select>
                                        </div>
                                        {field.recoveryPoint === 'Employee' &&
                                            <div className='inpcov'>
                                                <div>Transfer To ID</div>
                                                <select 
                                                    className='forminp'
                                                    name='recoveryTransferId'
                                                    type='text'
                                                    value={field.recoveryTransferId}
                                                    onChange={(e)=>{
                                                        handleRecoveryFieldChange({index, e})
                                                    }}
                                                >
                                                    <option value=''>Select Transfer ID</option>
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
                                        }
                                        <div className='inpcov'>
                                            <div>Recovery Date</div>
                                            <input 
                                                className='forminp'
                                                name='recoveryDate'
                                                type='date'
                                                placeholder='Recovery Date'
                                                value={field.recoveryDate}
                                                onChange={(e)=>{
                                                    handleRecoveryFieldChange({index, e})
                                                }}
                                            />
                                        </div>
                                    </div>
                                )
                            })
                        }
                        {salesOpts==='sales' && fields.map((field, index)=>{
                            const netTotal = Number(field.cashSales) + Number(field.bankSales)+ Number(field.debt) + Number(field.shortage)
                            // console.log(index)
                            return (
                                <div key={index} className='empsalesblk'>
                                    <div className='pdsalesview'>
                                        {`Pending Sales out of ₦${Number(field.totalSales).toLocaleString()}:`} <b> {'₦'+(Number(field.totalSales) - netTotal).toLocaleString()}</b> <b>{` ${field.postingDate? '('+getDate(field.postingDate)+')' : ''}`}</b>
                                    </div>
                                    {!isView && <MdDelete 
                                        className='salesdelete'
                                        onClick={()=>{
                                            setFields((fields)=>{
                                                const updfields = fields.filter((ftrfield)=>{
                                                    return ftrfield!== field
                                                })
                                                return [...updfields]
                                            })
                                        }}
                                    />}
                                    <div className='empsalesttl'>
                                        {employees.filter((employee)=>{
                                            return employee.i_d === field.employeeId
                                        }).map((emp, idt)=>{
                                            return (
                                                <div key={idt}>
                                                    {`(${emp.i_d}) ${emp.firstName.toUpperCase()} ${emp.lastName.toUpperCase()} - ${emp.position}`}
                                                </div>
                                            )
                                        })}
                                    </div>
                                    {<div className='basic'>
                                        <div className='inpcov'>
                                            <div>All Sales</div>
                                            <input 
                                                className='forminp'
                                                style={{cursor: 'not-allowed'}}
                                                name='allSales'
                                                type='number'
                                                placeholder='All Sales'
                                                value={field.cashSales + field.bankSales}
                                                disabled={true}
                                                onChange={(e)=>{
                                                    handleFieldChange({index, e})
                                                }}
                                            />
                                        </div>
                                        <div className='inpcov'>
                                            <div>Debt</div>
                                            <input 
                                                className='forminp'
                                                name='debt'
                                                type='number'
                                                placeholder='Debt'
                                                value={field.debt}
                                                disabled={isView}
                                                onChange={(e)=>{
                                                    handleFieldChange({index, e})
                                                }}
                                            />
                                        </div>
                                        <div className='inpcov'>
                                            <div>Sales Point</div>
                                            <select 
                                                className='forminp'
                                                name='salesPoint'
                                                type='text'
                                                placeholder='Sales Point'
                                                value={field.salesPoint}
                                                disabled={isView || field.salesPoint}
                                                onChange={(e)=>{
                                                    handleFieldChange({index, e})
                                                }}
                                            >
                                                <option value=''>Select Sales Point</option>
                                                {Object.keys(salesUnits).filter((fltslunit)=>{
                                                   
                                                    return fltslunit
                                                }).map((saleUnit, index)=>{
                                                    
                                                    return (
                                                        <option key={index} value={saleUnit}>{saleUnit.toUpperCase()}</option>
                                                    )
                                                })}
                                            </select>
                                        </div>
                                        <div className='inpcov'>
                                            <div>Shortage</div>
                                            <input 
                                                className='forminp'
                                                name='shortage'
                                                type='number'
                                                placeholder='Shortage'
                                                value={field.shortage}
                                                disabled={isView}
                                                onChange={(e)=>{
                                                    handleFieldChange({index, e})
                                                }}
                                            />
                                        </div>
                                        <div className='inpcov'>
                                            <div>Debt Recovered</div>
                                            <input 
                                                className='forminp'
                                                style={{cursor: 'not-allowed'}}
                                                name='debtRecovered'
                                                type='number'
                                                placeholder='Debt Recovered'
                                                value={field.debtRecovered}
                                                disabled={true}
                                                onChange={(e)=>{
                                                    handleFieldChange({index, e})
                                                }}
                                            />
                                        </div>
                                        {field.recoverdList !==undefined && <div 
                                            onClick={()=>{
                                                if (!field.viewHistory){
                                                    field.viewHistory = true
                                                }else{
                                                    field.viewHistory = false
                                                }
                                            }}
                                            className='addempsales'
                                        >{field.viewHistory?` Unview History`:'View History'}</div>}
                                        {field.viewHistory && <div>
                                            {field.recoverdList.map((reclist, index)=>{
                                                const {recoveryAmount, recoveryPoint, recoveryDate} = reclist
                                                return <div key={index} className='slvwrecovery'>
                                                    <div>Date: <b>{` ${recoveryDate}\t`}</b></div>
                                                    <div>Amount: <b>{` ${'₦'+Number(recoveryAmount).toLocaleString()}`}</b></div>
                                                    <div>Paid to: <b>{` ${recoveryPoint.toUpperCase()}`}</b></div>                                                         
                                                </div>
                                            })}
                                        </div>}
                                        {Object.keys(salesUnits).map((salesUnit, id)=>{                                            
                                            if (salesUnit === field.salesPoint){
                                                return(
                                                    <SalesEntry
                                                        key={id}                                                   
                                                        handleFieldChange={handleFieldChange}
                                                        salesUnits={salesUnits}
                                                        salesUnit={salesUnit}
                                                        field={field}    
                                                        isView={isView}                                                
                                                        index={index}
                                                    />
                                                )
                                            }
                                        })}
                                        
                                    </div>}                                    
                                </div>
                            )
                        })}
                        
                    </div>
                    {(!isView || salesOpts === 'recovery') && <div className='confirm'>     
                        {salesOpts === 'sales' ? <div className='inpcov salesinpcov'>
                            <input 
                                className='forminp'
                                name='postingDate'
                                type='date'
                                placeholder='Posting Date'
                                value={postingDate}
                                disabled={isView}
                                onChange={(e)=>{
                                    setPostingDate(e.target.value)
                                }}
                            />
                        </div> : <div className='inpcov salesinpcov'>
                            <select 
                                className='forminp'
                                name='recoveryMonth'
                                type='text'
                                value={recoveryMonth}
                                onChange={(e)=>{
                                    setRecoveryMonth(e.target.value)
                                }}
                            >
                                <option value=''>Select Recovery Month</option>
                                {months.map((month,index)=>{
                                    return (
                                        <option key={index}>{month}</option>
                                    )
                                })}
                            </select>
                        </div> }                 
                        {salesOpts === 'sales' && <div className='yesbtn salesyesbtn'
                            style={{
                                cursor:fields.length?'pointer':'not-allowed'
                            }}
                            onClick={()=>{
                                if (fields.length){
                                    var rt = 0
                                    var ct = 0
                                    var wt = 0
                                    fields.forEach((field)=>{
                                        const enteredSales = Number(field.cashSales) + Number(field.bankSales) + 
                                        Number(field.debt) + Number(field.shortage)
                                        if (enteredSales === Number(field.totalSales)){
                                            rt++
                                            if (rt===fields.length){
                                                addSales()                                
                                            }
                                        }else{
                                            if (enteredSales < Number(field.totalSales)){
                                                ct++
                                            }else if (enteredSales > Number(field.totalSales)){
                                                wt++
                                            }
                                        }
                                    })
                                    if (wt){
                                        setActionMessage('')
                                        setAlertState('error')
                                        setAlert('Negative difference(s) detected in the employee sales you want to post. Please Make sure your entries match with the total sales before posting')
                                        setAlertTimeout(5000)
                                    }else if (ct){
                                        setAlertState('info')
                                        setActionMessage('Accept')                                        
                                        setAlert('Positive Diffrence(s) Detected. Would you like to accept this diffrences as Debt?')
                                        setAlertTimeout(15000)
                                    }
                                }
                            }}
                        >{postStatus}</div>} 
                        {salesOpts === 'recovery' && <div className='yesbtn salesyesbtn'
                            style={{
                                cursor:recoveryFields.length?'pointer':'not-allowed'
                            }}
                            onClick={()=>{
                                if (recoveryFields.length){
                                    postRecovery()
                                }
                            }}
                        >{recoveryStatus}</div>
                        }
                    </div>}
                </div>
            </div>
        </>
    )
}

const SalesEntry = ({salesUnits, salesUnit, field, index, handleFieldChange, isView})=> {
    const [open, setOpen] = useState(false)
    const [salesAmount, setSalesAmount] = useState(0)
    useEffect(()=>{
        var sum = 0
        Object.keys(field[salesUnit]).forEach((payPoint)=>{
            sum += Number(field[salesUnit][payPoint])
        })
        setSalesAmount(sum)
    },[field[salesUnit]])
    return (
        <div className='salesunit'>
            <div className='salesunittag'>
                <div>
                    {salesUnit.toUpperCase()}
                </div>
                <div><b>Sales: </b>{`${salesAmount.toLocaleString()}`}</div>
                {open ?
                    <FaChevronUp 
                        className='viewsales'
                        onClick={()=>{
                            setOpen(!open)
                        }}
                    />
                :  <FaChevronDown 
                        className='viewsales'
                        onClick={()=>{
                            setOpen(!open)
                        }}
                    />}
            </div>
            {open && Object.keys(salesUnits[salesUnit]).map((payPoint, id)=>{
                return (
                    <div className='inpcov' key={id}>
                        <div>{payPoint.toUpperCase()}</div>
                        <input 
                            className='forminp'
                            name={salesUnit}
                            category={payPoint}
                            type='number'
                            placeholder={payPoint}
                            value={field[salesUnit][payPoint]}
                            disabled={isView}
                            onChange={(e)=>{
                                handleFieldChange({index,e})
                            }}
                        />
                    </div>
                )                
            })}
        </div>
    )
}

export default Sales