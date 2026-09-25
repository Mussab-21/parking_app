'use client';

import { useState } from 'react';

export default function AdminFacilitiesPage() {
  const [facilities, setFacilities] = useState([
    {
      id: '1',
      name: 'Demo Plaza',
      city: 'Lahore',
      address: 'Main Boulevard, Gulberg III',
      rate: 'PKR 200',
      status: 'APPROVED',
    },
    {
      id: '2',
      name: 'Gulberg Grand Plaza',
      city: 'Lahore',
      address: 'Main Gulberg, Lahore',
      rate: 'PKR 250',
      status: 'PENDING_APPROVAL',
    },
  ]);

  const handleSetStatus = (id: string, newStatus: string) => {
    setFacilities((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f)),
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0B1F3A]">
        Facility Oversight & Approvals
      </h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-3">Facility Name</th>
              <th className="p-3">City</th>
              <th className="p-3">Address</th>
              <th className="p-3">Hourly Rate</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {facilities.map((f) => (
              <tr key={f.id}>
                <td className="p-3 font-semibold">{f.name}</td>
                <td className="p-3">{f.city}</td>
                <td className="p-3 text-xs text-gray-500">{f.address}</td>
                <td className="p-3 font-medium">{f.rate}</td>
                <td className="p-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${f.status === 'APPROVED' ? 'bg-teal-100 text-teal-800' : f.status === 'SUSPENDED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}
                  >
                    {f.status}
                  </span>
                </td>
                <td className="p-3 space-x-2">
                  {f.status === 'PENDING_APPROVAL' && (
                    <button
                      onClick={() => handleSetStatus(f.id, 'APPROVED')}
                      className="bg-teal-600 text-white px-2.5 py-1 rounded text-xs"
                    >
                      Approve
                    </button>
                  )}
                  {f.status === 'APPROVED' && (
                    <button
                      onClick={() => handleSetStatus(f.id, 'SUSPENDED')}
                      className="bg-red-600 text-white px-2.5 py-1 rounded text-xs"
                    >
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
