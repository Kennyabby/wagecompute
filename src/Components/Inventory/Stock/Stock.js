import React, { useState, useEffect, useRef, useContext } from 'react';
import ContextProvider from '../../../Resources/ContextProvider';
import './Stock.css';

const Stock = ({ 
    isNewEntry, 
    setIsNewView, 
    setIsOnView, 
    clickedLabel, 
    isSaveClicked, 
    setIsSaveValue, 
    isTransferClicked, 
    setIsTransferValue 
}) => {
    const {
        server, fetchServer, getProducts,
        setAlert, setAlertState, setAlertTimeout,
        products, settings, company
    } = useContext(ContextProvider);
    const intervalRef = useRef(null);
    const [wrhs, setWrhs] = useState([]);
    const [categories, setCategories] = useState([]);
    const [fromWarehouse, setFromWarehouse] = useState('');
    const [toWarehouse, setToWarehouse] = useState('');
    const [curWarehouse, setCurWarehouse] = useState('all');
    const [curCategory, setCurCategory] = useState('all');
    const defaultColumns = [
        { name: 'Product ID', reference: 'i_d', show: true },
        { name: 'Product Name', reference: 'name', show: true },
        { name: 'Base UOM', reference: 'salesUom', show: true },
        { name: 'Unit Cost', reference: 'costPrice', show: true },
        { name: 'Sales Price', reference: 'salesPrice', show: true },
        { name: 'Quantity', reference: 'available quantity', show: true},
        { name: 'Total Cost', reference: 'totalCost', show: true},
        { name: 'Quantity to Transfer', reference: 'quantityToTransfer', show: false },
        { name: 'Transfer Cost', reference: 'transferCost', show: false }
    ]
    const [columns, setColumns] = useState([...defaultColumns]);
    const [transferEntries, setTransferEntries] = useState([]);

    useEffect(() => {
        if (!isTransferClicked){
            const cmp_val = window.localStorage.getItem('sessn-cmp');
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (cmp_val) {
                intervalRef.current = setInterval(() => {
                    getProducts(cmp_val);
                }, 10000);
            }
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }else{
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
    }, [window.localStorage.getItem('sessn-cmp'), isTransferClicked]);

    useEffect(() => {
        if (settings.length) {
            const wrhSetFilt = settings.filter(setting => setting.name === 'warehouses');
            delete wrhSetFilt[0]?._id;
            setWrhs(wrhSetFilt[0].name ? [...wrhSetFilt[0].warehouses] : []);

            const wrhCatFilt = settings.filter(setting => setting.name === 'product_categories');
            delete wrhCatFilt[0]?._id;
            setCategories(wrhCatFilt[0].name ? [...wrhCatFilt[0].categories] : []);
        }
    }, [settings]);

    const resetCount = () => {
        let defaultEntries = []
        products.forEach(product => {
            if (product.type === 'goods'){
                defaultEntries.push({
                    productId: product.i_d,
                    quantityToTransfer: 0,
                    transferCost: 0,
                    type: product.type
                })
            }    
        })
        setTransferEntries(defaultEntries);        
    };
    useEffect(()=>{
        // console.log(transferEntries)
    },[transferEntries])
    useEffect(() => {
        setColumns([...defaultColumns]);
        if (isTransferClicked){
            resetCount();
            setColumns((columns)=>{
                columns.forEach((column)=>{                                        
                    if (['quantityToTransfer', 'transferCost'].includes(column.reference)){
                        column.show = true
                    }
                })
                return [...columns]
            })
        }
    },[isTransferClicked]);
    useEffect(()=>{        
        if (isSaveClicked) {
            handleTransfer();
        }
    },[isSaveClicked])

    const handleInputChange = ({ e, productId, costPrice }) => {
        const { name, value } = e.target;
        let index
        transferEntries.forEach((entry, i) => {
            if (entry.productId === productId) {
                index = i;
            }
        });
        if (name === 'quantityToTransfer') {
            const transferCost = value * costPrice;
            setTransferEntries((transferEntries) => {
                const newEntries = [...transferEntries];
                newEntries[index] = {
                    ...newEntries[index],
                    quantityToTransfer: value,
                    transferCost: transferCost
                };
                return newEntries;
            });
        }
    };

    const handleTransfer = async () => {
        const validEntries = transferEntries.filter((entry) => {
            return (entry.quantityToTransfer > 0 && entry.type === 'goods')
        });
        const insufficientProducts = [];
        if (validEntries.length > 0 && fromWarehouse && toWarehouse){
            // Validate if the warehouse selected as fromWarehouse has availableQuantity >= quantityToTransfer specified for each product
            for (const entry of validEntries){
                const { productId, quantityToTransfer } = entry;
                const product = products.find(p => p.i_d === productId);
                if (product ) {
                    const fromWarehouseData = product[fromWarehouse] || [];
                    let countBaseQuantity = 0;
                    fromWarehouseData.forEach(item => {
                        countBaseQuantity += Number(item.baseQuantity);
                    });
                    if (countBaseQuantity < Number(quantityToTransfer)) {
                        insufficientProducts.push(productId);
                    }
                }
            }
    
            // If there are products with insufficient quantity, display an error message
            if (insufficientProducts.length > 0) {
                setAlertState('error');
                setAlert(`Insufficient quantity in the selected warehouse for the following products: ${insufficientProducts.join(', ')}`);
                setAlertTimeout(8000);
                setIsSaveValue(false)
                return;
            }
    
            // Proceed with the transfer if all validations pass
            setAlertState('info');
            setAlert('Transferring products...');
            let countSuccess = 0;
            for (const entry of validEntries) {
                const { productId, quantityToTransfer, transferCost } = entry;
                const product = products.find(p => p.i_d === productId);
                if (product) {
                    const fromWarehouseData = product[fromWarehouse] || [];
                    const toWarehouseData = product[toWarehouse] || [];
                    const createdAt = new Date().getTime();
                    fromWarehouseData.push({
                        productID: productId,
                        entryType: 'Shipment',
                        documentType: 'Transfer Shipment',
                        transferTo: toWarehouse,
                        baseQuantity: quantityToTransfer * -1,
                        totalCost: transferCost * -1,
                        createdAt: createdAt
                    });
                    toWarehouseData.push({
                        productID: productId,
                        entryType: 'Receipt',
                        documentType: 'Transfer Receipt',
                        tranferFrom: fromWarehouse,
                        baseQuantity: quantityToTransfer,
                        totalCost: transferCost,
                        createdAt: createdAt
                    });
                    const resps = await fetchServer("POST", {
                        database: company,
                        collection: "Products",
                        prop: [{ i_d: productId }, { [fromWarehouse]: fromWarehouseData, [toWarehouse]: toWarehouseData }]
                    }, "updateOneDoc", server);
                    if (resps.error) {
                        setAlertState('info');
                        setAlert(resps.message);
                        setAlertTimeout(5000);
                        setIsOnView(false);
                        setIsSaveValue(false);
                        setIsTransferValue(false);                        
                        setFromWarehouse('');
                        setToWarehouse('');
                        return;
                    }else{
                        countSuccess++;
                        setAlertState('success');
                        setAlert(`${countSuccess}/${validEntries.length} product(s) transferred successfully`);
                    }
                }
            }
            if (countSuccess === validEntries.length) {
                setAlertState('success');
                setAlert('All Products Transfered Successful!');
                setAlertTimeout(5000);
                setIsOnView(false);
                setIsSaveValue(false);
                setIsTransferValue(false);                        
                setFromWarehouse('');
                setToWarehouse('');
                getProducts(company);
                resetCount();
            }
        } else {
            setAlertState('error');
            setAlert('Please fill all fields!');
            setAlertTimeout(5000);
            setIsSaveValue(false);
        }
    };

    return (
        <div className='adjustments'>
            <div className='adj-left'>
                <div className='adj-title'>Warehouses</div>
                <div className='adj-list' onClick={(e) => {
                    const name = e.target.getAttribute('name');
                    if (name) {
                        if (name === 'all') {
                            setColumns(columns => {
                                columns.forEach(column => {
                                    if (['difference', 'differenceCost', 'counted quantity'].includes(column.reference)) {
                                        column.show = false;
                                    }
                                });
                                return [...columns];
                            });
                        }
                        setCurWarehouse(name);
                    }
                }}>
                    <div className={(curWarehouse === 'all' ? 'opt-active' : '')} name='all'>All</div>
                    {wrhs.map((wrh) => {
                        if (isTransferClicked) {
                            if (fromWarehouse === wrh.name || toWarehouse === wrh.name) {
                                return (                            
                                    <div className={(wrh.name === curWarehouse) ? 'opt-active' : ''} name={wrh.name} key={wrh.name}>
                                        {wrh.name.toUpperCase()}
                                    </div>
                                )
                            }
                        }else{
                            return (                            
                                <div className={(wrh.name === curWarehouse) ? 'opt-active' : ''} name={wrh.name} key={wrh.name}>
                                    {wrh.name.toUpperCase()}
                                </div>
                            )
                        }
                    })}
                </div>
                <div className='adj-title'>Categories</div>
                <div className='adj-list' onClick={(e) => {
                    const name = e.target.getAttribute('name');
                    if (name) {
                        setCurCategory(name);
                    }
                }}>
                    <div className={(curCategory === 'all' ? 'opt-active' : '')} name='all'>All</div>
                    {categories.map(category => (
                        category.type === 'goods' && (
                            <div className={(category.code === curCategory) ? 'opt-active' : ''} name={category.code} key={category.code}>
                                {category.name}
                            </div>
                        )
                    ))}
                </div>
            </div>
            <div className='adj-right-header'>
                {isTransferClicked && <div className='transfer-section'>
                    <h4><b>Internal Transfer</b></h4>
                    <div className='otherInpCov'>
                        <label>From Warehouse:</label>
                        <select className='otherInp stockOtherInp' value={fromWarehouse} onChange={(e) => {
                            setFromWarehouse(e.target.value)
                            setCurWarehouse(e.target.value)
                        }}>
                            <option value=''>Select Warehouse</option>
                            {wrhs.map(wrh => (
                                <option key={wrh.name} value={wrh.name}>{wrh.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className='otherInpCov'>
                        <label>To Warehouse:</label>
                        <select className='otherInp stockOtherInp' value={toWarehouse} onChange={(e) => setToWarehouse(e.target.value)}>
                            <option value=''>Select Warehouse</option>
                            {wrhs.map(wrh => (
                                <option key={wrh.name} value={wrh.name}>{wrh.name}</option>
                            ))}
                        </select>
                    </div>
                </div>}
                <div className='adj-right'>
                    {columns.map((col, index) => (
                        col.show && (
                            <div className='adj-right-content' key={index}>
                                <div className='colname stockColname'>{col.name}</div>
                                {products.filter(prflt => {
                                    if (curCategory === 'all') {
                                        return prflt.type === 'goods';
                                    } else {
                                        if (prflt.type === 'goods') {
                                            return prflt.category === curCategory;
                                        }
                                    }
                                }).map((product, index1) => {
                                    let cummulativeUnitCostPrice = 0
                                    let totalCostValue = 0
                                    let totalBaseQuantity = 0
                                    wrhs.forEach((wrh)=>{
                                        if (wrh.purchase){
                                            product[wrh.name].forEach((entry)=>{
                                                totalBaseQuantity += entry.baseQuantity ? Number(entry.baseQuantity) : 0
                                                totalCostValue += entry.totalCost ? Number(entry.totalCost) : 0
                                            })
                                        }
                                    })
                                    cummulativeUnitCostPrice = totalBaseQuantity !== 0 ? (totalCostValue/totalBaseQuantity) : 0
                                    product.costPrice = cummulativeUnitCostPrice
                                    let availableQty = 0;
                                    if (['available quantity', 'totalCost'].includes(col.reference)) {
                                        wrhs.forEach(wrh => {
                                            if (curWarehouse === 'all') {
                                                product[wrh.name]?.forEach(entry => {
                                                    availableQty += Number(entry.baseQuantity);
                                                });
                                            } else {
                                                if (wrh.name === curWarehouse) {
                                                    product[wrh.name]?.forEach(entry => {
                                                        availableQty += Number(entry.baseQuantity);
                                                    });
                                                }
                                            }
                                        });
                                        if (col.reference === 'totalCost') {
                                            return <div className='colrows' key={index1}>{(Number(product.costPrice) * availableQty).toLocaleString()}</div>;
                                        }else{
                                            return <div className='colrows' key={index1}>{availableQty}</div>;
                                        }
                                    } else if (col.reference === 'quantityToTransfer') {
                                        
                                        return <div>
                                            <input 
                                                className='countedInp stockCountedInp' 
                                                type='number' 
                                                name='quantityToTransfer' 
                                                placeholder='enter'
                                                value={transferEntries.filter(entry => product.i_d === entry.productId)[0]?.quantityToTransfer} 
                                                onChange={(e) => handleInputChange({ e, productId:product.i_d, costPrice:product.costPrice })} 
                                            />
                                        </div>
                                    } else if (col.reference === 'transferCost') {
                                        return <div className='colrows' key={index1}>{transferEntries.filter(entry => product.i_d === entry.productId)[0]?.transferCost || 0}</div>;
                                    } else {
                                        return <div className='colrows' key={index1}>{(['costPrice', 'salesPrice'].includes(col.reference) ? Number(product[col.reference]).toLocaleString() : product[col.reference])}</div>;
                                    }
                                })}
                            </div>
                        )
                    ))}
                </div>
            </div>
            
        </div>
    );
};

export default Stock;