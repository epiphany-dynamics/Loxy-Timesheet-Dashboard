'use client';

import { useState, useEffect, useRef } from 'react';
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
    pay_rate: string;
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
    const formRef = useRef<HTMLFormElement>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formKey, setFormKey] = useState(0); // Force form re-render

    // Global State
    const [employeeId, setEmployeeId] = useState('');
    const [weekEnding, setWeekEnding] = useState('');
    const [certification, setCertification] = useState(false);
    const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
    const [showErrorBanner, setShowErrorBanner] = useState(false);

    // Entries State
    const [entries, setEntries] = useState<TimesheetEntry[]>([{
        id: 'initial-entry',
        client_name: '',
        date_of_service: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        total_hours: 0,
        location: '',
        pay_rate: '',
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

        // Clear any potential browser cached form data on mount
        if (formRef.current) {
            formRef.current.reset();
        }

        // Hydration Fix: Ensure we switch to a random ID on the client side immediately
        setEntries(prev => prev.map(e => e.id === 'initial-entry' ? { ...e, id: crypto.randomUUID() } : e));
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

    const updateEntry = (id: string, field: keyof TimesheetEntry, value: string | number | string[]) => {
        setEntries(prev => prev.map(entry => {
            if (entry.id !== id) return entry;

            const updated = { ...entry, [field]: value };

            // Auto-calc hours if time changes
            if (field === 'start_time' || field === 'end_time') {
                updated.total_hours = calculateHours(
                    field === 'start_time' ? (value as string) : entry.start_time,
                    field === 'end_time' ? (value as string) : entry.end_time
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
        setErrors([]); // Clear errors when adding new entry
        setEntries(prev => [...prev, {
            id: crypto.randomUUID(),
            client_name: '',
            date_of_service: new Date().toISOString().split('T')[0],
            start_time: '',
            end_time: '',
            total_hours: 0,
            location: '',
            pay_rate: '',
            notes: '',
            services: []
        }]);
    };

    const removeEntry = (id: string) => {
        if (entries.length === 1) {
            alert("You must have at least one entry.");
            return;
        }
        // Clear errors related to this entry
        setErrors(prev => prev.filter(e => !e.field.includes(id)));
        setEntries(prev => prev.filter(e => e.id !== id));
    };

    const getTotalWeeklyHours = () => {
        return entries.reduce((sum, entry) => sum + entry.total_hours, 0).toFixed(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Clear previous errors
        setErrors([]);
        const newErrors: { field: string; message: string }[] = [];

        if (!employeeId) {
            newErrors.push({ field: 'employee', message: 'Select your name from the list' });
        }
        if (!certification) {
            newErrors.push({ field: 'certification', message: 'Check the box at the bottom to confirm' });
        }

        // Validate all entries
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const entryNum = entries.length > 1 ? ` (Entry ${i + 1})` : '';

            if (!entry.client_name) {
                newErrors.push({ field: `entry-${entry.id}-client`, message: `Enter the client's name${entryNum}` });
            }
            if (!entry.date_of_service) {
                newErrors.push({ field: `entry-${entry.id}-date`, message: `Pick the date you worked${entryNum}` });
            }
            if (!entry.start_time) {
                newErrors.push({ field: `entry-${entry.id}-start`, message: `Enter your start time${entryNum}` });
            }
            if (!entry.end_time) {
                newErrors.push({ field: `entry-${entry.id}-end`, message: `Enter your end time${entryNum}` });
            }
            if (!entry.location) {
                newErrors.push({ field: `entry-${entry.id}-location`, message: `Enter the location${entryNum}` });
            }
            // Verified Mandatory Pay Rate Validation (Feb 11 2026)
            if (!entry.pay_rate) {
                newErrors.push({ field: `entry-${entry.id}-payrate`, message: `Enter your pay rate${entryNum}` });
            }
            if (entry.services.length === 0) {
                newErrors.push({ field: `entry-${entry.id}-services`, message: `Tap at least one service you performed${entryNum}` });
            }
        }

        // If there are errors, display them and scroll/focus to the first error
        if (newErrors.length > 0) {
            setErrors(newErrors);
            setShowErrorBanner(true);

            // Find and scroll to the first error field
            setTimeout(() => {
                const firstErrorField = newErrors[0].field;
                const element = formRef.current?.querySelector(`[data-field="${firstErrorField}"]`) as HTMLElement;

                if (element) {
                    // Scroll the element into view with some offset
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Add a brief highlight animation
                    element.classList.add('animate-pulse');
                    setTimeout(() => element.classList.remove('animate-pulse'), 2000);

                    // Focus the element if it's an input/select
                    const focusable = element.querySelector('input, select, textarea') as HTMLElement;
                    if (focusable) {
                        setTimeout(() => focusable.focus(), 500);
                    }
                }
            }, 100);

            return;
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
                pay_rate: entry.pay_rate ? parseFloat(entry.pay_rate) : null,
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
                    pay_rate: '',
                    notes: '',
                    services: []
                }]);
                // Force form re-render with new key to clear browser cache
                setFormKey(prev => prev + 1);
                // Explicitly reset the form element
                if (formRef.current) {
                    formRef.current.reset();
                }
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

    // Helper to check if a field has an error
    const hasError = (field: string) => errors.some(e => e.field === field);
    const getError = (field: string) => errors.find(e => e.field === field)?.message;

    return (
        <form
            key={formKey}
            ref={formRef}
            onSubmit={handleSubmit}
            autoComplete="off"
            className="space-y-6 sm:space-y-8 max-w-5xl mx-auto p-4 sm:p-6 md:p-8 bg-white shadow-lg rounded-2xl">

            {/* Simple Error Banner - Mobile Optimized */}
            {showErrorBanner && errors.length > 0 && (
                <div className="bg-red-500 text-white p-3 sm:p-4 rounded-xl shadow-lg flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-white/20 rounded-full p-1.5 sm:p-2 flex-shrink-0">
                            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold text-base sm:text-lg">Almost there!</p>
                            <p className="text-white/90 text-sm">Fill in the red fields below</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowErrorBanner(false)}
                        className="text-white/80 hover:text-white p-2 -mr-1"
                        aria-label="Dismiss"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Header Section */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-6">
                <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Weekly Timesheet Info</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Employee */}
                    <div className='flex flex-col' data-field="employee">
                        <label className="text-sm font-bold text-gray-700 mb-2">Employee Name <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <select
                                required
                                autoComplete="off"
                                className={`w-full pl-10 pr-4 py-3 bg-white border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition appearance-none ${hasError('employee') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                value={employeeId}
                                onChange={e => { setEmployeeId(e.target.value); setErrors(prev => prev.filter(err => err.field !== 'employee')); setShowErrorBanner(false); }}
                            >
                                <option value="" className="text-gray-400">Select Name</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                        {hasError('employee') && <p className="text-red-500 text-sm mt-1">{getError('employee')}</p>}
                    </div>

                    {/* Week Ending Date */}
                    <div className='flex flex-col'>
                        <label className="text-sm font-bold text-gray-700 mb-2">Week Ending Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input
                                type="date"
                                autoComplete="off"
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
                            <div className="flex flex-col" data-field={`entry-${entry.id}-client`}>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Client Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    autoComplete="off"
                                    className={`w-full p-3 border rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-blue-100 outline-none transition ${hasError(`entry-${entry.id}-client`) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                    value={entry.client_name}
                                    onChange={e => { updateEntry(entry.id, 'client_name', e.target.value); setErrors(prev => prev.filter(err => err.field !== `entry-${entry.id}-client`)); setShowErrorBanner(false); }}
                                    placeholder="Enter client's full name"
                                />
                                {hasError(`entry-${entry.id}-client`) && <p className="text-red-500 text-sm mt-1">{getError(`entry-${entry.id}-client`)}</p>}
                            </div>

                            {/* Row 2: Date & Location */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col" data-field={`entry-${entry.id}-date`}>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date of Service <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        required
                                        autoComplete="off"
                                        max={new Date().toISOString().split('T')[0]}
                                        className={`w-full p-3 border rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-blue-100 outline-none transition ${hasError(`entry-${entry.id}-date`) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                        value={entry.date_of_service}
                                        onChange={e => { updateEntry(entry.id, 'date_of_service', e.target.value); setErrors(prev => prev.filter(err => err.field !== `entry-${entry.id}-date`)); setShowErrorBanner(false); }}
                                    />
                                    {hasError(`entry-${entry.id}-date`) && <p className="text-red-500 text-sm mt-1">{getError(`entry-${entry.id}-date`)}</p>}
                                </div>
                                <div className="flex flex-col" data-field={`entry-${entry.id}-location`}>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Location / Address <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        autoComplete="off"
                                        className={`w-full p-3 border rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-blue-100 outline-none transition ${hasError(`entry-${entry.id}-location`) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                        value={entry.location}
                                        onChange={e => { updateEntry(entry.id, 'location', e.target.value); setErrors(prev => prev.filter(err => err.field !== `entry-${entry.id}-location`)); setShowErrorBanner(false); }}
                                        placeholder="City or full address"
                                    />
                                    {hasError(`entry-${entry.id}-location`) && <p className="text-red-500 text-sm mt-1">{getError(`entry-${entry.id}-location`)}</p>}
                                </div>
                            </div>

                            {/* Row 3: Time (Start, End, Total) */}
                            <div className={`p-4 rounded-lg border ${hasError(`entry-${entry.id}-start`) || hasError(`entry-${entry.id}-end`) ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Time Calculation <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="flex flex-col" data-field={`entry-${entry.id}-start`}>
                                        <label className="text-xs font-medium text-gray-600 mb-1">Start Time</label>
                                        <input
                                            type="time"
                                            required
                                            autoComplete="off"
                                            className={`w-full p-3 border rounded-lg focus:border-brand-blue outline-none bg-white ${hasError(`entry-${entry.id}-start`) ? 'border-red-500' : 'border-gray-300'}`}
                                            value={entry.start_time}
                                            onChange={e => { updateEntry(entry.id, 'start_time', e.target.value); setErrors(prev => prev.filter(err => err.field !== `entry-${entry.id}-start`)); setShowErrorBanner(false); }}
                                        />
                                        {hasError(`entry-${entry.id}-start`) && <p className="text-red-500 text-sm mt-1">{getError(`entry-${entry.id}-start`)}</p>}
                                    </div>
                                    <div className="flex flex-col" data-field={`entry-${entry.id}-end`}>
                                        <label className="text-xs font-medium text-gray-600 mb-1">End Time</label>
                                        <input
                                            type="time"
                                            required
                                            autoComplete="off"
                                            className={`w-full p-3 border rounded-lg focus:border-brand-blue outline-none bg-white ${hasError(`entry-${entry.id}-end`) ? 'border-red-500' : 'border-gray-300'}`}
                                            value={entry.end_time}
                                            onChange={e => { updateEntry(entry.id, 'end_time', e.target.value); setErrors(prev => prev.filter(err => err.field !== `entry-${entry.id}-end`)); setShowErrorBanner(false); }}
                                        />
                                        {hasError(`entry-${entry.id}-end`) && <p className="text-red-500 text-sm mt-1">{getError(`entry-${entry.id}-end`)}</p>}
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-xs font-medium text-brand-blue mb-1">Total Hours</label>
                                        <div className="w-full p-3 bg-blue-50 border border-blue-100 text-brand-blue font-bold rounded-lg text-center text-lg">
                                            {entry.total_hours}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Row 4: Pay Rate (Mileage Removed) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col" data-field={`entry-${entry.id}-payrate`}>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pay Rate ($/hr) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        autoComplete="off"
                                        className={`w-full p-3 border rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-blue-100 outline-none transition ${hasError(`entry-${entry.id}-payrate`) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                        value={entry.pay_rate}
                                        onChange={e => { updateEntry(entry.id, 'pay_rate', e.target.value); setErrors(prev => prev.filter(err => err.field !== `entry-${entry.id}-payrate`)); setShowErrorBanner(false); }}
                                        placeholder="0.00"
                                    />
                                    {hasError(`entry-${entry.id}-payrate`) && <p className="text-red-500 text-sm mt-1">{getError(`entry-${entry.id}-payrate`)}</p>}
                                </div>
                            </div>

                            {/* Row 5: Services */}
                            <div className={`flex flex-col mt-2 p-3 sm:p-4 rounded-lg ${hasError(`entry-${entry.id}-services`) ? 'bg-red-50 border border-red-200' : ''}`} data-field={`entry-${entry.id}-services`}>
                                <label className={`text-xs font-bold uppercase tracking-wider mb-3 ${hasError(`entry-${entry.id}-services`) ? 'text-red-600' : 'text-gray-500'}`}>Services Performed <span className="text-red-500">*</span> <span className="font-normal normal-case">(tap to select)</span></label>
                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                    {SERVICES_LIST.map(service => (
                                        <button
                                            key={service}
                                            type="button"
                                            onClick={() => { toggleService(entry.id, service); setErrors(prev => prev.filter(err => err.field !== `entry-${entry.id}-services`)); setShowErrorBanner(false); }}
                                            className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-full text-sm font-medium border transition-all shadow-sm min-h-[44px] ${entry.services.includes(service)
                                                ? 'bg-brand-blue text-white border-brand-blue ring-2 ring-blue-200'
                                                : hasError(`entry-${entry.id}-services`)
                                                    ? 'bg-white text-red-600 border-red-300 hover:border-red-400 hover:bg-red-50'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {service}
                                        </button>
                                    ))}
                                </div>
                                {hasError(`entry-${entry.id}-services`) && <p className="text-red-500 text-sm mt-3">{getError(`entry-${entry.id}-services`)}</p>}
                            </div>

                            {/* Row 6: Notes */}
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes / Details</label>
                                <textarea
                                    autoComplete="off"
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

                <div className="bg-gray-900 text-white p-4 sm:p-6 rounded-xl shadow-lg flex flex-col lg:flex-row items-center justify-around gap-5 sm:gap-8">
                    <div className="text-center">
                        <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Total Weekly Hours</div>
                        <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{getTotalWeeklyHours()}</div>
                    </div>

                    <div className="flex-1 w-full max-w-md" data-field="certification">
                        <label className={`flex items-start gap-3 sm:gap-4 cursor-pointer p-2 rounded-lg transition ${hasError('certification') ? 'bg-red-900/30 ring-2 ring-red-500' : 'hover:bg-gray-800 active:bg-gray-800'}`}>
                            <input
                                type="checkbox"
                                required
                                className={`mt-0.5 w-7 h-7 sm:w-6 sm:h-6 rounded border-gray-500 text-brand-blue focus:ring-brand-blue bg-gray-700 flex-shrink-0 ${hasError('certification') ? 'border-red-500' : ''}`}
                                checked={certification}
                                onChange={e => { setCertification(e.target.checked); setErrors(prev => prev.filter(err => err.field !== 'certification')); setShowErrorBanner(false); }}
                            />
                            <span className={`text-sm leading-snug ${hasError('certification') ? 'text-red-300' : 'text-gray-300'}`}>
                                I certify that the information provided is accurate and true to the best of my knowledge.
                            </span>
                        </label>
                        {hasError('certification') && <p className="text-red-400 text-sm mt-2">{getError('certification')}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || loading}
                        className="w-full lg:w-auto px-10 py-4 sm:py-5 bg-brand-blue text-white font-bold text-lg sm:text-xl rounded-full hover:bg-blue-600 hover:shadow-xl active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md whitespace-nowrap min-h-[56px]"
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
