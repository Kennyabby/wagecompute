/* ============================================================================
   Pillar: money and compliance.
   ----------------------------------------------------------------------------
   Written for the owner or office manager who keeps the books without having
   trained for it. The test applied to every piece here: could someone follow
   it without already knowing the vocabulary.
   ========================================================================= */

export const MONEY_POSTS = [
  {
    slug: 'double-entry-explained-properly',
    pillar: 'money',
    title: 'Double-entry bookkeeping, explained properly, in one sitting',
    excerpt:
      'A five hundred year old idea that most people are taught badly. What debits and credits actually are, why every entry has two sides, and what the method is really for.',
    image: 'bookkeeping',
    date: '2026-01-07',
    minutes: 11,
    author: 'finance',
    featured: true,
    references: ['pacioli', 'ifrsFramework', 'coso'],
    body: [
      { t: 'p', text: 'Almost everyone who has encountered double-entry bookkeeping was taught it as a set of rules to memorise. Debits on the left. Credits on the right. Assets increase with debits. It is presented as arbitrary, it is remembered as arbitrary, and so it is forgotten.' },
      { t: 'p', text: 'It is not arbitrary. There is one idea underneath it, and once you have it the rules stop needing to be memorised because they become the only arrangement that makes sense.' },

      { t: 'h2', text: 'The one idea' },
      { t: 'p', text: 'Every business event is an exchange. Something comes in and something goes out, or something you own changes form. Money does not appear. It moves.' },
      { t: 'p', text: 'If you buy a laptop for cash, you did not simply lose cash. You converted cash into a laptop. Recording only the cash leaving describes half of what happened and leaves you unable to answer where it went.' },
      { t: 'p', text: 'Double entry is the discipline of writing down both halves, every time. That is the whole idea. Everything else is notation.' },

      { t: 'p', text: 'The method was first set out in print in 1494, in a mathematics textbook by Luca Pacioli describing what Venetian merchants were already doing.[^pacioli] It has survived five centuries of commercial change without needing revision, which is unusual for anything in business, and is worth a moment’s respect before dismissing it as bureaucracy.' },

      { t: 'image', name: 'accountantDesk', caption: 'The method predates the machinery by about five hundred years. What changed is the speed, not the principle.' },

      { t: 'h2', text: 'Debit and credit are directions, not judgements' },
      { t: 'p', text: 'This is where the teaching usually fails. Debit does not mean bad and credit does not mean good. They are not synonyms for decrease and increase. They are simply the names of the two sides: left and right.' },
      { t: 'p', text: 'Latin again: *debere* to owe, *credere* to entrust. In the merchant’s original ledger, the left column recorded what was owed to the business and the right what the business owed. The modern use is broader, but the shape survived.' },
      { t: 'p', text: 'The rule that makes it all work is that every entry has equal amounts on both sides. Not similar. Equal. If they are not equal, something has been recorded wrongly, and the system tells you immediately rather than at year end. That self-checking property is the actual invention.' },

      { t: 'h2', text: 'The five account types and the only rule you need' },
      { t: 'p', text: 'Everything a business records falls into one of five buckets.' },
      {
        t: 'table',
        head: ['Type', 'What it is', 'Increases with'],
        rows: [
          ['Assets', 'Things you own or are owed: cash, stock, equipment, customer debts', 'Debit'],
          ['Liabilities', 'Things you owe: suppliers, loans, tax due', 'Credit'],
          ['Equity', 'What the owners have put in and what has been retained', 'Credit'],
          ['Income', 'Value earned from trading', 'Credit'],
          ['Expenses', 'Value consumed in trading', 'Debit'],
        ],
      },
      { t: 'p', text: 'The underlying identity: **Assets = Liabilities + Equity**. Everything you have was funded either by someone you owe or by the owners. There is no third source. Every entry keeps that equation true, which is why both sides must match.' },

      { t: 'h2', text: 'Four entries, worked through' },
      { t: 'h3', text: 'The owner puts in 500,000' },
      { t: 'p', text: 'Cash increases, so debit Cash 500,000. The business now owes that to the owner, so credit Equity 500,000. Assets up 500,000, equity up 500,000, equation intact.' },
      { t: 'h3', text: 'You buy stock for 200,000 on credit' },
      { t: 'p', text: 'Debit Inventory 200,000. Credit Accounts Payable 200,000. No cash has moved at all, which is exactly the point: the obligation exists from the moment of the purchase, not from the moment you pay.' },
      { t: 'h3', text: 'You sell goods that cost 50,000 for 80,000 cash' },
      { t: 'p', text: 'This is two entries, and running them together is where most people go wrong.' },
      {
        t: 'ul',
        items: [
          'The sale: debit Cash 80,000, credit Sales Income 80,000.',
          'The cost: debit Cost of Sales 50,000, credit Inventory 50,000.',
        ],
      },
      { t: 'p', text: 'Record only the first and your revenue is right while your stock and your profit are both wrong. This single omission is the most common cause of accounts that look healthy and are not.' },
      { t: 'h3', text: 'You pay 30,000 rent' },
      { t: 'p', text: 'Debit Rent Expense 30,000, credit Cash 30,000. Value consumed, cash gone.' },

      { t: 'pull', text: 'Record the sale without recording the cost of what you sold, and the accounts will show a profit you did not make. It is the most common error in small business books, and the most expensive.' },

      { t: 'h2', text: 'What the method is actually for' },
      { t: 'p', text: 'Three things, none of which is tax.' },
      {
        t: 'ol',
        items: [
          '**It catches errors by construction.** Totals that do not match prove an error exists. No other record-keeping method tells you it is wrong without being checked against something else.',
          '**It preserves causation.** Every figure traces to the event that produced it. "Why is this number what it is" has an answer that is a document, not an opinion.',
          '**It separates timing from cash.** Recording obligations when they arise rather than when they are settled is what makes it possible to see that a profitable month consumed cash.',
        ],
      },
      { t: 'p', text: 'The conceptual framework underlying modern financial reporting lists faithful representation and verifiability among the characteristics that make financial information useful.[^ifrsFramework] Double entry is the mechanism by which an ordinary business achieves both without needing to think about it.' },

      { t: 'h2', text: 'Why it still matters when software does the entries' },
      { t: 'p', text: 'A reasonable objection: if the system posts the entries, why learn this?' },
      { t: 'p', text: 'Because you still have to be able to tell when it is wrong. Software posts what it is configured to post. If an item is mapped to the wrong account, or a discount is recorded as an expense rather than a reduction in revenue, the books will balance perfectly and describe something that did not happen. Balance is not accuracy. It only proves the two sides agree.' },
      { t: 'p', text: 'It also matters for control. The standard internal control frameworks are built on the idea that the person who records a transaction should not also be the person who authorises it and the person who holds the asset.[^coso] That separation only means something if there is a trail showing who recorded what, which is the other thing double entry gives you.' },

      {
        t: 'callout',
        tone: 'idea',
        title: 'If you remember one thing',
        text: 'Every event has two sides. If you can say what came in and what went out, you can record it. The debit and credit labels are just the names of the columns.',
      },

      {
        t: 'takeaways',
        items: [
          'Double entry records both halves of an exchange, which is why it catches its own errors.',
          'Debit and credit mean left and right. They do not mean bad and good.',
          'Assets equal liabilities plus equity. Every entry preserves that.',
          'A sale is two entries: the revenue and the cost of what was sold. Omitting the second invents profit.',
          'Balanced books are not accurate books. Balance proves arithmetic, not mapping.',
        ],
      },

      {
        t: 'aside',
        title: 'How we handle this',
        text: 'Enterprise Compute posts to a real double-entry general ledger as operations happen rather than reconstructing one at month end. A sale writes both the revenue and the cost of sale at the moment it completes, so the stock position and the profit figure cannot drift apart. Every posting keeps a link to the document that caused it, which is what makes the question "why is this number what it is" answerable.',
        to: '/products/journals',
      },
    ],
  },

  {
    slug: 'reading-a-profit-and-loss',
    pillar: 'money',
    title: 'How to read a profit and loss account without an accountant',
    excerpt:
      'Five lines, in order, and what each one is telling you. Plus the three places a statement can be technically correct and still mislead you.',
    image: 'financialAnalysis',
    date: '2026-03-04',
    minutes: 9,
    author: 'finance',
    references: ['ias2'],
    body: [
      { t: 'p', text: 'A profit and loss account answers one question: over a period, did trading leave you better off. It does it in a fixed order, and the order is the useful part, because each line strips something away and tells you a different thing about the business.' },

      { t: 'h2', text: 'The five lines, in order' },
      {
        t: 'steps',
        items: [
          { title: 'Revenue', text: 'What you earned from trading, before anything is deducted. Earned, not received. A credit sale counts here the day you deliver, not the day the customer pays.' },
          { title: 'Cost of sales', text: 'What the things you sold cost you. Only the things actually sold in the period, not everything you bought. Stock you still hold is an asset, not a cost.' },
          { title: 'Gross profit', text: 'Revenue minus cost of sales. The money your trading activity itself generates, before any of the cost of existing as a business.' },
          { title: 'Operating expenses', text: 'The cost of being open: rent, salaries, power, insurance, software, professional fees.' },
          { title: 'Operating profit', text: 'Gross profit minus operating expenses. Whether the business, as a business, works.' },
        ],
      },

      { t: 'h2', text: 'What each line answers' },
      {
        t: 'table',
        head: ['Line', 'The question it answers'],
        rows: [
          ['Revenue', 'Is demand there'],
          ['Gross profit', 'Is the pricing and buying right'],
          ['Gross margin percentage', 'Is that holding up over time'],
          ['Operating expenses', 'Is the overhead proportionate to the trade'],
          ['Operating profit', 'Does the whole thing work'],
        ],
      },
      { t: 'p', text: 'The most useful single figure is gross margin as a percentage, tracked month on month. It is where pricing errors, supplier price rises and quiet discounting all show up first, usually a quarter before anything is visible at the bottom.' },

      { t: 'h2', text: 'Three ways a correct statement misleads' },
      { t: 'h3', text: '1. Stock valued at what you paid, not what it is worth' },
      { t: 'p', text: 'Inventory is required to be carried at the lower of cost and net realisable value.[^ias2] In plain terms: if it will not sell for what you paid, it should be written down. Businesses that never write anything down carry dead stock at full value, which overstates both assets and profit. The write-down is painful once. Not taking it is painful every month, quietly.' },
      { t: 'h3', text: '2. Timing' },
      { t: 'p', text: 'A quarter that happens to contain an annual insurance payment will look worse than the two around it without anything having changed. Compare the same period year on year before concluding anything from a single month.' },
      { t: 'h3', text: '3. It says nothing about cash' },
      { t: 'p', text: 'A profit and loss account can show a healthy profit while the bank balance falls. That is not a contradiction and not an error. It is the difference between earning and collecting, and it is why this statement should never be read on its own.' },

      {
        t: 'callout',
        tone: 'info',
        title: 'The ten minute monthly review',
        text: 'Gross margin percentage against the same month last year. Operating expenses as a percentage of revenue, same comparison. Any single expense line that moved more than twenty percent. That is most of the value in most monthly reviews.',
      },

      {
        t: 'takeaways',
        items: [
          'Each line strips something away. The order is the point.',
          'Cost of sales covers what you sold, not what you bought.',
          'Gross margin percentage over time is the earliest warning you get.',
          'Stock that will not sell for what you paid should be written down.',
          'This statement says nothing about cash. Read it alongside the cash position.',
        ],
      },

      {
        t: 'aside',
        title: 'How we handle this',
        text: 'Because the ledger is written as trading happens, the statement in Enterprise Compute is available at any point in the month rather than three weeks after it ends, and every line can be opened to the transactions underneath it. A gross margin that moves is a list of sales you can read, not a figure you have to investigate.',
        to: '/products/reports',
      },
    ],
  },
]

export default MONEY_POSTS
