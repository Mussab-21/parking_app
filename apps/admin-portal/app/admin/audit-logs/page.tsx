'use client';

import { useState } from 'react';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);

  const logs = [
    {
      id: '1',
      action: 'FACILITY_APPROVED',
      entity: 'FACILITY',
      entityId: 'fac-101',
      actor: 'System Admin',
      time: '2026-09-22 12:00:00',
    },
    {
      id: '2',
      action: 'OWNER_APPLICATION_APPROVED',
      entity: 'OWNER_PROFILE',
      entityId: 'own-202',
      actor: 'System Admin',
      time: '2026-09-22 11:45:00',
    },
    {
      id: '3',
      action: 'SYSTEM_SETTING_UPDATED',
      entity: 'SETTING',
      entityId: 'hold_minutes',
      actor: 'System Admin',
      time: '2026-09-22 10:15:00',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">
            Audit Logs Explorer
          </h1>
          <p className="text-gray-500 text-sm">
            Append-only audit trail for all system and owner operations
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Action</th>
              <th className="p-3">Entity Type</th>
              <th className="p-3">Entity ID</th>
              <th className="p-3">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="p-3 font-mono text-xs text-gray-500">
                  {l.time}
                </td>
                <td className="p-3 font-semibold text-blue-800">{l.action}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                    {l.entity}
                  </span>
                </td>
                <td className="p-3 font-mono text-xs">{l.entityId}</td>
                <td className="p-3">{l.actor}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Server-Side Pagination Controls */}
        <div className="mt-6 flex items-center justify-between border-t pt-4 text-sm text-gray-600">
          <span>Showing Page {page} of 18</span>
          <div className="space-x-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
