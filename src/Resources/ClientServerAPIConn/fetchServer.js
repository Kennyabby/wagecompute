import { useContext } from "react"
import ContextProvider from "../../Resources/ContextProvider"
const fetchServer = async (method, body, endpoint, server, signal)=>{
    const data = {
        method,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...body
        }),
    }
    if (signal){
        data.signal = signal
    }else{
        delete data.signal
    }
    try {
        let resp = await fetch(server + '/' + endpoint, data)
        // const resp = await fetch('/'+endpoint, data)        
        if (resp.status === 403 || resp.status === 401) {
            // Token expired, try refreshing
            try {
                const tokenData = {
                    method: 'POST',
                    credentials: 'include'
                };

                const tokenResponse = await fetch(server + '/token', tokenData);
                
                if (!tokenResponse.ok) {
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
                // Clear any sensitive data from localStorage/sessionStorage
                const redirectUrl = window.location.pathname + window.location.search;
                window.localStorage.setItem('lgt-mess', 'Your session has expired. Please log in again.');
                window.localStorage.setItem('redirectAfterLogin', redirectUrl);
                
                // Short delay to ensure message is stored before reload
                setTimeout(() => {
                    window.location.href = '/login';
                }, 500);
                
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