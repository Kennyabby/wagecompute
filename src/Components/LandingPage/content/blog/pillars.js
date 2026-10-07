/* ============================================================================
   Blog pillars.
   ----------------------------------------------------------------------------
   Eleven subject areas. The first nine are written to be useful to someone who
   will never buy anything from us, which is the whole point of running a blog
   rather than a product newsletter. Pillar 10 covers the modules, and the
   house rule there is that the piece leads with the business problem and how
   to solve it by hand, and reaches the product late and briefly.

   `key` is the URL segment under /blog/topic/<key> and the value stored on a
   post's `pillar` field. Changing one means changing both, so they are only
   ever added to, never renamed.
   ========================================================================= */

export const PILLARS = [
  {
    key: 'numbers',
    name: 'Running the numbers',
    blurb: 'Unit economics, margin, cash and pricing, worked through in plain language with the arithmetic shown.',
    image: 'businessFinance',
  },
  {
    key: 'decisions',
    name: 'Decisions',
    blurb: 'The judgement calls owners actually face, and how to think about them without a consultant in the room.',
    image: 'executiveMeeting',
  },
  {
    key: 'operations',
    name: 'Operations playbooks',
    blurb: 'Procedure you can follow on a Monday morning. Vendor neutral, written for whatever you run today.',
    image: 'warehouseTeam',
  },
  {
    key: 'money',
    name: 'Money and compliance',
    blurb: 'Bookkeeping for people who are not accountants, and the obligations that come with keeping records.',
    image: 'accountantDesk',
  },
  {
    key: 'people',
    name: 'People and payroll',
    blurb: 'Rostering, attendance, pay and the paperwork that follows your first hire.',
    image: 'happyEmployee',
  },
  {
    key: 'sectors',
    name: 'Sector guides',
    blurb: 'How the same problems look different in retail, hospitality, pharmacy, construction and the rest.',
    image: 'retailStore',
  },
  {
    key: 'growth',
    name: 'Growth and strategy',
    blurb: 'Second locations, supplier bases, customer credit and the things that break when you get bigger.',
    image: 'businessGrowth',
  },
  {
    key: 'infrastructure',
    name: 'Cloud and on-premise',
    blurb: 'Where your software should actually run, what cloud genuinely buys you, and the cases where on-premise is the right answer or the only one.',
    image: 'dataCentre',
  },
  {
    key: 'technology',
    name: 'Technology realities',
    blurb: 'Power, connectivity, security and data protection as they are on the ground, not as the brochure describes them.',
    image: 'cyberSecurity',
  },
  {
    key: 'modules',
    name: 'How the work actually works',
    blurb: 'One deep dive per area of a business, from the till to the ledger. Problem first, tooling second.',
    image: 'dashboardScreen',
  },
  {
    key: 'explainers',
    name: 'Explainers',
    blurb: 'Short reference entries for the terms that get used without ever being defined.',
    image: 'bookkeeping',
  },
]

export const PILLAR_BY_KEY = PILLARS.reduce((map, pillar) => {
  map[pillar.key] = pillar
  return map
}, {})

export const pillarName = (key) => (PILLAR_BY_KEY[key] ? PILLAR_BY_KEY[key].name : key)

export default PILLARS
