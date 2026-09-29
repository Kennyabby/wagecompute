// Content for the "Our Story" section on the About page — the same walkthrough
// published as the platform's detailed pitch document, told as one continuous
// story following one small business (and the sister business that joins it)
// through a single week, chapter by chapter through every module.
// Keep this in sync with the pitch document if either one changes.

const platformStoryContent = {
  intro: {
    kicker: 'Company and Product Overview',
    title: 'One system to run the business: sales, inventory, people, money, and an assistant that knows your real data.',
    lede: 'Enterprise Compute Central is an all in one ERP and point of sale platform. It brings HR, payroll, inventory, sales, purchasing, accounting, and Epsilon (a built in assistant) into one real time system that keeps working online or offline.',
    paragraphs: [
      'Most growing businesses (retail chains, restaurants, hospitality operators, distributors, service companies) end up running on a patchwork of tools that don’t talk to each other: a point of sale system that has nothing to do with the accounting software, a separate payroll tool, a spreadsheet for inventory, and a bookkeeper who re-types everything into a ledger days or weeks after the fact. Sales happen in one system, stock moves in another, and the books catch up whenever someone finds the time.',
      'On top of that, a large share of the world’s commerce happens where the internet isn’t guaranteed: a busy retail floor, a warehouse with poor signal, a front desk during an outage. Most cloud based ERP and POS software simply stops working the moment the connection drops. For a business whose income depends on being able to sell, that’s a real risk to the day’s revenue, not a small inconvenience.',
      'Enterprise Compute Central is built around one decision that shapes everything else in it: every operational transaction, a sale, a purchase receipt, a stock adjustment, a payroll run, an asset purchase, works out and posts its own General Ledger entries the moment it happens. The books are never a separate job someone does later by hand; they are a direct, computed result of the business actually running.',
      'The platform is delivered as a modern, multi tenant, subscription web application, and, less common in this space, also as a full desktop application that keeps working with no internet at all. Both run the same modules, the same accounting engine, and the same permission model.',
    ],
    pillars: [
      { num: '01', title: 'One product, not five', body: 'Point of sale, inventory, purchasing, HR, payroll, and accounting are built as one system, not stitched together from separate ones.' },
      { num: '02', title: 'Real time, all the time', body: 'Every screen updates live as transactions happen, and every document posts its own ledger entries instantly, not on a delay.' },
      { num: '03', title: 'Keeps working offline', body: 'The desktop edition keeps selling with no internet at all, then syncs safely once the connection comes back.' },
      { num: '04', title: 'An assistant that knows your data', body: 'Epsilon understands each business’s own operational and financial data, not just general software questions.' },
      { num: '05', title: 'Books you can actually trust', body: 'Every posting is tied to one exact source document and can never be duplicated, so nothing gets counted twice or quietly lost.' },
      { num: '06', title: 'Access that matches the job', body: 'Fine grained permissions and approval steps mean people can do what their role needs, without an all or nothing admin switch.' },
    ],
  },

  chapters: [
    {
      id: 'dashboard',
      kicker: 'The Dashboard',
      title: 'The one screen that answers "how are we doing" honestly',
      lede: 'It is Monday, nine in the morning, and Amara, who owns a small chain of three restaurants, opens her laptop before she has spoken to a single member of staff.',
      paragraphs: [
        'The dashboard is already waiting for her, the first screen anyone at the business sees on logging in, and one every single employee gets for free, whether or not the business has paid for any other module yet. The weekend’s revenue is already sitting on the screen, next to cost of goods sold, gross profit, total expenses, and net profit, the small handful of key performance indicators that answer "how are we doing" at a glance, pulled together from every operational corner of the business at once.',
        'Amara has been burned before by a dashboard that told her one story while her accountant’s real reports told her another, so before she trusts the number on screen, she checks it against the Profit and Loss statement for the same period. The numbers match, exactly. That is not a coincidence. The dashboard’s revenue, cost, and profit figures are pulled from the very same accounting engine that produces the official report, on purpose, specifically so the two screens can never quietly drift apart from each other.',
        'She scrolls down. Her busiest restaurant shows a stock warning: a popular product is running low there specifically. She also notices a till session from Sunday night still shows as open. Further down, the dashboard shows which products are moving the most, which are earning the most, and a running mix of where revenue is really coming from.',
        'While she is still looking at the screen, a sale happens at one of her other locations. She does not refresh the page; the number simply updates, wired into the same real time connection that keeps every other screen current.',
        'Two things on that one screen are bothering her now, a stuck session and a low stock warning, both at the same restaurant. She grabs her keys.',
      ],
      whyMatters: 'For a business owner, this is the difference between a dashboard that is a nice looking summary and one that is an honest, live reflection of the actual business, provably consistent with the real books behind it.',
      bridge: 'By the time Amara pulls into the car park, the lunch rush has already started, and one of her cashiers is in the middle of a very complicated Friday that is still catching up with her.',
    },
    {
      id: 'sales-pos',
      kicker: 'Point of Sale, Sales and Delivery',
      title: 'Where the money actually changes hands',
      lede: 'Amara walks in to find Tola, one of her longest serving cashiers, still catching her breath from Friday night, the same night that left a session sitting open on Amara’s dashboard that morning.',
      paragraphs: [
        'Tola explains what happened. She opened her till on Friday with a cash count, the way she does every shift. She does not have permission to see what other cashiers were doing that night, only her own session, because Amara set her access up that way from the start. What she could do was ring sales fast, including a table’s order split across a card and a cash payment, each part quietly mapped to the right account behind the scenes. Then, at half past seven, the internet dropped.',
        'Tola had not even noticed anything was wrong. The till kept taking orders exactly as before, because a sale is queued the instant it is rung up whether or not the connection is there to send it anywhere. Forty minutes later, everything she had rung up during the outage synced on its own. Because each sale carries its own fingerprint, a sale her screen retried sending twice was recognized as the same sale and quietly discarded rather than counted again.',
        'Every one of those sales, instant or delayed, had already written its own correct accounting entry the moment it was saved: revenue credited, each payment method debited correctly, and any unpaid portion booked straight to the customer’s running balance.',
        'At half past ten, a delivery rider finally dropped off an order that had left the kitchen forty minutes earlier. Until that moment, that sale was only a promise of revenue, not real revenue, because delivery is simply a status on the very same sale, and revenue only counts the instant that status flips to delivered.',
        'At eleven, Tola closed her session and came up short by an amount that did not immediately make sense. That shortage was not written off. It was recorded, categorized, and attributed specifically to Tola’s session, so both she and her manager knew exactly what was unaccounted for before she left for the night. In the weeks ahead, as she pays part back in cash and the rest is deducted from her pay, both recoveries are tracked against that exact original shortage, never counted as a fresh sale.',
        'Amara mentions, almost in passing, that her sister Ifeoma runs her small hotel a similar way, except once a month rather than once a shift, since a lounge two doors down from Ifeoma’s front desk works out exactly what each regular still owes for the use of its shisha area, carrying forward what was not paid last month, recorded together in one step.',
      ],
      whyMatters: 'For a business owner, this is the difference between finding out how a chaotic night actually went the next day, from a spreadsheet, and knowing it the moment the last till closes, correct to the naira.',
      bridge: 'Satisfied that Friday’s chaos is fully accounted for, Amara turns to the real reason a popular product ran low here in the first place, and picks up her phone to call Chidi, who runs her warehouse across town.',
    },
    {
      id: 'inventory',
      kicker: 'Inventory, Warehousing and Production',
      title: 'Knowing exactly what you have, right now',
      lede: 'Chidi, who runs the warehouse that feeds all three of Amara’s restaurants, is still on the phone with her about Friday’s shortage when a second call comes in, a corporate customer asking whether there are 200 bags of rice in stock, right now.',
      paragraphs: [
        'He gives the customer a real answer, not a guess. There is no separate "current stock" figure sitting on a product that could have drifted out of step with reality. Every receipt, sale, transfer, damage, and production movement is its own transaction record, and the figure on Chidi’s screen is simply the sum of every one of those records at the moment he looks.',
        'Back on the line with Amara, Chidi agrees to send fifty cases to her main road restaurant. He raises a transfer request, and it sits there until whoever the business has designated to approve transfers clears it. Only then does the stock actually move. This is the one place on the entire platform where that approval is checked a second time, independently, by the server itself, inside the same all or nothing operation that physically moves the stock, so the same approved transfer can never be posted twice even if two people try to finalize it in the same instant.',
        'Later that week, a team counts the warehouse shelf by shelf. The count does not match what the system expects. Chidi gets a full breakdown: opening quantity, every movement since, and the actual gap in both quantity and cost. Recording the count is one step; deciding whether to adjust the books or treat it as a real shortage is a separate, deliberate decision. When it genuinely is a shortage, it becomes a real balance owed by the staff responsible, recoverable gradually through cash or a payroll deduction.',
        'That evening, the bakery attached to the main road restaurant turns flour and sugar into two hundred loaves of bread. The system checks every ingredient is available before allowing the run, values what went in at its real average cost, and spreads that cost across what came out, with any genuine difference booked as its own variance line rather than hidden.',
        'Hanging up with Amara at last, Chidi notices something else: the flour and sugar he just used tonight have not been reordered in weeks.',
      ],
      whyMatters: 'The warehouse transfer’s independent server side check is a concrete example of the platform doing the hard, careful thing in exactly the one place where a race between two people would otherwise cause real financial damage.',
      bridge: 'First thing the next morning, a supplier’s truck pulls up outside Chidi’s warehouse anyway, on schedule, with exactly the flour and sugar he was about to go looking for.',
    },
    {
      id: 'purchasing',
      kicker: 'Purchasing, Customers and Vendors',
      title: 'One real record behind every purchase, and a real ledger behind every relationship',
      lede: 'The supplier’s truck that pulls up outside Chidi’s warehouse the next morning unloads forty cartons of flour and sugar. The invoice for them will not arrive for another week.',
      paragraphs: [
        'Chidi’s team receives the delivery anyway, because receiving and pricing are genuinely two different jobs. What gets created is one real purchase record, not three separate documents that could disagree, moving through a clear stage: raised, then received, printable at any point as a plain purchase order, a quantity only goods received note, or, once payment starts, a full invoice. Receiving is posted inside one all or nothing operation together with the matching stock movement.',
        'That same week, Amara’s business also pays its landlord for the warehouse, a cost that has nothing to do with cartons at all. That runs through a second, separate path, a vendor bill, posting straight to what is owed without inventing a fake inventory item.',
        'Because a supplier can be set up with its own dedicated account, the business also runs a built in check, on demand, comparing that supplier’s own running balance against what the ledger itself shows, catching the kind of quiet mismatch that would otherwise only surface during an audit.',
        'On the other side of the same business, a corporate customer, the one who called Chidi about the rice, has turned her question into a formal order about to become an invoice. Every customer and vendor carries a real, drillable ledger, with an aging report that sorts what is owed by exactly how overdue it is, current, 30, 60, 90 days and beyond.',
        'Before Chidi even thinks to ask what needs reordering next, a suggestion is already waiting for him, built from the same reorder calculation that powers Amara’s dashboard, so the two can never disagree.',
        'Word of how smoothly all of this runs has already travelled further than Chidi’s warehouse. Amara’s sister Ifeoma, who runs a small hotel two streets from the main road restaurant, has finally decided to move her own business onto the same platform.',
      ],
      whyMatters: 'The built in reconciliation check is a good example of engineering discipline: rather than assuming a computed balance can never drift, the platform ships a way to independently verify it.',
      bridge: 'Ifeoma’s first real test of her new hotel software arrives sooner than she expects, in the form of a wedding party booking three rooms for the weekend.',
    },
    {
      id: 'accommodations',
      kicker: 'Accommodations',
      title: 'Room and stay billing, done properly',
      lede: 'Ifeoma’s new front desk software gets its first real test almost immediately: a family books three rooms at her hotel for a wedding weekend.',
      paragraphs: [
        'The instant Ifeoma’s receptionist saves the booking, guest, dates, arrival and departure times, and all three rooms together, the full charge is already booked, both to revenue and to the family’s running balance.',
        'On Friday night the family pays half in cash. On Saturday, more by transfer. On Sunday, the last payment slightly overshoots the balance because they round up. Ifeoma’s receptionist does not have to keep a running tally in her head; the balance still owed is always worked out fresh from the complete payment history, and the small overpayment is booked as a deposit owed back, never forced into an impossible negative debt.',
        'On Saturday evening, the same family also runs a bar tab, unrelated to their rooms. That runs through the same Point of Sale workflow Tola relies on across town, its own separate process. What connects the two is a shared ledger and shared reports, so by Monday Ifeoma sees one true financial picture even though rooms and bar tab were recorded through two different, purpose built paths.',
        'Ifeoma remembers Amara mentioning something similar but not identical, a lounge near her own hotel that bills its regulars a fixed monthly charge for the use of a space rather than a guest stay, a Sales and Point of Sale feature, not Accommodations.',
      ],
      whyMatters: 'Every kind of charge, however it is structured, resolves into the same real, computed ledger, rather than a bolt on spreadsheet sitting next to the accounting system.',
      bridge: 'On the phone with Amara that evening, Ifeoma half jokes that between her hotel and the restaurants, the two of them really ought to just buy a van.',
    },
    {
      id: 'assets-expenses',
      kicker: 'Fixed Assets and Operating Expenses',
      title: 'Everything a business owns and spends, accounted for properly',
      lede: 'Ifeoma’s half joke turns out not to be a joke at all. By Tuesday, Amara has actually gone and bought a delivery van, and the same afternoon, one of her drivers pays for a tank of fuel out of his own pocket and asks to be paid back.',
      paragraphs: [
        'Both are real money leaving the business, but nothing alike. The van gets recorded as a draft first: its cost, expected useful life, and how it should depreciate, spreading its cost across the years it is actually used rather than treating the whole purchase as one expense on day one. Amara chooses straight line, an equal amount written off every period, over reducing balance or no depreciation at all.',
        'A year later, one depreciation period will already be posted and will stay posted, never silently recalculated, and the platform will not let the same period post twice. Years after that, disposal will work out the real gain or loss against what the van was actually still worth on the books, and once disposed, it cannot be disposed of again.',
        'The driver’s fuel receipt is settled that same afternoon as a single, straightforward record, category, amount, how it was paid, posted the moment it is saved, landing in whichever account the category maps to.',
        'By the end of the week, between the shortage, the transfer, the flour and sugar delivery, the vendor bill, the wedding party’s payments, and now a van and a fuel receipt, Amara’s accountant has a genuinely busy month to close out properly.',
      ],
      whyMatters: 'Assets get the careful, stateful life cycle a real asset register needs, while routine expenses stay simple and fast.',
      bridge: 'At month end, all of it lands on the desk of Uche, the accountant who has kept Amara’s books straight since her very first restaurant opened.',
    },
    {
      id: 'accounting',
      kicker: 'Accounting and the General Ledger Engine',
      title: 'The part everything else is really built around',
      lede: 'Uche sits down at month end to prepare the Trial Balance, and this month has not been a quiet one.',
      paragraphs: [
        'In just the last few weeks, this business took sales through a power cut, moved fifty cases between two locations, found a real shortage, turned flour and sugar into bread, received forty cartons before the invoice arrived, paid a vendor bill for rent, and bought a delivery van. None of those events were left waiting to be turned into accounting entries after the fact. Every one had its own dedicated logic work out exactly which accounts should move, the instant it happened, always as a balanced debit and credit pair.',
        'Uche’s next worry is whether any of that got counted twice, especially the sale during Friday’s power cut. It did not. Every automatic posting is tied to the exact source event that produced it, so a retried request during that outage is recognized as the one already posted, never a duplicate.',
        'The Trial Balance is not recomputed from the beginning of history every time. Each month end, a snapshot of every account’s balance is built forward from the month before. Once Uche is satisfied a month is settled, he can lock it, blocking any new posting on or before that date. If something later turns up that would have changed an already closed month, the platform flags it for review automatically.',
        'The Trial Balance, Balance Sheet, and Profit and Loss statement are all built from the same real ledger entries, with every balance drilling straight down to the individual postings behind it, Friday’s sale, the transfer, the van, each one findable.',
        'Uche closes the month satisfied, but one thing is still outstanding: payday for everyone at the business, including Tola, is due any day now.',
      ],
      whyMatters: 'This computed ledger approach removes, by construction, the usual integration burden between a point of sale system and an accounting package.',
      bridge: 'With the books closed, it is finally time for Ngozi, who runs payroll for the business, to work out exactly what everyone is owed.',
    },
    {
      id: 'payroll',
      kicker: 'People, Attendance and Payroll',
      title: 'Paying people correctly, every time, without a separate spreadsheet',
      lede: 'Payday is tomorrow, and Ngozi, who runs payroll for Amara’s business, has three people on her list who are not going to be simple, starting with Tola.',
      paragraphs: [
        'Tola is still working off the shortage from Friday night. Chidi is owed a bonus for a genuinely difficult week. A third employee missed four days this month. Ngozi starts from the attendance batch for this period and enters everything else it needs to account for, all recorded per employee, in one place, rather than scattered across an attendance sheet, an IOU notebook, and a shortage list.',
        'From that one batch, the platform works out exactly what each person is owed. Gross pay comes from salary and attendance together; total deductions are added up separately. For Tola, net pay can never be pushed below zero, because recovery is always capped at that period’s gross pay; whatever is still outstanding carries forward to the next period rather than the business clawing back more than she earned. What is recovered is split proportionally across debt, shortage, and any penalty, so the books always add up to exactly what was deducted.',
        'By the time Ngozi is done, payslips are ready for everyone, and an appointment letter for a new hire, all carrying the business’s real name, address, and logo, pulled live from the company’s own profile. The shortage recovered through Tola’s deduction lands in precisely the same account a direct cash recovery would have, so it is never counted twice.',
      ],
      whyMatters: 'This turns payroll from a monthly exercise in cross referencing three separate lists into one connected calculation that is correct the first time, for every employee.',
      bridge: 'That night, back at the restaurant, Tola opens Epsilon on her phone with one question on her mind: what exactly was taken out of her pay.',
    },
    {
      id: 'epsilon',
      kicker: 'Epsilon, the Built in Assistant',
      title: 'An assistant that actually knows the business it is talking about',
      lede: 'Tola asks Epsilon, out loud, using her voice, exactly what was taken out of her pay this month.',
      paragraphs: [
        'Epsilon supports genuine two way conversation, including a hands free mode built for someone standing at a counter rather than a keyboard, with both listening and speaking happening entirely inside her own browser; no audio is ever sent anywhere. But this particular question, it tells her plainly, it cannot answer for her directly. Payroll figures and personal debt are restricted to admin access, even through Epsilon, and it says so honestly, pointing her to her manager or Ngozi instead.',
        'What it can help with is the till that will not close properly. Epsilon has real, grounded knowledge of both how the platform works and, within her own access, the business’s real data, so it diagnoses her actual problem directly.',
        'Across town, Chidi has been meaning to sit down and work out next month’s reorder. Epsilon can already propose the real action itself, a draft purchase order, vendor matched, priced, and dated, shown as an editable card he can adjust before deciding anything. He runs it, and it becomes a real purchase record. Nothing happens on its own; Epsilon proposes, a person confirms.',
        'Amara, checking in before bed, asks Epsilon for this month’s report and gets back one of the platform’s own real reports, generated on demand, in the same shape the report screens themselves produce.',
        'Every conversation is billed on real, metered usage, converted transparently into the business’s own balance, never a flat allowance that quietly erodes as usage grows. A faster, cheaper model answers simple turns like Tola’s, and the platform only calls in a stronger model for turns that genuinely need one, like drafting Chidi’s purchase order. The platform’s own operators can see real margin, what was actually spent against what was actually charged, tenant by tenant.',
      ],
      quote: 'Epsilon exists to answer the two questions every operator ends up asking all day: how do I do this, and what does my own business’s data actually say right now, without waiting on a manual, a training session, or a report that is already a day old.',
      whyMatters: 'Epsilon is a second, genuine revenue line with real, computed margin, and a capability, drafting a real purchase order for a human to confirm, that most competitors in this space are not built to match without starting over.',
      bridge: 'That same careful line between what Tola can see and what only an admin can see is not something Epsilon invented on its own. It is built on a much larger set of rules that shape everything Amara’s business does on the platform.',
    },
    {
      id: 'security',
      kicker: 'Security, Access and How the Platform is Put Together',
      title: 'Control, trust, and the architecture underneath it',
      lede: 'It is Friday evening, one week after the night that started all of this, and Amara sits down to make sense of everything that just happened, and everything that let it happen safely.',
      paragraphs: [
        'She thinks first about Tola, who could ring a sale and close her own till, but never had access to see what any other cashier was doing. An admin chooses from a large, specific set of individually assignable rights, close to sixty of them, covering module access, everyday actions, and approval authority. Amara gave her store managers exactly the one right that matters for their jobs, and nothing that touches payroll at all.',
        'She thinks next about Ifeoma. Her hotel runs on the exact same servers and database software as Amara’s restaurants, yet the two businesses could never see a naira of each other’s money. Each business, or tenant, runs in its own real, separate database, selected the moment a request arrives from which business’s address it came in on, with every login cross checked against that same business on every request.',
        'A few specific things could never be quietly abused, even by someone inside the business. Nobody but an admin can change a person’s login status or permissions, even on their own account. Nobody but an admin can restructure the chart of accounts. The number of people allowed to use Epsilon is capped the moment access would actually be switched on for someone.',
        'She thinks about Chidi’s warehouse transfer, the one safeguard on the whole platform built to survive a genuine race between two people, checked a second time by the server itself inside the same operation that moves the stock.',
        'She thinks about the month Uche just closed and locked, about the internet outage at the main road restaurant that barely mattered because the platform runs both as a cloud application and a full offline desktop application on the same modules and engine, and about the separate, internal console, reachable by nobody at any customer business, where the platform’s own operators manage tenants like Ifeoma’s hotel, subscriptions, and Epsilon seats.',
        'Satisfied, Amara opens her laptop one more time and pulls up the dashboard, the very first screen this whole week began with. This time, every number on it already makes sense.',
      ],
      whyMatters: 'A real per tenant database, a real session revocation model, and a real transactional safeguard on the one workflow where a race condition would cause actual financial damage are concrete evidence of engineering maturity, not a line on a slide.',
      bridge: 'Amara’s week, and her sister’s, is one small, real example of what this platform is built to do.',
    },
  ],

  closing: {
    kicker: 'Why It Matters',
    title: 'Why a business adopts it',
    table: {
      headers: ['Without Enterprise Compute Central', 'With Enterprise Compute Central'],
      rows: [
        ['Point of sale, inventory, payroll, and accounting are separate tools that have to be reconciled by hand.', 'One system; every transaction posts its own correct ledger entries the instant it happens.'],
        ['Financial reports are only as current as the last manual bookkeeping pass.', 'Trial Balance, Balance Sheet, and Profit and Loss are computed from real, current ledger entries, with drill down to every posting.'],
        ['An internet outage stops the till.', 'Sales keep being taken straight through a network outage and sync safely once reconnected.'],
        ['Routine access decisions bottleneck on a single admin.', 'A large, specific set of assignable rights lets staff do exactly what their role requires.'],
        ['New staff need training material and a manual for basic questions.', 'Epsilon answers instantly, grounded in the platform’s real documentation and the tenant’s own data.'],
      ],
    },
  },
}

export default platformStoryContent
