// Devices still holding POS changes the server has not received, listed by
// order: whether each order is on the server, and what is still waiting for
// it (the order itself, a payment, a delivery, an edit, a cancellation).
// Collapsed to one line until opened, so it does not push the board aside.

const KIND = { desktop: 'desktop', mobile: 'mobile phone', tablet: 'tablet' }

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const ago = (stamp) => {
    const hours = Math.floor((Date.now() - Number(stamp)) / 3600000)
    if (hours < 1) return 'within the hour'
    if (hours < 48) return `${plural(hours, 'hour')} ago`
    return `${plural(Math.floor(hours / 24), 'day')} ago`
}

export const describeDevice = (device) => {
    if (!device) return 'device'
    const kind = KIND[device.kind] || 'device'
    const extra = [device.os && device.os !== 'Unknown' ? device.os : '', device.app === 'Desktop app' ? 'desktop app' : (device.browser && device.browser !== 'Unknown' ? device.browser : '')].filter(Boolean)
    return extra.length ? `${kind} (${extra.join(', ')})` : kind
}

const waitingFor = (changes = {}) => Object.entries(changes)
    .map(([label, count]) => (count > 1 ? `${label} x${count}` : label))
    .join(', ')

const orderState = (order) => {
    if (!order.onServer) return 'not on the server yet'
    return ['on the server', order.status, order.delivery ? `delivery ${order.delivery}` : ''].filter(Boolean).join(', ')
}

const UnsyncedDevices = ({ tills = [], refused = [], canClear, onClear }) => {
    if (!tills.length && !refused.length) return null
    const changes = tills.reduce((sum, till) => sum + Number(till.count || 0), 0)
    const headline = [
        tills.length ? `${plural(tills.length, 'device')} holding ${plural(changes, 'change')} not yet on the server` : '',
        refused.length ? `${plural(refused.length, 'change')} refused` : '',
    ].filter(Boolean).join(', ')
    return (
        <details className='pos-unsynced' role='status'>
            <summary><strong>Sales not yet on the server:</strong> {headline}</summary>
            {tills.map((till) => (
                <div className='pos-unsynced-till' key={`${till.user}-${till.terminalId}`}>
                    <div className='pos-unsynced-till-head'>
                        <strong>{`${till.user || 'Someone'}'s ${describeDevice(till.device)}, device ${till.terminalId}`}</strong>
                        {till.lastSeenAt && (
                            <span className={till.offline ? 'pos-unsynced-offline' : ''}>
                                {till.offline
                                    ? `Offline since ${new Date(till.lastSeenAt).toLocaleString()} (${ago(till.lastSeenAt)})`
                                    : `Last seen ${new Date(till.lastSeenAt).toLocaleString()}`}
                            </span>
                        )}
                    </div>
                    {(till.orders || []).length > 0 && (
                        <ul className='pos-unsynced-orders'>
                            {till.orders.map((order) => (
                                <li key={order.orderNumber}>
                                    <span className='pos-unsynced-order'>{order.orderNumber}</span>
                                    {` ${orderState(order)}${order.businessDate ? `, ${order.businessDate}` : ''}. Waiting: ${waitingFor(order.changes)}.`}
                                </li>
                            ))}
                        </ul>
                    )}
                    {Object.keys(till.other || {}).length > 0 && <p>{`Also waiting: ${waitingFor(till.other)}.`}</p>}
                    {(till.errors || []).length > 0 && <p className='pos-unsynced-error'>{`Last error: ${String(till.errors[0]).slice(0, 180)}`}</p>}
                    {canClear && till.offline && (
                        <button type='button' className='pos-unsynced-clear' onClick={() => onClear(till)}>
                            Clear this device&apos;s list
                        </button>
                    )}
                </div>
            ))}
            {refused.slice(0, 10).map((row) => (
                <p key={row.opId} className='pos-unsynced-refused'>
                    {`Refused: ${row.entityType} ${row.key || ''} from ${row.user || 'a device'}: ${row.message || 'no reason given'}`}
                </p>
            ))}
            <small>A session cannot be ended while its own changes, or anything on its cashier&apos;s devices, are still waiting. Ask the user to open the POS on that device while online.{canClear ? ' A device offline for over a day can have its list cleared here; it reports again if it comes back.' : ''}</small>
        </details>
    )
}

export default UnsyncedDevices
