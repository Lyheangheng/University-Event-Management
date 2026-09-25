'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EventItem } from '../types/event';
import { formatEventDate, formatTimeRange, calculateEventStatus, getEventImageUrl } from '../lib/formatters';
import { StatusBadge } from './ui/StatusBadge';

interface EventCardProps {
  event: EventItem;
}

export function EventCard({ event }: EventCardProps) {
  const [imageError, setImageError] = useState(false);

  const status = calculateEventStatus(event.startTime, event.endTime);

  const displayImageUrl = getEventImageUrl(event.imageUrl) || (
    event.images && event.images.length > 0 ? getEventImageUrl(event.images[0].imageUrl) : null
  );

  return (
    <div className="group bg-white border border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden flex flex-col transition-all duration-200 shadow-sm hover:shadow-md">
      {/* Image / Fallback Container */}
      <div className="relative w-full h-44 bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
        {displayImageUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImageUrl}
            alt={event.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-1.5 p-4 text-slate-400">
            <svg
              className="w-8 h-8 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs text-slate-500 font-medium">รูปภาพกิจกรรม</span>
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge variant={status as any} />
            <span className="text-xs text-slate-500 font-normal truncate">
              {event.targetGroup ? event.targetGroup : 'นักศึกษาทุกชั้นปี'}
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900 group-hover:text-university-700 transition-colors line-clamp-2 leading-snug">
            {event.title}
          </h3>

          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{formatEventDate(event.date)} • {formatTimeRange(event.startTime, event.endTime)}</span>
          </div>

          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        <div className="pt-1">
          <Link
            href={`/events/${event.id}`}
            className="w-full inline-flex items-center justify-center py-2 px-3 rounded-lg bg-university-700 hover:bg-university-800 text-white font-medium text-xs transition-colors shadow-sm"
          >
            ดูรายละเอียด
          </Link>
        </div>
      </div>
    </div>
  );
}

