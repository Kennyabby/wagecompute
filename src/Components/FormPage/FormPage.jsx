import './FormPage.css'
import { useEffect, useState, useRef, useCallback, PureComponent } from "react";
import { read, utils, writeFileXLSX } from 'xlsx';
import { IoIosArrowDown, IoIosArrowUp, IoIosClose } from "react-icons/io";

const FormPage = ()=>{
    const fileReader = useRef(null)
    const [file, setFile] = useState(null)
    const [pres, setPres] = useState([])
    const [rawdata, setRawdata] = useState([])
    const [presHeaders, setPresHeaders] = useState([])
    const [totalTimeObject, setTotalTimeObject] = useState([])
    const [employeeDetails, setEmployeeDetails] = useState([])
    const [punchedDays, setPunchedDays] = useState(0)
    const [viewEWorkedDays, setEViewWorkedDays] = useState(false)
    const [viewSWorkedDays, setSViewWorkedDays] = useState(false)
    const [viewHWorkedDays, setHViewWorkedDays] = useState(false)
    const [infoHeader, setInfoHeader] = useState('')
    const [infoForId, setInfoForId] = useState('')
    const [infoFName, setInfoFName] = useState('')
    const [infoLName, setInfoLName] = useState('')
    const [field, setField] = useState({
        id:"",  
        name:""
    })
    const holidays = []
    const [employeeWorkedDays, setEmployeeWorkedDays] = useState({})
    const [sundayWorkedDays, setSundayWorkedDays] = useState({})
    const [holidayWorkedDays, setHolidayWorkedDays] = useState({})

    const uploadFile = async(e)=>{        
        const f = await file.arrayBuffer()
        const wb =  read(f)
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = utils.sheet_to_json(ws)
        // console.log(data)
        // setPres(data)
        setRawdata(data)
        e.target.parentElement.children[0].value='' 
        setFile(null)
    }

    const exportFile = useCallback(() => {
        const ws = utils.json_to_sheet(pres);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Data");
        writeFileXLSX(wb, "JazmyneBiometricSheet.xlsx");
    }, [pres]);

    const formatDate = (date) => {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
        const day = days[date.getDay()];
        const month = months[date.getMonth()];
        const dayOfMonth = date.getDate();
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
    
        return `${day}, ${month} ${dayOfMonth}, ${year}`;
    }
    useEffect(()=>{
        console.log(employeeWorkedDays)
        console.log(infoForId)
        console.log(employeeWorkedDays[infoForId])
    },[viewEWorkedDays])
    const computeMonthlyHours = (totalTimeObject)=>{
        const expectedWorkDays = punchedDays.length
        const expectedWorkHours = expectedWorkDays * 9
        var employeeDet = employeeDetails
        employeeDet.forEach((employee, index)=>{
            const employeeID = employee['Employee ID']
            const employeeFirst = employee['First Name']
            const employeeLast = employee['Last Name']
            const shift = employee['Shift']
            employeeWorkedDays[employeeID] = []
            sundayWorkedDays[employeeID] = []
            holidayWorkedDays[employeeID] = []
            let asumTime = 0
            let ssumTime = 0
            let act = 0
            let sct = 0
            let msh = 0
            let nsh = 0
            totalTimeObject.forEach((timeObject)=>{
                if (employeeID === timeObject['Employee ID']){
                    asumTime += Number(timeObject['Total Hours'])
                    act++
                    const workdate = timeObject['Date']
                    const newworkdate = new Date(workdate)
                    const details = {
                        date: formatDate(newworkdate),
                        firstPunch: timeObject['First Punch'],
                        lastPunch: timeObject['Last Punch']
                    }
                    setEmployeeWorkedDays((employeeWorkedDays)=>{
                        employeeWorkedDays[employeeID] = employeeWorkedDays[employeeID].concat([details])
                        return employeeWorkedDays
                    })
                    if(newworkdate.getDay()===0){
                        ssumTime += Number(timeObject['Total Hours']) 
                        sct++
                        setSundayWorkedDays((sundayWorkedDays)=>{
                            sundayWorkedDays[employeeID] = sundayWorkedDays[employeeID].concat([details])
                            return sundayWorkedDays
                        })

                        asumTime -= timeObject['Total Hours'] 
                        act--
                        
                        setEmployeeWorkedDays((employeeWorkedDays)=>{
                            employeeWorkedDays[employeeID].pop()
                            return employeeWorkedDays
                        })
                    }
                    if (timeObject['Shift']==='Morning'){
                        msh++
                    }else if (timeObject['Shift']==='Night'){
                        nsh++
                    }
                }

            })
            const auctualWorkHours = parseFloat(asumTime.toFixed(2))
            const sundaysWorkHours = parseFloat(ssumTime.toFixed(2))
            const wovertime = parseFloat((auctualWorkHours - expectedWorkHours).toFixed(2))
            const deductable = parseFloat((expectedWorkHours - auctualWorkHours).toFixed(2))
            employee['Worked Days (Expected)'] = expectedWorkDays
            employee['Worked Days (Actual)'] = <label>{act}
                {act < expectedWorkDays && <span className='red'>{` abs(${
                    expectedWorkDays - act
                })`} </span>}
                <span className='viewtag' onClick={()=>{
                    setInfoHeader('Worked Days (Actual)')
                    setInfoForId(employeeID)
                    setInfoFName(employeeFirst)
                    setInfoLName(employeeLast)
                    setEViewWorkedDays(!viewEWorkedDays)
                }}>
                    {viewEWorkedDays? <IoIosArrowUp/>:<IoIosArrowDown/>}
                </span>
            </label> 
            employee['Morning Shift'] = msh
            employee['Night Shift'] = nsh
            employee['Worked Hours (Expected)'] = expectedWorkHours
            employee['Worked Hours (Actual)'] = auctualWorkHours
            employee['Worked Hours Overtime'] = <label className={wovertime>0?'green bold':''}>
                {`${wovertime > 0 ? wovertime : 0}`}
            </label>
            employee['Deductable Hours'] = <label className={deductable>0?'red bold':''}>
                {`${deductable > 0 ? deductable : 0}`}
            </label>
            employee['Worked Times (Sundays)'] = <label>
                {`${sct}`}
                <span className='viewtag' onClick={()=>{
                    setInfoHeader('Worked Times (Sundays)')
                    setInfoForId(employeeID)
                    setInfoFName(employeeFirst)
                    setInfoLName(employeeLast)
                    setSViewWorkedDays(!viewSWorkedDays)
                }}>
                    {viewSWorkedDays? <IoIosArrowUp/>:<IoIosArrowDown/>}
                </span>
            </label>
            employee['Sunday Work Hours'] = sundaysWorkHours 
        })
        // console.log(employeeWorkedDays)
        // console.log(sundayWorkedDays)
        setPres(employeeDet)
    }
    const handleFileChange = (e) =>{
        setFile(e.target.files[0]);
    }
    const handleField = (e) =>{
        const name = e.target.getAttribute("name")
        const value = e.target.value
        setField((field)=>{
            return {...field, [name]:value}
        })
    }
    const addData = ()=>{
        const lastRowNum = pres[pres.length-1].__rowNum__
        console.log(lastRowNum)
        setPres((pres)=>{
            return [...pres, {ID:Number(field.id), Name:field.name}]
        })
        setField((field)=>{
            return {...field, name:'', id:''}
        })
    }
    const analyzeData = ()=>{
        let foundEmployees = []
        let datesPunched = []
        pres.forEach((punch)=>{
            const employeeID = punch['Employee ID']
            const employeeFirst = punch['First Name']
            const employeeLast = punch['Last Name']
            const employeeDept = punch['Department']
            const employeeFpunch = punch['First Punch']
            const employeeLpunch = punch['Last Punch']
            const employeeShift = punch ['Shift']
            var totalHoursPunched = punch['Total Hours']
            const punchDate = punch['Date']
            if (!datesPunched.includes(punchDate)){
                datesPunched = datesPunched.concat(punchDate)
            }
            if (!foundEmployees.includes(employeeID)){
                setEmployeeDetails((employeeDetails)=>{
                    return [...employeeDetails, {'Employee ID': employeeID, 
                        'Department': employeeDept,
                        'First Name': employeeFirst,
                        'Last Name': employeeLast
                    }]
                })
                foundEmployees = foundEmployees.concat(employeeID)
            }
            // const totalTime = punch['Total Time']
            // const punchHour = Number(totalTime.slice(0,totalTime.indexOf(':')))
            // const punchMinutes = Number(totalTime.slice(totalTime.indexOf(':')+1,))
            // var totalHours = punchHour + punchMinutes/60
            if (totalHoursPunched === 0){
                totalHoursPunched = 9
            }
            setTotalTimeObject((totalTimeObject)=>{
                return [...totalTimeObject, {'Employee ID': employeeID, 
                    'First Name': employeeFirst,
                    'Last Name': employeeLast,
                    'Department': employeeDept,
                    'Date': punchDate,
                    'First Punch': employeeFpunch,
                    'Last Punch': employeeLpunch,
                    'Total Hours': totalHoursPunched, 
                    'Shift':employeeShift
                }]
            })
        })
        // console.log('date punched: ',datesPunched)
        setPunchedDays(datesPunched.filter((date)=>{
            const validDate = new Date(date)
            if (validDate.getDay()!==0){
                return date
            }
        }))
    }
    const isNightShiftStart = (firstPunch,lastPunch) =>{
        const [fHour, fMinutes] = firstPunch.split(':').map(punch => Number(punch) )
        const [lHour, lMinutes] = lastPunch.split(':').map(punch => Number(punch) )
        const ftime = fHour + fMinutes/60
        const ltime = lHour + lMinutes/60
        // console.log((fHour === lHour) && fHour > 19)
        if ((ftime === ltime) && ftime >= 18){
            return true
        }else{
            return false
        }
    }
    const isNightShiftEnd = (firstPunch, lastPunch) =>{
        const [fHour, fMinutes] = firstPunch.split(':').map(punch => Number(punch) )
        const [lHour, lMinutes] = lastPunch.split(':').map(punch => Number(punch) )
        const ftime = fHour + fMinutes/60
        const ltime = lHour + lMinutes/60
        if ((ftime === ltime) && fHour <= 7){
            return true
        }else{
            return false
        }
    }
    const isNightShift = (firstPunch, lastPunch) => {
        const [fHour, fMinutes] = firstPunch.split(':').map(punch => Number(punch) )
        const [lHour, lMinutes] = lastPunch.split(':').map(punch => Number(punch) )
        const ftime = fHour + fMinutes/60
        const ltime = lHour + lMinutes/60

        if(ftime <= 7 && ltime>=19){
            return true
        }else{
            return false
        }
        
    }

    const calculateTotalTime = (clockIn, clockOut) => {
        const clockInTime = new Date(`1970-01-01T${clockIn}:00`);
        let clockOutTime = new Date(`1970-01-01T${clockOut}:00`);
        if (clockOutTime < clockInTime) {
            clockOutTime.setDate(clockOutTime.getDate() + 1); // Adjust for crossing midnight
        }
        const totalTime = (clockOutTime - clockInTime) / (1000 * 60 * 60); // Convert milliseconds to hours
        return totalTime.toFixed(2);
    }
    useEffect(()=>{
        // make changes to the rawdata here.
        const nightShiftData = [];
        const analyzedEmployees = []
        const analyzedData = []
        const adjustedData = []
        var expdata = rawdata
        expdata.forEach((punch, index) => {
            const employeeID = punch['Employee ID'];
            const employeeFirst = punch['First Name'];
            const employeeLast = punch['Last Name'];
            const employeeDept = punch['Department'];
            const employeeFpunch = punch['First Punch'];
            const employeeLpunch = punch['Last Punch'];
            const punchDate = punch['Date'];
            var nextPunch = expdata[index];
            if (index < expdata.length - 1) {
                nextPunch = expdata[index + 1];
            }
            const totalHours = calculateTotalTime(employeeLpunch, nextPunch['First Punch'])
            const mTotalHours = calculateTotalTime(employeeFpunch, employeeLpunch)
            let updatedPunch= {
                ...punch,
                'Total Time': 'Calculated',
                'Total Hours': mTotalHours,
                'Shift':'Morning'
            }
            if(isNightShiftStart(employeeFpunch, employeeLpunch)){
                // console.log('Night shift started')
                if (!analyzedEmployees.includes(employeeID)){
                    analyzedEmployees.push(employeeID)
                    analyzedData.push(punch)
                    if (nextPunch['Employee ID'] === employeeID) {
                        updatedPunch = {
                            ...punch,
                            'First Punch': employeeFpunch,
                            'Last Punch': nextPunch['First Punch'],
                            'Total Time': 'Calculated',
                            'Total Hours': totalHours,
                            'Shift':'Night'
                        }

                        expdata[index + 1] = {
                            ...nextPunch,
                            'First Punch': nextPunch['Last Punch'],
                        }
                        // console.log('night shift',updatedPunch)
                        // console.log(punch)
                    }
                }
            }else{

                if (!analyzedEmployees.includes(employeeID)){
                    if(isNightShift(employeeFpunch, employeeLpunch)){
                        analyzedEmployees.push(employeeID)
                        analyzedData.push(punch)
                        if (nextPunch['Employee ID'] === employeeID) {
                            updatedPunch = {
                                ...punch,
                                'First Punch': employeeLpunch,
                                'Last Punch': nextPunch['First Punch'],
                                'Total Time': 'Calculated',
                                'Total Hours': totalHours,
                                'Shift':'Night'
                            }
    
                            expdata[index + 1] = {
                                ...nextPunch,
                                'First Punch': nextPunch['Last Punch'],
                            }
                            console.log('night shift',updatedPunch)
                            // console.log(punch)
                        }
                    }
                }
            }
            // console.log('night shift checked', updatedPunch)  
            if(!isNightShiftEnd(employeeFpunch,employeeLpunch)){
                // console.log('night shift not ended')
                if (analyzedEmployees[analyzedEmployees.length-1]===employeeID && updatedPunch['Shift']!=='Night'){
                    
                    // analyzedEmployees.push(employeeID)
                    analyzedData.push(punch)
                    // analyzeData(rawdata[index])
                    if (nextPunch['Employee ID'] === employeeID) {
                        updatedPunch = {
                            ...punch,
                            'First Punch': employeeFpunch,
                            'Last Punch': nextPunch['First Punch'],
                            'Total Time': 'Calculated',
                            'Total Hours': totalHours,
                            'Shift':'Night'
                        }

                        expdata[index + 1] = {
                            ...nextPunch,
                            'First Punch': nextPunch['Last Punch'],
                        }
                        // console.log(updatedPunch)
                    }
                }
            }else{
                analyzedEmployees.pop()
                updatedPunch = {
                    ...punch,
                    'Shift': 'NA'
                }
            }
            // else{
            //     // console.log('no night shift')
            //     updatedPunch= {
            //         ...punch,
            //         'Total Time': 'Calculated',
            //         'Total Hours': totalHours,
            //         'Shift':'Morning'
            //     }
            //     console.log(updatedPunch)
            // }
           
            adjustedData.push(updatedPunch)
        })
        // setPres(nightShiftData.concat(rawdata.filter(punch => !isNightShift(punch['First Punch']))));
        // console.log(adjustedData)
        setPres(adjustedData.filter((data)=>{return data['Shift']!=='NA'}))
    },[rawdata])
    useEffect(()=>{
        // console.log(field)
    },[field])
    useEffect(()=>{
        if (pres[0]!==undefined){
            const headers = Object.keys(pres[0])
            console.log(headers)
            setPresHeaders(headers)                
        }
    },[pres])
    useEffect(()=>{
        computeMonthlyHours(totalTimeObject)
    },[totalTimeObject])
    return (
        <>
            {(viewEWorkedDays || viewHWorkedDays || viewSWorkedDays) &&
                <div className='viewinfo'>
                    <IoIosClose className='close' onClick={()=>{
                        setEViewWorkedDays(false)
                        setSViewWorkedDays(false)
                        setHViewWorkedDays(false)
                    }}/>
                    <div className='infoheader'>
                        {infoHeader}
                    </div>
                    <div className='infoName'>Employee: <b>{infoFName + ' ' + infoLName} {`(${infoForId})`}</b></div>
                    <div className='abspres'>
                        <div>Present {'('+employeeWorkedDays[infoForId].length+')'}</div>
                        <div>Absent</div>
                    </div>
                    {viewEWorkedDays && <div className='info'>
                        {employeeWorkedDays[infoForId].map((days)=>{
                            return <div>
                                <div>{days.date}</div>
                                <div>
                                    <div>{days.firstPunch}-{days.lastPunch}</div>
                                </div>
                            </div>
                        })}
                    </div>}
                    {viewSWorkedDays && <div className='info'>
                        {sundayWorkedDays[infoForId].map((days)=>{
                            return <div>
                                <div>{days.date}</div>
                                <div>
                                    <div>{days.firstPunch}-{days.lastPunch}</div>
                                </div>
                            </div>
                        })}
                    </div>}
                    {viewHWorkedDays && <div className='info'>
                        {holidayWorkedDays[infoForId].map((days)=>{
                            return <div>
                                <div>{days.date}</div>
                                <div>
                                    <div>{days.firstPunch}-{days.lastPunch}</div>
                                </div>
                            </div>
                        })}
                    </div>}
                </div>
            }
            <div className="actionbtns">
                <div style={{display:"block"}}>
                    <input ref={fileReader} type='file' onChange={handleFileChange}/>
                    {file!==null && <button onClick={uploadFile}>Upload</button>}
                </div>
                <div className='analyze' onClick={analyzeData}>Analyze Data</div>
                <div className='export' onClick={exportFile}> Export Data</div>
            </div>
            <div className='datatable' style={{display:"flex", margin:"10px"}}>
                <table>
                    <thead>
                        <tr>
                            {presHeaders.map((header, index)=>{
                                return <th key={index}>{header}</th>
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {pres.map((pres, index) => (
                             <tr key={index}>
                                {presHeaders.map((header, index)=>{
                                    return <td key={index}>{pres[header]}</td>
                                })}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <td colSpan={2}>
                            {pres.length!==0 && <button onClick={exportFile}>Export XLSX</button>}
                        </td>
                    </tfoot>
                </table>
                {/* <div style={{display:"inline-block"}}>
                    <div style={{margin:"5px"}} onChange={handleField}>
                        <input name="id" placeholder="Enter ID" defaultValue={field.id}/>
                        <input name="name" placeholder="Enter Name" defaultValue={field.name}/>
                    </div>
                    {pres.length!==0 && <button onClick={addData}>Add Data</button>}
                </div> */}
            </div>

        </>
    )
}

export default FormPage