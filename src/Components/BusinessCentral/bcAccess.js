import { createContext, useContext } from 'react'

// What the signed-in user may do in the module, as the server worked it out.
// Screens ask `can('reports.export')` or `canReport('stock')` to decide what
// to show. The server checks every request itself; this only hides what a
// user could not use. Outside the module's page (tests, for one) everything
// is allowed, which is also what a workspace admin gets.

export const NO_LIMITS = { filters: {}, period: 'any', backlog: true, window: null, locked: false, restricted: false }
const everything = { admin: true, saved: false, tabs: [], actions: [], reports: { all: true, custom: true, domains: [], keys: [] }, limits: NO_LIMITS }

/** The questions a screen asks, made from the server's summary. */
export const makeAccess = (summary) => {
    const access = summary || everything
    const tabs = new Set(access.tabs || [])
    const actions = new Set(access.actions || [])
    const reports = access.reports || everything.reports
    return {
        ...access,
        limits: access.limits || NO_LIMITS,
        canTab: (key) => access.admin || tabs.has(key),
        can: (key) => access.admin || actions.has(key),
        canReport: (key, domain) => {
            if (access.admin || reports.all) return true
            if (String(key).startsWith('custom:')) return !!reports.custom
            return (reports.keys || []).includes(key) || (reports.domains || []).includes(domain)
        },
    }
}

const clampDate = (value, window) => {
    if (!value || !window) return value
    if (value < window.start) return window.start
    if (value > window.end) return window.end
    return value
}

/**
 * Filter values kept to the user's limits, the same way the server keeps
 * them: a limited filter holds only the user's values, all of them when none
 * is chosen, and with earlier dates not allowed the dates stay inside the
 * period. Used after any values are set, so what the page shows is what the
 * report will be run with.
 */
export const keepToLimits = (values, filters, limits) => {
    if (!limits || !values) return values
    const next = { ...values }
    filters.forEach((filter) => {
        const allowed = limits.filters?.[filter.key]
        if (filter.type === 'multi' && allowed?.length) {
            const kept = (next[filter.key] || []).filter((value) => allowed.includes(value))
            next[filter.key] = kept.length ? kept : [...allowed]
        }
        if (limits.locked && limits.window) {
            if (filter.type === 'dateRange') {
                next.from = clampDate(next.from, limits.window)
                next.to = clampDate(next.to, limits.window)
                if (next.from && next.to && next.from > next.to) next.from = next.to
            } else if (filter.type === 'date') {
                next[filter.key] = clampDate(next[filter.key], limits.window)
            }
        }
    })
    return next
}

/**
 * Where a report opens for this user: their period instead of month to date,
 * and their values in the limited filters.
 */
export const startAtLimits = (values, filters, limits, today) => {
    if (!limits) return values
    const next = { ...values }
    if (limits.window && filters.some((filter) => filter.type === 'dateRange')) {
        next.from = limits.window.start
        next.to = limits.window.start === limits.window.end ? limits.window.end : today
    }
    return keepToLimits(next, filters, limits)
}

const AccessContext = createContext(makeAccess(null))

export const BCAccessProvider = AccessContext.Provider
export const useBCAccess = () => useContext(AccessContext)
