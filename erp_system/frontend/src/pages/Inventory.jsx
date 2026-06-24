import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import api from '../api';
import '../styles/Inventory.css'

function Inventory() {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [parts, setParts] = useState([]);

    // Frontend state
    const [userRole, setUserRole] = useState(null);

    // Search and Filter State
    const [searchField, setSearchField] = useState({ value: 'part_name', label: 'Part' });
    const [searchTerm, setSearchTerm] = useState(null);

    useEffect(() => {
        getInventory();
        getCompanies();
        getParts();
    }, []);

    useEffect(() => {
        document.title = 'Inventory - MMestry';
    }, []);

    const getCompanies = async () => {
        try {
            const response = await api.get('/api/companies/');
            setCompanies(response.data);
        } catch (err) {
            console.error('Failed to fetch companies:', err);
        }
    };

    const getParts = async () => {
        try {
            const response = await api.get('/api/parts/');
            setParts(response.data);
        } catch (err) {
            console.error('Failed to fetch parts:', err);
        }
    };

    const getInventory = async () => {
        try {
            const response = await api.get('/api/inventory/');
            setInventory(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch inventory data');
            setLoading(false);
        }
    };

    // Adjust modal state
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [adjustItem, setAdjustItem] = useState(null);
    const [adjustForm, setAdjustForm] = useState({ field: 'finished', action: 'increase', quantity: 1, reason: '' });

    const openAdjust = (item) => {
        setAdjustItem(item);
        setAdjustForm({ field: 'finished', action: 'increase', quantity: 1, reason: '' });
        setAdjustModalOpen(true);
    };

    const closeAdjust = () => {
        setAdjustModalOpen(false);
        setAdjustItem(null);
    };

    const handleAdjustChange = (e) => {
        const { name, value } = e.target;
        setAdjustForm(prev => ({ ...prev, [name]: value }));
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
            await getInventory();
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
    const [receiveForm, setReceiveForm] = useState({ company: '', part: '', quantity: 1, supplier_name: '', invoice_number: '' });

    const openReceive = () => {
        setReceiveForm({ company: '', part: '', quantity: 1, supplier_name: '', invoice_number: '' });
        setReceiveModalOpen(true);
    };

    const closeReceive = () => {
        setReceiveModalOpen(false);
    };

    const handleReceiveChange = (e) => {
        const { name, value } = e.target;
        setReceiveForm(prev => ({ ...prev, [name]: value }));
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
            await getInventory();
            closeReceive();
            alert('Stock received successfully');
        } catch (err) {
            const msg = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to receive stock';
            alert(msg);
            console.error(err);
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
        if (!inventory || !searchField) return [];
        const uniqueValues = [...new Set(inventory.map(o => o[searchField.value]))].filter(Boolean);
        return uniqueValues.map(val => ({ value: val, label: val }));
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
            <a href='/'><button>Go to home page</button></a>
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
                        onChange={(selected) => setSearchTerm(selected)}
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
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>Company</th>
                                <th>Part</th>
                                <th>Total Blanks</th>
                                <th>Reserved Blanks</th>
                                <th>Available Blanks</th>
                                <th>Finished Blanks</th>

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
                                            title={`Part: ${item.part_number} - ${item.part_name}${item.part_description ? `\nDescription: ${item.part_description}` : ''}`}
                                            style={{
                                                cursor: 'pointer',
                                                color: '#2563eb',
                                                textDecoration: 'none',
                                                transition: 'text-decoration 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                        >
                                            {item.part_name}
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
                                    <option value="finished">Finished Blanks</option>
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