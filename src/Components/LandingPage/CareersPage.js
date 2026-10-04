/* ============================================================================
   /careers
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, FastFacts, FiftyFifty, Grid, Hero,
  Section, TextLink, Tile, Tiles,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { CAREERS_INTRO, HOW_WE_WORK, BENEFITS, OPEN_ROLES } from './content/company'

const SECTIONS = [
  { id: 'roles', label: 'Open roles' },
  { id: 'how-we-work', label: 'How we work' },
  { id: 'benefits', label: 'Benefits' },
]

const CareersPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => { storePath('careers') }, [storePath])

  return (
    <PageShell
      title="Careers | Enterprise Compute"
      description="Engineering, design, services and operations roles on a small team building the accounting engine, the offline layer and a records-grounded AI assistant."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Careers' }]}
      subnavTitle="Careers"
      sections={SECTIONS}
      subnavCta={{ label: 'Apply', to: '/contact' }}
    >
      <Hero
        eyebrow={CAREERS_INTRO.eyebrow}
        title={CAREERS_INTRO.title}
        lede={CAREERS_INTRO.lede}
        image={heroImg(CAREERS_INTRO.image)}
      >
        <ButtonRow>
          <Button variant="primary" onClick={() => document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' })}>
            See open roles
          </Button>
          <Button variant="secondary" to="/about" navigate={navigate}>About the company</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts
          cols={4}
          items={[
            { value: String(OPEN_ROLES.length), label: 'Roles currently open' },
            { value: 'Remote', label: 'First, and genuinely so. Written decisions by default' },
            { value: 'End to end', label: 'Ownership: you talk to operators and decide what to build' },
            { value: 'Hard', label: 'Problems: a ledger, an offline engine, a grounded assistant' },
          ]}
        />
      </Section>

      {/* ----------------------------------------------------------- roles -- */}
      <Section
        id="roles"
        eyebrow="Open roles"
        title="What we are hiring for"
        subtitle="If none of these fit but you think you should be here, say so anyway. We read every one of those."
        split
        footer={(
          <ButtonRow>
            <Button variant="secondary" to="/contact" navigate={navigate}>Apply or ask a question</Button>
          </ButtonRow>
        )}
      >
        <Tiles cols={3}>
          {OPEN_ROLES.map((role) => (
            <Tile
              key={role.title}
              eyebrow={`${role.dept} · ${role.location} · ${role.type}`}
              title={role.title}
              text={role.text}
              link="Apply"
              to="/contact"
              navigate={navigate}
            />
          ))}
        </Tiles>
      </Section>

      {/* ---------------------------------------------------- how we work -- */}
      <Section
        id="how-we-work"
        variant="cream"
        eyebrow="How we work"
        title="Four things that are actually true here"
        subtitle="Written as claims you could check in your first month, rather than as culture language."
        split
      >
        <Grid cols={4}>
          {HOW_WE_WORK.map((item) => (
            <Tile key={item.title} title={item.title} text={item.text} />
          ))}
        </Grid>

        <div style={{ marginTop: 'clamp(48px, 6vw, 80px)' }}>
          <FiftyFifty
            eyebrow="The work itself"
            title="Correctness is the product, not a quality gate"
            image={img('developerScreens', 'fifty')}
            reversed
          >
            <p className="ds-body">
              This is accounting and stock. A plausible-looking wrong number is worse than
              a visible failure, because somebody will act on it. That changes how we
              review code, how we design APIs and what we are willing to ship on a Friday.
            </p>
            <p className="ds-body">
              It also makes the work unusually satisfying. A general ledger written live by
              operations, an offline queue that cannot double-post, an assistant
              constrained to the asking user's own permissions: these are real
              engineering problems with correct and incorrect answers.
            </p>
            <TextLink to="/blog" navigate={navigate}>Read how the team thinks about them</TextLink>
          </FiftyFifty>
        </div>
      </Section>

      {/* -------------------------------------------------------- benefits -- */}
      <Section
        id="benefits"
        eyebrow="Benefits"
        title="The practical side"
        split
        subtitle="Nothing exotic. The things that actually make a job sustainable."
      >
        <Grid cols={4}>
          {BENEFITS.map((benefit) => (
            <Card
              key={benefit.title}
              flat
              image={img(benefit.image, 'card')}
              title={benefit.title}
              text={benefit.text}
            />
          ))}
        </Grid>
      </Section>

      <CTABanner
        eyebrow="Get in touch"
        title="Tell us what you would want to work on"
        text="Send the role you are interested in, or the problem you want to own. A short note about something you have built beats a long CV."
      >
        <Button variant="primary" size="lg" to="/contact" navigate={navigate}>Apply now</Button>
        <Button variant="secondary" size="lg" to="/about#story" navigate={navigate}>Read the product story first</Button>
      </CTABanner>
    </PageShell>
  )
}

export default CareersPage
