'use client';

import React from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'เกิดข้อผิดพลาดในการดึงข้อมูล', message, onRetry }: ErrorStateProps) {
  return (
    <div className="bg-white border border-red-200 rounded-xl p-8 sm:p-12 text-center max-w-lg mx-auto my-8 space-y-4 shadow-sm font-sans">
      <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs font-medium transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          ลองอีกครั้ง
        </button>
      )}
    </div>
  );
}

