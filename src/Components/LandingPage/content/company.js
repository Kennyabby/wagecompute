/* ============================================================================
   Content for /about, /careers, /community and /contact.
   ----------------------------------------------------------------------------
   The About page follows SAP's company-information structure: a fast-fact
   row, a mission block, a values grid, a leadership section and then the
   long-form story, which here is the existing PlatformStory walkthrough,
   kept exactly as it was and simply re-housed in the new layout.

   LEADERSHIP is intentionally empty of invented people. Fabricating named
   executives with biographies is a specific kind of dishonesty that buyers
   and journalists check, so the section renders a short honest placeholder
   until real names and photographs are supplied.
   ========================================================================= */

export const COMPANY_FACTS = [
  { value: '19', label: 'Modules across operations, people and accounting' },
  { value: 'Unlimited', label: 'Users on every workspace, on every plan' },
  { value: '14', suffix: 'days', label: 'Free trial with every module unlocked' },
  { value: '6', label: 'Core modules free permanently, on every plan' },
]

export const MISSION = {
  eyebrow: 'Why we exist',
  title: 'Serious business software for businesses that were never offered any',
  paragraphs: [
    'Most operators are given a choice between software that is too simple to run a business on and software that assumes a dedicated systems team and a two-year implementation budget. Between those two is where almost every real business actually sits.',
    'Enterprise Compute is built for that gap: a genuine double-entry accounting engine underneath, operational modules that write to it as the business trades, and an assistant that can read the result. Deployed in a browser, priced per module, with unlimited users, and designed from the start to keep working when the power and the network do not.',
  ],
  image: 'heroTeam',
}

export const VALUES = [
  {
    title: 'Records over reassurance',
    image: 'bookkeeping',
    text: 'Every figure the platform shows must trace to a transaction you can open. A number that cannot be explained is a liability dressed as a feature, which is why there are no stored totals and no deletions, only derived positions and reversing entries.',
  },
  {
    title: 'Attribution, always',
    image: 'teamWorking',
    text: 'Who did it, when, and under whose approval. Not because we assume bad faith but because a business that cannot answer those questions cannot improve, cannot audit itself and cannot settle an argument with anything but seniority.',
  },
  {
    title: 'Built for the conditions, not the brochure',
    image: 'marketTrader',
    text: 'Power cuts, dropped connections and cash-heavy trade are the normal operating environment for most of the businesses we serve. Treating those as edge cases produces software that fails on an ordinary Thursday.',
  },
  {
    title: 'Say what it does, and what it does not',
    image: 'consultation',
    text: 'We publish the controls we operate rather than badges we have not earned, name the places a competing approach is genuinely better, and flag roadmap items as roadmap. Overstating is a short trade.',
  },
]

/**
 * No invented executives.
 *
 * Fabricating named leaders with biographies and headshots is a specific
 * kind of dishonesty that buyers, journalists and prospective hires all
 * check, so the named profiles stay empty until real people are supplied.
 *
 * What the section renders instead is the part that is true and that a
 * visitor actually came for: how the company is organised, who owns what,
 * and how to reach a person. Set `placeholder: false` and fill `people`
 * once the team page is approved, the page renders profiles automatically
 * and drops the note.
 */
export const LEADERSHIP = {
  placeholder: true,
  note: 'We have not published named leadership profiles yet. Rather than fill this section with stock photography and job titles, here is what is actually useful about how the company is run, plus a direct route to a person.',
  people: [],
  functions: [
    {
      title: 'Product and engineering',
      text: 'Owns the accounting engine, the operational modules, the offline layer and Epsilon. Engineers here talk to operators directly and decide what to build; there is no separate specification layer between the two.',
      contact: 'Technical questions, roadmap input, integration design',
    },
    {
      title: 'Services and implementation',
      text: 'Takes customers from signup to a clean first period close: chart of accounts design, account mapping, data migration and role-based training.',
      contact: 'Rollout scoping, migration planning, training',
    },
    {
      title: 'Customer success and support',
      text: 'Owns the relationship after go-live, runs the help centre and office hours, and feeds recurring problems back into the product rather than answering them repeatedly.',
      contact: 'Live workspace issues, configuration questions',
    },
    {
      title: 'Commercial and partnerships',
      text: 'Pricing, Enterprise agreements, the partner network and security reviews. Commercial terms here are set in a conversation rather than by a portal.',
      contact: 'Pricing, contracts, partnership, security questionnaires',
    },
  ],
  governance: [
    'Every posted record in a customer workspace carries an audit trail, including records touched by our own support staff.',
    'Access to production data is restricted to the people who need it to operate and support the platform, and is only exercised in response to a support request or an incident, never routinely.',
    'We publish the controls we actually operate in the Trust Center, and state plainly where we hold no formal certification.',
    'Roadmap priority is driven substantially by what customers and partners ask for, and we say when something is not planned.',
  ],
  action: { label: 'Contact the team', to: '/contact' },
}

export const MILESTONES = [
  { year: '2026', title: 'Epsilon reaches general availability', text: 'The records-grounded assistant moves out of limited release, licensed per seat with a separate usage balance.' },
  { year: '2026', title: 'Per-module pricing with unlimited users', text: 'Pricing moves from a flat platform fee to per-module, and six core modules become free permanently.' },
  { year: '2026', title: 'Desktop deployment ships', text: 'A packaged desktop build with a bundled local database, for sites where connectivity is structurally unreliable.' },
  { year: '2026', title: 'Incremental period closings', text: 'Closing a period stores a balance snapshot, so reporting performance stops degrading as history grows.' },
  { year: '2025', title: 'Offline-first operations', text: 'Durable local queue, idempotent replay and surfaced conflict handling across every operational screen.' },
]

/* ------------------------------------------------------------- careers --- */

export const CAREERS_INTRO = {
  eyebrow: 'Careers',
  title: 'Build the system businesses actually run on',
  lede: 'Small team, unusually high leverage. The accounting engine, the offline layer and the assistant are all genuinely hard problems, and the people who work on them own them end to end.',
  image: 'teamWhiteboard',
}

export const HOW_WE_WORK = [
  { title: 'Own the problem, not the ticket', text: 'Engineers talk to operators, see the failure in context and decide what to build. Nobody here is handed a specification to implement.' },
  { title: 'Remote-first, genuinely', text: 'Distributed by default, asynchronous by habit, with written decisions so that being in a room is never the prerequisite for knowing what is happening.' },
  { title: 'Correctness is the product', text: 'This is accounting and stock. A plausible-looking wrong number is worse than a visible failure, and the code review culture reflects that.' },
  { title: 'Ship, then watch', text: 'Short cycles with real usage behind them. We would rather put something in front of ten operators next week than design for six months.' },
]

export const BENEFITS = [
  { title: 'Remote-first', text: 'Work from wherever you are productive. Results over hours, and no core-hours theatre.', image: 'workingLaptop' },
  { title: 'Learning budget', text: 'An annual budget for courses, books, certifications and conferences, with time to actually use it.', image: 'professionalDevelopment' },
  { title: 'Health cover', text: 'Comprehensive health insurance for you and your immediate family.', image: 'medicalTeam' },
  { title: 'Real time off', text: 'Generous leave with a minimum you are expected to take, because unlimited leave that nobody uses is not a benefit.', image: 'teamCollaboration' },
]

export const OPEN_ROLES = [
  { title: 'Senior Fullstack Engineer', dept: 'Engineering', location: 'Remote / Lagos', type: 'Full-time', text: 'React and Node across the operational modules and the accounting engine. You will own a module end to end.' },
  { title: 'Engineer, Accounting Platform', dept: 'Engineering', location: 'Remote', type: 'Full-time', text: 'The general ledger, posting rules, period closings and reporting. Accounting knowledge is as valuable here as systems depth.' },
  { title: 'Product Designer', dept: 'Design', location: 'Remote', type: 'Full-time', text: 'Dense operational interfaces used hundreds of times a day by people who are not thinking about software. Craft matters most where it is least visible.' },
  { title: 'Implementation Consultant', dept: 'Services', location: 'Lagos', type: 'Full-time', text: 'Take customers from signup to a clean first close. Chart of accounts design, data migration and training.' },
  { title: 'Customer Success Manager', dept: 'Operations', location: 'Lagos', type: 'Full-time', text: 'Own relationships post go-live, spot the operators who are struggling before they churn, and feed what you learn back into the product.' },
  { title: 'Technical Writer', dept: 'Marketing', location: 'Remote', type: 'Contract', text: 'Documentation for operators, not for developers. If you can explain a period close to a restaurant owner, we want to talk.' },
]

/* ----------------------------------------------------------- community --- */

export const COMMUNITY_PILLARS = [
  {
    title: 'Forums',
    image: 'teamCollaboration',
    text: 'Ask a configuration question, share a workflow, or find out how another operator in your sector handles the thing you are stuck on.',
    links: ['Browse topics', 'Ask a question', 'Share a solution'],
    to: '/community',
  },
  {
    title: 'User groups',
    image: 'conferenceAudience',
    text: 'Sector and regional groups that meet to compare practice. Retail, hospitality, distribution and finance leads each run their own.',
    links: ['Find a group', 'Start a group', 'Upcoming meetups'],
    to: '/events',
  },
  {
    title: 'Events & office hours',
    image: 'businessPresentation',
    text: 'Live implementation sessions, detailed module walkthroughs and open office hours with the product team every other week.',
    links: ['Upcoming sessions', 'On-demand recordings', 'Office hours'],
    to: '/events',
  },
  {
    title: 'Documentation',
    image: 'officeLaptop',
    text: 'Setup guides, module reference and the accounting engine explained, plus the templates used for loading data.',
    links: ['Quick start', 'Module reference', 'Templates'],
    to: '/docs',
  },
  {
    title: 'Partner network',
    image: 'handshake',
    text: 'Implementation, accounting, technology and referral partners. Find one near you, or join the programme.',
    links: ['Find a partner', 'Become a partner', 'Partner resources'],
    to: '/partners',
  },
  {
    title: 'Product feedback',
    image: 'teamWhiteboard',
    text: 'Tell us what to build. Roadmap items like a public API, webhooks and bank feeds are prioritised largely on what operators ask for.',
    links: ['Request a feature', 'Report an issue', 'See the roadmap'],
    to: '/integrations',
  },
]

/* ------------------------------------------------------------- contact --- */

export const CONTACT_ROUTES = [
  { title: 'Talk to sales', text: 'Scoping a rollout, pricing a multi-site deployment, or discussing Enterprise terms.', category: 'Sales enquiry', image: 'consultation' },
  { title: 'Get support', text: 'You already have a workspace and something is not behaving as it should.', category: 'General Support', image: 'customerSupport' },
  { title: 'Partner with us', text: 'Implementation, accounting, technology or referral partnership.', category: 'Partnership', image: 'handshake' },
  { title: 'Security review', text: 'Security questionnaires, data-handling detail and contractual commitments.', category: 'Security review', image: 'cyberSecurity' },
  { title: 'Press enquiry', text: 'Interviews, product briefings and company information for media.', category: 'Press', image: 'publicSpeaker' },
  { title: 'Something else', text: 'Anything that does not fit the categories above.', category: 'Other', image: 'officeWorker' },
]

const company = { MISSION, VALUES, COMPANY_FACTS }
export default company
