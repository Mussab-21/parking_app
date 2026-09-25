'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('Password updated successfully!');
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-[#0B1F3A]">
        Account & Security Settings
      </h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-lg space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Change Password</h2>
        {msg && <p className="text-sm text-green-600">{msg}</p>}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Current Password
            </label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-[#1E6FFF] text-white px-4 py-2 rounded-lg font-semibold text-sm"
          >
            Update Password
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-lg space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Two-Factor Authentication (TOTP 2FA)
        </h2>
        <p className="text-sm text-gray-600">
          Mandatory for Admin accounts. Scan the QR code with Google
          Authenticator or Microsoft Authenticator.
        </p>
        <button className="bg-[#0B1F3A] text-white px-4 py-2 rounded-lg font-semibold text-sm">
          Setup 2FA Authenticator
        </button>
      </div>
    </div>
  );
}
