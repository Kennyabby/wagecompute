import { useEffect, useState, useCallback } from 'react';
import './App.css';
import {Routes, Route, useNavigate } from 'react-router-dom';
import ContextProvider from './Resources/ContextProvider';
import PauseView from './Components/PauseView/PauseView';
import LoadingPage from './Components/LoadingPage/LoadingPage';
import LandingPage from './Components/LandingPage/LandingPage';
import Login from './Components/Login/Login';
import Profile from './Components/Profile/Profile';
import Dashboard from './Components/Dashboard/Dashboard';
import DashView from './Components/DashView/DashView';
import FormPage from './Components/FormPage/FormPage';
import Notify from './Resources/Notify/Notify';
import { read, utils, writeFileXLSX } from 'xlsx';
import { AnimatePresence, motion } from 'framer-motion';
import fetchServer from './Resources/ClientServerAPIConn/fetchServer'

// const SERVER = "http://localhost:3001"
const SERVER = "https://enterpriseserver.vercel.app"
// const SERVER = "https://hserver.techpros.com.ng"
// const SERVER = "http://3.251.76.94"

function App() {
  
  const [viewAccess, setViewAccess] = useState(null)
  const [pauseView, setPauseView] = useState(!window.localStorage.getItem('ps-vw'))

  const [saleNextFrom, setSaleNextFrom] = useState(null)
  const [saleFrom, setSaleFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10))
  const [saleTo, setSaleTo] = useState(new Date(Date.now()).toISOString().slice(0, 10))

  const [isLive, setIsLive] = useState(false)
  const [liveErrorMessages, setLiveErrorMessages] = useState('Loading...')
  const [sessions, setSessions] = useState(null);
  const [tables, setTables] = useState([]);
  const [posOrders, setPosOrders] = useState([]);
  const [deliverySessions, setDeliverySessions] = useState([])
  const [salesSessions, setSalesSessions] = useState([])

  const [approvals, setApprovals] = useState([])
  const [approvalStatus, setApprovalStatus] = useState(false)
  const [approvalMessage, setApprovalMessage] = useState('')
  const [curApproval, setCurApproval] = useState(null)
  const [showApprovalBox, setShowApprovalBox] = useState(false)
  
  const [paymentReceipts, setPaymentReceipts] = useState([])
  const [alert, setAlert] = useState('')
  const [alertState, setAlertState] = useState(null)
  const [alertTimeout, setAlertTimeout] = useState(100000)
  const [actionMessage, setActionMessage] = useState('')
  const [action, setAction] = useState('')
  
  const [sessId, setSessID] = useState(null)
  const [companyRecord, setCompanyRecord] = useState(null)
  const [loginMessage, setLoginMessage] = useState('')
  const [profiles, setProfiles] = useState([])
  const [DBProfiles, setDBProfiles] = useState([])
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
  const [posWrhAccess, setPosWrhAccess] = useState({})
  const [deliveryWrhAccess, setDeliveryWrhAccess] = useState({})
  const [allowBacklogs, setAllowBacklogs] = useState(false)
  const [changingSettings, setChangingSettings] = useState(false)
  
  const [chartOfAccounts, setChartOfAccounts] = useState([])
  const [attendance, setAttendance] = useState([])
  const [sales, setSales] = useState([])
  const [salesLoadCount, setSalesLoadCount] = useState(0)
  const [nextSales, setNextSales] = useState(null)
  const [allSessions, setAllSessions] = useState([])
  const [products, setProducts] = useState([])
  const [accommodations, setAccommodations] = useState([])
  const [purchase, setPurchase] = useState([])
  const [expenses, setExpenses] = useState([])
  const [rentals, setRentals] = useState([])
  const [company, setCompany] = useState(null)
  const [path, setPath] = useState('')
  const pathList = ['','landing-page','login','profile','dashboard', 
    'employees','departments','positions','attendance','payroll','pos','delivery','sales','inventory','accommodations','purchase','expenses','reports','settings','test']
  const dashList = ['dashboard', 
    'employees','departments','positions','attendance','payroll', 'pos', 'delivery', 'sales','inventory','accommodations','purchase','expenses','reports','settings']
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
  const genDb = 'WCDatabase'
  const Navigate = useNavigate()

  useEffect(()=>{
    var cmp_val = window.localStorage.getItem('sessn-cmp')
    getViewAccess(hostDb)
    getSettings(cmp_val)
    getChartOfAccounts(cmp_val)
    const intervalId = setInterval(()=>{
      if (cmp_val){
        setReloadCount((prevCount)=>{
          return prevCount + 1
        })
        getSettings(cmp_val)
        getChartOfAccounts(cmp_val)
        getViewAccess(hostDb)
      }
    },50000)
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
                employees: (resp.record.permissions.includes('edit_employees') || resp.record.permissions.includes('all'))
              }
            })
            setPosWrhAccess((posWrhAccess)=>{
              return {...posWrhAccess, 
                ['open bar1']: (resp.record.permissions.includes('pos_open bar1') || resp.record.permissions.includes('all')),
                ['open bar2']: (resp.record.permissions.includes('pos_open bar2') || resp.record.permissions.includes('all')),
                ['vip']: (resp.record.permissions.includes('pos_vip') || resp.record.permissions.includes('all')),
                ['kitchen']: (resp.record.permissions.includes('pos_kitchen') || resp.record.permissions.includes('all')),
              }
            })
            setDeliveryWrhAccess((deliveryWrhAccess)=>{
              return {...deliveryWrhAccess, 
                ['open bar1']: (resp.record.permissions.includes('delivery_open bar1') || resp.record.permissions.includes('all')),
                ['open bar2']: (resp.record.permissions.includes('delivery_open bar2') || resp.record.permissions.includes('all')),
                ['vip']: (resp.record.permissions.includes('delivery_vip') || resp.record.permissions.includes('all')),
                ['kitchen']: (resp.record.permissions.includes('delivery_kitchen') || resp.record.permissions.includes('all')),
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
            window.localStorage.removeItem('lgt-vw')
            Navigate('/employees')
          }
          if (companyRecord?.permissions.includes('attendance')){
            getAttendance(company)
            window.localStorage.removeItem('lgt-vw')
            Navigate('/attendance')
          }
          if (companyRecord?.permissions.includes('purchase')){
            getPurchase(company)
            window.localStorage.removeItem('lgt-vw')
            Navigate('/purchase')
          }
          if (companyRecord?.permissions.includes('expenses')){
            getExpenses(company)
            window.localStorage.removeItem('lgt-vw')
            Navigate('/expenses')
          }
          if (companyRecord?.permissions.includes('inventory') ||
            companyRecord?.permissions.includes('pos') ||
            companyRecord?.permissions.includes('delivery')
          ){
            getProducts(company)
            Navigate('/inventory')
          }
          if (companyRecord?.permissions.includes('delivery')){
            fetchSessions(company , "delivery")
            fetchTables(company)
            Navigate('/delivery')
          }
          if (companyRecord?.permissions.includes('pos')){
            fetchSessions(company , "sales")
            fetchTables(company)
            Navigate('/pos')
          }  
          if (companyRecord?.permissions.includes('accommodations')){
            getCustomers(company)
            getAccommodations(company)
            Navigate('/accommodations')
          }        
          if (companyRecord?.permissions.includes('sales')){
            getAccommodations(company)
            getSales(company)
            fetchSessions(company , "sales", companyRecord)
            fetchSessions(company , "delivery", companyRecord)
            // getSales(company, 'first', saleFrom, saleTo, 10)
            getRentals(company)
            window.localStorage.removeItem('lgt-vw')
            Navigate('/sales')
          }
        }
      }
    }
  },[enableBlockVal, reloadCount, companyRecord, company])

  useEffect(()=>{
    obtainPaymentReceipts()
  },[posOrders, sales, accommodations])

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
      setAlertState('error')
      setAlert(resps.mess)
      setAlertTimeout(3000)
    }else{
      window.localStorage.removeItem('ps-vw')
      window.localStorage.removeItem('acc-vw')
      if (!pauseView){
        window.localStorage.setItem('lgt-mess', 'Login Access Denied. Please Request For Access!')      
      }
      window.location.reload()
    }        
  }

  const getSessionEnd = (sessionStart) => {
      const closingHour = 8
      const sessionStartDate = new Date(sessionStart);
      const sessionEndDate = new Date(sessionStartDate);

      // Set the session end time to 8am of the same day
      sessionEndDate.setHours(closingHour, 0, 0, 0);

      // If the session started after 8am, set the end time to 8am of the next day
      if (sessionStartDate.getTime() >= sessionEndDate.getTime()) {
          sessionEndDate.setDate(sessionStartDate.getDate() + 1);
      }

      return sessionEndDate.getTime();
  };

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

  const generateCode = (length) => {
    let number = '0123456789987654321001234567899876543210'
    if (length && length<=number.length){
      var list = number.split('')
      var shuffledList = shuffleList(list)
      const code = shuffledList.slice(0, length).join('')
      return code
    }else{
      return null
    }
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

  const postApprovalUpdate = async (company, module, section, curApproval)=>{
    setAlertState('info')
    setAlert('Updating Approval...')
    setAlertTimeout(100000)
    const approvalState = {
        approved: approvalStatus,
        message: approvalMessage,
        createdAt: curApproval.createdAt,
        lastUpdatedBy: companyRecord?.emailid
    }
    if (approvalStatus){
        approvalState.approvedBy = companyRecord?.emailid || companyRecord?.emailid
    }
    const resp = await updateApproval(company, module, section, {                                                                
        ...approvalState
    })
    if (resp.completed){
        getApprovals(company)
        setAlertState('success')
        setAlert('Approval Updated!')
        setAlertTimeout(5000)
        setApprovalStatus(false)
        setApprovalMessage('')
        setShowApprovalBox(false)
        setCurApproval({...curApproval, 
            approved: approvalStatus,
            message: approvalMessage,
            createdAt: curApproval.createdAt,
            lastUpdatedBy: companyRecord?.emailid
        })
    }else{
        setAlertState('error')
        setAlert(resp.mess)
        setAlertTimeout(5000)
        setApprovalStatus(false)
        setApprovalMessage('')
    }
  }

  const runApprovalWorkFlow = async(postingDate, curApproval, module, section, data, runApproval, link)=>{
      
    const executePostAction = ()=>{
        runApproval()            
        if (curApproval?.createdAt){
            removeApproval(company, module, section, {                        
                createdAt: curApproval.createdAt,
                postingDate: curApproval.postingDate                                                 
            })
        }
    }

    const executeApprovalAction = async (previous)=>{
        if (companyRecord?.permissions.includes(section) || companyRecord?.status==='admin'){
            executePostAction()
        }else{
            setAlertState('info')
            setAlert('Sending Approval Request...')
            setAlertTimeout(100000)
            const approvalData = {
                data: data,
                createdAt: previous?.createdAt ? previous.createdAt: new Date().getTime(),
                postingDate: postingDate,   
                isApproval: true,  
                handlerId: companyRecord?.emailid,  
                messages: previous?.createdAt ? [
                    ...previous.messages, 
                    {message: previous.message, createdAt: new Date().getTime()}
                ] : []                        
            }
            if (link){
                approvalData.link = link
            }
            const resp = await requestApproval(company, module, section, approvalData)
            if (resp.completed){
                if(previous?.createdAt){
                    removeApproval(company, module, section, {                        
                        createdAt: previous.createdAt,
                        postingDate: previous.postingDate                                                 
                    })
                }
                setAlertState('success')
                setAlert('Approval Request Sent Successfully!')
                setAlertTimeout(5000)
                getApprovals(company)
                setCurApproval(approvalData)
            }else{
                setAlertState('error')
                setAlert(resp.mess)
                setAlertTimeout(5000)
            }
        }
    }

    if (![null, undefined].includes(curApproval)){
        if (curApproval.approved){
            executePostAction()
        }else{
            if (!curApproval.message){
                if (companyRecord?.permissions.includes(section) || companyRecord?.status==='admin'){
                   setShowApprovalBox(true)
                }else{
                    setAlertState('info')
                    setAlert('Already sent for approval. Please wait for response!')
                    setAlertTimeout(5000)
                }
            }else{
                executeApprovalAction(curApproval)
            }
        }
    }else{
        executeApprovalAction()
    }
  }

  const requestApproval = async (company, module, section, data)=>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Approvals", 
      update: {
        ...data,
        module: module,
        section: section
      } 
    }, "createDoc", SERVER)
    if (!resp.err){
      return {completed: resp.isDelivered, mess: resp.mess}
    }else{
      return {completed: false, mess: resp.mess}
    }
  }

  const getApprovals = async (company)=>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Approvals", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (Array.isArray(resp.record)){
      setApprovals(resp.record)
    }
  }

  const updateApproval = async (company, module, section, update)=>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Approvals", 
      prop: [{module: module, section: section, createdAt: update.createdAt}, {...update}] 
    }, "updateOneDoc", SERVER)
    if (!resp.err){
      return {completed: resp.updated, mess: resp.mess}
    }else{
      return {completed: false, mess: resp.mess}
    }
  }

  const removeApproval = async (company, module, section, update)=>{
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Approvals", 
      update: {        
        module: module,
        section: section,
        createdAt: update.createdAt,
        postingDate: update.postingDate
      } 
    }, "removeDoc", SERVER)
    if (!resp.err){
      getApprovals(company)
      return {completed: resp.isRemoved, mess: resp.mess}
    }else{
      return {completed: false, mess: resp.mess}
    }
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

  const fetchSessions = async (company, type, companyRecord) => {
      const sessionsResponse = await fetchServer("POST", {
          database: company,
          collection: "POSSessions",
          prop: {type:type}
      }, "getDocsDetails", SERVER);

      if(!sessionsResponse.err){
          if (sessionsResponse.mess){
              setIsLive(false)
              // setLiveErrorMessages(sessionsResponse.mess)
          }else{
              const thisSessions = sessionsResponse.record.filter((session)=>{
                  return session.employee_id === companyRecord?.emailid
              })
              // setSessions(thisSessions)
              if (type === 'sales'){
                  setSalesSessions(thisSessions)
              }
              if (type === 'delivery'){
                  setDeliverySessions(thisSessions)
              }
              setAllSessions(sessionsResponse.record)
          }
      }else{
          if (sessionsResponse.mess !== 'Request aborted'){
              setIsLive(false)
              setLiveErrorMessages('Slow Network. Check Connection')
          }
      }
  }

  const fetchTables = async (company) => {
      const tablesResponse = await fetchServer("POST", {
          database: company,
          collection: "Tables"
      }, "getDocsDetails", SERVER);
      if (!tablesResponse.err){
          if (!tablesResponse.mess){
              setTables(tablesResponse.record)  
          }
      }else{
          if (tablesResponse.mess !== 'Request aborted'){
              setIsLive(false)
              setLiveErrorMessages('Slow Network. Check Connection')
          }
      }
  }

  const removeSessions = (path)=>{
    window.localStorage.removeItem('sess-recg-id')
    window.localStorage.removeItem('idt-curr-usr')
    window.localStorage.removeItem('sessn-id')
    window.localStorage.removeItem('curr-path')
    window.localStorage.removeItem('slvw')
    window.localStorage.removeItem('sldtl')
    window.localStorage.removeItem('sessn-cmp') 
    window.localStorage.removeItem('pos-wrh')
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
      window.localStorage.setItem('lgt-vw', 'user')
      setCompanyRecord(resp.record)
      setAllowBacklogs(resp.record.permissions.includes('allowBacklogs') ||
          resp.record.permissions.includes('all')
      )
      setPosWrhAccess((posWrhAccess)=>{
        return {...posWrhAccess, 
          ['open bar1']: (resp.record.permissions.includes('pos_open bar1') || resp.record.permissions.includes('all')),
          ['open bar2']: (resp.record.permissions.includes('pos_open bar2') || resp.record.permissions.includes('all')),
          ['vip']: (resp.record.permissions.includes('pos_vip') || resp.record.permissions.includes('all')),
          ['kitchen']: (resp.record.permissions.includes('pos_kitchen') || resp.record.permissions.includes('all')),
        }
      })
      setDeliveryWrhAccess((deliveryWrhAccess)=>{
        return {...deliveryWrhAccess, 
          ['open bar1']: (resp.record.permissions.includes('delivery_open bar1') || resp.record.permissions.includes('all')),
          ['open bar2']: (resp.record.permissions.includes('delivery_open bar2') || resp.record.permissions.includes('all')),
          ['vip']: (resp.record.permissions.includes('delivery_vip') || resp.record.permissions.includes('all')),
          ['kitchen']: (resp.record.permissions.includes('delivery_kitchen') || resp.record.permissions.includes('all')),
        }
      })
      getChartOfAccounts(cmp_val)
      getApprovals(cmp_val)
      if (resp.record.status==='admin'){        
        window.localStorage.removeItem('lgt-vw')
        getSettings(cmp_val)
        fetchProfiles(cmp_val)
        getSales(cmp_val)
        getPosOrders(cmp_val)
        getAccommodations(cmp_val)
        getEmployees(cmp_val)
        getDepartments(cmp_val)
        getPositions(cmp_val)
        getCustomers(cmp_val)
        // getSales(cmp_val, 'first', saleFrom, saleTo, 10)
        fetchTables(cmp_val)
        fetchSessions(cmp_val , "delivery", resp.record)
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
        getAccommodations(cmp_val)
        getPosOrders(cmp_val)
        getSales(cmp_val)
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
      }, "getActivationDetails", SERVER)
      if (resps.err) {
          console.log(resps.mess)
          setViewAccess('405')
      } else {
          if (!resps.mess){
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
  }

  const obtainPaymentReceipts = ()=>{
    const paymentPoints = ['moniepoint1', 'moniepoint2', 'moniepoint3', 'moniepoint4']    
    const recoveryReceipts = []
    const accommodationReceipts = []
    const posOrderReceipts = []
    const dateBoundary = new Date('2025-07-15').toISOString().slice(0,10)

    let paymentReceipts = []
    if (sales){
      sales.forEach((sale)=>{
        (sale.recoveryList || []).forEach((recovery)=>{
          if (paymentPoints.includes(recovery.recoveryPoint)){
            let dateVar = new Date(recovery.recoveryDate).toISOString().slice(0,10) 
            if (dateVar >= dateBoundary){
              recoveryReceipts.push({
                paymentModule: 'recovery',
                paymentPoint: recovery.recoveryPoint,
                paymentAmount: Number(recovery.recoveryAmount),
                paymentReceipt: Number(recovery.recoveryReceipt),
                paymentFor: `For ${sale.postingDate} Debt`,
                paymentDate: recovery.recoveryDate,
                paymentHandler: recovery.recoveryEmployeeId,
                paymentModuleRef: sale.createdAt
              })
            }
          }
        })
      })
    }
    if (accommodations){
      accommodations.forEach((acc)=>{
        let dateVar = new Date(acc.postingDate).toISOString().slice(0,10)
        if (paymentPoints.includes(acc.payPoint)){
          if (dateVar >= dateBoundary){
            accommodationReceipts.push({
              paymentModule: 'accommodation',
              paymentPoint: acc.payPoint,
              paymentAmount: Number(acc.paymentAmount),
              paymentReceipt: Number(acc.paymentReceipt),
              paymentFor: `For Room ${acc.roomNo}`,
              paymentDate: acc.postingDate,
              paymentHandler: acc.employeeId,
              paymentModuleRef: acc.createdAt
            })
          }
        }
      })
    }

    if (posOrders){
      posOrders.forEach((order)=>{
        if (order.salesPosts){
          Object.keys(order.salesPosts).forEach((payPoint)=>{
            if (paymentPoints.includes(payPoint)){
              let dateVar = new Date(order.createdAt).toISOString().split('T')[0]
              if(dateVar >= dateBoundary) {
                const location = order.salesPosts[payPoint]
                const receiptNo= order.receipts[payPoint]
                const amount = Number(order[payPoint])
                posOrderReceipts.push({
                  paymentModule: 'POS Order',
                  paymentPoint: payPoint,
                  paymentAmount: amount,
                  paymentReceipt: Number(receiptNo),
                  paymentFor: `(${location})-${order.orderNumber} Ordered from ${order.wrh}`,
                  paymentDate: dateVar,
                  paymentHandler: order.handlerId,
                  paymentModuleRef: order.createdAt
                })
              }
            }
          })
        } 
      })
    }

    paymentReceipts = [
      ...recoveryReceipts, 
      ...accommodationReceipts, 
      ...posOrderReceipts
    ]
    setPaymentReceipts(paymentReceipts)
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
  
  const fetchDBProfiles = async (company) => {
    const resps = await fetchServer("POST", {
        database: genDb,
        collection: "Profiles",
        prop: {'db': company}
    }, "getDocsDetails", SERVER)
    if (resps.err) {
        console.log(resps.mess)
    } else {
        setDBProfiles(resps.record)
    }
  }

  const getChartOfAccounts = async (company) => {
    const resp = await fetchServer("POST", {
      database: company,
      collection: "ChartOfAccounts", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setChartOfAccounts(resp.record)
    }
  }

  const getAllSessions = async (company) => {
    const resp = await fetchServer("POST", {
      database: company,
      collection: "POSSessions", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setAllSessions(resp.record)
    }
  }
  const getPosOrders = async (company) => {
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Orders",
      prop: {}
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setPosOrders(resp.record)
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

  const getSales = async (company, type=null, fromDate=null, toDate=null, limit=null) =>{
    
    var defaultEndPoint = 'getDocsDetails'
    
    const body = {
      database: company,
      collection: "Sales", 
      prop: {} 
    }

    const salesFromDate = new Date(fromDate)
    const salesToDate = new Date(toDate)
    if (type !== null){
      if (fromDate){
        body.fromDate = new Date(fromDate).getTime()
      }
      if (toDate){
        body.toDate = new Date(toDate).getTime()
      }
      body.limit = limit
      if (type === 'first' || nextSales === null){
        salesFromDate.setDate(salesFromDate.getDate() - 1)
        salesToDate.setDate(salesToDate.getDate() + 3)
        body.fromDate = salesFromDate.getTime()
        body.toDate = salesToDate.getTime()
        defaultEndPoint = 'getDocsDetailsFirst'
      }else{
        defaultEndPoint = 'getDocsDetailsNext'
      }
    }

    // console.log('sales Load Count is:', salesLoadCount)
    if (!salesLoadCount){
      setSalesLoadCount((prevCount)=>{
        return prevCount + 1
      })
      // console.log('fetching sales...')
      const resp = await fetchServer("POST", {
       ...body
      }, defaultEndPoint, SERVER)
      if (resp.record){
        setSalesLoadCount(0)
        // console.log('got sales record response. Resetting Sales Load Count!')
        // console.log('sales fetch type is :', type)
        if (!type){
          setSales(resp.record)
        }else{
          const salesResp = resp.record
          // console.log('checking if response is empty:', salesResp)
          if (salesResp.length){
            // console.log('response is not empty')
            // console.log(salesResp[salesResp.length -1].createdAt, nextSales[nextSales.length -1]?.createdAt)
            // console.log('conditioning with this variables->','nextSales:', nextSales, 'salesResp:', salesResp)
            if (nextSales === null || salesResp[salesResp.length -1].createdAt !== nextSales[nextSales.length -1]?.createdAt){
              // console.log('setting next sales')
              setNextSales(resp.record)
              // console.log(resp.record)
              if (type==='next' && nextSales !== null){
                // console.log('type is next, so appending to sales Record!')
                setSales((sales)=>{
                  return [...sales, ...resp.record]
                })
              }else{
                // console.log('type is first, so resetting sales Record to this!')
                setSales(resp.record)
              } 
            }else{
              // console.log('sales record is same as next sales record. Not setting next sales!')
              // console.log('nextSales:', nextSales[nextSales.length -1].createdAt, 'salesResp:', salesResp[salesResp.length -1].createdAt)
              setNextSales(null)
            }
          }
        }
      }
      if (resp.err){
        setSalesLoadCount(0)
      }
    }else{
      // console.log('not fetching sales. Another sales fetch is in progress!')
    }
  }

  // const getProducts = async (company) =>{
  //   const resp = await fetchServer("POST", {
  //     database: company,
  //     collection: "Products", 
  //     prop: {} 
  //   }, "getDocsDetails", SERVER)

  //   if (resp.record){
  //     if (resp.record?.length){
  //       setProducts(resp.record)
  //     }
  //   }
  // }

  const getProducts = async (company) => {
    const knownFields = [
      "_id", "i_d", "name", "salesPrice", "costPrice", "category",
      "purchaseVat", "salesVat", "salesUom", "purchaseUom",
      "buyTo", "createdAt", "type", "vipPrice"
    ];

    // Build a projection object like { _id: 1, i_d: 1, name: 1, ... }
    const projection = Object.fromEntries(knownFields.map(key => [key, 1]));

    const resp = await fetchServer("POST", {
      database: company,
      collection: "Products",
      prop: {},
      project: projection
    }, "getDocsDetails", SERVER);

    if (resp.record && resp.record.length) {
      setProducts(resp.record);
      getProductsWithStock(company, resp.record)
    }
  };

  const getProductsWithStock = async (company, products) => {
    // 1. Fetch aggregated stock and cost from InventoryTransactions
    const stockResp = await fetchServer(
      "POST",
      {
        database: company,
        collection: "InventoryTransactions",
        prop: [
          {
            $group: {
              _id: {
                productId: "$productId",
                location: "$location"
              },
              totalStock: {
                $sum: {
                  $cond: [
                    { $isNumber: "$baseQuantity" },
                    "$baseQuantity",
                    { $toDouble: "$baseQuantity" }
                  ]
                }
              },
              totalCost: {
                $sum: {
                  $cond: [
                    { $isNumber: "$totalCost" },
                    "$totalCost",
                    { $toDouble: "$totalCost" }
                  ]
                }
              },
              totalSales: {
                $sum: {
                  $cond: [
                    { $isNumber: "$totalSales" },
                    "$totalSales",
                    { $toDouble: "$totalSales" }
                  ]
                }
              }
            }
          }
        ]
      },
      "aggregateDocs",
      SERVER
    );
    if (stockResp.record && stockResp.record.length) {
      const stockData = stockResp.record || [];
      // 2. Organize stock by productId and location
      const stockMap = {}; // { productId: { locationA: { qty, cost }, ... } }
      
      stockData.forEach(item => {
        const { productId, location } = item._id;
        if (!stockMap[productId]) stockMap[productId] = {};
        stockMap[productId][location] = {
          quantity: item.totalStock,
          cost: item.totalCost,
          sales: item.totalSales
        };
      });
      
      // 3. Enrich products with location-wise stock and cost
      const enrichedProducts = products.map(product => {
        const stockInfo = stockMap[product.i_d] || {};

        // Sum up total stock and total cost across all locations
        const totalStock = Object.values(stockInfo).reduce((sum, loc) => sum + Number(loc.quantity), 0);
        const totalCost = Object.values(stockInfo).reduce((sum, loc) => sum + Number(loc.cost), 0);
        const totalSales = Object.values(stockInfo).reduce((sum, loc) => sum + Number(loc.sales), 0);

        return {
          ...product,
          locationStock: stockInfo, // now includes both quantity and cost
          totalStock,
          totalCost,
          totalSales
        };
      });

      // 4. Set enriched products
      setProducts(enrichedProducts);
      return enrichedProducts;
    }       
    return products;
  };

  /**
   * Get a comprehensive stock report with detailed movement information
   * @param {string} company - Company database name
   * @param {Array} products - Array of product objects
   * @param {Object} dateRange - Object containing startDate and endDate
   * @returns {Promise<Array>} - Array of products with detailed stock information
   */
  const getProductsStockReport = async (company, products, dateRange = {}) => {
    try {
      // Set default date range if not provided (current month to date)
      const startDate = new Date(dateRange.startDate) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = new Date(dateRange.endDate) || new Date();
      const location = dateRange.location || 'all';
      const transactionType = dateRange.transactionType || 'all';
      const productId = dateRange.productId || null;
      // console.log(startDate, endDate)
      // Format dates for MongoDB query
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // 1. Get opening stock (stock before start date)
      const openingStockResp = await fetchServer(
        "POST",
        {
          database: company,
          collection: "InventoryTransactions",
          prop: [
            {
              $match: {
                postingDate: { $lt: formattedStartDate },
                ...(location !== 'all' && { location }),
                ...(productId && { productId }),
                ...(transactionType !== 'all' && { 
                  $or: [
                    { entryType: transactionType },
                    { documentType: transactionType }
                  ].filter(Boolean)
                })
              }
            },
            {
              $group: {
                _id: {
                  productId: "$productId",
                  location: "$location"
                },
                openingQuantity: {
                  $sum: {
                    $cond: [
                      { $isNumber: "$baseQuantity" },
                      "$baseQuantity",
                      { $toDouble: "$baseQuantity" }
                    ]
                  }
                },
                // Purchases
                purchasedQty: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ["$entryType", "Purchase"] },
                        { $gt: ["$baseQuantity", 0] }
                      ]},
                      { $cond: [
                        { $isNumber: "$baseQuantity" },
                        "$baseQuantity",
                        { $toDouble: "$baseQuantity" }
                      ]},
                      0
                    ]
                  }
                },
                purchaseCost: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ["$entryType", "Purchase"] },
                        { $gte: ["$totalCost", 0] }
                      ]},
                      { $cond: [
                        { $isNumber: "$totalCost" },
                        "$totalCost",
                        { $toDouble: "$totalCost" }
                      ]},
                      0
                    ]
                  }
                },
                openingCost: {
                  $sum: {
                    $cond: [
                      { $isNumber: "$totalCost" },
                      "$totalCost",
                      { $toDouble: "$totalCost" }
                    ]
                  }
                }
              }
            }
          ]
        },
        "aggregateDocs",
        SERVER
      );

      // 2. Get transactions within date range
      const transactionsResp = await fetchServer(
        "POST",
        {
          database: company,
          collection: "InventoryTransactions",
          prop: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $gte: ["$postingDate", formattedStartDate] },
                    { $lte: ["$postingDate", formattedEndDate] }
                  ],
                },
                ...(location !== 'all' && { location }),
                ...(productId && { productId }),
                ...(transactionType !== 'all' && { 
                  $or: [
                    { entryType: transactionType },
                    { documentType: transactionType }
                  ].filter(Boolean)
                })
              }
            },
            {
              $project: {
                productId: 1,
                location: 1,
                baseQuantity: 1,
                totalCost: 1,
                totalSales: 1,
                documentType: 1,
                entryType: 1,
                postingDate: 1,
                postingStamp: 1
              }
            },
            {
              $group: {
                _id: {
                  productId: "$productId",
                  location: "$location"
                },
                // Purchases
                purchasedQty: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ["$entryType", "Purchase"] },
                        { $gt: ["$baseQuantity", 0] }
                      ]},
                      { $cond: [
                        { $isNumber: "$baseQuantity" },
                        "$baseQuantity",
                        { $toDouble: "$baseQuantity" }
                      ]},
                      0
                    ]
                  }
                },
                purchaseCost: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ["$entryType", "Purchase"] },
                        { $gt: ["$totalCost", 0] }
                      ]},
                      { $cond: [
                        { $isNumber: "$totalCost" },
                        "$totalCost",
                        { $toDouble: "$totalCost" }
                      ]},
                      0
                    ]
                  }
                },
                // Sales
                soldQty: {
                  $sum: {
                    $cond: [
                      { $eq: ["$entryType", "Sales"] },
                      { $cond: [
                        { $isNumber: "$baseQuantity" },
                        "$baseQuantity",
                        { $toDouble: "$baseQuantity" }
                      ]},
                      0
                    ]
                  }
                },
                salesValue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$entryType", "Sales"] },
                      { $cond: [
                        { $isNumber: "$totalSales" },
                        "$totalSales",
                        { $toDouble: "$totalSales" }
                      ]},
                      0
                    ]
                  }
                },
                costOfGoodsSold: {
                  $sum: {
                    $cond: [
                      { $eq: ["$entryType", "Sales"] },
                      { $cond: [
                        { $isNumber: "$totalCost" },
                        "$totalCost",
                        { $toDouble: "$totalCost" }
                      ]},
                      0
                    ]
                  }
                },
                // Transfers
                transferInQty: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ["$documentType", "Transfer Receipt"] },
                        { $gt: ["$baseQuantity", 0] }
                      ]},
                      { $cond: [
                        { $isNumber: "$baseQuantity" },
                        "$baseQuantity",
                        { $toDouble: "$baseQuantity" }
                      ]},
                      0
                    ]
                  }
                },
                transferInCost: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ["$documentType", "Transfer Receipt"] },
                        { $gt: ["$baseQuantity", 0] }
                      ]},
                      { $cond: [
                        { $isNumber: "$totalCost" },
                        "$totalCost",
                        { $toDouble: "$totalCost" }
                      ]},
                      0
                    ]
                  }
                },
                transferOutQty: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ["$documentType", "Transfer Shipment"] },
                        { $lt: ["$baseQuantity", 0] }
                      ]},
                      { $cond: [
                        { $isNumber: "$baseQuantity" },
                        "$baseQuantity",
                        { $toDouble: "$baseQuantity" }
                      ]},
                      0
                    ]
                  }
                },
                transferOutCost: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ["$documentType", "Transfer Shipment"] },
                        { $lt: ["$baseQuantity", 0] }
                      ]},
                      { $cond: [
                        { $isNumber: "$totalCost" },
                        "$totalCost",
                        { $toDouble: "$totalCost" }
                      ]},
                      0
                    ]
                  }
                },
                // Positive Adjustments
                positiveAdjustmentQty: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ["$documentType", "Positive Adjustment"] },
                        { $gt: ["$baseQuantity", 0] }
                      ]},
                      { $cond: [
                        { $isNumber: "$baseQuantity" },
                        "$baseQuantity",
                        { $toDouble: "$baseQuantity" }
                      ]},
                      0
                    ]
                  }
                },
                positiveAdjustmentCost: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ["$documentType", "Positive Adjustment"] },
                        { $gt: ["$baseQuantity", 0] }
                      ]},
                      { $cond: [
                        { $isNumber: "$totalCost" },
                        "$totalCost",
                        { $toDouble: "$totalCost" }
                      ]},
                      0
                    ]
                  }
                },
                // Negative Adjustments
                negativeAdjustmentQty: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ["$documentType", "Negative Adjustment"] },
                        { $lt: ["$baseQuantity", 0] }
                      ]},
                      { $cond: [
                        { $isNumber: "$baseQuantity" },
                        "$baseQuantity",
                        { $toDouble: "$baseQuantity" }
                      ]},
                      0
                    ]
                  }
                },
                negativeAdjustmentCost: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ["$documentType", "Negative Adjustment"] },
                        { $lt: ["$baseQuantity", 0] }
                      ]},
                      { $cond: [
                        { $isNumber: "$totalCost" },
                        "$totalCost",
                        { $toDouble: "$totalCost" }
                      ]},
                      0
                    ]
                  }
                }
              }
            }
          ]
        },
        "aggregateDocs",
        SERVER
      );

      // 3. Process and merge the data
      const stockMap = {};
      const purchaseInfo = {}
      
      // Process opening stock
      if (openingStockResp.record) {
        openingStockResp.record.forEach(item => {
          const { productId, location } = item._id;
          if (!stockMap[productId]) stockMap[productId] = {};
          if (!purchaseInfo[productId]) purchaseInfo[productId] = {};
          if (!stockMap[productId][location]) {
            stockMap[productId][location] = createEmptyStockData();
          }
          if (!purchaseInfo[productId].purchasedQty) purchaseInfo[productId].purchasedQty = 0;
          if (!purchaseInfo[productId].purchaseCost) purchaseInfo[productId].purchaseCost = 0;
          purchaseInfo[productId].purchasedQty += item.purchasedQty || 0;
          purchaseInfo[productId].purchaseCost += item.purchaseCost || 0;
          stockMap[productId][location].openingQuantity = item.openingQuantity || 0;
          stockMap[productId][location].openingCost = (true && item.purchasedQty) ? Number(((item.purchaseCost/item.purchasedQty) * item.openingQuantity).toFixed(2)) : 0;
          stockMap[productId][location].closingQty = item.openingQuantity || 0;
          const closingCost = (true && item.purchasedQty) ? Number(((item.purchaseCost/item.purchasedQty) * item.openingQuantity).toFixed(2)) : 0;
          // products.find(p => p.i_d === productId)?.salesPrice
          stockMap[productId][location].closingCost = closingCost
          stockMap[productId][location].closingSalesValue = stockMap[productId][location].closingQty * (products.find(p => p.i_d === productId)?.salesPrice || 0);
          stockMap[productId][location].averageCost = item.openingQuantity !== 0 ? Number((closingCost / item.openingQuantity).toFixed(2)) : 0;
         
        });
      }

      if (transactionsResp.record) {
        transactionsResp.record.forEach(item => {
          const { productId } = item._id;          
          if (!purchaseInfo[productId]) purchaseInfo[productId] = {};
          if (!purchaseInfo[productId].purchasedQty) purchaseInfo[productId].purchasedQty = 0;
          if (!purchaseInfo[productId].purchaseCost) purchaseInfo[productId].purchaseCost = 0;
          purchaseInfo[productId].purchasedQty += item.purchasedQty || 0;
          purchaseInfo[productId].purchaseCost += item.purchaseCost || 0;
        })
      }

      // Process transactions within date range
      if (transactionsResp.record) {
        transactionsResp.record.forEach(item => {
          const { productId, location } = item._id;
          if (!stockMap[productId]) stockMap[productId] = {};
          if (!stockMap[productId][location]) {
            stockMap[productId][location] = createEmptyStockData();
          }
          
          // Update with transaction data
          const locationData = stockMap[productId][location];
          locationData.purchasedQty = item.purchasedQty || 0;
          locationData.purchaseCost = item.purchaseCost || 0;
          locationData.soldQty = item.soldQty || 0;
          locationData.salesValue = item.salesValue || 0;
          locationData.costOfGoodsSold = item.costOfGoodsSold || 0;
          
          locationData.transferInQty = item.transferInQty || 0;
          locationData.transferOutQty = item.transferOutQty || 0;
          
          locationData.transferInCost = item.transferInCost || 0;
          locationData.transferOutCost = item.transferOutCost || 0;

          // Positive adjustments
          locationData.positiveAdjustmentQty = item.positiveAdjustmentQty || 0;
          locationData.positiveAdjustmentCost = item.positiveAdjustmentCost || 0;
          
          // Negative adjustments
          locationData.negativeAdjustmentQty = item.negativeAdjustmentQty || 0;
          locationData.negativeAdjustmentCost = item.negativeAdjustmentCost || 0;
          
          // Net adjustments
          locationData.netAdjustmentQty = (item.positiveAdjustmentQty || 0) + (item.negativeAdjustmentQty || 0);
          locationData.netAdjustmentCost = (item.positiveAdjustmentCost || 0) + (item.negativeAdjustmentCost || 0);
          
          // Calculate closing quantities
          locationData.closingQty = (locationData.openingQuantity || 0) + 
                                   (locationData.purchasedQty || 0) + 
                                   (locationData.transferInQty || 0) + 
                                   (locationData.transferOutQty || 0) + 
                                   (locationData.soldQty || 0) + 
                                   (locationData.netAdjustmentQty || 0);
          
          // Calculate closing cost (using average cost method)
          const totalCost = purchaseInfo[productId].purchaseCost
          const totalQty = purchaseInfo[productId].purchasedQty
          
          locationData.averageCost = totalQty !== 0 ? totalCost / totalQty : 0;
          locationData.closingCost =true ? (locationData.closingQty * locationData.averageCost) : 0;
          locationData.closingSalesValue = locationData.closingQty * (products.find(p => p.i_d === productId)?.salesPrice || 0);
        });
      }

      // 4. Enrich products with the calculated stock data
      const enrichedProducts = products.map(product => {
        const locationData = stockMap[product.i_d] || {};
        
        // Calculate totals across all locations
        const totals = Object.values(locationData).reduce((acc, loc) => ({
          openingQuantity: (acc.openingQuantity || 0) + (loc.openingQuantity || 0),
          openingCost: (acc.openingCost || 0) + (loc.openingCost || 0),
          purchasedQty: (acc.purchasedQty || 0) + (loc.purchasedQty || 0),
          purchaseCost: (acc.purchaseCost || 0) + (loc.purchaseCost || 0),
          soldQty: (acc.soldQty || 0) + (loc.soldQty || 0),
          salesValue: (acc.salesValue || 0) + (loc.salesValue || 0),
          costOfGoodsSold: (acc.costOfGoodsSold || 0) + (loc.costOfGoodsSold || 0),
          
          // Transfer fields
          transferInQty: (acc.transferInQty || 0) + (loc.transferInQty || 0),
          transferOutQty: (acc.transferOutQty || 0) + (loc.transferOutQty || 0),
          transferInCost: (acc.transferInCost || 0) + (loc.transferInCost || 0),
          transferOutCost: (acc.transferOutCost || 0) + (loc.transferOutCost || 0),
          
          // Adjustment fields
          positiveAdjustmentQty: (acc.positiveAdjustmentQty || 0) + (loc.positiveAdjustmentQty || 0),
          positiveAdjustmentCost: (acc.positiveAdjustmentCost || 0) + (loc.positiveAdjustmentCost || 0),
          negativeAdjustmentQty: (acc.negativeAdjustmentQty || 0) + (loc.negativeAdjustmentQty || 0),
          negativeAdjustmentCost: (acc.negativeAdjustmentCost || 0) + (loc.negativeAdjustmentCost || 0),
          netAdjustmentQty: (acc.netAdjustmentQty || 0) + (loc.netAdjustmentQty || 0),
          netAdjustmentCost: (acc.netAdjustmentCost || 0) + (loc.netAdjustmentCost || 0),
          
          // Closing values
          closingQty: (acc.closingQty || 0) + (loc.closingQty || 0),
          averageCost: (acc.averageCost || 0) + (loc.closingQty ? ((loc.closingQty)/(loc.closingCost)) : 0),
          closingCost: (acc.closingCost || 0) + (loc.closingCost || 0),
          closingSalesValue: (acc.closingSalesValue || 0) + (loc.closingSalesValue || 0)
        }), createEmptyStockData());

        // Calculate net adjustments
        const netAdjustmentQty = (totals.positiveAdjustmentQty || 0) + (totals.negativeAdjustmentQty || 0);
        const netAdjustmentCost = (totals.positiveAdjustmentCost || 0) + (totals.negativeAdjustmentCost || 0);
        
        // Add net adjustments to totals for backward compatibility
        totals.netAdjustmentQty = netAdjustmentQty;
        totals.netAdjustmentCost = netAdjustmentCost;
        
        // Calculate average cost
        const totalQty = (totals.purchasedQty || 0);
        const totalCost = (totals.purchaseCost || 0);
        totals.averageCost = totalQty !== 0 ? totalCost / totalQty : 0;

        return {
          ...product,
          locationStockDetails: locationData,
          stockSummary: totals
        };
      });
      setProducts(enrichedProducts)
      return enrichedProducts;
    } catch (error) {
      console.error('Error in getProductsStockReport:', error);
      setAlertState('error');
      setAlert('Error loading inventory report data');
      setAlertTimeout(5000);
      return products; // Return original products in case of error
    }
  };

  // Helper function to create an empty stock data object
  const createEmptyStockData = () => ({
    openingQty: 0,
    openingCost: 0,
    purchasedQty: 0,
    purchaseCost: 0,
    soldQty: 0,
    salesValue: 0,
    costOfGoodsSold: 0,
    transferInQty: 0,
    transferInCost: 0,
    transferOutQty: 0,
    transferOutCost: 0,
    positiveAdjustmentQty: 0,
    positiveAdjustmentCost: 0,
    negativeAdjustmentQty: 0,
    negativeAdjustmentCost: 0,
    netAdjustmentQty: 0,
    netAdjustmentCost: 0,
    closingQty: 0,
    closingCost: 0,
    closingSalesValue: 0,
    averageCost: 0
  });

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

  function excelDateToTimestamp(excelDateValue) {
    if (String(excelDateValue).split('').includes('/') ||
    String(excelDateValue).split('').includes('-')){
        return excelDateValue
    }else{
        const secondsInDay = 86400; // 24 hours * 60 minutes * 60 seconds
        const millisecondsInDay = secondsInDay * 1000;
    
        // Excel epoch is December 30, 1899
        const excelEpoch = new Date('1899-12-30').getTime();
    
        // Convert Excel date value to JavaScript timestamp
        var timestamp = excelEpoch + (Number(excelDateValue) - 1) * millisecondsInDay;
        if (excelDateValue >= 60) {
            timestamp += millisecondsInDay; // Add one day for dates after February 29, 1900
        }
    
        return timestamp;
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
          genDb,
          pauseView, setPauseView,
          loginMessage, setLoginMessage,
          generateCode, generateSeries, 
          exportFile, importFile,
          getSessionEnd,
          companyRecord, setCompanyRecord,  
          chartOfAccounts, setChartOfAccounts, getChartOfAccounts,
          profiles, setProfiles, fetchProfiles,
          DBProfiles, setDBProfiles, fetchDBProfiles,
          departments, setDepartments, getDepartments,
          positions, setPositions, getPositions,
          employees, setEmployees, getEmployees,
          customers, setCustomers, getCustomers,
          attendance, setAttendance, getAttendance,
          allSessions, setAllSessions, getAllSessions,
          sessions, setSessions, fetchSessions,
          salesSessions, setSalesSessions,
          deliverySessions, setDeliverySessions,
          getPosOrders,
          isLive, setIsLive, liveErrorMessages, setLiveErrorMessages,
          tables, setTables, fetchTables,

          approvals, setApprovals, getApprovals,
          runApprovalWorkFlow, requestApproval, postApprovalUpdate, 
          updateApproval, removeApproval,
          approvalStatus, setApprovalStatus,
          approvalMessage, setApprovalMessage,
          curApproval, setCurApproval,
          showApprovalBox, setShowApprovalBox,

          saleFrom, setSaleFrom,
          saleTo, setSaleTo,
          saleNextFrom, setSaleNextFrom,
          salesLoadCount, setSalesLoadCount, 
          sales, setSales, getSales,
          nextSales, setNextSales, 
          products, setProducts, getProducts, 
          getProductsWithStock, getProductsStockReport,
          accommodations, setAccommodations, getAccommodations,
          purchase, setPurchase, getPurchase,
          expenses, setExpenses, getExpenses,
          rentals, setRentals, getRentals,
          paymentReceipts, obtainPaymentReceipts,
          
          settings, setSettings, getSettings,
          colSettings, setColSettings,
          recoveryVal, setRecoveryVal,
          accommodationVal, setAccommodationVal,
          allowBacklogs, setAllowBacklogs,
          editAccess, setEditAccess,
          posWrhAccess, setPosWrhAccess, 
          deliveryWrhAccess, setDeliveryWrhAccess,
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
          excelDateToTimestamp,
          getDate,
          removeComma,
          removeSessions,
          sessId,
          company,
        }}
      >
        {!actionMessage && (
          <Notify
            notifyMessage={alert}
            notifyState={alertState}
            timeout={alertTimeout}
          />
        ) }
        {!pauseView ? (
          <Routes>
            <Route path="/" element={<LoadingPage />}></Route>
            <Route path="/landing-page" element={<LandingPage />}></Route>
            <Route path="/login" element={<Login />}></Route>
            <Route path="/profile" element={<Profile />}></Route>
            <Route path="/test" element={<FormPage />}></Route>
            <Route path="/dash" element={<DashView />}></Route>
            <Route path="/:id" element={<Dashboard />}></Route>
          </Routes>
        ) : (
          <PauseView />
        )}
        </ContextProvider.Provider>
    </>
  );
}

export default App;
