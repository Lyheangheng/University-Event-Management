'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminLogin } from '../../../lib/attendance-api';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect') || '/admin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect immediately
  useEffect(() => {
    const existingToken = localStorage.getItem('admin_access_token');
    if (existingToken) {
      router.replace(redirectUrl);
    }
  }, [router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await adminLogin(username, password);
      if (res && res.accessToken) {
        localStorage.setItem('admin_access_token', res.accessToken);
        router.push(redirectUrl);
      } else {
        throw new Error('ไม่ได้รับสิทธิ์การเข้าใช้งาน: ไม่พบรหัสผ่านสำหรับการยืนยันตัวตน');
      }
    } catch (err: any) {
      setError('ชื่อผู้ใช้งานหรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-slate-900 flex flex-col items-center justify-center p-4 font-sans select-none">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Institutional Identity Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-xl bg-university-50 border border-university-200/60 flex items-center justify-center text-university-800">
            <svg className="w-7 h-7 text-university-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              เข้าสู่ระบบผู้ดูแลระบบ
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
              ระบบบริหารจัดการกิจกรรมและตรวจสอบการเข้าร่วม
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs text-center font-medium flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="กรอกชื่อผู้ใช้งานผู้ดูแลระบบ"
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-university-700 focus:ring-1 focus:ring-university-700 transition-colors placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              รหัสผ่าน (Password)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่าน"
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-university-700 focus:ring-1 focus:ring-university-700 transition-colors placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-5 rounded-lg bg-university-700 hover:bg-university-800 text-white font-semibold text-xs sm:text-sm tracking-wide transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'กำลังยืนยันตัวตน...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* Footer Navigation Links */}
        <div className="text-center pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <Link
            href="/events"
            className="hover:text-slate-900 hover:underline transition-colors"
          >
            ← รายการกิจกรรมนักศึกษา
          </Link>
          <Link
            href="/"
            className="hover:text-slate-900 hover:underline transition-colors"
          >
            หน้าหลักระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-4 font-sans text-slate-600 text-xs">
          กำลังโหลดหน้าระบบผู้ดูแลระบบ...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
