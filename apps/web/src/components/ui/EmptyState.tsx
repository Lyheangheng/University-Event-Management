'use client';

import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, actionText, onAction, icon }: EmptyStateProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center max-w-md mx-auto my-8 space-y-4 shadow-sm">
      <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mx-auto border border-slate-200">
        {icon || (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs font-medium transition-colors shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

