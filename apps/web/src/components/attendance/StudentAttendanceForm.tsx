'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import {
  SessionValidationData,
  StudentProfile,
  AttendanceSubmissionResult,
  fetchStudentProfile,
  submitAttendance,
} from '../../lib/attendance-api';
import { formatEventDate, formatTimeRange } from '../../lib/formatters';

interface StudentAttendanceFormProps {
  sessionData: SessionValidationData;
}

export function StudentAttendanceForm({ sessionData }: StudentAttendanceFormProps) {
  const { sessionType, event, token, startsAt, endsAt } = sessionData;
  const isCheckIn = sessionType === 'CHECK_IN';

  // Profile state
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [availableStudents, setAvailableStudents] = useState<StudentProfile[]>([]);
  const [selectedDevStudentId, setSelectedDevStudentId] = useState<string>('');
  const [profileLoading, setProfileLoading] = useState<boolean>(true);

  // Form input states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  // Submission states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<AttendanceSubmissionResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Load student profile
  const loadProfile = useCallback(async (devStudentId?: string) => {
    setProfileLoading(true);
    try {
      const data = await fetchStudentProfile(devStudentId);
      setProfile(data.currentStudent);
      setAvailableStudents(data.availableStudents);
      if (!selectedDevStudentId && data.currentStudent) {
        setSelectedDevStudentId(data.currentStudent.id);
      }
    } catch (err) {
      console.error('Failed to load student profile:', err);
    } finally {
      setProfileLoading(false);
    }
  }, [selectedDevStudentId]);

  useEffect(() => {
    loadProfile(selectedDevStudentId);
  }, [selectedDevStudentId, loadProfile]);

  // Handle Photo selection
  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    setFormError(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPG, PNG, WEBP)');
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      setPhotoError('Image size exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(objectUrl);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
    }
    setPhotoError(null);
  };

  // Form submission handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!photoFile) {
      setPhotoError('Photo proof is required to submit attendance.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitAttendance(
        token,
        photoFile,
        feedback,
        selectedDevStudentId || profile?.id,
      );
      setSubmissionResult(result);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  // Render SUCCESS State
  if (submissionResult) {
    return (
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 text-3xl font-black shadow-lg">
          ✓
        </div>

        <div className="space-y-2">
          <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest">
            {submissionResult.sessionType === 'CHECK_IN' ? 'CHECK-IN COMPLETED' : 'CHECK-OUT COMPLETED'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
            {submissionResult.message}
          </h2>
          <p className="text-slate-400 text-sm">
            Event: <strong className="text-slate-200">{submissionResult.eventTitle}</strong>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
            <span>Student Name:</span>
            <span className="text-slate-200 font-bold">{submissionResult.studentName}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
            <span>Student ID:</span>
            <span className="text-slate-200 font-mono font-bold">{submissionResult.studentId}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
            <span>Recorded Time:</span>
            <span className="text-slate-200 font-mono">
              {new Date(submissionResult.recordedAt).toLocaleString('en-GB')}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Attendance Status:</span>
            <span
              className={`font-bold ${
                submissionResult.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {submissionResult.status}
            </span>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/events"
            className="inline-block w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20"
          >
            Return to All Events
          </Link>
        </div>
      </div>
    );
  }

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
    <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in font-sans select-none">
      {/* Header Banner */}
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
          {isCheckIn ? 'CHECK-IN ATTENDANCE FORM' : 'CHECK-OUT ATTENDANCE FORM'}
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-100 leading-tight">
          {event.title}
        </h1>

        <p className="text-slate-400 text-xs sm:text-sm">
          {event.location} • {formatEventDate(event.date)} ({formatTimeRange(event.startTime, event.endTime)})
        </p>

        <div className="inline-block px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400">
          Session Window: {formattedStartTime} – {formattedEndTime}
        </div>
      </div>

      {/* Form Error Banner */}
      {formError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex items-start gap-3">
          <span className="font-black text-base">⚠️</span>
          <span>{formError}</span>
        </div>
      )}

      {/* Dev Mode Student Switcher (Development Only) */}
      {availableStudents.length > 1 && (
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-900/40 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-indigo-400 uppercase tracking-wider">
            <span>⚙️ DEV TEST SWITCHER</span>
            <span>Local Test Mode</span>
          </div>
          <select
            value={selectedDevStudentId}
            onChange={(e) => setSelectedDevStudentId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 outline-none focus:border-indigo-500 transition-colors"
          >
            {availableStudents.map((st) => (
              <option key={st.id} value={st.id}>
                {st.fullName} ({st.studentId}) — {st.faculty}
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Read-Only Authenticated Student Profile */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              STUDENT PROFILE (AUTHENTICATED)
            </h2>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-semibold">
              Read-Only Identity
            </span>
          </div>

          {profileLoading ? (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 animate-pulse space-y-2">
              <div className="h-4 bg-slate-800 rounded w-1/2" />
              <div className="h-4 bg-slate-800 rounded w-3/4" />
            </div>
          ) : profile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Full Name</span>
                <span className="font-bold text-slate-200 text-sm">{profile.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Student ID</span>
                <span className="font-mono font-bold text-slate-200 text-sm">{profile.studentId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Faculty / Major</span>
                <span className="text-slate-300 font-medium">
                  {profile.faculty} ({profile.major})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Academic Year</span>
                <span className="text-slate-300 font-medium">Year {profile.year}</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* SECTION 2: Photo Proof Upload */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              PHOTO PROOF <span className="text-rose-400">*</span>
            </label>
            <span className="text-[10px] text-slate-500">Max 5MB (JPG, PNG, WEBP)</span>
          </div>

          {photoPreviewUrl ? (
            <div className="relative p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center space-y-3">
              <div className="relative w-full max-h-56 overflow-hidden rounded-xl border border-slate-800 flex items-center justify-center bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreviewUrl}
                  alt="Proof preview"
                  className="max-h-56 object-contain rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3 w-full">
                <label className="flex-1 py-2 px-3 text-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors">
                  Replace Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="py-2 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl bg-slate-950/60 hover:bg-slate-950 cursor-pointer transition-all space-y-2 text-center group">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xl group-hover:scale-110 transition-transform">
                📷
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-200">Take or Select Photo Proof</p>
                <p className="text-xs text-slate-500">Click to browse or use device camera</p>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          )}

          {photoError && <p className="text-xs text-rose-400 font-medium">{photoError}</p>}
        </div>

        {/* SECTION 3: Recommendation / Feedback */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              RECOMMENDATION / FEEDBACK <span className="text-slate-500 font-normal">(OPTIONAL)</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono">{feedback.length}/1000</span>
          </div>

          <textarea
            rows={3}
            maxLength={1000}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your thoughts or recommendations regarding this event..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={submitting || !photoFile}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-xl flex items-center justify-center gap-2 ${
            submitting || !photoFile
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
              : isCheckIn
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
          }`}
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <span>Submitting Attendance...</span>
            </>
          ) : (
            <span>{isCheckIn ? 'Submit Check-In Attendance' : 'Submit Check-Out Attendance'}</span>
          )}
        </button>
      </form>
    </div>
  );
}
