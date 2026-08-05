import { ArrowRight } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  type TouchEvent,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Input } from "~/components/ui/input";
import {
  buildQuantityString,
  commitQuantityString,
  formatQuantityString,
  getQuantityCompletion,
  parseQuantityString,
  type QuantityCompletion,
} from "~/lib/quantity-input";
import { cn } from "~/lib/utils";

type QuantityInputProps = {
  amount: number | null;
  unit: string | null;
  onChange: (value: { amount: number | null; unit: string | null }) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  "aria-label"?: string;
  id?: string;
  placeholder?: string;
  className?: string;
};

const SWIPE_ACCEPT_PX = 48;

/** Portaled layer: at least input width, grows with label text. */
const SUGGESTION_LAYER = "inline-block min-w-full max-w-[min(100vw-2rem,20rem)]";

function SuggestionPortal({
  anchorRef,
  open,
  portalRef,
  repositionKey,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  portalRef: RefObject<HTMLDivElement | null>;
  repositionKey: string;
  children: ReactNode;
}) {
  const [position, setPosition] = useState<{ top: number; left: number; minWidth: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    function update() {
      void repositionKey;
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: rect.width,
      });
    }

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef, open, repositionKey]);

  if (!open || !position || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(SUGGESTION_LAYER, "z-50")}
      ref={portalRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        minWidth: position.minWidth,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

function CompletionGhost({ text, completionSuffix }: { text: string; completionSuffix: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre px-3 py-2 text-sm"
    >
      <span className="invisible">{text}</span>
      <span className="text-muted-foreground/50">{completionSuffix}</span>
    </div>
  );
}

function SuggestionChip({
  completedValue,
  onAccept,
}: {
  completedValue: string;
  onAccept: () => void;
}) {
  return (
    <button
      aria-label={`Accept suggestion: ${completedValue}`}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-sm text-foreground shadow-lg transition-colors hover:bg-accent/60"
      onMouseDown={(event) => {
        event.preventDefault();
        onAccept();
      }}
      type="button"
    >
      <ArrowRight aria-hidden className="size-3.5 shrink-0 opacity-60" />
      <span className="whitespace-nowrap">{completedValue}</span>
      <span className="shrink-0 pl-2 text-[10px] uppercase tracking-wide opacity-50">Tab</span>
    </button>
  );
}

function SuggestionDropdown({
  completion,
  highlightIndex,
  listboxId,
  onHighlight,
  onSelect,
}: {
  completion: QuantityCompletion;
  highlightIndex: number;
  listboxId: string;
  onHighlight: (index: number) => void;
  onSelect: (unit: string) => void;
}) {
  return (
    <div
      className="max-h-48 overflow-auto rounded-md border border-border bg-card py-1 shadow-lg"
      id={listboxId}
    >
      {completion.suggestions.map((suggestion, index) => (
        <button
          className={cn(
            "block whitespace-nowrap px-3 py-1.5 text-left text-sm",
            index === highlightIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
          )}
          key={suggestion}
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(suggestion);
          }}
          onMouseEnter={() => onHighlight(index)}
          type="button"
        >
          {completion.suggestionLabels[index]}
        </button>
      ))}
    </div>
  );
}

export function QuantityInput({
  amount,
  unit,
  onChange,
  onKeyDown,
  "aria-label": ariaLabel = "Quantity",
  id,
  placeholder = "Qty",
  className,
}: QuantityInputProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const swipeWrapperRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const completionRef = useRef<QuantityCompletion | null>(null);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const deferredText = useDeferredValue(text);
  const completionForUi = useMemo(
    () => (focused ? getQuantityCompletion(deferredText) : null),
    [focused, deferredText],
  );
  const completionImmediate = useMemo(
    () => (focused ? getQuantityCompletion(text) : null),
    [focused, text],
  );

  completionRef.current = completionImmediate;

  const displayValue = focused ? text : formatQuantityString(amount, unit);
  const completionReady = !focused || deferredText === text;
  const showGhost =
    completionReady && Boolean(completionForUi?.completionSuffix) && completionForUi !== null;
  const showDropdown = completionReady && focused && (completionForUi?.suggestions.length ?? 0) > 1;
  const showInlineSuggestion =
    completionReady &&
    focused &&
    Boolean(completionForUi?.completionSuffix) &&
    completionForUi?.suggestions.length === 1;

  const showSuggestionPortal = showInlineSuggestion || showDropdown;

  useEffect(() => {
    if (!showDropdown) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (portalRef.current?.contains(target)) return;
      setFocused(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showDropdown]);

  function resetSwipeTransform() {
    const wrapper = swipeWrapperRef.current;
    if (!wrapper) return;
    wrapper.style.transform = "";
    wrapper.style.willChange = "";
  }

  function setSwipeTransform(offset: number) {
    const wrapper = swipeWrapperRef.current;
    if (!wrapper) return;
    wrapper.style.willChange = "transform";
    wrapper.style.transform = offset > 0 ? `translateX(${offset}px)` : "";
  }

  function commitRaw(nextRaw: string) {
    const committed = commitQuantityString(nextRaw);
    onChange(committed);
    setText(formatQuantityString(committed.amount, committed.unit));
  }

  function acceptSuggestion(suggestedUnit: string, sourceText = text) {
    const parsed = parseQuantityString(sourceText);
    if (parsed.amount === null) return;
    const next = buildQuantityString(parsed.amount, suggestedUnit);
    setText(next);
    commitRaw(next);
    resetSwipeTransform();
  }

  function acceptGhostCompletion() {
    const completion = completionRef.current;
    const suggestion = completion?.suggestions[0];
    if (!completion?.completionSuffix || !suggestion) return;
    acceptSuggestion(suggestion);
  }

  function canSwipeGhost() {
    return Boolean(completionRef.current?.completionSuffix);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!canSwipeGhost()) return;
    const touch = event.changedTouches[0] ?? event.touches[0];
    if (!touch) return;
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    resetSwipeTransform();
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (!swipeStartRef.current || !canSwipeGhost()) return;
    const touch = event.changedTouches[0] ?? event.touches[0];
    if (!touch) return;
    const deltaX = Math.max(0, touch.clientX - swipeStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - swipeStartRef.current.y);
    if (deltaY > 24) return;
    setSwipeTransform(Math.min(deltaX, 72));
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!swipeStartRef.current || !canSwipeGhost()) return;
    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - swipeStartRef.current.y);
    swipeStartRef.current = null;
    resetSwipeTransform();

    if (deltaX >= SWIPE_ACCEPT_PX && deltaY < 32) {
      acceptGhostCompletion();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const completion = completionRef.current;

    if (event.key === "Tab" || event.key === "ArrowRight") {
      if (completion?.completionSuffix) {
        event.preventDefault();
        acceptGhostCompletion();
        return;
      }
    }

    if (event.key === "ArrowDown" && showDropdown && completion) {
      event.preventDefault();
      setHighlightIndex((index) => Math.min(index + 1, completion.suggestions.length - 1));
      return;
    }

    if (event.key === "ArrowUp" && showDropdown && completion) {
      event.preventDefault();
      setHighlightIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter" && showDropdown && completion) {
      event.preventDefault();
      const suggestion = completion.suggestions[highlightIndex] ?? completion.suggestions[0];
      if (suggestion) acceptSuggestion(suggestion);
      return;
    }

    if (event.key === "Enter" && showInlineSuggestion) {
      event.preventDefault();
      acceptGhostCompletion();
      return;
    }

    if (event.key === "Escape" && showDropdown) {
      event.preventDefault();
      setFocused(false);
      setText(formatQuantityString(amount, unit));
      return;
    }

    onKeyDown?.(event);
  }

  return (
    <div className={cn("relative min-w-0 overflow-visible", className)} ref={rootRef}>
      <div
        className="relative"
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        ref={swipeWrapperRef}
      >
        {showGhost && completionForUi ? (
          <CompletionGhost
            completionSuffix={completionForUi.completionSuffix}
            text={deferredText}
          />
        ) : null}
        <Input
          aria-autocomplete="list"
          aria-controls={showDropdown ? listboxId : undefined}
          aria-expanded={showDropdown}
          aria-label={ariaLabel}
          autoComplete="off"
          className="relative bg-transparent"
          id={id}
          onBlur={() => {
            commitRaw(text);
            setFocused(false);
            resetSwipeTransform();
          }}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            setHighlightIndex(0);
            onChange(commitQuantityString(next));
          }}
          onFocus={(event) => {
            setFocused(true);
            setText(formatQuantityString(amount, unit));
            setHighlightIndex(0);
            requestAnimationFrame(() => {
              event.target.select();
            });
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          value={displayValue}
        />
      </div>

      <SuggestionPortal
        anchorRef={swipeWrapperRef}
        open={showSuggestionPortal}
        portalRef={portalRef}
        repositionKey={deferredText}
      >
        {showInlineSuggestion && completionForUi ? (
          <SuggestionChip
            completedValue={completionForUi.completedValue}
            onAccept={acceptGhostCompletion}
          />
        ) : null}

        {showDropdown && completionForUi ? (
          <SuggestionDropdown
            completion={completionForUi}
            highlightIndex={highlightIndex}
            listboxId={listboxId}
            onHighlight={setHighlightIndex}
            onSelect={(suggestion) => acceptSuggestion(suggestion)}
          />
        ) : null}
      </SuggestionPortal>
    </div>
  );
}
