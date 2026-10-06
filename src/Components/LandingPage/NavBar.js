/* ============================================================================
   Global site header.
   ----------------------------------------------------------------------------
   Structure follows sap.com's global header: brand, a small number of
   top-level entries each opening a full-bleed multi-column mega panel with
   one promoted item, then utility actions (search, help, sign in, primary
   CTA) on the right.

   The menu tree itself lives in content/navigation.js, this file is only the
   behaviour: open/close, hover intent, keyboard handling, the mobile
   accordion, and the search overlay.

   Authentication behaviour (showing "Go to Dashboard" for a signed-in user
   and routing admins to /dashboard versus everyone else to their stored
   path) is carried over unchanged from the previous header, since it is tied
   to how ContextProvider actually works rather than to the visual design.
   ========================================================================= */

import { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMenu, FiX, FiSearch, FiHelpCircle } from 'react-icons/fi'
import applogo from '../../Resources/assets/images/enterprisecompute.png'
import ContextProvider from '../../Resources/ContextProvider'
import { HEADER_NAV } from './content/navigation'
import { img } from './ds/landingImages'
import { Container, Chevron, TextLink } from './ds/DS'
import SiteSearch from './ds/SiteSearch'
import { smoothScrollToId } from './ds/motion'
import './ds/ds.css'
import './ds/chrome.css'

const NavBar = () => {
  const { companyRecord, loadedCurPath } = useContext(ContextProvider)
  const navigate = useNavigate()

  const [scrolled, setScrolled] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileGroup, setMobileGroup] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)

  const headerRef = useRef(null)
  const closeTimer = useRef(null)

  const isAuthenticated = !!(companyRecord && companyRecord.emailid)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Escape closes whichever layer is open, outermost first.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      if (searchOpen) setSearchOpen(false)
      else if (mobileOpen) setMobileOpen(false)
      else setOpenMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen, mobileOpen])

  // A mega panel is page-wide, so a click anywhere outside the header closes it.
  useEffect(() => {
    if (!openMenu) return undefined
    const onPointerDown = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) setOpenMenu(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openMenu])

  // The mobile panel covers the viewport, so the page behind it must not scroll.
  useEffect(() => {
    const previous = document.body.style.overflow
    if (mobileOpen || searchOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = previous || ''
    return () => { document.body.style.overflow = previous || '' }
  }, [mobileOpen, searchOpen])

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  // Small grace period on mouse-out so moving diagonally from the trigger into
  // the panel does not close it mid-journey.
  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140)
  }, [cancelClose])

  useEffect(() => cancelClose, [cancelClose])

  const go = useCallback((to) => {
    setOpenMenu(null)
    setMobileOpen(false)
    setSearchOpen(false)
    if (!to) return
    const [path, hash] = to.split('#')
    navigate(to)
    // react-router does not scroll to a hash on its own; the target section
    // may also not exist until the destination page has rendered.
    if (hash) setTimeout(() => smoothScrollToId(hash), 180)
    else if (path) window.scrollTo(0, 0)
  }, [navigate])

  const goToWorkspace = useCallback(() => {
    if (companyRecord?.status === 'admin') navigate('/dashboard')
    else navigate('/' + (loadedCurPath || ''))
  }, [companyRecord, loadedCurPath, navigate])

  const activeMenu = useMemo(
    () => HEADER_NAV.find((entry) => entry.key === openMenu && entry.columns),
    [openMenu]
  )

  return (
    <>
      <header ref={headerRef} className={`ds-header${scrolled ? ' scrolled' : ''}`} style={{ position: 'sticky' }}>
        <Container>
          <div className="ds-header-bar">
            <button type="button" className="ds-brand" onClick={() => go('/')} aria-label="Enterprise Compute, home">
              <img src={applogo} alt="" />
              <span>Enterprise Compute</span>
            </button>

            <nav className="ds-nav" aria-label="Main">
              {HEADER_NAV.map((entry) => {
                const hasPanel = !!entry.columns
                const isOpen = openMenu === entry.key
                return (
                  <div
                    key={entry.key}
                    className={`ds-nav-item${isOpen ? ' open' : ''}`}
                    onMouseEnter={hasPanel ? () => { cancelClose(); setOpenMenu(entry.key) } : undefined}
                    onMouseLeave={hasPanel ? scheduleClose : undefined}
                  >
                    <button
                      type="button"
                      className="ds-nav-trigger"
                      aria-expanded={hasPanel ? isOpen : undefined}
                      aria-haspopup={hasPanel ? 'true' : undefined}
                      onClick={() => {
                        if (!hasPanel) return go(entry.to)
                        setOpenMenu(isOpen ? null : entry.key)
                      }}
                    >
                      {entry.label}
                      {hasPanel && <span className="ds-nav-caret" aria-hidden="true" />}
                    </button>
                  </div>
                )
              })}
            </nav>

            <div className="ds-header-actions">
              <button
                type="button"
                className="ds-header-icon-btn"
                aria-label="Search this site"
                onClick={() => setSearchOpen(true)}
              >
                <FiSearch />
              </button>
              <button
                type="button"
                className="ds-header-icon-btn ds-desktop-only"
                aria-label="Help and support"
                onClick={() => go('/help')}
              >
                <FiHelpCircle />
              </button>
              {isAuthenticated ? (
                <button type="button" className="ds-btn primary sm" onClick={goToWorkspace}>
                  Go to dashboard
                </button>
              ) : (
                <>
                  <button type="button" className="ds-header-text-btn ds-desktop-only" onClick={() => go('/login')}>
                    Sign in
                  </button>
                  <button type="button" className="ds-btn primary sm ds-desktop-only" onClick={() => go('/signup')}>
                    Start free trial
                  </button>
                </>
              )}
              <button
                type="button"
                className="ds-burger"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((open) => !open)}
              >
                {mobileOpen ? <FiX /> : <FiMenu />}
              </button>
            </div>
          </div>
        </Container>

        {activeMenu && (
          <div
            className="ds-mega"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <Container>
              <div className="ds-mega-inner">
                <div className={`ds-mega-cols${activeMenu.feature ? ' with-feature' : ''}`}>
                  {activeMenu.columns.map((column) => (
                    <div className="ds-mega-col" key={column.title}>
                      <p className="ds-mega-col-title">{column.title}</p>
                      {column.items.map((item) => (
                        <button
                          type="button"
                          className="ds-mega-link"
                          key={item.name}
                          onClick={() => go(item.to)}
                        >
                          <strong>{item.name}</strong>
                          <span>{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  ))}

                  {activeMenu.feature && (
                    <div className="ds-mega-feature">
                      <div className="ds-mega-feature-media">
                        <img {...img(activeMenu.feature.image, 'thumb')} alt="" />
                      </div>
                      <div className="ds-mega-feature-body">
                        <span className="ds-card-eyebrow">{activeMenu.feature.eyebrow}</span>
                        <h4>{activeMenu.feature.title}</h4>
                        <p>{activeMenu.feature.text}</p>
                        <TextLink onClick={() => go(activeMenu.feature.to)}>
                          {activeMenu.feature.link}
                        </TextLink>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ds-mega-foot">
                  <TextLink onClick={() => go(activeMenu.to)}>
                    {`All ${activeMenu.label.toLowerCase()}`}
                  </TextLink>
                  {(activeMenu.footerLinks || []).map((link) => (
                    <TextLink key={link.name} onClick={() => go(link.to)}>{link.name}</TextLink>
                  ))}
                </div>
              </div>
            </Container>
          </div>
        )}
      </header>

      {activeMenu && (
        <button
          type="button"
          className="ds-mega-scrim"
          aria-label="Close menu"
          tabIndex={-1}
          onClick={() => setOpenMenu(null)}
        />
      )}

      {mobileOpen && (
        <div className="ds-mobile-panel" id="ds-mobile-panel">
          {HEADER_NAV.map((entry) => {
            const hasPanel = !!entry.columns
            const isOpen = mobileGroup === entry.key
            return (
              <div className="ds-mobile-group" key={entry.key}>
                <button
                  type="button"
                  className="ds-mobile-trigger"
                  aria-expanded={hasPanel ? isOpen : undefined}
                  onClick={() => {
                    if (!hasPanel) return go(entry.to)
                    setMobileGroup(isOpen ? null : entry.key)
                  }}
                >
                  {entry.label}
                  {hasPanel && <Chevron dir={isOpen ? 'up' : 'down'} />}
                </button>
                {hasPanel && isOpen && (
                  <div className="ds-mobile-sub">
                    <button type="button" className="ds-link" onClick={() => go(entry.to)}>
                      <span>{`All ${entry.label.toLowerCase()}`}</span>
                      <Chevron />
                    </button>
                    {entry.columns.map((column) => (
                      <div key={column.title}>
                        <p className="ds-mobile-sub-title">{column.title}</p>
                        {column.items.map((item) => (
                          <button
                            type="button"
                            className="ds-mobile-link"
                            key={item.name}
                            onClick={() => go(item.to)}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <div className="ds-mobile-actions">
            {isAuthenticated ? (
              <button type="button" className="ds-btn primary block" onClick={() => { setMobileOpen(false); goToWorkspace() }}>
                Go to dashboard
              </button>
            ) : (
              <>
                <button type="button" className="ds-btn primary block" onClick={() => go('/signup')}>
                  Start free trial
                </button>
                <button type="button" className="ds-btn secondary block" onClick={() => go('/login')}>
                  Sign in
                </button>
              </>
            )}
            <button type="button" className="ds-btn tertiary" onClick={() => go('/help')}>
              Help and support
            </button>
          </div>
        </div>
      )}

      {searchOpen && <SiteSearch onClose={() => setSearchOpen(false)} onNavigate={go} />}
    </>
  )
}

export default NavBar
