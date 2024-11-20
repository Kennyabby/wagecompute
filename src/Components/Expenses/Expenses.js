import './Expenses.css'
import { useEffect, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'

const Expenses = ()=>{

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
        storePath('expenses')  
    },[storePath])
    return (
        <>
        </>
    )
}

export default Expenses