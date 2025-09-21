import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// Simple table drawing function
const drawTable = (doc, headers, data, startY) => {
    const margin = 15;
    const rowHeight = 7;
    let currentY = startY;
    
    // Draw headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    headers.forEach((header, i) => {
        doc.text(header, margin + (i * 40), currentY);
    });
    
    currentY += rowHeight * 1.5;
    
    // Draw data rows
    doc.setFont('helvetica', 'normal');
    data.forEach(row => {
        headers.forEach((header, i) => {
            const value = row[i] !== undefined ? String(row[i]) : '';
            doc.text(value, margin + (i * 40), currentY);
        });
        currentY += rowHeight;
        
        // Add new page if needed
        if (currentY > doc.internal.pageSize.height - 20) {
            doc.addPage();
            currentY = 20;
        }
    });
    
    return currentY;
};

// Helper function to format currency values
const formatCurrency = (value) => {
    if (value === undefined || value === null) return '0.00';
    return parseFloat(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export const generatePDF = (data, columns, companyInfo, dateRange, reportTitle, filters = {}) => {
    try {
        // Create a new PDF document
        const doc = new jsPDF({
            orientation: 'landscape'
        });
        
        // Add company info
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(companyInfo.name, 14, 15);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        // Add company details
        doc.text(companyInfo.address || '', 14, 22);
        doc.text(`Phone: ${companyInfo.phone || ''}`, 14, 29);
        doc.text(`Email: ${companyInfo.email || ''}`, 14, 36);
        
        // Add report title and date range
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(reportTitle, 14, 50);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (dateRange && dateRange.startDate && dateRange.endDate) {
            doc.text(`Period: ${dateRange.startDate} to ${dateRange.endDate}`, 14, 58);
        } else if (dateRange) {
            doc.text(`Date Range: ${dateRange}`, 14, 58);
        }
        
        // Add filter information if any
        let startY = 65;
        if (filters && Object.keys(filters).length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Filters Applied:', 14, startY);
            doc.setFont('helvetica', 'normal');
            startY += 7;
            
            // Add each filter
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    doc.text(`${key}: ${value}`, 20, startY);
                    startY += 7;
                }
            });
            startY += 10; // Add some space after filters
        }
        
        // Prepare headers and data
        const headers = columns.map(col => col.name);
        const tableData = data.map(item => 
            columns.map(col => {
                const value = item[col.reference];
                if (col.numeric) {
                    return value !== undefined && value !== null ? parseFloat(value) : 0;
                }
                return value !== undefined && value !== null ? String(value) : '';
            })
        );
        
        // Draw the table
        drawTable(doc, headers, tableData, startY);
        
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
            doc.internal.pageSize.height - 20
        );
        
        // Save the PDF
        doc.save(`${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};

export const generateExcel = (data, columns, companyInfo, dateRange, reportTitle, filters = {}, grouped = false) => {
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
        
        // Add totals row if there's data
        if (data.length > 0) {
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
        
        // Auto-size columns
        const columnWidths = [];
        wsData.forEach(row => {
            row.forEach((cell, colIndex) => {
                const cellValue = cell !== null && cell !== undefined ? String(cell) : '';
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
