/* ============================================================================
   /contact — one form, routed by category.
   ----------------------------------------------------------------------------
   Submits to the same public endpoint the help centre already uses
   (/public/support/enquiry), so there is no new backend surface and no
   second inbox to monitor. The category field is what routes it internally.
   ========================================================================= */

import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ContextProvider from '../../Resources/ContextProvider'
import PageShell from './ds/PageShell'
import {
  Button, ButtonRow, Card, Container, FastFacts, Grid, Hero, Section, TextLink,
} from './ds/DS'
import { img, heroImg } from './ds/landingImages'
import { CONTACT_ROUTES } from './content/company'
import '../Login/Login.css'

const SECTIONS = [
  { id: 'routes', label: 'What do you need?' },
  { id: 'form', label: 'Send a message' },
  { id: 'other', label: 'Other ways' },
]

const ContactPage = () => {
  const { storePath, server, company, viewAccess } = useContext(ContextProvider)
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    category: CONTACT_ROUTES[0].category,
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { storePath('contact') }, [storePath])

  // Prefill from the visitor's session if there is one, so a signed-in
  // customer is not retyping details we already hold.
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

  const pickCategory = (category) => {
    setForm((previous) => ({ ...previous, category }))
    document.getElementById('form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
        show('Thank you. Your message is with us and we will come back to you shortly.', 'success')
        setForm({ name: '', email: '', subject: '', category: CONTACT_ROUTES[0].category, message: '' })
      } else {
        show(`We could not send that: ${data.error || 'unknown error'}`, 'error')
      }
    } catch (error) {
      console.error(error)
      show('Network error. Please try again, or email us directly.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell
      title="Contact us | Enterprise Compute"
      description="Talk to sales about a rollout, get support on a live workspace, discuss a partnership, request a security review, or make a press enquiry."
      breadcrumbs={[{ name: 'Home', to: '/' }, { name: 'Contact' }]}
      subnavTitle="Contact"
      sections={SECTIONS}
      subnavCta={{ label: 'Start free trial', to: '/signup' }}
    >
      <Hero
        eyebrow="Contact us"
        title="Tell us what you need and we will route it to a person"
        lede="One form, six destinations. Pick the category that fits and it reaches the team that can actually answer rather than a general inbox."
        image={heroImg('customerSupport')}
      >
        <ButtonRow>
          <Button variant="primary" onClick={() => document.getElementById('form')?.scrollIntoView({ behavior: 'smooth' })}>
            Send a message
          </Button>
          <Button variant="secondary" to="/help" navigate={navigate}>Search the help centre first</Button>
        </ButtonRow>
      </Hero>

      <Section variant="alt" tight>
        <FastFacts
          cols={4}
          items={[
            { value: '6', label: 'Routes, so your message reaches the right team' },
            { value: 'Free', label: 'Trial available without talking to anyone' },
            { value: 'Detailed', label: 'Security questionnaire responses on request' },
            { value: 'Honest', label: 'We will say when a different product fits better' },
          ]}
        />
      </Section>

      {/* --------------------------------------------------------- routes -- */}
      <Section
        id="routes"
        eyebrow="What do you need?"
        title="Pick a route"
        subtitle="Choosing one sets the category on the form below, which is what determines who picks it up."
        split
      >
        <Grid cols={3}>
          {CONTACT_ROUTES.map((route) => (
            <Card
              key={route.category}
              image={img(route.image, 'card')}
              title={route.title}
              text={route.text}
              link="Choose this"
              onClick={() => pickCategory(route.category)}
            />
          ))}
        </Grid>
      </Section>

      {/* ----------------------------------------------------------- form -- */}
      <Section id="form" variant="cream" eyebrow="Send a message" title="One form, straight to a person">
        <Container width="narrow">
          <form onSubmit={submit}>
            <div className="ds-form-grid">
              <label className="ds-field">
                <span>Your name *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  required
                />
              </label>
              <label className="ds-field">
                <span>Email address *</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                  required
                />
              </label>
              <label className="ds-field span-2">
                <span>What is this about?</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CONTACT_ROUTES.map((route) => (
                    <option key={route.category} value={route.category}>
                      {route.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ds-field span-2">
                <span>Subject</span>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="A one-line summary"
                />
              </label>
              <label className="ds-field span-2">
                <span>Message *</span>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="How many sites, what you are moving from, and when you need to be live. Or just the question."
                  required
                />
                <span className="ds-field-hint">
                  The more context you give, the more useful the first reply will be.
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

      {/* ---------------------------------------------------------- other -- */}
      <Section
        id="other"
        eyebrow="Other ways"
        title="You may not need us at all"
        subtitle="Most questions have a faster answer than waiting for a reply."
        split
      >
        <Grid cols={4}>
          <Card
            flat
            image={img('officeLaptop', 'card')}
            title="Documentation"
            text="Setup, configuration and module reference, including the data-loading templates."
            link="Read the docs"
            to="/docs"
            navigate={navigate}
          />
          <Card
            flat
            image={img('supportAgent', 'card')}
            title="Help centre"
            text="Searchable articles by module, plus the direct enquiry form for live workspaces."
            link="Open help centre"
            to="/help"
            navigate={navigate}
          />
          <Card
            flat
            image={img('teamCollaboration', 'card')}
            title="Community"
            text="Forums and user groups where other operators have usually hit it first."
            link="Join the community"
            to="/community"
            navigate={navigate}
          />
          <Card
            flat
            image={img('businessPresentation', 'card')}
            title="Office hours"
            text="Open sessions with the product team every other week. Bring a configuration problem."
            link="See the schedule"
            to="/events"
            navigate={navigate}
          />
        </Grid>
        <div className="ds-section-foot">
          <div className="ds-link-list">
            <TextLink to="/pricing" navigate={navigate}>Pricing and plan calculator</TextLink>
            <TextLink to="/trust-center" navigate={navigate}>Security and compliance</TextLink>
            <TextLink to="/partners" navigate={navigate}>Find an implementation partner</TextLink>
            <TextLink to="/careers" navigate={navigate}>Open roles</TextLink>
          </div>
        </div>
      </Section>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="contact-toast"
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

export default ContactPage
