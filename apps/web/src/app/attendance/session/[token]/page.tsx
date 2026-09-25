'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchSessionByToken, SessionValidationData } from '../../../../lib/attendance-api';
import { StudentAttendanceForm } from '../../../../components/attendance/StudentAttendanceForm';

export default function AttendanceSessionPage() {
  const params = useParams();
  const token = params?.token as string;

  const [sessionData, setSessionData] = useState<SessionValidationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const validateToken = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSessionByToken(token);
      setSessionData(data);
    } catch (err: any) {
      if (err.message === 'SESSION_NOT_FOUND') {
        setError('ไม่พบรหัสรอบการลงชื่อหรือ QR Code ไม่ถูกต้อง');
      } else if (err.message === 'SESSION_EXPIRED') {
        setError('หมดเวลาสำหรับการลงชื่อเข้าร่วม หรือยังไม่ถึงช่วงเวลาลงชื่อ');
      } else {
        console.error('Session validation error:', err);
        setError('ไม่สามารถตรวจสอบรอบการลงชื่อได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 animate-pulse select-none space-y-4 font-sans">
        <div className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center animate-spin">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-400 border-t-transparent" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-slate-200">กำลังตรวจสอบรอบการลงชื่อ...</h2>
          <p className="text-sm text-slate-400">กรุณารอสักครู่ขณะระบบกำลังตรวจสอบ QR Code</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 select-none font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl font-bold">
            ✕
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-100">
              รอบการลงชื่อเข้าร่วมกิจกรรมไม่ถูกต้อง
            </h1>
            <p className="text-slate-400 text-sm">
              {error || 'รหัส QR Code นี้ไม่สามารถใช้งานได้ในขณะนี้'}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/events"
              className="inline-block w-full py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all"
            >
              กลับไปยังรายการกิจกรรม
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionData.isValid) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 select-none font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-bold">
            ⏳
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-100">
              {sessionData.sessionType === 'CHECK_IN' ? 'ขณะนี้ปิดการลงชื่อเข้าร่วมกิจกรรม (เช็กอิน)' : 'ขณะนี้ปิดการลงชื่อออกจากกิจกรรม (เช็กเอาต์)'}
            </h1>
            <p className="text-slate-400 text-sm">
              กรุณารอจนกว่าจะถึงช่วงเวลาลงชื่อเข้าร่วม หรือตรวจสอบกำหนดการกิจกรรม
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={`/events/${sessionData.eventId}`}
              className="inline-block w-full py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all"
            >
              ดูรายละเอียดกิจกรรม
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 py-12">
      <StudentAttendanceForm sessionData={sessionData} />
    </div>
  );
}
