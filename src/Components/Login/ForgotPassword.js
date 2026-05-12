import "./Login.css";
import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiShieldCheck } from 'react-icons/hi';
import ContextProvider from '../../Resources/ContextProvider';
import { motion, AnimatePresence } from "framer-motion";
import applogo from '../../Resources/assets/images/enterprisecompute.png'

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
  const [loading, setLoading] = useState(false)

  const handleRequestOTP = async () => {
    if (!emailid) {
      setMessage("Please enter your registered email.")
      return
    }

    setLoading(true)
    setMessage("")
    try {
      const response = await fetch(`${server}/requestPasswordReset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailid })
      })
      const data = await response.json()
      
      if (response.ok) {
        setStep(2)
        setMessage("Verification code sent to your email.")
      } else {
        setMessage(data.error || "Failed to send code.")
      }
    } catch (err) {
      setMessage("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp) {
      setMessage("Please enter the 6-digit code.")
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
        setMessage("Code verified. Please set your new password.")
      } else {
        setMessage(data.error || "Invalid verification code.")
      }
    } catch (err) {
      setMessage("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleFinalReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage("Password must be at least 6 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.")
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
        setMessage("Password updated successfully! Redirecting...")
        setTimeout(() => Navigate('/login'), 2000)
      } else {
        setMessage(data.error || "Failed to reset password.")
      }
    } catch (err) {
      setMessage("Network error. Please try again.")
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
              <img src={applogo} alt="Logo" />
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
                className="input-group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <label>Verification Code</label>
                <div className="input-with-icon">
                  <HiShieldCheck className="icon" />
                  <input
                    placeholder="6-digit code"
                    type="text"
                    maxLength={6}
                    style={{ letterSpacing: '4px', fontWeight: 'bold', textAlign: 'center' }}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
                <button className="main-login-btn" onClick={handleVerifyOTP} disabled={loading} style={{ marginTop: '24px' }}>
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '16px', color: 'var(--ec-muted)' }}>
                  Didn't get the code? <span onClick={handleRequestOTP} style={{ color: 'var(--ec-secondary)', cursor: 'pointer', fontWeight: 600 }}>Resend</span>
                </p>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                className="input-group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <label>New Password</label>
                <div className="input-with-icon" style={{ marginBottom: '16px' }}>
                  <HiShieldCheck className="icon" />
                  <input
                    placeholder="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <label>Confirm Password</label>
                <div className="input-with-icon">
                  <HiShieldCheck className="icon" />
                  <input
                    placeholder="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <button className="main-login-btn" onClick={handleFinalReset} disabled={loading} style={{ marginTop: '24px' }}>
                  {loading ? "Updating..." : "Update Password"}
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
              <img src={applogo} alt="Enterprise Compute" />
            </div>
            <h1>Super Admin Recovery</h1>
            <div className="visual-divider"></div>
            <p>This secure recovery process is strictly reserved for Tenant Super Administrators to ensure the highest level of organization security.</p>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            key="login-toast"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="login-toast"
          >
            <div className="login-toast-accent" />
            <div className="login-toast-icon">!</div>
            <span className="login-toast-text">{message}</span>
            <button className="login-toast-close" onClick={() => setMessage("")}>×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ForgotPassword;
