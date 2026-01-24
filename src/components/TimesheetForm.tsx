'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Calendar, User } from 'lucide-react';

type Employee = {
    id: string;
    name: string;
};

type TimesheetEntry = {
    id: string; // Temporary ID for UI handling
    client_name: string;
    date_of_service: string;
    start_time: string;
    end_time: string;
    total_hours: number;
    location: string;
    mileage: string;
    travel_time: string;
    notes: string;
    services: string[];
};

const SERVICES_LIST = [
    'Personal Care',
    'Medication management',
    'Companionship',
    'Meal Preparation',
    'Transportation',
    'Light Housekeeping',
    'Other'
];

export default function TimesheetForm() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Global State
    const [employeeId, setEmployeeId] = useState('');
    const [weekEnding, setWeekEnding] = useState('');
    const [certification, setCertification] = useState(false);

    // Entries State
    const [entries, setEntries] = useState<TimesheetEntry[]>([{
        id: crypto.randomUUID(),
        client_name: '',
        date_of_service: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        total_hours: 0,
        location: '',
        mileage: '',
        travel_time: '',
        notes: '',
        services: []
    }]);

    useEffect(() => {
        async function fetchEmployees() {
            try {
                const { data, error } = await supabase
                    .from('employees')
                    .select('id, name')
                    .eq('is_active', true)
                    .order('name');

                if (error) throw error;
                setEmployees(data || []);
            } catch (error) {
                console.error('Error fetching employees:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchEmployees();
    }, []);

    // Calculate Hours for a specific entry
    const calculateHours = (start: string, end: string) => {
        if (!start || !end) return 0;
        const startDate = new Date(`1970-01-01T${start}`);
        const endDate = new Date(`1970-01-01T${end}`);
        let diff = (endDate.getTime() - startDate.getTime()) / 1000 / 60 / 60;
        if (diff < 0) diff += 24;
        return parseFloat(diff.toFixed(2));
    };

    const updateEntry = (id: string, field: keyof TimesheetEntry, value: any) => {
        setEntries(prev => prev.map(entry => {
            if (entry.id !== id) return entry;

            const updated = { ...entry, [field]: value };

            // Auto-calc hours if time changes
            if (field === 'start_time' || field === 'end_time') {
                updated.total_hours = calculateHours(
                    field === 'start_time' ? value : entry.start_time,
                    field === 'end_time' ? value : entry.end_time
                );
            }
            return updated;
        }));
    };

    const toggleService = (entryId: string, service: string) => {
        setEntries(prev => prev.map(entry => {
            if (entry.id !== entryId) return entry;
            const services = entry.services.includes(service)
                ? entry.services.filter(s => s !== service)
                : [...entry.services, service];
            return { ...entry, services };
        }));
    };

    const addEntry = () => {
        setEntries(prev => [...prev, {
            id: crypto.randomUUID(),
            client_name: '',
            date_of_service: new Date().toISOString().split('T')[0],
            start_time: '',
            end_time: '',
            total_hours: 0,
            location: '',
            mileage: '',
            travel_time: '',
            notes: '',
            services: []
        }]);
    };

    const removeEntry = (id: string) => {
        if (entries.length === 1) {
            alert("You must have at least one entry.");
            return;
        }
        setEntries(prev => prev.filter(e => e.id !== id));
    };

    const getTotalWeeklyHours = () => {
        return entries.reduce((sum, entry) => sum + entry.total_hours, 0).toFixed(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!employeeId) {
            alert('Please select an employee.');
            return;
        }
        if (!certification) {
            alert('Please check the certification box.');
            return;
        }

        // Validate all entries
        for (const entry of entries) {
            if (!entry.client_name || !entry.date_of_service || !entry.start_time || !entry.end_time || !entry.location) {
                alert('Please fill out all required fields for every entry.');
                return;
            }
            if (entry.services.length === 0) {
                alert(`Please select at least one service for entry: ${entry.client_name || 'Untitled'}`);
                return;
            }
        }

        setSubmitting(true);

        try {
            const submissions = entries.map(entry => ({
                employee_id: employeeId,
                client_name: entry.client_name,
                date_of_service: entry.date_of_service,
                start_time: entry.start_time,
                end_time: entry.end_time,
                total_hours: entry.total_hours,
                location: entry.location,
                mileage: entry.mileage ? parseFloat(entry.mileage) : null,
                travel_time: entry.travel_time ? parseFloat(entry.travel_time) : null,
                notes: entry.notes,
                services: entry.services,
                certification: true // Global certification applies to all
            }));

            // Supabase allows bulk insert by passing an array
            const { error } = await supabase.from('submissions').insert(submissions);

            if (error) throw error;

            setSuccess(true);
            window.scrollTo(0, 0);

            setTimeout(() => {
                setSuccess(false);
                setEmployeeId('');
                setWeekEnding('');
                setCertification(false);
                setEntries([{
                    id: crypto.randomUUID(),
                    client_name: '',
                    date_of_service: new Date().toISOString().split('T')[0],
                    start_time: '',
                    end_time: '',
                    total_hours: 0,
                    location: '',
                    mileage: '',
                    travel_time: '',
                    notes: '',
                    services: []
                }]);
            }, 3000);

        } catch (error) {
            console.error('Submission error:', error);
            alert('Error submitting timesheet. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <CheckIcon />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Weekly Timesheet Received</h2>
                <button
                    onClick={() => setSuccess(false)}
                    className="mt-6 px-6 py-2 bg-brand-blue text-white rounded-md hover:bg-blue-800 transition"
                >
                    Submit Another
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto p-6 md:p-8 bg-white shadow-lg rounded-2xl">

            {/* Header Section */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-6">
                <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Weekly Timesheet Info</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Employee */}
                    <div className='flex flex-col'>
                        <label className="text-sm font-bold text-gray-700 mb-2">Employee Name <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <select
                                required
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition appearance-none"
                                value={employeeId}
                                onChange={e => setEmployeeId(e.target.value)}
                            >
                                <option value="" className="text-gray-400">Select Name</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Week Ending Date */}
                    <div className='flex flex-col'>
                        <label className="text-sm font-bold text-gray-700 mb-2">Week Ending Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition"
                                value={weekEnding}
                                onChange={e => setWeekEnding(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Entries List */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">Time Entries</h3>
                    <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{entries.length} Entries</span>
                </div>

                {entries.map((entry, index) => (
                    <div key={entry.id} className="relative bg-white border-2 border-gray-100 rounded-xl p-6 shadow-sm hover:border-blue-50 transition-colors">
                        {/* Entry Number Badge */}
                        <div className="absolute -left-3 -top-3 bg-brand-blue text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md border-2 border-white">
                            {index + 1}
                        </div>

                        <button
                            type="button"
                            onClick={() => removeEntry(entry.id)}
                            className="absolute right-4 top-4 text-gray-300 hover:text-red-500 transition p-1"
                            title="Remove Entry"
                        >
                            <Trash2 size={20} />
                        </button>

                        {/* Stacked Layout for Fields */}
                        <div className="flex flex-col gap-6 mt-2">

                            {/* Row 1: Client Name */}
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Client Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-blue-100 outline-none transition"
                                    value={entry.client_name}
                                    onChange={e => updateEntry(entry.id, 'client_name', e.target.value)}
                                    placeholder="Enter client's full name"
                                />
                            </div>

                            {/* Row 2: Date & Location */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date of Service <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        required
                                        max={new Date().toISOString().split('T')[0]}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-blue-100 outline-none transition"
                                        value={entry.date_of_service}
                                        onChange={e => updateEntry(entry.id, 'date_of_service', e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Location / Address <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-blue-100 outline-none transition"
                                        value={entry.location}
                                        onChange={e => updateEntry(entry.id, 'location', e.target.value)}
                                        placeholder="City or full address"
                                    />
                                </div>
                            </div>

                            {/* Row 3: Time (Start, End, Total) */}
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Time Calculation</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="flex flex-col">
                                        <label className="text-xs font-medium text-gray-600 mb-1">Start Time</label>
                                        <input
                                            type="time"
                                            required
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:border-brand-blue outline-none bg-white"
                                            value={entry.start_time}
                                            onChange={e => updateEntry(entry.id, 'start_time', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-xs font-medium text-gray-600 mb-1">End Time</label>
                                        <input
                                            type="time"
                                            required
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:border-brand-blue outline-none bg-white"
                                            value={entry.end_time}
                                            onChange={e => updateEntry(entry.id, 'end_time', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-xs font-medium text-brand-blue mb-1">Total Hours</label>
                                        <div className="w-full p-3 bg-blue-50 border border-blue-100 text-brand-blue font-bold rounded-lg text-center text-lg">
                                            {entry.total_hours}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Row 4: Travel & Mileage */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mileage (Miles)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-blue-100 outline-none transition"
                                        value={entry.mileage}
                                        onChange={e => updateEntry(entry.id, 'mileage', e.target.value)}
                                        placeholder="0.0"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Travel Time (Hours)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-blue-100 outline-none transition"
                                        value={entry.travel_time}
                                        onChange={e => updateEntry(entry.id, 'travel_time', e.target.value)}
                                        placeholder="0.0"
                                    />
                                </div>
                            </div>

                            {/* Row 5: Services */}
                            <div className="flex flex-col mt-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Services Performed <span className="text-red-500">*</span></label>
                                <div className="flex flex-wrap gap-3">
                                    {SERVICES_LIST.map(service => (
                                        <button
                                            key={service}
                                            type="button"
                                            onClick={() => toggleService(entry.id, service)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all shadow-sm ${entry.services.includes(service)
                                                    ? 'bg-brand-blue text-white border-brand-blue ring-2 ring-blue-200'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {service}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Row 6: Notes */}
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes / Details</label>
                                <textarea
                                    className="w-full p-3 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-blue focus:ring-2 focus:ring-blue-100 min-h-[80px]"
                                    placeholder="Add any additional details here..."
                                    value={entry.notes}
                                    onChange={e => updateEntry(entry.id, 'notes', e.target.value)}
                                />
                            </div>

                        </div>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-6 pt-4">
                <button
                    type="button"
                    onClick={addEntry}
                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-brand-blue hover:text-brand-blue hover:bg-blue-50 transition flex items-center justify-center gap-2 group"
                >
                    <div className="bg-gray-200 rounded-full p-1 group-hover:bg-blue-100 transition"><Plus size={20} /></div>
                    Add Another Entry
                </button>

                <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg flex flex-col lg:flex-row items-center justify-around gap-8">
                    <div className="text-center">
                        <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Total Weekly Hours</div>
                        <div className="text-4xl font-bold text-white tracking-tight">{getTotalWeeklyHours()}</div>
                    </div>

                    <div className="flex-1 w-full max-w-md">
                        <label className="flex items-start gap-4 cursor-pointer p-2 rounded-lg hover:bg-gray-800 transition">
                            <input
                                type="checkbox"
                                required
                                className="mt-1 w-6 h-6 rounded border-gray-500 text-brand-blue focus:ring-brand-blue bg-gray-700"
                                checked={certification}
                                onChange={e => setCertification(e.target.checked)}
                            />
                            <span className="text-sm text-gray-300 leading-snug">
                                I certify that the information entered provided is accurate and true to the best of my knowledge.
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || loading}
                        className="w-full md:w-auto px-10 py-4 bg-brand-blue text-white font-bold text-lg rounded-full hover:bg-blue-600 hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md whitespace-nowrap transform hover:-translate-y-0.5"
                    >
                        {submitting ? 'Submitting...' : 'Submit Form'}
                    </button>
                </div>
            </div>

            <div className="h-12"></div>
        </form>
    );
}

function CheckIcon() {
    return (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    )
}
