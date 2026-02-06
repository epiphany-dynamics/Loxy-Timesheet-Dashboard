'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { getEmployees, deleteEmployee, addEmployee, fetchSubmissions } from '../actions';
import { User, FileText, Check, X, Plus, Loader2, LogOut } from 'lucide-react';

type Employee = {
    id: string;
    name: string;
    is_active: boolean;
};

export default function AdminPage() {
    const router = useRouter();

    // Data State
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [feedData, setFeedData] = useState<any[]>([]);

    // UI State
    const [empLoading, setEmpLoading] = useState(true);
    const [feedLoading, setFeedLoading] = useState(true);
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [selectedDeleteId, setSelectedDeleteId] = useState('');
    const [reportMessage, setReportMessage] = useState('');

    // Default Range: Last 30 Days
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });

    // Password Change State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passLoading, setPassLoading] = useState(false);
    const [passMessage, setPassMessage] = useState('');

    useEffect(() => {
        loadEmployees();
        loadFeed();
    }, []);

    // Refresh feed when dates change
    useEffect(() => {
        loadFeed();
    }, [dateRange]);

    async function loadEmployees() {
        setEmpLoading(true);
        try {
            const data = await getEmployees();
            setEmployees(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setEmpLoading(false);
        }
    }

    async function loadFeed() {
        setFeedLoading(true);
        try {
            const data = await fetchSubmissions(dateRange.start, dateRange.end);
            setFeedData(data || []);
        } catch (e: unknown) {
            const err = e as Error;
            if (err.message?.includes('Unauthorized')) router.push('/login');
            console.error(e);
        } finally {
            setFeedLoading(false);
        }
    }

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmployeeName.trim()) return;
        try {
            await addEmployee(newEmployeeName);
            setNewEmployeeName('');
            loadEmployees();
        } catch (e: unknown) {
            alert('Failed to add employee');
        }
    };

    const handleDeleteEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDeleteId) return;

        const emp = employees.find(e => e.id === selectedDeleteId);
        if (!emp) return;

        if (!confirm(`Are you sure you want to permanently remove ${emp.name}?`)) return;

        try {
            await deleteEmployee(selectedDeleteId);
            setSelectedDeleteId('');
            loadEmployees();
        } catch (e: unknown) {
            alert('Failed to delete employee');
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassMessage('');

        if (newPassword !== confirmPassword) {
            setPassMessage('Passwords do not match.');
            return;
        }

        if (newPassword.length < 6) {
            setPassMessage('Password must be at least 6 characters.');
            return;
        }

        setPassLoading(true);
        try {
            // Dynamically import supabase to avoid SSR issues if any, though we are in use client
            const { supabase } = await import('@/lib/supabase');

            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) {
                setPassMessage(`Error: ${error.message}`);
            } else {
                setPassMessage('Password successfully updated.');
                setNewPassword('');
                setConfirmPassword('');
                // Clear success message after 3 seconds
                setTimeout(() => setPassMessage(''), 3000);
            }
        } catch (err: unknown) {
            setPassMessage('An unexpected error occurred.');
            console.error(err);
        } finally {
            setPassLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        setReportMessage('Generating...');
        try {
            const submissions = await fetchSubmissions(dateRange.start, dateRange.end);

            if (submissions.length === 0) {
                setReportMessage('No records found.');
                setTimeout(() => setReportMessage(''), 3000);
                return;
            }

            // --- V2 Report Logic (Group + Subtotal) ---
            const groupedData = new Map<string, {
                name: string;
                submissions: any[];
            }>();

            submissions.forEach((sub: any) => {
                const empName = sub.employees?.name || 'Unknown Employee';
                if (!groupedData.has(empName)) {
                    groupedData.set(empName, { name: empName, submissions: [] });
                }
                groupedData.get(empName)!.submissions.push(sub);
            });

            const sortedEmployees = Array.from(groupedData.values())
                .sort((a, b) => a.name.localeCompare(b.name));

            // Columns as requested: Date, Client Name, Total Hours, Pay Rate, Mileage, Services, Notes
            const headers = ['Employee Name', 'Date', 'Client Name', 'Total Hours', 'Pay Rate', 'Mileage', 'Services', 'Notes'];
            const csvRows = [headers.join(',')];

            sortedEmployees.forEach(emp => {
                const sortedSubs = emp.submissions.sort((a, b) =>
                    new Date(a.date_of_service).getTime() - new Date(b.date_of_service).getTime()
                );

                let subTotalHours = 0;
                let subTotalMileage = 0;

                sortedSubs.forEach(sub => {
                    const h = Number(sub.total_hours) || 0;
                    const m = Number(sub.mileage) || 0;

                    subTotalHours += h;
                    subTotalMileage += m;

                    const servicesList = Array.isArray(sub.services)
                        ? sub.services.join('; ')
                        : (sub.services ? String(sub.services) : '');

                    const clean = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;

                    const row = [
                        clean(emp.name),
                        sub.date_of_service,
                        clean(sub.client_name),
                        h.toFixed(2),
                        sub.pay_rate ? Number(sub.pay_rate).toFixed(2) : '',
                        m.toFixed(1),
                        clean(servicesList),
                        clean(sub.notes || "N/A")
                    ];
                    csvRows.push(row.join(','));
                });

                // Subtotal Row
                const subRow = [
                    `"TOTAL ${emp.name.replace(/"/g, '""')}"`,
                    "", // Date
                    "", // Client
                    subTotalHours.toFixed(2),
                    "", // Pay Rate
                    subTotalMileage.toFixed(1),
                    "", // Services
                    ""  // Notes
                ];
                csvRows.push(subRow.join(','));

                // Optional: Add empty row for spacing between employees
                csvRows.push(",,,,,,,");
            });

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Grace_Caretakers_Weekly_Report_${dateRange.start}_to_${dateRange.end}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            setReportMessage('Success! Report Downloaded.');
            setTimeout(() => setReportMessage(''), 3000);

        } catch (e) {
            console.error(e);
            setReportMessage('Error generating report.');
        }
    };

    const handleLogout = async () => {
        try {
            const { supabase } = await import('@/lib/supabase');
            await supabase.auth.signOut();
            router.push('/login');
        } catch (error) {
            console.error('Error signing out:', error);
            router.push('/login');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
            <Header />

            <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold border-l-4 border-brand-red pl-4 text-brand-blue">Admin Dashboard</h1>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>

                {/* Security Section: Change Password */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 ml-1">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <User size={20} className="text-brand-blue" />
                        Security Settings
                    </h2>

                    <form onSubmit={handleUpdatePassword} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:w-auto">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">New Password</label>
                            <input
                                type="password"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full md:w-64 border border-gray-300 rounded-lg p-2 focus:border-brand-blue outline-none"
                            />
                        </div>
                        <div className="w-full md:w-auto">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Confirm Password</label>
                            <input
                                type="password"
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full md:w-64 border border-gray-300 rounded-lg p-2 focus:border-brand-blue outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={passLoading}
                            className="w-full md:w-auto px-6 py-2.5 bg-brand-blue text-white font-bold rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {passLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                    {passMessage && (
                        <div className={`mt-3 text-sm font-medium ${passMessage.includes('Error') || passMessage.includes('match') || passMessage.includes('least') ? 'text-red-600' : 'text-green-600'}`}>
                            {passMessage}
                        </div>
                    )}
                </div>

                {/* Top Section: Employee Manager */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <User size={20} className="text-brand-blue" />
                        Employee Manager
                    </h2>

                    <div className="grid grid-cols-1 gap-8 max-w-xl">
                        {/* Add New */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Add New Employee</label>
                            <form onSubmit={handleAddEmployee} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Employee Name..."
                                    className="flex-1 border border-gray-300 rounded-lg p-3 outline-none focus:border-brand-blue focus:ring-0"
                                    value={newEmployeeName}
                                    onChange={e => setNewEmployeeName(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="px-4 bg-brand-blue text-white font-bold rounded-lg hover:bg-blue-800 transition flex items-center gap-2"
                                >
                                    <Plus size={18} /> Add
                                </button>
                            </form>
                        </div>

                        {/* Remove Employee */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Remove Employee</label>
                            <form onSubmit={handleDeleteEmployee} className="flex gap-2">
                                <select
                                    value={selectedDeleteId}
                                    onChange={e => setSelectedDeleteId(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded-lg p-3 outline-none focus:border-brand-blue focus:ring-0"
                                >
                                    <option value="">Select Employee...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                                <button
                                    type="submit"
                                    className="px-4 bg-brand-blue text-white font-bold rounded-lg hover:bg-blue-800 transition flex items-center gap-2"
                                >
                                    <X size={18} />
                                    Remove
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Main Section: Submissions Feed */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <FileText size={20} className="text-brand-blue" />
                            Submissions Feed
                        </h2>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="bg-transparent text-sm p-1 outline-none text-gray-600"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="bg-transparent text-sm p-1 outline-none text-gray-600"
                                />
                            </div>

                            <button
                                onClick={handleGenerateReport}
                                className="px-4 py-2 bg-white border border-brand-blue text-brand-blue font-bold rounded-lg hover:bg-blue-50 transition text-sm flex items-center gap-2 shadow-sm whitespace-nowrap"
                            >
                                <FileText size={16} />
                                {reportMessage || 'Export CSV'}
                            </button>
                        </div>
                    </div>

                    {/* Feed Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="p-3 rounded-tl-lg">Date</th>
                                    <th className="p-3">Employee</th>
                                    <th className="p-3">Client</th>
                                    <th className="p-3 text-right">Hrs</th>
                                    <th className="p-3 text-right">Rate</th>
                                    <th className="p-3 rounded-tr-lg text-right">Miles</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {feedLoading ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" /></td></tr>
                                ) : feedData.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">No submissions found for this period.</td></tr>
                                ) : (
                                    feedData.map(sub => (
                                        <tr key={sub.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="p-3 font-medium text-gray-700">{sub.date_of_service}</td>
                                            <td className="p-3 text-brand-blue">{sub.employees?.name}</td>
                                            <td className="p-3 text-gray-600 truncate max-w-[150px]">{sub.client_name}</td>
                                            <td className="p-3 text-right font-mono text-gray-500">{sub.total_hours?.toFixed(2)}</td>
                                            <td className="p-3 text-right font-mono text-gray-500">{sub.pay_rate ? `$${Number(sub.pay_rate).toFixed(2)}` : '-'}</td>
                                            <td className="p-3 text-right font-mono text-gray-500">{sub.mileage?.toFixed(1) || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <footer className="py-8 text-center text-xs text-gray-400">
                Powered by Epiphany Dynamics
            </footer>
        </div>
    );
}
