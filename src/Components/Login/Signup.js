import "./Login.css";
import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoEyeOutline, IoEyeOffOutline, IoPersonOutline, IoBusinessOutline } from 'react-icons/io5';
import { HiShieldCheck, HiMail } from 'react-icons/hi';
import ContextProvider from '../../Resources/ContextProvider';
import { motion, AnimatePresence } from "framer-motion";
import applogo from '../../Resources/assets/images/enterprisecompute.png'

const Signup = () => {
  const { server, fetchServer, storePath } = useContext(ContextProvider)
  const Navigate = useNavigate()
  
  const [field, setField] = useState({
    companyName: "",
    subdomain: "",
    fullName: "",
    emailid: "",
    password: "",
    address: "",
    city: "",
    country: "Nigeria",
    state: ""
  });
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false)
  const [subdomainAvailable, setSubdomainAvailable] = useState(null)
  const [subdomainError, setSubdomainError] = useState("")
  const [signupStatus, setSignupStatus] = useState("Create Account")
  const [showpass, SetShowpass] = useState(false);
  const [signupMessage, setSignupMessage] = useState("")

  const getFieldInput = (e) => {
    const name = e.target.getAttribute("name");
    const value = e.target.value;
    setField((field) => {
      const updated = { ...field, [name]: value };
      // Auto-suggest subdomain from company name if it's empty
      if (name === "companyName" && !field.subdomain) {
        updated.subdomain = value.toLowerCase().replace(/[^a-z0-9]/g, '');
      }
      return updated;
    });
  };

  useEffect(() => {
    const checkSubdomain = async () => {
      if (!field.subdomain || field.subdomain.length < 3) {
        setSubdomainAvailable(null);
        setSubdomainError("");
        return;
      }

      setIsCheckingSubdomain(true);
      const resp = await fetchServer("POST", { subdomain: field.subdomain }, "checkCompanyExists", server);
      setIsCheckingSubdomain(false);

      if (resp.err) {
        setSubdomainAvailable(null);
        return;
      }

      if (resp.exists) {
        setSubdomainAvailable(false);
        setSubdomainError("This subdomain is already taken");
      } else {
        setSubdomainAvailable(true);
        setSubdomainError("");
      }
    };

    const timer = setTimeout(checkSubdomain, 500);
    return () => clearTimeout(timer);
  }, [field.subdomain, server, fetchServer]);

  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [signupOtp, setSignupOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSendSignupOTP = async () => {
    if (!field.emailid || !field.emailid.includes('@')) {
      setSignupMessage("Please enter a valid email address.")
      return
    }

    setSignupStatus("Sending Code...")
    try {
      const response = await fetch(`${server}/requestSignupOTP`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailid: field.emailid })
      })
      const data = await response.json()
      
      if (data.ok) {
        setShowOtpStep(true)
        setSignupMessage("Verification code sent to your email.")
      } else {
        setSignupMessage(data.error || "Failed to send code.")
      }
    } catch (err) {
      setSignupMessage("Network error. Please try again.")
    } finally {
      setSignupStatus("Create Account")
    }
  }

  const handleVerifySignupOTP = async () => {
    if (!signupOtp) {
      setSignupMessage("Please enter the 6-digit code.")
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch(`${server}/verifySignupOTP`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailid: field.emailid, otp: signupOtp })
      })
      const data = await response.json()
      
      if (data.ok) {
        setIsEmailVerified(true)
        setShowOtpStep(false)
        setSignupMessage("Email verified successfully! Please complete your registration.")
      } else {
        setSignupMessage(data.error || "Invalid code.")
      }
    } catch (err) {
      setSignupMessage("Network error. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const validateSignup = async () => {
    if (!isEmailVerified) {
      setSignupMessage("Please verify your email first.")
      return
    }
    
    if (!field.emailid || !field.password || !field.companyName || !field.subdomain || !field.fullName || !field.address || !field.city || !field.state) {
      setSignupMessage("Please fill in all fields")
      setTimeout(() => setSignupMessage(""), 5000)
      return
    }

    if (subdomainAvailable === false) {
      setSignupMessage("Please choose an available subdomain")
      setTimeout(() => setSignupMessage(""), 5000)
      return
    }

    setSignupStatus("Creating Account...")
    
    const signupResp = await fetchServer("POST", {
      ...field,
      otp: signupOtp // Include OTP in final signup to confirm verification on backend
    }, "signupNewCompany", server)

    if (signupResp.err || !signupResp.success) {
      setSignupMessage(signupResp.mess || "Failed to create account. Please try again.")
      setTimeout(() => setSignupMessage(""), 5000)
      setSignupStatus("Create Account")
      return
    }

    setSignupMessage("Account created successfully! Redirecting to your workspace...")
    setTimeout(() => {
      const protocol = window.location.protocol;
      let targetUrl;

      if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
        const port = window.location.port ? `:${window.location.port}` : '';
        targetUrl = `${protocol}//${field.subdomain}.localhost${port}/login`;
      } else {
        const rootDomain = 'epxcentral.com';
        targetUrl = `${protocol}//${field.subdomain}.${rootDomain}/login`;
      }

      window.location.href = targetUrl;
    }, 2000)
  }

  useEffect(() => {
    storePath('signup')
    // set page title
    document.title = "Signup - Enterprise Compute"
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
            <h2>Create an Account</h2>
            <p>
              {!isEmailVerified && !showOtpStep && "Verify your email to start your free trial."}
              {showOtpStep && !isEmailVerified && "Enter the verification code sent to your email."}
              {isEmailVerified && "Complete your profile to transform your business today."}
            </p>
          </motion.div>

          <div className="login-form">
            {/* Step 1: Email Verification */}
            <div className="form-grid">
              <motion.div
                className="input-group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label>Email Address</label>
                <div className="input-with-icon">
                  <HiMail className="icon" />
                  <input
                    name="emailid"
                    placeholder="work@company.com"
                    type="email"
                    readOnly={isEmailVerified}
                    style={isEmailVerified ? { backgroundColor: 'rgba(23,56,41,0.05)', color: '#555' } : {}}
                    value={field.emailid}
                    onChange={getFieldInput}
                  />
                  {isEmailVerified && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#2b6a4b', fontWeight: 'bold', fontSize: '0.8rem' }}>Verified ✓</span>}
                </div>
                {!isEmailVerified && !showOtpStep && (
                  <button className="main-login-btn" onClick={handleSendSignupOTP} style={{ marginTop: '16px' }}>
                    {signupStatus === "Sending Code..." ? "Sending..." : "Verify Email"}
                  </button>
                )}
              </motion.div>
            </div>

            {/* Step 2: OTP Entry */}
            {showOtpStep && !isEmailVerified && (
              <motion.div
                className="input-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: 'rgba(23,56,41,0.03)', padding: '20px', borderRadius: '12px', marginTop: '10px' }}
              >
                <label style={{ textAlign: 'center', display: 'block' }}>Enter Verification Code</label>
                <div className="input-with-icon">
                  <HiShieldCheck className="icon" />
                  <input
                    placeholder="6-digit code"
                    type="text"
                    maxLength={6}
                    style={{ letterSpacing: '4px', fontWeight: 'bold', textAlign: 'center' }}
                    value={signupOtp}
                    onChange={(e) => setSignupOtp(e.target.value)}
                  />
                </div>
                <button className="main-login-btn" onClick={handleVerifySignupOTP} disabled={isVerifying} style={{ marginTop: '16px' }}>
                  {isVerifying ? "Verifying..." : "Confirm Code"}
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: '12px' }}>
                  Didn't get it? <span onClick={handleSendSignupOTP} style={{ color: 'var(--ec-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>Resend</span>
                </p>
              </motion.div>
            )}

            {/* Step 3: Full Registration Details */}
            <AnimatePresence>
              {isEmailVerified && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.4 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="form-grid" style={{ marginTop: '20px' }}>
                    <div className="input-group">
                      <label>Company Name</label>
                      <div className="input-with-icon">
                        <IoBusinessOutline className="icon" />
                        <input
                          name="companyName"
                          placeholder="Your Business Name"
                          type="text"
                          value={field.companyName}
                          onChange={getFieldInput}
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <label>Workspace URL (Subdomain)</label>
                      <div className="input-with-icon">
                        <div className="icon" style={{ fontSize: '14px', fontWeight: 'bold' }}>ec/</div>
                        <input
                          name="subdomain"
                          placeholder="my-company"
                          type="text"
                          style={{ paddingLeft: '45px', paddingRight: '40px' }}
                          value={field.subdomain}
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                            setField(f => ({ ...f, subdomain: val }));
                          }}
                        />
                        <div className="input-status-icon" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                          {isCheckingSubdomain && <div className="spinner-small" />}
                          {!isCheckingSubdomain && subdomainAvailable === true && <span style={{ color: '#2b6a4b' }}>✓</span>}
                          {!isCheckingSubdomain && subdomainAvailable === false && <span style={{ color: '#d11212' }}>✕</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="input-group">
                      <label>Full Name</label>
                      <div className="input-with-icon">
                        <IoPersonOutline className="icon" />
                        <input
                          name="fullName"
                          placeholder="Your Full Name"
                          type="text"
                          value={field.fullName}
                          onChange={getFieldInput}
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <label>Password</label>
                      <div className="input-with-icon">
                        <HiShieldCheck className="icon" />
                        <input
                          name="password"
                          placeholder="Create a secure password"
                          type={showpass ? "text" : "password"}
                          value={field.password}
                          onChange={getFieldInput}
                        />
                        <button className="toggle-pass" onClick={() => SetShowpass(!showpass)}>
                          {showpass ? <IoEyeOffOutline /> : <IoEyeOutline />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Office Address</label>
                    <div className="input-with-icon">
                      <input
                        name="address"
                        style={{ padding: '0 20px' }}
                        placeholder="Street, Suite, Unit"
                        type="text"
                        value={field.address}
                        onChange={getFieldInput}
                      />
                    </div>
                  </div>

                  <div className="form-grid triple">
                    <div className="input-group">
                      <label>City</label>
                      <div className="input-with-icon">
                        <input
                          name="city"
                          style={{ padding: '0 20px' }}
                          placeholder="Port Harcourt"
                          type="text"
                          value={field.city}
                          onChange={getFieldInput}
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <label>State</label>
                      <div className="input-with-icon">
                        <input
                          name="state"
                          style={{ padding: '0 20px' }}
                          placeholder="Rivers"
                          type="text"
                          value={field.state}
                          onChange={getFieldInput}
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <label>Country</label>
                      <div className="input-with-icon">
                        <input
                          name="country"
                          style={{ padding: '0 20px' }}
                          placeholder="Nigeria"
                          type="text"
                          value={field.country}
                          onChange={getFieldInput}
                        />
                      </div>
                    </div>
                  </div>

                  <button className="main-login-btn" onClick={validateSignup} style={{ marginTop: '24px' }}>
                    {signupStatus}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="form-footer-note" style={{ textAlign: 'center', marginTop: '20px' }}>
              <p>Already have an account? <span onClick={() => Navigate('/login')} style={{ color: 'var(--ec-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>Sign in instead</span></p>
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
            <h1>Join Enterprise Compute</h1>
            <div className="visual-divider"></div>
            <p>The all-in-one business management platform. Streamline operations, empower employees, and grow faster.</p>

            <div className="visual-stats">
              <div className="stat-item">
                <span className="stat-num">14 Days</span>
                <span className="stat-label">Free Trial</span>
              </div>
              <div className="stat-item">
                <span className="stat-num">0 CC</span>
                <span className="stat-label">Required</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {signupMessage && (
          <motion.div
            key="login-toast"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="login-toast"
          >
            <div className="login-toast-accent" />
            <div className="login-toast-icon">!</div>
            <span className="login-toast-text">{signupMessage}</span>
            <button
              className="login-toast-close"
              onClick={() => setSignupMessage("")}
            >×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Signup;
