import React, { useState, useEffect, useContext, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import PaymentReceiptsModal from '../../DashView/PaymentReceiptsModal';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  FaFileExcel, FaFilePdf, FaTimes, FaFilter, 
  FaChevronDown, FaChevronUp, FaSearch, FaExpand, FaCompress,
  FaBox, FaBoxes, FaMoneyBillWave, FaMapMarkerAlt, FaCalendarAlt, FaUser, FaCircle, FaBoxOpen, FaChair
} from 'react-icons/fa';
import { format } from 'date-fns';
import ContextProvider from '../../../Resources/ContextProvider';
import { exportToExcel, exportToPDF } from './exportUtils';
import './TransactionReports.css';

const TransactionReports = ({ 
    type = 'sales', // 'sales' or 'delivery'
    sessions = [],
    orders = [],
    tables = [],
    employees = [],
    onClose,
    wrhCategories
}) => {
    const { company, server, fetchServer, user, paymentReceipts } = useContext(ContextProvider);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedSessions, setExpandedSessions] = useState({});
    const [showReceiptsModal, setShowReceiptsModal] = useState(false)
    const payPointAccounts = {
        'moniepoint1':'MP1-8198068382', 'moniepoint2':'MP2-5399647958', 
        'moniepoint3':'MP3-5536588063', 'moniepoint4':'MP4-5342270174', 'cash':'cash'
    }
    // State for filters
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().setHours(0, 0, 0, 0)),
        endDate: new Date(new Date().setHours(23, 59, 59, 999)),
        sessionId: '',
        wrh: '',
        employee_id: '',
        table_name: '',
        orderNumber: '',
        status: '',
        delivery: '',
        category: '',
        lastDeliveredBy: ''
    });

    // Get unique filter options from the actual data
    const filterOptions = useMemo(() => {
        // Get unique locations from sessions (filter out undefined/null/empty)
        const locations = [...new Set(sessions
            .map(s => s.wrh)
            .filter(wrh => wrh && wrh.trim() !== '')
        )].sort();
        
        // Get unique categories from order items
        const categories = [...new Set(orders.flatMap(order => 
            (order.items || []).map(item => item?.category) || []
        ))].filter(Boolean).sort();
        
        // Get unique delivery persons from orders
        const deliveryPersons = [...new Set(orders
            .filter(order => order.lastDeliveredBy)
            .map(order => order.lastDeliveredBy)
        )].filter(Boolean).sort();
        
        // Get unique tables from orders
        const tableNames = [...new Set(orders
            .filter(order => order.tableName)
            .map(order => order.tableName)
        )].filter(Boolean).sort();
        
        // Get unique statuses from orders
        const statuses = [...new Set(orders
            .map(order => order.status)
            .filter(Boolean)
        )].sort();
        
        // Get unique delivery statuses from orders
        const deliveryStatuses = [...new Set(orders
            .map(order => order.delivery)
            .filter(Boolean)
        )].sort();
        
        // Get unique employees from sessions and orders
        const employeeIds = new Set([
            ...sessions.map(s => s.employee_id)
        ].filter(Boolean));
        
        const sessionOperators = new Set([
            ...sessions.map(s => s.startedBy),
            ...sessions.map(s => s.endedby),
        ].filter(Boolean));

        return {
            locations: locations.filter(Boolean).sort(),
            categories,
            deliveryPersons,
            tableNames,
            statuses: statuses.length ? statuses : ['pending', 'completed', 'cancelled'],
            deliveryStatuses: deliveryStatuses.length ? deliveryStatuses : ['pending', 'compeleted', 'cancelled'],
            employeeIds: Array.from(employeeIds),
            sessionOperators: Array.from(sessionOperators)
        };
    }, [sessions, orders]);

    // Process and filter data
    const processedData = useMemo(() => {
        if (!sessions || !sessions.length) return [];
        
        let result = [];
        
        // Process sessions with their orders
        sessions.forEach(session => {
            // Skip invalid sessions
            if (!session || !session.i_d) return;
            
            const sessionOrders = (orders || []).filter(order => 
                order && order.sessionId === session.i_d
            );
            
            const sessionData = {
                ...session,
                orders: sessionOrders,
                totalSales: sessionOrders.reduce((sum, order) => sum + (parseFloat(order.totalSales) || 0), 0),
                totalItems: sessionOrders.reduce((sum, order) => sum + ((order.items || []).length || 0), 0),
                startDate: session.start ? new Date(session.start) : null,
                endDate: session.end ? new Date(session.end) : null,
                isActive: Boolean(session.active)
            };
            
            result.push(sessionData);
        });

        // Apply filters
        result = result.filter(session => {
            // Date filter - handle null dates
            if (filters.startDate && (!session.startDate || new Date(session.startDate) < filters.startDate)) {
                return false;
            }
            if (filters.endDate && (!session.startDate || new Date(session.startDate) > filters.endDate)) {
                return false;
            }
            
            // Session ID filter (exact match)
            if (filters.sessionId && session.i_d.toString() !== filters.sessionId.toString()) {
                return false;
            }
            
            // Location filter (case-insensitive partial match)
            if (filters.wrh) {
                const sessionWrh = (session.wrh || '').toString().toLowerCase();
                const filterWrh = filters.wrh.toLowerCase();
                if (!sessionWrh.includes(filterWrh)) {
                    return false;
                }
            }
            
            // Employee filter - check all possible employee fields (case-insensitive)
            if (filters.employee_id) {
                const employeeId = filters.employee_id.toString().toLowerCase();
                const sessionEmployee = (session.employee_id || '').toString().toLowerCase();
                const sessionStartedBy = (session.startedBy || '').toString().toLowerCase();
                const sessionEndedBy = (session.endedby || '').toString().toLowerCase();
                
                if (sessionEmployee !== employeeId && 
                    sessionStartedBy !== employeeId && 
                    sessionEndedBy !== employeeId) {
                    return false;
                }
            }
            
            return true;
        });

        // Filter orders within each session
        result = result.map(session => ({
            ...session,
            orders: (session.orders || []).filter(order => {
                if (!order) return false;
                
                // Order number filter (case-insensitive partial match)
                if (filters.orderNumber) {
                    const orderNumber = (order.orderNumber || '').toString().toLowerCase();
                    const searchTerm = filters.orderNumber.toString().toLowerCase();
                    if (!orderNumber.includes(searchTerm)) {
                        return false;
                    }
                }
                
                // Status filter (case-insensitive match)
                if (filters.status) {
                    const orderStatus = (order.status || '').toString().toLowerCase();
                    if (orderStatus !== filters.status.toLowerCase()) {
                        return false;
                    }
                }
                
                // Delivery status filter - case-insensitive match
                if (filters.delivery && 
                    order.delivery?.toLowerCase() !== filters.delivery.toLowerCase()) {
                    return false;
                }
                
                // Table filter - case-insensitive partial match
                if (filters.table_name && 
                    !order.tableName?.toLowerCase().includes(filters.table_name.toLowerCase())) {
                    return false;
                }
                
                // Item category filter - check if any item matches the category (case-insensitive)
                if (filters.item_category && 
                    !order.items?.some(item => 
                        item.category?.toLowerCase() === filters.category.toLowerCase()
                    )) {
                    return false;
                }
                
                // Delivered by filter - case-insensitive partial match
                if (filters.lastDeliveredBy && 
                    !order.lastDeliveredBy?.toLowerCase().includes(filters.lastDeliveredBy.toLowerCase())) {
                    return false;
                }
                
                return true;
            })
        }));

        return result;
    }, [sessions, orders, filters]);

    // Toggle session expansion
    const toggleSession = (sessionId) => {
        setExpandedSessions(prev => ({
            ...prev,
            [sessionId]: !prev[sessionId]
        }));
    };

    // Toggle all sessions
    const toggleAllSessions = (expand) => {
        const newExpandedState = {};
        sessions.forEach(session => {
            newExpandedState[session.i_d] = expand;
        });
        setExpandedSessions(newExpandedState);
    };

    // Render order items with details
    const renderOrderItems = (order) => {
        if (!order.items || order.items.length === 0) {
            return <div className="no-items">No items found</div>;
        }

        return (
            <div className="order-items-details">
                <div className="items-header">
                    <div className="item-name">Item</div>
                    <div className="item-category">Category</div>
                    <div className="item-quantity">Qty</div>
                    <div className="item-price">Price</div>
                    <div className="item-total">Total</div>
                    <div className="item-status">Status</div>
                </div>
                {order.items.map((item, index) => (
                    <div key={`${item._id}-${index}`} className="order-item">
                        <div className="item-name">
                            <div className="item-name-text">{item.name}</div>
                            <div className="item-id">ID: {item.i_d}</div>
                        </div>
                        <div className="item-category">{item.category}</div>
                        <div className="item-quantity">
                            {item.quantity} {item.salesUom}
                        </div>
                        <div className="item-price">
                            {formatCurrency(parseFloat(item.salesPrice) || 0)}
                        </div>
                        <div className="item-total">
                            {formatCurrency((parseFloat(item.salesPrice) || 0) * (parseInt(item.quantity) || 1))}
                        </div>
                        <div className="item-status">
                            <span className={`status-badge ${item.delivery || 'pending'}`}>
                                {item.delivery || 'Pending'}
                            </span>
                        </div>
                        {item.deliveredQuantity !== undefined && (
                            <div className="item-delivery-details">
                                <div className="delivered-quantity">
                                    Delivered: {item.deliveredQuantity} {item.salesUom}
                                </div>
                                {item.lastDeliveredBy && (
                                    <div className="delivered-by">
                                        By: {item.lastDeliveredBy}
                                    </div>
                                )}
                                {item.lastDeliveredAt && (
                                    <div className="delivered-time">
                                        At: {formatDate(item.lastDeliveredAt)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    // Helper function to get payment method from order
    const getPaymentMethod = (order) => {
        if (!order) return 'N/A';
        if (order.moniepoint1 > 0) return 'Moniepoint 1';
        if (order.moniepoint2 > 0) return 'Moniepoint 2';
        if (order.moniepoint3 > 0) return 'Moniepoint 3';
        if (order.moniepoint4 > 0) return 'Moniepoint 4';
        if (order.cash > 0) return 'Cash';
        return 'N/A';
    };

    // Toggle order expansion
    const toggleOrderExpansion = (orderId) => {
        setExpandedSessions(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    // Render filter controls
    const renderFilterControls = () => {
        return (
            <div className="filter-controls">
                <button 
                    className="filter-toggle" 
                    onClick={() => setShowFilters(!showFilters)}
                    aria-expanded={showFilters}
                >
                    <FaFilter /> {showFilters ? 'Hide Filters' : 'Show Filters'}
                    {showFilters ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                
                {showFilters && (
                    <div className="filters-section">
                        {/* Date Range */}
                        <div className="filter-group date-range-group">
                            <label>Date Range</label>
                            <div className="date-range-picker">
                                <DatePicker
                                    selected={filters.startDate}
                                    onChange={(date) => date && setFilters(prev => ({ ...prev, startDate: date }))}
                                    selectsStart
                                    startDate={filters.startDate}
                                    endDate={filters.endDate}
                                    maxDate={new Date()}
                                    className="date-input"
                                    dateFormat="MMM d, yyyy"
                                    isClearable
                                    placeholderText="Start date"
                                />
                                <span className="date-range-separator">to</span>
                                <DatePicker
                                    selected={filters.endDate}
                                    onChange={(date) => date && setFilters(prev => ({ ...prev, endDate: date }))}
                                    selectsEnd
                                    startDate={filters.startDate}
                                    endDate={filters.endDate}
                                    minDate={filters.startDate}
                                    maxDate={new Date()}
                                    className="date-input"
                                    dateFormat="MMM d, yyyy"
                                    isClearable
                                    placeholderText="End date"
                                />
                            </div>
                        </div>

                        {/* Location Filter */}
                        {filterOptions.locations.length > 0 && (
                            <div className="filter-group">
                                <label>Location</label>
                                <select 
                                    value={filters.wrh}
                                    onChange={(e) => setFilters(prev => ({ ...prev, wrh: e.target.value }))}
                                    className="filter-select"
                                >
                                    <option value="">All Locations</option>
                                    {filterOptions.locations.map(location => (
                                        <option key={location} value={location}>
                                            {location}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Session Operator Filter */}
                        {filterOptions.sessionOperators.length > 0 && (
                            <div className="filter-group">
                                <label>Session Operator</label>
                                <select 
                                    value={filters.sessionOperator}
                                    onChange={(e) => setFilters(prev => ({ ...prev, sessionOperator: e.target.value }))}
                                    className="filter-select"
                                >
                                    <option value="">All Operators</option>
                                    {filterOptions.sessionOperators.map(operatorId => {
                                        const operator = employees.find(e => e.i_d === operatorId);
                                        return operator ? (
                                            <option key={operator.i_d} value={operator.i_d}>
                                                {`${operator.firstName || ''} ${operator.lastName || ''}`.trim() || `Employee ${operator.i_d}`}
                                            </option>
                                        ) : null;
                                    })}
                                </select>
                            </div>
                        )}

                        {/* Employee Filter */}
                        {filterOptions.employeeIds.length > 0 && (
                            <div className="filter-group">
                                <label>Sales Person</label>
                                <select 
                                    value={filters.employee_id}
                                    onChange={(e) => setFilters(prev => ({ ...prev, employee_id: e.target.value }))}
                                    className="filter-select"
                                >
                                    <option value="">All Employees</option>
                                    {filterOptions.employeeIds.map(empId => {
                                        const emp = employees.find(e => e.i_d === empId);
                                        return emp ? (
                                            <option key={emp.i_d} value={emp.i_d}>
                                                {`${emp.firstName || ''} ${emp.lastName || ''}`.trim() || `Employee ${emp.i_d}`}
                                            </option>
                                        ) : null;
                                    })}
                                </select>
                            </div>
                        )}

                        {/* Status Filter */}
                        <div className="filter-group">
                            <label>Sales Status</label>
                            <select 
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="filter-select"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        {/* Delivery Status Filter (for delivery type) */}
                        {(
                            <div className="filter-group">
                                <label>Delivery Status</label>
                                <select 
                                    value={filters.delivery}
                                    onChange={(e) => setFilters(prev => ({ ...prev, delivery: e.target.value }))}
                                    className="filter-select"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        )}

                        {/* Item Category Filter */}
                        <div className="filter-group">
                            <label>Item Category</label>
                            <select 
                                value={filters.category}
                                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                                className="filter-select"
                            >
                                <option value="">All Categories</option>
                                {filterOptions.categories.map(category => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Delivered By Filter (for delivery type) */}
                        {(
                            <div className="filter-group">
                                <label>Delivered By</label>
                                <select 
                                    value={filters.lastDeliveredBy}
                                    onChange={(e) => setFilters(prev => ({ ...prev, lastDeliveredBy: e.target.value }))}
                                    className="filter-select"
                                >
                                    <option value="">All Employees</option>
                                    {filterOptions.deliveryPersons.map(empId => {
                                        const emp = employees.find(e => e.i_d === empId);
                                        return emp ? (
                                            <option key={emp.i_d} value={emp.i_d}>
                                                {`${emp.firstName || ''} ${emp.lastName || ''}`.trim() || `Employee ${emp.i_d}`}
                                            </option>
                                        ) : null;
                                    })}
                                </select>
                            </div>
                        )}

                        {/* Search */}
                        <div className="filter-group search-group">
                            <label>Order Number</label>
                            <div className="search-input">
                                <FaSearch className="search-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Search order number..."
                                    value={filters.orderNumber || ''}
                                    onChange={(e) => setFilters(prev => ({ ...prev, orderNumber: e.target.value }))}
                                    className="search-input-field"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render session cards with orders
    const renderSessionCards = () => {
        if (!processedData || processedData.length === 0) {
            return <div className="no-sessions">No sessions found matching your criteria</div>;
        }

        return processedData.map(session => {
            // Calculate session totals
            const sessionTotal = session.orders.filter(order => order.status !== 'cancelled')?.reduce((sum, order) => sum + (parseFloat(order.totalSales) || 0), 0) || 0;
            const totalItems = session.orders.filter(order => order.status !== 'cancelled')?.reduce((sum, order) => sum + ((order.items || []).length || 0), 0) || 0;
            const isExpanded = expandedSessions[session.i_d];
            
            return (
                <div key={session.i_d} className="session-card">
                    <div 
                        className="session-header"
                        onClick={() => toggleSession(session.i_d)}
                    >
                        <div className="session-info">
                            <div className="session-header-main">
                                <h3>Session #{session.i_d}</h3>
                                <div className="session-meta">
                                    <span className="session-date">
                                        <FaCalendarAlt /> {formatDate(session.start)} - {session.end ? formatDate(session.end) : 'Active'}
                                    </span>
                                    <span className="session-location">
                                        <FaMapMarkerAlt /> {session.wrh || 'N/A'}
                                    </span>
                                    {session.employee_id && (
                                        <span className="session-employee">
                                            <FaUser /> {getEmployeeName(session.employee_id) || 'N/A'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="session-stats">
                            <div className="stat">
                                <FaBox /> {session.orders?.length || 0} Orders
                            </div>
                            <div className="stat">
                                <FaBoxes /> {totalItems} Items
                            </div>
                            <div className="stat total-amount">
                                <FaMoneyBillWave /> {formatCurrency(sessionTotal)}
                            </div>
                            <div className={`status-badge ${session.active ? 'active' : 'closed'}`}>
                                {session.active ? (
                                    <><FaCircle className="status-indicator" /> Active</>
                                ) : (
                                    <><FaCircle className="status-indicator" /> Closed</>
                                )}
                            </div>
                            <FaChevronDown className={`toggle-icon ${expandedSessions[session.i_d] ? 'expanded' : ''}`} />
                        </div>
                    </div>

                    {expandedSessions[session.i_d] && (
                        <div className="session-details">
                            <div className="session-summary">
                                <div className="summary-item">
                                    <span className="summary-label">Started By:</span>
                                    <span className="summary-value">
                                        {getEmployeeName(session.startedBy) || 'N/A'}
                                    </span>
                                </div>
                                {session.endedby && (
                                    <div className="summary-item">
                                        <span className="summary-label">Ended By:</span>
                                        <span className="summary-value">
                                            {getEmployeeName(session.endedby)}
                                        </span>
                                    </div>
                                )}
                                <div className="summary-item">
                                    <span className="summary-label">Total Sales:</span>
                                    <span className="summary-value total-amount">
                                        {formatCurrency(sessionTotal)}
                                    </span>
                                </div>
                            </div>

                            <div className="session-orders">
                                <h4>Orders</h4>
                                {session.orders && session.orders.length > 0 ? (
                                    <div className="orders-list">
                                        {session.orders.map(order => (
                                            <div key={order._id} className="order-card">
                                                <div 
                                                    className="order-header"
                                                    onClick={() => toggleOrderExpansion(`order-${order._id}`)}
                                                >
                                                    <div className="order-info">
                                                        <div className="order-number">{order.orderNumber}</div>
                                                        <div className="order-time">{formatDate(order.createdAt)}</div>
                                                        {type === 'sales' && (
                                                            <div className="order-table">
                                                                <FaChair /> {order.tableName || `Table ${order.tableId || 'N/A'}`}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="order-stats">
                                                        <span className="order-items">
                                                            <FaBoxOpen /> {order.items?.length || 0} items
                                                        </span>
                                                        <span className="order-total">
                                                            {formatCurrency(order.totalSales || 0)}
                                                        </span>
                                                        <span className={`status-badge ${order.status || 'pending'}`}>
                                                            {order.status || 'Pending'}
                                                        </span>
                                                        {type === 'delivery' && (
                                                            <span className={`status-badge delivery ${order.delivery || 'pending'}`}>
                                                                {order.delivery || 'Pending'}
                                                            </span>
                                                        )}
                                                        <FaChevronDown className={`toggle-icon ${expandedSessions[`order-${order._id}`] ? 'expanded' : ''}`} />
                                                    </div>
                                                </div>
                                                
                                                {expandedSessions[`order-${order._id}`] && (
                                                    <div className="order-details">
                                                        <div className="order-meta">
                                                            <div className="meta-item">
                                                                <span className="meta-label">Handler:</span>
                                                                <span className="meta-value">
                                                                    {getEmployeeName(order.handlerId) || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div className="meta-item">
                                                                <span className="meta-label">Payment Method:</span>
                                                                <span className="meta-value">
                                                                    {getPaymentMethod(order)}
                                                                </span>
                                                            </div>
                                                            <div className="meta-item">
                                                                <span className="meta-label">Order Status:</span>
                                                                <span className={`status-badge ${order.status || 'unpaid'}`}>
                                                                    {order.status || 'Unpaid'}
                                                                </span>
                                                            </div>
                                                            <div className="meta-item">
                                                                <span className="meta-label">Delivery Status:</span>
                                                                <span className={`status-badge delivery ${order.delivery || 'pending'}`}>
                                                                    {order.delivery || 'Pending'}
                                                                </span>
                                                            </div>
                                                            {(order.delivery === 'completed' || order.status === 'cancelled') && <div className="meta-item">
                                                                <span className="meta-label">{order.delivery === 'completed' ? 'Delivered By:' : 'Order Cancelled By:'}</span>
                                                                <span className={`status-badge delivery ${order.delivery === 'completed' ? 'completed' : 'canceled'}`}>
                                                                    {order.delivery === 'completed' ? getEmployeeName(order.lastDeliveredBy) : (getEmployeeName(order.cancelledBy || 'N/A'))}
                                                                </span>
                                                            </div>}
                                                        </div>
                                                        
                                                        <div className="order-items-container">
                                                            {order.items?.map((item, index) => {
                                                                let salesPrice = Number(item.salesPrice)

                                                                if (order.wrh === 'vip'){
                                                                    salesPrice = Number(item.vipPrice || item.salesPrice)
                                                                }
                                                                return (<div key={`${item.i_d}-${index}`} className="order-item">
                                                                    <div className="item-header">
                                                                        <div className="item-name">{item.name || item.i_d}</div>
                                                                        <div className="item-price">
                                                                            {formatCurrency(parseFloat(salesPrice * (item.deliveredQuantity || item.quantity)) || 0)}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="item-details">
                                                                        <div className="detail-row">
                                                                            <span className="detail-label">Quantity:</span>
                                                                            <span className="detail-value">
                                                                                {item.deliveredQuantity || item.quantity} {item.salesUom || 'unit'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="detail-row">
                                                                            <span className="detail-label">Unit Price:</span>
                                                                            <span className="detail-value">
                                                                                {formatCurrency(parseFloat(salesPrice) || 0)}
                                                                            </span>
                                                                        </div>
                                                                        {(
                                                                            <div className="detail-row">
                                                                                <span className="detail-label">Delivery:</span>
                                                                                <span className={`status-badge ${item.delivery || 'pending'}`}>
                                                                                    {item.delivery || 'Pending'}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {item.category && (
                                                                        <div className="item-category">
                                                                            Category: {item.category}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )})}
                                                        </div>
                                                        
                                                        <div className="order-totals">
                                                            <div className="total-row">
                                                                <span className="total-label">Subtotal:</span>
                                                                <span className="total-amount">
                                                                    {formatCurrency(order.totalSales || 0)}
                                                                </span>
                                                            </div>
                                                            {order.salesVat > 0 && (
                                                                <div className="total-row">
                                                                    <span className="total-label">Tax ({order.salesVat || 0}%):</span>
                                                                    <span className="total-amount">
                                                                        {formatCurrency(order.salesVat || 0)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="total-row grand-total">
                                                                <span className="total-label">Total:</span>
                                                                <span className="total-amount">
                                                                    {formatCurrency(order.totalAmount || order.totalSales || 0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="no-orders">No orders found for this session</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        });
    };

    // Calculate totals and sales breakdown
    const { totals, salesByLocation, salesByPayPoint } = useMemo(() => {
        const result = {
            totals: {
                totalSessions: 0,
                totalOrders: 0,
                totalSales: 0,
                totalPayment: 0,
                totalItems: 0
            },
            salesByLocation: {},
            salesByPayPoint: {}
        };

        processedData.forEach(session => {
            console.log(session)
            result.totals.totalSessions += 1;
            const sessionOrders = session.orders?.length || 0;
            result.totals.totalOrders += sessionOrders;
            
            const sessionSales = session.orders.filter(order => order.status !== 'cancelled' && order.status !== 'pending')?.reduce((sum, order) => {                
                const warehouse = order.wrh
                let splitPayment = {}
                if (order.salesPosts?.[Object.keys(order?.salesPosts || {})[0]] === 'multiple'){
                    const totalOrderSales = Number(order?.totalSales || 0)                    
                    let kct = 0
                    let bct = 0
                    order.items.forEach((item)=>{
                        const totalItemPrice = (Number(item.deliveredQuantity || 0) * (warehouse === 'vip' ? Number(item.vipPrice || item.salesPrice) : Number(item.salesPrice)))
                        if (wrhCategories[warehouse].includes(item.category)){
                            bct += totalItemPrice
                        }else if (wrhCategories['kitchen'].includes(item.category)){
                            kct += totalItemPrice
                        }
                        splitPayment[warehouse] = totalOrderSales ? (Number(bct)/totalOrderSales) : 0
                        splitPayment['kitchen'] = totalOrderSales ? (Number(kct)/totalOrderSales) : 0                    
                    })
                }
                Object.keys(order?.salesPosts || {})?.forEach((payPoint)=>{
                    result.salesByPayPoint[payPoint] = (result.salesByPayPoint[payPoint] || 0) + Number(order[payPoint] || 0);
                    const location = order.salesPosts[payPoint]
                    if (location === 'multiple'){
                        result.salesByLocation[warehouse] = (result.salesByLocation[warehouse] || 0) + (Number(splitPayment[warehouse] || 0) * Number(order[payPoint]));
                        result.salesByLocation['kitchen'] = (result.salesByLocation['kitchen'] || 0) + (Number(splitPayment['kitchen'] || 0) * Number(order[payPoint]));
                    }else{
                        result.salesByLocation[location] = (result.salesByLocation[location] || 0) + Number(order[payPoint] || 0);
                    }
                })
                return sum + (parseFloat(order.totalSales) || 0);
            }, 0) || 0;
            result.totals.totalSales += sessionSales;
            
            const sessionPayments = session.orders.filter(order => order.status !== 'cancelled' && order.status !== 'pending')?.reduce((sum, order) => {                
                return sum + (parseFloat(order.totalPayment) || 0)
            }, 0) || 0;
            result.totals.totalPayment += sessionPayments; 

            result.totals.totalItems += session.orders.filter(order => order.status !== 'cancelled' && order.status !== 'pending')?.reduce((sum, order) => {
                return sum + ((order.items || []).reduce((itemSum, item) => {
                    return itemSum + (parseFloat(item.quantity) || 0);
                }, 0) || 0);
            }, 0) || 0;

            // Track sales by location
            // const location = session.wrh || 'Unknown';
            // result.salesByLocation[location] = (result.salesByLocation[location] || 0) + sessionSales;

            // Track sales by pay point (assuming pay_point is a property on the session)
        });

        return result;
    }, [processedData]);

    // Render export controls
    const renderExportControls = () => (
        <div className="export-actions">
            <div className="view-options">
                <button 
                    className="btn btn-outline"
                    onClick={() => toggleAllSessions(true)}
                >
                    <FaExpand /> Expand All
                </button>
                <button 
                    className="btn btn-outline"
                    onClick={() => toggleAllSessions(false)}
                >
                    <FaCompress /> Collapse All
                </button>
            </div>
            {/* <div className="export-buttons">
                <button 
                    className="btn btn-export" 
                    onClick={() => handleExport('excel')}
                >
                    <FaFileExcel className='excel' /> Export to Excel
                </button>
                <button 
                    className="btn btn-export" 
                    onClick={() => handleExport('pdf')}
                >
                    <FaFilePdf className='pdf' /> Export to PDF
                </button>
            </div> */}
        </div>
    );

    // Get employee name by ID
    const getEmployeeName = (employeeId) => {
        if (!employeeId) return 'N/A';
        const employee = employees.find(e => e.i_d === employeeId);
        return employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'Super Admin';
    };

    // Get table name by ID
    const getTableName = (tableId) => {
        if (!tableId) return 'N/A';
        const table = tables.find(t => t._id === tableId);
        return table ? table.name || `Table ${tableId}` : 'Unknown';
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return format(date, 'MMM d, yyyy hh:mm a');
    };

    // Handle export to Excel or PDF
    const handleExport = (format) => {
        const data = {
            sessions: processedData,
            orders: processedData.flatMap(session => session.orders || []),
            totals: totals,
            type: type,
            dateRange: {
                start: filters.startDate,
                end: filters.endDate
            }
        };
        
        if (format === 'excel') {
            // Export to Excel logic
            console.log('Exporting to Excel:', data);
            // alert('Export to Excel functionality will be implemented here');
            exportToExcel(data, `${type}_report_${new Date().toISOString().split('T')[0]}`);
        } else {
            // Export to PDF logic
            console.log('Exporting to PDF:', data);
            // alert('Export to PDF functionality will be implemented here');
            exportToPDF(data, `${type}_report_${new Date().toISOString().split('T')[0]}`, type);
        }
    };
    return (
        <div className="transaction-reports-overlay">
            {/* Receipts Modal Trigger State */}
            <PaymentReceiptsModal open={showReceiptsModal} onClose={()=>setShowReceiptsModal(false)} paymentReceipts={paymentReceipts} />
            <div className="transaction-reports">
                {/* Header */}
                <div className="reports-header">
                    <div className="header-top">
                        <div className="header-left">
                            <h2>
                                {type === 'sales' ? 'POS' : 'Delivery'} Transaction Report
                                <span className="report-period">
                                    {format(filters.startDate, 'MMM d, yyyy')} - {format(filters.endDate, 'MMM d, yyyy')}
                                </span>
                            </h2>
                        </div>
                        <div className="export-actions">
                            
                            <button 
                                className="btn-export" 
                                onClick={() => handleExport('excel')}
                            >
                                <FaFileExcel /> Export to Excel
                            </button>
                            <button 
                                className="rcpt-export" 
                                onClick={() => {setShowReceiptsModal(true)}}
                            >
                                <FaFileExcel /> View POS Receipts
                            </button>
                            <button 
                                className="btn-export" 
                                onClick={() => handleExport('pdf')}
                            >
                                <FaFilePdf /> Export to PDF
                            </button>
                        </div>
                    </div>
                    {/* Filter Controls */}
                    {renderFilterControls()}
                    <div className="results-summary-stats">
                        <div className="stat-item">
                            <span className="stat-label">Sessions</span>
                            <span className="stat-value">{totals.totalSessions}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Orders</span>
                            <span className="stat-value">{totals.totalOrders}</span>
                        </div>
                        <div className="stat-item total-amount">
                            <span className="stat-label">Total Sales</span>
                            <span className="stat-value">{formatCurrency(totals.totalSales)}</span>
                        </div>
                        <div className="stat-item total-amount">
                            <span className="stat-label">Total Payments</span>
                            <span className="stat-value">{formatCurrency(totals.totalPayment)}</span>
                        </div>
                    </div>
                    
                    {/* Sales by Location and Pay Point */}
                    <div className="sales-breakdown">
                        <div className="breakdown-section">
                            <h4>Sales by Location</h4>
                            <div className="breakdown-items">
                                {Object.entries(salesByLocation).map(([location, amount]) => (
                                    <div key={`loc-${location}`} className="breakdown-item">
                                        <span className="breakdown-label">{location.toUpperCase()}</span>
                                        <span className="breakdown-value">{formatCurrency(amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="breakdown-section">
                            <h4>Sales by Pay Point</h4>
                            <div className="breakdown-items"> 
                                {Object.entries(salesByPayPoint).map(([payPoint, amount]) => (
                                    <div key={`pay-${payPoint}`} className="breakdown-item">
                                        <span className="breakdown-label">{payPointAccounts[payPoint]}</span>
                                        <span className="breakdown-value">{formatCurrency(amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>                

                {/* Export Controls */}
                {renderExportControls()}
         
                {/* Results */}
                <div className="results-container">
                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : (
                        renderSessionCards()
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransactionReports;
