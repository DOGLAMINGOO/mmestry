import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import SearchFilterBar from '../components/SearchFilterBar';
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

const DEFAULT_FIELD = { value: 'company_name', label: 'Company' };

const FIELD_OPTIONS = [
    { value: 'company_name', label: 'Company' },
    { value: 'part_name', label: 'Part' },
    { value: 'invoice_number', label: 'Invoice Number' },
    { value: 'supplier_name', label: 'Supplier' },
    { value: 'received_by_username', label: 'Received By' },
];

function StockReceiptLogs() {
    const navigate = useNavigate();
    const [receipts, setReceipts] = useState([]);
    const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [searchField, setSearchField] = useState(DEFAULT_FIELD);
    const [searchTerm, setSearchTerm] = useState(null);

    useEffect(() => {
        document.title = 'Stock Receipt Logs - MMestry';
        fetchReceipts();
    }, []);

    const fetchReceipts = async (url) => {
        setLoading(true);
        try {
            const requestUrl = url || '/api/inventory/stock-receipts/?page_size=1000';
            const res = await api.get(requestUrl);
            const data = res.data;

            if (data && Array.isArray(data.results)) {
                setReceipts(data.results);
                setPagination({ next: data.next, previous: data.previous, count: data.count });
            } else {
                setReceipts(Array.isArray(data) ? data : []);
                setPagination({ next: null, previous: null, count: Array.isArray(data) ? data.length : 0 });
            }
        } catch (err) {
            alert('Failed to fetch stock receipt logs.');
        } finally {
            setLoading(false);
        }
    };

    const getSearchOptions = () => {
        if (!receipts.length) return [];
        const uniqueValues = [...new Set(receipts.map((r) => r[searchField.value]))].filter(Boolean);
        return uniqueValues.map((val) => ({ value: val, label: val }));
    };

    const filteredReceipts = useMemo(() => {
        if (!searchTerm) return receipts;
        return receipts.filter((record) => record[searchField.value] === searchTerm.value);
    }, [receipts, searchField, searchTerm]);

    return (
        <div className="inventory-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <button type="button" onClick={() => navigate('/inventory')}>Back to Inventory</button>
                <button type="button" onClick={() => navigate('/')} style={historyButtonStyle}>Back to Home</button>
            </div>
            <h1>Stock Receipt Logs</h1>

            {!loading && receipts.length > 0 && (
                <SearchFilterBar
                    searchField={searchField}
                    setSearchField={setSearchField}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    fieldOptions={FIELD_OPTIONS}
                    getSearchOptions={getSearchOptions}
                    defaultField={DEFAULT_FIELD}
                />
            )}

            <div className="inventory-table-wrapper">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Received At</th>
                            <th>Invoice Number</th>
                            <th>Company</th>
                            <th>Part</th>
                            <th>Quantity</th>
                            <th>Supplier</th>
                            <th>Received By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                        ) : filteredReceipts.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                                {receipts.length === 0 ? 'No stock receipts found.' : 'No receipts match the current filter.'}
                            </td></tr>
                        ) : (
                            filteredReceipts.map((record) => (
                                <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord(record)}>
                                    <td>{new Date(record.received_at).toLocaleString()}</td>
                                    <td><strong>{record.invoice_number}</strong></td>
                                    <td>{record.company_name}</td>
                                    <td>{record.part_name}</td>
                                    <td>{record.quantity}</td>
                                    <td>{record.supplier_name}</td>
                                    <td>{record.received_by_username || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination.count > 0 && !searchTerm && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                    <span>Showing {filteredReceipts.length} of {pagination.count} records</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => fetchReceipts(pagination.previous)} disabled={!pagination.previous || loading}>Previous</button>
                        <button onClick={() => fetchReceipts(pagination.next)} disabled={!pagination.next || loading}>Next</button>
                    </div>
                </div>
            )}

            {searchTerm && (
                <div style={{ marginTop: 20, color: '#475569' }}>
                    Showing {filteredReceipts.length} of {receipts.length} loaded records
                </div>
            )}

            {selectedRecord && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedRecord(null)}>
                    <div style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 520, width: '95%' }} onClick={(e) => e.stopPropagation()}>
                        <h3>Stock Receipt Details</h3>
                        <p><strong>Invoice:</strong> {selectedRecord.invoice_number}</p>
                        <p><strong>Received At:</strong> {new Date(selectedRecord.received_at).toLocaleString()}</p>
                        <p><strong>Company:</strong> {selectedRecord.company_name}</p>
                        <p><strong>Part:</strong> {selectedRecord.part_name}</p>
                        <p><strong>Quantity:</strong> {selectedRecord.quantity}</p>
                        <p><strong>Supplier:</strong> {selectedRecord.supplier_name}</p>
                        <p><strong>Received By:</strong> {selectedRecord.received_by_username || '-'}</p>
                        <button onClick={() => setSelectedRecord(null)} style={{ marginTop: 12 }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StockReceiptLogs;
