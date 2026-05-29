import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/Inventory.css'; 

function Dispatch() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getQcReportUrl = (path) => {
        if (!path) return '#';
        if (path.startsWith('http')) return path;
        const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${cleanBase}${cleanPath}`;
    };
    const [dispatchingOrder, setDispatchingOrder] = useState(null); // Order object for modal
    const [shipQty, setShipQty] = useState(0);
    const [isShortClose, setIsShortClose] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchEligibleOrders();
    }, []);

    const fetchEligibleOrders = async () => {
        try {
            const res = await api.get('/api/dispatch/eligible-orders/');
            setOrders(res.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch orders.');
            setLoading(false);
        }
    };

    const handleQCUpload = async (orderId, e) => {
        const file = e.target.files[0];
        if (!file || file.type !== 'application/pdf') {
            return alert('Please upload a valid PDF.');
        }

        const formData = new FormData();
        formData.append('qc_report', file);

        try {
            await api.post(`/api/dispatch/${orderId}/upload-qc/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('QC Report uploaded!');
            fetchEligibleOrders();
        } catch (err) {
            alert('Upload failed.');
        }
    };

    const openDispatchModal = (order) => {
        setDispatchingOrder(order);
        setShipQty(order.available_finished_goods);
        setIsShortClose(false);
    };

    const closeDispatchModal = () => {
        setDispatchingOrder(null);
        setShipQty(0);
        setIsShortClose(false);
    };

    const submitDispatch = async () => {
        if (shipQty <= 0) return alert('Ship quantity must be positive.');
        if (shipQty > dispatchingOrder.available_finished_goods) {
            return alert('Cannot ship more than available finished goods.');
        }

        let finalShortClose = isShortClose;
        if (shipQty < dispatchingOrder.quantity && !isShortClose) {
            const confirmPartial = window.confirm(
                `You are shipping ${shipQty} units, which is less than the required ${dispatchingOrder.quantity}.\n\n` +
                `Do you want to SHORT-CLOSE this PO permanently? (Click "Cancel" to keep it open for remaining parts)`
            );
            finalShortClose = confirmPartial;
        }

        setSubmitting(true);
        try {
            await api.post('/api/dispatch/', {
                order: dispatchingOrder.id,
                shipped_quantity: shipQty,
                is_short_close: finalShortClose
            });
            alert('Dispatch successful!');
            closeDispatchModal();
            fetchEligibleOrders();
        } catch (err) {
            alert(err.response?.data?.error || 'Dispatch failed.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="inventory-container">Loading...</div>;
    if (error) return <div className="inventory-container">{error}</div>;

    return (
        <div className="inventory-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <button onClick={() => navigate('/')}>Back to Home</button>
                <button 
                    onClick={() => navigate('/dispatch-history')}
                    style={{ background: '#4b5563', color: '#fff', padding: '8px 16px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    View Dispatch History
                </button>
            </div>
            
            <h1>Dispatch / Sales Module</h1>

            <div className="inventory-table-wrapper">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>PO Number</th>
                            <th>Part</th>
                            <th>Client</th>
                            <th>Deadline</th>
                            <th>Required Qty</th>
                            <th>Available Finished</th>
                            <th>Status</th>
                            <th>QC Report</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => {
                            const isShortage = order.available_finished_goods < order.quantity;
                            const isReady = order.status === 'READY_FOR_DISPATCH' || order.status === 'PARTIALLY_SHIPPED';
                            const hasQC = order.qc_report_status === 'UPLOADED';

                            return (
                                <tr key={order.id}>
                                    <td><strong>{order.po_number}</strong></td>
                                    <td>{order.part_name}</td>
                                    <td>{order.client_name}</td>
                                    <td>{new Date(order.deadline).toLocaleDateString()}</td>
                                    <td>{order.quantity}</td>
                                    <td style={{ position: 'relative' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 'bold', color: isShortage ? '#dc2626' : '#16a34a' }}>
                                                {order.available_finished_goods}
                                            </span>
                                            {isShortage && (
                                                <span 
                                                    title={`Target: ${order.quantity} | Produced: ${order.produced_qty} | Scrap: ${order.scrap_qty}`}
                                                    style={{ cursor: 'help', fontSize: '18px' }}
                                                >
                                                    ⚠️
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                                            backgroundColor: order.status === 'DISPATCHED' ? '#dcfce7' : '#f3f4f6',
                                            color: order.status === 'DISPATCHED' ? '#166534' : '#374151'
                                        }}>
                                            {order.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        {hasQC ? (
                                            <a href={getQcReportUrl(order.qc_report_url)} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: '13px' }}>
                                                View PDF
                                            </a>
                                        ) : (
                                            <input type="file" accept=".pdf" onChange={(e) => handleQCUpload(order.id, e)} style={{ fontSize: '11px', width: '140px' }} />
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => openDispatchModal(order)}
                                            disabled={!hasQC || order.production_status !== 'COMPLETED'}
                                            style={{
                                                padding: '6px 12px', fontSize: '12px',
                                                backgroundColor: (hasQC && order.production_status === 'COMPLETED') ? '#16a34a' : '#d1d5db',
                                                color: 'white', border: 'none', borderRadius: '4px',
                                                cursor: (hasQC && order.production_status === 'COMPLETED') ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            Dispatch
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Dispatch Modal */}
            {dispatchingOrder && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ width: 400, background: '#fff', padding: '24px', borderRadius: 12 }}>
                        <h3>Dispatch Order: {dispatchingOrder.po_number}</h3>
                        <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
                            <label>
                                <span style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Ship Quantity</span>
                                <input 
                                    type="number" 
                                    value={shipQty} 
                                    onChange={(e) => setShipQty(parseInt(e.target.value) || 0)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                />
                                <small style={{ color: '#6b7280' }}>Available: {dispatchingOrder.available_finished_goods}</small>
                            </label>

                            {shipQty < dispatchingOrder.quantity && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={isShortClose} 
                                        onChange={(e) => setIsShortClose(e.target.checked)}
                                    />
                                    <span style={{ fontSize: '14px', color: '#dc2626', fontWeight: 'bold' }}>Short-Close PO (Final Shipment)</span>
                                </label>
                            )}

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button onClick={closeDispatchModal} style={{ padding: '8px 16px' }}>Cancel</button>
                                <button 
                                    onClick={submitDispatch} 
                                    disabled={submitting}
                                    style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
                                >
                                    {submitting ? 'Processing...' : 'Confirm Dispatch'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dispatch;
