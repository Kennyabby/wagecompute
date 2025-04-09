import './Dashboard.css'

import { useEffect, useState, useContext } from 'react'
import { useParams } from 'react-router-dom'
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
import Reports from '../Reports/Reports'
import Settings from '../Settings/Settings'

const Dashboard = ()=>{
    const {server, storePath, dashList, companyRecord} = useContext(ContextProvider)
    const [view, setView] = useState(null)
    const params = useParams()
    
    useEffect(()=>{
        const path = params.id
        if (dashList.includes(path)){
            const index = dashList.indexOf(path)
            if (index===0 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('dashboard'))){
                setView(<DashView/>)
            }else if (index === 1 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('employees'))){
                setView(<Employees/>)
            }else if (index === 2 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('departments'))){
                setView(<Departments/>)
            }
            else if (index === 3 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('positions'))){
                setView(<Positions/>)
            }
            else if (index === 4 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('attendance'))){
                setView(<Attendance/>)
            }
            else if (index === 5 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('payroll'))){
                setView(<Payroll/>)
            }else if (index === 6 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('pos'))){
                setView(<PointOfSales/>)            
            }else if (index === 7 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('delivery'))){
                setView(<Delivery/>)
            }else if (index === 8 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('sales'))){
                setView(<Sales/>)
            }else if (index === 9 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('inventory'))){
                setView(<Inventory/>)
            }else if (index === 10 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('accommodations'))){
                setView(<Accommodation/>)            
            }else if (index === 11 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('purchase'))){
                setView(<Purchase/>)
            }else if (index === 12 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('expenses'))){
                setView(<Expenses/>)
            }else if (index === 13 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('reports'))){
                setView(<Reports/>)
            }else if (index === 14 && (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('settings'))){
                setView(<Settings/>)
            }else{
                setView('')
            }
        }
    },[params,companyRecord])
    return(
        <>
            <div className='dashboard'>
                <SideNav/>  
                <div className='mainview'>
                    {view}
                </div>
            </div>
        </>
    )
}

export default Dashboard