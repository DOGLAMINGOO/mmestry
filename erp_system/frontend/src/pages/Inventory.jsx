import React, { useState, useEffect } from 'react';
import api from '../api';
import '../styles/Inventory.css'

function Inventory() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [parts, setParts] = useState([]);
    
    // Form state
    const [formData, setFormData] = useState({
        company: '',
        part: '',
        blanks_qty: '',
        finished_qty: '',
        reserved_qty: '',
    });
    const [editingId, setEditingId] = useState(null);
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

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
            const response = await api.get('/api/inventory');
            setInventory(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch inventory data');
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            // Keep raw string so user can clear the field;
            // we'll convert to numbers on submit.
            [name]: value,
        }));
        setFormError(null);
    };

    const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
        'Are you sure you want to delete this inventory record?'
    );

    if (!confirmDelete) return;

    try {
        await api.delete(`/api/inventory/delete/${id}/`);
        await getInventory(); // refresh list
    } catch (err) {
        alert('Failed to delete inventory item.');
        console.error(err);
    }
};


    const handleEditClick = (item) => {
        setEditingId(item.id);
        setFormError(null);
        setFormData({
            company: item.company,
            part: item.part,
            blanks_qty: item.blanks_qty?.toString() ?? '',
            finished_qty: item.finished_qty?.toString() ?? '',
            reserved_qty: item.reserved_qty?.toString() ?? '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormError(null);
        setFormData({
            company: '',
            part: '',
            blanks_qty: '',
            finished_qty: '',
            reserved_qty: '',
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        setSubmitting(true);

        try {
            // Convert quantity strings to numbers for submission; default to 0
            const submitData = {
                ...formData,
                blanks_qty: formData.blanks_qty === '' ? 0 : parseInt(formData.blanks_qty, 10) || 0,
                finished_qty: formData.finished_qty === '' ? 0 : parseInt(formData.finished_qty, 10) || 0,
                reserved_qty: formData.reserved_qty === '' ? 0 : parseInt(formData.reserved_qty, 10) || 0,
            };

            if (editingId) {
                await api.put(`/api/inventory/${editingId}`, submitData);
            } else {
                await api.post('/api/inventory', submitData);
            }
            // Reset form
            setEditingId(null);
            setFormData({
                company: '',
                part: '',
                blanks_qty: '',
                finished_qty: '',
                reserved_qty: '',
            });
            // Refresh inventory list
            await getInventory();
        } catch (err) {
            if (err.response?.data) {
                // Handle unique together constraint error
                const errorData = err.response.data;
                if (errorData.non_field_errors || 
                    (errorData.company && errorData.part) ||
                    errorData.detail) {
                    setFormError('This company and part combination already exists. Each company can only have one inventory entry per part.');
                } else {
                    setFormError(err.response.data.detail || 'Failed to create inventory. Please check your input.');
                }
            } else {
                setFormError('Failed to create inventory. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };



    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="inventory-container">
            <a href='/'><button>Go to home page</button></a>
                <h1>Inventory</h1>
            
            {/* Add Inventory Form */}
            <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                <h2>{editingId ? 'Edit Inventory' : 'Add New Inventory'}</h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: '24px', rowGap: '15px', marginBottom: '15px' }}>
                        <div>
                            <label htmlFor="company" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Company</label>
                            <select
                                id="company"
                                name="company"
                                value={formData.company}
                                onChange={handleInputChange}
                                required
                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                            >
                                <option value="">Select Company</option>
                                {companies.map(company => (
                                    <option key={company.id} value={company.id}>
                                        {company.name} ({company.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label htmlFor="part" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Part</label>
                            <select
                                id="part"
                                name="part"
                                value={formData.part}
                                onChange={handleInputChange}
                                required
                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                            >
                                <option value="">Select Part</option>
                                {parts.map(part => (
                                    <option key={part.id} value={part.id}>
                                        {part.part_number} - {part.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label htmlFor="blanks_qty" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Blanks Qty</label>
                            <input
                                type="number"
                                id="blanks_qty"
                                name="blanks_qty"
                                value={formData.blanks_qty}
                                onChange={handleInputChange}
                                min="0"
                                placeholder="0"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="finished_qty" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Finished Qty</label>
                            <input
                                type="number"
                                id="finished_qty"
                                name="finished_qty"
                                value={formData.finished_qty}
                                onChange={handleInputChange}
                                min="0"
                                placeholder="0"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="reserved_qty" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Reserved Qty</label>
                            <input
                                type="number"
                                id="reserved_qty"
                                name="reserved_qty"
                                value={formData.reserved_qty}
                                onChange={handleInputChange}
                                min="0"
                                placeholder="0"
                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                            />
                        </div>
                    </div>
                    
                    {formError && (
                        <div style={{ color: '#dc2626', marginBottom: '10px', padding: '10px', backgroundColor: '#fee2e2', borderRadius: '4px' }}>
                            {formError}
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button 
                            type="submit" 
                            disabled={submitting}
                            style={{ 
                                padding: '10px 20px', 
                                backgroundColor: '#2563eb', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '4px', 
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                opacity: submitting ? 0.6 : 1
                            }}
                        >
                            {submitting
                                ? (editingId ? 'Updating...' : 'Adding...')
                                : (editingId ? 'Update Inventory' : 'Add Inventory')}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                style={{
                                    padding: '10px 16px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Inventory Table */}
            <div className="inventory-table-wrapper">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Company</th>
                            <th>Part</th>
                            <th>Blanks Qty</th>
                            <th>Finished Qty</th>
                            <th>Reserved Qty</th>
                            <th>Added By</th>
                            <th>Updated By</th>
                            <th>Created At</th>
                            <th>Updated At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventory.map(item => (
                            <tr key={item.id}>
                                <td>{item.company_name}</td>
                                <td>{item.part_name}</td>
                                <td>{item.blanks_qty}</td>
                                <td>{item.finished_qty}</td>
                                <td>{item.reserved_qty}</td>
                                <td>{item.added_by || '-'}</td>
                                <td>{item.updated_by || '-'}</td>
                                <td>{new Date(item.created_at).toLocaleString()}</td>
                                <td>{new Date(item.updated_at).toLocaleString()}</td>

                                <td>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleEditClick(item)}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '12px',
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDelete(item.id)}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '12px',
                                            backgroundColor: '#dc2626',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Delete
                                    </button>
                                    </div>
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