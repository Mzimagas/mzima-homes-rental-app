'use client'

import Image from "next/image";
import { useAuth } from "../lib/auth-context";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleAccessDashboard = () => {
    if (user) {
      // User is authenticated, navigate to dashboard
      router.push('/dashboard');
    } else {
      // User is not authenticated, navigate to login with redirect
      router.push('/auth/login?redirectTo=/dashboard');
    }
  };
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Voi Rental Management</h1>
          <p className="text-lg text-gray-600 mb-8">
            Comprehensive rental property management system
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl">
          <h2 className="text-2xl font-semibold mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Database Connection: Active</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Business Logic Functions: Ready</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Authentication: Configured</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Property Management</h3>
            <p className="text-blue-700 text-sm">
              Manage properties, units, and occupancy tracking
            </p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Tenant Management</h3>
            <p className="text-green-700 text-sm">
              Handle tenant profiles, agreements, and status
            </p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">Financial Tracking</h3>
            <p className="text-purple-700 text-sm">
              Invoice generation, payment processing, and reporting
            </p>
          </div>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <button
            onClick={handleAccessDashboard}
            disabled={loading}
            className="rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              'Access Dashboard'
            )}
          </button>
          <button className="rounded-full border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5">
            View Documentation
          </button>
        </div>
      </main>
      
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-sm text-gray-500">
        <span>Voi Rental Management System</span>
        <span>•</span>
        <span>Built with Next.js & Supabase</span>
      </footer>
    </div>
  );
}
