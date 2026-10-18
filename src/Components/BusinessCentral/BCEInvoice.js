import { useBCAccess } from './bcAccess'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatAgo, formatDateTime, formatValue, todayString } from './bcFormat'
import { downloadTemplate, printInvoice, readSpreadsheet } from './bcEinvFiles'
import { useUrlState } from './bcUrl'

// How often the page asks the server to look at the ERP for new documents.
const LIVE_POLL_MS = 45000

// What each status means to the person looking at the list.
const STATUS_LABELS = {
    needsAttention: 'Needs attention',
    ready: 'Ready to send',
    sending: 'Sending',
    signed: 'Cleared by NRS',
    rejected: 'Rejected by NRS',
    failed: 'Failed, will retry',
    excluded: 'Left out',
}
const STATUS_ORDER = ['needsAttention', 'ready', 'rejected', 'failed', 'signed', 'excluded']

// The boxes to fill for each kind of gap, and what goes in them.
const GAP_FIELDS = {
    customer: [
        ['tin', 'TIN', 'The customer\'s tax number, or RC- followed by its incorporation number'],
        ['email', 'Email', ''],
        ['street', 'Street', ''],
        ['city', 'City', ''],
        ['postalZone', 'Postal code', ''],
        ['state', 'State code', 'For example NG-RI'],
        ['lga', 'LGA code', 'For example NG-RI-PHC'],
        ['kind', 'Kind', 'B2B, B2G, or B2C for a consumer with no TIN'],
    ],
    item: [
        ['hsCode', 'HS code', 'For goods, for example 2201.10'],
        ['productCategory', 'Product category', ''],
        ['serviceCode', 'Service code', 'For services only'],
        ['serviceCategory', 'Service category', 'For services only'],
        ['type', 'Type', 'good or service'],
    ],
    unit: [['code', 'Standard unit code', 'For example EA, KGM, LTR, XBG']],
    tax: [['category', 'NRS tax category', 'For example STANDARD_VAT, ZERO_VAT, Exempted']],
}
const KIND_TITLES = { customer: 'Customers', item: 'Items', unit: 'Units of measure', tax: 'VAT groups', setup: 'Setup', other: 'Other' }

const monthStart = () => `${todayString().slice(0, 8)}01`
const money = (value) => formatValue(value, 'money')
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10)

const StatusBadge = ({ status }) => <span className={`bc-einv-status bc-einv-status-${status}`}>{STATUS_LABELS[status] || status}</span>

// One line saying why a document is where it is.
const reasonOf = (doc) => {
    // A consumer sale has to reach NRS within 24 hours of being issued.
    const late = doc.kind === 'B2C' && !['signed', 'excluded'].includes(doc.status) && doc.issueDate < yesterday() ? 'Past the 24 hour window for consumer sales. ' : ''
    if (doc.status === 'needsAttention') return late + (doc.issues?.length > 1 ? `${doc.issues[0].message} (and ${doc.issues.length - 1} more)` : (doc.issues?.[0]?.message || ''))
    if (doc.status === 'rejected') return late + ((doc.errors || []).join(' ') || doc.lastError || '')
    if (doc.status === 'failed') return `${late}${doc.lastError || ''}${doc.nextAttemptAt ? ` Next try ${formatDateTime(doc.nextAttemptAt)}.` : ''}`
    if (doc.status === 'excluded') return doc.excludedReason || ''
    if (doc.status === 'signed') {
        return [
            doc.changedAfterClearing ? 'Changed in the ERP after it was cleared.' : '',
            doc.qrError || '',
            doc.foundAtNrs ? 'NRS already held this reference.' : '',
            doc.payment?.status === 'PAID' ? 'Paid.' : '',
            doc.payment?.status === 'PARTIAL' ? `Part paid: ${money(doc.payment.paidAmount)}.` : '',
            doc.payment?.error ? `Payment not accepted by NRS: ${doc.payment.error}` : '',
        ].filter(Boolean).join(' ')
    }
    return late
}

// ------------------------------------------------------------ Invoices ----

const InvoiceDetail = ({ api, id, onClose, onChanged, notify }) => {
    const canSend = useBCAccess().can('einvoice.send')
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [paid, setPaid] = useState('')

    const load = useCallback(async () => {
        try { setData(await api.einvDocument(id)); setError('') } catch (failure) { setError(failure.message) }
    }, [api, id])
    useEffect(() => { load() }, [load])

    const act = async (work, done) => {
        setBusy(true)
        try { await work(); if (done) notify('success', done); await load(); onChanged() } catch (failure) { notify('error', failure.message) } finally { setBusy(false) }
    }
    const print = () => { try { printInvoice(data) } catch (failure) { notify('error', `The invoice could not be printed: ${failure.message}`) } }

    const doc = data?.document
    const heading = doc ? `${doc.docType === 'creditNote' ? 'Credit note' : 'Invoice'} ${doc.documentNo}` : 'Document'
    // Invoices read from an ERP get their payments from its ledger. The rest
    // have them entered here.
    const ownLedger = String(doc?.sourceKey || '').startsWith('bc:')
    return (
        <div className='bc-modal-backdrop' onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
            <div className='bc-modal' role='dialog' aria-modal='true' aria-label={heading}>
                <header className='bc-modal-head'>
                    <h3>{heading}</h3>
                    <button type='button' className='bc-button' onClick={onClose}>Close</button>
                </header>
                <div className='bc-modal-body'>
                    {error && <div className='bc-banner bc-banner-error'>{error}</div>}
                    {!doc && !error && <p className='bc-empty'>Loading...</p>}
                    {doc && (
                        <>
                            <div className='bc-einv-facts'>
                                <div><span className='bc-field-label'>Status</span><StatusBadge status={doc.status} /></div>
                                <div><span className='bc-field-label'>Date</span>{doc.issueDate}</div>
                                <div><span className='bc-field-label'>Customer</span>{doc.buyerRef} {doc.buyerName}</div>
                                <div><span className='bc-field-label'>Total</span>{doc.currency} {money(doc.total)}</div>
                                <div><span className='bc-field-label'>VAT</span>{money(doc.tax)}</div>
                                <div><span className='bc-field-label'>Invoice reference (IRN)</span>{doc.irn || 'Not assigned yet'}</div>
                                {doc.signedAt && <div><span className='bc-field-label'>Cleared</span>{formatDateTime(doc.signedAt)}</div>}
                                {doc.status === 'signed' && <div><span className='bc-field-label'>Payment reported to NRS</span>{doc.payment?.status === 'PAID' ? 'Paid' : (doc.payment?.status === 'PARTIAL' ? `Part paid, ${money(doc.payment.paidAmount)}` : 'None yet')}</div>}
                                {doc.status === 'signed' && ownLedger && <div><span className='bc-field-label'>In Business Central</span>{doc.stampedAt ? `Stamp handed over ${formatDateTime(doc.stampedAt)}` : (doc.stampError || 'Stamp not handed over yet')}</div>}
                                {doc.nrs?.confirmedAt && <div><span className='bc-field-label'>At NRS</span>Payment {doc.nrs.paymentStatus || 'unknown'}, {doc.nrs.transmitted ? 'sent to buyer' : 'not yet sent to buyer'}, {doc.nrs.delivered ? 'delivered' : 'not delivered'}</div>}
                            </div>

                            {data.qrImage && (
                                <div className='bc-einv-stamp'>
                                    <img src={data.qrImage} alt={`QR code for ${doc.irn}`} width='120' height='120' />
                                    <p className='bc-muted'>This is the code printed on the invoice. Scanning it with the NRS MBS 360 app shows that the invoice is genuine.</p>
                                </div>
                            )}

                            {reasonOf(doc) && doc.status !== 'needsAttention' && <div className={`bc-banner ${['signed', 'excluded'].includes(doc.status) ? 'bc-banner-info' : 'bc-banner-error'}`}>{reasonOf(doc)}</div>}
                            {doc.issues?.length > 0 && doc.status !== 'excluded' && (
                                <div>
                                    <h4>What is missing</h4>
                                    <ul className='bc-einv-list'>{doc.issues.map((issue) => <li key={`${issue.field}${issue.message}`}>{issue.message}</li>)}</ul>
                                </div>
                            )}
                            {doc.warnings?.length > 0 && <ul className='bc-einv-list bc-muted'>{doc.warnings.map((warning) => <li key={warning.code}>{warning.message}</li>)}</ul>}

                            <div className='bc-einv-actions'>
                                {canSend && ['ready', 'failed', 'rejected'].includes(doc.status) && doc.payload && <button type='button' className='bc-button bc-button-primary' disabled={busy} onClick={() => act(() => api.einvSend([doc.id]), 'Sent to NRS. See the status above for the answer.')}>{doc.status === 'ready' ? 'Send to NRS' : 'Try again'}</button>}
                                <button type='button' className='bc-button' onClick={print}>{doc.status === 'signed' ? 'Print stamped invoice' : 'Print draft'}</button>
                                {canSend && doc.status === 'signed' && <button type='button' className='bc-button' disabled={busy} onClick={() => act(() => api.einvRefresh(doc.id))}>Check with NRS</button>}
                                {canSend && !['signed', 'sending', 'excluded'].includes(doc.status) && <button type='button' className='bc-button' disabled={busy} onClick={() => act(() => api.einvExclude([doc.id], true), 'Left out of e-invoicing.')}>Leave out</button>}
                                {canSend && doc.status === 'excluded' && <button type='button' className='bc-button' disabled={busy} onClick={() => act(() => api.einvExclude([doc.id], false), 'Brought back.')}>Bring back</button>}
                            </div>

                            {doc.status === 'signed' && doc.docType === 'invoice' && !ownLedger && doc.payment?.status !== 'PAID' && (
                                <div className='bc-einv-toolbar'>
                                    <label className='bc-field'><span className='bc-field-label'>Total paid so far</span><input className='bc-input' inputMode='decimal' value={paid} onChange={(event) => setPaid(event.target.value)} /></label>
                                    <button type='button' className='bc-button' disabled={!canSend || busy || !(Number(paid) > 0)} onClick={() => act(() => api.einvPayment(doc.id, Number(paid)), 'Payment reported to NRS.')}>Report payment</button>
                                </div>
                            )}

                            <div>
                                <h4>Lines</h4>
                                <div className='bc-table-scroll'>
                                    <table className='bc-table'>
                                        <thead><tr><th>Item</th><th>Description</th><th className='bc-num'>Quantity</th><th>Unit</th><th className='bc-num'>Price</th><th className='bc-num'>Amount</th><th className='bc-num'>VAT</th></tr></thead>
                                        <tbody>
                                            {(doc.invoice?.lines || []).map((line, index) => (
                                                // eslint-disable-next-line react/no-array-index-key
                                                <tr key={index}><td>{line.itemRef}</td><td>{line.name}</td><td className='bc-num'>{formatValue(line.quantity, 'number')}</td><td>{line.unitSource}</td><td className='bc-num'>{money(line.unitPrice)}</td><td className='bc-num'>{money(line.lineAmount)}</td><td className='bc-num'>{money(line.vatAmount)}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <h4>What was said to NRS</h4>
                                {data.attempts.length === 0 ? <p className='bc-muted'>Nothing has been sent for this document yet.</p> : (
                                    <ul className='bc-einv-list'>
                                        {[...data.attempts].reverse().map((entry) => (
                                            <li key={`${entry.at}${entry.action}`}>
                                                {formatDateTime(entry.at)}: {entry.action} {entry.ok ? 'accepted' : `refused (${entry.httpStatus || 'no answer'})`}
                                                {!entry.ok && (entry.error || entry.response?.error?.public_message) ? `. ${entry.error || entry.response.error.public_message}` : ''}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {doc.payload && (
                                <details>
                                    <summary>The invoice exactly as it is sent</summary>
                                    <pre className='bc-einv-payload'>{JSON.stringify(doc.payload, null, 2)}</pre>
                                </details>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// Says what the background reading is doing, in one line.
const LiveStrip = ({ live }) => {
    if (!live) return null
    if (live.error) return <div className='bc-banner bc-banner-warn'>Business Central could not be read just now, so this list may be behind: {live.error}</div>
    const history = live.history
    let text = live.lastFetch ? `Live from Business Central. Last checked ${formatAgo(live.lastFetch.at).toLowerCase()}.` : 'Reading Business Central for the first time...'
    if (history && !history.complete) text = `${text} Older invoices are still arriving: read back to ${history.next || 'the start'} so far, of history that begins ${history.earliest || 'earlier'}.`
    return <p className='bc-einv-live'><span className={`bc-dot ${live.reading ? 'bc-dot-live' : 'bc-dot-on'}`} />{text}</p>
}

const Invoices = ({ api, counts, onCounts, notify, onGoTo, ready }) => {
    const canSend = useBCAccess().can('einvoice.send')
    const [status, setStatus] = useUrlState('status', 'needsAttention')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [list, setList] = useState({ documents: [], total: 0, pageSize: 50 })
    const [chosen, setChosen] = useState([])
    const [open, setOpen] = useState(null)
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')
    // The period only chooses what is shown. Everything the ERP holds is
    // kept here whatever dates are picked.
    const [range, setRange] = useState(() => ({ from: monthStart(), to: todayString() }))
    const [live, setLive] = useState(null)
    const seen = useRef(null)

    const load = useCallback(async () => {
        try {
            const response = await api.einvDocuments({ status, search, page, from: range.from, to: range.to })
            setList(response)
            onCounts(response.counts)
            setError('')
        } catch (failure) { setError(failure.message) }
    }, [api, status, search, page, range.from, range.to, onCounts])
    useEffect(() => { load() }, [load])
    useEffect(() => { setChosen([]) }, [status, search, page, range.from, range.to])

    // The heartbeat. Each call has the server look at the ERP for anything
    // newly posted, and the list loads again when something was found.
    useEffect(() => {
        let active = true
        const look = async () => {
            try {
                const response = await api.einvLive()
                if (!active) return
                setLive(response.live)
                const stamp = `${response.live.lastFetch?.at || 0}|${response.live.history?.read || 0}`
                if (seen.current !== null && seen.current !== stamp) load()
                seen.current = stamp
            } catch (failure) {
                // A missed look is made up for by the next one.
            }
        }
        look()
        const timer = setInterval(look, LIVE_POLL_MS)
        return () => { active = false; clearInterval(timer) }
    }, [api, load])

    const run = async (name, work, describe) => {
        setBusy(name)
        try { const response = await work(); notify('success', describe(response)); setChosen([]); await load() } catch (failure) { notify('error', failure.message) } finally { setBusy('') }
    }
    const sentSummary = ({ tally }) => {
        const parts = [tally.signed ? `${tally.signed} cleared` : '', tally.rejected ? `${tally.rejected} rejected` : '', tally.failed ? `${tally.failed} failed` : '', tally.skipped ? `${tally.skipped} skipped` : ''].filter(Boolean)
        return `${parts.join(', ') || 'Nothing was due to send'}.${tally.stoppedForKeys ? ' Stopped because NRS refused the keys. Check the setup page.' : ''}`
    }
    const fetchSummary = ({ tally, from, to }) => `Read ${from} to ${to} again: ${tally.staged || 0} new, ${tally.updated || 0} brought up to date, ${tally.alreadyHere || 0} already cleared or left out.`

    const pages = Math.max(1, Math.ceil(list.total / (list.pageSize || 50)))
    const allChosen = list.documents.length > 0 && list.documents.every((doc) => chosen.includes(doc.id))
    const sendable = ['ready', 'failed', 'rejected'].includes(status)

    return (
        <>
            <div className='bc-card'>
                <LiveStrip live={live} />
                <div className='bc-einv-toolbar'>
                    <label className='bc-field bc-field-narrow'><span className='bc-field-label'>Show posted from</span><input type='date' className='bc-input' value={range.from} onChange={(event) => { setRange({ ...range, from: event.target.value }); setPage(1) }} /></label>
                    <label className='bc-field bc-field-narrow'><span className='bc-field-label'>To</span><input type='date' className='bc-input' value={range.to} onChange={(event) => { setRange({ ...range, to: event.target.value }); setPage(1) }} /></label>
                    <button type='button' className='bc-button' onClick={() => { setRange({ from: '', to: '' }); setPage(1) }}>All dates</button>
                    {canSend && <button type='button' className='bc-button bc-button-primary' disabled={!!busy || !ready || !counts?.ready?.count} title={ready ? '' : 'Finish the setup page first'} onClick={() => run('send', () => api.einvSend(), sentSummary)}>{busy === 'send' ? 'Sending...' : `Send all ready (${counts?.ready?.count || 0})`}</button>}
                </div>
                <p className='bc-muted'>
                    The dates only choose what is shown. Invoices posted in Business Central arrive here by themselves, whatever period is picked.{' '}
                    {canSend && <button type='button' className='bc-link-button' disabled={!!busy} onClick={() => run('fetch', () => api.einvFetch(range), fetchSummary)}>{busy === 'fetch' ? 'Reading...' : 'Read this period again now'}</button>}
                    {' '}to pick up a correction made in Business Central to an invoice that has not been sent.
                </p>
            </div>

            <div className='bc-card'>
                <nav className='bc-tabs bc-tabs-inner' aria-label='Documents by status'>
                    {STATUS_ORDER.map((key) => (
                        <button key={key} type='button' className={status === key ? 'active' : ''} aria-current={status === key ? 'page' : undefined} onClick={() => { setStatus(key); setPage(1) }}>
                            {STATUS_LABELS[key]} ({counts?.[key]?.count || 0})
                        </button>
                    ))}
                </nav>
                <div className='bc-einv-toolbar'>
                    <input type='search' className='bc-input bc-search' placeholder='Search number, customer or reference' aria-label='Search documents' value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
                    {canSend && chosen.length > 0 && sendable && <button type='button' className='bc-button bc-button-primary' disabled={!!busy || !ready} onClick={() => run('send', () => api.einvSend(chosen), sentSummary)}>Send {chosen.length} selected</button>}
                    {canSend && chosen.length > 0 && !['signed', 'excluded'].includes(status) && <button type='button' className='bc-button' disabled={!!busy} onClick={() => run('exclude', () => api.einvExclude(chosen, true), (response) => `${response.changed} document(s) left out.`)}>Leave out {chosen.length}</button>}
                    {canSend && chosen.length > 0 && status === 'excluded' && <button type='button' className='bc-button' disabled={!!busy} onClick={() => run('exclude', () => api.einvExclude(chosen, false), (response) => `${response.changed} document(s) brought back.`)}>Bring back {chosen.length}</button>}
                    {canSend && status === 'needsAttention' && (counts?.needsAttention?.count || 0) > 0 && <button type='button' className='bc-link-button' onClick={() => onGoTo('mapping')}>Fix what is missing</button>}
                </div>
                {error && <div className='bc-banner bc-banner-error'>{error}</div>}
                {list.documents.length === 0 && !error ? <p className='bc-empty'>No documents here{search ? ' match the search' : ''}{range.from || range.to ? ' for this period' : ''}.</p> : (
                    <div className='bc-table-scroll'>
                        <table className='bc-table'>
                            <thead>
                                <tr>
                                    <th><input type='checkbox' aria-label='Select all on this page' checked={allChosen} onChange={() => setChosen(allChosen ? [] : list.documents.map((doc) => doc.id))} /></th>
                                    <th>Number</th><th>Date</th><th>Customer</th><th className='bc-num'>Total</th><th>Status</th><th>Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.documents.map((doc) => (
                                    <tr key={doc.id}>
                                        <td><input type='checkbox' aria-label={`Select ${doc.documentNo}`} checked={chosen.includes(doc.id)} onChange={() => setChosen(chosen.includes(doc.id) ? chosen.filter((id) => id !== doc.id) : [...chosen, doc.id])} /></td>
                                        <td><button type='button' className='bc-link-button' onClick={() => setOpen(doc.id)}>{doc.documentNo}</button>{doc.docType === 'creditNote' ? ' (credit note)' : ''}</td>
                                        <td>{doc.issueDate}</td>
                                        <td>{doc.buyerRef} {doc.buyerName}</td>
                                        <td className='bc-num'>{money(doc.total)}</td>
                                        <td><StatusBadge status={doc.status} /></td>
                                        <td className='bc-einv-reason'>{reasonOf(doc)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {pages > 1 && (
                    <div className='bc-einv-toolbar'>
                        <button type='button' className='bc-button' disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                        <span className='bc-muted'>Page {page} of {pages} ({list.total.toLocaleString()} documents)</span>
                        <button type='button' className='bc-button' disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
                    </div>
                )}
            </div>
            {open && <InvoiceDetail api={api} id={open} notify={notify} onClose={() => setOpen(null)} onChanged={load} />}
        </>
    )
}

// ------------------------------------------------------------- Mapping ----

const GapRow = ({ gap, onSave, busy }) => {
    const fields = GAP_FIELDS[gap.kind] || []
    const [values, setValues] = useState({})
    // The boxes for what this row is missing come first and are marked.
    const ordered = [...fields].sort((a, b) => Number(gap.fields.includes(b[0])) - Number(gap.fields.includes(a[0])))
    const typed = Object.values(values).some((value) => String(value).trim())
    return (
        <div className='bc-einv-gap'>
            <div className='bc-einv-gap-head'>
                <strong>{gap.key} {gap.label && gap.label !== gap.key ? gap.label : ''}</strong>
                <span className='bc-muted'>holds up {gap.documents} document{gap.documents === 1 ? '' : 's'}</span>
            </div>
            {fields.length === 0 ? <p className='bc-muted'>{gap.label}</p> : (
                <div className='bc-einv-gap-fields'>
                    {ordered.map(([field, label, hint]) => (
                        <label key={field} className='bc-field'>
                            <span className='bc-field-label'>{label}{gap.fields.includes(field) || (field === 'hsCode' && gap.fields.includes('productCategory')) ? ' (missing)' : ''}</span>
                            <input className='bc-input' aria-label={`${label} for ${gap.key}`} placeholder={hint} value={values[field] || ''} onChange={(event) => setValues({ ...values, [field]: event.target.value })} />
                        </label>
                    ))}
                    <button type='button' className='bc-button bc-button-primary' disabled={busy || !typed} onClick={() => onSave(gap, values)}>Save</button>
                </div>
            )}
        </div>
    )
}

const Mapping = ({ api, onCounts, notify, onGoTo }) => {
    const [gaps, setGaps] = useState(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        try { setGaps((await api.einvGaps()).gaps); setError('') } catch (failure) { setError(failure.message) }
    }, [api])
    useEffect(() => { load() }, [load])

    const save = async (gap, values) => {
        setBusy(true)
        try {
            const response = await api.einvSaveMappings([{ kind: gap.kind, key: gap.key, label: gap.label, values }])
            onCounts(response.counts)
            notify('success', `Saved. ${response.counts.ready.count} document(s) are now ready to send.`)
            await load()
        } catch (failure) { notify('error', failure.message) } finally { setBusy(false) }
    }

    const grouped = useMemo(() => {
        const byKind = new Map()
        ;(gaps || []).forEach((gap) => { if (!byKind.has(gap.kind)) byKind.set(gap.kind, []); byKind.get(gap.kind).push(gap) })
        return [...byKind]
    }, [gaps])

    if (error) return <div className='bc-banner bc-banner-error'>{error}</div>
    if (!gaps) return <p className='bc-empty'>Loading...</p>
    if (!gaps.length) return <div className='bc-card'><p className='bc-empty'>Nothing is missing. Every staged document is either ready, sent or left out.</p></div>
    return (
        <>
            <div className='bc-banner bc-banner-info'>
                Each row is one thing to fix, with the number of documents waiting on it. What you enter here is used in place of what Business Central holds, so a gap can be closed without waiting for the ERP to be corrected. Correcting it in Business Central and reading the period again works too.
            </div>
            {grouped.map(([kind, rows]) => (
                <div key={kind} className='bc-card'>
                    <h3>{KIND_TITLES[kind] || kind} ({rows.length})</h3>
                    {kind === 'setup' && <p className='bc-muted'>These are fixed on the setup page. <button type='button' className='bc-link-button' onClick={() => onGoTo('setup')}>Open setup</button></p>}
                    {rows.map((gap) => <GapRow key={`${gap.kind}|${gap.key}`} gap={gap} busy={busy} onSave={save} />)}
                </div>
            ))}
        </>
    )
}

// -------------------------------------------------------- Add invoices ----

const EMPTY_LINE = { itemRef: '', name: '', hsCode: '', productCategory: '', quantity: '', unit: 'EA', unitPrice: '', vatPercent: '7.5' }
const EMPTY_ENTRY = { documentNo: '', docType: 'invoice', issueDate: '', kind: 'B2B', originalDocumentNo: '', buyer: { ref: '', name: '', tin: '', email: '', street: '', city: '', postalZone: '', state: '', lga: '' } }
const BUYER_BOXES = [['ref', 'Customer no'], ['name', 'Customer name'], ['tin', 'TIN'], ['email', 'Email'], ['street', 'Street'], ['city', 'City'], ['postalZone', 'Postal code'], ['state', 'State code'], ['lga', 'LGA code']]
const LINE_BOXES = [['itemRef', 'Item no'], ['name', 'Description'], ['hsCode', 'HS code'], ['productCategory', 'Product category'], ['quantity', 'Quantity'], ['unit', 'Unit'], ['unitPrice', 'Unit price'], ['vatPercent', 'VAT %']]

// For invoices that are not in a connected ERP: a spreadsheet, or one typed in.
const AddInvoices = ({ api, onCounts, notify, onGoTo }) => {
    const [busy, setBusy] = useState(false)
    const [problems, setProblems] = useState([])
    const [entry, setEntry] = useState({ ...EMPTY_ENTRY, issueDate: todayString() })
    const [lines, setLines] = useState([{ ...EMPTY_LINE }])

    const send = async (source, documents, done) => {
        setBusy(true)
        try {
            const response = await api.einvImport(source, documents)
            onCounts(response.counts)
            setProblems((response.refused || []).map((refusal) => refusal.message))
            notify('success', `${response.tally.staged || 0} added, ${response.tally.updated || 0} updated, ${response.tally.untouched || 0} already cleared or left out.`)
            if (done) done()
        } catch (failure) { notify('error', failure.message) } finally { setBusy(false) }
    }

    const upload = async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        try {
            const read = await readSpreadsheet(file)
            setProblems(read.problems)
            if (!read.invoices.length) { notify('error', read.problems[0] || 'No invoices were found in that file.'); return }
            await send('upload', read.invoices)
        } catch (failure) { notify('error', `"${file.name}" could not be read as a spreadsheet. Save it as .xlsx or .csv and try again.`) }
    }

    const typed = entry.documentNo.trim() && entry.issueDate && lines.some((line) => Number(line.quantity) > 0)
    const saveEntry = () => send('manual', [{ ...entry, lines: lines.filter((line) => Number(line.quantity) > 0).map((line) => ({ ...line, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice) || 0, vatPercent: line.vatPercent === '' ? undefined : Number(line.vatPercent) })) }], () => { setEntry({ ...EMPTY_ENTRY, issueDate: todayString() }); setLines([{ ...EMPTY_LINE }]) })
    const setLine = (index, field, value) => setLines(lines.map((line, at) => (at === index ? { ...line, [field]: value } : line)))

    return (
        <>
            <div className='bc-banner bc-banner-info'>Invoices posted in Business Central arrive by themselves and do not need adding here. This page is for invoices kept somewhere else. They go through the same checks and appear in the same list. <button type='button' className='bc-link-button' onClick={() => onGoTo('invoices')}>Back to the list</button></div>
            <div className='bc-card'>
                <h3>From a spreadsheet</h3>
                <p className='bc-muted'>One row per invoice line. Uploading the same file twice does not add anything twice: an invoice is known by its number.</p>
                <div className='bc-einv-toolbar'>
                    <button type='button' className='bc-button' onClick={downloadTemplate}>Download the template</button>
                    <label className='bc-button bc-button-primary bc-einv-upload'>{busy ? 'Working...' : 'Upload a spreadsheet'}<input type='file' accept='.xlsx,.xls,.csv' aria-label='Upload a spreadsheet' disabled={busy} onChange={upload} /></label>
                </div>
                {problems.length > 0 && <ul className='bc-einv-list'>{problems.slice(0, 20).map((problem) => <li key={problem}>{problem}</li>)}</ul>}
            </div>
            <div className='bc-card'>
                <h3>Type one in</h3>
                <div className='bc-einv-form'>
                    <label className='bc-field'><span className='bc-field-label'>Document number</span><input className='bc-input' value={entry.documentNo} onChange={(event) => setEntry({ ...entry, documentNo: event.target.value })} /></label>
                    <label className='bc-field'><span className='bc-field-label'>Type</span><select className='bc-input' value={entry.docType} onChange={(event) => setEntry({ ...entry, docType: event.target.value })}><option value='invoice'>Invoice</option><option value='creditNote'>Credit note</option></select></label>
                    <label className='bc-field'><span className='bc-field-label'>Date</span><input className='bc-input' type='date' value={entry.issueDate} onChange={(event) => setEntry({ ...entry, issueDate: event.target.value })} /></label>
                    <label className='bc-field'><span className='bc-field-label'>Kind</span><select className='bc-input' value={entry.kind} onChange={(event) => setEntry({ ...entry, kind: event.target.value })}><option value='B2B'>Business (B2B)</option><option value='B2C'>Consumer (B2C)</option><option value='B2G'>Government (B2G)</option></select></label>
                    {entry.docType === 'creditNote' && <label className='bc-field'><span className='bc-field-label'>Invoice it corrects</span><input className='bc-input' value={entry.originalDocumentNo} onChange={(event) => setEntry({ ...entry, originalDocumentNo: event.target.value })} /></label>}
                </div>
                <div className='bc-einv-form'>
                    {BUYER_BOXES.map(([field, label]) => <label key={field} className='bc-field'><span className='bc-field-label'>{label}</span><input className='bc-input' value={entry.buyer[field]} onChange={(event) => setEntry({ ...entry, buyer: { ...entry.buyer, [field]: event.target.value } })} /></label>)}
                </div>
                {lines.map((line, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={index} className='bc-einv-form bc-einv-entry-line'>
                        {LINE_BOXES.map(([field, label]) => <label key={field} className='bc-field bc-field-narrow'><span className='bc-field-label'>{label}</span><input className='bc-input' aria-label={`${label}, line ${index + 1}`} value={line[field]} onChange={(event) => setLine(index, field, event.target.value)} /></label>)}
                        {lines.length > 1 && <button type='button' className='bc-button' onClick={() => setLines(lines.filter((unused, at) => at !== index))}>Remove</button>}
                    </div>
                ))}
                <div className='bc-einv-actions'>
                    <button type='button' className='bc-button' onClick={() => setLines([...lines, { ...EMPTY_LINE }])}>Add a line</button>
                    <button type='button' className='bc-button bc-button-primary' disabled={busy || !typed} onClick={saveEntry}>Add this invoice</button>
                </div>
            </div>
        </>
    )
}

// --------------------------------------------------------------- Setup ----

const KEY_STEPS = [
    'Sign in at einvoice.nrs.gov.ng with your TaxPro Max details. If e-invoicing is not switched on for your business yet, choose "Enable me for e-Invoicing" on the TaxPro Max dashboard, fill in the form, and wait for the confirmation email.',
    'On first sign-in, read and accept the Data Privacy and Protection Policy.',
    'Open your developer settings. Copy the API key and the API secret into the boxes below. The address to use (the base URL) is different for the test environment and for production, and NRS gives it with the keys. Start with test.',
    'On the same dashboard, find your Business ID (a long code with dashes) and your Service ID (8 letters and digits). The Service ID is the middle part of the invoice reference template shown there.',
    'Open the My Account tab and choose Manage Cryptographic Keys. Create a key, give it a name and download it. The file, crypto_keys.txt, is plain text holding a "public_key" and a "certificate". Paste each value, without the quotation marks, into its box below. They are used to make the QR code on a cleared invoice.',
    'Press Save, then Test keys. A list of invoice types coming back means the address and keys work.',
    'Send a few invoices in the test environment first. When they clear, switch the address and keys to production.',
]

const SELLER_FIELDS = [
    ['name', 'Registered business name'], ['tin', 'TIN'], ['email', 'Email'], ['telephone', 'Telephone, starting with +234'],
    ['street', 'Street'], ['city', 'City'], ['postalZone', 'Postal code'], ['state', 'State code, for example NG-RI'], ['lga', 'LGA code, for example NG-RI-PHC'], ['businessDescription', 'What the business does'],
]
const PAGE_LABELS = { invoiceHeaders: 'Posted sales invoices', creditHeaders: 'Posted sales credit memos', invoiceLines: 'Invoice lines', creditLines: 'Credit memo lines', customers: 'Customers', items: 'Items', itemCategories: 'Item categories', tariffNumbers: 'Tariff numbers', units: 'Units of measure', company: 'Company information', vatSetup: 'VAT posting setup', paymentTerms: 'Payment terms', customerLedger: 'Customer ledger entries' }
// What runs by itself, in the words of the setup page.
const SWITCHES = [
    ['autoFetch', 'Read newly posted invoices from Business Central when nobody has this page open', 'With the page open they are read anyway.'],
    ['autoSend', 'Send invoices to NRS as soon as nothing is missing', 'Leave off until a few have gone through by hand.'],
    ['syncPayments', 'Tell NRS when Business Central shows an invoice part paid or paid', 'Read from the customer ledger.'],
    ['writeBack', 'Hand the NRS reference and QR code back to Business Central', 'Needs the Enterprise Compute e-invoicing extension installed in Business Central first.'],
    ['transmit', 'Ask NRS to pass each cleared invoice on to the buyer', 'NRS describes this step for access point providers. If it refuses your keys, leave this off and your provider does it.'],
    ['reportFiscal', 'Report each cleared invoice to NRS for fiscalization', 'For a business that integrates directly. Needs the Report Host below.'],
]

const ApiKeys = ({ api, keys, notify, onChanged }) => {
    const [name, setName] = useState('')
    const [made, setMade] = useState(null)
    const [busy, setBusy] = useState(false)
    const run = async (work) => { setBusy(true); try { await work() } catch (failure) { notify('error', failure.message) } finally { setBusy(false) } }
    const create = () => run(async () => { setMade(await api.einvCreateKey(name)); setName(''); onChanged() })
    const remove = (entry) => run(async () => {
        if (!window.confirm(`Remove the key "${entry.name}"? Whatever system uses it will stop being able to hand invoices over.`)) return
        await api.einvRemoveKey(entry.id)
        onChanged()
    })
    return (
        <div className='bc-card'>
            <h3>Other systems that hand invoices over</h3>
            <p className='bc-muted'>
                An ERP that is not Business Central can push its invoices here and ask what became of them. Make a key for it below. It sends the key in the header x-einvoice-key to this workspace&apos;s own address: POST /einvoice/api/v1/invoices to hand invoices over, GET /einvoice/api/v1/invoices/NUMBER to ask for the status, reference and QR code, and POST /einvoice/api/v1/invoices/NUMBER/payment to report a payment.
            </p>
            {made && <div className='bc-banner bc-banner-warn'>Copy this key now. It is shown this once and cannot be read again: <code className='bc-einv-key'>{made.key}</code></div>}
            {keys.length > 0 && (
                <div className='bc-table-scroll'>
                    <table className='bc-table'>
                        <thead><tr><th>Name</th><th>Made</th><th>Last used</th><th /></tr></thead>
                        <tbody>
                            {keys.map((entry) => (
                                <tr key={entry.id}><td>{entry.name}</td><td>{formatDateTime(entry.createdAt)}</td><td>{entry.lastUsedAt ? formatDateTime(entry.lastUsedAt) : 'Never'}</td><td><button type='button' className='bc-button bc-button-danger' disabled={busy} onClick={() => remove(entry)}>Remove</button></td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className='bc-einv-toolbar'>
                <label className='bc-field'><span className='bc-field-label'>Name of the system</span><input className='bc-input' placeholder='For example Odoo' value={name} onChange={(event) => setName(event.target.value)} /></label>
                <button type='button' className='bc-button' disabled={busy || !name.trim()} onClick={create}>Make a key</button>
            </div>
        </div>
    )
}

const Setup = ({ api, overview, canManage, onSaved, notify }) => {
    const saved = overview.settings || {}
    const [form, setForm] = useState({ environment: saved.environment || 'test', baseUrl: saved.baseUrl || '', serviceId: saved.serviceId || '', businessId: saved.businessId || '', startDate: saved.startDate || '', defaultKind: saved.defaultKind || 'B2B', reportHost: saved.reportHost || '', apiKey: '', apiSecret: '', publicKey: '', certificate: '' })
    const [switches, setSwitches] = useState({ autoFetch: saved.autoFetch !== false, autoSend: saved.autoSend === true, syncPayments: saved.syncPayments === true, writeBack: saved.writeBack === true, transmit: saved.transmit === true, reportFiscal: saved.reportFiscal === true })
    const [seller, setSeller] = useState(saved.seller || {})
    const [source, setSource] = useState(null)
    const [busy, setBusy] = useState('')

    const set = (field) => (event) => setForm({ ...form, [field]: event.target.value })
    const run = async (name, work) => { setBusy(name); try { await work() } catch (failure) { notify('error', failure.message) } finally { setBusy('') } }

    const save = () => run('save', async () => {
        const response = await api.einvSaveSettings({ ...form, ...switches, seller })
        setForm((current) => ({ ...current, apiKey: '', apiSecret: '', publicKey: '', certificate: '' }))
        notify('success', response.gaps.length ? `Saved. Still to do: ${response.gaps.join(' ')}` : 'Saved. E-invoicing is set up.')
        onSaved()
    })
    const test = () => run('test', async () => {
        const response = await api.einvTestKeys()
        notify('success', `NRS accepted the keys and returned ${Array.isArray(response.invoiceTypes) ? response.invoiceTypes.length : 'its'} invoice types.`)
    })
    const readSource = () => run('source', async () => { setSource(await api.einvSource()) })
    const stampNow = () => run('stamps', async () => {
        const { tally } = await api.einvStamps()
        notify(tally.failed ? 'error' : 'success', tally.failed ? `Business Central did not accept the stamp: ${tally.error}` : `${tally.written} stamp(s) handed to Business Central.`)
    })
    // Only blanks are filled, so details already corrected here are kept.
    const fillSeller = () => { if (source?.seller) setSeller((current) => ({ ...Object.fromEntries(Object.entries(source.seller).filter(([, value]) => value)), ...Object.fromEntries(Object.entries(current).filter(([, value]) => value)) })) }

    if (!canManage) return <div className='bc-banner bc-banner-info'>Only an admin can see and change the e-invoicing setup.</div>
    const stored = (field) => (saved[`${field}Set`] ? 'Stored. Leave blank to keep it.' : '')
    const lastPass = saved.cycle?.last
    return (
        <>
            {!overview.secretsConfigured && <div className='bc-banner bc-banner-error'>The server cannot store keys yet (TENANT_SECRETS_KEY is not set). Ask the platform operator to configure it.</div>}
            {overview.gaps.length > 0 && <div className='bc-banner bc-banner-warn'>Still to do before anything can be sent: {overview.gaps.join(' ')}</div>}

            <div className='bc-card'>
                <h3>How to get your NRS keys</h3>
                <p className='bc-muted'>Each business uses its own keys, taken from its own NRS account. They are stored encrypted and are never shown again after saving.</p>
                <ol className='bc-einv-list'>{KEY_STEPS.map((step) => <li key={step}>{step}</li>)}</ol>
            </div>

            <div className='bc-card'>
                <h3>NRS connection</h3>
                <div className='bc-einv-form'>
                    <label className='bc-field'><span className='bc-field-label'>Environment</span>
                        <select className='bc-input' value={form.environment} onChange={set('environment')}><option value='test'>Test</option><option value='production'>Production</option></select>
                    </label>
                    <label className='bc-field bc-field-range'><span className='bc-field-label'>NRS address (base URL)</span><input className='bc-input' placeholder='https://...' value={form.baseUrl} onChange={set('baseUrl')} /></label>
                    <label className='bc-field'><span className='bc-field-label'>API key</span><input className='bc-input' type='password' autoComplete='off' placeholder={stored('apiKey')} value={form.apiKey} onChange={set('apiKey')} /></label>
                    <label className='bc-field'><span className='bc-field-label'>API secret</span><input className='bc-input' type='password' autoComplete='off' placeholder={stored('apiSecret')} value={form.apiSecret} onChange={set('apiSecret')} /></label>
                    <label className='bc-field'><span className='bc-field-label'>Service ID</span><input className='bc-input' maxLength={8} placeholder='8 letters and digits' value={form.serviceId} onChange={set('serviceId')} /></label>
                    <label className='bc-field bc-field-range'><span className='bc-field-label'>Business ID</span><input className='bc-input' value={form.businessId} onChange={set('businessId')} /></label>
                    <label className='bc-field bc-field-range'><span className='bc-field-label'>Report Host (only for fiscalization reporting)</span><input className='bc-input' placeholder='As shown on your NRS dashboard' value={form.reportHost} onChange={set('reportHost')} /></label>
                    <label className='bc-field bc-field-wide'><span className='bc-field-label'>Public key (from the keys file)</span><textarea className='bc-input' rows={2} placeholder={stored('publicKey')} value={form.publicKey} onChange={set('publicKey')} /></label>
                    <label className='bc-field bc-field-wide'><span className='bc-field-label'>Certificate (from the keys file)</span><textarea className='bc-input' rows={2} placeholder={stored('certificate')} value={form.certificate} onChange={set('certificate')} /></label>
                    <label className='bc-field'><span className='bc-field-label'>Send invoices posted from</span><input className='bc-input' type='date' value={form.startDate} onChange={set('startDate')} /></label>
                    <label className='bc-field'><span className='bc-field-label'>Customers are normally</span>
                        <select className='bc-input' value={form.defaultKind} onChange={set('defaultKind')}><option value='B2B'>Businesses (B2B)</option><option value='B2C'>Consumers (B2C)</option><option value='B2G'>Government (B2G)</option></select>
                    </label>
                </div>
                <p className='bc-muted'>Every invoice in Business Central is kept here whatever its date. Those posted before this date are held under &quot;Left out&quot; and are never sent, so switching e-invoicing on does not offer years of old invoices to NRS. Set it to the day your business starts e-invoicing.</p>
            </div>

            <div className='bc-card'>
                <h3>What runs by itself</h3>
                {SWITCHES.map(([field, label, hint]) => (
                    <label key={field} className='bc-einv-switch'>
                        <input type='checkbox' checked={switches[field]} onChange={(event) => setSwitches({ ...switches, [field]: event.target.checked })} />
                        <span>{label}<span className='bc-muted'> {hint}</span></span>
                    </label>
                ))}
                {lastPass && <p className='bc-muted'>Last pass {formatDateTime(lastPass.at)}{lastPass.errors?.length ? `, with problems: ${lastPass.errors.join(' ')}` : ', with no problems'}.</p>}
                {saved.writeBack && <div className='bc-einv-toolbar'><button type='button' className='bc-button' disabled={!!busy} onClick={stampNow}>{busy === 'stamps' ? 'Working...' : 'Hand stamps to Business Central now'}</button></div>}
            </div>

            <div className='bc-card'>
                <h3>Your business, as it appears on every invoice</h3>
                <div className='bc-einv-toolbar'>
                    <button type='button' className='bc-button' disabled={!!busy} onClick={readSource}>{busy === 'source' ? 'Reading...' : 'Check Business Central pages'}</button>
                    {source?.seller && <button type='button' className='bc-button' onClick={fillSeller}>Fill blanks from Company Information</button>}
                </div>
                <div className='bc-einv-form'>
                    {SELLER_FIELDS.map(([field, label]) => (
                        <label key={field} className='bc-field'><span className='bc-field-label'>{label}</span><input className='bc-input' value={seller[field] || ''} onChange={(event) => setSeller({ ...seller, [field]: event.target.value })} /></label>
                    ))}
                </div>
                {source && (
                    <div className='bc-table-scroll'>
                        <table className='bc-table'>
                            <thead><tr><th>Needed from Business Central</th><th>Page found</th><th>Fields it does not supply</th></tr></thead>
                            <tbody>
                                {Object.entries(source.pages).map(([role, info]) => (
                                    <tr key={role}>
                                        <td>{PAGE_LABELS[role] || role}</td>
                                        <td>{info.published.length ? info.published.join(', ') : `Not published (${info.expected.join(' or ')})`}</td>
                                        <td>{info.missingFields.join(', ') || 'None'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className='bc-einv-actions'>
                <button type='button' className='bc-button bc-button-primary' disabled={!!busy || !overview.secretsConfigured} onClick={save}>{busy === 'save' ? 'Saving...' : 'Save'}</button>
                <button type='button' className='bc-button' disabled={!!busy || !saved.apiKeySet} onClick={test}>{busy === 'test' ? 'Testing...' : 'Test keys'}</button>
            </div>

            <ApiKeys api={api} keys={saved.apiKeys || []} notify={notify} onChanged={onSaved} />
        </>
    )
}

// ------------------------------------------------------------ Activity ----

const Activity = ({ api }) => {
    const [log, setLog] = useState(null)
    const [error, setError] = useState('')
    useEffect(() => { api.einvLog().then((response) => setLog(response.log)).catch((failure) => setError(failure.message)) }, [api])
    if (error) return <div className='bc-banner bc-banner-error'>{error}</div>
    if (!log) return <p className='bc-empty'>Loading...</p>
    if (!log.length) return <div className='bc-card'><p className='bc-empty'>Nothing has been sent to NRS yet.</p></div>
    return (
        <div className='bc-card'>
            <p className='bc-muted'>The last {log.length} calls made to NRS, newest first.</p>
            <div className='bc-table-scroll'>
                <table className='bc-table'>
                    <thead><tr><th>When</th><th>Document</th><th>Call</th><th>Answer</th><th className='bc-num'>Time</th><th>By</th></tr></thead>
                    <tbody>
                        {log.map((entry) => (
                            <tr key={`${entry.at}${entry.action}${entry.documentId}`}>
                                <td>{formatDateTime(entry.at)}</td>
                                <td>{String(entry.documentId || '').split('|').slice(1).join(' ')}</td>
                                <td>{entry.action}</td>
                                <td>{entry.ok ? 'Accepted' : `Refused (${entry.httpStatus || 'no answer'})`}</td>
                                <td className='bc-num'>{entry.ms} ms</td>
                                <td>{entry.startedBy === 'schedule' ? 'Automatic' : (entry.startedBy || 'Automatic')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------- Shell ----

const BCEInvoice = ({ api, notify }) => {
    // Setup was for admins; it is now a permission of its own, as is acting on invoices.
    const { can } = useBCAccess()
    const canManage = can('einvoice.setup')
    const canSend = can('einvoice.send')
    const [overview, setOverview] = useState(null)
    const [error, setError] = useState('')
    const [section, setSectionInUrl] = useUrlState('section', 'invoices')
    // The status tab belongs to the invoice list and is dropped on leaving it.
    const setSection = useCallback((next) => setSectionInUrl(next, { status: '' }), [setSectionInUrl])
    const [counts, setCounts] = useState(null)

    const load = useCallback(async () => {
        try {
            const response = await api.einvOverview()
            setOverview(response)
            setCounts(response.counts)
            setError('')
            return response
        } catch (failure) { setError(failure.message); return null }
    }, [api])
    useEffect(() => { load() }, [load])

    if (error && !overview) return <div className='bc-banner bc-banner-error'>{error}</div>
    if (!overview) return <p className='bc-empty'>Loading e-invoicing...</p>

    const ready = overview.gaps.filter((gap) => !/QR code/.test(gap)).length === 0
    const sections = [
        { key: 'invoices', label: 'Invoices' },
        ...(canSend ? [
            { key: 'mapping', label: `Fix what is missing${counts?.needsAttention?.count ? ` (${counts.needsAttention.count})` : ''}` },
            { key: 'add', label: 'Add invoices' },
        ] : []),
        { key: 'activity', label: 'Activity' },
        ...(canManage ? [{ key: 'setup', label: 'Setup' }] : []),
    ]
    return (
        <div className='bc-einv'>
            <div className='bc-einv-tiles'>
                {STATUS_ORDER.map((key) => (
                    <div key={key} className={`bc-einv-tile bc-einv-tile-${key}`}>
                        <span className='bc-field-label'>{STATUS_LABELS[key]}</span>
                        <strong>{(counts?.[key]?.count || 0).toLocaleString()}</strong>
                        <span className='bc-muted'>{money(counts?.[key]?.total || 0)}</span>
                    </div>
                ))}
            </div>
            {!ready && section !== 'setup' && (
                <div className='bc-banner bc-banner-warn'>
                    Invoices are being read from Business Central, but nothing can be sent to NRS yet. {overview.gaps.join(' ')}
                    {canManage ? <> <button type='button' className='bc-link-button' onClick={() => setSection('setup')}>Open setup</button></> : ' An admin needs to finish the setup.'}
                </div>
            )}
            <nav className='bc-tabs bc-tabs-inner' aria-label='E-invoicing sections'>
                {sections.map((entry) => <button key={entry.key} type='button' className={section === entry.key ? 'active' : ''} aria-current={section === entry.key ? 'page' : undefined} onClick={() => setSection(entry.key)}>{entry.label}</button>)}
            </nav>
            {section === 'invoices' && <Invoices api={api} counts={counts} ready={ready} onCounts={setCounts} notify={notify} onGoTo={setSection} />}
            {section === 'mapping' && <Mapping api={api} onCounts={setCounts} notify={notify} onGoTo={setSection} />}
            {section === 'add' && <AddInvoices api={api} onCounts={setCounts} notify={notify} onGoTo={setSection} />}
            {section === 'activity' && <Activity api={api} />}
            {section === 'setup' && <Setup key={overview.settings?.updatedAt || 'new'} api={api} overview={overview} canManage={canManage} onSaved={load} notify={notify} />}
        </div>
    )
}

export default BCEInvoice
