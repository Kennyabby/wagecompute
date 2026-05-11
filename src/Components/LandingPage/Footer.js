import { useNavigate } from 'react-router-dom'
import applogo from '../../Resources/assets/images/enterprisecompute.png'

const Footer = () => {
  const Navigate = useNavigate()

  return (
    <footer className="ec-footer">
      <div className="ec-footer-inner">
        <div className="ec-footer-grid">
          <div className="ec-footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={applogo} alt="EC" style={{ height: 40, width: 40, borderRadius: 12 }} />
              <span style={{ fontFamily: "'MontserratBold',sans-serif", fontSize: '1.1rem' }}>Enterprise Compute</span>
            </div>
            <p>Powering productivity with precision. The all-in-one business management platform.</p>
          </div>
          <div className="ec-footer-col">
            <h4>Products</h4>
            {['Dashboard','Employees','Attendance','Payroll','POS','Inventory','Sales'].map((l, i) => <a key={i} href="/">{l}</a>)}
          </div>
          <div className="ec-footer-col">
            <h4>Company</h4>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/about') }}>About Us</a>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/careers') }}>Careers</a>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/blog') }}>Blog</a>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/press') }}>Press</a>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/partners') }}>Partners</a>
          </div>
          <div className="ec-footer-col">
            <h4>Resources</h4>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/help') }}>Help Center</a>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/community') }}>Community</a>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/docs') }}>Documentation</a>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/tutorials') }}>Tutorials</a>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/api') }}>API Reference</a>
          </div>
          <div className="ec-footer-col">
            <h4>Legal</h4>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/privacy') }}>Privacy Policy</a>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/terms') }}>Terms of Service</a>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/cookie-policy') }}>Cookie Policy</a>
            <a href="/" onClick={(e) => { e.preventDefault(); Navigate('/security') }}>Security</a>
          </div>
        </div>
        <div className="ec-footer-bottom">
          <span>© {new Date().getFullYear()} Enterprise Compute Central. All rights reserved.</span>
          <div className="ec-footer-socials">
            {['𝕏','in','▶','📘'].map((s, i) => <a key={i} href="/">{s}</a>)}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
