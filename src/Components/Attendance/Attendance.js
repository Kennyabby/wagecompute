import './Attendance.css'

import {useEffect, useState, useContext, useRef } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import * as XLSX from 'xlsx';

const Attendance = () =>{
    const {storePath,
        server, fetchServer,
        months, monthDays,years,
        company,
        attendance, setAttendance, getAttendance,
        employees, settings
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
    
    useEffect(()=>{
        storePath('attendance')  
    },[storePath])

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
    },[attendance])
    useEffect(()=>{
    },[iCols])
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

    const addAttendace = async (year, month, newAttendace)=>{
          const curNo = attendance.length+1
          const resps = await fetchServer("POST", {
            database: company,
            collection: "Attendance", 
            update: {no:curNo, month, year, payees:newAttendace}
          }, "createDoc", server)
          
          if (resps.err){
            console.log(resps.mess)
          }else{
            setAdd(false)
            setUpload(true)
            setViewNo(curNo)
            setICols([])
            setMonth('')
            setYear('')
            setCalId('')
            setCalDur('')
            getAttendance(company)
          }
    }

    const deleteAttendance = async (att)=>{
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Attendance", 
            update: {no: att.no}
        }, "removeDoc", server)
        if (resps.err){
            console.log(resps.mess)
        }else{
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
        
        addAttendace(year, month, analyzedData)
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
            <div className='emplist attlist'>
                <div className='add'
                    onClick={()=>{
                        setAdd(true)
                        setViewNo(null)
                    }}
                >{'+'}</div>
                {attendance.map((att, id)=>{
                    const {no, month, year, payees} = att
                    return(
                        <div className={'dept' + (viewNo===no?' curview':'')} key={id} name={no}
                            onClick={()=>{
                                setViewNo(no)
                                setAdd(false)
                            }}
                        >
                            <div className='dets'>
                                <div><b>No: </b>{no}</div>
                                <div className='deptdesc'>{'Year: '+year}</div>
                                <div className='deptdesc'>{'Month: '+month}</div>
                                <div> <b>{payees.length}</b>{' Computed Pays'}</div>
                            </div>
                            <div 
                            className='edit'
                            onClick={()=>{
                                deleteAttendance(att)
                            }}>Delete</div>
                        </div>
                    )
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
                                >Load</div>
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
                <div>
                    {
                        attendance.map((att, id)=>{
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