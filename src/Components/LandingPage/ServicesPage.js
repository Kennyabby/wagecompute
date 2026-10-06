/* ============================================================================
   /services, implementation and support.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, Checklist, FastFacts, FiftyFifty, Grid,
  Hero, Section, Tile, Tiles,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { SERVICE_TRACKS, SUPPORT_CHANNELS, IMPLEMENTATION_PHASES } from './content/programs'

const SECTIONS = [
  { id: 'tracks', label: 'Implementation' },
  { id: 'plan', label: 'The 30-day plan' },
  { id: 'support', label: 'Ongoing support' },
]

const ServicesPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => { storePath('services') }, [storePath])

  return (
    <PageShell
      title="Services & support | Enterprise Compute"
      description="Self-serve, guided onboarding or a managed multi-site rollout, plus documentation, help centre, community and open office hours once you are live."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Services' }]}
      subnavTitle="Services"
      sections={SECTIONS}
      subnavCta={{ label: 'Talk to us', to: '/contact' }}
    >
      <Hero
        eyebrow="Services & support"
        title="Getting live is the part most implementations get wrong"
        lede="Not because the software is hard, but because the decisions made in week one are the expensive ones to revisit: chart of accounts, account mapping, permission design. Choose how much help you want with them."
        image={heroImg('consultation')}
      >
        <ButtonRow>
          <Button variant="primary" to="/contact" navigate={navigate}>Discuss an engagement</Button>
          <Button variant="secondary" to="/signup" navigate={navigate}>Start on your own</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts
          cols={4}
          items={[
            { value: '4', suffix: 'weeks', label: 'Typical time from signup to a supported first close' },
            { value: '3', label: 'Engagement levels, from self-serve to managed rollout' },
            { value: 'Free', label: 'Documentation, help centre, community and office hours' },
            { value: 'Templates', label: 'For catalogue, stock, rooms and opening balances' },
          ]}
        />
      </Section>

      {/* ---------------------------------------------------------- tracks -- */}
      <Section
        id="tracks"
        eyebrow="Implementation"
        title="Three levels of help"
        subtitle="Most single-site businesses genuinely do not need us in the room. We will say so rather than sell you an engagement you do not need."
        rail
        split
      >
        <Grid cols={3}>
          {SERVICE_TRACKS.map((track) => (
            <div id={track.id} key={track.id} className="ds-card">
              <div className="ds-card-media">
                <img alt="" {...img(track.image, 'card')} />
              </div>
              <div className="ds-card-body">
                <span className="ds-card-eyebrow">{track.price}</span>
                <h3 className="ds-card-title">{track.name}</h3>
                <p className="ds-card-text"><strong>For:</strong> {track.for}</p>
                <p className="ds-card-text">{track.lede}</p>
                <Checklist items={track.includes} className="ds-mb-0" />
                <div className="ds-card-foot">
                  <Button variant="secondary" to={track.cta.to} navigate={navigate}>{track.cta.label}</Button>
                </div>
              </div>
            </div>
          ))}
        </Grid>
      </Section>

      {/* ------------------------------------------------------------ plan -- */}
      <Section
        id="plan"
        variant="cream"
        eyebrow="The 30-day plan"
        title="What a sensible implementation actually looks like"
        subtitle="This is the sequence we use on guided engagements, and the one the documentation walks you through if you are doing it yourself."
        rail
        split
      >
        <Tiles cols={4}>
          {IMPLEMENTATION_PHASES.map((phase) => (
            <Tile key={phase.phase} eyebrow={phase.phase} title={phase.title} text={phase.text} />
          ))}
        </Tiles>

        <div>
          <FiftyFifty
            eyebrow="The part worth paying attention to"
            title="Run in parallel before you cut over"
            image={img('teamDocuments', 'fifty')}
            reversed
          >
            <p className="ds-body">
              The single most useful week of any implementation is the one where you trade
              on both systems at once. Differences surface while you still have a fallback,
              and the team builds confidence in figures they can check against something
              they already trust.
            </p>
            <p className="ds-body">
              It is also the week most rollouts skip, because it feels like duplicated
              effort. It is also the cheapest possible moment to discover that your opening
              stock was wrong.
            </p>
            <ButtonRow>
              <Button variant="secondary" to="/resources" navigate={navigate}>Read the onboarding guide</Button>
              <Button variant="tertiary" to="/docs" navigate={navigate}>Documentation</Button>
            </ButtonRow>
          </FiftyFifty>
        </div>
      </Section>

      {/* --------------------------------------------------------- support -- */}
      <Section
        id="support"
        eyebrow="Ongoing support"
        title="What is available once you are live"
        subtitle="All of this is included on every plan. Priority support with agreed response expectations comes with an Enterprise agreement."
        split
        footer={(
          <ButtonRow>
            <Button variant="secondary" to="/help" navigate={navigate}>Open the help centre</Button>
            <Button variant="tertiary" to="/training" navigate={navigate}>Training and certification</Button>
          </ButtonRow>
        )}
      >
        <Grid cols={4}>
          {SUPPORT_CHANNELS.map((channel) => (
            <Tile
              key={channel.title}
              title={channel.title}
              text={channel.text}
              link={channel.link}
              to={channel.to}
              navigate={navigate}
            />
          ))}
        </Grid>
      </Section>

      <Section variant="alt" tight>
        <Grid cols={3}>
          <Card
            flat
            image={img('handshake', 'card')}
            title="Work with a partner instead"
            text="Certified implementation partners deliver the same engagements, often with sector depth we do not have in-house."
            link="Find a partner"
            to="/partners"
            navigate={navigate}
          />
          <Card
            flat
            image={img('accountant', 'card')}
            title="Bring your own accountant"
            text="Give your practice scoped read access to the ledger with no ability to change operational records. Most charts of accounts are better for it."
            link="Accounting partners"
            to="/partners"
            navigate={navigate}
          />
          <Card
            flat
            image={img('businessTraining', 'card')}
            title="Train the team properly"
            text="Four role-based learning paths and four certifications, from daily operator to workspace administrator."
            link="Training paths"
            to="/training"
            navigate={navigate}
          />
        </Grid>
      </Section>

      <CTABanner
        eyebrow="Get started"
        title="Tell us what you are rolling out"
        text="Number of sites, what you are moving from, and when you need to be live. We will tell you honestly which engagement level fits, including when the answer is none."
      >
        <Button variant="primary" size="lg" to="/contact" navigate={navigate}>Talk to us</Button>
        <Button variant="secondary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
      </CTABanner>
    </PageShell>
  )
}

export default ServicesPage
