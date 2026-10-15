import { useEffect, useState } from 'react'
import { formatValue } from './bcFormat'

/**
 * Document classes: names for the number series that tell apart postings
 * Business Central gives the same type, such as IJ for real adjustments, DMG
 * for damages and CSM for consumption. The prefixes the data uses are found
 * first, so they are named from a list and not typed from memory. Reports
 * then split adjustments by these names.
 */
const BCDocClasses = ({ api, notify }) => {
    const [found, setFound] = useState(null)
    const [names, setNames] = useState({})
    const [extra, setExtra] = useState({ prefix: '', label: '' })
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')

    const discover = async () => {
        setBusy('discover')
        setError('')
        try {
            const response = await api.discoverDocumentClasses()
            setFound(response)
            setNames(Object.fromEntries((response.classes || []).map((entry) => [entry.prefix, entry.label])))
        } catch (failure) { setError(failure.message) } finally { setBusy('') }
    }
    useEffect(() => { discover() // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [api])

    const save = async () => {
        setBusy('save')
        try {
            const classes = Object.entries(names).filter(([, label]) => String(label || '').trim()).map(([prefix, label]) => ({ prefix, label }))
            const response = await api.saveDocumentClasses(classes)
            setNames(Object.fromEntries(response.documentClasses.map((entry) => [entry.prefix, entry.label])))
            notify('success', `${response.documentClasses.length} document class(es) saved. Reports split adjustments by them from now on.`)
        } catch (failure) { notify('error', failure.message) } finally { setBusy('') }
    }

    const addExtra = () => {
        const prefix = extra.prefix.trim().toUpperCase()
        if (!prefix || !extra.label.trim()) return
        setNames({ ...names, [prefix]: extra.label.trim() })
        setExtra({ prefix: '', label: '' })
    }

    // Prefixes named before but not seen in the data are still listed, so
    // nothing saved disappears from view.
    const seen = new Set((found?.prefixes || []).map((entry) => entry.prefix))
    const namedOnly = Object.keys(names).filter((prefix) => !seen.has(prefix))

    return (
        <section className='bc-card'>
            <h3>Document classes</h3>
            <p className='bc-muted'>
                Postings Business Central calls the same thing, such as negative adjustments, can be told apart by how their document numbers begin: IJ for real adjustments, DMG for damages, CSM for consumption, for example. Name each prefix below. The income statement, the profit tiles and their breakdowns then show each class as its own figure. A number that matches no prefix counts as Other. The longest matching prefix wins.
            </p>
            {error && <div className='bc-banner bc-banner-error'>{error}</div>}
            <div className='bc-einv-toolbar'>
                <button type='button' className='bc-button' disabled={!!busy} onClick={discover}>{busy === 'discover' ? 'Looking...' : 'Look for prefixes again'}</button>
                {found && <span className='bc-muted'>Found in adjustment postings from {found.from} to {found.to}.</span>}
            </div>
            {!found && !error && <p className='bc-empty'>Looking at the document numbers in your adjustments...</p>}
            {found && (
                <div className='bc-table-scroll'>
                    <table className='bc-table'>
                        <thead>
                            <tr><th>Prefix</th><th className='bc-num'>Item postings</th><th className='bc-num'>G/L postings</th><th className='bc-num'>Amount</th><th>Examples</th><th>Class name</th></tr>
                        </thead>
                        <tbody>
                            {found.prefixes.map((entry) => (
                                <tr key={entry.prefix}>
                                    <td><strong>{entry.prefix}</strong></td>
                                    <td className='bc-num'>{entry.items.toLocaleString()}</td>
                                    <td className='bc-num'>{entry.ledger.toLocaleString()}</td>
                                    <td className='bc-num'>{formatValue(entry.amount, 'money')}</td>
                                    <td>{entry.examples.join(', ')}</td>
                                    <td><input className='bc-input' aria-label={`Class name for ${entry.prefix}`} placeholder='Leave blank to count as Other' value={names[entry.prefix] || ''} onChange={(event) => setNames({ ...names, [entry.prefix]: event.target.value })} /></td>
                                </tr>
                            ))}
                            {namedOnly.map((prefix) => (
                                <tr key={prefix}>
                                    <td><strong>{prefix}</strong></td>
                                    <td colSpan={4} className='bc-muted'>Not seen in the last year's adjustments</td>
                                    <td><input className='bc-input' aria-label={`Class name for ${prefix}`} value={names[prefix] || ''} onChange={(event) => setNames({ ...names, [prefix]: event.target.value })} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className='bc-einv-form'>
                <label className='bc-field bc-field-narrow'><span className='bc-field-label'>Another prefix</span><input className='bc-input' placeholder='For example DMG' value={extra.prefix} onChange={(event) => setExtra({ ...extra, prefix: event.target.value })} /></label>
                <label className='bc-field'><span className='bc-field-label'>Its class name</span><input className='bc-input' placeholder='For example Damages' value={extra.label} onChange={(event) => setExtra({ ...extra, label: event.target.value })} /></label>
                <button type='button' className='bc-button' disabled={!extra.prefix.trim() || !extra.label.trim()} onClick={addExtra}>Add</button>
            </div>
            <div className='bc-einv-actions'>
                <button type='button' className='bc-button bc-button-primary' disabled={!!busy} onClick={save}>{busy === 'save' ? 'Saving...' : 'Save document classes'}</button>
            </div>
        </section>
    )
}

export default BCDocClasses
