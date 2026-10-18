import { createContext, useContext } from 'react'

// What the signed-in user may do in the module, as the server worked it out.
// Screens ask `can('reports.export')` or `canReport('stock')` to decide what
// to show. The server checks every request itself; this only hides what a
// user could not use. Outside the module's page (tests, for one) everything
// is allowed, which is also what a workspace admin gets.

const everything = { admin: true, saved: false, tabs: [], actions: [], reports: { all: true, custom: true, domains: [], keys: [] } }

/** The questions a screen asks, made from the server's summary. */
export const makeAccess = (summary) => {
    const access = summary || everything
    const tabs = new Set(access.tabs || [])
    const actions = new Set(access.actions || [])
    const reports = access.reports || everything.reports
    return {
        ...access,
        canTab: (key) => access.admin || tabs.has(key),
        can: (key) => access.admin || actions.has(key),
        canReport: (key, domain) => {
            if (access.admin || reports.all) return true
            if (String(key).startsWith('custom:')) return !!reports.custom
            return (reports.keys || []).includes(key) || (reports.domains || []).includes(domain)
        },
    }
}

const AccessContext = createContext(makeAccess(null))

export const BCAccessProvider = AccessContext.Provider
export const useBCAccess = () => useContext(AccessContext)
