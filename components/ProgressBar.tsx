import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  label: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, label }) => {
  // Color logic based on danger level
  let colorClass = 'bg-green-500';
  if (value > 80) colorClass = 'bg-red-600 animate-pulse';
  else if (value > 60) colorClass = 'bg-red-500';
  else if (value > 40) colorClass = 'bg-orange-500';
  else if (value > 20) colorClass = 'bg-yellow-400';

  // Ensure value is clamped
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className="w-full p-4 bg-slate-900 border border-slate-700 rounded-lg shadow-lg">
      <div className="flex justify-between mb-2 items-end">
        <span className="text-slate-300 font-mono text-sm uppercase tracking-widest">{label}</span>
        <span className={`font-mono text-2xl font-bold ${
          value > 60 ? 'text-red-500' : 'text-blue-400'
        }`}>
          {clampedValue}%
        </span>
      </div>
      <div className="w-full bg-slate-800 h-6 rounded-full overflow-hidden relative">
        {/* Grid lines for decoration */}
        <div className="absolute inset-0 w-full h-full flex justify-between px-1 z-10 opacity-20">
            {[...Array(10)].map((_, i) => (
                <div key={i} className="h-full w-px bg-slate-400"></div>
            ))}
        </div>
        {/* Danger Zone Marker (80%+) */}
        <div className="absolute right-0 top-0 h-full bg-red-900/30 w-[20%] z-0 border-l border-red-900/50"></div>
        
        {/* The Bar */}
        <div
          className={`h-full transition-all duration-1000 ease-out ${colorClass}`}
          style={{ width: `${clampedValue}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
        <span>SAFE</span>
        <span>WAR</span>
      </div>
    </div>
  );
};

export default ProgressBar;
