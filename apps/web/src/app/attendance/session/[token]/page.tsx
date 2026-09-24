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
        setError('Session token not found or invalid.');
      } else if (err.message === 'SESSION_EXPIRED') {
        setError('Attendance session has expired or is not yet active.');
      } else {
        console.error('Session validation error:', err);
        setError('Unable to validate attendance session. Please check your connection and try again.');
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 animate-pulse select-none space-y-4">
        <div className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center animate-spin">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-400 border-t-transparent" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-slate-200">Verifying session...</h2>
          <p className="text-sm text-slate-400">Please wait while we validate your QR code.</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl font-bold">
            ✕
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-100">
              Attendance Session Invalid
            </h1>
            <p className="text-slate-400 text-sm">
              {error || 'This QR session code is no longer active.'}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/events"
              className="inline-block w-full py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all"
            >
              Return to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionData.isValid) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-bold">
            ⏳
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-100">
              {sessionData.sessionType === 'CHECK_IN' ? 'Check-in is currently closed.' : 'Check-out is currently closed.'}
            </h1>
            <p className="text-slate-400 text-sm">
              Please wait until the attendance window opens or check the event schedule.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={`/events/${sessionData.eventId}`}
              className="inline-block w-full py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all"
            >
              View Event Details
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
