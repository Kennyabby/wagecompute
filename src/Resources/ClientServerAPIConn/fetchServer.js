import { useContext } from "react"
import ContextProvider from "../../Resources/ContextProvider"
const fetchServer = async (method, body, endpoint, server, signal) => {
    // Skip auth checks for login and token endpoints
    const isAuthEndpoint = ['login', 'token', 'authenticateUser'].includes(endpoint);
    
    const data = {
        method,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...body
        }),
    };
    
    if (signal) {
        data.signal = signal;
    } else {
        delete data.signal;
    }
    try {
        let resp = await fetch(server + '/' + endpoint, data);
        
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
                resp = await fetch(server + '/' + endpoint, data);
                
                // If we get another 401 after refresh, session is truly expired
                if (resp.status === 401) {
                    throw new Error('Session expired after token refresh');
                }
                
                const responseData = await resp.json();
                return { err: false, ...responseData };
                
            } catch (error) {
                console.error('Session expired or refresh failed:', error);
                // Clear any sensitive data
                window.localStorage.removeItem('sessn-cmp');
                window.localStorage.removeItem('sess-recg-id');
                window.localStorage.removeItem('idt-curr-usr');
                window.localStorage.removeItem('sessn-id');
                
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

        return {err: false, ...response}

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