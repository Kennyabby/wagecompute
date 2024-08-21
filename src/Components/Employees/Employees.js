import './Employees.css'

import {useEffect, useState} from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'

const Employees = () =>{
    const {storePath, 
        fetchServer, 
        server, 
        company, 
        departments,
        positions,
        employees, setEmployees, getEmployees
    } = useContext(ContextProvider)
    const [selform, setSelform] = useState("Basic")
    const [writeStatus, setWriteStatus] = useState('New')
    const [isView, setIsView] = useState(false)
    const [edit, setEdit] = useState(false)
    const [curEmployee, setCurEmployee] = useState(null)
    const [editId, setEditId] = useState(null)
    const [editIndex, setEditIndex] = useState(null)
    const initFields = {
        i_d:'',
        firstName:'',
        lastName:'',
        otherName:'',
        department:'',
        position:'',
        gender:'',
        dateOfBirth:'',
        phoneNo:'',
        address:'',
        hiredDate:'',
        bankName:'',
        bankBranch:'',
        accountNo:'',
        payPerHour:'',
        salary:'',
    }
    const [fields, setFields] = useState({...initFields})
    useEffect(()=>{
        storePath('employees')  
    },[storePath])
    useEffect(()=>{
        if (employees.length){
            setFields((fields)=>{
                if (!fields.i_d){
                    return {...fields, i_d:employees.length+1}
                }else{
                    return fields
                }
            })
        }
    },[employees])
    const toggleSelForm = (e)=>{
        const name = e.target.getAttribute('name')
        if (name){
            setSelform(name)
        }
    }

    const addEmployee = async ()=>{
        if (fields.i_d){
            const newEmployee = {
                ...fields,
                createdAt: Date.now()
            }
            const newEmployees = [...employees, newEmployee]
            
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Employees", 
                update: newEmployee
              }, "createDoc", server)
              
              if (resps.err){
                console.log(resps.mess)
              }else{
                setEmployees(newEmployees)
                setCurEmployee(newEmployee)
                setIsView(true)
                setFields({...newEmployee})
                getEmployees(company)
              }
          
        }
    }
    const editEmployee = async ()=>{
        const i_d = curEmployee.i_d
        const index = Number(editIndex)
        if (fields.i_d){
            const updatedEmployee = {
                ...fields,
                createdAt: employees[index].createdAt
            }
            const filteredEmp = employees.filter((emp)=>{
                return emp.i_d!==i_d
            })
            const updatedEmployees = [...filteredEmp, updatedEmployee]
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Employees", 
                prop: [{i_d: i_d}, updatedEmployee]
              }, "updateOneDoc", server)
              
              if (resps.err){
                console.log(resps.mess)
              }else{
                  setEmployees(updatedEmployees)
                  setCurEmployee(updatedEmployee)
                  setIsView(true)
                  setFields({...updatedEmployee})
                  getEmployees(company)
              }
    
        }
    }

    const deleteEmployee = async()=>{
        const i_d = curEmployee.i_d
        const filteredEmp = departments.filter((emp)=>{
            return emp.i_d!==i_d
        })
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Employees", 
            update: {i_d: i_d}
        }, "removeDoc", server)
        if (resps.err){
            console.log(resps.mess)
        }else{
            setEmployees(filteredEmp)
            setCurEmployee(null)
            setFields({...initFields, i_d:filteredEmp.length+1})
            setIsView(false)
            setWriteStatus('New')
            getEmployees(company)
        }
    }

    const handleFieldChange = (e)=>{
        const name = e.target.getAttribute('name')
        const value = e.target.value

        setFields((fields)=>{
            return {
                ...fields, [name]:value
            }
        })
    }
    const handleViewClick = (e, index, employee)=>{
        const name = e.target.getAttribute('name')
        if (name==='edit'){
            setIsView(false)
            setEditIndex(index)
            setWriteStatus('Edit')
        }else{
            setIsView(true)
        }
        setCurEmployee(employee)
        var newEmpValue = {...employee}
        delete newEmpValue._id
        setFields({...newEmpValue})
    }
    return(
        <>
            <div className='employees'>
                <div className='emplist'>
                    <div className='add' 
                        onClick={()=>{
                            setFields({...initFields, i_d:employees.length+1})
                            setIsView(false)
                            setWriteStatus('New')
                            setCurEmployee(null)
                        }}
                    >{'+'}</div>
                {employees.map((employee, index)=>{
                    const {i_d, 
                        firstName, lastName,
                        department, position,
                    } = employee
                    return(
                        <div className={'dept' + (curEmployee?.i_d===i_d?' curview':'')} key={index} i_d={i_d} 
                            onClick={(e)=>{
                                handleViewClick(e,index,employee)
                            }}
                        >
                            <div className='dets'>
                                <div><b>Employee ID: </b>{i_d}</div>
                                <div> <b>Name:</b>{` ${firstName} ${lastName}`}</div>
                                <div className='deptdesc'>{`${department} Department`}</div>
                                <div className='deptdesc'><b>Position:</b>{` ${position}`}</div>
                            </div>
                            <div 
                            className='edit'
                            name='edit'
                            >Edit</div>
                        </div>
                    )
                  })}
                </div>
                <div className='empview'>
                    <div className='formtitle padtitle'>
                        <div className={writeStatus==='New'?'frmttle':''}>
                            {`${writeStatus.toUpperCase()} EMPLOYEE FORM`}
                        </div>
                        {writeStatus==='Edit'&& !isView && <div className='yesbtn popbtn delbtn'
                                onClick={deleteEmployee}
                        >Delete</div>}
                    </div>
                    <div className='selform' onClick={toggleSelForm}>
                        <div name='Basic' className={selform==='Basic'?'seltype':''}>Basic</div>
                        <div name='Hr' className={selform==='Hr'?'seltype':''}>HR</div>
                    </div>
                    <div className='form' onChange={handleFieldChange}>
                        {selform==='Basic'&&<div className='basic'>
                            <div className='inpcov'>
                                <div>Employee ID</div>
                                <input 
                                    className='forminp'
                                    name='i_d'
                                    type='text'
                                    placeholder='Employee ID'
                                    value={fields.i_d}
                                    disabled={writeStatus!=='New' || isView}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>First Name</div>
                                <input 
                                    className='forminp'
                                    name='firstName'
                                    type='text'
                                    placeholder='First Name'
                                    value={fields.firstName}
                                    disabled={isView}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Last Name</div>
                                <input 
                                    className='forminp'
                                    name='lastName'
                                    type='text'
                                    placeholder='Last Name'
                                    value={fields.lastName}
                                    disabled={isView}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Other Name</div>
                                <input 
                                    className='forminp'
                                    name='otherName'
                                    type='text'
                                    placeholder='Other Name' 
                                    value={fields.otherName}
                                    disabled={isView}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Address</div>
                                <input 
                                    className='forminp'
                                    name='address'
                                    type='text'
                                    placeholder='Address' 
                                    value={fields.address}
                                    disabled={isView}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Phone Number</div>
                                <input 
                                    className='forminp'
                                    name='phoneNo'
                                    type='text'
                                    placeholder='Phone Number' 
                                    value={fields.phoneNo}
                                    disabled={isView}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Date of Birth</div>
                                <input 
                                    className='forminp'
                                    name='dateOfBirth'
                                    type='date'
                                    placeholder='Date of Birth' 
                                    value={fields.dateOfBirth}
                                    disabled={isView}
                                />
                            </div>
                            <div className='inpcov'>
                                <div>Gender</div>
                                <select 
                                    className='forminp'
                                    name='gender'
                                    type='text'
                                    value={fields.gender}
                                    disabled={isView}
                                >
                                    <option value=''>Select Gender</option>
                                    <option value='Male'>Male</option>
                                    <option value='Female'>Female</option>
                                </select>
                            </div>
                            <div className='inpcov'>
                                <div>Department</div>
                                <select 
                                    className='forminp'
                                    name='department'
                                    type='text'
                                    value={fields.department}
                                    disabled={isView}
                                >
                                    <option value=''>Select Department</option>
                                    {departments.map((department,id)=>{
                                        const {name} = department
                                        return <option key={id} value={name}>{name}</option>

                                    })}
                                </select>
                            </div>
                            <div className='inpcov'>
                                <div>Position</div>
                                <select 
                                    className='forminp'
                                    name='position'
                                    type='text'
                                    value={fields.position}
                                    disabled={isView}
                                >
                                    <option value=''>Select Position</option>
                                    {positions.map((position,id)=>{
                                        const {name} = position
                                        return <option key={id} value={name}>{name}</option>

                                    })}
                                </select>
                            </div>
                        </div>}
                        {selform==='Hr'&&
                            <div className='hr'>
                                <div className='inpcov'>
                                    <div>Hired Date</div>
                                    <input 
                                        className='forminp'
                                        name='hiredDate'
                                        type='date'
                                        placeholder='Select Date' 
                                        value={fields.hiredDate}
                                        disabled={isView}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>Bank Name</div>
                                    <input 
                                        className='forminp'
                                        name='bankName'
                                        type='text'
                                        placeholder='Bank Name'
                                        value={fields.bankName}
                                        disabled={isView}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>Bank Branch</div>
                                    <input 
                                        className='forminp'
                                        name='bankBranch'
                                        type='text'
                                        placeholder='Bank Branch'
                                        value={fields.bankBranch}
                                        disabled={isView}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>Account No</div>
                                    <input 
                                        className='forminp'
                                        name='accountNo'
                                        type='number'
                                        placeholder='Account No'
                                        value={fields.accountNo}
                                        disabled={isView}
                                    />
                                </div>
                                
                                <div className='inpcov'>
                                    <div>Salary (Naira)</div>
                                    <input 
                                        className='forminp'
                                        name='salary'
                                        type='number'
                                        placeholder='Salary' 
                                        value={fields.salary}
                                        disabled={isView}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>Pay Per Hour</div>
                                    <input 
                                        className='forminp'
                                        name='payPerHour'
                                        type='number'
                                        placeholder='Rate Per Hour' 
                                        value={fields.payPerHour}
                                        disabled={isView}
                                    />
                                </div>
                            </div>
                        }
                    </div>
                   {!isView && <div className='confirm'>
                        {writeStatus==='Edit'&&<div className='yesbtn nobtn edbtn'
                            onClick={()=>{
                                setIsView(true)
                                setFields({...curEmployee})
                            }}
                        >Discard</div>}
                        <div className='yesbtn'
                            onClick={()=>{
                                if (writeStatus==='New'){
                                    addEmployee()
                                }else{
                                    editEmployee()
                                }
                            }}
                        >Save</div>
                    </div>}
                </div>
            </div>
        </>
    )
}

export default Employees