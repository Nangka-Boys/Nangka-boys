import React from 'react';
import { Users, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function OccupancyBadge({ totalCapacity = 0, availableSlots = 0, occupancyRate = 0, compact = false }) {
  const capacity = parseInt(totalCapacity || 0, 10);
  const available = parseInt(availableSlots || 0, 10);
  const occupied = Math.max(0, capacity - available);
  
  // Calculate percentage if not provided directly
  const rate = capacity > 0 
    ? (occupancyRate !== undefined && occupancyRate !== null ? parseFloat(occupancyRate) : Math.round((occupied / capacity) * 100))
    : 0;

  // Status tiers
  let colorTheme = {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    indicator: 'bg-emerald-500',
    label: 'Openings Available',
    icon: CheckCircle2,
  };

  if (available === 0 || rate >= 100) {
    colorTheme = {
      bar: 'bg-rose-500',
      badge: 'bg-rose-50 text-rose-800 border-rose-200',
      indicator: 'bg-rose-500',
      label: 'Fully Occupied',
      icon: AlertCircle,
    };
  } else if (rate >= 60 || available === 1) {
    colorTheme = {
      bar: 'bg-amber-500',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      indicator: 'bg-amber-500',
      label: `${available} slot${available > 1 ? 's' : ''} left`,
      icon: AlertCircle,
    };
  } else {
    colorTheme.label = `${available} slot${available > 1 ? 's' : ''} available`;
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorTheme.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colorTheme.indicator} animate-pulse`}></span>
        <span>{colorTheme.label}</span>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white border border-stone-200 shadow-xs">
            <Users className="w-4 h-4 text-stone-600" />
          </div>
          <div>
            <div className="text-xs font-semibold text-stone-900 uppercase tracking-wider">Live Room Occupancy</div>
            <div className="text-xs text-stone-500 font-medium">PostgreSQL UDF Powered</div>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorTheme.badge}`}>
          {rate.toFixed(0)}% Occupied
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-stone-200/80 rounded-full h-2.5 overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-500 ${colorTheme.bar}`}
          style={{ width: `${Math.min(100, Math.max(5, rate))}%` }}
        ></div>
      </div>

      <div className="flex items-center justify-between text-xs text-stone-600">
        <span>Available: <strong className="text-stone-900 font-bold">{available}</strong> slots</span>
        <span>Capacity: <strong className="text-stone-900 font-bold">{capacity}</strong> total slots</span>
      </div>
    </div>
  );
}
