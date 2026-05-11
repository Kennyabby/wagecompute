import './SubPages.css'
import { useEffect, useContext } from 'react'
import NavBar from './NavBar'
import Footer from './Footer'
import ContextProvider from '../../Resources/ContextProvider'

const CareersPage = () => {
  const { storePath } = useContext(ContextProvider)

  useEffect(() => {
    storePath('careers')
    document.title = "Careers - Enterprise Compute"
    window.scrollTo(0, 0)
  }, [storePath])

  const jobs = [
    { title: 'Senior Fullstack Engineer', dept: 'Engineering', location: 'Remote / Lagos', type: 'Full-time' },
    { title: 'Product Designer (UI/UX)', dept: 'Design', location: 'Remote', type: 'Full-time' },
    { title: 'Customer Success Manager', dept: 'Operations', location: 'Lagos', type: 'Full-time' },
    { title: 'Technical Writer', dept: 'Marketing', location: 'Remote', type: 'Contract' },
  ]

  return (
    <div className="ec-landing">
      <NavBar />

      <section className="sp-hero">
        <div className="sp-hero-inner">
          <div className="ec-hero-kicker">🚀 Join the Team</div>
          <h1>Help Us Build the Future of Enterprise Software</h1>
          <p>
            We're looking for passionate individuals to join our mission in transforming how 
            businesses operate across the globe.
          </p>
        </div>
      </section>

      <section className="ec-section">
        <div className="ec-section-header">
          <div className="ec-section-kicker">Open Positions</div>
          <h2 className="ec-section-title">Current Opportunities</h2>
        </div>
        <div className="sp-faq-list">
          {jobs.map((job, i) => (
            <div key={i} className="sp-faq-item" style={{ cursor: 'default' }}>
              <div className="sp-faq-q">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '1.1rem' }}>{job.title}</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--ec-muted)', fontWeight: 600 }}>{job.dept}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--ec-secondary)', fontWeight: 600 }}>{job.location}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--ec-muted)', fontWeight: 600 }}>{job.type}</span>
                  </div>
                </div>
                <button className="sp-plan-cta primary" style={{ width: 'auto', marginBottom: 0, padding: '10px 20px' }}>Apply Now</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ec-section" style={{ background: 'var(--ec-light-bg)' }}>
        <div className="ec-section-header">
          <div className="ec-section-kicker">Perks & Benefits</div>
          <h2 className="ec-section-title">Why You'll Love Working Here</h2>
        </div>
        <div className="sp-help-grid">
          <div className="sp-help-card">
            <div className="sp-help-icon" style={{ background: 'rgba(43,106,75,0.1)' }}>🏠</div>
            <h3>Remote-First</h3>
            <p>Work from anywhere. We value results over office hours.</p>
          </div>
          <div className="sp-help-card">
            <div className="sp-help-icon" style={{ background: 'rgba(255,226,154,0.3)' }}>📈</div>
            <h3>Growth Budget</h3>
            <p>Annual budget for courses, books, and conferences.</p>
          </div>
          <div className="sp-help-card">
            <div className="sp-help-icon" style={{ background: 'rgba(106,242,173,0.15)' }}>🏥</div>
            <h3>Health & Wellness</h3>
            <p>Comprehensive health insurance for you and your family.</p>
          </div>
          <div className="sp-help-card">
            <div className="sp-help-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>🌴</div>
            <h3>Unlimited PTO</h3>
            <p>Take the time you need to recharge and stay creative.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default CareersPage
