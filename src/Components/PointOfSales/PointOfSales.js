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
        fetchServer, server, company, 
        setAlert, setAlertState, setAlertTimeout,
        settings 
    } = useContext(ContextProvider);

    // Core States
    const [activeScreen, setActiveScreen] = useState('home');
    const [tables, setTables] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

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
    const [orders, setOrders] = useState([]);
    const [tableOrders, setTableOrders] = useState({});
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
    const [paymentDetails, setPaymentDetails] = useState({
        method: 'cash',
        amount: 0,
        change: 0
    });

    // Settings States
    const [uoms, setUoms] = useState([]);
    const [wrhs, setWrhs] = useState([]);

    // =========================================
    // 2. Effects and Data Loading
    // =========================================
    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        handleSettingsUpdate();
    }, [settings]);

    useEffect(() => {
        handleCategoryFilter();
    }, [activeCategory, products]);

    useEffect(()=> {
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
    },[settings])

    // =========================================
    // 3. Data Loading Functions
    // =========================================
    const loadInitialData = async () => {
        // Fetch tables
        const tablesResponse = await fetchServer("POST", {
            database: company,
            collection: "Tables"
        }, "getDocsDetails", server);

        // Fetch products
        const productsResponse = await fetchServer("POST", {
            database: company,
            collection: "Products"
        }, "getDocsDetails", server);

        if (tablesResponse.err || productsResponse.err) {
            setAlertState('error');
            setAlert('Error loading data');
            setAlertTimeout(5000);
            if (!tablesResponse.err){
                setTables(tablesResponse.record)                
            }
            if(!productsResponse.err){
                setProducts(productsResponse.record)
            }
        } else {
            setTables(tablesResponse.record);
            setProducts(productsResponse.record);
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
            tableName: table.name,
            items: [],
            total: 0,
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

        // Fetch ALL orders for this table (removed status filter)
        const response = await fetchServer("POST", {
            database: company,
            collection: "Orders",
            filter: { tableId: table.i_d }
        }, "getDocsDetails", server);

        if (!response.err && response.record.length > 0) {
            // Store all table orders in state
            setTableOrders({
                ...tableOrders,
                [table._id]: response.record
            });
            // Set the most recent pending order as active, or create new one if none pending
            const pendingOrder = response.record.find(order => order.status === 'pending');
            if (pendingOrder) {
                setCurrentOrder(pendingOrder);
            } else {
                createNewOrder(table);
            }
        } else {
            createNewOrder(table);
        }
        setActiveScreen('order');
    };

    const handleCreateTable = async () => {
        const response = await fetchServer("POST", {
            database: company,
            collection: "Tables",
            update: {
                ...newTableData,
                createdAt: new Date().getTime()
            }
        }, "createDoc", server);
    
        if (response.err) {
            setAlertState('error');
            setAlert('Error creating table');
        } else {
            setAlertState('success');
            setAlert('Table created successfully');
            loadInitialData(); // Refresh tables
            setShowNewTableModal(false);
        }
    };

    const handleEditTable = (table) => {
        setEditingTable(table);
        setShowNewTableModal(true);
    };

    const handleUpdateTable = async (updatedData) => {
        const response = await fetchServer("POST", {
            database: company,
            collection: "Tables",
            update: {
                ...editingTable,
                ...updatedData
            }
        }, "updateDoc", server);
    
        if (response.err) {
            setAlertState('error');
            setAlert('Error updating table');
        } else {
            setAlertState('success');
            setAlert('Table updated successfully');
            loadInitialData();
            setShowNewTableModal(false);
            setEditingTable(null);
        }
    };

    const updateTableStatus = async (tableId, status) => {
        const response = await fetchServer("POST", {
            database: company,
            collection: "Tables",
            update: {
                i_d: tableId,
                status: status
            }
        }, "updateDoc", server);
    
        if (response.err) {
            setAlertState('error');
            setAlert('Error updating table status');
            setAlertTimeout(5000);
        } else {
            // Refresh tables after status update
            loadInitialData();
        }
    };

    const getNextTableNumber = () => {
        const tableNumbers = tables
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
        const response = await fetchServer("POST", {
            database: company,
            collection: "Orders",
            update: currentOrder
        }, "createDoc", server);
    
        if (response.err) {
            setAlertState('error');
            setAlert('Error saving order');
            return;
        }
    
        // Update tableOrders state with the new order
        setTableOrders(prev => ({
            ...prev,
            [currentOrder.tableId]: [...(prev[currentOrder.tableId] || []), response.record]
        }));
    
        setAlertState('success');
        setAlert('Order placed successfully');
        
        // Create new order for the same table
        createNewOrder({ i_d: currentOrder.tableId, name: currentOrder.tableName });
    };
    const handleNewOrder = () => {
        setCurrentOrder({
            orderNumber: generateOrderNumber(),
            tableId: null,
            tableName: null,
            items: [],
            total: 0,
            status: 'pending'
        });
        setActiveScreen('order');
    };

    // Update the handleAddItem function to separate selection from adding
    const handleAddItem = (product, quantity = 1) => {
        if (!product) return;

        const existingItem = currentOrder.items.find(item => item.i_d === product.i_d);
        let updatedItems;
    
        if (existingItem) {
            updatedItems = currentOrder.items.map(item =>
                item.i_d === product.i_d 
                    ? { ...item, quantity: quantity ? item.quantity + quantity : item.quantity + 1 }
                    : item
            );
        } else {
            updatedItems = [...currentOrder.items, { 
                ...product,
                id: product.i_d,
                quantity: quantity || 1
            }];
        }
    
        setCurrentOrder({
            ...currentOrder,
            items: updatedItems,
            total: calculateTotal(updatedItems)
        });
    };

    const handleRemoveItem = (itemId) => {
        const updatedItems = currentOrder.items.filter(item => item.id !== itemId);
        setCurrentOrder({
            ...currentOrder,
            items: updatedItems,
            total: calculateTotal(updatedItems)
        });
    };

    const handleSwitchOrder = (order) => {
        setCurrentOrder(order);
    };

    const calculateTotal = (items) => {
        return items.reduce((sum, item) => sum + (item.salesPrice * item.quantity), 0);
    };

    const handleOrderSelect = (order) => {
        setCurrentOrder(order);
        setActiveScreen('order');
        setShowOrdersModal(false);
    
        // Update table orders if this is a table order
        if (order.tableId) {
            setTableOrders(prev => ({
                ...prev,
                [order.tableId]: prev[order.tableId]?.map(o => 
                    o.orderNumber === order.orderNumber ? order : o
                ) || [order]
            }));
        }
    };

    // =========================================
    // 6. Payment Processing
    // =========================================
    const handlePayment = async () => {
        if (paymentDetails.amount < currentOrder.total) {
            setAlertState('error');
            setAlert('Insufficient payment amount');
            return;
        }

        const orderData = {
            ...currentOrder,
            payment: {
                ...paymentDetails,
                paidAt: new Date().getTime()
            },
            status: 'completed'
        };

        const response = await fetchServer("POST", {
            database: company,
            collection: "Orders",
            update: orderData
        }, "createDoc", server);

        if (response.err) {
            setAlertState('error');
            setAlert('Error processing payment');
        } else {
            printReceipt(orderData);
            setAlertState('success');
            setAlert('Payment processed successfully');
            setShowPaymentModal(false);
            setActiveScreen('home');
            // Update table status if it's a dine-in order
            if (orderData.tableId) {
                updateTableStatus(orderData.tableId, 'available');
            }
        }
    };

    const printReceipt = (orderData) => {
        const receiptContent = `
            <div class="receipt">
                <h2>${company}</h2>
                <p>Order #${orderData._id}</p>
                <p>Date: ${new Date().toLocaleString()}</p>
                <hr/>
                ${orderData.items.map(item => `
                    <div class="receipt-item">
                        <span>${item.name} x ${item.quantity}</span>
                        <span>₦${(item.salesPrice * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                <hr/>
                <div class="receipt-total">
                    <p>Subtotal: ₦${orderData.total.toFixed(2)}</p>
                    <p>Tax: ₦${(orderData.total * 0.1).toFixed(2)}</p>
                    <p>Total: ₦${(orderData.total * 1.1).toFixed(2)}</p>
                    <p>Paid: ₦${orderData.payment.amount}</p>
                    <p>Change: ₦${orderData.payment.change}</p>
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
                            <span>₦{item.salesPrice * item.quantity}</span>
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
                    onClick={() => setShowPaymentModal(true)}
                    disabled={!currentOrder.items.length}
                >
                    Place Order (₦{currentOrder.total.toFixed(2)})
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
                            <div className="product-price">₦{product.salesPrice}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderTablesView = () => (
        <div className="pos-tables-view">
            <div className="tables-grid">
                <div 
                    className="add-table-box"
                    onClick={handleAddTableClick}
                >
                    <div className="plus-icon">+</div>
                    <div className="add-text">Add Table</div>
                </div>
                {[...tables]
                    .sort((a, b) => {
                        const numA = parseInt(a.name.replace(/[^0-9]/g, ''));
                        const numB = parseInt(b.name.replace(/[^0-9]/g, ''));
                        return numA - numB;
                    })
                    .map(table => (
                        <div 
                            key={table._id}
                            className={`table-card ${table.status}`}
                            onClick={() => handleTableSelect(table)}
                        >
                            <div className="table-name">{table.name}</div>
                            <div className="table-capacity">
                                <span>Capacity: {table.capacity}</span>
                            </div>
                            <div className={`table-status ${table.status}`}>
                                {table.status}
                            </div>
                            {tableOrders[table._id]?.length > 0 && (
                                <div className="order-count">
                                    {tableOrders[table._id].length}
                                </div>
                            )}
                        </div>
                    ))}
            </div>
        </div>
    );

    const renderScreen = () => {
        switch (activeScreen) {
            case 'home':
                return (
                    <div className="pos-tables-layout">
                        <div 
                            className="add-table-box"
                            onClick={handleAddTableClick}
                        >
                            <div className="plus-icon">+</div>
                            <div className="add-text">Add Table</div>
                        </div>
                        {[...tables]
                            .sort((a, b) => {
                                const numA = parseInt(a.name.replace(/[^0-9]/g, ''));
                                const numB = parseInt(b.name.replace(/[^0-9]/g, ''));
                                return numA - numB;
                            })
                            .map(table => (
                                <div 
                                    key={table._id}
                                    className={`pos-table ${table.status}`}
                                    onClick={() => handleTableSelect(table)}
                                >
                                    {table.name}
                                    {tableOrders[table._id]?.length > 0 && (
                                        <div className="order-count">
                                            {tableOrders[table._id].length}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
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
                    {orders.map(order => (
                        <div 
                            key={order.i_d}
                            className={`order-card ${order.status}`}
                            onClick={() => handleOrderSelect(order)}
                        >
                            <div>Order #{order.i_d}</div>
                            <div>Table: {order.tableId}</div>
                            <div>Total: ₦{order.total}</div>
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
            const changeAmount = amountNum - currentOrder.total;
            setChange(changeAmount >= 0 ? changeAmount : 0);
        };

        const handlePayment = async () => {
            if (parseFloat(amount) < currentOrder.total) {
                setAlertState('error');
                setAlert('Insufficient payment amount');
                return;
            }

            const paymentData = {
                method,
                amount: parseFloat(amount),
                change: change,
                paidAt: new Date().getTime()
            };

            const orderData = {
                ...currentOrder,
                payment: paymentData,
                status: 'completed'
            };

            const response = await fetchServer("POST", {
                database: company,
                collection: "Orders",
                update: orderData
            }, "createDoc", server);

            if (response.err) {
                setAlertState('error');
                setAlert('Error processing payment');
            } else {
                // Update table status if it's a dine-in order
                if (currentOrder.tableId) {
                    await updateTableStatus(currentOrder.tableId, 'available');
                }
                
                printReceipt(orderData);
                setAlertState('success');
                setAlert('Payment processed successfully');
                setShowPaymentModal(false);
                setActiveScreen('home');
                setCurrentOrder({
                    tableId: null,
                    items: [],
                    total: 0,
                    status: 'pending'
                });
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
                        {['cash', 'card', 'mobile'].map(payMethod => (
                            <button
                                key={payMethod}
                                className={`payment-method-btn ${method === payMethod ? 'active' : ''}`}
                                onClick={() => setMethod(payMethod)}
                            >
                                {payMethod.charAt(0).toUpperCase() + payMethod.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="form-group">
                        <label>Total Amount: ₦{currentOrder.total.toFixed(2)}</label>
                    </div>
                    <div className="form-group">
                        <label>Payment Amount:</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            placeholder="Enter amount"
                        />
                    </div>
                    {method === 'cash' && amount && (
                        <div className="form-group">
                            <label>Change: ₦{change.toFixed(2)}</label>
                        </div>
                    )}
                    <div className="modal-actions">
                        <button 
                            className="modal-btn cancel"
                            onClick={() => setShowPaymentModal(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="modal-btn save"
                            onClick={handlePayment}
                            disabled={!amount || parseFloat(amount) < currentOrder.total}
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
            {activeScreen === 'order' && (
                <div className="pos-mini-header">
                    <div className="header-info">
                        <span className="table-name">{currentOrder.tableName}</span>
                        {currentOrder.orderNumber && (
                            <span className="order-number">#{currentOrder.orderNumber}</span>
                        )}
                    </div>
                    <div className="header-actions">
                        {tableOrders[currentOrder.tableId]?.length > 0 && (
                            <div className="order-switcher">
                                {tableOrders[currentOrder.tableId]
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
                        )}
                        <button 
                            className="action-btn"
                            onClick={() => createNewOrder({ _id: currentOrder.tableId, name: currentOrder.tableName })}
                        >
                            New Order
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