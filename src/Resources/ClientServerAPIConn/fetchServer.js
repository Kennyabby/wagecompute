
const fetchServer = async (method, body, endpoint, server, signal)=>{
    const data = {
        method,
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
        const resp = await fetch('/'+endpoint, data)
        const response = await resp.json()
        return {err: false, ...response}
    } catch (error) {
        if (error.name === 'AbortError') {
            return {err: true, mess: "Request aborted"}
        }
        return {err: true, mess: "Could not connect to server. Please check your internet connection"}
    }
}

export default fetchServer