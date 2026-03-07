import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

    useEffect(() => {
        getInventory();
        getCompanies();
        getParts();
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

    // fetch current user to determine role-based permissions
    useEffect(() => {
        const fetchUser = async () => {
            try{
                const res = await api.get('/api/user/me/');
                setUserRole(res.data.role || null);
            }catch(err){
                // ignore unauthenticated
            }
        };
        fetchUser();
    }, []);



    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="inventory-container">
            <a href='/'><button>Go to home page</button></a>
                <h1>Inventory</h1>
            
            {/* Inventory is read-only in the frontend. Adjustments are performed via business events or by superusers using Adjust. */}

            {/* Inventory Table */}
            <div className="inventory-table-wrapper">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Company</th>
                            <th>Part</th>
                            <th>Blanks Qty</th>
                            <th>Finished Qty</th>
                            
                            <th>Last Adjusted By</th>
                            <th>Last Adjusted At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventory.map(item => (
                            <tr 
                                key={item.id}
                                style={{ cursor: 'default' }}
                            >
                                <td>{item.company_name}</td>
                                <td>
                                    <span 
                                        onClick={() => navigate(`/inventory/${item.id}`)}
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
                                <td>{item.blanks_qty}</td>
                                <td>{item.finished_qty}</td>
                                
                                <td>{item.last_adjusted_by || '-'}</td>
                                <td>{item.last_adjusted_at ? new Date(item.last_adjusted_at).toLocaleString() : '-'}</td>

                                <td>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {(userRole === 'ADMIN' || userRole === 'STOCK_MANAGER') && (
                                            <button
                                                type="button"
                                                onClick={() => openAdjust(item)}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '12px',
                                                    backgroundColor: '#f59e0b',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Adjust
                                            </button>
                                        )}
                                    </div>
                                {/* Adjust Modal */}
                                {adjustModalOpen && adjustItem && (
                                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                                        <div style={{ width: 420, background: '#fff', padding: 20, borderRadius: 8 }}>
                                            <h3 style={{ marginTop: 0 }}>Adjust Inventory</h3>
                                            <p><strong>{adjustItem.company_name} — {adjustItem.part_name}</strong></p>
                                            <div style={{ display: 'grid', gap: 10 }}>
                                                <label>
                                                    Field
                                                    <select name="field" value={adjustForm.field} onChange={handleAdjustChange} style={{ width: '100%', padding: 8 }}>
                                                        <option value="blanks">Blanks</option>
                                                        <option value="finished">Finished</option>
                                                        
                                                    </select>
                                                </label>

                                                <label>
                                                    Action
                                                    <select name="action" value={adjustForm.action} onChange={handleAdjustChange} style={{ width: '100%', padding: 8 }}>
                                                        <option value="increase">Increase</option>
                                                        <option value="decrease">Decrease</option>
                                                    </select>
                                                </label>

                                                <label>
                                                    Quantity
                                                    <input name="quantity" type="number" min="1" value={adjustForm.quantity} onChange={handleAdjustChange} style={{ width: '100%', padding: 8 }} />
                                                </label>

                                                <label>
                                                    Reason*
                                                    <textarea name="reason" value={adjustForm.reason} onChange={handleAdjustChange} rows={3} style={{ width: '100%', padding: 8 }} />
                                                </label>

                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                    <button onClick={closeAdjust} style={{ padding: '8px 12px' }}>Cancel</button>
                                                    <button onClick={submitAdjust} style={{ padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>Submit</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                </td>
                                
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Inventory;