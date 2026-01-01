import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { format, startOfMonth, parseISO, endOfDay, isEqual, format as formatDate } from 'date-fns';
import { generatePDF, generateExcel } from '../../../utils/exportUtils';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ContextProvider from '../../../Resources/ContextProvider';
import { syncPendingChanges } from '../../../Resources/offlineSync';
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
        setAlert, setAlertState, setAlertTimeout, intervalPeriod,
        products, setProducts, settings, company, companyRecord,
    } = useContext(ContextProvider);
    const intervalRef = useRef(null);
    const [warehouses, setWarehouses] = useState([]);
    const [categories, setCategories] = useState([]);

    // Initialize date range with first day of current month as start date and current date as end date
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10), // First day of current month
        endDate: new Date().toISOString().slice(0,10) // Today
    });
    
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
    const [transferEntries, setTransferEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showColumnManager, setShowColumnManager] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const refreshStockData = async () => {
        const cmp_val = window.localStorage.getItem('sessn-cmp')
        try{
            await Promise.all([
                getWarehouses(),
                getCategories(),
                getProductsStockReport(cmp_val, products, { startDate: dateRange.startDate, endDate: dateRange.endDate })
            ]);
        }catch(e){}
    }
    const [availableColumns, setAvailableColumns] = useState([
        // Basic Info (always visible)
        { id: 'i_d', name: 'Product ID', category: 'basic', visible: true, required: true },
        { id: 'name', name: 'Product Name', category: 'basic', visible: true, required: true },
        { id: 'salesUom', name: 'UOM', category: 'basic', visible: true, required: true },
        
        // Opening Stock
        { id: 'openingQuantity', name: 'Opening Stock', category: 'stock', visible: true, required: true },
        { id: 'openingCost', name: 'Opening Value', category: 'stock', visible: true, required: true },
        
        // Purchases
        { id: 'purchasedQty', name: 'Purchased Qty', category: 'purchases', visible: true, required: true },
        { id: 'purchaseCost', name: 'Purchase Cost', category: 'purchases', visible: true, required: false },
        
        // Transfers
        { id: 'transferInQty', name: 'Transfer In', category: 'transfers', visible: true, required: false },
        { id: 'transferOutQty', name: 'Transfer Out', category: 'transfers', visible: true, required: false },
        
        // Sales
        { id: 'soldQty', name: 'Sold Qty', category: 'sales', visible: true, required: true },
        { id: 'salesValue', name: 'Sales Value', category: 'sales', visible: true, required: false },
        { id: 'costOfGoodsSold', name: 'COGS', category: 'sales', visible: true, required: false },
        
        // Adjustments
        { id: 'netAdjustmentQty', name: 'Net Adjustment Qty', category: 'adjustments', visible: false, required: false },
        { id: 'netAdjustmentCost', name: 'Net Adjustment Cost', category: 'adjustments', visible: false, required: false },
        { id: 'positiveAdjustmentQty', name: 'Positive Adjustment Qty', category: 'adjustments', visible: false, required: false },
        { id: 'positiveAdjustmentCost', name: 'Positive Adjustment Cost', category: 'adjustments', visible: false, required: false },
        { id: 'negativeAdjustmentQty', name: 'Negative Adjustment Qty', category: 'adjustments', visible: false, required: false },
        { id: 'negativeAdjustmentCost', name: 'Negative Adjustment Cost', category: 'adjustments', visible: false, required: false },
        
        // Closing Stock
        { id: 'closingQty', name: 'Closing Stock', category: 'closing', visible: true, required: true },
        { id: 'averageCost', name: 'Average Cost', category: 'closing', visible: true, required: false },
        { id: 'closingCost', name: 'Closing Cost', category: 'closing', visible: true, required: true},
        { id: 'closingSalesValue', name: 'Closing Value', category: 'closing', visible: true, required: false },
        
        // Transfer related (hidden by default)
        { id: 'quantityToTransfer', name: 'Quantity to Transfer', category: 'transfer', visible: false, required: false },
        { id: 'transferCost', name: 'Transfer Cost', category: 'transfer', visible: false, required: false }
    ]);
    
    // Load saved column preferences on component mount
    useEffect(() => {
        const savedColumns = localStorage.getItem('inventoryStockColumns');
        if (savedColumns) {
            setAvailableColumns(JSON.parse(savedColumns));
        }
    }, []);
    
    // Save column preferences when they change
    const saveColumnPreferences = (columns) => {
        setAvailableColumns(columns);
        localStorage.setItem('inventoryStockColumns', JSON.stringify(columns));
    };
    
    // Toggle column visibility
    const toggleColumnVisibility = (columnId) => {
        const updatedColumns = availableColumns.map(col => 
            col.id === columnId ? { ...col, visible: !col.visible } : col
        );
        saveColumnPreferences(updatedColumns);
    };
    
    // Reset to default columns
    const resetToDefaultColumns = () => {
        const defaultColumns = availableColumns.map(col => ({
            ...col,
            visible: col.required || col.visibleByDefault
        }));
        saveColumnPreferences(defaultColumns);
    };
    
    // Get visible columns for the table
    const visibleColumns = availableColumns.filter(col => col.visible);
    
    // Group columns by category for the column manager
    const columnsByCategory = availableColumns.reduce((acc, column) => {
        if (!acc[column.category]) {
            acc[column.category] = [];
        }
        acc[column.category].push(column);
        return acc;
    }, {});
    
    // Column Manager Component
    const ColumnManagerModal = () => (
        showColumnManager && (
            <div className="column-manager-overlay" onClick={() => setShowColumnManager(false)}>
                <div className="column-manager" onClick={e => e.stopPropagation()}>
                    <div className="column-manager-header">
                        <h3 className="column-manager-title">Manage Columns</h3>
                        <button 
                            className="column-manager-close" 
                            onClick={() => setShowColumnManager(false)}
                        >
                            &times;
                        </button>
                    </div>
                    <div className="column-manager-body">
                        {Object.entries(columnsByCategory).map(([category, columns]) => (
                            <div key={category} className="column-category">
                                <h4 className="column-category-title">
                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                </h4>
                                <div className="column-list">
                                    {columns.map(column => (
                                        <div key={column.id} className="column-item">
                                            <input
                                                type="checkbox"
                                                id={`col-${column.id}`}
                                                checked={column.visible}
                                                onChange={() => toggleColumnVisibility(column.id)}
                                                disabled={column.required}
                                                className="column-checkbox"
                                            />
                                            <label 
                                                htmlFor={`col-${column.id}`} 
                                                className="column-label"
                                            >
                                                {column.name}
                                                {column.required && (
                                                    <span className="column-required">(required)</span>
                                                )}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="column-manager-footer">
                        <button 
                            className="column-manager-button"
                            onClick={resetToDefaultColumns}
                        >
                            Reset to Default
                        </button>
                        <button 
                            className="column-manager-button primary"
                            onClick={() => setShowColumnManager(false)}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        )
    );
    
    
    
    // Memoize dateRange to prevent unnecessary effect re-runs
    // const stableDateRange = useMemo(() => ({
    //     startDate: dateRange.startDate,
    //     endDate: dateRange.endDate
    // }), [dateRange.startDate.getTime(), dateRange.endDate.getTime()]);

    useEffect(() => {
        const cmp_val = window.localStorage.getItem('sessn-cmp');        
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
                }, intervalPeriod);
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
    }, [window.localStorage.getItem('sessn-cmp'), isTransferClicked, dateRange]);

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
    
    useEffect(() => {
        if (isTransferClicked){
            resetCount();
            setAvailableColumns(prevColumns => 
                prevColumns.map(column => ({
                    ...column,
                    visible: column.visible || ['quantityToTransfer', 'transferCost'].includes(column.id)
                }))
            )
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
                        getProductsStockReport(company, products, {
                            startDate: dateRange.startDate,
                            endDate: dateRange.endDate
                        });
                        // console.log(productsWithStock)
                        // Update products with the stock data
                        // if (productsWithStock) {
                        //     setProducts(productsWithStock);
                        // }
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
    }, [company]);

    useEffect(() => {
        const updateStockData = async () => {
            if (company && products.length) {
                setIsLoading(true);
                try {
                    getProductsStockReport(company, products, {
                        startDate: dateRange.startDate,
                        endDate: dateRange.endDate
                    });
                    // if (updatedProducts) {
                    //     setProducts(updatedProducts);
                    // }
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
                getProductsWithStock(company, products, {
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate
                })
                resetCount();
            }
        } else {
            setAlertState('error');
            setAlert('Please fill all fields!');
            setAlertTimeout(5000);
            setIsSaveValue(false);
        }
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Format currency values
    const formatCurrency = (value) => {
        if (value === undefined || value === null) return '0.00';
        return parseFloat(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const getCompanyInfo = () => {
        // Use companyRecord if available, otherwise fall back to company or default values
        const companyData = companyRecord || company || {};
        return {
            name: companyData.name || settings?.companyName || 'Company Name',
            address: companyData.address || settings?.companyAddress || 'Company Address',
            phone: companyData.phone || settings?.companyPhone || 'Phone Number',
            email: companyData.email || settings?.companyEmail || 'email@example.com'
        };
    };

    const prepareExportData = () => {
        return products
            .filter(prflt => {
                if (curCategory !== 'all' && prflt.category !== curCategory) return false;
                return prflt.type === 'goods';
            })
            .map(item => {
                // Get warehouse-specific data if a specific warehouse is selected
                const warehouseData = curWarehouse !== 'all' ? item.locationStockDetails?.[curWarehouse] : item.stockSummary;
                
                // Map all required fields and ensure consistent naming
                const mappedItem = {
                    // Basic Info
                    i_d: item.i_d || '',
                    name: item.name || item.itemName || '',
                    code: item.code || item.itemCode || '',
                    category: item.category || item.itemGroup || '',
                    salesUom: item.salesUom || 'Nos',
                    description: item.description || '',
                    
                    // Opening Stock
                    openingQuantity: warehouseData?.openingQuantity || 0,
                    openingCost: warehouseData?.openingCost || 0,
                    
                    // Purchases
                    purchasedQty: warehouseData?.purchasedQty || 0,
                    purchaseCost: warehouseData?.purchaseCost || 0,
                    
                    // Transfers
                    transferInQty: warehouseData?.transferInQty || 0,
                    transferOutQty: warehouseData?.transferOutQty || 0,
                    
                    // Sales
                    soldQty: warehouseData?.soldQty || 0,
                    salesValue: warehouseData?.salesValue || 0,
                    costOfGoodsSold: warehouseData?.costOfGoodsSold || 0,
                    
                    // Adjustments
                    netAdjustmentQty: warehouseData?.netAdjustmentQty || 0,
                    netAdjustmentCost: warehouseData?.netAdjustmentCost || 0,
                    positiveAdjustmentQty: warehouseData?.positiveAdjustmentQty || 0,
                    positiveAdjustmentCost: warehouseData?.positiveAdjustmentCost || 0,
                    negativeAdjustmentQty: warehouseData?.negativeAdjustmentQty || 0,
                    negativeAdjustmentCost: warehouseData?.negativeAdjustmentCost || 0,
                    
                    // Closing Stock
                    closingQty: warehouseData?.closingQty || 0,
                    averageCost: warehouseData?.averageCost || 0,
                    closingCost: warehouseData?.closingCost || 0,
                    closingSalesValue: warehouseData?.closingSalesValue || 0,
                    
                    // Transfer related
                    quantityToTransfer: 0,
                    transferCost: 0,
                    
                    // Additional fields for backward compatibility
                    quantity: parseFloat(warehouseData?.closingQty || 0),
                    cost: parseFloat(warehouseData?.averageCost || 0),
                    value: parseFloat(warehouseData?.closingCost || 0)
                };

                // Add warehouse specific quantities if available
                // if (item.warehouseData) {
                //     Object.entries(item.warehouseData).forEach(([warehouseId, whData]) => {
                //         mappedItem[`wh_${warehouseId}_qty`] = parseFloat(whData.quantity || 0);
                //         mappedItem[`wh_${warehouseId}_value`] = parseFloat(whData.value || 0);
                //     });
                // }

                return mappedItem;
            });
    };

    const handleExportPDF = () => {
        setIsExporting(true);
        try {
            const visibleData = prepareExportData();
            // const exportDateRange = {
            //     startDate: formatDate(dateRange.startDate, 'yyyy-MM-dd'),
            //     endDate: formatDate(dateRange.endDate, 'yyyy-MM-dd')
            // };

            // Get columns with proper formatting
            const exportColumns = availableColumns
                .filter(col => col.visible || col.required)
                .map(col => {
                    // Map column IDs to their corresponding data properties
                    const columnMap = {
                        'i_d': 'i_d',
                        'name': 'name',
                        'code': 'code',
                        'category': 'category',
                        'openingQuantity': 'openingQuantity',
                        'openingCost': 'openingCost',
                        'purchasedQty': 'purchasedQty',
                        'purchaseCost': 'purchaseCost',
                        'transferInQty': 'transferInQty',
                        'transferOutQty': 'transferOutQty',
                        'soldQty': 'soldQty',
                        'salesValue': 'salesValue',
                        'costOfGoodsSold': 'costOfGoodsSold',
                        'netAdjustmentQty': 'netAdjustmentQty',
                        'netAdjustmentCost': 'netAdjustmentCost',
                        'closingQty': 'closingQty',
                        'averageCost': 'averageCost',
                        'closingCost': 'closingCost',
                        'closingSalesValue': 'closingSalesValue'
                    };

                    return {
                        ...col,
                        // Use the mapped reference or fall back to the column ID
                        reference: columnMap[col.id] || col.id,
                        // Mark numeric columns for proper formatting
                        numeric: ['quantity', 'cost', 'value', 'qty', 'amount', 'price'].some(term => 
                            (col.id || col.reference || '').toLowerCase().includes(term)
                        )
                    };
                });

            // Prepare filter information
            const filters = {
                category: curCategory !== 'all' ? categories.find(c => c.code === curCategory)?.name || curCategory : null,
                warehouse: curWarehouse !== 'all' ? warehouses.find(w => w.code === curWarehouse)?.name || curWarehouse : null
            };

            generatePDF(
                visibleData,
                exportColumns,
                getCompanyInfo(),
                dateRange,
                'Stock Report',
                filters
            );
        } catch (error) {
            console.error('Error generating PDF:', error);
            setAlertState('error');
            setAlert('Failed to generate PDF. Please try again.');
            setAlertTimeout(5000);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const visibleData = prepareExportData();
            // const exportDateRange = {
            //     startDate: formatDate(dateRange.startDate, 'yyyy-MM-dd'),
            //     endDate: formatDate(dateRange.endDate, 'yyyy-MM-dd')
            // };

            // Get columns with proper formatting
            const exportColumns = availableColumns
                .filter(col => col.visible || col.required)
                .map(col => {
                    // Map column IDs to their corresponding data properties
                    const columnMap = {
                        'i_d': 'i_d',
                        'name': 'name',
                        'code': 'code',
                        'category': 'category',
                        'openingQuantity': 'openingQuantity',
                        'openingCost': 'openingCost',
                        'purchasedQty': 'purchasedQty',
                        'purchaseCost': 'purchaseCost',
                        'transferInQty': 'transferInQty',
                        'transferOutQty': 'transferOutQty',
                        'soldQty': 'soldQty',
                        'salesValue': 'salesValue',
                        'costOfGoodsSold': 'costOfGoodsSold',
                        'netAdjustmentQty': 'netAdjustmentQty',
                        'netAdjustmentCost': 'netAdjustmentCost',
                        'closingQty': 'closingQty',
                        'averageCost': 'averageCost',
                        'closingCost': 'closingCost',
                        'closingSalesValue': 'closingSalesValue'
                    };

                    return {
                        ...col,
                        // Use the mapped reference or fall back to the column ID
                        reference: columnMap[col.id] || col.id,
                        // Mark numeric columns for proper formatting
                        numeric: ['quantity', 'cost', 'value', 'qty', 'amount', 'price'].some(term => 
                            (col.id || col.reference || '').toLowerCase().includes(term)
                        )
                    };
                });

            // Prepare filter information
            const filters = {
                category: curCategory !== 'all' ? categories.find(c => c.code === curCategory)?.name || curCategory : null,
                warehouse: curWarehouse !== 'all' ? warehouses.find(w => w.code === curWarehouse)?.name || curWarehouse : null
            };

            generateExcel(
                visibleData,
                exportColumns,
                getCompanyInfo(),
                dateRange,
                'Stock Report',
                filters
            );
        } catch (error) {
            console.error('Error generating Excel:', error);
            setAlertState('error');
            setAlert('Failed to generate Excel. Please try again.');
            setAlertTimeout(5000);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className='adjustments'>
            {/* <div className='filter-section'>
            </div> */}
            <ColumnManagerModal />
            <div className='filter-section'>
                <div className="export-controls">
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('export_inventory_report')) && <>
                        <button 
                            className="export-button"
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            title="Export to PDF"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            PDF
                        </button>
                        <button 
                            className="export-button"
                            onClick={handleExportExcel}
                            disabled={isExporting}
                            title="Export to Excel"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="12" y1="18" x2="12" y2="12"></line>
                                <line x1="9" y1="15" x2="15" y2="15"></line>
                            </svg>
                            Excel
                        </button>
                    </>}
                    <button 
                        className="column-manager-toggle"
                        onClick={() => setShowColumnManager(true)}
                        title="Manage Columns"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                            <line x1="9" y1="9" x2="21" y2="9"></line>
                            <line x1="9" y1="15" x2="21" y2="15"></line>
                        </svg>
                        Manage Columns
                    </button>
                    <button 
                        className="action-btn"
                        onClick={async ()=>{
                            if (!company || !companyRecord?.emailid) return;
                            setIsSyncing(true);
                            setAlertState('info');
                            setAlert('Syncing offline Inventory changes...');
                            setAlertTimeout(10000);
                            try{
                                const results = await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
                                await refreshStockData();
                                if (Array.isArray(results)){
                                    const failed = results.filter(r => r.status === 'error');
                                    if (failed.length){
                                        setAlertState('error');
                                        setAlert(`${failed.length} change(s) failed to sync; retry later.`);
                                        setAlertTimeout(5000);
                                    } else {
                                        setAlertState('success');
                                        setAlert('Offline Inventory Sync complete');
                                        setAlertTimeout(3000);
                                    }
                                } else {
                                    setAlertState('success');
                                    setAlert('Offline Inventory Sync complete');
                                    setAlertTimeout(3000);
                                }
                            }catch(e){
                                setAlertState('error');
                                setAlert('Offline Inventory Sync failed. Please try again.');
                                setAlertTimeout(3000);
                            }finally{setIsSyncing(false)}
                        }}
                        disabled={isSyncing}
                    >
                        {isSyncing ? 'Syncing...' : 'Sync()'}
                    </button>
                </div>
                <div className='filter-header'>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    Filters
                </div>
                <div className='filter-row'>
                    <div className="filter-group">
                        <label>Date Range</label>
                        <div className="date-range">
                            <input
                                type="date"
                                name="startDate"
                                value={dateRange.startDate}
                                onChange={handleDateChange}
                                className="date-input"
                            />
                            <span>to</span>
                            <input
                                type="date"
                                name="endDate"
                                value={dateRange.endDate}
                                onChange={handleDateChange}
                                className="date-input"
                                min={dateRange.startDate}
                            />
                        </div>
                    </div>
                    
                    <div className='filter-group'>
                        <label>Warehouse</label>
                        <div className='filter-select-container'>
                            <select 
                                className='filter-select' 
                                value={curWarehouse}
                                onChange={(e) => {
                                    const name = e.target.value;
                                    setCurWarehouse(name);
                                }}
                            >
                                <option value='all'>All Warehouses</option>
                                {wrhs.map((wrh) => (
                                    !isTransferClicked || fromWarehouse === wrh.name || toWarehouse === wrh.name ? (
                                        <option key={wrh.name} value={wrh.name}>
                                            {wrh.name.toUpperCase()}
                                        </option>
                                    ) : null
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className='filter-group'>
                        <label>Category</label>
                        <div className='filter-select-container'>
                            <select 
                                className='filter-select' 
                                value={curCategory}
                                onChange={(e) => setCurCategory(e.target.value)}
                            >
                                <option value='all'>All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat.code} value={cat.code}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
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
                    {visibleColumns.map((col) => {
                        // Skip if column is not visible
                        if (!col.visible) return null;
                        
                        // Filter and map products once to avoid duplicate calculations
                        const filteredProducts = isLoading ? [] : products.filter(prflt => {
                            if (curCategory !== 'all' && prflt.category !== curCategory) return false;
                            if (curWarehouse !== 'all' && prflt.locationStockDetails?.[curWarehouse] === undefined) return false;
                            return prflt.type === 'goods';
                        });

                        // Calculate totals for numeric columns
                        let columnTotal = 0;
                        if (!isLoading && col.id) {
                            columnTotal = filteredProducts.reduce((sum, product) => {
                                let stockData = { ...(product.stockSummary || {}) };
                                if (curWarehouse !== 'all') {
                                    const locationData = product.locationStockDetails?.[curWarehouse] || {};
                                    stockData = { ...stockData, ...locationData };
                                }
                                const value = stockData[col.id] || 0;
                                return sum + (typeof value === 'number' ? value : 0);
                            }, 0);
                        }

                        return (
                            <div className='adj-right-content' key={col.id}>
                                <div className='colname stockColname'>{col.name}</div>
                                {isLoading ? (
                                    <div className='colrows'>Loading...</div>
                                ) : filteredProducts.map((product, index1) => {
                                    
                                    // Get stock summary for the current warehouse or all warehouses
                                    let stockData = { ...(product.stockSummary || {}) };
                                    
                                    // If a specific warehouse is selected, use its data
                                    if (curWarehouse !== 'all') {
                                        const locationData = product.locationStockDetails?.[curWarehouse] || {};
                                        stockData = { ...locationData };
                                    }
                                   

                                    // Handle different column types
                                    if (col.id === 'quantityToTransfer') {
                                        return (
                                            <div key={index1}>
                                                <input 
                                                    className='countedInp stockCountedInp' 
                                                    type='number' 
                                                    name='quantityToTransfer' 
                                                    placeholder={product.name}
                                                    value={transferEntries.find(entry => product.i_d === entry.productId)?.quantityToTransfer || ''} 
                                                    onChange={(e) => handleInputChange({ 
                                                        e, 
                                                        productId: product.i_d, 
                                                        costPrice: stockData.averageCost || 0 
                                                    })} 
                                                />
                                            </div>
                                        );
                                    } else if (col.id === 'transferCost') {
                                        return (
                                            <div className='colrows' key={index1}>
                                                {formatCurrency(transferEntries.find(entry => product.i_d === entry.productId)?.transferCost || 0)}
                                            </div>
                                        );
                                    } else if (col.id in stockData) {
                                        // Handle numeric values with formatting
                                        const value = stockData[col.id];
                                        if (typeof value === 'number') {
                                            if (['openingCost', 'purchaseCost', 'salesValue', 'costOfGoodsSold', 
                                                 'netAdjustmentCost', 'closingCost', 'closingSalesValue'].includes(col.id)) {
                                                return <div className='colrows' key={index1}>{formatCurrency(value)}</div>;
                                            }
                                            return <div className='colrows' key={index1}>{value.toLocaleString()}</div>;
                                        }
                                        return <div className='colrows' key={index1}>{value || '0'}</div>;
                                    } else if (col.id in product) {
                                        // Handle product properties
                                        return <div className='colrows' key={index1}>{product[col.id] || ''}</div>;
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