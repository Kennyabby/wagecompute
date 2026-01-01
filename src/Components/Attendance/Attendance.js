import './Attendance.css'

import {useEffect, useState, useContext, useRef } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import ApprovalBox from '../../Resources/ApprovalBox/ApprovalBox';
import { mkConfig, generateCsv, asString } from "export-to-csv";

import * as XLSX from 'xlsx';

const csvConfig = mkConfig({ useKeysAsHeaders: true }); 

const Attendance = () =>{
    const {storePath,
        server, fetchServer, intervalPeriod,
        months, monthDays,years,
        company, companyRecord, getDate,
        attendance, setAttendance, getAttendance, getEmployees,
        employees, settings, runApprovalWorkFlow, approvals, getApprovals, removeApproval,
        curApproval, setCurApproval, postApprovalUpdate, showApprovalBox, setShowApprovalBox, 
        setApprovalStatus, setApprovalMessage, setAlert, setAlertState, setAlertTimeout
    } = useContext(ContextProvider)
    const fileInputRef = useRef(null);
    const [iCols, setICols] = useState([])
    const [rawData, setRawData] = useState([])
    const [add, setAdd] = useState(false)
    const [fields, setFields] = useState({})
    const [upload, setUpload] = useState(true)
    const [calId, setCalId] = useState('')
    const [calDur, setCalDur] = useState('')
    const [month, setMonth] = useState('')
    const [year, setYear] = useState('')
    const [durationFormat, setDurationFormat] = useState('fmt2')
    const [viewNo, setViewNo] = useState(null)
    
    const [attendanceApprovals, setAttendanceApprovals] = useState([])
    const [isApprover, setIsApprover] = useState(false)
    useEffect(()=>{
        storePath('attendance')  
    },[storePath])
    useEffect(()=>{
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        getApprovals(cmp_val, companyRecord)
        getEmployees(cmp_val, companyRecord)
        getAttendance(cmp_val, companyRecord)
        const intervalId = setInterval(()=>{
          if (cmp_val){
            getApprovals(cmp_val, companyRecord)
            getEmployees(cmp_val, companyRecord)
            getAttendance(cmp_val, companyRecord)
          }
        },intervalPeriod)
        return () => clearInterval(intervalId);
    },[window.localStorage.getItem('sessn-cmp')])

    const [columns, setColumns] = useState([])
    const [selectedCols, setSelectedCols] = useState([])
    useEffect(()=>{
        if (settings?.length){
            const colSetFilt = settings.filter((setting)=>{
                return setting.name === 'import_columns'
            })
            delete colSetFilt[0]?._id
            setColumns(colSetFilt[0]?colSetFilt[0].import_columns:[])
        }
    },[settings])

    useEffect(()=>{
        setAttendanceApprovals(approvals.filter((appr)=>{
            return (
                appr.module === 'attendance'
                && appr.section.toUpperCase() === 'postAttendance'.toUpperCase()
            )
        }))
        
    }, [approvals])

    useEffect(()=>{
        if(companyRecord?.permissions.includes('postAttendance') || companyRecord?.status==='admin'){
            if (upload){
                setIsApprover(true)
            }else{
                setIsApprover(false)
            }
        }
    },[companyRecord, upload])

    useEffect(()=>{
        if (curApproval){
            setViewNo(curApproval.data.no)
            setAdd(false)
        }
    },[curApproval])
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);

            // Read the Excel file
            const workbook = XLSX.read(data, { type: 'array' });

            // Assume the first sheet is the one we want
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert the sheet to JSON, starting from the desired row (7 here since it's 0-indexed)
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Define the known column name to search for
            const knownColumnName = columns[0]; // Replace with your actual column name
            let headerRowIndex = null;

            // Search for the header row by finding the row that contains the known column name
            for (let i = 0; i < jsonData.length; i++) {
                if (jsonData[i].includes(knownColumnName)) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex === null) {
                console.error('Header row with the specified column name not found');
                return;
            }


            // Extract headers and rows starting from the specified row
            const headers = jsonData[headerRowIndex];
            setICols(headers)
            columns.forEach((column,i)=>{
                setFields((fields)=>{
                    return {
                        ...fields, [column]:''
                    }
                })
            })

            const rows = jsonData.slice(headerRowIndex + 1);

            // Map rows to objects
            const result = rows.map((row) => {
                let obj = {};
                row.forEach((cell, index) => {
                    obj[headers[index]] = cell;
                });
                return obj;
            });
            setUpload(false)
            setRawData(result); // Update the state with the parsed data
        };

        reader.readAsArrayBuffer(file);
    };

    const addAttendace = async (year, month, newAttendace, rawData)=>{
          const curNo = attendance.length+1
          const approvalData = {
            no:curNo,
            month,
            year,
            payees: newAttendace,
            record: rawData,
            createdAt: new Date(Date.now()).toISOString().slice(0, 10),
            lastUpdatedBy: companyRecord?.emailid,
            approvedBy: curApproval?.approvedBy || companyRecord?.emailid
          }          
          runApprovalWorkFlow(new Date(Date.now()).toISOString().slice(0, 10), curApproval, 'attendance', 'postattendance', 
            approvalData, ()=>{postAttendance(approvalData, curNo)}
          )                   
    }

    const postAttendance = async (approvalData, curNo)=>{
        setAlertState('info')
        setAlert('Posting Attendance...')
        setAlertTimeout(100000)
        const resps = await fetchServer("POST", {
          database: company,
            collection: "Attendance", 
            update: approvalData
        }, "createDoc", server)
        
        if (resps.err){
            setAlertState('error')
            setAlert(resps.mess)
            setAlertTimeout(3000)
            console.log(resps.mess)
        }else{            
            removeApproval(company, 'attendance', 'postattendance', {                        
                createdAt: approvalData.createdAt,
                postingDate: approvalData.postingDate                                                 
            })
            getAttendance(company, companyRecord)
            getApprovals(company, companyRecord)
            setCurApproval(null)
            setAlertState('success')
            setAlert('Attendance Loaded Successfully!')
            setAlertTimeout(3000)
            setAdd(false)
            setUpload(false)
            setViewNo(curNo)
            setICols([])
            setMonth('')
            setYear('')
            setCalId('')
            setCalDur('')
        }
    }

    const deleteAttendance = async (att)=>{
        setAlertState('info')
        setAlert('Deleting Attendance Data...')
        setAlertTimeout(100000)
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Attendance", 
            update: {no: att.no}
        }, "removeDoc", server)
        if (resps.err){
            setAlertState('error')
            setAlert(resps.mess)
            setAlertTimeout(3000)
            console.log(resps.mess)
        }else{
            setAlertState('success')
            setAlert('Deleted Attendance Data Successfully!')
            setAlertTimeout(3000)
            setAdd(true)
            setUpload(true)
            getAttendance(company)
        }
    }
    const converToId = (id)=>{
        var preId = id
        if (isNaN(preId)){
            preId = ''
            String(id).split('').forEach((val)=>{    
                if(!isNaN(val)){
                    preId += val.trim()
                }
            })
        }
        return preId.trim()
    }
    const converToHour = (hour)=>{
        var preHour = hour
        if (isNaN(preHour)){
            preHour = ''
            String(hour).split(' ').forEach((val)=>{    
                if(!isNaN(val)){
                    preHour += val.trim()
                }
            })
        }
        return String(preHour).trim()
    }
    const loadData = async () =>{
        if (curApproval === null){
            var newRawData = []
            var ids = []
            rawData.forEach((data)=>{
                const convertedId = converToId(data[fields[calId]])
                if (!ids.includes(convertedId)){
                    ids = ids.concat(convertedId)
                }
                var newRow = {}
                columns.forEach((col)=>{
                    newRow[col] = data[fields[col]]
                })
                newRawData = newRawData.concat(newRow)
            })
            var analyzedData = []
            ids.forEach((id)=>{
                var newRow = {}
                newRow[calId] = id
                var totalHours = 0
                var totalDays = 0
                var totalPay = 0
                var payPerDay = 0
                var expectedWorkDays = ''
                employees.forEach((emp)=>{
                    if (String(emp.i_d) === String(id)){
                        if (emp.expectedWorkDays){
                            expectedWorkDays = Number(emp.expectedWorkDays)
                            payPerDay = Number(emp.salary)/expectedWorkDays
                        }else{
                            payPerDay = Number(emp.salary)/monthDays[month]
                        }
                    }
                })
                newRawData.forEach((data)=>{
                    if (data[calId]===id){
                        var curHour;
                        if (durationFormat==='fmt1'){
                            const [hour,minute] = data[calDur].split(':')
                            curHour = parseFloat(Number(hour) + Number(minute)/60)
                        }else if (durationFormat==='fmt2'){
                            curHour = Number(converToHour(data[calDur]))
                        }
                        totalHours += curHour
                        if(curHour>=5){
                            totalDays += 1
                        }else if (curHour>=1 && curHour<5){
                            totalDays += 0.5
                        }
                    }
                })
                totalPay = parseFloat(Number(payPerDay * totalDays)).toFixed(2)
                newRow['Expected Work Days'] = expectedWorkDays ? expectedWorkDays : monthDays[month]
                newRow['Total Hours'] = totalHours
                newRow['Total Days'] = totalDays
                newRow['Total Pay'] = totalPay
                analyzedData = analyzedData.concat(newRow)
            })
            addAttendace(year, month, analyzedData, rawData)
        }else{
            const {year, month, payees, record} = curApproval.data
            addAttendace(year, month, payees, record)
        }
    }
    const handleButtonClick = () => {
        fileInputRef.current.click();
    };
    const handleFields = (e) =>{
        const name = e.target.getAttribute('name')
        const value = e.target.value
        setFields((fields)=>{
            return {
                ...fields, [name]: value
            }
        })
        if (value){
            setSelectedCols((selectedCols)=>{
                return [...selectedCols, value]
            })
        }else{
            const filtSelection = selectedCols.filter((col)=>{
                return col !== value 
            })
            setSelectedCols([...filtSelection])
        }
    }
    return(
        <>
        <div className='attendance'>
            {showApprovalBox && <ApprovalBox
                onClose={()=>{
                    setShowApprovalBox(false)
                    setApprovalStatus(false)
                    setApprovalMessage('')
                }}
                module={'attendance'}
                section= {'postattendance'}
                postApprovalUpdate={()=>{
                    postApprovalUpdate(company, 'attendance', 'postattendance', curApproval)                        
                }}
            />}
            <div className='emplist attlist'>
                <div className='add'
                    onClick={()=>{
                        setAdd(true)
                        setViewNo(null)
                        setIsApprover(false)
                    }}
                >{'+'}</div>
                {[...attendanceApprovals, ...attendance].map((att, id)=>{
                    if (att.isApproval){
                        const {createdAt, postingDate, message, handlerId, approved, data, approvers} = att
                        const {no, month, year, payees} = data
                        var textColor = 'red'
                        if (approved){
                            textColor ='green'
                        }
                        return (
                            <div className={'dept sldept' + (curApproval?.createdAt===createdAt?' curview':'')} key={id} 
                                onClick={(e)=>{
                                    setViewNo(no)
                                    setAdd(false)
                                    if(companyRecord?.permissions.includes('postAttendance') || companyRecord?.status==='admin'){
                                        setIsApprover(true)
                                    }
                                    setCurApproval(att)
                                }}
                            >
                                <div className='dets sldets'>
                                    <div>Approval Type: <b>{'ATTENDANCE'}</b></div>
                                    <div>For: <b>{`${month}, ${year}`}</b></div>
                                    <div>Posting Date: <b>{getDate(postingDate)}</b></div>
                                    <div>Approval Status: <b style={{color: textColor}}>{message? 'REJECTED' : (approved? 'APPROVED': 'AWAITING APPROVAL')}</b></div>
                                    {message && <div>Message: <b>{message}</b></div>}
                                    <div className='deptdesc'>{`Requested By ID:`} <b>{`${handlerId}`}</b></div>
                                    {approvers?.length && 
                                        <div 
                                            className='deptdesc' 
                                            style={{
                                                fontWeight:'bold', 
                                                fontSize: '13px',
                                                color: 'greenyellow',
                                                background: 'rgba(0,0,0,0.7)',
                                                width: 'fit-content',
                                                padding: '5px',
                                                borderRadius: '8px',
                                                border: 'solid greenyellow 3px',
                                            }}
                                        > 
                                            ## ATTENDANCE VERIFIED ##
                                        </div>
                                    }
                                </div>
                                {companyRecord.status==='admin' && <div 
                                    className='edit'
                                    name='delete'         
                                    style={{color:'red'}}                           
                                    onClick={async ()=>{                                        
                                        setAlertState('info')
                                        setAlert('Deleting Approval Data...')
                                        setAlertTimeout(100000)

                                        const resp = await removeApproval(company, 'attendance', 'postattendance', {                        
                                            createdAt: createdAt,
                                            postingDate: postingDate                                                 
                                        })     
                                        
                                        if(resp.completed){
                                            setAlertState('success')
                                            setAlert('Deleted Approval Data Successfully!')
                                            setAlertTimeout(3000)
                                            setCurApproval(null)
                                        }

                                    }}
                                >
                                    Delete
                                </div>}
                                {companyRecord.status==='admin' && (curApproval!==null && !curApproval?.approved && !curApproval?.message) && <div 
                                    className='edit'
                                    name='approve'         
                                    style={{
                                        color:'green', 
                                        border: 'solid green 1.2px', 
                                        borderRadius: '8px',
                                        padding: '5px',
                                        fontSize: '.8em'
                                    }}
                                    onClick={async ()=>{
                                        loadData()
                                    }}
                                >
                                    Approve Request
                                </div>}
                                {(curApproval!==null && curApproval?.approved) && <div 
                                    className='edit'
                                    name='approve'         
                                    style={{
                                        color:'green', 
                                        border: 'solid green 1.2px', 
                                        borderRadius: '8px',
                                        padding: '5px',
                                        fontSize: '.8em'
                                    }}
                                    onClick={async ()=>{
                                        loadData()
                                    }}
                                >
                                    Post Attendance
                                </div>}
                            </div>
                        )
                    }else{
                        const {no, month, year, payees} = att
                        return(
                            <div className={'dept' + (viewNo===no?' curview':'')} key={id} name={no}
                                onClick={()=>{
                                    setViewNo(no)
                                    setAdd(false)
                                    setCurApproval(null)
                                }}
                            >
                                <div className='dets'>
                                    <div><b>No: </b>{no}</div>
                                    <div className='deptdesc'>{'Year: '+year}</div>
                                    <div className='deptdesc'>{'Month: '+month}</div>
                                    <div> <b>{payees.length}</b>{' Computed Pays'}</div>
                                </div>
                                {((months[(new Date()).getMonth()]===month && 
                                    String((new Date()).getFullYear())===String(year)) || 
                                    (String((new Date()).getFullYear())===String(year) && 
                                    months[(new Date()).getMonth()-1]===month &&
                                    [1,2,3,4,5,6,8,9,10].includes((new Date).getDate()))) && 
                                <div 
                                className='edit'
                                onClick={()=>{
                                    deleteAttendance(att)
                                }}>Delete</div>}
                            </div>
                        )
                    }
                  })}
            </div>
            <div className='empview attview'>
                { add ? <div className='addatt'>
                    <div className='checkbox'>
                        {iCols.length!==0 && <div onChange={handleFields}>
                            <div className='formtitle uplttl'>Select Excel Columns to Match Your Set Columns</div>
                            {columns.map((column,i)=>{
                                return <div className='icols' key={i}>
                                    <div>{column} {'=>'} </div>
                                    <select
                                        className='forminp'
                                        name={column}
                                        type='text'
                                        // value={fields[column]?fields[column]:''}
                                    >
                                        <option value=''>Select Related Column</option>
                                        {iCols.map((col,i)=>{
                                            return <option key={i} value={col}>{col}</option>
                                        })}
                                    </select>
                                </div>
                            })}
                            <div className='caldiv'>
                                <div className='inpcov formpad'>
                                    <div>ID Column</div>
                                    <select
                                        className='forminp'
                                        name='calId'
                                        type='text'
                                        value={calId}
                                        onChange={(e)=>{
                                            setCalId(e.target.value)
                                        }}
                                    >
                                        <option value=''>Select Computaion ID</option>
                                        {columns.map((col,i)=>{
                                            return <option key={i} value={col}>{col}</option>
                                        })}
                                    </select>
                                </div>
                                <div className='inpcov formpad'>
                                    <div>Duration Column</div>
                                    <select
                                        className='forminp'
                                        name='calDur'
                                        type='text'
                                        value={calDur}
                                        onChange={(e)=>{
                                            setCalDur(e.target.value)
                                        }}
                                    >
                                        <option value=''>Select Duration Column</option>
                                        {columns.map((col,i)=>{
                                            return <option key={i} value={col}>{col}</option>
                                        })}
                                    </select>
                                </div>
                                <div className='inpcov formpad'>
                                    <div>Duration Format</div>
                                    <select
                                        className='forminp'
                                        name='durationFormat'
                                        type='text'
                                        value={durationFormat}
                                        onChange={(e)=>{
                                            setDurationFormat(e.target.value)
                                        }}
                                    >
                                        <option value=''>Select Duration Format</option>
                                        <option value='fmt1'>00:00</option>
                                        <option value='fmt2'>0 Hour(s)</option>
                                    </select>
                                </div>
                                <div className='inpcov formpad'>
                                    <div>SELECT YEAR</div>
                                    <select
                                        className='forminp'
                                        name='year'
                                        type='text'
                                        value={year}
                                        onChange={(e)=>{
                                            setYear(e.target.value)
                                        }}
                                    >
                                        <option value=''>Select Computaion Year</option>
                                        {years.map((year,i)=>{
                                            return <option key={i} value={year}>{year}</option>
                                        })}
                                    </select>
                                </div>
                                <div className='inpcov formpad'>
                                    <div>SELECT MONTH</div>
                                    <select
                                        className='forminp'
                                        name='month'
                                        type='text'
                                        value={month}
                                        onChange={(e)=>{
                                            setMonth(e.target.value)
                                        }}
                                    >
                                        <option value=''>Select Computaion Month</option>
                                        {months.map((month,i)=>{
                                            return <option key={i} value={month}>{month}</option>
                                        })}
                                    </select>
                                </div>
                                
                            </div>
                        </div>}
                    </div>
                    <div className='upldbox'>
                        {upload ? <div className='uplbtn'onClick={handleButtonClick}>Upload Excel File</div>:
                            <div className='aftupl'>
                                <div
                                    onClick={loadData}
                                >{curApproval ? (curApproval.approved? 'Load': (isApprover?'Approve Request':'Request Approval')) : (isApprover?'Approve Request':'Request Approval')}</div>
                                <div
                                    onClick={()=>{
                                        setICols([])
                                        setRawData([])
                                        setUpload(true)
                                    }}
                                >Discard</div>
                            </div>
                        }
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileUpload} 
                        />
                    </div>

                    {/* <pre>{JSON.stringify(excelData, null, 2)}</pre> */}
                </div>:
                <div style={{position:'relative'}}>
                    {<button style={{position: 'absolute', top: '0px', right: '0px'}} onClick={()=>{
                        const data = curApproval?.data ? curApproval?.data?.record : attendance.find((att)=>{return String(att.no) === String(viewNo)})?.record
                        if (data){
                            
                            const headers = Object.keys(data[0]);
                            const rows = data.map(obj => headers.map(header => obj[header]));
    
                            let csvContent =
                            headers.join(",") +
                            "\n" +
                            rows.map(e => e.join(",")).join("\n");
    
                            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
    
                            link.href = url;
                            link.setAttribute("download", "attendance_record.csv");
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }else{
                            setAlertState('error')
                            setAlert('No Data Available to Export')
                            setAlertTimeout(3000)
                        }
                    }}>
                        Export Attendance
                    </button>}
                    {
                        (curApproval? [...attendance, {...curApproval.data}] : attendance).map((att, id)=>{

                            if (String(att.no) === String(viewNo)){
                                const {payees} = att
                                return <div key={id}>
                                    {payees.map((payee, i)=>{ 
                                        const ftremp = employees.filter((emp)=>{
                                            return String(emp.i_d)===String(payee['Person ID'])
                                        })[0]
                                        const {firstName, lastName, department, position} = ftremp?ftremp:{} 
                                        const newPayee = {
                                            'First Name': firstName, 'Last Name':lastName,
                                            'Department': department,'Position': position,
                                            ...payee
                                        }
                                        return <div key={i} className='payee'>
                                            {Object.keys(newPayee).map((col, j)=>{
                                                return <div key={j}>
                                                    {col+': '+(![undefined, null].includes(newPayee[col])?newPayee[col]:'Not Available')} 
                                                </div>
                                            })}
                                        </div>
                                    })}
                                </div>
                            }
                        })
                    }
                </div>}
            </div>
        </div>
        </>
    )
}

export default Attendance