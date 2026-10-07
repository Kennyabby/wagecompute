/* ============================================================================
   Per-route metadata for the public pages.
   ----------------------------------------------------------------------------
   index.html carries one set of tags for the whole site. That is enough for
   the home page and wrong for everything else: every article would be shared
   as though it were the product home page, and search results would show the
   same description 50 times. This hook rewrites the tags that matter as each
   route mounts and restores them on the way out.

   WHAT THIS DOES NOT FIX
   The site is client rendered. Google executes JavaScript and will generally
   see what this writes, but many crawlers and most social preview scrapers
   read the HTML as served and never run a script, so they see the tags from
   index.html. The real fix is prerendering the public routes to static HTML at
   build time, which is a separate piece of work. Everything here is still
   worth having, and it is not a substitute for that.
   ========================================================================= */

import { useEffect } from 'react'

const SITE_NAME = 'Enterprise Compute'

/** Find or create a tag, remembering whether we made it so cleanup is exact. */
const ensureTag = (selector, create) => {
  const existing = document.head.querySelector(selector)
  if (existing) return { el: existing, created: false }
  const el = create()
  document.head.appendChild(el)
  return { el, created: true }
}

const setMeta = (records, attr, key, value) => {
  if (!value) return
  const selector = `meta[${attr}="${key}"]`
  const { el, created } = ensureTag(selector, () => {
    const tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    return tag
  })
  records.push({ el, created, attr: 'content', previous: el.getAttribute('content') })
  el.setAttribute('content', value)
}

/**
 * @param title           full document title
 * @param description     meta description, also used for social previews
 * @param image           absolute or root-relative image for social previews
 * @param type            Open Graph type: 'website' or 'article'
 * @param noindex         true to keep a page out of search results
 * @param structuredData  a JSON-LD object, emitted as application/ld+json
 */
export const usePageSeo = ({ title, description, image, type = 'website', noindex = false, structuredData } = {}) => {
  useEffect(() => {
    const records = []
    const createdNodes = []

    const previousTitle = document.title
    if (title) document.title = title

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = typeof window !== 'undefined' ? origin + window.location.pathname : ''
    const absoluteImage = image
      ? (/^https?:\/\//.test(image) ? image : origin + (image.startsWith('/') ? image : `/${image}`))
      : null

    setMeta(records, 'name', 'description', description)
    setMeta(records, 'property', 'og:title', title)
    setMeta(records, 'property', 'og:description', description)
    setMeta(records, 'property', 'og:type', type)
    setMeta(records, 'property', 'og:site_name', SITE_NAME)
    setMeta(records, 'property', 'og:url', url)
    setMeta(records, 'property', 'og:image', absoluteImage)
    setMeta(records, 'name', 'twitter:card', absoluteImage ? 'summary_large_image' : 'summary')
    setMeta(records, 'name', 'twitter:title', title)
    setMeta(records, 'name', 'twitter:description', description)
    setMeta(records, 'name', 'twitter:image', absoluteImage)
    setMeta(records, 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')

    // Canonical. Without one, the same article reachable with a tracking
    // parameter looks like a separate page to a crawler.
    let canonical = null
    if (url) {
      const found = ensureTag('link[rel="canonical"]', () => {
        const tag = document.createElement('link')
        tag.setAttribute('rel', 'canonical')
        return tag
      })
      canonical = { el: found.el, created: found.created, previous: found.el.getAttribute('href') }
      found.el.setAttribute('href', url)
    }

    // JSON-LD. Always a fresh node so there is never a stale one left behind
    // from the previous route.
    if (structuredData) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.routeSeo = 'true'
      script.textContent = JSON.stringify(structuredData)
      document.head.appendChild(script)
      createdNodes.push(script)
    }

    return () => {
      document.title = previousTitle
      records.forEach(({ el, created, attr, previous }) => {
        if (created) { if (el.parentNode) el.parentNode.removeChild(el); return }
        if (previous === null) el.removeAttribute(attr)
        else el.setAttribute(attr, previous)
      })
      if (canonical) {
        if (canonical.created) { if (canonical.el.parentNode) canonical.el.parentNode.removeChild(canonical.el) }
        else if (canonical.previous !== null) canonical.el.setAttribute('href', canonical.previous)
      }
      createdNodes.forEach((node) => { if (node.parentNode) node.parentNode.removeChild(node) })
    }
  }, [title, description, image, type, noindex, structuredData])
}

/** Schema.org Organization, for the home page. */
export const organisationSchema = (origin = '') => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: origin || undefined,
  logo: origin ? `${origin}/enterprisecompute.png` : undefined,
  description: 'One platform for operations, people and accounting, with a real double-entry ledger underneath and an assistant that can read it.',
})

/** Schema.org BlogPosting, for an article. */
export const articleSchema = ({ post, author, image, origin = '', url = '' }) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.excerpt,
  datePublished: post.date,
  dateModified: post.date,
  image: image || undefined,
  mainEntityOfPage: { '@type': 'WebPage', '@id': url || undefined },
  author: { '@type': 'Organization', name: author ? author.name : SITE_NAME },
  publisher: {
    '@type': 'Organization',
    name: SITE_NAME,
    logo: origin ? { '@type': 'ImageObject', url: `${origin}/enterprisecompute.png` } : undefined,
  },
})

/** Schema.org BreadcrumbList, from the crumbs a page already declares. */
export const breadcrumbSchema = (crumbs = [], origin = '') => {
  if (!crumbs.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.to && origin ? origin + crumb.to : undefined,
    })),
  }
}

export default usePageSeo
