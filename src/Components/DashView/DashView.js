import './DashView.css'

import {useEffect, useState, useCallback } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'

const DashView = () =>{
    const {storePath} = useContext(ContextProvider)
    useEffect(()=>{
        storePath('dashboard')  
    },[storePath])
    return(
        <>
            <div className='dashview'>
                <div className='dashleft'>
                    <div className='dashltop'></div>
                    <div className='dashlbottom'></div>
                </div>
                <div className='dashright'></div>
            </div>
        </>
    )
}

export default DashView