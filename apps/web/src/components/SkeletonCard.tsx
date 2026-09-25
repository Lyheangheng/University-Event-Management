import React from 'react';

export function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 animate-pulse flex flex-col gap-4 shadow-sm">
      <div className="w-full h-44 bg-slate-100 rounded-lg" />
      <div className="flex justify-between items-center">
        <div className="w-20 h-5 bg-slate-100 rounded-md" />
        <div className="w-24 h-4 bg-slate-100 rounded" />
      </div>
      <div className="w-3/4 h-5 bg-slate-100 rounded" />
      <div className="space-y-2">
        <div className="w-full h-3.5 bg-slate-100 rounded" />
        <div className="w-2/3 h-3.5 bg-slate-100 rounded" />
      </div>
      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
        <div className="w-32 h-4 bg-slate-100 rounded" />
        <div className="w-full h-9 bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}

