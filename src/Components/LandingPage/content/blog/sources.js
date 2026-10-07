/* ============================================================================
   Citation registry.
   ----------------------------------------------------------------------------
   One entry per external work the blog refers to. Posts cite by id, the
   article page renders a numbered reference list from the ids a post actually
   used, and inline markers in the prose link down to it.

   WHAT GOES IN HERE
   Primary sources: standards, statutes, framework definitions and named books
   or papers. Things whose existence and content are checkable, and which do
   not go stale the way a secondary write-up of a survey does.

   WHAT DOES NOT
   Statistics quoted second hand, and any figure we cannot point at a primary
   source for. Where a post needs numbers to make a point, it uses a worked
   example with its own stated assumptions and says so, rather than borrowing
   authority from a survey nobody is going to look up.

   BEFORE PUBLISHING
   URLs are canonical landing pages rather than deep links, because those move.
   They should still be checked once before this goes live, and on a schedule
   afterwards. Nothing here is auto-verified.
   ========================================================================= */

export const SOURCES = {
  /* ---- cloud, infrastructure, resilience ------------------------------- */
  nist800145: {
    id: 'nist800145',
    title: 'The NIST Definition of Cloud Computing (Special Publication 800-145)',
    authors: 'Peter Mell and Timothy Grance',
    publisher: 'National Institute of Standards and Technology',
    year: 2011,
    url: 'https://csrc.nist.gov/publications/detail/sp/800-145/final',
    note: 'The source of the five essential characteristics and the three service models that the words IaaS, PaaS and SaaS actually refer to.',
  },
  nist80034: {
    id: 'nist80034',
    title: 'Contingency Planning Guide for Federal Information Systems (Special Publication 800-34 Rev. 1)',
    publisher: 'National Institute of Standards and Technology',
    year: 2010,
    url: 'https://csrc.nist.gov/publications/detail/sp/800-34/rev-1/final',
    note: 'Where recovery time objective and recovery point objective are defined as planning terms rather than marketing ones.',
  },
  awsShared: {
    id: 'awsShared',
    title: 'Shared Responsibility Model',
    publisher: 'Amazon Web Services',
    url: 'https://aws.amazon.com/compliance/shared-responsibility-model/',
    note: 'The provider secures the cloud, the customer secures what they put in it. Worth reading before assuming a hosted system makes backups your supplier’s problem.',
  },
  msShared: {
    id: 'msShared',
    title: 'Shared responsibility in the cloud',
    publisher: 'Microsoft',
    url: 'https://learn.microsoft.com/azure/security/fundamentals/shared-responsibility',
    note: 'The same division of duties set out for Azure, including how it shifts between IaaS, PaaS and SaaS.',
  },
  sreBook: {
    id: 'sreBook',
    title: 'Site Reliability Engineering: How Google Runs Production Systems',
    authors: 'Betsy Beyer, Chris Jones, Jennifer Petoff and Niall Richard Murphy (editors)',
    publisher: 'O’Reilly Media',
    year: 2016,
    url: 'https://sre.google/books/',
    note: 'Free to read online. The chapters on service level objectives are the clearest explanation of what an availability figure does and does not promise.',
  },
  uptimeOutage: {
    id: 'uptimeOutage',
    title: 'Annual Outage Analysis',
    publisher: 'Uptime Institute',
    url: 'https://uptimeinstitute.com/resources',
    note: 'An annual series on the causes and costs of data centre and IT service outages. Published yearly, so cite the edition you read.',
  },
  localFirst: {
    id: 'localFirst',
    title: 'Local-first software: you own your data, in spite of the cloud',
    authors: 'Martin Kleppmann, Adam Wiggins, Peter van Hardenberg and Mark McGranaghan',
    publisher: 'Ink & Switch',
    year: 2019,
    url: 'https://www.inkandswitch.com/local-first/',
    note: 'The essay that set out the seven properties of local-first software. The clearest statement of why working offline is an architectural choice rather than a feature.',
  },
  ddia: {
    id: 'ddia',
    title: 'Designing Data-Intensive Applications',
    authors: 'Martin Kleppmann',
    publisher: 'O’Reilly Media',
    year: 2017,
    url: 'https://dataintensive.net/',
    note: 'Chapter 5 on replication and chapter 9 on consistency are the background to any honest discussion of what synchronising two copies of your data can and cannot guarantee.',
  },
  worldBankSurveys: {
    id: 'worldBankSurveys',
    title: 'Enterprise Surveys',
    publisher: 'World Bank Group',
    url: 'https://www.enterprisesurveys.org/',
    note: 'Firm-level survey data by country, including how often businesses report electricity and infrastructure as a constraint. Query the country and year you need rather than quoting a global figure.',
  },

  /* ---- accounting and reporting ---------------------------------------- */
  pacioli: {
    id: 'pacioli',
    title: 'Summa de Arithmetica, Geometria, Proportioni et Proportionalita',
    authors: 'Luca Pacioli',
    publisher: 'Venice',
    year: 1494,
    url: 'https://www.britannica.com/biography/Luca-Pacioli',
    note: 'The first printed description of double-entry bookkeeping as practised by Venetian merchants. The method is older than the book, but this is where it was written down.',
  },
  ias2: {
    id: 'ias2',
    title: 'IAS 2 Inventories',
    publisher: 'IFRS Foundation',
    url: 'https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/',
    note: 'Defines what may be included in the cost of inventory, and requires measurement at the lower of cost and net realisable value.',
  },
  ifrsFramework: {
    id: 'ifrsFramework',
    title: 'Conceptual Framework for Financial Reporting',
    publisher: 'IFRS Foundation',
    year: 2018,
    url: 'https://www.ifrs.org/issued-standards/list-of-standards/conceptual-framework/',
    note: 'Sets out the qualitative characteristics of useful financial information, including faithful representation and verifiability.',
  },
  coso: {
    id: 'coso',
    title: 'Internal Control, Integrated Framework',
    publisher: 'Committee of Sponsoring Organizations of the Treadway Commission',
    year: 2013,
    url: 'https://www.coso.org/guidance-on-ic',
    note: 'The framework most internal control language descends from, including segregation of duties and control activities.',
  },

  /* ---- security, privacy, payments ------------------------------------- */
  nistCsf: {
    id: 'nistCsf',
    title: 'Cybersecurity Framework',
    publisher: 'National Institute of Standards and Technology',
    url: 'https://www.nist.gov/cyberframework',
    note: 'Organises security work into a small number of functions. Useful as a checklist for a business with no security team.',
  },
  iso27001: {
    id: 'iso27001',
    title: 'ISO/IEC 27001, Information security management systems',
    publisher: 'International Organization for Standardization',
    url: 'https://www.iso.org/standard/27001',
    note: 'The certification a supplier means when they say they are certified. Worth knowing that it certifies a management system, not any particular product.',
  },
  owaspTop10: {
    id: 'owaspTop10',
    title: 'OWASP Top Ten',
    publisher: 'Open Worldwide Application Security Project',
    url: 'https://owasp.org/www-project-top-ten/',
    note: 'The standard awareness list of web application security risks.',
  },
  pciDss: {
    id: 'pciDss',
    title: 'Payment Card Industry Data Security Standard',
    publisher: 'PCI Security Standards Council',
    url: 'https://www.pcisecuritystandards.org/',
    note: 'Applies to anyone who stores, processes or transmits card data, including small merchants.',
  },
  gdpr: {
    id: 'gdpr',
    title: 'Regulation (EU) 2016/679 (General Data Protection Regulation)',
    publisher: 'European Union',
    year: 2016,
    url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
    note: 'The text itself. Articles 5 and 32 are the ones that bear on how long you keep records and how you secure them.',
  },
  ndpa: {
    id: 'ndpa',
    title: 'Nigeria Data Protection Act 2023',
    publisher: 'Nigeria Data Protection Commission',
    year: 2023,
    url: 'https://ndpc.gov.ng/',
    note: 'Establishes the Commission and sets obligations for data controllers and processors operating in Nigeria.',
  },

  /* ---- people and work -------------------------------------------------- */
  iloWorkingTime: {
    id: 'iloWorkingTime',
    title: 'Working time standards and conventions',
    publisher: 'International Labour Organization',
    url: 'https://www.ilo.org/topics/working-time-and-work-life-balance',
    note: 'International baseline on hours, rest periods and record keeping. National law governs, but this is where much of it originates.',
  },
}

/** Every id a post cites, resolved and numbered in order of first appearance. */
export const resolveReferences = (ids = []) =>
  ids.map((id) => SOURCES[id]).filter(Boolean)

export default SOURCES
