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
        if (setActionMessage) setActionMessage('');
    };

    useEffect(() => {
        if (notifyMessage) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                closeToast();
            }, timeout || 5000);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [notifyMessage, timeout]);

    const handleAction = () => {
        if (action) {
            action();
            closeToast();
        }
    };

    const handleCancel = () => {
        if (cancel) cancel();
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

    return (
        <div className="toast-container">
            <AnimatePresence>
                {notifyMessage && (
                    <motion.div
                        key="toast"
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className="toast-wrapper"
                    >
                        <div className={`toast ${notifyState || 'info'}`}>
                            <div className="toast-accent" />
                            <div className="toast-icon-container">
                                {getIcon()}
                            </div>
                            <div className="toast-content">
                                <p className="toast-message">{notifyMessage}</p>
                                {actionMessage && (
                                    <div className="toast-actions">
                                        <button className="toast-btn toast-btn-primary" onClick={handleAction}>
                                            {actionMessage}
                                        </button>
                                        <button className="toast-btn toast-btn-secondary" onClick={handleCancel}>
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button className="toast-close" onClick={closeToast}>
                                <FiX />
                            </button>
                            <div className="toast-progress">
                                <motion.div 
                                    className="toast-progress-bar"
                                    initial={{ scaleX: 1 }}
                                    animate={{ scaleX: 0 }}
                                    transition={{ duration: (timeout || 5000) / 1000, ease: "linear" }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Notify;