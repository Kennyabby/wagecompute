import './Products.css'

import { useState, useEffect, useRef, useContext } from "react";
import ContextProvider from '../../../Resources/ContextProvider';

const Products = ({
    isNewProduct, isProductView,
    setIsOnView, setIsNewView,
    clickedLabel, isSaveClicked, setIsSaveValue,
    isDeleteClicked, setIsDeleteValue,
    isImportClicked, setIsImportValue,
    productView, setCurProduct, curProduct
})=>{     
    const {
        server, fetchServer, generateSeries,
        setAlert, setAlertState, setAlertTimeout,
        products, company, setProducts, getProducts,
        settings, exportFile, importFile
    } = useContext(ContextProvider)
    const loadRef = useRef(null)
    const intervalRef = useRef(null)
    const [wrhs, setWrhs] = useState([])
    const [uoms, setUoms] = useState([])
    const [categories, setCategories] = useState([])
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
        salesPrice: '',
        costPrice: '',
        category: 'all',
        purchaseVat:'',
        salesVat:'',
        salesUom:'pcs',
        purchaseUom:'pcs',
        buyTo: ''
    })
    const productExportFormat = {
        name: '',
        salesPrice: '',
        costPrice: '',
        category: 'all',
        purchaseVat:'',
        salesVat:'',
        salesUom:'pcs',
        purchaseUom:'pcs',
        type:'goods'
    }
    const [headersMap, setHeadersMap] = useState({
        name: 'name',
        salesPrice: 'salesPrice',
        costPrice: 'costPrice',
        category: 'category',
        purchaseVat:'purchaseVat',
        salesVat: 'salesVat',
        salesUom:'salesUom',
        purchaseUom:'purchaseUom',
        type:'type',
    })

    const [productFields, setProductFields] = useState({...defaultProductFields})
    
    useEffect(()=>{
        if (!curProduct){
            var cmp_val = window.localStorage.getItem('sessn-cmp')
            intervalRef.current = setInterval(()=>{
              if (cmp_val){
                getProducts(cmp_val)
              }
            },10000)
            return () => clearInterval(intervalRef.current);
        }else{
            if(intervalRef.current){
                clearInterval(intervalRef.current)
            }
        }
    },[window.localStorage.getItem('sessn-cmp'), curProduct])

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
            setProductFields({...curProduct})
        }
    },[curProduct])
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
            console.log('')
            console.log('@ isDeleteClicked =',isDeleteClicked,'and isProductView =',isProductView,'and products length = ', selectedProducts.length,'Count updated to:',delCount)
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
                    setAlertTimeout(5000)
                    setIsDeleteValue(false)
                }
            }else{
                setAlertState('info')
                setAlert('You are about to delete this product. Please Delete again if you are sure!')
                setAlertTimeout(5000)
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
                    setAlertTimeout(7000)   
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
                setAlertTimeout(5000)
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
                resps = await fetchServer("POST", {
                    database: company,
                    collection: "Products", 
                    prop: [{createdAt: newProduct.createdAt}, newProduct]
                }, "updateOneDoc", server)
            }                   
            
            if (resps.err){
                console.log(resps.mess)
                setAlertState('info')
                setAlert(resps.mess)
                setAlertTimeout(5000)
                setIsSaveValue(false)
                if (productData.length){
                    setIsOnView(clickedLabel)
                    setIsImportValue(false)
                }
                return
            }else{
                if(!productData.length){
                    setCurProduct(newProduct)
                    setIsOnView(clickedLabel)
                    setProductFields({...newProduct})
                    setAlertState('success')
                    setAlert('Updated!')
                    setAlertTimeout(5000)
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
            setAlertTimeout(5000)
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
                setAlertTimeout(5000)
                setIsDeleteValue(false)
                return;
            }else{
                if (!selectedProducts.length){
                    setIsOnView(false)
                    setIsNewView(false)
                    setCurProduct(null)
                    setAlertState('success')
                    setAlert(`Product [${productId}] Deleted Successfully!`)
                    setAlertTimeout(8000)
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
                        setAlertTimeout(8000)
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
            <div className='products'>
                {!isImportClicked && isNewProduct && <div className='product' onChange={handleProductFieldChange}>
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
                        <div className='pr-details'></div>
                    </div>
                    <div className='pr-right'>
                        <div className='otherInpCov'>
                            <label>Selling price (₦)</label>
                            <input 
                                className='otherInp'
                                type='number'
                                name='salesPrice'
                                placeholder='0.00'
                                value={productFields.salesPrice}
                            />
                        </div>
                        {defaultProductType === 'goods' && <div className='otherInpCov'>
                            <label>Cost price (₦)</label>
                            <input 
                                className='otherInp'
                                type='number'
                                name='costPrice'
                                placeholder='0.00'
                                value={productFields.costPrice}
                            />
                        </div>}
                        <div className='otherInpCov'>
                            <label>Sales vat</label>
                            <input 
                                className='otherInp'
                                type='number'
                                name='salesVat'
                                placeholder='0%'
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
                                value={productFields.purchaseVat}
                            />
                        </div>}
                        {defaultProductType === 'goods' && <div className='otherInpCov'>
                            <label>Sales UOM</label>
                            <select 
                                className='otherInp'
                                name='salesUom'
                                value={productFields.salesUom}
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
                                value={productFields.purchaseUom}
                            >
                                {uoms.map((uom, id)=>{
                                    return (
                                        <option key={id} value={uom.code}>{uom.name}</option>
                                    )
                                })}
                            </select>
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
                    </div>
                </div>}
                {!isImportClicked && !isNewProduct && productView === 'card' && <div className='all-products'>
                    {products.map((product, id)=>{
                        return (
                            <div key={id} className='product-card' onClick={()=>{
                                delete product._id
                                setIsOnView(clickedLabel)
                                setProductFields({...product})
                                setIsNewView(clickedLabel)
                                setCurProduct(product)
                            }}>
                                <div className='product-card-name'>{product.name}</div>
                                <div className='product-card-others'>{`[${product.i_d}]`}</div>
                                <div className='product-card-others'>{`Selling Price: ₦${Number(product.salesPrice).toLocaleString()}`}</div>
                                {product.type === 'goods' ? [''].map((args)=>{
                                    var availableQty = 0
                                    wrhs.forEach((wrh)=>{
                                        product[wrh.name]?.forEach((entry)=>{
                                            availableQty += Number(entry.baseQuantity)
                                        })
                                    })
                                    return <div className='product-card-others'>{`On Hand: ${availableQty.toLocaleString()} ${product.salesUom}`}</div>
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
                                    var availableQty = 0
                                    wrhs.forEach((wrh)=>{
                                        product[wrh.name]?.forEach((entry)=>{
                                            availableQty += Number(entry.baseQuantity)
                                        })
                                    })
                                    return <div className='product-list-others'>{`On Hand: ${availableQty.toLocaleString()} ${product.salesUom}`}</div>
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