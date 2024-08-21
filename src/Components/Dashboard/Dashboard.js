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
import Settings from '../Settings/Settings'

const Dashboard = ()=>{
    const {server, storePath, dashList} = useContext(ContextProvider)
    const [view, setView] = useState(null)
    const params = useParams()
    
    useEffect(()=>{
        const path = params.id
        if (dashList.includes(path)){
            const index = dashList.indexOf(path)
            if (index===0){
                setView(<DashView/>)
            }else if (index === 1){
                setView(<Employees/>)
            }else if (index === 2){
                setView(<Departments/>)
            }
            else if (index === 3){
                setView(<Positions/>)
            }
            else if (index === 4){
                setView(<Attendance/>)
            }
            else if (index === 5){
                setView(<Payroll/>)
            }
            else if (index === 6){
                setView(<Settings/>)
            }
        }
    },[params])
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