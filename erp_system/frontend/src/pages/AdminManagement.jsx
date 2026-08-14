import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import api from '../api';
import PaginationControls from '../components/PaginationControls';
import '../styles/AdminManagement.css';

function AdminManagement() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    
    // Resource data
    const [parts, setParts] = useState([]);
    const [machines, setMachines] = useState([]);
    const [operators, setOperators] = useState([]);
    const [clients, setClients] = useState([]);

    // Active tab
    const [activeTab, setActiveTab] = useState('parts');

    // Form modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState(null);

    // Form data
    const [formData, setFormData] = useState({});
    const [editingId, setEditingId] = useState(null);

    // Search and filter
    const [searchField, setSearchField] = useState({ value: 'name', label: 'Name' });
    const [searchTerm, setSearchTerm] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await api.get('/api/user/me/');
                setUser(res.data);
                setUserRole(res.data.role);
                
                if (res.data.role !== 'ADMIN') {
                    navigate('/');
                    return;
                }
                
                document.title = 'Admin Management - MMestry';
                await fetchAllData();
            } catch (err) {
                console.error('Failed to fetch user:', err);
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, [navigate]);

    const fetchAllData = async () => {
        try {
            const [partRes, machineRes, operatorRes, clientRes] = await Promise.all([
                api.get('/api/admin/parts/'),
                api.get('/api/admin/machines/'),
                api.get('/api/admin/operators/'),
                api.get('/api/admin/clients/'),
            ]);

            setParts(partRes.data.results || partRes.data);
            setMachines(machineRes.data.results || machineRes.data);
            setOperators(operatorRes.data.results || operatorRes.data);
            setClients(clientRes.data.results || clientRes.data);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            alert('Failed to fetch data');
        }
    };

    const getCurrentData = () => {
        switch (activeTab) {
            case 'parts':
                return parts;
            case 'machines':
                return machines;
            case 'operators':
                return operators;
            case 'clients':
                return clients;
            default:
                return [];
        }
    };

    const getFieldOptions = () => {
        switch (activeTab) {
            case 'parts':
                return [
                    { value: 'name', label: 'Name' },
                    { value: 'part_number', label: 'Part Number' },
                    { value: 'description', label: 'Description' },
                ];
            case 'machines':
                return [
                    { value: 'name', label: 'Name' },
                ];
            case 'operators':
                return [
                    { value: 'name', label: 'Name' },
                ];
            case 'clients':
                return [
                    { value: 'name', label: 'Name' },
                ];
            default:
                return [];
        }
    };

    const getSearchOptions = () => {
        const data = getCurrentData();
        const fieldValue = searchField.value;
        
        return data
            .map(item => ({
                value: item.id,
                label: String(item[fieldValue] || ''),
            }))
            .filter(opt => opt.label)
            .reduce((unique, item) => {
                return unique.some(u => u.label === item.label) ? unique : [...unique, item];
            }, []);
    };

    const filteredData = useMemo(() => {
        let result = getCurrentData();
        if (searchTerm) {
            result = result.filter(item => item.id === searchTerm.value);
        }
        return result;
    }, [activeTab, searchTerm]);

    const openAddModal = () => {
        setFormData({});
        setEditingId(null);
        setShowAddModal(true);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setFormData({});
    };

    const openEditModal = (item) => {
        setFormData({ ...item });
        setEditingId(item.id);
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setFormData({});
        setEditingId(null);
    };

    const openDeleteModal = (id) => {
        setDeleteItemId(id);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setDeleteItemId(null);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: checked,
        }));
    };

    const submitForm = async () => {
        try {
            const endpoint = `/api/admin/${activeTab}/`;
            
            if (editingId) {
                // Update
                await api.patch(`${endpoint}${editingId}/`, formData);
                alert('Updated successfully');
            } else {
                // Create
                await api.post(endpoint, formData);
                alert('Created successfully');
            }
            
            closeAddModal();
            closeEditModal();
            await fetchAllData();
            setSearchTerm(null);
        } catch (err) {
            console.error('Error submitting form:', err);
            const errorMsg = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save';
            alert(errorMsg);
        }
    };

    const confirmDelete = async () => {
        try {
            const endpoint = `/api/admin/${activeTab}/${deleteItemId}/`;
            await api.delete(endpoint);
            alert('Deleted successfully');
            closeDeleteModal();
            await fetchAllData();
            setSearchTerm(null);
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Failed to delete');
        }
    };

    if (loading) {
        return <div style={{ padding: '20px' }}>Loading...</div>;
    }

    if (userRole !== 'ADMIN') {
        return <div style={{ padding: '20px', color: 'red' }}>Access Denied. Admin only.</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>Admin Management</h1>
            
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
                {['parts', 'machines', 'operators', 'clients'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => {
                            setActiveTab(tab);
                            setSearchTerm(null);
                            setSearchField({ value: 'name', label: 'Name' });
                        }}
                        style={{
                            padding: '12px 20px',
                            border: 'none',
                            background: activeTab === tab ? '#3b82f6' : '#f3f4f6',
                            color: activeTab === tab ? 'white' : '#1f2937',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            borderBottom: activeTab === tab ? '3px solid #1e40af' : 'none',
                            fontSize: '14px',
                            textTransform: 'capitalize',
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Search and Filter Bar */}
            <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '20px',
                alignItems: 'center',
                background: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
            }}>
                <div style={{ minWidth: '220px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>
                        Filter Column By
                    </label>
                    <Select
                        value={searchField}
                        onChange={(selected) => {
                            setSearchField(selected);
                            setSearchTerm(null);
                        }}
                        options={getFieldOptions()}
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
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm(null);
                            setSearchField({ value: 'name', label: 'Name' });
                        }}
                        style={{
                            marginTop: '22px',
                            padding: '10px 16px',
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            color: '#b91c1c',
                            fontFamily: 'Arial, sans-serif',
                        }}
                    >
                        Clear Filter
                    </button>
                )}
            </div>

            {/* Add Button */}
            <button
                onClick={openAddModal}
                style={{
                    padding: '10px 20px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    textTransform: 'capitalize',
                }}
            >
                Add New {activeTab.slice(0, -1)}
            </button>

            {/* Data Table */}
            <div style={{
                overflowX: 'auto',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: 'Arial, sans-serif',
                }}>
                    <thead>
                        <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                            {activeTab === 'parts' && (
                                <>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#374151' }}>Part Number</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#374151' }}>Name</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#374151' }}>Description</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#374151' }}>Cycle Time (min)</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#374151' }}>Actions</th>
                                </>
                            )}
                            {activeTab === 'machines' && (
                                <>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#374151' }}>Name</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#374151' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#374151' }}>Actions</th>
                                </>
                            )}
                            {activeTab === 'operators' && (
                                <>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#374151' }}>Name</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#374151' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#374151' }}>Actions</th>
                                </>
                            )}
                            {activeTab === 'clients' && (
                                <>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#374151' }}>Name</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#374151' }}>Actions</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? (
                            filteredData.map((item, idx) => (
                                <tr key={item.id} style={{
                                    borderBottom: '1px solid #e5e7eb',
                                    background: idx % 2 === 0 ? '#fff' : '#f9fafb',
                                }}>
                                    {activeTab === 'parts' && (
                                        <>
                                            <td style={{ padding: '12px', color: '#1f2937' }}>{item.part_number}</td>
                                            <td style={{ padding: '12px', color: '#1f2937' }}>{item.name}</td>
                                            <td style={{ padding: '12px', color: '#1f2937' }}>{item.description || 'N/A'}</td>
                                            <td style={{ padding: '12px', color: '#1f2937' }}>{item.cycle_time_minutes}</td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#3b82f6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        marginRight: '6px',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(item.id)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </>
                                    )}
                                    {activeTab === 'machines' && (
                                        <>
                                            <td style={{ padding: '12px', color: '#1f2937' }}>{item.name}</td>
                                            <td style={{ padding: '12px', color: '#1f2937' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    background: item.is_active ? '#dcfce7' : '#fee2e2',
                                                    color: item.is_active ? '#166534' : '#b91c1c',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                }}>
                                                    {item.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#3b82f6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        marginRight: '6px',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(item.id)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </>
                                    )}
                                    {activeTab === 'operators' && (
                                        <>
                                            <td style={{ padding: '12px', color: '#1f2937' }}>{item.name}</td>
                                            <td style={{ padding: '12px', color: '#1f2937' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    background: item.is_active ? '#dcfce7' : '#fee2e2',
                                                    color: item.is_active ? '#166534' : '#b91c1c',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                }}>
                                                    {item.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#3b82f6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        marginRight: '6px',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(item.id)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </>
                                    )}
                                    {activeTab === 'clients' && (
                                        <>
                                            <td style={{ padding: '12px', color: '#1f2937' }}>{item.name}</td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#3b82f6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        marginRight: '6px',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(item.id)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                                    No items found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {(showAddModal || showEditModal) && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2000,
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '24px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    }}>
                        <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#1f2937' }}>
                            {editingId ? `Edit ${activeTab.slice(0, -1)}` : `Add New ${activeTab.slice(0, -1)}`}
                        </h2>

                        {activeTab === 'parts' && (
                            <>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Part Number *</label>
                                    <input
                                        type="text"
                                        name="part_number"
                                        value={formData.part_number || ''}
                                        onChange={handleFormChange}
                                        placeholder="Enter part number"
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name || ''}
                                        onChange={handleFormChange}
                                        placeholder="Enter name"
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description || ''}
                                        onChange={handleFormChange}
                                        placeholder="Enter description"
                                        rows="3"
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Cycle Time (minutes) *</label>
                                    <input
                                        type="number"
                                        name="cycle_time_minutes"
                                        value={formData.cycle_time_minutes || ''}
                                        onChange={handleFormChange}
                                        placeholder="Enter cycle time"
                                        min="1"
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                            </>
                        )}

                        {(activeTab === 'machines' || activeTab === 'operators') && (
                            <>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name || ''}
                                        onChange={handleFormChange}
                                        placeholder="Enter name"
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#374151', fontWeight: 'bold' }}>
                                        <input
                                            type="checkbox"
                                            name="is_active"
                                            checked={formData.is_active !== undefined ? formData.is_active : true}
                                            onChange={handleCheckboxChange}
                                        />
                                        Active
                                    </label>
                                </div>
                            </>
                        )}

                        {activeTab === 'clients' && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name || ''}
                                    onChange={handleFormChange}
                                    placeholder="Enter name"
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    closeAddModal();
                                    closeEditModal();
                                }}
                                style={{
                                    padding: '10px 20px',
                                    background: '#e5e7eb',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    color: '#374151',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitForm}
                                style={{
                                    padding: '10px 20px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                }}
                            >
                                {editingId ? 'Update' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2000,
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '24px',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    }}>
                        <h2 style={{ marginTop: 0, marginBottom: '16px', color: '#1f2937' }}>
                            Confirm Delete
                        </h2>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                            Are you sure you want to delete this item? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={closeDeleteModal}
                                style={{
                                    padding: '10px 20px',
                                    background: '#e5e7eb',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    color: '#374151',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                style={{
                                    padding: '10px 20px',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminManagement;
