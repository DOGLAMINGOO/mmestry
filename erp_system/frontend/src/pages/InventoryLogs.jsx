import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import PaginationControls from '../components/PaginationControls';
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

function InventoryLogs() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [filters, setFilters] = useState({ company: '', part: '', change_type: '' });

    useEffect(() => {
        document.title = 'Inventory Logs - MMestry';
        fetchLogs();
    }, []);

    const fetchLogs = async (url) => {
        setLoading(true);
        try {
            const requestUrl = url || `/api/inventory/logs/?${new URLSearchParams(
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
            alert('Failed to fetch inventory logs.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="inventory-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <button type="button" onClick={() => navigate('/inventory')}>Back to Inventory</button>
                <button type="button" onClick={() => navigate('/')} style={historyButtonStyle}>Back to Home</button>
            </div>
            <h1>Inventory Logs</h1>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label>
                    Company
                    <input value={filters.company} onChange={(e) => setFilters({ ...filters, company: e.target.value })} style={{ display: 'block', padding: 8, marginTop: 4 }} />
                </label>
                <label>
                    Part
                    <input value={filters.part} onChange={(e) => setFilters({ ...filters, part: e.target.value })} style={{ display: 'block', padding: 8, marginTop: 4 }} />
                </label>
                <label>
                    Change Type
                    <select value={filters.change_type} onChange={(e) => setFilters({ ...filters, change_type: e.target.value })} style={{ display: 'block', padding: 8, marginTop: 4 }}>
                        <option value="">All</option>
                        <option value="PO_RECEIVED">PO Received</option>
                        <option value="PRODUCTION_USED">Production Used</option>
                        <option value="PRODUCTION_CREATED">Production Created</option>
                        <option value="DISPATCHED">Dispatched</option>
                        <option value="SALES_OUT">Sales Out</option>
                        <option value="ADJUSTMENT">Adjustment</option>
                    </select>
                </label>
                <button onClick={() => fetchLogs()} style={historyButtonStyle}>Apply Filters</button>
                <button onClick={() => { setFilters({ company: '', part: '', change_type: '' }); fetchLogs(); }}>Clear</button>
            </div>

            <div className="inventory-table-wrapper">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Company</th>
                            <th>Part</th>
                            <th>Change Type</th>
                            <th>Quantity</th>
                            <th>Reason</th>
                            <th>Created By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>No inventory logs found.</td></tr>
                        ) : (
                            logs.map((record) => (
                                <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord(record)}>
                                    <td>{new Date(record.created_at).toLocaleString()}</td>
                                    <td>{record.company_name}</td>
                                    <td>{record.part_name}</td>
                                    <td>{record.change_type_display || record.change_type}</td>
                                    <td>{record.quantity}</td>
                                    <td>{record.reason || '-'}</td>
                                    <td>{record.created_by_username || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination.count > 0 && (
                <PaginationControls
                    count={pagination.count}
                    next={pagination.next}
                    previous={pagination.previous}
                    page={pagination.next ? new URL(pagination.next, window.location.origin).searchParams.get('page') - 1 : (pagination.previous ? Number(new URL(pagination.previous, window.location.origin).searchParams.get('page')) + 1 : 1)}
                    onPrevious={() => fetchLogs(pagination.previous)}
                    onNext={() => fetchLogs(pagination.next)}
                />
            )}

            {selectedRecord && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedRecord(null)}>
                    <div style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 520, width: '95%' }} onClick={(e) => e.stopPropagation()}>
                        <h3>Inventory Log Details</h3>
                        <p><strong>Date:</strong> {new Date(selectedRecord.created_at).toLocaleString()}</p>
                        <p><strong>Company:</strong> {selectedRecord.company_name}</p>
                        <p><strong>Part:</strong> {selectedRecord.part_name}</p>
                        <p><strong>Change Type:</strong> {selectedRecord.change_type_display || selectedRecord.change_type}</p>
                        <p><strong>Quantity:</strong> {selectedRecord.quantity}</p>
                        <p><strong>Reason:</strong> {selectedRecord.reason || '-'}</p>
                        <p><strong>Created By:</strong> {selectedRecord.created_by_username || '-'}</p>
                        <button onClick={() => setSelectedRecord(null)} style={{ marginTop: 12 }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InventoryLogs;
