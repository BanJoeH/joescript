import { matchSorter } from "match-sorter";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";

import { Input } from "~/components/ui/input";
import { normalizeUnit, SUGGESTED_UNITS } from "~/lib/units";
import { cn } from "~/lib/utils";

type UnitComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  "aria-label"?: string;
  placeholder?: string;
  className?: string;
};

type Option =
  | { kind: "suggestion"; value: string }
  | { kind: "custom"; value: string; label: string };

function buildOptions(query: string): Option[] {
  const trimmed = query.trim();
  const suggestions = (
    trimmed
      ? matchSorter([...SUGGESTED_UNITS], trimmed, { threshold: matchSorter.rankings.CONTAINS })
      : [...SUGGESTED_UNITS]
  ).map((unit) => ({ kind: "suggestion" as const, value: unit }));

  if (!trimmed) return suggestions;

  const normalized = normalizeUnit(trimmed) ?? trimmed;
  const exactMatch = suggestions.some(
    (option) => option.value.toLowerCase() === normalized.toLowerCase(),
  );
  if (exactMatch) return suggestions;

  return [{ kind: "custom", value: trimmed, label: `Use “${trimmed}”` }, ...suggestions];
}

export function UnitCombobox({
  value,
  onChange,
  onKeyDown,
  "aria-label": ariaLabel = "Unit",
  placeholder = "Unit",
  className,
}: UnitComboboxProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const options = useMemo(() => buildOptions(value), [value]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function commit(next: string) {
    const normalized = next.trim() ? (normalizeUnit(next) ?? next.trim()) : "";
    onChange(normalized);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightIndex((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }

    if (event.key === "Enter" && open && value.trim() && options.length > 0) {
      event.preventDefault();
      const option = options[highlightIndex] ?? options[0];
      if (option) commit(option.value);
      return;
    }

    if (event.key === "Enter") {
      setOpen(false);
    }

    onKeyDown?.(event);
  }

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <Input
        aria-autocomplete="list"
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        aria-label={ariaLabel}
        autoComplete="off"
        onChange={(event) => {
          onChange(event.target.value);
          setHighlightIndex(0);
          setOpen(true);
        }}
        onFocus={() => {
          setHighlightIndex(0);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        value={value}
      />
      {open && options.length > 0 ? (
        <div
          className="absolute top-full left-0 z-20 mt-1 max-h-48 min-w-full overflow-x-auto rounded-md border border-border bg-card py-1 shadow-lg"
          id={listboxId}
        >
          {options.map((option, index) => {
            const selected = index === highlightIndex;
            return (
              <button
                className={cn(
                  "flex w-full px-3 py-1.5 text-left text-sm",
                  selected ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                  option.kind === "custom" && "font-medium text-primary",
                )}
                key={`${option.kind}:${option.value}`}
                onClick={() => commit(option.value)}
                onMouseDown={(event) => {
                  // Keep focus on the input; avoid blur-before-click race.
                  event.preventDefault();
                }}
                onMouseEnter={() => setHighlightIndex(index)}
                type="button"
              >
                {option.kind === "custom" ? option.label : option.value}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
