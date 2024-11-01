import './Sales.css'
import { useState, useEffect, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { MdAdd } from "react-icons/md";
import { RxReset } from "react-icons/rx";
import { MdDelete } from "react-icons/md";

const Sales = ()=>{
    const payPoints = {
        'moniepoint1':'', 'moniepoint2':'', 
        'moniepoint3':'', 'moniepoint4':'', 
        'access':'', 'cash':''
    }
    const salesUnits = {
        'open bar1':{...payPoints}, 'open bar2':{...payPoints}, 
        'kitchen':{...payPoints}, 'vip':{...payPoints}, 
        'accomodation':{...payPoints}
    }
    const [addEmployeeId, setAddEmployeeId] = useState('')
    const [addTotalSales, setAddTotalSales] = useState('')
    const [addDebt, setAddDebt] = useState('')
    const [postStatus, setPostStatus] = useState('Post Sales')
    const [postingDate, setPostingDate] = useState('')
    const [curSale, setCurSale] = useState(null)
    const defaultFields = {
        employeeId: '',
        totalSales: '',
        debt:'',
        ...salesUnits
    }
    const [fields, setFields] = useState([])
    const [isView, setIsView] = useState(false)

    const {storePath, 
        fetchServer, 
        server, 
        company, 
        employees,
        sales, setSales, getSales,
        getDate
    } = useContext(ContextProvider)

    useEffect(()=>{
        storePath('sales')  
    },[storePath])

    useEffect(()=>{
        if (curSale){
            setPostingDate(curSale.postingDate)
        }else{
            setPostingDate(new Date(Date.now()).toISOString().slice(0, 10))
        }
    },[curSale])

    const handleFieldChange = ({index, e})=>{
        const name = e.target.getAttribute('name')
        const category = e.target.getAttribute('category')
        const value = e.target.value
        setFields((fields)=>{
            if (category){
                var ct = 0
                Object.keys(salesUnits).forEach((salesUnit)=>{
                    var ct1 = 0                    
                    Object.keys(fields[index][salesUnit]).forEach((payPoint)=>{                    
                        if(category!==payPoint){                
                            ct1 += Number(fields[index][salesUnit][payPoint])
                        }else{
                            if (name !== salesUnit) {
                                ct1 += Number(fields[index][salesUnit][payPoint])
                            }
                        }
                    })
                    ct += Number(ct1)
                })
                fields[index] = {
                    ...fields[index], 
                    totalSales: (ct+Number(value))?ct+Number(value):'',
                    [name]:{
                        ...fields[index][name], 
                        [category]:value
                    }
                }
            }else{
                fields[index] = {...fields[index], [name]:value}
            }
            return [...fields]
        })
    }

    const addSales = async ()=> { 
        if (postingDate){
            setPostStatus('Posting Sales...')
            var totalSales = 0
            var totalDebt = 0        
            fields.forEach((field)=>{
                totalSales += Number(field.totalSales)
                totalDebt += Number(field.debt)
            })
            const newSale = {
                postingDate: postingDate,
                createdAt: new Date().getTime(),
                totalSales,
                totalDebt,
                record: [...fields]
            }
    
            const newSales = [newSale, ...sales]        
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Sales", 
                update: newSale
            }, "createDoc", server)
            
            if (resps.err){
                console.log(resps.mess)
                setPostStatus('Post Sales')
            }else{
                setSales(newSales)
                setCurSale(newSale)
                setIsView(true)
                setFields([...(newSale.record)])
                getSales(company)
                setPostStatus('Post Sales')
            }
        }
    }

    const handleViewClick = (e,index,sale) =>{
        setCurSale(sale)
        setFields([...(sale.record)])
        setIsView(true)
    }
    return (
        <>
            <div className='sales'>
                <div className='emplist attlist'>                                       
                    {sales.map((sale, index)=>{
                        const {createdAt, postingDate,
                            totalSales, totalDebt, record, 
                        } = sale 
                        return(
                            <div className={'dept' + (curSale?.createdAt===createdAt?' curview':'')} key={index} 
                                onClick={(e)=>{
                                    handleViewClick(e,index,sale)
                                }}
                            >
                                <div className='dets'>
                                    <div><b>Posting Date: </b>{getDate(postingDate)}</div>
                                    <div><b>Total Sales: </b>{totalSales}</div>
                                    <div><b>Total Debt: </b>{totalDebt}</div>
                                    <div className='deptdesc'>{`Waitresses No:`} <b>{`${record.length}`}</b></div>
                                </div>
                                {/* <div 
                                className='edit'
                                name='edit'
                                >Edit</div> */}
                            </div>
                        )
                  })}
                </div>
                <div className='empview attview'>
                    {(fields.length && !isView )? 
                        <RxReset
                            className='slsadd'
                            onClick={()=>{
                                setIsView(false)
                                setFields([])
                                setAddEmployeeId('')
                                setCurSale(null)
                            }}
                        /> : 
                        <MdAdd 
                            className='add slsadd'
                            onClick={()=>{
                                setIsView(false)
                                setFields([])
                                setAddEmployeeId('')
                                setCurSale(null)
                            }}
                        />
                    }
                    <div className='formtitle padtitle'>
                        <div className={'frmttle'}>
                            {`DAILY SALES`}
                        </div> 
                        {/* <div className='yesbtn popbtn delbtn'
                                onClick={()=>{}}
                        >Delete</div> */}
                    </div>
                    
                    <div className='salesfm'>
                        {!isView && <div className='addnewsales'>
                            <div className='inpcov'>
                                <div>Employee ID</div>
                                <select 
                                    className='forminp'
                                    name='employeeId'
                                    type='text'
                                    value={addEmployeeId}
                                    onChange={(e)=>{
                                        setAddEmployeeId(e.target.value)
                                    }}
                                >
                                    <option value=''>Select Sales Person</option>
                                    {employees.filter((fltemp)=>{
                                        var ct = 0
                                        fields.forEach((field)=>{
                                            if (fltemp.i_d === field.employeeId){
                                                ct++
                                            }
                                        })
                                        if (!ct){
                                            return fltemp
                                        }
                                    }).map((employee)=>{
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
                            <div className='addempsales'
                                style={{
                                    cursor:addEmployeeId?'pointer':'not-allowed'
                                }}
                                onClick={()=>{
                                    if (addEmployeeId){
                                        setFields((fields)=>{
                                            return [{...defaultFields, employeeId:addEmployeeId},...fields]
                                        })
                                        setAddEmployeeId('')
                                    }
                                }}
                            >
                                Add Employee Sales
                            </div>                                                
                        </div>}
                        {fields.map((field, index)=>{
                            return (
                                <div key={index} className='empsalesblk'>
                                    {!isView && <MdDelete 
                                        className='salesdelete'
                                        onClick={()=>{
                                            setFields((fields)=>{
                                                const updfields = fields.filter((ftrfield)=>{
                                                    return ftrfield!== field
                                                })
                                                return [...updfields]
                                            })
                                        }}
                                    />}
                                    <div className='empsalesttl'>
                                        {employees.filter((employee)=>{
                                            return employee.i_d === field.employeeId
                                        }).map((emp, idt)=>{
                                            return (
                                                <div key={idt}>
                                                    {`(${emp.i_d}) ${emp.firstName.toUpperCase()} ${emp.lastName.toUpperCase()} - ${emp.position}`}
                                                </div>
                                            )
                                        })}
                                    </div>
                                    {<div className='basic'>
                                        <div className='inpcov'>
                                            <div>Total Sales</div>
                                            <input 
                                                className='forminp'
                                                style={{cursor: 'not-allowed'}}
                                                name='totalSales'
                                                type='number'
                                                placeholder='Total Sales'
                                                value={field.totalSales}
                                                disabled={true}
                                                onChange={(e)=>{
                                                    handleFieldChange({index, e})
                                                }}
                                            />
                                        </div>
                                        <div className='inpcov'>
                                            <div>Debt</div>
                                            <input 
                                                className='forminp'
                                                name='debt'
                                                type='number'
                                                placeholder='Debt'
                                                value={field.debt}
                                                disabled={isView}
                                                onChange={(e)=>{
                                                    handleFieldChange({index, e})
                                                }}
                                            />
                                        </div>
                                        {Object.keys(salesUnits).map((salesUnit, id)=>{                                            
                                            return(
                                                <SalesEntry
                                                    key={id}                                                   
                                                    handleFieldChange={handleFieldChange}
                                                    salesUnits={salesUnits}
                                                    salesUnit={salesUnit}
                                                    field={field}    
                                                    isView={isView}                                                
                                                    index={index}
                                                />
                                            )
                                        })}
                                        
                                    </div>}                                    
                                </div>
                            )
                        })}
                        
                    </div>
                    {!isView && <div className='confirm'>     
                        <div className='inpcov salesinpcov'>
                            <input 
                                className='forminp'
                                name='postingDate'
                                type='date'
                                placeholder='Posting Date'
                                value={postingDate}
                                disabled={isView}
                                onChange={(e)=>{
                                    setPostingDate(e.target.value)
                                }}
                            />
                        </div>                   
                        <div className='yesbtn salesyesbtn'
                            style={{
                                cursor:fields.length?'pointer':'not-allowed'
                            }}
                            onClick={()=>{
                                if (fields.length){
                                    addSales()                                
                                }
                            }}
                        >{postStatus}</div>
                    </div>}
                </div>
            </div>
        </>
    )
}

const SalesEntry = ({salesUnits, salesUnit, field, index, handleFieldChange, isView})=> {
    const [open, setOpen] = useState(false)
    const [salesAmount, setSalesAmount] = useState(0)
    useEffect(()=>{
        var sum = 0
        Object.keys(field[salesUnit]).forEach((payPoint)=>{
            sum += Number(field[salesUnit][payPoint])
        })
        setSalesAmount(sum)
    },[field[salesUnit]])
    return (
        <div className='salesunit'>
            <div className='salesunittag'>
                <div>
                    {salesUnit.toUpperCase()}
                </div>
                <div><b>Sales: </b>{`${salesAmount}`}</div>
                {open ?
                    <FaChevronUp 
                        className='viewsales'
                        onClick={()=>{
                            setOpen(!open)
                        }}
                    />
                :  <FaChevronDown 
                        className='viewsales'
                        onClick={()=>{
                            setOpen(!open)
                        }}
                    />}
            </div>
            {open && Object.keys(salesUnits[salesUnit]).map((payPoint, id)=>{
                return (
                    <div className='inpcov' key={id}>
                        <div>{payPoint.toUpperCase()}</div>
                        <input 
                            className='forminp'
                            name={salesUnit}
                            category={payPoint}
                            type='number'
                            placeholder={payPoint}
                            value={field[salesUnit][payPoint]}
                            disabled={isView}
                            onChange={(e)=>{
                                handleFieldChange({index,e})
                            }}
                        />
                    </div>
                )
            })}
        </div>
    )
}

export default Sales