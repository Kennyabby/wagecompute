import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Helper function to format currency
const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Helper function to format date
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
};

export const exportToExcel = (data, filename) => {
    try {
        // Create a new workbook
        const wb = XLSX.utils.book_new();
        
        // 1. Sessions Sheet
        if (data.sessions && data.sessions.length > 0) {
            const sessionsData = data.sessions.map(session => ({
                'Session ID': session.i_d,
                'Start Time': formatDate(session.start),
                'End Time': session.end ? formatDate(session.end) : 'Active',
                'Employee': session.employee_id,
                'Status': session.active ? 'Active' : 'Ended',
                'Opening Cash': formatCurrency(session.openingCash),
                'Closing Cash': formatCurrency(session.closingCash),
                'Total Sales': formatCurrency(session.totalSales),
                'Total Cash': formatCurrency(session.totalCash),
                'Total Card': formatCurrency(session.totalCard),
                'Total Transfers': formatCurrency(session.totalTransfers),
                'Shortage': formatCurrency(session.shortage)
            }));
            
            const wsSessions = XLSX.utils.json_to_sheet(sessionsData);
            XLSX.utils.book_append_sheet(wb, wsSessions, 'Sessions');
        }

        // 2. Orders Sheet
        if (data.orders && data.orders.length > 0) {
            const ordersData = data.orders.map(order => ({
                'Order #': order.orderNumber,
                'Date': formatDate(order.createdAt),
                'Status': order.status,
                'Total': formatCurrency(order.totalSales),
                'Payment Method': order.paymentMethod || 'N/A',
                'Table': order.tableId || 'N/A',
                'Employee': order.handlerId,
                'Session ID': order.sessionId,
                'Items Count': order.items ? order.items.length : 0,
                'Delivery Status': order.delivery || 'N/A',
                'Notes': order.notes || ''
            }));
            
            const wsOrders = XLSX.utils.json_to_sheet(ordersData);
            XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');
        }

        // 3. Inventory Transactions Sheet
        if (data.inventoryTransactions && data.inventoryTransactions.length > 0) {
            const inventoryData = data.inventoryTransactions.map(trans => ({
                'Product': trans.name,
                'SKU': trans.productId || 'N/A',
                'Quantity': trans.quantity,
                'Unit Price': formatCurrency(trans.salesPrice),
                'Total': formatCurrency(trans.totalSales),
                'Type': trans.documentType || 'N/A',
                'Date': formatDate(trans.createdAt),
                'Order #': trans.orderNumber || 'N/A',
                'Location': trans.location || 'N/A',
                'Handler': trans.handlerId || 'N/A'
            }));
            
            const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
            XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventory');
        }

        // 4. Order Items Sheet (if available)
        if (data.orders && data.orders.some(order => order.items && order.items.length > 0)) {
            const orderItemsData = [];
            data.orders.forEach(order => {
                if (order.items && order.items.length > 0) {
                    order.items.forEach(item => {
                        orderItemsData.push({
                            'Order #': order.orderNumber,
                            'Product': item.name,
                            'Quantity': item.quantity,
                            'Unit Price': formatCurrency(item.salesPrice),
                            'Total': formatCurrency(item.totalSales || item.quantity * (item.salesPrice || 0)),
                            'Category': item.category || 'N/A',
                            'Notes': item.notes || ''
                        });
                    });
                }
            });
            
            if (orderItemsData.length > 0) {
                const wsOrderItems = XLSX.utils.json_to_sheet(orderItemsData);
                XLSX.utils.book_append_sheet(wb, wsOrderItems, 'Order Items');
            }
        }

        // Save the file
        XLSX.writeFile(wb, `${filename}.xlsx`);
        return true;
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        return false;
    }
};

export const exportToPDF = (data, filename, type = 'sales') => {
    try {
        // Create a new PDF document
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Add title and metadata
        const title = `${type === 'sales' ? 'POS' : 'Delivery'} Transaction Report`;
        const date = new Date().toLocaleString();
        
        // Set font for title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        
        // Add title
        doc.text(title, 14, 20);
        
        // Add date and page number
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${date}`, 14, 28);
        
        // Add summary information
        doc.setFontSize(12);
        doc.setTextColor(0);
        let yPos = 40;
        
        // Add summary section
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, yPos);
        yPos += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Orders: ${data.orders?.length || 0}`, 14, yPos);
        yPos += 6;
        
        const totalSales = data.orders?.reduce((sum, order) => sum + (order.totalSales || 0), 0) || 0;
        doc.text(`Total Sales: ${formatCurrency(totalSales)}`, 14, yPos);
        yPos += 10;
        
        // Add sessions table if available
        if (data.sessions?.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Sessions', 14, yPos);
            yPos += 8;
            
            const sessionsData = data.sessions.map(session => [
                session.i_d.toString().substring(0, 8) + '...',
                new Date(session.start).toLocaleDateString(),
                session.employee_id?.split('@')[0] || 'N/A',
                session.active ? 'Active' : 'Ended',
                formatCurrency(session.totalSales || 0)
            ]);
            
            doc.autoTable({
                head: [['ID', 'Date', 'Employee', 'Status', 'Total Sales']],
                body: sessionsData,
                startY: yPos,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
                margin: { left: 14 }
            });
            
            yPos = doc.lastAutoTable.finalY + 10;
        }
        
        // Add orders table
        if (data.orders?.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Orders', 14, yPos);
            yPos += 8;
            
            const ordersData = data.orders.map(order => [
                `#${order.orderNumber}`,
                new Date(order.createdAt).toLocaleDateString(),
                order.handlerId?.split('@')[0] || 'N/A',
                order.status,
                formatCurrency(order.totalSales || 0)
            ]);
            
            doc.autoTable({
                head: [['Order #', 'Date', 'Employee', 'Status', 'Total']],
                body: ordersData,
                startY: yPos,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
                margin: { left: 14 },
                pageBreak: 'auto',
                didDrawPage: function(data) {
                    yPos = data.cursor.y + 10;
                }
            });
            
            yPos = doc.lastAutoTable.finalY + 10;
        }
        
        // Add page numbers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(
                `Page ${i} of ${pageCount}`,
                doc.internal.pageSize.getWidth() - 20,
                doc.internal.pageSize.getHeight() - 10
            );
        }
        
        // Save the PDF
        doc.save(`${filename}.pdf`);
        return true;
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        return false;
    }
};
