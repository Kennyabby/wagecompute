/* ============================================================================
   /resources — the filterable resource library.
   ----------------------------------------------------------------------------
   The resource-centre pattern every major ERP site carries: one pool, filters
   by type and topic, plus a text search over the same pool. Nothing here is
   gated behind a form — every item routes to real content that already
   exists on the site.
   ========================================================================= */

import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, Card, CTABanner, Grid, Hero, Pills, Section, TextLink,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { RESOURCES, RESOURCE_TYPES, RESOURCE_TOPICS, EVENTS } from './content/resources'
import { POSTS } from './content/insights'

const SECTIONS = [
  { id: 'library', label: 'Library' },
  { id: 'reading', label: 'Latest writing' },
  { id: 'live', label: 'Live sessions' },
]

const ResourcesPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()
  const [type, setType] = useState(RESOURCE_TYPES[0])
  const [topic, setTopic] = useState(RESOURCE_TOPICS[0])
  const [query, setQuery] = useState('')

  useEffect(() => { storePath('resources') }, [storePath])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return RESOURCES.filter((item) => {
      if (type !== RESOURCE_TYPES[0] && item.type !== type) return false
      if (topic !== RESOURCE_TOPICS[0] && item.topic !== topic) return false
      if (q && !`${item.title} ${item.text} ${item.topic} ${item.type}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [type, topic, query])

  const featured = RESOURCES.filter((item) => item.featured)
  const latestPosts = POSTS.slice(0, 3)
  const liveEvents = EVENTS.filter((event) => event.format !== 'Recording').slice(0, 3)

  const clearFilters = () => {
    setType(RESOURCE_TYPES[0])
    setTopic(RESOURCE_TOPICS[0])
    setQuery('')
  }

  return (
    <PageShell
      title="Resource library | Enterprise Compute"
      description="Guides, checklists, templates and articles on running operations, stock, payroll and a real double-entry ledger, plus live sessions and on-demand recordings."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Resources' }]}
      subnavTitle="Resources"
      sections={SECTIONS}
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        eyebrow="Resource library"
        title="Practical material, not gated whitepapers"
        lede="Setup guides, operational checklists, data-loading templates and writing on the problems this platform exists to solve. Nothing behind a form."
        image={heroImg('businessTraining')}
      >
        <div className="ds-search" style={{ marginTop: 8 }}>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search guides, checklists and templates"
            aria-label="Search the resource library"
          />
          <button type="button" onClick={() => document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' })}>
            Search
          </button>
        </div>
      </Hero>

      {/* -------------------------------------------------------- featured -- */}
      <Section
        variant="alt"
        eyebrow="Start here"
        title="If you only read two things"
        split
        subtitle="The implementation plan and the chart-of-accounts guide between them cover the decisions that are expensive to get wrong at setup."
      >
        <Grid cols={2}>
          {featured.map((item) => (
            <Card
              key={item.slug}
              image={img(item.image, 'fifty')}
              eyebrow={`${item.type} · ${item.minutes} min read`}
              title={item.title}
              text={item.text}
              link="Read it"
              to={item.to}
              navigate={navigate}
            />
          ))}
        </Grid>
      </Section>

      {/* --------------------------------------------------------- library -- */}
      <Section
        id="library"
        eyebrow="Library"
        title="Everything, filterable"
        split
        subtitle={`${RESOURCES.length} items across setup, accounting, inventory, point of sale, payroll, reporting, security and AI.`}
      >
        <div className="ds-stack" style={{ marginBottom: 32 }}>
          <Pills label="Filter by type" options={RESOURCE_TYPES} value={type} onChange={setType} />
          <Pills label="Filter by topic" options={RESOURCE_TOPICS} value={topic} onChange={setTopic} />
        </div>

        <p className="ds-body sm" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          {(type !== RESOURCE_TYPES[0] || topic !== RESOURCE_TOPICS[0] || query) && (
            <>
              {' · '}
              <button type="button" className="ds-link" onClick={clearFilters}><span>Clear filters</span></button>
            </>
          )}
        </p>

        {filtered.length === 0 ? (
          <p className="ds-body">
            Nothing matches that combination yet. Try a broader filter, or{' '}
            <button type="button" className="ds-link" onClick={() => navigate('/help')}><span>ask the support team directly</span></button>.
          </p>
        ) : (
          <Grid cols={3}>
            {filtered.map((item) => (
              <Card
                key={item.slug}
                flat
                image={img(item.image, 'card')}
                eyebrow={`${item.type} · ${item.topic} · ${item.minutes} min`}
                title={item.title}
                text={item.text}
                link="Read it"
                to={item.to}
                navigate={navigate}
              />
            ))}
          </Grid>
        )}
      </Section>

      {/* --------------------------------------------------------- reading -- */}
      <Section
        id="reading"
        variant="cream"
        eyebrow="Latest writing"
        title="From the product and engineering team"
        split
        subtitle="Longer-form pieces on why the platform works the way it does, and on the operational problems behind those decisions."
        footer={<TextLink to="/blog" navigate={navigate}>Read all articles</TextLink>}
      >
        <Grid cols={3}>
          {latestPosts.map((post) => (
            <Card
              key={post.slug}
              image={img(post.image, 'card')}
              eyebrow={`${post.topic} · ${post.minutes} min read`}
              title={post.title}
              text={post.excerpt}
              link="Read the article"
              to={`/blog/${post.slug}`}
              navigate={navigate}
            />
          ))}
        </Grid>
      </Section>

      {/* ------------------------------------------------------------ live -- */}
      <Section
        id="live"
        eyebrow="Live sessions"
        title="Learn it with someone in the room"
        split
        subtitle="Implementation walkthroughs, module deep dives and open office hours with the product team."
        footer={<TextLink to="/events" navigate={navigate}>All events and recordings</TextLink>}
      >
        <Grid cols={3}>
          {liveEvents.map((event) => (
            <Card
              key={event.slug}
              flat
              image={img(event.image, 'card')}
              eyebrow={`${event.type} · ${event.duration}`}
              title={event.title}
              text={event.text}
              link={event.when}
              to="/events"
              navigate={navigate}
            />
          ))}
        </Grid>
      </Section>

      <CTABanner
        eyebrow="Still stuck?"
        title="The documentation goes deeper than any of this"
        text="Full setup, configuration and module reference, plus the templates used for loading your catalogue, stock and rooms."
      >
        <Button variant="primary" size="lg" to="/docs" navigate={navigate}>Read the documentation</Button>
        <Button variant="secondary" size="lg" to="/help" navigate={navigate}>Ask the support team</Button>
        <Button variant="tertiary" to="/training" navigate={navigate}>Training and certification</Button>
      </CTABanner>
    </PageShell>
  )
}

export default ResourcesPage
