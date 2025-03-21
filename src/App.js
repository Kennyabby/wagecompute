import { useEffect, useState, useCallback } from 'react';
import './App.css';
import {Routes, Route, useNavigate } from 'react-router-dom';
import ContextProvider from './Resources/ContextProvider';
import PauseView from './Components/PauseView/PauseView';
import LoadingPage from './Components/LoadingPage/LoadingPage';
import Login from './Components/Login/Login';
import Profile from './Components/Profile/Profile';
import Dashboard from './Components/Dashboard/Dashboard';
import FormPage from './Components/FormPage/FormPage';
import Notify from './Resources/Notify/Notify';
import { read, utils, writeFileXLSX } from 'xlsx';
import { AnimatePresence, motion } from 'framer-motion';
import fetchServer from './Resources/ClientServerAPIConn/fetchServer'

function App() {
  // const SERVER = "http://localhost:3001"
  const SERVER = "https://enterpriseserver.vercel.app"

  const [viewAccess, setViewAccess] = useState(null)
  const [pauseView, setPauseView] = useState(!window.localStorage.getItem('ps-vw'))
  const [alert, setAlert] = useState('')
  const [alertState, setAlertState] = useState(null)
  const [alertTimeout, setAlertTimeout] = useState(5000)
  const [actionMessage, setActionMessage] = useState('')
  const [action, setAction] = useState('')
  const [sessId, setSessID] = useState(null)
  const [companyRecord, setCompanyRecord] = useState(null)
  const [loginMessage, setLoginMessage] = useState('')
  const [profiles, setProfiles] = useState([])
  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])
  const [employees, setEmployees] = useState([])
  const [customers, setCustomers] = useState([])
  const [reloadCount, setReloadCount] = useState(0)
  const [settings, setSettings] = useState([])
  const [colSettings, setColSettings] = useState({})
  const [recoveryVal, setRecoveryVal] = useState(false)
  const [accommodationVal, setAccommodationVal] = useState(false)
  const [enableBlockVal, setEnableBlockVal] = useState(false)
  const [editAccess, setEditAccess] = useState({})
  const [allowBacklogs, setAllowBacklogs] = useState(false)
  const [changingSettings, setChangingSettings] = useState(false)
  
  const [attendance, setAttendance] = useState([])
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [accommodations, setAccommodations] = useState([])
  const [purchase, setPurchase] = useState([])
  const [expenses, setExpenses] = useState([])
  const [rentals, setRentals] = useState([])
  const [company, setCompany] = useState(null)
  const [path, setPath] = useState('')
  const pathList = ['','login','profile','dashboard', 
    'employees','departments','positions','attendance','payroll','pos','sales','inventory','accommodations','purchase','expenses','reports','settings','test']
  const dashList = ['dashboard', 
    'employees','departments','positions','attendance','payroll', 'pos', 'sales','inventory','accommodations','purchase','expenses','reports','settings']
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

  const [hostDb, setHostDb] = useState('The_Plantain_Planet')
  const Navigate = useNavigate()

  useEffect(()=>{
    var cmp_val = window.localStorage.getItem('sessn-cmp')
    getViewAccess(hostDb)
    const intervalId = setInterval(()=>{
      if (cmp_val){
        setReloadCount((prevCount)=>{
          return prevCount + 1
        })
        getSettings(cmp_val)
        getViewAccess(hostDb)
      }
    },10000)
    return () => clearInterval(intervalId);
  },[window.localStorage.getItem('sessn-cmp')])

  useEffect(()=>{
    if(settings?.length){
      const updateThisUserState = async ()=>{
        if (companyRecord?.status!=='admin'){
          var sid = window.localStorage.getItem('sessn-id')
          const resp = await fetchServer("POST", {
            database: company,
            collection: "Profile", 
            sessionId:  sid
          }, "getDocDetails", SERVER)
          if (![null, undefined].includes(resp.record)){
            setCompanyRecord(resp.record) 
            setRecoveryVal(resp.record.enableDebtRecovery)
            setEnableBlockVal(!resp.record.enableLogin)
            setAllowBacklogs(resp.record.permissions.includes('allowBacklogs') ||
              resp.record.permissions.includes('all')
            )
            setEditAccess((editAccess)=>{
              return {...editAccess, 
                employees: resp.record.permissions.includes('edit_employees')
              }
            })
          }
        }
      }

      updateThisUserState()
      const colSetFilt = settings.filter((setting)=>{
        return setting.name === 'import_columns'
      })
      delete colSetFilt[0]?._id
      setColSettings(colSetFilt[0]?colSetFilt[0]:{})
    }
  },[settings,changingSettings])

  useEffect(()=>{
    if (companyRecord?.status !== 'admin'){
      if (enableBlockVal){
        logout()
      }else{
        if (!reloadCount){
          if (companyRecord?.permissions.includes('employees')){
            getEmployees(company)
            getDepartments(company)
            getPositions(company)
            Navigate('/employees')
          }
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
            Navigate('/accommodations')
          }
          if (companyRecord?.permissions.includes('inventory')){
            getProducts(company)
            Navigate('/inventory')
          }
          if (companyRecord?.permissions.includes('sales')){
            getAccommodations(company)
            getSales(company)
            getRentals(company)
            Navigate('/sales')
          }
        }
      }
    }
  },[enableBlockVal, reloadCount, companyRecord, company])

  useEffect(()=>{
    if (pauseView){
      if (companyRecord){
        logout()
      }
    }
  },[pauseView, companyRecord])

  useEffect(()=>{
    setPauseView(!window.localStorage.getItem('ps-vw'))    
  },[window.localStorage.getItem('ps-vw')])

  const logout = async ()=>{
    const resps = await fetchServer("POST", {
      database: company,
      collection: "Profile", 
      record: companyRecord
    }, "closeSession", SERVER)          
    if (resps.err){
      console.log(resps.mess)
    }else{
      window.localStorage.removeItem('ps-vw')
      window.localStorage.removeItem('acc-vw')
      if (!pauseView){
        window.localStorage.setItem('lgt-mess', 'Login Access Denied. Please Request For Access!')      
      }
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

  const generateSeries = (pre, array, id)=> {

    let max = 0
    array.forEach((obj=>{
      let idVal = Number(obj[id].slice(pre.split('').length,))
      if (idVal > max){
        max = idVal
      }
    }))
    let numPart = max + 1;
    let newNumber = pre + numPart.toString().padStart(5, "0");

    return newNumber;

  }

  const exportFile = useCallback((data, fileName) => {
      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Data");
      writeFileXLSX(wb, `${fileName}.xlsx`);
  }, []);

  const importFile = async ({ event, fields, pivot, start }) => {
    return new Promise((resolve, reject) => {
      const file = event.target.files[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }
  
      const reader = new FileReader();
  
      const columns = Object.keys(fields);
  
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = read(data, { type: "array" });
  
          const sheetNames = workbook.SheetNames;
          const firstSheetName = sheetNames[pivot];
          const worksheet = workbook.Sheets[firstSheetName];
  
          const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
  
          const knownColumnName = columns[0]; // First column name as reference
          let headerRowIndex = null;
  
          // Find the header row
          for (let i = 0; i < jsonData.length; i++) {
            if (jsonData[i].includes(knownColumnName)) {
              headerRowIndex = i;
              break;
            }
          }
          
          let headerfound = true
          if (headerRowIndex === null) {
            headerfound = false
            headerRowIndex = 0
          }
  
          // Extract headers and rows starting from the header row
          const headers = jsonData[headerRowIndex];
          columns.forEach((column) => {
            fields[column] = "";
          });
          let startIndex = headerRowIndex + 2
          let rows = jsonData.slice(headerRowIndex + 1);
          if (start && start > (headerRowIndex + 2)){
            rows = jsonData.slice(start - 1)
            startIndex = start
          }
          // Map rows to objects
          const result = rows.map((row) => {
            let obj = {};
            row.forEach((cell, index) => {
              obj[headers[index]] = cell;
            });
            return obj;
          });
  
          resolve({
            headerfound,
            headers,
            startIndex,
            sheetNames,
            result,
          });
        } catch (error) {
          reject(error);
        }
      };
  
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const storePath = (path)=>{
    setPath(path)
    window.localStorage.setItem('curr-path',path)
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
    if ([null, undefined].includes(resp.record)){ 
      removeSessions()
    }else{
      setCompanyRecord(resp.record)
      setAllowBacklogs(resp.record.permissions.includes('allowBacklogs') ||
          resp.record.permissions.includes('all')
        )
      if (resp.record.status==='admin'){
        getSettings(cmp_val)
        fetchProfiles(cmp_val)
        getEmployees(cmp_val)
        getDepartments(cmp_val)
        getPositions(cmp_val)
        getCustomers(cmp_val)
        getAccommodations(cmp_val)
        getSales(cmp_val)
        getProducts(cmp_val)
        getRentals(cmp_val)
        getPurchase(cmp_val)
        getExpenses(cmp_val)
        getAttendance(cmp_val)
        Navigate('/'+currPath)
      }else{
        setEditAccess((editAccess)=>{
          return {...editAccess, 
            employees: resp.record.permissions.includes('edit_employees')
          }
        })
        setRecoveryVal(resp.record.enableDebtRecovery)
        setEnableBlockVal(!resp.record.enableLogin)        
        getSettings(cmp_val)
        getEmployees(cmp_val)        
      }
    }
  }
  const getViewAccess = async (company) => {
    if (!window.localStorage.getItem('acc-vw')){
      const resps = await fetchServer("POST", {
          database: company,
          collection: "Profile",
          prop: {'name': 'activation'}
      }, "getDocsDetails", SERVER)
      if (resps.err) {
          console.log(resps.mess)
      } else {
          setViewAccess(resps.record[0].pauseDB)
          if (resps.record[0].pauseDB){
            window.localStorage.removeItem('ps-vw')
          }else{
            window.localStorage.setItem('ps-vw', 'true')
          }
          setPauseView(resps.record[0].pauseDB)
      }
    }
  }
  
  const fetchProfiles = async (company) => {
    const resps = await fetchServer("POST", {
        database: company,
        collection: "Profile",
        prop: {'verified': true}
    }, "getDocsDetails", SERVER)
    if (resps.err) {
        console.log(resps.mess)
    } else {
        setProfiles(resps.record)
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

  const getProducts = async (company) =>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Products", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setProducts(resp.record)
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
          server:SERVER, viewAccess,
          pauseView, setPauseView,
          loginMessage, setLoginMessage,
          generateCode, generateSeries, 
          exportFile, importFile,
          companyRecord, setCompanyRecord,  
          profiles, setProfiles, fetchProfiles,
          departments, setDepartments, getDepartments,
          positions, setPositions, getPositions,
          employees, setEmployees, getEmployees,
          customers, setCustomers, getCustomers,
          attendance, setAttendance, getAttendance,
          sales, setSales, getSales,
          products, setProducts, getProducts,
          accommodations, setAccommodations, getAccommodations,
          purchase, setPurchase, getPurchase,
          expenses, setExpenses, getExpenses,
          rentals, setRentals, getRentals,
          
          settings, setSettings, getSettings,
          colSettings, setColSettings,
          recoveryVal, setRecoveryVal,
          accommodationVal, setAccommodationVal,
          allowBacklogs, setAllowBacklogs,
          editAccess, setEditAccess,
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
          {!pauseView ? <Routes>
            <Route path='/' element={<LoadingPage/>}></Route>
            <Route path='/login' element={<Login/>}></Route>
            <Route path='/profile' element={<Profile/>}></Route>
            <Route path='/test' element={<FormPage/>}></Route>
            <Route path='/:id' element={<Dashboard/>}></Route>
          </Routes> :
          <PauseView/>
          }
        </ContextProvider.Provider>
    </>
  );
}

export default App;
