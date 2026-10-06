/* ============================================================================
   /about, company page.
   ----------------------------------------------------------------------------
   Follows sap.com/about/company.html's structure: hero, fast-fact row,
   mission block, values, milestones, leadership, then the long-form story.

   The story section (#story, linked from the header and footer) is the
   existing PlatformStory walkthrough, unchanged, it is a genuinely good
   piece of writing and the redesign re-houses it rather than rewriting it.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import PlatformStory from './PlatformStory'
import {
  Button, ButtonRow, Card, Checklist, CTABanner, FastFacts, FiftyFifty, Grid,
  Hero, Section, TextLink, Tile, Tiles,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { COMPANY_FACTS, MISSION, VALUES, LEADERSHIP, MILESTONES } from './content/company'

const SECTIONS = [
  { id: 'mission', label: 'Mission' },
  { id: 'values', label: 'Values' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'story', label: 'The full story' },
]

const AboutPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => { storePath('about') }, [storePath])

  return (
    <PageShell
      title="About us | Enterprise Compute"
      description="Why Enterprise Compute exists, what we value, what has shipped, and the full product walkthrough told through the business it was first built for."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'About' }]}
      subnavTitle="About"
      sections={SECTIONS}
      subnavCta={{ label: 'Contact us', to: '/contact' }}
    >
      <Hero
        tone="deep"
        backgroundImage={heroImg('heroTeam', 'heroWide')}
        eyebrow="About Enterprise Compute"
        title="Serious business software for businesses that were never offered any"
        lede="Between software too simple to run a business on and software that assumes a dedicated systems team is where almost every real business actually sits. That gap is the whole reason this exists."
      >
        <ButtonRow>
          <Button variant="primary" to="/about#story" navigate={navigate}>Read the full story</Button>
          <Button variant="secondary" to="/careers" navigate={navigate}>Open roles</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts cols={4} items={COMPANY_FACTS} />
      </Section>

      {/* -------------------------------------------------------- mission -- */}
      <Section id="mission">
        <FiftyFifty
          eyebrow={MISSION.eyebrow}
          title={MISSION.title}
          image={img(MISSION.image, 'fifty')}
          titleAs="h2"
        >
          {MISSION.paragraphs.map((paragraph, index) => (
            <p className={index === 0 ? 'ds-lede' : 'ds-body'} key={index}>{paragraph}</p>
          ))}
          <ButtonRow>
            <Button variant="secondary" to="/why-enterprise-compute" navigate={navigate}>What makes it different</Button>
            <Button variant="tertiary" to="/products" navigate={navigate}>Browse the platform</Button>
          </ButtonRow>
        </FiftyFifty>
      </Section>

      {/* --------------------------------------------------------- values -- */}
      <Section
        id="values"
        variant="cream"
        eyebrow="What we value"
        title="Four commitments that show up in the code"
        subtitle="Not posters. Each of these corresponds to a specific decision you can point at in the product."
        split
      >
        <Grid cols={4}>
          {VALUES.map((value) => (
            <Card
              key={value.title}
              flat
              image={img(value.image, 'card')}
              title={value.title}
              text={value.text}
            />
          ))}
        </Grid>
      </Section>

      {/* ----------------------------------------------------- milestones -- */}
      <Section
        id="milestones"
        eyebrow="Milestones"
        title="What has actually shipped"
        subtitle="Product history rather than funding history, because the former is what affects whether this works for you."
        rail
        split
        footer={<TextLink to="/press" navigate={navigate}>Full newsroom</TextLink>}
      >
        <Tiles cols={5}>
          {MILESTONES.map((milestone) => (
            <Tile
              key={milestone.title}
              eyebrow={milestone.year}
              title={milestone.title}
              text={milestone.text}
            />
          ))}
        </Tiles>
      </Section>

      {/* ----------------------------------------------------- leadership -- */}
      <Section
        id="leadership"
        variant="alt"
        eyebrow="Leadership"
        title="How the company is run, and who owns what"
        subtitle={LEADERSHIP.placeholder ? LEADERSHIP.note : undefined}
        split={LEADERSHIP.placeholder}
      >
        {LEADERSHIP.people.length > 0 && (
          <Grid cols={4}>
            {LEADERSHIP.people.map((person) => (
              <Card
                key={person.name}
                flat
                image={person.image ? img(person.image, 'square') : undefined}
                mediaShape="square"
                eyebrow={person.role}
                title={person.name}
                text={person.bio}
              />
            ))}
          </Grid>
        )}

        <Tiles cols={4}>
          {LEADERSHIP.functions.map((fn) => (
            <Tile key={fn.title} eyebrow="Function" title={fn.title} text={fn.text}>
              <p className="ds-tile-text ds-tile-foot-note">
                {fn.contact}
              </p>
            </Tile>
          ))}
        </Tiles>

        <div>
          <FiftyFifty
            eyebrow="How we hold ourselves to it"
            title="The commitments that apply to us, not just to you"
            image={img('executiveMeeting', 'fifty')}
            reversed
          >
            <Checklist items={LEADERSHIP.governance} />
            <ButtonRow>
              <Button variant="secondary" to={LEADERSHIP.action.to} navigate={navigate}>
                {LEADERSHIP.action.label}
              </Button>
              <Button variant="tertiary" to="/trust-center" navigate={navigate}>Read the Trust Center</Button>
            </ButtonRow>
          </FiftyFifty>
        </div>
      </Section>

      {/* ---------------------------------------------------------- story -- */}
      <Section
        id="story"
        eyebrow="The full walkthrough"
        title="See exactly how it works, module by module"
        subtitle="The same detailed walkthrough we give investors and customers evaluating the platform, told as one story, from the dashboard through every module to how access and security work."
        rail
        split
      >
        <PlatformStory />
      </Section>

      <CTABanner
        eyebrow="Work with us"
        title="Whether you want to buy it, build it or sell it"
        text="Start a trial, join the team, or partner with us on implementations in your market."
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/careers" navigate={navigate}>See open roles</Button>
        <Button variant="tertiary" to="/partners" navigate={navigate}>Become a partner</Button>
      </CTABanner>
    </PageShell>
  )
}

export default AboutPage
