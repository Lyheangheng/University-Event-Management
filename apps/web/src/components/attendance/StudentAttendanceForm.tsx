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
import { initLiff, LiffState, getLiffFriendship, requestLiffFriendship } from '../../lib/liff';
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

  // LINE Official Account Friendship state
  const [isLineFriend, setIsLineFriend] = useState<boolean | null>(null);
  const [checkingFriendship, setCheckingFriendship] = useState<boolean>(false);
  const [requestingFriendship, setRequestingFriendship] = useState<boolean>(false);
  const [friendshipNotice, setFriendshipNotice] = useState<string | null>(null);

  // Check LINE Official Account friendship status via LIFF SDK
  const checkFriendshipStatus = useCallback(async () => {
    setCheckingFriendship(true);
    try {
      const res = await getLiffFriendship();
      if (res !== null) {
        setIsLineFriend(res.friendFlag);
      } else {
        setIsLineFriend(true);
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Friendship status check warning:', err);
      }
      setIsLineFriend(true);
    } finally {
      setCheckingFriendship(false);
    }
  }, []);

  const handleRequestFriendship = async () => {
    setRequestingFriendship(true);
    setFriendshipNotice(null);
    try {
      await requestLiffFriendship();
      const updated = await getLiffFriendship();
      if (updated && updated.friendFlag) {
        setIsLineFriend(true);
        setFriendshipNotice('ขอบคุณที่เพิ่มเพื่อนกับบัญชีทางการของระบบกิจกรรมมหาวิทยาลัย!');
      } else {
        setIsLineFriend(false);
        setFriendshipNotice('กรุณาเพิ่มเพื่อนหรือเปิดรับข้อความจากบัญชีทางการของมหาวิทยาลัยเพื่อรับข่าวสารการแจ้งเตือน');
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('LINE Friendship Request Warning:', err);
      }
      setFriendshipNotice('ไม่สามารถตรวจสอบการเชื่อมต่อบัญชี LINE ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setRequestingFriendship(false);
    }
  };

  // Form input states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  // Submission states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<AttendanceSubmissionResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Ensure studentAccessToken state is synced with localStorage on mount (Direct QR navigation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('student_access_token');
      if (stored && stored !== studentAccessToken) {
        setStudentAccessToken(stored);
      }
    }
  }, [studentAccessToken]);

  // Load student profile & refresh session data for student
  const loadProfileAndSession = useCallback(async (devStudentId?: string, tok?: string) => {
    setProfileLoading(true);
    try {
      const isDev = process.env.NODE_ENV === 'development';
      const devParam = isDev ? devStudentId : undefined;
      const activeToken = tok || studentAccessToken || (typeof window !== 'undefined' ? localStorage.getItem('student_access_token') : null) || undefined;
      
      const [profileRes, refreshedSession] = await Promise.all([
        fetchStudentProfile(devParam, activeToken).catch(() => null),
        fetchSessionByToken(token, devParam, activeToken).catch(() => null),
      ]);

      if (profileRes && profileRes.currentStudent) {
        setProfile(profileRes.currentStudent);
        setAvailableStudents(isDev ? profileRes.availableStudents : []);
        if (isDev && !selectedDevStudentId && profileRes.currentStudent) {
          setSelectedDevStudentId(profileRes.currentStudent.id);
        }
      } else {
        setProfile(null);
        setAvailableStudents([]);
      }

      if (refreshedSession) {
        setSessionData(refreshedSession);
      }
    } catch (err) {
      console.error('Failed to load student profile/session:', err);
      setProfile(null);
      setAvailableStudents([]);
    } finally {
      setProfileLoading(false);
    }
  }, [token, selectedDevStudentId, studentAccessToken]);

  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    const devParam = isDev ? selectedDevStudentId : undefined;
    loadProfileAndSession(devParam, studentAccessToken || undefined);
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
          } else {
            localStorage.removeItem('student_access_token');
            setStudentAccessToken(null);
          }
          if (verified.displayName) {
            setLineDisplayName(verified.displayName);
          }
          if (verified.linked && verified.student) {
            setProfile(verified.student);
          } else {
            setProfile(null);
          }
          await checkFriendshipStatus();
        } catch (err) {
          console.warn('LINE Token Verification Warning:', err);
        }
      }
    }
    checkLiff();
  }, [checkFriendshipStatus]);

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
        setLineNotice('เชื่อมต่อบัญชี LINE เรียบร้อยแล้ว!');
      }
    } catch (err: any) {
      setLineNotice(err.message || 'ไม่สามารถเชื่อมต่อบัญชี LINE ได้');
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
      setPhotoError('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (JPG, PNG, WEBP)');
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      setPhotoError('ขนาดไฟล์เกิน 5MB กรุณาเลือกรูปภาพที่มีขนาดเล็กลง');
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
      setPhotoError('กรุณาแนบรูปภาพหลักฐานการเข้าร่วมกิจกรรม');
      return;
    }

    setSubmitting(true);
    try {
      const isDev = process.env.NODE_ENV === 'development';
      const activeToken = studentAccessToken || (typeof window !== 'undefined' ? localStorage.getItem('student_access_token') : null) || undefined;
      const devStudentIdToSend = isDev && selectedDevStudentId ? selectedDevStudentId : undefined;
      const result = await submitAttendance(
        token,
        photoFile,
        feedback,
        devStudentIdToSend,
        activeToken,
      );
      setSubmissionResult(result);
    } catch (err: any) {
      const msg = err.message || 'ไม่สามารถส่งข้อมูลการเข้าร่วมกิจกรรมได้ กรุณาลองใหม่อีกครั้ง';
      if (msg.includes('Student authentication required')) {
        setFormError('ไม่สามารถยืนยันตัวตนได้ กรุณาตรวจสอบการเชื่อมต่อบัญชี LINE ของคุณ');
      } else {
        setFormError(msg);
      }
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
      <div className="max-w-md sm:max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm text-center font-sans select-none">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase">
            {submissionResult.sessionType === 'CHECK_IN' ? 'ลงชื่อเช็กอินเรียบร้อย' : 'ลงชื่อเช็กเอาต์เรียบร้อย'}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {submissionResult.sessionType === 'CHECK_IN' ? 'ลงชื่อเข้าร่วมกิจกรรมเรียบร้อยแล้ว' : 'ลงชื่อออกจากกิจกรรมเรียบร้อยแล้ว'}
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            กิจกรรม: <strong className="text-slate-900">{submissionResult.eventTitle}</strong>
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs sm:text-sm">
          <div className="flex justify-between border-b border-slate-200 pb-2 text-slate-600">
            <span>ชื่อ-นามสกุล:</span>
            <span className="text-slate-900 font-bold">{submissionResult.studentName}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2 text-slate-600">
            <span>รหัสนักศึกษา:</span>
            <span className="text-slate-900 font-mono font-bold">{submissionResult.studentId}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2 text-slate-600">
            <span>เวลาที่บันทึก:</span>
            <span className="text-slate-900 font-mono">
              {new Date(submissionResult.recordedAt).toLocaleString('th-TH')}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>สถานะการเข้าร่วม:</span>
            <span
              className={`font-bold ${
                submissionResult.status === 'COMPLETED' ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {submissionResult.status === 'COMPLETED' ? 'สมบูรณ์' : 'เช็กอินแล้ว'}
            </span>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/events"
            className="inline-block w-full py-2.5 px-5 rounded-lg bg-university-700 hover:bg-university-800 text-white font-semibold text-xs sm:text-sm transition-colors shadow-sm"
          >
            กลับไปยังรายการกิจกรรมทั้งหมด
          </Link>
        </div>
      </div>
    );
  }

  // Already COMPLETED Attendance State
  if (hasCompletedAttendance) {
    return (
      <div className="max-w-md sm:max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm text-center font-sans select-none">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase">
            เข้าร่วมกิจกรรมสมบูรณ์แล้ว
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            คุณได้บันทึกการเข้าร่วมกิจกรรมนี้ครบถ้วนแล้ว
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            กิจกรรม: <strong className="text-slate-900">{event.title}</strong>
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs sm:text-sm">
          <div className="flex justify-between border-b border-slate-200 pb-2 text-slate-600">
            <span>ชื่อ-นามสกุล:</span>
            <span className="text-slate-900 font-bold">{profile?.fullName || ''}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2 text-slate-600">
            <span>รหัสนักศึกษา:</span>
            <span className="text-slate-900 font-mono font-bold">{profile?.studentId || ''}</span>
          </div>
          {existingAtt?.checkInTime && (
            <div className="flex justify-between border-b border-slate-200 pb-2 text-slate-600">
              <span>เวลาเช็กอิน:</span>
              <span className="text-slate-900 font-mono">
                {new Date(existingAtt.checkInTime).toLocaleString('th-TH')}
              </span>
            </div>
          )}
          {existingAtt?.checkOutTime && (
            <div className="flex justify-between border-b border-slate-200 pb-2 text-slate-600">
              <span>เวลาเช็กเอาต์:</span>
              <span className="text-slate-900 font-mono">
                {new Date(existingAtt.checkOutTime).toLocaleString('th-TH')}
              </span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>สถานะการเข้าร่วม:</span>
            <span className="font-bold text-emerald-700">สมบูรณ์</span>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/events"
            className="inline-block w-full py-2.5 px-5 rounded-lg bg-university-700 hover:bg-university-800 text-white font-semibold text-xs sm:text-sm transition-colors shadow-sm"
          >
            กลับไปยังรายการกิจกรรมทั้งหมด
          </Link>
        </div>
      </div>
    );
  }

  // Check-In session when ALREADY checked in (Waiting for Checkout)
  if (isCheckIn && hasCheckedIn) {
    return (
      <div className="max-w-md sm:max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm text-center font-sans select-none">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold uppercase">
            ลงชื่อเช็กอินแล้ว • รอเช็กเอาต์
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            คุณได้ลงชื่อเช็กอินเรียบร้อยแล้ว
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            กิจกรรม: <strong className="text-slate-900">{event.title}</strong>
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs sm:text-sm">
          <div className="flex justify-between border-b border-slate-200 pb-2 text-slate-600">
            <span>ชื่อ-นามสกุล:</span>
            <span className="text-slate-900 font-bold">{profile?.fullName || ''}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2 text-slate-600">
            <span>เวลาเช็กอินที่บันทึก:</span>
            <span className="text-slate-900 font-mono font-bold">
              {existingAtt?.checkInTime ? new Date(existingAtt.checkInTime).toLocaleString('th-TH') : ''}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>สถานะ:</span>
            <span className="font-bold text-amber-700">เช็กอินแล้ว (รอเช็กเอาต์)</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 text-left space-y-1">
          <p className="font-bold">ขั้นตอนถัดไปสำหรับการเข้าร่วม:</p>
          <p className="text-blue-800 leading-relaxed">
            กรุณารอจนกว่าจะถึงช่วงเวลาเช็กเอาต์ (ช่วงท้ายกิจกรรม) เพื่อสแกน QR Code เช็กเอาต์บนหน้าจอแสดงผลสถานที่จัดงาน เพื่อยืนยันการเข้าร่วมกิจกรรมสมบูรณ์
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/events"
            className="inline-block w-full py-2.5 px-5 rounded-lg bg-university-700 hover:bg-university-800 text-white font-semibold text-xs sm:text-sm transition-colors shadow-sm"
          >
            กลับไปยังรายการกิจกรรมทั้งหมด
          </Link>
        </div>
      </div>
    );
  }

  // Warning: Checkout session accessed without prior Check-In
  const missingCheckInForCheckout = !isCheckIn && !hasCheckedIn;

  const formattedStartTime = new Date(sessionData.startTime).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const formattedEndTime = new Date(sessionData.endTime).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="max-w-md sm:max-w-xl w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm font-sans select-none">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold uppercase ${
            isCheckIn
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isCheckIn ? 'bg-emerald-600' : 'bg-amber-600'
            }`}
          />
          {isCheckIn ? 'แบบฟอร์มลงชื่อเข้าร่วมกิจกรรม (เช็กอิน)' : 'แบบฟอร์มลงชื่อออกจากกิจกรรม (เช็กเอาต์)'}
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
          {event.title}
        </h1>

        <p className="text-slate-600 text-xs sm:text-sm">
          {event.location} • {formatEventDate(event.date)} ({formatTimeRange(event.startTime, event.endTime)})
        </p>

        <div className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
          ช่วงเวลาเปิดระบบ: {formattedStartTime} – {formattedEndTime} น.
        </div>
      </div>

      {/* Form Error Banner */}
      {formError && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formError}</span>
        </div>
      )}

      {/* Missing Check-In Warning Banner for Checkout */}
      {missingCheckInForCheckout && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-1">
          <p className="font-bold flex items-center gap-2 text-amber-950">
            กรุณาลงชื่อเช็กอินก่อนลงชื่อเช็กเอาต์
          </p>
          <p className="text-amber-800">
            คุณต้องลงชื่อเช็กอินในช่วงเวลาเช็กอินก่อน จึงจะสามารถลงชื่อเช็กเอาต์ได้
          </p>
        </div>
      )}

      {/* Unlinked LINE Account Warning Banner */}
      {liffInfo?.idToken && !lineLinked && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
          <div className="flex items-start gap-2.5">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="space-y-1 text-xs">
              <span className="font-bold text-amber-900 block">ยังไม่ได้เชื่อมต่อบัญชี LINE</span>
              <p className="text-amber-800 leading-relaxed">
                บัญชี LINE ของคุณ ({lineDisplayName || 'ผู้ใช้งาน LINE'}) ยังไม่ได้เชื่อมต่อกับข้อมูลนักศึกษา กรุณากรอกรหัสนักศึกษาด้านล่างเพื่อเชื่อมต่อบัญชีก่อนส่งข้อมูลการเข้าร่วม
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={linkInputStudentId}
              onChange={(e) => setLinkInputStudentId(e.target.value)}
              placeholder="กรอกรหัสนักศึกษา (เช่น STD-66001)"
              className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 outline-none focus:border-university-700 focus:ring-1 focus:ring-university-700"
            />
            <button
              type="button"
              onClick={() => handleLinkLineAccount()}
              disabled={linkingLine || !linkInputStudentId.trim()}
              className="px-3.5 py-2 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
            >
              {linkingLine ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อบัญชี'}
            </button>
          </div>
        </div>
      )}

      {/* LINE Official Account Friendship Banner */}
      {liffInfo?.idToken && isLineFriend === false && (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-start gap-2.5">
            <svg className="w-5 h-5 text-university-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <div className="space-y-1 text-xs">
              <span className="font-bold text-slate-900 block">เพิ่มเพื่อนบัญชีทางการ &quot;University Events&quot;</span>
              <p className="text-slate-600 leading-relaxed">
                เพิ่มเพื่อนบัญชี LINE มหาวิทยาลัย เพื่อรับข่าวสารกิจกรรม การแจ้งเตือนเช็กอิน และเช็กเอาต์
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleRequestFriendship}
              disabled={requestingFriendship}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
            >
              {requestingFriendship ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>กำลังเชื่อมต่อกับ LINE...</span>
                </>
              ) : (
                <span>เพิ่มเพื่อน LINE Official</span>
              )}
            </button>
            <button
              type="button"
              onClick={checkFriendshipStatus}
              disabled={checkingFriendship}
              className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
            >
              {checkingFriendship ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะอีกครั้ง'}
            </button>
          </div>

          {friendshipNotice && (
            <p className="text-xs text-university-800 font-medium pt-1">{friendshipNotice}</p>
          )}
        </div>
      )}

      {/* Dev Mode Student Switcher (Development Only) */}
      {process.env.NODE_ENV === 'development' && availableStudents.length > 1 && (
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            <span>DEV TEST SWITCHER</span>
            <span>Local Test Mode</span>
          </div>
          <select
            value={selectedDevStudentId}
            onChange={(e) => setSelectedDevStudentId(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg p-2.5 outline-none focus:border-university-700 transition-colors"
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              ข้อมูลนักศึกษา (ยืนยันตัวตนแล้ว)
            </h2>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium border border-slate-200">
              ยืนยันตัวตนแล้ว
            </span>
          </div>

          {profileLoading ? (
            <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center space-y-3">
              <div className="w-6 h-6 border-2 border-university-700 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-600">
                กำลังตรวจสอบข้อมูลนักศึกษาผ่าน LINE...
              </p>
            </div>
          ) : profile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">ชื่อ-นามสกุล</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm">{profile.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">รหัสนักศึกษา</span>
                <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{profile.studentId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">คณะ / สาขาวิชา</span>
                <span className="text-slate-700 font-medium">
                  {profile.faculty} ({profile.major})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">ชั้นปี</span>
                <span className="text-slate-700 font-medium">ชั้นปีที่ {profile.year}</span>
              </div>

              {/* LINE Account Link Banner */}
              {liffInfo?.idToken && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${lineLinked ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                    <span className="text-xs text-slate-700">
                      สถานะบัญชี LINE:{' '}
                      {lineLinked ? (
                        <strong className="text-emerald-700">เชื่อมต่อแล้ว ({lineDisplayName || 'ผู้ใช้งาน LINE'})</strong>
                      ) : (
                        <strong className="text-amber-700">ยังไม่ได้เชื่อมต่อ</strong>
                      )}
                    </span>
                  </div>

                  {!lineLinked && (
                    <button
                      type="button"
                      onClick={() => handleLinkLineAccount()}
                      disabled={linkingLine}
                      className="px-3 py-1.5 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {linkingLine ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อบัญชี LINE'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {lineNotice && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-university-800 text-xs font-medium">
              {lineNotice}
            </div>
          )}
        </div>

        {/* SECTION 2: Photo Proof Upload */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              รูปภาพหลักฐานการเข้าร่วมกิจกรรม <span className="text-red-600">*</span>
            </label>
            <span className="text-[10px] text-slate-500">ขนาดสูงสุด 5MB (JPG, PNG, WEBP)</span>
          </div>

          {photoPreviewUrl ? (
            <div className="relative p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center space-y-3">
              <div className="relative w-full max-h-56 overflow-hidden rounded-md border border-slate-200 flex items-center justify-center bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreviewUrl}
                  alt="ตัวอย่างรูปภาพหลักฐาน"
                  className="max-h-56 object-contain rounded-md"
                />
              </div>

              <div className="flex items-center gap-3 w-full">
                <label className="flex-1 py-2 px-3 text-center rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors">
                  เปลี่ยนรูปภาพ
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
                  className="py-2 px-4 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors border border-red-200"
                  disabled={missingCheckInForCheckout}
                >
                  ลบรูปภาพ
                </button>
              </div>
            </div>
          ) : (
            <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-university-700 rounded-lg bg-slate-50 hover:bg-slate-100/60 cursor-pointer transition-colors space-y-2 text-center group ${
              missingCheckInForCheckout ? 'opacity-50 pointer-events-none' : ''
            }`}>
              <div className="w-10 h-10 rounded-lg bg-university-50 border border-university-200/60 flex items-center justify-center text-university-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800">ถ่ายภาพหรือเลือกรูปภาพหลักฐาน</p>
                <p className="text-[11px] text-slate-500">แตะเพื่อเลือกรูปภาพหรือเปิดกล้องถ่ายภาพ</p>
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

          {photoError && <p className="text-xs text-red-600 font-medium">{photoError}</p>}
        </div>

        {/* SECTION 3: Recommendation / Feedback */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              ข้อเสนอแนะ / ความคิดเห็น <span className="text-slate-400 font-normal">(ไม่บังคับ)</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono">{feedback.length}/1000</span>
          </div>

          <textarea
            rows={3}
            maxLength={1000}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={missingCheckInForCheckout}
            placeholder="แสดงความคิดเห็นหรือข้อเสนอแนะเกี่ยวกับกิจกรรมนี้..."
            className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-university-700 focus:ring-1 focus:ring-university-700 transition-colors resize-none disabled:opacity-50"
          />
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={submitting || !photoFile || missingCheckInForCheckout}
          className={`w-full py-3 px-5 rounded-lg font-semibold text-xs sm:text-sm tracking-wide transition-colors shadow-sm flex items-center justify-center gap-2 ${
            submitting || !photoFile || missingCheckInForCheckout
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-university-700 hover:bg-university-800 text-white'
          }`}
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>กำลังส่งข้อมูล...</span>
            </>
          ) : (
            <span>{isCheckIn ? 'ส่งข้อมูลลงชื่อเข้าร่วมกิจกรรม (เช็กอิน)' : 'ส่งข้อมูลลงชื่อออกจากกิจกรรม (เช็กเอาต์)'}</span>
          )}
        </button>
      </form>
    </div>
  );
}
