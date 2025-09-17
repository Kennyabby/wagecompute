import React, { useState, useMemo, useContext } from 'react';
import ContextProvider from '../../Resources/ContextProvider';
import { FaTimes, FaFilter, FaReceipt } from 'react-icons/fa';

const PaymentReceiptsModal = ({ open, onClose, paymentReceipts }) => {
  const { employees } = useContext(ContextProvider);
  // Get earliest date boundary
  const earliestDate = useMemo(() => {
    if (!paymentReceipts.length) return '';
    return paymentReceipts.reduce((min, r) => {
      const d = new Date(r.paymentDate);
      return (!min || d < min) ? d : min;
    }, null)?.toISOString().slice(0, 10);
  }, [paymentReceipts]);

  // Filter state
  const [filter, setFilter] = useState({
    from: earliestDate,
    to: '',
    paypoint: '',
    module: '',
    handler: '',
    receipt: ''
  });

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return paymentReceipts.filter(r => {
      const d = new Date(r.paymentDate).toISOString().slice(0, 10);
      if (filter.from && d < filter.from) return false;
      if (filter.to && d > filter.to) return false;
      if (filter.paypoint && r.paymentPoint !== filter.paypoint) return false;
      if (filter.module && r.paymentModule !== filter.module) return false;
      if (filter.handler && String(r.paymentHandler) !== String(filter.handler)) return false;
      if (filter.receipt && String(r.paymentReceipt) !== String(filter.receipt)) return false;
      return true;
    });
  }, [paymentReceipts, filter]);

  // Unique values for filters
  const paypoints = useMemo(() => Array.from(new Set(paymentReceipts.map(r => r.paymentPoint))), [paymentReceipts]);
  const modules = useMemo(() => Array.from(new Set(paymentReceipts.map(r => r.paymentModule))), [paymentReceipts]);
  const handlers = useMemo(() => Array.from(new Set(paymentReceipts.map(r => r.paymentHandler))), [paymentReceipts]);

  if (!open) return null;

  return (
    <div className="modal-overlay" style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:1000,background:'rgba(0,0,0,0.25)'}}>
      <div className="modal-content" style={{background:'#fff',borderRadius:12,maxWidth:800,width:'95%',margin:'40px auto',padding:32,boxShadow:'0 4px 32px rgba(0,0,0,0.12)',position:'relative'}}>
        <button onClick={onClose} style={{position:'absolute',top:16,right:16,fontSize:22,background:'none',border:'none',cursor:'pointer'}}><FaTimes /></button>
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
            <select value={filter.paypoint} onChange={e=>setFilter(f=>({...f,paypoint:e.target.value}))} style={{padding:'6px',borderRadius:'4px',border:'1px solid #90caf9'}}>
              <option value="">All</option>
              {paypoints.map(p=>(<option key={p} value={p}>{p}</option>))}
            </select>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            <label style={{fontWeight:'bold',color:'#1976d2'}}>Module</label>
            <select value={filter.module} onChange={e=>setFilter(f=>({...f,module:e.target.value}))} style={{padding:'6px',borderRadius:'4px',border:'1px solid #90caf9'}}>
              <option value="">All</option>
              {modules.map(m=>(<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            <label style={{fontWeight:'bold',color:'#1976d2'}}>Handler</label>
            <select value={filter.handler} onChange={e=>setFilter(f=>({...f,handler:e.target.value}))} style={{padding:'6px',borderRadius:'4px',border:'1px solid #90caf9'}}>
              <option value="">All</option>
              {handlers.map(h=>{
                const emp = employees?.find(e => String(e.i_d) === String(h) || String(e.id) === String(h));
                const label = emp ? (emp.name || emp.fullName || (emp.firstName ? (emp.firstName + ' ' + (emp.lastName||'')) : h)) : h;
                return <option key={h} value={h}>{label} ({h})</option>;
              })}
            </select>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            <label style={{fontWeight:'bold',color:'#1976d2'}}>Receipt #</label>
            <input type="text" value={filter.receipt} onChange={e=>setFilter(f=>({...f,receipt:e.target.value}))} placeholder="Enter receipt number" style={{padding:'6px',borderRadius:'4px',border:'1px solid #90caf9'}} />
          </div>
        </div>
        <div className="modal-details" style={{maxHeight:'55vh',overflowY:'auto'}}>
          {filteredReceipts.length === 0 ? (
            <div style={{textAlign:'center',color:'#888',marginTop:32}}>No receipts found for selected filters.</div>
          ) : (
            <div style={{display:'flex',flexWrap:'wrap',gap:'18px'}}>
              {filteredReceipts.map((r,idx)=>{
                const emp = employees?.find(e => String(e.i_d) === String(r.paymentHandler) || String(e.id) === String(r.paymentHandler));
                return (
                  <div key={idx} className="receipt-card" style={{background:'#f5faff',border:'1px solid #90caf9',borderRadius:8,padding:'18px 16px',minWidth:260,flex:'1 1 260px',boxShadow:'0 2px 8px rgba(25,118,210,0.08)'}}>
                    <div style={{fontWeight:'bold',fontSize:'1.08em',marginBottom:6}}>{r.paymentModule.toUpperCase()}</div>
                    <div><b>Paypoint:</b> {r.paymentPoint}</div>
                    <div><b>Amount:</b> ₦{Number(r.paymentAmount).toLocaleString()}</div>
                    <div><b>Receipt #:</b> {r.paymentReceipt}</div>
                    <div><b>Date:</b> {new Date(r.paymentDate).toLocaleDateString()}</div>
                    <div><b>Handler:</b> {r.paymentHandler} {emp ? <span style={{color:'#1976d2',fontWeight:'bold'}}>({emp.name || emp.fullName || emp.firstName + ' ' + emp.lastName})</span> : null}</div>
                    <div><b>For:</b> {r.paymentFor}</div>
                    <div style={{fontSize:'0.95em',color:'#1976d2',marginTop:8}}><b>Ref:</b> {r.paymentModuleRef}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentReceiptsModal;
