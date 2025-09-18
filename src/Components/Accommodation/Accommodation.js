import './Accommodation.css'
import PaymentReceiptsModal from '../DashView/PaymentReceiptsModal'
import { useState, useEffect, useContext, use } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { FaChevronDown, FaChevronUp, FaReceipt } from "react-icons/fa";
import AccommodationReceipt from './AccommodationReport/AccommodationReceipt';
import AccommodationReport from './AccommodationReport/AccommodationReport';
import ApprovalBox from '../../Resources/ApprovalBox/ApprovalBox';
import { FaTableCells } from "react-icons/fa6";
import Notify from '../../Resources/Notify/Notify';
import { MdAdd } from "react-icons/md";
import { RxReset } from "react-icons/rx";
import { MdDelete } from "react-icons/md";

const Accommodation = ()=>{
    const {storePath, 
        fetchServer, 
        server, 
        companyRecord, 
        company, recoveryVal, allowBacklogs,
        employees, getEmployees,
        accommodations, setAccommodations, getAccommodations, months, 
        customers, setCustomers, getCustomers,
        getDate, removeComma, showApprovalBox, setShowApprovalBox,
        alert,alertState,alertTimeout,actionMessage, 
        setAlert, setAlertState, setAlertTimeout, setActionMessage,
        approvals, getApprovals, postApprovalUpdate, runApprovalWorkFlow,
        paymentReceipts, obtainPaymentReceipts,
        removeApproval, curApproval, setCurApproval, setApprovalStatus, setApprovalMessage,
    } = useContext(ContextProvider)

    const [showReport, setShowReport] = useState(false)
    const [showReceipt, setShowReceipt] = useState(false)
    const [showReceiptsModal, setShowReceiptsModal] = useState(false)
    const [reportSales, setReportSales] = useState(null)
    const [isMultiple, setIsMultiple] = useState(false)
    const [saleFrom, setSaleFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
    const [saleTo, setSaleTo] = useState(new Date(Date.now()).toISOString().slice(0, 10))
    const [accommodationCustomer, setAccommodationCustomer] = useState('')   
    const [deleteCount, setDeleteCount] = useState(0)
    const [salesOpts, setSalesOpts] = useState('accommodation')
    const [salesOpts1, setSalesOpts1] = useState('accommodation')

    const [accommodationApprovals, setAccommodationApprovals] = useState([])
    const [isApprover, setIsApprover] = useState(false)

    const [accommodationStatus, setAccommodationStatus] = useState('Post Accommodation')
    const [fillmode, setFillMode] = useState('')
    const [customerStatus, setCustomerStatus] = useState('Add Customer')
    const [postingDate, setPostingDate] = useState(new Date(Date.now()).toISOString().slice(0, 10))
    const [curAccommodation, setCurAccomodation] = useState(null)
    const [curCustomer, setCurCustomer] = useState(null)
    const [unPaidAccommodations, setUnPaidAccommodations] = useState([])
    const [selectedUnPaidAccommodations, setSelectedUnPaidAccommodations] = useState([])
    const [curSelectedUnPaidAccommodation, setCurSelectedUnPaidAccommodation] = useState('')
    const [curPaymentAmount, setCurPaymentAmount] = useState(0)    
    const rooms = {
        '1':{
            price: 10000
        },
        '2':{
            price: 10000
        },
        '3':{
            price: 10000
        },
        '4':{
            price: 10000
        },
        '5':{
            price: 15000
        },
        'SHORT REST':{
            price: 5000
        }
    }

    const defaultCustomerFields = {
        i_d: '',
        fullName: '',
        address: '',
        email: '',
        phoneNo: '',
        stateOfOrigin: '',
        localGovernmentArea: '',
    }

    const defaultAccommodationFields = {
        employeeId: companyRecord.emailid,
        customerId:'',
        arrivalDate: new Date(Date.now()).toISOString().slice(0, 10), 
        departureDate:'',
        arrivalTime: '',
        departureTime: '',
        roomNo: '',
        accommodationAmount: '',
        paymentStatus: 'Make Payment',
        paymentAmount: 0,
        payPoint: '',
        paymentReceipt:''
    }

    const payPoints = {
        'moniepoint1':'MP1-8198068382', 'moniepoint2':'MP2-5342270174', 
        'moniepoint3':'MP3-5399647958', 'moniepoint4':'MP4-5536588063', 
        'cash':'CASH', 'Employee':'EMPLOYEE'
    } 

    const [accommodationFields, setAccommodationFields] = useState({...defaultAccommodationFields})
    const [customerFields, setCustomerFields] = useState({
        ...defaultCustomerFields
    })
    const [isView, setIsView] = useState(false)

    useEffect(()=>{
        storePath('accommodations')  
    },[storePath])

    useEffect(()=>{
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        getApprovals(cmp_val)
        getEmployees(cmp_val)
        getCustomers(cmp_val)
        getAccommodations(cmp_val)
        const intervalId = setInterval(()=>{
          if (cmp_val){
            getApprovals(cmp_val)
            getEmployees(cmp_val)
            getCustomers(cmp_val)
            getAccommodations(cmp_val)
          }
        },45000)
        return () => clearInterval(intervalId);
    },[window.localStorage.getItem('sessn-cmp')])
    
    useEffect(()=>{
        setAccommodationApprovals(approvals.filter((appr)=>{
            return (
                appr.module === 'accommodation'
                && appr.section.toUpperCase() === 'postAccommodation'.toUpperCase()
            )
        }))
        
    }, [approvals])

    useEffect(()=>{
        if (curAccommodation?.paymentStatus === 'Make Payment'){
            setSelectedUnPaidAccommodations([])
            setCurSelectedUnPaidAccommodation('')
            setCurPaymentAmount(0)            
        }
        if (curAccommodation){
            setPostingDate(curAccommodation.postingDate)
            setAccommodationFields({...curAccommodation})
            setIsView(true)
        }
        else{
            setPostingDate(new Date(Date.now()).toISOString().slice(0, 10))
        }
        if (curApproval){
            setPostingDate(curAccommodation.postingDate)
            setAccommodationFields({...curAccommodation, ...curApproval.data})
            setIsView(true)
        }
    },[curAccommodation, curApproval])

    useEffect(()=>{
        const pendings = accommodations.filter((accommodation)=>{ return accommodation.paymentStatus === 'Make Payment' && accommodation.createdAt !== (curAccommodation ? curAccommodation.createdAt : 0)})
        setUnPaidAccommodations(pendings)
    },[accommodations, curAccommodation])
    useEffect(()=>{
        if (!isView){
            setCustomerFields((customerFields)=>{
                return {...customerFields, i_d:'CO-'+Number(customers.length+1)}
            })
        }
    },[customers, isView])
    useEffect(()=>{
        if (!allowBacklogs){
            setSaleFrom(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
        }
        if(companyRecord?.permissions.includes('postAccommodation') || companyRecord?.status==='admin'){
            setIsApprover(true)
        }
    },[companyRecord])
    useEffect(()=>{
        if (accommodationCustomer){
            calculateAccommodationSales()
        }else{
            setReportSales(null)
        }
    },[accommodationCustomer])

    useEffect(()=>{
        if (reportSales){
            handleAccommodationViewClick(reportSales)
        }
    },[reportSales])
    
    useEffect(()=>{
        if (salesOpts){
            setIsView(false)
            setCurApproval(null)
            setCurAccomodation(null)
            setAccommodationFields({...defaultAccommodationFields})
            setCurCustomer(null)
            setCustomerFields({...defaultCustomerFields})    
            setCustomerFields((customerFields)=>{
                return {...customerFields, i_d:'CO-'+Number(customers.length+1)}
            })
            setFillMode('')
        }
    },[salesOpts])

    const calculateAccommodationSales = ()=>{
        var salesReportList = []        
        {customers.forEach((customer)=>{
            if (!accommodationCustomer){
                const salesDoc = {}
                salesDoc.customerId = customer.i_d
                salesDoc.phoneNo = customer.phoneNo
                var totalAccommodationAmount = 0
                var totalPaymentAmount = 0
                var totalAccommodationDays = 0
                const roomDays = {}
                accommodations.filter((ftrsale)=>{
                    const slPostingDate = new Date(ftrsale.postingDate).getTime()
                    const fromDate = new Date(saleFrom).getTime()
                    const toDate = new Date(saleTo).getTime()
                    if ( slPostingDate>= fromDate && slPostingDate<=toDate
                    ){
                        return ftrsale
                    }
                }).forEach((accommodation,index)=>{
                    if (accommodation.customerId === customer.i_d){
                        var accommodationDays = 1
                        const arrivalDate = new Date(accommodation.arrivalDate).getTime()
                        const departureDate = new Date(accommodation.departureDate).getTime()
                        const days = (departureDate - arrivalDate) / (24*60*60*1000)
                        accommodationDays = days ? days : accommodationDays
                        roomDays[accommodation.roomNo] = Number(roomDays[accommodation.roomNo] || 0) + accommodationDays
                        totalAccommodationAmount +=  Number(accommodation.accommodationAmount)
                        totalPaymentAmount += Number(accommodation.paymentAmount) 
                        totalAccommodationDays += accommodationDays
                    }
                })       
                if (totalAccommodationDays){
                    salesDoc.totalAccommodationAmount = totalAccommodationAmount
                    salesDoc.totalPaymentAmount = totalPaymentAmount
                    salesDoc.roomDays = roomDays
                    salesDoc.totalAccommodationDays = totalAccommodationDays
                    salesReportList = salesReportList.concat(salesDoc)
                }
            }else{
                accommodations.filter((ftrsale)=>{
                    const slPostingDate = new Date(ftrsale.postingDate).getTime()
                    const fromDate = new Date(saleFrom).getTime()
                    const toDate = new Date(saleTo).getTime()
                    if ( slPostingDate>= fromDate && slPostingDate<=toDate
                    ){
                        return ftrsale
                    }
                }).forEach((accommodation)=>{
                    if (accommodation.customerId === customer.i_d && customer.i_d === accommodationCustomer){                                    
                        const {employeeId, arrivalDate, departureDate, paymentReceipt,
                            accommodationAmount, postingDate, roomNo, paymentAmount, payPoint
                        } = accommodation
                        var accommodationDays = 1
                        const days = (new Date(departureDate).getTime() - new Date(arrivalDate).getTime()) / (24*60*60*1000)
                        accommodationDays = days ? days : accommodationDays
                        const cusSaleDoc = {}
                        cusSaleDoc.postingDate = postingDate
                        cusSaleDoc.roomNo = roomNo
                        cusSaleDoc.accommodationDays = accommodationDays
                        cusSaleDoc.accommodationAmount = accommodationAmount
                        cusSaleDoc.paymentAmount = paymentAmount
                        cusSaleDoc.payPoint = payPoint
                        cusSaleDoc.paymentReceipt = paymentReceipt
                        cusSaleDoc.employeeId = employeeId
                        salesReportList = salesReportList.concat(cusSaleDoc)
                    }
                })
            }
            
        })}
        setReportSales([...salesReportList])
    }
    const postAccommodation = async ()=> { 
        setAccommodationStatus('Posting Accommodation...')        
        const newAccommodation = {
            ...accommodationFields,
            postingDate: postingDate,
            createdAt: new Date().getTime(),            
        }

        const newAccommodations = [newAccommodation, ...accommodations]        
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Accommodations", 
            update: newAccommodation
        }, "createDoc", server)
        
        if (resps.err){
            console.log(resps.mess)
            setAlertState('info')
            setAlert(resps.mess)
            setAlertTimeout(5000)
            setAccommodationStatus('Post Accommodation')
        }else{
            setAccommodations(newAccommodations)
            setCurAccomodation(newAccommodation)
            setIsView(true)
            setAccommodationFields({...newAccommodation})
            getAccommodations(company)
            setAlertState('success')
            setAlert('Accommodation Posted Successfully!')
            setAlertTimeout(5000)
            setAccommodationStatus('Post Accommodation')
            setFillMode('payment')
        }
    }

    const postPayment = async (accommodationFields)=>{
        setAlertState('info')
        setAlert(
            `Updating Payment Status...`
        )
        setAlertTimeout(100000)
        var paymentStatus = 'Partially Paid'
        if (accommodationFields.paymentAmount > 0 && Number(accommodationFields.paymentAmount) === Number(accommodationFields.accommodationAmount)){
            paymentStatus = 'Fully Paid'
        }
        const updatedPayment = {
            paymentAmount: accommodationFields.paymentAmount,
            payPoint: accommodationFields.payPoint,
            paymentReceipt: accommodationFields.paymentReceipt,
            paymentStatus: paymentStatus
        }
        
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Accommodations", 
            prop: [{createdAt: accommodationFields.createdAt}, updatedPayment]
          }, "updateOneDoc", server)
          
          if (resps.err){
            console.log(resps.mess)
            setAlertState('error')
            setAlert(
                resps.mess
            )
            setAlertTimeout(5000)
          }else{
            removeApproval(company, 'accommodation', 'postaccommodation', {                        
                createdAt: accommodationFields.createdAt,
                postingDate: accommodationFields.postingDate                                                  
            })
            getAccommodations(company)
            setCurAccomodation({...curAccommodation, ...updatedPayment})
            setAccommodationFields({...accommodationFields, ...updatedPayment})
            setIsView(true)
            setAlertState('success')
            setAlert(
                'Payment Updated Successfully!'
            )
            setAlertTimeout(5000)
          }
    }
    const handleCustomerViewClick = (customer) =>{
        setCurCustomer(customer)
        setSalesOpts('customers')
        setIsView(true)
        setCustomerFields({...customer})
        setIsView(true)
    }
    
    const handleAccommodationViewClick = (accommodation) =>{
        setCurAccomodation(accommodation)
        setSalesOpts('accommodation')
        if (fillmode){
            setFillMode('')
        }        
        setIsView(true)
    }

    const deleteAccommodation = async (accommodation)=>{
        const today = new Date()
        let postDate = new Date(accommodation.postingDate).toISOString().slice(0, 10)
        if (postDate < new Date(today.setDate(today.getDate()-1)).toISOString().slice(0, 10)){
            setAlertState('error')
            setAlert('Cannot delete accommodation after more than 1 day')
            setAlertTimeout(3000)
            return
        }
        if (deleteCount === accommodation.createdAt) {
            setAlertState('info')
            setAlert('Deleting...')
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Accommodations", 
                update: {createdAt: accommodation.createdAt}
            }, "removeDoc", server)
            if (resps.err){
                console.log(resps.mess)
                setAlertState('info')
                setAlert(resps.mess)
                setAlertTimeout(5000)
            }else{
                if (curApproval){
                    removeApproval(company, 'accommodation', 'postaccommodation', {                        
                        createdAt: curApproval.createdAt,
                        postingDate: curApproval.postingDate                                                  
                    })
                }
                setIsView(false)
                setCurApproval(null)
                setCurAccomodation(null)
                setAccommodationFields({...defaultAccommodationFields})
                setAlertState('success')
                setAlert('Accommodation Deleted Successfully!')
                setDeleteCount(0)
                setAlertTimeout(5000)
                getAccommodations(company)
            }
        }else{
            setDeleteCount(accommodation.createdAt)
            setTimeout(()=>{
                setDeleteCount(0)
            },12000)
        }
    }

    const handleSalesOpts = (e)=>{
        const name = e.target.getAttribute('name')
        if (name){
            setSalesOpts1(name)
            setSalesOpts(name)
        }
    }
    const handleSalesOpts1 = (e)=>{
        const name = e.target.getAttribute('name')
        if (name){
            setSalesOpts1(name)
            setSalesOpts(name)
        }
    }
    
    const handleCustomerFieldChange = (e)=>{
        const name = e.target.getAttribute('name')
        const value = e.target.value

        if (name){
            setCustomerFields((customerFields)=>{
                return {...customerFields, [name]:value}
            })
        }
    }

    const handleAccommodationFieldChange = (e)=>{
        const name = e.target.getAttribute('name')
        const value = e.target.value

        if (name){
            if (name==='roomNo'){
                if (value){
                    if (accommodationFields.arrivalDate && accommodationFields.departureDate){
                        const arrivalDate = new Date(accommodationFields.arrivalDate).getTime()
                        const departureDate = new Date(accommodationFields.departureDate).getTime()
                        var defaultDays = 1
                        const multiple = (departureDate - arrivalDate) / (24*60*60*1000)
                        defaultDays = multiple > 0 ? multiple : defaultDays
                        setAccommodationFields((accommodationFields)=>{
                            return {...accommodationFields, [name]:value, accommodationAmount : defaultDays * rooms[value]['price']}
                        })
    
                    }else{
                        setAccommodationFields((accommodationFields)=>{
                            return {...accommodationFields, [name]:value, accommodationAmount : rooms[value]['price']}
                        })    
                    }
                }else{
                    setAccommodationFields((accommodationFields)=>{
                        return {...accommodationFields, [name]:value, accommodationAmount:''}
                    })
                }
            }else if (name==='departureDate'){
                if (accommodationFields.arrivalDate){
                    const date = new Date(value)
                    const arrDate = new Date(accommodationFields.arrivalDate)
                    if (date >= arrDate){
                        const roomNo = accommodationFields.roomNo
                        const arrivalDate = new Date(accommodationFields.arrivalDate).getTime()
                        const departureDate = new Date(value).getTime()
                        var defaultDays = 1
                        const multiple = (departureDate - arrivalDate) / (24*60*60*1000)
                        defaultDays = multiple > 0 ? multiple : defaultDays
                        setAccommodationFields((accommodationFields)=>{
                            return {...accommodationFields, [name]:value, accommodationAmount : roomNo ? (defaultDays * rooms[roomNo]['price']): ''}
                        })
                    }else{
                        setAlertState('error')
                        setAlert('Departure Date cannot be less than arrival date')
                        setAlertTimeout(5000)
                    }
                }else{
                    setAlertState('error')
                    setAlert('Arrival Date is required')
                    setAlertTimeout(5000)
                    // setAccommodationFields((accommodationFields)=>{
                    //     return {...accommodationFields, [name]:value}
                    // })
                }
            }else if (name==='arrivalDate'){
                if (accommodationFields.arrivalDate){
                    const date = new Date(value)
                    const today = new Date()
                    if (date <= today){
                        const roomNo = accommodationFields.roomNo
                        const arrivalDate = new Date(value).getTime()
                        const departureDate = new Date(accommodationFields.departureDate).getTime()
                        var defaultDays = 1
                        const multiple = (departureDate - arrivalDate) / (24*60*60*1000)
                        defaultDays = multiple > 0 ? multiple : defaultDays
                        setAccommodationFields((accommodationFields)=>{
                            return {...accommodationFields, [name]:value, accommodationAmount : roomNo ? (defaultDays * rooms[roomNo]['price']): ''}
                        })
                    }else{
                        setAlertState('error')
                        setAlert('You cannot set the arrival date in the future!')
                        setAlertTimeout(5000)
                    }
                }else{
                    const date = new Date(value)
                    const today = new Date()
                    if (date <= today){
                        setAccommodationFields((accommodationFields)=>{
                            return {...accommodationFields, [name]:value}
                        })
                    }else{
                        setAlertState('error')
                        setAlert('You cannot set the arrival date in the future!')
                        setAlertTimeout(5000)
                    }
                }
            }else if (name==='payPoint'){
                if (value==='cash'){
                    setAccommodationFields((accommodationFields)=>{
                        return {...accommodationFields, [name]:value, paymentReceipt : 'CASH'}
                    })
                }else{
                    setAccommodationFields((accommodationFields)=>{
                        return {...accommodationFields, [name]:value}
                    })
                }
            }else if (name==='paymentAmount'){
                if (value <= Number(accommodationFields.accommodationAmount)){
                    setAccommodationFields((accommodationFields)=>{
                        return {...accommodationFields, [name]:value}
                    })
                }
            }else{
                setAccommodationFields((accommodationFields)=>{
                    return {...accommodationFields, [name]:value}
                })
            }
            
        }
    }
    const addCustomers = async ()=> {
        setCustomerStatus('Adding Customers...')        
        const newCustomer = {
            ...customerFields,
            createdAt: new Date().getTime(),            
        }

        const newCustomers = [newCustomer, ...customers]        
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Customers", 
            update: newCustomer
        }, "createDoc", server)
        
        if (resps.err){
            console.log(resps.mess)
            setAlertState('info')
            setAlert(resps.mess)
            setAlertTimeout(5000)
            setCustomerStatus('Add Customer')
        }else{
            setCustomers(newCustomers)
            setCurCustomer(newCustomer)
            setIsView(true)
            setCustomerFields({...newCustomer})
            getCustomers(company)
            setAlertState('success')
            setAlert('Customer Added Successfully!')
            setAlertTimeout(5000)
            setCustomerStatus('Add Customer')            
        }
    }
    const deleteCustomer = async (customer)=>{
        if (deleteCount === customer.createdAt) {
            var act=0
            accommodations.filter((accommodation)=>{
                if (accommodation.customerId === customer.i_d){
                    act++
                }
                if (act){
                    return 
                }
            })
            if (act){
                setActionMessage('')
                setAlertState('error')
                setAlert(
                    `The Customer Record is in use in another Model. Delete the Corresponding Record Before Proceeding`
                )
                setAlertTimeout(12000)
            }else{                
                setAlertState('info')
                setAlert('Deleting...')
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Customers", 
                    update: {createdAt: customer.createdAt}
                }, "removeDoc", server)
                if (resps.err){
                    console.log(resps.mess)
                    setAlertState('info')
                    setAlert(resps.mess)
                    setAlertTimeout(5000)
                }else{
                    setIsView(false)
                    setCurCustomer(null)
                    setCustomerFields({...defaultCustomerFields})
                    setAlertState('success')
                    setAlert('Customer Deleted Successfully!')
                    setDeleteCount(0)
                    setAlertTimeout(5000)
                    getCustomers(company)
                }
            }
        }else{
            setDeleteCount(customer.createdAt)
            setTimeout(()=>{
                setDeleteCount(0)
            },12000)
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
                    }}
                    module={'accommodation'}
                    section= {'postaccommodation'}
                    postApprovalUpdate={()=>{
                        postApprovalUpdate(company, 'accommodation', 'postaccommodation', curApproval)                        
                    }}
                />}         
                {showReport && <AccommodationReport
                    rooms={rooms}
                    reportSales = {reportSales}
                    multiple={!accommodationCustomer}
                    accommodationCustomer={accommodationCustomer}                  
                    setShowReport={(value)=>{
                        setShowReport(value)
                        if (!accommodationCustomer){
                            setReportSales(null)
                        }
                    }}              
                    fromDate = {saleFrom}
                    toDate = {saleTo}
                />} 
                {showReceipt && <AccommodationReceipt
                    curAccommodation = {curAccommodation}
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
                        // setActionMessage('Calculating...')
                        // acceptSalesDebt()
                    }}
                />}   
                <div className='emplist saleslist'> 
                    {companyRecord.status==='admin' && <FaTableCells                         
                        className='allslrepicon'
                        onClick={()=>{
                            calculateAccommodationSales()
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
                                    setAccommodationCustomer('')
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
                                    setAccommodationCustomer('')
                                }}
                            />
                        </div>
                    </div>     
                    <div className='emptypecov' 
                        onClick={handleSalesOpts1}
                    >
                        <div name='customers' className={salesOpts1==='customers' ? 'slopts': ''}>Customers</div>
                        <div name='accommodation' className={salesOpts1==='accommodation' ? 'slopts': ''}>Accommodation</div>
                    </div>                                                  
                    {salesOpts1 === 'accommodation' && companyRecord.status==='admin' && <div className='inpcov fltinpcov'>
                        <select 
                            className='forminp'
                            name='accommodationCustomer'
                            type='text'
                            value={accommodationCustomer}
                            onChange={(e)=>{
                                setAccommodationCustomer(e.target.value)                                
                            }}
                        >
                            <option value=''>All Customers</option>
                            {customers?.map((customer)=>{
                                return (
                                    <option 
                                        key={customer.i_d}
                                        value={customer.i_d}
                                    >
                                        {`(${customer.i_d}) ${customer.fullName.toUpperCase()}`}
                                    </option>
                                )
                            })}
                        </select>
                    </div>}
                    {salesOpts1 === 'accommodation' && accommodations?.filter((ftrsale)=>{
                        const slCreatedAt = new Date(ftrsale.postingDate).getTime()
                        const fromDate = new Date(saleFrom).getTime()
                        const toDate = new Date(saleTo).getTime()

                        if ( slCreatedAt>= fromDate && slCreatedAt<=toDate
                        ){
                            if (accommodationCustomer){
                                if (accommodationCustomer === ftrsale.customerId){
                                    return ftrsale
                                }
                            }else{
                                if (companyRecord?.status !== 'admin'){
                                    if (ftrsale.employeeId === companyRecord.emailid){
                                        return ftrsale
                                    }
                                }else{
                                    return ftrsale
                                }
                            }
                        }
                    }).map((accommodation, index)=>{
                        const accommodationApproval = accommodationApprovals.find((accappr)=>{
                            return accappr.link === accommodation.createdAt
                        })
            
                        if (accommodationApproval){                               
                            accommodation.approval = accommodationApproval
                        }
                        const {createdAt, postingDate, employeeId, customerId, roomNo, accommodationAmount,
                            arrivalDate, departureDate, arrivalTime, departureTime, paymentStatus, paymentAmount,
                            approval
                        } = accommodation 
                        var textColor = 'red'
                        if (approval?.approved){
                            textColor = 'green'
                        }
                        return(
                            <div className={'dept relative' + (curAccommodation?.createdAt===createdAt?' curview':'')} key={index} 
                                onClick={(e)=>{
                                    handleAccommodationViewClick(accommodation)
                                }}
                            >
                                <div 
                                    className={'stsvw'+(paymentStatus==='Fully Paid'?' stspd':' stsupd')}
                                    style  ={{
                                        border: approval? `solid ${textColor} 3px` : 'solid black 0px'
                                    }}
                                    onClick={()=>{

                                        setFillMode('payment')
                                        if (approval){
                                            setCurApproval(approval)
                                            setAccommodationFields({...accommodationFields, ...approval.data})
                                        }else{
                                            setCurApproval(null)
                                        }
                                    }}
                                >
                                        <div>{approval ? (approval.approved? paymentStatus: (isApprover?'Approve Payment':paymentStatus)) : (paymentStatus)}</div>
                                    </div>
                                <div className={'dets sldets'}>
                                    
                                    <div>Posting Date: <b>{getDate(postingDate)}</b></div>
                                    <div>Room No: <b>{roomNo}</b></div>
                                    <div>Rented By: {customers?.map((customer)=>{
                                        if (customerId === customer.i_d){
                                            return <b>{`${customer.fullName}`}</b>
                                        }
                                        
                                    })}</div>
                                    <div>Amount: <b>{'₦'+accommodationAmount.toLocaleString()}</b></div>
                                    <div>Payment Amount: <b>{'₦'+paymentAmount.toLocaleString()}</b></div>
                                    <div>Debt: <b>{'₦'+(Number(accommodationAmount) - Number(paymentAmount)).toLocaleString()}</b></div>
                                    <div>Arrival Date (Time): <b>{`${getDate(arrivalDate)} (${arrivalTime})`}</b></div>
                                    <div>Departure Date (Time): <b>{`${getDate(departureDate)} (${departureTime})`}</b></div>
                                    <div className='deptdesc'>{`Accommodation Posted By:`} <b>{
                                        employees.length?employees.filter((employee)=>{
                                            return employee.i_d === employeeId
                                        })[0]?.['firstName']:''
                                    }</b></div>
                                    {approval && isApprover && <div className='deptdesc' style={{fontWeight:'bold', fontSize: '12px'}}>Receipt No: {approval.data.paymentReceipt}</div>}
                                    {approval && isApprover && <div className='deptdesc' style={{fontSize:'13px', color:'red'}}>{
                                        approval.data?.voidReceipt && 
                                        <div onClick={()=>{setShowReceiptsModal(true)}}><span style={{fontWeight: 'bold'}}>Void Receipt Reason:</span> Receipt "{approval.data?.voidReceipt.voidReceipt}"" already used on {approval.data?.voidReceipt.voidReceiptDate} in {approval.data?.voidReceipt.voidReceiptPoint.toUpperCase()}. <a>Click to Find Receipt Report</a></div>
                                    }</div>}
                                </div>
                                {(companyRecord.status==='admin') && <div 
                                    className='edit'
                                    style={{color:'red', background: 'white', borderRadius: '8px', padding: '5px 10px', border:'solid red 1.3px'}}
                                    name='delete'         
                                    onClick={()=>{                                        
                                        setAlertState('info')
                                        setAlert('You are about to delete the selected Accommodation Record. Please Delete again if you are sure!')
                                        setAlertTimeout(5000)
                                        deleteAccommodation(accommodation)                                        
                                    }}
                                >
                                    Delete
                                </div>}
                            </div>
                        )
                  })}
                    {salesOpts1 === 'customers' && customers?.map((customer, index)=>{
                        const {i_d, fullName, email, phoneNo, createdAt, address, localGovernmentArea, stateOfOrigin} = customer
                        return(
                            <div className={'dept' + (curCustomer?.createdAt===createdAt?' curview':'')} key={index} 
                                onClick={(e)=>{
                                    handleCustomerViewClick(customer)
                                }}
                            >
                                <div className='dets sldets'>
                                    <div>Customer ID: <b>{i_d}</b></div>
                                    <div>Full Name: <b>{fullName}</b></div>
                                    <div>Phone No: <b>{phoneNo}</b></div>
                                    {email && <div>Email: <b>{email}</b></div>}
                                </div>
                                {(companyRecord.status==='admin') && <div 
                                    className='edit'
                                    name='delete'         
                                    style={{color:'red'}}                           
                                    onClick={()=>{                                                                                
                                        setAlertState('info')
                                        setAlert('You are about to delete the selected Customer Record. Please Delete again if you are sure!')
                                        setAlertTimeout(5000)                                                                                    
                                        deleteCustomer(customer)
                                    }}
                                >
                                    Delete
                                </div>}
                            </div>
                        )
                  })}
                </div>
                <div className='empview salesview'>
                    {isView && salesOpts==='accommodation' && 
                        <FaReceipt                   
                            className='slrepicon'
                            onClick={()=>{
                                setShowReceipt(true)                                
                            }}
                        />
                    }
                    {['accommodation','customers'].includes(salesOpts) &&
                        <MdAdd 
                            className='add slsadd'
                            onClick={()=>{
                                if (salesOpts==='accommodation'){
                                    setFillMode('')
                                    setIsView(false)
                                    setAccommodationFields({...defaultAccommodationFields})
                                    setCurAccomodation(null)
                                }else if (salesOpts==='customers'){
                                    setIsView(false)
                                    setCustomerFields({...defaultCustomerFields})
                                    setCurCustomer(null)
                                }
                                setCurApproval(null)
                                setIsApprover(false)
                                setSelectedUnPaidAccommodations([])
                                setCurSelectedUnPaidAccommodation('')
                                setCurPaymentAmount('')
                            }}
                        />
                    }
                    <div className='formtitle padtitle'>
                        <div className={'frmttle'}>
                            {`HOSPITALITY RECORDS`}
                        </div> 
                    </div>
                    
                    <div className='salesfm'>
                        {<div className='salesopts' onClick={handleSalesOpts}>
                            <div name='customers' className={salesOpts==='customers' ? 'slopts': ''}>Customers</div>                            
                            <div name='accommodation' className={salesOpts==='accommodation' ? 'slopts': ''}>Accommodation</div>
                        </div>}
                        
                        {salesOpts==='accommodation' && fillmode === '' && <div className='addnewsales'>
                            <div className='inpcov'>
                                <div>Employee ID</div>
                                <select 
                                    className='forminp'
                                    name='employeeId'
                                    type='text'
                                    value={accommodationFields.employeeId} 
                                    disabled={true}                                   
                                    onChange={(e)=>{
                                        handleAccommodationFieldChange(e)
                                    }}
                                >
                                    <option value=''>Select Sales Person</option>
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
                            </div>
                            <div className='inpcov'>
                                <div>Select Customer</div>
                                <select 
                                    className='forminp'
                                    name='customerId'
                                    type='text'
                                    value={accommodationFields.customerId}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleAccommodationFieldChange(e)                                
                                    }}
                                >
                                    <option value=''>Select Customer</option>
                                    {customers?.map((customer)=>{
                                        return (
                                            <option 
                                                key={customer.i_d}
                                                value={customer.i_d}
                                            >
                                                {`(${customer.i_d}) ${customer.fullName.toUpperCase()}`}
                                            </option>
                                        )
                                    })}
                                </select>
                            </div>
                            <div className='inpcov'>
                                <div>Room Number</div>
                                <select 
                                    className='forminp'
                                    name='roomNo'
                                    type='text'
                                    value={accommodationFields.roomNo}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleAccommodationFieldChange(e)                                
                                    }}
                                >
                                    <option value=''>Select Room No</option>
                                    {Object.keys(rooms).map((room)=>{
                                        return <option key={room} value={room}>{`ROOM ${room}`}</option>
                                    })}
                                </select>
                            </div>
                            <div className='inpcov'>
                                <div>Amount</div>
                                <input 
                                    className='forminp'
                                    name='accommodationAmount'
                                    type='number'
                                    placeholder='Amount'
                                    value={accommodationFields.accommodationAmount}
                                    disabled={true}
                                    onChange={(e)=>{
                                        handleAccommodationFieldChange(e)
                                    }}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Arrival Date</div>
                                <input 
                                    className='forminp'
                                    name='arrivalDate'
                                    type='date'
                                    placeholder='Arrival Date'
                                    value={accommodationFields.arrivalDate}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleAccommodationFieldChange(e)
                                    }}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Departure Date</div>
                                <input 
                                    className='forminp'
                                    name='departureDate'
                                    type='date'
                                    placeholder='Departure Date'
                                    value={accommodationFields.departureDate}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleAccommodationFieldChange(e)
                                    }}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Arrival Time</div>
                                <input 
                                    className='forminp'
                                    name='arrivalTime'
                                    type='time'
                                    placeholder='Arrival Time'
                                    value={accommodationFields.arrivalTime}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleAccommodationFieldChange(e)
                                    }}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Departure Time</div>
                                <input 
                                    className='forminp'
                                    name='departureTime'
                                    type='time'
                                    placeholder='Departure Time'
                                    value={accommodationFields.departureTime}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleAccommodationFieldChange(e)
                                    }}
                                />
                            </div>                                             
                        </div>}
                        {salesOpts==='accommodation' && fillmode === 'payment' && <div className='addnewsales'>
                            <div className='acpymdt'>{`Payment Details (Room No: ${accommodationFields.roomNo}, Date: ${accommodationFields.postingDate})`}</div>
                            <div className='inpcov'>
                                <div>Payment Amount</div>
                                <input 
                                    className='forminp'
                                    name='paymentAmount'
                                    type='number'
                                    placeholder='Payment Amount'
                                    value={accommodationFields.paymentAmount}
                                    disabled={isView && (['Partially Paid', 'Fully Paid'].includes(accommodationFields.paymentStatus) || curApproval?.approved)}
                                    onChange={(e)=>{
                                        handleAccommodationFieldChange(e)
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
                                    value={accommodationFields.payPoint}
                                    disabled={(isView && (['Partially Paid', 'Fully Paid'].includes(accommodationFields.paymentStatus) || curApproval?.approved)) || selectedUnPaidAccommodations.length>0}
                                    onChange={(e)=>{
                                        handleAccommodationFieldChange(e)
                                    }}
                                >
                                    <option value=''>Select Payment Point</option>
                                    {Object.keys(payPoints).map((payPoint, index)=>{
                                        return <option key={index} value={payPoint}>{payPoints[payPoint]}</option>
                                    })}
                                </select>
                            </div>                            
                            <div className='inpcov'>
                                <div>Payment Receipt</div>
                                <input 
                                    className='forminp'
                                    name='paymentReceipt'
                                    type='text'
                                    placeholder='Enter Receipt Number'
                                    disabled={(isView && (['Partially Paid', 'Fully Paid'].includes(accommodationFields.paymentStatus) || curApproval?.approved)) || accommodationFields.payPoint === 'cash' || selectedUnPaidAccommodations.length>0}
                                    value={accommodationFields.paymentReceipt}
                                    onChange={(e)=>{
                                        handleAccommodationFieldChange(e)
                                    }}
                                />
                            </div>
                            
                            {accommodationFields.paymentStatus==='Make Payment' && !curApproval && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('allow_group_payment')) && <>
                                <div className='acpymdt'>Apply Receipt to other Pending Accommodations</div>
                                <div className='inpcov'>
                                    <div>Select Other Accommodation to Pay</div>
                                    <select 
                                        className='forminp'
                                        name='multiplePayments'
                                        type='text'
                                        placeholder='Select A Pending Accommodation'
                                        value={curSelectedUnPaidAccommodation}
                                        onChange={(e)=>{
                                            setCurSelectedUnPaidAccommodation(e.target.value)
                                        }}
                                    >
                                        <option value=''>Select A Pending Accommodation</option>
                                        {unPaidAccommodations.filter((flt)=>{
                                            return !(selectedUnPaidAccommodations.map((sel)=>{return sel.createdAt})).includes(flt.createdAt) 
                                        }).map((accm, index1)=>{
                                            return <option key={index1} value={accm.createdAt}>{`Rooom ${accm.roomNo} (${accm.postingDate} By ${accm.customerId})`}</option>
                                        })}
                                    </select>
                                </div>
                                <div className='inpcov'>
                                    <div>Payment Amount</div>
                                    <input 
                                        className='forminp'
                                        name='paymentAmount'
                                        type='number'
                                        placeholder='Enter Payment Amount'
                                        disabled={!curSelectedUnPaidAccommodation}
                                        value={curPaymentAmount}
                                        onChange={(e)=>{
                                            const relatedAccommodation = unPaidAccommodations.find((accm)=>{return accm.createdAt === Number(curSelectedUnPaidAccommodation)})
                                            if (e.target.value <= Number(relatedAccommodation?.accommodationAmount || 0)){
                                                setCurPaymentAmount(e.target.value)
                                            }
                                        }}
                                    />
                                </div>
                                <div className='acpymdt' style={{marginTop: '0px'}}>
                                    <div 
                                        className='yesbtn salesyesbtn'
                                        title='Fill All Fields plus the payPoint and PayReceipt first'
                                        style={{
                                            cursor: (
                                                curSelectedUnPaidAccommodation 
                                                && curPaymentAmount
                                                && accommodationFields.payPoint
                                                && accommodationFields.paymentReceipt
                                            ) ? 'pointer' : 'not-allowed'
                                        }}
                                        onClick={()=>{
                                            if (
                                                curSelectedUnPaidAccommodation 
                                                && curPaymentAmount 
                                                && accommodationFields.payPoint
                                                && accommodationFields.paymentReceipt
                                            ){
                                                const selectedAcc = unPaidAccommodations.find((accm)=>{
                                                    return accm.createdAt === Number(curSelectedUnPaidAccommodation)
                                                })
                                                if (selectedAcc){
                                                    setSelectedUnPaidAccommodations((prevState)=>{
                                                        return [
                                                            {
                                                                ...selectedAcc,
                                                                paymentAmount: curPaymentAmount,
                                                                paymentReceipt: accommodationFields.paymentReceipt,
                                                                payPoint: accommodationFields.payPoint
                                                            }, 
                                                            ...prevState
                                                        ]
                                                    })
                                                    setCurSelectedUnPaidAccommodation('')
                                                    setCurPaymentAmount('')
                                                }
                                            }
                                        }}
                                    >
                                        Add Payment (+)
                                    </div>
                                </div>
                                {selectedUnPaidAccommodations.length>0 && selectedUnPaidAccommodations.map((accommodation, index)=>{
                                    return (
                                        <div className='acpymdt' key={index} style={{textAlign:'left'}}>
                                            <div>{`Room No: ${accommodation.roomNo}`}</div>
                                            <div>{`Payment Point: ${accommodation.payPoint}`}</div>
                                            <div>{`Amount: ₦${Number(accommodation.paymentAmount).toLocaleString()}`}</div>
                                            <div>{`Receipt No: ${accommodation.paymentReceipt || 'N/A'}`}</div>
                                            <div>{`Debt: ₦${(Number(accommodation.accommodationAmount) - Number(accommodation.paymentAmount)).toLocaleString()}`}</div>
                                            <p>....</p>
                                            {(accommodation.createdAt !== curAccommodation.createdAt) && <div 
                                                className = 'edit' 
                                                style={{color: 'red', cursor: 'pointer', marginTop: '3px'}}
                                                onClick={()=>{
                                                    setSelectedUnPaidAccommodations((prevState)=>{
                                                        return prevState.filter((accm, index1)=>{
                                                            return accm.createdAt !== accommodation.createdAt
                                                        })
                                                    })
                                                }}
                                            >Remove</div>}
                                        </div>
                                    )
                                })}
                            </>}
                            
                        </div>}
                        
                        {salesOpts==='customers' && <div className='basic'>                            
                            <div className='inpcov'>
                                <div>Customer ID</div>
                                <input 
                                    className='forminp'
                                    name='i_d'
                                    type='text'
                                    placeholder='Customer ID'
                                    value={customerFields.i_d}
                                    disabled={true}
                                    onChange={(e)=>{
                                        handleCustomerFieldChange(e)
                                    }}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Customer Name</div>
                                <input 
                                    className='forminp'
                                    name='fullName'
                                    type='text'
                                    placeholder='Customer Full Name'
                                    value={customerFields.fullName}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleCustomerFieldChange(e)
                                    }}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Address</div>
                                <input 
                                    className='forminp'
                                    name='address'
                                    type='text'
                                    placeholder='Customer Address'
                                    value={customerFields.address}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleCustomerFieldChange(e)
                                    }}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Email Address</div>
                                <input 
                                    className='forminp'
                                    name='email'
                                    type='text'
                                    placeholder='Email Address'
                                    value={customerFields.email}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleCustomerFieldChange(e)
                                    }}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Phone No</div>
                                <input 
                                    className='forminp'
                                    name='phoneNo'
                                    type='text'
                                    placeholder='Customer Phone No'
                                    value={customerFields.phoneNo}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleCustomerFieldChange(e)
                                    }}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>State of Origin</div>
                                <input 
                                    className='forminp'
                                    name='stateOfOrigin'
                                    type='text'
                                    placeholder='Stae of Origin'
                                    value={customerFields.stateOfOrigin}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleCustomerFieldChange(e)
                                    }}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Local Government Area</div>
                                <input 
                                    className='forminp'
                                    name='localGovernmentArea'
                                    type='text'
                                    placeholder='Customer LGA'
                                    value={customerFields.localGovernmentArea}
                                    disabled={isView}
                                    onChange={(e)=>{
                                        handleCustomerFieldChange(e)
                                    }}
                                />
                            </div>
                        </div>}                        
                    </div>
                    {(!isView || (curAccommodation?.paymentStatus!=='Fully Paid' && fillmode==='payment')) && <div className='confirm'>     
                        {(salesOpts === 'accommodation' && !fillmode) && <div className='inpcov salesinpcov'>
                            <input 
                                className='forminp'
                                name='postingDate'
                                type='date'
                                placeholder='Posting Date'
                                value={postingDate}
                                disabled={!companyRecord.status==='admin'}
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
                                    
                        {(salesOpts === 'accommodation' && accommodationFields?.paymentStatus==='Make Payment') && ((companyRecord?.status === 'admin') || companyRecord?.permissions.includes('accommodations')) && <div className='yesbtn salesyesbtn'
                            style={{
                                cursor:(accommodationFields.accommodationAmount && !accommodationFields.posted)?'pointer':'not-allowed'
                            }}
                            onClick={()=>{
                                if (accommodationFields.accommodationAmount){
                                    if (fillmode === 'payment'){
                                        if (accommodationFields.paymentAmount > 0 && accommodationFields.payPoint &&
                                            accommodationFields.paymentReceipt
                                        ){
                                        
                                            const paymentFields = {
                                                paymentAmount: accommodationFields.paymentAmount,
                                                payPoint: accommodationFields.payPoint,
                                                paymentReceipt: accommodationFields.paymentReceipt
                                            }
                                            let foundVoidReceipt = false
                                            let voidReceiptDetails = {}
                                            let usedReceipt = paymentReceipts.find((payrec)=>{
                                                return (
                                                    payrec.paymentReceipt === Number(accommodationFields.paymentReceipt)
                                                    && payrec.paymentPoint === accommodationFields.payPoint
                                                )
                                            })
                                            if (usedReceipt){
                                                foundVoidReceipt = true
                                                voidReceiptDetails = {
                                                    voidReceipt: usedReceipt?.paymentReceipt,
                                                    voidReceiptDate: usedReceipt?.paymentDate,
                                                    voidReceiptPoint: usedReceipt?.paymentPoint,
                                                    voidReceiptAmount: usedReceipt?.paymentAmount,
                                                    voidReceiptModule: usedReceipt?.paymentModule,
                                                    voidReceiptHandler: usedReceipt?.paymentHandler
                                                }
                                                paymentFields.voidReceipt = voidReceiptDetails
                                                if (companyRecord?.status === 'admin'){
                                                    setAlertState('error')
                                                    setAlert('Payment Receipt Number Already Used for the Selected Payment Point!')
                                                    setAlertTimeout(5000)
                                                    return
                                                }
                                            }else {
                                                let voidReceipts = paymentReceipts.filter((payrec)=>{
                                                    return(
                                                        payrec.paymentReceipt > Number(accommodationFields.paymentReceipt)
                                                        && payrec.paymentPoint === accommodationFields.payPoint && payrec.paymentDate < postingDate
                                                    )
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
                                                    paymentFields.voidReceipt = voidReceiptDetails

                                                    // if (companyRecord?.status === 'admin'){
                                                    //     setAlertState('error')
                                                    //     setAlert('Payment Receipt Number Already Used for an Earlier Date for the Selected Payment Point!')
                                                    //     setAlertTimeout(5000)
                                                    //     return
                                                    // }
                                                }
                                            }
                                                                                        
                                            runApprovalWorkFlow(postingDate, curApproval, 'accommodation', 'postaccommodation', paymentFields, ()=>{postPayment(accommodationFields)}, curAccommodation.createdAt)
                                            if (selectedUnPaidAccommodations.length){
                                                selectedUnPaidAccommodations.forEach((selectedAccommodation)=>{
                                                    let accPaymentFields = {
                                                        paymentAmount: selectedAccommodation.paymentAmount,
                                                        payPoint: selectedAccommodation.payPoint,
                                                        paymentReceipt: selectedAccommodation.paymentReceipt,
                                                        accommodationAmount: selectedAccommodation.accommodationAmount,
                                                        createdAt: selectedAccommodation.createdAt
                                                    }
                                                    if (foundVoidReceipt){
                                                        accPaymentFields.voidReceipt = voidReceiptDetails
                                                    }
                                                    runApprovalWorkFlow(postingDate, curApproval, 'accommodation', 'postaccommodation', accPaymentFields, ()=>{postPayment(accPaymentFields)}, selectedAccommodation.createdAt)
                                                })
                                            }

                                        }else{
                                            setActionMessage('')
                                            setAlertState('error')
                                            setAlert(
                                                `All Fields Are Required! Kindly Fill All`
                                            )
                                            setAlertTimeout(5000)
                                        }
                                    }else{
                                        var ct=0                                    
                                        var requiredNo = Object.keys(accommodationFields).length - 3
                                        Object.keys(accommodationFields).forEach((field)=>{
                                            if (accommodationFields[field]){
                                                ct++ 
                                            }
                                        })
                                        if (ct===requiredNo){
                                            if (!accommodationFields.posted){
                                                postAccommodation()
                                            }
                                            accommodationFields.posted = true
                                        }else{
                                            setActionMessage('')
                                            setAlertState('error')
                                            setAlert(
                                                `All Fields Are Required! Kindly Fill All`
                                            )
                                            setAlertTimeout(5000)                                        
                                        }
                                    }
                                }
                            }}
                        >{(fillmode==='payment')? 
                            (curApproval ? (curApproval.approved? 'Make Payment': (isApprover?'Approve Request':'Request Approval')) : (isApprover?'Approve Request':'Request Approval')) : 
                            accommodationStatus
                        }</div>}
                        {salesOpts === 'customers' && <div className='yesbtn salesyesbtn'
                            style={{
                                cursor:(customerFields.fullName && customerFields.phoneNo && !customerFields.posted)?'pointer':'not-allowed'
                            }}
                            onClick={()=>{
                                if (customerFields.fullName && customerFields.phoneNo){
                                    if (String(customerFields.phoneNo).split('').length === 11){
                                        if ((customers.map((customer)=>{return customer.phoneNo})).includes(customerFields.phoneNo)){
                                            setActionMessage('')
                                            setAlertState('error')
                                            setAlert(
                                                `Customer has been created before. The customer already exists!`
                                            )
                                            setAlertTimeout(8000) 
                                        }else{
                                            if (!customerFields.posted){
                                                addCustomers()
                                            }
                                            customerFields.posted = true
                                        }
                                    }else{
                                        setActionMessage('')
                                        setAlertState('error')
                                        setAlert(
                                            `Please enter a valid phone number!`
                                        )
                                        setAlertTimeout(5000) 
                                    }
                                }else{
                                    setActionMessage('')
                                    setAlertState('error')
                                    setAlert(
                                        `Customer Name and Phone No Fields are Required!`
                                    )
                                    setAlertTimeout(10000)   
                                }
                            }}
                        >{customerStatus}</div>}                        
                    </div>}
                </div>
            </div>
        </>
    )
}

export default Accommodation
