import { useEffect, useState } from 'react';
import './App.css';
import {Routes, Route, useNavigate } from 'react-router-dom';
import ContextProvider from './Resources/ContextProvider';
import LoadingPage from './Components/LoadingPage/LoadingPage';
import Login from './Components/Login/Login';
import Profile from './Components/Profile/Profile';
import Dashboard from './Components/Dashboard/Dashboard';
import FormPage from './Components/FormPage/FormPage';
import Notify from './Resources/Notify/Notify';
import { AnimatePresence, motion } from 'framer-motion';
import fetchServer from './Resources/ClientServerAPIConn/fetchServer'

function App() {

  // const SERVER = "http://localhost:3001"
  const SERVER = "https://enterpriseserver.vercel.app"

  const [alert, setAlert] = useState('')
  const [alertState, setAlertState] = useState(null)
  const [alertTimeout, setAlertTimeout] = useState(5000)
  const [actionMessage, setActionMessage] = useState('')
  const [action, setAction] = useState('')
  const [sessId, setSessID] = useState(null)
  const [companyRecord, setCompanyRecord] = useState(null)
  const [loginMessage, setLoginMessage] = useState('')
  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])
  const [employees, setEmployees] = useState([])
  const [customers, setCustomers] = useState([])

  const [settings, setSettings] = useState([])
  const [colSettings, setColSettings] = useState({})
  const [recoveryVal, setRecoveryVal] = useState(false)
  const [accommodationVal, setAccommodationVal] = useState(false)
  const [enableBlockVal, setEnableBlockVal] = useState(false)
  const [changingSettings, setChangingSettings] = useState(false)
  
  const [attendance, setAttendance] = useState([])
  const [sales, setSales] = useState([])
  const [accommodations, setAccommodations] = useState([])
  const [purchase, setPurchase] = useState([])
  const [expenses, setExpenses] = useState([])
  const [rentals, setRentals] = useState([])
  const [company, setCompany] = useState(null)
  const [path, setPath] = useState('')
  const pathList = ['','login','profile','dashboard', 
    'employees','departments','positions','attendance','payroll','sales','accommodations','purchase','expenses','reports','settings','test']
  const dashList = ['dashboard', 
    'employees','departments','positions','attendance','payroll','sales','accommodations','purchase','expenses','reports','settings']
  const months = [
      'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY',
      'AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'
  ]
  const monthDays = {
      'JANUARY':31,'FEBRUARY':28,'MARCH':31,'APRIL':30,'MAY':31,'JUNE':30,'JULY':31,
      'AUGUST':31,'SEPTEMBER':30,'OCTOBER':31,'NOVEMBER':30,'DECEMBER':31
  }
  const years = ['2030','2029','2028','2027','2026','2025','2024','2023',
      '2022','2021','2020']

  const Navigate = useNavigate()

  useEffect(()=>{
    var cmp_val = window.localStorage.getItem('sessn-cmp')
    const intervalId = setInterval(()=>{
      if (cmp_val){
        getSettings(cmp_val)
        getEmployees(cmp_val)
        getDepartments(cmp_val)
        getPositions(cmp_val)
        getCustomers(cmp_val)
        getAccommodations(cmp_val)
        getSales(cmp_val)
        getRentals(cmp_val)
        getPurchase(cmp_val)
        getExpenses(cmp_val)
        //getAttendance(cmp_val)
      }
    },3000)
    return () => clearInterval(intervalId);
  },[window.localStorage.getItem('sessn-cmp')])

  useEffect(()=>{
    if(settings?.length){
      const bllgnSetFilt = settings.filter((setting)=>{
        return setting.name === 'enable_block_login'
      })
      if (!changingSettings){
          setEnableBlockVal(bllgnSetFilt[0] ? bllgnSetFilt[0].enabled : false)
      }
      
      const colSetFilt = settings.filter((setting)=>{
        return setting.name === 'import_columns'
      })
      delete colSetFilt[0]?._id
      setColSettings(colSetFilt[0]?colSetFilt[0]:{})

      const recvSetFilt = settings.filter((setting)=>{
          return setting.name === 'debt_recovery'
      })
      if (!changingSettings){
          setRecoveryVal(recvSetFilt[0] ? recvSetFilt[0].enabled : false)
      }        
    }
  },[settings,changingSettings])

  useEffect(()=>{
    if (companyRecord?.status !== 'admin'){
      if (enableBlockVal){
        logout()
      }else{
        if (companyRecord?.permissions.includes('purchase')){
          getPurchase(company)
          Navigate('/purchase')
        }
        if (companyRecord?.permissions.includes('expenses')){
          getExpenses(company)
          Navigate('/expenses')
        }
        if (companyRecord?.permissions.includes('accommodations')){
          getCustomers(company)
          getAccommodations(company)
          Navigate('/accommodation')
        }
        if (companyRecord?.permissions.includes('sales')){
          getAccommodations(company)
          getSales(company)
          getRentals(company)
          Navigate('/sales')
        }
      }
    }
  },[enableBlockVal, companyRecord, company])

  const logout = async ()=>{
    const resps = await fetchServer("POST", {
      database: company,
      collection: "Profile", 
      record: companyRecord
    }, "closeSession", SERVER)          
    if (resps.err){
      console.log(resps.mess)
    }else{
      window.localStorage.setItem('lgt-mess', 'Login Access Denied. Please Request For Access!')      
      window.location.reload()
    }        
  }

  const shuffleList = (array) => {
    var currentIndex = array.length,
      randomIndex,
      temporaryValue
    while (0 !== currentIndex) {
      var randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1
      temporaryValue = array[currentIndex]
      array[currentIndex] = array[randomIndex]
      array[randomIndex] = temporaryValue
    }
    return array
  }

  const generateCode = () => {
    let number = '0123456789987654321001234567899876543210'
    var list = number.split('')
    var shuffledList = shuffleList(list)
    const code = shuffledList.slice(6, 12).join('')
    return code
  }

  const removeComma = (value)=>{
    let numberValue = value
    if (value){
      numberValue = parseInt(value.replace(/,/g, ''), 10);
    }
    return numberValue
  }

  const storePath = (path)=>{
    setPath(path)
    window.localStorage.setItem('curr-path',path)
    // if (window.localStorage.getItem('sess-id') !== null){
    //   window.localStorage.setItem('curr-path',path)
    // } else {
    //   removeSessions()
    // }
  }

  const removeSessions = (path)=>{
    window.localStorage.removeItem('sess-recg-id')
    window.localStorage.removeItem('idt-curr-usr')
    window.localStorage.removeItem('sessn-id')
    window.localStorage.removeItem('curr-path')
    window.localStorage.removeItem('slvw')
    window.localStorage.removeItem('sldtl')
    window.localStorage.removeItem('sessn-cmp')
    setSessID(null)
    Navigate("/")
    setTimeout(()=>{
      if (path !== undefined){
        Navigate("/"+path)
      }else{
        Navigate("/login")
      }
    },5000)
  }

  const loadPage = async (propVal, currPath)=>{
    Navigate('/')
    var cmp_val = window.localStorage.getItem('sessn-cmp')
    setCompany(cmp_val)
    const resp = await fetchServer("POST", {
      database: cmp_val,
      collection: "Profile", 
      sessionId: propVal 
    }, "getDocDetails", SERVER)
    // console.log(resp.record)
    if ([null, undefined].includes(resp.record)){
      removeSessions()
    }else{
      setCompanyRecord(resp.record)
      if (resp.record.status==='admin'){
        getSettings(cmp_val)
        getEmployees(cmp_val)
        getDepartments(cmp_val)
        getPositions(cmp_val)
        getCustomers(cmp_val)
        getAccommodations(cmp_val)
        getSales(cmp_val)
        getRentals(cmp_val)
        getPurchase(cmp_val)
        getExpenses(cmp_val)
        getAttendance(cmp_val)
        Navigate('/'+currPath)
      }else{
        getSettings(cmp_val)
        getEmployees(cmp_val)        
      }
    }
  }

  const getDepartments = async (company) =>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Departments", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setDepartments(resp.record)
    }
  }

  const getPositions = async (company) =>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Positions", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setPositions(resp.record)
    }
  }

  const getEmployees = async (company) =>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Employees", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setEmployees(resp.record)
    }
  }

  const getCustomers = async (company) =>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Customers", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setCustomers(resp.record)
    }
  }

  const getAttendance = async (company) =>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Attendance", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setAttendance(resp.record)
    }
  }

  const getSales = async (company) =>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Sales", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setSales(resp.record)
    }
  }

  const getAccommodations = async (company) =>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Accommodations", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setAccommodations(resp.record)
    }
  }

  const getPurchase = async (company) =>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Purchase", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setPurchase(resp.record)
    }
  }

  const getExpenses = async (company) =>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Expenses", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setExpenses(resp.record)
    }
  }

  const getRentals = async (company) =>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Rentals", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    // console.log(resp.record)
    if (resp.record){
      setRentals(resp.record)
    }
  }

  const getSettings = async (company) =>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Settings", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setSettings(resp.record)
    }
  }

  const getImage = async (body)=>{
    const resp = await fetchServer("POST", 
      body, 
      "getImgUrl", 
      SERVER
    )
    if (resp.err){
      console.log(resp.mess)
      return ''
    }else{
      return resp.url
    }
  }

  const getDate = (dateval) =>{
    const current = dateval? new Date(dateval): new Date();
    const date = `${current.getDate()}/${current.getMonth() + 1}/${current.getFullYear()}`;
    return date
  }

  useEffect(()=>{
    var currPath = window.localStorage.getItem('curr-path')
    if (currPath !== null && pathList.includes(currPath)){
      var cmp_val = window.localStorage.getItem('sessn-cmp')
      setCompany(cmp_val)
      if (!cmp_val){
        removeSessions()
      }else{
        var sid = window.localStorage.getItem('sessn-id')
        var sess = 0
        if (sid !==null ){
          sid.split('').forEach((chr)=>{
            sess += chr.codePointAt(0)
          })
          const sesn = window.localStorage.getItem('sess-recg-id')
          const session = window.localStorage.getItem('idt-curr-usr')
          if (sesn !== null && session != null){
            if (sesn / session === sess){
              loadPage(sid, currPath)
            } else {
              removeSessions()
            }
          }else{
            removeSessions()
          }
        }else{
          removeSessions(currPath)
        }
      }
    }else{
      removeSessions()
    }
  },[sessId])

  
  return (
    <>
        <ContextProvider.Provider value={{
          fetchServer,
          server:SERVER,
          loginMessage, setLoginMessage,
          generateCode,
          companyRecord, setCompanyRecord,  
          departments, setDepartments, getDepartments,
          positions, setPositions, getPositions,
          employees, setEmployees, getEmployees,
          customers, setCustomers, getCustomers,
          attendance, setAttendance, getAttendance,
          sales, setSales, getSales,
          accommodations, setAccommodations, getAccommodations,
          purchase, setPurchase, getPurchase,
          expenses, setExpenses, getExpenses,
          rentals, setRentals, getRentals,
          
          settings, setSettings, getSettings,
          colSettings, setColSettings,
          recoveryVal, setRecoveryVal,
          accommodationVal, setAccommodationVal,
          enableBlockVal, setEnableBlockVal,
          changingSettings, setChangingSettings,

          setAlert, setAlertState, setAlertTimeout,
          alert, alertState, alertTimeout, actionMessage, 
          setAction, setActionMessage,
          storePath,
          months, monthDays, years,
          path,
          dashList, 
          loadPage,
          getImage,
          getDate,
          removeComma,
          removeSessions,
          sessId,
          company
        }}>
          {!actionMessage && <Notify 
              notifyMessage = {alert}
              notifyState = {alertState}
              timeout = {alertTimeout}             
          />}
          <Routes>
            <Route path='/' element={<LoadingPage/>}></Route>
            <Route path='/login' element={<Login/>}></Route>
            <Route path='/profile' element={<Profile/>}></Route>
            <Route path='/test' element={<FormPage/>}></Route>
            <Route path='/:id' element={<Dashboard/>}></Route>
          </Routes>
        </ContextProvider.Provider>
    </>
  );
}

export default App;
