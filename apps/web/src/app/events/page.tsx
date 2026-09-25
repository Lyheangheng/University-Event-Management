'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { EventItem } from '../../types/event';
import { fetchEvents } from '../../lib/api';
import { EventCard } from '../../components/EventCard';
import { SkeletonCard } from '../../components/SkeletonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch (err: any) {
      setError('ไม่สามารถโหลดข้อมูลกิจกรรมได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8 font-sans">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-university-50 border border-university-200/60 text-university-800 text-xs font-semibold uppercase tracking-wider mb-2">
            พอร์ตัลนักศึกษา
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            กิจกรรมมหาวิทยาลัย
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            เลือกดูรายการกิจกรรมมหาวิทยาลัยที่กำลังจะมาถึง ดำเนินอยู่ และสิ้นสุดแล้ว
          </p>
        </div>

        <Link
          href="/"
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          หน้าแรก
        </Link>
      </header>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorState title="ไม่สามารถโหลดข้อมูลกิจกรรมได้" message={error} onRetry={loadEvents} />
      ) : events.length === 0 ? (
        <EmptyState
          title="ยังไม่มีกิจกรรมในขณะนี้"
          description="กรุณากลับมาร่วมตรวจสอบกิจกรรมใหม่ของมหาวิทยาลัยอีกครั้งในภายหลัง"
        />
      ) : (
        /* Event Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
