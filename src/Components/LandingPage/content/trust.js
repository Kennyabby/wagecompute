/* ============================================================================
   Content for /trust-center.
   ----------------------------------------------------------------------------
   Modelled on SAP's Trust Center, which is one of the genuinely good patterns
   on their site: security, privacy, availability and compliance as one
   destination rather than scattered through legal pages.

   IMPORTANT, every claim below describes a control the platform actually
   implements (tenant isolation, per-action permissions, audit trails,
   encryption in transit, offline queue durability). Nothing here asserts a
   third-party certification. `CERTIFICATION_POSTURE` states the position
   plainly instead, because claiming an audit you have not passed is both
   dishonest and, for enterprise buyers, trivially checkable.
   ========================================================================= */

export const TRUST_PILLARS = [
  {
    id: 'security',
    name: 'Security',
    headline: 'Access is a decision, not an assumption',
    image: 'cyberSecurity',
    text: 'Every action in the platform is governed by the same per-action permission model, and every posted record carries an audit trail.',
    points: [
      { title: 'Per-action permissions', text: 'Not "can open Inventory" but can they adjust stock, approve a transfer, post a journal or export a report, each granted independently per profile.' },
      { title: 'Tenant isolation', text: 'Each workspace’s data is scoped to its own tenant. Requests are resolved to a tenant before any handler runs, and no query crosses that boundary.' },
      { title: 'Audit trail on every posted record', text: 'Who created it, who changed it, who approved it, when, and from where. Corrections are reversing entries, so history is never silently rewritten.' },
      { title: 'Encrypted in transit', text: 'All traffic between clients and the platform is served over TLS. Session credentials are carried in HTTP-only cookies rather than exposed to page scripts.' },
      { title: 'Verified account creation', text: 'New workspaces are created through an email-verified signup flow with one-time passcode confirmation, not by an unauthenticated endpoint.' },
      { title: 'Separated administrative surface', text: 'Platform administration runs on its own host and its own authentication, entirely separate from tenant workspaces.' },
    ],
  },
  {
    id: 'privacy',
    name: 'Privacy & data',
    headline: 'Your records are yours, and you can take them with you',
    image: 'dataProtection',
    text: 'We hold operational business data so the platform can function. We do not sell it, and we do not use one workspace’s records to serve another.',
    points: [
      { title: 'Purpose-limited processing', text: 'Data is processed to operate the workspace you bought: running the modules, producing your reports, and supporting you when you ask.' },
      { title: 'No cross-tenant use', text: 'One workspace’s records are never used to produce results for another, including for AI features.' },
      { title: 'Scoped AI access', text: 'Epsilon answers inside the asking user’s own permission scope and within their own tenant, so it cannot be used to reach restricted or external data.' },
      { title: 'Export on demand', text: 'Reports, ledgers and operational records export to spreadsheet and PDF at any time, so leaving does not mean losing your history.' },
      { title: 'Defined retention', text: 'Retention and deletion on termination are set out in the terms of service rather than left to discretion.' },
      { title: 'Your obligations supported', text: 'Audit trails, access control and export exist partly so you can meet your own regulatory and reporting duties.' },
    ],
  },
  {
    id: 'availability',
    name: 'Availability & resilience',
    headline: 'Designed so an outage is not a stoppage',
    image: 'dataCentre',
    text: 'The honest resilience story for a business in a market with unreliable infrastructure is not an uptime number. It is that the business keeps trading when something is down.',
    points: [
      { title: 'Local-first clients', text: 'Point of sale and operational screens keep working during a connectivity loss, queueing changes locally rather than refusing them.' },
      { title: 'Durable local queue', text: 'Pending changes are written to IndexedDB so a refresh, a crash or a flat battery does not lose them.' },
      { title: 'Safe recovery', text: 'Queued changes carry client transaction ids, so a retry after a partially failed upload cannot post the same sale twice.' },
      { title: 'Conflicts surfaced', text: 'Clashing changes are raised for a person to resolve rather than settled silently by whichever write arrived last.' },
      { title: 'Desktop deployment option', text: 'For sites where connectivity is structurally unreliable, a packaged desktop build runs with a bundled local database.' },
      { title: 'Automatic convergence', text: 'Once a batch lands, period summaries and every open session refresh without anyone needing to intervene.' },
    ],
  },
  {
    id: 'compliance',
    name: 'Governance & compliance',
    headline: 'Controls you can show an auditor',
    image: 'executiveMeeting',
    text: 'Most compliance questions come down to one thing: can you demonstrate who did what. The platform is built so the answer is yes by default.',
    points: [
      { title: 'Approval routing with recorded decisions', text: 'Spend, discounts, write-offs and pay runs can require sign-off, with the approver and the decision stored against the record.' },
      { title: 'Segregation of duties', text: 'Because permissions are per action, the person who raises a purchase order need not be the person who approves it or the one who receives the goods.' },
      { title: 'Immutable period closings', text: 'A closed period is locked to its signed-off figures, so a signed statement cannot quietly change afterwards.' },
      { title: 'Reversals, not deletions', text: 'A posted entry is corrected by a reversing entry. The original remains, with both visible.' },
      { title: 'Attributed adjustments', text: 'Stock adjustments require a reason code, so write-offs are explained rather than absorbed.' },
      { title: 'Complete document chain', text: 'Any figure in a statement drills to its ledger entries and from there to the operational document that produced them.' },
    ],
  },
]

export const CERTIFICATION_POSTURE = {
  title: 'Where we stand on formal certification',
  body: [
    'We publish the controls we actually operate rather than badges we have not earned. Enterprise Compute is not currently certified against ISO 27001 or SOC 2, and we will not imply otherwise. Those are independently audited standards, and claiming one without the audit is both dishonest and easy for any serious buyer to disprove.',
    'What we can do today is answer a security questionnaire in detail, walk your team through the tenancy model, permission system and audit trail, and discuss contractual commitments on data handling, retention and breach notification as part of an Enterprise agreement.',
    'If a formal certification is a procurement requirement for you, tell us during evaluation. It changes the conversation and we would rather have it early than discover it at contract stage.',
  ],
  action: { label: 'Request a security review', to: '/contact' },
}

export const TRUST_FAQS = [
  {
    q: 'Where is my data held?',
    a: 'Workspace data is held in managed cloud infrastructure, isolated per tenant. For the desktop deployment, the bundled database runs on your own machine, which is the option most operators with strict data-residency concerns choose.',
  },
  {
    q: 'Can your staff see my records?',
    a: 'Access to production data is restricted to the small number of people who need it to operate and support the platform, and is only exercised in response to a support request or an operational incident. We are happy to put that commitment in a contract.',
  },
  {
    q: 'Does Epsilon send my business data to a third-party model?',
    a: 'Epsilon queries your records to construct an answer. The processing involved in generating that answer is covered in the terms of service and in the data-processing detail we provide during evaluation. Ask for it directly and we will walk you through exactly what is sent where.',
  },
  {
    q: 'What happens to my data if I stop paying?',
    a: 'Retention and deletion on termination are defined in the terms of service. Before that point you can export your reports, ledgers and operational records to spreadsheet and PDF at any time.',
  },
  {
    q: 'How do you handle a security incident?',
    a: 'Notification obligations and timelines form part of the Enterprise agreement. For an incident affecting your workspace specifically, you are contacted directly rather than finding out from a status page.',
  },
  {
    q: 'Can I restrict what my own staff can see?',
    a: 'Yes, and this is the control most customers actually need. Permissions are granted per action per module, so a cashier can sell without discounting, a storekeeper can transfer without adjusting, and an external accountant can read the ledger without touching operational records.',
  },
]

export default TRUST_PILLARS
