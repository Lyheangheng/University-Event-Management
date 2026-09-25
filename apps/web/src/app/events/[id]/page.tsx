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
      <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse font-sans">
        <div className="w-32 h-8 bg-slate-200 rounded-lg" />
        <div className="w-full h-64 bg-slate-200 rounded-xl" />
        <div className="space-y-4 pt-2">
          <div className="w-3/4 h-8 bg-slate-200 rounded-lg" />
          <div className="w-full h-24 bg-slate-200 rounded-xl" />
          <div className="w-full h-32 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error === 'NOT_FOUND') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center space-y-6 font-sans">
        <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900">ไม่พบข้อมูลกิจกรรม</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            กิจกรรมที่คุณค้นหาไม่มีอยู่ในระบบหรืออาจถูกลบออกไปแล้ว
          </p>
        </div>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm"
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
    <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-6 font-sans">
      {/* Lightbox Modal */}
      {activeLightboxIndex !== null && galleryImages[activeLightboxIndex] && (
        <div
          onClick={() => setActiveLightboxIndex(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center space-y-3"
          >
            {/* Lightbox Header / Counter */}
            <div className="w-full flex items-center justify-between text-slate-200 text-xs font-medium px-2">
              <span>
                รูปภาพที่ {activeLightboxIndex + 1} จาก {galleryImages.length}
              </span>
              <button
                onClick={() => setActiveLightboxIndex(null)}
                aria-label="ปิดรูปภาพ"
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center text-sm"
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
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-xl"
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
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition-colors flex items-center gap-1"
                >
                  ← ก่อนหน้า
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveLightboxIndex((prev) =>
                      prev === null || prev === galleryImages.length - 1 ? 0 : prev + 1
                    );
                  }}
                  aria-label="รูปภาพถัดไป"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition-colors flex items-center gap-1"
                >
                  ถัดไป →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Header / Back Link Bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-university-50 border border-university-200/60 text-university-800 flex items-center justify-center text-xs font-bold shrink-0">
            มหาวิทยาลัย
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">รายละเอียดกิจกรรม</span>
            <span className="text-[11px] text-slate-500 block">พอร์ตัลนักศึกษา</span>
          </div>
        </div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          กิจกรรมทั้งหมด
        </Link>
      </div>

      {/* Main Event Article Card */}
      <article className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Banner Image */}
        {primaryImageUrl && !primaryImageError ? (
          <div className="relative w-full h-56 sm:h-72 bg-slate-100 border-b border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryImageUrl}
              alt={event.title}
              onError={() => setPrimaryImageError(true)}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full p-6 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-university-50 border border-university-200/60 text-university-800 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-university-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold text-university-800 uppercase tracking-wider block">ข่าวสารกิจกรรมมหาวิทยาลัย</span>
              <span className="text-xs text-slate-600 block">ประกาศอย่างเป็นทางการ</span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-7 space-y-6">
          {/* Status & Target Group */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge variant={status as any} />
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              กลุ่มเป้าหมาย: {event.targetGroup || 'นักศึกษาทุกชั้นปี'}
            </span>
          </div>

          {/* Event Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
            {event.title}
          </h1>

          {/* Compact Metadata Box */}
          <div className="space-y-3 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">วันที่</span>
                <span className="font-semibold text-slate-900 block mt-0.5">{formatEventDate(event.date)}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">เวลา</span>
                <span className="font-semibold text-slate-900 block mt-0.5">{formatTimeRange(event.startTime, event.endTime)}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">สถานที่</span>
                <span className="font-semibold text-slate-900 block mt-0.5">{event.location}</span>
              </div>
            </div>
          </div>

          {/* Student Attendance QR Instruction Banner */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="space-y-1">
              <span className="font-bold text-blue-950 block text-xs">
                คำแนะนำการลงชื่อเช็กอิน / เช็กเอาต์
              </span>
              <p className="text-blue-800 leading-relaxed text-xs">
                สแกน QR Code บนหน้าจอแสดงผล ณ สถานที่จัดงานตามช่วงเวลาที่เปิดระบบเพื่อบันทึกการเข้าร่วมกิจกรรม
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 pt-1">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              รายละเอียดกิจกรรม
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {event.description}
            </div>
          </div>

          {/* Activities Photo Gallery */}
          {galleryImages.length > 0 && (
            <div className="space-y-3 pt-5 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    ภาพกิจกรรม
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200">
                    {galleryImages.length} รูปภาพ
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">คลิกที่รูปเพื่อขยาย</span>
              </div>

              {/* Grid: 2 columns on mobile, 3 columns on desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {galleryImages.map((imgItem, idx) => {
                  const imgUrl = getEventImageUrl(imgItem.imageUrl);
                  if (!imgUrl) return null;
                  return (
                    <div
                      key={imgItem.id || idx}
                      onClick={() => setActiveLightboxIndex(idx)}
                      className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer relative group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={`รูปภาพกิจกรรมที่ ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
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
