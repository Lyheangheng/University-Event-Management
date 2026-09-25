'use client';

import React from 'react';

export type StatusBadgeVariant =
  | 'ONGOING'
  | 'UPCOMING'
  | 'ENDED'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'COMPLETED'
  | 'INCOMPLETE';

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  customText?: string;
  className?: string;
}

export function StatusBadge({ variant, customText, className = '' }: StatusBadgeProps) {
  const configs: Record<StatusBadgeVariant, { label: string; style: string; dot: string }> = {
    ONGOING: {
      label: 'กำลังดำเนินกิจกรรม',
      style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-600',
    },
    UPCOMING: {
      label: 'กำลังจะมาถึง',
      style: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-500',
    },
    ENDED: {
      label: 'สิ้นสุดแล้ว',
      style: 'bg-slate-100 text-slate-500 border-slate-200',
      dot: 'bg-slate-400',
    },
    CHECK_IN: {
      label: 'เปิดลงชื่อเช็กอิน',
      style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-600',
    },
    CHECK_OUT: {
      label: 'เปิดลงชื่อเช็กเอาต์',
      style: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-600',
    },
    COMPLETED: {
      label: 'สมบูรณ์',
      style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-600',
    },
    INCOMPLETE: {
      label: 'ไม่สมบูรณ์',
      style: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-600',
    },
  };

  const config = configs[variant] || configs.ENDED;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${config.style} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {customText || config.label}
    </span>
  );
}

