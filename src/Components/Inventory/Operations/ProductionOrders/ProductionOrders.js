import './ProductionOrders.css'

import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import ContextProvider from '../../../../Resources/ContextProvider'

const MODE_COPY = {
    production: {
        title: 'Production Order',
        subtitle: 'Consume raw materials and receive finished goods into stock.',
        referencePrefix: 'PROD',
        componentTitle: 'Raw materials / components',
        outputTitle: 'Finished goods output',
    },
    assembly: {
        title: 'Assembly Order',
        subtitle: 'Assemble selected components into sellable goods.',
        referencePrefix: 'ASM',
        componentTitle: 'Assembly components',
        outputTitle: 'Assembled output',
    },
    damage: {
        title: 'Damage / Loss Note',
        subtitle: 'Record damaged, expired, missing, or written-off stock.',
        referencePrefix: 'LOSS',
        componentTitle: 'Items to write off',
        outputTitle: '',
    },
}

const toNumber = (value) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
}

const emptyLine = () => ({
    productId: '',
    productName: '',
    location: '',
    quantity: '',
    costPrice: '',
    totalCost: 0,
})

const ProductionOrders = ({ mode = 'production', postingDate, searchQuery }) => {
    const {
        server, fetchServer, products, settings, company,
        getProductsWithStock, setAlert, setAlertState, setAlertTimeout,
    } = useContext(ContextProvider)

    const copy = MODE_COPY[mode] || MODE_COPY.production
    const [warehouse, setWarehouse] = useState('')
    const [referenceNo, setReferenceNo] = useState(`${copy.referencePrefix}-${Date.now()}`)
    const [notes, setNotes] = useState('')
    const [reason, setReason] = useState('Damage/Loss')
    const [components, setComponents] = useState([emptyLine()])
    const [outputs, setOutputs] = useState([emptyLine()])
    const [orders, setOrders] = useState([])
    const [isPosting, setIsPosting] = useState(false)

    const warehouses = useMemo(() => {
        const warehouseSetting = (settings || []).find((setting) => setting?.name === 'warehouses')
        return warehouseSetting?.warehouses || []
    }, [settings])

    const goodsProducts = useMemo(() => {
        const query = String(searchQuery || '').toLowerCase()
        return (products || [])
            .filter((product) => product?.type === 'goods')
            .filter((product) => {
                if (!query) return true
                return String(product.name || '').toLowerCase().includes(query) || String(product.i_d || '').toLowerCase().includes(query)
            })
    }, [products, searchQuery])

    useEffect(() => {
        setReferenceNo(`${copy.referencePrefix}-${Date.now()}`)
        setComponents([emptyLine()])
        setOutputs([emptyLine()])
        setNotes('')
        setReason('Damage/Loss')
    }, [mode, copy.referencePrefix])

    useEffect(() => {
        const purchaseWarehouse = warehouses.find((item) => item.purchase)
        if (!warehouse && purchaseWarehouse?.name) setWarehouse(purchaseWarehouse.name)
    }, [warehouses, warehouse])

    const loadOrders = useCallback(async () => {
        if (!company || mode === 'damage') return
        const resp = await fetchServer('POST', {
            query: { orderType: mode },
            limit: 50,
        }, 'getProductionOrders', server)
        if (!resp.err && Array.isArray(resp.record)) {
            setOrders(resp.record)
        }
    }, [company, fetchServer, mode, server])

    useEffect(() => {
        loadOrders()
    }, [loadOrders])

    const lineProduct = (productId) => goodsProducts.find((product) => product.i_d === productId) || (products || []).find((product) => product.i_d === productId)

    const updateLine = (kind, index, field, value) => {
        const setter = kind === 'output' ? setOutputs : setComponents
        setter((lines) => {
            const next = [...lines]
            const current = { ...next[index], [field]: value }
            if (field === 'productId') {
                const product = lineProduct(value)
                current.productName = product?.name || ''
                current.costPrice = product?.stockSummary?.averageCost || product?.costPrice || current.costPrice || current.unitCost || ''
                if (kind === 'component' && !current.location) {
                    current.location = warehouse || ''
                }
                if (!warehouse && product?.productionSetup?.defaultOutputWarehouse) {
                    setWarehouse(product.productionSetup.defaultOutputWarehouse)
                }
                if (!current.quantity && product?.productionSetup?.batchSize) {
                    current.quantity = product.productionSetup.batchSize
                }
                if (kind === 'output' && Array.isArray(product?.billOfMaterials) && product.billOfMaterials.length) {
                    setComponents(product.billOfMaterials.map((bomLine) => ({
                        productId: bomLine.productId || '',
                        productName: bomLine.productName || '',
                        location: bomLine.location || warehouse || '',
                        quantity: bomLine.quantity || '',
                        costPrice: bomLine.costPrice || bomLine.unitCost || '',
                        totalCost: toNumber(bomLine.totalCost) || toNumber(bomLine.quantity) * toNumber(bomLine.costPrice || bomLine.unitCost),
                    })))
                }
            }
            const qty = toNumber(current.quantity)
            const costPrice = toNumber(current.costPrice || current.unitCost)
            current.totalCost = qty * costPrice
            delete current.unitCost
            next[index] = current
            return next
        })
    }

    const addLine = (kind) => {
        const setter = kind === 'output' ? setOutputs : setComponents
        setter((lines) => [...lines, emptyLine()])
    }

    const removeLine = (kind, index) => {
        const setter = kind === 'output' ? setOutputs : setComponents
        setter((lines) => lines.length <= 1 ? lines : lines.filter((_, lineIndex) => lineIndex !== index))
    }

    const normalizeLines = (lines) => lines
        .map((line) => {
            const { unitCost, ...cleanLine } = line
            return {
                ...cleanLine,
                location: cleanLine.location || warehouse || '',
                quantity: toNumber(cleanLine.quantity),
                costPrice: toNumber(cleanLine.costPrice || unitCost),
                totalCost: toNumber(cleanLine.totalCost) || toNumber(cleanLine.quantity) * toNumber(cleanLine.costPrice || unitCost),
            }
        })
        .filter((line) => line.productId && line.quantity > 0)

    const validate = () => {
        if (!warehouse) return 'Select a warehouse before posting.'
        const cleanComponents = normalizeLines(components)
        const cleanOutputs = normalizeLines(outputs)
        if (!cleanComponents.length) return mode === 'damage' ? 'Add at least one damaged/lost item.' : 'Add at least one component.'
        if (mode !== 'damage' && !cleanOutputs.length) return 'Add at least one output product.'
        return ''
    }

    const refreshInventory = async () => {
        try {
            await getProductsWithStock(company, products)
        } catch (e) { /* keep user flow smooth if refresh fails */ }
    }

    const postDocument = async () => {
        const error = validate()
        if (error) {
            setAlertState('error')
            setAlert(error)
            setAlertTimeout(3000)
            return
        }

        setIsPosting(true)
        setAlertState('info')
        setAlert(`Posting ${copy.title.toLowerCase()}...`)
        setAlertTimeout(100000)

        const cleanComponents = normalizeLines(components)
        const cleanOutputs = normalizeLines(outputs)

        try {
            if (mode === 'damage') {
                const resp = await fetchServer('POST', {
                    note: {
                        referenceNo,
                        warehouse,
                        postingDate,
                        reason,
                        notes,
                        lines: cleanComponents,
                    },
                }, 'postDamageLossNote', server)
                if (resp.err) throw new Error(resp.mess || resp.message || 'Could not post damage/loss note.')
            } else {
                const createResp = await fetchServer('POST', {
                    order: {
                        orderNumber: referenceNo,
                        orderType: mode,
                        productId: cleanOutputs[0]?.productId || '',
                        productName: cleanOutputs[0]?.productName || '',
                        quantity: cleanOutputs[0]?.quantity || 0,
                        components: cleanComponents,
                        outputs: cleanOutputs,
                        warehouse,
                        postingDate,
                        notes,
                    },
                }, 'createProductionOrder', server)
                if (createResp.err || !createResp.record?._id) throw new Error(createResp.mess || 'Could not create order.')

                const orderId = createResp.record._id?.$oid || createResp.record._id
                const postResp = await fetchServer('POST', {
                    orderId,
                }, 'postProductionOrder', server)
                if (postResp.err) throw new Error(postResp.mess || postResp.message || 'Could not post order.')
                await loadOrders()
            }

            setAlertState('success')
            setAlert(`${copy.title} posted successfully.`)
            setAlertTimeout(1200)
            setReferenceNo(`${copy.referencePrefix}-${Date.now()}`)
            setComponents([emptyLine()])
            setOutputs([emptyLine()])
            setNotes('')
            await refreshInventory()
        } catch (err) {
            setAlertState('error')
            setAlert(err.message || `Unable to post ${copy.title.toLowerCase()}.`)
            setAlertTimeout(5000)
        } finally {
            setIsPosting(false)
        }
    }

    const renderLines = (lines, kind) => (
        <div className='inv-prod-lines'>
            {lines.map((line, index) => {
                const product = lineProduct(line.productId)
                const stockLocation = kind === 'component' ? (line.location || warehouse) : warehouse
                const available = stockLocation ? product?.locationStock?.[stockLocation]?.quantity || product?.locationStockDetails?.[stockLocation]?.closingQty || 0 : product?.totalStock || product?.stockSummary?.closingQty || 0
                return (
                    <div className={`inv-prod-line ${kind === 'component' ? 'inv-prod-line-source' : ''}`} key={`${kind}-${index}`}>
                        <select value={line.productId} onChange={(e) => updateLine(kind, index, 'productId', e.target.value)}>
                            <option value=''>Select product</option>
                            {goodsProducts.map((productItem) => (
                                <option key={productItem.i_d} value={productItem.i_d}>
                                    {productItem.i_d} - {productItem.name}
                                </option>
                            ))}
                        </select>
                        {kind === 'component' && (
                            <select value={line.location || ''} onChange={(e) => updateLine(kind, index, 'location', e.target.value)}>
                                <option value=''>Source location</option>
                                {warehouses.map((item) => (
                                    <option key={item.name} value={item.name}>{item.name}</option>
                                ))}
                            </select>
                        )}
                        <input
                            type='number'
                            min='0'
                            placeholder='Qty'
                            value={line.quantity}
                            onChange={(e) => updateLine(kind, index, 'quantity', e.target.value)}
                        />
                        <input
                            type='number'
                            min='0'
                            placeholder='Cost price'
                            value={line.costPrice ?? line.unitCost ?? ''}
                            onChange={(e) => updateLine(kind, index, 'costPrice', e.target.value)}
                        />
                        <div className='inv-prod-line-total'>
                            <span>Total</span>
                            <strong>{Number(line.totalCost || 0).toLocaleString()}</strong>
                        </div>
                        <div className='inv-prod-line-stock'>
                            <span>Available</span>
                            <strong>{Number(available || 0).toLocaleString()}</strong>
                        </div>
                        <button type='button' className='inv-prod-remove' onClick={() => removeLine(kind, index)}>Remove</button>
                    </div>
                )
            })}
            <button type='button' className='inv-prod-add-line' onClick={() => addLine(kind)}>+ Add line</button>
        </div>
    )

    return (
        <div className='inv-prod-page'>
            <section className='inv-prod-hero'>
                <div>
                    <span className='inv-prod-kicker'>Inventory Operations</span>
                    <h2>{copy.title}</h2>
                    <p>{copy.subtitle}</p>
                </div>
                <button type='button' className='inv-prod-post-btn' disabled={isPosting} onClick={postDocument}>
                    {isPosting ? 'Posting...' : `Post ${copy.title}`}
                </button>
            </section>

            <section className='inv-prod-card'>
                <div className='inv-prod-grid'>
                    <label>
                        <span>Reference</span>
                        <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
                    </label>
                    <label>
                        <span>Warehouse</span>
                        <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
                            <option value=''>Select warehouse</option>
                            {warehouses.map((item) => (
                                <option key={item.name} value={item.name}>{item.name}</option>
                            ))}
                        </select>
                    </label>
                    {mode === 'damage' && (
                        <label>
                            <span>Reason</span>
                            <select value={reason} onChange={(e) => setReason(e.target.value)}>
                                <option value='Damage/Loss'>Damage/Loss</option>
                                <option value='Expired stock'>Expired stock</option>
                                <option value='Theft/Missing'>Theft/Missing</option>
                                <option value='Breakage'>Breakage</option>
                                <option value='Quality rejection'>Quality rejection</option>
                            </select>
                        </label>
                    )}
                    <label className='inv-prod-wide'>
                        <span>Notes</span>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder='Optional notes for audit trail...' />
                    </label>
                </div>
            </section>

            <section className='inv-prod-card'>
                <div className='inv-prod-section-head'>
                    <h3>{copy.componentTitle}</h3>
                    <p>{mode === 'damage' ? 'These quantities will be removed from stock and posted as inventory loss.' : 'These quantities will be consumed into Work in Progress.'}</p>
                </div>
                {renderLines(components, 'component')}
            </section>

            {mode !== 'damage' && (
                <section className='inv-prod-card'>
                    <div className='inv-prod-section-head'>
                        <h3>{copy.outputTitle}</h3>
                        <p>These quantities will be received into inventory from WIP.</p>
                    </div>
                    {renderLines(outputs, 'output')}
                </section>
            )}

            {mode !== 'damage' && (
                <section className='inv-prod-card'>
                    <div className='inv-prod-section-head'>
                        <h3>Recent {copy.title}s</h3>
                        <p>Latest posted and draft documents for this operation type.</p>
                    </div>
                    <div className='inv-prod-history'>
                        {orders.slice(0, 8).map((order) => (
                            <div className='inv-prod-history-row' key={order._id || order.orderNumber}>
                                <strong>{order.orderNumber}</strong>
                                <span>{order.postingDate}</span>
                                <span>{order.status}</span>
                                <span>{order.warehouse}</span>
                            </div>
                        ))}
                        {!orders.length && <div className='inv-prod-empty'>No {copy.title.toLowerCase()} records yet.</div>}
                    </div>
                </section>
            )}
        </div>
    )
}

export default ProductionOrders
