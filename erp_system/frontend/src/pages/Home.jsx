import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Factory, Truck, ShieldCheck } from 'lucide-react';
import api from '../api';

const quickActions = [
    { label: 'Inventory', to: '/inventory', icon: Package, color: 'from-blue-600 to-cyan-500' },
    { label: 'Customer Orders', to: '/customer-orders', icon: ShoppingCart, color: 'from-violet-600 to-indigo-500' },
    { label: 'Production', to: '/production', icon: Factory, color: 'from-emerald-600 to-teal-500' },
    { label: 'Dispatch', to: '/dispatch', icon: Truck, color: 'from-amber-500 to-orange-500' },
];

function Home() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get('/api/user/me/');
                setUser(res.data);
            } catch (err) {
                console.error('Failed to fetch user:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        document.title = 'Home - MMestry';
    }, []);

    if (loading) return <div className="text-slate-500">Loading...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-xl font-black text-white shadow-lg shadow-blue-500/20">
                        M
                    </div>
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Operations Center</p>
                        <h1 className="mt-1 text-3xl font-bold text-slate-900">Welcome back</h1>
                    </div>
                </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {quickActions.map(({ label, to, icon: Icon, color }) => (
                    <Link key={label} to={to} className="group block">
                        <div className={`rounded-2xl bg-gradient-to-br ${color} p-[1px] shadow-lg shadow-slate-200 transition duration-200 hover:-translate-y-1 hover:shadow-xl`}>
                            <div className="flex h-full min-h-[180px] flex-col justify-between rounded-2xl bg-slate-950/10 p-5 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                    <span className="rounded-xl bg-white/15 p-3 text-white backdrop-blur-sm">
                                        <Icon size={28} />
                                    </span>
                                    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/80">Open</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{label}</h2>
                                    <p className="mt-2 text-sm text-white/80">Manage daily operations and track performance.</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}

                {user && user.role === 'ADMIN' && (
                    <Link to="/admin/management" className="group block">
                        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 p-[1px] shadow-lg shadow-purple-200 transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                            <div className="flex h-full min-h-[180px] flex-col justify-between rounded-2xl bg-slate-950/10 p-5">
                                <div className="flex items-center justify-between">
                                    <span className="rounded-xl bg-white/15 p-3 text-white">
                                        <ShieldCheck size={28} />
                                    </span>
                                    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/80">Admin</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Admin Management</h2>
                                    <p className="mt-2 text-sm text-white/80">Manage master data and control access.</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                )}
            </div>
        </div>
    );
}

export default Home;
