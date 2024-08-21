import './Payroll.css'

import {useEffect, useState, useCallback } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'

const Payroll = () =>{
    const {storePath} = useContext(ContextProvider)
    useEffect(()=>{
        storePath('dashboard')  
    },[storePath])
    return(
        <>
        PAYROLL
        </>
    )
}

export default Payroll