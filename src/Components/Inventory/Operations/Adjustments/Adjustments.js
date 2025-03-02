import './Adjustments.css'

import { useState, useEffect, useRef, useContext } from "react";
import ContextProvider from '../../../../Resources/ContextProvider';

const Adjustments = ({
    setIsOnView, isNewEntry, setIsNewView,
    clickedLabel, isSaveClicked, setIsSaveValue,
    isDeleteClicked, setIsDeleteValue,
    isImportClicked, setIsImportValue,
})=>{
    const {
        server, fetchServer, generateSeries,
        setAlert, setAlertState, setAlertTimeout,
        products, company, companyRecord, setProducts, getProducts,
        settings, exportFile, importFile
    } = useContext(ContextProvider)
    const intervalRef = useRef(null);
    const [wrhs, setWrhs] = useState([])
    const [categories, setCategories] = useState([])
    const [curWarehouse, setCurWarehouse] = useState('all')
    const [curCategory, setCurCategory] = useState('all')
    const [headers, setHeaders] = useState([])

    const defaultColumns = [ 
        {name: 'Product ID', reference:'i_d', show:true},
        {name: 'Product Name', reference:'name', show:true},
        {name: 'Base UOM', reference:'salesUom', show:true},
        {name: 'Unit Cost', reference: 'costPrice', show:true},
        {name: 'Quantity', reference:'available quantity', show:true}, 
        {name: 'Counted Quantity', reference:'counted quantity', show:true},
        {name: 'Difference', reference:'difference', show:true}, 
        {name: 'Difference Cost', reference:'differenceCost', show:true}, 
        // {name: 'User', reference:'user'}
    ]

    const [columns, setColumns] = useState([ 
        {name: 'Product ID', reference:'i_d', show:true},
        {name: 'Product Name', reference:'name', show:true},
        {name: 'Base UOM', reference:'salesUom', show:true},
        {name: 'Unit Cost', reference: 'costPrice', show:true},
        {name: 'Quantity', reference:'available quantity', show:true}, 
        {name: 'Counted Quantity', reference:'counted quantity', show:false},
        {name: 'Difference', reference:'difference', show:false}, 
        {name: 'Difference Cost', reference:'differenceCost', show:false},])

    const [adjustmentEntries, setAdjustmentEntries] = useState([])

    useEffect(() => {
        if (!isNewEntry){            
            const cmp_val = window.localStorage.getItem('sessn-cmp');
        
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        
            if (cmp_val) {
                intervalRef.current = setInterval(() => {
                    getProducts(cmp_val);
                }, 10000);
            }
        
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }else{
            if (intervalRef.current){
                clearInterval(intervalRef.current);
            }
            return () => {
                if (intervalRef.current){
                    clearInterval(intervalRef.current);
                }
            }
        }
    }, [window.localStorage.getItem('sessn-cmp'), isNewEntry]);
    

    useEffect(()=>{
        if (settings.length){
            const wrhSetFilt = settings.filter((setting)=>{
                return setting.name === 'warehouses'
            })

            delete wrhSetFilt[0]?._id
            setWrhs(wrhSetFilt[0].name?[...wrhSetFilt[0].warehouses]:[])

            const wrhCatFilt = settings.filter((setting)=>{
                return setting.name === 'product_categories'
            })

            delete wrhCatFilt[0]?._id
            setCategories(wrhCatFilt[0].name?[...wrhCatFilt[0].categories]:[])
        }  
    },[settings])

    useEffect(()=>{
        resetCount()
        if(isNewEntry){            
            if (curWarehouse!=='all'){
                setColumns([...defaultColumns])
            }
        }else{
            setColumns((columns)=>{
                columns.forEach((column)=>{                                        
                    if (['difference', 'differenceCost', 'counted quantity'].includes(column.reference)){
                        column.show = false
                    }
                })
                return [...columns]
            })
        }
    },[products, isNewEntry, curWarehouse])

    
    useEffect(()=>{
        if (isSaveClicked){            
            const adjustments = [...adjustmentEntries]
            var entct = 0
            const fltAdjustments = adjustments.filter((entFlt)=>{
                return Math.abs(Number(entFlt.difference)) > 0
            })            
            if (fltAdjustments.length){
                setAlertState('info')
                setAlert('Posting...')
            }
            fltAdjustments.forEach((entry)=>{
                let absVal = Math.abs(Number(entry.difference))
                let val = Number(entry.difference)/absVal
                let entryIndex = entry.index
                entry.baseQuantity = Number(entry.difference)
                entry.entryType = (val===-1? 'Nagative Entry' : 'Positive Entry')
                entry.documentType = (val===-1? 'Negative Adjustment' : 'Positive Adjustment')
                entry.totalCost = Number(entry.difference) * Number(entry.costPrice)
                entry.createdAt = new Date().getTime()
                delete entry.index 
                const adjustedProduct = [...products[entryIndex][curWarehouse], {...entry}]                
                entct++
                // console.log(adjustedProduct)
                postAdjustments(adjustedProduct, entry.i_d, fltAdjustments.length, entct)
            })

        }
    },[isSaveClicked])
    
    const handleInputChange = ({e, availableQty, productId})=>{
        const {name, value} = e.target
        let index
        adjustmentEntries.forEach((entry, i)=>{
            if (entry.i_d === productId){
                index = i
            }
        })
        setAdjustmentEntries((adjustmentEntries)=>{
            adjustmentEntries[index] = {...adjustmentEntries[index], [name]:value, difference: value === '' ? 0 : (Number(value) - Number(availableQty))}
            return [...adjustmentEntries]
        })
    }

    const resetCount = ()=>{
        setAdjustmentEntries([])
        products.forEach((product, index)=>{
            if (product.type === 'goods'){
                const entry = {}
                entry.i_d = product.i_d
                entry.costPrice = product.costPrice
                entry.index = index
                entry.difference = ''
                entry.baseQuantity = ''
                entry.counted = ''
                entry.userId = companyRecord.emailid
                setAdjustmentEntries((adjustmentEntries)=>{
                    return [...adjustmentEntries, entry]
                })
            }
        })
    }

    const postAdjustments = async (adjustedProduct, i_d, length, count)=>{        
        setAlertState('info')
        setAlert(`Adjusting ${count} / ${length} ...`)
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Products", 
            prop: [{i_d: i_d}, {[curWarehouse]: [...adjustedProduct]}]
        }, "updateOneDoc", server)
        if (resps.err){
            console.log(resps.mess)
            setAlertState('info')
            setAlert(resps.mess)
            setAlertTimeout(5000)
            setIsSaveValue(false)
            setIsOnView(clickedLabel)
        }else{
            setIsOnView(clickedLabel)
            setIsNewView(false)
            getProducts(company)
            if (count === length){
                setAlertState('success')
                setAlert(`Adjustments Posted Successfully!`)
                setAlertTimeout(5000)                    
            }
        }
        setIsSaveValue(false)
    }
    
    return (
        <>
            <div className='adjustments'>
                <div className='adj-left'>                    
                    <div className='adj-title'>Warehouses</div>                    
                    <div className='adj-list' onClick={(e)=>{
                        const name = e.target.getAttribute('name')
                        if (name){
                            resetCount()
                            if (name === 'all'){
                                setColumns((columns)=>{
                                    columns.forEach((column)=>{                                        
                                        if (['difference', 'differenceCost', 'counted quantity'].includes(column.reference)){
                                            column.show = false
                                        }
                                    })
                                    return [...columns]
                                })
                            }else{
                                if(isNewEntry){
                                    setColumns([...defaultColumns])
                                }
                            }
                            setCurWarehouse(name)
                        }
                    }}>
                        <div className={(curWarehouse === 'all'? 'opt-active' : '')} name='all'>All</div>
                        {wrhs.map((wrh)=>{
                            return <div 
                                className={(wrh.name === curWarehouse)? 'opt-active':''}
                                name={wrh.name}>{wrh.name.toUpperCase()}
                            </div>
                        })}
                    </div>
                    <div className='adj-title'>Categories</div>
                    <div className='adj-list' onClick={(e)=>{
                        const name = e.target.getAttribute('name')
                        if (name){
                            setCurCategory(name)
                        }
                    }}>
                        <div className={(curCategory === 'all'? 'opt-active' : '')} name='all'>All</div>
                        {categories.map((category)=>{
                            if (category.type === 'goods'){
                                return <div 
                                    className={(category.code === curCategory)? 'opt-active':''}
                                    name={category.code}> {category.name}
                                </div>
                            }
                        })}
                    </div>
                </div>
                <div className='adj-right'>
                    {columns.map((col, index)=>{
                        return col.show && <div className='adj-right-content' key={index}>
                            <div className='colname'>{col.name}</div>
                            {products.filter((prflt)=>{
                                if (curCategory === 'all'){
                                    return prflt.type === 'goods'
                                }else{
                                    if (prflt.type === 'goods'){
                                        return prflt.category === curCategory
                                    }
                                }
                            }).map((product, index1)=>{
                                let cummulativeUnitCostPrice = 0
                                let totalCostValue = 0
                                let totalBaseQuantity = 0
                                wrhs.forEach((wrh)=>{
                                    if (wrh.purchase){
                                        product[wrh.name].forEach((entry)=>{
                                            totalBaseQuantity += entry.baseQuantity ? Number(entry.baseQuantity) : 0
                                            totalCostValue += entry.totalCost ? Number(entry.totalCost) : 0
                                        })
                                    }
                                })
                                cummulativeUnitCostPrice = totalBaseQuantity !== 0 ? (totalCostValue/totalBaseQuantity) : 0
                                product.costPrice = cummulativeUnitCostPrice
                                let availableQty = 0
                                if (['available quantity', 'difference', 'differenceCost', 'counted quantity'].includes(col.reference)){
                                    wrhs.forEach((wrh)=>{ 
                                        if (curWarehouse === 'all'){
                                            product[wrh.name]?.forEach((entry)=>{
                                                availableQty += Number(entry.baseQuantity)
                                            })
                                        }else{
                                            if (wrh.name === curWarehouse){
                                                product[wrh.name]?.forEach((entry)=>{
                                                    availableQty += Number(entry.baseQuantity)
                                                })
                                            }                                       
                                        }
                                    })
                                    if (col.reference === 'available quantity'){
                                        return <div className='colrows' key={index1}>{availableQty}</div>
                                    }else if (col.reference === 'counted quantity'){
                                        return <input
                                            key={index1}
                                            type='number'   
                                            className='countedInp'
                                            name='counted'
                                            value={adjustmentEntries.filter(entry => product.i_d === entry.i_d)[0]?.counted}
                                            onChange={(e)=>{handleInputChange({e, availableQty, productId: product.i_d})}} 
                                        />
                                    }else if(col.reference === 'difference'){
                                        return <div className='colrows' key={index1}>{Number(adjustmentEntries.filter(entry => product.i_d === entry.i_d)[0]?.difference)?.toLocaleString()}</div>
                                    }else{
                                        return <div className='colrows' key={index1}>{(Number(adjustmentEntries.filter(entry => product.i_d === entry.i_d)[0]?.difference) * Number(product.costPrice)).toLocaleString()}</div>
                                    }
                                }else{
                                    return <div className='colrows' key={index1}>{(col.reference === 'costPrice' ? Number(product[col.reference]).toLocaleString() : product[col.reference])}</div>
                                }
                            })}
                        </div>
                    })}
                </div>
            </div>
        </>
    )
}

export default Adjustments