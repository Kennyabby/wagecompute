import React, { useState, useEffect, useContext } from 'react';
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
        settings, getDate, posWrhAccess
    } = useContext(ContextProvider);

    // Core States
    const [loading, setLoading] = useState(false);
    const [activeScreen, setActiveScreen] = useState('home');
    const [tables, setTables] = useState([]);
    const [orderTables, setOrderTables] = useState([]);
    const [sessions, setSessions] = useState(null);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [openingCash, setOpeningCash] = useState(0);
    const [bankBalance, setBankBalance] = useState(0);
    const [cashBalance, setCashBalance] = useState(0);
    const [startSession, setStartSession] = useState(false);
    const [endSession, setEndSession] = useState(false);
    const [curSession, setCurrSession] = useState(null);
    const [loadSession, setLoadSession] = useState(true);

    useEffect(()=>{
        storePath('pos')  
    },[storePath])

    // Order States
    const [currentOrder, setCurrentOrder] = useState({
        orderNumber: null,
        tableId: null,
        tableName: null,
        items: [],
        total: 0,
        status: 'pending'
    });
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
    const paymentDetail = {
        amount: 0,
        change: 0
    }
    const paymentDetailClone = structuredClone({paymentDetail})
    const payPoints = {
        'moniepoint1':{...paymentDetailClone.paymentDetail}, 'moniepoint2':{...paymentDetailClone.paymentDetail}, 
        'moniepoint3':{...paymentDetailClone.paymentDetail}, 'moniepoint4':{...paymentDetailClone.paymentDetail}, 'cash':{...paymentDetailClone.paymentDetail}
    }
    const [paymentDetails, setPaymentDetails] = useState({...payPoints});

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

    useEffect(() => {
        handleCategoryFilter();
    }, [activeCategory, products]);

    useEffect(()=> {
         loadInitialData()
    },[settings])

    useEffect(()=>{
        // console.log(posWrhAccess)
    },[posWrhAccess])
    useEffect(()=>{
        if (tables.length && wrh){
            setOrderTables((orderTables)=>{
                const activeTables = []
                wrhs.forEach((warehouse)=>{
                    tables[warehouse]?.activeTables?.forEach((activeTable)=>{
                        activeTables.concat(activeTable)
                    })
                })
                orderTables.forEach((orderTable)=>{
                    const myTableOrders = []
                    const otherTableOrders  = []
                    activeTables.forEach((activeTable)=>{
                        if (
                            activeTable.tableId === orderTable.i_d &&
                            activeTable.sessionId === curSession.i_d &&
                            activeTable.handlerId === companyRecord.emailid &&
                            activeTable.wrh === wrh
                        ){
                            myTableOrders.concat(activeTable)
                        }else{
                            otherTableOrders.concat(activeTable)
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
                    
                })
                return [...orderTables]
            })
        }
    },[tables,wrh])
    const getOrderSales = (orders) =>{
        let bankSales = 0
        let cashSales = 0
        orders.forEach((order)=>{
            if (order.payment.method === 'cash'){
                cashSales += order.total
            } else {
                bankSales += order.total
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
            } else {
                setAlertState('success');
                setAlert('Welcome Back!');
                setStartSession(false)
                setCurrSession(newSession)
                setSessions([...sessions, newSession]);
            }
        }else{
            setAlert('info')
            setAlert('Please Select Your Sales Post')
            setAlertTimeout(5000)
        }
    }

    const stopSession = async (session, sessionOrders)=>{
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
                debtDue: netBalance < 0 ? netBalance : 0
            }]
        }, "updateOneDoc", server);
    
        if (response.err) {
            setAlertState('error');
            setAlert('Could not end session. Please check your internet connection!');
        } else {
            setAlertState('success');
            setAlert('Session Ended!');
            setEndSession(false)
            setStartSession(true)
            setAlertTimeout(5000)
            // setSessions([...sessions, response.record[0]]);
        }
    }

    const UpdateSessionState = (sessions, loadSession)=>{
        if (!loadSession && sessions?.length){            
            const previousSession = sessions.filter((session)=> session.active)
            if (previousSession.length){
                setCurrSession(previousSession[0])
                if(getDate(previousSession[0].start) !== getDate(new Date().getTime())){                
                    setStartSession(false)
                    setEndSession(true)
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
         // Fetch tables
         loadTableData()
        const tablesResponse = await fetchServer("POST", {
            database: company,
            collection: "Tables"
        }, "getDocsDetails", server);

        // Fetch products
        const productsResponse = await fetchServer("POST", {
            database: company,
            collection: "Products"
        }, "getDocsDetails", server);

        const sessionsResponse = await fetchServer("POST", {
            database: company,
            collection: "POSSessions",
            prop: {'employee_id': companyRecord.emailid}
        }, "getDocsDetails", server);
        if (curSession){
            const ordersResponse = await fetchServer("POST", {
                database: company,
                collection: "Orders",
                prop: { handlerId:companyRecord.emailid, sessionId: curSession.i_d,}
            }, "getDocsDetails", server);
            if(!ordersResponse.err){
                setAllOrders(ordersResponse.record) 
            }else{
                setAlertState('info');
                setAlert('Error Loading Session Data. Network is not stable!');
            }
        }

        if (!tablesResponse.err){
            setTables(tablesResponse.record)                
        }else{
            setAlertState('info');
            setAlert('Error Loading Session Data. Network is not stable!');
        }

        if(!productsResponse.err){
            setProducts(productsResponse.record)
        }else{
            setAlertState('info');
            setAlert('Error Loading Session Data. Network is not stable!');
        }

        if(!sessionsResponse.err){
            setAlertTimeout(5000)
            setSessions(sessionsResponse.record)
            setLoadSession(false)
            UpdateSessionState(sessionsResponse.record, false)
            // console.log('loadSession: ',false)
            // console.log(sessionsResponse.record)
        }else{
            setAlertState('info');
            setAlert('Error Loading Session Data. Network is not stable!');
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
            status: 'pending',
            createdAt: new Date().getTime()
        };
        setCurrentOrder(newOrder);
    };
    
    const handleTableSelect = async (table) => {
        if (table.status !== 'available') {
            setAlertState('error');
            setAlert('This table is not available');
            return;
        }
        // Fetch ALL orders for this table and session(removed status filter)
        setAlertState('info');
        setAlert('Loading table orders...');
        const response = await fetchServer("POST", {
            database: company,
            collection: "Orders",
            prop: { tableId: table.i_d, sessionId: curSession.i_d, wrh: wrh}
        }, "getDocsDetails", server);

        if (!response.err && response.record.length > 0) {
            setAlertTimeout(1000)
            // Store all table orders in state
            setTableOrders(response.record);
            // Set the most recent pending order as active, or create new one if none pending
            const pendingOrders = response.record.filter(order => order.status === 'pending');
            const ordersNumber = pendingOrders.length
            if (ordersNumber) {
                setCurrentOrder(pendingOrders[ordersNumber-1]);
            } else {
                createNewOrder(table);
            }
        } else {
            createNewOrder(table);
            setActiveScreen('order');
        }
    };

    const handleCreateTable = () => {
        setOrderTables((orderTables)=>{
            return [...orderTables, newTableData]
        })
    };

    const handleEditTable = (table) => {
        setEditingTable(table);
        setShowNewTableModal(true);
    };

    // const handleUpdateTable = async (updatedData) => {
    //     const tablesResponse = await fetchServer("POST", {
    //         database: company,
    //         collection: "Tables"
    //     }, "getDocsDetails", server);
    
    //     if (tablesResponse.err) {
    //         console.log('error')
    //         setAlertState('info');
    //         setAlert('Network not stable!');
    //     } else {
    //         setAlertTimeout(1000)
    //         setTables(tablesResponse.record)
    //         // loadInitialData();
    //     }
    // };

    // const updateTableStatus = async (tableId, status) => {
    //     const response = await fetchServer("POST", {
    //         database: company,
    //         collection: "Tables",
    //         prop: {
    //             i_d: tableId,
    //             status: status
    //         }
    //     }, "updateOneDoc", server);
    
    //     if (response.err) {
    //         setAlertState('error');
    //         setAlert('Error updating table status');
    //         setAlertTimeout(5000);
    //     } else {
    //         // Refresh tables after status update
    //         loadInitialData();
    //     }
    // };

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
        // Save the current order to database
        const activeTable = {
            tableId: currentOrder.tableId,
            sessionId: currentOrder.sessionId,
            handlerId: companyRecord.emailid,
            wrh: wrh,
        }
        const resp = await fetchServer("POST", {
            database: company,
            collection: "Tables",
            prop: [{'wrh':wrh}, {activeTables: [...tables[wrh]?.activeTables || [], activeTable]}]
        }, "updateOneDoc", server)
        if (resp.err){
            setAlertState('error');
            setAlert('Error updating table');
            return;
        }
    
        const response = await fetchServer("POST", {
            database: company,
            collection: "Orders",
            update: {...currentOrder}
        }, "createDoc", server);
    
        if (response.err) {
            setAlertState('error');
            setAlert('Error saving order');
            return;
        }
    
        // Update tableOrders state with the new order
        setTableOrders(prev => ([
            ...prev, currentOrder
        ]));
    
        setAlertState('success');
        setAlert('Order placed successfully');
        // View Payment Modal
        setShowPaymentModal(true);
        
    };
    // const handleNewOrder = () => {
    //     setCurrentOrder({
    //         orderNumber: generateOrderNumber(),
    //         tableId: null,
    //         tableName: null,
    //         items: [],
    //         total: 0,
    //         status: 'pending'
    //     });
    //     setActiveScreen('order');
    // };

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
        setCurrentOrder(order);
        setActiveScreen('order');
        setShowOrdersModal(false);
    
        // Update table orders if this is a table order
        // if (order.tableId) {
        //     setTableOrders(prev => ({
        //         ...prev,
        //         [order.tableId]: prev[order.tableId]?.map(o => 
        //             o.orderNumber === order.orderNumber ? order : o
        //         ) || [order]
        //     }));
        // }
    };

    // =========================================
    // 6. Payment Processing
    // =========================================
    const handlePayment = async () => {
        var totalPayment = 0
        var totalChange = 0
        Object.keys(paymentDetails).forEach((payPoint)=>{
            totalPayment += payPoint.amount
            totalChange += payPoint.change
        })
        if (totalPayment < currentOrder.totalSales) {
            setAlertState('error');
            setAlert('Insufficient payment amount');
            return;
        }

        const paymentData = {}
        Object.keys(paymentDetails).forEach((payPoint)=>{
            paymentData[payPoint] = Number(paymentDetails.amount)
        })
        const paymentDataUpdate = {
            ...paymentData,
            totalPayment: totalPayment,
            cashChange: Number(paymentDetails['cash'].change),
            status: 'completed'
        };

        const newOrder = {
            ...currentOrder,
            ...paymentDataUpdate
        }
        const resp = await fetchServer("POST", {
            database: company,
            collection: "Tables",
            prop: [{'wrh':wrh}, {activeTables: [
                ...tables[wrh].activeTables.filter((table)=>{return (
                    table.tableId !== currentOrder.tableId && 
                    table.sessionId !== currentOrder.sessionId &&
                    table.handlerId !== companyRecord.emailid
                )})
            ]}]
        }, "updateOneDoc", server)
        if (resp.err){
            setAlertState('error');
            setAlert('Error updating table');
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
        } else {
            printReceipt(newOrder);
            setAlertState('success');
            setAlert('Payment processed successfully');
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

    const renderSessionEntry = () => {

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
                                    onChange={(e) => setWrh(e.target.value)}
                                    disabled={loading}
                                >
                                    <option>Select Sales Post</option>
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
                                    value={sessions.find(session => session.active)?.totalBankSales || 0} 
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Total Cash Sales</label>
                                <input 
                                    type="number" 
                                    value={sessions.find(session => session.active)?.totalCashSales || 0} 
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label>Bank Balance</label>
                                <input 
                                    type="number" 
                                    value={bankBalance} 
                                    onChange={(e) => setBankBalance(parseFloat(e.target.value) || 0)} 
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label>Cash Balance</label>
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
                            <button 
                                className="remove-btn"
                                onClick={() => handleRemoveItem(item.id)}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
                {selectedProduct && renderKeypad()}
                <button 
                    className="place-order-btn"
                    onClick={() => handlePlaceOrder()}
                    disabled={!currentOrder.items.length}
                >
                    Place Order (₦{currentOrder.totalSales?.toFixed(2)})
                </button>
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

    // const renderTablesView = () => (
    //     <div className="pos-tables-view">
    //         <div className="tables-grid">
    //             <div 
    //                 className="add-table-box"
    //                 onClick={handleAddTableClick}
    //             >
    //                 <div className="plus-icon">+</div>
    //                 <div className="add-text">Add Table</div>
    //             </div>
    //             {[...orderTables]
    //                 .sort((a, b) => {
    //                     const numA = parseInt(a.name.replace(/[^0-9]/g, ''));
    //                     const numB = parseInt(b.name.replace(/[^0-9]/g, ''));
    //                     return numA - numB;
    //                 })
    //                 .map(table => (
    //                     <div 
    //                         key={table._id}
    //                         className={`table-card ${table.status}`}
    //                         onClick={() => handleTableSelect(table)}
    //                     >
    //                         <div className="table-name">{table.name}</div>
    //                         <div className="table-capacity">
    //                             <span>Capacity: {table.capacity}</span>
    //                         </div>
    //                         <div className={`table-status ${table.status}`}>
    //                             {table.status}
    //                         </div>
    //                         {tableOrders[table._id]?.length > 0 && (
    //                             <div className="order-count">
    //                                 {tableOrders[table._id].length}
    //                             </div>
    //                         )}
    //                     </div>
    //                 ))}
    //         </div>
    //     </div>
    // );

    const renderScreen = () => {
        switch (activeScreen) {
            case 'home':
                return (
                    <>
                        <div className='pos-wh-cover' onClick={(e)=>{
                            const name = e.target.getAttribute('name')
                            setWrh(name)
                        }}>
                            {
                                wrhs.map((wh, id)=>{
                                    if (!wh.purchase){
                                        return (posWrhAccess[wh.name] && <div key={id} className={'slprwh ' + (wrh === wh.name ? 'slprwh-clicked' : '')} name={wh.name}>{wh.name}</div>)
                                    }
                                })                        
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
                                            <div className="order-count">
                                                {table.activeOrders}
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

    const OrdersModal = () => (
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
                            onClick={() => handleOrderSelect(order)}
                        >
                            <div>Order #{order.orderNumber}</div>
                            <div>Table: {order.tableId}</div>
                            <div>Total: ₦{order.totalSales}</div>
                            <div>Status: {order.status}</div>
                            <div>{new Date(order.createdAt).toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const PaymentModal = () => {
        const [amount, setAmount] = useState('');
        const [method, setMethod] = useState('cash');
        const [change, setChange] = useState(0);

        const handleAmountChange = (value) => {

            setAmount(value);
            const amountNum = parseFloat(value) || 0;
            const changeAmount = amountNum - currentOrder.totalSales;
            setChange(changeAmount >= 0 ? changeAmount : 0);

            if (method === 'cash'){
                setPaymentDetails((paymentDetails)=>{
                    return {
                        ...paymentDetails, [method]: {...paymentDetails[method], amount: amountNum, change: changeAmount}
                    }
                })
            }else{
                setPaymentDetails((paymentDetails)=>{
                    return {
                        ...paymentDetails, [method]: {...paymentDetails[method], amount: amountNum}
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
                                onClick={() => setMethod(payMethod)}
                            >
                                {payMethod.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <div className="form-group">
                        <label>Total Amount: ₦{currentOrder.totalSales.toFixed(2)}</label>
                    </div>
                    <div className="form-group">
                        <label>Payment Amount:</label>
                        <input
                            type="number"
                            value={paymentDetails[method].amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            placeholder="Enter amount"
                        />
                    </div>
                    {method === 'cash' && amount && (
                        <div className="form-group">
                            <label>Change: ₦{paymentDetails[method].change.toFixed(2)}</label>
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
                            onClick={handlePayment}
                            disabled={!amount || parseFloat(amount) < currentOrder.totalSales}
                        >
                            Complete Payment
                        </button>
                    </div>
                </div>
            </div>
        );
    };

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
                    </div>
                    <div className="header-actions">
                        {/* {tableOrders?.length > 0 && (
                            <div className="order-switcher">
                                {tableOrders
                                    .sort((a, b) => b.createdAt - a.createdAt) // Sort by newest first
                                    .map(order => (
                                        <button
                                            key={order.orderNumber}
                                            className={`order-switch-btn ${order.orderNumber === currentOrder.orderNumber ? 'active' : ''} ${order.status}`}
                                            onClick={() => handleSwitchOrder(order)}
                                        >
                                            #{order.orderNumber}
                                            <span className="order-status">{order.status}</span>
                                        </button>
                                    ))}
                            </div>
                        )} */}
                        <button 
                            className="action-btn"
                            onClick={() => createNewOrder({ _id: currentOrder.tableId, name: currentOrder.tableName })}
                        >
                            New Order
                        </button>
                        <button 
                            className="action-btn"
                            onClick={() => setShowOrdersModal(true)}
                        >
                            All Orders
                        </button>
                        <button 
                            className="action-btn"
                            onClick={() => setActiveScreen('home')}
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
            {showOrdersModal && <OrdersModal />}
            {showPaymentModal && <PaymentModal />}
        </div>
    );
};

export default PointOfSales;