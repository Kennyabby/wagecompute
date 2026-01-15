import './Products.css'

import { useState, useEffect, useRef, useContext } from "react";
import ContextProvider from '../../../Resources/ContextProvider';
import { syncPendingChanges } from '../../../Resources/offlineSync';

const Products = ({
    isNewProduct, isProductView, 
    setIsOnView, setIsNewView,
    clickedLabel, isSaveClicked, setIsSaveValue,
    isDeleteClicked, setIsDeleteValue,
    isImportClicked, setIsImportValue,
    productView, setCurProduct, curProduct
})=>{     
    const {
        server, fetchServer, generateSeries, intervalPeriod,
        setAlert, setAlertState, setAlertTimeout, posSettings,
        products, company, setProducts, getProducts,
        getProductsWithStock,
        settings, exportFile, importFile, companyRecord
    } = useContext(ContextProvider)
    const loadRef = useRef(null)
    const intervalRef = useRef(null)
        const [isSyncing, setIsSyncing] = useState(false)
    const [wrhs, setWrhs] = useState([])
    const [uoms, setUoms] = useState([])
    const [categories, setCategories] = useState([])
    const [curPosSettings, setCurPosSettings] = useState([])
    const [purchaseWrh, setPurchaseWrh] = useState('')
    const [defaultProductType, setDefaultProductType] = useState('goods')
    const [selectedProducts, setSelectedProducts] = useState([])
    const [deleteCount, setDeleteCount] = useState(0)
    const [delCount, setDelCount] =  useState(0)
    const [productData, setProductData] = useState([])
    const [loadResult, setLoadResult] = useState(null)
    const [loadPivot, setLoadPivot] = useState(0)
    const [startRow, setStartRow] = useState(null)
    const [importCount, setImportCount] = useState(null)
    const [defaultBuyTo, setDefaultBuyTo] = useState('central warehouse')
    const [defaultProductFields, setDefaultProductFields] = useState({
        i_d: generateSeries('PD', products, 'i_d'),
        name: '',
        barcode: '',
        salesPrice: '',
        vipPrice: '',
        costPrice: '',
        category: 'all',
        purchaseVat:'',
        salesVat:'',
        salesUom:'pcs',
        purchaseUom:'pcs',
        restockLevel: '',
        buyTo: ''
    })
    const productExportFormat = {
        name: '',
        barcode: '',
        salesPrice: '',
        vipPrice: '',
        costPrice: '',
        category: 'all',
        purchaseVat:'',
        salesVat:'',
        salesUom:'pcs',
        purchaseUom:'pcs',
        restockLevel: '',
        type:'goods'
    }
    const [headersMap, setHeadersMap] = useState({
        name: 'name',
        barcode: 'barcode',
        salesPrice: 'salesPrice',
        costPrice: 'costPrice',
        category: 'category',
        purchaseVat:'purchaseVat',
        salesVat: 'salesVat',
        salesUom:'salesUom',
        purchaseUom:'purchaseUom',
        restockLevel: 'restockLevel',
        type:'type',
    })

    const [productFields, setProductFields] = useState({...defaultProductFields})
    // Monthly stats state
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0,7))
    const [monthStats, setMonthStats] = useState({
        salesQty: 0,
        salesAmount: 0,
        purchaseQty: 0,
        purchaseCost: 0
    })
    const [monthLoading, setMonthLoading] = useState(false)

    const getMonthRange = (ym) => {
        if (!ym) return {from: null, to: null}
        const [yyStr, mmStr] = ym.split('-')
        const yy = Number(yyStr)
        const mm = Number(mmStr || '1')
        const lastDay = new Date(yy, mm, 0).getDate()
        const pad = (n)=> String(n).padStart(2,'0')
        const from = `${yyStr}-${pad(mm)}-01`
        const to = `${yyStr}-${pad(mm)}-${pad(lastDay)}`
        return {from, to}
    }
    
    const loadMonthlyTotals = async () => {
        try{
            setMonthLoading(true)
            const pid = (productFields?.i_d)
            if (!company || !pid) return
            const {from, to} = getMonthRange(selectedMonth)
            if (!from || !to) return
            const resp = await fetchServer("POST", {
                database: company,
                collection: "InventoryTransactions",
                prop: {
                    productId: pid,
                    postingDate: { $gte: from, $lte: to }
                }
            }, "getDocsDetails", server)
            let salesQty = 0, salesAmount = 0, purchaseQty = 0, purchaseCost = 0
            if (resp?.record && Array.isArray(resp.record)){
                resp.record.forEach((t)=>{
                    const entryType = t.entryType
                    const bq = Number(t.baseQuantity)||0
                    const tSales = Number(t.totalSales)||0
                    const tCost = Number(t.totalCost)||0
                    if (entryType === 'Sales'){
                        salesQty += Math.abs(bq)
                        salesAmount += Math.abs(tSales)
                    }else if (entryType === 'Purchase'){
                        purchaseQty += Math.abs(bq)
                        purchaseCost += Math.abs(tCost)
                    }
                })
            }
            setMonthStats({salesQty, salesAmount, purchaseQty, purchaseCost})
        }catch(err){
            // swallow
        }finally{
            setMonthLoading(false)
        }
    }

    const refreshProductsData = async () => {
        const cmp_val = window.localStorage.getItem('sessn-cmp')
        if (!cmp_val) return;
        try{ await getProductsWithStock(cmp_val, products); }catch(e){}
    }

    useEffect(()=>{
        const curPosSet = posSettings?.posSettings?.find((sett)=>sett.active)
        setCurPosSettings(curPosSet)
    },[posSettings])
    useEffect(()=>{
        getProducts(cmp_val)
        if (!curProduct){
            var cmp_val = window.localStorage.getItem('sessn-cmp')
            intervalRef.current = setInterval(()=>{ refreshProductsData(); },intervalPeriod)
            // run once
            refreshProductsData();
            return () => clearInterval(intervalRef.current);
        }else{
            if(intervalRef.current){
                clearInterval(intervalRef.current)
            }
        }
    },[window.localStorage.getItem('sessn-cmp'), curProduct])
    
    const handleSyncOfflineProducts = async () => {
        if (!company || !companyRecord?.emailid) return;
        setIsSyncing(true);
        setAlertState('info');
        setAlert('Syncing offline Products changes...');
        setAlertTimeout(10000);
        try{
            const results = await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
            // reuse periodic refresh function
            await getProducts(window.localStorage.getItem('sessn-cmp'))
            await refreshProductsData();
            if (Array.isArray(results)){
                const failed = results.filter(r => r.status === 'error');
                if (failed.length){
                    setAlertState('error');
                    setAlert(`${failed.length} change(s) failed to sync; retry later.`);
                    setAlertTimeout(5000);
                } else {
                    setAlertState('success');
                    setAlert('Offline Products Sync complete');
                    setAlertTimeout(3000);
                }
            } else {
                setAlertState('success');
                setAlert('Offline Products Sync complete');
                setAlertTimeout(3000);
            }
        }catch(e){
            setAlertState('error');
            setAlert('Offline Products Sync failed. Please try again.');
            setAlertTimeout(3000);
        }finally{
            setIsSyncing(false);
        }
    }

    useEffect(()=>{
        if(!isProductView && delCount===null){
            setProductFields((productFields)=>{
                return {...productFields, i_d: generateSeries('PD', products, 'i_d')}
            })
        }
    },[products, isProductView])
    
    useEffect(()=>{
        setSelectedProducts([])
    },[productView])

    useEffect(()=>{
        if (productFields.type){
            setDefaultProductType(productFields.type)
        }
    },[productFields.type])
    
    useEffect(()=>{
        if (curProduct){
            const purchaseWrh = wrhs.find((warehouse)=>{
                return warehouse.purchase
            })
            const {cost, quantity} = curProduct.locationStock?.[purchaseWrh?.name] || {cost: 0, quantity: 0}
            let cummulativeUnitCostPrice = 0            
            cummulativeUnitCostPrice = quantity? parseFloat(Math.abs(Number(cost/quantity))).toFixed(2) : 0            
            setProductFields({
                ...curProduct, 
                // costPrice: cummulativeUnitCostPrice
            })
        }
    },[curProduct])

    // Refresh monthly totals when product or month changes
    useEffect(()=>{
        loadMonthlyTotals()
    }, [productFields?.i_d, selectedMonth, company])

    useEffect(()=>{
        if (settings.length){
            const uomSetFilt = settings.filter((setting)=>{
                return setting.name === 'uom'
            })
            delete uomSetFilt[0]?._id
            setUoms(uomSetFilt[0].name?[...uomSetFilt[0].mearsures]:[])
        
            const wrhSetFilt = settings.filter((setting)=>{
                return setting.name === 'warehouses'
            })

            delete wrhSetFilt[0]?._id
            setWrhs(wrhSetFilt[0].name?[...wrhSetFilt[0].warehouses]:[])
            setDefaultProductFields({
                ...defaultProductFields, 
                buyTo: wrhSetFilt[0].warehouses.filter((wrh)=>{return wrh.purchase})[0]?.name
            })
            setProductFields((productFields)=>{
                return {...productFields, buyTo: wrhSetFilt[0].warehouses.filter((wrh)=>{return wrh.purchase})[0]?.name}
            })

            const catSetFilt = settings.filter(setting => setting.name === 'product_categories');
            delete catSetFilt[0]?._id;
            setCategories(catSetFilt[0].name ? [...catSetFilt[0].categories] : []);
        }  
    },[settings])

    useEffect(()=>{
        wrhs.forEach((wrh)=>{
            if (wrh.purchase){
                setPurchaseWrh(wrh.name)
            }
        })
    },[wrhs])

    useEffect(()=>{
        setLoadResult(null)
        setProductData([])
        setLoadPivot(0)
        if (isNewProduct){
            // console.log(isNewProduct)
            // setIsNewView(false)
            // setProductFields({...defaultProductFields})
            // setIsView(false)
        }
    },[isNewProduct])

    useEffect(()=>{
        if (!isProductView){
            setProductFields({...defaultProductFields})
        }
    },[isProductView])

    useEffect(()=>{
        if (isSaveClicked){
            addProduct(productFields)
        }
    },[isSaveClicked])

    useEffect(()=>{
        if (isDeleteClicked){
            if (!isProductView){
                if (selectedProducts.length){
                    console.log('deleting...', delCount)
                    if (delCount === 0){
                        setAlertState('info')
                        setAlert('You are about to delete the selected product(s). Please Delete again if you are sure!')
                        setAlertTimeout(2000)                    
                    }
                    deleteProduct(selectedProducts[delCount], selectedProducts.length)                                        
                }else{
                    setAlertState('error')
                    setAlert('No product selected for deletion. Select a product and try again!')
                    setAlertTimeout(3000)
                    setIsDeleteValue(false)
                }
            }else{
                setAlertState('info')
                setAlert('You are about to delete this product. Please Delete again if you are sure!')
                setAlertTimeout(2000)
                deleteProduct(productFields.i_d,productFields.createdAt)
            }
        }
    },[isDeleteClicked, isProductView, selectedProducts, productFields, delCount])

    useEffect(()=>{
        if(importCount!==null){
            if(importCount === 0){
                setAlertState('info')
                setAlert('Uploading...')
                let nameCount = 0
                productData.forEach((product)=>{
                    if (product['name']){
                        nameCount++
                    }
                })
                if (nameCount!==productData.length){
                    setAlertState('error')
                    setAlert('No empty name field allowed. Kindly make sure the "name" column has all its rows filled!')
                    setAlertTimeout(3000)   
                    setImportCount(null)
                    return                 
                }
            }
            if(importCount<productData.length){
                const newProductField = {...productExportFormat}
                newProductField.i_d =  generateSeries('PD', products, 'i_d')                
                Object.keys(headersMap).forEach((header)=>{
                    newProductField[header] = (productData[importCount])[headersMap[header]] ?
                    (productData[importCount])[headersMap[header]] : '' 
                })
                addProduct(newProductField)                
            }else{
                setAlertState('success')
                setAlert('All Products Imported Successfully!')
                setAlertTimeout(2000)
                setImportCount(null)
                getProducts(company)
                setIsOnView(false)
                setIsSaveValue(false)
                setIsImportValue(false)
                setImportCount(null)
            }
        }
    },[importCount])

    const handleProductFieldChange = (e)=>{
        const {name, value} = e.target
        if (!['goods','services'].includes(name)){
            setProductFields((productFields)=>{
                return {...productFields, [name]: value}
            })
        }
    }

    const addProduct = async (productFields)=>{
        if (productFields.name){
            if (!productData.length){
                setAlertState('info')
                setAlert('Saving...')  
                setAlertTimeout(100000)      
            }

            const newProduct = {
                ...productFields,                            
            }

            if(!isProductView){
                newProduct.createdAt = new Date().getTime()
                wrhs.forEach((wrh)=>{
                    newProduct[wrh.name] = []
                })
            }
            
            newProduct.type = defaultProductType
            delete newProduct._id
            if (productData.length){
                newProduct.buyTo = defaultProductFields.buyTo
                newProduct.type = productFields.type
            }
            var newProducts = [...products]

            if (!isProductView){
                newProducts = [newProduct, ...products] 
            }else{
                var filtindex = 0
                products.forEach((product,index)=>{
                    if (product.i_d !== newProduct.i_d){
                        filtindex = index
                        return
                    }                    
                })
                newProducts[filtindex] = newProduct
            }

            var resps
            if (!isProductView){
                resps = await fetchServer("POST", {
                    database: company,
                    collection: "Products", 
                    update: newProduct
                }, "createDoc", server)
            }else{
                // console.log('updating...', newProduct)
                resps = await fetchServer("POST", {
                    database: company,
                    collection: "Products", 
                    prop: [{i_d: newProduct.i_d}, newProduct]
                }, "updateOneDoc", server)
            }                   
            
            if (resps.err){
                console.log(resps.mess)
                setAlertState('info')
                setAlert(resps.mess)
                setAlertTimeout(3000)
                setIsSaveValue(false)
                if (productData.length){
                    setIsOnView(clickedLabel)
                    setIsImportValue(false)
                }
                return
            }else{
                // console.log('product added successfully')
                if(!productData.length){
                    if (!productView){
                        getProductsWithStock(company, products)
                    }else{                        
                        getProducts(company)
                    }
                    // console.log('product added: ', newProduct)
                    setCurProduct(newProduct)
                    if (isProductView){
                        setTimeout(()=>{
                        },2000)

                    }else{
                        setCurProduct(newProduct)
                    }
                    setIsOnView(clickedLabel)
                    setProductFields({...newProduct})
                    setAlertState('success')
                    setAlert(`Updated [${productFields.i_d}] Successfully!`)
                    setAlertTimeout(2000)
                    setIsSaveValue(false)
                    // getProducts(company)
                    return
                }
                    setProducts(newProducts)
                if (productData.length){
                    setAlertState('success')
                    setAlert(`${importCount+1} data uploaded successfully!`)
                    setImportCount((prevCount)=>{
                        return prevCount + 1
                    })                    
                }
            }
        }else{
            setAlertState('error')
            setAlert('Product name is not defined!')
            setAlertTimeout(2000)
            setIsSaveValue(false)
        }
    }

    const deleteProduct = async (productId, createdAt)=>{        
        if(deleteCount === createdAt){
            if (!selectedProducts.length || delCount === 0){
                setAlertState('info')
                setAlert('Deleting Product...')
            }            
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Products", 
                update: {i_d: productId}
            }, "removeDoc", server)
            if (resps.err){
                console.log(resps.mess)
                setAlertState('info')
                setAlert(resps.mess)
                setAlertTimeout(3000)
                setIsDeleteValue(false)
                return;
            }else{
                if (!selectedProducts.length){
                    setIsOnView(false)
                    setIsNewView(false)
                    setCurProduct(null)
                    setAlertState('success')
                    setAlert(`Product [${productId}] Deleted Successfully!`)
                    setAlertTimeout(2000)
                    setDeleteCount(0)
                    setIsDeleteValue(false)
                    getProducts(company)
                    setTimeout(()=>{
                        setProductFields({...defaultProductFields})
                    },300)
                }else{
                    if (delCount >= selectedProducts.length - 1){
                        setAlertState('success')
                        setAlert(`${delCount+1} products deleted successfully!`)
                        setAlertTimeout(2000)
                        setIsDeleteValue(false)
                        getProducts(company)
                        setTimeout(()=>{
                            setSelectedProducts([])
                            setDelCount(0)
                            setDeleteCount(0)
                        },500)
                    }else{
                        setAlertState('success')
                        setAlert(`${delCount + 1} / ${selectedProducts.length} Deleted Successfully!`)
                        setDelCount((prevCount)=>{
                            return prevCount + 1
                        })
                    }
                }
            }        
        }else{
            setDeleteCount(createdAt)
            setIsDeleteValue(false)
            if(!selectedProducts.length){
                setTimeout(()=>{
                    setDeleteCount(0)
                },10000)
            }
        }
    }

    return (
        <>
            <div className='pr-products'>
                {!isImportClicked && isNewProduct && <div className='pr-product' onChange={handleProductFieldChange}>
                    <div className='pr-left'>
                        <div className='nameInpCov'>
                            <label>Product Name</label>
                            <input 
                                className='nameInp'
                                name='name'
                                placeholder='Enter Product Name'
                                value={productFields.name}
                            />
                        </div>
                        <div className='nameInpCov'>
                            <label>Product Type: </label>
                            <div 
                                className='pr-type' 
                                onChange={(e)=>{
                                    const {name} = e.target
                                    setDefaultProductType(name)
                                }}
                            >
                                <div className='pr-type-sub'>
                                    <label>
                                        Goods 
                                    </label>
                                    <input type='checkbox'
                                        name='goods'
                                        checked={defaultProductType === 'goods'}
                                    />
                                </div>
                                <div className='pr-type-sub'>
                                    <label>
                                        Services
                                    </label>
                                    <input type='checkbox'
                                        name='services'
                                        checked={defaultProductType === 'services'}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className='pr-details'>
                            <div className='stock-cov'>
                                <h3>Stock</h3>
                                <div className='stock-table'>
                                    <div className='stock-table-head'>
                                        <div>Location</div>
                                        <div>Quantity</div>
                                    </div>
                                    {Object.keys(productFields.locationStock || {}).map((location, index)=>(
                                        <div className='stock-table-body' key={index}>
                                            <div>{location}</div>
                                            <div>{productFields.locationStock[location].quantity}</div>
                                        </div>
                                    ))}
                                    <div className='stock-table-body'>
                                        <div>All Locations</div>
                                        <div>{Object.values(productFields.locationStock || {}).reduce((sum, item)=>sum + item.quantity, 0)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className='stock-cov' style={{marginTop: 12}}>
                                <h3>Monthly Overview</h3>
                                <div style={{display: 'flex', gap: 12, alignItems: 'center', margin: '6px 0'}}>
                                    <label>Select Month:</label>
                                    <input 
                                        type='month' 
                                        value={selectedMonth}
                                        onChange={(e)=> setSelectedMonth(e.target.value)}
                                        style={{padding: '6px'}}
                                    />
                                </div>
                                <div className='stock-table'>
                                    <div className='stock-table-head'>
                                        <div>Metric</div>
                                        <div>Value</div>
                                    </div>
                                    {monthLoading ? (
                                        <div className='stock-table-body'>
                                            <div>Loading...</div>
                                            <div>—</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className='stock-table-body'>
                                                <div>Sales Quantity</div>
                                                <div>{Number(monthStats.salesQty).toLocaleString()}</div>
                                            </div>
                                            <div className='stock-table-body'>
                                                <div>Sales Amount (₦)</div>
                                                <div>{Number(monthStats.salesAmount).toLocaleString()}</div>
                                            </div>
                                            <div className='stock-table-body'>
                                                <div>Purchase Quantity</div>
                                                <div>{Number(monthStats.purchaseQty).toLocaleString()}</div>
                                            </div>
                                            <div className='stock-table-body'>
                                                <div>Purchase Cost (₦)</div>
                                                <div>{Number(monthStats.purchaseCost).toLocaleString()}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                    <div className='pr-right'>
                        <div className='otherInpCov'>
                            <label>Selling price (₦)</label>
                            <input 
                                className='otherInp'
                                type='number'
                                name='salesPrice'
                                placeholder='0.00'
                                disabled={isProductView && (companyRecord?.status !== 'admin' && !companyRecord?.permissions.includes('edit_product_details'))}
                                value={productFields.salesPrice}
                            />
                        </div>
                        {curPosSettings?.type === 'restaurant' && <div className='otherInpCov'>
                            <label>VIP price (₦)</label>
                            <input 
                                className='otherInp'
                                type='number'
                                name='vipPrice'
                                placeholder='0.00'
                                disabled={isProductView && (companyRecord?.status !== 'admin' && !companyRecord?.permissions.includes('edit_product_details'))}
                                value={productFields.vipPrice !== undefined ? productFields.vipPrice: ''}
                            />
                        </div>}
                        {defaultProductType === 'goods' && <div className='otherInpCov'>
                            <label>Cost price (₦)</label>
                            <input 
                                className='otherInp'
                                type='number'
                                name='costPrice'
                                placeholder='0.00'
                                value={productFields.costPrice}
                                disabled={true}
                            />
                        </div>}
                        <div className='otherInpCov'>
                            <label>Sales vat</label>
                            <input 
                                className='otherInp'
                                type='number'
                                name='salesVat'
                                placeholder='0%'
                                disabled={isProductView && (companyRecord?.status !== 'admin' && !companyRecord?.permissions.includes('edit_product_details'))}
                                value={productFields.salesVat}
                            />
                        </div>
                        {defaultProductType === 'goods' && <div className='otherInpCov'>
                            <label>Purchase vat</label>
                            <input 
                                className='otherInp'
                                type='number'
                                name='purchaseVat'
                                placeholder='0%'
                                disabled={isProductView && (companyRecord?.status !== 'admin' && !companyRecord?.permissions.includes('edit_product_details'))}
                                value={productFields.purchaseVat}
                            />
                        </div>}
                        {defaultProductType === 'goods' && <div className='otherInpCov'>
                            <label>Sales UOM</label>
                            <select 
                                className='otherInp'
                                name='salesUom'
                                value={productFields.salesUom.toLowerCase()}
                                disabled={isProductView && (companyRecord?.status !== 'admin' && !companyRecord?.permissions.includes('edit_product_details'))}
                            >
                                {uoms.map((uom, id)=>{
                                    return (
                                        <option key={id} value={uom.code}>{uom.name}</option>
                                    )
                                })}
                            </select>
                        </div>}
                        {defaultProductType === 'goods' && <div className='otherInpCov'>
                            <label>Purcahse UOM</label>
                            <select 
                                className='otherInp'
                                name='purchaseUom'
                                value={productFields.purchaseUom.toLowerCase()}
                                disabled={isProductView && (companyRecord?.status !== 'admin' && !companyRecord?.permissions.includes('edit_product_details'))}
                            >
                                {uoms.map((uom, id)=>{
                                    return (
                                        <option key={id} value={uom.code}>{uom.name}</option>
                                    )
                                })}
                            </select>
                        </div>}
                        {defaultProductType === 'goods' && <div className='otherInpCov'>
                            <label>Restock Level</label>
                            <input 
                                className='otherInp'
                                type='number'
                                name='restockLevel'
                                placeholder='Restock Level'
                                disabled={isProductView && (companyRecord?.status !== 'admin' && !companyRecord?.permissions.includes('edit_product_details'))}
                                value={productFields.restockLevel}
                            />
                        </div>}
                        {defaultProductType === 'goods' && <div className='otherInpCov'>
                            <label>Buy To</label>
                            <select 
                                className='otherInp'
                                name='buyTo'
                                value={productFields.buyTo}
                                disabled={true}
                            >
                                {wrhs.map((wrh, id)=>{
                                    return (
                                        <option key={id} value={wrh.name}>{wrh.name}</option>
                                    )
                                })}
                            </select>
                        </div>}
                        <div className='otherInpCov'>
                            <label>Category</label>
                            <select 
                                className='otherInp'
                                name='category'
                                placeholder='all'
                                value={productFields.category}
                                disabled={isProductView && (companyRecord?.status !== 'admin' && !companyRecord?.permissions.includes('edit_product_details'))}
                            >
                                <option value={'all'}>All</option>
                                {categories.map((category, id)=>{
                                    return (
                                        category.type === defaultProductType && <option key={id} value={category.code}>{category.name}</option>
                                    )
                                })}
                            </select>
                        </div>
                        <div className='otherInpCov'>
                            <label>Product Id</label>
                            <input 
                                className='otherInp'
                                type='text'
                                name='i_d'
                                disabled={true}
                                placeholder='#000001'
                                value={productFields.i_d}
                            />
                        </div>
                        <div className='otherInpCov'>
                            <label>Barcode</label>
                            <input 
                                className='otherInp'
                                type='text'
                                name='barcode'
                                disabled={isProductView && (companyRecord?.status !== 'admin' && !companyRecord?.permissions.includes('edit_product_details'))}
                                placeholder='#000001'
                                value={productFields.barcode}
                            />
                        </div>
                    </div>
                </div>}
                {!isImportClicked && !isNewProduct && productView === 'card' && <div className='pr-all-products'>
                    {products.map((product, id)=>{
                        return (
                            <div key={id} className='pr-product-card' onClick={()=>{
                                delete product._id
                                setIsOnView(clickedLabel)
                                setProductFields({...product})
                                setIsNewView(clickedLabel)
                                setCurProduct(product)
                            }}>
                                <div className='product-card-name'>{product.name}</div>
                                <div className='product-card-others'>{`[${product.i_d}]`}</div>
                                <div className='product-card-others'>{`Selling Price: ₦${Number(product.salesPrice).toLocaleString()}`}</div>
                                <div className='product-card-others'>{`Purchase UOM: ${product.purchaseUom}`}</div>
                                {product.type === 'goods' ? [''].map((args)=>{
                                    // var availableQty = 0
                                    // wrhs.forEach((wrh)=>{
                                    //     product[wrh.name]?.forEach((entry)=>{
                                    //         availableQty += Number(entry.baseQuantity)
                                    //     })
                                    // })
                                    return <div className='product-card-others'>{`On Hand: ${Number(product.totalStock || 0).toLocaleString()} ${product.salesUom}`}</div>
                                }):
                                    <div className='product-card-others'>{product.type.toUpperCase()}</div>
                                }    
                                <div className='product-card-others-top'>{product.type.toUpperCase()}</div>                            
                            </div>                            
                        )
                    })}
                </div>}
                {!isImportClicked && !isNewProduct && productView === 'list' && <div className='all-product-list'>
                    <div className='product-list product-list-head'>
                        <input type='checkbox' checked={selectedProducts.length === products.length} onClick={()=>{
                            if (selectedProducts.length === products.length){
                                setSelectedProducts([])
                            }else{
                                setSelectedProducts(products.map((product)=>{return product.i_d}))
                            }
                        }}/>
                        <div className='product-list-others'>ID</div>
                        <div className='product-list-name'>Name</div>
                        <div className='product-list-others'>Price</div>
                        <div className='product-list-others'>On Hand</div>
                        <div className='product-list-others-top'>Type</div>
                    </div>
                    {products.map((product, id)=>{
                        return (
                            <div key={id} className='product-list' onClick={(e)=>{
                                const name = e.target.getAttribute('name')
                                if (!selectedProducts.length && name !== 'checkbox'){
                                    delete product._id
                                    setIsOnView(clickedLabel)
                                    setProductFields({...product})
                                    setIsNewView(clickedLabel)
                                    setCurProduct(product)
                                }else{
                                    if (name !== 'checkbox'){
                                        setSelectedProducts((selectedProducts)=>{
                                            return selectedProducts.includes(product.i_d) ? 
                                            selectedProducts.filter((selectedProduct)=>{
                                                return selectedProduct !== product.i_d
                                            }) : [...selectedProducts, product.i_d]
                                        })
                                    }   
                                }
                            }}>
                                <input name='checkbox' checked={selectedProducts.includes(product.i_d)} type='checkbox' onClick={()=>{
                                    setSelectedProducts((selectedProducts)=>{
                                        return selectedProducts.includes(product.i_d) ? 
                                        selectedProducts.filter((selectedProduct)=>{
                                            return selectedProduct !== product.i_d
                                        }) : [...selectedProducts, product.i_d]
                                    })
                                }}/>
                                <div className='product-list-others'>{`[${product.i_d}]`}</div>
                                <div className='product-list-name'>{product.name}</div>
                                <div className='product-list-others'>{`₦${Number(product.salesPrice).toLocaleString()}`}</div>
                                {product.type === 'goods' ? [''].map((args)=>{
                                    // var availableQty = 0
                                    // wrhs.forEach((wrh)=>{
                                    //     product[wrh.name]?.forEach((entry)=>{
                                    //         availableQty += Number(entry.baseQuantity)
                                    //     })
                                    // })
                                    return <div className='product-list-others'>{`On Hand: ${Number(product.totalStock || 0).toLocaleString()} ${product.salesUom}`}</div>
                                }):
                                    <div className='product-list-others'>{product.type.toUpperCase()}</div>
                                }    
                                <div className='product-list-others-top'>{product.type.toUpperCase()}</div>                            
                            </div>                            
                        )
                    })}
                </div>}
                {!isImportClicked && !isNewProduct && products.length === 0 &&
                <div className='noProducts'>
                    Your Products Will Appear Here. Click on the "New" button to add a new product OR click on the "Import Record" button to import products from an excel sheet.
                </div>}
                {isImportClicked && <div className='product-import'>
                    <div className='imp-left'>
                        <div>
                            <button 
                                className='imp-load'
                                onClick={()=>{
                                    loadRef.current.click()
                                }}
                            >
                                Load File
                            </button>
                            {productData.length!==0 && 
                                <button 
                                    className='imp-load button-contrast'
                                    onClick={()=>{
                                        setImportCount(0)
                                    }}
                                >Import Products</button>
                            }
                            <input ref={loadRef} type='file'
                                onChange= {async (e)=>{
                                    const results = await importFile({event : e, fields: productExportFormat, pivot: loadPivot, start: startRow})    
                                    setLoadResult(results)    
                                    setStartRow(results.startIndex)
                                    setProductData(results.result)  
                                    e.target.value = ""              
                                }}
                                style={{display:'none'}}
                            />
                        </div>
                        {(loadResult!==null && loadResult.sheetNames.length!==0) && <div className='pivotOptCov'>                                
                            <div>Sheet Name</div>
                            <select           
                                className='pivotOpt'                     
                                onChange={(e)=>{
                                    setLoadPivot(loadResult?.sheetNames[e.target.value])                                    
                                }}
                                value={loadPivot}
                            >
                                {loadResult?.sheetNames.map((pivot, id)=>{
                                    return <option key={id} value={pivot}>{pivot}</option>
                                })}
                            </select>
                        </div>}                        
                        {loadResult?.headerfound && <div className='pivotOptCov'>                                
                            <div>Start Row</div>
                            <input           
                                className='pivotOpt'
                                value={startRow}                     
                                onChange={(e)=>{
                                    setStartRow(e.target.value)                                    
                                }}
                            />
                        </div>}     
                        {productData.length !==0 && <div className='imp-load-det'>
                            {`${productData.length} Records Found`}
                        </div>}                   
                    </div>
                    <div className='imp-right'>
                        {productData.length === 0 && <button 
                            className='exp-format'
                            onClick={()=>{
                                exportFile([productExportFormat],'ProductExportFormat')
                            }}
                        >Export Product Format</button>}
                        {productData.length !== 0 && <div className='import-cov'>
                            {Object.keys(headersMap).map((column, id)=>{
                                return <div key={id} className='import-card'>
                                    <div>{column}</div>
                                    <select           
                                        className='pivotOpt'                     
                                        onChange={(e)=>{
                                            setHeadersMap((headersMap)=>{
                                                return {...headersMap, [column]: e.target.value}    
                                            })
                                        }}
                                        value={headersMap[column]}
                                    >
                                        <option value = ''>Select Header</option>
                                        {loadResult?.headers.map((header, id)=>{
                                            return <option key={id} value={header}>{header}</option>
                                        })}
                                    </select>
                                </div>
                            })}
                        </div>}

                    </div>
                </div>}
            </div> 
        </>
    )
}
export default Products