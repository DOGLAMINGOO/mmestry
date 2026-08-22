import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import PaginationControls from '../components/PaginationControls';
import SearchFilterBar from '../components/SearchFilterBar';
import '../styles/Inventory.css';
import { fetchAllPages } from '../utils/fetchAllPages';

const DEFAULT_FIELD = { value: 'po_number', label: 'PO Number' };
const FIELD_OPTIONS = [
    { value: 'po_number', label: 'PO Number' },
    { value: 'client_name', label: 'Client' },
    { value: 'company_name', label: 'Company' },
    { value: 'part_name', label: 'Part' },
    { value: 'dispatched_by_username', label: 'Dispatched By' },
];

function DispatchHistoryPage() {
    const [history, setHistory] = useState([]);
    const [allHistory, setAllHistory] = useState([]);
    const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState({});

    const [searchField, setSearchField] = useState(DEFAULT_FIELD);
    const [searchTerm, setSearchTerm] = useState(null);
    const [dateFilters, setDateFilters] = useState({ start_date: '', end_date: '' });

    useEffect(() => {
        fetchHistory();
        fetchAllPages('/api/dispatch/history/?page=1').then(setAllHistory).catch(() => {});
    }, []);
    useEffect(() => { document.title = 'Dispatch History - MMestry'; }, []);

    const getPageFromUrl = (url) => {
        if (!url) return 1;
        try {
            const base = import.meta.env.VITE_API_URL || window.location.origin;
            const parsed = new URL(url, base);
            return Number(parsed.searchParams.get('page') || '1');
        } catch (err) {
            return 1;
        }
    };

    const fetchHistory = async (url) => {
        setLoading(true);
        try {
            const requestUrl = url || `/api/dispatch/history/?page=${page}`;
            const res = await api.get(requestUrl);
            const data = res.data;

            if (data && Array.isArray(data.results)) {
                setHistory(data.results);
                setPagination({ next: data.next, previous: data.previous, count: data.count });
                setPage(getPageFromUrl(requestUrl));
            } else {
                setHistory(Array.isArray(data) ? data : []);
                setPagination({ next: null, previous: null, count: Array.isArray(data) ? data.length : 0 });
                setPage(1);
            }
        } catch (err) {
            alert('Failed to fetch dispatch history.');
        } finally {
            setLoading(false);
        }
    };

    const getSearchOptions = () => {
        if (!allHistory.length) return [];
        const uniqueValues = [...new Set(allHistory.map((record) => {
            if (searchField.value === 'dispatched_by_username') {
                return record.dispatched_by_username || 'System';
            }
            return record[searchField.value];
        }))].filter(Boolean);
        return uniqueValues.map((val) => ({ value: val, label: val }));
    };

    const handleSearchTermChange = (selected, filters = dateFilters) => {
        const params = new URLSearchParams({ page: '1' });
        if (filters.start_date) params.set('start_date', filters.start_date);
        if (filters.end_date) params.set('end_date', filters.end_date);
        if (selected) params.set(searchField.value === 'client_name' ? 'client' : searchField.value === 'company_name' ? 'company' : searchField.value === 'part_name' ? 'part' : searchField.value === 'dispatched_by_username' ? 'dispatched_by' : searchField.value, selected.value);
        fetchHistory(`/api/dispatch/history/?${params.toString()}`);
    };

    const filteredHistory = useMemo(() => {
        let result = history;

        if (searchTerm) {
            result = result.filter((record) => {
                const val = searchField.value === 'dispatched_by_username'
                    ? (record.dispatched_by_username || 'System')
                    : record[searchField.value];
                return String(val).toLowerCase() === String(searchTerm.value).toLowerCase();
            });
        }

        if (dateFilters.start_date) {
            const start = new Date(dateFilters.start_date);
            result = result.filter((record) => new Date(record.dispatched_at) >= start);
        }

        if (dateFilters.end_date) {
            const end = new Date(dateFilters.end_date);
            end.setHours(23, 59, 59, 999);
            result = result.filter((record) => new Date(record.dispatched_at) <= end);
        }

        return result;
    }, [history, searchField, searchTerm, dateFilters]);

    const getDocumentUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${cleanBase}${cleanPath}`;
    };

    const openDocument = (path) => {
        const url = getDocumentUrl(path);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    const uploadInvoice = async (dispatchId, documentType) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('invoice_pdf', file);
            formData.append('document_type', documentType);
            try {
                await api.post(`/api/dispatch/${dispatchId}/upload-invoice/`, formData);
                alert('Invoice uploaded successfully.');
                fetchHistory();
            } catch (err) {
                alert(err.response?.data?.error || 'Invoice upload failed.');
            }
        };
        input.click();
    };

    const toggleExpandedRow = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <div className="inventory-container">
            <a href='/'><button>Back to Home</button></a>
            <h1>Dispatch History</h1>

            <SearchFilterBar
                searchField={searchField}
                setSearchField={setSearchField}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                fieldOptions={FIELD_OPTIONS}
                getSearchOptions={getSearchOptions}
                defaultField={DEFAULT_FIELD}
                onSearchTermChange={handleSearchTermChange}
            />

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: '#f9fafb', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>Date Range Filter:</span>
                <div>
                    <input type="date" value={dateFilters.start_date} onChange={(e) => { const next = { ...dateFilters, start_date: e.target.value }; setDateFilters(next); handleSearchTermChange(searchTerm, next); }} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                </div>
                <span style={{ color: '#6b7280' }}>to</span>
                <div>
                    <input type="date" value={dateFilters.end_date} onChange={(e) => { const next = { ...dateFilters, end_date: e.target.value }; setDateFilters(next); handleSearchTermChange(searchTerm, next); }} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                </div>
                {(dateFilters.start_date || dateFilters.end_date) && (
                    <button onClick={() => { const next = { start_date: '', end_date: '' }; setDateFilters(next); handleSearchTermChange(searchTerm, next); }} style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Clear Dates</button>
                )}
            </div>

            <div className="inventory-table-wrapper">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Dispatch Date</th>
                            <th>PO Number</th>
                            <th>Company</th>
                            <th>Client</th>
                            <th>Part</th>
                            <th>Target Qty</th>
                            <th>Shipped Qty</th>
                            <th>QC Report</th>
                            <th>Dispatched By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>Loading history...</td></tr>
                        ) : filteredHistory.length === 0 ? (
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No matching dispatch records found.</td></tr>
                        ) : (
                            filteredHistory.map(record => {
                            const mainQcPdf = record.main_qc_report_pdf || record.qc_report;
                            const mainInvoicePdf = record.main_invoice_pdf;

                            const suppQcPdf = record.supplementary_qc_report_pdf ||
                                              record.supplementary_dispatch?.supplementary_qc_report_pdf ||
                                              record.supplementary_dispatch?.main_qc_report_pdf ||
                                              record.supplementary_dispatch?.qc_report;

                            const suppInvoicePdf = record.supplementary_invoice_pdf ||
                                                   record.supplementary_dispatch?.supplementary_invoice_pdf ||
                                                   record.supplementary_dispatch?.main_invoice_pdf;

                            return (
                                <React.Fragment key={record.id}>
                                    <tr className="clickable-row" onClick={() => toggleExpandedRow(record.id)} style={{ background: record.has_supplementary ? '#fef3c7' : 'transparent' }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {record.has_supplementary ? (
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleExpandedRow(record.id); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', padding: 0 }}>{expandedRows[record.id] ? '▾' : '▸'}</button>
                                                ) : null}
                                                {new Date(record.dispatched_at).toLocaleString()}
                                            </div>
                                        </td>
                                        <td><strong>{record.po_number}</strong></td>
                                        <td>{record.company_name}</td>
                                        <td>{record.client_name}</td>
                                        <td>{record.part_name}</td>
                                        <td>{record.ordered_quantity || record.actual_shipped_quantity}</td>
                                        <td>{record.actual_shipped_quantity || record.shipped_quantity}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {mainQcPdf ? (
                                                    <a
                                                        href={getDocumentUrl(mainQcPdf)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}
                                                    >
                                                        View QC PDF
                                                    </a>
                                                ) : (
                                                    <span style={{ color: '#9ca3af' }}>QC missing</span>
                                                )}

                                                {mainInvoicePdf ? (
                                                    <a
                                                        href={getDocumentUrl(mainInvoicePdf)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}
                                                    >
                                                        Open Invoice
                                                    </a>
                                                ) : (
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); uploadInvoice(record.id, 'main'); }} style={{ width: 'fit-content', border: '1px solid #d1d5db', background: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Add Invoice</button>
                                                )}
                                            </div>
                                        </td>
                                        <td>{record.dispatched_by_username || 'System'}</td>
                                    </tr>

                                    {record.has_supplementary && expandedRows[record.id] && (
                                        <tr>
                                            <td colSpan="9">
                                                <div style={{ marginLeft: '24px', padding: '12px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px' }}>
                                                    <div style={{ fontWeight: '700', color: '#9a2c00', marginBottom: '8px' }}>Supplementary / Excess Dispatch</div>
                                                    <div style={{ display: 'grid', gap: '8px', color: '#4b5563' }}>
                                                        <div><strong>Extra Shipped Qty:</strong> {record.supplementary_dispatch?.actual_shipped_quantity || record.supplementary_shipped_quantity}</div>
                                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                            {suppQcPdf ? (
                                                                <a
                                                                    href={getDocumentUrl(suppQcPdf)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}
                                                                >
                                                                    View Supplementary QC Report
                                                                </a>
                                                            ) : (
                                                                <div style={{ color: '#9ca3af' }}>Supplementary QC missing</div>
                                                            )}

                                                            {suppInvoicePdf ? (
                                                                <a
                                                                    href={getDocumentUrl(suppInvoicePdf)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}
                                                                >
                                                                    Open Supplementary Invoice
                                                                </a>
                                                            ) : (
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); const childId = record.supplementary_dispatch?.id || record.id; uploadInvoice(childId, 'supplementary'); }} style={{ border: '1px solid #d1d5db', background: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Add Supplementary Invoice</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })
                        )}
                    </tbody>
                </table>
            </div>

            {pagination.count > 0 && (
                <PaginationControls
                    count={pagination.count}
                    next={pagination.next}
                    previous={pagination.previous}
                    page={page}
                    onPrevious={() => fetchHistory(pagination.previous)}
                    onNext={() => fetchHistory(pagination.next)}
                />
            )}
        </div>
    );
}

export default DispatchHistoryPage;
