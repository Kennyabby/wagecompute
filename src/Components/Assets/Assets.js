import './Assets.css'

import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { FaBoxes, FaInfoCircle } from 'react-icons/fa'
import { IoAdd, IoSave, IoCalculator, IoPrint, IoTrash } from 'react-icons/io5'
import ContextProvider from '../../Resources/ContextProvider'

const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 })

const today = () => new Date().toISOString().slice(0, 10)
const toNumber = (value) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
}

const depreciationMethods = [
    { value: 'straight-line', label: 'Straight line' },
    { value: 'reducing-balance', label: 'Reducing balance' },
    { value: 'manual', label: 'Manual only' },
    { value: 'none', label: 'No depreciation' },
]

const emptyAsset = () => ({
    name: '',
    assetNo: '',
    groupId: '',
    groupName: '',
    serialNo: '',
    location: '',
    custodian: '',
    supplier: '',
    purchaseDate: today(),
    postingDate: today(),
    acquisitionCost: '',
    residualValue: '',
    usefulLifeMonths: 60,
    annualDepreciationRate: 20,
    depreciationMethod: 'straight-line',
    paymentStatus: 'unpaid',
    paymentMethod: '',
    paidAmount: '',
    description: '',
})

const emptyGroup = () => ({
    name: '',
    description: '',
    depreciationMethod: 'straight-line',
    usefulLifeMonths: 60,
    annualDepreciationRate: 20,
    residualRate: 0,
})

const Assets = () => {
    const {
        storePath, fetchServer, server, paymentMethods,
        setAlert, setAlertState, setAlertTimeout,
    } = useContext(ContextProvider)

    const [snapshot, setSnapshot] = useState({ assets: [], groups: [], depreciations: [], disposals: [] })
    const [selectedAsset, setSelectedAsset] = useState(null)
    const [assetForm, setAssetForm] = useState(emptyAsset())
    const [groupForm, setGroupForm] = useState(emptyGroup())
    const [activePanel, setActivePanel] = useState('asset')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [depreciationDate, setDepreciationDate] = useState(today())
    const [depreciationAmount, setDepreciationAmount] = useState('')
    const [disposalForm, setDisposalForm] = useState({ postingDate: today(), saleProceeds: '', paymentMethod: '', notes: '' })
    const [showGuide, setShowGuide] = useState(false)

    useEffect(() => {
        storePath('assets')
        document.title = 'Assets | Enterprise Compute Central'
    }, [storePath])

    const activeAssets = useMemo(() => snapshot.assets.filter((asset) => asset.status === 'active'), [snapshot.assets])
    const totalCost = useMemo(() => snapshot.assets.reduce((sum, asset) => sum + toNumber(asset.acquisitionCost), 0), [snapshot.assets])
    const totalDepreciation = useMemo(() => snapshot.depreciations.reduce((sum, row) => sum + toNumber(row.amount), 0), [snapshot.depreciations])
    const netBookValue = Math.max(totalCost - totalDepreciation, 0)

    const loadSnapshot = useCallback(async () => {
        setLoading(true)
        try {
            const resp = await fetchServer('POST', {}, 'assets/getSnapshot', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Unable to load asset records.')
            setSnapshot({
                assets: resp.assets || [],
                groups: resp.groups || [],
                depreciations: resp.depreciations || [],
                disposals: resp.disposals || [],
            })
        } catch (error) {
            setAlertState('error')
            setAlert(error.message || 'Unable to load asset records.')
            setAlertTimeout(3500)
        } finally {
            setLoading(false)
        }
    }, [fetchServer, server, setAlert, setAlertState, setAlertTimeout])

    useEffect(() => {
        loadSnapshot()
    }, [loadSnapshot])

    const notifySuccess = (message) => {
        setAlertState('success')
        setAlert(message)
        setAlertTimeout(1800)
    }

    const notifyError = (message) => {
        setAlertState('error')
        setAlert(message)
        setAlertTimeout(4000)
    }

    const handleAssetChange = (field, value) => {
        setAssetForm((prev) => {
            const next = { ...prev, [field]: value }
            if (field === 'groupId') {
                const group = snapshot.groups.find((item) => String(item._id) === String(value))
                next.groupName = group?.name || ''
                if (group) {
                    next.depreciationMethod = group.depreciationMethod || next.depreciationMethod
                    next.usefulLifeMonths = group.usefulLifeMonths || next.usefulLifeMonths
                    next.annualDepreciationRate = group.annualDepreciationRate || next.annualDepreciationRate
                    next.residualValue = next.acquisitionCost && group.residualRate ? (toNumber(next.acquisitionCost) * toNumber(group.residualRate) / 100).toFixed(2) : next.residualValue
                }
            }
            if (field === 'acquisitionCost') {
                const group = snapshot.groups.find((item) => String(item._id) === String(next.groupId))
                if (group?.residualRate) next.residualValue = (toNumber(value) * toNumber(group.residualRate) / 100).toFixed(2)
            }
            if (field === 'paymentStatus' && value === 'paid') next.paidAmount = next.acquisitionCost
            return next
        })
    }

    const selectAsset = (asset) => {
        setSelectedAsset(asset)
        setAssetForm({
            ...emptyAsset(),
            ...asset,
            _id: asset._id,
            acquisitionCost: asset.acquisitionCost || '',
            paidAmount: asset.paidAmount || '',
            residualValue: asset.residualValue || '',
        })
        setActivePanel('asset')
    }

    const resetAsset = () => {
        setSelectedAsset(null)
        setAssetForm(emptyAsset())
        setActivePanel('asset')
    }

    const saveGroup = async () => {
        if (!groupForm.name.trim()) return notifyError('Enter an asset group name.')
        setSaving(true)
        try {
            const resp = await fetchServer('POST', { group: groupForm }, 'assets/upsertGroup', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Could not save asset group.')
            notifySuccess('Asset group saved.')
            setGroupForm(emptyGroup())
            await loadSnapshot()
        } catch (error) {
            notifyError(error.message || 'Could not save asset group.')
        } finally {
            setSaving(false)
        }
    }

    const saveAsset = async () => {
        if (!assetForm.name.trim()) return notifyError('Enter the asset name.')
        if (toNumber(assetForm.acquisitionCost) <= 0) return notifyError('Enter a valid acquisition cost.')
        setSaving(true)
        try {
            const resp = await fetchServer('POST', { asset: assetForm }, 'assets/upsertAsset', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Could not save asset.')
            notifySuccess('Asset saved.')
            setSelectedAsset(resp.record || null)
            await loadSnapshot()
        } catch (error) {
            notifyError(error.message || 'Could not save asset.')
        } finally {
            setSaving(false)
        }
    }

    const postAsset = async () => {
        if (!selectedAsset?._id) return notifyError('Save the asset before posting.')
        setSaving(true)
        try {
            const resp = await fetchServer('POST', { assetId: selectedAsset._id }, 'assets/postAsset', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Could not post asset.')
            notifySuccess('Asset posted to accounting.')
            setSelectedAsset(resp.record || null)
            await loadSnapshot()
        } catch (error) {
            notifyError(error.message || 'Could not post asset.')
        } finally {
            setSaving(false)
        }
    }

    const postDepreciation = async () => {
        if (!selectedAsset?._id) return notifyError('Select an active asset first.')
        setSaving(true)
        try {
            const resp = await fetchServer('POST', {
                assetId: selectedAsset._id,
                postingDate: depreciationDate,
                amount: depreciationAmount,
                type: depreciationAmount ? 'manual' : 'automatic',
            }, 'assets/postDepreciation', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Could not post depreciation.')
            notifySuccess('Depreciation posted.')
            setDepreciationAmount('')
            await loadSnapshot()
        } catch (error) {
            notifyError(error.message || 'Could not post depreciation.')
        } finally {
            setSaving(false)
        }
    }

    const runDepreciation = async () => {
        setSaving(true)
        try {
            const resp = await fetchServer('POST', { toDate: depreciationDate }, 'assets/runDepreciation', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Could not run automatic depreciation.')
            notifySuccess(resp.mess || 'Automatic depreciation processed.')
            await loadSnapshot()
        } catch (error) {
            notifyError(error.message || 'Could not run automatic depreciation.')
        } finally {
            setSaving(false)
        }
    }

    const disposeAsset = async () => {
        if (!selectedAsset?._id) return notifyError('Select an asset first.')
        setSaving(true)
        try {
            const resp = await fetchServer('POST', { assetId: selectedAsset._id, ...disposalForm }, 'assets/disposeAsset', server)
            if (resp.err || !resp.ok) throw new Error(resp.mess || 'Could not dispose asset.')
            notifySuccess('Asset disposal posted.')
            setDisposalForm({ postingDate: today(), saleProceeds: '', paymentMethod: '', notes: '' })
            await loadSnapshot()
        } catch (error) {
            notifyError(error.message || 'Could not dispose asset.')
        } finally {
            setSaving(false)
        }
    }

    const printRegister = () => {
        window.print()
    }

    const renderSelectMethod = (value, onChange) => (
        <select value={value} onChange={(event) => onChange(event.target.value)}>
            {depreciationMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
        </select>
    )

    return (
        <div className='asset-module'>
            <section className='asset-hero'>
                <div>
                    <span className='asset-kicker'>Fixed assets</span>
                    <h1>Asset Register</h1>
                    <p>Track assets, groups, acquisition posting, depreciation, disposals, and accounting-ready balances from one clean workspace.</p>
                </div>
                <div className='asset-hero-actions'>
                    <button className='asset-soft-btn' onClick={() => setShowGuide((prev) => !prev)}><FaInfoCircle /> Help</button>
                    <button className='asset-soft-btn' onClick={loadSnapshot} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
                    <button className='asset-main-btn' onClick={resetAsset}><IoAdd /> New Asset</button>
                </div>
            </section>

            {showGuide && (
                <section className='asset-guide'>
                    <strong>Asset workflow:</strong>
                    <span>Create asset groups first, link depreciation rules, save an asset as draft, post it when verified, then run depreciation monthly or post manual depreciation when needed. Disposal clears cost and accumulated depreciation and posts any gain/loss to the linked G/L accounts.</span>
                </section>
            )}

            <section className='asset-kpi-grid'>
                <div><span>Total cost</span><strong>{money.format(totalCost)}</strong></div>
                <div><span>Accumulated depreciation</span><strong>{money.format(totalDepreciation)}</strong></div>
                <div><span>Net book value</span><strong>{money.format(netBookValue)}</strong></div>
                <div><span>Active assets</span><strong>{activeAssets.length}</strong></div>
            </section>

            <div className='asset-layout'>
                <section className='asset-list-panel'>
                    <div className='asset-panel-head'>
                        <div>
                            <h2>Register</h2>
                            <p>{snapshot.assets.length} asset record(s)</p>
                        </div>
                        <button className='asset-icon-btn' onClick={printRegister}><IoPrint /></button>
                    </div>
                    <div className='asset-table-wrap'>
                        <table className='asset-table'>
                            <thead>
                                <tr>
                                    <th>Asset</th>
                                    <th>Group</th>
                                    <th>Status</th>
                                    <th>Cost</th>
                                    <th>Next dep.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {snapshot.assets.map((asset) => (
                                    <tr key={asset._id || asset.assetNo} onClick={() => selectAsset(asset)} className={selectedAsset?._id === asset._id ? 'selected' : ''}>
                                        <td><strong>{asset.assetNo || '--'}</strong><span>{asset.name}</span></td>
                                        <td>{asset.groupName || '--'}</td>
                                        <td><span className={`asset-status ${asset.status || 'draft'}`}>{asset.status || 'draft'}</span></td>
                                        <td>{money.format(asset.acquisitionCost || 0)}</td>
                                        <td>{asset.nextDepreciationDate || '--'}</td>
                                    </tr>
                                ))}
                                {!snapshot.assets.length && (
                                    <tr><td colSpan='5' className='asset-empty'>{loading ? 'Loading assets...' : 'No asset record yet.'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className='asset-detail-panel'>
                    <div className='asset-tabs'>
                        <button className={activePanel === 'asset' ? 'active' : ''} onClick={() => setActivePanel('asset')}>Asset</button>
                        <button className={activePanel === 'groups' ? 'active' : ''} onClick={() => setActivePanel('groups')}>Groups</button>
                        <button className={activePanel === 'depreciation' ? 'active' : ''} onClick={() => setActivePanel('depreciation')}>Depreciation</button>
                        <button className={activePanel === 'disposal' ? 'active' : ''} onClick={() => setActivePanel('disposal')}>Disposal</button>
                    </div>

                    {activePanel === 'asset' && (
                        <div className='asset-form-card'>
                            <div className='asset-form-head'><FaBoxes /><div><h2>{selectedAsset ? selectedAsset.name : 'New asset'}</h2><p>Save as draft, then post when the acquisition is verified.</p></div></div>
                            <div className='asset-form-grid'>
                                <label><span>Asset name</span><input value={assetForm.name} onChange={(e) => handleAssetChange('name', e.target.value)} /></label>
                                <label><span>Asset number</span><input value={assetForm.assetNo || ''} placeholder='Auto if blank' onChange={(e) => handleAssetChange('assetNo', e.target.value)} /></label>
                                <label><span>Asset group</span><select value={assetForm.groupId || ''} onChange={(e) => handleAssetChange('groupId', e.target.value)}><option value=''>Select group</option>{snapshot.groups.map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}</select></label>
                                <label><span>Serial number</span><input value={assetForm.serialNo || ''} onChange={(e) => handleAssetChange('serialNo', e.target.value)} /></label>
                                <label><span>Location</span><input value={assetForm.location || ''} onChange={(e) => handleAssetChange('location', e.target.value)} /></label>
                                <label><span>Custodian</span><input value={assetForm.custodian || ''} onChange={(e) => handleAssetChange('custodian', e.target.value)} /></label>
                                <label><span>Supplier</span><input value={assetForm.supplier || ''} onChange={(e) => handleAssetChange('supplier', e.target.value)} /></label>
                                <label><span>Purchase date</span><input type='date' value={assetForm.purchaseDate || today()} onChange={(e) => handleAssetChange('purchaseDate', e.target.value)} /></label>
                                <label><span>Posting date</span><input type='date' value={assetForm.postingDate || today()} onChange={(e) => handleAssetChange('postingDate', e.target.value)} /></label>
                                <label><span>Acquisition cost</span><input type='number' value={assetForm.acquisitionCost} onChange={(e) => handleAssetChange('acquisitionCost', e.target.value)} /></label>
                                <label><span>Residual value</span><input type='number' value={assetForm.residualValue} onChange={(e) => handleAssetChange('residualValue', e.target.value)} /></label>
                                <label><span>Useful life months</span><input type='number' value={assetForm.usefulLifeMonths} onChange={(e) => handleAssetChange('usefulLifeMonths', e.target.value)} /></label>
                                <label><span>Depreciation type</span>{renderSelectMethod(assetForm.depreciationMethod, (value) => handleAssetChange('depreciationMethod', value))}</label>
                                <label><span>Reducing balance annual rate %</span><input type='number' value={assetForm.annualDepreciationRate || ''} onChange={(e) => handleAssetChange('annualDepreciationRate', e.target.value)} /></label>
                                <label><span>Payment status</span><select value={assetForm.paymentStatus} onChange={(e) => handleAssetChange('paymentStatus', e.target.value)}><option value='unpaid'>Unpaid</option><option value='partial'>Partial</option><option value='paid'>Paid</option></select></label>
                                <label><span>Payment method</span><select value={assetForm.paymentMethod || ''} onChange={(e) => handleAssetChange('paymentMethod', e.target.value)}><option value=''>None / payable</option>{paymentMethods.map((method) => <option key={method.name} value={method.name}>{method.name}</option>)}</select></label>
                                <label><span>Paid amount</span><input type='number' value={assetForm.paidAmount} onChange={(e) => handleAssetChange('paidAmount', e.target.value)} /></label>
                                <label className='asset-wide'><span>Description</span><textarea value={assetForm.description || ''} onChange={(e) => handleAssetChange('description', e.target.value)} /></label>
                            </div>
                            <div className='asset-actions'>
                                <button className='asset-main-btn' onClick={saveAsset} disabled={saving}><IoSave /> {saving ? 'Saving...' : 'Save Asset'}</button>
                                <button className='asset-soft-btn' onClick={postAsset} disabled={saving || !selectedAsset || selectedAsset.status === 'active'}>Post Asset</button>
                            </div>
                        </div>
                    )}

                    {activePanel === 'groups' && (
                        <div className='asset-form-card'>
                            <div className='asset-form-head'><FaBoxes /><div><h2>Asset groups</h2><p>Set default depreciation and G/L behavior for asset families.</p></div></div>
                            <div className='asset-form-grid'>
                                <label><span>Group name</span><input value={groupForm.name} onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))} /></label>
                                <label><span>Depreciation type</span>{renderSelectMethod(groupForm.depreciationMethod, (value) => setGroupForm((prev) => ({ ...prev, depreciationMethod: value })))}</label>
                                <label><span>Useful life months</span><input type='number' value={groupForm.usefulLifeMonths} onChange={(e) => setGroupForm((prev) => ({ ...prev, usefulLifeMonths: e.target.value }))} /></label>
                                <label><span>Reducing balance annual rate %</span><input type='number' value={groupForm.annualDepreciationRate} onChange={(e) => setGroupForm((prev) => ({ ...prev, annualDepreciationRate: e.target.value }))} /></label>
                                <label><span>Residual rate %</span><input type='number' value={groupForm.residualRate} onChange={(e) => setGroupForm((prev) => ({ ...prev, residualRate: e.target.value }))} /></label>
                                <label className='asset-wide'><span>Description</span><textarea value={groupForm.description} onChange={(e) => setGroupForm((prev) => ({ ...prev, description: e.target.value }))} /></label>
                            </div>
                            <div className='asset-actions'><button className='asset-main-btn' onClick={saveGroup} disabled={saving}><IoSave /> Save Group</button></div>
                            <div className='asset-chip-list'>{snapshot.groups.map((group) => <button key={group._id} onClick={() => setGroupForm({ ...emptyGroup(), ...group })}>{group.name}<span>{group.depreciationMethod}</span></button>)}</div>
                        </div>
                    )}

                    {activePanel === 'depreciation' && (
                        <div className='asset-form-card'>
                            <div className='asset-form-head'><IoCalculator /><div><h2>Depreciation</h2><p>Post manual depreciation or run automatic depreciation up to the selected date.</p></div></div>
                            <div className='asset-form-grid'>
                                <label><span>Posting date / run to date</span><input type='date' value={depreciationDate} onChange={(e) => setDepreciationDate(e.target.value)} /></label>
                                <label><span>Manual amount for selected asset</span><input type='number' value={depreciationAmount} placeholder='Blank uses asset rule' onChange={(e) => setDepreciationAmount(e.target.value)} /></label>
                            </div>
                            <div className='asset-actions'>
                                <button className='asset-main-btn' onClick={postDepreciation} disabled={saving || !selectedAsset}>Post Selected Asset</button>
                                <button className='asset-soft-btn' onClick={runDepreciation} disabled={saving}>Run Automatic Depreciation</button>
                            </div>
                            <div className='asset-mini-history'>{snapshot.depreciations.slice(0, 8).map((row) => <div key={row._id || row.referenceNo}><strong>{row.assetNo}</strong><span>{row.period}</span><b>{money.format(row.amount)}</b></div>)}</div>
                        </div>
                    )}

                    {activePanel === 'disposal' && (
                        <div className='asset-form-card'>
                            <div className='asset-form-head'><IoTrash /><div><h2>Asset disposal</h2><p>Sell or retire an asset. The engine clears cost, accumulated depreciation, and posts gain/loss.</p></div></div>
                            <div className='asset-form-grid'>
                                <label><span>Posting date</span><input type='date' value={disposalForm.postingDate} onChange={(e) => setDisposalForm((prev) => ({ ...prev, postingDate: e.target.value }))} /></label>
                                <label><span>Sale proceeds</span><input type='number' value={disposalForm.saleProceeds} onChange={(e) => setDisposalForm((prev) => ({ ...prev, saleProceeds: e.target.value }))} /></label>
                                <label><span>Payment method</span><select value={disposalForm.paymentMethod} onChange={(e) => setDisposalForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}><option value=''>No proceeds</option>{paymentMethods.map((method) => <option key={method.name} value={method.name}>{method.name}</option>)}</select></label>
                                <label className='asset-wide'><span>Notes</span><textarea value={disposalForm.notes} onChange={(e) => setDisposalForm((prev) => ({ ...prev, notes: e.target.value }))} /></label>
                            </div>
                            <div className='asset-actions'><button className='asset-main-btn' onClick={disposeAsset} disabled={saving || !selectedAsset}>Post Disposal</button></div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}

export default Assets
