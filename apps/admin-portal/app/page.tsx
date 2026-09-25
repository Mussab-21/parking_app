import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-[#0B1F3A]">
          Welcome to ParkSmart Web Portal
        </h1>
        <p className="text-gray-600 mt-2">
          Management platform for parking facility owners and system
          administrators across Pakistan.
        </p>
        <div className="mt-6 flex space-x-4">
          <Link
            href="/owner/dashboard"
            className="bg-[#1E6FFF] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-600 transition"
          >
            Go to Owner Dashboard
          </Link>
          <Link
            href="/admin/dashboard"
            className="bg-[#0B1F3A] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-slate-800 transition"
          >
            Go to Admin Portal
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-xl font-semibold text-[#0B1F3A]">
            Owner Portal Capabilities
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm">
            <li>Facility Onboarding & Document Verification</li>
            <li>Zone & Slot Inventory Management with Bulk Slot Creation</li>
            <li>Configurable Hourly Pricing & Operating Hours</li>
            <li>Real-time Occupancy & Earnings Ledger</li>
            <li>Reservation History with CSV Export</li>
            <li>Facility Staff & Attendant Management</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-xl font-semibold text-[#0B1F3A]">
            Admin Portal Capabilities
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm">
            <li>Owner Applications & Document Review</li>
            <li>Facility Approvals, Rejections, and Suspensions</li>
            <li>
              System Settings (Hold Durations, Grace Periods, Rate Bounds)
            </li>
            <li>User & Vehicle Account Oversight</li>
            <li>Append-Only Audit Logs Explorer with Pagination</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
