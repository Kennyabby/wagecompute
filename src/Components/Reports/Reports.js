import './Reports.css'

import { useState, useEffect, useContext } from 'react'
import ContextProvider from '../../Resources/ContextProvider'

const Reports = ()=>{
    const { storePath,
        server, 
        fetchServer,
        companyRecord,
        company, getDate,
        employees, months, getExpenses, getSales, getPurchase,
        alert,alertState,alertTimeout,actionMessage, 
        setAlert, setAlertState, setAlertTimeout, setActionMessage
    } = useContext(ContextProvider)

    useEffect(()=>{
        storePath('reports')  
    },[storePath])

    const [filterFrom, setFilterFrom] = useState(new Date(new Date().getFullYear(), 0, 2).toISOString().slice(0,10))
    const [filterTo, setFilterTo] = useState(new Date(Date.now()).toISOString().slice(0,10))
    const reports = ['PROFIT & LOSS', 'TRIAL BALANCE', 'CHART OF ACCOUNTS']
    const [curReport, setCurReport] = useState({})

    const handleReportSelection = (e)=>{
        const name = e.target.getAttribute('name')
        if (name){
            setCurReport({
                title:name,
                data:[]
            })
        }
    }
    return (
        <>
            <div className='reports'>
                <div className='reports-list' onClick={handleReportSelection}>
                    {reports.map((report, id)=>{
                        return <div className={'report-card'+(curReport.title===report?' report-selected':'')} name={report} key={id}>
                            {report}
                        </div>
                    })}
                </div>
                <div className='reports-cover'>
                    <div className='reports-view'>
                        {curReport.title?<div>
                            <div className='report-title'>
                                {curReport.title + ' - REPORT'}
                            </div>
                            <div className='report-table'></div>

                        </div> 
                        :<div className='no-report'>
                            <div>Select Report To View!</div>
                        </div>}
                    </div>
                    <div className='reports-filter'>
                        <div className='inp-cov'>
                            <div className='inpcov reppad'>
                                <div>Date From</div>
                                <input 
                                    className='forminp inppad'
                                    name='salesfrom'
                                    type='date'
                                    placeholder='From'
                                    value={filterFrom}
                                    disabled={companyRecord.status!=='admin'}
                                    onChange={(e)=>{
                                        setFilterFrom(e.target.value)
                                    }}
                                />
                            </div>
                            <div className='inpcov reppad'>
                                <div>Date To</div>
                                <input 
                                    className='forminp inppad'
                                    name='salesto'
                                    type='date'
                                    placeholder='To'
                                    value={filterTo}
                                    disabled={companyRecord.status!=='admin'}
                                    onChange={(e)=>{
                                        setFilterTo(e.target.value)
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Reports