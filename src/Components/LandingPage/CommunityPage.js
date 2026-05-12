import './SubPages.css'
import { useNavigate } from 'react-router-dom'
import NavBar from './NavBar'
import Footer from './Footer'
import { motion } from 'framer-motion'
import { useEffect, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'

const CommunityPage = () => {
  const { storePath } = useContext(ContextProvider)
  const Navigate = useNavigate()

  const sections = [
    {
      icon: '🌐', title: 'Open Source', kicker: 'Built in the Open',
      desc: 'Enterprise Compute is built on open principles. Contribute to the codebase, submit feature requests, and help shape the future of business software.',
      items: ['View source on GitHub', 'Contributor guidelines', 'Report issues', 'Feature roadmap'],
      color: 'rgba(43,106,75,0.1)'
    },
    {
      icon: '📖', title: 'Documentation', kicker: 'Learn Everything',
      desc: 'Comprehensive guides for every module—from getting started to advanced configurations. Searchable, versioned, and always up to date.',
      items: ['Quick start guide', 'Module documentation', 'API reference', 'Video tutorials'],
      color: 'rgba(255,226,154,0.3)'
    },
    {
      icon: '💬', title: 'Forum', kicker: 'Ask & Answer',
      desc: 'Join thousands of users and developers. Ask questions, share solutions, and learn best practices from the community.',
      items: ['Browse topics', 'Ask a question', 'Share a solution', 'Top contributors'],
      color: 'rgba(106,242,173,0.15)'
    },
    {
      icon: '📅', title: 'Events', kicker: 'Meet & Learn',
      desc: 'Webinars, workshops, and conferences. Learn from experts, connect with peers, and stay ahead of the curve.',
      items: ['Upcoming webinars', 'Annual conference', 'Local meetups', 'Workshop schedule'],
      color: 'rgba(59,130,246,0.1)'
    },
    {
      icon: '🤝', title: 'Partners', kicker: 'Grow Together',
      desc: 'Join our partner network. Whether you\'re an integrator, consultant, or reseller, we have a program for you.',
      items: ['Become a partner', 'Partner directory', 'Certification program', 'Partner resources'],
      color: 'rgba(240,93,94,0.1)'
    },
    {
      icon: '👨‍💻', title: 'Developers', kicker: 'Build & Extend',
      desc: 'Extend Enterprise Compute with custom modules, integrations, and automations. Full API access and developer tools.',
      items: ['API documentation', 'SDK downloads', 'Developer blog', 'Sample projects'],
      color: 'rgba(43,106,75,0.1)'
    }
  ]

  const stats = [
    { num: '10,000+', label: 'Active Users' },
    { num: '500+', label: 'Community Posts' },
    { num: '50+', label: 'Partner Companies' },
    { num: '24/7', label: 'Community Support' }
  ]

  useEffect(() => {
    storePath('community')
    // set page title
    document.title = "Community & Ecosystem | Enterprise Compute Central"
  }, [storePath])

  return (
    <div className="ec-landing">
      <NavBar />

      <section className="sp-hero">
        <div className="sp-hero-inner">
          <div className="ec-hero-kicker">🌍 Community & Ecosystem</div>
          <h1>Built by the Community, <span className="ec-highlight">For the Community</span></h1>
          <p>Join a global network of businesses, developers, and partners shaping the future of enterprise software.</p>
        </div>
      </section>

      {/* Stats */}
      <section className="ec-section" style={{ paddingTop: 0, paddingBottom: 60 }}>
        <div className="sp-stats-row">
          {stats.map((s, i) => (
            <div key={i} className="sp-stat-card">
              <strong>{s.num}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Community Sections */}
      <section className="ec-section sp-community-section" style={{ paddingTop: 0 }}>
        {sections.map((sec, i) => (
          <motion.div 
            key={i} 
            className={`sp-community-block ${i % 2 !== 0 ? 'reverse' : ''}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="sp-community-visual">
              <div className="sp-community-icon-box" style={{ background: sec.color }}>
                <motion.span
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  {sec.icon}
                </motion.span>
              </div>
            </div>
            <div className="sp-community-content">
              <div className="ec-section-kicker">{sec.kicker}</div>
              <h2>{sec.title}</h2>
              <p>{sec.desc}</p>
              <div className="sp-community-links">
                {sec.items.map((item, j) => (
                  <motion.a 
                    key={j} 
                    href="#" 
                    className="sp-community-link"
                    whileHover={{ x: 5, backgroundColor: 'rgba(43,106,75,0.1)' }}
                  >
                    <span className="sp-link-arrow">→</span> {item}
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* CTA */}
      <section className="ec-final-cta">
        <h2>Join the Community Today</h2>
        <p>Whether you're a user, developer, or partner—there's a place for you.</p>
        <div className="ec-hero-btns" style={{ justifyContent: 'center' }}>
          <button className="ec-btn-primary" onClick={() => Navigate('/login')}>Get Started</button>
          <button className="ec-btn-secondary">Join the Forum</button>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default CommunityPage
