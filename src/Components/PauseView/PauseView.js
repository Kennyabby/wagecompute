import './PauseView.css'
import { useEffect, useState, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'

const PauseView = ()=>{
    const { pauseView, setPauseView, viewAccess, generateCode} = useContext(ContextProvider)
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
                <label>
                    { viewAccess === null ? '' : 'This deployment is temporarily paused'}
                </label>
                {viewAccess !==null && <div className='pause-base-code'>{`cpt1 : : ${generateCode(5)}-${generateCode(13)}-d${generateCode(5)}aaef${generateCode(2)}`}</div>}
            </div>
        </>
    )
}

export default PauseView