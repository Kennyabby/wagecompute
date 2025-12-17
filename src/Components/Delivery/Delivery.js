import './Delivery.css'

import React, { useState, useEffect, useContext, useRef } from 'react';
import ContextProvider from '../../Resources/ContextProvider';
import '../PointOfSales/PointOfSales.css'
import { MdShoppingBasket } from 'react-icons/md';
import TransactionReports from '../Shared/TransactionReports/TransactionReports';
import {
  loadDeliverySnapshot,
  saveDeliverySnapshot,
  queuePendingChange,
  loadAllOrders,
  loadAllTables,
  loadAllSessionsLocal,
  putOrder,
  putTable,
  putSession,
  putInventoryTransactions,
} from '../../Resources/offlineDb';
import { syncPendingChanges } from '../../Resources/offlineSync';

const Delivery = () => {
    // =========================================
    // 1. Context and State Management
    // =========================================
    const { 
        storePath,
        fetchServer, server, company, companyRecord,
        setAlert, setAlertState, setAlertTimeout,
        settings, getDate, deliveryWrhAccess, employees, 
        profiles, fetchProfiles, getProductsWithStock,
        products, setProducts, getProducts, getEmployeeName,
        fetchTables, tables, setTables, setCached, setPosOrders,
        fetchSessions, fetchAllSessions, posOrders, getPosOrders,
        getSessionEnd, allSessions, setAllSessions, getAllSessions,
        isLive, setIsLive, liveErrorMessages, setLiveErrorMessages,
        deliverySessions, allDeliverySessions, setAllDeliverySessions, setDeliverySessions,
    } = useContext(ContextProvider);

    // Core States
    const [loading, setLoading] = useState(false);
    const [activeScreen, setActiveScreen] = useState('home');
    const [orderTables, setOrderTables] = useState([]);
    const [currentTable, setCurrentTable] = useState(null)
    const [categories, setCategories] = useState([]);
    const [openingCash, setOpeningCash] = useState(0);
    const [countedSales, setCountedSales] = useState({})
    const [posSalesDifference, setPosSalesDifference] = useState({})
    const [startSession, setStartSession] = useState(false);
    const [endSession, setEndSession] = useState(false);
    const [sessions, setSessions] = useState(null)
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
        storePath('delivery')  
    },[storePath])

    // =========================================
    // 1a. Offline snapshot hydration (read from local, then server refresh)
    // =========================================
    
    // Order States
    const [currentOrder, setCurrentOrder] = useState(null);
    const [posCurrentOrder, setPosCurrentOrder] = useState(null); 
    const [allSessionOrders, setAllSessionOrders] = useState([])
    const [allOrders, setAllOrders] = useState([]);
    const [tableOrders, setTableOrders] = useState([]);
    const [orderType, setOrderType] = useState('dine-in');
    const [cancelling, setCancelling] = useState(false)
    const [deliveryCompleted, setDeliveryCompleted] = useState(false)
    
    // Product States
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [activeCategory, setActiveCategory] = useState(null);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [quantity, setQuantity] = useState('');
    const [postCount, setPostCount] = useState(0)
    
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
        'moniepoint3':{...paymentDetailClone.paymentDetail}, 'moniepoint4':{...paymentDetailClone.paymentDetail}, 
        'moniepoint5':{...paymentDetailClone.paymentDetail}, 'moniepoint6':{...paymentDetailClone.paymentDetail}, 
        'cash':{...paymentDetailClone.paymentDetail}
    })
    const [paymentDetails, setPaymentDetails] = useState({...structuredClone({payPoints}).payPoints});
    
    // Settings States
    const [uoms, setUoms] = useState([]);
    const [wrhs, setWrhs] = useState([]);
    const [wrh, setWrh] = useState('');
    const [wrhCategories, setWrhCategories] = useState({})
    // =========================================
    // 2. Effects and Data Loading
    // =========================================
    useEffect(() => {
        handleSettingsUpdate();
    }, [settings]);
    
    useEffect(() => {
        if (!company || !companyRecord?.emailid) return;

        let cancelled = false;
        (async () => {
            const snap = await loadDeliverySnapshot(company, companyRecord.emailid);
            if (!snap || cancelled) return;

            try {
                const {
                    // deliverySessions: snapSessions,
                    // curSession: snapCurSession,
                    // allOrders: snapAllOrders,
                    // orderTables: snapOrderTables,
                    allSessions: snapAllSessions,
                    tables: snapTables,
                    allSessionOrders: snapAllOrders,
                    products: snapProducts,
                } = snap;

                // if (Array.isArray(snapSessions)) {
                //     setDeliverySessions(snapSessions);
                // }
                // if (Array.isArray(snapAllSessions)) {
                //     setAllDeliverySessions(snapAllSessions)
                // }
                // if (Array.isArray(snapTables)) {
                //     setTables(snapTables);
                // }
                // if (snapCurSession) {
                //     setCurrSession(snapCurSession);
                // }
                // if (Array.isArray(snapOrderTables) && !orderTables.length) {
                //     setOrderTables(snapOrderTables);
                // }
                if (Array.isArray(snapAllOrders)) {
                    setAllSessionOrders(snapAllOrders);
                }
                if (Array.isArray(snapProducts) && !products.length) {
                    setProducts(snapProducts);
                }

                // Also mirror snapshot into entity stores so Offline Debug panel sees data immediately
                if (company && companyRecord?.emailid) {
                    if (Array.isArray(snapAllSessions)) {
                        for (const s of snapAllSessions) {
                            await putSession(company, companyRecord.emailid, s);
                        }
                    }
                    if (Array.isArray(snapTables)) {
                        for (const t of snapTables) {
                            await putTable(company, companyRecord.emailid, t);
                        }
                    }
                    if (Array.isArray(snapAllOrders)) {
                        for (const o of snapAllOrders) {
                            await putOrder(company, companyRecord.emailid, o);
                        }
                    }
                }
            } catch (e) {
                // Fail silently; server fetch will still run.
                console.warn('Delivery snapshot hydrate failed', e);
            }
        })();

        
        return () => {
            cancelled = true;
        };
    }, [company, companyRecord?.emailid]);
    
    // Hydrate orders, sessions, and tables from IndexedDB on mount
    useEffect(() => {
        if (!company || !companyRecord?.emailid) return;

        (async () => {
            try {
                const [orders, sessionsLocal, tablesLocal] = await Promise.all([
                    loadAllOrders(company, companyRecord.emailid),
                    loadAllSessionsLocal(company, companyRecord.emailid),
                    loadAllTables(company, companyRecord.emailid),
                ]);

                if (Array.isArray(orders) && orders?.length) {
                    setAllSessionOrders(orders);
                }

                if (Array.isArray(sessionsLocal) && sessionsLocal.length) {
                    const localDeliverySessions = sessionsLocal.filter(s => s.type === 'delivery');
                    setAllDeliverySessions(localDeliverySessions);
                    setAllSessions(localDeliverySessions);

                    const localCurDeliverySessions = localDeliverySessions.filter(s => s.employee_id === companyRecord?.emailid)
                    setDeliverySessions(localCurDeliverySessions);                    

                    // Immediately derive curSession from locally cached sales sessions
                    // UpdateSessionState(localSalesSessions, false);
                }

                if (Array.isArray(tablesLocal) && tablesLocal.length) {
                    setTables(tablesLocal);
                }
            } catch (e) {
                console.warn('POS hydrateFromIndexedDb failed', e);
            }
        })();
    }, [company, companyRecord?.emailid]);

    useEffect(()=>{
        loadTableData()
        if (window.localStorage.getItem('pos-wrh')){
            setWrh(window.localStorage.getItem('pos-wrh'))
        }else{
            if  (curSession){
                setWrh(curSession.wrh || Object.keys(deliveryWrhAccess)[0])
            }
        }
    },[curSession])
    
    useEffect(() => {
        handleCategoryFilter();
    }, [activeCategory, products]);
    
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
        if (Array.isArray(deliverySessions)){
            setSessions(deliverySessions)
            const syncToIndexDB = async ()=>{
                for (const s of deliverySessions) {
                    if (s && s.start != null) {
                        await putSession(company, companyRecord.emailid, s);
                    }
                }
            }
            syncToIndexDB()
        }
    },[deliverySessions])

    useEffect(()=>{
        if (tables?.length && sessions !== null){
            if (sessions.length){
                setIsLive(true)
                setLoadSession(false)
                // console.log('line 291, on Mount:',sessions.find(session=>session.active))
                UpdateSessionState(sessions, false)
            }else{
                setIsLive(true)
                setLoadSession(false)
                setStartSession(true)
            }
        }
    },[tables, sessions])
    
    useEffect(()=>{
        var cmp_val = window.localStorage.getItem('sessn-cmp')        
        getProducts(cmp_val)
        fetchTables(cmp_val)
        const intervalId = setInterval(()=>{
            if (cmp_val){
                // Fetch tables
                fetchTables(cmp_val)
                // Fetch products
                // getProducts(cmp_val)
            }
        },30000)
        return () => clearInterval(intervalId);
    },[window.localStorage.getItem('sessn-cmp')])

    useEffect(()=>{
        var cmp_val = window.localStorage.getItem('sessn-cmp')        
        // loadInitialData()
        getPosOrders({company})
        const intervalId = setInterval(()=>{
            if (cmp_val){
                // Fetch tables
                loadInitialData()
                getPosOrders({company})
                // Fetch products
                // getProducts(cmp_val)
            }
        },120000)
        return () => clearInterval(intervalId);
    },[window.localStorage.getItem('sessn-cmp')])

    useEffect(()=>{
        if (Array.isArray(posOrders) && posOrders.length){
            setAllSessionOrders(posOrders)
            // console.log('line 334 ', new Date(posOrders[0].sessionId))
            const syncToIndexDB = async ()=>{
                for (const o of posOrders) {
                    if (o && o.orderNumber != null) {
                        await putOrder(company, companyRecord.emailid, o);
                    }
                }
            }
            syncToIndexDB()
        }
    },[posOrders])

    useEffect(()=> {
        // Fetch products
        if (products.length){
            getProductsWithStock(company, products) 
        }

        loadInitialData()

        // Fetch prpfiles
        fetchProfiles(company)
            
        // Fetch All sessions
        getAllSessions(company)
        fetchAllSessions({company})
        
        // Feth Sessions
        fetchSessions(company, "delivery", companyRecord)
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
        if (curSession!==null && allSessionOrders.length){            
            // console.log('line 376: ', 'current session:',new Date(curSession.start),'orderDate:',new Date(allSessionOrders[0].sessionId))
            setAllOrders(allSessionOrders?.filter((order,i) =>{
                if (getSessionEnd(new Date(order.createdAt).getTime()) === getSessionEnd(curSession.start)){
                    if (!i){
                        // console.log('line 378: ', new Date(order.sessionId))
                    }
                    return order
                }                            
            })) 
        }
    },[allSessionOrders, curSession])

    // useEffect(()=>{        
    //     if (Array.isArray(allOrders) && allOrders.length){
    //         console.log('line 387: ', new Date(allOrders[allOrders.length -1].sessionId))
    //     }else{
    //         console.log('line 390:', allOrders)
    //     }
    // },[allOrders])

    useEffect(()=>{
        if (tables.length && wrh && curSession && employees.length){
            const syncToIndexDB = async ()=>{
                for (const t of tables) {
                    if (t && t.i_d != null) {
                        await putTable(company, companyRecord.emailid, t);
                    }
                }
            }
            syncToIndexDB()
            setOrderTables((orderTables)=>{
                const activeOrders = []
                wrhs.forEach((warehouse)=>{
                    const prevTable = tables.find((table)=>{return table['wrh'] === warehouse.name})
                    prevTable?.activeTables?.forEach((activeOrder)=>{
                        if (activeOrder.delivery === 'pending'){
                            activeOrders.push(activeOrder)
                        }
                    })
                })
                // console.log('current Session:', new Date(curSession.start))
                // console.log(new Date(allOrders[0].sessionId))
                orderTables.forEach((orderTable)=>{
                    const myTableOrders = []
                    const otherTableOrders  = []
                    var tableUser = null
                    var wrhPendingItems = []
                    activeOrders.forEach((activeOrder)=>{
                        var orderDate = '01/01/1970'
                        if (activeOrder.createdAt){
                            orderDate = activeOrder.createdAt
                        }
                        if (
                            activeOrder.tableId === orderTable.i_d &&
                            (activeOrder.wrh === wrh || wrh === 'kitchen') &&
                            getSessionEnd(new Date(orderDate).getTime()) === getSessionEnd(curSession.start)                            
                        ){
                            let actualOrder = allOrders.find(order => order.orderNumber === activeOrder.orderNumber)     
                            // console.log(actualOrder)                       
                            if (![null, undefined].includes(actualOrder)){
                                actualOrder.items.forEach((item)=>{
                                    if (wrhCategories[wrh].includes(item.category) && item.delivery!=='completed'){
                                        wrhPendingItems.push(item)
                                    }
                                })
                            }
                            
                            if (wrhPendingItems.length){
                                tableUser = employees.find(employee => employee.i_d === activeOrder.handlerId)
                                myTableOrders.push(activeOrder)
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
                    orderTable.pendingItems = wrhPendingItems                    
                })
                return [...orderTables]
            })
        }
    },[tables,curSession, wrh, employees, allOrders])

    useEffect(() => {
        if (!company || !companyRecord?.emailid) return;

        const snapshot = {
            sessions,
            allSessions,
            tables,
            allSessionOrders,
            allOrders,
            products,
            curSession,
            orderTables,
            activeScreen,
            currentOrder,
        };

        saveDeliverySnapshot(company, companyRecord.emailid, snapshot);
    }, [
        company,
        companyRecord?.emailid,
        sessions,
        allSessions,
        tables,
        allSessionOrders,
        allOrders,
        products,
        curSession,
        orderTables,
        activeScreen,
        currentOrder,
    ]);

    const handleSyncOfflineDelivery = async () => {
        if (!company || !companyRecord?.emailid) return;

        setAlertState('info');
        setAlert('Syncing offline Delivery changes...');
        setAlertTimeout(10000);

        try {
            await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
            setAlertState('success');
            setAlert('Offline Delivery sync completed');
            setAlertTimeout(3000);
        } catch (e) {
            setAlertState('error');
            setAlert('Offline Delivery sync failed. Please try again.');
            setAlertTimeout(5000);
        }
    };

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

    const createSession = async (sessionUser) => {
        if (!wrh) {
            setAlertState('info');
            setAlert('Please Select Your Sales Post');
            setAlertTimeout(5000);
            return;
        }

        const newSession = {
            employee_id: ![null, undefined].includes(sessionUser)
                ? sessionUser.profile.emailid
                : companyRecord.emailid,
            i_d: new Date().getTime(),
            type: 'delivery',
            wrh: wrh,
            start: new Date().getTime(),
            startedBy: companyRecord.emailid,
            end: null,
            active: true,
            shortage: 0,
        };

        try {
            // 1) Local write
            if (company && companyRecord?.emailid) {
                await putSession(company, companyRecord.emailid, newSession);
            }            

            // 3) Queue for sync
            if (company && companyRecord?.emailid) {
                queuePendingChange(company, companyRecord.emailid, {
                    entityType: 'session',
                    op: 'create',
                    clientId: newSession.start,
                    payload: newSession,
                });
                // Immediate sync attempt – failures are fine, queue remains
                try {
                    // 2) State
                    setAlertState('success');
                    if (![null, undefined].includes(sessionUser)) {
                        setAlert('User Session Started Successfully!');
                    } else {
                        setAlert('Welcome Back!');
                    }
                    setAlertTimeout(2000);
                    setStartSession(false);
                    setCurrSession(newSession);
                    setOpeningCash(0);
                    setAllSessions((allSessions) => [...allSessions, newSession]);
                    if (![null, undefined].includes(sessionUser)) {
                        if (sessionUser.profile.emailid === companyRecord.emailid) {
                            setSessions([...(sessions || []), newSession]);
                        }
                    } else {
                        setSessions([...(sessions || []), newSession]);
                    }
                    setSessionUser(null);
                    await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                    fetchSessions(company, "delivery", companyRecord)
                    fetchAllSessions({company})
                } catch (e) {
                    // Leave pending changes in queue; 5‑minute auto-sync will retry
                }
            }

            return;
        } catch (e) {
            setAlertState('error');
            setAlert('Could not start delivery session locally.');
            setAlertTimeout(3000);
            return;
        }
    };

    const stopSession = async (session, salesShortages) => {
        const sessionUpdate = {
            end: new Date().getTime(),
            endedby: companyRecord.emailid,
            active: false,
            shortage: salesShortages,
        };

        const closedSession = {
            ...session,
            ...sessionUpdate,
        };

        try {
            // 1) Local update
            if (company && companyRecord?.emailid) {
                await putSession(company, companyRecord.emailid, closedSession);
            }            

            // 3) Queue for sync
            if (company && companyRecord?.emailid) {
                queuePendingChange(company, companyRecord.emailid, {
                    entityType: 'session',
                    op: 'update',
                    clientId: session.start,
                    payload: closedSession,
                });
            }
            // Immediate sync attempt – failures are fine, queue remains
            try {
                // 2) State
                setAlertState('success');
                if (![null, undefined].includes(sessionUser)) {
                    setAlert('User Session Ended Successfully!');
                } else {
                    setAlert('Session Ended!');
                }
                setAlertTimeout(3000);
                setEndSession(false);
                setAllSessions((allSessions) => [...allSessions, closedSession]);
                setCountedSales({});
                setSessionUser(null);
                setAlertTimeout(5000);
                await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                fetchSessions(company, "delivery", companyRecord)
                fetchAllSessions({company})
                getAllSessions(company)
            } catch (e) {
                // Leave pending changes in queue; 5‑minute auto-sync will retry
            }

            return;
        } catch (e) {
            setAlertState('error');
            setAlert('Could not end delivery session locally.');
            setAlertTimeout(3000);
            return;
        }
    };


    const UpdateSessionState = (sessions, loadSession)=>{
        if (!loadSession && sessions?.length){     
            const previousSession = sessions.filter((session)=> session.active)            
            let lastSessionIndex = 0
            if (previousSession.length){
                lastSessionIndex = previousSession.length - 1
                // console.log ('line 792','previousSession:',new Date(previousSession[lastSessionIndex].start))
                setCurrSession(previousSession[lastSessionIndex])
                if(new Date().getTime() >= getSessionEnd(previousSession[lastSessionIndex].start)){                
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
                    let oldSessions = sessions.sort((a, b) => a.start - b.start)
                    oldSession = oldSessions[sessions.length - 1]
                    // console.log ('line 809','oldSession:',new Date(oldSession?.start), oldSessions)
                    setCurrSession(oldSession)
                    setSessionEnded(true)
                    setOpeningCash((Number(oldSession.openingCash || 0) + Number(oldSession.cash || 0) - Number(oldSession.totalCashChange || 0)))
                }
                if (companyRecord.status !== 'admin' && !companyRecord.permissions.includes('access_pos_deliveries')){
                    setStartSession(true)
                }
                // setEndSession(false)
            }
        }
    } 

    useEffect(()=>{
        if (Array.isArray(sessions)){
            // console.log('line 825, on Mount:',sessions.find(session=>session.active))
            UpdateSessionState(sessions, loadSession)
        }
    },[loadSession,sessions])

    // =========================================
    // 3. Data Loading Functions
    // =========================================

    const loadTableData = () =>{
        let orderTables = []
        for (let i=0; i<30; i++){
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
  
        const orderController = new AbortController();    
        
        // Store the controllers in refs
        orderControllerRef.current = orderController;

        const ordersResponse = await fetchServer("POST", {
            database: company,
            collection: "Orders"
        }, "getDocsDetails", server);
        if (!ordersResponse.err && Array.isArray(ordersResponse.record)){
            setAllSessionOrders(ordersResponse.record)        
        }

        // Fetch Orders
        if (curSession){
            const ordersResponse = await fetchServer("POST", {
                database: company,
                collection: "Orders"
            }, "getDocsDetails", server, orderController.signal);
            
            if(!ordersResponse.err){
                setIsLive(true)
                if (![null,undefined].includes(ordersResponse.record)){
                    if(ordersResponse?.record?.length && Array.isArray(ordersResponse.record)){
                        setAllSessionOrders(ordersResponse.record)
                        setAllOrders(ordersResponse.record.filter((order, i) =>{
                            if (getSessionEnd(new Date(order.createdAt).getTime()) === getSessionEnd(curSession.start)){                               
                                return order
                            }                            
                        })) 
                        // write-through to IndexedDB orders store (guard keyPath)
                        try {
                            for (const o of ordersResponse.record) {
                                if (o && o.orderNumber != null) {
                                    await putOrder(company, companyRecord.emailid, o);
                                }
                            }
                        } catch (e) {
                            console.warn('Delivery: putOrder in loadInitialData failed', e);
                        }
                        setPlacingOrder(false)
                        var ordersUpdate = ordersResponse.record
                        if (currentOrder!==null){
                            if (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_deliveries')){
                                setTableOrders(ordersUpdate.filter((order)=>{
                                    var orderDate = '01/01/1970'
                                    if (order.createdAt){
                                        orderDate = order.createdAt
                                    }
                                    if (
                                        order.tableId === currentTable.i_d
                                        && (order.wrh === wrh || wrh === 'kitchen') 
                                    ){
                                        // Check if the order is from the current session
                                        return getSessionEnd(new Date(orderDate).getTime()) === getSessionEnd(curSession.start)
                                    }
                                }))
                            }else{
                                const myTableOrders = ordersUpdate.filter((order) =>{                                    
                                    return order.tableId === currentTable.i_d
                                    && order.wrh === wrh
                                    && getSessionEnd(new Date(order.createdAt).getTime()) === getSessionEnd(curSession.i_d)                                    
                                })
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

    const switchTable = (e)=>{
        let nextIndex
        const {name} = e.target
        
        if (!placingOrder && !makingPayment && name){
            if (products.length){
                getProductsWithStock(company, products)
            }
    
            getPosOrders({company})
            fetchSessions(company, "delivery", companyRecord)                        
            fetchAllSessions({company})
            let currentTableIndex = 0
            const sortedOrderTables = orderTables.sort((a, b) => {
                const numA = parseInt(a.name.replace(/[^0-9]/g, ''));
                const numB = parseInt(b.name.replace(/[^0-9]/g, ''));
                return numA - numB;
            })
            
            sortedOrderTables.forEach((orderTable, i)=>{
                if (orderTable.i_d === currentTable.i_d){
                    currentTableIndex = i
                }
            })

            nextIndex = currentTableIndex
            if (name === 'prevTable' && currentTableIndex > 0){
                nextIndex = currentTableIndex - 1
            }else if (name === 'nextTable' && currentTableIndex < sortedOrderTables.length - 1){
                nextIndex = currentTableIndex + 1
            }
            setTableOrders([])
            setCurrentOrder(null)
            setPlacingOrder(false)
            setMakingPayment(false)
            setDeliveryCompleted(false)
            handleTableSelect(sortedOrderTables[nextIndex])            
        }
    }

    const handleTableSelect = async (table) => {
        if (!loadSession && !startSession && !endSession) {
            if (
                table.status !== 'available' &&
                (companyRecord?.status !== 'admin' &&
                    !companyRecord?.permissions.includes('access_delivery_sessions'))
            ) {
                setAlertState('error');
                setAlert(`Table ${table.i_d} is not available. Still in use!`);
                setAlertTimeout(2000);
                return;
            }

            setSelectedProduct(null);
            setAlertState('info');
            setAlert(`Loading Table ${table.i_d} Orders...`);
            setAlertTimeout(100000)            

            // 1) Use locally available orders (mirrored from IndexedDB) as primary
            const baseOrders =
                Array.isArray(allOrders) && allOrders.length
                    ? allOrders : []           
            let localOrders = [];
            if (Array.isArray(baseOrders)) {
                localOrders = baseOrders.filter((order) => {
                    if (!order) return false;
                    if (order.tableId !== table.i_d) return false;
                    if (order.wrh !== wrh && wrh !== 'kitchen') return false;                    

                    const orderDate = order.createdAt || '01/01/1970';
                    return (
                        getSessionEnd(new Date(orderDate).getTime()) ===
                        getSessionEnd(curSession.start)
                    );
                });
            }

            if (localOrders.length) {
                setCurrentTable(table);
                setTableOrders(localOrders);
                const pendingLocal = localOrders.filter(
                    (order) => order.status === 'pending'
                );
                if (pendingLocal.length) {
                    setCurrentOrder(pendingLocal[0]);
                    setPosCurrentOrder(pendingLocal[0]);
                } else {
                    createNewOrder(table);
                }
                setActiveScreen('order');
                setAlertState('info');
                setAlert('Loaded table orders from local cache...');
                setAlertTimeout(500);
            } else {
                // No local orders; optimistic new order
                setCurrentTable(table);
                createNewOrder(table);
                setActiveScreen('order');
                setAlertState('info');
                setAlert('Loaded table (no local orders found)...');
                setAlertTimeout(500);
            }

            // 2) Background refresh from server and mirror into IndexedDB
            // setAlertState('info');
            // setAlert(`Refreshing Table ${table.i_d} orders from server...`);
            // setAlertTimeout(100);

            const orderFilter = {
                tableId: table.i_d,
                start: curSession.start,
                type: 'delivery',             
                wrh: wrh,
            };

            const response = await getPosOrders({company, option: 'tableOrders', filter: orderFilter, companyRecord})
            const filteredOrders = response?.record ?? []
            if (!response.err && Array.isArray(filteredOrders)) {                                
                if (!localOrders.length){
                    if (filteredOrders.length) {
                        // console.log('my table', currentTable)
                        // console.log(table?.i_d, filteredOrders[0]?.tableId)
                        if (table?.i_d === filteredOrders[0]?.tableId){
                            setCurrentTable(table);
                            setTableOrders(filteredOrders);
                            const pendingRemote = filteredOrders.filter(
                                (order) => order.status === 'pending'
                            );
                            if (pendingRemote.length) {
                                setCurrentOrder(pendingRemote[0]);
                                setPosCurrentOrder(pendingRemote[0]);
                            } else {
                                createNewOrder(table);
                            }
                            if (company && companyRecord?.emailid) {
                                for (const o of filteredOrders) {
                                    if (o && o.orderNumber !== null) {
                                        await putOrder(company, companyRecord.emailid, o);
                                    }
                                }
                            }
                            // setActiveScreen('order');
                            setAlertState('info');
                            setAlert('Loaded table orders from server...');
                            setAlertTimeout(500);
                            // Mirror into IndexedDB orders store
                            getPosOrders({company, option: 'tableOrders', filter: orderFilter, companyRecord})
                        }
                    } else {
                        // createNewOrder(table);
                        // setActiveScreen('order');
                        // setAlertState('info');
                        // setAlert('No server orders; using new order...');
                        // setAlertTimeout(500);
                    }
                }

            } else {
                setAlertState('info');
                setAlert('Slow Network. Could Not Refresh Table Orders!');
                setAlertTimeout(3000);
            }

            // 3) Optional background refresh of other entities (non-blocking for UI)
            fetchTables(company);
            getProducts(company);
            loadInitialData();
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

    // Update the handleAddItem function to separate selection from adding
    const handleAddItem = (product, quantity = 1) => {
        if (!product) return;
        const originalItem = posCurrentOrder.items.find(item => item.i_d === product.i_d);
        const existingItem = currentOrder.items.find(item => item.i_d === product.i_d);
        
        let updatedItems;
    
        if (existingItem){
            updatedItems = currentOrder.items.map(item =>
                item.i_d === product.i_d 
                    ? { ...item, orderQuantity: quantity ? quantity : item.quantity + 1 }
                    : item
            );
        } else {
            updatedItems = [...currentOrder.items, { 
                ...product,
                i_d: product.i_d,
                orderQuantity: quantity || 1,
                orderNumber: currentOrder.orderNumber,
                tableId: currentOrder.tableId
            }];
        }

        let updatedItem = updatedItems.find(item => item.i_d === product.i_d)
        if (Number(updatedItem.orderQuantity) > (Number(originalItem.quantity) - Number(originalItem.deliveredQuantity || 0))){
            setAlertState('error');
            setAlert('Delivery quantity cannot be greater than ordered quantity!');
            setAlertTimeout(3000)
            return
        }
        setCurrentOrder({
            ...currentOrder,
            items: updatedItems,
        });
    };

    const handleRemoveItem = (itemId) => {
        const updatedItems = currentOrder.items.filter(item => item.i_d !== itemId);
        setCurrentOrder({
            ...currentOrder,
            items: updatedItems,    
        });
        setSelectedProduct(null)
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
        const orderClone = structuredClone({order});
        const posOrderClone = structuredClone({order})
        setSelectedProduct(null);
        setCurrentOrder(orderClone.order);
        setPosCurrentOrder(posOrderClone.order)
    };

    // =========================================
    // 6. Delivery Processing
    // =========================================

    const updateInventory = async (action, items, deliveryDataUpdate) => {
        setAlertState('info');
        setAlert('Updating Inventory...');
        setAlertTimeout(5000);
        setPostCount(0);

        const isDeplete = action === 'deplete';
        const createdAt = new Date().getTime();
        const transactions = [];

        for (const item of items) {
            const quantityUpdate = isDeplete
                ? -1 * Math.abs(Number(item.depletedQuantity))
                : Math.abs(Number(item.deliveredQuantity));

            const uom1 = uoms.filter((uom) => {
                return uom.code === item.purchaseUom;
            });

            if (!products.length) {
                setAlertState('error');
                setAlert('Wait for Products to load, or refresh and try again!');
                setAlertTimeout(3000);
                return;
            }

            const product = products.find((prd) => prd.i_d === item.i_d);
            const itemWrh = wrh;

            const purchaseWrh = wrhs.find((warehouse) => {
                return warehouse.purchase;
            });
            const { cost, quantity } =
                product.locationStock?.[purchaseWrh?.name] || { cost: 0, quantity: 0 };

            let cummulativeUnitCostPrice = 0;
            cummulativeUnitCostPrice = quantity
                ? parseFloat(Math.abs(Number(cost / quantity))).toFixed(2)
                : 0;

            const depletedItem = {
                productId: item.i_d,
                location: itemWrh,
                name: item.name,
                category: item.category,
                quantity: quantityUpdate,
                baseQuantity: quantityUpdate,
                salesUom: item.salesUom,
                baseUom: uom1[0]?.base,
                costPrice: Number(item.costPrice),
                salesPrice: item.salesPrice,
                vipPrice: item.vipPrice,
                totalSales:
                    currentOrder.wrh === 'vip'
                        ? quantityUpdate * Number(item.vipPrice || item.salesPrice)
                        : quantityUpdate * Number(item.salesPrice),
                totalCost: quantityUpdate * Number(item.costPrice || 0),
                entryType: 'Sales',
                documentType: isDeplete ? 'Shipment' : 'Return',
                orderNumber: currentOrder.orderNumber,
                sessionId: currentOrder.sessionId,
                tableId: currentOrder.tableId,
                handlerId: currentOrder.handlerId,
                deliveredBy: companyRecord.emailid,
                postingDate: new Date(Date.now()).toISOString().slice(0, 10),
                postingStamp: new Date(Date.now()),
                createdAt: createdAt,
            };

            transactions.push(depletedItem);
        }

        try {
            if (transactions.length && company && companyRecord?.emailid) {
                // 1) Save inventory transactions locally
                await putInventoryTransactions(company, companyRecord.emailid, transactions);

                // 2) Queue inventory changes for sync
                setAlertTimeout(20);
                await queuePendingChange(company, companyRecord.emailid, {
                    entityType: 'inventory',
                    op: 'create',
                    payload: { transactions },
                });
                setAlert('Inventory updated successfully');
                setAlertState('success');
                setAlertTimeout(2000);
                // Immediate sync attempt – failures are fine, queue remains
                try {
                    // 3) Update local order state with deliveryDataUpdate
                    if (action === 'deplete') {
                        setCurrentOrder((currentOrder) => {
                            return { ...currentOrder, ...deliveryDataUpdate };
                        });
                        setTableOrders((tableOrders) => {
                            const updated = tableOrders.map((tableOrder) =>
                                tableOrder.orderNumber === currentOrder.orderNumber
                                    ? { ...tableOrder, ...deliveryDataUpdate }
                                    : tableOrder
                            );
                            return updated;
                        });
                    } else {
                        setCurrentOrder((currentOrder) => {
                            return { ...currentOrder, ...deliveryDataUpdate };
                        });
                        setTableOrders((tableOrders) => {
                            const updated = tableOrders.map((tableOrder) =>
                                    tableOrder.orderNumber === currentOrder.orderNumber
                                ? { ...tableOrder, ...deliveryDataUpdate }
                                : tableOrder
                            );
                            return updated;
                        });
                    }
                    setPlacingOrder(false) 
                    // 4) Local success alerts (no dependence on server)
                    if (action === 'deplete') {
                        setAlertState('success');
                        setAlert('Delivery processed successfully');
                        setAlertTimeout(2000);
                    } else {
                        setCancelling(false);
                        setAlertState('success');
                        setAlert('Delivery cancelled successfully');
                        setAlertTimeout(2000);
                    }
                    await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                    fetchSessions(company, "delivery", companyRecord)
                    fetchAllSessions({company})
                    fetchTables(company)
                    loadInitialData()
                } catch (e) {
                    // Leave pending changes in queue; 5‑minute auto-sync will retry
                }
            }            

        } catch (e) {
            setAlertState('error');
            setAlert('Error updating inventory locally');
            setAlertTimeout(5000);
            setPlacingOrder(false)
        }
    };

    const handleOrderDelivery = async () => {
        fetchSessions(company, "delivery", companyRecord);
        fetchAllSessions({company})
        fetchTables(company);
        if (products.length) {
            getProductsWithStock(company, products);
        }

        setAlertState('info');
        setAlert('Processing Delivery...');
        setAlertTimeout(10000);
        setPlacingOrder(true);

        const paymentData = {};
        Object.keys(paymentDetails).forEach((payPoint) => {
            paymentData[payPoint] = Number(paymentDetails[payPoint].amount || 0);
        });

        const deliveryDataUpdate = {
            lastDeliveredAt: new Date().getTime(),
            lastDeliveredBy: companyRecord.emailid,
        };

        // Track Delivery Sessions
        if (currentOrder.deliverySessions?.length) {
            if (!currentOrder.deliverySessions.includes(curSession.i_d)) {
                deliveryDataUpdate.deliverySessions = [
                    ...currentOrder.deliverySessions,
                    curSession.i_d,
                ];
            }
        } else {
            deliveryDataUpdate.deliverySessions = [curSession.i_d];
        }

        // Tag delivered Items
        let pendingOrderItems = posCurrentOrder.items;
        let edittedOrderItems = currentOrder?.items;
        let deliveredOrderItems = [];
        let itemsToDeplete = [];

        edittedOrderItems.forEach((item) => {
            const previousItemState = pendingOrderItems.find((itm) => {
                return itm.i_d === item.i_d;
            });

            if (wrhCategories[wrh].includes(item.category)) {
                if (item.delivery !== 'completed') {
                    const depletedQuantity = Number(
                        item.orderQuantity ||
                            item.remainingQuantity ||
                            item.quantity
                    );
                    previousItemState.deliveredQuantity =
                        Number(previousItemState.deliveredQuantity || 0) +
                        depletedQuantity;
                    previousItemState.remainingQuantity =
                        Number(previousItemState.quantity) -
                        Number(previousItemState.deliveredQuantity);
                    previousItemState.lastDeliveredBy = companyRecord.emailid;
                    previousItemState.lastDeliveredAt =
                        deliveryDataUpdate.lastDeliveredAt;
                    previousItemState.lastDeliverySession = curSession.i_d;
                    previousItemState.lastDelvieredQuantity = depletedQuantity;
                    item.depletedQuantity = depletedQuantity;
                    itemsToDeplete.push(item);

                    if (Number(previousItemState.remainingQuantity) === 0) {
                        previousItemState.delivery = 'completed';
                    }
                }
                deliveredOrderItems.push(previousItemState);
            }
        });

        const insufficientProducts = [];
        for (const entry of itemsToDeplete) {
            const product = products.find((p) => p.i_d === entry.i_d);
            if (product) {
                let countBaseQuantity = 0;
                const { cost, quantity } =
                    product.locationStock?.[wrh] || { cost: 0, quantity: 0 };
                countBaseQuantity = Number(quantity || 0);
                if (countBaseQuantity < Number(entry.depletedQuantity)) {
                    insufficientProducts.push(
                        `[${entry.i_d}] ${entry.name} (${countBaseQuantity.toLocaleString()})`
                    );
                }
            }
        }

        if (insufficientProducts.length > 0) {
            setAlertState('error');
            setAlert(
                `Insufficient quantity in "${wrh}" store, for the following product(s): ${insufficientProducts.join(
                    ', '
                )}`
            );
            setAlertTimeout(3000);
            setPlacingOrder(false);
            setCurrentOrder(posCurrentOrder);
            return;
        }

        const updatedOrderItems = [];
        let totalDelivered = 0;

        pendingOrderItems.forEach((item) => {
            const deliveredItem = deliveredOrderItems.find(
                (itm) => itm.i_d === item.i_d
            );

            if (![null, undefined].includes(deliveredItem)) {
                if (deliveredItem.delivery === 'completed') {
                    totalDelivered += 1;
                }
                updatedOrderItems.push(deliveredItem);
            } else {
                if (item.delivery === 'completed') {
                    totalDelivered += 1;
                }
                updatedOrderItems.push(item);
            }
        });

        deliveryDataUpdate.delivery =
            totalDelivered === updatedOrderItems.length ? 'completed' : 'pending';
        deliveryDataUpdate.items = updatedOrderItems;

        try {
            // 1) Update Tables locally (no direct server writes)
            const prevTable = tables.find(
                (table) => table['wrh'] === currentOrder.wrh
            );
            if (prevTable) {
                let newActiveTables = [...(prevTable.activeTables || [])];

                // Remove or update the matching activeTable record
                if (
                    currentOrder.status === 'completed' &&
                    deliveryDataUpdate.delivery === 'completed'
                ) {
                    newActiveTables = newActiveTables.filter(
                        (table) =>
                            !(
                                table.tableId === currentOrder.tableId &&
                                table.sessionId === currentOrder.sessionId &&
                                table.orderNumber === currentOrder.orderNumber
                            )
                    );
                } else if (deliveryDataUpdate.delivery === 'completed') {
                    setDeliveryCompleted(true);
                    newActiveTables = [
                        ...newActiveTables.filter(
                            (table) =>
                                !(
                                    table.tableId === currentOrder.tableId &&
                                    table.sessionId === currentOrder.sessionId &&
                                    table.orderNumber === currentOrder.orderNumber
                                )
                        ),
                        {
                            ...(newActiveTables.find(
                                (table) =>
                                    table.tableId === currentOrder.tableId &&
                                    table.sessionId === currentOrder.sessionId &&
                                    table.orderNumber === currentOrder.orderNumber
                            ) || {}),
                            delivery: 'completed',
                        },
                    ];
                }

                const updatedTable = {
                    ...prevTable,
                    activeTables: newActiveTables,
                };

                if (company && companyRecord?.emailid) {
                    await putTable(company, companyRecord.emailid, updatedTable);
                }

                setTables((prev) =>
                    prev.map((t) =>
                        t.wrh === currentOrder.wrh ? updatedTable : t
                    )
                );

                // Queue table update
                if (company && companyRecord?.emailid) {
                    queuePendingChange(company, companyRecord.emailid, {
                        entityType: 'table',
                        op: 'update',
                        clientId: updatedTable.i_d,
                        payload: updatedTable,
                    });
                }
            }

            // 2) Update Order locally (no direct Orders.updateOneDoc now)
            if (itemsToDeplete.length) {
                const updatedOrder = {
                    ...currentOrder,
                    ...deliveryDataUpdate,
                };

                if (company && companyRecord?.emailid) {
                    await putOrder(company, companyRecord.emailid, updatedOrder);
                }

                setCurrentOrder(updatedOrder);
                setPosCurrentOrder(updatedOrder);
                setTableOrders((tableOrders) =>
                    tableOrders.map((o) =>
                        o.orderNumber === updatedOrder.orderNumber
                            ? updatedOrder
                            : o
                    )
                );
                setAllSessionOrders((allSessionOrders) =>
                    allSessionOrders.map((o) =>
                        o.orderNumber === updatedOrder.orderNumber
                            ? updatedOrder
                            : o
                    )
                );
                setAllOrders((allOrders) =>
                    allOrders.map((o) =>
                        o.orderNumber === updatedOrder.orderNumber
                            ? updatedOrder
                            : o
                    )
                );

                // Queue order update
                if (company && companyRecord?.emailid) {
                    queuePendingChange(company, companyRecord.emailid, {
                        entityType: 'order',
                        op: 'update',
                        clientId: currentOrder.orderNumber,
                        payload: {
                            orderNumber: currentOrder.orderNumber,
                            ...deliveryDataUpdate,
                        },
                    });
                    // Immediate sync attempt – failures are fine, queue remains
                    try {
                        // 3) Kick off local inventory update + queue
                        setTimeout(() => {
                            updateInventory('deplete', itemsToDeplete, deliveryDataUpdate);
                        }, 500);
                        await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);                        
                    } catch (e) {
                        // Leave pending changes in queue; 5‑minute auto-sync will retry
                    }
                }

                
            } else {
                setAlertState('error');
                setAlert('Nothing to Post Here!');
                setAlertTimeout(2000);            
                setPlacingOrder(false)
            }            
        } catch (e) {
            setAlertState('error');
            setAlert('Error processing delivery locally');
            setAlertTimeout(2000);            
            setPlacingOrder(false)
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
        if (companyRecord.status === 'admin' || companyRecord.permissions.includes('access_pos_deliveries')){
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

    const handleEndSession = async (salesShortages) => {
        if (sessionUser !== null) {            
            if (allSessionOrders.length){
                const allUserOrders = allSessionOrders.filter((order) =>{
                    return ((order.sessionId === (sessionUser.curSession).i_d) && (order.handlerId === (sessionUser.profile).emailid))
                })
                setLoading(true);
                await stopSession(sessionUser.curSession, salesShortages);
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
        var posDeliveryAccess = []
        if (sessionUser!==null){
            const userDeliveryWrhAccess = { 
                ['open bar1']: ((sessionUser.profile).permissions.includes('delivery_open bar1') || (sessionUser.profile).permissions.includes('all')),
                ['open bar2']: ((sessionUser.profile).permissions.includes('delivery_open bar2') || (sessionUser.profile).permissions.includes('all')),
                ['vip']: ((sessionUser.profile).permissions.includes('delivery_vip') || (sessionUser.profile).permissions.includes('all')),
                ['kitchen']: ((sessionUser.profile).permissions.includes('delivery_kitchen') || (sessionUser.profile).permissions.includes('all')),
            }
            Object.keys(userDeliveryWrhAccess).forEach((wrh)=>{
                if (userDeliveryWrhAccess[wrh]){
                    posDeliveryAccess.push(wrh)
                }
            })
        }else{
            // wrhs.forEach((wrh)=>{
            //     if (deliveryWrhAccess[wrh.name] && !wrh.purchase){
            //         posDeliveryAccess.push(wrh.name)
            //     }
            // })
        }

        var salesShortages = 0     
        allSessionOrders.forEach((order) =>{
            if (sessionUser!==null && sessionUser?.curSession){
                if (getSessionEnd(order.createdAt) === getSessionEnd((sessionUser.curSession).start)
                    && order.status !== 'cancelled' && order.delivery !== 'completed'
                ){                    
                    order.items.forEach((item)=>{
                        posDeliveryAccess.forEach((posWrh)=>{
                            if (item.delivery !== 'completed' && (order.wrh === posWrh ||  posWrh === 'kitchen') && wrhCategories[posWrh].includes(item.category)){
                                salesShortages += (Number(item.quantity) - Number(item.deliveredQuantity || 0)) * (order.wrh === 'vip' ? Number(item.vipPrice || item.salesPrice) : Number(item.salesPrice))
                            }
                        })
                    })
                }
                return ((order.sessionId === (sessionUser.curSession).i_d) && (order.handlerId === (sessionUser.profile).emailid))
            }
            
            // else{
            //     if (getSessionEnd(new Date(order.createdAt).getTime()) === getSessionEnd(curSession.start)
            //         && order.delivery !== 'completed'
            //     ){                    
            //         order.items.forEach((item)=>{
            //             posDeliveryAccess.forEach((posWrh)=>{
            //                 if (item.delivery !== 'completed' && wrhCategories[posWrh].includes(item.category)){
            //                     salesShortages += (Number(item.quantity) - Number(item.deliveredQuantity || 0)) * (order.wrh === 'vip' ? Number(item.vipPrice || item.salesPrice) : Number(item.salesPrice))
            //                 }
            //             })
            //         })
            //     }
            // }
        })        

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
                                {(companyRecord.status === 'admin' || companyRecord.permissions?.includes('access_pos_deliveries')) && 
                                    <button 
                                        onClick={() => {
                                            setStartSession(false)
                                            setSessionUser(null)
                                        }}
                                    >×</button>
                                }
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
                                            deliveryWrhAccess[warehouse.name] && <option key={index} value={warehouse.name}>
                                                {warehouse.name}
                                            </option>                                        
                                    )):
                                    posDeliveryAccess.map((warehouse, index) => (
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
                                <label>Total Product Shortages</label>                                
                                <input 
                                    style={{cursor:'not-allowed'}}
                                    type="number" 
                                    value={salesShortages} 
                                    disabled={true}
                                    readOnly
                                />
                            </div>
                            <div className="session-actions">
                                <button 
                                    className="session-btn end" 
                                    onClick={()=>{
                                        handleEndSession(salesShortages)
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
                        (item.delivery !== 'completed' ) && wrhCategories[wrh].includes(item.category) &&
                        <div 
                            key={item.id} 
                            className="selected-item" 
                            onClick={()=>{
                                if (selectedProduct?.i_d !== item.i_d){
                                    setSelectedProduct(item)
                                }
                            }}
                        >
                            <span>{`[${item.i_d}] ${item.name}`}</span>
                            <span>{Number(item.orderQuantity || (item.remainingQuantity || item.quantity))}</span>
                            {/* {!curSession.type === 'delivery' && <span>₦{wrh === 'vip' ? ((item.vipPrice || item.salesPrice) * item.quantity) : (item.salesPrice * item.quantity)}</span>} */}
                            {(currentOrder.status === 'new' || currentOrder.delivery === 'pending') && <button 
                                className = "remove-btn"
                                onClick={() => {
                                    if (selectedProduct?.i_d === item.i_d){
                                        handleRemoveItem(item.i_d)
                                    }
                                }}
                            >
                                ×
                            </button>}
                        </div>
                    ))}
                </div>
                {selectedProduct && renderKeypad()}
                {(currentOrder.delivery!=='cancelled' && currentOrder.delivery!=='completed') 
                && <button 
                    className="place-order-btn"
                    onClick={() => {
                        var totalItems = 0
                        var deliveredQuantity = 0
                        const deliveredItems = currentOrder.items.filter((item)=>{
                            if (wrhCategories[wrh].includes(item.category)){
                                totalItems += Number(item.quantity)
                                deliveredQuantity += Number(item?.deliveredQuantity || 0)
                                return Number(item?.deliveredQuantity || 0) > 0
                            }
                        })
                        if (deliveredQuantity < totalItems){
                            handleOrderDelivery()
                        }else{
                            setAlertState('error')
                            setAlert('Nothing to Post. You Have Completed Your Delivery!')
                            setAlertTimeout(3000)
                        }
                    }}
                    disabled={currentOrder?.items.length === 0 || placingOrder || ((companyRecord?.status !== 'admin' && !companyRecord?.permissions.includes('access_pos_sessions')) && (curSession.wrh !== wrh ))|| !curSession.active || currentOrder.status === 'cancelled'}
                >
                    Place Delivery (#{currentOrder.orderNumber})
                </button>}
            </div>
            <div className="products-panel">
               
                <div className="orders-grid">
                    <OrdersModal 
                        tableOrders={tableOrders}
                        handleOrderSelect={handleOrderSelect}
                        tables={tables}
                        wrh={wrh}
                        wrhCategories={wrhCategories}
                        currentOrder={currentOrder}
                        setCurrentOrder={setCurrentOrder}
                        curSession={curSession}
                        employees = {employees}
                        updateInventory={updateInventory}
                        cancelling={cancelling}
                        setCancelling={setCancelling}
                    />
                </div>
            </div>
        </div>
    );

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

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
                                    if (!wh.purchase && (curSession?.wrh === wh.name || companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_sessions'))){
                                        return (deliveryWrhAccess[wh.name] && <div key={id} className={'slprwh ' + (wrh === wh.name ? 'slprwh-clicked' : '')} name={wh.name}>{wh.name}</div>)
                                    }
                                })                        
                            }
                             
                            {
                                <div className={'live-nav'}>
                                    {<button 
                                        className="action-btn"
                                        onClick={handleSyncOfflineDelivery}
                                    >
                                        Sync()
                                    </button>}
                                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_deliveries')) && <button 
                                        className="action-btn"
                                        onClick={() => setViewSessions(true)}
                                    >
                                        All Sessions
                                    </button>}
                                    <span className={isLive ? (sessionEnded ? "session-ended" : "live-state") : "error-state"}>{isLive ? (sessionEnded ? 'Session Ended' : 'Live Session') : liveErrorMessages}</span>
                                </div>
                            }
                            
                           
                        </div>
                        <div className="pos-time-display">
                            <div>Session: {new Date(curSession?.start).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <p></p>
                            <div>Date: {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <div className="time">{formatTime(currentTime)}</div>
                            <div style={{fontWeight: 'bold'}}>User: {companyRecord?.access === 'admin' ? 'Super Admin' : getEmployeeName(companyRecord?.emailid)}</div>
                        </div>
                        <div className="pos-tables-layout">
                            {/* <div 
                                className="add-table-box"
                                onClick={handleAddTableClick}
                            >
                                <div className="plus-icon">+</div>
                                <div className="add-text">Add Table</div>
                            </div> */}
                            {[...orderTables]
                                .sort((a, b) => {
                                    const numA = parseInt(a.name.replace(/[^0-9]/g, ''));
                                    const numB = parseInt(b.name.replace(/[^0-9]/g, ''));
                                    return numA - numB;
                                })
                                .map(table => (
                                    <div 
                                        key={table.i_d}
                                        className={`pos-table1 tables-${table.status}`}
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
            <DeliveryDashboard
                setViewSessions={setViewSessions}
                setStartSession={setStartSession}
                setEndSession={setEndSession}
                curSession={curSession}
                sessions={sessions}
                allDeliverySessions={allDeliverySessions}
                setAllDeliverySessions={setAllDeliverySessions}
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
                deliveryWrhAccess={deliveryWrhAccess}
                allSessionOrders={allSessionOrders}
                getPosOrders={getPosOrders}
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
                                name="prevTable" 
                                className='action-btn'
                                onClick={switchTable}
                            >
                                {'<'}
                            </button>
                            <span style={{margin:"auto"}}>{'.'}</span>
                            <button 
                                name="nextTable" 
                                className='action-btn'
                                onClick={switchTable}
                            >
                                {'>'}
                            </button>
                            <button 
                                className="action-btn"
                                // disabled={makingPayment}
                                onClick={() => {
                                    fetchSessions(company, "delivery", companyRecord)
                                    fetchAllSessions({company})
                                    fetchTables(company)
                                    if (products.length){
                                        getProductsWithStock(company, products)
                                    }
                                    setTableOrders([])
                                    setActiveScreen('home')
                                    setCurrentTable(null)
                                    setCurrentOrder(null)
                                    setPlacingOrder(false)
                                    setMakingPayment(false)
                                    setDeliveryCompleted(false)
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
            </div>
            }
        </div>
    );
};

export default Delivery;

const OrdersModal = ({ tableOrders, wrh, wrhCategories, handleOrderSelect,
    tables, currentOrder, setCurrentOrder, curSession, employees,
    updateInventory, cancelling, setCancelling
}) => {
    const {
        companyRecord,
        fetchServer,
        setAlert,
        setAlertState,
        setAlertTimeout,
        server,
        company,
    } = useContext(ContextProvider);
    const [pendingDeliveries, setPendingDeliveries] = useState([])
    useEffect(()=>{
        setPendingDeliveries(tableOrders.filter((tableOrder)=>{
            return tableOrder.delivery === 'pending'
        }))
    },[tableOrders])
    const handleCancelDelivery = async (order) => {
        const cancelOrder = window.confirm(
            `Are you sure you want to Cancel Order Delivery #${order.orderNumber}?`
        );
        if (!cancelOrder) return;

        setCancelling(true);
        setAlertState('info');
        setAlert('Cancelling Delivery...');
        setAlertTimeout(5000);

        let orderItemsQuantity = 0;
        let deliveredItemsQuantity = 0;

        const deliveredItems = currentOrder.items.filter((item) => {
            orderItemsQuantity += Number(item.quantity);
            if (wrhCategories[wrh].includes(item.category)) {
                deliveredItemsQuantity += Number(item.deliveredQuantity || 0);
                return Number(item.deliveredQuantity || 0) > 0;
            }
            return false;
        });

        const itemsToCancel = structuredClone({ deliveredItems });

        try {
            // 1) If everything was delivered, reset table delivery status locally
            if (orderItemsQuantity === deliveredItemsQuantity) {
                const prevTable = tables.find(
                    (table) => table['wrh'] === currentOrder.wrh
                );
                if (prevTable) {
                    const activeTablesUpdate = [
                        ...(prevTable.activeTables || []).filter((table) => {
                            return !(
                                table.tableId === currentOrder.tableId &&
                                table.sessionId === currentOrder.sessionId &&
                                table.orderNumber === currentOrder.orderNumber
                            );
                        }),
                        {
                            ...(prevTable.activeTables || []).find((table) => {
                                return (
                                    table.tableId === currentOrder.tableId &&
                                    table.sessionId === currentOrder.sessionId &&
                                    table.orderNumber === currentOrder.orderNumber
                                );
                            }),
                            delivery: 'pending',
                        },
                    ];

                    const updatedTable = {
                        ...prevTable,
                        activeTables: activeTablesUpdate,
                    };

                    if (company && companyRecord?.emailid) {
                        await putTable(
                            company,
                            companyRecord.emailid,
                            updatedTable
                        );
                    }

                    if (company && companyRecord?.emailid) {
                        queuePendingChange(company, companyRecord.emailid, {
                            entityType: 'table',
                            op: 'update',
                            clientId: updatedTable.i_d,
                            payload: updatedTable,
                        });
                    }
                }
            }

            // 2) Build order deliveryUpdate locally
            const deliveryUpdate = {
                delivery: 'pending',
                cancelDetails: [
                    ...(currentOrder?.cancelDetails || []),
                    {
                        items: itemsToCancel.deliveredItems,
                        deliveryCancelledBy: companyRecord.emailid,
                        deliveryCancelledAt: new Date().getTime(),
                        cancellingSession: curSession.i_d,
                    },
                ],
                lastCancelledAt: new Date().getTime(),
            };

            const itemUpdate = currentOrder.items.map((item) => {
                const deliveredItem = [...deliveredItems].find(
                    (itm) => itm.i_d === item.i_d
                );
                if (deliveredItem) {
                    deliveredItem.delivery = null;
                    deliveredItem.deliveredQuantity = null;
                    deliveredItem.remainingQuantity = null;
                    return deliveredItem;
                }
                return item;
            });

            deliveryUpdate.items = itemUpdate;

            const updatedOrder = {
                ...currentOrder,
                ...deliveryUpdate,
            };

            // 3) Update Orders locally (IndexedDB + React state)
            if (company && companyRecord?.emailid) {
                await putOrder(company, companyRecord.emailid, updatedOrder);
            }

            setCurrentOrder(updatedOrder);

            // 4) Queue order update for sync
            if (company && companyRecord?.emailid) {
                setAlertTimeout(20);
                queuePendingChange(company, companyRecord.emailid, {
                    entityType: 'order',
                    op: 'update',
                    clientId: order.orderNumber,
                    payload: {
                        orderNumber: order.orderNumber,
                        ...deliveryUpdate,
                    },
                });
                // Immediate sync attempt – failures are fine, queue remains
                try {
                    await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                    setAlertTimeout(2000);
                    setAlert('Order cancelled successfully');
                    setAlertState('success');
                } catch (e) {
                    // Leave pending changes in queue; 5‑minute auto-sync will retry
                }
            }

            // 5) Local success + inventory rollback (already offline-first)
            setAlertState('info');
            setAlert('Delivery Cancelled!');
            setTimeout(() => {
                updateInventory(
                    'cancel',
                    itemsToCancel.deliveredItems,
                    deliveryUpdate
                );
            }, 1000);

            setCancelling(false);
            return;
        } catch (e) {
            setAlertState('error');
            setAlert('Error cancelling delivery locally');
            setAlertTimeout(3000);
            setCancelling(false);
            return;
        }
    };

    return (
        <div>
            <div className="modal-header">
                <h3>{`All Orders (${pendingDeliveries.length} Pending)`}</h3>
            </div>
            <div className="orders-list">
                {tableOrders?.map((order) => {
                    let totalItems = 0;
                    let deliveredQuantity = 0;
                    const deliveredItems = order.items.filter((item) => {
                        if (wrhCategories[wrh].includes(item.category)) {
                            totalItems += Number(item.quantity);
                            deliveredQuantity += Number(
                                item.deliveredQuantity || 0
                            );
                            return Number(item.deliveredQuantity || 0) > 0;
                        }
                        return false;
                    });
                    return (
                        <div
                            key={order.i_d}
                            className={`order-card ${
                                order.status === 'cancelled'
                                    ? order.status
                                    : order.delivery
                            } ${
                                order.orderNumber === currentOrder.orderNumber
                                    ? 'selected-delivery'
                                    : ''
                            }`}
                        >
                            <div
                                onClick={() => {
                                    handleOrderSelect(order);
                                }}
                            >
                                <div>Order: #{order.orderNumber}</div>
                                <div>{`Placed Delivery (${deliveredQuantity}/${totalItems}): `}{`${order.delivery}`}</div>
                                <div>Payment: {order.status}</div>
                                <div>Table: {order.tableId}</div>
                                <div>
                                    Placed By:{' '}
                                    {employees.find(
                                        (emp) => emp.i_d === order.handlerId
                                    )?.firstName || 'Admin'}
                                </div>
                                <div>
                                    {new Date(order.createdAt).toLocaleString()}
                                </div>
                            </div>
                            {(companyRecord?.status === 'admin' ||
                                companyRecord?.permissions.includes(
                                    'cancel_delivery_order'
                                )) &&
                                deliveredQuantity > 0 &&
                                !['completed'].includes(order.status) &&
                                curSession.active && (
                                    <button
                                        disabled={cancelling}
                                        style={{
                                            padding: '5px',
                                            borderRadius: '5px',
                                        }}
                                        className="cancel-order-btn cancel-delivery-btn"
                                        onClick={() => handleCancelDelivery(order)}
                                        title="Cancel Delivery"
                                    >
                                        Cancel Delivery
                                    </button>
                                )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const DeliveryDashboard = ({
    sessions, allDeliverySessions, setAllDeliverySessions, profiles, employees, companyRecord, 
    isLive, liveErrorMessages, sessionEnded, setEndSession, setStartSession,
    setViewSessions, deliveryWrhAccess, allSessions, setAllSessions, setAllSessionOrders, setSessionUser, getSessionEnd, 
    setWrh, allSessionOrders, getPosOrders, getSessionSales, curSession,
    setAlertState, setAlert, setAlertTimeout, tables
})=>{
     const {fetchServer, server, company} = useContext(ContextProvider)
     const [pendingSessions, setPendingSessions] = useState([])
     const [showReports, setShowReports] = useState(false);
    useEffect(()=>{
        var pendingSessions = allDeliverySessions?.filter((session)=>{
            return (session.employee_id !== 'theplantainplanet22@gmail.com' && 
                session.active && (getSessionEnd(new Date().getTime()) > getSessionEnd(session.start))
            )
        })
        setPendingSessions(pendingSessions)        
    },[allDeliverySessions])

    useEffect(()=>{        
        const getSessionsData = async ()=>{            
            getPosOrders({company})
            const sessionsResponse = await fetchServer("POST", {
                database: company,
                collection: "POSSessions",
                prop: {type: 'delivery'}
            }, "getDocsDetails", server); 
            if(!sessionsResponse.err){
                setAllDeliverySessions(sessionsResponse.record)
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
                        {/* {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_deliveries')) && <button 
                            className="action-btn"
                            onClick={() => setShowReports(true)}
                            style={{ marginRight: '10px' }}
                        >
                            View Reports
                        </button>} */}
                        {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_deliveries')) && <button 
                            className="action-btn"
                            onClick={() => {    
                                
                                  
                                var wrhAccess = Object.keys(deliveryWrhAccess).filter((wrh)=>{
                                    return deliveryWrhAccess[wrh]
                                })
                                setWrh(wrhAccess[0])
                                setViewSessions(false)                                
                            }}
                        >
                            POS Tables
                        </button>}
                        <span 
                            className={isLive ? (sessionEnded ? "session-ended" : "live-state") : "error-state"}>
                            {isLive ? (sessionEnded ? 'Session Ended' : 'Live Session') : liveErrorMessages}
                        </span>                        
                    </div>
                </div>
                <div className='pos-sessions-view'>
                    <div className='pos-sessions-list'>                        
                        {profiles?.map((profile)=>{
                            if (profile.status !== 'admin' || companyRecord.status === 'admin'){
                                var hasPosDeliveryAccess = false
                                const userDeliveryWrhAccess = { 
                                    ['open bar1']: (profile.permissions.includes('delivery_open bar1') || profile.permissions.includes('all')),
                                    ['open bar2']: (profile.permissions.includes('delivery_open bar2') || profile.permissions.includes('all')),
                                    ['vip']: (profile.permissions.includes('delivery_vip') || profile.permissions.includes('all')),
                                    ['kitchen']: (profile.permissions.includes('delivery_kitchen') || profile.permissions.includes('all')),
                                }
                                Object.keys(userDeliveryWrhAccess).forEach((wrh)=>{
                                    if (userDeliveryWrhAccess[wrh]){
                                        hasPosDeliveryAccess = true
                                        return
                                    }
                                })
                                if((profile.permissions.includes('delivery') && hasPosDeliveryAccess) || profile.permissions.includes('all')){                                
                                    const {firstName, lastName} = ((profile.status === 'admin' && profile.access === 'admin')? {
                                        firstName: 'Admin', lastName: ''
                                    } : employees.find(employee => {return employee.i_d === profile.emailid}))
                                    
                                    const employeeSessions = allDeliverySessions.filter(session => {
                                        return (
                                            session.employee_id === profile.emailid                                        
                                        )
                                    }).sort((a, b) => a.start - b.start)
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
                                            <span className='pos-sessions-card-name'>{`${firstName} ${lastName} ${employeeSession? `(${employeeSession.wrh})` : ''}`}</span>
                                            <span className='pos-sessions-card-time'>{([null, undefined].includes(employeeSession)) ? 'No Sessions' : (sessionLive ? `Started: ${new Date(employeeSession.start).toLocaleString()}` : (employeeSession.end ? `Ended: ${new Date(employeeSession.end).toLocaleString()}` : `Started: ${new Date(employeeSession.start).toLocaleString()}`))}</span>
                                            <div>
                                                <h4 className='pos-sessions-card-status'>{([null, undefined].includes(employeeSession)) ? 'No Sessions' : (sessionLive ? 'Session Live' : 'Session Ended')}</h4>
                                                <div 
                                                    className='pos-sessions-card-action'
                                                    onClick={()=>{   
                                                        if (profile.status !== 'admin' || companyRecord?.status === 'admin'){
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
                {showReports && (
                    <TransactionReports
                        type="delivery"
                        sessions={allDeliverySessions}
                        orders={allSessionOrders}
                        tables={tables}
                        employees={employees}
                        onClose={() => setShowReports(false)}
                    />
                )}
            </div>
        </>
    )
}