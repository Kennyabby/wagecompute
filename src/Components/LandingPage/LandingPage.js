import './LandingPage.css'
import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import applogo from '../../Resources/assets/images/enterprisecompute.png'
import LoadingPage from '../LoadingPage/LoadingPage'
import ContextProvider from '../../Resources/ContextProvider'
import NavBar from './NavBar'
import Footer from './Footer'

const LandingPage = () => {
  const { storePath, showLoading, getViewAccess } = useContext(ContextProvider)
  const navigate = useNavigate()
  const [demoTab, setDemoTab] = useState(0)

  useEffect(() => {
    if (!showLoading) {
      storePath('')
      document.title = 'Enterprise Compute Central | Home'
    }
  }, [storePath, showLoading])

  useEffect(() => {
    getViewAccess()
  }, [])

  if (showLoading) return <LoadingPage />

  const demoTabs = [
    {
      label: 'Point of Sale',
      title: 'Lightning-Fast POS Terminal',
      desc: 'Process orders in seconds with a responsive POS flow, live inventory movement, receipt handling, and session-based oversight.',
      feats: [
        { t: 'Multi-Session', d: 'Run parallel POS sessions across locations' },
        { t: 'Offline Mode', d: 'Keep selling even without internet' },
        { t: 'Smart Receipts', d: 'Support customer, kitchen, and operational receipt flows' },
      ],
    },
    {
      label: 'Inventory',
      title: 'Real-Time Stock Intelligence',
      desc: 'Track every item across warehouses with transfers, adjustments, low-stock signals, and product-level visibility by location.',
      feats: [
        { t: 'Multi-Warehouse', d: 'Manage stock across locations' },
        { t: 'Auto Adjustments', d: 'Operational activity updates inventory positions' },
        { t: 'Transfer Orders', d: 'Move stock between warehouses cleanly' },
      ],
    },
    {
      label: 'Payroll',
      title: 'Effortless Payroll Processing',
      desc: 'Move from attendance into payroll with deductions, allowances, and visibility into paid and pending salary obligations.',
      feats: [
        { t: 'Auto Calculate', d: 'From attendance to payroll-ready figures' },
        { t: 'Deductions', d: 'Tax, pension, and custom payroll rules' },
        { t: 'Debt Visibility', d: 'Track salary liabilities and employee debt recovery paths' },
      ],
    },
    {
      label: 'Accounting',
      title: 'Live Journals, COA and Closings',
      desc: 'Follow journals, chart of accounts balances, ledgers, and closing-aware financial summaries without recomputing from day one each time.',
      feats: [
        { t: 'Computed COA', d: 'Operational activity feeds the accounting layer' },
        { t: 'Incremental Closings', d: 'Use prior snapshots to accelerate new summaries' },
        { t: 'Ledger Views', d: 'Move from COA to ledgers, trial balance, and statements' },
      ],
    },
  ]

  const appCards = [
    { n: 'Dashboard', e: '📈', c: 'rgba(43,106,75,0.1)' },
    { n: 'Employees', e: '👥', c: 'rgba(255,226,154,0.3)' },
    { n: 'Departments', e: '🏢', c: 'rgba(106,242,173,0.15)' },
    { n: 'Positions', e: '📋', c: 'rgba(59,130,246,0.1)' },
    { n: 'Attendance', e: '⏰', c: 'rgba(43,106,75,0.1)' },
    { n: 'Payroll', e: '💵', c: 'rgba(255,226,154,0.3)' },
    { n: 'POS', e: '🏪', c: 'rgba(106,242,173,0.15)' },
    { n: 'Delivery', e: '🚚', c: 'rgba(240,93,94,0.1)' },
    { n: 'Sales', e: '💰', c: 'rgba(43,106,75,0.1)' },
    { n: 'Inventory', e: '📦', c: 'rgba(59,130,246,0.1)' },
    { n: 'Accommodation', e: '🏨', c: 'rgba(255,226,154,0.3)' },
    { n: 'Purchase', e: '🛒', c: 'rgba(106,242,173,0.15)' },
    { n: 'Expenses', e: '💸', c: 'rgba(240,93,94,0.1)' },
    { n: 'Journals & COA', e: '📊', c: 'rgba(43,106,75,0.1)' },
    { n: 'Settings', e: '⚙️', c: 'rgba(59,130,246,0.1)' },
  ]

  const allInOneCards = [
    { icon: '🏪', title: 'POS -> Inventory', desc: 'Sales auto-deduct stock in real time' },
    { icon: '⏰', title: 'Attendance -> Payroll', desc: 'Hours worked flow directly into payroll processing' },
    { icon: '📦', title: 'Purchase -> Inventory', desc: 'Incoming goods update stock positions instantly' },
    { icon: '📊', title: 'Operations -> COA', desc: 'Operational activity feeds live financial summaries and reports' },
    { icon: '🚚', title: 'Orders -> Delivery', desc: 'Dispatch orders directly from the operational flow' },
    { icon: '💸', title: 'Expenses -> Accounting', desc: 'Costs are tracked, categorized, and reflected downstream' },
    { icon: '🏨', title: 'Accommodation -> Revenue', desc: 'Bookings tie directly into service income visibility' },
    { icon: '🔄', title: 'Offline -> Cloud', desc: 'Pending changes sync automatically and refresh summaries' },
  ]

  const industries = [
    { icon: '🛒', title: 'Retail & eCommerce', desc: 'POS, inventory, and multi-location stock management for fast-moving retail teams.' },
    { icon: '🏭', title: 'Manufacturing', desc: 'Purchasing, stock movement, costing visibility, and workforce administration.' },
    { icon: '🏨', title: 'Hospitality', desc: 'Accommodation, restaurant POS, tables, service operations, and delivery.' },
    { icon: '🔧', title: 'Professional Services', desc: 'Employee management, attendance, expenses, and connected reporting.' },
    { icon: '🏗️', title: 'Construction', desc: 'Project expenses, payroll, and on-site attendance tracking.' },
    { icon: '🏥', title: 'Healthcare', desc: 'Staff scheduling, payroll processing, and department coordination.' },
  ]

  return (
    <div className="ec-landing">
      <NavBar />

      <section className="ec-hero" id="top">
        <div className="ec-hero-inner">
          <div>
            <div className="ec-hero-kicker">All-in-One Business Platform</div>
            <h1>Run Your Entire Business with <span className="ec-highlight">One Platform</span></h1>
            <p>
              Enterprise Compute unifies HR, inventory, POS, sales, payroll, delivery, accommodation,
              and live accounting into one operating platform with real-time summaries and closing-aware reporting.
            </p>
            <div className="sp-badge-row" style={{ justifyContent: 'flex-start', marginTop: 0, marginBottom: 24 }}>
              <span className="sp-plan-chip">14-day free trial</span>
              <span className="sp-plan-chip">All apps included</span>
              <span className="sp-plan-chip">Live accounting and dashboard summaries</span>
            </div>
            <div className="ec-hero-btns">
              <button className="ec-btn-primary" onClick={() => navigate('/pricing')}>View Pricing</button>
              <button className="ec-btn-secondary" onClick={() => navigate('/help')}>Schedule a Demo</button>
            </div>
          </div>
          <div className="ec-hero-visual">
            <div className="logo-link" onClick={() => navigate('/')}>
              <img src={applogo} alt="Enterprise Compute Dashboard" className="ec-hero-mockup" />
            </div>
          </div>
        </div>
      </section>

      <section className="ec-trust">
        <p>Trusted by businesses across industries</p>
        <div className="ec-trust-logos">
          {['Retail Co.', 'TechVenture', 'GreenField', 'Metro Group', 'AlphaServ', 'BlueChip Inc.'].map((name) => (
            <div key={name} style={{ padding: '12px 24px', borderRadius: 12, background: '#f4f7f4', fontWeight: 700, color: 'rgba(23,56,41,0.3)', fontSize: '0.95rem', letterSpacing: '-0.5px' }}>
              {name}
            </div>
          ))}
        </div>
      </section>

      <section className="ec-section ec-value-section">
        <div className="ec-section-header">
          <div className="ec-section-kicker">Why Enterprise Compute</div>
          <h2 className="ec-section-title">Everything Your Business Needs, Nothing It Doesn't</h2>
          <p className="ec-section-sub">A modular ERP designed to scale with you from startup operations to multi-team execution.</p>
        </div>
        <div className="ec-value-grid">
          {[
            { icon: '🔗', title: 'Fully Integrated', desc: 'All modules work together seamlessly. Sales feed inventory, attendance feeds payroll, and operations feed accounting.', bg: 'rgba(43,106,75,0.1)' },
            { icon: '📡', title: 'Real-Time Sync', desc: 'Tenant-scoped Server-Sent Events keep dashboards, sessions, and summary data updated instantly.', bg: 'rgba(255,226,154,0.3)' },
            { icon: '🌐', title: 'Works Offline', desc: 'IndexedDB-powered offline mode lets teams queue changes locally and sync when reconnected.', bg: 'rgba(106,242,173,0.15)' },
            { icon: '🔐', title: 'Role-Based Access', desc: 'Control who sees, edits, approves, posts, and exports across the platform.', bg: 'rgba(59,130,246,0.1)' },
          ].map((item) => (
            <div className="ec-value-card" key={item.title}>
              <div className="ec-value-icon" style={{ background: item.bg }}>{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ec-section ec-apps-section">
        <div className="ec-section-header">
          <div className="ec-section-kicker">Product Ecosystem</div>
          <h2 className="ec-section-title">One Platform, Every Module You Need</h2>
          <p className="ec-section-sub">Run daily operations, approvals, reporting, and accounting from one connected system.</p>
        </div>
        <div className="ec-apps-grid">
          {appCards.map((app) => (
            <div className="ec-app-card" key={app.n}>
              <div className="ec-app-card-icon" style={{ background: app.c }}>{app.e}</div>
              <strong>{app.n}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="ec-section ec-demo-section">
        <div className="ec-section-header">
          <div className="ec-section-kicker">See It In Action</div>
          <h2 className="ec-section-title">Powerful Modules, Simple Interface</h2>
          <p className="ec-section-sub">Explore the main operating surfaces behind the platform.</p>
        </div>
        <div className="ec-demo-tabs">
          {demoTabs.map((tab, index) => (
            <button key={tab.label} className={`ec-demo-tab ${demoTab === index ? 'active' : ''}`} onClick={() => setDemoTab(index)}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ec-demo-preview">
          <h3>{demoTabs[demoTab].title}</h3>
          <p>{demoTabs[demoTab].desc}</p>
          <div className="ec-demo-features">
            {demoTabs[demoTab].feats.map((feature) => (
              <div className="ec-demo-feat" key={feature.t}>
                <strong>{feature.t}</strong>
                <span>{feature.d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ec-section" style={{ background: '#fff' }}>
        <div className="ec-feature-block">
          <div className="ec-feature-text">
            <div className="ec-section-kicker">Human Resources</div>
            <h2>Manage Your Workforce End-to-End</h2>
            <p>From onboarding to payroll, handle workforce operations, approvals, deductions, and live visibility into payroll obligations in one place.</p>
            <ul className="ec-feature-list">
              <li>Employee profiles with role-based access</li>
              <li>Automated attendance and time tracking</li>
              <li>Payroll visibility for paid, pending, and debt recovery workflows</li>
              <li>Department and position management</li>
            </ul>
          </div>
          <div><div style={{ width: '100%', height: 340, borderRadius: 24, background: 'linear-gradient(135deg,rgba(255,226,154,0.2),rgba(223,241,230,0.3))', display: 'grid', placeItems: 'center', fontSize: '4rem' }}>👥</div></div>
        </div>
        <div className="ec-feature-block reverse">
          <div className="ec-feature-text">
            <div className="ec-section-kicker">Point of Sale</div>
            <h2>The Fastest POS Your Team Can Adopt</h2>
            <p>Multi-session, multi-warehouse, offline-capable POS with delivery support, receipt flows, and instant dashboard summary updates.</p>
            <ul className="ec-feature-list">
              <li>Real-time inventory deduction</li>
              <li>Multiple payment methods</li>
              <li>Table management and delivery orders</li>
              <li>Session-based cash tracking with live summary refresh</li>
            </ul>
          </div>
          <div><div style={{ width: '100%', height: 340, borderRadius: 24, background: 'linear-gradient(135deg,rgba(106,242,173,0.15),rgba(43,106,75,0.08))', display: 'grid', placeItems: 'center', fontSize: '4rem' }}>🏪</div></div>
        </div>
      </section>

      <section className="ec-allinone">
        <div className="ec-section-header">
          <div className="ec-section-kicker">Connected Ecosystem</div>
          <h2 className="ec-section-title">Everything Works Together</h2>
          <p className="ec-section-sub">Every module feeds into every other. No data silos, no duplicate entry, and no isolated reporting layer.</p>
        </div>
        <div className="ec-allinone-grid">
          {allInOneCards.map((card) => (
            <div className="ec-allinone-card" key={card.title}>
              <div className="ec-aio-icon">{card.icon}</div>
              <h4>{card.title}</h4>
              <p>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ec-section ec-industries-section">
        <div className="ec-section-header">
          <div className="ec-section-kicker">Built for Every Industry</div>
          <h2 className="ec-section-title">Solutions Tailored to Your Sector</h2>
        </div>
        <div className="ec-industry-cards">
          {industries.map((industry) => (
            <div className="ec-industry-card" key={industry.title}>
              <div className="ind-icon">{industry.icon}</div>
              <h3>{industry.title}</h3>
              <p>{industry.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ec-section ec-testimonials">
        <div className="ec-section-header">
          <div className="ec-section-kicker">Testimonials</div>
          <h2 className="ec-section-title">Loved by Teams Everywhere</h2>
        </div>
        <div className="ec-testimonial-grid">
          {[
            { q: 'Enterprise Compute replaced four different tools we were using. Everything is now in one place and our team productivity has doubled.', n: 'Sarah K.', r: 'Operations Manager', i: 'SK' },
            { q: 'The offline POS mode saved us during a network outage. We did not lose a single sale and the sync recovered cleanly.', n: 'Michael R.', r: 'Retail Director', i: 'MR' },
            { q: 'Payroll used to take us three days. With attendance integration and better summaries, it now takes a fraction of the time.', n: 'Amara T.', r: 'HR Director', i: 'AT' },
          ].map((testimonial) => (
            <div className="ec-testimonial-card" key={testimonial.i}>
              <div className="stars">★★★★★</div>
              <blockquote>"{testimonial.q}"</blockquote>
              <div className="ec-testimonial-author">
                <div className="ec-testimonial-avatar">{testimonial.i}</div>
                <div className="ec-testimonial-info">
                  <strong>{testimonial.n}</strong>
                  <span>{testimonial.r}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ec-final-cta">
        <h2>Ready to Transform Your Business?</h2>
        <p>Start with a free 14-day trial, then move into production billing with secure Paystack checkout when your team is ready.</p>
        <div className="ec-hero-btns">
          <button className="ec-btn-primary" onClick={() => navigate('/signup')}>Start Free Trial</button>
          <button className="ec-btn-secondary" onClick={() => navigate('/help')}>Schedule a Demo</button>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default LandingPage
