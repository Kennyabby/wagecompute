import React, { useState, useMemo, useContext, useEffect } from 'react';
import ContextProvider from '../../Resources/ContextProvider';
import { FaTimes, FaFilter, FaReceipt } from 'react-icons/fa';
import { exportReceiptsTableToPDF, exportSummaryMatrixToPDF } from './pdfUtils';
import { generateExcel } from '../../utils/exportUtils';
import './PaymentReceiptsModal.css';
import { currentDayWindow } from '../../Resources/viewWindow';
import { loadReconciliation, totalsOf, describeVerdicts } from '../../Resources/reconciliationData';

// fixedRange ({ from, to }) pins the dates, for a view of one period such as
// the Session Manager reconciliation, where the dates are not the viewer's
// to change. title names the view; actions sit above the figures and stay
// in view while they scroll; footer goes under them.
//
// Opened anywhere else, it can also show the reconciliation of the chosen
// dates (Show reconciliation): the same money, debts and shortages the
// Session Manager is shown before it starts, without approving or declining,
// and the decision made, when one day is chosen.
const PaymentReceiptsModal = ({ open, onClose, paymentReceipts: receiptsProp, title = 'Payment Receipts', fixedRange = null, footer = null, notice = null, actions = null }) => {
  const { employees, paymentMethods, companyRecord, centralCompany, allowBacklogs, getSessionStart, getSessionEnd, fetchServer, server, company } = useContext(ContextProvider);
  const [reconOn, setReconOn] = useState(false);
  const [recon, setRecon] = useState(null);
  const [reconState, setReconState] = useState({ loading: false, error: '' });
  const paymentReceipts = reconOn ? (recon?.rows || []) : (receiptsProp || []);
  const companyLogoUrl = centralCompany?.logoUrl || companyRecord?.logoUrl || null;
  // Get earliest date boundary
  const earliestDate = useMemo(() => {
    if (!paymentReceipts.length) return '';
    return paymentReceipts.reduce((min, r) => {
      const d = new Date(r.paymentDate);
      return (!min || d < min) ? d : min;
    }, null)?.toISOString().slice(0, 10);
  }, [paymentReceipts]);

  // Users without backlog access see the current day only
  // (Resources/viewWindow.js).
  const isNonAdmin = !fixedRange && companyRecord?.status !== 'admin' && !allowBacklogs;
  const getViewDays = () => {
    const { start, end } = currentDayWindow(getSessionStart);
    return { today: end, dayStart: start };
  };

  const [payPointAccounts, setPayPointAccounts] = useState({});
  useEffect(() => {
    const payPoints = paymentMethods.reduce((obj, method) => {
      if (method.name !== 'cash') {
        obj[method.name] = method.i_d ? `${method.i_d}-${method.account}` : method.name
      } else {
        obj[method.name] = method.i_d ? `${method.i_d}` : method.name
      }
      return obj
    }, {})
    setPayPointAccounts({ ...payPoints, 'Employee': 'EMPLOYEE' })
  }, [paymentMethods])
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

  // Clamp the date filters to the current day for users without backlog access
  useEffect(() => {
    // The reconciliation is read for the dates chosen; resetting them to
    // what it returned would read again without end.
    if (reconOn) return;
    if (fixedRange) {
      setFilter(f => ({ ...f, from: fixedRange.from, to: fixedRange.to }));
    } else if (isNonAdmin) {
      const { dayStart, today } = getViewDays();
      setFilter(f => ({
        ...f,
        from: dayStart,
        to: today
      }));
    } else {
      setFilter(f => ({
        ...f,
        from: earliestDate,
        to: ''
      }));
    }
  }, [companyRecord, earliestDate, isNonAdmin, fixedRange?.from, fixedRange?.to, reconOn]);

  // Reads the reconciliation of the chosen business days. A month at most:
  // it brings every order and session of the range.
  const today = () => currentDayWindow(getSessionStart).end;
  const reconFrom = filter.from || today();
  const reconTo = filter.to || today();
  const reconDays = Math.round((new Date(reconTo).getTime() - new Date(reconFrom).getTime()) / 86400000) + 1;
  useEffect(() => {
    if (!reconOn || !open) return undefined;
    if (reconDays > 31) { setRecon(null); setReconState({ loading: false, error: 'Choose 31 days or fewer to see the reconciliation.' }); return undefined; }
    if (reconDays < 1) { setRecon(null); setReconState({ loading: false, error: 'The end date is before the start date.' }); return undefined; }
    let cancelled = false;
    setReconState({ loading: true, error: '' });
    loadReconciliation({ fetchServer, server, company, from: reconFrom, to: reconTo, getSessionStart, getSessionEnd })
      .then((result) => { if (!cancelled) { setRecon(result); setReconState({ loading: false, error: '' }); } })
      .catch((error) => { if (!cancelled) setReconState({ loading: false, error: error.message || 'Could not load the reconciliation.' }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconOn, open, reconFrom, reconTo]);

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
      let effectiveFrom = filter.from;
      let effectiveTo = filter.to;
      if (isNonAdmin) {
        const { dayStart, today } = getViewDays();
        if (!effectiveFrom || effectiveFrom < dayStart) effectiveFrom = dayStart;
        if (!effectiveTo || effectiveTo > today) effectiveTo = today;
      }
      if (effectiveFrom && d < effectiveFrom) return false;
      if (effectiveTo && d > effectiveTo) return false;
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

  // Summary pivot by Module (rows) x Paypoint (columns), respecting current filters
  const summaryByModulePaypoint = useMemo(() => {
    const data = (filteredReceipts && filteredReceipts.length ? filteredReceipts : paymentReceipts);
    const paypointList = Array.from(new Set(data.map(r => r.paymentPoint)));
    const moduleList = Array.from(new Set(data.map(r => r.paymentModule)));
    const matrix = {};
    const rowTotals = {};
    const colTotals = paypointList.reduce((o, p) => (o[p] = 0, o), {});
    let grandTotal = 0;
    moduleList.forEach(m => {
      matrix[m] = {};
      let rowSum = 0;
      paypointList.forEach(p => {
        const sum = data.reduce((acc, r) => acc + ((r.paymentModule === m && r.paymentPoint === p) ? Number(r.paymentAmount || 0) : 0), 0);
        matrix[m][p] = sum;
        rowSum += sum;
        colTotals[p] += sum;
        grandTotal += sum;
      });
      rowTotals[m] = rowSum;
    });
    return { paypoints: paypointList, modules: moduleList, matrix, rowTotals, colTotals, grandTotal };
  }, [filteredReceipts, paymentReceipts]);

  // Debt and shortage rows (the Session Manager reconciliation) also show
  // how much of each has been recovered and how much remains.
  const showOwed = paymentReceipts.some((r) => r.kind === 'debt' || r.kind === 'shortage');

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
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5000, background: 'rgba(0,0,0,0.25)', overflowY: 'auto' }}>
      {/* .modal-content is styled globally by other screens (a flex column
          held to 90% of the screen). Here the window is one tall page that the
          backdrop scrolls, so that layout is switched off; it squeezed the
          transactions table to a few pixels under the summary. */}
      <div className="modal-content" style={{ position: 'relative', display: 'block', maxHeight: 'none', overflow: 'visible', background: '#fff', borderRadius: 12, maxWidth: 1200, width: 'calc(100% - 32px)', margin: '24px auto', padding: 'clamp(16px, 3vw, 32px)', boxSizing: 'border-box', boxShadow: '0 4px 32px rgba(0,0,0,0.12)' }}>
        {/* PDF Download Section */}
        <div style={{ marginTop: '25px', marginBottom: '2px', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
          <button
            style={{ padding: '8px 20px', borderRadius: '6px', background: '#1976d2', color: '#fff', fontWeight: 'bold', border: 'none', boxShadow: '0 2px 8px rgba(25,118,210,0.08)', cursor: 'pointer' }}
            onClick={() => {
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
              exportReceiptsTableToPDF({ payPointAccounts: payPointAccounts, dbName: companyRecord.name, filteredReceipts: exportData, filter, resultCount: filteredReceipts.length, employees, grouped, logoUrl: companyLogoUrl });
            }}
          >
            Download PDF
          </button>
          <button
            style={{ padding: '8px 20px', borderRadius: '6px', background: '#388e3c', color: '#fff', fontWeight: 'bold', border: 'none', boxShadow: '0 2px 8px rgba(56,142,60,0.08)', cursor: 'pointer' }}
            onClick={() => {
              const columns = [
                { name: 'Module', reference: 'paymentModule' },
                { name: 'Paypoint', reference: 'paymentPoint' },
                { name: 'Amount', reference: 'paymentAmount', numeric: true },
                ...(showOwed ? [{ name: 'Recovered', reference: 'recoveredAmount', numeric: true }, { name: 'Remaining', reference: 'remainingAmount', numeric: true }] : []),
                { name: 'Receipt #', reference: 'paymentReceipt' },
                { name: 'Date', reference: 'paymentDate' },
                { name: 'Handler', reference: 'paymentHandler' },
                { name: 'For', reference: 'paymentFor' },
                { name: 'Approved By', reference: 'paymentApprover' }
                // { name: 'Ref', reference: 'paymentModuleRef' }
              ];
              const companyInfo = { name: 'Payment Receipts', address: '', phone: '', email: '' };
              const dateRange = { startDate: filter.from, endDate: filter.to };
              let excelFilteredReceipts = filteredReceipts.map((receipt) => {
                const employee = employees?.find(e => String(e.i_d) === String(receipt.paymentHandler))
                const approver = employees?.find(e => String(e.i_d) === String(receipt.paymentApprover))
                return {
                  ...receipt,
                  paymentPoint: payPointAccounts[receipt.paymentPoint] || receipt.paymentPoint,
                  paymentHandler: (`${employee?.i_d} (${employee?.firstName || ''} ${employee?.lastName || ''}) ${employee?.name || employee?.fullName || ''}`).trim() || receipt.paymentHandler,
                  paymentApprover: approver ? ((`${approver.i_d} (${approver?.firstName || ''} ${approver?.lastName || ''}) ${approver?.name || approver?.fullName || ''}`).trim()) : receipt.paymentApprover,
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
              generateExcel(excelFilteredReceipts, columns, companyInfo, dateRange, `${companyRecord.name} Payment Receipts Report`, filter, grouped);
            }}
          >
            Download Excel
          </button>
          <button
            style={{ padding: '8px 20px', borderRadius: '6px', background: '#6a1b9a', color: '#fff', fontWeight: 'bold', border: 'none', boxShadow: '0 2px 8px rgba(106,27,154,0.12)', cursor: 'pointer' }}
            onClick={() => {
              exportSummaryMatrixToPDF({
                summary: summaryByModulePaypoint,
                payPointAccounts,
                title: 'Payment Receipts Summary by Module and Paypoint',
                filters: { from: filter.from, to: filter.to },
                logoUrl: companyLogoUrl
              })
            }}
          >
            Summary PDF
          </button>
          <button
            style={{ padding: '8px 20px', borderRadius: '6px', background: '#ff8f00', color: '#fff', fontWeight: 'bold', border: 'none', boxShadow: '0 2px 8px rgba(255,143,0,0.12)', cursor: 'pointer' }}
            onClick={() => {
              const paypoints = summaryByModulePaypoint.paypoints;
              const columns = [
                { name: 'Module', reference: 'module' },
                ...paypoints.map(p => ({ name: payPointAccounts[p] || p, reference: `pp_${p}` })),
                { name: 'Row Total', reference: 'rowTotal', numeric: true }
              ];
              const data = summaryByModulePaypoint.modules.map(m => {
                const row = { module: String(m).toUpperCase() };
                let sum = 0;
                paypoints.forEach(p => {
                  const val = Number(summaryByModulePaypoint.matrix?.[m]?.[p] || 0);
                  row[`pp_${p}`] = val;
                  sum += val;
                });
                row.rowTotal = sum;
                return row;
              });
              const companyInfo = { name: 'Payment Receipts Summary', address: '', phone: '', email: '' };
              const dateRange = { startDate: filter.from, endDate: filter.to };
              generateExcel(data, columns, companyInfo, dateRange, 'Payment Receipts Summary (Module x Paypoint)', filter, false);
            }}
          >
            Summary Excel
          </button>
        </div>
        <button onClick={onClose} style={{ position: 'absolute', top: 5, right: 5, fontSize: 22, background: 'none', border: 'none', cursor: 'pointer' }}><FaTimes /></button>
        <h2 style={{ marginBottom: 16 }}><FaReceipt style={{ marginRight: 8 }} />{title}</h2>
        {notice}
        {actions}
        <div className="modal-filters" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
          background: '#f5faff',
          borderRadius: '8px',
          padding: '18px 12px',
          boxShadow: '0 2px 8px rgba(25,118,210,0.08)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 'bold', color: '#1976d2' }}>Date From</label>
            <input 
              type="date" 
              value={filter.from} 
              disabled={!!fixedRange} 
              min={isNonAdmin ? getViewDays().dayStart : earliestDate} 
              max={isNonAdmin ? getViewDays().today : undefined} 
              onChange={e => {
                let val = e.target.value;
                if (isNonAdmin) {
                  const { dayStart, today } = getViewDays();
                  if (val < dayStart) val = dayStart;
                  if (val > today) val = today;
                }
                setFilter(f => ({ ...f, from: val }));
              }} 
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #90caf9' }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 'bold', color: '#1976d2' }}>Date To</label>
            <input 
              type="date" 
              value={filter.to} 
              disabled={!!fixedRange} 
              min={isNonAdmin ? getViewDays().dayStart : filter.from} 
              max={isNonAdmin ? getViewDays().today : undefined} 
              onChange={e => {
                let val = e.target.value;
                if (isNonAdmin) {
                  const { dayStart, today } = getViewDays();
                  if (val < dayStart) val = dayStart;
                  if (val > today) val = today;
                }
                setFilter(f => ({ ...f, to: val }));
              }} 
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #90caf9' }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 'bold', color: '#1976d2' }}>Paypoint</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #90caf9', height: multiPaypoint ? '100px' : undefined, minWidth: 170 }}
              >
                {!multiPaypoint && <option value="">All</option>}
                {paypoints.map(p => (
                  <option key={p} value={p}>{payPointAccounts[p] || p}</option>
                ))}
              </select>
              <label style={{ fontSize: '0.95em', color: '#1976d2' }}>
                <input type="checkbox" checked={multiPaypoint} onChange={e => {
                  setMultiPaypoint(e.target.checked);
                  setFilter(f => ({ ...f, paypoint: e.target.checked ? [] : '' }));
                }} style={{ marginRight: 4 }} /> Multi
              </label>
            </div>
            {multiPaypoint && <span style={{ fontSize: '0.9em', color: '#888' }}>Hold Ctrl (Windows) or Cmd (Mac) to select multiple</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 'bold', color: '#1976d2' }}>Module</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #90caf9', height: multiModule ? '100px' : undefined, minWidth: 170 }}
              >
                {!multiModule && <option value="">All</option>}
                {modules.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <label style={{ fontSize: '0.95em', color: '#1976d2' }}>
                <input type="checkbox" checked={multiModule} onChange={e => {
                  setMultiModule(e.target.checked);
                  setFilter(f => ({ ...f, module: e.target.checked ? [] : '' }));
                }} style={{ marginRight: 4 }} /> Multi
              </label>
            </div>
            {multiModule && <span style={{ fontSize: '0.9em', color: '#888' }}>Hold Ctrl (Windows) or Cmd (Mac) to select multiple</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 'bold', color: '#1976d2' }}>Handler</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #90caf9', height: multiHandler ? '100px' : undefined, minWidth: 170 }}
              >
                {!multiHandler && <option value="">All</option>}
                {handlers.map(h => {
                  const emp = employees?.find(e => String(e.i_d) === String(h) || String(e.id) === String(h));
                  const label = emp ? (emp.name || emp.fullName || (emp.firstName ? (emp.firstName + ' ' + (emp.lastName || '')) : h)) : h;
                  return <option key={h} value={h}>{label} ({h})</option>;
                })}
              </select>
              <label style={{ fontSize: '0.95em', color: '#1976d2' }}>
                <input type="checkbox" checked={multiHandler} onChange={e => {
                  setMultiHandler(e.target.checked);
                  setFilter(f => ({ ...f, handler: e.target.checked ? [] : '' }));
                }} style={{ marginRight: 4 }} /> Multi
              </label>
            </div>
            {multiHandler && <span style={{ fontSize: '0.9em', color: '#888' }}>Hold Ctrl (Windows) or Cmd (Mac) to select multiple</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 'bold', color: '#1976d2' }}>Receipt #</label>
            <input type="text" value={filter.receipt} onChange={e => setFilter(f => ({ ...f, receipt: e.target.value }))} placeholder="Enter receipt number" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #90caf9' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start', marginTop: '8px' }}>
            <label style={{ fontWeight: 'bold', color: '#1976d2' }}>Show Only Duplicates</label>
            <input type="checkbox" checked={filter.onlyDuplicates} onChange={e => setFilter(f => ({ ...f, onlyDuplicates: e.target.checked }))} style={{ width: '18px', height: '18px' }} />
            {filter.onlyDuplicates && (
              <label style={{ marginTop: '8px', fontWeight: 'bold', color: '#1976d2' }}>
                <input type="checkbox" checked={showSubtotals} onChange={e => setShowSubtotals(e.target.checked)} style={{ marginRight: 4 }} /> Show Subtotal per Receipt Number
              </label>
            )}
          </div>
          {!fixedRange && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start', marginTop: '8px' }}>
              <label htmlFor="show-reconciliation" style={{ fontWeight: 'bold', color: '#1976d2' }}>Show reconciliation</label>
              <input id="show-reconciliation" type="checkbox" checked={reconOn} onChange={e => { setReconOn(e.target.checked); if (!e.target.checked) setRecon(null); }} style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '0.85em', color: '#555' }}>Money taken, debts and shortages for these business days, as checked before the Session Manager starts.</span>
            </div>
          )}
        </div>
        {reconOn && (
          <div className="sm-reconcile-history">
            {reconState.loading && <p>Loading the reconciliation for {reconFrom}{reconTo !== reconFrom ? ` to ${reconTo}` : ''}...</p>}
            {reconState.error && <p className="sm-reconcile-declined">{reconState.error}</p>}
            {!reconState.loading && !reconState.error && recon && (() => {
              const t = totalsOf(recon.rows);
              const verdicts = reconFrom === reconTo ? describeVerdicts(recon.managers.filter((m) => m.businessDate === reconFrom)) : [];
              return (
                <>
                  <div className="sm-reconcile-totals">
                    <strong>{`Reconciliation of ${reconFrom}${reconTo !== reconFrom ? ` to ${reconTo}` : ''}: received ₦${t.received.toLocaleString()}`}</strong>
                    <span>{`Debts ₦${t.debts.toLocaleString()} · Shortages ₦${t.shortages.toLocaleString()} · recovered ₦${t.recovered.toLocaleString()}, remaining ₦${t.remaining.toLocaleString()}`}</span>
                  </div>
                  {reconFrom === reconTo && (
                    <div className="sm-reconcile-verdicts">
                      {verdicts.length
                        ? verdicts.map((v, i) => <p key={i} className={`sm-verdict sm-verdict-${v.status}`}>{v.text}</p>)
                        : <p className="sm-verdict sm-verdict-none">No Session Manager was stopped on this business day, so there is no decision for it.</p>}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
        <div style={{ marginBottom: '12px', fontWeight: 'bold', color: '#1976d2', fontSize: '1.05em' }}>
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
            // Debt and shortage rows (the Session Manager reconciliation) are
            // owed, not received, so they are named apart from the money.
            const owedRows = (isGrouped ? tableReceipts.flatMap((g) => g.group) : tableReceipts).filter((r) => r.kind === 'debt' || r.kind === 'shortage');
            const owed = owedRows.reduce((sum, r) => sum + Number(r.paymentAmount || 0), 0);
            const base = `${totalCount} result${totalCount === 1 ? '' : 's'} found. Total Amount: ₦${totalAmount.toLocaleString()}`;
            return owedRows.length ? `${base}, of which ₦${owed.toLocaleString()} is debts and shortages and ₦${(totalAmount - owed).toLocaleString()} was received` : base;
          })()}
        </div>
        <div style={{ marginBottom: '18px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>View:</span>
          <button onClick={() => setViewType('card')} style={{ padding: '6px 16px', borderRadius: '4px', border: viewType === 'card' ? '2px solid #1976d2' : '1px solid #ccc', background: viewType === 'card' ? '#e3f2fd' : '#fff', color: '#1976d2', fontWeight: 'bold', cursor: 'pointer' }}>Card</button>
          <button onClick={() => setViewType('table')} style={{ padding: '6px 16px', borderRadius: '4px', border: viewType === 'table' ? '2px solid #1976d2' : '1px solid #ccc', background: viewType === 'table' ? '#e3f2fd' : '#fff', color: '#1976d2', fontWeight: 'bold', cursor: 'pointer' }}>Table</button>
        </div>
        {/* Summary matrix: Module x Paypoint */}
        {filteredReceipts.length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontWeight: 'bold', color: '#1976d2', margin: '6px 0' }}>Summary by Module and Paypoint</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
              <thead>
                <tr style={{ background: '#e3f2fd', color: '#1976d2' }}>
                  <th style={{ padding: '8px', border: '1px solid #90caf9', textAlign: 'left' }}>Module</th>
                  {summaryByModulePaypoint.paypoints.map(pp => (
                    <th key={pp} style={{ padding: '8px', border: '1px solid #90caf9', textAlign: 'right' }}>{payPointAccounts[pp] || pp}</th>
                  ))}
                  <th style={{ padding: '8px', border: '1px solid #90caf9', textAlign: 'right' }}>Row Total</th>
                </tr>
              </thead>
              <tbody>
                {summaryByModulePaypoint.modules.map(m => (
                  <tr key={m}>
                    <td style={{ padding: '8px', border: '1px solid #90caf9', fontWeight: 'bold' }}>{String(m).toUpperCase()}</td>
                    {summaryByModulePaypoint.paypoints.map(pp => (
                      <td key={m + '-' + pp} style={{ padding: '8px', border: '1px solid #90caf9', textAlign: 'right' }}>₦{Number(summaryByModulePaypoint.matrix[m][pp] || 0).toLocaleString()}</td>
                    ))}
                    <td style={{ padding: '8px', border: '1px solid #90caf9', textAlign: 'right', fontWeight: 'bold' }}>₦{Number(summaryByModulePaypoint.rowTotals[m] || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#e3f2fd', color: '#1976d2', fontWeight: 'bold' }}>
                  <td style={{ padding: '8px', border: '1px solid #90caf9' }}>Column Total</td>
                  {summaryByModulePaypoint.paypoints.map(pp => (
                    <td key={'total-' + pp} style={{ padding: '8px', border: '1px solid #90caf9', textAlign: 'right' }}>₦{Number(summaryByModulePaypoint.colTotals[pp] || 0).toLocaleString()}</td>
                  ))}
                  <td style={{ padding: '8px', border: '1px solid #90caf9', textAlign: 'right' }}>₦{Number(summaryByModulePaypoint.grandTotal || 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="modal-details" style={{ maxHeight: '70vh', overflowY: 'auto', flexShrink: 0 }}>
          {filteredReceipts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', marginTop: 32 }}>No receipts found for selected filters.</div>
          ) : viewType === 'card' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', margin: '5px auto' }}>
              {filteredReceipts.map((r, idx) => {
                const emp = employees?.find(e => String(e.i_d) === String(r.paymentHandler) || String(e.id) === String(r.paymentHandler));
                const approver = employees?.find(e => String(e.i_d) === String(r.paymentApprover) || String(e.id) === String(r.paymentApprover));
                return (
                  <div key={idx} className="receipt-card" style={{ background: '#f5faff', border: '1px solid #90caf9', borderRadius: 8, padding: '18px 16px', minWidth: 260, flex: '1 1 260px', boxShadow: '0 2px 8px rgba(25,118,210,0.08)' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.08em', marginBottom: 6 }}>{r.paymentModule.toUpperCase()}</div>
                    <div><b>Paypoint:</b> {r.paymentPoint}</div>
                    <div><b>Amount:</b> ₦{Number(r.paymentAmount).toLocaleString()}</div>
                    {r.kind && <div><b>Recovered:</b> ₦{Number(r.recoveredAmount || 0).toLocaleString()} <b>Remaining:</b> ₦{Number(r.remainingAmount || 0).toLocaleString()}</div>}
                    <div><b>Receipt #:</b> {r.paymentReceipt}</div>
                    <div><b>Date:</b> {new Date(r.paymentDate).toLocaleDateString()}</div>
                    <div><b>Handler:</b> {r.paymentHandler} {emp ? <span style={{ color: '#1976d2', fontWeight: 'bold' }}>({emp.name || emp.fullName || emp.firstName + ' ' + emp.lastName})</span> : null}</div>
                    <div><b>For:</b> {r.paymentFor}</div>
                    <div><b>Approved By:</b> {r.paymentApprover} {approver ? <span style={{ color: '#1976d2', fontWeight: 'bold' }}>({approver.name || approver.fullName || approver.firstName + ' ' + approver.lastName})</span> : null}</div>
                    {/* <div style={{fontSize:'0.95em',color:'#1976d2',marginTop:8}}><b>Ref:</b> {r.paymentModuleRef}</div> */}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f5faff', margin: '5px auto' }}>
                <thead>
                  <tr style={{ background: '#e3f2fd', color: '#1976d2' }}>
                    <th style={{ padding: '8px', border: '1px solid #90caf9', cursor: 'pointer' }} onClick={() => setSortConfig(s => ({ key: 'paymentModule', direction: s.key === 'paymentModule' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                      Module {sortConfig.key === 'paymentModule' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #90caf9', cursor: 'pointer' }} onClick={() => setSortConfig(s => ({ key: 'paymentPoint', direction: s.key === 'paymentPoint' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                      Paypoint {sortConfig.key === 'paymentPoint' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #90caf9', cursor: 'pointer' }} onClick={() => setSortConfig(s => ({ key: 'paymentAmount', direction: s.key === 'paymentAmount' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                      Amount {sortConfig.key === 'paymentAmount' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    {showOwed && <th style={{ padding: '8px', border: '1px solid #90caf9' }}>Recovered</th>}
                    {showOwed && <th style={{ padding: '8px', border: '1px solid #90caf9' }}>Remaining</th>}
                    <th style={{ padding: '8px', border: '1px solid #90caf9', cursor: 'pointer' }} onClick={() => setSortConfig(s => ({ key: 'paymentReceipt', direction: s.key === 'paymentReceipt' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                      Receipt # {sortConfig.key === 'paymentReceipt' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #90caf9', cursor: 'pointer' }} onClick={() => setSortConfig(s => ({ key: 'paymentDate', direction: s.key === 'paymentDate' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                      Date {sortConfig.key === 'paymentDate' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #90caf9', cursor: 'pointer' }} onClick={() => setSortConfig(s => ({ key: 'paymentHandler', direction: s.key === 'paymentHandler' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                      Handler {sortConfig.key === 'paymentHandler' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #90caf9', cursor: 'pointer' }} onClick={() => setSortConfig(s => ({ key: 'paymentFor', direction: s.key === 'paymentFor' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                      For {sortConfig.key === 'paymentFor' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #90caf9', cursor: 'pointer' }} onClick={() => setSortConfig(s => ({ key: 'paymentApprover', direction: s.key === 'paymentApprover' && s.direction === 'asc' ? 'desc' : 'asc' }))}>
                      Approved By {sortConfig.key === 'paymentApprover' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
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
                          <tr key={receiptNum + '-' + idx} style={{ background: '#fff' }}>
                            <td style={{ padding: '8px', border: '1px solid #90caf9', fontWeight: 'bold' }}>{r.paymentModule.toUpperCase()}</td>
                            <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{payPointAccounts[r.paymentPoint] || r.paymentPoint}</td>
                            <td style={{ padding: '8px', border: '1px solid #90caf9' }}>₦{Number(r.paymentAmount).toLocaleString()}</td>
                            {showOwed && <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{r.kind ? `₦${Number(r.recoveredAmount || 0).toLocaleString()}` : ''}</td>}
                            {showOwed && <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{r.kind ? `₦${Number(r.remainingAmount || 0).toLocaleString()}` : ''}</td>}
                            <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{r.paymentReceipt}</td>
                            <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{new Date(r.paymentDate).toLocaleDateString()}</td>
                            <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{r.paymentHandler} {emp ? <span style={{ color: '#1976d2', fontWeight: 'bold' }}>({emp.name || emp.fullName || emp.firstName + ' ' + emp.lastName})</span> : null}</td>
                            <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{r.paymentFor}</td>
                            <td style={{ padding: '8px', border: '1px solid #90caf9', fontSize: '0.95em', color: '#1976d2' }}>{r.paymentApprover} {approver ? <span style={{ color: '#1976d2', fontWeight: 'bold' }}>({approver.name || approver.fullName || approver.firstName + ' ' + approver.lastName})</span> : null}</td>
                          </tr>
                        );
                      }),
                      // Subtotal row for this group
                      <tr key={receiptNum + '-subtotal'} style={{ background: '#e3f2fd', fontWeight: 'bold', color: '#1976d2' }}>
                        <td style={{ padding: '8px', border: '1px solid #90caf9' }} colSpan={2}>Subtotal for Receipt #{receiptNum}</td>
                        <td style={{ padding: '8px', border: '1px solid #90caf9' }}>
                          ₦{group.reduce((sum, r) => sum + Number(r.paymentAmount || 0), 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #90caf9' }} colSpan={showOwed ? 7 : 5}></td>
                      </tr>
                    ])
                  ) : (
                    // Default rendering
                    <>
                      {filteredReceipts.map((r, idx) => {
                        const emp = employees?.find(e => String(e.i_d) === String(r.paymentHandler) || String(e.id) === String(r.paymentHandler));
                        const approver = employees?.find(e => String(e.i_d) === String(r.paymentApprover) || String(e.id) === String(r.paymentApprover));
                        return (
                          <tr key={idx} style={{ background: '#fff' }}>
                            <td style={{ padding: '8px', border: '1px solid #90caf9', fontWeight: 'bold' }}>{r.paymentModule.toUpperCase()}</td>
                            <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{payPointAccounts[r.paymentPoint] || r.paymentPoint}</td>
                            <td style={{ padding: '8px', border: '1px solid #90caf9' }}>₦{Number(r.paymentAmount).toLocaleString()}</td>
                            {showOwed && <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{r.kind ? `₦${Number(r.recoveredAmount || 0).toLocaleString()}` : ''}</td>}
                            {showOwed && <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{r.kind ? `₦${Number(r.remainingAmount || 0).toLocaleString()}` : ''}</td>}
                            <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{r.paymentReceipt}</td>
                            <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{new Date(r.paymentDate).toLocaleDateString()}</td>
                            <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{r.paymentHandler} {emp ? <span style={{ color: '#1976d2', fontWeight: 'bold' }}>({emp.name || emp.fullName || emp.firstName + ' ' + emp.lastName})</span> : null}</td>
                            <td style={{ padding: '8px', border: '1px solid #90caf9' }}>{r.paymentFor}</td>
                            <td style={{ padding: '8px', border: '1px solid #90caf9', fontSize: '0.95em', color: '#1976d2' }}>{r.paymentApprover} {approver ? <span style={{ color: '#1976d2', fontWeight: 'bold' }}>({approver.name || approver.fullName || approver.firstName + ' ' + approver.lastName})</span> : null}</td>
                          </tr>
                        );
                      })}
                      {/* Totals row */}
                      <tr style={{ background: '#e3f2fd', fontWeight: 'bold', color: '#1976d2' }}>
                        <td style={{ padding: '8px', border: '1px solid #90caf9' }} colSpan={2}>Total</td>
                        <td style={{ padding: '8px', border: '1px solid #90caf9' }}>
                          ₦{(() => {
                            if (isGrouped) {
                              return tableReceipts.reduce((sum, g) => sum + g.group.reduce((s, r) => s + Number(r.paymentAmount || 0), 0), 0).toLocaleString();
                            } else {
                              return tableReceipts.reduce((sum, r) => sum + Number(r.paymentAmount || 0), 0).toLocaleString();
                            }
                          })()}
                        </td>
                        {showOwed && <td style={{ padding: '8px', border: '1px solid #90caf9' }}>₦{tableReceipts.reduce((sum, r) => sum + Number(r.recoveredAmount || 0), 0).toLocaleString()}</td>}
                        {showOwed && <td style={{ padding: '8px', border: '1px solid #90caf9' }}>₦{tableReceipts.reduce((sum, r) => sum + Number(r.remainingAmount || 0), 0).toLocaleString()}</td>}
                        <td style={{ padding: '8px', border: '1px solid #90caf9' }} colSpan={5}></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {footer}
      </div>
    </div>
  );
}

export default PaymentReceiptsModal;
