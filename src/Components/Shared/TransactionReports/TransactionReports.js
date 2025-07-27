import React, { useState, useEffect, useContext } from 'react';
import { exportToExcel, exportToPDF } from './exportUtils';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaFileExcel, FaFilePdf, FaTimes } from 'react-icons/fa';
import ContextProvider from '../../../Resources/ContextProvider';
import './TransactionReports.css';

const TransactionReports = ({ 
    type = 'sales', // 'sales' or 'delivery'
    sessions = [],
    orders = [],
    tables = [],
    employees = [],
    onClose
}) => {
    const { company, server, fetchServer } = useContext(ContextProvider);
    const [inventoryTransactions, setInventoryTransactions] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate: new Date(),
        sessionId: '',
        employeeId: '',
        status: '',
        tableId: ''
    });

    // Fetch inventory transactions
    useEffect(() => {
        const fetchInventoryTransactions = async () => {
            setLoading(true);
            try {
                const response = await fetchServer("POST", {
                    database: company,
                    collection: "InventoryTransactions",
                    filter: type === 'delivery' ? { documentType: { $in: ['Shipment', 'Return'] } } : {}
                }, "getDocsDetails", server);
                
                if (!response.err) {
                    setInventoryTransactions(response.record || []);
                }
            } catch (error) {
                console.error("Error fetching inventory transactions:", error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchInventoryTransactions();
    }, [company, server, type, fetchServer]);

    // Apply filters
    useEffect(() => {
        let result = [...orders];
        
        // Apply date range filter
        result = result.filter(order => {
            const orderDate = new Date(order.createdAt).getTime();
            return orderDate >= filters.startDate.getTime() && 
                   orderDate <= (filters.endDate.getTime() + 24 * 60 * 60 * 1000); // Include full end day
        });

        // Apply session filter
        if (filters.sessionId) {
            result = result.filter(order => order.sessionId === filters.sessionId);
        }

        // Apply employee filter
        if (filters.employeeId) {
            result = result.filter(order => order.handlerId === filters.employeeId);
        }

        // Apply status filter
        if (filters.status) {
            result = result.filter(order => order.status === filters.status);
        }

        // Apply table filter (only for sales)
        if (filters.tableId && type === 'sales') {
            result = result.filter(order => order.tableId === filters.tableId);
        }

        setFilteredData(result);
    }, [filters, orders, type]);

    const handleExport = (format) => {
        const data = {
            sessions: sessions.filter(session => {
                return filteredData.some(order => order.sessionId === session.i_d);
            }),
            orders: filteredData,
            inventoryTransactions: inventoryTransactions.filter(t => 
                filteredData.some(o => o.orderNumber === t.orderNumber)
            )
        };

        if (format === 'excel') {
            exportToExcel(data, `${type}_report_${new Date().toISOString().split('T')[0]}`);
        } else {
            exportToPDF(data, `${type}_report_${new Date().toISOString().split('T')[0]}`, type);
        }
    };

    const getEmployeeName = (employeeId) => {
        const employee = employees.find(e => e.i_d === employeeId);
        return employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employeeId : employeeId;
    };

    const getTableName = (tableId) => {
        if (!tableId) return 'N/A';
        const table = tables.find(t => t._id === tableId);
        return table ? table.name || `Table ${tableId}` : tableId;
    };

    return (
        <div className="transaction-reports-overlay">
            <div className="transaction-reports">
                <div className="reports-header">
                    <h2>{type === 'sales' ? 'POS' : 'Delivery'} Transaction Reports</h2>
                    <button onClick={onClose} className="close-btn">
                        <FaTimes />
                    </button>
                </div>
                
                <div className="filters-section">
                    <div className="filter-group date-range-group">
                        <label>Date Range:</label>
                        <div className="date-range-picker">
                            <DatePicker
                                selected={filters.startDate}
                                onChange={(date) => setFilters(prev => ({
                                    ...prev,
                                    startDate: date
                                }))}
                                selectsStart
                                startDate={filters.startDate}
                                endDate={filters.endDate}
                                maxDate={new Date()}
                                className="date-input"
                                dateFormat="MMM d, yyyy"
                            />
                            <span className="date-range-separator">to</span>
                            <DatePicker
                                selected={filters.endDate}
                                onChange={(date) => setFilters(prev => ({
                                    ...prev,
                                    endDate: date
                                }))}
                                selectsEnd
                                startDate={filters.startDate}
                                endDate={filters.endDate}
                                minDate={filters.startDate}
                                maxDate={new Date()}
                                className="date-input"
                                dateFormat="MMM d, yyyy"
                            />
                        </div>
                    </div>
                    
                    <div className="filter-group">
                        <label>Session</label>
                        <select 
                            value={filters.sessionId} 
                            onChange={(e) => setFilters({...filters, sessionId: e.target.value})}
                        >
                            <option value="">All Sessions</option>
                            {sessions.map(session => (
                                <option key={session.i_d} value={session.i_d}>
                                    {new Date(session.start).toLocaleString()} - {getEmployeeName(session.employee_id)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Employee</label>
                        <select 
                            value={filters.employeeId} 
                            onChange={(e) => setFilters({...filters, employeeId: e.target.value})}
                        >
                            <option value="">All Employees</option>
                            {employees.map(emp => (
                                <option key={emp.i_d} value={emp.i_d}>
                                    {emp.firstName} {emp.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Status</label>
                        <select 
                            value={filters.status} 
                            onChange={(e) => setFilters({...filters, status: e.target.value})}
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {type === 'sales' && (
                        <div className="filter-group">
                            <label>Table</label>
                            <select 
                                value={filters.tableId} 
                                onChange={(e) => setFilters({...filters, tableId: e.target.value})}
                            >
                                <option value="">All Tables</option>
                                {tables.map(table => (
                                    <option key={table._id} value={table._id}>
                                        {table.name || `Table ${table._id}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="export-buttons">
                    <button onClick={() => handleExport('excel')} className="export-btn excel">
                        <FaFileExcel /> Export to Excel
                    </button>
                    <button onClick={() => handleExport('pdf')} className="export-btn pdf">
                        <FaFilePdf /> Export to PDF
                    </button>
                </div>

                <div className="results-summary">
                    <div className="summary-item">
                        <span className="summary-label">Total Orders:</span>
                        <span className="summary-value">{filteredData.length}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Total Amount:</span>
                        <span className="summary-value">
                            ${filteredData.reduce((sum, order) => sum + (order.totalSales || 0), 0).toFixed(2)}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="loading">Loading data...</div>
                ) : (
                    <div className="results-grid">
                        <table>
                            <thead>
                                <tr>
                                    <th>Order #</th>
                                    <th>Date</th>
                                    <th>Employee</th>
                                    <th>Status</th>
                                    <th>Total</th>
                                    {type === 'sales' && <th>Table</th>}
                                    <th>Session</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length > 0 ? (
                                    filteredData.map(order => {
                                        const session = sessions.find(s => s.i_d === order.sessionId);
                                        return (
                                            <tr key={order._id} className={`status-${order.status}`}>
                                                <td>{order.orderNumber}</td>
                                                <td>{new Date(order.createdAt).toLocaleString()}</td>
                                                <td>{getEmployeeName(order.handlerId)}</td>
                                                <td>
                                                    <span className={`status-badge ${order.status}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td>${(order.totalSales || 0).toFixed(2)}</td>
                                                {type === 'sales' && <td>{getTableName(order.tableId)}</td>}
                                                <td>
                                                    {session ? (
                                                        <>
                                                            {new Date(session.start).toLocaleDateString()}
                                                            {session.employee_id ? ` (${getEmployeeName(session.employee_id).split(' ')[0]})` : ''}
                                                        </>
                                                    ) : 'N/A'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={type === 'sales' ? 7 : 6} className="no-results">
                                            No orders found matching the selected filters
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransactionReports;
