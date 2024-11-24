import './Purchase.css'
import { useEffect, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'

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
    useEffect(()=>{
        storePath('purchase')  
    },[storePath])
    return (
        <>
            <div className='purchase'>
                <div className='purlst'>

                </div>
                <div className='purinfo'>
                    <div>PURCHASE ENTRY</div>
                    <div>
                        <div className='inpcov'>
                            <div>Select Department</div>
                            <select 
                                className='forminp'
                                name='employeeId'
                                type='text'
                                value={''}
                                onChange={(e)=>{
                                    // setRecoveryEmployeeId(e.target.value)
                                }}
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
                                name='employeeId'
                                type='text'
                                value={''}
                                onChange={(e)=>{
                                    // setRecoveryEmployeeId(e.target.value)
                                }}
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
                                name='employeeId'
                                type='text'
                                value={''}
                                onChange={(e)=>{
                                    // setRecoveryEmployeeId(e.target.value)
                                }}
                            >
                                <option value=''>Item Category</option>
                                <option value='bar'>Assorted Drinks</option>
                                <option value='kitchen'>Food</option>
                            </select>
                        </div>
                        <div className='inpcov'>
                            <div>Purchase Quantity</div>
                            <input 
                                className='forminp'
                                name='purchaseQuantity'
                                type='number'
                                placeholder='Purchase Quantity'
                                value={''}
                                disabled={''}
                                onChange={(e)=>{
                                    // handleFieldChange({index, e})
                                }}
                            />
                        </div>
                        <div className='inpcov'>
                            <div>Purchase Unit of Mearsurement</div>
                            <input 
                                className='forminp'
                                name='purchaseQuantity'
                                type='number'
                                placeholder='Purchase Quantity'
                                value={''}
                                disabled={''}
                                onChange={(e)=>{
                                    // handleFieldChange({index, e})
                                }}
                            />
                        </div>
                        <div className='inpcov'>
                            <div>Purchase Amount</div>
                            <input 
                                className='forminp'
                                name='debt'
                                type='number'
                                placeholder='Debt'
                                value={''}
                                disabled={''}
                                onChange={(e)=>{
                                    // handleFieldChange({index, e})
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Purchase