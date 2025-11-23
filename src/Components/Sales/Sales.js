import './Sales.css'
import PaymentReceiptsModal from '../DashView/PaymentReceiptsModal';
import heic2any from "heic2any";
import { useState, useEffect, useContext, useRef } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import ApprovalBox from '../../Resources/ApprovalBox/ApprovalBox';
import { FaChevronDown, FaChevronUp, FaReceipt } from "react-icons/fa";
import { FaTableCells } from "react-icons/fa6";
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import html2pdf, { f } from 'html2pdf.js';
import SalesReport from './SalesReport/SalesReport';
import RentalReceipt from './RentalReceipt/RentalReceipt';
import { uploadFile, updateFile, getFileUrl, deleteFile, createFolder } from '../../Resources/ClientServerAPIConn/API/fileCrudApi';
import DebtReport from './DebtReport/DebtReport';
import Notify from '../../Resources/Notify/Notify';
import { MdAdd } from "react-icons/md";
import { RxReset } from "react-icons/rx";
import { MdDelete } from "react-icons/md";
import { use } from 'react';
import { BsPass } from 'react-icons/bs';

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
        curApproval, setCurApproval, showApprovalBox, setShowApprovalBox,
        approvals, getApprovals, postApprovalUpdate, runApprovalWorkFlow, removeApproval,
        setApprovalStatus, setApprovalMessage,   
        paymentReceipts, obtainPaymentReceipts,            
    } = useContext(ContextProvider)

    const recoveryReasons = [    
        {
            i_d: 1,
            value: 'Sales Debt',
        },
        {
            i_d: 2,
            value: 'Unpresented POS Receipt',
        },
        {
            i_d: 3,
            value: 'Mismatched POS Pay Point',
        }
    ]
    const payPoints = {
        'moniepoint1':'', 'moniepoint2':'', 
        'moniepoint3':'', 'moniepoint4':'', 'cash':''
    }

    const payPointAccounts = {
        'moniepoint1':'MP1-8198068382', 'moniepoint2':'MP2-5342270174', 
        'moniepoint3':'MP3-5399647958', 'moniepoint4':'MP4-5536588063', 
        'cash':'CASH', 'Employee':'EMPLOYEE'
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
    const [showReceiptsModal, setShowReceiptsModal] = useState(false)
    const [reportSales, setReportSales] = useState(null)
    const [isMultiple, setIsMultiple] = useState(false)
    const [saleEmployee, setSaleEmployee] = useState('')
    const [addEmployeeId, setAddEmployeeId] = useState('')
    const [addKitchenEmployeeId, setAddKitchenEmployeeId] = useState('')
    
    const [isDebtSales, setIsDebtSales] = useState(false)
    const [debtCalculated, setDebtCalculated] = useState(false)
    let debtCalcInterval = null
    
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
        
    const [isApprover, setIsApprover] = useState(false)
    const [isProductApprover, setIsProductApprover] = useState(false)
    const [ftrApprovals, setFtrApprovals] = useState([])
    const [productsApprovals, setProductsApprovals] = useState([])
    const [salesApprovals, setSalesApprovals] = useState([])
    const [rentalsApprovals, setRentalsApprovals] = useState([])
    const [recoveryApprovals, setRecoveryApprovals] = useState([])
    
    const [curSaleDate, setCurSaleDate] = useState(null)
    const [activeSessions, setActiveSessions] = useState([])
    const [pendingSales, setPendingSales] = useState([])
    const scrollRef = useRef(null)
    const loadRef = useRef(null)
    const getEntriesController = useRef(null)

    const [imageUpload, setImageUpload] = useState(null)
    const [uploadingReceipt, setUploadingReceipt] = useState(false)
    const [deletingReceipt, setDeletingReceipt] = useState(false)

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
        recoveryReason: '',
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
    const [kitchenRecords, setKitchenRecords] = useState([])
    const [accommodationRecords, setAccommodationRecords] = useState([])
    const [sessionSalesRecords, setSessionSalesRecords] = useState([])
    const [wrhCategories, setWrhCategories] = useState({})
    const [fields, setFields] = useState([])
    const [recoveryFields, setRecoveryFields] = useState([])
    const [rentalFields, setRentalFields] = useState({
        ...defaultRentalFields
    })
    const [isView, setIsView] = useState(false)

    const [postingRecovery, setPostingRecovery] = useState(false)
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
        getApprovals(cmp_val)
        getAllSessions(cmp_val)
        getSales(cmp_val)
        getEmployees(cmp_val)
        getRentals(cmp_val)
        getAccommodations(cmp_val)
        const intervalId = setInterval(()=>{
            if (cmp_val){
                getApprovals(cmp_val)
                getSales(cmp_val)
                getEmployees(cmp_val)
                getRentals(cmp_val)
                getAccommodations(cmp_val)
                getAllSessions(cmp_val)
            }
        },20000)
        return () => clearInterval(intervalId);
    },[window.localStorage.getItem('sessn-cmp')])


    useEffect(()=>{
        const ftrsales = sales.sort((a,b) =>{return new Date(b.postingDate).getTime() > new Date(a.postingDate)})
        const pendings = ftrsales.slice(1,20).filter((sl)=>{
            let unAccountedSalesDebt = 0
            const record = sl.record
            record.forEach((rec)=>{
                unAccountedSalesDebt += Number(rec.unAccountedSales || 0)         
            })
            return ((!sl.productsRef && unAccountedSalesDebt >=200) && sl.postingDate < postingDate)
        })
        setPendingSales(pendings)
    },[sales, postingDate])

    useEffect(()=>{
        if (wrhs.length){
            setWrhCategories((wrhCategories)=>{
                const cat = {}
                wrhs.forEach((wrh)=>{
                    if (!wrh.purchase){
                        cat[wrh.name] = wrh.productCategories
                    }
                })
                return {...cat}
            })
        }
    },[wrhs])

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
        if (accommodationRecords !== accommodationRecord){
            setAccommodationRecords(accommodationRecord)
        }
    },[accommodations, postingDate, isView, saleEmployee]) 

    useEffect(()=>{
        var sessionSalesRecord = []
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
            var activeSessions = []
            const salesEndDate = new Date(postingDate1)
            salesEndDate.setDate(salesEndDate.getDate() + 1)
            let multSessions = [] 
            allSessions.forEach((session)=>{
                let bmultSessions = {}
                let kmultSessions = {}
                let ordersToSkip = []
                let foundMult = false
                if (getSessionEnd(session.start) === getSessionEnd(salesEndDate)){
                    const employeeId = session.employee_id
                    if (!sessionEmployees.includes(employeeId)){
                        sessionEmployees = sessionEmployees.concat(employeeId)
                    }
                    session?.orders?.forEach((sessionOrders)=>{
                        const employeeId = sessionOrders.lastDeliveredBy
                        if (employeeId && !sessionEmployees.includes(employeeId)){
                            sessionEmployees = sessionEmployees.concat(employeeId)
                        }
                    })
                    if (!session.end){
                        activeSessions.push(session.i_d)
                    }
                    if (session.type === 'sales'){
                        const sessionOrders = session?.orders || []
                        sessionOrders.forEach((sessionOrder)=>{
                            const salesPostsPay = Object.keys(sessionOrder?.salesPosts || {})
                            salesPostsPay.forEach((pay)=>{
                                if (sessionOrder.salesPosts[pay] !== 'multiple'){
                                    ordersToSkip.push(sessionOrder)
                                }
                            })
                        })
                    }

                    const sessionCopy = (structuredClone({session})).session
                    if (sessionCopy.type === 'sales'){
                        const sessionOrders = sessionCopy?.orders || []
                        sessionOrders.forEach((sessionOrder)=>{
                            const salesPostsPay = Object.keys(sessionOrder?.salesPosts || {})
                            let multTotalPayment = 0
                            let multTotalSales = 0
                            salesPostsPay.forEach((pay)=>{
                                if (sessionOrder.salesPosts[pay] === 'multiple'){
                                    foundMult = true
                                    let splitPayment = {}
                                    const totalOrderPayment = Number(sessionOrder?.totalPayment || 0)
                                    const totalOrderSales = Number(sessionOrder?.totalSales || 0)
                                    let kct = 0
                                    let bct = 0
                                    const warehouse = sessionOrder.wrh
                                    let blastDeliveredBy = ''
                                    sessionOrder.items.forEach((item)=>{
                                        const totalItemPrice = (Number(item.deliveredQuantity || 0) * (warehouse === 'vip' ? Number(item.vipPrice || item.salesPrice) : Number(item.salesPrice)))
                                        if (wrhCategories[warehouse].includes(item.category)){
                                            bct += totalItemPrice
                                            blastDeliveredBy = item.lastDeliveredBy
                                        }else if (wrhCategories['kitchen'].includes(item.category)){
                                            kct += totalItemPrice
                                        }
                                        const employeeId = item.lastDeliveredBy
                                        if (employeeId && !sessionEmployees.includes(employeeId)){
                                            sessionEmployees = sessionEmployees.concat(employeeId)
                                        }
                                    })
                                    splitPayment[warehouse] = (totalOrderPayment ? (Number(bct)/totalOrderSales) : 0)
                                    splitPayment['kitchen'] = (totalOrderPayment ? (Number(kct)/totalOrderSales) : 0)
                                    sessionOrder.salesPosts[pay] = warehouse
                                    const orderPay = structuredClone({orderPay: sessionOrder[pay]}).orderPay
                                    sessionOrder[pay] = (splitPayment[warehouse] * orderPay)                                    
                                    multTotalPayment += splitPayment[warehouse] * orderPay
                                    multTotalSales += splitPayment[warehouse] * orderPay
                                    sessionOrder.lastDeliveredBy = blastDeliveredBy
                                }
                            })
                            sessionOrder.totalPayment = multTotalPayment
                            sessionOrder.totalSales = multTotalSales
                        })
                    }
                    bmultSessions = (structuredClone({sessionCopy})).sessionCopy                                                    

                    const sessionCopy1 = (structuredClone({session})).session
                    if (sessionCopy1.type === 'sales'){
                        const sessionOrders = sessionCopy1?.orders || []
                        sessionOrders.forEach((sessionOrder)=>{
                            const salesPostsPay = Object.keys(sessionOrder?.salesPosts || {})
                            let multTotalPayment = 0
                            let multTotalSales = 0
                            salesPostsPay.forEach((pay)=>{
                                if (sessionOrder.salesPosts[pay] === 'multiple'){
                                    foundMult = true
                                    let splitPayment = {}
                                    const totalOrderPayment = Number(sessionOrder?.totalPayment || 0)
                                    const totalOrderSales = Number(sessionOrder?.totalSales || 0)
                                    let kct = 0
                                    let bct = 0
                                    const warehouse = sessionOrder.wrh
                                    let klastDeliveredBy = ''
                                    sessionOrder.items.forEach((item)=>{
                                        const totalItemPrice = (Number(item.deliveredQuantity || 0) * (warehouse === 'vip' ? Number(item.vipPrice || item.salesPrice) : Number(item.salesPrice)))
                                        if (wrhCategories[warehouse].includes(item.category)){
                                            bct += totalItemPrice
                                        }else if (wrhCategories['kitchen'].includes(item.category)){
                                            kct += totalItemPrice
                                            klastDeliveredBy = item.lastDeliveredBy
                                        }
                                        const employeeId = item.lastDeliveredBy
                                        if (employeeId && !sessionEmployees.includes(employeeId)){
                                            sessionEmployees = sessionEmployees.concat(employeeId)
                                        }
                                    })
                                    splitPayment[warehouse] = (totalOrderPayment ? (Number(bct)/totalOrderSales) : 0)
                                    splitPayment['kitchen'] = (totalOrderPayment ? (Number(kct)/totalOrderSales) : 0)
                                    
                                    sessionOrder.salesPosts[pay] = 'kitchen'
                                    const orderPay = structuredClone({orderPay: sessionOrder[pay]}).orderPay
                                    sessionOrder[pay] = (splitPayment['kitchen'] * orderPay)                                    
                                    multTotalPayment += splitPayment['kitchen'] * orderPay
                                    multTotalSales += splitPayment['kitchen'] * orderPay
                                    sessionOrder.lastDeliveredBy = klastDeliveredBy                                   
                                }
                            })
                            sessionOrder.totalPayment = multTotalPayment
                            sessionOrder.totalSales = multTotalSales
                        })
                    }
                    kmultSessions = (structuredClone({sessionCopy1})).sessionCopy1
                }

                if (foundMult){
                    const ordersToSkipCopy = (structuredClone({ordersToSkip})).ordersToSkip
                    const ordersToSkipCopy1 = (structuredClone({ordersToSkip})).ordersToSkip
                    bmultSessions.orders = bmultSessions.orders?.filter((sessionOr)=>{return !ordersToSkipCopy.find((order)=>{return order.orderNumber === sessionOr.orderNumber})})
                    kmultSessions.orders = kmultSessions.orders?.filter((sessionOr)=>{return !ordersToSkipCopy1.find((order)=>{return order.orderNumber === sessionOr.orderNumber})})
                    if (!multSessions.includes(kmultSessions) && !multSessions.includes(bmultSessions)){
                        multSessions = multSessions.concat([kmultSessions, bmultSessions])
                    }
                }
            })
            // console.log(multSessions)
            setActiveSessions(activeSessions)
            let mct = 0
            sessionEmployees.forEach((employeeId)=>{  
                if (employeeId !== null){
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
    
                    let deliverySessions = []
                    let salesSessions = []
                    wrhPoints.forEach((wh)=>{
                        let wrhSessionOrders = []
                        const saleRecord = {}
                        saleRecord.isSession = true
                        const updatedAllSessions = [...multSessions, ...allSessions]
                        updatedAllSessions.forEach((session)=>{                        
                            const salesEndDate = new Date(postingDate1)
                            salesEndDate.setDate(salesEndDate.getDate() + 1);                        
                            const sessionOrders = session?.orders || []
                            sessionOrders.forEach((sessionOrder)=>{
                                if ((sessionOrder.lastDeliveredBy === employeeId || sessionOrder.handlerId === employeeId)
                                    && session.type === 'sales' && (session.totalSalesAmount || session.debtDue || session.unAccountedSales || session.totalPendingSales) && session.end && (sessionOrder.status === 'completed' || session.totalPendingSales)
                                    && sessionOrder.delivery === 'completed' && getSessionEnd(session.start) === getSessionEnd(salesEndDate)
                                ){
                                    
                                    const salesPostsPay = Object.keys(sessionOrder?.salesPosts || {})
                                    let wct = 0
                                    salesPostsPay.forEach((pay)=>{
                                        let splitPayment = {}
                                        if (sessionOrder?.salesPosts[pay] ===  wh){
                                            wct++
                                            splitPayment[wh] = 1        
                                            if (wct>1){
                                                splitPayment['exclude'] = true
                                            }       
    
                                            if (sessionOrder.handlerId === employeeId){
                                                wrhSessionOrders.push({session, sessionOrder, splitPayment})                                                        
                                            }else{
                                                if(session.employee_id !== employeeId && wh === 'kitchen'){
                                                    wrhSessionOrders.push({session, sessionOrder, splitPayment})                                                        
                                                }
                                            }
                                            sessionOrder?.deliverySessions?.forEach((deliverySession)=>{
                                                if (!deliverySessions.includes(deliverySession)){
                                                    deliverySessions.push(deliverySession)
                                                }   
                                            })
    
                                            if (!salesSessions.includes(sessionOrder.sessionId)){
                                                salesSessions.push(sessionOrder.sessionId)
                                            }
                                        }                                    
                                    })
                                }
                            })
    
                        })
                        // console.log('for warehouse:',wh,'by',employeeId,'wrhSessionOrders is:',wrhSessionOrders)
                        wrhSessionOrders.forEach(({session, sessionOrder, splitPayment}, index)=>{
                            if (session.employee_id !== employeeId && wh === 'kitchen'){
                                
                                let tcashSales = 0
                                let tbankSales = 0
                                Object.keys(totalWrhTransactions[wh].allPayPoints).forEach((payPoint)=>{
                                    if (sessionOrder[payPoint]){
                                        totalWrhTransactions[wh].allPayPoints[payPoint]  = (Number(totalWrhTransactions[wh].allPayPoints[payPoint]) + (Number(sessionOrder[payPoint]) * (splitPayment['exclude'] ? 0 : splitPayment[wh])))
                                        totalWrhTransactions[wh].cashSales += (payPoint === 'cash' ? (Number(sessionOrder['cash']) * (splitPayment['exclude'] ? 0 : splitPayment[wh])) : 0)
                                        totalWrhTransactions[wh].bankSales += (payPoint !== 'cash' ? (Number(sessionOrder[payPoint]) * (splitPayment['exclude'] ? 0 : splitPayment[wh])) : 0)
                                        tbankSales += (payPoint !== 'cash' ? (Number(sessionOrder[payPoint]) * (splitPayment['exclude'] ? 0 : splitPayment[wh])) : 0)
                                        tcashSales += (payPoint === 'cash' ? (Number(sessionOrder['cash']) * (splitPayment['exclude'] ? 0 : splitPayment[wh])) : 0)
                                    }                            
                                })
                                totalWrhTransactions[wh].totalSales += (tbankSales + tcashSales)
                            }else{                            
                                if (session.wrh === wh){
                                    let tcashSales = 0
                                    let tbankSales = 0
                                    Object.keys(totalWrhTransactions[wh].allPayPoints).forEach((payPoint)=>{
                                        if (sessionOrder[payPoint]){
                                            totalWrhTransactions[wh].allPayPoints[payPoint]  = Number(totalWrhTransactions[wh].allPayPoints[payPoint]) + (Number(sessionOrder[payPoint]) * (splitPayment['exclude'] ? 0 : splitPayment[wh]))
                                            totalWrhTransactions[wh].cashSales += (payPoint === 'cash' ? (Number(sessionOrder['cash']) * (splitPayment['exclude'] ? 0 : splitPayment[wh])) : 0)
                                            totalWrhTransactions[wh].bankSales += (payPoint !== 'cash' ? (Number(sessionOrder[payPoint]) * (splitPayment['exclude'] ? 0 : splitPayment[wh])) : 0)
                                            tbankSales += (payPoint !== 'cash' ? (Number(sessionOrder[payPoint]) * (splitPayment['exclude'] ? 0 : splitPayment[wh])) : 0)
                                            tcashSales += (payPoint === 'cash' ? (Number(sessionOrder['cash']) * (splitPayment['exclude'] ? 0 : splitPayment[wh])) : 0)
                                        }                            
                                    })
                                    totalWrhTransactions[wh].totalSales += (tbankSales + tcashSales)
                                    if (index === wrhSessionOrders.length-1){ 
                                        const {totalSalesAmount, debtDue, unAccountedSales} = session
                                        totalWrhTransactions[wh].debt += Number(debtDue)
                                        totalWrhTransactions[wh].unAccountedSales += Number(unAccountedSales)
                                        totalWrhTransactions[wh].totalSales += Number(unAccountedSales)                        
                                    }
                                }
    
                            }
    
                        })
                        
                        if (wrhSessionOrders.length && totalWrhTransactions[wh].totalSales){
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
                            saleRecord.salesSessions = salesSessions
                            saleRecord.deliverySessions = deliverySessions
                            Object.keys(salesUnits1).forEach((saleUnit)=>{
                                saleRecord[saleUnit] = salesUnits1[saleUnit]
                            })
                            sessionSalesRecord.push(saleRecord)
                        }
                    })
                }              
            })
        }else{
            setActiveSessions([])
        }
        if (sessionSalesRecords !== sessionSalesRecord){
            setSessionSalesRecords(sessionSalesRecord)
        }
    },[allSessions, postingDate, isView, saleEmployee])

    useEffect(()=>{
        const findKitchenField = fields.find((field)=>{return field.isSplit})
        if (findKitchenField){
            const kitchenRecords1 = []
            const kitchenSalesPersons = []
            fields.forEach((record)=>{
                if (!kitchenSalesPersons.includes(record.kitchenEmployeeId)){
                    kitchenSalesPersons.push(record.kitchenEmployeeId)
                }
            })
    
            kitchenSalesPersons.forEach((employeeId)=>{
                const kitchenRecord = {}
                let totalKitchenAmount = 0
                let totalCashSales = 0
                let totalBankSales = 0
                const allPayPoints = {...payPoints}
                fields.forEach((field)=>{
                    if (field.kitchenEmployeeId === employeeId){
                        totalKitchenAmount += Number(field.kitchenCashSales || 0) + Number(field.kitchenBankSales || 0)
                        totalCashSales += Number(field.kitchenCashSales || 0)
                        totalBankSales += Number(field.kitchenBankSales || 0)
                        Object.keys(salesUnits).forEach((salesUnit)=>{
                            Object.keys(payPoints).forEach((payPoint)=>{
                                allPayPoints[payPoint] = Number(allPayPoints[payPoint]) + Number(field[`Kitchen-${salesUnit}`]?.[payPoint] || 0)
                            })
                        })
                    }
                })
                const salesUnits1 = {...salesUnits}
                salesUnits1['kitchen'] = {...allPayPoints}
                kitchenRecord.isKitchen = true
                kitchenRecord.employeeId = employeeId
                kitchenRecord.totalSales = totalKitchenAmount
                kitchenRecord.cashSales = totalCashSales
                kitchenRecord.bankSales = totalBankSales
                kitchenRecord.debt = ''
                kitchenRecord.shortage = ''
                kitchenRecord.debtRecovered = ''
                kitchenRecord.salesPoint = 'kitchen'
                Object.keys(salesUnits1).forEach((saleUnit)=>{
                    kitchenRecord[saleUnit] = salesUnits1[saleUnit]
                })
                kitchenRecords1.push(kitchenRecord)
            })
            if (kitchenRecords.length !== kitchenRecords1){
                setKitchenRecords(kitchenRecords1)
            }
        }
    },[fields])

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
        setKitchenRecords([])
        if (salesOpts!=='sales'){
            setIsView(false)
            setFields([])
            setRecoveryFields([])
            setAddEmployeeId('')
            setAddKitchenEmployeeId('')
            setIsDebtSales(false)
            setCurSale(null)
        }else{                                  
            setIsView(false)                             
            setCurRent(null)
            setRentalFields({...defaultRentalFields})
            setRecoveryFields([])
        }
    },[salesOpts])

    useEffect(()=>{
        if (Array.isArray(approvals)){
            setFtrApprovals(approvals.filter((appr)=>{return appr.section.toUpperCase() === `post${salesOpts}`.toUpperCase()}))
            setProductsApprovals(approvals.filter((appr)=>{return appr.section === 'addSalesProduct'}))
        }
    },[approvals, salesOpts])

    useEffect(()=>{
        setSalesApprovals(approvals.filter((appr)=>{
            return (
                (appr.section.toUpperCase() === `postSales`.toUpperCase() 
                || appr.section.toUpperCase() === `addSalesProduct`.toUpperCase())
                && (!appr.approved && !appr.message)
            )
        }))
        setRentalsApprovals(approvals.filter((appr)=>{
            return (
                appr.section.toUpperCase() === 'postRentals'.toUpperCase()
                && (!appr.approved && !appr.message)
            )
        }))
        setRecoveryApprovals(approvals.filter((appr)=>{
            return (
                appr.section.toUpperCase() === 'postRecovery'.toUpperCase()
                && (!appr.approved && !appr.message)
            )
        }))
    },[approvals])

    useEffect(()=>{
        if (curSale){
            setPostingDate(curSale.postingDate)                        
            setIsView(true)
        }else{
            if (!curApproval){                
                setPostingDate(new Date(Date.now()).toISOString().slice(0, 10))
            }else{
                setActiveSessions([])
                setPostingDate(curApproval.postingDate)
            }
            setAddingProducts(false)
        }
    },[curSale, curApproval])

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
        if(companyRecord?.permissions.includes('approve_postsales') || companyRecord?.status==='admin'){
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
            setAddKitchenEmployeeId('')
            setIsDebtSales(false)
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
            index = prop.index - accommodationRecords.length
        }
        if(sessionSalesRecords.length){
            index = index - sessionSalesRecords.length
        }
        if(kitchenRecords.length && !isView){
            index = index - kitchenRecords.length
        }
        // console.log('changed index to:', index)
        const name = e.target.getAttribute('name')
        const isSplit = name.split('-').includes('Kitchen')
        const category = e.target.getAttribute('category')
        const value = e.target.value
        const spNameList = name.split('-')
        const isKitchenCash = spNameList.includes('Kitchen') && category === 'cash'
        setFields((fields)=>{
            if (category && category!=='cash'){
                var ct = 0
                Object.keys(salesUnits).forEach((salesUnit)=>{
                    var ct1 = 0                    
                    Object.keys(fields[index][salesUnit]).forEach((payPoint)=>{                    
                        if(category!==payPoint && payPoint!=='cash'){                
                            ct1 += Number(fields[index][salesUnit][payPoint])
                        }else{
                            if (salesUnit !== name && payPoint!=='cash') {
                                ct1 += Number(fields[index][salesUnit][payPoint])
                            }
                        }
                    })
                    ct += Number(ct1)
                })
                var kct = 0
                Object.keys(salesUnits).forEach((salesUnit)=>{
                    const salesUnit1 = `Kitchen-${salesUnit}`
                    var kct1 = 0                    
                    Object.keys(fields[index]?.[salesUnit1] || {}).forEach((payPoint)=>{                    
                        if(category!==payPoint && payPoint!=='cash'){                
                            kct1 += Number(fields[index]?.[salesUnit1]?.[payPoint] || 0)
                        }else{
                            if (salesUnit1 !== name && payPoint!=='cash') {
                                kct1 += Number(fields[index]?.[salesUnit1]?.[payPoint] || 0)
                            }
                        }
                    })
                    kct += Number(kct1)
                })
                fields[index] = {
                    ...fields[index], 
                    ...(!isSplit  && {bankSales: ((ct+Number(value))&&!isSplit)?ct+Number(value):''}),
                    ...(isSplit && {kitchenBankSales: ((kct+Number(value))&&isSplit)?kct+Number(value):''}),                    
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
                        if(salesUnit !== name && payPoint === category){                
                            ct1 += Number(fields[index][salesUnit][payPoint])
                        }
                    })
                    ct += Number(ct1)
                })

                var kct = 0
                Object.keys(salesUnits).forEach((salesUnit)=>{
                    const salesUnit1 = `Kitchen-${salesUnit}`
                    var kct1 = 0                    
                    Object.keys(fields[index]?.[salesUnit1] || {}).forEach((payPoint)=>{                    
                        if(salesUnit1 !== name && payPoint === category){                
                            kct1 += Number(fields[index]?.[salesUnit1]?.[payPoint] || 0)
                        }
                    })
                    kct += Number(kct1)
                })
                fields[index] = {
                    ...fields[index], 
                    ...(!isSplit  && {cashSales: ((ct+Number(value))&&!isSplit)?ct+Number(value):''}),                    
                    ...(isSplit && {kitchenCashSales: ((kct+Number(value))&&isSplit)?kct+Number(value):''}),
                    [name]:{
                        ...fields[index][name], 
                        [category]:value
                    }
                }
            }
            else{
                if (name === 'salesPoint'){
                    if (!['accomodation', 'vip', 'open bar1', 'open bar2', 'kitchen'].includes(value) || companyRecord?.status === 'admin'){
                        fields[index] = {...fields[index], [name] : value}
                    }else{
                        switch (value){
                            case 'accomodation':
                                if (companyRecord?.permissions.includes('override_accomodation') || fields[index]?.isDebtSales){
                                    fields[index] = {...fields[index], [name] : value}
                                }else{
                                    setAlertState('error')
                                    setAlert('You are not allowed to enter ACCOMMODATION Sales!')
                                    setAlertTimeout(5000)
                                }
                                break
                            case 'vip':
                                if (companyRecord?.permissions.includes('override_vip') || fields[index]?.isDebtSales){
                                    fields[index] = {...fields[index], [name] : value}
                                }else{
                                    setAlertState('error')  
                                    setAlert('You are not allowed to enter VIP Sales!')
                                    setAlertTimeout(5000)
                                }
                                break
                            case 'open bar1':
                                if (companyRecord?.permissions.includes('override_open bar1') || fields[index]?.isDebtSales){
                                    fields[index] = {...fields[index], [name] : value}
                                }else{
                                    setAlertState('error')
                                    setAlert('You are not allowed to enter OPEN BAR1 Sales!')
                                    setAlertTimeout(5000)
                                }
                                break
                            case 'open bar2':
                                if (companyRecord?.permissions.includes('override_open bar2') || fields[index]?.isDebtSales){
                                    fields[index] = {...fields[index], [name] : value}
                                }else{
                                    setAlertState('error')
                                    setAlert('You are not allowed to enter OPEN BAR2 Sales!')
                                    setAlertTimeout(5000)
                                }
                                break
                            case 'kitchen':
                                if (companyRecord?.permissions.includes('override_kitchen') || fields[index]?.isDebtSales){
                                    fields[index] = {...fields[index], [name] : value}
                                }else{
                                    setAlertState('error')
                                    setAlert('You are not allowed to enter KITCHEN Sales!')
                                    setAlertTimeout(5000)
                                }
                                break
                        }

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
                if(value!=='Employee' || (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('enable_employee_debt_recovery'))){                    
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
        setDebtCalculated(true)
        setFields((fields)=>{
            const newFields = [...accommodationRecords, ...sessionSalesRecords, ...kitchenRecords, ...fields].map((field)=>{
                let netTotal = Number(field.cashSales) + Number(field.bankSales)+ Number(field.debt) + Number(field.shortage)
                if (field.isSession){
                    if (curSale === null){
                        netTotal -= Number(field.debt)
                    }else{
                        if (field.unAccountedSales){
                            netTotal -= (Number(field.debt)-Number(field.unAccountedSales))
                        }
                    }
                }
                const debtDue = Math.round(Number(field.totalSales)) - Math.round(netTotal )
                if (debtDue){
                    field.debt = Number(field.debt) + debtDue
                    field.debtAccepted = true
                }
                return field
            })
            return [...newFields]
        }) 
        setTimeout(()=>{
            setAccommodationRecords([])
            setSessionSalesRecords([])
            setKitchenRecords([])         
        },500)     
    }

    const isProductAvailable = (validEntries)=>{
        var noAvailableProducts =  0
        const insufficientProducts = []
        Object.keys(validEntries).forEach((entryWrh)=>{
            for (const entry of validEntries[entryWrh]){
                const product = products.find(p => p.i_d === entry.productId);
                if (product) {
                    let countBaseQuantity = 0;
                    const {cost, quantity} = product.locationStock?.[entryWrh] || {cost: 0, quantity: 0}
                    countBaseQuantity = Number(quantity || 0);  
                    if (countBaseQuantity < Math.abs(Number(entry.baseQuantity))) {
                        insufficientProducts.push(`[${entry.productId}] ${entry.name} (${countBaseQuantity.toLocaleString()}) in ${entryWrh}`);
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
            
            Object.keys(validEntries).forEach((entryWrh)=>{
                postProductsSales(entryWrh, validEntries[entryWrh], timestamp, entriesLength)
            })
        }
        const allProductsAvailable = isProductAvailable(validEntries)        
        if (!allProductsAvailable.value){
            setAlertState('error');
            setAlert(`Insufficient quantity in store, for the following product(s): ${allProductsAvailable.message.join(', ')}`);
            setAlertTimeout(8000);
            setAddingProducts(false)
            setPostCount(0)   
            return;         
        }else{
            if (pendingSales.length) {
                setAlertState('error');
                setAlert(`You have ${pendingSales.length} pending sales reconciliation, please link products for the following days: ${pendingSales.map(p => p.postingDate).join(', ')}`);
                setAlertTimeout(8000);
                setAddingProducts(false)
                setPostCount(0)   
                return;         
            }
            if (curSale.approval && curSale.approval?.approved){  
                if (companyRecord?.status !=='admin' && !companyRecord?.permissions.includes('allow_add_sales_products')){
                    setAlertState('error')
                    setAlert('You are not allowed to add sales product!')
                    setAlertTimeout(3000)
                    return
                }                
            }
            runApprovalWorkFlow(postingDate, curSale.approval, 'sales', 'addSalesProduct', validEntries, makePost, curSale.createdAt)                                    
        }
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
            var sessionSalesAmount = 0
            record.forEach((saleRecord)=>{
                if (saleRecord.salesPoint === 'accomodation'){
                    accommodationAmount += Number(saleRecord.totalSales)
                }
                if (saleRecord.isSession){
                    if (saleRecord.isSession){
                        sessionSalesAmount += Number(saleRecord.cashSales) + Number(saleRecord.bankSales) + Number(saleRecord.debt) + Number(saleRecord.shortage)
                        sessionSalesAmount -= (Number(saleRecord.unAccountedSales ? saleRecord.unAccountedSales : 0) + Number(saleRecord.shortage))
                    }
                }
            })
            const totalSalesAmount = Number(totalCashSales)+Number(totalBankSales)+Number(totalDebt)+Number(totalShortage) - accommodationAmount - sessionSalesAmount
            // console.log(totalSalesAmount, totalAmount)                
            if (Math.round(totalSalesAmount) === totalAmount){
                executeProductsPost(validEntries, entriesLength, timestamp)
            }else{
                setAlertState('error')
                setAlert('Total Product Sales Must Be Equal to Total Sales On This Card (Excluding Accommodation and POS Sales)!')
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
                
                const isDuplicate = false // await checkDuplicateTransaction(company, {
                
                if (!isDuplicate){
                    setAlertState('info')
                    setAlert(`Posting Transaction... ${entry.productId} ${entryWrh}`)
                    setAlertTimeout(100000)
                    
                    const newTransaction = {
                        ...entry,
                        location: entryWrh,
                        productId: entry.productId || entry.i_d,
                        quantity: Math.abs(Number(entry.quantity)) * -1,
                        baseQuantity: Math.abs(Number(entry.baseQuantity)) * -1,
                        totalCost: Math.abs(Number(entry.costPrice)) * Math.abs(Number(entry.baseQuantity)) * -1,
                        totalSales: Math.abs(Number(entry.totalSales)) * -1,
                        postingDate: postingDate,
                        postingStamp: new Date(postingDate),
                        createdAt: createdAt,
                    };                                       

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
                }
            }

        });        

    };

    const addSales = async (reference)=> { 
        if (postingDate){
            setAlertState('info')
            setAlert('Posting Sales...')
            setAlertTimeout(100000)
            setPostStatus('Posting Sales...')
            var totalCashSales = 0
            var totalDebt = 0   
            var totalSalesDebt = 0   
            var totalShortage = 0 
            var totalBankSales = 0 
            let deliverySessions = []
            let salesSessions = []
            const fields1 = [...accommodationRecords, ...sessionSalesRecords, ...(isApprover ? (curApproval ? [] : kitchenRecords) : []), ...fields]
            let dct = 0
            fields1.forEach((field)=>{
                // delete field.isSplit
                totalCashSales += Number(field.cashSales)
                totalDebt += Number(field.debt)
                totalSalesDebt += Number(field.debt) - Number(field.unAccountedSales || 0)
                totalShortage += Number(field.shortage)
                totalBankSales += Number(field.bankSales)
                if ((field.debt || field.shortage) &&  !field.unAccountedSales){
                    dct++
                }
                if (field.isSession){
                    field.deliverySessions?.forEach((deliverySession)=>{
                        if (!deliverySessions.includes(deliverySession)){
                            deliverySessions.push(deliverySession)
                        }
                    })
                    field.salesSessions?.forEach((salesSession)=>{
                        if (!salesSessions.includes(salesSession)){
                            salesSessions.push(salesSession)
                        }
                    })
                }
            })
            const newSale = {
                postingDate: postingDate,
                createdAt: new Date().getTime(),
                totalCashSales,
                totalBankSales,
                totalDebt,
                totalSalesDebt,
                totalShortage,
                deliverySessions,
                salesSessions,
                approvedBy: curApproval?.approvedBy || companyRecord?.emailid,
                ...(dct === 0 && {productsRef: 'auto-generated'}),
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
                return true
            }else{
                setSales(newSales)
                setCurApproval(null)
                getApprovals(company)                
                setKitchenRecords([])
                setCurSale(newSale)
                setCurSaleDate(newSale.postingDate)
                setIsView(true)
                setFields([...(newSale.record)])
                getSales(company)
                setAlertState('success')
                setAlert('Sales Posted Successfully!')
                setAlertTimeout(5000)
                setPostStatus('Post Sales')
                // const transactions = await getSalesProducts(company, newSale); 
                // if (transactions.length){
                //     const validEntries = {}
                //     wrhs.forEach(async(wh)=>{   
                //         var ctent = 0
                //         validEntries[wh.name]=[] 
                //         transactions.forEach((transaction)=>{
                //             if (transaction.location === wh.name){
                //                 ctent++
                //                 validEntries[wh.name].push(transaction)
                //             }
                //         })        
                //         if (!ctent){
                //             delete validEntries[wh.name]
                //         }
                //     })               
                //     setSalesEntries({...validEntries})
                // }                            
                return true
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
        
        let propFilter = {
            createdAt: sale.productsRef
        }        
        if (sale.salesSessions?.length){
            propFilter = {
                $or:[
                    {sessionId: {$in: [...sale.salesSessions, ...(sale?.deliverySessions || [])]}},
                    {createdAt: sale.productsRef}
                ]
            }
        }
        const { signal } = controller;        
        const response = await fetchServer("POST", {
            database: company,
            collection: "InventoryTransactions",
            prop: propFilter
        }, "getDocsDetails", server, signal); // plural version that returns an array

        return (Array.isArray(response.record) && response.record.length > 0) ? response.record : [];
    };

    const handleApprovalViewClick = (approval)=>{
        if (salesOpts === 'sales'){        
            if(companyRecord?.permissions.includes('approve_sales') || companyRecord?.status==='admin'){
                setIsApprover(true)
            }
            setKitchenRecords([])
            setCurSale(null)
            setCurApproval(approval)
            setFields([...approval.data])
            setPostingDate(approval.postingDate)
            if (approval.message){
                setIsView(false)
            }else{
                setIsView(true)
            }
        }else if(salesOpts === 'rentals'){
            if(companyRecord?.permissions.includes('approve_postrentals') || companyRecord?.status==='admin'){
                setIsApprover(true)
            }
            setCurRent(null)
            setCurApproval(approval)
            setPostingDate(approval.postingDate)
            setRentalFields({...approval.data})
            if (approval.message){
                setIsView(false)
            }else{
                setIsView(true)
            }
        }else if (salesOpts === 'recovery'){
            if(companyRecord?.permissions.includes('approve_postrecovery') || companyRecord?.status==='admin'){
                setIsApprover(true)
            }
            setCurApproval(approval)
            setPostingDate(approval.postingDate)
            setRecoveryEmployeeId(approval.data.recoveryEmployeeId)
            setRecoveryMonth(approval.data.recoveryMonth)
            setRecoveryFields([...approval.data.recoveryFields])
            if (approval.message){
                setIsView(false)
            }else{
                setIsView(true)
            }
        }
    }

    const handleViewClick = async (sale) => {
        setKitchenRecords([])
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
                if(companyRecord?.permissions.includes('approveAddSalesProduct') || companyRecord?.status==='admin'){
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
        setCurApproval(null)
        setSalesOpts('rentals')
        setIsView(true)
        setRentalFields({...rent})
        setIsView(true)
    }

    const deleteSales = async (sale)=>{
        const today = new Date()
        let postDate = new Date(sale.postingDate).toISOString().slice(0, 10)
        if (postDate < new Date(today.setDate(today.getDate()-1)).toISOString().slice(0, 10)){
            setAlertState('error')
            setAlert('Cannot reverse sales after more than 1 day')
            setAlertTimeout(3000)
            return
        }

        if (deleteCount === sale.createdAt) {
            setAlertState('info')
            setAlert('Reversing Sales...')
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
                setKitchenRecords([])
                setCurApproval(null)
                setCurSaleDate(null)
                setFields([])
                setAddEmployeeId('')
                setAddKitchenEmployeeId('')
                setIsDebtSales(false)
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
            setSalesOpts1(name)
            // if (name==='recovery'){
            //     setSalesOpts1('sales')
            // }else{
            // }
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
        let result = false
        setRecoveryStatus('Posting Recovery ....')
        setAlertState('info')
        setAlert('Posting Recovery ....')
        setAlertTimeout(100000)
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
                    result = false
                }else{                
                    setEmployees(updatedEmployees)
                    getEmployees(company)
                    getSales(company)
                    setRecoveryFields([])
                    setAlertState('success')
                    setAlert('Debt Recovered Successfully!')
                    setAlertTimeout(5000)
                    setRecoveryStatus('Post Recovery')
                    setRecoveryEmployeeId('')
                    result = true
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
                        sale.approvedBy = curApproval?.approvedBy || companyRecord?.emailid                     
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
                    result = false
                }else{                
                    setSales(updatedSales)
                    getSales(company)
                    setRecoveryFields([])
                    setAlertState('success')
                    setAlert('Debt Recovered Successfully!')
                    setAlertTimeout(5000)
                    setRecoveryStatus('Post Recovery')
                    setRecoveryEmployeeId('')
                    result = true
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
                    result = true
                }
            }
        })
        
        return result
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
        setAlert('Posting to Rentals...')
        setRentalsStatus('Posting to Rentals...')        
        const newRental = {
            ...rentalFields,
            approvedBy: curApproval?.approvedBy || companyRecord?.emailid,
            createdAt: new Date().getTime(),            
        }

        const newRentals = [newRental, ...rentals]        
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Rentals", 
            update: newRental,            
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
            getApprovals(company)
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

    const handleImageSelect = async (e)=>{
        const file = e.target.files[0]
        let blob = file;
        // ✅ Convert HEIC to JPEG if necessary
        if (file.type === "image/heic" || file.name.endsWith(".heic")) {
            try {                
                const converted = await heic2any({
                    blob: file,
                    toType: "image/jpeg",
                    quality: 0.9,
                });
                blob = converted;
            } catch (err) {
                setAlertState('error')
                setAlert(`Image conversion failed: ${err}`)
                setAlertTimeout(3000)
                return
            }
        }

        setImageUpload(blob)
    }

    const handleImageUpload = async (imageUpload)=>{
        if (!imageUpload) {
            setAlertState('error')
            setAlert("Please select an image first")
            setAlertTimeout(3000);
            return
        }
        setUploadingReceipt(true)
        setAlertState('info')
        setAlert('Uploading Receipt...')
        setAlertTimeout(100000)
        const collection = 'Approvals'
        const createdAt = curApproval.createdAt
        const res = await uploadFile(
            imageUpload, company+"/Payment Receipts", 
            createdAt, company, collection, server
        ); 
        if (res.mess){
            setUploadingReceipt(false)
            setAlertState('error')
            setAlert(res.mess)
            setAlertTimeout(3000)
            return
        }
        if (res?.downloadLink){
            getApprovals(company)
            
            setUploadingReceipt(false)
            setAlertState('success')
            setAlert('Receipt Uploaded Successfully!')
            setAlertTimeout(3000)
        }
    }

    const handleImageDelete = async (imgId)=>{
        setDeletingReceipt(true)
        setAlertState('info')
        setAlert('Deleting Receipt...')
        setAlertTimeout(100000)
        const res = await deleteFile(imgId, server)
        if (res.success){
            const updatedApprovals = {
                imgId: null,
                viewLink: null,
                downloadLink: null,                
                receiptLastDeletedBy: companyRecord?.emailid
            }

            const resp = await fetchServer('POST', {
                database: company,
                collection: 'Approvals',
                prop: [{createdAt: curApproval.createdAt}, {...updatedApprovals}]                
            }, 'updateOneDoc', server)
            if (resp.updated){
                getApprovals(company)
                setDeletingReceipt(false)
                setAlertState('success')
                setAlert('Receipt Deleted Successfully!')
                setAlertTimeout(3000)
            }
        }else{
            setDeletingReceipt(false)
            setAlertState('error')
            setAlert('Error Deleting Receipt. Check your network!')
            setAlertTimeout(3000)
        }
    }
    return (
        <>
            <div className='sales'>   
                {/* Receipts Modal Trigger State  */}
                <PaymentReceiptsModal open={showReceiptsModal} onClose={()=>setShowReceiptsModal(false)} paymentReceipts={paymentReceipts} />    
                {showApprovalBox && <ApprovalBox
                    onClose={()=>{
                        setShowApprovalBox(false)
                        setApprovalStatus(false)
                        setApprovalMessage('')
                        setAddingProducts(false)
                        setPostingRecovery(false)
                    }}
                    module={'sales'}
                    section={productAdd ? 'addSalesProduct' : `post${salesOpts}`}
                    postApprovalUpdate={()=>{
                        if (productAdd){
                            postApprovalUpdate(company, 'sales', `addSalesProduct`, curSale.approval)
                        }else{
                            postApprovalUpdate(company, 'sales', `post${salesOpts}`, curApproval)
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
                    {(companyRecord.status==='admin' || companyRecord?.permissions.includes('export_sales_report')) && <FaTableCells                         
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
                        <div name='recovery' className={salesOpts1==='recovery' ? 'slopts': ''}>Recovery</div>
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
                    }).sort((a,b)=> (new Date(b.postingDate).getTime()) - (new Date(a.postingDate)).getTime()).map((sale, index)=>{
                        if (sale.isApproval){
                            const {createdAt, postingDate, message, handlerId, approved, approvers} = sale
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
                                        <div>Approval Type: <b>{'SALES'}</b></div>
                                        <div>Posting Date: <b>{getDate(postingDate)}</b></div>
                                        <div>Approval Status: <b style={{color: textColor}}>{message? 'REJECTED' : (approved? 'APPROVED': 'AWAITING APPROVAL')}</b></div>
                                        {message && <div>Message: <b>{message}</b></div>}
                                        <div className='deptdesc'>{`Requested By ID:`} <b>{`${handlerId}`}</b></div>
                                        {approvers?.length && 
                                            <div 
                                                className='deptdesc' 
                                                style={{
                                                    fontWeight:'bold', 
                                                    fontSize: '13px',
                                                    color: 'greenyellow',
                                                    background: 'rgba(0,0,0,0.7)',
                                                    width: 'fit-content',
                                                    padding: '5px',
                                                    borderRadius: '8px',
                                                    border: 'solid greenyellow 3px',
                                                }}
                                            > 
                                                ## SALES VERIFIED ##
                                            </div>
                                        }
                                    </div>
                                    {(companyRecord.status==='admin' && !saleEmployee) && <div 
                                        className='edit'
                                        name='delete'         
                                        style={{color:'red', background: 'white', borderRadius: '8px', padding: '5px 10px', border:'solid red 1.3px'}}                          
                                        onClick={async ()=>{                                        
                                            setAlertState('info')
                                            setAlert('Deleting Approval Data...')
                                            setAlertTimeout(100000)

                                            const resp = await removeApproval(company, 'sales', 'postsales', {                        
                                                createdAt: createdAt,
                                                postingDate: postingDate                                                 
                                            })     
                                            
                                            if(resp.completed){
                                                setAlertState('success')
                                                setAlert('Deleted Approval Data Successfully!')
                                                setAlertTimeout(3000)
                                                setKitchenRecords([])
                                                setCurSale(null)
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
                            const {createdAt, postingDate, totalCashSales, totalDebt, totalSalesDebt, record, 
                                totalShortage, totalDebtRecovered, totalBankSales, recoveryList, productsRef,
                                approval
                            } = sale 

                            let unAccountedSalesDebt = 0
                            record.forEach((rec)=>{
                                unAccountedSalesDebt += Number(rec.unAccountedSales || 0)
                            //    if (Number(rec.debt || 0) === Number(rec.unAccountedSales || 0)){
                            //     }
                            })
                            let adjProductsRef = productsRef ? productsRef : null
                            
                            if (Math.round(unAccountedSalesDebt) < 200){
                                adjProductsRef = 'auto-generated'
                                sale.productsRef = 'auto-generated'                                
                            }
                                
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
                                    {adjProductsRef ? 
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
                                        <div>Total Sales: <b>{'₦'+(Number(totalCashSales)+Number(totalBankSales)+Number(totalDebt)-Number(totalSalesDebt || 0)+Number(totalShortage)).toLocaleString()}</b></div>
                                        <div>Bank: <b>{'₦'+totalBankSales?.toLocaleString()}</b></div>
                                        <div>Cash: <b>{'₦'+totalCashSales.toLocaleString()}</b></div>
                                        <div>Debts: <b>{'₦'+(Number(totalDebt)+Number(totalShortage)-Number(totalDebtRecovered?totalDebtRecovered:0)).toLocaleString()}</b></div>
                                        <div>Recovered: <b>{'₦'+(Number(totalDebtRecovered?totalDebtRecovered:0)).toLocaleString()}</b></div>
                                        <div className='deptdesc'>{`Number of Sales Made:`} <b>{`${record.length}`}</b></div>
                                        {approval && approval?.approvers?.length && 
                                            <div 
                                                className='deptdesc' 
                                                style={{
                                                    fontWeight:'bold', 
                                                    fontSize: '13px',
                                                    color: 'greenyellow',
                                                    background: 'rgba(0,0,0,0.7)',
                                                    width: 'fit-content',
                                                    padding: '5px',
                                                    borderRadius: '8px',
                                                    border: 'solid greenyellow 3px',
                                                }}
                                            > 
                                                ## SALES DEBT PRODUCTS VERIFIED ##
                                            </div>
                                        }
                                    </div>
                                    {(companyRecord.status==='admin' && !saleEmployee) && <div 
                                        className='edit'
                                        name='delete'         
                                        style={{color:'red', background: 'white', borderRadius: '8px', padding: '5px 10px', border:'solid red 1.3px'}}                           
                                        onClick={()=>{                                        
                                            setAlertState('info')
                                            setAlert('You are about to Reverse the selected Sales Record. Please click again if you are sure!')
                                            setAlertTimeout(5000)                                                                                        
                                            deleteSales(sale)
                                        }}
                                    >
                                        Reverse
                                    </div>}
                                </div>
                            )
                        }
                    })}
                    {salesOpts1 === 'rentals' && [...ftrApprovals, ...rentals].filter((ftrrent)=>{
                        const slCreatedAt = new Date(ftrrent.paymentDate || ftrrent.postingDate).getTime()
                        const fromDate = new Date(saleFrom).getTime()
                        const toDate = new Date(saleTo).getTime()
                        if ( slCreatedAt>= fromDate && slCreatedAt<=toDate
                        ){                            
                            return ftrrent
                        }
                    }).map((rent, index)=>{
                        if (rent.isApproval){
                            const {createdAt, postingDate, message, handlerId, approved} = rent
                            var textColor = 'red'
                            if (approved){
                                textColor ='green'
                            }
                            return (
                                <div className={'dept sldept' + (curApproval?.createdAt===createdAt?' curview':'')} key={index} 
                                    onClick={(e)=>{
                                        handleApprovalViewClick(rent)
                                    }}
                                >
                                    <div className='dets sldets'>
                                        <div>Approval Type: <b>{'RENTALS'}</b></div>
                                        <div>Posting Date: <b>{getDate(postingDate)}</b></div>
                                        <div>Approval Status: <b style={{color: textColor}}>{message? 'REJECTED' : (approved? 'APPROVED': 'AWAITING APPROVAL')}</b></div>
                                        {message && <div>Message: <b>{message}</b></div>}
                                        <div className='deptdesc'>{`Requested By ID:`} <b>{`${handlerId}`}</b></div>
                                    </div>
                                    {(companyRecord.status==='admin' && !saleEmployee) && <div 
                                        className='edit'
                                        name='delete'         
                                        style={{color:'red', background: 'white', borderRadius: '8px', padding: '5px 10px', border:'solid red 1.3px'}}
                                        onClick={async ()=>{                                        
                                            setAlertState('info')
                                            setAlert('Deleting Approval Data...')
                                            setAlertTimeout(100000)

                                            const resp = await removeApproval(company, 'sales', 'postrentals', {                        
                                                createdAt: createdAt,
                                                postingDate: postingDate                                                 
                                            })     
                                            
                                            if(resp.completed){
                                                setAlertState('success')
                                                setAlert('Deleted Approval Data Successfully!')
                                                setAlertTimeout(3000)
                                                setCurRent(null)
                                            }

                                        }}
                                    >
                                        Delete
                                    </div>}
                                </div>
                            )
                            
                        }else{
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
                                        style={{color:'red', background: 'white', borderRadius: '8px', padding: '5px 10px', border:'solid red 1.3px'}}
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
                        }
                    })}
                    {salesOpts1 === 'recovery' && [...ftrApprovals].filter((ftrrent)=>{
                        const slCreatedAt = new Date(ftrrent.recoveryDate || ftrrent.postingDate).getTime()
                        const fromDate = new Date(saleFrom).getTime()
                        const toDate = new Date(saleTo).getTime()
                        if ( slCreatedAt>= fromDate && slCreatedAt<=toDate
                        ){                            
                            return ftrrent
                        }
                    }).map((recovery, index)=>{
                        if (recovery.isApproval){
                            const {createdAt, postingDate, message, handlerId, approved, data} = recovery
                            var textColor = 'red'
                            if (approved){
                                textColor ='green'
                            }
                            const foundDebtReasons = []
                            data?.recoveryFields?.forEach((recoveryField)=>{
                                if (Number(recoveryField.recoveryReason || 0) > 1){
                                    foundDebtReasons.push(recoveryField.recoveryReason)
                                }
                            })
                            return (
                                <div className={'dept sldept' + (curApproval?.createdAt===createdAt?' curview':'')} key={index} 
                                    onClick={(e)=>{
                                        handleApprovalViewClick(recovery)
                                    }}
                                >
                                    <div className='dets sldets'>
                                        <div>Approval Type: <b>{'RECOVERY'}</b></div>
                                        <div>Posting Date: <b>{getDate(postingDate)}</b></div>
                                        <div>Approval Status: <b style={{color: textColor}}>{message? 'REJECTED' : (approved? 'APPROVED': 'AWAITING APPROVAL')}</b></div>
                                        {message && <div>Message: <b>{message}</b></div>}
                                        <div className='deptdesc'>{`Requested By ID:`} <b>{`${handlerId}`}</b></div>
                                        {isApprover && <div className='deptdesc' style={{fontSize:'13px', color:'red'}}>
                                            {foundDebtReasons.length>0 && <div onClick={()=>{setShowReceiptsModal(true)}}><span style={{fontWeight: 'bold'}}>Void Receipt Reason:</span> {recoveryReasons[Number(foundDebtReasons[0])-1].value}</div>}
                                             {data?.voidReceipt && 
                                            <div onClick={()=>{setShowReceiptsModal(true)}}><span style={{fontWeight: 'bold'}}>Void Receipt Reason:</span> Receipt "{data?.voidReceipt.voidReceipt}" already used on {data?.voidReceipt.voidReceiptDate} in {data?.voidReceipt.voidReceiptPoint.toUpperCase()}. <a>Click to Find Receipt Report</a></div>}
                                        </div>}
                                    </div>
                                    {(companyRecord.status==='admin' && !saleEmployee) && <div 
                                        className='edit'
                                        name='delete'         
                                        style={{color:'red', background: 'white', borderRadius: '8px', padding: '5px 10px', border:'solid red 1.3px'}}                           
                                        onClick={async ()=>{                                        
                                            setAlertState('info')
                                            setAlert('Deleting Recovery Approval Data...')
                                            setAlertTimeout(100000)

                                            const resp = await removeApproval(company, 'sales', 'postrecovery', {                        
                                                createdAt: createdAt,
                                                postingDate: postingDate                                                 
                                            })     
                                            
                                            if(resp.completed){
                                                setAlertState('success')
                                                setAlert('Deleted Recovery Approval Data Successfully!')
                                                setAlertTimeout(3000)
                                                setCurRent(null)
                                            }

                                        }}
                                    >
                                        Delete
                                    </div>}
                                </div>
                            )
                            
                        }
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
                                setRecoveryFields([])
                                setAddEmployeeId('')
                                setAddKitchenEmployeeId('')
                                setIsDebtSales(false)
                                setKitchenRecords([])
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
                                    setAddKitchenEmployeeId('')
                                    setIsDebtSales(false)
                                    setKitchenRecords([])
                                    setCurSale(null)
                                    setIsApprover(false)
                                }else if (salesOpts==='rentals'){
                                    setIsView(false)
                                    setRecoveryFields([])
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
                            <div name='sales' className={salesOpts==='sales' ? 'slopts': ''}>
                                <div name='sales'>Sales</div>
                                {(companyRecord?.status==='admin' || companyRecord?.permissions.includes('approveSales')) && salesApprovals.length > 0 && <div className='navdivicon1' name="sales">{salesApprovals.length}</div>}
                            </div>
                            <div name='rentals' className={salesOpts==='rentals' ? 'slopts': ''}>
                                <div name='rentals'>Rentals</div>
                                {(companyRecord?.status==='admin' || companyRecord?.permissions.includes('approveRentals')) && rentalsApprovals.length > 0 && <div className='navdivicon1' name="rentals">{rentalsApprovals.length}</div>}
                            </div>                            
                            {<div name='recovery' className={salesOpts==='recovery' ? 'slopts': ''}>
                                <div name='recovery'>Debt Recovery</div>
                                {(companyRecord?.status==='admin' || companyRecord?.permissions.includes('approveRecovery')) && recoveryApprovals.length > 0 && <div className='navdivicon1' name="recovery">{recoveryApprovals.length}</div>}
                            </div>}
                        </div>}
                        {salesOpts==='sales' && (!isView && <div className='addnewsales'>
                            <div className='inpcov'>
                                <div>Kitchen Person ID</div>
                                <select 
                                    className='forminp'
                                    name='kitchenEmployeeId'
                                    type='text'
                                    value={addKitchenEmployeeId}                                    
                                    onChange={(e)=>{
                                        setAddKitchenEmployeeId(e.target.value)
                                    }}
                                >
                                    <option value=''>Select Kitchen Person</option>
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
                                        return ( employee.department === 'KITCHEN' && 
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
                                <input 
                                    className='forminp'
                                    style={{fontSize: '10px', cursor: 'pointer', margin: 'auto'}}
                                    name='isDebtSales'
                                    type='checkbox'
                                    placeholder='For Sales Debt'
                                    value={isDebtSales}
                                    onChange={(e)=>{
                                        setIsDebtSales(e.target.checked)
                                    }}
                                />
                                <div>For Sales Debt</div>
                            </div>
                            <div className='inpcov'>
                                <div>Total Sales (Excluding Kitchen Sales)</div>
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
                                    cursor:(addEmployeeId&&addTotalSales&&addKitchenEmployeeId)?'pointer':'not-allowed'
                                }}
                                onClick={()=>{
                                    if (addEmployeeId && addKitchenEmployeeId && addTotalSales){
                                        const newField = {
                                            ...defaultFields,
                                            employeeId: addEmployeeId, 
                                            kitchenEmployeeId: addKitchenEmployeeId,
                                            totalSales: addTotalSales,  
                                            isDebtSales: isDebtSales
                                        }
                                        setFields((fields)=>{
                                            return [
                                                newField,
                                                ...fields
                                            ]
                                        })
                                        setAddEmployeeId('')
                                        setAddKitchenEmployeeId('')
                                        setIsDebtSales(false)
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
                                    disabled={isView}
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
                                            disabled={field.recoveryPoint === 'Employee' || (isView && (companyRecord.status!=='admin' && !companyRecord?.permissions.includes('allow_recovery_posts')))}
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
                                                disabled={isView}
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
                                                disabled={!field.recoverySales || isView}
                                                onChange={(e)=>{
                                                    handleRecoveryFieldChange({index, e})
                                                }}
                                            />
                                        </div>
                                        <div className='inpcov'>
                                            <div>Recovery Reason</div>
                                            <select 
                                                className='forminp'
                                                style={{cursor: field.recoverySales?'auto':'not-allowed'}}
                                                name='recoveryReason'
                                                type='text'
                                                placeholder='Recovery Reason'
                                                value={field.recoveryReason}
                                                disabled={!field.recoverySales || (isView && (companyRecord.status!=='admin' && !companyRecord?.permissions.includes('allow_recovery_posts')))}
                                                onChange={(e)=>{
                                                    handleRecoveryFieldChange({index, e})
                                                }}
                                            >
                                                <option value={''}>Recovery Reason</option>
                                                {recoveryReasons.map((reason,index)=>{
                                                    return (
                                                        <option key={index} value={reason.i_d}>{`${reason.value}`}</option>
                                                    )
                                                })}
                                            </select>
                                        </div>
                                        <div className='inpcov'>
                                            <div>Recovery Point</div>
                                            <select 
                                                className='forminp'
                                                name='recoveryPoint'
                                                type='text'
                                                disabled={isView}
                                                value={field.recoveryPoint}
                                                onChange={(e)=>{
                                                    handleRecoveryFieldChange({index, e})
                                                }}
                                            >
                                                <option value=''>Select Recovery Point</option>
                                                {Object.keys(payPoints).map((paypoint,index)=>{
                                                    return (
                                                        <option key={index} value={paypoint}>{`${payPointAccounts[paypoint]}`}</option>
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
                                                    disabled={isView}
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
                                                disabled={isView}
                                                value={field.recoveryDate}
                                                onChange={(e)=>{
                                                    handleRecoveryFieldChange({index, e})
                                                }}
                                            />
                                        </div>
                                        {false && field.recoveryReceipt?.toLowerCase() !== 'cash' && field.recoveryPoint && <section className='imgview'>
                               
                                            <div className='acpymdt'>Upload Payment Receipt</div>
                                            
                                            {(field.imgId || imageUpload) &&                                             
                                                <a href={field?.viewLink || ''} target="_blank" rel="noopener noreferrer">                        
                                                    <img className='imgtag' src={(field?.imgId? `https://drive.google.com/thumbnail?id=${field.imgId}&sz=w1000`: '') || (imageUpload? (URL.createObjectURL(imageUpload)): '')} 
                                                        alt='receipt'
                                                    />
                                                </a>
                                            }
                                            {!imageUpload && !field.imgId && <div className='inpcov'>
                                                <div>Upload Image</div>
                                                <input 
                                                    className='forminp'
                                                    name='imgId'
                                                    type='file'
                                                    accept='image/*' 
                                                    capture="environment"                                      
                                                    onChange={(e)=>{
                                                        handleImageSelect(e)
                                                    }}
                                                />
                                            </div>}
                                            {(!field.imgId) && <button 
                                                className='imgupld'
                                                style={{cursor: uploadingReceipt ? 'not-allowed': 'pointer'}}
                                                disabled={uploadingReceipt}
                                                onClick={()=>{
                                                    handleImageUpload(imageUpload)
                                                }}
                                            > Upload</button>} 
                                            {((((companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('edit_payment_receipts')) && field.imgId) || imageUpload) && <button 
                                                className='imgupld'
                                                color='red'
                                                style={{cursor: deletingReceipt ? 'not-allowed': 'pointer'}}
                                                disabled={deletingReceipt}
                                                onClick={()=>{
                                                    setImageUpload(null)
                                                    if (field.imgId){
                                                        handleImageDelete(field.imgId)
                                                    }
                                                }}
                                            > Delete</button>)
                                            }
                                        </section>}
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
                                        const date = new Date(e.target.value)
                                        const today = new Date()
                                        if (date <= today){
                                            handleRentalFieldChange(e)
                                        }else{
                                            setAlertState('error')
                                            setAlert('You cannot set the payment date in the future!')
                                            setAlertTimeout(5000)
                                        }
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
                                        return <option key={index} value={payPoint}>{payPointAccounts[payPoint]}</option>
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
                        {salesOpts==='sales' && [...accommodationRecords, ...sessionSalesRecords, ...(isView ? [] : kitchenRecords), ...fields].map((field, index)=>{
                            let netTotal = Number(field.cashSales) + Number(field.bankSales)+ Number(field.debt) + Number(field.shortage)
   
                            if (field.isSession){
                                if(field.debtAccepted){
                                    netTotal -= (Number(field.debt)-Number(field.unAccountedSales || 0))                                  
                                }else{
                                    if (curSale === null){
                                        netTotal -= Number(field.debt)
                                    }else{
                                        netTotal -= (Number(field.debt)-Number(field.unAccountedSales || 0))                                        
                                    }
                                }
                            }
                            // console.log('employeeId:', field.employeeId, 'sales:', field.totalSales, 'cash:', field.cashSales, 'bank:',field.bankSales,'debt:', field.debt, 'shortage:', field.shortage, 'net:', netTotal, 'difference:', field.totalSales-netTotal) 
                            if (!isView && !field.isAccommodation && !field.isSession && !field.isKitchen){
                                field.isSplit = true
                            }
                            return (
                                <div key={index} className='empsalesblk'>
                                    <div className='pdsalesview'>
                                        {`Pending Sales out of ₦${Number(field.totalSales).toLocaleString()}:`} <b> {'₦'+(Number(field.totalSales) - netTotal).toLocaleString()}</b> <b>{` ${field.postingDate? '('+getDate(field.postingDate)+')' : ''}`}</b>
                                    </div>
                                    {!isView && !field.isAccommodation && !field.isSession && !field.isKitchen && <MdDelete 
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
                                                disabled={isView || (field.isAccommodation) || (field.isKitchen) || (field.isSession) || !field.salesPoint}
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
                                                disabled={isView || field.salesPoint || (field.isAccommodation) || (field.isKitchen) || (field.isSession)}
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
                                                disabled={isView || (field.isAccommodation) || (field.isKitchen) || (field.isSession)}
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
                                                disabled={isView || (field.isAccommodation) || (field.isKitchen) || (field.isSession)}
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
                                                console.log('clicked')
                                                setFields((fields)=>{
                                                    const updatedFields = fields.map((field,ind)=>{
                                                        if (ind === index){
                                                            if (!field.viewHistory){
                                                                field.viewHistory = true
                                                            }else{
                                                                field.viewHistory = false
                                                            }
                                                        } 
                                                        return field
                                                    })
                                                    return updatedFields
                                                })  
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
                                        {!field.isDebtSales && Object.keys(salesUnits).map((salesUnit, id)=>{                                            
                                            if (salesUnit === field.salesPoint){
                                                return(
                                                    <SalesEntry
                                                        key={id}                                                   
                                                        handleFieldChange={handleFieldChange} 
                                                        salesUnits={salesUnits}
                                                        payPointAccounts={payPointAccounts}
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
                                    const date = new Date(e.target.value)
                                    const today = new Date()
                                    if (date <= today){
                                        setPostingDate(e.target.value)
                                    }else{
                                        setAlertState('error')
                                        setAlert('You cannot set the posting date in the future!')
                                        setAlertTimeout(5000)
                                    }
                                }}
                            />
                        </div>}  
                        {salesOpts === 'recovery' && <div className='inpcov salesinpcov'>
                            <select 
                                className='forminp'
                                name='recoveryMonth'
                                type='text'
                                value={recoveryMonth}
                                disabled={isView}
                                onChange={(e)=>{
                                    const month = e.target.value
                                    const today = new Date()
                                    if (months.indexOf(month) <= today.getMonth()){
                                        setRecoveryMonth(month)
                                        if (months.indexOf(month) < today.getMonth()){
                                            setAlertState('info')
                                            setAlert('Are you sure? You have selected a previous month!')
                                            setAlertTimeout(3000)
                                        }
                                    }else{
                                        setAlertState('error')
                                        setAlert('You cannot set the recovery month in the future!')
                                        setAlertTimeout(5000)
                                    }
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
                                cursor:(fields.length || (accommodationRecords.length || sessionSalesRecords.length))?'pointer':'not-allowed'
                            }}
                            onClick={()=>{
                                if (fields.length || (accommodationRecords.length || sessionSalesRecords.length)){
                                    var rt = 0
                                    var ct = 0
                                    var wt = 0
                                    let data = []
                                    if (debtCalculated){
                                        data = fields
                                    }else{
                                        data = [...accommodationRecords, ...sessionSalesRecords, ...kitchenRecords, ...fields]
                                    }
                                    const validateSales = ()=>{
                                        if (!activeSessions.length){                                                    
                                            // setIsProductView(false)
                                            // setProductAdd(true)      
                                            if (curApproval && curApproval?.approved){  
                                                if (companyRecord?.status !=='admin' && !companyRecord?.permissions.includes('allow_sales_posts')){
                                                    setAlertState('error')
                                                    setAlert('You are not allowed to post sales!')
                                                    setAlertTimeout(3000)
                                                    // clearInterval(debtCalcInterval)
                                                    return
                                                }                
                                            }
                                            runApprovalWorkFlow(postingDate, curApproval, 'sales', 'postsales', data, addSales)                                                                                                  
                                            // clearInterval(debtCalcInterval)
                                        }else{
                                            setAlertState('error')
                                            setAlert('You still have active POS/Delivery sessions for this posting date. Please end them before posting!')
                                            setAlertTimeout(5000)
                                        }
                                    }
                                    data.forEach((field)=>{
                                        let enteredSales = Number(field.cashSales) + Number(field.bankSales) + 
                                        Number(field.debt) + Number(field.shortage)
                                        if (field.isSession){
                                            if(field.debtAccepted){
                                                if(field.unAccountedSales){
                                                    enteredSales -= (Number(field.debt)-Number(field.unAccountedSales))
                                                }
                                            }else{
                                                if (curSale === null){
                                                    enteredSales -= Number(field.debt)
                                                }else{
                                                    if (field.unAccountedSales){
                                                        enteredSales -= (Number(field.debt)-Number(field.unAccountedSales))
                                                    }
                                                }
                                            }
                                        }

                                        if (Math.round(enteredSales) === Math.round(Number(field.totalSales))){
                                            rt++
                                            if (rt===data.length){
                                                validateSales()
                                            }
                                        }else{
                                            if (Math.round(enteredSales) < Math.round(Number(field.totalSales))){
                                                ct++
                                            }else if (Math.round(enteredSales) > Math.round(Number(field.totalSales))){
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
                                cursor:(recoveryFields.length && !postingRecovery)?'pointer':'not-allowed'
                            }}
                            onClick={async()=>{
                                if (recoveryFields.length){
                                    var ct=0
                                    var ct1=0
                                    var ct2=0
                                    var ct3=0
                                    var ct4=0
                                    var foundDebtReasons = []
                                    var requiredNo = recoveryFields.length
                                    recoveryFields.forEach((recoveryField)=>{
                                        const {recoveryReason, recoveryReceipt, recoveryAmount, recoveryDate, recoveryPoint} = recoveryField
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
                                        if (recoveryReason){
                                            ct4++
                                            if (Number(recoveryReason || 0) > 1){
                                                foundDebtReasons.push(recoveryReason)
                                            }
                                        }
                                    })
                                    if (ct===requiredNo && ct1===requiredNo && ct2===requiredNo && ct3===requiredNo && ct4===requiredNo){
                                        const recoveryData = {
                                            recoveryFields,
                                            recoveryEmployeeId,
                                            recoveryMonth
                                        }
                                        
                                        let foundVoidReceipt = false
                                        let voidReceiptDetails = {}
                                        let voidReceipts = []
                                        const recoveryPoints = []
                                        recoveryFields.forEach((field)=>{
                                            let usedReceipt = paymentReceipts.find((payrec)=>{
                                                const payRecs = String(payrec?.paymentReceipt).split(',').map((rec)=>{
                                                    if (rec.trim('').toLowerCase()==='cash'){
                                                        return rec.trim('')
                                                    }else{
                                                        return Number(rec.trim(''))
                                                    }
                                                }).filter((fltRec)=>{
                                                    return fltRec !== 'cash'
                                                })
                                                let accRecs = String(field.recoveryReceipt).split(',').filter((rec)=>{
                                                    return rec.trim('').toLowerCase()!=='cash'
                                                })
                                                let accRecFiltered = accRecs.filter((fltRec)=>{
                                                    return (
                                                        (payrec.paymentReceipt === Number(fltRec) 
                                                        || payRecs.includes(Number(fltRec)))
                                                        && payrec.paymentPoint === field.recoveryPoint
                                                    )
                                                })
                                                return accRecFiltered.length > 0
                                            })
                                            if (usedReceipt){
                                                voidReceipts.push(usedReceipt)
                                                recoveryPoints.push(usedReceipt.paymentPoint)
                                            }
                                        })

                                        if (voidReceipts.length){
                                            foundVoidReceipt = true
                                            voidReceiptDetails = {
                                                voidReceipt: voidReceipts[0]?.paymentReceipt,
                                                voidReceiptDate: voidReceipts[0]?.paymentDate,
                                                voidReceiptPoint: voidReceipts[0]?.paymentPoint,
                                                voidReceiptAmount: voidReceipts[0]?.paymentAmount,
                                                voidReceiptModule: voidReceipts[0]?.paymentModule,
                                                voidReceiptHandler: voidReceipts[0]?.paymentHandler
                                            }
                                            recoveryData.voidReceipt = voidReceiptDetails
                                            if (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('approveRecovery')){
                                                if (foundDebtReasons.length && foundDebtReasons.length === voidReceipts.length){
                                                }else{
                                                    setAlertState('error')
                                                    setAlert(`Receipt Number Already Used For ${recoveryPoints.join(', ')} Payment Point(s)`);
                                                    setAlertTimeout(5000)
                                                    return
                                                }
                                            }
                                        }else{
                                            let voidReceipts1 = []
                                            recoveryFields.forEach((field)=>{
                                                let voidReceipts2 = paymentReceipts.filter((payrec)=>{
                                                    const payRecs = String(payrec?.paymentReceipt).split(',').map((rec)=>{
                                                        if (rec.trim('').toLowerCase()==='cash'){
                                                            return rec.trim('')
                                                        }else{
                                                            return Number(rec.trim(''))
                                                        }
                                                    }).filter((fltRec)=>{
                                                        return fltRec !== 'cash'
                                                    })
                                                    let accRecs = String(field.recoveryReceipt).split(',').filter((rec)=>{
                                                        return rec.trim('').toLowerCase()!=='cash'
                                                    })
                                                    let accRecFiltered = accRecs.filter((fltRec)=>{
                                                        payRecs.forEach((prtRec)=>{
                                                            return(
                                                                String(fltRec).toLowerCase()!=='cash' && Number(prtRec) > Number(fltRec)
                                                                && payrec.paymentPoint === field.recoveryPoint && payrec.paymentDate < field.recoveryDate
                                                            )
                                                        })
                                                    })
                                                    return accRecFiltered.length > 0                                                    
                                                })
                                                if(voidReceipts2.length){
                                                    voidReceipts1 = voidReceipts1.concat(voidReceipts2)                                                    
                                                }
                                            })
                                            if (voidReceipts1.length){
                                                foundVoidReceipt = true
                                                voidReceiptDetails = {
                                                    voidReceipt: voidReceipts1[0]?.paymentReceipt,
                                                    voidReceiptDate: voidReceipts1[0]?.paymentDate,
                                                    voidReceiptPoint: voidReceipts1[0]?.paymentPoint,
                                                    voidReceiptAmount: voidReceipts1[0]?.paymentAmount,
                                                    voidReceiptModule: voidReceipts1[0]?.paymentModule,
                                                    voidReceiptHandler: voidReceipts1[0]?.paymentHandler
                                                }
                                                recoveryData.voidReceipt = voidReceiptDetails
                                                // setAlertState('error')
                                                // setAlert('Payment Receipt Number Already Used for an Earlier Date for the Selected Payment Point!')
                                                // setAlertTimeout(5000)
                                                // return
                                            }
                                        }
                                        if (curApproval && curApproval?.approved){  
                                            if (companyRecord?.status !=='admin' && !companyRecord?.permissions.includes('allow_recovery_posts')){
                                                setAlertState('error')
                                                setAlert('You are not allowed to post recovery!')
                                                setAlertTimeout(3000)
                                                return
                                            }                
                                        }
                                        if (!postingRecovery){
                                            setPostingRecovery(true)
                                            const result = await runApprovalWorkFlow(postingDate, curApproval, 'sales', 'postrecovery', recoveryData, postRecovery)
                                            if (result){
                                                setPostingRecovery(false)
                                            }
                                        }
                                    }else{
                                        setAlertState('error')
                                        setAlert(
                                            `${ct<requiredNo?' "All Receipt Numbers Must Be Entered", ':''}\
                                            ${ct1<requiredNo?' "All Recovery Amounts Must Be Greater Than 0", ':''}\
                                            ${ct3<requiredNo?' "All Recovery Points Must Be Selected", ':''}\
                                            ${ct4<requiredNo?' "All Recovery Reasons Must Be Specified", ':''}\
                                            ${ct2<requiredNo?' "All Recovery Dates Must Be Specified", ':''}`
                                        )
                                        setAlertTimeout(3000)                                        
                                    }
                                }
                            }}
                        >{recoveryStatus ? (curApproval?.approved? recoveryStatus: (isApprover?'Approve Request':'Request Approval')) : (isApprover?'Approve Request':'Request Approval')}</div>}

                        {salesOpts === 'rentals' && <div className='yesbtn salesyesbtn'
                            style={{
                                cursor:(rentalFields.paymentAmount && rentalFields.expectedPayment)?'pointer':'not-allowed'
                            }}
                            onClick={()=>{
                                if (rentalFields.paymentAmount && rentalFields.expectedPayment){
                                    if (curApproval && curApproval?.approved){  
                                        if (companyRecord?.status !=='admin' && !companyRecord?.permissions.includes('allow_rental_posts')){
                                            setAlertState('error')
                                            setAlert('You are not allowed to post rentals!')
                                            setAlertTimeout(3000)
                                            return
                                        }                
                                    }
                                    runApprovalWorkFlow(postingDate, curApproval, 'sales', 'postrentals', rentalFields, postRentals)                                    
                                }
                            }}
                        >{curApproval ? (curApproval.approved? rentalsStatus: (isApprover?'Approve Request':'Request Approval')) : (isApprover?'Approve Request':'Request Approval')}</div>}                        
                    </div>}
                </div>
            </div>
        </>
    )
}

const SalesEntry = ({salesUnits, salesUnit, payPointAccounts, field, index, handleFieldChange, isView})=> {
    const [open, setOpen] = useState(false)
    const [salesAmount, setSalesAmount] = useState(0)
    const [kitchenSalesAmount, setKitchenSalesAmount] = useState(0)
    useEffect(()=>{
        var sum = 0
        Object.keys(field[salesUnit]).forEach((payPoint)=>{
            sum += Number(field[salesUnit][payPoint])
        })
        setSalesAmount(sum)
        
        if (field.isSplit){
            var kitchenSum = 0
            Object.keys((field?.[`Kitchen-${salesUnit}`] || [])).forEach((payPoint)=>{
                kitchenSum += Number(field?.[`Kitchen-${salesUnit}`]?.[payPoint] || 0)
            })
            setKitchenSalesAmount(kitchenSum)
        }
    },[field[salesUnit], field?.[`Kitchen-${salesUnit}`]])
    return (
        <div className='salesunit'>
            <div className='salesunittag'>
                <div>
                    {salesUnit.toUpperCase()}
                </div>
                <div><b>Sales ({salesUnit}): </b>{`${Number(salesAmount).toLocaleString()}`}</div>
                {kitchenSalesAmount>0 && <div><b>Sales ({`Kitchen`}): </b>{`${Number(kitchenSalesAmount).toLocaleString()}`}</div>}
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
                    field?.isSplit ? 
                    <div style={{display: 'block', padding:'0px 5px', margin:'5px', border: 'solid black 0.8px', borderRadius: '5px'}}>
                        <div className='inpcov' key={id}>
                            <div>{`(${salesUnit}) ${payPointAccounts[payPoint]}`}</div>
                            <input 
                                className='forminp'
                                name={salesUnit}
                                category={payPoint}
                                type='number'
                                placeholder={payPoint}
                                value={field[salesUnit][payPoint]}
                                disabled={isView || (field.isAccommodation) || (field.isKitchen) || (field.isSession)}
                                onChange={(e)=>{
                                    handleFieldChange({index,e})
                                }}
                            />
                        </div>
                        <div className='inpcov' key={id+'a'}>
                            <div>{`(${'Kitchen'}) ${payPointAccounts[payPoint]}`}</div>
                            <input 
                                className='forminp'
                                name={`Kitchen-${salesUnit}`}
                                category={payPoint}
                                type='number'
                                placeholder={payPoint}
                                value={field[`Kitchen-${salesUnit}`]?.[payPoint] || ''}
                                disabled={isView || (field.isAccommodation) || (field.isKitchen) || (field.isSession)}
                                onChange={(e)=>{
                                    handleFieldChange({index,e})
                                }}
                            />
                        </div>
                    </div> 
                    : <div className='inpcov' key={id}>
                        <div>{payPointAccounts[payPoint]}</div>
                        <input 
                            className='forminp'
                            name={salesUnit}
                            category={payPoint}
                            type='number'
                            placeholder={payPoint}
                            value={field[salesUnit][payPoint]}
                            disabled={isView || (field.isAccommodation) || (field.isKitchen) || (field.isSession)}
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
                // costPrice: cummulativeUnitCostPrice,
                costPrice: Number(product.costPrice),
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
                // costPrice: cummulativeUnitCostPrice,
                costPrice: Number(product.costPrice),
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
            let sessionSalesAmount = 0
            console.log('start: 0')
            record.forEach((saleRecord)=>{
                if (saleRecord.salesPoint === 'accomodation'){
                    accommodationAmount += Number(saleRecord.totalSales)
                }
                if (saleRecord.isSession){
                    sessionSalesAmount += Number(saleRecord.cashSales) + Number(saleRecord.bankSales) + Number(saleRecord.debt) + Number(saleRecord.shortage)
                    if (!isProductView){
                        sessionSalesAmount -= (Number(saleRecord.unAccountedSales ? saleRecord.unAccountedSales : 0) + Number(saleRecord.shortage))
                    }
                }
            })
            let totalSalesAmount = Number(totalCashSales)+Number(totalBankSales)+Number(totalDebt)+Number(totalShortage) - accommodationAmount - sessionSalesAmount
            if (curSale.salesSessions && isProductView){
                totalSalesAmount += Number(sessionSalesAmount)
            }
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
                        {(!isProductView || (curSale.approval?.message && curSale.approval !== undefined)) && <div
                            className='slprwh-print'
                            onClick={()=>{
                                resetSalesEntries()
                            }}
                        >Reset</div>}
                        {(companyRecord?.status==='admin' || companyRecord?.permissions.includes('export_sales_report')) && isProductView && <div
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
                                    ${(companyRecord.status==='admin' || true) ? 
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
                                            disabled={isProductView || (!curSale.approval?.message && curSale.approval !== undefined) || true}
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
                                    if(curSale!==null && [undefined, null].includes(curSale.approval)){
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