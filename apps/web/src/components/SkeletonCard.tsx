import React from 'react';

export function SkeletonCard() {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 animate-pulse flex flex-col gap-4 shadow-lg">
      <div className="w-full h-44 bg-slate-800/60 rounded-xl" />
      <div className="flex justify-between items-center">
        <div className="w-20 h-6 bg-slate-800/80 rounded-full" />
        <div className="w-24 h-4 bg-slate-800/60 rounded" />
      </div>
      <div className="w-3/4 h-6 bg-slate-800/80 rounded" />
      <div className="space-y-2">
        <div className="w-full h-4 bg-slate-800/50 rounded" />
        <div className="w-2/3 h-4 bg-slate-800/50 rounded" />
      </div>
      <div className="pt-3 border-t border-slate-800/60 flex justify-between items-center">
        <div className="w-32 h-4 bg-slate-800/60 rounded" />
        <div className="w-24 h-9 bg-slate-800/80 rounded-xl" />
      </div>
    </div>
  );
}
