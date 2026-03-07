import React, { useState, useEffect, useContext, useRef } from 'react';
import ContextProvider from '../../Resources/ContextProvider';
import './PointOfSales.css';
import { MdShoppingBasket } from 'react-icons/md';
import TransactionReports from '../Shared/TransactionReports/TransactionReports';
import Notify from '../../Resources/Notify/Notify';
import {
    loadPosSnapshot,
    savePosSnapshot,
    queuePendingChange,
    loadPendingChanges,
    loadAllOrders,
    loadAllTables,
    loadAllSessionsLocal,
    putOrder,
    putTable,
    putSession,
    putInventoryTransactions,
} from '../../Resources/offlineDb';
import { syncPendingChanges, processChange } from '../../Resources/offlineSync';

const PointOfSales = () => {
    // =========================================
    // 1. Context and State Management
    // =========================================
    const {
        storePath, intervalPeriod, posSettings, paymentMethods,
        fetchServer, server, company, companyRecord,
        setAlert, setAlertState, setAlertTimeout, setActionMessage,
        alert, alertState, alertTimeout, actionMessage,
        settings, getDate, posWrhAccess, employees,
        profiles, fetchProfiles, getSessionEnd,
        products, getProducts, setProducts, getEmployeeName,
        fetchSessions, fetchAllSessions, sessions, setSessions, posOrders,
        isLive, setIsLive, liveErrorMessages, setLiveErrorMessages,
        allSessions, setAllSessions, tables, setTables, fetchTables,
        salesSessions, allSalesSessions, setSalesSessions, setAllSalesSessions,
        paymentReceipts, getPosOrders, getAllSessions, mergeAndPersistOrders, mergeAndPersistSessions
    } = useContext(ContextProvider);

    // Core States

    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const refreshPOSData = async () => {
        const cmp_val = window.localStorage.getItem('sessn-cmp')
        if (!cmp_val) return;
        try {
            await Promise.all([
                fetchTables(cmp_val),
            ]);
        } catch (e) { }
    }

    const refreshPOSData2 = async () => {
        const cmp_val = window.localStorage.getItem('sessn-cmp')
        if (!cmp_val) return;
        try {
            await Promise.all([
                getPosOrders({ company, companyRecord }),
            ]);
        } catch (e) { }
    }
    const [curPosSettings, setCurPosSettings] = useState({});
    const [activeScreen, setActiveScreen] = useState('home');
    const [orderTables, setOrderTables] = useState([]);
    const [currentTable, setCurrentTable] = useState(null)
    const [deliverySessions, setDeliverySessions] = useState([])
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
    const [hasPosAgentPermissions, setHasPosAgentPermissions] = useState(false)
    const [curPosHandler, setCurPosHandler] = useState('')
    useEffect(() => {
        storePath('pos')
    }, [storePath])

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
    const [postCount, setPostCount] = useState(0);
    const [cancelling, setCancelling] = useState(false);
    const [deliveryCompleted, setDeliveryCompleted] = useState(false);

    // Product States
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [activeCategory, setActiveCategory] = useState(null);
    const [activeChar, setActiveChar] = useState(null);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [quantity, setQuantity] = useState('');
    const [productSearch, setProductSearch] = useState('')

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
    const paymentDetailClone = structuredClone({ paymentDetail })
    const [payPoints, setPayPoints] = useState(paymentMethods.reduce((acc, method) => {
        acc[method.name] = { ...paymentDetailClone.paymentDetail };
        return acc;
    }, {}));
    const defaultPaymentDetails = { ...structuredClone({ payPoints }).payPoints }
    const [paymentDetails, setPaymentDetails] = useState(defaultPaymentDetails);

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



    // useEffect(() => {
    //     if (!company || !companyRecord?.emailid) return;

    //     let cancelled = false;
    //     (async () => {
    //         const snap = await loadPosSnapshot(company, companyRecord.emailid);
    //         if (!snap || cancelled) return;

    //         try {
    //             const {
    //                 salesSessions: snapSessions,
    //                 allSessions: snapAllSessions,
    //                 tables: snapTables,
    //                 allSessionOrders: snapAllSessionOrders,
    //                 allOrders: snapAllOrders,
    //                 products: snapProducts,
    //                 curSession: snapCurSession,
    //                 orderTables: snapOrderTables,                    
    //             } = snap;

    //             // if (Array.isArray(snapSessions)) {
    //             //     setSalesSessions(snapSessions);
    //             // }

    //             // if (Array.isArray(snapAllSessions)) {
    //             //     setAllSalesSessions(snapAllSessions);
    //             // }
    //             // if (Array.isArray(snapTables)) {
    //             //     setTables(snapTables);
    //             // }
    //             // if (Array.isArray(snapAllSessionOrders)) {
    //             //     setAllSessionOrders(snapAllSessionOrders);
    //             // }
    //             // if (Array.isArray(snapAllOrders)) {
    //             //     setAllOrders(snapAllOrders);
    //             // }
    //             // if (Array.isArray(snapProducts) && !products.length) {
    //             //     setProducts(snapProducts);
    //             // }
    //             // if (snapCurSession) {
    //             //     setCurrSession(snapCurSession);
    //             // }
    //             // if (Array.isArray(snapOrderTables) && !orderTables.length) {
    //             //     setOrderTables(snapOrderTables);
    //             // }

    //             // Also mirror snapshot into entity stores so Offline Debug panel sees data immediately
    //             // Only write records that have the proper keyPath to avoid IndexedDB DataError
    //             // if (company && companyRecord?.emailid) {
    //             //     if (Array.isArray(snapAllSessions)) {
    //             //         for (const s of snapAllSessions) {
    //             //             if (s && s.start != null) {
    //             //                 await putSession(company, companyRecord.emailid, s);
    //             //             }
    //             //         }
    //             //     }
    //             //     if (Array.isArray(snapTables)) {
    //             //         for (const t of snapTables) {
    //             //             if (t && t.i_d != null) {
    //             //                 await putTable(company, companyRecord.emailid, t);
    //             //             }
    //             //         }
    //             //     }
    //             //     if (Array.isArray(snapAllOrders)) {
    //             //         for (const o of snapAllOrders) {
    //             //             if (o && o.orderNumber != null) {
    //             //                 await putOrder(company, companyRecord.emailid, o);
    //             //             }
    //             //         }
    //             //     }
    //             // }
    //         // } catch (e) {
    //         //     // Fail silently; server fetch will still run.
    //         //     console.warn('POS snapshot hydrate failed', e);
    //         // }
    //     })();

    //     return () => {
    //         cancelled = true;
    //     };
    // }, [company, companyRecord?.emailid]);

    // Hydrate orders, sessions, and tables from IndexedDB on mount
    // useEffect(() => {
    //     if (!company || !companyRecord?.emailid) return;

    //     (async () => {
    //         try {
    // const isPosAgent = companyRecord?.status === 'admin' || companyRecord?.permissions.includes('make_pos_agent') || false
    // setHasPosAgentPermissions(isPosAgent)
    //             const [orders, sessionsLocal, tablesLocal] = await Promise.all([
    //                 loadAllOrders(company, companyRecord.emailid),
    //                 loadAllSessionsLocal(company, companyRecord.emailid),
    //                 loadAllTables(company, companyRecord.emailid),
    //             ]);

    //             if (Array.isArray(orders) && orders?.length) {
    //                 setAllSessionOrders(orders);
    //             }

    //             if (Array.isArray(sessionsLocal) && sessionsLocal.length) {
    //                 const localSalesSessions = sessionsLocal.filter(s => s.type === 'sales');
    //                 // setAllSalesSessions(localSalesSessions);
    //                 setAllSessions(localSalesSessions);

    //                 const localCurSalesSessions = localSalesSessions.filter(s => s.employee_id === companyRecord?.emailid)
    //                 setSalesSessions(localCurSalesSessions);                    

    //                 // Immediately derive curSession from locally cached sales sessions
    //                 // UpdateSessionState(localSalesSessions, false);
    //             }

    //             if (Array.isArray(tablesLocal) && tablesLocal.length) {
    //                 setTables(tablesLocal);
    //             }
    //         } catch (e) {
    //             console.warn('POS hydrateFromIndexedDb failed', e);
    //         }
    //     })();
    // }, [company, companyRecord?.emailid]);

    useEffect(() => {
        if (company && companyRecord) {
            const isPosAgent = companyRecord?.status === 'admin' || companyRecord?.permissions.includes('make_pos_agent') || false
            setHasPosAgentPermissions(isPosAgent)
        }
    }, [company, companyRecord])

    useEffect(() => {
        loadTableData()
        if (window.localStorage.getItem('pos-wrh')) {
            setWrh(window.localStorage.getItem('pos-wrh'))
        } else {
            if (curSession) {
                setWrh(curSession.wrh || Object.keys(posWrhAccess)[0])
            }
        }
    }, [curSession, curPosSettings])

    useEffect(() => {
        handleCategoryFilter();
    }, [activeCategory, activeChar, productSearch, products]);


    useEffect(() => {
        if (wrhs.length) {
            setWrhCategories((wrhCategories) => {
                const cat = {}
                wrhs.forEach((wrh) => {
                    if (!wrh.purchase) {
                        cat[wrh.name] = wrh.productCategories
                    }
                })
                return { ...cat }
            })
        }
    }, [wrhs])

    useEffect(() => {
        // console.log(salesSessions)
        if (Array.isArray(salesSessions)) {
            setSessions(salesSessions)
            const syncToIndexDB = async () => {
                try {
                    const pending = await loadPendingChanges(company, companyRecord.emailid);
                    const pendingSessionIds = new Set(pending.filter(c => c.entityType === 'session').map(c => (c.clientId || c.payload?.start)).filter(Boolean));
                    for (const s of salesSessions) {
                        if (s && s.start != null && !pendingSessionIds.has(s.start)) {
                            await putSession(company, companyRecord.emailid, s);
                        }
                    }
                } catch (e) {
                    console.warn('POS: sync sessions to IndexedDB failed', e);
                }
            }
            syncToIndexDB()
        }
    }, [salesSessions])

    // useEffect(()=>{
    //     console.log('all sales sessions',allSalesSessions)
    //     if (Array.isArray(allSalesSessions)){            
    //         const syncToIndexDB = async ()=>{
    //             try {
    //                 const pending = await loadPendingChanges(company, companyRecord.emailid);
    //                 const pendingSessionIds = new Set(pending.filter(c=>c.entityType==='session').map(c=>(c.clientId || c.payload?.start)).filter(Boolean));
    //                 for (const s of allSalesSessions) {
    //                     if (s && s.start != null && !pendingSessionIds.has(s.start)) {
    //                         await putSession(company, companyRecord.emailid, s);
    //                     }
    //                 }
    //             } catch (e) {
    //                 console.warn('POS: sync sessions to IndexedDB failed', e);
    //             }
    //         }
    //         syncToIndexDB()
    //     }
    // },[allSalesSessions])

    useEffect(() => {
        if (tables?.length && sessions !== null && companyRecord?.emailid) {
            if (sessions?.length) {
                UpdateSessionState(sessions, false)
                setIsLive(true)
                setLoadSession(false)
            } else {
                setIsLive(true)
                setLoadSession(false)
                setStartSession(true)
            }
        }
    }, [tables, sessions, companyRecord])

    useEffect(() => {
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        fetchTables(cmp_val)
        // const intervalIds = setInterval(() => { fetchTables(cmp_val) }, 60000)
        const intervalId = setInterval(() => { refreshPOSData(); }, 300000)
        // run once
        // refreshPOSData();
        return () => clearInterval(intervalId);
    }, [window.localStorage.getItem('sessn-cmp')])

    useEffect(() => {
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        // loadInitialData()
        // getPosOrders({company, companyRecord})
        const intervalId = setInterval(() => { refreshPOSData2(); }, intervalPeriod)
        // run once
        // refreshPOSData2();
        return () => clearInterval(intervalId);
    }, [window.localStorage.getItem('sessn-cmp')])

    useEffect(() => {
        if (Array.isArray(posOrders) && companyRecord?.emailid) {
            // console.log(posOrders)
            // console.log(companyRecord.emailid)
            setAllSessionOrders(posOrders);
            // const mergeAndPersist = async () => {
            //     try {
            //         const pending = await loadPendingChanges(company, companyRecord.emailid);
            //         const pendingOrders = pending.filter(c=>c.entityType==='order').map(c=>c.payload).filter(Boolean);
            //         const pendingOrderNums = new Set(pendingOrders.map(o=>o.orderNumber));

            //         const localOrders = await loadAllOrders(company, companyRecord.emailid).catch(()=>[]);
            //         const localMap = {};
            //         for (const l of localOrders) if (l && l.orderNumber) localMap[l.orderNumber] = l;

            //         const serverOrders = posOrders || [];
            //         const map = {};
            //         // start with server
            //         for (const s of serverOrders) if (s && s.orderNumber) map[s.orderNumber] = s;
            //         // override with local stored orders (but not pending creates which are authoritative)
            //         for (const [k,v] of Object.entries(localMap)) {
            //             if (!pendingOrderNums.has(k)) map[k] = map[k] || v;
            //         }
            //         // finally apply pending orders (create/update) to override server
            //         for (const p of pendingOrders) if (p && p.orderNumber) map[p.orderNumber] = p;

            //         const merged = Object.values(map);

            //         // persist server orders to IndexedDB except those that are pending locally
            //         for (const o of serverOrders) {
            //             if (o && o.orderNumber != null && !pendingOrderNums.has(o.orderNumber)) {
            //                 await putOrder(company, companyRecord.emailid, o);
            //             }
            //         }
            //     } catch (e) {
            //         console.warn('POS: mergeAndPersist failed', e);
            //         setAllSessionOrders(posOrders);
            //     }
            // };
            // mergeAndPersist();
        }
    }, [posOrders, companyRecord?.emailid])

    useEffect(() => {
        const curPosSettings = posSettings?.posSettings?.find((setting) => setting.active)
        setCurPosSettings(curPosSettings || {})
        // Fetch products
        getProducts(company)

        loadInitialData()

        // Fetch prpfiles
        fetchProfiles(company)

        fetchAllSessions({ company, companyRecord })

        getPosOrders({ company, companyRecord })
    }, [settings])

    useEffect(() => {
        if (posContainerRef.current) {
            if (loadSession || startSession || endSession) {
                posContainerRef.current.style.overflow = 'hidden'
            } else {
                posContainerRef.current.style.overflow = 'auto'
            }
        }
    }, [posContainerRef, loadSession, startSession, endSession])

    useEffect(() => {
        if (curSession !== null) {            
            const fltOrders = allSessionOrders?.filter((order) => {
                // console.log(order, getSessionEnd(curSession.start))
                if (getSessionEnd(new Date(order.createdAt).getTime()) === getSessionEnd(curSession.start)) {
                    return order
                }
            }) 
            // console.log(allSessionOrders, fltOrders, curSession.start)
            setAllOrders(fltOrders)
        }
    }, [allSessionOrders, curSession])

    useEffect(() => {
        if (tables.length && wrh && curSession && employees.length) {
            const syncToIndexDB = async () => {
                try {
                    const pending = await loadPendingChanges(company, companyRecord.emailid);
                    const pendingTableIds = new Set(pending.filter(c => c.entityType === 'table').map(c => (c.clientId || c.payload?.i_d)).filter(Boolean));
                    for (const t of tables) {
                        if (t && t.i_d != null && !pendingTableIds.has(t.i_d)) {
                            await putTable(company, companyRecord.emailid, t);
                        }
                    }
                } catch (e) {
                    console.warn('POS: sync tables to IndexedDB failed', e);
                }
            }
            syncToIndexDB()
            setOrderTables((orderTables) => {
                const activeOrders = []
                wrhs.forEach((warehouse) => {
                    const prevTable = tables.find((table) => { return table['wrh'] === warehouse.name })
                    prevTable?.activeTables?.forEach((activeOrder) => {
                        if (activeOrder.status === 'pending') {
                            activeOrders.push(activeOrder)
                        }
                    })
                })
                orderTables.forEach((orderTable) => {
                    const myTableOrders = []
                    const otherTableOrders = []
                    var tableUser = null
                    activeOrders.forEach((activeOrder) => {
                        var orderDate = '01/01/1970'
                        if (activeOrder.createdAt) {
                            orderDate = activeOrder.createdAt
                        }
                        if (
                            activeOrder.tableId === orderTable.i_d &&
                            activeOrder.wrh === wrh &&
                            getSessionEnd(new Date(orderDate).getTime()) === getSessionEnd(curSession.start)
                        ) {
                            if (
                                activeOrder.handlerId === (curPosHandler || companyRecord.emailid)
                            ) {
                                tableUser = employees.find(employee => employee.i_d === activeOrder.handlerId)
                                myTableOrders.push(activeOrder)
                            } else {
                                tableUser = employees.find(employee => employee.i_d === activeOrder.handlerId)
                                otherTableOrders.push(activeOrder)
                            }
                        }
                    })
                    if (myTableOrders.length) {
                        orderTable.status = 'available'
                        orderTable.activeOrders = myTableOrders.length
                    } else {
                        if (otherTableOrders.length) {
                            orderTable.status = 'unavailable'
                            orderTable.activeOrders = otherTableOrders.length
                        } else {
                            orderTable.status = 'available'
                            orderTable.activeOrders = 0
                        }
                    }
                    if ([null, undefined].includes(tableUser) && orderTable.activeOrders) {
                        orderTable.tableUser = {
                            firstName: 'Admin',
                            lastName: ''
                        }
                    } else {
                        orderTable.tableUser = tableUser
                    }
                })
                return [...orderTables]
            })
        }
    }, [tables, curSession, wrh, employees, curPosHandler])

    // useEffect(() => {
    //     if (!company || !companyRecord?.emailid) return;

    //     const snapshot = {
    //         salesSessions,
    //         allSessions,
    //         tables,
    //         allSessionOrders,
    //         allOrders,
    //         products,
    //         curSession,
    //         orderTables,
    //         activeScreen,
    //         currentOrder,
    //     };

    //     savePosSnapshot(company, companyRecord.emailid, snapshot);
    // }, [
    //     company,
    //     companyRecord?.emailid,
    //     salesSessions,
    //     allSessions,
    //     allSalesSessions,
    //     tables,
    //     allSessionOrders,
    //     allOrders,
    //     products,
    //     curSession,
    //     orderTables,
    //     activeScreen,
    //     currentOrder,
    // ]);

    const getSessionSales = (orders) => {
        const payPointList = Object.keys(payPoints)
        const allSales = {}
        var totalCashChange = 0
        var totalPendingSales = 0
        var totalCancelledSales = 0
        var totalUnattendedSales = 0
        var totalPendngDeliveries = 0
        payPointList.forEach((payPoint) => {
            allSales[payPoint] = 0
        })
        orders.forEach((order) => {
            if (order.status !== 'cancelled') {
                if (order.status === 'pending') {
                    if (order.delivery === 'completed') {
                        totalPendingSales += Number(order.totalSales || 0)
                    } else {
                        // const deliverySessionsList = order.deliverySessions
                        // if (deliverySessionsList?.length){
                        //     deliverySessionsList.forEach((session)=>{
                        //         var deliverySession = deliverySessions.find((deliverySession)=>{return deliverySession.i_d === session})

                        //     })
                        // }
                        totalUnattendedSales += Number(order.totalSales || 0)
                    }
                } else {
                    if (order.delivery === 'pending') {
                        totalPendngDeliveries += Number(order.totalSales || 0)
                    }
                    payPointList.forEach((payPoint) => {
                        allSales[payPoint] += Number(order[payPoint] || 0)
                    })
                }
                totalCashChange += Number(order.cashChange || 0)
            } else {
                totalCancelledSales += Number(order.totalSales || 0)
            }
        })
        return { allSales, totalPendingSales, totalUnattendedSales, totalPendngDeliveries, totalCancelledSales, totalCashChange }
    }

    const createSession = async (sessionUser) => {
        if (!wrh) {
            setAlertState('info');
            setAlert('Please Select Your Sales Post');
            setAlertTimeout(5000);
            return;
        }

        const newDate = new Date().getTime();
        const newSession = {
            employee_id: ![null, undefined].includes(sessionUser)
                ? sessionUser.profile.emailid
                : companyRecord.emailid,
            i_d: newDate,
            type: 'sales',
            wrh: wrh,
            start: newDate,
            startedBy: companyRecord.emailid,
            end: null,
            active: true,
            openingCash: openingCash,
            debtDue: 0,
        };

        try {
            // 1) Save session locally
            if (company && companyRecord?.emailid) {
                await putSession(company, companyRecord.emailid, newSession);
            }

            // 3) Queue session create for sync
            if (company && companyRecord?.emailid) {
                const change = {
                    entityType: 'session',
                    op: 'create',
                    clientId: newSession.start,
                    payload: newSession,
                }
                if (curPosSettings?.type === 'restaurant'){
                    queuePendingChange(company, companyRecord.emailid, change);
                }else{
                    await processChange(change, company, fetchServer, server);
                }
                
                // Immediate sync attempt – failures are fine, queue remains
                try {
                    // 2) Update React state
                    setAlertState('success');
                    if (![null, undefined].includes(sessionUser)) {
                        setAlert('User Session Started Successfully!');
                    } else {
                        setAlert('Welcome Back!');
                    }
                    setAlertTimeout(500);
                    setCurrSession(newSession);
                    setOpeningCash(0);
                    mergeAndPersistSessions([newSession])
                    if (![null, undefined].includes(sessionUser)) {
                        if (sessionUser.profile.emailid === companyRecord.emailid) {
                            setSessions([...(sessions || []), newSession]);
                        }
                    } else {
                        if (sessions !== null) {
                            setSessions([...(sessions || []), newSession]);
                        }
                    }
                    setSessionUser(null);
                    setStartSession(false);
                    setLoading(false)
                    await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                    fetchAllSessions({ company, companyRecord })
                } catch (e) {
                    // Leave pending changes in queue; 5‑minute auto-sync will retry
                }
            }
            return;
        } catch (e) {
            setAlertState('error');
            setAlert('Could not start session locally. Please try again.');
            setAlertTimeout(3000);
            return;
        }

        // if (curPosSettings?.type === 'shop'){            
        //     const deliveryDate = new Date().getTime()
        //     const newSession = {
        //         employee_id: ![null, undefined].includes(sessionUser)
        //             ? sessionUser.profile.emailid
        //             : companyRecord.emailid,
        //         i_d: deliveryDate,
        //         type: 'delivery',
        //         wrh: wrh,
        //         start: deliveryDate,
        //         startedBy: companyRecord.emailid,
        //         end: null,
        //         active: true,
        //         shortage: 0,
        //     };

        //     try {
        //         // 1) Local write
        //         if (company && companyRecord?.emailid) {
        //             await putSession(company, companyRecord.emailid, newSession);
        //         }            

        //         // 3) Queue for sync
        //         if (company && companyRecord?.emailid) {
        //             queuePendingChange(company, companyRecord.emailid, {
        //                 entityType: 'session',
        //                 op: 'create',
        //                 clientId: newSession.start,
        //                 payload: newSession,
        //             });
        //             // Immediate sync attempt – failures are fine, queue remains
        //             try {
        //                 // 2) State
        //                 setAlertState('success');
        //                 if (![null, undefined].includes(sessionUser)) {
        //                     setAlert('User Delivery Session Started Successfully!');
        //                 }

        //                 setAlertTimeout(500);
        //                 setStartSession(false);
        //                 setOpeningCash(0);
        //                 mergeAndPersistSessions([newSession])
        //                 setSessionUser(null);
        //                 await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
        //                 fetchAllSessions({company, companyRecord})
        //             } catch (e) {
        //                 // Leave pending changes in queue; 5‑minute auto-sync will retry
        //             }
        //         }
        //         return;
        //     } catch (e) {
        //         setAlertState('error');
        //         setAlert('Could not start delivery session locally.');
        //         setAlertTimeout(3000);
        //         return;
        //     }
        // }else{
        //     return
        // }

    };

    const stopSession = async (session, sessionOrders) => {
        const {
            allSales,
            totalPendingSales,
            totalCancelledSales,
            totalCashChange,
        } = getSessionSales(sessionOrders);
        const openingCash = session.openingCash;
        let netBalance = 0;
        let unAccounted = 0;
        let allSalesAmount = 0;
        const salesDifference = {};
        const allCountedSales = {};

        Object.keys(payPoints).forEach((payPoint) => {
            if (payPoint === 'cash') {
                const expectedCash =
                    Number(openingCash) +
                    Number(allSales[payPoint] || 0) -
                    Number(totalCashChange);
                salesDifference[payPoint] =
                    Number(countedSales[payPoint] || 0) - expectedCash;
                allSalesAmount +=
                    Number(allSales[payPoint] || 0) - Number(totalCashChange);
            } else {
                salesDifference[payPoint] =
                    Number(countedSales[payPoint] || 0) -
                    Number(allSales[payPoint] || 0);
                allSalesAmount += Number(allSales[payPoint] || 0);
            }

            allCountedSales[payPoint] = Number(countedSales[payPoint]);

            if (salesDifference[payPoint] < 0) {
                netBalance += Number(salesDifference[payPoint]);
            } else {
                unAccounted += Number(salesDifference[payPoint]);
            }
        });

        netBalance += -1 * Number(totalPendingSales || 0);

        const sessionUpdate = {
            end: new Date().getTime(),
            endedby: companyRecord.emailid,
            active: false,
            orders: sessionOrders,
            ...allCountedSales,
            totalCashChange,
            totalSalesAmount: allSalesAmount,
            totalPendingSales,
            totalCancelledSales,
            debtDue: netBalance < 0 ? Math.abs(netBalance) : 0,
            unAccountedSales: unAccounted,
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

            // 3) Queue session update
            if (company && companyRecord?.emailid) {
                const change = {
                    entityType: 'session',
                    op: 'update',
                    clientId: session.start,
                    payload: closedSession,
                }
                if (curPosSettings?.type === 'restaurant'){
                    queuePendingChange(company, companyRecord.emailid, change);
                }else{
                    await processChange(change, company, fetchServer, server);
                }
                // Immediate sync attempt – failures are fine, queue remains
                try {
                    // 2) State updates
                    setAlertState('success');
                    if (![null, undefined].includes(sessionUser)) {
                        setAlert('User Session Ended Successfully!');
                    } else {
                        setAlert('Session Ended!');
                    }
                    setAlertTimeout(1000);
                    mergeAndPersistSessions([closedSession])
                    setCountedSales({});
                    setEndSession(false);
                    setSessionUser(null);
                    setLoading(false)
                    await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                } catch (e) {
                    // Leave pending changes in queue; 5‑minute auto-sync will retry
                }
            }

            return;
        } catch (e) {
            setAlertState('error');
            setAlert('Could not end session locally. Please try again.');
            setAlertTimeout(3000);
            return;
        }
    };

    const UpdateSessionState = (sessions, loadSession, sId) => {
        if (!loadSession && sessions?.length) {
            const previousSession = sessions.filter((session) => session.active)
            let lastSessionIndex = 0
            if (previousSession.length) {
                lastSessionIndex = previousSession.length - 1
                setCurrSession(previousSession[lastSessionIndex])
                if (new Date().getTime() >= getSessionEnd(previousSession[lastSessionIndex].start)) {
                    // setStartSession(false)
                    setSessionEnded(true)
                } else {
                    if (sessionUser === null) {
                        setStartSession(false)
                        setSessionEnded(false)
                    }
                    // setEndSession(false)
                }
            } else {
                let oldSession = null
                if (sessions.length) {
                    let oldSessions = sessions.sort((a, b) => a.start - b.start)
                    oldSession = oldSessions[sessions.length - 1]
                    setCurrSession(oldSession)
                    setSessionEnded(true)
                    setOpeningCash((Number(oldSession.openingCash || 0) + Number(oldSession.cash || 0) - Number(oldSession.totalCashChange || 0)))
                }
                if (companyRecord.status !== 'admin' && !companyRecord.permissions.includes('access_pos_sessions')) {
                    // console.log('starting session')
                    setStartSession(true)
                }
                // setEndSession(false)
            }
        }
    }

    useEffect(() => {
        UpdateSessionState(sessions, loadSession)
    }, [loadSession, sessions, companyRecord])

    // Helper to derive a product image URL (same pattern as Products/Accommodation)
    const getProductImageUrl = (product) => {
        if (!product) return null;
        if (product.imgId) {
            return `https://drive.google.com/thumbnail?id=${product.imgId}&sz=w600`;
        }
        if (product.downloadLink || product.viewLink) {
            return product.downloadLink || product.viewLink;
        }
        return null;
    };

    // =========================================
    // 3. Data Loading Functions
    // =========================================
    const loadTableData = () => {
        if (curPosSettings?.type === 'restaurant') {
            let orderTables = []
            for (let i = 0; i < (Number(curPosSettings.size || 30)); i++) {
                const orderTable = {}
                orderTable.i_d = i + 1
                orderTable.name = `Table ${i + 1}`
                orderTable.capacity = Number(curPosSettings?.capacity || 10)
                orderTable.status = 'available'
                orderTable.activeOrders = 0
                orderTable.createdAt = Date.now()
                orderTables.push(orderTable)
            }
            setOrderTables(orderTables)
        } else if (curPosSettings?.type === 'shop') {
            let orderTables = []
            for (let i = 0; i < (Number(curPosSettings?.size || 1)); i++) {
                const orderTable = {}
                orderTable.i_d = i + 1
                orderTable.name = `Shop ${i + 1}`
                orderTable.capacity = curPosSettings?.capacity || 1000
                orderTable.status = 'available'
                orderTable.activeOrders = 0
                orderTable.createdAt = Date.now()
                orderTables.push(orderTable)
            }
            setOrderTables(orderTables)
        }
    }

    const loadInitialData = async () => {
        if (!company || !companyRecord?.emailid) return;

        // 1) Load from local IndexedDB first (local-first UX)
        let localOrders = [];
        try {
            localOrders = await loadAllOrders(company, companyRecord.emailid);
            // if (Array.isArray(localOrders) && localOrders.length) {
            //     setAllSessionOrders(localOrders);
            //     if (curSession) {
            //         setAllOrders(localOrders.filter((order) => {
            //             return (getSessionEnd(new Date(order.createdAt).getTime()) === getSessionEnd(curSession.start) && order.handlerId === (curPosHandler || companyRecord.emailid));
            //         }));
            //     }
            // }
        } catch (e) {
            console.warn('POS: loadAllOrders failed', e);
        }
        //abort previous request if it exists
        if (orderControllerRef.current) {
            // orderControllerRef.current.abort();            
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

        const orderDays = 50 * 24 * 60 * 60 * 1000
        const allowedFromDays = Date.now() - orderDays
        const ordersResponse = await fetchServer("POST", {
            database: company,
            collection: "Orders",
            prop: {
                createdAt: { $gte: allowedFromDays }
            }
        }, "getDocsDetails", server, orderController.signal);
        if (ordersResponse.record && Array.isArray(ordersResponse.record)) {
            // console.log('For loadInitialData: Printing Orders createdAt...', ordersResponse.record)
            // ordersResponse.record?.forEach((ord)=>{
            //     console.log(ord?.createdAt)
            // })
            // mergeAndPersistOrders(ordersResponse.record)
            // Merge server results with local pending changes: prefer local pending
            // try {
            //     const pending = await loadPendingChanges(company, companyRecord.emailid);
            //     const pendingOrderNums = new Set(pending.filter(c=>c.entityType==='order').map(c=>(c.clientId || c.payload?.orderNumber)).filter(Boolean));
            //     const serverOrders = ordersResponse.record || [];
            //     const map = {};
            //     // add server orders first
            //     for (const s of serverOrders) {
            //         if (s && s.orderNumber) map[s.orderNumber] = s;
            //     }
            //     // merge local orders (prefer local when pending)
            //     for (const l of localOrders) {
            //         if (l && l.orderNumber) {
            //             if (pendingOrderNums.has(l.orderNumber)) {
            //                 map[l.orderNumber] = l;
            //             } else {
            //                 map[l.orderNumber] = map[l.orderNumber] || l;
            //             }
            //         }
            //     }
            //     const merged = Object.values(map);
            //     setAllSessionOrders(merged);
            // } catch (e) {
            //     // fallback to server data
            //     setAllSessionOrders(ordersResponse.record);
            // }
        }
        if (!ordersResponse.err) {
        }

        if (curSession) {
            if (!ordersResponse.err && !ordersResponse.mess) {
                setIsLive(true)
                if (![null, undefined].includes(ordersResponse.record)) {
                    if (ordersResponse.record?.length && Array.isArray(ordersResponse.record)) {
                        // setAllSessionOrders(ordersResponse.record)                        
                        // write-through to IndexedDB orders store (guard keyPath)
                        // try {
                        //     const pending = await loadPendingChanges(company, companyRecord.emailid);
                        //     const pendingOrderNums = new Set(pending.filter(c=>c.entityType==='order').map(c=>(c.clientId || c.payload?.orderNumber)).filter(Boolean));
                        //     for (const o of ordersResponse.record) {
                        //         if (o && o.orderNumber != null && !pendingOrderNums.has(o.orderNumber)) {
                        //             await putOrder(company, companyRecord.emailid, o);
                        //         }
                        //     }
                        // } catch (e) {
                        //     console.warn('POS: putOrder merge failed', e);
                        // }
                        var ordersUpdate = ordersResponse.record
                        if (currentOrder !== null) {
                            if (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_sessions')) {
                                setTableOrders(ordersUpdate.filter((order) => {
                                    var orderDate = '01/01/1970'
                                    if (order.createdAt) {
                                        orderDate = order.createdAt
                                    }
                                    if (
                                        order.tableId === currentOrder.tableId
                                        && order.wrh === wrh
                                    ) {
                                        // Check if the order is from the current session
                                        return getSessionEnd(new Date(orderDate).getTime()) === getSessionEnd(curSession.start)
                                    }
                                }))
                            } else {
                                const myTableOrders = ordersUpdate.filter(order =>
                                    order.tableId === currentTable.i_d
                                    && order.wrh === wrh &&
                                    getSessionEnd(new Date(order.createdAt).getTime()) === getSessionEnd(curSession.i_d) &&
                                    order.handlerId === (curPosHandler || companyRecord.emailid)
                                )
                                setTableOrders(myTableOrders)
                            }
                        }
                    }
                }
            } else {
                if (ordersResponse.mess !== 'Request aborted') {
                    setIsLive(false)
                    setLiveErrorMessages('Slow Network. Check Connection')
                }
            }
        }

    };

    const handleSettingsUpdate = () => {
        if (settings.length) {
            const uomSetFilt = settings.filter((setting) => {
                return setting.name === 'uom'
            })
            delete uomSetFilt[0]?._id
            setUoms(uomSetFilt[0].name ? [...uomSetFilt[0].mearsures] : [])

            const catSetFilt = settings.filter(setting => setting.name === 'product_categories');
            delete catSetFilt[0]?._id;
            setCategories(catSetFilt[0].name ? [...catSetFilt[0].categories] : []);

            const wrhSetFilt = settings.filter((setting) => {
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
            handlerId: curPosHandler || companyRecord.emailid,
            agent: companyRecord.emailid,
            wrh: wrh,
            sessionId: curSession.i_d,
            tableName: table.name,
            items: [],
            ...payPoints,
            status: 'new',
            createdAt: new Date().getTime()
        };
        setCurrentOrder(newOrder);
    };

    const switchOrder = (e) => {
        let nextIndex
        const { name } = e.target
        
        if (!placingOrder && !makingPayment && name){
            let currentOrderIndex = 0
            const sortedOrders = tableOrders.sort((a, b) => {
                const numA = a.createdAt;
                const numB = b.createdAt;
                return numA - numB;
            })
            sortedOrders.forEach((order, i) => {
                if (order.orderNumber === currentOrder.orderNumber) {
                    currentOrderIndex = i
                }
            })

            nextIndex = currentOrderIndex
            if (name === 'prevTable' && currentOrderIndex > 0){
                nextIndex = currentOrderIndex - 1
            } else if (name === 'nextTable' && currentOrderIndex < sortedOrders.length - 1){
                nextIndex = currentOrderIndex + 1
            }
            setCurrentOrder(sortedOrders[nextIndex])
        }
    }

    const switchTable = (e) => {
        let nextIndex
        const { name } = e.target

        if (!placingOrder && !makingPayment && name) {
            let currentTableIndex = 0
            const sortedOrderTables = orderTables.sort((a, b) => {
                const numA = parseInt(a.name.replace(/[^0-9]/g, ''));
                const numB = parseInt(b.name.replace(/[^0-9]/g, ''));
                return numA - numB;
            })

            sortedOrderTables.forEach((orderTable, i) => {
                if (orderTable.i_d === currentTable.i_d) {
                    currentTableIndex = i
                }
            })

            nextIndex = currentTableIndex
            if (name === 'prevTable' && currentTableIndex > 0) {
                nextIndex = currentTableIndex - 1
            } else if (name === 'nextTable' && currentTableIndex < sortedOrderTables.length - 1) {
                nextIndex = currentTableIndex + 1
            }
            setTableOrders([])
            setCurrentOrder(null)
            setPlacingOrder(false)
            setMakingPayment(false)
            handleTableSelect(sortedOrderTables[nextIndex])
        }
    }

    const handleTableSelect = async (table, status) => {
        if (!loadSession && !startSession && !endSession && table) {
            if (
                table?.status !== 'available' &&
                (companyRecord?.status !== 'admin' &&
                    !companyRecord?.permissions.includes('access_pos_sessions'))
            ) {
                setAlertState('error');
                setAlert(`${table.name} is not available. Still in use by ${table.tableUser.firstName} ${table.tableUser.lastName}!`);
                setAlertTimeout(2000);
                return;
            }

            if (status !== 'auto'){
                setSelectedProduct(null);
                setAlertState('info');
                setAlert(`Loading ${table.name} Orders...`);
                setAlertTimeout(100000)
            }

            // 1) Use locally available orders (mirrored from IndexedDB) as primary           
            const baseOrders =
                Array.isArray(allOrders) && allOrders.length
                    ? allOrders
                    : [];

            let localOrders = [];
            if (Array.isArray(baseOrders)) {
                localOrders = baseOrders.filter((order) => {
                    if (!order) return false;
                    if (order.tableId !== table.i_d) return false;
                    if (order.wrh !== wrh) return false;

                    // Non-admin users: enforce handler + session
                    if (
                        !(
                            companyRecord?.status === 'admin' ||
                            companyRecord?.permissions.includes('access_pos_sessions')
                        )
                    ) {
                        if (order.handlerId !== (curPosHandler || companyRecord.emailid)) return false;
                        if (order.sessionId !== curSession.i_d) return false;

                        return true;
                    }

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
                if (status!== 'auto'){                    
                    if (pendingLocal.length) {
                        setCurrentOrder(pendingLocal[0]);
                        setPosCurrentOrder(pendingLocal[0]);
    
                    } else {
                        createNewOrder(table);
                    }
                }
                if (status !== 'auto'){
                    setActiveScreen('order');
                    setAlertState('info');
                    setAlert('Loaded orders from local cache...');
                    setAlertTimeout(500);
                }
            } else {
                // No local orders; optimistic new order
                // setAlertState('info');
                // setAlert('Loaded orders (no local orders found)...');
                setCurrentTable(table)
                if (status !== 'auto'){
                    createNewOrder(table);
                    setActiveScreen('order');
                    setAlertTimeout(500);
                }
            }

            // 2) Background refresh from server and mirror into IndexedDB
            // setAlertState('info');
            // setAlert(`Refreshing Table ${table.i_d} orders from server...`);
            // setAlertTimeout(100);

            const orderFilter = {
                tableId: table.i_d,
                sessionId: curSession.i_d,
                start: curSession.start,
                wrh: wrh,
                handlerId: (curPosHandler || companyRecord.emailid),
                type: 'sales'
            };

            const response = await getPosOrders({ company, option: 'tableOrders', filter: orderFilter, companyRecord })
            const filteredOrders = response?.record ?? []
            if (!response.err && Array.isArray(filteredOrders)) {
                setIsLive(true)
                // console.log("received allOrders list:", filteredOrders)                
                if (!localOrders.length) {
                    if (filteredOrders.length) {
                        if (table?.i_d === filteredOrders[0]?.tableId) {
                            // setCurrentTable(table);
                            if(curPosSettings?.type === 'shop'){
                                setTableOrders(filteredOrders);
                                const pendingRemote = filteredOrders.filter(
                                    (order) => order.status === 'pending'
                                );
                                if (status !== 'auto'){
                                    if (pendingRemote.length) {
                                        setCurrentOrder(pendingRemote[0]);
                                    } else {
                                        createNewOrder(table);
                                    }
                                    setActiveScreen('order');
                                }
                            }
                            // if (company && companyRecord?.emailid) {
                            //     for (const o of filteredOrders) {
                            //         if (o && o.orderNumber !== null) {
                            //             await putOrder(company, companyRecord.emailid, o);
                            //         }
                            //     }
                            // }
                            // setAlertState('info');
                            // setAlert('Loaded table orders from server...');
                            // setAlertTimeout(500);
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
                setAlert('Slow Network. Could Not Refresh Orders!');
                setAlertTimeout(3000);
            }

            // 3) Optional background refresh of other entities (non-blocking for UI)
            // fetchTables(company);
            // getProducts(company);
            // loadInitialData();
        }
    };

    const handleCreateTable = () => {
        setOrderTables((orderTables) => {
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
    // 5. Order Delivery Management
    // =========================================

    const updateInventory = async (action, items, deliveryDataUpdate, currentOrder, count, status) => {
        if (!count) {
            setAlertState('info');
            setAlert('Updating Inventory...');
            setAlertTimeout(5000);
            setPostCount(0);
        }

        const isDeplete = action === 'deplete';
        const createdAt = new Date().getTime();
        const transactions = [];

        if (!items.length){
            setAlertState('error')
            setAlert('No Items to Deplete Specified! Please Make Sure All Items Belong to a Catgory, then Place Delivery Again.')
            setAlertTimeout(3000)
            return
        }
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
                const change = {
                    entityType: 'inventory',
                    op: 'create',
                    payload: { transactions },
                }
                if (curPosSettings?.type === 'restaurant'){
                    queuePendingChange(company, companyRecord.emailid, change);
                }else{
                    await processChange(change, company, fetchServer, server);
                }
                setAlertState('success');
                setAlert((count || 0) + 1, 'Order(s) Inventory updated successfully');
                setAlertTimeout(1000);
                // Immediate sync attempt – failures are fine, queue remains
                try {
                    // 3) Update local order state with deliveryDataUpdate
                    if (action === 'deplete') {
                        setCurrentOrder((currentOrder) => {
                            return { ...currentOrder, ...deliveryDataUpdate};
                        });
                        // setTableOrders((tableOrders) => {
                        //     const updated = tableOrders.map((tableOrder) =>
                        //         tableOrder.orderNumber === currentOrder.orderNumber
                        //             ? { ...tableOrder, ...deliveryDataUpdate }
                        //             : tableOrder
                        //     );
                        //     return updated;
                        // });
                    } else {
                        setCurrentOrder((currentOrder) => {
                            return { ...currentOrder, ...deliveryDataUpdate, ...(status && {status}) };
                        });
                        // setTableOrders((tableOrders) => {
                        //     const updated = tableOrders.map((tableOrder) =>
                        //         tableOrder.orderNumber === currentOrder.orderNumber
                        //             ? { ...tableOrder, ...deliveryDataUpdate }
                        //             : tableOrder
                        //     );
                        //     return updated;
                        // });
                    }
                    setPlacingOrder(false)
                    // 4) Local success alerts (no dependence on server)
                    if (action === 'deplete') {
                        if (!count) {
                            setAlertState('success');
                            setAlert('Delivery processed successfully');
                            setAlertTimeout(1000);
                        } else if (count === tableOrders.length - 1) {
                            setAlertState('success');
                            setAlert('All Deliveries processed successfully');
                            setAlertTimeout(1000);
                        }
                    } else {
                        setCancelling(false);
                        setAlertState('success');
                        setAlert('Delivery cancelled successfully');
                        setAlertTimeout(1000);
                    }
                    await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                    getProducts(company)
                    refreshPOSData()
                    refreshPOSData2()
                    await loadInitialData();
                    // fetchSessions(company, "delivery", companyRecord)
                    // fetchAllSessions({company})
                    // fetchTables(company)
                    // loadInitialData()
                } catch (e) {
                    // Leave pending changes in queue; 5‑minute auto-sync will retry
                }
            }

        } catch (e) {
            setAlertState('error');
            setAlert('Error updating inventory locally');
            setAlertTimeout(5000);
            setPlacingOrder(false)
            getProducts(company)
            refreshPOSData()
            refreshPOSData2()
        }
    };

    const handleOrderDelivery = async (currentOrder, posCurrentOrder, count) => {
        // fetchSessions(company, "delivery", companyRecord);
        // fetchAllSessions({company})
        // fetchTables(company);
        // if (products.length) {
        //     getProductsWithStock(company, products);
        // }
        if (!count) {
            setAlertState('info');
            setAlert('Processing Delivery...');
            setAlertTimeout(10000);
        }
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
                    item.depletedQuantity = depletedQuantity;
                    itemsToDeplete.push(item);
                }
            }
        });

        const insufficientProducts = [];
        for (const entry of itemsToDeplete) {
            const product = products.find((p) => p.i_d === entry.i_d);
            if (product) {
                // console.log(product, product.locationStock)
                let countBaseQuantity = 0;
                const { cost, quantity } =
                    product.locationStock?.[wrh] || { cost: 0, quantity: 0 };
                countBaseQuantity = Number(quantity || 0);
                // console.log(countBaseQuantity, Number(entry.depletedQuantity))
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
            getProducts(company)
            refreshPOSData()
            refreshPOSData2()
            handleTableSelect(currentTable, 'auto')
            await loadInitialData();
            return;
        } else {
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
                        // item.depletedQuantity = depletedQuantity;
                        // itemsToDeplete.push(item);
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

                        if (Number(previousItemState.remainingQuantity) === 0) {
                            previousItemState.delivery = 'completed';
                        }
                    }
                    deliveredOrderItems.push(previousItemState);
                }
            });
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
                            ...(newActiveTables.filter(
                                (table) =>
                                    !(
                                        table.tableId === currentOrder.tableId &&
                                        table.sessionId === currentOrder.sessionId &&
                                        table.orderNumber === currentOrder.orderNumber
                                    )
                            )),
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
                        const change = {
                            entityType: 'table',
                            op: 'update',
                            clientId: updatedTable.i_d,
                            payload: updatedTable,
                        }
                        if (curPosSettings?.type === 'restaurant'){
                            queuePendingChange(company, companyRecord.emailid, change);
                        }else{
                            try{
                                await processChange(change, company, fetchServer, server);
                            }catch (e) {
                                console.log(e)
                            }
                        }
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
                    // setTableOrders((tableOrders) =>
                    //     tableOrders.map((o) =>
                    //         o.orderNumber === updatedOrder.orderNumber
                    //             ? updatedOrder
                    //             : o
                    //     )
                    // );
                    mergeAndPersistOrders([updatedOrder])
                    // setAllSessionOrders((allSessionOrders) =>
                    //     allSessionOrders.map((o) =>
                    //         o.orderNumber === updatedOrder.orderNumber
                    //             ? updatedOrder
                    //             : o
                    //     )
                    // );
                    // setAllOrders((allOrders) =>
                    //     allOrders.map((o) =>
                    //         o.orderNumber === updatedOrder.orderNumber
                    //             ? updatedOrder
                    //             : o
                    //     )
                    // );

                    // Queue order update
                    if (company && companyRecord?.emailid) {
                        const change = {
                            entityType: 'order',
                            op: 'update',
                            clientId: currentOrder.orderNumber,
                            payload: {
                                orderNumber: currentOrder.orderNumber,
                                ...deliveryDataUpdate,
                            },
                        }
                        if (curPosSettings?.type === 'restaurant'){
                            queuePendingChange(company, companyRecord.emailid, change);
                        }else{
                            await processChange(change, company, fetchServer, server);
                        }
                        // Immediate sync attempt – failures are fine, queue remains
                        try {
                            // 3) Kick off local inventory update + queue
                            setTimeout(() => {
                                updateInventory('deplete', itemsToDeplete, deliveryDataUpdate, currentOrder, 0);
                            }, 500);
                            handleTableSelect(currentTable, 'auto')
                            await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                        } catch (e) {
                            // Leave pending changes in queue; 5‑minute auto-sync will retry
                        }
                    }
                    fetchTables(company)
                } else {
                    setAlertState('error');
                    setAlert('Nothing to Post Here!');
                    setAlertTimeout(2000);
                    setPlacingOrder(false)
                    handleTableSelect(currentTable, 'auto')
                }
            } catch (e) {
                setAlertState('error');
                setAlert('Error processing delivery locally');
                setAlertTimeout(2000);
                setPlacingOrder(false)
                handleTableSelect(currentTable, 'auto')
            }
        }
    };

    const handleCancelDelivery = async (order, status) => {
        // const cancelOrder = window.confirm(
        //     `Are you sure you want to Cancel Order Delivery #${order.orderNumber}?`
        // );
        // if (!cancelOrder) return;

        if (status !== 'edit'){
            setCancelling(true);
            setAlertState('info');
            setAlert('Cancelling Delivery...');
            setAlertTimeout(5000);
        }

        let orderItemsQuantity = 0;
        let deliveredItemsQuantity = 0;

        const deliveredItems = order.items.filter((item) => {
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
                    (table) => table['wrh'] === order.wrh
                );
                if (prevTable) {
                    const activeTablesUpdate = [
                        ...(prevTable.activeTables || []).filter((table) => {
                            return !(
                                table.tableId === order.tableId &&
                                table.sessionId === order.sessionId &&
                                table.orderNumber === order.orderNumber
                            );
                        }),
                        {
                            ...(prevTable.activeTables || []).find((table) => {
                                return (
                                    table.tableId === order.tableId &&
                                    table.sessionId === order.sessionId &&
                                    table.orderNumber === order.orderNumber
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
                        const change = {
                            entityType: 'table',
                            op: 'update',
                            clientId: updatedTable.i_d,
                            payload: updatedTable,
                        }
                        if (curPosSettings?.type === 'restaurant'){
                            queuePendingChange(company, companyRecord.emailid, change);
                        }else{
                            try{                                
                                await processChange(change, company, fetchServer, server);
                            }catch (e) {
                                console.log(e)
                            }
                        }
                    }
                }
            }

            // 2) Build order deliveryUpdate locally
            const deliveryUpdate = {
                delivery: 'pending',
                cancelDetails: [
                    ...(order?.cancelDetails || []),
                    {
                        items: itemsToCancel.deliveredItems,
                        deliveryCancelledBy: companyRecord.emailid,
                        deliveryCancelledAt: new Date().getTime(),
                        cancellingSession: curSession.i_d,
                    },
                ],
                lastCancelledAt: new Date().getTime(),
            };

            const itemUpdate = order.items.map((item) => {
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
                ...order,
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
                const change = {
                    entityType: 'order',
                    op: 'update',
                    clientId: order.orderNumber,
                    payload: {
                        orderNumber: order.orderNumber,
                        ...deliveryUpdate,
                    },
                }
                if (curPosSettings?.type === 'restaurant'){
                    queuePendingChange(company, companyRecord.emailid, change);
                }else{
                    await processChange(change, company, fetchServer, server);
                }
                // Immediate sync attempt – failures are fine, queue remains
                try {
                    await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                    setAlert('Delivery Reversed Successfully');
                    setAlertState('success');
                    setAlertTimeout(1000);
                } catch (e) {
                    // Leave pending changes in queue; 5‑minute auto-sync will retry
                }
            }

            // 5) Local success + inventory rollback (already offline-first)
            setAlertState('info');
            setAlert('Delivery Reversed!');
            setTimeout(() => {
                updateInventory(
                    'cancel',
                    itemsToCancel.deliveredItems,
                    deliveryUpdate,
                    order,
                    0,
                    'edit'
                );
            }, 1000);
            fetchTables(company)
            setCancelling(false);
        } catch (e) {
            setAlertState('error');
            setAlert('Error cancelling delivery locally');
            setAlertTimeout(3000);
            setCancelling(false);
            return;
        }
    };

    // =========================================
    // 5. Order Management
    // =========================================

    const handlePlaceOrder = async () => {
        // fetchSessions(company, "sales", companyRecord)
        // fetchTables(company)
        // getProducts(company)
        loadInitialData();
        setAlertState('info');
        setAlert('Placing Order...');
        setAlertTimeout(5000);
        setPlacingOrder(true);

        // Save the current order to database (locally, offline-first)
        const placedOrder = {
            ...currentOrder,
            status: 'pending',
            placedAt: new Date().getTime(),
            delivery: 'pending',
        };

        try {
            // 1) Write order to local IndexedDB cache
            if (company && companyRecord?.emailid) {
                await putOrder(company, companyRecord.emailid, placedOrder);
            }

            // 2) Update React state for orders
            setCurrentOrder(placedOrder);
            setTableOrders((prev) => [...prev, placedOrder]);
            mergeAndPersistOrders([placedOrder])

            // 3) Update table's activeTables locally (no direct server write)
            const activeOrder = {
                tableId: currentOrder.tableId,
                sessionId: currentOrder.sessionId,
                handlerId: (curPosHandler || companyRecord.emailid),
                agent: companyRecord.emailid,
                status: 'pending',
                delivery: 'pending',
                wrh: wrh,
                orderNumber: currentOrder.orderNumber,
                createdAt: new Date().getTime(),
            };

            const prevTable = tables.find((table) => table['wrh'] === wrh);
            if (prevTable) {
                const updatedTable = {
                    ...prevTable,
                    activeTables: [
                        ...(prevTable?.activeTables || []).filter((t) => {
                            return !(
                                t.tableId === activeOrder.tableId &&
                                t.sessionId === activeOrder.sessionId &&
                                t.handlerId === activeOrder.handlerId &&
                                t.orderNumber === activeOrder.orderNumber
                            );
                        }),
                        { ...activeOrder },
                    ],
                };

                if (company && companyRecord?.emailid) {
                    await putTable(company, companyRecord.emailid, updatedTable);
                }

                setTables((prev) =>
                    prev.map((t) => (t.wrh === wrh ? updatedTable : t))
                );

                // Queue table update for later sync
                if (company && companyRecord?.emailid) {
                    const change = {
                        entityType: 'table',
                        op: 'update',
                        clientId: updatedTable.i_d,
                        payload: updatedTable,
                    }
                    if (curPosSettings?.type === 'restaurant'){
                        queuePendingChange(company, companyRecord.emailid, change);
                    }else{
                        try {
                            await processChange(change, company, fetchServer, server);
                        }catch (e) {
                            console.log(e)
                        }
                    }
                }
            }

            // 4) Enqueue offline change so this order can be synced later
            if (company && companyRecord?.emailid) {
                const change = {
                    entityType: 'order',
                    op: 'create',
                    clientId: placedOrder.orderNumber,
                    payload: placedOrder,
                }
                if (curPosSettings?.type === 'restaurant'){
                    queuePendingChange(company, companyRecord.emailid, change);
                }else{
                    await processChange(change, company, fetchServer, server);
                }
                // Immediate sync attempt – failures are fine, queue remains
                setAlertTimeout(20);
                try {
                    setPlacingOrder(false);
                    setAlert('Order placed successfully');
                    setAlertState('success');
                    setAlertTimeout(1000);
                    // Keep your existing reads (they only fetch, no writes)
                    if (curPosSettings?.type === 'restaurant') {
                        if (curPosSettings?.printKitchenReceipt) {
                            printKitchenOrder(placedOrder);
                        } if (curPosSettings?.printBarReceipt) {
                            printBarOrder(placedOrder)                            
                        } if (curPosSettings?.printCustomerOrder){
                            printCustomerOrder(placedOrder)
                        }
                    }
                    await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                    fetchTables(company)
                    if (curPosSettings?.type === 'shop') {
                        var totalItems = 0
                        var deliveredQuantity = 0
                        const deliveredItems = placedOrder.items.filter((item) => {
                            if (wrhCategories[wrh].includes(item.category)) {
                                totalItems += Number(item.quantity)
                                deliveredQuantity += Number(item?.deliveredQuantity || 0)
                                return Number(item?.deliveredQuantity || 0) > 0
                            }
                        })
                        if (deliveredQuantity < totalItems) {
                            const orderClone = structuredClone({ placedOrder }).placedOrder
                            handleOrderDelivery(placedOrder, orderClone);
                        }
                    }
                    // loadInitialData();                    
                    // fetchSessions(company, 'sales', companyRecord);
                    // fetchAllSessions({company})
                    // fetchTables(company);
                    // getProducts(company);
                } catch (e) {
                    // Leave pending changes in queue; 5‑minute auto-sync will retry
                }
            }

            // 5) Local success feedback


            // View Payment Modal?
            // setShowPaymentModal(true);
        } catch (e) {
            setAlertState('error');
            setAlert('Error editting order locally');
            setAlertTimeout(3000);
            setPlacingOrder(false);
        }
    };

    const handleEditOrder = async () => {
        // fetchSessions(company, "sales", companyRecord)
        // fetchTables(company)
        // getProducts(company)
        loadInitialData();
        setAlertState('info');
        setAlert('Editting Order...');
        setAlertTimeout(5000);
        setPlacingOrder(true);

        // Save the current order to database (locally, offline-first)
        const placedOrder = {
            ...currentOrder,
            status: 'pending',
            editedAt: new Date().getTime(),
            delivery: 'pending',
        };

        try {
            // 1) Write order to local IndexedDB cache
            if (company && companyRecord?.emailid) {
                await putOrder(company, companyRecord.emailid, placedOrder);
            }

            // 2) Update React state for orders
            setCurrentOrder(placedOrder);
            // setTableOrders((prev) => [...prev, placedOrder]);
            mergeAndPersistOrders([placedOrder])

            // 3) Update table's activeTables locally (no direct server write)
            const activeOrder = {
                tableId: currentOrder.tableId,
                sessionId: currentOrder.sessionId,
                handlerId: (curPosHandler || companyRecord.emailid),
                agent: companyRecord.emailid,
                status: 'pending',
                delivery: 'pending',
                wrh: wrh,
                orderNumber: currentOrder.orderNumber,
                editedAt: new Date().getTime(),
            };

            const prevTable = tables.find((table) => table['wrh'] === wrh);
            if (prevTable) {
                const updatedTable = {
                    ...prevTable,
                    activeTables: [
                        ...(prevTable.activeTables || []).filter((t) => {
                            return !(
                                t.tableId === activeOrder.tableId &&
                                t.sessionId === activeOrder.sessionId &&
                                t.handlerId === activeOrder.handlerId &&
                                t.orderNumber === activeOrder.orderNumber
                            );
                        }),
                        { ...activeOrder },
                    ],
                };

                if (company && companyRecord?.emailid) {
                    await putTable(company, companyRecord.emailid, updatedTable);
                }

                setTables((prev) =>
                    prev.map((t) => (t.wrh === wrh ? updatedTable : t))
                );

                // Queue table update for later sync
                if (company && companyRecord?.emailid) {
                    const change = {
                        entityType: 'table',
                        op: 'update',
                        clientId: updatedTable.i_d,
                        payload: updatedTable,
                    }
                    if (curPosSettings?.type === 'restaurant'){
                        queuePendingChange(company, companyRecord.emailid, change);
                    }else{
                        try {
                            await processChange(change, company, fetchServer, server);
                        }catch (e){
                            console.log(e)
                        }
                    }
                }
            }

            // 4) Enqueue offline change so this order can be synced later
            if (company && companyRecord?.emailid) {
                const change = {
                    entityType: 'order',
                    op: 'update',
                    clientId: placedOrder.orderNumber,
                    payload: placedOrder,
                }
                if (curPosSettings?.type === 'restaurant'){
                    queuePendingChange(company, companyRecord.emailid, change);
                }else{
                    await processChange(change, company, fetchServer, server);
                }
                // Immediate sync attempt – failures are fine, queue remains
                setAlertTimeout(20);
                try {
                    setPlacingOrder(false);
                    setAlert('Order editted successfully');
                    setAlertState('success');
                    setAlertTimeout(1000);
                    // Keep your existing reads (they only fetch, no writes)
                    if (curPosSettings?.type === 'restaurant') {
                        if (curPosSettings?.printKitchenReceipt) {
                            printKitchenOrder(placedOrder);
                        } 
                        if (curPosSettings?.printBarReceipt) {
                            printBarOrder(placedOrder)                            
                        } 
                        if (curPosSettings?.printCustomerOrder){
                            printCustomerOrder(placedOrder)
                        }
                    }
                    await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                    fetchTables(company)
                    if (curPosSettings?.type === 'shop') {
                        var totalItems = 0
                        var deliveredQuantity = 0
                        const deliveredItems = placedOrder.items.filter((item) => {
                            if (wrhCategories[wrh].includes(item.category)) {
                                totalItems += Number(item.quantity)
                                deliveredQuantity += Number(item?.deliveredQuantity || 0)
                                return Number(item?.deliveredQuantity || 0) > 0
                            }
                        })
                        if (deliveredQuantity < totalItems) {
                            const orderClone = structuredClone({ placedOrder }).placedOrder
                            handleOrderDelivery(placedOrder, orderClone);
                        }
                    }
                    // loadInitialData();                    
                    // fetchSessions(company, 'sales', companyRecord);
                    // fetchAllSessions({company})
                    // fetchTables(company);
                    // getProducts(company);
                } catch (e) {
                    // Leave pending changes in queue; 5‑minute auto-sync will retry
                }
            }

            // 5) Local success feedback


            // View Payment Modal?
            // setShowPaymentModal(true);
        } catch (e) {
            setAlertState('error');
            setAlert('Error editting order locally');
            setAlertTimeout(3000);
            setPlacingOrder(false);
        }
    };


    // Update the handleAddItem function to separate selection from adding
    const handleAddItem = (product, quantity = 1) => {
        if (!product) return;
        const productClone = structuredClone({ product });
        const productCopy = productClone.product
        wrhs.forEach((warehouse) => {
            var wrh = warehouse.name
            delete productCopy[wrh]
        })
        const existingItem = currentOrder.items.find(item => item.i_d === product.i_d);
        let updatedItems;

        if (existingItem) {
            updatedItems = currentOrder.items.map((item) => {
                const itemClone = structuredClone({ item })
                const itemCopy = itemClone.item
                wrhs.forEach((warehouse) => {
                    var wrh = warehouse.name
                    delete itemCopy[wrh]
                })
                return (
                    itemCopy.i_d === product.i_d
                        ? { ...itemCopy, quantity: quantity ? itemCopy.quantity + quantity : itemCopy.quantity + 1 }
                        : itemCopy
                )
            });
        } else {
            updatedItems = [...currentOrder.items, {
                ...productCopy,
                i_d: product.i_d,
                quantity: quantity || 1,
                orderNumber: currentOrder.orderNumber,
                tableId: currentOrder.tableId,
            }];
        }

        const updatedOrder = {
            ...currentOrder,
            items: updatedItems,
            totalSales: calculateTotal(updatedItems)
        }
        setCurrentOrder(updatedOrder);
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
        if (wrh === 'vip') {
            return items.reduce((sum, item) => sum + ((item.vipPrice || item.salesPrice) * item.quantity), 0);
        }
        return items.reduce((sum, item) => sum + (item.salesPrice * item.quantity), 0);
    };

    const handleOrderSelect = (order, status) => {
        const orderClone = structuredClone({ order });
        const posOrderClone = structuredClone({ order })
        setSelectedProduct(null);   
        setCurrentOrder({...orderClone.order, ...(status && {status})});
        setPosCurrentOrder({...posOrderClone.order, ...(status && {status})});
        setActiveScreen('order');
        setShowOrdersModal(false);
    };

    const handleSyncOfflinePOS = async () => {
        if (!company || !companyRecord?.emailid) return;

        setIsSyncing(true);
        setAlertState('info');
        setAlert('Syncing offline POS changes...');
        setAlertTimeout(10000);

        try {

            const results = await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);

            // Refresh related data by reusing periodic refresh functions
            await Promise.all([
                // reuse POS table refresh
                (async () => { await refreshPOSData(); })(),
                (async () => { await refreshPOSData2(); })(),
                getProducts(company),
                fetchProfiles(company),
                fetchAllSessions({ company, companyRecord }),
            ]).catch(() => { });

            await loadInitialData();

            if (Array.isArray(results)) {
                const failed = results.filter(r => r.status === 'error');
                if (failed.length) {
                    setAlertState('error');
                    setAlert(`${failed.length} change(s) failed to sync; retry later.`);
                    setAlertTimeout(1000);
                } else {
                    setAlertState('success');
                    setAlert('Offline POS Sync complete');
                    setAlertTimeout(1000);
                }
            } else {
                setAlertState('success');
                setAlert('Offline POS Sync complete');
                setAlertTimeout(1000);
            }
        } catch (e) {
            setAlertState('error');
            setAlert('Offline POS Sync failed. Please try again.');
            setAlertTimeout(3000);
        } finally {
            setIsSyncing(false);
        }
    }

    // =========================================
    // 6. Payment Processing
    // =========================================
    const handlePayment = async () => {
        // These reads are fine (no direct writes to Mongo)
        // fetchSessions(company, "sales", companyRecord);
        // fetchAllSessions({company})
        // fetchTables(company);
        // getProducts(company);
        // loadInitialData();

        setAlertState('info');
        setAlert('Processing Payment...');
        setAlertTimeout(5000);
        setMakingPayment(true);

        let totalPayment = 0;
        let totalChange = 0;
        const receipts = {};
        const salesPosts = {};

        Object.keys(paymentDetails).forEach((payPoint) => {
            totalPayment += Number(paymentDetails[payPoint].amount || 0);
            totalChange += Number(paymentDetails[payPoint].change || 0);
            receipts[payPoint] = paymentDetails[payPoint].receipt;
            salesPosts[payPoint] = paymentDetails[payPoint].salesPost;
        });

        if (totalPayment < currentOrder.totalSales) {
            setAlertState('error');
            setAlert('Insufficient payment amount');
            setAlertTimeout(3000);
            setMakingPayment(false);
            return;
        }

        const paymentData = {};
        Object.keys(paymentDetails).forEach((payPoint) => {
            paymentData[payPoint] = Number(paymentDetails[payPoint].amount || 0);
        });

        const paymentDataUpdate = {
            ...paymentData,
            payedAt: new Date().getTime(),
            totalPayment: totalPayment,
            cashChange: Number(paymentDetails['cash'].change),
            receipts,
            salesPosts,
            status: 'completed',
        };

        const newOrder = {
            ...currentOrder,
            ...paymentDataUpdate,
        };

        try {
            // 1) Update order in local IndexedDB and React state
            if (company && companyRecord?.emailid) {
                mergeAndPersistOrders([newOrder]);
            }

            setCurrentOrder(newOrder);

            setTableOrders((prev) =>
                prev.map((o) =>
                    o.orderNumber === newOrder.orderNumber ? newOrder : o
                )
            );

            // 2) Update table activeTables locally (no direct server write)
            const prevTable = tables.find((table) => table['wrh'] === wrh);
            if (prevTable) {
                let updatedActiveTables = (prevTable.activeTables || []).filter(
                    (t) =>
                        !(
                            t.tableId === currentOrder.tableId &&
                            t.sessionId === currentOrder.sessionId &&
                            t.handlerId === currentOrder.handlerId &&
                            t.orderNumber === currentOrder.orderNumber
                        )
                );

                if (currentOrder.delivery !== 'completed') {
                    // Keep an active record but mark as completed
                    const existing = (prevTable.activeTables || []).find(
                        (t) =>
                            t.tableId === currentOrder.tableId &&
                            t.sessionId === currentOrder.sessionId &&
                            t.handlerId === currentOrder.handlerId &&
                            t.orderNumber === currentOrder.orderNumber
                    );
                    if (existing) {
                        updatedActiveTables.push({
                            ...existing,
                            status: 'completed',
                        });
                    }
                }
                // else if delivery === 'completed', remove completely

                const updatedTable = {
                    ...prevTable,
                    activeTables: updatedActiveTables,
                };
                
                if (company && companyRecord?.emailid) {
                    await putTable(company, companyRecord.emailid, updatedTable);
                }
                
                setTables((prev) =>
                    prev.map((t) => (t.wrh === wrh ? updatedTable : t))
            );
            
            // Queue table update for sync
                if (company && companyRecord?.emailid) {
                    const change = {
                        entityType: 'table',
                        op: 'update',
                        clientId: updatedTable.i_d,
                        payload: updatedTable,
                    }
                    if (curPosSettings?.type === 'restaurant'){
                        queuePendingChange(company, companyRecord.emailid, change);
                    }else{
                        try{
                            await processChange(change, company, fetchServer, server);
                        }catch(e){
                            console.log(e)
                        }
                    }
                }
            }
            // 3) Queue order update for sync (you already had this pattern)
            if (company && companyRecord?.emailid) {
                const change = {
                    entityType: 'order',
                    op: 'update',
                    clientId: currentOrder.orderNumber,
                    payload: {
                        orderNumber: currentOrder.orderNumber,
                        ...paymentDataUpdate,
                    },
                }
                if (curPosSettings?.type === 'restaurant'){
                    queuePendingChange(company, companyRecord.emailid, change);
                }else{
                    await processChange(change, company, fetchServer, server);
                }

                // Immediate sync attempt – failures are fine, queue remains
                try {
                    setMakingPayment(false);
                    setAlertState('success');
                    setAlert('Payment processed successfully');
                    setAlertTimeout(1000);
                    if (curPosSettings?.printPaymentReceipt) {
                        printReceipt(newOrder);
                    }
                    setShowPaymentModal(false);
                    setCurrentOrder(newOrder)
                    // createNewOrder(currentTable);
                    setPaymentDetails({ ...payPoints });
                    await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                    getPosOrders({ company, companyRecord }); // read-only
                    fetchTables(company)
                    if (curPosSettings?.type === 'restaurant') {
                        var totalItems = 0
                        var deliveredQuantity = 0
                        const deliveredItems = newOrder.items.filter((item) => {
                            if (wrhCategories[wrh].includes(item.category)) {
                                totalItems += Number(item.quantity)
                                deliveredQuantity += Number(item?.deliveredQuantity || 0)
                                return Number(item?.deliveredQuantity || 0) > 0
                            }
                        })
                        if (deliveredQuantity < totalItems) {
                            const orderClone = structuredClone({ newOrder }).newOrder
                            handleOrderDelivery(newOrder, orderClone);
                        }
                    }
                } catch (e) {
                    // Leave pending changes in queue; 5‑minute auto-sync will retry
                }
            }
            // 4) Local success feedback            
        } catch (e) {
            setAlertState('error');
            setAlert('Error processing payment locally');
            setAlertTimeout(3000);
            console.log(e)
            setMakingPayment(false);
            return;
        }
    };

    const printReceipt = (orderData) => {
        const orderEmployee = employees.find((e) => e.i_d === orderData.handlerId);
        const table = orderTables.find((table) => { return table.i_d === orderData.tableId })
        const receiptContent = `
            <div class="receipt">
                <h2>${companyRecord.name} Payment Receipt</h2>
                <p>From: ${table?.name || ''} (${orderData.wrh})</p>
                <p>Order: #${orderData.orderNumber}</p>
                <p>Placed By: ${orderEmployee ? `${orderEmployee.firstName} ${orderEmployee.lastName} (${orderData.handlerId})` : 'Admin'}</p>
                <p>Date: ${new Date().toLocaleString()}</p>
                <hr/>
                ${orderData.items.map(item => `
                    <div class="receipt-item">
                        <span>${item.name} x ${item.quantity}</span>
                        <span>₦${wrh === 'vip' ? ((item.vipPrice || item.salesPrice) * item.quantity).toFixed(2) : (item.salesPrice * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                <hr/>
                <div class="receipt-total">
                    <p>Subtotal: ₦${(Number(orderData.totalSales || 0) * 0.925).toFixed(2)}</p>
                    <p>Tax: ₦${(Number(orderData.totalSales || 0) * 0.075).toFixed(2)}</p>
                    <p>Total: ₦${(Number(orderData.totalSales || 0) * 1).toFixed(2)}</p>
                    ${Object.keys(orderData.salesPosts).map(payPoint => `
                        ${orderData[payPoint] ? `<p>${payPoint}(${payPoint === 'cash' ? 'cash' : orderData.receipts[payPoint]}): ₦${orderData[payPoint]}</p>` : ''}                    
                    `).join('')}
                    ${orderData.cashChange ? `<p>{Change: ₦${orderData.cashChange}}</p>` : ''}
                    <p>Paid: ₦${orderData.totalPayment}</p>
                </div>

                <p>Thank you for your business!</p>
            </div>
        `;

        // Create a hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        // Write your content into it
        iframe.contentDocument.open();
        iframe.contentDocument.write(`
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
        iframe.contentDocument.close();

        // Print directly from the iframe
        iframe.contentWindow.focus();
        iframe.contentWindow.print();

        // Cleanup
        setTimeout(() => iframe.remove(), 1000);
    };
    
    const printCustomerOrder = (orderData) => {
        const orderEmployee = employees.find((e) => e.i_d === orderData.handlerId);
        const table = orderTables.find((table) => { return table.i_d === orderData.tableId })
        const receiptContent = `
            <div class="receipt">
                <h2>${companyRecord.name} Customer Order</h2>
                <p>From: ${table?.name || ''} (${orderData.wrh})</p>
                <p>Order: #${orderData.orderNumber}</p>
                <p>Placed By: ${orderEmployee ? `${orderEmployee.firstName} ${orderEmployee.lastName} (${orderData.handlerId})` : 'Admin'}</p>
                <p>Date: ${new Date().toLocaleString()}</p>
                <hr/>
                ${orderData.items.map(item => `
                    <div class="receipt-item">
                        <span>${item.name} x ${item.quantity}</span>
                        <span>₦${wrh === 'vip' ? ((item.vipPrice || item.salesPrice) * item.quantity).toFixed(2) : (item.salesPrice * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                <hr/>
                <div class="receipt-total">
                    <p>Subtotal: ₦${(Number(orderData.totalSales || 0) * 0.925).toFixed(2)}</p>
                    <p>Tax: ₦${(Number(orderData.totalSales || 0) * 0.075).toFixed(2)}</p>
                    <h2>Total: ₦${(Number(orderData.totalSales || 0) * 1).toFixed(2)}</h2>                    
                </div>

                <p>Kindly Pay Only To Company Account. Thank You!</p>
            </div>
        `;

        // Create a hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        // Write your content into it
        iframe.contentDocument.open();
        iframe.contentDocument.write(`
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
        iframe.contentDocument.close();

        // Print directly from the iframe
        iframe.contentWindow.focus();
        iframe.contentWindow.print();

        // Cleanup
        setTimeout(() => iframe.remove(), 1000);
    };

    const printKitchenOrder = (orderData) => {
        if (
            orderData.items.find((item) => { return wrhCategories['kitchen']?.includes(item.category) })
            && ((orderData.handlerId === (curPosHandler || companyRecord.emailid))
                || companyRecord?.status === 'admin'
                || companyRecord?.permissions?.includes('access_pos_sessions')
            )
        ) {
            const orderEmployee = employees.find((e) => e.i_d === orderData.handlerId);
            const receiptContent = `
                <div class="receipt">
                    <h2>Kitchen Order Slip</h2>
                    <p>Placed By: ${orderEmployee ? `${orderEmployee.firstName} ${orderEmployee.lastName} (${orderData.handlerId})` : 'Admin'}</p>
                    <p>From: Table ${orderData.tableId} (${orderData.wrh})</p>
                    <p>Order: #${orderData.orderNumber}</p>
                    <p>Date: ${new Date(orderData.createdAt).toLocaleString()}</p>
                    <hr/>
                        ${orderData.items.map(item => (
                wrhCategories['kitchen']?.includes(item.category) ? `
                                <div class="receipt-item">
                                    <span>${item.name} x ${item.quantity}</span>
                                    <span>₦${wrh === 'vip' ? ((item.vipPrice || item.salesPrice) * item.quantity).toFixed(2) : (item.salesPrice * item.quantity).toFixed(2)}</span>
                                </div>` : ''
            )).join('')}
                    <hr/>
                    <div class="receipt-total">
                        <p>Total: ₦${(Number(orderData.items.reduce((sum, item) =>
                sum + (wrhCategories['kitchen']?.includes(item.category)
                    ? Number(item.quantity) * Number(item.salesPrice) : 0)
                , 0)) || 0).toFixed(2)}</p>                    
                    </div>
                    <p>Printed For Kitchen Use Only!</p>
                </div>
            `;

            // Create a hidden iframe
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);

            // Write your content into it
            iframe.contentDocument.open();
            iframe.contentDocument.write(`
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
            iframe.contentDocument.close();

            // Print directly from the iframe
            iframe.contentWindow.focus();
            iframe.contentWindow.print();

            // Cleanup
            setTimeout(() => iframe.remove(), 1000);
        }
    };

    const printBarOrder = (orderData) => {
        if (
            orderData.items.find((item) => { return !wrhCategories['kitchen']?.includes(item.category) })
            && ((orderData.handlerId === (curPosHandler || companyRecord.emailid))
                || companyRecord?.status === 'admin'
                || companyRecord?.permissions?.includes('access_pos_sessions')
            )
        ) { }
        const orderEmployee = employees.find((e) => e.i_d === orderData.handlerId);
        const receiptContent = `
            <div class="receipt">
                <h2>${orderData.wrh} - Order Slip For Bars</h2>
                <p>Placed By: ${orderEmployee ? `${orderEmployee.firstName} ${orderEmployee.lastName} (${orderData.handlerId})` : 'Admin'}</p>
                <p>From: Table ${orderData.tableId} (${orderData.wrh})</p>
                <p>Order: #${orderData.orderNumber}</p>
                <p>Date: ${new Date(orderData.createdAt).toLocaleString()}</p>
                <hr/>
                    ${orderData.items.map(item => (
            !wrhCategories['kitchen']?.includes(item.category) ? `
                            <div class="receipt-item">
                                <span>${item.name} x ${item.quantity}</span>
                                <span>₦${wrh === 'vip' ? ((item.vipPrice || item.salesPrice) * item.quantity).toFixed(2) : (item.salesPrice * item.quantity).toFixed(2)}</span>
                            </div>` : ''
        )).join('')}
                <hr/>
                <div class="receipt-total">
                    <p>Total: ₦${(Number(orderData.items.reduce((sum, item) =>
            sum + (!wrhCategories['kitchen']?.includes(item.category)
                ? (wrh === 'vip' ? (Number(item.quantity) * Number(item.vipPrice || item.salesPrice)) : (Number(item.quantity) * Number(item.salesPrice))) : 0)
            , 0)) || 0).toFixed(2)}</p>                    
                </div>
                <p>Printed For ${orderData.wrh} Use Only!</p>
            </div>
        `;

        // Create a hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        // Write your content into it
        iframe.contentDocument.open();
        iframe.contentDocument.write(`
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
        iframe.contentDocument.close();

        // Print directly from the iframe
        iframe.contentWindow.focus();
        iframe.contentWindow.print();

        // Cleanup
        setTimeout(() => iframe.remove(), 1000);
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
        if (activeCategory && activeChar) {
            const filtered = products.filter((product) => {
                const productName = product.name.toLowerCase()[0]
                const foundProduct = product.i_d.toLowerCase()?.includes(productSearch.toLowerCase()) || product.barcode?.toLowerCase()?.includes(productSearch.toLowerCase())
                if (!productSearch) {
                    return (
                        product.category === activeCategory && productName === activeChar.toLowerCase()
                    )
                } else {
                    return (
                        product.category === activeCategory && productName === activeChar.toLowerCase() && foundProduct
                    )
                }
            });
            setFilteredProducts(filtered);
        } else if (activeCategory) {
            const filtered = products.filter((product) => {
                const foundProduct = product.i_d.toLowerCase()?.includes(productSearch.toLowerCase()) || product.barcode?.toLowerCase()?.includes(productSearch.toLowerCase())
                return product.category === activeCategory && foundProduct
            });
            setFilteredProducts(filtered);
        } else if (activeChar) {
            const filtered = products.filter((product) => {
                const productName = product.name.toLowerCase()[0]
                const foundProduct = product.i_d.toLowerCase()?.includes(productSearch.toLowerCase()) || product.barcode?.toLowerCase()?.includes(productSearch.toLowerCase())
                return productName === activeChar.toLowerCase() && foundProduct
            });
            setFilteredProducts(filtered);
        } else if (productSearch) {
            const filtered = products.filter((product) => {
                const foundProduct = product.i_d.toLowerCase()?.includes(productSearch.toLowerCase()) || product.barcode?.toLowerCase()?.includes(productSearch.toLowerCase())
                return foundProduct
            });
            setFilteredProducts(filtered);
        } else {
            setFilteredProducts(products);

        }
    };

    // Update the click handler in the products grid to only select the product
    const handleProductClick = (product) => {
        if (!sessionEnded && ['new', 'edit'].includes(currentOrder.status) && product?.salesPrice) {
            setSelectedProduct(product);
            setQuantity(''); // Reset quantity when new product is selected
        }
    };

    // =========================================
    // 8. UI Rendering Functions
    // =========================================
    const handleStartSession = async () => {
        if (companyRecord.status === 'admin' || companyRecord.permissions.includes('access_pos_sessions')) {
            if (sessionUser !== null) {
                setWrh('')
                setLoading(true);
                await createSession(sessionUser);
                setLoading(false)
            } else {
                setLoading(true);
                await createSession();
                setLoading(false);
            }
        } else {
            setAlertState('error')
            setAlert('You do not have access to this feature. Get your admin to start your session!')
            setAlertTimeout(7000)
            return
        }
    };

    const handleEndSession = async () => {
        if (sessionUser !== null) {
            if (allSessionOrders.length) {
                const allUserOrders = allSessionOrders.filter((order) => {
                    return ((getSessionEnd(order.sessionId) === getSessionEnd((sessionUser.curSession).i_d)) && (order.handlerId === (sessionUser.profile).emailid))
                })
                setLoading(true);
                await stopSession(sessionUser.curSession, allUserOrders);
                setPosSalesDifference({})
                setLoading(false)
            } else {
                setAlertState('info')
                setAlert('Could not load orders. Please check your connection and try again.')
                setAlertTimeout(5000)
                setLoading(false)
                return
            }
        }
    };
    const renderSessionEntry = () => {
        const allUserOrders = allSessionOrders?.filter((order) => {
            if (sessionUser !== null && sessionUser?.curSession) {
                return ((getSessionEnd(order.sessionId) === getSessionEnd((sessionUser.curSession).i_d)) && (order.handlerId === (sessionUser.profile).emailid))
            } else {
                return ((getSessionEnd(order.sessionId) === getSessionEnd(curSession?.i_d)) && (order.handlerId === companyRecord?.emailid))
            }
        })
        const {
            allSales, totalPendingSales,
            totalCancelledSales, totalCashChange
        } = getSessionSales(allUserOrders)

        var posSalesAccess = []
        if (sessionUser !== null) {
            let wrhsPosObj = {}
            let wrhsDeliveryObj = {}
            wrhs.forEach((wrh) => {
                if (wrh.purchase) return
                wrhsPosObj[wrh.name] = ((sessionUser.profile).permissions.includes(`pos_${wrh.name}`) || (sessionUser.profile).permissions.includes('all'))
                wrhsDeliveryObj[wrh.name] = ((sessionUser.profile).permissions.includes(`delivery_${wrh.name}`) || (sessionUser.profile).permissions.includes('all'))
            })
            const userSalesWrhAccess = { ...wrhsPosObj }
            Object.keys(userSalesWrhAccess).forEach((wrh) => {
                if (userSalesWrhAccess[wrh]) {
                    posSalesAccess.push(wrh)
                }
            })
        }

        const handleCountedSalesEntry = (e) => {
            const { name, value } = e.target

            setCountedSales((countedSales) => {
                return { ...countedSales, [name]: value }
            })
            setPosSalesDifference((posSalesDifference) => {
                return { ...posSalesDifference, [name]: (Number(value) - Number(allSales[name] || 0)) }
            })
        }

        return (
            <>
                {loadSession && (
                    <div className='openingsession' style={{ color: 'white', fontSize: '1.2rem', fontWeight: '600' }}>
                        Loading Session...
                    </div>
                )}
                {startSession && (
                    <div className='openingsession'>
                        <div className="session-entry">
                            <div className="modal-header">
                                <h2>Start Session {
                                    [''].map((args) => {
                                        const userProfile = employees.find((employee) => { return (employee.i_d === ((sessionUser === null) ? curSession?.employee_id : sessionUser.profile.emailid)) })
                                        return (userProfile ? <span key={userProfile.i_d}>{`(${userProfile.firstName})`}</span> : <span>{(curSession === null) ? '' : `(Admin)`}</span>)
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
                                        window.localStorage.setItem('pos-wrh', e.target.value)
                                    }}
                                    disabled={loading}
                                >
                                    <option value={''}>Select Sales Post</option>
                                    {sessionUser === null ? wrhs.map((warehouse, index) => (
                                        posWrhAccess[warehouse.name] && warehouse?.productCategories?.length && <option key={index} value={warehouse.name}>
                                            {warehouse.name}
                                        </option>
                                    )) :
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
                                    [''].map((args) => {
                                        const userProfile = employees.find((employee) => { return (employee.i_d === ((sessionUser === null) ? curSession.employee_id : sessionUser.profile.emailid)) })
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
                                    if (payPoint !== 'cash') {
                                        return (
                                            <div key={payPoint}>
                                                <label>{payPoint.toUpperCase()}</label>
                                                <div className='session-entry-inputs'>
                                                    <input
                                                        style={{ cursor: 'not-allowed' }}
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
                                                    style={{ cursor: 'not-allowed' }}
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
                                        style={{ cursor: 'not-allowed' }}
                                        type="number"
                                        value={
                                            ((sessionUser === null) ? curSession.openingCash : sessionUser.curSession.openingCash)
                                            + (allSales['cash'] || 0)
                                            - totalCashChange
                                        }
                                        disabled={true}
                                        readOnly
                                    />
                                    <span>{'->'}</span>
                                    <input
                                        type="number"
                                        value={countedSales['cash']}
                                        name='cash'
                                        placeholder={'Counted Cash Amount'}
                                        onChange={(e) => handleCountedSalesEntry(e)}
                                        disabled={loading}
                                    />
                                </div>
                                <input
                                    style={{ cursor: 'not-allowed' }}
                                    type="number"
                                    value={
                                        (posSalesDifference['cash'] || 0)
                                        - ((sessionUser === null) ? curSession.openingCash : sessionUser.curSession.openingCash)
                                        + totalCashChange
                                    }
                                    disabled={true}
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Opening Cash</label>
                                <input
                                    style={{ cursor: 'not-allowed' }}
                                    type="number"
                                    value={(sessionUser === null) ? curSession.openingCash : sessionUser.curSession.openingCash}
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Total Cash Change</label>
                                <input
                                    style={{ cursor: 'not-allowed' }}
                                    type="number"
                                    value={totalCashChange}
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Total Pending Sales</label>
                                <input
                                    style={{ cursor: 'not-allowed' }}
                                    type="number"
                                    value={totalPendingSales}
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Total Cancelled Sales</label>
                                <input
                                    style={{ cursor: 'not-allowed' }}
                                    type="number"
                                    value={totalCancelledSales}
                                    readOnly
                                />
                            </div>
                            <div className="session-actions">
                                <button
                                    className="session-btn end"
                                    onClick={() => {
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
                {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'].map(key => (
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
                            {['new', 'edit'].includes(currentOrder.status) && <button
                                className="remove-btn"
                                onClick={() => {
                                    if (currentOrder.status === 'new') {
                                        handleRemoveItem(item.i_d)
                                    } else {
                                        if (currentOrder.status === 'edit' && (companyRecord?.access === 'admin' || companyRecord?.permissions?.includes('remove_pos_items'))) {
                                            handleRemoveItem(item.i_d)
                                        }
                                    }
                                }}
                            >
                                ×
                            </button>}
                        </div>
                    ))}
                </div>
                {selectedProduct && renderKeypad()}
                {(currentOrder.status !== 'cancelled' && ['new', 'edit'].includes(currentOrder.status)) && <button
                    className="place-order-btn"
                    onClick={() => {
                        if (currentOrder.status === 'new') {
                            handlePlaceOrder()
                        } else if (currentOrder.status === 'edit') {                                    
                            handleEditOrder()
                        }
                    }}
                    disabled={!currentOrder.items.length || placingOrder || sessionEnded || !curSession.active || curSession.wrh !== wrh}
                >
                    {currentOrder.status === 'new' ? `Place Order` : 'Edit Order'} (₦{currentOrder.totalSales?.toFixed(2)})
                </button>}
                {(currentOrder.status !== 'cancelled' && currentOrder.status === 'pending') && <button
                    className="place-order-btn"
                    onClick={() => setShowPaymentModal(true)}
                    disabled={!currentOrder.totalSales || makingPayment || currentTable?.status === 'unavailable'}
                >
                    Make Payment (₦{currentOrder.totalSales?.toFixed(2)})
                </button>}
                {(currentOrder.status !== 'cancelled' && ((curPosSettings?.type === 'shop' && currentOrder.delivery === 'pending') || (curPosSettings?.type === 'restaurant' && currentOrder?.status !== 'pending')) && !['new', 'edit'].includes(currentOrder.status))
                && (
                    currentOrder.items.filter((item) => {
                        if (wrhCategories[wrh].includes(item.category)) {
                            return Number(item?.deliveredQuantity || 0) > 0
                        }
                    }).length < currentOrder.items.reduce((sum, item) => { return sum + Number(item.quantity) }, 0)
                ) && <button
                    className="place-order-btn"
                    onClick={() => {
                        var totalItems = 0
                        var deliveredQuantity = 0
                        const deliveredItems = currentOrder.items.filter((item) => {
                            if (wrhCategories[wrh].includes(item.category)) {
                                totalItems += Number(item.quantity)
                                deliveredQuantity += Number(item?.deliveredQuantity || 0)
                                return Number(item?.deliveredQuantity || 0) > 0
                            }
                        })
                        if (deliveredQuantity < totalItems) {
                            const orderClone = structuredClone({ placedOrder: currentOrder }).placedOrder
                            handleOrderDelivery(currentOrder, orderClone)
                        } else {
                            setAlertState('error')
                            setAlert('Nothing to Post. You Have Completed Your Delivery!')
                            setAlertTimeout(3000)
                        }
                    }}
                    disabled={!currentOrder.totalSales || makingPayment || currentTable?.status === 'unavailable'}
                >
                    Place Delivery
                </button>}
                {currentOrder.items.find((item) => { return wrhCategories['kitchen']?.includes(item.category) })
                && ((currentOrder.handlerId === (curPosHandler || companyRecord.emailid))
                    || companyRecord?.status === 'admin'
                    || companyRecord?.permissions?.includes('access_pos_sessions')
                ) && ['pending', 'completed'].includes(currentOrder.status)
                && curPosSettings?.type === 'restaurant' && <button
                    className="place-order-btn"
                    onClick={() => printKitchenOrder(currentOrder)}
                    disabled={!currentOrder.items.length}
                >
                    Print For Kitchen
                </button>}
                {currentOrder.items.find((item) => { return !wrhCategories['kitchen']?.includes(item.category) })
                && ((currentOrder.handlerId === (curPosHandler || companyRecord.emailid))
                    || companyRecord?.status === 'admin'
                    || companyRecord?.permissions?.includes('access_pos_sessions')
                ) && ['pending', 'completed'].includes(currentOrder.status)
                && curPosSettings?.type === 'restaurant' && <button
                    className="place-order-btn"
                    onClick={() => printBarOrder(currentOrder)}
                    disabled={!currentOrder.items.length}
                >
                    Print For Bar
                </button>}
                {currentOrder.items?.length
                && ((currentOrder.handlerId === (curPosHandler || companyRecord.emailid))
                    || companyRecord?.status === 'admin'
                    || companyRecord?.permissions?.includes('access_pos_sessions')
                ) && ['pending', 'completed'].includes(currentOrder.status)
                && curPosSettings?.type === 'restaurant' && <button
                    className="place-order-btn"
                    onClick={() => printCustomerOrder(currentOrder)}
                    disabled={!currentOrder.items.length}
                >
                    Print Customer Order
                </button>}
            </div>
            <div className="products-panel">
                <div className="categories-bar">
                    <input className='product-finder' placeholder='Enter ID / Barcode' value={productSearch} onChange={(e) => { setProductSearch(e.target.value) }} />
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
                <div className='categories-bar'>
                    <button
                        className={`category-btn ${!activeChar ? 'active' : ''}`}
                        onClick={() => setActiveChar(null)}
                    >
                        All
                    </button>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].map((char) => {
                        return (
                            <button
                                key={char}
                                className={`category-btn ${activeChar === char ? 'active' : ''}`}
                                onClick={() => setActiveChar(char)}
                            >
                                {char}
                            </button>
                        )
                    })}
                </div>
                <div className="products-grid">
                    {filteredProducts.filter((pr)=>pr.type === 'goods').map(product => (
                        <div
                            key={product.i_d}
                            className={`product-card ${selectedProduct?.i_d === product.i_d ? 'active' : ''}`}
                            onClick={() => handleProductClick(product)}
                        >
                            <div className="product-icon">
                                {getProductImageUrl(product) ? (
                                    <img
                                        src={getProductImageUrl(product)}
                                        alt={product.name}
                                        className="product-thumb-img"
                                    />
                                ) : (
                                    <MdShoppingBasket />
                                )}
                            </div>
                            <div className="product-name">{product.name}</div>
                            <div className="product-price">₦{wrh === 'vip' ? (product.vipPrice || product.salesPrice) : product.salesPrice}</div>
                        </div>
                    ))}
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

                        <div className='pos-wh-cover' onClick={(e) => {
                            const name = e.target.getAttribute('name')
                            if (name) {
                                setWrh(name)
                                window.localStorage.setItem('pos-wrh', name)
                            }
                        }}>
                            {
                                wrhs.map((wh, id) => {
                                    if (!wh.purchase && wh.productCategories.length && (curSession?.wrh === wh.name || companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_sessions'))) {
                                        return (posWrhAccess[wh.name] && <div key={id} className={'slprwh ' + (wrh === wh.name ? 'slprwh-clicked' : '')} name={wh.name}>{wh.name}</div>)
                                    }
                                })
                            }

                            {
                                <div className={'live-nav'}>
                                    {
                                        <div className={'live-nav'}>
                                            {<button
                                                className="action-btn"
                                                onClick={handleSyncOfflinePOS}
                                                disabled={isSyncing}
                                            >
                                                {isSyncing ? 'Syncing...' : 'Sync()'}
                                            </button>}
                                        </div>

                                    }
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
                        <div className="pos-time-display">
                            <div>Session: {new Date(curSession?.start).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <p></p>
                            <div>Date: {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <div className="time">{formatTime(currentTime)}</div>
                            {hasPosAgentPermissions ?
                                <div style={{ fontWeight: 'bold' }}>Handler:
                                    <select
                                        className='forminp'
                                        name='email'
                                        type='text'
                                        placeholder='Select POS Handler'
                                        value={curPosHandler}
                                        onChange={(e) => { setCurPosHandler(e.target.value) }}
                                    >
                                        <option value={''}>
                                            {companyRecord?.access === 'admin' ? 'Super Admin' : getEmployeeName(companyRecord?.emailid)}
                                        </option>
                                        {employees.map((employee, index) => {
                                            const profile = profiles.find((profile) => { return profile.emailid === employee.i_d })
                                            if (!employee.dismissalDate && !(employee.i_d === companyRecord?.emailid) && profile?.permissions?.includes(`pos_${wrh}`)) {
                                                return (
                                                    <option key={index} value={employee.i_d}>
                                                        {employee.firstName} {employee.lastName} {`(${employee.i_d})`}
                                                    </option>
                                                )
                                            }
                                        })}
                                    </select>
                                </div>
                                : <div style={{ fontWeight: 'bold' }}>Handler: {companyRecord?.access === 'admin' ? 'Super Admin' : getEmployeeName(companyRecord?.emailid)}</div>
                            }
                        </div>
                        <div className="pos-tables-layout">
                            {curPosSettings?.type === 'restaurant' && <div
                                className="add-table-box"
                                onClick={handleAddTableClick}
                            >
                                <div className="plus-icon">+</div>
                                <div className="add-text">Add Table</div>
                            </div>}
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
                        onChange={(e) => setNewTableData({ ...newTableData, name: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Capacity</label>
                    <input
                        type="number"
                        value={newTableData.capacity}
                        onChange={(e) => setNewTableData({ ...newTableData, capacity: e.target.value })}
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

        // Combine epoch time + high-resolution performance time
        const uniquePart = `${Date.now()}${Math.floor(performance.now() * 1000) % 1000}`;
        const shortCode = uniquePart.slice(-8); // shorten if you want

        return `ORD-${year}${month}${day}-${shortCode}`;
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
                    allSalesSessions={allSalesSessions}
                    setAllSalesSessions={setAllSalesSessions}
                    mergeAndPersistOrders={mergeAndPersistOrders}
                    mergeAndPersistSessions={mergeAndPersistSessions}
                    allSessions={allSessions}
                    setAllSessions={setAllSessions}
                    deliverySessions={deliverySessions}
                    setDeliverySessions={setDeliverySessions}
                    setAllSessionOrders={setAllSessionOrders}
                    allOrders={allOrders}
                    setSessionUser={setSessionUser}
                    companyRecord={companyRecord}
                    employees={employees}
                    profiles={profiles}
                    isLive={isLive}
                    liveErrorMessages={liveErrorMessages}
                    fetchTables={fetchTables}
                    sessionEnded={sessionEnded}
                    getSessionEnd={getSessionEnd}
                    setWrh={setWrh}
                    posWrhAccess={posWrhAccess}
                    allSessionOrders={allSessionOrders}
                    getSessionSales={getSessionSales}
                    setAlertState={setAlertState}
                    setAlert={setAlert}
                    setAlertTimeout={setAlertTimeout}
                    wrhCategories={wrhCategories}
                /> :
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
                                    disabled={placingOrder || makingPayment || currentTable?.status === 'unavailable'}
                                    onClick={() => createNewOrder(currentTable)}
                                >
                                    New Order
                                </button>
                                <button
                                    className="action-btn"
                                    disabled={placingOrder || makingPayment}
                                    onClick={() => {
                                        handleTableSelect(currentTable, 'auto')
                                        setShowOrdersModal(true)
                                    }}
                                >
                                    All Orders
                                </button>
                                <button
                                    name="prevTable"
                                    className='action-btn'
                                    onClick={
                                        (e)=>{
                                            if (curPosSettings?.type === 'restaurant'){
                                                switchTable(e)
                                            }else{
                                                switchOrder(e)
                                            }
                                        }
                                    }
                                >
                                    {'<'}
                                </button>
                                <span style={{ margin: "auto" }}>{'.'}</span>
                                <button
                                    name="nextTable"
                                    className='action-btn'
                                    onClick={
                                        (e)=>{
                                            if (curPosSettings?.type === 'restaurant'){
                                                switchTable(e)
                                            }else{
                                                switchOrder(e)
                                            }
                                        }
                                    }
                                >
                                    {'>'}
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
                            curPosSettings={curPosSettings}
                            handleCancelDelivery={handleCancelDelivery}
                            wrhCategories={wrhCategories}
                            tables={tables}
                            wrh={wrh}
                            currentOrder={currentOrder}
                            setCurrentOrder={setCurrentOrder}
                            createNewOrder={createNewOrder}
                            curSession={curSession}
                            employees={employees}
                        />}
                    {showPaymentModal &&
                        <PaymentModal
                            amount={amount}
                            setAmount={setAmount}
                            currentOrder={currentOrder}
                            method={method}
                            setMethod={setMethod}
                            wrh={wrh}
                            wrhCategories={wrhCategories}
                            curSession={curSession}
                            defaultPaymentDetails={defaultPaymentDetails}
                            paymentDetails={paymentDetails}
                            setPaymentDetails={setPaymentDetails}
                            setShowPaymentModal={setShowPaymentModal}
                            handlePayment={handlePayment}
                            paymentReceipts={paymentReceipts}
                            payPoints={payPoints}
                            setAlert={setAlert}
                            setAlertState={setAlertState}
                            setAlertTimeout={setAlertTimeout}
                            setActionMessage={setActionMessage}
                            alert={alert}
                            alertTimeout={alertTimeout}
                            alertState={alertState}
                            actionMessage={actionMessage}
                            companyRecord={companyRecord}
                        />}
                </div>
            }
        </div>
    );
};

export default PointOfSales;

const PaymentModal = ({
    amount, setAmount,
    currentOrder, companyRecord,
    method, setMethod, wrh, curSession, defaultPaymentDetails,
    paymentDetails, setPaymentDetails, wrhCategories,
    setShowPaymentModal, handlePayment, allPaymentReceipts,
    payPoints, setAlertState, setAlert, setAlertTimeout, setActionMessage, alert, alertState, alertTimeout, actionMessage,
    paymentReceipts
}) => {
    const [paymentSum, setPaymentSum] = useState(0)
    const [cashAmount, setCashAmount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [receipts, setReceipts] = useState({})

    useEffect(() => {
        var paymentAmount = 0
        Object.keys(paymentDetails).forEach((payPoint) => {
            paymentAmount += Number(paymentDetails[payPoint].amount || 0)
        })
        setPaymentSum(paymentAmount)
    }, [paymentDetails])

    const confirmReceiptsAvailable = (receipts) => {
        let voidReceipts = []
        var postingDate = new Date(currentOrder.createdAt).toISOString().split('T')[0]
        const maximumPayHours = (companyRecord?.permissions?.includes('override_pos_receipts') || companyRecord?.status === 'admin') ? 1 : 0.1 // 1 hour for admin, 6 minutes for others
        Object.keys(receipts).forEach((payPoint) => {
            const queryReceiptDetails = paymentReceipts.find((payrec) => {
                const payRecs = String(payrec?.paymentReceipt).split(',').map((rec) => {
                    if (rec.trim('').toLowerCase() === 'cash') {
                        return rec.trim('')
                    } else {
                        return Number(rec.trim(''))
                    }
                }).filter((fltRec) => {
                    return fltRec !== 'cash'
                })
                let accRecs = String(receipts[payPoint]).split(',').filter((rec) => {
                    return rec.trim('').toLowerCase() !== 'cash'
                })
                let accRecFiltered = accRecs.filter((fltRec) => {
                    return (
                        (payrec.paymentReceipt === Number(fltRec)
                            || payRecs.includes(Number(fltRec)))
                        && payrec.paymentPoint === payPoint
                    )
                })
                return accRecFiltered.length > 0
            })
            let hourDiff = 9
            if (queryReceiptDetails) {
                hourDiff = Math.abs((new Date().getTime() - new Date(queryReceiptDetails.paymentModuleRef).getTime()) / 36e5); // Difference in hours
            }
            if (
                queryReceiptDetails
            ) {
                if (queryReceiptDetails?.paymentTable === currentOrder.tableId && hourDiff <= maximumPayHours) {
                } else {
                    voidReceipts.push(payPoint.toUpperCase())
                }
            }
        })
        return { isReceiptsAvailable: (voidReceipts.length === 0), voidReceipts }
    }

    const validatePayment = async () => {        
        var payPointsWithNoReceipts = []
        if (!paymentDetails['cash'].amount || (Number(paymentDetails['cash'].amount || 0) < Number(currentOrder.totalSales || 0))) {
            Object.keys(paymentDetails).forEach((payPoint) => {
                if (payPoint !== 'cash') {
                    if (Number(paymentDetails[payPoint].amount) > 0 && !paymentDetails[payPoint]['receipt']) {
                        payPointsWithNoReceipts.push(payPoint.toUpperCase())
                    }
                }
            })
        }
        if (!payPointsWithNoReceipts.length) {
            const { isReceiptsAvailable, voidReceipts } = confirmReceiptsAvailable(receipts)
            if (isReceiptsAvailable) {
                if (Number(currentOrder.totalSales) > paymentSum) {
                    const remainingDifference = Number(currentOrder.totalSales) - paymentSum
                    setAlertState('error')
                    setAlert(`Insufficient payment amount. Remaining ${Number(remainingDifference).toLocaleString()}!`)
                    setAlertTimeout(3000)
                } else if ((Number(currentOrder.totalSales) < (paymentSum - (Number(paymentDetails['cash'].change))))) {
                    setAlertState('error')
                    setAlert(`Payment Amount is greater than Total Sales. Total amount remaining should be 0.00`)
                    setAlertTimeout(3000)
                } else {
                    var actmess = ''
                    Object.keys(paymentDetails).forEach((payPoint, index)=>{
                        if (paymentDetails[payPoint]?.amount){
                            if (index) {
                                actmess += ', '
                            }
                            actmess += `${payPoint.toUpperCase()}: ${Number(paymentDetails[payPoint].amount).toLocaleString()}`
                        }
                    })
                    setAlertState('info')
                    setActionMessage('Confirm Payment')
                    setAlert(`Please Confirm That The Following Payment Details Are Correct: ${actmess}`)
                    setAlertTimeout(10000)
                }
            } else {
                setAlertState('error');
                setAlert(`Receipt Number Already Used for the Following Pay Points: ${voidReceipts.join(', ')}!`);
                setAlertTimeout(3000)
            }
        } else {
            var errmess = ''
            payPointsWithNoReceipts.forEach((payPoint, index) => {
                if (!index) {
                    errmess += String(payPoint)
                } else {
                    if (index === payPointsWithNoReceipts.length - 1) {
                        errmess += ' and ' + String(payPoint)
                    } else {
                        errmess += ', ' + String(payPoint)
                    }
                }
            })
            setAlertState('error')
            setAlert(`Please Enter Receipt Number for the following Pay Points: ${errmess} !`)
            setAlertTimeout(3000)
        }
    }

    const suggestSalesPoint = () => {
        var kc = 0
        var bc = 0

        currentOrder.items.forEach((item) => {
            if (wrhCategories[wrh].includes(item.category)) {
                bc++
            } else if (wrhCategories['kitchen']?.includes(item.category)) {
                kc++
            }
        })

        if (bc > 0 && kc > 0) {
            return 'multiple'
        }
        else if (bc > 0 && kc === 0) {
            return wrh
        } else if (kc > 0 && bc === 0) {
            return 'kitchen'
        }
    }

    const handleAmountChange = (e) => {
        const name = e.target.getAttribute('name')
        const value = e.target.value;
        setAmount(value);
        if (method === 'cash') {
            const amountNum = parseFloat(value) || 0;
            if (cashAmount === 0) {
                const changeAmount = amountNum - currentOrder.totalSales;
                setPaymentDetails((paymentDetails) => {
                    return {
                        ...paymentDetails, [method]: { ...paymentDetails[method], amount: value, change: amountNum ? changeAmount : 0 }
                    }
                })
            } else {
                const changeAmount = amountNum - cashAmount;
                setPaymentDetails((paymentDetails) => {
                    return {
                        ...paymentDetails, [method]: { ...paymentDetails[method], amount: value, change: amountNum ? changeAmount : 0 }
                    }
                })
            }
        } else {
            setPaymentDetails((paymentDetails) => {
                return {
                    ...paymentDetails, [method]: { ...paymentDetails[method], [name]: value, ...(Number(value) === 0 && { receipt: '' }) }
                }
            })
            if (name === 'receipt') {
                setReceipts((receipts) => {
                    return { ...receipts, [method]: value }
                })
            }
        }
        if (name === 'amount') {
            setPaymentDetails((paymentDetails) => {
                return {
                    ...paymentDetails, [method]: { ...paymentDetails[method], ['salesPost']: suggestSalesPoint() }
                }
            })
        }
    };

    return (
        <div className="modal-overlay">
            {actionMessage && <Notify
                notifyMessage={alert}
                notifyState={alertState}
                timeout={alertTimeout}
                actionMessage={actionMessage}
                cancel={() => {
                    setLoading(false)
                }}
                action={async () => {
                    setActionMessage('')
                    setLoading(true)
                    await handlePayment()
                    setPaymentDetails(defaultPaymentDetails)
                    setLoading(false)
                }}
            />}
            <div className="modal-content payment-modal">
                <div className="modal-header">
                    <h3>Payment</h3>
                    <button disabled={loading} onClick={() => setShowPaymentModal(false)}>×</button>
                </div>
                <div className="payment-methods">
                    {Object.keys(payPoints).map((payMethod) => {
                        if (!['moniepoint1', 'moniepoint3'].includes(payMethod)) {
                            return (
                                <button
                                    key={payMethod}
                                    className={`payment-method-btn ${method === payMethod ? 'active' : ''}`}
                                    disabled={paymentDetails['cash'].amount}
                                    onClick={() => {
                                        setMethod(payMethod)
                                        if (payMethod === 'cash') {
                                            setCashAmount(currentOrder.totalSales - paymentSum)
                                        } else {
                                            setCashAmount(0)
                                        }
                                    }}
                                >
                                    {payMethod.toUpperCase()}
                                </button>
                            )
                        }
                    })}
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
                {method !== 'cash' && Number(paymentDetails[method].amount) > 0 && (
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
                {Number(paymentDetails[method].amount) > 0 && (
                    <div className="form-group">
                        <label>Payment Post:</label>
                        <select
                            type="text"
                            name='salesPost'
                            value={paymentDetails[method]['salesPost']}
                            onChange={(e) => handleAmountChange(e)}
                            disabled={true}
                            readOnly
                        >
                            <option value=''>Payment Post</option>
                            <option value='multiple'>{'multiple'}</option>
                            <option value={wrh}>{wrh}</option>
                            <option value={'kitchen'}>{'kitchen'}</option>
                        </select>
                    </div>
                )}

                <div className="modal-actions">
                    <button
                        className="modal-btn cancel"
                        diabled={loading}
                        onClick={() => {
                            setPaymentDetails({ ...payPoints })
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

const OrdersModal = ({
    tableOrders,
    wrh,
    handleOrderSelect,
    setShowOrdersModal,
    curPosSettings,
    wrhCategories,
    handleCancelDelivery,
    tables,
    currentOrder,
    setCurrentOrder,
    createNewOrder,
    curSession,
    employees,
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

    const [cancelling, setCancelling] = useState(false);

    const handleCancelOrder = async (order) => {
        if (order.delivery !== 'completed' || curPosSettings?.type === 'shop') {
            
            const cancelOrder = window.confirm(
                `Are you sure you want to Cancel Order #${order.orderNumber}?`
            );
            if (!cancelOrder) return;

            setCancelling(true);
            setAlertState('info');
            setAlert('Cancelling Order...');
            setAlertTimeout(5000);

            try {
                // 1) Build cancelled order object
                const cancelledOrder = {
                    ...order,
                    status: 'cancelled',
                    cancelledBy: companyRecord.emailid,
                    cancelledAt: new Date().getTime(),
                };

                // 2) Update order locally (IndexedDB + React state)
                if (company && companyRecord?.emailid) {
                    await putOrder(company, companyRecord.emailid, cancelledOrder);
                }

                setCurrentOrder((curr) =>
                    curr && curr.orderNumber === order.orderNumber
                        ? cancelledOrder
                        : curr
                );
                // update tables’ order list in parent
                // (tableOrders in parent is passed down, but we can safely update
                //  via a setter in parent; here we only have local view, so we
                //  just close modal and rely on parent refresh)

                // 3) Update table.activeTables locally
                const prevTable = tables.find(
                    (table) => table['wrh'] === wrh
                );
                if (prevTable) {
                    const updatedTable = {
                        ...prevTable,
                        activeTables: (prevTable.activeTables || []).filter(
                            (tableOrder) =>
                                !(
                                    tableOrder.tableId === order.tableId &&
                                    tableOrder.sessionId === order.sessionId &&
                                    tableOrder.orderNumber === order.orderNumber
                                )
                        ),
                    };

                    if (company && companyRecord?.emailid) {
                        await putTable(
                            company,
                            companyRecord.emailid,
                            updatedTable
                        );
                    }

                    // We don’t have setTables here; parent POS already updates
                    // tables via other flows. It is okay to rely on refresh or
                    // on parent’s state changes. We still queue table change.

                    if (company && companyRecord?.emailid) {
                        const change = {
                            entityType: 'table',
                            op: 'update',
                            clientId: updatedTable.i_d,
                            payload: updatedTable,
                        }
                        if (curPosSettings?.type === 'restaurant'){
                            queuePendingChange(company, companyRecord.emailid, change);
                        }else{
                            try {
                                await processChange(change, company, fetchServer, server);
                            }catch (e){
                                console.log(e)
                            }
                        }
                    }
                }

                // 4) Queue order cancellation
                if (company && companyRecord?.emailid) {
                    setAlertTimeout(20);
                    const change = {
                        entityType: 'order',
                        op: 'update',
                        clientId: order.orderNumber,
                        payload: {
                            orderNumber: order.orderNumber,
                            status: 'cancelled',
                            cancelledBy: companyRecord.emailid,
                            cancelledAt: Date.now(),
                        },
                    }
                    if (curPosSettings?.type === 'restaurant'){
                        queuePendingChange(company, companyRecord.emailid, change);
                    }else{
                        await processChange(change, company, fetchServer, server);
                    }
                    // Immediate sync attempt – failures are fine, queue remains
                    try {
                        await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                        setAlert('Order cancelled successfully');
                        setAlertState('success');
                        setAlertTimeout(1000);
                    } catch (e) {
                        // Leave pending changes in queue; 5‑minute auto-sync will retry
                    }
                }

                // 5) Local success
                setAlertState('success');
                setAlert('Order cancelled successfully');
                setAlertTimeout(1000);

                if (curPosSettings?.type === 'shop' || order.status === 'completed'){
                    handleCancelDelivery(order)
                }

                if (currentOrder?.orderNumber === order.orderNumber) {
                    createNewOrder({
                        i_d: currentOrder.tableId,
                        name: currentOrder.tableName,
                    });
                }

                setCancelling(false);
                setShowOrdersModal(false);
                return;
            } catch (e) {
                setAlertState('error');
                setAlert('Error cancelling order locally');
                setAlertTimeout(3000);
                setCancelling(false);
                return;
            }
        } else {
            setAlertState('error');
            setAlert('Please Cancel Delivery First Before Cancelling Order!');
            setAlertTimeout(3000);
            setCancelling(false);
            return;
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content orders-modal">
                <div className="modal-header">
                    <h3>All Orders</h3>
                    <button
                        disabled={cancelling}
                        onClick={() => setShowOrdersModal(false)}
                    >
                        ×
                    </button>
                </div>
                <div className="orders-list">
                    {tableOrders?.map((order) => (
                        <div
                            key={order.i_d}
                            className={`order-card ${order.status}`}
                        >
                            <div onClick={() => handleOrderSelect(order)}>
                                <div>Order: #{order.orderNumber}</div>
                                <div>Table: {order.tableId}</div>
                                <div>Total: ₦{order.totalSales}</div>
                                <div>Status: {order.status}</div>
                                <div>Delivery: {order.delivery || 'pending'}</div>
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
                                    'edit_pos_order'
                                )) &&
                                !['cancelled', 'completed'].includes(
                                    order.status
                                ) && (
                                    <button
                                        className="edit-order-btn"
                                        onClick={() => {
                                            var totalItems = 0
                                            var deliveredQuantity = 0
                                            const deliveredItems = order.items.filter((item) => {
                                                if (wrhCategories[wrh].includes(item.category)) {
                                                    totalItems += Number(item.quantity)
                                                    deliveredQuantity += Number(item?.deliveredQuantity || 0)
                                                    return Number(item?.deliveredQuantity || 0) > 0
                                                }
                                            })
                                            if (deliveredQuantity){
                                                handleCancelDelivery(order, 'edit')
                                            }
                                            
                                            const orderToEdit = {
                                                ...(currentOrder?.orderNumber === order.orderNumber ? currentOrder : order),
                                                status: 'edit'
                                            }
                                            handleOrderSelect(orderToEdit, 'edit')
                                        }}
                                        title="Edit Order"
                                    >
                                        Edit
                                    </button>
                                )
                            }
                            {(companyRecord?.status === 'admin' ||
                                companyRecord?.permissions.includes(
                                    'cancel_pos_order'
                                )) &&
                                !['cancelled', 'completed'].includes(
                                    order.status
                                ) && (
                                    <button
                                        disabled={cancelling}
                                        className="cancel-order-btn"
                                        onClick={() => handleCancelOrder(order)}
                                        title="Cancel Order"
                                    >
                                        🗑️
                                    </button>
                                )
                            }
                            {(companyRecord?.status === 'admin' ||
                                companyRecord?.permissions.includes(
                                    'cancel_paid_orders'
                                )) &&
                                ['completed'].includes(
                                    order.status
                                ) && (
                                    <button
                                        disabled={cancelling}
                                        className="edit-order-btn"
                                        onClick={() => handleCancelOrder(order)}
                                        title="Cancel Order"
                                    >
                                        Cancel Order
                                    </button>
                                )
                            }
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const POSDashboard = ({
    sessions, allSalesSessions, setAllSalesSessions, profiles, employees, companyRecord,
    isLive, liveErrorMessages, sessionEnded, setEndSession, setStartSession, mergeAndPersistOrders, mergeAndPersistSessions,
    setViewSessions, allSessions, setAllSessions, deliverySessions, setDeliverySessions, setAllSessionOrders, setSessionUser, getSessionEnd,
    setWrh, posWrhAccess, allSessionOrders, getSessionSales, curSession,
    setAlertState, setAlert, setAlertTimeout, fetchTables, tables, wrhCategories
}) => {
    const { fetchServer, server, company, wrhs } = useContext(ContextProvider);

    const [pendingSessions, setPendingSessions] = useState([]);
    const [showReports, setShowReports] = useState(false);
    const [stableSalesSessions, setStableSalesSessions] = useState([]);
    const [filteredSessions, setFilteredSessions] = useState(null);
    const [sessionsState, setSessionsState] = useState('general');

    const [showPendingModal, setShowPendingModal] = useState(false);
    const [pendingChanges, setPendingChanges] = useState([]);
    const [pendingLoading, setPendingLoading] = useState(false);
    const [pendingError, setPendingError] = useState(null);

    useEffect(() => {
        const isAdminUser = companyRecord?.access === 'admin'
        if (!Array.isArray(filteredSessions)) {
            var pendingSessions = allSessions.filter((session) => {
                return (session.employee_id !== (isAdminUser ? companyRecord?.emailid : 'theplantainplanet22@gmail.com') &&
                    session.active && (getSessionEnd(new Date().getTime()) > getSessionEnd(session.start))
                )
            })
            // console.log(curSession)
            setPendingSessions(pendingSessions)
        } else {
            setPendingSessions([])
        }
    }, [stableSalesSessions, filteredSessions])


    useEffect(() => {
        if (allSalesSessions?.length && Array.isArray(allSalesSessions)) {
            setStableSalesSessions(allSalesSessions)
        }
        // const getSessionsData = async ()=>{
        //     const orderDays = 50 * 24 * 60 * 60 * 1000
        //     const allowedFromDays = Date.now() - orderDays
        //     const ordersResponse = await fetchServer("POST", {
        //         database: company,
        //         collection: "Orders",
        //         prop: {createdAt: {$gte: allowedFromDays}}
        //     }, "getDocsDetails", server); 
        //     if(!ordersResponse.err){
        //         if (Array.isArray(ordersResponse.record)){
        //             mergeAndPersistOrders(ordersResponse.record)
        //         }
        //     }
        // }
        // getSessionsData()
    }, [allSalesSessions])

    useEffect(() => {
        (async () => {
            const sessionDays = 50 * 24 * 60 * 60 * 1000
            const allowedFromDays1 = Date.now() - sessionDays
            const sessionsResponse = await fetchServer("POST", {
                database: company,
                collection: "POSSessions",
                prop: {
                    type: 'sales',
                    start: { $gte: allowedFromDays1 }
                }
            }, "getDocsDetails", server);
            if (!sessionsResponse.err && Array.isArray(sessionsResponse.record)) {
                setStableSalesSessions(sessionsResponse.record)
                mergeAndPersistSessions(sessionsResponse.record)
            }
        })()
    }, [])

    const loadPendingOfflineChanges = async () => {
        if (!company || !companyRecord?.emailid) return;
        setPendingLoading(true);
        setPendingError(null);
        try {
            const list = await loadPendingChanges(company, companyRecord.emailid);
            setPendingChanges(list);
        } catch (e) {
            setPendingError('Could not load offline changes');
        } finally {
            setPendingLoading(false);
        }
    };

    const showPendingSessionAlert = () => {
        setAlertState('error')
        setAlert('Please End All Other Sessions Before Starting A New One!')
        setAlertTimeout(3000)
    }

    return (
        <>
            <div className='pos-sessions'>
                <div className='pos-sessions-nav'>
                    <div className={'live-nav'}>
                        {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('export_pos_report')) && <select
                            className="action-btn"
                            value={sessionsState}
                            onChange={(e) => {
                                const val = e.target.value
                                setSessionsState(val)
                                if (val === 'general') {
                                    setFilteredSessions(null)
                                }
                            }}
                            style={{ marginRight: '10px' }}
                            disabled={!companyRecord?.status === 'admin' && !companyRecord?.permissions.includes('edit_ended_sessions')}
                        >
                            <option value={'general'}>General</option>
                            <option value={'edit'}>Edit</option>
                        </select>}
                        {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('export_pos_report')) && <button
                            className="action-btn"
                            onClick={() => setShowReports(true)}
                            style={{ marginRight: '10px' }}
                        >
                            View Reports
                        </button>}
                        {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('access_pos_sessions')) && <button
                            className="action-btn"
                            onClick={() => {
                                var wrhAccess = Object.keys(posWrhAccess).filter((wrh) => {
                                    return posWrhAccess[wrh]
                                })
                                setWrh(wrhAccess[0])
                                setViewSessions(false)
                                fetchTables(company)
                            }}
                            style={{ marginRight: '10px' }}
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
                        {profiles?.map((profile) => {
                            if (profile.status !== 'admin' || companyRecord.status === 'admin') {
                                var hasPosSalesAccess = false
                                let wrhsPosObj = {}
                                let wrhsDeliveryObj = {}
                                wrhs.forEach((wrh) => {
                                    if (wrh.purchase) return
                                    wrhsPosObj[wrh.name] = (profile.permissions.includes(`pos_${wrh.name}`) || profile.permissions.includes('all'))
                                    wrhsDeliveryObj[wrh.name] = (profile.permissions.includes(`delivery_${wrh.name}`) || profile.permissions.includes('all'))
                                })
                                const userSalesWrhAccess = { ...wrhsPosObj }
                                Object.keys(userSalesWrhAccess).forEach((wrh) => {
                                    if (userSalesWrhAccess[wrh]) {
                                        hasPosSalesAccess = true
                                        return
                                    }
                                })
                                if ((profile?.permissions.includes('pos') && hasPosSalesAccess) || profile?.permissions.includes('all')) {
                                    const { firstName, lastName } = ((profile.status === 'admin' && profile.access === 'admin') ? {
                                        firstName: 'Admin', lastName: ''
                                    } : employees.find(employee => { return employee.i_d === profile.emailid }))

                                    const employeeSessions = (filteredSessions || stableSalesSessions)?.filter(session => {
                                        return (
                                            session.employee_id === profile.emailid
                                        )
                                    }).sort((a, b) => a.start - b.start)
                                    var employeeSession = null
                                    var sessionLive = false
                                    if (employeeSessions.length > 0) {
                                        employeeSession = employeeSessions.find((session) => { return !session.end })
                                        if ([null, undefined].includes(employeeSession)) {
                                            employeeSession = employeeSessions[employeeSessions.length - 1]
                                        }
                                        if (((new Date().getTime()) >= getSessionEnd(employeeSession.start)) || employeeSession.end) {
                                            sessionLive = false
                                        } else {
                                            sessionLive = true
                                        }
                                    }
                                    return (
                                        <div className='pos-sessions-card' key={profile.emailid}>
                                            <span className='pos-sessions-card-name'>{`${firstName} ${lastName} ${employeeSession ? `(${employeeSession.wrh})` : ''}`}</span>
                                            <span className='pos-sessions-card-time'>{([null, undefined].includes(employeeSession)) ? 'No Sessions' : (sessionLive ? `Started: ${new Date(employeeSession.start).toLocaleString()}` : (employeeSession.end ? `Ended: ${new Date(employeeSession.end).toLocaleString()}` : `Started: ${new Date(employeeSession.start).toLocaleString()}`))}</span>
                                            <div>
                                                <h4 className='pos-sessions-card-status'>{([null, undefined].includes(employeeSession)) ? 'No Sessions' : (sessionLive ? 'Session Live' : 'Session Ended')}</h4>
                                                <div
                                                    className='pos-sessions-card-action'
                                                    onClick={() => {
                                                        if (profile.status !== 'admin' || companyRecord.status === 'admin') {
                                                            var viewModal = true
                                                            const validateUserSession = async () => {
                                                                if (!allSessionOrders.length) {
                                                                    viewModal = false
                                                                    setAlertState('info')
                                                                    setAlert('Could not Calculate Orders. Please try again in a few moment, while we fetch them for you!')
                                                                    setAlertTimeout(3000)
                                                                    const orderDays = 50 * 24 * 60 * 60 * 1000
                                                                    const allowedFromDays = Date.now() - orderDays
                                                                    const ordersResponse = await fetchServer("POST", {
                                                                        database: company,
                                                                        collection: "Orders",
                                                                        prop: {
                                                                            createdAt: { $gte: allowedFromDays }
                                                                        }
                                                                    }, "getDocsDetails", server);
                                                                    if (ordersResponse.err) {
                                                                        setAlertState('error')
                                                                        setAlert('Could not load Orders. Please check your network connection!')
                                                                        setAlertTimeout(3000)
                                                                        return
                                                                    } else {
                                                                        if (ordersResponse.record && Array.isArray(ordersResponse.record)) {
                                                                            mergeAndPersistOrders(ordersResponse.record)
                                                                            setAlertState('info')
                                                                            setAlert('Orders Calculated. Please proceed with the ending of user session!')
                                                                            setAlertTimeout(3000)
                                                                        }
                                                                    }
                                                                } else {
                                                                    const allUserOrders = allSessionOrders.filter((order) => {
                                                                        return ((getSessionEnd(order.sessionId) === getSessionEnd(employeeSession.i_d)) && (order.handlerId === profile.emailid))
                                                                    })
                                                                    const {
                                                                        totalUnattendedSales,
                                                                        totalPendngDeliveries
                                                                    } = getSessionSales(allUserOrders)
                                                                    if (totalUnattendedSales) {
                                                                        viewModal = false
                                                                        setAlertState('error')
                                                                        setAlert('This User Has Incomplete Sale(s) Pending, they were neither delivered nor paid. Please resolve before proceeding!',)
                                                                        setAlertTimeout(3000)
                                                                    }
                                                                    if (totalPendngDeliveries) {
                                                                        viewModal = false
                                                                        setAlertState('error')
                                                                        setAlert('This User Still Has Pending Delivery(s) for Order(s) that have been paid for. Please place all deliveries before proceeding!',)
                                                                        setAlertTimeout(3000)
                                                                    }
                                                                }
                                                            }
                                                            if (sessionLive) {
                                                                validateUserSession()
                                                            } else {
                                                                if (![null, undefined].includes(employeeSession)) {
                                                                    if (!employeeSession.end) {
                                                                        validateUserSession()
                                                                    }
                                                                }
                                                            }
                                                            if (viewModal) {
                                                                if (sessionLive) {
                                                                    setSessionUser({
                                                                        profile: profile,
                                                                        curSession: employeeSession
                                                                    })
                                                                    setEndSession(true)
                                                                } else {
                                                                    setSessionUser({
                                                                        profile: profile,
                                                                    })
                                                                    if ([null, undefined].includes(employeeSession)) {
                                                                        if (pendingSessions.length) {
                                                                            showPendingSessionAlert()
                                                                        } else {
                                                                            if (!Array.isArray(filteredSessions)) {
                                                                                setWrh('')
                                                                                setStartSession(true)
                                                                            }
                                                                        }
                                                                    } else {
                                                                        if (employeeSession.end) {
                                                                            if (pendingSessions.length) {
                                                                                showPendingSessionAlert()
                                                                            } else {
                                                                                if (Array.isArray(filteredSessions)) {
                                                                                    setSessionUser({
                                                                                        profile: profile,
                                                                                        curSession: employeeSession
                                                                                    })
                                                                                    setEndSession(true)
                                                                                } else {
                                                                                    if (!Array.isArray(filteredSessions)) {
                                                                                        setWrh('')
                                                                                        setStartSession(true)
                                                                                    }
                                                                                }
                                                                            }
                                                                        } else {
                                                                            setSessionUser({
                                                                                profile: profile,
                                                                                curSession: employeeSession
                                                                            })
                                                                            setEndSession(true)
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        } else {
                                                            setAlertState('error')
                                                            setAlert('Only the Super Admin can interact with this Session!')
                                                            setAlertTimeout(3000)
                                                        }
                                                    }}
                                                >{sessionLive ? 'End Session' : ([null, undefined].includes(employeeSession) ? 'Start Session' : (employeeSession.end ? (Array.isArray(filteredSessions) ? 'End Session' : 'Start Session') : 'End Session'))}</div>
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
                        type="sales"
                        sessions={stableSalesSessions}
                        setFilteredSessions={(processedData) => {
                            if (sessionsState === 'edit') {
                                setFilteredSessions(processedData)
                            }
                        }}
                        orders={allSessionOrders}
                        tables={tables}
                        employees={employees}
                        onClose={() => setShowReports(false)}
                        wrhCategories={wrhCategories}
                    />
                )}
            </div>
        </>
    )
}