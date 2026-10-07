// src/components/PriceRangeSlider.tsx
// Dual-thumb price range slider — two overlapping native <input type="range"> elements
// (the standard no-library technique for a two-handle slider) rather than a single
// range input, since a plain <input type="range"> only ever has one thumb. Each input
// is pointer-events-none except for its own thumb (via CSS below), so they don't fight
// each other for drag events despite occupying the same box.
//
// Controlled purely by [min, max] props — no internal "committed" state — the caller
// (CategoryProductPage.tsx) owns whether changes apply live or are staged behind an
// Apply button.

import React from "react";

interface Props {
  bounds: { min: number; max: number };
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (n: number) => string;
}

const defaultFormat = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const PriceRangeSlider: React.FC<Props> = ({ bounds, value, onChange, formatValue = defaultFormat }) => {
  const boundMin = bounds.min;
  const boundMax = Math.max(bounds.max, boundMin + 1);
  const span = Math.max(boundMax - boundMin, 1);

  const selectedMin = Math.max(boundMin, Math.min(value?.[0] ?? boundMin, boundMax));
  const selectedMax = Math.max(boundMin, Math.min(value?.[1] ?? boundMax, boundMax));

  const pctMin = Math.max(0, Math.min(100, ((selectedMin - boundMin) / span) * 100));
  const pctMax = Math.max(0, Math.min(100, ((selectedMax - boundMin) / span) * 100));

  const handleMinChange = (raw: number) => {
    const next = Math.min(raw, selectedMax);
    onChange([next, selectedMax]);
  };

  const handleMaxChange = (raw: number) => {
    const next = Math.max(raw, selectedMin);
    onChange([selectedMin, next]);
  };

  return (
    <div className="pt-2 pb-1">
      <div className="relative h-4 flex items-center">
        {/* Track */}
        <div className="absolute inset-x-0 h-1 rounded-full bg-gray-200" />
        {/* Selected range fill */}
        <div
          className="absolute h-1 rounded-full bg-black"
          style={{ left: `${pctMin}%`, width: `${Math.max(pctMax - pctMin, 0)}%` }}
        />
        <input
          type="range"
          min={boundMin}
          max={boundMax}
          value={selectedMin}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          className="range-thumb absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none cursor-pointer z-10"
          aria-label="Minimum price"
        />
        <input
          type="range"
          min={boundMin}
          max={boundMax}
          value={selectedMax}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          className="range-thumb absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none cursor-pointer z-20"
          aria-label="Maximum price"
        />
      </div>

      {/* Min to Max price badges (matching FEHNY reference) */}
      <div className="flex items-center justify-between mt-3 text-xs">
        <span className="inline-flex items-center justify-center px-2.5 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium border border-gray-200/60 min-w-[58px] text-center select-none">
          {formatValue(selectedMin)}
        </span>
        <span className="text-xs text-gray-400 font-normal px-2 select-none">to</span>
        <span className="inline-flex items-center justify-center px-2.5 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium border border-gray-200/60 min-w-[58px] text-center select-none">
          {selectedMax >= boundMax ? `${formatValue(selectedMax)}+` : formatValue(selectedMax)}
        </span>
      </div>

      {/* Solid black thumb styles matching reference */}
      <style>{`
        .range-thumb::-webkit-slider-thumb {
          appearance: none;
          pointer-events: auto;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: #000000;
          border: 2px solid #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .range-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .range-thumb::-moz-range-thumb {
          pointer-events: auto;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: #000000;
          border: 2px solid #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .range-thumb::-moz-range-thumb:hover {
          transform: scale(1.2);
        }
        .range-thumb::-webkit-slider-runnable-track { background: transparent; }
        .range-thumb::-moz-range-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default PriceRangeSlider;
