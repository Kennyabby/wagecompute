/* ============================================================================
   Home page.
   ----------------------------------------------------------------------------
   Section order mirrors the architecture of sap.com's homepage, which is a
   well-tested sequence for an enterprise platform: immersive hero, trust
   strip, a promoted customer story, a tabbed capability showcase, a
   fast-fact band, the AI story, the platform explanation, industries,
   the product catalogue, the partner ecosystem, a "what's new" resource row,
   and a closing call to action.

   Every tile that SAP fills with a photograph or a product screenshot is
   filled with one here too, see ds/landingImages.js for the registry.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import LoadingPage from '../LoadingPage/LoadingPage'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, Container, FastFacts, FiftyFifty, Grid,
  Hero, LogoStrip, Quote, Section, Showcase, TextLink, Tile, Tiles, Checklist,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { PRODUCT_CATEGORIES, productsInCategory } from './content/products'
import { INDUSTRIES } from './content/industries'
import { RESOURCES, EVENTS } from './content/resources'
import { PARTNER_PROGRAMS } from './content/programs'
import { STORIES, ILLUSTRATIVE, PLACEHOLDER_NOTICE } from './content/customers'
import './ds/ds.css'

const TRUST_NAMES = [
  'Retail Co.', 'TechVenture', 'GreenField', 'Metro Group', 'AlphaServ', 'BlueChip Inc.',
]

const LandingPage = () => {
  const { storePath, showLoading, getViewAccess } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => {
    if (!showLoading) storePath('')
  }, [storePath, showLoading])

  useEffect(() => { getViewAccess() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (showLoading) return <LoadingPage />

  const featuredStory = STORIES[0]
  const sideStories = STORIES.slice(1, 4)
  const featuredResources = RESOURCES.filter((r) => r.featured)
  const nextEvent = EVENTS.find((e) => e.featured)

  /* The capability showcase, the equivalent of SAP's "when every function is
     autonomous" block, but built from this platform's real module groups. */
  const showcase = [
    {
      label: 'Point of sale',
      summary: 'Sell fast, stay accountable, keep trading offline',
      title: 'A till your team can run without thinking about it',
      body: 'Session-based cash handling ties the float, the sales and the closing count to a named operator. Stock moves as each sale completes, and the whole thing keeps working through a network outage.',
      image: img('posTerminal', 'showcase'),
      points: [
        'Opening float, sales and closing count attributed per shift',
        'Real-time stock deduction on every completed sale',
        'Discounting and voids as permissions separate from selling',
        'Tables, takeaway and delivery in one order flow',
      ],
      link: <TextLink to="/products/pos" navigate={navigate}>Explore Point of Sale</TextLink>,
    },
    {
      label: 'Inventory',
      summary: 'A position built from movements you can read',
      title: 'Know exactly what you have, and why',
      body: 'Stock is never a stored number that gets overwritten. It is a running position derived from attributed movements, so a variance against a physical count is a list of transactions rather than a mystery.',
      image: img('inventoryCount', 'showcase'),
      points: [
        'Positions held per item, per location',
        'Transfers tracked in transit, discrepancies raised on receipt',
        'Adjustments require a reason code',
        'Production converts components into finished goods at real cost',
      ],
      link: <TextLink to="/products/inventory" navigate={navigate}>Explore Inventory</TextLink>,
    },
    {
      label: 'Accounting',
      summary: 'A ledger that gets written while you trade',
      title: 'The general ledger is the foundation, not a report',
      body: 'Sales, purchases, stock movement, payroll and expenses each generate real double-entry postings at the moment they happen. By the time anyone asks for a trial balance, it already exists.',
      image: img('accountantDesk', 'showcase'),
      points: [
        'Chart of accounts you design, mapped to operations once',
        'Incremental period closings that compute forward from a snapshot',
        'Drill from any statement figure to its source document',
        'Corrections are reversing entries, never deletions',
      ],
      link: <TextLink to="/products/journals" navigate={navigate}>Explore the accounting engine</TextLink>,
    },
    {
      label: 'People & payroll',
      summary: 'Approved hours straight into the pay run',
      title: 'Payroll that reads attendance directly',
      body: 'Hours are captured, reviewed and approved by a supervisor, and the pay run reads them. No export step, no second spreadsheet, and no payday argument about who worked which Saturday.',
      image: img('budgetPlanning', 'showcase'),
      points: [
        'Statutory and custom deductions applied consistently',
        'Salary advances with the outstanding balance tracked for you',
        'Itemised payslips every run',
        'Gross cost, liabilities and net pay posted to the ledger',
      ],
      link: <TextLink to="/products/payroll" navigate={navigate}>Explore Payroll</TextLink>,
    },
    {
      label: 'Sales & delivery',
      summary: 'Quote to cash, and cash back off the road',
      title: 'Every order followed through to the money',
      body: 'A quote becomes an order, an invoice, a dispatch and a receipt, each step linked to the last. Cash collected on delivery is reconciled per rider, per run.',
      image: img('deliveryDriver', 'showcase'),
      points: [
        'Credit limits enforced at the point of order',
        'Proof of delivery captured at handover',
        'Goods in transit stay visible the whole time they are out',
        'Receivables and ageing per customer, kept in step with the ledger',
      ],
      link: <TextLink to="/products/sales" navigate={navigate}>Explore Sales</TextLink>,
    },
    {
      label: 'Reporting',
      summary: 'Statements you can trace to their cause',
      title: 'Trial balance, P&L and balance sheet, from the actual ledger',
      body: 'Every figure opens into the entries behind it, and from there into the sale, receipt or pay run that produced them. A report that cannot be traced is an opinion.',
      image: img('financialAnalysis', 'showcase'),
      points: [
        'Statutory statements plus management reporting by branch and department',
        'Closed periods locked to their signed-off figures',
        'Export to spreadsheet and PDF for external advisers',
        'Scoped read-only access for your accountant',
      ],
      link: <TextLink to="/products/reports" navigate={navigate}>Explore Reports</TextLink>,
    },
    {
      label: 'Epsilon AI',
      summary: 'An assistant that reads your real records',
      title: 'Ask why the number is what it is',
      body: 'Epsilon queries your live data within your own permission scope, cites the transactions behind its answer, and proposes changes without ever applying them on its own.',
      image: img('dataAnalytics', 'showcase'),
      points: [
        'Traces a figure through its real movement history',
        'Names the person who can approve a blocked transaction',
        'Generates reporting grounded in posted figures',
        'Drafts the change and waits for someone authorised to confirm it',
      ],
      link: <TextLink to="/products/epsilon" navigate={navigate}>Explore Epsilon</TextLink>,
    },
  ]

  return (
    <PageShell
      title="Enterprise Compute | One platform for operations, people and accounting"
      description="Run point of sale, inventory, sales, purchasing, delivery, payroll and a real double-entry ledger on one platform. Unlimited users, priced per module, built to keep working offline."
    >
      {/* ---------------------------------------------------------- hero -- */}
      <Hero
        tone="deep"
        size="lg"
        backgroundImage={heroImg('heroTeam', 'heroWide')}
        eyebrow="One platform. One ledger."
        title="Run the whole business on records you can actually trust"
        lede="Point of sale, inventory, sales, purchasing, delivery, payroll and a genuine double-entry general ledger. One system, where every number traces back to the transaction that caused it and the business keeps trading when the network does not."
      >
        <ButtonRow>
          <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free 14-day trial</Button>
          <Button variant="secondary" size="lg" to="/contact" navigate={navigate}>Request a demo</Button>
        </ButtonRow>
        <div className="ds-hero-checklist">
          <Checklist
            items={[
              'Every module unlocked during the trial',
              'Unlimited users on every plan, forever',
              'Six core modules free permanently',
            ]}
          />
        </div>
      </Hero>

      <LogoStrip label="Built for operators across retail, hospitality, distribution and industry" items={TRUST_NAMES} />

      {/* ------------------------------------------------ featured story -- */}
      <Section
        eyebrow="Customer stories"
        title="What changes when the numbers stop disagreeing"
        subtitle="Operators who replaced disconnected tools with one ledger, and what they found when they could finally see the figures."
        rail
        split
      >
        <Grid cols={2}>
          <Card
            image={img(featuredStory.heroImage, 'fifty')}
            badge={featuredStory.industryLabel}
            eyebrow={featuredStory.company}
            title={featuredStory.headline}
            text={featuredStory.summary}
            link="Read the story"
            to={`/customers/${featuredStory.slug}`}
            navigate={navigate}
          />
          <div className="ds-stack lg">
            {sideStories.map((story) => (
              <Card
                key={story.slug}
                flat
                eyebrow={`${story.company} · ${story.industryLabel}`}
                title={story.headline}
                text={story.summary}
                link="Read the story"
                to={`/customers/${story.slug}`}
                navigate={navigate}
              />
            ))}
            <TextLink to="/customers" navigate={navigate}>All customer stories</TextLink>
          </div>
        </Grid>
        {ILLUSTRATIVE && (
          <p className="ds-note">{PLACEHOLDER_NOTICE}</p>
        )}
      </Section>

      {/* -------------------------------------------- capability showcase -- */}
      <Section
        variant="alt"
        eyebrow="The platform"
        title="Every part of the business writes to the same ledger"
        subtitle="Not a suite of products that export to each other overnight. One system, where a sale, a goods receipt and a pay run all post to one chart of accounts at the moment they happen."
        split
      >
        <Showcase items={showcase} />
      </Section>

      {/* ----------------------------------------------------- fast facts -- */}
      <Section variant="deep" tight>
        <FastFacts
          cols={4}
          items={[
            { value: '19', label: 'Modules across operations, people and accounting' },
            { value: 'Unlimited', label: 'Users on every workspace, on every plan' },
            { value: '6', label: 'Core modules free permanently, on every plan' },
            { value: '14', suffix: 'days', label: 'Free trial with every module unlocked' },
          ]}
        />
      </Section>

      {/* ---------------------------------------------------------- epsilon -- */}
      <Section>
        <FiftyFifty
          eyebrow="Epsilon · AI assistant"
          title="An assistant that actually knows the business it is talking about"
          image={img('realtimeDashboard', 'fifty')}
          reversed
        >
          <p className="ds-lede">
            A general chatbot can tell you what a trial balance is. Epsilon can tell you why
            yours does not balance, which journal caused it, and who posted it.
          </p>
          <Checklist
            items={[
              'Queries your live records at the moment you ask',
              'Answers inside the asking person’s own permission scope',
              'Cites the transactions behind every answer, so it is checkable',
              'Proposes a purchase order or a correction, but never writes one alone',
            ]}
          />
          <ButtonRow>
            <Button variant="secondary" to="/products/epsilon" navigate={navigate}>How Epsilon works</Button>
            <Button variant="tertiary" to="/pricing#epsilon" navigate={navigate}>See per-seat pricing</Button>
          </ButtonRow>
        </FiftyFifty>
      </Section>

      {/* ------------------------------------------------- how it holds up -- */}
      <Section
        variant="cream"
        eyebrow="Why it holds together"
        title="Three design decisions everything else follows from"
        subtitle="Most business software gets these wrong in ways that are impossible to fix later, because they are decisions about architecture and you cannot patch architecture on afterwards."
        rail
        split
      >
        <Grid cols={3}>
          <Card
            image={img('bookkeeping', 'card')}
            title="The ledger is written, not reconstructed"
            text="Operational transactions generate their own balanced double-entry postings, so month-end becomes a review of figures that already exist."
            link="Inside the accounting engine"
            to="/products/journals"
            navigate={navigate}
          />
          <Card
            image={img('shopkeeper', 'card')}
            title="Offline is a normal state, not an error"
            text="A durable local queue, client transaction ids that make retries safe, and clashing changes raised for a person to settle so nothing is quietly overwritten."
            link="How offline operation works"
            to="/products/offline-sync"
            navigate={navigate}
          />
          <Card
            image={img('teamWorking', 'card')}
            title="Permissions are per action, and so is the audit trail"
            text="A cashier can sell without discounting. A storekeeper can transfer without adjusting. And every posted record says who did it, when, and under whose approval."
            link="Governance and access control"
            to="/products/settings"
            navigate={navigate}
          />
        </Grid>
      </Section>

      {/* -------------------------------------------------------- products -- */}
      <Section
        id="products"
        eyebrow="Products"
        title="Nineteen modules. Pay for the ones you run."
        subtitle="Core modules are free on every workspace forever. Everything else is priced individually, so a two-module business is not subsidising a twelve-module one."
        rail
        split
        footer={(
          <ButtonRow>
            <Button variant="secondary" to="/products" navigate={navigate}>Browse all products</Button>
            <Button variant="tertiary" to="/pricing" navigate={navigate}>Build your plan and see the cost</Button>
          </ButtonRow>
        )}
      >
        <div className="ds-stack lg">
          {PRODUCT_CATEGORIES.map((category) => (
            <div className="ds-group" key={category.key}>
              <div className="ds-group-head">
                <h3 className="ds-h3">{category.name}</h3>
                <p className="ds-body">{category.blurb}</p>
              </div>
              <Tiles cols={4}>
                {productsInCategory(category.key).map((product) => (
                  <Tile
                    key={product.slug}
                    eyebrow={product.tier === 'free' ? 'Free on every plan' : (product.perSeat ? 'Per seat' : 'Priced module')}
                    title={product.name}
                    text={product.summary}
                    to={`/products/${product.slug}`}
                    navigate={navigate}
                  />
                ))}
              </Tiles>
            </div>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------ industries -- */}
      <Section
        variant="alt"
        eyebrow="Industries"
        title="Configured for how your sector actually trades"
        subtitle="The same engine underneath, set up around the operations, documents and controls each sector depends on."
        split
        footer={<TextLink to="/industries" navigate={navigate}>See all fourteen industries</TextLink>}
      >
        <Grid cols={4}>
          {INDUSTRIES.slice(0, 8).map((industry) => (
            <Card
              key={industry.slug}
              flat
              image={img(industry.cardImage, 'card')}
              title={industry.name}
              text={industry.summary}
              link="Explore"
              to={`/industries/${industry.slug}`}
              navigate={navigate}
            />
          ))}
        </Grid>
      </Section>

      {/* ------------------------------------------------------- the story -- */}
      <Section>
        <FiftyFifty
          eyebrow="Built where it is used"
          title="Designed for businesses that trade through outages"
          image={img('marketTrader', 'fifty')}
        >
          <p className="ds-body">
            Most enterprise software assumes the network is always there, and treats being
            offline as an error screen. For a shop that loses connectivity on an ordinary
            Thursday afternoon, that assumption costs real revenue.
          </p>
          <p className="ds-body">
            Enterprise Compute was built the other way round: naira-native amounts, local
            tax treatment, receipt formats operators recognise, and a client that keeps
            taking money when the connection drops, plus a desktop build with a bundled
            local database for sites where poor connectivity is the normal condition.
          </p>
          <ButtonRow>
            <Button variant="secondary" to="/about#story" navigate={navigate}>Read the full product story</Button>
            <Button variant="tertiary" to="/why-enterprise-compute" navigate={navigate}>Compare the alternatives</Button>
          </ButtonRow>
        </FiftyFifty>
      </Section>

      {/* ---------------------------------------------------------- quote -- */}
      <Section variant="deep-grad">
        <Container width="narrow">
          <Quote
            name={featuredStory.quote.name}
            role={featuredStory.quote.role}
            company={featuredStory.company}
            avatar={img(featuredStory.quote.avatar, 'avatar')}
          >
            {featuredStory.quote.text}
          </Quote>
        </Container>
      </Section>

      {/* -------------------------------------------------------- partners -- */}
      <Section
        eyebrow="Partner ecosystem"
        title="Get live with help, or build on top of it"
        subtitle="Implementation specialists, accounting practices, technology builders and referral partners."
        split
        footer={<TextLink to="/partners" navigate={navigate}>Explore the partner network</TextLink>}
      >
        <Grid cols={4}>
          {PARTNER_PROGRAMS.map((program) => (
            <Card
              key={program.name}
              flat
              image={img(program.image, 'card')}
              title={program.name}
              text={program.text}
              link="Learn more"
              to="/partners"
              navigate={navigate}
            />
          ))}
        </Grid>
      </Section>

      {/* --------------------------------------------------------- what's new */}
      <Section
        variant="alt"
        eyebrow="What's new"
        title="Guides, sessions and writing from the team"
        split
        subtitle="Practical material on running the platform and on the operational problems it exists to solve."
        footer={(
          <ButtonRow>
            <Button variant="secondary" to="/resources" navigate={navigate}>Resource library</Button>
            <Button variant="tertiary" to="/blog" navigate={navigate}>Read the blog</Button>
          </ButtonRow>
        )}
      >
        <Grid cols={4}>
          {nextEvent && (
            <Card
              image={img(nextEvent.image, 'card')}
              eyebrow={`Live · ${nextEvent.type}`}
              title={nextEvent.title}
              text={nextEvent.text}
              link="See upcoming dates"
              to="/events"
              navigate={navigate}
            />
          )}
          {featuredResources.map((resource) => (
            <Card
              key={resource.slug}
              image={img(resource.image, 'card')}
              eyebrow={`${resource.type} · ${resource.minutes} min`}
              title={resource.title}
              text={resource.text}
              link="Read it"
              to={resource.to}
              navigate={navigate}
            />
          ))}
          <Card
            image={img('dataDashboard', 'card')}
            eyebrow="Tool"
            title="Model your own payback before you commit"
            text="Set licence cost against admin time recovered, shrinkage avoided and revenue retained through outages, with every assumption visible and editable."
            link="Open the ROI calculator"
            to="/roi-calculator"
            navigate={navigate}
          />
        </Grid>
      </Section>

      {/* ------------------------------------------------------------- CTA -- */}
      <CTABanner
        eyebrow="Get started"
        title="Start with every module unlocked for fourteen days"
        text="No card required to begin. Choose which modules to keep before your first payment, and add more at any time. The new price applies from your next renewal, not the day you switch them on."
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/pricing" navigate={navigate}>Build your plan</Button>
        <Button variant="tertiary" to="/contact" navigate={navigate}>Talk to sales</Button>
      </CTABanner>
    </PageShell>
  )
}

export default LandingPage
