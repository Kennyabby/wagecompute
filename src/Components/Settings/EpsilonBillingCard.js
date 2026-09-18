import { useContext, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import ContextProvider from '../../Resources/ContextProvider'
import StatCardGrid from '../Shared/ui/StatCardGrid'
import StatCard from '../Shared/ui/StatCard'

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})
const formatMoney = (value) => currencyFormatter.format(Number(value || 0))
const numberFormatter = new Intl.NumberFormat('en-US')
const formatNumber = (value) => numberFormatter.format(Number(value || 0))

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', desc: 'Clear, businesslike language. The default.' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable, still clear and useful.' },
  { value: 'casual', label: 'Casual', desc: 'Relaxed, like a knowledgeable colleague.' },
]

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
  const [tone, setTone] = useState('professional')
  const [isSavingTone, setIsSavingTone] = useState(false)
  // Matches isTenantAdmin in wageserver/UserModule/Billing/billing.js exactly
  // (also POST /billing/epsilon/tone's own check) — without the permissions
  // clause, a user granted admin rights via the 'all' permission rather than
  // status/access:'admin' would see this control disabled even though the
  // server would actually accept their change.
  const isWorkspaceAdmin = companyRecord?.status === 'admin' || companyRecord?.access === 'admin' || companyRecord?.permissions?.includes('all')

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
      setTone(response.epsilonTone || 'professional')
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

  // Tenant-wide default, applies to every user at this workspace — distinct
  // from the per-user "response style" each employee already picks for
  // themselves inside the chat panel itself.
  const handleSetTone = async (nextTone) => {
    if (nextTone === tone || isSavingTone) return
    const previous = tone
    setTone(nextTone)
    setIsSavingTone(true)
    try {
      const response = await fetchServer('POST', { tone: nextTone }, 'billing/epsilon/tone', server)
      if (response.err || !response.ok) throw new Error(response.mess || 'Unable to update Epsilon tone.')
    } catch (error) {
      setTone(previous)
      setAlertState('error')
      setAlert(error.message || 'Unable to update Epsilon tone.')
      setAlertTimeout(4000)
    } finally {
      setIsSavingTone(false)
    }
  }

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

          <StatCardGrid min={220}>
            <StatCard
              label="Seats owned"
              value={seatInfo.epsilonSeats}
              description={`${seatInfo.usedSeats} of ${seatInfo.epsilonSeats || 0} currently granted to employees.`}
            />
            <StatCard
              label="Price per seat"
              value={formatMoney(seatInfo.priceNaira)}
              description="Billed monthly, per seat purchased."
            />
            <StatCard
              label="Token balance remaining"
              value={formatNumber(seatInfo.epsilonTokenBalance)}
              tone={seatInfo.epsilonTokenBalance <= 0 ? 'error' : 'default'}
              description={
                seatInfo.epsilonTokenBalance <= 0
                  ? 'Empty — Epsilon is blocked for this workspace until you purchase more or the platform admin tops it up.'
                  : `Every message uses real tokens from this balance. Purchases add more at ${formatMoney(seatInfo.tokenPriceNaira)} per 1,000 tokens.`
              }
            />
            <StatCard
              label="Consumed to date"
              value={formatNumber(seatInfo.epsilonTokensConsumedTotal)}
              description={`of ${formatNumber(seatInfo.epsilonTokensPurchasedTotal)} tokens ever purchased/granted.`}
            />
          </StatCardGrid>

          <div className='epsilon-tone-section'>
            <div className='epsilon-tone-header'>
              <strong>Epsilon's tone</strong>
              <span>Applies to every conversation across the whole workspace. {isWorkspaceAdmin ? '' : 'Only a workspace admin can change this.'}</span>
            </div>
            <div className='epsilon-tone-options'>
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type='button'
                  className={`epsilon-tone-btn ${tone === opt.value ? 'active' : ''}`}
                  onClick={() => handleSetTone(opt.value)}
                  disabled={!isWorkspaceAdmin || isSavingTone}
                  title={opt.desc}
                >
                  <span className='epsilon-tone-btn-label'>{opt.label}</span>
                  <span className='epsilon-tone-btn-desc'>{opt.desc}</span>
                </button>
              ))}
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
