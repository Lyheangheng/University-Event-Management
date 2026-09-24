'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { initLiff, LiffState } from '../../../lib/liff';
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
        setLineNotice('LINE account linked successfully! You can now scan event QR codes to submit attendance.');
      }
    } catch (err: any) {
      setLineNotice(err.message || 'Failed to link LINE account.');
    } finally {
      setLinkingLine(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 animate-pulse select-none">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 mb-6" />
        <div className="w-48 h-6 bg-slate-800 rounded-full mb-4" />
        <div className="w-64 h-10 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 py-12 select-none">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        {/* Header Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl font-bold">
          📱
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            LINE / LIFF Connected
          </span>
          <h1 className="text-2xl font-black text-slate-100">
            Student Attendance Portal
          </h1>
          <p className="text-slate-400 text-sm">
            {lineDisplayName ? `Welcome, ${lineDisplayName}!` : 'LINE authentication initialized successfully.'}
          </p>
        </div>

        {/* Account Linking Status */}
        {liffInfo?.idToken && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">LINE Authentication:</span>
              <span className="text-emerald-400 font-bold">Verified</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">University Identity:</span>
              <span className={lineLinked ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {lineLinked ? 'Linked & Verified' : 'Unlinked'}
              </span>
            </div>

            {!lineLinked && (
              <div className="pt-2 space-y-2">
                <p className="text-amber-300 text-xs">
                  Link your LINE identity to your University Student ID:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={linkInputStudentId}
                    onChange={(e) => setLinkInputStudentId(e.target.value)}
                    placeholder="Enter Student ID (e.g. STD-66001)"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleLinkAccount}
                    disabled={linkingLine || !linkInputStudentId.trim()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                  >
                    {linkingLine ? 'Linking...' : 'Link'}
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
            <span>📌</span> How to Submit Event Attendance:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>Scan the active event <strong>Attendance QR Code</strong> displayed on the event projector or event page.</li>
            <li>You will be directed to your specific event attendance session.</li>
            <li>Upload your photo proof and submit attendance.</li>
          </ol>
        </div>

        {/* Navigation Action */}
        <div className="pt-2 space-y-2">
          <Link
            href="/events"
            className="inline-block w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/20"
          >
            Browse Active Events
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
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 animate-pulse select-none">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 mb-6" />
          <div className="w-48 h-6 bg-slate-800 rounded-full mb-4" />
          <div className="w-64 h-10 bg-slate-800 rounded-xl" />
        </div>
      }
    >
      <LiffSessionContent />
    </Suspense>
  );
}
