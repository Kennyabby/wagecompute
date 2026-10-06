/* ============================================================================
   Site-wide search overlay.
   ----------------------------------------------------------------------------
   sap.com and netsuite.com both put a magnifier in the header; on both, it
   takes you to a separate results page. This does the lookup inline instead,
   which for a site of this size is strictly better, the whole corpus is
   already in the bundle as content modules, so there is nothing to fetch and
   results can appear as you type.

   The index is built once, lazily, from the same content files the pages
   render, so a new product or article is searchable the moment it is added
   with no separate index to maintain.
   ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import { PRODUCTS } from '../content/products'
import { INDUSTRIES } from '../content/industries'
import { BY_SIZE, BY_ROLE, BY_CHALLENGE } from '../content/solutions'
import { RESOURCES, EVENTS } from '../content/resources'
import { POSTS } from '../content/insights'
import { STORIES } from '../content/customers'
import { SERVICE_TRACKS, LEARNING_PATHS, INTEGRATION_GROUPS } from '../content/programs'
import { COMPARISONS } from '../content/compare'
import { TRUST_PILLARS } from '../content/trust'
import './siteSearch.css'

/** Static destinations that are pages in their own right, not content rows. */
const STATIC_ENTRIES = [
  { kind: 'Page', title: 'Pricing and plan calculator', text: 'Build a plan from the modules you need and see the exact monthly cost.', to: '/pricing' },
  { kind: 'Page', title: 'ROI calculator', text: 'Model licence cost against admin time recovered and shrinkage avoided.', to: '/roi-calculator' },
  { kind: 'Page', title: 'Documentation', text: 'Setup, configuration and module reference guides.', to: '/docs' },
  { kind: 'Page', title: 'Help centre', text: 'Searchable articles and a direct support enquiry form.', to: '/help' },
  { kind: 'Page', title: 'Trust Center', text: 'Security, privacy, availability and governance.', to: '/trust-center' },
  { kind: 'Page', title: 'Contact us', text: 'Talk to sales, support, partnerships or press.', to: '/contact' },
  { kind: 'Page', title: 'About Enterprise Compute', text: 'Who we are, what we value, and the full product story.', to: '/about' },
  { kind: 'Page', title: 'Careers', text: 'Open roles and how the team works.', to: '/careers' },
  { kind: 'Page', title: 'Partner network', text: 'Implementation, accounting, technology and referral partners.', to: '/partners' },
  { kind: 'Page', title: 'Community', text: 'Forums, user groups, events and product feedback.', to: '/community' },
  { kind: 'Page', title: 'Newsroom', text: 'Product and company announcements.', to: '/press' },
  { kind: 'Page', title: 'Privacy policy', text: 'What we collect, why, and how long we keep it.', to: '/privacy' },
  { kind: 'Page', title: 'Terms of service', text: 'Your agreement with us.', to: '/terms' },
]

/**
 * Flatten every content module into one searchable list. Built lazily and
 * memoised at module scope so opening the overlay a second time is free.
 */
let INDEX = null
const buildIndex = () => {
  if (INDEX) return INDEX
  const entries = []
  const push = (kind, title, text, to, extra = '') =>
    entries.push({ kind, title, text, to, haystack: `${title} ${text} ${extra}`.toLowerCase() })

  PRODUCTS.forEach((p) =>
    push('Product', p.name, p.summary, `/products/${p.slug}`,
      `${p.eyebrow} ${p.title} ${(p.capabilities || []).map((c) => c.title).join(' ')}`))

  INDUSTRIES.forEach((i) =>
    push('Industry', i.name, i.summary, `/industries/${i.slug}`,
      `${i.title} ${(i.capabilities || []).join(' ')}`))

  BY_SIZE.forEach((s) => push('Solution', s.name, s.lede, `/solutions#${s.id}`, s.shape))
  BY_ROLE.forEach((s) => push('Solution', s.name, s.lede, `/solutions#${s.id}`, s.question))
  BY_CHALLENGE.forEach((s) => push('Solution', s.name, s.symptom, `/solutions#${s.id}`, s.answer))

  RESOURCES.forEach((r) => push(r.type, r.title, r.text, r.to || '/resources', r.topic))
  EVENTS.forEach((e) => push('Event', e.title, e.text, '/events', e.type))
  POSTS.forEach((p) => push('Article', p.title, p.excerpt, `/blog/${p.slug}`, p.topic))
  STORIES.forEach((s) => push('Customer story', s.headline, s.summary, `/customers/${s.slug}`, `${s.company} ${s.industryLabel}`))

  SERVICE_TRACKS.forEach((s) => push('Service', s.name, s.lede, `/services#${s.id}`, s.for))
  LEARNING_PATHS.forEach((l) => push('Training', l.name, l.lede, `/training#${l.id}`, l.audience))
  INTEGRATION_GROUPS.forEach((group) =>
    group.items.forEach((item) =>
      push('Integration', item.name, item.text, `/integrations#${group.id}`, item.category)))

  COMPARISONS.forEach((c) => push('Comparison', c.name, c.lede, `/why-enterprise-compute#${c.id}`, c.headline))
  TRUST_PILLARS.forEach((t) => push('Trust', t.name, t.text, `/trust-center#${t.id}`, t.headline))

  STATIC_ENTRIES.forEach((s) => push(s.kind, s.title, s.text, s.to))

  INDEX = entries
  return INDEX
}

const SUGGESTIONS = [
  { label: 'Point of Sale', to: '/products/pos' },
  { label: 'Inventory', to: '/products/inventory' },
  { label: 'Payroll', to: '/products/payroll' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Offline mode', to: '/products/offline-sync' },
  { label: 'Security', to: '/trust-center' },
]

const SiteSearch = ({ onClose, onNavigate }) => {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef(null)
  const index = useMemo(buildIndex, [])

  useEffect(() => { inputRef.current?.focus() }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const terms = q.split(/\s+/).filter(Boolean)
    return index
      .map((entry) => {
        let score = 0
        for (const term of terms) {
          if (!entry.haystack.includes(term)) return null
          // A hit in the title is worth far more than one buried in body text.
          score += entry.title.toLowerCase().includes(term) ? 10 : 1
          if (entry.title.toLowerCase().startsWith(term)) score += 6
        }
        return { entry, score }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((hit) => hit.entry)
  }, [query, index])

  useEffect(() => { setCursor(0) }, [query])

  const onKeyDown = (event) => {
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((c) => (c + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((c) => (c - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const hit = results[cursor]
      if (hit) onNavigate(hit.to)
    }
  }

  return (
    <div className="ss-root" role="dialog" aria-modal="true" aria-label="Search this site">
      <button type="button" className="ss-scrim" aria-label="Close search" onClick={onClose} />
      <div className="ss-panel">
        <div className="ss-bar">
          <FiSearch className="ss-bar-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search products, industries, guides and documentation"
            aria-label="Search this site"
            aria-controls="ss-results"
            autoComplete="off"
          />
          <button type="button" className="ss-close" onClick={onClose} aria-label="Close search">
            <FiX />
          </button>
        </div>

        <div className="ss-body" id="ss-results">
          {query.trim().length < 2 ? (
            <div className="ss-empty">
              <p className="ss-empty-label">Popular</p>
              <div className="ss-suggestions">
                {SUGGESTIONS.map((item) => (
                  <button key={item.label} type="button" className="ds-pill" onClick={() => onNavigate(item.to)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="ss-empty">
              <p className="ss-empty-label">No matches for &ldquo;{query.trim()}&rdquo;</p>
              <p className="ss-empty-text">
                Try a module name, an industry, or a task such as &ldquo;stock count&rdquo; or &ldquo;period close&rdquo;.
                You can also <button type="button" className="ds-link" onClick={() => onNavigate('/help')}><span>ask the support team</span></button>.
              </p>
            </div>
          ) : (
            <ul className="ss-results">
              {results.map((entry, i) => (
                <li key={`${entry.kind}-${entry.title}-${entry.to}`}>
                  <button
                    type="button"
                    className={`ss-result${i === cursor ? ' active' : ''}`}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => onNavigate(entry.to)}
                  >
                    <span className="ss-result-kind">{entry.kind}</span>
                    <span className="ss-result-title">{entry.title}</span>
                    <span className="ss-result-text">{entry.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default SiteSearch
