import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative z-10 w-full backdrop-blur-xl bg-slate-900/70 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-indigo-950/40 space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          Phase 5 • Student Event Portal
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          University Event Management System
        </h1>

        <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
          Welcome to the University Event Portal. Browse upcoming, ongoing, and past campus events.
        </p>

        <div>
          <Link
            href="/events"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-xl shadow-indigo-950/50 hover:scale-[1.02]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Browse University Events
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <span className="block font-semibold text-slate-200">Frontend</span>
            <span>Next.js App Router</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <span className="block font-semibold text-slate-200">Backend API</span>
            <span>NestJS + TypeScript</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <span className="block font-semibold text-slate-200">Database</span>
            <span>PostgreSQL + Prisma</span>
          </div>
        </div>
      </div>
    </main>
  );
}
