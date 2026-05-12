import{ React, useContext, useEffect} from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HiOutlineDatabase, HiArrowLeft } from 'react-icons/hi';
import ContextProvider from '../../Resources/ContextProvider'; 
import './ErrorPages.css';

const DatabaseNotFound = ({ isProduction }) => {
  const {storePath} = useContext(ContextProvider)
  const navigate = useNavigate();
  useEffect(() => {
    storePath('database-not-found')
    // set page title
    document.title = "Database Not Found | Enterprise Compute Central"
  }, [storePath])
  return (
    <div className="error-page">
      <div className="error-container">
        <motion.div 
          className="error-icon-box db-error"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
        >
          <HiOutlineDatabase />
          <motion.div 
            className="error-badge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            404
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Database Not Found
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isProduction 
            ? "We couldn't locate the database associated with this tenant. Please contact support if you believe this is an error."
            : "The requested tenant database does not exist in your local or development environment. Check your WCDatabase.companyprofiles collection."
          }
        </motion.p>

        <motion.div 
          className="error-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button className="btn-back" onClick={() => window.open(isProduction ? 'https://epxcentral.com' : 'http://localhost:3000', '_self')}>
            <HiArrowLeft /> Back to Home
          </button>
          {(
            <button className="btn-secondary" onClick={() => window.open(isProduction ? 'https://epxcentral.com/signup': 'http://localhost:3000/signup', '_self')}>
              Create Company
            </button>
          )}
        </motion.div>
      </div>
      
      <div className="error-bg-elements">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
    </div>
  );
};

export default DatabaseNotFound;
