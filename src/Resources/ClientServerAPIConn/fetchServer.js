
const fetchServer = async (method, body, endpoint, server)=>{
    const data = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...body
        }),
    }
    try {
        const resp = await fetch(server + '/'+endpoint, data)
        const response = await resp.json()
        return {err: false, ...response}
    } catch (error) {
        return {err: true, mess: "Could not connect to server. Please check your internet connection"}
    }
}

export default fetchServer