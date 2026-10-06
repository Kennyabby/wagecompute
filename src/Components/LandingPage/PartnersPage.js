/* ============================================================================
   /partners, the partner ecosystem.
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
import { PARTNER_PROGRAMS, CERTIFICATIONS } from './content/programs'

const SECTIONS = [
  { id: 'programs', label: 'Programmes' },
  { id: 'why', label: 'Why partner' },
  { id: 'certification', label: 'Certification' },
  { id: 'find', label: 'Find a partner' },
]

const PartnersPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => { storePath('partners') }, [storePath])

  return (
    <PageShell
      title="Partners | Enterprise Compute"
      description="Implementation, accounting, technology and referral partnerships, with certification, deal registration, and direct access to the engineering team."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Partners' }]}
      subnavTitle="Partners"
      sections={SECTIONS}
      subnavCta={{ label: 'Become a partner', to: '/contact' }}
    >
      <Hero
        tone="deep"
        backgroundImage={heroImg('handshake', 'heroWide')}
        eyebrow="Partner network"
        title="Deliver it, advise on it, build on it, or refer it"
        lede="Four programmes for four different relationships. All of them assume you know your market better than we do, which is the only reason a partner network is worth having."
      >
        <ButtonRow>
          <Button variant="primary" to="/contact" navigate={navigate}>Become a partner</Button>
          <Button variant="secondary" to="/contact" navigate={navigate}>Find a partner</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts
          cols={4}
          items={[
            { value: '4', label: 'Programmes, from implementation to referral' },
            { value: '4', label: 'Certifications, including a partner track' },
            { value: 'Direct', label: 'Line to the engineering team for technology partners' },
            { value: 'Registered', label: 'Deals, so your pipeline is protected' },
          ]}
        />
      </Section>

      {/* ------------------------------------------------------- programs -- */}
      <Section
        id="programs"
        eyebrow="Programmes"
        title="Four ways to work together"
        subtitle="Pick the one that matches what you already do rather than what you would have to become."
        rail
        split
      >
        <Grid cols={2}>
          {PARTNER_PROGRAMS.map((program) => (
            <div className="ds-card" key={program.name}>
              <div className="ds-card-media">
                <img alt="" {...img(program.image, 'card')} />
              </div>
              <div className="ds-card-body">
                <h3 className="ds-card-title">{program.name}</h3>
                <p className="ds-card-text">{program.text}</p>
                <Checklist items={program.points} className="ds-mb-0" />
                <div className="ds-card-foot">
                  <Button variant="secondary" to="/contact" navigate={navigate}>Apply to this programme</Button>
                </div>
              </div>
            </div>
          ))}
        </Grid>
      </Section>

      {/* ------------------------------------------------------------ why -- */}
      <Section id="why" variant="cream">
        <FiftyFifty
          eyebrow="Why partner"
          title="A platform small enough that your feedback changes it"
          image={img('consultation', 'fifty')}
          titleAs="h2"
        >
          <p className="ds-body">
            The honest pitch: we are not the largest ERP vendor and partnering with us
            does not come with the brand recognition of one. What it does come with is a
            roadmap you can actually influence, a team that answers directly, and
            commercial terms set in a conversation rather than by a portal.
          </p>
          <Checklist
            items={[
              'Roadmap priorities set largely by what partners and customers ask for',
              'Direct access to the people building the product, not a partner tier',
              'Per-module pricing with unlimited users, which is easy to sell honestly',
              'Sectors we have no depth in are the ones we most want partners for',
            ]}
          />
          <ButtonRow>
            <Button variant="secondary" to="/contact" navigate={navigate}>Start a conversation</Button>
            <Button variant="tertiary" to="/integrations" navigate={navigate}>See the technical roadmap</Button>
          </ButtonRow>
        </FiftyFifty>
      </Section>

      {/* --------------------------------------------------- certification -- */}
      <Section
        id="certification"
        eyebrow="Certification"
        title="Prove capability to your clients"
        subtitle="Four certifications. The partner track covers data migration, rollout sequencing and handover specifically."
        rail
        split
        footer={<TextLink to="/training" navigate={navigate}>See the full training paths</TextLink>}
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
      </Section>

      {/* ----------------------------------------------------------- find -- */}
      <Section
        id="find"
        variant="alt"
        eyebrow="Find a partner"
        title="Looking for help rather than offering it?"
        subtitle="Certified partners deliver the same implementation engagements we do, often with sector depth we do not have in-house."
        rail
        split
      >
        <Grid cols={3}>
          <Card
            flat
            image={img('consultation', 'card')}
            title="Implementation help"
            text="Multi-site rollouts, data migration and training, delivered by a certified partner in your market."
            link="Request an introduction"
            to="/contact"
            navigate={navigate}
          />
          <Card
            flat
            image={img('accountant', 'card')}
            title="An accounting practice"
            text="Practices that know the platform and can design your chart of accounts and own the mapping."
            link="Request an introduction"
            to="/contact"
            navigate={navigate}
          />
          <Card
            flat
            image={img('businessTraining', 'card')}
            title="Or do it yourself"
            text="Most single-site businesses genuinely do not need a partner. The documentation and templates cover it."
            link="Implementation services"
            to="/services"
            navigate={navigate}
          />
        </Grid>
      </Section>

      <CTABanner
        eyebrow="Get in touch"
        title="Tell us what you do and who you serve"
        text="We will tell you which programme fits, what the terms look like, and whether we think there is a real opportunity, including when we do not."
      >
        <Button variant="primary" size="lg" to="/contact" navigate={navigate}>Become a partner</Button>
        <Button variant="secondary" size="lg" to="/products" navigate={navigate}>Explore the platform first</Button>
      </CTABanner>
    </PageShell>
  )
}

export default PartnersPage
