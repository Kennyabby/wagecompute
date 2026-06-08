import './BusinessPartners.css'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { uploadFile } from '../../Resources/ClientServerAPIConn/API/fileCrudApi'
import html2pdf from 'html2pdf.js'
import { generateExcel } from '../../utils/exportUtils'

const emptyPartner = { name: '', type: '', email: '', phone: '', address: '', contactPerson: '', paymentTermsDays: 30, notes: '' }
const emptyLine = { productId: '', productName: '', location: '', description: '', quantity: 1, unitPrice: '', costPrice: '', discount: 0, tax: 0 }
const today = () => new Date().toISOString().slice(0, 10)

const money = (value) => 'N' + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const cleanName = (value = 'document') => String(value || 'document').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '')
const totalLines = (lines = []) => lines.reduce((sum, line) => {
    const quantity = Number(line.quantity || 0)
    const unitPrice = Number(line.unitPrice || line.amount || 0)
    return sum + (quantity * unitPrice) - Number(line.discount || 0) + Number(line.tax || 0)
}, 0)

const BusinessPartners = () => {
    const { server, fetchServer, storePath, company, companyRecord, settings, products, getProducts, setAlert, setAlertState, setAlertTimeout } = useContext(ContextProvider)
    const reportPrintRef = useRef(null)
    const [activeTab, setActiveTab] = useState('customers')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [snapshot, setSnapshot] = useState({
        vendors: [], customers: [], quotes: [], orders: [], invoices: [], shipments: [], customerPayments: [], vendorBills: [], vendorPayments: [], purchases: [],
        customerSummaries: {}, vendorSummaries: {},
    })
    const [selectedVendor, setSelectedVendor] = useState(null)
    const [selectedCustomer, setSelectedCustomer] = useState(null)
    const [vendorForm, setVendorForm] = useState(emptyPartner)
    const [customerForm, setCustomerForm] = useState(emptyPartner)
    const [salesDocType, setSalesDocType] = useState('quote')
    const [salesDoc, setSalesDoc] = useState({ customerId: '', postingDate: today(), dueDate: today(), lines: [emptyLine], notes: '' })
    const [vendorBill, setVendorBill] = useState({ vendorId: '', postingDate: today(), dueDate: today(), lines: [emptyLine], notes: '' })
    const [payment, setPayment] = useState({ partnerType: 'customer', partnerId: '', postingDate: today(), amount: '', payPoint: '', receiptNo: '', notes: '' })
    const [paymentProof, setPaymentProof] = useState(null)
    const [uploadingProof, setUploadingProof] = useState(false)
    const [reportMode, setReportMode] = useState('receivables')
    const [reportFilters, setReportFilters] = useState({ fromDate: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), toDate: today(), partnerType: 'customers', partnerId: '' })
    const [report, setReport] = useState(null)

    useEffect(() => {
        storePath('business-partners')
        document.title = 'Business Partners | Enterprise Compute Central'
    }, [storePath])

    const notify = (message, state = 'success', timeout = 3500) => {
        setAlertState(state)
        setAlert(message)
        setAlertTimeout(timeout)
    }

    const loadSnapshot = async () => {
        setLoading(true)
        try {
            const resp = await fetchServer('POST', {}, 'business-partners/getSnapshot', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Unable to load business partner records.')
            setSnapshot({
                vendors: resp.vendors || [],
                customers: resp.customers || [],
                quotes: resp.quotes || [],
                orders: resp.orders || [],
                invoices: resp.invoices || [],
                shipments: resp.shipments || [],
                customerPayments: resp.customerPayments || [],
                vendorBills: resp.vendorBills || [],
                vendorPayments: resp.vendorPayments || [],
                purchases: resp.purchases || [],
                customerSummaries: resp.customerSummaries || {},
                vendorSummaries: resp.vendorSummaries || {},
            })
        } catch (error) {
            notify(error.message || 'Unable to load business partners.', 'error', 5000)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (company && companyRecord?.emailid) loadSnapshot()
    }, [company, companyRecord?.emailid])

    useEffect(() => {
        if (company && !products?.length) {
            getProducts(company)
        }
    }, [company, products?.length])

    const warehouses = useMemo(() => {
        const setting = (settings || []).find((item) => item?.name === 'warehouses')
        return setting?.warehouses || []
    }, [settings])

    const paymentMethods = useMemo(() => {
        const setting = (settings || []).find((item) => item?.name === 'paymentMethods')
        return setting?.paymentMethods || []
    }, [settings])

    const customerTotals = (customerId) => {
        if (snapshot.customerSummaries?.[customerId]) return snapshot.customerSummaries[customerId]
        const total = snapshot.invoices.filter((row) => row.customerId === customerId).reduce((sum, row) => sum + Number(row.total || 0), 0)
        const paid = snapshot.customerPayments.filter((row) => row.customerId === customerId).reduce((sum, row) => sum + Number(row.amount || 0), 0)
        return { total, paid, balance: total - paid }
    }

    const vendorTotals = (vendorId) => {
        if (snapshot.vendorSummaries?.[vendorId]) return snapshot.vendorSummaries[vendorId]
        const bills = snapshot.vendorBills.filter((row) => row.vendorId === vendorId).reduce((sum, row) => sum + Number(row.total || 0), 0)
        const purchases = snapshot.purchases.filter((row) => row.vendorId === vendorId).reduce((sum, row) => sum + Number(row.purchaseAmount || 0), 0)
        const paid = snapshot.vendorPayments.filter((row) => row.vendorId === vendorId).reduce((sum, row) => sum + Number(row.amount || 0), 0)
        const total = bills + purchases
        return { total, paid, balance: total - paid }
    }

    const kpis = useMemo(() => ({
        customers: snapshot.customers.length,
        vendors: snapshot.vendors.length,
        receivables: snapshot.customers.reduce((sum, customer) => sum + Number(customerTotals(customer._id)?.balance || 0), 0),
        payables: snapshot.vendors.reduce((sum, vendor) => sum + Number(vendorTotals(vendor._id)?.balance || 0), 0),
    }), [snapshot])

    const savePartner = async (kind) => {
        setSaving(true)
        try {
            const isVendor = kind === 'vendor'
            const form = isVendor ? vendorForm : customerForm
            const resp = await fetchServer('POST', { [kind]: form }, isVendor ? 'business-partners/upsertVendor' : 'business-partners/upsertCustomer', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || `Unable to save ${kind}.`)
            notify(resp.mess || `${isVendor ? 'Vendor' : 'Customer'} saved.`)
            if (isVendor) {
                setSelectedVendor(resp.record)
                setVendorForm(resp.record)
            } else {
                setSelectedCustomer(resp.record)
                setCustomerForm(resp.record)
            }
            loadSnapshot()
        } catch (error) {
            notify(error.message || 'Save failed.', 'error', 5000)
        } finally {
            setSaving(false)
        }
    }

    const saveSalesDocument = async () => {
        setSaving(true)
        try {
            const resp = await fetchServer('POST', { type: salesDocType, document: salesDoc }, 'business-partners/upsertSalesDocument', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Unable to save sales document.')
            notify(resp.mess || 'Sales document saved.')
            setSalesDoc({ customerId: '', postingDate: today(), dueDate: today(), lines: [emptyLine], notes: '' })
            loadSnapshot()
        } catch (error) {
            notify(error.message || 'Sales document failed.', 'error', 5000)
        } finally {
            setSaving(false)
        }
    }

    const saveVendorBill = async () => {
        setSaving(true)
        try {
            const resp = await fetchServer('POST', { bill: vendorBill }, 'business-partners/upsertVendorBill', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Unable to save vendor bill.')
            notify(resp.mess || 'Vendor bill saved.')
            setVendorBill({ vendorId: '', postingDate: today(), dueDate: today(), lines: [emptyLine], notes: '' })
            loadSnapshot()
        } catch (error) {
            notify(error.message || 'Vendor bill failed.', 'error', 5000)
        } finally {
            setSaving(false)
        }
    }

    const postPayment = async () => {
        setSaving(true)
        try {
            let proofFields = {}
            if (paymentProof) {
                setUploadingProof(true)
                const folderPath = `${company}/Business Partner Payment Proofs`
                const collection = payment.partnerType === 'vendor' ? 'VendorPayments' : 'CustomerPayments'
                const createdAt = Date.now()
                const uploadResp = await uploadFile(paymentProof, folderPath, createdAt, company, collection, server)
                if (uploadResp.err) throw new Error(uploadResp.mess || 'Payment proof upload failed.')
                proofFields = {
                    proofImgId: uploadResp.imgId,
                    proofViewLink: uploadResp.viewLink,
                    proofDownloadLink: uploadResp.downloadLink,
                }
            }
            const route = payment.partnerType === 'vendor' ? 'business-partners/postVendorPayment' : 'business-partners/postCustomerPayment'
            const payload = payment.partnerType === 'vendor'
                ? { payment: { ...payment, ...proofFields, vendorId: payment.partnerId, paymentNo: payment.receiptNo } }
                : { payment: { ...payment, ...proofFields, customerId: payment.partnerId } }
            const resp = await fetchServer('POST', payload, route, server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Unable to post payment.')
            notify(resp.mess || 'Payment posted.')
            setPayment({ partnerType: 'customer', partnerId: '', postingDate: today(), amount: '', payPoint: '', receiptNo: '', notes: '' })
            setPaymentProof(null)
            loadSnapshot()
        } catch (error) {
            notify(error.message || 'Payment failed.', 'error', 5000)
        } finally {
            setUploadingProof(false)
            setSaving(false)
        }
    }

    const migrateVendors = async () => {
        setSaving(true)
        try {
            const resp = await fetchServer('POST', {}, 'business-partners/migrateVendors', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Unable to migrate vendors.')
            notify(resp.mess || 'Purchase vendors migrated.')
            loadSnapshot()
        } catch (error) {
            notify(error.message || 'Migration failed.', 'error', 6000)
        } finally {
            setSaving(false)
        }
    }

    const selectedReportPartnerName = useMemo(() => {
        const list = reportFilters.partnerType === 'vendors' ? snapshot.vendors : snapshot.customers
        const partner = list.find((item) => item._id === reportFilters.partnerId)
        return partner?.name || 'All partners'
    }, [reportFilters.partnerId, reportFilters.partnerType, snapshot.customers, snapshot.vendors])

    const companyInfo = useMemo(() => ({
        name: companyRecord?.name || company || 'Company',
        address: companyRecord?.address || '',
        phone: companyRecord?.phone || companyRecord?.mobile || '',
        email: companyRecord?.email || companyRecord?.emailid || '',
    }), [company, companyRecord])

    const loadReport = async (mode = reportMode) => {
        setSaving(true)
        try {
            const partnerType = mode === 'payables' ? 'vendors' : 'customers'
            const resp = await fetchServer('POST', {
                mode,
                asOfDate: reportFilters.toDate,
                fromDate: reportFilters.fromDate,
                partnerId: reportFilters.partnerType === partnerType ? reportFilters.partnerId : '',
            }, 'business-partners/getReport', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Unable to load report.')
            setReport({ ...resp, kind: 'aging', title: mode === 'payables' ? 'Aged Payables' : 'Aged Receivables', filters: { ...reportFilters, partnerType } })
            setReportMode(mode)
        } catch (error) {
            notify(error.message || 'Report failed.', 'error', 5000)
        } finally {
            setSaving(false)
        }
    }

    const loadLedgerReport = async (mode, kind) => {
        setSaving(true)
        try {
            const resp = await fetchServer('POST', {
                mode,
                kind,
                fromDate: reportFilters.fromDate,
                toDate: reportFilters.toDate,
                partnerId: reportFilters.partnerType === mode ? reportFilters.partnerId : '',
            }, 'business-partners/getLedger', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Unable to load ledger report.')
            const titleMap = {
                ledger: mode === 'vendors' ? 'Vendor Ledger Entries' : 'Customer Ledger Entries',
                'balance-to-date': mode === 'vendors' ? 'Vendor Balance To Date' : 'Customer Balance To Date',
                trial: mode === 'vendors' ? 'Vendor Trial Balance' : 'Customer Trial Balance',
                'detailed-trial': mode === 'vendors' ? 'Vendor Detailed Trial Balance' : 'Customer Detailed Trial Balance',
            }
            setReport({ ...resp, kind, title: titleMap[kind] || 'Partner Report', filters: { ...reportFilters, partnerType: mode } })
            setReportMode(`${mode}-${kind}`)
        } catch (error) {
            notify(error.message || 'Ledger report failed.', 'error', 5000)
        } finally {
            setSaving(false)
        }
    }

    const getReportRowsAndColumns = () => {
        if (!report) return { rows: [], columns: [] }
        if (report.kind === 'aging') {
            return {
                rows: report.rows || [],
                columns: [
                    { name: 'Partner No', reference: 'partnerNo' },
                    { name: 'Partner', reference: 'partnerName' },
                    { name: 'Document', reference: 'documentNo' },
                    { name: 'Posting Date', reference: 'postingDate' },
                    { name: 'Due Date', reference: 'dueDate' },
                    { name: 'Days Past Due', reference: 'daysPastDue', numeric: true },
                    { name: 'Balance', reference: 'balance', numeric: true },
                ],
            }
        }
        if (report.kind === 'trial' || report.kind === 'balance-to-date') {
            return {
                rows: report.trialBalance || [],
                columns: [
                    { name: 'Partner No', reference: 'partnerNo' },
                    { name: 'Partner', reference: 'partnerName' },
                    { name: 'Debit', reference: 'debit', numeric: true },
                    { name: 'Credit', reference: 'credit', numeric: true },
                    { name: 'Balance Due', reference: 'balance', numeric: true },
                ],
            }
        }
        return {
            rows: report.rows || [],
            columns: [
                { name: 'Date', reference: 'date' },
                { name: 'Partner No', reference: 'partnerNo' },
                { name: 'Partner', reference: 'partnerName' },
                { name: 'Source', reference: 'source' },
                { name: 'Document', reference: 'documentNo' },
                { name: 'Debit', reference: 'debit', numeric: true },
                { name: 'Credit', reference: 'credit', numeric: true },
                { name: 'Balance', reference: 'balance', numeric: true },
            ],
        }
    }

    const exportCurrentReportExcel = () => {
        if (!report) return notify('Load a report before exporting.', 'error', 3500)
        const { rows, columns } = getReportRowsAndColumns()
        generateExcel(rows, columns, companyInfo, { startDate: reportFilters.fromDate, endDate: reportFilters.toDate }, report.title || 'Partner Report', {
            partner: selectedReportPartnerName,
            report: report.title,
            skipAutoTotals: true,
        })
    }

    const exportCurrentReportPdf = () => {
        if (!report || !reportPrintRef.current) return notify('Load a report before printing.', 'error', 3500)
        html2pdf().set({
            margin: 0.25,
            filename: `${cleanName(companyInfo.name)}_${cleanName(report.title)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'A4', orientation: 'landscape' },
        }).from(reportPrintRef.current).save()
    }

    const documentNumber = (doc = {}) => doc.shipmentNo || doc.invoiceNo || doc.orderNo || doc.quoteNo || doc.billNo || 'DRAFT'
    const documentTitle = (type = 'document') => ({
        quote: 'Sales Quote',
        order: 'Sales Order',
        shipment: 'Sales Shipment',
        invoice: 'Sales Invoice',
        purchaseOrder: 'Purchase Order',
        grn: 'Goods Received Note',
        purchaseInvoice: 'Purchase Invoice',
    }[type] || 'Document')

    const printBusinessDocument = (doc, type = 'order') => {
        const no = documentNumber(doc)
        const qrData = encodeURIComponent(`${companyInfo.name}|${documentTitle(type)}|${no}|${doc.postingDate || today()}|${doc.total || 0}`)
        const rows = (doc.lines || []).map((line, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${line.productName || line.description || ''}<br/><small>${line.productId || ''}</small></td>
                <td>${line.location || ''}</td>
                <td>${line.quantity || ''}</td>
                <td>${money(line.unitPrice || line.salesPrice || 0)}</td>
                <td>${money(line.lineTotal || 0)}</td>
            </tr>
        `).join('')
        const wrapper = document.createElement('div')
        wrapper.innerHTML = `
            <section class="bp-print-doc">
                <header>
                    <div>
                        <h1>${companyInfo.name}</h1>
                        <p>${companyInfo.address || ''}</p>
                        <p>${companyInfo.phone || ''} ${companyInfo.email ? ` | ${companyInfo.email}` : ''}</p>
                    </div>
                    <img alt="QR Code" src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${qrData}" />
                </header>
                <div class="bp-print-title">
                    <h2>${documentTitle(type)}</h2>
                    <strong>${no}</strong>
                </div>
                <div class="bp-print-meta">
                    <p><b>Customer:</b> ${doc.customerName || ''}</p>
                    <p><b>Customer No:</b> ${doc.customerNo || ''}</p>
                    <p><b>Posting Date:</b> ${doc.postingDate || ''}</p>
                    <p><b>Due Date:</b> ${doc.dueDate || ''}</p>
                </div>
                <table>
                    <thead><tr><th>#</th><th>Item</th><th>Location</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="6">No lines</td></tr>'}</tbody>
                </table>
                <div class="bp-print-total"><span>Total</span><strong>${money(doc.total)}</strong></div>
                <footer>${doc.notes || ''}</footer>
            </section>
        `
        document.body.appendChild(wrapper)
        html2pdf().set({
            margin: 0.25,
            filename: `${cleanName(companyInfo.name)}_${cleanName(documentTitle(type))}_${cleanName(no)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' },
        }).from(wrapper).save().finally(() => wrapper.remove())
    }

    const postShipmentFromOrder = async (order) => {
        setSaving(true)
        try {
            const resp = await fetchServer('POST', { orderId: order._id, postingDate: today() }, 'business-partners/postSalesShipment', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Unable to post sales shipment.')
            notify(resp.mess || 'Sales shipment posted.')
            loadSnapshot()
        } catch (error) {
            notify(error.message || 'Shipment posting failed.', 'error', 5000)
        } finally {
            setSaving(false)
        }
    }

    const createInvoiceFromOrder = async (order) => {
        setSaving(true)
        try {
            const resp = await fetchServer('POST', {
                type: 'invoice',
                document: {
                    customerId: order.customerId,
                    postingDate: today(),
                    dueDate: order.dueDate || today(),
                    lines: order.lines || [],
                    notes: order.notes || '',
                    sourceOrderNo: order.orderNo,
                },
            }, 'business-partners/upsertSalesDocument', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Unable to post invoice.')
            notify(resp.mess || 'Sales invoice posted.')
            loadSnapshot()
        } catch (error) {
            notify(error.message || 'Invoice posting failed.', 'error', 5000)
        } finally {
            setSaving(false)
        }
    }

    const updateLine = (setter, index, field, value) => {
        setter((prev) => {
            const lines = [...(prev.lines || [])]
            if (field === 'productId') {
                const product = (products || []).find((item) => item.i_d === value || item.productId === value)
                lines[index] = {
                    ...lines[index],
                    productId: value,
                    productName: product?.name || product?.productName || '',
                    description: product?.name || product?.productName || lines[index]?.description || '',
                    unitPrice: product?.salesPrice || lines[index]?.unitPrice || '',
                    costPrice: product?.stockSummary?.averageCost || product?.costPrice || lines[index]?.costPrice || '',
                }
            } else {
                lines[index] = { ...lines[index], [field]: value }
            }
            return { ...prev, lines }
        })
    }

    const addLine = (setter) => setter((prev) => ({ ...prev, lines: [...(prev.lines || []), emptyLine] }))

    const renderPartnerList = (kind) => {
        const isVendor = kind === 'vendor'
        const list = isVendor ? snapshot.vendors : snapshot.customers
        const selected = isVendor ? selectedVendor : selectedCustomer
        return (
            <section className='bp-panel'>
                <h2>{isVendor ? 'Vendors' : 'Corporate Customers'}</h2>
                <p className='bp-muted'>{isVendor ? 'AP subsidiary accounts for purchase and vendor bills.' : 'AR subsidiary accounts for quotes, sales orders, invoices, and customer payments.'}</p>
                <div className='bp-list'>
                    {list.map((item) => {
                        const totals = isVendor ? vendorTotals(item._id) : customerTotals(item._id)
                        return (
                        <div
                            className={'bp-card ' + (selected?._id === item._id ? 'active' : '')}
                            key={item._id}
                            onClick={() => {
                                if (isVendor) {
                                    setSelectedVendor(item)
                                    setVendorForm(item)
                                } else {
                                    setSelectedCustomer(item)
                                    setCustomerForm(item)
                                }
                            }}
                        >
                            <strong>{item.vendorNo || item.customerNo} - {item.name}</strong>
                            <span>{item.type || 'General'} - {item.contactPerson || 'No contact person'}</span>
                            <div className='bp-card-metrics'>
                                <small>Total: {money(totals.total)}</small>
                                <small>Paid: {money(totals.paid)}</small>
                                <small>Balance due: {money(totals.balance)}</small>
                            </div>
                        </div>
                        )
                    })}
                    {!list.length && <div className='bp-empty'>No {isVendor ? 'vendors' : 'customers'} yet.</div>}
                </div>
            </section>
        )
    }

    const renderPartnerForm = (kind) => {
        const isVendor = kind === 'vendor'
        const form = isVendor ? vendorForm : customerForm
        const setForm = isVendor ? setVendorForm : setCustomerForm
        return (
            <section className='bp-form-card'>
                <h3>{isVendor ? 'Vendor Account' : 'Customer Account'}</h3>
                <div className='bp-form-grid'>
                    <label>Name<input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                    <label>Type<input value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder={isVendor ? 'Supplier, contractor...' : 'Corporate, distributor...'} /></label>
                    <label>Email<input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                    <label>Phone<input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                    <label>Contact Person<input value={form.contactPerson || ''} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></label>
                    <label>Payment Terms Days<input type='number' value={form.paymentTermsDays || 0} onChange={(e) => setForm({ ...form, paymentTermsDays: e.target.value })} /></label>
                    <label className='bp-wide'>Address<textarea value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
                    <label className='bp-wide'>Notes<textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
                </div>
                <div className='bp-actions' style={{ marginTop: 16 }}>
                    <button className='bp-primary-btn' disabled={saving} onClick={() => savePartner(kind)}>{saving ? 'Saving...' : `Save ${isVendor ? 'Vendor' : 'Customer'}`}</button>
                    <button className='bp-soft-btn' onClick={() => setForm(emptyPartner)}>New</button>
                </div>
            </section>
        )
    }

    const renderLines = (lines, setter, options = {}) => (
        <div className='bp-lines'>
            {(lines || []).map((line, index) => (
                <div className={`bp-line ${options.products ? 'bp-line-sales' : 'bp-line-basic'}`} key={index}>
                    {options.products && <select value={line.productId || ''} onChange={(e) => updateLine(setter, index, 'productId', e.target.value)}>
                        <option value=''>Select product/service</option>
                        {(products || []).map((product) => (
                            <option key={product.i_d || product.productId} value={product.i_d || product.productId}>
                                {product.name || product.productName}
                            </option>
                        ))}
                    </select>}
                    {options.locations && <select value={line.location || ''} onChange={(e) => updateLine(setter, index, 'location', e.target.value)}>
                        <option value=''>Consumption location</option>
                        {warehouses.map((warehouse) => (
                            <option key={warehouse.name} value={warehouse.name}>{warehouse.name}</option>
                        ))}
                    </select>}
                    <input placeholder='Description' value={line.description || ''} onChange={(e) => updateLine(setter, index, 'description', e.target.value)} />
                    <input type='number' placeholder='Qty' value={line.quantity || ''} onChange={(e) => updateLine(setter, index, 'quantity', e.target.value)} />
                    <input type='number' placeholder='Unit price' value={line.unitPrice || ''} onChange={(e) => updateLine(setter, index, 'unitPrice', e.target.value)} />
                    {options.products && <input type='number' placeholder='Unit cost' value={line.costPrice || ''} onChange={(e) => updateLine(setter, index, 'costPrice', e.target.value)} />}
                    <input type='number' placeholder='Tax' value={line.tax || ''} onChange={(e) => updateLine(setter, index, 'tax', e.target.value)} />
                </div>
            ))}
            <button className='bp-soft-btn' type='button' onClick={() => addLine(setter)}>Add line</button>
        </div>
    )

    const renderDocuments = () => (
        <div className='bp-grid'>
            <section className='bp-form-card'>
                <h3>Corporate Sales Document</h3>
                <div className='bp-form-grid'>
                    <label>Document Type<select value={salesDocType} onChange={(e) => setSalesDocType(e.target.value)}><option value='quote'>Quote</option><option value='order'>Sales Order</option><option value='invoice'>Sales Invoice</option></select></label>
                    <label>Customer<select value={salesDoc.customerId} onChange={(e) => setSalesDoc({ ...salesDoc, customerId: e.target.value })}><option value=''>Select customer</option>{snapshot.customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.customerNo} - {customer.name}</option>)}</select></label>
                    <label>Posting Date<input type='date' value={salesDoc.postingDate} onChange={(e) => setSalesDoc({ ...salesDoc, postingDate: e.target.value })} /></label>
                    <label>Due Date<input type='date' value={salesDoc.dueDate} onChange={(e) => setSalesDoc({ ...salesDoc, dueDate: e.target.value })} /></label>
                    {renderLines(salesDoc.lines, setSalesDoc, { products: true, locations: true })}
                    <label className='bp-wide'>Notes<textarea value={salesDoc.notes || ''} onChange={(e) => setSalesDoc({ ...salesDoc, notes: e.target.value })} /></label>
                </div>
                <div className='bp-actions' style={{ marginTop: 16 }}>
                    <button className='bp-primary-btn' disabled={saving} onClick={saveSalesDocument}>{saving ? 'Saving...' : `Save ${salesDocType}`}</button>
                    <span className='bp-pill'>Total {money(totalLines(salesDoc.lines))}</span>
                </div>
            </section>
            <section className='bp-panel'>
                <h2>Recent Sales Documents</h2>
                <div className='bp-table-wrap'>
                    <table className='bp-table'>
                        <thead><tr><th>No</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
                        <tbody>{[...snapshot.orders, ...snapshot.quotes].slice(0, 30).map((doc) => {
                            const type = doc.orderNo ? 'order' : 'quote'
                            return <tr key={doc._id}>
                                <td><strong>{doc.orderNo || doc.quoteNo}</strong></td>
                                <td>{doc.customerName}</td>
                                <td>{doc.postingDate}</td>
                                <td><span className='bp-pill'>{doc.status}</span></td>
                                <td>{money(doc.total)}</td>
                                <td>
                                    <div className='bp-row-actions'>
                                        <button className='bp-mini-btn' onClick={() => printBusinessDocument(doc, type)}>Print</button>
                                        {doc.orderNo && <button className='bp-mini-btn' disabled={saving} onClick={() => postShipmentFromOrder(doc)}>Post Shipment</button>}
                                        {doc.orderNo && <button className='bp-mini-btn' disabled={saving} onClick={() => createInvoiceFromOrder(doc)}>Post Invoice</button>}
                                    </div>
                                </td>
                            </tr>
                        })}</tbody>
                    </table>
                </div>
            </section>
            <section className='bp-panel bp-full-span'>
                <h2>Posted Shipments & Invoices</h2>
                <p className='bp-muted'>Shipments handle inventory/COGS movement. Invoices handle customer receivables and sales revenue.</p>
                <div className='bp-table-wrap'>
                    <table className='bp-table'>
                        <thead><tr><th>Document</th><th>Type</th><th>Customer</th><th>Date</th><th>Source Order</th><th>Total</th><th>Print</th></tr></thead>
                        <tbody>{[...(snapshot.shipments || []), ...snapshot.invoices].slice(0, 50).map((doc) => {
                            const isShipment = !!doc.shipmentNo
                            return <tr key={doc._id}>
                                <td><strong>{doc.shipmentNo || doc.invoiceNo}</strong></td>
                                <td>{isShipment ? 'Posted Shipment' : 'Posted Invoice'}</td>
                                <td>{doc.customerName}</td>
                                <td>{doc.postingDate}</td>
                                <td>{doc.sourceOrderNo || '-'}</td>
                                <td>{money(doc.total)}</td>
                                <td><button className='bp-mini-btn' onClick={() => printBusinessDocument(doc, isShipment ? 'shipment' : 'invoice')}>PDF</button></td>
                            </tr>
                        })}</tbody>
                    </table>
                </div>
            </section>
        </div>
    )

    const renderPayables = () => (
        <div className='bp-grid'>
            <section className='bp-form-card'>
                <h3>Vendor Bill</h3>
                <div className='bp-form-grid'>
                    <label>Vendor<select value={vendorBill.vendorId} onChange={(e) => setVendorBill({ ...vendorBill, vendorId: e.target.value })}><option value=''>Select vendor</option>{snapshot.vendors.map((vendor) => <option key={vendor._id} value={vendor._id}>{vendor.vendorNo} - {vendor.name}</option>)}</select></label>
                    <label>Posting Date<input type='date' value={vendorBill.postingDate} onChange={(e) => setVendorBill({ ...vendorBill, postingDate: e.target.value })} /></label>
                    <label>Due Date<input type='date' value={vendorBill.dueDate} onChange={(e) => setVendorBill({ ...vendorBill, dueDate: e.target.value })} /></label>
                    {renderLines(vendorBill.lines, setVendorBill)}
                </div>
                <div className='bp-actions' style={{ marginTop: 16 }}>
                    <button className='bp-primary-btn' disabled={saving} onClick={saveVendorBill}>{saving ? 'Saving...' : 'Post Vendor Bill'}</button>
                    <button className='bp-soft-btn' disabled={saving} onClick={migrateVendors}>Migrate Old Purchase Vendors</button>
                    <span className='bp-pill'>Total {money(totalLines(vendorBill.lines))}</span>
                </div>
            </section>
            <section className='bp-panel'>
                <h2>Vendor Bills & Purchase Links</h2>
                <div className='bp-table-wrap'>
                    <table className='bp-table'>
                        <thead><tr><th>No</th><th>Vendor</th><th>Date</th><th>Total</th></tr></thead>
                        <tbody>{snapshot.vendorBills.slice(0, 30).map((doc) => <tr key={doc._id}><td><strong>{doc.billNo}</strong></td><td>{doc.vendorName}</td><td>{doc.postingDate}</td><td>{money(doc.total)}</td></tr>)}</tbody>
                    </table>
                </div>
            </section>
        </div>
    )

    const renderPayments = () => (
        <section className='bp-form-card'>
            <h3>Post Partner Payment</h3>
            <div className='bp-form-grid'>
                <label>Partner Type<select value={payment.partnerType} onChange={(e) => setPayment({ ...payment, partnerType: e.target.value, partnerId: '' })}><option value='customer'>Customer Receipt</option><option value='vendor'>Vendor Payment</option></select></label>
                <label>Partner<select value={payment.partnerId} onChange={(e) => setPayment({ ...payment, partnerId: e.target.value })}><option value=''>Select partner</option>{(payment.partnerType === 'vendor' ? snapshot.vendors : snapshot.customers).map((item) => <option key={item._id} value={item._id}>{item.vendorNo || item.customerNo} - {item.name}</option>)}</select></label>
                <label>Date<input type='date' value={payment.postingDate} onChange={(e) => setPayment({ ...payment, postingDate: e.target.value })} /></label>
                <label>Amount<input type='number' value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></label>
                <label>Payment Method<select value={payment.payPoint} onChange={(e) => setPayment({ ...payment, payPoint: e.target.value })}><option value=''>Select payment method</option>{paymentMethods.map((method) => <option key={method.i_d || method.name} value={method.name}>{method.name} - {method.type}</option>)}</select></label>
                <label>{payment.partnerType === 'vendor' ? 'Payment Proof / Ref No' : 'Customer Receipt No'}<input value={payment.receiptNo} onChange={(e) => setPayment({ ...payment, receiptNo: e.target.value })} /></label>
                <label>Payment Proof Image<input type='file' accept='image/*' onChange={(e) => setPaymentProof(e.target.files?.[0] || null)} /></label>
                <label className='bp-wide'>Notes<textarea value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} /></label>
            </div>
            <div className='bp-actions' style={{ marginTop: 16 }}>
                <button className='bp-primary-btn' disabled={saving || uploadingProof} onClick={postPayment}>{uploadingProof ? 'Uploading proof...' : saving ? 'Posting...' : 'Post Payment'}</button>
                {paymentProof && <span className='bp-pill'>{paymentProof.name}</span>}
            </div>
        </section>
    )

    const renderReportBody = () => {
        if (!report) return <div className='bp-empty'>Choose a report to preview balances, aging, or subsidiary ledger entries.</div>
        if (report.kind === 'aging') {
            return (
                <>
                    <div className='bp-table-wrap' style={{ marginTop: 16 }}>
                        <table className='bp-table'>
                            <thead><tr><th>Partner</th><th>Document</th><th>Due</th><th>0-30</th><th>31-60</th><th>61-90</th><th>90+</th><th>Balance</th></tr></thead>
                            <tbody>{(report.rows || []).map((row, index) => <tr key={`${row.documentNo}-${index}`}><td><strong>{row.partnerName}</strong><br />{row.partnerNo}</td><td>{row.documentNo}</td><td>{row.dueDate}</td><td>{row.bucket === 'current' ? money(row.balance) : '-'}</td><td>{row.bucket === 'days31to60' ? money(row.balance) : '-'}</td><td>{row.bucket === 'days61to90' ? money(row.balance) : '-'}</td><td>{row.bucket === 'over90' ? money(row.balance) : '-'}</td><td>{money(row.balance)}</td></tr>)}</tbody>
                        </table>
                    </div>
                    <div className='bp-kpis' style={{ marginTop: 16 }}>
                        <div className='bp-kpi'><span>0-30</span><strong>{money(report.totals?.current)}</strong></div>
                        <div className='bp-kpi'><span>31-60</span><strong>{money(report.totals?.days31to60)}</strong></div>
                        <div className='bp-kpi'><span>61-90</span><strong>{money(report.totals?.days61to90)}</strong></div>
                        <div className='bp-kpi'><span>90+</span><strong>{money(report.totals?.over90)}</strong></div>
                    </div>
                </>
            )
        }
        if (report.kind === 'trial' || report.kind === 'balance-to-date') {
            return (
                <div className='bp-table-wrap' style={{ marginTop: 16 }}>
                    <table className='bp-table'>
                        <thead><tr><th>Partner No</th><th>Partner</th><th>Debit</th><th>Credit</th><th>Balance Due</th></tr></thead>
                        <tbody>{(report.trialBalance || []).map((row) => <tr key={row.partnerId}><td>{row.partnerNo}</td><td><strong>{row.partnerName}</strong></td><td>{money(row.debit)}</td><td>{money(row.credit)}</td><td>{money(row.balance)}</td></tr>)}</tbody>
                    </table>
                </div>
            )
        }
        return (
            <div className='bp-table-wrap' style={{ marginTop: 16 }}>
                <table className='bp-table'>
                    <thead><tr><th>Date</th><th>Partner</th><th>Source</th><th>Document</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
                    <tbody>{(report.rows || []).map((row, index) => <tr key={`${row.partnerId}-${row.documentNo}-${index}`}><td>{row.date}</td><td><strong>{row.partnerName}</strong><br />{row.partnerNo}</td><td>{row.source}</td><td>{row.documentNo}</td><td>{money(row.debit)}</td><td>{money(row.credit)}</td><td>{money(row.balance)}</td></tr>)}</tbody>
                </table>
            </div>
        )
    }

    const renderReports = () => (
        <section className='bp-report-card'>
            <h3>Partner Reports</h3>
            <p className='bp-muted'>Review aged receivables/payables, balance-to-date reports, subsidiary ledger entries, trial balances, and detailed trial balances.</p>
            <div className='bp-report-filter-card'>
                <label>From Date<input type='date' value={reportFilters.fromDate} onChange={(e) => setReportFilters({ ...reportFilters, fromDate: e.target.value })} /></label>
                <label>To Date<input type='date' value={reportFilters.toDate} onChange={(e) => setReportFilters({ ...reportFilters, toDate: e.target.value })} /></label>
                <label>Partner Type<select value={reportFilters.partnerType} onChange={(e) => setReportFilters({ ...reportFilters, partnerType: e.target.value, partnerId: '' })}><option value='customers'>Customers</option><option value='vendors'>Vendors</option></select></label>
                <label>Partner<select value={reportFilters.partnerId} onChange={(e) => setReportFilters({ ...reportFilters, partnerId: e.target.value })}><option value=''>All partners</option>{(reportFilters.partnerType === 'vendors' ? snapshot.vendors : snapshot.customers).map((item) => <option key={item._id} value={item._id}>{item.vendorNo || item.customerNo} - {item.name}</option>)}</select></label>
            </div>
            <div className='bp-report-actions'>
                <button className={'bp-soft-btn ' + (reportMode === 'receivables' ? 'active' : '')} onClick={() => loadReport('receivables')}>Aged Receivables</button>
                <button className={'bp-soft-btn ' + (reportMode === 'payables' ? 'active' : '')} onClick={() => loadReport('payables')}>Aged Payables</button>
                <button className={'bp-soft-btn ' + (reportMode === 'customers-ledger' ? 'active' : '')} onClick={() => loadLedgerReport('customers', 'ledger')}>Customer Ledger Entries</button>
                <button className={'bp-soft-btn ' + (reportMode === 'vendors-ledger' ? 'active' : '')} onClick={() => loadLedgerReport('vendors', 'ledger')}>Vendor Ledger Entries</button>
                <button className={'bp-soft-btn ' + (reportMode === 'customers-balance-to-date' ? 'active' : '')} onClick={() => loadLedgerReport('customers', 'balance-to-date')}>Customer Balance To Date</button>
                <button className={'bp-soft-btn ' + (reportMode === 'vendors-balance-to-date' ? 'active' : '')} onClick={() => loadLedgerReport('vendors', 'balance-to-date')}>Vendor Balance To Date</button>
                <button className={'bp-soft-btn ' + (reportMode === 'customers-trial' ? 'active' : '')} onClick={() => loadLedgerReport('customers', 'trial')}>Customer Trial Balance</button>
                <button className={'bp-soft-btn ' + (reportMode === 'vendors-trial' ? 'active' : '')} onClick={() => loadLedgerReport('vendors', 'trial')}>Vendor Trial Balance</button>
                <button className={'bp-soft-btn ' + (reportMode === 'customers-detailed-trial' ? 'active' : '')} onClick={() => loadLedgerReport('customers', 'detailed-trial')}>Customer Detailed Trial Balance</button>
                <button className={'bp-soft-btn ' + (reportMode === 'vendors-detailed-trial' ? 'active' : '')} onClick={() => loadLedgerReport('vendors', 'detailed-trial')}>Vendor Detailed Trial Balance</button>
                <button className='bp-primary-btn' disabled={!report} onClick={exportCurrentReportPdf}>PDF</button>
                <button className='bp-primary-btn' disabled={!report} onClick={exportCurrentReportExcel}>Excel</button>
            </div>
            {saving && <div className='bp-empty'>Loading report...</div>}
            {!saving && <div ref={reportPrintRef} className='bp-print-report'>
                {report && <div className='bp-report-heading'>
                    <h2>{companyInfo.name}</h2>
                    <p>{companyInfo.address}</p>
                    <h3>{report.title || 'Partner Report'}</h3>
                    <p>Period: {reportFilters.fromDate} to {reportFilters.toDate} | Partner: {selectedReportPartnerName}</p>
                </div>}
                {renderReportBody()}
            </div>}
        </section>
    )

    return (
        <div className='bp-module'>
            <section className='bp-hero'>
                <div>
                    <span className='bp-kicker'>Business partners</span>
                    <h1>Corporate Customers & Vendors</h1>
                    <p>Manage customer receivables, vendor payables, quotes, sales orders, invoices, bills, payments, subsidiary ledgers, and aging reports.</p>
                </div>
                <div className='bp-actions'>
                    <button className='bp-soft-btn' onClick={loadSnapshot} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
                    <button className='bp-primary-btn' onClick={() => setActiveTab('reports')}>Open Reports</button>
                </div>
            </section>

            <section className='bp-kpis'>
                <div className='bp-kpi'><span>Customers</span><strong>{kpis.customers}</strong></div>
                <div className='bp-kpi'><span>Vendors</span><strong>{kpis.vendors}</strong></div>
                <div className='bp-kpi'><span>Receivables</span><strong>{money(kpis.receivables)}</strong></div>
                <div className='bp-kpi'><span>Payables</span><strong>{money(kpis.payables)}</strong></div>
            </section>

            <div className='bp-tabs'>
                {['customers', 'vendors', 'sales', 'payables', 'payments', 'reports'].map((tab) => (
                    <button className={'bp-tab ' + (activeTab === tab ? 'active' : '')} key={tab} onClick={() => setActiveTab(tab)}>{tab}</button>
                ))}
            </div>

            {activeTab === 'customers' && <div className='bp-grid'>{renderPartnerList('customer')}{renderPartnerForm('customer')}</div>}
            {activeTab === 'vendors' && <div className='bp-grid'>{renderPartnerList('vendor')}{renderPartnerForm('vendor')}</div>}
            {activeTab === 'sales' && renderDocuments()}
            {activeTab === 'payables' && renderPayables()}
            {activeTab === 'payments' && renderPayments()}
            {activeTab === 'reports' && renderReports()}
        </div>
    )
}

export default BusinessPartners

