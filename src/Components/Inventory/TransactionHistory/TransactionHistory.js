import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import ContextProvider from '../../../Resources/ContextProvider';
import { FaFilter, FaFileExport, FaSearch, FaSync, FaDownload } from 'react-icons/fa';
import { CSVLink } from 'react-csv';
import { utils, writeFile } from 'xlsx';
import './TransactionHistory.css';

const TransactionHistory = () => {
  const {
    company,
    settings,
    fetchServer,
    server,
    setAlert,
    setAlertState,
    setAlertTimeout,
    companyRecord,
  } = useContext(ContextProvider);

  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().slice(0, 10), // 1st of current month
    endDate: new Date().toISOString().slice(0, 10), // Today
    location: 'all',
    productId: '',
    transactionType: 'all',
    page: 1,
    limit: 50,
  });

  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const isInitialMount = useRef(true);
  const [summary, setSummary] = useState({
    openingStock: 0,
    closingStock: 0,
    totalIn: 0,
    totalOut: 0,
    totalInCost: 0,
    totalOutCost: 0,
  });

  // Fetch locations from settings
  useEffect(() => {
    if (settings?.length) {
      const wrhsSetting = settings.find(s => s.name === 'warehouses');
      if (wrhsSetting?.warehouses) {
        setLocations(wrhsSetting.warehouses.map(w => w.name));
      }
    }
  }, [settings]);



  // ========== Helper Functions ==========
  
  // Format date from timestamp
  const formatTransactionDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(Number(timestamp)).toLocaleDateString();
  };

  // Format date string from database (YYYY-MM-DD) to display format
  const formatDateString = (dateStr) => {
    if (!dateStr) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  // Helper function to format date string to YYYY-MM-DD format
  const formatDateForDB = (date) => {
    if (!date) return '';
    // If it's already in YYYY-MM-DD format, return as is
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // If it's a timestamp, convert to YYYY-MM-DD
    if (typeof date === 'number') {
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    }
    // For Date objects
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  // Helper function to get transaction reference
  const getTransactionReference = (tx) => {
    if (tx.entryType === 'Purchase' || tx.entryType === 'Sales') {
      return tx.productRef || 'N/A';
    }
    return tx.documentType || 'N/A';
  };

  // Get transaction type for display with friendly names
  const getTransactionType = (tx) => {
    if (!tx) return 'N/A';
    if (tx.entryType === 'Sales') return 'Sale';
    if (tx.documentType === 'Transfer Shipment') return 'Transfer Out';
    if (tx.documentType === 'Transfer Receipt') return 'Transfer In';
    if (tx.entryType === 'Positive Entry') return 'Adjustment (+)'; 
    if (tx.entryType === 'Nagative Entry') return 'Adjustment (-)';
    return tx.entryType || tx.documentType || 'Other';
  };

  // Format number with thousands separators
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Get opening balance for the selected period
  const getOpeningBalance = useCallback(async (startDate, location, productId) => {
    try {
      // Format the date to match the database format (ISO string)
      const formattedStartDate = new Date(startDate).toISOString();
      
      const query = {
        database: company,
        collection: 'InventoryTransactions',
        prop: [
          { 
            $match: {
              $expr: {
                $lt: [
                  { $toString: "$postingStamp" },
                  formattedStartDate
                ]
              },
              ...(location !== 'all' && { location }),
              ...(productId && { productId })
            }
          },
          { 
            $group: {
              _id: null,
              total: { $sum: {
                $cond: [
                  { $isNumber: "$baseQuantity" },
                  "$baseQuantity",
                  { $toDouble: "$baseQuantity" }
                ]
              } }
            }
          }
        ]
      };

      const result = await fetchServer('POST', query, 'aggregateDocs', server);
      return result.record?.[0]?.total || 0;
    } catch (error) {
      return 0;
    }
  }, [company, fetchServer]);

  // Helper function to fetch transactions data
  const fetchTransactionsData = useCallback(async (startDate, endDate, filters) => {
    try {
      // Format dates to match the database format (ISO strings)
      const formattedStartDate = new Date(startDate).toISOString();
      const formattedEndDate = new Date(endDate).toISOString();

      // Build the transactions query
      const transactionsQuery = {
        database: company,
        collection: 'InventoryTransactions',
        prop: {
          $expr: {
            $and: [
              { $gte: [{ $toString: "$postingStamp" }, formattedStartDate] },
              { $lte: [{ $toString: "$postingStamp" }, formattedEndDate] }
            ]
          },
          ...(filters.location !== 'all' && { location: filters.location }),
          ...(filters.productId && { productId: filters.productId }),
          ...(filters.transactionType !== 'all' && { 
            $or: [
              { entryType: filters.transactionType },
              { documentType: filters.transactionType }
            ].filter(Boolean)
          })
        },
        project: {
          postingDate: 1,
          postingStamp: 1,
          entryType: 1,
          documentType: 1,
          productId: 1,
          name: 1,
          location: 1,
          baseQuantity: 1,
          costPrice: 1,
          totalCost: 1,
          productRef: 1,
          quantity: 1,
          referenceNo: 1,
          orderNumber: 1,
          createdAt: 1
        },
        sort: { postingStamp: 1 },
        skip: (filters.page - 1) * filters.limit,
        limit: filters.limit
      };

      // Fetch data in parallel
      const [transactionsResp, summaryResp] = await Promise.all([
        fetchServer('POST', transactionsQuery, 'getDocsDetails', server),
        fetchServer('POST', {
          database: company,
          collection: 'InventoryTransactions',
          prop: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $gte: [{ $toString: "$postingStamp" }, formattedStartDate] },
                    { $lte: [{ $toString: "$postingStamp" }, formattedEndDate] }
                  ]
                },
                ...(filters.location !== 'all' && { location: filters.location }),
                ...(filters.productId && { productId: filters.productId }),
                ...(filters.transactionType !== 'all' && { 
                  $or: [
                    { entryType: filters.transactionType },
                    { documentType: filters.transactionType }
                  ].filter(Boolean)
                })
              }
            },
            {
              $group: {
                _id: null,
                totalQuantity: { 
                  $sum: {
                    $cond: [
                      { $isNumber: "$baseQuantity" },
                      "$baseQuantity",
                      { $toDouble: "$baseQuantity" }
                    ]
                  }
                },
                totalInQuantity: { 
                  $sum: {
                    $cond: [
                      { $gt: [
                        { $cond: [
                          { $isNumber: "$baseQuantity" },
                          "$baseQuantity",
                          { $toDouble: "$baseQuantity" }
                        ] },
                        0
                      ]},
                      { $cond: [
                        { $isNumber: "$baseQuantity" },
                        "$baseQuantity",
                        { $toDouble: "$baseQuantity" }
                      ] },
                      0
                    ]
                  }
                },
                totalOutQuantity: { 
                  $sum: {
                    $cond: [
                      { $lt: [
                        { $cond: [
                          { $isNumber: "$baseQuantity" },
                          "$baseQuantity",
                          { $toDouble: "$baseQuantity" }
                        ] },
                        0
                      ]},
                      { $cond: [
                        { $isNumber: "$baseQuantity" },
                        "$baseQuantity",
                        { $toDouble: "$baseQuantity" }
                      ] },
                      0
                    ]
                  }
                },
                totalCost: {
                  $sum: {
                    $cond: [
                      { $isNumber: "$totalCost" },
                      "$totalCost",
                      { $toDouble: "$totalCost" }
                    ]
                  }
                },
                totalInCost: {
                  $sum: {
                    $cond: [
                      { $gt: [
                        { $cond: [
                          { $isNumber: "$baseQuantity" },
                          "$baseQuantity",
                          { $toDouble: "$baseQuantity" }
                        ] },
                        0
                      ]},
                      { $cond: [
                        { $isNumber: "$totalCost" },
                        "$totalCost",
                        { $toDouble: "$totalCost" }
                      ] },
                      0
                    ]
                  }
                },
                totalOutCost: {
                  $sum: {
                    $cond: [
                      { $lt: [
                        { $cond: [
                          { $isNumber: "$baseQuantity" },
                          "$baseQuantity",
                          { $toDouble: "$baseQuantity" }
                        ] },
                        0
                      ]},
                      { $cond: [
                        { $isNumber: "$totalCost" },
                        "$totalCost",
                        { $toDouble: "$totalCost" }
                      ] },
                      0
                    ]
                  }
                }
              }
            }
          ]
        }, 'aggregateDocs', server)
      ]);


      // Process transactions
      const transactions = transactionsResp?.record || [];
      
      // Process summary data
      const summaryData = {
        totalIn: 0,
        totalOut: 0,
        totalInCost: 0,
        totalOutCost: 0,
      };
      
      if (summaryResp?.record?.[0]) {
        const item = summaryResp.record[0];
        // For totalOut, we take the absolute value since it's stored as negative in the database
        summaryData.totalIn = Math.abs(Number(item.totalInQuantity) || 0);
        summaryData.totalOut = Math.abs(Number(item.totalOutQuantity) || 0);
        summaryData.totalInCost = Math.abs(Number(item.totalInCost) || 0);
        summaryData.totalOutCost = Math.abs(Number(item.totalOutCost) || 0);
      }
      return {
        transactions,
        summaryData
      };
    } catch (error) {
      // Return empty data structure on error
      return {
        transactions: [],
        totalCount: 0,
        summaryData: {
          totalIn: 0,
          totalOut: 0,
          totalInCost: 0,
          totalOutCost: 0
        }
      };
    }
  }, [company, fetchServer]);

  // Memoize the fetchTransactionHistory function
  const fetchTransactionHistory = useCallback(async () => {
    if (!company) return;
    
    setLoading(true);
    try {
      // Format dates for DB query (YYYY-MM-DD format)
      const startDate = formatDateForDB(filters.startDate);
      const endDate = formatDateForDB(filters.endDate);
      
      // Get opening balance and transactions in parallel
      const [openingBalance, transactionsData] = await Promise.all([
        getOpeningBalance(filters.startDate, filters.location, filters.productId),
        fetchTransactionsData(startDate, endDate, filters)
      ]);

      // Process the data
      const { transactions: fetchedTransactions, totalCount, summaryData } = transactionsData;
      
      // Calculate running balance
      let runningBalance = openingBalance;
      const enrichedTransactions = (fetchedTransactions || []).map(tx => {
        const quantity = Number(tx.baseQuantity) || 0;
        runningBalance += quantity;
        
        return {
          ...tx,
          quantity,
          runningBalance,
          reference: getTransactionReference(tx),
          formattedDate: formatDateString(tx.postingDate) || formatTransactionDate(tx.createdAt),
          formattedQuantity: quantity > 0 ? `+${quantity}` : quantity.toString(),
          formattedCost: tx.costPrice ? `₦${Number(tx.costPrice).toLocaleString()}` : 'N/A',
          formattedTotalCost: tx.totalCost ? `₦${Math.abs(Number(tx.totalCost)).toLocaleString()}` : 'N/A',
          formattedBalance: runningBalance,
          documentNumber: tx.referenceNo || tx.orderNumber || 'N/A'
        };
      });

      // Update state
      setTransactions(enrichedTransactions);
      setTotalCount(totalCount);
      setSummary({
        openingStock: openingBalance,
        closingStock: runningBalance,
        totalIn: summaryData.totalIn,
        totalOut: summaryData.totalOut,
        totalInCost: summaryData.totalInCost,
        totalOutCost: summaryData.totalOutCost,
      });
    } catch (error) {
      setAlertState('error');
      setAlert('Failed to load transaction history');
      setAlertTimeout(5000);
    } finally {
      setLoading(false);
    }
  }, [
    company, 
    filters, 
    getOpeningBalance, 
    fetchTransactionsData, 
    // formatTransactionDate,
    // formatDateString,
    // formatDateForDB,
    // getTransactionReference,
  ]);

  
  // Error handling is done in the main fetchTransactionHistory function

  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  }, []);

  // Export to Excel
  const exportToExcel = () => {
    try {
      const ws = utils.json_to_sheet(transactions.map(tx => ({
        'Date': tx.formattedDate,
        'Type': getTransactionType(tx),
        'Document #': tx.documentNumber,
        'Product': tx.name || `Product ${tx.productId}`,
        'Location': tx.location || 'N/A',
        'Quantity': tx.formattedQuantity,
        'Unit Cost': tx.formattedCost,
        'Total Cost': tx.formattedTotalCost,
        'Reference': tx.reference,
        'Running Balance': tx.formattedBalance
      })));
      
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Transaction History');
      writeFile(wb, `Transaction_History_${new Date().toISOString().slice(0, 10)}.xlsx`);
      
      setAlertState('success');
      setAlert('Export to Excel completed successfully');
      setAlertTimeout(3000);
    } catch (error) {
      setAlertState('error');
      setAlert('Failed to export to Excel');
      setAlertTimeout(5000);
    }
  };

  // Prepare CSV data
  const csvData = useMemo(() => {
    return transactions.map(tx => ({
      'Date': tx.formattedDate,
      'Type': getTransactionType(tx),
      'Document #': tx.referenceNo || tx.orderNumber || 'N/A',
      'Product': tx.name || `Product ${tx.productId}`,
      'Location': tx.location || 'N/A',
      'Quantity': tx.baseQuantity,
      'Unit Cost': tx.costPrice || 0,
      'Total Cost': tx.totalCost ? Math.abs(Number(tx.totalCost)) : 0,
      'Reference': tx.referenceNo || tx.orderNumber || tx.documentType || 'N/A',
      'Running Balance': tx.runningBalance || 0,
    }));
  }, [transactions, getTransactionType]);

  // Fetch initial data and when filters change
  useEffect(() => {
    if (company){
      fetchTransactionHistory()
    }
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    } 
    
    const timer = setTimeout(() => {
      fetchTransactionHistory();
    }, 300); // Small debounce to prevent rapid successive calls
    
    return () => clearTimeout(timer);
  }, [company]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handleApplyFilters = () => {
    fetchTransactionHistory();
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: new Date(new Date().setDate(1)).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      location: 'all',
      productId: '',
      transactionType: 'all',
      page: 1,
      limit: 50,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };


  const formatCurrency = (num) => {
    if (typeof num !== 'number') return 'N/A';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="transaction-history">
      <div className="filters-container">
        <div className="filter-group">
          <label>Date Range</label>
          <div className="date-range">
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="date-input"
            />
            <span>to</span>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="date-input"
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Location</label>
          <select
            name="location"
            value={filters.location}
            onChange={handleFilterChange}
            className="select-input"
          >
            <option value="all">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Transaction Type</label>
          <select
            name="transactionType"
            value={filters.transactionType}
            onChange={handleFilterChange}
            className="select-input"
          >
            <option value="all">All Types</option>
            <option value="Purchase">Purchases</option>
            <option value="Sales">Sales</option>
            <option value="Shipment">Transfers Out</option>
            <option value="Receipt">Transfers In</option>
            <option value="Positive Entry">Positive Adjustments</option>
            <option value="Nagative Entry">Negative Adjustments</option>
          </select>
        </div>

        <div className="filter-actions">
          <button 
            onClick={handleApplyFilters}
            className="btn btn-primary"
            disabled={loading}
          >
            <FaFilter /> Apply Filters
          </button>
          <button 
            onClick={handleResetFilters}
            className="btn btn-secondary"
            disabled={loading}
          >
            Reset
          </button>
          <button 
            onClick={fetchTransactionHistory}
            className="btn btn-icon"
            title="Refresh"
            disabled={loading}
          >
            <FaSync className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-label">Opening Stock</div>
          <div className="summary-value">{formatNumber(summary.openingStock)}</div>
          <div className="summary-subtext">Units</div>
        </div>
        <div className="summary-card in">
          <div className="summary-label">Total In</div>
          <div className="summary-value">+{formatNumber(summary.totalIn)}</div>
          <div className="summary-subtext">
            {summary.totalIn > 0 && `₦${formatNumber(summary.totalInCost)}`}
          </div>
        </div>
        <div className="summary-card out">
          <div className="summary-label">Total Out</div>
          <div className="summary-value">-{formatNumber(summary.totalOut)}</div>
          <div className="summary-subtext">
            {summary.totalOut > 0 && `₦${formatNumber(summary.totalOutCost)}`}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Closing Stock</div>
          <div className="summary-value">
            {formatNumber(summary.openingStock + summary.totalIn - summary.totalOut)}
          </div>
          <div className="summary-subtext">
            {summary.openingStock + summary.totalIn - summary.totalOut > 0 && 
              `Valuation: ₦${formatNumber(summary.totalInCost - summary.totalOutCost)}`}
          </div>
        </div>
      </div>

      <div className="transactions-table-container">
        <div className="table-header">
          <h3>Transaction History</h3>
          <div className="table-actions">
            <button 
              onClick={exportToExcel}
              className="btn btn-icon" 
              title="Export to Excel"
              disabled={transactions.length === 0}
            >
              <FaFileExport />
            </button>
            <CSVLink 
              data={csvData}
              filename={`transaction_history_${new Date().toISOString().slice(0, 10)}.csv`}
              className="btn btn-icon"
              title="Export to CSV"
              disabled={transactions.length === 0}
            >
              <FaDownload />
            </CSVLink>
          </div>
        </div>

        <div className="table-responsive">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Document #</th>
                <th>Product</th>
                <th>Location</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Total Cost</th>
                <th>Running Balance</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="loading-row">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="10" className="no-data">
                    {loading ? 'Loading...' : 'No transactions found for the selected filters.'}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx._id} className={`tx-type-${getTransactionType(tx).toLowerCase().replace(/\s+/g, '-')}`}>
                    <td>{formatDate(tx.postingDate)}</td>
                    <td>{getTransactionType(tx)}</td>
                    <td>{tx.referenceNo || tx.orderNumber || 'N/A'}</td>
                    <td>{tx.name || `Product ${tx.productId}`}</td>
                    <td>{tx.location || 'N/A'}</td>
                    <td className={tx.baseQuantity > 0 ? 'positive' : 'negative'}>
                      {tx.baseQuantity > 0 ? '+' : ''}{tx.baseQuantity}
                    </td>
                    <td>{tx.costPrice ? `₦${Number(tx.costPrice).toLocaleString()}` : 'N/A'}</td>
                    <td>{tx.totalCost ? `₦${Math.abs(Number(tx.totalCost)).toLocaleString()}` : 'N/A'}</td>
                    <td>{tx.runningBalance?.toLocaleString() || 'N/A'}</td>
                    <td>
                      {tx.referenceNo || tx.orderNumber || tx.documentType || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <button 
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={filters.page === 1 || loading}
            className="pagination-btn"
          >
            Previous
          </button>
          <span>Page {filters.page}</span>
          <button 
            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={transactions.length < filters.limit || loading}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
