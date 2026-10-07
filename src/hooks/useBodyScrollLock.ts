// src/hooks/useBodyScrollLock.ts
//
// Locks background scroll while `isLocked` is true. Every modal in the app should use
// this instead of its own `document.body.style.overflow = "hidden"` effect — those were
// scattered ad hoc across ~20 files (some modals had none at all), and even where they
// existed they broke the moment two modals could be open at once (e.g. a confirm dialog
// opened from inside an edit modal): whichever one closed first would reset
// `overflow` to "unset" and silently re-enable background scroll while the other modal
// was still open.
//
// A module-level counter fixes that — scroll only actually unlocks when the LAST open
// modal closes, regardless of how many are stacked or in what order they close. Also
// compensates for the scrollbar-width layout shift (page content jumping right when the
// scrollbar disappears) via padding-right, since that's a common side effect of naive
// overflow:hidden locks.

import { useLayoutEffect } from "react";

let lockCount = 0;
let originalOverflow = "";
let originalPaddingRight = "";

const lock = () => {
  if (lockCount === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    originalOverflow = document.body.style.overflow;
    originalPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      const currentPadding = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }
  }
  lockCount += 1;
};

const unlock = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow;
    document.body.style.paddingRight = originalPaddingRight;
  }
};

export const useBodyScrollLock = (isLocked: boolean): void => {
  // useLayoutEffect, not useEffect: applies before the browser paints, so there's no
  // single-frame flash of the background scrolling before the lock takes effect.
  useLayoutEffect(() => {
    if (!isLocked) return;
    lock();
    return unlock;
  }, [isLocked]);
};
