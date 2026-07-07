import './Reconciliation.css'

import { useState, useEffect, useContext } from 'react';
import ContextProvider from '../../Resources/ContextProvider';
import Notify from '../../Resources/Notify/Notify';
import { exportReconciliationExcel, exportReconciliationPDF } from '../../utils/reconciliationExport';

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

                                            {shortageDraft?.location === loc.location && (
                                                <div className='reconcile-shortage-draft'>
                                                    <div>Shortage value available: {shortageDraft.shortageAvailable.toLocaleString()}</div>
                                                    {shortageDraft.allocations.length === 0 && <div>No open/closed sessions found for this location on this date.</div>}
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
                                                    <div className='reconcile-shortage-actions'>
                                                        <button disabled={busyAction} onClick={handlePostShortage}>Confirm Post Shortage</button>
                                                        <button disabled={busyAction} onClick={() => setShortageDraft(null)}>Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </>
                )}

                {confirmAdjustment && <Notify
                    notifyMessage={`Post an inventory adjustment for ${confirmAdjustment} on ${postingDate}? This will create InventoryTransactions lines to match counted stock and lock this location.`}
                    notifyState={'info'}
                    timeout={100000}
                    actionMessage={'Confirm'}
                    cancel={() => setConfirmAdjustment(null)}
                    action={() => handlePostAdjustment(confirmAdjustment)}
                />}
            </div>
        </div>
    )
}

export default ReconciliationReview
