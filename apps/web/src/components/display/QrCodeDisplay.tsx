'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QrCodeDisplayProps {
  sessionType: 'CHECK_IN' | 'CHECK_OUT';
  attendanceUrl: string;
  size?: number;
}

export function QrCodeDisplay({ sessionType, attendanceUrl, size = 300 }: QrCodeDisplayProps) {
  const isCheckIn = sessionType === 'CHECK_IN';

  const badgeBg = isCheckIn
    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
    : 'bg-amber-50 text-amber-800 border border-amber-200';
  const pulseColor = isCheckIn ? 'bg-emerald-600' : 'bg-amber-600';

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4 select-none">
      {/* Dynamic Session Status Badge */}
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${pulseColor}`} />
        <span className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${badgeBg}`}>
          {isCheckIn ? 'เปิดลงชื่อเช็กอิน' : 'เปิดลงชื่อเช็กเอาต์'}
        </span>
      </div>

      {/* Very Large High Contrast QR Code Container */}
      <div className="p-5 sm:p-6 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
        <QRCodeSVG
          value={attendanceUrl}
          size={size}
          level="H"
          includeMargin={false}
          className="w-full h-auto aspect-square"
          style={{ maxWidth: `${size}px` }}
        />
      </div>

      {/* Instructions */}
      <div className="text-center space-y-1">
        <p className="text-xs sm:text-sm font-bold text-slate-900">
          สแกน QR Code นี้ด้วยแอปพลิเคชัน LINE
        </p>
        <p className="text-[11px] text-slate-500 font-mono break-all max-w-[320px]">
          {attendanceUrl}
        </p>
      </div>
    </div>
  );
}
