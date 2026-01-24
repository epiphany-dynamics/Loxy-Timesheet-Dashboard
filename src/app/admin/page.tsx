'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { getEmployees, toggleEmployeeStatus, addEmployee, fetchSubmissions } from '../actions';
import { User, FileText, Check, X, Plus, Loader2 } from 'lucide-react';

type Employee = {
    id: string;
    name: string;
    is_active: boolean;
};

export default function AdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'employees' | 'reports'>('employees');

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [empLoading, setEmpLoading] = useState(true);

    const [dateRange, setDateRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });
    const [reportLoading, setReportLoading] = useState(false);
    const [reportMessage, setReportMessage] = useState('');

    useEffect(() => {
        loadEmployees();
    }, []);

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

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setEmployees(prev => prev.map(e => e.id === id ? { ...e, is_active: !currentStatus } : e));
        try {
            await toggleEmployeeStatus(id, !currentStatus);
        } catch (e) {
            alert('Failed to update status');
            loadEmployees();
        }
    };

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmployeeName.trim()) return;

        try {
            await addEmployee(newEmployeeName);
            setNewEmployeeName('');
            loadEmployees();
        } catch (e) {
            alert('Failed to add employee');
        }
    };

    const handleGenerateReport = async () => {
        setReportLoading(true);
        setReportMessage('');
        try {
            const submissions = await fetchSubmissions(dateRange.start, dateRange.end);

            if (submissions.length === 0) {
                setReportMessage('No records found for this period.');
            } else {
                const headers = ['Employee', 'Client', 'Date', 'Start', 'End', 'Total Hours', 'Location', 'Services', 'Notes'];
                const csvRows = [headers.join(',')];

                submissions.forEach((sub: any) => {
                    const services = Array.isArray(sub.services) ? sub.services.join('; ') : sub.services;
                    const clean = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;

                    const row = [
                        clean(sub.employees?.name || 'Unknown'),
                        clean(sub.client_name),
                        sub.date_of_service,
                        sub.start_time,
                        sub.end_time,
                        sub.total_hours,
                        clean(sub.location),
                        clean(services),
                        clean(sub.notes)
                    ];
                    csvRows.push(row.join(','));
                });

                const csvContent = csvRows.join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Grace_Caretakers_Report_${dateRange.start}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                setReportMessage(`Success! Downloaded ${submissions.length} records.`);
            }
        } catch (e: any) {
            if (e.message === 'Unauthorized' || e.message.includes('Unauthorized')) {
                router.push('/login');
                return;
            }
            setReportMessage('Error fetching report data.');
            console.error(e);
        } finally {
            setReportLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
            <Header />

            <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold border-l-4 border-brand-red pl-4 text-brand-blue">Admin Center</h1>
                </div>

                <div className="flex space-x-4 mb-8 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={`pb-3 px-4 flex items-center gap-2 font-medium transition-all ${activeTab === 'employees'
                            ? 'text-brand-blue border-b-2 border-brand-blue'
                            : 'text-gray-500 hover:text-gray-800'
                            }`}
                    >
                        <User size={18} /> Employees
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`pb-3 px-4 flex items-center gap-2 font-medium transition-all ${activeTab === 'reports'
                            ? 'text-brand-blue border-b-2 border-brand-blue'
                            : 'text-gray-500 hover:text-gray-800'
                            }`}
                    >
                        <FileText size={18} /> Reports
                    </button>
                </div>

                {activeTab === 'employees' && (
                    <div className="space-y-6">
                        <form onSubmit={handleAddEmployee} className="flex gap-2 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <input
                                type="text"
                                placeholder="New Employee Name..."
                                className="flex-1 border border-gray-300 rounded-lg p-3 focus:border-brand-blue outline-none"
                                value={newEmployeeName}
                                onChange={e => setNewEmployeeName(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="px-6 bg-brand-blue text-white font-bold rounded-lg hover:bg-blue-800 transition flex items-center gap-2"
                            >
                                <Plus size={18} /> Add
                            </button>
                        </form>

                        {empLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-brand-blue" /></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {employees.map(emp => (
                                    <div key={emp.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
                                        <span className={emp.is_active ? 'text-gray-900 font-medium' : 'text-gray-400 line-through'}>
                                            {emp.name}
                                        </span>
                                        <button
                                            onClick={() => handleToggleStatus(emp.id, emp.is_active)}
                                            className={`p-2 rounded-full transition-all ${emp.is_active
                                                ? 'bg-blue-50 text-brand-blue hover:bg-blue-100'
                                                : 'bg-red-50 text-brand-red hover:bg-red-100'
                                                }`}
                                            title={emp.is_active ? "Deactivate" : "Activate"}
                                        >
                                            {emp.is_active ? <Check size={16} /> : <X size={16} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="max-w-lg mx-auto">
                        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand-blue"
                                        value={dateRange.start}
                                        onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand-blue"
                                        value={dateRange.end}
                                        onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleGenerateReport}
                                disabled={reportLoading}
                                className="w-full py-4 bg-brand-blue text-white font-bold text-lg rounded-xl hover:bg-blue-800 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {reportLoading ? <Loader2 className="animate-spin" /> : <FileText />}
                                {reportLoading ? 'Generating...' : 'Generate & Download CSV'}
                            </button>

                            {reportMessage && (
                                <div className={`p-4 rounded-lg text-center text-sm ${reportMessage.includes('Success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                    {reportMessage}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <footer className="py-8 text-center text-xs text-gray-400">
                Powered by Epiphany Dynamics
            </footer>
        </div>
    );
}
