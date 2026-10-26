import React, { useContext, useEffect, useMemo, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import PaymentReceiptsModal from '../DashView/PaymentReceiptsModal'
import { buildPaymentReceipts, buildDebtRows, localDate } from '../../Resources/paymentReceipts'

// The last step before a Session Manager starts: the money the previous one
// took, by module, payment method and employee, laid out as the Payment
// Receipts view does, for that Session Manager's own period only. Whoever
// runs it checks the figures against the bank for that date and approves,
// which starts the new Session Manager, or declines, which puts starting on
// hold for everyone until it is approved (wageserver
// /pos/sessionManager/reconcile).
const SessionManagerReconcile = ({ manager, onApproved, onClose }) => {
    const { fetchServer, server, company, setAlert, setAlertState, setAlertTimeout } = useContext(ContextProvider)
    const [data, setData] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState('')

    const from = localDate(manager.start)
    const to = localDate(manager.end || Date.now())

    useEffect(() => {
        let cancelled = false
        const read = (collection, prop) => fetchServer('POST', { database: company, collection, prop }, 'getDocsDetails', server)
            .then((resp) => (resp && !resp.err && Array.isArray(resp.record) ? resp.record : Promise.reject(new Error(resp?.mess || `Could not load ${collection}.`))))
        const span = { $gte: manager.start, $lte: manager.end || Date.now() }
        Promise.all([
            read('Orders', { $or: [{ createdAt: span }, { sessionId: span }] }),
            read('POSSessions', { start: span }),
            read('Accommodations', { $or: [{ 'paymentHistory.paymentDate': { $gte: from, $lte: to } }, { postingDate: { $gte: from, $lte: to } }] }),
            read('Sales', { 'recoveryList.recoveryDate': { $gte: from, $lte: to } }),
            read('InventoryReconciliations', { postingDate: { $gte: from, $lte: to } }),
        ]).then(async ([orders, sessions, accommodations, sales, reconciliations]) => {
            // The sales days these sessions were posted under, whatever their
            // date, carry what has been recovered of each session's debt.
            const starts = sessions.map((s) => s.start).filter((v) => v != null)
            const postedUnder = starts.length ? await read('Sales', { salesSessions: { $in: starts } }) : []
            if (!cancelled) setData({ orders, sessions, accommodations, sales, reconciliations, postedUnder })
        }).catch((error) => {
            if (!cancelled) setLoadError(error.message || 'Could not load the figures for this Session Manager.')
        })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manager.start, manager.end])

    // Orders and sessions were read for this Session Manager's own window;
    // the other modules carry only a date, so they are kept to its dates.
    // Debts and shortages, from closed POS sessions, the inventory
    // reconciliation and accommodation, sit in the same table as the
    // payments, marked by kind, so the money received is totalled on its own.
    const receipts = useMemo(() => {
        if (!data) return []
        const paid = buildPaymentReceipts({ sales: data.sales, accommodations: data.accommodations, orders: data.orders, sessions: data.sessions })
            .filter((row) => {
                if (String(row.paymentModule).startsWith('POS Order')) return true
                const day = String(row.paymentDate || '').slice(0, 10)
                return day >= from && day <= to
            })
        const owed = buildDebtRows({ sessions: data.sessions, accommodations: data.accommodations, reconciliations: data.reconciliations, sales: data.postedUnder, from, to })
        return [...paid, ...owed]
    }, [data, from, to])
    const sumOf = (kind, field = 'paymentAmount') => receipts.filter((row) => (row.kind || 'payment') === kind).reduce((sum, row) => sum + Number(row[field] || 0), 0)
    const total = sumOf('payment')
    const debts = sumOf('debt')
    const shortages = sumOf('shortage')
    const owedRecovered = sumOf('debt', 'recoveredAmount') + sumOf('shortage', 'recoveredAmount')
    const owedRemaining = sumOf('debt', 'remainingAmount') + sumOf('shortage', 'remainingAmount')

    const decide = async (decision) => {
        setSaving(decision)
        const resp = await fetchServer('POST', { start: manager.start, decision, note, total }, 'pos/sessionManager/reconcile', server).catch(() => null)
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
    const notice = (
        <div className='sm-reconcile-notice'>
            <p>
                {`Check what the Session Manager started ${new Date(manager.start).toLocaleString()} took, against the bank and cash for ${from}${to !== from ? ` to ${to}` : ''}. `}
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

    const footer = (
        <div className='sm-reconcile-footer'>
            <label>
                <span>Note (optional, shown to everyone on a decline)</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder='For example: bank shows 12,000 less on transfers' />
            </label>
            <div className='sm-reconcile-actions'>
                <div className='sm-reconcile-totals'>
                    <strong>{`Received ₦${total.toLocaleString()}`}</strong>
                    <span>{`Debts ₦${debts.toLocaleString()}`}</span>
                    <span>{`Shortages ₦${shortages.toLocaleString()}`}</span>
                    <span>{`Of those, recovered ₦${owedRecovered.toLocaleString()}, remaining ₦${owedRemaining.toLocaleString()}`}</span>
                </div>
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
            title={`Reconcile ${from}${to !== from ? ` to ${to}` : ''} before starting`}
            fixedRange={{ from, to }}
            notice={notice}
            footer={footer}
        />
    )
}

export default SessionManagerReconcile
