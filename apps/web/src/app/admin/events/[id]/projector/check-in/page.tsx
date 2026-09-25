'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { EventItem } from '../../../../../../types/event';
import { fetchEventById } from '../../../../../../lib/api';
import { formatEventDate, formatTimeRange } from '../../../../../../lib/formatters';
import { fetchProjectorSession, ActiveSessionData } from '../../../../../../lib/attendance-api';
import { QrCodeDisplay } from '../../../../../../components/display/QrCodeDisplay';

export default function CheckInProjectorDisplayPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [session, setSession] = useState<ActiveSessionData | null>(null);

  // Authenticate Admin
  useEffect(() => {
    const token = localStorage.getItem('admin_access_token');
    if (!token) {
      router.replace(`/admin/login?redirect=/admin/events/${id}/projector/check-in`);
    }
  }, [router, id]);

  const loadEventAndSession = useCallback(async () => {
    const token = localStorage.getItem('admin_access_token');
    if (!id || !token) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEventById(id);
      setEvent(data);
      
      const sessionData = await fetchProjectorSession(id, 'CHECK_IN', token);
      setSession(sessionData);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        localStorage.removeItem('admin_access_token');
        router.replace(`/admin/login?redirect=/admin/events/${id}/projector/check-in`);
      } else if (err.message === 'EVENT_NOT_FOUND') {
        setError('NOT_FOUND');
      } else {
        setError('ไม่สามารถโหลดข้อมูลกิจกรรมหรือเซสชันการแสดงผลได้');
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadEventAndSession();
  }, [loadEventAndSession]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8 animate-pulse">
        <div className="w-24 h-6 bg-slate-800 rounded-full mb-6" />
        <div className="w-3/4 max-w-2xl h-12 bg-slate-800 rounded-xl mb-4" />
        <div className="w-1/2 max-w-lg h-6 bg-slate-800/60 rounded mb-12" />
        <div className="w-80 h-80 bg-slate-900 rounded-3xl border border-slate-800" />
      </div>
    );
  }

  if (error === 'NOT_FOUND' || !event) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
        <h1 className="text-3xl font-extrabold text-slate-200">ไม่พบกิจกรรม</h1>
        <p className="text-slate-400 max-w-md">ไม่สามารถโหลดข้อมูลการแสดงผลกิจกรรมที่ร้องขอได้</p>
        <Link
          href="/admin"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
        >
          กลับสู่แผงควบคุม
        </Link>
      </div>
    );
  }

  const formattedLiveClock = currentTime.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Since time is checked by backend, we determine open state logically to match backend rules
  // CHECK_IN is event.startTime -> event.startTime + 30 mins
  const windowStart = new Date(event.startTime);
  const windowEnd = new Date(windowStart.getTime() + 30 * 60 * 1000);
  const isOpen = currentTime >= windowStart && currentTime <= windowEnd;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 select-none font-sans overflow-x-hidden">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 sm:pb-6">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-indigo-400">
            หน้าจอแสดงผลสำหรับโปรเจกเตอร์
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs sm:text-sm font-mono text-slate-300">
          <span className="text-slate-500 font-sans">เวลาปัจจุบัน</span>
          <span className="font-bold text-slate-100">{formattedLiveClock}</span>
        </div>
        <Link
          href={`/admin/events/${event.id}/attendance`}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-4"
        >
          ออกจากหน้าจอแสดงผล
        </Link>
      </header>

      <main className="my-auto py-8 flex flex-col items-center justify-center text-center space-y-8 sm:space-y-10">
        <div className="space-y-3 max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-100 tracking-tight leading-tight">
            {event.title}
          </h1>
          <p className="text-sm sm:text-lg text-slate-400 font-medium">
            {event.location} • {formatEventDate(event.date)} ({formatTimeRange(event.startTime, event.endTime)})
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 sm:gap-12">
          <div className="space-y-6 text-center md:text-left">
            {isOpen ? (
              <div className="inline-block px-6 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xl sm:text-3xl font-black uppercase tracking-widest shadow-lg">
                เปิดให้ลงชื่อเช็กอิน
              </div>
            ) : (
              <div className="inline-block px-6 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xl sm:text-3xl font-black uppercase tracking-widest shadow-lg">
                ขณะนี้ยังไม่อยู่ในช่วงเวลาเช็กอิน
              </div>
            )}
            <p className="text-slate-300">สแกน QR Code นี้เพื่อลงชื่อเช็กอิน</p>
          </div>
          
          {session && (
            <QrCodeDisplay
              sessionType="CHECK_IN"
              attendanceUrl={session.attendanceUrl}
            />
          )}
        </div>
      </main>
    </div>
  );
}

