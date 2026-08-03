import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import api from '../api';

function EditProductionEntry() {
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        document.title = 'Edit Production Entry - MMestry';
    }, []);

    const [report, setReport] = useState(null);
    const [machines, setMachines] = useState([]);
    const [operators, setOperators] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const normalizeListData = (data) => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results;
        return [];
    };

    const [form, setForm] = useState({
        machine_name: '',
        operator_name: '',
        start_time: '',
        produced_quantity: '',
        scrap_quantity: '0',
        end_time: new Date().toISOString().slice(0, 16),
        operator_working_hours: '',
        parts_made_in_working_hours: '',
        operator_overtime_hours: '0',
        parts_made_in_overtime: '0',
        idle_time_hours: '0',
        idle_reason: '',
        job_rating: 'EXCELLENT',
        remarks: '',
        status: 'COMPLETED'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [reportRes, machRes, opRes, userRes] = await Promise.all([
                    api.get(`/api/production-reports/${id}/`),
                    api.get('/api/machines/'),
                    api.get('/api/operators/'),
                    api.get('/api/user/me/').catch(() => ({ data: { role: null } }))
                ]);
                
                const data = reportRes.data;
                setReport(data);
                setMachines(normalizeListData(machRes.data).map(m => ({ value: m.name, label: m.name })));
                setOperators(normalizeListData(opRes.data).map(o => ({ value: o.name, label: o.name })));
                setUserRole(userRes.data.role || null);
                
                setForm({
                    machine_name: data.machine_name || '',
                    operator_name: data.operator_name || '',
                    start_time: data.start_time ? data.start_time.slice(0, 16) : '',
                    produced_quantity: '',
                    scrap_quantity: data.scrap_quantity || '0',
                    end_time: data.end_time ? data.end_time.slice(0, 16) : new Date().toISOString().slice(0, 16),
                    operator_working_hours: data.operator_working_hours || '',
                    parts_made_in_working_hours: data.parts_made_in_working_hours || '',
                    operator_overtime_hours: data.operator_overtime_hours || '0',
                    parts_made_in_overtime: data.parts_made_in_overtime || '0',
                    idle_time_hours: data.idle_time_hours || '0',
                    idle_reason: data.idle_reason || '',
                    job_rating: data.job_rating || 'EXCELLENT',
                    remarks: data.remarks || '',
                    status: data.status || 'COMPLETED'
                });
            } catch (err) {
                console.error("Failed to load setup data", err);
                alert("Failed to load requisite data.");
                navigate('/production');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, navigate]);

    const handleChange = (e) => {
        const value = e.target.type === 'number'
            ? e.target.value.replace(/^0+(?=\d)/, '')
            : e.target.value;
        setForm({ ...form, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const idleHours = parseFloat(form.idle_time_hours) || 0;
        if (idleHours > 0 && (!form.idle_reason || form.idle_reason.trim() === '')) {
            alert('Idle Reason is mandatory when Idle Time is greater than 0.');
            return;
        }

        if (form.job_rating !== 'EXCELLENT' && (!form.remarks || form.remarks.trim() === '')) {
            alert(`Remarks are mandatory when Job Rating is ${form.job_rating.replace('_', ' ')}.`);
            return;
        }

        setSubmitting(true);
        try {
            const payload = { ...form };
            if (payload.start_time) {
                payload.start_time = new Date(payload.start_time).toISOString();
            }
            if (payload.end_time) {
                 payload.end_time = new Date(payload.end_time).toISOString();
            }
            
            payload.status = 'COMPLETED';

            await api.patch(`/api/production-reports/${id}/`, payload);
            alert('Production Report finalized successfully!');
            navigate('/production');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save report';
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading production data...</div>;
    if (!report) return null;

    const canEdit = userRole === 'ADMIN' || userRole === 'STOCK_MANAGER';
    if (!canEdit) {
        return (
            <div className="inventory-container" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
                <button type="button" onClick={() => navigate('/production')} style={{ marginBottom: 16 }}>
                    Back to Dashboard
                </button>
                <h1>Access Restricted</h1>
                <p>You do not have permission to edit production entries.</p>
            </div>
        );
    }

    const co = report.customer_order_details;
    const isCompleted = report.status === 'COMPLETED';
    const targetQty = Number(report.required_quantity ?? co?.quantity ?? 0);
    const finishedQty = Number(report.produced_quantity ?? 0);
    const remainingQty = Math.max(0, targetQty - finishedQty);

    return (
        <div className="inventory-container" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
            <button type="button" onClick={() => navigate('/production')} style={{ marginBottom: 16 }}>
                Back to Dashboard
            </button>
            <h1>{isCompleted ? 'Edit' : 'Complete'} Production Entry #{report.id}</h1>
            
            {/* Context Card */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#334155' }}>Order Context</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '14px' }}>
                    <div><strong>PO Number:</strong> <br/>{co?.po_number}</div>
                    <div><strong>Part:</strong> <br/>{co?.part_name}</div>
                    <div><strong>Client:</strong> <br/>{co?.client_name}</div>
                    
                    <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '4px', gridColumn: 'span 3', border: '1px solid #bae6fd', marginTop: '8px' }}>
                        <strong>Required Target Quantity:</strong> {targetQty}
                    </div>
                    <div style={{ background: '#ecfeff', padding: '8px', borderRadius: '4px', gridColumn: 'span 3', border: '1px solid #a5f3fc', marginTop: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                            <div><strong>Req Qty:</strong> {targetQty}</div>
                            <div><strong>Finished Qty:</strong> {finishedQty}</div>
                            <div><strong>Remaining:</strong> {remainingQty}</div>
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#0f766e' }}>
                            Enter the additional finished quantity for this update. The system will add it to the previously saved total.
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#9a2c00' }}>Production Entry Log</h3>
                {Array.isArray(report.entry_logs) && report.entry_logs.length > 0 ? (
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {report.entry_logs.slice().reverse().map((entry, index) => (
                            <details key={`${entry.saved_at}-${index}`} style={{ border: '1px solid #fed7aa', borderRadius: '6px', padding: '10px', background: '#fffbeb' }}>
                                <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9a2c00' }}>
                                    Save {report.entry_logs.length - index} • {new Date(entry.saved_at).toLocaleString()}
                                </summary>
                                <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', fontSize: '13px' }}>
                                    <div><strong>Qty Added:</strong> {entry.delta?.produced_quantity ?? 0}</div>
                                    <div><strong>Finished Total:</strong> {entry.totals?.produced_quantity ?? 0}</div>
                                    <div><strong>Working Hrs:</strong> {entry.delta?.operator_working_hours ?? 0}</div>
                                    <div><strong>Working Hrs Total:</strong> {entry.totals?.operator_working_hours ?? 0}</div>
                                    <div><strong>Parts in Working Hrs:</strong> {entry.delta?.parts_made_in_working_hours ?? 0}</div>
                                    <div><strong>Parts in Working Hrs Total:</strong> {entry.totals?.parts_made_in_working_hours ?? 0}</div>
                                    <div><strong>Overtime Hrs:</strong> {entry.delta?.operator_overtime_hours ?? 0}</div>
                                    <div><strong>Overtime Hrs Total:</strong> {entry.totals?.operator_overtime_hours ?? 0}</div>
                                    <div><strong>Overtime Parts:</strong> {entry.delta?.parts_made_in_overtime ?? 0}</div>
                                    <div><strong>Overtime Parts Total:</strong> {entry.totals?.parts_made_in_overtime ?? 0}</div>
                                    <div><strong>Idle Hrs:</strong> {entry.delta?.idle_time_hours ?? 0}</div>
                                    <div><strong>Idle Hrs Total:</strong> {entry.totals?.idle_time_hours ?? 0}</div>
                                    <div style={{ gridColumn: 'span 2' }}><strong>Idle Reason:</strong> {entry.totals?.idle_reason || '-'}</div>
                                </div>
                            </details>
                        ))}
                    </div>
                ) : (
                    <p style={{ margin: 0, color: '#9a2c00' }}>No saved day details yet. Saving the form will create a new log entry.</p>
                )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* Editable Metadata */}
                <div style={{ gridColumn: 'span 2' }}>
                    <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>Production Setup (Editable)</h3>
                </div>

                <label>
                    Machine Name *
                    <Select
                        options={machines}
                        value={machines.find(m => m.value === form.machine_name) || { value: form.machine_name, label: form.machine_name }}
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
                        value={operators.find(o => o.value === form.operator_name) || { value: form.operator_name, label: form.operator_name }}
                        onChange={(selected) => setForm({ ...form, operator_name: selected ? selected.value : '' })}
                        isClearable
                        placeholder="Select or search operator..."
                        styles={{ container: base => ({ ...base, marginTop: '4px' }) }}
                    />
                </label>

                <label style={{ gridColumn: 'span 2' }}>
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

                {/* Core Metrics */}
                <div style={{ gridColumn: 'span 2', marginTop: '16px' }}>
                    <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>Production Output</h3>
                </div>

                <label>
                    Additional Finished Qty (this update) *
                    <input
                        type="number"
                        min="0"
                        name="produced_quantity"
                        value={form.produced_quantity}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                    />
                </label>

                <label>
                    Scrap Quantity *
                    <input
                        type="number"
                        min="0"
                        name="scrap_quantity"
                        value={form.scrap_quantity}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                    />
                </label>

                <label>
                    End Time *
                    <input
                        type="datetime-local"
                        name="end_time"
                        value={form.end_time}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                    />
                </label>

                {/* Labor Tracking */}
                <div style={{ gridColumn: 'span 2', marginTop: '16px' }}>
                    <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>Effort Logs</h3>
                </div>

                <label>
                    Operator Working Hours *
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        name="operator_working_hours"
                        value={form.operator_working_hours}
                        onChange={handleChange}
                        required
                        placeholder="e.g. 8"
                        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                    />
                </label>

                <label>
                    Parts Made in Working Hours *
                    <input
                        type="number"
                        min="0"
                        name="parts_made_in_working_hours"
                        value={form.parts_made_in_working_hours}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                    />
                </label>

                <label>
                    Operator Overtime Hours
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        name="operator_overtime_hours"
                        value={form.operator_overtime_hours}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                    />
                </label>

                <label>
                    Parts Made in Overtime
                    <input
                        type="number"
                        min="0"
                        name="parts_made_in_overtime"
                        value={form.parts_made_in_overtime}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                    />
                </label>

                <div style={{ gridColumn: 'span 2', background: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                        <label style={{ color: '#991b1b' }}>
                            Idle Time Hours
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                name="idle_time_hours"
                                value={form.idle_time_hours}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #fca5a5' }}
                            />
                        </label>
                        <label style={{ color: '#991b1b' }}>
                            Idle Reason {(parseFloat(form.idle_time_hours) > 0) ? <span style={{ color: 'red' }}>*</span> : '(Optional)'}
                            <input
                                type="text"
                                name="idle_reason"
                                value={form.idle_reason}
                                onChange={handleChange}
                                placeholder="Required if idle hours > 0"
                                required={parseFloat(form.idle_time_hours) > 0}
                                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #fca5a5' }}
                            />
                        </label>
                    </div>
                </div>


                {/* Quality & Feedback */}
                <div style={{ gridColumn: 'span 2', marginTop: '16px' }}>
                    <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>Quality & Feedback</h3>
                </div>

                <label style={{ gridColumn: 'span 2' }}>
                    Job Rating *
                    <select
                        name="job_rating"
                        value={form.job_rating}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px', marginTop: '4px', fontWeight: 'bold' }}
                    >
                        <option value="EXCELLENT">Excellent</option>
                        <option value="VERY_GOOD">Very Good</option>
                        <option value="GOOD">Good</option>
                        <option value="POOR">Poor</option>
                    </select>
                </label>

                <label style={{ gridColumn: 'span 2' }}>
                    Remarks / Feedback {form.job_rating !== 'EXCELLENT' ? <span style={{ color: 'red' }}>*</span> : '(Optional if Excellent)'}
                    <textarea
                        name="remarks"
                        value={form.remarks}
                        onChange={handleChange}
                        required={form.job_rating !== 'EXCELLENT'}
                        rows={4}
                        placeholder={form.job_rating === 'EXCELLENT' ? "Optional notes..." : "Please detail why the rating is less than Excellent..."}
                        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                    />
                </label>


                <button
                    type="submit"
                    disabled={submitting}
                    style={{
                        gridColumn: 'span 2',
                        padding: '16px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        marginTop: '16px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                >
                    {submitting ? 'Saving...' : 'Save & Submit Production Entry'}
                </button>
            </form>
        </div>
    );
}

export default EditProductionEntry;
