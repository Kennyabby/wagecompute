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
        saveReport: (spec, id) => call('POST', 'builder/save', { spec, id }),
        deleteReport: (id) => call('POST', 'builder/delete', { id }),
        getReports: () => call('GET', 'reports'),
        runReport: (key, params) => call('POST', 'reports/run', { key, params }),
        drillReport: (key, params, target) => call('POST', 'reports/drill', { key, params, target }),
    }
}
