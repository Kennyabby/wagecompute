/* ============================================================================
   Pillar posts behind the Resources library.
   ----------------------------------------------------------------------------
   Each library card on /resources opens an article here, not the
   documentation index. The house rule is the same as the rest of the blog:
   the business problem and how to handle it come first, and the product
   appears once, late, in the labelled aside. The cards keep their own slugs,
   so a card and its article share one address.
   ========================================================================= */

export const GUIDE_POSTS = [
  {
    slug: 'first-thirty-days',
    pillar: 'operations',
    title: 'Your first thirty days on a new business system',
    excerpt:
      'A week-by-week plan for going live: opening balances, a clean stock count, staff access, account mapping and a first period close you can actually sign off.',
    image: 'businessTraining',
    date: '2026-11-10',
    minutes: 14,
    author: 'operations',
    references: ['coso'],
    body: [
      { t: 'p', text: 'Most failed system changes do not fail on the software. They fail because the business tried to switch everything on the same morning, with opening figures nobody had checked and staff who had never seen the screens. Thirty days is enough time to go live properly if the work is done in the right order.' },
      { t: 'p', text: 'The order matters because each step depends on the one before it. Stock cannot be counted into a system that has no item list. Sales cannot post to accounts that do not exist. A first close cannot be signed off if the opening balances were guessed.' },

      { t: 'h2', text: 'Week one: the structure' },
      {
        t: 'steps',
        items: [
          { title: 'Decide your chart of accounts', text: 'Start from a standard template and change it only where a decision you actually make needs its own line. Your accountant should spend an afternoon on this, once.' },
          { title: 'Set up locations, departments and positions', text: 'Every till, store room and branch that holds stock or takes money is a location. Get these right first, because stock and cash are recorded against them from day one.' },
          { title: 'Load the item list', text: 'Use a spreadsheet import, not hand entry. Agree the units of measure before anything is loaded; most early stock errors are a case counted as a unit.' },
        ],
      },

      { t: 'h2', text: 'Week two: the opening position' },
      { t: 'p', text: 'Pick a cut-off date, ideally a month end, and treat it as a line nobody crosses. Everything before it comes in as an opening balance. Everything after it is entered as a transaction in the new system.' },
      {
        t: 'ul',
        items: [
          '**Balances:** cash, bank, receivables, payables, loans and equity as at the cut-off, agreed to the last set of accounts or the bank statement.',
          '**Stock:** a full count on the cut-off date, counted blind, valued at cost.',
          '**Customer and supplier balances:** listed invoice by invoice where you can, so ageing works from the first day.',
        ],
      },
      { t: 'callout', tone: 'info', title: 'The check that saves the most time', text: 'Before going further, run a trial balance on the opening position. If it does not balance, or the stock value does not match the count, stop and fix it now. Every later report inherits the error.' },

      { t: 'h2', text: 'Week three: people and controls' },
      { t: 'p', text: 'Give each person their own login and only the actions their job needs. A cashier sells; a supervisor can also discount and void; a store keeper receives and transfers; an accountant posts journals. Shared logins make every later question unanswerable, because nothing can be traced to a person.[^coso]' },
      { t: 'p', text: 'Run the tills in parallel for a few days if you can: the old method and the new one side by side, totals compared at the end of each shift. The differences show you where staff need more practice before the old method is switched off.' },

      { t: 'h2', text: 'Week four: the first close' },
      { t: 'p', text: 'At the end of the first full period, close it: reconcile the bank, count the high-value stock lines, review the trial balance and the profit and loss, then lock the period so later activity cannot quietly change it. The first close is slow. The second one takes a fraction of the time, because the structure is now settled.' },

      {
        t: 'takeaways',
        items: [
          'Structure first, then opening balances, then people, then the first close.',
          'One cut-off date, agreed to the bank and a full stock count.',
          'Check the opening trial balance before anything else is entered.',
          'Everyone gets their own login and only the actions their job needs.',
          'Lock the first period once it is signed off.',
        ],
      },
      {
        t: 'aside',
        title: 'How we handle this',
        text: 'Enterprise Compute ships a standard chart of accounts, spreadsheet templates for the item list and for journal entries, per-action permissions in Team Access, and monthly closings that can be confirmed and locked once reviewed.',
        to: '/docs',
      },
    ],
  },

  {
    slug: 'opening-balances-template',
    pillar: 'money',
    title: 'Loading opening balances and an item catalogue without retyping',
    excerpt:
      'How to bring your opening position and your product list into a new system from spreadsheets, with the checks that stop a bad import becoming a bad first year.',
    image: 'bookkeeping',
    date: '2026-11-09',
    minutes: 6,
    author: 'finance',
    references: [],
    body: [
      { t: 'p', text: 'Typing in four hundred products and a year-end balance sheet by hand is slow, and slow is the smaller problem. Hand entry introduces errors that look like real figures, and nobody notices until a margin report is wrong months later.' },
      { t: 'p', text: 'A spreadsheet import is faster and, more importantly, checkable: the file can be reviewed by a second person before it goes in, and kept as the record of what the opening position was.' },

      { t: 'h2', text: 'The item catalogue' },
      {
        t: 'ol',
        items: [
          '**Start from the template, not your own layout.** Use the columns the system expects: name, code or barcode, category, unit of measure, cost price, sales price, tax and reorder level.',
          '**Clean the names once.** Decide one spelling for each product before importing. "Coke 50cl", "COKE 50CL" and "Coca Cola 50 cl" become three products that each look short at the next count.',
          '**Agree the units.** Note for each item what one unit is, and what a case holds. Most early stock variances are a clean multiple of a case quantity.',
          '**Import once.** A second import of the same file usually adds the products again instead of updating them. Fix mistakes on the screen, or delete and reimport before anything has been sold.',
        ],
      },

      { t: 'h2', text: 'The opening balances' },
      { t: 'p', text: 'Opening balances go in as one journal dated the day before your cut-off: debits for what the business owns, credits for what it owes and for equity. The journal must balance, and its totals must agree with the closing balance sheet from your previous accounts.' },
      {
        t: 'table',
        head: ['Line', 'Agree it to'],
        rows: [
          ['Cash and bank', 'The bank statement on the cut-off date'],
          ['Stock', 'The value of a full count on the cut-off date'],
          ['Receivables and payables', 'A list of open invoices, customer by customer and supplier by supplier'],
          ['Loans', 'The lender’s statement'],
          ['Equity', 'Whatever makes it balance, checked against the last accounts'],
        ],
      },
      { t: 'callout', tone: 'info', title: 'Stock appears twice', text: 'The counted quantities load the stock positions; the value goes into the opening journal. If the two do not agree, find out why before going further, because every margin figure afterwards depends on it.' },

      {
        t: 'takeaways',
        items: [
          'Import from the template; review the file before it goes in.',
          'One name and one unit of measure per product.',
          'Opening balances are one balanced journal, dated before the cut-off.',
          'The stock value in the journal must equal the value of the count.',
        ],
      },
      {
        t: 'aside',
        title: 'How we handle this',
        text: 'In Enterprise Compute, the Products screen offers a blank import template and lets you match your own column headings to its fields, and Journals offers a journal entry template for loading the opening position. A product with a cost and a markup but no sales price gets its sales price worked out on import.',
        to: '/docs',
      },
    ],
  },

  {
    slug: 'closing-a-period',
    pillar: 'money',
    title: 'Closing a period on a ledger that never stops',
    excerpt:
      'What closing a month actually stores, why it makes every later report faster, and how to handle the adjustment that arrives after the month was signed off.',
    image: 'financialAnalysis',
    date: '2026-11-08',
    minutes: 12,
    author: 'finance',
    references: ['ifrsFramework'],
    body: [
      { t: 'p', text: 'In a business where sales post to the accounts as they happen, there is no month-end rush to build the figures. They already exist. So it is fair to ask what closing a period is for.' },
      { t: 'p', text: 'It does two jobs. It records that someone has reviewed the month and agrees with it, and it stores the month-end balances so that later reports start from there instead of adding up every transaction since the business opened.' },

      { t: 'h2', text: 'What a close stores' },
      { t: 'p', text: 'A closing is a snapshot: the balance of every account as at the last day of the month. A report for March starts from the February closing and adds only March’s entries. Without the snapshot, the same report would add up years of history every time it ran.' },
      { t: 'p', text: 'This is why closings matter even to a business that never prints a monthly pack. The longer a ledger runs, the more a missing closing costs in speed.' },

      { t: 'h2', text: 'The review before you lock' },
      {
        t: 'steps',
        items: [
          { title: 'Reconcile the bank', text: 'Every bank line matched to an entry, every entry to a bank line, timing differences listed by name.' },
          { title: 'Check receivables and payables', text: 'The ageing totals should agree with the control accounts in the trial balance. If they do not, something posted to the account without a customer or supplier against it.' },
          { title: 'Count what matters', text: 'The high-value stock lines at least. A month closed on a stock figure nobody counted is a guess with a signature on it.' },
          { title: 'Read the profit and loss', text: 'Compare it with the previous month and with the same month last year. Anything that moved a lot should have a reason you can name.' },
          { title: 'Confirm, then lock', text: 'Confirming records the review. Locking stops later activity being posted into the month without someone deliberately reopening it.' },
        ],
      },

      { t: 'h2', text: 'The adjustment that arrives late' },
      { t: 'p', text: 'It always happens: a supplier invoice for March turns up in April after March was locked. There are two honest ways to handle it, and one that causes trouble.' },
      {
        t: 'table',
        head: ['Approach', 'When to use it'],
        rows: [
          ['Post it in the current open month, with a note', 'The amount is small and nobody relies on March being exact'],
          ['Reopen March, post it, review and lock again', 'The amount changes a figure someone has already relied on: a tax return, a bank report, a bonus'],
          ['Change March quietly without reopening', 'Never. Anyone who has seen the March figures now holds a version that no longer exists'],
        ],
      },
      { t: 'p', text: 'Whichever you choose, the record should show what was done and by whom. The point of a lock is that a closed month only changes on purpose.[^ifrsFramework]' },

      {
        t: 'takeaways',
        items: [
          'A closing stores month-end balances so later reports start from them.',
          'Review before locking: bank, ageing, stock, profit and loss.',
          'Lock once signed off, so a closed month changes only on purpose.',
          'A late adjustment goes in the open month, or the closed month is reopened deliberately. Never edited quietly.',
        ],
      },
      {
        t: 'aside',
        title: 'How we handle this',
        text: 'Enterprise Compute builds monthly closings from the ledger, each from the one before it. A closing can be confirmed and locked; Find Late Changes picks up backdated activity that affects an old closing and queues it for review, and a locked period refuses new postings until an admin deliberately reopens it.',
        to: '/products/journals',
      },
    ],
  },

  {
    slug: 'permissions-model',
    pillar: 'technology',
    title: 'Designing staff permissions for a business that is growing',
    excerpt:
      'Per-action permissions, approval thresholds, and the handful of profiles most businesses end up needing: cashier, supervisor, store keeper, accountant and owner.',
    image: 'cyberSecurity',
    date: '2026-11-07',
    minutes: 8,
    author: 'engineering',
    references: ['coso', 'nistCsf'],
    body: [
      { t: 'p', text: 'In a business of five people, everyone can do everything and the owner sees it all. At twenty people across two sites that stops working, and usually nobody notices until something goes missing and it turns out that four people could have done it.' },
      { t: 'p', text: 'Good permissions are not about distrust. They make sure that when something goes wrong, the list of people who could have done it is short, and that the honest majority are never under suspicion.[^coso]' },

      { t: 'h2', text: 'Grant actions, not screens' },
      { t: 'p', text: 'A permission to "use the till" is too coarse. Selling, discounting, voiding a line, cancelling a paid order and refunding carry very different risks. The same applies in the store room: counting stock is not the same as approving the write-off that follows the count.' },

      { t: 'h2', text: 'The profiles most businesses need' },
      {
        t: 'table',
        head: ['Profile', 'Can', 'Cannot'],
        rows: [
          ['Cashier', 'Sell, take payment, run their own session', 'Discount beyond a limit, cancel paid orders, see other people’s sessions'],
          ['Supervisor', 'Everything a cashier can, plus discounts, voids, ending sessions', 'Change prices, post adjustments, see payroll'],
          ['Store keeper', 'Receive, transfer and count stock', 'Approve their own write-offs'],
          ['Accountant', 'Post journals, run reports, close periods', 'Sell, or change who has access'],
          ['Owner or admin', 'Everything, including access', 'Nothing, which is why there should be few of them'],
        ],
      },

      { t: 'h2', text: 'Three rules that keep it working' },
      {
        t: 'ol',
        items: [
          '**Everyone has their own login.** A shared login means every action is anonymous.',
          '**Temporary access ends by itself.** When someone needs extra rights for a day, to post a backdated correction for example, give it with an end time. Access that depends on someone remembering to remove it stays forever.',
          '**Leavers lose access on their last day.** Not when IT gets round to it. The quickest way to lose stock is an old login that still works.[^nistCsf]',
        ],
      },
      { t: 'pull', text: 'Access that depends on someone remembering to take it back is access you have given away for good.' },

      {
        t: 'takeaways',
        items: [
          'Grant specific actions, not whole screens.',
          'Five profiles cover most businesses; keep admins few.',
          'Temporary access should carry its own end time.',
          'Remove access the day someone leaves.',
        ],
      },
      {
        t: 'aside',
        title: 'How we handle this',
        text: 'Team Access in Enterprise Compute grants individual actions per person, per location for tills. Backlog access, for working on earlier days, ends by itself after a set number of hours. An employee whose dismissal date arrives loses every permission and sign-in automatically, and each person’s sign-in devices are listed with how often they are used.',
        to: '/products/settings',
      },
    ],
  },

  {
    slug: 'asking-epsilon-well',
    pillar: 'modules',
    title: 'Getting useful answers from an AI assistant that reads your records',
    excerpt:
      'The questions that work well, such as tracing a number, finding what is blocking something or naming who can approve it, and the ones better answered another way.',
    image: 'dataAnalytics',
    date: '2026-11-06',
    minutes: 6,
    author: 'engineering',
    references: [],
    body: [
      { t: 'p', text: 'An assistant connected to your business records is a different tool from a general chat assistant. It can look things up, but only in what your system actually holds, and only what you are allowed to see. Knowing that shapes which questions get good answers.' },

      { t: 'h2', text: 'Questions that work well' },
      {
        t: 'ul',
        items: [
          '**Tracing a number:** "Why does the stock of 50cl water at the bar show 40?" A good answer lists the movements behind it: sales, transfers, adjustments, with dates and names.',
          '**Finding a blocker:** "Why can I not end this session?" or "Why will this purchase not post?" The answer should name the order, the setting or the locked period.',
          '**Finding a person:** "Who can approve this expense?" Better than "ask your admin", because it names someone.',
          '**Live status:** "Which devices still have sales that are not on the server?" or "When does Ada’s backlog access end?"',
          '**Totals and rankings:** "Who sold the most last week, by location?"',
        ],
      },

      { t: 'h2', text: 'Questions to ask differently' },
      { t: 'p', text: 'Ask one thing at a time and name the record or the date range. "Tell me about my business" gets a vague answer; "how did October’s gross margin compare with September’s, and which product moved it most" gets a useful one.' },
      { t: 'p', text: 'An assistant that reads records should say when it cannot see something, because you lack access or the data is not there, rather than guess. Treat an answer with no figures behind it as a prompt to check, not as a finding.' },

      { t: 'h2', text: 'What it should never do on its own' },
      { t: 'p', text: 'Change data without you. A sound assistant prepares a correction or a purchase order for you to review and confirm; it does not post it silently. If an answer says something was fixed, there should be a confirmation you clicked.' },

      {
        t: 'takeaways',
        items: [
          'Ask about a specific record, number or date range.',
          'Good answers name the documents, people and settings behind them.',
          'An honest "I cannot see that" beats a confident guess.',
          'Changes are prepared for you to confirm, never made silently.',
        ],
      },
      {
        t: 'aside',
        title: 'How we handle this',
        text: 'Epsilon in Enterprise Compute answers from live tools over your own records, limited to what your login may see. It traces stock and ledger figures, diagnoses blocked postings and sessions, names approvers, lists devices and unsynced tills, and only ever proposes corrections and purchase orders for you to confirm.',
        to: '/products/epsilon',
      },
    ],
  },

  {
    slug: 'reading-your-reports',
    pillar: 'money',
    title: 'Reading a trial balance you did not prepare',
    excerpt:
      'A practical walkthrough for owners and operations leads: what a trial balance tells you, what each column means, and how to drill from a strange figure to the document behind it.',
    image: 'businessFinance',
    date: '2026-11-05',
    minutes: 13,
    author: 'finance',
    references: ['ifrsFramework'],
    body: [
      { t: 'p', text: 'A trial balance is the list of every account with its balance. It looks like an accountant’s document, and that is the reason most owners never read it. It is also the quickest way to see whether anything in the books is obviously wrong.' },

      { t: 'h2', text: 'The columns' },
      {
        t: 'table',
        head: ['Column', 'What it tells you'],
        rows: [
          ['Opening balance', 'Where the account stood at the start of the period'],
          ['Debit and credit', 'What moved in the period, in each direction'],
          ['Period net', 'Debits less credits for the period alone'],
          ['Closing balance', 'Opening plus period net: where it stands now'],
        ],
      },
      { t: 'p', text: 'Total debits equal total credits, always. If they do not, the report is broken, not the business. Ask whoever runs the system before reading further.' },

      { t: 'h2', text: 'Five checks that take ten minutes' },
      {
        t: 'ol',
        items: [
          '**Cash and bank.** The closing balance should match the bank statement for the same date, or differ only by items you can name.',
          '**Signs that make no sense.** A cash account in credit means more was paid out than ever came in. A stock account in credit means more was sold than was ever received.',
          '**Accounts that should be empty.** Suspense, clearing and "uncategorised" accounts should be near zero. A balance there is an unanswered question.',
          '**Receivables and payables.** Compare the closing balance with the ageing report. They should agree.',
          '**Large movements.** Any account whose period net is far from its usual month deserves one question: what caused it?',
        ],
      },

      { t: 'h2', text: 'From a strange figure to its cause' },
      { t: 'p', text: 'A balance is the sum of its entries, and every entry should point back to a document: a sale, a receipt, a pay run, a journal. When a figure looks wrong, open the entries behind it, sort them by size, and open the largest. Most surprises are one document posted to the wrong account or on the wrong date.' },
      { t: 'callout', tone: 'info', title: 'Where the profit and loss and balance sheet come from', text: 'Both are the trial balance, regrouped. Revenue and expense accounts become the profit and loss; asset, liability and equity accounts become the balance sheet. If the trial balance is right, they are right too.[^ifrsFramework]' },

      {
        t: 'takeaways',
        items: [
          'Debits equal credits, or the report itself is broken.',
          'Cash must agree to the bank; stock and cash should never be in credit.',
          'Suspense and clearing accounts should be close to zero.',
          'Every balance opens into entries, and every entry into a document.',
        ],
      },
      {
        t: 'aside',
        title: 'How we handle this',
        text: 'The trial balance in Enterprise Compute shows opening balance, debit, credit, period net and closing balance for each account, for any period and branch. Clicking a figure opens the ledger lines behind it, and each line opens the sale, receipt, pay run or journal that posted it.',
        to: '/products/reports',
      },
    ],
  },

  {
    slug: 'module-dependencies',
    pillar: 'modules',
    title: 'Buying business software by the module: what depends on what',
    excerpt:
      'Which modules are free for good, which are priced, what gets switched on automatically because something else needs it, and how to choose a starting set.',
    image: 'officeLaptop',
    date: '2026-11-04',
    minutes: 5,
    author: 'editorial',
    references: [],
    body: [
      { t: 'p', text: 'Paying only for the parts of a system you use sounds simple until you find that one part cannot work without another. A till that sells stock needs the stock records. A payroll that pays from attendance needs attendance. Knowing the chain before you choose avoids surprises on the first invoice.' },

      { t: 'h2', text: 'Free, and always included' },
      { t: 'p', text: 'The Dashboard and Settings, and the people records: Employees, Departments, Positions and Attendance. These cost nothing on any plan, because almost everything else depends on knowing who works for you and where.' },

      { t: 'h2', text: 'What each priced module brings with it' },
      {
        t: 'table',
        head: ['You switch on', 'It also needs'],
        rows: [
          ['Payroll', 'Employees, Attendance, Departments and Positions (all free)'],
          ['Purchase', 'Inventory'],
          ['Sales', 'Inventory'],
          ['POS', 'Sales and Inventory'],
          ['Delivery', 'Sales, and through it Inventory'],
          ['Journals and chart of accounts', 'Expenses'],
          ['Reports', 'Journals, and through it Expenses'],
          ['Inventory, Assets, Expenses, Accommodations, Business Partners, Epsilon, Business Central Reports', 'Nothing else'],
        ],
      },
      { t: 'p', text: 'When you choose a module, everything it needs is added for you, and the price shown includes those additions. Nothing is switched on that the chain does not require.' },

      { t: 'h2', text: 'Choosing a starting set' },
      {
        t: 'ul',
        items: [
          '**A shop or bar:** POS, which brings Sales and Inventory.',
          '**Add proper books:** Reports, which brings Journals and Expenses.',
          '**Staff paid from attendance:** Payroll.',
          '**Buying from suppliers on credit:** Purchase and Business Partners.',
        ],
      },
      { t: 'p', text: 'Start with what you will use in the first month. Adding a module later takes effect at once, with the new price from your next renewal.' },

      {
        t: 'takeaways',
        items: [
          'Dashboard, Settings and the people records are free for good.',
          'A module brings in what it depends on, and the price includes it.',
          'POS needs Sales and Inventory; Reports needs Journals and Expenses; Payroll needs the people records.',
          'Start small; modules added later work at once.',
        ],
      },
      {
        t: 'aside',
        title: 'How we handle this',
        text: 'Enterprise Compute prices each module separately and resolves dependencies for you when you choose. The pricing page shows the full set and the total before you commit.',
        to: '/pricing',
      },
    ],
  },
]

export default GUIDE_POSTS
