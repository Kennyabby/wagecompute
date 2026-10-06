/* ============================================================================
   /training, learning paths and certification.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, Checklist, FastFacts, FiftyFifty, Grid,
  Hero, Section, TextLink, Tile, Tiles,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { LEARNING_PATHS, CERTIFICATIONS } from './content/programs'
import { EVENTS } from './content/resources'

const SECTIONS = [
  { id: 'paths', label: 'Learning paths' },
  { id: 'certification', label: 'Certification' },
  { id: 'live', label: 'Live sessions' },
]

const TrainingPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => { storePath('training') }, [storePath])

  const liveSessions = EVENTS.filter((event) => event.format !== 'Recording').slice(0, 3)

  return (
    <PageShell
      title="Training & certification | Enterprise Compute"
      description="Four role-based learning paths for operator, supervisor, finance and administrator, plus four certifications from foundation to partner level."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Training' }]}
      subnavTitle="Training"
      sections={SECTIONS}
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        tone="deep"
        backgroundImage={heroImg('businessTraining', 'heroWide')}
        eyebrow="Training & certification"
        title="Teach each person what their job needs, and nothing else"
        lede="A cashier does not need to understand period closings. An accountant does not need the delivery reconciliation screen. Four paths, built around the roles businesses actually employ."
      >
        <ButtonRow>
          <Button variant="primary" to="/contact" navigate={navigate}>Arrange training</Button>
          <Button variant="secondary" to="/docs" navigate={navigate}>Self-serve documentation</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts
          cols={4}
          items={[
            { value: '4', label: 'Role-based learning paths' },
            { value: '4', label: 'Certifications, foundation to partner level' },
            { value: '2', suffix: 'hrs', label: 'To get a daily operator fully productive' },
            { value: 'Free', label: 'Documentation and monthly live sessions' },
          ]}
        />
      </Section>

      {/* ----------------------------------------------------------- paths -- */}
      <Section
        id="paths"
        eyebrow="Learning paths"
        title="Four audiences, four curricula"
        subtitle="Each path assumes no prior knowledge of the platform and ends with the person able to do their actual job unsupervised."
        rail
        split
      >
        <div className="ds-stack lg">
          {LEARNING_PATHS.map((path, index) => (
            <div id={path.id} key={path.id}>
              <FiftyFifty
                eyebrow={`${path.audience} · ${path.duration}`}
                title={path.name}
                image={img(path.image, 'fifty')}
                reversed={index % 2 === 1}
              >
                <p className="ds-lede">{path.lede}</p>
                <Checklist items={path.modules} />
                <ButtonRow>
                  <Button variant="secondary" to="/contact" navigate={navigate}>Arrange this path</Button>
                  <Button variant="tertiary" to="/docs" navigate={navigate}>Read it yourself</Button>
                </ButtonRow>
              </FiftyFifty>
            </div>
          ))}
        </div>
      </Section>

      {/* --------------------------------------------------- certification -- */}
      <Section
        id="certification"
        variant="cream"
        eyebrow="Certification"
        title="Prove it, for yourself or for a client"
        subtitle="Useful for staff moving between sites, for practices advising clients, and for partners delivering implementations."
        rail
        split
      >
        <Tiles cols={4}>
          {CERTIFICATIONS.map((certification) => (
            <Tile
              key={certification.name}
              eyebrow={certification.level}
              title={certification.name}
              text={certification.text}
            />
          ))}
        </Tiles>
        <div className="ds-section-foot">
          <ButtonRow>
            <Button variant="secondary" to="/contact" navigate={navigate}>Enquire about certification</Button>
            <Button variant="tertiary" to="/partners" navigate={navigate}>Partner certification track</Button>
          </ButtonRow>
        </div>
      </Section>

      {/* ------------------------------------------------------------ live -- */}
      <Section
        id="live"
        eyebrow="Live sessions"
        title="Learn alongside other operators"
        subtitle="Monthly workshops and webinars covering the same ground as the paths above, with the advantage that you can ask questions."
        rail
        split
        footer={<TextLink to="/events" navigate={navigate}>All events and recordings</TextLink>}
      >
        <Grid cols={3}>
          {liveSessions.map((event) => (
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
        eyebrow="Get started"
        title="Train the team on a workspace they can break safely"
        text="Start a free trial, load the sample data from the templates, and let people learn on something that is not your live business."
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/contact" navigate={navigate}>Arrange training</Button>
      </CTABanner>
    </PageShell>
  )
}

export default TrainingPage
