'use client';

import Link from 'next/link';

export function Navigation() {
  return (
    <nav className="bg-[#0B1F3A] text-white px-6 py-4 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-6">
        <Link
          href="/"
          className="font-bold text-xl tracking-tight text-[#1E6FFF]"
        >
          ParkSmart Portal
        </Link>
        <div className="flex space-x-4 text-sm font-medium">
          <Link
            href="/owner/dashboard"
            className="hover:text-[#1E6FFF] transition"
          >
            Owner Dashboard
          </Link>
          <Link
            href="/owner/facilities"
            className="hover:text-[#1E6FFF] transition"
          >
            Facilities & Slots
          </Link>
          <Link
            href="/owner/reservations"
            className="hover:text-[#1E6FFF] transition"
          >
            Reservations
          </Link>
          <Link
            href="/admin/dashboard"
            className="hover:text-[#1E6FFF] transition"
          >
            Admin Panel
          </Link>
          <Link
            href="/admin/audit-logs"
            className="hover:text-[#1E6FFF] transition"
          >
            Audit Logs
          </Link>
        </div>
      </div>
      <div className="flex items-center space-x-4 text-sm">
        <Link href="/settings" className="hover:underline">
          Settings
        </Link>
        <Link
          href="/login"
          className="bg-[#1E6FFF] px-3 py-1.5 rounded-md hover:bg-blue-600 transition"
        >
          Log In
        </Link>
      </div>
    </nav>
  );
}
