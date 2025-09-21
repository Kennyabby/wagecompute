
import jsPDF from 'jspdf';

export function exportReceiptsTableToPDF({ filteredReceipts, filter, resultCount, employees, grouped = false }) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const marginLeft = 7;
  const marginTop = 18;
  const rowHeight = 10;
  const colWidths = [38, 30, 30, 25, 25, 50, 48, 38]; // px widths for each column
  const columns = [
    'Module', 'Paypoint', 'Amount', 'Receipt #', 'Date', 'Handler', 'For', 'Approved By'
  ];
  const payPointAccounts = {
    'moniepoint1':'MP1-8198068382', 'moniepoint2':'MP2-5342270174', 
    'moniepoint3':'MP3-5399647958', 'moniepoint4':'MP4-5536588063', 
    'cash':'CASH', 'Employee':'EMPLOYEE'
  }
  let totalAmount = 0;
  if (grouped) {
    totalAmount = filteredReceipts.reduce((sum, g) => sum + g.group.reduce((s, r) => s + Number(r.paymentAmount || 0), 0), 0);
  } else {
    totalAmount = filteredReceipts.reduce((sum, r) => sum + Number(r.paymentAmount || 0), 0);
  }
  // Title
  doc.setFontSize(16);
  doc.text('The Plantain Planet Payment Receipts Report', marginLeft, marginTop);
  doc.setFontSize(11);
  doc.text(`Filters:`, marginLeft, marginTop + 10);
  // Format multi-select filters for display
  const formatFilter = (val, mapObj) => {
    if (Array.isArray(val)) {
      if (val.length === 0) return 'Any';
      return val.map(v => mapObj ? (mapObj[v] || v) : v).join(', ');
    }
    return val ? (mapObj ? (mapObj[val] || val) : val) : 'Any';
  };
  doc.text(
    `Date From: ${filter.from || 'Any'} | Date To: ${filter.to || 'Any'} | Paypoint: ${formatFilter(filter.paypoint, payPointAccounts)} | Module: ${formatFilter(filter.module)} | Handler: ${formatFilter(filter.handler)} | Receipt #: ${filter.receipt || 'Any'}`,
    marginLeft,
    marginTop + 16
  );
  doc.text(`Total Results: ${resultCount} | Total Amount: ${totalAmount.toLocaleString()}`, marginLeft, marginTop + 24);

  // Table header
  let x = marginLeft;
  let y = marginTop + 32;
  doc.setFillColor(25, 118, 210);
  doc.setTextColor(255,255,255);
  doc.setFontSize(10);
  columns.forEach((col, i) => {
    doc.setFillColor(25, 118, 210);
    doc.setTextColor(255,255,255);
    doc.setFontSize(10);
    doc.rect(x, y, colWidths[i], rowHeight, 'F');
    doc.text(col, x + 2, y + 7);
    x += colWidths[i];
  });

  // Table rows
  doc.setFontSize(9);
  doc.setTextColor(40,40,40);
  y += rowHeight;
  if (grouped) {
    // filteredReceipts is [{ receiptNum, group }]
    filteredReceipts.forEach(({ receiptNum, group }) => {
      group.forEach((r, idx) => {
        x = marginLeft;
        let empName = '';
        if (employees && r.paymentHandler) {
          const emp = employees.find(e => String(e.i_d) === String(r.paymentHandler) || String(e.id) === String(r.paymentHandler));
          if (emp) {
            empName = emp.name || emp.fullName || (emp.firstName ? (emp.firstName + ' ' + (emp.lastName||'')) : '');
          }
        }
        const handlerDisplay = empName ? `${r.paymentHandler} (${empName})` : r.paymentHandler;
        let approverName = '';
        if (employees && r.paymentApprover) {
          const emp = employees.find(e => String(e.i_d) === String(r.paymentApprover) || String(e.id) === String(r.paymentApprover));
          if (emp) {
            approverName = emp.name || emp.fullName || (emp.firstName ? (emp.firstName + ' ' + (emp.lastName||'')) : '');
          }
        }
        const approverDisplay = approverName ? `${r.paymentApprover} (${approverName})` : r.paymentApprover;
        const row = [
          r.paymentModule.toUpperCase(),
          payPointAccounts[r.paymentPoint],
          `${Number(r.paymentAmount).toLocaleString()}`,
          r.paymentReceipt,
          new Date(r.paymentDate).toLocaleDateString(),
          handlerDisplay,
          r.paymentFor,
          approverDisplay
        ];
        row.forEach((cell, i) => {
          doc.rect(x, y, colWidths[i], rowHeight);
          let text = String(cell);
          if (text.length > 25) text = text.slice(0, 26) + '...';
          doc.text(text, x + 2, y + 7);
          x += colWidths[i];
        });
        y += rowHeight;
        if (y > 190) {
          doc.addPage();
          y = marginTop;
        }
      });
      // Subtotal row for this group
      x = marginLeft;
      doc.setFillColor(227, 242, 253);
      doc.setTextColor(25, 118, 210);
      doc.setFontSize(10);
      doc.rect(x, y, colWidths[0]+colWidths[1], rowHeight, 'F');
      doc.text(`Subtotal for Receipt #${receiptNum}`, x + 2, y + 7);
      x += colWidths[0]+colWidths[1];
      doc.setFillColor(227, 242, 253);
      doc.setTextColor(25, 118, 210);
      doc.setFontSize(10);
      doc.rect(x, y, colWidths[2], rowHeight, 'F');
      const subtotal = group.reduce((sum, r) => sum + Number(r.paymentAmount || 0), 0);
      doc.text(`${subtotal.toLocaleString()}`, x + 2, y + 7);
      x += colWidths[2];
      for(let i=3;i<colWidths.length;i++) {
        doc.rect(x, y, colWidths[i], rowHeight, 'F');
        x += colWidths[i];
      }
      y += rowHeight;
      if (y > 190) {
        doc.addPage();
        y = marginTop;
      }
    });
  } else {
    filteredReceipts.forEach((r, idx) => {
      x = marginLeft;
      // Find employee name for handler
      let empName = '';
      if (employees && r.paymentHandler) {
        const emp = employees.find(e => String(e.i_d) === String(r.paymentHandler) || String(e.id) === String(r.paymentHandler));
        if (emp) {
          empName = emp.name || emp.fullName || (emp.firstName ? (emp.firstName + ' ' + (emp.lastName||'')) : '');
        }
      }
      const handlerDisplay = empName ? `${r.paymentHandler} (${empName})` : r.paymentHandler;
      
      let approverName = '';
      if (employees && r.paymentApprover) {
        const emp = employees.find(e => String(e.i_d) === String(r.paymentApprover) || String(e.id) === String(r.paymentApprover));
        if (emp) {
          approverName = emp.name || emp.fullName || (emp.firstName ? (emp.firstName + ' ' + (emp.lastName||'')) : '');
        }
      }
      const approverDisplay = approverName ? `${r.paymentApprover} (${approverName})` : r.paymentApprover;
      const row = [
        r.paymentModule.toUpperCase(),
        payPointAccounts[r.paymentPoint],
        `${Number(r.paymentAmount).toLocaleString()}`,
        r.paymentReceipt,
        new Date(r.paymentDate).toLocaleDateString(),
        handlerDisplay,
        r.paymentFor,
        approverDisplay
      ];
      row.forEach((cell, i) => {
        doc.rect(x, y, colWidths[i], rowHeight);
        let text = String(cell);
        if (text.length > 25) text = text.slice(0, 26) + '...';
        doc.text(text, x + 2, y + 7);
        x += colWidths[i];
      });
      y += rowHeight;
      if (y > 190) {
        doc.addPage();
        y = marginTop;
      }
    });
  }
  // Add totals row
  x = marginLeft;
  doc.setFillColor(227, 242, 253);
  doc.setTextColor(25, 118, 210);
  doc.setFontSize(10);
  doc.rect(x, y, colWidths[0]+colWidths[1], rowHeight, 'F');
  doc.text('Total', x + 2, y + 7);
  x += colWidths[0]+colWidths[1];  
  doc.setFillColor(227, 242, 253);
  doc.setTextColor(25, 118, 210);
  doc.setFontSize(10);
  doc.rect(x, y, colWidths[2], rowHeight, 'F');
  doc.text(`${totalAmount.toLocaleString()}`, x + 2, y + 7);
  x += colWidths[2];
  // Fill rest of row
  for(let i=3;i<colWidths.length;i++) {
    doc.rect(x, y, colWidths[i], rowHeight, 'F');
    x += colWidths[i];
  }

  doc.save('payment_receipts_report.pdf');
}
