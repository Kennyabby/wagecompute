import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { loadPdfImage, fitImageBox } from './pdfLogo';

// Column widths in millimetres, at a given font size, for a table that must
// never let one column's text run into the next.
//
// Each column gets the width of its longest line, up to a cap, and never less
// than its longest single word, so text wraps between words and not through
// the middle of a number. Text that is longer than the cap wraps onto more
// lines inside its own cell.
const MAX_COLUMN_MM = 62;
const MIN_COLUMN_MM = 14;
const CELL_PADDING_MM = 1.6;
const measureColumns = (doc, headers, rows, fontSize) => {
    doc.setFontSize(fontSize);
    // A very long table is sampled: the widest value is nearly always found
    // early, and measuring every cell of 5,000 rows would freeze the page.
    const sample = rows.length > 600 ? [...rows.slice(0, 500), ...rows.slice(-100)] : rows;
    return headers.map((header, index) => {
        let widest = 0;
        let longestWord = 0;
        const take = (text, bold) => {
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            String(text).split('\n').forEach((line) => { widest = Math.max(widest, doc.getTextWidth(line)); });
            String(text).split(/\s+/).forEach((word) => { longestWord = Math.max(longestWord, doc.getTextWidth(word)); });
        };
        take(header, true);
        sample.forEach((row) => take(row[index] ?? '', false));
        const padding = CELL_PADDING_MM * 2 + 0.6;
        const least = Math.min(Math.max(longestWord + padding, MIN_COLUMN_MM), MAX_COLUMN_MM);
        return { least, wanted: Math.min(Math.max(widest + padding, least), MAX_COLUMN_MM) };
    });
};

/**
 * Draws a table that keeps every column apart and shows every column.
 *
 * Headings and values wrap inside their own cells, and a row grows as tall as
 * its longest cell. When the columns fit the page they share its width. When
 * there are too many, the type is made smaller first, and if they still do
 * not fit, the table carries on across further pages with the first column
 * repeated on each, so a line can always be read against its name.
 * `numeric` says which columns are right-aligned. `totalsRow` prints the last
 * row in bold.
 */
const drawTable = (doc, headers, data, startY, { numeric = [], totalsRow = false } = {}) => {
    const margin = 10;
    const available = doc.internal.pageSize.width - margin * 2;
    const total = (widths, key) => widths.reduce((sum, width) => sum + width[key], 0);

    // The largest type at which every column still has room for its longest word.
    let fontSize = 9;
    let widths = measureColumns(doc, headers, data, fontSize);
    while (total(widths, 'least') > available && fontSize > 7) {
        fontSize -= 1;
        widths = measureColumns(doc, headers, data, fontSize);
    }
    const fits = total(widths, 'least') <= available;

    let columnWidths;
    if (fits) {
        // Room left over after every column has its least goes to the columns
        // that want more, in proportion, so short columns stay narrow.
        const spare = available - total(widths, 'least');
        const wantedMore = widths.reduce((sum, width) => sum + (width.wanted - width.least), 0);
        const share = wantedMore > 0 ? Math.min(spare / wantedMore, 1) : 0;
        columnWidths = widths.map((width) => width.least + (width.wanted - width.least) * share);
        // Anything still spare is spread evenly, so the table fills the page.
        const left = available - columnWidths.reduce((sum, width) => sum + width, 0);
        columnWidths = columnWidths.map((width) => width + left / columnWidths.length);
    } else {
        // Too many columns for one page width. Each keeps a readable width and
        // the table continues on following pages.
        columnWidths = widths.map((width) => Math.min(width.wanted, 46));
    }

    autoTable(doc, {
        head: [headers.map((header) => String(header ?? ''))],
        body: data.map((row) => headers.map((header, index) => (row[index] === undefined || row[index] === null ? '' : String(row[index])))),
        startY,
        // The foot of each page is kept clear for the page number and the
        // "generated on" line.
        margin: { left: margin, right: margin, top: 14, bottom: 16 },
        tableWidth: fits ? available : 'wrap',
        horizontalPageBreak: !fits,
        horizontalPageBreakRepeat: 0,
        rowPageBreak: 'avoid',
        theme: 'grid',
        styles: { font: 'helvetica', fontSize, cellPadding: CELL_PADDING_MM, overflow: 'linebreak', valign: 'middle', lineColor: [205, 210, 216], lineWidth: 0.1, textColor: [25, 30, 36] },
        headStyles: { fillColor: [236, 239, 243], textColor: [25, 30, 36], fontStyle: 'bold', valign: 'bottom' },
        columnStyles: Object.fromEntries(columnWidths.map((width, index) => [index, { cellWidth: width, halign: numeric[index] ? 'right' : 'left' }])),
        didParseCell: (cell) => {
            if (cell.section === 'head' && numeric[cell.column.index]) cell.cell.styles.halign = 'right';
            if (totalsRow && cell.section === 'body' && cell.row.index === data.length - 1) {
                cell.cell.styles.fontStyle = 'bold';
                cell.cell.styles.fillColor = [244, 246, 248];
            }
        },
    });
    return doc.lastAutoTable ? doc.lastAutoTable.finalY : startY;
};

// Helper function to format currency values
const formatCurrency = (value) => {
    if (value === undefined || value === null) return '0.00';
    return parseFloat(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// `options.totalsRow` says the last row of `data` is a totals line, printed in
// bold. A column may carry `pdfText`, a function that turns its value into
// the text to print, for a caller that wants its own number formatting.
export const generatePDF = async (data, columns, companyInfo, dateRange, reportTitle, filters = {}, options = {}) => {
    try {
        // Create a new PDF document
        const doc = new jsPDF({
            orientation: 'landscape'
        });

        // Logo, only if the tenant actually uploaded one via companyInfo.logoUrl
        // (never a platform default; this is the tenant's own document).
        const logo = await loadPdfImage(companyInfo.logoUrl);
        const textX = 14 + (logo ? 20 : 0);
        if (logo) {
            try {
                const { w, h } = fitImageBox(logo, 16, 16);
                doc.addImage(logo.dataUrl, logo.format, 14, 10, w, h);
            } catch (e) { /* ignore */ }
        }

        // Add company info
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(companyInfo.name || '', textX, 15);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        // Add company details
        doc.text(companyInfo.address || '', textX, 22);
        doc.text(`Phone: ${companyInfo.phone || ''}`, textX, 29);
        doc.text(`Email: ${companyInfo.email || ''}`, textX, 36);
        
        // Add report title and date range
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        // A long title wraps instead of running off the page.
        const pageWidth = doc.internal.pageSize.width;
        const titleLines = doc.splitTextToSize(String(reportTitle || ''), pageWidth - 28);
        doc.text(titleLines, 14, 50);
        const pushed = (titleLines.length - 1) * 7;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (dateRange && dateRange.startDate && dateRange.endDate) {
            doc.text(`Period: ${dateRange.startDate} to ${dateRange.endDate}`, 14, 58 + pushed);
        } else if (dateRange) {
            doc.text(`Date Range: ${dateRange}`, 14, 58 + pushed);
        }
        
        // Add filter information if any
        let startY = 65 + pushed;
        if (filters && Object.keys(filters).length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Filters Applied:', 14, startY);
            doc.setFont('helvetica', 'normal');
            startY += 7;
            
            // Add each filter
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    // A filter with many values ticked wraps onto more lines.
                    const lines = doc.splitTextToSize(`${key}: ${value}`, pageWidth - 34);
                    doc.text(lines, 20, startY);
                    startY += 5 * lines.length + 2;
                }
            });
            startY += 3; // Add some space after filters
        }
        
        // Prepare headers and data
        const headers = columns.map(col => col.name);
        // Figures are printed with thousands separators. A column where any
        // value has decimals shows two of them on every line, so the
        // figures line up; a column of whole numbers shows none.
        const decimals = columns.map((col) => (col.numeric && data.some((item) => { const number = parseFloat(item[col.reference]); return Number.isFinite(number) && !Number.isInteger(number); }) ? 2 : 0));
        const tableData = data.map(item => 
            columns.map((col, colIndex) => {
                const value = item[col.reference];
                if (col.pdfText) return col.pdfText(value, item);
                if (col.numeric) {
                    // A blank in a figure column (a totals line that skips it) stays blank.
                    if (value === '' || value === undefined || value === null) return '';
                    const number = parseFloat(value);
                    if (!Number.isFinite(number)) return String(value);
                    return number.toLocaleString('en-US', { minimumFractionDigits: decimals[colIndex], maximumFractionDigits: decimals[colIndex] });
                }
                return value !== undefined && value !== null ? String(value) : '';
            })
        );
        
        // Draw the table
        drawTable(doc, headers, tableData, startY, { numeric: columns.map((col) => !!col.numeric), totalsRow: !!options.totalsRow });
        
        // Add page numbers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(
                `Page ${i} of ${pageCount}`,
                doc.internal.pageSize.width - 30,
                doc.internal.pageSize.height - 10
            );
        }
        
        // Add generated timestamp on the first page
        doc.setPage(1);
        doc.setFontSize(8);
        doc.text(
            `Generated on: ${new Date().toLocaleString()}`,
            14,
            // On the same line as the page number, so the table can use the room above.
            doc.internal.pageSize.height - 10
        );
        
        // Save the PDF
        doc.save(`${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};

// `options.skipAutoTotals` is for a caller whose data already ends with its
// own totals line. (The same switch inside `filters` still works, but there
// it is also printed as if it were a filter.) A column may carry
// `excelFormat`, the number format its figures are shown in.
export const generateExcel = (data, columns, companyInfo, dateRange, reportTitle, filters = {}, grouped = false, options = {}) => {
    try {
        // Create a new workbook
        const wb = XLSX.utils.book_new();
        
        // Prepare worksheet data
        const wsData = [];
        
        // Add company info
        wsData.push([companyInfo.name]);
        wsData.push([companyInfo.address || '']);
        wsData.push([`Phone: ${companyInfo.phone || ''}`]);
        wsData.push([`Email: ${companyInfo.email || ''}`]);
        wsData.push([]); // Empty row
        
        // Add report title and date range
        wsData.push([reportTitle]);
        if (dateRange && dateRange.startDate && dateRange.endDate) {
            wsData.push([`Period: ${dateRange.startDate} to ${dateRange.endDate}`]);
        } else if (dateRange) {
            wsData.push([`Date Range: ${dateRange}`]);
        }
        wsData.push([]); // Empty row
        
        // Add filter information if any
        if (filters && Object.keys(filters).length > 0) {
            wsData.push(['Filters Applied:']);
            
            // Add warehouse filter if present
            if (filters.warehouse) {
                wsData.push([`Warehouse: ${filters.warehouse}`]);
            }
            
            // Add category filter if present
            if (filters.category) {
                wsData.push([`Category: ${filters.category}`]);
            }
            
            // Add any additional filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '' && 
                    key !== 'warehouse' && key !== 'category') {
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    wsData.push([`${label}: ${value}`]);
                }
            });
            
            wsData.push([]); // Empty row after filters
        }
        
        // Add headers
        const headers = columns.map(col => col.name);
        wsData.push(headers);
        
        // Add data rows
        if (grouped) {
            // data is [{ receiptNum, group }]
            data.forEach(({ receiptNum, group }) => {
                group.forEach(item => {
                    const row = columns.map(col => {
                        const value = item[col.reference];
                        if (col.numeric) {
                            return value !== undefined && value !== null ? parseFloat(value) : 0;
                        }
                        return value !== undefined && value !== null ? String(value) : '';
                    });
                    wsData.push(row);
                });
                // Subtotal row for this group
                const subtotalRow = columns.map((col, colIndex) => {
                    if (!col.numeric) {
                        return colIndex === 0 ? `Subtotal for Receipt #${receiptNum}` : '';
                    }
                    // Calculate sum for numeric columns in group
                    return group.reduce((sum, item) => {
                        const value = parseFloat(item[col.reference] || 0);
                        return sum + (isNaN(value) ? 0 : value);
                    }, 0);
                });
                wsData.push(subtotalRow);
                wsData.push([]); // Empty row after each group
            });
        } else {
            data.forEach(item => {
                const row = columns.map(col => {
                    const value = item[col.reference];
                    if (col.numeric) {
                        return value !== undefined && value !== null ? parseFloat(value) : 0;
                    }
                    return value !== undefined && value !== null ? String(value) : '';
                });
                wsData.push(row);
            });
        }
        
        // Add totals row if there's data. Some reports already provide
        // server-computed totals, so callers can opt out to avoid mismatches.
        if (data.length > 0 && !filters?.skipAutoTotals && !options.skipAutoTotals) {
            const totalsRow = columns.map((col, colIndex) => {
                if (!col.numeric || col.id === 'i_d' || col.id === 'name' || col.id === 'code' || col.id === 'category') {
                    return colIndex === 0 ? 'TOTAL' : '';
                }
                let total = 0;
                if (grouped) {
                    // data is [{ receiptNum, group }]
                    total = data.reduce((sum, g) => sum + g.group.reduce((s, item) => {
                        const value = parseFloat(item[col.reference] || 0);
                        return s + (isNaN(value) ? 0 : value);
                    }, 0), 0);
                } else {
                    total = data.reduce((sum, item) => {
                        const value = parseFloat(item[col.reference] || 0);
                        return sum + (isNaN(value) ? 0 : value);
                    }, 0);
                }
                return total;
            });
            wsData.push([]); // Empty row before totals
            wsData.push(totalsRow);
        }
        
        // Add generated timestamp
        wsData.push([]); // Empty row
        wsData.push([`Generated on: ${new Date().toLocaleString()}`]);
        
        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Calculate header row index (after company info, title, date range, and filters)
        const headerRowIndex = wsData.findIndex(row => row.length > 0 && row[0] && headers.includes(row[0]));
        
        // Figures are shown with thousands separators. They stay numbers, so
        // they can still be added up and sorted in the spreadsheet. A column
        // where any value has decimals shows two on every line.
        const numberFormats = columns.map((col, colIndex) => {
            if (!col.numeric) return null;
            if (col.excelFormat) return col.excelFormat;
            const fractional = wsData.slice(headerRowIndex + 1).some((row) => typeof row[colIndex] === 'number' && !Number.isInteger(row[colIndex]));
            return fractional ? '#,##0.00' : '#,##0';
        });
        if (headerRowIndex >= 0) {
            for (let r = headerRowIndex + 1; r < wsData.length; r++) {
                numberFormats.forEach((format, c) => {
                    const cell = format ? ws[XLSX.utils.encode_cell({ r, c })] : null;
                    if (cell && cell.t === 'n') cell.z = format;
                });
            }
        }

        // Auto-size columns
        const columnWidths = [];
        wsData.forEach(row => {
            row.forEach((cell, colIndex) => {
                // A figure is as wide as it will be shown, separators and decimals included.
                const shownFigure = typeof cell === 'number' && numberFormats[colIndex] ? cell.toLocaleString('en-US', { minimumFractionDigits: numberFormats[colIndex].includes('.') ? 2 : 0, maximumFractionDigits: 2 }) : null;
                const cellValue = shownFigure !== null ? shownFigure : (cell !== null && cell !== undefined ? String(cell) : '');
                const cellWidth = cellValue.length * 1.2; // Adjust multiplier as needed
                columnWidths[colIndex] = Math.max(columnWidths[colIndex] || 0, Math.min(cellWidth, 50)); // Cap at 50
            });
        });
        
        ws['!cols'] = columnWidths.map(width => ({ width: width + 2 })); // Add some padding
        
        // Style the header row
        if (headerRowIndex >= 0) {
            if (!ws['!rows']) ws['!rows'] = [];
            
            // Set header row style
            if (!ws['!rows'][headerRowIndex]) ws['!rows'][headerRowIndex] = {};
            ws['!rows'][headerRowIndex].s = {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: '2980b9' } },
                alignment: { wrapText: true, vertical: 'center' }
            };
            
            // Set cell styles for header row
            for (let i = 0; i < headers.length; i++) {
                const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: i });
                if (!ws[cellRef]) continue;
                ws[cellRef].s = {
                    font: { bold: true, color: { rgb: 'FFFFFF' } },
                    fill: { fgColor: { rgb: '2980b9' } },
                    alignment: { wrapText: true, vertical: 'center' }
                };
            }
            
            // Add filters to the header row
            ws['!autofilter'] = {
                ref: XLSX.utils.encode_range({
                    s: { r: headerRowIndex, c: 0 },
                    e: { r: headerRowIndex, c: headers.length - 1 }
                })
            };
        }
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, reportTitle.substring(0, 31)); // Sheet name max 31 chars
        
        // Save the Excel file
        XLSX.writeFile(wb, `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
        
    } catch (error) {
        console.error('Error generating Excel:', error);
        throw error;
    }
};
