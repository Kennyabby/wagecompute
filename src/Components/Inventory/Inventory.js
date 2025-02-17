import './Inventory.css'

import { useState, useEffect, useContext } from "react";
import ContextProvider from "../../Resources/ContextProvider";
import Products from './Products/Products';
import Adjustments from './Operations/Adjustments/Adjustments';

import { FaCloudArrowUp } from "react-icons/fa6";
import { IoIosSettings } from "react-icons/io";

const Inventory = ()=>{
    
    const {storePath,
        server, fetchServer,
        getDate,
        company, companyRecord,
        monthDays,months, years,
        employees, getEmployees, sales,
        products, setProducts, getProducts
    } = useContext(ContextProvider)

    const [view, setView] = useState('')
    const [isNewView, setIsNewView] = useState(false)
    const [isOnView, setIsOnView] = useState(false)
    const [clickedLabel, setClickedLabel] = useState('Products')
    const [isSaveValue, setIsSaveValue] = useState(false)
    const [isDeleteValue, setIsDeleteValue] = useState(false)
    const [isImportValue, setIsImportValue] = useState(false)
    const [settingsDrop, setSettingsDrop] = useState(false)
    const [dropLabel, setDropLabel] = useState(null)
    const dropMenu = {
        Overview:[],
        Operations:['Adjustments','Receipts','Deliveries','Internal'],
        Products:[],
        Reporting:['Stock','Locations','Moves History'],
        Settings:['Warehouses','Locations','Unit of Measures']
    }
    
    const settingsMenu = {
        Products:[
            {
                name:'import record',
                status: 'other'
            },
            {
                name:'delete',
                status: 'view'
            }
        ],
        Adjustments:[
            {
                name:'import record',
                status: 'other'
            }
        ]
    }

    const views = {
        'Products': <Products 
            isNewProduct={isNewView === clickedLabel}
            isProductView={isOnView === clickedLabel}
            setIsNewView={setIsNewView} 
            setIsOnView={setIsOnView}
            clickedLabel={clickedLabel}
            isSaveClicked={isSaveValue === 'Products'}
            setIsSaveValue={setIsSaveValue}
            isDeleteClicked={isDeleteValue === 'Products'}
            setIsDeleteValue={setIsDeleteValue}
            isImportClicked={isImportValue === 'Products'}
            setIsImportValue={setIsImportValue}
        />,
        'Adjustments': <Adjustments
            isNewEntry={isNewView === clickedLabel}
            setIsNewView={setIsNewView}
            setIsOnView={setIsOnView}
            clickedLabel={clickedLabel}
            isSaveClicked={isSaveValue === 'Adjustments'}
            setIsSaveValue={setIsSaveValue}
            isDeleteClicked={isDeleteValue === 'Adjustments'}
            setIsDeleteValue={setIsDeleteValue}
            isImportClicked={isImportValue === 'Adjustments'}
            setIsImportValue={setIsImportValue}  
        />
    }

    useEffect(()=>{
        storePath('inventory')  
    },[storePath])

    useEffect(()=>{
        if (views[clickedLabel] || isNewView){
            setView(
                views[clickedLabel]
            )
        }else{
            setView('')
        }
        setSettingsDrop(false)
    },[clickedLabel, isSaveValue, 
        isDeleteValue, isImportValue, 
        isNewView,
    ])
    
    const handleLabelClick = (e)=>{
        const name = e.target.getAttribute('name')
        const innerHTML = e.target.innerHTML
        if (dropMenu[innerHTML]?.length){
            if (name && !isNewView) {
                setIsNewView(false)
                setIsSaveValue(false)
                setIsImportValue(false)
                setIsDeleteValue(false)
            }
            if (name!==dropLabel){
                setDropLabel(name)
                // if (Object.keys(dropMenu))  
                // setClickedLabel(name)  
            }else{
                setDropLabel(null)
            }
        }else{
            setDropLabel(null)
            if (name){
                if (name!==clickedLabel){
                    setIsNewView(false)
                    setIsSaveValue(false)
                    setIsImportValue(false)
                    setIsDeleteValue(false)
                }
                if (Object.keys(dropMenu).includes(innerHTML)){
                    setClickedLabel(name)
                    setDropLabel(name)
                }else{
                    setClickedLabel(innerHTML)
                    // setDropLabel(name)
                }
            }
            
        }
    }

    const handleClickedLabel = (e) =>{
        setIsNewView(false)
        setIsOnView(false)   
        setIsImportValue(false)
    }

    const handleSaveAction = (e) =>{
        setIsNewView(clickedLabel)
        setIsSaveValue(clickedLabel)
    }

    const handleSettingAction = (e)=>{
        const name = e.target.getAttribute('name')
        if (name === 'delete'){
            setIsNewView(clickedLabel)
            setIsDeleteValue(clickedLabel)
        }
        if (name === 'import record'){
            // setIsNewView(clickedLabel)
            setIsNewView(false)
            setIsOnView(false)
            setIsImportValue(clickedLabel)
        }
        setSettingsDrop(false)
    }

    return (
        <>
            <div className='inventory'>
                <div className='inventoryTop'>
                    <div className='inv-top1' onClick={handleLabelClick}>                        
                        {Object.keys(dropMenu).map((mainMenu, mainId)=>{
                            return (
                                <div key={mainId} className='inventoryLabelCover'>
                                    <label className={'inventoryLabel' + ((clickedLabel === mainMenu || dropLabel === mainMenu || (dropMenu[mainMenu].includes(clickedLabel))) ? ' inventoryLabelClicked': '')} name={mainMenu}>{mainMenu}</label>
                                    {((dropLabel === mainMenu) && dropMenu[dropLabel]?.length!==0) && <div className='inventoryDropMenu'>
                                        {dropMenu[dropLabel]?.map((menu, id)=>{
                                            return (
                                                <label key={id} name={mainMenu}>{menu}</label>
                                            )
                                        })}
                                    </div>}
                                </div>
                            )
                        })}
                    </div>
                    {['Products', 'Adjustments'].includes(clickedLabel) && <div className='inv-top2'>
                        <div 
                            className='new'                             
                        >
                            {!isNewView && <button onClick={()=>{
                                setIsOnView(false)
                                setIsNewView(clickedLabel)
                                setIsImportValue(false)
                            }}>New</button>}

                            <label>
                                {isNewView && '/ '}
                                <span 
                                    style={{cursor:(!isNewView) ? (isImportValue ? 'pointer':'') : 'pointer'}} 
                                    onClick={handleClickedLabel} 
                                    name={clickedLabel}
                                >
                                    {clickedLabel}
                                </span>           
                                <div style={{display: 'flex'}}>                                                                                                
                                    {<div className='pr-settings'>                                            
                                            {!isImportValue && <IoIosSettings 
                                                className='pr-icon' 
                                                onClick={()=>{                                                    
                                                    setSettingsDrop(!settingsDrop)
                                                }}
                                            />}                              
                                            {settingsDrop && 
                                                <div className='settingsDrop' onClick={handleSettingAction}>
                                                    {settingsMenu[clickedLabel]?.map((menu, id)=>{
                                                        if (isOnView){
                                                            return (
                                                                (menu.status === 'view') && <label key={id} name={menu.name}>{menu.name}</label>
                                                            )
                                                        }else{
                                                            return (
                                                                (menu.status === 'other') && <label key={id} name={menu.name}>{menu.name}</label>
                                                            )                                                        
                                                        }
                                                    })}
                                                </div>
                                            }
                                    </div>}  
                                    {isNewView && 
                                        <FaCloudArrowUp 
                                            name={clickedLabel}
                                            onClick={handleSaveAction} 
                                            className='pr-icon'
                                        />
                                    }
                                </div>                       
                            </label>
                        </div>
                        <div className='search'></div>
                        <div className='filter'></div>
                    </div>}
                </div>
                <div className='inventoryView'>
                    {view}
                </div>
            </div>
        </>
    )
}

export default Inventory