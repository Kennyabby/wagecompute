/* ============================================================================
   Content for /services, /training, /integrations and the partner programme
   section of /partners.
   ----------------------------------------------------------------------------
   These are the three "how do I actually succeed with this" destinations that
   every serious ERP site carries (SAP: Services & Support / Learning /
   Store + Partners; NetSuite: Services / Education / SuiteApp / Partners).
   Their absence is the clearest gap between a product site and a platform
   site, which is why they are here.

   Integration entries describe real, supported mechanics (Paystack checkout,
   spreadsheet import/export, PDF output, biometric attendance import) plus a
   clearly-labelled roadmap group. Nothing is listed as available that is not.
   ========================================================================= */

/* ---------------------------------------------------------- services ----- */

export const SERVICE_TRACKS = [
  {
    id: 'self-serve',
    name: 'Self-serve',
    price: 'Included',
    for: 'Single site, straightforward setup, confident with software',
    image: 'workingLaptop',
    lede: 'Everything you need to get live on your own, at your own pace, with the documentation and templates we use ourselves.',
    includes: [
      'Full product documentation and setup guides',
      'Spreadsheet templates for item catalogue, opening stock and rooms',
      'Help centre with searchable articles and a direct enquiry form',
      'Monthly live implementation webinar with open Q&A',
      '14-day free trial with every module unlocked',
    ],
    cta: { label: 'Start a free trial', to: '/signup' },
  },
  {
    id: 'guided',
    name: 'Guided onboarding',
    price: 'Quoted per engagement',
    for: 'Two to five sites, an existing system to migrate from, a real finance function',
    image: 'consultation',
    lede: 'A structured implementation run with you over several weeks, covering the decisions that are expensive to get wrong at setup.',
    includes: [
      'Chart of accounts design review with your accountant',
      'Account mapping workshop so operational activity posts correctly',
      'Opening balance and stock data load, validated before go-live',
      'Permission and approval model designed around your actual roles',
      'Staff training sessions by role, not one generic walkthrough',
      'Supported first period close',
    ],
    cta: { label: 'Discuss an engagement', to: '/contact' },
  },
  {
    id: 'managed',
    name: 'Managed rollout',
    price: 'Enterprise agreement',
    for: 'Six or more sites, phased rollout, group reporting obligations',
    image: 'executiveMeeting',
    lede: 'A sequenced multi-site programme with a named contact, agreed milestones and commercial terms set per engagement.',
    includes: [
      'Site-by-site rollout sequencing and cutover planning',
      'Consolidated reporting structure designed up front',
      'Named implementation contact throughout the programme',
      'Security questionnaire response and contractual data commitments',
      'Priority support with agreed response expectations',
      'Post-go-live review at thirty and ninety days',
    ],
    cta: { label: 'Talk to sales', to: '/contact' },
  },
]

export const SUPPORT_CHANNELS = [
  { title: 'Help centre', text: 'Searchable articles by module, plus a direct enquiry form that reaches the support team.', link: 'Open the help centre', to: '/help' },
  { title: 'Documentation', text: 'Setup, configuration and reference documentation covering every module and the accounting engine.', link: 'Read the docs', to: '/docs' },
  { title: 'Community', text: 'Forums, user groups and shared practice from other operators running the same modules.', link: 'Join the community', to: '/community' },
  { title: 'Office hours', text: 'Open sessions with the product team every other week. Bring a configuration problem.', link: 'See upcoming sessions', to: '/events' },
]

export const IMPLEMENTATION_PHASES = [
  { phase: 'Week 1', title: 'Decide the structure', text: 'Chart of accounts, locations, departments and the permission profiles your business actually needs.' },
  { phase: 'Week 2', title: 'Load the data', text: 'Item catalogue, opening stock, employees, partners and opening balances, all from templates rather than typed in by hand.' },
  { phase: 'Week 3', title: 'Run in parallel', text: 'Trade on the platform alongside whatever you use now, so differences surface while you still have a fallback.' },
  { phase: 'Week 4', title: 'Cut over and close', text: 'Switch fully, then run a supported first period close to confirm the ledger behaves as expected.' },
]

/* ---------------------------------------------------------- training ----- */

export const LEARNING_PATHS = [
  {
    id: 'operator',
    name: 'Daily operator',
    audience: 'Cashiers, storekeepers, servers, riders',
    image: 'posCheckout',
    duration: 'About 2 hours',
    lede: 'Everything someone needs to do their actual job on the platform, and nothing they do not.',
    modules: [
      'Signing in, your workspace and what you can see',
      'Opening and closing a POS session with a declared float',
      'Taking orders, payments, returns and voids',
      'Recording stock movements and transfers',
      'Dispatching and reconciling a delivery run',
      'Working through a connectivity outage',
    ],
  },
  {
    id: 'supervisor',
    name: 'Supervisor & manager',
    audience: 'Shift supervisors, branch managers, operations leads',
    image: 'warehouseTeam',
    duration: 'About 4 hours',
    lede: 'Approvals, exceptions and the daily checks that keep the numbers honest.',
    modules: [
      'Approving attendance and resolving exceptions',
      'Reviewing cash variance by session and operator',
      'Running and reconciling a stock count',
      'Handling transfers, discrepancies and adjustments with reason codes',
      'Reading the dashboard and acting on surfaced exceptions',
      'Approval thresholds and when to escalate',
    ],
  },
  {
    id: 'finance',
    name: 'Finance & accounting',
    audience: 'Bookkeepers, accountants, finance managers',
    image: 'accountantDesk',
    duration: 'About 6 hours',
    lede: 'The ledger underneath: how operational activity becomes double entry, and how to close a period properly.',
    modules: [
      'Designing a chart of accounts for this platform',
      'Account mapping: where operational activity posts',
      'Manual journals, accruals and corrections',
      'Period closings and what the snapshot stores',
      'Trial balance, P&L and balance sheet, with drill-down',
      'Receivables, payables and partner statements',
      'Payroll postings and deduction liabilities',
    ],
  },
  {
    id: 'administrator',
    name: 'Workspace administrator',
    audience: 'Owners, IT leads, systems administrators',
    image: 'cyberSecurity',
    duration: 'About 4 hours',
    lede: 'Configuration, access control and the decisions that govern everyone else.',
    modules: [
      'Workspace, locations, warehouses and document numbering',
      'Designing permission profiles per action',
      'Approval routing and thresholds',
      'Module entitlement, dependencies and billing',
      'Audit trail: reading it and using it',
      'Offline behaviour, sync state and the desktop deployment',
    ],
  },
]

export const CERTIFICATIONS = [
  { name: 'Certified Operator', text: 'Confirms someone can run day-to-day operations on the modules your business uses.', level: 'Foundation' },
  { name: 'Certified Administrator', text: 'Covers configuration, permissions, approvals and module management for a workspace.', level: 'Professional' },
  { name: 'Certified Accounting Specialist', text: 'Covers the accounting engine: mapping, journals, closings and statutory reporting.', level: 'Professional' },
  { name: 'Certified Implementation Partner', text: 'For partners delivering implementations. Covers data migration, rollout sequencing and handover.', level: 'Partner' },
]

/* ------------------------------------------------------- integrations ---- */

export const INTEGRATION_GROUPS = [
  {
    id: 'available',
    name: 'Available today',
    note: 'Shipped and supported.',
    items: [
      { name: 'Paystack', category: 'Payments', text: 'Subscription checkout and payment verification for workspace billing, with server-side verification against the tenant order and later reconciliation if a network issue delays confirmation.' },
      { name: 'Spreadsheet import', category: 'Data', text: 'Bulk-load item catalogues, opening stock, rooms and rate plans from downloadable templates rather than keying records individually.' },
      { name: 'Spreadsheet export', category: 'Data', text: 'Export reports, ledgers and operational records to XLSX and CSV for your accountant or your own analysis.' },
      { name: 'PDF output', category: 'Documents', text: 'Receipts, invoices, payslips, statements and financial reports generated as PDF for printing, emailing or filing.' },
      { name: 'Biometric attendance import', category: 'People', text: 'Bring attendance captured on floor clock hardware into the platform and reconcile it against employee records.' },
      { name: 'Email notifications', category: 'Messaging', text: 'Transactional email for signup verification, password reset, support enquiries and billing confirmations.' },
      { name: 'Receipt printers', category: 'Hardware', text: 'Standard receipt printing from the POS, with distinct customer, kitchen and operational layouts.' },
      { name: 'Barcode scanning', category: 'Hardware', text: 'Scanner input at the till and in stock operations, with barcode generation for items that need it.' },
    ],
  },
  {
    id: 'platform',
    name: 'Platform capabilities',
    note: 'How you extend or connect to the platform itself.',
    items: [
      { name: 'Live event stream', category: 'Platform', text: 'Tenant-scoped server-sent events push record changes to connected sessions, which is how dashboards and summaries stay current without polling.' },
      { name: 'Offline sync engine', category: 'Platform', text: 'Durable local queue with idempotent replay and surfaced conflict handling, available to every operational screen.' },
      { name: 'Desktop deployment', category: 'Platform', text: 'Packaged desktop application with a bundled local database, for sites where connectivity is structurally unreliable.' },
      { name: 'Multi-tenant workspaces', category: 'Platform', text: 'Each business operates on its own isolated tenant, reachable on its own subdomain.' },
    ],
  },
  {
    id: 'roadmap',
    name: 'On the roadmap',
    note: 'Not available yet. Listed so you can plan, and so you can tell us which to prioritise.',
    roadmap: true,
    items: [
      { name: 'Public REST API', category: 'Platform', text: 'A documented, authenticated API surface for building your own integrations against workspace data.' },
      { name: 'Webhooks', category: 'Platform', text: 'Outbound notifications on business events so external systems can react without polling.' },
      { name: 'Bank feed import', category: 'Finance', text: 'Statement import and reconciliation against posted receipts and payments.' },
      { name: 'E-commerce order sync', category: 'Commerce', text: 'Bring online orders into the same sales and stock flow as over-the-counter trade.' },
      { name: 'Additional payment providers', category: 'Payments', text: 'Broader regional coverage alongside the existing Paystack integration.' },
    ],
  },
]

/* ------------------------------------------------------------ partners --- */

export const PARTNER_PROGRAMS = [
  {
    name: 'Implementation partners',
    image: 'consultation',
    text: 'Deliver guided onboarding and multi-site rollouts for customers in your market or sector. Certification, implementation materials and deal registration included.',
    points: ['Certified Implementation Partner track', 'Access to migration templates and rollout playbooks', 'Deal registration and referral terms', 'Named partner contact'],
  },
  {
    name: 'Accounting partners',
    image: 'accountant',
    text: 'For practices advising clients on systems. Design charts of accounts, own the mapping, and keep read access to your clients’ ledgers without touching their operational records.',
    points: ['Scoped read-only client access', 'Chart of accounts design guidance', 'Certified Accounting Specialist track', 'Practice referral arrangements'],
  },
  {
    name: 'Technology partners',
    image: 'developerScreens',
    text: 'Build integrations that extend the platform. Shape the public API and webhook roadmap by telling us what you actually need to connect.',
    points: ['Early access to API and webhook work', 'Technical consultation on integration design', 'Co-marketing on shipped integrations', 'Direct line to the engineering team'],
  },
  {
    name: 'Referral partners',
    image: 'handshake',
    text: 'For consultants, associations and resellers who know operators who need this. Refer a business, get rewarded when they go live.',
    points: ['Straightforward referral terms', 'Co-branded material for your audience', 'Visibility of referral status', 'No certification requirement'],
  },
]

const programs = { SERVICE_TRACKS, LEARNING_PATHS, INTEGRATION_GROUPS, PARTNER_PROGRAMS }
export default programs
