import React, { useContext, useEffect, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import PaymentReceiptsModal from '../DashView/PaymentReceiptsModal'
import { loadReconciliation, totalsOf, businessDateOf } from '../../Resources/reconciliationData'

// The last step before a Session Manager starts: the money taken and the
// debts and shortages incurred over the business day(s) the stopped Session
// Manager ran, laid out as the Payment Receipts view does
// (Resources/reconciliationData.js). Whoever runs it checks the figures
// against the bank for that date and approves, which starts the new Session
// Manager, or declines, which puts starting on hold for everyone until it is
// approved (wageserver /pos/sessionManager/reconcile).
const SessionManagerReconcile = ({ manager, onApproved, onClose }) => {
    const { fetchServer, server, company, setAlert, setAlertState, setAlertTimeout, getSessionStart, getSessionEnd } = useContext(ContextProvider)
    const [data, setData] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState('')

    // The business days its sessions started on, the days their sales are
    // posted under. A Session Manager stopped after the next morning's
    // closing hour still covers one day when no session started that day.
    const from = businessDateOf(manager.start, getSessionStart)
    const [to, setTo] = useState(null)

    useEffect(() => {
        let cancelled = false
        const end = manager.end || Date.now()
        fetchServer('POST', { database: company, collection: 'POSSessions', prop: { start: { $gte: manager.start, $lte: end } } }, 'getDocsDetails', server)
            .catch(() => null)
            .then((resp) => {
                const days = (Array.isArray(resp?.record) ? resp.record : []).map((s) => businessDateOf(s.start, getSessionStart))
                const last = days.reduce((max, day) => (day > max ? day : max), from)
                if (cancelled) return null
                setTo(last)
                return loadReconciliation({ fetchServer, server, company, from, to: last, getSessionStart, getSessionEnd })
            })
            .then((result) => { if (!cancelled && result) setData(result) })
            .catch((error) => { if (!cancelled) setLoadError(error.message || 'Could not load the figures for this Session Manager.') })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manager.start, manager.end])

    const receipts = data?.rows || []
    const totals = totalsOf(receipts)

    const decide = async (decision) => {
        setSaving(decision)
        const resp = await fetchServer('POST', { start: manager.start, decision, note, total: totals.received }, 'pos/sessionManager/reconcile', server).catch(() => null)
        setSaving('')
        if (resp?.ok) {
            if (decision === 'approved') {
                onApproved(resp.record)
            } else {
                setAlertState('info')
                setAlert('Reconciliation declined. Everyone is told that starting is on hold until it is approved.')
                setAlertTimeout(6000)
                onClose(resp.record)
            }
            return
        }
        // Offline the decision cannot be recorded. Approving is the usual
        // case and must not keep the business closed; a decline has to
        // reach the other devices to mean anything, so it waits.
        if (decision === 'approved' && typeof navigator !== 'undefined' && navigator.onLine === false) {
            if (window.confirm('You are offline, so the approval cannot be recorded on the server now. Start the Session Manager anyway?')) onApproved(null)
            return
        }
        setAlertState('error')
        setAlert(resp?.mess || 'Could not save the reconciliation. Check the connection and try again.')
        setAlertTimeout(5000)
    }

    const previous = manager.reconciliation
    const toShown = to || from
    const days = `${from}${toShown !== from ? ` to ${toShown}` : ''}`
    const notice = (
        <div className='sm-reconcile-notice'>
            <p>
                {`Check what was taken on ${days} (the Session Manager started ${new Date(manager.start).toLocaleString()}), against the bank and cash for those dates. `}
                Approve to start today&apos;s Session Manager. Decline to hold starting for everyone until it is resolved.
            </p>
            {previous?.status === 'declined' && (
                <p className='sm-reconcile-declined'>
                    {`Declined by ${previous.by} at ${new Date(previous.at).toLocaleString()}${previous.note ? `: ${previous.note}` : '.'}`}
                </p>
            )}
            {!data && !loadError && <p>Loading the figures...</p>}
            {loadError && <p className='sm-reconcile-declined'>{loadError}</p>}
        </div>
    )

    // Above the figures, and kept in view while they scroll, so the choice
    // never sits on top of the tables.
    const actions = (
        <div className='sm-reconcile-bar'>
            <div className='sm-reconcile-totals'>
                <strong>{`Received ₦${totals.received.toLocaleString()}`}</strong>
                <span>{`Debts ₦${totals.debts.toLocaleString()} · Shortages ₦${totals.shortages.toLocaleString()}`}</span>
                <span>{`Of those, recovered ₦${totals.recovered.toLocaleString()}, remaining ₦${totals.remaining.toLocaleString()}`}</span>
            </div>
            <label className='sm-reconcile-note'>
                <span>Note (optional, shown to everyone on a decline)</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder='For example: bank shows 12,000 less on transfers' />
            </label>
            <div className='sm-reconcile-actions'>
                <button type='button' className='sm-reconcile-decline' disabled={!!saving || !data} onClick={() => decide('declined')}>
                    {saving === 'declined' ? 'Declining...' : 'Decline'}
                </button>
                <button type='button' className='sm-reconcile-approve' disabled={!!saving || !data} onClick={() => decide('approved')}>
                    {saving === 'approved' ? 'Approving...' : 'Approve and start'}
                </button>
            </div>
        </div>
    )

    return (
        <PaymentReceiptsModal
            open
            onClose={() => onClose(null)}
            paymentReceipts={receipts}
            title={`Reconcile ${days} before starting`}
            fixedRange={{ from, to: toShown }}
            notice={notice}
            actions={actions}
        />
    )
}

export default SessionManagerReconcile
