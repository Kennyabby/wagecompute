// Decides which address a report export prints.
//
// Addresses are kept once, on the company profile (`reportAddresses`), each
// linked to the branches and locations it serves. An export filtered to a
// branch takes that branch's address, otherwise the address of its location,
// otherwise the user is asked. Every exporter goes through this file, so a new
// report only has to say what it is filtered to.
//
// This is a plain module and not a hook because the exporters are plain
// functions, many of them outside any component. The prompt itself lives in
// Components/Shared/ExportAddressPrompt.js, which binds itself here.

const clean = (value) => String(value ?? '').trim()
const sameText = (value) => clean(value).toLowerCase()

let companyProfile = null
let promptBinding = null

export const setAddressProfile = (profile) => { companyProfile = profile || null }
export const bindAddressPrompt = (binding) => { promptBinding = binding || null }

/** The address on the company profile, as one more choice in the list. */
export const companyAddressOption = (company) => {
    const address = [company?.address, company?.city, company?.state, company?.country].map(clean).filter(Boolean).join(', ')
    return address ? { id: 'company', label: 'Company address', address, phone: clean(company?.phone), email: clean(company?.email) } : null
}

export const addressOptions = (company) => [
    ...(Array.isArray(company?.reportAddresses) ? company.reportAddresses : []).filter((entry) => clean(entry?.address)),
    companyAddressOption(company),
].filter(Boolean)

// A filter set to "all" is the same as no filter. A description written for a
// file header holds several values as one comma-joined string.
const IS_ALL = new Set(['', 'all', 'any', 'none'])
const valuesOf = (value) => {
    if (Array.isArray(value)) return value.flatMap(valuesOf)
    if (typeof value !== 'string' && typeof value !== 'number') return []
    return String(value).split(',').map(clean).filter((entry) => !IS_ALL.has(entry.toLowerCase()))
}

// Case matters here: "Allocation" must not read as a location.
const BRANCH_NAME = /\bbranch|Branch/
const LOCATION_NAME = /\blocation|Location|\bwarehouse|Warehouse|\bwrh\b/

const merge = (a = {}, b = {}) => ({
    branch: [...new Set([...valuesOf(a.branch), ...valuesOf(b.branch)])],
    location: [...new Set([...valuesOf(a.location), ...valuesOf(b.location)])],
})

/** Reads a report's filters, by key or label, for its branch and location. */
export const whereFromFilters = (filters = {}) => {
    const where = { branch: [], location: [] }
    Object.entries(filters || {}).forEach(([key, value]) => {
        if (BRANCH_NAME.test(key)) where.branch.push(...valuesOf(value))
        else if (LOCATION_NAME.test(key)) where.location.push(...valuesOf(value))
    })
    return merge(where)
}

// A built report's parameters are named p0, p1 and so on, so its filters are
// read by their label and lookup. The values are the codes, which a description
// written for people may not be.
export const whereFromDefinition = (definition, params = {}) => {
    const where = { branch: [], location: [] }
    ;(definition?.filters || []).forEach((filter) => {
        const name = `${filter.key || ''} ${filter.label || ''} ${filter.lookup || ''}`
        if (BRANCH_NAME.test(name)) where.branch.push(...valuesOf(params[filter.key]))
        else if (LOCATION_NAME.test(name)) where.location.push(...valuesOf(params[filter.key]))
    })
    return merge(where, whereFromFilters(params))
}

export const mergeWhere = merge

// Several values count only when they all lead to the same address. A report
// across two branches with different addresses belongs to neither.
const linkedAddress = (addresses, values, field) => {
    if (!values.length) return null
    const found = values.map((value) => addresses.find((entry) => (entry[field] || []).some((linked) => sameText(linked) === sameText(value))))
    return found.every((entry) => entry && entry.id === found[0].id) ? found[0] : null
}

/** The address a report's filters settle on, or null when the user must choose. */
export const addressForFilters = (company, where = {}) => {
    const { branch, location } = merge(where)
    const addresses = addressOptions(company)
    return linkedAddress(addresses, branch, 'branches') || linkedAddress(addresses, location, 'locations')
}

/**
 * Resolves with the address to print, `{ address: '' }` when the user goes on
 * without one, null when they cancel, or undefined with no prompt on the page.
 */
export const chooseExportAddress = async (where = {}, title = '') => {
    if (!promptBinding) return undefined
    // Another admin may have linked an address since this page loaded. If the
    // server is slow the export goes on with what is already known.
    try {
        await Promise.race([promptBinding.refresh(), new Promise((resolve) => { setTimeout(resolve, 2500) })])
    } catch (e) { /* keep what is already known */ }
    const settled = addressForFilters(companyProfile, where)
    if (settled) return settled
    return promptBinding.ask({ options: addressOptions(companyProfile), where: merge(where), title })
}

/** The letterhead with the chosen address on it, or null when cancelled. */
export const letterheadFor = async (companyInfo = {}, where = {}, title = '') => {
    const chosen = await chooseExportAddress(where, title)
    if (chosen === null) return null
    if (chosen === undefined) return companyInfo
    return {
        ...companyInfo,
        address: chosen.address || '',
        phone: chosen.phone || companyInfo.phone || '',
        email: chosen.email || companyInfo.email || '',
    }
}

/**
 * For a PDF drawn from what is on the screen: puts the chosen address into the
 * element's `data-report-address` line while `render` runs, then puts it back.
 * The original text nodes are moved aside and restored because React still
 * holds them; replacing them would stop that line updating afterwards. A line
 * kept off the screen (`display: none`) is shown only for the file.
 */
export const withReportAddress = async (element, where, title, render) => {
    const chosen = await chooseExportAddress(where, title)
    if (chosen === null) return false
    if (chosen === undefined) { await render(); return true }
    const restores = []
    const swap = (selector, text) => {
        (element?.querySelectorAll(selector) || []).forEach((node) => {
            const kept = Array.from(node.childNodes)
            const display = node.style.display
            node.replaceChildren(document.createTextNode(text))
            if (display === 'none') node.style.display = ''
            restores.push(() => { node.replaceChildren(...kept); node.style.display = display })
        })
    }
    swap('[data-report-address]', chosen.address ? `Address: ${chosen.address}` : '')
    if (chosen.email) swap('[data-report-email]', `Email: ${chosen.email}`)
    if (chosen.phone) swap('[data-report-phone]', `Phone: ${chosen.phone}`)
    // A receipt keeps phone and email on one line, and each falls back on its own.
    if (chosen.phone || chosen.email) {
        (element?.querySelectorAll('[data-report-contact]') || []).forEach((node) => {
            const kept = Array.from(node.childNodes)
            node.replaceChildren(document.createTextNode(`Phone: ${chosen.phone || node.dataset.contactPhone}, Email: ${chosen.email || node.dataset.contactEmail}`))
            restores.push(() => node.replaceChildren(...kept))
        })
    }
    try {
        await render()
    } finally {
        restores.forEach((restore) => restore())
    }
    return true
}
