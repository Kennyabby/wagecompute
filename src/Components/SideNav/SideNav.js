import './SideNav.css'

import { useState, useEffect, useContext, useMemo } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useNavigate, useLocation } from 'react-router-dom'
import { BiSolidDashboard, BiMenu } from "react-icons/bi";
import { BsTable } from "react-icons/bs";
import { FaUsers, FaHotel, FaBoxes, FaHandshake } from "react-icons/fa";
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
        setAlertState, setAlert, setAlertTimeout, approvals, setCurApproval,
        isFullyConnected, isBrowserOnline, enabledModules
    } = useContext(ContextProvider)
    // The desktop build's own server is always local (127.0.0.1) — real
    // internet status doesn't affect whether it's reachable, so isBrowserOnline
    // (real navigator.onLine signal) is what's worth showing there, not
    // isFullyConnected (which also factors in a health-ping to the server,
    // a genuinely meaningful "are we actually connected" question only for
    // the web build, where the server really is remote).
    const isElectron = !!window.electronAPI?.isElectron
    const connectivitySignal = isElectron ? isBrowserOnline : isFullyConnected
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
    // Green "approved" counterparts to the red pending badges above — only
    // ever visible to the person who raised the request (via handlerId,
    // set to companyRecord.emailid at request time — App.js's
    // executeApprovalAction, and preserved through the later approve/reject
    // update since that write is a partial $set) or an admin. Clears itself
    // automatically the moment the underlying Approvals doc is posted or
    // deleted — nothing here ever needs a manual dismiss, since `approvals`
    // (the shared context array these all filter from) simply won't contain
    // that entry anymore once it's gone.
    const [salesApproved, setSalesApproved] = useState([])
    const [purchaseApproved, setPurchaseApproved] = useState([])
    const [attendanceApproved, setAttendanceApproved] = useState([])
    const [accommodationApproved, setAccommodationApproved] = useState([])
    const [expenseApproved, setExpenseApproved] = useState([])
    const [inventoryApproved, setInventoryApproved] = useState([])
    const [allApproved, setAllApproved] = useState([])
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
            if (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('all') || companyRecord?.permissions?.includes(permissionKey)) {
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

        const isAdminViewer = companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('all')
        const isMine = (appr) => appr.handlerId === companyRecord?.emailid
        const visibleToMe = (appr) => isAdminViewer || isMine(appr)
        setAllApproved(approvals.filter((appr) => appr.approved && visibleToMe(appr)))
        setSalesApproved(approvals.filter((appr) => appr.module === 'sales' && appr.approved && visibleToMe(appr)))
        setPurchaseApproved(approvals.filter((appr) => appr.module === 'purchase' && appr.approved && visibleToMe(appr)))
        setAccommodationApproved(approvals.filter((appr) => appr.module === 'accommodation' && appr.approved && visibleToMe(appr)))
        setAttendanceApproved(approvals.filter((appr) => appr.module === 'attendance' && appr.approved && visibleToMe(appr)))
        setExpenseApproved(approvals.filter((appr) => appr.module === 'expense' && appr.approved && visibleToMe(appr)))
        setInventoryApproved(approvals.filter((appr) => appr.module === 'inventory' && appr.approved && visibleToMe(appr)))
    }, [approvals, companyRecord])

    useEffect(() => {
        if (companyRecord) {
            setCompanyName(companyRecord.name)
        }
    }, [companyRecord])

    const hasPermission = (permission) => {
        return companyRecord?.permissions?.includes('all') || companyRecord?.permissions?.includes(permission)
    }

    // Tenant-level entitlement ceiling on top of the per-employee permission
    // check above — an employee can only be granted a module the tenant
    // itself has enabled. Only used for the top-level module nav gates below,
    // never for sub-permissions like approval badges (those aren't modules).
    const hasModuleAccess = (moduleKey) => {
        return (enabledModules || []).includes(moduleKey) && hasPermission(moduleKey)
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
        const clearLocalSession = () => {
            window.localStorage.removeItem('sess-recg-id')
            window.localStorage.removeItem('idt-curr-usr')
            window.localStorage.removeItem('sessn-id')
            window.localStorage.removeItem('curr-path')
            window.localStorage.removeItem('slvw')
            window.localStorage.removeItem('sldtl')
            window.localStorage.removeItem('sessn-cmp')
            window.localStorage.removeItem('pos-wrh')
            window.localStorage.removeItem('ps-vw')
            window.localStorage.removeItem('acc-vw')
            // Electron desktop build only: an explicit logout must fully
            // invalidate this database's ability to be silently resumed
            // later via Settings > Databases — otherwise the cached refresh
            // token would let someone switch straight back in without a
            // password, defeating the point of logging out. No-op on web
            // (electronAPI only exists inside the desktop shell).
            if (company) window.electronAPI?.clearTenantRefreshToken?.(company)
        }

        try {
            const resps = await fetchServer("POST", {
                record: companyRecord
            }, "closeSession", server)

            if (resps.err) {
                console.log(resps.mess)
                clearLocalSession()
                window.localStorage.setItem('lgt-mess', 'Logged out locally. The server session could not be closed.')
                Navigate('/login')
                return
            }

            clearLocalSession()
            window.localStorage.setItem('lgt-mess', 'Logged Out Successfully!')
            Navigate('/login')
        } catch (error) {
            console.warn('Logout failed remotely; clearing local session.', error)
            clearLocalSession()
            window.localStorage.setItem('lgt-mess', 'Logged out locally. The server session could not be closed.')
            Navigate('/login')
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
        hasModuleAccess('dashboard') && { name: 'dashboard', label: 'Dashboard', meta: 'Overview', icon: BiSolidDashboard },
        (hasModuleAccess('journals') || hasModuleAccess('reports')) && {
            name: 'journals',
            label: 'Journals & COA',
            meta: 'Accounting',
            icon: BsTable
        },
        hasModuleAccess('employees') && { name: 'employees', label: 'Employees', meta: 'People', icon: FaUsers },
        hasModuleAccess('departments') && { name: 'departments', label: 'Departments', meta: 'Teams', icon: MdSubject },
        hasModuleAccess('positions') && { name: 'positions', label: 'Positions', meta: 'Roles', icon: CgArrangeBack },
        hasModuleAccess('attendance') && {
            name: 'attendance',
            label: 'Attendance',
            meta: 'Time sheets',
            icon: GiPlayerTime,
            badge: hasPermission('approve_postattendance') ? attendanceApprovals.length : 0,
            approvedBadge: attendanceApproved.length
        },
        hasModuleAccess('payroll') && { name: 'payroll', label: 'Payroll', meta: 'Payouts', icon: SiPayloadcms },
        hasModuleAccess('inventory') && {
            name: 'inventory',
            label: 'Inventory',
            meta: 'Stock',
            icon: MdInventory,
            badge: hasPermission('approve_posttransfer') ? inventoryApprovals.length : 0,
            approvedBadge: inventoryApproved.length
        },
        hasModuleAccess('assets') && { name: 'assets', label: 'Assets', meta: 'Fixed assets', icon: FaBoxes },
        hasModuleAccess('sales') && {
            name: 'sales',
            label: 'Sales',
            meta: 'Revenue',
            icon: GiPayMoney,
            badge: hasPermission('approve_postsales') ? salesApprovals.length : 0,
            approvedBadge: salesApproved.length
        },
        hasModuleAccess('business-partners') && {
            name: 'business-partners',
            label: 'Customers & Vendors',
            meta: 'AR/AP ledgers',
            icon: FaHandshake
        },
        hasModuleAccess('pos') && { name: 'pos', label: 'POS', meta: 'Counter', icon: GiPayMoney },
        hasModuleAccess('delivery') && { name: 'delivery', label: 'Order Delivery', meta: 'Dispatch', icon: MdDeliveryDining },
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
        hasModuleAccess('accommodations') && {
            name: 'accommodations',
            label: 'Accommodation',
            meta: 'Hospitality',
            icon: FaHotel,
            badge: hasPermission('approve_postaccommodation') ? accommodationApprovals.length : 0,
            approvedBadge: accommodationApproved.length
        },
        hasModuleAccess('purchase') && {
            name: 'purchase',
            label: 'Direct Purchase',
            meta: 'Procurement',
            icon: GiBuyCard,
            badge: hasPermission('approve_postpurchase') ? purchaseApprovals.length : 0,
            approvedBadge: purchaseApproved.length
        },
        hasModuleAccess('expenses') && {
            name: 'expenses',
            label: 'Admin Expenses',
            meta: 'Overheads',
            icon: GiExpense,
            badge: hasPermission('approve_postexpense') ? expenseApprovals.length : 0,
            approvedBadge: expenseApproved.length
        },
        hasModuleAccess('settings') && { name: 'settings', label: 'Settings', meta: 'Control room', icon: RiSettings2Fill }
    ].filter(Boolean)

    // badge (red, pending — needs your action) and approvedBadge (green,
    // approved — your request just cleared) are independent and can both be
    // non-zero on the same item at once (e.g. you're both an approver with
    // something pending AND a requester whose own request just got
    // approved) — rendered as two separate small indicators, never merged
    // into one count.
    const renderNavItem = ({ name, label, meta, icon: Icon, badge, approvedBadge, action }) => {
        const displayBadge = Number(badge || 0)
        const displayApproved = Number(approvedBadge || 0)
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
                <div className='navdivbadges'>
                    {displayApproved > 0 && <div className='navdivcount navdivcount-approved' title='Approved — ready to post'>{displayApproved > 99 ? '99+' : displayApproved}</div>}
                    {displayBadge > 0 && <div className='navdivcount' title='Pending approval'>{displayBadge > 99 ? '99+' : displayBadge}</div>}
                </div>
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
                {allApproved?.length > 0 && (
                    <span className="mobile-menu-badge mobile-menu-badge-approved" title="Approved — ready to post">
                        {allApproved.length}
                    </span>
                )}
                {allApprovals?.length > 0 && (
                    <span className="mobile-menu-badge" title="Pending approval">
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
                {!isCollapsed && (
                    <div
                        className={`connectivity-indicator ${connectivitySignal ? 'online' : 'offline'} ${isElectron ? 'is-desktop' : ''}`}
                        title={
                            isElectron
                                ? (connectivitySignal ? 'Internet connection available' : "No internet connection — you're working locally, everything still works")
                                : (connectivitySignal ? 'Connected to server' : 'No connection to server — some actions require a live connection')
                        }
                    >
                        <span className='connectivity-dot' />
                        {connectivitySignal ? 'Online' : 'Offline'}
                    </div>
                )}
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
