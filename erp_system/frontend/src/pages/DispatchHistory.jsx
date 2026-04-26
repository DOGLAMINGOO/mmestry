import React, { useState, useEffect } from 'react';
import api from '../api';
import '../styles/Inventory.css';

function DispatchHistoryPage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        client: '',
        company: '',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams(filters).toString();
            const res = await api.get(`/api/dispatch/history/?${query}`);
            setHistory(res.data);
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
        // We need to fetch with cleared filters
        setLoading(true);
        api.get('/api/dispatch/history/').then(res => {
            setHistory(res.data);
            setLoading(false);
        });
    };

    return (
        <div className="inventory-container">
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
                            <th>Shipped Qty</th>
                            <th>QC Report</th>
                            <th>Dispatched By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>Loading history...</td></tr>
                        ) : history.length === 0 ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No dispatch records found.</td></tr>
                        ) : (
                            history.map(record => (
                                <tr key={record.id}>
                                    <td>{new Date(record.dispatched_at).toLocaleString()}</td>
                                    <td><strong>{record.po_number}</strong></td>
                                    <td>{record.company_name}</td>
                                    <td>{record.client_name}</td>
                                    <td>{record.part_name}</td>
                                    <td>{record.shipped_quantity}</td>
                                    <td>
                                        <a href={record.qc_report} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 'bold' }}>
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
        </div>
    );
}

export default DispatchHistoryPage;
