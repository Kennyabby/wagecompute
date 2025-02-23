import './Sales.css'
import { useState, useEffect, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { FaChevronDown, FaChevronUp, FaReceipt } from "react-icons/fa";
import { FaTableCells } from "react-icons/fa6";
import SalesReport from './SalesReport/SalesReport';
import RentalReceipt from './RentalReceipt/RentalReceipt';
import DebtReport from './DebtReport/DebtReport';
import Notify from '../../Resources/Notify/Notify';
import { MdAdd } from "react-icons/md";
import { RxReset } from "react-icons/rx";
import { MdDelete } from "react-icons/md";

const Sales = ()=>{
    const {storePath, 
        fetchServer, 
        server, 
        companyRecord, 
        company, recoveryVal, 
        employees, setEmployees, getEmployees, 
        sales, setSales, getSales, months, 
        accommodations, getAccommodations,
        rentals, setRentals, getRentals, 
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

    const rentalSpaces = ['Suya Space', 'Shisha Space', 'Snooker Space', 'Shawarma Space']
        
    const [showReport, setShowReport] = useState(false)
    const [showDebtReport, setShowDebtReport] = useState(false)
    const [showReceipt, setShowReceipt] = useState(false)
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
    const [salesOpts1, setSalesOpts1] = useState('sales')
    const [postStatus, setPostStatus] = useState('Post Sales')
    const [rentalsStatus, setRentalsStatus] = useState('Post Rentals')
    const [recoveryStatus, setRecoveryStatus] = useState('Post Recovery')
    const [postingDate, setPostingDate] = useState('')
    const [curSale, setCurSale] = useState(null)
    const [curRent, setCurRent] = useState(null)
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
        recoveryReceipt: '',
        recoverySales: '',
        recoveryAmount: '',
        recoveryPoint: '',
        recoveryDate: '',
        recoveryTransferId:''
    }

    const defaultRentalFields = {
        paymentDate: new Date(Date.now()).toISOString().slice(0, 10),
        receivedFrom: '',
        rentalAmount: '',
        rentalSpace: '',
        paymentMonth: months[new Date(Date.now()).getMonth() - 1],
        payPoint: '',
        amountPaid: '',
        rentalDebt: 0,
        expectedPayment: '',
        paymentAmount: '',
        balanceRemaining: 0
    }
    const [accommodationRecords, setAccommodationRecords] = useState([])
    const [fields, setFields] = useState([])
    const [recoveryFields, setRecoveryFields] = useState([])
    const [rentalFields, setRentalFields] = useState({
        ...defaultRentalFields
    })
    const [isView, setIsView] = useState(false)

    useEffect(()=>{
        storePath('sales')  
    },[storePath])

    useEffect(()=>{
        var accommodationRecord = []
        const postingDate1 = postingDate
        var ct=0
        sales.forEach((sale)=>{
            if (getDate(sale.postingDate) === getDate(postingDate1)){
                ct++
            }
            if(ct){
                return
            }
        })
        if (!isView && !saleEmployee && !ct){
            var accommodationEmployees = []
            accommodations.forEach((accommodation)=>{
                const employeeId = accommodation.employeeId
                if (!accommodationEmployees.includes(employeeId)){
                    accommodationEmployees = accommodationEmployees.concat(employeeId)
                }
            })
            accommodationEmployees.forEach((employeeId)=>{
                const saleRecord = {}
                saleRecord.isAccommodation = true
                var totalAccommodationAmount = 0
                var totalPaymentAmount = 0
                var totalCashSales = 0
                var totalBankSales = 0
                const allPayPoints = {...payPoints}
                var postingDates=[]
                accommodations.forEach((accommodation)=>{                
                    if (employeeId === accommodation.employeeId){
                        const {postingDate, payPoint, accommodationAmount, paymentAmount} = accommodation
                        if (!postingDates.includes(getDate(postingDate)) && postingDate1 === postingDate){
                            postingDates = postingDate.concat(getDate(postingDate))
                        }
                        if (postingDate1 === postingDate){                        
                            totalAccommodationAmount += Number(accommodationAmount)
                            totalPaymentAmount += Number(paymentAmount)
                            if (payPoint){
                                allPayPoints[payPoint] = Number(allPayPoints[payPoint]) + Number(paymentAmount)
                            }
                            totalCashSales += payPoint === 'cash' ? Number(paymentAmount) : 0                  
                            totalBankSales += payPoint !== 'cash' ? Number(paymentAmount) : 0                  
                        }
                    }
                })
                if (postingDates.length){
                    const salesUnits1 = {...salesUnits}
                    salesUnits1['accomodation'] = {...allPayPoints}
                    saleRecord.employeeId = employeeId
                    saleRecord.totalSales = totalAccommodationAmount
                    saleRecord.cashSales = totalCashSales
                    saleRecord.bankSales = totalBankSales
                    saleRecord.debt = Number(totalAccommodationAmount) - Number(totalPaymentAmount)
                    saleRecord.shortage = ''
                    saleRecord.debtRecovered = ''
                    saleRecord.salesPoint = 'accomodation'
                    Object.keys(salesUnits1).forEach((saleUnit)=>{
                        saleRecord[saleUnit] = salesUnits1[saleUnit]
                    })
                    accommodationRecord = accommodationRecord.concat(saleRecord)
                }
            })
        }
        setAccommodationRecords(accommodationRecord)
    },[accommodations, postingDate, isView, saleEmployee])    
    useEffect(()=>{
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        const intervalId = setInterval(()=>{
            if (cmp_val){
                getEmployees(cmp_val)
                getSales(cmp_val)
                getRentals(cmp_val)
                getAccommodations(cmp_val)
            }
        },10000)
        return () => clearInterval(intervalId);
    },[window.localStorage.getItem('sessn-cmp')])
    useEffect(()=>{
        if (!recoveryVal){
            setSalesOpts('sales')
        }
    },[recoveryVal])
    useEffect(()=>{
        if (salesOpts!=='sales'){
            setIsView(false)
            setFields([])
            setAddEmployeeId('')
            setCurSale(null)
        }else{                                  
            setIsView(false)                             
            setCurRent(null)
            setRentalFields({...defaultRentalFields})
        }
    },[salesOpts])
    useEffect(()=>{
        if (curSale){
            setPostingDate(curSale.postingDate)
            setIsView(true)
        }else{
            setPostingDate(new Date(Date.now()).toISOString().slice(0, 10))
        }
    },[curSale])
    useEffect(()=>{
        if (curRent===null){
            var previousRental = null
            rentals.forEach((rental)=>{
                if (rental.rentalSpace === rentalFields.rentalSpace && 
                    rental.paymentMonth === months[months.indexOf(rentalFields.paymentMonth)-1])
                {
                    previousRental = rental
                }
            })
            if (previousRental!==null){
                setRentalFields((rentalFields)=>{
                    return {...rentalFields, rentalDebt:previousRental.balanceRemaining}
                })
            }else{
                setRentalFields((rentalFields)=>{
                    return {...rentalFields, rentalDebt:defaultRentalFields.rentalDebt}
                })
            }
        }
    },[rentalFields.rentalSpace])
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
            setFields([])
            setAddEmployeeId('')
            setCurSale(null)
            setIsView(false)
        }
    },[saleEmployee])
    useEffect(()=>{
        if (reportSales){
            handleViewClick(reportSales)
        }
    },[reportSales])
    const handleFieldChange = (prop)=>{
        const {e} = prop
        var index = prop.index
        if(accommodationRecords.length){
            index = prop.index - 1
        }
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
                if (name === 'salesPoint'){
                    if (value!=='accomodation' || companyRecord?.status === 'admin'){
                        fields[index] = {...fields[index], [name] : value}
                    }else{
                        setAlertState('error')
                        setAlert('You are not allowed to enter Accommodation Sales!')
                        setAlertTimeout(5000)
                    }
                }else{
                    fields[index] = {...fields[index], [name] : value}
                }
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
            if (name === 'recoverySales'){
                const selectedText = e.target.selectedOptions[0].value
                setRecoveryFields((fields)=>{
                    fields[index] = {...fields[index], [name]:value, recoveryAmount:selectedText}
                    return [...fields]
                })
            }else if (name==='recoveryPoint'){
                if(value!=='Employee' || companyRecord?.status === 'admin'){                    
                    setRecoveryFields((fields)=>{
                        fields[index] = {...fields[index], [name]:value, recoveryTransferId:'',recoveryReceipt:''}
                        return [...fields]
                    })
                }else{
                    setAlertState('error')
                    setAlert('Recovery to Employee is not enabled for you!')
                    setAlertTimeout(5000)
                }
            }else if (name==='recoveryTransferId'){
                setRecoveryFields((fields)=>{
                    fields[index] = {...fields[index], [name]:value, recoveryReceipt:value?`TRANSFER TO ID:${value}`:''}
                    return [...fields]
                })
            }else{
                setRecoveryFields((fields)=>{
                    fields[index] = {...fields[index], [name]:value}
                    return [...fields]
                })
            }
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
            const fields1 = [...accommodationRecords, ...fields]
            fields1.forEach((field)=>{
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
                record: [...fields1]
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
        setIsView(true)
        setFields([...(sale.record)])
        setIsView(true)
    }
    
    const handleRentalViewClick = (rent) =>{
        setCurRent(rent)
        setSalesOpts('rentals')
        setIsView(true)
        setRentalFields({...rent})
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
            if (name==='recovery'){
                setSalesOpts1('sales')
            }else{
                setSalesOpts1(name)
            }
        }
    }
    const handleSalesOpts1 = (e)=>{
        const name = e.target.getAttribute('name')
        if (name){
            setSalesOpts1(name)
            setSalesOpts(name)
        }
    }

    const postRecovery = async()=>{
        setRecoveryStatus('Posting Recovery ....')
        recoveryFields.forEach( async(field)=>{
            if(recoveryEmployeeId === (field.recoverySales).slice(0,field.recoverySales.indexOf('-'))){
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
                                    recoveryReceipt:field.recoveryReceipt,
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
                        employee.employeeDebtRecoverd = totalDebtRecovered
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
                    setAlertState('success')
                    setAlert('Debt Recovered Successfully!')
                    setAlertTimeout(5000)
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
                            if (record.employeeId === recoveryEmployeeId && (record.debt || record.shortage)){
                                const alreadyRecovered = record.debtRecovered ? record.debtRecovered : 0
                                record.debtRecovered = Number(alreadyRecovered) + Number(field.recoveryAmount)
                                totalDebtRecovered += Number(field.recoveryAmount)
                                const recoveredList = record.recoverdList !== undefined? record.recoverdList: [] 
                                const recoveryDetails ={
                                    recoveryReceipt:field.recoveryReceipt,
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
                    setAlertState('success')
                    setAlert('Debt Recovered Successfully!')
                    setAlertTimeout(5000)
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
    const calculateDebtReport = ()=>{
        var debtReportList = []        
        {employees.forEach((employee)=>{
            if (!employee.dismissalDate){
                if (!recoveryEmployeeId){
                    const debtDoc = {}
                    debtDoc.i_d = employee.i_d
                    var totalDebt = 0
                    var totalDebtRecovered = 0
                    {sales.forEach((sale)=>{
                        if (                                                        
                            months[new Date(sale.postingDate).getMonth()] === recoveryMonth &&
                            new Date(sale.postingDate).getFullYear() === new Date(Date.now()).getFullYear()                                                        
                        ){                                                
                            sale.record.forEach((record,index)=>{
                                if (record.employeeId === employee.i_d && (Number(record.debt)+Number(record.shortage)) > 0){
                                    totalDebt +=  Number(record.debt)
                                    totalDebtRecovered += Number(record.debtRecovered) 
                                }
                            }) 
                        }
                    })}
                    employee.employeeDebtList?.forEach((empDebt,index)=>{
                        if (                                                        
                            months[new Date(empDebt.postingDate).getMonth()] === recoveryMonth &&
                            new Date(empDebt.postingDate).getFullYear() === new Date(Date.now()).getFullYear()                                                        
                        ){
                            totalDebt += Number(empDebt.debtAmount)
                            totalDebtRecovered += empDebt.debtRecovered ? Number(empDebt.debtRecovered) : 0                               
                        }
                    })                    
                    debtDoc.totalDebt = totalDebt
                    debtDoc.totalDebtRecovered = totalDebtRecovered
                    debtDoc.totalOutstanding = totalDebt - totalDebtRecovered
                    debtReportList = debtReportList.concat(debtDoc)
                }else{
                    {sales.forEach((sale)=>{
                        if (                                                        
                            months[new Date(sale.postingDate).getMonth()] === recoveryMonth &&
                            new Date(sale.postingDate).getFullYear() === new Date(Date.now()).getFullYear()                                                        
                        ){                                                
                            sale.record.forEach((record,index)=>{
                                if (employee.i_d === record.employeeId && employee.i_d === recoveryEmployeeId && (Number(record.debt)+Number(record.shortage)) > 0){                                    
                                    const empDebtDoc = {}
                                    empDebtDoc.postingDate = sale.postingDate
                                    empDebtDoc.transferedFrom = 'Sales Debt'
                                    empDebtDoc.debt = Number(record.debt)
                                    empDebtDoc.debtRecovered = record.debtRecovered ? Number(record.debtRecovered) : 0 
                                    empDebtDoc.debtOutstanding = Number(record.debt) - (record.debtRecovered ? Number(record.debtRecovered) : 0)
                                    debtReportList = debtReportList.concat(empDebtDoc)
                                }
                            }) 
                        }
                    })}
                    if (employee.i_d === recoveryEmployeeId){
                        employee.employeeDebtList?.sort((a,b)=>{return b.postingDate - a.postingDate}).forEach((empDebt,index)=>{
                            if (                                                        
                                months[new Date(empDebt.postingDate).getMonth()] === recoveryMonth &&
                                new Date(empDebt.postingDate).getFullYear() === new Date(Date.now()).getFullYear()                                                        
                            ){
                                const empDebtDoc = {}
                                empDebtDoc.postingDate = empDebt.postingDate
                                empDebtDoc.transferedFrom = empDebt.transferedFrom
                                empDebtDoc.debt = Number(empDebt.debtAmount)
                                empDebtDoc.debtRecovered = empDebt.debtRecovered ? Number(empDebt.debtRecovered) : 0                                                                
                                empDebtDoc.debtOutstanding = Number(empDebt.debtAmount) - (empDebt.debtRecovered ? Number(empDebt.debtRecovered) : 0)                                                                
                                debtReportList = debtReportList.concat(empDebtDoc)
                            }
                        })
                    }
                }
            }
        })}        
        return debtReportList
    }
    const handleRentalFieldChange = (e) =>{
        const name = e.target.getAttribute('name')
        const value = e.target.value

        if (name){
            if (name === 'rentalAmount'){
                setRentalFields((rentalFields)=>{
                    return {...rentalFields, 'expectedPayment':Number(value)+Number(rentalFields.rentalDebt)}
                }) 
            }
            if (name === 'paymentAmount'){
                setRentalFields((rentalFields)=>{
                    return {...rentalFields, 'balanceRemaining':Number(rentalFields.expectedPayment)-Number(value)}
                }) 
            }
            setRentalFields((rentalFields)=>{
                return {...rentalFields, [name]:value}
            })
            
        }
    }
    const postRentals = async ()=> {
        setAlertState('info')
        setAlert('Posting to Rntals...')
        setRentalsStatus('Posting to Rentals...')        
        const newRental = {
            ...rentalFields,
            createdAt: new Date().getTime(),            
        }

        const newRentals = [newRental, ...rentals]        
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Rentals", 
            update: newRental
        }, "createDoc", server)
        
        if (resps.err){
            console.log(resps.mess)
            setAlertState('info')
            setAlert(resps.mess)
            setAlertTimeout(5000)
            setRentalsStatus('Post Rentals')
        }else{
            setRentals(newRentals)
            setCurRent(newRental)
            setIsView(true)
            setRentalFields({...newRental})
            getRentals(company)
            setAlertState('success')
            setAlert('Rentals Posted Successfully!')
            setAlertTimeout(5000)
            setRentalsStatus('Post Rentals')
        }
    }
    const deleteRental = async (rent)=>{
        if (deleteCount === rent.createdAt) {
            setAlertState('info')
            setAlert('Deleting...')
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Rentals", 
                update: {createdAt: rent.createdAt}
            }, "removeDoc", server)
            if (resps.err){
                console.log(resps.mess)
                setAlertState('info')
                setAlert(resps.mess)
                setAlertTimeout(5000)
            }else{
                setIsView(false)
                setCurRent(null)
                setRentalFields({...defaultRentalFields})
                setAlertState('success')
                setAlert('Rental Sales Deleted Successfully!')
                setDeleteCount(0)
                setAlertTimeout(5000)
                getRentals(company)
            }
        }else{
            setDeleteCount(rent.createdAt)
            setTimeout(()=>{
                setDeleteCount(0)
            },12000)
        }
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
                />}    
                {showDebtReport && <DebtReport
                    reportDebts = {calculateDebtReport()}
                    multiple={recoveryEmployeeId===''}
                    setShowDebtReport={(value)=>{
                        setShowDebtReport(value)                        
                    }}              
                    recoveryEmployeeId={recoveryEmployeeId}
                    recoveryMonth={recoveryMonth}
                />}    
                {showReceipt && <RentalReceipt
                    rentalSale = {curRent}
                    month = {months[new Date(Date.now()).getMonth()]}
                    setShowReceipt={(value)=>{
                        setShowReceipt(value)                        
                    }}                                  
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
                    <div className='emptypecov' 
                        onClick={handleSalesOpts1}
                    >
                        <div name='sales' className={salesOpts1==='sales' ? 'slopts': ''}>Sales</div>
                        <div name='rentals' className={salesOpts1==='rentals' ? 'slopts': ''}>Rentals</div>
                    </div>                                                  
                    {salesOpts1 === 'sales' && companyRecord.status==='admin' && <div className='inpcov fltinpcov'>
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
                    {salesOpts1 === 'sales' && (reportSales? [reportSales] : sales).filter((ftrsale)=>{
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
                    {salesOpts1 === 'rentals' && rentals.filter((ftrrent)=>{
                        const slCreatedAt = new Date(ftrrent.paymentDate).getTime()
                        const fromDate = new Date(saleFrom).getTime()
                        const toDate = new Date(saleTo).getTime()
                        if ( slCreatedAt>= fromDate && slCreatedAt<=toDate
                        ){                            
                            return ftrrent
                        }
                    }).map((rent, index)=>{
                        const {createdAt, paymentDate, paymentMonth, paymentAmount, balanceRemaining, expectedPayment, 
                            rentalSpace, receivedFrom 
                        } = rent
                        return(
                            <div className={'dept' + (curRent?.createdAt===createdAt?' curview':'')} key={index} 
                                onClick={(e)=>{
                                    handleRentalViewClick(rent)
                                }}
                            >
                                <div className='dets sldets'>
                                    <div>Payment Date: <b>{getDate(paymentDate)}</b></div>
                                    <div>Rental Space: <b>{rentalSpace.toUpperCase()}</b></div>
                                    <div>For The Month: <b>{paymentMonth}</b></div>
                                    <div>Expected Payment: <b>{'₦'+(Number(expectedPayment)).toLocaleString()}</b></div>
                                    <div>Payment Amount: <b>{'₦'+(Number(paymentAmount)).toLocaleString()}</b></div>
                                    <div>Balance Remaining: <b>{'₦'+(Number(balanceRemaining)).toLocaleString()}</b></div>                                    
                                    <div className='deptdesc'>{`Payment Received From:`} <b>{`${receivedFrom}`}</b></div>
                                </div>
                                {(companyRecord.status==='admin' && !saleEmployee) && <div 
                                    className='edit'
                                    name='delete'         
                                    style={{color:'red'}}                           
                                    onClick={()=>{                                        
                                        setAlertState('info')
                                        setAlert('You are about to delete the selected Rental Sales. Please Delete again if you are sure!')
                                        setAlertTimeout(5000)                                                                                    
                                        deleteRental(rent)
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
                    {salesOpts==='recovery' && 
                        companyRecord.status==='admin' && 
                        <FaTableCells                         
                            className='slrepicon'
                            onClick={()=>{
                                setShowDebtReport(true)                                
                            }}
                        />
                    }
                    {isView && salesOpts==='rentals' && 
                        <FaReceipt                   
                            className='slrepicon'
                            onClick={()=>{
                                setShowReceipt(true)                                
                            }}
                        />
                    }
                    {['sales','rentals'].includes(salesOpts) && ( (fields.length && !isView) ? 
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
                                if (salesOpts==='sales'){
                                    setIsView(false)
                                    setFields([])
                                    setAddEmployeeId('')
                                    setCurSale(null)
                                }else if (salesOpts==='rentals'){
                                    setIsView(false)
                                    setRentalFields({...defaultRentalFields})
                                    setCurRent(null)
                                }
                            }}
                        />)
                    }
                    <div className='formtitle padtitle'>
                        <div className={'frmttle'}>
                            {`DAILY SALES`}
                        </div> 
                    </div>
                    
                    <div className='salesfm'>
                        {<div className='salesopts' onClick={handleSalesOpts}>
                            <div name='sales' className={salesOpts==='sales' ? 'slopts': ''}>Sales</div>
                            <div name='rentals' className={salesOpts==='rentals' ? 'slopts': ''}>Rentals</div>                            
                            {((companyRecord?.status === 'admin') || recoveryVal) && <div name='recovery' className={salesOpts==='recovery' ? 'slopts': ''}>Debt Recovery</div>}
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
                        {salesOpts === 'recovery' && ((companyRecord?.status === 'admin') || recoveryVal) && <div className='addnewrecovery'>
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
                                    <option value=''>Select Employee ID</option>
                                    {employees.map((employee)=>{
                                        if (!employee.dismissalDate){
                                            return (
                                                <option 
                                                    key={employee.i_d}
                                                    value={employee.i_d}
                                                >
                                                    {`(${employee.i_d}) ${employee.firstName.toUpperCase()} ${employee.lastName.toUpperCase()} - ${employee.position}`}
                                                </option>
                                            )
                                        }
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
                            salesOpts==='recovery' && ((companyRecord?.status === 'admin') || recoveryVal) && recoveryFields.map((field, index)=>{
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
                                        <input 
                                            className='forminp recoveryReceipt'
                                            style={{cursor: field.recoveryPoint === 'Employee'?'not-allowed':'auto'}}
                                            name='recoveryReceipt'
                                            type='text'
                                            placeholder='Enter Receipt Number'
                                            disabled={field.recoveryPoint === 'Employee'}
                                            value={field.recoveryReceipt}
                                            onChange={(e)=>{
                                                handleRecoveryFieldChange({index, e})
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
                                                style={{cursor: field.recoverySales?'auto':'not-allowed'}}
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
                                                <option key={'em001'} value='Employee'>EMPLOYEE</option>
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
                        {salesOpts==='rentals' && <div className='basic'>                            
                            <div className='inpcov'>
                                <div>Payment Date</div>
                                <input 
                                    className='forminp'
                                    name='paymentDate'
                                    type='date'
                                    placeholder='Rental Date'
                                    value={rentalFields.paymentDate}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleRentalFieldChange(e)
                                    }}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Rental Space</div>
                                <select 
                                    className='forminp'
                                    name='rentalSpace'
                                    type='text'
                                    placeholder='Rental Space'
                                    value={rentalFields.rentalSpace}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleRentalFieldChange(e)
                                    }}
                                >
                                    <option value=''>Select Rental Space</option>
                                    {rentalSpaces.map((space, index)=>{
                                        return <option key={index}>{space}</option>
                                    })}
                                </select>
                            </div>
                            <div className='inpcov'>
                                <div>Shop Rent Amount</div>
                                <input 
                                    className='forminp'
                                    name='rentalAmount'
                                    type='number'
                                    placeholder='Rental Amount'
                                    value={rentalFields.rentalAmount}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleRentalFieldChange(e)
                                    }}
                                />
                            </div>   
                            <div className='inpcov'>
                                <div>Previous Debt</div>
                                <input 
                                    className='forminp'
                                    name='rentalDebt'
                                    type='number'
                                    placeholder='Previous Debt'
                                    value={rentalFields.rentalDebt}
                                    disabled={true}
                                    onChange={(e)=>{
                                        handleRentalFieldChange(e)
                                    }}
                                />
                            </div>                         
                            <div className='inpcov'>
                                <div>Expected Payment</div>
                                <input 
                                    className='forminp'
                                    name='expectedPayment'
                                    type='number'
                                    placeholder='Expected Payment'
                                    value={rentalFields.expectedPayment}
                                    disabled={true}
                                    onChange={(e)=>{
                                        handleRentalFieldChange(e)
                                    }}
                                />
                            </div>                         
                            <div className='inpcov'>
                                <div>Payment Amount</div>
                                <input 
                                    className='forminp'
                                    name='paymentAmount'
                                    type='number'
                                    placeholder='Payment Amount'
                                    value={rentalFields.paymentAmount}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleRentalFieldChange(e)
                                    }}
                                />
                            </div>                         
                            <div className='inpcov'>
                                <div>Select Payment Point</div>
                                <select 
                                    className='forminp'
                                    name='payPoint'
                                    type='text'
                                    placeholder='Payment Point'
                                    value={rentalFields.payPoint}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleRentalFieldChange(e)
                                    }}
                                >
                                    <option value=''>Select Payment Point</option>
                                    {Object.keys(payPoints).map((payPoint, index)=>{
                                        return <option key={index} value={payPoint}>{payPoint.toUpperCase()}</option>
                                    })}
                                </select>
                            </div>   
                            <div className='inpcov'>
                                <div>For The Month of</div>
                                <select 
                                    className='forminp'
                                    name='paymentMonth'
                                    type='text'
                                    placeholder='Payment Month'
                                    value={rentalFields.paymentMonth}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleRentalFieldChange(e)
                                    }}
                                >
                                    <option value=''>Select Payment Month</option>
                                    {months.map((month, index)=>{
                                        return <option key={index} value={month}>{month}</option>
                                    })}
                                </select>
                            </div>   
                            <div className='inpcov'>
                                <div>Received From</div>
                                <input 
                                    className='forminp'
                                    name='receivedFrom'
                                    type='text'
                                    placeholder='Received From'
                                    value={rentalFields.receivedFrom}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleRentalFieldChange(e)
                                    }}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Balance Remaining</div>
                                <input 
                                    className='forminp'
                                    name='balanceRemaining'
                                    type='number'
                                    placeholder='Balance Remaining'
                                    value={rentalFields.balanceRemaining}
                                    disabled={true}
                                    onChange={(e)=>{
                                        handleRentalFieldChange(e)
                                    }}
                                />
                            </div>
                        </div>}
                        {salesOpts==='sales' && [...accommodationRecords, ...fields].map((field, index)=>{
                            const netTotal = Number(field.cashSales) + Number(field.bankSales)+ Number(field.debt) + Number(field.shortage)
                            // console.log(index)
                            return (
                                <div key={index} className='empsalesblk'>
                                    <div className='pdsalesview'>
                                        {`Pending Sales out of ₦${Number(field.totalSales).toLocaleString()}:`} <b> {'₦'+(Number(field.totalSales) - netTotal).toLocaleString()}</b> <b>{` ${field.postingDate? '('+getDate(field.postingDate)+')' : ''}`}</b>
                                    </div>
                                    {!isView && !field.isAccommodation && <MdDelete 
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
                                        <div 
                                            title={!field.salesPoint ? 'Please Select Sales Point Before Entering Debt':''}
                                        className='inpcov'>
                                            <div
                                                title={!field.salesPoint ? 'Please Select Sales Point Before Entering Debt':''}
                                            >Debt</div>
                                            <input 
                                                className='forminp'
                                                name='debt'
                                                type='number'
                                                placeholder='Debt'
                                                value={field.debt}
                                                style={{cursor: !field.salesPoint ? 'not-allowed':'auto'}}
                                                title={!field.salesPoint ? 'Please Select Sales Point Before Entering Debt':''}
                                                disabled={isView || (field.isAccommodation) || !field.salesPoint}
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
                                                disabled={isView || field.salesPoint || (field.isAccommodation)}
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
                                                disabled={isView || (field.isAccommodation)}
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
                                        >{field.viewHistory? `Hide Recovery History`:'View Recovery History'}</div>}
                                        {field.viewHistory && <div>
                                            {field.recoverdList.map((reclist, index)=>{
                                                const {recoveryAmount, recoveryPoint, recoveryTransferId, recoveryDate} = reclist
                                                return <div key={index} className='slvwrecovery'>
                                                    <div>Date: <b>{` ${recoveryDate}\t`}</b></div>
                                                    <div>Amount: <b>{` ${'₦'+Number(recoveryAmount).toLocaleString()}`}</b></div>
                                                    <div>{!recoveryTransferId ? 'Paid to: ':'Moved to'}<b>{` ${!recoveryTransferId? recoveryPoint.toUpperCase():''}`}</b>
                                                        <b>{recoveryTransferId && employees.filter((employee)=>{
                                                            return employee.i_d === recoveryTransferId
                                                        }).map((emp, idt)=>{
                                                            return (
                                                                <span key={idt}>
                                                                    {`${emp.firstName.toUpperCase()} (${emp.i_d})`}
                                                                </span>
                                                            )
                                                        })}
                                                    </b></div>                                                         
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
                        {salesOpts === 'sales' && <div className='inpcov salesinpcov'>
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
                        </div>}  
                        {salesOpts === 'recovery' && ((companyRecord?.status === 'admin') || recoveryVal) && <div className='inpcov salesinpcov'>
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
                        </div>}               
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
                                        setAlert('Positive Diffrence(s) Detected. Would you like to accept these diffrences as Debt?')
                                        setAlertTimeout(15000)
                                    }
                                }
                            }}
                        >{postStatus}</div>} 
                        {salesOpts === 'recovery' && ((companyRecord?.status === 'admin') || recoveryVal) && <div className='yesbtn salesyesbtn'
                            style={{
                                cursor:recoveryFields.length?'pointer':'not-allowed'
                            }}
                            onClick={()=>{
                                if (recoveryFields.length){
                                    var ct=0
                                    var ct1=0
                                    var ct2=0
                                    var ct3=0
                                    var requiredNo = recoveryFields.length
                                    recoveryFields.forEach((recoveryField)=>{
                                        const {recoveryReceipt, recoveryAmount, recoveryDate, recoveryPoint} = recoveryField
                                        if (recoveryReceipt){
                                            ct++
                                        }
                                        if (recoveryAmount){
                                            ct1++
                                        }
                                        if (recoveryDate){
                                            ct2++
                                        }
                                        if (recoveryPoint){
                                            ct3++
                                        }
                                    })
                                    if (ct===requiredNo && ct1===requiredNo && ct2===requiredNo && ct3===requiredNo){
                                        postRecovery()
                                    }else{
                                        setActionMessage('')
                                        setAlertState('error')
                                        setAlert(
                                            `${ct<requiredNo?' "All Receipt Number Must Be Entered", ':''}\
                                            ${ct1<requiredNo?' "All Recovery Amount Must Be Greater Than 0", ':''}\
                                            ${ct3<requiredNo?' "All Recovery Point Must Be Selected", ':''}\
                                            ${ct2<requiredNo?' "All Recovery Date Must Be Specified", ':''}`
                                        )
                                        setAlertTimeout(10000)                                        
                                    }
                                }
                            }}
                        >{recoveryStatus}</div>}
                        {salesOpts === 'rentals' && <div className='yesbtn salesyesbtn'
                            style={{
                                cursor:(rentalFields.paymentAmount && rentalFields.expectedPayment)?'pointer':'not-allowed'
                            }}
                            onClick={()=>{
                                if (rentalFields.paymentAmount && rentalFields.expectedPayment){
                                    postRentals()
                                }
                            }}
                        >{rentalsStatus}</div>}                        
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
                            disabled={isView || (field.isAccommodation)}
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