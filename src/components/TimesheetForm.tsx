'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type Employee = {
    id: string;
    name: string;
};

export default function TimesheetForm() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        employee_id: '',
        client_name: '',
        date_of_service: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        total_hours: 0,
        location: '',
        mileage: '',
        travel_time: '',
        notes: '',
        certification: false,
        services: [] as string[]
    });

    const SERVICES_LIST = [
        'Personal Care',
        'Medication management',
        'Companionship',
        'Meal Preparation',
        'Transportation',
        'Light Housekeeping',
        'Other'
    ];

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

    // Time Calculation Logic
    useEffect(() => {
        if (formData.start_time && formData.end_time) {
            const start = new Date(`1970-01-01T${formData.start_time}`);
            const end = new Date(`1970-01-01T${formData.end_time}`);

            let diff = (end.getTime() - start.getTime()) / 1000 / 60 / 60; // hours
            if (diff < 0) diff += 24; // Handle overnight

            setFormData(prev => ({ ...prev, total_hours: parseFloat(diff.toFixed(2)) }));
        }
    }, [formData.start_time, formData.end_time]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.certification) {
            alert('Please check the certification box.');
            return;
        }
        setSubmitting(true);

        try {
            const { error } = await supabase.from('submissions').insert([{
                ...formData,
                mileage: formData.mileage ? parseFloat(formData.mileage) : null,
                travel_time: formData.travel_time ? parseFloat(formData.travel_time) : null
            }]);

            if (error) throw error;

            setSuccess(true);
            window.scrollTo(0, 0);

            setTimeout(() => {
                setSuccess(false);
                setFormData({
                    employee_id: '',
                    client_name: '',
                    date_of_service: new Date().toISOString().split('T')[0],
                    start_time: '',
                    end_time: '',
                    total_hours: 0,
                    location: '',
                    mileage: '',
                    travel_time: '',
                    notes: '',
                    certification: false,
                    services: []
                });
            }, 3000);

        } catch (error) {
            console.error('Submission error:', error);
            alert('Error submitting timesheet. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleService = (service: string) => {
        setFormData(prev => {
            const services = prev.services.includes(service)
                ? prev.services.filter(s => s !== service)
                : [...prev.services, service];
            return { ...prev, services };
        });
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Submission Received</h2>
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
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto p-4 bg-white">

            {/* 1. Employee Name */}
            <div>
                <label className="form-label">Your Name <span className="form-asterisk">*</span></label>
                <select
                    required
                    className="form-input appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231a1a1a%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_1rem_center] bg-no-repeat pr-10"
                    value={formData.employee_id}
                    onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                >
                    <option value="" className="text-gray-400">Name</option>
                    {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                </select>
            </div>

            {/* 2. Client Name */}
            <div>
                <label className="form-label">Client Name <span className="form-asterisk">*</span></label>
                <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.client_name}
                    onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="Enter client's full name"
                />
            </div>

            {/* 3. Date of Service */}
            <div>
                <label className="form-label">Date of Service <span className="form-asterisk">*</span></label>
                <input
                    type="date"
                    required
                    className="form-input"
                    value={formData.date_of_service}
                    onChange={e => setFormData({ ...formData, date_of_service: e.target.value })}
                />
            </div>

            {/* 4. Start Time & End Time */}
            <div className="space-y-4">
                <div>
                    <label className="form-label">Start Time <span className="form-asterisk">*</span></label>
                    <input
                        type="time"
                        required
                        className="form-input"
                        value={formData.start_time}
                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    />
                </div>
                <div>
                    <label className="form-label">End Time <span className="form-asterisk">*</span></label>
                    <input
                        type="time"
                        required
                        className="form-input"
                        value={formData.end_time}
                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    />
                </div>
            </div>

            {/* 5. Total Hours (Read Only to mimic screenshots usually) or just Input */}
            <div>
                <label className="form-label">Total Hours</label>
                <input
                    type="number"
                    readOnly
                    className="form-input bg-gray-50 text-gray-600"
                    value={formData.total_hours}
                />
            </div>

            {/* 6. Location */}
            <div>
                <label className="form-label">Service Location/Address <span className="form-asterisk">*</span></label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Enter full address where service was provided"
                />
            </div>

            {/* 7. Mileage */}
            <div>
                <label className="form-label">Mileage (Round Trip Miles)</label>
                <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={formData.mileage}
                    onChange={e => setFormData({ ...formData, mileage: e.target.value })}
                    placeholder="0"
                />
            </div>

            {/* 8. Travel Time */}
            <div>
                <label className="form-label">Travel Time (Hours)</label>
                <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={formData.travel_time}
                    onChange={e => setFormData({ ...formData, travel_time: e.target.value })}
                    placeholder="Example: 0.5 for 30 minutes"
                />
            </div>

            {/* 9. Services Performed */}
            <div>
                <label className="form-label mb-3">Services Performed</label>
                <div className="space-y-3">
                    {SERVICES_LIST.map(service => (
                        <label key={service} className="flex items-center gap-3 cursor-pointer p-2 border border-input-border rounded-md hover:bg-gray-50 transition">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded-full border-gray-300 text-brand-blue focus:ring-brand-blue"
                                checked={formData.services.includes(service)}
                                onChange={() => toggleService(service)}
                            />
                            <span className="text-gray-700">{service}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* 10. Notes (Hidden in some screenshots, but user requested in Step 1. Wait, step 1 said "Recreate form from screenshots". I'll add Notes as optional at bottom if not in screenshot, but user explicitly asked for 'notes' field in earlier prompt. I'll keep it but make it clean.) */}
            {/* Actually, looking at screenshot 2 (bottom part), I see services list. I don't see notes in the glimpse. But Step 1 explicitly requested 'notes' field in DB and form. I will keep it simple. */}
            <div>
                <label className="form-label">Notes (Optional)</label>
                <textarea
                    className="form-input min-h-[80px]"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
            </div>

            {/* 11. Certification & Submit */}
            <div className="pt-4 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        required
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                        checked={formData.certification}
                        onChange={e => setFormData({ ...formData, certification: e.target.checked })}
                    />
                    <span className="text-sm text-gray-700 leading-tight">
                        I certify that the information entered provided is accurate and true to the best of my knowledge.
                    </span>
                </label>

                <button
                    type="submit"
                    disabled={submitting || loading}
                    className="w-full py-3 bg-brand-blue text-white font-bold text-lg rounded-full hover:bg-blue-800 transition disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
                >
                    {submitting ? 'Submitting...' : 'Submit'}
                </button>
            </div>

            <div className="h-8"></div>
        </form>
    );
}
