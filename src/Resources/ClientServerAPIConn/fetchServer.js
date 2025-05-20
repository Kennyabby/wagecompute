
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
            const tokenData = {
                method: 'POST',
                credentials: 'include',
            }
            await fetch(server + '/token', tokenData);

            // Retry the original request
            resp = await fetch(server + '/' + endpoint, data)
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