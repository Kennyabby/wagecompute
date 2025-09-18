
import jsPDF from 'jspdf';

export function exportReceiptsTableToPDF({ filteredReceipts, filter, resultCount, employees }) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const marginLeft = 7;
  const marginTop = 18;
  const rowHeight = 10;
  const colWidths = [33, 30, 30, 30, 30, 50, 48, 35]; // px widths for each column
  const columns = [
    'Module', 'Paypoint', 'Amount', 'Receipt #', 'Date', 'Handler', 'For', 'Ref'
  ];
  const payPointAccounts = {
    'moniepoint1':'MP1-8198068382', 'moniepoint2':'MP2-5342270174', 
    'moniepoint3':'MP3-5399647958', 'moniepoint4':'MP4-5536588063', 
    'cash':'CASH', 'Employee':'EMPLOYEE'
  }
  // Title
  doc.setFontSize(16);
  doc.text('Payment Receipts Report', marginLeft, marginTop);
  doc.setFontSize(11);
  doc.text(`Filters:`, marginLeft, marginTop + 10);
  doc.text(`Date From: ${filter.from || 'Any'} | Date To: ${filter.to || 'Any'} | Paypoint: ${payPointAccounts?.[filter.paypoint] || 'Any'} | Module: ${filter.module || 'Any'} | Handler: ${filter.handler || 'Any'} | Receipt #: ${filter.receipt || 'Any'}`, marginLeft, marginTop + 16);
  doc.text(`Total Results: ${resultCount}`, marginLeft, marginTop + 24);

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
    const row = [
      r.paymentModule.toUpperCase(),
      payPointAccounts[r.paymentPoint],
      `${Number(r.paymentAmount).toLocaleString()}`,
      r.paymentReceipt,
      new Date(r.paymentDate).toLocaleDateString(),
      handlerDisplay,
      r.paymentFor,
      r.paymentModuleRef
    ];
    row.forEach((cell, i) => {
      doc.rect(x, y, colWidths[i], rowHeight);
      let text = String(cell);
      // Truncate if too long
      if (text.length > 25) text = text.slice(0, 26) + '...';
      doc.text(text, x + 2, y + 7);
      x += colWidths[i];
    });
    y += rowHeight;
    // Page break if needed
    if (y > 190) {
      doc.addPage();
      y = marginTop;
    }
  });

  doc.save('payment_receipts_report.pdf');
}
