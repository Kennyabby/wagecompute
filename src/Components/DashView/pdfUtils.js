
import jsPDF from 'jspdf';

export function exportReceiptsTableToPDF({ payPointAccounts, dbName, filteredReceipts, filter, resultCount, employees, grouped = false }) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const marginLeft = 7;
  const marginTop = 18;
  const rowHeight = 10;
  const colWidths = [38, 30, 30, 25, 25, 50, 48, 38]; // px widths for each column
  const columns = [
    'Module', 'Paypoint', 'Amount', 'Receipt #', 'Date', 'Handler', 'For', 'Approved By'
  ];

  let totalAmount = 0;
  if (grouped) {
    totalAmount = filteredReceipts.reduce((sum, g) => sum + g.group.reduce((s, r) => s + Number(r.paymentAmount || 0), 0), 0);
  } else {
    totalAmount = filteredReceipts.reduce((sum, r) => sum + Number(r.paymentAmount || 0), 0);
  }
  // Title
  doc.setFontSize(16);
  doc.text(`${dbName} Payment Receipts Report`, marginLeft, marginTop);
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
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  columns.forEach((col, i) => {
    doc.setFillColor(25, 118, 210);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.rect(x, y, colWidths[i], rowHeight, 'F');
    doc.text(col, x + 2, y + 7);
    x += colWidths[i];
  });

  // Table rows
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
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
            empName = emp.name || emp.fullName || (emp.firstName ? (emp.firstName + ' ' + (emp.lastName || '')) : '');
          }
        }
        const handlerDisplay = empName ? `${r.paymentHandler} (${empName})` : r.paymentHandler;
        let approverName = '';
        if (employees && r.paymentApprover) {
          const emp = employees.find(e => String(e.i_d) === String(r.paymentApprover) || String(e.id) === String(r.paymentApprover));
          if (emp) {
            approverName = emp.name || emp.fullName || (emp.firstName ? (emp.firstName + ' ' + (emp.lastName || '')) : '');
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
      doc.rect(x, y, colWidths[0] + colWidths[1], rowHeight, 'F');
      doc.text(`Subtotal for Receipt #${receiptNum}`, x + 2, y + 7);
      x += colWidths[0] + colWidths[1];
      doc.setFillColor(227, 242, 253);
      doc.setTextColor(25, 118, 210);
      doc.setFontSize(10);
      doc.rect(x, y, colWidths[2], rowHeight, 'F');
      const subtotal = group.reduce((sum, r) => sum + Number(r.paymentAmount || 0), 0);
      doc.text(`${subtotal.toLocaleString()}`, x + 2, y + 7);
      x += colWidths[2];
      for (let i = 3; i < colWidths.length; i++) {
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
          empName = emp.name || emp.fullName || (emp.firstName ? (emp.firstName + ' ' + (emp.lastName || '')) : '');
        }
      }
      const handlerDisplay = empName ? `${r.paymentHandler} (${empName})` : r.paymentHandler;

      let approverName = '';
      if (employees && r.paymentApprover) {
        const emp = employees.find(e => String(e.i_d) === String(r.paymentApprover) || String(e.id) === String(r.paymentApprover));
        if (emp) {
          approverName = emp.name || emp.fullName || (emp.firstName ? (emp.firstName + ' ' + (emp.lastName || '')) : '');
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
  doc.rect(x, y, colWidths[0] + colWidths[1], rowHeight, 'F');
  doc.text('Total', x + 2, y + 7);
  x += colWidths[0] + colWidths[1];
  doc.setFillColor(227, 242, 253);
  doc.setTextColor(25, 118, 210);
  doc.setFontSize(10);
  doc.rect(x, y, colWidths[2], rowHeight, 'F');
  doc.text(`${totalAmount.toLocaleString()}`, x + 2, y + 7);
  x += colWidths[2];
  // Fill rest of row
  for (let i = 3; i < colWidths.length; i++) {
    doc.rect(x, y, colWidths[i], rowHeight, 'F');
    x += colWidths[i];
  }

  doc.save('payment_receipts_report.pdf');
}


export function exportSummaryMatrixToPDF({
  summary,
  payPointAccounts = {},
  title = 'Summary by Module and Paypoint',
  filters = {}
}) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const marginLeft = 10;
  const marginTop = 14;
  const rowHeight = 10;
  // Build dynamic columns: Module, ...paypoints, Row Total
  const paypoints = summary.paypoints || [];
  const columns = ['Module', ...paypoints.map(p => payPointAccounts[p] || p), 'Row Total'];
  const colWidthBase = Math.max(28, Math.min(60, (290 / columns.length))); // simple width calc
  const colWidths = new Array(columns.length).fill(colWidthBase);

  // Title
  doc.setFontSize(14);
  doc.text(title, marginLeft, marginTop);
  // Filters line
  doc.setFontSize(10);
  const filterLine = `Date From: ${filters.from || 'Any'} | Date To: ${filters.to || 'Any'}`;
  doc.text(filterLine, marginLeft, marginTop + 8);

  // Header
  let x = marginLeft;
  let y = marginTop + 16;
  doc.setFontSize(10);
  columns.forEach((col, i) => {
    doc.setFillColor(25, 118, 210);
    doc.setTextColor(255, 255, 255);
    doc.rect(x, y, colWidths[i], rowHeight, 'F');
    doc.text(String(col), x + 2, y + 7);
    x += colWidths[i];
  });

  // Rows
  doc.setTextColor(40, 40, 40);
  y += rowHeight;
  (summary.modules || []).forEach(m => {
    x = marginLeft;
    const row = [String(m).toUpperCase(), ...paypoints.map(p => Number(summary.matrix?.[m]?.[p] || 0).toLocaleString()), Number(summary.rowTotals?.[m] || 0).toLocaleString()];
    row.forEach((cell, i) => {
      if (!i) {
        doc.setFontSize(6);
      } else {
        doc.setFontSize(10);
      }
      doc.rect(x, y, colWidths[i], rowHeight);
      let text = String(cell);
      if (text.length > 18) text = text.slice(0, 19) + '...';
      doc.text(text, x + 2, y + 7);
      x += colWidths[i];
    });
    y += rowHeight;
    if (y > 190) {
      doc.addPage();
      y = marginTop;
    }
  });

  // Footer totals
  x = marginLeft;
  doc.setFontSize(10);
  columns.forEach((_, i) => {
    const w = colWidths[i];
    doc.setFillColor(227, 242, 253);
    doc.setTextColor(25, 118, 210);
    doc.rect(x, y, w, rowHeight, 'F');
    let text = '';
    if (i === 0) text = 'Column Total';
    else if (i === columns.length - 1) text = Number(summary.grandTotal || 0).toLocaleString();
    else {
      const p = paypoints[i - 1];
      text = Number(summary.colTotals?.[p] || 0).toLocaleString();
    }
    if (text) {
      doc.text(String(text), x + 2, y + 7);
    }
    x += w;
  });

  doc.save('payment_receipts_summary.pdf');
}

const loadImageAsBase64 = async (url) => {
  if (!url) return null;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to load image:', url, error);
    return null;
  }
};

export async function exportPurchaseDocumentToPDF({
  type = 'purchaseOrder',
  title = 'PURCHASE DOCUMENT',
  companyRecord = {},
  fields = {},
  entries = [],
  purchaseDate = '',
  curApproval = null,
  getDate = (value) => value || '',
  server = null,
  fetchServer = null
}) {
  // Fetch central company profile to ensure logo/signature are current (matching Employees.js pattern)
  let centralCompany = null;
  try {
    if (fetchServer && server) {
      const cpResp = await fetchServer('POST', {}, 'getCompanyProfile', server);
      if (cpResp && !cpResp.err && cpResp.record) centralCompany = cpResp.record;
    }
  } catch (e) { /* ignore */ }

  const logoUrl = centralCompany?.logoUrl || companyRecord?.logoUrl;
  const signatureUrl = centralCompany?.signatureUrl || companyRecord?.signatureUrl;

  const doc = new jsPDF({ orientation: 'portrait' });
  const marginLeft = 10;
  const marginRight = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - marginLeft - marginRight;
  const rowHeight = 8;
  let y = 12;

  // Load images asynchronously
  const logoBase64 = await loadImageAsBase64(logoUrl);
  const signatureBase64 = await loadImageAsBase64(signatureUrl);

  const formatValue = (value) => {
    if (value === undefined || value === null) return '';
    return String(value);
  };

  // Add logo at top-left if available
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', marginLeft, y, 20, 20);
    } catch (e) {
      console.warn('Failed to add logo to PDF:', e);
    }
  }

  // Add document title to the right
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const titleX = logoBase64 ? marginLeft + 25 : marginLeft;
  doc.text(title, titleX, y + 6);
  y += 24;

  const getDocumentNumber = () => {
    return fields.productsRef || fields.purchaseReference || curApproval?.createdAt || 'N/A';
  };

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return amount ? `${amount.toLocaleString()}` : '0';
  };

  const documentDate = purchaseDate || fields.postingDate || '';
  const vendorName = fields.purchaseVendor || fields.vendorName || '';
  const department = fields.purchaseDepartment || '';
  const purchaseQuantity = fields.purchaseQuantity || '';
  const purchaseUOM = fields.purchaseUOM || '';
  const purchaseAmount = fields.purchaseAmount || '';

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatValue(companyRecord.name || 'COMPANY NAME'), marginLeft, y);
  y += rowHeight;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (companyRecord.address) {
    doc.text(formatValue(companyRecord.address), marginLeft, y);
    y += rowHeight;
  }
  const contactLine = [companyRecord.phone || companyRecord.mobile, companyRecord.email].filter(Boolean).join(' | ');
  if (contactLine) {
    doc.text(contactLine, marginLeft, y);
    y += rowHeight;
  }

  y += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Document: ${getDocumentNumber()}`, marginLeft, y);
  doc.text(`Date: ${formatValue(getDate(documentDate))}`, pageWidth - marginRight, y, { align: 'right' });
  y += rowHeight;
  doc.text(`Vendor: ${vendorName}`, marginLeft, y);
  doc.text(`Department: ${department}`, pageWidth - marginRight, y, { align: 'right' });
  y += rowHeight;
  doc.text(`Quantity: ${formatValue(purchaseQuantity)} ${purchaseUOM}`.trim(), marginLeft, y);
  doc.text(`Total Amount: ${formatCurrency(purchaseAmount)}`, pageWidth - marginRight, y, { align: 'right' });
  y += rowHeight;

  if (curApproval?.approved) {
    doc.text(`Approved By: ${formatValue(curApproval.approvedBy || curApproval.approvedBy || '')}`, marginLeft, y);
    y += rowHeight;
  }

  y += 6;

  const headers = ['Product', 'Product ID', 'Qty', 'UOM', 'Unit Cost', 'Total'];
  const colWidths = [66, 24, 22, 24, 30, 30];
  let x = marginLeft;
  doc.setFillColor(25, 118, 210);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  headers.forEach((heading, index) => {
    doc.rect(x, y, colWidths[index], rowHeight, 'F');
    doc.text(String(heading), x + 2, y + 6);
    x += colWidths[index];
    doc.setFillColor(25, 118, 210);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
  });
  y += rowHeight;

  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);

  const sanitizeText = (text, maxLength) => {
    const value = formatValue(text);
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
  };

  let totalCostSum = 0;
  const visibleEntries = Array.isArray(entries) ? entries.filter((entry) => entry && (entry.quantity || entry.totalCost || entry.baseQuantity)) : [];
  visibleEntries.forEach((entry) => {
    if (y > 270) {
      doc.addPage();
      y = 18;
    }
    x = marginLeft;
    const quantity = entry.quantity || entry.baseQuantity || '';
    const totalCost = Number(entry.totalCost || 0);
    const unitCost = quantity ? (totalCost / Number(quantity || 1)) : 0;
    const rowValues = [
      sanitizeText(entry.name || entry.productName || '', 30),
      sanitizeText(entry.productId || entry.i_d || '', 12),
      formatValue(quantity),
      formatValue(entry.purchaseUom || entry.purchaseUOM || purchaseUOM),
      unitCost ? formatCurrency(unitCost.toFixed(2)) : '-',
      totalCost ? formatCurrency(totalCost) : formatCurrency(0)
    ];
    rowValues.forEach((value, index) => {
      doc.rect(x, y, colWidths[index], rowHeight);
      doc.text(String(value), x + 2, y + 6);
      x += colWidths[index];
    });
    y += rowHeight;
    totalCostSum += totalCost;
  });

  if (!visibleEntries.length) {
    x = marginLeft;
    doc.rect(x, y, contentWidth, rowHeight);
    doc.text('No purchase entries available for this document.', x + 2, y + 6);
    y += rowHeight;
  }

  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total: ${formatCurrency(totalCostSum || purchaseAmount)}`, marginLeft, y);

  // Add authorized signature if approved
  if (curApproval?.approved && signatureBase64) {
    y += 24;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signature:', marginLeft, y);
    y += 2;
    try {
      doc.addImage(signatureBase64, 'PNG', marginLeft, y, 40, 16);
    } catch (e) {
      console.warn('Failed to add signature to PDF:', e);
    }
  }

  const fileTitle = title.replace(/\s+/g, '_').toUpperCase();
  const filename = `${fileTitle}_${formatValue(getDate(documentDate)).replace(/\s+/g, '_') || 'DOCUMENT'}.pdf`;
  doc.save(filename);
}

// Same visual scaffold as exportPurchaseDocumentToPDF (company header/logo,
// title, date/party block, line-item table, grand total, signature) but for
// Expenses' actual shape — free-text description/qty/unit-price lines
// (expenseLines) rather than a product-catalog lookup, and Vendor/Department/
// Category/Handler fields instead of Purchase's. `type` is 'expensePO' or
// 'expenseInvoice' — the invoice variant additionally shows the payment
// method used (expensesBank); the PO variant doesn't, since nothing's been
// paid yet at PO time.
export async function exportExpenseDocumentToPDF({
  type = 'expensePO',
  title = 'PURCHASE ORDER',
  companyRecord = {},
  fields = {},
  entries = [],
  expenseDate = '',
  curApproval = null,
  getDate = (value) => value || '',
  server = null,
  fetchServer = null
}) {
  let centralCompany = null;
  try {
    if (fetchServer && server) {
      const cpResp = await fetchServer('POST', {}, 'getCompanyProfile', server);
      if (cpResp && !cpResp.err && cpResp.record) centralCompany = cpResp.record;
    }
  } catch (e) { /* ignore */ }

  const logoUrl = centralCompany?.logoUrl || companyRecord?.logoUrl;
  const signatureUrl = centralCompany?.signatureUrl || companyRecord?.signatureUrl;

  const doc = new jsPDF({ orientation: 'portrait' });
  const marginLeft = 10;
  const marginRight = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - marginLeft - marginRight;
  const rowHeight = 8;
  let y = 12;

  const logoBase64 = await loadImageAsBase64(logoUrl);
  const signatureBase64 = await loadImageAsBase64(signatureUrl);

  const formatValue = (value) => (value === undefined || value === null ? '' : String(value));
  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return amount ? `${amount.toLocaleString()}` : '0';
  };

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', marginLeft, y, 20, 20);
    } catch (e) {
      console.warn('Failed to add logo to PDF:', e);
    }
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const titleX = logoBase64 ? marginLeft + 25 : marginLeft;
  doc.text(title, titleX, y + 6);
  y += 24;

  const documentDate = expenseDate || fields.postingDate || '';
  const vendorName = fields.expensesVendor || '';
  const department = fields.expensesDepartment || '';
  const category = fields.expenseCategory || '';
  const handler = fields.expensesHandler || '';
  const totalAmount = fields.expensesAmount || 0;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatValue(companyRecord.name || 'COMPANY NAME'), marginLeft, y);
  y += rowHeight;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (companyRecord.address) {
    doc.text(formatValue(companyRecord.address), marginLeft, y);
    y += rowHeight;
  }
  const contactLine = [companyRecord.phone || companyRecord.mobile, companyRecord.email].filter(Boolean).join(' | ');
  if (contactLine) {
    doc.text(contactLine, marginLeft, y);
    y += rowHeight;
  }

  y += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Document: ${formatValue(fields.createdAt || curApproval?.createdAt || 'N/A')}`, marginLeft, y);
  doc.text(`Date: ${formatValue(getDate(documentDate))}`, pageWidth - marginRight, y, { align: 'right' });
  y += rowHeight;
  doc.text(`Vendor/Payee: ${vendorName}`, marginLeft, y);
  doc.text(`Department: ${department}`, pageWidth - marginRight, y, { align: 'right' });
  y += rowHeight;
  doc.text(`Category: ${category}`, marginLeft, y);
  doc.text(`Handler: ${formatValue(handler)}`, pageWidth - marginRight, y, { align: 'right' });
  y += rowHeight;
  if (type === 'expenseInvoice') {
    doc.text(`Payment Method: ${formatValue(fields.expensesBank)}`, marginLeft, y);
    doc.text(`Total Amount: ${formatCurrency(totalAmount)}`, pageWidth - marginRight, y, { align: 'right' });
  } else {
    doc.text(`Total Amount: ${formatCurrency(totalAmount)}`, pageWidth - marginRight, y, { align: 'right' });
  }
  y += rowHeight;

  if (curApproval?.approved) {
    doc.text(`Approved By: ${formatValue(curApproval.approvedBy || '')}`, marginLeft, y);
    y += rowHeight;
  }

  y += 6;

  const headers = ['Description', 'Qty', 'Unit Price', 'Amount'];
  const colWidths = [96, 24, 33, 43];
  let x = marginLeft;
  doc.setFillColor(25, 118, 210);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  headers.forEach((heading, index) => {
    doc.rect(x, y, colWidths[index], rowHeight, 'F');
    doc.text(String(heading), x + 2, y + 6);
    x += colWidths[index];
    doc.setFillColor(25, 118, 210);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
  });
  y += rowHeight;

  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);

  const sanitizeText = (text, maxLength) => {
    const value = formatValue(text);
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
  };

  let lineTotalSum = 0;
  const visibleEntries = Array.isArray(entries) ? entries.filter((entry) => entry && (entry.description || entry.quantity || entry.unitPrice)) : [];
  visibleEntries.forEach((entry) => {
    if (y > 270) {
      doc.addPage();
      y = 18;
    }
    x = marginLeft;
    const quantity = Number(entry.quantity) || 0;
    const unitPrice = Number(entry.unitPrice) || 0;
    const lineAmount = quantity * unitPrice;
    const rowValues = [
      sanitizeText(entry.description || '', 46),
      formatValue(quantity),
      formatCurrency(unitPrice),
      formatCurrency(lineAmount)
    ];
    rowValues.forEach((value, index) => {
      doc.rect(x, y, colWidths[index], rowHeight);
      doc.text(String(value), x + 2, y + 6);
      x += colWidths[index];
    });
    y += rowHeight;
    lineTotalSum += lineAmount;
  });

  if (!visibleEntries.length) {
    x = marginLeft;
    doc.rect(x, y, contentWidth, rowHeight);
    doc.text('No item lines available for this document.', x + 2, y + 6);
    y += rowHeight;
  }

  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total: ${formatCurrency(lineTotalSum || totalAmount)}`, marginLeft, y);

  if (type === 'expenseInvoice') {
    y += rowHeight;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('PAID', marginLeft, y);
  }

  if (curApproval?.approved && signatureBase64) {
    y += 24;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signature:', marginLeft, y);
    y += 2;
    try {
      doc.addImage(signatureBase64, 'PNG', marginLeft, y, 40, 16);
    } catch (e) {
      console.warn('Failed to add signature to PDF:', e);
    }
  }

  const fileTitle = title.replace(/\s+/g, '_').toUpperCase();
  const filename = `${fileTitle}_${formatValue(getDate(documentDate)).replace(/\s+/g, '_') || 'DOCUMENT'}.pdf`;
  doc.save(filename);
}
