import './Purchase.css'
import { useEffect, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'

const Purchase = ()=>{

    const { storePath,
        server, 
        fetchServer,
        companyRecord,
        company, 
        employees, months,
        alert,alertState,alertTimeout,actionMessage,
        setAlert, setAlertState, setAlertTimeout, setActionMessage
    } = useContext(ContextProvider)
    useEffect(()=>{
        storePath('purchase')  
    },[storePath])
    return (
        <>
        </>
    )
}

export default Purchase