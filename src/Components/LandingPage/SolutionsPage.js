/* ============================================================================
   /solutions, entry points by business size, by role and by challenge.
   ----------------------------------------------------------------------------
   The three-axis structure netsuite.com uses, because a visitor arrives
   thinking in exactly one of them. Anchors match content/navigation.js so the
   mega menu can deep-link straight into the relevant block.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, CTABanner, Checklist, FiftyFifty, Grid, Hero,
  Section, TextLink, Tile, Tiles,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { BY_SIZE, BY_ROLE, BY_CHALLENGE } from './content/solutions'
import { PRODUCT_BY_SLUG } from './content/products'
import { COMPARISONS } from './content/compare'

const SECTIONS = [
  { id: 'by-size', label: 'By business size' },
  { id: 'by-role', label: 'By role' },
  { id: 'by-challenge', label: 'By challenge' },
  { id: 'moving-from', label: 'Moving from' },
]

const ModuleLinks = ({ slugs, navigate }) => (
  <div className="ds-link-list ds-mt-5">
    {slugs
      .map((slug) => PRODUCT_BY_SLUG[slug])
      .filter(Boolean)
      .map((product) => (
        <TextLink key={product.slug} to={`/products/${product.slug}`} navigate={navigate}>
          {product.name}
        </TextLink>
      ))}
  </div>
)

const SolutionsPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()

  useEffect(() => { storePath('solutions') }, [storePath])

  return (
    <PageShell
      title="Solutions | Enterprise Compute"
      description="Find the right starting point by business size, by your role, or by the problem you are trying to solve, plus what changes when you move from spreadsheets, point tools or a legacy ERP."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Solutions' }]}
      subnavTitle="Solutions"
      sections={SECTIONS}
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        eyebrow="Solutions"
        title="Start from where you actually are"
        lede="Three ways into the same platform: by the size of the business, by the job you do in it, or by the specific thing that is currently going wrong."
        image={heroImg('teamMeeting')}
      >
        <ButtonRow>
          <Button variant="primary" to="/signup" navigate={navigate}>Start a free trial</Button>
          <Button variant="secondary" to="/roi-calculator" navigate={navigate}>Model the payback</Button>
        </ButtonRow>
      </Hero>

      {/* -------------------------------------------------------- by size -- */}
      <Section
        id="by-size"
        eyebrow="By business size"
        title="What you need depends on how big the problem is"
        subtitle="We will tell you honestly when you are too small to need this. A single-site business with eight people and a working spreadsheet should usually keep the spreadsheet."
        rail
        split
      >
        <div className="ds-stack lg">
          {BY_SIZE.map((entry, index) => (
            <div id={entry.id} key={entry.id}>
              <FiftyFifty
                eyebrow={entry.shape}
                title={entry.name}
                image={img(entry.image, 'fifty')}
                reversed={index % 2 === 1}
              >
                <p className="ds-lede">{entry.lede}</p>
                <Checklist items={entry.points} />
                <ButtonRow>
                  <Button variant="secondary" to={entry.cta.to} navigate={navigate}>{entry.cta.label}</Button>
                </ButtonRow>
                <ModuleLinks slugs={entry.modules} navigate={navigate} />
              </FiftyFifty>
            </div>
          ))}
        </div>
      </Section>

      {/* -------------------------------------------------------- by role -- */}
      <Section
        id="by-role"
        variant="alt"
        eyebrow="By role"
        title="The question each person actually arrives with"
        subtitle="Five jobs, five different reasons to care, all served by the same underlying records."
        rail
        split
      >
        <Grid cols={3}>
          {BY_ROLE.map((entry) => (
            <div id={entry.id} key={entry.id}>
              <Card
                image={img(entry.image, 'card')}
                eyebrow={entry.name}
                title={entry.question}
                text={entry.lede}
              >
                <Checklist items={entry.points} />
                <ModuleLinks slugs={entry.modules} navigate={navigate} />
              </Card>
            </div>
          ))}
        </Grid>
      </Section>

      {/* --------------------------------------------------- by challenge -- */}
      <Section
        id="by-challenge"
        eyebrow="By challenge"
        title="Four problems, and what actually fixes each"
        subtitle="Not features. Structural answers, because each of these is caused by a design decision somewhere else, and features do not undo architecture."
        rail
        split
      >
        <div className="ds-stack lg">
          {BY_CHALLENGE.map((entry, index) => (
            <div id={entry.id} key={entry.id}>
              <FiftyFifty
                eyebrow={`Challenge ${String(index + 1).padStart(2, '0')}`}
                title={entry.name}
                image={img(entry.image, 'fifty')}
                reversed={index % 2 === 1}
              >
                <p className="ds-body"><strong>What it looks like.</strong> {entry.symptom}</p>
                <p className="ds-body"><strong>What fixes it.</strong> {entry.answer}</p>
                <Checklist items={entry.proof} />
                <ModuleLinks slugs={entry.modules} navigate={navigate} />
              </FiftyFifty>
            </div>
          ))}
        </div>
      </Section>

      {/* -------------------------------------------------- moving from --- */}
      <Section
        id="moving-from"
        variant="cream"
        eyebrow="Moving from"
        title="What you are leaving behind, and what that costs"
        subtitle="Each comparison also says where the alternative is genuinely better, because a comparison that wins everything reads as marketing and gets discarded."
        rail
        split
        footer={<TextLink to="/why-enterprise-compute" navigate={navigate}>Read the full comparisons</TextLink>}
      >
        <Tiles cols={4}>
          {COMPARISONS.map((comparison) => (
            <Tile
              key={comparison.id}
              eyebrow="Comparison"
              title={comparison.name}
              text={comparison.headline}
              link="Compare"
              to={`/why-enterprise-compute#${comparison.id}`}
              navigate={navigate}
            />
          ))}
        </Tiles>
      </Section>

      <CTABanner
        eyebrow="Get started"
        title="Try it against your own numbers"
        text="Every module is unlocked for fourteen days. Load your catalogue from the templates, put the team on it, and see whether the figures hold."
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/pricing" navigate={navigate}>Build your plan</Button>
        <Button variant="tertiary" to="/contact" navigate={navigate}>Talk to sales</Button>
      </CTABanner>
    </PageShell>
  )
}

export default SolutionsPage
