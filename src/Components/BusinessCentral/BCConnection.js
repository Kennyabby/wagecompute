import { useEffect, useMemo, useState } from 'react'
import { formatDateTime } from './bcFormat'

const GROUP_LABEL = { ledger: 'Ledgers', master: 'Master data', document: 'Open documents', postedDocument: 'Posted documents' }
const GROUP_ORDER = ['ledger', 'master', 'document', 'postedDocument']

const emptyForm = {
    name: '',
    baseUrl: '',
    authType: 'ntlm',
    domain: '',
    username: '',
    password: '',
    company: '',
    branchDimension: 'none',
    inferBranch: true,
    autoSync: true,
    syncIntervalMinutes: 60,
    verifyIntervalHours: 24,
    documentsFrom: '',
    storageMode: 'live',
}

const formFrom = (connection) => (connection ? {
    ...emptyForm,
    ...Object.fromEntries(Object.keys(emptyForm).filter((key) => connection[key] !== undefined).map((key) => [key, connection[key]])),
    password: '',
} : emptyForm)

// 'dim1Code' -> 'Dim 1 code', 'itemLedgerEntryNo' -> 'Item ledger entry no'
const fieldLabel = (name) => {
    const words = name.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/([0-9])([A-Za-z])/g, '$1 $2').toLowerCase()
    return words.charAt(0).toUpperCase() + words.slice(1)
}

const datasetStatus = (config, dataset) => {
    const page = dataset?.page ? ` (page ${dataset.page})` : ''
    if (!config) return { tone: 'muted', text: `Not discovered yet${page}` }
    if (!config.available) return { tone: 'muted', text: `No published page with this name${page}` }
    if (config.missingRequired?.length) return { tone: 'error', text: `Required fields not found: ${config.missingRequired.join(', ')}` }
    if (config.missing?.length) return { tone: 'warn', text: `Ready. ${config.missing.length} optional field${config.missing.length === 1 ? '' : 's'} not found` }
    return { tone: 'ok', text: 'Ready' }
}

// Field mapping for one dataset: which Business Central field feeds each
// field the reports use. Only opened when something needs correcting.
const FieldMapping = ({ dataset, config, onSave, busy }) => {
    const [overrides, setOverrides] = useState({})
    const changed = Object.keys(overrides).length > 0

    return (
        <div className='bc-mapping'>
            <p className='bc-muted'>
                Each row is a value the reports use, and the Business Central field it is read from.
                Fields marked required must be mapped before this table can sync.
            </p>
            <div className='bc-mapping-grid'>
                {dataset.fields.map((field) => {
                    const current = overrides[field.name] !== undefined ? overrides[field.name] : (config.fieldMap?.[field.name] || '')
                    const required = dataset.required.includes(field.name)
                    return (
                        <label key={field.name} className='bc-field'>
                            <span className='bc-field-label'>{fieldLabel(field.name)}{required ? ' (required)' : ''}</span>
                            <select
                                className={`bc-input ${!current && required ? 'bc-input-error' : ''}`}
                                value={current}
                                onChange={(event) => setOverrides({ ...overrides, [field.name]: event.target.value })}
                            >
                                <option value=''>Not mapped</option>
                                {(config.bcFields || []).map((bcField) => <option key={bcField.name} value={bcField.name}>{bcField.name}</option>)}
                            </select>
                        </label>
                    )
                })}
            </div>
            <button type='button' className='bc-button bc-button-primary' disabled={!changed || busy} onClick={() => onSave({ overrides }).then(() => setOverrides({}))}>
                Save mapping
            </button>
        </div>
    )
}

// The server and sign-in of an existing connection, for adding another
// company on the same server without typing them again.
const SHARED_FIELDS = ['baseUrl', 'authType', 'domain', 'username', 'branchDimension']
const sharedFrom = (source) => (source ? Object.fromEntries(SHARED_FIELDS.filter((key) => source[key] !== undefined).map((key) => [key, source[key]])) : {})

/**
 * Settings of one connection. With `adding`, the form is for a new one:
 * `template` is the connection it can borrow the server and stored password
 * from, and `onCreated` is told the new connection's id once it is saved.
 */
const BCConnection = ({ api, connection, datasets, secretsConfigured, syncRunning, onChanged, notify, adding = false, template = null, onCreated, onCancel }) => {
    const [sameServer, setSameServer] = useState(adding && !!template)
    const [form, setForm] = useState(() => (adding ? { ...emptyForm, ...(template ? sharedFrom(template) : {}) } : formFrom(connection)))
    const [companies, setCompanies] = useState(connection?.company ? [connection.company] : [])
    // What the server needs to know when the form is for a new connection.
    const target = adding ? { id: 'new', ...(sameServer && template ? { copyFrom: template.id } : {}) } : {}
    // Only the first connection made can keep a stored copy.
    const canStore = adding ? !template : connection?.primary !== false
    const [busy, setBusy] = useState('')
    const [testResult, setTestResult] = useState(null)
    const [openDataset, setOpenDataset] = useState('')
    const [purge, setPurge] = useState(false)
    const [confirmRemove, setConfirmRemove] = useState(false)

    // Follows the saved connection when it changes. A form for a new
    // connection has nothing saved to follow and keeps what was typed.
    useEffect(() => { if (!adding) setForm(formFrom(connection)) }, [connection?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

    // A test result only describes the server settings it was run with, so it
    // is cleared when one of those changes and kept when a sync setting does.
    const SERVER_FIELDS = ['baseUrl', 'authType', 'domain', 'username', 'password']
    const set = (patch) => {
        setForm((current) => ({ ...current, ...patch }))
        if (Object.keys(patch).some((key) => SERVER_FIELDS.includes(key))) setTestResult(null)
    }
    const insecure = /^http:\/\//i.test(form.baseUrl.trim())
    const locked = !!busy || syncRunning

    const act = async (name, work) => {
        setBusy(name)
        try {
            await work()
        } catch (failure) {
            notify('error', failure.message)
        } finally {
            setBusy('')
        }
    }

    const test = () => act('test', async () => {
        try {
            const response = await api.testConnection(form, target)
            setCompanies(response.companies)
            setTestResult({ ok: true, text: `Connected. ${response.companies.length} compan${response.companies.length === 1 ? 'y' : 'ies'} found.` })
            if (!form.company && response.companies.length === 1) setForm((current) => ({ ...current, company: response.companies[0] }))
        } catch (failure) {
            setTestResult({ ok: false, text: failure.message })
        }
    })

    const save = () => act('save', async () => {
        const response = await api.saveConnection(form, target)
        if (adding && onCreated) await onCreated(response.connection.id)
        else await onChanged()
        if (response.discoverError) notify('error', `Saved, but the published pages could not be read: ${response.discoverError}`)
        else notify('success', form.company ? 'Connection saved and published pages read.' : 'Connection saved. Test it and choose a company to continue.')
    })

    const discover = () => act('discover', async () => {
        await api.discover()
        await onChanged()
        notify('success', 'Published pages re-read from Business Central.')
    })

    const saveDataset = (key, change) => act(`dataset-${key}`, async () => {
        await api.saveMapping({ [key]: change })
        await onChanged()
    })

    const remove = () => act('remove', async () => {
        await api.removeConnection(purge)
        setConfirmRemove(false)
        await onChanged()
        notify('success', purge ? 'Connection removed and synced data deleted.' : 'Connection removed. Synced data was kept.')
    })

    const grouped = useMemo(() => GROUP_ORDER.map((group) => ({
        group,
        rows: datasets.filter((dataset) => dataset.group === group),
    })), [datasets])

    const readyCount = datasets.filter((dataset) => {
        const config = connection?.datasets?.[dataset.key]
        return config?.available && config.enabled && !config.missingRequired?.length
    }).length

    return (
        <div className='bc-page'>
            {!secretsConfigured && (
                <div className='bc-banner bc-banner-error'>
                    This server cannot store Business Central passwords yet. The platform operator needs to set TENANT_SECRETS_KEY on the server.
                </div>
            )}
            {syncRunning && <div className='bc-banner bc-banner-info'>A sync is running. Connection settings can be changed when it finishes.</div>}

            <section className='bc-card'>
                <h3>{adding ? 'New Business Central connection' : 'Business Central server'}</h3>
                <p className='bc-muted'>
                    {adding
                        ? 'Another server, another sign-in, or another company on a server you already use. Each connection has its own dashboard and reports, and you switch between them at the top of the page.'
                        : 'The OData address of your Business Central server, and an account that can read the published pages. A dedicated account with a read-only permission set (such as D365 READ) is the safest choice.'}
                </p>
                {adding && template && (
                    <label className='bc-check'>
                        <input
                            type='checkbox'
                            checked={sameServer}
                            onChange={(event) => {
                                setSameServer(event.target.checked)
                                setForm((current) => ({ ...current, ...(event.target.checked ? sharedFrom(template) : { baseUrl: '', username: '', domain: '' }), password: '' }))
                                setTestResult(null)
                            }}
                        />
                        <span>Same server and sign-in as {template.name || template.company || 'the current connection'}, for another company on it</span>
                    </label>
                )}
                <div className='bc-form-grid'>
                    <label className='bc-field bc-field-wide'>
                        <span className='bc-field-label'>Name of this connection</span>
                        <input className='bc-input' maxLength={60} placeholder='Shown in the switcher. Blank uses the company name' value={form.name} onChange={(event) => set({ name: event.target.value })} />
                    </label>
                    <label className='bc-field bc-field-wide'>
                        <span className='bc-field-label'>OData address</span>
                        <input className='bc-input' placeholder='http://203.0.113.10:8080/bcodata' value={form.baseUrl} onChange={(event) => set({ baseUrl: event.target.value })} />
                    </label>
                    <label className='bc-field'>
                        <span className='bc-field-label'>Sign-in type</span>
                        <select className='bc-input' value={form.authType} onChange={(event) => set({ authType: event.target.value })}>
                            <option value='ntlm'>Windows account (NTLM)</option>
                            <option value='basic'>User name and web service access key (Basic)</option>
                        </select>
                    </label>
                    <label className='bc-field'>
                        <span className='bc-field-label'>{form.authType === 'ntlm' ? 'Domain or server name (optional)' : 'Domain (optional)'}</span>
                        <input
                            className='bc-input'
                            placeholder={form.authType === 'ntlm' ? "Blank uses the server's own name" : ''}
                            value={form.domain}
                            onChange={(event) => set({ domain: event.target.value })}
                        />
                    </label>
                    <label className='bc-field'>
                        <span className='bc-field-label'>User name</span>
                        <input className='bc-input' autoComplete='off' value={form.username} onChange={(event) => set({ username: event.target.value })} />
                    </label>
                    <label className='bc-field'>
                        <span className='bc-field-label'>{form.authType === 'ntlm' ? 'Password' : 'Web service access key'}</span>
                        <input
                            className='bc-input'
                            type='password'
                            autoComplete='new-password'
                            placeholder={connection?.hasPassword ? 'Saved. Leave blank to keep it' : (adding && sameServer ? 'Leave blank to use the saved one' : '')}
                            value={form.password}
                            onChange={(event) => set({ password: event.target.value })}
                        />
                    </label>
                </div>
                {insecure && (
                    <div className='bc-banner bc-banner-warn'>
                        This address uses http, so the account password and your data travel across the internet unencrypted.
                        Use an https address when the server supports it.
                    </div>
                )}
                <div className='bc-actions'>
                    <button type='button' className='bc-button' disabled={locked || !form.baseUrl || !form.username} onClick={test}>{busy === 'test' ? 'Testing...' : 'Test connection'}</button>
                    {testResult && <span className={`bc-status bc-status-${testResult.ok ? 'ok' : 'error'}`}>{testResult.text}</span>}
                </div>
            </section>

            <section className='bc-card'>
                <h3>Company and data</h3>
                <div className='bc-form-grid'>
                    <label className='bc-field'>
                        <span className='bc-field-label'>Company</span>
                        <select className='bc-input' value={form.company} onChange={(event) => set({ company: event.target.value })}>
                            <option value=''>{companies.length ? 'Choose a company' : 'Test the connection to list companies'}</option>
                            {companies.map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </label>
                    <label className='bc-field'>
                        <span className='bc-field-label'>Branch is held in</span>
                        <select className='bc-input' value={form.branchDimension} onChange={(event) => set({ branchDimension: event.target.value })}>
                            <option value='none'>We do not track branches</option>
                            <option value='dim1'>Global Dimension 1</option>
                            <option value='dim2'>Global Dimension 2</option>
                        </select>
                    </label>
                    {form.branchDimension !== 'none' && (
                        <label className='bc-check bc-field-wide' title='From the other lines of the same document, then from the location'>
                            <input type='checkbox' checked={form.inferBranch !== false} onChange={(event) => set({ inferBranch: event.target.checked })} />
                            <span>Work out the branch for entries posted without one, from their document or location</span>
                        </label>
                    )}
                    {canStore && (
                        <label className='bc-field bc-field-wide'>
                            <span className='bc-field-label'>Where reports get their data</span>
                            <select className='bc-input' value={form.storageMode} onChange={(event) => set({ storageMode: event.target.value })}>
                                <option value='live'>Read live from Business Central (nothing is stored in the database)</option>
                                <option value='stored'>Store a copy in the database and keep it in sync</option>
                            </select>
                        </label>
                    )}
                </div>

                {form.storageMode === 'live' ? (
                    <p className='bc-muted'>
                        Reports read from Business Central, so they are current and nothing from your ERP is kept in the database.
                        What has been read is remembered on the server between restarts, and only new or changed entries are fetched
                        after that. The very first report takes longer while the ledgers are read once.
                        {!canStore ? ' A stored copy in the database is available on the first connection only.' : ''}
                    </p>
                ) : (
                    <>
                        <div className='bc-banner bc-banner-warn'>
                            A stored copy takes database space in proportion to your history, roughly 2 KB for every ledger entry.
                            A company with a few hundred thousand entries needs several hundred megabytes, which is more than a
                            free database plan allows. Check the space available before switching this on.
                        </div>
                        <div className='bc-form-grid'>
                            <label className='bc-field'>
                                <span className='bc-field-label'>Load posted documents from</span>
                                <input type='date' className='bc-input' value={form.documentsFrom} onChange={(event) => set({ documentsFrom: event.target.value })} />
                            </label>
                            <label className='bc-field'>
                                <span className='bc-field-label'>Sync every (minutes)</span>
                                <input type='number' min={15} className='bc-input' value={form.syncIntervalMinutes} disabled={!form.autoSync} onChange={(event) => set({ syncIntervalMinutes: event.target.value })} />
                            </label>
                            <label className='bc-field'>
                                <span className='bc-field-label'>Full check for changes every (hours)</span>
                                <input type='number' min={0} className='bc-input' value={form.verifyIntervalHours} disabled={!form.autoSync} onChange={(event) => set({ verifyIntervalHours: event.target.value })} />
                            </label>
                            <label className='bc-check bc-field-toggle'>
                                <input type='checkbox' checked={form.autoSync} onChange={(event) => set({ autoSync: event.target.checked })} />
                                <span>Sync automatically</span>
                            </label>
                        </div>
                        <p className='bc-muted'>
                            With a stored copy, reports work while Business Central is offline, and the Changes page records every
                            difference found between Business Central and the copy. Untick "Sync automatically" to sync only when
                            someone presses Sync now. Ledgers always load their full history, so opening balances are right; the
                            posted documents date only limits how far back invoices, shipments, receipts and credit memos go.
                        </p>
                    </>
                )}
                <div className='bc-actions'>
                    <button type='button' className='bc-button bc-button-primary' disabled={locked || !secretsConfigured || !form.baseUrl || !form.username} onClick={save}>{busy === 'save' ? 'Saving...' : (adding ? 'Add connection' : 'Save connection')}</button>
                    {adding && onCancel && <button type='button' className='bc-button' disabled={!!busy} onClick={onCancel}>Cancel</button>}
                    {connection?.updatedAt && <span className='bc-muted'>Last saved {formatDateTime(connection.updatedAt)}{connection.updatedBy ? ` by ${connection.updatedBy}` : ''}</span>}
                </div>
            </section>

            {connection && (
                <section className='bc-card'>
                    <div className='bc-sync-actions'>
                        <div>
                            <h3>Published pages</h3>
                            <p className='bc-muted'>
                                {connection.discoveredAt
                                    ? `${readyCount} of ${datasets.length} tables are ready to use. Last read from Business Central ${formatDateTime(connection.discoveredAt)}.`
                                    : 'Choose a company and save to read the list of published pages.'}
                            </p>
                        </div>
                        <button type='button' className='bc-button' disabled={locked || !connection.company} onClick={discover}>{busy === 'discover' ? 'Reading...' : 'Discover again'}</button>
                    </div>

                    {connection.discoveredAt && grouped.map(({ group, rows }) => (
                        <div key={group} className='bc-dataset-group'>
                            <h4>{GROUP_LABEL[group]}</h4>
                            <div className='bc-table-scroll'>
                                <table className='bc-table'>
                                    <thead><tr><th>Use</th><th>Table</th><th>Published page (service name)</th><th>Status</th><th /></tr></thead>
                                    <tbody>
                                        {rows.map((dataset) => {
                                            const config = connection.datasets?.[dataset.key]
                                            const status = datasetStatus(config, dataset)
                                            const isOpen = openDataset === dataset.key
                                            return [
                                                <tr key={dataset.key}>
                                                    <td>
                                                        <input
                                                            type='checkbox'
                                                            aria-label={`Use ${dataset.label}`}
                                                            checked={!!config?.enabled}
                                                            disabled={locked || !config?.available}
                                                            onChange={(event) => saveDataset(dataset.key, { enabled: event.target.checked })}
                                                        />
                                                    </td>
                                                    <td>{dataset.label}</td>
                                                    <td>
                                                        <select
                                                            className='bc-input'
                                                            aria-label={`Published page for ${dataset.label}`}
                                                            value={config?.available ? config.service : ''}
                                                            disabled={locked}
                                                            onChange={(event) => event.target.value && saveDataset(dataset.key, { service: event.target.value })}
                                                        >
                                                            <option value=''>{config?.available ? '' : `Not found (expected ${config?.service || dataset.defaultService})`}</option>
                                                            {(connection.services || []).map((service) => <option key={service} value={service}>{service}</option>)}
                                                        </select>
                                                    </td>
                                                    <td><span className={`bc-status bc-status-${status.tone}`}>{status.text}</span></td>
                                                    <td>
                                                        {config?.available && (
                                                            <button type='button' className='bc-link-button' aria-expanded={isOpen} onClick={() => setOpenDataset(isOpen ? '' : dataset.key)}>
                                                                {isOpen ? 'Close' : 'Fields'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>,
                                                isOpen && (
                                                    <tr key={`${dataset.key}-fields`}>
                                                        <td colSpan={5}>
                                                            <FieldMapping dataset={dataset} config={config} busy={locked} onSave={(change) => saveDataset(dataset.key, change)} />
                                                        </td>
                                                    </tr>
                                                ),
                                            ]
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {connection && (
                <section className='bc-card'>
                    <h3>Remove connection</h3>
                    <p className='bc-muted'>Forgets the address and password of {connection.name || connection.company || 'this connection'}. Its reports stop working until it is set up again. Other connections are not affected.</p>
                    {!confirmRemove ? (
                        <button type='button' className='bc-button bc-button-danger' disabled={locked} onClick={() => setConfirmRemove(true)}>Remove connection</button>
                    ) : (
                        <div className='bc-confirm'>
                            {connection.primary !== false && (
                                <label className='bc-check'>
                                    <input type='checkbox' checked={purge} onChange={(event) => setPurge(event.target.checked)} />
                                    <span>Also delete any data copied from Business Central, including the change history</span>
                                </label>
                            )}
                            <div className='bc-actions'>
                                <button type='button' className='bc-button bc-button-danger' disabled={locked} onClick={remove}>{busy === 'remove' ? 'Removing...' : (purge ? 'Remove and delete data' : 'Remove, keep data')}</button>
                                <button type='button' className='bc-button' disabled={!!busy} onClick={() => setConfirmRemove(false)}>Keep connection</button>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}

export default BCConnection
