'use client';

import { useState } from 'react';

export default function OwnerApprovalsPage() {
  const [owners, setOwners] = useState([
    {
      id: '1',
      name: 'Demo Parking Solutions',
      owner: 'Plaza Owner',
      phone: '+923007654321',
      status: 'PENDING',
    },
  ]);

  const handleApprove = (id: string) => {
    setOwners((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'APPROVED' } : o)),
    );
  };

  const handleReject = (id: string) => {
    setOwners((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'REJECTED' } : o)),
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0B1F3A]">
        Owner Application Approvals
      </h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-3">Business Name</th>
              <th className="p-3">Owner</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {owners.map((o) => (
              <tr key={o.id}>
                <td className="p-3 font-semibold">{o.name}</td>
                <td className="p-3">{o.owner}</td>
                <td className="p-3 font-mono">{o.phone}</td>
                <td className="p-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${o.status === 'APPROVED' ? 'bg-teal-100 text-teal-800' : o.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="p-3 space-x-2">
                  {o.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleApprove(o.id)}
                        className="bg-teal-600 text-white px-3 py-1 rounded text-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(o.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-xs"
                      >
                        Reject
                      </button>
                    </>
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
