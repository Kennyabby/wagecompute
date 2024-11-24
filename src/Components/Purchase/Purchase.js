import './Purchase.css'
import { useEffect, useContext, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useScroll } from 'framer-motion'
import { MdAdd } from 'react-icons/md'

const Purchase = ()=>{

    const { storePath,
        server, 
        fetchServer,
        companyRecord,
        company, getDate,
        employees, months, getPurchase, setPurchase, purchase,
        alert,alertState,alertTimeout,actionMessage, 
        setAlert, setAlertState, setAlertTimeout, setActionMessage
    } = useContext(ContextProvider)
    const [purchaseStatus, setPurchaseStatus] = useState('Post Purchase')
    const [purchaseDate, setPurchaseDate] = useState(new Date(Date.now()).toISOString().slice(0,10))
    const [curPurchase, setCurPurchase] = useState(null)
    const [isView, setIsView] = useState(false)
    const defaultFields = {
        purchaseDepartment:'',
        purchaseHandler:'',
        itemCategory:'',
        purchaseQuantity:'',
        purchaseUOM:'',
        purchaseAmount:'',
    }
    const [fields, setFields] = useState({...defaultFields})
    useEffect(()=>{
        storePath('purchase')  
    },[storePath])

    const purchaseCategory = ['ASSORTED DRINKS', 'ASSORTED PROTEIN', 'INGREDIENTS', 'SWALLOW', 'CEREALS']
    const unitsofmeasurements = [
        'PORTIONS', 'PACKETS', 'CRATES',
    ]

    const handlePurchaseEntry = (e)=>{
        const name = e.target.getAttribute('name')
        const value = e.target.value

        if (name){
            setFields((fields)=>{
                return {...fields, [name]:value}
            })
        }
    }
    const handleViewClick = (pur) =>{
        setCurPurchase(pur)
        setFields({...pur})
        setIsView(true)
    }
    const addPurchase = async ()=>{
        if (fields.purchaseAmount){
            setPurchaseStatus('Posting Purchase...')
            const newPurchase = {
                ...fields,
                postingDate:purchaseDate,
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
              }else{
                setPurchaseStatus('Post Purchase')
                setPurchase(newPurchases)
                setCurPurchase(newPurchase)
                setIsView(true)
                setFields({...newPurchase})
                getPurchase(company)
              }
          
        }
    }
    const deletePurchase = async (purchase)=>{
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Purchase", 
            update: {createdAt: purchase.createdAt}
        }, "removeDoc", server)
        if (resps.err){
            console.log(resps.mess)
            // setAlertState('info')
            // setAlert(resps.mess)
            // setAlertTimeout(5000)
        }else{
            setIsView(false)
            setCurPurchase(null)
            // setCurSaleDate(null)
            setFields({...defaultFields})
            // setAlertState('success')
            // setAlert('Sales Deleted Successfully!')
            // setDeleteCount(0)
            // setAlertTimeout(5000)
            getPurchase(company)
        }        
    }
    return (
        <>
            <div className='purchase'>
                <div className='purlst'>
                    {!isView && <MdAdd 
                        className='add slsadd'
                        onClick={()=>{
                            setIsView(false)
                            setFields({...defaultFields})
                            setCurPurchase(null)
                        }}
                    />}
                    {purchase.map((pur, index)=>{
                        const {
                            createdAt,postingDate, 
                            purchaseAmount, purchaseQuantity,
                            purchaseUOM, purchaseDepartment,
                            itemCategory,purchaseHandler 
                        } = pur
                        return(
                            <div className={'dept' + (curPurchase?.createdAt===createdAt?' curview':'')} key={index} 
                                onClick={(e)=>{
                                    handleViewClick(pur)
                                }}
                            >
                                <div className='dets sldets'>
                                    <div>Posting Date: <b>{getDate(postingDate)}</b></div>
                                    <div>Purchase Department: <b>{'₦'+(Number(purchaseDepartment)).toLocaleString()}</b></div>                                    
                                    <div>Purchase Amount: <b>{'₦'+(Number(purchaseAmount)).toLocaleString()}</b></div>                                    
                                    <div>Purchase Details: <b>{`${Number(purchaseQuantity).toLocaleString()} ${purchaseUOM} of ${itemCategory}`}</b></div>                                    
                                    <div className='deptdesc'>{`Purchase Handled By:`} <b>{`${purchaseHandler}`}</b></div>
                                </div>
                                {(companyRecord.status==='admin') && <div 
                                    className='edit'
                                    name='delete'         
                                    style={{color:'red'}}                           
                                    onClick={()=>{                                        
                                        // setAlertState('info')
                                        // setAlert('You are about to delete the selected Sales. Please Delete again if you are sure!')
                                        // setAlertTimeout(5000)                                                                                    
                                        deletePurchase(purchase)
                                    }}
                                >
                                    Delete
                                </div>}
                            </div>
                        )
                    })}
                </div>
                <div className='purinfo'>
                    <div className='purinfotitle'>PURCHASE ENTRY</div>
                    <div className='purinfocontent' onChange={handlePurchaseEntry}>
                        <div className='inpcov'>
                            <div>Select Department</div>
                            <select 
                                className='forminp'
                                name='purchaseDepartment'
                                type='text'
                                value={fields.purchaseDepartment}                                
                            >
                                <option value=''>Select Department</option>
                                <option value='bar'>Bar</option>
                                <option value='kitchen'>Kitchen</option>
                            </select>
                        </div>
                        <div className='inpcov'>
                            <div>Select Purchase Handler</div>
                            <select 
                                className='forminp'
                                name='purchaseHandler'
                                type='text'
                                value={fields.purchaseHandler}                                
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
                                value={fields.itemCategory}
                            >
                                <option value=''>Item Category</option>
                                {purchaseCategory.map((category, index)=>{
                                    return (
                                        <option key={index} value={category}>{category}</option>
                                    )
                                })}
                            </select>
                        </div>
                        <div className='inpcov'>
                            <div>Purchase Quantity</div>
                            <input 
                                className='forminp'
                                name='purchaseQuantity'
                                type='number'
                                placeholder='Purchase Quantity'
                                value={fields.purchaseQuantity}
                            />
                        </div>
                        <div className='inpcov'>
                            <div>Unit of Measurement</div>
                            <select 
                                className='forminp'
                                name='purchaseUOM'
                                type='text'
                                value={fields.purchaseUOM}
                            >
                                <option value=''>Unit of Measurement</option>
                                {unitsofmeasurements.map((uom, index)=>{
                                    return (
                                        <option key={index} value={uom}>{uom}</option>
                                    )
                                })}
                            </select>
                        </div>
                        <div className='inpcov'>
                            <div>Purchase Amount</div>
                            <input 
                                className='forminp'
                                name='purchaseAmount'
                                type='number'
                                placeholder='Purchase Amount'
                                value={fields.purchaseAmount}
                            />
                        </div>
                    </div>
                    <div className='purchasebuttom'>
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
                            onClick={addPurchase}
                        >{purchaseStatus}</div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Purchase