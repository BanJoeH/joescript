import { ArrowRight } from "lucide-react";
import {
  type KeyboardEvent,
  type TouchEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { Input } from "~/components/ui/input";
import {
  buildQuantityString,
  commitQuantityString,
  formatQuantityString,
  getQuantityCompletion,
  parseQuantityString,
} from "~/lib/quantity-input";
import { cn } from "~/lib/utils";

type QuantityInputProps = {
  amount: number | null;
  unit: string | null;
  onChange: (value: { amount: number | null; unit: string | null }) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  "aria-label"?: string;
  placeholder?: string;
  className?: string;
};

const SWIPE_ACCEPT_PX = 48;

export function QuantityInput({
  amount,
  unit,
  onChange,
  onKeyDown,
  "aria-label": ariaLabel = "Quantity",
  placeholder = "Qty",
  className,
}: QuantityInputProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const displayValue = focused ? text : formatQuantityString(amount, unit);
  const completion = useMemo(() => (focused ? getQuantityCompletion(text) : null), [focused, text]);
  const showDropdown = focused && (completion?.suggestions.length ?? 0) > 1;
  const showInlineSuggestion =
    focused && Boolean(completion?.completionSuffix) && completion?.suggestions.length === 1;

  useEffect(() => {
    if (!showDropdown) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setFocused(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showDropdown]);

  function commitRaw(nextRaw: string) {
    const committed = commitQuantityString(nextRaw);
    onChange(committed);
    setText(formatQuantityString(committed.amount, committed.unit));
  }

  function acceptSuggestion(suggestedUnit: string) {
    const parsed = parseQuantityString(text);
    if (parsed.amount === null) return;
    const next = buildQuantityString(parsed.amount, suggestedUnit);
    setText(next);
    commitRaw(next);
    setSwipeOffset(0);
  }

  function acceptGhostCompletion() {
    const suggestion = completion?.suggestions[0];
    if (!completion?.completionSuffix || !suggestion) return;
    acceptSuggestion(suggestion);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!showInlineSuggestion) return;
    const touch = event.changedTouches[0] ?? event.touches[0];
    if (!touch) return;
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    setSwipeOffset(0);
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (!swipeStartRef.current || !showInlineSuggestion) return;
    const touch = event.changedTouches[0] ?? event.touches[0];
    if (!touch) return;
    const deltaX = Math.max(0, touch.clientX - swipeStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - swipeStartRef.current.y);
    if (deltaY > 24) return;
    setSwipeOffset(Math.min(deltaX, 72));
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!swipeStartRef.current || !showInlineSuggestion) return;
    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - swipeStartRef.current.y);
    swipeStartRef.current = null;
    setSwipeOffset(0);

    if (deltaX >= SWIPE_ACCEPT_PX && deltaY < 32) {
      acceptGhostCompletion();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Tab" || event.key === "ArrowRight") {
      if (completion?.completionSuffix && completion.suggestions.length === 1) {
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
    <div className={cn("relative min-w-0", className)} ref={rootRef}>
      <div
        className="relative transition-transform duration-75"
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        style={swipeOffset > 0 ? { transform: `translateX(${swipeOffset}px)` } : undefined}
      >
        {focused && completion?.completionSuffix ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre px-3 py-2 text-sm"
          >
            <span className="invisible">{text}</span>
            <span className="text-muted-foreground/50">{completion.completionSuffix}</span>
          </div>
        ) : null}
        <Input
          aria-autocomplete="list"
          aria-controls={showDropdown ? listboxId : undefined}
          aria-expanded={showDropdown}
          aria-label={ariaLabel}
          autoComplete="off"
          className="relative bg-transparent"
          onBlur={() => {
            commitRaw(text);
            setFocused(false);
            setSwipeOffset(0);
          }}
          onChange={(event) => {
            setText(event.target.value);
            setHighlightIndex(0);
          }}
          onFocus={() => {
            setFocused(true);
            setText(formatQuantityString(amount, unit));
            setHighlightIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          value={displayValue}
        />
      </div>

      {showInlineSuggestion && completion ? (
        <button
          aria-label={`Accept suggestion: ${completion.completedValue}`}
          className="mt-1.5 flex w-full items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          onMouseDown={(event) => {
            event.preventDefault();
            acceptGhostCompletion();
          }}
          type="button"
        >
          <ArrowRight aria-hidden className="size-3.5 shrink-0 opacity-60" />
          <span className="min-w-0 truncate">{completion.completedValue}</span>
          <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide opacity-50">
            Tab
          </span>
        </button>
      ) : null}

      {showDropdown && completion ? (
        <div
          className="absolute top-full left-0 z-20 mt-1 max-h-48 min-w-full overflow-auto rounded-md border border-border bg-card py-1 shadow-lg"
          id={listboxId}
        >
          {completion.suggestions.map((suggestion, index) => {
            const parsed = parseQuantityString(text);
            const label =
              parsed.amount === null ? suggestion : buildQuantityString(parsed.amount, suggestion);

            return (
              <button
                className={cn(
                  "flex w-full px-3 py-1.5 text-left text-sm",
                  index === highlightIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/60",
                )}
                key={suggestion}
                onMouseDown={(event) => {
                  event.preventDefault();
                  acceptSuggestion(suggestion);
                }}
                onMouseEnter={() => setHighlightIndex(index)}
                type="button"
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
