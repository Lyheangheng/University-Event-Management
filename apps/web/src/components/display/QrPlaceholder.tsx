import React from 'react';

interface QrPlaceholderProps {
  sessionType: 'CHECK_IN' | 'CHECK_OUT';
}

export function QrPlaceholder({ sessionType }: QrPlaceholderProps) {
  const isCheckIn = sessionType === 'CHECK_IN';

  return (
    <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl border-4 border-dashed border-indigo-500/40 bg-slate-950/80 p-6 flex flex-col items-center justify-center text-center gap-4 shadow-2xl backdrop-blur-md">
      {/* Decorative Corner Markers */}
      <div className="absolute top-3 left-3 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
      <div className="absolute top-3 right-3 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
      <div className="absolute bottom-3 left-3 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
      <div className="absolute bottom-3 right-3 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />

      {/* Center QR Symbol */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
        <svg className="w-16 h-16 sm:w-20 sm:h-20 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      </div>

      <div className="space-y-1">
        <span className="block text-sm sm:text-base font-extrabold tracking-widest text-indigo-300 uppercase">
          [ QR CODE WILL APPEAR HERE ]
        </span>
        <span className="block text-xs sm:text-sm font-semibold text-slate-300">
          Scan the event QR code to {isCheckIn ? 'check in' : 'check out'}
        </span>
      </div>

      <span className="text-[10px] sm:text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
        Phase 7 Dynamic QR Placeholder
      </span>
    </div>
  );
}
