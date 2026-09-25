'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { fetchEventById, updateEvent, uploadEventBanner, deleteEventBanner, uploadEventGalleryImages, deleteEventGalleryImage } from '../../../../../lib/api';
import { EventImageItem } from '../../../../../types/event';
import { getEventImageUrl } from '../../../../../lib/formatters';

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
      setError('Invalid file type. Only JPEG, PNG, and WebP image files are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5MB maximum limit.');
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
        setError(`File "${f.name}" has an invalid type. Only JPEG, PNG, and WebP are allowed.`);
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setError(`File "${f.name}" exceeds the 5MB maximum limit.`);
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
      setTargetGroup(eventData.targetGroup || 'All Students');
      setImageUrl(eventData.imageUrl || '');
      setExistingImages(eventData.images || []);
    } catch (err: any) {
      if (err.message === 'EVENT_NOT_FOUND') {
        setError('EVENT_NOT_FOUND');
      } else {
        setError(err.message || 'Failed to load event for editing.');
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
      setError('Please fill in all required fields.');
      return;
    }

    // Validate times
    const startISO = new Date(`${date}T${startTime}:00`);
    const endISO = new Date(`${date}T${endTime}:00`);
    const dateISO = new Date(`${date}T00:00:00`);

    if (isNaN(startISO.getTime()) || isNaN(endISO.getTime()) || isNaN(dateISO.getTime())) {
      setError('Invalid date or time values provided.');
      return;
    }

    if (endISO <= startISO) {
      setError('End time must be after start time.');
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
        setError(err.message || 'Failed to update event.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || initialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-400 text-sm animate-pulse">
        Loading event details...
      </div>
    );
  }

  if (error === 'EVENT_NOT_FOUND') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center space-y-6 font-sans">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center mx-auto text-2xl font-bold">
          ⚠️
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-100">Event Not Found</h1>
          <p className="text-slate-400 text-sm">
            The event requested for editing does not exist.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-block py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all"
        >
          Return to Admin Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-8 font-sans select-none">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-widest">
            ADMINISTRATOR CONSOLE
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            Edit University Event
          </h1>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all"
        >
          ← Cancel
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
            Event Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Event Description <span className="text-rose-400">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors resize-y"
          />
        </div>

        {/* Date & Time Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Event Date <span className="text-rose-400">*</span>
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
              Start Time <span className="text-rose-400">*</span>
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
              End Time <span className="text-rose-400">*</span>
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
              Location <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Target Group <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Event Banner Upload, Preview & Removal */}
        <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Event Banner Image <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <span className="text-[10px] text-slate-500 font-medium">JPEG, PNG, WebP (Max 5MB)</span>
          </div>

          {/* Current Banner or New Preview */}
          {(bannerPreview || (imageUrl && !bannerRemoved)) ? (
            <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerPreview || imageUrl}
                alt="Banner Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <label className="cursor-pointer px-4 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs transition-all shadow-lg">
                  <span>🔄 Replace Banner</span>
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
                  className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs transition-all shadow-lg"
                >
                  🗑️ Remove Banner
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 font-bold text-xs transition-all">
                <span>📁 Select Image File</span>
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
                  <span>No banner attached. Select an image file or enter a URL below</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Event Photos Gallery Management */}
        <div className="space-y-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-2">
              <span>📸 Event Photos Gallery</span>
              <span className="text-slate-500 font-normal">({existingImages.length + newGalleryFiles.length} total)</span>
            </label>
            <span className="text-[10px] text-slate-500 font-medium">JPEG, PNG, WebP</span>
          </div>

          {/* Existing Gallery Photos Grid */}
          {existingImages.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 block">Existing Gallery Photos</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {existingImages.map((imgItem) => {
                  const resolvedUrl = getEventImageUrl(imgItem.imageUrl);
                  if (!resolvedUrl) return null;
                  return (
                    <div key={imgItem.id} className="relative h-28 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={resolvedUrl} alt="Existing Gallery Photo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingImage(imgItem.id)}
                          className="p-1.5 rounded-lg bg-rose-600 text-white font-bold text-[10px]"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add New Gallery Photos */}
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 font-bold text-xs transition-all">
                <span>🖼️ Add New Photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleNewGalleryFilesChange}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-slate-500">
                {newGalleryFiles.length > 0 ? `${newGalleryFiles.length} new photo(s) queued` : 'Select photos to add to this event'}
              </span>
            </div>

            {/* New Gallery Photo Previews */}
            {newGalleryPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {newGalleryPreviews.map((item, idx) => (
                  <div key={idx} className="relative h-28 rounded-xl overflow-hidden border border-indigo-500/50 bg-slate-950 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.previewUrl} alt={`New gallery preview ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveNewGalleryFile(idx)}
                        className="p-1.5 rounded-lg bg-rose-600 text-white font-bold text-[10px]"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800/80">
          <Link
            href="/admin"
            className="px-6 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {submitting ? 'Updating Event...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
