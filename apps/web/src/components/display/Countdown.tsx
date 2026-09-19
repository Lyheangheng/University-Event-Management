import React from 'react';
import { formatCountdownMs } from '../../lib/event-display';

interface CountdownProps {
  targetDate: Date | null;
  currentTime: Date;
  subtitle?: string;
}

export function Countdown({ targetDate, currentTime, subtitle }: CountdownProps) {
  if (!targetDate) {
    return null;
  }

  const remainingMs = Math.max(0, targetDate.getTime() - currentTime.getTime());
  const { hours, minutes, seconds } = formatCountdownMs(remainingMs);

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      {/* Digits Container */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 font-mono font-black text-slate-100">
        <div className="flex flex-col items-center">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-3 py-2 sm:px-6 sm:py-4 shadow-xl min-w-[3.5rem] sm:min-w-[6rem] text-center text-3xl sm:text-6xl md:text-7xl text-indigo-400">
            {hours}
          </div>
          <span className="text-[10px] sm:text-xs font-sans text-slate-400 font-semibold uppercase mt-1">Hours</span>
        </div>

        <span className="text-2xl sm:text-5xl md:text-6xl text-slate-600 font-bold -mt-5">:</span>

        <div className="flex flex-col items-center">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-3 py-2 sm:px-6 sm:py-4 shadow-xl min-w-[3.5rem] sm:min-w-[6rem] text-center text-3xl sm:text-6xl md:text-7xl text-indigo-400">
            {minutes}
          </div>
          <span className="text-[10px] sm:text-xs font-sans text-slate-400 font-semibold uppercase mt-1">Minutes</span>
        </div>

        <span className="text-2xl sm:text-5xl md:text-6xl text-slate-600 font-bold -mt-5">:</span>

        <div className="flex flex-col items-center">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-3 py-2 sm:px-6 sm:py-4 shadow-xl min-w-[3.5rem] sm:min-w-[6rem] text-center text-3xl sm:text-6xl md:text-7xl text-indigo-400">
            {seconds}
          </div>
          <span className="text-[10px] sm:text-xs font-sans text-slate-400 font-semibold uppercase mt-1">Seconds</span>
        </div>
      </div>

      {subtitle && (
        <span className="text-xs sm:text-sm font-semibold tracking-wider text-slate-400 uppercase">
          {subtitle}
        </span>
      )}
    </div>
  );
}
