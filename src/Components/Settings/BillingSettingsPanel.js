import { useContext, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import ContextProvider from '../../Resources/ContextProvider'

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('en-NG', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-NG', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const formatMoney = (value) => currencyFormatter.format(Number(value || 0))
const formatDate = (value) => (value ? dateFormatter.format(new Date(Number(value))) : '--')
const formatDateTime = (value) => (value ? dateTimeFormatter.format(new Date(Number(value))) : '--')
const formatStatus = (value) => String(value || 'unconfigured').replace(/_/g, ' ')

const printHtmlDocument = ({ title, subtitle, rows = [], footer = '' }) => {
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) return

  const content = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Montserrat, Arial, sans-serif; margin: 32px; color: #173829; }
          h1 { margin: 0 0 8px; font-size: 26px; }
          p { margin: 0 0 8px; color: #506b5d; }
          .sheet { border: 1px solid #dbe7df; border-radius: 18px; padding: 28px; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 24px; margin-top: 24px; }
          .row { padding: 12px 0; border-bottom: 1px solid #edf4ef; }
          .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #7d9588; }
          .value { margin-top: 6px; font-size: 15px; font-weight: 700; }
          .footer { margin-top: 28px; font-size: 12px; color: #6e8679; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <h1>${title}</h1>
          <p>${subtitle}</p>
          <div class="grid">
            ${rows.map((row) => `
              <div class="row">
                <div class="label">${row.label}</div>
                <div class="value">${row.value}</div>
              </div>
            `).join('')}
          </div>
          <div class="footer">${footer}</div>
        </div>
      </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(content)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

const BillingSettingsPanel = ({ variants }) => {
  const {
    company,
    companyRecord,
    fetchServer,
    server,
    subscriptionState,
    refreshSubscriptionState,
    setAlert,
    setAlertState,
    setAlertTimeout,
  } = useContext(ContextProvider)

  const [snapshot, setSnapshot] = useState({
    currentStatus: null,
    orders: [],
    payments: [],
    companyProfile: null,
    plan: null,
  })
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [disablePaystackPayment, setDisablePaystackPayment] = useState(false)

  const currentStatus = snapshot.currentStatus || subscriptionState || null

  const loadTenantSnapshot = async (showSpinner = true) => {
    if (!company || !companyRecord?.emailid) return
    if (showSpinner) setIsSnapshotLoading(true)
    try {
      const response = await fetchServer('POST', {}, 'billing/getTenantSubscriptionSnapshot', server)
      if (response.err || !response.ok) {
        throw new Error(response.mess || 'Unable to load subscription snapshot.')
      }
      const nextSnapshot = {
        currentStatus: response.currentStatus || null,
        orders: response.orders || [],
        payments: response.payments || [],
        companyProfile: response.companyProfile || null,
        plan: response.plan || null,
      }
      setSnapshot(nextSnapshot)
      setDisablePaystackPayment(!!response.disablePaystackPayment)
      if (response.currentStatus && typeof refreshSubscriptionState === 'function') {
        refreshSubscriptionState(response.currentStatus)
      }
    } catch (error) {
      setAlertState('error')
      setAlert(error.message || 'Unable to load subscription snapshot.')
      setAlertTimeout(3000)
    } finally {
      if (showSpinner) setIsSnapshotLoading(false)
    }
  }

  useEffect(() => {
    loadTenantSnapshot()
  }, [company, companyRecord?.emailid])

  const handleSubscribe = async () => {
    if (disablePaystackPayment) {
      const msg = 'Paystack automated checkout is temporarily suspended. Contact the Enterprise Compute Central Admin for Manual activation of subscription after proof payment is sent to them.'
      setAlertState('error')
      setAlert(msg)
      setAlertTimeout(7000)
      return
    }
    setIsCheckoutLoading(true)
    try {
      const response = await fetchServer('POST', { months: 1 }, 'billing/initializeTenantSubscription', server)
      if (response.err || !response.ok || !response.authorizationUrl) {
        throw new Error(response.mess || 'Unable to initialize Paystack checkout.')
      }
      window.location.href = response.authorizationUrl
    } catch (error) {
      setAlertState('error')
      setAlert(error.message || 'Unable to initialize Paystack checkout.')
      setAlertTimeout(3500)
      setIsCheckoutLoading(false)
    }
  }

  const printOrder = (order) => {
    printHtmlDocument({
      title: `Subscription Order ${order?.orderNumber || ''}`.trim(),
      subtitle: `${order?.companyName || company || 'Company'} subscription order`,
      rows: [
        { label: 'Order Number', value: order?.orderNumber || '--' },
        { label: 'Invoice Number', value: order?.invoiceNumber || '--' },
        { label: 'Reference', value: order?.reference || '--' },
        { label: 'Plan', value: order?.planName || '--' },
        { label: 'Amount', value: formatMoney(order?.amountNaira) },
        { label: 'Status', value: formatStatus(order?.status) },
        { label: 'Created', value: formatDateTime(order?.createdAt) },
        { label: 'Company', value: order?.companyName || '--' },
      ],
      footer: 'Generated from Enterprise Compute settings billing panel.',
    })
  }

  const printInvoice = (payment) => {
    printHtmlDocument({
      title: `Invoice ${payment?.invoiceNumber || ''}`.trim(),
      subtitle: `${payment?.companyName || company || 'Company'} subscription invoice`,
      rows: [
        { label: 'Invoice Number', value: payment?.invoiceNumber || '--' },
        { label: 'Order Number', value: payment?.orderNumber || '--' },
        { label: 'Reference', value: payment?.reference || '--' },
        { label: 'Plan', value: payment?.planName || '--' },
        { label: 'Amount Paid', value: formatMoney(payment?.amountNaira) },
        { label: 'Payment Method', value: payment?.paymentMethod || '--' },
        { label: 'Channel', value: payment?.channel || '--' },
        { label: 'Paid At', value: formatDateTime(payment?.paidAt || payment?.createdAt) },
      ],
      footer: 'Generated from Enterprise Compute settings billing panel.',
    })
  }

  return (
    <motion.div
      className='billing-settings'
      initial='initial'
      animate='animate'
      exit='exit'
      variants={variants}
      transition={{ duration: 0.4 }}
    >
      <div className='settings-billing-shell'>
        <div className='settings-billing-hero'>
          <div>
            <div className='settings-billing-kicker'>Billing & subscription control</div>
            <h2>Keep this workspace active without leaving settings</h2>
            <p className='settings-billing-copy'>
              Review your current plan, renew directly with Paystack, and keep a clean record of this tenant's subscription orders and invoices.
            </p>
          </div>
          <div className='settings-billing-actions'>
            <button className='savebtn' onClick={handleSubscribe} disabled={isCheckoutLoading}>
              {isCheckoutLoading ? 'Opening Paystack...' : (currentStatus?.trialActive ? 'Upgrade Before Trial Ends' : 'Subscribe with Paystack')}
            </button>
            <button className='settings-billing-secondary-btn' onClick={() => loadTenantSnapshot()} disabled={isSnapshotLoading}>
              {isSnapshotLoading ? 'Refreshing...' : 'Refresh Snapshot'}
            </button>
          </div>
        </div>

        <div className='settings-billing-summary-grid'>
          <div className='settings-billing-summary-card'>
            <span className='settings-billing-label'>Current status</span>
            <strong>{formatStatus(currentStatus?.statusLabel || currentStatus?.computedStatus)}</strong>
            <p>
              {currentStatus?.trialActive
                ? `Free trial active. ${currentStatus?.trialDaysRemaining ?? '--'} day(s) remaining before payment is required.`
                : (currentStatus?.isSuspended
                  ? 'This workspace is currently suspended until subscription issues are cleared.'
                  : 'This workspace is presently available for use.')}
            </p>
          </div>
          <div className='settings-billing-summary-card'>
            <span className='settings-billing-label'>Plan</span>
            <strong>{snapshot.plan?.name || 'Standard Monthly'}</strong>
            <p>{formatMoney(snapshot.plan?.amountNaira || 92000)} / {snapshot.plan?.interval || 'monthly'}</p>
            <p style={{ marginTop: 6 }}>
              Paystack mode: <strong>{String(snapshot.plan?.paystackMode || 'test').toUpperCase()}</strong>
            </p>
          </div>
          <div className='settings-billing-summary-card'>
            <span className='settings-billing-label'>Next expiry</span>
            <strong>{formatDate(currentStatus?.trialActive ? currentStatus?.trialExpiresAt : currentStatus?.expiresAt)}</strong>
            <p>
              {currentStatus?.trialActive
                ? `${currentStatus?.trialDaysRemaining ?? '--'} day(s) left on free trial.`
                : (currentStatus?.daysToExpiry === null || currentStatus?.daysToExpiry === undefined
                  ? 'No active billing window yet.'
                  : `${currentStatus.daysToExpiry} day(s) remaining.`)}
            </p>
          </div>
          <div className='settings-billing-summary-card'>
            <span className='settings-billing-label'>Latest invoice</span>
            <strong>{currentStatus?.lastInvoiceNumber || '--'}</strong>
            <p>{currentStatus?.lastPaymentAt ? `Paid ${formatDate(currentStatus.lastPaymentAt)}` : 'No subscription payment recorded yet.'}</p>
          </div>
        </div>

        <div className='settings-billing-panels'>
          <section className='settings-billing-panel'>
            <div className='settings-billing-panel-header'>
              <div>
                <h3>Tenant subscription orders</h3>
                <p>Every renewal request from this workspace is logged here with its invoice and checkout reference.</p>
              </div>
            </div>
            <div className='settings-billing-table-wrap'>
              <table className='settings-billing-table'>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.orders.length ? snapshot.orders.map((order) => (
                    <tr key={order.reference}>
                      <td>
                        <strong>{order.orderNumber || '--'}</strong>
                        <span>{order.invoiceNumber || '--'}</span>
                      </td>
                      <td>{order.reference || '--'}</td>
                      <td><span className={`settings-billing-badge ${String(order.status || '').toLowerCase()}`}>{formatStatus(order.status)}</span></td>
                      <td>{formatDateTime(order.createdAt)}</td>
                      <td>{formatMoney(order.amountNaira)}</td>
                      <td><button className='settings-billing-inline-btn' onClick={() => printOrder(order)}>Print</button></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan='6' className='settings-billing-empty'>No subscription orders yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className='settings-billing-panel'>
            <div className='settings-billing-panel-header'>
              <div>
                <h3>Tenant payments & invoices</h3>
                <p>Successful subscription payments create invoice-ready records for this company database.</p>
              </div>
            </div>
            <div className='settings-billing-table-wrap'>
              <table className='settings-billing-table'>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Method</th>
                    <th>Paid</th>
                    <th>Amount</th>
                    <th>Channel</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.payments.length ? snapshot.payments.map((payment) => (
                    <tr key={payment.reference}>
                      <td>
                        <strong>{payment.invoiceNumber || '--'}</strong>
                        <span>{payment.reference || '--'}</span>
                      </td>
                      <td>{payment.paymentMethod || '--'}</td>
                      <td>{formatDateTime(payment.paidAt || payment.createdAt)}</td>
                      <td>{formatMoney(payment.amountNaira)}</td>
                      <td>{payment.channel || '--'}</td>
                      <td><button className='settings-billing-inline-btn' onClick={() => printInvoice(payment)}>Print</button></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan='6' className='settings-billing-empty'>No subscription payments recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  )
}

export default BillingSettingsPanel
