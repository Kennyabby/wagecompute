import { useEffect, useState, useCallback } from 'react';
import './App.css';
import {Routes, Route, useNavigate } from 'react-router-dom';
import ContextProvider from './Resources/ContextProvider';
import PauseView from './Components/PauseView/PauseView';
import LoadingPage from './Components/LoadingPage/LoadingPage';
import Login from './Components/Login/Login';
import Profile from './Components/Profile/Profile';
import Dashboard from './Components/Dashboard/Dashboard';
import DashView from './Components/DashView/DashView';
import FormPage from './Components/FormPage/FormPage';
import Notify from './Resources/Notify/Notify';
import { read, utils, writeFileXLSX } from 'xlsx';
import { AnimatePresence, motion } from 'framer-motion';
import fetchServer from './Resources/ClientServerAPIConn/fetchServer'
import { syncPendingChanges } from './Resources/offlineSync';
import { getAppCache, setAppCache, clearAppCache, putSession, putTable, loadPendingChanges } from './Resources/offlineDb';

// const SERVER = "http://localhost:3001"
// const SERVER = "https://enterpriseserver.up.railway.app"
const SERVER = "https://enterpriseserver-1.vercel.app"
// const SERVER = "https://wageserver.onrender.com"
// const SERVER = "https://hserver.techpros.com.ng"
// const SERVER = "http://3.251.76.94"

// App-level cache helpers now backed by IndexedDB (appCache store)
const CACHE_TTL_MS = 1 * 60 * 1000; // 1 minute TTL

const makeCacheKey = (company, resource) => {
  const db = company || 'global';
  return `wc-cache:${db}:${resource}`;
};

// getCached returns a Promise resolving to cached data or null
const getCached = async (companyKey, resource, emailid) => {
  const rec = await getAppCache(companyKey, emailid, resource);
  if (!rec) return null;
  // if (!rec || !rec.updatedAt) return null;
  // const isFresh = Date.now() - rec.updatedAt < CACHE_TTL_MS;
  // return isFresh ? rec.data : null;
  return rec.data;
};

// Fire-and-forget writes; failures are logged inside offlineDb
const setCached = (companyKey, resource, data, emailid) => {
  setAppCache(companyKey, emailid, resource, data);
};

const clearCache = (companyKey, resource, emailid) => {
  clearAppCache(companyKey, emailid, resource);
};

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
  const [deliverySessions, setDeliverySessions] = useState(null)
  const [salesSessions, setSalesSessions] = useState(null)
  const [allSalesSessions, setAllSalesSessions] = useState(null)
  const [allDeliverySessions, setAllDeliverySessions] = useState(null)

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
  const [loadedCurPath, setLoadedCurPath] = useState('')
  const [path, setPath] = useState('')
  const pathList = ['','login','profile','dashboard', 
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

  useEffect(() => {
    if (!company || !companyRecord?.emailid) return;

    const id = setInterval(() => {
      if (!(company && companyRecord?.emailid)) return;

      (async () => {
        try {
          const pending = await loadPendingChanges(company, companyRecord.emailid);
          if (!pending || !pending.length) {
            // Nothing to sync; skip to avoid noisy toasts
            return;
          }

          // const timeLabel = new Date().toLocaleTimeString();
          // setAlertState('info');
          // setAlert(`Offline Sync by Background sync started at ${timeLabel}`);
          // setAlertTimeout(5000);

          await syncPendingChanges(company, companyRecord.emailid, fetchServer, SERVER);

          // const doneLabel = new Date().toLocaleTimeString();
          // setAlertState('success');
          // setAlert(`Offline Sync by Background sync completed at ${doneLabel}`);
          // setAlertTimeout(5000);
        } catch (e) {
          // const failLabel = new Date().toLocaleTimeString();
          // setAlertState('error');
          // setAlert(`Offline Sync by Background sync failed at ${failLabel}`);
          // setAlertTimeout(5000);
        }
      })();
    }, 5 * 60 * 1000); // every 5 minutes

    return () => clearInterval(id);
  }, [company, companyRecord?.emailid]);

  useEffect(()=>{
    var cmp_val = window.localStorage.getItem('sessn-cmp')
    getViewAccess(hostDb)
    getSettings(cmp_val, companyRecord)
    getChartOfAccounts(cmp_val, companyRecord)
    const intervalId = setInterval(()=>{
      if (cmp_val){
        setReloadCount((prevCount)=>{
          return prevCount + 1
        })
        getSettings(cmp_val)
        getChartOfAccounts(cmp_val)
        getViewAccess(hostDb)
      }
    },1200000)
    return () => clearInterval(intervalId);
  },[window.localStorage.getItem('sessn-cmp')])
  
  useEffect(()=>{
    var cmp_val = window.localStorage.getItem('sessn-cmp')  
    const intervalId = setInterval(()=>{
      if (cmp_val && companyRecord?.emailid){
        setReloadCount((prevCount)=>{
          return prevCount + 1
        })        
      }
    },3000)
    return () => clearInterval(intervalId);
  },[window.localStorage.getItem('sessn-cmp'), companyRecord])

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

  // On Fist Mount
  useEffect(()=>{
    if (company && companyRecord?.emailid && loadedCurPath){
      getSettings(company)
      getApprovals(company)
      getEmployees(company)
      getChartOfAccounts(company)
      getAccommodations(company)
      getSales(company)
      getPosOrders({company: company, companyRecord: companyRecord})
      if (companyRecord.status==='admin'){        
        window.localStorage.removeItem('lgt-vw')
        fetchProfiles(company)
        getDepartments(company)
        getPositions(company)
        getCustomers(company)
        fetchTables(company)
        fetchSessions(company , "sales", companyRecord)
        fetchSessions(company , "delivery", companyRecord)
        fetchAllSessions({company: company, companyRecord: companyRecord})
        //here
        getProducts(company)
        getRentals(company)
        getPurchase(company)
        getExpenses(company)
        getAttendance(company)
        Navigate('/' + loadedCurPath)
        setTimeout(() => {
          setLoadedCurPath('')
        }, 500);
      }
    }
  },[company, companyRecord, loadedCurPath])

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
            if(companyRecord?.permissions.includes('access_delivery_sessions')){
              fetchAllSessions({company, companyRecord})
              getPosOrders({company: company, companyRecord: companyRecord})
            }
            fetchProfiles(company)
            fetchSessions(company , "delivery", companyRecord)
            fetchTables(company)
            Navigate('/delivery')
          }
          if (companyRecord?.permissions.includes('pos')){
            if(companyRecord?.permissions.includes('access_pos_sessions')){
              fetchAllSessions({company, companyRecord})
              getPosOrders({company: company, companyRecord: companyRecord})
            }
            fetchProfiles(company)
            fetchSessions(company , "sales", companyRecord)
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
            fetchAllSessions({company, companyRecord})
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
  },[posOrders, sales, accommodations, allSessions])

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
      const closingHour = 11
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

  const getSessionStart = (timestamp) => {
      const closingHour = 11;
      const date = new Date(timestamp);

      // Candidate session start at 11:00 AM same day
      const sessionStart = new Date(date);
      sessionStart.setHours(closingHour, 0, 0, 0);

      // If timestamp is BEFORE today's 11am,
      // then the session started at 11am the PREVIOUS day
      if (date.getTime() < sessionStart.getTime()) {
          sessionStart.setDate(sessionStart.getDate() - 1);
      }

      return sessionStart.getTime();
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

  const getEmployeeName = (employeeId)=>{
    const emp = employees?.find((employee)=>{
      return employeeId === employee.i_d
    })
    if (emp){
      return `${emp.firstName} ${emp.lastName}`
    }else{
        return 'Default'
    }
  }
  
  const getApprovalConfig =  (module, section, approverId) => {
    const moduleApprovers = {
      'sales': {
        finalLevel: 1,
        type: 'rank',
        approverIds: {
          '65': {
            rank: 0,
            sections: ['postsales']
          }, 
          '1': {
            rank: 1,
            sections: ['all']
          }, 
          'theplantainplanet22@gmail.com': {
            rank: 1,
            sections: ['all']
          }
        },
      },
        
      'accommodation': {
        finalLevel: 1,
        type: 'rank',
        approverIds: {
          '65': {
            rank: 0,
            sections: ['postaccommodation']
          }, 
          '1': {
            rank: 1,
            sections: ['all']
          }, 
          'theplantainplanet22@gmail.com': {
            rank: 1,
            sections: ['all']
          }
        },
      },

      'purchase': {
        finalLevel: 1,
        type: 'rank',
        approverIds: {
          '65': {
            rank: 0,
            sections: ['postpurchase']
          }, 
          '1': {
            rank: 1,
            sections: ['all']
          }, 
          'theplantainplanet22@gmail.com': {
            rank: 1,
            sections: ['all']
          }
        },
      },

      'attendance': {
        finalLevel: 0,
        type: 'rank',
        approverIds: {
          '1': {
            rank: 0,
            sections: ['all']
          }, 
          'theplantainplanet22@gmail.com': {
            rank: 0,
            sections: ['all']
          }
        },
      }
    }

    const respConfig = {
      isApprover: false
    }

    const moduleApproval = moduleApprovers[module]
    const canApprove = ![null, undefined].includes(moduleApproval?.approverIds?.[approverId])
    if (canApprove){
      const approverSections = moduleApproval?.approverIds?.[approverId].sections
      if (approverSections.includes('all') || approverSections.includes(section)){
        respConfig.isApprover = true
        const approvalType = moduleApproval.type
        const finalLevel = moduleApproval.finalLevel
        const approverLevel = moduleApproval.approverIds?.[approverId][approvalType]
        respConfig.approverLevel = approverLevel
        respConfig.finalLevel = finalLevel
      }
    }
    
    return respConfig
  }

  const postApprovalUpdate = async (company, module, section, curApproval)=>{
    const {isApprover, approverLevel, finalLevel} = getApprovalConfig(module, section, companyRecord?.emailid)
    if(isApprover){
      let sectionApprovers = []
      if (Array.isArray(curApproval?.approvers)){
        sectionApprovers = sectionApprovers.concat(curApproval.approvers)
      }
      if (sectionApprovers.length <= approverLevel){
        setAlertState('info')
        setAlert('Updating Approval...')
        setAlertTimeout(100000)

        const updatedSectionApprovers = sectionApprovers.concat(companyRecord?.emailid)
        const approvalState = {
            approvers: (approvalStatus ? updatedSectionApprovers: sectionApprovers),
            approved: (finalLevel === approverLevel ? approvalStatus: false),
            message: approvalMessage,
            createdAt: curApproval.createdAt,
            lastUpdatedBy: companyRecord?.emailid
        }
        if (approvalStatus){
            approvalState.approvedBy = companyRecord?.emailid
        }
        const resp = await updateApproval(company, module, section, {                                                                
            ...approvalState
        })
        if (resp.completed){
            getApprovals(company, companyRecord)
            setAlertState('success')
            setAlert('Approval Updated!')
            setAlertTimeout(5000)
            setApprovalStatus(false)
            setApprovalMessage('')
            setShowApprovalBox(false)
            setCurApproval({...curApproval, 
                ...approvalState
            })
        }else{
            setAlertState('error')
            setAlert(resp.mess)
            setAlertTimeout(5000)
            setApprovalStatus(false)
            setApprovalMessage('')
        }
      }else{
        setAlertState('error')
        setAlert((finalLevel === approverLevel || sectionApprovers.length < approverLevel) ? 'Verification is Pending. Awaiting Approval Verification!': 'Verification already done!')
        setAlertTimeout(5000) 
      }
    }else{
        setAlertState('error')
        setAlert('You Have No Approval Permissions For This Section!')
        setAlertTimeout(5000)
    }
  }

  const runApprovalWorkFlow = async(postingDate, curApproval, module, section, data, runApproval, link)=>{
      
    const executePostAction = async ()=>{
        await runApproval()            
        if (curApproval?.createdAt){
            removeApproval(company, module, section, {                        
                createdAt: curApproval.createdAt,
                postingDate: curApproval.postingDate                                                 
            })
        }
        return true
    }

    const executeApprovalAction = async (previous)=>{
        if (companyRecord?.permissions.includes('approve_'+section) || companyRecord?.status==='admin'){
            executePostAction()
            return true
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
                getApprovals(company, companyRecord)
                setCurApproval(approvalData)
                return  true
            }else{
                setAlertState('error')
                setAlert(resp.mess)
                setAlertTimeout(5000)
                return true
            }
        }
    }

    if (![null, undefined].includes(curApproval)){
        if (curApproval.approved){
            executePostAction()
            return true
        }else{
            if (!curApproval.message){
                if (companyRecord?.permissions.includes('approve_'+section) || companyRecord?.status==='admin'){
                   setShowApprovalBox(true)
                }else{
                    setAlertState('info')
                    setAlert('Already sent for approval. Please wait for response!')
                    setAlertTimeout(5000)
                    return true
                }
            }else{
                executeApprovalAction(curApproval)
                return true
            }
        }
    }else{
       executeApprovalAction()
       return true
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
    
    // console.log('fetching sessions for',type)
    if (company && companyRecord?.emailid){
      const sessionsResponse = await fetchServer("POST", {
        database: company,
        collection: "POSSessions",
        prop: {type:type, employee_id: companyRecord.emailid}
      }, "getDocsDetails", SERVER);
  
      if(!sessionsResponse.err){
        // console.log('no errors occured')
        if (sessionsResponse.mess){
          setIsLive(false)
          // setLiveErrorMessages(sessionsResponse.mess)
        }else if(Array.isArray(sessionsResponse.record)){
          // console.log('sessions fetched successfully')
          const thisSessions = sessionsResponse.record
          // setSessions(thisSessions)
          // console.log('setting the sessions for', type)
          // console.log('for',type,':', thisSessions)
          if (type === 'sales'){
            setSalesSessions(thisSessions)
            setCached(company, 'salesSessions', thisSessions, companyRecord?.emailid)
            
          }
          if (type === 'delivery'){
            setDeliverySessions(thisSessions)
            // console.log('line 854, on Mount:',thisSessions.find(session=>session.active))
            setCached(company, 'deliverySessions', thisSessions, companyRecord?.emailid)         
          }
  
          // Mirror all sessions into IndexedDB sessions store for Offline Debug Panel
          try {
            if (company && companyRecord?.emailid && Array.isArray(sessionsResponse.record)) {
              for (const s of sessionsResponse.record) {
                if (s && s.start != null) {
                  await putSession(company, companyRecord.emailid, s);
                }
              }
            }
          } catch (e) {
            console.warn('fetchSessions: putSession failed', e);
          }
        }
      }else{
        if (sessionsResponse.mess !== 'Request aborted'){
          console.log(sessionsResponse.mess)
          setIsLive(false)
          setLiveErrorMessages('Slow Network. Check Connection')
        }
      }
    }
  }

  // Fetch POS and delivery sessions
  const fetchAllSessions = async ({company, setState, companyRecord}) => {
    if (!company) return;
    try {            
        if (company && companyRecord?.emailid){      
          const cachedAllSalesSession = await getCached(company, 'allSalesSessions', companyRecord?.emailid)
          const cachedAllDeliverySession = await getCached(company, 'allDeliverySessions', companyRecord?.emailid)             
          if (cachedAllSalesSession){
            setAllSalesSessions(cachedAllSalesSession)
          }
          if (cachedAllDeliverySession){
            setAllDeliverySessions(cachedAllDeliverySession)
          }
        }

        const sessionDays = 31 * 24 * 60 * 60 * 1000
        const allowedFromDays = Date.now() - sessionDays
        const resp = await fetchServer("POST", {
          database: company,
          collection: "POSSessions", 
          prop: {
            type:'delivery',
            start: {$gte: allowedFromDays}
          } 
        }, "getDocsDetails", SERVER)
        if (resp.record && Array.isArray(resp.record)){
          // console.log('fetched deliveries', resp.record)
          setAllDeliverySessions(resp.record)
          setCached(company, 'allDeliverySessions', resp.record, companyRecord?.emailid)                            
        }
        
        const resp1 = await fetchServer("POST", {
          database: company,
          collection: "POSSessions", 
          prop: {
            type:'sales',
            start: {$gte: allowedFromDays}
          } 
        }, "getDocsDetails", SERVER)

        if (resp1.record && Array.isArray(resp1.record)){
          // console.log('fetched sales', resp1.record)
          setAllSalesSessions(resp1.record)
          setAllSessions(resp1.record)            
          setCached(company, 'allSalesSessions', resp1.record, companyRecord?.emailid)                           
        }

        const sessionsResponse = await getAllSessions(company)
        if (Array.isArray(sessionsResponse)){
            // Sort all sessions by start time (newest first)
            const allSessions = sessionsResponse.sort((a, b) => new Date(b.start) - new Date(a.start));
            
            // Get and sort sales sessions (newest first)
            const salesSessions = allSessions
                .filter(s => s.type === 'sales')
                .sort((a, b) => new Date(b.start) - new Date(a.start));
            
            // Get and sort delivery sessions (newest first)
            const deliverySessions = allSessions
                .filter(s => s.type === 'delivery')
                .sort((a, b) => new Date(b.start) - new Date(a.start));
            
            // Get active sales sessions
            const activeSessions = salesSessions.filter(s => s.active);
            
            // Get last active sessions by location (most recent per location)
            const lastActiveByLocation = [];
            const locationMap = new Map();
            
            salesSessions.forEach(session => {
                if (session.wrh && !locationMap.has(session.wrh)) {
                    locationMap.set(session.wrh, session);
                    lastActiveByLocation.push(session);
                }
            });

            // Get 5 most recent delivery sessions
            const lastDeliverySessions = deliverySessions.slice(0, 5);
            setAllSessions(allSessions)            
                      
           
            if (setState!==null){
              setState({
                  activeSessions,
                  lastActiveSessions: lastActiveByLocation,
                  lastDeliverySessions
              });
            }
        }
    } catch (error) {
        console.error('Error fetching sessions:', error);
    }
  };

  const fetchTables = async (company) => {
      const tablesResponse = await fetchServer("POST", {
          database: company,
          collection: "Tables"
      }, "getDocsDetails", SERVER);
      if (!tablesResponse.err){
          if (!tablesResponse.mess){
              setTables(tablesResponse.record)

              // Mirror tables into IndexedDB tables store for Offline Debug Panel
              try {
                if (company && companyRecord?.emailid && Array.isArray(tablesResponse.record)) {
                  for (const t of tablesResponse.record) {
                    if (t && t.i_d != null) {
                      await putTable(company, companyRecord.emailid, t);
                    }
                  }
                }
              } catch (e) {
                console.warn('fetchTables: putTable failed', e);
              }
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
      if (resp.record.status!=='admin'){
        setEditAccess((editAccess)=>{
          return {...editAccess, 
            employees: resp.record.permissions.includes('edit_employees')
          }
        })
        setRecoveryVal(resp.record.enableDebtRecovery)
        setEnableBlockVal(!resp.record.enableLogin)        
      }
      setLoadedCurPath(currPath)
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
          if (!resps.mess && Array.isArray(resps.record)){
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

  const obtainPaymentReceipts = async ()=>{
    if (company && companyRecord?.emailid){      
      const cached = await getCached(company, 'paymentReceipts', companyRecord?.emailid)
      if (cached) {
        setPaymentReceipts(cached)
      }
      const paymentPoints = ['moniepoint1', 'moniepoint2', 'moniepoint3', 'moniepoint4', 'moniepoint5', 'moniepoint6','cash']    
      const recoveryReceipts = []
      const accommodationReceipts = []
      const posOrderReceipts = []
      const dateBoundary = new Date('2025-07-01').toISOString().slice(0,10)
  
      let paymentReceipts = []
      if (sales){
        sales?.forEach((sale)=>{
          (sale.recoveryList || []).forEach((recovery)=>{
            if (paymentPoints.includes(recovery.recoveryPoint)){
              let dateVar = new Date(recovery.recoveryDate).toISOString().slice(0,10) 
              if (dateVar >= dateBoundary){
                recoveryReceipts.push({
                  paymentModule: 'recovery',
                  paymentPoint: recovery.recoveryPoint,
                  paymentAmount: Number(recovery.recoveryAmount),
                  paymentReceipt: Number(recovery.recoveryReceipt) || recovery.recoveryReceipt,
                  paymentFor: `For ${sale.postingDate} Debt`,
                  paymentDate: recovery.recoveryDate,
                  paymentHandler: recovery.recoveryEmployeeId,
                  paymentModuleRef: sale.createdAt,
                  paymentApprover: 'Default'
                })
              }
            }
          })
        })
      }
      if (accommodations){
        accommodations?.forEach((acc)=>{
          let dateVar = new Date(acc.postingDate).toISOString().slice(0,10)
          if (paymentPoints.includes(acc.payPoint)){
            if (dateVar >= dateBoundary){
              accommodationReceipts.push({
                paymentModule: 'accommodation',
                paymentPoint: acc.payPoint,
                paymentAmount: Number(acc.paymentAmount),
                paymentReceipt: Number(acc.paymentReceipt) || acc.paymentReceipt,
                paymentFor: `For Room ${acc.roomNo}`,
                paymentDate: acc.postingDate,
                paymentHandler: acc.employeeId,
                paymentModuleRef: acc.createdAt,
                paymentApprover: 'Default'
              })
            }
          }
        })
      }
  
      if (posOrders && allSessions){
        posOrders?.forEach((order)=>{
          if (order.salesPosts){
            Object.keys(order.salesPosts).forEach((payPoint)=>{
              if (paymentPoints.includes(payPoint)){
                let dateVar = new Date(order.createdAt).toISOString().split('T')[0]
                if(dateVar >= dateBoundary) {
                  const location = order.salesPosts[payPoint]
                  const receiptNo = (payPoint === 'cash') ? 'cash' : order.receipts[payPoint]
                  const amount = Number(order[payPoint])
                  const session = allSessions?.find(session => (session.start === order.sessionId))
                  const sessionApprover = session?.endedby || 'Active Session'
                  posOrderReceipts.push({
                    paymentModule: `POS Order-${location}`,
                    paymentPoint: payPoint,
                    paymentAmount: amount,
                    paymentReceipt: Number(receiptNo) || receiptNo,
                    paymentFor: `(${location})-${order.orderNumber} Ordered from ${order.wrh}`,
                    paymentTable: order.tableId,
                    paymentOrder: order.orderNumber,
                    paymentDate: dateVar,
                    paymentHandler: order.handlerId,
                    paymentModuleRef: order.createdAt,
                    paymentApprover: sessionApprover
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
      setCached(company, 'paymentReceipts', paymentReceipts, companyRecord?.emailid)
    }
  }
  
  const fetchProfiles = async (company) => {
    if (company && companyRecord?.emailid){
      const cached = await getCached(company, 'profiles', companyRecord?.emailid);
      if (cached && Array.isArray(cached)) {
        setProfiles(cached);
      }
      const resps = await fetchServer("POST", {
          database: company,
          collection: "Profile",
          prop: {'verified': true}
      }, "getDocsDetails", SERVER)
      if (resps.err) {
          console.log(resps.mess)
      } else if(Array.isArray(resps.record)){
          setProfiles(resps.record)
          setCached(company, 'profiles', resps.record, companyRecord?.emailid)
      }
    }
  }
  
  const fetchDBProfiles = async (company) => {
    if (company && companyRecord?.emailid){
      const cached = await getCached(company, 'dbProfiles', companyRecord?.emailid);
      if (cached && Array.isArray(cached)) {
        setDBProfiles(cached);
      }
      const resps = await fetchServer("POST", {
          database: genDb,
          collection: "Profiles",
          prop: {'db': company}
      }, "getDocsDetails", SERVER)
      if (resps.err) {
          console.log(resps.mess)
      } else if(Array.isArray(resps.record)){
          setDBProfiles(resps.record)
          setCached(company, 'dbProfiles', resps.record, companyRecord?.emailid)
      }
    }
  }

  const getChartOfAccounts = async (company) => {
    if (company && companyRecord?.emailid){
      const cached = await getCached(company, 'chartOfAccounts', companyRecord?.emailid);
      if (cached && Array.isArray(cached)) {
        setChartOfAccounts(cached);
      }
      const resp = await fetchServer("POST", {
        database: company,
        collection: "ChartOfAccounts", 
        prop: {} 
      }, "getDocsDetails", SERVER)
      if (Array.isArray(resp.record)){
        setChartOfAccounts(resp.record)
        setCached(company, 'chartOfAccounts', resp.record, companyRecord?.emailid)
      }
    }
  };

  const getAllSessions = async (company) => {
    if (company && companyRecord?.emailId){
      const cached = await getCached(company, 'allSessions', companyRecord?.emailid);
      if (cached && Array.isArray(cached) && companyRecord?.emailid) {
        setAllSessions(cached);
      }
      const resp = await fetchServer("POST", {
        database: company,
        collection: "POSSessions", 
        prop: {} 
      }, "getDocsDetails", SERVER)
      if (resp.record && Array.isArray(resp.record)){
        setAllSessions(resp.record)
        setCached(company, 'allSessions', resp.record, companyRecord?.emailid)
        return resp.record
      }
    }
  }

  const getPosOrders = async ({company, option, filter, companyRecord}) => {
    if (company && companyRecord?.emailid){
      const cached = await getCached(company, 'posOrders', companyRecord?.emailid);
      if (cached && Array.isArray(cached) && companyRecord?.emailid) {
        setPosOrders(cached);
      }
      let prop = {}
      let filterDate = new Date('01/01/1970').getTime()
      if (filter?.start){
        filterDate = filter.start
      }
      const sessionStart = getSessionStart(filterDate)
      const sessionEnd = getSessionEnd(filterDate)
      const isPosAdmin = companyRecord?.status === 'admin' ||
        companyRecord?.permissions.includes('access_pos_sessions')
      const isDeliveryAdmin = companyRecord?.status === 'admin' ||
        companyRecord?.permissions.includes('access_delivery_sessions')
      switch (option){
        case 'tableOrders':
          prop = {
            ...(!isPosAdmin && filter.type === 'sales' && {sessionId: filter.sessionId}),          
            tableId: filter.tableId,
            ...(!isPosAdmin && filter.type === 'sales' && {handlerId: filter.handlerId}),
            ...((filter.type === 'sales' || (filter.type === 'delivery' && filter.wrh!=='kitchen')) && {wrh: filter.wrh}),
            ...(((isPosAdmin && filter.type === 'sales') || filter.type === 'delivery') && {createdAt: {$gte: sessionStart, $lte: sessionEnd}})
          }
      }
      if (option){
        // console.log('fetching pos orders with...', prop)
        const resp = await fetchServer("POST", {
          database: company,
          collection: "Orders",
          prop: {...prop}
        }, "getDocsDetails", SERVER)
        
        if (resp.record && Array.isArray(resp.record)){
          // console.log("allOrders list:", resp.record)
          // console.log('allOrders:', resp.record.find((order)=> order.orderNumber === 'ORD-251213-89997400'))
          setCached(company, 'posOrders', resp.record, companyRecord?.emailid)
          const cached = await getCached(company, 'posOrders', companyRecord?.emailid);
          if (cached && Array.isArray(cached) && companyRecord?.emailid) {
            setPosOrders(cached);
          }
        }
        return resp
        // return {record: []}
      }else{
        const orderDays = 31 * 24 * 60 * 60 * 1000
        const allowedFromDays = Date.now() - orderDays
        const resp = await fetchServer("POST", {
          database: company,
          collection: "Orders",
          prop: {createdAt: {$gte: allowedFromDays}}
        }, "getDocsDetails", SERVER)
        
        if (resp.record && Array.isArray(resp.record)){
          setPosOrders(resp.record);
          // console.log("allOrders list:", resp.record)
          // console.log('allOrders:', resp.record.find((order)=> order.orderNumber === 'ORD-251213-89997400'))
          setCached(company, 'posOrders', resp.record, companyRecord?.emailid)          
        }
      }
    }
  }

  const getDepartments = async (company) =>{
    const cached = await getCached(company, 'departments', companyRecord?.emailid);
    if (cached) {
      setDepartments(cached);
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Departments", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setDepartments(resp.record)
      setCached(company, 'departments', resp.record, companyRecord?.emailid)
    }
  }

  const getPositions = async (company) =>{
    const cached = await getCached(company, 'positions', companyRecord?.emailid);
    if (cached) {
      setPositions(cached);
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Positions", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setPositions(resp.record)
      setCached(company, 'positions', resp.record, companyRecord?.emailid)
    }
  }

  const getEmployees = async (company) => {
    const cached = await getCached(company, 'employees', companyRecord?.emailid);
    if (cached) {
      setEmployees(cached);
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Employees", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setEmployees(resp.record)
      setCached(company, 'employees', resp.record, companyRecord?.emailid)
    }
  };

  const getCustomers = async (company) =>{
    const cached = await getCached(company, 'customers', companyRecord?.emailid);
    if (cached) {
      setCustomers(cached);
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Customers", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setCustomers(resp.record)
      setCached(company, 'customers', resp.record, companyRecord?.emailid)
    }
  }

  const getAttendance = async (company) =>{
    const cached = await getCached(company, 'attendance', companyRecord?.emailid);
    if (cached) {
      setAttendance(cached);
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Attendance", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setAttendance(resp.record)
      setCached(company, 'attendance', resp.record, companyRecord?.emailid)
    }
  }

  const getSales = async (company) =>{
    
    var defaultEndPoint = 'getDocsDetails'
    
    const body = {
      database: company,
      collection: "Sales", 
      prop: {} 
    }

    const cached = await getCached(company, 'sales', companyRecord?.emailid);
    if (cached) {
      setSales(cached);
    }
    const resp = await fetchServer("POST", {
      ...body
    }, defaultEndPoint, SERVER)

    if (resp.record){
      setSales(resp.record)
      try {
        setCached(company, 'sales', resp.record, companyRecord?.emailid)
      } catch (e) {}
    }
    if (resp.err){
      setSalesLoadCount(0)
    }
  }

  const getProducts = async (company) => {
    const cached = await getCached(company, 'products', companyRecord?.emailid);
    if (cached && cached.length) {
      setProducts(cached);
    }
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
      setCached(company, 'products', resp.record, companyRecord?.emailid);
      getProductsWithStock(company, resp.record)
    }
  };

  const getProductsWithStock = async (company, products) => {
    const cached = await getCached(company, 'productsWithStock', companyRecord?.emailid);
    if (cached && cached.length) {
      setProducts(cached);
    }

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
      setProducts(enrichedProducts)
      setCached(company, 'productsWithStock', enrichedProducts, companyRecord?.emailid)
      return enrichedProducts;
    }       
    return products;
  };

  const makeStockReportCacheKey = (dateRange = {}) => {
    const keyPayload = {
      startDate: dateRange.startDate || null,
      endDate: dateRange.endDate || null,
      location: dateRange.location || 'all',
      transactionType: dateRange.transactionType || 'all',
      productId: dateRange.productId || null,
    };
    return `productsStockReport:${JSON.stringify(keyPayload)}`;
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
      const cacheKey = makeStockReportCacheKey(dateRange);
      const cached = await getCached(company, cacheKey, companyRecord?.emailid);
      if (cached && cached.length) {
        setProducts(cached);
      }
      // Set default date range if not provided (current month to date)
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
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
          locationData.transferInCost = item.transferInCost || 0;
          locationData.transferOutQty = item.transferOutQty || 0;
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
      if (companyRecord?.status === 'admin' && !products[0]?.stockSummary){
        // setAlertState('info');
        // setAlert('inventory data ready!');
        // setAlertTimeout(3000);
      }
      setProducts(enrichedProducts)
      const freshCacheKey = makeStockReportCacheKey(dateRange);
      setCached(company, freshCacheKey, enrichedProducts, companyRecord?.emailid);
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
    try {
      const resp = await fetchServer("POST", {
        database: company,
        collection: "Accommodations", 
        prop: {} 
      }, "getDocsDetails", SERVER)
      if (resp.record){
        setAccommodations(resp.record)
        setCached(company, 'accommodations', resp.record, companyRecord?.emailid)
      }
      if (resp.err){
        const cached = await getCached(company, 'accommodations', companyRecord?.emailid);    
        if (cached) {
          setAccommodations(cached);
        }
      }
    }catch (e){
      const cached = await getCached(company, 'accommodations', companyRecord?.emailid);    
      if (cached) {
        setAccommodations(cached);
      }
    }
  }

  const getPurchase = async (company) =>{
    const cached = await getCached(company, 'purchase', companyRecord?.emailid);
    if (cached) {
      setPurchase(cached);
      return;
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Purchase", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setPurchase(resp.record)
      setCached(company, 'purchase', resp.record, companyRecord?.emailid)
    }
  }

  const getExpenses = async (company) =>{
    const cached = await getCached(company, 'expenses', companyRecord?.emailid);
    if (cached) {
      setExpenses(cached);
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Expenses", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setExpenses(resp.record)
      setCached(company, 'expenses', resp.record, companyRecord?.emailid)
    }
  }

  const getRentals = async (company) =>{
    const cached = await getCached(company, 'rentals', companyRecord?.emailid);
    if (cached) {
      setRentals(cached);
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Rentals", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setRentals(resp.record)
      setCached(company, 'rentals', resp.record, companyRecord?.emailid)
    }
  }

  const getSettings = async (company) => {
    const cached = await getCached(company, 'settings', companyRecord?.emailid);
    if (cached) {
      setSettings(cached);
    }
    const resp = await fetchServer("POST", {
      database: company,
      collection: "Settings", 
      prop: {} 
    }, "getDocsDetails", SERVER)
    if (resp.record){
      setSettings(resp.record)
      setCached(company, 'settings', resp.record, companyRecord?.emailid)
    }
  };

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
          sessions, setSessions, fetchSessions, fetchAllSessions,
          salesSessions, setSalesSessions, allSalesSessions, setAllSalesSessions,
          posOrders, setPosOrders,
          deliverySessions, setDeliverySessions, allDeliverySessions, setAllDeliverySessions,
          getPosOrders, getEmployeeName,
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
            <Route path='/dash' element={<DashView/>}></Route>
            <Route path='/:id' element={<Dashboard/>}></Route>
          </Routes> :
          <PauseView/>
          }
        </ContextProvider.Provider>
    </>
  );
}

export default App;
