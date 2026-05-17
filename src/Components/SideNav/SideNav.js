import './SideNav.css'

import { useState, useEffect, useContext, useMemo } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useNavigate, useLocation } from 'react-router-dom'
import { BiSolidDashboard, BiMenu } from "react-icons/bi";
import { BsTable } from "react-icons/bs";
import { FaUsers, FaHotel } from "react-icons/fa";
import { SiPayloadcms } from "react-icons/si";
import { MdInventory, MdClose, MdSubject, MdDeliveryDining, MdLogout } from "react-icons/md";
import { GiPayMoney, GiPlayerTime, GiBuyCard, GiExpense } from "react-icons/gi";
import { RiSettings2Fill } from "react-icons/ri";
import { TbReportMoney } from "react-icons/tb";
import { CgArrangeBack } from "react-icons/cg";
import OfflineSyncModal from '../Offline Sync/OfflineSyncModal';
import { loadPendingChanges } from '../../Resources/offlineDb';

const SideNav = () => {
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
    const [inventoryApprovals, setInventoryApprovals] = useState([])
    const [allApprovals, setAllApprovals] = useState([])
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [offlinePendingCount, setOfflinePendingCount] = useState(0);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const location = useLocation()
    const Navigate = useNavigate()

    useEffect(() => {
        const curloc = location.pathname.slice(1,)
        setCurPath(curloc)
    }, [location])

    useEffect(() => {
        setAllApprovals(approvals.filter((appr) => {
            const permissionKey = appr.module === 'inventory' && appr.section === 'posttransfer'
                ? 'approve_posttransfer'
                : 'approve_post' + appr.module
            if (companyRecord?.status === 'admin' || companyRecord?.permissions.includes(permissionKey)) {
                return (
                    !appr.approved && !appr.message
                )
            }
        }))
        setSalesApprovals(approvals.filter((appr) => {
            return (
                (appr.module === 'sales'
                    && (!appr.approved && !appr.message))
            )
        }))
        setPurchaseApprovals(approvals.filter((appr) => {
            return (
                (appr.module === 'purchase' && (!appr.approved && !appr.message))
            )
        }))
        setAccommodationApprovals(approvals.filter((appr) => {
            return (
                (appr.module === 'accommodation' && (!appr.approved && !appr.message))
            )
        }))
        setAttendanceApprovals(approvals.filter((appr) => {
            return (
                (appr.module === 'attendance' && (!appr.approved && !appr.message))
            )
        }))
        setExpenseApprovals(approvals.filter((appr) => {
            return (
                (appr.module === 'expense' && (!appr.approved && !appr.message))
            )
        }))
        setInventoryApprovals(approvals.filter((appr) => {
            return (
                (appr.module === 'inventory' && (!appr.approved && !appr.message))
            )
        }))
    }, [approvals])

    useEffect(() => {
        if (companyRecord) {
            setCompanyName(companyRecord.name)
        }
    }, [companyRecord])

    const hasPermission = (permission) => {
        return companyRecord?.permissions?.includes('all') || companyRecord?.permissions?.includes(permission)
    }

    const companyInitials = useMemo(() => {
        return (companyName || 'Company')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase()
    }, [companyName])

    const refreshOfflinePendingCount = async () => {
        try {
            if (company && companyRecord?.emailid) {
                const list = await loadPendingChanges(company, companyRecord.emailid)
                setOfflinePendingCount((list || []).length)
            }
        } catch (e) {
            // ignore count errors
        }
    }

    useEffect(() => {
        refreshOfflinePendingCount()
        const id = setInterval(() => {
            refreshOfflinePendingCount()
        }, 30000);
        return () => clearInterval(id);
    }, [company, companyRecord?.emailid])

    const handleNav = (e) => {
        setIsMenuOpen(false)
        const navTarget = e.target.closest('[data-nav]')
        const name = navTarget?.getAttribute('data-nav')
        if (name) {
            setCurApproval(null)
            setAlertState('success')
            setAlert('.')
            setAlertTimeout(1)
            Navigate('/' + name)
        }
    }

    const logout = async () => {
        setLogStatus('Ending Session')
        const resps = await fetchServer("POST", {
            record: companyRecord
        }, "closeSession", server)

        if (resps.err) {
            console.log(resps.mess)
            setLogStatus('Log Out')
        } else {
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

    const navItems = [
        hasPermission('dashboard') && { name: 'dashboard', label: 'Dashboard', meta: 'Overview', icon: BiSolidDashboard },
        (hasPermission('journals') || hasPermission('reports')) && {
            name: 'journals',
            label: 'Journals & COA',
            meta: 'Accounting',
            icon: BsTable
        },
        hasPermission('employees') && { name: 'employees', label: 'Employees', meta: 'People', icon: FaUsers },
        hasPermission('departments') && { name: 'departments', label: 'Departments', meta: 'Teams', icon: MdSubject },
        hasPermission('positions') && { name: 'positions', label: 'Positions', meta: 'Roles', icon: CgArrangeBack },
        hasPermission('attendance') && {
            name: 'attendance',
            label: 'Attendance',
            meta: 'Time sheets',
            icon: GiPlayerTime,
            badge: hasPermission('approve_postattendance') ? attendanceApprovals.length : 0
        },
        hasPermission('payroll') && { name: 'payroll', label: 'Payroll', meta: 'Payouts', icon: SiPayloadcms },
        hasPermission('inventory') && {
            name: 'inventory',
            label: 'Inventory',
            meta: 'Stock',
            icon: MdInventory,
            badge: hasPermission('approve_posttransfer') ? inventoryApprovals.length : 0
        },
        hasPermission('sales') && {
            name: 'sales',
            label: 'Sales',
            meta: 'Revenue',
            icon: GiPayMoney,
            badge: hasPermission('approve_postsales') ? salesApprovals.length : 0
        },
        hasPermission('pos') && { name: 'pos', label: 'POS', meta: 'Counter', icon: GiPayMoney },
        hasPermission('delivery') && { name: 'delivery', label: 'Order Delivery', meta: 'Dispatch', icon: MdDeliveryDining },
        {
            name: 'offline-sync',
            label: 'Offline Sync',
            meta: 'Pending changes',
            icon: TbReportMoney,
            badge: offlinePendingCount,
            action: (e) => {
                e.stopPropagation();
                setShowOfflineModal(true)
            }
        },
        hasPermission('accommodations') && {
            name: 'accommodations',
            label: 'Accommodation',
            meta: 'Hospitality',
            icon: FaHotel,
            badge: hasPermission('approve_postaccommodation') ? accommodationApprovals.length : 0
        },
        hasPermission('purchase') && {
            name: 'purchase',
            label: 'Direct Purchase',
            meta: 'Procurement',
            icon: GiBuyCard,
            badge: hasPermission('approve_postpurchase') ? purchaseApprovals.length : 0
        },
        hasPermission('expenses') && {
            name: 'expenses',
            label: 'Admin Expenses',
            meta: 'Overheads',
            icon: GiExpense,
            badge: hasPermission('approve_postexpense') ? expenseApprovals.length : 0
        },
        hasPermission('settings') && { name: 'settings', label: 'Settings', meta: 'Control room', icon: RiSettings2Fill }
    ].filter(Boolean)

    const renderNavItem = ({ name, label, meta, icon: Icon, badge, action }) => {
        const displayBadge = Number(badge || 0)
        return (
            <div
                key={name}
                data-nav={name}
                className={'navdiv ' + (curPath === name ? 'selected' : '')}
                data-tooltip={label}
                onClick={action}
            >
                <div className='navdiviconwrap'>
                    <Icon className='navdivicon' />
                </div>
                <div className='navdivcopy'>
                    <div className='navdivlabel'>{label}</div>
                    <div className='navdivmeta'>{meta}</div>
                </div>
                {displayBadge > 0 && <div className='navdivcount'>{displayBadge > 99 ? '99+' : displayBadge}</div>}
            </div>
        )
    }

    return (
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
                    <div className='navbrand' style={{cursor: 'pointer'}} onClick={()=>{Navigate('/')}}>
                        <div className='navbrand-mark'>{companyInitials || 'CO'}</div>
                        {!isCollapsed && <div className='navbrand-copy'>
                            <span className='navbrand-title'>{companyName.toUpperCase()}</span>
                            <span className='navbrand-subtitle'>Operations Console</span>
                        </div>}
                    </div>
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
                        {navItems.map((item) => {
                            return renderNavItem(item)
                        })}
                    </ul>
                </nav>
                <div className='navfooter'>
                    <div className='navlogout' onClick={logout}>
                        <MdLogout className='navlogouticon' />
                        {!isCollapsed && <div className='navlogoutcopy'>
                            <div className='navlogouttitle'>{logStatus}</div>
                            <div className='navlogoutmeta'>End current session</div>
                        </div>}
                    </div>
                </div>
            </div>
            <OfflineSyncModal
                isOpen={showOfflineModal}
                onClose={() => {
                    setShowOfflineModal(false)
                    refreshOfflinePendingCount()
                }}
            />
        </>
    )
}

export default SideNav
