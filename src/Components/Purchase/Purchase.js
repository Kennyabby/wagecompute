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
        companyRecord,
        company, getDate,
        employees, getEmployees,months, getPurchase, setPurchase, purchase,
        alert,alertState,alertTimeout,actionMessage, 
        setAlert, setAlertState, setAlertTimeout, setActionMessage
    } = useContext(ContextProvider)
    const [purchaseStatus, setPurchaseStatus] = useState('Post Purchase')
    const [purchaseDate, setPurchaseDate] = useState(new Date(Date.now()).toISOString().slice(0,10))
    const [curPurchase, setCurPurchase] = useState(null)
    const [deleteCount, setDeleteCount] = useState(0)
    const [isView, setIsView] = useState(false)
    const [showReport, setShowReport] = useState(false)
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
    const purchaseCategory = ['ASSORTED DRINKS', 'ASSORTED PROTEIN', 'INGREDIENTS', 'SWALLOW', 'CEREALS']
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
          }
        },10000)
        return () => clearInterval(intervalId);
    },[window.localStorage.getItem('sessn-cmp')])
    useEffect(()=>{
        if (companyRecord.status!=='admin'){
            setSaleFrom(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
        }
    },[companyRecord])
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
        if (fields.purchaseAmount && fields.purchaseVendor && fields.purchaseQuantity &&
            fields.purchaseUOM && fields.purchaseHandler && fields.purchaseDepartment &&
            fields.itemCategory
        ){
            setAlertState('info')
            setAlert('Posting Purchase...')
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
                setAlertTimeout(5000)
                getPurchase(company)
              }
        }else{ 
            setAlertState('error')
            setAlert('All Fields Are Required! Kindly Fill All')
            setAlertTimeout(5000)
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
                {showReport && <PurchaseReport
                    reportPurchases = {reportPurchase}
                    multiple={true}
                    setShowReport={(value)=>{
                        setShowReport(value)                        
                    }}              
                    fromDate = {saleFrom}
                    toDate = {saleTo}      
                    // selectedMonth={selectedMonth}
                    // selectedYear={selectedYear}
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
                                disabled={companyRecord.status!=='admin'}
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
                                disabled={companyRecord.status!=='admin'}
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
                                    <div>Purchase Details: <b>{`${Number(purchaseQuantity).toLocaleString()} ${purchaseUOM} of ${itemCategory}`}</b></div>                                    
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
                                value={fields.itemCategory}
                                disabled={isView}
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
                                disabled={isView}
                            />
                        </div>
                        <div className='inpcov'>
                            <div>Unit of Measurement</div>
                            <select 
                                className='forminp'
                                name='purchaseUOM'
                                type='text'
                                value={fields.purchaseUOM}
                                disabled={isView}
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
                                disabled={isView}
                            />
                        </div>
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
                            onClick={addPurchase}
                        >{purchaseStatus}</div>
                    </div>}
                </div>
            </div>
        </>
    )
}

export default Purchase