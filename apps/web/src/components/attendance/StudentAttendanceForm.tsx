'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import {
  SessionValidationData,
  StudentProfile,
  AttendanceSubmissionResult,
  fetchStudentProfile,
  fetchSessionByToken,
  submitAttendance,
  verifyLineToken,
  linkStudentAccount,
} from '../../lib/attendance-api';
import { initLiff, LiffState } from '../../lib/liff';
import { formatEventDate, formatTimeRange } from '../../lib/formatters';

interface StudentAttendanceFormProps {
  sessionData: SessionValidationData;
}

export function StudentAttendanceForm({ sessionData: initialSessionData }: StudentAttendanceFormProps) {
  const [sessionData, setSessionData] = useState<SessionValidationData>(initialSessionData);
  const { sessionType, event, token } = sessionData;
  const isCheckIn = sessionType === 'CHECK_IN';

  // Profile state
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [availableStudents, setAvailableStudents] = useState<StudentProfile[]>([]);
  const [selectedDevStudentId, setSelectedDevStudentId] = useState<string>('');
  const [profileLoading, setProfileLoading] = useState<boolean>(true);

  // Student Access Token state (App JWT)
  const [studentAccessToken, setStudentAccessToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('student_access_token');
    }
    return null;
  });

  // LINE & LIFF Integration state
  const [liffInfo, setLiffInfo] = useState<LiffState | null>(null);
  const [lineLinked, setLineLinked] = useState<boolean>(false);
  const [lineDisplayName, setLineDisplayName] = useState<string | null>(null);
  const [linkingLine, setLinkingLine] = useState<boolean>(false);
  const [lineNotice, setLineNotice] = useState<string | null>(null);
  const [linkInputStudentId, setLinkInputStudentId] = useState<string>('');

  // Form input states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  // Submission states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<AttendanceSubmissionResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Load student profile & refresh session data for student
  const loadProfileAndSession = useCallback(async (devStudentId?: string, tok?: string) => {
    setProfileLoading(true);
    try {
      const activeToken = tok || studentAccessToken || undefined;
      const [profileRes, refreshedSession] = await Promise.all([
        fetchStudentProfile(devStudentId, activeToken),
        fetchSessionByToken(token, devStudentId, activeToken).catch(() => null),
      ]);
      setProfile(profileRes.currentStudent);
      setAvailableStudents(profileRes.availableStudents);
      if (!selectedDevStudentId && profileRes.currentStudent) {
        setSelectedDevStudentId(profileRes.currentStudent.id);
      }
      if (refreshedSession) {
        setSessionData(refreshedSession);
      }
    } catch (err) {
      console.error('Failed to load student profile/session:', err);
    } finally {
      setProfileLoading(false);
    }
  }, [token, selectedDevStudentId, studentAccessToken]);

  useEffect(() => {
    loadProfileAndSession(selectedDevStudentId, studentAccessToken || undefined);
  }, [selectedDevStudentId, studentAccessToken, loadProfileAndSession]);

  // Initialize LIFF and verify LINE Token if present
  useEffect(() => {
    async function checkLiff() {
      const state = await initLiff();
      setLiffInfo(state);
      if (state.idToken) {
        try {
          const verified = await verifyLineToken(state.idToken);
          setLineLinked(verified.linked);
          if (verified.accessToken) {
            localStorage.setItem('student_access_token', verified.accessToken);
            setStudentAccessToken(verified.accessToken);
          }
          if (verified.displayName) {
            setLineDisplayName(verified.displayName);
          }
          if (verified.linked && verified.student) {
            setProfile(verified.student);
          }
        } catch (err) {
          console.warn('LINE Token Verification Warning:', err);
        }
      }
    }
    checkLiff();
  }, []);

  const handleLinkLineAccount = async (targetStudentId?: string) => {
    const studentIdToLink = targetStudentId || linkInputStudentId || profile?.studentId;
    if (!liffInfo?.idToken || !studentIdToLink) return;

    setLinkingLine(true);
    setLineNotice(null);
    try {
      const result = await linkStudentAccount(liffInfo.idToken, studentIdToLink);
      if (result.linked) {
        setLineLinked(true);
        if (result.accessToken) {
          localStorage.setItem('student_access_token', result.accessToken);
          setStudentAccessToken(result.accessToken);
        }
        if (result.student) {
          setProfile(result.student);
        }
        setLineNotice('LINE account linked successfully! Student identity verified for attendance.');
      }
    } catch (err: any) {
      setLineNotice(err.message || 'Failed to link LINE account.');
    } finally {
      setLinkingLine(false);
    }
  };

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
        studentAccessToken || undefined,
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

  // Existing attendance record shortcuts
  const existingAtt = sessionData.existingAttendance;
  const hasCompletedAttendance = existingAtt?.status === 'COMPLETED' || Boolean(existingAtt?.checkOutTime);
  const hasCheckedIn = Boolean(existingAtt?.checkInTime);

  // Render SUCCESS State from recent submission
  if (submissionResult) {
    return (
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in text-center select-none">
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

  // Already COMPLETED Attendance State
  if (hasCompletedAttendance) {
    return (
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in text-center select-none">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 text-3xl font-black shadow-lg">
          ✓
        </div>

        <div className="space-y-2">
          <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest">
            ATTENDANCE COMPLETED
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
            Attendance Fully Recorded
          </h2>
          <p className="text-slate-400 text-sm">
            Event: <strong className="text-slate-200">{event.title}</strong>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
            <span>Student Name:</span>
            <span className="text-slate-200 font-bold">{profile?.fullName || ''}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
            <span>Student ID:</span>
            <span className="text-slate-200 font-mono font-bold">{profile?.studentId || ''}</span>
          </div>
          {existingAtt?.checkInTime && (
            <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
              <span>Check-In Time:</span>
              <span className="text-slate-200 font-mono">
                {new Date(existingAtt.checkInTime).toLocaleString('en-GB')}
              </span>
            </div>
          )}
          {existingAtt?.checkOutTime && (
            <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
              <span>Check-Out Time:</span>
              <span className="text-slate-200 font-mono">
                {new Date(existingAtt.checkOutTime).toLocaleString('en-GB')}
              </span>
            </div>
          )}
          <div className="flex justify-between text-slate-400">
            <span>Attendance Status:</span>
            <span className="font-bold text-emerald-400">COMPLETED</span>
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

  // Check-In session when ALREADY checked in (Waiting for Checkout)
  if (isCheckIn && hasCheckedIn) {
    return (
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in text-center select-none">
        <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 text-3xl font-black shadow-lg">
          ⏳
        </div>

        <div className="space-y-2">
          <span className="px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest">
            CHECK-IN RECORDED • INCOMPLETE
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
            Already Checked In
          </h2>
          <p className="text-slate-400 text-sm">
            Event: <strong className="text-slate-200">{event.title}</strong>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
            <span>Student Name:</span>
            <span className="text-slate-200 font-bold">{profile?.fullName || ''}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
            <span>Check-In Recorded:</span>
            <span className="text-slate-200 font-mono font-bold">
              {existingAtt?.checkInTime ? new Date(existingAtt.checkInTime).toLocaleString('en-GB') : ''}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Status:</span>
            <span className="font-bold text-amber-400">INCOMPLETE</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 text-left space-y-1.5">
          <p className="font-bold text-slate-300">📌 Next Step for Attendance Completion:</p>
          <p>
            Please wait until the <strong>Check-Out Window</strong> (the final 15 minutes of the event) to scan the Check-Out QR code on the projector display and complete your attendance.
          </p>
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

  // Warning: Checkout session accessed without prior Check-In
  const missingCheckInForCheckout = !isCheckIn && !hasCheckedIn;

  const formattedStartTime = new Date(sessionData.startTime).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const formattedEndTime = new Date(sessionData.endTime).toLocaleTimeString('en-GB', {
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

      {/* Missing Check-In Warning Banner for Checkout */}
      {missingCheckInForCheckout && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm space-y-1">
          <p className="font-bold flex items-center gap-2">
            <span>⚠️</span> Check-In Required Before Check-Out
          </p>
          <p className="text-slate-300">
            You must check in during the check-in window before submitting check-out. Direct check-out without prior check-in is not permitted.
          </p>
        </div>
      )}

      {/* Unlinked LINE Account Warning Banner */}
      {liffInfo?.idToken && !lineLinked && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="text-amber-400 text-lg font-bold">⚠️</span>
            <div className="space-y-1 text-xs">
              <span className="font-bold text-amber-300 block">LINE Account Unlinked</span>
              <p className="text-slate-300 leading-relaxed">
                Your LINE account ({lineDisplayName || 'LINE User'}) is not yet linked to a university student record. Please enter your Student ID below to link your account before submitting attendance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={linkInputStudentId}
              onChange={(e) => setLinkInputStudentId(e.target.value)}
              placeholder="Enter Student ID (e.g. STD-66001)"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => handleLinkLineAccount()}
              disabled={linkingLine || !linkInputStudentId.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50 shrink-0"
            >
              {linkingLine ? 'Linking...' : 'Link Account'}
            </button>
          </div>
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

              {/* LINE Account Link Banner */}
              {liffInfo?.idToken && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${lineLinked ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                    <span className="text-xs text-slate-300">
                      LINE Account Status:{' '}
                      {lineLinked ? (
                        <strong className="text-emerald-400">Linked ({lineDisplayName || 'LINE User'})</strong>
                      ) : (
                        <strong className="text-amber-400">Unlinked</strong>
                      )}
                    </span>
                  </div>

                  {!lineLinked && (
                    <button
                      type="button"
                      onClick={() => handleLinkLineAccount()}
                      disabled={linkingLine}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
                    >
                      {linkingLine ? 'Linking Account...' : 'Link LINE Account'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {lineNotice && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
              {lineNotice}
            </div>
          )}
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
                    disabled={missingCheckInForCheckout}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="py-2 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors"
                  disabled={missingCheckInForCheckout}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl bg-slate-950/60 hover:bg-slate-950 cursor-pointer transition-all space-y-2 text-center group ${
              missingCheckInForCheckout ? 'opacity-50 pointer-events-none' : ''
            }`}>
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
                disabled={missingCheckInForCheckout}
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
            disabled={missingCheckInForCheckout}
            placeholder="Share your thoughts or recommendations regarding this event..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors resize-none disabled:opacity-50"
          />
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={submitting || !photoFile || missingCheckInForCheckout}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-xl flex items-center justify-center gap-2 ${
            submitting || !photoFile || missingCheckInForCheckout
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
