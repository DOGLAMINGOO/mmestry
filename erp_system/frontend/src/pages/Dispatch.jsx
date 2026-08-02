import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import PaginationControls from '../components/PaginationControls';
import SearchFilterBar from '../components/SearchFilterBar';
import '../styles/Inventory.css'; 

function Dispatch() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getDocumentUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${cleanBase}${cleanPath}`;
    };

    const openDocument = (path) => {
        const url = getDocumentUrl(path);
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };
    const [dispatchingOrder, setDispatchingOrder] = useState(null); // Order object for modal
    const [shipQty, setShipQty] = useState(0);
    const [mainInvoiceFile, setMainInvoiceFile] = useState(null);
    const [showSupplementary, setShowSupplementary] = useState(false);
    const [supplementaryQty, setSupplementaryQty] = useState(0);
    const [supplementaryInvoiceFile, setSupplementaryInvoiceFile] = useState(null);
    const [supplementaryQcFile, setSupplementaryQcFile] = useState(null);
    const [isShortClose, setIsShortClose] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchField, setSearchField] = useState({ value: 'po_number', label: 'PO Number' });
    const [searchTerm, setSearchTerm] = useState(null);
    const [uploadingInvoice, setUploadingInvoice] = useState(false);

    useEffect(() => {
        fetchEligibleOrders();
    }, []);

    useEffect(() => {
        document.title = 'Dispatch - MMestry';
    }, []);

    const getPageFromUrl = (url) => {
        if (!url) return 1;
        try {
            const base = import.meta.env.VITE_API_URL || window.location.origin;
            const parsed = new URL(url, base);
            return Number(parsed.searchParams.get('page') || '1');
        } catch (err) {
            return 1;
        }
    };

    const fetchEligibleOrders = async (url) => {
        try {
            const requestUrl = url || `/api/dispatch/eligible-orders/?page=${page}`;
            const res = await api.get(requestUrl);
            const data = res.data;
            if (data && Array.isArray(data.results)) {
                setOrders(data.results);
                setPagination({ next: data.next, previous: data.previous, count: data.count });
                setPage(getPageFromUrl(requestUrl));
            } else {
                setOrders(Array.isArray(data) ? data : []);
                setPagination({ next: null, previous: null, count: Array.isArray(data) ? data.length : 0 });
                setPage(1);
            }
        } catch (err) {
            setError('Failed to fetch orders.');
        } finally {
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
        setShipQty(Math.min(order.quantity, order.available_finished_goods));
        setMainInvoiceFile(null);
        setShowSupplementary(false);
        setSupplementaryQty(0);
        setSupplementaryInvoiceFile(null);
        setSupplementaryQcFile(null);
        setIsShortClose(false);
    };

    const closeDispatchModal = () => {
        setDispatchingOrder(null);
        setShipQty(0);
        setMainInvoiceFile(null);
        setShowSupplementary(false);
        setSupplementaryQty(0);
        setSupplementaryInvoiceFile(null);
        setSupplementaryQcFile(null);
        setIsShortClose(false);
    };

    const submitDispatch = async () => {
        if (shipQty <= 0) return alert('Main shipped quantity must be positive.');
        if (shipQty > dispatchingOrder.quantity) return alert('Main shipped quantity cannot exceed the ordered quantity.');
        if (shipQty > dispatchingOrder.quantity - dispatchingOrder.shipped_quantity) return alert('Main shipped quantity exceeds the remaining ordered quantity.');
        if (showSupplementary && supplementaryQty <= 0) return alert('Supplementary quantity must be positive.');
        if (showSupplementary && !supplementaryQcFile) return alert('Supplementary QC report PDF is required.');

        const totalShipped = shipQty + (showSupplementary ? supplementaryQty : 0);
        if (totalShipped > dispatchingOrder.available_finished_goods) {
            return alert('Cannot ship more than available finished goods.');
        }

        let finalShortClose = isShortClose;
        if (shipQty < dispatchingOrder.quantity && !isShortClose) {
            const confirmPartial = window.confirm(
                `You are shipping ${shipQty} units for the main order, which is less than the required ${dispatchingOrder.quantity}.\n\n` +
                `Do you want to SHORT-CLOSE this PO permanently? (Click "Cancel" to keep it open for remaining parts)`
            );
            finalShortClose = confirmPartial;
        }

        const formData = new FormData();
        formData.append('order', dispatchingOrder.id);
        formData.append('shipped_quantity', shipQty);
        formData.append('is_short_close', finalShortClose);
        formData.append('has_supplementary', showSupplementary ? 'true' : 'false');
        formData.append('supplementary_shipped_quantity', showSupplementary ? supplementaryQty : 0);
        formData.append('main_invoice_pdf', mainInvoiceFile);
        if (showSupplementary) {
            formData.append('supplementary_invoice_pdf', supplementaryInvoiceFile);
            formData.append('supplementary_qc_report_pdf', supplementaryQcFile);
        }

        setSubmitting(true);
        try {
            await api.post('/api/dispatch/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
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

    const uploadInvoice = async (dispatchId, documentType) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('invoice_pdf', file);
            formData.append('document_type', documentType);
            setUploadingInvoice(true);
            try {
                await api.post(`/api/dispatch/${dispatchId}/upload-invoice/`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                alert('Invoice uploaded successfully.');
                fetchEligibleOrders();
            } catch (err) {
                alert(err.response?.data?.error || 'Invoice upload failed.');
            } finally {
                setUploadingInvoice(false);
            }
        };
        input.click();
    };

    const fieldOptions = [
        { value: 'po_number', label: 'PO Number' },
        { value: 'part_name', label: 'Part' },
        { value: 'client_name', label: 'Client' },
        { value: 'status', label: 'Status' },
    ];

    const getSearchOptions = () => {
        if (!orders || !searchField) return [];
        const uniqueValues = [...new Set(orders.map((order) => order[searchField.value]))].filter(Boolean);
        return uniqueValues.map((value) => ({ value, label: value }));
    };

    const filteredOrders = useMemo(() => {
        if (!searchTerm) return orders;
        return orders.filter((order) => order[searchField.value] === searchTerm.value);
    }, [orders, searchField, searchTerm]);

    const multiPartCounts = filteredOrders.reduce((counts, order) => {
        counts[order.po_number] = (counts[order.po_number] || 0) + 1;
        return counts;
    }, {});

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

            <SearchFilterBar
                searchField={searchField}
                setSearchField={setSearchField}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                fieldOptions={fieldOptions}
                getSearchOptions={getSearchOptions}
                defaultField={{ value: 'po_number', label: 'PO Number' }}
            />

            <div className="inventory-table-wrapper" style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h2 style={{ margin: 0 }}>Eligible Orders</h2>
                    <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'bold' }}>
                        Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
                    </span>
                </div>

                {filteredOrders.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No matches found</h3>
                        <p style={{ margin: 0, color: '#6b7280' }}>Try adjusting your search filters to find what you're looking for.</p>
                    </div>
                ) : (
                    <>
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
                            {filteredOrders.map(order => {
                                const isShortage = order.available_finished_goods < order.quantity;
                                const hasQC = order.qc_report_status === 'UPLOADED';

                                return (
                                    <tr key={order.id}>
                                        <td><strong>{order.po_number}{multiPartCounts[order.po_number] > 1 ? ' *' : ''}</strong></td>
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
                                                <button
                                                type="button"
                                                onClick={() => openDocument(order.qc_report_url)}
                                                style={{ color: '#2563eb', fontSize: '13px', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                View PDF
                                            </button>
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
                    <PaginationControls
                        count={pagination.count}
                        next={pagination.next}
                        previous={pagination.previous}
                        page={page}
                        onPrevious={() => fetchEligibleOrders(pagination.previous)}
                        onNext={() => fetchEligibleOrders(pagination.next)}
                    />
                    </>
                )}
            </div>

            {/* Dispatch Modal */}
            {dispatchingOrder && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ width: 460, background: '#fff', padding: '24px', borderRadius: 12, maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3>Dispatch Order: {dispatchingOrder.po_number}</h3>
                        <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
                            <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb' }}>
                                <h4 style={{ margin: '0 0 10px 0' }}>Main / Original Dispatch</h4>
                                <div style={{ fontSize: '13px', color: '#dc2626', marginBottom: '8px' }}>
                                    Main shipped quantity cannot exceed the ordered quantity, and a QC report is required before dispatch.
                                </div>
                                <label style={{ display: 'block', marginBottom: '10px' }}>
                                    <span style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Base / Original Quantity</span>
                                    <input 
                                        type="number" 
                                        value={shipQty} 
                                        onChange={(e) => setShipQty(parseInt(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                    />
                                    <small style={{ color: '#6b7280' }}>Ordered: {dispatchingOrder.quantity} • Remaining: {dispatchingOrder.quantity - dispatchingOrder.shipped_quantity} • Available: {dispatchingOrder.available_finished_goods}</small>
                                </label>
                                <label style={{ display: 'block', marginBottom: '10px' }}>
                                    <span style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Main Invoice PDF</span>
                                    <input type="file" accept=".pdf" onChange={(e) => setMainInvoiceFile(e.target.files[0])} style={{ width: '100%' }} />
                                </label>
                                <div style={{ padding: '8px 10px', borderRadius: '6px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '13px' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Main QC Report</div>
                                    {dispatchingOrder.qc_report_status === 'UPLOADED' ? (
                                        <button
                                            type="button"
                                            onClick={() => openDocument(dispatchingOrder.qc_report_url)}
                                            style={{ color: '#2563eb', fontWeight: 'bold', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            View uploaded QC report
                                        </button>
                                    ) : (
                                        <div>Upload the QC report from the order row before dispatching.</div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowSupplementary((prev) => !prev)}
                                style={{ width: 'fit-content', padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {showSupplementary ? 'Hide Supplementary / Excess Dispatch' : '+ Add Supplementary / Excess Dispatch'}
                            </button>

                            {showSupplementary && (
                                <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff7ed' }}>
                                    <h4 style={{ margin: '0 0 10px 0' }}>Supplementary / Excess Dispatch</h4>
                                    <label style={{ display: 'block', marginBottom: '10px' }}>
                                        <span style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Excess / Supplementary Quantity</span>
                                        <input 
                                            type="number" 
                                            value={supplementaryQty} 
                                            onChange={(e) => setSupplementaryQty(parseInt(e.target.value) || 0)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                        />
                                    </label>
                                    <label style={{ display: 'block', marginBottom: '10px' }}>
                                        <span style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Supplementary Invoice PDF</span>
                                        <input type="file" accept=".pdf" onChange={(e) => setSupplementaryInvoiceFile(e.target.files[0])} style={{ width: '100%' }} />
                                    </label>
                                    <label style={{ display: 'block' }}>
                                        <span style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Supplementary QC Report PDF</span>
                                        <input type="file" accept=".pdf" onChange={(e) => setSupplementaryQcFile(e.target.files[0])} style={{ width: '100%' }} />
                                    </label>
                                </div>
                            )}

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
