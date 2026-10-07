/* ============================================================================
   Pillars: decisions, and growth and strategy.
   ----------------------------------------------------------------------------
   The vendor-selection piece is the one with the clearest conflict of
   interest, since we are a vendor. It is written to be genuinely usable
   against us, which is the only way it is worth publishing at all.
   ========================================================================= */

export const BUSINESS_POSTS = [
  {
    slug: 'when-a-spreadsheet-stops-being-enough',
    pillar: 'decisions',
    title: 'When a spreadsheet stops being enough',
    excerpt:
      'Spreadsheets are excellent and most businesses keep using them well past the point where they are costing real money. Seven signs, and what to do about each.',
    image: 'laptopCharts',
    date: '2026-02-18',
    minutes: 9,
    author: 'editorial',
    featured: true,
    references: ['coso'],
    body: [
      { t: 'p', text: 'A spreadsheet is one of the best pieces of software ever made. It is flexible, immediate, requires no project, and a competent person can model almost any business in an afternoon. Most businesses should start there, and a surprising number should stay there longer than vendors would like.' },
      { t: 'p', text: 'But there is a point where it turns from an asset into a liability, and the transition is gradual enough that it is usually missed. Here is how to tell.' },

      { t: 'h2', text: 'The seven signs' },
      {
        t: 'ol',
          items: [
          '**Two people cannot work at once without a conversation first.** The moment coordination is required to avoid overwriting each other, the file has become a bottleneck with a person attached.',
          '**There is a version with a name like "final v3 (use this one)".** Ambiguity about which copy is authoritative is the point at which the records stop being records.',
          '**You cannot tell who changed a figure, or when.** Spreadsheets are not designed to attribute. Where money is involved, that is a control problem rather than an inconvenience, since the basic internal control frameworks assume you can tell who did what.[^coso]',
          '**The same fact is typed in more than one place.** Entering a sale into a sales sheet, a stock sheet and an accounts sheet guarantees that the three will disagree. It is not a discipline problem, it is arithmetic.',
          '**Month end takes longer than it did last year.** Reconstruction work scales with history. If closing is getting slower while the business is not getting more complex, the method is the cause.',
          '**One person is the only one who understands it.** A model only its author can maintain is a business continuity risk wearing a productivity disguise.',
          '**You have stopped asking questions because answering them is too much work.** The most expensive sign, because it is invisible. Decisions get made on instinct, not because instinct was chosen but because the alternative was three hours of work.',
        ],
      },

      { t: 'pull', text: 'The real cost is rarely the errors. It is the questions you quietly stop asking because finding out is too much trouble.' },

      { t: 'h2', text: 'What to do that is not "buy software"' },
      { t: 'p', text: 'Several of these have fixes that cost nothing, and they are worth exhausting first.' },
      {
        t: 'table',
          head: ['Sign', 'Cheapest fix'],
          rows: [
          ['Concurrent editing', 'Move the file to a cloud office suite with real co-editing and version history'],
          ['Version ambiguity', 'One canonical location, one file, no copies, enforced socially'],
          ['No attribution', 'Version history gets you part of the way. Only part'],
          ['Duplicate entry', 'One sheet as the source, everything else referencing it rather than repeating it'],
          ['Slow close', 'Separate the record-keeping from the reporting. Stop rebuilding history every month'],
          ['Single point of knowledge', 'Documentation and a second person who has actually run it'],
          ['Unasked questions', 'This one does not have a cheap fix. This is the one that means it is time'],
        ],
      },

      { t: 'h2', text: 'The honest threshold' },
      { t: 'p', text: 'There is no transaction count at which a business must change systems. The useful test is different: work out roughly how many hours a month go into maintaining the spreadsheets, reconciling disagreements between them, and answering questions that should be immediate. Put a cost on those hours at what the people doing them are worth. Compare that to what a system would cost, including the time to move.' },
      { t: 'p', text: 'For a lot of businesses the honest answer is that the spreadsheet is still cheaper, and anyone selling you something should be willing to say so. For others the comparison is not close, and has not been for two years.' },

      {
        t: 'callout',
          tone: 'info',
          title: 'Before you move anything',
          text: 'Whatever you move to, your data has to go with you. Find out what an export looks like before you commit, not after. A system you cannot leave is a system that has stopped having to earn your business.',
      },

      {
        t: 'takeaways',
          items: [
          'Spreadsheets are genuinely good. The question is cost, not virtue.',
          'Duplicate entry guarantees disagreement. It is arithmetic, not discipline.',
          'Attribution is the thing spreadsheets structurally cannot give you.',
          'The expensive symptom is the questions you have quietly stopped asking.',
          'Cost the hours honestly. Sometimes the spreadsheet still wins.',
        ],
      },
    ],
  },

  {
    slug: 'questions-to-ask-any-software-vendor',
    pillar: 'decisions',
    title: 'Twelve questions to ask any software vendor, including us',
    excerpt:
      'A buyer’s checklist written by a vendor. The questions that are uncomfortable to answer are the ones worth asking, so they are all here.',
    image: 'consultation',
    date: '2026-04-08',
    minutes: 10,
    author: 'editorial',
    references: ['awsShared', 'iso27001', 'nist80034'],
    body: [
      { t: 'p', text: 'We sell business software, so treat this accordingly. It is published because a checklist that avoids the questions awkward for us would be worthless, and because we would rather be chosen by someone who asked them.' },
      { t: 'p', text: 'Ask all twelve. Of everyone, including us.' },

      { t: 'h2', text: 'About leaving' },
      {
        t: 'ol',
          items: [
          '**If I leave in two years, exactly what do I get back, in what format?** The answer should be specific. "A full export" is not specific. Ask whether it includes historical transactions, attachments, and the links between records, or only current balances.',
          '**Is there a charge for that export, and how long does it take?** Both answers should be "no" and "quickly". Neither always is.',
          '**What happens to my data if I stop paying?** How long is it retained, is it accessible read-only, and when is it deleted.',
        ],
      },

      { t: 'h2', text: 'About the money' },
      {
        t: 'ol',
          items: [
          '**What is the total for three years, including implementation, training, support and every per-user or per-transaction charge?** Annual licence cost is rarely the largest number.',
          '**What triggers a price increase, and what is the notice period?** Uncapped annual increases on a system you cannot easily leave is a position worth understanding before you are in it.',
          '**What is not included?** Ask for the list of modules, limits and support tiers that cost extra. There is always one.',
        ],
      },

      { t: 'h2', text: 'About when it goes wrong' },
      {
        t: 'ol',
          items: [
          '**If someone deletes three months of records and nobody notices for six weeks, what can you restore?** This is the single most revealing question on the list. It tests backup retention, not backup existence, and it is where the shared responsibility division becomes concrete.[^awsShared]',
          '**What is your recovery time objective and recovery point objective?** If those terms draw a blank, that is itself the answer. They are standard planning terms.[^nist80034]',
          '**When did you last have an outage, how long, and what did you tell customers?** Everyone has outages. What distinguishes suppliers is whether they will tell you about them.',
        ],
      },

      { t: 'h2', text: 'About the fit' },
      {
        t: 'ol',
          items: [
          '**Can I see it doing my specific awkward thing?** Not the demo script. The thing your business does that you suspect is unusual. Insist on seeing it, with your data if possible.',
          '**Who else like me uses this, and may I speak to one of them without you present?** The second half of that question is the real one.',
          '**What does this do badly?** Any supplier who says "nothing" is either not being straight with you or does not know their own product. Both are disqualifying.',
        ],
      },

      {
        t: 'callout',
          tone: 'warn',
          title: 'On certifications',
          text: 'If a supplier offers a certification as an answer, check what it certifies. ISO/IEC 27001 certifies an information security management system, meaning processes, rather than any particular product being secure.[^iso27001] It is real evidence of seriousness. It is not an answer to question seven.',
      },

      { t: 'h2', text: 'How to read the answers' },
      { t: 'p', text: 'You are not looking for perfect answers. You are looking for specific ones. A supplier who says "thirty days of daily backups, thirty five minute restore, we tested it in March" is more trustworthy than one who says "backups are fully managed", even if the first answer is worse than you hoped.' },
      { t: 'p', text: 'Vagueness on an operational question almost always means nobody has checked.' },

      {
        t: 'takeaways',
          items: [
          'Ask about leaving before you ask about features.',
          'Price the three year total, not the licence.',
          'The deletion-noticed-six-weeks-later question reveals more than any other.',
          'Insist on seeing your own awkward case, not the demo script.',
          'Specific answers beat good answers. Vagueness means nobody checked.',
        ],
      },

      {
        t: 'aside',
          title: 'Our own answers',
          text: 'We publish our positions on export, pricing and retention rather than keeping them for the sales conversation, and we would rather you asked all twelve of these before talking to us. What Enterprise Compute does badly: it is not the right fit for businesses that need deep manufacturing resource planning, and we will say so rather than take the project.',
          to: '/why-enterprise-compute',
      },
    ],
  },

  {
    slug: 'opening-a-second-location',
    pillar: 'growth',
    title: 'What breaks when you open a second location',
    excerpt:
      'The first site runs on the owner being present. The second one cannot. What has to become explicit before it does, and in what order.',
    image: 'retailBoutique',
    date: '2026-04-15',
    minutes: 9,
    author: 'editorial',
    references: ['coso'],
    body: [
      { t: 'p', text: 'A single site runs on something that is almost never written down: the owner is there. They notice the stock that is not moving, they approve the unusual refund, they know which supplier is slipping. None of it is a system and all of it is load-bearing.' },
      { t: 'p', text: 'Opening a second location removes that, and does so at exactly the moment the business is least able to absorb the loss. The things that break are predictable.' },

      { t: 'h2', text: 'What breaks, in order' },
      {
        t: 'ol',
          items: [
          '**Pricing drifts.** Two sites, two sets of local decisions, and within a quarter the same item is two prices. Customers notice before you do.',
          '**Stock becomes unknowable in aggregate.** Each site knows its own position. Nobody knows the total, so you simultaneously run out at one site and hold six months of cover at the other.',
          '**Cash control weakens.** The float, the banking and the variance at a site the owner visits twice a week is a materially different control environment from one they stand in.',
          '**Standards diverge.** Not through bad faith. Two teams, two interpretations, no written standard to refer back to.',
          '**Reporting becomes arithmetic.** Someone starts adding two sets of figures together in a spreadsheet, and that person becomes a bottleneck and a single point of failure.',
        ],
      },

      { t: 'pull', text: 'The first site was never running on process. It was running on proximity. The second site is where you find out which parts of your business were never written down.' },

      { t: 'h2', text: 'What to make explicit before you open' },
      {
        t: 'steps',
          items: [
          { title: 'Who may do what', text: 'Write down which decisions need approval and from whom: discounts beyond a threshold, refunds, write-offs, purchase commitments, price changes. On one site this lives in the owner’s head. It cannot live there any more. The principle underneath is separation of duties.[^coso]' },
          { title: 'One price list, centrally owned', text: 'Local discretion within a stated band, if you want it. The band and the owner of the list both need naming.' },
          { title: 'One stock position, visible to both', text: 'Including the ability to see and move stock between sites. Transfers need to be tracked in transit, or they become the new favourite place for stock to disappear.' },
          { title: 'Cash procedure, written and identical', text: 'Opening float, mid-shift drops, closing count, banking, and who investigates a variance over what threshold.' },
          { title: 'One set of numbers, produced automatically', text: 'If consolidating sites requires a person with a spreadsheet, you have built a reporting function instead of a second shop.' },
        ],
      },

      { t: 'h2', text: 'The economics people get wrong' },
      { t: 'p', text: 'Two assumptions cause most second-site disappointments.' },
      { t: 'p', text: 'The first is that costs scale sub-linearly. Some do, mostly head office and systems. Most do not. Rent, staff and stock are close to fully duplicated, and the stock duplication is worse than expected because each site needs its own safety stock on every line. Two sites do not hold the same total inventory as one larger site serving the same volume.' },
      { t: 'p', text: 'The second is that the second site will perform like the first. The first site had the best available location, chosen without competition from yourself, and the owner present every day. Model the second at a discount to the first and be pleased if you are wrong.' },

      {
        t: 'callout',
          tone: 'info',
          title: 'The test worth applying first',
          text: 'Leave the existing site entirely for two consecutive weeks. Do not visit, do not approve anything remotely. What breaks in those two weeks is exactly what will break permanently when you open the second location, except it will be happening at both sites at once.',
      },

      {
        t: 'takeaways',
          items: [
          'The first site runs on proximity. The second one exposes everything that was never written down.',
          'Pricing, stock visibility, cash control and standards are the predictable failures.',
          'Write down who may approve what before you open, not after.',
          'Two sites need more total safety stock than one site of equivalent volume.',
          'Model the second site below the first. It has a worse location and less of your attention.',
        ],
      },

      {
        t: 'aside',
          title: 'How we handle this',
          text: 'Enterprise Compute holds stock positions per item per location with transfers tracked in transit, one central price list, and permissions that travel with the person rather than the terminal. Consolidated reporting is derived from the same records the sites write, so adding a location does not add a reporting job.',
          to: '/products/inventory',
      },
    ],
  },
]

export default BUSINESS_POSTS
