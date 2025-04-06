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
        settings, getDate, posWrhAccess, employees
    } = useContext(ContextProvider);

    // Core States
    const [isLive, setIsLive] = useState(true)
    const [liveErrorMessages, setLiveErrorMessages] = useState('')
    const [loading, setLoading] = useState(false);
    const [activeScreen, setActiveScreen] = useState('home');
    const [tables, setTables] = useState([]);
    const [orderTables, setOrderTables] = useState([]);
    const [currentTable, setCurrentTable] = useState(null)
    const [sessions, setSessions] = useState(null);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [openingCash, setOpeningCash] = useState(0);
    const [bankBalance, setBankBalance] = useState(0);
    const [cashBalance, setCashBalance] = useState(0);
    const [startSession, setStartSession] = useState(false);
    const [endSession, setEndSession] = useState(false);
    const [sessionEnded, setSessionEnded] = useState(false);
    const [curSession, setCurrSession] = useState(null);
    const [sessionUser, setSessionUser] = useState(null);
    const [loadSession, setLoadSession] = useState(true);
    const orderControllerRef = useRef(null)
    const tableControllerRef = useRef(null)
    const productControllerRef = useRef(null)
    const sessionControllerRef = useRef(null)
    useEffect(()=>{
        storePath('pos')  
    },[storePath])

    // Order States
    const [currentOrder, setCurrentOrder] = useState(null);
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
    const [showSessions, setShowSessions] = useState(false);
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

    useEffect(()=> {
         loadInitialData()
    },[settings, currentOrder])
    useEffect(()=>{
        // console.log(posWrhAccess)
    },[posWrhAccess])
    useEffect(()=>{
        if (tables.length && wrh && curSession && employees.length){
            setOrderTables((orderTables)=>{
                const activeOrders = []
                wrhs.forEach((warehouse)=>{
                    const prevTable = tables.find((table)=>{return table['wrh'] === warehouse.name})
                    prevTable?.activeTables?.forEach((activeOrder)=>{
                        activeOrders.push(activeOrder)
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
    const getOrderSales = (orders) =>{
        let bankSales = 0
        let cashSales = 0
        orders.forEach((order)=>{
            if (order['cash']){
                cashSales += (Number(order['cash']) || 0)
                if (order.totalSales > Number(order['cash'] || 0)){
                    bankSales += Number(order.totalSales) - Number(order['cash'] || 0)
                }                
            } else {
                bankSales += order.totalSales
            }
        })
        return {bankSales, cashSales}
    }
    const createSession = async ()=>{
        if (wrh){
            const newSession = {
                employee_id: companyRecord.emailid,
                i_d: new Date().getTime(),
                start: new Date().getTime(),
                end: null,
                active: true,            
                totalBankSales: 0,
                totalCashSales: 0,
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
            } else {
                setAlertState('success');
                setAlert('Welcome Back!');
                setAlertTimeout(2000)
                setStartSession(false)
                setCurrSession(newSession)
                if (sessions!==null){
                    setSessions([...sessions, newSession]);
                }else{
                    setSessions([newSession])
                }
            }
        }else{
            setAlert('info')
            setAlert('Please Select Your Sales Post')
            setAlertTimeout(5000)
        }
    }

    const stopSession = async (session, sessionOrders)=>{
        // const prevTable = tables.find((table)=>{return table['wrh'] === wrh})
        // const resp = await fetchServer("POST", {
        //     database: company,
        //     collection: "Tables",
        //     prop: [{'wrh':wrh}, {activeTables: [
        //         ...prevTable.activeTables.filter((tableOrder)=>{return (
        //             tableOrder.sessionId !== curSession.i_d &&
        //             tableOrder.handlerId !== companyRecord.emailid                    
        //         )})
        //     ]}]
        // }, "updateOneDoc", server)
        // if (resp.err){
        //     setAlertState('error');
        //     setAlert('Error updating table');
        //     setAlertTimeout(3000)
        //     return;
        // }
        const {bankSales, cashSales} = getOrderSales(sessionOrders)
        const openingCash = session.openingCash
        let netBalance = 0
        if (bankBalance !== bankSales || cashBalance !== (cashSales + openingCash)){
            netBalance = (bankBalance + cashBalance) - (bankSales + cashSales + openingCash)
        }  
        const response = await fetchServer("POST", {
            database: company,
            collection: "POSSessions",
            prop: [{start: session.start},{
                end: new Date().getTime(),
                active: false,
                totalBankSales: bankBalance,
                totalCashSales: cashBalance,
                debtDue: netBalance < 0 ? Math.abs(netBalance) : 0,
                unAccountedSales : netBalance > 0 ? netBalance : 0
            }]
        }, "updateOneDoc", server);
    
        if (response.err) {
            setAlertState('error');
            setAlert('Could not end session. Please check your internet connection!');
            setAlertTimeout(3000)
        } else {
            setAlertState('success');
            setAlert('Session Ended!');
            setAlertTimeout(3000)
            setEndSession(false)
            setSessions(null)
            setCurrSession(null)
            setStartSession(true)
            setAlertTimeout(5000)
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
                    setStartSession(false)
                    setSessionEnded(true)
                    // setEndSession(true)
                }else{
                    setStartSession(false)
                    setEndSession(false)
                }
            } else {
                let oldSession = null
                if (sessions.length){
                    oldSession = sessions[sessions.length - 1]
                    setOpeningCash(oldSession.totalCashSales)
                }
                setStartSession(true)
                setEndSession(false)
            }
        }else{
            if (!loadSession && !sessions.length){
                setStartSession(true)
                setEndSession(false)
            }
        }
    } 
    useState(()=>{
        UpdateSessionState(sessions, loadSession)
    },[loadSession])
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
        if (tableControllerRef.current) {
            tableControllerRef.current.abort();
        }
        if (productControllerRef.current) {
            productControllerRef.current.abort();
        }
        if (sessionControllerRef.current) {
            sessionControllerRef.current.abort();
        }
        // Create new AbortControllers
        const orderController = new AbortController();
        const tableController = new AbortController();
        const productController = new AbortController();
        const sessionController = new AbortController();

        // Store the controllers in refs
        orderControllerRef.current = orderController;
        tableControllerRef.current = tableController;
        productControllerRef.current = productController;
        sessionControllerRef.current = sessionController;

         // Fetch tables
        const tablesResponse = await fetchServer("POST", {
            database: company,
            collection: "Tables"
        }, "getDocsDetails", server, tableController.signal);

        // Fetch products
        const productsResponse = await fetchServer("POST", {
            database: company,
            collection: "Products"
        }, "getDocsDetails", server, productController.signal);

        const sessionsResponse = await fetchServer("POST", {
            database: company,
            collection: "POSSessions",
            prop: {'employee_id': companyRecord.emailid}
        }, "getDocsDetails", server, sessionController.signal);
        if (curSession){
            const ordersResponse = await fetchServer("POST", {
                database: company,
                collection: "Orders",
                prop: {}
            }, "getDocsDetails", server, orderController.signal);
            if(!ordersResponse.err){
                setIsLive(true)
                if (![null,undefined].includes(ordersResponse.record)){
                    if(ordersResponse.record?.length){
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

        if (!tablesResponse.err){
            setTables(tablesResponse.record)  
            setIsLive(true)              
        }else{
            if (tablesResponse.mess !== 'Request aborted'){
                setIsLive(false)
                setLiveErrorMessages('Slow Network. Check Connection')
            }
        }

        if(!productsResponse.err){
            setProducts(productsResponse.record)
            setIsLive(true)
        }else{
            if (productsResponse.mess !== 'Request aborted'){
                setIsLive(false)
                setLiveErrorMessages('Slow Network. Check Connection')
            }
        }

        if(!sessionsResponse.err){
            setSessions(sessionsResponse.record)
            setLoadSession(false)
            setIsLive(true)
            UpdateSessionState(sessionsResponse.record, false)
        }else{
            if (sessionsResponse.mess !== 'Request aborted'){
                setIsLive(false)
                setLiveErrorMessages('Slow Network. Check Connection')
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
            if (response.record.length > 0) {
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
                setAlertTimeout(50)
            } else {
                setCurrentTable(table);
                createNewOrder(table);
                setActiveScreen('order');
                setAlertState('info');
                setAlert('Loaded table orders...');
                setAlertTimeout(50)
            }
        }else{
            setAlertState('info')
            setAlert('Slow Network. Could Not Load Table Orders!')
            setAlertTimeout(3000)
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
            wrh: wrh,
            orderId: currentOrder.orderNumber,
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
            ...currentOrder, status: 'pending'
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
            setShowPaymentModal(true);
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
                quantity: quantity || 1
            }];
        }
    
        setCurrentOrder({
            ...currentOrder,
            items: updatedItems,
            totalSales: calculateTotal(updatedItems)
        });
    };

    const handleRemoveItem = (itemId) => {
        const updatedItems = currentOrder.items.filter(item => item.id !== itemId);
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
            totalPayment: totalPayment,
            cashChange: Number(paymentDetails['cash'].change),
            receipts,
            status: 'completed'
        };

        const newOrder = {
            ...currentOrder,
            ...paymentDataUpdate
        }
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
            printReceipt(newOrder);
            setMakingPayment(false)
            setAlertState('success');
            setAlert('Payment processed successfully');
            setAlertTimeout(2000)
            setShowPaymentModal(false);
            createNewOrder({ i_d: currentOrder.tableId, name: currentOrder.tableName });
            setPaymentDetails({...payPoints})
        }
    };

    const printReceipt = (orderData) => {
        const receiptContent = `
            <div class="receipt">
                <h2>${company}</h2>
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
                    <p>Subtotal: ₦${orderData.totalSales.toFixed(2)}</p>
                    <p>Tax: ₦${(orderData.totalSales * 0.075).toFixed(2)}</p>
                    <p>Total: ₦${(orderData.totalSales * 1.075).toFixed(2)}</p>
                    <p>Paid: ₦${orderData.totalPayment}</p>
                    <p>Change: ₦${orderData.cashChange}</p>
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
        printWindow.close();
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
            setLoading(true);
            await createSession();
            setLoading(false);
        };

        const handleEndSession = async () => {
            setLoading(true);
            await stopSession(curSession, allOrders);
            setLoading(false);
        };
    const renderSessionEntry = () => {
        const {bankSales, cashSales} = getOrderSales(allOrders)

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
                            <h2>Start New Session</h2>
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
                                    {wrhs.map((warehouse, index) => (
                                            posWrhAccess[warehouse.name] && <option key={index} value={warehouse.name}>
                                                {warehouse.name}
                                            </option>                                        
                                    ))}
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
                            <h2>End Session</h2>
                            <div className="form-group">
                                <label>Total Bank Sales</label>
                                <input 
                                    type="number" 
                                    value={bankSales || 0} 
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Total Cash Sales</label>
                                <input 
                                    type="number" 
                                    value={cashSales || 0} 
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Enter Bank Balance</label>
                                <input 
                                    type="number" 
                                    value={bankBalance} 
                                    onChange={(e) => setBankBalance(parseFloat(e.target.value) || 0)} 
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label>Enter Cash Balance</label>
                                <input 
                                    type="number" 
                                    value={cashBalance} 
                                    onChange={(e) => setCashBalance(parseFloat(e.target.value) || 0)} 
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label>Actual Session Balance</label>
                                <input 
                                    type="number" 
                                    value={(bankBalance + cashBalance).toFixed(2)} 
                                    readOnly
                                />
                            </div>
                            <div className="session-actions">
                                <button 
                                    className="session-btn end" 
                                    onClick={handleEndSession}
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
                                onClick={() => handleRemoveItem(item.id)}
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
                                        onClick={() => setShowSessions(true)}
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
        <div className="pos-container">
            {renderSessionEntry()}
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
    );
};

export default PointOfSales;

const PaymentModal = ({
    amount, setAmount, 
    currentOrder, 
    method, setMethod,
    paymentDetails, setPaymentDetails,
    setShowPaymentModal, handlePayment,
    payPoints, setAlertState, setAlert, setAlertTimeout
}) => {
    const [paymentSum, setPaymentSum] = useState(0)
    const [cashAmount, setCashAmount] = useState(0)

    useEffect(()=>{
        var paymentAmount = 0
        Object.keys(paymentDetails).forEach((payPoint)=>{
            paymentAmount += Number(paymentDetails[payPoint].amount || 0)
        })
        setPaymentSum(paymentAmount)
    },[paymentDetails])
    const validatePayment = ()=>{
        if (Number(currentOrder.totalSales)>paymentSum){
            setAlertState('info')
            setAlert('Insufficient payment amount')
            // setAlertTimeout(3000)
        }else{
            handlePayment()
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
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content payment-modal">
                <div className="modal-header">
                    <h3>Payment</h3>
                    <button onClick={() => setShowPaymentModal(false)}>×</button>
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
                        onClick={() => {
                            setPaymentDetails({...payPoints})
                            setShowPaymentModal(false)
                        }}
                    >
                        Cancel
                    </button>
                    <button
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
const OrdersModal = ({ tableOrders, wrh, handleOrderSelect, setShowOrdersModal, tables }) => {
    const { companyRecord, fetchServer, setAlert, setAlertState, setAlertTimeout, server, company } = useContext(ContextProvider);

    const handleDeleteOrder = async (order) => {
        const confirmDelete = window.confirm(`Are you sure you want to delete Order #${order.orderNumber}?`);
        if (!confirmDelete) return;
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
            return;
        }
        const response = await fetchServer("POST", {
            database: company,
            collection: "Orders",
            prop: [{orderNumber: order.orderNumber}, { status: 'cancelled' }]
        }, "updateOneDoc", server);

        if (response.err) {
            setAlertState('error');
            setAlert('Error cancelling order');
            setAlertTimeout(3000);
        } else {
            setAlertState('success');
            setAlert('Order cancelled successfully');
            setAlertTimeout(2000);
            setShowOrdersModal(false); // Close modal after deletion
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content orders-modal">
                <div className="modal-header">
                    <h3>All Orders</h3>
                    <button onClick={() => setShowOrdersModal(false)}>×</button>
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
                                    className="cancel-order-btn"
                                    onClick={() => handleDeleteOrder(order)}
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