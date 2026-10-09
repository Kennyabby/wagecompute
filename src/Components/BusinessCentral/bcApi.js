// Thin wrappers over the app's shared fetchServer for the /bc/* routes.
// Every call resolves with the response body or throws an Error carrying the
// server's own message, so pages can use one try/catch instead of checking
// `err` on each response.
export const createBcApi = (fetchServer, server) => {
    const call = async (method, endpoint, body) => {
        const response = await fetchServer(method, body, `bc/${endpoint}`, server)
        if (!response || response.err || response.ok === false) {
            const error = new Error(response?.mess || 'Could not reach the server. Check your connection and try again.')
            error.status = response?.status
            throw error
        }
        return response
    }

    return {
        getConnection: () => call('GET', 'connection'),
        testConnection: (connection) => call('POST', 'connection/test', { connection }),
        saveConnection: (connection) => call('POST', 'connection/save', { connection }),
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
        getReports: () => call('GET', 'reports'),
        runReport: (key, params) => call('POST', 'reports/run', { key, params }),
    }
}
