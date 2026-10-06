/* ============================================================================
   /community
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, FastFacts, FiftyFifty, Grid, Hero,
  Section, TextLink,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { COMMUNITY_PILLARS } from './content/company'
import { EVENTS } from './content/resources'
import { POSTS } from './content/insights'

const SECTIONS = [
  { id: 'pillars', label: 'Where to go' },
  { id: 'events', label: 'Events' },
  { id: 'contribute', label: 'Contribute' },
]

const CommunityPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => { storePath('community') }, [storePath])

  const upcoming = EVENTS.filter((event) => event.format !== 'Recording').slice(0, 3)

  return (
    <PageShell
      title="Community | Enterprise Compute"
      description="Forums, user groups, events, documentation, the partner network and product feedback. These are the places other operators have usually solved it first."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Community' }]}
      subnavTitle="Community"
      sections={SECTIONS}
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        tone="deep"
        backgroundImage={heroImg('teamCollaboration', 'heroWide')}
        eyebrow="Community"
        title="The fastest answers usually come from another operator"
        lede="Forums, sector user groups, open office hours and a documentation set written for people running businesses rather than for developers."
      >
        <ButtonRow>
          <Button variant="primary" to="/events" navigate={navigate}>Upcoming sessions</Button>
          <Button variant="secondary" to="/docs" navigate={navigate}>Documentation</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts
          cols={4}
          items={[
            { value: 'Fortnightly', label: 'Open office hours with the product team' },
            { value: 'Monthly', label: 'Implementation webinars and module workshops' },
            { value: 'Sector', label: 'User groups for retail, hospitality, distribution and finance' },
            { value: 'Open', label: 'Roadmap input, because priorities follow what people ask for' },
          ]}
        />
      </Section>

      {/* -------------------------------------------------------- pillars -- */}
      <Section
        id="pillars"
        eyebrow="Where to go"
        title="Six places to get unstuck"
        subtitle="Ranked roughly by speed: documentation for a known question, the forum for a configuration one, office hours when it needs a conversation."
        rail
        split
      >
        <Grid cols={3}>
          {COMMUNITY_PILLARS.map((pillar) => (
            <Card
              key={pillar.title}
              image={img(pillar.image, 'card')}
              title={pillar.title}
              text={pillar.text}
              link="Go there"
              to={pillar.to}
              navigate={navigate}
            >
              <ul className="ds-plain-list">
                {pillar.links.map((link) => (
                  <li key={link} className="ds-card-text">· {link}</li>
                ))}
              </ul>
            </Card>
          ))}
        </Grid>
      </Section>

      {/* --------------------------------------------------------- events -- */}
      <Section
        id="events"
        variant="cream"
        eyebrow="Events"
        title="Coming up"
        rail
        split
        subtitle="Every session is free. You do not have to be a customer to come to one."
        footer={<TextLink to="/events" navigate={navigate}>All events and recordings</TextLink>}
      >
        <Grid cols={3}>
          {upcoming.map((event) => (
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

      {/* ----------------------------------------------------- contribute -- */}
      <Section id="contribute">
        <FiftyFifty
          eyebrow="Contribute"
          title="Roadmap priority genuinely follows what people ask for"
          image={img('teamWhiteboard', 'fifty')}
          titleAs="h2"
        >
          <p className="ds-body">
            The public API, webhooks and bank-feed import are all on the roadmap, and the
            order they ship in is driven mostly by how many operators say they are blocked
            on one. We are not saying that to sound approachable. It is genuinely how a small team decides what to build next.
          </p>
          <p className="ds-body">
            The most useful thing you can send is not a feature name but the workflow it
            would unblock. Those arrive as context we can design against, where a feature
            request arrives as a guess at an implementation.
          </p>
          <ButtonRow>
            <Button variant="secondary" to="/contact" navigate={navigate}>Send product feedback</Button>
            <Button variant="tertiary" to="/integrations" navigate={navigate}>See the current roadmap</Button>
          </ButtonRow>
        </FiftyFifty>
      </Section>

      <Section
        rail
        variant="alt"
        eyebrow="Reading"
        title="How the team thinks about the problems"
        tight
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

      <CTABanner
        eyebrow="Join in"
        title="You will get more out of it with a workspace open"
        text="Start a free trial, bring a real configuration question to office hours, and leave with it solved."
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/events" navigate={navigate}>See upcoming sessions</Button>
      </CTABanner>
    </PageShell>
  )
}

export default CommunityPage
