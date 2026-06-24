import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import api from '../api';

function CreateProductionEntry() {
    const { id: customerOrderId } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [machines, setMachines] = useState([]);
    const [operators, setOperators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        machine_name: '',
        operator_name: '',
        start_time: new Date().toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [orderRes, machRes, opRes] = await Promise.all([
                    api.get(`/api/customer-orders/${customerOrderId}/`),
                    api.get('/api/machines/'),
                    api.get('/api/operators/')
                ]);
                setOrder(orderRes.data);
                
                // Map to react-select options format { value, label }
                setMachines(machRes.data.map(m => ({ value: m.name, label: m.name })));
                setOperators(opRes.data.map(o => ({ value: o.name, label: o.name })));

            } catch (err) {
                console.error("Failed to load setup data", err);
                alert("Failed to load requisite data.");
                navigate('/production');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [customerOrderId, navigate]);

    useEffect(() => {
        document.title = 'Start Production Entry - MMestry';
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.machine_name || !form.operator_name || !form.start_time) {
            alert('Machine Name, Operator Name, and Start Time are required.');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/api/production-reports/', {
                customer_order: customerOrderId,
                machine_name: form.machine_name,
                operator_name: form.operator_name,
                start_time: new Date(form.start_time).toISOString(), // ensure standard ISO format for backend
                deadline: order.deadline,
                required_quantity: order.quantity,
                status: 'IN_PROGRESS'
            });
            alert('Production Entry started successfully!');
            navigate('/production');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create report';
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading order details...</div>;
    if (!order) return null;

    return (
        <div className="inventory-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <button type="button" onClick={() => navigate('/production')} style={{ marginBottom: 16 }}>
                Back to Production
            </button>
            <h1>Start Production Entry</h1>
            
            {/* Context Card */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#334155' }}>Order Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                    <div><strong>PO Number:</strong> {order.po_number}</div>
                    <div><strong>Deadline:</strong> {order.deadline}</div>
                    <div><strong>Client:</strong> {order.client_name}</div>
                    <div><strong>Part:</strong> {order.part_name}</div>
                    <div><strong>Target Qty:</strong> {order.quantity}</div>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
                <label>
                    Machine Name *
                    <Select
                        options={machines}
                        value={machines.find(m => m.value === form.machine_name) || null}
                        onChange={(selected) => setForm({ ...form, machine_name: selected ? selected.value : '' })}
                        isClearable
                        placeholder="Select or search machine..."
                        styles={{ container: base => ({ ...base, marginTop: '4px' }) }}
                    />
                </label>

                <label>
                    Operator Name *
                    <Select
                        options={operators}
                        value={operators.find(o => o.value === form.operator_name) || null}
                        onChange={(selected) => setForm({ ...form, operator_name: selected ? selected.value : '' })}
                        isClearable
                        placeholder="Select or search operator..."
                        styles={{ container: base => ({ ...base, marginTop: '4px' }) }}
                    />
                </label>

                <label>
                    Start Time *
                    <input
                        type="datetime-local"
                        name="start_time"
                        value={form.start_time}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                    />
                </label>

                <button
                    type="submit"
                    disabled={submitting}
                    style={{
                        padding: '12px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '15px',
                        marginTop: '8px'
                    }}
                >
                    {submitting ? 'Starting...' : 'Start Production'}
                </button>
            </form>
        </div>
    );
}

export default CreateProductionEntry;
