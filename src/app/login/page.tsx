'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { ArrowRight, Mail, Check } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
            },
        });

        setLoading(false);
        if (error) {
            alert('Error sending magic link: ' + error.message);
        } else {
            setSent(true);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Header />

            <div className="flex-1 flex items-center justify-center p-4">
                {sent ? (
                    <div className="text-center space-y-4 max-w-sm w-full p-8 bg-white rounded-xl shadow-lg border border-gray-100">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                            <Check size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
                        <p className="text-gray-500">We sent a magic link to <span className="font-semibold text-gray-900">{email}</span></p>
                    </div>
                ) : (
                    <div className="w-full max-w-sm space-y-6">
                        <div className="space-y-2 text-center">
                            <h1 className="text-3xl font-bold tracking-tight text-brand-blue">Admin Access</h1>
                            <p className="text-gray-500">Enter your email to sign in.</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Email Address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:border-brand-blue outline-none transition-all"
                                        placeholder="admin@gracecaretakers.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                    <div className="absolute left-3 top-3.5 text-gray-400">
                                        <Mail size={16} />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-brand-blue text-white font-bold rounded-lg hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? 'Sending...' : 'Send Magic Link'}
                                {!loading && <ArrowRight size={18} />}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            <footer className="py-8 text-center text-xs text-gray-400">
                Powered by Epiphany Dynamics
            </footer>
        </div>
    );
}
