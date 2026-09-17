import './ui.css'

// Consistent page padding + max content width — the shared wrapper every
// redesigned page renders its content inside of, instead of each page
// picking its own ad-hoc padding values.
const PageShell = ({ children, maxWidth = 1200, className = '' }) => (
    <div className={`ui-page-shell ${className}`} style={{ maxWidth }}>
        {children}
    </div>
)

export default PageShell
