/* ============================================================================
   Builds public/sitemap.xml from the routes that actually exist.
   ----------------------------------------------------------------------------
   Run with `node scripts/generate-sitemap.js` before a deploy, or wire it into
   the build script. It reads the public route list out of App.js and the blog
   slugs out of the committed content, so a page cannot be added to the site and
   quietly left out of the sitemap.

   The origin comes from SITE_ORIGIN in the environment. It defaults to the
   production domain below, which is the one value here that has to be checked
   by a human before the file is published.

   Blog posts published later through the central admin live in the database
   rather than in this content folder, so they will not appear here. Either
   re-run this against a deployed API, or serve the sitemap from the server.
   That is noted in the handover rather than guessed at.
   ========================================================================= */

const fs = require('fs')
const path = require('path')

const ORIGIN = (process.env.SITE_ORIGIN || 'https://www.enterprisecompute.com').replace(/\/+$/, '')
const ROOT = path.join(__dirname, '..')
const APP = path.join(ROOT, 'src', 'App.js')
const BLOG_DIR = path.join(ROOT, 'src', 'Components', 'LandingPage', 'content', 'blog')

/* Pages that exist but should not be in search results: transactional flows,
   anything behind a token, and the error states. */
const EXCLUDE = new Set([
  '/login', '/signup', '/settings', '/renew', '/payment-confirm',
  '/offline-license-portal', '/offline-license-portal/login',
  '/offline-license-payment-complete', '/database-not-found', '/license-expired',
])

/* Rough priority by depth and kind. Search engines treat this as a hint at
   most, so it is not worth agonising over. */
const priorityFor = (route) => {
  if (route === '/') return '1.0'
  if (route === '/blog' || route === '/pricing' || route === '/products') return '0.9'
  if (route.startsWith('/blog/')) return '0.8'
  if (route.split('/').length > 2) return '0.6'
  return '0.7'
}

const readPublicRoutes = () => {
  const source = fs.readFileSync(APP, 'utf8')
  // PUBLIC_EXACT is the list App.js already maintains for session handling, so
  // it is the authoritative answer to "which routes are public".
  const block = source.match(/const PUBLIC_EXACT\s*=\s*\[([\s\S]*?)\]/)
  if (!block) throw new Error('Could not find PUBLIC_EXACT in App.js')
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

const readBlogSlugs = () => {
  const slugs = []
  for (const file of fs.readdirSync(BLOG_DIR).filter((f) => f.startsWith('posts'))) {
    const text = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8')
    for (const m of text.matchAll(/^\s{4}slug:\s*'([^']+)'/gm)) slugs.push(m[1])
  }
  return slugs
}

const build = () => {
  const today = new Date().toISOString().slice(0, 10)
  const routes = new Set(['/'])

  readPublicRoutes().forEach((route) => { if (!EXCLUDE.has(route)) routes.add(route) })
  readBlogSlugs().forEach((slug) => routes.add(`/blog/${slug}`))

  const urls = [...routes].sort().map((route) => [
    '  <url>',
    `    <loc>${ORIGIN}${route === '/' ? '/' : route}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${route.startsWith('/blog') ? 'weekly' : 'monthly'}</changefreq>`,
    `    <priority>${priorityFor(route)}</priority>`,
    '  </url>',
  ].join('\n')).join('\n')

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n')

  fs.writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), xml)
  console.log(`sitemap.xml written with ${routes.size} urls, origin ${ORIGIN}`)
}

build()
