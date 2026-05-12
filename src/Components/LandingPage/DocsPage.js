import './SubPages.css'
import { useEffect, useContext } from 'react'
import NavBar from './NavBar'
import Footer from './Footer'
import ContextProvider from '../../Resources/ContextProvider'

const DocsPage = () => {
  const { storePath } = useContext(ContextProvider)

  useEffect(() => {
    storePath('docs')
    document.title = "Documentation | Enterprise Compute Central"
    window.scrollTo(0, 0)
  }, [storePath])

  const sections = [
    { title: 'Getting Started', items: ['Introduction', 'Core Concepts', 'Quick Start Guide', 'Architecture Overview'] },
    { title: 'User Guides', items: ['HR & Payroll', 'Accounting & Journals', 'POS Operations', 'Inventory Management'] },
    { title: 'Administrator', items: ['Tenant Setup', 'User Permissions', 'System Settings', 'Offline Sync Config'] },
    { title: 'API & Integration', items: ['API Authentication', 'Webhooks', 'Entity Reference', 'Best Practices'] },
  ]

  return (
    <div className="ec-landing">
      <NavBar />

      <section className="sp-hero">
        <div className="sp-hero-inner">
          <div className="ec-hero-kicker">📚 Knowledge Base</div>
          <h1>Platform Documentation</h1>
          <p>
            Everything you need to set up, manage, and scale your business with 
            Enterprise Compute.
          </p>
        </div>
      </section>

      <section className="ec-section">
        <div className="sp-help-grid">
          {sections.map((section, i) => (
            <div key={i} className="sp-help-card" style={{ height: 'auto' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>{section.title}</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '10px' }}>
                {section.items.map((item, j) => (
                  <li key={j}>
                    <a href="#" style={{ color: 'var(--ec-text)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
                      📄 {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="ec-section" style={{ background: 'var(--ec-light-bg)' }}>
        <div className="sp-community-block">
          <div className="sp-community-icon-box" style={{ background: 'linear-gradient(135deg, #2b6a4b, #173829)' }}>
            <span>💻</span>
          </div>
          <div className="sp-community-content">
            <div className="ec-section-kicker">For Developers</div>
            <h2>Looking for the API Reference?</h2>
            <p>
              Explore our comprehensive API documentation to build custom integrations, 
              automate workflows, and extend your workspace capabilities.
            </p>
            <button className="sp-plan-cta primary" style={{ width: 'auto' }}>View API Reference</button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default DocsPage
