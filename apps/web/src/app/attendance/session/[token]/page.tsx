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
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-pulse select-none space-y-4 font-sans">
        <div className="w-12 h-12 rounded-full border-4 border-university-700 border-t-transparent animate-spin" />
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-slate-800">กำลังตรวจสอบรอบการลงชื่อ...</h2>
          <p className="text-xs text-slate-500">กรุณารอสักครู่ขณะระบบกำลังตรวจสอบ QR Code</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 select-none font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-bold">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900">
              รอบการลงชื่อเข้าร่วมกิจกรรมไม่ถูกต้อง
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm">
              {error || 'รหัส QR Code นี้ไม่สามารถใช้งานได้ในขณะนี้'}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/events"
              className="inline-block w-full py-2.5 px-5 rounded-lg bg-university-700 hover:bg-university-800 text-white font-semibold text-xs sm:text-sm transition-colors shadow-sm"
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
      <div className="min-h-[80vh] flex items-center justify-center p-4 select-none font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900">
              {sessionData.sessionType === 'CHECK_IN' ? 'ขณะนี้ปิดการลงชื่อเข้าร่วมกิจกรรม (เช็กอิน)' : 'ขณะนี้ปิดการลงชื่อออกจากกิจกรรม (เช็กเอาต์)'}
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm">
              กรุณารอจนกว่าจะถึงช่วงเวลาลงชื่อเข้าร่วม หรือตรวจสอบกำหนดการกิจกรรม
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={`/events/${sessionData.eventId}`}
              className="inline-block w-full py-2.5 px-5 rounded-lg bg-university-700 hover:bg-university-800 text-white font-semibold text-xs sm:text-sm transition-colors shadow-sm"
            >
              ดูรายละเอียดกิจกรรม
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 py-8">
      <StudentAttendanceForm sessionData={sessionData} />
    </div>
  );
}
