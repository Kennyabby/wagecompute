import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import ContextProvider from '../../../Resources/ContextProvider';
import { putInventoryTransactions, getAppCache, setAppCache } from '../../../Resources/offlineDb';
import { FaFilter, FaFileExport, FaSearch, FaSync, FaDownload, FaFilePdf } from 'react-icons/fa';
import { CSVLink } from 'react-csv';
import { utils, writeFile } from 'xlsx';
// Import jsPDF with autoTable
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
    products,
    companyRecord,
    getProductsStockReport
  } = useContext(ContextProvider);

  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [modalData, setModalData] = useState({
    show: false,
    title: '',
    type: '', // 'openingStock', 'purchases', 'sales', 'transfers', 'adjustments', 'closingStock'
    data: [],
    summary: {}
  });
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().slice(0,10), // 1st of current month
    endDate: new Date().toISOString().slice(0, 10), // Today
    location: 'all',
    productId: '',
    transactionType: 'all',
    page: 1,
    limit: 50,
  });

  const [locations, setLocations] = useState([]);
  const isInitialMount = useRef(true);
  const [summary, setSummary] = useState({
    // Quantities
    openingStock: 0,
    purchases: 0,
    sales: 0,
    transfersIn: 0,
    transfersOut: 0,
    positiveAdjustments: 0,
    negativeAdjustments: 0,
    closingStock: 0,
    
    // Cost Values
    openingStockCost: 0,
    purchasesCost: 0,
    salesValue: 0,
    costOfGoodsSold: 0,
    transfersInCost: 0,
    transfersOutCost: 0,
    positiveAdjustmentsCost: 0,
    negativeAdjustmentsCost: 0,
    closingStockCost: 0,
    
    // Calculated Values
    netTransferCost: 0,
    netAdjustmentCost: 0,
    
    // Totals
    totalIn: 0,
    totalOut: 0,
    totalInCost: 0,
    totalOutCost: 0,
  });

  const applyTxSnapshot = useCallback((snap) => {
    if (!snap) return;
    const defaults = {
      openingStock: 0,
      purchases: 0,
      sales: 0,
      transfersIn: 0,
      transfersOut: 0,
      positiveAdjustments: 0,
      negativeAdjustments: 0,
      closingStock: 0,
      openingStockCost: 0,
      purchasesCost: 0,
      salesValue: 0,
      costOfGoodsSold: 0,
      transfersInCost: 0,
      transfersOutCost: 0,
      positiveAdjustmentsCost: 0,
      negativeAdjustmentsCost: 0,
      closingStockCost: 0,
      netTransferCost: 0,
      netAdjustmentCost: 0,
      totalIn: 0,
      totalOut: 0,
      totalInCost: 0,
      totalOutCost: 0,
    };
    setTransactions(snap.transactions || []);
    setTotalCount(snap.totalCount || 0);
    setSummary({
      ...defaults,
      ...(snap.summary || {}),
    });
  }, []);

  const makeTxCacheKey = useCallback((companyKey, f) => {
    const db = companyKey || 'global';
    const {
      startDate,
      endDate,
      location,
      productId,
      transactionType,
    } = f || {};

    const loc = location || 'all';
    const prod = productId || 'all';
    const type = transactionType || 'all';

    return `tx-history:${db}:${startDate || ''}:${endDate || ''}:${loc}:${prod}:${type}`;
  }, []);

  const getTxCached = useCallback(async (companyKey, f) => {
    try {
      const key = makeTxCacheKey(companyKey, f);
      const rec = await getAppCache(companyKey, key);
      if (!rec || !rec.data) return null;
      return rec.data;
    } catch (e) {
      console.warn('getTxCached failed', e);
      return null;
    }
  }, [makeTxCacheKey]);

  const setTxCached = useCallback((companyKey, f, snapshot) => {
    try {
      const key = makeTxCacheKey(companyKey, f);
      setAppCache(companyKey, key, snapshot);
    } catch (e) {
      console.warn('setTxCached failed', e);
    }
  }, [makeTxCacheKey]);

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

  // Helper function to fetch stock data
  const fetchStockData = async (type, startDate, endDate) => {
    try {
      const query = {
        database: company,
        collection: 'InventoryTransactions',
        
        prop: {
          postingDate: {
            [type === 'openingStock' ? '$lt' : '$lte']: type === 'openingStock' ? startDate : endDate
          }
        },
        // Add projection to only fetch necessary fields
        project: {
          productId: 1,
          entryType: 1,
          documentType: 1,
          name: 1,
          quantity: 1,
          baseQuantity: 1,
          costPrice: 1,
          totalCost: 1,
          totalSales: 1,
          location: 1,
          uom: 1,
          postingStamp: 1,
          postingDate: 1,
        },
        // Add limit to prevent fetching too much data
        // limit: 10000,
        // Add sort to use index efficiently
        sort: { postingDate: 1 }
      };
  
      // Add filters only if needed
      if (filters.location && filters.location !== 'all') {
        query.prop.location = filters.location;
      }
  
      if (filters.productId) {
        query.prop.productId = filters.productId;
      }
  
      // if (filters.transactionType) {
      //   query.prop.$or = [
      //     { entryType: filters.transactionType },
      //     { documentType: filters.transactionType }
      //   ].filter(Boolean)
      // }
      const result = await fetchServer('POST', query, 'getDocsDetails', server);
      return result.record || [];
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error);
      setAlertState('error');
      setAlert(`Error fetching ${type} data. Please try again.`);
      setAlertTimeout(5000)
      return [];
    }
  };

  // Handle summary card click
  const handleSummaryCardClick = async (type) => {
    if (companyRecord?.status === 'admin' || companyRecord?.permissions.includes('export_inventory_report')){
      try {
        setLoading(true);
        
        let transactionsToProcess = [];
        const startDate = new Date(filters.startDate).toISOString().split('T')[0];
        const endDate = new Date(filters.endDate).toISOString().split('T')[0];
  
        // For opening/closing stock, use direct queries for better accuracy
        if (type === 'openingStock' || type === 'closingStock') {
          transactionsToProcess = await fetchStockData(type, startDate, endDate);
        } else {
          // For other types, use the existing transactions with filters
          transactionsToProcess = transactions.filter(tx => {
            const txDate = new Date(tx.postingStamp || tx.postingDate);
            const startDate = new Date(filters.startDate);
            const endDate = new Date(filters.endDate);
            
            // if (!(txDate >= startDate && txDate <= endDate)) {
            //   return false;
            // }
            
            // Apply type-specific filters
            switch (type) {
              case 'purchases':
                return tx.entryType === 'Purchase' && (Number(tx.baseQuantity) || 0) > 0;
              case 'sales':
                return tx.entryType === 'Sales' && (Number(tx.baseQuantity) || 0) < 0;
              case 'transfers':
                return ['Transfer Shipment', 'Transfer Receipt'].includes(tx.documentType);
              case 'adjustments':
                return ['Positive Entry', 'Nagative Entry'].includes(tx.entryType);
              default:
                return true;
            }
          });
        }
  
        // Process the transactions and group by product
        const processedData = {};
        let totalQuantity = 0;
        let totalCost = 0;
        let totalValue = 0;
        transactionsToProcess.forEach(tx => {
          const productId = tx.productId;
          const productName = tx.name || products.find(p => p.i_d === productId)?.name || `Product ${productId}`;
          
          if (!processedData[productId]) {
            processedData[productId] = {
              productId,
              productName,
              uom: tx.uom || 'pcs',
              quantity: 0,
              cost: 0,
              value: 0,
              locations: {}
            };
          }
  
          // For opening/closing stock, we need to consider the running balance
          // const quantity = type === 'openingStock' || type === 'closingStock' ? 
          //   (tx.entryType === 'Sales' || tx.documentType === 'Transfer Shipment' ? 
          //     -Math.abs(Number(tx.baseQuantity) || 0) : 
          //     Math.abs(Number(tx.baseQuantity) || 0)) : 
          //   Number(tx.baseQuantity || 0);
          const quantity = Number(tx.baseQuantity || 0)
          // const cost = type === 'openingStock' || type === 'closingStock' ?
          //   (tx.entryType === 'Sales' || tx.documentType === 'Transfer Shipment' ?
          //     -Math.abs(Number(tx.totalCost) || 0) :
          //     Math.abs(Number(tx.totalCost) || 0)) :
          //   Number(tx.totalCost || 0);
          const cost = Number(tx.totalCost || 0)
          const salesValue = -1 * Math.abs(Number(tx.totalSales || 0))
          const location = tx.location || 'Unknown Location';
          
          // Initialize location data if it doesn't exist
          if (!processedData[productId].locations[location]) {
            processedData[productId].locations[location] = {
              quantity: 0,
              cost: 0,
              value: 0
            };
          }
  
          // Update product totals
          let productCost = products.find(p => p.i_d === productId)?.costPrice || 0;
          processedData[productId].quantity += quantity;
          processedData[productId].cost += quantity * productCost; // Use costPrice for cost calculation
          if (type === 'sales'){
            processedData[productId].value += salesValue;
          }
          
          // Update location-specific totals
          processedData[productId].locations[location].quantity += quantity;
          processedData[productId].locations[location].cost += quantity * productCost;
          if (type === 'sales'){
            processedData[productId].locations[location].value += salesValue;
          }
  
          // Update grand totals
          totalQuantity += quantity;
          totalCost += (quantity * productCost);
          totalValue += salesValue;
        });
  
        // Convert to array and calculate percentages
        const productList = Object.values(processedData).map(product => ({
          ...product,
          percentage: totalQuantity !== 0 ? (product.quantity / totalQuantity) * 100 : 0,
          unitCost: product.quantity !== 0 ? product.cost / product.quantity : 0,
          costPercentage: totalCost !==0 ? (product.cost / totalCost) * 100 : 0,
          valuePercentage: totalValue !==0 ? (product.value / totalValue) * 100 : 0,
          locations: Object.entries(product.locations).map(([location, data]) => ({
            name: location,
            quantity: data.quantity,
            unitCost: data.quantity ? (data.cost/data.quantity) : 0,
            cost: data.cost,
            value: data.value,
            percentage: data.quantity / product.quantity * 100
          }))
        }));
  
        // Sort by quantity (highest first)
        productList.sort((a, b) => b.quantity - a.quantity);
  
        // Determine the title based on the card type
        const getTitle = () => {
          switch (type) {
            case 'openingStock': return 'Opening Stock Details';
            case 'purchases': return 'Purchases Details';
            case 'sales': return 'Sales Details';
            case 'transfers': return 'Transfers Details';
            case 'adjustments': return 'Adjustments Details';
            case 'closingStock': return 'Closing Stock Details';
            default: return 'Transaction Details';
          }
        };
  
        // Set the modal data and show the modal
        setModalData({
          show: true,
          title: `${companyRecord.name} - ${getTitle()}`,
          type,
          data: productList,
          summary: {
            totalQuantity,
            totalCost,
            totalValue,
            averageUnitCost: totalQuantity > 0 ? totalCost / totalQuantity : 0
          }
        });
      } catch (error) {
        console.error('Error fetching transaction details:', error);
        setAlertState('error');
        setAlert('Failed to load details. Please try again.');
        setAlertTimeout(5000)
      } finally {
        setLoading(false);
      }
    }
  };

  // Helper function to split text into multiple lines if needed
  const splitText = (text, maxWidth, doc) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = doc.getTextWidth(currentLine + ' ' + word);
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // Export data to PDF without using autoTable
  const exportToPDF = (title, type, data, summary, startDate, endDate) => {
    // Initialize jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set font
    doc.setFont('helvetica');
    
    // Add title
    doc.setFontSize(18);
    doc.text(title, 15, 20);
    
    // Add date and date range
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 28);
    
    let startY = 35; // Default start position
    
    // Add date range if available
    if (startDate && endDate) {
      const formattedStart = new Date(startDate).toLocaleDateString();
      const formattedEnd = new Date(endDate).toLocaleDateString();
      doc.text(`Date Range: ${formattedStart} to ${formattedEnd}`, 15, 34);
      startY = 42; // Adjust startY if date range is shown
    }
    
    // Table settings
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const tableWidth = pageWidth - 2 * margin;
    // Adjusted column widths to fit all columns properly
    const colWidths = [
      50,   // Product
      25,   // Qty
      35,   // Value
      35,   // Unit Cost
      35    // Total Cost
    ];
    const rowHeight = 7;
    let currentY = startY;
    
    // Draw table header
    doc.setFillColor(41, 128, 185);
    // doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    
    // Set text color to white for all headers
    // doc.setTextColor(255, 255, 255);
    
    // Draw header cells
    let xPos = margin;
    ['Product', 'Qty', 'Sales Value', 'Unit Cost', 'Total Cost'].forEach((header, i) => {
      // Reset text color after drawing headers
      doc.setFillColor(41, 128, 185)
      doc.setTextColor(255, 255, 255);
      doc.rect(xPos, currentY, colWidths[i], rowHeight, 'F');
      doc.text(header, xPos + 2, currentY + 5);
      xPos += colWidths[i];
    });
    
    
    
    currentY += rowHeight;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    
    // Reset text color and font
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Process each product
    data.forEach((product, index) => {
      // Check for page break
      if (currentY > 270) { // Near bottom of page
        doc.addPage();
        currentY = 20;
      }
      
      // Product name (main row)
      doc.setFont('helvetica', 'bold');
      doc.text(product.productName, margin + 2, currentY + 5);
      doc.setFont('helvetica', 'normal');
      
      // Quantity
      doc.text(
        formatNumber(product.quantity),
        margin + colWidths[0] + colWidths[1]/2,
        currentY + 5,
        { align: 'right' }
      );
      
      // Total Value
      doc.text(
        formatCurrency(product.value),
        margin + colWidths[0] + colWidths[1] + colWidths[2]/2,
        currentY + 5,
        { align: 'right' }
      );

      // Unit Cost
      doc.text(
        formatCurrency(Math.abs(product.unitCost)),
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]/2,
        currentY + 5,
        { align: 'right' }
      );
      
      // Total Cost
      doc.text(
        formatCurrency(product.cost),
        margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]/2,
        currentY + 5,
        { align: 'right' }
      );
      
      currentY += rowHeight;
      
      // Add location details
      if (product.locations && Object.keys(product.locations).length > 0) {
        Object.entries(product.locations).forEach(([location, locData]) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.setFontSize(9);
          doc.text(
            `• ${locData.name}`,
            margin + 5,
            currentY + 5
          );
          // Location quantity
          doc.text(
            formatNumber(locData.quantity),
            margin + colWidths[0] + colWidths[1]/2,
            currentY + 5,
            { align: 'right' }
          );
         
          // Location value
          doc.text(
            formatCurrency(locData.value),
            margin + colWidths[0] + colWidths[1] + colWidths[2]/2,
            currentY + 5,
            { align: 'right' }
          );
         
          // Location unit cost
          doc.text(
            formatCurrency(Math.abs(locData.unitCost)),
            margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]/2,
            currentY + 5,
            { align: 'right' }
          );
         
          // Location total cost
          doc.text(
            formatCurrency(Math.abs(locData.cost)),
            margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]/2,
            currentY + 5,
            { align: 'right' }
          );
          
          currentY += rowHeight;
        });
        doc.setFontSize(10);
      }
      
      // Add some space after each product
      currentY += 2;
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 3;
    });
    
    // Add summary row
    currentY += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 2;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    
    // Total label
    doc.text(
      'Total',
      margin + 2,
      currentY + 6
    );
    
    // Total Quantity
    doc.text(
      formatNumber(summary.totalQuantity),
      margin + colWidths[0] + colWidths[1]/2,
      currentY + 6,
      { align: 'right' }
    );
    
    // Total Value
    doc.text(
      formatCurrency(summary.totalValue || 0),
      margin + colWidths[0] + colWidths[1] + colWidths[2]/2,
      currentY + 6,
      { align: 'right' }
    );
    
    // Average Unit Cost
    doc.text(
      formatCurrency(Math.abs(summary.averageUnitCost) || 0),
      margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]/2,
      currentY + 6,
      { align: 'right' }
    );
    
    // Total Cost
    doc.text(
      formatCurrency(summary.totalCost || 0),
      margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]/2,
      currentY + 6,
      { align: 'right' }
    );
    
    // Draw bottom border
    currentY += 10;
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    
    // Save the PDF with a proper filename
    doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Format number with thousands separators
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Get opening balance for the selected period
  const getOpeningBalance = useCallback(async (startDate, location, productId, transactionType) => {
    try {
      // Format the date to match the database format (ISO string)
      const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
      
      // Get all products that have a salesPrice or vipPrice
      const productIds = products
        .filter(product => product.salesPrice || product.vipPrice )
        .map(product => product.i_d);

      const query = {
        database: company,
        collection: 'InventoryTransactions',
        prop: [
          {
            $match: {
              postingDate: { $lt: formattedStartDate },
              ...(location !== 'all' && { location }),
              ...(productId && { productId }),
              ...(transactionType !== 'all' && { 
                $or: [
                  { entryType: transactionType },
                  { documentType: transactionType }
                ].filter(Boolean)
              })
            }
          },
          { 
            $group: {
              _id: null,
              openingStock: { $sum: {
                $cond: [
                  { $isNumber: "$baseQuantity" },
                  "$baseQuantity",
                  { $toDouble: "$baseQuantity" }
                ]
              }},
              openingStockCost: { $sum: {
                $cond: [
                  { $in: ["$productId", productIds] },
                  { $cond: [
                    { $isNumber: "$totalCost" },
                    "$totalCost",
                    { $toDouble: "$totalCost" }
                  ]},
                  0
                ]
              }},
              // Only include purchases for products that have a salesPrice or vipPrice
              openingPurchasedQty: {
                $sum: {
                  $cond: [
                    { $and: [
                      { $eq: ["$entryType", "Purchase"] },
                      { $gt: ["$baseQuantity", 0] },
                      { $in: ["$productId", productIds] }
                    ]},
                    { $cond: [
                      { $isNumber: "$baseQuantity" },
                      "$baseQuantity",
                      { $toDouble: "$baseQuantity" }
                    ]},
                    0
                  ]
                }
              },
              openingStockForSales: {
                $sum: {
                  $cond: [
                    { $in: ["$productId", productIds] },
                    { $cond: [
                      { $isNumber: "$baseQuantity" },
                      "$baseQuantity",
                      { $toDouble: "$baseQuantity" }
                    ]},  
                    0
                  ]
                }
              },
              openingPurchaseCost: {
                $sum: {
                  $cond: [
                    { $and: [
                      { $eq: ["$entryType", "Purchase"] },
                      { $gte: ["$totalCost", 0] },
                      { $in: ["$productId", productIds] }
                    ]},
                    { $cond: [
                      { $isNumber: "$totalCost" },
                      "$totalCost",
                      { $toDouble: "$totalCost" }
                    ]},
                    0
                  ]
                }
              },
            }
          }
        ]
      };

      const result = await fetchServer('POST', query, 'aggregateDocs', server);
      return result.record?.[0] || {openingStock: 0, openingStockCost: 0, openingStockForSales: 0, openingPurchaseCost: 0};
    } catch (error) {
      setAlertState('error');
      setAlert(`Error fetching opening stock data. Please try again.`);
      setAlertTimeout(5000)
      return {openingStock: 0, openingStockCost: 0, openingStockForSales: 0, openingPurchaseCost: 0};
    }
  }, [company, fetchServer]);

  // Helper function to fetch transactions data
  const fetchTransactionsData = useCallback(async (startDate, endDate, filters) => {
    try {
      // Format dates to match the database format (ISO strings)
      const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
      const formattedEndDate = new Date(endDate).toISOString().split('T')[0];
      
      // Build the transactions query
      const transactionsQuery = {
        database: company,
        collection: 'InventoryTransactions',
        prop: {
          $expr: {
            $and: [
              { $gte: ["$postingDate", formattedStartDate] },
              { $lte: ["$postingDate", formattedEndDate] }
            ],
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
          totalSales: 1,
          productRef: 1,
          quantity: 1,
          referenceNo: 1,
          orderNumber: 1,
          createdAt: 1
        },
        sort: { postingDate: 1 },
        // skip: (filters.page - 1) * filters.limit,
        // limit: filters.limit
      };

      // Fetch data in parallel
      const [transactionsResp] = await Promise.all([
        fetchServer('POST', transactionsQuery, 'getDocsDetails', server),
      ]);

      // Process transactions
      const transactions = transactionsResp?.record || [];

      // Mirror into IndexedDB inventoryTransactions store for Offline Debug Panel
      try {
        if (company && companyRecord?.emailid && Array.isArray(transactions)) {
          await putInventoryTransactions(company, companyRecord.emailid, transactions);
        }
      } catch (e) {
        console.warn('fetchTransactionsData: putInventoryTransactions failed', e);
      }
      
      // Initialize summary data with default values
      const summaryData = {
        // Quantities
        openingStock: 0,
        closingStock: 0,
        purchases: 0,
        sales: 0,
        transfersIn: 0,
        transfersOut: 0,
        positiveAdjustments: 0,
        negativeAdjustments: 0,
        
        // Cost Values
        openingStockCost: 0,
        closingStockCost: 0,
        purchasesCost: 0,
        salesValue: 0,
        costOfGoodsSold: 0,
        transfersInCost: 0,
        transfersOutCost: 0,
        positiveAdjustmentsCost: 0,
        negativeAdjustmentsCost: 0,
        averageCost: 0,
        
        // Totals
        totalIn: 0,
        totalOut: 0,
        totalInCost: 0,
        totalOutCost: 0
      };

      products.forEach(product => {
        summaryData.openingStock += product.stockSummary?.openingQuantity || 0;
        summaryData.purchases += product.stockSummary?.purchasedQty || 0;
        summaryData.sales += product.stockSummary?.soldQty || 0;
        summaryData.transfersIn += product.stockSummary?.transferInQty || 0;
        summaryData.transfersOut += product.stockSummary?.transferOutQty || 0;
        summaryData.positiveAdjustments += product.stockSummary?.positiveAdjustmentQty || 0;
        summaryData.negativeAdjustments += product.stockSummary?.negativeAdjustmentQty || 0;
        summaryData.closingStock += product.stockSummary?.closingQty || 0;

        summaryData.openingStockCost += product.stockSummary?.openingCost || 0;
        summaryData.closingStockCost += product.stockSummary?.closingCost || 0;
        summaryData.purchasesCost += product.stockSummary?.purchaseCost || 0;
        summaryData.salesValue += product.stockSummary?.salesValue || 0;
        summaryData.costOfGoodsSold += product.stockSummary?.costOfGoodsSold || 0;
        summaryData.transfersInCost += product.stockSummary?.transferInCost || 0;
        summaryData.transfersOutCost += product.stockSummary?.transferOutCost || 0;
        summaryData.positiveAdjustmentsCost += product.stockSummary?.positiveAdjustmentCost || 0;
        summaryData.negativeAdjustmentsCost += product.stockSummary?.negativeAdjustmentCost || 0;
        summaryData.averageCost += product.stockSummary?.averageCost || 0;
      })
    
      return {
        transactions,
        summaryData
      };
    } catch (error) {
      // Return empty data structure on error
      setAlertState('error');
      setAlert('Failed to load transactions. Please try again.');
      setAlertTimeout(5000)
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
  }, [company, fetchServer, products]);

  const fetchTransactionHistory = useCallback(async () => {
    if (!company) return;

    setLoading(true);

    try {
      const cached = await getTxCached(company, filters);
      if (cached && Array.isArray(cached.transactions) && cached.summary) {
        applyTxSnapshot(cached);
        setLoading(false);

        (async () => {
          try {
            const [openingBalance, transactionsData] = await Promise.all([
              getOpeningBalance(filters.startDate, filters.location, filters.productId),
              fetchTransactionsData(filters.startDate, filters.endDate, filters)
            ]);

            const { transactions: fetchedTransactions, totalCount, summaryData } = transactionsData;

            const transfersInCost = (summaryData.transfersInCost || 0);
            const transfersOutCost = (summaryData.transfersOutCost || 0);
            const positiveAdjustmentsCost = (summaryData.positiveAdjustmentsCost || 0);
            const negativeAdjustmentsCost = (summaryData.negativeAdjustmentsCost || 0);

            const netTransferCost = transfersInCost + transfersOutCost;
            const netAdjustmentCost = positiveAdjustmentsCost + negativeAdjustmentsCost;

            let runningBalance = summaryData.closingStock;
            const enrichedTransactions = (fetchedTransactions || []).map(tx => {
              const quantity = Number(tx.baseQuantity) || 0;
              runningBalance -= quantity;

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

            const summaryForState = {
              openingStock: summaryData.openingStock,
              purchases: summaryData.purchases,
              sales: summaryData.sales,
              transfersIn: summaryData.transfersIn,
              transfersOut: summaryData.transfersOut,
              positiveAdjustments: summaryData.positiveAdjustments,
              negativeAdjustments: summaryData.negativeAdjustments,
              closingStock: summaryData.closingStock,
              openingStockCost: summaryData.openingStockCost || 0,
              purchasesCost: summaryData.purchasesCost || 0,
              salesValue: summaryData.salesValue || 0,
              costOfGoodsSold: summaryData.costOfGoodsSold || 0,
              transfersInCost: transfersInCost || 0,
              transfersOutCost: transfersOutCost || 0,
              positiveAdjustmentsCost: positiveAdjustmentsCost || 0,
              negativeAdjustmentsCost: negativeAdjustmentsCost || 0,
              closingStockCost: summaryData.closingStockCost || 0,
              netTransferCost,
              netAdjustmentCost,
            };

            setTransactions(enrichedTransactions);
            setTotalCount(totalCount);
            setSummary(summaryForState);
            setTxCached(company, filters, {
              transactions: enrichedTransactions,
              summary: summaryForState,
              totalCount,
            });
          } catch (e) {
            console.warn('Background refresh of transaction history failed', e);
          }
        })();

        return;
      }
    } catch (e) {
      console.warn('TransactionHistory cache lookup failed', e);
    }

    try {
      const [openingBalance, transactionsData] = await Promise.all([
        getOpeningBalance(filters.startDate, filters.location, filters.productId),
        fetchTransactionsData(filters.startDate, filters.endDate, filters)
      ]);

      const { transactions: fetchedTransactions, totalCount, summaryData } = transactionsData;

      const transfersInCost = (summaryData.transfersInCost || 0);
      const transfersOutCost = (summaryData.transfersOutCost || 0);
      const positiveAdjustmentsCost = (summaryData.positiveAdjustmentsCost || 0);
      const negativeAdjustmentsCost = (summaryData.negativeAdjustmentsCost || 0);

      const netTransferCost = transfersInCost + transfersOutCost;
      const netAdjustmentCost = positiveAdjustmentsCost + negativeAdjustmentsCost;

      let runningBalance = summaryData.closingStock;
      const enrichedTransactions = (fetchedTransactions || []).map(tx => {
        const quantity = Number(tx.baseQuantity) || 0;
        runningBalance -= quantity;

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

      const summaryForState = {
        openingStock: summaryData.openingStock,
        purchases: summaryData.purchases,
        sales: summaryData.sales,
        transfersIn: summaryData.transfersIn,
        transfersOut: summaryData.transfersOut,
        positiveAdjustments: summaryData.positiveAdjustments,
        negativeAdjustments: summaryData.negativeAdjustments,
        closingStock: summaryData.closingStock,
        openingStockCost: summaryData.openingStockCost || 0,
        purchasesCost: summaryData.purchasesCost || 0,
        salesValue: summaryData.salesValue || 0,
        costOfGoodsSold: summaryData.costOfGoodsSold || 0,
        transfersInCost: transfersInCost || 0,
        transfersOutCost: transfersOutCost || 0,
        positiveAdjustmentsCost: positiveAdjustmentsCost || 0,
        negativeAdjustmentsCost: negativeAdjustmentsCost || 0,
        closingStockCost: summaryData.closingStockCost || 0,
        netTransferCost,
        netAdjustmentCost,
      };

      setTransactions(enrichedTransactions);
      setTotalCount(totalCount);
      setSummary(summaryForState);
      setTxCached(company, filters, {
        transactions: enrichedTransactions,
        summary: summaryForState,
        totalCount,
      });

    } catch (error) {
      console.log(error);
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
    getTxCached,
    setTxCached,
    applyTxSnapshot,
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
        'Running Balance': tx.formattedBalance,
        'Quantity': tx.formattedQuantity,
        'Unit Cost': tx.formattedCost,
        'Total Cost': tx.formattedTotalCost,
        'Reference': tx.reference
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
      'Running Balance': tx.runningBalance || 0,
      'Quantity': tx.baseQuantity,
      'Unit Cost': tx.costPrice || 0,
      'Total Cost': tx.totalCost ? Math.abs(Number(tx.totalCost)) : 0,
      'Reference': tx.referenceNo || tx.orderNumber || tx.documentType || 'N/A',
    }));
  }, [transactions, getTransactionType]);

  useEffect(()=>{
    if (products.length){
      handleApplyFilters()
    }
  },[company])
  // Fetch initial data and when filters change
  useEffect(() => {
    if (products.length){
      if (!products[0].hasOwnProperty('stockSummary')){
        handleApplyFilters() 
      }else{
        fetchTransactionHistory()
      }
    }
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    } 
    
    const timer = setTimeout(() => {
      fetchTransactionHistory();
    }, 300); // Small debounce to prevent rapid successive calls
    
    return () => clearTimeout(timer);
  }, [company,products]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handleApplyFilters = () => {   

    setLoading(true);
    const { startDate, endDate, location, productId, transactionType } = filters;
    // Format dates to ISO strings (YYYY-MM-DD)
    // This ensures compatibility with the database date format
    const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
    const formattedEndDate = new Date(endDate).toISOString().split('T')[0];

    // Trigger the stock report (which has its own caching in App.js)
    getProductsStockReport(company, products, {
      startDate: formattedStartDate, 
      endDate: formattedEndDate,
      ...(location !== 'all' && { location }),
      ...(productId && { productId }),
      ...(transactionType !== 'all' && { transactionType })
    });

    // Also refresh the transaction history; this will read from cache again
    // and then fetch fresh data to update cache + UI.
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

  // Modal component
  const DetailModal = ({ show, onClose, data, title, type, summary, startDate, endDate }) => {
    if (!show || !data) return null;
    
    const { totalQuantity, totalValue, totalCost, averageUnitCost } = summary || {};
    
    const handleExportPDF = () => {
      exportToPDF(title, type, data, summary, startDate, endDate);
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{title}</h3>
            <div className="modal-actions">
              <button 
                className="export-pdf-button"
                onClick={handleExportPDF}
                title="Export to PDF"
              >
                <FaFilePdf /> Export PDF
              </button>
              <button className="close-button" onClick={onClose}>&times;</button>
            </div>
          </div>
          
          <div className="modal-body">
            <table className="table table-striped table-hover table-sm">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-end">Quantity</th>
                  <th className="text-end">% of Total</th>
                  {type === 'sales' && <th className="text-end">Total Value</th>}
                  {type === 'sales' && <th className="text-end">% of Value</th>}
                  <th className="text-end">Unit Cost</th>
                  <th className="text-end">Total Cost</th>
                  <th className="text-end">% of Cost</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((product) => (
                  <tr key={product.productId}>
                    <td>
                      <div className="fw-bold">{product.productName}</div>
                      <div className="text-muted small">
                        {product.locations?.map((loc, idx) => (
                          <div key={idx}>
                            {loc.name}: {formatNumber(loc.quantity)} ({loc.percentage?.toFixed(1)}%)
                          </div>
                        ))}
                      </div> 
                    </td>
                    <td className="text-end">{formatNumber(product.quantity)}</td>
                    <td className="text-end">{product.percentage?.toFixed(1)}%</td>
                    {type === 'sales' && <td className="text-end">{formatCurrency(product.value)}</td>}
                    {type === 'sales' && <td className="text-end">{product.valuePercentage?.toFixed(1)}%</td>}
                    <td className="text-end">{formatCurrency(product.unitCost)}</td>
                    <td className="text-end">{formatCurrency(product.cost)}</td>
                    <td className="text-end">
                      {product.costPercentage?.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-group-divider">
                <tr className="table-active">
                  <th>Total</th>
                  <th className="text-end">{formatNumber(totalQuantity || 0)}</th>
                  <th className="text-end">100%</th>
                  {type === 'sales' && <td className="text-end">{formatCurrency(totalValue || 0)}</td>}
                  {type === 'sales' && <td className="text-end">100%</td>}
                  <th className="text-end">{formatCurrency(averageUnitCost || 0)}</th>
                  <th className="text-end">{formatCurrency(totalCost || 0)}</th>
                  <th className="text-end">100%</th>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Remove the duplicate handleSummaryCardClick function

  return (
    <div className="transaction-history">
      <DetailModal 
        show={modalData.show}
        onClose={() => setModalData(prev => ({ ...prev, show: false }))}
        data={modalData.data}
        title={modalData.title}
        type={modalData.type}
        summary={modalData.summary}
        startDate={filters.startDate}
        endDate={filters.endDate}
      />
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
            <option value="Purchase">Purchase</option>
            <option value="Sales">Sales</option>
            <option value="Transfer Shipment">Transfer Out</option>
            <option value="Transfer Receipt">Transfer In</option>
            <option value="Positive Entry">Positive Adjustment</option>
            <option value="Nagative Entry">Negative Adjustment</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Product</label>
          <select
            name="productId"
            value={filters.productId}
            onChange={handleFilterChange}
            className="select-input"
          >
            <option value="">All Products</option>
            {products.map(product => (
              <option key={product.i_d} value={product.i_d}>
                {product.name} ({product.i_d})
              </option>
            ))}
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
        {/* Opening Stock */}
        <div className="summary-card clickable" onClick={() => handleSummaryCardClick('openingStock')}>
          <div className="summary-label">Opening Stock</div>
          <div className="summary-value">{formatNumber(summary.openingStock)}</div>
          <div className="summary-subtext">
            <div>Cost: ₦{formatNumber(summary.openingStockCost)}</div>
          </div>
        </div>

        {/* Purchases */}
        <div className="summary-card in clickable" onClick={() => handleSummaryCardClick('purchases')}>
          <div className="summary-label">Purchases</div>
          <div className="summary-value">+{formatNumber(summary.purchases)}</div>
          <div className="summary-subtext">
            <div>Cost: ₦{formatNumber(summary.purchasesCost)}</div>
          </div>
        </div>

        {/* Sales */}
        <div className="summary-card out clickable" onClick={() => handleSummaryCardClick('sales')}>
          <div className="summary-label">Sales</div>
          <div className="summary-value">{formatNumber(summary.sales)}</div>
          <div className="summary-subtext">
            <div>Value: ₦{formatNumber(summary.salesValue)}</div>
            <div>COGS: ₦{formatNumber(summary.costOfGoodsSold)}</div>
          </div>
        </div>

        {/* Transfers */}
        <div className="summary-card clickable" onClick={() => handleSummaryCardClick('transfers')}>
          <div className="summary-label">Transfers</div>
          <div className="summary-value">
            <div className="transfer-row">
              <span className="transfer-in">+{formatNumber(summary.transfersIn)}</span>
              <span className="transfer-separator">/</span>
              <span className="transfer-out">{formatNumber(summary.transfersOut)}</span>
            </div>
          </div>
          <div className="summary-subtext">
            <div>In: ₦{formatNumber(summary.transfersInCost)}</div>
            <div>Out: ₦{formatNumber(summary.transfersOutCost)}</div>
            <div>Net: ₦{formatNumber(summary.netTransferCost)}</div>
          </div>
        </div>

        {/* Adjustments */}
        <div className="summary-card clickable" onClick={() => handleSummaryCardClick('adjustments')}>
          <div className="summary-label">Adjustments</div>
          <div className="summary-value">
            <div className="adjustment-row">
              <span className="adjustment-positive">+{formatNumber(summary.positiveAdjustments)}</span>
              <span className="adjustment-separator">/</span>
              <span className="adjustment-negative">{formatNumber(summary.negativeAdjustments)}</span>
            </div>
          </div>
          <div className="summary-subtext">
            <div>Pos: ₦{formatNumber(summary.positiveAdjustmentsCost)}</div>
            <div>Neg: ₦{formatNumber(summary.negativeAdjustmentsCost)}</div>
            <div>Net: ₦{formatNumber(summary.netAdjustmentCost)}</div>
          </div>
        </div>

        {/* Closing Stock */}
        <div className="summary-card total clickable" onClick={() => handleSummaryCardClick('closingStock')}>
          <div className="summary-label">Closing Stock</div>
          <div className="summary-value">
            {formatNumber(summary.closingStock)}
          </div>
          <div className="summary-subtext">
            <div>Cost: ₦{formatNumber(summary.closingStockCost)}</div>
            <div>Avg. Cost: ₦{summary.closingStock > 0 ? formatNumber(summary.closingStockCost / summary.closingStock) : '0'}</div>
          </div>
        </div>
      </div>

      <div className="transactions-table-container">
        <div className="table-header">
          <h3>Transaction History</h3>
          {(companyRecord?.status === 'admin' || companyRecord?.permissions.includes('export_inventory_report')) &&<div className="table-actions">
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
          </div>}
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
                <th>Running Balance</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Total Cost</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {loading && transactions.length === 0 ? (
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
                    <td>{tx.name || `${(products.find(product => product.i_d === tx.productId))?.name} (${tx.productId})` || `Product ${tx.productId}`}</td>
                    <td>{tx.location || 'N/A'}</td>
                    <td>{tx.runningBalance?.toLocaleString() || 'N/A'}</td>
                    <td className={tx.baseQuantity > 0 ? 'positive' : 'negative'}>
                      {tx.baseQuantity > 0 ? '+' : ''}{tx.baseQuantity}
                    </td>
                    <td>{tx.costPrice ? `₦${Number(tx.costPrice).toLocaleString()}` : 'N/A'}</td>
                    <td>{tx.totalCost ? `₦${Math.abs(Number(tx.totalCost)).toLocaleString()}` : 'N/A'}</td>
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
