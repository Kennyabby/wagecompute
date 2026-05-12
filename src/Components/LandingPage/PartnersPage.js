import './SubPages.css'
import { useEffect, useContext } from 'react'
import NavBar from './NavBar'
import Footer from './Footer'
import ContextProvider from '../../Resources/ContextProvider'

const PartnersPage = () => {
  const { storePath } = useContext(ContextProvider)

  useEffect(() => {
    storePath('partners')
    document.title = "Partners | Enterprise Compute Central"
    window.scrollTo(0, 0)
  }, [storePath])

  return (
    <div className="ec-landing">
      <NavBar />

      <section className="sp-hero">
        <div className="sp-hero-inner">
          <div className="ec-hero-kicker">🤝 Partner Ecosystem</div>
          <h1>Better Together. Scale with Our Global Network.</h1>
          <p>
            Join forces with Enterprise Compute to deliver world-class operations and 
            accounting solutions to businesses of all sizes.
          </p>
        </div>
      </section>

      <section className="ec-section">
        <div className="ec-section-header">
          <div className="ec-section-kicker">Partner Programs</div>
          <h2 className="ec-section-title">Ways to Collaborate</h2>
        </div>
        <div className="sp-help-grid">
          <div className="sp-help-card">
            <div className="sp-help-icon" style={{ background: 'rgba(43,106,75,0.1)' }}>💼</div>
            <h3>Consulting Partners</h3>
            <p>Help businesses implement and optimize Enterprise Compute for their specific industry needs.</p>
          </div>
          <div className="sp-help-card">
            <div className="sp-help-icon" style={{ background: 'rgba(255,226,154,0.3)' }}>🔌</div>
            <h3>Technology Partners</h3>
            <p>Build integrations that extend our platform's capabilities and reach more customers.</p>
          </div>
          <div className="sp-help-card">
            <div className="sp-help-icon" style={{ background: 'rgba(106,242,173,0.15)' }}>🏢</div>
            <h3>Enterprise Partners</h3>
            <p>Joint ventures for large-scale digital transformation and infrastructure projects.</p>
          </div>
          <div className="sp-help-card">
            <div className="sp-help-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>📣</div>
            <h3>Affiliate Partners</h3>
            <p>Promote the platform and earn rewards for every successful tenant you refer.</p>
          </div>
        </div>
      </section>

      <section className="ec-section" style={{ background: 'var(--ec-light-bg)' }}>
        <div className="sp-community-block reverse">
          <div className="sp-community-icon-box" style={{ background: 'linear-gradient(135deg, #f7f4eb, #eef3ef)' }}>
            <span>🏢</span>
          </div>
          <div className="sp-community-content">
            <div className="ec-section-kicker">For Enterprises</div>
            <h2>Built for modern partnerships</h2>
            <p>
              Our platform is designed to be extensible. We provide the APIs, the documentation, 
              and the support needed to build robust partner ecosystems.
            </p>
            <button className="sp-plan-cta primary" style={{ width: 'auto' }}>Become a Partner</button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default PartnersPage
