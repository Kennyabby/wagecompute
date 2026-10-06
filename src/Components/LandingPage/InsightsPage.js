/* ============================================================================
   /blog, insights index, and /blog/:slug, an article.
   ----------------------------------------------------------------------------
   Both exported from one file because they share the post list, the topic
   filter and the related-article logic. App.js imports InsightsPage for the
   index and InsightPostPage for an article.
   ========================================================================= */

import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, Container, Grid, Hero, Pills, Section, TextLink,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { POSTS, POST_BY_SLUG, POST_TOPICS } from './content/insights'

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/* ------------------------------------------------------------------ index -- */

export const InsightsPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()
  const [topic, setTopic] = useState(POST_TOPICS[0])

  useEffect(() => { storePath('blog') }, [storePath])

  const filtered = useMemo(
    () => POSTS.filter((post) => topic === POST_TOPICS[0] || post.topic === topic),
    [topic]
  )
  const lead = POSTS.find((post) => post.featured) || POSTS[0]

  return (
    <PageShell
      title="Insights | Enterprise Compute"
      description="Writing from the product and engineering team on accounting architecture, stock attribution, offline operation, grounded AI and how this platform is priced."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Insights' }]}
      subnavTitle="Insights"
      sections={[{ id: 'articles', label: 'All articles' }]}
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        eyebrow="Insights"
        title="Why the platform works the way it does"
        lede="Longer pieces from the people building it, on why the ledger has to be written rather than reconstructed, why offline support is harder than it sounds, and why we refuse to price per user."
        image={heroImg('officeLaptop')}
      />

      <Section flushBottom>
        <Grid cols={2}>
          <div className="ds-fifty-visual">
            <img alt="" {...img(lead.image, 'fifty')} />
          </div>
          <div>
            <span className="ds-eyebrow">{`Featured · ${lead.topic}`}</span>
            <h2 className="ds-h2">{lead.title}</h2>
            <p className="ds-lede">{lead.excerpt}</p>
            <p className="ds-body sm">{formatDate(lead.date)} · {lead.minutes} min read · {lead.author.role}</p>
            <Button variant="secondary" to={`/blog/${lead.slug}`} navigate={navigate}>Read the article</Button>
          </div>
        </Grid>
      </Section>

      <Section
        rail id="articles"
        bodySnug eyebrow="All articles" title="Browse by topic">
        <div className="ds-filters">
          <Pills label="Filter by topic" options={POST_TOPICS} value={topic} onChange={setTopic} />
        </div>
        <Grid cols={3}>
          {filtered.map((post) => (
            <Card
              key={post.slug}
              flat
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

      <CTABanner
        eyebrow="Go deeper"
        title="The practical material lives in the resource library"
        text="Setup guides, operational checklists and the templates for loading your catalogue, stock and rooms."
      >
        <Button variant="primary" size="lg" to="/resources" navigate={navigate}>Resource library</Button>
        <Button variant="secondary" size="lg" to="/docs" navigate={navigate}>Documentation</Button>
      </CTABanner>
    </PageShell>
  )
}

/* ---------------------------------------------------------------- article -- */

export const InsightPostPage = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { storePath } = useContext(ContextProvider)
  const post = POST_BY_SLUG[slug]

  useEffect(() => { storePath('blog') }, [storePath])

  if (!post) {
    return (
      <PageShell
        title="Article not found | Enterprise Compute"
        breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Insights', to: '/blog' }, { name: 'Not found' }]}
      >
        <Hero
          eyebrow="Not found"
          title="We could not find that article"
          lede="The link may be out of date. Everything published is listed on the insights index."
          image={heroImg('officeWorker')}
        >
          <ButtonRow>
            <Button variant="primary" to="/blog" navigate={navigate}>All articles</Button>
            <Button variant="secondary" to="/" navigate={navigate}>Back to home</Button>
          </ButtonRow>
        </Hero>
      </PageShell>
    )
  }

  const related = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3)

  return (
    <PageShell
      title={`${post.title} | Enterprise Compute`}
      description={post.excerpt}
      breadcrumbs={[
        { name: 'Home', to: '/' },
        { name: 'Insights', to: '/blog' },
        { name: post.topic },
      ]}
      subnavTitle="Insights"
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        eyebrow={post.topic}
        title={post.title}
        lede={post.excerpt}
        image={heroImg(post.image)}
      >
        <p className="ds-body sm ds-mb-0">
          {formatDate(post.date)} · {post.minutes} min read · {post.author.name}, {post.author.role}
        </p>
      </Hero>

      <Section>
        <Container width="narrow">
          <article className="ds-prose">
            {post.body.map((block, index) =>
              block.type === 'h2'
                ? <h2 key={index}>{block.text}</h2>
                : block.type === 'h3'
                  ? <h3 key={index}>{block.text}</h3>
                  : <p key={index}>{block.text}</p>
            )}
          </article>
        </Container>
      </Section>

      <Section
        rail variant="alt" eyebrow="Keep reading" title="Related articles" tight
        footer={<TextLink to="/blog" navigate={navigate}>All articles</TextLink>}
      >
        <Grid cols={3}>
          {related.map((item) => (
            <Card
              key={item.slug}
              flat
              image={img(item.image, 'card')}
              eyebrow={`${item.topic} · ${item.minutes} min read`}
              title={item.title}
              text={item.excerpt}
              link="Read the article"
              to={`/blog/${item.slug}`}
              navigate={navigate}
            />
          ))}
        </Grid>
      </Section>

      <CTABanner
        eyebrow="See it for yourself"
        title="Fourteen days, every module unlocked"
        text="The arguments in these articles are easier to judge against your own figures than against ours."
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/products" navigate={navigate}>Browse the modules</Button>
      </CTABanner>
    </PageShell>
  )
}

export default InsightsPage
