import './Purchase.css'
import { useEffect, useContext, useState, useRef } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { syncPendingChanges } from '../../Resources/offlineSync';
import { exportPurchaseDocumentToPDF } from '../DashView/pdfUtils';
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
        setApprovalStatus, setApprovalMessage, getProductsStockReport,
        paymentMethods,
    } = useContext(ContextProvider)

    const getEntriesController = useRef(null)
    const [purchaseStatus, setPurchaseStatus] = useState('Post Purchase')
    const [purchaseDate, setPurchaseDate] = useState(new Date(Date.now()).toISOString().slice(0, 10))
    const [curPurchase, setCurPurchase] = useState(null)
    const [productAdd, setProductAdd] = useState(false)
    const [curPosSettings, setCurPosSettings] = useState([])
    const [deleteCount, setDeleteCount] = useState(0)
    const [isReversing, setIsReversing] = useState(false)
    const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false)
    const [isView, setIsView] = useState(false)
    const [isProductView, setIsProductView] = useState(false)
    const [showReport, setShowReport] = useState(false)
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
    const [purchaseEntries, setPurchaseEntries] = useState([])
    const [postCount, setPostCount] = useState(0)
    const [uoms, setUoms] = useState([])
    const [categories, setCategories] = useState([])
    const [wrhs, setWrhs] = useState([])
    const [vendors, setVendors] = useState([])
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

    // Payment tracking — a separate layer on top of Purchase, not stored on
    // the Purchase doc itself. purchasePaidTotals maps a purchase's own
    // createdAt (its stable key) to the sum of VendorPayments recorded
    // against it (sourceCollection:'Purchase', sourceId:<createdAt>).
    const [purchasePaidTotals, setPurchasePaidTotals] = useState({})
    // sourceId -> array of distinct payment method names used against that
    // purchase (a partial payment plan could legitimately use more than one).
    const [purchasePaymentMethodsUsed, setPurchasePaymentMethodsUsed] = useState({})
    const [showPaymentForm, setShowPaymentForm] = useState(false)
    // Split-bill: `rows` lets one payment submission be divided across
    // multiple payment methods (e.g. part cash, part bank) in a single go —
    // date/reference/notes stay shared across all rows since they represent
    // one payment event, submitted as N independent VendorPayments records.
    const emptyPaymentRow = { amount: '', payPoint: '' }
    const [paymentForm, setPaymentForm] = useState({ rows: [{ ...emptyPaymentRow }], postingDate: new Date(Date.now()).toISOString().slice(0, 10), receiptNo: '', notes: '' })
    const [isPostingPayment, setIsPostingPayment] = useState(false)

    const defaultFields = {
        purchaseDepartment: '',
        purchaseHandler: '',
        itemCategory: '',
        location: '',
        purchaseQuantity: '',
        purchaseUOM: '',
        purchaseAmount: '',
        purchaseVendor: '',
        vendorId: '',
        vendorNo: '',
        vendorName: '',
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
        document.title = 'Purchase | Enterprise Compute Central'
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
    // Payments live entirely in VendorPayments (a layer on top of Purchase,
    // never stored on the Purchase doc) — grouping by sourceId here gives
    // "how much has been paid so far" per purchase in one round trip instead
    // of a query per purchase.
    const refreshPurchasePaidTotals = async () => {
        const cmp_val = window.localStorage.getItem('sessn-cmp')
        if (!cmp_val) return;
        try {
            const resp = await fetchServer("POST", {
                database: cmp_val,
                collection: "VendorPayments",
                prop: [
                    { $match: { sourceCollection: 'Purchase' } },
                    { $sort: { createdAt: 1 } },
                    // Grouped first by (purchase, payPoint) so a split payment
                    // across multiple methods keeps each method's own amount
                    // distinct, then regrouped by purchase into a per-method
                    // breakdown — a plain $addToSet of payPoint names alone
                    // couldn't show "Cash: N5,000, Bank: N3,000", only the
                    // method names with no amounts.
                    { $group: { _id: { sourceId: '$sourceId', payPoint: '$payPoint' }, amount: { $sum: '$amount' } } },
                    { $group: { _id: '$_id.sourceId', paid: { $sum: '$amount' }, methods: { $push: { payPoint: '$_id.payPoint', amount: '$amount' } } } },
                ],
            }, "aggregateDocs", server)
            if (!resp.err && Array.isArray(resp.record)) {
                const totals = {}
                const methods = {}
                resp.record.forEach((row) => {
                    totals[row._id] = Number(row.paid) || 0
                    methods[row._id] = (row.methods || []).filter((m) => m?.payPoint)
                })
                setPurchasePaidTotals(totals)
                setPurchasePaymentMethodsUsed(methods)
            }
        } catch (e) { }
    }

    const refreshPurchaseData = async () => {
        const cmp_val = window.localStorage.getItem('sessn-cmp')
        if (!cmp_val) return;
        // Fire-and-forget, deliberately outside the tasks below — a hiccup
        // refreshing payment totals must never be able to block loading
        // purchases/vendors (which the vendor dropdown depends on).
        refreshPurchasePaidTotals().catch(() => {});
        try {
            const tasks = [];
            if (products.length) {
                tasks.push(getProductsWithStock(cmp_val, products));
            }
            tasks.push(getApprovals(cmp_val, companyRecord));
            tasks.push(getEmployees(cmp_val, companyRecord));
            tasks.push(getPurchase(cmp_val, companyRecord));
            await Promise.all(tasks);
            const vendorResp = await fetchServer("POST", {
                database: cmp_val,
                collection: "Vendors"
            }, "getDocsDetails", server)
            if (!vendorResp.err && Array.isArray(vendorResp.record)) {
                setVendors(vendorResp.record)
            }
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
        if ((companyRecord?.permissions || []).includes('postPurchase') || companyRecord?.status === 'admin') {
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
            } else if (name === 'vendorId') {
                const vendor = vendors.find((item) => item._id === value)
                setFields((fields) => ({
                    ...fields,
                    vendorId: value,
                    vendorNo: vendor?.vendorNo || '',
                    vendorName: vendor?.name || '',
                    purchaseVendor: vendor?.name || fields.purchaseVendor || ''
                }))
            } else {
                setFields((fields) => {
                    return {
                        ...fields,
                        [name]: value,
                        ...(name === 'purchaseVendor' && !fields.vendorId ? { vendorName: value } : {})
                    }
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
                    // Both the actual stock posting and the Purchase doc's
                    // stage flip now happen server-side in one atomic Mongo
                    // transaction (see wageserver/UserModule/Purchase/purchase.js)
                    // instead of a client-side loop of individual /createDoc
                    // calls followed by a separate re-link call — closes the
                    // double-post/double-reverse race the two-step version had,
                    // and every InventoryTransactions line now gets a real
                    // server-issued documentNo.
                    const finishUpAfterPost = async (record) => {
                        setProductAdd(false)
                        getPurchase(company)
                        getProductsWithStock(company, products)
                        setFields((prevFields) => ({ ...prevFields, ...record }))
                        if (action === 'purchase') {
                            const purchaseWrh = wrhs.find((wh) => { return wh.purchase })
                            const transactions = await getPurchaseProducts(company, record)
                            if (transactions.length) {
                                const entriesFiltered = []
                                transactions.forEach((transaction) => {
                                    if (transaction.location === purchaseWrh?.name || transaction.location === record?.location) {
                                        entriesFiltered.push(transaction)
                                    }
                                })
                                setPurchaseEntries([...entriesFiltered])
                            }
                            const rep = await fetchServer("POST", {
                                collection: "ProductCostLogs",
                                markUp: curPosSettings?.useMarkUp || false,
                                markUpValue: 30,
                                prop: entryIds
                            }, "updateProductCost", server)
                            if (!rep.err) getProducts(company)
                        } else {
                            setPurchaseEntries(record?.data?.validEntries || [])
                        }
                    }

                    try {
                        if (action === 'reverse') {
                            setAlertState('info')
                            setAlert('Reversing Inventory...')
                            setAlertTimeout(100000)
                            const resp = await fetchServer("POST", {
                                purchaseCreatedAt: curPurchase.createdAt,
                            }, "purchase/reversePurchaseReceipt", server)
                            if (resp?.err || !resp?.isDelivered) {
                                setAlertState('error')
                                setAlert(resp?.mess || 'Could not reverse purchase.')
                                setAlertTimeout(5000)
                                if (curApproval) curApproval.posted = false
                                return
                            }
                            setAlertState('success')
                            setAlert(`Purchase reversed successfully (${resp.documentNos?.join(', ') || resp.count} line(s)).`)
                            setAlertTimeout(3000)
                            if (curApproval) curApproval.posted = false
                            await finishUpAfterPost(resp.record)
                        } else {
                            let purchaseCreatedAt = curPurchase?.createdAt
                            if (curPurchase === null) {
                                // No Purchase draft exists yet — create it first
                                // (unchanged generic-gateway create, no stock
                                // effect), then atomically receive it.
                                setAlertState('info')
                                setAlert('Creating purchase record...')
                                setAlertTimeout(100000)
                                purchaseCreatedAt = createdAt
                                const createResp = await fetchServer("POST", {
                                    database: company,
                                    collection: "Purchase",
                                    update: {
                                        ...fields,
                                        stage: 'receipt',
                                        postingDate: purchaseDate,
                                        approvedBy: curApproval?.approvedBy || companyRecord?.emailid,
                                        createdAt: purchaseCreatedAt,
                                    }
                                }, "createDoc", server)
                                if (createResp?.err) {
                                    setAlertState('error')
                                    setAlert(createResp.mess)
                                    setAlertTimeout(5000)
                                    if (curApproval) curApproval.posted = false
                                    return
                                }
                                if (curApproval) {
                                    await removeApproval(company, 'purchase', postAction, {
                                        createdAt: curApproval.createdAt,
                                        postingDate: curApproval.postingDate
                                    })
                                }
                            }
                            setAlertState('info')
                            setAlert('Receiving Inventory...')
                            setAlertTimeout(100000)
                            const resp = await fetchServer("POST", {
                                purchaseCreatedAt,
                                entries: validEntries,
                                postingDate: purchaseDate,
                                location: fields?.location,
                                handlerId: fields.purchaseHandler,
                            }, "purchase/postPurchaseReceipt", server)
                            if (resp?.err || !resp?.isDelivered) {
                                setAlertState('error')
                                setAlert(resp?.mess || 'Could not receive purchase.')
                                setAlertTimeout(5000)
                                if (curApproval) curApproval.posted = false
                                return
                            }
                            setAlertState('success')
                            setAlert(`Purchase received successfully (${resp.documentNos?.join(', ') || resp.count} line(s)).`)
                            setAlertTimeout(3000)
                            if (curApproval) curApproval.posted = false
                            await finishUpAfterPost(resp.record)
                        }
                    } catch (e) {
                        setAlertState('error')
                        setAlert('Network error while posting purchase.')
                        setAlertTimeout(4000)
                        if (curApproval) curApproval.posted = false
                    }
                } else {
                    if (action === 'purchase'){
                        addPurchase(createdAt, entryIds, data)
                    }
                }
            }
            if (curApproval && curApproval?.approved) {
                if (companyRecord?.status !== 'admin' && !(companyRecord?.permissions || []).includes('allow_purchase_posts')) {
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
                    markUp: curPosSettings?.useMarkUp || false,
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
            if (isReversing) return
            setIsReversing(true)
            setTimeout(() => setIsReversing(false), 8000)
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

    // Payment methods eligible for a Purchase — same filtered-dropdown
    // pattern used across the app for the 'purchase' module (Settings ->
    // Payment Methods -> Assign To). A method missing `modules` entirely is
    // treated as available everywhere (legacy/back-compat), never as
    // available nowhere.
    const purchasePaymentMethods = (paymentMethods || []).filter((m) => !Array.isArray(m.modules) || m.modules.includes('purchase'))

    // Purchases received before this feature shipped were auto-settled to
    // cash in full by the old code (postPurchaseReceipt used to post both a
    // receipt leg AND a settlement leg unconditionally) — there's no
    // VendorPayments record for them since that mechanism didn't exist yet,
    // so without this they'd incorrectly show as Unpaid. `updatedAt` is when
    // postPurchaseReceipt actually ran (createdAt is the original draft's
    // timestamp, which can predate the actual receipt by any amount of
    // time), falling back to createdAt only for very old docs with neither.
    const PAYMENT_TRACKING_CUTOVER = new Date('2026-08-23T12:00:28.000Z').getTime()
    const wasAutoSettledLegacy = (pur) => {
        if (pur?.stage !== 'posted') return false
        const settledAt = Number(pur?.updatedAt) || Number(pur?.createdAt) || 0
        return settledAt < PAYMENT_TRACKING_CUTOVER
    }

    // Purchase.paymentStatus/paidAmount are written directly onto the
    // document server-side (businessPartners.js's syncPurchasePaymentStatus)
    // the moment a payment posts, so they're already correct in the very
    // first fetch of the purchase list — no need to wait on the separate
    // purchasePaidTotals aggregation, which was the cause of every purchase
    // visibly flashing UNPAID (the default) until that second round trip
    // resolved. purchasePaidTotals is kept only as a fallback for purchases
    // predating this field (before the one-time backfill/this deploy).
    const getPurchaseRemainingBalance = (pur) => {
        if (wasAutoSettledLegacy(pur)) return 0
        const amount = Number(pur?.purchaseAmount) || 0
        const paid = pur?.paymentStatus !== undefined ? (Number(pur?.paidAmount) || 0) : (Number(purchasePaidTotals[pur?.createdAt]) || 0)
        return Math.round((amount - paid) * 100) / 100
    }

    const getPurchasePaymentStatus = (pur) => {
        if (wasAutoSettledLegacy(pur)) return 'PAID'
        if (pur?.paymentStatus !== undefined) return pur.paymentStatus
        const paid = Number(purchasePaidTotals[pur?.createdAt]) || 0
        const amount = Number(pur?.purchaseAmount) || 0
        if (paid <= 0) return 'UNPAID'
        if (paid >= amount) return 'PAID'
        return 'PARTIALLY PAID'
    }

    // The old auto-settlement code always defaulted to cash (purchaseBank
    // was never actually set by any UI), so a legacy purchase's real
    // payment method is known even without a VendorPayments record.
    const getPurchasePaymentMethodsLabel = (pur) => {
        if (wasAutoSettledLegacy(pur)) return 'Cash (legacy)'
        const methods = purchasePaymentMethodsUsed[pur?.createdAt] || []
        return methods.length
            ? methods.map((m) => `${m.payPoint}: ₦${Number(m.amount || 0).toLocaleString()}`).join(', ')
            : '—'
    }

    const handlePostPurchasePayment = async () => {
        if (!curPurchase?.vendorId) return
        const rows = (paymentForm.rows || []).map((row) => ({ ...row, amount: Number(row.amount) }))
        if (!rows.length || rows.some((row) => !row.amount || row.amount <= 0)) {
            setAlertState('error')
            setAlert('Enter a payment amount greater than zero for every payment method row.')
            setAlertTimeout(3000)
            return
        }
        if (rows.some((row) => !row.payPoint)) {
            setAlertState('error')
            setAlert('Select a payment method for every row.')
            setAlertTimeout(3000)
            return
        }
        const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0)
        const remaining = getPurchaseRemainingBalance(curPurchase)
        if (totalAmount > remaining && remaining > 0) {
            setAlertState('info')
            setAlert(`Heads up — this payment (₦${totalAmount.toLocaleString()}) exceeds the remaining balance (₦${remaining.toLocaleString()}). Posting anyway.`)
            setAlertTimeout(4000)
        }
        setIsPostingPayment(true)
        try {
            // Split-bill: one VendorPayments record per row, posted
            // sequentially (not Promise.all) — postVendorPayment's
            // syncPurchasePaymentStatus recomputes the Purchase's cumulative
            // paidAmount by re-summing every VendorPayments row each time it
            // runs, so concurrent calls could race that read-then-write;
            // awaiting each in turn avoids that entirely, and each row's own
            // GL entries post correctly and independently either way.
            for (const row of rows) {
                // eslint-disable-next-line no-await-in-loop
                const resp = await fetchServer('POST', {
                    payment: {
                        vendorId: curPurchase.vendorId,
                        amount: row.amount,
                        payPoint: row.payPoint,
                        postingDate: paymentForm.postingDate,
                        receiptNo: paymentForm.receiptNo,
                        notes: paymentForm.notes,
                        sourceCollection: 'Purchase',
                        sourceId: curPurchase.createdAt,
                    },
                }, 'business-partners/postVendorPayment', server)
                if (resp.err || !resp.ok) {
                    setAlertState('error')
                    setAlert(resp.mess || `Unable to post the ${row.payPoint} portion of this payment.`)
                    setAlertTimeout(4000)
                    return
                }
            }
            setAlertState('success')
            setAlert(rows.length > 1 ? `Payment posted successfully across ${rows.length} payment methods!` : 'Payment posted successfully!')
            setAlertTimeout(1500)
            setShowPaymentForm(false)
            setPaymentForm({ rows: [{ ...emptyPaymentRow }], postingDate: new Date(Date.now()).toISOString().slice(0, 10), receiptNo: '', notes: '' })
            await refreshPurchasePaidTotals()
        } catch (e) {
            setAlertState('error')
            setAlert('Unable to post payment. Please try again.')
            setAlertTimeout(4000)
        } finally {
            setIsPostingPayment(false)
        }
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
                {showPaymentForm && curPurchase && (
                    <div
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
                        onClick={() => setShowPaymentForm(false)}
                    >
                        <div
                            style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 style={{ marginTop: 0 }}>Mark Purchase as Paid</h3>
                            <p style={{ color: '#666', fontSize: '0.9rem' }}>
                                Remaining balance: ₦{getPurchaseRemainingBalance(curPurchase).toLocaleString()}
                            </p>
                            {paymentForm.rows.map((row, rowIndex) => (
                                <div key={rowIndex} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '10px' }}>
                                    <div className='inpcov' style={{ flex: 1 }}>
                                        <div>{paymentForm.rows.length > 1 ? `Amount (${rowIndex + 1})` : 'Amount'}</div>
                                        <input
                                            className='forminp'
                                            type='number'
                                            value={row.amount}
                                            onChange={(e) => setPaymentForm((prev) => ({
                                                ...prev,
                                                rows: prev.rows.map((r, i) => i === rowIndex ? { ...r, amount: e.target.value } : r),
                                            }))}
                                        />
                                    </div>
                                    <div className='inpcov' style={{ flex: 1 }}>
                                        <div>Payment Method</div>
                                        <select
                                            className='forminp'
                                            value={row.payPoint}
                                            onChange={(e) => setPaymentForm((prev) => ({
                                                ...prev,
                                                rows: prev.rows.map((r, i) => i === rowIndex ? { ...r, payPoint: e.target.value } : r),
                                            }))}
                                        >
                                            <option value=''>Select payment method</option>
                                            {purchasePaymentMethods.map((m) => (
                                                <option key={m.i_d || m.name} value={m.name}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {paymentForm.rows.length > 1 && (
                                        <div
                                            className='edit'
                                            style={{ cursor: 'pointer', padding: '10px 12px' }}
                                            title='Remove this payment method'
                                            onClick={() => setPaymentForm((prev) => ({ ...prev, rows: prev.rows.filter((_, i) => i !== rowIndex) }))}
                                        >×</div>
                                    )}
                                </div>
                            ))}
                            <div
                                className='edit'
                                style={{ cursor: 'pointer', fontSize: '0.85rem', width: 'fit-content', marginBottom: '14px' }}
                                onClick={() => setPaymentForm((prev) => ({ ...prev, rows: [...prev.rows, { ...emptyPaymentRow }] }))}
                            >
                                + Split across another payment method
                            </div>
                            {paymentForm.rows.length > 1 && (
                                <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '-8px' }}>
                                    Total across all rows: ₦{paymentForm.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString()}
                                </p>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                                <div className='inpcov'>
                                    <div>Date</div>
                                    <input
                                        className='forminp'
                                        type='date'
                                        value={paymentForm.postingDate}
                                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, postingDate: e.target.value }))}
                                    />
                                </div>
                                <div className='inpcov'>
                                    <div>Reference (optional)</div>
                                    <input
                                        className='forminp'
                                        value={paymentForm.receiptNo}
                                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, receiptNo: e.target.value }))}
                                    />
                                </div>
                                <div className='inpcov' style={{ gridColumn: '1 / -1' }}>
                                    <div>Notes (optional)</div>
                                    <input
                                        className='forminp'
                                        value={paymentForm.notes}
                                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                                <div className='edit' style={{ cursor: isPostingPayment ? 'not-allowed' : 'pointer', opacity: isPostingPayment ? 0.6 : 1 }} onClick={() => { if (!isPostingPayment) handlePostPurchasePayment() }}>
                                    {isPostingPayment ? 'Posting...' : 'Submit Payment'}
                                </div>
                                <div className='edit' style={{ cursor: 'pointer' }} onClick={() => setShowPaymentForm(false)}>Cancel</div>
                            </div>
                        </div>
                    </div>
                )}
                {productAdd && <AddProduct
                    products={products}
                    category={fields.itemCategory}
                    purchaseDate={purchaseDate}
                    setPurchaseDate={setPurchaseDate}
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
                    server={server}
                    fetchServer={fetchServer}
                    isSubmittingPurchase={isSubmittingPurchase}
                    setIsSubmittingPurchase={setIsSubmittingPurchase}
                    paymentStatus={getPurchasePaymentStatus(curPurchase)}
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
                                        {pur.vendorId && <div className='deptdesc' style={{ fontSize: '0.85rem', color: getPurchasePaymentStatus(pur) === 'PAID' ? 'green' : (getPurchasePaymentStatus(pur) === 'PARTIALLY PAID' ? '#b8860b' : 'red') }}><b>{getPurchasePaymentStatus(pur)}</b></div>}
                                    </div>
                                    {(companyRecord.status === 'admin') && <div
                                        className='edit'
                                        name='delete'
                                        style={{ color: 'red', background: 'white', borderRadius: '8px', padding: '5px 10px', border: 'solid red 1.3px', cursor: isReversing ? 'not-allowed' : 'pointer', opacity: isReversing ? 0.6 : 1 }}
                                        onClick={() => {
                                            if (isReversing) return
                                            setAlertState('info')
                                            setAlert('You are about to Reverse the selected Purchase Record. Please click again if you are sure!')
                                            setAlertTimeout(5000)
                                            deletePurchase(pur)
                                        }}
                                    >
                                        {isReversing ? 'Processing...' : (stage === 'posted' ? 'Reverse' : 'Delete')}
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
                        {curPurchase && curPurchase.vendorId && (
                            <div className='purchase-payment-panel' style={{ marginBottom: '14px', padding: '12px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                                <div>
                                    <div><b>Payment status:</b> {getPurchasePaymentStatus(curPurchase)}</div>
                                    <div>Paid so far: ₦{(wasAutoSettledLegacy(curPurchase) ? Number(curPurchase.purchaseAmount) || 0 : Number(purchasePaidTotals[curPurchase.createdAt]) || 0).toLocaleString()}</div>
                                    <div>Remaining balance: ₦{getPurchaseRemainingBalance(curPurchase).toLocaleString()}</div>
                                    <div>Payment method: {getPurchasePaymentMethodsLabel(curPurchase)}</div>
                                </div>
                                {getPurchasePaymentStatus(curPurchase) !== 'PAID' && (
                                    <div
                                        className='edit'
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            const remaining = getPurchaseRemainingBalance(curPurchase)
                                            setPaymentForm({
                                                rows: [{ amount: remaining > 0 ? String(remaining) : '', payPoint: '' }],
                                                postingDate: new Date(Date.now()).toISOString().slice(0, 10),
                                                receiptNo: '',
                                                notes: '',
                                            })
                                            setShowPaymentForm(true)
                                        }}
                                    >
                                        Mark as Paid
                                    </div>
                                )}
                            </div>
                        )}
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
                            <div>Registered Vendor</div>
                            <select
                                className='forminp'
                                name='vendorId'
                                value={fields.vendorId || ''}
                                disabled={isView}
                            >
                                <option value=''>Select registered vendor</option>
                                {vendors.map((vendor) => (
                                    <option key={vendor._id} value={vendor._id}>
                                        {`${vendor.vendorNo || ''} ${vendor.name || ''}`.trim()}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className='inpcov'>
                            <div>Vendor Name</div>
                            <input
                                className='forminp'
                                name='purchaseVendor'
                                type='text'
                                autoComplete='on'
                                placeholder='Vendor name'
                                value={fields.purchaseVendor}
                                disabled={isView || !!fields.vendorId}
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
                            style={{ cursor: (purchaseEntries.length && !isSubmittingPurchase) ? 'pointer' : 'not-allowed', opacity: isSubmittingPurchase ? 0.6 : 1 }}
                            onClick={() => {
                                if (isSubmittingPurchase) return
                                if (purchaseEntries.length) {
                                    const purchaseWrh = wrhs.find((wh) => wh.purchase)
                                    if (!purchaseWrh && !fields?.location) {
                                        setAlertState('error')
                                        setAlert('Please Configure a Default Purchase Location, or Select A Purchase Location Before Proceeding!')
                                        setAlertTimeout(3000)
                                        return
                                    }
                                    setIsSubmittingPurchase(true)
                                    setTimeout(() => setIsSubmittingPurchase(false), 8000)
                                    handleProductPurchase()
                                }
                            }}
                        >{isSubmittingPurchase ? 'Processing...' : (curApproval ? (curApproval.approved ? purchaseStatus : (isApprover ? 'Approve Request' : 'Request Approval')) : (isApprover ? 'Post Purchase' : 'Request Approval'))}</div>
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
    products, category, purchaseDate, setPurchaseDate, fields, setFields, curPurchase, setProductAdd, uoms, isProductView, setIsProductView,
    handleProductPurchase, purchaseEntries, setPurchaseEntries, companyRecord, curApproval, server, fetchServer,
    isSubmittingPurchase, setIsSubmittingPurchase, paymentStatus,
}) => {
    const [productSearch, setProductSearch] = useState('')
    const [nullFieldsCount, setNullFieldsCount] = useState(0)
    const [isProductEdit, setIsProductEdit] = useState(false)
    const { getDate, setAlertState, setAlert, setAlertTimeout } = useContext(ContextProvider)
    const getPurchasePrintTitle = (type = 'purchaseOrder') => ({
        purchaseOrder: 'PURCHASE ORDER',
        grn: 'GOODS RECEIVED NOTE',
        purchaseInvoice: 'PURCHASE INVOICE',
    }[type] || 'PURCHASE DOCUMENT')
    const printToPDF = async (type = 'purchaseOrder') => {
        setAlertState('info')
        setAlert('Generating purchase document...')
        setAlertTimeout(100000)
        try {
            // PO shows what was ORDERED (the original line items captured when
            // this purchase was first drafted, preserved on `fields.data` even
            // after receiving — see postPurchaseReceipt). GRN and Invoice both
            // show what was actually RECEIVED (`purchaseEntries`, sourced from
            // the posted InventoryTransactions) — a GRN records what physically
            // arrived, and an invoice bills for what was received, not what was
            // originally ordered. Falls back to purchaseEntries for a purchase
            // still in 'receipt' stage, where the ordered lines are all that
            // exists yet (no InventoryTransactions posted).
            const documentEntries = type === 'purchaseOrder'
                ? (fields.data?.validEntries?.length ? fields.data.validEntries : purchaseEntries)
                : purchaseEntries
            await exportPurchaseDocumentToPDF({
                type,
                title: getPurchasePrintTitle(type),
                companyRecord,
                fields,
                entries: documentEntries,
                purchaseDate: purchaseDate || fields.postingDate,
                curApproval,
                getDate,
                server,
                fetchServer
            })
            setAlertState('success')
            setAlert('Document generated successfully!')
            setAlertTimeout(1000)
        } catch (error) {
            console.error('Error generating purchase document:', error)
            setAlertState('error')
            setAlert('Failed to generate purchase document. Please try again.')
            setAlertTimeout(5000)
        }
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
                    totalSales: '',
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
            const fieldsSalesAmount = purchaseEntries.reduce((acc, entry) => {
                const prd = products.find((p) => { return p.i_d === entry.productId })                
                return acc + (Number(prd?.salesPrice) || 0) * (Number(entry.baseQuantity) || 0)
            }, 0)
            setFields((fields) => {
                return { ...fields, purchaseAmount: fieldsAmount, salesAmount: fieldsSalesAmount }
            })
            setNullFieldsCount(ct)
        }else if (!fields.salesAmount){
            const fieldsSalesAmount = purchaseEntries.reduce((acc, entry) => {
                const prd = products.find((p) => { return p.i_d === entry.productId })                
                return acc + (Number(prd?.salesPrice) || 0) * (Number(entry.baseQuantity) || 0)
            }, 0)
            setFields((fields)=>{
                return {...fields, salesAmount: fieldsSalesAmount}
            })
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
                        <div>
                            <label>Product Purchase Details</label>
                        </div>
                        {(companyRecord?.status === 'admin' || (companyRecord?.permissions || []).includes('print_purchase_doc')) && <div className='purchase-doc-print-actions'>
                            <button type='button' onClick={() => printToPDF('purchaseOrder')}>Print PO</button>
                            {/* GRN only exists once goods have actually been received. */}
                            {['posted', null, undefined].includes(fields.stage) && (
                                <button type='button' onClick={() => printToPDF('grn')}>Print GRN</button>
                            )}
                            {/* Invoice only exists once at least one payment has been recorded. */}
                            {paymentStatus !== 'UNPAID' && (
                                <button type='button' onClick={() => printToPDF('purchaseInvoice')}>Print Invoice</button>
                            )}
                        </div>}
                    </div>
                    <div className='add-products-button'>
                        {!isProductView && <div
                            className='add-products-button-add'
                            style={{ cursor: isSubmittingPurchase ? 'not-allowed' : 'pointer', opacity: isSubmittingPurchase ? 0.6 : 1 }}
                            onClick={
                                () => {
                                    if (isSubmittingPurchase) return
                                    if (nullFieldsCount === 0) {
                                        setIsSubmittingPurchase(true)
                                        setTimeout(() => setIsSubmittingPurchase(false), 8000)
                                        handleProductPurchase()
                                    } else {
                                        setAlertState('error')
                                        setAlert('Please Make Sure Both Quantity and Amount fields are filled before proceeding!')
                                        setAlertTimeout(1000)
                                    }
                                }
                            }
                        >{isSubmittingPurchase ? 'Processing...' : (curPurchase === null ? 'Add' : (fields.stage === 'receipt' ? 'Receive' : 'Save'))}</div>}
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
                                setFields((fields) => {
                                    return { ...fields, salesAmount: '' }
                                })
                            }}
                        >{isProductView ? 'Close' : 'Cancel'}</div>
                    </div>
                    <div className='add-products-search'>
                        <input
                            placeholder='🔍 Search products by name or ID...'
                            onChange={(e) => { setProductSearch(e.target.value) }}
                        />
                    </div>
                    <div className='add-products-totals'>
                        <div className='add-products-total-card add-purchase'>
                            <div className='add-products-total-label'>Total Purchase Amount</div>
                            <div className='add-products-total-value'>₦{(fields.purchaseAmount || 0).toLocaleString()}</div>
                        </div>
                        {companyRecord?.status === 'admin' && <div className='add-products-total-card sales'>
                            <div className='add-products-total-label'>Total Sales Amount</div>
                            <div className='add-products-total-value'>₦{(fields.salesAmount || 0).toLocaleString()}</div>
                        </div>}
                        {companyRecord?.status === 'admin' && <div className={`add-products-total-card profit ${(fields.salesAmount || 0) - (fields.purchaseAmount || 0) < 0 ? 'negative' : ''}`}>
                            <div className='add-products-total-label'>Projected Profit</div>
                            <div className='add-products-total-value'>₦{((fields.salesAmount || 0) - (fields.purchaseAmount || 0)).toLocaleString()}</div>
                        </div>}
                        {fields?.stage === 'receipt' && <div className='add-products-total-card'>
                            <div className='add-products-total-label'>Receipt Posting Date</div>
                            <input
                                type='date'
                                value={purchaseDate}
                                disabled={isProductView}
                                onChange={(e) => {
                                    const date = new Date(e.target.value)
                                    const today = new Date()
                                    if (date <= today) {
                                        setPurchaseDate(e.target.value)
                                    } else {
                                        setAlertState('error')
                                        setAlert('You cannot set the posting date in the future!')
                                        setAlertTimeout(5000)
                                    }
                                }}
                            />
                        </div>}
                    </div>
                    <div className='add-products-content-wrapper'>
                        <div className='add-products-content-header'>
                            <div>Product Name</div>
                            <div>Product ID</div>
                            {(companyRecord?.status === 'admin') && curApproval &&
                                <div>Stock</div>
                            }
                            <div>Qty</div>
                            <div>UOM</div>
                            <div>Amount</div>
                            {companyRecord?.status === 'admin' && <div>Sales</div>}
                        </div>
                        <div className='add-products-content'>                           
                            {purchaseEntries.length === 0 && isProductView && <div className='load-products'><span>⏳ Loading Purchase Products...</span></div>}
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
                                let currProduct = (products.find((p) => { return p.i_d === entry.productId }))
                                let currentStock = currProduct?.stockSummary?.closingQty 
                                entry.totalSales = entry.totalSales || (Number(currProduct.salesPrice || 0) * Number(entry.baseQuantity || 0))
                                return (
                                    <div key={index} className='add-products-content-entry'>
                                        <div>{entry.name}</div>
                                        <div>{entry.productId}</div>
                                        {(companyRecord?.status === 'admin' || (companyRecord?.permissions || []).includes('allow_purchase_posts')) && curApproval &&
                                            <div>{currentStock}</div>
                                        }
                                        <div>
                                            <input
                                                type='number'
                                                name='quantity'
                                                id={entry.productId}
                                                value={entry.quantity}
                                                onChange={(e) => { handlePurchaseUdpate(e, index) }}
                                                disabled={isProductView}
                                                placeholder='0'
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
                                                placeholder='0.00'
                                            />
                                        </div>
                                        {companyRecord?.status === 'admin' && <div>
                                            <input
                                                name='totalSales'
                                                type='number'
                                                id={entry.productId}
                                                value={entry.totalSales}
                                                disabled={true}
                                                placeholder='0.00'
                                            />
                                        </div>}
                                    </div>
                                )
                            })}
                        </div>                        
                    </div>                    
                </div>
            </div>
        </>
    )
}
