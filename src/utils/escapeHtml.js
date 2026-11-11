// Receipts, letters and PDF exports are built as HTML strings and written into
// a print window, an iframe or a detached element, all on the app's own origin.
// Record values (customer, product and employee names, notes) can be typed by
// any user, so each one is escaped before it goes into that HTML; otherwise a
// name such as <img src=x onerror=...> runs as script for whoever prints it.

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ENTITIES[ch])

// For src and href attributes: web addresses, inline images, blob URLs and
// paths on this site only. Anything else (javascript:, data:text/html) is
// dropped.
export const safeUrl = (value) => {
    const url = String(value ?? '').trim()
    return /^(https?:\/\/|data:image\/(png|jpe?g|gif|webp);|blob:|\/(?!\/))/i.test(url) ? escapeHtml(url) : ''
}
