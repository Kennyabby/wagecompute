const two = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
const upToTwo = { minimumFractionDigits: 0, maximumFractionDigits: 2 }

export const formatValue = (value, format) => {
    if (value === null || value === undefined || value === '') return ''
    if (format === 'money') return Number(value).toLocaleString(undefined, two)
    if (format === 'qty' || format === 'number') return Number(value).toLocaleString(undefined, upToTwo)
    if (format === 'percent') return `${Number(value).toLocaleString(undefined, upToTwo)}%`
    return String(value)
}

// Axis ticks and stat tiles: 1,284 / 12.9K / 4.2M.
export const formatCompact = (value) => {
    const number = Number(value) || 0
    const abs = Math.abs(number)
    if (abs >= 1e9) return `${(number / 1e9).toFixed(1).replace(/\.0$/, '')}B`
    if (abs >= 1e6) return `${(number / 1e6).toFixed(1).replace(/\.0$/, '')}M`
    if (abs >= 1e4) return `${(number / 1e3).toFixed(1).replace(/\.0$/, '')}K`
    return number.toLocaleString(undefined, upToTwo)
}

// Stat tiles are for reading at a glance, so large amounts drop their decimals
// and very large ones are shortened. The exact figure stays in the tile's
// tooltip and in the report table.
export const formatKpi = (value, format) => {
    if (format === 'percent') return formatValue(value, 'percent')
    const number = Number(value) || 0
    const abs = Math.abs(number)
    if (abs >= 1e7) return formatCompact(number)
    if (abs >= 1000) return Math.round(number).toLocaleString()
    return formatValue(number, format === 'money' ? 'money' : 'number')
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// '2026-09-05' -> '5 Sep', '2026-09' -> 'Sep 2026'. Anything else is a
// category label and is returned untouched.
export const formatPeriod = (value) => {
    const text = String(value ?? '')
    const day = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (day) return `${Number(day[3])} ${MONTHS[Number(day[2]) - 1]}`
    const month = text.match(/^(\d{4})-(\d{2})$/)
    if (month) return `${MONTHS[Number(month[2]) - 1]} ${month[1]}`
    return text
}

export const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Never'
    return new Date(timestamp).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const formatAgo = (timestamp) => {
    if (!timestamp) return 'Never'
    const minutes = Math.round((Date.now() - timestamp) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours} hr ago`
    const days = Math.round(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
}

export const formatDuration = (ms) => {
    if (!ms || ms < 0) return ''
    const seconds = Math.round(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return minutes < 60 ? `${minutes}m ${seconds % 60}s` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export const todayString = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const toDateString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const DATE_PRESETS = [
    { key: 'thisMonth', label: 'This month', range: () => { const now = new Date(); return [new Date(now.getFullYear(), now.getMonth(), 1), now] } },
    { key: 'lastMonth', label: 'Last month', range: () => { const now = new Date(); return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0)] } },
    { key: 'last30', label: 'Last 30 days', range: () => { const now = new Date(); return [new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29), now] } },
    { key: 'thisYear', label: 'This year', range: () => { const now = new Date(); return [new Date(now.getFullYear(), 0, 1), now] } },
].map((preset) => ({ ...preset, resolve: () => { const [from, to] = preset.range(); return { from: toDateString(from), to: toDateString(to) } } }))

export const defaultRange = () => DATE_PRESETS[0].resolve()
