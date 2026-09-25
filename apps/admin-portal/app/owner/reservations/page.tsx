'use client';

import { useState } from 'react';

export default function ReservationsPage() {
  const [filter, setFilter] = useState('ALL');

  const reservations = [
    {
      ref: 'PB-3A9F-201',
      slot: 'AB-1',
      plate: 'LEA-1234',
      amount: 'PKR 400',
      status: 'CONFIRMED',
    },
    {
      ref: 'PB-8B1C-104',
      slot: 'AB-2',
      plate: 'PAY-555',
      amount: 'PKR 200',
      status: 'CHECKED_IN',
    },
    {
      ref: 'PB-2D4E-902',
      slot: 'CD-1',
      plate: 'ICT-789',
      amount: 'PKR 600',
      status: 'COMPLETED',
    },
  ];

  const exportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Reference,Slot,Plate,Amount,Status\n' +
      reservations
        .map((r) => `${r.ref},${r.slot},${r.plate},${r.amount},${r.status}`)
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'reservations_report.csv');
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">
            Reservations & Bookings
          </h1>
          <p className="text-gray-500 text-sm">
            Filter, monitor, and export reservation history
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="bg-[#0B1F3A] text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-slate-800 transition text-sm flex items-center space-x-2"
        >
          <span>Export CSV</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === 'ALL' ? 'bg-[#1E6FFF] text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('CONFIRMED')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === 'CONFIRMED' ? 'bg-[#1E6FFF] text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Confirmed
          </button>
          <button
            onClick={() => setFilter('CHECKED_IN')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === 'CHECKED_IN' ? 'bg-[#1E6FFF] text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Checked In
          </button>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-3">Reference</th>
              <th className="p-3">Slot</th>
              <th className="p-3">Plate</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {reservations.map((r, i) => (
              <tr key={i}>
                <td className="p-3 font-mono font-medium">{r.ref}</td>
                <td className="p-3">{r.slot}</td>
                <td className="p-3 font-semibold">{r.plate}</td>
                <td className="p-3">{r.amount}</td>
                <td className="p-3">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
