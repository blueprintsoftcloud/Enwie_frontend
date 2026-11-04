import React, { useCallback, useEffect, useRef } from "react";
import { Popover } from "@headlessui/react";

type PopoverPanelProps = React.ComponentPropsWithoutRef<typeof Popover.Panel>;

export interface AutoAlignPopoverPanelProps extends PopoverPanelProps {
  /** Minimum safe margin in pixels from the left and right screen edges (default: 12) */
  screenPadding?: number;
}

/**
 * AutoAlignPopoverPanel
 * 
 * A drop-in replacement for Headless UI's `Popover.Panel` that guarantees
 * the dropdown popover stays 100% within the mobile / desktop viewport.
 * 
 * It automatically inspects its bounding rect upon opening and adjusts `marginLeft`
 * so that menus on the far-right (e.g. Size, Color) or far-left (e.g. Sort by)
 * never get clipped or overflow outside the screen bounds.
 */
export const AutoAlignPopoverPanel = React.forwardRef<
  HTMLDivElement,
  AutoAlignPopoverPanelProps
>(function AutoAlignPopoverPanel(
  {
    className = "",
    screenPadding = 12,
    children,
    ...props
  },
  forwardedRef
) {
  const domNodeRef = useRef<HTMLDivElement | null>(null);

  const clampToViewport = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;

      // Reset margin-left first before measuring natural rect
      el.style.marginLeft = "0px";

      const rect = el.getBoundingClientRect();
      // If element is not rendered yet, skip
      if (rect.width === 0 && rect.height === 0) return;

      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth;
      const padding = screenPadding;

      if (rect.right > viewportWidth - padding) {
        // Overflows right boundary
        const overflow = Math.ceil(rect.right - (viewportWidth - padding));
        el.style.marginLeft = `-${overflow}px`;
      } else if (rect.left < padding) {
        // Overflows left boundary
        const underflow = Math.ceil(padding - rect.left);
        el.style.marginLeft = `${underflow}px`;
      }
    },
    [screenPadding]
  );

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      domNodeRef.current = node;

      if (node) {
        // 1. Run immediately upon DOM attachment
        clampToViewport(node);

        // 2. Run on next frame in case Tailwind entry animation / layout reflow occurs
        requestAnimationFrame(() => {
          clampToViewport(node);
        });

        // 3. Run after 50ms to ensure full layout stabilization
        setTimeout(() => {
          clampToViewport(node);
        }, 50);
      }

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [clampToViewport, forwardedRef]
  );

  useEffect(() => {
    const onResize = () => {
      clampToViewport(domNodeRef.current);
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [clampToViewport]);

  return (
    <Popover.Panel
      ref={handleRef}
      className={`absolute z-30 max-w-[calc(100vw-24px)] ${className}`}
      {...props}
    >
      {children}
    </Popover.Panel>
  );
});

export default AutoAlignPopoverPanel;
