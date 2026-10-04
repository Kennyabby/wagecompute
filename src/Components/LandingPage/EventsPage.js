/* ============================================================================
   /events — live sessions, workshops, office hours and recordings.
   ========================================================================= */

import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, FastFacts, Grid, Hero, Pills, Section, TextLink,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { EVENTS, EVENT_TYPES } from './content/resources'

const SECTIONS = [
  { id: 'upcoming', label: 'Live sessions' },
  { id: 'on-demand', label: 'On demand' },
  { id: 'community', label: 'User groups' },
]

const EventsPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()
  const [format, setFormat] = useState(EVENT_TYPES[0])

  useEffect(() => { storePath('events') }, [storePath])

  const live = useMemo(
    () => EVENTS.filter((event) => event.format !== 'Recording' && (format === EVENT_TYPES[0] || event.type === format)),
    [format]
  )
  const recorded = useMemo(
    () => EVENTS.filter((event) => event.format === 'Recording' && (format === EVENT_TYPES[0] || event.type === format)),
    [format]
  )
  const featured = EVENTS.find((event) => event.featured)

  return (
    <PageShell
      title="Events & webinars | Enterprise Compute"
      description="Live implementation sessions, module workshops, open office hours with the product team, and on-demand recordings."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Events' }]}
      subnavTitle="Events"
      sections={SECTIONS}
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        tone="deep"
        backgroundImage={heroImg('conferenceAudience', 'heroWide')}
        eyebrow="Events & webinars"
        title="Learn it from people who have set it up before"
        lede="Monthly implementation walkthroughs, module deep dives, and open office hours where you can bring a configuration problem and leave with an answer."
      >
        <ButtonRow>
          <Button variant="primary" to="/contact" navigate={navigate}>Register your interest</Button>
          <Button variant="secondary" to="/training" navigate={navigate}>Structured training paths</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts
          cols={4}
          items={[
            { value: 'Monthly', label: 'Implementation webinar with open Q&A' },
            { value: 'Fortnightly', label: 'Open office hours with the product team' },
            { value: 'Free', label: 'Every session, for customers and evaluators alike' },
            { value: 'Recorded', label: 'Sessions available on demand afterwards' },
          ]}
        />
      </Section>

      {featured && (
        <Section flushBottom>
          <Grid cols={2}>
            <div className="ds-fifty-visual">
              <img alt="" {...img(featured.image, 'fifty')} />
            </div>
            <div>
              <span className="ds-eyebrow">{`Next up · ${featured.type}`}</span>
              <h2 className="ds-h2">{featured.title}</h2>
              <p className="ds-lede">{featured.text}</p>
              <div className="ds-hero-stats" style={{ marginTop: 8 }}>
                <div><strong style={{ fontSize: '1.0625rem' }}>{featured.when}</strong><span>When</span></div>
                <div><strong style={{ fontSize: '1.0625rem' }}>{featured.duration}</strong><span>Length</span></div>
                <div><strong style={{ fontSize: '1.0625rem' }}>{featured.format}</strong><span>Format</span></div>
              </div>
              <div style={{ marginTop: 28 }}>
                <Button variant="primary" to="/contact" navigate={navigate}>Register for this session</Button>
              </div>
            </div>
          </Grid>
        </Section>
      )}

      <Section
        id="upcoming"
        eyebrow="Live sessions"
        title="Running regularly"
        split
        subtitle="Each session has an agenda and time for questions. If none of them covers what you need, office hours exist precisely for that."
      >
        <div style={{ marginBottom: 32 }}>
          <Pills label="Filter by format" options={EVENT_TYPES} value={format} onChange={setFormat} />
        </div>

        {live.length === 0 ? (
          <p className="ds-body">
            No live sessions in that format right now.{' '}
            <button type="button" className="ds-link" onClick={() => setFormat(EVENT_TYPES[0])}><span>Show everything</span></button>
          </p>
        ) : (
          <Grid cols={3}>
            {live.map((event) => (
              <Card
                key={event.slug}
                image={img(event.image, 'card')}
                badge={event.type}
                eyebrow={`${event.when} · ${event.duration}`}
                title={event.title}
                text={event.text}
                link="Register"
                to="/contact"
                navigate={navigate}
              />
            ))}
          </Grid>
        )}
      </Section>

      <Section
        id="on-demand"
        variant="cream"
        eyebrow="On demand"
        title="Watch a recording instead"
        split
        subtitle="Previously recorded sessions, available whenever you need them."
      >
        {recorded.length === 0 ? (
          <p className="ds-body">
            No recordings match that filter.{' '}
            <button type="button" className="ds-link" onClick={() => setFormat(EVENT_TYPES[0])}><span>Show everything</span></button>
          </p>
        ) : (
          <Grid cols={3}>
            {recorded.map((event) => (
              <Card
                key={event.slug}
                flat
                image={img(event.image, 'card')}
                eyebrow={`Recording · ${event.duration}`}
                title={event.title}
                text={event.text}
                link="Watch it"
                to="/contact"
                navigate={navigate}
              />
            ))}
          </Grid>
        )}
      </Section>

      <Section
        id="community"
        eyebrow="User groups"
        title="Meet other operators running the same modules"
        split
        subtitle="Sector and regional groups where people compare practice. Retail, hospitality, distribution and finance leads each run their own."
        footer={<TextLink to="/community" navigate={navigate}>Explore the community</TextLink>}
      >
        <Grid cols={3}>
          <Card
            image={img('teamCollaboration', 'card')}
            title="Find a group near you"
            text="Regional groups meet to work through implementation questions and compare how different operators configure the same modules."
            link="Browse groups"
            to="/community"
            navigate={navigate}
          />
          <Card
            image={img('businessEvent', 'card')}
            title="Sector roundtables"
            text="Smaller sessions for a single industry, where the configuration questions are specific enough to be worth the focus."
            link="See sectors"
            to="/industries"
            navigate={navigate}
          />
          <Card
            image={img('teamWhiteboard', 'card')}
            title="Start your own"
            text="If there is nothing near you and you would run one, tell us. We will help with the logistics and send someone when we can."
            link="Get in touch"
            to="/contact"
            navigate={navigate}
          />
        </Grid>
      </Section>

      <CTABanner
        eyebrow="Can't wait for the next session?"
        title="Everything covered in these sessions is written down too"
        text="Setup guides, module reference and the data-loading templates are all in the documentation and the resource library."
      >
        <Button variant="primary" size="lg" to="/resources" navigate={navigate}>Resource library</Button>
        <Button variant="secondary" size="lg" to="/docs" navigate={navigate}>Documentation</Button>
      </CTABanner>
    </PageShell>
  )
}

export default EventsPage
