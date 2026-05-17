import './AuthNotify.css';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

const AuthNotify = ({
    message,
    type,
    onClose,
    notifyMessage,
    notifyState,
    timeout = 5000,
}) => {
    const displayMessage = message || notifyMessage || '';
    const displayType = type || notifyState || 'info';
    const duration = Number(timeout || 5000);

    useEffect(() => {
        if (!displayMessage || !onClose || duration <= 0) return undefined;
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [displayMessage, duration, onClose]);

    const getIcon = () => {
        switch (displayType) {
            case 'error': return <FiAlertCircle />;
            case 'success': return <FiCheckCircle />;
            default: return <FiInfo />;
        }
    };

    return (
        <AnimatePresence mode='wait'>
            {displayMessage && (
                <div className="auth-notify-container">
                    <motion.div
                        initial={{ opacity: 0, x: -20, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.96 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className={`auth-notify-pill ${displayType}`}
                        style={{ '--auth-notify-duration': `${duration}ms` }}
                    >
                        <div className="auth-notify-icon">
                            {getIcon()}
                        </div>
                        <div className="auth-notify-content">
                            <p className="auth-notify-message">{displayMessage}</p>
                        </div>
                        <button className="auth-notify-close" onClick={onClose}>
                            <FiX />
                        </button>
                        {duration > 0 && (
                            <div className="auth-notify-progress">
                                <div className="auth-notify-progress-bar" />
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AuthNotify;
