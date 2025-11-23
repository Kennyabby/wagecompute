import './SideNav.css'

import { useState, useEffect, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useNavigate, useLocation } from 'react-router-dom'
import { BiSolidDashboard, BiMenu } from "react-icons/bi";
import { BsTable, BsBoxArrowInRight } from "react-icons/bs";
import { FaUsers, FaUserCog, FaUserTie, FaMoneyBillWave, FaWarehouse, FaUserCheck, FaFileInvoiceDollar, FaHotel } from "react-icons/fa";
import { SiPayloadcms } from "react-icons/si";
import { MdInventory, MdClose, MdSubject, MdDeliveryDining, MdLogout } from "react-icons/md";
import { GiPayMoney, GiReceiveMoney, GiTakeMyMoney, GiMoneyStack, GiPlayerTime, GiBuyCard, GiExpense } from "react-icons/gi";
import { RiLogoutBoxLine, RiSettings2Fill } from "react-icons/ri";
import { TbReportMoney } from "react-icons/tb";
import { CgArrangeBack } from "react-icons/cg";

const SideNav = ()=>{
    const {
        server, fetchServer, company, companyRecord,
        setAlertState, setAlert, setAlertTimeout, approvals, setCurApproval
    } = useContext(ContextProvider)
    const [companyName, setCompanyName] = useState('....') 
    const [curPath, setCurPath] = useState('')
    const [logStatus, setLogStatus] = useState('Log Out')
    const [salesApprovals, setSalesApprovals] = useState([])
    const [purchaseApprovals, setPurchaseApprovals] = useState([])
    const [attendanceApprovals, setAttendanceApprovals] = useState([])
    const [accommodationApprovals, setAccommodationApprovals] = useState([])
    const [expenseApprovals, setExpenseApprovals] = useState([])
    const [allApprovals, setAllApprovals] = useState([])
    const [isCollapsed, setIsCollapsed] = useState(false);
    const location = useLocation()
    const Navigate = useNavigate()

    useEffect(()=>{
        const curloc = location.pathname.slice(1,)
        setCurPath(curloc)
    },[location])
   
    useEffect(()=>{
        setAllApprovals(approvals.filter((appr)=>{
            if (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('approve_post'+appr.module)){
                return(
                    !appr.approved && !appr.message
                )
            }
        }))
        setSalesApprovals(approvals.filter((appr)=>{
            return (
                (appr.module === 'sales' 
                && (!appr.approved && !appr.message))
            )
        }))
        setPurchaseApprovals(approvals.filter((appr)=>{
            return (
                (appr.module === 'purchase' && (!appr.approved && !appr.message))
            )
        }))
        setAccommodationApprovals(approvals.filter((appr)=>{
            return (
                (appr.module === 'accommodation' && (!appr.approved && !appr.message))
            )
        }))
        setAttendanceApprovals(approvals.filter((appr)=>{
            return (
                (appr.module === 'attendance' && (!appr.approved && !appr.message))
            )
        }))
        setExpenseApprovals(approvals.filter((appr)=>{
            return (
                (appr.module === 'expense' && (!appr.approved && !appr.message))
            )
        }))
    },[approvals])

    useEffect(()=>{
        if (companyRecord){
            setCompanyName(companyRecord.name)
        }
    },[companyRecord])

    const handleNav = (e)=>{
        setIsMenuOpen(false)
        const name = e.target.getAttribute('name')
        if(name){
          setCurApproval(null)
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
    
    // Toggle mobile menu
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };
    
    // Close menu when a nav item is clicked (for mobile)
    const handleNavClick = (e) => {
        handleNav(e);
        if (window.innerWidth <= 768) {
            setIsMenuOpen(false);
        }
    };
    
    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isMenuOpen && !e.target.closest('.sidenav') && !e.target.closest('.mobile-menu-btn')) {
                setIsMenuOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);
    
    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
        // Save state to localStorage
        localStorage.setItem('sidenavCollapsed', !isCollapsed);
    };

    // Load collapsed state from localStorage on component mount
    useEffect(() => {
        const savedState = localStorage.getItem('sidenavCollapsed');
        if (savedState !== null) {
            setIsCollapsed(savedState === 'true');
        }
    }, []);

    return(
        <>
            <button 
                className="mobile-menu-btn" 
                onClick={toggleMenu} 
                aria-label="Toggle menu"
            >
                {isMenuOpen ? <MdClose /> : <BiMenu />}
                {allApprovals?.length > 0 && (
                    <span className="mobile-menu-badge">
                        {allApprovals.length}
                    </span>
                )}
            </button>
            
            <div className={`menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}></div>
            <div className={`sidenav ${isMenuOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div className='navheader'>
                    {!isCollapsed && <span>{companyName.toUpperCase()}</span>}
                    {/* {!isCollapsed && <span>{'TEST COMPANY'}</span>} */}
                    <button 
                        className="collapse-btn" 
                        onClick={toggleCollapse}
                        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isCollapsed ? '→' : '←'}
                    </button>
                </div>
                <nav className='navbox' onClick={handleNavClick}>
                    <ul className='navbarr'>
                        {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('dashboard')) && 
                            <div 
                                name="dashboard" 
                                className={'navdiv ' + (curPath==='dashboard'?'selected':'')}
                                data-tooltip="Dashboard"
                            >
                                <BiSolidDashboard className='navdivicon' name="dashboard"/>
                                <div name="dashboard">Dashboard</div>
                            </div>
                        }
                        {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('reports')) && 
                            <div 
                                name="reports" 
                                className={'navdiv ' + (curPath==='reports'?'selected':'')}
                                data-tooltip="Reports"
                            >
                                <BsTable className='navdivicon' name="reports"/>
                                <div name="reports">Reports</div>
                            </div>
                        }
                        {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('employees')) && 
                            <div 
                                name="employees" 
                                className={'navdiv ' + (curPath==='employees'?'selected':'')}
                                data-tooltip="Employees"
                            >
                                <FaUsers className='navdivicon' name="employees"/>
                                <div name="employees">Employees</div>
                            </div>
                        }
                        {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('departments')) && 
                            <div 
                                name="departments" 
                                className={'navdiv ' + (curPath==='departments'?'selected':'')}
                                data-tooltip="Departments"
                            >   
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
                                {(companyRecord?.status==='admin' || companyRecord?.permissions.includes('approve_postattendance')) && attendanceApprovals.length > 0 && <div className='navdivcount'>{attendanceApprovals.length}</div>}
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
                                {(companyRecord?.status==='admin' || companyRecord?.permissions.includes('approve_postsales')) && salesApprovals.length > 0 && <div className='navdivcount'>{salesApprovals.length}</div>}
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
                                {(companyRecord?.status==='admin' || companyRecord?.permissions.includes('approve_postaccommodation')) && accommodationApprovals.length > 0 && <div className='navdivcount'>{accommodationApprovals.length}</div>}
                            </div>
                        }
                        {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('purchase')) && 
                            <div name="purchase" className={'navdiv ' + (curPath==='purchase'?'selected':'')}>
                                <GiBuyCard className='navdivicon' name="purchase"/>
                                <div name="purchase">Direct Purchase</div>
                                {(companyRecord?.status==='admin' || companyRecord?.permissions.includes('approve_postpurchase')) && purchaseApprovals.length > 0 && <div className='navdivcount'>{purchaseApprovals.length}</div>}
                            </div>
                        }
                        {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('expenses')) && 
                            <div name="expenses" className={'navdiv ' + (curPath==='expenses'?'selected':'')}>
                                <GiExpense className='navdivicon' name="expenses"/> 
                                <div name="expenses">Admin Expenses</div>
                                {(companyRecord?.status==='admin' || companyRecord?.permissions.includes('approve_postexpense')) && expenseApprovals.length > 0 && <div className='navdivcount'>{expenseApprovals.length}</div>}                           
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