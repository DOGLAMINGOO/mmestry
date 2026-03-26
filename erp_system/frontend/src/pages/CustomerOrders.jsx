import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import api from '../api';
import '../styles/Inventory.css';

function CustomerOrders() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [ordersError, setOrdersError] = useState(null);

    const [userRole, setUserRole] = useState(null);

    // Search and Filter State
    const [searchField, setSearchField] = useState({ value: 'company_name', label: 'Company' });
    const [searchTerm, setSearchTerm] = useState(null);

    const fetchOrders = async () => {
        setOrdersLoading(true);
        setOrdersError(null);
        try {
            const res = await api.get('/api/customer-orders/');
            setOrders(res.data);
        } catch (err) {
            console.error('Failed to fetch customer orders', err);
            setOrdersError('Failed to fetch customer orders');
        } finally {
            setOrdersLoading(false);
        }
    };

    const handleDelete = async (orderId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this customer order? (This will archive the record).");
        if (!confirmDelete) return;

        try {
            await api.delete(`/api/customer-orders/${orderId}/`);
            // Optimistically update the local state to remove the deleted item
            setOrders((prev) => prev.filter((o) => o.id !== orderId));
            alert("Customer order deleted successfully.");
        } catch (err) {
            console.error('Failed to delete customer order', err);
            const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to delete order';
            alert(msg);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

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
        if (!orders || !searchField) return [];
        const uniqueValues = [...new Set(orders.map(o => o[searchField.value]))].filter(Boolean);
        return uniqueValues.map(val => ({ value: val, label: val }));
    };

    // Derived state for the filtered table
    const filteredOrders = useMemo(() => {
        if (!searchTerm) return orders;
        return orders.filter(order => order[searchField.value] === searchTerm.value);
    }, [orders, searchField, searchTerm]);

    const renderStatusBadge = (status) => {
        switch(status) {
            case 'DRAFT': return <span style={{ padding: '4px 8px', background: '#f3f4f6', color: '#4b5563', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Draft</span>;
            case 'APPROVED': return <span style={{ padding: '4px 8px', background: '#dbeafe', color: '#1e40af', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Approved</span>;
            case 'IN_PRODUCTION': return <span style={{ padding: '4px 8px', background: '#d1fae5', color: '#065f46', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>In Production</span>;
            case 'READY_FOR_DISPATCH': return <span style={{ padding: '4px 8px', background: '#fce7f3', color: '#9d174d', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Ready For Dispatch</span>;
            case 'DISPATCHED': return <span style={{ padding: '4px 8px', background: '#fef3c7', color: '#92400e', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Dispatched</span>;
            case 'CLOSED': return <span style={{ padding: '4px 8px', background: '#e5e7eb', color: '#374151', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Closed</span>;
            default: return <span style={{ padding: '4px 8px', background: '#f3f4f6', color: '#4b5563', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{status}</span>;
        }
    };

    return (
        <div className="inventory-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <button type="button" onClick={() => navigate('/')}>
                    Back to Home
                </button>
                {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                    <button type="button" onClick={() => navigate('/customer-orders/new')}>
                        Create New Order
                    </button>
                )}
            </div>
            <h1>Customer Orders</h1>

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
                            setSearchTerm(null); // Reset specific search term when jumping to a new column
                        }}
                        options={[
                            { value: 'po_number', label: 'PO Number' },
                            { value: 'company_name', label: 'Company' },
                            { value: 'client_name', label: 'Client' },
                            { value: 'part_name', label: 'Part' },
                            { value: 'status', label: 'Status' }
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
                {(searchTerm || searchField.value !== 'company_name') && (
                    <button 
                        onClick={() => {
                            setSearchTerm(null);
                            setSearchField({ value: 'company_name', label: 'Company' });
                        }}
                        style={{ 
                            marginTop: '22px', // Align visually with the inputs accounting for labels
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

            {/* Orders table */}
            <div className="inventory-table-wrapper" style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h2 style={{ margin: 0 }}>Current Orders</h2>
                    <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'bold' }}>
                        Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
                    </span>
                </div>
                
                {ordersLoading && <div>Loading orders...</div>}
                {ordersError && <div style={{ color: 'red' }}>{ordersError}</div>}
                {!ordersLoading && !ordersError && orders.length === 0 && (
                    <div>No customer orders yet.</div>
                )}
                {!ordersLoading && !ordersError && orders.length > 0 && filteredOrders.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No matches found</h3>
                        <p style={{ margin: 0, color: '#6b7280' }}>Try adjusting your search filters to find what you're looking for.</p>
                    </div>
                )}
                {!ordersLoading && !ordersError && filteredOrders.length > 0 && (
                    <div>
                        <table className="inventory-table">
                            <thead>
                                <tr>
                                    <th>PO Number</th>
                                    <th>Company</th>
                                    <th>Client</th>
                                    <th>Part</th>
                                    <th>Qty</th>
                                    <th>Deadline</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Created By</th>
                                    <th>Created At</th>
                                    <th>Last Edited By</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td>{order.po_number}</td>
                                        <td>{order.company_name}</td>
                                        <td>{order.client_name}</td>
                                        <td>{order.part_name}</td>
                                        <td>{order.quantity}</td>
                                        <td>{order.deadline}</td>
                                        <td>{order.priority}</td>
                                        <td>{renderStatusBadge(order.status)}</td>
                                        <td>{order.created_by_username || '-'}</td>
                                        <td>{order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</td>
                                        <td>{order.last_edited_by_username || '-'}</td>
                                        <td>
                                            {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => navigate(`/customer-orders/edit/${order.id}`)}
                                                        style={{
                                                            padding: '4px 8px',
                                                            fontSize: '12px',
                                                            backgroundColor: '#d97706',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(order.id)}
                                                        style={{
                                                            padding: '4px 8px',
                                                            fontSize: '12px',
                                                            backgroundColor: '#dc2626',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CustomerOrders;

