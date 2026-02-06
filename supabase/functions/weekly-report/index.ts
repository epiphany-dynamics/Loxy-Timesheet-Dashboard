import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4.0.0'
import { Buffer } from 'node:buffer'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Calculate Date Range (Past 7 days)
        // Matches the intent of "Pull all timecard submissions from the past 7 days"
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - 7)

        const startDate = start.toISOString().split('T')[0]
        const endDate = end.toISOString().split('T')[0]

        // 2. Query Logic
        // Matches logic from `src/app/actions.ts` -> `fetchSubmissions`
        const { data: submissions, error: fetchError } = await supabaseClient
            .from('submissions')
            .select(`
        *,
        employees (name)
      `)
            .gte('date_of_service', startDate)
            .lte('date_of_service', endDate)
            .order('date_of_service', { ascending: false })

        if (fetchError) throw fetchError

        // 3. CSV Formatting Logic
        // STRICTLY PORTED FROM `src/app/admin/page.tsx` -> `handleGenerateReport`

        // --- V2 Report Logic (Group + Subtotal) ---
        const groupedData = new Map<string, {
            name: string;
            submissions: any[];
        }>();

        submissions?.forEach((sub: any) => {
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

                // CSV Escape Function from page.tsx
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

            // Subtotal Row from page.tsx
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

            // Empty row for spacing
            csvRows.push(",,,,,,,");
        });

        const csvContent = csvRows.join('\n');
        const filename = `Grace_Caretakers_Weekly_Report_${startDate}_to_${endDate}.csv`;

        // 4. Send Email
        const resend = new Resend(RESEND_API_KEY)

        const { data: emailData, error: emailError } = await resend.emails.send({
            from: 'Timesheet Automation <onboarding@resend.dev>',
            to: ['gracecaretakers@gmail.com'],
            subject: `Weekly Timesheet Report (${startDate} to ${endDate})`,
            html: `
        <p>Attached is the weekly timesheet report for the period <strong>${startDate}</strong> to <strong>${endDate}</strong>.</p>
        <p>Total Submissions: ${submissions?.length ?? 0}</p>
      `,
            attachments: [
                {
                    filename: filename,
                    content: Buffer.from(csvContent, 'utf-8'),
                }
            ]
        })

        if (emailError) {
            console.error('Resend Error:', emailError)
            // Handle Resend Error Types safely
            const errorMsg = typeof emailError === 'object' && 'message' in (emailError as any)
                ? (emailError as any).message
                : JSON.stringify(emailError);
            throw new Error(errorMsg)
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Email sent successfully', data: emailData }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Edge Function Error:', error)
        const msg = error instanceof Error ? error.message : String(error)
        return new Response(
            JSON.stringify({ success: false, error: msg }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
