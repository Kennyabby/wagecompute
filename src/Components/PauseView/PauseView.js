import './PauseView.css'
import { useEffect, useState, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'

const PauseView = ()=>{
    const { pauseView, setPauseView, viewAccess} = useContext(ContextProvider)
    const [accessValue, setAccessValue] = useState('')
    const magicWord = 'oh ye server. allow thee into your world '
    const handleSecretAccess = (e)=>{
        const {name, value} = e.target
        if (name === 'access'){
            setAccessValue(value)
        }else{
            setAccessValue('')
        }
    }

    useEffect(()=>{
        if (accessValue === magicWord){
            window.localStorage.setItem('ps-vw', 'true')  
            window.localStorage.setItem('acc-vw', 'true')  
            setPauseView(false)                 
            setAccessValue('')         
        }
    },[accessValue])

    return (
        <>
            <div className='pause-view' onChange={handleSecretAccess} onClick={handleSecretAccess}>
                <input
                    className='saccess'
                    name = 'access'
                    value={accessValue} 
                    autoComplete={false}                                   
                />
                { viewAccess === null ?'' : 'Deployment Paused'}
            </div>
        </>
    )
}

export default PauseView