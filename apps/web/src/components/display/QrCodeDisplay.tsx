'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QrCodeDisplayProps {
  sessionType: 'CHECK_IN' | 'CHECK_OUT';
  attendanceUrl: string;
}

export function QrCodeDisplay({ sessionType, attendanceUrl }: QrCodeDisplayProps) {
  const isCheckIn = sessionType === 'CHECK_IN';

  const badgeBg = isCheckIn ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  const pulseColor = isCheckIn ? 'bg-emerald-400' : 'bg-amber-400';

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 animate-fade-in max-w-sm w-full select-none">
      {/* Dynamic Session Status Badge */}
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${pulseColor} animate-ping`} />
        <span className={`px-4 py-1 rounded-full border text-xs font-black uppercase tracking-widest ${badgeBg}`}>
          {isCheckIn ? 'CHECK-IN OPEN' : 'CHECK-OUT OPEN'}
        </span>
      </div>

      {/* High contrast QR Code container */}
      <div className="p-4 bg-white rounded-2xl border-4 border-slate-800 shadow-inner flex items-center justify-center">
        <QRCodeSVG
          value={attendanceUrl}
          size={240}
          level="H"
          includeMargin={false}
          className="w-full h-auto max-w-[240px] aspect-square"
        />
      </div>

      {/* Instructions */}
      <div className="text-center space-y-1">
        <p className="text-sm font-bold text-slate-200">
          Scan this QR code to continue attendance
        </p>
        <p className="text-xs text-slate-400 font-mono break-all max-w-[280px]">
          {attendanceUrl}
        </p>
      </div>
    </div>
  );
}
