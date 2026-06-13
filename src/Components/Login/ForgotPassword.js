import "./Login.css";
import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiShieldCheck } from 'react-icons/hi';
import ContextProvider from '../../Resources/ContextProvider';
import { motion, AnimatePresence } from "framer-motion";
import applogo from '../../Resources/assets/images/enterprisecompute.png'
import AuthNotify from '../../Resources/Notify/AuthNotify';

const ForgotPassword = () => {
  const { server, storePath } = useContext(ContextProvider)
  const Navigate = useNavigate()
  
  const [emailid, setEmailid] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Password
  const [status, setStatus] = useState("Reset Password")
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("error") // 'success' | 'info' | 'error'
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const showMsg = (msg, type = 'error') => {
    setMessage(msg)
    setMessageType(type)
  }

  const handleRequestOTP = async () => {
    if (loading) return
    if (!emailid) {
      showMsg("Please enter your registered email.", 'error')
      return
    }

    setLoading(true)
    setResending(true)
    try {
      const response = await fetch(`${server}/requestPasswordReset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailid })
      })
      const data = await response.json()
      
      if (response.ok) {
        setStep(2)
        showMsg("Verification code sent to your email.", 'info')
      } else {
        showMsg(data.error || "Failed to send code.", 'error')
      }
    } catch (err) {
      showMsg("Network error. Please try again.", 'error')
    } finally {
      setLoading(false)
      setTimeout(() => {
        showMsg("")
        setResending(false)
      }, 3000)
    }
  }

  const handleVerifyOTP = async () => {
    if (loading) return
    if (!otp) {
      showMsg("Please enter the 6-digit code.", 'error')
      return
    }

    setLoading(true)
    setMessage("")
    try {
      const response = await fetch(`${server}/verifyOTP`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailid, otp })
      })
      const data = await response.json()
      
      if (data.ok) {
        setStep(3)
        showMsg("Code verified. Please set your new password.", 'success')
      } else {
        showMsg(data.error || "Invalid verification code.", 'error')
      }
    } catch (err) {
      showMsg("Network error. Please try again.", 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFinalReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      showMsg("Password must be at least 6 characters.", 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showMsg("Passwords do not match.", 'error')
      return
    }

    setLoading(true)
    setMessage("")
    try {
      const response = await fetch(`${server}/resetPassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailid, otp, newPassword })
      })
      const data = await response.json()
      
      if (data.ok) {
        showMsg("Password updated successfully! Redirecting...", 'success')
        setTimeout(() => Navigate('/login'), 2000)
      } else {
        showMsg(data.error || "Failed to reset password.", 'error')
      }
    } catch (err) {
      showMsg("Network error. Please try again.", 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    storePath('forgot-password')
    document.title = 'Forgot Password | Enterprise Compute Central'
  }, [storePath])
  
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-side-form">
          <motion.div
            className="form-header"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="mobile-logo">
              <div className="logo-link" onClick={() => Navigate('/')}>
                <img src={applogo} alt="Logo" />
              </div>
            </div>
            <h2>Account Recovery</h2>
            <p>
              {step === 1 && "Enter your email to receive a verification code."}
              {step === 2 && "Enter the 6-digit code sent to your email."}
              {step === 3 && "Create a new strong password for your account."}
            </p>
          </motion.div>

          <div className="login-form">
            {step === 1 && (
              <motion.div
                className="input-group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ width: '100%' }}
              >
                <label>Registered Email</label>
                <div className="input-with-icon">
                  <HiShieldCheck className="icon" />
                  <input
                    placeholder="email@example.com"
                    type="email"
                    value={emailid}
                    onChange={(e) => setEmailid(e.target.value)}
                  />
                </div>
                <button className="main-login-btn" onClick={handleRequestOTP} disabled={loading} style={{ marginTop: '24px' }}>
                  {loading ? "Sending..." : "Send Verification Code"}
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                className="recovery-card-wrap"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <label style={{ display: 'block', marginBottom: '15px', fontWeight: 700, fontSize: '13px', color: 'var(--login-primary)' }}>
                  Enter Recovery Code
                </label>
                <div className="otp-input-container">
                  <input
                    className="otp-field"
                    placeholder="000000"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    autoFocus
                  />
                </div>
                <button 
                  className="main-login-btn" 
                  onClick={handleVerifyOTP} 
                  disabled={loading || otp.length < 6}
                  style={{ width: '100%', marginTop: '20px' }}
                >
                  {(loading && !resending) ? "Verifying..." : "Verify Identity"}
                </button>
                <div className="resend-box">
                  Didn't get the code? <span className="resend-link" onClick={handleRequestOTP}>{resending ? "Resending...": "Resend Code"}</span>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                className="login-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="input-group">
                  <label>New Password</label>
                  <div className="input-with-icon">
                    <HiShieldCheck className="icon" />
                    <input
                      placeholder="Enter new secure password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Confirm Password</label>
                  <div className="input-with-icon">
                    <HiShieldCheck className="icon" />
                    <input
                      placeholder="Confirm your new password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                <button 
                  className="main-login-btn" 
                  onClick={handleFinalReset} 
                  disabled={loading}
                  style={{ marginTop: '24px' }}
                >
                  {loading ? "Saving Password..." : "Reset Password & Access Terminal"}
                </button>
              </motion.div>
            )}

            <div className="form-footer-note" style={{ textAlign: 'center', marginTop: '20px' }}>
              <p>Remember your password? <span onClick={() => Navigate('/login')} style={{ color: 'var(--ec-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>Sign in</span></p>
            </div>
          </div>
        </div>

        <div className="login-side-visual">
          <div className="visual-overlay"></div>
          <motion.div
            className="visual-content"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
          >
            <div className="visual-logo-box">
              <div className="logo-link" onClick={() => Navigate('/')}>
                <img src={applogo} alt="Enterprise Compute" />
              </div>
            </div>
            <h1>Super Admin Recovery</h1>
            <div className="visual-divider"></div>
            <p>This secure recovery process is strictly reserved for Tenant Super Administrators to ensure the highest level of organization security.</p>
          </motion.div>
        </div>
      </div>

      <AuthNotify 
        message={message} 
        type={messageType} 
        onClose={() => setMessage("")} 
      />
    </div>
  );
};

export default ForgotPassword;
