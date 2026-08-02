import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import SearchFilterBar from '../components/SearchFilterBar';
import '../styles/Inventory.css';

const QUEUE_DEFAULT_FIELD = { value: 'po_number', label: 'PO Number' };
const REPORTS_DEFAULT_FIELD = { value: 'po_number', label: 'PO Number' };

const QUEUE_FIELD_OPTIONS = [
    { value: 'po_number', label: 'PO Number' },
    { value: 'part_name', label: 'Part' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
];

const REPORTS_FIELD_OPTIONS = [
    { value: 'po_number', label: 'PO Number' },
    { value: 'machine_name', label: 'Machine' },
    { value: 'operator_name', label: 'Operator' },
    { value: 'status', label: 'Status' },
    { value: 'job_rating', label: 'Job Rating' },
];

function getReportPoNumber(report) {
    return report.po_number || report.customer_order_details?.po_number || '';
}

function PoHoverCard({ poNumber, clientName, companyName, partName, partDescription, isMultiPart, isInProgress }) {
    const [isHovered, setIsHovered] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const targetRef = useRef(null);

    const handleMouseEnter = () => {
        if (targetRef.current) {
            const rect = targetRef.current.getBoundingClientRect();
            const cardHeight = 175;
            let top;
            if (rect.top < cardHeight + 20) {
                top = rect.bottom + 6;
            } else {
                top = rect.top - cardHeight - 6;
            }

            const left = Math.max(10, Math.min(rect.left, window.innerWidth - 300));
            setCoords({ top, left });
        }
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <>
            <div 
                ref={targetRef}
                style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <span style={{ 
                    fontWeight: 'bold', 
                    color: '#1d4ed8', 
                    borderBottom: '1px dashed #3b82f6',
                    cursor: 'pointer'
                }}>
                    {poNumber}{isMultiPart ? ' *' : ''}
                </span>
                {isInProgress && (
                    <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#d1fae5', color: '#065f46', fontSize: '10px', borderRadius: '4px', textTransform: 'uppercase' }}>
                        In Progress
                    </span>
                )}
            </div>

            {isHovered && ReactDOM.createPortal(
                <div style={{
                    position: 'fixed',
                    top: `${coords.top}px`,
                    left: `${coords.left}px`,
                    width: '290px',
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
                    padding: '12px 14px',
                    zIndex: 999999,
                    pointerEvents: 'none',
                    fontSize: '13px',
                    color: '#1f2937',
                    textAlign: 'left',
                    lineHeight: '1.4'
                }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#111827', marginBottom: '8px', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>PO: {poNumber}</span>
                        <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>Order Details</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div>
                            <span style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Company Name</span>
                            <strong style={{ color: '#111827', fontSize: '13px' }}>{companyName || 'N/A'}</strong>
                        </div>
                        <div>
                            <span style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Client Name</span>
                            <strong style={{ color: '#111827', fontSize: '13px' }}>{clientName || 'N/A'}</strong>
                        </div>
                        <div>
                            <span style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Part & Description</span>
                            <strong style={{ color: '#111827', fontSize: '13px' }}>{partName || 'N/A'}</strong>
                            {partDescription ? (
                                <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>
                                    {partDescription}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

function getReportFieldValue(report, field) {
    if (field === 'po_number') return getReportPoNumber(report);
    if (field === 'status') return report.status || '';
    if (field === 'job_rating') return report.job_rating || '-';
    return report[field] ?? '';
}

function Production() {
    const navigate = useNavigate();

    const [userRole, setUserRole] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [approvedOrders, setApprovedOrders] = useState([]);
    const [reports, setReports] = useState([]);

    const [queueSearchField, setQueueSearchField] = useState(QUEUE_DEFAULT_FIELD);
    const [queueSearchTerm, setQueueSearchTerm] = useState(null);
    const [reportsSearchField, setReportsSearchField] = useState(REPORTS_DEFAULT_FIELD);
    const [reportsSearchTerm, setReportsSearchTerm] = useState(null);

    useEffect(() => {
        const initializeDashboard = async () => {
            try {
                const [userRes, ordersRes, reportsRes] = await Promise.allSettled([
                    api.get('/api/user/me/'),
                    api.get('/api/customer-orders/'),
                    api.get('/api/production-reports/?page_size=1000'),
                ]);

                if (userRes.status === 'fulfilled') setUserRole(userRes.value.data.role);

                if (ordersRes.status === 'fulfilled') {
                    const ordersData = ordersRes.value.data.results ?? ordersRes.value.data;
                    const relevantOrders = (Array.isArray(ordersData) ? ordersData : []).filter(
                        (order) => order.status === 'APPROVED' || order.status === 'IN_PRODUCTION'
                    );
                    setApprovedOrders(relevantOrders);
                }

                if (reportsRes.status === 'fulfilled') {
                    const reportsData = reportsRes.value.data.results ?? reportsRes.value.data;
                    setReports(Array.isArray(reportsData) ? reportsData : []);
                }
            } catch (err) {
                console.error('Critical failure loading Production Dashboard', err);
            } finally {
                setLoadingAuth(false);
            }
        };

        initializeDashboard();
    }, []);

    useEffect(() => {
        document.title = 'Production Dashboard - MMestry';
    }, []);

    const getQueueSearchOptions = () => {
        if (!approvedOrders.length) return [];
        const uniqueValues = [...new Set(approvedOrders.map((o) => o[queueSearchField.value]))].filter(Boolean);
        return uniqueValues.map((val) => ({ value: val, label: val }));
    };

    const getReportsSearchOptions = () => {
        if (!reports.length) return [];
        const uniqueValues = [
            ...new Set(reports.map((r) => getReportFieldValue(r, reportsSearchField.value))),
        ].filter(Boolean);
        return uniqueValues.map((val) => ({
            value: val,
            label: reportsSearchField.value === 'status' ? val.replace(/_/g, ' ') : val,
        }));
    };

    const filteredApprovedOrders = useMemo(() => {
        if (!queueSearchTerm) return approvedOrders;
        return approvedOrders.filter((order) => order[queueSearchField.value] === queueSearchTerm.value);
    }, [approvedOrders, queueSearchField, queueSearchTerm]);

    const filteredReports = useMemo(() => {
        if (!reportsSearchTerm) return reports;
        return reports.filter(
            (report) => getReportFieldValue(report, reportsSearchField.value) === reportsSearchTerm.value
        );
    }, [reports, reportsSearchField, reportsSearchTerm]);

    if (loadingAuth) return <div>Loading Production Environment...</div>;

    const canManageProduction = userRole === 'ADMIN' || userRole === 'STOCK_MANAGER';
    const multiPartCounts = approvedOrders.reduce((counts, order) => {
        counts[order.po_number] = (counts[order.po_number] || 0) + 1;
        return counts;
    }, {});

    return (
        <div className="inventory-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <button type="button" onClick={() => navigate('/')}>
                    Back to Home
                </button>
                <button
                    type="button"
                    onClick={() => navigate('/production-reports')}
                    style={{ background: '#4b5563', color: '#fff', padding: '8px 16px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    View Production Reports
                </button>
            </div>
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
                <section>
                    <h2 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', color: '#111827' }}>Active Production Queue</h2>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
                        Customer Orders that have been Approved or are currently In Production.
                    </p>

                    {approvedOrders.length > 0 && (
                        <SearchFilterBar
                            searchField={queueSearchField}
                            setSearchField={setQueueSearchField}
                            searchTerm={queueSearchTerm}
                            setSearchTerm={setQueueSearchTerm}
                            fieldOptions={QUEUE_FIELD_OPTIONS}
                            getSearchOptions={getQueueSearchOptions}
                            defaultField={QUEUE_DEFAULT_FIELD}
                        />
                    )}

                    {approvedOrders.length === 0 ? (
                        <div style={{ padding: '30px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', textAlign: 'center' }}>
                            <p style={{ margin: 0, color: '#6b7280' }}>No Customer Orders are currently awaiting or in production.</p>
                        </div>
                    ) : filteredApprovedOrders.length === 0 ? (
                        <div style={{ padding: '30px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', textAlign: 'center' }}>
                            <p style={{ margin: 0, color: '#6b7280' }}>No orders match the current filter.</p>
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
                                    {filteredApprovedOrders.map((order) => {
                                        const isInProgress = order.status === 'IN_PRODUCTION';
                                        const linkedReport = isInProgress
                                            ? reports.find(
                                                (r) =>
                                                    r.customer_order === order.id ||
                                                    (r.customer_order_details && r.customer_order_details.id === order.id)
                                            )
                                            : null;

                                        return (
                                            <tr key={order.id} style={{ background: isInProgress ? '#f0fdf4' : 'transparent' }}>
                                                <td style={{ fontWeight: 'bold' }}>
                                                    <PoHoverCard
                                                        poNumber={order.po_number}
                                                        clientName={order.client_name}
                                                        companyName={order.company_name}
                                                        partName={order.part_name}
                                                        partDescription={order.part_description}
                                                        isMultiPart={multiPartCounts[order.po_number] > 1}
                                                        isInProgress={isInProgress}
                                                    />
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
                                                                    fontWeight: 'bold', fontSize: '13px',
                                                                }}
                                                            >
                                                                Start Production
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => (linkedReport ? navigate(`/production/report/${linkedReport.id}`) : alert('Report not found'))}
                                                                style={{
                                                                    background: '#3b82f6', color: 'white', border: 'none',
                                                                    padding: '6px 16px', borderRadius: '6px', cursor: 'pointer',
                                                                    fontWeight: 'bold', fontSize: '13px',
                                                                }}
                                                            >
                                                                Continue Production
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section>
                    <h2 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', color: '#111827' }}>Active & Historical Production Reports</h2>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
                        In progress and completed manufacturing jobs.
                    </p>

                    {reports.length > 0 && (
                        <SearchFilterBar
                            searchField={reportsSearchField}
                            setSearchField={setReportsSearchField}
                            searchTerm={reportsSearchTerm}
                            setSearchTerm={setReportsSearchTerm}
                            fieldOptions={REPORTS_FIELD_OPTIONS}
                            getSearchOptions={getReportsSearchOptions}
                            defaultField={REPORTS_DEFAULT_FIELD}
                        />
                    )}

                    {reports.length === 0 ? (
                        <div style={{ padding: '30px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', textAlign: 'center' }}>
                            <p style={{ margin: 0, color: '#6b7280' }}>No production activity has been recorded yet.</p>
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div style={{ padding: '30px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', textAlign: 'center' }}>
                            <p style={{ margin: 0, color: '#6b7280' }}>No reports match the current filter.</p>
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
                                        <th>Qty Progress</th>
                                        <th>Overall Rating</th>
                                        {canManageProduction && <th>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredReports.map((report) => {
                                        const poNum = getReportPoNumber(report) || 'Unknown';
                                        const matchedOrder = approvedOrders.find(o => o.po_number === poNum);
                                        const clientName = report.customer_order_details?.client_name || matchedOrder?.client_name || 'N/A';
                                        const companyName = report.customer_order_details?.company_name || matchedOrder?.company_name || 'N/A';
                                        const partName = report.customer_order_details?.part_name || matchedOrder?.part_name || 'N/A';
                                        const partDescription = report.customer_order_details?.part_description || matchedOrder?.part_description || '';

                                        return (
                                            <tr key={report.id}>
                                                <td>#{report.id}</td>
                                                <td>
                                                    <PoHoverCard
                                                        poNumber={poNum}
                                                        clientName={clientName}
                                                        companyName={companyName}
                                                        partName={partName}
                                                        partDescription={partDescription}
                                                    />
                                                </td>
                                                <td>{report.machine_name}</td>
                                            <td>{report.operator_name}</td>
                                            <td>{new Date(report.start_time).toLocaleString()}</td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                                    background: report.status === 'COMPLETED' ? '#d1fae5' : '#fef3c7',
                                                    color: report.status === 'COMPLETED' ? '#065f46' : '#92400e',
                                                }}>
                                                    {report.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '13px', lineHeight: 1.4 }}>
                                                    <div><strong>Req:</strong> {report.required_quantity ?? 0}</div>
                                                    <div><strong>Finished:</strong> {report.produced_quantity ?? 0}</div>
                                                    <div><strong>Remaining:</strong> {report.remaining_quantity ?? Math.max(0, (report.required_quantity ?? 0) - (report.produced_quantity ?? 0))}</div>
                                                </div>
                                            </td>
                                            <td>{report.job_rating ? report.job_rating.replace('_', ' ') : '-'}</td>
                                            {canManageProduction && (
                                                <td>
                                                    <button
                                                        onClick={() => navigate(`/production/report/${report.id}`)}
                                                        style={{
                                                            background: '#3b82f6', color: 'white', border: 'none',
                                                            padding: '6px 16px', borderRadius: '6px', cursor: 'pointer',
                                                            fontWeight: 'bold', fontSize: '13px',
                                                        }}
                                                    >
                                                        {report.status === 'COMPLETED' ? 'View/Edit' : 'Complete Report'}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
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
