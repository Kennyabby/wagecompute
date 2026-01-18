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
    const [uoms, setUoms] = useState([])
    const [categories, setCategories] = useState([])
    const [wrhs, setWrhs] = useState([])
    const [paymentMethods, setPaymentMethods] = useState([])
    const [posSettings, setPosSettings] = useState([])
    const [settingGroups, setSettingGroups] = useState([])
    const [selectedCategories, setSelectedCategories] = useState([])
    const [selectedPaymentMethods, setSelectedPaymentMethods] = useState([])
    const [selectedEmployee, setSelectedEmployee] = useState(null)
    const [currentSetting, setCurrentSetting] = useState(null)
    const [propState, setPropState] = useState('new')
    const [curPropSet, setCurPropSet] = useState(null)
    const [currentProfiles, setCurrentProfiles] = useState([])
    const [deleteCount, setDeleteCount] = useState(0)
    const [accessValue, setAccessValue] = useState('')
    const magicWord = 'oh ye server. deny all '
    const activationWord = 'oh ye server. allow all into your world '
    
    const defaultWarehouse = {
        name: '',
        purchase: false,
        productCategories: [],
        paymentMethods: []
    }
    const defaultUom = {
        code: '',
        name: '',
        base: '',
        multiple: '',
        type: ''
    }
    const defaultCategories = {
        name: '',
        code: '',
        type: ''
    }
    const defaultPaymentMethods = {
        i_d: '',
        name: '',
        type: '',
        account: ''
    }
    const defaultPosSettings = {
        name: '',
        type: '',
        size: '',
        capacity: '',
        active: false,
        sessHour: ''
    }
    const [loginDetails, setLoginDetails] = useState({
        email: '',
        password: '',
        permissions: [],
        enableLogin: false,
        enableDebtRecovery: false
    })

    const [sessionPeriods, setSessionPeriods] = useState([])
    const modulePermissions = [
        ...dashList
    ]
    const [salesPostsPermissions, setSalesPostsPermissions] = useState([])
    const [deliveryPostsPermissions, setDeliveryPostsPermissions] = useState([])
    const [posAdminPermissions, setPosAdminPermissions] = useState([])
    const editDeletePermissions = [
        'edit_employees', 'enable_employee_debt_recovery', 'edit_product_details', 
        'add_expense_category', 'edit_pos_order', 'cancel_pos_order', 'override_pos_receipts', 
        'edit_payment_receipts', 'cancel_delivery_order', 'override_accomodation', 
        'view_all_accommodation', 'allow_group_payment'
    ]
    const postingPermissions = [
        'allowBacklogs', 'allow_sales_posts', 'allow_add_sales_products', 
        'allow_recovery_posts', 'allow_rental_posts' , 'allow_accommodation_posts', 
        'allow_purchase_posts', 'allow_expense_posts', 'allow_payment_posts'
    ]
    const approvalPermissions = [
        'approve_postsales','approve_postaddSalesProduct','approve_postrentals',
        'approve_postrecovery','approve_postaccommodation', 'approve_postpurchase', 
        'approve_postexpense', 'approve_postpayment'
    
    ]
    const importExportPermissions = [
        'imports', 'export_inventory_report', 'export_sales_report', 
        'export_pos_report', 'export_purchase_report', 'export_expense_report', 
        'adjustments'
    ]
    const stockTransferPermissions = [
        'internal_transfer'
    ]
    useEffect(() => {
        storePath('settings')
    }, [storePath])

    useEffect(()=>{
        if (settings.length){  
            const groups = settings.filter((setting)=>{
                if (setting.name){
                    switch (setting.name) {
                        case 'uom':
                            setting.desc = 'Product UOM'
                            setting.prop = 'mearsures'
                            return setting.desc
                        case 'product_categories':
                            setting.desc = 'Product Categories'
                            setting.prop = 'categories'
                            return setting.desc
                        case 'warehouses':
                            setting.desc = 'Warehouses'
                            setting.prop = 'warehouses'
                            setCurPropSet(defaultWarehouse)
                            setCurrentSetting(setting)
                            return setting.desc
                        case 'paymentMethods': 
                            setting.desc = 'Payment Methods'
                            setting.prop = 'paymentMethods'
                            return setting.desc
                        case 'posSettings':
                            setting.desc = 'POS Settings'
                            setting.prop = 'posSettings'
                        default:                            
                            return setting.desc
                    }                
                }
            })
            setSettingGroups(groups)

            const uomSetFilt = settings.filter((setting)=>{
                return setting.name === 'uom'
            })
            delete uomSetFilt[0]?._id
            setUoms(uomSetFilt[0]?.name?[...uomSetFilt[0].mearsures]:[])

            const catSetFilt = settings.filter(setting => setting.name === 'product_categories');
            delete catSetFilt[0]?._id;
            setCategories(catSetFilt[0]?.name ? [...catSetFilt[0].categories] : []);

            const wrhSetFilt = settings.filter((setting)=>{
                return setting.name === 'warehouses'
            })
            delete wrhSetFilt[0]?._id
            setWrhs(wrhSetFilt[0]?.name ? [...wrhSetFilt[0].warehouses] : [])
            
            const paySetFilt = settings.filter((setting)=>{
                return setting.name === 'paymentMethods'
            })
            delete paySetFilt[0]?._id
            setPaymentMethods(paySetFilt[0]?.name ? [...paySetFilt[0].paymentMethods] : [])
            
            const posSetFilt = settings.filter((setting)=>{
                return setting.name === 'posSettings'
            })
            delete posSetFilt[0]?._id
            setPosSettings(posSetFilt[0]?.name ? [...posSetFilt[0].posSettings] : [])
        }  
    },[settings])

    useEffect(()=>{
        let salesPostsPerms = []
        let deliveryPostsPerms = []
        let overridePerms = []
        if (wrhs.length){
            wrhs.forEach((wrh)=>{
                salesPostsPerms.push(`pos_${wrh.name}`)
                deliveryPostsPerms.push(`delivery_${wrh.name}`)
                overridePerms.push(`override_${wrh.name}`)
            })
        }
        setSalesPostsPermissions(salesPostsPerms)
        setDeliveryPostsPermissions(deliveryPostsPerms)
        setPosAdminPermissions([
            'access_pos_sessions', 'access_pos_deliveries', 'make_pos_agent', 'make_delivery_agent', 'reconcile_inventory',
            'edit_ended_sessions', ...overridePerms])
    },[wrhs])

    useEffect(() => {
        const periods = []
        for (let i=0 ; i<24; i++){
            const hour = `${i}`
            periods.push(hour)
        }
        setSessionPeriods(periods)

        const cmp_val = window.localStorage.getItem('sessn-cmp')
        if (cmp_val) {
            getSettings(cmp_val, companyRecord)
            getEmployees(cmp_val, companyRecord)
            fetchProfiles(cmp_val, companyRecord)
            fetchDBProfiles(cmp_val, companyRecord)
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

    const resetToDefault = (setting) => {
        setPropState('new')
        setSelectedCategories([])
        setSelectedPaymentMethods([])
        setCurPropSet(null)
        switch (setting.name) {
            case 'warehouses':                                
                setCurPropSet(defaultWarehouse)
                break
            case 'uom':
                setCurPropSet({...defaultUom})
                break
            case 'product_categories':
                setCurPropSet(defaultCategories)
                break
            case 'paymentMethods':
                setCurPropSet(defaultPaymentMethods)
                break
            case 'posSettings':
                setCurPropSet(defaultPosSettings)
        }
    }
    const handleSettingSelect = (setting) => {
        resetToDefault(setting)
        if (currentSetting?.name !== setting.name){
            setCurrentSetting(setting)
        }
    }
    const handlePropSetChange = (e) => {
        const {name, type, value, checked} = e.target
        setCurPropSet((curPropSet)=>{
            return {...curPropSet, [name]: type === 'checkbox' ? checked : value}
        })
    }

    const saveSettings = async () => {
        setSaveStatus('Saving...')
        switch (currentSetting.name) {
            case 'warehouses':
                if (propState === 'new') {
                    const newWarehouse = {
                        ...curPropSet,
                        productCategories: selectedCategories,
                        paymentMethods: selectedPaymentMethods
                    }
                    const resps = await fetchServer("POST", {
                        database: company,
                        collection: "Settings",
                        prop: [{name: 'warehouses'}, {
                            ...currentSetting,
                            warehouses: [...wrhs, newWarehouse]
                        }]
                    }, "updateOneDoc", server)
                    if (resps.err) {
                        console.log(resps.mess)
                    } else {
                        getSettings(company, companyRecord)
                    }
                } else {
                    const updatedWarehouses = wrhs.map((wrh) => {
                        if (wrh.name === curPropSet.name) {
                            return {
                                ...curPropSet,
                                productCategories: selectedCategories,
                                paymentMethods: selectedPaymentMethods
                            }
                        }
                        return wrh
                    })
                    const resps = await fetchServer("POST", {
                        database: company,
                        collection: "Settings",
                        prop: [{ name: 'warehouses' }, { ...currentSetting, warehouses: updatedWarehouses }]
                    }, "updateOneDoc", server)
                    if (resps.err) {
                        console.log(resps.mess)                        
                        setSaveStatus('Error Saving Settings')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    } else {
                        getSettings(company, companyRecord)                        
                        setSaveStatus('Saved')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    }
                }
                break
            case 'uom':
                if (propState === 'new') {
                    const resps = await fetchServer("POST", {
                        database: company,
                        collection: "Settings",
                        prop: [{ name: 'uom' }, { ...currentSetting, mearsures: [...uoms, curPropSet] }]
                    }, "updateOneDoc", server)
                    if (resps.err) {
                        console.log(resps.mess)                        
                        setSaveStatus('Error Saving Settings')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    } else {
                        getSettings(company, companyRecord)                        
                        setSaveStatus('Saved')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    }
                } else {
                    const updatedUoms = uoms.map((uom) => {
                        if (uom.code === curPropSet.code) {
                            return curPropSet
                        }
                        return uom
                    }) 
                    const resps = await fetchServer("POST", {
                        database: company,
                        collection: "Settings",
                        prop: [{ name: 'uom' }, { ...currentSetting, mearsures: updatedUoms }]
                    }, "updateOneDoc", server)
                    if (resps.err) {
                        console.log(resps.mess)                        
                        setSaveStatus('Error Saving Settings')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    } else {
                        getSettings(company, companyRecord)                        
                        setSaveStatus('Saved')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    }
                }
                break
            case 'product_categories':
                if (propState === 'new') {
                    const resps = await fetchServer("POST", {
                        database: company,
                        collection: "Settings",
                        prop: [{ name: 'product_categories' }, { ...currentSetting, categories: [...categories, curPropSet] }]
                    }, "updateOneDoc", server)
                    if (resps.err) {
                        console.log(resps.mess)                        
                        setSaveStatus('Error Saving Settings')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    } else {
                        getSettings(company, companyRecord)                        
                        setSaveStatus('Saved')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    }
                } else {
                    const updatedCategories = categories.map((category) => {
                        if (category.code === curPropSet.code) {
                            return curPropSet
                        }
                        return category
                    })
                    const resps = await fetchServer("POST", {
                        database: company,
                        collection: "Settings",
                        prop: [{ name: 'product_categories' }, { ...currentSetting, categories: updatedCategories }]
                    }, "updateOneDoc", server)
                    if (resps.err) {
                        console.log(resps.mess)                        
                        setSaveStatus('Error Saving Settings')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    } else {
                        getSettings(company, companyRecord)                        
                        setSaveStatus('Saved')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    }
                }
                break
            case 'paymentMethods':
                if (propState === 'new') {
                    const resps = await fetchServer("POST", {
                        database: company,
                        collection: "Settings",
                        prop: [{ name: 'paymentMethods' }, { ...currentSetting, paymentMethods: [...paymentMethods, curPropSet] }]    
                    }, "updateOneDoc", server)
                    if (resps.err) {
                        console.log(resps.mess)                        
                        setSaveStatus('Error Saving Settings')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    } else {
                        getSettings(company, companyRecord)                        
                        setSaveStatus('Saved')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    }
                } else {
                    const updatedPaymentMethods = paymentMethods.map((method) => {
                        if (method.i_d === curPropSet.i_d) {
                            return curPropSet
                        }
                        return method
                    })
                    const resps = await fetchServer("POST", {
                        database: company,
                        collection: "Settings",
                        prop: [{ name: 'paymentMethods' }, { ...currentSetting, paymentMethods: updatedPaymentMethods }]
                    }, "updateOneDoc", server)
                    if (resps.err) {
                        console.log(resps.mess)                        
                        setSaveStatus('Error Saving Settings')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    } else {
                        getSettings(company, companyRecord)                        
                        setSaveStatus('Saved')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    }
                }
                break 
            case "posSetting":
                if (propState === 'view'){
                    const updatedPosSetting = posSettings.map((pos) => {
                        if (pos.name === curPropSet.name) {
                            return curPropSet
                        }
                        return pos
                    })
                    const resps = await fetchServer("POST", {
                        database: company,
                        collection: "Settings",
                        prop: [{ name: 'posSettings' }, { ...currentSetting, posSettings: updatedPosSetting}]
                    }, "updateOneDoc", server)
                    if (resps.err) {
                        console.log(resps.mess)                        
                        setSaveStatus('Error Saving Settings')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    } else {
                        getSettings(company, companyRecord)                        
                        setSaveStatus('Saved')
                        setTimeout(()=>{
                            setSaveStatus('')
                        },3000)
                    }
                }    
                break 
        }
    }

    const deleteSettingsProp = async () => {
        setSaveStatus('Removing...')
        switch (currentSetting.name) {
            case 'warehouses':
                const filteredWarehouses = wrhs.filter((wrh) => wrh.name !== curPropSet.name)
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Settings",
                    prop: [{ name: 'warehouses' }, { ...currentSetting, warehouses: filteredWarehouses }]
                }, "updateOneDoc", server)
                if (resps.err) {
                    console.log(resps.mess)                        
                    setSaveStatus('Error Deleting Settings')
                    setTimeout(()=>{
                        setSaveStatus('')
                    },3000)
                } else {
                    getSettings(company, companyRecord)                        
                    setSaveStatus('Deleted')
                    setTimeout(()=>{
                        setSaveStatus('')
                    },3000)
                }
                break
            case 'uom':
                const filteredUoms = uoms.filter((uom) => uom.code !== curPropSet.code)
                const resps1 = await fetchServer("POST", {
                    database: company,
                    collection: "Settings",
                    prop: [{ name: 'uom' }, { ...currentSetting, mearsures: filteredUoms }]
                }, "updateOneDoc", server)
                if (resps1.err) {
                    console.log(resps1.mess)                        
                    setSaveStatus('Error Deleting Settings')
                    setTimeout(()=>{
                        setSaveStatus('')
                    },3000)
                } else {
                    getSettings(company, companyRecord)                        
                    setSaveStatus('Deleted')
                    setTimeout(()=>{
                        setSaveStatus('')
                    },3000)
                }
                break
            case 'product_categories':
                const filteredCategories = categories.filter((category) => category.code !== curPropSet.code)
                const resps2 = await fetchServer("POST", {
                    database: company,
                    collection: "Settings",
                    prop: [{ name: 'product_categories' }, { ...currentSetting, categories: filteredCategories }]
                }, "updateOneDoc", server)
                if (resps2.err) {
                    console.log(resps2.mess)                        
                    setSaveStatus('Error Deleting Settings')
                    setTimeout(()=>{
                        setSaveStatus('')
                    },3000)
                } else {
                    getSettings(company, companyRecord)                        
                    setSaveStatus('Deleted')
                    setTimeout(()=>{
                        setSaveStatus('')
                    },3000)
                }
                break
            case 'paymentMethods':
                const filteredPaymentMethods = paymentMethods.filter((method) => method.i_d !== curPropSet.i_d)
                const resps3 = await fetchServer("POST", {
                    database: company,
                    collection: "Settings",
                    prop: [{ name: 'paymentMethods' }, { ...currentSetting, paymentMethods: filteredPaymentMethods }]
                }, "updateOneDoc", server)
                if (resps3.err) {
                    console.log(resps3.mess)                        
                    setSaveStatus('Error Deleting Settings')
                    setTimeout(()=>{
                        setSaveStatus('')
                    },3000)
                } else {
                    getSettings(company, companyRecord)                        
                    setSaveStatus('Deleted')
                    setTimeout(()=>{
                        setSaveStatus('')
                    },3000)
                }
                break
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
                    status: 'user',
                    access:'user'
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
                    getSettings(company, companyRecord)
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
                    getSettings(company, companyRecord)
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
            getSettings(company, companyRecord)
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
                                            {modulePermissions.map((permission, index) => (
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
                                            {salesPostsPermissions.map((permission, index) => (
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
                                            {deliveryPostsPermissions.map((permission, index) => (
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
                                            {editDeletePermissions.map((permission, index) => (
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
                                            {posAdminPermissions.map((permission, index) => (
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
                                        <div>Posting Permissions</div>
                                        <div className='permissions'>
                                            {postingPermissions.map((permission, index) => (
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
                                        <div>Approval Permissions</div>
                                        <div className='permissions'>
                                            {approvalPermissions.map((permission, index) => (
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
                                        <div> Import/Export Permissions</div>
                                        <div className='permissions'>
                                            {importExportPermissions.map((permission, index) => (
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
                                            {stockTransferPermissions.map((permission, index) => (
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
            case 'general':
                return (
                    <div className='general-settings'>
                        <div className='sidebar'>
                            <div className='formtitle'>General Settings</div>
                            <div className='profile-list'>
                                {settingGroups.map((setting, index) => (
                                    <div key={index} className={'profile-item ' + (currentSetting?.name === setting.name ? 'profile-item-active':'')} onClick={() => handleSettingSelect(setting)}>
                                        {setting.desc}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className='general-details'>
                            {currentSetting[currentSetting.prop]?.length ? <div className='general-body'>
                                {!['posSettings'].includes(currentSetting.name) && <div 
                                    className='general-propSet-add' 
                                    onClick={()=>{resetToDefault(currentSetting)}}
                                >Add +</div>}
                                {currentSetting[currentSetting.prop].map((propSet, id)=>{
                                    return <div 
                                        className= {`general-propSet ${curPropSet?.name === propSet.name ? 'active-propSet':''}`}
                                        key={id}
                                        onClick={()=>{
                                            if (currentSetting.name==='warehouses'){
                                                setSelectedCategories(propSet.productCategories || [])
                                                setSelectedPaymentMethods(propSet.paymentMethods || [])
                                            }
                                            setPropState('view')                                            
                                            setCurPropSet(propSet)
                                        }}
                                    >{propSet.name}</div>
                                })}
                            </div> 
                            : <div>
                                'No settings available for this group.'
                            </div>}
                            {<div>
                                {['paymentMethods'].includes(currentSetting.name) && <div className='inpcov formpad'>
                                    <label>ID</label>
                                    <input
                                        className='forminp'
                                        name='i_d'
                                        placeholder={`Enter Id`}
                                        value={curPropSet?.i_d}
                                        onChange={handlePropSetChange}
                                    />
                                </div>}
                                {['uom','product_categories',''].includes(currentSetting.name) && <div className='inpcov formpad'>
                                    <label>Code</label>
                                    <input
                                        className='forminp'
                                        name='code'
                                        placeholder={`Enter Code`}
                                        value={curPropSet?.code}
                                        onChange={handlePropSetChange}
                                    />
                                </div>}
                                <div className='inpcov formpad'>
                                    <label>Name</label>
                                    <input
                                        className='forminp'
                                        name='name'
                                        placeholder={`Enter Name`}
                                        value={curPropSet.name}
                                        onChange={handlePropSetChange}
                                    />
                                </div>
                                {['warehouses'].includes(currentSetting.name) && <div className='inpcov formpad'>
                                    <div>Purchase Location</div>
                                    <label className='toggle-switch'>
                                        <input
                                            type='checkbox'
                                            name='purchase'
                                            checked={curPropSet.purchase}
                                            onChange={handlePropSetChange}
                                        />
                                        <span className='slider'></span>
                                    </label>
                                </div>}
                                {['posSettings'].includes(currentSetting.name) && <div className='inpcov formpad'>
                                    <div>Active</div>
                                    <label className='toggle-switch'>
                                        <input
                                            type='checkbox'
                                            name='active'
                                            checked={curPropSet.active}
                                            onChange={handlePropSetChange}
                                        />
                                        <span className='slider'></span>
                                    </label>
                                </div>}
                                {['warehouses'].includes(currentSetting.name) && <>
                                    <div> Product Categories</div>
                                    <div className='permissions'>
                                        {categories.map((cat, index) => (
                                            <label key={index}  className='permission-label'>
                                                <input
                                                    type='checkbox'
                                                    value={cat.code}
                                                    name='productCategories'
                                                    checked={selectedCategories.includes(cat.code)}
                                                    onChange={()=>{setSelectedCategories((prev)=>{
                                                        if (prev.includes(cat.code)){
                                                            return prev.filter((c)=>c!==cat.code)
                                                        } else {
                                                            return [...prev, cat.code]
                                                        }
                                                    })}}
                                                />
                                                <span className='permission-text'>{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </>}
                                {['warehouses'].includes(currentSetting.name) && <>
                                    <div> Payment Methods</div>
                                    <div className='permissions'>
                                        {paymentMethods.map((pay, index) => (
                                            <label key={index} className='permission-label'>
                                                <input
                                                    type='checkbox'
                                                    name='paymentMethods'
                                                    value={pay.name}
                                                    checked={selectedPaymentMethods.includes(pay.name)}
                                                    onChange={()=>{setSelectedPaymentMethods((prev)=>{
                                                        if (prev.includes(pay.name)){
                                                            return prev.filter((p)=>p!==pay.name)
                                                        } else {
                                                            return [...prev, pay.name]
                                                        }
                                                    })}}
                                                />
                                                <span className='permission-text'>{pay.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </>}
                                {['uom'].includes(currentSetting.name) && <div className='inpcov formpad'>
                                    <label>Base</label>
                                    <select
                                        className='forminp'
                                        name='base'
                                        placeholder={`Select Base`}
                                        value={curPropSet.base}
                                        onChange={handlePropSetChange}
                                    >
                                        <option value={''}>Select Base</option>
                                        {currentSetting?.bases?.map((base, index)=>{
                                            return (
                                                <option key={index} value={base}>
                                                    {base}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>}
                                {['uom'].includes(currentSetting.name) && <div className='inpcov formpad'>
                                    <label>Multiple</label>
                                    <input
                                        className='forminp'
                                        name='multiple'                                        
                                        placeholder={`Enter Name`}
                                        value={curPropSet.multiple}
                                        onChange={handlePropSetChange}
                                    />
                                </div>}
                                {['uom','product_categories','paymentMethods','posSettings'].includes(currentSetting.name) && <div className='inpcov formpad'>
                                    <label>Type</label>
                                    <select
                                        className='forminp'
                                        name='type'
                                        placeholder={`Select Type`}
                                        value={curPropSet.type}
                                        onChange={handlePropSetChange}
                                    >
                                        <option value={''}>Select Type</option>
                                        {currentSetting?.types?.map((type, index)=>{
                                            return (
                                                <option key={index} value={type}>
                                                    {type}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>}
                                {['paymentMethods'].includes(currentSetting.name) && <div className='inpcov formpad'>
                                    <label>Account</label>
                                    <input
                                        className='forminp'
                                        name='account'                                        
                                        placeholder={`Enter Account No`}
                                        value={curPropSet.account}
                                        onChange={handlePropSetChange}
                                    />
                                </div>}
                                {['posSettings'].includes(currentSetting.name) && <div className='inpcov formpad'>
                                    <label>Size</label>
                                    <input
                                        className='forminp'
                                        name='size'
                                        type='number'                                        
                                        placeholder={`Enter Size`}
                                        value={curPropSet.size}
                                        onChange={handlePropSetChange}
                                    />
                                </div>}
                                {['posSettings'].includes(currentSetting.name) && <div className='inpcov formpad'>
                                    <label>Capacity</label>
                                    <input
                                        className='forminp'
                                        name='capacity'  
                                        type='number'                                      
                                        placeholder={`Enter Capacity`}
                                        value={curPropSet.capacity}
                                        onChange={handlePropSetChange}
                                    />
                                </div>}
                                {['posSettings'].includes(currentSetting.name) && <div className='inpcov formpad'>
                                    <label>Session-End Hour (Automatic)</label>
                                    <select
                                        className='forminp'
                                        name='sessHour'                                      
                                        placeholder={`Select Session-End Hour`}
                                        value={curPropSet.sessHour}
                                        onChange={handlePropSetChange}
                                    >
                                        <option>Select Session-End Hour</option>
                                        {sessionPeriods.map((hour, id)=>{
                                            return <option key={id} value={hour}>{hour}</option>
                                        })}
                                    </select>
                                </div>}
                                {<div style={{display:'flex'}}>
                                    {<div className='savebtn' onClick={saveSettings}>Save</div>}
                                    {companyRecord?.access==='admin' && propState!=='new' && <div className='deletebtn' onClick={deleteSettingsProp}>Delete</div>}
                                </div>}
                                {/* {settingGroups.map((set)=>{
                                    if (currentSetting?.name === set.name){
                                        return (
                                            <div>
                                                
                                            </div>
                                        )
                                    }
                                    })} */}
                            </div>}
                        </div>
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
                <div className={`settings-nav-item ${currentView === 'general' ? 'active' : ''}`} onClick={() => setCurrentView('general')}>General</div>
                <div className={`settings-nav-item ${currentView === 'payroll' ? 'active' : ''}`} onClick={() => setCurrentView('payroll')}>Payroll</div>
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