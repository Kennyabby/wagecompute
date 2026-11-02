import { useContext, useEffect, useMemo, useState } from 'react'
import { IoSave, IoTrash, IoAdd, IoLocation } from 'react-icons/io5'
import ContextProvider from '../../Resources/ContextProvider'

const blankAddress = () => ({ id: `address-${Date.now()}-${Math.floor(Math.random() * 10000)}`, label: '', address: '', phone: '', email: '', branches: [], locations: [] })

const sameText = (value) => String(value ?? '').trim().toLowerCase()

// Ticks for the branches or locations the app knows about, and a box for any
// code it does not, such as one from another Business Central connection. A
// code already linked always shows, whether or not it is known.
const LinkPicker = ({ label, known, linked, onChange }) => {
    const [typed, setTyped] = useState('')
    const shown = [...known]
    linked.forEach((value) => { if (!shown.some((entry) => sameText(entry.value) === sameText(value))) shown.push({ value, label: value }) })
    const toggle = (value) => onChange(linked.some((entry) => sameText(entry) === sameText(value))
        ? linked.filter((entry) => sameText(entry) !== sameText(value))
        : [...linked, value])
    const addTyped = () => {
        const value = typed.trim()
        if (value && !linked.some((entry) => sameText(entry) === sameText(value))) onChange([...linked, value])
        setTyped('')
    }
    return (
        <div className='inpcov' style={{ gridColumn: '1 / -1' }}>
            <div>{label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', margin: '6px 0' }}>
                {shown.map((entry) => (
                    <label key={entry.value} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input type='checkbox' checked={linked.some((value) => sameText(value) === sameText(entry.value))} onChange={() => toggle(entry.value)} />
                        {entry.label}
                    </label>
                ))}
            </div>
            <input
                className='forminp'
                aria-label={`Add a code to ${label}`}
                placeholder='Type a code and press Enter'
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                onBlur={addTyped}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTyped() } }}
            />
        </div>
    )
}

const ReportAddresses = ({ saved, onSaved }) => {
    const { fetchServer, server, company, wrhs, centralCompany, refreshCentralCompany, setAlert, setAlertState, setAlertTimeout } = useContext(ContextProvider)
    const [addresses, setAddresses] = useState(saved || [])
    const [saving, setSaving] = useState(false)
    const [bcLookups, setBcLookups] = useState({ locations: [], branches: [] })

    useEffect(() => { setAddresses(saved || []) }, [saved])

    // A workspace without the Business Central module is not asked, since the
    // server would only refuse. Its locations are the warehouses set up here.
    const hasBc = !Array.isArray(centralCompany?.enabledModules) || centralCompany.enabledModules.includes('business-central')
    useEffect(() => {
        if (!hasBc) return undefined
        let active = true
        Promise.resolve(fetchServer('GET', undefined, 'bc/lookups', server))
            .then((response) => {
                if (active && response?.lookups) setBcLookups({ locations: response.lookups.locations || [], branches: response.lookups.branches || [] })
            })
            .catch(() => { /* no connection yet: codes can still be typed */ })
        return () => { active = false }
    }, [hasBc, fetchServer, server])

    const knownLocations = useMemo(() => {
        const list = [...(bcLookups.locations || []).map((entry) => ({ value: entry.value, label: entry.label || entry.value }))]
        ;(wrhs || []).forEach((wrh) => { if (wrh.name && !list.some((entry) => sameText(entry.value) === sameText(wrh.name))) list.push({ value: wrh.name, label: wrh.name }) })
        return list
    }, [bcLookups, wrhs])
    const knownBranches = useMemo(() => (bcLookups.branches || []).map((entry) => ({ value: entry.value, label: entry.label || entry.value })), [bcLookups])

    const change = (id, changes) => setAddresses((list) => list.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)))

    const say = (kind, message, time) => { setAlertState(kind); setAlert(message); setAlertTimeout(time) }

    // One branch or location on two addresses could not be settled without
    // asking, which defeats the link, so it is stopped here.
    const problemIn = (list) => {
        if (list.some((entry) => !entry.label.trim() || !entry.address.trim())) return 'Every address needs a name and the address itself.'
        for (const [field, word] of [['branches', 'Branch'], ['locations', 'Location']]) {
            const seen = new Map()
            for (const entry of list) {
                for (const value of entry[field] || []) {
                    const key = sameText(value)
                    if (seen.has(key)) return `${word} ${value} is linked to both ${seen.get(key)} and ${entry.label}. Keep it on one.`
                    seen.set(key, entry.label)
                }
            }
        }
        return ''
    }

    const save = async () => {
        const problem = problemIn(addresses)
        if (problem) return say('error', problem, 5000)
        setSaving(true)
        try {
            const response = await fetchServer('POST', { prop: [{ db: company }, { reportAddresses: addresses }] }, 'updateDBProfileDoc', server)
            if (!response || response.err || response.mess) throw new Error(response?.mess || 'The addresses could not be saved.')
            onSaved(addresses)
            await refreshCentralCompany()
            say('success', 'Report addresses saved.', 2000)
        } catch (failure) {
            say('error', failure.message, 4000)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className='form-card' style={{ marginTop: 16 }}>
            <div className='formtitle'><IoLocation /> Report Addresses</div>
            <p style={{ margin: '0 0 12px', fontSize: 13 }}>
                Add each address once and link it to its branches and locations. A report filtered to a linked branch or location prints that address. Any other report asks which one to print, with the company address above also on the list.
            </p>
            {addresses.map((entry) => (
                <div key={entry.id} className='form-grid' style={{ borderTop: '1px solid #e4e7eb', paddingTop: 12, marginBottom: 12 }}>
                    <div className='inpcov'>
                        <div>Name</div>
                        <input className='forminp' placeholder='Transamadi Depot' value={entry.label} onChange={(event) => change(entry.id, { label: event.target.value })} />
                    </div>
                    <div className='inpcov'>
                        <div>Address</div>
                        <input className='forminp' value={entry.address} onChange={(event) => change(entry.id, { address: event.target.value })} />
                    </div>
                    <div className='inpcov'>
                        <div>Phone (leave blank to use the company phone)</div>
                        <input className='forminp' value={entry.phone || ''} onChange={(event) => change(entry.id, { phone: event.target.value })} />
                    </div>
                    <div className='inpcov'>
                        <div>Email (leave blank to use the company email)</div>
                        <input className='forminp' value={entry.email || ''} onChange={(event) => change(entry.id, { email: event.target.value })} />
                    </div>
                    <LinkPicker label='Branches using this address' known={knownBranches} linked={entry.branches || []} onChange={(branches) => change(entry.id, { branches })} />
                    <LinkPicker label='Locations using this address' known={knownLocations} linked={entry.locations || []} onChange={(locations) => change(entry.id, { locations })} />
                    <div className='inpcov' style={{ gridColumn: '1 / -1' }}>
                        <button type='button' className='deletebtn' onClick={() => setAddresses((list) => list.filter((other) => other.id !== entry.id))}><IoTrash /> Remove {entry.label || 'this address'}</button>
                    </div>
                </div>
            ))}
            <div className='form-actions'>
                <button type='button' className='savebtn' onClick={() => setAddresses((list) => [...list, blankAddress()])}><IoAdd /> Add Address</button>
                <button type='button' className='savebtn' disabled={saving} onClick={save}><IoSave /> {saving ? 'Saving...' : 'Save Report Addresses'}</button>
            </div>
        </div>
    )
}

export default ReportAddresses
