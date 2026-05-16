import './Notify.css';
import { useEffect, useContext, useRef } from "react";
import ContextProvider from '../ContextProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

const Notify = ({
    notifyMessage, 
    notifyState,
    timeout = 5000,
    action, 
    actionMessage, 
    cancel
}) => {
    const timeoutRef = useRef(null);
    const {
        setAlert, setAlertState, setActionMessage
    } = useContext(ContextProvider);

    const closeToast = () => {
        setAlert('');
        setAlertState(null);
        if (actionMessage) setActionMessage('');
    };

    useEffect(() => {
        if (notifyMessage) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (timeout !== 100000) {
                timeoutRef.current = setTimeout(() => {
                    closeToast();
                }, timeout || 5000);
            }
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [notifyMessage, timeout]);

    const handleAction = () => {
        if (typeof action === 'function') action();
        closeToast();        
    };
    
    const handleCancel = () => {
        if (typeof cancel === 'function') cancel();
        closeToast();
    };

    const getIcon = () => {
        switch (notifyState) {
            case 'success': return <FiCheckCircle className="toast-icon" />;
            case 'error': return <FiAlertCircle className="toast-icon" />;
            case 'info': return <FiInfo className="toast-icon" />;
            case 'warning': return <FiAlertCircle className="toast-icon" />;
            default: return <FiInfo className="toast-icon" />;
        }
    };

    return ( (notifyMessage || actionMessage) && 
        <div className="notify-container">
            <AnimatePresence mode="wait">
                <motion.div
                    key={notifyMessage}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0}}
                    exit={{ opacity: 0, y: -20 }}
                    className="notify-toast-wrapper"                    
                >
                    <div className={`notify-toast ${notifyState || 'info'}`}>
                        <div className="notify-toast-accent" />
                        {!actionMessage && <div className="notify-toast-icon-container">
                            {getIcon()}
                        </div>}
                        <div className="notify-toast-content">
                            <p className="notify-toast-message">{notifyMessage}</p>
                            {actionMessage && (
                                <div className="notify-toast-actions">
                                    <button className="notify-toast-btn toast-btn-primary" onClick={()=>{handleAction()}}>
                                        {actionMessage}
                                    </button>
                                    <button className="notify-toast-btn toast-btn-secondary" onClick={()=>{handleCancel()}}>
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                        {!actionMessage && <>
                            <button className="notify-toast-close" onClick={()=>{closeToast()}}>
                                <FiX />
                            </button>
                            <div className="notify-toast-progress">
                                <motion.div 
                                    className="notify-toast-progress-bar"
                                    initial={{ scaleX: 1 }}
                                    animate={{ scaleX: 0 }}
                                    transition={{ duration: (timeout || 5000) / 1000, ease: "linear" }}
                                />
                            </div>
                        </>}
                    </div>
                </motion.div>
            </AnimatePresence>            
        </div>
    );
};

export default Notify;