import './Departments.css'

import {useEffect, useState, useCallback } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'

const Departments = () =>{
    const [writeStatus, setWriteStatus] = useState('New')
    const [editId, setEditId] = useState(null)
    const [editName, setEditName] = useState(null)
    const [viewName, setViewName] = useState(null)
    const [addBlock, setAddBlock] = useState(false)
    const [fields, setFields] = useState({
        name:'',
        description:''
    })
    const {storePath, 
        fetchServer, 
        server, 
        company,
        employees,getEmployees,
        departments, setDepartments, getDepartments
    } = useContext(ContextProvider)
    useEffect(()=>{
        storePath('departments')  
    },[storePath])
    useEffect(()=>{
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        const intervalId = setInterval(()=>{
          if (cmp_val){
            getEmployees(cmp_val)
            getDepartments(cmp_val)           
          }
        },10000)
        return () => clearInterval(intervalId);
    },[window.localStorage.getItem('sessn-cmp')])
    useEffect(()=>{
        var depts = [...departments]
        departments.forEach((dept,index) => {
            const deptEmps = employees.filter((emp)=>{
                return emp.department === dept.name
            })
            depts[index].employees = deptEmps
            setDepartments(depts)
        });
    },[employees])
    const addDepartment = async ()=>{
        if (fields.name){
            const newDepartment = {
                ...fields,
                employees: []
            }
            const newDepartments = [...departments, newDepartment]
            
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Departments", 
                update: newDepartment
              }, "createDoc", server)
              
              if (resps.err){
                console.log(resps.mess)
              }else{
                setDepartments(newDepartments)
                setAddBlock(false)
                setViewName(newDepartment.name)
                setFields((fields)=>{
                    return {...fields, name:'',description:''}
                })
                getDepartments(company)
              }
          
        }
    }
    const editDepartment = async ()=>{
        const name = editName
        const index = Number(editId)
        // console.log(departments[index])
        if (fields.name){
            const updatedDepartment = {
                ...fields,
                employees: departments[index].employees
            }
            const filteredDept = departments.filter((dept)=>{
                return dept.name!==name
            })
            const updatedDepartments = [...filteredDept, updatedDepartment]
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Departments", 
                prop: [{name: name}, updatedDepartment]
              }, "updateOneDoc", server)
              
              if (resps.err){
                console.log(resps.mess)
              }else{
                  setDepartments(updatedDepartments)
                  setAddBlock(false)
                  setFields((fields)=>{
                      return {...fields, name:'',description:''}
                  })
                  setEditName(null)
                  setViewName(updatedDepartment.name)
                  getDepartments(company)
              }
    
        }
    }

    const deleteDepartment = async()=>{
        const name = editName
        const index = Number(editId)
        const filteredDept = departments.filter((dept)=>{
            return dept.name!==name
        })
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Departments", 
            update: {name: name}
        }, "removeDoc", server)
        if (resps.err){
            console.log(resps.mess)
        }else{
            setDepartments(filteredDept)
            setAddBlock(false)
            setFields((fields)=>{
                return {...fields, name:'',description:''}
            })
            setEditName(null)
            setViewName(null)
            getDepartments(company)
        }
    }

    const handleFieldChange = (e)=>{
        const name = e.target.getAttribute('name')
        const value = e.target.value
        setFields((fields)=>{
            return {
                ...fields, [name]:value
            }
        })
    }
    return(
        <>
            <div className='employees'>
                <div className='emplist'>
                  <div className='add' onClick={()=>{
                    setWriteStatus('New')
                    setAddBlock(true)
                    setViewName(null)
                  }}>{'+'}</div>
                  {addBlock && <div className='addblock' onChange={handleFieldChange}>
                        <div className='formtitle'>
                            <div>
                                {`${writeStatus} Department`}
                            </div>
                            {writeStatus==='Edit'&&<div className='yesbtn popbtn delbtn'
                                onClick={deleteDepartment}
                            >Delete</div>}
                        </div>
                        <div className='inpcov formpad'>
                            <div>Department</div>
                            <input 
                                className='forminp'
                                name='name'
                                type='text'
                                placeholder='Enter Department'
                                value={fields.name}
                            />
                        </div>
                        <div className='inpcov formpad'>
                            <div>Description</div>
                            <textarea
                                className='inppad'
                                name='description'
                                type='text'
                                placeholder="Describe this department"
                                value={fields.description}
                            />
                        </div>
                        <div className='cfm'>
                            <div className='yesbtn popbtn nobtn'
                                onClick={()=>{
                                    setFields((fields)=>{
                                        return {
                                            ...fields, name:'',
                                            description:''
                                        }
                                    })
                                    setAddBlock(false)
                                    setEditName(null)
                                }}
                            >Discard</div>
                            <div className='yesbtn popbtn' 
                                onClick={()=>{
                                    if (writeStatus==='New'){
                                        addDepartment()
                                    }else{
                                        editDepartment()
                                    }
                                }}
                            >Save</div>
                        </div>
                  </div>}
                  {departments.map((department, id)=>{
                    const {name, description, employees} = department
                    if (editName!==name){

                        return(
                            <div className={'dept' + (viewName===name?' curview':'')} key={id} name={name}
                                onClick={()=>{
                                    setViewName(name)
                                }}
                            >
                                <div className='dets'>
                                    <div><b>Department: </b>{name}</div>
                                    <div className='deptdesc'>{description}</div>
                                    <div> <b>{employees.length}</b>{' Employee(s) Present'}</div>
                                </div>
                                <div 
                                className='edit'
                                onClick={()=>{
                                    
                                    setEditId(id)
                                    setEditName(name)
                                    setWriteStatus('Edit')
                                    setFields((fields)=>{
                                        return {
                                            ...fields, name:name, description
                                        }
                                    })
                                    setAddBlock(true)
                                }}>Edit</div>
                            </div>
                        )
                    }
                  })}
                </div>
                <div className='empview'></div>
            </div>
        </>
    )
}

export default Departments