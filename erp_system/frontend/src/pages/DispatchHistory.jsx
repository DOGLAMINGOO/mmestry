import React, { useState, useEffect } from 'react';
import api from '../api';
import '../styles/Inventory.css';

function DispatchHistoryPage() {
    const [history, setHistory] = useState([]);
    const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [filters, setFilters] = useState({
        client: '',
        company: '',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        document.title = 'Dispatch History - MMestry';
    }, []);

    const fetchHistory = async (url) => {
        setLoading(true);
        try {
            const requestUrl = url || `/api/dispatch/history/?${new URLSearchParams(filters).toString()}`;
            const res = await api.get(requestUrl);
            const data = res.data;

            if (data && Array.isArray(data.results)) {
                setHistory(data.results);
                setPagination({
                    next: data.next,
                    previous: data.previous,
                    count: data.count,
                });
            } else {
                setHistory(Array.isArray(data) ? data : []);
                setPagination({ next: null, previous: null, count: Array.isArray(data) ? data.length : 0 });
            }
        } catch (err) {
            alert('Failed to fetch dispatch history.');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleApplyFilters = () => {
        fetchHistory();
    };

    const handleClearFilters = () => {
        const cleared = { client: '', company: '', start_date: '', end_date: '' };
        setFilters(cleared);
        fetchHistory();
    };

    const getQcReportUrl = (path) => {
        if (!path) return '#';
        if (path.startsWith('http')) return path;
        const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${cleanBase}${cleanPath}`;
    };

    return (
        <div className="inventory-container">
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(16px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .clickable-row {
                    cursor: pointer;
                    transition: background-color 0.2s ease, transform 0.1s ease;
                }
                .clickable-row:hover {
                    background-color: #e0f2fe !important;
                }
                .clickable-row:active {
                    transform: scale(0.998);
                }
            `}</style>

            <a href='/'><button>Back to Home</button></a>
            <h1>Dispatch History</h1>

            {/* Filter Section */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px', 
                background: '#f9fafb', 
                padding: '20px', 
                borderRadius: '8px', 
                border: '1px solid #e5e7eb',
                marginBottom: '24px'
            }}>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Client Name</label>
                    <input 
                        name="client" 
                        value={filters.client} 
                        onChange={handleFilterChange}
                        placeholder="Search client..."
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Company Name</label>
                    <input 
                        name="company" 
                        value={filters.company} 
                        onChange={handleFilterChange}
                        placeholder="Search company..."
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Start Date</label>
                    <input 
                        type="date" 
                        name="start_date" 
                        value={filters.start_date} 
                        onChange={handleFilterChange}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>End Date</label>
                    <input 
                        type="date" 
                        name="end_date" 
                        value={filters.end_date} 
                        onChange={handleFilterChange}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <button onClick={handleApplyFilters} style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Apply Filters
                    </button>
                    <button onClick={handleClearFilters} style={{ background: '#f3f4f6', padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}>
                        Clear
                    </button>
                </div>
            </div>

            <div className="inventory-table-wrapper">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Dispatch Date</th>
                            <th>PO Number</th>
                            <th>Company</th>
                            <th>Client</th>
                            <th>Part</th>
                            <th>Target Qty</th>
                            <th>Shipped Qty</th>
                            <th>QC Report</th>
                            <th>Dispatched By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>Loading history...</td></tr>
                        ) : history.length === 0 ? (
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No dispatch records found.</td></tr>
                        ) : (
                            history.map(record => (
                                <tr 
                                    key={record.id} 
                                    className="clickable-row"
                                    onClick={() => setSelectedRecord(record)}
                                >
                                    <td>{new Date(record.dispatched_at).toLocaleString()}</td>
                                    <td><strong>{record.po_number}</strong></td>
                                    <td>{record.company_name}</td>
                                    <td>{record.client_name}</td>
                                    <td>{record.part_name}</td>
                                    <td>{record.target_quantity}</td>
                                    <td>{record.shipped_quantity}</td>
                                    <td>
                                        <a 
                                            href={getQcReportUrl(record.qc_report)} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ color: '#2563eb', fontWeight: 'bold' }}
                                        >
                                            View QC PDF
                                        </a>
                                    </td>
                                    <td>{record.dispatched_by_username || 'System'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination.count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                    <div style={{ color: '#475569' }}>
                        Showing {history.length} of {pagination.count} records
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => fetchHistory(pagination.previous)}
                            disabled={!pagination.previous || loading}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                background: pagination.previous ? '#fff' : '#f8fafc',
                                color: pagination.previous ? '#111827' : '#9ca3af',
                                cursor: pagination.previous ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => fetchHistory(pagination.next)}
                            disabled={!pagination.next || loading}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                background: pagination.next ? '#2563eb' : '#f8fafc',
                                color: pagination.next ? '#fff' : '#9ca3af',
                                cursor: pagination.next ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Detailed Dispatch Modal */}
            {selectedRecord && (
                <div 
                    className="modal-overlay" 
                    onClick={() => setSelectedRecord(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        animation: 'fadeIn 0.25s ease-out'
                    }}
                >
                    <div 
                        className="modal-card" 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            width: '95%',
                            maxWidth: '550px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                            padding: '32px',
                            border: '1px solid rgba(226, 232, 240, 0.8)',
                            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            position: 'relative'
                        }}
                    >
                        {/* Close button top right */}
                        <button 
                            onClick={() => setSelectedRecord(null)}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: '24px',
                                cursor: 'pointer',
                                padding: '4px',
                                margin: 0,
                                transition: 'color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#1e293b'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                            &times;
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontSize: '20px',
                                fontWeight: 'bold'
                            }}>
                                📦
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Dispatch Details</h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                                    PO: <strong>{selectedRecord.po_number}</strong>
                                </p>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '16px 24px',
                            marginBottom: '28px',
                            background: '#f8fafc',
                            padding: '20px',
                            borderRadius: '12px',
                            border: '1px solid #f1f5f9'
                        }}>
                            <div>
                                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Dispatch Date</span>
                                <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>
                                    {new Date(selectedRecord.dispatched_at).toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>PO Number</span>
                                <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>{selectedRecord.po_number}</span>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Company</span>
                                <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>{selectedRecord.company_name}</span>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Client</span>
                                <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>{selectedRecord.client_name}</span>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Part</span>
                                <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{selectedRecord.part_name}</span>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Shipped Qty</span>
                                <span style={{ fontSize: '15px', color: '#16a34a', fontWeight: '800' }}>{selectedRecord.shipped_quantity} units</span>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Dispatched By</span>
                                <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>{selectedRecord.dispatched_by_username || 'System'}</span>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <a 
                                href={getQcReportUrl(selectedRecord.qc_report)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#ffffff',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 6px 12px -1px rgba(16, 185, 129, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(16, 185, 129, 0.2)';
                                }}
                            >
                                📄 Open QC Report PDF
                            </a>
                            <button 
                                onClick={() => setSelectedRecord(null)}
                                style={{
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    padding: '10px 20px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    margin: 0
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DispatchHistoryPage;
