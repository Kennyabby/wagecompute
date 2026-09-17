import './ui.css'

// A real fluid grid — auto-fit + minmax, never a fixed repeat(N) column
// count collapsed only at hand-picked viewport breakpoints. This is the
// direct fix for the Settings > Billing cramped/scrolling card bug: fixed
// repeat(4, minmax(0,1fr)) stayed locked at 4 columns on common laptop
// widths because its breakpoints never accounted for the sidebar eating
// into the visible content column. auto-fit reflows organically at ANY
// width instead of snapping at specific pixel counts, so it can't recreate
// that bug regardless of what sits next to it.
//
// `min` sets the smallest a card is allowed to get before the grid wraps
// to fewer columns — pick it per-usage (e.g. 200 for compact stats, 260
// for stats with more copy).
const StatCardGrid = ({ children, min = 220, gap, className = '' }) => (
    <div
        className={`ui-stat-grid ${className}`}
        style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
            ...(gap ? { gap } : {}),
        }}
    >
        {children}
    </div>
)

export default StatCardGrid
