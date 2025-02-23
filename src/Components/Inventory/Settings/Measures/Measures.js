import './Measures.css'
import {useState, useEffect, useContext} from 'react'
import ContextProvider from '../../../../Resources/ContextProvider'

const Measures = ({setPopModal})=>{
    
    const {server, fetchServer, company,
        settings, getSettings,
        setAlert, setAlertState, setAlertTimeout
    } = useContext(ContextProvider)

    const [uoms, setUoms] = useState([])
    const [bases, setBases] = useState([])
    const [newEntry, setNewEntry] = useState(false)
    const [saveEntry, setSaveEntry] = useState(false)    
    const defaultFields = {
        type:'conversion',
        code:'',
        name:'',
        base:'pcs',
        multiple:''
    }
    const [fields, setFields] = useState({...defaultFields})
    useEffect(()=>{
        if (settings.length){  
            const uomSetFilt = settings.filter((setting)=>{
                return setting.name === 'uom'
            })
            delete uomSetFilt[0]?._id
            setUoms(uomSetFilt[0].name?[...uomSetFilt[0].mearsures]:[])
            setBases(uomSetFilt[0].mearsures?.filter((uom)=>{
                return uom.type === 'base'
            }))
        }  
    },[settings])

    const handleSaveMeasures = async () =>{
        if (fields.type && fields.name && fields.code && fields.base && 
            fields.multiple
        ){
            setAlertState('info');
            setAlert('Adding Measure...');
            const newMeasure = {
                ...fields,
                createdAt: Date.now()
            }
            const newUoms = [...uoms, newMeasure]
            const resps = await fetchServer("POST", {
                database: company,
                collection: "Settings",
                prop: [{ name: 'uom' }, { 'mearsures': newUoms}]
            }, "updateOneDoc", server);
            if (!resps){
                setAlertState('info');
                setAlert(resps.message);
                setAlertTimeout(5000);
                return
            }else{
                setAlertState('success');
                setAlert('New Measure Added Successfully!')
                setAlertTimeout(5000)
                setNewEntry(false)
                setFields({...defaultFields})
                setUoms(newUoms)
                getSettings(company)
            }
        }else{
            setAlertState('error')
            setAlert('All Field are Required!')
            setAlertTimeout(3000)
        }
    }
    const handleFieldChange = (e)=>{
        const name = e.target.getAttribute('name')
        const value = e.target.value

        if (name){
            if (name==='type'){
                if (value === 'base'){                               
                    setFields((fields)=>{
                        return {...fields, [name]:value, multiple: 1}
                    })
                }else{
                    setFields((fields)=>{
                        return {...fields, [name]:value }
                    })
                }
            }else{
                setFields((fields)=>{
                    return {...fields, [name]:value }
                })
            }
        }
    }
    return (
        <>
            <div className='modalView'>
                <div className='measures'>
                    <div 
                        className='closeModal'
                        onClick={()=>{
                            setPopModal('')
                        }}
                    >Close</div>     
                    <div className='modal-title'>Units of Measurement</div>           
                    <div className='measures-list-container'>
                        {!newEntry && <div 
                            className='new-record'
                            onClick={()=>{
                                setNewEntry(true)
                            }}
                        >
                            New
                        </div>}
                        <div style={{display:'flex'}}>
                            {newEntry && <div 
                                className='new-record'
                                onClick={handleSaveMeasures}
                            >
                                Save
                            </div>}
                            {newEntry && <div 
                                className='new-record'
                                onClick={()=>{
                                    setNewEntry(false)
                                    setFields({...defaultFields})
                                }}
                            >
                                Cancel
                            </div>}
                        </div>
                        
                        <div className='measures-list'>
                            <div className='measures-list-title'>
                                <div>Type</div>
                                <div>Code</div>
                                <div>Name</div>
                                <div>Base</div>
                                <div>Multiple</div>
                            </div>
                            {uoms.map((uom,index)=>{
                                return (                                
                                    <div key={index} className='measures-list-content'>
                                        <div>{uom.type}</div>                                        
                                        <div>{uom.code}</div>                                        
                                        <div>{uom.name}</div>                                        
                                        <div>{uom.base}</div>                                        
                                        <div>{uom.multiple}</div>                                        
                                    </div>
                                )
                            })}
                            {newEntry && <div 
                                className='measures-list-content'
                                onChange={handleFieldChange}
                            >
                                <select
                                    type='text' 
                                    name='type'
                                    value={fields.type}
                                >
                                    <option value={'conversion'}>conversion</option>
                                    <option value={'base'}>base</option>
                                </select>
                                <input 
                                    type='text' 
                                    name='code'
                                    value={fields.code}
                                />
                                <input 
                                    type='text' 
                                    name='name'
                                    value={fields.name}
                                />
                                <select
                                    type='text' 
                                    name='base'
                                    value={fields.base}
                                >
                                    {bases?.map((base, idx)=>{
                                        return <option key={idx} value={base.code}>{base.code}</option>
                                    })}
                                </select>
                                <input 
                                    type='number' 
                                    name='multiple'
                                    value={fields.multiple}
                                />
                            </div>}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Measures