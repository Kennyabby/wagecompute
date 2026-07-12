import './SubPages.css'
import { useState, useEffect, useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'

const PaymentConfirmPage = () => {
  const { fetchServer, server, storePath } = useContext(ContextProvider)
  const location = useLocation()
  const navigate = useNavigate()
  const [state, setState] = useState({ verifying: false, type: '', message: '', reference: '' })
  const checkout = new URLSearchParams(location.search).get('checkout') || ''
  const isTenantCheckout = checkout === 'tenant-settings'
  const isTenantRenewal = checkout === 'tenant-renewal'

  useEffect(() => {
    storePath('payment-confirm')
    document.title = 'Payment Confirmation | Enterprise Compute Central'
    const params = new URLSearchParams(location.search)
    const reference = params.get('reference') || params.get('trxref') || ''
    const checkout = params.get('checkout') || (params.get('paystack') === 'callback' ? 'public-pricing' : '')
    if (!reference || !checkout) return

    let cancelled = false
    const verify = async () => {
      setState({ verifying: true, type: '', message: 'Verifying payment...', reference })
      try {
        const endpoint = checkout === 'tenant-settings'
          ? 'billing/verifyTenantSubscription'
          : checkout === 'tenant-renewal'
            ? 'public/tenant/renewal/verify'
            : 'public/payments/paystack/verify'
        const response = await fetchServer('GET', { reference }, endpoint, server)
        if (cancelled) return
        if (!response || !response.ok) {
          setState({ verifying: false, type: 'error', message: response?.message || response?.mess || 'Could not verify payment.', reference })
          return
        }
        setState({ verifying: false, type: response.status === 'active' ? 'success' : 'info', message: response.message || 'Verification complete.', reference })
      } catch (err) {
        if (cancelled) return
        setState({ verifying: false, type: 'error', message: err.message || 'Verification failed.', reference })
      }
    }

    verify()
    return () => { cancelled = true }
  }, [location.search, fetchServer, server, storePath])

  return (
    <div className="ec-landing">
      <section className="sp-hero">
        <div className="sp-hero-inner">
          <div className="ec-hero-kicker">Payment Confirmation</div>
          <h1>{state.type === 'success' ? 'Payment confirmed' : state.type === 'error' ? 'Verification still needed' : 'Checking your Paystack payment'}</h1>
          <p>
            {state.message || 'We are checking with Paystack and matching the result to the correct subscription order.'}
          </p>
        </div>
      </section>

      <section className="ec-section" style={{ paddingTop: 0, marginTop: -48 }}>
        <div className="sp-confirm-shell">
          <div className={`sp-confirm-card ${state.type || 'info'}`}>
            <div className="sp-confirm-pill-row">
              <span className="sp-confirm-pill">{isTenantRenewal ? 'Workspace renewal' : isTenantCheckout ? 'Tenant billing checkout' : 'Public pricing checkout'}</span>
              <span className="sp-confirm-pill">{state.verifying ? 'Verification in progress' : (state.type || 'pending')}</span>
            </div>

            <div className="sp-confirm-grid">
              <div className="sp-confirm-summary">
                <h2>{state.type === 'success' ? 'Subscription update completed' : 'Verification summary'}</h2>
                <p>
                  {state.type === 'success'
                    ? 'Your payment has been matched and the subscription records can now be updated cleanly.'
                    : 'If a payment succeeded but this page could not complete the update yet, the platform can still reconcile the order from the backend later.'}
                </p>
                {state.reference ? (
                  <div className="sp-confirm-reference">
                    <span>Transaction reference</span>
                    <strong>{state.reference}</strong>
                  </div>
                ) : null}
              </div>

              <div className="sp-confirm-actions">
                <div className="sp-input-help">
                  {isTenantRenewal
                    ? 'Your workspace should now be reactivated. Please log in to continue.'
                    : isTenantCheckout
                      ? 'Return to tenant settings to review the subscription snapshot, payments, invoices, and current workspace status.'
                      : 'Return to pricing to continue your onboarding path or start a new free trial tenant.'}
                </div>
                <button
                  className="sp-checkout-submit"
                  onClick={() => navigate(isTenantRenewal ? '/login' : isTenantCheckout ? '/settings' : '/pricing')}
                >
                  {isTenantRenewal ? 'Return to Login' : isTenantCheckout ? 'Return to Billing Settings' : 'Back to Pricing'}
                </button>
                {!isTenantCheckout && !isTenantRenewal ? (
                  <button className="sp-confirm-secondary-btn" onClick={() => navigate('/signup')}>
                    Start Free Trial Instead
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PaymentConfirmPage
