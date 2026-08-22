import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import api from '../api';
import PaginationControls from '../components/PaginationControls';
import { fetchAllPages } from '../utils/fetchAllPages';
import '../styles/Inventory.css'

function Inventory() {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [parts, setParts] = useState([]);
    const [allInventory, setAllInventory] = useState([]);
    const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
    const [page, setPage] = useState(1);

    // Frontend state
    const [userRole, setUserRole] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportCompany, setReportCompany] = useState('both');

    const normalizeListData = (data) => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results;
        return [];
    };

    // Search and Filter State
    const [searchField, setSearchField] = useState({ value: 'part_name', label: 'Part' });
    const [searchTerm, setSearchTerm] = useState(null);

    useEffect(() => {
        fetchInventory();
        fetchAllPages('/api/inventory/?page=1').then(setAllInventory).catch(() => {});
        getCompanies();
        getParts();
    }, []);

    useEffect(() => {
        document.title = 'Inventory - MMestry';
    }, []);

    const getCompanies = async () => {
        try {
            const records = await fetchAllPages('/api/companies/?page=1');
            setCompanies(normalizeListData(records));
        } catch (err) {
            console.error('Failed to fetch companies:', err);
        }
    };

    const getParts = async () => {
        try {
            const records = await fetchAllPages('/api/parts/?page=1');
            setParts(normalizeListData(records));
        } catch (err) {
            console.error('Failed to fetch parts:', err);
        }
    };

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

    const fetchInventory = async (url) => {
        setLoading(true);
        try {
            const requestUrl = url || `/api/inventory/?page=${page}`;
            const response = await api.get(requestUrl);
            const data = response.data;

            if (data && Array.isArray(data.results)) {
                setInventory(data.results);
                setPagination({ next: data.next, previous: data.previous, count: data.count });
                setPage(getPageFromUrl(requestUrl));
            } else {
                setInventory(Array.isArray(data) ? data : []);
                setPagination({ next: null, previous: null, count: Array.isArray(data) ? data.length : 0 });
                setPage(1);
            }
        } catch (err) {
            setError('Failed to fetch inventory data');
        } finally {
            setLoading(false);
        }
    };

    // Adjust modal state
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [adjustItem, setAdjustItem] = useState(null);
    const [adjustForm, setAdjustForm] = useState({ field: 'finished', action: 'increase', quantity: 0, reason: '' });

    const openAdjust = (item) => {
        setAdjustItem(item);
        setAdjustForm({ field: 'finished', action: 'increase', quantity: 0, reason: '' });
        setAdjustModalOpen(true);
    };

    const closeAdjust = () => {
        setAdjustModalOpen(false);
        setAdjustItem(null);
    };

    const handleAdjustChange = (e) => {
        const { name, value } = e.target;
        const nextValue = name === 'quantity' ? value.replace(/^0+(?=\d)/, '') : value;
        setAdjustForm(prev => ({ ...prev, [name]: nextValue }));
    };

    const submitAdjust = async () => {
        const { field, action, quantity, reason } = adjustForm;
        const qty = parseInt(quantity, 10);
        if (!['blanks', 'finished'].includes(field)) return alert('Invalid field');
        if (!['increase', 'decrease'].includes(action)) return alert('Invalid action');
        if (isNaN(qty) || qty <= 0) return alert('Quantity must be a positive integer');
        if (!reason || reason.trim() === '') return alert('Reason is required');

        try {
            await api.post(`/api/inventory/${adjustItem.id}/adjust/`, { field, action, quantity: qty, reason });
            await fetchInventory();
            closeAdjust();
            alert('Adjustment successful');
        } catch (err) {
            const msg = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Adjustment failed';
            alert(msg);
            console.error(err);
        }
    };

    // Receive Stock modal state
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [receiveForm, setReceiveForm] = useState({ company: '', part: '', quantity: 0, supplier_name: '', invoice_number: '' });

    const openReceive = () => {
        setReceiveForm({ company: '', part: '', quantity: 0, supplier_name: '', invoice_number: '' });
        setReceiveModalOpen(true);
    };

    const closeReceive = () => {
        setReceiveModalOpen(false);
    };

    const handleReceiveChange = (e) => {
        const { name, value } = e.target;
        const nextValue = name === 'quantity' ? value.replace(/^0+(?=\d)/, '') : value;
        setReceiveForm(prev => ({ ...prev, [name]: nextValue }));
    };

    const submitReceive = async () => {
        const { company, part, quantity, supplier_name, invoice_number } = receiveForm;
        const qty = parseInt(quantity, 10);
        if (!company) return alert('Company is required');
        if (!part) return alert('Part is required');
        if (isNaN(qty) || qty <= 0) return alert('Quantity must be a positive integer');
        if (!supplier_name) return alert('Supplier name is required');
        if (!invoice_number) return alert('Invoice number is required');

        try {
            await api.post('/api/inventory/stock-receipts/', {
                company,
                part,
                quantity: qty,
                supplier_name,
                invoice_number
            });
            await fetchInventory();
            closeReceive();
            alert('Stock received successfully');
        } catch (err) {
            const msg = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to receive stock';
            alert(msg);
            console.error(err);
        }
    };

    const downloadReport = async () => {
        setReportLoading(true);
        try {
            const query = reportCompany === 'both' ? '' : `?company=${reportCompany}`;
            const response = await api.get(`/api/inventory/report/${query}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `inventory-report-${reportCompany}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Failed to generate inventory report.');
            console.error(err);
        } finally {
            setReportLoading(false);
        }
    };

    // fetch current user to determine role-based permissions
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get('/api/user/me/');
                setUserRole(res.data.role || null);
            } catch (err) {
                // ignore unauthenticated
            }
        };
        fetchUser();
    }, []);

    // Calculate unique options for the selected search field dropdown
    const getSearchOptions = () => {
        if (!allInventory || !searchField) return [];
        const uniqueValues = [...new Set(allInventory.map(o => o[searchField.value]))].filter(Boolean);
        return uniqueValues.map(val => ({ value: val, label: val }));
    };

    const handleSearchTermChange = (selected) => {
        const params = new URLSearchParams({ page: '1' });
        if (selected) params.set(searchField.value === 'company_name' ? 'company' : 'part', selected.value);
        fetchInventory(`/api/inventory/?${params.toString()}`);
    };

    // Derived state for the filtered table
    const filteredInventory = useMemo(() => {
        if (!searchTerm) return inventory;
        return inventory.filter(item => item[searchField.value] === searchTerm.value);
    }, [inventory, searchField, searchTerm]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="inventory-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => navigate('/')}>Back to Home</button>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        type="button"
                        onClick={() => navigate('/inventory-logs')}
                        style={{ background: '#4b5563', color: '#fff', padding: '8px 16px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        View Inventory Logs
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/stock-receipt-logs')}
                        style={{ background: '#4b5563', color: '#fff', padding: '8px 16px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        View Receipt Logs
                    </button>
                    <button
                        type="button"
                        onClick={downloadReport}
                        disabled={reportLoading}
                        style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: reportLoading ? 'wait' : 'pointer', opacity: reportLoading ? 0.7 : 1 }}
                    >
                        {reportLoading ? 'Generating Report...' : 'Download Stock Report'}
                    </button>
                    <select
                        aria-label="Report company"
                        value={reportCompany}
                        onChange={(event) => setReportCompany(event.target.value)}
                        disabled={reportLoading}
                        style={{ padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff' }}
                    >
                        <option value="A">Company A</option>
                        <option value="B">Company B</option>
                        <option value="both">Both Companies</option>
                    </select>
                </div>
            </div>
            <h1>Inventory</h1>

            {/* Inventory is read-only in the frontend. Adjustments are performed via business events or by superusers using Adjust. */}

            {/* Search Filters */}
            <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '20px',
                alignItems: 'center',
                background: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}>
                <div style={{ minWidth: '220px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>
                        Filter Column By
                    </label>
                    <Select
                        value={searchField}
                        onChange={(selected) => {
                            setSearchField(selected);
                            setSearchTerm(null);
                            fetchInventory('/api/inventory/?page=1');
                        }}
                        options={[
                            { value: 'company_name', label: 'Company' },
                            { value: 'part_name', label: 'Part' },
                        ]}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>
                        Search or Select {searchField.label}...
                    </label>
                    <Select
                        value={searchTerm}
                        onChange={(selected) => {
                            setSearchTerm(selected);
                            handleSearchTermChange(selected);
                        }}
                        options={getSearchOptions()}
                        placeholder={`Start typing ${searchField.label.toLowerCase()} to filter...`}
                        isClearable
                    />
                </div>
                {(searchTerm || searchField.value !== 'part_name') && (
                    <button
                        onClick={() => {
                            setSearchTerm(null);
                            setSearchField({ value: 'part_name', label: 'Part' });
                            fetchInventory('/api/inventory/?page=1');
                        }}
                        style={{
                            marginTop: '22px',
                            padding: '10px 16px',
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            color: '#b91c1c',
                            transition: 'all 0.2s',
                            fontFamily: 'Arial, sans-serif'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#fecaca';
                            e.target.style.borderColor = '#f87171';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#fee2e2';
                            e.target.style.borderColor = '#fca5a5';
                        }}
                    >
                        Clear Filter
                    </button>
                )}
            </div>

            {/* Inventory Table */}
            <div className="inventory-table-wrapper">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2 style={{ margin: 0 }}>Current Stock</h2>
                        {(userRole === 'ADMIN' || userRole === 'STOCK_MANAGER') && (
                            <button
                                onClick={openReceive}
                                style={{
                                    padding: '6px 14px',
                                    backgroundColor: '#16a34a',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                }}
                            >
                                Receive Stock
                            </button>
                        )}
                    </div>
                    <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'bold' }}>
                        Showing {filteredInventory.length} {filteredInventory.length === 1 ? 'item' : 'items'}
                    </span>
                </div>
                {filteredInventory.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
                        <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No matches found</h3>
                        <p style={{ margin: 0, color: '#6b7280' }}>Try adjusting your search filters to find what you're looking for.</p>
                    </div>
                )}
                {filteredInventory.length > 0 && (
                    <>
                        <table className="inventory-table">
                            <thead>
                            <tr>
                                <th>Company</th>
                                <th>Part</th>
                                <th>Total Blanks</th>
                                <th>Reserved Blanks</th>
                                <th>Available Blanks</th>
                                <th>Finished Parts</th>

                                <th>Last Adjusted By</th>
                                <th>Last Adjusted At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.map(item => (
                                <tr
                                    key={item.id}
                                    style={{ cursor: 'default' }}
                                >
                                    <td>{item.company_name}</td>
                                    <td>
                                        <span
                                            onClick={() => navigate(`/inventory/${item.id}`)}
                                            title={[
                                                item.part_name ? `Part Name: ${item.part_name}` : null,
                                                item.part_description ? `Description: ${item.part_description}` : null,
                                                item.cycle_time_minutes != null ? `Cycle Time: ${item.cycle_time_minutes} min` : null,
                                            ].filter(Boolean).join('\n')}
                                            style={{
                                                cursor: 'pointer',
                                                color: '#2563eb',
                                                textDecoration: 'none',
                                                transition: 'text-decoration 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                        >
                                            {item.part_number || item.part_name}
                                        </span>
                                    </td>
                                    <td>{item.total_blanks}</td>
                                    <td>{item.reserved_blanks || 0}</td>
                                    <td style={{
                                        color: item.available_blanks < 0 ? '#dc2626' : '#16a34a',
                                        fontWeight: 'bold'
                                    }}>
                                        {item.available_blanks}
                                    </td>
                                    <td>{item.finished_blanks}</td>

                                    <td>{item.last_adjusted_by || '-'}</td>
                                    <td>{item.last_adjusted_at ? new Date(item.last_adjusted_at).toLocaleString() : '-'}</td>

                                    <td>
                                        {(userRole === 'ADMIN' || userRole === 'STOCK_MANAGER') && (
                                            <button
                                                type="button"
                                                onClick={() => openAdjust(item)}
                                                style={{
                                                    padding: '6px 14px',
                                                    backgroundColor: '#f59e0b',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    fontSize: '12px',
                                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                                }}
                                            >
                                                Adjust
                                            </button>
                                        )}
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <PaginationControls
                        count={pagination.count}
                        next={pagination.next}
                        previous={pagination.previous}
                        page={page}
                        onPrevious={() => fetchInventory(pagination.previous)}
                        onNext={() => fetchInventory(pagination.next)}
                    />
                    </>
                )}
            </div>

            {/* Receive Stock Modal */}
            {receiveModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
                    <div style={{ width: 450, background: '#fff', padding: '24px', borderRadius: 12, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ marginTop: 0, marginBottom: 20 }}>Receive Stock</h2>
                        <div style={{ display: 'grid', gap: 16 }}>
                            <label style={{ display: 'block' }}>
                                <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Company*</span>
                                <select name="company" value={receiveForm.company} onChange={handleReceiveChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                                    <option value="">Select Company</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </label>

                            <label style={{ display: 'block' }}>
                                <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Part*</span>
                                <select name="part" value={receiveForm.part} onChange={handleReceiveChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                                    <option value="">Select Part</option>
                                    {parts.map(p => <option key={p.id} value={p.id}>{p.part_number} - {p.name}</option>)}
                                </select>
                            </label>

                            <label style={{ display: 'block' }}>
                                <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Quantity*</span>
                                <input name="quantity" type="number" min="1" value={receiveForm.quantity} onChange={handleReceiveChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                            </label>

                            <label style={{ display: 'block' }}>
                                <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Supplier Name*</span>
                                <input name="supplier_name" type="text" value={receiveForm.supplier_name} onChange={handleReceiveChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="Enter supplier name" />
                            </label>

                            <label style={{ display: 'block' }}>
                                <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Invoice Number*</span>
                                <input name="invoice_number" type="text" value={receiveForm.invoice_number} onChange={handleReceiveChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="Enter invoice number" />
                            </label>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                                <button onClick={closeReceive} style={{ padding: '10px 18px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={submitReceive} style={{ padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>Confirm Receipt</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Adjust Stock Modal */}
            {adjustModalOpen && adjustItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
                    <div style={{ width: 450, background: '#fff', padding: '24px', borderRadius: 12, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Adjust Inventory</h2>
                        <p style={{ marginBottom: 20, color: '#6b7280', fontSize: '14px' }}>
                            Manual adjustment for <strong>{adjustItem.company_name} — {adjustItem.part_name}</strong>
                        </p>

                        <div style={{ display: 'grid', gap: 16 }}>
                            <label style={{ display: 'block' }}>
                                <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Field*</span>
                                <select name="field" value={adjustForm.field} onChange={handleAdjustChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                                    <option value="blanks">Total Blanks</option>
                                    <option value="finished">Finished Parts</option>
                                </select>
                            </label>

                            <label style={{ display: 'block' }}>
                                <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Action*</span>
                                <select name="action" value={adjustForm.action} onChange={handleAdjustChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                                    <option value="increase">Increase (+)</option>
                                    <option value="decrease">Decrease (-)</option>
                                </select>
                            </label>

                            <label style={{ display: 'block' }}>
                                <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Quantity*</span>
                                <input name="quantity" type="number" min="1" value={adjustForm.quantity} onChange={handleAdjustChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                            </label>

                            <label style={{ display: 'block' }}>
                                <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Reason for Adjustment*</span>
                                <textarea name="reason" value={adjustForm.reason} onChange={handleAdjustChange} rows={3} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'vertical' }} placeholder="Explain why this adjustment is being made..." />
                            </label>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                                <button onClick={closeAdjust} style={{ padding: '10px 18px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={submitAdjust} style={{ padding: '10px 18px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>Apply Adjustment</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Inventory;
