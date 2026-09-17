import './ui.css'

// Codifies the ONE correct horizontal-scroll pattern in this app — wide
// data tables genuinely need to scroll sideways on narrow screens (unlike
// stat cards, which should wrap via StatCardGrid instead). Central Admin
// already does this correctly per-table; this makes that pattern reusable
// instead of re-invented (or, worse, misapplied to non-table content) on
// every new page.
const ResponsiveTableWrap = ({ children, minWidth = 640, className = '' }) => (
    <div className={`ui-table-wrap ${className}`}>
        <div style={{ minWidth }}>{children}</div>
    </div>
)

export default ResponsiveTableWrap
