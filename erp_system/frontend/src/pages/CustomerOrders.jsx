import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/Inventory.css';

function CustomerOrders() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [ordersError, setOrdersError] = useState(null);

    const [userRole, setUserRole] = useState(null);

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

            {/* Orders table */}
            <div className="inventory-table-wrapper" style={{ marginTop: 20 }}>
                <h2 style={{ marginBottom: 8 }}>Current Orders</h2>
                {ordersLoading && <div>Loading orders...</div>}
                {ordersError && <div style={{ color: 'red' }}>{ordersError}</div>}
                {!ordersLoading && !ordersError && orders.length === 0 && (
                    <div>No customer orders yet.</div>
                )}
                {!ordersLoading && !ordersError && orders.length > 0 && (
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
                                {orders.map((order) => (
                                    <tr key={order.id}>
                                        <td>{order.po_number}</td>
                                        <td>{order.company_name}</td>
                                        <td>{order.client_name}</td>
                                        <td>{order.part_name}</td>
                                        <td>{order.quantity}</td>
                                        <td>{order.deadline}</td>
                                        <td>{order.priority}</td>
                                        <td>{order.status}</td>
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

