import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import NotificationBell from './NotificationBell';

function TopNav() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get('/api/user/me/');
                setUser(res.data);
            } catch (err) {
                console.error("Failed to fetch user in TopNav", err);
            }
        };
        fetchUser();
    }, []);

    if (!user) return null;

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '20px 20px 0 20px',
            maxWidth: '1200px',
            margin: '0 auto',
            boxSizing: 'border-box',
            width: '100%'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: '#ffffff',
                padding: '10px 20px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #e5e7eb',
                position: 'relative',
                zIndex: 1000,
                fontFamily: 'Arial, sans-serif'
            }}>
                
                <NotificationBell />

                <div style={{ width: '1px', height: '32px', backgroundColor: '#e5e7eb', margin: '0 4px' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.4' }}>
                <span style={{ fontWeight: '700', fontSize: '16px', color: '#111827' }}>{user.username}</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.role}</span>
            </div>
            
            <button 
                onClick={() => navigate('/logout')}
                style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    margin: 0,
                    fontFamily: 'Arial, sans-serif'
                }}
                onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#fecaca';
                    e.target.style.borderColor = '#f87171';
                }}
                onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#fee2e2';
                    e.target.style.borderColor = '#fca5a5';
                }}
            >
                Logout
            </button>
        </div>
    </div>
    );
}

export default TopNav;
