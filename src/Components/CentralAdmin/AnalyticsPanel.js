/* ============================================================================
   Central admin: public-site analytics.
   ----------------------------------------------------------------------------
   Reads the aggregates from /central-admin/analytics/summary and shows them.
   No computation here beyond formatting, so the numbers on screen and the
   numbers in the API are the same numbers.

   The definitions are printed on the page rather than left implicit. Every
   analytics product means something slightly different by "bounce" and by
   "time on page", and a dashboard whose terms are undefined gets misread.
   ========================================================================= */

import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'

const WINDOWS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

const DEVICE_COLOURS = { Desktop: '#1f6b45', Phone: '#6ab38b', Tablet: '#a8cdbb' }

const duration = (ms) => {
  if (!ms) return '0s'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`
}

const shortDay = (iso) => {
  if (!iso) return ''
  const parts = iso.split('-')
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : iso
}

const Stat = ({ label, value, note }) => (
  <div className="cana-stat">
    <span className="cana-stat-label">{label}</span>
    <span className="cana-stat-value">{value}</span>
    {note && <span className="cana-stat-note">{note}</span>}
  </div>
)

const AnalyticsPanel = ({ requestAdmin, setNotice }) => {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(30)
  const [scope, setScope] = useState('all')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const response = await requestAdmin('GET', `central-admin/analytics/summary?days=${days}&scope=${scope}`)
      if (!response.ok) throw new Error(response.error || 'Could not load analytics.')
      setData(response)
    } catch (error) {
      setNotice('error', error.message)
    } finally {
      setBusy(false)
    }
  }, [requestAdmin, setNotice, days, scope])

  useEffect(() => { load() }, [load])

  const totals = (data && data.totals) || {}
  const daily = (data && data.daily) || []
  const topPages = (data && data.topPages) || []
  const referrers = (data && data.referrers) || []
  const devices = (data && data.devices) || []
  const nothingYet = !busy && data && !totals.views

  return (
    <div className="cana">
      <div className="cana-bar">
        <div className="cana-group">
          {WINDOWS.map((option) => (
            <button
              key={option.days}
              className={days === option.days ? 'active' : ''}
              onClick={() => setDays(option.days)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="cana-group">
          <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>All pages</button>
          <button className={scope === 'blog' ? 'active' : ''} onClick={() => setScope('blog')}>Blog only</button>
        </div>
        <button onClick={load} disabled={busy}>{busy ? 'Loading...' : 'Refresh'}</button>
      </div>

      {nothingYet && (
        <p className="cana-empty">
          No page views recorded in this window yet. Collection starts the first time
          someone opens a public page after this release is deployed, and visitors whose
          browser sends Do Not Track are deliberately not counted.
        </p>
      )}

      <div className="cana-stats">
        <Stat label="Page views" value={(totals.views || 0).toLocaleString()} />
        <Stat label="Visitors" value={(totals.visitors || 0).toLocaleString()} note="distinct browsers" />
        <Stat label="Sessions" value={(totals.sessions || 0).toLocaleString()} />
        <Stat label="Median time on page" value={duration(totals.medianTimeMs)} note="visible time only" />
        <Stat label="Pages per session" value={totals.pagesPerSession || 0} />
        <Stat label="Single-page sessions" value={`${totals.bounceRate || 0}%`} note="opened one page and left" />
      </div>

      <div className="cana-card">
        <h4>Views and visitors per day</h4>
        <div className="cana-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="canaViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1f6b45" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1f6b45" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" vertical={false} />
              <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={18} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                labelFormatter={shortDay}
                contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e3e9e5' }}
              />
              <Area type="monotone" dataKey="views" stroke="#1f6b45" strokeWidth={2} fill="url(#canaViews)" name="Views" />
              <Area type="monotone" dataKey="visitors" stroke="#8aa99a" strokeWidth={1.5} fill="none" name="Visitors" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="cana-split">
        <div className="cana-card">
          <h4>Where visitors came from</h4>
          {referrers.length === 0 ? (
            <p className="cana-note">Nothing recorded yet. Direct visits and visits from a browser that hides the referrer do not appear here.</p>
          ) : (
            <div className="cana-chart short">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={referrers} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="referrer" width={150} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e3e9e5' }} />
                  <Bar dataKey="views" fill="#1f6b45" radius={[0, 3, 3, 0]} name="Views" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="cana-card">
          <h4>Device</h4>
          {devices.length === 0 ? (
            <p className="cana-note">Nothing recorded yet.</p>
          ) : (
            <div className="cana-chart short">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={devices} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" vertical={false} />
                  <XAxis dataKey="device" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e3e9e5' }} />
                  <Bar dataKey="views" radius={[3, 3, 0, 0]} name="Views">
                    {devices.map((entry) => (
                      <Cell key={entry.device} fill={DEVICE_COLOURS[entry.device] || '#1f6b45'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="cana-card">
        <h4>Most read pages</h4>
        <div className="cana-table-wrap">
          <table className="cana-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Views</th>
                <th>Visitors</th>
                <th>Median time</th>
                <th>Read depth</th>
              </tr>
            </thead>
            <tbody>
              {topPages.length === 0 && (
                <tr><td colSpan={5} className="cana-empty-cell">Nothing recorded yet.</td></tr>
              )}
              {topPages.map((page) => (
                <tr key={page.path}>
                  <td>
                    <span className="cana-page-title">{page.title || page.path}</span>
                    <span className="cana-page-path">{page.path}</span>
                  </td>
                  <td>{page.views.toLocaleString()}</td>
                  <td>{page.visitors.toLocaleString()}</td>
                  <td>{duration(page.medianTimeMs)}</td>
                  <td>
                    <span className="cana-depth">
                      <span className="cana-depth-fill" style={{ width: `${page.avgScroll || 0}%` }} />
                    </span>
                    <span className="cana-depth-value">{page.avgScroll || 0}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cana-card cana-defs">
        <h4>What these mean</h4>
        <dl>
          <dt>Visitors</dt>
          <dd>Distinct browsers, counted by a random id that browser stored for itself. Not people, and not accounts.</dd>
          <dt>Median time on page</dt>
          <dd>The middle value of time the tab was actually visible. A mean would be dragged upwards by tabs left open and forgotten.</dd>
          <dt>Read depth</dt>
          <dd>How far down the page the reader reached, averaged. On a long article this separates opening it from reading it.</dd>
          <dt>Single-page sessions</dt>
          <dd>Sessions where exactly one page was opened. High is not automatically bad: someone who read one article fully and left got what they came for.</dd>
          <dt>Not counted</dt>
          <dd>Visitors whose browser sends Do Not Track, and anyone whose browser blocks local storage. The figures are a floor, not a census.</dd>
        </dl>
      </div>
    </div>
  )
}

export default AnalyticsPanel
