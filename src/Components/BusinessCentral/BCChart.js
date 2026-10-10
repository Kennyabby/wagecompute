import { useState } from 'react'
import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { formatValue, formatCompact, formatPeriod } from './bcFormat'

// Categorical colours in a fixed order: the first series is always the first
// colour, so "Sales" is the same blue on every chart it appears in. This trio
// was checked for colour-blind separation as a set (worst pair still clearly
// apart under protan, deutan and tritan simulation). The third sits just
// under 3:1 contrast on white, which is why every chart also offers a table
// view and never relies on colour alone.
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a']

const AXIS_TICK = { fontSize: 12, fill: 'var(--gray-500)' }
const GRID = 'var(--gray-200)'
const ROW_HEIGHT = 34

const truncate = (text, max = 22) => (String(text).length > max ? `${String(text).slice(0, max - 1)}…` : String(text))

const ChartTooltip = ({ active, payload, label, format, series }) => {
    if (!active || !payload?.length) return null
    return (
        <div className='bc-tooltip'>
            <div className='bc-tooltip-title'>{formatPeriod(label)}</div>
            {payload.map((entry) => (
                <div key={entry.dataKey} className='bc-tooltip-row'>
                    <span className='bc-swatch' style={{ background: entry.color || entry.fill }} />
                    <span>{series.find((item) => item.key === entry.dataKey)?.label || entry.dataKey}</span>
                    <strong>{formatValue(entry.value, format)}</strong>
                </div>
            ))}
        </div>
    )
}

const ChartTable = ({ chart }) => (
    <div className='bc-chart-table'>
        <table className='bc-table'>
            <thead>
                <tr>
                    <th>{chart.xKey === 'period' ? 'Period' : 'Name'}</th>
                    {chart.series.map((series) => <th key={series.key} className='bc-num'>{series.label}</th>)}
                </tr>
            </thead>
            <tbody>
                {chart.data.map((row, index) => (
                    <tr key={index}>
                        <td>{formatPeriod(row[chart.xKey])}</td>
                        {chart.series.map((series) => <td key={series.key} className='bc-num'>{formatValue(row[series.key], chart.format)}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
)

const Plot = ({ chart, onOpen }) => {
    const { type, data, series, xKey, format } = chart
    // Clicking the plot opens the report behind it, when there is one.
    const open = onOpen ? { onClick: onOpen, style: { cursor: 'pointer' } } : {}
    const tooltip = <Tooltip content={<ChartTooltip format={format} series={series} />} cursor={type === 'line' ? { stroke: 'var(--gray-300)' } : { fill: 'rgba(23, 56, 41, 0.05)' }} />

    if (type === 'horizontalBar') {
        return (
            <ResponsiveContainer width='100%' height={Math.max(data.length * ROW_HEIGHT + 30, 150)}>
                <BarChart data={data} layout='vertical' margin={{ top: 4, right: 24, bottom: 4, left: 8 }} {...open}>
                    <CartesianGrid stroke={GRID} horizontal={false} />
                    <XAxis type='number' tick={AXIS_TICK} tickFormatter={formatCompact} tickLine={false} axisLine={false} />
                    <YAxis type='category' dataKey={xKey} width={160} tick={AXIS_TICK} tickFormatter={(value) => truncate(value)} tickLine={false} axisLine={{ stroke: GRID }} />
                    {tooltip}
                    {series.map((item, index) => (
                        <Bar key={item.key} dataKey={item.key} fill={SERIES_COLORS[index]} radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        )
    }

    const axes = (
        <>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey={xKey} tick={AXIS_TICK} tickFormatter={(value) => truncate(formatPeriod(value), 14)} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
            <YAxis tick={AXIS_TICK} tickFormatter={formatCompact} tickLine={false} axisLine={false} width={56} />
            {tooltip}
        </>
    )

    return (
        <ResponsiveContainer width='100%' height={280}>
            {type === 'line' ? (
                <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }} {...open}>
                    {axes}
                    {series.map((item, index) => (
                        <Line
                            key={item.key}
                            type='monotone'
                            dataKey={item.key}
                            stroke={SERIES_COLORS[index]}
                            strokeWidth={2}
                            // A single point has no line to draw, so it needs a dot to be visible at all.
                            dot={data.length === 1 ? { r: 4, fill: SERIES_COLORS[index], stroke: '#fff', strokeWidth: 2 } : false}
                            activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                            isAnimationActive={false}
                        />
                    ))}
                </LineChart>
            ) : (
                <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }} barGap={2} {...open}>
                    {axes}
                    {series.map((item, index) => (
                        <Bar key={item.key} dataKey={item.key} fill={SERIES_COLORS[index]} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                    ))}
                </BarChart>
            )}
        </ResponsiveContainer>
    )
}

/**
 * Renders one chart definition as the server sends it:
 * { title, type: 'line' | 'bar' | 'horizontalBar', xKey, format, series: [{ key, label }], data }.
 * Every chart can be flipped to a table of the same numbers. With `onOpen`,
 * the chart also leads to the report its figures come from.
 */
const BCChart = ({ chart, onOpen }) => {
    const [asTable, setAsTable] = useState(false)
    const hasData = chart.data?.length > 0

    return (
        <section className={`bc-card bc-chart ${chart.wide ? 'bc-chart-wide' : ''}`}>
            <header className='bc-chart-head'>
                <h3>{chart.title}</h3>
                {hasData && (
                    <span className='bc-chart-actions'>
                        {onOpen && <button type='button' className='bc-link-button' onClick={onOpen}>Open report</button>}
                        <button type='button' className='bc-link-button' onClick={() => setAsTable((value) => !value)}>
                            {asTable ? 'Show chart' : 'Show as table'}
                        </button>
                    </span>
                )}
            </header>
            {hasData && chart.series.length > 1 && !asTable && (
                <div className='bc-legend'>
                    {chart.series.map((series, index) => (
                        <span key={series.key}><span className='bc-swatch' style={{ background: SERIES_COLORS[index] }} />{series.label}</span>
                    ))}
                </div>
            )}
            {!hasData && <p className='bc-empty'>Nothing to show for this selection.</p>}
            {hasData && (asTable ? <ChartTable chart={chart} /> : <Plot chart={chart} onOpen={onOpen} />)}
        </section>
    )
}

export default BCChart
