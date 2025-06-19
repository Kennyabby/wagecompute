import './Sales.css'
import { useState, useEffect, useContext, useRef } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import ApprovalBox from '../../Resources/ApprovalBox/ApprovalBox';
import { FaChevronDown, FaChevronUp, FaReceipt } from "react-icons/fa";
import { FaTableCells } from "react-icons/fa6";
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import html2pdf from 'html2pdf.js';
import SalesReport from './SalesReport/SalesReport';
import RentalReceipt from './RentalReceipt/RentalReceipt';
import DebtReport from './DebtReport/DebtReport';
import Notify from '../../Resources/Notify/Notify';
import { MdAdd } from "react-icons/md";
import { RxReset } from "react-icons/rx";
import { MdDelete } from "react-icons/md";
import { use } from 'react';

const Sales = ()=>{
    const {storePath, 
        fetchServer, 
        server, 
        companyRecord, 
        company, recoveryVal, allowBacklogs,
        employees, setEmployees, getEmployees, 
        sales, setSales, getSales, months,
        allSessions, getAllSessions, getSessionEnd,
        accommodations, getAccommodations,
        rentals, setRentals, getRentals, 
        products, setProducts, getProducts, getProductsWithStock,
        getDate, removeComma, settings,
        saleFrom, saleTo,
        setSaleFrom, setSaleTo,
        nextSales, setNextSales,
        setSalesLoadCount, salesLoadCount,
        alert,alertState,alertTimeout,actionMessage, 
        setAlert, setAlertState, setAlertTimeout, setActionMessage,
        approvals, getApprovals, requestApproval, updateApproval, removeApproval,
        approvalStatus, approvalMessage, setApprovalStatus, setApprovalMessage,               
    } = useContext(ContextProvider)

    const payPoints = {
        'moniepoint1':'', 'moniepoint2':'', 
        'moniepoint3':'', 'moniepoint4':'', 'cash':''
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
    const [saleEmployee, setSaleEmployee] = useState('')
    const [addEmployeeId, setAddEmployeeId] = useState('')
    const [recoveryEmployeeId, setRecoveryEmployeeId] = useState('')
    const [isProductView, setIsProductView] = useState(false)
    const [productAdd, setProductAdd] = useState(false)
    const [addingProducts, setAddingProducts] = useState(false)
    const [postedProducts, setPostedProducts] = useState([])
    const [postCount, setPostCount] = useState(0)
    const [uoms, setUoms] = useState([])
    const [categories, setCategories] = useState([])
    const [wrhs, setWrhs] = useState([])
    const [salesEntries, setSalesEntries] = useState({})
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
    
    const [curApproval, setCurApproval] = useState(null)
    const [showApprovalBox, setShowApprovalBox] = useState(false)
    const [isApprover, setIsApprover] = useState(false)
    const [isProductApprover, setIsProductApprover] = useState(false)
    const [ftrApprovals, setFtrApprovals] = useState([])
    const [productsApprovals, setProductsApprovals] = useState([])

    const [curSaleDate, setCurSaleDate] = useState(null)
    const scrollRef = useRef(null)
    const loadRef = useRef(null)
    const getEntriesController = useRef(null)
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
    const [sessionSalesRecords, setSessionSalesRecords] = useState([])
    const [fields, setFields] = useState([])
    const [recoveryFields, setRecoveryFields] = useState([])
    const [rentalFields, setRentalFields] = useState({
        ...defaultRentalFields
    })
    const [isView, setIsView] = useState(false)

    // useEffect(()=>{
    //     const divElement = scrollRef.current;
    //     const handleScroll = () => {
    //         if (divElement && loadRef.current) {
    //             const topPosition = loadRef.current.offsetTop - divElement.scrollTop;
    //             const scrollDivHeight = divElement.offsetHeight;
    //             const scrollElementHeight = loadRef.current.offsetHeight; 
    //             console.log(topPosition, scrollDivHeight, scrollElementHeight)
    //             if (topPosition <= scrollDivHeight - scrollElementHeight + 500) {
    //                 if (nextSales?.length){
    //                     // console.log('getting more sales...')
    //                     const lastCreatedAt = nextSales[nextSales.length - 1].createdAt
    //                     // console.log('fetching next sales from ', lastCreatedAt, 'which should be converted to:', new Date(lastCreatedAt).getTime())
    //                     getSales(company, 'next', saleFrom, lastCreatedAt, 10)
    //                 }
    //             }
    //         }
    //     };

    //     if (divElement) {
    //         divElement.addEventListener('scroll', handleScroll);
    //         return () => {
    //             divElement.removeEventListener('scroll', handleScroll);
    //         };
    //     }
        
    // },[loadRef.current, nextSales, salesLoadCount])

    // useEffect(()=>{
    //     setNextSales(null)
    //     setSalesLoadCount(0)    
    //     getSales(company, 'first', saleFrom, saleTo, 10)
    // },[saleFrom, saleTo])

    useEffect(()=>{
        storePath('sales')  
    },[storePath])
    
    useEffect(()=>{
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        getAllSessions(cmp_val)
        getSales(cmp_val)
        getEmployees(cmp_val)
        getRentals(cmp_val)
        getAccommodations(cmp_val)
        getAllSessions(cmp_val)
        getApprovals(cmp_val)
        const intervalId = setInterval(()=>{
            if (cmp_val){
                getSales(cmp_val)
                getEmployees(cmp_val)
                getRentals(cmp_val)
                getAccommodations(cmp_val)
                getAllSessions(cmp_val)
                getApprovals(cmp_val)
            }
        },60000)
        return () => clearInterval(intervalId);
    },[window.localStorage.getItem('sessn-cmp')])

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
        var sessionSalesRecords = []
        var wrhPoints = []
        wrhs.forEach((wh)=>{
            if (!wh.purchase){
                wrhPoints.push(wh.name)
            }
        })

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
            var sessionEmployees = []
            allSessions.forEach((session)=>{
                const employeeId = session.employee_id
                if (!sessionEmployees.includes(employeeId)){
                    sessionEmployees = sessionEmployees.concat(employeeId)
                }
            })
            sessionEmployees.forEach((employeeId)=>{                
                let totalWrhTransactions = {}
                wrhPoints.forEach((wh)=>{
                    const payPointsClone = structuredClone({payPoints})
                    const allPayPoints = {...(payPointsClone.payPoints)}
                    totalWrhTransactions[wh] = {
                        totalSales: 0,
                        cashSales: 0,
                        bankSales: 0,
                        debt: 0,
                        unAccountedSales: 0,
                        allPayPoints,
                        postingDates:[]
                    }
                })
                wrhPoints.forEach((wh)=>{
                    const saleRecord = {}
                    saleRecord.isSession = true
                    const wrhSessions = allSessions.filter((session)=>{
                        
                        const salesEndDate = new Date(postingDate1)
                        salesEndDate.setDate(salesEndDate.getDate() + 1);

                        if (session.wrh === wh && session.end && 
                            session.type==='sales' && session.employee_id === employeeId                           
                            && getSessionEnd(session.start) === getSessionEnd(salesEndDate)
                        ){
                            return session
                        }
                    })
                    
                    wrhSessions.forEach((session)=>{
                        const {totalSalesAmount, debtDue, unAccountedSales} = session
                        totalWrhTransactions[wh].totalSales += Number(totalSalesAmount)
                        totalWrhTransactions[wh].debt += Number(debtDue)
                        totalWrhTransactions[wh].unAccountedSales = Number(unAccountedSales)
                        Object.keys(totalWrhTransactions[wh].allPayPoints).forEach((payPoint)=>{
                            if (session[payPoint]){
                                totalWrhTransactions[wh].allPayPoints[payPoint]  += Number(session[payPoint])
                                totalWrhTransactions[wh].cashSales += (payPoint === 'cash' ? Number(session['cash']) : 0)
                                totalWrhTransactions[wh].bankSales += (payPoint !== 'cash' ? Number(session[payPoint]) : 0)
                            }                            
                        })

                    })
                    
                    if (wrhSessions.length){
                        const salesUnits1 = {...salesUnits}
                        salesUnits1[wh] = {...(totalWrhTransactions[wh].allPayPoints)}
                        saleRecord.employeeId = employeeId
                        saleRecord.totalSales = totalWrhTransactions[wh].totalSales
                        saleRecord.cashSales = totalWrhTransactions[wh].cashSales
                        saleRecord.bankSales = totalWrhTransactions[wh].bankSales
                        saleRecord.debt = totalWrhTransactions[wh].debt
                        saleRecord.unAccountedSales = totalWrhTransactions[wh].unAccountedSales
                        saleRecord.shortage = ''
                        saleRecord.debtRecovered = ''
                        saleRecord.salesPoint = wh
                        Object.keys(salesUnits1).forEach((saleUnit)=>{
                            saleRecord[saleUnit] = salesUnits1[saleUnit]
                        })
                        sessionSalesRecords.push(saleRecord)
                    }
                })
            })
        }
        setSessionSalesRecords(sessionSalesRecords)
    },[allSessions, postingDate, isView, saleEmployee])

    useEffect(()=>{
        if (settings.length){  
            const uomSetFilt = settings.filter((setting)=>{
                return setting.name === 'uom'
            })
            delete uomSetFilt[0]?._id
            setUoms(uomSetFilt[0].name?[...uomSetFilt[0].mearsures]:[])

            const catSetFilt = settings.filter(setting => setting.name === 'product_categories');
            delete catSetFilt[0]?._id;
            setCategories(catSetFilt[0].name ? [...catSetFilt[0].categories] : []);

            const wrhSetFilt = settings.filter((setting)=>{
                return setting.name === 'warehouses'
            })

            delete wrhSetFilt[0]?._id
            setWrhs(wrhSetFilt[0].name ? [...wrhSetFilt[0].warehouses] : [])
        }  
    },[settings])

    useEffect(()=>{
        if (!recoveryVal){
            setSalesOpts('sales')
        }
    },[recoveryVal])

    useEffect(()=>{
        // console.log(fields)
    },[fields])

    useEffect(()=>{
        setCurApproval(null)
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
        if (Array.isArray(approvals)){
            setFtrApprovals(approvals.filter((appr)=>{return appr.section.toUpperCase() === `post${salesOpts}`.toUpperCase()}))
            setProductsApprovals(approvals.filter((appr)=>{return appr.section === 'addSalesProduct'}))
        }
    },[approvals, salesOpts])

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
    },[rentalFields.rentalSpace, rentalFields.paymentMonth])

    useEffect(()=>{
        if (!allowBacklogs){
            setSaleFrom(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
        }
        if(companyRecord?.permissions.includes('postSales') || companyRecord?.status==='admin'){
            setIsApprover(true)
        }
    },[companyRecord])


    useEffect(()=>{
        setCurApproval(null)
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

    const postApprovalUpdate = async (company, module, section, curApproval)=>{
        setAlertState('info')
        setAlert('Updating Approval...')
        setAlertTimeout(100000)
        const approvalState = {
            approved: approvalStatus,
            message: approvalMessage,
            createdAt: curApproval.createdAt,
            lastUpdatedBy: companyRecord?.emailid
        }
        if (approvalStatus){
            approvalState.approvedBy = companyRecord?.emailid || companyRecord?.emailid
        }
        const resp = await updateApproval(company, module, section, {                                                                
            ...approvalState
        })
        if (resp.completed){
            getApprovals(company)
            setAlertState('success')
            setAlert('Approval Updated!')
            setAlertTimeout(5000)
            setApprovalStatus(false)
            setApprovalMessage('')
            setShowApprovalBox(false)
            setCurApproval({...curApproval, 
                approved: approvalStatus,
                message: approvalMessage,
                createdAt: curApproval.createdAt,
                lastUpdatedBy: companyRecord?.emailid
            })
            setAddingProducts(false)
        }else{
            setAlertState('error')
            setAlert(resp.mess)
            setAlertTimeout(5000)
            setAddingProducts(false)
        }
    }

    const runApprovalWorkFlow = async(curApproval, module, section, data, runApproval, link)=>{
        
        const executePostAction = ()=>{
            runApproval()            
            if (curApproval?.createdAt){
                removeApproval(company, module, section, {                        
                    createdAt: curApproval.createdAt,
                    postingDate: curApproval.postingDate                                                 
                })
            }
        }

        const executeApprovalAction = async (previous)=>{
            if (companyRecord?.permissions.includes(section) || companyRecord?.status==='admin'){
                executePostAction()
            }else{
                setAlertState('info')
                setAlert('Sending Approval Request...')
                setAlertTimeout(100000)
                const approvalData = {
                    data: data,
                    createdAt: previous?.createdAt ? previous.createdAt: new Date().getTime(),
                    postingDate: postingDate,   
                    isApproval: true,  
                    handlerId: companyRecord?.emailid,  
                    messages: previous?.createdAt ? [
                        ...previous.messages, 
                        {message: previous.message, createdAt: new Date().getTime()}
                    ] : []                        
                }
                if (link){
                    approvalData.link = link
                }
                const resp = await requestApproval(company, module, section, approvalData)
                if (resp.completed){
                    if(previous?.createdAt){
                        removeApproval(company, module, section, {                        
                            createdAt: previous.createdAt,
                            postingDate: previous.postingDate                                                 
                        })
                    }
                    setAlertState('success')
                    setAlert('Approval Request Sent Successfully!')
                    setAlertTimeout(5000)
                    getApprovals(company)
                    setCurApproval(approvalData)
                    setAddingProducts(false)
                }else{
                    setAlertState('error')
                    setAlert(resp.mess)
                    setAlertTimeout(5000)
                    setAddingProducts(false)
                }
            }
        }

        if (![null, undefined].includes(curApproval)){
            if (curApproval.approved){
                executePostAction()
            }else{
                if (!curApproval.message){
                    if (companyRecord?.permissions.includes(section) || companyRecord?.status==='admin'){
                       setShowApprovalBox(true)
                    }else{
                        setAlertState('info')
                        setAlert('Already sent for approval. Please wait for response!')
                        setAlertTimeout(5000)
                    }
                }else{
                    executeApprovalAction(curApproval)
                }
            }
        }else{
            executeApprovalAction()
        }
    }

    const handleFieldChange = (prop)=>{
        const {e} = prop
        var index = prop.index
        if(accommodationRecords.length){
            index = prop.index - accommodationRecords.length
        }
        if(sessionSalesRecords.length){
            index = prop.index - sessionSalesRecords.length
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

    const isProductAvailable = (validEntries)=>{
        var noAvailableProducts =  0
        const insufficientProducts = []
        Object.keys(validEntries).forEach((entryWrh)=>{
            for (const entry of validEntries[entryWrh]){
                const product = products.find(p => p.i_d === entry.i_d);
                if (product) {
                    let countBaseQuantity = 0;
                    const {cost, quantity} = product.locationStock?.[entryWrh] || {cost: 0, quantity: 0}
                    countBaseQuantity = Number(quantity || 0);                            
                    if (countBaseQuantity < Number(entry.baseQuantity)) {
                        insufficientProducts.push(`[${entry.i_d}] ${entry.name} (${countBaseQuantity.toLocaleString()}) in ${entryWrh}`);
                    }
                }
            }

            if (insufficientProducts.length > 0) {
                noAvailableProducts += 1                        
            }
        })        
        return {value: noAvailableProducts === 0,  message: insufficientProducts}
    }

    const executeProductsPost = (validEntries, entriesLength, timestamp)=>{        
        const makePost = ()=>{            
            setAlertState('info')
            setAlert('Posting Product Sales...')
            setAlertTimeout(100000)
            
            const allProductsAvailable = isProductAvailable(validEntries)
            if (!allProductsAvailable.value){
                setAlertState('error');
                setAlert(`Insufficient quantity in store, for the following product(s): ${allProductsAvailable.message.join(', ')}`);
                setAlertTimeout(8000);
                setAddingProducts(false)
                setPostCount(0)   
                return;         
            }
            Object.keys(validEntries).forEach((entryWrh)=>{
                postProductsSales(entryWrh, validEntries[entryWrh], timestamp, entriesLength)
            })
        }

        runApprovalWorkFlow(curSale.approval, 'sales', 'addSalesProduct', validEntries, makePost, curSale.createdAt)                                    
    }

    const handleProductSales = async ()=>{        
        const timestamp = Date.now()
        setPostCount(postedProducts.length)
        var totalAmount = 0
        var entriesLength = 0
        const validEntries = {}
        Object.keys(salesEntries).forEach((wh)=>{   
            validEntries[wh]=[]             
            salesEntries[wh].forEach((entry)=>{
                if (entry.totalSales){
                    entriesLength += 1
                    totalAmount += Number(entry.totalSales)
                    entry.location = wh
                    entry.createdAt = timestamp
                    entry.postingDate = postingDate
                    validEntries[wh].push(entry)
                }
            })
        })   
        if (curSale !== null){         
            const {createdAt, postingDate, totalCashSales, totalDebt, record, 
                totalShortage, totalDebtRecovered, totalBankSales, recoveryList, productsRef 
            } = curSale
            var accommodationAmount = 0
            record.forEach((saleRecord)=>{
                if (saleRecord.salesPoint === 'accomodation'){
                    accommodationAmount += Number(saleRecord.totalSales)
                }
            })
            const totalSalesAmount = Number(totalCashSales)+Number(totalBankSales)+Number(totalDebt)+Number(totalShortage) - accommodationAmount
            if (totalSalesAmount === totalAmount){                
                executeProductsPost(validEntries, entriesLength, timestamp)
            }else{
                setAlertState('error')
                setAlert('Total Product Sales Must Be Equal to Total Sales On This Card (Excluding Accommodation)!')
                setAlertTimeout(3000)
                setAddingProducts(false)
            }
        }else{            
            var totalCashSales = 0
            var totalDebt = 0      
            var totalShortage = 0 
            var totalBankSales = 0 
            const fields1 = [...fields]
            fields1.forEach((field)=>{
                totalCashSales += Number(field.cashSales)
                totalDebt += Number(field.debt)
                totalShortage += Number(field.shortage)
                totalBankSales += Number(field.bankSales)
            })
            const totalSalesAmount = totalCashSales + totalBankSales + totalDebt + totalShortage
            if (totalSalesAmount === totalAmount){                
                executeProductsPost(validEntries, entriesLength, timestamp)
            }else{
                setAlertState('error')
                setAlert('Total Product Sales Must Be Equal to Total Sales On This Card (Excluding Accommodation)!')
                setAlertTimeout(3000)
                setAddingProducts(false)
                return;
            }
        }
    }

    const checkDuplicateTransaction = async (company, transaction) => {
        const response = await fetchServer("POST", {
            database: company,
            collection: "InventoryTransactions",
            prop: {
                productId: transaction.productId, // Use productId or i_d
                location: transaction.location,
                postingDate: transaction.postingDate,
                // createdAt: transaction.createdAt,
                entryType: transaction.entryType,
                documentType: transaction.documentType,
                quantity: Number(transaction.quantity) * -1,
                baseQuantity: Number(transaction.baseQuantity) * -1,
                totalSales: Number(transaction.totalSales) * -1,
                totalCost: Number(transaction.costPrice) * Number(transaction.baseQuantity) * -1
            }
        }, "getDocsDetails", server); // plural version that returns an array
        if (response.err){
            return false
        }
        return Array.isArray(response.record) && response.record.length > 0;
    };

    const postProductsSales = async (entryWrh, validEntries, timestamp, entriesLength) => {
        const createdAt = timestamp;  

        // console.log(entryWrh, 'validEntries: ', validEntries.length)
        var ctentries = 0
        validEntries.forEach(async (entry, index) => {

            if (!postedProducts.includes(`${entry.productId} ${entryWrh}`)){            
                setAlertState('info')
                setAlert('Checking for duplicates...')
                setAlertTimeout(100000)
                
                const isDuplicate = await checkDuplicateTransaction(company, entry);            
                
                if (!isDuplicate){
                    setAlertState('info')
                    setAlert(`Posting Transaction... ${entry.productId} ${entryWrh}`)
                    setAlertTimeout(100000)
                    
                    const newTransaction = {
                        ...entry,
                        location: entryWrh,
                        productId: entry.productId || entry.i_d,
                        quantity: Number(entry.quantity) * -1,
                        baseQuantity: Number(entry.baseQuantity) * -1,
                        totalCost: Number(entry.costPrice) * Number(entry.baseQuantity) * -1,
                        totalSales: Number(entry.totalSales) * -1,
                        postingDate: postingDate,
                        createdAt: createdAt,
                    };
                    
                    // ctentries++
                    
                    // setPostCount(prevCount => {
                    //     if (!postedProducts.includes(`${entry.productId} ${entryWrh}`)){
                    //         setPostedProducts((products)=>{
                    //             return [...products, `${entry.productId} ${entryWrh}`]
                    //         })
                    //     }
                    //     const newCount = prevCount + 1;
                    //     if (newCount === entriesLength) {
                    //         console.log(entryWrh, 'newTransaction: ', ctentries)
                    //         setAddingProducts(false)
                    //         setPostCount(0)
                    //         setAlertState('success');
                    //         setAlert(`${entriesLength} Inventory Updated Successfully!`);
                    //         setAlertTimeout(5000)
                    //     }else{
                    //         if (ctentries === validEntries.length){
                    //             console.log(entryWrh, 'newTransaction: ', ctentries)
                    //         }else {                        
                    //             setAlertState('success');
                    //             setAlert(`${newCount} / ${entriesLength} Inventory Updated to ${entryWrh} Successfully!`);
                    //         }
                    //         return newCount
                    //     }
                    // })

                    const resps = await fetchServer("POST", {
                        database: company,
                        collection: "InventoryTransactions", 
                        update: newTransaction
                    }, "createDoc", server);
                    
                    if (resps.err) {
                        console.log(resps.mess);
                        setAlertState('error');
                        setAlert(resps.mess);
                        setAlertTimeout(5000);
                        setAddingProducts(false)
                        // return;
                    } else {
                        setPostCount(prevCount => {
                            if (!postedProducts.includes(`${entry.productId} ${entryWrh}`)){
                                setPostedProducts((products)=>{
                                    return [...products, `${entry.productId} ${entryWrh}`]
                                })
                            }
                            const newCount = prevCount + 1;
                            if (newCount === entriesLength) {
                                setProductAdd(false);
                                setAlertState('success');
                                setAlert(`${entriesLength} Inventory Updated Successfully!`);
                                getProductsWithStock(company, products);
                                setProductAdd(false);
                                if (curSale === null) {
                                    setTimeout(() => addSales(createdAt), 500);
                                } else {
                                    setTimeout(async () => {
                                        setAlertState('info');
                                        setAlert('Linking to Posted Sales...');
                                        const resps1 = await fetchServer("POST", {
                                            database: company,
                                            collection: "Sales",
                                            prop: [{ createdAt: curSale.createdAt }, { productsRef: createdAt }]
                                        }, "updateOneDoc", server);
                                        
                                        if (resps1.err) {
                                            console.log(resps1.mess);
                                            setAlertState('info');
                                            setAlert(resps1.mess);
                                            setAlertTimeout(5000);
                                            setAddingProducts(false)
                                            return
                                        } else {
                                            localStorage.removeItem(`sales-${curSale?.createdAt}`)
                                            setAlertState('success');
                                            setAlert('Products Linked Successfully!');
                                            setAlertTimeout(3000);
                                            setAddingProducts(false)
                                            setPostedProducts([])
                                            getProductsWithStock(company, products);
                                            getSales(company);
                                        }
                                    }, 1000);
                                }
                            } else {                        
                                setAlertState('success');
                                setAlert(`${newCount} / ${entriesLength} Inventory Updated to ${entryWrh} Successfully!`);
                            }
            
                            return newCount;
                        });
                    }
                }else{
                    setPostedProducts((products)=>{
                        const newProducts = [...products, `${entry.productId} ${entryWrh}`]
                        setPostCount((prevCount)=>{
                            return (prevCount + 1)
                        })
                        return newProducts
                    })
                    console.log( `Duplicates found: ${entry.productId} ${entryWrh}`)
                }
            }

        });        

    };

    const addSales = async (reference)=> { 
        if (postingDate){
            setPostStatus('Posting Sales...')
            var totalCashSales = 0
            var totalDebt = 0      
            var totalShortage = 0 
            var totalBankSales = 0 
            const fields1 = [...accommodationRecords, ...sessionSalesRecords, ...fields]
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
                approvedBy: curApproval?.approvedBy || companyRecord?.emailid,
                // productsRef: createdAt,
                record: [...fields1]
            }
            if (curSale === null){
                newSale.productsRef = reference
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
                setCurApproval(null)
                getApprovals(company)
                setCurSale(newSale)
                setCurSaleDate(newSale.postingDate)
                setIsView(true)
                setFields([...(newSale.record)])
                getSales(company)
                const transactions = await getSalesProducts(company, newSale); 
                if (transactions.length){
                    const validEntries = {}
                    wrhs.forEach(async(wh)=>{   
                        var ctent = 0
                        validEntries[wh.name]=[] 
                        transactions.forEach((transaction)=>{
                            if (transaction.location === wh.name){
                                ctent++
                                validEntries[wh.name].push(transaction)
                            }
                        })        
                        if (!ctent){
                            delete validEntries[wh.name]
                        }
                    })               
                    setSalesEntries({...validEntries})
                }
                
                setAlertState('success')
                setAlert('Sales Posted Successfully!')
                setAlertTimeout(5000)
                setPostStatus('Post Sales')
            }
        }
    }

    const getSalesProducts = async (company, sale) => {
        if (getEntriesController.current) {
            getEntriesController.current.abort(); // Abort any ongoing fetch
            setSalesEntries({}); // Reset sales entries
        }

        const controller = new AbortController();
        getEntriesController.current = controller;
        
        const { signal } = controller;
        const response = await fetchServer("POST", {
            database: company,
            collection: "InventoryTransactions",
            prop: {
                createdAt: sale.productsRef
            }
        }, "getDocsDetails", server, signal); // plural version that returns an array

        return (Array.isArray(response.record) && response.record.length > 0) ? response.record : [];
    };

    const handleApprovalViewClick = (approval)=>{
        if(companyRecord?.permissions.includes('postSales') || companyRecord?.status==='admin'){
            setIsApprover(true)
        }
        setCurSale(null)
        setCurApproval(approval)
        setPostingDate(approval.postingDate)
        setFields([...approval.data])
        if (approval.message){
            setIsView(false)
        }else{
            setIsView(true)
        }
    }

    const handleViewClick = async (sale) =>{
        setCurSale(sale)
        setCurApproval(null)
        setCurSaleDate(sale.postingDate)
        setSalesOpts('sales')
        setIsView(true)
        setFields([...(sale.record)])
        setIsView(true)
        setIsProductApprover(false)
        const productsApprovals = approvals.filter((appr)=>{return appr.section === 'addSalesProduct'})
        if (sale.productsRef){
            const transactions = await getSalesProducts(company, sale); 
            if (transactions.length){
                const validEntries = {}
                wrhs.forEach(async(wh)=>{   
                    var ctent = 0
                    validEntries[wh.name]=[] 
                    transactions.forEach((transaction)=>{
                        if (transaction.location === wh.name){
                            ctent++
                            validEntries[wh.name].push(transaction)
                        }
                    })        
                    if (!ctent){
                        delete validEntries[wh.name]
                    }
                })              
                setSalesEntries({...validEntries})
            }        
        }else{
            const productApproval = productsApprovals.find((prappr)=>{
                return prappr.link === sale.createdAt
            })

            if (productApproval){
                if(companyRecord?.permissions.includes('addSalesProduct') || companyRecord?.status==='admin'){
                    setIsProductApprover(true)
                }
                // setSalesEntries({...(productApproval.data)})
                sale.approval = productApproval
                setCurSale(sale)
            }
        }
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
                setCurApproval(null)
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
                        employee.approvedBy = curApproval?.approvedBy || companyRecord?.emailid
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
                        sale.approvedBy = curApproval.approvedBy || companyRecord?.emailid                     
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
            update: newRental,
            approvedBy: curApproval?.approvedBy || companyRecord?.emailid
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
                {showApprovalBox && <ApprovalBox
                    onClose={()=>{
                        setShowApprovalBox(false)
                        setApprovalStatus(false)
                        setApprovalMessage('')
                    }}
                    module={salesOpts}
                    section={productAdd ? 'addSalesProduct' : `post${salesOpts}`}
                    postApprovalUpdate={()=>{
                        if (productAdd){
                            postApprovalUpdate(company, salesOpts, `addSalesProduct`, curSale.approval)
                        }else{
                            postApprovalUpdate(company, salesOpts, `post${salesOpts}`, curApproval)
                        }
                    }}
                />}     
                {showReport && <SalesReport
                    reportSales = {reportSales}
                    reportDebts = {calculateDebtReport()}
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
                {productAdd && <AddProduct
                    companyRecord={companyRecord}
                    products={products}
                    productAdd={productAdd}
                    setProductAdd={setProductAdd}
                    uoms={uoms}
                    categories={categories}
                    wrhs = {wrhs}
                    isProductView={isProductView}
                    curSale={curSale}
                    setIsProductView={setIsProductView}
                    handleProductSales={handleProductSales}
                    salesEntries={salesEntries}
                    setSalesEntries={setSalesEntries}
                    fields={fields}
                    getDate={getDate}
                    addingProducts={addingProducts}
                    setAddingProducts={setAddingProducts}
                    setPostedProducts={setPostedProducts}
                    runApprovalWorkFlow={runApprovalWorkFlow}
                    isProductApprover={isProductApprover}
                />}
                <div className='emplist saleslist' ref={scrollRef}>    
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
                                disabled={!allowBacklogs}
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
                                disabled={!allowBacklogs}
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
                                    if (new Date(fltemp.dismissalDate).getTime()>= new Date(saleFrom).getTime()){
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
                    {salesOpts1 === 'sales' && (reportSales? [reportSales] : [...ftrApprovals, ...sales]).filter((ftrsale)=>{
                        const slCreatedAt = new Date(ftrsale.postingDate).getTime()
                        const fromDate = new Date(saleFrom).getTime()
                        const toDate = new Date(saleTo).getTime()

                        if ( slCreatedAt>= fromDate && slCreatedAt<=toDate
                        ){
                            return ftrsale
                        }
                    }).map((sale, index)=>{
                        if (sale.isApproval){
                            const {createdAt, postingDate, message, handlerId, approved} = sale
                            var textColor = 'red'
                            if (approved){
                                textColor ='green'
                            }
                            return (
                                <div className={'dept sldept' + (curApproval?.createdAt===createdAt?' curview':'')} key={index} 
                                    onClick={(e)=>{
                                        handleApprovalViewClick(sale)
                                    }}
                                >
                                    <div className='dets sldets'>
                                        <div>Posting Date: <b>{getDate(postingDate)}</b></div>
                                        <div>Approval Status: <b style={{color: textColor}}>{message? 'REJECTED' : (approved? 'APPROVED': 'AWAITING APPROVAL')}</b></div>
                                        {message && <div>Message: <b>{message}</b></div>}
                                        <div className='deptdesc'>{`Requested By ID:`} <b>{`${handlerId}`}</b></div>
                                    </div>
                                    {(companyRecord.status==='admin' && !saleEmployee) && <div 
                                        className='edit'
                                        name='delete'         
                                        style={{color:'red'}}                           
                                        onClick={async ()=>{                                        
                                            setAlertState('info')
                                            setAlert('Deleting Approval Data...')
                                            setAlertTimeout(100000)

                                            const resp = await removeApproval(company, 'sales', 'addSalesProduct', {                        
                                                createdAt: createdAt,
                                                postingDate: postingDate                                                 
                                            })     
                                            
                                            if(resp.completed){
                                                setAlertState('success')
                                                setAlert('Deleted Approval Data Successfully!')
                                                setAlertTimeout(3000)
                                            }

                                        }}
                                    >
                                        Delete
                                    </div>}
                                </div>
                            )
                        }else{                            
                            const productApproval = productsApprovals.find((prappr)=>{
                                return prappr.link === sale.createdAt
                            })
                
                            if (productApproval){                               
                                sale.approval = productApproval
                            }
                            const {createdAt, postingDate, totalCashSales, totalDebt, record, 
                                totalShortage, totalDebtRecovered, totalBankSales, recoveryList, productsRef,
                                approval
                            } = sale 
                            var textColor = 'red'
                            if (approval?.approved){
                                textColor = 'green'
                            }
                            return(
                                <div className={'dept sldept' + (curSale?.createdAt===createdAt?' curview':'')} key={index} 
                                    onClick={(e)=>{
                                        handleViewClick(sale)
                                    }}
                                >
                                    {productsRef ? 
                                        <div
                                            className='slprd'
                                            onClick={()=>{
                                                setIsProductView(true)
                                                setProductAdd(true)
                                            }}
                                        > 
                                            View Products 
                                        </div> 
                                        : <span
                                            className='slprd'
                                            style  ={{
                                                border: approval? `solid ${textColor} 3px` : 'solid black 0px'
                                            }}
                                            onClick={()=>{
                                                setProductAdd(true)
                                                setIsProductView(false)
                                            }}
                                        >
                                            Add Products
                                        </span>}
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
                                            setAlert('You are about to delete the selected Sales Record. Please Delete again if you are sure!')
                                            setAlertTimeout(5000)
                                                                                        
                                            deleteSales(sale)
                                        }}
                                    >
                                        Delete
                                    </div>}
                                </div>
                            )
                        }
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
                                        setAlert('You are about to delete the selected Rental Record. Please Delete again if you are sure!')
                                        setAlertTimeout(5000)                                                                                    
                                        deleteRental(rent)
                                    }}
                                >
                                    Delete
                                </div>}
                            </div>
                        )
                  })}
                  {/* {(nextSales === null || salesLoadCount) ? <div ref={loadRef} className='scrollLoad'>
                    Loading...
                  </div> :
                  <div ref={loadRef} className='scrollLoad'>...</div>
                  } */}
                  {nextSales?.length === 0 && <div ref={loadRef} className='scrollLoad'>
                    No More Sales To Load!
                  </div>}
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
                                setCurApproval(null)
                            }}
                        /> : 
                        <MdAdd 
                            className='add slsadd'
                            onClick={()=>{
                                setCurApproval(null)
                                if (salesOpts==='sales'){
                                    setIsView(false)
                                    setFields([])
                                    setAddEmployeeId('')
                                    setCurSale(null)
                                    setIsApprover(false)
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
                                                if (new Date(fltemp.dismissalDate).getTime()>= new Date(saleFrom).getTime()){
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
                        {salesOpts==='sales' && [...accommodationRecords, ...sessionSalesRecords, ...fields].map((field, index)=>{
                            const netTotal = Number(field.cashSales) + Number(field.bankSales)+ Number(field.debt) + Number(field.shortage) - Number(field.unAccountedSales || 0)
                            // console.log(index)
                            return (
                                <div key={index} className='empsalesblk'>
                                    <div className='pdsalesview'>
                                        {`Pending Sales out of ₦${Number(field.totalSales).toLocaleString()}:`} <b> {'₦'+(Number(field.totalSales) - netTotal).toLocaleString()}</b> <b>{` ${field.postingDate? '('+getDate(field.postingDate)+')' : ''}`}</b>
                                    </div>
                                    {!isView && !field.isAccommodation && !field.isSession && <MdDelete 
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
                                            if (employee.i_d === field.employeeId){
                                                return employee
                                            }
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
                                            className='inpcov'
                                        >
                                            <div
                                                title={!field.salesPoint ? 'Please Select Sales Point Before Entering Debt':''}
                                            >
                                                Debt
                                            </div>
                                            <input 
                                                className='forminp'
                                                name='debt'
                                                type='number'
                                                placeholder='Debt'
                                                value={field.debt}
                                                style={{cursor: !field.salesPoint ? 'not-allowed':'auto'}}
                                                title={!field.salesPoint ? 'Please Select Sales Point Before Entering Debt':''}
                                                disabled={isView || (field.isAccommodation) || (field.isSession) || !field.salesPoint}
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
                                                disabled={isView || field.salesPoint || (field.isAccommodation) || (field.isSession)}
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
                                                disabled={isView || (field.isAccommodation) || (field.isSession)}
                                                onChange={(e)=>{
                                                    handleFieldChange({index, e})
                                                }}
                                            />
                                        </div>
                                        {![0, undefined, null].includes(field.unAccountedSales) && <div className='inpcov'>
                                            <div>Un-Accounted</div>
                                            <input 
                                                className='forminp'
                                                name='unAccountedSales'
                                                type='number'
                                                placeholder='Un-Accounted'
                                                value={field.unAccountedSales}
                                                disabled={isView || (field.isAccommodation) || (field.isSession)}
                                                onChange={(e)=>{
                                                    handleFieldChange({index, e})
                                                }}
                                            />
                                        </div>}
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
                    {(!isView || salesOpts === 'recovery' || curApproval!==null) && <div className='confirm'>     
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
                        {salesOpts === 'recovery' && <div className='inpcov salesinpcov'>
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
                                        Number(field.debt) + Number(field.shortage) - Number(field.unAccountedSales || 0)
                                        if (enteredSales === Number(field.totalSales)){
                                            rt++
                                            if (rt===fields.length){
                                                // setIsProductView(false)
                                                // setProductAdd(true)      
                                                const data = [...accommodationRecords, ...sessionSalesRecords, ...fields]
                                                runApprovalWorkFlow(curApproval, 'sales', 'postsales', data, addSales)                                                                                                  
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
                        >{curApproval ? (curApproval.approved? postStatus: (isApprover?'Approve Request':'Request Approval')) : (isApprover?'Approve Request':'Request Approval')}</div>} 
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
                                        runApprovalWorkFlow(curApproval, 'sales', 'postRecovery', recoveryFields, postRecovery)
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
                        >{recoveryStatus ? (curApproval?.approved? rentalsStatus: (isApprover?'Approve Request':'Request Approval')) : (isApprover?'Approve Request':'Request Approval')}</div>}
                        {salesOpts === 'rentals' && <div className='yesbtn salesyesbtn'
                            style={{
                                cursor:(rentalFields.paymentAmount && rentalFields.expectedPayment)?'pointer':'not-allowed'
                            }}
                            onClick={()=>{
                                if (rentalFields.paymentAmount && rentalFields.expectedPayment){
                                    runApprovalWorkFlow(curApproval, 'sales', 'postRentals', rentalFields, postRentals)                                    
                                }
                            }}
                        >{curApproval ? (curApproval.approved? rentalsStatus: (isApprover?'Approve Request':'Request Approval')) : (isApprover?'Approve Request':'Request Approval')}</div>}                        
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
                            disabled={isView || (field.isAccommodation) || (field.isSession)}
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


const AddProduct = ({
    products, productAdd, setProductAdd, categories, uoms, wrhs, isProductView, curSale,
    setIsProductView, handleProductSales, salesEntries, setSalesEntries, fields,
    getDate, companyRecord, addingProducts, setAddingProducts, setPostedProducts,
    runApprovalWorkFlow, isProductApprover
})=>{    
    const [category, setCategory] = useState('all')
    const [wrh, setWrh] = useState(isProductView ? Object.keys(salesEntries)[0] : 'open bar1' )
    const [totalSalesAmount, setTotalSalesAmount] = useState(0)
    const [totalAmount, setTotalAmount] = useState(0)
    const targetRef = useRef(null)

    const printToPDF = () => {
        const element = targetRef.current;
        const options = {
            margin:       0.1,
            filename:     `PRODUCT SALES DETAILS ${getDate(curSale.postingDate)}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'A4', orientation: 'portrait' }
        };
        html2pdf().set(options).from(element).save();
    };

    const resetSalesEntries = ()=>{
        const allEntries = {}
        const wrhEntries = [...products].map((product, index)=>{
            const uom1 = uoms.filter((uom)=>{
                return uom.code === product.purchaseUom
            })      

            const purchaseWrh = wrhs.find((warehouse)=>{
                return warehouse.purchase
            })
            const {cost, quantity} = product.locationStock?.[purchaseWrh?.name] || {cost: 0, quantity: 0}
            let cummulativeUnitCostPrice = 0            
            cummulativeUnitCostPrice = quantity? parseFloat(Math.abs(Number(cost/quantity))).toFixed(2) : 0

            return {                
                productId : product.i_d,
                index: index,
                name: product.name,
                category: product.category,
                quantity: '',
                baseQuantity: 0,
                salesUom: product.salesUom,
                baseUom: uom1[0]?.base,
                costPrice: cummulativeUnitCostPrice,
                salesPrice: product.salesPrice,
                vipPrice: product.vipPrice,
                totalSales: '',
                entryType: 'Sales',
                documentType: 'Shipment'
            }
        })

        
        wrhs.forEach((wrh)=>{
            if (!wrh.purchase){
                allEntries[wrh.name] = [...wrhEntries]
            }
        })
        setSalesEntries(allEntries)
    }

    const setApprovalEntries = (approval)=>{
        const allEntries = {}
        const wrhEntries = [...products].map((product, index)=>{
            const uom1 = uoms.filter((uom)=>{
                return uom.code === product.purchaseUom
            })      

            const purchaseWrh = wrhs.find((warehouse)=>{
                return warehouse.purchase
            })
            const {cost, quantity} = product.locationStock?.[purchaseWrh?.name] || {cost: 0, quantity: 0}
            let cummulativeUnitCostPrice = 0            
            cummulativeUnitCostPrice = quantity? parseFloat(Math.abs(Number(cost/quantity))).toFixed(2) : 0

            return {                
                productId : product.i_d,
                index: index,
                name: product.name,
                category: product.category,
                quantity: '',
                baseQuantity: 0,
                salesUom: product.salesUom,
                baseUom: uom1[0]?.base,
                costPrice: cummulativeUnitCostPrice,
                salesPrice: product.salesPrice,
                vipPrice: product.vipPrice,
                totalSales: '',
                entryType: 'Sales',
                documentType: 'Shipment'
            }
        })

        wrhs.forEach((wrh)=>{
            if (!wrh.purchase){
                if (approval.data[wrh.name]){
                    allEntries[wrh.name] = approval.data[wrh.name]
                }else{
                    if (approval.data[wrh.name]?.length && approval.message){
                        allEntries[wrh.name] = approval.data[wrh.name]                        
                    }else{
                        allEntries[wrh.name] = [...wrhEntries]
                    }
                }
            }
        })

        setSalesEntries(allEntries)
    }
    useEffect(()=>{
        setAddingProducts(false)
        if (!isProductView){
            if (curSale!==null && localStorage.getItem(`sales-${curSale?.createdAt}`)){
                if (!curSale.approval){
                    setSalesEntries(JSON.parse(localStorage.getItem(`sales-${curSale.createdAt}`)))
                }else{
                    // console.log(curSale.approval)
                    setApprovalEntries(curSale.approval)
                }

            }else if (!localStorage.getItem(`sales-${curSale?.createdAt}`)){
                if (!curSale.approval){
                    resetSalesEntries()
                }else{
                    setApprovalEntries(curSale.approval)
                }
            }
        }
    },[])
    
    useEffect(()=>{
        var totalAmount = 0
        Object.keys(salesEntries).forEach((wh)=>{   
            salesEntries[wh].forEach((entry)=>{
                if (entry.totalSales){
                    totalAmount += Number(entry.totalSales)
                }
            })
        })
        setTotalAmount(totalAmount)
        if (curSale!==null){
            const {createdAt, postingDate, totalCashSales, totalDebt, record, 
                totalShortage, totalDebtRecovered, totalBankSales, recoveryList, productsRef 
            } = (curSale || {})
            var accommodationAmount = 0
            record.forEach((saleRecord)=>{
                if (saleRecord.salesPoint === 'accomodation'){
                    accommodationAmount += Number(saleRecord.totalSales)
                }
            })
            const totalSalesAmount = Number(totalCashSales)+Number(totalBankSales)+Number(totalDebt)+Number(totalShortage) - accommodationAmount
            setTotalSalesAmount(totalSalesAmount)
        }else{
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
            const totalSalesAmount = totalCashSales + totalBankSales + totalDebt + totalShortage
            setTotalSalesAmount(totalSalesAmount)
        }
        if (isProductView){
            setWrh(Object.keys(salesEntries)[0])
        }
    },[salesEntries])

    const handleSalesUdpate = (e, index)=>{
        const name = e.target.getAttribute('name')
        const value = e.target.value
        if (name){
            if (name === 'quantity'){
                const uom2 = uoms.filter((uom)=>{
                    return uom.code === salesEntries[wrh][index].salesUom
                })
                const originalEntries = structuredClone({salesEntries})
                var updatedWrh = [...salesEntries[wrh]]
                updatedWrh[index][name] = Number(value)
                updatedWrh[index].baseQuantity = Number(value) * Number(uom2[0]?.multiple)                
                if (wrh === 'vip'){
                    updatedWrh[index].totalSales = updatedWrh[index].baseQuantity * (Number(updatedWrh[index].vipPrice) || Number(updatedWrh[index].salesPrice))
                }else if (wrh === 'kitchen'){
                    updatedWrh[index].totalVipSales = updatedWrh[index].baseQuantity * (Number(updatedWrh[index].vipPrice) || Number(updatedWrh[index].salesPrice))
                    updatedWrh[index].totalSales = updatedWrh[index].baseQuantity * Number(updatedWrh[index].salesPrice)
                }
                else{
                    updatedWrh[index].totalSales = updatedWrh[index].baseQuantity * Number(updatedWrh[index].salesPrice)
                }
                setSalesEntries({...(originalEntries.salesEntries), [wrh]: updatedWrh})
            }else{
                const originalEntries = structuredClone({salesEntries})
                var updatedWrh = [...salesEntries[wrh]]
                updatedWrh[index][name] = Number(value)
                setSalesEntries({...(originalEntries.salesEntries), [wrh]: updatedWrh})                
            }
        }
    }
    return (
        <>
            <div className='addproduct'>
                <div className='add-products' ref={targetRef}>
                    <div className='slprwh-cover' onClick={(e)=>{
                        const name = e.target.getAttribute('name')
                        if (name){
                            setCategory('all')
                            setWrh(name)
                        }
                    }}>
                        {
                            wrhs.map((wh, id)=>{
                                if (!wh.purchase){
                                    if (isProductView){
                                        return Object.keys(salesEntries).includes(wh.name) && <div key={id} className={'slprwh ' + (wrh === wh.name ? 'slprwh-clicked' : '')} name={wh.name}>{wh.name}</div>
                                    }else{
                                        return <div key={id} className={'slprwh ' + (wrh === wh.name ? 'slprwh-clicked' : '')} name={wh.name}>{wh.name}</div>
                                    }
                                }
                            })                        
                        }
                        <div className='slprwh-cover-txt'>{`Remaining (${(Number(totalSalesAmount) - Math.abs(Number(totalAmount))).toLocaleString()}) Out Of ${(Number(totalSalesAmount)).toLocaleString()}`}</div>
                        {(isProductView || (!curSale.approval?.message && curSale.approval !== undefined)) && <div
                            className='slprwh-print'
                            onClick={()=>{
                                resetSalesEntries()
                            }}
                        >Reset</div>}
                        {companyRecord?.status==='admin' && isProductView && <div
                            className='slprwh-print'
                            onClick={()=>{
                                printToPDF()
                            }}
                        >Print Product</div>}
                    </div>
                    <div>
                        <select 
                            className='slprfl'
                            type='text'
                            name='category'
                            value={category}
                            onChange={(e)=>{setCategory(e.target.value)}}
                        >
                            <option value={'all'}>Filter Products</option>
                            {categories.map((cat, id)=>{
                                return (wrhs.find((wh)=>{return wh.name === wrh})?.productCategories?.includes(cat.code) && <option key={id} value={cat.code}>{cat.name}</option>)
                            })}
                        </select>
                    </div>
                    <div className='add-products-title slprwh-add'>Product Sales Details</div>
                    <div className='add-products-content'>
                        <div className='add-products-content-title'>
                            <div>Product Name</div>
                            <div>Product ID</div>
                            <div>Sales Quantity</div>
                            <div>Sales UOM</div>
                            <div>{
                                `
                                    Total Sales Amount
                                    ${(companyRecord.status==='admin') ? 
                                        (`(${salesEntries[wrh]?.reduce((sum, entry) => sum + Math.abs(Number(entry.totalSales)), 0).toLocaleString()})`)
                                        : ''
                                    }
                                ` 
                            }</div>
                        </div>
                        {Object.keys(salesEntries).length === 0 && isProductView && <div className='load-products'><span>Loading Sales Products...</span></div>}
                        {salesEntries[wrh]?.filter((flent)=>{
                            if (flent.salesPrice || flent.vipPrice){
                                if (category === 'all'){
                                    if (wrhs.find((wh)=>{return wh.name === wrh})?.productCategories?.includes(flent.category)){
                                        return flent
                                    }
                                }else{
                                    return flent.category === category
                                }
                            }
                        }).sort((a,b) => {
                            const numA = parseInt(a.productId.replace("PD", ""), 10);
                            const numB = parseInt(b.productId.replace("PD", ""), 10);
                            return numA - numB;
                        }).map((entry, index)=>{
                            return (
                                <div key={index} className='add-products-content-entry'>
                                    <div>{entry.name}</div>
                                    <div>{entry.productId}</div>
                                    <div>
                                        <input 
                                            type='number'
                                            name='quantity'
                                            value={isProductView? Math.abs(Number(entry.quantity)) : entry.quantity}
                                            onChange={(e)=>{handleSalesUdpate(e, entry.index)}}
                                            disabled={isProductView || (!curSale.approval?.message && curSale.approval !== undefined)}
                                        />
                                    </div>
                                    <div>
                                        <select 
                                            name='salesUom'
                                            value={entry.salesUom}
                                            onChange={(e)=>{handleSalesUdpate(e, entry.index)}}
                                            disabled={isProductView || (!curSale.approval?.message && curSale.approval !== undefined)}
                                        >
                                            {uoms.map((uom, idx)=>{
                                                return (
                                                    <option key={idx} value={uom.code}>{uom.name}</option>
                                                )
                                            })}
                                        </select>
                                    </div>
                                    <div>
                                        <select 
                                            name='totalSales'
                                            type='number'
                                            value={isProductView? Math.abs(Number(entry.totalSales)) : entry.totalSales}
                                            disabled = {wrh!=='kitchen' || !entry.quantity || isProductView || (!curSale.approval?.message && curSale.approval !== undefined)}
                                            onChange={(e)=>{handleSalesUdpate(e, entry.index)}}
                                        >
                                            <option value = {isProductView? Math.abs(Number(entry.totalSales)) : entry.totalSales}>{isProductView? Math.abs(Number(entry.totalSales)) : entry.totalSales}</option>
                                            <option value = {isProductView? Math.abs(Number(entry.totalVipSales)) : entry.totalVipSales}>{isProductView? Math.abs(Number(entry.totalVipSales)) : entry.totalVipSales}</option>
                                        </select>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className='add-products-button'>
                        {!isProductView && <div 
                            className='add-products-button-add'
                            style={{cursor: addingProducts? 'not-allowed':'pointer'}}
                            onClick={()=>{
                                if (!addingProducts){
                                    setAddingProducts(true)                                    
                                    handleProductSales()                                    
                                }
                            }}
                        >{curSale === null ? 
                            (curSale.approval?.approved ? 'Add and Post' : (isProductApprover? 'Approve Request' : 'Request Approval')) 
                            : (curSale.approval?.approved ? 'Save' : (isProductApprover? 'Approve Request' : 'Request Approval')) 
                        }</div>}
                        <div 
                            className='add-products-button-cancel'
                            onClick={()=>{
                                setPostedProducts([])
                                setIsProductView(false)
                                setProductAdd(false)
                                if(!isProductView){
                                    if(curSale!==null && curSale.approval===undefined){
                                        localStorage.setItem(`sales-${curSale.createdAt}`, JSON.stringify(salesEntries));
                                    }
                                }
                                setSalesEntries({})
                            }}
                        >{isProductView?'Close':'Cancel'}</div>
                    </div>
                </div>
            </div>
        </>
    )
}