import './Departments.css'

import { useEffect, useMemo, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'

const initialFields = {
    name: '',
    description: ''
}

const Departments = () => {
    const [writeStatus, setWriteStatus] = useState('New')
    const [editId, setEditId] = useState(null)
    const [editName, setEditName] = useState(null)
    const [viewName, setViewName] = useState(null)
    const [addBlock, setAddBlock] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [fields, setFields] = useState({ ...initialFields })
    const {
        storePath,
        fetchServer, intervalPeriod,
        server,
        company,
        employees, getEmployees,
        departments, setDepartments, getDepartments
    } = useContext(ContextProvider)

    useEffect(() => {
        storePath('departments')
    }, [storePath])

    useEffect(() => {
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        getEmployees(cmp_val)
        getDepartments(cmp_val)
        const intervalId = setInterval(() => {
            if (cmp_val) {
                getEmployees(cmp_val)
                getDepartments(cmp_val)
            }
        }, intervalPeriod)
        return () => clearInterval(intervalId);
    }, [window.localStorage.getItem('sessn-cmp')])

    useEffect(() => {
        var depts = [...departments]
        departments.forEach((dept, index) => {
            const deptEmps = employees.filter((emp) => {
                return emp.department === dept.name
            })
            depts[index].employees = deptEmps
            setDepartments(depts)
        });
    }, [employees])

    const resetForm = () => {
        setFields({ ...initialFields })
        setEditId(null)
        setEditName(null)
        setWriteStatus('New')
        setAddBlock(false)
    }

    const addDepartment = async () => {
        if (fields.name) {
            const newDepartment = {
                ...fields,
                employees: []
            }
            const newDepartments = [...departments, newDepartment]

            const resps = await fetchServer("POST", {
                database: company,
                collection: "Departments",
                update: newDepartment
            }, "createDoc", server)

            if (resps.err) {
                console.log(resps.mess)
            } else {
                setDepartments(newDepartments)
                setViewName(newDepartment.name)
                resetForm()
                getDepartments(company)
            }
        }
    }

    const editDepartment = async () => {
        const name = editName
        const index = Number(editId)
        if (fields.name) {
            const updatedDepartment = {
                ...fields,
                employees: departments[index]?.employees || []
            }
            const filteredDept = departments.filter((dept) => {
                return dept.name !== name
            })
            const updatedDepartments = [...filteredDept, updatedDepartment]
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Departments",
                prop: [{ name: name }, updatedDepartment]
            }, "updateOneDoc", server)

            if (resps.err) {
                console.log(resps.mess)
            } else {
                setDepartments(updatedDepartments)
                setViewName(updatedDepartment.name)
                resetForm()
                getDepartments(company)
            }
        }
    }

    const deleteDepartment = async () => {
        const name = editName
        const filteredDept = departments.filter((dept) => {
            return dept.name !== name
        })
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Departments",
            update: { name: name }
        }, "removeDoc", server)
        if (resps.err) {
            console.log(resps.mess)
        } else {
            setDepartments(filteredDept)
            setViewName(null)
            resetForm()
            getDepartments(company)
        }
    }

    const handleFieldChange = (e) => {
        const name = e.target.getAttribute('name')
        const value = e.target.value
        setFields((prevFields) => {
            return {
                ...prevFields, [name]: value
            }
        })
    }

    const filteredDepartments = useMemo(() => {
        return departments.filter((department) => {
            const text = `${department.name} ${department.description || ''}`.toLowerCase()
            return text.includes(searchTerm.toLowerCase())
        })
    }, [departments, searchTerm])

    const viewedDepartment = departments.find((department) => department.name === viewName) || filteredDepartments[0] || null
    const largestDepartment = [...departments].sort((a, b) => (b.employees?.length || 0) - (a.employees?.length || 0))[0]

    return (
        <div className='departments-page'>
            <div className='departments-shell'>
                <aside className='departments-sidebar'>
                    <div className='departments-sidebar-header'>
                        <div>
                            <div className='departments-kicker'>Organization Structure</div>
                            <h1 className='departments-title'>Departments</h1>
                            <p className='departments-subtitle'>
                                Keep the organization tree clean, easy to scan, and ready for staffing decisions.
                            </p>
                        </div>
                        <button
                            className='departments-add-btn'
                            onClick={() => {
                                setWriteStatus('New')
                                setViewName(null)
                                setAddBlock(true)
                                setFields({ ...initialFields })
                                setEditId(null)
                                setEditName(null)
                            }}
                        >
                            Add Department
                        </button>
                        <div className='departments-stats'>
                            <div className='departments-stat-card'>
                                <span>Total Departments</span>
                                <strong>{departments.length}</strong>
                            </div>
                            <div className='departments-stat-card'>
                                <span>Assigned Employees</span>
                                <strong>{employees.filter((employee) => employee.department).length}</strong>
                            </div>
                            <div className='departments-stat-card'>
                                <span>Largest Team</span>
                                <strong>{largestDepartment?.employees?.length || 0}</strong>
                            </div>
                        </div>
                    </div>

                    <div className='departments-toolbar'>
                        <input
                            className='departments-search-input'
                            type='text'
                            placeholder='Search departments'
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                            }}
                        />
                    </div>

                    <div className='departments-list'>
                        {filteredDepartments.map((department, id) => {
                            const { name, description, employees: departmentEmployees = [] } = department
                            const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
                            return (
                                <div
                                    className={'departments-list-card' + ((viewName || viewedDepartment?.name) === name ? ' active' : '')}
                                    key={id}
                                    onClick={() => {
                                        setViewName(name)
                                        setAddBlock(false)
                                    }}
                                >
                                    <div className='departments-avatar'>{initials || 'DP'}</div>
                                    <div className='departments-list-body'>
                                        <div className='departments-list-name'>{name}</div>
                                        <div className='departments-list-desc'>{description || 'No department summary yet.'}</div>
                                        <div className='departments-list-meta'>
                                            <span>{departmentEmployees.length} Employee(s)</span>
                                        </div>
                                    </div>
                                    <button
                                        className='departments-list-action'
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setEditId(id)
                                            setEditName(name)
                                            setViewName(name)
                                            setWriteStatus('Edit')
                                            setFields({
                                                name,
                                                description
                                            })
                                            setAddBlock(true)
                                        }}
                                    >
                                        Edit
                                    </button>
                                </div>
                            )
                        })}
                        {filteredDepartments.length === 0 && (
                            <div className='departments-empty-state'>
                                No departments match this search yet.
                            </div>
                        )}
                    </div>
                </aside>

                <section className='departments-detail'>
                    <div className='departments-detail-hero'>
                        <div className='departments-panel-label'>Department Workspace</div>
                        <h2>{addBlock ? `${writeStatus} Department` : (viewedDepartment?.name || 'Select a department')}</h2>
                        <p>
                            {addBlock
                                ? 'Update the department profile without affecting the existing staffing logic.'
                                : (viewedDepartment?.description || 'Choose a department on the left to see its staffing summary and details.')}
                        </p>
                    </div>

                    {addBlock ? (
                        <div className='departments-form-card' onChange={handleFieldChange}>
                            <div className='departments-form-grid'>
                                <label className='departments-field'>
                                    <span>Department Name</span>
                                    <input
                                        className='departments-input'
                                        name='name'
                                        type='text'
                                        placeholder='Enter department'
                                        value={fields.name}
                                    />
                                </label>
                                <label className='departments-field departments-field-wide'>
                                    <span>Description</span>
                                    <textarea
                                        className='departments-textarea'
                                        name='description'
                                        type='text'
                                        placeholder='Describe this department'
                                        value={fields.description}
                                    />
                                </label>
                            </div>

                            <div className='departments-form-actions'>
                                <button
                                    className='departments-secondary-btn'
                                    onClick={resetForm}
                                >
                                    Discard
                                </button>
                                {writeStatus === 'Edit' && (
                                    <button
                                        className='departments-delete-btn'
                                        onClick={deleteDepartment}
                                    >
                                        Delete
                                    </button>
                                )}
                                <button
                                    className='departments-primary-btn'
                                    onClick={() => {
                                        if (writeStatus === 'New') {
                                            addDepartment()
                                        } else {
                                            editDepartment()
                                        }
                                    }}
                                >
                                    Save Department
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className='departments-overview-card'>
                            {viewedDepartment ? (
                                <>
                                    <div className='departments-overview-grid'>
                                        <div className='departments-overview-item'>
                                            <span>Department</span>
                                            <strong>{viewedDepartment.name}</strong>
                                        </div>
                                        <div className='departments-overview-item'>
                                            <span>Active Staff</span>
                                            <strong>{viewedDepartment.employees?.length || 0}</strong>
                                        </div>
                                    </div>
                                    <div className='departments-overview-copy'>
                                        {viewedDepartment.description || 'No description has been added for this department yet.'}
                                    </div>
                                    <div className='departments-team-list'>
                                        {(viewedDepartment.employees || []).length ? (
                                            viewedDepartment.employees.map((employee, index) => (
                                                <div key={index} className='departments-team-card'>
                                                    <div className='departments-team-name'>
                                                        {`${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.i_d}
                                                    </div>
                                                    <div className='departments-team-role'>{employee.position || 'No position assigned'}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className='departments-empty-state'>
                                                No employees are assigned to this department yet.
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className='departments-empty-state'>
                                    No department selected yet.
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}

export default Departments
