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

    const [form, setForm] = useState({
        company: '',
        client: '',
        part: '',
        quantity: '',
        deadline: '',
        priority: 'MEDIUM',
        status: 'DRAFT',
    });

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.company || !form.client || !form.part) {
            alert('Please select company, client, and part.');
            return;
        }
        if (!form.quantity || parseInt(form.quantity, 10) <= 0) {
            alert('Quantity must be a positive number.');
            return;
        }
        if (!form.deadline) {
            alert('Please select a deadline.');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/api/customer-orders/', {
                company: Number(form.company),
                client: Number(form.client),
                part: Number(form.part),
                quantity: Number(form.quantity),
                deadline: form.deadline,
                priority: form.priority,
                status: form.status,
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
                    Company
                    <Select
                        name="company"
                        options={companies.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                        value={companies.map(c => ({ value: c.id, label: `${c.name} (${c.code})` })).find(opt => opt.value === Number(form.company)) || null}
                        onChange={(selected) => setForm(prev => ({ ...prev, company: selected ? selected.value : '' }))}
                        isClearable
                        placeholder="Search company..."
                        styles={{ container: (base) => ({ ...base, marginTop: 4 }) }}
                    />
                </label>

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
                    Part
                    <Select
                        name="part"
                        options={parts.map(p => ({ value: p.id, label: `${p.part_number} - ${p.name}` }))}
                        value={parts.map(p => ({ value: p.id, label: `${p.part_number} - ${p.name}` })).find(opt => opt.value === Number(form.part)) || null}
                        onChange={(selected) => setForm(prev => ({ ...prev, part: selected ? selected.value : '' }))}
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
                        value={form.quantity}
                        onChange={handleChange}
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                    />
                </label>

                <label>
                    Deadline
                    <input
                        type="date"
                        name="deadline"
                        value={form.deadline}
                        onChange={handleChange}
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                    />
                </label>

                <label>
                    Priority
                    <select
                        name="priority"
                        value={form.priority}
                        onChange={handleChange}
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
                        value={form.status}
                        onChange={handleChange}
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                    >
                        <option value="DRAFT">Draft</option>
                        <option value="APPROVED">Approved</option>
                    </select>
                </label>

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