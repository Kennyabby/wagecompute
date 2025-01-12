import './Settings.css'

import {useEffect, useState, useCallback } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import { useContext } from 'react'

const Settings = () =>{
    const {storePath, 
        company,
        settings, getSettings,
        server, fetchServer,
        recoveryVal, setRecoveryVal
    } = useContext(ContextProvider)
    const [colname, setColname] = useState('')
    const [writeStatus, setWriteStatus] = useState('Add')
    const [editCol, setEditCol] = useState(null)
    // const [columns, setColumns] = useState([])
    const [colSettings, setColSettings] = useState({})
    const [saveStatus, setSaveStatus] = useState('')
    const [settingRecovery, setSettingRecovery] = useState(false)
    useEffect(()=>{
        storePath('settings')  
    },[storePath])

    useEffect(()=>{
        if (settings?.length){
            const colSetFilt = settings.filter((setting)=>{
                return setting.name === 'import_columns'
            })
            delete colSetFilt[0]?._id
            setColSettings(colSetFilt[0]?colSetFilt[0]:{})

            const recvSetFilt = settings.filter((setting)=>{
                return setting.name === 'debt_recovery'
            })
            console.log(recvSetFilt[0].enabled)
            if (!settingRecovery){
                setRecoveryVal(recvSetFilt[0]?recvSetFilt[0].enabled:false)
            }
        }
    },[settings,settingRecovery])
  
    const addColumn = async ()=>{
        if (colname && !colSettings.import_columns?.includes(colname)){
            var postingCols = []
            if (writeStatus==='Edit'){
                const filtcols = colSettings.import_columns?.filter((col)=>{
                    return col !== editCol
                }) 
                postingCols = [...filtcols, colname]   
            }
            else{
                const columns = colSettings.import_columns?[...colSettings.import_columns]:[]
                postingCols = [...columns, colname]
            }

            if (colSettings.name){
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Settings", 
                    prop: [{name: 'import_columns'}, {...colSettings, import_columns: [...postingCols]}]
                }, "updateOneDoc", server)
                
                if (resps.err){
                 console.log(resps.mess)
                }else{
                    setWriteStatus('Add')
                    getSettings(company)
                }
            }else{
                const resps = await fetchServer("POST", {
                    database: company,
                    collection: "Settings", 
                    update: {...colSettings, name:'import_columns',import_columns: [...postingCols]}
                }, "createDoc", server)
                if (resps.err){
                    console.log(resps.mess)
                }else{
                    getSettings(company)
                }
            }
        }
        setColname('')
    }
    const delColumn = async (e)=>{
        setSaveStatus('Saving...')
        const colid = Number(e.target.getAttribute('name'))
        console.log(colid)
        const filtcols = colSettings.import_columns.filter((col,index)=>{
            return index !== colid
        }) 
        console.log(filtcols)
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Settings", 
            prop: [{name: 'import_columns'}, {...colSettings, import_columns: [...filtcols]}]
        }, "updateOneDoc", server)
        if (resps.err){
            console.log(resps.mess)
            setSaveStatus(resps.mess)
        }else{
            setSaveStatus('Saved')
            getSettings(company)
            setColname('')
            setWriteStatus('Add')
        }
    }

    const setRecoveryPermission = async (recoveryVal)=>{
        setSaveStatus('Saving...')
        setSettingRecovery(true)
        const resps = await fetchServer("POST", {
            database: company,
            collection: "Settings", 
            prop: [{name: 'debt_recovery'}, {enabled: recoveryVal}]
        }, "updateOneDoc", server)
        if (resps.err){
            console.log(resps.mess)
            setSaveStatus(resps.mess)
            setSettingRecovery(false)
        }else{
            setSaveStatus('Saved')
            getSettings(company)
            setSettingRecovery(false)
        }
    }
    return(
        <>
            <div className='settings'>
                {saveStatus && <div className='save-status'>{saveStatus}</div>}
                <div className='columns'>
                    <div className='formtitle'>Set Import Columns</div>
                    <div className='inpcov formpad'>
                        <div>Column Name</div>
                        <div className='addsection'>
                            <input 
                                className='forminp'
                                name='colname'
                                type='text'
                                placeholder={`${writeStatus} Import Column`}
                                value={colname}
                                onChange={(e)=>{
                                    setColname(e.target.value)
                                }}
                            />
                            <div className='addcolumn'
                                onClick={addColumn}
                            >{writeStatus}</div>
                            {writeStatus === 'Edit' && <div className='addcolumn dcol'
                                onClick={()=>{
                                    setEditCol(null)
                                    setColname('')
                                    setWriteStatus('Add')
                                }}
                            >Discard</div>}
                        </div>
                    </div>
                    <div className='columnsbox'>
                        {colSettings.import_columns?.map((col, id)=>{
                            return <div className='col' key={id} name={id}
                                onClick={()=>{
                                    setWriteStatus('Edit')
                                    setColname(col)
                                    setEditCol(col)
                                }}
                            >
                                {col}
                                <div className='delcol'
                                    name={id}
                                    onClick={delColumn}
                                >X</div>
                            </div>
                        })}
                    </div>
                </div>
                <div className='recovery'>
                    <div className='formtitle'>Set Debt Recovery Permission</div>
                    <div className='recovery-block'>
                        Enable Debt Recovery 
                        <input 
                            type='checkbox'
                            checked={recoveryVal}
                            onChange={(e)=>{
                                setRecoveryVal(!recoveryVal)
                                setRecoveryPermission(!recoveryVal)
                            }}
                        />
                    </div>
                </div>
            </div>
        </> 
    )
}

export default Settings