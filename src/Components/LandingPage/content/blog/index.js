/* ============================================================================
   Blog content: assembly, schema and defaults.
   ----------------------------------------------------------------------------
   Everything the blog renders comes through here. The central admin can
   replace the posts and the theme at runtime, but these remain the fallback,
   so the blog renders fully with the API unreachable, during the build, and
   inside the desktop package. A content site that goes blank when a request
   fails is worse than one that is occasionally a few hours stale.

   BLOCK SCHEMA
   A post body is an array of blocks, each with a `t` discriminator:

     { t: 'p',        text }                      paragraph
     { t: 'h2' | 'h3', text }                     heading, feeds the contents list
     { t: 'ul' | 'ol', items: [] }                list
     { t: 'quote',    text, cite }                block quotation
     { t: 'pull',     text }                      pull quote, no attribution
     { t: 'image',    name, caption }             name is a key in ds/landingImages
     { t: 'callout',  tone, title, text }         tone: info | warn | idea
     { t: 'table',    head: [], rows: [[]] }
     { t: 'takeaways', items: [] }                the summary box at the end
     { t: 'steps',    items: [{ title, text }] }  numbered procedure
     { t: 'note',     text }                      small print, method notes
     { t: 'divider' }
     { t: 'aside',    title, text, to }           a labelled product note

   The `aside` block is deliberately a distinct, visibly-labelled thing. The
   blog is only worth running if it is useful to someone who will never buy
   anything, and the way to let the product show without poisoning that is to
   mark it plainly rather than to thread it through the prose.

   INLINE MARKUP (inside any `text` or list item)
     **bold**            *italic*
     [label](url)        link, external ones get the right rel attributes
     [^sourceId]         citation, rendered as a numbered superscript that
                         links to the reference list built from the post's
                         `references` array
   ========================================================================= */

import { PILLARS, PILLAR_BY_KEY, pillarName } from './pillars'
import { AUTHORS, authorFor } from './authors'
import { SOURCES } from './sources'
import { NUMBERS_POSTS } from './postsNumbers'
import { MONEY_POSTS } from './postsMoney'
import { INFRASTRUCTURE_POSTS } from './postsInfrastructure'
import { TECHNOLOGY_POSTS } from './postsTechnology'
import { OPERATIONS_POSTS } from './postsOperations'
import { BUSINESS_POSTS } from './postsBusiness'
import { MODULE_POSTS } from './postsModules'
import { EXPLAINER_POSTS } from './postsExplainers'

export { PILLARS, PILLAR_BY_KEY, pillarName, AUTHORS, authorFor, SOURCES }

/* ---------------------------------------------------------------- theme -- */

/**
 * What the central admin may change about how the blog looks. Deliberately a
 * fixed set of named choices rather than free CSS: an admin cannot enter a
 * value that breaks the page, and nothing they set can leak into the rest of
 * the site. Anything not present in an API response falls back to the value
 * here, so a partial payload is safe.
 */
export const DEFAULT_THEME = {
  accent: 'green',
  surface: 'paper',
  displayFont: 'sans',
  bodyFont: 'serif',
  measure: 'comfortable',
  indexLayout: 'magazine',
  articleLayout: 'rail',
  heroStyle: 'feature',
  showReadingTime: true,
  showAuthor: true,
  showContents: true,
  showRelated: true,
  showReferences: true,
  showProgress: true,
  showSubscribe: true,
  featuredSlug: null,
  pinned: [],
  intro: {
    eyebrow: 'The Enterprise Compute blog',
    title: 'How businesses actually run',
    lede: 'Margin, stock, people, infrastructure and the decisions behind them. Written to be useful whether or not you ever buy anything from us.',
  },
}

/** Named choices the admin UI offers. Kept here so one list drives both ends. */
export const THEME_OPTIONS = {
  accent: ['green', 'ink', 'amber', 'plum', 'teal'],
  surface: ['paper', 'white', 'warm'],
  displayFont: ['sans', 'serif'],
  bodyFont: ['serif', 'sans'],
  measure: ['compact', 'comfortable', 'wide'],
  indexLayout: ['magazine', 'grid', 'list'],
  articleLayout: ['rail', 'centered'],
  heroStyle: ['feature', 'plain'],
}

/* ---------------------------------------------------------------- posts -- */

const ALL = [
  ...NUMBERS_POSTS,
  ...MONEY_POSTS,
  ...INFRASTRUCTURE_POSTS,
  ...TECHNOLOGY_POSTS,
  ...OPERATIONS_POSTS,
  ...BUSINESS_POSTS,
  ...MODULE_POSTS,
  ...EXPLAINER_POSTS,
]

const byNewest = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)

export const POSTS = [...ALL].sort(byNewest)

/* ------------------------------------------------------------- helpers --- */

export const postBySlug = (slug, posts = POSTS) => posts.find((p) => p.slug === slug) || null

export const postsInPillar = (key, posts = POSTS) =>
  key && key !== 'all' ? posts.filter((p) => p.pillar === key) : posts

/** Pillars that actually have something in them, for the filter row. */
export const activePillars = (posts = POSTS) =>
  PILLARS.filter((pillar) => posts.some((post) => post.pillar === pillar.key))

/**
 * Same pillar first, then anything else, newest first either way. Falls back
 * to filling from the whole set so a thin pillar never renders an empty row.
 */
export const relatedPosts = (post, posts = POSTS, count = 3) => {
  if (!post) return []
  const others = posts.filter((p) => p.slug !== post.slug)
  const sameTopic = others.filter((p) => p.pillar === post.pillar)
  const rest = others.filter((p) => p.pillar !== post.pillar)
  return [...sameTopic, ...rest].slice(0, count)
}

/** The lead article: whatever the admin pinned, else the newest featured. */
export const featuredPost = (posts = POSTS, theme = DEFAULT_THEME) => {
  if (theme && theme.featuredSlug) {
    const pinned = postBySlug(theme.featuredSlug, posts)
    if (pinned) return pinned
  }
  return posts.find((p) => p.featured) || posts[0] || null
}

/** Free-text search across the fields a reader would expect it to cover. */
export const searchPosts = (query, posts = POSTS) => {
  const needle = String(query || '').trim().toLowerCase()
  if (!needle) return posts
  return posts.filter((post) => {
    const haystack = [post.title, post.excerpt, pillarName(post.pillar)].join(' ').toLowerCase()
    return haystack.includes(needle)
  })
}

export default POSTS
