import './Dashboard.css'

import { useEffect, useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ContextProvider from '../../Resources/ContextProvider'
import SideNav from '../SideNav/SideNav'
import DashView from '../DashView/DashView'
import Employees from '../Employees/Employees'
import Positions from '../Positions/Positions'
import Departments from '../Departments/Departments'
import Attendance from '../Attendance/Attendance'
import Payroll from '../Payroll/Payroll'
import Sales from '../Sales/Sales'
import PointOfSales from '../PointOfSales/PointOfSales'
import Delivery from '../Delivery/Delivery'
import Inventory from '../Inventory/Inventory'
import Accommodation from '../Accommodation/Accommodation'
import Purchase from '../Purchase/Purchase'
import Expenses from '../Expenses/Expenses'
import Settings from '../Settings/Settings'
import Journals from '../Journals/Journals'
import LicenseExpired from '../LandingPage/LicenseExpired'

const Dashboard = ()=>{
    const {server, storePath, dashList, companyRecord, subscriptionState, showSubscriptionBanner} = useContext(ContextProvider)
    const [view, setView] = useState(null)
    const params = useParams()
    const Navigate = useNavigate()
    useEffect(()=>{
        const path = params.id
        if (dashList.includes(path)){
            if (subscriptionState?.isSuspended && path !== 'settings') {
                setView(<LicenseExpired />)
                return
            }
            if (path === 'dashboard' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('dashboard'))){
                setView(<DashView/>)
            }else if (path === 'employees' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('employees'))){
                setView(<Employees/>)
            }else if (path === 'departments' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('departments'))){
                setView(<Departments/>)
            }
            else if (path === 'positions' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('positions'))){
                setView(<Positions/>)
            }
            else if (path === 'attendance' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('attendance'))){
                setView(<Attendance/>)
            }
            else if (path === 'payroll' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('payroll'))){
                setView(<Payroll/>)
            }else if (path === 'pos' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('pos'))){
                setView(<PointOfSales/>)            
            }else if (path === 'delivery' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('delivery'))){
                setView(<Delivery/>)
            }else if (path === 'sales' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('sales'))){
                setView(<Sales/>)
            }else if (path === 'inventory' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('inventory'))){
                setView(<Inventory/>)
            }else if (path === 'accommodations' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('accommodations'))){
                setView(<Accommodation/>)            
            }else if (path === 'purchase' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('purchase'))){
                setView(<Purchase/>)
            }else if (path === 'expenses' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('expenses'))){
                setView(<Expenses/>)
            }else if ((path === 'journals' || path === 'reports') && (
                companyRecord?.status === 'admin'
                || companyRecord?.permissions.includes('journals')
                || companyRecord?.permissions.includes('reports')
            )){
                setView(<Journals/>)
            }else if (path === 'settings' && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('settings'))){
                setView(<Settings/>)
            }else{
                setView('')
            }
        }
    },[params,companyRecord,subscriptionState])
    return(
        <>
            <div className='dashboard'>
                <SideNav/>  
                <div className='mainview'>
                    {showSubscriptionBanner && (
                        <div className={`subscription-top-banner ${subscriptionState?.isSuspended ? 'critical' : 'warning'}`}>
                            <div className='subscription-top-banner-copy'>
                                <strong>
                                {subscriptionState?.trialActive && !subscriptionState?.hasConfiguredSubscription
                                    ? `Free trial ends in ${subscriptionState?.trialDaysRemaining ?? '--'} day(s).`
                                    : (subscriptionState?.isSuspended
                                      ? 'Workspace subscription is inactive.'
                                      : `Subscription expires in ${subscriptionState?.daysToExpiry ?? '--'} day(s).`)}
                                </strong>
                                <span>
                                {subscriptionState?.trialActive && !subscriptionState?.hasConfiguredSubscription
                                    ? `Your ${subscriptionState?.trialDaysRemaining ?? '--'}-day trial is active until ${subscriptionState?.trialExpiresAt ? new Date(Number(subscriptionState.trialExpiresAt)).toLocaleDateString() : '--'}. Subscribe now to avoid interruption.`
                                    : (subscriptionState?.isSuspended
                                      ? 'Renew or reactivate this tenant from Settings to restore full access.'
                                      : `Current plan ends on ${subscriptionState?.expiresAt ? new Date(Number(subscriptionState.expiresAt)).toLocaleDateString() : '--'}.`)}
                                </span>
                            </div>
                            <button
                                className='subscription-top-banner-btn'
                                onClick={() => Navigate('/settings')}
                            >
                                Open Billing
                            </button>
                        </div>
                    )}
                    {view}
                </div>
            </div>
        </>
    )
}

export default Dashboard
