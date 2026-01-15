import React, { useState, useMemo, useContext, useEffect } from 'react';
import ContextProvider from '../../Resources/ContextProvider';
import { FaTimes, FaFilter, FaReceipt } from 'react-icons/fa';
import { exportReceiptsTableToPDF } from './pdfUtils';
import { generateExcel } from '../../utils/exportUtils';

const PaymentReceiptsModal = ({ open, onClose, paymentReceipts }) => {
  const { employees, paymentMethods } = useContext(ContextProvider);
  // Get earliest date boundary
  const earliestDate = useMemo(() => {
    if (!paymentReceipts.length) return '';
    return paymentReceipts.reduce((min, r) => {
      const d = new Date(r.paymentDate);
      return (!min || d < min) ? d : min;
    }, null)?.toISOString().slice(0, 10);
  }, [paymentReceipts]);

  const [payPointAccounts, setPayPointAccounts] = useState({});
  useEffect(()=>{
      const payPoints = paymentMethods.reduce((obj, method)=>{
          if (method.name !== 'cash'){
              obj[method.name] = `${method.i_d}-${method.account}`
          }else{
              obj[method.name] = `${method.i_d}`
          }
          return obj
      },{})
      setPayPointAccounts({...payPoints, 'Employee': 'EMPLOYEE' })
  },[paymentMethods])
  // Filter state
  const [filter, setFilter] = useState({
    from: earliestDate,
    to: '',
    paypoint: '',
    module: '',
    handler: '',
    receipt: '',
    onlyDuplicates: false
  });

  // Multi-select toggles for each filter
  const [multiPaypoint, setMultiPaypoint] = useState(false);
  const [multiModule, setMultiModule] = useState(false);
  const [multiHandler, setMultiHandler] = useState(false);

  // View type state
  const [viewType, setViewType] = useState('table');
  // Subtotal checkbox state
  const [showSubtotals, setShowSubtotals] = useState(false);

  // Table sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'paymentDate', direction: 'desc' });

  // Filtered and sorted receipts
  const filteredReceipts = useMemo(() => {
    let data = paymentReceipts.filter(r => {
      const d = new Date(r.paymentDate).toISOString().slice(0, 10);
      if (filter.from && d < filter.from) return false;
      if (filter.to && d > filter.to) return false;
      if (multiPaypoint && Array.isArray(filter.paypoint) && filter.paypoint.length && !filter.paypoint.includes(r.paymentPoint)) return false;
      if (!multiPaypoint && filter.paypoint && r.paymentPoint !== filter.paypoint) return false;
      if (multiModule && Array.isArray(filter.module) && filter.module.length && !filter.module.includes(r.paymentModule)) return false;
      if (!multiModule && filter.module && r.paymentModule !== filter.module) return false;
      if (multiHandler && Array.isArray(filter.handler) && filter.handler.length && !filter.handler.includes(String(r.paymentHandler))) return false;
      if (!multiHandler && filter.handler && String(r.paymentHandler) !== String(filter.handler)) return false;
      if (filter.receipt && String(r.paymentReceipt) !== String(filter.receipt)) return false;
      return true;
    });
    // Filter for duplicates if enabled
    if (filter.onlyDuplicates) {
      const receiptCount = {};
      data.forEach(r => {
        const key = String(r.paymentReceipt);
        receiptCount[key] = (receiptCount[key] || 0) + 1;
      });
      data = data.filter(r => receiptCount[String(r.paymentReceipt)] > 1);
    }
    if (sortConfig?.key) {
      data = [...data].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'paymentDate') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [paymentReceipts, filter, sortConfig]);

  // Unique values for filters
  const paypoints = useMemo(() => Array.from(new Set(paymentReceipts.map(r => r.paymentPoint))), [paymentReceipts]);
  const modules = useMemo(() => Array.from(new Set(paymentReceipts.map(r => r.paymentModule))), [paymentReceipts]);
  const handlers = useMemo(() => Array.from(new Set(paymentReceipts.map(r => r.paymentHandler))), [paymentReceipts]);

  if (!open) return null;

  // Use grouped receipts for table and totals if needed
  let tableReceipts = filteredReceipts;
  let isGrouped = false;
  if (filter.onlyDuplicates && showSubtotals) {
    const groups = {};
    filteredReceipts.forEach(r => {
      groups[r.paymentReceipt] = groups[r.paymentReceipt] || [];
      groups[r.paymentReceipt].push(r);
    });
    tableReceipts = Object.entries(groups).map(([receiptNum, group]) => ({ receiptNum, group }));
    isGrouped = true;
  }

  return (
    <div className="modal-overlay" style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:5000,background:'rgba(0,0,0,0.25)'}}>
        <div className="modal-content" style={{position: 'relative', background:'#fff',borderRadius:12,maxWidth:1200,width:'98%',margin:'40px auto',padding:32,boxShadow:'0 4px 32px rgba(0,0,0,0.12)',position:'relative'}}>
        {/* PDF Download Section */}
        <div style={{marginTop: '25px',marginBottom:'2px',display:'flex',justifyContent:'flex-end',gap:'12px'}}>
          <button
            style={{padding:'8px 20px',borderRadius:'6px',background:'#1976d2',color:'#fff',fontWeight:'bold',border:'none',boxShadow:'0 2px 8px rgba(25,118,210,0.08)',cursor:'pointer'}}
            onClick={()=>{
              let exportData = filteredReceipts;
              let grouped = false;
              if (filter.onlyDuplicates && showSubtotals) {
                // Group by paymentReceipt
                const groups = {};
                filteredReceipts.forEach(r => {
                  groups[r.paymentReceipt] = groups[r.paymentReceipt] || [];
                  groups[r.paymentReceipt].push(r);
                });
                exportData = Object.entries(groups).map(([receiptNum, group]) => ({ receiptNum, group }));
                grouped = true;
              }
              exportReceiptsTableToPDF({ filteredReceipts: exportData, filter, resultCount: filteredReceipts.length, employees, grouped });
            }}
          >
            Download PDF
          </button>
          <button
            style={{padding:'8px 20px',borderRadius:'6px',background:'#388e3c',color:'#fff',fontWeight:'bold',border:'none',boxShadow:'0 2px 8px rgba(56,142,60,0.08)',cursor:'pointer'}}
            onClick={()=>{
              const columns = [
                { name: 'Module', reference: 'paymentModule' },
                { name: 'Paypoint', reference: 'paymentPoint' },
                { name: 'Amount', reference: 'paymentAmount', numeric: true },
                { name: 'Receipt #', reference: 'paymentReceipt' },
                { name: 'Date', reference: 'paymentDate' },
                { name: 'Handler', reference: 'paymentHandler' },
                { name: 'For', reference: 'paymentFor' },
                { name: 'Approved By', reference: 'paymentApprover' }
                // { name: 'Ref', reference: 'paymentModuleRef' }
              ];
              const companyInfo = { name: 'Payment Receipts', address: '', phone: '', email: '' };
              const dateRange = { startDate: filter.from, endDate: filter.to };
              let excelFilteredReceipts = filteredReceipts.map((receipt)=>{
                const employee = employees?.find(e => String(e.i_d) === String(receipt.paymentHandler))
                const approver = employees?.find(e => String(e.i_d) === String(receipt.paymentApprover))
                return {
                    ...receipt,
                    paymentPoint: payPointAccounts[receipt.paymentPoint] || receipt.paymentPoint,
                    paymentHandler: (`${employee.i_d} (${employee?.firstName||''} ${employee?.lastName||''}) ${employee?.name||employee?.fullName||''}`).trim() || receipt.paymentHandler,
                    paymentApprover: approver ? ((`${approver.i_d} (${approver?.firstName||''} ${approver?.lastName||''}) ${approver?.name||approver?.fullName||''}`).trim()) : receipt.paymentApprover,
                }
             });
              let grouped = false;
              if (filter.onlyDuplicates && showSubtotals) {
                // Group by paymentReceipt
                const groups = {};
                excelFilteredReceipts.forEach(r => {
                  groups[r.paymentReceipt] = groups[r.paymentReceipt] || [];
                  groups[r.paymentReceipt].push(r);
                });
                excelFilteredReceipts = Object.entries(groups).map(([receiptNum, group]) => ({ receiptNum, group }));
                grouped = true;
              }
              generateExcel(excelFilteredReceipts, columns, companyInfo, dateRange, 'Plantain Planet Payment Receipts Report', filter, grouped);
            }}
          >
            Download Excel
          </button>
        </div>
        <button onClick={onClose} style={{position:'absolute',top:5,right:5,fontSize:22,background:'none',border:'none',cursor:'pointer'}}><FaTimes /></button>
        <h2 style={{marginBottom:16}}><FaReceipt style={{marginRight:8}}/>Payment Receipts</h2>
        <div className="modal-filters" style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',
          gap:'20px',
          marginBottom:'28px',
          background:'#f5faff',
          borderRadius:'8px',
          padding:'18px 12px',
          boxShadow:'0 2px 8px rgba(25,118,210,0.08)'
        }}>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            <label style={{fontWeight:'bold',color:'#1976d2'}}>Date From</label>
            <input type="date" value={filter.from} min={earliestDate} onChange={e=>setFilter(f=>({...f,from:e.target.value}))} style={{padding:'6px',borderRadius:'4px',border:'1px solid #90caf9'}} />
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            <label style={{fontWeight:'bold',color:'#1976d2'}}>Date To</label>
            <input type="date" value={filter.to} min={filter.from} onChange={e=>setFilter(f=>({...f,to:e.target.value}))} style={{padding:'6px',borderRadius:'4px',border:'1px solid #90caf9'}} />
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            <label style={{fontWeight:'bold',color:'#1976d2'}}>Paypoint</label>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <select
                multiple={multiPaypoint}
                value={multiPaypoint ? (Array.isArray(filter.paypoint) ? filter.paypoint : filter.paypoint ? [filter.paypoint] : []) : filter.paypoint}
                onChange={e => {
                  if (multiPaypoint) {
                    const opts = Array.from(e.target.selectedOptions).map(opt => opt.value);
                    setFilter(f => ({ ...f, paypoint: opts }));
                  } else {
                    setFilter(f => ({ ...f, paypoint: e.target.value }));
                  }
                }}
                style={{padding:'6px',borderRadius:'4px',border:'1px solid #90caf9',height: multiPaypoint ? '100px' : undefined, minWidth:170}}
              >
                {!multiPaypoint && <option value="">All</option>}
                {paypoints.map(p => (
                  <option key={p} value={p}>{payPointAccounts[p]}</option>
                ))}
              </select>
              <label style={{fontSize:'0.95em',color:'#1976d2'}}>
                <input type="checkbox" checked={multiPaypoint} onChange={e => {
                  setMultiPaypoint(e.target.checked);
                  setFilter(f => ({ ...f, paypoint: e.target.checked ? [] : '' }));
                }} style={{marginRight:4}} /> Multi
              </label>
            </div>
            {multiPaypoint && <span style={{fontSize:'0.9em',color:'#888'}}>Hold Ctrl (Windows) or Cmd (Mac) to select multiple</span>}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            <label style={{fontWeight:'bold',color:'#1976d2'}}>Module</label>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <select
                multiple={multiModule}
                value={multiModule ? (Array.isArray(filter.module) ? filter.module : filter.module ? [filter.module] : []) : filter.module}
                onChange={e => {
                  if (multiModule) {
                    const opts = Array.from(e.target.selectedOptions).map(opt => opt.value);
                    setFilter(f => ({ ...f, module: opts }));
                  } else {
                    setFilter(f => ({ ...f, module: e.target.value }));
                  }
                }}
                style={{padding:'6px',borderRadius:'4px',border:'1px solid #90caf9',height: multiModule ? '100px' : undefined, minWidth:170}}
              >
                {!multiModule && <option value="">All</option>}
                {modules.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <label style={{fontSize:'0.95em',color:'#1976d2'}}>
                <input type="checkbox" checked={multiModule} onChange={e => {
                  setMultiModule(e.target.checked);
                  setFilter(f => ({ ...f, module: e.target.checked ? [] : '' }));
                }} style={{marginRight:4}} /> Multi
              </label>
            </div>
            {multiModule && <span style={{fontSize:'0.9em',color:'#888'}}>Hold Ctrl (Windows) or Cmd (Mac) to select multiple</span>}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            <label style={{fontWeight:'bold',color:'#1976d2'}}>Handler</label>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <select
                multiple={multiHandler}
                value={multiHandler ? (Array.isArray(filter.handler) ? filter.handler : filter.handler ? [filter.handler] : []) : filter.handler}
                onChange={e => {
                  if (multiHandler) {
                    const opts = Array.from(e.target.selectedOptions).map(opt => opt.value);
                    setFilter(f => ({ ...f, handler: opts }));
                  } else {
                    setFilter(f => ({ ...f, handler: e.target.value }));
                  }
                }}
                style={{padding:'6px',borderRadius:'4px',border:'1px solid #90caf9',height: multiHandler ? '100px' : undefined, minWidth:170}}
              >
                {!multiHandler && <option value="">All</option>}
                {handlers.map(h => {
                  const emp = employees?.find(e => String(e.i_d) === String(h) || String(e.id) === String(h));
                  const label = emp ? (emp.name || emp.fullName || (emp.firstName ? (emp.firstName + ' ' + (emp.lastName||'')) : h)) : h;
                  return <option key={h} value={h}>{label} ({h})</option>;
                })}
              </select>
              <label style={{fontSize:'0.95em',color:'#1976d2'}}>
                <input type="checkbox" checked={multiHandler} onChange={e => {
                  setMultiHandler(e.target.checked);
                  setFilter(f => ({ ...f, handler: e.target.checked ? [] : '' }));
                }} style={{marginRight:4}} /> Multi
              </label>
            </div>
            {multiHandler && <span style={{fontSize:'0.9em',color:'#888'}}>Hold Ctrl (Windows) or Cmd (Mac) to select multiple</span>}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            <label style={{fontWeight:'bold',color:'#1976d2'}}>Receipt #</label>
            <input type="text" value={filter.receipt} onChange={e=>setFilter(f=>({...f,receipt:e.target.value}))} placeholder="Enter receipt number" style={{padding:'6px',borderRadius:'4px',border:'1px solid #90caf9'}} />
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'6px',alignItems:'flex-start',marginTop:'8px'}}>
              <label style={{fontWeight:'bold',color:'#1976d2'}}>Show Only Duplicates</label>
              <input type="checkbox" checked={filter.onlyDuplicates} onChange={e=>setFilter(f=>({...f,onlyDuplicates:e.target.checked}))} style={{width:'18px',height:'18px'}} />
              {filter.onlyDuplicates && (
                <label style={{marginTop:'8px',fontWeight:'bold',color:'#1976d2'}}>
                  <input type="checkbox" checked={showSubtotals} onChange={e=>setShowSubtotals(e.target.checked)} style={{marginRight:4}} /> Show Subtotal per Receipt Number
                </label>
              )}
            </div>
        </div>
        <div style={{marginBottom:'12px',fontWeight:'bold',color:'#1976d2',fontSize:'1.05em'}}>
          {(() => {
            let totalCount = 0;
            let totalAmount = 0;
            if (isGrouped) {
              totalCount = tableReceipts.reduce((acc, g) => acc + g.group.length, 0);
              totalAmount = tableReceipts.reduce((sum, g) => sum + g.group.reduce((s, r) => s + Number(r.paymentAmount || 0), 0), 0);
            } else {
              totalCount = tableReceipts.length;
              totalAmount = tableReceipts.reduce((sum, r) => sum + Number(r.paymentAmount || 0), 0);
            }
            return `${totalCount} result${totalCount === 1 ? '' : 's'} found. Total Amount: ₦${totalAmount.toLocaleString()}`;
          })()}
        </div>
        <div style={{marginBottom:'18px',display:'flex',gap:'12px',alignItems:'center'}}>
          <span style={{fontWeight:'bold',color:'#555'}}>View:</span>
          <button onClick={()=>setViewType('card')} style={{padding:'6px 16px',borderRadius:'4px',border:viewType==='card'?'2px solid #1976d2':'1px solid #ccc',background:viewType==='card'?'#e3f2fd':'#fff',color:'#1976d2',fontWeight:'bold',cursor:'pointer'}}>Card</button>
          <button onClick={()=>setViewType('table')} style={{padding:'6px 16px',borderRadius:'4px',border:viewType==='table'?'2px solid #1976d2':'1px solid #ccc',background:viewType==='table'?'#e3f2fd':'#fff',color:'#1976d2',fontWeight:'bold',cursor:'pointer'}}>Table</button>
        </div>
        <div className="modal-details" style={{maxHeight:'55vh'}}>
          {filteredReceipts.length === 0 ? (
            <div style={{textAlign:'center',color:'#888',marginTop:32}}>No receipts found for selected filters.</div>
          ) : viewType === 'card' ? (
            <div style={{display:'flex',flexWrap:'wrap',gap:'18px', margin:'5px auto'}}>
              {filteredReceipts.map((r,idx)=>{
                const emp = employees?.find(e => String(e.i_d) === String(r.paymentHandler) || String(e.id) === String(r.paymentHandler));
                const approver = employees?.find(e => String(e.i_d) === String(r.paymentApprover) || String(e.id) === String(r.paymentApprover));
                console.log(approver)
                return (
                  <div key={idx} className="receipt-card" style={{background:'#f5faff',border:'1px solid #90caf9',borderRadius:8,padding:'18px 16px',minWidth:260,flex:'1 1 260px',boxShadow:'0 2px 8px rgba(25,118,210,0.08)'}}>
                    <div style={{fontWeight:'bold',fontSize:'1.08em',marginBottom:6}}>{r.paymentModule.toUpperCase()}</div>
                    <div><b>Paypoint:</b> {r.paymentPoint}</div>
                    <div><b>Amount:</b> ₦{Number(r.paymentAmount).toLocaleString()}</div>
                    <div><b>Receipt #:</b> {r.paymentReceipt}</div>
                    <div><b>Date:</b> {new Date(r.paymentDate).toLocaleDateString()}</div>
                    <div><b>Handler:</b> {r.paymentHandler} {emp ? <span style={{color:'#1976d2',fontWeight:'bold'}}>({emp.name || emp.fullName || emp.firstName + ' ' + emp.lastName})</span> : null}</div>
                    <div><b>For:</b> {r.paymentFor}</div>
                    <div><b>Approved By:</b> {r.paymentApprover} {approver ? <span style={{color:'#1976d2',fontWeight:'bold'}}>({approver.name || approver.fullName || approver.firstName + ' ' + approver.lastName})</span> : null}</div>
                    {/* <div style={{fontSize:'0.95em',color:'#1976d2',marginTop:8}}><b>Ref:</b> {r.paymentModuleRef}</div> */}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
               <table style={{width:'100%',borderCollapse:'collapse',background:'#f5faff', margin: '5px auto'}}>
                  <thead>
                    <tr style={{background:'#e3f2fd',color:'#1976d2'}}>
                      <th style={{padding:'8px',border:'1px solid #90caf9',cursor:'pointer'}} onClick={()=>setSortConfig(s=>({key:'paymentModule',direction:s.key==='paymentModule'&&s.direction==='asc'?'desc':'asc'}))}>
                        Module {sortConfig.key==='paymentModule' ? (sortConfig.direction==='asc'?'▲':'▼') : ''}
                      </th>
                      <th style={{padding:'8px',border:'1px solid #90caf9',cursor:'pointer'}} onClick={()=>setSortConfig(s=>({key:'paymentPoint',direction:s.key==='paymentPoint'&&s.direction==='asc'?'desc':'asc'}))}>
                        Paypoint {sortConfig.key==='paymentPoint' ? (sortConfig.direction==='asc'?'▲':'▼') : ''}
                      </th>
                      <th style={{padding:'8px',border:'1px solid #90caf9',cursor:'pointer'}} onClick={()=>setSortConfig(s=>({key:'paymentAmount',direction:s.key==='paymentAmount'&&s.direction==='asc'?'desc':'asc'}))}>
                        Amount {sortConfig.key==='paymentAmount' ? (sortConfig.direction==='asc'?'▲':'▼') : ''}
                      </th>
                      <th style={{padding:'8px',border:'1px solid #90caf9',cursor:'pointer'}} onClick={()=>setSortConfig(s=>({key:'paymentReceipt',direction:s.key==='paymentReceipt'&&s.direction==='asc'?'desc':'asc'}))}>
                        Receipt # {sortConfig.key==='paymentReceipt' ? (sortConfig.direction==='asc'?'▲':'▼') : ''}
                      </th>
                      <th style={{padding:'8px',border:'1px solid #90caf9',cursor:'pointer'}} onClick={()=>setSortConfig(s=>({key:'paymentDate',direction:s.key==='paymentDate'&&s.direction==='asc'?'desc':'asc'}))}>
                        Date {sortConfig.key==='paymentDate' ? (sortConfig.direction==='asc'?'▲':'▼') : ''}
                      </th>
                      <th style={{padding:'8px',border:'1px solid #90caf9',cursor:'pointer'}} onClick={()=>setSortConfig(s=>({key:'paymentHandler',direction:s.key==='paymentHandler'&&s.direction==='asc'?'desc':'asc'}))}>
                        Handler {sortConfig.key==='paymentHandler' ? (sortConfig.direction==='asc'?'▲':'▼') : ''}
                      </th>
                      <th style={{padding:'8px',border:'1px solid #90caf9',cursor:'pointer'}} onClick={()=>setSortConfig(s=>({key:'paymentFor',direction:s.key==='paymentFor'&&s.direction==='asc'?'desc':'asc'}))}>
                        For {sortConfig.key==='paymentFor' ? (sortConfig.direction==='asc'?'▲':'▼') : ''}
                      </th>
                      <th style={{padding:'8px',border:'1px solid #90caf9',cursor:'pointer'}} onClick={()=>setSortConfig(s=>({key:'paymentApprover',direction:s.key==='paymentApprover'&&s.direction==='asc'?'desc':'asc'}))}>
                        Approved By {sortConfig.key==='paymentApprover' ? (sortConfig.direction==='asc'?'▲':'▼') : ''}
                      </th>
                      {/* <th style={{padding:'8px',border:'1px solid #90caf9',cursor:'pointer'}} onClick={()=>setSortConfig(s=>({key:'paymentModuleRef',direction:s.key==='paymentModuleRef'&&s.direction==='asc'?'desc':'asc'}))}>
                        Ref {sortConfig.key==='paymentModuleRef' ? (sortConfig.direction==='asc'?'▲':'▼') : ''}
                      </th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {isGrouped ? (
                      // Use grouped receipts for table
                      tableReceipts.map(({ receiptNum, group }, groupIdx) => [
                        ...group.map((r, idx) => {
                          const emp = employees?.find(e => String(e.i_d) === String(r.paymentHandler) || String(e.id) === String(r.paymentHandler));
                          const approver = employees?.find(e => String(e.i_d) === String(r.paymentApprover) || String(e.id) === String(r.paymentApprover));
                          return (
                            <tr key={receiptNum + '-' + idx} style={{background:'#fff'}}>
                              <td style={{padding:'8px',border:'1px solid #90caf9',fontWeight:'bold'}}>{r.paymentModule.toUpperCase()}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9'}}>{payPointAccounts[r.paymentPoint]}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9'}}>₦{Number(r.paymentAmount).toLocaleString()}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9'}}>{r.paymentReceipt}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9'}}>{new Date(r.paymentDate).toLocaleDateString()}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9'}}>{r.paymentHandler} {emp ? <span style={{color:'#1976d2',fontWeight:'bold'}}>({emp.name || emp.fullName || emp.firstName + ' ' + emp.lastName})</span> : null}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9'}}>{r.paymentFor}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9',fontSize:'0.95em',color:'#1976d2'}}>{r.paymentApprover} {approver ? <span style={{color:'#1976d2',fontWeight:'bold'}}>({approver.name || approver.fullName || approver.firstName + ' ' + approver.lastName})</span> : null}</td>
                            </tr>
                          );
                        }),
                        // Subtotal row for this group
                        <tr key={receiptNum + '-subtotal'} style={{background:'#e3f2fd',fontWeight:'bold',color:'#1976d2'}}>
                          <td style={{padding:'8px',border:'1px solid #90caf9'}} colSpan={2}>Subtotal for Receipt #{receiptNum}</td>
                          <td style={{padding:'8px',border:'1px solid #90caf9'}}>
                            ₦{group.reduce((sum, r) => sum + Number(r.paymentAmount || 0), 0).toLocaleString()}
                          </td>
                          <td style={{padding:'8px',border:'1px solid #90caf9'}} colSpan={5}></td>
                        </tr>
                      ])
                    ) : (
                      // Default rendering
                      <>
                        {filteredReceipts.map((r,idx)=>{
                          const emp = employees?.find(e => String(e.i_d) === String(r.paymentHandler) || String(e.id) === String(r.paymentHandler));
                          const approver = employees?.find(e => String(e.i_d) === String(r.paymentApprover) || String(e.id) === String(r.paymentApprover));
                          return (
                            <tr key={idx} style={{background:'#fff'}}>
                              <td style={{padding:'8px',border:'1px solid #90caf9',fontWeight:'bold'}}>{r.paymentModule.toUpperCase()}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9'}}>{payPointAccounts[r.paymentPoint]}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9'}}>₦{Number(r.paymentAmount).toLocaleString()}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9'}}>{r.paymentReceipt}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9'}}>{new Date(r.paymentDate).toLocaleDateString()}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9'}}>{r.paymentHandler} {emp ? <span style={{color:'#1976d2',fontWeight:'bold'}}>({emp.name || emp.fullName || emp.firstName + ' ' + emp.lastName})</span> : null}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9'}}>{r.paymentFor}</td>
                              <td style={{padding:'8px',border:'1px solid #90caf9',fontSize:'0.95em',color:'#1976d2'}}>{r.paymentApprover} {approver ? <span style={{color:'#1976d2',fontWeight:'bold'}}>({approver.name || approver.fullName || approver.firstName + ' ' + approver.lastName})</span> : null}</td>
                            </tr>
                          );
                        })}
                        {/* Totals row */}
                        <tr style={{background:'#e3f2fd',fontWeight:'bold',color:'#1976d2'}}>
                          <td style={{padding:'8px',border:'1px solid #90caf9'}} colSpan={2}>Total</td>
                          <td style={{padding:'8px',border:'1px solid #90caf9'}}>
                            ₦{(() => {
                              if (isGrouped) {
                                return tableReceipts.reduce((sum, g) => sum + g.group.reduce((s, r) => s + Number(r.paymentAmount || 0), 0), 0).toLocaleString();
                              } else {
                                return tableReceipts.reduce((sum, r) => sum + Number(r.paymentAmount || 0), 0).toLocaleString();
                              }
                            })()}
                          </td>
                          <td style={{padding:'8px',border:'1px solid #90caf9'}} colSpan={5}></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentReceiptsModal;
