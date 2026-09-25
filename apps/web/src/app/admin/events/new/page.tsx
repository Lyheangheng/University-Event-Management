'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createEvent, uploadEventBanner, uploadEventGalleryImages } from '../../../../lib/api';

export default function CreateEventPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [targetGroup, setTargetGroup] = useState('นักศึกษาทุกชั้นปี');
  const [imageUrl, setImageUrl] = useState('');

  // Banner file upload state
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Gallery files state
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<{ file: File; previewUrl: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError('รูปแบบไฟล์ไม่ถูกต้อง รองรับเฉพาะไฟล์ JPEG, PNG และ WebP เท่านั้น');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('ขนาดไฟล์เกิน 5MB ที่กำหนด');
      return;
    }

    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    setImageUrl('');
  };

  const handleGalleryFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const validFiles: File[] = [];
    const validPreviews: { file: File; previewUrl: string }[] = [];

    for (const f of files) {
      if (!allowedTypes.includes(f.type.toLowerCase())) {
        setError(`ไฟล์ "${f.name}" มีรูปแบบไม่ถูกต้อง รองรับเฉพาะ JPEG, PNG และ WebP`);
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setError(`ไฟล์ "${f.name}" มีขนาดเกิน 5MB ที่กำหนด`);
        return;
      }
      validFiles.push(f);
      validPreviews.push({ file: f, previewUrl: URL.createObjectURL(f) });
    }

    setGalleryFiles((prev) => [...prev, ...validFiles]);
    setGalleryPreviews((prev) => [...prev, ...validPreviews]);
  };

  const handleRemoveGalleryFile = (index: number) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Auth verification
  useEffect(() => {
    const storedToken = localStorage.getItem('admin_access_token');
    if (!storedToken) {
      router.replace('/admin/login?redirect=/admin/events/new');
    } else {
      setToken(storedToken);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      router.replace('/admin/login');
      return;
    }

    if (!title.trim() || !description.trim() || !date || !startTime || !endTime || !location.trim() || !targetGroup.trim()) {
      setError('กรุณากรอกข้อมูลในช่องที่มีเครื่องหมายดอกจัน (*) ให้ครบถ้วน');
      return;
    }

    // Validate times
    const startISO = new Date(`${date}T${startTime}:00`);
    const endISO = new Date(`${date}T${endTime}:00`);
    const dateISO = new Date(`${date}T00:00:00`);

    if (isNaN(startISO.getTime()) || isNaN(endISO.getTime()) || isNaN(dateISO.getTime())) {
      setError('วันที่หรือรูปแบบเวลาไม่ถูกต้อง');
      return;
    }

    if (endISO <= startISO) {
      setError('เวลาสิ้นสุดกิจกรรมต้องอยู่หลังเวลาเริ่มกิจกรรม');
      return;
    }

    setLoading(true);

    try {
      let finalImageUrl: string | undefined = imageUrl.trim() || undefined;

      // Upload banner file to R2 if selected
      if (bannerFile) {
        const uploadRes = await uploadEventBanner(bannerFile, token);
        finalImageUrl = uploadRes.url;
      }

      const createdEvent = await createEvent(
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

      // Upload gallery photos if selected
      if (galleryFiles.length > 0) {
        await uploadEventGalleryImages(createdEvent.id, galleryFiles, token);
      }

      router.push('/admin');
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        localStorage.removeItem('admin_access_token');
        router.replace('/admin/login?redirect=/admin/events/new');
      } else {
        setError(err.message || 'ไม่สามารถสร้างกิจกรรมได้');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-400 text-sm font-sans">
        กำลังตรวจสอบสิทธิ์การใช้งาน...
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-8 font-sans select-none">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-widest">
            ระบบผู้ดูแลระบบ
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            สร้างกิจกรรมใหม่
          </h1>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all"
        >
          ← ยกเลิก
        </Link>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm font-medium text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            ชื่อกิจกรรม <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น ปฐมนิเทศนักศึกษาใหม่ ประจำปีการศึกษา 2569"
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            รายละเอียดกิจกรรม <span className="text-rose-400">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="รายละเอียดกำหนดการ วัตถุประสงค์ และข้อมูลสำคัญของกิจกรรม..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors resize-y"
          />
        </div>

        {/* Date & Time Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              วันที่จัดกิจกรรม <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              เวลาเริ่มกิจกรรม <span className="text-rose-400">*</span>
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              เวลาสิ้นสุดกิจกรรม <span className="text-rose-400">*</span>
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Location & Target Group Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              สถานที่จัดกิจกรรม <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="เช่น หอประชุมใหญ่ มหาวิทยาลัย"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              กลุ่มเป้าหมาย <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value)}
              placeholder="เช่น นักศึกษาทุกชั้นปี, นักศึกษาปี 1"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Event Banner Upload & Preview */}
        <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              รูปภาพปกกิจกรรม <span className="text-slate-500 font-normal">(ไม่บังคับ)</span>
            </label>
            <span className="text-[10px] text-slate-500 font-medium">JPEG, PNG, WebP (ขนาดสูงสุด 5MB)</span>
          </div>

          {/* Local Preview if Selected */}
          {bannerPreview ? (
            <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerPreview} alt="ตัวอย่างรูปภาพปก" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs transition-all shadow-lg"
                >
                  🗑️ ลบรูปภาพ
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 font-bold text-xs transition-all">
                <span>📁 เลือกรูปภาพจากอุปกรณ์</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <div className="text-center sm:text-left text-xs text-slate-500 flex-1">
                {bannerFile ? (
                  <span className="text-indigo-400 font-semibold truncate block">
                    📄 {bannerFile.name} ({(bannerFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                ) : (
                  <span>หรือกรอก URL รูปภาพภายนอกด้านล่าง</span>
                )}
              </div>
            </div>
          )}

          {/* Secondary External URL Fallback */}
          {!bannerFile && (
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="หรือวาง URL รูปภาพภายนอก: https://..."
              className="w-full bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-colors"
            />
          )}
        </div>

        {/* Event Photos Gallery Upload (Optional) */}
        <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-2">
              <span>📸 รูปภาพกิจกรรม / ภาพบรรยากาศ</span>
              <span className="text-slate-500 font-normal">(ไม่บังคับ)</span>
            </label>
            <span className="text-[10px] text-slate-500 font-medium">รองรับหลายไฟล์ (JPEG, PNG, WebP)</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <label className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 font-bold text-xs transition-all">
              <span>🖼️ เลือกรูปภาพกิจกรรม</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleGalleryFilesChange}
                className="hidden"
              />
            </label>

            <span className="text-xs text-slate-500">
              {galleryFiles.length > 0 ? `เลือกแล้ว ${galleryFiles.length} รูปภาพ` : 'สามารถเลือกหลายรูปภาพเพื่อแสดงในแกลเลอรีภาพกิจกรรม'}
            </span>
          </div>

          {/* Selected Gallery Previews Grid */}
          {galleryPreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {galleryPreviews.map((item, idx) => (
                <div key={idx} className="relative h-28 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt={`ตัวอย่างรูปภาพกิจกรรมที่ ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryFile(idx)}
                      className="p-1.5 rounded-lg bg-rose-600 text-white font-bold text-[10px]"
                    >
                      ✕ ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800/80">
          <Link
            href="/admin"
            className="px-6 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition-all"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {loading ? 'กำลังสร้างกิจกรรม...' : 'สร้างกิจกรรม'}
          </button>
        </div>
      </form>
    </div>
  );
}
