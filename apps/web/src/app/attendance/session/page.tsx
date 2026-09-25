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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 animate-pulse select-none space-y-4 font-sans">
        <div className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center animate-spin">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-400 border-t-transparent" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-slate-200">กำลังเชื่อมต่อกับ LINE...</h2>
          <p className="text-sm text-slate-400">กรุณารอสักครู่ขณะระบบกำลังตรวจสอบการยืนยันตัวตน</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 py-12 select-none font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        {/* Header Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl font-bold">
          📱
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            เชื่อมต่อ LINE / LIFF แล้ว
          </span>
          <h1 className="text-2xl font-black text-slate-100">
            พอร์ตัลลงชื่อเข้าร่วมกิจกรรม
          </h1>
          <p className="text-slate-400 text-sm">
            {lineDisplayName ? `ยินดีต้อนรับ คุณ ${lineDisplayName}!` : 'ยืนยันตัวตนผ่าน LINE เรียบร้อยแล้ว'}
          </p>
        </div>

        {/* Account Linking Status */}
        {liffInfo?.idToken && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">การยืนยันตัวตน LINE:</span>
              <span className="text-emerald-400 font-bold">ตรวจสอบแล้ว</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">ข้อมูลนักศึกษามหาวิทยาลัย:</span>
              <span className={lineLinked ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {lineLinked ? 'เชื่อมต่อเรียบร้อยแล้ว' : 'ยังไม่ได้เชื่อมต่อ'}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">เพื่อนบัญชีทางการ (LINE OA):</span>
              <span className={isLineFriend ? 'text-emerald-400 font-bold' : 'text-indigo-400 font-bold'}>
                {isLineFriend === null ? 'กำลังตรวจสอบ...' : isLineFriend ? 'เพิ่มเพื่อนแล้ว' : 'ยังไม่ได้เพิ่มเพื่อน'}
              </span>
            </div>

            {isLineFriend === false && (
              <div className="pt-2 space-y-2 border-t border-slate-800/80">
                <p className="text-indigo-300 text-xs leading-relaxed">
                  เพิ่มเพื่อนบัญชี LINE มหาวิทยาลัย เพื่อรับข่าวสารกิจกรรม การแจ้งเตือนเช็กอิน และเช็กเอาต์
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddFriend}
                    disabled={requestingFriendship}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {requestingFriendship ? 'กำลังเชื่อมต่อ...' : '➕ เพิ่มเพื่อน LINE Official'}
                  </button>
                  <button
                    type="button"
                    onClick={checkFriendship}
                    disabled={checkingFriendship}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {checkingFriendship ? '...' : '🔄 ตรวจสอบอีกครั้ง'}
                  </button>
                </div>
              </div>
            )}

            {!lineLinked && (
              <div className="pt-2 space-y-2">
                <p className="text-amber-300 text-xs">
                  เชื่อมต่อบัญชี LINE ของคุณกับรหัสนักศึกษามหาวิทยาลัย:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={linkInputStudentId}
                    onChange={(e) => setLinkInputStudentId(e.target.value)}
                    placeholder="กรอกรหัสนักศึกษา (เช่น STD-66001)"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleLinkAccount}
                    disabled={linkingLine || !linkInputStudentId.trim()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                  >
                    {linkingLine ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อ'}
                  </button>
                </div>
              </div>
            )}

            {lineNotice && (
              <p className="text-xs text-indigo-300 pt-1 font-medium">{lineNotice}</p>
            )}
          </div>
        )}

        {/* QR Scan / Attendance Guidance Notice */}
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200 text-left space-y-2">
          <p className="font-bold flex items-center gap-1.5 text-indigo-300">
            <span>📌</span> ขั้นตอนการลงชื่อเข้าร่วมกิจกรรม:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>สแกน <strong>QR Code สำหรับลงชื่อเข้าร่วมกิจกรรม</strong> ที่แสดงบนหน้าจอสถานที่จัดงาน</li>
            <li>ระบบจะนำท่านไปยังแบบฟอร์มลงชื่อสำหรับรอบกิจกรรมนั้นๆ</li>
            <li>แนบรูปภาพหลักฐานการเข้าร่วมและกดส่งข้อมูล</li>
          </ol>
        </div>

        {/* Navigation Action */}
        <div className="pt-2 space-y-2">
          <Link
            href="/events"
            className="inline-block w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20"
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
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 animate-pulse select-none space-y-4 font-sans">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center animate-spin">
            <div className="w-8 h-8 rounded-full border-4 border-indigo-400 border-t-transparent" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-200">กำลังโหลดระบบ...</h2>
          </div>
        </div>
      }
    >
      <LiffSessionContent />
    </Suspense>
  );
}
