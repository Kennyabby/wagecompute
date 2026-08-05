import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
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
    setFilteredSessions,
    orders = [],
    tables = [],
    employees = [],
    onClose,
    wrhCategories,
    fetchSessionsByRange,
    fetchOrdersByRange,
    // Deep-link from the General Ledger table (Journals module) — see
    // PointOfSales.js's glDeepLink / Delivery.js's equivalent wiring.
    // initialOrderId auto-expands that order's session + the order card
    // itself once loaded; initialSessionSourceId does the same for a
    // session matched by _id/i_d/start (POS-session-shortage GL rows,
    // which don't carry a clean order id). initialDateHint widens the
    // default "today only" filter window so a historical entry is even in
    // the loaded range to begin with.
    initialOrderId = null,
    initialSessionSourceId = null,
    initialDateHint = null,
}) => {
    const {
        company, server, fetchServer, user, companyRecord, allowBacklogs,
        paymentReceipts, getPosOrders, fetchSessions, paymentMethods,
        setAlert, setAlertState, setAlertTimeout
    } = useContext(ContextProvider);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedSessions, setExpandedSessions] = useState({});
    const [showReceiptsModal, setShowReceiptsModal] = useState(false)
    const [payPointAccounts, setPayPointAccounts] = useState({})
    const [glDeepLinkApplied, setGlDeepLinkApplied] = useState(false)
    // Populated by ref callbacks on each session/order card as they render
    // (session.i_d / order._id -> DOM node) — used only to scroll the
    // deep-link target into view once it exists; not used for anything
    // else, so a plain mutable ref (not state) is correct here.
    const sessionCardRefs = useRef({})
    const orderCardRefs = useRef({})
    const [glDeepLinkScrollTarget, setGlDeepLinkScrollTarget] = useState(null)

    // Temporary, unconditional diagnostic — logs exactly what this component
    // received on mount, regardless of any later gating logic, so we can
    // tell definitively whether the deep-link props are even arriving here
    // at all before chasing anything further downstream.
    useEffect(() => {
        console.warn('[GL deep-link] TransactionReports mounted with:', { initialOrderId, initialSessionSourceId, initialDateHint })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const initialDateRange = (() => {
        if (!initialDateHint) return null;
        const target = new Date(`${initialDateHint}T00:00:00`);
        if (Number.isNaN(target.getTime())) return null;
        // A few days of buffer either side — a shortage/recovery event's own
        // date can differ slightly from the GL posting date, and this is
        // cheap since it's just widening a client-side filter window.
        const start = new Date(target); start.setDate(start.getDate() - 3); start.setHours(0, 0, 0, 0);
        const end = new Date(target); end.setDate(end.getDate() + 3); end.setHours(23, 59, 59, 999);
        return { start, end };
    })();

    // State for filters
    const [filters, setFilters] = useState({
        startDate: initialDateRange ? initialDateRange.start : new Date(new Date().setHours(0, 0, 0, 0)),
        endDate: initialDateRange ? initialDateRange.end : new Date(new Date().setHours(23, 59, 59, 999)),
        sessionId: '',
        handlerId: '',
        wrh: '',
        employee_id: '',
        table_name: '',
        orderNumber: '',
        status: '',
        delivery: '',
        category: '',
        lastDeliveredBy: ''
    });

    // Non-admin date restriction: compute yesterday start and today end bounds
    const isNonAdmin = companyRecord?.status !== 'admin' && !allowBacklogs;
    const getNonAdminDateBounds = () => {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        return {
            minDate: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0),
            maxDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
        };
    };

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
            handlers: Array.from(employeeIds),
            tableNames,
            statuses: statuses.length ? statuses : ['pending', 'completed', 'cancelled'],
            deliveryStatuses: deliveryStatuses.length ? deliveryStatuses : ['pending', 'compeleted', 'cancelled'],
            employeeIds: Array.from(employeeIds),
            sessionOperators: Array.from(sessionOperators)
        };
    }, [sessions, orders]);

    useEffect(() => {
        const payPoints = paymentMethods.reduce((obj, method) => {
            if (method.name !== 'cash') {
                obj[method.name] = `${method.i_d}-${method.account}`
            } else {
                obj[method.name] = `${method.i_d}`
            }
            return obj
        }, {})
        setPayPointAccounts({ ...payPoints, 'Employee': 'EMPLOYEE' })
    }, [paymentMethods])

    // Clamp date filters for non-admin users to yesterday–today on mount —
    // but never when a GL "Go to source" deep-link pointed at a specific
    // historical date, or this clamp silently overwrites that target date
    // with "today" right after mount and the session/order it's trying to
    // reach can never be found (this was a real, confirmed bug: the deep
    // link's initialDateRange was being reset before the auto-expand effect
    // below ever got a chance to run against the right window).
    useEffect(() => {
        if (isNonAdmin && !initialDateRange) {
            const { minDate, maxDate } = getNonAdminDateBounds();
            setFilters(prev => ({
                ...prev,
                startDate: minDate,
                endDate: maxDate
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyRecord, allowBacklogs]);

    // Belt-and-suspenders re-assertion of the deep-link's date window: the
    // useState(initialDateRange...) initializer above only ever runs once,
    // the very first time this component mounts — if initialDateHint arrives
    // a render late for any reason (or another effect resets the filters
    // first), the target date would silently never take effect and the
    // auto-expand below would have nothing to find. Runs once, guarded by
    // glDeepLinkApplied so it doesn't fight the user's own date changes
    // afterward.
    useEffect(() => {
        if (glDeepLinkApplied || !initialDateRange) return;
        setFilters(prev => ({ ...prev, startDate: initialDateRange.start, endDate: initialDateRange.end }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialDateHint]);

    useEffect(()=>{
        const dateRange = {
            start: filters.startDate,
            end: filters.endDate
        }

        fetchSessionsByRange(dateRange)
        fetchOrdersByRange(dateRange)

    },[filters.startDate, filters.endDate])
    // Detect Duplicate Orders
    const getDuplicates = (array, prop) => {
        const groupedByProp = array.reduce((acc, elem) => {
            const key = elem[prop];

            if (!acc[key]) {
                acc[key] = [];
            }

            acc[key].push(elem);
            return acc;
        }, {})
        const groupKeys = Object.keys(groupedByProp)
        const duplicateGroups = {}
        let duplicateCount = 0
        groupKeys.forEach((key) => {
            if (groupedByProp[key].length > 1) {
                duplicateGroups[key] = groupedByProp[key]
                duplicateCount += groupedByProp[key].length - 1
            }
        })
        return { duplicates: duplicateGroups, count: duplicateCount }
    }

    const deleteDuplicates = async (duplicateGroups, type) => {
        let toDelete = []
        let toInspect = []
        Object.keys(duplicateGroups).forEach((key) => {
            if (type === 'order') {
                toInspect = []
                let ct = 0
                duplicateGroups[key].forEach((elem) => {
                    if (elem.delivery === 'pending' && elem.status === 'pending') {
                        toInspect.push(elem)
                    } else {
                        ct++
                    }
                })
                if (ct) {
                    toDelete = toDelete.concat(toInspect)
                } else {
                    toInspect = []
                }
            }
            if (!toInspect.length) {
                duplicateGroups[key].forEach((elem, i) => {
                    if (i) {
                        toDelete.push(elem)
                    }
                })
            }
        })

        // console.log(toDelete)
        const confirmDelete = window.confirm(
            `Delete ${toDelete.length} duplicate ${type}${toDelete.length > 1 ? 's' : ''}?`
        );
        if (!confirmDelete) return;

        try {
            setAlertState('info')
            setAlert(`Deleting duplicate ${type}${toDelete.length > 1 ? 's' : ''}`)
            setAlertTimeout(100000)

            let dct = 0
            for (const elem of toDelete) {
                dct++
                const filter = {}
                const resp = await fetchServer(
                    'POST',
                    {
                        database: company,
                        collection: type === 'order' ? 'Orders' : 'POSSessions',
                        update: { _id: elem._id },
                    },
                    'removeDoc',
                    server
                );

                if (resp && resp.err) {
                    throw new Error(resp.mess || 'Failed to delete one of the duplicates');
                }

                setAlertState('success')
                setAlert(`Deleted ${dct}/${toDelete.length}`)
                setAlertTimeout(100000)
            }


            setAlertState('success');
            setAlert('duplicates deleted successfully');
            setAlertTimeout(1000);
        } catch (error) {
            console.error('Duplicate delete failed', error);
            setAlertState('error');
            setAlert('Failed to delete one or more duplicates');
            setAlertTimeout(2000);
        } finally {
            getPosOrders({ company, companyRecord })
            fetchSessions(company, "sales", companyRecord)
            fetchSessions(company, "delivery", companyRecord)
        }
    }

    // Process and filter data
    const processedData = useMemo(() => {
        if (!sessions || !sessions.length) return [];
        let result = [];
        // Process sessions with their orders
        sessions.forEach(session => {
            // Skip invalid sessions
            if (!session || !session.i_d) return;

            let initSessionOrders = orders || []
            if (!initSessionOrders.length) {
                initSessionOrders = session?.orders || []
            }

            let sessionOrders = initSessionOrders.filter(order =>
                order.sessionId === session.i_d
            );

            const sessionData = {
                ...session,
                orders: sessionOrders?.length ? sessionOrders : (session?.order || []),
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
            // Date filter - handle null dates (clamp for non-admin users)
            let effectiveStartDate = filters.startDate;
            let effectiveEndDate = filters.endDate;
            if (isNonAdmin) {
                const { minDate, maxDate } = getNonAdminDateBounds();
                if (effectiveStartDate && effectiveStartDate < minDate) effectiveStartDate = minDate;
                if (effectiveEndDate && effectiveEndDate > maxDate) effectiveEndDate = maxDate;
            }
            if (effectiveStartDate && (!session.startDate || new Date(session.startDate) < effectiveStartDate)) {
                return false;
            }
            if (effectiveEndDate && (!session.startDate || new Date(session.startDate) > effectiveEndDate)) {
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

                // Placecd by filter - case-insensitive partial match
                if (filters.handlerId &&
                    !order.handlerId?.toLowerCase().includes(filters.handlerId.toLowerCase())) {
                    return false;
                }

                return true;
            })
        }));

        setFilteredSessions(result)
        return result;
    }, [sessions, orders, filters]);

    // Auto-expand the session/order a GL table "Go to source" link pointed
    // at, once its data has actually loaded (widening the date filter above
    // only fetches it — the match itself has to wait for that data to
    // arrive). Runs once; glDeepLinkApplied stops it from re-fighting the
    // user if they manually collapse the card afterward.
    useEffect(() => {
        if (glDeepLinkApplied) return;
        if (!initialOrderId && !initialSessionSourceId) return;

        let matchedOrder = null;
        let matchedSession = null;
        if (initialOrderId) {
            matchedOrder = (orders || []).find((o) => String(o._id) === String(initialOrderId));
            if (matchedOrder) {
                setExpandedSessions((prev) => ({
                    ...prev,
                    [matchedOrder.sessionId]: true,
                    [`order-${matchedOrder._id}`]: true,
                }));
                setGlDeepLinkApplied(true);
                // Scrolling has to wait for the order card to actually be in
                // the DOM, which only happens once its session is expanded
                // (a render or two after the state update above) — the
                // scroll effect below polls for the ref rather than trying
                // to scroll synchronously here.
                setGlDeepLinkScrollTarget(matchedOrder._id);
            }
        } else if (initialSessionSourceId) {
            matchedSession = (sessions || []).find((s) => (
                String(s._id) === String(initialSessionSourceId)
                || String(s.i_d) === String(initialSessionSourceId)
                || String(s.start) === String(initialSessionSourceId)
            ));
            if (matchedSession) {
                setExpandedSessions((prev) => ({ ...prev, [matchedSession.i_d]: true }));
                setGlDeepLinkApplied(true);
                setGlDeepLinkScrollTarget(matchedSession.i_d);
            }
        }

        // Temporary diagnostic: logs on every orders/sessions update (not
        // just once) so the actual progression — empty on first render,
        // then populated, then match-or-no-match — is visible in the
        // console, instead of a single snapshot that could catch the
        // arrays before they've finished loading.
        const targetId = initialOrderId || initialSessionSourceId;
        console.warn('[GL deep-link] match attempt', {
            targetId,
            lookingFor: initialOrderId ? 'order._id' : 'session._id/i_d/start',
            found: Boolean(matchedOrder || matchedSession),
            ordersLoaded: orders?.length || 0,
            sessionsLoaded: sessions?.length || 0,
            sampleOrderIds: (orders || []).slice(0, 5).map(o => o._id),
            sampleSessionIds: (sessions || []).slice(0, 5).map(s => ({ _id: s._id, i_d: s.i_d, start: s.start })),
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders, sessions, initialOrderId, initialSessionSourceId, glDeepLinkApplied]);

    // Scrolls the deep-link target into view once its card actually exists
    // in the DOM. Deliberately no dependency array — it needs to re-check
    // on every render because expanding a session is what makes the order
    // card's own ref exist in the first place, and that happens a render
    // (or a few, given nested expand state) after glDeepLinkScrollTarget is
    // set above; polling on every render until the ref shows up is simpler
    // and more robust here than trying to predict exactly which render.
    useEffect(() => {
        if (!glDeepLinkScrollTarget) return;
        const el = orderCardRefs.current[glDeepLinkScrollTarget] || sessionCardRefs.current[glDeepLinkScrollTarget];
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('gl-deep-link-highlight');
        setGlDeepLinkScrollTarget(null);
    });

    // Separate, once-only on-screen alert — fires 5s after mount (giving the
    // fetch a chance to land) if still no match, so there's a visible signal
    // even if nobody happens to have devtools open, without spamming a toast
    // on every one of the console-logged attempts above.
    //
    // glDeepLinkAppliedRef mirrors the glDeepLinkApplied state on every
    // render — the timeout callback below reads the ref, not the state
    // variable, because this effect intentionally has an empty dependency
    // array (it should only ever schedule once) and a plain closure over
    // glDeepLinkApplied would freeze at its value from the very first
    // render (false) forever, firing this alert even after a real match
    // succeeded moments later. This was a real bug — confirmed live: the
    // match-attempt log showed found:true, yet this alert still fired.
    const glDeepLinkAppliedRef = useRef(glDeepLinkApplied)
    useEffect(() => { glDeepLinkAppliedRef.current = glDeepLinkApplied }, [glDeepLinkApplied])

    useEffect(() => {
        if (!initialOrderId && !initialSessionSourceId) return;
        const timer = setTimeout(() => {
            if (glDeepLinkAppliedRef.current) return;
            const targetId = initialOrderId || initialSessionSourceId;
            setAlertState('error')
            setAlert(`Could not auto-locate the linked ${initialOrderId ? 'order' : 'session'} (id ${targetId}) among ${orders?.length || 0} loaded orders / ${sessions?.length || 0} loaded sessions. See browser console for the [GL deep-link] logs.`)
            setAlertTimeout(8000)
        }, 5000)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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
        let ct = 0
        let val = ''
        paymentMethods.forEach((pay) => {
            if (order[pay.name] > 0) {
                ct++
                val = pay.name
                return pay.name?.toUpperCase();
            }
        })
        if (!ct) {
            return 'N/A';
        } else {
            return val
        }
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
                                    onChange={(date) => {
                                        if (!date) return;
                                        if (isNonAdmin) {
                                            const { minDate, maxDate } = getNonAdminDateBounds();
                                            if (date < minDate) date = minDate;
                                            if (date > maxDate) date = maxDate;
                                        }
                                        setFilters(prev => ({ ...prev, startDate: date }));
                                    }}
                                    selectsStart
                                    startDate={filters.startDate}
                                    endDate={filters.endDate}
                                    minDate={isNonAdmin ? getNonAdminDateBounds().minDate : undefined}
                                    maxDate={isNonAdmin ? getNonAdminDateBounds().maxDate : new Date()}
                                    className="date-input"
                                    dateFormat="MMM d, yyyy"
                                    isClearable={!isNonAdmin}
                                    placeholderText="Start date"
                                />
                                <span className="date-range-separator">to</span>
                                <DatePicker
                                    selected={filters.endDate}
                                    onChange={(date) => {
                                        if (!date) return;
                                        if (isNonAdmin) {
                                            const { minDate, maxDate } = getNonAdminDateBounds();
                                            if (date < minDate) date = minDate;
                                            if (date > maxDate) date = maxDate;
                                        }
                                        setFilters(prev => ({ ...prev, endDate: date }));
                                    }}
                                    selectsEnd
                                    startDate={filters.startDate}
                                    endDate={filters.endDate}
                                    minDate={isNonAdmin ? getNonAdminDateBounds().minDate : filters.startDate}
                                    maxDate={isNonAdmin ? getNonAdminDateBounds().maxDate : new Date()}
                                    className="date-input"
                                    dateFormat="MMM d, yyyy"
                                    isClearable={!isNonAdmin}
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
                                                {`${emp.firstName || ''} ${emp.lastName || ''} (${emp.i_d})`.trim() || `Employee ${emp.i_d}`}
                                            </option>
                                        ) : null;
                                    })}
                                </select>
                            </div>
                        )}
                        {filterOptions.employeeIds.length > 0 && (
                            <div className="filter-group">
                                <label>Placed By</label>
                                <select
                                    value={filters.handlerId}
                                    onChange={(e) => setFilters(prev => ({ ...prev, handlerId: e.target.value }))}
                                    className="filter-select"
                                >
                                    <option value="">All Handlers</option>
                                    {filterOptions.handlers.map(empId => {
                                        const emp = employees.find(e => e.i_d === empId);
                                        return emp ? (
                                            <option key={emp.i_d} value={emp.i_d}>
                                                {`${emp.firstName || ''} ${emp.lastName || ''} (${emp.i_d})`.trim() || `Employee ${emp.i_d}`}
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
            const { duplicates, count } = getDuplicates(session.orders, 'orderNumber')

            return (
                <div key={session.i_d} className="session-card" ref={(el) => { if (el) sessionCardRefs.current[session.i_d] = el; }}>
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
                                            <FaUser /> {`${getEmployeeName(session.employee_id)} (${session.employee_id})` || 'N/A'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="session-header-main">
                                <h3 style={{ marginTop: '8px' }}>Entered Closing Record:</h3>
                                <div className="session-meta">
                                    {paymentMethods.map((pay) => {
                                        return (
                                            <span className="session-date">
                                                {`${pay.i_d}: ${(session[pay.name] || 0).toLocaleString()}`}
                                            </span>
                                        )
                                    })}
                                    <span className="session-date">
                                        {`CASH CHANGE: ${(session.totalCashChange || 0).toLocaleString()}`}
                                    </span>
                                    <span className='session-date'>
                                        {`TOTAL: ${(paymentMethods.reduce((sum, pay) => {
                                            return sum + Number(session[pay.name] || 0)
                                        }, 0)).toLocaleString()}`}
                                    </span>
                                </div>
                            </div>
                            <div className="session-header-main">
                                <h3 style={{ marginTop: '8px' }}>Debts:</h3>
                                <div className="session-meta">
                                    <span className="session-date">
                                        {`SALES DEBT: ${(session.debtDue || 0).toLocaleString()}`}
                                    </span>
                                    <span className="session-date">
                                        {`PENDING: ${(session.pendingSales || 0).toLocaleString()}`}
                                    </span>
                                    <span className="session-date">
                                        {`UNACCOUNTED: ${(session.unAccountedSales || 0).toLocaleString()}`}
                                    </span>
                                    <span className="session-date">
                                        {`TOTAL DEBT: ${(Number(session.debtDue || 0) + Number(session.pendingSales || 0) + Number(session.unAccountedSales || 0)).toLocaleString()}`}
                                    </span>
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
                                            <div key={order._id} className="order-card" ref={(el) => { if (el) orderCardRefs.current[order._id] = el; }}>
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
                                                        <span className="order-total">
                                                            Sales {formatCurrency(order.totalSales || 0)}
                                                        </span>
                                                        <span className="order-total">
                                                            Payment {formatCurrency(order.totalPayment || 0)}
                                                        </span>
                                                    </div>
                                                    <div className="order-stats">
                                                        <span className="order-items">
                                                            <FaBoxOpen /> {order.items?.length || 0} items
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

                                                                if (order.wrh === 'vip') {
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
                                                                )
                                                            })}
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
    const { totals, salesByLocation, salesByPayPoint, sessionDuplicates } = useMemo(() => {
        const result = {
            totals: {
                totalSessions: 0,
                totalOrders: 0,
                totalSales: 0,
                totalPayment: 0,
                totalItems: 0,
                totalOrderDuplicates: 0,
                totalSessionDuplicates: 0
            },
            salesByLocation: {},
            salesByPayPoint: {},
            sessionDuplicates: {},
        };

        processedData.forEach(session => {
            result.totals.totalSessions += 1;
            const sessionOrders = session.orders?.length || 0;
            result.totals.totalOrders += sessionOrders;

            const sessionSales = session.orders.filter(order => order.status !== 'cancelled' && order.status !== 'pending')?.reduce((sum, order) => {
                const warehouse = order.wrh
                let splitPayment = {}
                if (order.salesPosts?.[Object.keys(order?.salesPosts || {})[0]] === 'multiple') {
                    const totalOrderSales = Number(order?.totalSales || 0)
                    let kct = 0
                    let bct = 0
                    order.items.forEach((item) => {
                        const totalItemPrice = (Number(item.quantity || 0) * (warehouse === 'vip' ? Number(item.vipPrice || item.salesPrice) : Number(item.salesPrice)))
                        if (wrhCategories[warehouse].includes(item.category)) {
                            bct += totalItemPrice
                        } else if (wrhCategories['kitchen'].includes(item.category)) {
                            kct += totalItemPrice
                        }
                        splitPayment[warehouse] = totalOrderSales ? (Number(bct) / totalOrderSales) : 0
                        splitPayment['kitchen'] = totalOrderSales ? (Number(kct) / totalOrderSales) : 0
                    })
                }
                Object.keys(order?.salesPosts || {})?.forEach((payPoint) => {
                    result.salesByPayPoint[payPoint] = (result.salesByPayPoint[payPoint] || 0) + Number(order[payPoint] || 0);
                    const location = order.salesPosts[payPoint]
                    if (location === 'multiple') {
                        result.salesByLocation[warehouse] = (result.salesByLocation[warehouse] || 0) + (Number(splitPayment[warehouse] || 0) * Number(order[payPoint]));
                        result.salesByLocation['kitchen'] = (result.salesByLocation['kitchen'] || 0) + (Number(splitPayment['kitchen'] || 0) * Number(order[payPoint]));
                    } else {
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

            const { count: totalDuplicateOrders } = getDuplicates(session.orders, 'orderNumber')
            result.totals.totalOrderDuplicates += totalDuplicateOrders


            // Track sales by location
            // const location = session.wrh || 'Unknown';
            // result.salesByLocation[location] = (result.salesByLocation[location] || 0) + sessionSales;

            // Track sales by pay point (assuming pay_point is a property on the session)
        });
        const { duplicates: sessionDuplicates, count: totalDuplicateSessions } = getDuplicates(sessions, 'i_d')
        result.totals.totalSessionDuplicates = totalDuplicateSessions
        result.sessionDuplicates = sessionDuplicates

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
            <PaymentReceiptsModal open={showReceiptsModal} onClose={() => setShowReceiptsModal(false)} paymentReceipts={paymentReceipts} />
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
                                onClick={() => { setShowReceiptsModal(true) }}
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
                            <span className="stat-value" style={{ fontSize: '13px' }}>Duplicates: {totals.totalSessionDuplicates}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Orders</span>
                            <span className="stat-value">{totals.totalOrders}</span>
                            <span className="stat-value" style={{ fontSize: '13px' }}>Duplicates: {totals.totalOrderDuplicates}</span>
                        </div>
                        <div className="stat-item total-amount">
                            <span className="stat-label">Total Sales</span>
                            <span className="stat-value">{formatCurrency(totals.totalSales)}</span>
                        </div>
                        <div className="stat-item total-amount">
                            <span className="stat-label">Total Payments</span>
                            <span className="stat-value">{formatCurrency(totals.totalPayment)}</span>
                        </div>
                        <div className="stat-item total-amount">
                            <span className="stat-label">Difference (P - S)</span>
                            <span className="stat-value">{formatCurrency(totals.totalPayment - totals.totalSales)}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
                            <button
                                disabled={!totals.totalOrderDuplicates}
                                className="start-value"
                                style={{ color: "black", margin: "5px", padding: "5px", borderRadius: "5px", cursor: "pointer" }}
                                onClick={() => {
                                    const { duplicates } = getDuplicates(orders, "orderNumber")
                                    deleteDuplicates(duplicates, 'order')
                                }}
                            >Clean Duplicate Orders</button>
                            <button
                                disabled={!totals.totalSessionDuplicates}
                                className="start-value"
                                style={{ color: "black", margin: "5px", padding: "5px", borderRadius: "5px", cursor: "pointer" }}
                                onClick={() => {
                                    deleteDuplicates(sessionDuplicates, 'session')
                                }}
                            >Clean Duplicate Sessions</button>
                        </div>
                    </div>

                    {/* Sales by Location and Pay Point */}
                    <div className="sales-breakdown">
                        <div className="breakdown-section">
                            <h4>Sales by Location (Payments Made)</h4>
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
