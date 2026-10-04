/* ============================================================================
   Content for /why-enterprise-compute and /roi-calculator.
   ----------------------------------------------------------------------------
   Comparisons are drawn against CATEGORIES of alternative — spreadsheets,
   separate point tools, legacy on-premise ERP, per-seat cloud suites — and
   deliberately not against named competitors.

   That is a considered choice, not timidity. Named-vendor comparison tables
   age badly (the other side ships), are frequently wrong in detail, and in
   several markets create real legal exposure if a claim cannot be
   substantiated. Category comparison says the same useful thing to a buyer
   without asserting facts about a product we do not control. Each row also
   states where the alternative is genuinely better, because a comparison
   where one side wins everything is read as marketing and discarded.
   ========================================================================= */

export const DIFFERENTIATORS = [
  {
    id: 'ledger-first',
    title: 'The ledger is the foundation, not a report',
    image: 'accountantDesk',
    text: 'Sales, purchases, stock movement, payroll and expenses each generate real double-entry postings at the moment they happen. By the time anyone asks for a trial balance, it already exists.',
    proof: 'Incremental period closings store a balance snapshot, so later periods compute forward rather than recomputing the whole history.',
  },
  {
    id: 'offline',
    title: 'The business keeps trading when the network does not',
    image: 'posTerminal',
    text: 'Local-first clients with a durable IndexedDB queue, idempotent replay on reconnect and conflicts surfaced for a human rather than resolved silently.',
    proof: 'Client transaction ids make a retry after a partially failed upload safe, so a half-sent batch cannot double-post a sale.',
  },
  {
    id: 'unlimited-users',
    title: 'Unlimited users on every plan',
    image: 'teamMeeting',
    text: 'Pricing is per module, never per head. Nobody has to share a login to save money, which is the single most common way attribution gets destroyed.',
    proof: 'Six core modules stay free permanently on every plan: Dashboard, Employees, Departments, Positions, Attendance and Settings.',
  },
  {
    id: 'grounded-ai',
    title: 'An assistant that reads your actual records',
    image: 'dataAnalytics',
    text: 'Epsilon queries your live data within the asking user’s own permission scope, cites the transactions behind its answer, and proposes changes without ever applying them.',
    proof: 'Scoped to the asker’s permissions, so it cannot be used as a route around access control.',
  },
  {
    id: 'traceable',
    title: 'Every figure opens to its cause',
    image: 'financialAnalysis',
    text: 'Click a number on a dashboard, land in the ledger entries behind it, then open the sale, receipt or pay run that produced them.',
    proof: 'Corrections are reversing entries, not deletions, so the original record and the correction are both visible.',
  },
  {
    id: 'built-for-here',
    title: 'Built for the conditions it runs in',
    image: 'marketTrader',
    text: 'Naira-native amounts, local tax treatment, receipt formats operators recognise, and a desktop build for sites where connectivity is structurally unreliable.',
    proof: 'Offline operation is a normal operating state, not an error screen.',
  },
]

export const COMPARISONS = [
  {
    id: 'vs-spreadsheets',
    name: 'Spreadsheets',
    headline: 'When the workbook stops scaling',
    image: 'bookkeeping',
    lede: 'Spreadsheets are the most successful business tool ever built and most operators should start there. The question is only when to stop.',
    fairPoint: 'Spreadsheets are free, instantly flexible, and every person you hire already knows how to use one. For a single-site business under about ten people, they are frequently the correct answer and switching early is a waste of money.',
    breakingPoints: [
      'More than one person needs to edit the same figures at the same time',
      'You cannot say who changed a number, or when',
      'Stock and cash are tracked in different files that have to be reconciled',
      'Month-end is a rebuild rather than a review',
      'A mistake in one cell silently changes every downstream total',
    ],
    rows: [
      ['Concurrent editing', 'One editor at a time in practice', 'Unlimited users, live updates'],
      ['Who changed what', 'Not recorded', 'Audit trail on every posted record'],
      ['Stock and accounts', 'Separate files, manual reconciliation', 'One movement posts both'],
      ['Permissions', 'File-level at best', 'Per action, per module'],
      ['Month-end', 'Reconstructed each period', 'Review of a ledger already written'],
      ['Cost', 'Effectively free', 'Per module, unlimited users'],
    ],
  },
  {
    id: 'vs-point-tools',
    name: 'Separate POS + accounting',
    headline: 'When two good tools make one bad picture',
    image: 'posCheckout',
    lede: 'A dedicated till and a dedicated accounting package are each better at their own job than any suite. The cost is the seam between them.',
    fairPoint: 'Specialist tools are usually deeper in their own domain, often cheaper individually, and let you change one without replacing everything. If the seam genuinely does not cost you anything, keeping them is rational.',
    breakingPoints: [
      'The same transaction is entered, or exported, twice',
      'Stock in the till and stock in the accounts disagree and nobody can say which is right',
      'Cost of sales is estimated because the till does not know item cost',
      'Reporting means merging exports in a third place',
      'Payroll is a separate system again, read into accounts manually',
    ],
    rows: [
      ['Entry', 'Twice, or via export', 'Once, at the point it happens'],
      ['Stock vs accounts', 'Two numbers to reconcile', 'One movement, both updated'],
      ['Cost of sales', 'Often estimated', 'Derived from real item cost'],
      ['Reporting', 'Merged from exports', 'One ledger, drill-down to source'],
      ['Payroll to accounts', 'Manual journal', 'Posted as part of the run'],
      ['Depth per tool', 'Usually deeper', 'Broad, integrated'],
    ],
  },
  {
    id: 'vs-legacy-erp',
    name: 'Legacy on-premise ERP',
    headline: 'When the implementation costs more than the licence',
    image: 'serverRoom',
    lede: 'Traditional ERP does genuinely handle complexity that lighter systems cannot. It also brings a cost structure that most mid-market operators never recover.',
    fairPoint: 'Established on-premise ERP has decades of depth in manufacturing planning, complex supply chain and multi-entity consolidation, plus a large ecosystem of specialists. For a genuinely complex multinational, that depth is not optional.',
    breakingPoints: [
      'Implementation measured in quarters, and consultants measured in day rates',
      'Infrastructure you own, patch and eventually replace',
      'Customisation that makes every upgrade a project',
      'Training burden that assumes dedicated system staff',
      'No usable answer when the site loses connectivity',
    ],
    rows: [
      ['Time to live', 'Months to years', 'Days to weeks'],
      ['Infrastructure', 'Yours to run', 'Hosted, or a desktop build you install'],
      ['Upgrades', 'A project each time', 'Continuous, no action required'],
      ['Specialist staff', 'Usually required', 'Not required'],
      ['Offline operation', 'Rarely addressed', 'A normal operating state'],
      ['Deep manufacturing planning', 'Stronger', 'Production and assembly, not full MRP'],
    ],
  },
  {
    id: 'vs-per-seat-cloud',
    name: 'Per-seat cloud suites',
    headline: 'When the pricing model fights the product',
    image: 'officeLaptop',
    lede: 'Modern cloud suites solve the infrastructure problem well. Many then reintroduce a different one at the invoice.',
    fairPoint: 'Per-seat suites are often extremely polished, integrate widely, and have ecosystems and support organisations that a smaller platform cannot match. If seat count is low and budget is not the constraint, that polish is worth paying for.',
    breakingPoints: [
      'Cost rises with headcount even though usage does not',
      'Teams ration logins, and shared accounts destroy attribution',
      'Frontline staff get left off the system entirely',
      'Modules you do not use are bundled into the tier you need',
      'Offline behaviour is usually a cached read-only view',
    ],
    rows: [
      ['Pricing basis', 'Per user', 'Per module, unlimited users'],
      ['Cost of adding frontline staff', 'Rises per head', 'None'],
      ['Shared logins', 'Common workaround', 'No reason to'],
      ['Paying for unused modules', 'Often, via tiers', 'Only what you enable'],
      ['Offline writes', 'Rarely supported', 'Queued and replayed safely'],
      ['Ecosystem breadth', 'Larger', 'Focused, growing'],
    ],
  },
]

/* --------------------------------------------------------- ROI model ----- */

/**
 * Inputs and coefficients for the /roi-calculator page.
 *
 * These are PLANNING ASSUMPTIONS the visitor can and should change — they are
 * not measured outcomes from a customer base, and the page says so in plain
 * language. The defaults are deliberately conservative: stock shrinkage of
 * 2% of inventory value and a 25% reduction in it is well below the figures
 * marketing calculators usually assume, so the result tends to understate
 * rather than oversell.
 */
export const ROI_INPUTS = [
  { key: 'monthlyRevenue', label: 'Monthly revenue', unit: 'NGN', min: 500000, max: 500000000, step: 500000, value: 25000000, help: 'Total sales across every location.' },
  { key: 'staffCount', label: 'Staff on the system', unit: 'people', min: 1, max: 500, step: 1, value: 24, help: 'Every plan includes unlimited users, so this only affects time saved.' },
  { key: 'adminHoursWeekly', label: 'Admin hours a week on manual reconciliation', unit: 'hours', min: 0, max: 200, step: 1, value: 22, help: 'Counting, re-keying, merging exports, chasing figures.' },
  { key: 'hourlyCost', label: 'Average loaded hourly cost of that admin time', unit: 'NGN', min: 500, max: 50000, step: 250, value: 3500, help: 'Salary plus on-costs, divided by hours worked.' },
  { key: 'inventoryValue', label: 'Average inventory value held', unit: 'NGN', min: 0, max: 500000000, step: 500000, value: 18000000, help: 'Leave at zero if you do not hold stock.' },
  { key: 'shrinkageRate', label: 'Estimated annual stock shrinkage', unit: '%', min: 0, max: 15, step: 0.5, value: 2, help: 'Loss, wastage and unexplained variance as a share of inventory value.' },
  { key: 'monthlyLicence', label: 'Expected monthly platform cost', unit: 'NGN', min: 0, max: 2000000, step: 5000, value: 120000, help: 'Build this on the pricing page from the modules you need.' },
]

export const ROI_ASSUMPTIONS = {
  adminReductionPct: 0.45,
  shrinkageReductionPct: 0.25,
  outageDaysPerYear: 6,
  outageRevenueRecoveredPct: 0.6,
  implementationMonths: 1,
}

export const ROI_DISCLAIMER =
  'These are planning assumptions, not measured results. The defaults are deliberately conservative: a 45% reduction in reconciliation time, a 25% reduction in shrinkage and 60% of revenue recovered on six outage days a year. Change every input to your own figures; the model is shown in full below so you can argue with it.'

export const ROI_METHOD = [
  { title: 'Admin time recovered', text: 'Weekly admin hours × loaded hourly cost × 52, reduced by the admin-reduction assumption. This is the largest line for most businesses and the one you should sanity-check hardest against your own week.' },
  { title: 'Shrinkage avoided', text: 'Inventory value × shrinkage rate, reduced by the shrinkage-reduction assumption. Attributed movements and reason-coded adjustments are what make this reduction plausible; they do not make it automatic.' },
  { title: 'Revenue retained during outages', text: 'Daily revenue × assumed outage days × the share recovered by continuing to trade offline. Set outage days to zero if your connectivity is reliable.' },
  { title: 'Platform cost', text: 'Your expected monthly cost × 12. Build the real number on the pricing page by selecting the modules you actually need.' },
]

export default DIFFERENTIATORS
