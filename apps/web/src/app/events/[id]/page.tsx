'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { EventItem } from '../../../types/event';
import { fetchEventById } from '../../../lib/api';
import { formatEventDate, formatTimeRange, calculateEventStatus } from '../../../lib/formatters';

export default function EventDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);

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
        setError('Unable to load event details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6 animate-pulse">
        <div className="w-32 h-8 bg-slate-800/60 rounded-xl" />
        <div className="w-full h-64 sm:h-80 bg-slate-800/60 rounded-3xl" />
        <div className="space-y-4 pt-4">
          <div className="w-1/3 h-8 bg-slate-800/80 rounded" />
          <div className="w-full h-24 bg-slate-800/50 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error === 'NOT_FOUND') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Event Not Found</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            The requested university event does not exist or may have been removed.
          </p>
        </div>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-colors shadow-lg shadow-indigo-950/40"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Events
        </Link>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-rose-950/30 border border-rose-900/50 text-rose-400 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-rose-200">Failed to Load Event</h1>
          <p className="text-xs sm:text-sm text-slate-400">{error || 'An unexpected error occurred.'}</p>
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={loadEvent}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-colors shadow-lg shadow-indigo-950/40"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const status = calculateEventStatus(event.startTime, event.endTime);

  const renderStatusBadge = () => {
    switch (status) {
      case 'ONGOING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ONGOING
          </span>
        );
      case 'UPCOMING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            UPCOMING
          </span>
        );
      case 'ENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            ENDED
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Top Back Navigation */}
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-all group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Events
        </Link>
      </div>

      {/* Main Event Article Container */}
      <article className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-950/20 backdrop-blur-xl">
        {/* Event Banner Image or Placeholder */}
        <div className="relative w-full h-64 sm:h-96 bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800/80">
          {event.imageUrl && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.imageUrl}
              alt={event.title}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-3 p-6 text-slate-500">
              <svg className="w-16 h-16 text-indigo-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-slate-400">University Event Banner</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-10 space-y-8">
          {/* Header Info */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {renderStatusBadge()}
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/60">
                Target: {event.targetGroup || 'All Students'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
              {event.title}
            </h1>
          </div>

          {/* Quick Details Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs sm:text-sm">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Date & Time</span>
                <span className="font-semibold text-slate-200 block mt-0.5">{formatEventDate(event.date)}</span>
                <span className="text-slate-400 text-xs block">{formatTimeRange(event.startTime, event.endTime)}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</span>
                <span className="font-semibold text-slate-200 block mt-0.5">{event.location}</span>
                <span className="text-slate-400 text-xs block">Main Campus</span>
              </div>
            </div>
          </div>

          {/* Detailed Description */}
          <div className="space-y-3 pt-2">
            <h2 className="text-base font-bold text-slate-200 uppercase tracking-wider text-xs">
              Event Description
            </h2>
            <div className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line space-y-4">
              {event.description}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
