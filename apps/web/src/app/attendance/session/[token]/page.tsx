'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchSessionByToken, SessionValidationData } from '../../../../lib/attendance-api';
import { formatEventDate, formatTimeRange } from '../../../../lib/formatters';

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
        setError(err.message || 'Unable to validate attendance session.');
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 animate-pulse">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 mb-6" />
        <div className="w-48 h-6 bg-slate-800 rounded-full mb-4" />
        <div className="w-64 h-10 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl font-bold">
            ✕
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-100">
              Attendance Session Expired or Invalid
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

  const { sessionType, event, startsAt, endsAt } = sessionData;
  const isCheckIn = sessionType === 'CHECK_IN';

  const formattedStartTime = new Date(startsAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const formattedEndTime = new Date(endsAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans select-none">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Session Status Header */}
        <div className="text-center space-y-3">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${
              isCheckIn
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCheckIn ? 'bg-emerald-400' : 'bg-amber-400'
              } animate-ping`}
            />
            {isCheckIn ? 'CHECK-IN SESSION' : 'CHECK-OUT SESSION'}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 leading-tight">
            {event.title}
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm">
            {event.location} • {formatEventDate(event.date)}
          </p>
        </div>

        {/* Active Verification Box */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-3">
            <span>Session Window:</span>
            <span className="font-mono text-slate-200 font-bold">
              {formattedStartTime} – {formattedEndTime}
            </span>
          </div>

          <div className="flex items-center gap-3 text-emerald-400 pt-1">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm font-bold">Attendance session is active.</span>
          </div>
        </div>

        {/* Notice for Phase 8 */}
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300 space-y-1">
          <p className="font-bold">Phase 7 Dynamic QR Entry Verified</p>
          <p className="text-indigo-300/80">
            Student attendance submission forms and identity verification will be enabled in Phase 8.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col gap-3">
          <Link
            href={`/events/${event.id}`}
            className="w-full py-3 text-center rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors"
          >
            View Event Details
          </Link>
          <Link
            href="/events"
            className="w-full py-2.5 text-center text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Back to All Events
          </Link>
        </div>
      </div>
    </div>
  );
}
