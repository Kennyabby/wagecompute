import './SideNav.css'

import { useState, useEffect, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useNavigate, useLocation } from 'react-router-dom'

const SideNav = ()=>{
    const {server, fetchServer, company, companyRecord} = useContext(ContextProvider)
    const [companyName, setCompanyName] = useState('....') 
    const [curPath, setCurPath] = useState('')
    const [logStatus, setLogStatus] = useState('Log Out')
    const location = useLocation()
    const Navigate = useNavigate()
    useEffect(()=>{
        const curloc = location.pathname.slice(1,)
        setCurPath(curloc)
    },[location])
    useEffect(()=>{
        if (companyRecord){
            setCompanyName(companyRecord.name)
        }
    },[companyRecord])

    const handleNav = (e)=>{
        const name = e.target.getAttribute('name')
        if(name){
          Navigate('/'+name)  
        }
    }
    const logout = async()=>{
        setLogStatus('Ending Session')
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Profile", 
            record: companyRecord
        }, "closeSession", server)
        
        if (resps.err){
           console.log(resps.mess)
           setLogStatus('Log Out')
        }else{
            window.location.reload()
        }
    }
    return(
        <>
        <div className='sidenav'>
            <div className='navheader'>{companyName}</div>
            <nav className='navbox' onClick={handleNav}>
                <ul className='icons'>
                </ul>
                <ul className='navbarr'>
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('dashboard')) && <li name="dashboard" className={curPath==='dashboard'?'selected':''}>Dashboard</li>}
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('employees')) && <li name="employees" className={curPath==='employees'?'selected':''}>Employees</li>}
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('departments')) && <li name="departments" className={curPath==='departments'?'selected':''}>Departments</li>}
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('positions')) && <li name="positions" className={curPath==='positions'?'selected':''}>Positions</li>}
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('attendance')) && <li name="attendance" className={curPath==='attendance'?'selected':''}>Attendance</li>}
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('payroll')) && <li name="payroll" className={curPath==='payroll'?'selected':''}>Payroll</li>}
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('sales')) && <li name="sales" className={curPath==='sales'?'selected':''}>Sales</li>}
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('purchase')) && <li name="purchase" className={curPath==='purchase'?'selected':''}>Purchase</li>}
                    {(companyRecord?.status === 'admin') && <li name="settings" className={curPath==='settings'?'selected':''}>Settings</li>}
                    <div
                        onClick={logout}
                    >{logStatus}</div>
                </ul>
            </nav>
            
        </div>
        </>
    )
}

export default SideNav