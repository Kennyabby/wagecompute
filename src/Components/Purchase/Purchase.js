import './Purchase.css'
import { useEffect, useContext, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useScroll } from 'framer-motion'
import { MdAdd } from 'react-icons/md'
import { FaTableCells } from 'react-icons/fa6'
import PurchaseReport from './PurchaseReport/PurchaseReport'

const Purchase = ()=>{

    const { storePath,
        server, 
        fetchServer,
        companyRecord, allowBacklogs,
        company, getDate, products, getProducts, setProducts,
        employees, getEmployees,months, getPurchase, setPurchase, purchase,
        settings, setAlert, setAlertState, setAlertTimeout, setActionMessage
    } = useContext(ContextProvider)
    const [purchaseStatus, setPurchaseStatus] = useState('Post Purchase')
    const [purchaseDate, setPurchaseDate] = useState(new Date(Date.now()).toISOString().slice(0,10))
    const [curPurchase, setCurPurchase] = useState(null)
    const [productAdd, setProductAdd] = useState(false)
    const [deleteCount, setDeleteCount] = useState(0)
    const [isView, setIsView] = useState(false)
    const [isProductView,setIsProductView] = useState(false)
    const [showReport, setShowReport] = useState(false)
    const [purchaseEntries, setPurchaseEntries] = useState([])
    const [postCount, setPostCount] = useState(0)
    const [uoms, setUoms] = useState([])
    const [categories, setCategories] = useState([])
    const [productPurchased, setProductPurchased] = useState([])
    // const [purchaseWrh, setPurchaseWrh] = useState('')
    const [saleFrom, setSaleFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
    const [saleTo, setSaleTo] = useState(new Date(Date.now()).toISOString().slice(0, 10))
    const [reportPurchase, setReportPurchase] = useState(null)
    const defaultFields = {
        purchaseDepartment:'',
        purchaseHandler:'',
        itemCategory:'',
        purchaseQuantity:'',
        purchaseUOM:'',
        purchaseAmount:'',
        purchaseVendor:'',
    }
    const [fields, setFields] = useState({...defaultFields})
    const departments = ['Bar', 'Kitchen']
    // const purchaseCategory = ['ASSORTED DRINKS', 'ASSORTED PROTEIN', 'INGREDIENTS', 'SWALLOW', 'CEREALS']
    const unitsofmeasurements = [
        'PORTIONS', 'PACKETS', 'CRATES','CARTONS','PACKS'
    ]
    useEffect(()=>{
        storePath('purchase')  
    },[storePath])
    useEffect(()=>{
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        const intervalId = setInterval(()=>{
          if (cmp_val){
            getEmployees(cmp_val)
            getPurchase(cmp_val)
            getProducts(cmp_val)
          }
        },10000)
        return () => clearInterval(intervalId);
    },[window.localStorage.getItem('sessn-cmp')])
    useEffect(()=>{
        if (settings.length){  
            const uomSetFilt = settings.filter((setting)=>{
                return setting.name === 'uom'
            })
            delete uomSetFilt[0]?._id
            setUoms(uomSetFilt[0].name?[...uomSetFilt[0].mearsures]:[])

            const catSetFilt = settings.filter(setting => setting.name === 'product_categories');
            delete catSetFilt[0]?._id;
            setCategories(catSetFilt[0].name ? [...catSetFilt[0].categories] : []);
        }  
    },[settings])

    useEffect(()=>{
        if (companyRecord.status!=='admin'){
            setSaleFrom(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
        }
    },[companyRecord])
    const handlePurchaseEntry = (e)=>{
        const name = e.target.getAttribute('name')
        const value = e.target.value

        if (name){
            if (name === 'itemCategory'){
                setPurchaseEntries([])
                setFields((fields)=>{
                    return {...fields, [name]:value, purchaseUOM: '', purchaseQuantity:''}
                })
            }else{
                setFields((fields)=>{
                    return {...fields, [name]:value}
                })
            }
        }
    }
    const handleViewClick = (pur) =>{
        if (pur.productsRef){
            const entries = []
            products.forEach((product)=>{
                product[product.buyTo].forEach((entry)=>{
                    if (entry.createdAt === pur.productsRef){
                        // console.log('entry',entry,'product', product)
                        entries.push(entry)
                    }
                })
            })
            setPurchaseEntries([...entries])
        }
        setCurPurchase(pur)
        setFields({...pur})
        setIsView(true)
    }

    const handleProductPurchase = ()=>{
        const updateInventory = async ()=>{
            if (fields.purchaseAmount && fields.purchaseVendor && fields.purchaseQuantity &&
                fields.purchaseUOM && fields.purchaseHandler && fields.purchaseDepartment &&
                fields.itemCategory
            ){      
                setAlertState('info')
                setAlert('Updating Inventory...')
                const validEntries = purchaseEntries.filter((entry)=>{
                    const {baseQuantity, totalCost} = entry
                    if (baseQuantity && totalCost){
                        return entry
                    }
                })
                const createdAt = Date.now()
                validEntries.forEach((entry)=>{
                    const purchaseWrh = products[entry.index].buyTo
                    let purchaseData = []
                    products.forEach((prod)=>{
                        if (prod.i_d === (entry.i_d || entry.productId)){
                            purchaseData = prod[purchaseWrh]
                        }
                    })
                    const newProduct = {
                        ...entry,
                        postingDate: new Date(Date.now()).toISOString().slice(0,10),
                        createdAt: createdAt,
                        handlerId: fields.purchaseHandler,
                    }
                    purchaseData.push(newProduct)
                    const resps = fetchServer("POST", {
                        database: company,
                        collection: "Products",
                        prop: [{i_d: (newProduct.productId || newProduct.i_d)}, {[purchaseWrh]: purchaseData}]
                    }, "updateOneDoc", server)
                    if (resps.err){
                        console.log(resps.mess)
                        setAlertState('error')
                        setAlert(resps.mess)
                        setAlertTimeout(5000)
                    }else{
                        setPostCount((prevCount)=>{
                            const newCount = prevCount + 1
                            if(newCount === validEntries.length){
                                setProductAdd(false)
                                setAlertState('success')
                                setAlert(`${validEntries.length} Inventory Updated Successfully!`)                        
                                getProducts(company)
                                if (curPurchase === null){
                                    setTimeout(()=>{                            
                                        addPurchase(createdAt)
                                    },500)
                                }else{
                                    setTimeout(async () => {
                                        setAlertState('info');
                                        setAlert('Linking to Posted Purchase...');
                                        const resps1 = await fetchServer("POST", {
                                            database: company,
                                            collection: "Purchase",
                                            prop: [{ createdAt: curPurchase.createdAt }, { 
                                                productsRef: createdAt,  
                                                purchaseQuantity: fields.purchaseQuantity,
                                                purchaseUOM: 'units'
                                            }]
                                        }, "updateOneDoc", server);
            
                                        if (resps1.err) {
                                            console.log(resps1.mess);
                                            setAlertState('info');
                                            setAlert(resps1.mess);
                                            setAlertTimeout(5000);
                                        } else {
                                            setAlertState('success');
                                            setAlert('Products Linked Successfully!');
                                            setAlertTimeout(3000);
                                            const entries = []
                                            products.forEach((product)=>{
                                                product[product.buyTo].forEach((entry)=>{
                                                    if (entry.createdAt === createdAt){
                                                        entries.push(entry)
                                                    }
                                                })
                                            })
                                            setPurchaseEntries([...entries])
                                            setFields((fields)=>{
                                                return {...fields, productsRef: createdAt}
                                            })
                                            getPurchase(company);
                                        }
                                        return
                                    }, 1000);
                                }
                            }else{
                                setAlertState('success')
                                setAlert(`${newCount} / ${validEntries.length} Inventory Updated Successfully!`)
                            }

                            return newCount
                        })
                    }        
                })
            }else{ 
                setAlertState('error')
                setAlert('All Fields Are Required! Kindly Fill All')
                setAlertTimeout(5000)
            }
        }
        setPostCount(0)
        if (fields.purchaseUOM!=='units'){
            var totalQuantity = 0
            var totalAmount = 0
            purchaseEntries.filter((entry)=>{
                const {baseQuantity, totalCost} = entry
                if (baseQuantity && totalCost){
                    totalQuantity += Number(baseQuantity)
                    totalAmount += Number(totalCost)
                    return entry
                }
            })
            if (Number(totalAmount) === Number(fields.purchaseAmount)){
                setFields((fields)=>{
                    return {...fields, purchaseQuantity: totalQuantity, purchaseUOM: 'units'}
                })     
                if(curPurchase!==null){
                    setTimeout(()=>{
                        updateInventory()
                        return
                    },500)
                }else{
                    setProductAdd(false)
                }
            }else{
                setAlertState('error')
                setAlert('Total Purchase Amount does not match the sum of the Products Amounts')
                setAlertTimeout(5000)
            }
        }else{
            updateInventory()
        }

        
    }

    const addPurchase = async (productsRef)=>{
        setAlertState('info')
        setAlert('Posting Purchase...')
        setPurchaseStatus('Posting Purchase...')
        const newPurchase = {
            ...fields,
            postingDate:purchaseDate,
            productsRef,
            createdAt: Date.now()
        }
        const newPurchases = [newPurchase, ...purchase]
        
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Purchase", 
            update: newPurchase
            }, "createDoc", server)
                                        
            if (resps.err){
                console.log(resps.mess)
                setPurchaseStatus('Post Purchase')
                setAlertState('error')
                setAlert(resps.mess)
                setAlertTimeout(5000)
            }else{
                setPurchaseStatus('Post Purchase')
                setPurchase(newPurchases)
                setCurPurchase(newPurchase)
                setIsView(true)
                setFields({...newPurchase})
                setAlertState('success')
                setAlert('Purchase Record Posted Successfully!')
                const entries = []
                products.forEach((product)=>{
                    product[product.buyTo].forEach((entry)=>{
                        if (entry.createdAt === newPurchase.productsRef){
                            entries.push(entry)
                        }
                    })
                })
                setPurchaseEntries([...entries])
                setAlertTimeout(5000)
                getPurchase(company)
            }
        
    }

    const deletePurchase = async (purchase)=>{
        if(deleteCount === purchase.createdAt){
            setAlertState('info')
            setAlert('Deleting Purchase...')
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Purchase", 
                update: {createdAt: purchase.createdAt}
            }, "removeDoc", server)
            if (resps.err){
                console.log(resps.mess)
                setAlertState('info')
                setAlert(resps.mess)
                setAlertTimeout(5000)
            }else{
                setIsView(false)
                setCurPurchase(null)
                setFields({...defaultFields})
                setAlertState('success')
                setAlert('Purchase Record Deleted Successfully!')
                setAlertTimeout(5000)
                setDeleteCount(0)
                getPurchase(company)
            }        
        }else{
            setDeleteCount(purchase.createdAt)
            setTimeout(()=>{
                setDeleteCount(0)
            },12000)
        }
    }

    const calculateReportPurchase = ()=>{
        var filteredReportPurchases = purchase.filter((ftrpurchase)=>{
            const prPostingDate = new Date(ftrpurchase.postingDate).getTime()
            const fromDate = new Date(saleFrom).getTime()
            const toDate = new Date(saleTo).getTime()
            if ( prPostingDate>= fromDate && prPostingDate<=toDate
            ){
                return ftrpurchase
            }
        })
        setReportPurchase(filteredReportPurchases)
    }
    return (
        <>
            <div className='purchase'>
                {productAdd && <AddProduct
                    products = {products}
                    category = {fields.itemCategory}
                    curPurchase = {curPurchase}
                    setProductAdd = {setProductAdd}
                    uoms = {uoms}
                    handleProductPurchase = {handleProductPurchase}
                    purchaseEntries={purchaseEntries}
                    setPurchaseEntries={setPurchaseEntries}
                    isProductView={isProductView}
                    setIsProductView={setIsProductView}
                />}
                {showReport && <PurchaseReport
                    reportPurchases = {reportPurchase}
                    multiple = {true}
                    setShowReport={(value)=>{
                        setShowReport(value)                        
                    }}              
                    fromDate = {saleFrom}
                    toDate = {saleTo}
                />}    
                <div className='purlst'>
                    {companyRecord.status==='admin' && <FaTableCells                         
                        className='allslrepicon'
                        onClick={()=>{
                            calculateReportPurchase()
                            if (saleTo && saleFrom){                                
                                setShowReport(true)
                            }
                        }}
                    />}
                    {<MdAdd 
                        className='add slsadd'
                        onClick={()=>{
                            setIsView(false)
                            setFields({...defaultFields})
                            setCurPurchase(null)
                        }}
                    />}
                    <div className='payeeinpcov'>
                        <div className='inpcov formpad'>
                            <div>Date From</div>
                            <input 
                                className='forminp prinps'
                                name='salesfrom'
                                type='date'
                                placeholder='From'
                                value={saleFrom}
                                disabled={!allowBacklogs}
                                onChange={(e)=>{
                                    setSaleFrom(e.target.value)
                                }}
                            />
                        </div>
                        <div className='inpcov formpad'>
                            <div>Date To</div>
                            <input 
                                className='forminp prinps'
                                name='salesto'
                                type='date'
                                placeholder='To'
                                value={saleTo}
                                disabled={!allowBacklogs}
                                onChange={(e)=>{
                                    setSaleTo(e.target.value)
                                }}
                            />
                        </div>
                    </div>
                    {purchase.filter((purfltr)=>{
                        if (purfltr.postingDate >= saleFrom && purfltr.postingDate <= saleTo){
                            return purfltr
                        }
                    }).map((pur, index)=>{
                        const {
                            createdAt,postingDate, 
                            purchaseAmount, purchaseQuantity,
                            purchaseUOM, purchaseDepartment,
                            itemCategory,purchaseHandler 
                        } = pur
                        var handlerName = ''
                        employees.forEach((emp)=>{
                            if (emp.i_d === purchaseHandler){
                                handlerName = `${emp.firstName} ${emp.lastName}`
                            }
                        })
                        return(
                            <div className={'dept' + (curPurchase?.createdAt===createdAt?' curview':'')} key={index} 
                                onClick={(e)=>{
                                    handleViewClick(pur)
                                }}
                            >
                                <div className='dets sldets'>
                                    <div>Posting Date: <b>{getDate(postingDate)}</b></div>
                                    <div>Purchase Department: <b>{purchaseDepartment}</b></div>                                    
                                    <div>Purchase Amount: <b>{'₦'+(Number(purchaseAmount)).toLocaleString()}</b></div>                                    
                                    <div>Purchase Details: <b>{`${Number(purchaseQuantity).toLocaleString()} ${purchaseUOM.toUpperCase()} of ${itemCategory}`}</b></div>                                    
                                    <div className='deptdesc'>{`Purchase Handled By:`} <b>{`${handlerName}`}</b></div>
                                </div>
                                {(companyRecord.status==='admin') && <div 
                                    className='edit'
                                    name='delete'         
                                    style={{color:'red'}}                           
                                    onClick={()=>{                                        
                                        setAlertState('info')
                                        setAlert('You are about to delete the selected Purchase Record. Please Delete again if you are sure!')
                                        setAlertTimeout(5000)                                                                                    
                                        deletePurchase(pur)
                                    }}
                                >
                                    Delete
                                </div>}
                            </div>
                        )
                    })}
                </div>
                <div className='purinfo'>
                    <div className='purinfotitle'>DIRECT COST ENTRY</div>
                    <div className='purinfocontent' onChange={handlePurchaseEntry}>
                        <div className='inpcov'>
                            <div>Select Department</div>
                            <select 
                                className='forminp'
                                name='purchaseDepartment'
                                type='text'
                                value={fields.purchaseDepartment}  
                                disabled={isView}                              
                            >
                                <option value=''>Select Department</option>
                                {departments.map((dept, index)=>{
                                    return (
                                        <option key={index} value={dept}>{dept}</option>
                                    )
                                })}
                            </select>
                        </div>
                        <div className='inpcov'>
                            <div>Vendor</div>
                            <input 
                                className='forminp'
                                name='purchaseVendor'
                                type='text'
                                placeholder='Vendor'
                                value={fields.purchaseVendor}
                                disabled={isView}
                            />
                        </div>
                        <div className='inpcov'>
                            <div>Select Purchase Handler</div>
                            <select 
                                className='forminp'
                                name='purchaseHandler'
                                type='text'
                                value={fields.purchaseHandler}     
                                disabled={isView}                           
                            >
                                <option value=''>Select Purchase Handler</option>
                                {employees.map((employee)=>{
                                    return (
                                        <option 
                                            key={employee.i_d}
                                            value={employee.i_d}
                                        >
                                            {`(${employee.i_d}) ${employee.firstName.toUpperCase()} ${employee.lastName.toUpperCase()} - ${employee.position}`}
                                        </option>
                                    )
                                })}
                            </select>
                        </div>
                        <div className='inpcov'>
                            <div>Item Category</div>
                            <select 
                                className='forminp'
                                name='itemCategory'
                                type='text'
                                value={fields.itemCategory.toLowerCase()}
                                disabled={isView}
                            >
                                <option value=''>Item Category</option>
                                {categories.map((category, index)=>{
                                    return (
                                        <option key={index} value={category.code}>{category.name}</option>
                                    )
                                })}
                            </select>
                        </div>
                        {(fields.productsRef || isView) && <div className='inpcov'>
                            <div>Purchase Quantity</div>
                            <input 
                                className='forminp'
                                name='purchaseQuantity'
                                type='number'
                                placeholder='Purchase Quantity'
                                value={fields.purchaseQuantity}
                                disabled={isView}
                            />
                        </div>}
                        {(fields.productsRef || isView) && <div className='inpcov'>
                            <div>Unit of Measurement</div>
                            <select 
                                className='forminp'
                                name='purchaseUOM'
                                type='text'
                                value={fields.purchaseUOM}
                                disabled={isView}
                            >
                                <option value=''>Unit of Measurement</option>
                                <option value='units'>UNITS</option>
                                {unitsofmeasurements.map((uom, index)=>{
                                    return (
                                        <option key={index} value={uom}>{uom}</option>
                                    )
                                })}
                            </select>
                        </div>}
                        <div className='inpcov'> 
                            <div>Purchase Amount</div>
                            <input 
                                className='forminp'
                                name='purchaseAmount'
                                type='number'
                                placeholder='Purchase Amount'
                                value={fields.purchaseAmount}
                                disabled={isView}
                            />
                        </div>
                        {(fields.productsRef || fields.purchaseUOM === 'units') ? 
                        <div 
                            className='prd-link'
                            onClick={()=>{
                                setIsProductView(true)
                                setProductAdd(true)
                            }}
                        >
                            {`View All (${fields.purchaseQuantity.toLocaleString()}) Quantities`}
                        </div> : 
                        (<div 
                            className='prd-link'
                            onClick={()=>{
                                if (fields.purchaseAmount && fields.itemCategory){
                                    setIsProductView(false)
                                    setProductAdd(true)
                                }else{
                                    setAlertState('error')
                                    if (!fields.itemCategory){
                                        setAlert('Please Select Item Category!')
                                    }else{
                                        setAlert('Please Enter Purchase Amount First!')
                                    }
                                    setAlertTimeout(5000)
                                }
                            }}
                        >
                            Link Products
                        </div>)}
                    </div>
                    {!isView && <div className='purchasebuttom'>
                        <div className='inpcov'>
                            <input 
                                className='forminp'
                                name='purchasedate'
                                type='date'
                                placeholder='Purchase Date'
                                value={purchaseDate}
                                onChange={(e)=>{
                                    setPurchaseDate(e.target.value)
                                }}
                            />
                        </div>
                        <div 
                            className='purchasebutton'
                            style={{cursor: purchaseEntries.length ? 'pointer':'not-allowed'}}
                            onClick={()=>{
                                if(purchaseEntries.length){
                                    handleProductPurchase()
                                }
                            }}                    
                        >{purchaseStatus}</div>
                    </div>}
                </div>
            </div>
        </>
    )
}

export default Purchase

const AddProduct = ({
    products, category, curPurchase, setProductAdd, uoms, isProductView, setIsProductView,
    handleProductPurchase, purchaseEntries, setPurchaseEntries 
})=>{    
    useEffect(()=>{
        if (!isProductView){
            const fltProducts = products.filter((product)=>{
                return product.category === category.toLowerCase()
            })
            setPurchaseEntries(fltProducts.map((product, index)=>{
                const uom1 = uoms.filter((uom)=>{
                    return uom.code === product.purchaseUom
                })                
                return {                
                    productId : product.i_d,
                    index: index,
                    name: product.name,
                    quantity: '',
                    baseQuantity: 0,
                    purchaseUom: product.purchaseUom,
                    baseUom: uom1[0]?.base,
                    totalCost: '',
                    entryType: 'Purchase',
                    documentType: 'Receipt'
                }
            }))
        }
    },[])
    useEffect(()=>{
        // console.log(products)
    },[products])
    const handlePurchaseUdpate = (e, index)=>{
        const name = e.target.getAttribute('name')
        const value = e.target.value
        if (name){
            if (name === 'quantity'){
                const uom2 = uoms.filter((uom)=>{
                    return uom.code === purchaseEntries[index].purchaseUom
                })
                // console.log(uom)
                setPurchaseEntries((entries)=>{
                    entries[index][name] = Number(value)
                    entries[index].baseQuantity = Number(value) * Number(uom2[0]?.multiple)
                    return [...entries]
                })
            }else{
                setPurchaseEntries((entries)=>{
                    entries[index][name] = value
                    return [...entries]
                })
            }
        }
    }
    return (
        <>
            <div className='addproduct'>
                <div className='add-products'>
                    <div className='add-products-title'>Purchased Details</div>
                    <div className='add-products-content'>
                        <div className='add-products-content-title'>
                            <div>Product Name</div>
                            <div>Product ID</div>
                            <div>Purchase Quantity</div>
                            <div>Purchase UOM</div>
                            <div>Purchase Amount</div>
                        </div>
                        {purchaseEntries.sort((a,b) => {
                            const numA = parseInt(a.productId.replace("PD", ""), 10);
                            const numB = parseInt(b.productId.replace("PD", ""), 10);
                            return numA - numB;
                        }).map((entry, index)=>{
                            return (
                                <div key={index} className='add-products-content-entry'>
                                    <div>{entry.name}</div>
                                    <div>{entry.productId}</div>
                                    <div>
                                        <input 
                                            type='number'
                                            name='quantity'
                                            value={entry.quantity}
                                            onChange={(e)=>{handlePurchaseUdpate(e, index)}}
                                            disabled={isProductView}
                                        />
                                    </div>
                                    <div>
                                        <select 
                                            name='purchaseUom'
                                            value={entry.purchaseUom}
                                            onChange={(e)=>{handlePurchaseUdpate(e, index)}}
                                            disabled={isProductView}
                                        >
                                            {uoms.map((uom, idx)=>{
                                                return (
                                                    <option key={idx} value={uom.code}>{uom.name}</option>
                                                )
                                            })}
                                        </select>
                                    </div>
                                    <div>
                                        <input 
                                            name='totalCost'
                                            type='number'
                                            value={entry.totalCost}
                                            disabled={entry.baseQuantity === 0 || isProductView}
                                            onChange={(e)=>{handlePurchaseUdpate(e, index)}}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className='add-products-button'>
                        {!isProductView && <div 
                            className='add-products-button-add'
                            onClick={handleProductPurchase}
                        >{curPurchase===null ? 'Add' : 'Save'}</div>}
                        <div 
                            className='add-products-button-cancel'
                            onClick={()=>{
                                setIsProductView(false)
                                setProductAdd(false)
                                if(!isProductView){
                                    setPurchaseEntries([])
                                }
                            }}
                        >{isProductView?'Close':'Cancel'}</div>
                    </div>
                </div>
            </div>
        </>
    )
}