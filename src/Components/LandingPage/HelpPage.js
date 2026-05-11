import './SubPages.css'
import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from './NavBar'
import Footer from './Footer'
import ContextProvider from '../../Resources/ContextProvider'

const HelpPage = () => {
  const { storePath, server, company, viewAccess } = useContext(ContextProvider)
  const Navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [openFaq, setOpenFaq] = useState(null)

  const categories = [
    { icon: '🚀', title: 'Getting Started', desc: 'First steps with Enterprise Compute', count: 12, color: 'rgba(43,106,75,0.1)' },
    { icon: '👥', title: 'HR & Employees', desc: 'Managing your workforce', count: 18, color: 'rgba(255,226,154,0.3)' },
    { icon: '🏪', title: 'Point of Sale', desc: 'POS setup and operations', count: 24, color: 'rgba(106,242,173,0.15)' },
    { icon: '📦', title: 'Inventory', desc: 'Stock and warehouse management', count: 15, color: 'rgba(59,130,246,0.1)' },
    { icon: '💰', title: 'Sales & Purchase', desc: 'Revenue and procurement', count: 20, color: 'rgba(240,93,94,0.1)' },
    { icon: '💵', title: 'Payroll', desc: 'Salary and compensation', count: 10, color: 'rgba(43,106,75,0.1)' },
    { icon: '📊', title: 'Reports', desc: 'Analytics and insights', count: 8, color: 'rgba(255,226,154,0.3)' },
    { icon: '⚙️', title: 'Settings & Admin', desc: 'System configuration', count: 16, color: 'rgba(106,242,173,0.15)' }
  ]

  const faqs = [
    { q: 'How do I add a new employee?', a: 'Navigate to the Employees module from the sidebar, click "Add Employee", fill in the required fields, and save.' },
    { q: 'How do I set up a POS session?', a: 'Go to POS module, select a warehouse, click "Open Session", enter your opening cash balance, and start selling.' },
    { q: 'Can I use the system offline?', a: 'Yes! Enterprise Compute supports offline mode. Changes are queued locally and synced automatically when you reconnect.' },
    { q: 'How do I generate payroll?', a: 'Ensure attendance is recorded, go to Payroll module, select the period and employees, then click Generate Payroll.' },
    { q: 'How do I set user permissions?', a: 'Go to Settings > Employee Settings, select a user profile, and configure their module access and action permissions.' }
  ]

  const [contactForm, setContactForm] = useState({
    name: viewAccess?.name || '',
    email: viewAccess?.emailid || viewAccess?.username || '',
    subject: '',
    category: 'General Support',
    message: ''
  })

  useEffect(() => {
    if (viewAccess) {
      setContactForm(prev => ({
        ...prev,
        name: prev.name || viewAccess.name || '',
        email: prev.email || viewAccess.emailid || viewAccess.username || ''
      }))
    }
  }, [viewAccess])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitEnquiry = async (e) => {
    e.preventDefault()
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      alert('Please fill in all required fields.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        ...contactForm,
        tenant: company || '',
        visitorUserEmail: viewAccess?.emailid || viewAccess?.username || ''
      }

      const response = await fetch(`${server}/public/support/enquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (data.ok) {
        alert('Your enquiry has been sent successfully. We will get back to you soon!')
        setContactForm({ name: '', email: '', subject: '', category: 'General Support', message: '' })
      } else {
        alert('Failed to send enquiry: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error(err)
      alert('Network error. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    storePath('help')
    // set page title
    document.title = "Help & Support - Enterprise Compute"
  }, [storePath])

  return (
    <div className="ec-landing">
      <NavBar />

      <section className="sp-hero">
        <div className="sp-hero-inner">
          <div className="ec-hero-kicker">🆘 Help & Support</div>
          <h1>How Can We Help You?</h1>
          <p>Search our knowledge base or browse categories to find answers fast.</p>
          <div className="sp-search-box">
            <input type="text" placeholder="Search for help articles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <button>Search</button>
          </div>
        </div>
      </section>

      {/* Help Categories */}
      <section className="ec-section" style={{ paddingTop: 20 }}>
        <div className="ec-section-header">
          <div className="ec-section-kicker">Browse by Category</div>
          <h2 className="ec-section-title">Find What You Need</h2>
        </div>
        <div className="sp-help-grid">
          {categories.map((cat, i) => (
            <div key={i} className="sp-help-card">
              <div className="sp-help-icon" style={{ background: cat.color }}>{cat.icon}</div>
              <h3>{cat.title}</h3>
              <p>{cat.desc}</p>
              <span className="sp-article-count">{cat.count} articles</span>
            </div>
          ))}
        </div>
      </section>

      {/* Popular FAQs */}
      <section className="ec-section" style={{ background: 'var(--ec-light-bg)' }}>
        <div className="ec-section-header">
          <div className="ec-section-kicker">Popular Questions</div>
          <h2 className="ec-section-title">Frequently Asked Questions</h2>
        </div>
        <div className="sp-faq-list">
          {faqs.map((faq, i) => (
            <div key={i} className={`sp-faq-item ${openFaq === i ? 'open' : ''}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <div className="sp-faq-q"><span>{faq.q}</span><span className="sp-faq-toggle">{openFaq === i ? '−' : '+'}</span></div>
              {openFaq === i && <div className="sp-faq-a">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Contact Options */}
      <section className="ec-section">
        <div className="ec-section-header">
          <div className="ec-section-kicker">Still Need Help?</div>
          <h2 className="ec-section-title">Send Us a Message</h2>
        </div>
        
        <div className="sp-confirm-shell" style={{ maxWidth: '800px' }}>
          <div className="sp-confirm-card">
            <form onSubmit={handleSubmitEnquiry} className="sp-checkout-grid" style={{ gap: '20px' }}>
              <div className="sp-input-group">
                <span>Your Name *</span>
                <input type="text" placeholder="Full Name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} required />
              </div>
              <div className="sp-input-group">
                <span>Email Address *</span>
                <input type="email" placeholder="email@example.com" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} required />
              </div>
              <div className="sp-input-group" style={{ gridColumn: '1 / -1' }}>
                <span>Subject</span>
                <input type="text" placeholder="What is this about?" value={contactForm.subject} onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })} />
              </div>
              <div className="sp-input-group" style={{ gridColumn: '1 / -1' }}>
                <span>Category</span>
                <select 
                  style={{ width: '100%', padding: '16px 18px', borderRadius: '16px', border: '1px solid rgba(23,56,41,0.1)', background: '#fff', fontSize: '0.95rem', fontFamily: 'MontserratRegular, sans-serif' }}
                  value={contactForm.category}
                  onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}
                >
                  {categories.map((cat, i) => <option key={i} value={cat.title}>{cat.title}</option>)}
                  <option value="Other">Other Enquiry</option>
                </select>
              </div>
              <div className="sp-input-group" style={{ gridColumn: '1 / -1' }}>
                <span>Message *</span>
                <textarea 
                  placeholder="How can we help you?" 
                  style={{ width: '100%', padding: '16px 18px', borderRadius: '16px', border: '1px solid rgba(23,56,41,0.1)', background: '#fff', fontSize: '0.95rem', fontFamily: 'MontserratRegular, sans-serif', minHeight: '150px' }}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="sp-checkout-submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default HelpPage
