import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/Inventory.css'

function InventoryDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [item, setItem] = useState(null);
    const [part, setPart] = useState(null);
    const [companiesWithPart, setCompaniesWithPart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const resp = await api.get(`/api/inventory/${id}/`);
                const invItem = resp.data;
                setItem(invItem);

                // Fetch parts to get part details (part_number, cycle_time_minutes)
                const partsResp = await api.get('/api/parts/');
                const foundPart = partsResp.data.find(p => p.id === invItem.part) || null;
                setPart(foundPart);

                // Fetch all inventory to determine which companies have this part
                const allInv = await api.get('/api/inventory/?page_size=1000');
                const allInvData = allInv.data.results ?? allInv.data;
                const samePart = allInvData.filter(i => i.part === invItem.part);

                // Fetch companies to get codes (A/B) and names
                const companiesResp = await api.get('/api/companies/');
                const companiesMap = (companiesResp.data || []).reduce((acc, c) => {
                    acc[c.id] = c;
                    return acc;
                }, {});

                const uniqueCompanies = [];
                const seen = new Set();
                samePart.forEach(i => {
                    const cid = i.company;
                    if (!seen.has(cid)) {
                        seen.add(cid);
                        const company = companiesMap[cid] || { id: cid, name: i.company_name };
                        uniqueCompanies.push(company);
                    }
                });

                setCompaniesWithPart(uniqueCompanies);
            } catch (err) {
                console.error(err);
                setError('Failed to load inventory detail.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    useEffect(() => {
        document.title = item ? `${item.part_name} - Inventory Detail - MMestry` : 'Inventory Detail - MMestry';
    }, [item]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;
    if (!item) return <div>No data</div>;

    return (
        <div className="inventory-container">
            <button onClick={() => navigate('/inventory')} style={{ marginBottom: 12 }}>Back to Inventory</button>
            <h1>Part Detail</h1>

            <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
                <h2>{item.part_name}</h2>
                <p><strong>Part ID:</strong> {item.part}</p>
                {part && (
                    <>
                        <p><strong>Part Number:</strong> {part.part_number}</p>
                        <p><strong>Cycle time (minutes per part):</strong> {part.cycle_time_minutes} min</p>
                    </>
                )}
                
                <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginTop: 0 }}>Stock Breakdown</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><strong>Total Blanks:</strong> {item.total_blanks}</div>
                        <div><strong>Reserved Blanks:</strong> {item.reserved_blanks || 0}</div>
                        <div>
                            <strong>Available Blanks:</strong> 
                            <span style={{ color: item.available_blanks < 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold', marginLeft: '4px' }}>
                                {item.available_blanks}
                            </span>
                        </div>
                        <div><strong>Finished Parts:</strong> {item.finished_blanks}</div>
                    </div>
                </div>

                <h3 style={{ marginTop: 16 }}>Companies with this part</h3>
                {companiesWithPart.length === 0 && <p>No companies currently have this part.</p>}
                <ul>
                    {companiesWithPart.map(c => (
                        <li key={c.id}>{c.code ? `${c.code} — ${c.name}` : c.name}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default InventoryDetail;
