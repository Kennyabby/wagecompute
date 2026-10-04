/* ============================================================================
   /trust-center — security, privacy, availability and governance.
   ----------------------------------------------------------------------------
   SAP's Trust Center is one of the genuinely good patterns on their site:
   everything a security reviewer needs in one destination rather than
   scattered across legal pages. This follows it, including the honest
   statement about formal certification — see content/trust.js.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Accordion, Button, ButtonRow, Card, CTABanner, Container, FastFacts,
  FiftyFifty, Grid, Hero, Section, TextLink, Tile, Tiles,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { TRUST_PILLARS, CERTIFICATION_POSTURE, TRUST_FAQS } from './content/trust'

const TrustCenterPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => { storePath('trust-center') }, [storePath])

  const sections = [
    ...TRUST_PILLARS.map((pillar) => ({ id: pillar.id, label: pillar.name })),
    { id: 'certification', label: 'Certification' },
    { id: 'faq', label: 'FAQ' },
  ]

  return (
    <PageShell
      title="Trust Center | Enterprise Compute"
      description="Security, privacy, availability and governance at Enterprise Compute: the controls we actually operate, and an honest statement of where we stand on formal certification."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Trust Center' }]}
      subnavTitle="Trust Center"
      sections={sections}
      subnavCta={{ label: 'Request a review', to: '/contact' }}
    >
      <Hero
        tone="deep"
        backgroundImage={heroImg('dataCentre', 'heroWide')}
        eyebrow="Trust Center"
        title="The controls we operate, stated plainly"
        lede="Access control, tenant isolation, audit trails, encryption and resilience. What is actually implemented today, and what is not. No badges we have not earned."
      >
        <ButtonRow>
          <Button variant="primary" to="/contact" navigate={navigate}>Request a security review</Button>
          <Button variant="secondary" to="/privacy" navigate={navigate}>Read the privacy policy</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts
          cols={4}
          items={[
            { value: 'Per action', label: 'Permission granularity, applied identically everywhere' },
            { value: 'Per tenant', label: 'Data isolation, resolved before any handler runs' },
            { value: 'Every', label: 'Posted record carries an audit trail' },
            { value: 'Offline', label: 'Operation continues through an outage' },
          ]}
        />
      </Section>

      {TRUST_PILLARS.map((pillar, index) => (
        <Section
          key={pillar.id}
          id={pillar.id}
          variant={index % 2 === 1 ? 'cream' : undefined}
          eyebrow={pillar.name}
          title={pillar.headline}
          subtitle={pillar.text}
          split
        >
          <Grid cols={3}>
            <Card flat image={img(pillar.image, 'cardTall')} mediaShape="tall" />
            <div style={{ gridColumn: 'span 2' }}>
              <Tiles cols={2}>
                {pillar.points.map((point) => (
                  <Tile key={point.title} title={point.title} text={point.text} />
                ))}
              </Tiles>
            </div>
          </Grid>
        </Section>
      ))}

      {/* -------------------------------------------------- certification -- */}
      <Section id="certification" variant="deep-grad">
        <Container width="narrow">
          <span className="ds-eyebrow">Certification</span>
          <h2 className="ds-h2">{CERTIFICATION_POSTURE.title}</h2>
          {CERTIFICATION_POSTURE.body.map((paragraph, index) => (
            <p className="ds-lede" key={index}>{paragraph}</p>
          ))}
          <ButtonRow>
            <Button variant="primary" to={CERTIFICATION_POSTURE.action.to} navigate={navigate}>
              {CERTIFICATION_POSTURE.action.label}
            </Button>
          </ButtonRow>
        </Container>
      </Section>

      {/* ------------------------------------------------- your own duties -- */}
      <Section
        eyebrow="Your obligations"
        title="The controls exist partly so you can meet your own"
        subtitle="Most of what an auditor asks a business for is a question about records rather than about infrastructure. Who approved this, who could have changed it, where did this figure come from."
        split
      >
        <FiftyFifty
          eyebrow="Demonstrable control"
          title="Segregation of duties is a permission setting, not a policy document"
          image={img('executiveMeeting', 'fifty')}
          reversed
        >
          <p className="ds-body">
            Because permissions are granted per action rather than per screen, the person
            who raises a purchase order need not be the person who approves it or the one
            who receives the goods. That separation is enforced by the system rather than
            described in a handbook nobody reads.
          </p>
          <p className="ds-body">
            Combined with reversing entries instead of deletions, locked period closings
            and reason-coded stock adjustments, the result is that the default state of
            the data is auditable. You are not preparing for an audit, you are showing
            somebody what is already there.
          </p>
          <ButtonRow>
            <Button variant="secondary" to="/products/settings" navigate={navigate}>Governance and access control</Button>
            <Button variant="tertiary" to="/products/journals" navigate={navigate}>How the ledger records changes</Button>
          </ButtonRow>
        </FiftyFifty>
      </Section>

      {/* ------------------------------------------------------------ FAQ -- */}
      <Section id="faq" variant="alt" eyebrow="FAQ" title="Questions security reviewers actually ask">
        <Container width="narrow">
          <Accordion items={TRUST_FAQS} />
        </Container>
      </Section>

      <Section tight>
        <Container width="narrow">
          <div className="ds-center">
            <h2 className="ds-h3">Legal documents</h2>
            <p className="ds-body">
              The binding commitments live in the policy documents rather than on this page.
            </p>
            <div className="ds-link-list" style={{ justifyContent: 'center' }}>
              <TextLink to="/privacy" navigate={navigate}>Privacy policy</TextLink>
              <TextLink to="/terms" navigate={navigate}>Terms of service</TextLink>
              <TextLink to="/cookie-policy" navigate={navigate}>Cookie policy</TextLink>
              <TextLink to="/security" navigate={navigate}>Security practices</TextLink>
            </div>
          </div>
        </Container>
      </Section>

      <CTABanner
        eyebrow="Evaluating us"
        title="Send us your security questionnaire"
        text="We will answer it in detail and walk your team through the tenancy model, the permission system and the audit trail. If a formal certification is a procurement requirement, say so early."
      >
        <Button variant="primary" size="lg" to="/contact" navigate={navigate}>Request a security review</Button>
        <Button variant="secondary" size="lg" to="/products/settings" navigate={navigate}>See the permission model</Button>
      </CTABanner>
    </PageShell>
  )
}

export default TrustCenterPage
