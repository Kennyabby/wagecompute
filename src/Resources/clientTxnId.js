// Resources/clientTxnId.js
// Idempotency-key helpers used by every transaction-creating flow (POS, Delivery,
// Sales, Purchase, Expenses, Accommodations, Rentals, Payroll, Approvals,
// BusinessPartners, Journal entries).
//
// A clientTxnId is generated ONCE at first local creation and must be carried
// unchanged through every retry/offline-queue/sync attempt for that same record.
// The server enforces a real uniqueness constraint on this field (see Phase 2),
// which is what makes duplicate submission (double-tap, retry, offline replay)
// safe instead of relying on timestamp-based "uniqueness".

const TERMINAL_ID_KEY = 'wc-terminal-id';

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (older WebViews).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Generates a brand-new idempotency key. Call exactly once per new record. */
export function generateClientTxnId() {
  return uuid();
}

/**
 * Returns this device/terminal's stable short ID, generating and persisting one
 * on first use. Used to build collision-proof, fully-offline-safe display
 * reference numbers (see generateOrderNumber in PointOfSales/Delivery).
 */
export function getTerminalId() {
  try {
    let id = window.localStorage.getItem(TERMINAL_ID_KEY);
    if (!id) {
      id = uuid().split('-')[0].toUpperCase(); // short 8-char segment is enough
      window.localStorage.setItem(TERMINAL_ID_KEY, id);
    }
    return id;
  } catch (e) {
    // localStorage unavailable (private mode, etc.) — fall back to a per-session id.
    return uuid().split('-')[0].toUpperCase();
  }
}
