import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import api from '../api';
import '../styles/Inventory.css';

function CreateCustomerOrder() {
    const navigate = useNavigate();

    const [companies, setCompanies] = useState([]);
    const [clients, setClients] = useState([]);
    const [parts, setParts] = useState([]);

    const today = new Date().toISOString().split('T')[0];
    const [form, setForm] = useState({
        client: '',
        po_number: '',
        order_date: today,
    });

    const [items, setItems] = useState([
        {
            company: '',
            part: '',
            quantity: '',
            deadline: '',
            priority: 'MEDIUM',
            status: 'DRAFT',
        },
    ]);

    const [submitting, setSubmitting] = useState(false);

    const [userRole, setUserRole] = useState(null);
    const [loadingRole, setLoadingRole] = useState(true);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [companiesRes, clientsRes, partsRes, userRes] = await Promise.all([
                    api.get('/api/companies/'),
                    api.get('/api/clients/'),
                    api.get('/api/parts/'),
                    api.get('/api/user/me/').catch(() => ({ data: { role: null } }))
                ]);
                setCompanies(companiesRes.data);
                setClients(clientsRes.data);
                setParts(partsRes.data);
                setUserRole(userRes.data.role);
            } catch (err) {
                console.error('Failed to load select options or user role', err);
                alert('Failed to load companies/clients/parts. Please refresh.');
            } finally {
                setLoadingRole(false);
            }
        };

        fetchOptions();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, field, value) => {
        setItems((prev) =>
            prev.map((item, idx) =>
                idx === index ? { ...item, [field]: value } : item
            )
        );
    };

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            {
                company: '',
                part: '',
                quantity: '',
                deadline: '',
                priority: 'MEDIUM',
                status: 'DRAFT',
            },
        ]);
    };

    const removeItem = (index) => {
        if (items.length <= 1) {
            return;
        }
        setItems((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.client) {
            alert('Please select a client.');
            return;
        }
        if (!form.po_number || form.po_number.trim() === '') {
            alert('Please enter a PO number. This will be used throughout the order lifecycle.');
            return;
        }

        let orderDate = form.order_date;
        if (!orderDate) {
            const defaultDate = new Date().toISOString().split('T')[0];
            alert('Order date not filled. Setting default to today.');
            orderDate = defaultDate;
            setForm((prev) => ({ ...prev, order_date: defaultDate }));
        }

        const invalidItem = items.find((item) => !item.company || !item.part || !item.quantity || parseInt(item.quantity, 10) <= 0 || !item.deadline);
        if (invalidItem) {
            alert('Each item must have a company, part, a positive quantity, and a deadline.');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/api/customer-orders/', {
                po_number: form.po_number.trim(),
                po_date: orderDate,
                client: Number(form.client),
                items: items.map((item) => ({
                    company: Number(item.company),
                    part: Number(item.part),
                    quantity: Number(item.quantity),
                    deadline: item.deadline,
                    priority: item.priority,
                    status: item.status,
                })),
            });
            alert('Customer order created successfully');
            navigate('/customer-orders');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create order';
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingRole) {
        return <div>Loading...</div>;
    }

    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        return (
            <div className="inventory-container">
                <button type="button" onClick={() => navigate('/customer-orders')} style={{ marginBottom: 16 }}>
                    Back to Orders
                </button>
                <h2>Unauthorized</h2>
                <p>You do not have permission to create customer orders.</p>
            </div>
        );
    }

    return (
        <div className="inventory-container">
            <button type="button" onClick={() => navigate('/customer-orders')} style={{ marginBottom: 16 }}>
                Back to Orders
            </button>
            <h1>Create Customer Order</h1>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, maxWidth: 600 }}>
                <label>
                    Client
                    <Select
                        name="client"
                        options={clients.map(cl => ({ value: cl.id, label: cl.name }))}
                        value={clients.map(cl => ({ value: cl.id, label: cl.name })).find(opt => opt.value === Number(form.client)) || null}
                        onChange={(selected) => setForm(prev => ({ ...prev, client: selected ? selected.value : '' }))}
                        isClearable
                        placeholder="Search client..."
                        styles={{ container: (base) => ({ ...base, marginTop: 4 }) }}
                    />
                </label>

                <label>
                    PO Number
                    <input
                        type="text"
                        name="po_number"
                        value={form.po_number}
                        onChange={handleChange}
                        placeholder="Enter manual PO number"
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                    />
                </label>

                <label>
                    Order Date
                    <input
                        type="date"
                        name="order_date"
                        value={form.order_date}
                        onChange={handleChange}
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                    />
                </label>

                <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
                    {items.map((item, index) => (
                        <div key={index} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <strong>Item {index + 1}</strong>
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        style={{
                                            backgroundColor: '#ef4444',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 4,
                                            padding: '6px 10px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>

                            <label>
                                Company
                                <Select
                                    name="company"
                                    options={companies.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                                    value={companies.map(c => ({ value: c.id, label: `${c.name} (${c.code})` })).find(opt => opt.value === Number(item.company)) || null}
                                    onChange={(selected) => handleItemChange(index, 'company', selected ? selected.value : '')}
                                    isClearable
                                    placeholder="Search company..."
                                    styles={{ container: (base) => ({ ...base, marginTop: 4 }) }}
                                />
                            </label>

                            <label>
                                Part
                                <Select
                                    name="part"
                                    options={parts.map(p => ({ value: p.id, label: `${p.part_number} - ${p.name}` }))}
                                    value={parts.map(p => ({ value: p.id, label: `${p.part_number} - ${p.name}` })).find(opt => opt.value === Number(item.part)) || null}
                                    onChange={(selected) => handleItemChange(index, 'part', selected ? selected.value : '')}
                                    isClearable
                                    placeholder="Search part..."
                                    styles={{ container: (base) => ({ ...base, marginTop: 4 }) }}
                                />
                            </label>

                            <label>
                                Quantity
                                <input
                                    type="number"
                                    name="quantity"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                                />
                            </label>

                            <label>
                                Deadline
                                <input
                                    type="date"
                                    name="deadline"
                                    value={item.deadline}
                                    onChange={(e) => handleItemChange(index, 'deadline', e.target.value)}
                                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                                />
                            </label>

                            <label>
                                Priority
                                <select
                                    name="priority"
                                    value={item.priority}
                                    onChange={(e) => handleItemChange(index, 'priority', e.target.value)}
                                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </label>

                            <label>
                                Status
                                <select
                                    name="status"
                                    value={item.status}
                                    onChange={(e) => handleItemChange(index, 'status', e.target.value)}
                                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                                >
                                    <option value="DRAFT">Draft</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="IN_PRODUCTION">In production</option>
                                    <option value="READY_FOR_DISPATCH">Ready for dispatch</option>
                                    <option value="DISPATCHED">Dispatched</option>
                                    <option value="CLOSED">Closed</option>
                                </select>
                            </label>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addItem}
                        style={{
                            padding: '10px 16px',
                            backgroundColor: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            width: 'fit-content',
                        }}
                    >
                        Add Another Part
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    style={{
                        marginTop: 8,
                        padding: '10px 16px',
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                    }}
                >
                    {submitting ? 'Creating...' : 'Create Order'}
                </button>
            </form>
        </div>
    );
}

export default CreateCustomerOrder;