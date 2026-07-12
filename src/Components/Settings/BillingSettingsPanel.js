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
    refreshCentralCompany,
    enabledModules,
    setAlert,
    setAlertState,
    setAlertTimeout,
  } = useContext(ContextProvider)

  const [moduleCatalog, setModuleCatalog] = useState([])
  const [modulePricing, setModulePricing] = useState({})
  const [selectedNewModules, setSelectedNewModules] = useState([])
  const [isSavingModules, setIsSavingModules] = useState(false)

  const [snapshot, setSnapshot] = useState({
    currentStatus: null,
    orders: [],
    payments: [],
    cards: [],
    companyProfile: null,
    plan: null,
  })
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [disablePaystackPayment, setDisablePaystackPayment] = useState(false)
  const [subscriptionMode, setSubscriptionMode] = useState(true)
  const [paymentChannel, setPaymentChannel] = useState('card')
  const [dedicatedAccount, setDedicatedAccount] = useState(null)
  const [checkoutReference, setCheckoutReference] = useState('')
  const [cardActionLoading, setCardActionLoading] = useState('')

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
        cards: response.cards || [],
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

  useEffect(() => {
    const loadModuleCatalog = async () => {
      try {
        const response = await fetch(`${server}/platform-modules`)
        const data = await response.json()
        if (data.ok) {
          setModuleCatalog(Array.isArray(data.catalog) ? data.catalog : [])
          setModulePricing(data.pricing || {})
        }
      } catch (err) {
        console.error('Failed to load module catalog', err)
      }
    }
    loadModuleCatalog()
  }, [server])

  // Client-side optimistic dependency expansion only — the server
  // (moduleCatalog.js's resolveModuleDependencies) always re-resolves before
  // anything is actually saved/billed.
  const resolveModuleDepsClientSide = (selection) => {
    const selected = new Set(selection)
    let changed = true
    while (changed) {
      changed = false
      moduleCatalog.forEach((app) => {
        if (selected.has(app.key) && app.deps?.length) {
          app.deps.forEach((dep) => {
            if (!selected.has(dep)) { selected.add(dep); changed = true }
          })
        }
      })
    }
    return Array.from(selected)
  }

  const toggleNewModule = (key) => {
    setSelectedNewModules((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return resolveModuleDepsClientSide(Array.from(next))
    })
  }

  const addableModules = moduleCatalog.filter((app) => app.tier === 'standard' && !(enabledModules || []).includes(app.key))
  const currentMonthlyNaira = moduleCatalog
    .filter((app) => app.tier === 'standard' && (enabledModules || []).includes(app.key))
    .reduce((sum, app) => sum + (Number(modulePricing[app.key]) || 0), 0)
  const addedMonthlyNaira = selectedNewModules.reduce((sum, key) => sum + (Number(modulePricing[key]) || 0), 0)

  const handleAddModules = async () => {
    if (!selectedNewModules.length) return
    setIsSavingModules(true)
    try {
      const response = await fetchServer('POST', { modules: selectedNewModules }, 'billing/addTenantModules', server)
      if (response.err || !response.ok) {
        throw new Error(response.mess || 'Unable to add modules.')
      }
      setAlertState('success')
      setAlert('Modules added. They\'re available now — the higher price applies from your next renewal.')
      setAlertTimeout(4000)
      setSelectedNewModules([])
      if (typeof refreshCentralCompany === 'function') await refreshCentralCompany()
    } catch (error) {
      setAlertState('error')
      setAlert(error.message || 'Unable to add modules.')
      setAlertTimeout(4000)
    } finally {
      setIsSavingModules(false)
    }
  }

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
      const payload = { months: 1, subscriptionMode, paymentChannel }
      const response = await fetchServer('POST', payload, 'billing/initializeTenantSubscription', server)
      if (response.err || !response.ok || !response.authorizationUrl) {
        // If a dedicated account was created, backend returns dedicatedAccount without authorizationUrl
        if (response.dedicatedAccount) {
          setDedicatedAccount(response.dedicatedAccount)
          setCheckoutReference(response.reference || '')
          setIsCheckoutLoading(false)
          return
        }
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

  const handleCopy = (text) => {
    try {
      navigator.clipboard.writeText(String(text || ''))
      setAlertState('success')
      setAlert('Copied to clipboard')
      setAlertTimeout(2000)
    } catch (err) {
      setAlertState('error')
      setAlert('Unable to copy')
      setAlertTimeout(2500)
    }
  }

  const handleVerifyNow = async () => {
    if (!checkoutReference) return
    setIsCheckoutLoading(true)
    try {
      const response = await fetchServer('GET', { reference: checkoutReference }, 'billing/verifyTenantSubscription', server)
      if (!response || !response.ok) throw new Error(response?.mess || response?.message || 'Verification failed')
      setAlertState('success')
      setAlert('Verification result: ' + (response.status || 'pending'))
      setAlertTimeout(4000)
      setDedicatedAccount(null)
      await loadTenantSnapshot(false)
    } catch (err) {
      setAlertState('error')
      setAlert(err.message || 'Verification failed')
      setAlertTimeout(4000)
    } finally {
      setIsCheckoutLoading(false)
    }
  }

  const handleCancelAutoRenewal = async () => {
    setCardActionLoading('cancel')
    try {
      const response = await fetchServer('POST', {}, 'billing/requestSubscriptionCancellation', server)
      if (response.err || !response.ok) throw new Error(response.mess || 'Unable to cancel auto-renewal.')
      setAlertState('success')
      setAlert('Subscription auto-renewal has been cancelled.')
      setAlertTimeout(2500)
      await loadTenantSnapshot(false)
    } catch (error) {
      setAlertState('error')
      setAlert(error.message || 'Unable to cancel auto-renewal.')
      setAlertTimeout(4000)
    } finally {
      setCardActionLoading('')
    }
  }

  const handleRemoveCard = async (authorizationCode = '') => {
    setCardActionLoading('remove')
    try {
      const response = await fetchServer('POST', { authorizationCode }, 'billing/requestCardRemoval', server)
      if (response.err || !response.ok) throw new Error(response.mess || 'Unable to remove card.')
      setAlertState('success')
      setAlert('Card removal request has been processed.')
      setAlertTimeout(2500)
      await loadTenantSnapshot(false)
    } catch (error) {
      setAlertState('error')
      setAlert(error.message || 'Unable to remove card.')
      setAlertTimeout(4000)
    } finally {
      setCardActionLoading('')
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
            <div className='settings-billing-payment-methods'>
              <label className='settings-billing-payment-method'>
                <input type='radio' name='paymentChannel' value='card' checked={paymentChannel === 'card'} onChange={() => { setPaymentChannel('card'); }} />
                <span>Pay with Card (store card for auto-renewal)</span>
              </label>
              <label className='settings-billing-payment-method'>
                <input type='radio' name='paymentChannel' value='bank' checked={paymentChannel === 'bank'} onChange={() => { setPaymentChannel('bank'); setSubscriptionMode(false); }} />
                <span>Bank transfer / USSD (no card saved)</span>
              </label>
              <label className='settings-billing-autorenew'>
                <input
                  type='checkbox'
                  checked={subscriptionMode}
                  onChange={(event) => setSubscriptionMode(event.target.checked)}
                  disabled={paymentChannel === 'bank'}
                />
                <span>Save card for monthly auto-renewal</span>
              </label>
            </div>
            {dedicatedAccount ? (
              <div className='settings-billing-transfer-panel'>
                <div className='settings-billing-transfer-inner'>
                  <h4>Transfer {formatMoney(snapshot.plan?.amountNaira || 0)}</h4>
                  <div className='transfer-row'>
                    <div><strong>Bank</strong></div>
                    <div>{dedicatedAccount.bank || dedicatedAccount.bank_name || 'Paystack Bank'}</div>
                  </div>
                  <div className='transfer-row'>
                    <div><strong>Account Number</strong></div>
                    <div>{dedicatedAccount.accountNumber || dedicatedAccount.account_number || ''} <button className='settings-billing-inline-btn' onClick={() => handleCopy(dedicatedAccount.accountNumber || dedicatedAccount.account_number)}>Copy</button></div>
                  </div>
                  <div className='transfer-row'>
                    <div><strong>Account Name</strong></div>
                    <div>{dedicatedAccount.accountName || dedicatedAccount.account_name || ''}</div>
                  </div>
                  <div className='transfer-actions'>
                    <button className='savebtn' onClick={handleVerifyNow} disabled={isCheckoutLoading}>I've paid — Verify now</button>
                    <button className='settings-billing-secondary-btn' onClick={() => { setDedicatedAccount(null); setCheckoutReference('') }}>Close</button>
                  </div>
                </div>
              </div>
            ) : null}
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
              Paystack mode: <strong>{String(snapshot.plan?.paystackMode || 'live').toUpperCase()}</strong>
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

        <section className='settings-billing-panel settings-billing-card-panel'>
          <div className='settings-billing-panel-header'>
            <div>
              <h3>Card subscription</h3>
              <p>Auto-renewal is optional. You can still use normal Paystack checkout or bank transfer for future renewals.</p>
            </div>
            {currentStatus?.subscriptionAutoRenew && (
              <button className='settings-billing-secondary-btn' onClick={handleCancelAutoRenewal} disabled={cardActionLoading === 'cancel'}>
                {cardActionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Auto-renewal'}
              </button>
            )}
          </div>
          <div className='settings-billing-card-list'>
            {snapshot.cards?.length ? snapshot.cards.map((card) => (
              <div className='settings-billing-card-token' key={card.authorizationCode}>
                <div>
                  <strong>{card.bank || 'Paystack Card'} {card.last4 ? `•••• ${card.last4}` : ''}</strong>
                  <span>{card.cardType || 'card'} · {formatStatus(card.status)} · {card.autoRenew ? 'Auto-renewal on' : 'Auto-renewal off'}</span>
                </div>
                <button className='settings-billing-inline-btn' onClick={() => handleRemoveCard(card.authorizationCode)} disabled={cardActionLoading === 'remove'}>
                  {cardActionLoading === 'remove' ? 'Removing...' : 'Remove Card'}
                </button>
              </div>
            )) : (
              <div className='settings-billing-empty'>No reusable Paystack card is linked yet.</div>
            )}
          </div>
        </section>

        <section className='settings-billing-panel settings-billing-modules-panel'>
          <div className='settings-billing-panel-header'>
            <div>
              <h3>Add modules</h3>
              <p>
                Currently enabled: {formatMoney(currentMonthlyNaira)}/month.
                {' '}Adding modules unlocks them right away — the higher price applies starting your next renewal, no extra charge today.
              </p>
            </div>
          </div>
          {addableModules.length ? (
            <>
              <div className='settings-billing-module-grid'>
                {addableModules.map((app) => (
                  <label key={app.key} className='settings-billing-module-chip'>
                    <input
                      type='checkbox'
                      checked={selectedNewModules.includes(app.key)}
                      onChange={() => toggleNewModule(app.key)}
                    />
                    <span className='settings-billing-module-name'>{app.name}</span>
                    <span className='settings-billing-module-price'>{formatMoney(modulePricing[app.key])}/mo</span>
                  </label>
                ))}
              </div>
              <div className='settings-billing-module-footer'>
                <span>
                  {selectedNewModules.length
                    ? `New monthly total: ${formatMoney(currentMonthlyNaira + addedMonthlyNaira)} (+${formatMoney(addedMonthlyNaira)})`
                    : 'Select modules above to see the new monthly total.'}
                </span>
                <button className='savebtn' onClick={handleAddModules} disabled={!selectedNewModules.length || isSavingModules}>
                  {isSavingModules ? 'Adding...' : 'Add Selected Modules'}
                </button>
              </div>
            </>
          ) : (
            <div className='settings-billing-empty'>Every available module is already enabled for this workspace.</div>
          )}
        </section>

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
