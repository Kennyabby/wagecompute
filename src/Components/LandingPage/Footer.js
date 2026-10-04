/* ============================================================================
   Global site footer.
   ----------------------------------------------------------------------------
   Follows sap.com's footer structure: a brand column, four navigation
   columns, social links, then a separate legal/site-information row and a
   back-to-top control. The link tree lives in content/navigation.js.
   ========================================================================= */

import { useNavigate } from 'react-router-dom'
import { FaXTwitter, FaLinkedinIn, FaYoutube, FaFacebookF } from 'react-icons/fa6'
import applogo from '../../Resources/assets/images/enterprisecompute.png'
import { FOOTER_COLUMNS, FOOTER_LEGAL, SOCIAL_LINKS } from './content/navigation'
import { Container, Chevron } from './ds/DS'
import { smoothScrollToId, smoothScrollToTop } from './ds/motion'
import './ds/ds.css'
import './ds/chrome.css'

const SOCIAL_ICONS = {
  x: FaXTwitter,
  linkedin: FaLinkedinIn,
  youtube: FaYoutube,
  facebook: FaFacebookF,
}

const Footer = () => {
  const navigate = useNavigate()

  const go = (to) => {
    const [, hash] = to.split('#')
    navigate(to)
    if (hash) setTimeout(() => smoothScrollToId(hash), 180)
    else window.scrollTo(0, 0)
  }

  return (
    <footer className="ds-footer ds-on-deep">
      <Container>
        <div className="ds-footer-grid">
          <div className="ds-footer-brand">
            <button type="button" className="ds-brand" onClick={() => go('/')} aria-label="Enterprise Compute, home">
              <img src={applogo} alt="" />
              <span>Enterprise Compute</span>
            </button>
            <p>
              One platform for operations, people and accounting, with a real double-entry
              ledger underneath and an assistant that can read it. Unlimited users, priced
              per module, built to keep working offline.
            </p>
            <div className="ds-footer-social">
              {SOCIAL_LINKS.map(({ key, label, href }) => {
                const Icon = SOCIAL_ICONS[key]
                return (
                  <a key={key} href={href} aria-label={label} target="_blank" rel="noopener noreferrer">
                    {Icon && <Icon aria-hidden="true" />}
                  </a>
                )
              })}
            </div>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav className="ds-footer-col" key={column.title} aria-label={column.title}>
              <h4>{column.title}</h4>
              {column.links.map((link) => (
                <button type="button" key={link.name} onClick={() => go(link.to)}>
                  {link.name}
                </button>
              ))}
            </nav>
          ))}
        </div>

        <div className="ds-footer-legal">
          <span className="ds-footer-copy">
            © {new Date().getFullYear()} Enterprise Compute Central. All rights reserved.
          </span>
          <div className="ds-footer-legal-links">
            {FOOTER_LEGAL.map((link) => (
              <button type="button" key={link.name} onClick={() => go(link.to)}>
                {link.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ds-backtotop"
            onClick={smoothScrollToTop}
          >
            Back to top
            <Chevron dir="up" />
          </button>
        </div>
      </Container>
    </footer>
  )
}

export default Footer
