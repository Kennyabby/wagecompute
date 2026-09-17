import './ui.css'

// One card inside a StatCardGrid — label / value / description, with an
// optional semantic tone for the value (e.g. 'error' when a balance is
// empty) so callers don't hand-roll inline color styles per screen.
const TONE_CLASS = {
    default: '',
    success: 'ui-stat-value-success',
    warning: 'ui-stat-value-warning',
    error: 'ui-stat-value-error',
    info: 'ui-stat-value-info',
}

const StatCard = ({ label, value, description, tone = 'default', className = '' }) => (
    <div className={`ui-stat-card ${className}`}>
        <span className="ui-stat-label">{label}</span>
        <strong className={`ui-stat-value ${TONE_CLASS[tone] || ''}`}>{value}</strong>
        {description ? <p className="ui-stat-desc">{description}</p> : null}
    </div>
)

export default StatCard
