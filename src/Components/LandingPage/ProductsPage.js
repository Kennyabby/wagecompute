/* ============================================================================
   /products, the product catalogue overview.
   ----------------------------------------------------------------------------
   Structured like sap.com/products.html: portfolio categories first, then a
   promoted set, then the platform capabilities that cut across everything.
   Each category carries a photograph and each product a routed tile, so the
   page works both as a directory and as an argument.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, FastFacts, FiftyFifty, Grid, Hero,
  Section, TextLink, Tile, Tiles, Checklist,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { PRODUCT_CATEGORIES, PRODUCTS, productsInCategory } from './content/products'

const SECTIONS = [
  { id: 'catalogue', label: 'Full catalogue' },
  { id: 'how-they-connect', label: 'How they connect' },
  { id: 'pricing-model', label: 'Pricing model' },
  { id: 'platform', label: 'Platform' },
]

const ProductsPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => { storePath('products') }, [storePath])

  const freeCount = PRODUCTS.filter((p) => p.tier === 'free' && p.billable).length
  const pricedCount = PRODUCTS.filter((p) => p.tier === 'standard' && p.billable).length

  return (
    <PageShell
      title="Products | Enterprise Compute"
      description="Nineteen modules across operations, people, accounting and platform. Core modules free on every plan, everything else priced individually, unlimited users throughout."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Products' }]}
      subnavTitle="Products"
      sections={SECTIONS}
      subnavCta={{ label: 'Build your plan', to: '/pricing' }}
    >
      <Hero
        eyebrow="Products"
        title="One platform, assembled from the modules you actually run"
        lede="Every module writes to the same records and the same ledger. Turn on what the business needs, leave the rest off, and add more at any time without a migration."
        image={heroImg('businessOffice')}
      >
        <ButtonRow>
          <Button variant="primary" to="/pricing" navigate={navigate}>Build your plan</Button>
          <Button variant="secondary" to="/signup" navigate={navigate}>Start a free trial</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts
          cols={4}
          items={[
            { value: String(PRODUCTS.length), label: 'Modules in the catalogue' },
            { value: String(freeCount), label: 'Core modules free permanently, on every plan' },
            { value: String(pricedCount), label: 'Priced modules, enabled individually' },
            { value: 'Unlimited', label: 'Users on every workspace, on every plan' },
          ]}
        />
      </Section>

      {/* ------------------------------------------------------ catalogue -- */}
      <Section
        id="catalogue"
        eyebrow="Full catalogue"
        title="Four groups, nineteen modules"
        subtitle="Grouped by what they do rather than by how they are billed. Every module page explains what it covers, what it depends on, and what it posts to the ledger."
        rail
        split
      >
        <div className="ds-stack lg">
          {PRODUCT_CATEGORIES.map((category) => {
            const items = productsInCategory(category.key)
            return (
              <div key={category.key}>
                <Grid cols={3}>
                  <Card
                    flat
                    image={img(category.image, 'card')}
                    eyebrow={`${items.length} modules`}
                    title={category.name}
                    text={category.blurb}
                  />
                  <div style={{ gridColumn: 'span 2' }}>
                    <Tiles cols={2}>
                      {items.map((product) => (
                        <Tile
                          key={product.slug}
                          eyebrow={
                            product.tier === 'free'
                              ? 'Free on every plan'
                              : product.perSeat
                                ? 'Per seat'
                                : product.billable === false
                                  ? 'Platform capability'
                                  : 'Priced module'
                          }
                          title={product.name}
                          text={product.summary}
                          link="Explore"
                          to={`/products/${product.slug}`}
                          navigate={navigate}
                        />
                      ))}
                    </Tiles>
                  </div>
                </Grid>
              </div>
            )
          })}
        </div>
      </Section>

      {/* -------------------------------------------------- how they connect */}
      <Section
        id="how-they-connect"
        variant="cream"
        eyebrow="How they connect"
        title="One transaction, every consequence, automatically"
        subtitle="The reason to run these together rather than separately is that each operational event has financial and operational consequences that should not need a second person to record."
        rail
        split
      >
        <Grid cols={3}>
          <Card
            image={img('posCheckout', 'card')}
            eyebrow="A sale completes"
            title="Stock moves, revenue posts, cash lands in a session"
            text="Inventory position drops, cost of sales and revenue post to their mapped accounts, the receivable or the cash is recorded, and the amount belongs to a named operator's shift."
          />
          <Card
            image={img('warehouseTeam', 'card')}
            eyebrow="Goods are received"
            title="Stock rises, value rises, the payable is created"
            text="The receipt is matched against the order, landed cost is attributed, the inventory value on the balance sheet moves, and the supplier balance updates."
          />
          <Card
            image={img('budgetPlanning', 'card')}
            eyebrow="A pay run is approved"
            title="Payslips issue and the ledger takes the cost"
            text="Gross cost, every deduction liability and net payable post to their accounts, attributed to the department that incurred them."
          />
        </Grid>
        <div>
          <FiftyFifty
            eyebrow="Dependencies"
            title="Enabling one module brings what it needs"
            image={img('teamDocuments', 'fifty')}
            reversed
          >
            <p className="ds-body">
              Some modules cannot function without others. Sales needs Inventory to move
              real stock and post a real cost of sale; Payroll needs Employees, Attendance,
              Departments and Positions. Rather than letting you build a configuration that
              cannot work, dependencies are added automatically when you enable something.
            </p>
            <Checklist
              items={[
                'Dependencies resolved server-side, never trusted from the browser',
                'Free core modules are always present, so most dependencies cost nothing',
                'Add a module any time; the new price applies from your next renewal',
                'Nothing is charged on the day you switch something on',
              ]}
            />
            <TextLink to="/pricing" navigate={navigate}>See how pricing and dependencies work</TextLink>
          </FiftyFifty>
        </div>
      </Section>

      {/* -------------------------------------------------- pricing model --- */}
      <Section
        id="pricing-model"
        eyebrow="Pricing model"
        title="Per module, never per user"
        subtitle="Per-seat pricing makes customers ration logins, and shared accounts destroy the attribution the platform exists to provide. So the capability is what gets priced."
        rail
        split
      >
        <Grid cols={3}>
          <Card
            image={img('teamMeeting', 'card')}
            title="Unlimited users, always"
            text="Put the whole team on it: cashiers, storekeepers, riders, supervisors, your external accountant. Headcount never changes the price."
          />
          <Card
            image={img('officeLaptop', 'card')}
            title="Six core modules free forever"
            text="Dashboard, Employees, Departments, Positions, Attendance and Settings are free on every plan permanently. You never pay to keep your own staff records or control your own access."
          />
          <Card
            image={img('dataDashboard', 'card')}
            title="Pay only for what you enable"
            text="Each operational and accounting module has its own price. A two-module business is not subsidising a twelve-module one."
          />
        </Grid>
        <div className="ds-section-foot">
          <ButtonRow>
            <Button variant="primary" to="/pricing" navigate={navigate}>Build your plan and see the cost</Button>
            <Button variant="tertiary" to="/roi-calculator" navigate={navigate}>Model the payback</Button>
          </ButtonRow>
        </div>
      </Section>

      {/* ------------------------------------------------------- platform --- */}
      <Section
        id="platform"
        variant="alt"
        eyebrow="Platform"
        title="What runs underneath all nineteen"
        subtitle="These are not modules you buy. They are properties of the platform that every module inherits."
        split
      >
        <Grid cols={4}>
          <Card
            flat
            image={img('cyberSecurity', 'card')}
            title="Per-action permissions"
            text="Granted independently per profile per module, and applied identically everywhere, including to the AI assistant."
            link="Governance"
            to="/products/settings"
            navigate={navigate}
          />
          <Card
            flat
            image={img('posTerminal', 'card')}
            title="Offline-first operation"
            text="Durable local queue, idempotent replay, surfaced conflicts, and automatic convergence once a batch lands."
            link="Offline & sync"
            to="/products/offline-sync"
            navigate={navigate}
          />
          <Card
            flat
            image={img('realtimeDashboard', 'card')}
            title="Live record streaming"
            text="Tenant-scoped server-sent events push changes to connected sessions, so two people looking at a figure see the same figure."
            link="Dashboard"
            to="/products/dashboard"
            navigate={navigate}
          />
          <Card
            flat
            image={img('dataCentre', 'card')}
            title="Tenant isolation and audit"
            text="Each workspace scoped to its own tenant, with an audit trail on every posted record and reversals instead of deletions."
            link="Trust Center"
            to="/trust-center"
            navigate={navigate}
          />
        </Grid>
      </Section>

      <CTABanner
        eyebrow="Try it"
        title="Every module unlocked for fourteen days"
        text="Set the workspace up, load your data from the templates, put the team on it, and decide what to keep before the first payment."
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/contact" navigate={navigate}>Request a demo</Button>
      </CTABanner>
    </PageShell>
  )
}

export default ProductsPage
