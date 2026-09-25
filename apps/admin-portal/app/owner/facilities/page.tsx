'use client';

import { useState } from 'react';

export default function OwnerFacilitiesPage() {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Lahore');
  const [rate, setRate] = useState('200');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">
            My Parking Facilities
          </h1>
          <p className="text-gray-500 text-sm">
            Manage facilities, zones, and slot capacity
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#1E6FFF] text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-600 transition text-sm"
        >
          + Add New Facility
        </button>
      </div>

      {/* Facilities List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0B1F3A]">Demo Plaza</h2>
            <span className="px-2.5 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-semibold">
              APPROVED
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Main Boulevard, Gulberg III, Lahore
          </p>
          <div className="pt-2 border-t flex justify-between text-sm">
            <span>
              Rate: <strong>PKR 200/h</strong>
            </span>
            <span>
              Capacity: <strong>20 Slots (Zones AB, CD)</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full space-y-4">
            <h2 className="text-xl font-bold text-[#0B1F3A]">
              Create Facility
            </h2>
            <input
              type="text"
              placeholder="Facility Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-sm"
            />
            <input
              type="number"
              placeholder="Hourly Rate (PKR)"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-sm"
            />
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm bg-[#1E6FFF] text-white font-semibold rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
