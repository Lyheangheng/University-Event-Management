'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EventItem } from '../../types/event';
import { fetchEvents, deleteEvent } from '../../lib/api';
import { formatEventDate, formatTimeRange, calculateEventStatus } from '../../lib/formatters';
import { StatusBadge } from '../../components/ui/StatusBadge';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Auth verification
  useEffect(() => {
    const storedToken = localStorage.getItem('admin_access_token');
    if (!storedToken) {
      router.replace('/admin/login');
    } else {
      setToken(storedToken);
    }
  }, [router]);

  // Load events
  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดรายการกิจกรรมได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadEvents();
    }
  }, [token, loadEvents]);

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token');
    router.push('/admin/login');
  };

  const handleDelete = async (id: string, title: string) => {
    if (!token) return;
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรม "${title}"? การดำเนินการนี้ไม่สามารถยกเลิกได้`)) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteEvent(id, token);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        localStorage.removeItem('admin_access_token');
        router.replace('/admin/login');
      } else {
        alert(err.message || 'ไม่สามารถลบกิจกรรมได้');
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
        <div className="text-slate-400 text-sm font-medium animate-pulse">
          กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8 font-sans select-none">
      {/* Header Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-widest">
              ระบบผู้ดูแลระบบ
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-100 tracking-tight">
            ศูนย์ควบคุมการจัดการกิจกรรม
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            สร้าง แก้ไข และตรวจสอบกิจกรรมมหาวิทยาลัย เปิดหน้าจอ QR Code สำหรับสถานที่จัดงาน และจัดการข้อมูลการเข้าร่วมกิจกรรม
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/events/new"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
          >
            <span>+</span> สร้างกิจกรรมใหม่
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs sm:text-sm font-bold transition-all"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* Events List */}
      <main className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-200">
            รายการกิจกรรมมหาวิทยาลัย ({events.length})
          </h2>
          <button
            onClick={loadEvents}
            disabled={loading}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            รีเฟรชรายการ
          </button>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 bg-slate-800/60 rounded-2xl" />
            <div className="h-28 bg-slate-800/60 rounded-2xl" />
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
            <p className="text-rose-400 text-sm font-semibold">{error}</p>
            <button
              onClick={loadEvents}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200"
            >
              ลองอีกครั้ง
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 text-slate-400 space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-indigo-400 text-xl">
              📅
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-300">ไม่พบรายการกิจกรรม</p>
              <p className="text-xs">เริ่มต้นโดยการสร้างกิจกรรมใหม่สำหรับมหาวิทยาลัย</p>
            </div>
            <Link
              href="/admin/events/new"
              className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
            >
              + สร้างกิจกรรมใหม่
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {events.map((event) => {
              const status = calculateEventStatus(event.startTime, event.endTime);
              return (
                <div
                  key={event.id}
                  className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant={status as any} />
                      <span className="text-xs text-slate-500 font-mono">ID: {event.id}</span>
                      <span className="text-xs text-slate-500">• กลุ่มเป้าหมาย: {event.targetGroup || 'นักศึกษาทุกชั้นปี'}</span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-100">
                      {event.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-400">
                      📍 {event.location} • 📅 {formatEventDate(event.date)} ({formatTimeRange(event.startTime, event.endTime)})
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/events/${event.id}/edit`}
                      className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold transition-all"
                    >
                      ✏️ แก้ไข
                    </Link>

                    <Link
                      href={`/admin/events/${event.id}/attendance`}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
                    >
                      📋 ข้อมูลการเข้าร่วม
                    </Link>

                    <Link
                      href={`/admin/events/${event.id}/projector/check-in`}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all"
                    >
                      📺 หน้าจอ QR เช็กอิน
                    </Link>

                    <Link
                      href={`/admin/events/${event.id}/projector/check-out`}
                      className="px-3.5 py-2 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all"
                    >
                      📺 หน้าจอ QR เช็กเอาต์
                    </Link>

                    <button
                      onClick={() => handleDelete(event.id, event.title)}
                      disabled={deletingId === event.id}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all disabled:opacity-50"
                      title="ลบกิจกรรม"
                    >
                      {deletingId === event.id ? 'กำลังลบ...' : '🗑️'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
