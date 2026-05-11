import './Purchase.css'
import { useEffect, useContext, useState, useRef } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { syncPendingChanges } from '../../Resources/offlineSync';
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import html2pdf from 'html2pdf.js';
import { useScroll } from 'framer-motion'
import { MdAdd, MdArrowBack } from 'react-icons/md'
import { FaTableCells } from 'react-icons/fa6'
import ApprovalBox from '../../Resources/ApprovalBox/ApprovalBox';
import PurchaseReport from './PurchaseReport/PurchaseReport'
import heic2any from "heic2any";
import { uploadFile, deleteFile } from '../../Resources/ClientServerAPIConn/API/fileCrudApi';

const Purchase = () => {

    const { storePath,
        server, intervalPeriod,
        fetchServer, posSettings,
        companyRecord, allowBacklogs,
        company, getDate, products, getProducts, setProducts, getProductsWithStock,
        employees, getEmployees, months, getPurchase, setPurchase, purchase,
        settings, setAlert, setAlertState, setAlertTimeout, setActionMessage,
        showApprovalBox, setShowApprovalBox,
        curApproval, setCurApproval,
        approvals, getApprovals, postApprovalUpdate, runApprovalWorkFlow, removeApproval,
        setApprovalStatus, setApprovalMessage, getProductsStockReport
    } = useContext(ContextProvider)

    const getEntriesController = useRef(null)
    const [purchaseStatus, setPurchaseStatus] = useState('Post Purchase')
    const [purchaseDate, setPurchaseDate] = useState(new Date(Date.now()).toISOString().slice(0, 10))
    const [curPurchase, setCurPurchase] = useState(null)
    const [productAdd, setProductAdd] = useState(false)
    const [curPosSettings, setCurPosSettings] = useState([])
    const [deleteCount, setDeleteCount] = useState(0)
    const [isView, setIsView] = useState(false)
    const [isProductView, setIsProductView] = useState(false)
    const [showReport, setShowReport] = useState(false)
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
    const [purchaseEntries, setPurchaseEntries] = useState([])
    const [postCount, setPostCount] = useState(0)
    const [uoms, setUoms] = useState([])
    const [categories, setCategories] = useState([])
    const [wrhs, setWrhs] = useState([])
    const [postAction, setPostAction] = useState('postpurchase')
    const [productPurchased, setProductPurchased] = useState([])
    const [isSyncing, setIsSyncing] = useState(false);
    // const [purchaseWrh, setPurchaseWrh] = useState('')
    const [saleFrom, setSaleFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0, 10))
    const [saleTo, setSaleTo] = useState(new Date(Date.now()).toISOString().slice(0, 10))
    const [reportPurchase, setReportPurchase] = useState(null)

    const [purchaseApprovals, setPurchaseApprovals] = useState([])
    const [isApprover, setIsApprover] = useState(false)

    const [waybillUpload, setWaybillUpload] = useState(null)
    const [uploadingWaybill, setUploadingWaybill] = useState(false)
    const [deletingWaybill, setDeletingWaybill] = useState(false)

    const defaultFields = {
        purchaseDepartment: '',
        purchaseHandler: '',
        itemCategory: '',
        location: '',
        purchaseQuantity: '',
        purchaseUOM: '',
        purchaseAmount: '',
        purchaseVendor: '',
    }
    const [fields, setFields] = useState({ ...defaultFields })
    const [departments, setDepartments] = useState([])
    // const purchaseCategory = ['ASSORTED DRINKS', 'ASSORTED PROTEIN', 'INGREDIENTS', 'SWALLOW', 'CEREALS']
    const unitsofmeasurements = [
        'PORTIONS', 'PACKETS', 'CRATES', 'CARTONS', 'PACKS'
    ]

    const handleWaybillSelect = async (e) => {
        const file = e.target.files && e.target.files[0]
        if (!file) return
        let blob = file
        if (file.type === "image/heic" || (file.name || "").toLowerCase().endsWith(".heic")) {
            try {
                const converted = await heic2any({
                    blob: file,
                    toType: "image/jpeg",
                    quality: 0.9,
                })
                blob = converted
            } catch (err) {
                setAlertState('error')
                setAlert(`Image conversion failed: ${err}`)
                setAlertTimeout(3000)
                return
            }
        }
        setWaybillUpload(blob)
    }

    const handleWaybillUpload = async (fileBlob) => {
        if (!fileBlob) {
            setAlertState('error')
            setAlert('Please select a waybill image first')
            setAlertTimeout(3000)
            return
        }
        if (!curPurchase?.createdAt) {
            setAlertState('error')
            setAlert('Please open a Purchase record before uploading a waybill')
            setAlertTimeout(3000)
            return
        }

        setUploadingWaybill(true)
        setAlertState('info')
        setAlert('Uploading Waybill...')
        setAlertTimeout(100000)

        const collection = 'Purchase'
        const createdAt = curPurchase.createdAt
        const res = await uploadFile(
            fileBlob,
            company + "/Purchase Waybills",
            createdAt,
            company,
            collection,
            server
        )

        if (res?.mess) {
            setUploadingWaybill(false)
            setAlertState('error')
            setAlert(res.mess)
            setAlertTimeout(3000)
            return
        }

        if (res?.downloadLink) {
            const updated = {
                waybillImgId: res.imgId,
                waybillViewLink: res.viewLink,
                waybillDownloadLink: res.downloadLink,
                waybillLastUploadedBy: companyRecord?.emailid,
            }

            const resp = await fetchServer('POST', {
                database: company,
                collection: 'Purchase',
                prop: [{ createdAt }, { ...updated }]
            }, 'updateOneDoc', server)

            if (resp?.updated) {
                setCurPurchase((p) => ({ ...p, ...updated }))
                setFields((f) => ({ ...f, ...updated }))
                setWaybillUpload(null)
                setUploadingWaybill(false)
                setAlertState('success')
                setAlert('Waybill Uploaded Successfully!')
                setAlertTimeout(1000)
                getPurchase(company)
            } else {
                setUploadingWaybill(false)
                setAlertState('error')
                setAlert('Waybill uploaded but failed to update Purchase record')
                setAlertTimeout(3000)
            }
        } else {
            setUploadingWaybill(false)
            setAlertState('error')
            setAlert('Waybill upload failed. Please try again.')
            setAlertTimeout(3000)
        }
    }

    const handleWaybillDelete = async (imgId) => {
        if (!curPurchase?.createdAt) return
        setDeletingWaybill(true)
        setAlertState('info')
        setAlert('Deleting Waybill...')
        setAlertTimeout(100000)

        const res = await deleteFile(imgId, server)
        if (res?.success) {
            const updated = {
                waybillImgId: null,
                waybillViewLink: null,
                waybillDownloadLink: null,
                waybillLastDeletedBy: companyRecord?.emailid,
            }
            const resp = await fetchServer('POST', {
                database: company,
                collection: 'Purchase',
                prop: [{ createdAt: curPurchase.createdAt }, { ...updated }]
            }, 'updateOneDoc', server)

            if (resp?.updated) {
                setCurPurchase((p) => ({ ...p, ...updated }))
                setFields((f) => ({ ...f, ...updated }))
                setWaybillUpload(null)
                setDeletingWaybill(false)
                setAlertState('success')
                setAlert('Waybill Deleted Successfully!')
                setAlertTimeout(1000)
                getPurchase(company)
            } else {
                setDeletingWaybill(false)
                setAlertState('error')
                setAlert('Waybill deleted but failed to update Purchase record')
                setAlertTimeout(3000)
            }
        } else {
            setDeletingWaybill(false)
            setAlertState('error')
            setAlert('Error Deleting Waybill. Check your network!')
            setAlertTimeout(3000)
        }
    }

    useEffect(() => {
        storePath('purchase')
    }, [storePath])
    useEffect(() => {
        const curPosSet = posSettings?.posSettings?.find((sett) => sett.active)
        setCurPosSettings(curPosSet)
        if (curPosSet?.type === 'restaurant') {
            setDepartments(['Bar', 'Kitchen'])
        } else {
            setDepartments(['Purchase'])
        }
    }, [posSettings])
    const refreshPurchaseData = async () => {
        const cmp_val = window.localStorage.getItem('sessn-cmp')
        if (!cmp_val) return;
        try {
            const tasks = [];
            if (products.length) {
                tasks.push(getProductsWithStock(cmp_val, products));
            }
            tasks.push(getApprovals(cmp_val, companyRecord));
            tasks.push(getEmployees(cmp_val, companyRecord));
            tasks.push(getPurchase(cmp_val, companyRecord));
            await Promise.all(tasks);
        } catch (e) { }
    }

    useEffect(() => {
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        const intervalId = setInterval(() => { refreshPurchaseData(); }, intervalPeriod)
        // run once
        refreshPurchaseData();
        return () => clearInterval(intervalId);
    }, [window.localStorage.getItem('sessn-cmp')])

    useEffect(() => {
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        if (!products.length) {
            getProducts(cmp_val)
        }
    }, [products])

    const handleSyncOfflinePurchase = async () => {
        if (!company || !companyRecord?.emailid) return;
        setIsSyncing(true);
        setAlertState('info');
        setAlert('Syncing offline Purchase changes...');
        setAlertTimeout(10000);
        try {
            const results = await syncPendingChanges(company, companyRecord.emailid, fetchServer, server);
            await refreshPurchaseData();

            if (Array.isArray(results)) {
                const failed = results.filter(r => r.status === 'error');
                if (failed.length) {
                    setAlertState('error');
                    setAlert(`${failed.length} change(s) failed to sync; retry later.`);
                    setAlertTimeout(5000);
                } else {
                    setAlertState('success');
                    setAlert('Offline Purchase Sync complete');
                    setAlertTimeout(1000);
                }
            } else {
                setAlertState('success');
                setAlert('Offline Purchase Sync complete');
                setAlertTimeout(1000);
            }
        } catch (e) {
            setAlertState('error');
            setAlert('Offline Purchase Sync failed. Please try again.');
            setAlertTimeout(3000);
        } finally {
            setIsSyncing(false);
        }
    }

    useEffect(() => {
        if (settings.length) {
            const uomSetFilt = settings.filter((setting) => {
                return setting.name === 'uom'
            })
            delete uomSetFilt[0]?._id
            setUoms(uomSetFilt[0].name ? [...uomSetFilt[0].mearsures] : [])

            const catSetFilt = settings.filter(setting => setting.name === 'product_categories');
            delete catSetFilt[0]?._id;
            setCategories(catSetFilt[0].name ? [...catSetFilt[0].categories] : []);

            const wrhSetFilt = settings.filter((setting) => {
                return setting.name === 'warehouses'
            })

            delete wrhSetFilt[0]?._id
            setWrhs(wrhSetFilt[0].name ? [...wrhSetFilt[0].warehouses] : [])
        }
    }, [settings])

    useEffect(() => {
        if (!allowBacklogs) {
            setSaleFrom(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0, 10))
        }
    }, [companyRecord])

    useEffect(() => {
        if (curPurchase) {
            setPurchaseDate(curPurchase.postingDate)
            setIsView(true)
        } else {
            if (curApproval) {
                setPurchaseDate(curApproval.postingDate)
            } else {
                setPurchaseDate(new Date(Date.now()).toISOString().slice(0, 10))
            }
        }
    }, [curPurchase, curApproval])

    useEffect(() => {
        if (isView || curApproval || curPurchase) {
            setMobileDetailOpen(true)
        }
    }, [isView, curApproval, curPurchase])

    useEffect(() => {
        setPurchaseApprovals(approvals.filter((appr) => {
            return (
                appr.module === 'purchase'
                && appr.section.toUpperCase() === 'postPurchase'.toUpperCase()
            )
        }))

    }, [approvals])

    useEffect(() => {
        if (companyRecord?.permissions.includes('postPurchase') || companyRecord?.status === 'admin') {
            setIsApprover(true)
        }
    }, [companyRecord])

    useEffect(() => {
        if (curApproval) {
            setCurPurchase(null)
            setFields({ ...curApproval.data.purchaseFields })
            setIsView(true)
            setPurchaseDate(curApproval.postingDate)
            setPurchaseEntries([...curApproval.data.validEntries])
        }
    }, [curApproval])

    const handlePurchaseEntry = (e) => {
        const name = e.target.getAttribute('name')
        const value = e.target.value

        if (name) {
            if (name === 'itemCategory') {
                setPurchaseEntries([])
                setFields((fields) => {
                    return { ...fields, [name]: value, purchaseUOM: '', purchaseQuantity: '' }
                })
            } else {
                setFields((fields) => {
                    return { ...fields, [name]: value }
                })
            }
        }
    }

    const getPurchaseProducts = async (company, purchase) => {
        if (getEntriesController.current) {
            getEntriesController.current.abort(); // Abort any ongoing fetch
            setPurchaseEntries([]); // Reset purchase entries
        }

        const controller = new AbortController();
        getEntriesController.current = controller;

        const { signal } = controller;
        const response = await fetchServer("POST", {
            database: company,
            collection: "InventoryTransactions",
            prop: {
                createdAt: purchase.productsRef
            }
        }, "getDocsDetails", server, signal); // plural version that returns an array

        return (Array.isArray(response.record) && response.record.length > 0) ? response.record : [];
    };

    const handleViewClick = async (pur) => {
        setCurApproval(null)
        setCurPurchase(pur)
        setFields({ ...pur })
        setIsView(true)
        const purchaseWrh = wrhs.find((wh) => { return wh.purchase })
        const transactions = await getPurchaseProducts(company, pur)
        if (transactions.length) {
            const entries = []
            transactions.forEach((transaction) => {
                if (transaction.location === purchaseWrh?.name || transaction.location === pur?.location) {
                    entries.push(transaction)
                }
            })
            setPurchaseEntries([...entries])
        }
    }

    const checkDuplicateTransaction = async (company, transaction) => {
        const response = await fetchServer("POST", {
            database: company,
            collection: "InventoryTransactions",
            prop: {
                productId: (transaction.productId || transaction.i_d), // Use productId or i_d
                location: transaction.location,
                postingDate: transaction.postingDate,
                createdAt: transaction.createdAt,
                entryType: transaction.entryType,
                documentType: transaction.documentType,
                quantity: Number(transaction.quantity) * -1,
                baseQuantity: Number(transaction.baseQuantity) * -1,
                totalSales: Number(transaction.totalSales) * -1,
                totalCost: Number(transaction.costPrice) * Number(transaction.baseQuantity) * -1
            }
        }, "getDocsDetails", server); // plural version that returns an array

        return Array.isArray(response.record) && response.record.length > 0;
    };
    const updateInventory = async (action) => {
        // console.log(fields)
        if (fields.purchaseAmount && fields.purchaseVendor && fields.purchaseQuantity &&
            (fields.purchaseUOM || fields.stage === 'receipt') && fields.purchaseHandler && fields.purchaseDepartment
        ) {
            let validEntries = purchaseEntries.filter((entry) => {
                const { baseQuantity, totalCost } = entry
                if (baseQuantity && totalCost) {
                    return entry
                }
            })

            if (curApproval !== null) {
                validEntries = curApproval.data.validEntries
            }

            const data = {
                purchaseFields: fields,
                validEntries: validEntries,
            }

            const postUpdate = async () => {

                if (curApproval) {
                    curApproval.posted = true
                }
                if (curApproval !== null) {
                    validEntries = curApproval.data.validEntries
                }
                const createdAt = Date.now()
                const entryIds = validEntries.map(entry => { return entry.productId })
                if (fields.stage === 'receipt' || action === 'reverse') {
                    setAlertState('info')
                    setAlert(action === 'purchase' ? 'Updating Inventory...' : 'Reversing Inventory...')
                    setAlertTimeout(100000)
                    validEntries.forEach(async (entry) => {
                        const purchaseWrh = wrhs.find((wh) => { return wh.purchase })
                        const newTransaction = {
                            ...entry,
                            ...(action === 'reverse' && {
                                documentType: 'Purchase Return', 
                                quantity: -1 * Number(entry.quantity),
                                baseQuantity: -1 * Number(entry.baseQuantity),
                                totalCost: -1 * Number(entry.totalCost)
                            }),
                            location: fields?.location || purchaseWrh?.name,
                            postingDate: purchaseDate,
                            postingStamp: new Date(purchaseDate),
                            createdAt: createdAt,
                            handlerId: fields.purchaseHandler,
                        }
                        const resps = await fetchServer("POST", {
                            database: company,
                            collection: "InventoryTransactions",
                            update: newTransaction
                        }, "createDoc", server)
                        if (resps.err) {
                            setAlertState('error')
                            setAlert(resps.mess)
                            setAlertTimeout(5000)
                            if (curApproval) {
                                curApproval.posted = false
                            }
                        } else {
                            setPostCount((prevCount) => {
                                const newCount = prevCount + 1
                                if (newCount === validEntries.length) {
                                    setProductAdd(false)
                                    setAlertState('success')
                                    setAlert(`${validEntries.length} Inventory ${action === 'purchase' ? 'Updated' : 'Reversed'} Successfully!`)
                                    setAlertTimeout(100000)
                                    getProductsWithStock(company, products)
                                    const entryIds = validEntries.map(entry => { return entry.productId })
                                    if (curPurchase === null) {
                                        setTimeout(() => {
                                            addPurchase(createdAt, entryIds)
                                        }, 500)
                                    } else {
                                        setTimeout(async () => {
                                            setAlertState('info');
                                            if (action === 'purchase'){
                                                setAlert('Linking to Posted Purchase...');
                                            }else{
                                                setAlert('Unlinking from Posted Purchase...');
                                            }
                                            setAlertTimeout(100000);
                                            const resps1 = await fetchServer("POST", {
                                                database: company,
                                                collection: "Purchase",
                                                prop: [{ createdAt: curPurchase.createdAt }, {
                                                    productsRef: action === 'purchase' ? createdAt : null,
                                                    purchaseQuantity: fields.purchaseQuantity,
                                                    purchaseUOM: 'units',
                                                    stage: action === 'purchase' ? 'posted' : 'receipt',
                                                    data : action === 'purchase' ? null : data

                                                }]
                                            }, "updateOneDoc", server);

                                            if (resps1.err) {
                                                console.log(resps1.mess);
                                                setAlertState('error');
                                                setAlert(resps1.mess);
                                                setAlertTimeout(5000);
                                                if (curApproval) {
                                                    curApproval.posted = false
                                                }
                                            } else {

                                                setAlertState('success');
                                                if (action === 'purchase'){
                                                    setAlert('Products Linked Successfully!');
                                                }else{
                                                    setAlert('Products Unlinked Successfully!');
                                                }
                                                setAlertTimeout(1000);
                                                setFields((fields) => {
                                                    return { ...fields, productsRef: action === 'purchase' ? createdAt : null}
                                                })
                                                if (curApproval) {
                                                    curApproval.posted = false
                                                }
                                                getPurchase(company);
                                                if (action === 'purchase'){
                                                    const purchaseWrh = wrhs.find((wh) => { return wh.purchase })
                                                    const transactions = await getPurchaseProducts(company, { productsRef: createdAt })
                                                    if (transactions.length) {
                                                        const entries = []
                                                        transactions.forEach((transaction) => {
                                                            if (transaction.location === purchaseWrh?.name || transaction.location === curPurchase?.location) {
                                                                entries.push(transaction)
                                                            }
                                                        })
                                                        setPurchaseEntries([...entries])
                                                    }
                                                }
                                                const rep = await fetchServer("POST", {
                                                    collection: "ProductCostLogs",
                                                    markUp: curPosSettings?.useMarkUp,
                                                    markUpValue: 30,
                                                    prop: entryIds
                                                }, "updateProductCost", server)

                                                if (!rep.err) {
                                                    getProducts(company)
                                                }

                                            }
                                            return
                                        }, 1000);
                                    }
                                } else {
                                    setAlertState('success')
                                    setAlert(`${newCount} / ${validEntries.length} Inventory ${action === 'purchase' ? 'Updated' : 'Reversed'} Successfully!`)
                                }

                                return newCount
                            })
                        }
                    })
                } else {
                    if (action === 'purchase'){
                        addPurchase(createdAt, entryIds, data)
                    }
                }
            }
            if (curApproval && curApproval?.approved) {
                if (companyRecord?.status !== 'admin' && !companyRecord?.permissions.includes('allow_purchase_posts')) {
                    setAlertState('error')
                    setAlert('You are not allowed to post purchases!')
                    setAlertTimeout(3000)
                    return
                }
            }
            if (curApproval) {
                if (!curApproval.posted) {
                    curApproval.posted = true
                    runApprovalWorkFlow(purchaseDate, curApproval, 'purchase', postAction, data, postUpdate)
                }
            } else {
                if (action === 'purchase'){
                    if (curPurchase?.data && curPurchase?.stage === 'receipt'){
                        postUpdate()
                    }else{
                        runApprovalWorkFlow(purchaseDate, curApproval, 'purchase', postAction, data, postUpdate)
                    }
                }else{
                    postUpdate()
                }
            }
        } else {
            setAlertState('error')
            setAlert('All Fields Are Required! Kindly Fill All')
            setAlertTimeout(5000)
        }
    }

    const handleProductPurchase = () => {    
        setPostCount(0)
        if (fields.purchaseUOM !== 'units') {
            var totalQuantity = 0
            var totalAmount = 0
            purchaseEntries.filter((entry) => {
                const { baseQuantity, totalCost } = entry
                if (baseQuantity && totalCost) {
                    totalQuantity += Number(baseQuantity)
                    totalAmount += Number(totalCost)
                    return entry
                }
            })
            if (Number(totalAmount) === Number(fields.purchaseAmount)) {
                setFields((fields) => {
                    return { ...fields, purchaseQuantity: totalQuantity, purchaseUOM: 'units' }
                })
                if (curPurchase !== null) {
                    setTimeout(() => {
                        updateInventory('purchase')
                        return
                    }, 500)
                } else {
                    setProductAdd(false)
                }
            } else {
                setAlertState('error')
                setAlert('Total Purchase Amount does not match the sum of the Products Amounts')
                setAlertTimeout(5000)
            }
        } else {
            updateInventory('purchase')
        }
    }

    const addPurchase = async (productsRef, entryIds, data) => {
        setAlertState('info')
        setAlert('Posting Purchase...')
        setAlertTimeout(10000)
        setPurchaseStatus('Posting Purchase...')
        const newPurchase = {
            ...fields,
            ...(curPurchase === null && { stage: 'receipt', data: data }),
            postingDate: purchaseDate,
            approvedBy: curApproval?.approvedBy || companyRecord?.emailid,
            ...(productsRef && { productsRef }),
            createdAt: Date.now()
        }
        const newPurchases = [newPurchase, ...purchase]

        const resps = await fetchServer("POST", {
            database: company,
            collection: "Purchase",
            update: newPurchase
        }, "createDoc", server)

        if (resps.err) {
            console.log(resps.mess)
            setPurchaseStatus('Post Purchase')
            setAlertState('error')
            setAlert(resps.mess)
            setAlertTimeout(5000)
        } else {
            if (curApproval) {
                removeApproval(company, 'purchase', postAction, {
                    createdAt: curApproval.createdAt,
                    postingDate: curApproval.postingDate
                })
            }
            setPurchaseStatus('Post Purchase')
            setPurchase(newPurchases)
            setCurPurchase(newPurchase)
            setIsView(true)
            setFields({ ...newPurchase })
            setAlertState('success')
            setAlert('Purchase Record Posted Successfully!')
            setAlertTimeout(1000)
            getPurchase(company)
            if (fields.stage === 'receipt') {
                const purchaseWrh = wrhs.find((wh) => { return wh.purchase })
                const transactions = await getPurchaseProducts(company, newPurchase)
                if (transactions.length) {
                    const entries = []
                    transactions.forEach((transaction) => {
                        if (transaction.location === purchaseWrh?.name || transaction.location === newPurchase?.location) {
                            entries.push(transaction)
                        }
                    })
                    setPurchaseEntries([...entries])
                }
                const rep = await fetchServer("POST", {
                    collection: "ProductCostLogs",
                    markUp: curPosSettings?.useMarkUp,
                    markUpValue: 30,
                    prop: entryIds
                }, "updateProductCost", server)

                if (!rep.err) {
                    getProducts(company)
                }
            }

        }

    }

    const deletePurchase = async (purchase) => {
        const today = new Date()
        let postDate = new Date(purchase.postingDate).toISOString().slice(0, 10)
        if (postDate < new Date(today.setDate(today.getDate() - 1)).toISOString().slice(0, 10) && !companyRecord?.status === 'admin') {
            setAlertState('error')
            setAlert('Cannot delete purchase after more than 1 day')
            setAlertTimeout(3000)
            return
        }
        if (deleteCount === purchase.createdAt) {
            setAlertState('info')
            setAlert(`${fields?.stage === 'receipt' ? 'Deleting' : 'Reversing'} Purchase...`)
            if (['posted', null, undefined].includes(fields.stage)) {
                const purchaseWrh = wrhs.find((wh)=>wh.purchase)
                const transactions = await getPurchaseProducts(company, purchase)
                if (transactions.length) {
                    const entries = []
                    transactions.forEach((transaction) => {
                        if (transaction.location === purchaseWrh?.name || transaction.location === purchase?.location) {                            
                            entries.push(transaction)
                        }
                    })
                    setPurchaseEntries([...entries])
                }
                setPostCount(0)
                updateInventory('reverse')
                // const rep = await fetchServer("POST", {
                //     database: company,
                //     collection: "ProductCostLogs",
                //     markUp: curPosSettings?.useMarkUp,
                //     markUpValue: 30,
                //     prop: entryIds
                // }, "updateProductCost", server)

                // if (!rep.err) {
                //     getProducts(company)
                // }
            }else if (fields?.stage === 'receipt'){
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Purchase",
                    update: { createdAt: purchase.createdAt }
                }, "removeDoc", server)
                if (resps.err) {
                    console.log(resps.mess)
                    setAlertState('info')
                    setAlert(resps.mess)
                    setAlertTimeout(5000)
                } else {
    
                    setIsView(false)
                    setCurPurchase(null)
                    setFields({ ...defaultFields })
                    setAlertState('success')
                    setAlert('Purchase Record Deleted Successfully!')
                    setAlertTimeout(1000)
                    setDeleteCount(0)
                    getPurchase(company)
                }
            }
        } else {
            setDeleteCount(purchase.createdAt)
            setTimeout(() => {
                setDeleteCount(0)
            }, 12000)
        }
    }

    const calculateReportPurchase = () => {
        var filteredReportPurchases = purchase.filter((ftrpurchase) => {
            const prPostingDate = new Date(ftrpurchase.postingDate).getTime()
            const fromDate = new Date(saleFrom).getTime()
            const toDate = new Date(saleTo).getTime()
            if (prPostingDate >= fromDate && prPostingDate <= toDate
            ) {
                return ftrpurchase
            }
        }).sort((a, b) => {
            const first = new Date(a.postingDate)
            const second = new Date(b.postingDate)
            return second - first
        })
        setReportPurchase(filteredReportPurchases)
    }
    return (
        <>
            <div className={`purchase purchase-page${mobileDetailOpen ? ' mobile-detail-open' : ''}`}>
                {showApprovalBox && <ApprovalBox
                    onClose={() => {
                        setShowApprovalBox(false)
                        setApprovalStatus(false)
                        setApprovalMessage('')
                        curApproval.posted = false
                    }}
                    module={'purchase'}
                    section={postAction}
                    postApprovalUpdate={() => {
                        postApprovalUpdate(company, 'purchase', postAction, curApproval)
                        curApproval.posted = false
                    }}
                />}
                {productAdd && <AddProduct
                    products={products}
                    category={fields.itemCategory}
                    purchaseDate={purchaseDate}
                    fields={fields}
                    setFields={setFields}
                    curPurchase={curPurchase}
                    setProductAdd={setProductAdd}
                    uoms={uoms}
                    handleProductPurchase={handleProductPurchase}
                    purchaseEntries={purchaseEntries}
                    setPurchaseEntries={setPurchaseEntries}
                    isProductView={isProductView}
                    setIsProductView={setIsProductView}
                    companyRecord={companyRecord}
                    curApproval={curApproval}
                />}
                {showReport && <PurchaseReport
                    reportPurchases={reportPurchase}
                    multiple={true}
                    setShowReport={(value) => {
                        setShowReport(value)
                    }}
                    fromDate={saleFrom}
                    toDate={saleTo}
                />}
                <div className='purlst'>
                    <div className='purchase-sidebar-intro'>
                        <button
                            type='button'
                            className='mobile-detail-trigger'
                            onClick={() => {
                                setMobileDetailOpen(true)
                            }}
                        >
                            Open Workspace
                        </button>
                        <div className='purchase-kicker'>Direct Cost Flow</div>
                        <h2 className='purchase-title'>Direct Purchase</h2>
                        <p className='purchase-copy'>
                            Track approvals, posted direct costs, and offline sync activity from a clearer purchasing workspace.
                        </p>
                        <div className='purchase-stat-row'>
                            <div className='purchase-stat-card'>
                                <span>Posted Records</span>
                                <strong>{purchase.length}</strong>
                            </div>
                            <div className='purchase-stat-card'>
                                <span>Pending Approvals</span>
                                <strong>{purchaseApprovals.length}</strong>
                            </div>
                        </div>
                    </div>
                    {companyRecord.status === 'admin' && <FaTableCells
                        className='allslrepicon'
                        onClick={() => {
                            calculateReportPurchase()
                            if (saleTo && saleFrom) {
                                setShowReport(true)
                            }
                        }}
                    />}
                    <div className='purchase-left-filter-bar'>
                        <div className='purchase-left-filter-card'>
                            <div className='purchase-left-filter-label'>Date From</div>
                            <input
                                className='purchase-left-date-input'
                                name='salesfrom'
                                type='date'
                                placeholder='From'
                                value={saleFrom}
                                disabled={!allowBacklogs}
                                onChange={(e) => {
                                    setSaleFrom(e.target.value)
                                }}
                            />
                        </div>
                        <div className='purchase-left-filter-card'>
                            <div className='purchase-left-filter-label'>Date To</div>
                            <input
                                className='purchase-left-date-input'
                                name='salesto'
                                type='date'
                                placeholder='To'
                                value={saleTo}
                                disabled={!allowBacklogs}
                                onChange={(e) => {
                                    setSaleTo(e.target.value)
                                }}
                            />
                        </div>
                    </div>
                    <div className='purchase-left-action-row'>
                        <button className="purchase-left-sync-btn" onClick={handleSyncOfflinePurchase} disabled={isSyncing}>{isSyncing ? 'Syncing...' : 'Sync()'}</button>
                    </div>
                    {[...purchaseApprovals, ...purchase].filter((purfltr) => {
                        if (purfltr.postingDate >= saleFrom && purfltr.postingDate <= saleTo) {
                            return purfltr
                        }
                    }).sort((a, b) => {
                        const first = new Date(a.postingDate)
                        const second = new Date(b.postingDate)
                        return second - first
                    }).map((pur, index) => {
                        if (pur.isApproval) {
                            const { createdAt, postingDate, message, handlerId, approved, approvers } = pur
                            var textColor = 'red'
                            if (approved) {
                                textColor = 'green'
                            }
                            return (
                                <div className={'dept sldept' + (curApproval?.createdAt === createdAt ? ' curview' : '')} key={index}
                                    onClick={(e) => {
                                        setCurApproval(pur)
                                    }}
                                >
                                    <div className='dets sldets'>
                                        <div>Approval Type: <b>{'PURCHASE'}</b></div>
                                        <div>Posting Date: <b>{getDate(postingDate)}</b></div>
                                        <div>Approval Status: <b style={{ color: textColor }}>{message ? 'REJECTED' : (approved ? 'APPROVED' : 'AWAITING APPROVAL')}</b></div>
                                        {message && <div>Message: <b>{message}</b></div>}
                                        <div className='deptdesc'>{`Requested By ID:`} <b>{`${handlerId}`}</b></div>
                                        {approvers?.length &&
                                            <div
                                                className='deptdesc'
                                                style={{
                                                    fontWeight: 'bold',
                                                    fontSize: '13px',
                                                    color: 'greenyellow',
                                                    background: 'rgba(0,0,0,0.7)',
                                                    width: 'fit-content',
                                                    padding: '5px',
                                                    borderRadius: '8px',
                                                    border: 'solid greenyellow 3px',
                                                }}
                                            >
                                                ## PURCHASE VERIFIED ##
                                            </div>
                                        }
                                    </div>
                                    {(companyRecord.status === 'admin') && <div
                                        className='edit'
                                        name='delete'
                                        style={{ color: 'red', background: 'white', borderRadius: '8px', padding: '5px 10px', border: 'solid red 1.3px' }}
                                        onClick={async () => {
                                            setAlertState('info')
                                            setAlert('Deleting Approval Data...')
                                            setAlertTimeout(100000)

                                            const resp = await removeApproval(company, 'purchase', postAction, {
                                                createdAt: createdAt,
                                                postingDate: postingDate
                                            })

                                            if (resp.completed) {
                                                setAlertState('success')
                                                setAlert('Deleted Approval Data Successfully!')
                                                setAlertTimeout(1000)
                                                setCurPurchase(null)
                                                setCurApproval(null)
                                            }

                                        }}
                                    >
                                        Delete
                                    </div>}
                                </div>
                            )
                        } else {
                            const {
                                createdAt, postingDate,
                                purchaseAmount, purchaseQuantity,
                                purchaseUOM, purchaseDepartment,
                                itemCategory, purchaseHandler, stage
                            } = pur
                            var handlerName = ''
                            employees.forEach((emp) => {
                                if (emp.i_d === purchaseHandler) {
                                    handlerName = `${emp.firstName} ${emp.lastName}`
                                }
                            })
                            return (
                                <div className={'dept' + (curPurchase?.createdAt === createdAt ? ' curview' : '')} key={index}
                                    onClick={(e) => {
                                        handleViewClick(pur)
                                    }}
                                >
                                    <div className='dets sldets'>
                                        <div>Posting Date: <b>{getDate(postingDate)}</b></div>
                                        <div>Purchase Department: <b>{purchaseDepartment}</b></div>
                                        <div>Purchase Amount: <b>{'₦' + (Number(purchaseAmount)).toLocaleString()}</b></div>
                                        <div>Purchase Details: <b>{`${Number(purchaseQuantity).toLocaleString()} ${purchaseUOM.toUpperCase()} of ${itemCategory}`}</b></div>
                                        <div className='deptdesc'>{`Purchase Handled By:`}<b>{`${handlerName}`}</b></div>
                                        {stage === 'receipt' && <div className='deptdesc' style={{ fontSize: '1rem', color: 'red' }}><b>PENDING RECEIPT</b></div>}
                                    </div>
                                    {(companyRecord.status === 'admin') && <div
                                        className='edit'
                                        name='delete'
                                        style={{ color: 'red', background: 'white', borderRadius: '8px', padding: '5px 10px', border: 'solid red 1.3px' }}
                                        onClick={() => {
                                            setAlertState('info')
                                            setAlert('You are about to Reverse the selected Purchase Record. Please click again if you are sure!')
                                            setAlertTimeout(5000)
                                            deletePurchase(pur)
                                        }}
                                    >
                                        {stage === 'posted' ? 'Reverse': 'Delete'}
                                    </div>}
                                </div>
                            )
                        }
                    })}
                </div>
                <div className='purinfo'>
                    <div className='purchase-detail-intro'>
                        <button
                            type='button'
                            className='detail-mobile-back'
                            onClick={() => {
                                setMobileDetailOpen(false)
                            }}
                        >
                            <MdArrowBack />
                            Back to list
                        </button>
                        <div className='purchase-kicker'>Entry Workspace</div>
                        <h2 className='purchase-detail-title'>{isView ? 'Purchase Details' : 'Post Direct Cost'}</h2>
                        <p className='purchase-copy'>
                            {isView
                                ? 'Inspect the selected purchase record, linked products, and waybill state without touching the logic.'
                                : 'Capture the direct cost details in the refreshed form and keep the existing posting flow intact.'}
                        </p>
                        {curPurchase && <div className='purchase-active-meta'>
                            <span>{getDate(curPurchase.postingDate)}</span>
                            <span>{curPurchase.purchaseDepartment || 'No department'}</span>
                            <span>{'N' + Number(curPurchase.purchaseAmount || 0).toLocaleString()}</span>
                            <span>{curPurchase.stage || 'posted'}</span>
                        </div>}
                    </div>
                    <div className='purinfocontent' onChange={handlePurchaseEntry}>
                        <div className='formtitle padtitle'>
                            <div className={'frmttle'}>
                                {`DIRECT COST ENTRY`}
                            </div>
                        </div>
                        <div className='inpcov'>
                            <div>Select Department</div>
                            <select
                                className='forminp'
                                name='purchaseDepartment'
                                type='text'
                                value={fields.purchaseDepartment}
                                disabled={isView}
                            >
                                <option value=''>Select Department</option>
                                {departments.map((dept, index) => {
                                    return (
                                        <option key={index} value={dept}>{dept}</option>
                                    )
                                })}
                            </select>
                        </div>
                        <div className='inpcov'>
                            <div>Vendor</div>
                            <input
                                className='forminp'
                                name='purchaseVendor'
                                type='text'
                                autoComplete={true}
                                placeholder='Vendor'
                                value={fields.purchaseVendor}
                                disabled={isView}
                            />
                        </div>
                        <div className='inpcov'>
                            <div>Select Purchase Handler</div>
                            <select
                                className='forminp'
                                name='purchaseHandler'
                                type='text'
                                value={fields.purchaseHandler}
                                disabled={isView}
                            >
                                <option value=''>Select Purchase Handler</option>
                                {employees.map((employee) => {
                                    if (!isView) {
                                        if (!employee.dismissalDate) {
                                            return (
                                                <option
                                                    key={employee.i_d}
                                                    value={employee.i_d}
                                                >
                                                    {`(${employee.i_d}) ${employee.firstName.toUpperCase()} ${employee.lastName.toUpperCase()} - ${employee.position}`}
                                                </option>
                                            )
                                        }
                                    } else {
                                        return (
                                            <option
                                                key={employee.i_d}
                                                value={employee.i_d}
                                            >
                                                {`(${employee.i_d}) ${employee.firstName.toUpperCase()} ${employee.lastName.toUpperCase()} - ${employee.position}`}
                                            </option>
                                        )
                                    }
                                })}
                            </select>
                        </div>
                        <div className='inpcov'>
                            <div>Item Category</div>
                            <select
                                className='forminp'
                                name='itemCategory'
                                type='text'
                                value={fields.itemCategory.toLowerCase()}
                                disabled={isView}
                            >
                                <option value=''>Item Category</option>
                                {categories.map((category, index) => {
                                    return (
                                        <option key={index} value={category.code}>{category.name}</option>
                                    )
                                })}
                            </select>
                        </div>
                        
                        <div className='inpcov'>
                            <div>Purchase Location</div>
                            <select
                                className='forminp'
                                name='location'
                                type='text'
                                value={fields.location}
                                disabled={isView}
                            >
                                <option value=''>DEFAULT</option>
                                {wrhs.filter((wrhfl)=>{
                                    return wrhfl?.productCategories?.length
                                }).map((wrh, index) => {
                                    return (
                                        <option key={index} value={wrh.name}>{wrh.name.toUpperCase()}</option>
                                    )
                                })}
                            </select>
                        </div>

                        {(fields.productsRef || isView) && <div className='inpcov'>
                            <div>Purchase Quantity</div>
                            <input
                                className='forminp'
                                name='purchaseQuantity'
                                type='number'
                                placeholder='Purchase Quantity'
                                value={fields.purchaseQuantity}
                                disabled={isView}
                            />
                        </div>}
                        {(fields.productsRef || isView) && <div className='inpcov'>
                            <div>Unit of Measurement</div>
                            <select
                                className='forminp'
                                name='purchaseUOM'
                                type='text'
                                value={fields.purchaseUOM}
                                disabled={isView}
                            >
                                <option value=''>Unit of Measurement</option>
                                <option value='units'>UNITS</option>
                                {unitsofmeasurements.map((uom, index) => {
                                    return (
                                        <option key={index} value={uom}>{uom}</option>
                                    )
                                })}
                            </select>
                        </div>}
                        {(fields.productsRef || isView) && <div className='inpcov'>
                            <div>Purchase Amount</div>
                            <input
                                className='forminp'
                                name='purchaseAmount'
                                type='number'
                                value={fields.purchaseAmount}
                                disabled={true}
                            />
                        </div>}
                        {(fields.productsRef || fields.purchaseUOM === 'units') ?
                            <div
                                className='prd-link'
                                onClick={() => {
                                    setIsProductView(true)
                                    setProductAdd(true)
                                }}
                            >
                                {`View All (${fields.purchaseQuantity.toLocaleString()}) Quantities`}
                            </div> :
                            (<div
                                className='prd-link'
                                onClick={() => {
                                    // setIsProductView(false)
                                    // setProductAdd(true)
                                    if (fields.purchaseVendor) {
                                        setIsProductView(false)
                                        setProductAdd(true)
                                    }
                                    else {
                                        setAlertState('error')
                                        setAlert('Please select Vendor before linking products!')
                                        setAlertTimeout(1000)
                                    }
                                }}
                            >
                                Add Products
                            </div>)}

                        {(isView && !curApproval) && <section className='imgview'>

                            <div className='acpymdt'>Upload Waybill</div>

                            {(fields.waybillImgId || waybillUpload) &&
                                <a href={fields?.waybillViewLink || ''} target="_blank" rel="noopener noreferrer">
                                    <img
                                        className='imgtag'
                                        src={(fields?.waybillImgId ? `https://drive.google.com/thumbnail?id=${fields.waybillImgId}&sz=w1000` : '') || (waybillUpload ? (URL.createObjectURL(waybillUpload)) : '')}
                                        alt='waybill'
                                    />
                                </a>
                            }

                            {!waybillUpload && !fields.waybillImgId && <div className='inpcov'>
                                <div>Upload Image</div>
                                <input
                                    className='forminp'
                                    name='waybillImgId'
                                    type='file'
                                    accept='image/*'
                                    capture="environment"
                                    onChange={(e) => {
                                        handleWaybillSelect(e)
                                    }}
                                />
                            </div>}

                            {(waybillUpload) && <button
                                className='imgupld'
                                style={{ cursor: uploadingWaybill ? 'not-allowed' : 'pointer' }}
                                disabled={uploadingWaybill}
                                onClick={() => {
                                    handleWaybillUpload(waybillUpload)
                                }}
                            > Upload</button>}

                            {(((companyRecord?.status === 'admin') && fields.waybillImgId) || waybillUpload) && <button
                                className='imgupld'
                                color='red'
                                style={{ cursor: deletingWaybill ? 'not-allowed' : 'pointer' }}
                                disabled={deletingWaybill}
                                onClick={() => {
                                    setWaybillUpload(null)
                                    if (fields.waybillImgId) {
                                        handleWaybillDelete(fields.waybillImgId)
                                    }
                                }}
                            > Delete</button>}
                        </section>}
                    </div>
                    {(!isView || curApproval) && <div className='purchasebuttom'>
                        <div className='inpcov'>
                            <input
                                className='forminp'
                                name='purchasedate'
                                type='date'
                                placeholder='Purchase Date'
                                value={purchaseDate}
                                disabled={isView}
                                onChange={(e) => {
                                    const date = new Date(e.target.value)
                                    const today = new Date()
                                    if (date <= today) {
                                        setPurchaseDate(e.target.value)
                                    } else {
                                        setAlertState('error')
                                        setAlert('You cannot set the purchase date in the future!')
                                        setAlertTimeout(5000)
                                    }
                                }}
                            />
                        </div>
                        <div
                            className='purchasebutton'
                            style={{ cursor: purchaseEntries.length ? 'pointer' : 'not-allowed' }}
                            onClick={() => {
                                if (purchaseEntries.length) {
                                    const purchaseWrh = wrhs.find((wh) => wh.purchase)
                                    if (!purchaseWrh && !fields?.location) {
                                        setAlertState('error')
                                        setAlert('Please Configure a Default Purchase Location, or Select A Purchase Location Before Proceeding!')
                                        setAlertTimeout(3000)
                                        return
                                    }
                                    handleProductPurchase()
                                }
                            }}
                        >{curApproval ? (curApproval.approved ? purchaseStatus : (isApprover ? 'Approve Request' : 'Request Approval')) : (isApprover ? 'Post Purchase' : 'Request Approval')}</div>
                    </div>}
                    <MdAdd
                        className='add slsadd purchase-detail-add'
                        onClick={() => {
                            setIsView(false)
                            setFields({ ...defaultFields })
                            setCurPurchase(null)
                            setCurApproval(null)
                            setIsApprover(false)
                        }}
                    />
                </div>
            </div>
        </>
    )
}

export default Purchase

const AddProduct = ({
    products, category, purchaseDate, fields, setFields, curPurchase, setProductAdd, uoms, isProductView, setIsProductView,
    handleProductPurchase, purchaseEntries, setPurchaseEntries, companyRecord, curApproval,
}) => {
    const [productSearch, setProductSearch] = useState('')
    const [nullFieldsCount, setNullFieldsCount] = useState(0)
    const [isProductEdit, setIsProductEdit] = useState(false)
    const targetRef = useRef(null)
    const { getDate, setAlertState, setAlert, setAlertTimeout } = useContext(ContextProvider)
    const printToPDF = () => {
        const element = targetRef.current;
        const options = {
            margin: 0.1,
            filename: `${curApproval ? '(APPROVALS) ' : ''}PRODUCT PURCHASE DETAILS ${getDate(curPurchase?.purchaseDate || curPurchase?.postingDate || curApproval?.postingDate || purchaseDate)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' }
        };
        html2pdf().set(options).from(element).save();
    };
    useEffect(() => {
        if (!isProductView) {
            let fltProducts = []
            if (category) {
                fltProducts = products.filter((product) => {
                    return product.category === category.toLowerCase() && product.type === 'goods'
                })
            } else {
                fltProducts = products.filter((product) => {
                    return product.category && product.type === 'goods'
                }).map((product) => {
                    if (isProductEdit) {
                        const originalEntry = purchaseEntries.find((entry) => {
                            return entry.productId === product.i_d
                        })
                        if (!originalEntry) {
                            product.productId = product.i_d
                            // console.log('Adding Product:', product.name)
                            return product
                        } else {
                            originalEntry.i_d = originalEntry.productId
                            // console.log('Keeping Original Entry for Product:', originalEntry.name)
                            return originalEntry
                        }
                    } else {
                        return product
                    }
                })
            }
            setPurchaseEntries(fltProducts.map((product, index) => {
                const uom1 = uoms.filter((uom) => {
                    return uom.code === product.purchaseUom.toLowerCase()
                })
                return {
                    productId: product.i_d,
                    index: index,
                    name: product.name,
                    quantity: '',
                    baseQuantity: 0,
                    purchaseUom: product.purchaseUom.toLowerCase(),
                    baseUom: uom1[0]?.base,
                    totalCost: '',
                    entryType: 'Purchase',
                    documentType: 'Receipt'
                }                
            }))
        } else if (curPurchase?.stage === 'receipt') {
            setPurchaseEntries(curPurchase?.data?.validEntries || [])
        }
    }, [])

    useEffect(() => {
        if (!isProductView) {
            let ct = 0
            const fieldsAmount = purchaseEntries.reduce((acc, entry) => {
                if ((!entry.totalCost && entry.quantity) || (!entry.quantity && entry.totalCost)) {
                    ct += 1
                }
                return acc + (Number(entry.totalCost) || 0)
            }, 0)
            setFields((fields) => {
                return { ...fields, purchaseAmount: fieldsAmount }
            })
            setNullFieldsCount(ct)
        }
    }, [purchaseEntries])

    const handlePurchaseUdpate = (e, index) => {
        const { name, id, value } = e.target

        if (name) {
            if (name === 'quantity') {
                const uom2 = uoms.filter((uom) => {
                    return uom.code === purchaseEntries[index].purchaseUom
                })
                // console.log(uom)
                setPurchaseEntries((entries) => {
                    const entry = entries.find((entry) => { return entry.productId === id })
                    const otherEntries = entries.filter((entry) => { return entry.productId !== id })
                    entry[name] = Number(value)
                    entry.baseQuantity = Number(value) * Number(uom2[0]?.multiple)
                    return [...otherEntries, entry].sort((a, b) => {
                        const numA = parseInt(a.productId.replace("PD", ""), 10);
                        const numB = parseInt(b.productId.replace("PD", ""), 10);
                        return numA - numB;
                    })
                })
            } else {
                setPurchaseEntries((entries) => {
                    const entry = entries.find((entry) => { return entry.productId === id })
                    const otherEntries = entries.filter((entry) => { return entry.productId !== id })
                    entry[name] = value
                    return [...otherEntries, entry].sort((a, b) => {
                        const numA = parseInt(a.productId.replace("PD", ""), 10);
                        const numB = parseInt(b.productId.replace("PD", ""), 10);
                        return numA - numB;
                    })
                })
            }
        }
    }

    return (
        <>
            <div className='addproduct'>
                <div className='add-products'>
                    <div className='add-products-title'>
                        <label>Product Purchase Details</label>
                        {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('print_purchase_doc')) && <div
                            className='slprwh-print'
                            onClick={() => {
                                printToPDF()
                            }}
                        >Print Product</div>}
                    </div>
                    <div>
                        <input
                            placeholder='Search Product'
                            style={{
                                padding: '5px', borderRadius: '5px',
                                outline: 'none', fontSize: '12px'
                            }}
                            onChange={(e) => { setProductSearch(e.target.value) }}
                        />
                    </div>
                    <div className='add-products-content' ref={targetRef}>
                        <div className='add-products-content-title' style={{ display: 'flex', width: 'fit-content' }}>{`${companyRecord?.name.toUpperCase()} (PURCHASE ORDER)`}</div>
                        <div style={{ display: 'block', width: 'fit-content', marginRight: 'auto', marginLeft: '0px' }}>
                            <label style={{ width: 'fit-content', textAlign: 'left' }}>{`Vendor: ${fields.purchaseVendor}`}</label>
                            <p></p>
                            <label>{`Order Date: ${purchaseDate || fields.postingDate}`}</label>
                            <p></p>
                        </div>
                        <div className='add-products-content-title'>
                            <div>Product Name</div>
                            <div>Product ID</div>
                            {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('allow_purchase_posts')) && curApproval &&
                                <>
                                    <div style={{ color: 'red' }}>Current Stock</div>
                                    <div style={{ color: 'red' }}>Requested Stock (units)</div>
                                </>
                            }
                            <div>Purchase Quantity</div>
                            <div>Purchase UOM</div>
                            <div>{`Purchase Amount (${(fields.purchaseAmount || 0).toLocaleString()})`}</div>
                        </div>
                        {purchaseEntries.length === 0 && isProductView && <div className='load-products'><span>Loading Purchase Products...</span></div>}
                        {purchaseEntries.sort((a, b) => {
                            const numA = parseInt(a.productId.replace("PD", ""), 10);
                            const numB = parseInt(b.productId.replace("PD", ""), 10);
                            return numA - numB;
                        }).filter((purflt) => {
                            let showEntry = true
                            if (isProductView) {
                                if (!purflt.quantity && !purflt.totalCost) {
                                    showEntry = false
                                }
                            } else (
                                showEntry = true
                            )
                            if (showEntry) {
                                if (productSearch === '') {
                                    return purflt
                                } else return (purflt.name.toLowerCase().includes(productSearch.toLowerCase()) || purflt.productId.toLowerCase().includes(productSearch.toLowerCase()))
                            }
                        }).map((entry, index) => {
                            let currentStock = (products.find((p) => { return p.i_d === entry.productId }))?.stockSummary?.closingQty
                            return (
                                <div key={index} className='add-products-content-entry'>
                                    <div>{entry.name}</div>
                                    <div>{entry.productId}</div>
                                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('allow_purchase_posts')) && curApproval &&
                                        <>
                                            <div style={{ color: 'red' }}>{currentStock}</div>
                                            <div style={{ color: 'red' }}>{entry.baseQuantity}</div>
                                        </>
                                    }
                                    <div>
                                        <input
                                            type='number'
                                            name='quantity'
                                            id={entry.productId}
                                            value={entry.quantity}
                                            onChange={(e) => { handlePurchaseUdpate(e, index) }}
                                            disabled={isProductView}
                                        />
                                    </div>
                                    <div>
                                        <select
                                            name='purchaseUom'
                                            id={entry.productId}
                                            value={entry.purchaseUom}
                                            onChange={(e) => { handlePurchaseUdpate(e, index) }}
                                            disabled={isProductView || true}
                                        >
                                            {uoms.map((uom, idx) => {
                                                return (
                                                    <option key={idx} value={uom.code}>{uom.name}</option>
                                                )
                                            })}
                                        </select>
                                    </div>
                                    <div>
                                        <input
                                            name='totalCost'
                                            type='number'
                                            id={entry.productId}
                                            value={entry.totalCost}
                                            disabled={entry.baseQuantity === 0 || isProductView}
                                            onChange={(e) => { handlePurchaseUdpate(e, index) }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className='add-products-button'>
                        {!isProductView && <div
                            className='add-products-button-add'
                            onClick={
                                () => {
                                    if (nullFieldsCount === 0) {
                                        handleProductPurchase()
                                    } else {
                                        setAlertState('error')
                                        setAlert('Please Make Sure Both Quantity and Amount fields are filled before proceeding!')
                                        setAlertTimeout(1000)
                                    }
                                }
                            }
                        >{curPurchase === null ? 'Add' : (fields.stage === 'receipt' ? 'Receive' : 'Save')}</div>}
                        {isProductView && (curPurchase === null || fields?.stage === 'receipt') && <div
                            className='add-products-button-add'
                            onClick={() => {
                                setIsProductEdit(true)
                                setFields((fields) => {
                                    return { ...fields, purchaseUOM: '' }
                                })
                                setIsProductView(false)
                            }}
                        >{fields?.stage === 'receipt' ? 'Release' : 'Edit'}</div>}
                        <div
                            className='add-products-button-cancel'
                            onClick={() => {
                                setIsProductView(false)
                                setProductAdd(false)
                                if (!isProductView) {
                                    setPurchaseEntries([])
                                }
                            }}
                        >{isProductView ? 'Close' : 'Cancel'}</div>
                    </div>
                </div>
            </div>
        </>
    )
}
