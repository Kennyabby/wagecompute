import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateExcel } from './exportUtils';

// The reconciliation report needs 9 fixed columns (Product Id, Product Name,
// Opening Stock, Sold Qty, Damaged Qty, Transfer Out, Transfer In, Purchased
// Qty, Closing Stock) — too wide for exportUtils.js's fixed 40mm-per-column
// drawTable, so PDF export uses jspdf-autotable's auto-sizing instead
// (already a project dependency, used the same way in Payees.js).

const RECONCILIATION_COLUMNS = [
    { name: 'Product Id', reference: 'productId' },
    { name: 'Product Name', reference: 'name' },
    { name: 'Opening Stock', reference: 'openingQty', numeric: true },
    { name: 'Sold Qty', reference: 'soldQtyAbs', numeric: true },
    { name: 'Damaged Qty', reference: 'damagedQtyAbs', numeric: true },
    { name: 'Transfer Out', reference: 'transferOutQtyAbs', numeric: true },
    { name: 'Transfer In', reference: 'transferInQty', numeric: true },
    { name: 'Purchased Qty', reference: 'purchasedQty', numeric: true },
    { name: 'Closing Stock', reference: 'systemClosingQty', numeric: true },
];

const toReportRow = (line = {}) => ({
    productId: line.productId,
    name: line.name,
    openingQty: Number(line.openingQty || 0),
    soldQtyAbs: Math.abs(Number(line.soldQty || 0)),
    damagedQtyAbs: Math.abs(Number(line.damagedQty || 0)),
    transferOutQtyAbs: Math.abs(Number(line.transferOutQty || 0)),
    transferInQty: Number(line.transferInQty || 0),
    purchasedQty: Number(line.purchasedQty || 0),
    systemClosingQty: Number(line.systemClosingQty || 0),
});

export const exportReconciliationExcel = ({ companyInfo, postingDate, location, lines = [] }) => {
    const rows = lines.map(toReportRow);
    generateExcel(
        rows,
        RECONCILIATION_COLUMNS,
        companyInfo,
        { startDate: postingDate, endDate: postingDate },
        `Inventory Reconciliation - ${location}`,
        { location }
    );
};

export const exportReconciliationPDF = ({ companyInfo, postingDate, location, lines = [] }) => {
    const rows = lines.map(toReportRow);
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(companyInfo?.name || '', 14, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Inventory Reconciliation — ${location}`, 14, 23);
    doc.text(`Posting Date: ${postingDate}`, 14, 29);

    autoTable(doc, {
        head: [RECONCILIATION_COLUMNS.map((col) => col.name)],
        body: rows.map((row) => RECONCILIATION_COLUMNS.map((col) => row[col.reference])),
        startY: 36,
        margin: { top: 36 },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`Inventory_Reconciliation_${location}_${postingDate}.pdf`);
};
