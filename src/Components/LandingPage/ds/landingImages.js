/* ============================================================================
   Central photo registry for every public/marketing page.
   ----------------------------------------------------------------------------
   sap.com is photography-led: almost every tile, hero and fifty-fifty block on
   their site carries a real photograph or a product screenshot, and icons are
   reserved for dense utility lists. These pages now follow the same rule, so
   this file is where all of that imagery lives.

   WHY HOTLINKED AND NOT COMMITTED
   The repo ships exactly one image (the app logo) and has no asset pipeline or
   image CDN. Committing ~90 photographs would add tens of megabytes to the
   Electron installer for pages the desktop build never even renders (Electron
   mounts DesktopEntry at '/', not LandingPage). So each entry is a Pexels CDN
   id instead. Pexels' licence explicitly permits free commercial use and
   hotlinking, and the /photos/<id>/ URL form is stable.

   SWAPPING IN YOUR OWN PHOTOGRAPHY
   Every consumer goes through `img()`/`photo()` below and refers to images by
   NAME, never by URL. To move to self-hosted assets or real product
   screenshots, change only the `src` builder and the `id` values here — no
   page component needs to be touched.

   Every entry carries real alt text. Decorative-only usage should pass
   alt="" at the call site rather than reusing a description.
   ========================================================================= */

const CDN = 'https://images.pexels.com/photos'

// Pexels serves a resized/compressed derivative from query params, so each
// slot can request exactly the pixels its layout needs instead of shipping a
// 4000px original into a 400px card.
const buildSrc = (id, w, h) => {
  const params = ['auto=compress', 'cs=tinysrgb', `w=${w}`]
  if (h) params.push(`h=${h}`, 'fit=crop')
  return `${CDN}/${id}/pexels-photo-${id}.jpeg?${params.join('&')}`
}

// name -> { id, alt }. Grouped by where they are used.
const LIBRARY = {
  // ---- Brand / hero / general business ----------------------------------
  heroTeam: { id: 30688593, alt: 'A team of colleagues in a bright open-plan office reviewing work together' },
  heroOffice: { id: 7654401, alt: 'A diverse team of business professionals working together in a modern office' },
  teamMeeting: { id: 9489091, alt: 'Colleagues gathered around a table in a collaborative meeting' },
  teamCollaboration: { id: 5256819, alt: 'Two colleagues working side by side at a shared desk' },
  teamWhiteboard: { id: 7964146, alt: 'A team planning work on a whiteboard' },
  teamStartup: { id: 5324900, alt: 'A small team working in an informal startup office' },
  teamWorking: { id: 6192762, alt: 'Colleagues collaborating over laptops in an open office' },
  teamDocuments: { id: 7693254, alt: 'A team reviewing printed reports and laptops together at a table' },
  businessOwner: { id: 30275077, alt: 'A business owner standing in their workplace' },
  marketTrader: { id: 34523107, alt: 'A trader serving customers at a busy market stall' },
  localMarket: { id: 37796900, alt: 'Stalls and shoppers at a bustling local market' },

  // ---- Point of sale / retail -------------------------------------------
  posTerminal: { id: 32850670, alt: 'A cashier ringing up a sale at a point-of-sale terminal' },
  posCheckout: { id: 4173320, alt: 'A customer paying at a shop checkout counter' },
  posCard: { id: 5239804, alt: 'A customer tapping a bank card on a card reader' },
  shopkeeper: { id: 36753973, alt: 'A shopkeeper behind the counter of their store' },
  retailStore: { id: 8311880, alt: 'Racks of clothing in a retail store' },
  retailBoutique: { id: 18379886, alt: 'The interior of a small boutique shop' },
  supermarketAisle: { id: 15491784, alt: 'A long supermarket aisle lined with stocked shelves' },
  supermarketShopping: { id: 31266794, alt: 'A shopper pushing a trolley through a supermarket' },
  groceryStore: { id: 4177709, alt: 'Shelves of produce and packaged goods in a grocery store' },
  convenienceStore: { id: 34357798, alt: 'The counter and shelves of a convenience store' },

  // ---- Inventory / warehouse --------------------------------------------
  inventoryCount: { id: 31112251, alt: 'A worker checking stock levels against a handheld device in a storeroom' },
  warehouseWorker: { id: 31199539, alt: 'A warehouse worker moving boxes between racks' },
  warehouseLogistics: { id: 4487383, alt: 'Pallets and shelving in a large distribution warehouse' },
  warehouseForklift: { id: 29491402, alt: 'A forklift lifting a pallet in a warehouse aisle' },
  warehouseRacks: { id: 4115457, alt: 'Tall racking filled with stock in a warehouse' },
  warehouseTeam: { id: 4483556, alt: 'Warehouse staff checking goods against a delivery note' },

  // ---- Manufacturing / production ---------------------------------------
  productionLine: { id: 34221997, alt: 'Products moving along an automated factory production line' },
  factoryFloor: { id: 29988964, alt: 'The floor of a working manufacturing plant' },
  factoryPlant: { id: 38427501, alt: 'Industrial machinery inside a manufacturing plant' },
  factoryAutomation: { id: 36423820, alt: 'A robotic arm operating on an automated assembly line' },
  industrialFactory: { id: 15866139, alt: 'A large industrial factory interior' },

  // ---- Hospitality / accommodation --------------------------------------
  hotelReception: { id: 5371683, alt: 'A guest checking in at a hotel reception desk' },
  hotelStaff: { id: 3770107, alt: 'Hotel staff welcoming a guest in the lobby' },
  hotelLobby: { id: 28102352, alt: 'The lobby and seating area of a hotel' },
  hotelRoom: { id: 34496701, alt: 'A prepared guest room in a hotel' },
  frontDesk: { id: 6876607, alt: 'A receptionist working at a front desk' },
  restaurantKitchen: { id: 27685507, alt: 'Chefs preparing orders in a busy restaurant kitchen' },
  restaurantService: { id: 12203618, alt: 'A server carrying plates through a restaurant dining room' },
  restaurantInterior: { id: 31071253, alt: 'Tables laid out in a restaurant dining room' },
  chefCooking: { id: 8629103, alt: 'A chef plating a dish at the pass' },
  cafeInterior: { id: 30948318, alt: 'The counter and seating of a café' },

  // ---- Construction ------------------------------------------------------
  constructionCrew: { id: 12314551, alt: 'Construction workers on site reviewing plans' },
  constructionSite: { id: 6082416, alt: 'An active construction site with scaffolding' },
  constructionTeam: { id: 35300835, alt: 'A site team in hard hats discussing progress' },
  constructionSafety: { id: 33914927, alt: 'A site supervisor in safety gear inspecting work' },

  // ---- Healthcare --------------------------------------------------------
  hospitalStaff: { id: 31499386, alt: 'Clinical staff conferring in a hospital corridor' },
  medicalTeam: { id: 8943103, alt: 'A medical team reviewing a patient chart together' },
  healthcareWorker: { id: 6129106, alt: 'A healthcare professional at work in a clinic' },
  hospitalReception: { id: 33812025, alt: 'A reception desk in a hospital waiting area' },
  nurses: { id: 29941468, alt: 'Two nurses in scrubs on a hospital ward' },
  pharmacy: { id: 32116001, alt: 'Shelves of medication behind a pharmacy counter' },
  pharmacist: { id: 8657297, alt: 'A pharmacist checking a prescription' },

  // ---- Finance / accounting ---------------------------------------------
  accountantDesk: { id: 7821576, alt: 'An accountant reviewing financial documents at a desk' },
  bookkeeping: { id: 210990, alt: 'Ledger pages, a calculator and a pen on a desk' },
  accountant: { id: 7654131, alt: 'An accountant working through a set of accounts' },
  budgetPlanning: { id: 6956131, alt: 'Two colleagues planning a budget with printed figures' },
  businessFinance: { id: 8296970, alt: 'Financial statements spread across a meeting table' },
  financialAnalysis: { id: 7054416, alt: 'A finance team analysing performance figures' },
  financialAdvisor: { id: 8068654, alt: 'An advisor talking a client through their numbers' },

  // ---- Analytics / product screens --------------------------------------
  dashboardScreen: { id: 577210, alt: 'A business dashboard of charts displayed on a monitor' },
  analyticsScreen: { id: 19891030, alt: 'Analytics charts and key figures on screen' },
  dataDashboard: { id: 97080, alt: 'Performance data visualised on a desktop display' },
  dataAnalytics: { id: 6248959, alt: 'A manager reviewing charts on a laptop in an office' },
  realtimeDashboard: { id: 12969403, alt: 'A laptop showing a live analytics dashboard' },
  laptopCharts: { id: 577195, alt: 'An overhead view of a laptop showing data visualisations' },

  // ---- Delivery / logistics ---------------------------------------------
  deliveryDriver: { id: 7843970, alt: 'A delivery driver handing a parcel to a customer' },
  deliveryVan: { id: 18434074, alt: 'A delivery van being loaded with orders' },
  logisticsTruck: { id: 37186960, alt: 'A haulage truck at a loading bay' },
  deliveryRider: { id: 13432255, alt: 'A delivery rider setting off with an order' },
  logistics: { id: 13025947, alt: 'Containers and freight at a logistics yard' },

  // ---- People / portraits (testimonials, leadership) ---------------------
  portraitWoman1: { id: 27086922, alt: 'Portrait of a professional woman in an office' },
  portraitWoman2: { id: 8875503, alt: 'Portrait of a businesswoman at her workplace' },
  portraitWoman3: { id: 32341972, alt: 'Portrait of a woman at work in an office' },
  portraitWoman4: { id: 6248741, alt: 'Portrait of a smiling woman in a workplace' },
  portraitMan1: { id: 7792750, alt: 'Portrait of a man working in an office' },
  portraitMan2: { id: 36292200, alt: 'Portrait of a professional man in business dress' },
  portraitMan3: { id: 3782183, alt: 'Portrait of a businessman in an office setting' },
  portraitMan4: { id: 17910791, alt: 'Portrait of a smiling man at work' },
  portraitNeutral: { id: 4872060, alt: 'A business portrait taken in an office' },
  happyEmployee: { id: 7794041, alt: 'An employee smiling at their desk' },

  // ---- Support / service -------------------------------------------------
  supportAgent: { id: 7681839, alt: 'A support agent wearing a headset at a workstation' },
  customerSupport: { id: 8867631, alt: 'A customer support team member helping a caller' },
  customerService: { id: 7709141, alt: 'A service representative speaking with a customer' },
  callCentre: { id: 8204317, alt: 'A row of agents working in a contact centre' },
  customerCare: { id: 38918756, alt: 'A support specialist assisting a customer by phone' },

  // ---- Developers / platform --------------------------------------------
  developerScreens: { id: 14553704, alt: 'A developer working across multiple code editors' },
  codeScreen: { id: 27427258, alt: 'Source code displayed on a monitor' },
  softwareDeveloper: { id: 12902862, alt: 'A software developer at work on a laptop' },
  webDeveloper: { id: 256502, alt: 'A developer writing code at a workstation' },

  // ---- Security / infrastructure ----------------------------------------
  dataCentre: { id: 37730212, alt: 'Illuminated server racks inside a data centre' },
  serverRoom: { id: 5203849, alt: 'Rows of servers in a secure server room' },
  dataCentreAisle: { id: 17489163, alt: 'An aisle between server cabinets in a data centre' },
  cyberSecurity: { id: 38482453, alt: 'A security analyst monitoring systems on screen' },
  dataProtection: { id: 2882638, alt: 'A padlock resting on a keyboard, representing data protection' },

  // ---- Events / community ------------------------------------------------
  conferenceAudience: { id: 9275222, alt: 'An audience seated at a conference session' },
  businessPresentation: { id: 8424451, alt: 'A speaker presenting to colleagues in a meeting room' },
  businessEvent: { id: 7648472, alt: 'Attendees networking at a business event' },
  corporateEvent: { id: 35042249, alt: 'A corporate event in progress in a large hall' },
  publicSpeaker: { id: 38081093, alt: 'A speaker addressing an audience from a stage' },
  executiveMeeting: { id: 6949865, alt: 'Executives in discussion around a boardroom table' },

  // ---- Training / enablement ---------------------------------------------
  businessTraining: { id: 8761327, alt: 'A trainer leading a session for a small group' },
  professionalDevelopment: { id: 7429477, alt: 'Colleagues in a professional development workshop' },
  onlineTraining: { id: 4498475, alt: 'Someone following an online course on a laptop' },
  classroomTraining: { id: 32074781, alt: 'Participants taking notes during a training class' },

  // ---- Education industry -------------------------------------------------
  classroom: { id: 5212648, alt: 'A teacher leading a lesson in a classroom' },
  students: { id: 9159042, alt: 'Students at desks during a class' },
  universityClass: { id: 8197551, alt: 'A lecture in progress in a university classroom' },

  // ---- Agriculture --------------------------------------------------------
  farmer: { id: 11053137, alt: 'A farmer working in a field' },
  agriculture: { id: 25945334, alt: 'Cultivated farmland under an open sky' },
  farmField: { id: 8056307, alt: 'Crops growing across a farm field' },
  harvest: { id: 11678438, alt: 'A combine harvester working through a crop' },

  // ---- Fuel / forecourt ----------------------------------------------------
  fuelStation: { id: 16725456, alt: 'A vehicle refuelling at a service station forecourt' },
  fuelPump: { id: 3971795, alt: 'A fuel pump at a filling station' },

  // ---- Partnership / growth -----------------------------------------------
  handshake: { id: 33175650, alt: 'Two people shaking hands to close an agreement' },
  businessDeal: { id: 8837510, alt: 'Colleagues signing an agreement across a table' },
  partnership: { id: 5833330, alt: 'Two partners reviewing a plan together' },
  consultation: { id: 5816300, alt: 'A consultant advising a client in a meeting' },
  businessGrowth: { id: 7793179, alt: 'A team reviewing growth figures together' },

  // ---- Generic office / work ----------------------------------------------
  officeWorker: { id: 6803551, alt: 'An office worker concentrating at their desk' },
  officeLaptop: { id: 7437087, alt: 'A laptop open on a desk in an office' },
  workingLaptop: { id: 12662877, alt: 'A person working on a laptop at a desk' },
  workingOffice: { id: 7653461, alt: 'Colleagues working at their desks in an office' },
  businessOffice: { id: 30375847, alt: 'A modern business office interior' },
  businessLaptop: { id: 6893890, alt: 'A professional working on a laptop' },
}

/** Default render widths per shape, so call sites don't repeat numbers. */
const SHAPES = {
  hero: [1280, 880],
  heroWide: [1920, 900],
  card: [800, 450],
  cardTall: [700, 930],
  square: [600, 600],
  fifty: [1000, 750],
  showcase: [1200, 750],
  thumb: [400, 225],
  avatar: [160, 160],
  banner: [1600, 600],
}

/**
 * Resolve a registry name to { src, alt } ready to spread onto an <img>.
 * Unknown names fall back to a neutral office photo rather than rendering a
 * broken image, and warn in development so the typo is still noticed.
 */
export const img = (name, shape = 'card') => {
  const entry = LIBRARY[name]
  if (!entry) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[landingImages] unknown image "${name}", falling back to businessOffice`)
    }
    return img('businessOffice', shape)
  }
  const [w, h] = SHAPES[shape] || SHAPES.card
  return { src: buildSrc(entry.id, w, h), alt: entry.alt, loading: 'lazy', decoding: 'async' }
}

/** Same as img(), but eager — use for anything above the fold. */
export const heroImg = (name, shape = 'hero') => ({ ...img(name, shape), loading: 'eager', fetchpriority: 'high' })

/** Raw URL only, for CSS background-image style props. */
export const imgUrl = (name, shape = 'card') => img(name, shape).src

export const imageNames = Object.keys(LIBRARY)

export default LIBRARY
