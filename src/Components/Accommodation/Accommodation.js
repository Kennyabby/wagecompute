import './Accommodation.css'
import { useState, useEffect, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { FaChevronDown, FaChevronUp, FaReceipt } from "react-icons/fa";
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
        company, recoveryVal, 
        employees,
        accommodations, setAccommodations, getAccommodations, months, 
        customers, setCustomers, getCustomers,
        getDate, removeComma, 
        alert,alertState,alertTimeout,actionMessage, 
        setAlert, setAlertState, setAlertTimeout, setActionMessage 
    } = useContext(ContextProvider)

    const [showReport, setShowReport] = useState(false)
    const [showReceipt, setShowReceipt] = useState(false)
    const [reportSales, setReportSales] = useState(null)
    const [isMultiple, setIsMultiple] = useState(false)
    const [saleFrom, setSaleFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
    const [saleTo, setSaleTo] = useState(new Date(Date.now()).toISOString().slice(0, 10))
    const [accommodationCustomer, setAccommodationCustomer] = useState('')   
    const [deleteCount, setDeleteCount] = useState(0)
    const [salesOpts, setSalesOpts] = useState('accommodation')
    const [salesOpts1, setSalesOpts1] = useState('accommodation')
    const [accommodationStatus, setAccommodationStatus] = useState('Post Accommodation')
    const [customerStatus, setCustomerStatus] = useState('Add Customer')
    const [postingDate, setPostingDate] = useState('')
    const [curAccommodation, setCurAccomodation] = useState(null)
    const [curCustomer, setCurCustomer] = useState(null)

    const rooms = {
        '1':{
            price: 10000
        },
        '2':{
            price: 15000
        },
        '3':{
            price: 7000
        },
        '4':{
            price: 5000
        },
        '5':{
            price: 20000
        },
    }
    const defaultCustomerFields = {
        i_d: '',
        fullName: '',
        address: '',
        email: '',
        phoneNo: '',
        stateOFOrigin: '',
        localGovernmentArea: '',
    }

    const defaultAccommodationFields = {
        employeeId: '',
        customerId:'',
        arrivalDate:'',
        departureDate:'',
        arrivalTime: '',
        departureTime: '',
        roomNo: '',
        accommodationAmount: '',
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
        if (curAccommodation){
            setPostingDate(curAccommodation.postingDate)
            setIsView(true)
        }else{
            setPostingDate(new Date(Date.now()).toISOString().slice(0, 10))
        }
    },[curAccommodation])
    
    useEffect(()=>{
        if (companyRecord.status!=='admin'){
            setSaleFrom(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
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

    const calculateAccommodationSales = ()=>{

    }
    const postAccommodation = async ()=> { 
        setCustomerStatus('Posting Accommodation...')        
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
        setIsView(true)
        setAccommodationFields({...accommodation})
        setIsView(true)
    }

    const deleteAccommodation = async (accommodation)=>{
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
                setIsView(false)
                setCurAccomodation(null)
                setAccommodationFields({...accommodationFields})
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
                    setAccommodationFields((accommodationFields)=>{
                        return {...accommodationFields, [name]:value, accommodationAmount:rooms[value]['price']}
                    })    
                }else{
                    setAccommodationFields((accommodationFields)=>{
                        return {...accommodationFields, [name]:value, accommodationAmount:''}
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
                {/* {showReport && <SalesReport
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
                {showReceipt && <RentalReceipt
                    rentalSale = {curRent}
                    month = {months[new Date(Date.now()).getMonth()]}
                    setShowReceipt={(value)=>{
                        setShowReceipt(value)                        
                    }}                                  
                />}     */}
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
                                disabled={companyRecord.status!=='admin'}
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
                                disabled={companyRecord.status!=='admin'}
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
                            return ftrsale
                        }
                    }).map((sale, index)=>{
                        const {createdAt, postingDate, totalCashSales, totalDebt, record, 
                            totalShortage, totalDebtRecovered, totalBankSales, recoveryList 
                        } = sale 
                        return(
                            <div className={'dept' + (curAccommodation?.createdAt===createdAt?' curview':'')} key={index} 
                                onClick={(e)=>{
                                    handleAccommodationViewClick(sale)
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
                                {(companyRecord.status==='admin') && <div 
                                    className='edit'
                                    name='delete'         
                                    style={{color:'red'}}                           
                                    onClick={()=>{                                        
                                        setAlertState('info')
                                        setAlert('You are about to delete the selected Accommodation. Please Delete again if you are sure!')
                                        setAlertTimeout(5000)
                                        deleteAccommodation(sale)
                                    }}
                                >
                                    Delete
                                </div>}
                            </div>
                        )
                  })}
                    {salesOpts1 === 'customers' && customers?.filter((ftrrent)=>{
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
                            <div className={'dept' + (curCustomer?.createdAt===createdAt?' curview':'')} key={index} 
                                onClick={(e)=>{
                                    handleCustomerViewClick(rent)
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
                                {(companyRecord.status==='admin') && <div 
                                    className='edit'
                                    name='delete'         
                                    style={{color:'red'}}                           
                                    onClick={()=>{                                        
                                        setAlertState('info')
                                        setAlert('You are about to delete the selected Customer Record. Please Delete again if you are sure!')
                                        setAlertTimeout(5000)                                                                                    
                                        deleteCustomer(rent)
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
                    {['accommodation','customers'].includes(salesOpts) && (!isView &&
                        <MdAdd 
                            className='add slsadd'
                            onClick={()=>{
                                if (salesOpts==='accommodation'){
                                    setIsView(false)
                                    setAccommodationFields({...defaultAccommodationFields})
                                    setCurAccomodation(null)
                                }else if (salesOpts==='customers'){
                                    setIsView(false)
                                    setCustomerFields({...defaultCustomerFields})
                                    setCurCustomer(null)
                                }
                            }}
                        />)
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
                        {salesOpts==='accommodation' && (!isView && <div className='addnewsales'>
                            <div className='inpcov'>
                                <div>Employee ID</div>
                                <select 
                                    className='forminp'
                                    name='employeeId'
                                    type='text'
                                    value={accommodationFields.employeeId}                                    
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
                                                                          
                        </div>)}
                        {salesOpts==='customers' && <div className='basic'>                            
                            <div className='inpcov'>
                                <div>Customer ID</div>
                                <input 
                                    className='forminp'
                                    name='i_d'
                                    type='text'
                                    placeholder='Customer ID'
                                    value={customerFields.i_d}
                                    disabled={isView}
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
                                    value={customerFields.stateOFOrigin}
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
                    {(!isView) && <div className='confirm'>     
                        {salesOpts === 'accommodation' && <div className='inpcov salesinpcov'>
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
                                    
                        {salesOpts === 'accommodation' && ((companyRecord?.status === 'admin') || recoveryVal) && <div className='yesbtn salesyesbtn'
                            style={{
                                cursor:accommodationFields.accommodationAmount?'pointer':'not-allowed'
                            }}
                            onClick={()=>{
                                if (accommodationFields.accommodationAmount){
                                    var ct=0                                    
                                    var requiredNo = Object.keys(accommodationFields).length
                                    Object.keys(accommodationFields).forEach((field)=>{
                                        if (accommodationFields[field]){
                                            ct++
                                        }
                                    })
                                    if (ct===requiredNo){
                                        postAccommodation()
                                    }else{
                                        setActionMessage('')
                                        setAlertState('error')
                                        setAlert(
                                            `All Fields Are Required! Kindly Fill All`
                                        )
                                        setAlertTimeout(10000)                                        
                                    }
                                }
                            }}
                        >{accommodationStatus}</div>}
                        {salesOpts === 'customers' && <div className='yesbtn salesyesbtn'
                            style={{
                                cursor:(customerFields.customerFullName && customerFields.customerPhoneNo && customerFields.customerAddress)?'pointer':'not-allowed'
                            }}
                            onClick={()=>{
                                if (customerFields.customerFullName && customerFields.customerPhoneNo && customerFields.customerAddress){
                                    addCustomers()
                                }else{
                                    setActionMessage('')
                                    setAlertState('error')
                                    setAlert(
                                        `Customer Name, Phone No, and Customer Address Fields are Required!`
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
