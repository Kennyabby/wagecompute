/* ============================================================================
   Pillar: cloud and on-premise.
   ----------------------------------------------------------------------------
   The brief here was to make the case for cloud and to be equally clear about
   where on-premise is expected, unavoidable, or simply the better call. A
   piece that only argues one side is not useful to anyone making the decision,
   and a reader who runs a factory floor or a pharmacy in a bad coverage area
   can tell immediately when they are being sold to.
   ========================================================================= */

export const INFRASTRUCTURE_POSTS = [
  {
    slug: 'cloud-or-on-premise',
    pillar: 'infrastructure',
    title: 'Cloud or on-premise: where your business software should actually run',
    excerpt:
      'The honest version of an argument that usually gets made by whoever is selling. What cloud genuinely buys you, what it quietly costs, and the questions that decide it either way.',
    image: 'dataCentre',
    date: '2026-02-11',
    minutes: 12,
    author: 'engineering',
    featured: true,
    references: ['nist800145', 'awsShared', 'msShared', 'sreBook', 'uptimeOutage'],
    body: [
      { t: 'p', text: 'Most businesses never make this decision deliberately. They inherit it. Someone installed a server in a back room in 2015 because that was what you did, or someone signed up for a subscription because it was the only option on the page, and ten years later that accident is the architecture. It is worth making the choice on purpose at least once, because the consequences are expensive in both directions and almost nothing about it is reversible on a short timescale.' },
      { t: 'p', text: 'What follows is the argument as it actually stands, including the parts that do not favour the answer most vendors want you to reach.' },

      { t: 'h2', text: 'First, what the word means' },
      { t: 'p', text: 'Cloud has been used loosely enough that it is worth starting from a definition that predates the marketing. The widely cited one comes from the US National Institute of Standards and Technology, which set out five essential characteristics: on-demand self service, broad network access, resource pooling, rapid elasticity, and measured service.[^nist800145] If a supplier is offering you a server they rack somewhere else and bill you a flat monthly fee for, that is hosting. It may be perfectly good, but it is not cloud, and it will not behave like cloud when you need it to grow or shrink.' },
      { t: 'p', text: 'The distinction matters commercially. Elasticity is the thing you are paying a premium for. If your workload never varies, you are paying for an option you never exercise.' },

      { t: 'image', name: 'dataCentreAisle', caption: 'A commercial data centre aisle. Redundant power, cooling and network at a scale almost no individual business can justify on its own.' },

      { t: 'h2', text: 'The case for cloud, made properly' },
      { t: 'p', text: 'There are four arguments that hold up, and several that do not.' },

      { t: 'h3', text: '1. You stop buying capacity for your worst day' },
      { t: 'p', text: 'On-premise capacity has to be sized for peak. A retailer whose December is four times its February still has to buy December hardware, and then watch it idle for eleven months. Rented capacity is sized for now and changed later. For any business with a seasonal shape, this is the single largest structural saving, and it is a saving that compounds because the hardware you did not buy is also hardware you do not later have to replace, power, cool or insure.' },

      { t: 'h3', text: '2. Somebody else does the unglamorous work' },
      { t: 'p', text: 'Patching, firmware, certificate renewal, disk replacement, backup verification. None of it is interesting, all of it is load-bearing, and in a small business it is usually nobody’s actual job. It gets done when there is time, which means it gets done after it has already caused a problem. Handing that to a supplier whose entire business depends on doing it is a genuine transfer of risk.' },

      { t: 'h3', text: '3. You get redundancy you could not otherwise afford' },
      { t: 'p', text: 'Two power feeds from different substations, generators with tested fuel contracts, multiple network carriers, hardware in more than one building. Any one of those is affordable. All of them together, for one business, is not. Pooling that cost across thousands of tenants is the main thing a data centre is actually for, and outage analyses of the sector consistently find that the failures which do occur are concentrated in power, cooling and configuration rather than in the computing hardware itself.[^uptimeOutage]' },

      { t: 'h3', text: '4. Recovery stops being theoretical' },
      { t: 'p', text: 'Ask any business with a server in the building what happens if that building floods. The honest answer is usually a long pause. Off-site, replicated storage turns that from an existential event into an inconvenience, and it does so without anyone having to remember to carry a tape home on Friday.' },

      { t: 'pull', text: 'The strongest argument for cloud is not that it is cheaper. Often it is not. It is that it makes the boring, critical work somebody’s contractual obligation instead of somebody’s good intention.' },

      { t: 'h2', text: 'What it costs that nobody mentions' },
      { t: 'p', text: 'Three things, and they are not small.' },
      {
        t: 'ul',
        items: [
          '**It never stops.** Capital expenditure ends. A subscription does not. Over a ten year horizon, a stable workload on owned hardware can genuinely come out cheaper, and anyone who tells you otherwise without seeing your numbers is guessing.',
          '**Getting data out is not symmetrical.** Putting data in is free or close to it. Taking it out, at volume, frequently is not. Ask about egress charges and about what an export actually contains before you depend on being able to leave.',
          '**You inherit someone else’s bad day.** When a provider has an incident, you have an incident, and you have no levers at all. You trade the ability to fix it yourself for the probability that it happens less often. That is usually a good trade. It does not feel like one at the time.',
        ],
      },

      { t: 'h2', text: 'The misunderstanding that causes most of the damage' },
      { t: 'p', text: 'A great many businesses believe that moving to a hosted system made backups, access control and data retention somebody else’s responsibility. It did not. Both of the largest providers publish an explicit shared responsibility model saying so: the provider secures the infrastructure, and the customer remains responsible for their own data, their own access configuration and their own retention.[^awsShared][^msShared] The line moves depending on whether you are buying infrastructure, a platform or finished software, which is precisely why it is worth reading rather than assuming.' },
      {
        t: 'callout',
        tone: 'warn',
        title: 'The question that reveals the truth',
        text: 'Ask your supplier: if an employee deletes three months of records today and nobody notices for six weeks, what exactly can you restore, and how far back? The answer to that question is your real backup policy, whatever the contract says.',
      },

      { t: 'h2', text: 'A worked comparison, with the assumptions on the table' },
      { t: 'p', text: 'The numbers below are illustrative. They are not research findings and you should replace every one of them with your own. The point is the shape of the calculation, not the result.' },
      { t: 'p', text: 'Take a business running one application for forty staff over five years.' },
      {
        t: 'table',
        head: ['Cost line', 'On-premise', 'Cloud'],
        rows: [
          ['Server hardware', 'Paid up front, replaced around year five', 'None'],
          ['Operating system and database licences', 'Paid, often per core', 'Usually included in the fee'],
          ['Uninterruptible power supply and generator share', 'Paid, plus fuel and testing', 'None'],
          ['Cooling and the electricity to run it', 'On your bill, every month', 'None'],
          ['Backup media and off-site storage', 'Paid, plus someone to manage it', 'Usually included, verify the retention'],
          ['Administrator time', 'Real, and usually unbudgeted', 'Reduced, not eliminated'],
          ['Subscription', 'None', 'Every month, forever'],
          ['Cost of a day of downtime', 'Yours alone to absorb', 'Shared, and usually shorter'],
        ],
      },
      { t: 'p', text: 'Most businesses that run this honestly find the five year totals closer than they expected, and then choose cloud anyway because of the last two rows. The administrator time and the downtime exposure are where the real difference sits, and both are chronically under-counted on the on-premise side because neither arrives as an invoice.' },

      { t: 'h2', text: 'What an availability figure is actually promising' },
      { t: 'p', text: 'Suppliers quote availability in nines. It is worth knowing what they translate to before you treat one as reassurance.' },
      {
        t: 'table',
        head: ['Quoted availability', 'Permitted downtime per year', 'Per month'],
        rows: [
          ['99%', 'About 3 days 15 hours', 'About 7 hours'],
          ['99.9%', 'About 8 hours 45 minutes', 'About 43 minutes'],
          ['99.95%', 'About 4 hours 23 minutes', 'About 22 minutes'],
          ['99.99%', 'About 52 minutes', 'About 4 minutes'],
        ],
      },
      { t: 'p', text: 'Two things follow. First, 99.9 percent is not a small number of hours when the hours land during trading. Second, a service level agreement is a billing arrangement, not a guarantee of behaviour: the remedy for breaching it is almost always a credit against your own fee, which will not come close to the cost of the outage to you. The engineering literature draws a hard line between the target a team works to internally and the number written into a contract, and the contractual one is deliberately the weaker of the two.[^sreBook]' },

      { t: 'h2', text: 'The questions that actually decide it' },
      {
        t: 'ol',
        items: [
          'Does any law, regulator or customer contract require your data to stay in a specific country or on hardware you control? If yes, that answers it. Skip to the next article.',
          'Is your connectivity good enough that losing it for a day is survivable? Be honest, and measure rather than guess.',
          'Does your workload vary, or is it flat all year?',
          'Do you have someone whose actual job is keeping a server patched and whose holiday does not stop that happening?',
          'If the building is unavailable tomorrow morning, what is your plan, and has anyone tested it?',
        ],
      },
      { t: 'p', text: 'For most small and mid-sized businesses the answers point to cloud, and the honest reason is question four rather than any of the cost arguments. But question one is a hard stop, and question two is where a lot of confident advice falls apart, which is the subject of the next piece.' },

      {
        t: 'takeaways',
        items: [
          'Cloud and hosting are not the same thing. Elasticity is what you are paying extra for, so check you need it.',
          'The real saving is rarely the hardware. It is the work you stop having to remember to do.',
          'A hosted system does not make your data somebody else’s responsibility. Read the shared responsibility model.',
          'Availability promises are billing terms. Convert the nines to hours and decide whether you could absorb them.',
          'Data residency requirements end the discussion. Establish whether you have any before doing any arithmetic.',
        ],
      },

      {
        t: 'aside',
        title: 'Where we sit on this',
        text: 'Enterprise Compute runs as a hosted platform, because for the businesses we work with, question four above is almost always the deciding one. But we treat a network outage as a normal operating condition rather than a failure: tills keep selling and reconcile when the connection returns. That is a deliberate architectural position rather than a feature, and it is why we do not think the cloud and on-premise question has to be answered by giving up the ability to trade.',
        to: '/products/offline-sync',
      },
    ],
  },

  {
    slug: 'when-on-premise-is-the-right-answer',
    pillar: 'infrastructure',
    title: 'When on-premise is expected, when it is unavoidable, and when it is simply better',
    excerpt:
      'Cloud is the right default for most businesses, which is not the same as the right answer for all of them. Three categories where keeping it in the building is correct, and the costs people forget to count.',
    image: 'serverRoom',
    date: '2026-02-18',
    minutes: 11,
    author: 'engineering',
    references: ['gdpr', 'ndpa', 'nist80034', 'localFirst', 'worldBankSurveys'],
    body: [
      { t: 'p', text: 'The previous piece argued that cloud is the right default for most small and mid-sized businesses. Defaults have exceptions, and in this case the exceptions are not edge cases. They are entire industries, and the advice to move everything to somebody else’s data centre does real damage when it is given to one of them.' },
      { t: 'p', text: 'There are three distinct situations, and they call for different conversations.' },

      { t: 'h2', text: 'One: when it is unavoidable' },
      { t: 'p', text: 'These are the cases where the decision has already been made for you by someone with more authority than your finance director.' },
      {
        t: 'ul',
        items: [
          '**Data residency obligations.** A number of jurisdictions restrict where particular categories of data may be stored or transferred. European transfers out of the bloc are governed by a specific chapter of the GDPR rather than by general permission,[^gdpr] and Nigeria’s Data Protection Act 2023 establishes a commission with its own requirements for controllers and processors.[^ndpa] If your sector has a residency rule, no cost argument overrides it.',
          '**Contractual obligations imposed by your customers.** Supply a defence contractor, a bank or a government department and you may find your own infrastructure is specified in their terms. This is common and it is non-negotiable.',
          '**Air-gapped environments.** Some facilities are not permitted a route to the public internet at all. That is a design requirement, not a preference.',
          '**Regulatory inspection requirements.** Certain regulators require physical access to systems and records on demand. Where that is the case, a provider’s compliance posture is not a substitute for yours.',
        ],
      },
      {
        t: 'callout',
        tone: 'info',
        title: 'Establish this first, not last',
        text: 'Residency and contractual constraints are the cheapest thing in the world to check and the most expensive thing in the world to discover after migration. One afternoon with your contracts and your regulator’s guidance, before anyone builds a business case.',
      },

      { t: 'h2', text: 'Two: when it is expected' },
      { t: 'p', text: 'Here nothing forbids cloud, but the physics or the operating reality of the work pushes compute toward the building.' },

      { t: 'image', name: 'factoryAutomation', caption: 'Production line control. When a decision has to be made in milliseconds and a pause has physical consequences, the round trip to a data centre is the problem.' },

      {
        t: 'ul',
        items: [
          '**Industrial control.** Machine control loops run in milliseconds. Anything that must respond at that speed, or must keep responding when the line is cut, belongs next to the machine. This is not a cost question, it is a latency and safety question.',
          '**Clinical and life-safety systems.** Where an unavailable system has patient consequences rather than commercial ones, local operation with local failover is the ordinary expectation.',
          '**Broadcast, laboratories and anything moving very large files.** When the working set is measured in terabytes per day, the network becomes the constraint and the economics invert.',
          '**Retail and hospitality at the point of sale.** A till that cannot complete a sale without a round trip is a till that closes when the line does. The sensible pattern here is local operation with synchronisation, not a choice between the two.',
        ],
      },

      { t: 'h2', text: 'Three: when it is simply the better call' },
      { t: 'p', text: 'No obligation, no physics. Just a situation where the arithmetic genuinely favours owning.' },
      {
        t: 'ul',
        items: [
          '**A flat, heavy, predictable workload.** Elasticity is the premium feature of rented capacity. A workload that is identical every day of the year exercises none of it and pays for all of it.',
          '**Existing capital and existing staff.** If the hardware is bought, the room is built and there is already a competent administrator on the payroll, the marginal cost of continuing is much lower than the headline comparison suggests.',
          '**Genuinely poor connectivity.** This is the one most often waved away by people who have never worked anywhere with a real problem. Firm-level survey data collected across many countries includes how often businesses report electricity and infrastructure as a major constraint, and in a number of markets that proportion is not marginal.[^worldBankSurveys] Look up your own country and sector rather than accepting a global average in either direction.',
        ],
      },

      { t: 'h2', text: 'The costs that on-premise advocates forget' },
      { t: 'p', text: 'Having made the case fairly, here is the other side of it. When a business compares a server purchase against a subscription, the comparison is almost always wrong, because the purchase price is the only number that arrives as an invoice. The rest is real and unbilled.' },
      {
        t: 'table',
        head: ['Forgotten cost', 'Why it gets missed'],
        rows: [
          ['Electricity for the machine and for cooling it', 'Lands on the building bill, never attributed'],
          ['Uninterruptible power supply, and replacing its batteries', 'Batteries degrade quietly and get discovered during an outage'],
          ['Replacement cycle', 'Hardware is treated as permanent until it is not'],
          ['Off-site backup copies', 'Often skipped entirely, which is the single most common serious gap'],
          ['Testing that the backups restore', 'Almost never done, so the backup is a belief rather than a fact'],
          ['Administrator time, including cover during leave', 'Absorbed into someone’s existing job and never costed'],
          ['Physical security of the room', 'A server under a desk is a server anyone can walk out with'],
          ['A second site for disaster recovery', 'The honest version of this doubles everything above'],
        ],
      },
      { t: 'p', text: 'Two planning terms are worth borrowing from the contingency planning literature, because they turn a vague worry into a number you can act on. Recovery time objective is how long you can be down. Recovery point objective is how much recent work you can afford to lose.[^nist80034] Write both down for your own business. If your backup runs nightly, your recovery point objective is up to twenty four hours, and the question becomes whether a day of lost transactions is survivable. For most trading businesses it is not, and discovering that on paper is considerably cheaper than discovering it in practice.' },

      { t: 'pull', text: 'The question is almost never cloud or on-premise. It is which parts of the work must continue when the line is cut, and where the rest of it should live.' },

      { t: 'h2', text: 'The answer most businesses actually need' },
      { t: 'p', text: 'Hybrid, though the word has been worn smooth by overuse. Concretely: the things that must keep working without a network run locally, and everything else runs centrally where it can be backed up, reported on and maintained by someone other than you.' },
      { t: 'p', text: 'There is a body of work arguing this as a software architecture rather than a deployment compromise. The local-first position holds that software should keep the working copy of your data on your own device, treat the network as an enhancement rather than a precondition, and reconcile when it returns.[^localFirst] For a shop, a clinic or a warehouse with unreliable connectivity, this is not a niche preference. It is the difference between a bad afternoon and a closed business.' },

      {
        t: 'steps',
        items: [
          { title: 'Establish the hard constraints', text: 'Residency, regulator and customer contracts. One afternoon. If anything here binds, it decides the question.' },
          { title: 'Write down your recovery objectives', text: 'How long can you be down, and how much work can you lose. Numbers, not adjectives.' },
          { title: 'Separate the work that must not stop', text: 'Usually selling, dispensing, admitting or despatching. Rarely reporting or payroll.' },
          { title: 'Put that work where the network cannot reach it', text: 'Local operation, syncing when it can.' },
          { title: 'Put everything else where someone else maintains it', text: 'This is where the cloud argument is strongest and least contested.' },
        ],
      },

      {
        t: 'takeaways',
        items: [
          'Residency law and customer contracts are hard stops. Check them before building any business case.',
          'Control systems, clinical systems and point of sale have reasons to run locally that are not about cost.',
          'A flat workload with existing staff and hardware is a legitimate case for owning.',
          'The on-premise comparison is almost always understated. Power, replacement, off-site copies and restore testing are the usual omissions.',
          'Decide recovery time and recovery point objectives explicitly. They convert a vague worry into a design requirement.',
        ],
      },

      {
        t: 'aside',
        title: 'Where we sit on this',
        text: 'We built Enterprise Compute around the hybrid answer rather than picking a side. Selling, stock movement and the records they produce continue through an outage on the machine in front of you, and reconcile against the central ledger when the connection returns. The reporting, the accounting and the maintenance stay central, because that is the part you should not have to employ somebody to look after.',
        to: '/products/offline-sync',
      },
    ],
  },
]

export default INFRASTRUCTURE_POSTS
