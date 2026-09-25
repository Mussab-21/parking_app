'use client';

import { useState } from 'react';

export default function StaffManagementPage() {
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');

  const handleAssignAttendant = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(`Assigned attendant (${phone}) to Demo Plaza`);
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-[#0B1F3A]">
        Facility Staff & Attendants
      </h1>
      <p className="text-gray-500 text-sm mt-1">
        Assign attendants to scan QR tickets at your facility
      </p>

      {msg && (
        <div className="mt-4 p-3 bg-teal-50 text-teal-800 text-sm rounded-lg">
          {msg}
        </div>
      )}

      <form onSubmit={handleAssignAttendant} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Attendant Phone Number (+92)
          </label>
          <input
            type="text"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
            placeholder="+923001112223"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#1E6FFF] text-white py-2.5 rounded-lg font-semibold hover:bg-blue-600 transition"
        >
          Assign Attendant
        </button>
      </form>
    </div>
  );
}
