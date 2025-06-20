import './Inventory.css'

import { useState, useEffect, useContext, useRef } from "react";
import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import html2pdf from 'html2pdf.js';
import ContextProvider from "../../Resources/ContextProvider";
import Products from './Products/Products';
import Adjustments from './Operations/Adjustments/Adjustments';
import Measures from './Settings/Measures/Measures';
import { MdArrowBackIosNew, MdArrowForwardIos } from "react-icons/md";
import { PiCards } from "react-icons/pi";
import { FaThList } from "react-icons/fa";
import Stock from './Stock/Stock';
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

    const targetRef = useRef(null)
    const [postingDate, setPostingDate] = useState(new Date(Date.now()).toISOString().slice(0,10))
    const [view, setView] = useState('')
    const [popModal, setPopModal] = useState('')
    const [isNewView, setIsNewView] = useState(false)
    const [isOnView, setIsOnView] = useState(false)
    const [clickedLabel, setClickedLabel] = useState('Products')
    const [isSaveValue, setIsSaveValue] = useState(false)
    const [curProductIndex, setCurProductIndex] = useState(0)
    const [isDeleteValue, setIsDeleteValue] = useState(false)
    const [isImportValue, setIsImportValue] = useState(false)
    const [isTransferValue, setIsTransferValue] = useState(false)
    const [settingsDrop, setSettingsDrop] = useState(false)
    const [productView,setProductView] = useState('card')
    const [curProduct, setCurProduct] = useState(null)
    const [dropLabel, setDropLabel] = useState(null)
    const dropMenu = {
        Overview:[],
        Operations:['Adjustments','Receipts','Deliveries','Internal'],
        Products:[],
        Reporting:['Stock','Locations','Moves History'],
        Settings:['Warehouses','Locations','Unit of Measures']
    }
    
    const popModals = ['Unit of Measures', 'Warehouses', 'Locations']
    const settingsMenu = {
        Products:[
            {
                name:'import record',
                status: 'other'
            },
            {
                name:'delete',
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
        ],
        Stock:[
            {
                name:'internal transfer',
                status: 'other'
            },            
        ]
    }

    if (!companyRecord?.permissions.includes('imports') && 
        companyRecord?.status !== 'admin'){
        delete settingsMenu['Products']
        delete settingsMenu['Ajustments']
    }
    if (!companyRecord?.permissions.includes('internal_transfer') && 
        companyRecord?.status !== 'admin'){
        delete settingsMenu['Stock']
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
            productView={productView}
            curProduct={curProduct}
            postingDate={postingDate}
            setPostingDate={setPostingDate}
            setCurProduct={setCurProduct}
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
            postingDate={postingDate}
            setPostingDate={setPostingDate} 
        />,
        'Stock': <Stock
            isNewEntry={isNewView === clickedLabel}
            isSaveClicked={isSaveValue === 'Stock'}
            setIsSaveValue={setIsSaveValue}
            setIsNewView={setIsNewView}
            setIsOnView={setIsOnView}
            clickedLabel={clickedLabel}
            isTransferClicked={isTransferValue === 'Stock'}
            setIsTransferValue={setIsTransferValue}
            postingDate={postingDate}
            setPostingDate={setPostingDate}
        />,
        'Unit of Measures': <Measures
            setPopModal={setPopModal}
            postingDate={postingDate}
            setPostingDate={setPostingDate}
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
        isDeleteValue, isImportValue, isTransferValue,
        isNewView, productView, curProduct
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
                setIsTransferValue(false)
                setCurProduct(null)
            }
            if (name!==dropLabel){
                setDropLabel(name)
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
                    setIsTransferValue(false)
                    setCurProduct(null)
                }
                if (Object.keys(dropMenu).includes(innerHTML)){
                    setClickedLabel(name)
                    setDropLabel(name)
                }else{
                    if (!popModals.includes(innerHTML)){
                        setClickedLabel(innerHTML)
                    }else{
                        setPopModal(
                            views[innerHTML]
                        )
                    }
                    // setDropLabel(name)
                }
            }
            
        }
    }

    const handleClickedLabel = () =>{
        setIsNewView(false)
        setIsOnView(false)   
        setIsImportValue(false)
        setIsTransferValue(false)
        setIsTransferValue(false)
        setCurProduct(null)
    }

    const handleSaveAction = (e) =>{
        setIsNewView(clickedLabel)
        setIsSaveValue(clickedLabel)
    }

    const handleSettingAction = (e)=>{
        const name = e.target.getAttribute('name')
        if (name === 'delete'){
            if (!isOnView){
                setIsDeleteValue(clickedLabel)
            }else{
                setIsNewView(clickedLabel)
                setIsDeleteValue(clickedLabel)
            }
        }
        if (name === 'import record'){
            // setIsNewView(clickedLabel)
            setIsNewView(false)
            setIsOnView(false)
            setIsImportValue(clickedLabel)
        }
        if (name === 'internal transfer'){
            setIsNewView(false)
            setIsOnView(false)
            setIsTransferValue(clickedLabel)
        }
        setSettingsDrop(false)
    }

    const printToPDF = () => {
        const element = targetRef.current;
        const options = {
            margin:       0.1,
            filename:     `INVENTORY RECORD REPORT`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'A4', orientation: 'portrait' }
        };
        html2pdf().set(options).from(element).save();
    };
    return (
        <>
            <div className='inventory'>
                {popModal && popModal}
                <div className='inventoryTop'>
                    <div className='inv-top1' onClick={(e)=>{handleLabelClick(e)}}>                        
                        {Object.keys(dropMenu).map((mainMenu, mainId)=>{
                            return (
                                <div key={mainId} className='inventoryLabelCover'>
                                    <label className={'inventoryLabel' + ((clickedLabel === mainMenu || dropLabel === mainMenu || (dropMenu[mainMenu].includes(clickedLabel))) ? ' inventoryLabelClicked': '')} name={mainMenu}>{mainMenu}</label>
                                    {((dropLabel === mainMenu) && dropMenu[dropLabel]?.length!==0) && <div className='inventoryDropMenu'>
                                        {dropMenu[dropLabel]?.map((menu, id)=>{
                                            if (menu === 'Adjustments'){
                                                return (                                                
                                                    (
                                                        companyRecord?.permissions.includes('adjustments') || 
                                                        companyRecord?.status === 'admin'
                                                    ) && <label key={id} name={mainMenu}>{menu}</label>
                                                )
                                            }else{
                                                return (
                                                    <label key={id} name={mainMenu}>{menu}</label>
                                                )
                                            }
                                        })}
                                    </div>}
                                </div>
                            )
                        })}
                    </div>
                    {['Products', 'Adjustments', 'Stock'].includes(clickedLabel) && <div className='inv-top2'>
                        <div 
                            className='new'                             
                        >
                            {!isNewView && <button onClick={()=>{
                                if (clickedLabel === 'Stock'){
                                    setClickedLabel('Products')
                                    setIsNewView('Products')
                                }else{
                                    setIsNewView(clickedLabel)
                                }
                                setIsOnView(false)
                                setIsImportValue(false)
                                setIsTransferValue(false)
                            }}>New</button>}

                            {isTransferValue && <button onClick={()=>{
                                setIsSaveValue('Stock')
                            }}>Post Transfer</button>}

                            <label>
                                {isNewView && '/ '}
                                <span 
                                    style={{cursor:(!isNewView) ? ((isImportValue || isTransferValue) ? 'pointer':'') : 'pointer'}} 
                                    onClick={()=>{handleClickedLabel()}} 
                                    name={clickedLabel}
                                >
                                    {clickedLabel}
                                </span>           
                                <div style={{display: 'flex'}}>                                                                                                
                                    {<div className='pr-settings'>                                            
                                            {(!isImportValue && !isTransferValue)  && 
                                                <IoIosSettings 
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
                                                                (menu.status === 'view') && <span key={id} name={menu.name}>{menu.name}</span>
                                                            )
                                                        }else{
                                                            if (menu.status === 'other'){
                                                                if (productView === 'list'){
                                                                    return (
                                                                        (menu.name === 'delete' || menu.name === 'import record') && <span key={id} name={menu.name}>{menu.name}</span>
                                                                    )
                                                                }else{
                                                                    return (
                                                                        (['import record', 'internal transfer'].includes(menu.name)) && <span key={id} name={menu.name}>{menu.name}</span>
                                                                    )                                                        
                                                                }
                                                            }
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
                            {(isNewView || isTransferValue) &&<div className='inpcov invdate'>
                                <input 
                                    className='forminp'
                                    name='postingDate'
                                    type='date'
                                    placeholder='Posting Date'
                                    value={postingDate}
                                    onChange={(e)=>{
                                        setPostingDate(e.target.value)
                                    }}
                                />
                            </div>}
                        </div>
                        <div className='search'></div>
                        <div className='filter'>
                            {companyRecord.status==='admin' && <div
                                className='slprwh-print'
                                onClick={()=>{
                                    printToPDF()
                                }}
                            >Print Page Details</div>}
                            {['Products'].includes(clickedLabel) && curProduct &&
                                <div className='filterIndex'>
                                    {[''].map((args, ind)=>{
                                        var currentIndex = 0
                                        products.forEach((product, index)=>{
                                            if (product.i_d === curProduct.i_d){
                                                currentIndex = index
                                            }
                                        })
                                        return (`${currentIndex + 1} / ${products.length}`)
                                    })}
                                </div>
                            }
                            {['Products'].includes(clickedLabel) && 
                                <div 
                                    className='filterArrow'
                                    onClick={(e)=>{
                                        const name = e.target.getAttribute('name')
                                        var currentIndex = 0
                                        products.forEach((product, index)=>{
                                            if (product.i_d === curProduct.i_d){
                                                currentIndex = index
                                            }
                                        })
                                        if (name === 'back'){
                                            if (curProduct){
                                                if (currentIndex > 0){
                                                    setCurProduct(products[currentIndex-1])
                                                }
                                            }
                                        }else if (name === 'forward'){
                                            if (curProduct){
                                                if (currentIndex < products.length-1){
                                                    setCurProduct(products[currentIndex+1])
                                                }
                                            }
                                        }
                                    }}
                                >   
                                    <MdArrowBackIosNew name='back' className={'filterArrowIcon'}/>
                                    <MdArrowForwardIos name='forward' className={'filterArrowIcon'}/>
                                </div>
                            }
                            {['Products'].includes(clickedLabel) && !isNewView && 
                            <div 
                                className='filterViewMode'
                                onClick={(e)=>{
                                    const name = e.target.getAttribute('name')
                                    if (name){
                                        setProductView(name)
                                    }
                                }}
                            >                                
                                <div name='card' className={'filterViewIcon' + (productView === 'card' ? ' viewActive' : '')}>
                                    <PiCards name='card'/>
                                </div>
                                <div name='list' className={'filterViewIcon' + (productView === 'list' ? ' viewActive' : '')}>                                    
                                    <FaThList name='list'/>
                                </div>
                            </div>}
                        </div>
                    </div>}
                </div>
                <div className='inventoryView' ref={targetRef}>
                    {view}
                </div>
            </div>
        </>
    )
}

export default Inventory