import './Employees.css'

import { useEffect, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'
import { uploadFile } from '../../Resources/ClientServerAPIConn/API/fileCrudApi'
import heic2any from 'heic2any'

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
    const [employeeSaving, setEmployeeSaving] = useState(false)
    const [employeeUploadStatus, setEmployeeUploadStatus] = useState('')
    const [employeeUploadError, setEmployeeUploadError] = useState('')
    const initFields = {
        i_d: '',
        email: '',
        emailid: '',
        domainName: '',
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
        guarantorFormCreatedAt: '',
        profilePhotoId: '',
        profilePhotoUrl: '',
        guarantorPhotoId: '',
        guarantorPhotoUrl: '',
    }
    const [fields, setFields] = useState({ ...initFields })
    const [pendingPhotos, setPendingPhotos] = useState({ profile: null, guarantor: null })
    useEffect(() => {
        storePath('employees')
        document.title = 'Employees | Enterprise Compute Central'   
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
        setPendingPhotos({ profile: null, guarantor: null })
        setEmployeeUploadStatus('')
        setEmployeeUploadError('')
        setMobileDetailOpen(false)
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
    const getUploadErrorMessage = (error, fallback) => {
        const code = error?.code || error?.response?.code
        const message = error?.message || error?.mess || fallback
        if (code === 'GOOGLE_DRIVE_AUTH_EXPIRED' || String(message || '').toLowerCase().includes('invalid_grant')) {
            return 'Google Drive authorization has expired. Refresh the Google Drive token on the server, then try this upload again.'
        }
        if (code === 'UPLOAD_TIMEOUT') {
            return 'Image upload timed out. The employee details were saved, but the photo was not uploaded. Try again with a smaller image or a stronger connection.'
        }
        return message || fallback
    }

    const getEmployeeForInitialSave = (employee, existingEmployee = {}) => {
        const nextEmployee = { ...employee }
        if (pendingPhotos.profile) {
            nextEmployee.profilePhotoId = existingEmployee.profilePhotoId || ''
            nextEmployee.profilePhotoUrl = existingEmployee.profilePhotoUrl || ''
            nextEmployee.profilePhotoViewLink = existingEmployee.profilePhotoViewLink || ''
            nextEmployee.profilePhotoDownloadLink = existingEmployee.profilePhotoDownloadLink || ''
        }
        if (pendingPhotos.guarantor) {
            nextEmployee.guarantorPhotoId = existingEmployee.guarantorPhotoId || ''
            nextEmployee.guarantorPhotoUrl = existingEmployee.guarantorPhotoUrl || ''
            nextEmployee.guarantorPhotoViewLink = existingEmployee.guarantorPhotoViewLink || ''
            nextEmployee.guarantorPhotoDownloadLink = existingEmployee.guarantorPhotoDownloadLink || ''
        }
        return nextEmployee
    }

    const addEmployee = async () => {
        if (employeeSaving) return
        setEmployeeSaving(true)
        setEmployeeUploadStatus('')
        setEmployeeUploadError('')
        setAlertState('info')
        setAlert(
            `Adding Employee...`
        )
        if (fields.i_d) {
            const createdAt = Date.now()
            const newEmployee = {
                ...getEmployeeForInitialSave(fields),
                createdAt
            }
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
                let employeeWithPhotos = newEmployee
                let photoUploadFailed = false
                try {
                    setEmployeeUploadStatus('Saving employee record completed. Preparing optional photo upload...')
                    employeeWithPhotos = await uploadEmployeePhotos(newEmployee)
                } catch (error) {
                    photoUploadFailed = true
                    const uploadMessage = getUploadErrorMessage(error, 'Employee was created, but photo upload failed. Please edit the employee and try again.')
                    setEmployeeUploadError(uploadMessage)
                    setAlertState('error')
                    setAlert(uploadMessage)
                    setAlertTimeout(5000)
                }
                if (employeeWithPhotos !== newEmployee) {
                    setEmployeeUploadStatus('Photo uploaded. Updating employee photo links...')
                    await fetchServer("POST", {
                        database: company,
                        collection: "Employees",
                        prop: [{ i_d: newEmployee.i_d }, employeeWithPhotos]
                    }, "updateOneDoc", server)
                }
                setEmployees([...employees, employeeWithPhotos])
                setCurEmployee(employeeWithPhotos)
                setIsView(!photoUploadFailed)
                if (photoUploadFailed) {
                    setWriteStatus('Edit')
                }
                setFields({ ...employeeWithPhotos })
                if (!photoUploadFailed) {
                    setPendingPhotos({ profile: null, guarantor: null })
                    setEmployeeUploadStatus('')
                }
                if (!photoUploadFailed) {
                    setAlertState('success')
                    setAlert(
                        'Employee Added Successfully!'
                    )
                    setAlertTimeout(1000)
                }
                getEmployees(company)
            }
        } else {
            setAlertState('error')
            setAlert('Employee ID is required before saving.')
            setAlertTimeout(3000)
        }
        setEmployeeSaving(false)
    }
    const editEmployee = async () => {
        if (employeeSaving) return
        setEmployeeSaving(true)
        setEmployeeUploadStatus('')
        setEmployeeUploadError('')
        setAlertState('info')
        setAlert(
            `Updating Employee...`
        )
        const i_d = curEmployee.i_d
        const index = Number(editIndex)
        if (fields.i_d) {
            const existingEmployee = curEmployee || employees[index] || {}
            const updatedEmployee = {
                ...getEmployeeForInitialSave(fields, existingEmployee),
                createdAt: existingEmployee.createdAt || fields.createdAt || Date.now()
            }
            const filteredEmp = employees.filter((emp) => {
                return emp.i_d !== i_d
            })
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
                let employeeWithPhotos = updatedEmployee
                let photoUploadFailed = false
                try {
                    setEmployeeUploadStatus('Employee details saved. Preparing optional photo upload...')
                    employeeWithPhotos = await uploadEmployeePhotos(updatedEmployee)
                    if (employeeWithPhotos !== updatedEmployee) {
                        setEmployeeUploadStatus('Photo uploaded. Updating employee photo links...')
                        const photoUpdate = await fetchServer("POST", {
                            database: company,
                            collection: "Employees",
                            prop: [{ i_d: i_d }, employeeWithPhotos]
                        }, "updateOneDoc", server)
                        if (photoUpdate?.err) {
                            throw new Error(photoUpdate.mess || 'Photo uploaded, but employee photo links were not saved.')
                        }
                    }
                } catch (error) {
                    photoUploadFailed = true
                    const uploadMessage = getUploadErrorMessage(error, 'Employee details were saved, but photo upload failed. Please try the photo upload again.')
                    setEmployeeUploadError(uploadMessage)
                    setAlertState('error')
                    setAlert(uploadMessage)
                    setAlertTimeout(6000)
                }
                const updatedEmployees = [...filteredEmp, employeeWithPhotos]
                setEmployees(updatedEmployees)
                setCurEmployee(employeeWithPhotos)
                setIsView(!photoUploadFailed)
                setFields({ ...employeeWithPhotos })
                if (!photoUploadFailed) {
                    setPendingPhotos({ profile: null, guarantor: null })
                    setEmployeeUploadStatus('')
                    setAlertState('success')
                    setAlert(
                        'Employee Details Updated Successfully!'
                    )
                    setAlertTimeout(1000)
                }
                getEmployees(company)
            }
        } else {
            setAlertState('error')
            setAlert('Employee ID is required before saving.')
            setAlertTimeout(3000)
        }
        setEmployeeSaving(false)
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
    const getDriveThumbnailUrl = (imgId) => imgId ? `https://drive.google.com/thumbnail?id=${imgId}&sz=w1000` : ''

    const uploadEmployeePhotos = async (employee) => {
        let nextEmployee = { ...employee }
        const uploadOne = async (file, kind) => {
            if (!file) return
            setEmployeeUploadError('')
            setEmployeeUploadStatus(`${kind === 'profile' ? 'Employee profile photo' : 'Guarantor photo'}: compressing and uploading...`)
            const folderPath = `${company}/Employee Photos/${kind === 'profile' ? 'Profile Photos' : 'Guarantor Photos'}`
            const res = await uploadFile(file, folderPath, nextEmployee.createdAt, company, 'Employees', server)
            if (res?.mess || res?.err) {
                const err = new Error(res.mess || 'Employee photo upload failed')
                err.code = res.code
                throw err
            }
            const fileId = res?.imgId || res?.fileId || res?.id || res?.imageId || res?.data?.id || res?.data?.imgId || ''
            const fileUrl = getDriveThumbnailUrl(fileId) || res?.downloadLink || res?.viewLink || res?.webViewLink || res?.webContentLink || res?.data?.downloadLink || res?.data?.viewLink || ''
            if (fileId) {
                setEmployeeUploadStatus(`${kind === 'profile' ? 'Employee profile photo' : 'Guarantor photo'} uploaded successfully.`)
                nextEmployee = {
                    ...nextEmployee,
                    [kind === 'profile' ? 'profilePhotoId' : 'guarantorPhotoId']: fileId,
                    [kind === 'profile' ? 'profilePhotoUrl' : 'guarantorPhotoUrl']: fileUrl,
                    [kind === 'profile' ? 'profilePhotoViewLink' : 'guarantorPhotoViewLink']: res?.viewLink || '',
                    [kind === 'profile' ? 'profilePhotoDownloadLink' : 'guarantorPhotoDownloadLink']: res?.downloadLink || '',
                    [kind === 'profile' ? 'profilePhotoLastUploadedBy' : 'guarantorPhotoLastUploadedBy']: companyRecord?.emailid || '',
                }
            }
        }
        await uploadOne(pendingPhotos.profile, 'profile')
        await uploadOne(pendingPhotos.guarantor, 'guarantor')
        return nextEmployee
    }

    const handlePhotoChange = async (event, kind) => {
        const file = event.target.files?.[0]
        if (!file) return
        let uploadBlob = file
        if (file.type === 'image/heic' || (file.name || '').toLowerCase().endsWith('.heic')) {
            try {
                setEmployeeUploadStatus('Converting HEIC photo to JPEG...')
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
        setEmployeeUploadStatus(`${kind === 'profile' ? 'Employee profile photo' : 'Guarantor photo'} selected. It will be uploaded when you save.`)
        setEmployeeUploadError('')
        const previewUrl = URL.createObjectURL(uploadBlob)
        setPendingPhotos((current) => ({ ...current, [kind]: uploadBlob }))
        setFields((current) => ({
            ...current,
            [kind === 'profile' ? 'profilePhotoUrl' : 'guarantorPhotoUrl']: previewUrl,
        }))
    }
    const safeText = (value) => String(value || '--')
    const printEmployeeDocument = async (type) => {
        const employee = curEmployee || fields
        // fetch central company profile to ensure logo/signature are current
        let centralCompany = null
        try {
            const cpResp = await fetchServer('POST', {}, 'getCompanyProfile', server)
            if (cpResp && !cpResp.err && cpResp.record) centralCompany = cpResp.record
        } catch (e) { /* ignore */ }
        const employeeName = [employee.firstName, employee.otherName, employee.lastName].filter(Boolean).join(' ')
        const titleMap = {
            details: 'Employee Basic and HR Details',
            appointment: 'Appointment Letter',
            guarantor: 'Employee Guarantor Form',
        }
        const rows = [
            ['Employee ID', employee.i_d],
            ['Full Name', employeeName],
            ['Department', employee.department],
            ['Position', employee.position],
            ['Gender', employee.gender],
            ['Phone Number', employee.phoneNo],
            ['Address', employee.address],
            ['Hired Date', employee.hiredDate],
            ['Bank Name', employee.bankName],
            ['Account Number', employee.accountNo],
            ['Salary', employee.salary ? `N${Number(employee.salary).toLocaleString()}` : ''],
            ['Expected Work Days', employee.expectedWorkDays],
        ]
        const guarantorRows = [
            ['Guarantor Name', employee.guarantorName],
            ['Address', employee.guarantorAddress],
            ['Phone Number', employee.guarantorPhoneNo],
            ['Relationship', employee.guarantorRelationship],
            ['Knows Employee For', employee.guarantorKnowsEmploeyeeFor],
            ['Can Vouch', employee.guarantorStance],
        ]
        const appointment = `
            <p>Dear ${safeText(employeeName)},</p>
            <p>We are pleased to confirm your appointment as <strong>${safeText(employee.position)}</strong> in the <strong>${safeText(employee.department)}</strong> department.</p>
            <p>Your appointment takes effect from <strong>${safeText(employee.hiredDate)}</strong>. Your monthly salary is <strong>${employee.salary ? `N${Number(employee.salary).toLocaleString()}` : '--'}</strong>, subject to company policies and applicable deductions.</p>
            <p>Kindly accept this appointment by signing below.</p>
        `
        const printWindow = window.open('', '_blank', 'width=950,height=760')
        if (!printWindow) return
        const photo = employee.profilePhotoUrl ? `<img class="photo" src="${employee.profilePhotoUrl}" alt="Employee" />` : ''
        const guarantorPhoto = employee.guarantorPhotoUrl ? `<img class="photo" src="${employee.guarantorPhotoUrl}" alt="Guarantor" />` : ''
        const table = (list) => list.map(([label, value]) => `<tr><th>${label}</th><td>${safeText(value)}</td></tr>`).join('')
        const signatureUrl = centralCompany?.signatureUrl || companyRecord?.signatureUrl
        const signHtml = type === 'details'
            ? `<div class="sign"><div class="line">Employee Signature / Date</div><div class="line">${signatureUrl ? `<img src="${signatureUrl}" style="max-width:220px;max-height:100px;object-fit:contain;" />` : ''}</div></div>`
            : `<div class="sign"><div class="line">Employee Signature / Date</div><div class="line">${(signatureUrl) ? `<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start;"><img src=\"${signatureUrl}\" style=\"max-width:220px;max-height:100px;object-fit:contain;\" /><div>Authorized Signature / Date</div></div>` : 'Authorized Signature / Date'}</div></div>`
        printWindow.document.write(`
            <html>
                <head>
                    <title>${titleMap[type] || titleMap.details}</title>
                    <style>
                        body { font-family: Montserrat, Arial, sans-serif; color: #173829; margin: 30px; }
                        .sheet { border: 1px solid #dbe7df; border-radius: 20px; padding: 28px; }
                        .head { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; border-bottom:1px solid #e8f0eb; padding-bottom:18px; margin-bottom:20px; }
                        h1 { margin:0; font-size:24px; }
                        p { line-height:1.7; }
                        .photo { width:112px; height:112px; object-fit:cover; border-radius:18px; border:1px solid #dbe7df; }
                        table { width:100%; border-collapse:collapse; margin-top:16px; }
                        th, td { text-align:left; padding:10px 12px; border-bottom:1px solid #edf4ef; font-size:13px; }
                        th { width:30%; color:#6b8175; text-transform:uppercase; font-size:11px; letter-spacing:.06em; }
                        .sign { display:grid; grid-template-columns:1fr 1fr; gap:34px; margin-top:50px; }
                        .line { border-top:1px solid #173829; padding-top:8px; font-size:12px; }
                    </style>
                </head>
                <body>
                    <div class="sheet">
                        <div class="head">
                            <div style="display:flex;align-items:center;gap:12px;">
                                ${(centralCompany?.logoUrl || companyRecord?.logoUrl) ? `<img src="${centralCompany?.logoUrl || companyRecord.logoUrl}" alt="Company Logo" style="width:80px;height:80px;object-fit:contain;border-radius:8px;" />` : ''}
                                <div><h1>${titleMap[type] || titleMap.details}</h1><p>${safeText(centralCompany?.name || companyRecord?.name || company)}</p></div>
                            </div>
                            <div>${type === 'guarantor' ? guarantorPhoto : photo}</div>
                        </div>
                        ${type === 'appointment' ? appointment : `<table>${table(type === 'guarantor' ? guarantorRows : rows)}</table>`}
                        ${signHtml}
                    </div>
                </body>
            </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        // Wait for images to load in the print window before printing to avoid missing photos
        const imgs = printWindow.document.images || []
        const waitForImages = () => new Promise((resolve) => {
            if (!imgs || imgs.length === 0) return resolve()
            let loaded = 0
            const total = imgs.length
            const done = () => {
                loaded += 1
                if (loaded >= total) resolve()
            }
            for (const img of imgs) {
                try {
                    if (img.complete) {
                        done()
                    } else {
                        img.addEventListener('load', done)
                        img.addEventListener('error', done)
                    }
                } catch (e) {
                    done()
                }
            }
            // Fallback timeout in case some images never finish
            setTimeout(resolve, 3000)
        })
        waitForImages().then(() => {
            try { printWindow.print() } catch (e) { /* ignore print errors */ }
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
    const panelEmployeeName = selform === 'Guarantor'
        ? (panelEmployee?.guarantorName || '--')
        : [panelEmployee?.firstName, panelEmployee?.otherName, panelEmployee?.lastName].filter(Boolean).join(' ').trim()
    const panelEmployeeInitials = selform === 'Guarantor'
        ? ([panelEmployee?.guarantorName].filter(Boolean)[0] || 'G').slice(0,2).toUpperCase()
        : ([panelEmployee?.firstName, panelEmployee?.lastName].filter(Boolean).map((name) => name[0]).join('').slice(0, 2).toUpperCase() || 'EC')
    const activePanelPhotoUrl = selform === 'Guarantor'
        ? (getDriveThumbnailUrl(fields.guarantorPhotoId) || fields.guarantorPhotoUrl)
        : (getDriveThumbnailUrl(fields.profilePhotoId) || fields.profilePhotoUrl)
    const activePanelPhotoAlt = selform === 'Guarantor' ? 'Guarantor profile' : 'Employee profile'
    const panelTitle = isView ? 'Employee Profile' : (writeStatus === 'New' ? 'Create Employee' : 'Edit Employee')
    const panelDescription = selform === 'Basic'
        ? 'Personal identity, contact details, and assigned role.'
        : selform === 'Hr'
            ? 'Employment records, salary, and banking information.'
            : 'Guarantor profile and background details.'
    const canEditEmployees = companyRecord.status === 'admin' || editAccess.employees
    const renderEmployeeSaveActions = () => {
        if (isView) return null
        return (
            <div className='employees-form-actions'>
                {(employeeUploadStatus || employeeUploadError) && <div className={'employees-upload-feedback' + (employeeUploadError ? ' error' : '')}>
                    <div className='employees-upload-feedback-title'>
                        {employeeUploadError ? 'Upload attention needed' : 'Upload progress'}
                    </div>
                    <div>{employeeUploadError || employeeUploadStatus}</div>
                </div>}
                {writeStatus === 'Edit' && <button
                    type='button'
                    className='employees-secondary-btn'
                    disabled={employeeSaving}
                    onClick={() => {
                        setIsView(true)
                        setFields({ ...curEmployee })
                        setPendingPhotos({ profile: null, guarantor: null })
                        setEmployeeUploadStatus('')
                        setEmployeeUploadError('')
                    }}
                >
                    Discard
                </button>}
                <button
                    type='button'
                    className='employees-primary-btn'
                    disabled={employeeSaving}
                    onClick={() => {
                        if (writeStatus === 'New') {
                            addEmployee()
                        } else {
                            editEmployee()
                        }
                    }}
                >
                    {employeeSaving ? 'Saving Employee...' : 'Save Employee'}
                </button>
            </div>
        )
    }
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
                                                {employee.email ? <span>{employee.email}</span> : (employee.emailid ? <span>{employee.emailid}</span> : null)}
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
                            <div className='employees-detail-avatar'>
                                {activePanelPhotoUrl
                                    ? <img src={activePanelPhotoUrl} alt={activePanelPhotoAlt} />
                                    : panelEmployeeInitials}
                            </div>
                            <div className='employees-detail-copy'>
                                <div className='employees-detail-kicker'>{panelTitle}</div>
                                <h3>{panelEmployeeName || 'Start a fresh employee record'}</h3>
                                <p>{panelDescription}</p>
                                <div className='employees-detail-badges'>
                                    <span className='employees-detail-badge'>{fields.i_d || 'No employee ID yet'}</span>
                                    <span className='employees-detail-badge'>{fields.department || 'Department pending'}</span>
                                    <span className='employees-detail-badge'>{fields.position || 'Role pending'}</span>
                                    {(fields.email || fields.emailid) && <span className='employees-detail-badge'>{fields.email || fields.emailid}</span>}
                                    {fields.domainName && <span className='employees-detail-badge'>{fields.domainName}</span>}
                                </div>
                                <div className='employees-document-actions'>
                                    <button type='button' onClick={() => printEmployeeDocument('details')} disabled={!fields.i_d}>Print Details</button>
                                    <button type='button' onClick={() => printEmployeeDocument('appointment')} disabled={!fields.i_d}>Appointment Letter</button>
                                    <button type='button' onClick={() => printEmployeeDocument('guarantor')} disabled={!fields.i_d}>Guarantor Form</button>
                                </div>
                            </div>
                            <div className='employees-detail-actions'>
                                {renderEmployeeSaveActions()}
                                {writeStatus === 'Edit' && !isView && <button
                                    type='button'
                                    className='employees-delete-btn'
                                    onClick={deleteEmployee}
                                >
                                    Delete
                                </button>}
                            </div>
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
                            <div className='inpcov employees-photo-upload'>
                                <label className='employees-field-label'>Employee Profile Photo</label>
                                <input
                                    className='forminp'
                                    type='file'
                                    accept='image/*'
                                    disabled={isView}
                                    onChange={(event) => handlePhotoChange(event, 'profile')}
                                />
                            </div>
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
                                <label className='employees-field-label'>Email</label>
                                <input
                                    className='forminp'
                                    name='email'
                                    type='email'
                                    placeholder='employee@example.com'
                                    value={fields.email}
                                    disabled={isView}
                                />
                            </div>
                            <div className='inpcov'>
                                <label className='employees-field-label'>Email ID</label>
                                <input
                                    className='forminp'
                                    name='emailid'
                                    type='text'
                                    placeholder='login id or emailid'
                                    value={fields.emailid}
                                    disabled={isView}
                                />
                            </div>
                            <div className='inpcov'>
                                <label className='employees-field-label'>Domain</label>
                                <input
                                    className='forminp'
                                    name='domainName'
                                    type='text'
                                    placeholder='domain (e.g., example.com)'
                                    value={fields.domainName}
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
                                <div className='inpcov employees-photo-upload'>
                                    <label className='employees-field-label'>Guarantor Profile Photo</label>
                                    <input
                                        className='forminp'
                                        type='file'
                                        accept='image/*'
                                        disabled={isView}
                                        onChange={(event) => handlePhotoChange(event, 'guarantor')}
                                    />
                                </div>
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
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Employees
