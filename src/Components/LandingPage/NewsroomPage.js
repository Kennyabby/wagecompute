/* ============================================================================
   /press, newsroom.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, Container, FastFacts, Grid, Hero,
  Section, TextLink, Tile, Tiles,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { PRESS_RELEASES, MEDIA_CONTACT, POSTS } from './content/insights'
import { COMPANY_FACTS } from './content/company'

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

const SECTIONS = [
  { id: 'announcements', label: 'Announcements' },
  { id: 'facts', label: 'Company facts' },
  { id: 'media', label: 'Media contact' },
]

const NewsroomPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => { storePath('press') }, [storePath])

  const [lead, ...rest] = PRESS_RELEASES

  return (
    <PageShell
      title="Newsroom | Enterprise Compute"
      description="Product and company announcements from Enterprise Compute, plus company facts and media contact details."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Newsroom' }]}
      subnavTitle="Newsroom"
      sections={SECTIONS}
      subnavCta={{ label: 'Contact us', to: '/contact' }}
    >
      <Hero
        eyebrow="Newsroom"
        title="Announcements, releases and company information"
        lede="What has shipped, what has changed, and how to reach us for interviews, briefings or company detail."
        image={heroImg('publicSpeaker')}
      >
        <ButtonRow>
          <Button variant="primary" to="/contact" navigate={navigate}>Press enquiries</Button>
          <Button variant="secondary" to="/about" navigate={navigate}>About the company</Button>
        </ButtonRow>
      </Hero>

      <Section id="announcements" eyebrow="Announcements" title="Latest" flushBottom>
        <Grid cols={2}>
          <div className="ds-fifty-visual">
            <img alt="" {...img('businessPresentation', 'fifty')} />
          </div>
          <div>
            <span className="ds-eyebrow">{`${lead.kind} · ${formatDate(lead.date)}`}</span>
            <h3 className="ds-h2">{lead.title}</h3>
            <p className="ds-lede ds-mb-0">{lead.text}</p>
          </div>
        </Grid>
      </Section>

      <Section>
        <Tiles cols={2}>
          {rest.map((item) => (
            <Tile
              key={item.slug}
              eyebrow={`${item.kind} · ${formatDate(item.date)}`}
              title={item.title}
              text={item.text}
            />
          ))}
        </Tiles>
      </Section>

      <Section
        id="facts"
        variant="deep"
        eyebrow="Company facts"
        title="The numbers, for anyone writing about us"
        rail
        split
        subtitle="Figures describing the product and its commercial model. We do not publish customer counts or revenue, and will say so rather than estimate."
      >
        <FastFacts cols={4} items={COMPANY_FACTS} />
      </Section>

      <Section
        variant="alt"
        eyebrow="Background reading"
        title="Where the thinking is written down"
        rail
        split
        subtitle="If you are covering the product, these explain the architecture and the commercial decisions better than a press release can."
        footer={<TextLink to="/blog" navigate={navigate}>All articles</TextLink>}
      >
        <Grid cols={3}>
          {POSTS.slice(0, 3).map((post) => (
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

      <Section
        rail id="media" eyebrow="Media contact" title="Talk to us directly">
        <Container width="narrow">
          <p className="ds-lede">{MEDIA_CONTACT.line}</p>
          <p className="ds-body">
            We will give you a straight answer on what the product does and does not do,
            including the things that are still on the roadmap. If a claim in our own
            material is wrong, tell us and we will correct it.
          </p>
          <ButtonRow>
            <Button variant="primary" to={MEDIA_CONTACT.to} navigate={navigate}>{MEDIA_CONTACT.action}</Button>
            <Button variant="tertiary" to="/trust-center" navigate={navigate}>Security and compliance posture</Button>
          </ButtonRow>
        </Container>
      </Section>

      <CTABanner
        eyebrow="See the product"
        title="A walkthrough is usually more useful than a fact sheet"
        text="We are happy to run through a live workspace with you rather than send screenshots."
      >
        <Button variant="primary" size="lg" to="/contact" navigate={navigate}>Request a briefing</Button>
        <Button variant="secondary" size="lg" to="/about#story" navigate={navigate}>Read the product story</Button>
      </CTABanner>
    </PageShell>
  )
}

export default NewsroomPage
