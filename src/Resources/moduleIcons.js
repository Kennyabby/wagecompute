// Single source of truth for "which icon represents this module" — every
// module-selection UI in the app (signup, billing, central admin, the
// public pricing calculator) should look like the sidebar (SideNav.js),
// not invent its own icon per screen. Keys match moduleCatalog.js's real
// MODULE_CATALOG keys exactly (wageserver/UserModule/Billing/moduleCatalog.js)
// so any picker can just do `MODULE_ICONS[app.key]`.
//
// Icon choices for every key below (except reports/epsilon) are copied
// verbatim from SideNav.js's own navItems icon assignments — deliberately
// NOT refactored to import from here, since it's a complex, already-working
// nav component and this file's whole job is to match its existing look,
// not risk changing it. reports has no sidebar nav entry today, so its icon
// is new, chosen to fit the same react-icons sets already in use elsewhere
// in this file. epsilon uses the actual Epsilon brand mark (the same "ε"
// glyph the chat launcher renders, see Components/Epsilon/Epsilon.css
// .epsilon-mark) rather than a generic react-icons AI/robot glyph, so every
// picker/nav/marketing surface shows the same real mark as the product.
import { BiSolidDashboard } from 'react-icons/bi'
import { BsTable } from 'react-icons/bs'
import { FaUsers, FaHotel, FaBoxes, FaHandshake } from 'react-icons/fa'
import { SiPayloadcms } from 'react-icons/si'
import { MdInventory, MdSubject, MdDeliveryDining, MdAssessment } from 'react-icons/md'
import { GiPayMoney, GiPlayerTime, GiBuyCard, GiExpense } from 'react-icons/gi'
import { RiSettings2Fill } from 'react-icons/ri'
import { CgArrangeBack } from 'react-icons/cg'
import EpsilonMark from './EpsilonMark'

const MODULE_ICONS = {
  dashboard: BiSolidDashboard,
  settings: RiSettings2Fill,
  employees: FaUsers,
  departments: MdSubject,
  positions: CgArrangeBack,
  attendance: GiPlayerTime,
  payroll: SiPayloadcms,
  inventory: MdInventory,
  purchase: GiBuyCard,
  assets: FaBoxes,
  sales: GiPayMoney,
  delivery: MdDeliveryDining,
  pos: GiPayMoney,
  'business-partners': FaHandshake,
  accommodations: FaHotel,
  expenses: GiExpense,
  journals: BsTable,
  reports: MdAssessment,
  epsilon: EpsilonMark,
}

export default MODULE_ICONS
