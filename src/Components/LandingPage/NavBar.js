import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import applogo from '../../Resources/assets/images/enterprisecompute.png'
import ContextProvider from '../../Resources/ContextProvider'
import MODULE_ICONS from '../../Resources/moduleIcons'
import { MdSync } from 'react-icons/md'
import { FiMenu, FiX } from 'react-icons/fi'
import { FaShoppingCart, FaIndustry, FaHardHat, FaHospital, FaHotel, FaGraduationCap, FaTools, FaUniversity } from 'react-icons/fa'

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
      { name: 'Employees', desc: 'People management', icon: MODULE_ICONS.employees },
      { name: 'Attendance', desc: 'Time tracking', icon: MODULE_ICONS.attendance },
      { name: 'Payroll', desc: 'Salary processing', icon: MODULE_ICONS.payroll },
      { name: 'Departments', desc: 'Org structure', icon: MODULE_ICONS.departments },
      { name: 'Positions', desc: 'Role management', icon: MODULE_ICONS.positions }
    ]},
    { title: 'Finance', color: 'gold', items: [
      { name: 'Sales', desc: 'Revenue tracking', icon: MODULE_ICONS.sales },
      { name: 'Purchase', desc: 'Procurement', icon: MODULE_ICONS.purchase },
      { name: 'Expenses', desc: 'Cost management', icon: MODULE_ICONS.expenses },
      { name: 'Journals & COA', desc: 'Live accounting', icon: MODULE_ICONS.journals }
    ]},
    { title: 'Operations', color: 'teal', items: [
      { name: 'Inventory', desc: 'Stock control', icon: MODULE_ICONS.inventory },
      { name: 'POS', desc: 'Point of Sale', icon: MODULE_ICONS.pos },
      { name: 'Delivery', desc: 'Order dispatch', icon: MODULE_ICONS.delivery },
      { name: 'Accommodation', desc: 'Hospitality mgmt', icon: MODULE_ICONS.accommodations }
    ]},
    { title: 'Platform', color: 'blue', items: [
      { name: 'Dashboard', desc: 'Operations overview', icon: MODULE_ICONS.dashboard },
      { name: 'Settings', desc: 'System config', icon: MODULE_ICONS.settings },
      { name: 'Offline Sync', desc: 'Work anywhere', icon: MdSync },
      { name: 'Epsilon AI', desc: 'AI assistant, paid add-on', icon: MODULE_ICONS.epsilon, path: '/pricing#epsilon' }
    ]}
  ]

  const industries = [
    { title: 'Retail', items: ['CRM', 'Sales', 'Inventory'], icon: FaShoppingCart },
    { title: 'Manufacturing', items: ['Purchase', 'Inventory'], icon: FaIndustry },
    { title: 'Construction', items: ['Expenses', 'Payroll'], icon: FaHardHat },
    { title: 'Healthcare', items: ['Attendance', 'Employees'], icon: FaHospital },
    { title: 'Hospitality', items: ['POS', 'Accommodation'], icon: FaHotel },
    { title: 'Education', items: ['Attendance', 'Payroll'], icon: FaGraduationCap },
    { title: 'Services', items: ['Sales', 'Expenses'], icon: FaTools },
    { title: 'Finance', items: ['Reports', 'Sales'], icon: FaUniversity }
  ]

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
                    {col.items.map((item, j) => {
                      const Icon = item.icon
                      return (
                        <div
                          className="ec-mega-link"
                          key={j}
                          onClick={item.path ? () => Navigate(item.path) : undefined}
                          style={item.path ? { cursor: 'pointer' } : undefined}
                        >
                          <div className={`ec-mega-icon ${col.color}`}>
                            {Icon && <Icon />}
                          </div>
                          <div className="ec-mega-link-text"><strong>{item.name}</strong><span>{item.desc}</span></div>
                        </div>
                      )
                    })}
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
                {industries.map((ind, i) => {
                  const Icon = ind.icon
                  return (
                    <div className="ec-mega-link" key={i}>
                      <div className="ec-mega-icon green">{Icon && <Icon />}</div>
                      <div className="ec-mega-link-text"><strong>{ind.title}</strong><span>{ind.items.join(', ')}</span></div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="ec-nav-item" onClick={() => Navigate('/community')}>Community</div>
          <div className="ec-nav-item" onClick={() => Navigate('/pricing')}>Pricing</div>
          <div className="ec-nav-item" onClick={() => Navigate('/about')}>About</div>
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
          <button className="ec-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <FiX /> : <FiMenu />}</button>
        </div>
      </nav>

      <div className={`ec-mobile-overlay ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />
      <div className={`ec-mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <div className="ec-nav-item" onClick={() => { setMobileOpen(false); Navigate('/') }}>Home</div>
        <div className="ec-nav-item" onClick={() => { setMobileOpen(false); Navigate('/community') }}>Community</div>
        <div className="ec-nav-item" onClick={() => { setMobileOpen(false); Navigate('/pricing') }}>Pricing</div>
        <div className="ec-nav-item" onClick={() => { setMobileOpen(false); Navigate('/about') }}>About</div>
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
