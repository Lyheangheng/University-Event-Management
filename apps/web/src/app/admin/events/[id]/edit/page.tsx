'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { fetchEventById, updateEvent, uploadEventBanner, deleteEventBanner, uploadEventGalleryImages, deleteEventGalleryImage } from '../../../../../lib/api';
import { EventImageItem } from '../../../../../types/event';
import { getEventImageUrl } from '../../../../../lib/formatters';
import { AdminLayout } from '../../../../../components/admin/AdminLayout';

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [token, setToken] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [targetGroup, setTargetGroup] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Banner file upload state
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerRemoved, setBannerRemoved] = useState(false);

  // Gallery states
  const [existingImages, setExistingImages] = useState<EventImageItem[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [newGalleryFiles, setNewGalleryFiles] = useState<File[]>([]);
  const [newGalleryPreviews, setNewGalleryPreviews] = useState<{ file: File; previewUrl: string }[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError('ประเภทไฟล์ไม่ถูกต้อง อนุญาตเฉพาะไฟล์รูปภาพ JPEG, PNG และ WebP เท่านั้น');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('ขนาดไฟล์เกินขีดจำกัดสูงสุด 5MB');
      return;
    }

    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setBannerRemoved(false);
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    setImageUrl('');
    setBannerRemoved(true);
  };

  const handleDeleteExistingImage = (imageId: string) => {
    setDeletedImageIds((prev) => [...prev, imageId]);
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleNewGalleryFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const validFiles: File[] = [];
    const validPreviews: { file: File; previewUrl: string }[] = [];

    for (const f of files) {
      if (!allowedTypes.includes(f.type.toLowerCase())) {
        setError(`ไฟล์ "${f.name}" มีประเภทไม่ถูกต้อง อนุญาตเฉพาะ JPEG, PNG และ WebP เท่านั้น`);
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setError(`ไฟล์ "${f.name}" มีขนาดเกินขีดจำกัดสูงสุด 5MB`);
        return;
      }
      validFiles.push(f);
      validPreviews.push({ file: f, previewUrl: URL.createObjectURL(f) });
    }

    setNewGalleryFiles((prev) => [...prev, ...validFiles]);
    setNewGalleryPreviews((prev) => [...prev, ...validPreviews]);
  };

  const handleRemoveNewGalleryFile = (index: number) => {
    setNewGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setNewGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Helper to format Date to YYYY-MM-DD
  const formatDateForInput = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  // Helper to format Time to HH:mm
  const formatTimeForInput = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  // Auth verification & load event
  const loadData = useCallback(async () => {
    const storedToken = localStorage.getItem('admin_access_token');
    if (!storedToken) {
      router.replace(`/admin/login?redirect=/admin/events/${id}/edit`);
      return;
    }
    setToken(storedToken);

    if (!id) return;
    setInitialLoading(true);
    setError(null);

    try {
      const eventData = await fetchEventById(id);
      setTitle(eventData.title);
      setDescription(eventData.description);
      setDate(formatDateForInput(eventData.date));
      setStartTime(formatTimeForInput(eventData.startTime));
      setEndTime(formatTimeForInput(eventData.endTime));
      setLocation(eventData.location);
      setTargetGroup(eventData.targetGroup || 'นักศึกษาทุกชั้นปี');
      setImageUrl(eventData.imageUrl || '');
      setExistingImages(eventData.images || []);
    } catch (err: any) {
      if (err.message === 'EVENT_NOT_FOUND') {
        setError('EVENT_NOT_FOUND');
      } else {
        setError(err.message || 'ไม่สามารถโหลดข้อมูลกิจกรรมสำหรับการแก้ไขได้');
      }
    } finally {
      setInitialLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      router.replace('/admin/login');
      return;
    }

    if (!title.trim() || !description.trim() || !date || !startTime || !endTime || !location.trim() || !targetGroup.trim()) {
      setError('กรุณากรอกข้อมูลในช่องที่จำเป็นให้ครบถ้วน');
      return;
    }

    // Validate times
    const startISO = new Date(`${date}T${startTime}:00`);
    const endISO = new Date(`${date}T${endTime}:00`);
    const dateISO = new Date(`${date}T00:00:00`);

    if (isNaN(startISO.getTime()) || isNaN(endISO.getTime()) || isNaN(dateISO.getTime())) {
      setError('วันที่หรือเวลาที่ระบุไม่ถูกต้อง');
      return;
    }

    if (endISO <= startISO) {
      setError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น');
      return;
    }

    setSubmitting(true);

    try {
      let finalImageUrl: string | null = imageUrl.trim() || null;

      if (bannerRemoved) {
        finalImageUrl = null;
        await deleteEventBanner(id, token).catch(() => null);
      } else if (bannerFile) {
        const uploadRes = await uploadEventBanner(bannerFile, token);
        finalImageUrl = uploadRes.url;
      }

      // Delete marked gallery images
      if (deletedImageIds.length > 0) {
        for (const imgId of deletedImageIds) {
          await deleteEventGalleryImage(id, imgId, token).catch(() => null);
        }
      }

      // Upload new gallery photos
      if (newGalleryFiles.length > 0) {
        await uploadEventGalleryImages(id, newGalleryFiles, token);
      }

      await updateEvent(
        id,
        {
          title: title.trim(),
          description: description.trim(),
          date: dateISO.toISOString(),
          startTime: startISO.toISOString(),
          endTime: endISO.toISOString(),
          location: location.trim(),
          targetGroup: targetGroup.trim(),
          imageUrl: finalImageUrl,
        },
        token,
      );

      router.push('/admin');
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        localStorage.removeItem('admin_access_token');
        router.replace(`/admin/login?redirect=/admin/events/${id}/edit`);
      } else {
        setError(err.message || 'ไม่สามารถอัปเดตข้อมูลกิจกรรมได้');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || initialLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-4 text-slate-600 text-xs font-sans">
        กำลังโหลดข้อมูลกิจกรรม...
      </div>
    );
  }

  if (error === 'EVENT_NOT_FOUND') {
    return (
      <AdminLayout title="ไม่พบกิจกรรม">
        <div className="max-w-md mx-auto p-8 bg-white border border-slate-200 rounded-xl text-center space-y-4">
          <h1 className="text-xl font-bold text-slate-900">ไม่พบกิจกรรมที่ต้องการแก้ไข</h1>
          <p className="text-xs text-slate-600">กิจกรรมนี้อาจถูกลบออกไปแล้วหรือไม่มีอยู่ในระบบ</p>
          <Link
            href="/admin"
            className="inline-block px-4 py-2 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs font-semibold"
          >
            กลับสู่แผงควบคุมผู้ดูแลระบบ
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const headerActions = (
    <Link
      href="/admin"
      className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors shadow-sm"
    >
      ← ยกเลิก
    </Link>
  );

  return (
    <AdminLayout
      title="แก้ไขกิจกรรมมหาวิทยาลัย"
      subtitle={`แก้ไขข้อมูล กำหนดการ และคลังรูปภาพกิจกรรม (ID: ${id})`}
      actions={headerActions}
    >
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: ข้อมูลกิจกรรม */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
              ข้อมูลกิจกรรม
            </h2>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                ชื่อกิจกรรม <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-university-700 focus:ring-1 focus:ring-university-700 transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                รายละเอียดกิจกรรม <span className="text-red-600">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-university-700 focus:ring-1 focus:ring-university-700 transition-colors resize-y"
              />
            </div>

            {/* Date & Time Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  วันที่จัดกิจกรรม <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-university-700 focus:ring-1 focus:ring-university-700 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  เวลาเริ่มต้น <span className="text-red-600">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-university-700 focus:ring-1 focus:ring-university-700 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  เวลาสิ้นสุด <span className="text-red-600">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-university-700 focus:ring-1 focus:ring-university-700 transition-colors"
                />
              </div>
            </div>

            {/* Location & Target Group Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  สถานที่จัดกิจกรรม <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-university-700 focus:ring-1 focus:ring-university-700 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  กลุ่มเป้าหมาย <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-university-700 focus:ring-1 focus:ring-university-700 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 2: รูปภาพกิจกรรม */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
              รูปภาพกิจกรรม
            </h2>

            {/* Event Banner Upload & Preview */}
            <div className="space-y-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 block">
                  ภาพแบนเนอร์กิจกรรม <span className="text-slate-500 font-normal">(ไม่บังคับ)</span>
                </label>
                <span className="text-[11px] text-slate-500">JPEG, PNG, WebP (สูงสุด 5MB)</span>
              </div>

              {(bannerPreview || (imageUrl && !bannerRemoved)) ? (
                <div className="space-y-2">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bannerPreview || imageUrl}
                      alt="ภาพตัวอย่างแบนเนอร์"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-sm">
                      <span>เปลี่ยนภาพแบนเนอร์</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveBanner}
                      className="px-3.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold text-xs transition-colors"
                    >
                      ลบภาพแบนเนอร์
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-sm">
                    <span>เลือกไฟล์รูปภาพ</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  <div className="text-center sm:text-left text-xs text-slate-500 flex-1">
                    {bannerFile ? (
                      <span className="text-university-800 font-medium truncate block">
                        {bannerFile.name} ({(bannerFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    ) : (
                      <span>ยังไม่ได้แนบภาพแบนเนอร์ เลือกไฟล์รูปภาพเพื่ออัปโหลด</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Event Photos Gallery Management */}
            <div className="space-y-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 block">
                  คลังรูปภาพกิจกรรม <span className="text-slate-500 font-normal">(ทั้งหมด {existingImages.length + newGalleryFiles.length} ภาพ)</span>
                </label>
                <span className="text-[11px] text-slate-500">JPEG, PNG, WebP</span>
              </div>

              {/* Existing Gallery Photos Grid */}
              {existingImages.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700 block">รูปภาพในคลังปัจจุบัน</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {existingImages.map((imgItem) => {
                      const resolvedUrl = getEventImageUrl(imgItem.imageUrl);
                      if (!resolvedUrl) return null;
                      return (
                        <div key={imgItem.id} className="relative h-24 rounded-lg overflow-hidden border border-slate-200 bg-white group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={resolvedUrl} alt="รูปภาพในคลังปัจจุบัน" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteExistingImage(imgItem.id)}
                              className="px-2 py-1 rounded bg-red-600 text-white font-semibold text-[10px]"
                            >
                              ลบ
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add New Gallery Photos */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-sm">
                    <span>เพิ่มรูปภาพใหม่</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleNewGalleryFilesChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-600">
                    {newGalleryFiles.length > 0 ? `รออัปโหลด ${newGalleryFiles.length} รูปภาพใหม่` : 'เลือกรูปภาพที่ต้องการเพิ่มในกิจกรรมนี้'}
                  </span>
                </div>

                {/* New Gallery Photo Previews */}
                {newGalleryPreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {newGalleryPreviews.map((item, idx) => (
                      <div key={idx} className="relative h-24 rounded-lg overflow-hidden border border-slate-200 bg-white group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.previewUrl} alt={`รูปภาพตัวอย่างใหม่ ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveNewGalleryFile(idx)}
                            className="px-2 py-1 rounded bg-red-600 text-white font-semibold text-[10px]"
                          >
                            ลบออก
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 rounded-lg bg-university-700 hover:bg-university-800 text-white font-semibold text-xs sm:text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'กำลังอัปเดตกิจกรรม...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
