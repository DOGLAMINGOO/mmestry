import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function Production() {
    const navigate = useNavigate();
    
    // Auth & Permission constraints
    const [userRole, setUserRole] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Data tracking
    const [approvedOrders, setApprovedOrders] = useState([]);
    const [reports, setReports] = useState([]);
    
    useEffect(() => {
        const initializeDashboard = async () => {
             // Fetch our role concurrently with the required data sets to minimize waterfall
             try {
                 const [userRes, ordersRes, reportsRes] = await Promise.allSettled([
                     api.get('/api/user/me/'),
                     api.get('/api/customer-orders/'), // Fetch all active to filter locally
                     api.get('/api/production-reports/')
                 ]);

                 if (userRes.status === 'fulfilled') setUserRole(userRes.value.data.role);
                 // We need to filter manually to get both APPROVED and IN_PRODUCTION
                 if (ordersRes.status === 'fulfilled') {
                     const relevantOrders = ordersRes.value.data.filter(
                         order => order.status === 'APPROVED' || order.status === 'IN_PRODUCTION'
                     );
                     setApprovedOrders(relevantOrders);
                 }
                 if (reportsRes.status === 'fulfilled') setReports(reportsRes.value.data);

             } catch (err) {
                 console.error("Critical failure loading Production Dashboard", err);
             } finally {
                 setLoadingAuth(false);
             }
        };

        initializeDashboard();
    }, []);

    useEffect(() => {
        document.title = 'Production Dashboard - MMestry';
    }, []);

    if (loadingAuth) return <div>Loading Production Environment...</div>;

    const canManageProduction = userRole === 'ADMIN' || userRole === 'STOCK_MANAGER';
    const multiPartCounts = approvedOrders.reduce((counts, order) => {
        counts[order.po_number] = (counts[order.po_number] || 0) + 1;
        return counts;
    }, {});

    return (
        <div className="inventory-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
             <button type="button" onClick={() => navigate('/')} style={{ marginBottom: 16 }}>
                Back to Home
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Production Dashboard</h1>
                <span style={{ padding: '8px 16px', background: '#dbeafe', color: '#1e40af', borderRadius: '16px', fontWeight: 'bold' }}>
                    Role: {userRole || 'Viewer'}
                </span>
            </div>

            <p style={{ color: '#4b5563', marginBottom: '32px' }}>
                Monitor active manufacturing lines, track machine performance, and manage completed production operations against approved Customer Orders.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '40px' }}>
                
                {/* Active Production Queue */}
                <section>
                    <h2 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', color: '#111827' }}>Active Production Queue</h2>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
                        Customer Orders that have been Approved or are currently In Production.
                    </p>
                    {approvedOrders.length === 0 ? (
                        <div style={{ padding: '30px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', textAlign: 'center' }}>
                            <p style={{ margin: 0, color: '#6b7280' }}>No Customer Orders are currently awaiting or in production.</p>
                        </div>
                    ) : (
                        <div className="inventory-table-wrapper">
                            <table className="inventory-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>PO Number</th>
                                        <th>Target Deadline</th>
                                        <th>Part</th>
                                        <th>Required Qty</th>
                                        <th>Priority</th>
                                        {canManageProduction && <th>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {approvedOrders.map(order => {
                                        const isInProgress = order.status === 'IN_PRODUCTION';
                                        // Find the corresponding report if it's in progress
                                        const linkedReport = isInProgress ? reports.find(r => r.customer_order === order.id || (r.customer_order_details && r.customer_order_details.id === order.id)) : null;
                                        
                                        return (
                                        <tr key={order.id} style={{ background: isInProgress ? '#f0fdf4' : 'transparent' }}>
                                            <td style={{ fontWeight: 'bold' }}>
                                                {order.po_number}{multiPartCounts[order.po_number] > 1 ? ' *' : ''}
                                                {isInProgress && (
                                                    <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#d1fae5', color: '#065f46', fontSize: '10px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                        In Progress
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ color: new Date(order.deadline) < new Date() ? '#dc2626' : 'inherit' }}>
                                                {order.deadline}
                                            </td>
                                            <td>{order.part_name}</td>
                                            <td>{order.quantity}</td>
                                            <td>{order.priority}</td>
                                            {canManageProduction && (
                                                <td>
                                                    {!isInProgress ? (
                                                        <button 
                                                            onClick={() => navigate(`/production/start/${order.id}`)}
                                                            style={{
                                                                background: '#10b981', color: 'white', border: 'none', 
                                                                padding: '6px 16px', borderRadius: '6px', cursor: 'pointer',
                                                                fontWeight: 'bold', fontSize: '13px'
                                                            }}
                                                        >
                                                            Start Production
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => linkedReport ? navigate(`/production/report/${linkedReport.id}`) : alert('Report not found')}
                                                            style={{
                                                                background: '#3b82f6', color: 'white', border: 'none', 
                                                                padding: '6px 16px', borderRadius: '6px', cursor: 'pointer',
                                                                fontWeight: 'bold', fontSize: '13px'
                                                            }}
                                                        >
                                                            Continue Production
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Active & Historical Reports */}
                <section>
                    <h2 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', color: '#111827' }}>Active & Historical Production Reports</h2>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
                        In progress and completed manufacturing jobs.
                    </p>
                    
                    {reports.length === 0 ? (
                        <div style={{ padding: '30px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', textAlign: 'center' }}>
                            <p style={{ margin: 0, color: '#6b7280' }}>No production activity has been recorded yet.</p>
                        </div>
                    ) : (
                        <div className="inventory-table-wrapper">
                            <table className="inventory-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Job ID</th>
                                        <th>PO Number</th>
                                        <th>Machine</th>
                                        <th>Operator</th>
                                        <th>Start Time</th>
                                        <th>Status</th>
                                        <th>Overall Rating</th>
                                        {canManageProduction && <th>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map(report => (
                                        <tr key={report.id}>
                                            <td>#{report.id}</td>
                                            <td>{report.customer_order_details?.po_number || 'Unknown'}</td>
                                            <td>{report.machine_name}</td>
                                            <td>{report.operator_name}</td>
                                            <td>{new Date(report.start_time).toLocaleString()}</td>
                                            <td>
                                                 <span style={{ 
                                                     padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                                     background: report.status === 'COMPLETED' ? '#d1fae5' : '#fef3c7',
                                                     color: report.status === 'COMPLETED' ? '#065f46' : '#92400e'
                                                 }}>
                                                    {report.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>{report.job_rating ? report.job_rating.replace('_', ' ') : '-'}</td>
                                            
                                            {canManageProduction && (
                                                <td>
                                                    <button 
                                                        onClick={() => navigate(`/production/report/${report.id}`)}
                                                        style={{
                                                            background: '#3b82f6', color: 'white', border: 'none', 
                                                            padding: '6px 16px', borderRadius: '6px', cursor: 'pointer',
                                                            fontWeight: 'bold', fontSize: '13px'
                                                        }}
                                                    >
                                                        {report.status === 'COMPLETED' ? 'View/Edit' : 'Complete Report'}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default Production;
