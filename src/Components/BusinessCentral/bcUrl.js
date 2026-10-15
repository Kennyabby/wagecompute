import { useCallback, useEffect, useState } from 'react'

// Where the reader is in the Business Central module (which tab, which
// report, which section) is kept in the query part of the address, so a
// refresh, a bookmark or a shared link lands in the same place and Back
// steps between tabs. The query part is used, not the path, because the app
// routes every module through one path segment and puts the reader back on
// that path after a refresh, carrying the query along.
const EVENT = 'bc:url'

export const readUrl = (key) => new URLSearchParams(window.location.search).get(key) || ''

/**
 * Changes several values at once, as one step in the browser history. A
 * blank value removes its key, so a default leaves the address clean.
 */
export const updateUrl = (changes, { replace = false } = {}) => {
    const params = new URLSearchParams(window.location.search)
    Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') params.delete(key)
        else params.set(key, String(value))
    })
    const query = params.toString()
    const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return
    window.history[replace ? 'replaceState' : 'pushState'](window.history.state, '', next)
    window.dispatchEvent(new Event(EVENT))
}

/**
 * One value kept in the address. `set(value, others)` also changes other keys
 * in the same step, which is how a tab clears the sub-tabs of the one left.
 */
export const useUrlState = (key, fallback = '') => {
    const [value, setValue] = useState(() => readUrl(key) || fallback)
    useEffect(() => {
        const sync = () => setValue(readUrl(key) || fallback)
        window.addEventListener('popstate', sync)
        window.addEventListener(EVENT, sync)
        return () => {
            window.removeEventListener('popstate', sync)
            window.removeEventListener(EVENT, sync)
        }
    }, [key, fallback])
    const set = useCallback((next, others = {}) => {
        setValue(next || fallback)
        updateUrl({ [key]: next === fallback ? '' : next, ...others })
    }, [key, fallback])
    return [value, set]
}

// Keys that belong to one tab of the module and mean nothing on another.
export const SUB_KEYS = { report: '', preset: '', builder: '', section: '', status: '' }
