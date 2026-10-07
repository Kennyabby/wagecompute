/* ============================================================================
   Pillars: operations playbooks, people and payroll, sector guides.
   ----------------------------------------------------------------------------
   Procedure rather than principle. Everything here should be followable on a
   Monday morning by someone with no software beyond a notebook, because that
   is the only way to write operations advice that is honest about what the
   tooling is for.
   ========================================================================= */

export const OPERATIONS_POSTS = [
  {
    slug: 'a-stocktake-that-actually-reconciles',
    pillar: 'operations',
    title: 'How to run a stocktake that actually reconciles',
    excerpt:
      'Most counts produce a number nobody trusts and a variance nobody can explain. The procedure that fixes it, and the four rules that make the difference.',
    image: 'inventoryCount',
    date: '2026-01-21',
    minutes: 10,
    author: 'operations',
    featured: true,
    references: ['ias2', 'coso'],
    body: [
      { t: 'p', text: 'A stocktake has one purpose: to establish what you actually have, and to explain any difference between that and what the records said. Most counts achieve the first and abandon the second, which is why the same businesses find the same unexplained variance every year and have stopped expecting otherwise.' },
      { t: 'p', text: 'The difference between a count that reconciles and one that does not is almost entirely procedural, and the procedure is not long.' },

      { t: 'h2', text: 'The four rules' },
      {
        t: 'ol',
        items: [
          '**Freeze movement, or record it separately.** Stock cannot move during a count unless every movement is captured on a separate sheet and applied afterwards. Counting a moving target produces a number that was never true.',
          '**Count blind.** Counters should not see the expected quantity. Given a number to confirm, people confirm it. This single change finds more genuine variance than any other.',
          '**Count twice where it matters.** High value and high movement lines get a second independent count by a different person. Not everything, just the lines where being wrong is expensive.',
          '**Separate the counter from the adjuster.** Whoever counts should not be the person who authorises the write-off. This is the small business form of separation of duties, which is the principle underneath most internal control frameworks.[^coso]',
        ],
      },

      { t: 'h2', text: 'The procedure' },
      {
        t: 'steps',
        items: [
          { title: 'A week before: tidy and label', text: 'Most counting errors are location errors. Same item in three places is three chances to miss one. Consolidate, label shelves, and clear the things that are not stock out of the stock area.' },
          { title: 'A week before: deal with the suspense cases', text: 'Goods received not invoiced, goods on loan, customer returns awaiting inspection, items awaiting disposal. Each needs a decision before the count, or it will be counted inconsistently by different people.' },
          { title: 'The day: freeze and cut off', text: 'Note the last document number for receipts, despatches and sales. Everything after that number belongs to the next period. Writing these down is what makes the reconciliation possible later.' },
          { title: 'The day: count blind, in pairs, by zone', text: 'One counts, one records. Zones assigned so no area is anyone’s own. Sheets numbered and signed.' },
          { title: 'The day: second count on exceptions', text: 'Any line over a value threshold, and any line where the first count differs from the record by more than a set percentage.' },
          { title: 'After: investigate before adjusting', text: 'This is the step that gets skipped. Every variance over the threshold gets a cause written against it before anything is posted.' },
          { title: 'After: post, with reasons', text: 'Adjustments carry a reason code. A write-off with no reason is an unexplained loss recorded as a routine correction.' },
        ],
      },

      { t: 'h2', text: 'What the variances usually turn out to be' },
      { t: 'p', text: 'In rough order of frequency, and only the last is theft.' },
      {
        t: 'table',
        head: ['Cause', 'How you recognise it'],
        rows: [
          ['Unit of measure confusion', 'Variance is a clean multiple: 12, 24, 144'],
          ['Cut-off error', 'Variance matches a delivery or despatch near the count date'],
          ['Unrecorded internal use', 'Consumables and packaging, always short, never over'],
          ['Damage never written off', 'Short, and the damaged goods are physically present somewhere'],
          ['Substitution at the till', 'Two similar lines, one short and one over by the same amount'],
          ['Receiving error', 'Variance matches a single delivery quantity'],
          ['Theft', 'Persistent, concentrated in high value small items, no documentary trail'],
        ],
      },
      { t: 'p', text: 'The pattern matters more than the number. A variance that is a clean multiple of a case quantity is a counting or receiving error. A variance that is a steady small percentage of a high value line, every period, is not.' },

      { t: 'pull', text: 'Counting blind is the cheapest control available and the one most often skipped. Show someone the expected number and you will usually be told it is correct.' },

      { t: 'h2', text: 'Cycle counting, which is better' },
      { t: 'p', text: 'An annual full count is disruptive, and by the time it finds a problem the problem is up to a year old. Counting a small number of lines continuously catches issues while the cause is still traceable.' },
      { t: 'p', text: 'Rank lines by value, then count the top tier monthly, the middle quarterly and the long tail once a year. The same total effort, spread out, with far more useful results. Where accounts require a full count, cycle counting through the year makes that count faster and far less likely to produce surprises.' },
      { t: 'p', text: 'One accounting note: the valuation that reaches your accounts should be the lower of cost and net realisable value, so a count is also the natural moment to identify stock that will not sell for what you paid.[^ias2]' },

      {
        t: 'takeaways',
        items: [
          'Freeze movement or record it separately. A moving count is not a count.',
          'Count blind. Never show the expected figure.',
          'The person counting should not be the person approving the write-off.',
          'Investigate before adjusting. An adjustment with no reason is a loss you have agreed to stop looking for.',
          'Cycle counting finds problems while they are still explainable.',
        ],
      },

      {
        t: 'aside',
        title: 'How we handle this',
        text: 'Stock in Enterprise Compute is a running position derived from attributed movements rather than a stored number that gets overwritten, so a variance resolves to a list of transactions with names and times against them. Adjustments require a reason code, and counting is a separate permission from adjusting.',
        to: '/products/inventory',
      },
    ],
  },

  {
    slug: 'receiving-goods-without-creating-phantom-stock',
    pillar: 'operations',
    title: 'Receiving goods without creating phantom stock',
    excerpt:
      'The goods-in door is where most inventory problems are born. Four checks that take a few minutes and prevent months of unexplained variance.',
    image: 'warehouseWorker',
    date: '2026-03-18',
    minutes: 7,
    author: 'operations',
    references: [],
    body: [
      { t: 'p', text: 'Almost every serious inventory discrepancy can be traced back to the moment goods arrived. The count was wrong, the item was wrong, the unit was wrong, or the paperwork was signed before anyone looked in the box. Everything downstream inherits that error, and by the time it surfaces the delivery is weeks gone and the supplier has been paid.' },

      { t: 'h2', text: 'Why the door is the right place to catch it' },
      { t: 'p', text: 'It is the only moment when you still have leverage. Before you sign, a shortage is the supplier’s problem. After you sign, it is yours. The entire value of a receiving procedure is that it happens before the signature.' },

      { t: 'h2', text: 'The four checks' },
      {
        t: 'steps',
          items: [
          { title: 'Count against the order, not the delivery note', text: 'The delivery note tells you what the supplier believes they sent. The purchase order tells you what you asked for. Checking against the note confirms their arithmetic, not your order.' },
          { title: 'Check the unit, every time', text: 'Cases against singles is the most expensive recurring error in receiving. Twelve cases of twelve is not twelve, and once it enters the records that way it will take a stocktake to find.' },
          { title: 'Open something', text: 'Not every carton, but one from each line. Sealed does not mean full, and the first opportunity to find out should not be a customer.' },
          { title: 'Record shortages and damage on the note before signing', text: 'Written on the document, with the driver present. A verbal mention to a driver has never once been recoverable.' },
        ],
      },

      {
        t: 'callout',
          tone: 'warn',
          title: 'The three-way match',
          text: 'What you ordered, what arrived, and what you were invoiced for should agree. Paying on an invoice alone means paying for whatever the supplier believes they sent. Any two of the three agreeing is not enough.',
      },

      { t: 'h2', text: 'Goods received, not invoiced' },
      { t: 'p', text: 'There is always a gap between goods arriving and the invoice arriving. During it, you hold stock you have not been billed for. If that is not recorded, two things go wrong: stock is understated, and the liability is missing from your accounts.' },
      { t: 'p', text: 'This matters at period end more than people expect. Goods sitting in your warehouse that are absent from both your stock figure and your payables figure make the accounts look better than they are, and the correction arrives later as an unexplained swing.' },

      { t: 'h2', text: 'Returns, which are receiving in reverse' },
      { t: 'p', text: 'A customer return is a goods-in event and deserves the same discipline. Three questions at the point of receipt: is it resellable as is, does it need repackaging, or is it a write-off. Returns placed straight back on the shelf without that decision are how damaged goods reach the next customer, and returns left in a corner awaiting a decision are stock nobody has counted and nobody owns.' },

      {
        t: 'takeaways',
          items: [
          'Count against the purchase order, not the supplier’s delivery note.',
          'Check the unit of measure on every line. Cases against singles is the costliest routine error.',
          'Open one carton per line. Sealed is not the same as full.',
          'Note shortages on the document before signing, while the driver is there.',
          'Record goods received but not yet invoiced, or both stock and liabilities are understated.',
        ],
      },

      {
        t: 'aside',
          title: 'How we handle this',
          text: 'Receiving in Enterprise Compute is done against the purchase order, with discrepancies raised at the point of receipt rather than discovered later, and goods received not invoiced tracked as its own position so the stock and the liability stay in step.',
          to: '/products/purchase',
      },
    ],
  },

  {
    slug: 'building-a-roster-that-works',
    pillar: 'people',
    title: 'Building a shift roster that works for the business and the staff',
    excerpt:
      'Rostering is a scheduling problem wearing a people problem as a disguise. How to cover demand without the churn that badly built rotas cause.',
    image: 'hotelStaff',
    date: '2026-03-25',
    minutes: 8,
    author: 'operations',
    references: ['iloWorkingTime'],
    body: [
      { t: 'p', text: 'Most rotas are built backwards. Someone starts with who is available and fits the week around it, then discovers on Friday that the busiest four hours of the week are covered by the two least experienced people on the team.' },
      { t: 'p', text: 'Build it from demand instead, and most of the friction goes away.' },

      { t: 'h2', text: 'Start with the demand curve' },
      { t: 'p', text: 'Before anything else, find out when the work actually is. Take eight weeks of transaction counts by hour and day. Not revenue, transactions, because workload follows the number of interactions rather than the value of them.' },
      { t: 'p', text: 'Nearly every business is surprised by this. The peak is usually narrower and earlier than people believe, and there is usually at least one period being staffed out of habit rather than evidence.' },

      { t: 'h2', text: 'Then cover it in layers' },
      {
        t: 'ul',
          items: [
          '**Base layer.** The minimum to open safely and legally. This never varies.',
          '**Demand layer.** Added to match the curve. These are the shifts that move week to week.',
          '**Skill layer.** The people who must be present for specific tasks: a keyholder, a supervisor who can authorise refunds, a qualified person where the role requires one.',
        ],
      },
      { t: 'p', text: 'Separating the three stops the common failure where a rota is numerically adequate and operationally useless because nobody on at 7pm can approve a refund.' },

      { t: 'h2', text: 'The rules that reduce churn' },
      {
        t: 'ol',
          items: [
          '**Publish far enough ahead that people can have a life.** Two weeks is a reasonable floor and is worth more to most staff than small pay differences.',
          '**Keep patterns stable.** The same person on roughly the same days is easier for everyone, and irregular rotas are a common reason good staff leave.',
          '**Respect rest between shifts.** A closing shift followed by an opening shift is legal in many places and is a reliable way to produce mistakes and resignations. International working time standards exist on hours and rest periods, and national law governs, but the operational argument stands on its own.[^iloWorkingTime]',
          '**Make swaps possible without management.** A clear rule for staff to swap among themselves, with notification rather than approval, removes a large amount of administration.',
          '**Keep the record.** Who was rostered, who actually worked, and who approved the difference. This is what settles disputes, and it needs to exist before you need it.',
        ],
      },

      {
        t: 'callout',
          tone: 'info',
          title: 'The cost nobody puts on the rota',
          text: 'Replacing a trained member of staff costs recruitment, induction, and weeks of reduced output, plus the load on everyone covering the gap. A rota that saves a few hours of wage cost and causes one extra resignation a year has not saved anything.',
      },

      { t: 'h2', text: 'Rostered against actual' },
      { t: 'p', text: 'The rota is a plan. Attendance is what happened. The gap between them is where both your labour cost and most of your disputes live, and a business that only records one of the two cannot see it.' },
      { t: 'p', text: 'Record both, and review the difference weekly rather than at month end when payroll is already running. Persistent early finishes, unapproved overtime and shifts worked by someone other than the person rostered are all visible immediately and all invisible if you only hold the plan.' },

      {
        t: 'takeaways',
          items: [
          'Build from the demand curve, measured in transactions, not from availability.',
          'Cover in three layers: base, demand and skill. Numerical cover is not operational cover.',
          'Publish at least two weeks ahead and keep patterns stable.',
          'Let staff swap with notification rather than approval.',
          'Record rostered and actual separately. The gap is your labour cost and your disputes.',
        ],
      },

      {
        t: 'aside',
          title: 'How we handle this',
          text: 'Attendance in Enterprise Compute is recorded against the roster rather than separately from it, so rostered against actual is a figure you can see during the week rather than a reconciliation at month end. Approvals for the difference are attributed, which is what makes a disputed shift answerable.',
          to: '/products/attendance',
      },
    ],
  },

  {
    slug: 'where-retail-stock-actually-goes',
    pillar: 'sectors',
    title: 'Where retail stock actually goes, and how to find out',
    excerpt:
      'Shrinkage is usually discussed as theft. In most shops the majority of it is not. How to separate the causes so you can act on the right one.',
    image: 'supermarketAisle',
    date: '2026-04-01',
    minutes: 8,
    author: 'operations',
    references: [],
    body: [
      { t: 'p', text: 'Ask a shop owner about shrinkage and the conversation goes immediately to theft. Theft is real and it is rarely the largest component. Treating all loss as theft leads to spending on cameras and security while the actual causes continue untouched.' },
      { t: 'p', text: 'The useful move is to stop treating shrinkage as one number.' },

      { t: 'h2', text: 'The four buckets' },
      {
        t: 'table',
          head: ['Bucket', 'What it is', 'Usual signature'],
          rows: [
          ['Process loss', 'Receiving errors, unit confusion, mis-scanning, untracked internal use', 'Clean multiples, or two items with equal and opposite variance'],
          ['Waste', 'Expiry, damage, spoilage', 'Concentrated in short-dated or fragile lines, seasonal'],
          ['Administrative loss', 'Pricing errors, unrecorded discounts, returns never processed', 'Value variance without quantity variance'],
          ['Theft', 'External and internal', 'High value, small, concentrated, persistent, no document trail'],
        ],
      },
      { t: 'p', text: 'The signatures are what let you separate them. A variance of exactly 24 units is not theft, it is a case counted as a unit. A line where the quantity is right and the value is wrong is a pricing or discount problem, not a missing item.' },

      { t: 'h2', text: 'The measurement that makes it visible' },
      { t: 'p', text: 'Shrinkage as a single annual percentage is almost useless. Three changes make it actionable.' },
      {
        t: 'ol',
          items: [
          '**By line, not by store.** Loss is never evenly spread. A handful of lines will account for most of it.',
          '**By period, frequently.** Annual figures cannot be investigated because the cause is long gone. Monthly on the top lines is the minimum useful frequency.',
          '**By cause, recorded at the time.** This is the one that requires discipline. Every write-off gets a reason when it is made, not reconstructed afterwards.',
        ],
      },

      { t: 'pull', text: 'A business that records every loss as "adjustment" has chosen not to know. The reason code is the entire measurement.' },

      { t: 'h2', text: 'What to do about each' },
      { t: 'p', text: '**Process loss** responds to receiving discipline and to unit of measure checks. It is the cheapest to fix and usually the largest bucket.' },
      { t: 'p', text: '**Waste** responds to ordering and rotation. If short-dated stock is being written off routinely, the order quantity is wrong, and no amount of rotation discipline will fix an order that is too large.' },
      { t: 'p', text: '**Administrative loss** responds to permissions. Discounting as a separate right from selling, with a limit and a record, removes most of it.' },
      { t: 'p', text: '**Theft** responds to attribution. Not cameras first: named accounts, so every sale, void, refund and adjustment carries a person. Most internal theft depends on actions that cannot be traced to anyone, and shared logins are what make that possible.' },

      {
        t: 'callout',
          tone: 'idea',
          title: 'Start here if you start anywhere',
          text: 'Rank your lines by value of variance over the last quarter. The top ten will usually account for most of it, and they will usually fall into two or three different buckets with different fixes. That ranking is an afternoon of work and it is worth more than a year of general vigilance.',
      },

      {
        t: 'takeaways',
          items: [
          'Shrinkage is four different problems with four different fixes.',
          'Variance patterns identify the cause: clean multiples are process, value-only is administrative.',
          'Measure by line and monthly. Annual store-level figures cannot be investigated.',
          'Record a reason at the moment of write-off or the measurement does not exist.',
          'Attribution does more against internal theft than surveillance does.',
        ],
      },

      {
        t: 'aside',
          title: 'How we handle this',
          text: 'Adjustments in Enterprise Compute require a reason code and carry the person who made them, so shrinkage reports separate process loss from waste from theft rather than presenting one number. Voids, refunds and discounts are separate permissions from selling, each recorded against a named operator.',
          to: '/products/inventory',
      },
    ],
  },
]

export default OPERATIONS_POSTS
