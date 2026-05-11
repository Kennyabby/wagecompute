import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import applogo from '../../Resources/assets/images/enterprisecompute.png'
import ContextProvider from '../../Resources/ContextProvider'

const NavBar = () => {
  const { companyRecord, loadedCurPath } = useContext(ContextProvider)
  const Navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Check if user is authenticated based on context
  const isAuthenticated = companyRecord && companyRecord.emailid;

  const appColumns = [
    { title: 'Human Resources', color: 'green', items: [
      { name: 'Employees', desc: 'People management' },
      { name: 'Attendance', desc: 'Time tracking' },
      { name: 'Payroll', desc: 'Salary processing' },
      { name: 'Departments', desc: 'Org structure' },
      { name: 'Positions', desc: 'Role management' }
    ]},
    { title: 'Finance', color: 'gold', items: [
      { name: 'Sales', desc: 'Revenue tracking' },
      { name: 'Purchase', desc: 'Procurement' },
      { name: 'Expenses', desc: 'Cost management' },
      { name: 'Journals & COA', desc: 'Live accounting' }
    ]},
    { title: 'Operations', color: 'teal', items: [
      { name: 'Inventory', desc: 'Stock control' },
      { name: 'POS', desc: 'Point of Sale' },
      { name: 'Delivery', desc: 'Order dispatch' },
      { name: 'Accommodation', desc: 'Hospitality mgmt' }
    ]},
    { title: 'Platform', color: 'blue', items: [
      { name: 'Dashboard', desc: 'Operations overview' },
      { name: 'Settings', desc: 'System config' },
      { name: 'Offline Sync', desc: 'Work anywhere' }
    ]}
  ]

  const industries = [
    { title: 'Retail', items: ['CRM', 'Sales', 'Inventory'] },
    { title: 'Manufacturing', items: ['Purchase', 'Inventory'] },
    { title: 'Construction', items: ['Expenses', 'Payroll'] },
    { title: 'Healthcare', items: ['Attendance', 'Employees'] },
    { title: 'Hospitality', items: ['POS', 'Accommodation'] },
    { title: 'Education', items: ['Attendance', 'Payroll'] },
    { title: 'Services', items: ['Sales', 'Expenses'] },
    { title: 'Finance', items: ['Reports', 'Sales'] }
  ]

  const indIcons = ['🛒','🏭','🏗️','🏥','🏨','📚','🔧','🏦']

  const handleDashboardRedirect = () => {
    if (companyRecord.status === 'admin') {
      Navigate('/dashboard')
    } else {
      Navigate('/' + (loadedCurPath || ''))
    }
  }

  return (
    <>
      <nav className={`ec-navbar ${scrolled ? 'scrolled' : ''}`}>
        <a className="ec-nav-logo" href="/" onClick={(e) => { e.preventDefault(); Navigate('/') }}>
          <img src={applogo} alt="EC" />
          <span>Enterprise Compute</span>
        </a>
        <div className="ec-nav-center">
          <div className={`ec-nav-item ${activeMenu === 'apps' ? 'active' : ''}`}
            onMouseEnter={() => setActiveMenu('apps')} onMouseLeave={() => setActiveMenu(null)}>
            Apps ▾
            <div className="ec-mega-menu wide">
              <div className="ec-mega-cols">
                {appColumns.map((col, i) => (
                  <div key={i}>
                    <div className="ec-mega-col-title">{col.title}</div>
                    {col.items.map((item, j) => (
                      <div className="ec-mega-link" key={j}>
                        <div className={`ec-mega-icon ${col.color}`}>
                          {['👥','⏰','💵','🏢','📋','💰','📦','💸','📊','📦','🏪','🚚','🏨','📈','⚙️','🔄'][i * 5 + j] || '📋'}
                        </div>
                        <div className="ec-mega-link-text"><strong>{item.name}</strong><span>{item.desc}</span></div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`ec-nav-item ${activeMenu === 'ind' ? 'active' : ''}`}
            onMouseEnter={() => setActiveMenu('ind')} onMouseLeave={() => setActiveMenu(null)}>
            Industries ▾
            <div className="ec-mega-menu">
              <div className="ec-mega-cols">
                {industries.map((ind, i) => (
                  <div className="ec-mega-link" key={i}>
                    <div className="ec-mega-icon green">{indIcons[i]}</div>
                    <div className="ec-mega-link-text"><strong>{ind.title}</strong><span>{ind.items.join(', ')}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ec-nav-item" onClick={() => Navigate('/community')}>Community</div>
          <div className="ec-nav-item" onClick={() => Navigate('/pricing')}>Pricing</div>
          <div className="ec-nav-item" onClick={() => Navigate('/help')}>Help</div>
        </div>
        <div className="ec-nav-right">
          {isAuthenticated ? (
            <button className="ec-nav-cta" onClick={handleDashboardRedirect}>Go to Dashboard</button>
          ) : (
            <>
              <button className="ec-nav-signin" onClick={() => Navigate('/login')}>Sign in</button>
              <button className="ec-nav-cta" onClick={() => Navigate('/signup')}>Try it free</button>
            </>
          )}
          <button className="ec-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? '✕' : '☰'}</button>
        </div>
      </nav>

      <div className={`ec-mobile-overlay ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />
      <div className={`ec-mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <div className="ec-nav-item" onClick={() => { setMobileOpen(false); Navigate('/') }}>Home</div>
        <div className="ec-nav-item" onClick={() => { setMobileOpen(false); Navigate('/community') }}>Community</div>
        <div className="ec-nav-item" onClick={() => { setMobileOpen(false); Navigate('/pricing') }}>Pricing</div>
        <div className="ec-nav-item" onClick={() => { setMobileOpen(false); Navigate('/help') }}>Help</div>
        {isAuthenticated ? (
          <button className="ec-nav-cta" onClick={() => { setMobileOpen(false); handleDashboardRedirect(); }}>Dashboard</button>
        ) : (
          <button className="ec-nav-cta" onClick={() => { setMobileOpen(false); Navigate('/signup') }}>Try it free</button>
        )}
      </div>
    </>
  )
}

export default NavBar
