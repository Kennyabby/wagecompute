/* ============================================================================
   /help — help centre.
   ----------------------------------------------------------------------------
   Redesigned onto the public design system. The enquiry logic is unchanged:
   it still posts to /public/support/enquiry with the same payload shape
   (including tenant and visitorUserEmail) that the server already expects.
   ========================================================================= */

import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Accordion, Button, Card, Container, FastFacts, Grid, Hero,
  Section, TextLink, Tile, Tiles,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { PRODUCTS } from './content/products'
import { RESOURCES } from './content/resources'
import '../Login/Login.css'

const CATEGORIES = [
  { title: 'Getting started', desc: 'First steps, setup and data loading', image: 'businessTraining', to: '/docs' },
  { title: 'Point of Sale', desc: 'Tills, sessions, cash and receipts', image: 'posTerminal', to: '/products/pos' },
  { title: 'Inventory', desc: 'Stock, transfers, counts and production', image: 'warehouseRacks', to: '/products/inventory' },
  { title: 'Sales & purchasing', desc: 'Orders, invoicing, receipts and payables', image: 'posCard', to: '/products/sales' },
  { title: 'HR & payroll', desc: 'Employees, attendance, pay runs and payslips', image: 'workingOffice', to: '/products/payroll' },
  { title: 'Accounting', desc: 'Chart of accounts, journals and closings', image: 'accountantDesk', to: '/products/journals' },
  { title: 'Reports', desc: 'Trial balance, P&L, balance sheet and exports', image: 'financialAnalysis', to: '/products/reports' },
  { title: 'Settings & access', desc: 'Permissions, approvals and configuration', image: 'cyberSecurity', to: '/products/settings' },
  { title: 'Epsilon AI', desc: 'Asking questions and reading the answers', image: 'dataAnalytics', to: '/products/epsilon' },
]

const FAQS = [
  { q: 'How do I add a new employee?', a: 'Open the Employees module, choose Add Employee, complete the required fields including employment terms and bank details, then save. Place them in a department and position, and assign the access profile that matches their role. That profile is what governs everything they can do in the platform.' },
  { q: 'How do I open a POS session?', a: 'Go to the POS module, select the warehouse the till sells from, choose Open Session and enter your opening cash float. The session is what ties the day’s sales and the closing count to you, so it has to be opened under your own login rather than a shared one.' },
  { q: 'Can I use the system offline?', a: 'Yes. Operational screens switch to local-first working when the connection drops: sales continue, changes are queued in the browser’s local storage, and the queue replays in order when connectivity returns. Each queued change carries a transaction id, so a retry after a partly failed upload cannot post the same sale twice.' },
  { q: 'How do I run payroll?', a: 'Make sure the period’s attendance has been approved by supervisors first, because the pay run reads approved hours directly. Then open Payroll, select the period and employees, generate the run, review it, and approve. Payslips issue and the cost, deduction liabilities and net pay post to the ledger as part of the run.' },
  { q: 'How do I set user permissions?', a: 'Settings → Employee Settings. Permissions are granted per action rather than per screen, so you can let someone sell without letting them discount, or transfer stock without letting them post adjustments.' },
  { q: 'Why can I not see a module I expected?', a: 'Either it is not enabled for your workspace, or your access profile does not include it. A workspace administrator can check both from Settings. Enabling a module takes effect immediately and the new price applies from your next renewal, not the day you turn it on.' },
  { q: 'How do I correct a posted transaction?', a: 'Posted entries are corrected with a reversing entry rather than being edited or deleted, so the original and the correction both remain visible. That is deliberate. It is what makes the audit trail worth having.' },
  { q: 'My stock count does not match the system. What now?', a: 'Open the item’s movement history: every sale, purchase, transfer, production consumption, wastage and adjustment is recorded with a date, a document and a person. The gap is almost always one of those. Once you have found it, post the correction as an adjustment with a reason code rather than silently overwriting the figure.' },
]

const HelpPage = () => {
  const { storePath, server, company, viewAccess } = useContext(ContextProvider)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', subject: '', category: 'General Support', message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { storePath('help') }, [storePath])

  useEffect(() => {
    if (!viewAccess) return
    setForm((previous) => ({
      ...previous,
      name: previous.name || viewAccess.name || '',
      email: previous.email || viewAccess.emailid || viewAccess.username || '',
    }))
  }, [viewAccess])

  const show = (text, type = 'error') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 6000)
  }

  // Searches the guides and module pages that already exist, rather than a
  // knowledge base that does not.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return null
    const fromResources = RESOURCES
      .filter((r) => `${r.title} ${r.text} ${r.topic}`.toLowerCase().includes(q))
      .map((r) => ({ kind: r.type, title: r.title, text: r.text, to: r.to }))
    const fromProducts = PRODUCTS
      .filter((p) => `${p.name} ${p.summary} ${p.eyebrow}`.toLowerCase().includes(q))
      .map((p) => ({ kind: 'Module', title: p.name, text: p.summary, to: `/products/${p.slug}` }))
    return [...fromProducts, ...fromResources].slice(0, 9)
  }, [query])

  const submit = async (event) => {
    event.preventDefault()
    if (!form.name || !form.email || !form.message) {
      show('Please fill in your name, email and message.', 'warning')
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch(`${server}/public/support/enquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tenant: company || '',
          visitorUserEmail: viewAccess?.emailid || viewAccess?.username || '',
        }),
      })
      const data = await response.json()
      if (data.ok) {
        show('Your enquiry has been sent. We will come back to you shortly.', 'success')
        setForm({ name: '', email: '', subject: '', category: 'General Support', message: '' })
      } else {
        show(`Failed to send enquiry: ${data.error || 'unknown error'}`, 'error')
      }
    } catch (error) {
      console.error(error)
      show('Network error. Please try again later.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const SECTIONS = [
    { id: 'categories', label: 'Browse by area' },
    { id: 'faq', label: 'Common questions' },
    { id: 'contact', label: 'Ask us' },
  ]

  return (
    <PageShell
      title="Help & support | Enterprise Compute"
      description="Search the guides, browse help by module, read the common questions, or send the support team a message."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Help' }]}
      subnavTitle="Help"
      sections={SECTIONS}
      subnavCta={{ label: 'Contact support', to: '/contact' }}
    >
      <Hero
        eyebrow="Help & support"
        title="What are you trying to do?"
        lede="Search the guides and module reference, browse by area, or send us a message. Most answers are faster than waiting for a reply."
        image={heroImg('supportAgent')}
      >
        <div className="ds-search" style={{ marginTop: 8 }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guides and module reference"
            aria-label="Search help"
          />
          <button type="button" onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })}>
            Search
          </button>
        </div>
      </Hero>

      {results && (
        <Section tight eyebrow="Search results" title={`${results.length} ${results.length === 1 ? 'match' : 'matches'} for "${query.trim()}"`}>
          {results.length === 0 ? (
            <p className="ds-body">
              Nothing matched. Try a module name or a task such as &ldquo;stock count&rdquo;, or{' '}
              <button type="button" className="ds-link" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
                <span>ask us directly</span>
              </button>.
            </p>
          ) : (
            <Tiles cols={3}>
              {results.map((result) => (
                <Tile
                  key={`${result.kind}-${result.title}`}
                  eyebrow={result.kind}
                  title={result.title}
                  text={result.text}
                  link="Open"
                  to={result.to}
                  navigate={navigate}
                />
              ))}
            </Tiles>
          )}
        </Section>
      )}

      <Section variant="alt" tight>
        <FastFacts
          cols={4}
          items={[
            { value: '19', label: 'Modules documented end to end' },
            { value: 'Free', label: 'Support on every plan, including the trial' },
            { value: 'Fortnightly', label: 'Open office hours with the product team' },
            { value: 'Templates', label: 'For catalogue, stock, rooms and opening balances' },
          ]}
        />
      </Section>

      {/* ----------------------------------------------------- categories -- */}
      <Section
        id="categories"
        eyebrow="Browse by area"
        title="Find the part of the platform you are in"
        subtitle="Each area links to its module page, which explains what it does, what it depends on and what it posts to the ledger."
        split
      >
        <Grid cols={3}>
          {CATEGORIES.map((category) => (
            <Card
              key={category.title}
              flat
              image={img(category.image, 'card')}
              title={category.title}
              text={category.desc}
              link="Open guide"
              to={category.to}
              navigate={navigate}
            />
          ))}
        </Grid>
        <div className="ds-section-foot">
          <div className="ds-link-list">
            <TextLink to="/docs" navigate={navigate}>Full documentation</TextLink>
            <TextLink to="/resources" navigate={navigate}>Resource library</TextLink>
            <TextLink to="/training" navigate={navigate}>Training paths</TextLink>
            <TextLink to="/community" navigate={navigate}>Community forums</TextLink>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------ FAQ -- */}
      <Section id="faq" variant="cream" eyebrow="Common questions" title="The ones we are asked most">
        <Container width="narrow">
          <Accordion items={FAQS} />
        </Container>
      </Section>

      {/* -------------------------------------------------------- contact -- */}
      <Section id="contact" eyebrow="Ask us" title="Send the support team a message">
        <Container width="narrow">
          <form onSubmit={submit}>
            <div className="ds-form-grid">
              <label className="ds-field">
                <span>Your name *</span>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" required />
              </label>
              <label className="ds-field">
                <span>Email address *</span>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" required />
              </label>
              <label className="ds-field span-2">
                <span>Area</span>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="General Support">General support</option>
                  {CATEGORIES.map((category) => (
                    <option key={category.title} value={category.title}>{category.title}</option>
                  ))}
                  <option value="Other">Something else</option>
                </select>
              </label>
              <label className="ds-field span-2">
                <span>Subject</span>
                <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="A one-line summary" />
              </label>
              <label className="ds-field span-2">
                <span>Message *</span>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="What you were doing, what you expected, and what happened instead."
                  required
                />
                <span className="ds-field-hint">
                  If it relates to a specific transaction, include the document reference. It makes the first reply far more useful.
                </span>
              </label>
              <div className="span-2">
                <Button variant="primary" size="lg" type="submit" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send message'}
                </Button>
              </div>
            </div>
          </form>
        </Container>
      </Section>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="help-toast"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`login-toast ${toast.type}`}
          >
            <div className="login-toast-accent" />
            <div className="login-toast-icon">
              {toast.type === 'success' ? '✓' : toast.type === 'info' ? 'ℹ' : '!'}
            </div>
            <span className="login-toast-text">{toast.text}</span>
            <button className="login-toast-close" onClick={() => setToast(null)}>×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}

export default HelpPage
