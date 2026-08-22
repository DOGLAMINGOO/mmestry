import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import api from '../api';
import '../styles/Inventory.css';
import { fetchAllPages } from '../utils/fetchAllPages';
import { loadDraft, useSaveDraft, clearDraft } from '../hooks/useFormDraft';

function EditCustomerOrder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const draftKey = `customer-order-edit-draft-${id}`;

    const [companies, setCompanies] = useState([]);
    const [clients, setClients] = useState([]);
    const [parts, setParts] = useState([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userRole, setUserRole] = useState(null);

    const normalizeListData = (data) => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results;
        return [];
    };

    const [form, setForm] = useState(() =>
        loadDraft(draftKey, {
            company: '',
            client: '',
            part: '',
            quantity: 0,
            deadline: '',
            priority: 'MEDIUM',
            status: 'DRAFT',
            po_number: '',
            order_date: '',
            last_edit_reason: '',
        })
    );

    useSaveDraft(draftKey, form);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch selection options & user role
                const [companiesRes, clientsRes, partsRes, userRes] = await Promise.all([
                    fetchAllPages('/api/companies/?page=1'),
                    fetchAllPages('/api/clients/?page=1'),
                    fetchAllPages('/api/parts/?page=1'),
                    api.get('/api/user/me/').catch(() => ({ data: { role: null } }))
                ]);

                setCompanies(normalizeListData(companiesRes));
                setClients(normalizeListData(clientsRes));
                setParts(normalizeListData(partsRes));
                setUserRole(userRes.data.role);

                // Fetch existing order data
                const orderRes = await api.get(`/api/customer-orders/${id}/`);
                const order = orderRes.data;
                const existingDraft = loadDraft(draftKey, null);

                if (!existingDraft) {
                    setForm({
                        company: order.company || '',
                        client: order.client || '',
                        part: order.part || '',
                        quantity: order.quantity ?? 0,
                        deadline: order.deadline || '',
                        priority: order.priority || 'MEDIUM',
                        status: order.status || 'DRAFT',
                        po_number: order.po_number || '',
                        order_date: order.po_date || '',
                        last_edit_reason: '', // Mandatory empty on load
                    });
                }

            } catch (err) {
                console.error('Failed to load edit customer order data', err);
                alert('Error loading order data. Please return to the orders page.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    useEffect(() => {
        document.title = 'Edit Order - MMestry';
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const nextValue = name === 'quantity' ? value.replace(/^0+(?=\d)/, '') : value;
        setForm((prev) => ({ ...prev, [name]: nextValue }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate basic fields
        if (!form.company || !form.client || !form.part) {
            alert('Please select company, client, and part.');
            return;
        }
        if (!form.quantity || parseInt(form.quantity, 10) <= 0) {
            alert('Quantity must be a positive number.');
            return;
        }
        if (!form.po_number || form.po_number.trim() === '') {
            alert('Please enter a PO number. This will be used throughout the order lifecycle.');
            return;
        }
        if (!form.order_date) {
            alert('Order date is required. Please select a date.');
            return;
        }
        if (!form.deadline) {
            alert('Please select a deadline.');
            return;
        }

        // Validate mandatory last_edit_reason
        if (!form.last_edit_reason || form.last_edit_reason.trim() === '') {
            alert('A reason for editing MUST be provided to save changes.');
            return;
        }

        setSubmitting(true);
        try {
            await api.put(`/api/customer-orders/${id}/`, {
                po_number: form.po_number.trim(),
                po_date: form.order_date,
                company: Number(form.company),
                client: Number(form.client),
                part: Number(form.part),
                quantity: Number(form.quantity),
                deadline: form.deadline,
                priority: form.priority,
                status: form.status,
                last_edit_reason: form.last_edit_reason.trim(),
            });
            clearDraft(draftKey);
            alert('Customer order updated successfully');
            navigate('/customer-orders');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to update order';
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div>Loading order details...</div>;
    }

    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        return (
            <div className="inventory-container">
                <button type="button" onClick={() => navigate('/customer-orders')} style={{ marginBottom: 16 }}>
                    Back to Orders
                </button>
                <h2>Unauthorized</h2>
                <p>You do not have permission to edit customer orders.</p>
            </div>
        );
    }

    return (
        <div className="inventory-container">
            <button type="button" onClick={() => navigate('/customer-orders')} style={{ marginBottom: 16 }}>
                Back to Orders
            </button>
            <h1>Edit Customer Order</h1>
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
                        <option value="IN_PRODUCTION">In production</option>
                        <option value="READY_FOR_DISPATCH">Ready for dispatch</option>
                        <option value="DISPATCHED">Dispatched</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                </label>

                <label style={{ color: '#d97706', fontWeight: 'bold' }}>
                    Reason for Edit (Required)*
                    <textarea
                        name="last_edit_reason"
                        value={form.last_edit_reason}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Must explain why this customer order was changed..."
                        style={{ width: '100%', padding: 8, marginTop: 4, borderColor: '#d97706' }}
                    />
                </label>

                <button
                    type="submit"
                    disabled={submitting}
                    style={{
                        marginTop: 8,
                        padding: '10px 16px',
                        backgroundColor: '#d97706',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                    }}
                >
                    {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
            </form>
        </div>
    );
}

export default EditCustomerOrder;
