/* ============================================================================
   Pillar: explainers.
   ----------------------------------------------------------------------------
   Short reference entries for terms that get used in business conversation
   without ever being defined. Deliberately brief: three to five minutes, one
   idea, a worked figure, and done. They carry the internal linking that makes
   the longer pieces findable.
   ========================================================================= */

export const EXPLAINER_POSTS = [
  {
    slug: 'what-is-a-chart-of-accounts',
    pillar: 'explainers',
    title: 'What is a chart of accounts?',
    excerpt: 'The list of buckets every figure in your business gets sorted into, and why building it badly is hard to undo.',
    image: 'bookkeeping',
    date: '2026-04-29',
    minutes: 4,
    author: 'finance',
    references: ['ifrsFramework'],
    body: [
      { t: 'p', text: 'A chart of accounts is the list of categories your business sorts every transaction into. Think of it as the labelled drawers that everything gets filed in: one for sales, one for rent, one for the money customers owe you, and so on.' },
      { t: 'p', text: 'It is the most consequential thing in your bookkeeping that nobody thinks about, because every report you will ever run is just a different way of adding up those drawers.' },

      { t: 'h2', text: 'The five families' },
      {
        t: 'ul',
          items: [
          '**Assets.** What you own or are owed: cash, stock, equipment, customer debts.',
          '**Liabilities.** What you owe: suppliers, loans, tax due.',
          '**Equity.** What the owners put in, and what the business has retained.',
          '**Income.** What you earn from trading.',
          '**Expenses.** What you consume in trading.',
        ],
      },

      { t: 'h2', text: 'The two mistakes' },
      { t: 'p', text: '**Too few accounts.** One line called "general expenses" holding forty percent of your costs tells you nothing. You cannot manage a number you cannot see.' },
      { t: 'p', text: '**Too many.** Separate accounts for every supplier turns the ledger into a filing cabinet and makes reports unreadable. Suppliers belong in the partner records, not the chart.' },
      { t: 'p', text: 'The working test: if you would not act differently on seeing two figures separately, they do not need to be separate accounts.' },

      {
        t: 'callout',
          tone: 'idea',
          title: 'Design it around decisions',
          text: 'Start from the questions you want answered monthly. If you want to know what delivery costs you, delivery needs its own account. If you have never once wondered, it does not.',
      },

      { t: 'p', text: 'Changing a chart of accounts later is possible but it breaks comparison with prior periods, which is why it is worth an hour of thought at the start. Financial information is useful when it faithfully represents what happened and can be verified,[^ifrsFramework] and a chart that lumps unlike things together fails the first test before anyone has made an error.' },

      {
        t: 'takeaways',
          items: [
          'It is the list of categories everything gets sorted into.',
          'Five families: assets, liabilities, equity, income, expenses.',
          'Too few accounts hides problems. Too many hides the signal.',
          'If you would not act on the split, you do not need the split.',
        ],
      },
    ],
  },

  {
    slug: 'what-is-cost-of-goods-sold',
    pillar: 'explainers',
    title: 'What is cost of goods sold?',
    excerpt: 'What the things you sold cost you, as distinct from what you spent. The difference is where most profit errors live.',
    image: 'warehouseRacks',
    date: '2026-05-06',
    minutes: 4,
    author: 'finance',
    references: ['ias2'],
    body: [
      { t: 'p', text: 'Cost of goods sold is what the items you actually sold during a period cost you. Not what you bought during the period. Only what left.' },
      { t: 'p', text: 'That distinction is the whole thing, and getting it wrong is the most common cause of accounts that show a profit the bank account does not recognise.' },

      { t: 'h2', text: 'The formula' },
      { t: 'p', text: '**Opening stock + purchases during the period, minus closing stock.**' },
      { t: 'p', text: 'Worked through with invented figures. You start the month with 400,000 of stock. You buy 900,000. You end with 500,000.' },
      { t: 'p', text: '400,000 plus 900,000 minus 500,000 gives 800,000. That is your cost of goods sold, even though you spent 900,000. The extra 100,000 is still on the shelf, and it is an asset rather than a cost.' },

      { t: 'h2', text: 'Why it matters' },
      { t: 'p', text: 'Treat the full 900,000 as a cost and you understate profit in a month when you build stock, then overstate it in the month you run that stock down. Neither month tells you anything true about trading.' },
      { t: 'p', text: 'What goes into the cost figure is set by the inventories standard: purchase price, duties, transport, handling and the other costs of getting goods ready to sell.[^ias2] Not the cost of selling them, and not general overhead.' },

      {
        t: 'callout',
          tone: 'info',
          title: 'The quick check',
          text: 'Revenue minus cost of goods sold gives gross profit. Divide that by revenue for gross margin. If your gross margin swings sharply month to month without a pricing change, the usual cause is stock movement being recorded in the wrong period.',
      },

      {
        t: 'takeaways',
          items: [
          'It is what you sold, not what you bought.',
          'Opening stock plus purchases minus closing stock.',
          'Stock you still hold is an asset, not a cost.',
          'Erratic gross margin usually means a period cut-off problem.',
        ],
      },
    ],
  },

  {
    slug: 'what-is-a-reorder-point',
    pillar: 'explainers',
    title: 'What is a reorder point?',
    excerpt: 'The stock level at which you place the next order. One formula, two inputs, and the reason gut feel runs out at about thirty products.',
    image: 'warehouseForklift',
    date: '2026-05-13',
    minutes: 4,
    author: 'operations',
    references: [],
    body: [
      { t: 'p', text: 'A reorder point is the quantity at which you should place your next order, so that stock arrives before you run out.' },
      { t: 'p', text: 'Most businesses do this by feel. That works up to about thirty products and then quietly stops working, usually noticed as simultaneous stockouts on fast lines and overstocking on slow ones.' },

      { t: 'h2', text: 'The formula' },
      { t: 'p', text: '**(Average daily sales times lead time in days) plus safety stock.**' },
      { t: 'p', text: 'You sell 20 a day. Your supplier takes 10 days. You want 5 days of cover for the days they are late or demand spikes.' },
      { t: 'p', text: '20 times 10 gives 200, plus 100 of safety stock, for a reorder point of 300. When stock hits 300, you order.' },

      { t: 'h2', text: 'The input everyone gets wrong' },
      { t: 'p', text: 'Lead time is not what the supplier promises. It is what they actually deliver, measured. Use their quoted figure and your safety stock is absorbing their optimism rather than genuine variation.' },
      { t: 'p', text: 'Record the gap between order date and arrival date for a few months. Use the realistic figure, not the quoted one, and your stockouts will fall without holding more stock.' },

      {
        t: 'callout',
          tone: 'idea',
          title: 'Where safety stock should go',
          text: 'Not evenly. Put it where being out is expensive: fast movers, items customers will not wait for, and anything with an unreliable supplier. A slow line with a dependable supplier needs almost none.',
      },

      {
        t: 'takeaways',
          items: [
          'Average daily sales times real lead time, plus safety stock.',
          'Measure lead time rather than using the quoted figure.',
          'Concentrate safety stock where a stockout actually costs you.',
          'Gut feel stops working at around thirty products.',
        ],
      },
    ],
  },

  {
    slug: 'what-is-working-capital',
    pillar: 'explainers',
    title: 'What is working capital?',
    excerpt: 'The money tied up in running the business day to day, and why growing businesses need more of it than they expect.',
    image: 'businessFinance',
    date: '2026-05-20',
    minutes: 4,
    author: 'finance',
    references: [],
    body: [
      { t: 'p', text: 'Working capital is what you have tied up in the ordinary business of trading: stock on the shelves, money customers owe you, less money you owe suppliers.' },
      { t: 'p', text: '**Current assets minus current liabilities.** Current means expected to turn into or out of cash within a year.' },

      { t: 'h2', text: 'A worked example' },
      { t: 'p', text: 'Stock 3,000,000. Customers owe you 1,800,000. Cash 400,000. That is 5,200,000 of current assets.' },
      { t: 'p', text: 'You owe suppliers 2,100,000 and have 300,000 of tax due. That is 2,400,000 of current liabilities.' },
      { t: 'p', text: 'Working capital is 2,800,000. That is money the business needs in order to keep operating, and it is not available for anything else.' },

      { t: 'h2', text: 'Why growth consumes it' },
      { t: 'p', text: 'Sell more and you need more stock, and you are owed more by customers. Both go up before the extra profit arrives. A business growing quickly can need more working capital every month than it earns, which is why profitable companies run out of money.' },
      { t: 'p', text: 'This is the single most common way a business with full order books fails, and nothing in the profit and loss account gives you any warning.' },

      {
        t: 'callout',
          tone: 'warn',
          title: 'Too much is also a problem',
          text: 'Very high working capital usually means slow stock or customers who are not paying. It is not a sign of strength. It is money sitting still.',
      },

      {
        t: 'takeaways',
          items: [
          'Current assets minus current liabilities.',
          'It is money committed to trading, not money available.',
          'Growth increases the requirement before it increases the cash.',
          'A high figure often means slow stock or slow collection.',
        ],
      },
    ],
  },

  {
    slug: 'what-is-depreciation',
    pillar: 'explainers',
    title: 'What is depreciation?',
    excerpt: 'Spreading the cost of something you will use for years across the years you use it, rather than the month you bought it.',
    image: 'factoryFloor',
    date: '2026-05-27',
    minutes: 4,
    author: 'finance',
    references: [],
    body: [
      { t: 'p', text: 'Buy a delivery van for 12,000,000 and use it for five years. Recording the whole 12,000,000 as a cost in the month you bought it would make that month look catastrophic and the following fifty nine look better than they are.' },
      { t: 'p', text: 'Depreciation spreads the cost over the period you get the benefit. It is a timing mechanism, not a valuation.' },

      { t: 'h2', text: 'The simplest method' },
      { t: 'p', text: 'Straight line. **(Cost minus what you expect to sell it for) divided by the years of useful life.**' },
      { t: 'p', text: 'Van at 12,000,000, expected to be worth 2,000,000 after five years. 12,000,000 minus 2,000,000 is 10,000,000, divided by five, giving 2,000,000 a year as a cost.' },

      { t: 'h2', text: 'The two things people misunderstand' },
      { t: 'p', text: '**It is not cash.** No money moves when you record depreciation. The money left when you bought the van. This is why a business can show a loss and still have cash coming in.' },
      { t: 'p', text: '**It is not market value.** The figure on your books after three years is what is left of the original cost, not what the van would fetch. They are different numbers and there is no reason for them to agree.' },

      {
        t: 'callout',
          tone: 'info',
          title: 'What counts',
          text: 'Things you will use for more than a year and that have real value: vehicles, equipment, fittings, machinery. Not stock, which is a cost when sold, and not small items, which most businesses expense immediately under a stated threshold.',
      },

      {
        t: 'takeaways',
          items: [
          'It spreads a cost across the years of use.',
          'Straight line: cost minus residual, divided by useful life.',
          'No cash moves. It is not a payment.',
          'Book value is not market value and need not resemble it.',
        ],
      },
    ],
  },

  {
    slug: 'what-is-a-three-way-match',
    pillar: 'explainers',
    title: 'What is a three-way match?',
    excerpt: 'Checking the order, the delivery and the invoice against each other before paying. The oldest control in purchasing, and still the best.',
    image: 'warehouseWorker',
    date: '2026-06-03',
    minutes: 3,
    author: 'operations',
    references: ['coso'],
    body: [
      { t: 'p', text: 'A three-way match compares three documents before any money leaves: what you ordered, what arrived, and what you were invoiced for. If all three agree, pay. If they do not, find out why first.' },

      { t: 'h2', text: 'What each one is for' },
      {
        t: 'table',
          head: ['Document', 'What it proves'],
          rows: [
          ['Purchase order', 'That the purchase was authorised, at an agreed price'],
          ['Goods received note', 'That the goods actually arrived, in the quantity stated'],
          ['Supplier invoice', 'What the supplier believes they are owed'],
        ],
      },
      { t: 'p', text: 'Any two agreeing is not enough. Order and invoice agreeing proves nothing arrived. Delivery and invoice agreeing proves nobody authorised it.' },

      { t: 'h2', text: 'What it catches' },
      {
        t: 'ul',
          items: [
          'Invoices for goods that never came.',
          'Price increases applied quietly between order and invoice.',
          'Duplicate invoices, which is the most common honest error in payables.',
          'Entirely fictitious invoices, which rely on nobody checking against a delivery.',
        ],
      },
      { t: 'p', text: 'It also delivers separation of duties almost as a side effect: the person ordering, the person receiving and the person paying are usually different, and each one checks the others.[^coso]' },

      {
        t: 'takeaways',
          items: [
          'Order, delivery and invoice must all agree before payment.',
          'Any two agreeing is not enough.',
          'It catches duplicate invoices, quiet price rises and invented ones.',
          'It separates ordering, receiving and paying without extra effort.',
        ],
      },
    ],
  },
]

export default EXPLAINER_POSTS
