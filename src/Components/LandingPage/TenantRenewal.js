import './SubPages.css'
import { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'

// Public (no-login) self-service renewal page for a suspended/expired tenant.
// The tenant is resolved server-side from the request's host, exactly like
// every other request in the app — nothing here is client-supplied. See
// `public/tenant/renewal/initialize|verify` in wageserver/UserModule/Billing/billing.js.
const TenantRenewal = () => {
  const { fetchServer, server, storePath } = useContext(ContextProvider)
  const navigate = useNavigate()
  const [status, setStatus] = useState({ loading: true, type: 'info', message: 'Loading workspace status...' })
  const [currentStatus, setCurrentStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    storePath('renew')
    document.title = 'Renew Subscription | Enterprise Compute Central'
  }, [storePath])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const resp = await fetchServer('POST', {}, 'getActivationDetails', server)
      if (cancelled) return
      if (resp?.err || !resp?.currentStatus) {
        setStatus({ loading: false, type: 'error', message: resp?.mess || "Could not load this workspace's billing status." })
        return
      }
      setCurrentStatus(resp.currentStatus)
      setStatus({ loading: false, type: 'info', message: '' })
    }
    load()
    return () => { cancelled = true }
  }, [fetchServer, server])

  const handleRenew = async () => {
    if (submitting) return
    setSubmitting(true)
    setStatus({ loading: false, type: 'info', message: 'Preparing your Paystack checkout...' })
    try {
      const resp = await fetchServer('POST', {}, 'public/tenant/renewal/initialize', server)
      if (resp?.err || !resp?.authorizationUrl) {
        setStatus({ loading: false, type: 'error', message: resp?.error || resp?.mess || 'Could not start the renewal checkout.' })
        setSubmitting(false)
        return
      }
      window.location.href = resp.authorizationUrl
    } catch (err) {
      setStatus({ loading: false, type: 'error', message: 'Network error while starting checkout.' })
      setSubmitting(false)
    }
  }

  const companyName = currentStatus?.companyName || ''
  const planName = currentStatus?.planName || 'Standard'
  const amountNaira = Number(currentStatus?.amountNaira || 92000)
  const statusLabel = String(currentStatus?.statusLabel || 'expired').replace(/_/g, ' ')

  return (
    <div className="ec-landing">
      <section className="sp-hero">
        <div className="sp-hero-inner">
          <div className="ec-hero-kicker">Workspace Renewal</div>
          <h1>Renew your subscription</h1>
          <p>
            {companyName ? `${companyName}'s` : 'Your'} workspace subscription is currently <strong>{statusLabel}</strong>. Renew below to restore access immediately — no login required.
          </p>
        </div>
      </section>

      {status.message && (
        <section className="ec-section" style={{ paddingTop: 0 }}>
          <div className={`sp-status-banner ${status.type || 'info'}`}>
            <strong>{status.type === 'error' ? 'Renewal Issue' : 'Status'}</strong>
            <p>{status.message}</p>
          </div>
        </section>
      )}

      <section className="ec-section" style={{ paddingTop: 0, marginTop: -40 }}>
        <div className="sp-confirm-shell">
          <div className="sp-confirm-card info">
            <div className="sp-confirm-pill-row">
              <span className="sp-confirm-pill">{planName} Plan</span>
              <span className="sp-confirm-pill">₦{amountNaira.toLocaleString()}/month</span>
            </div>

            <div className="sp-confirm-grid">
              <div className="sp-confirm-summary">
                <h2>Restore access to your workspace</h2>
                <p>
                  Renewing reactivates every user's login and unlocks your business data immediately after payment is confirmed. You'll be redirected to Paystack's secure checkout to complete payment.
                </p>
              </div>

              <div className="sp-confirm-actions">
                <div className="sp-input-help">Already have a working login? You can also manage billing from the full settings panel instead.</div>
                <button className="sp-checkout-submit" onClick={handleRenew} disabled={submitting || status.loading}>
                  {submitting ? 'Redirecting to Paystack...' : 'Renew Now'}
                </button>
                <button className="sp-confirm-secondary-btn" onClick={() => navigate('/login')}>
                  Return to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default TenantRenewal
