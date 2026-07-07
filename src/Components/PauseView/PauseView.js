import './PauseView.css'
import { useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'

// Pure "waiting on activation check" state. The real activation/subscription
// gate is enforced server-side (every request is checked against the tenant's
// suspension state) — this view has no client-side bypass of any kind; it only
// reflects whatever the server has already decided.
const PauseView = () => {
    const { viewAccess } = useContext(ContextProvider)

    return (
        <div className='pause-view'>
            <label>
                {viewAccess === null ? '' : (viewAccess === '405' ? '405 ERROR, NO SERVER RESPONSE - METHOD NOT ALLOWED' : '')}
            </label>
        </div>
    )
}

export default PauseView
