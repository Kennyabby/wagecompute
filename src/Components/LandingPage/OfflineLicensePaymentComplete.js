import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import './ErrorPages.css'

// Landing page Paystack redirects back to after an offline-license purchase
// (see buildOfflineCallbackUrl in wageserver/UserModule/OfflineLicense) —
// verifies the reference and shows the license key exactly once. The key is
// also always retrievable afterwards from the license portal login.
const OfflineLicensePaymentComplete = () => {
  const { server } = useContext(ContextProvider)
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking') // checking | success | failed
  const [licenseKey, setLicenseKey] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    document.title = "License Purchase | Enterprise Compute Central"
    const params = new URLSearchParams(window.location.search)
    const reference = params.get('reference') || params.get('trxref')
    if (!reference) {
      setStatus('failed')
      setMessage('No payment reference found.')
      return
    }
    fetch(`${server}/offline-license/paystack/verify?reference=${encodeURIComponent(reference)}`)
      .then(r => r.json())
      .then((data) => {
        if (data.ok && data.licenseKey) {
          setLicenseKey(data.licenseKey)
          setStatus('success')
        } else {
          setStatus('failed')
          setMessage(data.mess || 'Payment could not be confirmed.')
        }
      })
      .catch(() => {
        setStatus('failed')
        setMessage('Network error while confirming payment.')
      })
  }, [server])

  return (
    <div className="error-page">
      <div className="error-container">
        {status === 'checking' && <h1>Confirming your payment...</h1>}
        {status === 'failed' && (
          <>
            <h1>Payment Not Confirmed</h1>
            <p>{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h1>Your Offline License Is Ready</h1>
            <p>Enter this license key in the Enterprise Compute desktop app to activate it. You can also always retrieve it later from the license portal.</p>
            <div className="recovery-card-wrap" style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '2px', margin: '20px 0' }}>
              {licenseKey}
            </div>
          </>
        )}
        <div className="error-actions">
          <button className="btn-back" onClick={() => navigate('/offline-license-portal/login')}>
            Go to License Portal
          </button>
        </div>
      </div>
    </div>
  )
}

export default OfflineLicensePaymentComplete
