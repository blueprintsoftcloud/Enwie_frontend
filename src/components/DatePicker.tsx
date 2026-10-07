// src/components/DatePicker.tsx
// Custom-styled replacement for native `<input type="date">` — the browser's own
// calendar popup (Chrome's month/year dropdown with up/down steppers, a generic blue
// selected day) looks and behaves inconsistently across browsers and doesn't match the
// app's own design language anywhere else. Same value/onChange contract as the native
// input (a plain "YYYY-MM-DD" string, "" for empty) so it drops in wherever one was
// used, including min/max range constraints.

import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Applied to the trigger button — pass the same classes the native input used to
   * have, so this drops into existing layouts without a visual regression. */
  className?: string;
  /** Which edge of the trigger the dropdown hangs from — "right" for a picker sitting
   * near the right edge of its container (e.g. the second input in a date-range pair)
   * so the calendar doesn't spill off-screen. */
  align?: "left" | "right";
}

const pad = (n: number) => String(n).padStart(2, "0");
const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseStr = (s: string | undefined): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const todayStr = () => toStr(new Date());
const sameDay = (a: Date, b: Date) => toStr(a) === toStr(b);

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const POPUP_WIDTH = 288; // w-72

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder = "Select date",
  className = "",
  align = "left",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseStr(value);
  const [viewDate, setViewDate] = useState(selected ?? new Date());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (selected) setViewDate(selected);
  }, [value]);

  // Positions the popup with `fixed` coordinates derived from the trigger's own
  // viewport rect instead of CSS `absolute` nested inside the trigger's own layout
  // flow — an `absolute` popup gets silently clipped/invisible whenever the trigger
  // sits inside a scrollable ancestor (e.g. a modal body with overflow-y-auto), which
  // is exactly why "the calendar doesn't open" when this field is near the bottom of
  // a scrolling form. Rendered through a portal (below) so it also always paints above
  // the modal itself, regardless of either one's z-index/stacking context.
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const popupHeight = popupRef.current?.offsetHeight ?? 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < popupHeight + 12 && rect.top > popupHeight + 12;

    const left = align === "right"
      ? Math.max(8, rect.right - POPUP_WIDTH)
      : Math.min(rect.left, window.innerWidth - POPUP_WIDTH - 8);

    setCoords({
      top: openUpward ? rect.top - popupHeight - 8 : rect.bottom + 8,
      left,
    });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // `capture: true` so this also fires for scroll events on a nested scrollable
    // ancestor (e.g. the modal body) — those don't bubble to window normally, but
    // capture-phase listeners on window still see them on the way down to the target.
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const minDate = parseStr(min);
  const maxDate = parseStr(max);

  const isDisabledDay = (d: Date) => {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({ date: new Date(year, month + 1, nextDay), inMonth: false });
    nextDay += 1;
  }

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const displayValue = selected
    ? selected.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "";
  const today = new Date();

  return (
    <div className="relative block">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className={`truncate ${displayValue ? "text-gray-900" : "text-gray-400"}`}>
          {displayValue || placeholder}
        </span>
      </button>

      {open && coords && createPortal(
        <div
          ref={popupRef}
          data-datepicker-popup="true"
          style={{ position: "fixed", top: coords.top, left: coords.left, width: POPUP_WIDTH }}
          className="z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <p className="text-sm font-bold text-gray-900">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map(({ date, inMonth }, i) => {
              const isSelected = !!selected && sameDay(date, selected);
              const isToday = sameDay(date, today);
              const isDisabled = isDisabledDay(date);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(toStr(date));
                    setOpen(false);
                  }}
                  className={`aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-colors
                    ${!inMonth ? "text-gray-300" : "text-gray-700"}
                    ${isSelected ? "bg-black text-white font-bold" : isToday ? "ring-1 ring-gray-300 font-bold" : ""}
                    ${isDisabled ? "opacity-30 cursor-not-allowed" : isSelected ? "cursor-pointer" : "hover:bg-gray-100 cursor-pointer"}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={isDisabledDay(today)}
              onClick={() => {
                onChange(todayStr());
                setOpen(false);
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
