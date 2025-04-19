import React, { useState, useEffect, useContext, useRef } from 'react';
import ContextProvider from '../../Resources/ContextProvider';
import './PointOfSales.css';
import { MdShoppingBasket } from 'react-icons/md';

const PointOfSales = () => {
    // =========================================
    // 1. Context and State Management
    // =========================================
    const { 
        storePath,
        fetchServer, server, company, companyRecord,
        setAlert, setAlertState, setAlertTimeout,
        settings, getDate, posWrhAccess, employees, 
        profiles, fetchProfiles
    } = useContext(ContextProvider);

    // Core States
    const [isLive, setIsLive] = useState(false)
    const [liveErrorMessages, setLiveErrorMessages] = useState('Loading...')
    const [loading, setLoading] = useState(false);
    const [activeScreen, setActiveScreen] = useState('home');
    const [tables, setTables] = useState([]);
    const [orderTables, setOrderTables] = useState([]);
    const [currentTable, setCurrentTable] = useState(null)
    const [allSessions, setAllSessions] = useState([])
    const [sessions, setSessions] = useState(null);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [openingCash, setOpeningCash] = useState(0);
    const [countedSales, setCountedSales] = useState({})
    const [posSalesDifference, setPosSalesDifference] = useState({})
    const [startSession, setStartSession] = useState(false);
    const [endSession, setEndSession] = useState(false);
    const [sessionEnded, setSessionEnded] = useState(false);
    const [curSession, setCurrSession] = useState(null);
    const [sessionUser, setSessionUser] = useState(null);
    const [viewSesions, setViewSessions] = useState(false);
    const [loadSession, setLoadSession] = useState(true);
    const posContainerRef = useRef(null)
    const orderControllerRef = useRef(null)
    const sessionControllerRef = useRef(null)
    const tableControllerRef = useRef(null)
    const productControllerRef = useRef(null)
    const [tableFetchCount, setTableFetchCount] = useState(0)
    useEffect(()=>{
        storePath('pos')  
    },[storePath])

    // Order States
    const [currentOrder, setCurrentOrder] = useState(null);
    const [allSessionOrders, setAllSessionOrders] = useState([])
    const [allOrders, setAllOrders] = useState([]);
    const [tableOrders, setTableOrders] = useState([]);
    const [orderType, setOrderType] = useState('dine-in');

    // Product States
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [activeCategory, setActiveCategory] = useState(null);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [quantity, setQuantity] = useState('');

    // Modal States
    const [showNewTableModal, setShowNewTableModal] = useState(false);
    const [showOrdersModal, setShowOrdersModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [editingTable, setEditingTable] = useState(null);

    // Form States
    const [newTableData, setNewTableData] = useState({
        name: '',
        capacity: '',
        status: 'available'
    });
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        phone: ''
    });
    const [placingOrder, setPlacingOrder] = useState(false)
    const [makingPayment, setMakingPayment] = useState(false)
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');
    const [change, setChange] = useState(0);
    const paymentDetail = {
        amount: '',
        change: '',
        receipt: '',
    }
    const paymentDetailClone = structuredClone({paymentDetail})
    const [payPoints, setPayPoints] = useState({
        'moniepoint1':{...paymentDetailClone.paymentDetail}, 'moniepoint2':{...paymentDetailClone.paymentDetail}, 
        'moniepoint3':{...paymentDetailClone.paymentDetail}, 'moniepoint4':{...paymentDetailClone.paymentDetail}, 'cash':{...paymentDetailClone.paymentDetail}
    })
    const [paymentDetails, setPaymentDetails] = useState({...structuredClone({payPoints}).payPoints});

    // Settings States
    const [uoms, setUoms] = useState([]);
    const [wrhs, setWrhs] = useState([]);
    const [wrh, setWrh] = useState('');
    // =========================================
    // 2. Effects and Data Loading
    // =========================================
    useEffect(() => {
        handleSettingsUpdate();
    }, [settings]);
    useEffect(()=>{
        loadTableData()
        if (window.localStorage.getItem('pos-wrh')){
            setWrh(window.localStorage.getItem('pos-wrh'))
        }else{
            setWrh(Object.keys(posWrhAccess)[0])
        }
    },[])
    useEffect(() => {
        handleCategoryFilter();
    }, [activeCategory, products]);

    useEffect(()=>{
        if (products.length && tables.length && sessions?.length){
            setIsLive(true)
            setLoadSession(false)
            UpdateSessionState(sessions, false)
        }  
    },[tables, products, sessions])
    
    useEffect(()=> {
         loadInitialData()
         fetchProfiles(company)
    },[settings, currentOrder])
    useEffect(()=>{
        if (posContainerRef.current){
            if (loadSession || startSession || endSession){
                posContainerRef.current.style.overflow = 'hidden'
            }else{
                posContainerRef.current.style.overflow = 'auto'
            }
        }
    },[posContainerRef, loadSession, startSession, endSession])
    useEffect(()=>{
        if (tables.length && wrh && curSession && employees.length){
            setOrderTables((orderTables)=>{
                const activeOrders = []
                wrhs.forEach((warehouse)=>{
                    const prevTable = tables.find((table)=>{return table['wrh'] === warehouse.name})
                    prevTable?.activeTables?.forEach((activeOrder)=>{
                        if (activeOrder.status === 'pending'){
                            activeOrders.push(activeOrder)
                        }
                    })
                })
                orderTables.forEach((orderTable)=>{
                    const myTableOrders = []
                    const otherTableOrders  = []
                    var tableUser = null
                    activeOrders.forEach((activeOrder)=>{
                        var orderDate = '01/01/1970'
                        if (activeOrder.createdAt){
                            orderDate = activeOrder.createdAt
                        }
                        if (
                            activeOrder.tableId === orderTable.i_d &&
                            activeOrder.wrh === wrh &&
                            getSessionEnd(new Date(orderDate).getTime()) === getSessionEnd(curSession.start)                            
                        ){                            
                            if (                                
                                activeOrder.handlerId === companyRecord.emailid
                            ){
                                tableUser = employees.find(employee => employee.i_d === activeOrder.handlerId)
                                myTableOrders.push(activeOrder)
                            }else{
                                tableUser = employees.find(employee => employee.i_d === activeOrder.handlerId)
                                otherTableOrders.push(activeOrder)
                            }
                        }
                    })
                    if (myTableOrders.length){
                        orderTable.status = 'available'
                        orderTable.activeOrders = myTableOrders.length
                    }else{
                        if (otherTableOrders.length){
                            orderTable.status = 'unavailable'
                            orderTable.activeOrders = otherTableOrders.length
                        }else{
                            orderTable.status = 'available'
                            orderTable.activeOrders = 0
                        }                        
                    }
                    if ([null, undefined].includes(tableUser) && orderTable.activeOrders){
                        orderTable.tableUser = {
                            firstName: 'Admin',
                            lastName: ''
                        }
                    }else{
                        orderTable.tableUser = tableUser
                    }
                })
                return [...orderTables]
            })
        }
    },[tables,curSession, wrh, employees])
    const getSessionSales = (orders) =>{
        const payPointList = Object.keys(payPoints)
        const allSales = {}
        var totalCashChange = 0
        var totalPendingSales = 0
        var totalCancelledSales = 0
        var totalUnattendedSales = 0
        payPointList.forEach((payPoint)=>{
            allSales[payPoint] = 0
        })
        orders.forEach((order)=>{
            if (order.status !== 'cancelled'){
                if (order.status === 'pending'){
                    if (order.delivery === 'completed'){
                        totalPendingSales += Number(order.totalSales || 0)                    
                    }else{
                        totalUnattendedSales += Number(order.totalSales || 0)
                    }
                }else{
                    payPointList.forEach((payPoint)=>{
                        allSales[payPoint] += Number(order[payPoint] || 0)
                    })
                }
                totalCashChange += Number(order.cashChange || 0)
            }else{
                totalCancelledSales += Number(order.totalSales || 0)
            }          
        })
        return {allSales, totalPendingSales, totalUnattendedSales, totalCancelledSales, totalCashChange}
    }
    const createSession = async (sessionUser)=>{
        if (wrh){
            const newSession = {
                employee_id: ![null, undefined].includes(sessionUser)? (sessionUser.profile).emailid : companyRecord.emailid,
                i_d: new Date().getTime(),
                type:'sales',
                start: new Date().getTime(),
                startedBy: companyRecord.emailid,
                end: null,
                active: true, 
                openingCash: openingCash,
                debtDue: 0
            }
            const response = await fetchServer("POST", {
                database: company,
                collection: "POSSessions",
                update: {
                    ...newSession
                }
            }, "createDoc", server);
        
            if (response.err) {
                setAlertState('error');
                setAlert('Could not load session. Please check your internet connection!');
                setAlertTimeout(3000)
                return
            } else {
                setAlertState('success');
                if (![null, undefined].includes(sessionUser)){
                    setAlert('User Session Started Successfully!');
                }else{
                    setAlert('Welcome Back!');
                }
                setAlertTimeout(2000)
                setStartSession(false)
                setCurrSession(newSession)
                setOpeningCash(0)
                setAllSessions((allSessions)=>{return [...allSessions, newSession]})
                if (![null, undefined].includes(sessionUser)){
                    if (sessionUser.profile.emailid === companyRecord.emailid){
                        setSessions([newSession])                    
                    }
                }else{
                    setSessions([newSession]) 
                }
                setSessionUser(null)
                return
            }
        }else{
            setAlert('info')
            setAlert('Please Select Your Sales Post')
            setAlertTimeout(5000)
            return
        }
    }

    const stopSession = async (session, sessionOrders)=>{
        const {
            allSales, totalPendingSales, totalCancelledSales, totalCashChange
        } = getSessionSales(sessionOrders)
        const openingCash = session.openingCash
        let netBalance = 0
        let allSalesAmount = 0
        const salesDifference = {}
        Object.keys(payPoints).forEach((payPoint)=>{
            if (payPoint === 'cash'){
                var expectedCash = Number(openingCash) + Number(allSales[payPoint] || 0) - Number(totalCashChange)
                salesDifference[payPoint] = Number(countedSales[payPoint] || 0) - expectedCash
                allSalesAmount += (Number(allSales[payPoint] || 0) - Number(totalCashChange))
            }else{
                salesDifference[payPoint] = Number(countedSales[payPoint] || 0) - Number(allSales[payPoint] || 0)
                allSalesAmount += Number(allSales[payPoint] || 0)
            }
            netBalance += Number(salesDifference[payPoint])
        })
        netBalance += (-1 * Number(totalPendingSales || 0))
        const sessionUpdate = {
                end: new Date().getTime(),
                endedby: companyRecord.emailid,
                active: false,
                orders: sessionOrders,
                ...allSales,
                totalCashChange,
                totalSalesAmount: allSalesAmount,
                totalPendingSales,
                totalCancelledSales,
                debtDue: (netBalance < 0) ? Math.abs(netBalance) : 0,
                unAccountedSales : (netBalance > 0) ? netBalance : 0
        }
        const response = await fetchServer("POST", {
            database: company,
            collection: "POSSessions",
            prop: [{start: session.start},{
                ...sessionUpdate
            }]
        }, "updateOneDoc", server);
    
        if (response.err) {
            setAlertState('error');
            setAlert('Could not end session. Please check your internet connection!');
            setAlertTimeout(3000)
            return
        } else {
            setAlertState('success');
            if (![null, undefined].includes(sessionUser)){
                setAlert('User Session Ended Successfully!');
            }else{
                setAlert('Session Ended!');
            }
            setAlertTimeout(3000)
            setEndSession(false)
            setAllSessions((allSessions)=>{return [...allSessions, {...session, ...sessionUpdate}]})
            setCountedSales({})
            setSessionUser(null)
            setAlertTimeout(5000)
            return
        }
    }

    const getSessionEnd = (sessionStart) => {
        const closingHour = 8
        const sessionStartDate = new Date(sessionStart);
        const sessionEndDate = new Date(sessionStartDate);

        // Set the session end time to 8am of the same day
        sessionEndDate.setHours(closingHour, 0, 0, 0);

        // If the session started after 8am, set the end time to 8am of the next day
        if (sessionStartDate.getTime() >= sessionEndDate.getTime()) {
            sessionEndDate.setDate(sessionStartDate.getDate() + 1);
        }

        return sessionEndDate.getTime();
    };
    const UpdateSessionState = (sessions, loadSession)=>{
        if (!loadSession && sessions?.length){            
            const previousSession = sessions.filter((session)=> session.active)            
            if (previousSession.length){
                setCurrSession(previousSession[0])
                if(new Date().getTime() >= getSessionEnd(previousSession[0].start)){                
                    // setStartSession(false)
                    setSessionEnded(true)
                }else{
                    if (sessionUser === null){
                        setStartSession(false)
                        setSessionEnded(false)
                    }
                    // setEndSession(false)
                }
            } else {
                let oldSession = null
                if (sessions.length){
                    oldSession = sessions[sessions.length - 1]
                    setCurrSession(oldSession)
                    setSessionEnded(true)
                    setOpeningCash((Number(oldSession.openingCash || 0) + Number(oldSession.cash || 0) - Number(oldSession.totalCashChange || 0)))
                }
                if (companyRecord.status !== 'admin' && !companyRecord.permissions.includes('access_pos_sessions')){
                    setStartSession(true)
                }
                // setEndSession(false)
            }
        }else{
            if (!loadSession && !sessions.length){
                setStartSession(true)
                // setEndSession(false)
            }
        }
    } 
    useState(()=>{
        UpdateSessionState(sessions, loadSession)
    },[loadSession,sessions])
    // =========================================
    // 3. Data Loading Functions
    // =========================================

    const loadTableData = () =>{
        let orderTables = []
        for (let i=0; i<20; i++){
            const orderTable = {}
            orderTable.i_d = i+1
            orderTable.name = `Table ${i+1}`
            orderTable.capacity = 5
            orderTable.status = 'available'
            orderTable.activeOrders = 0
            orderTable.createdAt = Date.now()
            orderTables.push(orderTable)
        }
        setOrderTables(orderTables)
    }

     const loadInitialData = async () => {
        //abort previous request if it exists
        if (orderControllerRef.current) {
            orderControllerRef.current.abort();            
        }
        // if (productControllerRef.current) {
        //     productControllerRef.current.abort();
        // }
        // if (tableControllerRef.current) {
        //     if (tableFetchCount>2){
        //         tableControllerRef.current.abort();
        //     }
        // }
       
        // if (sessionControllerRef.current) {
        //     sessionControllerRef.current.abort();
        // }
        // Create new AbortControllers
        const orderController = new AbortController();
        // const productController = new AbortController();
        // const tableController = new AbortController();
        // const sessionController = new AbortController();

        // Store the controllers in refs
        orderControllerRef.current = orderController;
        // productControllerRef.current = productController;
        // tableControllerRef.current = tableController;
        // sessionControllerRef.current = sessionController;

         // Fetch tables
        const tablesResponse = await fetchServer("POST", {
            database: company,
            collection: "Tables"
        }, "getDocsDetails", server);
        if (!tablesResponse.err){
            setTables(tablesResponse.record)  
            if (sessions!==null){                
                setLoadSession(false)
                setIsLive(true)       
                UpdateSessionState(sessions, false)   
                // setTableFetchCount((prevCount)=>{return prevCount + 1})    
            }
        }else{
            if (tablesResponse.mess !== 'Request aborted'){
                setIsLive(false)
                setLiveErrorMessages('Slow Network. Check Connection')
            }
        }
        // Fetch products
        const productsResponse = await fetchServer("POST", {
            database: company,
            collection: "Products"
        }, "getDocsDetails", server);
        if(!productsResponse.err){
            setProducts(productsResponse.record)
            if (sessions?.length && tables.length){
                setIsLive(true)
                setLoadSession(false)
                UpdateSessionState(sessions, false)
            }
        }else{
            if (productsResponse.mess !== 'Request aborted'){
                setIsLive(false)
                setLiveErrorMessages('Slow Network. Check Connection')
            }
        }
        // Feth Sessions
        const sessionsResponse = await fetchServer("POST", {
            database: company,
            collection: "POSSessions",
            prop: {type:'sales'}
        }, "getDocsDetails", server);
        if(!sessionsResponse.err){
            const thisSessions = sessionsResponse.record.filter((session)=>{
                return session.employee_id === companyRecord.emailid
            })
            setSessions(thisSessions)
            setAllSessions(sessionsResponse.record)
            if (tables?.length){
                setLoadSession(false)
                setIsLive(true)
                UpdateSessionState(thisSessions, false)
            }
        }else{
            if (sessionsResponse.mess !== 'Request aborted'){
                setIsLive(false)
                setLiveErrorMessages('Slow Network. Check Connection')
            }
        }
        if (curSession){
            const ordersResponse = await fetchServer("POST", {
                database: company,
                collection: "Orders"
            }, "getDocsDetails", server, orderController.signal);
            if(!ordersResponse.err){
                setIsLive(true)
                if (![null,undefined].includes(ordersResponse.record)){
                    if(ordersResponse.record?.length){
                        setAllSessionOrders(ordersResponse.record)
                        setAllOrders(ordersResponse.record.filter((order) =>{
                            return (order.sessionId === curSession.i_d && order.handlerId === companyRecord.emailid)
                        })) 
                        var ordersUpdate = ordersResponse.record
                        if (currentOrder!==null){
                            if (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_sessions')){
                                setTableOrders(ordersUpdate.filter((order)=>{
                                    var orderDate = '01/01/1970'
                                    if (order.createdAt){
                                        orderDate = order.createdAt
                                    }
                                    if (
                                        order.tableId === currentOrder.tableId
                                        && order.wrh === wrh 
                                    ){
                                        // Check if the order is from the current session
                                        return getSessionEnd(new Date(orderDate).getTime()) === getSessionEnd(curSession.start)
                                    }
                                }))
                            }else{
                                const myTableOrders = ordersUpdate.filter(order => 
                                    order.tableId === currentOrder.tableId
                                    && order.wrh === wrh &&
                                    order.sessionId === curSession.i_d &&
                                    order.handlerId === companyRecord.emailid
                                )
                                setTableOrders(myTableOrders)
                            }
                        }
                    }
                }                
            }else{
                if (ordersResponse.mess !== 'Request aborted'){
                    setIsLive(false)
                    setLiveErrorMessages('Slow Network. Check Connection')
                }
            }
        }
        
    };

    const handleSettingsUpdate = () => {
        if (settings.length){  
            const uomSetFilt = settings.filter((setting)=> {
                return setting.name === 'uom'
            })
            delete uomSetFilt[0]?._id
            setUoms(uomSetFilt[0].name?[...uomSetFilt[0].mearsures]:[])

            const catSetFilt = settings.filter(setting => setting.name === 'product_categories');
            delete catSetFilt[0]?._id;
            setCategories(catSetFilt[0].name ? [...catSetFilt[0].categories] : []);

            const wrhSetFilt = settings.filter((setting)=> {
                return setting.name === 'warehouses'
            })

            delete wrhSetFilt[0]?._id
            setWrhs(wrhSetFilt[0].name ? [...wrhSetFilt[0].warehouses] : [])
        }  
    };

    // =========================================
    // 4. Table Management
    // =========================================
    const createNewOrder = (table) => {
        const newOrder = {
            orderNumber: generateOrderNumber(),
            tableId: table.i_d,
            handlerId: companyRecord.emailid,
            wrh:wrh,
            sessionId: curSession.i_d,
            tableName: table.name,
            items: [],            
            ...payPoints,
            status: 'new',
            createdAt: new Date().getTime()
        };
        setCurrentOrder(newOrder);
    };
    
    const handleTableSelect = async (table) => {
        if (!loadSession && !startSession && !endSession){
            if (table.status !== 'available' && (companyRecord?.status !== 'admin' && !companyRecord?.permissions.includes('access_pos_sessions'))) {
                setAlertState('error');
                setAlert('This table is not available. Still in use!');
                setAlertTimeout(2000)
                return;
            }
            setSelectedProduct(null)
            // Fetch ALL orders for this table and session(removed status filter)
            setAlertState('info');
            setAlert('Loading table orders...');
            setAlertTimeout(100000)
            const orderFilter = { tableId: table.i_d, sessionId: curSession.i_d, wrh: wrh, handlerId: companyRecord.emailid}
            if (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_sessions')){
                delete orderFilter.sessionId
                delete orderFilter.handlerId
            }
            const response = await fetchServer("POST", {
                database: company,
                collection: "Orders",
                prop: {...orderFilter}
            }, "getDocsDetails", server);
            if (!response.err){
                if (response.record?.length > 0) {
                    setCurrentTable(table)
                    // Store all table orders in state
                    var ordersUpdate = response.record
                    if (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_sessions')){
                        setTableOrders(ordersUpdate.filter((order)=>{
                            var orderDate = '01/01/1970'
                            if (order.createdAt){
                                orderDate = order.createdAt
                            }
                            return getSessionEnd(new Date(orderDate).getTime()) === getSessionEnd(curSession.start)
                        }))
                    }else{
                        setTableOrders(response.record);
                    }
                    // Set the most recent pending order as active, or create new one if none pending
                    const pendingOrders = response.record.filter(order => order.status === 'pending');
                    const ordersNumber = pendingOrders.length
                    if (ordersNumber) {
                        setCurrentOrder(pendingOrders[0]);
                    } else {
                        createNewOrder(table);
                    }
                    setActiveScreen('order');
                    setAlertState('info');
                    setAlert('Loaded table orders...');
                    setAlertTimeout(10)
                } else {
                    setCurrentTable(table);
                    createNewOrder(table);
                    setActiveScreen('order');
                    setAlertState('info');
                    setAlert('Loaded table orders...');
                    setAlertTimeout(10)
                }
            }else{
                setAlertState('info')
                setAlert('Slow Network. Could Not Load Table Orders!')
                setAlertTimeout(3000)
            }
        }
    };

    const handleCreateTable = () => {
        setOrderTables((orderTables)=>{
            return [...orderTables, newTableData]
        })
        setShowNewTableModal(false)
    };

    const handleEditTable = (table) => {
        setEditingTable(table);
        setShowNewTableModal(true);
    };


    const getNextTableNumber = () => {
        const tableNumbers = orderTables
            .map(table => parseInt(table.name.replace(/[^0-9]/g, '')))
            .filter(num => !isNaN(num));
        const maxNumber = Math.max(0, ...tableNumbers);
        return `Table ${maxNumber + 1}`;
    };

    const handleAddTableClick = () => {
        setNewTableData({
            name: getNextTableNumber(),
            capacity: 5,
            status: 'available'
        });
        setShowNewTableModal(true);
    };

    // =========================================
    // 5. Order Management
    // =========================================
    const handlePlaceOrder = async () => {
        setAlertState('info')
        setAlert('Placing Order...')
        setAlertTimeout(1000000)
        setPlacingOrder(true)
        // Save the current order to database
        const activeOrder = {
            tableId: currentOrder.tableId,
            sessionId: currentOrder.sessionId,
            handlerId: companyRecord.emailid,
            status: 'pending',
            delivery: 'pending',
            wrh: wrh,
            orderNumber: currentOrder.orderNumber,
            createdAt: new Date().getTime()
        }
        const prevTable = tables.find((table)=>{return table['wrh'] === wrh})
        const resp = await fetchServer("POST", {
            database: company,
            collection: "Tables",
            prop: [{'wrh':wrh}, {activeTables: [...prevTable?.activeTables || [], activeOrder]}]
        }, "updateOneDoc", server)
        if (resp.err){
            setAlertState('error');
            setAlert('Error updating table');
            setAlertTimeout(3000)
            setPlacingOrder(false)
        }
        
        const placedOrder = {
            ...currentOrder, 
            status: 'pending', 
            placedAt: new Date().getTime(),
            delivery: 'pending'
        }
        const response = await fetchServer("POST", {
            database: company,
            collection: "Orders",
            update: {...placedOrder}
        }, "createDoc", server);
    
        if (response.err) {
            setAlertState('error');
            setAlert('Error saving order');
            setAlertTimeout(3000)
            setPlacingOrder(false)
            return;
        }
        else{
            // Update tableOrders state with the new order
            setTableOrders(prev => ([
                ...prev, placedOrder
            ]));
            setCurrentOrder(placedOrder)
            setPlacingOrder(false)
            setAlertState('success');
            setAlert('Order placed successfully');
            setAlertTimeout(2000)
            // View Payment Modal
            // setShowPaymentModal(true);
        }
        
    };
    

    // Update the handleAddItem function to separate selection from adding
    const handleAddItem = (product, quantity = 1) => {
        if (!product) return;

        const existingItem = currentOrder.items.find(item => item.i_d === product.i_d);
        let updatedItems;
    
        if (existingItem){
            updatedItems = currentOrder.items.map(item =>
                item.i_d === product.i_d 
                    ? { ...item, quantity: quantity ? item.quantity + quantity : item.quantity + 1 }
                    : item
            );
        } else {
            updatedItems = [...currentOrder.items, { 
                ...product,
                i_d: product.i_d,
                quantity: quantity || 1,
                orderNumber: currentOrder.orderNumber,
                tableId: currentOrder.tableId,
            }];
        }
    
        setCurrentOrder({
            ...currentOrder,
            items: updatedItems,
            totalSales: calculateTotal(updatedItems)
        });
    };

    const handleRemoveItem = (itemId) => {
        const updatedItems = currentOrder.items.filter(item => item.i_d !== itemId);
        setCurrentOrder({
            ...currentOrder,
            items: updatedItems,
            totalSales: calculateTotal(updatedItems)
        });
    };

    const handleSwitchOrder = (order) => {
        setCurrentOrder(order);
    };

    const calculateTotal = (items) => {
        if (wrh === 'vip'){
            return items.reduce((sum, item) => sum + ((item.vipPrice || item.salesPrice) * item.quantity), 0);
        }
        return items.reduce((sum, item) => sum + (item.salesPrice * item.quantity), 0);
    };

    const handleOrderSelect = (order) => {
        setSelectedProduct(null)
        setCurrentOrder(order);
        setActiveScreen('order');
        setShowOrdersModal(false);
    };

    // =========================================
    // 6. Payment Processing
    // =========================================
    const handlePayment = async () => {
        setAlertState('info');
        setAlert('Processing Payment...');
        setAlertTimeout(1000000)
        setMakingPayment(true)
        var totalPayment = 0
        var totalChange = 0
        var receipts = {}
        Object.keys(paymentDetails).forEach((payPoint)=>{
            totalPayment += Number(paymentDetails[payPoint].amount || 0)
            totalChange += Number(paymentDetails[payPoint].change || 0)
            receipts[payPoint] = paymentDetails[payPoint].receipt
        })
        if (totalPayment < currentOrder.totalSales) {
            setAlertState('error');
            setAlert('Insufficient payment amount');
            setAlertTimeout(3000)
            setMakingPayment(false)
            return;
        }

        const paymentData = {}
        Object.keys(paymentDetails).forEach((payPoint)=>{
            paymentData[payPoint] = Number(paymentDetails[payPoint].amount || 0)
        })
        const paymentDataUpdate = {
            ...paymentData,
            payedAt: new Date().getTime(),
            totalPayment: totalPayment,
            cashChange: Number(paymentDetails['cash'].change),
            receipts,
            status: 'completed'
        };

        const newOrder = {
            ...currentOrder,
            ...paymentDataUpdate
        }
        if (currentOrder.delivery === 'completed'){
            const prevTable = tables.find((table)=>{return table['wrh'] === wrh})
            const resp = await fetchServer("POST", {
                database: company,
                collection: "Tables",
                prop: [{'wrh':wrh}, {activeTables: [
                    ...prevTable.activeTables.filter((table)=>{return (
                        table.tableId !== currentOrder.tableId && 
                        table.sessionId !== currentOrder.sessionId &&
                        table.handlerId !== companyRecord.emailid && 
                        table.orderId !== currentOrder.orderNumber
                    )})
                ]}]
            }, "updateOneDoc", server)
            if (resp.err){
                setAlertState('error');
                setAlert('Error updating table');
                setAlertTimeout(3000)
                return;
            }
        }
        const response = await fetchServer("POST", {
            database: company,
            collection: "Orders",
            prop: [{orderNumber: currentOrder.orderNumber}, {...paymentDataUpdate}]
        }, "updateOneDoc", server);

        if (response.err) {
            setAlertState('error');
            setAlert('Error processing payment');
            setMakingPayment(false)
            return
        } else {
            setMakingPayment(false)
            setAlertState('success');
            setAlert('Payment processed successfully');
            setAlertTimeout(2000)
            setShowPaymentModal(false);
            createNewOrder({ i_d: currentOrder.tableId, name: currentOrder.tableName });
            setPaymentDetails({...payPoints})
            printReceipt(newOrder);
            return
        }
    };

    const printReceipt = (orderData) => {
        const receiptContent = `
            <div class="receipt">
                <h2>${companyRecord.name}</h2>
                <p>Order #${orderData.orderNumber}</p>
                <p>Date: ${new Date().toLocaleString()}</p>
                <hr/>
                ${orderData.items.map(item => `
                    <div class="receipt-item">
                        <span>${item.name} x ${item.quantity}</span>
                        <span>₦${wrh==='vip' ? ((item.vipPrice || item.salesPrice) * item.quantity).toFixed(2) : (item.salesPrice * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                <hr/>
                <div class="receipt-total">
                    <p>Subtotal: ₦${(Number(orderData.totalSales || 0) * 0.925).toFixed(2)}</p>
                    <p>Tax: ₦${(Number(orderData.totalSales || 0) * 0.075).toFixed(2)}</p>
                    <p>Total: ₦${(Number(orderData.totalSales || 0) * 1).toFixed(2)}</p>
                    <p>Paid: ₦${orderData.totalPayment}</p>
                    ${orderData.cashChange ? `<p>{Change: ₦${orderData.cashChange}}</p>`: ''}
                </div>
                <p>Thank you for your business!</p>
            </div>
        `;

        const printWindow = window.open('', '', 'width=300,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <style>
                        .receipt { font-family: monospace; width: 300px; padding: 20px; }
                        .receipt-item { display: flex; justify-content: space-between; }
                        .receipt-total { margin-top: 20px; }
                    </style>
                </head>
                <body>${receiptContent}</body>
            </html>
        `);
        printWindow.print();
        // printWindow.close();
    };

    // =========================================
    // 7. UI Interaction Handlers
    // =========================================
    const handleKeypadClick = (value) => {
        if (value === 'C') {
            setQuantity('');
        } else if (value === '.') {
            if (!quantity.includes('.')) {
                setQuantity(prev => prev + value);
            }
        } else {
            setQuantity(prev => prev + value);
        }
    };

    const handleKeypadEnter = () => {
        if (selectedProduct && quantity) {
            handleAddItem(selectedProduct, parseFloat(quantity));
            setQuantity('');
            setSelectedProduct(null);
        }
    };

    const handleCategoryClick = (category) => {
        setActiveCategory(category.code);
    };

    const handleCategoryFilter = () => {
        if (activeCategory) {
            const filtered = products.filter(product => product.category === activeCategory);
            setFilteredProducts(filtered);
        } else {
            setFilteredProducts(products);
        }
    };

    // Update the click handler in the products grid to only select the product
    const handleProductClick = (product) => {
        setSelectedProduct(product);
        setQuantity(''); // Reset quantity when new product is selected
    };

    // =========================================
    // 8. UI Rendering Functions
    // =========================================
    const handleStartSession = async () => {
        if (companyRecord.status === 'admin' || companyRecord.permissions.includes('access_pos_sessions')){
            if (sessionUser!==null){
                setWrh('')
                setLoading(true);
                await createSession(sessionUser);
                setLoading(false);
            }else{
                setLoading(true);
                await createSession();
                setLoading(false);
            }
        }else{
            setAlertState('error')
            setAlert('You do not have access to this feature. Get your admin to start your session!')
            setAlertTimeout(7000)
            return
        }
    };

    const handleEndSession = async () => {
        if (sessionUser !== null) {            
            if (allSessionOrders.length){
                const allUserOrders = allSessionOrders.filter((order) =>{
                    return ((order.sessionId === (sessionUser.curSession).i_d) && (order.handlerId === (sessionUser.profile).emailid))
                })
                setLoading(true);
                await stopSession(sessionUser.curSession, allUserOrders);
                setLoading(false);
                setPosSalesDifference({})
            }else{
                setAlertState('info')
                setAlert('Could not load orders. Please check your connection and try again.')
                setAlertTimeout(5000)
                setLoading(false)
                return
            }
        }
    };
    const renderSessionEntry = () => {

        const allUserOrders = allSessionOrders.filter((order) =>{
            if (sessionUser!==null && sessionUser?.curSession){
                return ((order.sessionId === (sessionUser.curSession).i_d) && (order.handlerId === (sessionUser.profile).emailid))
            }else{
                return ((order.sessionId === curSession.i_d) && (order.handlerId === companyRecord.emailid))
            }
        })        

        const {
            allSales, totalPendingSales,
            totalCancelledSales, totalCashChange
        } = getSessionSales(allUserOrders)

        var posSalesAccess = []
        if (sessionUser!==null){
            const userSalesWrhAccess = { 
                ['open bar1']: ((sessionUser.profile).permissions.includes('pos_open bar1') || (sessionUser.profile).permissions.includes('all')),
                ['open bar2']: ((sessionUser.profile).permissions.includes('pos_open bar2') || (sessionUser.profile).permissions.includes('all')),
                ['vip']: ((sessionUser.profile).permissions.includes('pos_vip') || (sessionUser.profile).permissions.includes('all')),
                ['kitchen']: ((sessionUser.profile).permissions.includes('pos_kitchen') || (sessionUser.profile).permissions.includes('all')),
            }
            Object.keys(userSalesWrhAccess).forEach((wrh)=>{
                if (userSalesWrhAccess[wrh]){
                    posSalesAccess.push(wrh)
                }
            })
        }

        const handleCountedSalesEntry = (e)=>{
            const {name, value} = e.target

            setCountedSales((countedSales)=>{
                return {...countedSales, [name]: value}
            })
            setPosSalesDifference((posSalesDifference)=>{
                return {...posSalesDifference, [name] : (Number(value) - Number(allSales[name] || 0))}
            })
        }

        return (
            <>
                {loadSession && (
                    <div className='openingsession' style={{color: 'white', fontSize:'1.2rem', fontWeight:'600'}}>
                        Loading Session...
                    </div>
                )}
                {startSession && (
                    <div className='openingsession'>
                        <div className="session-entry">
                            <div className="modal-header">
                                <h2>Start Session {
                                    [''].map((args)=>{
                                        const userProfile = employees.find((employee)=>{return (employee.i_d === ((sessionUser === null) ? curSession?.employee_id : sessionUser.profile.emailid))})
                                        return (userProfile ? <span>{`(${userProfile.firstName})`}</span> : <span>{(curSession === null) ? '' : `(Admin)`}</span>)
                                    })
                                }</h2>
                                {(companyRecord.status === 'admin' || companyRecord.permissions?.includes('access_pos_sessions')) && 
                                    <button 
                                        onClick={() => {
                                            setStartSession(false)
                                            setSessionUser(null)
                                        }}
                                    >×</button>
                                }
                            </div>
                            <div className="form-group">
                                <label>Opening Cash</label>
                                <input 
                                    type="number" 
                                    value={openingCash} 
                                    onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)} 
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label>Sales Post</label>
                                <select 
                                    value={wrh} 
                                    onChange={(e) => {
                                        setWrh(e.target.value)
                                        window.localStorage.setItem('pos-wrh',e.target.value)
                                    }}
                                    disabled={loading}
                                >
                                    <option value={''}>Select Sales Post</option>
                                    {sessionUser ===  null ? wrhs.map((warehouse, index) => (
                                            posWrhAccess[warehouse.name] && <option key={index} value={warehouse.name}>
                                                {warehouse.name}
                                            </option>                                        
                                    )):
                                    posSalesAccess.map((warehouse, index) => (
                                        <option key={index} value={warehouse}>
                                            {warehouse}
                                        </option>                                        
                                    ))
                                    }
                                </select>
                            </div>
                            <div className="session-actions">
                                <button 
                                    className="session-btn start" 
                                    onClick={handleStartSession}
                                    disabled={loading}
                                >
                                    {loading ? 'Starting...' : 'Start Session'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {endSession && (
                    <div className='closingsession'>
                        <div className="session-entry">
                            <div className="modal-header">
                                <h2>End Session {
                                    [''].map((args)=>{
                                        const userProfile = employees.find((employee)=>{return (employee.i_d === ((sessionUser === null) ? curSession.employee_id : sessionUser.profile.emailid))})
                                        return (userProfile ? <span>{`(${userProfile.firstName})`}</span> : <span>(Admin)</span>)
                                    })
                                }</h2>
                                <button 
                                    onClick={() => {
                                        setEndSession(false)
                                        setSessionUser(null)
                                        setCountedSales({})
                                        setPosSalesDifference({})
                                    }}
                                >×</button>
                            </div>
                            <div className="form-group">
                                <label>Total Bank Sales</label>
                                {Object.keys(allSales).map((payPoint) => {
                                    if (payPoint !== 'cash'){
                                        return (
                                            <div key={payPoint}>
                                                <label>{payPoint.toUpperCase()}</label>
                                                <div className='session-entry-inputs'>
                                                    <input 
                                                        style={{cursor:'not-allowed'}}
                                                        type="number" 
                                                        value={allSales[payPoint] || 0} 
                                                        disabled={true}
                                                        readOnly
                                                    />
                                                    <span>{'->'}</span>
                                                    <input 
                                                        type="number" 
                                                        name={payPoint}
                                                        value={countedSales[payPoint]} 
                                                        placeholder={'Counted Amount'}
                                                        onChange={(e) => handleCountedSalesEntry(e)} 
                                                        disabled={loading}
                                                    />
                                                </div>
                                                <input 
                                                    style={{cursor:'not-allowed'}}
                                                    type="number" 
                                                    value={posSalesDifference[payPoint] || 0} 
                                                    disabled={true}                                                    
                                                    readOnly
                                                />
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                            <div className="form-group">
                                <label>Total Cash Sales</label>
                                <div>
                                    <input 
                                        style={{cursor:'not-allowed'}}
                                        type="number" 
                                        value={allSales['cash'] || 0} 
                                        disabled={true}
                                        readOnly
                                    />
                                    <span>{'->'}</span>
                                    <input 
                                        type="number" 
                                        value={countedSales['cash']} 
                                        name='cash'
                                        placeholder={'Counted Amount'}
                                        onChange={(e) => handleCountedSalesEntry(e)} 
                                        disabled={loading}
                                    />
                                </div>
                                <input 
                                    style={{cursor:'not-allowed'}}
                                    type="number" 
                                    value={posSalesDifference['cash'] || 0} 
                                    disabled={true}
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Opening Cash</label>
                                <input 
                                    style={{cursor:'not-allowed'}}
                                    type="number" 
                                    value={(sessionUser === null) ? curSession.openingCash : sessionUser.curSession.openingCash} 
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Total Cash Change</label>
                                <input 
                                    style={{cursor:'not-allowed'}}
                                    type="number" 
                                    value={totalCashChange} 
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Total Pending Sales</label>
                                <input 
                                    style={{cursor:'not-allowed'}}
                                    type="number" 
                                    value={totalPendingSales} 
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Total Cancelled Sales</label>
                                <input 
                                    style={{cursor:'not-allowed'}}
                                    type="number" 
                                    value={totalCancelledSales} 
                                    readOnly
                                />
                            </div>
                            <div className="session-actions">
                                <button 
                                    className="session-btn end" 
                                    onClick={()=>{
                                        handleEndSession()
                                    }}
                                    disabled={loading}
                                >
                                    {loading ? 'Ending...' : 'End Session'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };
    const renderKeypad = () => (
        <div className="keypad-section">
            <div className="quantity-display">{quantity || '0'}</div>
            <div className="keypad-grid">
                {['7','8','9','4','5','6','1','2','3','C','0','.'].map(key => (
                    <button 
                        key={key} 
                        className="keypad-btn"
                        onClick={() => handleKeypadClick(key)}
                    >
                        {key}
                    </button>
                ))}
                <button 
                    className="keypad-btn enter"
                    onClick={() => handleKeypadEnter()}
                    disabled={!selectedProduct || !quantity}
                >
                    Enter
                </button>
            </div>
        </div>
    );

    const renderOrderScreen = () => (
        <div className="order-screen">
            <div className="order-entry">
                <div className="selected-items">
                    {currentOrder.items.map(item => (
                        <div key={item.id} className="selected-item">
                            <span>{item.name}</span>
                            <span>{item.quantity}</span>
                            <span>₦{wrh === 'vip' ? ((item.vipPrice || item.salesPrice) * item.quantity) : (item.salesPrice * item.quantity)}</span>
                            {currentOrder.status==='new' && <button 
                                className="remove-btn"
                                onClick={() => handleRemoveItem(item.i_d)}
                            >
                                ×
                            </button>}
                        </div>
                    ))}
                </div>
                {selectedProduct && renderKeypad()}
                {(currentOrder.status!=='cancelled' && currentOrder.status === 'new') && <button 
                    className="place-order-btn"
                    onClick={() => handlePlaceOrder()}
                    disabled={!currentOrder.items.length || placingOrder || sessionEnded}
                >
                    Place Order (₦{currentOrder.totalSales?.toFixed(2)})
                </button>}
                {(currentOrder.status!=='cancelled' && currentOrder.status === 'pending') && <button 
                    className="place-order-btn"
                    onClick={() => setShowPaymentModal(true)}
                    disabled={!currentOrder.totalSales || makingPayment || currentTable.status === 'unavailable'}
                >
                    Make Payment (₦{currentOrder.totalSales?.toFixed(2)})
                </button>}
            </div>
            <div className="products-panel">
                <div className="categories-bar">
                    <button 
                        className={`category-btn ${!activeCategory ? 'active' : ''}`}
                        onClick={() => setActiveCategory(null)}
                    >
                        All
                    </button>
                    {categories.map(category => (
                        <button 
                            key={category.code}
                            className={`category-btn ${activeCategory === category.code ? 'active' : ''}`}
                            onClick={() => setActiveCategory(category.code)}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
                <div className="products-grid">
                    {filteredProducts.map(product => (
                        <div 
                            key={product.i_d}
                            className={`product-card ${selectedProduct?.i_d === product.i_d ? 'active' : ''}`}
                            onClick={() => handleProductClick(product)} // Changed from handleAddItem to handleProductClick
                        >
                            <div className="product-icon">
                                <MdShoppingBasket />
                            </div>
                            <div className="product-name">{product.name}</div>
                            <div className="product-price">₦{wrh === 'vip' ? (product.vipPrice || product.salesPrice) : product.salesPrice}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderScreen = () => {
        switch (activeScreen) {
            case 'home':
                return (
                    <>
                        <div className='pos-wh-cover' onClick={(e)=>{
                            const name = e.target.getAttribute('name')
                            if (name){
                                setWrh(name)
                                window.localStorage.setItem('pos-wrh',name)
                            }
                        }}>
                            {
                                wrhs.map((wh, id)=>{
                                    if (!wh.purchase){
                                        return (posWrhAccess[wh.name] && <div key={id} className={'slprwh ' + (wrh === wh.name ? 'slprwh-clicked' : '')} name={wh.name}>{wh.name}</div>)
                                    }
                                })                        
                            }
                            {
                                <div className={'live-nav'}>
                                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_sessions')) && <button 
                                        className="action-btn"
                                        onClick={() => setViewSessions(true)}
                                    >
                                        All Sessions
                                    </button>}
                                    <span className={isLive ? (sessionEnded ? "session-ended" : "live-state") : "error-state"}>{isLive ? (sessionEnded ? 'Session Ended' : 'Live Session') : liveErrorMessages}</span>
                                </div>
                            }
                        </div>
                        <div className="pos-tables-layout">
                            <div 
                                className="add-table-box"
                                onClick={handleAddTableClick}
                            >
                                <div className="plus-icon">+</div>
                                <div className="add-text">Add Table</div>
                            </div>
                            {[...orderTables]
                                .sort((a, b) => {
                                    const numA = parseInt(a.name.replace(/[^0-9]/g, ''));
                                    const numB = parseInt(b.name.replace(/[^0-9]/g, ''));
                                    return numA - numB;
                                })
                                .map(table => (
                                    <div 
                                        key={table.i_d}
                                        className={`pos-table ${table.status}`}
                                        onClick={() => handleTableSelect(table)}
                                    >
                                        {table.name}
                                        {table.activeOrders > 0 && (
                                            <div className={table.status === 'available' ? "order-count" : "order-count table-unavailable"}>
                                                {table.activeOrders}
                                            </div>
                                        )}
                                        {table.activeOrders > 0 && (
                                            <div className="table-user">
                                                {`${table.tableUser.firstName} ${table.tableUser.lastName}`}
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </>
                );

            case 'order':
                return renderOrderScreen();

            default:
                return null;
        }
    };

    // =========================================
    // 9. Modal Components
    // =========================================
    const TableModal = () => (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Create New Table</h3>
                </div>

                <div className="form-group">
                    <label>Table Name</label>
                    <input 
                        type="text"
                        value={newTableData.name}
                        onChange={(e) => setNewTableData({...newTableData, name: e.target.value})}
                    />
                </div>
                <div className="form-group">
                    <label>Capacity</label>
                    <input 
                        type="number"
                        value={newTableData.capacity}
                        onChange={(e) => setNewTableData({...newTableData, capacity: e.target.value})}
                    />
                </div>
                <div className="modal-actions">
                    <button className="modal-btn cancel" onClick={() => setShowNewTableModal(false)}>
                        Cancel
                    </button>
                    <button className="modal-btn save" onClick={handleCreateTable}>
                        Create Table
                    </button>
                </div>
            </div>
        </div>
    );

    // =========================================
    // 10. Utility Functions
    // =========================================
    const generateOrderNumber = () => {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `ORD-${year}${month}${day}-${random}`;
    };

    // =========================================
    // 11. Main Render
    // =========================================
    return (
        <div className="pos-container" ref={posContainerRef}>
            {(loadSession || startSession || endSession) && renderSessionEntry()}
            {viewSesions ? 
            <POSDashboard
                setViewSessions={setViewSessions}
                setStartSession={setStartSession}
                setEndSession={setEndSession}
                curSession={curSession}
                sessions={sessions}
                allSessions={allSessions}
                setAllSessions={setAllSessions}
                setAllSessionOrders={setAllSessionOrders}
                allOrders={allOrders}
                setSessionUser={setSessionUser}
                companyRecord = {companyRecord}
                employees={employees}
                profiles={profiles}
                isLive={isLive}
                liveErrorMessages={liveErrorMessages}
                sessionEnded={sessionEnded}
                getSessionEnd = {getSessionEnd}
                setWrh={setWrh}
                posWrhAccess={posWrhAccess}
                allSessionOrders={allSessionOrders}
                getSessionSales={getSessionSales}
                setAlertState={setAlertState}
                setAlert={setAlert}
                setAlertTimeout={setAlertTimeout}
            />:
            <div>                
                {activeScreen === 'order' && (
                    <div className="pos-mini-header">
                        <div className="header-info">
                            <span className="table-name">{currentOrder.tableName}</span>
                            {currentOrder.orderNumber && (
                                <span className="order-number">#{currentOrder.orderNumber}</span>
                            )}
                            {
                                <span className={isLive ? (sessionEnded ? "session-ended" : "live-state") : "error-state"}>{isLive ? (sessionEnded ? 'Session Ended' : 'Live Session') : liveErrorMessages}</span>
                            }
                        </div>
                        <div className="header-actions">
                            <button 
                                className="action-btn"
                                disabled={placingOrder || makingPayment || currentTable.status === 'unavailable'}
                                onClick={() => createNewOrder({ _id: currentOrder.tableId, name: currentOrder.tableName })}
                            >
                                New Order
                            </button>
                            <button 
                                className="action-btn"
                                disabled={placingOrder || makingPayment}
                                onClick={() => setShowOrdersModal(true)}
                            >
                                All Orders
                            </button>
                            <button 
                                className="action-btn"
                                disabled={placingOrder || makingPayment}
                                onClick={() => {
                                    setTableOrders([])
                                    setActiveScreen('home')
                                    setCurrentTable(null)
                                    setCurrentOrder(null)
                                    setPlacingOrder(false)
                                    setMakingPayment(false)
                                }}
                            >
                                Back to Tables
                            </button>
                        </div>
                    </div>
                )}
                <div className="pos-content">
                    {renderScreen()}
                </div>
                {showNewTableModal && <TableModal />}
                {showOrdersModal && 
                <OrdersModal 
                    tableOrders={tableOrders}
                    handleOrderSelect={handleOrderSelect}
                    setShowOrdersModal={setShowOrdersModal}
                    tables={tables}
                    wrh={wrh}
                    currentOrder={currentOrder}
                    setCurrentOrder={setCurrentOrder}
                    createNewOrder={createNewOrder}
                />}
                {showPaymentModal && 
                <PaymentModal 
                    amount={amount}
                    setAmount={setAmount}
                    currentOrder={currentOrder}
                    method={method}
                    setMethod={setMethod}
                    paymentDetails={paymentDetails}
                    setPaymentDetails={setPaymentDetails}
                    setShowPaymentModal={setShowPaymentModal}
                    handlePayment={handlePayment}
                    payPoints={payPoints}
                    setAlert={setAlert}
                    setAlertState={setAlertState}
                    setAlertTimeout={setAlertTimeout}
                />}
            </div>
            }
        </div>
    );
};

export default PointOfSales;

const PaymentModal = ({
    amount, setAmount, 
    currentOrder, 
    method, setMethod,
    paymentDetails, setPaymentDetails,
    setShowPaymentModal, handlePayment, allPaymentReceipts,
    payPoints, setAlertState, setAlert, setAlertTimeout
}) => {
    const [paymentSum, setPaymentSum] = useState(0)
    const [cashAmount, setCashAmount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [receipts, setReceipts] = useState({})
    useEffect(()=>{
        var paymentAmount = 0
        Object.keys(paymentDetails).forEach((payPoint)=>{
            paymentAmount += Number(paymentDetails[payPoint].amount || 0)
        })
        setPaymentSum(paymentAmount)
    },[paymentDetails])
    const confirmReceiptsAvailable = (receipts)=>{
        var available = true
        const receiptNumbers = Object.values(receipts)

        return available

    }
    const validatePayment = async ()=>{
        var payPointsWithNoReceipts = []        
        if (!paymentDetails['cash'].amount || (Number(paymentDetails['cash'].amount || 0) < Number(currentOrder.totalSales || 0))){
            Object.keys(paymentDetails).forEach((payPoint)=>{
                if (payPoint !== 'cash'){
                    if (paymentDetails[payPoint].amount && !paymentDetails[payPoint]['receipt']){
                        payPointsWithNoReceipts.push(payPoint.toUpperCase())
                    }
                }
            })
        }
        if (!payPointsWithNoReceipts.length){
            const isReceiptsAvailable = confirmReceiptsAvailable(receipts)
            if (isReceiptsAvailable){
                if (Number(currentOrder.totalSales)>paymentSum){
                    const remainingDifference = Number(currentOrder.totalSales) - paymentSum
                    setAlertState('info')
                    setAlert(`Insufficient payment amount. Remaining ${Number(remainingDifference).toLocaleString()}!`)
                    setAlertTimeout(5000)
                }else{
                    setLoading(true)
                    await handlePayment()
                    setLoading (false)
                }
            }
        }else{
            var errmess = ''
            payPointsWithNoReceipts.forEach((payPoint, index)=>{
                if (!index){
                    errmess += String(payPoint)
                }else{
                    if (index === payPointsWithNoReceipts.length -1){
                        errmess += ' and '+String(payPoint)
                    }else{
                        errmess += ', '+String(payPoint)
                    }
                }
            })
            setAlertState('info')
            setAlert(`Please Enter Receipt Number for the following Pay Points: ${errmess} !`)
            setAlertTimeout(5000)
        }
    }
    const handleAmountChange = (e) => {
        const name = e.target.getAttribute('name')
        const value = e.target.value;
        setAmount(value);
        if (method === 'cash'){
            const amountNum = parseFloat(value) || 0;
            if (cashAmount===0){
                const changeAmount = amountNum - currentOrder.totalSales;
                setPaymentDetails((paymentDetails)=>{
                    return {
                        ...paymentDetails, [method]: {...paymentDetails[method], amount: value, change: changeAmount}
                    }
                })
            }else{
                const changeAmount = amountNum - cashAmount;
                setPaymentDetails((paymentDetails)=>{
                    return {
                        ...paymentDetails, [method]: {...paymentDetails[method], amount: value, change: changeAmount}
                    }
                })
            }
        }else{
            setPaymentDetails((paymentDetails)=>{
                return {
                    ...paymentDetails, [method]: {...paymentDetails[method], [name]: value}
                }
            })
            if (name==='receipt'){
                setReceipts((receipts)=>{
                    return {...receipts, [method]: value}
                })
            }
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content payment-modal">
                <div className="modal-header">
                    <h3>Payment</h3>
                    <button disabled={loading} onClick={() => setShowPaymentModal(false)}>×</button>
                </div>
                <div className="payment-methods">
                    {Object.keys(payPoints).map(payMethod => (
                        <button
                            key={payMethod}
                            className={`payment-method-btn ${method === payMethod ? 'active' : ''}`}
                            disabled={paymentDetails['cash'].amount}
                            onClick={() => {
                                setMethod(payMethod)
                                if (payMethod === 'cash'){
                                    setCashAmount(currentOrder.totalSales - paymentSum)
                                }else{
                                    setCashAmount(0)
                                }
                            }}
                        >
                            {payMethod.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="form-group">
                    <label>Total Amount Remaining: ₦{(currentOrder.totalSales - paymentSum).toFixed(2)}</label>
                </div>
                <div className="form-group">
                    <label>Payment Amount:</label>
                    <input
                        type="number"
                        name='amount'
                        value={paymentDetails[method].amount}
                        onChange={(e) => handleAmountChange(e)}
                        placeholder="Enter amount"
                    />
                </div>
                {method === 'cash' && amount && (
                    <div className="form-group">
                        <label>Change: ₦{Number(paymentDetails[method].change).toFixed(2)}</label>
                    </div>
                )}
                {method !== 'cash' && amount && (
                    <div className="form-group">
                        <label>Receipt No:</label>
                        <input
                            type="text"
                            name='receipt'
                            value={paymentDetails[method].receipt}
                            onChange={(e) => handleAmountChange(e)}
                            placeholder="Enter Receipt No"
                        />
                    </div>
                )}
                
                <div className="modal-actions">
                    <button 
                        className="modal-btn cancel"
                        diabled={loading}
                        onClick={() => {
                            setPaymentDetails({...payPoints})
                            setShowPaymentModal(false)
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        disabled={loading}
                        className="modal-btn save"
                        onClick={validatePayment}
                    >
                        Complete Payment
                    </button>
                </div>
            </div>
        </div>
    );
};
const OrdersModal = ({ tableOrders, wrh, handleOrderSelect, setShowOrdersModal, 
    tables, currentOrder, setCurrentOrder, createNewOrder 
}) => {
    const { companyRecord, fetchServer, setAlert, setAlertState, setAlertTimeout, server, company } = useContext(ContextProvider);
    const [cancelling, setCancelling] = useState(false)
    const handleCancelOrder = async (order) => {
        if (order.delivery !== 'completed'){
            const cancelOrder = window.confirm(`Are you sure you want to Cancel Order #${order.orderNumber}?`);
            if (!cancelOrder) return;
            setCancelling(true)
            setAlertState('info')
            setAlert('Cancelling Order...')
            setAlertTimeout(1000000)
            const prevTable = tables.find((table)=>{return table['wrh'] === wrh})
            const resp = await fetchServer("POST", {
                database: company,
                collection: "Tables",
                prop: [{'wrh':wrh}, {activeTables: [
                    ...prevTable.activeTables.filter((tableOrder)=>{return (
                        tableOrder.tableId !== order.tableId && 
                        tableOrder.sessionId !== order.sessionId &&
                        tableOrder.orderId !== order.orderNumber
                    )})
                ]}]
            }, "updateOneDoc", server)
            if (resp.err){
                setAlertState('error');
                setAlert('Error updating table');
                setAlertTimeout(3000)
                setCancelling(false)
                return;
            }
            const response = await fetchServer("POST", {
                database: company,
                collection: "Orders",
                prop: [{orderNumber: order.orderNumber}, 
                    {
                        status: 'cancelled', 
                        cancelledBy: companyRecord.emailid,
                        cancelledAt: new Date().getTime()
                    }
                ]
            }, "updateOneDoc", server);
    
            if (response.err) {
                setAlertState('error');
                setAlert('Error cancelling order');
                setAlertTimeout(3000);
                setCancelling(false)
                return
            } else {
                setAlertState('success');
                setAlert('Order cancelled successfully');
                setAlertTimeout(2000);
                if (currentOrder.orderNumber === order.orderNumber){
                    createNewOrder({ i_d: currentOrder.tableId, name: currentOrder.tableName });
                }
                setCancelling(false)
                setShowOrdersModal(false); // Close modal after deletion
                return
            }
        }else{
            setAlertState('error');
            setAlert('Please Cancel Delivery First Before Cancelling Order!');
            setAlertTimeout(3000)
            setCancelling(false)
            return
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content orders-modal">
                <div className="modal-header">
                    <h3>All Orders</h3>
                    <button disabled={cancelling} onClick={() => setShowOrdersModal(false)}>×</button>
                </div>
                <div className="orders-list">
                    {tableOrders?.map(order => (
                        <div 
                            key={order.i_d}
                            className={`order-card ${order.status}`}
                        >
                            <div onClick={() => handleOrderSelect(order)}>
                                <div>Order #{order.orderNumber}</div>
                                <div>Table: {order.tableId}</div>
                                <div>Total: ₦{order.totalSales}</div>
                                <div>Status: {order.status}</div>
                                <div>Delivery: {(order.delivery || 'pending')}</div>
                                <div>{new Date(order.createdAt).toLocaleString()}</div>
                            </div>
                            {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_sessions')) &&
                            !['cancelled','completed'].includes(order.status) && (
                                <button 
                                    disabled={cancelling}
                                    className="cancel-order-btn"
                                    onClick={() => handleCancelOrder(order)}
                                    title="Cancel Order"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const POSDashboard = ({sessions, profiles, employees, companyRecord, 
    isLive, liveErrorMessages, sessionEnded, setEndSession, setStartSession,
    setViewSessions, allSessions, setAllSessions, setAllSessionOrders, setSessionUser, getSessionEnd, 
    setWrh, posWrhAccess, allSessionOrders, getSessionSales, curSession,
    setAlertState, setAlert, setAlertTimeout
})=>{
     const {fetchServer, server, company} = useContext(ContextProvider)
     const [pendingSessions, setPendingSessions] = useState([])
    useEffect(()=>{
        var pendingSessions = allSessions.filter((session)=>{
            return (session.employee_id !== 'theplantainplanet22@gmail.com' && 
                session.active && (new Date().getTime() === getSessionEnd(session.start))
            )
        })
        // console.log(curSession)
        setPendingSessions(pendingSessions)        
    },[allSessions])

    useEffect(()=>{
        const getSessionsData = async ()=>{
            const ordersResponse = await fetchServer("POST", {
                database: company,
                collection: "Orders",
            }, "getDocsDetails", server); 
            const sessionsResponse = await fetchServer("POST", {
                database: company,
                collection: "POSSessions",
                prop: {type: 'sales'}
            }, "getDocsDetails", server); 
            if(!ordersResponse.err){
                setAllSessionOrders(ordersResponse.record)
            }
            if(!sessionsResponse.err){
                setAllSessions(sessionsResponse.record)
            }
        }
        getSessionsData()
    },[])

    const showPendingSessionAlert = ()=>{
        setAlertState('error')
        setAlert('Please End All Other Sessions Before Starting A New One!')
        setAlertTimeout(3000)
    }
    return (
        <>
            <div className='pos-sessions'>
                <div className='pos-sessions-nav'>
                    <div className={'live-nav'}>
                        {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_sessions')) && <button 
                            className="action-btn"
                            onClick={() => {    
                                var wrhAccess = Object.keys(posWrhAccess).filter((wrh)=>{
                                    return posWrhAccess[wrh]
                                })
                                setWrh(wrhAccess[0])
                                setViewSessions(false)                                
                            }}
                        >
                            POS Tables
                        </button>}
                        <span className={isLive ? (sessionEnded ? "session-ended" : "live-state") : "error-state"}>{isLive ? (sessionEnded ? 'Session Ended' : 'Live Session') : liveErrorMessages}</span>
                    </div>
                </div>
                <div className='pos-sessions-view'>
                    <div className='pos-sessions-list'>                        
                        {profiles.map((profile)=>{
                            if (profile.status !== 'admin' || companyRecord.status === 'admin'){
                                var hasPosSalesAccess = false
                                const userSalesWrhAccess = { 
                                    ['open bar1']: (profile.permissions.includes('pos_open bar1') || profile.permissions.includes('all')),
                                    ['open bar2']: (profile.permissions.includes('pos_open bar2') || profile.permissions.includes('all')),
                                    ['vip']: (profile.permissions.includes('pos_vip') || profile.permissions.includes('all')),
                                    ['kitchen']: (profile.permissions.includes('pos_kitchen') || profile.permissions.includes('all')),
                                }
                                Object.keys(userSalesWrhAccess).forEach((wrh)=>{
                                    if (userSalesWrhAccess[wrh]){
                                        hasPosSalesAccess = true
                                        return
                                    }
                                })
                                if((profile.permissions.includes('pos') && hasPosSalesAccess) || profile.permissions.includes('all')){                                
                                    const {firstName, lastName} = ((profile.status === 'admin')? {
                                        firstName: 'Admin', lastName: ''
                                    } : employees.find(employee => {return employee.i_d === profile.emailid}))
                                    
                                    const employeeSessions = allSessions.filter(session => {
                                        return (
                                            session.employee_id === profile.emailid                                        
                                        )
                                    })
                                    var employeeSession = null
                                    var sessionLive = false
                                    if (employeeSessions.length > 0){
                                        employeeSession = employeeSessions.find((session)=>{return !session.end})
                                        if ([null, undefined].includes(employeeSession)){
                                            employeeSession = employeeSessions[employeeSessions.length-1]
                                        }
                                        if ((new Date().getTime()) >= getSessionEnd(employeeSession.start) || employeeSession.end){
                                            sessionLive = false
                                        }else{
                                            sessionLive = true
                                        }
                                    }
                                    return (
                                        <div className='pos-sessions-card' key={profile.emailid}>
                                            <span className='pos-sessions-card-name'>{`${firstName} ${lastName}`}</span>
                                            <span className='pos-sessions-card-time'>{([null, undefined].includes(employeeSession)) ? 'No Sessions' : (sessionLive ? `Started: ${new Date(employeeSession.start).toLocaleString()}` : (employeeSession.end ? `Ended: ${new Date(employeeSession.end).toLocaleString()}` : `Started: ${new Date(employeeSession.start).toLocaleString()}`))}</span>
                                            <div>
                                                <h4 className='pos-sessions-card-status'>{([null, undefined].includes(employeeSession)) ? 'No Sessions' : (sessionLive ? 'Session Live' : 'Session Ended')}</h4>
                                                <div 
                                                    className='pos-sessions-card-action'
                                                    onClick={()=>{   
                                                        if (profile.status !== 'admin' || companyRecord.status === 'admin'){
                                                            var viewModal = true
                                                            const validateUserSession = async ()=>{
                                                                if (!allSessionOrders.length){
                                                                    viewModal = false
                                                                    setAlertState('info')
                                                                    setAlert('Could not Calculate Orders. Please try again in a few moment, while we fetch them for you!')
                                                                    setAlertTimeout(3000)     
                                                                    const ordersResponse = await fetchServer("POST", {
                                                                        database: company,
                                                                        collection: "Orders",
                                                                    }, "getDocsDetails", server); 
                                                                    if (ordersResponse.err){
                                                                        setAlertState('error')
                                                                        setAlert('Could not load Orders. Please check your network connection!')
                                                                        setAlertTimeout(3000)
                                                                        return           
                                                                    }else{
                                                                        if (![null, undefined].includes(ordersResponse.record)){
                                                                            setAllSessionOrders(ordersResponse.record)
                                                                            setAlertState('info')
                                                                            setAlert('Orders Calculated. Please proceed with the ending of user session!')
                                                                            setAlertTimeout(3000)
                                                                        }                                                          
                                                                    }                                              
                                                                }else{
                                                                    const allUserOrders = allSessionOrders.filter((order) =>{
                                                                        return ((order.sessionId === employeeSession.i_d) && (order.handlerId === profile.emailid))                                                        
                                                                    })
                                                                    const {
                                                                        totalUnattendedSales
                                                                    } = getSessionSales(allUserOrders)  
                                                                    if (totalUnattendedSales){
                                                                        viewModal = false
                                                                        setAlertState('error')
                                                                        setAlert('This User Have Incomplete Sale(s) Pending, they were neither delivered nor paid. Please resolve before proceeding!')
                                                                        setAlertTimeout(3000)
                                                                    }                                               
                                                                }
                                                            }
                                                            if (sessionLive){
                                                                validateUserSession()
                                                            }else{
                                                                if(![null, undefined].includes(employeeSession)){
                                                                    if (!employeeSession.end){
                                                                        validateUserSession()
                                                                    }
                                                                }
                                                            }
                                                            if (viewModal){
                                                                if (sessionLive){
                                                                    setSessionUser({
                                                                        profile: profile,
                                                                        curSession: employeeSession
                                                                    })
                                                                    setEndSession(true)
                                                                }else{
                                                                    setSessionUser({
                                                                        profile: profile,
                                                                    })
                                                                    if ([null, undefined].includes(employeeSession)){
                                                                        if (pendingSessions.length){
                                                                            showPendingSessionAlert()
                                                                        }else{
                                                                            setWrh('')
                                                                            setStartSession(true)
                                                                        }
                                                                    }else{
                                                                        if (employeeSession.end){
                                                                            if (pendingSessions.length){
                                                                                showPendingSessionAlert()
                                                                            }else{
                                                                                setWrh('')
                                                                                setStartSession(true)
                                                                            }
                                                                        }else{
                                                                            setSessionUser({
                                                                                profile: profile,
                                                                                curSession: employeeSession
                                                                            })
                                                                            setEndSession(true)
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }else{
                                                            setAlertState('error')
                                                            setAlert('Only the Super Admin can interact with this Session!')
                                                            setAlertTimeout(3000)
                                                        }
                                                    }}
                                                >{sessionLive? 'End Session' : ([null, undefined].includes(employeeSession) ? 'Start Session' : (employeeSession.end ? 'Start Session' : 'End Session'))}</div>
                                            </div>
                                        </div>
                                    )
                                }
                            }
                        })}
                    </div>
                </div>
            </div>
        </>
    )
}