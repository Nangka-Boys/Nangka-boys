import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs animate-pulse">
      <div className="h-52 bg-stone-200 relative"></div>
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-stone-200 rounded-md w-1/3"></div>
          <div className="h-4 bg-stone-200 rounded-full w-20"></div>
        </div>
        <div className="h-6 bg-stone-200 rounded-md w-3/4"></div>
        <div className="h-4 bg-stone-200 rounded-md w-1/2"></div>
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
          <div className="h-5 bg-stone-200 rounded-md w-1/3"></div>
          <div className="h-8 bg-stone-200 rounded-xl w-24"></div>
        </div>
      </div>
    </div>
  );
}
