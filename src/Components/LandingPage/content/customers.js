/* ============================================================================
   Customer stories for /customers and /customers/:slug.
   ============================================================================
   ⚠️  THESE ARE ILLUSTRATIVE SCENARIOS, NOT REAL CUSTOMER REFERENCES.
   ----------------------------------------------------------------------------
   They describe the kind of operation the platform is built for and the kind
   of outcome its mechanics produce, written as composites. No named business,
   person, logo or metric below corresponds to an actual customer.

   Publishing invented testimonials as genuine is a real problem, it misleads
   buyers and, in most markets, breaks advertising rules. So while
   `ILLUSTRATIVE` is true every page that renders this content also renders
   PLACEHOLDER_NOTICE. Replace the entries with approved, consented references
   and then set ILLUSTRATIVE to false; the notice disappears on its own and
   nothing else needs changing.
   ========================================================================= */

export const ILLUSTRATIVE = true

export const PLACEHOLDER_NOTICE =
  'Illustrative scenarios. These describe representative operations rather than named customers. Real, consented references replace them before launch.'

export const STORY_FILTERS = {
  industry: ['All industries', 'Retail', 'Hospitality', 'Distribution', 'Manufacturing', 'Logistics', 'Healthcare'],
  size: ['Any size', 'Small business', 'Growing business', 'Multi-site'],
}

export const STORIES = [
  {
    slug: 'three-site-restaurant-group',
    company: 'Three-site restaurant group',
    industryLabel: 'Hospitality',
    industrySlug: 'restaurants',
    size: 'Growing business',
    headline: 'From a bad Friday night to knowing food cost per dish',
    summary: 'A restaurant group that could not tell which dishes made money replaced four disconnected tools with one ledger, and repriced its menu on real numbers.',
    image: 'restaurantKitchen',
    heroImage: 'chefCooking',
    challenge:
      'Three kitchens, one central store, and no reliable way to know what a plate of food actually cost. Stock was counted weekly and the count was never right. Deliveries went out with cash and some of it came back. The books were assembled at month-end from receipts, bank statements and memory.',
    approach: [
      'Loaded the item catalogue and opening stock from the spreadsheet template rather than keying it',
      'Set up the central store as a supplying location with tracked transfers to each outlet',
      'Configured production so ingredient consumption is recorded against finished dishes',
      'Moved delivery onto per-rider runs with cash reconciliation at the end of each shift',
      'Mapped operational activity to a chart of accounts their accountant designed',
    ],
    results: [
      { value: 'Per dish', label: 'Food cost derived from real ingredient consumption' },
      { value: 'Per rider', label: 'Delivery cash reconciled on every run' },
      { value: 'Weekly → daily', label: 'Stock position, without closing the kitchen to count' },
      { value: 'Month-end', label: 'Became a review rather than a reconstruction' },
    ],
    quote: {
      text: 'The first month we could see food cost per dish properly, we repriced four items and stopped selling one entirely. We had been losing money on it for two years.',
      name: 'Amara N.',
      role: 'Owner',
      avatar: 'portraitWoman2',
    },
    modules: ['pos', 'inventory', 'delivery', 'journals', 'payroll'],
  },
  {
    slug: 'multi-branch-grocery',
    company: 'Multi-branch grocery retailer',
    industryLabel: 'Retail',
    industrySlug: 'retail',
    size: 'Growing business',
    headline: 'Three branches, one stock position, no more Sunday counts',
    summary: 'A grocery retailer stopped closing stores to count stock, because the count became a check on a number they already had.',
    image: 'supermarketAisle',
    heroImage: 'supermarketShopping',
    challenge:
      'Each branch ran its own till system and kept its own stock book. Transfers between branches were recorded on paper, if at all. Cash shortfalls were common and never traceable to a shift. Group reporting meant one person consolidating three sets of figures by hand every month.',
    approach: [
      'Put all three branches on one workspace with a stock position per location',
      'Moved inter-branch movement onto tracked transfers with receipt confirmation',
      'Switched the tills to session-based cash handling with a declared float',
      'Separated discounting and voids from selling as distinct permissions',
      'Mapped all three branches to a single chart of accounts',
    ],
    results: [
      { value: 'Per branch', label: 'Stock position, plus a consolidated group view' },
      { value: 'Per shift', label: 'Cash variance attributed to a named operator' },
      { value: 'Tracked', label: 'Every inter-branch transfer, with receipt confirmation' },
      { value: 'One ledger', label: 'Group reporting without manual consolidation' },
    ],
    quote: {
      text: 'We used to close the shop to count stock. Now the count is a check on a number we already have, not a discovery exercise.',
      name: 'Adaeze O.',
      role: 'Operations Lead',
      avatar: 'portraitWoman1',
    },
    modules: ['pos', 'inventory', 'sales', 'reports', 'settings'],
  },
  {
    slug: 'fmcg-distributor',
    company: 'FMCG distributor',
    industryLabel: 'Distribution',
    industrySlug: 'distribution',
    size: 'Multi-site',
    headline: 'Credit control that happens before the order, not after the loss',
    summary: 'A distributor working on single-digit margins stopped shipping to accounts that were ninety days overdue, because the limit is now checked at order entry.',
    image: 'warehouseForklift',
    heroImage: 'warehouseLogistics',
    challenge:
      'Trade pricing was applied from memory and discounts were given by whoever took the call. Credit was extended on relationships nobody was tracking centrally. Landed cost on imported lines was never attributed, so the margin reported on those lines was simply wrong.',
    approach: [
      'Built customer price lists with discount limits bound to permissions',
      'Set credit limits and payment terms per partner, enforced at order entry',
      'Attributed freight, duty and handling to the goods as landed cost',
      'Turned on three-way matching across purchase order, goods receipt and invoice',
      'Put ageing in front of the sales team rather than only in finance',
    ],
    results: [
      { value: 'At order', label: 'Credit limits checked before goods are committed' },
      { value: 'Landed', label: 'Cost attribution, so reported margin is real' },
      { value: '3-way', label: 'Matching on every supplier invoice' },
      { value: 'Per partner', label: 'Ageing visible to the people who sell' },
    ],
    quote: {
      text: 'The ageing report changed how we sell. We stopped shipping to accounts that were ninety days out because now we actually see it at the point of order.',
      name: 'Samuel A.',
      role: 'Commercial Director',
      avatar: 'portraitMan2',
    },
    modules: ['sales', 'purchase', 'business-partners', 'inventory', 'reports'],
  },
  {
    slug: 'food-processing-plant',
    company: 'Food processing plant',
    industryLabel: 'Manufacturing',
    industrySlug: 'manufacturing',
    size: 'Multi-site',
    headline: 'The unit cost they were pricing on was two years out of date',
    summary: 'A processor discovered its real cost of production was eighteen per cent above the figure it had been quoting from.',
    image: 'productionLine',
    heroImage: 'factoryAutomation',
    challenge:
      'Raw material, finished goods and work in progress were all one stock number. Production was recorded as output only, with no corresponding consumption, so the cost of a finished unit was an estimate calculated once and never revisited. Plant and machinery had been expensed rather than capitalised.',
    approach: [
      'Separated raw material and finished goods as distinct items with their own positions',
      'Recorded production as a real conversion: components consumed, finished goods produced',
      'Attributed landed cost on imported materials',
      'Moved plant and machinery onto the asset register with scheduled depreciation',
      'Attributed production payroll by department',
    ],
    results: [
      { value: 'Derived', label: 'Finished goods valued from components actually consumed' },
      { value: '+18%', label: 'Gap found between assumed and real unit cost' },
      { value: 'Capitalised', label: 'Plant moved to the balance sheet with depreciation' },
      { value: 'By department', label: 'Production labour cost attributed' },
    ],
    quote: {
      text: 'We were pricing on a cost we had worked out two years earlier. The real number was eighteen per cent higher.',
      name: 'Emeka U.',
      role: 'Production Director',
      avatar: 'portraitMan3',
    },
    modules: ['inventory', 'purchase', 'assets', 'payroll', 'reports'],
  },
  {
    slug: 'last-mile-logistics',
    company: 'Last-mile logistics operator',
    industryLabel: 'Logistics',
    industrySlug: 'logistics',
    size: 'Growing business',
    headline: 'Nobody was stealing. Nobody was checking either.',
    summary: 'Per-run cash reconciliation turned an assumed cost of doing business into a measurable, closable gap.',
    image: 'deliveryVan',
    heroImage: 'logisticsTruck',
    challenge:
      'Riders left with goods and returned with cash, and the two were reconciled in aggregate at the end of the week, if at all. Failed deliveries were reported verbally. Stock out on the road simply disappeared from the warehouse position until it came back or did not.',
    approach: [
      'Raised deliveries directly from sales orders with rider and vehicle assignment',
      'Made goods in transit visible as a distinct position rather than absent stock',
      'Captured proof of delivery at the point of handover',
      'Reconciled expected against collected cash per rider at the end of each run',
      'Recorded failed and partial deliveries properly, returning the right stock',
    ],
    results: [
      { value: 'Per run', label: 'Cash reconciled against a named rider' },
      { value: 'In transit', label: 'Stock visible while out for delivery' },
      { value: 'Captured', label: 'Proof of delivery at every handover' },
      { value: 'One quarter', label: 'Time taken for the reconciliation gap to close' },
    ],
    quote: {
      text: 'The reconciliation screen paid for the system in the first quarter. We were not being robbed, we were just never checking.',
      name: 'Kelechi D.',
      role: 'Fleet Manager',
      avatar: 'portraitMan4',
    },
    modules: ['delivery', 'sales', 'inventory', 'business-partners'],
  },
  {
    slug: 'multi-site-clinic-group',
    company: 'Multi-site clinic group',
    industryLabel: 'Healthcare',
    industrySlug: 'healthcare',
    size: 'Multi-site',
    headline: 'Running out of consumables mid-shift stopped being normal',
    summary: 'Reorder thresholds and per-store stock positions replaced a weekly phone round between clinic managers.',
    image: 'medicalTeam',
    heroImage: 'hospitalStaff',
    challenge:
      'Each clinic held its own consumables with no central visibility. Shortages were discovered during shifts and resolved by borrowing from another site, which was never recorded. Staff rotas lived in a spreadsheet that payroll re-keyed every period.',
    approach: [
      'Gave each clinic its own stock location with reorder thresholds per item',
      'Moved inter-clinic borrowing onto tracked transfers',
      'Captured attendance per site and had supervisors approve it before the pay run',
      'Attributed payroll and expenses to each clinic as a department',
      'Set up payer accounts with ageing and statements',
    ],
    results: [
      { value: 'Per store', label: 'Consumable positions with reorder signals' },
      { value: 'Tracked', label: 'Inter-clinic transfers, previously unrecorded' },
      { value: '0', label: 'Re-keying between the rota and the pay run' },
      { value: 'Per unit', label: 'Running cost attributed to each clinic' },
    ],
    quote: {
      text: 'Running out of consumables mid-shift was normal. It is not any more, and nobody had to start a spreadsheet.',
      name: 'Dr. Ngozi A.',
      role: 'Clinical Director',
      avatar: 'portraitWoman2',
    },
    modules: ['inventory', 'attendance', 'payroll', 'business-partners', 'reports'],
  },
]

export const STORY_BY_SLUG = STORIES.reduce((acc, story) => {
  acc[story.slug] = story
  return acc
}, {})

export default STORIES
