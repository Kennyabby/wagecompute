import './Employees.css'

import { useEffect, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'

const Employees = () => {
    const { storePath,
        fetchServer,
        server, intervalPeriod,
        company, companyRecord,
        departments,
        positions, editAccess,
        employees, setEmployees, getEmployees,
        sales, purchase, expenses, accommodations,
        alert, alertState, alertTimeout, actionMessage,
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
    const [searchTerm, setSearchTerm] = useState('')
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
    const initFields = {
        i_d: '',
        firstName: '',
        lastName: '',
        otherName: '',
        department: '',
        position: '',
        gender: '',
        dateOfBirth: '',
        phoneNo: '',
        address: '',
        hiredDate: '',
        dismissalDate: '',
        dismissalReason: '',
        bankName: '',
        bankBranch: '',
        accountNo: '',
        expectedWorkDays: '',
        salary: '',
        guarantorName: '',
        guarantorAddress: '',
        guarantorLGA: '',
        guarantorSOA: '',
        guarantorPhoneNo: '',
        guarantorGender: '',
        guarantorMaritalStatus: '',
        guarantorReligion: '',
        guarantorRelationship: '',
        guarantorKnowsEmploeyeeFor: '',
        guarantorStance: '',
        guarantorFormCreatedAt: ''
    }
    const [fields, setFields] = useState({ ...initFields })
    useEffect(() => {
        storePath('employees')
    }, [storePath])
    useEffect(() => {
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        getEmployees(cmp_val)
        const intervalId = setInterval(() => {
            if (cmp_val) {
                getEmployees(cmp_val)
            }
        }, intervalPeriod)
        return () => clearInterval(intervalId);
    }, [window.localStorage.getItem('sessn-cmp')])
    useEffect(() => {
        if (!editAccess.employees && companyRecord.status !== 'admin') {
            setIsView(true)
        }
    }, [editAccess])
    
    useEffect(() => {
        if (isView || curEmployee) {
            setMobileDetailOpen(true)
        }
    }, [isView, curEmployee])
    
    const resetEmployeeForm = () => {
        setFields({ ...initFields })
        setIsView(false)
        setWriteStatus('New')
        setCurEmployee(null)
    }
    const changeEmployeeType = (name) => {
        if (name) {
            setEmployeeType(name)
        }
        resetEmployeeForm()
    }
    const toggleSelForm = (e) => {
        const name = e.target.getAttribute('name')
        if (name) {
            setSelform(name)
        }
    }
    const addEmployee = async () => {
        setAlertState('info')
        setAlert(
            `Adding Employee...`
        )
        if (fields.i_d) {
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

            if (resps.err) {
                console.log(resps.mess)
                setAlertState('error')
                setAlert(
                    resps.mess
                )
                setAlertTimeout(5000)
            } else {
                setEmployees(newEmployees)
                setCurEmployee(newEmployee)
                setIsView(true)
                setFields({ ...newEmployee })
                setAlertState('success')
                setAlert(
                    'Employee Added Successfully!'
                )
                setAlertTimeout(1000)
                getEmployees(company)
            }

        }
    }
    const editEmployee = async () => {
        setAlertState('info')
        setAlert(
            `Updating Employee...`
        )
        const i_d = curEmployee.i_d
        const index = Number(editIndex)
        if (fields.i_d) {
            const updatedEmployee = {
                ...fields,
                createdAt: employees[index].createdAt
            }
            const filteredEmp = employees.filter((emp) => {
                return emp.i_d !== i_d
            })
            const updatedEmployees = [...filteredEmp, updatedEmployee]
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Employees",
                prop: [{ i_d: i_d }, updatedEmployee]
            }, "updateOneDoc", server)

            if (resps.err) {
                console.log(resps.mess)
                setAlertState('error')
                setAlert(
                    resps.mess
                )
                setAlertTimeout(5000)
            } else {
                setEmployees(updatedEmployees)
                setCurEmployee(updatedEmployee)
                setIsView(true)
                setFields({ ...updatedEmployee })
                setAlertState('success')
                setAlert(
                    'Employee Details Updated Successfully!'
                )
                setAlertTimeout(1000)
                getEmployees(company)
            }

        }
    }

    const deleteEmployee = async () => {
        var act = 0
        accommodations.filter((accommodation) => {
            if (accommodation.employeeId === curEmployee.i_d) {
                act++
            }
            if (act) {
                return
            }
        })
        if (!act) {
            sales.map((sale) => {
                sale.record.filter((record) => {
                    if (record.employeeId === curEmployee.i_d) {
                        act++
                    }
                    if (act) {
                        return
                    }
                })
            })
        }
        if (!act) {
            purchase.filter((purchase) => {
                if (purchase.purchaseHandler === curEmployee.i_d) {
                    act++
                }
                if (act) {
                    return
                }
            })
        }
        if (!act) {
            expenses.filter((expense) => {
                if (expense.expenseHandler === curEmployee.i_d) {
                    act++
                }
                if (act) {
                    return
                }
            })
        }

        if (act) {
            setActionMessage('')
            setAlertState('error')
            setAlert(
                `The Employee Record is in use in another Model. Delete the Corresponding Record Before Proceeding`
            )
            setAlertTimeout(5000)
        } else {
            setAlertState('info')
            setAlert(
                `Deleting Employee...`
            )
            const i_d = curEmployee.i_d
            const filteredEmp = employees.filter((emp) => {
                return emp.i_d !== i_d
            })
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Employees",
                update: { i_d: i_d }
            }, "removeDoc", server)
            if (resps.err) {
                console.log(resps.mess)
                setAlertState('error')
                setAlert(
                    resps.mess
                )
                setAlertTimeout(5000)
            } else {
                setEmployees(filteredEmp)
                setCurEmployee(null)
                setFields({ ...initFields, i_d: filteredEmp.length + 1 })
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

    const handleFieldChange = (e) => {
        const name = e.target.getAttribute('name')
        const value = e.target.value

        setFields((fields) => {
            return {
                ...fields, [name]: value
            }
        })
    }
    const handleViewClick = (e, index, employee) => {
        const name = e.target.getAttribute('name')
        if (name === 'edit') {
            setIsView(false)
            setEditIndex(index)
            setWriteStatus('Edit')
        } else {
            setIsView(true)
        }
        setCurEmployee(employee)
        var newEmpValue = { ...employee }
        delete newEmpValue._id
        setFields({ ...newEmpValue })
    }
    const filteredEmployees = (employees || [])?.filter((empl) => {
        const dismissalStatus = empl.dismissalDate ? 'dismissed' : 'current'
        if (dismissalStatus !== employeeType) {
            return false
        }

        const normalizedSearch = searchTerm.trim().toLowerCase()
        if (!normalizedSearch) {
            return true
        }

        const searchableFields = [
            empl.i_d,
            empl.firstName,
            empl.lastName,
            empl.otherName,
            empl.department,
            empl.position,
            empl.phoneNo
        ].filter(Boolean).join(' ').toLowerCase()

        return searchableFields.includes(normalizedSearch)
    })
    const currentEmployeesCount = employees.filter((empl) => !empl.dismissalDate).length
    const dismissedEmployeesCount = employees.length - currentEmployeesCount
    const panelEmployee = curEmployee || fields
    const panelEmployeeName = [panelEmployee?.firstName, panelEmployee?.otherName, panelEmployee?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim()
    const panelEmployeeInitials = [panelEmployee?.firstName, panelEmployee?.lastName]
        .filter(Boolean)
        .map((name) => name[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'EC'
    const panelTitle = isView ? 'Employee Profile' : (writeStatus === 'New' ? 'Create Employee' : 'Edit Employee')
    const panelDescription = selform === 'Basic'
        ? 'Personal identity, contact details, and assigned role.'
        : selform === 'Hr'
            ? 'Employment records, salary, and banking information.'
            : 'Guarantor profile and background details.'
    const canEditEmployees = companyRecord.status === 'admin' || editAccess.employees
    return (
        <>
            <div className={`employees-page ${mobileDetailOpen ? 'mobile-detail-open' : ''}`}>
                <div className='detail-overlay' onClick={resetEmployeeForm}></div>
                <div className='employees-shell'>

                    <div className='employees-sidebar'>
                        <div className='employees-sidebar-header'>
                            <div className='employees-kicker'>Workforce Hub</div>
                            <div className='employees-heading-row'>
                                <div>
                                    <h2 className='employees-title'>Employees</h2>
                                    <p className='employees-subtitle'>A cleaner workspace for browsing, reviewing, and updating staff records.</p>
                                </div>
                                <button
                                    type='button'
                                    className='employees-add-btn'
                                    onClick={() => {
                                        resetEmployeeForm()
                                        setMobileDetailOpen(true)
                                    }}
                                >
                                    Add Employee
                                </button>

                            </div>
                            <div className='employees-stats'>
                                <div className='employees-stat-card'>
                                    <span className='employees-stat-label'>Active</span>
                                    <strong>{currentEmployeesCount}</strong>
                                </div>
                                <div className='employees-stat-card'>
                                    <span className='employees-stat-label'>Dismissed</span>
                                    <strong>{dismissedEmployeesCount}</strong>
                                </div>
                                <div className='employees-stat-card'>
                                    <span className='employees-stat-label'>Departments</span>
                                    <strong>{departments.length}</strong>
                                </div>
                            </div>
                        </div>
                        <div className='employees-toolbar'>
                            <div className='employees-search-box'>
                                <input
                                    className='employees-search-input'
                                    type='text'
                                    placeholder='Search by name, ID, department, or role'
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value)
                                    }}
                                />
                            </div>
                            <div className='employees-filter-tabs'>
                                <button
                                    type='button'
                                    className={'employees-filter-btn' + (employeeType === 'current' ? ' active' : '')}
                                    onClick={() => {
                                        changeEmployeeType('current')
                                    }}
                                >
                                    Current
                                </button>
                                <button
                                    type='button'
                                    className={'employees-filter-btn' + (employeeType === 'dismissed' ? ' active' : '')}
                                    onClick={() => {
                                        changeEmployeeType('dismissed')
                                    }}
                                >
                                    Dismissed
                                </button>
                            </div>
                        </div>
                        <div className='employees-list'>
                            {filteredEmployees.length ? filteredEmployees.map((employee, index) => {
                                const { i_d, firstName, lastName, otherName, department, position, phoneNo } = employee
                                const employeeName = [firstName, otherName, lastName].filter(Boolean).join(' ')
                                const initials = [firstName, lastName].filter(Boolean).map((name) => name[0]).join('').slice(0, 2).toUpperCase() || 'EC'
                                return (
                                    <div
                                        className={'employees-list-card' + (curEmployee?.i_d === i_d ? ' active' : '')}
                                        key={index}
                                        i_d={i_d}
                                        onClick={(e) => {
                                            handleViewClick(e, index, employee)
                                        }}
                                    >
                                        <div className='employees-list-avatar'>{initials}</div>
                                        <div className='employees-list-body'>
                                            <div className='employees-list-top'>
                                                <div>
                                                    <div className='employees-list-name'>{employeeName || 'Unnamed Employee'}</div>
                                                    <div className='employees-list-id'>Employee ID: {i_d}</div>
                                                </div>
                                                <span className='employees-status-pill'>{employee.dismissalDate ? 'Dismissed' : 'Active'}</span>
                                            </div>
                                            <div className='employees-list-meta'>
                                                <span>{department || 'No department'}</span>
                                                <span>{position || 'No position'}</span>
                                                <span>{phoneNo || 'No phone number'}</span>
                                            </div>
                                        </div>
                                        {canEditEmployees && <button
                                            type='button'
                                            className='employees-list-action'
                                            name='edit'
                                        >
                                            Edit
                                        </button>}
                                    </div>
                                )
                            }) : (
                                <div className='employees-empty-state'>
                                    <div className='employees-empty-title'>No employees found</div>
                                    <p>Try another search term or switch the employee filter.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className='employees-detail'>
                        <button type='button' className='detail-mobile-back' onClick={() => setMobileDetailOpen(false)}>
                            &larr; Back to Employees
                        </button>
                        <div className='employees-detail-hero'>
                            <div className='employees-detail-avatar'>{panelEmployeeInitials}</div>
                            <div className='employees-detail-copy'>
                                <div className='employees-detail-kicker'>{panelTitle}</div>
                                <h3>{panelEmployeeName || 'Start a fresh employee record'}</h3>
                                <p>{panelDescription}</p>
                                <div className='employees-detail-badges'>
                                    <span className='employees-detail-badge'>{fields.i_d || 'No employee ID yet'}</span>
                                    <span className='employees-detail-badge'>{fields.department || 'Department pending'}</span>
                                    <span className='employees-detail-badge'>{fields.position || 'Role pending'}</span>
                                </div>
                            </div>
                            {writeStatus === 'Edit' && !isView && <button
                                type='button'
                                className='employees-delete-btn'
                                onClick={deleteEmployee}
                            >
                                Delete
                            </button>}
                        </div>
                        <div className='employees-section-tabs' onClick={toggleSelForm}>
                            <button type='button' name='Basic' className={'employees-section-tab' + (selform === 'Basic' ? ' active' : '')}>Basic Info</button>
                            <button type='button' name='Hr' className={'employees-section-tab' + (selform === 'Hr' ? ' active' : '')}>HR Info</button>
                            <button type='button' name='Guarantor' className={'employees-section-tab' + (selform === 'Guarantor' ? ' active' : '')}>Guarantor Info</button>
                        </div>
                        <div className='employees-detail-panel'>
                            <div className='employees-panel-topline'>
                                <div>
                                    <div className='employees-panel-label'>{isView ? 'Viewing record' : 'Editing mode'}</div>
                                    <div className='employees-panel-value'>{isView ? 'Read-only mode' : `${writeStatus} employee record`}</div>
                                </div>
                                <div className='employees-panel-summary'>
                                    <span>{fields.gender || 'Gender not set'}</span>
                                    <span>{fields.salary ? `NGN ${Number(fields.salary).toLocaleString()}` : 'Salary pending'}</span>
                                    <span>{fields.dismissalDate ? 'Dismissed employee' : 'Current employee'}</span>
                                </div>
                            </div>
                            <div className='fm' onChange={handleFieldChange}>
                        {selform === 'Basic' && <div className='basic'>
                            <div className='inpcov'>
                                <label className='employees-field-label'>Employee ID</label>
                                <input
                                    className='forminp'
                                    name='i_d'
                                    type='text'
                                    placeholder='Employee ID'
                                    value={fields.i_d}
                                    disabled={isView || writeStatus === 'Edit'}
                                />
                            </div>
                            <div className='inpcov'>
                                <label className='employees-field-label'>First Name</label>
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
                                <label className='employees-field-label'>Last Name</label>
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
                                <label className='employees-field-label'>Other Name</label>
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
                                <label className='employees-field-label'>Address</label>
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
                                <label className='employees-field-label'>Phone Number</label>
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
                                <label className='employees-field-label'>Date of Birth</label>
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
                                <label className='employees-field-label'>Gender</label>
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
                                <label className='employees-field-label'>Department</label>
                                <select
                                    className='forminp'
                                    name='department'
                                    type='text'
                                    value={fields.department}
                                    disabled={isView}
                                >
                                    <option value=''>Select Department</option>
                                    {departments.map((department, id) => {
                                        const { name } = department
                                        return <option key={id} value={name}>{name}</option>

                                    })}
                                </select>
                            </div>
                            <div className='inpcov'>
                                <label className='employees-field-label'>Position</label>
                                <select
                                    className='forminp'
                                    name='position'
                                    type='text'
                                    value={fields.position}
                                    disabled={isView}
                                >
                                    <option value=''>Select Position</option>
                                    {positions.map((position, id) => {
                                        const { name } = position
                                        return <option key={id} value={name}>{name}</option>

                                    })}
                                </select>
                            </div>
                        </div>}
                        {selform === 'Hr' &&
                            <div className='hr'>
                                <div className='inpcov'>
                                    <label className='employees-field-label'>Hired Date</label>
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
                                    <label className='employees-field-label'>Dismissal Date</label>
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
                                    <label className='employees-field-label'>Dismissal Reason</label>
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
                                    <label className='employees-field-label'>Bank Name</label>
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
                                    <label className='employees-field-label'>Bank Branch</label>
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
                                    <label className='employees-field-label'>Account No</label>
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
                                    <label className='employees-field-label'>Salary (Naira)</label>
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
                                    <label className='employees-field-label'>Debt (Naira)</label>
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
                                    <label className='employees-field-label'>Recovered (Naira)</label>
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
                                    <label className='employees-field-label'>Expected Work Days</label>
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
                        {selform === 'Guarantor' &&
                            <div className='hr'>
                                <div className='inpcov'>
                                    <label className='employees-field-label'>Full Name</label>
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
                                    <label className='employees-field-label'>Address</label>
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
                                    <label className='employees-field-label'>Local Government of Origin</label>
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
                                    <label className='employees-field-label'>State of Origin</label>
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
                                    <label className='employees-field-label'>Phone No</label>
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
                                    <label className='employees-field-label'>Guarantor Gender</label>
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
                                    <label className='employees-field-label'>Marital Status</label>
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
                                    <label className='employees-field-label'>Guarantor Religion</label>
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
                                    <label className='employees-field-label'>Relationship</label>
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
                                    <label className='employees-field-label'>{`Knows ${fields.firstName} ${fields.lastName} For`}</label>
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
                                    <label className='employees-field-label'>Gurantor Can Vouch</label>
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
                            {!isView && <div className='employees-form-actions'>
                                {writeStatus === 'Edit' && <button
                                    type='button'
                                    className='employees-secondary-btn'
                                    onClick={() => {
                                        setIsView(true)
                                        setFields({ ...curEmployee })
                                    }}
                                >
                                    Discard
                                </button>}
                                <button
                                    type='button'
                                    className='employees-primary-btn'
                                    onClick={() => {
                                        if (writeStatus === 'New') {
                                            addEmployee()
                                        } else {
                                            editEmployee()
                                        }
                                    }}
                                >
                                    Save Employee
                                </button>
                            </div>}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Employees
