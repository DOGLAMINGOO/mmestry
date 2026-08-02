import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/Inventory.css';

const historyButtonStyle = {
    background: '#4b5563',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
};

function CustomerOrderLogs() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [filters, setFilters] = useState({ po_number: '', action_type: '', company: '' });

    useEffect(() => {
        document.title = 'Customer Order Logs - MMestry';
        fetchLogs();
    }, []);

    const fetchLogs = async (url) => {
        setLoading(true);
        try {
            const requestUrl = url || `/api/customer-orders/logs/?${new URLSearchParams(
                Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
            ).toString()}`;
            const res = await api.get(requestUrl);
            const data = res.data;

            if (data && Array.isArray(data.results)) {
                setLogs(data.results);
                setPagination({ next: data.next, previous: data.previous, count: data.count });
            } else {
                setLogs(Array.isArray(data) ? data : []);
                setPagination({ next: null, previous: null, count: Array.isArray(data) ? data.length : 0 });
            }
        } catch (err) {
            alert('Failed to fetch customer order logs.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="inventory-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <button type="button" onClick={() => navigate('/customer-orders')}>Back to Customer Orders</button>
                <button type="button" onClick={() => navigate('/')} style={historyButtonStyle}>Back to Home</button>
            </div>
            <h1>Customer Order Logs</h1>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label>
                    PO Number
                    <input value={filters.po_number} onChange={(e) => setFilters({ ...filters, po_number: e.target.value })} style={{ display: 'block', padding: 8, marginTop: 4 }} />
                </label>
                <label>
                    Action
                    <select value={filters.action_type} onChange={(e) => setFilters({ ...filters, action_type: e.target.value })} style={{ display: 'block', padding: 8, marginTop: 4 }}>
                        <option value="">All</option>
                        <option value="CREATED">Created</option>
                        <option value="EDITED">Edited</option>
                        <option value="STATUS_CHANGED">Status Changed</option>
                        <option value="SOFT_DELETED">Soft Deleted</option>
                    </select>
                </label>
                <label>
                    Company
                    <input value={filters.company} onChange={(e) => setFilters({ ...filters, company: e.target.value })} style={{ display: 'block', padding: 8, marginTop: 4 }} />
                </label>
                <button onClick={() => fetchLogs()} style={historyButtonStyle}>Apply Filters</button>
                <button onClick={() => { setFilters({ po_number: '', action_type: '', company: '' }); fetchLogs(); }}>Clear</button>
            </div>

            <div className="inventory-table-wrapper">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>PO Number</th>
                            <th>Action</th>
                            <th>Company</th>
                            <th>Client</th>
                            <th>Part</th>
                            <th>Status</th>
                            <th>Quantity</th>
                            <th>Created By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>No customer order logs found.</td></tr>
                        ) : (
                            logs.map((record) => (
                                <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord(record)}>
                                    <td>{new Date(record.created_at).toLocaleString()}</td>
                                    <td><strong>{record.po_number}</strong></td>
                                    <td>{record.action_type_display || record.action_type}</td>
                                    <td>{record.company_name}</td>
                                    <td>{record.client_name}</td>
                                    <td>{record.part_name}</td>
                                    <td>{record.status_display || record.status}</td>
                                    <td>{record.quantity}</td>
                                    <td>{record.created_by_username || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination.count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                    <span>Showing {logs.length} of {pagination.count} records</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => fetchLogs(pagination.previous)} disabled={!pagination.previous || loading}>Previous</button>
                        <button onClick={() => fetchLogs(pagination.next)} disabled={!pagination.next || loading}>Next</button>
                    </div>
                </div>
            )}

            {selectedRecord && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedRecord(null)}>
                    <div style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 520, width: '95%' }} onClick={(e) => e.stopPropagation()}>
                        <h3>Customer Order Log Details</h3>
                        <p><strong>Date:</strong> {new Date(selectedRecord.created_at).toLocaleString()}</p>
                        <p><strong>PO Number:</strong> {selectedRecord.po_number}</p>
                        <p><strong>Action:</strong> {selectedRecord.action_type_display || selectedRecord.action_type}</p>
                        <p><strong>Company:</strong> {selectedRecord.company_name}</p>
                        <p><strong>Client:</strong> {selectedRecord.client_name}</p>
                        <p><strong>Part:</strong> {selectedRecord.part_name}</p>
                        <p><strong>Status:</strong> {selectedRecord.status_display || selectedRecord.status}</p>
                        <p><strong>Quantity:</strong> {selectedRecord.quantity}</p>
                        <p><strong>Deadline:</strong> {selectedRecord.deadline}</p>
                        <p><strong>Priority:</strong> {selectedRecord.priority}</p>
                        <p><strong>Reason:</strong> {selectedRecord.reason || '-'}</p>
                        <p><strong>Created By:</strong> {selectedRecord.created_by_username || '-'}</p>
                        <button onClick={() => setSelectedRecord(null)} style={{ marginTop: 12 }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerOrderLogs;
