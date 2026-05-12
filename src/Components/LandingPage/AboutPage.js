import './SubPages.css'
import { useEffect, useContext } from 'react'
import NavBar from './NavBar'
import Footer from './Footer'
import ContextProvider from '../../Resources/ContextProvider'

const AboutPage = () => {
  const { storePath } = useContext(ContextProvider)

  useEffect(() => {
    storePath('about')
    document.title = "About Us | Enterprise Compute Central"
    window.scrollTo(0, 0)
  }, [storePath])

  return (
    <div className="ec-landing">
      <NavBar />

      <section className="sp-hero">
        <div className="sp-hero-inner">
          <div className="ec-hero-kicker">🏢 Our Mission</div>
          <h1>Modernizing Business Operations for the Digital Age</h1>
          <p>
            We build the operating system for modern enterprises, combining advanced accounting 
            with seamless operational tools to empower teams everywhere.
          </p>
        </div>
      </section>

      <section className="ec-section">
        <div className="sp-community-block">
          <div className="sp-community-icon-box" style={{ background: 'linear-gradient(135deg, #173829, #2b6a4b)' }}>
            <span>🌍</span>
          </div>
          <div className="sp-community-content">
            <div className="ec-section-kicker">Our Story</div>
            <h2>Born from a need for better enterprise tools</h2>
            <p>
              Enterprise Compute started with a simple observation: most business software was either too complex 
              for daily operations or too simple for serious accounting. We bridged that gap.
            </p>
            <p>
              Today, thousands of users rely on our platform to manage their inventory, payroll, and financials 
              in one unified, real-time environment.
            </p>
          </div>
        </div>
      </section>

      <section className="ec-section" style={{ background: 'var(--ec-light-bg)' }}>
        <div className="ec-section-header">
          <div className="ec-section-kicker">Our Core Values</div>
          <h2 className="ec-section-title">What Drives Us Every Day</h2>
        </div>
        <div className="sp-help-grid">
          <div className="sp-help-card">
            <div className="sp-help-icon" style={{ background: 'rgba(43,106,75,0.1)' }}>🎯</div>
            <h3>Precision</h3>
            <p>Financial data must be perfect. We prioritize accuracy and reliability above all else.</p>
          </div>
          <div className="sp-help-card">
            <div className="sp-help-icon" style={{ background: 'rgba(255,226,154,0.3)' }}>⚡</div>
            <h3>Velocity</h3>
            <p>Operations move fast. Our tools are optimized for speed and real-time synchronization.</p>
          </div>
          <div className="sp-help-card">
            <div className="sp-help-icon" style={{ background: 'rgba(106,242,173,0.15)' }}>🛡️</div>
            <h3>Security</h3>
            <p>Your business data is sacred. We employ enterprise-grade security at every layer.</p>
          </div>
          <div className="sp-help-card">
            <div className="sp-help-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>🤝</div>
            <h3>Unity</h3>
            <p>We believe departments shouldn't be silos. Our platform connects your entire team.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default AboutPage
