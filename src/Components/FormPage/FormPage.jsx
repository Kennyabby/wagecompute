import './FormPage.css'
import { useEffect, useState, useRef, useCallback, PureComponent } from "react";
import { read, utils, writeFileXLSX } from 'xlsx';


const FormPage = ()=>{
    const fileReader = useRef(null)
    const [file, setFile] = useState(null)
    const [pres, setPres] = useState([])
    const [presHeaders, setPresHeaders] = useState([])
    const [totalTimeObject, setTotalTimeObject] = useState([])
    const [employeeDetails, setEmployeeDetails] = useState([])
    const [punchedDays, setPunchedDays] = useState(0)
    const [field, setField] = useState({
        id:"",  
        name:""
    })
   

    const uploadFile = async(e)=>{        
        const f = await file.arrayBuffer()
        const wb =  read(f)
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = utils.sheet_to_json(ws)
        // console.log(data)
        setPres(data)
        e.target.parentElement.children[0].value='' 
        setFile(null)
    }

    const exportFile = useCallback(() => {
        const ws = utils.json_to_sheet(pres);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Data");
        writeFileXLSX(wb, "JazmyneBiometricSheet.xlsx");
    }, [pres]);

    const computeMonthlyHours = (totalTimeObject)=>{
        const expectedWorkDays = punchedDays.length
        const expectedWorkHours = expectedWorkDays * 9
        var employeeDet = employeeDetails
        employeeDet.forEach((employee)=>{
            let asumTime = 0
            let ssumTime = 0
            let act = 0
            let sct = 0
            totalTimeObject.forEach((timeObject)=>{
                if (employee['Employee ID'] === timeObject['Employee ID']){
                    asumTime += timeObject['Total Hours'] 
                    act++
                    const workdate = timeObject['Date']
                    const newworkdate = new Date(workdate)
                    if(newworkdate.getDay()===0){
                        ssumTime += timeObject['Total Hours'] 
                        sct++
                        asumTime -= timeObject['Total Hours'] 
                        act--
                    }
                }

            })
            const auctualWorkHours = parseFloat(asumTime.toFixed(2))
            const sundaysWorkHours = parseFloat(ssumTime.toFixed(2))
            const wovertime = parseFloat((auctualWorkHours - expectedWorkHours).toFixed(2))
            const deductable = parseFloat((expectedWorkHours - auctualWorkHours).toFixed(2))
            employee['Worked Days (Expected)'] = expectedWorkDays
            employee['Worked Days (Actual)'] = act
            employee['Worked Hours (Expected)'] = expectedWorkHours
            employee['Worked Hours (Actual)'] = auctualWorkHours
            employee['Worked Hours Overtime'] = wovertime > 0 ? wovertime : 0
            employee['Deductable Hours'] = deductable > 0 ? deductable : 0
            employee['Worked Times (Sundays)'] = sct
            employee['Sunday Work Hours'] = sundaysWorkHours 
        })
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
            const totalTime = punch['Total Time']
            const punchHour = Number(totalTime.slice(0,totalTime.indexOf(':')))
            const punchMinutes = Number(totalTime.slice(totalTime.indexOf(':')+1,))
            var totalHours = punchHour + punchMinutes/60
            if (totalHours === 0){
                totalHours = 9
            }
            setTotalTimeObject((totalTimeObject)=>{
                return [...totalTimeObject, {'Employee ID': employeeID, 
                    'First Name': employeeFirst,
                    'Last Name': employeeLast,
                    'Department': employeeDept,
                    'Date': punchDate,
                    'Total Hours': totalHours, }]
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
    useEffect(()=>{
        // console.log(field)
    },[field])
    useEffect(()=>{
        if (pres[0]!==undefined){
            const headers = Object.keys(pres[0])
            setPresHeaders(headers)                
        }
    },[pres])
    useEffect(()=>{
        computeMonthlyHours(totalTimeObject)
    },[totalTimeObject])
    return (
        <>
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