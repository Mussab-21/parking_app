'use client';

import { useState } from 'react';

export default function BulkSlotsPage() {
  const [prefix, setPrefix] = useState('AB');
  const [count, setCount] = useState(10);
  const [createdMsg, setCreatedMsg] = useState('');

  const handleBulkCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreatedMsg(
      `Successfully generated ${count} slots with prefix ${prefix} (${prefix}-1 to ${prefix}-${count})`,
    );
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-[#0B1F3A]">
        Bulk Slot Inventory Generator
      </h1>
      <p className="text-gray-500 text-sm mt-1">
        Generate sequential parking slots for your facility zones (e.g. AB-1 to
        AB-20)
      </p>

      {createdMsg && (
        <div className="mt-4 p-3 bg-teal-50 border border-teal-200 text-teal-800 text-sm rounded-lg">
          {createdMsg}
        </div>
      )}

      <form onSubmit={handleBulkCreate} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Slot Code Prefix
          </label>
          <input
            type="text"
            required
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
            className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono"
            placeholder="AB"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Number of Slots to Create
          </label>
          <input
            type="number"
            required
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#1E6FFF] text-white py-2.5 rounded-lg font-semibold hover:bg-blue-600 transition"
        >
          Generate Slots
        </button>
      </form>
    </div>
  );
}
