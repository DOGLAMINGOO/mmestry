import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function NotificationBell() {
    const [orders, setOrders] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const fetchOrders = async () => {
        try {
            const res = await api.get('/api/customer-orders/');
            setOrders(res.data);
        } catch (err) {
            console.error('Failed to fetch orders for notifications', err);
        }
    };

    useEffect(() => {
        fetchOrders();
        // Set up periodic polling every 5 minutes (optional, but good for ERP)
        const interval = setInterval(fetchOrders, 300000);
        return () => clearInterval(interval);
    }, []);

    // Handle clicking outside to close
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Process alerts
    const alerts = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    orders.forEach(order => {
        // Ignore orders that are already complete
        if (order.status === 'DISPATCHED' || order.status === 'CLOSED') {
            return;
        }

        const deadline = new Date(order.deadline);
        deadline.setHours(0, 0, 0, 0);
        
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Thresholds: 7 days is Warning, 3 days is Critical, < 0 is Overdue
        if (diffDays <= 7) {
            let severity = 'warning'; // yellow/orange
            if (diffDays <= 3 && diffDays >= 0) severity = 'critical'; // red
            if (diffDays < 0) severity = 'overdue'; // dark red

            alerts.push({
                ...order,
                diffDays,
                severity
            });
        }
    });

    // Sort alerts: most critical (lowest days) first
    alerts.sort((a, b) => a.diffDays - b.diffDays);

    const alertCount = alerts.length;

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            {/* Bell Icon Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                }}
            >
                {/* SVG Bell Icon */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>

                {/* Notification Badge */}
                {alertCount > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: '#ef4444',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid white',
                        fontFamily: 'Arial, sans-serif'
                    }}>
                        {alertCount > 9 ? '9+' : alertCount}
                    </div>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '320px',
                    background: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    zIndex: 1001,
                    fontFamily: 'Arial, sans-serif'
                }}>
                    <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontWeight: 'bold',
                        color: '#111827',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>Deadlines ({alertCount})</span>
                    </div>

                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        {alertCount === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                                No upcoming deadlines. You're all caught up!
                            </div>
                        ) : (
                            alerts.map(order => {
                                let badgeColor = '#f59e0b'; // warning orange
                                let badgeBg = '#fef3c7';
                                let statusText = `In ${order.diffDays} days`;

                                if (order.severity === 'critical') {
                                    badgeColor = '#dc2626'; // critical red
                                    badgeBg = '#fee2e2';
                                    if (order.diffDays === 0) statusText = 'Due Today!';
                                } else if (order.severity === 'overdue') {
                                    badgeColor = '#991b1b'; // overdue dark red
                                    badgeBg = '#fecaca';
                                    statusText = `${Math.abs(order.diffDays)} days Overdue`;
                                }

                                return (
                                    <div 
                                        key={order.id} 
                                        onClick={() => {
                                            navigate(`/customer-orders/edit/${order.id}`);
                                            setIsOpen(false);
                                        }}
                                        style={{
                                            padding: '12px 16px',
                                            borderBottom: '1px solid #f3f4f6',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            transition: 'background-color 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>
                                                {order.po_number || `Order #${order.id}`}
                                            </span>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                color: badgeColor,
                                                backgroundColor: badgeBg
                                            }}>
                                                {statusText}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {order.client_name} • {order.part_name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                            Qty: {order.quantity} | Status: {order.status}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {alertCount > 0 && (
                        <div 
                            onClick={() => {
                                navigate('/customer-orders');
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '10px 16px',
                                textAlign: 'center',
                                backgroundColor: '#f9fafb',
                                color: '#2563eb',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                borderTop: '1px solid #e5e7eb'
                            }}
                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                        >
                            View all Customer Orders
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
