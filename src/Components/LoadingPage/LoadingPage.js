import './LoadingPage.css'
import applogo from '../../Resources/assets/images/enterprisecompute.png'
import { motion } from 'framer-motion'

const LoadingPage = () => {
    return (
        <div className='loadingpage'>
            <motion.div 
                className='loading-container'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <div className="loadinglogocover">
                    <motion.div 
                        className="logo-ring-outer"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div 
                        className="logo-ring"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                        className="logo-glow"
                        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.1, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <img src={applogo} className="loadinglogo" alt="Enterprise Compute Logo"/>
                </div>
                <div className="loading-text-content">
                    <motion.h3
                        initial={{ letterSpacing: "10px", opacity: 0 }}
                        animate={{ letterSpacing: "4px", opacity: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                    >
                        Enterprise Compute
                    </motion.h3>
                    <motion.div 
                        className="loading-status"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                    >
                        <span className="status-dot"></span>
                        Initializing secure environment
                        <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        >...</motion.span>
                    </motion.div>
                </div>
            </motion.div>
            
            <div className="loading-footer">
                Powering Productivity with Precision
            </div>
        </div>
    )
}

export default LoadingPage