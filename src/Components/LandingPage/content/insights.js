/* ============================================================================
   Content for /blog (insights index + article pages) and /press (newsroom).
   ----------------------------------------------------------------------------
   Articles carry their full body here as an array of blocks, so /blog/:slug
   renders real long-form content rather than a stub that links elsewhere. The
   subject matter is deliberately operational, how the mechanics work and why
   they were built that way, because that is what this platform can write
   about credibly.

   Press items are product and company announcements. Dates are written as
   absolute ISO strings so nothing drifts.
   ========================================================================= */

export const POST_TOPICS = ['All topics', 'Operations', 'Accounting', 'Product', 'AI', 'Engineering']

export const POSTS = [
  {
    slug: 'the-ledger-is-not-a-report',
    topic: 'Accounting',
    title: 'The ledger is not a report you run at month-end',
    excerpt: 'Most small-business systems treat accounting as something that happens after the fact. That single design decision is why month-end takes three weeks.',
    image: 'accountantDesk',
    date: '2026-09-18',
    minutes: 9,
    author: { name: 'Enterprise Compute', role: 'Product team' },
    featured: true,
    body: [
      { type: 'p', text: 'There are two ways to build business software. You can treat the operational system as the real thing and accounting as a report you produce from it afterwards, or you can treat the ledger as the real thing and let operations write to it as they happen. Almost every small-business product takes the first route, because it is far easier to build. It is also why the finance lead at a thirty-person company spends the first three weeks of every month rebuilding the previous one.' },
      { type: 'h2', text: 'What "afterwards" actually costs' },
      { type: 'p', text: 'When the ledger is reconstructed rather than written, three things follow automatically. Figures disagree, because the sales report and the accounts are now two independent derivations of the same events. Nothing is traceable, because the reconstruction step throws away the link between the entry and the document that caused it. And the close gets slower every year, because reconstruction scales with history.' },
      { type: 'p', text: 'None of those are bugs. They are consequences of the architecture, and no amount of feature work fixes them.' },
      { type: 'h2', text: 'Writing as you go' },
      { type: 'p', text: 'The alternative is that a sale posts revenue, cost of sales, tax and the receivable at the moment it completes. A goods receipt raises the stock position and the inventory value together. A pay run posts gross cost, each deduction liability and net payable as part of the run. By the time anyone asks for a trial balance, it already exists. The only question is which period to show.' },
      { type: 'p', text: 'This requires one thing that is genuinely difficult: a mapping, decided once, from operational activity to accounts. Which account does a cash sale credit? Where does stock shrinkage go? That is a real decision and it deserves your accountant’s attention for an afternoon at setup. After that, nobody makes it again, which is precisely why the postings stay consistent.' },
      { type: 'h2', text: 'The closing snapshot' },
      { type: 'p', text: 'The remaining problem is performance. A ledger that has been written to continuously for four years contains a lot of entries, and recomputing a balance from the beginning of time on every page load does not scale. The answer is a closing snapshot: when a period closes, the resulting balances are stored, and the next period computes forward from that point rather than from the start.' },
      { type: 'p', text: 'That is why closing a period matters operationally and not just ceremonially. It is also why a closed period is locked. If later activity could quietly change a signed-off month, the snapshot it anchors would stop being trustworthy, and so would every figure computed forward from it.' },
      { type: 'h2', text: 'What you get for it' },
      { type: 'p', text: 'A close that is a review rather than a reconstruction. Figures that cannot disagree with each other, because there is only one set of them. And the ability to click a number on a dashboard, land in the ledger entries behind it, and from there open the actual sale, receipt or pay run that produced it. That last one changes arguments into lookups, which is a bigger operational improvement than it sounds.' },
    ],
  },
  {
    slug: 'stock-variance-has-a-cause',
    topic: 'Operations',
    title: 'Every stock variance has a cause. Most systems throw it away.',
    excerpt: 'If your count comes out wrong and you cannot say why, the problem is not the count. It is that the position was never built from recorded movements.',
    image: 'inventoryCount',
    date: '2026-08-27',
    minutes: 7,
    author: { name: 'Enterprise Compute', role: 'Product team' },
    featured: true,
    body: [
      { type: 'p', text: 'Ask an operations manager what their stock variance was last quarter and most can tell you. Ask them what caused it and the conversation changes. The number is known; the explanation is not. That gap is not carelessness. It is a direct result of how the stock figure is stored.' },
      { type: 'h2', text: 'Stored quantity versus derived position' },
      { type: 'p', text: 'If an item record holds a quantity field that gets overwritten every time something happens, then the current number is all you have. The history of how it got there was destroyed by each successive write. A variance against a physical count is then genuinely unexplainable, and the only available response is to write it off.' },
      { type: 'p', text: 'If instead every change is recorded as a movement, whether that is a sale, a receipt, a transfer, a production consumption, a wastage or an adjustment, then the position is derived by summing them. The current number is a conclusion, not a stored value, and every variance is a list of movements you can read.' },
      { type: 'h2', text: 'Attribution is the other half' },
      { type: 'p', text: 'A movement log only helps if each entry carries who, when and against which document. A quantity that dropped by six is not useful. A quantity that dropped by six on a Tuesday afternoon against a transfer to the second branch, raised by a named supervisor, received short by two, is actionable. And the two-unit discrepancy on receipt was itself raised at the time rather than absorbed.' },
      { type: 'h2', text: 'Make adjustments explain themselves' },
      { type: 'p', text: 'The adjustment is the movement type that most often becomes a dumping ground. If an adjustment can be posted with no reason attached, it will be, and the movement log quietly stops being an explanation. Requiring a reason code is a small constraint that preserves the usefulness of everything around it.' },
      { type: 'h2', text: 'The count stops being a discovery' },
      { type: 'p', text: 'The practical outcome is that a physical count changes role. It stops being the event where you find out what you have and becomes a check on a number you already had. That is a far cheaper exercise, which is why operators who move to a movement-derived position usually end up counting more often rather than less.' },
    ],
  },
  {
    slug: 'what-offline-first-really-means',
    topic: 'Engineering',
    title: 'What "works offline" has to mean to be worth anything',
    excerpt: 'A cached read-only view is not offline support. Here is what the queue, the ids and the conflict handling actually have to do.',
    image: 'posTerminal',
    date: '2026-08-06',
    minutes: 8,
    author: { name: 'Enterprise Compute', role: 'Engineering' },
    body: [
      { type: 'p', text: 'A lot of software claims offline support and means that the last page you loaded still renders. For a till, that is worthless. Offline support for a point of sale means the business can keep taking money, and that is a much harder problem, because it means accepting writes you cannot immediately confirm.' },
      { type: 'h2', text: 'The queue has to be durable' },
      { type: 'p', text: 'Holding pending transactions in memory fails the first time a browser refreshes, a tab is closed or a tablet runs flat, all of which happen during a long outage. The queue has to be written to durable local storage, which in a browser means IndexedDB, and it has to survive a reload without a human needing to know it existed.' },
      { type: 'h2', text: 'Replay has to be idempotent' },
      { type: 'p', text: 'The dangerous moment is not the outage, it is the recovery. A client uploads a batch, the connection dies mid-response, and the client does not know whether the server accepted it. Retrying is correct; double-posting is not. The fix is that every queued change carries a client-generated transaction id, and the server rejects an id it has already seen. The retry becomes safe, so the client can simply always retry.' },
      { type: 'h2', text: 'Conflicts belong to people' },
      { type: 'p', text: 'If the same record changed on the device and on the server, something has to decide. Last-write-wins is the common choice and it is the wrong one for business records, because it silently discards a real transaction that a real person entered. Surfacing the clash is slower and more annoying and it is the only honest option.' },
      { type: 'p', text: 'The same reasoning applies to a subtler case: two tills, both offline, both selling the last unit of an item. Neither sale is wrong at the moment it is made. Discarding one afterwards would mean telling a customer who already left with the goods that the sale did not happen. So both post, the resulting negative position is raised as an exception, and a human resolves it knowing what actually occurred.' },
      { type: 'h2', text: 'Convergence has to be automatic' },
      { type: 'p', text: 'Finally, once a batch lands, everything downstream has to catch up without being asked: the affected period summaries, the dashboards, every other open session. If recovery requires somebody to remember to press refresh, the system has quietly made reconnection a manual process, and people will stop trusting the numbers during the window where it matters most.' },
    ],
  },
  {
    slug: 'an-assistant-that-cites-its-sources',
    topic: 'AI',
    title: 'An assistant that cites its sources, or it is not worth having',
    excerpt: 'The useful question is never "what is a trial balance". It is "why does mine not balance", and answering that means reading your actual records.',
    image: 'dataAnalytics',
    date: '2026-07-15',
    minutes: 7,
    author: { name: 'Enterprise Compute', role: 'Product team' },
    body: [
      { type: 'p', text: 'There is a version of business AI that is a general language model with your company name in the prompt. It is confident, it is fluent, and it cannot tell you anything about your business that you did not already type into the question. For an operator trying to work out why a stock figure is wrong, that is worse than useless, because the fluency makes the uselessness hard to detect.' },
      { type: 'h2', text: 'Grounded means querying, not remembering' },
      { type: 'p', text: 'An assistant is grounded when it answers by querying your live records at the moment you ask. Not a summary produced last night, not a vector index of last month’s exports. The actual movement history, the actual ledger entries, the actual permission set of the person asking.' },
      { type: 'p', text: 'That last clause matters more than it looks. An assistant that can read everything becomes a way around your access controls: ask it for the payroll figures you are not cleared to open and it will helpfully tell you. Scoping it to the asking user’s own permissions is not a limitation, it is what makes it safe to deploy.' },
      { type: 'h2', text: 'The answer has to be checkable' },
      { type: 'p', text: 'A grounded answer with no citations is still an assertion. If Epsilon says a stock position dropped because of three transfers and a wastage entry, it should hand you those four records. Then you are not trusting the model, you are using it as a very fast way of finding the transactions. And if it is wrong, you find out straight away rather than three weeks later.' },
      { type: 'h2', text: 'Propose, never act' },
      { type: 'p', text: 'The strongest constraint is the simplest: it can draft, it cannot write. A proposed purchase order or a suggested correcting entry is useful. The same thing applied automatically is a liability, because the failure mode is a silent incorrect posting in a system whose entire value is that its records are trustworthy. Nothing changes until a person with the relevant permission accepts it.' },
    ],
  },
  {
    slug: 'per-module-pricing',
    topic: 'Product',
    title: 'Why we price per module and not per user',
    excerpt: 'Per-seat pricing punishes you for putting the whole team on the system, which is the one thing that makes it work.',
    image: 'teamMeeting',
    date: '2026-06-24',
    minutes: 5,
    author: { name: 'Enterprise Compute', role: 'Product team' },
    body: [
      { type: 'p', text: 'Per-seat pricing is the default in business software and it creates a predictable, damaging behaviour: customers ration accounts. Three cashiers share a login. The warehouse supervisor uses the manager’s credentials. The accountant gets a read-only seat they have to ask someone to log into.' },
      { type: 'h2', text: 'Shared logins destroy attribution' },
      { type: 'p', text: 'Every one of those workarounds breaks the thing the system is for. Cash variance cannot be attributed to a shift if three people share the operator account. An audit trail that says the manager posted an adjustment at 3am is worthless if four people know that password. The pricing model directly undermines the product.' },
      { type: 'h2', text: 'So we price the capability instead' },
      { type: 'p', text: 'Every plan includes unlimited users. What you pay for is which modules the business runs: Point of Sale, Inventory, Payroll, the accounting stack. A six-person shop and a sixty-person group pay the same for Inventory, because it is the same Inventory.' },
      { type: 'p', text: 'The six core modules (Dashboard, Employees, Departments, Positions, Attendance and Settings) are free permanently on every plan, because charging a business to keep its own staff records and to control its own access permissions is charging for the floor rather than the building.' },
      { type: 'h2', text: 'The honest trade-off' },
      { type: 'p', text: 'This model is worse for us with very large, very simple deployments and better for us with small, sophisticated ones. We think that is the right way round: the businesses that need an ERP most are rarely the ones with the most headcount, and a pricing model that makes you hide users from your own system is not a pricing model, it is a tax on using the product correctly.' },
    ],
  },
  {
    slug: 'building-for-unreliable-power',
    topic: 'Engineering',
    title: 'Designing for unreliable power and intermittent networks',
    excerpt: 'Most enterprise software assumes connectivity. Building for markets where that assumption fails changes the architecture, not just the error messages.',
    image: 'marketTrader',
    date: '2026-05-30',
    minutes: 8,
    author: { name: 'Enterprise Compute', role: 'Engineering' },
    body: [
      { type: 'p', text: 'If you build software in a place where the network is effectively always there, offline handling is an error state. You show a message, you disable the save button, and you wait. That is a perfectly reasonable design, and it is unusable for a shop that loses connectivity for two hours on an ordinary Thursday.' },
      { type: 'h2', text: 'Connectivity as a normal condition, not a failure' },
      { type: 'p', text: 'The design shift is to treat being offline as one of the states the system normally operates in rather than as a fault. That means the client holds enough local state to keep working, writes are queued rather than rejected, and the interface tells the operator what is pending instead of pretending nothing is different.' },
      { type: 'p', text: 'Visibility matters as much as capability. A cashier needs to know they are offline, how many sales are waiting to upload and when the last successful sync happened. Not because they will do anything about it, but because the alternative is discovering a week later that a device never reconnected.' },
      { type: 'h2', text: 'Power is a separate problem' },
      { type: 'p', text: 'Intermittent power is not the same constraint as intermittent network and needs a different answer. A browser tab that dies mid-transaction has to lose nothing, which is the whole argument for a durable local queue rather than in-memory state. For sites where the problem is structural rather than occasional, the desktop build ships with a bundled local database so the workspace does not depend on a remote service being reachable at all.' },
      { type: 'h2', text: 'Currency and formatting are not an afterthought' },
      { type: 'p', text: 'Building primarily for one market has a quieter benefit: naira-native amounts, local tax treatment and receipt formats that match what customers expect are defaults rather than configuration. Software that was localised later always shows the seams somewhere, usually in the places operators look at a thousand times a day.' },
    ],
  },
]

export const POST_BY_SLUG = POSTS.reduce((acc, post) => {
  acc[post.slug] = post
  return acc
}, {})

/* ------------------------------------------------------------- newsroom -- */

export const PRESS_RELEASES = [
  {
    slug: 'epsilon-general-availability',
    kind: 'Product',
    date: '2026-09-02',
    title: 'Epsilon, the records-grounded AI assistant, is generally available',
    text: 'Epsilon moves out of limited release. Licensed per seat with a separate usage balance, it answers questions by querying a workspace’s live records within the asking user’s own permission scope, and proposes changes without ever applying them unprompted.',
  },
  {
    slug: 'per-module-pricing-launch',
    kind: 'Company',
    date: '2026-07-08',
    title: 'Enterprise Compute moves to per-module pricing with unlimited users',
    text: 'Pricing is now based on which modules a workspace runs rather than how many people use it. Dashboard, Employees, Departments, Positions, Attendance and Settings become free permanently on every plan.',
  },
  {
    slug: 'desktop-application',
    kind: 'Product',
    date: '2026-05-14',
    title: 'Desktop application ships for low-connectivity sites',
    text: 'A packaged desktop build with a bundled local database, for operators whose connectivity is structurally unreliable rather than occasionally interrupted. Workspaces continue to operate without a reachable remote service.',
  },
  {
    slug: 'accounting-engine',
    kind: 'Product',
    date: '2026-03-19',
    title: 'Incremental period closings land in the accounting engine',
    text: 'Closing a period now stores a balance snapshot that subsequent periods compute forward from, so reporting performance no longer degrades as transaction history grows.',
  },
  {
    slug: 'offline-sync-engine',
    kind: 'Engineering',
    date: '2026-01-22',
    title: 'Offline queue adds idempotent replay and surfaced conflict handling',
    text: 'Queued changes now carry client transaction ids, making retries safe after a partially failed upload, and record conflicts are raised for human resolution rather than settled by last-write-wins.',
  },
]

export const MEDIA_CONTACT = {
  line: 'For press enquiries, interviews and product briefings.',
  action: 'Contact the team',
  to: '/contact',
}

export default POSTS
