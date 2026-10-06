/* ============================================================================
   Information architecture for the public site: the header mega menus and the
   footer columns.
   ----------------------------------------------------------------------------
   Kept as data in one file (rather than JSX scattered through NavBar.js and
   Footer.js) because the same tree drives the desktop mega menu, the mobile
   accordion and the footer, and because the sitemap is now large enough, at roughly 40 public routes, that
   having it in one readable place is the only way to keep it honest.

   Structure follows the pattern common to sap.com, netsuite.com and odoo.com:
   a small number of top-level entries, each opening a multi-column panel of
   labelled groups, with one promoted item per panel.
   ========================================================================= */

export const HEADER_NAV = [
  {
    key: 'products',
    label: 'Products',
    to: '/products',
    columns: [
      {
        title: 'Finance & accounting',
        items: [
          { name: 'Journals & Chart of Accounts', desc: 'Live double-entry general ledger', to: '/products/journals' },
          { name: 'Reports', desc: 'Trial balance, P&L, balance sheet', to: '/products/reports' },
          { name: 'Expenses', desc: 'Operating costs and categorisation', to: '/products/expenses' },
          { name: 'Assets', desc: 'Fixed assets and depreciation', to: '/products/assets' },
        ],
      },
      {
        title: 'Operations & commerce',
        items: [
          { name: 'Point of Sale', desc: 'Fast, offline-capable selling', to: '/products/pos' },
          { name: 'Inventory', desc: 'Multi-warehouse stock control', to: '/products/inventory' },
          { name: 'Sales', desc: 'Orders, invoicing and revenue', to: '/products/sales' },
          { name: 'Purchase', desc: 'Procurement and goods receipt', to: '/products/purchase' },
          { name: 'Delivery', desc: 'Dispatch and reconciliation', to: '/products/delivery' },
          { name: 'Accommodations', desc: 'Rooms, stays and folio billing', to: '/products/accommodations' },
        ],
      },
      {
        title: 'People & partners',
        items: [
          { name: 'Employees', desc: 'Records, roles and access', to: '/products/employees' },
          { name: 'Attendance', desc: 'Time capture and approval', to: '/products/attendance' },
          { name: 'Payroll', desc: 'Pay runs, deductions and payslips', to: '/products/payroll' },
          { name: 'Departments & Positions', desc: 'Organisational structure', to: '/products/departments' },
          { name: 'Business Partners', desc: 'Customer and vendor ledgers', to: '/products/business-partners' },
        ],
      },
      {
        title: 'Platform',
        items: [
          { name: 'Epsilon AI assistant', desc: 'Answers grounded in your records', to: '/products/epsilon' },
          { name: 'Dashboard', desc: 'Live operating picture', to: '/products/dashboard' },
          { name: 'Settings & governance', desc: 'Permissions and approvals', to: '/products/settings' },
          { name: 'Offline & sync', desc: 'Keep trading without a network', to: '/products/offline-sync' },
          { name: 'Integrations', desc: 'Connect the rest of your stack', to: '/integrations' },
          { name: 'All products', desc: 'Browse the full catalogue', to: '/products' },
        ],
      },
    ],
    feature: {
      image: 'realtimeDashboard',
      eyebrow: 'Platform',
      title: 'Every module writes to the same ledger',
      text: 'A sale, a pay run and a goods receipt all post to one chart of accounts in real time. No nightly export, no reconciliation project.',
      link: 'See how it fits together',
      to: '/why-enterprise-compute',
    },
    footerLinks: [
      { name: 'Compare plans', to: '/pricing' },
      { name: 'Product documentation', to: '/docs' },
      { name: 'What’s new', to: '/blog' },
    ],
  },
  {
    key: 'industries',
    label: 'Industries',
    to: '/industries',
    columns: [
      {
        title: 'Retail & consumer',
        items: [
          { name: 'Retail & multi-store', desc: 'Tills, stock and daily cash-up', to: '/industries/retail' },
          { name: 'Wholesale & distribution', desc: 'Trade pricing and fulfilment', to: '/industries/distribution' },
          { name: 'Pharmacy & health retail', desc: 'Batch, expiry and controlled lines', to: '/industries/pharmacy' },
          { name: 'Fuel & forecourt', desc: 'Pump sales, shifts and shrinkage', to: '/industries/fuel' },
        ],
      },
      {
        title: 'Hospitality & services',
        items: [
          { name: 'Restaurants & QSR', desc: 'Tables, kitchen and delivery', to: '/industries/restaurants' },
          { name: 'Hotels & accommodation', desc: 'Rooms, folios and housekeeping', to: '/industries/hospitality' },
          { name: 'Professional services', desc: 'People, time and recoverable cost', to: '/industries/professional-services' },
          { name: 'Education', desc: 'Staff, fees and departmental budgets', to: '/industries/education' },
        ],
      },
      {
        title: 'Industry & field',
        items: [
          { name: 'Manufacturing', desc: 'Materials, output and unit cost', to: '/industries/manufacturing' },
          { name: 'Construction', desc: 'Site cost, labour and plant', to: '/industries/construction' },
          { name: 'Logistics & transport', desc: 'Dispatch, fleet and proof of delivery', to: '/industries/logistics' },
          { name: 'Agriculture & agribusiness', desc: 'Harvest, inputs and storage', to: '/industries/agriculture' },
        ],
      },
      {
        title: 'Care & public',
        items: [
          { name: 'Healthcare', desc: 'Rotas, consumables and billing', to: '/industries/healthcare' },
          { name: 'Non-profit & NGO', desc: 'Grant funds and restricted spend', to: '/industries/nonprofit' },
          { name: 'All industries', desc: 'See every sector we serve', to: '/industries' },
        ],
      },
    ],
    feature: {
      image: 'marketTrader',
      eyebrow: 'Built where it is used',
      title: 'Designed for businesses that trade through outages',
      text: 'Offline-first selling, naira-native accounting and multi-site control, built for operators in markets where connectivity is not a given.',
      link: 'Read the approach',
      to: '/about#story',
    },
  },
  {
    key: 'solutions',
    label: 'Solutions',
    to: '/solutions',
    columns: [
      {
        title: 'By business size',
        items: [
          { name: 'Small business', desc: 'One site, a handful of staff', to: '/solutions#size-small' },
          { name: 'Growing business', desc: 'Several sites, real finance needs', to: '/solutions#size-growing' },
          { name: 'Multi-site enterprise', desc: 'Consolidated group reporting', to: '/solutions#size-enterprise' },
        ],
      },
      {
        title: 'By role',
        items: [
          { name: 'Owner / CEO', desc: 'One honest view of the business', to: '/solutions#role-owner' },
          { name: 'Finance lead', desc: 'A ledger you can actually close', to: '/solutions#role-finance' },
          { name: 'Operations manager', desc: 'Stock, staff and daily throughput', to: '/solutions#role-operations' },
          { name: 'HR & payroll', desc: 'Attendance straight into pay', to: '/solutions#role-hr' },
          { name: 'IT & systems', desc: 'Access control and deployment', to: '/solutions#role-it' },
        ],
      },
      {
        title: 'By challenge',
        items: [
          { name: 'Stock never matches the shelf', desc: 'Close the count gap', to: '/solutions#challenge-stock' },
          { name: 'Month-end takes weeks', desc: 'Close on a running ledger', to: '/solutions#challenge-close' },
          { name: 'Sales stop when the network does', desc: 'Keep trading offline', to: '/solutions#challenge-offline' },
          { name: 'Nobody agrees on the numbers', desc: 'One source of record', to: '/solutions#challenge-truth' },
        ],
      },
      {
        title: 'Moving from',
        items: [
          { name: 'Spreadsheets', desc: 'Leave the workbook behind', to: '/why-enterprise-compute#vs-spreadsheets' },
          { name: 'Separate POS + accounts', desc: 'Stop double entry', to: '/why-enterprise-compute#vs-point-tools' },
          { name: 'A legacy ERP', desc: 'Without a two-year programme', to: '/why-enterprise-compute#vs-legacy-erp' },
          { name: 'Compare the options', desc: 'Side-by-side comparison', to: '/why-enterprise-compute' },
        ],
      },
    ],
    feature: {
      image: 'dataAnalytics',
      eyebrow: 'Business case',
      title: 'Build the numbers before you commit',
      text: 'Model the licence cost, the hours recovered and the stock loss avoided against your own figures.',
      link: 'Open the ROI calculator',
      to: '/roi-calculator',
    },
  },
  { key: 'pricing', label: 'Pricing', to: '/pricing' },
  {
    key: 'resources',
    label: 'Resources',
    to: '/resources',
    columns: [
      {
        title: 'Learn',
        items: [
          { name: 'Documentation', desc: 'Set-up and reference guides', to: '/docs' },
          { name: 'Training & certification', desc: 'Structured learning paths', to: '/training' },
          { name: 'Implementation services', desc: 'Get live with help', to: '/services' },
          { name: 'Help centre', desc: 'Answers and support requests', to: '/help' },
        ],
      },
      {
        title: 'Library',
        items: [
          { name: 'Resource library', desc: 'Guides, templates, checklists', to: '/resources' },
          { name: 'Customer stories', desc: 'Results from real operators', to: '/customers' },
          { name: 'Insights & blog', desc: 'Writing on running a business', to: '/blog' },
          { name: 'ROI calculator', desc: 'Model your own payback', to: '/roi-calculator' },
        ],
      },
      {
        title: 'Connect',
        items: [
          { name: 'Events & webinars', desc: 'Live and on-demand sessions', to: '/events' },
          { name: 'Community', desc: 'Forums and user groups', to: '/community' },
          { name: 'Partner network', desc: 'Find an implementation partner', to: '/partners' },
          { name: 'Integrations', desc: 'Connect your other systems', to: '/integrations' },
        ],
      },
      {
        title: 'Trust',
        items: [
          { name: 'Trust Center', desc: 'Security, privacy, availability', to: '/trust-center' },
          { name: 'Security practices', desc: 'How your data is protected', to: '/security' },
          { name: 'Service status', desc: 'Platform availability', to: '/trust-center#availability' },
          { name: 'Privacy policy', desc: 'What we collect and why', to: '/privacy' },
        ],
      },
    ],
    feature: {
      image: 'businessTraining',
      eyebrow: 'Getting started',
      title: 'The first thirty days, mapped out',
      text: 'A week-by-week plan covering opening balances, stock counts, staff access and your first clean close.',
      link: 'Read the onboarding guide',
      to: '/resources',
    },
  },
  {
    key: 'company',
    label: 'Company',
    to: '/about',
    columns: [
      {
        title: 'About us',
        items: [
          { name: 'About Enterprise Compute', desc: 'Who we are and why', to: '/about' },
          { name: 'Our story', desc: 'The full product walkthrough', to: '/about#story' },
          { name: 'Leadership', desc: 'The people accountable', to: '/about#leadership' },
          { name: 'Careers', desc: 'Open roles and how we work', to: '/careers' },
        ],
      },
      {
        title: 'Newsroom',
        items: [
          { name: 'Press & news', desc: 'Announcements and coverage', to: '/press' },
          { name: 'Insights & blog', desc: 'Writing from the team', to: '/blog' },
          { name: 'Events', desc: 'Where to find us', to: '/events' },
          { name: 'Customer stories', desc: 'What operators report', to: '/customers' },
        ],
      },
      {
        title: 'Work with us',
        items: [
          { name: 'Partner network', desc: 'Resell, implement, refer', to: '/partners' },
          { name: 'Services', desc: 'Implementation and support', to: '/services' },
          { name: 'Contact sales', desc: 'Talk to a person', to: '/contact' },
          { name: 'Community', desc: 'Join the user community', to: '/community' },
        ],
      },
      {
        title: 'Trust & legal',
        items: [
          { name: 'Trust Center', desc: 'Security and compliance', to: '/trust-center' },
          { name: 'Privacy policy', desc: 'Data protection', to: '/privacy' },
          { name: 'Terms of service', desc: 'Your agreement with us', to: '/terms' },
          { name: 'Cookie policy', desc: 'How we use cookies', to: '/cookie-policy' },
        ],
      },
    ],
    feature: {
      image: 'heroTeam',
      eyebrow: 'Our story',
      title: 'Built from one bad week in a restaurant',
      text: 'The long-form walkthrough of how the platform works, told through the business it was first built for.',
      link: 'Read the full story',
      to: '/about#story',
    },
  },
]

export const FOOTER_COLUMNS = [
  {
    title: 'Platform',
    links: [
      { name: 'All products', to: '/products' },
      { name: 'Point of Sale', to: '/products/pos' },
      { name: 'Inventory', to: '/products/inventory' },
      { name: 'Payroll', to: '/products/payroll' },
      { name: 'Journals & COA', to: '/products/journals' },
      { name: 'Reports', to: '/products/reports' },
      { name: 'Epsilon AI', to: '/products/epsilon' },
      { name: 'Integrations', to: '/integrations' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { name: 'By industry', to: '/industries' },
      { name: 'By business size', to: '/solutions' },
      { name: 'By role', to: '/solutions#role-owner' },
      { name: 'Why Enterprise Compute', to: '/why-enterprise-compute' },
      { name: 'ROI calculator', to: '/roi-calculator' },
      { name: 'Pricing', to: '/pricing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { name: 'Resource library', to: '/resources' },
      { name: 'Documentation', to: '/docs' },
      { name: 'Training', to: '/training' },
      { name: 'Help centre', to: '/help' },
      { name: 'Customer stories', to: '/customers' },
      { name: 'Events & webinars', to: '/events' },
      { name: 'Insights', to: '/blog' },
      { name: 'Community', to: '/community' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About us', to: '/about' },
      { name: 'Our story', to: '/about#story' },
      { name: 'Careers', to: '/careers' },
      { name: 'Partners', to: '/partners' },
      { name: 'Services', to: '/services' },
      { name: 'Press', to: '/press' },
      { name: 'Trust Center', to: '/trust-center' },
      { name: 'Contact us', to: '/contact' },
    ],
  },
]

export const FOOTER_LEGAL = [
  { name: 'Privacy', to: '/privacy' },
  { name: 'Terms of service', to: '/terms' },
  { name: 'Cookie policy', to: '/cookie-policy' },
  { name: 'Security', to: '/security' },
  { name: 'Trust Center', to: '/trust-center' },
]

export const SOCIAL_LINKS = [
  { key: 'x', label: 'Enterprise Compute on X', href: 'https://x.com' },
  { key: 'linkedin', label: 'Enterprise Compute on LinkedIn', href: 'https://www.linkedin.com' },
  { key: 'youtube', label: 'Enterprise Compute on YouTube', href: 'https://www.youtube.com' },
  { key: 'facebook', label: 'Enterprise Compute on Facebook', href: 'https://www.facebook.com' },
]

export default HEADER_NAV
