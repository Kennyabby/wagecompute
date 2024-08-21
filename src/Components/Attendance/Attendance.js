import './Attendance.css'

import {useEffect, useState, useContext, useRef } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import * as XLSX from 'xlsx';

const Attendance = () =>{
    const {storePath,
        server, fetchServer,
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
    const [viewNo, setViewNo] = useState(null)
    const months = [
        'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY',
        'AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'
    ]
    const monthDays = {
        'JANUARY':31,'FEBRUARY':28,'MARCH':31,'APRIL':30,'MAY':31,'JUNE':30,'JULY':31,
        'AUGUST':31,'SEPTEMBER':30,'OCTOBER':31,'NOVEMBER':30,'DECEMBER':31
    }
    const years = ['2030','2029','2028','2027','2026','2025','2024','2023',
        '2022','2021','2020']
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
            console.log(colSetFilt[0]?colSetFilt[0].import_columns:[])
        }
    },[settings])
    useEffect(()=>{
        console.log(attendance)
    },[attendance])
    useEffect(()=>{
        console.log(iCols)
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

            // Set the row number where headers are located (index starts at 0, so row 8 is index 7)
            const headerRowIndex = 7;

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
    const loadData = async () =>{
        var newRawData = []
        var ids = []
        rawData.forEach((data)=>{
            if (!ids.includes(data[fields[calId]])){
                ids = ids.concat(data[fields[calId]])
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
            var payPerHour = 0
            var payPerDay = 0
            employees.forEach((emp)=>{
                if (String(emp.i_d) === String(id)){
                    payPerHour = Number(emp.payPerHour)
                    
                    payPerDay = Number(emp.salary)/monthDays[month]
                }
            })
            newRawData.forEach((data)=>{
                if (data[calId]===id){
                    const [hour,minute] = data[calDur].split(':')
                    const curHour = parseFloat(Number(hour) + Number(minute)/60)
                    totalHours += curHour
                    if(curHour>=9){
                        totalDays += 1
                    }else if (curHour>5 && curHour<9){
                        totalDays += 0.5
                    }
                }
            })
            totalPay = parseFloat(Number(payPerDay * totalHours))
            newRow['Expected Work Days'] = monthDays[month]
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
                                            return String(emp.i_d)===String(payee['ID'])
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
                                                    {col+': '+(newPayee[col]?newPayee[col]:0)} 
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