import { useEffect, useMemo, useState } from 'react'
import { useBCAccess } from './bcAccess'

/**
 * The editor for a report that comes with the module. What the report works
 * out stays exactly as it is; on top of it a workspace can:
 *   - rename the report and its columns, hide columns and reorder them
 *   - add calculated columns, written like the report builder's formulas
 *   - keep only rows that meet conditions, and add filters the reader picks
 *   - switch reconciliation on or off and set how it works, or set one up
 *     for a report that has none of its own
 * "Back to the original" undoes all of it.
 */

const OPERATORS = [
    ['eq', 'is'], ['ne', 'is not'], ['contains', 'contains'], ['notcontains', 'does not contain'],
    ['gt', 'is more than'], ['gte', 'is at least'], ['lt', 'is less than'], ['lte', 'is at most'],
    ['blank', 'is blank'], ['notblank', 'is not blank'],
]
const FORMATS = [['number', 'Number'], ['qty', 'Quantity'], ['money', 'Money'], ['percent', 'Percent']]
const NUMERIC = ['number', 'qty', 'money', 'percent']
// Kinds whose advice can end in an adjustment, so the switch means something.
const ADJUSTING = ['stock', 'customers', 'vendors', 'accounts']
const TABS = [['columns', 'Columns'], ['calcs', 'Calculated columns'], ['filters', 'Filters'], ['reconcile', 'Reconciliation']]

// A key from the start, so a condition or a reconciliation can name the
// column before it is saved.
const emptyCalc = () => ({ key: `calc_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`, label: '', expression: '', format: 'number', total: false })

const BCCustomise = ({ api, definition, report, values, onSaved, onClose, notify }) => {
    const saved = definition.customised || {}
    // The parts of the editor this user may change: the report's look, its
    // reconciliation, or both. The server keeps the other part as it was.
    const { can } = useBCAccess()
    const mayEdit = can('reports.edit')
    const mayReconcile = can('recon.configure')
    const shownTabs = TABS.filter(([key]) => (key === 'reconcile' ? mayReconcile : mayEdit))
    const [tab, setTab] = useState(() => shownTabs[0]?.[0] || 'columns')
    // The report's own columns, without the calculated ones the editor adds.
    const ownColumns = useMemo(() => {
        const shown = (report?.columns || []).filter((column) => !column.calculated)
        const hidden = (saved.columns || []).filter((column) => column.hidden && !shown.some((entry) => entry.key === column.key) && !column.key.startsWith('calc_'))
        return [...shown.map(({ key, label, type }) => ({ key, label, type })), ...hidden.map((column) => ({ key: column.key, label: column.key, type: 'text' }))]
    }, [report, saved.columns])

    // Every column of the report, hidden ones included, in the saved order.
    const [columns, setColumns] = useState(() => {
        const kept = saved.columns || []
        const known = new Map(kept.map((column) => [column.key, column]))
        const current = (report?.columns || []).map((column) => ({ key: column.key, label: known.get(column.key)?.label || '', original: column.label, hidden: false }))
        const hiddenOnes = kept.filter((column) => column.hidden && !current.some((entry) => entry.key === column.key)).map((column) => ({ key: column.key, label: column.label, original: column.key, hidden: true }))
        const order = new Map(kept.map((column, index) => [column.key, index]))
        return [...current, ...hiddenOnes].sort((a, b) => (order.has(a.key) ? order.get(a.key) : 1000) - (order.has(b.key) ? order.get(b.key) : 1000))
    })
    const [title, setTitle] = useState(definition.originalTitle ? definition.title : '')
    const [keepFilters, setKeepFilters] = useState(Object.keys(definition.savedDefaults || {}).length > 0)
    const [calcs, setCalcs] = useState(() => (saved.calcs || []).map((calc) => ({ ...calc })))
    const [conditions, setConditions] = useState(() => (saved.conditions || []).map((condition) => ({ ...condition })))
    const [prompts, setPrompts] = useState(() => (saved.prompts || []).map((prompt) => ({ ...prompt })))
    const builtIn = definition.reconcileBuiltIn || null
    const [recon, setRecon] = useState(() => {
        const kept = saved.reconcile || {}
        return {
            enabled: kept.enabled === null || kept.enabled === undefined ? !!builtIn : kept.enabled,
            tolerance: kept.tolerance ?? '',
            windowDays: kept.windowDays ?? '',
            matchDays: kept.matchDays ?? '',
            allowAdjustments: kept.allowAdjustments !== false,
            required: kept.required || [],
            keyColumns: kept.keyColumns || [],
            compareColumns: kept.compareColumns || [],
            // null: every column, as the module comes.
            templateColumns: kept.templateColumns ?? null,
            transactionColumns: kept.transactionColumns ?? null,
            comparedColumns: kept.comparedColumns ?? null,
        }
    })
    const [reconColumns, setReconColumns] = useState(null)
    const [busy, setBusy] = useState(false)

    // The columns a built-in reconciliation reads, to choose required ones.
    useEffect(() => {
        if (!builtIn || tab !== 'reconcile' || reconColumns) return undefined
        let active = true
        api.reconcileColumns(builtIn.kind, report?.params || {}, definition.key, true)
            .then((answer) => { if (active) setReconColumns(answer.columns) })
            .catch((failure) => { if (active) notify('error', failure.message) })
        return () => { active = false }
    }, [api, builtIn, tab, reconColumns, report, definition.key, notify])

    // Every column a formula, condition or reconciliation can name.
    const allColumns = [...ownColumns, ...calcs.filter((calc) => calc.label).map((calc) => ({ key: calc.key, label: calc.label, type: calc.format }))]
    const numericColumns = allColumns.filter((column) => NUMERIC.includes(column.type))
    const textColumns = allColumns.filter((column) => !NUMERIC.includes(column.type))

    const update = (index, patch) => setColumns(columns.map((column, at) => (at === index ? { ...column, ...patch } : column)))
    const move = (index, step) => {
        const target = index + step
        if (target < 0 || target >= columns.length) return
        const next = [...columns]
        ;[next[index], next[target]] = [next[target], next[index]]
        setColumns(next)
    }
    const editList = (list, setList) => ({
        change: (index, patch) => setList(list.map((entry, at) => (at === index ? { ...entry, ...patch } : entry))),
        remove: (index) => setList(list.filter((_, at) => at !== index)),
    })
    const calcEdits = editList(calcs, setCalcs)
    const conditionEdits = editList(conditions, setConditions)
    const promptEdits = editList(prompts, setPrompts)
    const toggleIn = (list, entry, on) => (on ? [...list.filter((item) => item.key !== entry.key), entry] : list.filter((item) => item.key !== entry.key))

    // Dates are left out: a saved period would stop moving with the calendar.
    const datedKeys = new Set(definition.filters.filter((filter) => ['dateRange', 'date'].includes(filter.type)).flatMap((filter) => (filter.type === 'dateRange' ? ['from', 'to'] : [filter.key])))
    const defaults = Object.fromEntries(Object.entries(values || {}).filter(([key]) => !datedKeys.has(key) && !key.startsWith('cf_') && definition.filters.some((filter) => filter.key === key)))

    const save = async () => {
        setBusy(true)
        try {
            await api.customiseReport(definition.key, {
                title: title.trim(),
                columns: columns.map((column) => ({ key: column.key, label: column.label.trim(), hidden: column.hidden })),
                defaults: keepFilters ? defaults : {},
                knownColumns: ownColumns.map(({ key, label }) => ({ key, label })),
                calcs: calcs.filter((calc) => calc.label.trim() || calc.expression.trim()),
                conditions: conditions.filter((condition) => condition.column).map((condition) => ({ ...condition, label: allColumns.find((column) => column.key === condition.column)?.label || '' })),
                prompts: prompts.filter((prompt) => prompt.column).map((prompt) => ({ column: prompt.column, label: prompt.label.trim() || allColumns.find((column) => column.key === prompt.column)?.label || prompt.column })),
                reconcile: {
                    enabled: recon.enabled,
                    tolerance: recon.tolerance,
                    windowDays: recon.windowDays,
                    matchDays: recon.matchDays,
                    allowAdjustments: recon.allowAdjustments,
                    required: recon.required,
                    keyColumns: builtIn ? [] : recon.keyColumns,
                    compareColumns: builtIn ? [] : recon.compareColumns,
                    templateColumns: builtIn ? recon.templateColumns : null,
                    transactionColumns: builtIn ? recon.transactionColumns : null,
                    comparedColumns: builtIn ? recon.comparedColumns : null,
                },
            })
            notify('success', 'Saved. Everyone who opens this report sees it this way.')
            onSaved()
        } catch (failure) { notify('error', failure.message) } finally { setBusy(false) }
    }
    const reset = async () => {
        if (!window.confirm('Put this report back as it came, undoing every change made to it?')) return
        setBusy(true)
        try {
            await api.resetReport(definition.key)
            notify('success', 'The report is back as it came.')
            onSaved()
        } catch (failure) { notify('error', failure.message) } finally { setBusy(false) }
    }

    const optionalReconColumns = reconColumns ? [...reconColumns.figures.map((column) => ({ ...column, part: 'Your figures' })), ...reconColumns.transactions.map((column) => ({ ...column, part: 'Your transactions' }))].filter((column) => !column.info && !(column.required && column.type === 'text')) : []

    // Choosing the template's columns and the figures compared. A list that
    // was never touched stands for every column; the first change starts it
    // from every column there is.
    const fixedColumn = (column) => column.required || recon.required.includes(column.key)
    const chosenIn = (list, column) => fixedColumn(column) || list === null || list.includes(column.key)
    const choose = (field, columns, column, on) => {
        const start = recon[field] === null ? columns.map((entry) => entry.key) : recon[field]
        setRecon({ ...recon, [field]: on ? [...new Set([...start, column.key])] : start.filter((key) => key !== column.key) })
    }
    const figureChoices = reconColumns ? reconColumns.figures.filter((column) => !(column.required && column.type === 'text')) : []
    const transactionChoices = reconColumns ? reconColumns.transactions : []
    const comparable = reconColumns ? reconColumns.figures.filter((column) => column.type === 'number' && chosenIn(recon.templateColumns, column)) : []
    const nothingCompared = reconColumns && comparable.length > 0 && !comparable.some((column) => chosenIn(recon.comparedColumns, column))

    return (
        <section className='bc-card'>
            <h3>Edit this report</h3>
            <p className='bc-muted'>Change how the report shows and what it lets readers do. What it works out does not change, and every change can be undone with "Back to the original". Saved for everyone who opens it in this workspace.</p>
            <label className='bc-field bc-field-wide'><span className='bc-field-label'>Report title</span><input className='bc-input' placeholder={definition.originalTitle || definition.title} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <nav className='bc-tabs bc-tabs-inner' aria-label='Parts of the report to edit'>
                {shownTabs.map(([key, label]) => <button key={key} type='button' className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>{label}</button>)}
            </nav>

            {tab === 'columns' && (
                <>
                    <div className='bc-table-scroll'>
                        <table className='bc-table'>
                            <thead><tr><th>Show</th><th>Column</th><th>Show it as</th><th>Order</th></tr></thead>
                            <tbody>
                                {columns.map((column, index) => (
                                    <tr key={column.key}>
                                        <td><input type='checkbox' aria-label={`Show ${column.original}`} checked={!column.hidden} onChange={() => update(index, { hidden: !column.hidden })} /></td>
                                        <td>{column.original}</td>
                                        <td><input className='bc-input' aria-label={`New name for ${column.original}`} placeholder={column.original} value={column.label} onChange={(event) => update(index, { label: event.target.value })} /></td>
                                        <td className='bc-arrange-moves'>
                                            <button type='button' className='bc-button' aria-label={`Move ${column.original} up`} disabled={index === 0} onClick={() => move(index, -1)}>Up</button>
                                            <button type='button' className='bc-button' aria-label={`Move ${column.original} down`} disabled={index === columns.length - 1} onClick={() => move(index, 1)}>Down</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className='bc-muted'>A calculated column joins this list once it is saved.</p>
                    <label className='bc-einv-switch'>
                        <input type='checkbox' checked={keepFilters} onChange={(event) => setKeepFilters(event.target.checked)} />
                        <span>Open the report with the filters chosen now<span className='bc-muted'> (all but the dates, which always start at this month)</span></span>
                    </label>
                </>
            )}

            {tab === 'calcs' && (
                <>
                    <p className='bc-muted'>Work a new column out from the report's own, row by row, the way the report builder does. Name columns in square brackets: [Closing qty] * [Unit cost]. You can use + - * /, brackets, comparisons and ABS, ROUND, MIN, MAX and IF. A column made here can be used by the ones below it, in conditions and in reconciliation.</p>
                    <p className='bc-muted'>Columns: {ownColumns.map((column) => `[${column.label}]`).join(' ')}</p>
                    {calcs.map((calc, index) => (
                        <div key={calc.key || `calc-${index}`} className='bc-recon-edit-row'>
                            <input className='bc-input' aria-label={`Name of calculated column ${index + 1}`} placeholder='Name' value={calc.label} onChange={(event) => calcEdits.change(index, { label: event.target.value })} />
                            <input className='bc-input bc-recon-edit-wide' aria-label={`Formula of calculated column ${index + 1}`} placeholder='[Closing qty] * [Unit cost]' value={calc.expression} onChange={(event) => calcEdits.change(index, { expression: event.target.value })} />
                            <select className='bc-input' aria-label={`Kind of figure for calculated column ${index + 1}`} value={calc.format} onChange={(event) => calcEdits.change(index, { format: event.target.value })}>{FORMATS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                            <label className='bc-einv-switch'><input type='checkbox' checked={calc.total} onChange={(event) => calcEdits.change(index, { total: event.target.checked })} /><span>Total</span></label>
                            <button type='button' className='bc-button' onClick={() => calcEdits.remove(index)}>Remove</button>
                        </div>
                    ))}
                    <button type='button' className='bc-button' disabled={calcs.length >= 10} onClick={() => setCalcs([...calcs, emptyCalc()])}>Add a calculated column</button>
                </>
            )}

            {tab === 'filters' && (
                <>
                    <h4>Only show rows where</h4>
                    <p className='bc-muted'>Rows that do not meet every condition are left out, and the totals follow. The tiles and charts stay as the report works them out. Reconciliation leaves the same rows out.</p>
                    {conditions.map((condition, index) => (
                        <div key={`condition-${index}`} className='bc-recon-edit-row'>
                            <select className='bc-input' aria-label={`Column of condition ${index + 1}`} value={condition.column} onChange={(event) => conditionEdits.change(index, { column: event.target.value })}>
                                <option value=''>Choose a column</option>
                                {allColumns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
                            </select>
                            <select className='bc-input' aria-label={`Test of condition ${index + 1}`} value={condition.operator} onChange={(event) => conditionEdits.change(index, { operator: event.target.value })}>{OPERATORS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                            {!['blank', 'notblank'].includes(condition.operator) && <input className='bc-input' aria-label={`Value of condition ${index + 1}`} value={condition.value} onChange={(event) => conditionEdits.change(index, { value: event.target.value })} />}
                            <button type='button' className='bc-button' onClick={() => conditionEdits.remove(index)}>Remove</button>
                        </div>
                    ))}
                    <button type='button' className='bc-button' disabled={conditions.length >= 10} onClick={() => setConditions([...conditions, { column: '', operator: 'eq', value: '' }])}>Add a condition</button>

                    <h4>Filters for the reader</h4>
                    <p className='bc-muted'>Each one is added to the report's filter bar, listing the values the column has. A reader's choice narrows the report and its reconciliation the same way.</p>
                    {prompts.map((prompt, index) => (
                        <div key={`prompt-${index}`} className='bc-recon-edit-row'>
                            <select className='bc-input' aria-label={`Column of reader filter ${index + 1}`} value={prompt.column} onChange={(event) => promptEdits.change(index, { column: event.target.value })}>
                                <option value=''>Choose a column</option>
                                {allColumns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
                            </select>
                            <input className='bc-input' aria-label={`Name of reader filter ${index + 1}`} placeholder='Name in the filter bar' value={prompt.label} onChange={(event) => promptEdits.change(index, { label: event.target.value })} />
                            <button type='button' className='bc-button' onClick={() => promptEdits.remove(index)}>Remove</button>
                        </div>
                    ))}
                    <button type='button' className='bc-button' disabled={prompts.length >= 6} onClick={() => setPrompts([...prompts, { column: '', label: '' }])}>Add a filter for the reader</button>
                </>
            )}

            {tab === 'reconcile' && (
                <>
                    <label className='bc-einv-switch'>
                        <input type='checkbox' checked={recon.enabled} onChange={(event) => setRecon({ ...recon, enabled: event.target.checked })} />
                        <span>Let readers reconcile this report with their own records<span className='bc-muted'> (download a template, import their file, see what to post or correct)</span></span>
                    </label>
                    {recon.enabled && builtIn && (
                        <>
                            <p className='bc-muted'>This report reconciles as {builtIn.title.toLowerCase()}. Its filters, conditions and reader filters always apply. Leave a box empty to keep the module's own setting.</p>
                            <div className='bc-recon-edit-row'>
                                <label className='bc-field'><span className='bc-field-label'>Ignore differences up to</span><input className='bc-input' type='number' min={0} step='any' placeholder='0.005' value={recon.tolerance} onChange={(event) => setRecon({ ...recon, tolerance: event.target.value })} /></label>
                                <label className='bc-field'><span className='bc-field-label'>Look this many days either side of the period</span><input className='bc-input' type='number' min={0} max={366} placeholder='31' value={recon.windowDays} onChange={(event) => setRecon({ ...recon, windowDays: event.target.value })} /></label>
                                <label className='bc-field'><span className='bc-field-label'>Pair transactions up to this many days apart</span><input className='bc-input' type='number' min={0} max={60} placeholder='7' value={recon.matchDays} onChange={(event) => setRecon({ ...recon, matchDays: event.target.value })} /></label>
                            </div>
                            {ADJUSTING.includes(builtIn.kind) && (
                                <label className='bc-einv-switch'>
                                    <input type='checkbox' checked={recon.allowAdjustments} onChange={(event) => setRecon({ ...recon, allowAdjustments: event.target.checked })} />
                                    <span>Offer an adjustment as the last resort<span className='bc-muted'> (when off, differences are settled only by posting, reversing or correcting the sheet)</span></span>
                                </label>
                            )}
                            <h4>Columns that must be filled before comparing</h4>
                            {!reconColumns ? <p className='bc-muted'>Reading the columns...</p> : (
                                <div className='bc-recon-edit-checks'>
                                    {optionalReconColumns.map((column) => (
                                        <label key={`${column.part}-${column.key}`} className='bc-einv-switch'>
                                            <input type='checkbox' aria-label={`${column.label} must be filled (${column.part})`} checked={column.required || recon.required.includes(column.key)} disabled={column.required && !recon.required.includes(column.key)} onChange={(event) => setRecon({ ...recon, required: event.target.checked ? [...new Set([...recon.required, column.key])] : recon.required.filter((key) => key !== column.key) })} />
                                            <span>{column.label}<span className='bc-muted'> ({column.part})</span></span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {reconColumns && (
                                <>
                                    <h4>Columns in the template</h4>
                                    <p className='bc-muted'>Untick what readers do not need. The columns that name a line, and any that must be filled, are always included. An import reads the same columns.</p>
                                    <div className='bc-recon-edit-checks'>
                                        {figureChoices.map((column) => (
                                            <label key={`figure-${column.key}`} className='bc-einv-switch'>
                                                <input type='checkbox' aria-label={`${column.label} in the template (Your figures)`} checked={chosenIn(recon.templateColumns, column)} disabled={fixedColumn(column)} onChange={(event) => choose('templateColumns', figureChoices, column, event.target.checked)} />
                                                <span>{column.label}<span className='bc-muted'> (Your figures)</span></span>
                                            </label>
                                        ))}
                                        {transactionChoices.map((column) => (
                                            <label key={`transaction-${column.key}`} className='bc-einv-switch'>
                                                <input type='checkbox' aria-label={`${column.label} in the template (Your transactions)`} checked={chosenIn(recon.transactionColumns, column)} disabled={fixedColumn(column)} onChange={(event) => choose('transactionColumns', transactionChoices, column, event.target.checked)} />
                                                <span>{column.label}<span className='bc-muted'> (Your transactions)</span></span>
                                            </label>
                                        ))}
                                    </div>
                                    <h4>Figures compared</h4>
                                    <p className='bc-muted'>A figure in the template but not ticked here is there for the reader's own use and is not compared.</p>
                                    <div className='bc-recon-edit-checks'>
                                        {comparable.map((column) => (
                                            <label key={`compared-${column.key}`} className='bc-einv-switch'>
                                                <input type='checkbox' aria-label={`Compare ${column.label}`} checked={chosenIn(recon.comparedColumns, column)} disabled={fixedColumn(column)} onChange={(event) => choose('comparedColumns', comparable, column, event.target.checked)} />
                                                <span>{column.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {nothingCompared && <p className='bc-banner bc-banner-warn'>Nothing is compared, so an import would find no differences. Tick at least one figure.</p>}
                                </>
                            )}
                        </>
                    )}
                    {recon.enabled && !builtIn && (
                        <>
                            <p className='bc-muted'>This report has no reconciliation of its own, so it is reconciled as the table it shows. Choose the columns that name a line and the figures to compare. Differences are shown with the entries behind them where the report can break a figure down; no adjustment is ever offered.</p>
                            <h4>Columns that name a line</h4>
                            <div className='bc-recon-edit-checks'>
                                {textColumns.map((column) => (
                                    <label key={column.key} className='bc-einv-switch'>
                                        <input type='checkbox' checked={recon.keyColumns.some((entry) => entry.key === column.key)} onChange={(event) => setRecon({ ...recon, keyColumns: toggleIn(recon.keyColumns, { key: column.key, label: column.label }, event.target.checked) })} />
                                        <span>{column.label}</span>
                                    </label>
                                ))}
                            </div>
                            <h4>Figures to compare</h4>
                            <div className='bc-recon-edit-checks'>
                                {numericColumns.map((column) => (
                                    <label key={column.key} className='bc-einv-switch'>
                                        <input type='checkbox' checked={recon.compareColumns.some((entry) => entry.key === column.key)} onChange={(event) => setRecon({ ...recon, compareColumns: toggleIn(recon.compareColumns, { key: column.key, label: column.label, type: column.type }, event.target.checked) })} />
                                        <span>{column.label}</span>
                                    </label>
                                ))}
                            </div>
                            {(!recon.keyColumns.length || !recon.compareColumns.length) && <p className='bc-banner bc-banner-warn'>Choose at least one column that names a line and one figure, or readers will not be offered a reconciliation.</p>}
                        </>
                    )}
                </>
            )}

            <div className='bc-einv-actions'>
                <button type='button' className='bc-button bc-button-primary' disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save changes'}</button>
                {definition.customised && <button type='button' className='bc-button' disabled={busy} onClick={reset}>Back to the original</button>}
                <button type='button' className='bc-button' onClick={onClose}>Close</button>
            </div>
        </section>
    )
}

export default BCCustomise
