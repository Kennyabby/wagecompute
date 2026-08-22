import './Adjustments.css'

import { useState, useEffect, useRef, useContext } from "react";
import ContextProvider from '../../../../Resources/ContextProvider';
import { syncPendingChanges } from '../../../../Resources/offlineSync';
import { PiPackage } from 'react-icons/pi';

const Adjustments = ({
    setIsOnView, isNewEntry, setIsNewView,
    clickedLabel, isSaveClicked, setIsSaveValue, postingDate,
    isDeleteClicked, setIsDeleteValue,
    isImportClicked, setIsImportValue,
    searchQuery
}) => {

    const {
        server, fetchServer, generateSeries, intervalPeriod,
        setAlert, setAlertState, setAlertTimeout, getProductsStockReport,
        products, company, companyRecord, setProducts, getProducts,
        settings, exportFile, importFile,
        inventoryDateRange, setInventoryDateRange,
    } = useContext(ContextProvider)
    const intervalRef = useRef(null);
    const productsRef = useRef(products);
    const [wrhs, setWrhs] = useState([])
    const [categories, setCategories] = useState([])
    const [curWarehouse, setCurWarehouse] = useState('all')
    const [curCategory, setCurCategory] = useState('all')
    const [headers, setHeaders] = useState([])
    const [adjustmentPostCount, setAdjustmentPostCount] = useState(0)
    const defaultColumns = [
        { name: 'Product ID', reference: 'i_d', show: true },
        { name: 'Product Name', reference: 'name', show: true },
        { name: 'Base UOM', reference: 'salesUom', show: true },
        { name: 'Unit Cost', reference: 'costPrice', show: true },
        { name: 'Quantity', reference: 'available quantity', show: true },
        { name: 'Counted Quantity', reference: 'counted quantity', show: true },
        { name: 'Difference', reference: 'difference', show: true },
        { name: 'Difference Cost', reference: 'differenceCost', show: true },
        // {name: 'User', reference:'user'}
    ]

    const [columns, setColumns] = useState([
        { name: 'Product ID', reference: 'i_d', show: true },
        { name: 'Product Name', reference: 'name', show: true },
        { name: 'Base UOM', reference: 'salesUom', show: true },
        { name: 'Unit Cost', reference: 'costPrice', show: true },
        { name: 'Quantity', reference: 'available quantity', show: true },
        { name: 'Counted Quantity', reference: 'counted quantity', show: false },
        { name: 'Difference', reference: 'difference', show: false },
        { name: 'Difference Cost', reference: 'differenceCost', show: false },])

    const [adjustmentEntries, setAdjustmentEntries] = useState([])
    const [isSyncing, setIsSyncing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [hasLoadedAdjustments, setHasLoadedAdjustments] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    // `dateRange` is the live draft bound to the date inputs, seeded from the
    // shared `inventoryDateRange` (App.js) each time this page mounts — same
    // split as Stock.js, and the same shared value, so applying a new range
    // on Stock/Overview and switching to Adjustments picks it up automatically.
    const [dateRange, setDateRange] = useState(inventoryDateRange)
    // 'idle' | 'loading' | 'success' | 'error'
    const [applyStatus, setApplyStatus] = useState('idle')
    const [applyMessage, setApplyMessage] = useState('')
    const applyStatusTimeoutRef = useRef(null)

    const withRequestTimeout = (promise, timeoutMs = 60000) => {
        let timeoutId;
        const timeout = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
    }

    const refreshAdjustmentsData = async () => {
        const cmp_val = window.localStorage.getItem('sessn-cmp')
        const latestProducts = productsRef.current || []
        if (!cmp_val) {
            setIsLoading(false)
            setHasLoadedAdjustments(true)
            return;
        }
        try {
            setIsLoading(true)
            await withRequestTimeout(getProductsStockReport(cmp_val, latestProducts, {
                startDate: inventoryDateRange.startDate,
                endDate: inventoryDateRange.endDate
            }))
            setHasLoadedAdjustments(true)
        } catch (e) {
            setHasLoadedAdjustments(true)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        productsRef.current = products
    }, [products])

    useEffect(() => {
        const cmp_val = window.localStorage.getItem('sessn-cmp');
        if (products.length) {
            if (!products[0]?.stockSummary) {
                refreshAdjustmentsData()
            } else {
                setHasLoadedAdjustments(true)
            }
        } else {
            setHasLoadedAdjustments(true)
        }
    }, [products])

    useEffect(() => {
        const cmp_val = window.localStorage.getItem('sessn-cmp');
        if (!isNewEntry) {

            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            if (cmp_val && products.length) {
                // refreshAdjustmentsData()
                intervalRef.current = setInterval(() => {
                    refreshAdjustmentsData()
                }, intervalPeriod);
            }

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            }
        }
    }, [window.localStorage.getItem('sessn-cmp'), isNewEntry, inventoryDateRange]);

    // Auto-clear the Apply Filters success/error status after a few seconds.
    useEffect(() => {
        if (applyStatus !== 'success' && applyStatus !== 'error') return;
        if (applyStatusTimeoutRef.current) clearTimeout(applyStatusTimeoutRef.current);
        applyStatusTimeoutRef.current = setTimeout(() => {
            setApplyStatus('idle');
            setApplyMessage('');
        }, 4000);
        return () => {
            if (applyStatusTimeoutRef.current) clearTimeout(applyStatusTimeoutRef.current);
        };
    }, [applyStatus]);

    const handleSyncOfflineAdjustments = async () => {
        if (!company || !companyRecord?.emailid) return;
        setIsSyncing(true);
        setAlertState('info');
        setAlert('Syncing offline Adjustments changes...');
        setAlertTimeout(10000);
        try {
            const results = await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
            const cmp_val = window.localStorage.getItem('sessn-cmp');
            if (!products) return
            await Promise.all([
                withRequestTimeout(getProductsStockReport(cmp_val, products, {
                    startDate: inventoryDateRange.startDate,
                    endDate: inventoryDateRange.endDate
                }))
            ]).catch(() => { });
            if (Array.isArray(results)) {
                const failed = results.filter(r => r.status === 'error');
                if (failed.length) {
                    setAlertState('error');
                    setAlert(`${failed.length} change(s) failed to sync; retry later.`);
                    setAlertTimeout(5000);
                } else {
                    setAlertState('success');
                    setAlert('Offline Adjustments Sync complete');
                    setAlertTimeout(1000);
                }
            } else {
                setAlertState('success');
                setAlert('Offline Adjustments Sync complete');
                setAlertTimeout(1000);
            }
        } catch (e) {
            setAlertState('error');
            setAlert('Offline Adjustments Sync failed. Please try again.');
            setAlertTimeout(3000);
        } finally { setIsSyncing(false) }
    }


    useEffect(() => {
        if (settings.length) {
            const wrhSetFilt = settings.filter((setting) => {
                return setting.name === 'warehouses'
            })

            delete wrhSetFilt[0]?._id
            setWrhs(wrhSetFilt[0].name ? [...wrhSetFilt[0].warehouses] : [])

            const wrhCatFilt = settings.filter((setting) => {
                return setting.name === 'product_categories'
            })

            delete wrhCatFilt[0]?._id
            setCategories(wrhCatFilt[0].name ? [...wrhCatFilt[0].categories] : [])
        }
    }, [settings])

    useEffect(() => {
        resetCount()
        if (isNewEntry) {
            if (curWarehouse !== 'all') {
                setColumns([...defaultColumns])
            }
        } else {
            setColumns((columns) => {
                columns.forEach((column) => {
                    if (['difference', 'differenceCost', 'counted quantity'].includes(column.reference)) {
                        column.show = false
                    }
                })
                return [...columns]
            })
        }
    }, [products, isNewEntry, curWarehouse])


    useEffect(() => {
        if (isSaveClicked) {
            const adjustments = [...adjustmentEntries]
            var entct = 0
            const fltAdjustments = adjustments.filter((entFlt) => {
                return Math.abs(Number(entFlt.difference)) > 0
            })
            if (fltAdjustments.length) {
                setAlertState('info')
                setAlert('Posting Adjustments...')
                setAlertTimeout(100000)
            }
            setAdjustmentPostCount(0)
            const createdAt = new Date().getTime()
            fltAdjustments.forEach((entry) => {
                let absVal = Math.abs(Number(entry.difference))
                let val = Number(entry.difference) / absVal
                let entryIndex = entry.index
                entry.baseQuantity = Number(entry.difference)
                entry.quantity = Math.abs(Number(entry.difference))
                entry.entryType = (val === -1 ? 'Nagative Entry' : 'Positive Entry')
                entry.documentType = (val === -1 ? 'Negative Adjustment' : 'Positive Adjustment')
                entry.totalCost = Number(entry.difference) * Number(entry.costPrice)
                entry.createdAt = createdAt
                entry.handlerId = companyRecord?.emailid
                entry.postingDate = postingDate
                entry.postingStamp = new Date(postingDate)
                entry.location = curWarehouse
                entry.warehouse = curWarehouse
                delete entry.index
                // const adjustedProduct = [...products[entryIndex][curWarehouse], {...entry}]                
                entct++
                setAdjustmentPostCount((adjustmentPostCount) => {
                    var newCount = adjustmentPostCount + 1
                    postAdjustments(entry, entry.i_d, fltAdjustments.length, newCount)
                    return newCount
                })
                // console.log(adjustedProduct)
            })

        }
    }, [isSaveClicked])

    const handleInputChange = ({ e, availableQty, productId }) => {
        const { name, value } = e.target
        let index
        adjustmentEntries.forEach((entry, i) => {
            if (entry.i_d === productId) {
                index = i
            }
        })
        setAdjustmentEntries((adjustmentEntries) => {
            adjustmentEntries[index] = { ...adjustmentEntries[index], [name]: value, difference: value === '' ? 0 : (Number(value) - Number(availableQty)) }
            return [...adjustmentEntries]
        })
    }

    const resetCount = () => {
        setAdjustmentEntries([])
        products.forEach((product, index) => {
            if (product.type === 'goods') {
                const entry = {}
                entry.i_d = product.i_d
                entry.productId = product.i_d
                entry.name = product.name || product.i_d
                entry.productName = product.name || product.i_d
                entry.costPrice = product.costPrice
                entry.index = index
                entry.difference = ''
                entry.baseQuantity = ''
                entry.counted = ''
                entry.postingDate = postingDate
                entry.userId = companyRecord.emailid
                setAdjustmentEntries((adjustmentEntries) => {
                    return [...adjustmentEntries, entry]
                })
            }
        })
    }

    const postAdjustments = async (adjustedProduct, i_d, length, count) => {
        console.log(count)
        setAlertState('info')
        setAlert(`Adjusting ${count} / ${length} ...`)
        setAlertTimeout(100000)
        const resps = await fetchServer("POST", {
            database: company,
            collection: "InventoryTransactions",
            update: adjustedProduct
        }, "createDoc", server)
        if (resps.err) {
            console.log(resps.mess)
            setAlertState('info')
            setAlert(resps.mess + `. Could not post for product [${i_d}]`)
            setAlertTimeout(3000)
            setIsSaveValue(false)
            setIsOnView(clickedLabel)
            return
        } else {
            setIsOnView(clickedLabel)
            setIsNewView(false)
            refreshAdjustmentsData()
            if (count === length) {
                setAlertState('success')
                setAlert(`Adjustments Posted Successfully!`)
                setAlertTimeout(1000)
            }
        }
        setIsSaveValue(false)
    }

    // Apply Filters: Warehouse/Category/Search already filter the
    // already-loaded products instantly, client-side — this is specifically
    // what re-fetches from the server for a new date range. Guarded by
    // applyStatus === 'loading' so duplicate clicks can't fire overlapping
    // requests.
    const handleApplyFilters = async () => {
        if (applyStatus === 'loading') return;
        const nextRange = { startDate: dateRange.startDate, endDate: dateRange.endDate };
        if (nextRange.endDate < nextRange.startDate) nextRange.endDate = nextRange.startDate;

        setSearchTerm('');
        setDateRange(nextRange);
        setInventoryDateRange(nextRange);
        setApplyStatus('loading');
        setApplyMessage('Fetching updated data...');

        try {
            const cmp_val = window.localStorage.getItem('sessn-cmp');
            await withRequestTimeout(getProductsStockReport(cmp_val, products, {
                startDate: nextRange.startDate,
                endDate: nextRange.endDate
            }));
            setApplyStatus('success');
            setApplyMessage('Data updated successfully.');
        } catch (error) {
            console.error('Apply Filters failed:', error);
            setApplyStatus('error');
            // getProductsStockReport swallows its own internal errors (shows
            // its own alert and resolves normally) — a rejection reaching
            // here is almost always this request's own timeout firing on a
            // heavy/wide date range, so surface the real reason instead of a
            // generic message.
            setApplyMessage(
                error?.message === 'Request timed out'
                    ? 'Timed out waiting for the server — try a narrower date range.'
                    : `Failed to fetch updated data${error?.message ? `: ${error.message}` : '.'}`
            );
        }
    };

    return (
        <>
            <div className='adjustments'>
                <div className='filter-section'>
                    <div className="export-controls">
                        <button className="export-button" onClick={handleSyncOfflineAdjustments} disabled={isSyncing}>
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
                        <div className='filter-group filter-group-daterange'>
                            <label>Date Range</label>
                            <div className='date-range'>
                                <input
                                    className='date-input'
                                    type='date'
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                                />
                                <span>to</span>
                                <input
                                    className='date-input'
                                    type='date'
                                    value={dateRange.endDate}
                                    min={dateRange.startDate}
                                    onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className='filter-group'>
                            <label>Warehouse</label>
                            <div className='filter-select-container'>
                                <select className='filter-select' value={curWarehouse} onChange={(e) => {
                                    const name = e.target.value;
                                    if (name) {
                                        resetCount();
                                        if (name === 'all') {
                                            setColumns((columns) => {
                                                columns.forEach((column) => {
                                                    if (['difference', 'differenceCost', 'counted quantity'].includes(column.reference)) {
                                                        column.show = false;
                                                    }
                                                });
                                                return [...columns];
                                            });
                                        } else {
                                            if (isNewEntry) {
                                                setColumns([...defaultColumns]);
                                            }
                                        }
                                        setCurWarehouse(name);
                                    }
                                }}>
                                    <option value='all'>All Warehouses</option>
                                    {wrhs.map((wrh) => (
                                        <option key={wrh.name} value={wrh.name}>{wrh.name.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className='filter-group'>
                            <label>Category</label>
                            <div className='filter-select-container'>
                                <select className='filter-select' value={curCategory} onChange={(e) => {
                                    setCurCategory(e.target.value);
                                }}>
                                    <option value='all'>All Categories</option>
                                    {categories.map((category) => {
                                        if (category.type === 'goods') {
                                            return <option key={category.code} value={category.code}>{category.name}</option>
                                        }
                                        return null;
                                    })}
                                </select>
                            </div>
                        </div>

                        <div className='filter-group'>
                            <label>Search Product</label>
                            <input
                                className='filter-input'
                                type='text'
                                placeholder='Search by name or ID...'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="filter-apply-row">
                        <button
                            type="button"
                            className="apply-filters-btn"
                            onClick={handleApplyFilters}
                            disabled={applyStatus === 'loading'}
                        >
                            {applyStatus === 'loading' ? 'Applying...' : 'Apply Filters'}
                        </button>
                        {applyStatus !== 'idle' && (
                            <span className={`filter-apply-status filter-apply-status-${applyStatus}`}>
                                {applyStatus === 'loading' && <span className="filter-apply-spinner" />}
                                {applyMessage}
                            </span>
                        )}
                    </div>
                </div>
                <div className='adj-right-header'>
                    <div className='adj-right stock-table-shell'>
                        {isLoading && (
                            <div className='stock-loading-banner'>
                                <span className='stock-loading-dot'></span>
                                {hasLoadedAdjustments ? 'Refreshing adjustment stock...' : 'Loading adjustment stock...'}
                            </div>
                        )}
                        {(() => {
                            const effectiveSearch = (searchQuery || searchTerm).toLowerCase();
                            const filteredProducts = products.filter((prflt) => {
                                if (effectiveSearch && !((prflt.name || '').toLowerCase().includes(effectiveSearch) || (prflt.i_d || '').toLowerCase().includes(effectiveSearch))) {
                                    return false;
                                }
                                if (curCategory === 'all') {
                                    return prflt.type === 'goods'
                                } else {
                                    if (prflt.type === 'goods') {
                                        return prflt.category === curCategory
                                    }
                                }
                                return false;
                            });

                            return columns.map((col, index) => {
                                return col.show && <div className='adj-right-content' key={index}>
                                    <div className='colname'>{col.name}</div>
                                    {filteredProducts.map((product, index1) => {
                                        const purchaseWrh = wrhs.find((warehouse) => {
                                            return warehouse.purchase
                                        })
                                        const purchaseWrhStock = product.locationStockDetails?.[purchaseWrh?.name] || { closingCost: 0, closingQty: 0 }
                                        const cost = purchaseWrhStock.closingCost
                                        const quantity = purchaseWrhStock.closingQty
                                        let cummulativeUnitCostPrice = 0
                                        cummulativeUnitCostPrice = quantity ? parseFloat(Math.abs(Number(cost / quantity))).toFixed(2) : 0

                                        product.costPrice = cummulativeUnitCostPrice
                                        let availableQty = 0;
                                        if (['available quantity', 'difference', 'differenceCost', 'counted quantity'].includes(col.reference)) {
                                            wrhs.forEach((wrh) => {
                                                if (curWarehouse === 'all') {
                                                    availableQty = Number(product.stockSummary?.closingQty || 0)
                                                } else {
                                                    if (wrh.name === curWarehouse) {
                                                        const wrhStock = product.locationStockDetails?.[curWarehouse] || { closingQty: 0 }
                                                        availableQty = Number(wrhStock.closingQty || 0);
                                                    }
                                                }
                                            })
                                            if (col.reference === 'available quantity') {
                                                return <div className='colrows' key={index1}>{availableQty}</div>
                                            } else if (col.reference === 'counted quantity') {
                                                return <input
                                                    key={index1}
                                                    type='number'
                                                    className='countedInp'
                                                    name='counted'
                                                    placeholder={product.name}
                                                    value={adjustmentEntries.filter(entry => product.i_d === entry.i_d)[0]?.counted}
                                                    onChange={(e) => { handleInputChange({ e, availableQty, productId: product.i_d }) }}
                                                />
                                            } else if (col.reference === 'difference') {
                                                return <div className='colrows' key={index1}>{Number(adjustmentEntries.filter(entry => product.i_d === entry.i_d)[0]?.difference)?.toLocaleString()}</div>
                                            } else {
                                                return <div className='colrows' key={index1}>{(Number(adjustmentEntries.filter(entry => product.i_d === entry.i_d)[0]?.difference) * Number(product.costPrice)).toLocaleString()}</div>
                                            }
                                        } else {
                                            return <div className='colrows' key={index1}>{(col.reference === 'costPrice' ? Number(product[col.reference]).toLocaleString() : product[col.reference])}</div>
                                        }
                                    })}
                                </div>
                            })
                        })()}
                    </div>
                </div>

            </div>
        </>
    )
}

export default Adjustments
