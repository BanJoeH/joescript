import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "~/lib/utils";

const PULL_THRESHOLD = 72;
const MAX_PULL = 112;
const RESISTANCE = 0.45;

function applyPullDistance(distance: number) {
  return Math.min(MAX_PULL, distance * RESISTANCE);
}

type PullToRefreshScrollProps = {
  children: React.ReactNode;
  className?: string;
  scrollRef?: (node: HTMLDivElement | null) => void;
};

export function PullToRefreshScroll({ children, className, scrollRef }: PullToRefreshScrollProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const rafRef = useRef(0);
  const touchRef = useRef({
    pullActive: false,
    startX: 0,
    startY: 0,
    tracking: false,
  });

  const applyIndicatorHeight = useCallback((height: number, animate = false) => {
    pullDistanceRef.current = height;
    const indicator = indicatorRef.current;
    if (!indicator) return;

    indicator.style.transition = animate ? "height 200ms ease-out" : "none";
    indicator.style.height = height > 0 ? `${height}px` : "0px";
    indicator.setAttribute("aria-hidden", height > 0 ? "false" : "true");
  }, []);

  const scheduleIndicatorHeight = useCallback(
    (height: number) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        applyIndicatorHeight(height);
      });
    },
    [applyIndicatorHeight],
  );

  const setRefreshingVisual = useCallback(
    (active: boolean) => {
      refreshingRef.current = active;
      iconRef.current?.classList.toggle("animate-spin", active);
      applyIndicatorHeight(active ? PULL_THRESHOLD : 0, true);
    },
    [applyIndicatorHeight],
  );

  const refresh = useCallback(async () => {
    setRefreshingVisual(true);
    window.location.reload();
  }, [setRefreshingVisual]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const scrollEl = containerRef.current;
    if (!scrollEl) return;

    function resetTouchState() {
      touchRef.current = {
        pullActive: false,
        startX: 0,
        startY: 0,
        tracking: false,
      };
    }

    function onTouchStart(event: TouchEvent) {
      if (refreshingRef.current || !scrollEl || scrollEl.scrollTop > 0) return;

      const touch = event.touches[0];
      if (!touch) return;

      touchRef.current = {
        pullActive: false,
        startX: touch.clientX,
        startY: touch.clientY,
        tracking: true,
      };
    }

    function onTouchMove(event: TouchEvent) {
      const state = touchRef.current;
      if (!state.tracking || refreshingRef.current) return;

      const touch = event.touches[0];
      if (!touch) return;

      if (!scrollEl || scrollEl.scrollTop > 0) {
        resetTouchState();
        scheduleIndicatorHeight(0);
        return;
      }

      const deltaY = touch.clientY - state.startY;
      const deltaX = touch.clientX - state.startX;

      if (!state.pullActive) {
        if (deltaY <= 0) return;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          resetTouchState();
          return;
        }
        state.pullActive = true;
      }

      if (deltaY <= 0) {
        scheduleIndicatorHeight(0);
        return;
      }

      event.preventDefault();
      scheduleIndicatorHeight(applyPullDistance(deltaY));
    }

    function onTouchEnd() {
      const state = touchRef.current;
      if (!state.tracking) return;

      const shouldRefresh = state.pullActive && pullDistanceRef.current >= PULL_THRESHOLD;
      resetTouchState();

      if (shouldRefresh) {
        void refreshRef.current();
        return;
      }

      applyIndicatorHeight(0, true);
    }

    scrollEl.addEventListener("touchstart", onTouchStart, { passive: true });
    scrollEl.addEventListener("touchmove", onTouchMove, { passive: false });
    scrollEl.addEventListener("touchend", onTouchEnd);
    scrollEl.addEventListener("touchcancel", onTouchEnd);

    return () => {
      scrollEl.removeEventListener("touchstart", onTouchStart);
      scrollEl.removeEventListener("touchmove", onTouchMove);
      scrollEl.removeEventListener("touchend", onTouchEnd);
      scrollEl.removeEventListener("touchcancel", onTouchEnd);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [applyIndicatorHeight, scheduleIndicatorHeight]);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      scrollRef?.(node);
    },
    [scrollRef],
  );

  return (
    <div className={cn("relative", className)} ref={setRefs}>
      <div
        aria-hidden
        className="pointer-events-none flex items-end justify-center overflow-hidden text-muted-foreground"
        ref={indicatorRef}
        style={{ height: 0 }}
      >
        <Loader2 aria-hidden className="mb-2 size-4 shrink-0" ref={iconRef} />
      </div>
      {children}
    </div>
  );
}
