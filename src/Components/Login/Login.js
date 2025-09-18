import "./Login.css";
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";
import { HiLogin, HiLogout, HiCalendar, HiClock } from "react-icons/hi";
import ContextProvider from "../../Resources/ContextProvider";
import { motion, AnimatePresence } from "framer-motion";
import applogo from "../../Resources/assets/images/enterprisecompute.png";

const Login = () => {
  const {
    server,
    fetchServer,
    storePath,
    loginMessage,
    setLoginMessage,
    loadPage,
  } = useContext(ContextProvider);
  const [viewType, setViewType] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [field, setField] = useState({
    emailid: "",
    password: "",
  });
  const [signinStatus, setSigninStatus] = useState("SIGN IN");
  const [showpass, SetShowpass] = useState(false);
  const [activeInput, setActiveInput] = useState(null);
  const [capsLock, setCapsLock] = useState(false);
  const [keypadValue, setKeypadValue] = useState("");

  const Navigate = useNavigate();

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle keypad input
  const handleKeyPress = (key) => {
    if (key === "caps") {
      setCapsLock(!capsLock);
      return;
    }

    if (key === "backspace") {
      setKeypadValue((prev) => prev.slice(0, -1));
      setField((prev) => ({
        ...prev,
        [activeInput]: prev[activeInput].slice(0, -1),
      }));
      return;
    }

    if (key === "space") {
      key = " ";
    } else if (key === "clear") {
      setKeypadValue("");
      setField((prev) => ({
        ...prev,
        [activeInput]: "",
      }));
      return;
    }

    setKeypadValue((prev) => prev + key);
    setField((prev) => ({
      ...prev,
      [activeInput]:
        (prev[activeInput] || "") +
        (capsLock ? key.toUpperCase() : key.toLowerCase()),
    }));
  };

  // Handle input focus
  const handleInputFocus = (fieldName) => {
    setActiveInput(fieldName);
    setKeypadValue(field[fieldName] || "");
  };

  // Format date as "Day, Month DD, YYYY"
  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time as "HH:MM:SS AM/PM"
  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    storePath("login");
  }, [storePath]);
  useEffect(() => {
    if (loginMessage) {
      setTimeout(() => {
        setLoginMessage("");
      }, 7000);
    }
  }, [loginMessage]);
  useEffect(() => {
    const logoutMessage = window.localStorage.getItem("lgt-mess");
    setLoginMessage(logoutMessage);
    window.localStorage.removeItem("lgt-mess");
    setViewType(window.localStorage.getItem("lgt-vw"));
  }, []);
  const validateLogin = async () => {
    if (field.emailid === "test" && field.password === "test") {
      Navigate("/test");
    } else {
      setSigninStatus("SIGNING IN...");
      setLoginMessage("");
      const resp = await fetchServer(
        "POST",
        {
          database: "WCDatabase",
          collection: "Profiles",
          pass: field.password,
          prop: { emailid: field.emailid },
        },
        "authenticateUser",
        server
      );

      if (resp.err) {
        setLoginMessage(resp.mess);
        setSigninStatus("SIGN IN");
        setTimeout(() => {
          setLoginMessage("");
        }, 5000);
      } else {
        if (resp.mess) {
          setLoginMessage(resp.mess);
          setSigninStatus("SIGN IN");
          setTimeout(() => {
            setLoginMessage("");
          }, 5000);
        } else {
          var idVal = resp.id;
          var company = resp.db;
          var now = Date.now();
          var sess = 0;
          idVal.split("").forEach((chr) => {
            sess += chr.codePointAt(0);
          });
          window.localStorage.setItem("sessn-cmp", company);
          window.localStorage.setItem("sess-recg-id", now * sess);
          window.localStorage.setItem("idt-curr-usr", now);
          window.localStorage.setItem("sessn-id", idVal);
          setField((field) => {
            return { ...field, emailid: "", password: "" };
          });
          setSigninStatus("SIGN IN");
          loadPage(idVal, "dashboard");
        }
      }
    }
  };

  const getFieldInput = (e) => {
    const name = e.target.getAttribute("name");
    const value = e.target.value;
    setField((field) => {
      return { ...field, [name]: value };
    });
  };
  // Handle logout
  const handleLogout = () => {
    // Clear session data
    window.localStorage.removeItem("sessn-cmp");
    window.localStorage.removeItem("sess-recg-id");
    window.localStorage.removeItem("idt-curr-usr");
    window.localStorage.removeItem("sessn-id");

    // Reload the page to reset the app state
    window.location.reload();
  };

  // Toggle keypad visibility
  const [showKeypad, setShowKeypad] = useState(false);

  // Check if user is logged in
  const isLoggedIn = window.localStorage.getItem("sessn-cmp") !== null;

  // Render user view if viewType is 'user'
  const renderUserView = () => (
    <div className="user-login-container">
      <div className="user-login-sections">
        {/* Login Section */}
        <div
          className={`user-section ${!isLoggedIn ? "clickable" : ""}`}
          onClick={!isLoggedIn ? () => setShowKeypad(true) : undefined}
        >
          <div className="section-top">
            <HiLogin className="login-icon" />
          </div>
          <div className="section-bottom">
            {isLoggedIn ? "Logged In" : "Login"}
          </div>
        </div>

        {/* Date & Time Section */}
        <div className="user-section">
          <div className="section-top">{formatDate(currentTime)}</div>
          <div className="section-bottom">{formatTime(currentTime)}</div>
        </div>

        {/* Logout Section - Only show if logged in */}
        {isLoggedIn && (
          <div className="user-section clickable" onClick={handleLogout}>
            <div className="section-top">
              <HiLogout className="logout-icon" />
            </div>
            <div className="section-bottom">LogOff</div>
          </div>
        )}
      </div>

      {/* Keypad Modal */}
      {showKeypad && (
        <div className="keypad-modal">
          <div className="keypad-content">
            <div className="keypad-header">
              <h3>Enter Credentials</h3>
              <button
                className="close-btn"
                onClick={() => setShowKeypad(false)}
              >
                ×
              </button>
            </div>

            <div className="keypad-fields">
              <div className="input-group">
                <div className="input-wrapper">
                  <input
                    type="text"
                    name="emailid"
                    value={field.emailid || ""}
                    onChange={getFieldInput}
                    onFocus={() => handleInputFocus("emailid")}
                    placeholder="Enter User ID"
                    className={`keypad-input ${
                      activeInput === "emailid" ? "active" : ""
                    }`}
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="input-wrapper">
                  <input
                    type={showpass ? "text" : "password"}
                    name="password"
                    value={field.password || ""}
                    onChange={getFieldInput}
                    onFocus={() => handleInputFocus("password")}
                    placeholder="Enter Password"
                    className={`keypad-input ${
                      activeInput === "password" ? "active" : ""
                    }`}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={(e) => {
                      e.preventDefault();
                      SetShowpass(!showpass);
                    }}
                    aria-label={showpass ? "Hide password" : "Show password"}
                  >
                    {showpass ? <IoEyeOffOutline /> : <IoEyeOutline />}
                  </button>
                </div>
              </div>
            </div>

            {/* On-screen Keypad */}
            <div className="virtual-keypad">
              <div className="keypad-row">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map(
                  (num) => (
                    <button
                      key={num}
                      className="keypad-key"
                      onClick={() => handleKeyPress(num)}
                    >
                      {num}
                    </button>
                  )
                )}
              </div>
              <div className="keypad-row">
                {["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"].map(
                  (char) => (
                    <button
                      key={char}
                      className="keypad-key"
                      onClick={() => handleKeyPress(char)}
                    >
                      {capsLock ? char.toUpperCase() : char}
                    </button>
                  )
                )}
              </div>
              <div className="keypad-row">
                {["a", "s", "d", "f", "g", "h", "j", "k", "l"].map((char) => (
                  <button
                    key={char}
                    className="keypad-key"
                    onClick={() => handleKeyPress(char)}
                  >
                    {capsLock ? char.toUpperCase() : char}
                  </button>
                ))}
              </div>
              <div className="keypad-row">
                <button
                  className="keypad-key key-wide"
                  onClick={() => handleKeyPress("caps")}
                >
                  {capsLock ? "CAPS LOCK" : "caps"}
                </button>
                {["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"].map(
                  (char) => (
                    <button
                      key={char}
                      className="keypad-key"
                      onClick={() => handleKeyPress(char)}
                    >
                      {capsLock ? char.toUpperCase() : char}
                    </button>
                  )
                )}
                <button
                  className="keypad-key key-wide"
                  onClick={() => handleKeyPress("backspace")}
                >
                  ⌫
                </button>
              </div>
              <div className="keypad-row">
                <button
                  className="keypad-key key-space"
                  onClick={() => handleKeyPress("space")}
                >
                  Space
                </button>
                <button
                  className="keypad-key key-clear"
                  onClick={() => handleKeyPress("clear")}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="keypad-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowKeypad(false)}
              >
                Cancel
              </button>
              <button
                className="login-btn"
                onClick={validateLogin}
                disabled={!field.emailid || !field.password}
              >
                {signinStatus}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render user view if viewType is 'user'
  if (viewType === "user") {
    return (
      <>
        {renderUserView()}
        {loginMessage && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                opacity: {
                  duration: 0.5,
                  ease: "easeIn",
                },
              }}
              exit={{
                opacity: 0,
                transition: {
                  opacity: {
                    duration: 0.5,
                    ease: "easeOut",
                  },
                },
              }}
              className="errmsgs"
            >
              {loginMessage}
            </motion.div>
          </AnimatePresence>
        )}
      </>
    );
  }

  // Render standard login view
  return (
    <div className="login">
      <div className="loginblock">
        <div className="lgnabout">
          <div
            className="mbidlogocover"
            onClick={() => {
              Navigate("/login");
            }}
          >
            <img src={applogo} alt="App Logo" className="mbidlogo" />
          </div>
          <div className="lgntitle">LOGIN</div>
          <div className="lgnmsg">
            Don't have an account?{" "}
            <label
              className="loginsignup"
              onClick={() => {
                // Navigate('/signup')
              }}
            >
              {" "}
              Create an Account
            </label>
          </div>
        </div>
        {loginMessage && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                opacity: {
                  duration: 0.5,
                  ease: "easeIn",
                },
              }}
              exit={{
                opacity: 0,
                transition: {
                  opacity: {
                    duration: 0.5,
                    ease: "easeOut",
                  },
                },
              }}
              className="errmsgs"
            >
              {loginMessage}
            </motion.div>
          </AnimatePresence>
        )}
        <div className="lgninpcv" onChange={getFieldInput}>
          <div className="inplgcv">
            <label>USER ID</label>
            <input
              name="emailid"
              placeholder="Your ID"
              type="text"
              className="lgninp"
              value={field.emailid}
              onChange={getFieldInput}
            />
          </div>
          <div className="inplgcv">
            <label>PASSWORD</label>
            <div className="lgnpassbx">
              <input
                name="password"
                placeholder="********"
                type={showpass ? "text" : "password"}
                className="lgnpassinp"
                value={field.password}
                onChange={getFieldInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    validateLogin();
                  }
                }}
              />
              <div
                className="shwpass"
                onClick={() => {
                  SetShowpass(!showpass);
                }}
              >
                {showpass ? <IoEyeOutline /> : <IoEyeOffOutline />}
              </div>
            </div>
          </div>
          <div className="lgnfg">Forgot Password?</div>
          <div className="lreminder">
            <b>Please Note:</b> Your Account Information is <b>Private</b> to
            You alone. <b>Do not disclose</b> to any persons or personels
            claiming to be from <b>The Light Rays Technologies</b>! We would
            never ask you for your personal details for any reason.
          </div>
        </div>
        <div className="lgnbtn">
          <div className="signin" onClick={validateLogin}>
            {signinStatus}
          </div>
        </div>
      </div>
      <div className="loginbanner">
        <div
          className="bidlogocover"
          onClick={() => {
            Navigate("/login");
          }}
        >
          <img src={applogo} alt="App Logo" className="bidlogo" />
        </div>
      </div>
    </div>
  );
};

export default Login;
