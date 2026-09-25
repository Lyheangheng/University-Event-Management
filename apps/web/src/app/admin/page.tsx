'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EventItem } from '../../types/event';
import { fetchEvents, deleteEvent } from '../../lib/api';
import { formatEventDate, formatTimeRange, calculateEventStatus } from '../../lib/formatters';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AdminLayout } from '../../components/admin/AdminLayout';

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

  const handleDelete = async (id: string, title: string) => {
    if (!token) return;
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรม "${title}"? การดำเนินการนี้ไม่สามารถย้อนกลับได้`)) {
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
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-4 font-sans text-slate-600 text-xs">
        กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...
      </div>
    );
  }

  // Summary Metrics calculations
  const totalEvents = events.length;
  const upcomingEvents = events.filter((e) => calculateEventStatus(e.startTime, e.endTime) === 'UPCOMING').length;
  const ongoingEvents = events.filter((e) => calculateEventStatus(e.startTime, e.endTime) === 'ONGOING').length;
  const endedEvents = events.filter((e) => calculateEventStatus(e.startTime, e.endTime) === 'ENDED').length;

  const headerActions = (
    <>
      <button
        onClick={loadEvents}
        disabled={loading}
        className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
      >
        {loading ? 'กำลังรีเฟรช...' : 'รีเฟรช'}
      </button>
      <Link
        href="/admin/events/new"
        className="px-4 py-2 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs font-semibold transition-colors shadow-sm inline-flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        สร้างกิจกรรมใหม่
      </Link>
    </>
  );

  return (
    <AdminLayout
      title="แดชบอร์ด"
      subtitle="ศูนย์ควบคุมการจัดการกิจกรรมมหาวิทยาลัยและตรวจสอบการเข้าร่วม"
      actions={headerActions}
    >
      <div className="space-y-6">
        {/* Real Metrics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              กิจกรรมทั้งหมด
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{totalEvents}</div>
            <span className="text-[11px] text-slate-500 block">รายการกิจกรรมในระบบ</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              กิจกรรมที่กำลังจะมาถึง
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-blue-700">{upcomingEvents}</div>
            <span className="text-[11px] text-slate-500 block">รอดำเนินการตามกำหนดการ</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              กำลังดำเนินอยู่
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700">{ongoingEvents}</div>
            <span className="text-[11px] text-slate-500 block">เปิดระบบเช็กอิน/เช็กเอาต์</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              เสร็จสิ้นแล้ว
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-slate-600">{endedEvents}</div>
            <span className="text-[11px] text-slate-500 block">กิจกรรมที่สิ้นสุดแล้ว</span>
          </div>
        </div>

        {/* Events Table Container */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-4">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              รายการกิจกรรมมหาวิทยาลัย ({events.length})
            </h2>
            <Link
              href="/admin/events/new"
              className="text-xs font-semibold text-university-700 hover:text-university-800"
            >
              + เพิ่มกิจกรรม
            </Link>
          </div>

          {loading && events.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 animate-pulse space-y-2">
              <div className="w-6 h-6 border-2 border-university-700 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>กำลังโหลดรายการกิจกรรม...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center space-y-3 bg-red-50/50">
              <p className="text-xs text-red-700 font-semibold">{error}</p>
              <button
                onClick={loadEvents}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="p-10 text-center space-y-3 text-slate-600">
              <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">ยังไม่มีรายการกิจกรรมในขณะนี้</p>
                <p className="text-xs text-slate-500">เริ่มต้นโดยการสร้างกิจกรรมใหม่สำหรับมหาวิทยาลัย</p>
              </div>
              <Link
                href="/admin/events/new"
                className="inline-block px-4 py-2 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                + สร้างกิจกรรมใหม่
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop High Information Density Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="p-3.5 pl-5">ชื่อกิจกรรม</th>
                      <th className="p-3.5">วันเวลา</th>
                      <th className="p-3.5">สถานที่</th>
                      <th className="p-3.5">กลุ่มเป้าหมาย</th>
                      <th className="p-3.5">สถานะ</th>
                      <th className="p-3.5 pr-5 text-right">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {events.map((event) => {
                      const status = calculateEventStatus(event.startTime, event.endTime);
                      return (
                        <tr key={event.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 pl-5">
                            <span className="font-bold text-slate-900 block text-xs sm:text-sm">{event.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {event.id}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-medium text-slate-800 block">{formatEventDate(event.date)}</span>
                            <span className="text-[11px] text-slate-500 block">{formatTimeRange(event.startTime, event.endTime)}</span>
                          </td>
                          <td className="p-3.5 text-slate-700">{event.location}</td>
                          <td className="p-3.5 text-slate-600">{event.targetGroup || 'นักศึกษาทุกชั้นปี'}</td>
                          <td className="p-3.5">
                            <StatusBadge variant={status as any} />
                          </td>
                          <td className="p-3.5 pr-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/admin/events/${event.id}/edit`}
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors shadow-sm"
                              >
                                แก้ไข
                              </Link>

                              <Link
                                href={`/admin/events/${event.id}/attendance`}
                                className="px-2.5 py-1.5 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs font-semibold transition-colors shadow-sm"
                              >
                                ข้อมูลการเข้าร่วม
                              </Link>

                              <Link
                                href={`/admin/events/${event.id}/projector/check-in`}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-colors"
                              >
                                QR เช็กอิน
                              </Link>

                              <Link
                                href={`/admin/events/${event.id}/projector/check-out`}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold transition-colors"
                              >
                                QR เช็กเอาต์
                              </Link>

                              <button
                                onClick={() => handleDelete(event.id, event.title)}
                                disabled={deletingId === event.id}
                                className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                {deletingId === event.id ? 'กำลังลบ...' : 'ลบ'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-slate-200">
                {events.map((event) => {
                  const status = calculateEventStatus(event.startTime, event.endTime);
                  return (
                    <div key={event.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <StatusBadge variant={status as any} />
                          <h3 className="text-sm font-bold text-slate-900 mt-1.5">{event.title}</h3>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div><strong>สถานที่:</strong> {event.location}</div>
                        <div><strong>วันที่:</strong> {formatEventDate(event.date)} ({formatTimeRange(event.startTime, event.endTime)})</div>
                        <div><strong>กลุ่มเป้าหมาย:</strong> {event.targetGroup || 'นักศึกษาทุกชั้นปี'}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <Link
                          href={`/admin/events/${event.id}/edit`}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold"
                        >
                          แก้ไข
                        </Link>
                        <Link
                          href={`/admin/events/${event.id}/attendance`}
                          className="px-2.5 py-1.5 rounded-lg bg-university-700 text-white text-xs font-semibold"
                        >
                          ข้อมูลการเข้าร่วม
                        </Link>
                        <Link
                          href={`/admin/events/${event.id}/projector/check-in`}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold"
                        >
                          QR เช็กอิน
                        </Link>
                        <Link
                          href={`/admin/events/${event.id}/projector/check-out`}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold"
                        >
                          QR เช็กเอาต์
                        </Link>
                        <button
                          onClick={() => handleDelete(event.id, event.title)}
                          disabled={deletingId === event.id}
                          className="px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
