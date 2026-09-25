'use client';

export default function UserManagementPage() {
  const users = [
    {
      name: 'System Admin',
      phone: '+923001234567',
      email: 'admin@parksmart.pk',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    {
      name: 'Plaza Owner',
      phone: '+923007654321',
      email: 'owner@demoplaza.pk',
      role: 'OWNER',
      status: 'ACTIVE',
    },
    {
      name: 'Demo Attendant',
      phone: '+923001112233',
      email: 'N/A',
      role: 'ATTENDANT',
      status: 'ACTIVE',
    },
    {
      name: 'Standard Driver',
      phone: '+923459998887',
      email: 'N/A',
      role: 'DRIVER',
      status: 'ACTIVE',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0B1F3A]">User Management</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {users.map((u, i) => (
              <tr key={i}>
                <td className="p-3 font-semibold">{u.name}</td>
                <td className="p-3 font-mono">{u.phone}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 bg-gray-100 font-medium rounded text-xs">
                    {u.role}
                  </span>
                </td>
                <td className="p-3">
                  <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                    {u.status}
                  </span>
                </td>
                <td className="p-3">
                  <button className="text-xs text-red-600 hover:underline">
                    Suspend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
