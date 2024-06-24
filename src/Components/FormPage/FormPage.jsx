import './FormPage.css'
import { useEffect, useState, useRef, useCallback, PureComponent } from "react";
import { read, utils, writeFileXLSX } from 'xlsx';
import { IoIosArrowDown, IoIosArrowUp, IoIosClose } from "react-icons/io";
import { IoClose } from 'react-icons/io5';

const FormPage = ()=>{
    const fileReader = useRef(null)
    const [file, setFile] = useState(null)
    const [sfile, setSfile] = useState(null)
    const [salaryDet, setSalaryDet] = useState(null)
    const [pres, setPres] = useState([])
    const [bPres, setBpres] = useState([])
    const [rawdata, setRawdata] = useState([])
    const [presHeaders, setPresHeaders] = useState([])
    const [totalTimeObject, setTotalTimeObject] = useState([])
    const [employeeDetails, setEmployeeDetails] = useState([])
    const [punchedDays, setPunchedDays] = useState([])
    const [viewEWorkedDays, setEViewWorkedDays] = useState(false)
    const [viewSWorkedDays, setSViewWorkedDays] = useState(false)
    const [viewHWorkedDays, setHViewWorkedDays] = useState(false)
    const [infoHeader, setInfoHeader] = useState('')
    const [infoForId, setInfoForId] = useState('')
    const [infoFName, setInfoFName] = useState('')
    const [infoLName, setInfoLName] = useState('')
    const [holiday, setHoliday] = useState({
        value:'',
        desc:''
    })
    const [excludedentry, setExcludedEntry] = useState('')
    const [dateExcludedEntry, setDateExcludedEntry] = useState('')
    const [employeeDate, setEmployeeDate] = useState('')
    const [focusedEmployee, setFocusedEmployee] = useState(null)
    const [exportData, setExportData] =  useState([])
    const [holidays, setHolidays] = useState([
        { "value": "2024-01-01", "desc": "New Year's Day" },
        { "value": "2024-04-19", "desc": "Good Friday" },
        { "value": "2024-04-22", "desc": "Easter Monday" },
        { "value": "2024-05-01", "desc": "Workers' Day" },
        { "value": "2024-06-12", "desc": "Democracy Day" },
        { "value": "2024-06-16", "desc": "Father's Day" },
        { "value": "2024-10-01", "desc": "Independence Day" },
        { "value": "2024-12-25", "desc": "Christmas Day" },
        { "value": "2024-12-26", "desc": "Boxing Day" },
        { "value": "2024-04-10", "desc": "Eid al-Fitr (Tentative Date)" },
        { "value": "2024-06-17", "desc": "Eid al-Adha (Tentative Date)" },
        { "value": "2024-06-18", "desc": "Eid al-Adha (Public Holiday)" },
    ])
    const [excludeEmployees, setExcludeEmployees] = useState([])
    const [dateexcludeEmployees, setDateExcludeEmployees] = useState([])
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
    const uploadSfile = async(e)=>{        
        const f = await sfile.arrayBuffer()
        const wb =  read(f)
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = utils.sheet_to_json(ws)
        // console.log(data)
        // setPres(data)
        setSalaryDet(data)
        e.target.parentElement.children[0].value=''
        setSfile(null)
    }

    const exportFile = useCallback(() => {
        const ws = utils.json_to_sheet(exportData);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Data");
        writeFileXLSX(wb, "JazmyneBiometricSheet.xlsx");
    }, [exportData]);

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

    const computeMonthlyHours = (totalTimeObject)=>{
        const holidayDates = holidays.map((holiday)=>{return holiday.value})
        const expectedPunchedDays = punchedDays.filter((punchday)=>{
            return !holidayDates.includes(punchday)
        })
       
        var employeeDet = employeeDetails
        var toexport = []
        employeeDet.forEach((employee, index)=>{
            const employeeID = employee['Employee ID']
            var employeeSalary  = 0
            const empSalary = salaryDet.filter((employee)=>{
                if(employee['Employee ID'] === employeeID){
                    return employee
                }
            })
            if (empSalary!==undefined){
                employeeSalary = Number(empSalary[0]['Salary'])
            }
            const excludeIDs = excludeEmployees.map((employee)=>{
                return employee['Employee ID']
            })
            var employeeExcluded = excludeIDs.includes(employeeID)
           
            var excludedWorkDates = 0
            var employeeDateExcluded = dateexcludeEmployees.map((employee)=>{
                return employee['Employee ID']
            }).includes(employeeID)

            if (dateexcludeEmployees.length && employeeDateExcluded){
                excludedWorkDates = dateexcludeEmployees.filter((employee)=>{
                    return employee['Employee ID'] === employeeID
                })[0]['Excluded Dates'].length
            }

            toexport.push({...employee})
            const employeeFirst = employee['First Name']
            const employeeLast = employee['Last Name']
            const shift = employee['Shift']
            employeeWorkedDays[employeeID] = []
            sundayWorkedDays[employeeID] = []
            holidayWorkedDays[employeeID] = []
            let asumTime = 0
            let ssumTime = 0
            let hsumTime = 0
            let act = 0
            let sct = 0
            let hct = 0
            let msh = 0
            let nsh = 0
            totalTimeObject.forEach((timeObject)=>{
                if (employeeID === timeObject['Employee ID']){
                    const workdate = timeObject['Date']
                    const newworkdate = new Date(workdate)
                    const details = {
                        date: formatDate(newworkdate),
                        firstPunch: timeObject['First Punch'],
                        lastPunch: timeObject['Last Punch'],
                        shift: timeObject['Shift']
                    }
                    if(expectedPunchedDays.includes(timeObject['Date'])){
                        asumTime += Number(timeObject['Total Hours'])
                        act++
                        setEmployeeWorkedDays((employeeWorkedDays)=>{
                            employeeWorkedDays[employeeID] = employeeWorkedDays[employeeID].concat([details])
                            return employeeWorkedDays
                        })
                    }
                    if (holidayDates.includes(timeObject['Date'])){
                        hct++
                        hsumTime += Number(timeObject['Total Hours']) 
                        setHolidayWorkedDays((holidayWorkedDays)=>{
                            holidayWorkedDays[employeeID] = holidayWorkedDays[employeeID].concat([details])
                            return holidayWorkedDays
                        })
                    }
                    if(newworkdate.getDay()===0){
                        ssumTime += Number(timeObject['Total Hours']) 
                        sct++
                        setSundayWorkedDays((sundayWorkedDays)=>{
                            sundayWorkedDays[employeeID] = sundayWorkedDays[employeeID].concat([details])
                            return sundayWorkedDays
                        })

                        if(expectedPunchedDays.includes(timeObject['Date'])){
                            asumTime -= timeObject['Total Hours'] 
                            act--
                            
                            setEmployeeWorkedDays((employeeWorkedDays)=>{
                                employeeWorkedDays[employeeID].pop()
                                return employeeWorkedDays
                            })
                        }
                    }
                    if (timeObject['Shift']==='Morning'){
                        msh++
                        if(newworkdate.getDay()===0){
                            msh--
                        }
                    }else if (timeObject['Shift']==='Night'){
                        nsh++
                        if(newworkdate.getDay()===0){
                            nsh--
                        }
                    }
                }

            })
            const expectedWorkDays = expectedPunchedDays.length - excludedWorkDates
            const expectedWorkHours = expectedWorkDays * 9
            const salaryPerHour = (employeeSalary/expectedWorkDays)/9
            const auctualWorkHours = parseFloat(asumTime.toFixed(2))
            const expectedWorkSalary = parseFloat((expectedWorkHours*salaryPerHour).toFixed(2))
            const employeeWorkSalary = parseFloat((auctualWorkHours*salaryPerHour).toFixed(2)) 
            const sundaysWorkHours = parseFloat(ssumTime.toFixed(2))
            const holidaysWorkHours = parseFloat(hsumTime.toFixed(2))
            const holidayWorkSalary = parseFloat((holidaysWorkHours*salaryPerHour*2).toFixed(2))
            const wovertime = parseFloat((auctualWorkHours - expectedWorkHours).toFixed(2))
            const overtimeSalary = parseFloat((wovertime > 0? wovertime*salaryPerHour: 0).toFixed(2))
            const deductable = parseFloat((expectedWorkHours - auctualWorkHours).toFixed(2))
            const deductableSalary = parseFloat((deductable >0 ? deductable * salaryPerHour : 0).toFixed(2))
            const totalSalary = parseFloat((employeeExcluded?
                expectedWorkSalary : 
                (expectedWorkSalary+overtimeSalary-deductableSalary+holidayWorkSalary)).toFixed(2))
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
            employee['Worked Hours (For Use)'] = employeeExcluded?expectedWorkHours:auctualWorkHours
            employee['Worked Times (Holidays)'] = <label>
                {`${hct}`}
                <span className='viewtag' onClick={()=>{
                    setInfoHeader('Worked Times (Holdiays)')
                    setInfoForId(employeeID)
                    setInfoFName(employeeFirst)
                    setInfoLName(employeeLast)
                    setHViewWorkedDays(!viewHWorkedDays)
                }}>
                    {viewSWorkedDays? <IoIosArrowUp/>:<IoIosArrowDown/>}
                </span>
            </label>
            employee['Holiday Worked Hours'] = holidaysWorkHours
            employee['Expected Work Salary'] = expectedWorkSalary
            // employee['Actual Salary'] = employeeWorkSalary
            employee['Overtime Salary'] = employeeExcluded?0:overtimeSalary
            employee['Deductable Salary'] = employeeExcluded?0:deductableSalary
            employee['Holiday Salary'] = holidayWorkSalary
            employee['Net Payable Salary'] = totalSalary 
            // employee['Worked Times (Sundays)'] = <label>
            //     {`${sct}`}
            //     <span className='viewtag' onClick={()=>{
            //         setInfoHeader('Worked Times (Sundays)')
            //         setInfoForId(employeeID)
            //         setInfoFName(employeeFirst)
            //         setInfoLName(employeeLast)
            //         setSViewWorkedDays(!viewSWorkedDays)
            //     }}>
            //         {viewSWorkedDays? <IoIosArrowUp/>:<IoIosArrowDown/>}
            //     </span>
            // </label>
            // employee['Sunday Work Hours'] = sundaysWorkHours 


             
            toexport[index]['Worked Days (Expected)'] = expectedWorkDays
            toexport[index]['Worked Days (Actual)'] = act
            toexport[index]['Morning Shift'] = msh
            toexport[index]['Night Shift'] = nsh
            toexport[index]['Worked Hours (Expected)'] = expectedWorkHours
            toexport[index]['Worked Hours (Actual)'] = auctualWorkHours
            toexport[index]['Worked Hours Overtime'] = wovertime > 0 ? wovertime : 0

            toexport[index]['Deductable Hours'] = deductable > 0 ? deductable : 0
            toexport[index]['Worked Hours (For Use)'] = employeeExcluded?expectedWorkHours:auctualWorkHours
            toexport[index]['Worked Times (Holidays)'] = hct
            toexport[index]['Holiday Worked Hours'] = holidaysWorkHours

            toexport[index]['Expected Work Salary'] = expectedWorkSalary
            // employee['Actual Salary'] = employeeWorkSalary
            toexport[index]['Overtime Salary'] = employeeExcluded?0:overtimeSalary
            toexport[index]['Deductable Salary'] = employeeExcluded?0:deductableSalary
            toexport[index]['Holiday Salary'] = holidayWorkSalary
            toexport[index]['Net Payable Salary'] = totalSalary 

            // toexport[index]['Worked Times (Sundays)'] = sct
            // toexport[index]['Sunday Work Hours'] = sundaysWorkHours

        })
        // console.log(employeeWorkedDays)
        // console.log(sundayWorkedDays)
        setPres(employeeDet)
        setExportData(toexport)
    }
    const handleFileChange = (e) =>{
        setFile(e.target.files[0]);
    }
    const handleSfileChange = (e) =>{
        setSfile(e.target.files[0]);
    }
    const analyzeData = ()=>{
        let datesPunched = []
        setTotalTimeObject([])
        bPres.forEach((punch)=>{
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
    const isNightShiftStart = (firstPunch,lastPunch,nFPunch, nLPunch) =>{
        if(nFPunch!==null){
            const [fHour, fMinutes] = firstPunch.split(':').map(punch => Number(punch) )
            const [lHour, lMinutes] = lastPunch.split(':').map(punch => Number(punch) )
            const ftime = fHour + fMinutes/60
            const ltime = lHour + lMinutes/60
            const [nfHour, nfMinutes] = nFPunch.split(':').map(punch => Number(punch) )
            const [nlHour, nlMinutes] = nLPunch.split(':').map(punch => Number(punch) )
            const nftime = nfHour + nfMinutes/60
            const nltime = nlHour + nlMinutes/60
            // console.log((fHour === lHour) && fHour > 19)
            if ((ftime === ltime) && ftime >= 18){
                if(nftime < 8){
                    return true
                }
            }else{
                return false
            }
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
    const isNightShift = (lastPunch, firstPunch) => {
        if (firstPunch!==null){
            const [fHour, fMinutes] = firstPunch.split(':').map(punch => Number(punch) )
            const [lHour, lMinutes] = lastPunch.split(':').map(punch => Number(punch) )
            const ftime = fHour + fMinutes/60
            const ltime = lHour + lMinutes/60
    
            if(ltime >= 19.5 && ftime < 6.7){
                return true
            }else{
                return false
            }
        }else{
            return false
        }   
    }

    const calculateTotalTime = (clockIn, clockOut) => {
        if (clockOut !== null){
            const clockInTime = new Date(`1970-01-01T${clockIn}:00`);
            let clockOutTime = new Date(`1970-01-01T${clockOut}:00`);
            if (clockOutTime < clockInTime) {
                clockOutTime.setDate(clockOutTime.getDate() + 1); // Adjust for crossing midnight
            }
            const totalTime = (clockOutTime - clockInTime) / (1000 * 60 * 60); // Convert milliseconds to hours
            return totalTime.toFixed(2);
        }else{
            return null
        }
    }
    const holidayInput = (e)=>{
        const name = e.target.getAttribute('name')
        const value = e.target.value

        setHoliday((holiday)=>{
            return {...holiday, [name]:value}
        })
    }

    useEffect(()=>{
        // make changes to the rawdata here.
        const nightShiftData = [];
        const analyzedEmployees = []
        const analyzedData = []
        const adjustedData = []
        var expdata = rawdata
        let foundEmployees = []
        setEmployeeDetails([])
        expdata.forEach((punch, index) => {
            const employeeID = punch['Employee ID'];
            const employeeFirst = punch['First Name'];
            const employeeLast = punch['Last Name'];
            const employeeDept = punch['Department'];
            const employeeFpunch = punch['First Punch'];
            const employeeLpunch = punch['Last Punch'];
            const punchDate = punch['Date'];
            var nextPunch = null;
            if (index < expdata.length - 1) {
                nextPunch = expdata[index + 1];
            }
            const totalHours = calculateTotalTime(employeeLpunch, nextPunch===null ? null : nextPunch['First Punch'])
            const mTotalHours = calculateTotalTime(employeeFpunch, employeeLpunch)
            let updatedPunch= {
                ...punch,
                'Total Time': 'Calculated',
                'Total Hours': mTotalHours,
                'Shift':'Morning'
            }

            if (!foundEmployees.includes(employeeID)){
                setEmployeeDetails((employeeDetails)=>{
                    return [...employeeDetails, {'Employee ID': employeeID, 
                        'First Name': employeeFirst,
                        'Last Name': employeeLast,
                        'Department': employeeDept,
                    }]
                })
                foundEmployees = foundEmployees.concat(employeeID)
            }

            if(isNightShiftStart(employeeFpunch, employeeLpunch, 
                nextPunch===null ? nextPunch : nextPunch['First Punch'],
                nextPunch===null ? nextPunch : nextPunch['Last Punch'],
            )){
                // console.log('Night shift started')
                if (!analyzedEmployees.includes(employeeID)){
                    analyzedEmployees.push(employeeID)
                    analyzedData.push(punch)
                    if (nextPunch!==null && nextPunch['Employee ID'] === employeeID) {
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
                    if(isNightShift(employeeLpunch, nextPunch===null ? null : nextPunch['First Punch'])){
                        analyzedEmployees.push(employeeID)
                        analyzedData.push(punch)
                        if (nextPunch!==null && nextPunch['Employee ID'] === employeeID) {
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
                    if (nextPunch!==null && nextPunch['Employee ID'] === employeeID) {
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
                if(analyzedEmployees.includes(employeeID)){
                    analyzedEmployees.pop()
                    updatedPunch = {
                        ...punch,
                        'Shift': 'NA'
                    }
                }
            }
           
           
            adjustedData.push(updatedPunch)
        })
        setBpres(adjustedData.filter((data)=>{return data['Shift']!=='NA'}))
        setPres(adjustedData.filter((data)=>{return data['Shift']!=='NA'}))
    },[rawdata])

    useEffect(()=>{
        if (pres[0]!==undefined){
            const headers = Object.keys(pres[0])
            setPresHeaders(headers)                
        }
    },[pres])
    useEffect(()=>{
        computeMonthlyHours(totalTimeObject)
    },[totalTimeObject])
    useEffect(()=>{

    },[holidays])
    const focusEmployee = (e)=>{
        const name = e.target.getAttribute('name')
        var parent;
        var immparent;
        if (name === 'filcnt'){
            parent = e.target.parentElement.childNodes
            immparent = e.target
        }else if(name === 'filch'){
            parent = e.target.parentElement.parentElement.childNodes
            immparent = e.target.parentElement
        }
        if (name!==null){
            parent.forEach((child)=>{
                child.style.border = 'solid yellowgreen 0px'
            })
            immparent.style.border = 'solid yellowgreen 2px'
        }
    }
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
                                    <div>{days.firstPunch}-{days.lastPunch} {`(${days.shift})`}</div>
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
                                    <div>{days.firstPunch}-{days.lastPunch} {`(${days.shift})`}</div>
                                </div>
                            </div>
                        })}
                    </div>}
                </div>
            }
            <div className="actionbtns">
                <div style={{display:"block"}}>
                    <input ref={fileReader} type='file' 
                        placeholder='Upload Attendace'
                        onChange={handleFileChange}/>
                    {file!==null && <button onClick={uploadFile}>Upload</button>}
                    <div className='upload'>Upload Attendance</div>
                </div>
                <div style={{display:"block"}}>
                    <input ref={fileReader} type='file' 
                        placeholder='Upload Attendace'
                        onChange={handleSfileChange}/>
                    {sfile!==null && <button onClick={uploadSfile}>Upload</button>}
                    <div className='upload'>Upload Salary Details</div>
                </div>
                <div className='analyze' onClick={analyzeData}>Analyze Data</div>
                <div className='export' onClick={exportFile}> Export Data</div>
            </div>
            <div className='dtflt'>
                <div className='fltbx'>
                    <div className='flttle'>Holiday Filters</div>
                    <div className='fltctnt'>
                        {holidays.length? <div className='hlcv'>
                            {holidays.map((holiday,index)=>{
                                return <div className='holiday' key={index}>
                                    <div className='hlvl'>{holiday.value}</div>
                                    <div className='hldesc'>{holiday.desc}</div>
                                    <IoIosClose className='xcards' onClick={()=>{
                                        setHolidays((holidays)=>{
                                            return holidays.filter((fholiday)=>{
                                                return fholiday!== holiday
                                            })
                                        })
                                    }}/>
                                </div>
                            })}                            
                        </div>:
                        'Holiday filters appear here.'}
                    </div>
                    <div className='fltinp' onChange={holidayInput}>
                        <input
                            className='dtinp'
                            type='date'    
                            name='value'
                            value={holiday.value}
                        />
                        <input
                            className='dtinp'
                            type='text'
                            name='desc'
                            placeholder='Description'    
                            value={holiday.desc}
                        />
                        <div className='addflt' onClick={()=>{
                            if(holiday.value){
                                setHolidays((holidays)=>{
                                    return [...holidays, holiday]
                                })
                                setHoliday({
                                    value:'',
                                    desc:''
                                })
                            }
                        }}>Add</div>
                    </div>
                </div>
                <div className='fltbx'>
                    <div className='flttle'>Employee Exception Filters</div>
                    <div className='fltctnt'>
                        {excludeEmployees.length? <div className='hlcv'>
                            {excludeEmployees.map((employee,index)=>{
                                const employeeID = employee['Employee ID']
                                const employeeFirst = employee['First Name']
                                const employeeLast = employee['Last Name']
                                return <div className='empfilter' key={index}>
                                    <div className='hlvl'>{`Employee ID: ${employeeID}`}</div>
                                    <div className='hldesc'>{`${employeeFirst} ${employeeLast}`}</div>
                                    <IoIosClose className='xcards' onClick={()=>{
                                        setExcludeEmployees((employees)=>{
                                            return employees.filter((femploee)=>{
                                                return femploee!== employee
                                            })
                                        })
                                    }}/>
                                </div>
                            })}                            
                        </div>:
                        'Employee filters appear here.'}
                    </div>
                    <div className='fltinp' onChange={holidayInput}>
                        <select
                            className='dtinp empinp'
                            type='text'
                            name='excludedentry'
                            placeholder='Select Employee'    
                            value = {excludedentry}
                            onChange={(e)=>{
                                setExcludedEntry(e.target.value)
                            }}
                        >
                            <option value={''}>{'Select Employee'}</option>
                            {employeeDetails.filter((employee)=>{
                                return !excludeEmployees.includes(employee)
                            }).map((employee, index)=>{
                                const employeeID = employee['Employee ID']
                                const employeeFirst = employee['First Name']
                                const employeeLast = employee['Last Name']
                                return <option 
                                    key={index} 
                                    value={employeeID}
                                >
                                    {`ID:${employeeID} ${employeeFirst} ${employeeLast}`}
                                </option>
                            })}
                        </select>
                        <div className='addflt' onClick={()=>{
                            if(excludedentry){
                                setExcludeEmployees((employees)=>{
                                    const employee = employeeDetails.filter((employee)=>{
                                        return employee['Employee ID'] === excludedentry
                                    })
                                    return [...employees, ...employee]
                                })
                                setExcludedEntry('')
                            }
                        }}>Add</div>
                    </div>
                </div>
                <div className='fltbx'>
                    <div className='flttle'>Employee Date Exception Filters</div>
                    <div className='fltctnt'>
                        {dateexcludeEmployees.length? <div className='hlcv'>
                            {dateexcludeEmployees.map((employee,index)=>{
                                const employeeID = employee['Employee ID']
                                const employeeFirst = employee['First Name']
                                const employeeLast = employee['Last Name']
                                const employeeDates = employee['Excluded Dates']
                                return <div 
                                    className='empfilter selector' 
                                    name='filcnt' 
                                    key={index}
                                    onClick={(e)=>{
                                        setFocusedEmployee(employee)
                                        focusEmployee(e)
                                    }}
                                >
                                    <div className='hlvl'  name='filch' >{`Employee ID: ${employeeID}`}</div>
                                    <div className='hldesc'  name='filch' >{`${employeeFirst} ${employeeLast} (${employeeDates.length})`}</div>
                                    <IoIosClose className='xcards' onClick={()=>{
                                        setDateExcludeEmployees((employees)=>{
                                            return employees.filter((femploee)=>{
                                                return femploee!== employee
                                            })
                                        })
                                    }}/>
                                    <IoIosArrowDown className='shdates'/>
                                </div>
                            })}                            
                        </div>:
                        'Employee Date filters appear here.'}
                    </div>
                    <div>
                        {focusedEmployee!==null ?
                            <div className='fltinp' >
                                <input
                                    className='dtinp empinp'
                                    type='date'    
                                    name='value'
                                    value={employeeDate}
                                    onChange={
                                        (e)=>{
                                            setEmployeeDate(e.target.value)
                                        }
                                    }
                                />
                                <div className='addflt' onClick={()=>{

                                    if(employeeDate){
                                        setDateExcludeEmployees((dateexcludeEmployees)=>{
                                            dateexcludeEmployees.forEach((employee)=>{
                                                if(employee['Employee ID'] === focusedEmployee['Employee ID']){
                                                    employee['Excluded Dates'] = employee['Excluded Dates'].concat([employeeDate])
                                                    setFocusedEmployee(employee)
                                                }
                                            })
                                            return [...dateexcludeEmployees]
                                        })
                                        setEmployeeDate('')
                                    }else{
                                        setFocusedEmployee(null)
                                    }
                                }}>{employeeDate? "Add": "Back"}</div>
                            </div> 
                             :
                            <div className='fltinp' onChange={holidayInput}>
                                <select
                                    className='dtinp empinp'
                                    type='text'
                                    name='excludedentry'
                                    placeholder='Select Employee'    
                                    value = {dateExcludedEntry}
                                    onChange={(e)=>{
                                        setDateExcludedEntry(e.target.value)
                                    }}
                                >
                                    <option value={''}>{'Select Employee'}</option>
                                    {employeeDetails.filter((employee)=>{
                                        return !dateexcludeEmployees.map((emp)=>{
                                            return emp['Employee ID']
                                        }).includes(employee['Employee ID'])
                                    }).map((employee, index)=>{
                                        const employeeID = employee['Employee ID']
                                        const employeeFirst = employee['First Name']
                                        const employeeLast = employee['Last Name']
                                        return <option 
                                            key={index} 
                                            value={employeeID}
                                        >
                                            {`ID:${employeeID} ${employeeFirst} ${employeeLast}`}
                                        </option>
                                    })}
                                </select>
                                <div className='addflt' onClick={()=>{
                                    if(dateExcludedEntry){
                                        setDateExcludeEmployees((employees)=>{
                                            const employeelist = employeeDetails.filter((employee)=>{
                                                return employee['Employee ID'] === dateExcludedEntry
                                            })
                                            var employee = {...employeelist[0]}
                                            employee['Excluded Dates'] = []
                                            return [...employees, employee]
                                        })
                                        setDateExcludedEntry('')
                                    }
                                }}>Add</div>
                            </div>
                        }
                    </div>
                </div>
            </div>
            <div className='datatable'>
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
            </div>

        </>
    )
}

export default FormPage