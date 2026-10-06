/* ============================================================================
   /products/:slug, one page per module.
   ----------------------------------------------------------------------------
   Driven entirely from content/products.js, so adding a module is a content
   change rather than a new component. Section order follows sap.com's product
   pages: hero, what it is, capabilities, how it works, outcomes, what it
   works with, FAQ, CTA.

   An unknown slug renders a real "not found" state with routes out, rather
   than a blank page or a crash.
   ========================================================================= */

import { useContext, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Accordion, Button, ButtonRow, Card, CTABanner, Container, FastFacts,
  Grid, Hero, Section, TextLink, Tile, Tiles,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { PRODUCT_BY_SLUG, PRODUCT_CATEGORIES, PRODUCTS } from './content/products'
import { INDUSTRIES } from './content/industries'

const CATEGORY_NAME = PRODUCT_CATEGORIES.reduce((acc, category) => {
  acc[category.key] = category.name
  return acc
}, {})

const NotFound = ({ navigate }) => (
  <PageShell
    title="Product not found | Enterprise Compute"
    breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Products', to: '/products' }, { name: 'Not found' }]}
  >
    <Hero
      eyebrow="Not found"
      title="We could not find that product"
      lede="The link may be out of date. The full catalogue is one click away, and search covers every module, industry and guide on the site."
      image={heroImg('officeWorker')}
    >
      <ButtonRow>
        <Button variant="primary" to="/products" navigate={navigate}>Browse all products</Button>
        <Button variant="secondary" to="/" navigate={navigate}>Back to home</Button>
      </ButtonRow>
    </Hero>
    <Section eyebrow="Popular modules" title="You may have been looking for one of these">
      <Tiles cols={4}>
        {['pos', 'inventory', 'payroll', 'journals'].map((slug) => {
          const product = PRODUCT_BY_SLUG[slug]
          return (
            <Tile
              key={slug}
              title={product.name}
              text={product.summary}
              link="Explore"
              to={`/products/${slug}`}
              navigate={navigate}
            />
          )
        })}
      </Tiles>
    </Section>
  </PageShell>
)

const ProductDetailPage = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { storePath } = useContext(ContextProvider)
  const product = PRODUCT_BY_SLUG[slug]

  useEffect(() => { storePath('products') }, [storePath])

  if (!product) return <NotFound navigate={navigate} />

  const related = (product.worksWith || [])
    .map((key) => PRODUCT_BY_SLUG[key])
    .filter(Boolean)

  // Industries that list this module are a genuinely useful cross-link, and
  // they are derivable rather than hand-maintained per product.
  const relevantIndustries = INDUSTRIES
    .filter((industry) => (industry.modules || []).includes(product.slug))
    .slice(0, 4)

  const sameCategory = PRODUCTS
    .filter((p) => p.category === product.category && p.slug !== product.slug)
    .slice(0, 4)

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'capabilities', label: 'Capabilities' },
    ...(product.howItWorks ? [{ id: 'how-it-works', label: 'How it works' }] : []),
    ...(related.length ? [{ id: 'works-with', label: 'Works with' }] : []),
    ...(product.faqs ? [{ id: 'faq', label: 'FAQ' }] : []),
  ]

  const tierLabel = product.tier === 'free'
    ? 'Free on every plan'
    : product.perSeat
      ? 'Paid add-on · per seat'
      : product.billable === false
        ? 'Platform capability'
        : 'Priced module'

  return (
    <PageShell
      title={`${product.name} | Enterprise Compute`}
      description={product.summary}
      breadcrumbs={[
        { name: 'Home', to: '/' },
        { name: 'Products', to: '/products' },
        { name: product.name },
      ]}
      subnavTitle={product.name}
      sections={sections}
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        eyebrow={product.eyebrow}
        title={product.title}
        lede={product.lede}
        image={heroImg(product.heroImage)}
      >
        <ButtonRow>
          <Button variant="primary" to="/signup" navigate={navigate}>Start a free trial</Button>
          <Button variant="secondary" to="/pricing" navigate={navigate}>See pricing</Button>
        </ButtonRow>
        <p className="ds-note">
          <span className="ds-tag">{tierLabel}</span>
          <span className="ds-inline-meta">{CATEGORY_NAME[product.category]}</span>
        </p>
      </Hero>

      {/* -------------------------------------------------------- overview -- */}
      <Section id="overview" variant="alt" tight>
        <FastFacts cols={product.outcomes.length === 4 ? 4 : 3} items={product.outcomes} />
      </Section>

      {/* ---------------------------------------------------- capabilities -- */}
      <Section
        id="capabilities"
        eyebrow="Capabilities"
        title={`What ${product.name} does`}
        subtitle={product.summary}
        rail
        split
      >
        <Tiles cols={3}>
          {product.capabilities.map((capability) => (
            <Tile key={capability.title} title={capability.title} text={capability.text} />
          ))}
        </Tiles>
      </Section>

      {/* ---------------------------------------------------- how it works -- */}
      {product.howItWorks && (
        <Section
          id="how-it-works"
          variant="cream"
          eyebrow="How it works"
          title="The sequence, start to finish"
          subtitle="Each step produces a record. Nothing in this chain requires a second person to retype what the previous step already captured."
          rail
        split
        >
          <Grid cols={product.howItWorks.length === 4 ? 4 : 3}>
            {product.howItWorks.map((step, index) => (
              <div key={step.step}>
                <div className="ds-fact" style={{ borderTopWidth: 3 }}>
                  <div className="ds-fact-value" style={{ fontSize: '2rem' }}>{String(index + 1).padStart(2, '0')}</div>
                  <h3 className="ds-h4 ds-step-title">{step.step}</h3>
                  <p className="ds-body sm ds-mb-0">{step.text}</p>
                </div>
              </div>
            ))}
          </Grid>
        </Section>
      )}

      {/* ----------------------------------------------------- works with -- */}
      {related.length > 0 && (
        <Section
          id="works-with"
          eyebrow="Works with"
          title={`What ${product.name} connects to`}
          subtitle="These are not integrations. They are the same records, read and written by different parts of the same system."
          split
          footer={<TextLink to="/products" navigate={navigate}>Browse the full catalogue</TextLink>}
        >
          <Grid cols={4}>
            {related.map((item) => (
              <Card
                key={item.slug}
                flat
                image={img(item.cardImage, 'card')}
                eyebrow={item.tier === 'free' ? 'Free on every plan' : 'Priced module'}
                title={item.name}
                text={item.summary}
                link="Explore"
                to={`/products/${item.slug}`}
                navigate={navigate}
              />
            ))}
          </Grid>
        </Section>
      )}

      {/* ------------------------------------------------------ industries -- */}
      {relevantIndustries.length > 0 && (
        <Section
          variant="alt"
          eyebrow="In practice"
          title={`Where ${product.name} earns its place`}
          subtitle="Sectors whose standard configuration includes this module."
          split
          footer={<TextLink to="/industries" navigate={navigate}>All industries</TextLink>}
        >
          <Grid cols={4}>
            {relevantIndustries.map((industry) => (
              <Card
                key={industry.slug}
                flat
                image={img(industry.cardImage, 'card')}
                title={industry.name}
                text={industry.summary}
                link="Explore"
                to={`/industries/${industry.slug}`}
                navigate={navigate}
              />
            ))}
          </Grid>
        </Section>
      )}

      {/* ------------------------------------------------------------ FAQ -- */}
      {product.faqs && (
        <Section
        rail id="faq" eyebrow="FAQ" title="Questions people ask about this module">
          <Container width="narrow" className="ds-mt-0" >
            <Accordion items={product.faqs} />
          </Container>
        </Section>
      )}

      {/* ------------------------------------------------- same category --- */}
      {sameCategory.length > 0 && (
        <Section
        rail
          variant="cream"
          eyebrow={CATEGORY_NAME[product.category]}
          title="Other modules in this group"
          tight
        >
          <Tiles cols={4}>
            {sameCategory.map((item) => (
              <Tile
                key={item.slug}
                title={item.name}
                text={item.summary}
                link="Explore"
                to={`/products/${item.slug}`}
                navigate={navigate}
              />
            ))}
          </Tiles>
        </Section>
      )}

      <CTABanner
        eyebrow="Get started"
        title={`Try ${product.name} with everything else unlocked`}
        text="The free trial opens every module for fourteen days, so you can see how this one behaves alongside the rest before deciding what to keep."
      >
        <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
        <Button variant="secondary" size="lg" to="/pricing" navigate={navigate}>Build your plan</Button>
        <Button variant="tertiary" to="/docs" navigate={navigate}>Read the documentation</Button>
      </CTABanner>
    </PageShell>
  )
}

export default ProductDetailPage
