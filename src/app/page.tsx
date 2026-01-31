import { Header } from "@/components/Header";
import TimesheetForm from "@/components/TimesheetForm";

// Disable caching for this page to prevent form data caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      <div className="max-w-md mx-auto px-1 py-2">
        <TimesheetForm />
      </div>

      <footer className="py-8 text-center text-xs text-gray-300">
        Powered by Epiphany Dynamics
      </footer>
    </main>
  );
}
