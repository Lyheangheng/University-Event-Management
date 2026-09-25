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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans select-none">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-2xl font-bold">
            🔒
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            ระบบผู้ดูแลระบบ
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            เข้าสู่ระบบเพื่อจัดการกิจกรรมและตรวจสอบข้อมูลการเข้าร่วมของนักศึกษา
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              ชื่อผู้ใช้งาน
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="กรอกชื่อผู้ใช้งานผู้ดูแลระบบ"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              รหัสผ่าน
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่าน"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {loading ? 'กำลังยืนยันตัวตน...' : 'เข้าสู่ระบบผู้ดูแลระบบ'}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="text-center pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <Link
            href="/events"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← หน้าแรกรายการกิจกรรม
          </Link>
          <Link
            href="/"
            className="text-slate-400 hover:text-slate-200 transition-colors"
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
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="text-slate-400 text-sm">กำลังโหลดหน้าระบบผู้ดูแลระบบ...</div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
