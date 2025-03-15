import React, { useState, useEffect, useContext } from 'react';
import ContextProvider from '../../Resources/ContextProvider';
import './PointOfSales.css';

const PointOfSales = () => {
    const { fetchServer, server, company, setAlert, setAlertState, setAlertTimeout } = useContext(ContextProvider);

    // State management
    const [activeScreen, setActiveScreen] = useState('home'); // home, order, payment
    const [tables, setTables] = useState([]);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [currentOrder, setCurrentOrder] = useState({
        tableId: null,
        items: [],
        total: 0,
        status: 'pending' // pending, in-progress, completed
    });
    const [quantity, setQuantity] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showNewTableModal, setShowNewTableModal] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const [filteredProducts, setFilteredProducts] = useState([]);

    // Fetch initial data
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        // Fetch tables
        const tablesResponse = await fetchServer("POST", {
            database: company,
            collection: "Tables"
        }, "getDocsDetails", server);

        // Fetch menu categories
        const categoriesResponse = await fetchServer("POST", {
            database: company,
            collection: "Categories"
        }, "getDocsDetails", server);

        // Fetch products
        const productsResponse = await fetchServer("POST", {
            database: company,
            collection: "Products"
        }, "getDocsDetails", server);

        if (tablesResponse.err || categoriesResponse.err || productsResponse.err) {
            setAlertState('error');
            setAlert('Error loading data');
            setAlertTimeout(5000);
            if (!tablesResponse.err){
                setTables(tablesResponse.record)                
            }
            if(!categoriesResponse.err){
                setCategories(categoriesResponse.record)
            }
            if(!productsResponse.err){
                setProducts(productsResponse.record)
            }
        } else {
            setTables(tablesResponse.record);
            setCategories(categoriesResponse.record);
            setProducts(productsResponse.record);
        }
    };

    useEffect(() => {
        if (activeCategory) {
            const filtered = products.filter(product => product.categoryId === activeCategory);
            setFilteredProducts(filtered);
        } else {
            setFilteredProducts(products);
        }
    }, [activeCategory, products]);

    const handleTableSelect = (tableId) => {
        setCurrentOrder({
            ...currentOrder,
            tableId
        });
        setActiveScreen('order');
    };

    const handleAddItem = (product, quantity = 1) => {
        const updatedItems = [...currentOrder.items];
        const existingItem = updatedItems.find(item => item.id === product.i_d);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            updatedItems.push({
                id: product.i_d,
                name: product.name,
                salesPrice: product.salesPrice,
                quantity: quantity
            });
        }

        setCurrentOrder({
            ...currentOrder,
            items: updatedItems,
            total: calculateTotal(updatedItems)
        });
    };

    const handleKeypadClick = (value) => {
        if (value === 'C') {
            setQuantity('');
        } else if (value === 'Enter') {
            if (selectedProduct && quantity) {
                handleAddItem(selectedProduct, parseInt(quantity));
                setQuantity('');
                setSelectedProduct(null);
            }
        } else {
            setQuantity(prev => prev + value);
        }
    };

    const handleCategoryClick = (categoryId) => {
        setActiveCategory(categoryId === activeCategory ? null : categoryId);
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
                    onClick={() => handleKeypadClick('Enter')}
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
                            <span>${item.salesPrice * item.quantity}</span>
                        </div>
                    ))}
                </div>
                {renderKeypad()}
            </div>
            <div className="products-panel">
                <div className="categories-bar">
                    {categories.map(category => (
                        <button 
                            key={category.id}
                            className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
                            onClick={() => handleCategoryClick(category.id)}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
                <div className="products-grid">
                    {filteredProducts.map(product => (
                        <div 
                            key={product.id}
                            className="product-card"
                            onClick={() => setSelectedProduct(product)}
                        >
                            <img 
                                src={product.image || 'default-product.png'}
                                alt={product.name}
                                className="product-image"
                            />
                            <div className="product-name">{product.name}</div>
                            <div className="product-price">${product.salesPrice}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const calculateTotal = (items) => {
        return items.reduce((sum, item) => sum + (item.salesPrice * item.quantity), 0);
    };

    const renderScreen = () => {
        switch (activeScreen) {
            case 'home':
                return (
                    <div className="tables-layout">
                        {tables.map(table => (
                            <div 
                                key={table.id}
                                className={`table ${table.status}`}
                                onClick={() => handleTableSelect(table.id)}
                            >
                                {table.name}
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

    return (
        <div className="pos-container">
            <div className="pos-header">
                <h2>Point of Sale</h2>
                <div className="nav-buttons">
                    <button onClick={() => setActiveScreen('home')}>Tables</button>
                    <button onClick={() => setActiveScreen('order')}>Orders</button>
                </div>
            </div>
            <div className="pos-content">
                {renderScreen()}
            </div>
        </div>
    );
};

export default PointOfSales;