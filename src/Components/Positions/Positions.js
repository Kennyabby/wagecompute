import './Positions.css'

import {useEffect, useState, useCallback } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'

const Positions = () =>{
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
            employees, getEmployees,
            positions, setPositions, getPositions
    } = useContext(ContextProvider)
    useEffect(()=>{
        storePath('positions')  
    },[storePath])
    useEffect(()=>{
        var cmp_val = window.localStorage.getItem('sessn-cmp')
        const intervalId = setInterval(()=>{
          if (cmp_val){
            getEmployees(cmp_val)
            getPositions(cmp_val)
          }
        },10000)
        return () => clearInterval(intervalId);
    },[window.localStorage.getItem('sessn-cmp')])
    useEffect(()=>{
        var postns = [...positions]
        positions.forEach((pos,index) => {
            const posEmps = employees.filter((emp)=>{
                return emp.position === pos.name
            })
            postns[index].employees = posEmps
            setPositions(postns)
        });
    },[employees])
    const addPosition = async ()=>{
        if (fields.name){
            const newPosition = {
                ...fields,
                employees: []
            }
            const newPositions = [...positions, newPosition]
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Positions", 
                update: newPosition
            }, "createDoc", server)
            
            if (resps.err){
             console.log(resps.mess)
            }else{
                setPositions(newPositions)
                setAddBlock(false)
                setFields((fields)=>{
                    return {...fields, name:'',description:''}
                })
                setViewName(newPosition.name)
                getPositions(company)
            }
        }
    }
    const editPosition = async ()=>{
        const name = editName
        const index = Number(editId)
        if (fields.name){
            const updatedPosition = {
                ...fields,
                employees: positions[index].employees
            }
            const filteredPos = positions.filter((pos)=>{
                return pos.name!==name
            })
            const updatedPositions = [...filteredPos, updatedPosition]
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Positions", 
                prop: [{name: name}, updatedPosition]
            }, "updateOneDoc", server)
              
            if (resps.err){
                console.log(resps.mess)
            }else{
                  setPositions(updatedPositions)
                  setAddBlock(false)
                  setFields((fields)=>{
                      return {...fields, name:'',description:''}
                  })
                  setEditName(null)
                  setViewName(updatedPosition.name)
                  getPositions(company)
            }
        }
    }

    const deletePosition = async()=>{
        const name = editName
        const index = Number(editId)
        const filteredPos = positions.filter((pos)=>{
            return pos.name!==name
        })
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Positions", 
            update: {name: name}
        }, "removeDoc", server)
        if (resps.err){
            console.log(resps.mess)
        }else{
            setPositions(filteredPos)
            setAddBlock(false)
            setFields((fields)=>{
                return {...fields, name:'',description:''}
            })
            setEditName(null)
            setViewName(null)
            getPositions(company)
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
                                {`${writeStatus} Position`}
                            </div>
                            {writeStatus==='Edit'&&<div className='yesbtn popbtn delbtn'
                                onClick={deletePosition}
                            >Delete</div>}
                        </div>
                        <div className='inpcov formpad'>
                            <div>Position</div>
                            <input 
                                className='forminp'
                                name='name'
                                type='text'
                                placeholder='Enter Position'
                                value={fields.name}
                            />
                        </div>
                        <div className='inpcov formpad'>
                            <div>Description</div>
                            <textarea
                                className='inppad'
                                name='description'
                                type='text'
                                placeholder="Describe this position"
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
                                        addPosition()
                                    }else{
                                        editPosition()
                                    }
                                }}
                            >Save</div>
                        </div>
                  </div>}
                  {positions.map((position, id)=>{
                    const {name, description, employees} = position
                    if (editName!==name){
                        return(
                            <div className={'dept' + (viewName===name?' curview':'')} key={id} name={name}
                                onClick={()=>{
                                    setViewName(name)
                                }}
                            >
                                <div className='dets'>
                                    <div><b>Position: </b>{name}</div>
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

export default Positions