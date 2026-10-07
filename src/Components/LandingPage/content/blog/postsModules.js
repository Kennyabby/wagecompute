/* ============================================================================
   Pillar: how the work actually works.
   ----------------------------------------------------------------------------
   One piece per area of a business. The house rule, applied strictly: lead
   with the problem and how to solve it by hand, reach the product late, once,
   and in the labelled aside rather than in the prose. A reader running a
   competitor's software should still finish these better off.

   Two written. The remaining areas are listed in REMAINING_MODULE_TOPICS at
   the foot of this file so the backlog is visible rather than implied.
   ========================================================================= */

export const MODULE_POSTS = [
  {
    slug: 'what-a-till-is-actually-for',
    pillar: 'modules',
    title: 'What a till is actually for, and why most of them get it wrong',
    excerpt:
      'A point of sale is not a calculator that prints. It is the place where money, stock and accountability meet, and the design decisions there shape everything downstream.',
    image: 'posTerminal',
    date: '2026-03-04',
    minutes: 10,
    author: 'operations',
    references: ['coso', 'pciDss'],
    body: [
      { t: 'p', text: 'Most people think of a till as the thing that adds up the shopping and opens a drawer. That describes the least important part of what happens at the point of sale.' },
      { t: 'p', text: 'Three separate things occur in the same two seconds: money changes hands, stock leaves the building, and a person becomes accountable for both. A till that handles the first and ignores the other two is where the majority of small business record-keeping problems begin.' },

      { t: 'h2', text: 'The three events, and what happens when you only record one' },
      {
        t: 'table',
          head: ['Event', 'If recorded', 'If not recorded'],
          rows: [
          ['Money received', 'Cash position is knowable', 'Nothing works at all. Everyone records this one'],
          ['Stock reduced', 'Inventory stays true, margin is real', 'Stock drifts from day one, reconciled by counting later'],
          ['Person responsible', 'Variances are investigable', 'Every discrepancy is anonymous and therefore permanent'],
        ],
      },
      { t: 'p', text: 'The second row is why so many shops discover at stocktake that they are short, and have no way to find out when or how. The third is why, once they discover it, nothing happens.' },

      { t: 'h2', text: 'Cash handling as a session, not a day' },
      { t: 'p', text: 'The useful unit is the shift, not the calendar day. A session has an opening float counted and attributed to a named person, the sales taken during it, any mid-session drops to the safe, and a closing count by the same person.' },
      { t: 'p', text: 'This matters because a daily total that covers three operators tells you there is a shortfall and nothing more. A session total tells you whose session, which narrows the investigation from a day to a few hours and from three people to one. That is the entire difference between a control and a statistic.' },

      {
        t: 'callout',
          tone: 'info',
          title: 'The rule that makes it work',
          text: 'The person who counts the float at the start should be the person who counts it at the end, and a supervisor should witness any variance over a stated threshold. Without the second half, the first half is just paperwork.',
      },

      { t: 'h2', text: 'The permissions that are not optional' },
      { t: 'p', text: 'Selling, discounting, voiding and refunding are four different activities with four different risk profiles, and treating them as one permission is the most common control failure at the till.' },
      {
        t: 'ul',
          items: [
          '**Selling** is what everyone does, all day.',
          '**Discounting** reduces revenue without reducing stock. Needs a limit and a record of who approved it.',
          '**Voiding** removes a line before completion. Routinely abused where it is unrestricted and unlogged.',
          '**Refunding** moves money out of the drawer. Should require a second person above a threshold.',
        ],
      },
      { t: 'p', text: 'This is separation of duties applied to a counter rather than a finance department, and it is the practical version of what the control frameworks describe.[^coso] A business too small to have departments can still have different rights.' },

      { t: 'h2', text: 'Why the network matters more here than anywhere' },
      { t: 'p', text: 'There is no other part of a business where unavailability is as immediately expensive. A reporting system that is down for an hour is an inconvenience. A till that is down for an hour during trading has a queue in front of it and customers walking out.' },
      { t: 'p', text: 'Which makes the point of sale the one place where local operation is not a nice-to-have. If the question "can we still sell" has any answer other than yes, the system has not been designed for a shop.' },

      { t: 'h2', text: 'Card data, briefly' },
      { t: 'p', text: 'If you take cards, you are within scope of the card industry standard, which applies to anyone who stores, processes or transmits card data regardless of size.[^pciDss] The practical consequence at the till is short: never write a card number down, never store one in your own system, and use a payment provider so the data does not reach you in the first place.' },

      { t: 'h2', text: 'What to look for, whatever you buy' },
      {
        t: 'ol',
          items: [
          'Does completing a sale reduce stock at that moment, or overnight in a batch?',
          'Is every sale, void, refund and discount attributed to a named person?',
          'Are discounting and refunding separate rights from selling, with thresholds?',
          'Can it complete a sale with no network connection, and what happens to stock when it reconnects?',
          'Is cash handled as a session with an opening float and a closing count?',
        ],
      },
      { t: 'p', text: 'Five questions. Most tills fail at least two, and the two they fail are almost always the second and the fourth.' },

      {
        t: 'takeaways',
          items: [
          'A sale is three events: money, stock and accountability. Most systems record one.',
          'Sessions, not days. A daily figure cannot be investigated.',
          'Selling, discounting, voiding and refunding are four permissions, not one.',
          'The till is the one place where working without a network is not optional.',
          'Never store card numbers. Use a provider.',
        ],
      },

      {
        t: 'aside',
          title: 'How we handle this',
          text: 'Point of Sale in Enterprise Compute ties the opening float, the sales and the closing count to a named operator per session, deducts stock as each sale completes, and keeps selling through a network outage. Discounting, voiding and refunding are permissions held separately from the right to sell.',
          to: '/products/pos',
      },
    ],
  },

  {
    slug: 'payroll-is-a-records-problem',
    pillar: 'modules',
    title: 'Payroll is a records problem wearing a payments problem as a disguise',
    excerpt:
      'The transfer is the easy part. What makes payroll hard is proving, months later, that the figure was right. What to keep, and for how long.',
    image: 'happyEmployee',
    date: '2026-04-22',
    minutes: 9,
    author: 'finance',
    references: ['iloWorkingTime', 'gdpr', 'coso'],
    body: [
      { t: 'p', text: 'Ask what payroll is and most people describe paying people. That is the last step and the simplest one. The actual work is establishing what each person is owed, applying the deductions correctly, and being able to demonstrate both a year later to someone who is not inclined to take your word for it.' },
      { t: 'p', text: 'Payroll disputes, tax queries and employment claims are all resolved the same way: by records. A business with good records has a short conversation. A business without them has an expensive one.' },

      { t: 'h2', text: 'The chain that has to hold' },
      {
        t: 'steps',
          items: [
          { title: 'The contract', text: 'Rate, hours, entitlements. Signed, dated, and retrievable. Everything downstream derives from this and disputes usually start here.' },
          { title: 'The roster', text: 'What the person was scheduled to work. The plan.' },
          { title: 'Attendance', text: 'What they actually worked. Recorded at the time, not reconstructed at month end.' },
          { title: 'Approved variance', text: 'The difference between the two, and who authorised it. This is the step almost everyone skips, and it is the step that disputes turn on.' },
          { title: 'Gross calculation', text: 'Hours times rate, plus overtime at the stated multiplier, plus allowances.' },
          { title: 'Deductions', text: 'Statutory and voluntary, each with its basis recorded.' },
          { title: 'Payment and payslip', text: 'The transfer, and the document explaining it.' },
        ],
      },
      { t: 'p', text: 'Break any link and the chain cannot be reconstructed. The usual break is step four.' },

      { t: 'pull', text: 'Nobody disputes the transfer. They dispute the hours, and the hours were agreed verbally four months ago by someone who has since left.' },

      { t: 'h2', text: 'What to keep, and why' },
      {
        t: 'table',
          head: ['Record', 'Why it is the one that matters'],
          rows: [
          ['Signed contract and any variations', 'The basis for every figure. Variations agreed by message and never formalised are the usual gap'],
          ['Hours worked, recorded at the time', 'Reconstructed timesheets carry almost no weight in a dispute'],
          ['Who approved overtime and when', 'Converts a disagreement into a document'],
          ['Deduction basis and rate used', 'Tax authorities ask how you arrived at a figure, not just what it was'],
          ['Payslips issued', 'Often a statutory requirement in itself'],
          ['Leave taken and accrued', 'Accrues quietly and becomes a real liability on departure'],
        ],
      },
      { t: 'p', text: 'International labour standards address hours, rest and record keeping, and national law will govern the specifics for you.[^iloWorkingTime] Two obligations run in different directions and both apply: employment and tax law usually require you to keep records for a stated number of years, while data protection law requires you not to keep personal data longer than necessary.[^gdpr] The resolution is a written retention period per record type, rather than keeping everything forever or clearing things out ad hoc.' },

      { t: 'h2', text: 'The control that prevents the expensive failure' },
      { t: 'p', text: 'One person who can add an employee, set their rate, approve their hours and release the payment is a single point of both error and fraud. Ghost employees are not an exotic crime, they are the predictable consequence of that combination.' },
      { t: 'p', text: 'Separating who may create an employee record from who may approve hours from who may release payment is the control, and it is the same separation of duties principle that applies to stock and cash.[^coso] In a small business this can be two people rather than three, but it cannot be one.' },

      {
        t: 'callout',
          tone: 'warn',
          title: 'The reconciliation worth doing monthly',
          text: 'Count the people on the payroll run. Count the people who are actually employed. If the two numbers require explaining, explain them now, in writing, rather than at an audit.',
      },

      {
        t: 'takeaways',
          items: [
          'The payment is the easy part. The evidence is the work.',
          'Record attendance at the time. Reconstruction is worth very little in a dispute.',
          'The approved-variance step is the one everyone skips and the one disputes turn on.',
          'Retention obligations and data protection pull in opposite directions. Write a period per record type.',
          'One person must not be able to create an employee, approve hours and release payment.',
        ],
      },

      {
        t: 'aside',
          title: 'How we handle this',
          text: 'Payroll in Enterprise Compute runs from the attendance records rather than from a separately keyed timesheet, so the chain from roster to attendance to approved variance to gross pay stays intact and every figure can be opened to what produced it. Creating an employee, approving hours and running payment are separate permissions.',
          to: '/products/payroll',
      },
    ],
  },
]

/* The rest of the module series, so the gap is explicit rather than implied.
   Each is written to the same rule: the business problem first, the product
   only in the closing aside. */
export const REMAINING_MODULE_TOPICS = [
  { pillar: 'modules', title: 'What inventory is actually measuring', module: 'Inventory' },
  { pillar: 'modules', title: 'Purchasing: the three-way match and why it exists', module: 'Purchase' },
  { pillar: 'modules', title: 'Quotes, orders, invoices: what each one commits you to', module: 'Sales' },
  { pillar: 'modules', title: 'Proof of delivery and the disputes it prevents', module: 'Delivery' },
  { pillar: 'modules', title: 'Occupancy, rates and the arithmetic of a room night', module: 'Accommodations' },
  { pillar: 'modules', title: 'Employee records from first day to last', module: 'Employees' },
  { pillar: 'modules', title: 'Why org structure belongs in your system', module: 'Departments & Positions' },
  { pillar: 'modules', title: 'Attendance records that settle arguments', module: 'Attendance' },
  { pillar: 'modules', title: 'Customers and suppliers are the same record', module: 'Business Partners' },
  { pillar: 'modules', title: 'Building a chart of accounts you can live with', module: 'Journals & Chart of Accounts' },
  { pillar: 'modules', title: 'The five reports worth looking at every month', module: 'Reports' },
  { pillar: 'modules', title: 'Expense claims without the shoebox', module: 'Expenses' },
  { pillar: 'modules', title: 'Depreciation explained without the jargon', module: 'Assets' },
  { pillar: 'modules', title: 'What a dashboard should and should not tell you', module: 'Dashboard' },
  { pillar: 'modules', title: 'What to ask an assistant that answers from your data', module: 'Epsilon AI assistant' },
  { pillar: 'modules', title: 'Permissions, approvals and who may do what', module: 'Settings & governance' },
  { pillar: 'modules', title: 'How synchronisation resolves two tills that disagree', module: 'Offline & sync' },
]

export default MODULE_POSTS
