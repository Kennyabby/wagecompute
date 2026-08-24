import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateExcel } from './exportUtils';

// Every column the on-screen reconciliation table shows (ReconciliationReview.js's
// <table className='reconcile-review-table'>), in the same order, so the
// export is never missing a column the user can already see on screen.
// Product Id is kept as an extra reference column even though the on-screen
// table only shows the product name — a spreadsheet export benefits from a
// stable identifier, and having it doesn't remove anything the table shows.
const RECONCILIATION_COLUMNS = [
    { name: 'Product Id', reference: 'productId' },
    { name: 'Product', reference: 'name' },
    { name: 'Opening', reference: 'openingQty', numeric: true },
    { name: 'Purchased', reference: 'purchasedQty', numeric: true },
    { name: 'Sold', reference: 'soldQtyAbs', numeric: true },
    { name: 'Transfer In', reference: 'transferInQty', numeric: true },
    { name: 'Transfer Out', reference: 'transferOutQtyAbs', numeric: true },
    { name: 'Damaged', reference: 'damagedQtyAbs', numeric: true },
    { name: 'Adjustment', reference: 'adjustmentQty', numeric: true },
    { name: 'Production', reference: 'productionQty', numeric: true },
    { name: 'System Closing', reference: 'systemClosingQty', numeric: true },
    { name: 'Counted', reference: 'countedQuantity', numeric: true },
    { name: 'Difference', reference: 'qtyDifference', numeric: true },
    { name: 'Sales Value Diff', reference: 'salesDifference', numeric: true },
];

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

// Mirrors ReconciliationReview.js's table row rendering exactly (same
// fallbacks/abs/rounding per column) so the export always matches what's on
// screen.
const toReportRow = (line = {}) => ({
    productId: line.productId,
    name: line.name,
    openingQty: Number(line.openingQty || 0),
    purchasedQty: Number(line.purchasedQty || 0),
    soldQtyAbs: Math.abs(Number(line.soldQty || 0)),
    transferInQty: Number(line.transferInQty || 0),
    transferOutQtyAbs: Math.abs(Number(line.transferOutQty || 0)),
    damagedQtyAbs: Math.abs(Number(line.damagedQty || 0)),
    adjustmentQty: line.adjustmentQty ?? round2((line.positiveAdjustmentQty || 0) + (line.negativeAdjustmentQty || 0)),
    productionQty: line.productionQty ?? 0,
    systemClosingQty: Number(line.systemClosingQty || 0),
    countedQuantity: line.countedQuantity ?? '-',
    qtyDifference: Number(line.qtyDifference || 0),
    salesDifference: round2(line.salesDifference),
});

// A TOTAL row (column-wise sum of every numeric field) — matches the same
// top/bottom TOTAL rows the on-screen table now shows around its product
// lines, so the export's rows are a full match, not just the product lines.
const toTotalsRow = (rows = []) => rows.reduce((acc, row) => {
    RECONCILIATION_COLUMNS.forEach((col) => {
        if (!col.numeric) return;
        acc[col.reference] = round2((acc[col.reference] || 0) + (Number(row[col.reference]) || 0));
    });
    return acc;
}, { productId: '', name: 'TOTAL' });

export const exportReconciliationExcel = ({ companyInfo, postingDate, location, lines = [] }) => {
    const rows = lines.map(toReportRow);
    const totalsRow = toTotalsRow(rows);
    generateExcel(
        [totalsRow, ...rows, totalsRow],
        RECONCILIATION_COLUMNS,
        companyInfo,
        { startDate: postingDate, endDate: postingDate },
        `Inventory Reconciliation - ${location}`,
        { location }
    );
};

export const exportReconciliationPDF = ({ companyInfo, postingDate, location, lines = [] }) => {
    const rows = lines.map(toReportRow);
    const totalsRow = toTotalsRow(rows);
    const allRows = [totalsRow, ...rows, totalsRow];
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
        body: allRows.map((row) => RECONCILIATION_COLUMNS.map((col) => row[col.reference])),
        startY: 36,
        margin: { top: 36 },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        // Bold the first and last row (the TOTAL rows) to match the
        // on-screen table's top/bottom totals rows visually standing apart
        // from the product lines between them.
        didParseCell: (data) => {
            if (data.row.index === 0 || data.row.index === allRows.length - 1) {
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });

    doc.save(`Inventory_Reconciliation_${location}_${postingDate}.pdf`);
};
