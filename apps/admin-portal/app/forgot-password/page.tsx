'use client';

import { useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE_URL}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'PASSWORD_RESET' }),
      });
      setStep(2);
      setMsg('OTP code sent to your phone');
    } catch {
      setMsg('Failed to send OTP');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, newPassword }),
      });

      if (res.ok) {
        setMsg('Password reset successful! You can now log in.');
      } else {
        setMsg('Reset failed. Check OTP code.');
      }
    } catch {
      setMsg('Reset error');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-[#0B1F3A]">Reset Password</h1>
      {msg && <p className="mt-2 text-sm text-blue-600">{msg}</p>}

      {step === 1 ? (
        <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone Number (+92)
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="+923001234567"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#1E6FFF] text-white py-2.5 rounded-lg font-semibold"
          >
            Send Reset OTP
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              6-Digit OTP Code
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Password (min 10 chars)
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
            className="w-full bg-[#1E6FFF] text-white py-2.5 rounded-lg font-semibold"
          >
            Reset Password
          </button>
        </form>
      )}
    </div>
  );
}
