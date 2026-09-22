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
      label: 'ONGOING',
      style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-400 animate-pulse',
    },
    UPCOMING: {
      label: 'UPCOMING',
      style: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      dot: 'bg-indigo-400',
    },
    ENDED: {
      label: 'ENDED',
      style: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      dot: 'bg-slate-500',
    },
    CHECK_IN: {
      label: 'CHECK-IN OPEN',
      style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-400 animate-pulse',
    },
    CHECK_OUT: {
      label: 'CHECK-OUT OPEN',
      style: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      dot: 'bg-indigo-400 animate-pulse',
    },
    COMPLETED: {
      label: 'COMPLETED',
      style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-400',
    },
    INCOMPLETE: {
      label: 'INCOMPLETE',
      style: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dot: 'bg-amber-400',
    },
  };

  const config = configs[variant] || configs.ENDED;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.style} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {customText || config.label}
    </span>
  );
}
