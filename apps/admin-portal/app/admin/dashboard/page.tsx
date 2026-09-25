import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">
            System Admin Dashboard
          </h1>
          <p className="text-gray-500 text-sm">
            Platform oversight, pending approvals, and system audit logs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Pending Owners</p>
          <p className="text-3xl font-bold text-[#F5A524] mt-2">1</p>
          <Link
            href="/admin/owners"
            className="text-xs text-blue-600 font-semibold underline"
          >
            Review applications
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">
            Pending Facilities
          </p>
          <p className="text-3xl font-bold text-[#F5A524] mt-2">1</p>
          <Link
            href="/admin/facilities"
            className="text-xs text-blue-600 font-semibold underline"
          >
            Review facilities
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">
            Total Registered Users
          </p>
          <p className="text-3xl font-bold text-[#0B1F3A] mt-2">142</p>
          <span className="text-xs text-gray-500">Drivers & Owners</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Audit Log Entries</p>
          <p className="text-3xl font-bold text-[#12B5A6] mt-2">350+</p>
          <Link
            href="/admin/audit-logs"
            className="text-xs text-blue-600 font-semibold underline"
          >
            View audit logs
          </Link>
        </div>
      </div>
    </div>
  );
}
