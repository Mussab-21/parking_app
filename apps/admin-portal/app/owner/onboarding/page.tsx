'use client';

import { useState } from 'react';

export default function OnboardingWizard() {
  const [businessName, setBusinessName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-[#0B1F3A]">
        Owner Onboarding Wizard
      </h1>
      <p className="text-gray-500 text-sm mt-1">
        Submit your business profile and verification documents for Admin review
      </p>

      {submitted ? (
        <div className="mt-8 p-6 bg-teal-50 border border-teal-200 rounded-xl text-center text-teal-800">
          <h2 className="text-lg font-bold">Application Submitted!</h2>
          <p className="mt-2 text-sm">
            Your owner verification request has been sent to System
            Administrators. You will be notified upon approval.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Business / Enterprise Name
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="Lahore Parking Solutions Ltd."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              NTN / Tax Registration Number
            </label>
            <input
              type="text"
              required
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="1234567-8"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Upload Business License / CNIC Proof
            </label>
            <input
              type="file"
              className="mt-1 w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#1E6FFF] text-white py-2.5 rounded-lg font-semibold hover:bg-blue-600 transition"
          >
            Submit Application
          </button>
        </form>
      )}
    </div>
  );
}
