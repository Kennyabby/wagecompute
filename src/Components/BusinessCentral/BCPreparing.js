import { useCallback, useEffect, useRef, useState } from 'react'

const RETRY_MS = 3000

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
 */
export const usePreparingRetry = () => {
    const [preparing, setPreparing] = useState(null)
    const latest = useRef(0)

    useEffect(() => () => { latest.current = -1 }, [])

    const awaitData = useCallback(async (request) => {
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
            throw failure
        }
    }, [])

    return { preparing, awaitData }
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
