import './Notify.css'
import { useEffect, useState, useContext } from "react";
import ContextProvider from '../ContextProvider';
const Notify = ({
    notifyMessage,notifyState,
    timeout,
    action,actionMessage
})=>{
    const {setAlert, setAlertState} = useContext(ContextProvider)
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
        if (notifyMessage){
            setTimeout(()=>{
                setAlert('')
                setAlertState(null)
            },[timeout])
        }
    },[notifyMessage])
    return (
        <>
            {notifyMessage && <div className='notify' style={{border: `solid ${color} 1.5px`}}>
                <div style={{color:color, marginRight: '5px', fontWeight:'bold'}}>{icon}</div>
                <div>
                    {notifyMessage}
                </div>
            </div>}
        </>
    )
}

export default Notify