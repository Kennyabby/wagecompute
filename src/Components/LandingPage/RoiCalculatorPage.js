/* ============================================================================
   /roi-calculator — interactive payback model.
   ----------------------------------------------------------------------------
   Deliberately unlike most vendor ROI calculators in three ways: nothing is
   gated behind a form, every assumption is adjustable, and the full method is
   printed underneath the result. The defaults in content/compare.js are
   conservative on purpose, so the output tends to understate.
   ========================================================================= */

import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, CTABanner, Container, Grid, Hero, Section,
  Table, Tile, Tiles,
} from './ds/DS'
import { heroImg } from './ds/landingImages'
import { ROI_INPUTS, ROI_ASSUMPTIONS, ROI_DISCLAIMER, ROI_METHOD } from './content/compare'
import './ds/roi.css'

const naira = (value) =>
  `₦${Math.round(value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

const SECTIONS = [
  { id: 'calculator', label: 'Calculator' },
  { id: 'method', label: 'How it is calculated' },
  { id: 'caveats', label: 'What this is not' },
]

const RoiCalculatorPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  const [values, setValues] = useState(() =>
    ROI_INPUTS.reduce((acc, input) => { acc[input.key] = input.value; return acc }, {})
  )
  const [assumptions, setAssumptions] = useState(ROI_ASSUMPTIONS)

  useEffect(() => { storePath('roi-calculator') }, [storePath])

  const result = useMemo(() => {
    const {
      monthlyRevenue, adminHoursWeekly, hourlyCost,
      inventoryValue, shrinkageRate, monthlyLicence,
    } = values

    const adminAnnualCost = adminHoursWeekly * hourlyCost * 52
    const adminSaving = adminAnnualCost * assumptions.adminReductionPct

    const shrinkageAnnual = inventoryValue * (shrinkageRate / 100)
    const shrinkageSaving = shrinkageAnnual * assumptions.shrinkageReductionPct

    const dailyRevenue = (monthlyRevenue * 12) / 365
    const outageSaving =
      dailyRevenue * assumptions.outageDaysPerYear * assumptions.outageRevenueRecoveredPct

    const grossBenefit = adminSaving + shrinkageSaving + outageSaving
    const annualCost = monthlyLicence * 12
    const net = grossBenefit - annualCost
    const roiPct = annualCost > 0 ? (net / annualCost) * 100 : null
    const paybackMonths =
      grossBenefit > 0 ? (annualCost / grossBenefit) * 12 : null

    return {
      adminAnnualCost, adminSaving,
      shrinkageAnnual, shrinkageSaving,
      outageSaving, grossBenefit,
      annualCost, net, roiPct, paybackMonths,
    }
  }, [values, assumptions])

  const setValue = (key, raw) =>
    setValues((previous) => ({ ...previous, [key]: Number(raw) }))

  const reset = () => {
    setValues(ROI_INPUTS.reduce((acc, input) => { acc[input.key] = input.value; return acc }, {}))
    setAssumptions(ROI_ASSUMPTIONS)
  }

  const positive = result.net > 0

  return (
    <PageShell
      title="ROI calculator | Enterprise Compute"
      description="Model licence cost against admin time recovered, stock shrinkage avoided and revenue retained through outages. Every assumption adjustable, full method shown."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'ROI calculator' }]}
      subnavTitle="ROI calculator"
      sections={SECTIONS}
      subnavCta={{ label: 'Get a real price', to: '/pricing' }}
    >
      <Hero
        eyebrow="Business case"
        title="Model the payback before you commit to anything"
        lede="No form, no email gate, no optimistic defaults. Change every number to your own, and read the method underneath so you can decide whether you believe it."
        image={heroImg('dataAnalytics')}
      >
        <ButtonRow>
          <Button variant="primary" onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}>
            Start modelling
          </Button>
          <Button variant="secondary" to="/pricing" navigate={navigate}>Get your real licence cost</Button>
        </ButtonRow>
      </Hero>

      {/* ------------------------------------------------------ calculator -- */}
      <Section id="calculator" variant="alt" eyebrow="Calculator" title="Your figures">
        <div className="roi-layout">
          <div className="roi-inputs">
            <p className="ds-body sm">
              Everything below is editable. If a line does not apply to you, say you hold no
              stock or your connectivity is reliable, set it to zero and it drops out of
              the result.
            </p>

            {ROI_INPUTS.map((input) => (
              <div className="roi-field" key={input.key}>
                <label className="roi-field-head" htmlFor={`roi-${input.key}`}>
                  <span>{input.label}</span>
                  <strong>
                    {input.unit === 'NGN' ? naira(values[input.key]) : `${values[input.key]} ${input.unit}`}
                  </strong>
                </label>
                <input
                  id={`roi-${input.key}`}
                  className="roi-slider"
                  type="range"
                  min={input.min}
                  max={input.max}
                  step={input.step}
                  value={values[input.key]}
                  onChange={(event) => setValue(input.key, event.target.value)}
                />
                <p className="roi-field-help">{input.help}</p>
              </div>
            ))}

            <details className="roi-assumptions">
              <summary>Adjust the assumptions themselves</summary>
              <div className="roi-assumption-grid">
                <label className="ds-field">
                  <span>Reduction in reconciliation time</span>
                  <input
                    type="number" min="0" max="100" step="5"
                    value={Math.round(assumptions.adminReductionPct * 100)}
                    onChange={(e) => setAssumptions((a) => ({ ...a, adminReductionPct: Number(e.target.value) / 100 }))}
                  />
                  <span className="ds-field-hint">Per cent</span>
                </label>
                <label className="ds-field">
                  <span>Reduction in stock shrinkage</span>
                  <input
                    type="number" min="0" max="100" step="5"
                    value={Math.round(assumptions.shrinkageReductionPct * 100)}
                    onChange={(e) => setAssumptions((a) => ({ ...a, shrinkageReductionPct: Number(e.target.value) / 100 }))}
                  />
                  <span className="ds-field-hint">Per cent</span>
                </label>
                <label className="ds-field">
                  <span>Outage days a year</span>
                  <input
                    type="number" min="0" max="120" step="1"
                    value={assumptions.outageDaysPerYear}
                    onChange={(e) => setAssumptions((a) => ({ ...a, outageDaysPerYear: Number(e.target.value) }))}
                  />
                  <span className="ds-field-hint">Days trading would otherwise stop</span>
                </label>
                <label className="ds-field">
                  <span>Revenue recovered on an outage day</span>
                  <input
                    type="number" min="0" max="100" step="5"
                    value={Math.round(assumptions.outageRevenueRecoveredPct * 100)}
                    onChange={(e) => setAssumptions((a) => ({ ...a, outageRevenueRecoveredPct: Number(e.target.value) / 100 }))}
                  />
                  <span className="ds-field-hint">Per cent</span>
                </label>
              </div>
            </details>

            <ButtonRow>
              <Button variant="tertiary" onClick={reset}>Reset to defaults</Button>
            </ButtonRow>
          </div>

          <div className="roi-result">
            <div className="roi-result-card" aria-live="polite">
              <span className="ds-card-eyebrow">Estimated first-year net benefit</span>
              <p className={`roi-headline${positive ? '' : ' negative'}`}>
                {positive ? naira(result.net) : `-${naira(Math.abs(result.net))}`}
              </p>
              <p className="ds-body sm">
                {positive
                  ? 'Gross benefit above, minus twelve months of platform cost.'
                  : 'On these inputs the platform does not pay for itself in year one. That is a real answer, and we would rather you saw it here than after signing.'}
              </p>

              <div className="roi-breakdown">
                <div>
                  <span>Admin time recovered</span>
                  <strong>{naira(result.adminSaving)}</strong>
                </div>
                <div>
                  <span>Shrinkage avoided</span>
                  <strong>{naira(result.shrinkageSaving)}</strong>
                </div>
                <div>
                  <span>Revenue retained in outages</span>
                  <strong>{naira(result.outageSaving)}</strong>
                </div>
                <div className="total">
                  <span>Gross annual benefit</span>
                  <strong>{naira(result.grossBenefit)}</strong>
                </div>
                <div>
                  <span>Platform cost (12 months)</span>
                  <strong>-{naira(result.annualCost)}</strong>
                </div>
              </div>

              <div className="roi-metrics">
                <div>
                  <strong>{result.roiPct === null ? 'n/a' : `${Math.round(result.roiPct)}%`}</strong>
                  <span>First-year return on licence cost</span>
                </div>
                <div>
                  <strong>
                    {result.paybackMonths === null
                      ? 'n/a'
                      : result.paybackMonths > 24
                        ? '24+ mo'
                        : `${result.paybackMonths.toFixed(1)} mo`}
                  </strong>
                  <span>Payback period</span>
                </div>
              </div>

              <ButtonRow>
                <Button variant="primary" to="/pricing" navigate={navigate}>Get your real licence cost</Button>
                <Button variant="secondary" to="/contact" navigate={navigate}>Review this with us</Button>
              </ButtonRow>
            </div>

            <p className="ds-body sm roi-disclaimer">{ROI_DISCLAIMER}</p>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------- method -- */}
      <Section
        id="method"
        eyebrow="How it is calculated"
        title="The whole model, in four lines"
        subtitle="Printed so you can check it rather than trust it. If a line looks wrong for your business, change the inputs or the assumptions above."
        split
      >
        <Tiles cols={4}>
          {ROI_METHOD.map((item) => (
            <Tile key={item.title} title={item.title} text={item.text} />
          ))}
        </Tiles>

        <div style={{ marginTop: 40 }}>
          <Table
            head={['Line', 'Formula', 'Your figure']}
            rows={[
              [
                'Admin time recovered',
                'weekly hours × hourly cost × 52 × reduction %',
                naira(result.adminSaving),
              ],
              [
                'Shrinkage avoided',
                'inventory value × shrinkage % × reduction %',
                naira(result.shrinkageSaving),
              ],
              [
                'Revenue retained in outages',
                '(annual revenue ÷ 365) × outage days × recovered %',
                naira(result.outageSaving),
              ],
              [
                'Platform cost',
                'monthly cost × 12',
                `-${naira(result.annualCost)}`,
              ],
              [
                'Net first-year benefit',
                'gross benefit − platform cost',
                naira(result.net),
              ],
            ]}
            highlightCol={2}
          />
        </div>
      </Section>

      {/* --------------------------------------------------------- caveats -- */}
      <Section id="caveats" variant="cream">
        <Container width="narrow">
          <span className="ds-eyebrow">What this is not</span>
          <h2 className="ds-h2">Three honest caveats</h2>
          <Grid cols={1} animate={false}>
            <div className="ds-stack">
              <div>
                <h3 className="ds-h4">These are assumptions, not measurements</h3>
                <p className="ds-body">
                  The reduction percentages are planning figures, not results aggregated
                  from a customer base. We have deliberately set them low, but low and
                  invented is still invented. Treat the output as a structured way of
                  thinking about the decision rather than as evidence.
                </p>
              </div>
              <div>
                <h3 className="ds-h4">The savings require you to actually change how you work</h3>
                <p className="ds-body">
                  Attributed movements make shrinkage investigable; they do not
                  investigate it. Session-based cash handling makes variance visible; a
                  manager still has to have the conversation. The software removes the
                  excuse, not the work.
                </p>
              </div>
              <div>
                <h3 className="ds-h4">The licence figure here is a guess until you price it</h3>
                <p className="ds-body">
                  Pricing is per module, so the real number depends entirely on which
                  modules you enable. Build it on the pricing page and bring the actual
                  figure back here.
                </p>
              </div>
            </div>
          </Grid>
          <ButtonRow>
            <Button variant="secondary" to="/pricing" navigate={navigate}>Build your plan</Button>
            <Button variant="tertiary" to="/why-enterprise-compute" navigate={navigate}>Read the comparisons</Button>
          </ButtonRow>
        </Container>
      </Section>

      <CTABanner
        eyebrow="Get started"
        title="Or skip the model and just try it"
        text="Fourteen days with every module unlocked costs nothing and produces better evidence than any calculator."
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/contact" navigate={navigate}>Talk it through with us</Button>
      </CTABanner>
    </PageShell>
  )
}

export default RoiCalculatorPage
