'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { EventItem } from '../../../../../../types/event';
import { fetchEventById } from '../../../../../../lib/api';
import { formatEventDate, formatTimeRange } from '../../../../../../lib/formatters';
import { fetchProjectorSession, ActiveSessionData } from '../../../../../../lib/attendance-api';
import { QrCodeDisplay } from '../../../../../../components/display/QrCodeDisplay';

export default function CheckOutProjectorDisplayPage() {
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
      router.replace(`/admin/login?redirect=/admin/events/${id}/projector/check-out`);
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
      
      const sessionData = await fetchProjectorSession(id, 'CHECK_OUT', token);
      setSession(sessionData);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        localStorage.removeItem('admin_access_token');
        router.replace(`/admin/login?redirect=/admin/events/${id}/projector/check-out`);
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
      <div className="min-h-screen bg-[#F7F7F5] text-slate-800 flex flex-col items-center justify-center p-8 animate-pulse font-sans">
        <div className="w-12 h-12 rounded-full border-4 border-university-700 border-t-transparent animate-spin mb-4" />
        <div className="text-sm font-semibold text-slate-600">กำลังโหลดหน้าจอแสดงผลโปรเจกเตอร์...</div>
      </div>
    );
  }

  if (error === 'NOT_FOUND' || !event) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] text-slate-900 flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
        <h1 className="text-2xl font-bold text-slate-900">ไม่พบข้อมูลกิจกรรม</h1>
        <p className="text-slate-600 max-w-md text-xs sm:text-sm">ไม่สามารถโหลดข้อมูลการแสดงผลกิจกรรมที่ร้องขอได้</p>
        <Link
          href="/admin"
          className="px-4 py-2 rounded-lg bg-university-700 hover:bg-university-800 text-white font-semibold text-xs transition-colors shadow-sm"
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

  const eventEndTime = new Date(event.endTime);
  const windowStart = new Date(eventEndTime.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(eventEndTime.getTime() + 30 * 60 * 1000);
  const isOpen = currentTime >= windowStart && currentTime <= windowEnd;

  const formattedWindowStart = windowStart.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const formattedWindowEnd = windowEnd.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none font-sans">
      {/* Top Identity & Live Clock Header Bar */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 px-6 py-3.5 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-university-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
            มธ
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 block leading-tight">
              หน้าจอแสดงผลสำหรับสถานที่จัดงาน (Projector Display)
            </span>
            <span className="text-[11px] text-slate-500 block">ระบบลงชื่อเข้าร่วมกิจกรรมมหาวิทยาลัย</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs sm:text-sm font-mono text-slate-800">
          <span className="text-slate-500 font-sans">เวลาปัจจุบัน:</span>
          <span className="font-bold text-slate-900">{formattedLiveClock} น.</span>
        </div>

        <Link
          href={`/admin/events/${event.id}/attendance`}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          ← ออกจากหน้าจอแสดงผล
        </Link>
      </header>

      {/* Main Auditorium QR Display Content */}
      <main className="my-auto py-6 flex flex-col items-center justify-center text-center space-y-6">
        {/* Event Title Header */}
        <div className="space-y-2 max-w-4xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            เช็กชื่อออกจากกิจกรรม (CHECK-OUT)
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {event.title}
          </h1>
          <p className="text-xs sm:text-base text-slate-600 font-medium">
            สถานที่: <strong>{event.location}</strong> • วันที่: <strong>{formatEventDate(event.date)}</strong> ({formatTimeRange(event.startTime, event.endTime)})
          </p>
        </div>

        {/* Central Focal QR Section */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 max-w-5xl w-full mx-auto px-4">
          {/* Status & Timing Sidebar / Instruction Block */}
          <div className="space-y-5 text-center lg:text-left max-w-sm">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">สถานะระบบลงชื่อ</span>
              {isOpen ? (
                <div className="inline-block px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-lg sm:text-2xl font-bold uppercase tracking-wide">
                  เปิดรับลงชื่อเช็กเอาต์
                </div>
              ) : (
                <div className="inline-block px-4 py-2 rounded-lg bg-[#F7F7F5] border border-slate-300 text-slate-700 text-lg sm:text-2xl font-bold uppercase tracking-wide">
                  ยังไม่อยู่ในช่วงเวลาเช็กเอาต์
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-1.5 shadow-sm">
              <span className="font-bold text-slate-900 block">กำหนดการเปิดระบบเช็กเอาต์:</span>
              <p className="text-slate-600 font-mono text-sm font-bold">
                {formattedWindowStart} – {formattedWindowEnd} น.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                เปิดระบบช่วงท้ายกิจกรรม (ก่อนเวลาสิ้นสุด 30 นาที ถึงหลังเวลาสิ้นสุด 30 นาที)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 block">คำแนะนำสำหรับนักศึกษา:</span>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                <li>สแกน QR Code ด้วยแอปพลิเคชัน LINE</li>
                <li>แนบรูปภาพหลักฐานการเข้าร่วม ณ สถานที่จัดงาน</li>
                <li>กดส่งข้อมูลเพื่อบันทึกการเช็กเอาต์สมบูรณ์</li>
              </ol>
            </div>
          </div>

          {/* LARGE FOCAL QR CODE */}
          {session && (
            <div className="shrink-0">
              <QrCodeDisplay
                sessionType="CHECK_OUT"
                attendanceUrl={session.attendanceUrl}
                size={320}
              />
            </div>
          )}
        </div>
      </main>

      {/* Subtle Bottom Institutional Footer */}
      <footer className="text-center text-xs text-slate-500 border-t border-slate-200 pt-3">
        ระบบบริหารจัดการกิจกรรมและตรวจสอบการเข้าร่วม — มหาวิทยาลัย
      </footer>
    </div>
  );
}
