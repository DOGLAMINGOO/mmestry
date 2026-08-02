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

function ProductionReportsHistory() {
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [filters, setFilters] = useState({ po_number: '', status: '', machine_name: '' });

    useEffect(() => {
        document.title = 'Production Reports - MMestry';
        fetchHistory();
    }, []);

    const fetchHistory = async (url) => {
        setLoading(true);
        try {
            const requestUrl = url || `/api/production-reports/history/?${new URLSearchParams(
                Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
            ).toString()}`;
            const res = await api.get(requestUrl);
            const data = res.data;

            if (data && Array.isArray(data.results)) {
                setHistory(data.results);
                setPagination({ next: data.next, previous: data.previous, count: data.count });
            } else {
                setHistory(Array.isArray(data) ? data : []);
                setPagination({ next: null, previous: null, count: Array.isArray(data) ? data.length : 0 });
            }
        } catch (err) {
            alert('Failed to fetch production reports.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="inventory-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <button type="button" onClick={() => navigate('/production')}>Back to Production</button>
                <button type="button" onClick={() => navigate('/')} style={historyButtonStyle}>Back to Home</button>
            </div>
            <h1>Production Reports</h1>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label>
                    PO Number
                    <input name="po_number" value={filters.po_number} onChange={(e) => setFilters({ ...filters, po_number: e.target.value })} style={{ display: 'block', padding: 8, marginTop: 4 }} />
                </label>
                <label>
                    Status
                    <select name="status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={{ display: 'block', padding: 8, marginTop: 4 }}>
                        <option value="">All</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                    </select>
                </label>
                <label>
                    Machine
                    <input name="machine_name" value={filters.machine_name} onChange={(e) => setFilters({ ...filters, machine_name: e.target.value })} style={{ display: 'block', padding: 8, marginTop: 4 }} />
                </label>
                <button onClick={() => fetchHistory()} style={historyButtonStyle}>Apply Filters</button>
                <button onClick={() => { setFilters({ po_number: '', status: '', machine_name: '' }); fetchHistory(); }}>Clear</button>
            </div>

            <div className="inventory-table-wrapper">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>PO Number</th>
                            <th>Company</th>
                            <th>Part</th>
                            <th>Machine</th>
                            <th>Operator</th>
                            <th>Status</th>
                            <th>Required</th>
                            <th>Produced</th>
                            <th>Scrap</th>
                            <th>Deadline</th>
                            <th>Created By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="11" style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                        ) : history.length === 0 ? (
                            <tr><td colSpan="11" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>No production reports found.</td></tr>
                        ) : (
                            history.map((record) => (
                                <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord(record)}>
                                    <td><strong>{record.po_number}</strong></td>
                                    <td>{record.company_name}</td>
                                    <td>{record.part_name}</td>
                                    <td>{record.machine_name}</td>
                                    <td>{record.operator_name}</td>
                                    <td>{record.status_display || record.status}</td>
                                    <td>{record.required_quantity}</td>
                                    <td>{record.produced_quantity ?? '-'}</td>
                                    <td>{record.scrap_quantity ?? 0}</td>
                                    <td>{record.deadline}</td>
                                    <td>{record.created_by_username || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination.count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                    <span>Showing {history.length} of {pagination.count} records</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => fetchHistory(pagination.previous)} disabled={!pagination.previous || loading}>Previous</button>
                        <button onClick={() => fetchHistory(pagination.next)} disabled={!pagination.next || loading}>Next</button>
                    </div>
                </div>
            )}

            {selectedRecord && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedRecord(null)}>
                    <div style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 600, width: '95%', maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <h3>Production Report Details</h3>
                        <p><strong>PO:</strong> {selectedRecord.po_number}</p>
                        <p><strong>Company:</strong> {selectedRecord.company_name} | <strong>Client:</strong> {selectedRecord.client_name}</p>
                        <p><strong>Part:</strong> {selectedRecord.part_name}</p>
                        <p><strong>Machine:</strong> {selectedRecord.machine_name} | <strong>Operator:</strong> {selectedRecord.operator_name}</p>
                        <p><strong>Status:</strong> {selectedRecord.status_display || selectedRecord.status}</p>
                        <p><strong>Required / Produced / Scrap:</strong> {selectedRecord.required_quantity} / {selectedRecord.produced_quantity ?? 0} / {selectedRecord.scrap_quantity ?? 0}</p>
                        <p><strong>Start:</strong> {selectedRecord.start_time ? new Date(selectedRecord.start_time).toLocaleString() : '-'}</p>
                        <p><strong>End:</strong> {selectedRecord.end_time ? new Date(selectedRecord.end_time).toLocaleString() : '-'}</p>
                        <p><strong>Working Hours / Parts:</strong> {selectedRecord.operator_working_hours ?? 0} / {selectedRecord.parts_made_in_working_hours ?? 0}</p>
                        <p><strong>Overtime Hours / Parts:</strong> {selectedRecord.operator_overtime_hours ?? 0} / {selectedRecord.parts_made_in_overtime ?? 0}</p>
                        <p><strong>Idle Time:</strong> {selectedRecord.idle_time_hours ?? 0} {selectedRecord.idle_reason ? `(${selectedRecord.idle_reason})` : ''}</p>
                        <p><strong>Job Rating:</strong> {selectedRecord.job_rating_display || selectedRecord.job_rating || '-'}</p>
                        <p><strong>Remarks:</strong> {selectedRecord.remarks || '-'}</p>
                        <p><strong>Created By:</strong> {selectedRecord.created_by_username || '-'} | <strong>Last Edited By:</strong> {selectedRecord.last_edited_by_username || '-'}</p>
                        <button onClick={() => setSelectedRecord(null)} style={{ marginTop: 12 }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProductionReportsHistory;
