'use client';

import { useState } from 'react';

export default function PricingPage() {
  const [ratePkr, setRatePkr] = useState('200');
  const [msg, setMsg] = useState('');

  const handleUpdateRate = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(`Hourly rate updated to PKR ${ratePkr}/hour (20,000 paisa)`);
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-[#0B1F3A]">
        Configure Hourly Pricing
      </h1>
      <p className="text-gray-500 text-sm mt-1">
        Set rates per hour (must be within admin bounds PKR 50 - PKR 1,000)
      </p>

      {msg && (
        <div className="mt-4 p-3 bg-teal-50 text-teal-800 text-sm rounded-lg">
          {msg}
        </div>
      )}

      <form onSubmit={handleUpdateRate} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Hourly Rate (PKR)
          </label>
          <input
            type="number"
            required
            min={50}
            max={1000}
            value={ratePkr}
            onChange={(e) => setRatePkr(e.target.value)}
            className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#1E6FFF] text-white py-2.5 rounded-lg font-semibold hover:bg-blue-600 transition"
        >
          Update Pricing
        </button>
      </form>
    </div>
  );
}
