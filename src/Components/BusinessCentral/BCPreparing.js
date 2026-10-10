import { useCallback, useEffect, useRef, useState } from 'react'

const RETRY_MS = 3000
// How often, and how many times, a page asks again after being given a kept
// answer that the server is busy bringing up to date.
const FRESH_MS = 4000
const FRESH_TRIES = 90

/**
 * For requests that can answer "still reading from Business Central".
 *
 * When reports run live, the first one after a server start has to read the
 * ledgers before it can answer. The server does not hold the request open for
 * that; it replies with a progress note, and this keeps asking until the real
 * answer arrives. `awaitData(request)` resolves with that answer.
 *
 * A call that has been overtaken by a newer one (the user changed a filter
 * and ran again) or whose page has closed never resolves, so its caller
 * cannot overwrite newer results with older ones.
 *
 * The server may also answer at once with a result it kept from earlier and
 * mark it stale, meaning a fresh one is being worked out. That answer is
 * returned straight away so the page has something to show. When `onFresh`
 * is given, the request is then repeated quietly until the fresh answer
 * arrives, and `onFresh` is called with it. `updating` holds the time the
 * kept answer was made while that is going on.
 */
export const usePreparingRetry = () => {
    const [preparing, setPreparing] = useState(null)
    const [updating, setUpdating] = useState(null)
    const latest = useRef(0)

    useEffect(() => () => { latest.current = -1 }, [])

    const awaitData = useCallback(async (request, onFresh) => {
        latest.current += 1
        const mine = latest.current
        const overtaken = () => latest.current !== mine
        const never = new Promise(() => {})
        try {
            for (;;) {
                // eslint-disable-next-line no-await-in-loop
                const response = await request()
                if (overtaken()) return never
                if (!response.preparing) {
                    setPreparing(null)
                    if (response.stale && onFresh) {
                        setUpdating(response.cachedAt || Date.now())
                        // Not awaited: the kept answer goes back now and the
                        // fresh one follows through onFresh.
                        ;(async () => {
                            for (let attempt = 0; attempt < FRESH_TRIES; attempt += 1) {
                                // eslint-disable-next-line no-await-in-loop
                                await new Promise((resolve) => setTimeout(resolve, FRESH_MS))
                                if (overtaken()) return
                                let next
                                // A failed look is made up for by the next one.
                                // eslint-disable-next-line no-await-in-loop
                                try { next = await request() } catch (failure) { next = null }
                                if (overtaken()) return
                                if (next && !next.preparing && !next.stale) {
                                    setUpdating(null)
                                    onFresh(next)
                                    return
                                }
                            }
                            setUpdating(null)
                        })()
                    } else setUpdating(null)
                    return response
                }
                setPreparing(response.preparing)
                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => setTimeout(resolve, RETRY_MS))
                if (overtaken()) return never
            }
        } catch (failure) {
            if (overtaken()) return never
            setPreparing(null)
            setUpdating(null)
            throw failure
        }
    }, [])

    return { preparing, updating, awaitData }
}

// A quiet line saying the figures on screen were kept from earlier and are
// being brought up to date.
export const BCUpdating = ({ since }) => {
    if (!since) return null
    return (
        <p className='bc-updating' role='status'>
            <span className='bc-dot bc-dot-live' /> Showing figures saved at {new Date(since).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}. Bringing them up to date...
        </p>
    )
}

const BCPreparing = ({ progress }) => {
    if (!progress) return null
    return (
        <div className='bc-banner bc-banner-info bc-preparing' role='status'>
            <span className='bc-dot bc-dot-live' />
            <div>
                <strong>Reading from Business Central.</strong>
                {' '}{progress.table ? `${progress.table}: ` : ''}{(progress.rows || 0).toLocaleString()} entries read so far.
                <span className='bc-sub'>
                    The first report after the server starts reads the whole ledger. After that, each report only reads what is new, so it opens quickly.
                </span>
            </div>
        </div>
    )
}

export default BCPreparing
