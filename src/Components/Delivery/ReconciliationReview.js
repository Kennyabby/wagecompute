import './Reconciliation.css'

import { useState, useEffect, useContext } from 'react';
import ContextProvider from '../../Resources/ContextProvider';
import { exportReconciliationExcel, exportReconciliationPDF } from '../../utils/reconciliationExport';
import { uploadFile } from '../../Resources/ClientServerAPIConn/API/fileCrudApi';

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const ReconciliationReview = ({
    companyRecord, getEmployeeName,
    allSessions, allDeliverySessions, setReviewOpen,
    setAlert, setAlertState, setAlertTimeout,
}) => {
    const { fetchServer, server, company, getSessionStart, getSessionEnd } = useContext(ContextProvider)
    const isAdmin = companyRecord?.status === 'admin'
    const [postingDate, setPostingDate] = useState(new Date().toISOString().slice(0, 10))
    const [record, setRecord] = useState(null)
    const [loading, setLoading] = useState(false)
    const [expandedLocation, setExpandedLocation] = useState(null)
    const [shortageDraft, setShortageDraft] = useState(null) // { location, allocations: [{start, employee_id, amount}] }
    const [confirmAdjustment, setConfirmAdjustment] = useState(null) // location name pending confirm
    const [busyAction, setBusyAction] = useState(false)
    const [outstandingByEmployee, setOutstandingByEmployee] = useState({})
    const [recoveryDraft, setRecoveryDraft] = useState(null) // { employeeId, amount, recoveryPoint, recoveryReceipt, imgId, viewLink, downloadLink }
    const [recoveryUpload, setRecoveryUpload] = useState(null)
    const [uploadingReceipt, setUploadingReceipt] = useState(false)

    const fetchRecord = async (date) => {
        setLoading(true)
        try {
            const resp = await fetchServer("POST", { postingDate: date }, "inventoryReconciliation/getForDate", server)
            if (resp?.err) {
                setAlertState('error')
                setAlert(resp?.mess || 'Failed to load reconciliation for this date.')
                setAlertTimeout(4000)
                setRecord(null)
                return
            }
            setRecord(resp?.exists ? resp.record : null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRecord(postingDate)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postingDate])

    const loadOutstandingShortage = async () => {
        const resp = await fetchServer('POST', {}, 'inventoryReconciliation/getOutstandingShortage', server)
        if (resp?.err) return
        setOutstandingByEmployee(resp?.outstandingByEmployee || {})
    }

    useEffect(() => {
        loadOutstandingShortage()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postingDate])

    const handlePostShortageRecovery = async () => {
        if (!recoveryDraft) return
        setBusyAction(true)
        try {
            let uploadedImage = {}
            if (recoveryUpload) {
                setUploadingReceipt(true)
                const folderPath = `${company}/Inventory Shortage Recoveries`
                const uniqueMarker = `shortage-recovery-${recoveryDraft.employeeId}-${Date.now()}`
                const res = await uploadFile(recoveryUpload, folderPath, uniqueMarker, company, 'POSSessions', server)
                setUploadingReceipt(false)
                if (res?.err || (!res?.imgId && !res?.downloadLink)) {
                    setAlertState('error'); setAlert(res?.mess || 'Failed to upload receipt.'); setAlertTimeout(4000)
                    return
                }
                uploadedImage = { imgId: res.imgId || '', viewLink: res.viewLink || '', downloadLink: res.downloadLink || '' }
            }
            const resp = await fetchServer('POST', {
                employee_id: recoveryDraft.employeeId,
                amountRecovered: recoveryDraft.amount,
                recoveryPoint: recoveryDraft.recoveryPoint,
                recoveryReceipt: recoveryDraft.recoveryReceipt,
                recoveryTransferId: recoveryDraft.recoveryTransferId,
                ...uploadedImage,
            }, 'inventoryReconciliation/postShortageRecovery', server)
            if (resp?.err || !resp?.ok) {
                setAlertState('error'); setAlert(resp?.mess || 'Failed to post shortage recovery.'); setAlertTimeout(5000)
                return
            }
            setAlertState('success'); setAlert(`Recovered ₦${Number(resp.appliedAmount || 0).toLocaleString()}.`); setAlertTimeout(3000)
            setRecoveryDraft(null)
            setRecoveryUpload(null)
            loadOutstandingShortage()
        } finally {
            setBusyAction(false)
        }
    }

    const openSessionsForLocation = (location) => {
        if (typeof getSessionStart !== 'function' || typeof getSessionEnd !== 'function') return []
        const midday = new Date(`${postingDate}T12:00:00`).getTime()
        const dayStart = getSessionStart(midday)
        const dayEnd = getSessionEnd(dayStart)
        const combined = [...(allSessions || []), ...(allDeliverySessions || [])]
        return combined.filter((session) => (
            session.wrh === location && session.start >= dayStart && session.start < dayEnd
        ))
    }

    const handleRecompute = async (location) => {
        setBusyAction(true)
        try {
            const resp = await fetchServer("POST", { postingDate, location }, "inventoryReconciliation/recompute", server)
            if (resp?.err) {
                setAlertState('error'); setAlert(resp?.mess || 'Recompute failed.'); setAlertTimeout(4000)
                return
            }
            setRecord(resp.record)
            setAlertState('success'); setAlert('Recomputed successfully.'); setAlertTimeout(2000)
        } finally {
            setBusyAction(false)
        }
    }

    const handlePostAdjustment = async (location) => {
        setBusyAction(true)
        try {
            const resp = await fetchServer("POST", { postingDate, location }, "inventoryReconciliation/postAdjustment", server)
            if (resp?.err) {
                setAlertState('error'); setAlert(resp?.mess || 'Failed to post adjustment.'); setAlertTimeout(5000)
                return
            }
            setRecord(resp.record)
            setAlertState('success'); setAlert(`Adjustment posted (${resp.transactionsCount || 0} line(s)).`); setAlertTimeout(3000)
        } finally {
            setBusyAction(false)
            setConfirmAdjustment(null)
        }
    }

    const openShortageDraft = (location, shortageAvailable) => {
        const sessions = openSessionsForLocation(location)
        setShortageDraft({
            location,
            shortageAvailable,
            allocations: sessions.map((s) => ({
                start: s.start,
                employee_id: s.employee_id || s.handlerId || '',
                amount: 0,
            })),
        })
    }

    const handlePostShortage = async () => {
        if (!shortageDraft) return
        const targetSessions = shortageDraft.allocations.filter((a) => Number(a.amount) > 0)
        if (!targetSessions.length) {
            setAlertState('error'); setAlert('Enter at least one charge amount.'); setAlertTimeout(3000)
            return
        }
        setBusyAction(true)
        try {
            const resp = await fetchServer("POST", {
                postingDate,
                location: shortageDraft.location,
                targetSessions,
            }, "inventoryReconciliation/postShortage", server)
            if (resp?.err) {
                setAlertState('error'); setAlert(resp?.mess || 'Failed to post shortage.'); setAlertTimeout(5000)
                return
            }
            setRecord(resp.record)
            setAlertState('success'); setAlert('Shortage posted to session(s).'); setAlertTimeout(3000)
            setShortageDraft(null)
        } finally {
            setBusyAction(false)
        }
    }

    const grandTotals = record?.grandTotals || { positiveDifferenceQty: 0, negativeDifferenceQty: 0, positiveDifferenceValue: 0, negativeDifferenceValue: 0 }

    return (
        <div className='reconcile-review-overlay'>
            <div className='reconcile-review-modal'>
                <div className='reconcile-review-header'>
                    <h3>Inventory Reconciliation Review</h3>
                    <input
                        type='date'
                        value={postingDate}
                        onChange={(e) => setPostingDate(e.target.value)}
                    />
                    <button className='add-products-button-cancel' onClick={() => setReviewOpen(false)}>Close</button>
                </div>

                {loading && <div className='reconcile-loading-tag'>Loading...</div>}
                {!loading && !record && <div className='reconcile-review-empty'>No reconciliation saved for this date.</div>}

                {!loading && record && (
                    <>
                        <div className='reconcile-review-grand-totals'>
                            <div>Over (all locations): <b>{round2(grandTotals.positiveDifferenceQty)}</b> qty / <b>{round2(grandTotals.positiveDifferenceValue).toLocaleString()}</b></div>
                            <div>Short (all locations): <b>{round2(Math.abs(grandTotals.negativeDifferenceQty))}</b> qty / <b>{round2(Math.abs(grandTotals.negativeDifferenceValue)).toLocaleString()}</b></div>
                        </div>

                        {(record.locations || []).map((loc) => {
                            const totals = loc.totals || {}
                            const shortageAvailable = round2(Math.abs(totals.negativeDifferenceValue || 0))
                            const isExpanded = expandedLocation === loc.location
                            return (
                                <div key={loc.location} className='reconcile-review-location-card'>
                                    <div className='reconcile-review-location-head' onClick={() => setExpandedLocation(isExpanded ? null : loc.location)}>
                                        <span className='reconcile-review-location-name'>{loc.location}</span>
                                        <span>Over: {round2(totals.positiveDifferenceQty || 0)} ({round2(totals.positiveDifferenceValue || 0).toLocaleString()})</span>
                                        <span>Short: {round2(Math.abs(totals.negativeDifferenceQty || 0))} ({shortageAvailable.toLocaleString()})</span>
                                        <span>Counted Sales Value: {round2(totals.countedSalesValue || 0).toLocaleString()}</span>
                                        {loc.locked && <span className='reconcile-locked-tag'>Locked ({loc.lockedReason})</span>}
                                    </div>

                                    {isExpanded && (
                                        <div className='reconcile-review-location-body'>
                                            <div className='reconcile-review-actions'>
                                                {isAdmin && !loc.locked && (
                                                    <button disabled={busyAction} onClick={() => handleRecompute(loc.location)}>Recompute</button>
                                                )}
                                                {isAdmin && !loc.locked && shortageAvailable > 0 && (
                                                    <button disabled={busyAction} onClick={() => openShortageDraft(loc.location, shortageAvailable)}>Post Shortage to Session(s)</button>
                                                )}
                                                {isAdmin && !loc.locked && (
                                                    <button disabled={busyAction} onClick={() => setConfirmAdjustment(loc.location)}>Post Inventory Adjustment</button>
                                                )}
                                                <button onClick={() => exportReconciliationExcel({ companyInfo: { name: company }, postingDate, location: loc.location, lines: loc.lines || [] })}>Export Excel</button>
                                                <button onClick={() => exportReconciliationPDF({ companyInfo: { name: company }, postingDate, location: loc.location, lines: loc.lines || [] })}>Export PDF</button>
                                            </div>

                                            {loc.lockedReason === 'shortage' && (loc.shortagePostings || []).length > 0 && (
                                                <div className='reconcile-review-shortage-postings'>
                                                    <div className='reconcile-review-shortage-postings-title'>Shortage charged to</div>
                                                    {loc.shortagePostings.map((posting, pIdx) => {
                                                        const outstanding = Number(outstandingByEmployee?.[posting.employee_id]) || 0
                                                        return (
                                                            <div key={pIdx} className='reconcile-shortage-row'>
                                                                <span>{getEmployeeName ? getEmployeeName(posting.employee_id) : posting.employee_id}</span>
                                                                <span>Charged: ₦{Number(posting.amountCharged || 0).toLocaleString()}</span>
                                                                <span>{new Date(posting.postedAt).toLocaleDateString()}</span>
                                                                {isAdmin && outstanding > 0 && (
                                                                    <button
                                                                        disabled={busyAction}
                                                                        onClick={() => setRecoveryDraft({
                                                                            employeeId: posting.employee_id,
                                                                            amount: '',
                                                                            recoveryPoint: '',
                                                                            recoveryReceipt: '',
                                                                            recoveryTransferId: '',
                                                                        })}
                                                                    >
                                                                        Record Recovery (₦{outstanding.toLocaleString()} outstanding)
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            <div className='reconcile-review-table-wrap'>
                                                <table className='reconcile-review-table'>
                                                    <thead>
                                                        <tr>
                                                            <th>Product</th>
                                                            <th>Opening</th>
                                                            <th>Purchased</th>
                                                            <th>Sold</th>
                                                            <th>Transfer In</th>
                                                            <th>Transfer Out</th>
                                                            <th>Damaged</th>
                                                            <th>System Closing</th>
                                                            <th>Counted</th>
                                                            <th>Difference</th>
                                                            <th>Sales Value Diff</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(loc.lines || []).map((line) => (
                                                            <tr key={line.productId} className={line.qtyDifference > 0 ? 'diff-positive' : line.qtyDifference < 0 ? 'diff-negative' : ''}>
                                                                <td>{line.name}</td>
                                                                <td>{line.openingQty}</td>
                                                                <td>{line.purchasedQty}</td>
                                                                <td>{Math.abs(line.soldQty || 0)}</td>
                                                                <td>{line.transferInQty}</td>
                                                                <td>{Math.abs(line.transferOutQty || 0)}</td>
                                                                <td>{Math.abs(line.damagedQty || 0)}</td>
                                                                <td>{line.systemClosingQty}</td>
                                                                <td>{line.countedQuantity ?? '-'}</td>
                                                                <td>{line.qtyDifference}</td>
                                                                <td>{round2(line.salesDifference).toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </>
                )}
            </div>

            {confirmAdjustment && (
                <div className='reconcile-confirm-overlay' onClick={() => !busyAction && setConfirmAdjustment(null)}>
                    <div className='reconcile-confirm-modal' onClick={(e) => e.stopPropagation()}>
                        <h4>Post Inventory Adjustment</h4>
                        <p>
                            Post an inventory adjustment for <b>{confirmAdjustment}</b> on <b>{postingDate}</b>?
                            This will create InventoryTransactions lines to match the counted stock and lock this
                            location from further edits.
                        </p>
                        <div className='reconcile-confirm-actions'>
                            <button disabled={busyAction} onClick={() => handlePostAdjustment(confirmAdjustment)}>
                                {busyAction ? 'Posting...' : 'Confirm Adjustment'}
                            </button>
                            <button disabled={busyAction} className='secondary' onClick={() => setConfirmAdjustment(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {shortageDraft && (
                <div className='reconcile-confirm-overlay' onClick={() => !busyAction && setShortageDraft(null)}>
                    <div className='reconcile-confirm-modal reconcile-shortage-modal' onClick={(e) => e.stopPropagation()}>
                        <h4>Post Shortage to POS Session(s)</h4>
                        <p>
                            Location <b>{shortageDraft.location}</b> — shortage value available:{' '}
                            <b>{shortageDraft.shortageAvailable.toLocaleString()}</b>.
                            Select the amount to charge each employee's session below (partial splits allowed).
                        </p>
                        {shortageDraft.allocations.length === 0 && (
                            <div className='reconcile-review-empty'>No open/closed sessions were found for this location on this date.</div>
                        )}
                        {shortageDraft.allocations.map((alloc, idx) => (
                            <div key={alloc.start} className='reconcile-shortage-row'>
                                <span>{getEmployeeName ? getEmployeeName(alloc.employee_id) : alloc.employee_id}</span>
                                <input
                                    type='number'
                                    min={0}
                                    value={alloc.amount}
                                    onChange={(e) => {
                                        const value = Number(e.target.value || 0)
                                        setShortageDraft((prev) => {
                                            const next = { ...prev, allocations: [...prev.allocations] }
                                            next.allocations[idx] = { ...next.allocations[idx], amount: value }
                                            return next
                                        })
                                    }}
                                />
                            </div>
                        ))}
                        <div className='reconcile-confirm-actions'>
                            <button disabled={busyAction || !shortageDraft.allocations.length} onClick={handlePostShortage}>
                                {busyAction ? 'Posting...' : 'Confirm Post Shortage'}
                            </button>
                            <button disabled={busyAction} className='secondary' onClick={() => setShortageDraft(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {recoveryDraft && (
                <div className='reconcile-confirm-overlay' onClick={() => !busyAction && setRecoveryDraft(null)}>
                    <div className='reconcile-confirm-modal' onClick={(e) => e.stopPropagation()}>
                        <h4>Record Inventory Shortage Recovery</h4>
                        <p>
                            {getEmployeeName ? getEmployeeName(recoveryDraft.employeeId) : recoveryDraft.employeeId} —
                            outstanding: ₦{(Number(outstandingByEmployee?.[recoveryDraft.employeeId]) || 0).toLocaleString()}
                        </p>
                        <div className='inpcov'>
                            <div>Amount Recovered</div>
                            <input
                                type='number'
                                min={0}
                                value={recoveryDraft.amount}
                                onChange={(e) => setRecoveryDraft((prev) => ({ ...prev, amount: e.target.value }))}
                            />
                        </div>
                        <div className='inpcov'>
                            <div>Receipt Number</div>
                            <input
                                type='text'
                                placeholder='Enter Receipt Number'
                                disabled={recoveryDraft.recoveryPoint === 'Employee'}
                                value={recoveryDraft.recoveryReceipt}
                                onChange={(e) => setRecoveryDraft((prev) => ({ ...prev, recoveryReceipt: e.target.value }))}
                            />
                        </div>
                        <div className='inpcov'>
                            <div>Recovery Point</div>
                            <select
                                value={recoveryDraft.recoveryPoint}
                                onChange={(e) => setRecoveryDraft((prev) => ({ ...prev, recoveryPoint: e.target.value, recoveryTransferId: '', recoveryReceipt: e.target.value === 'Employee' ? '' : prev.recoveryReceipt }))}
                            >
                                <option value=''>Select Recovery Point</option>
                                <option value='cash'>CASH</option>
                                <option value='bank'>BANK</option>
                                <option value='Employee'>EMPLOYEE (transfer)</option>
                            </select>
                        </div>
                        <div className='inpcov'>
                            <div>Upload Receipt</div>
                            <input
                                type='file'
                                accept='image/*'
                                capture='environment'
                                onChange={(e) => setRecoveryUpload(e.target.files?.[0] || null)}
                            />
                        </div>
                        <div className='reconcile-confirm-actions'>
                            <button disabled={busyAction || uploadingReceipt || !(Number(recoveryDraft.amount) > 0)} onClick={handlePostShortageRecovery}>
                                {busyAction || uploadingReceipt ? 'Posting...' : 'Confirm Recovery'}
                            </button>
                            <button disabled={busyAction} className='secondary' onClick={() => { setRecoveryDraft(null); setRecoveryUpload(null) }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReconciliationReview
