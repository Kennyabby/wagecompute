/* ============================================================================
   /integrations, what connects today, what the platform exposes, and what is
   genuinely still on the roadmap.
   ----------------------------------------------------------------------------
   The roadmap group is visually distinct and explicitly labelled. Listing
   unbuilt integrations alongside shipped ones without that distinction is a
   common and damaging pattern, buyers discover it during implementation,
   and by then the trust is gone.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, FastFacts, FiftyFifty, Grid,
  Hero, Section, TextLink, Tile, Tiles,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { INTEGRATION_GROUPS } from './content/programs'

const IntegrationsPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => { storePath('integrations') }, [storePath])

  const sections = INTEGRATION_GROUPS.map((group) => ({ id: group.id, label: group.name }))
  const availableCount = INTEGRATION_GROUPS.find((g) => g.id === 'available')?.items.length || 0

  return (
    <PageShell
      title="Integrations | Enterprise Compute"
      description="Payments, data import and export, document output, attendance hardware and receipt printing, plus the platform capabilities you can build against and what is still on the roadmap."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Integrations' }]}
      subnavTitle="Integrations"
      sections={sections}
      subnavCta={{ label: 'Request an integration', to: '/contact' }}
    >
      <Hero
        eyebrow="Integrations"
        title="What connects today, stated without optimism"
        lede="Because the platform covers operations, people and accounting in one system, most of what other products call an integration is simply a module here. This page is about the edges, where you need to connect to something outside."
        image={heroImg('developerScreens')}
      >
        <ButtonRow>
          <Button variant="primary" to="/contact" navigate={navigate}>Request an integration</Button>
          <Button variant="secondary" to="/products" navigate={navigate}>See what is built in</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts
          cols={4}
          items={[
            { value: String(availableCount), label: 'Integrations shipped and supported today' },
            { value: '19', label: 'Modules that need no integration, because they share the records' },
            { value: 'Templates', label: 'Spreadsheet import and export for bulk data' },
            { value: 'Roadmap', label: 'Public API and webhooks, prioritised on what you ask for' },
          ]}
        />
      </Section>

      {/* -------------------------------------------- the honest framing -- */}
      <Section>
        <FiftyFifty
          eyebrow="Worth saying first"
          title="Most of your integration problem disappears by not having it"
          image={img('teamDocuments', 'fifty')}
        >
          <p className="ds-body">
            The usual reason a business needs a dozen integrations is that it runs a dozen
            systems: a till, a stock package, a payroll tool, an accounts package, and a
            spreadsheet holding them together. Each pair needs a bridge, and each bridge
            is a thing that silently breaks.
          </p>
          <p className="ds-body">
            Here a sale, a goods receipt and a pay run write to the same records, so there
            is nothing to synchronise between them. That is not an integration feature.
            it is the absence of a problem, which is strictly better and much harder to
            market.
          </p>
          <TextLink to="/why-enterprise-compute#vs-point-tools" navigate={navigate}>
            Compare against running separate tools
          </TextLink>
        </FiftyFifty>
      </Section>

      {INTEGRATION_GROUPS.map((group, index) => (
        <Section
          key={group.id}
          id={group.id}
          variant={group.roadmap ? 'deep' : index % 2 === 1 ? 'cream' : 'alt'}
          eyebrow={group.roadmap ? 'Not available yet' : group.name}
          title={group.roadmap ? 'On the roadmap' : group.name}
          subtitle={group.note}
          rail
        split
        >
          <Tiles cols={group.items.length > 6 ? 4 : 3}>
            {group.items.map((item) => (
              <Tile
                key={item.name}
                eyebrow={group.roadmap ? `${item.category} · planned` : item.category}
                title={item.name}
                text={item.text}
              />
            ))}
          </Tiles>
          {group.roadmap && (
            <div className="ds-section-foot">
              <p className="ds-body">
                Priority on these is driven largely by what customers ask for. If one of
                them is blocking you, say so. It genuinely moves the order.
              </p>
              <ButtonRow>
                <Button variant="primary" to="/contact" navigate={navigate}>Tell us what you need</Button>
              </ButtonRow>
            </div>
          )}
        </Section>
      ))}

      <Section
        eyebrow="Built in, not bolted on"
        title="Capabilities that would be integrations elsewhere"
        subtitle="Each of these is a module rather than a connector, which is why there is no sync to configure and nothing to go out of step."
        split
        footer={<TextLink to="/products" navigate={navigate}>Browse all nineteen modules</TextLink>}
      >
        <Grid cols={4}>
          <Card
            flat
            image={img('posTerminal', 'card')}
            title="Point of sale"
            text="No till-to-accounts connector, because the till posts to the ledger itself."
            link="Point of Sale"
            to="/products/pos"
            navigate={navigate}
          />
          <Card
            flat
            image={img('budgetPlanning', 'card')}
            title="Payroll"
            text="No payroll-to-accounts journal upload, because the pay run posts its own entries."
            link="Payroll"
            to="/products/payroll"
            navigate={navigate}
          />
          <Card
            flat
            image={img('warehouseRacks', 'card')}
            title="Inventory"
            text="No stock-to-accounts valuation sync, because stock value moves with the movement."
            link="Inventory"
            to="/products/inventory"
            navigate={navigate}
          />
          <Card
            flat
            image={img('realtimeDashboard', 'card')}
            title="Reporting"
            text="No BI extract, because the statements read the ledger directly and drill back to source."
            link="Reports"
            to="/products/reports"
            navigate={navigate}
          />
        </Grid>
      </Section>

      <CTABanner
        eyebrow="Developers"
        title="Help shape the API before it ships"
        text="The public REST API and webhooks are being designed now. If you are planning to build against them, we would rather hear what you need before than after."
      >
        <Button variant="primary" size="lg" to="/contact" navigate={navigate}>Talk to engineering</Button>
        <Button variant="secondary" size="lg" to="/partners" navigate={navigate}>Technology partner programme</Button>
      </CTABanner>
    </PageShell>
  )
}

export default IntegrationsPage
