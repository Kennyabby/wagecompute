import "./Login.css";
import { useEffect, useState, useContext } from "react";
import { HiOutlineLocationMarker} from 'react-icons/hi'
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import ContextProvider from '../../Resources/ContextProvider';
import { motion, AnimatePresence } from "framer-motion";
// import bidlogo from '../../assets/images/auctionbidlogo.png'

const Login = () => {
  const { server, fetchServer, storePath,
    loginMessage, setLoginMessage, loadPage
  } = useContext(ContextProvider)
  const [field, setField] = useState({
    emailid: "",
    password: "",
  });
  const [signinStatus, setSigninStatus] = useState("SIGN IN")
  const [showpass, SetShowpass] = useState(false);
  
  const Navigate = useNavigate()

  useEffect(()=>{
    storePath('login')
  },[storePath])
  useEffect(()=>{
    if(loginMessage){
      setTimeout(()=>{
        setLoginMessage("")
      },7000)
    }
  },[loginMessage])
  useEffect(()=>{
    const logoutMessage = window.localStorage.getItem('lgt-mess')
    setLoginMessage(logoutMessage)
    window.localStorage.removeItem('lgt-mess')    
  },[])
  const validateLogin = async ()=> {
    if (field.emailid==='test' && field.password==='test'){
      Navigate('/test')
    }else{
      setSigninStatus("SIGNING IN...")
      setLoginMessage("")
      const resp = await fetchServer("POST", {
        database: "WCDatabase",
        collection: "Profiles",
        pass: field.password,
        prop: {'emailid': field.emailid}
      }, "authenticateUser", server)
  
      if (resp.err){
        setLoginMessage(resp.mess)
        setSigninStatus("SIGN IN")
        setTimeout(()=>{
          setLoginMessage("")
        },5000)
      }else{
        if (resp.mess){
          setLoginMessage(resp.mess)
          setSigninStatus("SIGN IN")
          setTimeout(()=>{
            setLoginMessage("")
          },5000)
        }else{
          var idVal = resp.id
          var company = resp.db
          var now = Date.now()
          var sess = 0
          idVal.split('').forEach((chr)=>{
            sess += chr.codePointAt(0)
          })
          window.localStorage.setItem('sessn-cmp', company)
          window.localStorage.setItem('sess-recg-id', now * sess)
          window.localStorage.setItem('idt-curr-usr', now)
          window.localStorage.setItem('sessn-id', idVal)
          setField((field)=>{
            return({...field, emailid: "", password: ""})
          })
          setSigninStatus("SIGN IN")
          loadPage(idVal, 'dashboard')
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
  return (
    <>
      <div className="login">
        <div className="loginblock">
          <div className="lgnabout">
          {/* <div 
            className="mbidlogocover"
            onClick={()=>{
              Navigate('/')
            }}
          >
            <img src={bidlogo} className="mbidlogo"/>
          </div> */}
            <div className="lgntitle">LOGIN</div>
            <div className="lgnmsg">
                Don't have an account? <label 
                  className="loginsignup"
                  onClick={(()=>{
                    // Navigate('/signup')
                  })} 
                > Create an Account</label>
              </div>
          </div>
          {loginMessage && <AnimatePresence>
              <motion.div 
                initial={{opacity:0}}
                animate={{opacity:1}}
                transition={{
                  opacity: {
                    duration: 0.5,
                    ease: 'easeIn'
                  },
                }}
                exit={{opacity: 0, transition:{opacity:{
                  duration: 0.5,
                  ease: 'easeOut',
                }}}}
                className="errmsgs"
              >
                {loginMessage}
              </motion.div>
          </AnimatePresence>}
          <div className="lgninpcv" onChange={getFieldInput}>
            <div className="inplgcv">
              <label>USER ID</label>
              <input
                name="emailid"
                placeholder="Your ID"
                type="text"
                className="lgninp"
                defaultValue={field.emailid}
                value={field.emailid}
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
                  defaultValue={field.password}
                  value={field.password}
                  onKeyDown={(e)=>{
                    if (e.key === "Enter"){
                      validateLogin()
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
            <div className="lreminder"><b>Please Note:</b> Your Account Information is <b>Private</b> to You alone. <b>Do not disclose</b> to any person or personel claiming to be from <b> The Light Rays Technologies</b>! We would never ask you for your details for any reason.</div>
          </div>
          <div className="lgnbtn">
            <div className="signin"
              onClick={validateLogin}
            >
              {signinStatus}
            </div>
          </div>
        </div>
        <div className="loginbanner">
          {/* <div 
            className="bidlogocover"
            onClick={()=>{
              Navigate('/')
            }}
          >
            <img src={bidlogo} className="bidlogo"/>
          </div> */}
        </div>
      </div>
    </>
  );
};

export default Login;
