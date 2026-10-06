/* ============================================================================
   /customers, customer story index, with filtering.
   ----------------------------------------------------------------------------
   The illustrative-content notice from content/customers.js is rendered
   prominently here rather than buried, because this is the page where a
   visitor is most likely to mistake a composite for a reference.
   ========================================================================= */

import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, Container, FastFacts, Grid, Hero,
  Pills, Quote, Section, TextLink,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { STORIES, STORY_FILTERS, ILLUSTRATIVE, PLACEHOLDER_NOTICE } from './content/customers'

const SECTIONS = [
  { id: 'stories', label: 'All stories' },
  { id: 'patterns', label: 'Common patterns' },
]

const CustomersPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()
  const [industry, setIndustry] = useState(STORY_FILTERS.industry[0])
  const [size, setSize] = useState(STORY_FILTERS.size[0])

  useEffect(() => { storePath('customers') }, [storePath])

  const filtered = useMemo(() => STORIES.filter((story) => {
    const industryOk = industry === STORY_FILTERS.industry[0] || story.industryLabel === industry
    const sizeOk = size === STORY_FILTERS.size[0] || story.size === size
    return industryOk && sizeOk
  }), [industry, size])

  const featured = STORIES[0]

  return (
    <PageShell
      title="Customer stories | Enterprise Compute"
      description="What changes for operators when stock, cash, people and the ledger stop disagreeing, across retail, hospitality, distribution, manufacturing, logistics and healthcare."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Customer stories' }]}
      subnavTitle="Customer stories"
      sections={SECTIONS}
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        eyebrow="Customer stories"
        title="What changes when the numbers stop disagreeing"
        lede="Operations that replaced disconnected tools with one ledger, what they found when they could finally see the figures, and what they did about it."
        image={heroImg('heroOffice')}
      >
        {ILLUSTRATIVE && (
          <p className="ds-note">{PLACEHOLDER_NOTICE}</p>
        )}
        <ButtonRow>
          <Button variant="primary" to="/signup" navigate={navigate}>Start a free trial</Button>
          <Button variant="secondary" to="/contact" navigate={navigate}>Talk to a reference customer</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts
          cols={4}
          items={[
            { value: '6', label: 'Sectors represented across these stories' },
            { value: '19', label: 'Modules available to assemble from' },
            { value: 'Unlimited', label: 'Users on every one of these workspaces' },
            { value: 'One', label: 'Ledger behind every figure quoted' },
          ]}
        />
      </Section>

      {/* -------------------------------------------------------- featured -- */}
      <Section flushBottom>
        <Grid cols={2}>
          <div className="ds-fifty-visual">
            <img alt="" {...img(featured.heroImage, 'fifty')} />
          </div>
          <div>
            <span className="ds-eyebrow">{`Featured · ${featured.industryLabel}`}</span>
            <h2 className="ds-h2">{featured.headline}</h2>
            <p className="ds-lede">{featured.summary}</p>
            <Quote
              name={featured.quote.name}
              role={featured.quote.role}
              company={featured.company}
              avatar={img(featured.quote.avatar, 'avatar')}
            >
              {featured.quote.text}
            </Quote>
            <div className="ds-section-foot">
              <Button variant="secondary" to={`/customers/${featured.slug}`} navigate={navigate}>
                Read the full story
              </Button>
            </div>
          </div>
        </Grid>
      </Section>

      {/* -------------------------------------------------------- stories -- */}
      <Section
        id="stories"
        bodySnug
        eyebrow="All stories"
        title="Browse by sector and size"
        rail
        split
        subtitle="Each story sets out the situation before, what was actually changed, and what measurably moved as a result."
      >
        <div className="ds-filters">
          <Pills
            label="Filter by industry"
            options={STORY_FILTERS.industry}
            value={industry}
            onChange={setIndustry}
          />
          <Pills
            label="Filter by business size"
            options={STORY_FILTERS.size}
            value={size}
            onChange={setSize}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="ds-body">
            No stories match that combination yet.{' '}
            <button
              type="button"
              className="ds-link"
              onClick={() => { setIndustry(STORY_FILTERS.industry[0]); setSize(STORY_FILTERS.size[0]) }}
            >
              <span>Clear the filters</span>
            </button>
          </p>
        ) : (
          <Grid cols={3}>
            {filtered.map((story) => (
              <Card
                key={story.slug}
                image={img(story.image, 'card')}
                badge={story.industryLabel}
                eyebrow={story.company}
                title={story.headline}
                text={story.summary}
                link="Read the story"
                to={`/customers/${story.slug}`}
                navigate={navigate}
              />
            ))}
          </Grid>
        )}
      </Section>

      {/* ------------------------------------------------------- patterns -- */}
      <Section
        id="patterns"
        variant="cream"
        eyebrow="Common patterns"
        title="The same four things keep turning up"
        subtitle="Across every sector, the improvements operators report cluster into a small number of structural changes rather than a long list of features."
        split
      >
        <Grid cols={4}>
          <Card
            image={img('inventoryCount', 'card')}
            eyebrow="Pattern one"
            title="The count becomes a check, not a discovery"
            text="Once a position is derived from attributed movements, the physical count stops being the event where you find out what you have, which is why operators usually end up counting more often rather than less."
          />
          <Card
            image={img('posTerminal', 'card')}
            eyebrow="Pattern two"
            title="Variance acquires an owner"
            text="Session-based cash handling changes behaviour before it changes numbers. A shortfall with a name next to it is a different conversation from a company-level write-off."
          />
          <Card
            image={img('bookkeeping', 'card')}
            eyebrow="Pattern three"
            title="Month-end shortens dramatically"
            text="Not because anything got faster, but because the work moved. A close on a running ledger is a review of figures that already exist."
          />
          <Card
            image={img('financialAnalysis', 'card')}
            eyebrow="Pattern four"
            title="A real cost becomes visible for the first time"
            text="Food cost per dish, landed cost per import, cost of production per cycle, running cost per clinic. In almost every case it was higher than the figure being used."
          />
        </Grid>
        <div className="ds-section-foot">
          <TextLink to="/why-enterprise-compute" navigate={navigate}>Why these outcomes follow from the architecture</TextLink>
        </div>
      </Section>

      <Section tight>
        <Container width="narrow">
          <div className="ds-center">
            <h2 className="ds-h3">Would you share yours?</h2>
            <p className="ds-body">
              If you run a workspace and something measurable changed, we would like to
              write it up properly, with your review and approval before anything is
              published, and your name on it only if you want it there.
            </p>
            <ButtonRow className="ds-center" >
              <Button variant="secondary" to="/contact" navigate={navigate}>Get in touch</Button>
            </ButtonRow>
          </div>
        </Container>
      </Section>

      <CTABanner
        eyebrow="Get started"
        title="See whether the same thing happens to your figures"
        text="Fourteen days with every module unlocked. Load your own catalogue and stock from the templates and find out."
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/contact" navigate={navigate}>Request a demo</Button>
      </CTABanner>
    </PageShell>
  )
}

export default CustomersPage
