'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { EventItem } from '../../../../types/event';
import { fetchEventById } from '../../../../lib/api';
import { formatEventDate, formatTimeRange } from '../../../../lib/formatters';
import {
  getEventDisplayState,
  getCountdownTarget,
  ProjectorState,
} from '../../../../lib/event-display';
import { fetchActiveSession, ActiveSessionData } from '../../../../lib/attendance-api';
import { QrPlaceholder } from '../../../../components/display/QrPlaceholder';
import { QrCodeDisplay } from '../../../../components/display/QrCodeDisplay';
import { Countdown } from '../../../../components/display/Countdown';

export default function ProjectorDisplayPage() {
  const params = useParams();
  const id = params?.id as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Live 1-second time ticker state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Active attendance session state
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);

  const loadEvent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEventById(id);
      setEvent(data);
    } catch (err: any) {
      if (err.message === 'EVENT_NOT_FOUND') {
        setError('NOT_FOUND');
      } else {
        setError('Unable to load event details for display.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // 1-Second live clock ticker & state transition updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Poll for active attendance session every 5 seconds during check-in / check-out windows
  const pollActiveSession = useCallback(async () => {
    if (!id) return;
    try {
      const session = await fetchActiveSession(id);
      setActiveSession(session);
    } catch (err) {
      console.error('Error polling active session:', err);
    }
  }, [id]);

  useEffect(() => {
    if (!event) return;

    const displayState = getEventDisplayState(event, currentTime);
    const isAttendanceWindow =
      displayState === 'CHECK_IN_WINDOW' || displayState === 'CHECK_OUT_WINDOW';

    if (isAttendanceWindow) {
      pollActiveSession();
      const interval = setInterval(pollActiveSession, 5000);
      return () => clearInterval(interval);
    } else {
      setActiveSession(null);
    }
  }, [event, currentTime, pollActiveSession]);

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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-200">Event Not Found</h1>
        <p className="text-slate-400 max-w-md">The requested event display could not be loaded.</p>
        <Link
          href="/events"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
        >
          Back to Events
        </Link>
      </div>
    );
  }

  // Calculate current state & countdown target
  const displayState: ProjectorState = getEventDisplayState(event, currentTime);
  const countdownTarget: Date | null = getCountdownTarget(event, displayState);

  // Live Clock string (e.g., 14:27:08)
  const formattedLiveClock = currentTime.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 select-none selection:bg-none font-sans overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 sm:pb-6">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-indigo-400">
            PROJECTOR DISPLAY MODE
          </span>
        </div>

        {/* Live Synchronized Clock */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs sm:text-sm font-mono text-slate-300">
          <span className="text-slate-500 font-sans">Current time</span>
          <span className="font-bold text-slate-100">{formattedLiveClock}</span>
        </div>

        <Link
          href={`/events/${event.id}`}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-4"
        >
          Exit Projector View
        </Link>
      </header>

      {/* Main Center Display Area */}
      <main className="my-auto py-8 flex flex-col items-center justify-center text-center space-y-8 sm:space-y-10">
        {/* Event Title Banner */}
        <div className="space-y-3 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Target: {event.targetGroup || 'All Students'}
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-100 tracking-tight leading-tight">
            {event.title}
          </h1>
          <p className="text-sm sm:text-lg text-slate-400 font-medium">
            {event.location} • {formatEventDate(event.date)} ({formatTimeRange(event.startTime, event.endTime)})
          </p>
        </div>

        {/* STATE MACHINE RENDERING */}

        {/* STATE 1: BEFORE_EVENT */}
        {displayState === 'BEFORE_EVENT' && (
          <div className="space-y-6 animate-fade-in">
            <div className="inline-block px-6 py-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xl sm:text-3xl font-black uppercase tracking-widest shadow-lg">
              EVENT STARTING SOON
            </div>
            <Countdown targetDate={countdownTarget} currentTime={currentTime} subtitle="Until event starts" />
          </div>
        )}

        {/* STATE 2: CHECK_IN_WINDOW */}
        {displayState === 'CHECK_IN_WINDOW' && (
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 sm:gap-12 animate-fade-in">
            <div className="space-y-6 text-center md:text-left">
              <div className="inline-block px-6 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xl sm:text-3xl font-black uppercase tracking-widest shadow-lg">
                CHECK-IN OPEN
              </div>
              <Countdown targetDate={countdownTarget} currentTime={currentTime} subtitle="Remaining check-in time" />
            </div>
            {activeSession && activeSession.sessionType === 'CHECK_IN' ? (
              <QrCodeDisplay
                sessionType="CHECK_IN"
                attendanceUrl={activeSession.attendanceUrl}
              />
            ) : (
              <QrPlaceholder sessionType="CHECK_IN" />
            )}
          </div>
        )}

        {/* STATE 3: BETWEEN_CHECK_IN_AND_CHECKOUT */}
        {displayState === 'BETWEEN_CHECK_IN_AND_CHECKOUT' && (
          <div className="space-y-6 text-center animate-fade-in">
            <div className="space-y-2">
              <div className="inline-block px-6 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-slate-300 text-xl sm:text-3xl font-black uppercase tracking-widest">
                CHECK-IN CLOSED
              </div>
              <p className="text-sm sm:text-base text-slate-400 font-medium">Please wait for check-out.</p>
            </div>
            <Countdown targetDate={countdownTarget} currentTime={currentTime} subtitle="Check-out opens in" />
          </div>
        )}

        {/* STATE 4: CHECK_OUT_WINDOW */}
        {displayState === 'CHECK_OUT_WINDOW' && (
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 sm:gap-12 animate-fade-in">
            <div className="space-y-6 text-center md:text-left">
              <div className="inline-block px-6 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xl sm:text-3xl font-black uppercase tracking-widest shadow-lg">
                CHECK-OUT OPEN
              </div>
              <Countdown targetDate={countdownTarget} currentTime={currentTime} subtitle="Remaining check-out time" />
            </div>
            {activeSession && activeSession.sessionType === 'CHECK_OUT' ? (
              <QrCodeDisplay
                sessionType="CHECK_OUT"
                attendanceUrl={activeSession.attendanceUrl}
              />
            ) : (
              <QrPlaceholder sessionType="CHECK_OUT" />
            )}
          </div>
        )}

        {/* STATE 5: ENDED */}
        {displayState === 'ENDED' && (
          <div className="space-y-4 text-center animate-fade-in">
            <div className="inline-block px-8 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-2xl sm:text-4xl font-black uppercase tracking-widest">
              EVENT ENDED
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Event completed at {formatTimeRange(event.startTime, event.endTime).split('–')[1]?.trim() || ''}
            </p>
          </div>
        )}
      </main>

      {/* Bottom Footer Information */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800/80 pt-4 text-xs text-slate-400">
        <span>University Event Management System • Projector Display</span>
        <span className="font-mono text-slate-400">State: {displayState}</span>
      </footer>
    </div>
  );
}
