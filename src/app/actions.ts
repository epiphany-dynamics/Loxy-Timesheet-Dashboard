'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// --- Safe Supabase Admin Client for Server Actions ---

async function createSessionClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value },
                set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
                remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }) },
            },
        }
    );
}

// --- Employee Actions ---

export async function getEmployees() {
    const supabase = await createSessionClient();
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');

    if (error) throw new Error(error.message);
    return data;
}

export async function toggleEmployeeStatus(id: string, isActive: boolean) {
    const supabase = await createSessionClient();
    const { error } = await supabase
        .from('employees')
        .update({ is_active: isActive })
        .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true };
}

export async function addEmployee(name: string) {
    const supabase = await createSessionClient();
    const { error } = await supabase
        .from('employees')
        .insert([{ name, is_active: true }]);

    if (error) throw new Error(error.message);
    return { success: true };
}

// --- Report Actions ---

export async function fetchSubmissions(startDate: string, endDate: string) {
    const supabase = await createSessionClient();

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 2. Fetch Data
    const { data: submissions, error } = await supabase
        .from('submissions')
        .select(`
      *,
      employees (name)
    `)
        .gte('date_of_service', startDate)
        .lte('date_of_service', endDate)
        .order('date_of_service', { ascending: false });

    if (error) throw new Error(error.message);

    return submissions || [];
}
