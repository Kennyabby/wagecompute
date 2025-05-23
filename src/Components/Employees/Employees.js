import './Employees.css'

import {useEffect, useState} from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'

const Employees = () =>{
    const {storePath, 
        fetchServer, 
        server, 
        company, companyRecord,
        departments,
        positions, editAccess,
        employees, setEmployees, getEmployees,
        sales,purchase,expenses,accommodations,
        alert,alertState,alertTimeout,actionMessage, 
        setAlert, setAlertState, setAlertTimeout, setActionMessage 
    } = useContext(ContextProvider)
    const [selform, setSelform] = useState("Basic")
    const [writeStatus, setWriteStatus] = useState('New')
    const [isView, setIsView] = useState(false)
    const [employeeType, setEmployeeType] = useState('current')
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
        dismissalDate:'',
        dismissalReason:'',
        bankName:'',
        bankBranch:'',
        accountNo:'',
        expectedWorkDays: '',
        salary:'',        
        guarantorName:'',
        guarantorAddress:'',
        guarantorLGA:'',
        guarantorSOA:'',
        guarantorPhoneNo:'',
        guarantorGender:'',
        guarantorMaritalStatus:'',
        guarantorReligion:'',
        guarantorRelationship:'',
        guarantorKnowsEmploeyeeFor:'',
        guarantorStance:'',
        guarantorFormCreatedAt:''
    }
    const [fields, setFields] = useState({...initFields})
    useEffect(()=>{
        storePath('employees')  
    },[storePath])
    useEffect(()=>{
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        getEmployees(cmp_val)
        const intervalId = setInterval(()=>{
          if (cmp_val){
            getEmployees(cmp_val)
          }
        },60000)
        return () => clearInterval(intervalId);
    },[window.localStorage.getItem('sessn-cmp')])
    useEffect(()=>{
        if (!editAccess.employees && companyRecord.status!=='admin'){
            setIsView(true)
        }
    },[editAccess])
    const toggleSelForm = (e)=>{
        const name = e.target.getAttribute('name')
        if (name){
            setSelform(name)
        }
    }
    const addEmployee = async ()=>{
        setAlertState('info')
        setAlert(
            `Adding Employee...`
        )
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
                setAlertState('error')
                setAlert(
                    resps.mess
                )
                setAlertTimeout(5000)
              }else{
                setEmployees(newEmployees)
                setCurEmployee(newEmployee)
                setIsView(true)
                setFields({...newEmployee})
                setAlertState('success')
                setAlert(
                    'Employee Added Successfully!'
                )
                setAlertTimeout(5000)
                getEmployees(company)
              }
          
        }
    }
    const editEmployee = async ()=>{
        setAlertState('info')
        setAlert(
            `Updating Employee...`
        )
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
                setAlertState('error')
                setAlert(
                    resps.mess
                )
                setAlertTimeout(5000)
              }else{
                  setEmployees(updatedEmployees)
                  setCurEmployee(updatedEmployee)
                  setIsView(true)
                  setFields({...updatedEmployee})
                  setAlertState('success')
                  setAlert(
                    'Employee Details Updated Successfully!'
                  )
                  setAlertTimeout(5000)
                  getEmployees(company)
              }
    
        }
    }

    const deleteEmployee = async()=>{
        var act=0
        accommodations.filter((accommodation)=>{
            if (accommodation.employeeId === curEmployee.i_d){
                act++
            }
            if (act){
                return 
            }
        })
        if (!act){        
            sales.map((sale)=>{
                sale.record.filter((record)=>{
                    if (record.employeeId === curEmployee.i_d){
                        act++
                    }
                    if (act){
                        return 
                    }
                })
            })
        }
        if(!act){
            purchase.filter((purchase)=>{
                if (purchase.purchaseHandler === curEmployee.i_d){
                    act++
                }
                if (act){
                    return 
                }
            })
        }
        if(!act){
            expenses.filter((expense)=>{
                if (expense.expenseHandler === curEmployee.i_d){
                    act++
                }
                if (act){
                    return 
                }
            })
        }

        if (act){
            setActionMessage('')
            setAlertState('error')
            setAlert(
                `The Employee Record is in use in another Model. Delete the Corresponding Record Before Proceeding`
            )
            setAlertTimeout(12000)
        }else{
            setAlertState('info')
            setAlert(
                `Deleting Employee...`
            )
            const i_d = curEmployee.i_d
            const filteredEmp = employees.filter((emp)=>{
                return emp.i_d!==i_d
            })
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Employees", 
                update: {i_d: i_d}
            }, "removeDoc", server)
            if (resps.err){
                console.log(resps.mess)
                setAlertState('error')
                setAlert(
                    resps.mess
                )
                setAlertTimeout(5000)
            }else{
                setEmployees(filteredEmp)
                setCurEmployee(null)
                setFields({...initFields, i_d:filteredEmp.length+1})
                setIsView(false)
                setWriteStatus('New')
                setAlert(
                    'Employee Deleted Successfully!'
                )
                setAlertTimeout(5000)
                getEmployees(company)
            }
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
                            setFields({...initFields})
                            setIsView(false)
                            setWriteStatus('New')
                            setCurEmployee(null)
                        }}
                    >{'+'}</div>
                <div className='emptypecov' 
                    onClick={(e)=>{
                        const name = e.target.getAttribute('name')
                        if (name){
                            setEmployeeType(name)
                        }
                        setFields({...initFields})
                        setIsView(false)
                        setWriteStatus('New')
                        setCurEmployee(null)
                    }}
                >
                    <div name='current' className={employeeType ==='current' ? 'emptype' : ''}>Current</div>
                    <div name='dismissed' className={employeeType ==='dismissed' ? 'emptype' : ''}>Dismissed</div>
                </div>
                {employees.filter((empl)=>{ 
                    var dismissalStatus = ''
                    if (empl.dismissalDate){
                        dismissalStatus = 'dismissed'
                    }else{
                        dismissalStatus = 'current'
                    }

                    if (dismissalStatus === employeeType) {
                        return empl
                    }
                }).map((employee, index)=>{
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
                            {(companyRecord.status==='admin' || editAccess.employees) && <div 
                                className='edit'
                                name='edit'
                            >
                                Edit
                            </div>}
                        </div>
                    )
                  })}
                </div>
                <div className='empview'>
                    <div className='formtitle padtitle'>
                        {isView ? <div className={writeStatus==='New'?'frmttle':''}>
                            {`EMPLOYEE FORM`}
                        </div> :
                        <div className={writeStatus==='New'?'frmttle':''}>
                            {`${writeStatus.toUpperCase()} EMPLOYEE FORM`}
                        </div>}
                        {writeStatus==='Edit'&& !isView && <div className='yesbtn popbtn delbtn'
                                onClick={deleteEmployee}
                        >Delete</div>}
                    </div>
                    <div className='selform' onClick={toggleSelForm}>
                        <div name='Basic' className={selform==='Basic'?'seltype':''}>Basic Info</div>
                        <div name='Hr' className={selform==='Hr'?'seltype':''}>HR Info</div>
                        <div name='Guarantor' className={selform==='Guarantor'?'seltype':''}>Guarantor Info</div>
                    </div>
                    <div className='fm' onChange={handleFieldChange}>
                        {selform==='Basic'&&<div className='basic'>
                            <div className='inpcov'>
                                <div>Employee ID</div>
                                <input 
                                    className='forminp'
                                    name='i_d'
                                    type='text'
                                    placeholder='Employee ID'
                                    value={fields.i_d}
                                    disabled={isView}
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
                                    <div>Dismissal Date</div>
                                    <input 
                                        className='forminp'
                                        name='dismissalDate'
                                        type='date'
                                        placeholder='Select Date' 
                                        value={fields.dismissalDate}
                                        disabled={isView}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>Dismissal Reason</div>
                                    <input 
                                        className='forminp'
                                        name='dismissalReason'
                                        type='text'
                                        placeholder='Dismissal Reason'
                                        value={fields.dismissalReason}
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
                                {fields.employeeDebt && <div className='inpcov'>
                                    <div>Debt (Naira)</div>
                                    <input 
                                        className='forminp'
                                        name='employeeDebt'
                                        type='number'
                                        placeholder='Debts' 
                                        value={fields.employeeDebt}
                                        disabled={true}
                                    />
                                </div>}
                                {fields.employeeDebtRecoverd && <div className='inpcov'>
                                    <div>Recovered (Naira)</div>
                                    <input 
                                        className='forminp'
                                        name='employeeDebtRecoverd'
                                        type='number'
                                        placeholder='Debts' 
                                        value={fields.employeeDebtRecoverd}
                                        disabled={true}
                                    />
                                </div>}
                                <div className='inpcov'>
                                    <div>Expected Work Days</div>
                                    <input 
                                        className='forminp'
                                        name='expectedWorkDays'
                                        type='number'
                                        placeholder='Set to Default' 
                                        value={fields.expectedWorkDays}
                                        disabled={isView}
                                    />
                                </div>
                            </div>
                        }
                        {selform==='Guarantor'&&
                            <div className='hr'>
                                <div className='inpcov'>
                                    <div>Full Name</div>
                                    <input 
                                        className='forminp'
                                        name='guarantorName'
                                        type='text'
                                        placeholder='Guarantor Name' 
                                        value={fields.guarantorName}
                                        disabled={isView}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>Address</div>
                                    <input 
                                        className='forminp'
                                        name='guarantorAddress'
                                        type='text'
                                        placeholder='Guarantor Address'
                                        value={fields.guarantorAddress}
                                        disabled={isView}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>Local Government of Origin</div>
                                    <input 
                                        className='forminp'
                                        name='guarantorLGA'
                                        type='text'
                                        placeholder='Guarantor LGA'
                                        value={fields.guarantorLGA}
                                        disabled={isView}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>State of Origin</div>
                                    <input 
                                        className='forminp'
                                        name='guarantorSOA'
                                        type='text'
                                        placeholder='Guarantor State of Origin'
                                        value={fields.guarantorSOA}
                                        disabled={isView}
                                    />
                                </div>
                                
                                <div className='inpcov'>
                                    <div>Phone No</div>
                                    <input 
                                        className='forminp'
                                        name='guarantorPhoneNo'
                                        type='text'
                                        placeholder='Gurantor Phone No' 
                                        value={fields.guarantorPhoneNo}
                                        disabled={isView}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>Guarantor Gender</div>
                                    <select 
                                        className='forminp'
                                        name='guarantorGender'
                                        type='text'
                                        value={fields.guarantorGender}
                                        disabled={isView}
                                    >
                                        <option value=''>Select Gender</option>
                                        <option value='Male'>Male</option>
                                        <option value='Female'>Female</option>
                                    </select>
                                </div>
                                <div className='inpcov'>
                                    <div>Marital Status</div>
                                    <input 
                                        className='forminp'
                                        name='guarantorMaritalStatus'
                                        type='text'
                                        placeholder='Marital Status' 
                                        value={fields.guarantorMaritalStatus}
                                        disabled={isView}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>Guarantor Religion</div>
                                    <input 
                                        className='forminp'
                                        name='guarantorReligion'
                                        type='text'
                                        placeholder='Religion' 
                                        value={fields.guarantorReligion}
                                        disabled={isView}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>Relationship</div>
                                    <input 
                                        className='forminp'
                                        name='guarantorRelationship'
                                        type='text'
                                        placeholder='Relationship' 
                                        value={fields.guarantorRelationship}
                                        disabled={isView}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>{`Knows ${fields.firstName} ${fields.lastName} For`}</div>
                                    <input 
                                        className='forminp'
                                        name='guarantorKnowsEmploeyeeFor'
                                        type='text'
                                        placeholder='Knows Employee For' 
                                        value={fields.guarantorKnowsEmploeyeeFor}
                                        disabled={isView}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>Gurantor Can Vouch</div>
                                    <select 
                                        className='forminp'
                                        name='guarantorStance'
                                        type='text'
                                        placeholder='Gurantor Can Vouch' 
                                        value={fields.guarantorStance}
                                        disabled={isView}
                                    >
                                        <option value=''>Can Gurantor Vouch for Employee?</option>
                                        <option value='Yes'>Yes</option>
                                        <option value='No'>No</option>
                                    </select>
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