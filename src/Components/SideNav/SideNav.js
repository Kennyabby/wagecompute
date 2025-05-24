import './SideNav.css'

import { useState, useEffect, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useNavigate, useLocation } from 'react-router-dom'
import { BiSolidDashboard } from "react-icons/bi";
import { BsTable } from "react-icons/bs";
import { FaUsers } from "react-icons/fa";
import { MdSubject } from "react-icons/md";
import { CgArrangeBack } from "react-icons/cg";
import { GiPlayerTime } from "react-icons/gi";
import { SiPayloadcms } from "react-icons/si";
import { MdInventory } from "react-icons/md";
import { GiPayMoney } from "react-icons/gi";
import { MdDeliveryDining } from "react-icons/md";
import { FaHotel } from "react-icons/fa6";
import { GiBuyCard } from "react-icons/gi";
import { GiExpense } from "react-icons/gi";
import { RiSettings2Fill } from "react-icons/ri";
import { MdLogout } from "react-icons/md";

const SideNav = ()=>{
    const {
        server, fetchServer, company, companyRecord,
        setAlertState, setAlert, setAlertTimeout,
    } = useContext(ContextProvider)
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
          setAlertState('success')
          setAlert('.')
          setAlertTimeout(1)
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
            window.localStorage.setItem('lgt-mess', 'Logged Out Successfully!')
            window.localStorage.removeItem('ps-vw')
            window.localStorage.removeItem('acc-vw')
            window.location.reload()
        }
    }
    return(
        <>
        <div className='sidenav'>
            <div className='navheader'>{companyName.toUpperCase()}</div>
            {/* <div className='navheader'>{'ENTERPRISE COMPUTE'}</div> */}
            <nav className='navbox' onClick={handleNav}>
                <ul className='navbarr'>
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('dashboard')) && 
                        <div name="dashboard" className={'navdiv ' + (curPath==='dashboard'?'selected':'')}>
                            <BiSolidDashboard className='navdivicon' name="dashboard"/>
                            <div name="dashboard">Dashboard</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('reports')) && 
                        <div name="reports" className={'navdiv ' + (curPath==='reports'?'selected':'')}>
                            <BsTable className='navdivicon' name="reports"/>
                            <div name="reports">Reports</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('employees')) && 
                        <div name="employees" className={'navdiv ' + (curPath==='employees'?'selected':'')}>
                            <FaUsers className='navdivicon' name="employees"/>
                            <div name="employees">Employees</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('departments')) && 
                        <div name="departments" className={'navdiv ' + (curPath==='departments'?'selected':'')}>
                            <MdSubject className='navdivicon' name="departments"/>
                            <div name="departments">Departments</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('positions')) && 
                        <div name="positions" className={'navdiv ' + (curPath==='positions'?'selected':'')}>
                            <CgArrangeBack className='navdivicon' name="positions"/>
                            <div name="positions">Positions</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('attendance')) && 
                        <div name="attendance" className={'navdiv ' + (curPath==='attendance'?'selected':'')}>
                            <GiPlayerTime className='navdivicon' name="attendance"/>
                            <div name="attendance">Attendance</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('payroll')) && 
                        <div name="payroll" className={'navdiv ' + (curPath==='payroll'?'selected':'')}>
                            <SiPayloadcms className='navdivicon' name="payroll"/>
                            <div name="payroll">Payroll</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('inventory')) && 
                        <div name="inventory" className={'navdiv ' + (curPath==='inventory'?'selected':'')}>
                            <MdInventory className='navdivicon' name="inventory"/>
                            <div name="inventory">Inventory</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('sales')) && 
                        <div name="sales" className={'navdiv ' + (curPath==='sales'?'selected':'')}>
                            <GiPayMoney className='navdivicon' name="sales"/>
                            <div name="sales">Sales</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('pos')) && 
                        <div name="pos" className={'navdiv ' + (curPath==='pos'?'selected':'')}>
                            <GiPayMoney className='navdivicon' name="pos"/>
                            <div name="pos">POS</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('delivery')) && 
                        <div name="delivery" className={'navdiv ' + (curPath==='delivery'?'selected':'')}>
                            <MdDeliveryDining className='navdivicon' name="delivery"/>
                            <div name="delivery">Order Delivery</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('accommodations')) && 
                        <div name="accommodations" className={'navdiv ' + (curPath==='accommodations'?'selected':'')}>
                            <FaHotel className='navdivicon' name="accommodations"/>
                            <div name="accommodations">Accommodation</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('purchase')) && 
                        <div name="purchase" className={'navdiv ' + (curPath==='purchase'?'selected':'')}>
                            <GiBuyCard className='navdivicon' name="purchase"/>
                            <div name="purchase">Direct Purchase</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('expenses')) && 
                        <div name="expenses" className={'navdiv ' + (curPath==='expenses'?'selected':'')}>
                            <GiExpense className='navdivicon' name="expenses"/>
                            <div name="expenses">Admin Expenses</div>
                        </div>
                    }
                    {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('settings')) && 
                        <div name="settings" className={'navdiv ' + (curPath==='settings'?'selected':'')}>
                            <RiSettings2Fill className='navdivicon' name="settings"/>
                            <div name="settings">Settings</div>
                        </div>
                    }
                    <div
                        className ='navlogout'
                        onClick={logout}
                    ><MdLogout className='navlogouticon'/> {logStatus}</div>
                </ul>
            </nav>
        </div>
        </>
    )
}

export default SideNav