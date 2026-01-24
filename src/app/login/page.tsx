'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { ArrowRight, Mail, Lock, AlertTriangle, KeyRound } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Security State
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutTimer, setLockoutTimer] = useState<string | null>(null);
    const [failedAttempts, setFailedAttempts] = useState(0);

    useEffect(() => {
        checkLockout();
        const interval = setInterval(checkLockout, 1000);
        return () => clearInterval(interval);
    }, []);

    const checkLockout = () => {
        const lockoutTimeStr = localStorage.getItem('admin_lockout_time');
        const attemptsStr = localStorage.getItem('admin_login_attempts');
        const currentAttempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
        setFailedAttempts(currentAttempts);

        if (lockoutTimeStr) {
            const lockoutTime = parseInt(lockoutTimeStr, 10);
            const now = Date.now();

            if (now < lockoutTime) {
                setIsLocked(true);
                const minutesLeft = Math.ceil((lockoutTime - now) / 60000);
                setLockoutTimer(`${minutesLeft}m`);
            } else {
                // Lock expired
                localStorage.removeItem('admin_lockout_time');
                localStorage.removeItem('admin_login_attempts');
                setIsLocked(false);
                setLockoutTimer(null);
                setFailedAttempts(0);
            }
        } else {
            // Use state for immediate UI feedback if not locked yet
            setIsLocked(false);
            setLockoutTimer(null);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLocked) return;

        setLoading(true);
        setErrorMsg('');

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                handleFailedAttempt();
                setErrorMsg(error.message);
            } else {
                // Success - Clear attempts
                localStorage.removeItem('admin_login_attempts');
                localStorage.removeItem('admin_lockout_time');
                router.push('/admin');
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleFailedAttempt = () => {
        const attemptsStr = localStorage.getItem('admin_login_attempts');
        let attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
        attempts += 1;
        localStorage.setItem('admin_login_attempts', attempts.toString());
        setFailedAttempts(attempts);

        if (attempts >= 3) {
            const lockoutDuration = 15 * 60 * 1000; // 15 minutes
            const unlockTime = Date.now() + lockoutDuration;
            localStorage.setItem('admin_lockout_time', unlockTime.toString());
            checkLockout();
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setErrorMsg('Please enter your email first to reset password.');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${location.origin}/auth/callback?next=/admin/reset-password`,
        });
        setLoading(false);
        if (error) {
            setErrorMsg(error.message);
        } else {
            alert('Password reset link sent to ' + email);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Header />

            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-sm space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-brand-blue">Admin Access</h1>
                        <p className="text-gray-500">Secure entry for authorized personnel.</p>
                    </div>

                    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 relative overflow-hidden">
                        {isLocked && (
                            <div className="absolute inset-0 bg-red-50/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center space-y-4">
                                <AlertTriangle className="h-12 w-12 text-red-600" />
                                <div>
                                    <h3 className="text-lg font-bold text-red-900">Account Locked</h3>
                                    <p className="text-sm text-red-700 mt-1">
                                        Too many failed attempts. Try again in <span className="font-bold">{lockoutTimer}</span>.
                                    </p>
                                </div>
                                <button
                                    onClick={handleForgotPassword}
                                    className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                            {errorMsg && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    {errorMsg}
                                </div>
                            )}

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
                                        disabled={loading || isLocked}
                                    />
                                    <div className="absolute left-3 top-3.5 text-gray-400">
                                        <Mail size={16} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Password</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        required
                                        className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:border-brand-blue outline-none transition-all"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        disabled={loading || isLocked}
                                    />
                                    <div className="absolute left-3 top-3.5 text-gray-400">
                                        <Lock size={16} />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || isLocked}
                                className="w-full py-3 bg-brand-blue text-white font-bold rounded-lg hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Verifying...' : 'Sign In'}
                                {!loading && <ArrowRight size={18} />}
                            </button>
                        </form>

                        {(failedAttempts >= 3 || isLocked) && !isLocked && (
                            <div className="mt-4 text-center">
                                <button onClick={handleForgotPassword} className="text-sm text-brand-blue hover:underline">Forgot Password?</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <footer className="py-8 text-center text-xs text-gray-400">
                Powered by Epiphany Dynamics
            </footer>
        </div>
    );
}
