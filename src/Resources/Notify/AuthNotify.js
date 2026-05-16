import './AuthNotify.css';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

const AuthNotify = ({ message, type = 'info', onClose }) => {
    const getIcon = () => {
        switch (type) {
            case 'error': return <FiAlertCircle />;
            case 'success': return <FiCheckCircle />;
            default: return <FiInfo />;
        }
    };

    return (
        <AnimatePresence mode='wait'>
            {message && (
                <div className="auth-notify-container">
                    <motion.div
                        initial={{ opacity: 0, x: 5, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 5, scale: 0.95 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className={`auth-notify-pill ${type}`}
                    >
                        <div className="auth-notify-icon">
                            {getIcon()}
                        </div>
                        <div className="auth-notify-content">
                            <p className="auth-notify-message">{message}</p>
                        </div>
                        <button className="auth-notify-close" onClick={onClose}>
                            <FiX />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AuthNotify;
