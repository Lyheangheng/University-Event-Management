'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { initLiff, LiffState, getLiffFriendship, requestLiffFriendship } from '../../../lib/liff';
import { verifyLineToken, linkStudentAccount } from '../../../lib/attendance-api';

function LiffSessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [liffInfo, setLiffInfo] = useState<LiffState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lineLinked, setLineLinked] = useState<boolean>(false);
  const [lineDisplayName, setLineDisplayName] = useState<string | null>(null);
  const [studentAccessToken, setStudentAccessToken] = useState<string | null>(null);
  const [linkingLine, setLinkingLine] = useState<boolean>(false);
  const [linkInputStudentId, setLinkInputStudentId] = useState<string>('');
  const [lineNotice, setLineNotice] = useState<string | null>(null);

  // LINE Official Account Friendship state
  const [isLineFriend, setIsLineFriend] = useState<boolean | null>(null);
  const [checkingFriendship, setCheckingFriendship] = useState<boolean>(false);
  const [requestingFriendship, setRequestingFriendship] = useState<boolean>(false);

  const checkFriendship = async () => {
    setCheckingFriendship(true);
    try {
      const res = await getLiffFriendship();
      if (res !== null) {
        setIsLineFriend(res.friendFlag);
      } else {
        setIsLineFriend(true);
      }
    } catch (err) {
      setIsLineFriend(true);
    } finally {
      setCheckingFriendship(false);
    }
  };

  const handleAddFriend = async () => {
    setRequestingFriendship(true);
    try {
      await requestLiffFriendship();
      const updated = await getLiffFriendship();
      if (updated && updated.friendFlag) {
        setIsLineFriend(true);
        setLineNotice('ขอบคุณที่เพิ่มเพื่อนกับบัญชีทางการของระบบกิจกรรมมหาวิทยาลัย!');
      } else {
        setIsLineFriend(false);
        setLineNotice('กรุณาเพิ่มเพื่อนหรือเปิดรับข้อความจากบัญชีทางการของมหาวิทยาลัยเพื่อรับข่าวสารการแจ้งเตือน');
      }
    } catch (err) {
      setLineNotice('ไม่สามารถตรวจสอบการเชื่อมต่อบัญชี LINE ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setRequestingFriendship(false);
    }
  };

  useEffect(() => {
    // Check if session token is provided via query parameter (e.g. ?token=xxx or ?sessionToken=xxx)
    const tokenParam = searchParams?.get('token') || searchParams?.get('sessionToken');
    if (tokenParam) {
      router.replace(`/attendance/session/${encodeURIComponent(tokenParam)}`);
      return;
    }

    async function handleLiffEntry() {
      setLoading(true);
      try {
        const state = await initLiff();
        setLiffInfo(state);

        if (state.idToken) {
          const verified = await verifyLineToken(state.idToken);
          setLineLinked(verified.linked);
          if (verified.accessToken) {
            localStorage.setItem('student_access_token', verified.accessToken);
            setStudentAccessToken(verified.accessToken);
          }
          if (verified.displayName) {
            setLineDisplayName(verified.displayName);
          }
          await checkFriendship();
        }
      } catch (err: any) {
        console.warn('LIFF Entry Point initialization warning:', err);
      } finally {
        setLoading(false);
      }
    }

    handleLiffEntry();
  }, [searchParams, router]);

  const handleLinkAccount = async () => {
    if (!liffInfo?.idToken || !linkInputStudentId.trim()) return;
    setLinkingLine(true);
    setLineNotice(null);
    try {
      const result = await linkStudentAccount(liffInfo.idToken, linkInputStudentId.trim());
      if (result.linked) {
        setLineLinked(true);
        if (result.accessToken) {
          localStorage.setItem('student_access_token', result.accessToken);
          setStudentAccessToken(result.accessToken);
        }
        setLineNotice('เชื่อมต่อบัญชี LINE เรียบร้อยแล้ว! คุณสามารถสแกน QR Code เพื่อลงชื่อเข้าร่วมกิจกรรมได้ทันที');
      }
    } catch (err: any) {
      setLineNotice(err.message || 'ไม่สามารถเชื่อมต่อบัญชี LINE ได้');
    } finally {
      setLinkingLine(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-pulse select-none space-y-4 font-sans">
        <div className="w-12 h-12 rounded-full border-4 border-university-700 border-t-transparent animate-spin" />
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-slate-800">กำลังเชื่อมต่อกับ LINE...</h2>
          <p className="text-xs text-slate-500">กรุณารอสักครู่ขณะระบบกำลังตรวจสอบการยืนยันตัวตน</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 py-8 select-none font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
        {/* Header Icon */}
        <div className="w-14 h-14 mx-auto rounded-xl bg-university-50 border border-university-200/60 flex items-center justify-center text-university-800 shrink-0">
          <svg className="w-7 h-7 text-university-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            เชื่อมต่อ LINE / LIFF แล้ว
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            พอร์ตัลลงชื่อเข้าร่วมกิจกรรม
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm">
            {lineDisplayName ? `ยินดีต้อนรับ คุณ ${lineDisplayName}!` : 'ยืนยันตัวตนผ่าน LINE เรียบร้อยแล้ว'}
          </p>
        </div>

        {/* Account Linking Status */}
        {liffInfo?.idToken && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-600">การยืนยันตัวตน LINE:</span>
              <span className="text-emerald-700 font-bold">ตรวจสอบแล้ว</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-600">ข้อมูลนักศึกษามหาวิทยาลัย:</span>
              <span className={lineLinked ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>
                {lineLinked ? 'เชื่อมต่อเรียบร้อยแล้ว' : 'ยังไม่ได้เชื่อมต่อ'}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-600">เพื่อนบัญชีทางการ (LINE OA):</span>
              <span className={isLineFriend ? 'text-emerald-700 font-bold' : 'text-slate-700 font-bold'}>
                {isLineFriend === null ? 'กำลังตรวจสอบ...' : isLineFriend ? 'เพิ่มเพื่อนแล้ว' : 'ยังไม่ได้เพิ่มเพื่อน'}
              </span>
            </div>

            {isLineFriend === false && (
              <div className="pt-2 space-y-2 border-t border-slate-200">
                <p className="text-slate-700 text-xs leading-relaxed">
                  เพิ่มเพื่อนบัญชี LINE มหาวิทยาลัย เพื่อรับข่าวสารกิจกรรม การแจ้งเตือนเช็กอิน และเช็กเอาต์
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddFriend}
                    disabled={requestingFriendship}
                    className="flex-1 py-2 px-3 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {requestingFriendship ? 'กำลังเชื่อมต่อ...' : 'เพิ่มเพื่อน LINE Official'}
                  </button>
                  <button
                    type="button"
                    onClick={checkFriendship}
                    disabled={checkingFriendship}
                    className="py-2 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {checkingFriendship ? '...' : 'ตรวจสอบอีกครั้ง'}
                  </button>
                </div>
              </div>
            )}

            {!lineLinked && (
              <div className="pt-2 space-y-2">
                <p className="text-amber-800 text-xs font-medium">
                  เชื่อมต่อบัญชี LINE ของคุณกับรหัสนักศึกษามหาวิทยาลัย:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={linkInputStudentId}
                    onChange={(e) => setLinkInputStudentId(e.target.value)}
                    placeholder="กรอกรหัสนักศึกษา (เช่น STD-66001)"
                    className="flex-1 bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 outline-none focus:border-university-700 focus:ring-1 focus:ring-university-700"
                  />
                  <button
                    type="button"
                    onClick={handleLinkAccount}
                    disabled={linkingLine || !linkInputStudentId.trim()}
                    className="px-4 py-2.5 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
                  >
                    {linkingLine ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อ'}
                  </button>
                </div>
              </div>
            )}

            {lineNotice && (
              <p className="text-xs text-university-800 pt-1 font-medium">{lineNotice}</p>
            )}
          </div>
        )}

        {/* QR Scan / Attendance Guidance Notice */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 text-left space-y-2">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            ขั้นตอนการลงชื่อเข้าร่วมกิจกรรม:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
            <li>สแกน <strong>QR Code สำหรับลงชื่อเข้าร่วมกิจกรรม</strong> ที่แสดงบนหน้าจอสถานที่จัดงาน</li>
            <li>ระบบจะนำท่านไปยังแบบฟอร์มลงชื่อสำหรับรอบกิจกรรมนั้นๆ</li>
            <li>แนบรูปภาพหลักฐานการเข้าร่วมและกดส่งข้อมูล</li>
          </ol>
        </div>

        {/* Navigation Action */}
        <div className="pt-2 space-y-2">
          <Link
            href="/events"
            className="inline-block w-full py-3 px-5 rounded-lg bg-university-700 hover:bg-university-800 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            เลือกดูรายการกิจกรรม
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LiffSessionEntryPoint() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 animate-pulse select-none space-y-4 font-sans">
          <div className="w-12 h-12 rounded-full border-4 border-university-700 border-t-transparent animate-spin" />
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-slate-800">กำลังโหลดระบบ...</h2>
          </div>
        </div>
      }
    >
      <LiffSessionContent />
    </Suspense>
  );
}
