import { useContext, useEffect, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'

const KIND = { desktop: 'Desktop', mobile: 'Mobile phone', tablet: 'Tablet' }

/**
 * The devices one person has signed in on, newest first, with how many
 * times they signed in on each. The device id is the one the POS uses, so a
 * device named in a sync warning can be found here.
 */
const SignInDevices = ({ userId }) => {
    const { fetchServer, server } = useContext(ContextProvider)
    const [devices, setDevices] = useState(null)

    useEffect(() => {
        if (!userId) return undefined
        let alive = true
        setDevices(null)
        fetchServer('POST', { userId }, 'users/devices', server)
            .then((resp) => { if (alive) setDevices(resp?.ok ? resp.devices || [] : []) })
            .catch(() => { if (alive) setDevices([]) })
        return () => { alive = false }
    }, [userId, fetchServer, server])

    if (!userId) return null
    return (
        <div className='inpcov'>
            <div>Sign-in devices</div>
            {devices === null && <small className='settings-hint'>Loading...</small>}
            {devices && !devices.length && <small className='settings-hint'>No sign-ins recorded yet. Devices are recorded from the next sign-in on.</small>}
            {devices && devices.length > 0 && (
                <table className='settings-devices'>
                    <thead>
                        <tr><th>Device</th><th>Kind</th><th>Sign-ins</th><th>Last signed in</th><th>Last seen</th></tr>
                    </thead>
                    <tbody>
                        {devices.map((device) => (
                            <tr key={device._id}>
                                <td>{device.deviceId}</td>
                                <td>{[KIND[device.kind] || 'Unknown', device.os && device.os !== 'Unknown' ? device.os : '', device.app === 'Desktop app' ? 'desktop app' : device.browser].filter(Boolean).join(', ')}</td>
                                <td>{device.loginCount || 0}</td>
                                <td>{device.lastLoginAt ? new Date(device.lastLoginAt).toLocaleString() : '-'}</td>
                                <td>{device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

export default SignInDevices
