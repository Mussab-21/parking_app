'use client';

import { useState } from 'react';

export default function SystemSettingsPage() {
  const [holdMinutes, setHoldMinutes] = useState('10');
  const [entryGraceMinutes, setEntryGraceMinutes] = useState('15');
  const [noShowGraceMinutes, setNoShowGraceMinutes] = useState('30');
  const [minRatePaisa, setMinRatePaisa] = useState('5000');
  const [maxRatePaisa, setMaxRatePaisa] = useState('100000');
  const [msg, setMsg] = useState('');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('System settings updated successfully.');
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-[#0B1F3A]">
        System Parameter Settings
      </h1>
      <p className="text-gray-500 text-sm mt-1">
        Configure platform hold durations, grace periods, and rate bounds
      </p>

      {msg && (
        <div className="mt-4 p-3 bg-teal-50 text-teal-800 text-sm rounded-lg">
          {msg}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Booking Hold Expiry Duration (Minutes)
          </label>
          <input
            type="number"
            required
            value={holdMinutes}
            onChange={(e) => setHoldMinutes(e.target.value)}
            className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Early Entry Window Grace (Minutes before start)
          </label>
          <input
            type="number"
            required
            value={entryGraceMinutes}
            onChange={(e) => setEntryGraceMinutes(e.target.value)}
            className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            No-Show Expiry Grace (Minutes after start)
          </label>
          <input
            type="number"
            required
            value={noShowGraceMinutes}
            onChange={(e) => setNoShowGraceMinutes(e.target.value)}
            className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Min Rate Bound (Paisa)
            </label>
            <input
              type="number"
              required
              value={minRatePaisa}
              onChange={(e) => setMinRatePaisa(e.target.value)}
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Rate Bound (Paisa)
            </label>
            <input
              type="number"
              required
              value={maxRatePaisa}
              onChange={(e) => setMaxRatePaisa(e.target.value)}
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[#0B1F3A] text-white py-2.5 rounded-lg font-semibold hover:bg-slate-800 transition"
        >
          Save Settings
        </button>
      </form>
    </div>
  );
}
