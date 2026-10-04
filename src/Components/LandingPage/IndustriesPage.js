/* ============================================================================
   /industries — sector overview.
   ----------------------------------------------------------------------------
   Follows sap.com/industries.html: a hero, a set of cross-cutting outcomes,
   then the sectors grouped and shown as photographic cards. Fourteen sectors
   is deliberately more than the four or five a product site usually carries,
   because "is this for a business like mine" is the first question a visitor
   actually has.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, FastFacts, FiftyFifty, Grid, Hero,
  Section, Checklist,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { INDUSTRIES, INDUSTRY_GROUPS, industriesInGroup } from './content/industries'

const SECTIONS = [
  { id: 'sectors', label: 'All sectors' },
  { id: 'common', label: 'What they share' },
  { id: 'approach', label: 'Our approach' },
]

const IndustriesPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => { storePath('industries') }, [storePath])

  return (
    <PageShell
      title="Industries | Enterprise Compute"
      description="Retail, hospitality, distribution, manufacturing, construction, logistics, healthcare and more, all on the same engine, configured around how each sector actually trades."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Industries' }]}
      subnavTitle="Industries"
      sections={SECTIONS}
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        tone="deep"
        backgroundImage={heroImg('warehouseLogistics', 'heroWide')}
        eyebrow="Industries"
        title="The same engine, set up around how your sector actually trades"
        lede="A pharmacy, a hotel and a haulage operator need different documents, different controls and different reports. But all three need stock that matches the shelf, cash that has an owner, and a ledger that closes. That is the part we build once."
      >
        <ButtonRow>
          <Button variant="primary" to="/signup" navigate={navigate}>Start a free trial</Button>
          <Button variant="secondary" to="/contact" navigate={navigate}>Talk to someone in your sector</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts
          cols={4}
          items={[
            { value: '14', label: 'Sectors with a configured starting point' },
            { value: '19', label: 'Modules to assemble from' },
            { value: 'Unlimited', label: 'Users, so frontline staff are never left off' },
            { value: 'Offline', label: 'Operation wherever connectivity is unreliable' },
          ]}
        />
      </Section>

      {/* -------------------------------------------------------- sectors -- */}
      <Section
        id="sectors"
        eyebrow="All sectors"
        title="Find the operation that looks like yours"
        subtitle="Each sector page sets out the specific failure modes that sector lives with, the modules that address them, and what changes when they are addressed."
        split
      >
        <div className="ds-stack lg">
          {INDUSTRY_GROUPS.map((group) => (
            <div key={group.key}>
              <h3 className="ds-h3" style={{ marginBottom: 20 }}>{group.name}</h3>
              <Grid cols={4}>
                {industriesInGroup(group.key).map((industry) => (
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
            </div>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------- what's common */}
      <Section
        id="common"
        variant="cream"
        eyebrow="What they share"
        title="Four problems that turn up in every sector we work in"
        subtitle="Industry specificity matters at the edges. The centre is remarkably consistent, which is why one engine can serve all fourteen."
        split
      >
        <Grid cols={4}>
          <Card
            image={img('inventoryCount', 'card')}
            eyebrow="Problem one"
            title="The count never matches the record"
            text="Because the stock figure is a stored number that gets overwritten rather than a position derived from attributed movements."
            link="How we fix it"
            to="/solutions#challenge-stock"
            navigate={navigate}
          />
          <Card
            image={img('posTerminal', 'card')}
            eyebrow="Problem two"
            title="Cash variance with no owner"
            text="Because sales are not tied to a session, a float and a named operator, so a shortfall is a company-level cost rather than a specific conversation."
            link="How we fix it"
            to="/products/pos"
            navigate={navigate}
          />
          <Card
            image={img('bookkeeping', 'card')}
            eyebrow="Problem three"
            title="Month-end is a reconstruction"
            text="Because accounting was bolted on afterwards, so the ledger has to be rebuilt from exports every single period."
            link="How we fix it"
            to="/solutions#challenge-close"
            navigate={navigate}
          />
          <Card
            image={img('teamDocuments', 'card')}
            eyebrow="Problem four"
            title="Nobody agrees on the numbers"
            text="Because the operational report and the accounts are two independent derivations of the same events, and nothing reconciles them."
            link="How we fix it"
            to="/solutions#challenge-truth"
            navigate={navigate}
          />
        </Grid>
      </Section>

      {/* ------------------------------------------------------- approach -- */}
      <Section id="approach">
        <FiftyFifty
          eyebrow="Our approach"
          title="Configured, not customised"
          image={img('consultation', 'fifty')}
        >
          <p className="ds-body">
            Traditional ERP handles sector difference through customisation, which is why
            every upgrade becomes a project and every implementation needs consultants on
            day rates. We handle it through configuration instead: the same code, set up
            differently.
          </p>
          <Checklist
            items={[
              'Pick the modules your sector needs; dependencies resolve automatically',
              'Map operational activity to a chart of accounts your accountant designs',
              'Build permission profiles around the roles you actually employ',
              'Load your catalogue, stock, rooms and staff from spreadsheet templates',
            ]}
          />
          <ButtonRow>
            <Button variant="secondary" to="/services" navigate={navigate}>Implementation services</Button>
            <Button variant="tertiary" to="/resources" navigate={navigate}>Setup guides and templates</Button>
          </ButtonRow>
        </FiftyFifty>

        <div style={{ marginTop: 'clamp(56px, 7vw, 96px)' }}>
          <FiftyFifty
            eyebrow="Not on the list?"
            title="The engine does not actually care what you sell"
            image={img('localMarket', 'fifty')}
            reversed
          >
            <p className="ds-body">
              The fourteen sectors above are the ones with a configured starting point and
              written guidance. They are not a limit. If your business buys things, sells
              things, employs people or needs a ledger that closes, the modules apply.
              The only question is which combination.
            </p>
            <ButtonRow>
              <Button variant="secondary" to="/contact" navigate={navigate}>Tell us what you run</Button>
              <Button variant="tertiary" to="/products" navigate={navigate}>Browse the modules yourself</Button>
            </ButtonRow>
          </FiftyFifty>
        </div>
      </Section>

      <CTABanner
        eyebrow="Get started"
        title="See it running against your own data"
        text={`Start a free trial with all ${INDUSTRIES.length > 0 ? '19' : ''} modules unlocked, or book a walkthrough with someone who knows your sector.`}
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/contact" navigate={navigate}>Request a demo</Button>
      </CTABanner>
    </PageShell>
  )
}

export default IndustriesPage
