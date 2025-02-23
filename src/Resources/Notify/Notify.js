import './Notify.css'
import { useEffect, useState, useContext, useRef } from "react";
import ContextProvider from '../ContextProvider';
const Notify = ({
    notifyMessage,notifyState,
    timeout,
    action,actionMessage
})=>{
    const timeoutRef = useRef(null)
    const {
        setAlert, setAlertState, setActionMessage
    } = useContext(ContextProvider)
    const [icon, setIcon] = useState('Error:')
    const [color, setColor] = useState('red')
   
    useEffect(()=>{
        if (notifyState === 'error'){
            setIcon('Error:')
            setColor('red')
        }else if (notifyState === 'info'){
            setIcon('Info:')
            setColor('rgb(62, 83, 243)')
        }else if (notifyState === 'success'){
            setIcon('Success:')
            setColor('rgb(19, 214, 26)')
        }
    },[notifyState])
    useEffect(()=>{
        if (notifyMessage || actionMessage){
            if (timeoutRef.current){
                clearTimeout(timeoutRef.current)
            }
            timeoutRef.current = setTimeout(()=>{
                setAlert('')
                setAlertState(null)
                setActionMessage('')                                
            },[timeout])
        }        
    },[notifyMessage])
    
    const takeAction = ()=>{
        if (actionMessage){
            action()
            setAlert('')
            setAlertState(null)
            setActionMessage('')
        }
    }
    return (    
        <>
            {notifyMessage && <div className='notify' style={{border: `solid ${color} 1.5px`}}>
                <div className='notifymess'>                    
                    <div style={{color:color, marginRight: '5px', fontWeight:'bold'}}>{icon}</div>
                    <div>
                        {notifyMessage}
                    </div>
                </div>
                {actionMessage && <div className='notifyactn'>
                    <div 
                        className='notifycl'
                        onClick={()=>{
                            setAlert('')
                            setAlertState(null)
                            setActionMessage('')
                        }}
                    >Cancel</div>
                    <div 
                        className='notifyacp'
                        onClick={()=>{
                            action()
                            setAlert('')
                            setAlertState(null)
                            setActionMessage('')
                        }}
                    >{actionMessage}</div>
                </div>}
            </div>}
        </>
    )
}

export default Notify