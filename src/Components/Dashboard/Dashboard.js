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
import Assets from '../Assets/Assets'
import Accommodation from '../Accommodation/Accommodation'
import Purchase from '../Purchase/Purchase'
import Expenses from '../Expenses/Expenses'
import Settings from '../Settings/Settings'
import Journals from '../Journals/Journals'
import LicenseExpired from '../LandingPage/LicenseExpired'

const CORE_LEDGER_PAGES = new Set(['settings', 'journals', 'reports', 'employees', 'departments', 'positions'])

const LEDGER_REQUIREMENTS = {
    dashboard: {
        title: 'Platform dashboard',
        fields: [
            ['orders', 'revenueAccount', 'Orders revenue'],
            ['orders', 'receivableAccount', 'Orders receivable'],
            ['inventory', 'inventoryAccount', 'Inventory asset'],
            ['inventory', 'costOfSalesAccount', 'Cost of sales'],
            ['inventory', 'workInProgressAccount', 'Production WIP'],
            ['inventory', 'productionVarianceAccount', 'Production variance'],
            ['purchase', 'directExpenseAccount', 'Direct purchase account'],
            ['purchase', 'payableAccount', 'Purchase payable'],
            ['expenses', 'payableAccount', 'Expense payable'],
            ['accommodations', 'revenueAccount', 'Accommodation revenue'],
            ['accommodations', 'receivableAccount', 'Accommodation receivable'],
            ['rentals', 'revenueAccount', 'Rental revenue'],
            ['rentals', 'receivableAccount', 'Rental receivable'],
            ['sales', 'productRevenueAccount', 'Sales product revenue'],
            ['sales', 'employeeReceivableAccount', 'Employee receivable'],
            ['payroll', 'salaryExpenseAccount', 'Salary expense'],
            ['payroll', 'salaryPayableAccount', 'Salary payable'],
        ],
        lists: [
            ['paymentMethods', null, 'accountCode', 'Payment method'],
        ],
    },
    attendance: {
        title: 'Attendance',
        fields: [
            ['payroll', 'salaryExpenseAccount', 'Salary expense'],
            ['payroll', 'salaryPayableAccount', 'Salary payable'],
            ['payroll', 'employeeReceivableAccount', 'Employee receivable'],
        ],
    },
    payroll: {
        title: 'Payroll',
        fields: [
            ['payroll', 'salaryExpenseAccount', 'Salary expense'],
            ['payroll', 'salaryPayableAccount', 'Salary payable'],
            ['payroll', 'employeeReceivableAccount', 'Employee receivable'],
        ],
    },
    inventory: {
        title: 'Inventory',
        fields: [
            ['inventory', 'inventoryAccount', 'Inventory asset'],
            ['inventory', 'payableAccount', 'Inventory payable'],
            ['inventory', 'costOfSalesAccount', 'Cost of sales'],
            ['inventory', 'adjustmentAccount', 'Inventory adjustment'],
            ['inventory', 'workInProgressAccount', 'Production WIP'],
            ['inventory', 'productionVarianceAccount', 'Production variance'],
        ],
    },
    assets: {
        title: 'Assets',
        fields: [
            ['assets', 'fixedAssetAccount', 'Fixed asset account'],
            ['assets', 'accumulatedDepreciationAccount', 'Accumulated depreciation account'],
            ['assets', 'depreciationExpenseAccount', 'Depreciation expense account'],
            ['assets', 'payableAccount', 'Asset payable account'],
            ['assets', 'disposalGainAccount', 'Asset disposal gain account'],
            ['assets', 'disposalLossAccount', 'Asset disposal loss account'],
        ],
        lists: [
            ['paymentMethods', null, 'accountCode', 'Payment method'],
        ],
    },
    pos: {
        title: 'Point of Sales',
        fields: [
            ['orders', 'revenueAccount', 'Order revenue'],
            ['orders', 'receivableAccount', 'Order receivable'],
            ['inventory', 'inventoryAccount', 'Inventory asset'],
            ['inventory', 'costOfSalesAccount', 'Cost of sales'],
        ],
        lists: [
            ['paymentMethods', null, 'accountCode', 'Payment method'],
        ],
    },
    delivery: {
        title: 'Order delivery',
        fields: [
            ['orders', 'revenueAccount', 'Order revenue'],
            ['orders', 'receivableAccount', 'Order receivable'],
            ['inventory', 'inventoryAccount', 'Inventory asset'],
            ['inventory', 'costOfSalesAccount', 'Cost of sales'],
        ],
        lists: [
            ['paymentMethods', null, 'accountCode', 'Payment method'],
        ],
    },
    sales: {
        title: 'Sales',
        fields: [
            ['sales', 'productRevenueAccount', 'Product revenue'],
            ['sales', 'serviceRevenueAccount', 'Service revenue'],
            ['sales', 'employeeReceivableAccount', 'Employee receivable'],
            ['sales', 'salaryPayableAccount', 'Salary payable'],
        ],
        lists: [
            ['paymentMethods', null, 'accountCode', 'Payment method'],
            ['sales', 'salesPointMappings', 'revenueAccount', 'Sales point'],
        ],
    },
    accommodations: {
        title: 'Accommodation',
        fields: [
            ['accommodations', 'revenueAccount', 'Accommodation revenue'],
            ['accommodations', 'receivableAccount', 'Accommodation receivable'],
        ],
        lists: [
            ['paymentMethods', null, 'accountCode', 'Payment method'],
            ['accommodations', 'roomMappings', 'revenueAccount', 'Room'],
        ],
    },
    purchase: {
        title: 'Direct purchase',
        fields: [
            ['purchase', 'directExpenseAccount', 'Default purchase account'],
            ['purchase', 'payableAccount', 'Purchase payable'],
        ],
        lists: [
            ['paymentMethods', null, 'accountCode', 'Payment method'],
            ['purchase', 'categoryMappings', 'accountCode', 'Purchase category'],
        ],
    },
    expenses: {
        title: 'Admin expenses',
        fields: [
            ['expenses', 'payableAccount', 'Expense payable'],
        ],
        lists: [
            ['paymentMethods', null, 'accountCode', 'Payment method'],
            ['expenses', 'categoryMappings', 'accountCode', 'Expense category'],
        ],
    },
}

const getPostingAccountCodes = (chartOfAccounts = []) => {
    const codes = new Set()
    ;(chartOfAccounts || []).forEach((section) => {
        ;(section?.accounts || []).forEach((account) => {
            const headerType = String(account?.['header-type'] || '').toLowerCase()
            const code = account?.['g/l code']
            if (!['header', 'sub-header'].includes(headerType) && code !== undefined && code !== null && code !== '') {
                codes.add(String(Number(code)))
            }
        })
    })
    return codes
}

const getLedgerSetupStatus = (page, settings = [], chartOfAccounts = []) => {
    if (CORE_LEDGER_PAGES.has(page)) return { ready: true, missing: [], title: '' }

    const requirement = LEDGER_REQUIREMENTS[page]
    if (!requirement) return { ready: true, missing: [], title: '' }

    const missing = []
    const postingCodes = getPostingAccountCodes(chartOfAccounts)
    const mappings = (settings || []).find((setting) => setting?.name === 'accountingMappings')
    const modules = mappings?.modules || {}

    const hasValidCode = (code) => {
        if (code === undefined || code === null || code === '') return false
        return postingCodes.has(String(Number(code)))
    }

    if (!postingCodes.size) {
        missing.push('Initialize the Chart of Accounts so posting accounts are available.')
    }

    if (!mappings?.name) {
        missing.push('Create the Operational G/L Linking record from Settings or Journals.')
    }

    ;(requirement.fields || []).forEach(([moduleName, field, label]) => {
        if (!hasValidCode(modules?.[moduleName]?.[field])) {
            missing.push(`${label} is not linked to a valid posting account.`)
        }
    })

    ;(requirement.lists || []).forEach(([moduleName, listName, field, label]) => {
        const rows = listName ? modules?.[moduleName]?.[listName] : modules?.[moduleName]
        if (!Array.isArray(rows) || !rows.length) {
            missing.push(`${label} links are not available yet.`)
            return
        }

        rows.forEach((row) => {
            if (!hasValidCode(row?.[field])) {
                missing.push(`${label} "${row?.label || row?.key || 'Unnamed'}" is not linked to a valid posting account.`)
            }
        })
    })

    return {
        ready: missing.length === 0,
        missing: Array.from(new Set(missing)),
        title: requirement.title,
    }
}

const LedgerConfigurationBlock = ({ status, onOpenAccounting, onOpenCOA }) => (
    <div className='ledger-setup-block'>
        <div className='ledger-setup-dialog' role='dialog' aria-modal='true' aria-labelledby='ledger-setup-title'>
            <div className='ledger-setup-kicker'>Accounting setup required</div>
            <h2 id='ledger-setup-title'>{status.title} is waiting for G/L configuration</h2>
            <p>
                This page posts financial activity into the Chart of Accounts. Complete the required ledger links first so balances, reports, and live summaries stay correct.
            </p>
            <div className='ledger-setup-missing'>
                {status.missing.slice(0, 8).map((item, index) => (
                    <div className='ledger-setup-missing-row' key={`${item}-${index}`}>
                        <span>{index + 1}</span>
                        <p>{item}</p>
                    </div>
                ))}
                {status.missing.length > 8 && (
                    <div className='ledger-setup-more'>+{status.missing.length - 8} more item(s) need attention.</div>
                )}
            </div>
            <div className='ledger-setup-actions'>
                <button type='button' className='ledger-setup-secondary' onClick={onOpenCOA}>
                    Open Journals & COA
                </button>
                <button type='button' className='ledger-setup-primary' onClick={onOpenAccounting}>
                    Configure G/L Links
                </button>
            </div>
        </div>
    </div>
)

const Dashboard = ()=>{
    const {
        dashList, companyRecord, subscriptionState, showSubscriptionBanner,
        settings, chartOfAccounts
    } = useContext(ContextProvider)
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
            const guardPage = (page, element) => {
                const setupStatus = getLedgerSetupStatus(page, settings, chartOfAccounts)
                if (setupStatus.ready) return element
                return (
                    <LedgerConfigurationBlock
                        status={setupStatus}
                        onOpenCOA={() => Navigate('/journals')}
                        onOpenAccounting={() => Navigate('/settings?view=accounting')}
                    />
                )
            }
            if (path === 'dashboard' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('dashboard'))){
                setView(guardPage(path, <DashView/>))
            }else if (path === 'employees' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('employees'))){
                setView(<Employees/>)
            }else if (path === 'departments' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('departments'))){
                setView(<Departments/>)
            }
            else if (path === 'positions' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('positions'))){
                setView(<Positions/>)
            }
            else if (path === 'attendance' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('attendance'))){
                setView(guardPage(path, <Attendance/>))
            }
            else if (path === 'payroll' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('payroll'))){
                setView(guardPage(path, <Payroll/>))
            }else if (path === 'pos' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('pos'))){
                setView(guardPage(path, <PointOfSales/>))
            }else if (path === 'delivery' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('delivery'))){
                setView(guardPage(path, <Delivery/>))
            }else if (path === 'sales' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('sales'))){
                setView(guardPage(path, <Sales/>))
            }else if (path === 'inventory' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('inventory'))){
                setView(guardPage(path, <Inventory/>))
            }else if (path === 'assets' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('assets'))){
                setView(guardPage(path, <Assets/>))
            }else if (path === 'accommodations' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('accommodations'))){
                setView(guardPage(path, <Accommodation/>))
            }else if (path === 'purchase' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('purchase'))){
                setView(guardPage(path, <Purchase/>))
            }else if (path === 'expenses' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('expenses'))){
                setView(guardPage(path, <Expenses/>))
            }else if ((path === 'journals' || path === 'reports') && (
                companyRecord?.status === 'admin'
                || companyRecord?.permissions?.includes('journals')
                || companyRecord?.permissions?.includes('reports')
            )){
                setView(<Journals/>)
            }else if (path === 'settings' && (companyRecord?.status === 'admin' || companyRecord?.permissions?.includes('settings'))){
                setView(<Settings/>)
            }else{
                setView('')
            }
        }
    },[params,companyRecord,subscriptionState,settings,chartOfAccounts,Navigate,dashList])
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
                            {companyRecord?.status === 'admin' && <button
                                className='subscription-top-banner-btn'
                                onClick={() => Navigate('/settings?view=billing')}
                            >
                                Open Billing
                            </button>}
                        </div>
                    )}
                    {view}
                </div>
            </div>
        </>
    )
}

export default Dashboard
