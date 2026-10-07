/* ============================================================================
   Pillar: running the numbers.
   ----------------------------------------------------------------------------
   Arithmetic, shown. Every figure in these pieces is a worked example with its
   assumptions stated in the text, never a borrowed statistic. If a reader can
   substitute their own numbers and follow the same steps, the piece has done
   its job.
   ========================================================================= */

export const NUMBERS_POSTS = [
  {
    slug: 'margin-is-not-markup',
    pillar: 'numbers',
    title: 'Margin is not markup, and the difference is costing you money',
    excerpt:
      'The most common arithmetic error in small business pricing, why it always errs in the same direction, and how to stop making it in about ten minutes.',
    image: 'businessFinance',
    date: '2026-01-14',
    minutes: 8,
    author: 'finance',
    featured: true,
    references: [],
    body: [
      { t: 'p', text: 'Two words get used as though they mean the same thing. They do not, they are calculated from different denominators, and the mistake always runs the same way: it makes you think you are earning more than you are.' },
      { t: 'p', text: 'This is not a subtle point of accounting theory. It is the reason businesses discount themselves into losses while believing they still have room.' },

      { t: 'h2', text: 'The definitions, once, clearly' },
      { t: 'p', text: '**Markup** is the amount you add, measured against what the item cost you. **Margin** is the amount you keep, measured against what you sold it for.' },
      { t: 'p', text: 'Buy an item for 1,000 and sell it for 1,500.' },
      {
        t: 'ul',
        items: [
          'Markup is 500 divided by 1,000, which is 50 percent.',
          'Margin is 500 divided by 1,500, which is 33.3 percent.',
        ],
      },
      { t: 'p', text: 'Same transaction. Same 500. Two very different percentages, and only one of them tells you what you keep.' },

      {
        t: 'callout',
        tone: 'idea',
        title: 'The one-line version',
        text: 'Markup divides by cost. Margin divides by price. Margin is always the smaller number, and margin is the one that pays your rent.',
      },

      { t: 'h2', text: 'Where it goes wrong in practice' },
      { t: 'p', text: 'Suppose you believe you are working on a 40 percent margin, and a customer asks for 35 percent off. You might reason that you are still just about ahead.' },
      { t: 'p', text: 'If that 40 percent was actually a markup, your real margin was 28.6 percent. The 35 percent discount does not leave you thin. It puts you below cost on every unit, and the more you sell the worse it gets.' },
      { t: 'p', text: 'This is how businesses run promotions that increase revenue and reduce profit at the same time, then conclude that the problem was volume.' },

      { t: 'h2', text: 'The conversion table worth pinning up' },
      {
        t: 'table',
        head: ['If your markup is', 'Your margin is actually'],
        rows: [
          ['10%', '9.1%'],
          ['20%', '16.7%'],
          ['25%', '20%'],
          ['33.3%', '25%'],
          ['50%', '33.3%'],
          ['75%', '42.9%'],
          ['100%', '50%'],
          ['150%', '60%'],
          ['233%', '70%'],
        ],
      },
      { t: 'p', text: 'Note the last row. To keep 70 percent of the sale price you have to charge more than three times what you paid. Businesses that want a 70 percent margin and apply a 70 percent markup end up with 41 percent and cannot work out why the year looks nothing like the plan.' },

      { t: 'h2', text: 'Going the other way: pricing from a target margin' },
      { t: 'p', text: 'Most people price by taking cost and adding a percentage. If you have a margin target, that method cannot hit it. Use this instead.' },
      { t: 'p', text: '**Price = cost divided by (1 minus the margin you want, expressed as a decimal).**' },
      { t: 'p', text: 'For a 40 percent margin on an item costing 1,000: 1,000 divided by 0.6, which is 1,667. Check it: you keep 667 on a 1,667 sale, which is 40 percent. If you had added 40 percent to cost you would have priced at 1,400 and kept 28.6 percent.' },
      { t: 'p', text: 'On a single item that gap is 267. Across a few thousand transactions a year it is the difference between a good year and a worrying one.' },

      { t: 'pull', text: 'Adding your target margin to cost will never produce your target margin. It produces a smaller one, every time, and the gap widens as the target rises.' },

      { t: 'h2', text: 'Three places this error hides' },
      {
        t: 'ol',
        items: [
          '**Discount authority.** If a supervisor can approve "up to 20 percent" and nobody has stated whether the floor is a margin or a markup, the limit means nothing.',
          '**Sales commission.** Commission paid on revenue rewards discounting. Commission paid on gross margin does not. The second is harder to calculate and worth the trouble.',
          '**Supplier negotiations.** A supplier offering "5 percent off" is offering a cost reduction, which moves your margin by less than five points. Convert it before deciding whether it is worth the larger order.',
        ],
      },

      {
        t: 'takeaways',
        items: [
          'Markup divides by cost. Margin divides by price. Margin is always lower.',
          'To hit a target margin, divide cost by one minus the margin. Do not add the percentage to cost.',
          'State explicitly whether discount limits are margin or markup, or the limit is meaningless.',
          'A supplier discount on cost moves your margin by less than the headline figure.',
        ],
      },

      {
        t: 'aside',
        title: 'How we handle this',
        text: 'Enterprise Compute holds cost and price against every item and shows the margin on the line as it is being discounted, so the floor is visible at the moment the decision is made rather than in a report a month later. Discounting beyond a set point is a separate permission from selling.',
        to: '/products/sales',
      },
    ],
  },

  {
    slug: 'what-an-item-actually-costs-you',
    pillar: 'numbers',
    title: 'What an item actually costs you, and why the invoice price is not the answer',
    excerpt:
      'Freight, duty, handling, finance and shrinkage all belong in the cost of a thing before you price it. A method for landed cost that does not require an accountant.',
    image: 'warehouseRacks',
    date: '2026-01-28',
    minutes: 10,
    author: 'finance',
    references: ['ias2'],
    body: [
      { t: 'p', text: 'Ask most business owners what a product costs them and they will read the figure off the supplier invoice. That number is the single largest component and it is almost never the whole cost. Everything omitted comes straight out of the margin you thought you had.' },
      { t: 'p', text: 'The accounting term is landed cost. The idea is older than the term: the cost of a thing is everything you spent to get it to the point where you could sell it.' },

      { t: 'h2', text: 'What belongs in it' },
      { t: 'p', text: 'The international accounting standard on inventories is specific about this. The cost of inventories comprises the purchase price, import duties and other non-recoverable taxes, transport and handling, and other costs directly attributable to bringing the goods to their present location and condition, with trade discounts deducted.[^ias2] Storage costs that are not necessary before a further production stage, administrative overheads and selling costs are excluded.' },
      { t: 'p', text: 'Translated into things you actually pay for:' },
      {
        t: 'table',
        head: ['Include', 'Exclude'],
        rows: [
          ['Supplier invoice, less trade discount', 'General office rent and administration'],
          ['Freight in, including the last leg to your door', 'Freight out to your customer, that is a selling cost'],
          ['Import duty and non-recoverable taxes', 'Recoverable VAT or equivalent'],
          ['Customs clearance and agent fees', 'Marketing and advertising'],
          ['Insurance in transit', 'Your own general insurance'],
          ['Handling and unloading', 'Routine storage once it is sellable'],
          ['Direct repackaging or labelling to make it sellable', 'Head office salaries'],
        ],
      },

      { t: 'h2', text: 'A worked example' },
      { t: 'p', text: 'Assumptions, all invented for the illustration: you import 500 units. Supplier invoice 1,000,000. Freight 180,000. Duty at 10 percent of invoice value, 100,000. Clearing agent 45,000. Transit insurance 15,000. Local haulage to your warehouse 30,000. Two days of casual labour to unload and label, 20,000.' },
      {
        t: 'table',
        head: ['Line', 'Amount'],
        rows: [
          ['Supplier invoice', '1,000,000'],
          ['Freight in', '180,000'],
          ['Import duty', '100,000'],
          ['Clearing agent', '45,000'],
          ['Transit insurance', '15,000'],
          ['Local haulage', '30,000'],
          ['Unloading and labelling', '20,000'],
          ['**Total landed cost**', '**1,390,000**'],
          ['**Landed cost per unit**', '**2,780**'],
        ],
      },
      { t: 'p', text: 'The invoice said 2,000 per unit. The real figure is 2,780, which is 39 percent higher. A business pricing at 2,800 believes it is making 800 a unit. It is making 20.' },

      { t: 'pull', text: 'Thirty nine percent of this item’s cost never appeared on the supplier’s invoice. Price from the invoice and you are not working on a thin margin, you are working on none.' },

      { t: 'h2', text: 'The allocation problem' },
      { t: 'p', text: 'A container rarely holds one product. Freight and duty have to be split across everything in it, and how you split matters.' },
      {
        t: 'ul',
        items: [
          '**By value** works when items are similar in density. Apportion freight in proportion to each line’s invoice value.',
          '**By weight or volume** is better when you are shipping both heavy cheap goods and light expensive ones. Allocating by value would load the freight onto the expensive item that barely occupies any space.',
          '**By unit count** is the crudest and only defensible when everything in the shipment is near enough identical.',
        ],
      },
      { t: 'p', text: 'Pick one, write it down, and apply it consistently. Switching method between shipments makes period-to-period comparison meaningless, which is worse than a slightly imperfect method applied the same way every time.' },

      { t: 'h2', text: 'The two costs almost nobody allocates' },
      { t: 'h3', text: 'Shrinkage' },
      { t: 'p', text: 'If you reliably lose two percent of a product to damage, theft or expiry, then you only ever sell 98 of every 100 you buy, and those 98 have to carry the cost of all 100. On the example above, two percent shrinkage moves the effective cost per sold unit from 2,780 to about 2,837. It belongs in your pricing even though it never belongs in the inventory valuation on your balance sheet.' },
      { t: 'h3', text: 'The cost of money' },
      { t: 'p', text: 'If you pay a supplier sixty days before a customer pays you, that money is tied up and not available for anything else. Where you are financing stock on an overdraft or a facility, the interest over the holding period is a genuine cost of selling the item. Businesses with long holding periods and thin margins are often running the entire operation for the benefit of their lender without having worked it out.' },

      {
        t: 'callout',
        tone: 'info',
        title: 'A quick test',
        text: 'Take your three best-selling products. Work out landed cost properly for each, including shrinkage. If any of them moves by more than ten percent against what you thought, your pricing across the whole range deserves an afternoon.',
      },

      {
        t: 'takeaways',
        items: [
          'Landed cost is the invoice plus everything spent getting the goods ready to sell.',
          'Freight out to a customer is a selling cost, not an inventory cost. Freight in is.',
          'Choose one allocation method for shared shipping costs and keep it.',
          'Shrinkage belongs in your pricing even though it is excluded from inventory valuation.',
          'If you pay suppliers long before customers pay you, the financing cost is real.',
        ],
      },

      {
        t: 'aside',
        title: 'How we handle this',
        text: 'Purchases in Enterprise Compute carry the additional cost lines on the receipt, allocated across the lines by value or by quantity, so the item cost that reaches the ledger and the margin calculation is the landed one rather than the invoice one. Adjustments for damage and expiry require a reason code, which is what makes shrinkage measurable rather than assumed.',
        to: '/products/purchase',
      },
    ],
  },

  {
    slug: 'profitable-but-broke',
    pillar: 'numbers',
    title: 'Profitable but broke: why the bank balance disagrees with the accounts',
    excerpt:
      'A business can be profitable on paper every month and still run out of money. The cash conversion cycle, explained with arithmetic rather than theory.',
    image: 'budgetPlanning',
    date: '2026-02-04',
    minutes: 9,
    author: 'finance',
    references: [],
    body: [
      { t: 'p', text: 'It is one of the more disorienting experiences in business. The accounts say you made money. The bank says you have none. Both are correct, and the gap between them has a name and a formula.' },
      { t: 'p', text: 'Profit is a measurement of performance over a period. Cash is a measurement of position at a moment. Growth widens the gap between them, which is why the dangerous time for a trading business is not the downturn. It is the boom.' },

      { t: 'h2', text: 'Where the money actually is' },
      { t: 'p', text: 'Three places, and you can usually find all your missing cash in them.' },
      {
        t: 'ol',
        items: [
          '**In stock.** You paid for it. It is sitting on a shelf. It is an asset, it is not money, and it does not pay wages.',
          '**With your customers.** You delivered, you invoiced, you recorded the revenue and the profit. They have not paid. The profit is real and the cash has not arrived.',
          '**Already gone to suppliers.** You paid on time, or in advance, before the goods earned anything.',
        ],
      },

      { t: 'h2', text: 'The cash conversion cycle' },
      { t: 'p', text: 'One number describes the whole problem: how many days pass between your money going out and your money coming back.' },
      { t: 'p', text: '**Cycle = days of stock held + days customers take to pay, minus days you take to pay suppliers.**' },
      { t: 'p', text: 'Worked through with invented but ordinary figures. You hold 60 days of stock. Customers pay in 45 days. You pay suppliers in 30 days.' },
      { t: 'p', text: '60 plus 45 minus 30 gives 75. For seventy five days, every sale is funded out of your own pocket.' },

      {
        t: 'callout',
        tone: 'warn',
        title: 'Why growth makes this worse',
        text: 'Each new order requires funding for 75 days before it returns. Double your order book and you double the amount of money you need to find up front. The orders are profitable. That is precisely what makes it dangerous, because nothing in the profit and loss account warns you.',
      },

      { t: 'h2', text: 'Putting a number on it' },
      { t: 'p', text: 'Assume you sell 2,000,000 a month at a 30 percent margin, so cost of sales is 1,400,000 a month, or roughly 46,700 a day.' },
      { t: 'p', text: 'At a 75 day cycle, you are funding about 3,500,000 of working capital at any moment. If you grow 50 percent, that becomes 5,250,000. You need to find another 1,750,000, and you need it before the extra profit arrives. This is how businesses with full order books fail.' },

      { t: 'h2', text: 'The three levers, in order of how hard they are' },
      { t: 'h3', text: 'Reduce days of stock' },
      { t: 'p', text: 'Usually the largest and most available saving, and almost always concentrated in a small number of slow lines. Rank every product by how many days of cover you are holding. The tail will surprise you, and the money tied up in it is money you already spent.' },
      { t: 'h3', text: 'Reduce days customers take to pay' },
      { t: 'p', text: 'Less about chasing and more about mechanics. Invoice the same day rather than at month end. Make the terms explicit before the sale rather than on the invoice. Agree a credit limit per customer and enforce it at the point of order, which is the only moment you have any leverage.' },
      { t: 'h3', text: 'Extend days you take to pay' },
      { t: 'p', text: 'Available, finite, and worth using carefully. Suppliers who feel strung along price it back in, and a reputation for slow payment eventually costs more than the financing it saved.' },

      { t: 'pull', text: 'Every day you remove from the cycle releases roughly one day of cost of sales in cash, permanently. On the figures above, ten days is 467,000 you no longer have to find.' },

      { t: 'h2', text: 'What to watch monthly' },
      {
        t: 'table',
        head: ['Measure', 'How to work it out', 'What it tells you'],
        rows: [
          ['Days of stock', 'Stock value divided by daily cost of sales', 'How much money is sitting on shelves'],
          ['Days to collect', 'Receivables divided by daily sales', 'Whether your terms are being observed'],
          ['Days to pay', 'Payables divided by daily cost of sales', 'How much supplier credit you are using'],
          ['Cycle', 'Stock days plus collection days minus payment days', 'Days of trading you are funding yourself'],
        ],
      },
      { t: 'p', text: 'Track the four every month on one line. The trend matters far more than the absolute number, and a cycle quietly lengthening over two quarters is the earliest honest warning most businesses ever get.' },

      {
        t: 'takeaways',
        items: [
          'Profit is a period measure, cash is a moment measure. Both can be right while disagreeing.',
          'Your missing cash is in stock, with customers, or already paid to suppliers.',
          'Cycle equals stock days plus collection days minus payment days.',
          'Growth increases the funding requirement before it increases the cash. Full order books are not safety.',
          'Removing one day from the cycle releases about one day of cost of sales, permanently.',
        ],
      },

      {
        t: 'aside',
        title: 'How we handle this',
        text: 'Because stock movement, sales and the ledger are one system in Enterprise Compute rather than three that get reconciled later, stock days, collection days and payment days are derived from the same records that produced the accounts. Credit limits are enforced when the order is taken rather than reported on afterwards, which is the only point at which the number is still useful.',
        to: '/products/reports',
      },
    ],
  },
]

export default NUMBERS_POSTS
