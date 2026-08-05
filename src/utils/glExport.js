// Shared General Ledger export — used by both the Journals-tab GL table and
// the Chart-of-Accounts per-account drill-down, so both produce identical
// reports (same columns, same "Filters Applied" summary) rather than two
// independently-drifting exporters.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateExcel } from './exportUtils';

export const GL_EXPORT_COLUMNS = [
    { name: 'Posting Date', reference: 'postingDate' },
    { name: 'Document No', reference: 'documentNo' },
    { name: 'Reference', reference: 'reference' },
    { name: 'Description', reference: 'desc' },
    { name: 'Source', reference: 'source' },
    { name: 'Document Type', reference: 'documentType' },
    { name: 'Entry Type', reference: 'entryType' },
    { name: 'Handler Id', reference: 'handlerId' },
    { name: 'Account Code', reference: 'accountCode' },
    { name: 'Account Name', reference: 'accountName' },
    { name: 'Account Type', reference: 'accountType' },
    { name: 'Debit', reference: 'debit', numeric: true },
    { name: 'Credit', reference: 'credit', numeric: true },
    { name: 'Bal Account Code', reference: 'balAccountCode' },
    { name: 'Bal Account Type', reference: 'balAccountType' },
    { name: 'Reversed', reference: 'reversedLabel' },
];

const toExportRow = (row = {}) => ({
    ...row,
    reversedLabel: row.reversedAt ? 'Yes' : 'No',
});

export const exportGlToExcel = (rows, companyInfo, dateRange, filtersSummary = {}, reportTitle = 'General Ledger') => {
    const exportRows = (rows || []).map(toExportRow);
    generateExcel(exportRows, GL_EXPORT_COLUMNS, companyInfo, dateRange, reportTitle, filtersSummary);
};

export const exportGlToPDF = (rows, companyInfo, dateRange, filtersSummary = {}, reportTitle = 'General Ledger') => {
    const exportRows = (rows || []).map(toExportRow);
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(companyInfo?.name || '', 14, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(reportTitle, 14, 23);

    let y = 29;
    if (dateRange?.startDate && dateRange?.endDate) {
        doc.text(`Period: ${dateRange.startDate} to ${dateRange.endDate}`, 14, y);
        y += 6;
    }

    const activeFilters = Object.entries(filtersSummary || {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (activeFilters.length) {
        doc.setFont('helvetica', 'bold');
        doc.text('Filters Applied:', 14, y);
        doc.setFont('helvetica', 'normal');
        y += 6;
        activeFilters.forEach(([key, value]) => {
            doc.text(`${key}: ${value}`, 18, y);
            y += 5;
        });
        y += 3;
    }

    autoTable(doc, {
        head: [GL_EXPORT_COLUMNS.map((col) => col.name)],
        body: exportRows.map((row) => GL_EXPORT_COLUMNS.map((col) => {
            const value = row[col.reference];
            if (col.numeric) return value ? Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '';
            return value === null || value === undefined ? '' : String(value);
        })),
        startY: y + 2,
        margin: { top: y + 2 },
        styles: { fontSize: 7 },
        headStyles: { fillColor: [41, 128, 185] },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }
    doc.setPage(1);
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);

    doc.save(`${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
};
