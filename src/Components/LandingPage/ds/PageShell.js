/* ============================================================================
   Shared shell for every public page: skip link, header, optional secondary
   navigation (breadcrumbs + in-page tabs + page CTA), content, footer.
   ----------------------------------------------------------------------------
   The secondary nav is the part most worth having. Every inner page on
   sap.com carries one, and it is why their deep pages stay navigable: you
   always know where you are, you can jump within the page, and the page's
   own primary action stays reachable while you scroll.

   `sections` drives both the in-page tabs and the scroll-spy, so a page
   declares its sections once and gets anchors, highlighting and smooth
   offset-aware scrolling for free.
   ========================================================================= */

import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavBar from '../NavBar'
import Footer from '../Footer'
import { Container, useScrollSpy, scrollToId } from './DS'
import { smoothScrollToId } from './motion'
import './ds.css'
import './chrome.css'

/**
 * Sets the document title and, where given, the meta description. Both are
 * restored to the platform defaults on unmount so a page cannot leak its
 * title into the authenticated app after navigation.
 */
export const usePageMeta = (title, description) => {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title
    let metaEl = null
    let previousDescription = null
    if (description) {
      metaEl = document.querySelector('meta[name="description"]')
      if (metaEl) {
        previousDescription = metaEl.getAttribute('content')
        metaEl.setAttribute('content', description)
      }
    }
    return () => {
      document.title = previousTitle
      if (metaEl && previousDescription !== null) metaEl.setAttribute('content', previousDescription)
    }
  }, [title, description])
}

export const SecondaryNav = ({ title, breadcrumbs = [], sections = [], cta }) => {
  const navigate = useNavigate()
  const ids = sections.map((section) => section.id)
  const active = useScrollSpy(ids)

  if (!breadcrumbs.length && !sections.length && !cta) return null

  return (
    <div className="ds-subnav">
      <Container>
        {breadcrumbs.length > 0 && (
          <nav className="ds-breadcrumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.name}>
                {index > 0 && <span className="sep" aria-hidden="true"> / </span>}
                {crumb.to ? (
                  <button type="button" onClick={() => { navigate(crumb.to); window.scrollTo(0, 0) }}>
                    {crumb.name}
                  </button>
                ) : (
                  <span className="current" aria-current="page">{crumb.name}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {(sections.length > 0 || cta) && (
          <div className="ds-subnav-bar">
            {title && <span className="ds-subnav-title">{title}</span>}
            {sections.length > 0 && (
              <div className="ds-subnav-tabs" role="navigation" aria-label="On this page">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`ds-subnav-tab${active === section.id ? ' active' : ''}`}
                    aria-current={active === section.id ? 'true' : undefined}
                    onClick={() => scrollToId(section.id)}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            )}
            {cta && (
              <div className="ds-subnav-cta">
                <button type="button" className="ds-btn primary sm" onClick={() => navigate(cta.to)}>
                  {cta.label}
                </button>
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  )
}

/**
 * react-router keeps the scroll position across a client-side navigation, so
 * without this every page opens part-way down wherever the previous one was
 * scrolled to. A hash in the URL means the visitor asked for a specific
 * section, so that case scrolls there instead once it has rendered.
 */
const useRouteScroll = (pathname, hash) => {
  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      const timer = setTimeout(() => smoothScrollToId(id), 160)
      return () => clearTimeout(timer)
    }
    // A fresh page starts at the top instantly — easing a jump the visitor
    // did not ask for just delays the content they navigated for.
    window.scrollTo(0, 0)
    return undefined
  }, [pathname, hash])
}

const PageShell = ({ title, description, breadcrumbs, sections, subnavTitle, subnavCta, children }) => {
  const { pathname, hash } = useLocation()
  usePageMeta(title, description)
  useRouteScroll(pathname, hash)

  return (
    <div className="ds-page">
      <a className="ds-skip-link" href="#main">Skip to content</a>
      <NavBar />
      <SecondaryNav
        title={subnavTitle}
        breadcrumbs={breadcrumbs}
        sections={sections}
        cta={subnavCta}
      />
      <main id="main">{children}</main>
      <Footer />
    </div>
  )
}

export default PageShell
