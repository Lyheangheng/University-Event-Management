import React from 'react';

interface QrPlaceholderProps {
  sessionType: 'CHECK_IN' | 'CHECK_OUT';
}

export function QrPlaceholder({ sessionType }: QrPlaceholderProps) {
  const isCheckIn = sessionType === 'CHECK_IN';

  return (
    <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
      {/* Decorative Corner Markers */}
      <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-university-700 rounded-tl" />
      <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-university-700 rounded-tr" />
      <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-university-700 rounded-bl" />
      <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-university-700 rounded-br" />

      {/* Center QR Symbol */}
      <div className="p-4 rounded-lg bg-university-50 border border-university-200/60 text-university-700">
        <svg className="w-16 h-16 sm:w-20 sm:h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      </div>

      <div className="space-y-1">
        <span className="block text-xs sm:text-sm font-bold tracking-wider text-slate-800 uppercase">
          [ แสดง QR CODE สำหรับสแกน ]
        </span>
        <span className="block text-xs text-slate-600">
          สแกน QR Code เพื่อ{isCheckIn ? 'ลงชื่อเข้าร่วมกิจกรรม (เช็กอิน)' : 'ลงชื่อออกจากกิจกรรม (เช็กเอาต์)'}
        </span>
      </div>
    </div>
  );
}
