import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import api from '../api';
import '../styles/Inventory.css';
import { loadDraft, useSaveDraft, clearDraft } from '../hooks/useFormDraft';

const defaultPart = {
    part: '',
    quantity: '',
    deadline: '',
    priority: 'MEDIUM',
    status: 'DRAFT',
};

function CreateCustomerOrder() {
    const navigate = useNavigate();
    const draftKey = 'customer-order-draft-new';

    const [companies, setCompanies] = useState([]);
    const [clients, setClients] = useState([]);
    const [parts, setParts] = useState([]);

    const today = new Date().toISOString().split('T')[0];
    const [form, setForm] = useState(() =>
        loadDraft(draftKey, {
            company: '',
            client: '',
            po_number: '',
            order_date: today,
        })
    );

    const [savedParts, setSavedParts] = useState(() =>
        loadDraft(`${draftKey}-savedParts`, [])
    );
    const [currentPart, setCurrentPart] = useState(() =>
        loadDraft(`${draftKey}-currentPart`, defaultPart)
    );
    const [editPartIndex, setEditPartIndex] = useState(null);

    useSaveDraft(draftKey, form);
    useSaveDraft(`${draftKey}-savedParts`, savedParts);
    useSaveDraft(`${draftKey}-currentPart`, currentPart);

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

    useEffect(() => {
        document.title = 'Create Order - MMestry';
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCurrentPartChange = (field, value) => {
        setCurrentPart((prev) => ({ ...prev, [field]: value }));
    };

    const validatePart = (part) => {
        if (!part.part) return 'Please select a part before saving.';
        if (!part.quantity || parseInt(part.quantity, 10) <= 0) return 'Quantity must be a positive number before saving.';
        if (!part.deadline) return 'Please select a deadline before saving.';
        return null;
    };

    const savePartToTable = (addAnother = false) => {
        const validationError = validatePart(currentPart);
        if (validationError) {
            alert(validationError);
            return false;
        }

        setSavedParts((prev) => {
            const next = [...prev];
            if (editPartIndex !== null && editPartIndex >= 0 && editPartIndex < next.length) {
                next[editPartIndex] = currentPart;
            } else {
                next.push(currentPart);
            }
            return next;
        });

        setCurrentPart(defaultPart);
        setEditPartIndex(null);

        if (addAnother) {
            alert('Part saved. Add another part below.');
        } else {
            alert('Part saved.');
        }
        return true;
    };

    const handleSaveAndAddAnotherPart = () => {
        savePartToTable(true);
    };

    const handleSavePart = () => {
        savePartToTable(false);
    };

    const handleEditPart = (index) => {
        setCurrentPart(savedParts[index]);
        setEditPartIndex(index);
    };

    const handleDeletePart = (index) => {
        setSavedParts((prev) => prev.filter((_, idx) => idx !== index));
        if (editPartIndex === index) {
            setCurrentPart(defaultPart);
            setEditPartIndex(null);
        }
    };

    const handleCancelEdit = () => {
        setCurrentPart(defaultPart);
        setEditPartIndex(null);
    };

    const isCurrentPartDirty = () => {
        return Boolean(currentPart.part || currentPart.quantity || currentPart.deadline || currentPart.priority !== 'MEDIUM' || currentPart.status !== 'DRAFT');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.company) {
            alert('Please select a company.');
            return;
        }
        if (!form.client) {
            alert('Please select a client.');
            return;
        }
        if (!form.po_number || form.po_number.trim() === '') {
            alert('Please enter a PO number. This will be used throughout the order lifecycle.');
            return;
        }
        if (savedParts.length === 0) {
            alert('Please save at least one part before submitting.');
            return;
        }
        if (isCurrentPartDirty()) {
            alert('Please save or clear the current part before submitting.');
            return;
        }

        let orderDate = form.order_date;
        if (!orderDate) {
            const defaultDate = new Date().toISOString().split('T')[0];
            alert('Order date not filled. Setting default to today.');
            orderDate = defaultDate;
            setForm((prev) => ({ ...prev, order_date: defaultDate }));
        }

        setSubmitting(true);
        try {
            await api.post('/api/customer-orders/', {
                po_number: form.po_number.trim(),
                po_date: orderDate,
                company: Number(form.company),
                client: Number(form.client),
                items: savedParts.map((item) => ({
                    part: Number(item.part),
                    quantity: Number(item.quantity),
                    deadline: item.deadline,
                    priority: item.priority,
                    status: item.status,
                })),
            });
            clearDraft(draftKey);
            clearDraft(`${draftKey}-savedParts`);
            clearDraft(`${draftKey}-currentPart`);
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
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', width: '100%' }}>
                <div style={{ display: 'grid', gap: 16, flex: '1 1 560px', minWidth: 320 }}>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <label>
                            Company
                            <Select
                                name="company"
                                options={companies.map(c => ({ value: c.id, label: c.name }))}
                                value={companies.map(c => ({ value: c.id, label: c.name })).find(opt => opt.value === Number(form.company)) || null}
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
                    </div>

                    <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                        <h2 style={{ margin: '0 0 12px 0' }}>{editPartIndex !== null ? 'Edit Part' : 'Add Part'}</h2>

                        <label>
                            Part
                            <Select
                                name="part"
                                options={parts.map(p => ({ value: p.id, label: `${p.part_number} - ${p.name}` }))}
                                value={parts.map(p => ({ value: p.id, label: `${p.part_number} - ${p.name}` })).find(opt => opt.value === Number(currentPart.part)) || null}
                                onChange={(selected) => handleCurrentPartChange('part', selected ? selected.value : '')}
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
                                value={currentPart.quantity}
                                onChange={(e) => handleCurrentPartChange('quantity', e.target.value)}
                                style={{ width: '100%', padding: 8, marginTop: 4 }}
                            />
                        </label>

                        <label>
                            Deadline
                            <input
                                type="date"
                                name="deadline"
                                value={currentPart.deadline}
                                onChange={(e) => handleCurrentPartChange('deadline', e.target.value)}
                                style={{ width: '100%', padding: 8, marginTop: 4 }}
                            />
                        </label>

                        <label>
                            Priority
                            <select
                                name="priority"
                                value={currentPart.priority}
                                onChange={(e) => handleCurrentPartChange('priority', e.target.value)}
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
                                value={currentPart.status}
                                onChange={(e) => handleCurrentPartChange('status', e.target.value)}
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

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                            <button
                                type="button"
                                onClick={handleSavePart}
                                style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                            >
                                Save Part
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAndAddAnotherPart}
                                style={{ padding: '10px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                            >
                                Save & Add Another Part
                            </button>
                            {editPartIndex !== null && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    style={{ padding: '10px 16px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>
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
                </div>

                <div style={{ flex: '0 0 420px', minWidth: 320 }}>
                    {savedParts.length > 0 && (
                        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                            <h2 style={{ margin: '0 0 12px 0' }}>Parts Added</h2>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Part</th>
                                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Quantity</th>
                                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Deadline</th>
                                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Priority</th>
                                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Status</th>
                                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {savedParts.map((item, index) => (
                                        <tr key={index} style={{ backgroundColor: index % 2 ? '#fff' : '#f9fafb' }}>
                                            <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>
                                                {parts.find((p) => p.id === Number(item.part))?.name || 'Unknown'}
                                            </td>
                                            <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>{item.quantity}</td>
                                            <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>{item.deadline}</td>
                                            <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>{item.priority}</td>
                                            <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>{item.status}</td>
                                            <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditPart(index)}
                                                    style={{ marginRight: 8, backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer' }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeletePart(index)}
                                                    style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer' }}
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}

export default CreateCustomerOrder;