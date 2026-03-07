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

