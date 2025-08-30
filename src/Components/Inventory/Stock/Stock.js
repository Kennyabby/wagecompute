import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { format, startOfMonth, parseISO, endOfDay } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ContextProvider from '../../../Resources/ContextProvider';
import './Stock.css';

const Stock = ({ 
    isNewEntry, 
    setIsNewView, 
    setIsOnView, 
    clickedLabel, 
    isSaveClicked, 
    setIsSaveValue, 
    isTransferClicked, 
    setIsTransferValue,
    postingDate
}) => {
    const {
        server, fetchServer, getProducts, getProductsWithStock, getProductsStockReport,
        setAlert, setAlertState, setAlertTimeout,
        products, setProducts, settings, company, companyRecord,
    } = useContext(ContextProvider);
    const intervalRef = useRef(null);
    const [warehouses, setWarehouses] = useState([]);
    const [categories, setCategories] = useState([]);

    // Fetch warehouses from the database
    const getWarehouses = async () => {
        try {
            const response = await fetchServer(
                'POST',
                {
                    database: company,
                    collection: 'Warehouses',
                    prop: {}
                },
                'getDocsDetails',
                server
            );
            if (response.record) {
                setWarehouses(response.record);
            }
        } catch (error) {
            console.error('Error fetching warehouses:', error);
            setAlertState('error');
            setAlert('Failed to load warehouses');
            setAlertTimeout(5000);
        }
    };

    // Fetch categories from the database
    const getCategories = async () => {
        try {
            const response = await fetchServer(
                'POST',
                {
                    database: company,
                    collection: 'ItemGroups',
                    prop: {}
                },
                'getDocsDetails',
                server
            );
            if (response.record) {
                const formattedCategories = response.record.map(cat => ({
                    code: cat.code || cat.name,
                    name: cat.name
                }));
                setCategories(formattedCategories);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            setAlertState('error');
            setAlert('Failed to load categories');
            setAlertTimeout(5000);
        }
    };
    const [wrhs, setWrhs] = useState([]);
    const [fromWarehouse, setFromWarehouse] = useState('');
    const [toWarehouse, setToWarehouse] = useState('');
    const [curWarehouse, setCurWarehouse] = useState('all');
    const [curCategory, setCurCategory] = useState('all');
    const defaultColumns = [
        { name: 'Product ID', reference: 'i_d', show: true },
        { name: 'Product Name', reference: 'name', show: true },
        { name: 'UOM', reference: 'salesUom', show: true },
        // Opening Stock
        { name: 'Opening Stock', reference: 'openingQuantity', show: true },
        { name: 'Opening Value', reference: 'openingCost', show: true },
        // Purchases
        { name: 'Purchased Qty', reference: 'purchasedQty', show: true },
        { name: 'Purchase Cost', reference: 'purchaseCost', show: true },
        // Transfers
        { name: 'Transfer In', reference: 'transferInQty', show: true },
        { name: 'Transfer Out', reference: 'transferOutQty', show: true },
        // Sales
        { name: 'Sold Qty', reference: 'soldQty', show: true },
        { name: 'Sales Value', reference: 'salesValue', show: true },
        { name: 'COGS', reference: 'costOfGoodsSold', show: true },
        // Adjustments
        { name: 'Net Adjustment Qty', reference: 'netAdjustmentQty', show: true },
        { name: 'Net Adjustment Cost', reference: 'netAdjustmentCost', show: true },
        // Adjustments
        { name: 'Negative Adjustment Qty', reference: 'negativeAdjustmentQty', show: false },
        { name: 'Negative Adjustment Cost', reference: 'negativeAdjustmentCost', show: false },
        // Adjustments
        { name: 'Positive Adjustment Qty', reference: 'positiveAdjustmentQty', show: false },
        { name: 'Positive Adjustment Cost', reference: 'positiveAdjustmentCost', show: false },
        // Closing Stock
        { name: 'Closing Stock', reference: 'closingQty', show: true },
        { name: 'Average Cost', reference: 'averageCost', show: true },
        { name: 'Closing Cost', reference: 'closingCost', show: true },
        { name: 'Closing Value', reference: 'closingSalesValue', show: true },
        // Transfer related (hidden by default)
        { name: 'Quantity to Transfer', reference: 'quantityToTransfer', show: false },
        { name: 'Transfer Cost', reference: 'transferCost', show: false }
    ]
    const [columns, setColumns] = useState([...defaultColumns]);
    const [transferEntries, setTransferEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dateRange, setDateRange] = useState(() => ({
        startDate: startOfMonth(new Date()),
        endDate: endOfDay(new Date())
    }));
    
    // Memoize dateRange to prevent unnecessary effect re-runs
    const stableDateRange = useMemo(() => ({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
    }), [dateRange.startDate.getTime(), dateRange.endDate.getTime()]);

    useEffect(() => {
        const cmp_val = window.localStorage.getItem('sessn-cmp');
        getProductsStockReport(cmp_val, products, {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
        });
        if (!isTransferClicked){
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (cmp_val) {
                intervalRef.current = setInterval(() => {
                    getProductsStockReport(cmp_val, products, {
                        startDate: dateRange.startDate,
                        endDate: dateRange.endDate
                    });
                }, 45000);
            }
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }else{
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
    }, [window.localStorage.getItem('sessn-cmp'), isTransferClicked]);

    useEffect(() => {
        if (settings.length) {
            const wrhSetFilt = settings.filter(setting => setting.name === 'warehouses');
            delete wrhSetFilt[0]?._id;
            setWrhs(wrhSetFilt[0].name ? [...wrhSetFilt[0].warehouses] : []);

            const wrhCatFilt = settings.filter(setting => setting.name === 'product_categories');
            delete wrhCatFilt[0]?._id;
            setCategories(wrhCatFilt[0].name ? [...wrhCatFilt[0].categories] : []);
        }
    }, [settings]);

    const resetCount = () => {
        let defaultEntries = []
        products.forEach(product => {
            if (product.type === 'goods'){
                defaultEntries.push({
                    productId: product.i_d,
                    quantityToTransfer: 0,
                    transferCost: 0,
                    type: product.type
                })
            }    
        })
        setTransferEntries(defaultEntries);        
    };
    useEffect(()=>{
        // console.log(transferEntries)
    },[transferEntries])
    useEffect(() => {
        setColumns([...defaultColumns]);
        if (isTransferClicked){
            resetCount();
            setColumns((columns)=>{
                columns.forEach((column)=>{                                        
                    if (['quantityToTransfer', 'transferCost'].includes(column.reference)){
                        column.show = true
                    }
                })
                return [...columns]
            })
        }
    },[isTransferClicked]);
    useEffect(()=>{        
        if (isSaveClicked) {
            handleTransfer();
        }
    },[isSaveClicked])

    useEffect(() => {
        const fetchData = async () => {
            if (company) {
                setIsLoading(true);
                try {
                    // First get warehouses and categories
                    await Promise.all([getWarehouses(), getCategories()]);
                    
                    // Then get products with stock data using the stock report
                    // const products = await getProducts(company);
                    if (products && products.length) {
                        // Use getProductsStockReport instead of getProductsWithStock
                        const productsWithStock = await getProductsStockReport(company, products, {
                            startDate: dateRange.startDate,
                            endDate: dateRange.endDate
                        });
                        // console.log(productsWithStock)
                        // Update products with the stock data
                        if (productsWithStock) {
                            setProducts(productsWithStock);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching data:', error);
                    setAlertState('error');
                    setAlert('Failed to load inventory data');
                    setAlertTimeout(5000);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchData();
    }, [company, stableDateRange]);

    useEffect(() => {
        const updateStockData = async () => {
            if (company && products.length) {
                setIsLoading(true);
                try {
                    const updatedProducts = await getProductsStockReport(company, products, {
                        startDate: dateRange.startDate,
                        endDate: dateRange.endDate
                    });
                    if (updatedProducts) {
                        setProducts(updatedProducts);
                    }
                } catch (error) {
                    console.error('Error updating stock data:', error);
                    setAlertState('error');
                    setAlert('Failed to update inventory data');
                    setAlertTimeout(5000);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        updateStockData();
    }, [dateRange]);

    const handleInputChange = ({ e, productId, costPrice }) => {
        const { name, value } = e.target;
        let index
        transferEntries.forEach((entry, i) => {
            if (entry.productId === productId) {
                index = i;
            }
        });
        if (name === 'quantityToTransfer') {
            const transferCost = value * costPrice;
            setTransferEntries((transferEntries) => {
                const newEntries = [...transferEntries];
                newEntries[index] = {
                    ...newEntries[index],
                    quantityToTransfer: value,
                    transferCost: transferCost
                };
                return newEntries;
            });
        }
    };

    const handleTransfer = async () => {
        const validEntries = transferEntries.filter((entry) => {
            return (entry.quantityToTransfer > 0 && entry.type === 'goods')
        });
        const insufficientProducts = [];
        if (validEntries.length > 0 && fromWarehouse && toWarehouse){
            // Validate if the warehouse selected as fromWarehouse has availableQuantity >= quantityToTransfer specified for each product
            for (const entry of validEntries){
                const { productId, quantityToTransfer } = entry;
                const product = products.find(p => p.i_d === productId);
                if (product) {
                    let countBaseQuantity = 0;
                    const {closingCost, closingQty} = product.locationStockDetails?.[fromWarehouse] || {closingCost: 0, closingQty: 0}
                    countBaseQuantity = Number(closingQty || 0);                    
                    if (countBaseQuantity < Number(quantityToTransfer)) {
                        insufficientProducts.push(productId);
                    }
                }
            }
    
            // If there are products with insufficient quantity, display an error message
            if (insufficientProducts.length > 0) {
                setAlertState('error');
                setAlert(`Insufficient quantity in the selected warehouse for the following products: ${insufficientProducts.join(', ')}`);
                setAlertTimeout(8000);
                setIsSaveValue(false)
                return;
            }
    
            // Proceed with the transfer if all validations pass
            setAlertState('info');
            setAlert('Transferring products...');
            setAlertTimeout(100000)
            let countSuccess = 0;
            for (const entry of validEntries) {
                const { productId, quantityToTransfer, transferCost } = entry;
                const product = products.find(p => p.i_d === productId);
                if (product) {                    
                    const createdAt = new Date().getTime();
                    const fromWarehouseData = {
                        productId: productId,
                        location: fromWarehouse,
                        entryType: 'Shipment',
                        documentType: 'Transfer Shipment',
                        transferTo: toWarehouse,
                        baseQuantity: quantityToTransfer * -1,
                        totalCost: transferCost * -1,
                        createdAt: createdAt,
                        handlerId: companyRecord?.emailid,
                        postingDate: postingDate,
                        postingStamp: new Date(postingDate)
                    }

                    const toWarehouseData = {
                        productId: productId,
                        location: toWarehouse,
                        entryType: 'Receipt',
                        documentType: 'Transfer Receipt',
                        tranferFrom: fromWarehouse,
                        baseQuantity: quantityToTransfer,
                        totalCost: transferCost,
                        createdAt: createdAt,
                        handlerId: companyRecord?.emailid,
                        postingDate: postingDate,
                        postingStamp: new Date(postingDate)
                    }

                    const resps1 = await fetchServer("POST", {
                        database: company,
                        collection: "InventoryTransactions",
                        update: fromWarehouseData
                    }, "createDoc", server);
                    const resps = await fetchServer("POST", {
                        database: company,
                        collection: "InventoryTransactions",
                        update: toWarehouseData
                    }, "createDoc", server);
                    if (resps.error) {
                        setAlertState('info');
                        setAlert(resps.message);
                        setAlertTimeout(5000);
                        setIsOnView(false);
                        setIsSaveValue(false);
                        setIsTransferValue(false);                        
                        setFromWarehouse('');
                        setToWarehouse('');
                        return;
                    }else{
                        countSuccess++;
                        setAlertState('success');
                        setAlert(`${countSuccess}/${validEntries.length} product(s) transferred successfully`);
                        setAlertTimeout(100000);
                    }
                }
            }
            if (countSuccess === validEntries.length) {
                setAlertState('success');
                setAlert('All Products Transfered Successful!');
                setAlertTimeout(5000);
                setIsOnView(false);
                setIsSaveValue(false);
                setIsTransferValue(false);                        
                setFromWarehouse('');
                setToWarehouse('');
                getProductsWithStock(company, products)
                resetCount();
            }
        } else {
            setAlertState('error');
            setAlert('Please fill all fields!');
            setAlertTimeout(5000);
            setIsSaveValue(false);
        }
    };

    // Format currency values
    const formatCurrency = (value) => {
        if (value === undefined || value === null) return '0.00';
        return parseFloat(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    return (
        <div className='adjustments'>
            <div className='adj-left'>
                <div className='adj-title'>Warehouses</div>
                <div className='adj-list' onClick={(e) => {
                    const name = e.target.getAttribute('name');
                    if (name) {
                        if (name === 'all') {
                            setColumns(columns => {
                                columns.forEach(column => {
                                    if (['difference', 'differenceCost', 'counted quantity'].includes(column.reference)) {
                                        column.show = false;
                                    }
                                });
                                return [...columns];
                            });
                        }
                        setCurWarehouse(name);
                    }
                }}>
                    <div className={(curWarehouse === 'all' ? 'opt-active' : '')} name='all'>All</div>
                    {wrhs.map((wrh) => {
                        if (isTransferClicked) {
                            if (fromWarehouse === wrh.name || toWarehouse === wrh.name) {
                                return (                            
                                    <div className={(wrh.name === curWarehouse) ? 'opt-active' : ''} name={wrh.name} key={wrh.name}>
                                        {wrh.name.toUpperCase()}
                                    </div>
                                )
                            }
                        }else{
                            return (                            
                                <div className={(wrh.name === curWarehouse) ? 'opt-active' : ''} name={wrh.name} key={wrh.name}>
                                    {wrh.name.toUpperCase()}
                                </div>
                            )
                        }
                    })}
                </div>
                <div className='adj-title'>Categories</div>
                <div className='adj-list' onClick={(e) => {
                    const name = e.target.getAttribute('name');
                    if (name) {
                        setCurCategory(name);
                    }
                }}>
                    <div className={(curCategory === 'all' ? 'opt-active' : '')} name='all'>All</div>
                    {categories.map((cat) => (
                        <div className={(cat.code === curCategory ? 'opt-active' : '')} name={cat.code} key={cat.code}>
                            {cat.name}
                        </div>
                    ))}
                </div>
                <div className='adj-title'>Date Range</div>
                <div className='date-range-container'>
                    <div className='date-range-item'>
                        <label>Start Date:</label>
                        <DatePicker
                            selected={dateRange.startDate}
                            onChange={(date) => setDateRange({...dateRange, startDate: date})}
                            selectsStart
                            startDate={dateRange.startDate}
                            endDate={dateRange.endDate}
                            maxDate={new Date()}
                            className='date-picker'
                        />
                    </div>
                    <div className='date-range-item'>
                        <label>End Date:</label>
                        <DatePicker
                            selected={dateRange.endDate}
                            onChange={(date) => setDateRange({...dateRange, endDate: endOfDay(date)})}
                            selectsEnd
                            startDate={dateRange.startDate}
                            endDate={dateRange.endDate}
                            minDate={dateRange.startDate}
                            maxDate={new Date()}
                            className='date-picker'
                        />
                    </div>
                </div>
            </div>
            <div className='adj-right-header'>
                {isTransferClicked && <div className='transfer-section'>
                    <h4><b>Internal Transfer</b></h4>
                    <div className='otherInpCov'>
                        <label>From Warehouse:</label>
                        <select className='otherInp stockOtherInp' value={fromWarehouse} onChange={(e) => {
                            setFromWarehouse(e.target.value)
                            setCurWarehouse(e.target.value)
                        }}>
                            <option value=''>Select Warehouse</option>
                            {wrhs.map(wrh => (
                                <option key={wrh.name} value={wrh.name}>{wrh.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className='otherInpCov'>
                        <label>To Warehouse:</label>
                        <select className='otherInp stockOtherInp' value={toWarehouse} onChange={(e) => setToWarehouse(e.target.value)}>
                            <option value=''>Select Warehouse</option>
                            {wrhs.map(wrh => (
                                <option key={wrh.name} value={wrh.name}>{wrh.name}</option>
                            ))}
                        </select>
                    </div>
                </div>}
                <div className='adj-right'>
                    {columns.map((col, index) => {
                        // Filter and map products once to avoid duplicate calculations
                        const filteredProducts = isLoading ? [] : products.filter(prflt => {
                            if (curCategory !== 'all' && prflt.category !== curCategory) return false;
                            return prflt.type === 'goods';
                        });

                        // Calculate totals for numeric columns
                        let columnTotal = 0;
                        if (!isLoading && col.reference) {
                            columnTotal = filteredProducts.reduce((sum, product) => {
                                let stockData = { ...(product.stockSummary || {}) };
                                if (curWarehouse !== 'all') {
                                    const locationData = product.locationStockDetails?.[curWarehouse] || {};
                                    stockData = { ...stockData, ...locationData };
                                }
                                const value = stockData[col.reference] || 0;
                                return sum + (typeof value === 'number' ? value : 0);
                            }, 0);
                        }

                        if (!col.show) return null;
                        
                        return (
                            <div className='adj-right-content' key={index}>
                                <div className='colname stockColname'>{col.name}</div>
                                {isLoading ? (
                                    <div className='colrows'>Loading...</div>
                                ) : filteredProducts.map((product, index1) => {
                                    // Get stock summary for the current warehouse or all warehouses
                                    let stockData = { ...(product.stockSummary || {}) };
                                    
                                    // If a specific warehouse is selected, use its data
                                    if (curWarehouse !== 'all') {
                                        const locationData = product.locationStockDetails?.[curWarehouse] || {};
                                        stockData = { ...stockData, ...locationData };
                                    }

                                   

                                    // Handle different column types
                                    if (col.reference === 'quantityToTransfer') {
                                        return (
                                            <div key={index1}>
                                                <input 
                                                    className='countedInp stockCountedInp' 
                                                    type='number' 
                                                    name='quantityToTransfer' 
                                                    placeholder='enter'
                                                    value={transferEntries.find(entry => product.i_d === entry.productId)?.quantityToTransfer || ''} 
                                                    onChange={(e) => handleInputChange({ 
                                                        e, 
                                                        productId: product.i_d, 
                                                        costPrice: stockData.averageCost || 0 
                                                    })} 
                                                />
                                            </div>
                                        );
                                    } else if (col.reference === 'transferCost') {
                                        return (
                                            <div className='colrows' key={index1}>
                                                {formatCurrency(transferEntries.find(entry => product.i_d === entry.productId)?.transferCost || 0)}
                                            </div>
                                        );
                                    } else if (col.reference in stockData) {
                                        // Handle numeric values with formatting
                                        const value = stockData[col.reference];
                                        if (typeof value === 'number') {
                                            if (['openingCost', 'purchaseCost', 'salesValue', 'costOfGoodsSold', 
                                                 'netAdjustmentCost', 'closingCost', 'closingSalesValue'].includes(col.reference)) {
                                                return <div className='colrows' key={index1}>{formatCurrency(value)}</div>;
                                            }
                                            return <div className='colrows' key={index1}>{value.toLocaleString()}</div>;
                                        }
                                        return <div className='colrows' key={index1}>{value || '0'}</div>;
                                    } else if (col.reference in product) {
                                        // Handle product properties
                                        return <div className='colrows' key={index1}>{product[col.reference] || ''}</div>;
                                    } else {
                                        return <div className='colrows' key={index1}>-</div>;
                                    }
                                })}
                                {/* Totals Row */}
                                {!isLoading && filteredProducts.length > 0 && (
                                    <div className='colrows total-row'>
                                        {['openingCost', 'purchaseCost', 'salesValue', 'costOfGoodsSold', 
                                          'netAdjustmentCost', 'closingCost', 'closingSalesValue'].includes(col.reference) 
                                            ? formatCurrency(columnTotal)
                                            : (typeof columnTotal === 'number' 
                                                ? columnTotal.toLocaleString() 
                                                : columnTotal || '0')
                                        }
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Stock;