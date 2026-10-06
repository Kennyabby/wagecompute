/* ============================================================================
   /why-enterprise-compute, differentiators and category comparisons.
   ----------------------------------------------------------------------------
   Comparisons are against categories of alternative rather than named
   vendors, and each one leads with where that alternative is genuinely
   better. See the rationale at the top of content/compare.js.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, Checklist, Container, FastFacts,
  FiftyFifty, Grid, Hero, Section, Table,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { DIFFERENTIATORS, COMPARISONS } from './content/compare'

const WhyPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => { storePath('why') }, [storePath])

  const sections = [
    { id: 'differences', label: 'What is different' },
    ...COMPARISONS.map((comparison) => ({ id: comparison.id, label: comparison.name })),
  ]

  return (
    <PageShell
      title="Why Enterprise Compute | Enterprise Compute"
      description="What is architecturally different, and honest comparisons against spreadsheets, separate point tools, legacy on-premise ERP and per-seat cloud suites."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Why Enterprise Compute' }]}
      subnavTitle="Why us"
      sections={sections}
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        eyebrow="Why Enterprise Compute"
        title="Six decisions that cannot be retrofitted"
        lede="Most of what separates business systems is not features. It is architecture, decided early and impossible to change later. These are ours, and the places where another approach would serve you better."
        image={heroImg('executiveMeeting')}
      >
        <ButtonRow>
          <Button variant="primary" to="/signup" navigate={navigate}>Start a free trial</Button>
          <Button variant="secondary" to="/roi-calculator" navigate={navigate}>Model the payback</Button>
        </ButtonRow>
      </Hero>

      {/* ------------------------------------------------- differentiators -- */}
      <Section
        id="differences"
        eyebrow="What is different"
        title="Architecture, not feature count"
        subtitle="Any product can add a report. None of them can add a ledger that was written as the business traded if the system was not built that way."
        rail
        split
      >
        <Grid cols={3}>
          {DIFFERENTIATORS.map((item) => (
            <Card
              key={item.id}
              image={img(item.image, 'card')}
              title={item.title}
              text={item.text}
            >
              <p className="ds-card-text ds-note quiet flush">
                <strong>How:</strong> {item.proof}
              </p>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section variant="deep" tight>
        <FastFacts
          cols={4}
          items={[
            { value: 'Unlimited', label: 'Users on every plan, with no per-seat charge ever' },
            { value: '6', label: 'Core modules free permanently' },
            { value: 'Offline', label: 'Selling continues through a network outage' },
            { value: 'Every', label: 'Figure traceable to its source document' },
          ]}
        />
      </Section>

      {/* ----------------------------------------------------- comparisons -- */}
      {COMPARISONS.map((comparison, index) => (
        <Section
          key={comparison.id}
          id={comparison.id}
          variant={index % 2 === 1 ? 'alt' : undefined}
          eyebrow={`Compared with ${comparison.name.toLowerCase()}`}
          title={comparison.headline}
          subtitle={comparison.lede}
          rail
        split
        >
          <Grid cols={2}>
            <div className="ds-stack md">
              <div className="ds-callout gold">
                <span className="ds-card-eyebrow">Where {comparison.name.toLowerCase()} wins</span>
                <p className="ds-body ds-mb-0 ds-mt-2">{comparison.fairPoint}</p>
              </div>
              <div className="ds-group">
                <div className="ds-group-head">
                  <h3 className="ds-h4">Where it stops working</h3>
                </div>
                <Checklist items={comparison.breakingPoints} className="ds-mb-0" />
              </div>
            </div>
            <div className="ds-fifty-visual ratio-43">
              <img alt="" {...img(comparison.image, 'fifty')} />
            </div>
          </Grid>

          <div>
            <Table
              head={['', comparison.name, 'Enterprise Compute']}
              rows={comparison.rows}
              highlightCol={2}
            />
          </div>
        </Section>
      ))}

      {/* ------------------------------------------------------ fairness --- */}
      <Section variant="cream">
        <Container width="narrow">
          <span className="ds-eyebrow">About these comparisons</span>
          <h2 className="ds-h2">Why we do not name competitors</h2>
          <p className="ds-lede">
            Named-vendor comparison tables age badly, are frequently wrong in detail, and
            in several markets create real exposure if a claim cannot be substantiated.
          </p>
          <p className="ds-body">
            Comparing against categories says the same useful thing to a buyer without
            asserting facts about a product we do not control and cannot keep current. If
            you are evaluating us against a specific product, ask us directly. We will
            give you a straight read on where it is stronger, and we would rather you
            picked the right system than picked ours.
          </p>
          <ButtonRow>
            <Button variant="secondary" to="/contact" navigate={navigate}>Ask us about a specific product</Button>
            <Button variant="tertiary" to="/trust-center" navigate={navigate}>Our certification posture</Button>
          </ButtonRow>
        </Container>
      </Section>

      <Section
        eyebrow="Decide with numbers"
        title="Put it against your own figures"
        subtitle="The comparisons above are structural. The business case is arithmetic, and it is better done with your inputs than ours."
        rail
        split
      >
        <FiftyFifty
          eyebrow="ROI calculator"
          title="Every assumption visible and editable"
          image={img('dataDashboard', 'fifty')}
          reversed
        >
          <p className="ds-body">
            Set licence cost against admin time recovered, shrinkage avoided and revenue
            retained through outages. The defaults are deliberately conservative and the
            full method is shown underneath, so you can argue with it rather than
            take it on trust.
          </p>
          <ButtonRow>
            <Button variant="primary" to="/roi-calculator" navigate={navigate}>Open the calculator</Button>
            <Button variant="tertiary" to="/pricing" navigate={navigate}>Get your real licence cost first</Button>
          </ButtonRow>
        </FiftyFifty>
      </Section>

      <CTABanner
        eyebrow="Get started"
        title="The cheapest way to settle this is to try it"
        text="Fourteen days, every module unlocked, your own catalogue and stock loaded from the templates. Run it in parallel with whatever you use now."
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/contact" navigate={navigate}>Request a demo</Button>
      </CTABanner>
    </PageShell>
  )
}

export default WhyPage
