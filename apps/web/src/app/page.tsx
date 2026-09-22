import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col items-center justify-center text-center px-4 py-12 sm:py-16">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 translate-y-1/2 w-[28rem] h-[28rem] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative z-10 w-full backdrop-blur-xl bg-slate-900/70 border border-slate-800 rounded-3xl p-8 sm:p-14 shadow-2xl shadow-indigo-950/40 space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          University Event Management & Verification System
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent leading-tight">
          Campus Events & Student Attendance Portal
        </h1>

        <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Browse upcoming campus activities, view real-time event status, scan dynamic QR attendance codes, and manage student attendance verification securely.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/events"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-xl shadow-indigo-950/50 hover:scale-[1.02]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Browse University Events
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-left space-y-1">
            <span className="block font-bold text-slate-200 text-sm">📅 Event Browsing</span>
            <span className="text-slate-400">View upcoming, ongoing, and past campus events.</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-left space-y-1">
            <span className="block font-bold text-slate-200 text-sm">📱 QR Attendance</span>
            <span className="text-slate-400">Scan dynamic QR codes for secure check-in & check-out.</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-left space-y-1">
            <span className="block font-bold text-slate-200 text-sm">🔒 Verified Identity</span>
            <span className="text-slate-400">LINE/LIFF integration & proof photo verification.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

