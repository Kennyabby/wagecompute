import './Settings.css'
import { useEffect, useState, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'

const Settings = () => {
    const { storePath, company, companyRecord, 
        settings, getSettings, server, fetchServer, 
        recoveryVal, setRecoveryVal, changingSettings, 
        setChangingSettings, colSettings, setColSettings, 
        enableBlockVal, setEnableBlockVal, 
        genDb, DBProfiles, setDBProfiles, fetchDBProfiles,
        profiles, setProfiles, 
        employees, getEmployees, dashList, fetchProfiles, 
        setAlert, setAlertState, setAlertTimeout
    } = useContext(ContextProvider)

    const [colname, setColname] = useState('')
    const [writeStatus, setWriteStatus] = useState('Add')
    const [editCol, setEditCol] = useState(null)
    const [showPass, setShowPass] = useState(false)
    const [saveStatus, setSaveStatus] = useState('')
    const [currentView, setCurrentView] = useState('employees')
    const [selectedEmployee, setSelectedEmployee] = useState(null)
    const [currentProfiles, setCurrentProfiles] = useState([])
    const [deleteCount, setDeleteCount] = useState(0)
    const [accessValue, setAccessValue] = useState('')
    const magicWord = 'oh ye server. deny all '
    const activationWord = 'oh ye server. allow all into your world '
    const [loginDetails, setLoginDetails] = useState({
        email: '',
        password: '',
        permissions: [],
        enableLogin: false,
        enableDebtRecovery: false
    })

    useEffect(() => {
        storePath('settings')
    }, [storePath])

    useEffect(() => {
        const cmp_val = window.localStorage.getItem('sessn-cmp')
        if (cmp_val) {
            getSettings(cmp_val)
            getEmployees(cmp_val)
            fetchProfiles(cmp_val)
            fetchDBProfiles(cmp_val)
        }
    }, [])
    
    useEffect(()=>{
        setCurrentProfiles(profiles.map((profile)=>{
            return profile.emailid
        }))
    },[profiles])

    useEffect(()=>{
        const updateDBStatus = async()=>{
            if (accessValue === magicWord || accessValue === activationWord){
                setAccessValue('updating activation....') 
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Profile",
                    prop: [{ name: 'activation' }, { pauseDB: accessValue===magicWord}]
                }, "updateOneDoc", server)            
                if (resps.err) {
                    console.log(resps.mess)
                } else {
                    fetchProfiles(company)
                    setAccessValue('updated activation')
                    setTimeout(()=>{
                        setAccessValue('')
                    },[2000])                
                }                                             
            }
        }
        updateDBStatus()
    },[accessValue])

    const handleSecretAccess = (e)=>{
        const {name, value} = e.target
        if (name === 'access'){
            setAccessValue(value)
        }else{
            setAccessValue('')
        }
    }

    const handleProfileSelect = (profile) => {
        setShowPass(false)
        setDeleteCount(0)
        setSelectedEmployee(profile)
        setLoginDetails({
            email: profile.emailid || '',
            password: '',
            permissions: profile.permissions || [],
            enableLogin: profile.enableLogin || false,
            enableDebtRecovery: profile.enableDebtRecovery || false
        })
    }

    const handleLoginDetailsChange = (e) => {
        const { name, value, type, checked } = e.target
        setLoginDetails({
            ...loginDetails,
            [name]: type === 'checkbox' ? checked : value
        })
    }

    const handlePermissionsChange = (e) => {
        const { value, checked } = e.target
        setLoginDetails(prevState => {
            const permissions = checked
                ? [...prevState.permissions, value]
                : prevState.permissions.filter(permission => permission !== value)
            return { ...prevState, permissions }
        })
    }

    const saveLoginDetails = async () => {
        setAlert('')
        if (selectedEmployee) {
            setSaveStatus('Saving...') 
            delete selectedEmployee._id
            delete selectedEmployee.sessionId
            const updatedProfile = {
                ...selectedEmployee,                
                permissions: loginDetails.permissions,
                enableLogin: loginDetails.enableLogin,
                enableDebtRecovery: loginDetails.enableDebtRecovery
            }
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Profile",
                prop: [{ emailid: selectedEmployee.emailid }, updatedProfile]
            }, "updateOneDoc", server)
            if (resps.err) {
                console.log(resps.mess)
                setSaveStatus(resps.mess)
                setTimeout(()=>{
                    setSaveStatus('')
                },3000)
            } else {
                if (loginDetails.password){
                    const resps = await fetchServer("POST", {
                        database: genDb,
                        collection: "Profiles",
                        prop: [{ emailid: selectedEmployee.emailid }, {password: loginDetails.password}]
                    }, "updateOneDoc", server)
                    if (resps.error){
                        console.log(resps.mess)
                        setSaveStatus(resps.mess)
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    }else{
                        setSaveStatus('Saved')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                        fetchProfiles(company)
                    }                                        
                }else{
                    setSaveStatus('Saved')
                    setTimeout(()=>{
                        setSaveStatus('')
                    },3000)
                    fetchProfiles(company)
                }
            }
        } else {
            if (loginDetails.email && loginDetails.password && loginDetails.permissions.length){
                setSaveStatus('Saving...') 
                const newDBProfile = {
                    emailid: loginDetails.email,
                    name: companyRecord.name,
                    password: loginDetails.password,
                    db: company
                }
                const companyRecordClone = structuredClone({companyRecord})
                const defaultCompanyRecord = companyRecordClone.companyRecord
                delete defaultCompanyRecord._id
                const newProfile = {
                    ...defaultCompanyRecord,
                    emailid: loginDetails.email,
                    permissions: loginDetails.permissions,
                    enableLogin: loginDetails.enableLogin,
                    enableDebtRecovery: loginDetails.enableDebtRecovery,
                    sessionId:'',
                    status: 'user'
                }
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Profile",
                    update: newProfile
                }, "postUserDetails", server)
                if (resps.err) {
                    console.log(resps.mess)
                    setSaveStatus(resps.mess)
                    setTimeout(()=>{
                        setSaveStatus('')
                    },3000)
                } else {
                    const resps1 = await fetchServer("POST", {
                        database: "WCDatabase",
                        collection: "Profiles",
                        update: newDBProfile
                    }, "createDoc", server)
                    if (resps1.err){
                        console.log(resps1.mess)
                        setSaveStatus(resps.mess)
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)                        
                    }else{
                        setSaveStatus('Profile Created')                       
                        fetchProfiles(company)
                        setDBProfiles((DBProfiles)=>{
                            return [...DBProfiles, newDBProfile]
                        })
                        handleProfileSelect(newProfile)
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    }
                }
            }else{
                setAlertState('error')
                setAlert('Select Employee, Create New Password and Select at least 1 Permission!')
                setAlertTimeout(5000)
            }
        }
    }

    const deleteProfile = async () => {
        setAlert('')
        setSaveStatus('Delete again to confirm deletion!')
        if(deleteCount === selectedEmployee.emailid){
            setSaveStatus('Deleting...') 
            if (selectedEmployee) {
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Profile",
                    update: { emailid: selectedEmployee.emailid }
                }, "removeDoc", server)
                if (resps.err) {
                    console.log(resps.mess)
                    setSaveStatus(resps.mess)
                    setTimeout(()=>{
                        setSaveStatus('')
                    },3000)
                } else {
                    const resps1 = await fetchServer("POST", {
                        database: "WCDatabase",
                        collection: "Profiles",
                        update: { emailid: selectedEmployee.emailid }
                    }, "removeDoc", server)
                    if (resps1.err) {
                        console.log(resps.mess)
                        setSaveStatus(resps.mess)
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    }else{
                        setSaveStatus('Profile Deleted')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                        fetchProfiles(company)
                        setSelectedEmployee(null)
                        setLoginDetails({
                            email: '',
                            password: '',
                            permissions: [],
                            enableLogin: false,
                            enableDebtRecovery: false
                        })
                    }
                }
            }
        }else{
            setDeleteCount(selectedEmployee.emailid)
            setTimeout(()=>{
                setSaveStatus('')
            },2000)
            setTimeout(()=>{
                setDeleteCount(0)
            },12000)
        }
    }

    const addProfile = () => {
        setSelectedEmployee(null)
        setLoginDetails({
            email: '',
            password: '',
            permissions: [],
            enableLogin: false,
            enableDebtRecovery: false
        })
    }

    const addColumn = async () => {
        if (colname && !colSettings.import_columns?.includes(colname)) {
            let postingCols = []
            if (writeStatus === 'Edit') {
                const filtcols = colSettings.import_columns?.filter((col) => col !== editCol)
                postingCols = [...filtcols, colname]
            } else {
                const columns = colSettings.import_columns ? [...colSettings.import_columns] : []
                postingCols = [...columns, colname]
            }

            if (colSettings.name) {
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Settings",
                    prop: [{ name: 'import_columns' }, { ...colSettings, import_columns: [...postingCols] }]
                }, "updateOneDoc", server)

                if (resps.err) {
                    console.log(resps.mess)
                } else {
                    setWriteStatus('Add')
                    getSettings(company)
                }
            } else {
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Settings",
                    update: { ...colSettings, name: 'import_columns', import_columns: [...postingCols] }
                }, "createDoc", server)
                if (resps.err) {
                    console.log(resps.mess)
                } else {
                    getSettings(company)
                }
            }
        }
        setColname('')
    }

    const delColumn = async (e) => {
        setSaveStatus('Saving...')
        setChangingSettings(true)
        const colid = Number(e.target.getAttribute('name'))
        const filtcols = colSettings.import_columns.filter((col, index) => index !== colid)
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Settings",
            prop: [{ name: 'import_columns' }, { ...colSettings, import_columns: [...filtcols] }]
        }, "updateOneDoc", server)
        if (resps.err) {
            console.log(resps.mess)
            setSaveStatus(resps.mess)
            setChangingSettings(false)
        } else {
            setSaveStatus('Saved')
            getSettings(company)
            setColname('')
            setWriteStatus('Add')
            setChangingSettings(false)
        }
    }

    const renderView = () => {
        switch (currentView) {
            case 'employees':
                return (
                    <div className='employee-settings'>
                        <div className='sidebar'>
                            <div className='sidebar-header'>
                                <button className='add-profile-btn' onClick={addProfile}>Add Profile</button>
                            </div>
                            <div className='profile-list'>
                                {profiles.map((profile, index) => (
                                    <div key={index} className={'profile-item ' + (selectedEmployee?.emailid === profile.emailid ? 'profile-item-active':'')} onClick={() => handleProfileSelect(profile)}>
                                        {employees.map((employee)=>{
                                            if (employee.i_d === profile.emailid){
                                                return <>{employee.firstName} {employee.lastName}</>
                                            }
                                        })}
                                        {profile.status === 'admin' && <>Super Admin</>}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className='employee-details'>
                            {selectedEmployee ? (
                                <div className='employee-form'>
                                    <div className='formtitle'>Employee Login and Permissions</div>
                                    <div className='inpcov formpad'>
                                        <div>EmployeeId</div>
                                        <select
                                            className='forminp'
                                            name='email'
                                            type='text'
                                            disabled = {true}
                                            placeholder='Employee ID'
                                            value={loginDetails.email}
                                            onChange={handleLoginDetailsChange}
                                        >
                                            <option value={'admin'}>Admin</option>
                                            {employees.map((employee, index)=>{
                                                return (
                                                    <option key={index} value={employee.i_d}>
                                                        {employee.firstName} {employee.lastName} {`(${employee.i_d})`}
                                                    </option>
                                                )
                                            })}
                                        </select>
                                    </div>
                                    <div className='inpcov formpad'>
                                        <div>Update Password</div>
                                        <input
                                            className='forminp'
                                            name='password'
                                            type='password'
                                            placeholder='Password'
                                            value={loginDetails.password}
                                            onChange={handleLoginDetailsChange}
                                        />
                                    </div>
                                    {DBProfiles.length > 0 && <div className='pass-detail'>
                                        <span
                                            onClick={()=>{
                                                setShowPass(!showPass)
                                            }}
                                        >
                                            {showPass ? 'Hide Password ' : 'View Password '}
                                        </span>
                                        {`${showPass ? (DBProfiles.find((profile=>{return profile.emailid === loginDetails.email}))['password'] || 'loading..') : '************'}`}
                                    </div>}
                                    <div className='inpcov formpad'>
                                        <div>Module Permissions</div>
                                        <div className='permissions'>
                                            {dashList.map((permission, index) => (
                                                <label key={index} className='permission-label'>
                                                    <input
                                                        type='checkbox'
                                                        value={permission}
                                                        checked={loginDetails.permissions.includes(permission) || loginDetails.permissions.includes('all')}
                                                        onChange={handlePermissionsChange}
                                                    />
                                                    <span className='permission-text'>{permission}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div>Sales Posts Permissions</div>
                                        <div className='permissions'>
                                            {['pos_open bar1','pos_open bar2','pos_vip','pos_kitchen'].map((permission, index) => (
                                                <label key={index} className='permission-label'>
                                                    <input
                                                        type='checkbox'
                                                        value={permission}
                                                        checked={loginDetails.permissions.includes(permission) || loginDetails.permissions.includes('all')}
                                                        onChange={handlePermissionsChange}
                                                    />
                                                    <span className='permission-text'>{permission}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div>Delivery Posts Permissions</div>
                                        <div className='permissions'>
                                            {['delivery_open bar1','delivery_open bar2','delivery_vip','delivery_kitchen'].map((permission, index) => (
                                                <label key={index} className='permission-label'>
                                                    <input
                                                        type='checkbox'
                                                        value={permission}
                                                        checked={loginDetails.permissions.includes(permission) || loginDetails.permissions.includes('all')}
                                                        onChange={handlePermissionsChange}
                                                    />
                                                    <span className='permission-text'>{permission}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <br/>
                                        <h4>Other Permissions</h4>
                                        <br/>
                                        <div>Edit / Delete Permissions</div>
                                        <div className='permissions'>
                                            {['edit_employees', 'add_expense_category', 'cancel_pos_order', 'cancel_delivery_order'].map((permission, index) => (
                                                <label key={index} className='permission-label'>
                                                    <input
                                                        type='checkbox'
                                                        value={permission}
                                                        checked={loginDetails.permissions.includes(permission) || loginDetails.permissions.includes('all')}
                                                        onChange={handlePermissionsChange}
                                                    />
                                                    <span className='permission-text'>{permission}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div>POS Admin Permissions</div>
                                        <div className='permissions'>
                                            {['access_pos_sessions', 'access_pos_deliveries'].map((permission, index) => (
                                                <label key={index} className='permission-label'>
                                                    <input
                                                        type='checkbox'
                                                        value={permission}
                                                        checked={loginDetails.permissions.includes(permission) || loginDetails.permissions.includes('all')}
                                                        onChange={handlePermissionsChange}
                                                    />
                                                    <span className='permission-text'>{permission}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div>Allow Backlogs</div>
                                        <div className='permissions'>
                                            {['allowBacklogs'].map((permission, index) => (
                                                <label key={index} className='permission-label'>
                                                    <input
                                                        type='checkbox'
                                                        value={permission}
                                                        checked={loginDetails.permissions.includes(permission) || loginDetails.permissions.includes('all')}
                                                        onChange={handlePermissionsChange}
                                                    />
                                                    <span className='permission-text'>{permission}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div> Import Permissions</div>
                                        <div className='permissions'>
                                            {['imports', 'adjustments'].map((permission, index) => (
                                                <label key={index} className='permission-label'>
                                                    <input
                                                        type='checkbox'
                                                        value={permission}
                                                        checked={loginDetails.permissions.includes(permission) || loginDetails.permissions.includes('all')}
                                                        onChange={handlePermissionsChange}
                                                    />
                                                    <span className='permission-text'>{permission}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div> Stock transfer Permissions</div>
                                        <div className='permissions'>
                                            {['internal_transfer'].map((permission, index) => (
                                                <label key={index} className='permission-label'>
                                                    <input
                                                        type='checkbox'
                                                        value={permission}
                                                        checked={loginDetails.permissions.includes(permission) || loginDetails.permissions.includes('all')}
                                                        onChange={handlePermissionsChange}
                                                    />
                                                    <span className='permission-text'>{permission}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className='inpcov formpad'>
                                        <div>Enable Login Access</div>
                                        <label className='toggle-switch'>
                                            <input
                                                type='checkbox'
                                                name='enableLogin'
                                                checked={loginDetails.enableLogin}
                                                onChange={handleLoginDetailsChange}
                                            />
                                            <span className='slider'></span>
                                        </label>
                                    </div>
                                    <div className='inpcov formpad'>
                                        <div>Enable Debt Recovery</div>
                                        <label className='toggle-switch'>
                                            <input
                                                type='checkbox'
                                                name='enableDebtRecovery'
                                                checked={loginDetails.enableDebtRecovery}
                                                onChange={handleLoginDetailsChange}
                                            />
                                            <span className='slider'></span>
                                        </label>
                                    </div>
                                    <div style={{display:'flex'}}>
                                        {selectedEmployee.access!=='admin' && <div className='savebtn' onClick={saveLoginDetails}>Save</div>}
                                        {selectedEmployee.status!=='admin' && <div className='deletebtn' onClick={deleteProfile}>Delete</div>}
                                    </div>
                                </div>
                            ) : (
                                <div className='employee-form'>
                                    <div className='formtitle'>Add New Employee</div>
                                    <div className='inpcov formpad'>
                                        <div>EmployeeId</div>
                                        <select
                                            className='forminp'
                                            name='email'
                                            type='text'
                                            placeholder='Employee ID'
                                            value={loginDetails.email}
                                            onChange={handleLoginDetailsChange}
                                        >
                                            <option value={''}>Select Employee</option>
                                            {employees.map((employee, index)=>{
                                                if (!currentProfiles.includes(employee.i_d) && !employee.dismissalDate){
                                                    return (
                                                        <option key={index} value={employee.i_d}>
                                                            {employee.firstName} {employee.lastName} {`(${employee.i_d})`}
                                                        </option>
                                                    )
                                                }
                                            })}
                                        </select>
                                    </div>
                                    <div className='inpcov formpad'>
                                        <div>New Password</div>
                                        <input
                                            className='forminp'
                                            name='password'
                                            type='password'
                                            placeholder='Password'
                                            value={loginDetails.password}
                                            onChange={handleLoginDetailsChange}
                                        />
                                    </div>
                                    <div className='inpcov formpad'>
                                        <div>Module Permissions</div>
                                        <div className='permissions'>
                                            {dashList.map((permission, index) => (
                                                <label key={index} className='permission-label'>
                                                    <input
                                                        type='checkbox'
                                                        value={permission}
                                                        checked={loginDetails.permissions.includes(permission)}
                                                        onChange={handlePermissionsChange}
                                                    />
                                                    <span className='permission-text'>{permission}</span>
                                                </label>
                                            ))}
                                        </div>                                        
                                    </div>
                                    <div className='inpcov formpad'>
                                        <div>Enable Login Access</div>
                                        <label className='toggle-switch'>
                                            <input
                                                type='checkbox'
                                                name='enableLogin'
                                                checked={loginDetails.enableLogin}
                                                onChange={handleLoginDetailsChange}
                                            />
                                            <span className='slider'></span>
                                        </label>
                                    </div>
                                    <div className='inpcov formpad'>
                                        <div>Enable Debt Recovery</div>
                                        <label className='toggle-switch'>
                                            <input
                                                type='checkbox'
                                                name='enableDebtRecovery'
                                                checked={loginDetails.enableDebtRecovery}
                                                onChange={handleLoginDetailsChange}
                                            />
                                            <span className='slider'></span>
                                        </label>
                                    </div>
                                    <div className='savebtn' onClick={saveLoginDetails}>Save</div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            case 'payroll':
                return (
                    <div className='payroll-settings'>
                        <div className='formtitle'>Payroll Settings</div>
                        <div className='inpcov formpad'>
                            <div>Column Name</div>
                            <div className='addsection'>
                                <input
                                    className='forminp'
                                    name='colname'
                                    type='text'
                                    placeholder={`${writeStatus} Import Column`}
                                    value={colname}
                                    onChange={(e) => setColname(e.target.value)}
                                />
                                <div className='addcolumn' onClick={addColumn}>{writeStatus}</div>
                                {writeStatus === 'Edit' && <div className='addcolumn dcol' onClick={() => {
                                    setEditCol(null)
                                    setColname('')
                                    setWriteStatus('Add')
                                }}>Discard</div>}
                            </div>
                        </div>
                        <div className='columnsbox'>
                            {colSettings.import_columns?.map((col, id) => (
                                <div className='col' key={id} name={id} onClick={() => {
                                    setWriteStatus('Edit')
                                    setColname(col)
                                    setEditCol(col)
                                }}>
                                    {col}
                                    <div className='delcol' name={id} onClick={delColumn}>X</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            case 'sales':
                return (
                    <div className='sales-settings'>
                        <div className='formtitle'>Sales Settings</div>
                        {/* Add sales settings form here */}
                    </div>
                )
            default:
                return null
        }
    }
    
    
    return (
        <div className='settings' onClick={handleSecretAccess}>
            <input
                className='saccess1'
                name = 'access'
                value={accessValue}                           
                onChange={handleSecretAccess}  
                autoComplete={false}
                disabled={accessValue === magicWord || accessValue === activationWord}       
            />
            {saveStatus && <div className='save-status'>{saveStatus}</div>}
            <div className='settings-nav'>
                <div className={`settings-nav-item ${currentView === 'employees' ? 'active' : ''}`} onClick={() => setCurrentView('employees')}>Employees</div>
                <div className={`settings-nav-item ${currentView === 'payroll' ? 'active' : ''}`} onClick={() => setCurrentView('payroll')}>Payroll</div>
                <div className={`settings-nav-item ${currentView === 'sales' ? 'active' : ''}`} onClick={() => setCurrentView('sales')}>Sales</div>
            </div>
            {renderView()}
        </div>
    )
}

export default Settings


/** 
* Paste one or more documents here
*/
// {
//     "_id": {
//       "$oid": "67f85d4d68ace6c4be01a91f"
//     },
//     "g/l code": 50001,
//     "begin-code": 50001,
//     "name": "Expenses",
//     "end-code": 60000,
//     "header-type": "header",
//     "accounts":[
//       {
//         "header-code": 50001,
//         "g/l code": 50002,
//         "begin-code": 50002,
//         "name":"IT Expenses",
//         "end-code": 51000,
//         "header-type": "sub-header"
//       },
//       {
//         "header-code": 50001,
//         "g/l code": 51001,
//         "begin-code": 51001,
//         "name":"Admin Expenses",
//         "end-code": 52000,
//         "header-type": "sub-header"
//       },
//       {
//         "header-code": 50001,
//         "g/l code": 52001,
//         "begin-code": 52001,
//         "name":"Maintenance Expenses",
//         "end-code": 53000,
//         "header-type": "sub-header"
//       },
//       {
//         "header-code": 50001,
//         "g/l code": 53001,
//         "begin-code": 53001,
//         "name":"Hotel&Travels Expenses",
//         "end-code": 54000,
//         "header-type": "sub-header"
//       },
//       {
//         "header-code": 50001,
//         "g/l code": 54001,
//         "begin-code": 54001,
//         "name":"Salary and Wages",
//         "end-code": 55000,
//         "header-type": "sub-header"
//       },
//       {
//         "header-code": 50001,
//         "g/l code": 55001,
//         "begin-code": 55001,
//         "name":"Other Expenses",
//         "end-code": 56000,
//         "header-type": "sub-header"
//       },
//         {
//         "header-code": 50001,
//         "sub-header-code": 50002,
//         "g/l code": 50020,
//         "name": "MTN Subscription",
//         "type": ""
//       },
//           {
//         "header-code": 50001,
//         "sub-header-code": 50002,
//         "g/l code": 50030,
//         "name": "Computer Maintenance",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 51001,
//         "g/l code": 51020,
//         "name": "Diesel & Lubricant",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 51001,
//         "g/l code": 51030,
//         "name": "Printing and Stationery",
//         "type": ""
//       },
//           {
//         "header-code": 50001,
//         "sub-header-code": 51001,
//         "g/l code": 51040,
//         "name": "NEPA",
//         "type": ""
//       },
//           {
//         "header-code": 50001,
//         "sub-header-code": 51001,
//         "g/l code": 51050,
//         "name": "DSTV Subscription",
//         "type": ""
//       },
//           {
//         "header-code": 50001,
//         "sub-header-code": 51001,
//         "g/l code": 51060,
//         "name": "Telephone Subscription",
//         "type": ""
//       },
//           {
//         "header-code": 50001,
//         "sub-header-code": 51001,
//         "g/l code": 51070,
//         "name": "Fitting & Lighting",
//         "type": ""
//       },
//           {
//         "header-code": 50001,
//         "sub-header-code": 51001,
//         "g/l code": 51080,
//         "name": "Sewage Evacuation",
//         "type": ""
//       },
//           {
//         "header-code": 50001,
//         "sub-header-code": 51001,
//         "g/l code": 51090,
//         "name": "Sanitation & Waste",
//         "type": ""
//       },
//           {
//         "header-code": 50001,
//         "sub-header-code": 51001,
//         "g/l code": 51100,
//         "name": "Cooking gas",
//         "type": ""
//       },
//           {
//         "header-code": 50001,
//         "sub-header-code": 51001,
//         "g/l code": 51110,
//         "name": "Staff Uniform",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 51001,
//         "g/l code": 51120,
//         "name": "First Aid",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 52001,
//         "g/l code": 52020,
//         "name": "Electrical Repairs",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 52001,
//         "g/l code": 52030,
//         "name": "Plumbing Repairs",
//         "type": ""
//       }, 
//       {
//         "header-code": 50001,
//         "sub-header-code": 52001,
//         "g/l code": 52040,
//         "name": "Generator Repairs",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 52001,
//         "g/l code": 52050,
//         "name": "Refrigerator Repairs",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 52001,
//         "g/l code": 52060,
//         "name": "General Maintenance",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 52001,
//         "g/l code": 52070,
//         "name": "Furniture Maintenance",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 52001,
//         "g/l code": 52080,
//         "name": "Building Maintenance",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 52001,
//         "g/l code": 52090,
//         "name": "CCTV Maintenance",
//         "type": ""
//       },
//           {
//         "header-code": 50001,
//         "sub-header-code": 52001,
//         "g/l code": 52100,
//         "name": "Musical Expenses",
//         "type": ""
//       },
//           {
//         "header-code": 50001,
//         "sub-header-code": 53001,
//         "g/l code": 53020,
//         "name": "Transport",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 54001,
//         "g/l code": 54020,
//         "name": "Staff Salary",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 54001,
//         "g/l code": 54030,
//         "name": "Security Salary",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 54001,
//         "g/l code": 54040,
//         "name": "Staff Welfare",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 54001,
//         "g/l code": 54050,
//         "name": "Adhoc Staff",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 54001,
//         "g/l code": 54060,
//         "name": "Salary & Wages",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 54001,
//         "g/l code": 54070,
//         "name": "Medical",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 54001,
//         "g/l code": 54080,
//         "name": "Hiring",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 54001,
//         "g/l code": 54090,
//         "name": "Laundry Services",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 55001,
//         "g/l code": 55020,
//         "name": "Other Expenses",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 55001,
//         "g/l code": 55030,
//         "name": "Entertainment",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 55001,
//         "g/l code": 55040,
//         "name": "Donation",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 55001,
//         "g/l code": 55050,
//         "name": "Director Remuneration",
//         "type": ""
//       },
//       {
//         "header-code": 50001,
//         "sub-header-code": 55001,
//         "g/l code": 55060,
//         "name": "PR",
//         "type": ""
//       }   
//       ]
//   }