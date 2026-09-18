import { useState } from 'react'
import './ApprovalDatesPanel.css'

// One row per approval doc — deliberately NOT grouped/deduplicated by date.
// An earlier grouped-chip version summed same-date items into one chip
// (e.g. "2026-09-10 (3 approved)"), which is mathematically correct but
// reads as fewer entries than the badge count at a glance — a flat list
// where row count always equals the badge number removes that ambiguity
// entirely.
const sortByDate = (list = []) => (
  [...list].sort((a, b) => String(a?.postingDate || '').localeCompare(String(b?.postingDate || '')))
)

// Shared across every approval-enabled module: a small clickable trigger
// (so it never eats page space) that opens a popup listing, per section,
// every pending (red) and approved (green) approval's posting date — one
// row per approval — so a document outside the page's current date-range
// filter isn't just an invisible number; the user can see exactly which
// date to point the filter at. Renders nothing if every section is empty.
const ApprovalDatesPanel = ({ sections = [] }) => {
  const [open, setOpen] = useState(false)

  const nonEmptySections = sections.filter((section) => (
    (section.pending?.length || 0) + (section.approved?.length || 0) > 0
  ))
  const totalPending = nonEmptySections.reduce((sum, s) => sum + (s.pending?.length || 0), 0)
  const totalApproved = nonEmptySections.reduce((sum, s) => sum + (s.approved?.length || 0), 0)

  if (nonEmptySections.length === 0) return null

  return (
    <>
      <button type='button' className='approval-dates-trigger' onClick={() => setOpen(true)}>
        View approval dates
        {totalPending > 0 && <span className='approval-dates-trigger-count approval-dates-trigger-count-pending'>{totalPending} pending</span>}
        {totalApproved > 0 && <span className='approval-dates-trigger-count approval-dates-trigger-count-approved'>{totalApproved} approved</span>}
      </button>

      {open && (
        <div className='approval-dates-modal-overlay' onClick={() => setOpen(false)}>
          <div className='approval-dates-modal' onClick={(e) => e.stopPropagation()}>
            <div className='approval-dates-modal-header'>
              <span>Approval Dates</span>
              <button type='button' className='approval-dates-modal-close' onClick={() => setOpen(false)}>&times;</button>
            </div>
            <div className='approval-dates-modal-body'>
              {nonEmptySections.map((section) => (
                <div className='approval-dates-section' key={section.label}>
                  <div className='approval-dates-section-label'>{section.label}</div>
                  {section.pending?.length > 0 && (
                    <div className='approval-dates-group'>
                      <div className='approval-dates-group-label approval-dates-group-label-pending'>Pending ({section.pending.length})</div>
                      <ul className='approval-dates-list'>
                        {sortByDate(section.pending).map((appr, idx) => (
                          <li key={`p-${section.label}-${idx}`} className='approval-date-chip approval-date-chip-pending'>
                            {appr.postingDate || 'Unknown date'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {section.approved?.length > 0 && (
                    <div className='approval-dates-group'>
                      <div className='approval-dates-group-label approval-dates-group-label-approved'>Approved ({section.approved.length})</div>
                      <ul className='approval-dates-list'>
                        {sortByDate(section.approved).map((appr, idx) => (
                          <li key={`a-${section.label}-${idx}`} className='approval-date-chip approval-date-chip-approved'>
                            {appr.postingDate || 'Unknown date'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ApprovalDatesPanel
