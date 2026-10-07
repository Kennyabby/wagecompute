/* ============================================================================
   /blog, the index, and /blog/:slug, an article.
   ----------------------------------------------------------------------------
   Both live here because they share the post list, the pillar filter, the
   theme and the related-article logic. App.js imports BlogPage for the index
   and BlogPostPage for an article.

   Content and appearance both come from ds/useBlogContent, which prefers what
   the central admin has published and falls back to the committed content in
   content/blog. The page itself does not know or care which it received.
   ========================================================================= */

import { useContext, useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import { Button, ButtonRow, CTABanner, Section } from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { BlogBody } from './ds/BlogBlocks'
import { buildReferenceIndex, headingsOf, readingMinutes } from './ds/blogMarkup'
import useBlogContent from './ds/useBlogContent'
import { articleSchema } from './ds/seo'
import {
  PILLARS, PILLAR_BY_KEY, pillarName, authorFor, SOURCES,
  postBySlug, postsInPillar, relatedPosts, featuredPost, searchPosts,
} from './content/blog'
import './ds/blog.css'

const formatDate = (iso) => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** The data attributes the stylesheet themes from. */
const themeAttributes = (theme) => ({
  'data-accent': theme.accent,
  'data-surface': theme.surface,
  'data-measure': theme.measure,
  'data-body-font': theme.bodyFont,
  'data-display-font': theme.displayFont,
})

const PostMeta = ({ post, theme }) => (
  <p className="blog-meta">
    <span>{formatDate(post.date)}</span>
    {theme.showReadingTime && <span>{post.minutes || readingMinutes(post)} min read</span>}
  </p>
)

const PostCard = ({ post, navigate, theme }) => (
  <button type="button" className="blog-card" onClick={() => navigate(`/blog/${post.slug}`)}>
    <span className="blog-card-visual">
      <img {...img(post.image, 'card')} alt="" />
    </span>
    <span className="blog-card-body">
      <span className="blog-card-topic">{pillarName(post.pillar)}</span>
      <span className="blog-card-title">{post.title}</span>
      <span className="blog-card-excerpt">{post.excerpt}</span>
      <PostMeta post={post} theme={theme} />
    </span>
  </button>
)

/* ============================================================== index ==== */

export const BlogPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()
  const { theme, posts } = useBlogContent()
  const [pillar, setPillar] = useState('all')
  const [query, setQuery] = useState('')

  useEffect(() => { storePath('blog') }, [storePath])

  const lead = useMemo(() => featuredPost(posts, theme), [posts, theme])

  const visible = useMemo(() => {
    const inPillar = postsInPillar(pillar, posts)
    const found = searchPosts(query, inPillar)
    // The lead is already shown above in full, so it is not repeated below
    // unless a filter is active, where its absence would be confusing.
    return pillar === 'all' && !query && lead ? found.filter((p) => p.slug !== lead.slug) : found
  }, [pillar, query, posts, lead])

  const available = useMemo(
    () => PILLARS.filter((p) => posts.some((post) => post.pillar === p.key)),
    [posts]
  )

  return (
    <PageShell
      title="Blog | Enterprise Compute"
      description="Writing on margin, stock, people, infrastructure and the decisions behind them. Useful whether or not you ever buy anything from us."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Blog' }]}
      subnavTitle="Blog"
    >
      <div className="blog-root blog-index" {...themeAttributes(theme)}>
        <Section
          eyebrow={theme.intro.eyebrow}
          title={theme.intro.title}
          subtitle={theme.intro.lede}
          split
        >
          {lead && (
            <div className="blog-lead">
              <div className="blog-lead-copy">
                <span className="blog-card-topic">{pillarName(lead.pillar)}</span>
                <h2 className="blog-lead-title">{lead.title}</h2>
                <p className="blog-lead-excerpt">{lead.excerpt}</p>
                <PostMeta post={lead} theme={theme} />
                <ButtonRow>
                  <Button variant="primary" to={`/blog/${lead.slug}`} navigate={navigate}>Read it</Button>
                </ButtonRow>
              </div>
              <button
                type="button"
                className="blog-lead-visual"
                aria-label={`Read ${lead.title}`}
                onClick={() => navigate(`/blog/${lead.slug}`)}
              >
                <img {...img(lead.image, 'fifty')} alt="" />
              </button>
            </div>
          )}
        </Section>

        <Section flushTop>
          <div className="blog-controls">
            <div className="blog-topics">
              <button
                type="button"
                className={`blog-topic${pillar === 'all' ? ' blog-topic-on' : ''}`}
                onClick={() => setPillar('all')}
              >
                Everything
              </button>
              {available.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`blog-topic${pillar === item.key ? ' blog-topic-on' : ''}`}
                  onClick={() => setPillar(item.key)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <input
              type="search"
              className="blog-search"
              placeholder="Search the blog"
              aria-label="Search the blog"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {pillar !== 'all' && PILLAR_BY_KEY[pillar] && (
            <p className="blog-lead-excerpt">{PILLAR_BY_KEY[pillar].blurb}</p>
          )}

          {visible.length ? (
            <div className="blog-grid" data-layout={theme.indexLayout}>
              {visible.map((post) => (
                <PostCard key={post.slug} post={post} navigate={navigate} theme={theme} />
              ))}
            </div>
          ) : (
            <p className="blog-empty">Nothing matches that yet. Try another topic or clear the search.</p>
          )}
        </Section>

        {theme.showSubscribe && (
          <CTABanner
            eyebrow="No newsletter, no gate"
            title="Everything here is free to read"
            text="No sign-up wall and no email capture before you can finish an article. If you want to know when something new goes up, the pages are indexed and the topics above are stable."
          >
            <Button variant="primary" size="lg" to="/resources" navigate={navigate}>Browse the resource library</Button>
            <Button variant="secondary" size="lg" to="/contact" navigate={navigate}>Suggest a topic</Button>
          </CTABanner>
        )}
      </div>
    </PageShell>
  )
}

/* ============================================================ article ==== */

export const BlogPostPage = () => {
  const { storePath } = useContext(ContextProvider)
  const navigate = useNavigate()
  const { slug } = useParams()
  const { theme, posts } = useBlogContent()
  const [progress, setProgress] = useState(0)
  const [activeHeading, setActiveHeading] = useState(null)
  const articleRef = useRef(null)

  useEffect(() => { storePath('blog') }, [storePath])

  const post = useMemo(() => postBySlug(slug, posts), [slug, posts])
  const { order, index: refIndex } = useMemo(() => buildReferenceIndex(post || {}), [post])
  const headings = useMemo(() => headingsOf(post || {}), [post])
  const related = useMemo(() => relatedPosts(post, posts, 3), [post, posts])

  /* Reading progress, measured against the article rather than the document,
     so the footer and the related row do not count as unread article. */
  useEffect(() => {
    if (!theme.showProgress) return undefined
    let frame = null
    const measure = () => {
      frame = null
      const el = articleRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      if (scrollable <= 0) { setProgress(rect.bottom <= window.innerHeight ? 1 : 0); return }
      setProgress(Math.min(1, Math.max(0, -rect.top / scrollable)))
    }
    const onScroll = () => { if (frame === null) frame = requestAnimationFrame(measure) }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [theme.showProgress, post])

  /* Which heading the reader is in, for the contents rail. */
  useEffect(() => {
    if (!theme.showContents || !headings.length) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length) setActiveHeading(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    headings.forEach((heading) => {
      const el = document.getElementById(heading.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [theme.showContents, headings, post])

  if (!post) {
    return (
      <PageShell title="Article not found | Enterprise Compute" breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Blog', to: '/blog' }]}>
        <Section eyebrow="Not found" title="We cannot find that article" subtitle="It may have been moved or renamed. The index has everything that is published.">
          <ButtonRow>
            <Button variant="primary" to="/blog" navigate={navigate}>Back to the blog</Button>
          </ButtonRow>
        </Section>
      </PageShell>
    )
  }

  const author = authorFor(post.author)
  const references = order.map((id) => SOURCES[id]).filter(Boolean)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const shareImage = img(post.image, 'banner').src
  const schema = articleSchema({
    post,
    author,
    image: shareImage,
    origin,
    url: origin ? `${origin}/blog/${post.slug}` : '',
  })

  return (
    <PageShell
      title={`${post.title} | Enterprise Compute`}
      description={post.excerpt}
      image={shareImage}
      pageType="article"
      structuredData={schema}
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Blog', to: '/blog' }, { name: pillarName(post.pillar) }]}
      subnavTitle="Blog"
    >
      <div className="blog-root blog-article" {...themeAttributes(theme)}>
        {theme.showProgress && (
          <div className="blog-progress" aria-hidden="true">
            <div className="blog-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        )}

        <Section flushBottom>
          <div className="blog-article-head">
            <span className="blog-card-topic">{pillarName(post.pillar)}</span>
            <h1 className="blog-article-title">{post.title}</h1>
            <p className="blog-article-standfirst">{post.excerpt}</p>
            {theme.showAuthor && (
              <div className="blog-byline">
                <img className="blog-byline-avatar" {...img(author.image, 'avatar')} alt="" />
                <div>
                  <p className="blog-byline-name">{author.name}</p>
                  <p className="blog-meta">
                    <span>{author.role}</span>
                    <span>{formatDate(post.date)}</span>
                    {theme.showReadingTime && <span>{post.minutes || readingMinutes(post)} min read</span>}
                  </p>
                </div>
              </div>
            )}
          </div>
          {theme.heroStyle === 'feature' && post.image && (
            <figure className="blog-hero-figure">
              <img {...heroImg(post.image, 'banner')} alt="" />
            </figure>
          )}
        </Section>

        <Section>
          <div className="blog-layout" data-layout={theme.showContents && headings.length > 2 ? theme.articleLayout : 'centered'} ref={articleRef}>
            <article className="blog-prose">
              <BlogBody post={post} refIndex={refIndex} navigate={navigate} />

              {theme.showReferences && references.length > 0 && (
                <section className="blog-references">
                  <p className="blog-references-title">References and further reading</p>
                  <ol>
                    {references.map((source, i) => (
                      <li key={source.id} id={`ref-${i + 1}`}>
                        <span className="blog-ref-title">
                          {source.url
                            ? <a href={source.url} target="_blank" rel="noopener noreferrer nofollow">{source.title}</a>
                            : source.title}
                        </span>
                        {source.authors && <>. {source.authors}</>}
                        {source.publisher && <>. {source.publisher}</>}
                        {source.year && <>, {source.year}</>}
                        {source.note && <span className="blog-ref-note">{source.note}</span>}
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </article>

            {theme.showContents && headings.length > 2 && theme.articleLayout === 'rail' && (
              <nav className="blog-contents" aria-label="On this page">
                <p className="blog-contents-title">On this page</p>
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={activeHeading === heading.id ? 'blog-contents-on' : ''}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            )}
          </div>
        </Section>

        {theme.showRelated && related.length > 0 && (
          <Section
            variant="alt"
            eyebrow="Keep reading"
            title="Related writing"
            rail
          >
            <div className="blog-grid" data-layout="grid">
              {related.map((item) => (
                <PostCard key={item.slug} post={item} navigate={navigate} theme={theme} />
              ))}
            </div>
          </Section>
        )}

        <CTABanner
          eyebrow="Enterprise Compute"
          title="One platform for operations, people and accounting"
          text="Point of sale, inventory, purchasing, payroll and a real double-entry ledger. Unlimited users, priced per module, built to keep working offline."
        >
          <Button variant="primary" size="lg" to="/signup" navigate={navigate}>Start a free trial</Button>
          <Button variant="secondary" size="lg" to="/blog" navigate={navigate}>Back to the blog</Button>
        </CTABanner>
      </div>
    </PageShell>
  )
}

export default BlogPage
