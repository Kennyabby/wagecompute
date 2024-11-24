import './Purchase.css'
import { useEffect, useContext, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useScroll } from 'framer-motion'

const Purchase = ()=>{

    const { storePath,
        server, 
        fetchServer,
        companyRecord,
        company, 
        employees, months, getPurchase, purchase,
        alert,alertState,alertTimeout,actionMessage,
        setAlert, setAlertState, setAlertTimeout, setActionMessage
    } = useContext(ContextProvider)
    const [purchaseStatus, setPurchaseStatus] = useState('Post Purchase')
    const [purchaseDate, setPurchaseDate] = useState(new Date(Date.now()).toISOString().slice(0,10))
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
    return (
        <>
            <div className='purchase'>
                <div className='purlst'>

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
                        <div className='purchasebutton'>{purchaseStatus}</div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Purchase