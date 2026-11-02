import './ExportAddressPrompt.css'
import { useContext, useEffect, useRef, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { bindAddressPrompt, setAddressProfile } from '../../utils/exportAddress'

// Why the address could not be worked out, in the words of the filters.
const reasonFor = ({ branch = [], location = [] }) => {
    const named = [
        branch.length ? `branch ${branch.join(', ')}` : '',
        location.length ? `location ${location.join(', ')}` : '',
    ].filter(Boolean).join(' and ')
    return named
        ? `This report is filtered to ${named}, which does not lead to one saved address.`
        : 'This report is not filtered to a branch or location.'
}

/**
 * The box that asks which address a report should print. It sits once at the
 * top of the app, and exporters reach it through utils/exportAddress.js.
 */
const ExportAddressPrompt = () => {
    const { centralCompany, fetchServer, server } = useContext(ContextProvider)
    const [request, setRequest] = useState(null)
    const [picked, setPicked] = useState('')
    const lastPicked = useRef('')
    const open = useRef(null)
    const box = useRef(null)

    useEffect(() => { setAddressProfile(centralCompany) }, [centralCompany])

    useEffect(() => {
        bindAddressPrompt({
            refresh: async () => {
                const response = await fetchServer('POST', {}, 'getCompanyProfile', server)
                if (response && !response.err && response.record) setAddressProfile(response.record)
            },
            ask: (asked) => new Promise((resolve) => {
                // Only one question can be open. A second export ends the first.
                if (open.current) open.current.resolve(null)
                open.current = { resolve }
                setPicked(asked.options.some((entry) => entry.id === lastPicked.current) ? lastPicked.current : (asked.options[0]?.id || ''))
                setRequest(asked)
            }),
        })
        return () => {
            bindAddressPrompt(null)
            if (open.current) open.current.resolve(null)
            open.current = null
        }
    }, [fetchServer, server])

    const finish = (answer) => {
        if (open.current) open.current.resolve(answer)
        open.current = null
        setRequest(null)
    }

    useEffect(() => {
        if (!request) return undefined
        if (box.current) box.current.focus()
        const onKey = (event) => { if (event.key === 'Escape') finish(null) }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [request])

    if (!request) return null
    const { options, where, title } = request
    const useSelected = () => {
        lastPicked.current = picked
        finish(options.find((entry) => entry.id === picked) || null)
    }

    return (
        <div className='export-address-overlay'>
            <div className='export-address-box' role='dialog' aria-modal='true' aria-labelledby='export-address-title' tabIndex={-1} ref={box}>
                <h3 id='export-address-title'>Which address should this report show?</h3>
                {title && <p className='export-address-report'>{title}</p>}
                <p className='export-address-reason'>{reasonFor(where)}</p>
                {options.length ? (
                    <div className='export-address-list' role='radiogroup' aria-labelledby='export-address-title'>
                        {options.map((entry) => (
                            <label key={entry.id} className={`export-address-option${picked === entry.id ? ' selected' : ''}`}>
                                <input type='radio' name='export-address' checked={picked === entry.id} onChange={() => setPicked(entry.id)} />
                                <span>
                                    <strong>{entry.label}</strong>
                                    <span className='export-address-text'>{entry.address}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                ) : (
                    <p className='export-address-empty'>No addresses have been saved yet. An admin can add them under Settings, Company Profile.</p>
                )}
                <div className='export-address-actions'>
                    <button type='button' className='export-address-cancel' onClick={() => finish(null)}>Cancel</button>
                    {options.length
                        ? <button type='button' className='export-address-go' onClick={useSelected}>Use this address</button>
                        : <button type='button' className='export-address-go' onClick={() => finish({ address: '' })}>Export without an address</button>}
                </div>
            </div>
        </div>
    )
}

export default ExportAddressPrompt
