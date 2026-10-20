import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDateTime } from './bcFormat'
import { MultiSelect } from './BCFilterBar'

/**
 * Who may do what in the module, user by user. For admins.
 *
 * Users are still made in the workspace's own user settings, and given the
 * module there. Here each of them gets the tabs they may open, the reports
 * they may see and the things they may do. A user with nothing saved keeps
 * what everyone had before (all but the admin things) until saved here.
 */

const noLimits = () => ({ filters: {}, period: 'any', backlog: true })
const emptyAccess = () => ({ tabs: [], actions: [], reports: { all: false, custom: false, domains: [], keys: [] }, limits: noLimits() })
const copy = (access) => {
    const made = JSON.parse(JSON.stringify(access || emptyAccess()))
    return { ...made, limits: { ...noLimits(), ...(made.limits || {}), filters: { ...(made.limits?.filters || {}) } } }
}

// Limits narrow what a user sees only where a filter can narrow it. These
// are the things that therefore close to them.
const limitedKeys = (limits) => Object.keys(limits?.filters || {}).filter((key) => limits.filters[key]?.length)
const datesLocked = (limits) => !!limits && limits.period !== 'any' && limits.backlog === false

/** Reports this user is given that their limits would take away, by title. */
export const reportsLostToLimits = (access, catalogue) => {
    const keys = limitedKeys(access.limits)
    if (!keys.length || !catalogue) return []
    const given = (report) => access.reports.all || access.reports.keys.includes(report.key) || access.reports.domains.includes(report.domain)
    return catalogue.reports.filter((report) => given(report) && keys.some((key) => !(report.filters || []).includes(key))).map((report) => report.title)
}

/** Things that would not work together, said before saving. */
export const accessWarnings = (access, catalogue) => {
    const warnings = []
    const limited = limitedKeys(access.limits)
    const restricted = limited.length > 0 || datesLocked(access.limits)
    const lost = reportsLostToLimits(access, catalogue)
    if (lost.length) warnings.push(`These reports cannot be narrowed to the limits below, so they will not open for this user: ${lost.slice(0, 8).join(', ')}${lost.length > 8 ? ` and ${lost.length - 8} more` : ''}.`)
    if (limited.some((key) => key !== 'locations' && key !== 'branches') && access.tabs.includes('dashboard')) warnings.push('The dashboard can only be narrowed by location and branch, so with these limits it will not open for this user.')
    else if (limited.length && access.tabs.includes('dashboard')) warnings.push('With limits, the dashboard leaves off the company-wide parts: general ledger, bank, VAT, and customer and vendor balances.')
    if (limited.length && (access.tabs.includes('changes') || access.tabs.includes('einvoice'))) warnings.push('The Changes and E-Invoicing tabs list everything, whatever the limits, so they are closed to a user with limits.')
    if (restricted && (access.reports.custom || access.actions.some((key) => key.startsWith('builder.')))) warnings.push('Built reports and the report builder can read past any limit, so they are closed to a user with limits or with earlier dates refused.')
    const has = (key) => access.actions.includes(key)
    const someReports = access.reports.all || access.reports.custom || access.reports.domains.length > 0 || access.reports.keys.length > 0
    if (someReports && !access.tabs.includes('reports') && !access.tabs.includes('dashboard') && !access.tabs.includes('transactions')) warnings.push('Reports are chosen, but none of the Reports, Dashboard or Transactions tabs is, so they cannot be opened.')
    if (access.tabs.includes('reports') && !someReports) warnings.push('The Reports tab is chosen but no reports are, so it will be empty.')
    if ((has('reports.edit') || has('recon.import') || has('recon.configure') || has('reports.export')) && !someReports) warnings.push('Report actions are chosen but no reports are, so there is nothing to use them on.')
    if (has('builder.save') && !has('builder.use')) warnings.push('Saving built reports needs the report builder too.')
    if ((has('builder.use') || has('builder.save')) && !access.reports.custom) warnings.push('The report builder is allowed but built reports are not visible, so saved reports will not show in the list.')
    if ((has('sync.run') || has('sync.full') || has('sync.rebuild')) && !access.tabs.includes('data')) warnings.push('Sync actions are chosen without the Data Sync tab. The Sync now button in the header still works.')
    if ((has('einvoice.send') || has('einvoice.setup')) && !access.tabs.includes('einvoice')) warnings.push('E-invoicing actions are chosen without the E-Invoicing tab, so they cannot be reached.')
    return warnings
}

const BCAccessUsers = ({ api, notify = () => {}, lookups = null }) => {
    const [catalogue, setCatalogue] = useState(null)
    const [users, setUsers] = useState(null)
    const [error, setError] = useState('')
    const [chosen, setChosen] = useState('')
    const [draft, setDraft] = useState(null)
    const [search, setSearch] = useState('')
    const [showAll, setShowAll] = useState(false)
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        try {
            const [offered, listed] = await Promise.all([api.getAccessCatalogue(), api.getAccessUsers()])
            setCatalogue(offered)
            setUsers(listed.users)
        } catch (failure) { setError(failure.message) }
    }, [api])
    useEffect(() => { load() }, [load])

    const user = (users || []).find((entry) => entry.email === chosen) || null
    const pick = (entry) => {
        setChosen(entry.email)
        // Nothing saved: start from what the user has now.
        setDraft(copy(entry.access || catalogue.asBefore))
    }
    const reportsByDomain = useMemo(() => (catalogue ? catalogue.domains.map((domain) => ({ ...domain, reports: catalogue.reports.filter((report) => report.domain === domain.key) })).filter((domain) => domain.reports.length) : []), [catalogue])
    const actionGroups = useMemo(() => (catalogue ? [...new Set(catalogue.actions.map((action) => action.group))].map((group) => ({ group, actions: catalogue.actions.filter((action) => action.group === group) })) : []), [catalogue])

    if (error && !catalogue) return <div className='bc-banner bc-banner-error'>{error}</div>
    if (!catalogue || !users) return <p className='bc-empty'>Loading users...</p>

    const shown = users.filter((entry) => (showAll || entry.hasModule) && `${entry.name} ${entry.email}`.toLowerCase().includes(search.trim().toLowerCase()))
    const toggle = (list, value, on) => (on ? [...new Set([...list, value])] : list.filter((entry) => entry !== value))
    const setTab = (key, on) => setDraft({ ...draft, tabs: toggle(draft.tabs, key, on) })
    const setAction = (key, on) => setDraft({ ...draft, actions: toggle(draft.actions, key, on) })
    const setReports = (patch) => setDraft({ ...draft, reports: { ...draft.reports, ...patch } })
    const setLimits = (patch) => setDraft({ ...draft, limits: { ...draft.limits, ...patch } })
    const setLimitValues = (key, values) => {
        const filters = { ...draft.limits.filters }
        if (values.length) filters[key] = values
        else delete filters[key]
        setLimits({ filters })
    }
    const statusOf = (entry) => {
        if (entry.admin) return ['Admin: everything', 'ok']
        if (!entry.hasModule) return ['No Business Central', 'muted']
        if (!entry.access) return ['As before', 'info']
        return ['Set here', 'warn']
    }

    const save = async () => {
        setBusy(true)
        try {
            await api.saveAccess(user.email, draft)
            notify('success', `Saved. ${user.name} has this access from their next click.`)
            await load()
        } catch (failure) { notify('error', failure.message) } finally { setBusy(false) }
    }
    const reset = async () => {
        if (!window.confirm(`Put ${user.name} back to what everyone had before access was set per user?`)) return
        setBusy(true)
        try {
            await api.resetAccess(user.email)
            notify('success', `${user.name} is back to the access everyone had before.`)
            await load()
            setDraft(copy(catalogue.asBefore))
        } catch (failure) { notify('error', failure.message) } finally { setBusy(false) }
    }
    const warnings = draft ? accessWarnings(draft, catalogue) : []
    const others = users.filter((entry) => entry.access && entry.email !== chosen)

    return (
        <div className='bc-access'>
            <section className='bc-card bc-access-users'>
                <h3>Users</h3>
                <p className='bc-muted'>Users are added in the workspace's user settings and given Business Central there. Choose one to set what they may do here.</p>
                <input className='bc-input' aria-label='Search users' placeholder='Search by name or email' value={search} onChange={(event) => setSearch(event.target.value)} />
                <label className='bc-einv-switch'><input type='checkbox' checked={showAll} onChange={(event) => setShowAll(event.target.checked)} /><span>Show users without Business Central</span></label>
                <ul className='bc-access-list'>
                    {shown.map((entry) => {
                        const [label, tone] = statusOf(entry)
                        return (
                            <li key={entry.email}>
                                <button type='button' className={`bc-access-user${entry.email === chosen ? ' active' : ''}`} onClick={() => pick(entry)}>
                                    <strong>{entry.name}</strong>
                                    <span className='bc-muted'>{entry.email}</span>
                                    <span className={`bc-status bc-status-${tone}`}>{label}</span>
                                </button>
                            </li>
                        )
                    })}
                    {!shown.length && <li className='bc-muted'>No users match.</li>}
                </ul>
            </section>

            <section className='bc-card bc-access-editor'>
                {!user && <p className='bc-empty'>Choose a user.</p>}
                {user && user.admin && (
                    <>
                        <h3>{user.name}</h3>
                        <p className='bc-muted'>Admins of the workspace can do everything in Business Central. To limit what this person can do, change their role in the workspace's user settings first.</p>
                    </>
                )}
                {user && !user.admin && !user.hasModule && (
                    <>
                        <h3>{user.name}</h3>
                        <p className='bc-muted'>This user does not have Business Central. Give it to them in the workspace's user settings, then set their access here.</p>
                    </>
                )}
                {user && !user.admin && user.hasModule && draft && (
                    <>
                        <div className='bc-report-head'>
                            <div>
                                <h3>{user.name}</h3>
                                <p className='bc-muted'>
                                    {user.access ? `Set ${user.access.updatedAt ? formatDateTime(user.access.updatedAt) : ''}${user.access.updatedBy ? ` by ${user.access.updatedBy}` : ''}.` : 'Nothing saved yet: shown below is what they have now, the access everyone had before.'}
                                </p>
                            </div>
                        </div>

                        <div className='bc-access-presets'>
                            <span className='bc-field-label'>Start from</span>
                            {catalogue.presets.map((preset) => (
                                <button key={preset.key} type='button' className='bc-button' onClick={() => setDraft(copy({ tabs: preset.tabs, actions: preset.actions, reports: { domains: [], keys: [], ...preset.reports }, limits: draft.limits }))}>{preset.label}</button>
                            ))}
                            {others.length > 0 && (
                                <select className='bc-input' aria-label='Copy access from another user' value='' onChange={(event) => { const from = others.find((entry) => entry.email === event.target.value); if (from) setDraft(copy(from.access)) }}>
                                    <option value=''>Copy from another user...</option>
                                    {others.map((entry) => <option key={entry.email} value={entry.email}>{entry.name}</option>)}
                                </select>
                            )}
                        </div>

                        <h4>Tabs</h4>
                        <div className='bc-recon-edit-checks'>
                            {catalogue.tabs.map((tab) => (
                                <label key={tab.key} className='bc-einv-switch' title={tab.hint || ''}>
                                    <input type='checkbox' checked={draft.tabs.includes(tab.key)} onChange={(event) => setTab(tab.key, event.target.checked)} />
                                    <span>{tab.label}{tab.hint ? <span className='bc-muted'> ({tab.hint})</span> : null}</span>
                                </label>
                            ))}
                        </div>

                        <h4>Reports</h4>
                        <div className='bc-access-presets'>
                            <label className='bc-einv-switch'><input type='radio' name='report-scope' checked={draft.reports.all} onChange={() => setReports({ all: true })} /><span>Every report</span></label>
                            <label className='bc-einv-switch'><input type='radio' name='report-scope' checked={!draft.reports.all} onChange={() => setReports({ all: false })} /><span>Only the ones chosen</span></label>
                            <label className='bc-einv-switch'><input type='checkbox' checked={draft.reports.custom} onChange={(event) => setReports({ custom: event.target.checked })} /><span>Reports built in the report builder</span></label>
                        </div>
                        {!draft.reports.all && (
                            <div className='bc-access-domains'>
                                {reportsByDomain.map((domain) => {
                                    const whole = draft.reports.domains.includes(domain.key)
                                    return (
                                        <fieldset key={domain.key} className='bc-access-domain'>
                                            <legend>
                                                <label className='bc-einv-switch'>
                                                    <input type='checkbox' checked={whole} onChange={(event) => setReports({ domains: toggle(draft.reports.domains, domain.key, event.target.checked) })} />
                                                    <span>All {domain.label.toLowerCase()} reports</span>
                                                </label>
                                            </legend>
                                            {domain.reports.map((report) => (
                                                <label key={report.key} className='bc-einv-switch'>
                                                    <input type='checkbox' disabled={whole} checked={whole || draft.reports.keys.includes(report.key)} onChange={(event) => setReports({ keys: toggle(draft.reports.keys, report.key, event.target.checked) })} />
                                                    <span>{report.title}</span>
                                                </label>
                                            ))}
                                        </fieldset>
                                    )
                                })}
                            </div>
                        )}

                        {catalogue.limitFilters && (
                            <>
                                <h4>Limits</h4>
                                <p className='bc-muted'>Keep this user to some values. Their reports open with these and can only be narrowed further; nothing outside them is shown. Leave a filter empty for no limit.</p>
                                <div className='bc-access-limits'>
                                    {catalogue.limitFilters.map((filter) => {
                                        const options = lookups?.[filter.lookup] || []
                                        const chosen = draft.limits.filters[filter.key] || []
                                        // A list this company has nothing in is left off, unless a limit was already saved on it.
                                        if (lookups && !options.length && !chosen.length) return null
                                        return <MultiSelect key={filter.key} label={filter.label} options={options.length ? options : chosen.map((value) => ({ value, label: value }))} value={chosen} onChange={(values) => setLimitValues(filter.key, values)} />
                                    })}
                                    <label className='bc-field'>
                                        <span className='bc-field-label'>Period</span>
                                        <select className='bc-input' aria-label='Period' value={draft.limits.period} onChange={(event) => setLimits({ period: event.target.value })}>
                                            {catalogue.limitPeriods.map((period) => <option key={period.key} value={period.key}>{period.label}</option>)}
                                        </select>
                                    </label>
                                </div>
                                {draft.limits.period !== 'any' && (
                                    <label className='bc-einv-switch'>
                                        <input type='checkbox' checked={draft.limits.backlog !== false} onChange={(event) => setLimits({ backlog: event.target.checked })} />
                                        <span>Allow earlier dates<span className='bc-muted'> ({draft.limits.backlog !== false ? `reports open on ${draft.limits.period === 'day' ? 'today' : 'this month'}, and the user can choose earlier dates` : `the user sees ${draft.limits.period === 'day' ? 'today' : 'this month'} only, and earlier dates are refused`})</span></span>
                                    </label>
                                )}
                                {!lookups && <p className='bc-muted'>The lists of values load with the connection data. Open the Dashboard or a report once if they are empty.</p>}
                            </>
                        )}

                        <h4>What they may do</h4>
                        {actionGroups.map(({ group, actions }) => (
                            <div key={group} className='bc-access-group'>
                                <span className='bc-field-label'>{group}</span>
                                {actions.map((action) => (
                                    <label key={action.key} className='bc-einv-switch'>
                                        <input type='checkbox' checked={draft.actions.includes(action.key)} onChange={(event) => setAction(action.key, event.target.checked)} />
                                        <span>{action.label}{action.hint ? <span className='bc-muted'> ({action.hint})</span> : null}</span>
                                    </label>
                                ))}
                            </div>
                        ))}

                        {warnings.length > 0 && <ul className='bc-recon-map-warnings'>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
                        <div className='bc-einv-actions'>
                            <button type='button' className='bc-button bc-button-primary' disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save access'}</button>
                            {user.access && <button type='button' className='bc-button' disabled={busy} onClick={reset}>Back to as before</button>}
                        </div>
                    </>
                )}
            </section>
        </div>
    )
}

export default BCAccessUsers
