import { useEffect } from 'react';
import Form from '../components/Form';

function Login() {
    useEffect(() => {
        document.title = 'Login - MMestry';
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
            <div className="mx-auto max-w-6xl grid min-h-[calc(100vh-5rem)] overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/60 lg:grid-cols-2">
                <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 p-10 lg:flex lg:flex-col lg:justify-between">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.35),_transparent_30%)]" />
                    <div className="relative z-10">
                        <div className="mb-8 inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-blue-50">
                            MMestry ERP
                        </div>
                        <h1 className="max-w-md text-4xl font-bold leading-tight text-white">
                            Manage operations with confidence.
                        </h1>
                        <p className="mt-4 max-w-md text-base text-blue-50/90">
                            Inventory, production, dispatch, and customer orders in one secure enterprise dashboard.
                        </p>
                    </div>

                    <div className="relative z-10 space-y-3 text-sm text-blue-50/90">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                            Real-time operational visibility
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                            Secure role-based access
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                            Built for fast team execution
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center p-6 sm:p-10">
                    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 p-7 shadow-xl shadow-slate-950/50">
                        <div className="mb-8">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">Welcome back</p>
                            <h2 className="mt-2 text-3xl font-bold text-white">Sign in</h2>
                        </div>

                        <Form route="api/login/" method="login" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;