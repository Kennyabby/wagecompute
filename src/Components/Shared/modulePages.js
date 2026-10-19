// The pages a user can be sent to first after signing in. Each opens at
// '/<key>' and is reachable when the workspace has one of `modules` enabled
// and the user holds that same permission, the same rule SideNav uses for its
// menu. Kept in one place so the choice in Settings and the redirect after
// login cannot disagree about what a module is called or who can open it.
export const MODULE_PAGES = [
    { key: 'dashboard', label: 'Dashboard', modules: ['dashboard'] },
    { key: 'journals', label: 'Journals & COA', modules: ['journals', 'reports'] },
    { key: 'employees', label: 'Employees', modules: ['employees'] },
    { key: 'departments', label: 'Departments', modules: ['departments'] },
    { key: 'positions', label: 'Positions', modules: ['positions'] },
    { key: 'attendance', label: 'Attendance', modules: ['attendance'] },
    { key: 'payroll', label: 'Payroll', modules: ['payroll'] },
    { key: 'inventory', label: 'Inventory', modules: ['inventory'] },
    { key: 'assets', label: 'Assets', modules: ['assets'] },
    { key: 'sales', label: 'Sales', modules: ['sales'] },
    { key: 'business-partners', label: 'Customers & Vendors', modules: ['business-partners'] },
    { key: 'pos', label: 'POS', modules: ['pos'] },
    { key: 'delivery', label: 'Order Delivery', modules: ['delivery'] },
    { key: 'accommodations', label: 'Accommodation', modules: ['accommodations'] },
    { key: 'purchase', label: 'Direct Purchase', modules: ['purchase'] },
    { key: 'expenses', label: 'Admin Expenses', modules: ['expenses'] },
    { key: 'business-central', label: 'Business Central', modules: ['business-central'] },
    { key: 'settings', label: 'Settings', modules: ['settings'] },
]

const isAdminRecord = (record) => record?.status === 'admin' || record?.access === 'admin' || (record?.permissions || []).includes('all')

/**
 * The pages someone with these permissions could open. `enabledModules` is
 * the workspace's list; when it is not known yet, permissions alone decide,
 * and the page itself still refuses a module the workspace does not have.
 */
export const openablePages = ({ permissions = [], admin = false } = {}, enabledModules) => {
    const held = new Set(permissions)
    const all = admin || held.has('all')
    return MODULE_PAGES.filter((page) => page.modules.some((module) => (
        (!enabledModules || enabledModules.includes(module)) && (all || held.has(module))
    )))
}

/**
 * The path to open first for this signed-in record, from the default module
 * chosen for it in Settings. Null when none was chosen, or the user can no
 * longer open it, so the caller keeps its usual behaviour.
 */
export const landingPathOf = (record, enabledModules) => {
    const key = record?.defaultModule
    if (!key) return null
    const reachable = openablePages({ permissions: record.permissions || [], admin: isAdminRecord(record) }, enabledModules)
    return reachable.some((page) => page.key === key) ? `/${key}` : null
}
