/* ============================================================================
   Pillar: technology realities.
   ----------------------------------------------------------------------------
   Infrastructure as it is on the ground. The security piece is deliberately
   scoped to what a business with no security staff can actually do, because
   advice pitched at organisations with a security team is worse than no
   advice: it gets read, found impossible, and then ignored entirely.
   ========================================================================= */

export const TECHNOLOGY_POSTS = [
  {
    slug: 'trading-through-power-and-network-cuts',
    pillar: 'technology',
    title: 'Trading through power cuts and dead connections',
    excerpt:
      'For a large part of the world, losing power or connectivity is a weekly operating condition rather than a disaster. What that means for how you choose systems, and what to do before the next one.',
    image: 'convenienceStore',
    date: '2026-02-25',
    minutes: 10,
    author: 'operations',
    featured: true,
    references: ['worldBankSurveys', 'localFirst', 'nist80034'],
    body: [
      { t: 'p', text: 'There is a category of software advice written by people who have never lost power during trading hours. It assumes connectivity the way it assumes gravity. For a great many businesses that assumption is simply wrong, and the systems built on it fail in the most expensive way possible: during the busiest hour, with customers in the shop.' },
      { t: 'p', text: 'If you operate somewhere that infrastructure is unreliable, this is not a disaster recovery topic. It is a Tuesday.' },

      { t: 'h2', text: 'Size the problem before solving it' },
      { t: 'p', text: 'Guessing is the enemy here, in both directions. Businesses either dismiss outages as rare or treat them as constant, and neither produces a sensible decision.' },
      { t: 'p', text: 'The World Bank’s Enterprise Surveys collect firm-level data by country on constraints including electricity and infrastructure, and in many markets the proportion of firms identifying power as a major constraint is substantial.[^worldBankSurveys] Look up your own country and sector rather than taking any global figure, including this sentence, as applying to you.' },
      { t: 'p', text: 'Then measure your own. For one month, log every interruption: date, time, duration, whether it was power or network, and what trading was happening. Thirty days of that is worth more than any survey, because it tells you the two things that actually matter, which are how long and when.' },

      { t: 'image', name: 'shopkeeper', caption: 'The question is not whether the system is available. It is whether the shopkeeper can complete the sale in front of them.' },

      { t: 'h2', text: 'The two numbers that drive every decision' },
      { t: 'p', text: 'Borrowed from contingency planning, where they are defined precisely rather than rhetorically.[^nist80034]' },
      {
        t: 'ul',
        items: [
          '**Recovery time objective.** How long you can be unable to operate before the damage is serious. For a shop at midday this is often minutes.',
          '**Recovery point objective.** How much recent work you can afford to lose. For anyone taking money, this is usually zero: a sale that was taken and then forgotten is money gone and stock gone with it.',
        ],
      },
      { t: 'p', text: 'Write both down. A recovery point objective of zero rules out a whole category of systems immediately, and it is better to discover that while choosing than during an outage.' },

      { t: 'h2', text: 'Why "it works offline" is usually not true' },
      { t: 'p', text: 'Many systems claim offline capability. Three quite different things get described with the same phrase, and only one of them is useful.' },
      {
        t: 'table',
        head: ['What is claimed', 'What actually happens', 'Useful?'],
        rows: [
          ['Read-only cache', 'You can look at yesterday’s data, you cannot sell', 'No'],
          ['Queue and forward', 'Sales are stored locally and sent later, but stock and pricing are stale and conflicts are resolved by whoever syncs last', 'Partly'],
          ['Local-first', 'The device holds a real working copy, operates fully, and reconciles on reconnection with defined conflict rules', 'Yes'],
        ],
      },
      { t: 'p', text: 'The distinction has been argued out properly in the literature. The local-first position holds that the working copy of your data should live on your own device and the network should be an enhancement rather than a precondition.[^localFirst] The practical test for any supplier is not whether they say they work offline. It is what happens to stock counts, pricing and conflicts when two tills sell the last unit of the same item while disconnected from each other.' },

      {
        t: 'callout',
        tone: 'warn',
        title: 'The question to ask any vendor',
        text: 'Two tills, both offline, both sell the last unit of an item. The connection returns. What exactly happens, and who finds out? A supplier without a crisp answer has not built for this.',
      },

      { t: 'pull', text: 'A system that cannot complete a sale without a network has not given you software. It has given you a dependency on your internet provider during your busiest hour.' },

      { t: 'h2', text: 'What to actually do, in order of value for money' },
      {
        t: 'steps',
        items: [
          { title: 'Protect the till and the router first', text: 'A small uninterruptible power supply on the point of sale and the network equipment costs less than one lost trading hour in most businesses. It is almost always the highest return spend available.' },
          { title: 'Make the critical path work without the network', text: 'Selling, dispensing and despatch. Reporting and payroll can wait, and treating them the same way wastes effort on the parts that do not matter.' },
          { title: 'Get a second, different connection', text: 'A mobile connection as backup to a fixed line, on a different carrier. Two lines from the same provider down the same street is one line.' },
          { title: 'Decide the manual fallback before you need it', text: 'Written down, printed, next to the till. Which records get taken by hand, who enters them afterwards, and by when.' },
          { title: 'Test the batteries', text: 'An uninterruptible power supply with dead batteries is a heavy box. Test twice a year and write down the date.' },
        ],
      },

      { t: 'h2', text: 'The manual fallback that actually works' },
      { t: 'p', text: 'Most paper fallbacks fail, for a predictable reason: they capture the sale and not the stock movement, so the ledger can be repaired afterwards and the inventory cannot. Weeks later there is a variance nobody can explain.' },
      { t: 'p', text: 'A fallback slip needs five fields and no more: date and time, item, quantity, amount taken, who served. Pre-print them. Number them sequentially so a missing one is visible. Agree that they are entered before close the same day, by a named person.' },

      {
        t: 'takeaways',
        items: [
          'Measure your own outages for a month. Duration and timing are what matter.',
          'Decide your recovery point objective. For anyone taking money it is usually zero.',
          'Offline means three different things. Only a real local working copy is useful.',
          'An uninterruptible power supply on the till and router is usually the best value spend available.',
          'A paper fallback must capture the stock movement, not just the money.',
        ],
      },

      {
        t: 'aside',
        title: 'How we handle this',
        text: 'This is the problem Enterprise Compute was built around rather than one it added later. The till holds a real working copy and completes sales with no connection at all, deducting stock locally as it goes. When the line returns it reconciles against the central ledger, and conflicts between two offline tills are surfaced as a list to resolve rather than silently settled by whichever synced last.',
        to: '/products/offline-sync',
      },
    ],
  },

  {
    slug: 'security-basics-for-a-business-with-no-it-team',
    pillar: 'technology',
    title: 'Security basics for a business with no IT team',
    excerpt:
      'Most security advice is written for organisations with a security function. This is the version for everyone else: the small number of things that prevent most of what actually happens.',
    image: 'cyberSecurity',
    date: '2026-03-11',
    minutes: 9,
    author: 'engineering',
    references: ['nistCsf', 'owaspTop10', 'pciDss', 'iso27001', 'gdpr'],
    body: [
      { t: 'p', text: 'Security guidance aimed at small businesses tends to fail in one of two ways. Either it is a list of forty controls that assumes somebody whose job this is, or it is so general that it amounts to telling you to be careful.' },
      { t: 'p', text: 'What follows is the short version: the things that stop the large majority of what actually happens to businesses of this size, in rough order of value.' },

      { t: 'h2', text: 'The five that matter most' },
      {
        t: 'steps',
          items: [
          { title: 'Separate accounts for every person', text: 'Shared logins make it impossible to answer who did something, which removes the deterrent and the investigation at the same time. This is the single highest value change in most small businesses and it costs nothing.' },
          { title: 'Multi-factor authentication on email first', text: 'Email is the master key: it resets every other password you own. If you do only one technical thing, do this one, and do it on email before anything else.' },
          { title: 'Keep things updated', text: 'Most successful attacks use known weaknesses that were fixed months earlier. Turn on automatic updates for operating systems, browsers and anything exposed to the internet.' },
          { title: 'Backups you have actually restored', text: 'An untested backup is a belief. Restore one file from last month, today, and find out. Keep a copy somewhere that an attack on your systems cannot reach.' },
          { title: 'Remove access the day someone leaves', text: 'Make it part of the leaving process rather than something remembered later. Former staff accounts are a standing invitation.' },
        ],
      },
      { t: 'p', text: 'If a framework helps, the NIST Cybersecurity Framework organises this kind of work into a small number of functions and is readable without a security background.[^nistCsf] Treat it as a checklist for conversations rather than a project.' },

      { t: 'h2', text: 'The attacks that actually reach businesses like yours' },
      { t: 'p', text: 'Not sophisticated. That is the point.' },
      {
        t: 'ul',
          items: [
          '**Invoice fraud.** An email that appears to come from a supplier, announcing changed bank details. Prevented by one rule: bank detail changes are verified by phoning a number you already had, never a number in the email.',
          '**Credential reuse.** A password exposed in some unrelated breach, tried against your email. Prevented by multi-factor authentication.',
          '**Ransomware.** Usually arrives through an attachment or an unpatched remote access service. Mitigated by updates and by an offline backup copy.',
          '**Insider error and insider theft.** More common than external attack in small businesses, and almost always enabled by shared accounts and no separation of duties.',
        ],
      },
      {
        t: 'callout',
          tone: 'warn',
          title: 'The one procedural rule worth writing down',
          text: 'No change to supplier bank details is ever actioned on the strength of an email. Verify by calling a number you held before the request arrived. This single rule prevents the most costly fraud that reaches small businesses.',
      },

      { t: 'h2', text: 'If you take card payments' },
      { t: 'p', text: 'Handling card data brings you within the scope of the Payment Card Industry Data Security Standard, which applies to anyone who stores, processes or transmits it, including very small merchants.[^pciDss] The practical consequence for most businesses is simple: do not store card numbers anywhere, ever, including in a notebook or a spreadsheet. Use a payment provider so the data never touches your systems, and your obligations shrink dramatically.' },

      { t: 'h2', text: 'If you hold personal data' },
      { t: 'p', text: 'Which you do, the moment you have one employee or one customer record. Obligations vary by jurisdiction and you need local advice, but two principles are close to universal and worth adopting regardless: collect only what you need, and keep it only as long as you need it. In the European regime these sit in the article on principles and the article on security of processing.[^gdpr] The commercial version of the same idea is that data you do not hold cannot be stolen from you.' },

      { t: 'h2', text: 'What certifications do and do not tell you' },
      { t: 'p', text: 'When a supplier says they are certified, it is worth knowing what was certified. ISO/IEC 27001 certifies an information security management system, meaning a set of processes, rather than any particular product being secure.[^iso27001] It is meaningful evidence that someone is taking the work seriously. It is not a guarantee about the software you are buying, and a supplier who presents it as one is telling you something about themselves.' },
      { t: 'p', text: 'For anything web-facing, the OWASP Top Ten is the standard reference for the categories of weakness that matter, and it is reasonable to ask a supplier whether they test against it.[^owaspTop10]' },

      {
        t: 'takeaways',
          items: [
          'Individual accounts, not shared logins. Highest value change available, and free.',
          'Multi-factor authentication on email before anything else. Email resets everything.',
          'Verify supplier bank detail changes by phone, using a number you already had.',
          'A backup you have not restored is not a backup.',
          'Do not store card numbers. Use a provider and your obligations shrink.',
        ],
      },

      {
        t: 'aside',
          title: 'How we handle this',
          text: 'Enterprise Compute is built around named users rather than shared terminals, so every sale, discount, void and stock adjustment carries the person who did it. Permissions are granular enough that selling, discounting and adjusting stock are separate rights, which is the practical form of separation of duties for a business too small to have departments.',
          to: '/products/settings',
      },
    ],
  },
]

export default TECHNOLOGY_POSTS
