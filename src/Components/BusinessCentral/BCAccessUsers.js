import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDateTime } from './bcFormat'

/**
 * Who may do what in the module, user by user. For admins.
 *
 * Users are still made in the workspace's own user settings, and given the
 * module there. Here each of them gets the tabs they may open, the reports
 * they may see and the things they may do. A user with nothing saved keeps
 * what everyone had before (all but the admin things) until saved here.
 */

const emptyAccess = () => ({ tabs: [], actions: [], reports: { all: false, custom: false, domains: [], keys: [] } })
const copy = (access) => JSON.parse(JSON.stringify(access || emptyAccess()))

/** Things that would not work together, said before saving. */
export const accessWarnings = (access) => {
    const warnings = []
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

const BCAccessUsers = ({ api, notify = () => {} }) => {
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
    const warnings = draft ? accessWarnings(draft) : []
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
                                <button key={preset.key} type='button' className='bc-button' onClick={() => setDraft(copy({ tabs: preset.tabs, actions: preset.actions, reports: { domains: [], keys: [], ...preset.reports } }))}>{preset.label}</button>
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
