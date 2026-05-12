import './Positions.css'

import { useEffect, useMemo, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'

const initialFields = {
    name: '',
    description: ''
}

const Positions = () => {
    const [writeStatus, setWriteStatus] = useState('New')
    const [editId, setEditId] = useState(null)
    const [editName, setEditName] = useState(null)
    const [viewName, setViewName] = useState(null)
    const [addBlock, setAddBlock] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
    const [fields, setFields] = useState({ ...initialFields })
    const {
        storePath,
        fetchServer,
        server, intervalPeriod,
        company,
        employees, getEmployees,
        positions, setPositions, getPositions
    } = useContext(ContextProvider)

    useEffect(() => {
        storePath('positions')
        document.title = 'Positions | Enterprise Compute Central'
    }, [storePath])

    useEffect(() => {
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        getEmployees(cmp_val)
        getPositions(cmp_val)
        const intervalId = setInterval(() => {
            if (cmp_val) {
                getEmployees(cmp_val)
                getPositions(cmp_val)
            }
        }, intervalPeriod)
        return () => clearInterval(intervalId);
    }, [window.localStorage.getItem('sessn-cmp')])

    useEffect(() => {
        var postns = [...positions]
        positions.forEach((pos, index) => {
            const posEmps = employees.filter((emp) => {
                return emp.position === pos.name
            })
            postns[index].employees = posEmps
            setPositions(postns)
        });
    }, [employees])

    useEffect(() => {
        if (viewName || addBlock) {
            setMobileDetailOpen(true)
        }
    }, [viewName, addBlock])

    const resetForm = () => {
        setFields({ ...initialFields })
        setEditId(null)
        setEditName(null)
        setWriteStatus('New')
        setAddBlock(false)
    }

    const addPosition = async () => {
        if (fields.name) {
            const newPosition = {
                ...fields,
                employees: []
            }
            const newPositions = [...positions, newPosition]
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Positions",
                update: newPosition
            }, "createDoc", server)

            if (resps.err) {
                console.log(resps.mess)
            } else {
                setPositions(newPositions)
                setViewName(newPosition.name)
                resetForm()
                getPositions(company)
            }
        }
    }

    const editPosition = async () => {
        const name = editName
        const index = Number(editId)
        if (fields.name) {
            const updatedPosition = {
                ...fields,
                employees: positions[index]?.employees || []
            }
            const filteredPos = positions.filter((pos) => {
                return pos.name !== name
            })
            const updatedPositions = [...filteredPos, updatedPosition]
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Positions",
                prop: [{ name: name }, updatedPosition]
            }, "updateOneDoc", server)

            if (resps.err) {
                console.log(resps.mess)
            } else {
                setPositions(updatedPositions)
                setViewName(updatedPosition.name)
                resetForm()
                getPositions(company)
            }
        }
    }

    const deletePosition = async () => {
        const name = editName
        const filteredPos = positions.filter((pos) => {
            return pos.name !== name
        })
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Positions",
            update: { name: name }
        }, "removeDoc", server)
        if (resps.err) {
            console.log(resps.mess)
        } else {
            setPositions(filteredPos)
            setViewName(null)
            resetForm()
            getPositions(company)
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

    const filteredPositions = useMemo(() => {
        return positions.filter((position) => {
            const text = `${position.name} ${position.description || ''}`.toLowerCase()
            return text.includes(searchTerm.toLowerCase())
        })
    }, [positions, searchTerm])

    const viewedPosition = positions.find((position) => position.name === viewName) || filteredPositions[0] || null
    const largestPosition = [...positions].sort((a, b) => (b.employees?.length || 0) - (a.employees?.length || 0))[0]

    return (
        <div className={`positions-page ${mobileDetailOpen ? 'mobile-detail-open' : ''}`}>
            <div className='positions-shell'>
                <aside className='positions-sidebar'>
                    <div className='positions-sidebar-header'>
                        <div>
                            <div className='positions-kicker'>Workforce Roles</div>
                            <h1 className='positions-title'>Positions</h1>
                            <p className='positions-subtitle'>
                                Shape the roles people work in with a cleaner, easier-to-navigate assignment view.
                            </p>
                        </div>
                        <button
                            className='positions-add-btn'
                            onClick={() => {
                                setWriteStatus('New')
                                setViewName(null)
                                setAddBlock(true)
                                setFields({ ...initialFields })
                                setEditId(null)
                                setEditName(null)
                            }}
                        >
                            Add Position
                        </button>
                        <div className='positions-stats'>
                            <div className='positions-stat-card'>
                                <span>Total Positions</span>
                                <strong>{positions.length}</strong>
                            </div>
                            <div className='positions-stat-card'>
                                <span>Assigned Employees</span>
                                <strong>{employees.filter((employee) => employee.position).length}</strong>
                            </div>
                            <div className='positions-stat-card'>
                                <span>Largest Role</span>
                                <strong>{largestPosition?.employees?.length || 0}</strong>
                            </div>
                        </div>
                    </div>

                    <div className='positions-toolbar'>
                        <input
                            className='positions-search-input'
                            type='text'
                            placeholder='Search positions'
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                            }}
                        />
                    </div>

                    <div className='positions-list'>
                        {filteredPositions.map((position, id) => {
                            const { name, description, employees: positionEmployees = [] } = position
                            const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
                            return (
                                <div
                                    className={'positions-list-card' + ((viewName || viewedPosition?.name) === name ? ' active' : '')}
                                    key={id}
                                    onClick={() => {
                                        setViewName(name)
                                        setAddBlock(false)
                                    }}
                                >
                                    <div className='positions-avatar'>{initials || 'PS'}</div>
                                    <div className='positions-list-body'>
                                        <div className='positions-list-name'>{name}</div>
                                        <div className='positions-list-desc'>{description || 'No position summary yet.'}</div>
                                        <div className='positions-list-meta'>
                                            <span>{positionEmployees.length} Employee(s)</span>
                                        </div>
                                    </div>
                                    <button
                                        className='positions-list-action'
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
                        {filteredPositions.length === 0 && (
                            <div className='positions-empty-state'>
                                No positions match this search yet.
                            </div>
                        )}
                    </div>
                </aside>

                <section className='positions-detail'>
                    <button type='button' className='detail-mobile-back' onClick={() => setMobileDetailOpen(false)}>
                        &larr; Back to Positions
                    </button>
                    <div className='positions-detail-hero'>
                        <div className='positions-panel-label'>Role Workspace</div>
                        <h2>{addBlock ? `${writeStatus} Position` : (viewedPosition?.name || 'Select a position')}</h2>
                        <p>
                            {addBlock
                                ? 'Refine the role profile while keeping the existing data flow and handlers untouched.'
                                : (viewedPosition?.description || 'Choose a position on the left to see the role summary and assigned staff.')}
                        </p>
                    </div>

                    {addBlock ? (
                        <div className='positions-form-card' onChange={handleFieldChange}>
                            <div className='positions-form-grid'>
                                <label className='positions-field'>
                                    <span>Position Name</span>
                                    <input
                                        className='positions-input'
                                        name='name'
                                        type='text'
                                        placeholder='Enter position'
                                        value={fields.name}
                                    />
                                </label>
                                <label className='positions-field positions-field-wide'>
                                    <span>Description</span>
                                    <textarea
                                        className='positions-textarea'
                                        name='description'
                                        type='text'
                                        placeholder='Describe this position'
                                        value={fields.description}
                                    />
                                </label>
                            </div>

                            <div className='positions-form-actions'>
                                <button
                                    className='positions-secondary-btn'
                                    onClick={resetForm}
                                >
                                    Discard
                                </button>
                                {writeStatus === 'Edit' && (
                                    <button
                                        className='positions-delete-btn'
                                        onClick={deletePosition}
                                    >
                                        Delete
                                    </button>
                                )}
                                <button
                                    className='positions-primary-btn'
                                    onClick={() => {
                                        if (writeStatus === 'New') {
                                            addPosition()
                                        } else {
                                            editPosition()
                                        }
                                    }}
                                >
                                    Save Position
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className='positions-overview-card'>
                            {viewedPosition ? (
                                <>
                                    <div className='positions-overview-grid'>
                                        <div className='positions-overview-item'>
                                            <span>Position</span>
                                            <strong>{viewedPosition.name}</strong>
                                        </div>
                                        <div className='positions-overview-item'>
                                            <span>Assigned Staff</span>
                                            <strong>{viewedPosition.employees?.length || 0}</strong>
                                        </div>
                                    </div>
                                    <div className='positions-overview-copy'>
                                        {viewedPosition.description || 'No description has been added for this position yet.'}
                                    </div>
                                    <div className='positions-team-list'>
                                        {(viewedPosition.employees || []).length ? (
                                            viewedPosition.employees.map((employee, index) => (
                                                <div key={index} className='positions-team-card'>
                                                    <div className='positions-team-name'>
                                                        {`${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.i_d}
                                                    </div>
                                                    <div className='positions-team-role'>{employee.department || 'No department assigned'}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className='positions-empty-state'>
                                                No employees are assigned to this position yet.
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className='positions-empty-state'>
                                    No position selected yet.
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}

export default Positions
