import { useEffect, useState } from 'react';
import './App.css';
import {Routes, Route, useNavigate } from 'react-router-dom';
import ContextProvider from './Resources/ContextProvider';
import LoadingPage from './Components/LoadingPage/LoadingPage';
import Login from './Components/Login/Login';
import Profile from './Components/Profile/Profile';
import Dashboard from './Components/Dashboard/Dashboard';
import FormPage from './Components/FormPage/FormPage';
import { AnimatePresence, motion } from 'framer-motion';
import fetchServer from './Resources/ClientServerAPIConn/fetchServer'

function App() {
  // const SERVER = "http://localhost:3001"
  const SERVER = "https://wageserver.vercel.app"

  const [sessId, setSessID] = useState(null)
  const [companyRecord, setCompanyRecord] = useState(null)
  const [loginMessage, setLoginMessage] = useState('')
  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])
  const [employees, setEmployees] = useState([])
  const [settings, setSettings] = useState([])
  const [attendance, setAttendance] = useState([])
  const [company, setCompany] = useState(null)
  const [path, setPath] = useState('')
  const pathList = ['','login','profile','dashboard', 
    'employees','departments','positions','attendance','payroll','settings','test']
  const dashList = ['dashboard', 
    'employees','departments','positions','attendance','payroll','settings']
  
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
      getDepartments(cmp_val)
      getPositions(cmp_val)
      getEmployees(cmp_val)
      getSettings(cmp_val)
      getAttendance(cmp_val)
      Navigate('/'+currPath)
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

  const getDate = () =>{
    const current = new Date();
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
          attendance, setAttendance, getAttendance,
          settings, setSettings, getSettings,
          storePath,
          months, monthDays, years,
          path,
          dashList,
          loadPage,
          getImage,
          getDate,
          removeSessions,
          sessId,
          company
        }}>
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
