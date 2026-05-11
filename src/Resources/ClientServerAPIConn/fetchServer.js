const fetchServer = async (method, body, endpoint, server, signal) => {
    // Skip auth checks for login and token endpoints
    const isAuthEndpoint = ['login', 'token', 'authenticateUser', 'admin/auth/login'].includes(endpoint);
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

    // Attach stored access token (if any) to Authorization header for cross-origin requests
    const storedToken = typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;

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

                // Retry the original request with new token
                resp = await fetch(requestUrl.toString(), data);
                
                // If we get another 401 after refresh, session is truly expired
                if (resp.status === 401) {
                    throw new Error('Session expired after token refresh');
                }
                
                const responseData = await resp.json();
                // If token refresh returned a token in body, store it
                if (responseData && responseData.accessToken) {
                    window.localStorage.setItem('accessToken', responseData.accessToken);
                }
                return { err: false, ...responseData };
                
            } catch (error) {
                console.error('Session expired or refresh failed:', error);
                // Clear any sensitive data
                window.localStorage.removeItem('sessn-cmp');
                window.localStorage.removeItem('sess-recg-id');
                window.localStorage.removeItem('idt-curr-usr');
                window.localStorage.removeItem('sessn-id');
                window.localStorage.removeItem('accessToken');
                
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

        const response = await resp.json()
        // On login (authenticateUser) store returned accessToken for Authorization header use
        if (!response.err && response.accessToken) {
            window.localStorage.setItem('accessToken', response.accessToken);
        }
        if (!resp.ok) {
            return { err: true, status: resp.status, ...response }
        }

        return { err: false, status: resp.status, ...response }

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
