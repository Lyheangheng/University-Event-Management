'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { EventItem } from '../../../types/event';
import { fetchEventById } from '../../../lib/api';
import {
  formatEventDate,
  formatTimeRange,
  calculateEventStatus,
  getEventImageUrl,
} from '../../../lib/formatters';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ErrorState } from '../../../components/ui/ErrorState';

export default function EventDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [primaryImageError, setPrimaryImageError] = useState<boolean>(false);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

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
        setError('ไม่สามารถโหลดข้อมูลรายละเอียดกิจกรรมได้ กรุณาลองใหม่อีกครั้ง');
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
      <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6 animate-pulse font-sans">
        <div className="w-24 h-6 bg-slate-800/60 rounded-lg" />
        <div className="w-full h-60 bg-slate-800/60 rounded-3xl" />
        <div className="space-y-4 pt-2">
          <div className="w-3/4 h-8 bg-slate-800/80 rounded-xl" />
          <div className="w-full h-20 bg-slate-800/50 rounded-2xl" />
          <div className="w-full h-32 bg-slate-800/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error === 'NOT_FOUND') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center space-y-6 font-sans">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-xl">
          <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">ไม่พบข้อมูลกิจกรรม</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            กิจกรรมที่คุณค้นหาไม่มีอยู่ในระบบหรืออาจถูกลบออกไปแล้ว
          </p>
        </div>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-emerald-950/40"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          กลับไปยังรายการกิจกรรม
        </Link>
      </div>
    );
  }

  if (error || !event) {
    return <ErrorState title="ไม่สามารถโหลดข้อมูลกิจกรรมได้" message={error || 'เกิดข้อผิดพลาดที่ไม่คาดคิด'} onRetry={loadEvent} />;
  }

  const status = calculateEventStatus(event.startTime, event.endTime);

  // Image Priority:
  // 1. Optional event banner (event.imageUrl)
  // 2. First gallery photo (event.images[0].imageUrl)
  // 3. Fallback UI
  let primaryRawUrl: string | null = null;
  if (event.imageUrl && typeof event.imageUrl === 'string' && event.imageUrl.trim()) {
    primaryRawUrl = event.imageUrl;
  } else if (event.images && Array.isArray(event.images) && event.images.length > 0) {
    const firstImg = event.images[0]?.imageUrl;
    if (firstImg && typeof firstImg === 'string' && firstImg.trim()) {
      primaryRawUrl = firstImg;
    }
  }

  const primaryImageUrl = primaryRawUrl ? getEventImageUrl(primaryRawUrl) : null;
  const galleryImages = event.images || [];

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-5 font-sans">
      {/* Lightbox Modal */}
      {activeLightboxIndex !== null && galleryImages[activeLightboxIndex] && (
        <div
          onClick={() => setActiveLightboxIndex(null)}
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center space-y-4"
          >
            {/* Lightbox Header / Counter */}
            <div className="w-full flex items-center justify-between text-slate-300 text-xs font-semibold px-2">
              <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-emerald-400">
                รูปภาพที่ {activeLightboxIndex + 1} จาก {galleryImages.length}
              </span>
              <button
                onClick={() => setActiveLightboxIndex(null)}
                aria-label="ปิดรูปภาพ"
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Lightbox Image */}
            <div className="relative w-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getEventImageUrl(galleryImages[activeLightboxIndex].imageUrl) || ''}
                alt={`รูปภาพกิจกรรมที่ ${activeLightboxIndex + 1}`}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
              />
            </div>

            {/* Lightbox Navigation Controls */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveLightboxIndex((prev) =>
                      prev === null || prev === 0 ? galleryImages.length - 1 : prev - 1
                    );
                  }}
                  aria-label="รูปภาพก่อนหน้า"
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-800 transition-all flex items-center gap-1.5"
                >
                  ← รูปภาพก่อนหน้า
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveLightboxIndex((prev) =>
                      prev === null || prev === galleryImages.length - 1 ? 0 : prev + 1
                    );
                  }}
                  aria-label="รูปภาพถัดไป"
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-800 transition-all flex items-center gap-1.5"
                >
                  รูปภาพถัดไป →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LINE Mobile Header Bar */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-2xl backdrop-blur-md shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-sm font-black">
            🎓
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 block leading-tight">กิจกรรมมหาวิทยาลัย</span>
            <span className="text-[10px] text-slate-400 block">ข่าวสารกิจกรรมนักศึกษา</span>
          </div>
        </div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-white transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          กิจกรรมทั้งหมด
        </Link>
      </div>

      {/* Main Event Post Card */}
      <article className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-950/10">
        {/* Large Primary Event Image Hero */}
        {primaryImageUrl && !primaryImageError ? (
          <div className="relative w-full h-56 sm:h-72 bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryImageUrl}
              alt={event.title}
              onError={() => setPrimaryImageError(true)}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full p-6 bg-gradient-to-br from-emerald-900/40 via-slate-900 to-indigo-950/40 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl shrink-0">
              🎓
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">ข่าวสารกิจกรรมมหาวิทยาลัย</span>
              <span className="text-[11px] text-slate-400 block">ประกาศกิจกรรมอย่างเป็นทางการ</span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-7 space-y-6">
          {/* Status & Target Group */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge variant={status as any} />
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/80">
              กลุ่มเป้าหมาย: {event.targetGroup || 'นักศึกษาทุกชั้นปี'}
            </span>
          </div>

          {/* Event Title */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight leading-tight">
            {event.title}
          </h1>

          {/* Compact Metadata Rows */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
            <div className="flex items-start gap-3">
              <span className="text-base shrink-0">📅</span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">วันที่</span>
                <span className="font-semibold text-slate-200 block mt-0.5">{formatEventDate(event.date)}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-base shrink-0">🕘</span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">เวลา</span>
                <span className="font-semibold text-slate-200 block mt-0.5">{formatTimeRange(event.startTime, event.endTime)}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-base shrink-0">📍</span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">สถานที่</span>
                <span className="font-semibold text-slate-200 block mt-0.5">{event.location}</span>
              </div>
            </div>
          </div>

          {/* Student Attendance QR Instruction Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-300 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 text-base">
              📱
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-100 block text-xs">
                คำแนะนำการลงชื่อเช็กอิน / เช็กเอาต์
              </span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                สแกน QR Code บนหน้าจอแสดงผล ณ สถานที่จัดงานตามช่วงเวลาที่เปิดระบบเพื่อบันทึกการเข้าร่วมกิจกรรม
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 pt-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              รายละเอียดกิจกรรม
            </h2>
            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </div>
          </div>

          {/* Activities Photo Gallery */}
          {galleryImages.length > 0 && (
            <div className="space-y-3 pt-5 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    ภาพกิจกรรม
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    {galleryImages.length} รูปภาพ
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">แตะที่รูปภาพเพื่อขยายใหญ่</span>
              </div>

              {/* Responsive Swipeable Photo Gallery */}
              <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-none snap-x snap-mandatory">
                {galleryImages.map((imgItem, idx) => {
                  const imgUrl = getEventImageUrl(imgItem.imageUrl);
                  if (!imgUrl) return null;
                  return (
                    <div
                      key={imgItem.id || idx}
                      onClick={() => setActiveLightboxIndex(idx)}
                      className="snap-start shrink-0 w-44 sm:w-auto h-36 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-emerald-500/60 transition-all duration-300 cursor-pointer relative group shadow-md"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={`รูปภาพกิจกรรมที่ ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-[10px] font-bold shadow-md">
                          🔍 ขยาย
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
