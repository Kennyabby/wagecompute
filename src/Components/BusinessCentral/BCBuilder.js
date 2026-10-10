import { useEffect, useMemo, useState } from 'react'
import StatCard from '../Shared/ui/StatCard'
import StatCardGrid from '../Shared/ui/StatCardGrid'
import BCChart from './BCChart'
import BCDataTable from './BCDataTable'
import { MultiSelect } from './BCFilterBar'
import { defaultRange, formatKpi, formatValue } from './bcFormat'
import BCPreparing, { BCUpdating, usePreparingRetry } from './BCPreparing'

const letter = (index) => String.fromCharCode(65 + index)

const EMPTY = {
    name: '',
    description: '',
    service: '',
    dateField: '',
    rows: [],
    across: null,
    pages: [],
    links: [],
    calcs: [],
    join: 'all',
    measures: [{ page: 0, field: '', aggregate: 'count', label: '' }],
    formulas: [],
    filters: [],
    prompts: [],
    tiles: [],
    chart: { type: 'none', outputs: [0] },
    sort: { output: 0, descending: true },
    limit: 500,
    pinned: false,
}
const EMPTY_PAGE = { service: '', dateField: '', filters: [], match: [], matchAcross: '' }
const EMPTY_LINK = { page: 0, from: '', service: '', to: '', fields: [] }
const EMPTY_CALC = { page: 0, label: '', expression: '=' }
const EMPTY_TEST = { field: '', operator: 'eq', value: '' }

const listIn = (value) => (Array.isArray(value) ? value : [])

// A report saved before a feature existed lacks its part of the description,
// and a draft may have been left with anything missing.
const opened = (spec) => ({
    ...EMPTY,
    ...spec,
    rows: listIn(spec.rows),
    pages: listIn(spec.pages).map((page) => ({ ...EMPTY_PAGE, ...page, filters: listIn(page.filters), match: listIn(page.match) })),
    links: listIn(spec.links).map((link) => ({ ...EMPTY_LINK, ...link, fields: listIn(link.fields) })),
    calcs: listIn(spec.calcs).map((calc) => ({ ...EMPTY_CALC, ...calc })),
    measures: (listIn(spec.measures).length ? spec.measures : EMPTY.measures).map((measure) => ({ page: 0, ...measure })),
    formulas: listIn(spec.formulas),
    filters: listIn(spec.filters),
    prompts: listIn(spec.prompts),
    tiles: listIn(spec.tiles),
    chart: { ...EMPTY.chart, ...(spec.chart || {}), outputs: listIn(spec.chart?.outputs) },
    sort: { ...EMPTY.sort, ...(spec.sort || {}) },
})

const LIMITS = { rows: 6, measures: 12, formulas: 8, filters: 10, tiles: 6, pages: 3, links: 4, linkFields: 4, calcs: 6, prompts: 6 }
const JOINS = { all: 'Every line found on any page', first: 'Only lines the first page has' }
const FORMATS = [{ value: 'money', label: 'Money (2 decimals)' }, { value: 'qty', label: 'Quantity' }, { value: 'number', label: 'Whole number' }, { value: 'percent', label: 'Percent' }]
const CHART_LABELS = { none: 'No chart', bar: 'Bars', horizontalBar: 'Bars lying down (good for long names)', line: 'Line (good for time)' }
const LINKED = /^L(\d+)\./
const CALCULATED = /^C(\d+)$/
const NO_VALUE = ['blank', 'notblank']
// Tests whose value can be ticked from a list of what the field holds.
const PICKABLE = ['eq', 'ne', 'in', 'notin']
const listOf = (value) => String(value || '').split(',').map((part) => part.trim()).filter(Boolean)

// The guide shown above the builder. Kept here, beside the form it explains,
// so the two cannot drift apart.
export const GUIDE = [
    {
        title: '1. Name it and choose where the data comes from',
        body: 'Give the report a name people will recognise. Then choose the Business Central page it reads first. Every page published as a web service is in the list: ledger entries, customers, items, orders, fixed assets, jobs and the rest. If a page you need is missing, publish it in Business Central and reopen the builder.',
    },
    {
        title: '2. Choose the period',
        body: 'Pick the date field that decides which rows belong to a period, usually Posting Date. The report then asks for a period each time it is run. Leave it at "No period" for lists that have no dates, such as customers or items. Large ledgers need a period: a report stops reading a page after 150,000 rows and says so.',
    },
    {
        title: '3. Build the table: rows down the side',
        body: 'Each "row" is something to group by: customer number, item number, location. Add up to six, and the table gets one line for each combination. A date can be grouped by day, month, quarter or year. Give a row its own column heading if the field name is not what you want to read. With no rows at all, the report is a single line of totals.',
    },
    {
        title: '4. Add columns across, if you want a pivot table',
        body: 'Optional. Choose one field to spread across the top, the way a pivot table does: customers down the side and items across, for example. Every figure is then shown once for each value across, and again at the end of the line as that line\'s total over all of them. Up to 40 values across are shown.',
    },
    {
        title: '5. Add the figures',
        body: 'A figure is worked out for each line: the sum of an amount, an average, the smallest or largest value, a count of rows, or a count of different values. "Show the value" puts a piece of text in a column as it is, such as a unit of measure. Each figure gets a letter: the first is A, the second B. "Only where" makes a figure count just some rows, the way SUMIF does: quantity only where the location is the depot. Every figure and formula has a total at the bottom of the report.',
    },
    {
        title: '6. Calculated fields: work on each row before adding up',
        body: 'A calculated field is worked out on every row Business Central returns, before anything is summed. Write the fields in square brackets, or pick them from "Insert a field": "=ABS([Quantity])" turns a sale\'s negative quantity positive, and "=ABS([Quantity]) / [Qty per Unit of Measure]" gives packs. It then appears in the field lists as a number and is used in a figure like any other field. A calculated field may use linked fields too.',
    },
    {
        title: '7. Combine more pages in one report',
        body: 'A report can read up to four pages at once. Add a page, then say which of its fields holds the same thing as each row grouping: if the rows are Item No from Value Entries, the Item Ledger Entries page matches with its own Item No. Each figure says which page it is read from, and the figures of every page land on the same line. Each page has its own period field and its own filters. Choose whether to keep every line found on any page, or only the lines the first page has.',
    },
    {
        title: '8. Link to another page for names and details',
        body: 'A link is a lookup, like VLOOKUP in a spreadsheet. It takes a field of a page (Customer No), finds the row of another page where a field holds the same value (No on Customers), and brings in up to four of its fields (Name, City). Linked fields then appear in the field lists with the linked page\'s name in front, and can be used as rows, columns across, figures, filters and in calculated fields. Link to lists such as customers, items and accounts. A ledger is too long to look up.',
    },
    {
        title: '9. Add formulas, like a spreadsheet',
        body: 'A formula works on the figures by their letters, whichever page each figure comes from. With sales as A and cost as B, "=A+B" is the profit (costs are negative in the ledger) and "=(A+B)/A*100" is the margin in percent. Use + - * / and brackets. ABS, ROUND, MIN, MAX and IF work as they do in a spreadsheet: "=IF(A>B, A-B, 0)", "=ROUND(A/B, 2)". Formulas are worked out for the totals too, so a margin is right for the whole report and is not an average of averages.',
    },
    {
        title: '10. Narrow it down with filters',
        body: 'Filters keep only the rows you want: entry type is Sale, amount is more than 100,000, name contains "LTD". For "is", "is one of" and "is not one of", press "Pick values" to tick the values from a list of what the field really holds, so a report can show three chosen items and not all of them. A filter can use a linked field, such as an item\'s category. Write dates as 2026-09-30.',
    },
    {
        title: '11. Filters for the reader',
        body: 'These are the filters people see at the top of the report when they run it, next to the period: branch, location, salesperson, item category. Pick the fields and name them. The report lists the values it found for each, and whoever runs it ticks the ones they want. Nothing is narrowed until they do.',
    },
    {
        title: '12. Add tiles and a chart',
        body: 'Tiles are the headline numbers at the top of the report: tick the figures or formulas to show, and they are worked out over the whole report. A chart plots up to three of them against the first row grouping. Use a line for dates and bars for everything else.',
    },
    {
        title: '13. Preview, and change things on the preview itself',
        body: 'Preview runs the report as it stands. Under it, each column has a box to rename it and a button to remove it. With columns across, each value across has a button to leave it out. Click a name in the first columns of the table to show only that line or to leave it out. Each of these changes the settings above and runs the preview again, so what you see is what will be saved.',
    },
    {
        title: '14. Save your progress, or save it as a report',
        body: '"Save progress" keeps the report as a draft, finished or not. Only you see it, under Reports in "My reports", marked Draft, and "Continue" reopens it here. "Save report" checks it and makes it a report anyone with access to this module can run, filter and export. It can be edited again at any time. Tick "Show on the dashboard" to put its tiles and chart on the dashboard as well. Only you or an admin can change or delete it.',
    },
]

const labelIn = (fields, name) => fields.find((field) => field.name === name)?.label || name

// Applies `change` to every place a report names a field, so a link or a
// calculated field can be renumbered wherever it is used.
const mapFields = (spec, change) => {
    const test = (entry) => ({ ...entry, field: change(entry.field) })
    return {
        rows: spec.rows.map(test),
        across: spec.across ? test(spec.across) : null,
        measures: spec.measures.map((measure) => ({ ...measure, field: change(measure.field), ...(measure.when ? { when: test(measure.when) } : {}) })),
        filters: spec.filters.map(test),
        prompts: spec.prompts.map(test),
        pages: spec.pages.map((page) => ({ ...page, match: page.match.map(change), matchAcross: change(page.matchAcross), filters: page.filters.map(test) })),
    }
}
const fieldsNamed = (spec) => {
    const names = []
    mapFields(spec, (name) => { names.push(name || ''); return name })
    return names
}

// A heading that is typed freely and only takes effect when left, so the
// preview is not run again on every keystroke.
const HeadingBox = ({ value, placeholder, label, onCommit }) => {
    const [draft, setDraft] = useState(value || '')
    useEffect(() => { setDraft(value || '') }, [value])
    const commit = () => { if (draft.trim() !== (value || '')) onCommit(draft.trim()) }
    return <input className='bc-input' value={draft} maxLength={60} placeholder={placeholder} aria-label={label} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit() } }} />
}

// The values a field holds, to tick from. Read from Business Central once
// per field and period, and kept by the server after that.
const ValuePicker = ({ api, source, chosen, onChange, onClose }) => {
    const [list, setList] = useState(null)
    const [failure, setFailure] = useState('')
    const [search, setSearch] = useState('')
    const request = JSON.stringify(source)

    useEffect(() => {
        let active = true
        setList(null)
        setFailure('')
        api.getFieldValues(JSON.parse(request)).then((response) => { if (active) setList(response.list) }).catch((error) => { if (active) setFailure(error.message) })
        return () => { active = false }
    }, [api, request])

    const needle = search.trim().toLowerCase()
    const matches = (list?.values || []).filter((value) => !needle || value.toLowerCase().includes(needle))
    const toggle = (value) => onChange(chosen.includes(value) ? chosen.filter((entry) => entry !== value) : [...chosen, value])

    return (
        <div className='bc-builder-block bc-picker'>
            <div className='bc-builder-line'>
                <input className='bc-input' value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search the values' aria-label='Search the values' />
                <span className='bc-muted'>{chosen.length ? `${chosen.length} ticked` : 'Nothing ticked'}</span>
                {chosen.length > 0 && <button type='button' className='bc-link-button' onClick={() => onChange([])}>Clear</button>}
                <button type='button' className='bc-button' onClick={onClose}>Done</button>
            </div>
            {failure && <p className='bc-neg'>{failure}</p>}
            {!list && !failure && <p className='bc-muted'>Reading the values from Business Central...</p>}
            {list && (
                <>
                    <div className='bc-column-chooser bc-picker-list'>
                        {matches.slice(0, 300).map((value) => (
                            <label key={value} className='bc-check'>
                                <input type='checkbox' checked={chosen.includes(value)} onChange={() => toggle(value)} />
                                <span>{value}</span>
                            </label>
                        ))}
                    </div>
                    {list.values.length === 0 && <p className='bc-muted'>No values were found{source.dateField ? ' in the preview period' : ''}.</p>}
                    {matches.length > 300 && <p className='bc-muted'>Showing the first 300 of {matches.length.toLocaleString()}. Search to narrow the list.</p>}
                    {list.cut && <p className='bc-muted'>The list was cut short, so some values may be missing. A value that is not listed can still be typed in.</p>}
                </>
            )}
        </div>
    )
}

/**
 * Builds a report from published Business Central pages: one page or several
 * combined on shared row groupings, lookups into other pages, fields worked
 * out row by row, figures, spreadsheet-style formulas, filters, filters for
 * the reader, tiles and a chart. `saved` is the report or draft being
 * edited, or null for a new one.
 */
const BCBuilder = ({ api, saved = null, onSaved, onClose, notify }) => {
    const [schema, setSchema] = useState(null)
    const [spec, setSpec] = useState(() => (saved ? opened(saved.spec) : EMPTY))
    // Set once the report exists on the server, as a draft or finished, so
    // later saves change that one and do not make another.
    const [savedId, setSavedId] = useState(saved?.id)
    const [range, setRange] = useState(defaultRange)
    const [report, setReport] = useState(null)
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')
    const [guideOpen, setGuideOpen] = useState(!saved)
    const [search, setSearch] = useState('')
    // Which filter has its list of values open: "0:2" is page 1's third filter.
    const [picking, setPicking] = useState('')
    // What the preview's reader filters are set to, and a line name clicked in the preview.
    const [promptValues, setPromptValues] = useState({})
    const [clicked, setClicked] = useState(null)
    const { preparing, updating, awaitData } = usePreparingRetry()

    useEffect(() => {
        let active = true
        api.getBuilderSchema().then((response) => { if (active) setSchema(response.schema) }).catch((failure) => { if (active) setError(failure.message) })
        return () => { active = false }
    }, [api])

    const tableOf = (service) => schema?.tables.find((entry) => entry.service === service) || null
    const table = tableOf(spec.service)
    // Page 1 is the report's main page. The others follow in the order added.
    const pageTables = [table, ...spec.pages.map((page) => tableOf(page.service))]
    const pageName = (page) => `Page ${page + 1}${pageTables[page] ? `: ${pageTables[page].label}` : ''}`
    const ownFields = (page) => pageTables[page]?.fields || []
    const linkedFields = (page) => spec.links.flatMap((link, index) => {
        const other = link.page === page ? tableOf(link.service) : null
        if (!other) return []
        return link.fields.map((name) => other.fields.find((field) => field.name === name)).filter(Boolean).map((field) => ({ name: `L${index + 1}.${field.name}`, label: `${other.label}: ${field.label}`, type: field.type }))
    })
    const calcFields = (page) => spec.calcs.flatMap((calc, index) => (calc.page === page ? [{ name: `C${index + 1}`, label: calc.label || `Calculation ${index + 1}`, type: 'number' }] : []))
    // A page's own fields, the ones its links bring in (L1.Name), and its
    // calculated fields (C1).
    const fieldsOf = (page) => [...ownFields(page), ...linkedFields(page), ...calcFields(page)]
    const fields = fieldsOf(0)
    const typeOf = (page, name) => fieldsOf(page).find((field) => field.name === name)?.type
    const dates = (list) => list.filter((field) => field.type === 'date')
    const numbers = (list) => list.filter((field) => field.type === 'number')
    const several = spec.pages.length > 0
    const periodIn = (one) => !!one.dateField || one.pages.some((page) => page.dateField)
    const hasPeriod = periodIn(spec)

    const measureLabel = (measure) => measure.label || (measure.aggregate === 'count' ? 'Count' : (measure.aggregate === 'first' ? labelIn(fieldsOf(measure.page || 0), measure.field) : `${schema?.aggregates[measure.aggregate] || ''} of ${labelIn(fieldsOf(measure.page || 0), measure.field)}`))
    const outputs = [
        ...spec.measures.map((measure, index) => ({ index, text: measure.aggregate === 'first', label: `${letter(index)}: ${measureLabel(measure)}` })),
        ...spec.formulas.map((formula, index) => ({ index: spec.measures.length + index, label: `${formula.label || `Formula ${index + 1}`} ${formula.expression}` })),
    ]
    const numericOutputs = outputs.filter((output) => !output.text)
    const tables = useMemo(() => {
        const needle = search.trim().toLowerCase()
        return (schema?.tables || []).filter((entry) => !needle || entry.label.toLowerCase().includes(needle) || entry.service.toLowerCase().includes(needle) || entry.service === spec.service)
    }, [schema, search, spec.service])

    const run = async (next, chosen) => {
        setBusy('preview')
        setError('')
        setClicked(null)
        try {
            const params = { ...(periodIn(next) ? range : {}), ...chosen }
            const response = await awaitData(() => api.runBuilder(next, params), (fresh) => setReport(fresh.report))
            setReport(response.report)
        } catch (failure) {
            setReport(null)
            setError(failure.message)
        } finally {
            setBusy('')
        }
    }
    const preview = () => run(spec, promptValues)

    const change = (patch) => { setSpec((current) => ({ ...current, ...patch })); setReport(null); setClicked(null) }
    // A change made on the preview itself: the settings follow, and the
    // preview is run again so it never shows something the settings do not say.
    const changeAndRun = (patch) => { const next = { ...spec, ...patch }; setSpec(next); run(next, promptValues) }
    const changeIn = (list, index, patch) => change({ [list]: spec[list].map((entry, at) => (at === index ? { ...entry, ...patch } : entry)) })
    const removeFrom = (list, index) => change({ [list]: spec[list].filter((entry, at) => at !== index) })
    // Choosing another main page clears everything that named a field of the old one.
    const chooseTable = (service) => { setPromptValues({}); change({ service, dateField: '', rows: [], across: null, pages: [], links: [], calcs: [], measures: [{ page: 0, field: '', aggregate: 'count', label: '' }], formulas: [], filters: [], prompts: [], tiles: [], chart: { type: 'none', outputs: [0] } }) }
    const toggle = (list, value, max) => (list.includes(value) ? list.filter((entry) => entry !== value) : (list.length < max ? [...list, value] : list))

    // Every other page keeps one match per row grouping, in the same order.
    const addRow = () => change({ rows: [...spec.rows, { field: '' }], pages: spec.pages.map((page) => ({ ...page, match: [...page.match, ''] })) })
    const withoutRow = (index) => ({ rows: spec.rows.filter((entry, at) => at !== index), pages: spec.pages.map((page) => ({ ...page, match: page.match.filter((entry, at) => at !== index) })) })
    // A row that is a linked field looked up from another row (name beside
    // number) follows that row on the other pages, so it needs no match.
    const follows = (at) => {
        const found = LINKED.exec(spec.rows[at]?.field || '')
        const link = found ? spec.links[Number(found[1]) - 1] : null
        return !!link && spec.rows.some((row, index) => index !== at && row.field === link.from)
    }
    // Removing a figure moves the letters after it, so anything that named a
    // figure by position is cleared.
    const withoutMeasure = (index) => ({ measures: spec.measures.filter((entry, at) => at !== index), formulas: [], tiles: [], chart: { type: spec.chart.type, outputs: [0] }, sort: { ...spec.sort, output: null } })
    const withoutFormula = (index) => ({ formulas: spec.formulas.filter((entry, at) => at !== index), tiles: [], chart: { type: spec.chart.type, outputs: [0] }, sort: { ...spec.sort, output: null } })

    const changePage = (index, patch) => changeIn('pages', index, patch)
    const addPage = () => change({ pages: [...spec.pages, { ...EMPTY_PAGE, match: spec.rows.map(() => '') }] })
    const choosePageTable = (index, service) => change({
        pages: spec.pages.map((page, at) => (at === index ? { ...EMPTY_PAGE, service, match: spec.rows.map(() => '') } : page)),
        measures: spec.measures.map((measure) => (measure.page === index + 1 ? { ...measure, field: '', when: undefined } : measure)),
        links: spec.links.map((link) => (link.page === index + 1 ? { ...link, from: '' } : link)),
    })
    const pageInUse = (index) => spec.measures.some((measure) => measure.page === index + 1) || spec.links.some((link) => link.page === index + 1) || spec.calcs.some((calc) => calc.page === index + 1)
    // Pages after the removed one move up, and so does everything that points at them.
    const removePage = (index) => {
        const moved = (entry) => (entry.page > index + 1 ? { ...entry, page: entry.page - 1 } : entry)
        change({ pages: spec.pages.filter((page, at) => at !== index), measures: spec.measures.map(moved), links: spec.links.map(moved), calcs: spec.calcs.map(moved) })
    }

    // Links and calculated fields are named by number (L1.Name, C2). One in
    // use cannot be removed, and removing one renumbers those after it.
    const named = fieldsNamed(spec)
    const usedInCalcs = (text) => spec.calcs.some((calc) => String(calc.expression || '').includes(text))
    const linkInUse = (index) => named.some((name) => name.startsWith(`L${index + 1}.`)) || usedInCalcs(`[L${index + 1}.`)
    const calcInUse = (index) => named.includes(`C${index + 1}`)
    const changeLink = (index, patch) => changeIn('links', index, patch)
    const removeLink = (index) => {
        const renumber = (name) => (name || '').replace(LINKED, (whole, number) => (Number(number) > index + 1 ? `L${Number(number) - 1}.` : whole))
        change({ links: spec.links.filter((link, at) => at !== index), ...mapFields(spec, renumber), calcs: spec.calcs.map((calc) => ({ ...calc, expression: String(calc.expression || '').replace(/\[L(\d+)\./g, (whole, number) => (Number(number) > index + 1 ? `[L${Number(number) - 1}.` : whole)) })) })
    }
    const removeCalc = (index) => {
        const renumber = (name) => (name || '').replace(CALCULATED, (whole, number) => (Number(number) > index + 1 ? `C${Number(number) - 1}` : whole))
        change({ ...mapFields(spec, renumber), calcs: spec.calcs.filter((calc, at) => at !== index) })
    }

    // Where a filter's list of values is read from: the page itself, or the
    // linked page when the field comes from a link. A calculated field has
    // no list.
    const sourceOf = (page, name) => {
        if (!name || CALCULATED.test(name)) return null
        const linked = LINKED.exec(name)
        if (linked) { const link = spec.links[Number(linked[1]) - 1]; return link ? { service: link.service, field: name.replace(LINKED, '') } : null }
        const dateField = page === 0 ? spec.dateField : spec.pages[page - 1]?.dateField
        return { service: pageTables[page]?.service, field: name, ...(dateField ? { dateField, from: range.from, to: range.to } : {}) }
    }
    // Ticking more than one value turns "is" into "is one of".
    const pickedInto = (test, values) => ({ value: values.join(', '), operator: values.length > 1 ? (['ne', 'notin'].includes(test.operator) ? 'notin' : 'in') : (PICKABLE.includes(test.operator) ? test.operator : 'in') })

    // Leaves one value out of the first page, or shows only that value, by
    // writing the filter someone would otherwise have typed.
    const narrowed = (field, value, keep) => {
        const others = spec.filters.filter((filter) => !(filter.field === field && PICKABLE.includes(filter.operator)))
        if (keep) return { filters: [...others, { field, operator: 'eq', value }] }
        const already = spec.filters.find((filter) => filter.field === field && ['ne', 'notin'].includes(filter.operator))
        const values = [...new Set([...listOf(already?.value), value])]
        return { filters: [...others, { field, operator: values.length > 1 ? 'notin' : 'ne', value: values.join(', ') }] }
    }

    const save = async (draft) => {
        setBusy(draft ? 'draft' : 'save')
        setError('')
        try {
            const response = draft ? await api.saveReport(spec, savedId, true) : await api.saveReport(spec, savedId)
            setSavedId(response.report.id)
            if (draft) notify('success', `Progress on "${response.report.name}" saved as a draft. It is under Reports, in My reports, for you only.`)
            else {
                notify('success', `"${response.report.name}" saved. It is under Reports, in My reports.`)
                onSaved(response.report)
            }
        } catch (failure) {
            setError(failure.message)
        } finally {
            setBusy('')
        }
    }

    const fieldSelect = (value, onChange, options, label, placeholder = 'Choose a field') => (
        <select className='bc-input' value={value || ''} onChange={(event) => onChange(event.target.value)} aria-label={label}>
            <option value=''>{placeholder}</option>
            {options.map((field) => <option key={field.name} value={field.name}>{field.label}</option>)}
        </select>
    )
    const pageSelect = (value, onChange, label) => (
        <select className='bc-input' value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
            <option value=''>Choose a page</option>
            {(schema?.tables || []).map((entry) => <option key={entry.service} value={entry.service}>{entry.label} ({entry.fields.length} fields)</option>)}
        </select>
    )
    const limits = { ...LIMITS, ...(schema?.limits || {}) }
    const joins = schema?.joins || JOINS

    // One test on one field: the field, the test, the value, and a list of
    // the field's real values to tick from. `id` tells the open list which
    // test it belongs to.
    const testLine = (test, page, set, named_, id, onRemove) => {
        const source = PICKABLE.includes(test.operator || 'eq') ? sourceOf(page, test.field) : null
        return (
            <div key={id}>
                <div className='bc-builder-line'>
                    {fieldSelect(test.field, (value) => { set({ field: value, value: '' }); setPicking('') }, fieldsOf(page), `${named_} field`)}
                    <select className='bc-input' value={test.operator || 'eq'} onChange={(event) => set({ operator: event.target.value })} aria-label={`${named_} test`}>
                        {Object.entries(schema.operators).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    {!NO_VALUE.includes(test.operator) && (
                        <input className='bc-input' value={test.value || ''} onChange={(event) => set({ value: event.target.value })} placeholder={typeOf(page, test.field) === 'date' ? '2026-09-30' : (['in', 'notin'].includes(test.operator) ? 'Values, with commas between' : 'Value')} aria-label={`${named_} value`} />
                    )}
                    {source && <button type='button' className='bc-button' aria-expanded={picking === id} onClick={() => setPicking(picking === id ? '' : id)}>Pick values</button>}
                    <button type='button' className='bc-link-button' onClick={onRemove}>Remove</button>
                </div>
                {source && picking === id && <ValuePicker api={api} source={source} chosen={listOf(test.value)} onChange={(values) => set(pickedInto(test, values))} onClose={() => setPicking('')} />}
            </div>
        )
    }
    // The filters of one page. `named_` goes in front of each control's name
    // so a screen reader can tell page 2's filters from page 1's.
    const filterLines = (list, page, onList, named_) => (
        <>
            {list.map((filter, index) => testLine(filter, page, (patch) => onList(list.map((entry, at) => (at === index ? { ...entry, ...patch } : entry))), `${named_} ${index + 1}`, `${page}:${index}`, () => onList(list.filter((entry, at) => at !== index))))}
            {list.length < limits.filters && <button type='button' className='bc-button' onClick={() => onList([...list, { ...EMPTY_TEST }])}>Add a filter</button>}
        </>
    )

    // The report's columns laid out the way a sheet shows them: a letter over
    // each figure, the heading under it, and what the column holds.
    const sheet = [
        ...spec.rows.map((row, index) => ({ key: `r${index}`, letter: '', heading: row.label || (row.field ? labelIn(fields, row.field) : `Row ${index + 1}`), holds: 'Row grouping' })),
        ...spec.measures.map((measure, index) => ({ key: `m${index}`, letter: letter(index), heading: measureLabel(measure), holds: several ? pageName(measure.page || 0) : (table?.label || '') })),
        ...spec.formulas.map((formula, index) => ({ key: `f${index}`, letter: 'fx', heading: formula.label || `Formula ${index + 1}`, holds: formula.expression })),
    ]
    // In the preview each figure's heading carries its letter, so a formula
    // can be checked against the columns it reads, and the names down the
    // side can be clicked.
    const lettered = (columns) => columns.map((column) => {
        const figure = /^m(\d+)$/.exec(column.key)
        if (figure) return { ...column, label: `[${letter(Number(figure[1]))}] ${column.label}` }
        return /^r\d+$/.test(column.key) ? { ...column, pick: true } : column
    })
    const acrossLabel = spec.across ? (spec.across.label || labelIn(fields, spec.across.field)) : ''

    return (
        <div className='bc-page bc-builder'>
            <div className='bc-report-head'>
                <div>
                    <button type='button' className='bc-link-button' onClick={onClose}>&larr; All reports</button>
                    <h2>{saved ? `${saved.draft ? 'Carry on with' : 'Edit'} "${saved.name}"` : 'Build a report'}</h2>
                    <p className='bc-muted'>Make your own report from one Business Central page or several together: choose what goes down the side, which figures to work out, and how to show them.</p>
                </div>
                <div className='bc-actions'>
                    <button type='button' className='bc-button' onClick={() => setGuideOpen((open) => !open)} aria-expanded={guideOpen}>{guideOpen ? 'Hide the guide' : 'How to build a report'}</button>
                </div>
            </div>

            {guideOpen && (
                <section className='bc-card bc-guide'>
                    <h3>How to build a report</h3>
                    <ol>
                        {GUIDE.map((step) => <li key={step.title}><strong>{step.title.replace(/^\d+\.\s*/, '')}.</strong> {step.body}</li>)}
                    </ol>
                    <p className='bc-muted'>
                        A worked example on one page: page "Value Entries", period "Posting Date", row "Source No", figure A "Sum of Sales Amount Actual", figure B "Sum of Cost Amount Actual",
                        formula "=A+B" called Profit, filter "Item Ledger Entry Type is Sale". That is profit by customer.
                    </p>
                    <p className='bc-muted'>
                        Item-wise sales, customer-wise: page "Value Entries", period "Posting Date", filter "Item Ledger Entry Type is Sale". Link "Source No" to "Customers" on "No" bringing in "Name",
                        and "Item No" to "Items" on "No" bringing in "Item Category Code". Rows "Source No" and "Customers: Name". Columns across "Item No". Calculated field "=0-[Invoiced_Quantity]" called Quantity sold.
                        Figure A "Sum of Quantity sold", figure B "Sum of Sales Amount Actual". Filter "Items: Item Category Code is one of" with the finished goods ticked from "Pick values".
                        Each customer's line then shows quantity and sales for every item, the last two columns total the line, and the bottom line totals every customer.
                    </p>
                </section>
            )}

            {error && <div className='bc-banner bc-banner-error'>{error}</div>}
            {!schema && !error && <p className='bc-empty'>Reading the list of pages from Business Central...</p>}

            {schema && (
                <>
                    <section className='bc-card'>
                        <h3>1. Name and data</h3>
                        <div className='bc-form-grid'>
                            <label className='bc-field'>
                                <span className='bc-field-label'>Report name</span>
                                <input className='bc-input' maxLength={80} value={spec.name} onChange={(event) => setSpec({ ...spec, name: event.target.value })} placeholder='For example: Profit by customer' />
                            </label>
                            <label className='bc-field bc-field-wide'>
                                <span className='bc-field-label'>What it shows (optional)</span>
                                <input className='bc-input' maxLength={300} value={spec.description} onChange={(event) => setSpec({ ...spec, description: event.target.value })} />
                            </label>
                            <label className='bc-field'>
                                <span className='bc-field-label'>Find a page</span>
                                <input className='bc-input' value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${schema.tables.length} published pages`} />
                            </label>
                            <label className='bc-field'>
                                <span className='bc-field-label'>Business Central page</span>
                                <select className='bc-input' value={spec.service} onChange={(event) => chooseTable(event.target.value)} aria-label='Business Central page'>
                                    <option value=''>Choose a page</option>
                                    {tables.map((entry) => <option key={entry.service} value={entry.service}>{entry.label} ({entry.fields.length} fields)</option>)}
                                </select>
                            </label>
                            {table && (
                                <label className='bc-field'>
                                    <span className='bc-field-label'>Period is decided by</span>
                                    {fieldSelect(spec.dateField, (value) => change({ dateField: value }), dates(ownFields(0)), 'Period field', dates(ownFields(0)).length ? 'No period (read everything)' : 'This page has no dates')}
                                </label>
                            )}
                        </div>
                    </section>

                    {table && (
                        <>
                            <section className='bc-card'>
                                <h3>2. More pages, links and calculated fields</h3>
                                <p className='bc-muted'>Optional. Links look up names and details from a list. Calculated fields work on each row before it is added up. More pages put their figures on the same lines as {table.label}.</p>

                                <h4>Links (lookups)</h4>
                                {spec.links.map((link, index) => {
                                    const other = tableOf(link.service)
                                    const inUse = linkInUse(index)
                                    return (
                                        <div key={index} className='bc-builder-block'>
                                            <div className='bc-builder-line'>
                                                <span className='bc-builder-letter' aria-hidden='true'>L{index + 1}</span>
                                                {several && (
                                                    <select className='bc-input' value={link.page} onChange={(event) => changeLink(index, { page: Number(event.target.value), from: '' })} aria-label={`Link ${index + 1} on page`} disabled={inUse}>
                                                        {pageTables.map((entry, page) => <option key={page} value={page}>{pageName(page)}</option>)}
                                                    </select>
                                                )}
                                                {fieldSelect(link.from, (value) => changeLink(index, { from: value }), ownFields(link.page), `Link ${index + 1} from field`, 'Take this field')}
                                                <span className='bc-muted'>and find it in</span>
                                                {pageSelect(link.service, (value) => changeLink(index, { service: value, to: '', fields: [] }), `Link ${index + 1} looks up`)}
                                                {other && fieldSelect(link.to, (value) => changeLink(index, { to: value }), other.fields, `Link ${index + 1} matching field`, 'Where this field is the same')}
                                                <button type='button' className='bc-link-button' disabled={inUse} title={inUse ? 'Take its fields out of the rows, figures, filters and calculations first' : ''} onClick={() => removeLink(index)}>Remove</button>
                                            </div>
                                            {other && (
                                                <div className='bc-builder-line'>
                                                    <span className='bc-muted'>Bring in:</span>
                                                    {link.fields.map((name) => (
                                                        <span key={name} className='bc-chip'>
                                                            {labelIn(other.fields, name)}
                                                            <button type='button' className='bc-chip-remove' aria-label={`Stop bringing in ${labelIn(other.fields, name)}`} disabled={named.includes(`L${index + 1}.${name}`) || usedInCalcs(`[L${index + 1}.${name}]`)} onClick={() => changeLink(index, { fields: link.fields.filter((entry) => entry !== name) })}>&times;</button>
                                                        </span>
                                                    ))}
                                                    {link.fields.length < limits.linkFields && fieldSelect('', (value) => value && changeLink(index, { fields: [...link.fields, value] }), other.fields.filter((field) => !link.fields.includes(field.name)), `Link ${index + 1} bring in`, link.fields.length ? 'Add another field' : 'Choose a field to bring in')}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                {spec.links.length < limits.links && <button type='button' className='bc-button' onClick={() => change({ links: [...spec.links, { ...EMPTY_LINK }] })}>Add a link</button>}
                                {spec.links.length === 0 && <p className='bc-muted'>A link works like a spreadsheet lookup: customer number in, customer name out.</p>}

                                <h4>Calculated fields</h4>
                                {spec.calcs.map((calc, index) => {
                                    const inUse = calcInUse(index)
                                    const usable = numbers([...ownFields(calc.page || 0), ...linkedFields(calc.page || 0)])
                                    return (
                                        <div key={index} className='bc-builder-line'>
                                            <span className='bc-builder-letter' aria-hidden='true'>C{index + 1}</span>
                                            {several && (
                                                <select className='bc-input' value={calc.page || 0} onChange={(event) => changeIn('calcs', index, { page: Number(event.target.value) })} aria-label={`Calculation ${index + 1} page`} disabled={inUse}>
                                                    {pageTables.map((entry, page) => <option key={page} value={page}>{pageName(page)}</option>)}
                                                </select>
                                            )}
                                            <input className='bc-input' value={calc.label} maxLength={60} onChange={(event) => changeIn('calcs', index, { label: event.target.value })} placeholder='Name, such as Quantity in packs' aria-label={`Calculation ${index + 1} name`} />
                                            <input className='bc-input bc-builder-formula' value={calc.expression} maxLength={200} onChange={(event) => changeIn('calcs', index, { expression: event.target.value })} placeholder='=ABS([Quantity])' aria-label={`Calculation ${index + 1}`} />
                                            {fieldSelect('', (value) => value && changeIn('calcs', index, { expression: `${calc.expression || '='}[${value}]` }), usable, `Calculation ${index + 1} insert a field`, 'Insert a field')}
                                            <button type='button' className='bc-link-button' disabled={inUse} title={inUse ? 'Take it out of the figures and filters first' : ''} onClick={() => removeCalc(index)}>Remove</button>
                                        </div>
                                    )
                                })}
                                {spec.calcs.length < limits.calcs && <button type='button' className='bc-button' onClick={() => change({ calcs: [...spec.calcs, { ...EMPTY_CALC }] })}>Add a calculated field</button>}
                                {spec.calcs.length === 0 && <p className='bc-muted'>Worked out on every row before adding up: =ABS([Quantity]) / [Qty per Unit of Measure] gives packs. Then use it in a figure.</p>}

                                <h4>Other pages</h4>
                                {spec.pages.map((page, index) => {
                                    const number = index + 2
                                    const inUse = pageInUse(index)
                                    return (
                                        <div key={index} className='bc-builder-block'>
                                            <div className='bc-builder-line'>
                                                <span className='bc-builder-letter' aria-hidden='true'>P{number}</span>
                                                {pageSelect(page.service, (value) => choosePageTable(index, value), `Page ${number}`)}
                                                {pageTables[index + 1] && fieldSelect(page.dateField, (value) => changePage(index, { dateField: value }), dates(ownFields(index + 1)), `Page ${number} period field`, dates(ownFields(index + 1)).length ? 'No period (read everything)' : 'This page has no dates')}
                                                <button type='button' className='bc-link-button' disabled={inUse} title={inUse ? 'Remove the figures, links and calculations that use this page first' : ''} onClick={() => removePage(index)}>Remove</button>
                                            </div>
                                            {pageTables[index + 1] && (
                                                <>
                                                    {spec.rows.map((row, at) => (
                                                        <div key={at} className='bc-builder-line'>
                                                            <span className='bc-muted'>"{labelIn(fields, row.field) || `Row ${at + 1}`}" is the same as</span>
                                                            {fieldSelect(page.match[at], (value) => changePage(index, { match: spec.rows.map((entry, position) => (position === at ? value : page.match[position] || '')) }), fieldsOf(index + 1), `Page ${number} match for row ${at + 1}`, follows(at) ? 'Follows from its link' : 'Choose the matching field')}
                                                        </div>
                                                    ))}
                                                    {spec.across && (
                                                        <div className='bc-builder-line'>
                                                            <span className='bc-muted'>Columns across "{labelIn(fields, spec.across.field)}" is the same as</span>
                                                            {fieldSelect(page.matchAcross, (value) => changePage(index, { matchAcross: value }), fieldsOf(index + 1), `Page ${number} match for columns across`, 'Choose the matching field')}
                                                        </div>
                                                    )}
                                                    {spec.rows.length === 0 && <p className='bc-muted'>With no row groupings there is nothing to match: this page's figures go on the one line of totals.</p>}
                                                    {filterLines(page.filters, index + 1, (filters) => changePage(index, { filters }), `Page ${number} filter`)}
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                                {spec.pages.length < limits.pages && <button type='button' className='bc-button' onClick={addPage}>Add a page</button>}
                                {several && (
                                    <div className='bc-builder-line'>
                                        <span className='bc-muted'>Lines to show</span>
                                        <select className='bc-input' value={spec.join || 'all'} onChange={(event) => change({ join: event.target.value })} aria-label='Lines to show'>
                                            {Object.entries(joins).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                        </select>
                                    </div>
                                )}
                            </section>

                            <section className='bc-card'>
                                <h3>3. The table</h3>
                                <div className='bc-sheet-wrap'>
                                    <table className='bc-sheet' aria-label='Layout of the report'>
                                        <thead>
                                            <tr>{sheet.map((column) => <th key={column.key} scope='col'>{column.letter}</th>)}</tr>
                                        </thead>
                                        <tbody>
                                            <tr>{sheet.map((column) => <td key={column.key} className='bc-sheet-heading'>{column.heading}</td>)}</tr>
                                            <tr>{sheet.map((column) => <td key={column.key} className={column.letter === 'fx' ? 'bc-builder-formula' : 'bc-muted'}>{column.holds}</td>)}</tr>
                                        </tbody>
                                    </table>
                                </div>
                                {spec.across && <p className='bc-muted'>With columns across, each figure appears once for every {acrossLabel}, then once more at the end of the line as the line's total. The bottom line totals every column.</p>}

                                <h4>Rows down the side</h4>
                                {spec.rows.map((row, index) => (
                                    <div key={index} className='bc-builder-line'>
                                        {fieldSelect(row.field, (value) => changeIn('rows', index, { field: value, by: typeOf(0, value) === 'date' ? 'month' : undefined }), fields, `Row ${index + 1}`)}
                                        {typeOf(0, row.field) === 'date' && (
                                            <select className='bc-input' value={row.by || 'month'} onChange={(event) => changeIn('rows', index, { by: event.target.value })} aria-label={`Row ${index + 1} grouped by`}>
                                                {Object.entries(schema.periods).map(([value, label]) => <option key={value} value={value}>By {label.toLowerCase()}</option>)}
                                            </select>
                                        )}
                                        <input className='bc-input' value={row.label || ''} maxLength={60} onChange={(event) => changeIn('rows', index, { label: event.target.value })} placeholder='Column heading (optional)' aria-label={`Row ${index + 1} heading`} />
                                        <button type='button' className='bc-link-button' onClick={() => change(withoutRow(index))}>Remove</button>
                                    </div>
                                ))}
                                {spec.rows.length < limits.rows && <button type='button' className='bc-button' onClick={addRow}>Add a row grouping</button>}
                                {spec.rows.length === 0 && <p className='bc-muted'>With no rows, the report is one line of totals.</p>}

                                <h4>Columns across (optional)</h4>
                                <div className='bc-builder-line'>
                                    {fieldSelect(spec.across?.field, (value) => change({ across: value ? { field: value, by: typeOf(0, value) === 'date' ? 'month' : undefined } : null }), fields, 'Columns across', 'None')}
                                    {spec.across && typeOf(0, spec.across.field) === 'date' && (
                                        <select className='bc-input' value={spec.across.by || 'month'} onChange={(event) => change({ across: { ...spec.across, by: event.target.value } })} aria-label='Columns across grouped by'>
                                            {Object.entries(schema.periods).map(([value, label]) => <option key={value} value={value}>By {label.toLowerCase()}</option>)}
                                        </select>
                                    )}
                                </div>

                                <h4>Figures</h4>
                                {spec.measures.map((measure, index) => {
                                    const page = measure.page || 0
                                    const anyField = ['distinct', 'first'].includes(measure.aggregate)
                                    return (
                                        <div key={index}>
                                            <div className='bc-builder-line'>
                                                <span className='bc-builder-letter' aria-hidden='true'>{letter(index)}</span>
                                                {several && (
                                                    <select className='bc-input' value={page} onChange={(event) => changeIn('measures', index, { page: Number(event.target.value), field: '', when: undefined })} aria-label={`Figure ${letter(index)} page`}>
                                                        {pageTables.map((entry, at) => <option key={at} value={at}>{pageName(at)}</option>)}
                                                    </select>
                                                )}
                                                <select className='bc-input' value={measure.aggregate} onChange={(event) => changeIn('measures', index, { aggregate: event.target.value, ...(event.target.value === 'count' ? { field: '' } : {}) })} aria-label={`Figure ${letter(index)} works out`}>
                                                    {Object.entries(schema.aggregates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                                </select>
                                                {measure.aggregate !== 'count' && fieldSelect(measure.field, (value) => changeIn('measures', index, { field: value }), anyField ? fieldsOf(page) : numbers(fieldsOf(page)), `Figure ${letter(index)} field`, anyField ? 'Choose a field' : 'Choose a number field')}
                                                <input className='bc-input' value={measure.label} maxLength={60} onChange={(event) => changeIn('measures', index, { label: event.target.value })} placeholder='Column heading (optional)' aria-label={`Figure ${letter(index)} heading`} />
                                                {!['count', 'distinct', 'first'].includes(measure.aggregate) && (
                                                    <select className='bc-input' value={measure.format || 'money'} onChange={(event) => changeIn('measures', index, { format: event.target.value })} aria-label={`Figure ${letter(index)} shown as`}>
                                                        {FORMATS.filter((format) => format.value !== 'percent').map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}
                                                    </select>
                                                )}
                                                {!measure.when && <button type='button' className='bc-link-button' onClick={() => changeIn('measures', index, { when: { ...EMPTY_TEST } })}>Only where...</button>}
                                                {spec.measures.length > 1 && <button type='button' className='bc-link-button' onClick={() => change(withoutMeasure(index))}>Remove</button>}
                                            </div>
                                            {measure.when && (
                                                <div className='bc-builder-block'>
                                                    <span className='bc-muted'>Figure {letter(index)} only counts rows where</span>
                                                    {testLine(measure.when, page, (patch) => changeIn('measures', index, { when: { ...measure.when, ...patch } }), `Figure ${letter(index)} only where`, `m:${index}`, () => changeIn('measures', index, { when: undefined }))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                {spec.measures.length < limits.measures && <button type='button' className='bc-button' onClick={() => change({ measures: [...spec.measures, { page: 0, field: '', aggregate: 'sum', label: '', format: 'money' }] })}>Add a figure</button>}

                                <h4>Formulas</h4>
                                <p className='bc-muted'>Work on the figures by their letters, like spreadsheet columns: =A+B, =(A+B)/A*100. {(schema.functions || ['ABS', 'ROUND', 'MIN', 'MAX', 'IF']).join(', ')} are understood: =IF(A&gt;B, A-B, 0).</p>
                                {spec.formulas.map((formula, index) => (
                                    <div key={index} className='bc-builder-line'>
                                        <input className='bc-input' value={formula.label} maxLength={60} onChange={(event) => changeIn('formulas', index, { label: event.target.value })} placeholder='Column heading' aria-label={`Formula ${index + 1} heading`} />
                                        <input className='bc-input bc-builder-formula' value={formula.expression} maxLength={200} onChange={(event) => changeIn('formulas', index, { expression: event.target.value })} placeholder='=A-B' aria-label={`Formula ${index + 1}`} />
                                        <select className='bc-input' value={formula.format || 'number'} onChange={(event) => changeIn('formulas', index, { format: event.target.value })} aria-label={`Formula ${index + 1} shown as`}>
                                            {FORMATS.map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}
                                        </select>
                                        <button type='button' className='bc-link-button' onClick={() => change(withoutFormula(index))}>Remove</button>
                                    </div>
                                ))}
                                {spec.formulas.length < limits.formulas && <button type='button' className='bc-button' onClick={() => change({ formulas: [...spec.formulas, { label: '', expression: '=', format: 'money' }] })}>Add a formula</button>}
                            </section>

                            <section className='bc-card'>
                                <h3>4. Filters{several ? ` on ${table.label}` : ''}</h3>
                                {filterLines(spec.filters, 0, (filters) => change({ filters }), 'Filter')}
                                {spec.filters.length === 0 && <p className='bc-muted'>No filters: every row of the page counts{spec.dateField ? ', within the period' : ''}.{several ? ' The other pages have their own filters, under each page above.' : ''}</p>}

                                <h4>Filters for the reader</h4>
                                <p className='bc-muted'>Shown at the top of the report next to the period, for whoever runs it to choose from: branch, location, salesperson.</p>
                                {spec.prompts.map((prompt, index) => (
                                    <div key={index} className='bc-builder-line'>
                                        {fieldSelect(prompt.field, (value) => changeIn('prompts', index, { field: value }), fields.filter((field) => field.type !== 'date' && !CALCULATED.test(field.name)), `Reader filter ${index + 1} field`)}
                                        <input className='bc-input' value={prompt.label || ''} maxLength={60} onChange={(event) => changeIn('prompts', index, { label: event.target.value })} placeholder='What to call it (optional)' aria-label={`Reader filter ${index + 1} name`} />
                                        <button type='button' className='bc-link-button' onClick={() => { setPromptValues({}); removeFrom('prompts', index) }}>Remove</button>
                                    </div>
                                ))}
                                {spec.prompts.length < limits.prompts && <button type='button' className='bc-button' onClick={() => change({ prompts: [...spec.prompts, { field: '', label: '' }] })}>Add a filter for the reader</button>}
                            </section>

                            <section className='bc-card'>
                                <h3>5. Tiles, chart and order</h3>
                                <h4>Tiles at the top</h4>
                                <div className='bc-column-chooser'>
                                    {numericOutputs.map((output) => (
                                        <label key={output.index} className='bc-check'>
                                            <input type='checkbox' checked={spec.tiles.some((tile) => tile.output === output.index)} onChange={() => change({ tiles: spec.tiles.some((tile) => tile.output === output.index) ? spec.tiles.filter((tile) => tile.output !== output.index) : (spec.tiles.length < limits.tiles ? [...spec.tiles, { output: output.index, label: '' }] : spec.tiles) })} />
                                            <span>{output.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <h4>Chart</h4>
                                <div className='bc-builder-line'>
                                    <select className='bc-input' value={spec.chart.type} onChange={(event) => change({ chart: { ...spec.chart, type: event.target.value } })} aria-label='Chart type' disabled={!spec.rows.length}>
                                        {schema.charts.map((type) => <option key={type} value={type}>{CHART_LABELS[type]}</option>)}
                                    </select>
                                    {!spec.rows.length && <span className='bc-muted'>A chart needs at least one row grouping to plot against.</span>}
                                </div>
                                {spec.chart.type !== 'none' && spec.rows.length > 0 && (
                                    <div className='bc-column-chooser'>
                                        {numericOutputs.map((output) => (
                                            <label key={output.index} className='bc-check'>
                                                <input type='checkbox' checked={spec.chart.outputs.includes(output.index)} onChange={() => change({ chart: { ...spec.chart, outputs: toggle(spec.chart.outputs, output.index, 3) } })} />
                                                <span>{output.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                <h4>Order and length</h4>
                                <div className='bc-builder-line'>
                                    <select className='bc-input' value={spec.sort.output === null || spec.sort.output === undefined ? '' : spec.sort.output} onChange={(event) => change({ sort: { ...spec.sort, output: event.target.value === '' ? null : Number(event.target.value) } })} aria-label='Sort by'>
                                        <option value=''>In row order</option>
                                        {outputs.map((output) => <option key={output.index} value={output.index}>By {output.label}</option>)}
                                    </select>
                                    <select className='bc-input' value={spec.sort.descending ? 'down' : 'up'} onChange={(event) => change({ sort: { ...spec.sort, descending: event.target.value === 'down' } })} aria-label='Sort direction'>
                                        <option value='down'>Largest first</option>
                                        <option value='up'>Smallest first</option>
                                    </select>
                                    <label className='bc-builder-inline'>
                                        <span className='bc-muted'>Show up to</span>
                                        <input className='bc-input' type='number' min={1} max={5000} value={spec.limit} onChange={(event) => change({ limit: Number(event.target.value) || 500 })} aria-label='Rows to show' />
                                        <span className='bc-muted'>rows</span>
                                    </label>
                                </div>
                                <label className='bc-check'>
                                    <input type='checkbox' checked={spec.pinned} onChange={(event) => setSpec({ ...spec, pinned: event.target.checked })} />
                                    <span>Show this report's tiles and chart on the dashboard</span>
                                </label>
                            </section>

                            <section className='bc-card'>
                                <div className='bc-report-head'>
                                    <div>
                                        <h3>6. Preview and save</h3>
                                        {hasPeriod && (
                                            <div className='bc-range'>
                                                <input type='date' className='bc-input' value={range.from} max={range.to} onChange={(event) => setRange({ ...range, from: event.target.value })} aria-label='Preview from' />
                                                <span className='bc-muted'>to</span>
                                                <input type='date' className='bc-input' value={range.to} min={range.from} onChange={(event) => setRange({ ...range, to: event.target.value })} aria-label='Preview to' />
                                            </div>
                                        )}
                                    </div>
                                    <div className='bc-actions'>
                                        <button type='button' className='bc-button' disabled={!!busy} onClick={preview}>{busy === 'preview' ? 'Running...' : 'Preview'}</button>
                                        <button type='button' className='bc-button' disabled={!!busy || !spec.name.trim()} title={spec.name.trim() ? 'Keep it as a draft, finished or not, and carry on later' : 'Give the report a name first'} onClick={() => save(true)}>{busy === 'draft' ? 'Saving...' : 'Save progress'}</button>
                                        <button type='button' className='bc-button bc-button-primary' disabled={!!busy || !spec.name.trim()} title={spec.name.trim() ? '' : 'Give the report a name first'} onClick={() => save(false)}>{busy === 'save' ? 'Saving...' : (saved && !saved.draft ? 'Save changes' : 'Save report')}</button>
                                    </div>
                                </div>
                                <BCPreparing progress={preparing} />
                                <BCUpdating since={updating} />
                                {report && (
                                    <div className='bc-page'>
                                        {report.meta?.note && <div className='bc-banner bc-banner-info'>{report.meta.note}</div>}

                                        {(report.meta?.prompts || []).length > 0 && (
                                            <div className='bc-filter-bar' role='group' aria-label='Filters for the reader'>
                                                {report.meta.prompts.map((prompt) => (
                                                    <MultiSelect key={prompt.key} label={prompt.label} options={prompt.options} value={promptValues[prompt.key] || []} onChange={(values) => { const next = { ...promptValues, [prompt.key]: values }; setPromptValues(next); run(spec, next) }} />
                                                ))}
                                            </div>
                                        )}

                                        <div className='bc-builder-block' role='group' aria-label='Change the columns'>
                                            <p className='bc-muted'>Rename a column or remove it here. The settings above follow.</p>
                                            <div className='bc-builder-line'>
                                                {spec.rows.map((row, index) => (
                                                    <span key={`r${index}`} className='bc-chip bc-chip-edit'>
                                                        <HeadingBox value={row.label} placeholder={labelIn(fields, row.field)} label={`Rename column ${labelIn(fields, row.field)}`} onCommit={(label) => changeAndRun({ rows: spec.rows.map((entry, at) => (at === index ? { ...entry, label } : entry)) })} />
                                                        <button type='button' className='bc-chip-remove' aria-label={`Remove column ${row.label || labelIn(fields, row.field)}`} onClick={() => changeAndRun(withoutRow(index))}>&times;</button>
                                                    </span>
                                                ))}
                                                {spec.measures.map((measure, index) => (
                                                    <span key={`m${index}`} className='bc-chip bc-chip-edit'>
                                                        <strong>{letter(index)}</strong>
                                                        <HeadingBox value={measure.label} placeholder={measureLabel(measure)} label={`Rename column ${letter(index)}`} onCommit={(label) => changeAndRun({ measures: spec.measures.map((entry, at) => (at === index ? { ...entry, label } : entry)) })} />
                                                        {spec.measures.length > 1 && <button type='button' className='bc-chip-remove' aria-label={`Remove column ${letter(index)}`} onClick={() => changeAndRun(withoutMeasure(index))}>&times;</button>}
                                                    </span>
                                                ))}
                                                {spec.formulas.map((formula, index) => (
                                                    <span key={`f${index}`} className='bc-chip bc-chip-edit'>
                                                        <strong>fx</strong>
                                                        <HeadingBox value={formula.label} placeholder={`Formula ${index + 1}`} label={`Rename formula ${index + 1}`} onCommit={(label) => changeAndRun({ formulas: spec.formulas.map((entry, at) => (at === index ? { ...entry, label } : entry)) })} />
                                                        <button type='button' className='bc-chip-remove' aria-label={`Remove formula ${index + 1}`} onClick={() => changeAndRun(withoutFormula(index))}>&times;</button>
                                                    </span>
                                                ))}
                                            </div>
                                            {spec.across && (report.meta?.across || []).length > 0 && (
                                                <div className='bc-builder-line'>
                                                    <span className='bc-muted'>{acrossLabel} across:</span>
                                                    {report.meta.across.map((value) => (
                                                        <span key={value} className='bc-chip'>
                                                            {value === '' ? '(blank)' : value}
                                                            {value !== '' && <button type='button' className='bc-chip-remove' aria-label={`Leave out ${value}`} title='Leave this one out of the report' onClick={() => changeAndRun(narrowed(spec.across.field, value, false))}>&times;</button>}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {clicked && (
                                                <div className='bc-builder-line' role='status'>
                                                    <span>"{clicked.value}" in {clicked.label}:</span>
                                                    <button type='button' className='bc-button' onClick={() => changeAndRun(narrowed(clicked.field, clicked.value, true))}>Show only this</button>
                                                    <button type='button' className='bc-button' onClick={() => changeAndRun(narrowed(clicked.field, clicked.value, false))}>Leave this out</button>
                                                    <button type='button' className='bc-link-button' onClick={() => setClicked(null)}>Cancel</button>
                                                </div>
                                            )}
                                        </div>

                                        {report.kpis.length > 0 && (
                                            <StatCardGrid min={170}>
                                                {report.kpis.map((kpi) => <StatCard key={kpi.key} label={kpi.label} value={<span title={formatValue(kpi.value, kpi.format)}>{formatKpi(kpi.value, kpi.format)}</span>} />)}
                                            </StatCardGrid>
                                        )}
                                        {report.charts.map((chart) => <BCChart key={chart.key} chart={chart} />)}
                                        <BCDataTable
                                            columns={lettered(report.columns)}
                                            rows={report.rows}
                                            totals={report.totals}
                                            filterable
                                            onDrill={(row, column) => {
                                                const index = Number(column.key.slice(1))
                                                const grouping = spec.rows[index]
                                                // A date bucket or a blank is not a value a filter can be written from.
                                                if (!grouping || typeOf(0, grouping.field) === 'date' || row[column.key] === '(blank)') return
                                                setClicked({ field: grouping.field, value: String(row[column.key]), label: grouping.label || labelIn(fields, grouping.field) })
                                            }}
                                        />
                                        <p className='bc-muted'>{(report.meta?.rowsRead || 0).toLocaleString()} rows read from {report.meta?.table}.</p>
                                    </div>
                                )}
                                {!report && !busy && <p className='bc-muted'>Press Preview to run the report as it stands.</p>}
                            </section>
                        </>
                    )}
                </>
            )}
        </div>
    )
}

export default BCBuilder
