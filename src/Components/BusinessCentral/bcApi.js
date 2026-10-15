// Thin wrappers over the app's shared fetchServer for the /bc/* routes.
// Every call resolves with the response body or throws an Error carrying the
// server's own message, so pages can use one try/catch instead of checking
// `err` on each response.
//
// `connectionId` names which of the workspace's Business Central connections
// the calls are about. It rides along on every request, so switching
// connection is a matter of making a new api with another id.
export const createBcApi = (fetchServer, server, connectionId = '') => {
    const call = async (method, endpoint, body) => {
        const payload = connectionId ? { ...(body || {}), connectionId } : body
        const response = await fetchServer(method, payload, `bc/${endpoint}`, server)
        if (!response || response.err || response.ok === false) {
            const error = new Error(response?.mess || 'Could not reach the server. Check your connection and try again.')
            error.status = response?.status
            throw error
        }
        return response
    }

    return {
        getConnection: () => call('GET', 'connection'),
        // `target` is { id: 'new', copyFrom } when adding a connection.
        testConnection: (connection, target = {}) => call('POST', 'connection/test', { connection, ...target }),
        saveConnection: (connection, target = {}) => call('POST', 'connection/save', { connection, ...target }),
        discover: () => call('POST', 'connection/discover', {}),
        saveMapping: (datasets) => call('POST', 'connection/mapping', { datasets }),
        removeConnection: (purge) => call('POST', 'connection/remove', { purge }),

        startSync: (mode, datasets) => call('POST', 'sync/start', { mode, datasets }),
        cancelSync: () => call('POST', 'sync/cancel', {}),
        getSyncStatus: () => call('GET', 'sync/status'),
        getSyncHistory: () => call('GET', 'sync/history', { limit: 15 }),
        getSyncStorage: () => call('GET', 'sync/storage'),
        getChanges: (query) => call('GET', 'changes', query),

        getLiveStatus: () => call('GET', 'live/status'),
        refreshLive: () => call('POST', 'live/refresh', {}),

        getLookups: () => call('GET', 'lookups'),
        getDashboard: (params) => call('POST', 'dashboard', params),
        getMonthly: (params) => call('POST', 'dashboard/monthly', params),
        matchStatement: (statement) => call('POST', 'bank/match', statement),

        getBuilderSchema: () => call('GET', 'builder/schema'),
        runBuilder: (spec, params) => call('POST', 'builder/run', { spec, params }),
        getSavedReports: () => call('GET', 'builder/saved'),
        // With `draft`, the report is kept as it stands, finished or not.
        saveReport: (spec, id, draft = false) => call('POST', 'builder/save', { spec, id, draft }),
        getFieldValues: (source) => call('POST', 'builder/values', source),
        deleteReport: (id) => call('POST', 'builder/delete', { id }),
        getReports: () => call('GET', 'reports'),
        runReport: (key, params) => call('POST', 'reports/run', { key, params }),
        drillReport: (key, params, target) => call('POST', 'reports/drill', { key, params, target }),

        // E-invoicing: posted invoices staged here and tendered to NRS.
        einvOverview: () => call('GET', 'einvoice/overview'),
        einvSaveSettings: (settings) => call('POST', 'einvoice/settings', { settings }),
        einvTestKeys: () => call('POST', 'einvoice/test', {}),
        einvSource: () => call('GET', 'einvoice/source'),
        // The heartbeat: has the server look at the ERP for new documents.
        einvLive: () => call('GET', 'einvoice/live'),
        einvFetch: (range) => call('POST', 'einvoice/fetch', range),
        // `source` is 'upload' for a spreadsheet and 'manual' for one typed in.
        einvImport: (source, documents) => call('POST', 'einvoice/import', { source, documents }),
        einvPaymentsSync: () => call('POST', 'einvoice/payments/sync', {}),
        einvPayment: (id, paidTotal) => call('POST', 'einvoice/payment', { id, paidTotal }),
        einvStamps: () => call('POST', 'einvoice/stamps', {}),
        einvCreateKey: (name) => call('POST', 'einvoice/apikeys', { name }),
        einvRemoveKey: (id) => call('POST', 'einvoice/apikeys/remove', { id }),
        einvDocuments: (query) => call('GET', 'einvoice/documents', query),
        einvDocument: (id) => call('GET', 'einvoice/document', { id }),
        // With no ids, everything that is due goes.
        einvSend: (ids) => call('POST', 'einvoice/send', { ids }),
        einvExclude: (ids, exclude, reason) => call('POST', 'einvoice/exclude', { ids, exclude, reason }),
        einvRefresh: (id) => call('POST', 'einvoice/refresh', { id }),
        einvGaps: () => call('GET', 'einvoice/gaps'),
        einvSaveMappings: (mappings) => call('POST', 'einvoice/mappings', { mappings }),
        einvLog: () => call('GET', 'einvoice/log'),
    }
}
