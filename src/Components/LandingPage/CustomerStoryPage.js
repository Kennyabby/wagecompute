/* ============================================================================
   /customers/:slug — a single customer story.
   ----------------------------------------------------------------------------
   Challenge / approach / results, the structure every credible case study
   uses, with the result figures as a fast-fact band. Carries the illustrative
   notice from content/customers.js.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, Checklist, Container, FastFacts, Grid,
  Hero, Section, TextLink, Tile, Tiles,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { STORY_BY_SLUG, STORIES, ILLUSTRATIVE, PLACEHOLDER_NOTICE } from './content/customers'
import { PRODUCT_BY_SLUG } from './content/products'

const SECTIONS = [
  { id: 'challenge', label: 'The situation' },
  { id: 'approach', label: 'What changed' },
  { id: 'results', label: 'Results' },
  { id: 'modules', label: 'Modules used' },
]

const NotFound = ({ navigate }) => (
  <PageShell
    title="Story not found | Enterprise Compute"
    breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Customer stories', to: '/customers' }, { name: 'Not found' }]}
  >
    <Hero
      eyebrow="Not found"
      title="We could not find that story"
      lede="The link may be out of date. Every published story is listed on the customer stories index."
      image={heroImg('officeWorker')}
    >
      <ButtonRow>
        <Button variant="primary" to="/customers" navigate={navigate}>All customer stories</Button>
        <Button variant="secondary" to="/" navigate={navigate}>Back to home</Button>
      </ButtonRow>
    </Hero>
  </PageShell>
)

const CustomerStoryPage = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { storePath } = useContext(ContextProvider)
  const story = STORY_BY_SLUG[slug]

  useEffect(() => { storePath('customers') }, [storePath])

  if (!story) return <NotFound navigate={navigate} />

  const modules = (story.modules || []).map((key) => PRODUCT_BY_SLUG[key]).filter(Boolean)
  const others = STORIES.filter((s) => s.slug !== story.slug).slice(0, 3)

  return (
    <PageShell
      title={`${story.company} | Customer story | Enterprise Compute`}
      description={story.summary}
      breadcrumbs={[
        { name: 'Home', to: '/' },
        { name: 'Customer stories', to: '/customers' },
        { name: story.company },
      ]}
      subnavTitle={story.company}
      sections={SECTIONS}
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        tone="deep"
        backgroundImage={heroImg(story.heroImage, 'heroWide')}
        eyebrow={`${story.industryLabel} · ${story.size}`}
        title={story.headline}
        lede={story.summary}
      >
        <ButtonRow>
          <Button variant="primary" to="/signup" navigate={navigate}>Start a free trial</Button>
          <Button variant="secondary" to={`/industries/${story.industrySlug}`} navigate={navigate}>
            {`Solutions for ${story.industryLabel.toLowerCase()}`}
          </Button>
        </ButtonRow>
      </Hero>

      {ILLUSTRATIVE && (
        <Section tight flushBottom>
          <Container width="narrow">
            <p className="ds-body sm ds-mb-0" style={{ borderLeft: '3px solid var(--ds-gold)', paddingLeft: 16 }}>
              {PLACEHOLDER_NOTICE}
            </p>
          </Container>
        </Section>
      )}

      {/* ------------------------------------------------------ challenge -- */}
      <Section id="challenge" eyebrow="The situation" title="What it looked like before">
        <Grid cols={2}>
          <p className="ds-lede ds-mb-0">{story.challenge}</p>
          <div className="ds-fifty-visual">
            <img alt="" {...img(story.image, 'fifty')} />
          </div>
        </Grid>
      </Section>

      {/* ------------------------------------------------------- approach -- */}
      <Section
        id="approach"
        variant="alt"
        eyebrow="What changed"
        title="The specific things that were done"
        subtitle="Configuration rather than customisation, which is why this took weeks rather than quarters."
        split
      >
        <Grid cols={2}>
          <Checklist items={story.approach} />
          <div className="ds-quote">
            <blockquote style={{ fontSize: '1.25rem' }}>{story.quote.text}</blockquote>
            <div className="ds-quote-by">
              <img alt="" className="ds-quote-avatar" {...img(story.quote.avatar, 'avatar')} />
              <div>
                <strong>{story.quote.name}</strong>
                <span>{story.quote.role}, {story.company}</span>
              </div>
            </div>
          </div>
        </Grid>
      </Section>

      {/* -------------------------------------------------------- results -- */}
      <Section
        id="results"
        variant="deep"
        eyebrow="Results"
        title="What measurably moved"
        subtitle="Operational changes rather than satisfaction scores, because these are the things the mechanics actually produce."
        split
      >
        <FastFacts cols={story.results.length === 4 ? 4 : 3} items={story.results} />
      </Section>

      {/* -------------------------------------------------------- modules -- */}
      <Section
        id="modules"
        eyebrow="Modules used"
        title="The configuration behind it"
        subtitle="Every module here is available on the free trial, so you can assemble the same configuration before paying for anything."
        split
        footer={(
          <ButtonRow>
            <Button variant="secondary" to="/pricing" navigate={navigate}>Price this configuration</Button>
            <Button variant="tertiary" to="/products" navigate={navigate}>Browse all modules</Button>
          </ButtonRow>
        )}
      >
        <Tiles cols={modules.length > 4 ? 3 : 4}>
          {modules.map((module) => (
            <Tile
              key={module.slug}
              eyebrow={module.tier === 'free' ? 'Free on every plan' : 'Priced module'}
              title={module.name}
              text={module.summary}
              link="Explore"
              to={`/products/${module.slug}`}
              navigate={navigate}
            />
          ))}
        </Tiles>
      </Section>

      {/* ---------------------------------------------------- more stories -- */}
      <Section
        variant="cream"
        eyebrow="More stories"
        title="Other operations, same underlying change"
        tight
        footer={<TextLink to="/customers" navigate={navigate}>All customer stories</TextLink>}
      >
        <Grid cols={3}>
          {others.map((other) => (
            <Card
              key={other.slug}
              flat
              image={img(other.image, 'card')}
              eyebrow={`${other.company} · ${other.industryLabel}`}
              title={other.headline}
              text={other.summary}
              link="Read the story"
              to={`/customers/${other.slug}`}
              navigate={navigate}
            />
          ))}
        </Grid>
      </Section>

      <CTABanner
        eyebrow="Get started"
        title="Run the same test on your own figures"
        text="Fourteen days, every module unlocked, your own catalogue and stock loaded from the templates."
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/contact" navigate={navigate}>Request a demo</Button>
      </CTABanner>
    </PageShell>
  )
}

export default CustomerStoryPage
