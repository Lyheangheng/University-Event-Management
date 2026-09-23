'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EventItem } from '../../types/event';
import { fetchEvents } from '../../lib/api';
import { formatEventDate, formatTimeRange, calculateEventStatus } from '../../lib/formatters';
import { StatusBadge } from '../../components/ui/StatusBadge';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Auth verification
  useEffect(() => {
    const token = localStorage.getItem('admin_access_token');
    if (!token) {
      router.replace('/admin/login');
    } else {
      setAuthenticated(true);
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
      setError(err.message || 'Failed to load events list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadEvents();
    }
  }, [authenticated, loadEvents]);

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token');
    router.push('/admin/login');
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-slate-400 text-sm font-medium animate-pulse">
          Verifying administrator session...
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
              ADMINISTRATOR PORTAL
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-100 tracking-tight">
            Event Management Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Select an event to inspect student attendance submissions or launch the live projector display.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/events"
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all"
          >
            Public Events Site
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Events List */}
      <main className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-200">
            University Events ({events.length})
          </h2>
          <button
            onClick={loadEvents}
            disabled={loading}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            Refresh List
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
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 text-slate-400 space-y-2">
            <p className="text-base font-bold text-slate-300">No events found</p>
            <p className="text-xs">No active university events are registered in the system.</p>
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
                      href={`/admin/events/${event.id}/attendance`}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
                    >
                      Manage Attendance
                    </Link>

                    <Link
                      href={`/events/${event.id}/display`}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all"
                    >
                      Projector Display
                    </Link>

                    <Link
                      href={`/events/${event.id}`}
                      className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold transition-all"
                    >
                      View Details
                    </Link>
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
