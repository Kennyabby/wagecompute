import { useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HiOutlineClock, HiArrowLeft, HiOutlineShieldExclamation } from 'react-icons/hi';
import ContextProvider from '../../Resources/ContextProvider';
import './ErrorPages.css';

const LicenseExpired = () => {
  const navigate = useNavigate();
  const { storePath, companyRecord } = useContext(ContextProvider)

  useEffect(() => {
    storePath('license-expired')
    document.title = 'License Expired | Enterprise Compute Central'
  }, [storePath])
  
  return (
    <div className="error-page">
      <div className="error-container">
        <motion.div 
          className="error-icon-box license-error"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
        >
          <HiOutlineShieldExclamation />
          <motion.div 
            className="error-pulse"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Subscription Inactive
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Your workspace has been temporarily paused. This usually happens when a subscription expires or needs manual activation.
        </motion.p>

        <motion.div 
          className="error-info-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <HiOutlineClock className="info-icon" />
          <div>
            <h4>Immediate Action Required</h4>
            <p>Please contact your administrator or our billing department to resume access to your business data.</p>
          </div>
        </motion.div>

        <motion.div 
          className="error-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button className="btn-primary" onClick={() => navigate(companyRecord?.emailid ? '/settings' : '/renew')}>
            Manage Subscription
          </button>
          <button className="btn-back" onClick={() => navigate('/')}>
            <HiArrowLeft /> Back to Home
          </button>
          <button className="btn-primary" onClick={() => window.location.href = 'mailto:support@epxcentral.com'}>
            Contact Support
          </button>
        </motion.div>
      </div>
      
      <div className="error-bg-elements">
        <div className="blob blob-1 license"></div>
        <div className="blob blob-2 license"></div>
      </div>
    </div>
  );
};

export default LicenseExpired;
