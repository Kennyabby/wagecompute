/* ============================================================================
   /industries/:slug — one page per sector.
   ----------------------------------------------------------------------------
   Driven from content/industries.js. Section order: hero, the failure modes
   that sector lives with, what the platform does about them, the module set,
   a quote, related stories, FAQ, CTA.

   The customer quote carries the illustrative-content notice from
   content/customers.js, because these quotes are composites too.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Accordion, Button, ButtonRow, Card, CTABanner, Checklist, Container, FastFacts,
  Grid, Hero, Quote, Section, TextLink, Tile, Tiles,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { INDUSTRY_BY_SLUG, INDUSTRIES } from './content/industries'
import { PRODUCT_BY_SLUG } from './content/products'
import { STORIES, ILLUSTRATIVE, PLACEHOLDER_NOTICE } from './content/customers'

const NotFound = ({ navigate }) => (
  <PageShell
    title="Industry not found | Enterprise Compute"
    breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Industries', to: '/industries' }, { name: 'Not found' }]}
  >
    <Hero
      eyebrow="Not found"
      title="We could not find that industry"
      lede="The link may be out of date. All fourteen sectors are listed on the industries overview."
      image={heroImg('officeWorker')}
    >
      <ButtonRow>
        <Button variant="primary" to="/industries" navigate={navigate}>All industries</Button>
        <Button variant="secondary" to="/" navigate={navigate}>Back to home</Button>
      </ButtonRow>
    </Hero>
  </PageShell>
)

const IndustryDetailPage = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { storePath } = useContext(ContextProvider)
  const industry = INDUSTRY_BY_SLUG[slug]

  useEffect(() => { storePath('industries') }, [storePath])

  if (!industry) return <NotFound navigate={navigate} />

  const modules = (industry.modules || []).map((key) => PRODUCT_BY_SLUG[key]).filter(Boolean)
  const stories = STORIES.filter((story) => story.industrySlug === industry.slug)
  const siblings = INDUSTRIES.filter((i) => i.group === industry.group && i.slug !== industry.slug).slice(0, 4)

  const sections = [
    { id: 'challenges', label: 'The problems' },
    { id: 'capabilities', label: 'What it does' },
    { id: 'modules', label: 'Module set' },
    ...(stories.length ? [{ id: 'stories', label: 'In practice' }] : []),
    ...(industry.faqs ? [{ id: 'faq', label: 'FAQ' }] : []),
  ]

  return (
    <PageShell
      title={`${industry.name} | Enterprise Compute`}
      description={industry.summary}
      breadcrumbs={[
        { name: 'Home', to: '/' },
        { name: 'Industries', to: '/industries' },
        { name: industry.name },
      ]}
      subnavTitle={industry.name}
      sections={sections}
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        tone="deep"
        backgroundImage={heroImg(industry.heroImage, 'heroWide')}
        eyebrow={industry.eyebrow}
        title={industry.title}
        lede={industry.lede}
      >
        <ButtonRow>
          <Button variant="primary" to="/signup" navigate={navigate}>Start a free trial</Button>
          <Button variant="secondary" to="/contact" navigate={navigate}>Request a demo</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts cols={industry.facts.length === 4 ? 4 : 3} items={industry.facts} />
      </Section>

      {/* ------------------------------------------------------ challenges -- */}
      <Section
        id="challenges"
        eyebrow="The problems"
        title={`What goes wrong in ${industry.name.toLowerCase()}`}
        subtitle="Specific failure modes rather than generic pain points, and what in the platform actually addresses each one."
        split
      >
        <Grid cols={2}>
          {industry.challenges.map((challenge, index) => (
            <div className="ds-fact" key={challenge.title}>
              <div className="ds-fact-value" style={{ fontSize: '1.75rem' }}>{String(index + 1).padStart(2, '0')}</div>
              <h3 className="ds-h4" style={{ marginTop: 14, marginBottom: 8 }}>{challenge.title}</h3>
              <p className="ds-body ds-mb-0">{challenge.text}</p>
            </div>
          ))}
        </Grid>
      </Section>

      {/* ---------------------------------------------------- capabilities -- */}
      <Section
        id="capabilities"
        variant="cream"
        eyebrow="What it does"
        title={`A ${industry.name.toLowerCase()} configuration, out of the box`}
        split
        subtitle="These are platform capabilities, not sector-specific code. The difference between one industry's setup and another's is configuration, which is why there is no customisation to maintain."
      >
        <Grid cols={2}>
          <div>
            <Checklist items={industry.capabilities} />
            <ButtonRow>
              <Button variant="secondary" to="/services" navigate={navigate}>Implementation services</Button>
              <Button variant="tertiary" to="/pricing" navigate={navigate}>Price this configuration</Button>
            </ButtonRow>
          </div>
          <div className="ds-fifty-visual">
            <img alt="" {...img(industry.heroImage, 'fifty')} />
          </div>
        </Grid>
      </Section>

      {/* --------------------------------------------------------- modules -- */}
      <Section
        id="modules"
        eyebrow="Module set"
        title="The modules most operators in this sector run"
        subtitle="A starting point rather than a package. Enable what you need and add the rest later. The new price applies from your next renewal."
        split
        footer={(
          <ButtonRow>
            <Button variant="secondary" to="/pricing" navigate={navigate}>Build your plan</Button>
            <Button variant="tertiary" to="/products" navigate={navigate}>Browse all nineteen modules</Button>
          </ButtonRow>
        )}
      >
        <Tiles cols={3}>
          {modules.map((module) => (
            <Tile
              key={module.slug}
              eyebrow={module.tier === 'free' ? 'Free on every plan' : module.perSeat ? 'Per seat' : 'Priced module'}
              title={module.name}
              text={module.summary}
              link="Explore"
              to={`/products/${module.slug}`}
              navigate={navigate}
            />
          ))}
        </Tiles>
      </Section>

      {/* ----------------------------------------------------------- quote -- */}
      {industry.quote && (
        <Section variant="deep-grad">
          <Container width="narrow">
            <Quote
              name={industry.quote.name}
              role={industry.quote.role}
              company={industry.quote.company}
              avatar={img(industry.quote.avatar, 'avatar')}
            >
              {industry.quote.text}
            </Quote>
            {ILLUSTRATIVE && (
              <p className="ds-body sm" style={{ marginTop: 28, marginBottom: 0 }}>{PLACEHOLDER_NOTICE}</p>
            )}
          </Container>
        </Section>
      )}

      {/* --------------------------------------------------------- stories -- */}
      {stories.length > 0 && (
        <Section
          id="stories"
          eyebrow="In practice"
          title="What changed for operators like you"
          split
          subtitle="Representative scenarios drawn from the kind of operation this configuration is built for."
          footer={<TextLink to="/customers" navigate={navigate}>All customer stories</TextLink>}
        >
          <Grid cols={stories.length === 1 ? 2 : 3}>
            {stories.map((story) => (
              <Card
                key={story.slug}
                image={img(story.image, 'card')}
                eyebrow={story.company}
                title={story.headline}
                text={story.summary}
                link="Read the story"
                to={`/customers/${story.slug}`}
                navigate={navigate}
              />
            ))}
          </Grid>
        </Section>
      )}

      {/* ------------------------------------------------------------- FAQ -- */}
      {industry.faqs && (
        <Section id="faq" variant="alt" eyebrow="FAQ" title={`Questions about ${industry.name.toLowerCase()}`}>
          <Container width="narrow">
            <Accordion items={industry.faqs} />
          </Container>
        </Section>
      )}

      {/* -------------------------------------------------------- siblings -- */}
      {siblings.length > 0 && (
        <Section eyebrow="Related sectors" title="Other industries in this group" tight>
          <Grid cols={4}>
            {siblings.map((sibling) => (
              <Card
                key={sibling.slug}
                flat
                image={img(sibling.cardImage, 'card')}
                title={sibling.name}
                text={sibling.summary}
                link="Explore"
                to={`/industries/${sibling.slug}`}
                navigate={navigate}
              />
            ))}
          </Grid>
        </Section>
      )}

      <CTABanner
        eyebrow="Get started"
        title={`See it configured for ${industry.name.toLowerCase()}`}
        text="Start a free trial with every module unlocked, or book a walkthrough with someone who has set this up before."
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/contact" navigate={navigate}>Request a demo</Button>
      </CTABanner>
    </PageShell>
  )
}

export default IndustryDetailPage
