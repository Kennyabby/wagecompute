import './Settings.css'
import { useEffect, useState, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { motion, AnimatePresence } from 'framer-motion'
import { IoSettings, IoPerson, IoCard, IoOptions, IoAdd, IoTrash, IoSave, IoEye, IoEyeOff } from 'react-icons/io5'
import BillingSettingsPanel from './BillingSettingsPanel'
import { uploadCompanyFile } from '../../Resources/ClientServerAPIConn/API/fileCrudApi'
import heic2any from 'heic2any'

// Mirrors the server default in wageserver/UserModule/SettingsModule/settings.js
// so the UI doesn't flash a "disabled" state before the real doc loads.
const DEFAULT_POS_RECONCILIATION_CONFIG = {
    name: 'posReconciliation',
    desc: 'POS Reconciliation',
    enabled: true,
    locations: ['bar1', 'vip', 'kitchen'],
}

const DEFAULT_APPROVAL_CONFIG = {
    name: 'approvalConfig',
    desc: 'Approval Configuration',
    modules: {
        sales: { finalLevel: 1, type: 'rank', approverIds: { 'emailid': { rank: 1, sections: ['all'] }} },
        accommodation: { finalLevel: 1, type: 'rank', approverIds: { 'emailid': { rank: 1, sections: ['all'] }} },
        purchase: { finalLevel: 1, type: 'rank', approverIds: { 'emailid': { rank: 1, sections: ['all'] }} },
        expense: { finalLevel: 1, type: 'rank', approverIds: { 'emailid': { rank: 1, sections: ['all'] }} },
        attendance: { finalLevel: 0, type: 'rank', approverIds: { 'emailid': { rank: 0, sections: ['all'] }} },
        inventory: { finalLevel: 1, type: 'rank', approverIds: { 'emailid': { rank: 1, sections: ['all'] }} },
    },
}

const Settings = () => {
    const { storePath, company, companyRecord,
        settings, getSettings, server, fetchServer,
        recoveryVal, setRecoveryVal, changingSettings,
        setChangingSettings, colSettings, setColSettings,
        enableBlockVal, setEnableBlockVal,
        DBProfiles, setDBProfiles, fetchDBProfiles,
        profiles, setProfiles, centralCompany,
        employees, getEmployees, dashList, fetchProfiles,
        chartOfAccounts, getChartOfAccounts,
        setAlert, setAlertState, setAlertTimeout
    } = useContext(ContextProvider)

    const [colname, setColname] = useState('')
    const [writeStatus, setWriteStatus] = useState('Add')
    const [editCol, setEditCol] = useState(null)
    const [showPass, setShowPass] = useState(false)
    const [saveStatus, setSaveStatus] = useState('')
    const [currentView, setCurrentView] = useState('employees')
    const [companyProfile, setCompanyProfile] = useState(null)
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
    const [approvalConfig, setApprovalConfig] = useState(DEFAULT_APPROVAL_CONFIG)
    const [posReconciliationConfig, setPosReconciliationConfig] = useState(DEFAULT_POS_RECONCILIATION_CONFIG)
    const [propState, setPropState] = useState('new')
    const [curPropSet, setCurPropSet] = useState(null)
    const [currentProfiles, setCurrentProfiles] = useState([])
    const [deleteCount, setDeleteCount] = useState(0)
    const [accessValue, setAccessValue] = useState('')
    const [accountingMappings, setAccountingMappings] = useState(null)
    const [isAccountingLoading, setIsAccountingLoading] = useState(false)
    const [isAccountingSaving, setIsAccountingSaving] = useState(false)
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
        account: '',
        isSalesAccount: false,
        isExpenseAccount: false,
    }
    const defaultPosSettings = {
        name: '',
        type: '',
        size: '',
        capacity: '',
        active: false,
        useMarkUp: false,
        sessHour: '',
        printPaymentReceipt: false,
        printKitchenReceipt: false,
        printBarReceipt: false,
        printCustomerOrder: false,
        automateOrderDelivery: false,
        automateKitchenDelivery: false,
    }
    const [loginDetails, setLoginDetails] = useState({
        email: '',
        password: '',
        permissions: [],
        enableLogin: false,
        enableDebtRecovery: false
    })

    const [sessionPeriods, setSessionPeriods] = useState([])
    const postingAccounts = (chartOfAccounts || [])
        .flatMap((section) => section?.accounts || [])
        .filter((account) => {
            const headerType = String(account?.['header-type'] || '').toLowerCase()
            return !['header', 'sub-header'].includes(headerType)
        })
        .sort((first, second) => Number(first?.['g/l code'] || 0) - Number(second?.['g/l code'] || 0))
    const modulePermissions = [
        ...dashList
    ]
    const [salesPostsPermissions, setSalesPostsPermissions] = useState([])
    const [deliveryPostsPermissions, setDeliveryPostsPermissions] = useState([])
    const [posAdminPermissions, setPosAdminPermissions] = useState([])
    const editDeletePermissions = [
        'edit_employees', 'enable_employee_debt_recovery', 'edit_product_details',
        'add_expense_category', 'edit_pos_order', 'cancel_pos_order', 'cancel_paid_orders', 'remove_pos_items', 'override_pos_receipts',
        'edit_payment_receipts', 'cancel_delivery_order', 'override_accomodation',
        'view_all_accommodation', 'allow_group_payment'
    ]
    const postingPermissions = [
        'allowBacklogs', 'allow_sales_posts', 'allow_add_sales_products',
        'allow_recovery_posts', 'allow_rental_posts', 'allow_accommodation_posts',
        'allow_purchase_posts', 'allow_expense_posts', 'allow_payment_posts',
        'allow_transfer_posts', 'allow_asset_posts', 'allow_depreciation_posts', 'postAttendance', 'postPayroll'
    ]
    const approvalPermissions = [
        'approve_postsales', 'approve_postaddSalesProduct', 'approve_postrentals',
        'approve_postrecovery', 'approve_postaccommodation', 'approve_postpurchase',
        'approve_postexpense', 'approve_postpayment',
        'approve_postattendance', 'approve_postpayroll', 'approve_posttransfer', 'configure_approvals'
    ]
    const importExportPermissions = [
        'imports', 'export_inventory_report', 'export_sales_report',
        'export_pos_report', 'export_purchase_report', 'print_purchase_doc', 'export_expense_report',
        'adjustments', 'export_attendance_report', 'export_payroll_report'
    ]

    const stockTransferPermissions = [
        'internal_transfer'
    ]
    useEffect(() => {
        storePath('settings')
        document.title = 'Settings | Enterprise Compute Central'
    }, [storePath])

    useEffect(() => {
        if (settings.length) {
            const groups = settings.filter((setting) => {
                if (setting.name) {
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
                            return setting.desc
                        case 'posReconciliation':
                            setting.desc = 'POS Reconciliation'
                            setting.prop = 'locations'
                            return setting.desc
                        default:
                            return setting.desc
                    }
                }
            })
            setSettingGroups(groups)

            const uomSetFilt = settings.filter((setting) => {
                return setting.name === 'uom'
            })
            delete uomSetFilt[0]?._id
            setUoms(uomSetFilt[0]?.name ? [...uomSetFilt[0].mearsures] : [])

            const catSetFilt = settings.filter(setting => setting.name === 'product_categories');
            delete catSetFilt[0]?._id;
            setCategories(catSetFilt[0]?.name ? [...catSetFilt[0].categories] : []);

            const wrhSetFilt = settings.filter((setting) => {
                return setting.name === 'warehouses'
            })
            delete wrhSetFilt[0]?._id
            setWrhs(wrhSetFilt[0]?.name ? [...wrhSetFilt[0].warehouses] : [])

            const paySetFilt = settings.filter((setting) => {
                return setting.name === 'paymentMethods'
            })
            delete paySetFilt[0]?._id
            setPaymentMethods(paySetFilt[0]?.name ? [...paySetFilt[0].paymentMethods] : [])

            const posSetFilt = settings.filter((setting) => {
                return setting.name === 'posSettings'
            })
            delete posSetFilt[0]?._id
            setPosSettings(posSetFilt[0]?.name ? [...posSetFilt[0].posSettings] : [])

            const approvalSet = settings.find((setting) => setting.name === 'approvalConfig')
            if (approvalSet?.modules) {
                setApprovalConfig({ ...DEFAULT_APPROVAL_CONFIG, ...approvalSet, modules: { ...DEFAULT_APPROVAL_CONFIG.modules, ...approvalSet.modules } })
            }

            const posReconSet = settings.find((setting) => setting.name === 'posReconciliation')
            if (posReconSet) {
                setPosReconciliationConfig({ ...DEFAULT_POS_RECONCILIATION_CONFIG, ...posReconSet })
            }
        }
    }, [settings])

    useEffect(() => {
        // keep local editable company profile in sync
        // For the Company Profile view we prefer the central WCDatabase.CompanyProfiles document
        if (currentView === 'company') return
        setCompanyProfile(centralCompany ? ({ ...centralCompany }) : null)
    }, [centralCompany, currentView])

    // When the Company view is active, load the central CompanyProfile from the server (authenticated)
    useEffect(() => {
        const loadCentralProfile = async () => {
            try {
                const resp = await fetchServer('POST', {}, 'getCompanyProfile', server)
                if (!resp || resp.err) return
                if (resp.record) setCompanyProfile({ ...resp.record })
            } catch (e) {
                // ignore; fallback to companyRecord
            }
        }

        if (currentView === 'company') {
            loadCentralProfile()
        }
    }, [currentView, company, fetchServer, server])

    const handleCompanyFieldChange = (e) => {
        const { name, value } = e.target
        setCompanyProfile((prev) => ({ ...prev, [name]: value }))
    }

    const getDriveThumbnailUrl = (imgId) => imgId ? `https://drive.google.com/thumbnail?id=${imgId}&sz=w1000` : ''
    
    const handleCompanyFileChange = async (e, kind) => {
        const file = e.target.files?.[0]
        if (!file) return
        let uploadBlob = file
        if (file.type === 'image/heic' || (file.name || '').toLowerCase().endsWith('.heic')) {
            try {
                setAlertState('info')
                setAlert('Converting HEIC photo to JPEG...')
                setAlertTimeout(100000) // long timeout for conversion
                uploadBlob = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.9,
                })
                uploadBlob = new File(
                    [uploadBlob],
                    `${(file.name || `${kind}-photo`).replace(/\.heic$/i, '')}.jpg`,
                    { type: 'image/jpeg' }
                )
            } catch (err) {
                setAlertState('error')
                setAlert(`Image conversion failed: ${err}`)
                setAlertTimeout(3000)
                return
            }
        }
        // show immediate local preview like employee photo flow
        try {
            const previewUrl = URL.createObjectURL(uploadBlob)
            if (kind === 'logo') setCompanyProfile((prev) => ({ ...prev, logoUrl: previewUrl }))
                else if (kind === 'signature') setCompanyProfile((prev) => ({ ...prev, signatureUrl: previewUrl }))
        } catch (err) {
        // ignore preview failures
        }
        setAlertState('info')
        setAlert(`Uploading ${kind === 'signature' ? 'signature' : 'logo'}...`)
        setAlertTimeout(100000) // long timeout for upload
        try {
            const folderPath = `${company}/Company Assets/${kind === 'signature' ? 'Signatures' : 'Logos'}`
            const res = await uploadCompanyFile(uploadBlob, folderPath, Date.now(), company, 'CompanyProfiles', server)
            if (res?.mess || res?.err) {
                const err = new Error(res.mess || 'Upload failed')
                err.code = res.code
                console.log(err)    
                throw err
            }
            const fileId = res?.imgId || res?.fileId || res?.id || res?.imageId || res?.data?.id || res?.data?.imgId || ''
            const fileUrl = getDriveThumbnailUrl(fileId) || res?.downloadLink || res?.viewLink || res?.webViewLink || res?.webContentLink || res?.data?.downloadLink || res?.data?.viewLink || ''
            // Persist both the file id and a public URL in the CompanyProfile shape
            if (fileId){
                if (kind === 'logo') {
                    setCompanyProfile((prev) => ({ ...prev, logo: fileId, logoUrl: fileUrl }))
                    // persist immediately so prints and other clients see it
                    setAlertState('info')
                    setAlert('Logo uploaded. Saving to Company Profile...')
                    setAlertTimeout(100000)
                    try {
                        const respSave = await fetchServer('POST', { prop: [{ db: company }, { logo: fileId, logoUrl: fileUrl }] }, 'updateDBProfileDoc', server)
                        if (respSave?.err || !respSave?.updated) {
                            console.warn('Failed to persist logo to CompanyProfiles', respSave)
                            setAlertState('error')
                            setAlert('Logo uploaded but failed to save to Company Profile. Please Save Company Profile manually.')
                            setAlertTimeout(6000)
                        }
                    } catch (e) {
                        console.warn('Persist logo error', e)
                        setAlertState('error')
                        setAlert('Logo uploaded but failed to save to Company Profile. Please Save Company Profile manually.')
                        setAlertTimeout(6000)
                    }
                } else if (kind === 'signature') {
                    setCompanyProfile((prev) => ({ ...prev, signature: fileId, signatureUrl: fileUrl }))
                    setAlertState('info')
                    setAlert('Signature uploaded. Saving to Company Profile...')
                    setAlertTimeout(100000)
                    try {
                        const respSave = await fetchServer('POST', { prop: [{ db: company }, { signature: fileId, signatureUrl: fileUrl }] }, 'updateDBProfileDoc', server)
                        if (respSave?.err || !respSave?.updated) {
                            console.warn('Failed to persist signature to CompanyProfiles', respSave)
                            setAlertState('error')
                            setAlert('Signature uploaded but failed to save to Company Profile. Please Save Company Profile manually.')
                            setAlertTimeout(6000)
                        }
                    } catch (e) {
                        console.warn('Persist signature error', e)
                        setAlertState('error')
                        setAlert('Signature uploaded but failed to save to Company Profile. Please Save Company Profile manually.')
                        setAlertTimeout(6000)
                    }
                } else {
                    setAlertState('info')
                    setAlert('Setting Company Profile image to default')
                    setAlertTimeout(4000)
                    setCompanyProfile((prev) => ({ ...prev, [`${kind}FileId`]: fileId, [`${kind}Url`]: fileUrl }))
                }
                setAlertState('success')
                setAlert(`${kind === 'signature' ? 'Signature' : 'Logo'} uploaded`)
                setAlertTimeout(2000)
            }else{
                setAlertState('error')
                setAlert('Upload succeeded but failed to retrieve file ID')
                setAlertTimeout(4000)
            }
        } catch (err) {
            setAlertState('error')
            setAlert(err.message || 'Upload failed')
            setAlertTimeout(4000)
        }
    }

    const saveCompanyProfile = async () => {
        if (!companyProfile) return
        setSaveStatus('Saving Company Profile...')
        try {
            const payload = { ...companyProfile }
            delete payload._id
            const resp = await fetchServer('POST', { prop: [{ db: company }, payload] }, 'updateDBProfileDoc', server)
            if (resp.err) throw new Error(resp.mess || 'Save failed')
            fetchProfiles(company)
            setSaveStatus('Company Profile Saved')
            setTimeout(() => setSaveStatus(''), 2000)
        } catch (err) {
            setSaveStatus('')
            setAlertState('error')
            setAlert(err.message || 'Failed to save company profile')
            setAlertTimeout(4000)
        }
    }

    useEffect(() => {
        let salesPostsPerms = []
        let deliveryPostsPerms = []
        let overridePerms = []
        if (wrhs.length) {
            wrhs.forEach((wrh) => {
                if (!wrh.purchase) {
                    salesPostsPerms.push(`pos_${wrh.name}`)
                    deliveryPostsPerms.push(`delivery_${wrh.name}`)
                    overridePerms.push(`override_${wrh.name}`)
                }
            })
        }
        setSalesPostsPermissions(salesPostsPerms)
        setDeliveryPostsPermissions(deliveryPostsPerms)
        setPosAdminPermissions([
            'access_pos_sessions', 'access_pos_deliveries', 'make_pos_agent', 'make_delivery_agent', 'reconcile_inventory',
            'edit_ended_sessions', 'place_multiple_deliveries', ...overridePerms])
    }, [wrhs])

    useEffect(() => {
        const periods = []
        for (let i = 0; i < 24; i++) {
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
            if (!chartOfAccounts?.length) {
                getChartOfAccounts(cmp_val, companyRecord)
            }
        }
    }, [])

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('paystack') === 'settings' || params.get('view') === 'billing') {
            setCurrentView('billing')
        } else if (params.get('view') === 'accounting') {
            setCurrentView('accounting')
        }
    }, [])

    useEffect(() => {
        setCurrentProfiles(profiles.map((profile) => {
            return profile.emailid
        }))
    }, [profiles])

    useEffect(() => {
        const updateDBStatus = async () => {
            if (accessValue === magicWord || accessValue === activationWord) {
                setAccessValue('updating activation....')
                const resps = await fetchServer("POST", {
                    prop: [{ db: company }, { manualPauseDB: accessValue === magicWord }]
                }, "updateDBProfileDoc", server)
                if (resps.err) {
                    console.log(resps.mess)
                } else {
                    fetchProfiles(company)
                    setAccessValue('updated activation')
                    setTimeout(() => {
                        setAccessValue('')
                    }, [2000])
                }
            }
        }
        updateDBStatus()
    }, [accessValue])

    const handleSecretAccess = (e) => {
        const { name, value } = e.target
        if (name === 'access') {
            setAccessValue(value)
        } else {
            setAccessValue('')
        }
    }

    useEffect(() => {
        if (currentView === 'accounting' && company && chartOfAccounts?.length) {
            loadAccountingMappings()
        }
    }, [currentView, company, chartOfAccounts?.length])

    const loadAccountingMappings = async () => {
        if (!company) return
        setIsAccountingLoading(true)
        try {
            const resp = await fetchServer("POST", {}, "getAccountingMappings", server)
            if (resp.err || !resp.ok) {
                throw new Error(resp.mess || 'Failed to load accounting links')
            }
            setAccountingMappings(resp.mappings || null)
        } catch (error) {
            setAlertState('error')
            setAlert(error.message || 'Failed to load accounting links')
            setAlertTimeout(3000)
        } finally {
            setIsAccountingLoading(false)
        }
    }

    const updateAccountingField = (moduleName, field, value) => {
        setAccountingMappings((prev) => ({
            ...prev,
            modules: {
                ...(prev?.modules || {}),
                [moduleName]: {
                    ...(prev?.modules?.[moduleName] || {}),
                    [field]: value
                }
            }
        }))
    }

    const updateAccountingListField = (moduleName, listField, index, field, value) => {
        setAccountingMappings((prev) => {
            const list = [...(prev?.modules?.[moduleName]?.[listField] || [])]
            list[index] = {
                ...list[index],
                [field]: value
            }
            return {
                ...prev,
                modules: {
                    ...(prev?.modules || {}),
                    [moduleName]: {
                        ...(prev?.modules?.[moduleName] || {}),
                        [listField]: list
                    }
                }
            }
        })
    }

    const saveAccountingMappings = async () => {
        if (!accountingMappings) return
        setIsAccountingSaving(true)
        setSaveStatus('Saving Accounting Links...')
        try {
            const resp = await fetchServer("POST", {
                mappings: accountingMappings
            }, "updateAccountingMappings", server)
            if (resp.err || !resp.ok) {
                throw new Error(resp.mess || 'Failed to save accounting links')
            }
            setAccountingMappings(resp.mappings || accountingMappings)
            setSaveStatus('Accounting Links Saved')
            setTimeout(() => setSaveStatus(''), 2500)
        } catch (error) {
            setSaveStatus('')
            setAlertState('error')
            setAlert(error.message || 'Failed to save accounting links')
            setAlertTimeout(3000)
        } finally {
            setIsAccountingSaving(false)
        }
    }

    const canConfigureApprovals = companyRecord?.access === 'admin' || companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('all') || companyRecord?.permissions?.includes('configure_approvals')

    const saveApprovalConfig = async () => {
        if (!canConfigureApprovals) {
            setAlertState('error')
            setAlert('Approval configuration is restricted to admins.')
            setAlertTimeout(3000)
            return
        }
        setSaveStatus('Saving Approval Configuration...')
        try {
            const payload = {
                ...approvalConfig,
                name: 'approvalConfig',
                desc: 'Approval Configuration',
                updatedAt: Date.now(),
            }
            delete payload._id
            
            const resp = await fetchServer("POST", {
                prop: [{ name: 'approvalConfig' }, payload]
            }, "updateSettings", server)
            if (resp.err || resp.updated === false) {
                throw new Error(resp.mess || 'Failed to save approval configuration')
            }
            setApprovalConfig(payload)
            getSettings(company, companyRecord)
            setSaveStatus('Approval Configuration Saved')
            setTimeout(() => setSaveStatus(''), 2500)
        } catch (error) {
            setSaveStatus('')
            setAlertState('error')
            setAlert(error.message || 'Failed to save approval configuration')
            setAlertTimeout(4000)
        }
    }

    const canConfigurePosReconciliation = companyRecord?.access === 'admin' || companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('all')

    const togglePosReconciliationLocation = (locationName) => {
        setPosReconciliationConfig((prev) => {
            const locations = prev.locations || []
            return {
                ...prev,
                locations: locations.includes(locationName)
                    ? locations.filter((name) => name !== locationName)
                    : [...locations, locationName]
            }
        })
    }

    const savePosReconciliationConfig = async () => {
        if (!canConfigurePosReconciliation) {
            setAlertState('error')
            setAlert('POS Reconciliation configuration is restricted to admins.')
            setAlertTimeout(3000)
            return
        }
        setSaveStatus('Saving POS Reconciliation Configuration...')
        try {
            const payload = {
                ...posReconciliationConfig,
                name: 'posReconciliation',
                desc: 'POS Reconciliation',
                updatedAt: Date.now(),
            }
            delete payload._id
            const resp = await fetchServer("POST", {
                prop: [{ name: 'posReconciliation' }, payload]
            }, "updateSettings", server)
            if (resp.err || resp.updated === false) {
                throw new Error(resp.mess || 'Failed to save POS Reconciliation configuration')
            }
            setPosReconciliationConfig(payload)
            getSettings(company, companyRecord)
            setSaveStatus('POS Reconciliation Configuration Saved')
            setTimeout(() => setSaveStatus(''), 2500)
        } catch (error) {
            setSaveStatus('')
            setAlertState('error')
            setAlert(error.message || 'Failed to save POS Reconciliation configuration')
            setAlertTimeout(4000)
        }
    }

    const updateApprovalModule = (moduleName, field, value) => {
        setApprovalConfig((prev) => ({
            ...prev,
            modules: {
                ...(prev.modules || {}),
                [moduleName]: {
                    ...((prev.modules || {})[moduleName] || {}),
                    [field]: field === 'finalLevel' ? Number(value || 0) : value,
                }
            }
        }))
    }

    const updateApprovalApprover = (moduleName, approverId, field, value) => {
        setApprovalConfig((prev) => {
            const moduleConfig = (prev.modules || {})[moduleName] || {}
            const approvers = moduleConfig.approverIds || {}
            const current = approvers[approverId] || { rank: 0, sections: ['all'] }
            return {
                ...prev,
                modules: {
                    ...(prev.modules || {}),
                    [moduleName]: {
                        ...moduleConfig,
                        approverIds: {
                            ...approvers,
                            [approverId]: {
                                ...current,
                                [field]: field === 'rank' ? Number(value || 0) : String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
                            }
                        }
                    }
                }
            }
        })
    }

    const addApprovalApprover = (moduleName) => {
        const approverId = window.prompt('Enter approver employee ID or email')
        if (!approverId) return
        updateApprovalApprover(moduleName, approverId.trim(), 'sections', 'all')
    }

    const removeApprovalApprover = (moduleName, approverId) => {
        setApprovalConfig((prev) => {
            const moduleConfig = (prev.modules || {})[moduleName] || {}
            const approvers = { ...(moduleConfig.approverIds || {}) }
            delete approvers[approverId]
            return {
                ...prev,
                modules: {
                    ...(prev.modules || {}),
                    [moduleName]: { ...moduleConfig, approverIds: approvers }
                }
            }
        })
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
                setCurPropSet({ ...defaultUom })
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
        if (currentSetting?.name !== setting.name) {
            setCurrentSetting(setting)
        }
    }
    const handlePropSetChange = (e) => {
        const { name, type, value, checked } = e.target
        setCurPropSet((curPropSet) => {
            return { ...curPropSet, [name]: type === 'checkbox' ? checked : value }
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
                        prop: [{ name: 'warehouses' }, {
                            ...currentSetting,
                            warehouses: [...wrhs, newWarehouse]
                        }]
                    }, "updateSettings", server)
                    if (resps.err) {
                        console.log(resps.mess)
                        setSaveStatus('Error Saving Settings')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    } else {
                        setSaveStatus('Saved')
                        getSettings(company, companyRecord)
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
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
                        prop: [{ name: 'warehouses' }, { ...currentSetting, warehouses: updatedWarehouses }]
                    }, "updateSettings", server)
                    if (resps.err) {
                        console.log(resps.mess)
                        setSaveStatus('Error Saving Settings')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    } else {
                        getSettings(company, companyRecord)
                        setSaveStatus('Saved')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    }
                }
                break
            case 'uom':
                if (propState === 'new') {
                    const resps = await fetchServer("POST", {
                        prop: [{ name: 'uom' }, { ...currentSetting, mearsures: [...uoms, curPropSet] }]
                    }, "updateSettings", server)
                    if (resps.err) {
                        console.log(resps.mess)
                        setSaveStatus('Error Saving Settings')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    } else {
                        getSettings(company, companyRecord)
                        setSaveStatus('Saved')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    }
                } else {
                    const updatedUoms = uoms.map((uom) => {
                        if (uom.code === curPropSet.code) {
                            return curPropSet
                        }
                        return uom
                    })
                    const resps = await fetchServer("POST", {
                        prop: [{ name: 'uom' }, { ...currentSetting, mearsures: updatedUoms }]
                    }, "updateSettings", server)
                    if (resps.err) {
                        console.log(resps.mess)
                        setSaveStatus('Error Saving Settings')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    } else {
                        getSettings(company, companyRecord)
                        setSaveStatus('Saved')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    }
                }
                break
            case 'product_categories':
                if (propState === 'new') {
                    const resps = await fetchServer("POST", {
                        prop: [{ name: 'product_categories' }, { ...currentSetting, categories: [...categories, curPropSet] }]
                    }, "updateSettings", server)
                    if (resps.err) {
                        console.log(resps.mess)
                        setSaveStatus('Error Saving Settings')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    } else {
                        getSettings(company, companyRecord)
                        setSaveStatus('Saved')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    }
                } else {
                    const updatedCategories = categories.map((category) => {
                        if (category.code === curPropSet.code) {
                            return curPropSet
                        }
                        return category
                    })
                    const resps = await fetchServer("POST", {
                        prop: [{ name: 'product_categories' }, { ...currentSetting, categories: updatedCategories }]
                    }, "updateSettings", server)
                    if (resps.err) {
                        console.log(resps.mess)
                        setSaveStatus('Error Saving Settings')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    } else {
                        getSettings(company, companyRecord)
                        setSaveStatus('Saved')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    }
                }
                break
            case 'paymentMethods':
                if (propState === 'new') {
                    const resps = await fetchServer("POST", {
                        prop: [{ name: 'paymentMethods' }, { ...currentSetting, paymentMethods: [...paymentMethods, curPropSet] }]
                    }, "updateSettings", server)
                    if (resps.err) {
                        console.log(resps.mess)
                        setSaveStatus('Error Saving Settings')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    } else {
                        getSettings(company, companyRecord)
                        setSaveStatus('Saved')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    }
                } else {
                    const updatedPaymentMethods = paymentMethods.map((method) => {
                        if (method.i_d === curPropSet.i_d) {
                            return curPropSet
                        }
                        return method
                    })
                    const resps = await fetchServer("POST", {
                        prop: [{ name: 'paymentMethods' }, { ...currentSetting, paymentMethods: updatedPaymentMethods }]
                    }, "updateSettings", server)
                    if (resps.err) {
                        console.log(resps.mess)
                        setSaveStatus('Error Saving Settings')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    } else {
                        getSettings(company, companyRecord)
                        setSaveStatus('Saved')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    }
                }
                break
            case "posSettings":
                if (propState === 'view') {
                    const updatedPosSetting = posSettings.map((pos) => {
                        if (pos.name === curPropSet.name) {
                            return curPropSet
                        }
                        return pos
                    })
                    const resps = await fetchServer("POST", {
                        prop: [{ name: 'posSettings' }, { ...currentSetting, posSettings: updatedPosSetting }]
                    }, "updateSettings", server)
                    if (resps.err) {
                        console.log(resps.mess)
                        setSaveStatus('Error Saving Settings')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    } else {
                        getSettings(company, companyRecord)
                        setSaveStatus('Saved')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    }
                }
                break
            default:
                setTimeout(() => setSaveStatus(''), 1000)
                break
        }
    }


    const deleteSettingsProp = async () => {
        setSaveStatus('Removing...')
        switch (currentSetting.name) {
            case 'warehouses':
                const filteredWarehouses = wrhs.filter((wrh) => wrh.name !== curPropSet.name)
                const resps = await fetchServer("POST", {
                    prop: [{ name: 'warehouses' }, { ...currentSetting, warehouses: filteredWarehouses }]
                }, "updateSettings", server)
                if (resps.err) {
                    console.log(resps.mess)
                    setSaveStatus('Error Deleting Settings')
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                } else {
                    getSettings(company, companyRecord)
                    setSaveStatus('Deleted')
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                }
                break
            case 'uom':
                const filteredUoms = uoms.filter((uom) => uom.code !== curPropSet.code)
                const resps1 = await fetchServer("POST", {
                    prop: [{ name: 'uom' }, { ...currentSetting, mearsures: filteredUoms }]
                }, "updateSettings", server)
                if (resps1.err) {
                    console.log(resps1.mess)
                    setSaveStatus('Error Deleting Settings')
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                } else {
                    getSettings(company, companyRecord)
                    setSaveStatus('Deleted')
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                }
                break
            case 'product_categories':
                const filteredCategories = categories.filter((category) => category.code !== curPropSet.code)
                const resps2 = await fetchServer("POST", {
                    prop: [{ name: 'product_categories' }, { ...currentSetting, categories: filteredCategories }]
                }, "updateSettings", server)
                if (resps2.err) {
                    console.log(resps2.mess)
                    setSaveStatus('Error Deleting Settings')
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                } else {
                    getSettings(company, companyRecord)
                    setSaveStatus('Deleted')
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                }
                break
            case 'paymentMethods':
                const filteredPaymentMethods = paymentMethods.filter((method) => method.i_d !== curPropSet.i_d)
                const resps3 = await fetchServer("POST", {
                    prop: [{ name: 'paymentMethods' }, { ...currentSetting, paymentMethods: filteredPaymentMethods }]
                }, "updateSettings", server)
                if (resps3.err) {
                    console.log(resps3.mess)
                    setSaveStatus('Error Deleting Settings')
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                } else {
                    getSettings(company, companyRecord)
                    setSaveStatus('Deleted')
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                }
                break
            case 'posSettings':
                setAlertState('error')
                setAlert("Can't Delete POS Settings, You can always pick one, activate it and post changes by using the Save Button.")
                setAlertTimeout(3000)
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
                setTimeout(() => {
                    setSaveStatus('')
                }, 3000)
            } else {
                if (loginDetails.password) {
                    const resps = await fetchServer("POST", {
                        prop: [{ emailid: selectedEmployee.emailid }, { password: loginDetails.password }]
                    }, "updateDBProfiles", server)
                    if (resps.err) {
                        console.log(resps.mess)
                        setSaveStatus(resps.mess)
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    } else {
                        setSaveStatus('Saved')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                        fetchProfiles(company)
                    }
                } else {
                    setSaveStatus('Saved')
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                    fetchProfiles(company)
                }
            }
        } else {
            if (loginDetails.email && loginDetails.password && loginDetails.permissions.length) {
                setSaveStatus('Saving...')
                const newDBProfile = {
                    emailid: loginDetails.email,
                    name: companyRecord.name,
                    password: loginDetails.password,
                    db: company
                }
                const companyRecordClone = structuredClone({ companyRecord })
                const defaultCompanyRecord = companyRecordClone.companyRecord
                delete defaultCompanyRecord._id
                const newProfile = {
                    ...defaultCompanyRecord,
                    emailid: loginDetails.email,
                    permissions: loginDetails.permissions,
                    enableLogin: loginDetails.enableLogin,
                    enableDebtRecovery: loginDetails.enableDebtRecovery,
                    sessionId: '',
                    status: 'user',
                    access: 'user'
                }
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Profile",
                    update: newProfile
                }, "postUserDetails", server)
                if (resps.err) {
                    console.log(resps.mess)
                    setSaveStatus(resps.mess)
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                } else {
                    const resps1 = await fetchServer("POST", {
                        database: "WCDatabase",
                        collection: "Profiles",
                        update: newDBProfile
                    }, "createDoc", server)
                    if (resps1.err) {
                        console.log(resps1.mess)
                        setSaveStatus(resps.mess)
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    } else {
                        setSaveStatus('Profile Created')
                        fetchProfiles(company)
                        setDBProfiles((DBProfiles) => {
                            return [...DBProfiles, newDBProfile]
                        })
                        handleProfileSelect(newProfile)
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    }
                }
            } else {
                setAlertState('error')
                setAlert('Select Employee, Create New Password and Select at least 1 Permission!')
                setAlertTimeout(5000)
            }
        }
        setTimeout(() => setSaveStatus(''), 5000)
    }


    const deleteProfile = async () => {
        setAlert('')
        setSaveStatus('Delete again to confirm deletion!')
        if (deleteCount === selectedEmployee.emailid) {
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
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                } else {
                    const resps1 = await fetchServer("POST", {
                        database: "WCDatabase",
                        collection: "Profiles",
                        update: { emailid: selectedEmployee.emailid }
                    }, "removeDoc", server)
                    if (resps1.err) {
                        console.log(resps.mess)
                        setSaveStatus(resps.mess)
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
                    } else {
                        setSaveStatus('Profile Deleted')
                        setTimeout(() => {
                            setSaveStatus('')
                        }, 3000)
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
        } else {
            setDeleteCount(selectedEmployee.emailid)
            setTimeout(() => {
                setSaveStatus('')
            }, 2000)
            setTimeout(() => {
                setDeleteCount(0)
            }, 12000)
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
                    setSaveStatus('Error Adding Column')
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                } else {
                    setWriteStatus('Add')
                    getSettings(company, companyRecord)
                    setSaveStatus('Saved')
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                }
            } else {
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Settings",
                    update: { ...colSettings, name: 'import_columns', import_columns: [...postingCols] }
                }, "createDoc", server)
                if (resps.err) {
                    console.log(resps.mess)
                    setSaveStatus('Error Adding Column')
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
                } else {
                    getSettings(company, companyRecord)
                    setSaveStatus('Saved')
                    setTimeout(() => {
                        setSaveStatus('')
                    }, 3000)
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

    const renderAccountingSelect = (label, value, onChange) => (
        <div className='inpcov settings-accounting-field'>
            <div>{label}</div>
            <select className='forminp' value={value || ''} onChange={(e) => onChange(e.target.value)}>
                <option value=''>Select G/L account</option>
                {postingAccounts.map((account) => (
                    <option key={account['g/l code']} value={account['g/l code']}>
                        {`${account['g/l code']} - ${account.name}`}
                    </option>
                ))}
            </select>
        </div>
    )

    const renderAccountingList = (title, rows = [], field, onChange) => (
        <div className='settings-accounting-card'>
            <div className='settings-accounting-card-header'>
                <h3>{title}</h3>
                <span>{rows.length} item{rows.length === 1 ? '' : 's'}</span>
            </div>
            <div className='settings-accounting-table'>
                {rows.map((row, index) => (
                    <div className='settings-accounting-row' key={`${title}-${row.key}-${index}`}>
                        <div className='settings-accounting-row-label'>{row.label || row.key}</div>
                        <select className='forminp' value={row[field] || ''} onChange={(e) => onChange(index, e.target.value)}>
                            <option value=''>Select G/L account</option>
                            {postingAccounts.map((account) => (
                                <option key={account['g/l code']} value={account['g/l code']}>
                                    {`${account['g/l code']} - ${account.name}`}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
        </div>
    )

    const renderAccountingView = (variants) => {
        const modules = accountingMappings?.modules || {}

        return (
            <motion.div
                className='accounting-settings'
                initial="initial" animate="animate" exit="exit" variants={variants}
                transition={{ duration: 0.4 }}
            >
                <div className='general-details settings-accounting-layout'>
                    <div className='form-card settings-accounting-shell'>
                        <div className='settings-accounting-hero'>
                            <div>
                                <div className='formtitle'><IoSettings /> Operational G/L Linking</div>
                                <p className='settings-accounting-copy'>
                                    Link each operational area to the G/L accounts it should affect. These links stay separate from the payment-method account number field and are preserved during COA re-initialization unless you change them.
                                </p>
                                <div className='settings-accounting-help'>
                                    <strong>How this works:</strong>
                                    <span>Operational modules post source documents only. The backend accounting engine reads those source documents, combines them with manual journals and closings, then produces COA balances, Trial Balance, Balance Sheet, Profit & Loss, and ledger drill-downs.</span>
                                </div>
                            </div>
                            <div className='settings-accounting-actions'>
                                <button className='savebtn' onClick={loadAccountingMappings} disabled={isAccountingLoading}>
                                    {isAccountingLoading ? 'Refreshing...' : 'Refresh Links'}
                                </button>
                                <button className='savebtn' onClick={saveAccountingMappings} disabled={isAccountingSaving || isAccountingLoading}>
                                    <IoSave /> {isAccountingSaving ? 'Saving...' : 'Save Links'}
                                </button>
                            </div>
                        </div>

                        {isAccountingLoading && !accountingMappings ? (
                            <div className='settings-accounting-empty'>Loading accounting links...</div>
                        ) : (
                            <div className='settings-accounting-grid'>
                                <div className='settings-accounting-card'>
                                    <div className='settings-accounting-card-header'>
                                        <h3>Orders</h3>
                                        <span>Default order posting</span>
                                    </div>
                                    <div className='settings-accounting-fields'>
                                        {renderAccountingSelect('Revenue Account', modules.orders?.revenueAccount, (value) => updateAccountingField('orders', 'revenueAccount', value))}
                                        {renderAccountingSelect('Receivable Account', modules.orders?.receivableAccount, (value) => updateAccountingField('orders', 'receivableAccount', value))}
                                    </div>
                                </div>

                                <div className='settings-accounting-card'>
                                    <div className='settings-accounting-card-header'>
                                        <h3>Inventory and Costing</h3>
                                        <span>Stock movement links</span>
                                    </div>
                                    <div className='settings-accounting-fields'>
                                        {renderAccountingSelect('Inventory Account', modules.inventory?.inventoryAccount, (value) => updateAccountingField('inventory', 'inventoryAccount', value))}
                                        {renderAccountingSelect('Inventory Payable', modules.inventory?.payableAccount, (value) => updateAccountingField('inventory', 'payableAccount', value))}
                                        {renderAccountingSelect('Cost of Sales', modules.inventory?.costOfSalesAccount, (value) => updateAccountingField('inventory', 'costOfSalesAccount', value))}
                                        {renderAccountingSelect('Adjustment Account', modules.inventory?.adjustmentAccount, (value) => updateAccountingField('inventory', 'adjustmentAccount', value))}
                                        {renderAccountingSelect('Production WIP', modules.inventory?.workInProgressAccount, (value) => updateAccountingField('inventory', 'workInProgressAccount', value))}
                                        {renderAccountingSelect('Production Variance', modules.inventory?.productionVarianceAccount, (value) => updateAccountingField('inventory', 'productionVarianceAccount', value))}
                                    </div>
                                </div>

                                <div className='settings-accounting-card'>
                                    <div className='settings-accounting-card-header'>
                                        <h3>Direct Purchase</h3>
                                        <span>Default purchase links</span>
                                    </div>
                                    <div className='settings-accounting-fields'>
                                        {renderAccountingSelect('Default Purchase Account', modules.purchase?.directExpenseAccount, (value) => updateAccountingField('purchase', 'directExpenseAccount', value))}
                                        {renderAccountingSelect('Purchase Payable', modules.purchase?.payableAccount, (value) => updateAccountingField('purchase', 'payableAccount', value))}
                                    </div>
                                </div>

                                <div className='settings-accounting-card'>
                                    <div className='settings-accounting-card-header'>
                                        <h3>Vendors</h3>
                                        <span>AP subsidiary ledger links</span>
                                    </div>
                                    <div className='settings-accounting-fields'>
                                        {renderAccountingSelect('Vendor Payable', modules.vendors?.payableAccount, (value) => updateAccountingField('vendors', 'payableAccount', value))}
                                        {renderAccountingSelect('Default Bill Expense', modules.vendors?.expenseAccount, (value) => updateAccountingField('vendors', 'expenseAccount', value))}
                                    </div>
                                </div>

                                <div className='settings-accounting-card'>
                                    <div className='settings-accounting-card-header'>
                                        <h3>Expenses</h3>
                                        <span>Default expense liabilities</span>
                                    </div>
                                    <div className='settings-accounting-fields'>
                                        {renderAccountingSelect('Expense Payable', modules.expenses?.payableAccount, (value) => updateAccountingField('expenses', 'payableAccount', value))}
                                    </div>
                                </div>

                                <div className='settings-accounting-card'>
                                    <div className='settings-accounting-card-header'>
                                        <h3>Sales and Recovery</h3>
                                        <span>Credit sales and employee debt</span>
                                    </div>
                                    <div className='settings-accounting-fields'>
                                        {renderAccountingSelect('Product Revenue', modules.sales?.productRevenueAccount, (value) => updateAccountingField('sales', 'productRevenueAccount', value))}
                                        {renderAccountingSelect('Service Revenue', modules.sales?.serviceRevenueAccount, (value) => updateAccountingField('sales', 'serviceRevenueAccount', value))}
                                        {renderAccountingSelect('Employee Receivable', modules.sales?.employeeReceivableAccount, (value) => updateAccountingField('sales', 'employeeReceivableAccount', value))}
                                        {renderAccountingSelect('Salary Payable', modules.sales?.salaryPayableAccount, (value) => updateAccountingField('sales', 'salaryPayableAccount', value))}
                                    </div>
                                </div>

                                <div className='settings-accounting-card'>
                                    <div className='settings-accounting-card-header'>
                                        <h3>Corporate Sales</h3>
                                        <span>Customer AR and invoice revenue</span>
                                    </div>
                                    <div className='settings-accounting-fields'>
                                        {renderAccountingSelect('Invoice Revenue', modules.corporateSales?.revenueAccount, (value) => updateAccountingField('corporateSales', 'revenueAccount', value))}
                                        {renderAccountingSelect('Customer Receivable', modules.corporateSales?.receivableAccount, (value) => updateAccountingField('corporateSales', 'receivableAccount', value))}
                                    </div>
                                </div>

                                <div className='settings-accounting-card'>
                                    <div className='settings-accounting-card-header'>
                                        <h3>Accommodation</h3>
                                        <span>Room revenue and receivables</span>
                                    </div>
                                    <div className='settings-accounting-fields'>
                                        {renderAccountingSelect('Default Revenue', modules.accommodations?.revenueAccount, (value) => updateAccountingField('accommodations', 'revenueAccount', value))}
                                        {renderAccountingSelect('Receivable Account', modules.accommodations?.receivableAccount, (value) => updateAccountingField('accommodations', 'receivableAccount', value))}
                                    </div>
                                </div>

                                <div className='settings-accounting-card'>
                                    <div className='settings-accounting-card-header'>
                                        <h3>Rentals</h3>
                                        <span>Rental revenue and receivables</span>
                                    </div>
                                    <div className='settings-accounting-fields'>
                                        {renderAccountingSelect('Default Revenue', modules.rentals?.revenueAccount, (value) => updateAccountingField('rentals', 'revenueAccount', value))}
                                        {renderAccountingSelect('Receivable Account', modules.rentals?.receivableAccount, (value) => updateAccountingField('rentals', 'receivableAccount', value))}
                                    </div>
                                </div>

                                <div className='settings-accounting-card'>
                                    <div className='settings-accounting-card-header'>
                                        <h3>Payroll</h3>
                                        <span>Attendance and salary flows</span>
                                    </div>
                                    <div className='settings-accounting-fields'>
                                        {renderAccountingSelect('Salary Expense', modules.payroll?.salaryExpenseAccount, (value) => updateAccountingField('payroll', 'salaryExpenseAccount', value))}
                                        {renderAccountingSelect('Salary Payable', modules.payroll?.salaryPayableAccount, (value) => updateAccountingField('payroll', 'salaryPayableAccount', value))}
                                        {renderAccountingSelect('Employee Receivable', modules.payroll?.employeeReceivableAccount, (value) => updateAccountingField('payroll', 'employeeReceivableAccount', value))}
                                    </div>
                                </div>

                                <div className='settings-accounting-card'>
                                    <div className='settings-accounting-card-header'>
                                        <h3>Assets</h3>
                                        <span>Register, depreciation, and disposal links</span>
                                    </div>
                                    <div className='settings-accounting-fields'>
                                        {renderAccountingSelect('Fixed Asset Account', modules.assets?.fixedAssetAccount, (value) => updateAccountingField('assets', 'fixedAssetAccount', value))}
                                        {renderAccountingSelect('Accumulated Depreciation', modules.assets?.accumulatedDepreciationAccount, (value) => updateAccountingField('assets', 'accumulatedDepreciationAccount', value))}
                                        {renderAccountingSelect('Depreciation Expense', modules.assets?.depreciationExpenseAccount, (value) => updateAccountingField('assets', 'depreciationExpenseAccount', value))}
                                        {renderAccountingSelect('Asset Payable', modules.assets?.payableAccount, (value) => updateAccountingField('assets', 'payableAccount', value))}
                                        {renderAccountingSelect('Disposal Gain', modules.assets?.disposalGainAccount, (value) => updateAccountingField('assets', 'disposalGainAccount', value))}
                                        {renderAccountingSelect('Disposal Loss', modules.assets?.disposalLossAccount, (value) => updateAccountingField('assets', 'disposalLossAccount', value))}
                                    </div>
                                </div>

                                {renderAccountingList('Payment Methods G/L Links', modules.paymentMethods || [], 'accountCode', (index, value) => {
                                    setAccountingMappings((prev) => {
                                        const list = [...(prev?.modules?.paymentMethods || [])]
                                        list[index] = { ...list[index], accountCode: value }
                                        return { ...prev, modules: { ...(prev?.modules || {}), paymentMethods: list } }
                                    })
                                })}
                                {renderAccountingList('Sales Points', modules.sales?.salesPointMappings || [], 'revenueAccount', (index, value) => updateAccountingListField('sales', 'salesPointMappings', index, 'revenueAccount', value))}
                                {renderAccountingList('Purchase Categories', modules.purchase?.categoryMappings || [], 'accountCode', (index, value) => updateAccountingListField('purchase', 'categoryMappings', index, 'accountCode', value))}
                                {renderAccountingList('Expense Categories', modules.expenses?.categoryMappings || [], 'accountCode', (index, value) => updateAccountingListField('expenses', 'categoryMappings', index, 'accountCode', value))}
                                {renderAccountingList('Accommodation Rooms', modules.accommodations?.roomMappings || [], 'revenueAccount', (index, value) => updateAccountingListField('accommodations', 'roomMappings', index, 'revenueAccount', value))}
                                {renderAccountingList('Rental Spaces', modules.rentals?.spaceMappings || [], 'revenueAccount', (index, value) => updateAccountingListField('rentals', 'spaceMappings', index, 'revenueAccount', value))}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        )
    }

    const renderView = () => {
        const variants = {
            initial: { opacity: 0, x: 20 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: -20 }
        }

        switch (currentView) {
            case 'employees':
                return (
                    <motion.div 
                        className='employee-settings'
                        initial="initial" animate="animate" exit="exit" variants={variants}
                        transition={{ duration: 0.4 }}
                    >
                        <div className='sidebar'>
                            <div className='sidebar-header'>
                                <div className="sidebar-title">
                                    <IoPerson /> Employees
                                </div>
                                <button className='add-profile-btn' onClick={addProfile}>
                                    <IoAdd /> Add Profile
                                </button>
                            </div>
                            <div className='profile-list'>
                                {profiles.map((profile, index) => {
                                    const employee = employees.find(e => e.i_d === profile.emailid);
                                    const isSuperAdmin = profile.status === 'admin' || profile.access === 'admin';
                                    return (
                                        <motion.div 
                                            whileHover={{ x: 5 }}
                                            key={index} 
                                            className={'profile-item ' + (selectedEmployee?.emailid === profile.emailid ? 'profile-item-active' : '')} 
                                            onClick={() => handleProfileSelect(profile)}
                                        >
                                            <div className="profile-item-info">
                                                <span className="profile-name">
                                                    {employee ? `${employee.firstName} ${employee.lastName}` : (isSuperAdmin ? 'Super Admin' : profile.emailid)}
                                                </span>
                                                <span className="profile-id">{profile.emailid}</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className='employee-details'>
                            <AnimatePresence mode='wait'>
                                <motion.div 
                                    key={selectedEmployee?.emailid || 'new'}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className='employee-form'
                                >
                                    <div className='formtitle'>
                                        <IoSettings /> {selectedEmployee ? 'Employee Permissions' : 'Create New Profile'}
                                    </div>
                                    
                                    <div className="form-grid">
                                        <div className='inpcov'>
                                            <div>Employee Selection</div>
                                            <select
                                                className='forminp'
                                                name='email'
                                                disabled={!!selectedEmployee}
                                                value={loginDetails.email}
                                                onChange={handleLoginDetailsChange}
                                            >
                                                {!selectedEmployee && <option value={''}>Select Employee</option>}
                                                {!selectedEmployee && <option value={'admin'}>Global Admin</option>}
                                                
                                                {selectedEmployee ? (
                                                    <option value={loginDetails.email}>
                                                        {employees.find(e => e.i_d === loginDetails.email) 
                                                            ? `${employees.find(e => e.i_d === loginDetails.email).firstName} ${employees.find(e => e.i_d === loginDetails.email).lastName}`
                                                            : (selectedEmployee.status === 'admin' || selectedEmployee.access === 'admin' ? 'Super Admin' : loginDetails.email)}
                                                    </option>
                                                ) : (
                                                    employees.map((employee, index) => {
                                                        if (!currentProfiles.includes(employee.i_d) && !employee.dismissalDate) {
                                                            return (
                                                                <option key={index} value={employee.i_d}>
                                                                    {employee.firstName} {employee.lastName} ({employee.i_d})
                                                                </option>
                                                            )
                                                        }
                                                        return null
                                                    })
                                                )}
                                            </select>
                                        </div>

                                         <div className='inpcov'>
                                            <div>Access Password</div>
                                            <div className="input-with-action">
                                                <input
                                                    className='forminp'
                                                    name='password'
                                                    type={showPass ? 'text' : 'password'}
                                                    placeholder='••••••••'
                                                    value={loginDetails.password}
                                                    onChange={handleLoginDetailsChange}
                                                />
                                                {selectedEmployee && (
                                                    <button className="view-pass-btn" onClick={() => setShowPass(!showPass)}>
                                                        {showPass ? <IoEyeOff /> : <IoEye />}
                                                    </button>
                                                )}
                                            </div>
                                            {selectedEmployee && (
                                                <div className="pass-display-section" onClick={() => setShowPass(!showPass)}>
                                                    <span className="pass-toggle-text">{showPass ? 'Hide Password' : 'View Current Password'}</span>
                                                    {showPass && <span className="actual-pass"> : {DBProfiles.find(p => p.emailid === selectedEmployee.emailid)?.password || 'Not found in database'}</span>}
                                                </div>
                                            )}
                                         </div>
                                    </div>



                                    <div className="permissions-container">
                                        <div className="permission-group">
                                            <div className="group-label">Module Access</div>
                                            <div className='permissions'>
                                                {modulePermissions.map((p, i) => (
                                                    <label key={i} className='permission-label'>
                                                        <input type='checkbox' value={p} checked={loginDetails.permissions.includes(p) || loginDetails.permissions.includes('all')} onChange={handlePermissionsChange} />
                                                        <span className='permission-text'>{p}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="permission-grid">
                                            <div className="permission-group">
                                                <div className="group-label">Sales Channels</div>
                                                <div className='permissions'>
                                                    {salesPostsPermissions.map((p, i) => (
                                                        <label key={i} className='permission-label'>
                                                            <input type='checkbox' value={p} checked={loginDetails.permissions.includes(p) || loginDetails.permissions.includes('all')} onChange={handlePermissionsChange} />
                                                            <span className='permission-text'>{p}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="permission-group">
                                                <div className="group-label">Delivery Control</div>
                                                <div className='permissions'>
                                                    {deliveryPostsPermissions.map((p, i) => (
                                                        <label key={i} className='permission-label'>
                                                            <input type='checkbox' value={p} checked={loginDetails.permissions.includes(p) || loginDetails.permissions.includes('all')} onChange={handlePermissionsChange} />
                                                            <span className='permission-text'>{p}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="permission-grid">
                                            <div className="permission-group">
                                                <div className="group-label">Operational Posting</div>
                                                <div className='permissions'>
                                                    {postingPermissions.map((p, i) => (
                                                        <label key={i} className='permission-label'>
                                                            <input type='checkbox' value={p} checked={loginDetails.permissions.includes(p) || loginDetails.permissions.includes('all')} onChange={handlePermissionsChange} />
                                                            <span className='permission-text'>{p}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="permission-group">
                                                <div className="group-label">Approval Authority</div>
                                                <div className='permissions'>
                                                    {approvalPermissions.map((p, i) => (
                                                        <label key={i} className='permission-label'>
                                                            <input type='checkbox' value={p} checked={loginDetails.permissions.includes(p) || loginDetails.permissions.includes('all')} onChange={handlePermissionsChange} />
                                                            <span className='permission-text'>{p}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="permission-grid">
                                            <div className="permission-group">
                                                <div className="group-label">System Security</div>
                                                <div className='permissions'>
                                                    {editDeletePermissions.map((p, i) => (
                                                        <label key={i} className='permission-label'>
                                                            <input type='checkbox' value={p} checked={loginDetails.permissions.includes(p) || loginDetails.permissions.includes('all')} onChange={handlePermissionsChange} />
                                                            <span className='permission-text'>{p}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="permission-group">
                                                <div className="group-label">POS Management</div>
                                                <div className='permissions'>
                                                    {posAdminPermissions.map((p, i) => (
                                                        <label key={i} className='permission-label'>
                                                            <input type='checkbox' value={p} checked={loginDetails.permissions.includes(p) || loginDetails.permissions.includes('all')} onChange={handlePermissionsChange} />
                                                            <span className='permission-text'>{p}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="permission-grid">
                                            <div className="permission-group">
                                                <div className="group-label">Inventory Logistics</div>
                                                <div className='permissions'>
                                                    {stockTransferPermissions.map((p, i) => (
                                                        <label key={i} className='permission-label'>
                                                            <input type='checkbox' value={p} checked={loginDetails.permissions.includes(p) || loginDetails.permissions.includes('all')} onChange={handlePermissionsChange} />
                                                            <span className='permission-text'>{p}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="permission-group">
                                                <div className="group-label">Data Handling</div>
                                                <div className='permissions'>
                                                    {importExportPermissions.map((p, i) => (
                                                        <label key={i} className='permission-label'>
                                                            <input type='checkbox' value={p} checked={loginDetails.permissions.includes(p) || loginDetails.permissions.includes('all')} onChange={handlePermissionsChange} />
                                                            <span className='permission-text'>{p}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-toggles">
                                        <div className='inpcov'>
                                            <div>Login Access</div>
                                            <label className='toggle-switch'>
                                                <input type='checkbox' name='enableLogin' checked={loginDetails.enableLogin} onChange={handleLoginDetailsChange} />
                                                <span className='slider'></span>
                                            </label>
                                        </div>
                                        <div className='inpcov'>
                                            <div>Debt Recovery</div>
                                            <label className='toggle-switch'>
                                                <input type='checkbox' name='enableDebtRecovery' checked={loginDetails.enableDebtRecovery} onChange={handleLoginDetailsChange} />
                                                <span className='slider'></span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        {(selectedEmployee?.access !== 'admin' || !selectedEmployee) && (
                                            <button className='savebtn' onClick={saveLoginDetails}>
                                                <IoSave /> Save Changes
                                            </button>
                                        )}
                                        {selectedEmployee && selectedEmployee.status !== 'admin' && (
                                            <button className='deletebtn' onClick={deleteProfile}>
                                                <IoTrash /> {deleteCount === selectedEmployee.emailid ? 'Confirm Delete' : 'Remove Profile'}
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )
            case 'billing':
                return <BillingSettingsPanel variants={variants} />
            case 'accounting':
                return renderAccountingView(variants)
            case 'approvals':
                return (
                    <motion.div
                        className='settings-accounting'
                        initial="initial" animate="animate" exit="exit" variants={variants}
                    >
                        <div className='settings-accounting-hero'>
                            <div>
                                <span>Approval Control</span>
                                <h2>Workflow Approvals</h2>
                                <p>Configure approvers, approval ranks, and protected sections per module. Sections are comma-separated, for example: <b>posttransfer, all</b>.</p>
                            </div>
                            <button className='settings-accounting-save' onClick={saveApprovalConfig} disabled={!canConfigureApprovals}>
                                <IoSave /> Save Approval Rules
                            </button>
                        </div>
                        {!canConfigureApprovals && (
                            <div className='settings-accounting-card'>
                                <div className='settings-accounting-card-header'>
                                    <h3>Restricted Area</h3>
                                    <span>Only admins or users with configure_approvals can edit this section.</span>
                                </div>
                            </div>
                        )}
                        <div className='settings-accounting-grid'>
                            {Object.entries(approvalConfig.modules || {}).map(([moduleName, moduleConfig]) => (
                                <div className='settings-accounting-card' key={moduleName}>
                                    <div className='settings-accounting-card-header'>
                                        <h3>{moduleName.toUpperCase()}</h3>
                                        <span>{Object.keys(moduleConfig.approverIds || {}).length} approver{Object.keys(moduleConfig.approverIds || {}).length === 1 ? '' : 's'}</span>
                                    </div>
                                    <div className='settings-accounting-fields'>
                                        <div className='inpcov settings-accounting-field'>
                                            <div>Approval Type</div>
                                            <select className='forminp' value={moduleConfig.type || 'rank'} onChange={(e) => updateApprovalModule(moduleName, 'type', e.target.value)} disabled={!canConfigureApprovals}>
                                                <option value='rank'>Rank</option>
                                            </select>
                                        </div>
                                        <div className='inpcov settings-accounting-field'>
                                            <div>Final Level</div>
                                            <input className='forminp' type='number' value={moduleConfig.finalLevel ?? 0} onChange={(e) => updateApprovalModule(moduleName, 'finalLevel', e.target.value)} disabled={!canConfigureApprovals} />
                                        </div>
                                    </div>
                                    <div className='settings-accounting-list'>
                                        {Object.entries(moduleConfig.approverIds || {}).map(([approverId, approver]) => (
                                            <div className='settings-accounting-list-row' key={approverId}>
                                                <strong>{approverId}</strong>
                                                <input className='forminp' type='number' value={approver.rank ?? 0} onChange={(e) => updateApprovalApprover(moduleName, approverId, 'rank', e.target.value)} disabled={!canConfigureApprovals} />
                                                <input className='forminp' value={(approver.sections || []).join(', ')} onChange={(e) => updateApprovalApprover(moduleName, approverId, 'sections', e.target.value)} disabled={!canConfigureApprovals} />
                                                {canConfigureApprovals && <button className='deletebtn' onClick={() => removeApprovalApprover(moduleName, approverId)}><IoTrash /></button>}
                                            </div>
                                        ))}
                                    </div>
                                    {canConfigureApprovals && <button className='general-propSet-add' onClick={() => addApprovalApprover(moduleName)}><IoAdd /> Add Approver</button>}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )
            case 'payroll':
                return (
                    <motion.div 
                        className='payroll-settings'
                        initial="initial" animate="animate" exit="exit" variants={variants}
                    >
                        <div className="form-card">
                            <div className='formtitle'><IoCard /> Column Management</div>
                            <div className='inpcov'>
                                <div>New Column Name</div>
                                <div className='addsection'>
                                    <input
                                        className='forminp'
                                        name='colname'
                                        type='text'
                                        placeholder='Enter label name...'
                                        value={colname}
                                        onChange={(e) => setColname(e.target.value)}
                                    />
                                    <button className='addcolumn' onClick={addColumn}>
                                        {writeStatus === 'Edit' ? 'Update' : 'Add Column'}
                                    </button>
                                    {writeStatus === 'Edit' && (
                                        <button className='addcolumn dcol' onClick={() => { setEditCol(null); setColname(''); setWriteStatus('Add'); }}>
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className='columnsbox'>
                                {colSettings.import_columns?.map((col, id) => (
                                    <motion.div 
                                        whileHover={{ scale: 1.02 }}
                                        className='col' 
                                        key={id} 
                                        onClick={() => { setWriteStatus('Edit'); setColname(col); setEditCol(col); }}
                                    >
                                        {col}
                                        <div className='delcol' onClick={(e) => { e.stopPropagation(); delColumn({ target: { getAttribute: () => id } }); }}>
                                            <IoTrash />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )
            case 'general':
                return (
                    <motion.div 
                        className='general-settings'
                        initial="initial" animate="animate" exit="exit" variants={variants}
                    >
                        <div className='sidebar'>
                            <div className='sidebar-header'>
                                <div className="sidebar-title"><IoOptions /> Categories</div>
                            </div>
                            <div className='profile-list'>
                                {settingGroups.map((setting, index) => (
                                    <div key={index} className={'profile-item ' + (currentSetting?.name === setting.name ? 'profile-item-active' : '')} onClick={() => handleSettingSelect(setting)}>
                                        {setting.desc}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className='general-details'>
                            <div className="form-card">
                                <div className='formtitle'><IoSettings /> {currentSetting?.desc} Configuration</div>

                                {currentSetting?.name === 'posReconciliation' ? (
                                    <div className="form-fields-container">
                                        <p className='settings-accounting-copy'>
                                            When enabled, POS agents must save a closing-stock reconciliation for every selected location before that session manager's session can be ended. Only the locations selected below appear in the Reconciliation add-stock screen.
                                        </p>
                                        <div className='inpcov toggle-row'>
                                            <div>Require Reconciliation Before Ending Session</div>
                                            <label className='toggle-switch'>
                                                <input
                                                    type='checkbox'
                                                    checked={!!posReconciliationConfig.enabled}
                                                    disabled={!canConfigurePosReconciliation}
                                                    onChange={(e) => setPosReconciliationConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                                                />
                                                <span className='slider'></span>
                                            </label>
                                        </div>
                                        <div className="section-divider">Locations Included in Reconciliation Validation</div>
                                        <div className='permissions'>
                                            {wrhs.filter((wrh) => !wrh.purchase).map((wrh, i) => (
                                                <label key={i} className='permission-label'>
                                                    <input
                                                        type='checkbox'
                                                        checked={(posReconciliationConfig.locations || []).includes(wrh.name)}
                                                        disabled={!canConfigurePosReconciliation}
                                                        onChange={() => togglePosReconciliationLocation(wrh.name)}
                                                    />
                                                    <span className='permission-text'>{wrh.name}</span>
                                                </label>
                                            ))}
                                            {!wrhs.filter((wrh) => !wrh.purchase).length && (
                                                <div className='settings-accounting-empty'>No non-purchase warehouses configured yet.</div>
                                            )}
                                        </div>
                                        <div className="form-actions" style={{ marginTop: '40px' }}>
                                            <button className='savebtn' onClick={savePosReconciliationConfig} disabled={!canConfigurePosReconciliation}><IoSave /> Save Configuration</button>
                                        </div>
                                    </div>
                                ) : (
                                <>
                                <div className='general-body'>
                                    {!['posSettings'].includes(currentSetting.name) && (
                                        <button className='general-propSet-add' onClick={() => resetToDefault(currentSetting)}>
                                            <IoAdd /> Create New
                                        </button>
                                    )}
                                    {currentSetting[currentSetting.prop]?.map((propSet, id) => (
                                        <div
                                            className={`general-propSet ${curPropSet?.name === propSet.name ? 'active-propSet' : ''}`}
                                            key={id}
                                            onClick={() => {
                                                if (currentSetting.name === 'warehouses') {
                                                    setSelectedCategories(propSet.productCategories || [])
                                                    setSelectedPaymentMethods(propSet.paymentMethods || [])
                                                }
                                                setPropState('view')
                                                setCurPropSet(propSet)
                                            }}
                                        >
                                            {propSet.name}
                                        </div>
                                    ))}
                                </div>

                                <div className="form-fields-container">
                                    {['paymentMethods'].includes(currentSetting.name) && (
                                        <div className='inpcov'>
                                            <div>Payment ID</div>
                                            <input className='forminp' name='i_d' value={curPropSet?.i_d} onChange={handlePropSetChange} />
                                        </div>
                                    )}
                                    {['uom', 'product_categories'].includes(currentSetting.name) && (
                                        <div className='inpcov'>
                                            <div>Reference Code</div>
                                            <input className='forminp' name='code' value={curPropSet?.code} onChange={handlePropSetChange} />
                                        </div>
                                    )}
                                    <div className='inpcov'>
                                        <div>Display Name</div>
                                        <input className='forminp' name='name' value={curPropSet.name} onChange={handlePropSetChange} />
                                    </div>

                                    {/* Type Specific Fields */}
                                    <div className="type-options-grid">
                                        {['uom', 'product_categories', 'paymentMethods', 'posSettings'].includes(currentSetting.name) && (
                                            <div className='inpcov'>
                                                <div>Classification Type</div>
                                                <select className='forminp' name='type' value={curPropSet.type} onChange={handlePropSetChange}>
                                                    <option value=''>Select Type</option>
                                                    {currentSetting?.types?.map((t, i) => <option key={i} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {['uom'].includes(currentSetting.name) && (
                                            <>
                                                <div className='inpcov'>
                                                    <div>Base Unit</div>
                                                    <select className='forminp' name='base' value={curPropSet.base} onChange={handlePropSetChange}>
                                                        <option value=''>Fixed Base</option>
                                                        {currentSetting?.bases?.map((b, i) => <option key={i} value={b}>{b}</option>)}
                                                    </select>
                                                </div>
                                                <div className='inpcov'>
                                                    <div>Multiplier</div>
                                                    <input className='forminp' name='multiple' type="number" value={curPropSet.multiple} onChange={handlePropSetChange} />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Warehouse Specific */}
                                    {['warehouses'].includes(currentSetting.name) && (
                                        <>
                                            <div className='inpcov toggle-row'>
                                                <div>Primary Purchase Location</div>
                                                <label className='toggle-switch'>
                                                    <input type='checkbox' name='purchase' checked={curPropSet.purchase} onChange={handlePropSetChange} />
                                                    <span className='slider'></span>
                                                </label>
                                            </div>
                                            <div className="section-divider">Allowed Categories</div>
                                            <div className='permissions'>
                                                {categories.map((cat, i) => (
                                                    <label key={i} className='permission-label'>
                                                        <input type='checkbox' checked={selectedCategories.includes(cat.code)} onChange={() => setSelectedCategories(prev => prev.includes(cat.code) ? prev.filter(c => c !== cat.code) : [...prev, cat.code])} />
                                                        <span className='permission-text'>{cat.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <div className="section-divider">Allowed Payment Methods</div>
                                            <div className='permissions'>
                                                {paymentMethods.map((pay, i) => (
                                                    <label key={i} className='permission-label'>
                                                        <input type='checkbox' checked={selectedPaymentMethods.includes(pay.name)} onChange={() => setSelectedPaymentMethods(prev => prev.includes(pay.name) ? prev.filter(p => p !== pay.name) : [...prev, pay.name])} />
                                                        <span className='permission-text'>{pay.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* Payment Method Specific */}
                                    {['paymentMethods'].includes(currentSetting.name) && (
                                        <div className="type-options-grid" style={{ marginTop: '20px' }}>
                                            <div className='inpcov toggle-row'>
                                                <div>Sales Account</div>
                                                <label className='toggle-switch'>
                                                    <input type='checkbox' name='isSalesAccount' checked={curPropSet.isSalesAccount} onChange={handlePropSetChange} />
                                                    <span className='slider'></span>
                                                </label>
                                            </div>
                                            <div className='inpcov toggle-row'>
                                                <div>Expense Account</div>
                                                <label className='toggle-switch'>
                                                    <input type='checkbox' name='isExpenseAccount' checked={curPropSet.isExpenseAccount} onChange={handlePropSetChange} />
                                                    <span className='slider'></span>
                                                </label>
                                            </div>
                                            <div className='inpcov' style={{ gridColumn: 'span 2' }}>
                                                <div>Bank/Account Number</div>
                                                <input
                                                    className='forminp'
                                                    name='account'
                                                    value={curPropSet.account}
                                                    placeholder='Enter bank account number or wallet reference'
                                                    onChange={handlePropSetChange}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* POS Settings Specific */}
                                    {['posSettings'].includes(currentSetting.name) && (
                                        <div className="pos-settings-grid">
                                            <div className='inpcov toggle-row'>
                                                <div>Active Status</div>
                                                <label className='toggle-switch'>
                                                    <input type='checkbox' name='active' checked={curPropSet.active} onChange={handlePropSetChange} />
                                                    <span className='slider'></span>
                                                </label>
                                            </div>
                                            <div className="form-grid">
                                                <div className='inpcov'>
                                                    <div>Terminal Size</div>
                                                    <input className='forminp' name='size' type="number" value={curPropSet.size} onChange={handlePropSetChange} />
                                                </div>
                                                <div className='inpcov'>
                                                    <div>Terminal Capacity</div>
                                                    <input className='forminp' name='capacity' type="number" value={curPropSet.capacity} onChange={handlePropSetChange} />
                                                </div>
                                                <div className='inpcov' style={{ gridColumn: 'span 2' }}>
                                                    <div>Session-End Hour (Auto)</div>
                                                    <select className='forminp' name='sessHour' value={curPropSet.sessHour} onChange={handlePropSetChange}>
                                                        <option>Select Session-End Hour</option>
                                                        {sessionPeriods.map((hour, id) => <option key={id} value={hour}>{hour}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="section-divider">Operation & Printing</div>
                                            <div className="toggles-grid">
                                                <div className='inpcov toggle-row'>
                                                    <div>Enable Sales Mark-Up</div>
                                                    <label className='toggle-switch'>
                                                        <input type='checkbox' name='useMarkUp' checked={curPropSet.useMarkUp} onChange={handlePropSetChange} />
                                                        <span className='slider'></span>
                                                    </label>
                                                </div>
                                                <div className='inpcov toggle-row'>
                                                    <div>Print Payment Receipts</div>
                                                    <label className='toggle-switch'>
                                                        <input type='checkbox' name='printPaymentReceipt' checked={curPropSet.printPaymentReceipt} onChange={handlePropSetChange} />
                                                        <span className='slider'></span>
                                                    </label>
                                                </div>
                                                {curPropSet.type === 'restaurant' && (
                                                    <>
                                                        <div className='inpcov toggle-row'>
                                                            <div>Print Kitchen Receipts</div>
                                                            <label className='toggle-switch'>
                                                                <input type='checkbox' name='printKitchenReceipt' checked={curPropSet.printKitchenReceipt} onChange={handlePropSetChange} />
                                                                <span className='slider'></span>
                                                            </label>
                                                        </div>
                                                        <div className='inpcov toggle-row'>
                                                            <div>Print Bar Receipts</div>
                                                            <label className='toggle-switch'>
                                                                <input type='checkbox' name='printBarReceipt' checked={curPropSet.printBarReceipt} onChange={handlePropSetChange} />
                                                                <span className='slider'></span>
                                                            </label>
                                                        </div>
                                                        <div className='inpcov toggle-row'>
                                                            <div>Print Customer Order</div>
                                                            <label className='toggle-switch'>
                                                                <input type='checkbox' name='printCustomerOrder' checked={curPropSet.printCustomerOrder} onChange={handlePropSetChange} />
                                                                <span className='slider'></span>
                                                            </label>
                                                        </div>
                                                    </>
                                                )}
                                                <div className='inpcov toggle-row'>
                                                    <div>Automate Order Delivery</div>
                                                    <label className='toggle-switch'>
                                                        <input type='checkbox' name='automateOrderDelivery' checked={curPropSet.automateOrderDelivery} onChange={handlePropSetChange} />
                                                        <span className='slider'></span>
                                                    </label>
                                                </div>
                                                {curPropSet.type === 'restaurant' && (
                                                    <div className='inpcov toggle-row'>
                                                        <div>Automate Kitchen Delivery</div>
                                                        <label className='toggle-switch'>
                                                            <input type='checkbox' name='automateKitchenDelivery' checked={curPropSet.automateKitchenDelivery} onChange={handlePropSetChange} />
                                                            <span className='slider'></span>
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-actions" style={{ marginTop: '40px' }}>
                                        <button className='savebtn' onClick={saveSettings}><IoSave /> Save Configuration</button>
                                        {companyRecord?.access === 'admin' && propState !== 'new' && (
                                            <button className='deletebtn' onClick={deleteSettingsProp}><IoTrash /> Delete</button>
                                        )}
                                    </div>
                                </div>
                                </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )
            case 'company':
                return (
                    <motion.div className='general-settings' initial="initial" animate="animate" exit="exit" variants={variants}>
                        <div className='general-details'>
                            <div className='form-card'>
                            <div className='formtitle'><IoSettings /> Company Profile</div>
                                            <div className='form-grid'>
                                                <div className='inpcov'>
                                                    <div>Subdomain</div>
                                                    <input className='forminp' name='subdomain' value={companyProfile?.subdomain || ''} onChange={handleCompanyFieldChange} disabled />
                                                </div>
                                                <div className='inpcov'>
                                                    <div>Database</div>
                                                    <input className='forminp' name='db' value={companyProfile?.db || ''} onChange={handleCompanyFieldChange} disabled />
                                                </div>
                                                <div className='inpcov'>
                                                    <div>Company Name</div>
                                                    <input className='forminp' name='name' value={companyProfile?.name || ''} onChange={handleCompanyFieldChange} />
                                                </div>
                                                <div className='inpcov'>
                                                    <div>Email</div>
                                                    <input className='forminp' name='email' value={companyProfile?.email || ''} onChange={handleCompanyFieldChange} />
                                                </div>
                                                <div className='inpcov'>
                                                    <div>Phone</div>
                                                    <input className='forminp' name='phone' value={companyProfile?.phone || ''} onChange={handleCompanyFieldChange} />
                                                </div>
                                                <div className='inpcov'>
                                                    <div>Address</div>
                                                    <input className='forminp' name='address' value={companyProfile?.address || ''} onChange={handleCompanyFieldChange} />
                                                </div>
                                                <div className='inpcov'>
                                                    <div>City</div>
                                                    <input className='forminp' name='city' value={companyProfile?.city || ''} onChange={handleCompanyFieldChange} />
                                                </div>
                                                <div className='inpcov'>
                                                    <div>State</div>
                                                    <input className='forminp' name='state' value={companyProfile?.state || ''} onChange={handleCompanyFieldChange} />
                                                </div>
                                                <div className='inpcov'>
                                                    <div>Country</div>
                                                    <input className='forminp' name='country' value={companyProfile?.country || ''} onChange={handleCompanyFieldChange} />
                                                </div>
                                                <div className='inpcov'>
                                                    <div>Company Logo</div>
                                                    <input className='forminp' type='file' accept='image/*' onChange={(e) => handleCompanyFileChange(e, 'logo')} />
                                                    {companyProfile?.logoUrl && <div style={{ marginTop: 8 }}><img src={companyProfile.logoUrl} alt='logo' style={{ maxWidth: 160, maxHeight: 80 }} /></div>}
                                                </div>
                                                <div className='inpcov'>
                                                    <div>Management Signature</div>
                                                    <input className='forminp' type='file' accept='image/*' onChange={(e) => handleCompanyFileChange(e, 'signature')} />
                                                    {companyProfile?.signatureUrl && <div style={{ marginTop: 8 }}><img src={companyProfile.signatureUrl} alt='signature' style={{ maxWidth: 260, maxHeight: 120 }} /></div>}
                                                </div>
                                                <div className='inpcov'>
                                                    <div>Pause DB</div>
                                                    <input className='forminp' type='checkbox' style={{ width: 'auto' }} checked={!!companyProfile?.pauseDB} disabled />
                                                </div>
                                                <div className='inpcov'>
                                                    <div>Manual Pause</div>
                                                    <input className='forminp' type='checkbox' style={{ width: 'auto' }} checked={!!companyProfile?.manualPauseDB} disabled />
                                                </div>
                                                <div className='inpcov' style={{ gridColumn: '1 / -1' }}>
                                                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Subscription / Trial (read-only)</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                                        <div>
                                                            <div>Subscription Status</div>
                                                            <input className='forminp' value={companyProfile?.subscriptionStatus || ''} disabled />
                                                        </div>
                                                        <div>
                                                            <div>Plan Name</div>
                                                            <input className='forminp' value={companyProfile?.subscriptionPlanName || ''} disabled />
                                                        </div>
                                                        <div>
                                                            <div>Reference</div>
                                                            <input className='forminp' value={companyProfile?.subscriptionReference || ''} disabled />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                            <div className='form-actions'>
                                <button className='savebtn' onClick={saveCompanyProfile}><IoSave /> Save Company Profile</button>
                            </div>
                            </div>
                        </div>
                    </motion.div>
                )
            default:
                return null
        }
    }

    return (
        <div className='settings' onClick={handleSecretAccess}>
            <input
                className='saccess1'
                name='access'
                value={accessValue}
                onChange={handleSecretAccess}
                disabled={accessValue === magicWord || accessValue === activationWord}
            />
            <AnimatePresence>
                {saveStatus && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className='save-status'
                    >
                        {saveStatus}
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="settings-header">
                <div className="settings-nav">
                    <div className={`settings-nav-item ${currentView === 'employees' ? 'active' : ''}`} onClick={() => setCurrentView('employees')}>
                         <IoPerson /> Team Access
                    </div>
                    <div className={`settings-nav-item ${currentView === 'general' ? 'active' : ''}`} onClick={() => setCurrentView('general')}>
                        <IoOptions /> General Config
                    </div>
                    <div className={`settings-nav-item ${currentView === 'accounting' ? 'active' : ''}`} onClick={() => setCurrentView('accounting')}>
                        <IoSettings /> Accounting Links
                    </div>
                    {canConfigureApprovals && (
                        <div className={`settings-nav-item ${currentView === 'approvals' ? 'active' : ''}`} onClick={() => setCurrentView('approvals')}>
                            <IoSettings /> Approval Rules
                        </div>
                    )}
                    {companyRecord?.access === 'admin' && (
                        <div className={`settings-nav-item ${currentView === 'billing' ? 'active' : ''}`} onClick={() => setCurrentView('billing')}>
                            <IoCard /> Billing & Plan
                        </div>
                    )}
                    {companyRecord?.access === 'admin' && (
                        <div className={`settings-nav-item ${currentView === 'company' ? 'active' : ''}`} onClick={() => setCurrentView('company')}>
                            <IoPerson /> Company Profile
                        </div>
                    )}
                    <div className={`settings-nav-item ${currentView === 'payroll' ? 'active' : ''}`} onClick={() => setCurrentView('payroll')}>
                        <IoCard /> Payroll Labels
                    </div>
                </div>
            </header>

            <main className="settings-content">
                <AnimatePresence mode='wait'>
                    {renderView()}
                </AnimatePresence>
            </main>
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
