import { useContext, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import ContextProvider from '../../Resources/ContextProvider'

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})
const formatMoney = (value) => currencyFormatter.format(Number(value || 0))
const numberFormatter = new Intl.NumberFormat('en-US')
const formatNumber = (value) => numberFormatter.format(Number(value || 0))

// Deliberately its own dedicated card/checkout — NOT a row inside
// BillingSettingsPanel's general "Add modules" grid. Epsilon is a per-seat
// paid add-on, priced and purchased completely differently from every other
// (flat, per-tenant) module, and the confirmed design keeps it visually and
// functionally separate rather than folded into that grid.
const EpsilonBillingCard = ({ variants }) => {
  const {
    company,
    companyRecord,
    fetchServer,
    server,
    setAlert,
    setAlertState,
    setAlertTimeout,
  } = useContext(ContextProvider)

  const [seatInfo, setSeatInfo] = useState({
    epsilonSeats: 0,
    usedSeats: 0,
    priceNaira: 0,
    epsilonTokenBalance: 0,
    epsilonTokensPurchasedTotal: 0,
    epsilonTokensConsumedTotal: 0,
    tokenPriceNaira: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [seatsToBuy, setSeatsToBuy] = useState(1)
  const [months, setMonths] = useState(1)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)

  const loadSeatInfo = async () => {
    if (!company || !companyRecord?.emailid) return
    setIsLoading(true)
    try {
      const response = await fetchServer('GET', {}, 'billing/epsilon/seat-info', server)
      if (response.err || !response.ok) throw new Error(response.mess || 'Unable to load Epsilon seat info.')
      setSeatInfo({
        epsilonSeats: Number(response.epsilonSeats || 0),
        usedSeats: Number(response.usedSeats || 0),
        priceNaira: Number(response.priceNaira || 0),
        epsilonTokenBalance: Number(response.epsilonTokenBalance || 0),
        epsilonTokensPurchasedTotal: Number(response.epsilonTokensPurchasedTotal || 0),
        epsilonTokensConsumedTotal: Number(response.epsilonTokensConsumedTotal || 0),
        tokenPriceNaira: Number(response.tokenPriceNaira || 0),
      })
    } catch (error) {
      // Non-fatal — the card just shows zeroes/loading state; other billing
      // panels on this page already surface a load failure of their own.
      console.error('Failed to load Epsilon seat info', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSeatInfo()
  }, [company, companyRecord?.emailid])

  const estimatedTotalNaira = seatInfo.priceNaira * Math.max(1, seatsToBuy) * Math.max(1, months)
  // Every Naira this purchase pays also funds the token wallet, at the same
  // blended rate a central admin sets — see the token-usage plan. Purely an
  // estimate for display; the server computes the real figure at payment time.
  const estimatedTokensGranted = seatInfo.tokenPriceNaira > 0
    ? Math.floor((estimatedTotalNaira / seatInfo.tokenPriceNaira) * 1000)
    : 0

  const handlePurchaseSeats = async () => {
    if (!seatInfo.priceNaira) {
      setAlertState('error')
      setAlert('Epsilon AI pricing has not been configured yet. Contact support.')
      setAlertTimeout(4000)
      return
    }
    setIsCheckoutLoading(true)
    try {
      const response = await fetchServer('POST', { seats: seatsToBuy, months }, 'billing/epsilon/purchase-seats', server)
      if (response.err || !response.ok || !response.authorizationUrl) {
        throw new Error(response.mess || 'Unable to initialize Epsilon seat checkout.')
      }
      window.location.href = response.authorizationUrl
    } catch (error) {
      setAlertState('error')
      setAlert(error.message || 'Unable to initialize Epsilon seat checkout.')
      setAlertTimeout(4000)
      setIsCheckoutLoading(false)
    }
  }

  return (
    <motion.div
      className='billing-settings epsilon-billing-card'
      initial='initial'
      animate='animate'
      exit='exit'
      variants={variants}
      transition={{ duration: 0.4 }}
    >
      <div className='settings-billing-shell'>
        <section className='settings-billing-panel epsilon-billing-panel'>
          <div className='settings-billing-panel-header'>
            <div>
              <span className='epsilon-billing-badge'>Paid add-on · billed per seat</span>
              <h3>Epsilon AI Assistant</h3>
              <p>
                Epsilon is never included with any plan or free trial — every workspace pays for it separately,
                per employee given access. You (as the purchasing admin) are automatically granted one of the
                seats you buy — log out and back in for it to appear. Grant the rest to specific employees from
                Settings &gt; Team Access.
              </p>
            </div>
          </div>

          <div className='settings-billing-summary-grid'>
            <div className='settings-billing-summary-card'>
              <span className='settings-billing-label'>Seats owned</span>
              <strong>{seatInfo.epsilonSeats}</strong>
              <p>{seatInfo.usedSeats} of {seatInfo.epsilonSeats || 0} currently granted to employees.</p>
            </div>
            <div className='settings-billing-summary-card'>
              <span className='settings-billing-label'>Price per seat</span>
              <strong>{formatMoney(seatInfo.priceNaira)}</strong>
              <p>Billed monthly, per seat purchased.</p>
            </div>
            <div className={`settings-billing-summary-card ${seatInfo.epsilonTokenBalance <= 0 ? 'epsilon-balance-empty' : ''}`}>
              <span className='settings-billing-label'>Token balance remaining</span>
              <strong>{formatNumber(seatInfo.epsilonTokenBalance)}</strong>
              <p>
                {seatInfo.epsilonTokenBalance <= 0
                  ? 'Empty — Epsilon is blocked for this workspace until you purchase more or the platform admin tops it up.'
                  : `Every message uses real tokens from this balance. Purchases add more at ${formatMoney(seatInfo.tokenPriceNaira)} per 1,000 tokens.`}
              </p>
            </div>
            <div className='settings-billing-summary-card'>
              <span className='settings-billing-label'>Consumed to date</span>
              <strong>{formatNumber(seatInfo.epsilonTokensConsumedTotal)}</strong>
              <p>of {formatNumber(seatInfo.epsilonTokensPurchasedTotal)} tokens ever purchased/granted.</p>
            </div>
          </div>

          <div className='epsilon-billing-purchase-row'>
            <label className='epsilon-billing-field'>
              <span>Seats to purchase</span>
              <input
                type='number'
                min='1'
                max='500'
                value={seatsToBuy}
                onChange={(e) => setSeatsToBuy(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              />
            </label>
            <label className='epsilon-billing-field'>
              <span>Months to prepay</span>
              <select value={months} onChange={(e) => setMonths(Math.max(1, Math.floor(Number(e.target.value) || 1)))}>
                <option value={1}>1 month</option>
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months (yearly)</option>
              </select>
              {estimatedTokensGranted > 0 && (
                <span className='epsilon-billing-token-estimate'>adds ≈ {formatNumber(estimatedTokensGranted)} tokens</span>
              )}
            </label>
            <div className='epsilon-billing-total'>
              <span className='settings-billing-label'>Total due now</span>
              <strong>{formatMoney(estimatedTotalNaira)}</strong>
            </div>
            <button className='savebtn' onClick={handlePurchaseSeats} disabled={isCheckoutLoading || isLoading}>
              {isCheckoutLoading ? 'Opening Paystack...' : 'Purchase Seats'}
            </button>
          </div>
        </section>
      </div>
    </motion.div>
  )
}

export default EpsilonBillingCard
