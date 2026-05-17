import "./Login.css";
import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoEyeOutline, IoEyeOffOutline, IoFingerPrintOutline } from 'react-icons/io5';
import { HiLogin, HiLogout, HiClock, HiShieldCheck } from 'react-icons/hi';
import { MdOutlineKeyboardAlt, MdBackspace } from 'react-icons/md';
import ContextProvider from '../../Resources/ContextProvider';
import { motion, AnimatePresence } from "framer-motion";
import applogo from '../../Resources/assets/images/enterprisecompute.png'
import AuthNotify from '../../Resources/Notify/AuthNotify';

const Login = () => {
  const { server, fetchServer, storePath,
    loginMessage, setLoginMessage, loadPage
  } = useContext(ContextProvider)
  const [viewType, setViewType] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date());
  const [field, setField] = useState({
    emailid: "",
    password: "",
  });
  const [signinStatus, setSigninStatus] = useState("Sign In")
  const [showpass, SetShowpass] = useState(false);
  const [activeInput, setActiveInput] = useState('emailid');
  const [capsLock, setCapsLock] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);

  const Navigate = useNavigate()
  const location = useLocation()
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const handoffRedeemRef = useRef('');
  const requestedNext = new URLSearchParams(location.search).get('next') === 'settings' ? 'settings' : 'dashboard'
  const hostname = window.location.hostname
  const isLocalRootLogin = ['localhost', '127.0.0.1'].includes(hostname)
  const isProductionRootLogin = ['epxcentral.com', 'www.epxcentral.com'].includes(hostname)
  const isRootDomainLogin = isProductionRootLogin || isLocalRootLogin

  const buildTenantRedirectUrl = (subdomain, handoffCode) => {
    const protocol = window.location.protocol
    const port = window.location.port ? `:${window.location.port}` : ''
    const next = encodeURIComponent(requestedNext || 'dashboard')
    if (isLocalRootLogin) {
      return `${protocol}//${subdomain}.localhost${port}/login?adminHandoff=${encodeURIComponent(handoffCode)}&next=${next}`
    }
    return `${protocol}//${subdomain}.epxcentral.com/login?adminHandoff=${encodeURIComponent(handoffCode)}&next=${next}`
  }

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard letter rows
  const letterRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  // Symbol rows
  const symbolRows = [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['-', '_', '=', '+', '[', ']', '{', '}', '|', '\\'],
    [';', ':', "'", '"', ',', '.', '/', '?', '~']
  ];

  const numberRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  // Get display character based on capsLock state
  const getDisplayChar = (char) => {
    return capsLock ? char.toUpperCase() : char;
  };

  // Handle virtual keypad press
  const handleKeyPress = useCallback((key) => {
    if (!activeInput) return;

    if (key === 'caps') {
      setCapsLock(prev => !prev);
      return;
    }

    if (key === 'symbols') {
      setShowSymbols(prev => !prev);
      return;
    }

    if (key === 'backspace') {
      setField(prev => ({
        ...prev,
        [activeInput]: (prev[activeInput] || "").slice(0, -1)
      }));
      return;
    }

    if (key === 'space') {
      key = ' ';
    } else if (key === 'clear') {
      setField(prev => ({
        ...prev,
        [activeInput]: ''
      }));
      return;
    } else if (key === 'tab') {
      // Switch between inputs
      setActiveInput(prev => prev === 'emailid' ? 'password' : 'emailid');
      return;
    }

    setField(prev => ({
      ...prev,
      [activeInput]: (prev[activeInput] || '') + key
    }));
  }, [activeInput]);

  // Handle external keyboard input change
  const handleExternalInput = (e) => {
    const name = e.target.getAttribute("name");
    const value = e.target.value;
    setField(prev => ({ ...prev, [name]: value }));
  };

  // Handle input focus
  const handleInputFocus = (fieldName) => {
    setActiveInput(fieldName);
  };

  // Format date as "Day, Month DD, YYYY"
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time as "HH:MM:SS AM/PM"
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  useEffect(() => {
    storePath('login')
    // set page title
    document.title = "Login | Enterprise Compute Central"
  }, [storePath])

  useEffect(() => {
    if (loginMessage) {
      setTimeout(() => {
        setLoginMessage("")
      }, 7000)
    }
  }, [loginMessage, setLoginMessage])

  useEffect(() => {
    const logoutMessage = window.localStorage.getItem('lgt-mess')
    if (logoutMessage) setLoginMessage(logoutMessage)
    window.localStorage.removeItem('lgt-mess')
    setViewType(window.localStorage.getItem('lgt-vw') || '')
  }, [setLoginMessage])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const handoffCode = params.get('adminHandoff')
    if (!handoffCode) return
    const redeemKey = `tenant-admin-handoff-${handoffCode}`
    if (handoffRedeemRef.current === handoffCode || window.sessionStorage.getItem(redeemKey) === 'redeeming') return
    handoffRedeemRef.current = handoffCode
    window.sessionStorage.setItem(redeemKey, 'redeeming')

    const redeemHandoff = async () => {
      setSigninStatus('Completing Sign In...')
      const resp = await fetchServer('POST', { handoffCode }, 'redeemTenantAdminHandoff', server)
      if (resp.err || !resp.ok || !resp.sessionId || !resp.db) {
        window.sessionStorage.removeItem(redeemKey)
        handoffRedeemRef.current = ''
        setLoginMessage(resp.mess || 'Admin login handoff expired. Please sign in again.')
        setSigninStatus('Sign In')
        return
      }

      var now = Date.now()
      var sess = 0
      resp.sessionId.split('').forEach((chr) => {
        sess += chr.codePointAt(0)
      })
      window.localStorage.setItem('sessn-cmp', resp.db)
      window.localStorage.setItem('sess-recg-id', now + '-' + sess)
      window.localStorage.setItem('idt-curr-usr', now + '')
      window.localStorage.setItem('sessn-id', resp.sessionId)
      window.sessionStorage.removeItem(redeemKey)
      window.history.replaceState(null, '', '/login')
      setSigninStatus('Sign In')
      loadPage(resp.sessionId, requestedNext)
    }

    redeemHandoff()
  }, [location.search, fetchServer, server, loadPage, requestedNext, setLoginMessage])

  const validateLogin = async () => {
    if (field.emailid === 'test' && field.password === 'test') {
      Navigate('/test')
    } else {
      setSigninStatus("Signing In...")
      setLoginMessage("")
      const endpoint = isRootDomainLogin ? "authenticateTenantAdmin" : "authenticateUser"
      const resp = await fetchServer("POST", {
        pass: field.password,
        prop: { 'emailid': field.emailid }
      }, endpoint, server)

      if (resp.err) {
        setLoginMessage(resp.mess)
        setSigninStatus("Sign In")
        setTimeout(() => {
          setLoginMessage("")
        }, 5000)
      } else {
        if (resp.mess) {
          if (resp.mess === 'Invalid Tenant'){
            setLoginMessage("Invalid User ID or Password") 
          }else{
            setLoginMessage(resp.mess)
          }
          setSigninStatus("Sign In")
          setTimeout(() => {
            setLoginMessage("")
          }, 5000)
        } else {
          if (isRootDomainLogin && resp.handoffCode && resp.subdomain) {
            window.location.href = buildTenantRedirectUrl(resp.subdomain, resp.handoffCode)
            return
          }
          var idVal = resp.id
          var company = resp.db
          var now = Date.now()
          var sess = 0
          idVal.split('').forEach((chr) => {
            sess += chr.codePointAt(0)
          })
          window.localStorage.setItem('sessn-cmp', company)
          window.localStorage.setItem('sess-recg-id', now + "-" + sess)
          window.localStorage.setItem('idt-curr-usr', now + "")
          window.localStorage.setItem('sessn-id', idVal)
          setField((field) => {
            return ({ ...field, emailid: "", password: "" })
          })
          setSigninStatus("Sign In")
          console.log("loading page with idVal: ", idVal)
          loadPage(idVal, requestedNext)
        }
      }
    }
  }

  const getFieldInput = (e) => {
    const name = e.target.getAttribute("name");
    const value = e.target.value;
    setField((field) => {
      return { ...field, [name]: value };
    });
  };

  // Handle logout
  const handleLogout = () => {
    window.localStorage.removeItem('sessn-cmp');
    window.localStorage.removeItem('sess-recg-id');
    window.localStorage.removeItem('idt-curr-usr');
    window.localStorage.removeItem('sessn-id');
    window.location.reload();
  };

  const [showKeypad, setShowKeypad] = useState(false);
  const isLoggedIn = window.localStorage.getItem('sessn-cmp') !== null;



  // Virtual keyboard component
  const VirtualKeyboard = () => (
    <div className="virtual-keypad">
      {/* Number row - always visible */}
      <div className="keypad-row">
        {numberRow.map(num => (
          <button key={num} className="key" onClick={() => handleKeyPress(num)}>{num}</button>
        ))}
      </div>

      {!showSymbols ? (
        <>
          {/* Letter rows */}
          {letterRows.map((row, rowIndex) => (
            <div className="keypad-row" key={`row-${rowIndex}`}>
              {rowIndex === 2 && (
                <button
                  className={`key ctrl-key ${capsLock ? 'active-ctrl' : ''}`}
                  onClick={() => handleKeyPress('caps')}
                >
                  {capsLock ? '⬆ ABC' : '⬆ abc'}
                </button>
              )}
              {row.map(char => (
                <button
                  key={char}
                  className="key"
                  onClick={() => handleKeyPress(getDisplayChar(char))}
                >
                  {getDisplayChar(char)}
                </button>
              ))}
              {rowIndex === 2 && (
                <button className="key ctrl-key delete" onClick={() => handleKeyPress('backspace')}>
                  <MdBackspace />
                </button>
              )}
            </div>
          ))}
        </>
      ) : (
        <>
          {/* Symbol rows */}
          {symbolRows.map((row, rowIndex) => (
            <div className="keypad-row" key={`sym-${rowIndex}`}>
              {row.map((sym, i) => (
                <button key={`${sym}-${i}`} className="key" onClick={() => handleKeyPress(sym)}>{sym}</button>
              ))}
              {rowIndex === 2 && (
                <button className="key ctrl-key delete" onClick={() => handleKeyPress('backspace')}>
                  <MdBackspace />
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {/* Bottom row */}
      <div className="keypad-row bottom-row">
        <button
          className={`key symbol-key ${showSymbols ? 'active-ctrl' : ''}`}
          onClick={() => handleKeyPress('symbols')}
        >
          {showSymbols ? 'ABC' : '#+='}
        </button>
        <button className="key tab-key" onClick={() => handleKeyPress('tab')}>TAB</button>
        <button className="key space-key" onClick={() => handleKeyPress('space')}>SPACE</button>
        <button className="key dot-key" onClick={() => handleKeyPress('.')}>.</button>
        <button className="key dot-key" onClick={() => handleKeyPress('@')}>@</button>
        <button className="key clear-key" onClick={() => handleKeyPress('clear')}>CLR</button>
      </div>
    </div>
  );

  const renderUserView = () => (
    <div className="user-login-container">
      <motion.div
        className="user-login-content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="user-header">
          <motion.div className="logo-link" onClick={() => Navigate('/')}>
            <motion.img
              src={applogo}
              alt="Logo"
              className="user-app-logo"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            />
          </motion.div>
          <motion.h1
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Enterprise Compute
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            System Terminal • Premium Business Solutions
          </motion.p>
        </div>

        <div className="user-login-grid">
          {/* Status Card */}
          <motion.div
            className="user-card info-card"
            whileHover={{ translateY: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="card-icon-box">
              <HiClock className="card-icon" />
            </div>
            <div className="card-text">
              <span className="card-label">Current Time</span>
              <span className="card-value primary">{formatTime(currentTime)}</span>
              <span className="card-subvalue">{formatDate(currentTime)}</span>
            </div>
          </motion.div>

          {/* Action Card */}
          {!isLoggedIn ? (
            <motion.div
              className="user-card action-card login-card"
              onClick={() => setShowKeypad(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="card-icon-box primary">
                <HiLogin className="card-icon" />
              </div>
              <div className="card-text">
                <span className="card-label">Security Access</span>
                <span className="card-value">Login to Terminal</span>
                <span className="card-subvalue">Requires Security Pin</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="user-card action-card logout-card"
              onClick={handleLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="card-icon-box danger">
                <HiLogout className="card-icon" />
              </div>
              <div className="card-text">
                <span className="card-label">Session Active</span>
                <span className="card-value">Terminate Session</span>
                <span className="card-subvalue">Secure Sign Off</span>
              </div>
            </motion.div>
          )}

          <motion.div
            className="user-card system-card"
            whileHover={{ translateY: -5 }}
          >
            <div className="card-icon-box success">
              <HiShieldCheck className="card-icon" />
            </div>
            <div className="card-text">
              <span className="card-label">System Status</span>
              <span className="card-value">Encrypted & Secure</span>
              <span className="card-subvalue">v2.4.0 Active</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showKeypad && (
          <motion.div
            className="keypad-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="keypad-content"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="keypad-header">
                <div className="header-title">
                  <MdOutlineKeyboardAlt />
                  <h3>Security Terminal</h3>
                </div>
                <button
                  className="close-btn"
                  onClick={() => setShowKeypad(false)}
                >
                  ×
                </button>
              </div>

              <div className="keypad-fields">
                <div className={`input-field-wrapper ${activeInput === 'emailid' ? 'focused' : ''}`}>
                  <label>User Identity</label>
                  <input
                    ref={emailRef}
                    type="text"
                    name="emailid"
                    value={field.emailid || ''}
                    onFocus={() => handleInputFocus('emailid')}
                    onChange={handleExternalInput}
                    placeholder="Enter ID Number"
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setActiveInput('password');
                        passwordRef.current?.focus();
                      }
                    }}
                  />
                </div>

                <div className={`input-field-wrapper ${activeInput === 'password' ? 'focused' : ''}`}>
                  <label>Security Pin</label>
                  <div className="pin-input-box">
                    <input
                      ref={passwordRef}
                      type={showpass ? "text" : "password"}
                      name="password"
                      value={field.password || ''}
                      onFocus={() => handleInputFocus('password')}
                      onChange={handleExternalInput}
                      placeholder="••••••••"
                      autoComplete="off"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') validateLogin();
                      }}
                    />
                    <button className="pin-toggle" onClick={() => SetShowpass(!showpass)}>
                      {showpass ? <IoEyeOffOutline /> : <IoEyeOutline />}
                    </button>
                  </div>
                </div>
              </div>

              <VirtualKeyboard />

              <div className="keypad-actions">
                <button className="cancel-action" onClick={() => setShowKeypad(false)}>Cancel</button>
                <button
                  className="submit-action"
                  onClick={validateLogin}
                  disabled={!field.emailid || !field.password}
                >
                  {signinStatus}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (viewType === 'user') {
    return (
      <div className="login-wrapper">
        {renderUserView()}
        <AuthNotify 
          message={loginMessage} 
          type={loginMessage.toLowerCase().includes('success') || loginMessage.toLowerCase().includes('welcome') ? 'success' : 'error'}
          onClose={() => setLoginMessage("")} 
        />
      </div>
    )
  }

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
            <h2>Welcome Back</h2>
            <p>Access your enterprise dashboard with secure credentials.</p>
          </motion.div>

          <div className="login-form">
            <motion.div
              className="input-group"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label>User Identity</label>
              <div className="input-with-icon">
                <HiShieldCheck className="icon" />
                <input
                  name="emailid"
                  placeholder="ID Number / Email"
                  type="text"
                  value={field.emailid}
                  onChange={getFieldInput}
                />
              </div>
            </motion.div>

            <motion.div
              className="input-group"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label>Password</label>
              <div className="input-with-icon">
                <IoFingerPrintOutline className="icon" />
                <input
                  name="password"
                  placeholder="Your password"
                  type={showpass ? "text" : "password"}
                  value={field.password}
                  onChange={getFieldInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") validateLogin()
                  }}
                />
                <button className="toggle-pass" onClick={() => SetShowpass(!showpass)}>
                  {showpass ? <IoEyeOffOutline /> : <IoEyeOutline />}
                </button>
              </div>
            </motion.div>

            <div className="form-options">
              <div className="forgot-pass" onClick={() => Navigate('/forgot-password')} style={{ cursor: 'pointer' }}>Forgot Password?</div>
            </div>

            <motion.button
              className="main-login-btn"
              onClick={validateLogin}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {signinStatus}
            </motion.button>

            <div className="form-footer-note">
              <p><b>Security Note:</b> Never share your security pin or password with anyone. We'll never ask for your private data via email or call.</p>
            </div>
            
            <div className="form-footer-note" style={{ textAlign: 'center', marginTop: '16px' }}>
              <p>Don't have an account? <span onClick={() => Navigate('/signup')} style={{ color: 'var(--ec-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>Sign up</span></p>
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
            <h1>Enterprise Compute</h1>
            <div className="visual-divider"></div>
            <p>Advanced Wage Computation & Resource Management System. Powered by The Light Rays Technologies.</p>

            <div className="visual-stats">
              <div className="stat-item">
                <span className="stat-num">99.9%</span>
                <span className="stat-label">Uptime</span>
              </div>
              <div className="stat-item">
                <span className="stat-num">AES-256</span>
                <span className="stat-label">Security</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AuthNotify 
        message={loginMessage} 
        type={loginMessage.toLowerCase().includes('success') || loginMessage.toLowerCase().includes('welcome') ? 'success' : 'error'}
        onClose={() => setLoginMessage("")} 
      />
    </div>
  );
};

export default Login;
