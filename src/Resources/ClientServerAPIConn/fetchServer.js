import { generateClientTxnId } from '../clientTxnId';

// In-memory only (never localStorage) — the real, authoritative session is the
// httpOnly `accessToken`/`refreshToken` cookie the server already sets on every
// login and refresh (server verifyToken falls back to the cookie when no
// Authorization header is present, and /token refresh reads the cookie only).
// This in-memory copy is just a same-tab convenience for the Authorization
// header; storing it in localStorage instead would let any injected script
// read and reuse it indefinitely (XSS), whereas an in-memory variable dies
// with the page/tab and is never written to disk.
let inMemoryAccessToken = null;
export const setInMemoryAccessToken = (token) => { inMemoryAccessToken = token || null; };
export const clearInMemoryAccessToken = () => { inMemoryAccessToken = null; };

// Every document create call gets a stable idempotency key generated exactly
// once here (rather than requiring every calling component to remember to add
// one) — a retried request (network timeout, offline-queue replay) carries the
// same clientTxnId, so the server recognizes it as the same record instead of
// creating a duplicate. Injected centrally so no create call site is missed.
const ensureClientTxnId = (endpoint, body) => {
    if (!body || typeof body !== 'object') return body;
    if (endpoint === 'createDoc' && body.update && typeof body.update === 'object' && !Array.isArray(body.update)) {
        if (!body.update.clientTxnId) {
            return { ...body, update: { ...body.update, clientTxnId: generateClientTxnId() } };
        }
    }
    if (endpoint === 'createManyDocs' && Array.isArray(body.update)) {
        return {
            ...body,
            update: body.update.map((doc) => (doc && !doc.clientTxnId ? { ...doc, clientTxnId: generateClientTxnId() } : doc)),
        };
    }
    return body;
};

// Posting Tiering Model: Tier A (POS sale, Delivery order, session/table state,
// InventoryTransactions) is already handled by the offline queue
// (offlineDb.js/offlineSync.js) and must keep working instantly offline — it
// is never gated here. Tier B — actions that need live backend state to be
// correct (manual journal entries, period closing, chart-of-accounts edits,
// business-partner invoices/bills/payments, subscription/billing actions) has
// no offline queue and shouldn't get one; these are blocked with a clear
// message instead of attempting a write that would fail ambiguously or worse,
// silently succeed against stale local assumptions.
let currentIsFullyConnected = true;
export const setConnectivityStatus = (isConnected) => { currentIsFullyConnected = isConnected !== false; };

const TIER_B_ENDPOINT_PREFIXES = ['business-partners/', 'billing/', 'accounting/'];
const TIER_B_EXACT_ENDPOINTS = ['createGeneralLedgerEntry', 'initializeChartOfAccounts'];

const isTierBRequest = (endpoint, body) => {
    if (TIER_B_EXACT_ENDPOINTS.includes(endpoint)) return true;
    if (TIER_B_ENDPOINT_PREFIXES.some((prefix) => endpoint.startsWith(prefix))) return true;
    // Chart-of-accounts edits go through the same generic create/update
    // endpoints Tier A collections use, so this checks the target collection
    // specifically rather than gating the whole endpoint.
    if (['createDoc', 'updateOneDoc', 'createManyDocs', 'updateManyDocs', 'removeDoc'].includes(endpoint)) {
        if (body?.collection === 'ChartOfAccounts') return true;
    }
    return false;
};

const fetchServer = async (method, rawBody, endpoint, server, signal) => {
    const body = ensureClientTxnId(endpoint, rawBody);
    if (!currentIsFullyConnected && isTierBRequest(endpoint, body)) {
        return {
            err: true,
            offline: true,
            mess: 'No connection to server — this action requires a live connection and cannot be completed offline.',
        };
    }
    // Skip auth checks for login and token endpoints
    const isAuthEndpoint = [
        'login',
        'token',
        'authenticateUser',
        'authenticateTenantAdmin',
        'redeemTenantAdminHandoff',
        'admin/auth/login'
    ].includes(endpoint);
    const normalizedMethod = String(method || 'GET').toUpperCase();
    const supportsRequestBody = !['GET', 'HEAD'].includes(normalizedMethod);
    const requestUrl = server
        ? new URL(`${server}/${endpoint}`)
        : new URL(`/${endpoint}`, window.location.origin);

    if (!supportsRequestBody && body && typeof body === 'object') {
        Object.entries(body).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            requestUrl.searchParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        });
    }

    // Attach in-memory access token (if any) to Authorization header for cross-origin requests
    const storedToken = inMemoryAccessToken;

    const data = {
        method: normalizedMethod,
        credentials: 'include',
        headers: supportsRequestBody ? {
            'Content-Type': 'application/json',
            ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {})
        } : (storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}),
    };

    if (supportsRequestBody) {
        data.body = JSON.stringify({
            ...(body || {})
        });
    }
    
    if (signal) {
        data.signal = signal;
    } else {
        delete data.signal;
    }
    try {
        let resp = await fetch(requestUrl.toString(), data);
        
        // Skip token refresh for auth-related endpoints
        if ((resp.status === 403 || resp.status === 401) && !isAuthEndpoint) {
            // Token expired, try refreshing
            try {
                const tokenData = {
                    method: 'POST',
                    credentials: 'include'
                };

                resp = await fetch(server + '/token', tokenData);
                
                if (!resp.ok) {
                    throw new Error('Token refresh failed');
                }

                const tokenResponse = await resp.json();
                if (tokenResponse?.accessToken) {
                    setInMemoryAccessToken(tokenResponse.accessToken);
                    data.headers = {
                        ...(data.headers || {}),
                        'Authorization': `Bearer ${tokenResponse.accessToken}`
                    };
                }

                // Retry the original request with new token
                resp = await fetch(requestUrl.toString(), data);
                
                // If we get another 401 after refresh, session is truly expired
                if (resp.status === 401) {
                    throw new Error('Session expired after token refresh');
                }

                const responseData = await resp.json();
                // A non-401 error here (e.g. 403 "Workspace Suspended" from a
                // route that's genuinely off-limits, not an auth failure) is
                // NOT a session problem — but it's still an error, and must be
                // reported as one rather than silently returned as a success.
                if (!resp.ok) {
                    return { err: true, status: resp.status, ...responseData };
                }
                return { err: false, ...responseData };

            } catch (error) {
                console.error('Session expired or refresh failed:', error);
                // Clear any sensitive data
                window.localStorage.removeItem('sessn-cmp');
                window.localStorage.removeItem('sess-recg-id');
                window.localStorage.removeItem('idt-curr-usr');
                window.localStorage.removeItem('sessn-id');
                clearInMemoryAccessToken();
                
                // Only redirect if not already on login page to prevent loops
                if (!window.location.pathname.includes('/login')) {
                    const redirectUrl = window.location.pathname + window.location.search;
                    window.localStorage.setItem('lgt-mess', 'Your session has expired. Please log in again.');
                    window.localStorage.setItem('redirectAfterLogin', redirectUrl);
                    
                    // Use replaceState to prevent adding to browser history
                    window.history.replaceState(null, null, '/login');
                    window.dispatchEvent(new Event('popstate'));
                }
                
                return { err: true, message: 'Session expired. Please log in again.' };
            }
        }

        let response = {};
        try {
            response = await resp.json()
        } catch (parseError) {
            response = {
                err: true,
                mess: resp.status === 413
                    ? 'The request is too large for the server to accept. Please use a smaller image or reduce camera resolution before uploading.'
                    : `Server returned an unreadable response (${resp.status}). Please retry.`,
            }
        }
        // On login (authenticateUser) keep the returned accessToken in memory only,
        // for this tab's Authorization header use — the httpOnly cookie the server
        // already set is the real, persistent session.
        if (!response.err && response.accessToken) {
            setInMemoryAccessToken(response.accessToken);
        }
        if (!resp.ok) {
            return { err: true, status: resp.status, ...response }
        }

        return { ok: true, err: false, status: resp.status, ...response }

    } catch (error) {
        // Handle different types of errors
        console.log('Error Details:',error)
        if (error.name === 'AbortError') {
            return {err: true, mess: "Request aborted"}
        }else if (error.name === 'Forbidden'){
            return {err: true, mess: "Forbidden, No Token Found"}
        }else if (error.name === 'Unauthorized'){
            return {err: true, mess: ""}   
        }
        return {err: true, mess: "Could not connect to server. Please check your internet connection"}
    }
}

export default fetchServer
