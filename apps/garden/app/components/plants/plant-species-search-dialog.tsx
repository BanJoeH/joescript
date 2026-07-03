import { Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import type { PlantSpeciesSuggestion } from "~/services/plant-lookup.service";

type SearchResponse = {
  results?: PlantSpeciesSuggestion[];
  error?: string;
  configured?: boolean;
  query?: string;
};

type PlantSpeciesSearchDialogProps = {
  enabled: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (suggestion: PlantSpeciesSuggestion) => void;
  open: boolean;
  searchUrl: string;
};

export function PlantSpeciesSearchDialog({
  enabled,
  onOpenChange,
  onSelect,
  open,
  searchUrl,
}: PlantSpeciesSearchDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [displayResults, setDisplayResults] = useState<PlantSpeciesSuggestion[]>([]);
  const [displayError, setDisplayError] = useState<string | null>(null);
  const fetcher = useFetcher<SearchResponse>();

  const trimmedQuery = query.trim();
  const canSearch = enabled && trimmedQuery.length >= 2;
  const isSearching = fetcher.state !== "idle" && submittedQuery !== null;
  const showEmpty =
    submittedQuery !== null &&
    fetcher.state === "idle" &&
    !displayError &&
    displayResults.length === 0 &&
    fetcher.data?.query === submittedQuery;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      setQuery("");
      setSubmittedQuery(null);
      setDisplayResults([]);
      setDisplayError(null);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (submittedQuery && trimmedQuery !== submittedQuery) {
      setDisplayResults([]);
      setDisplayError(null);
    }
  }, [submittedQuery, trimmedQuery]);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data || !submittedQuery) {
      return;
    }

    if (fetcher.data.query !== submittedQuery) {
      return;
    }

    setDisplayResults(fetcher.data.results ?? []);
    setDisplayError(fetcher.data.error ?? null);
  }, [fetcher.state, fetcher.data, submittedQuery]);

  function submitSearch() {
    if (!canSearch || isSearching) {
      return;
    }

    setSubmittedQuery(trimmedQuery);
    setDisplayResults([]);
    setDisplayError(null);
    void fetcher.load(`${searchUrl}?q=${encodeURIComponent(trimmedQuery)}`);
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg"
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-popover-foreground">Look up species</h3>
          <p className="text-sm text-muted-foreground">
            Search by common or scientific name. Selecting a result fills name fields only.
          </p>
        </div>

        {!enabled ? (
          <p className="rounded-md border border-muted bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Species lookup is not configured for this environment.
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="species-search-query">Search</Label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  className="pl-9"
                  id="species-search-query"
                  maxLength={100}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitSearch();
                    }
                  }}
                  placeholder="e.g. lavender, Rosa gallica"
                  value={query}
                />
              </div>
              <Button disabled={!canSearch || isSearching} onClick={submitSearch} type="button">
                {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
                Search
              </Button>
            </div>
          </div>
        )}

        {enabled && displayError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {displayError}
          </p>
        ) : null}

        {enabled && trimmedQuery.length > 0 && trimmedQuery.length < 2 ? (
          <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
        ) : null}

        {enabled && submittedQuery === null && trimmedQuery.length >= 2 ? (
          <p className="text-sm text-muted-foreground">
            Press Enter or click Search to look up species.
          </p>
        ) : null}

        {isSearching ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Searching for &ldquo;{submittedQuery}&rdquo;…
          </div>
        ) : null}

        {showEmpty ? (
          <p className="text-sm text-muted-foreground">
            No species found for &ldquo;{submittedQuery}&rdquo;.
          </p>
        ) : null}

        {enabled && displayResults.length > 0 ? (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {displayResults.map((result) => (
              <li key={result.id}>
                <button
                  aria-label={[
                    result.commonName || result.latinName,
                    result.latinName,
                    result.cultivar,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  className={cn(
                    "flex w-full gap-3 rounded-md border border-border bg-card px-3 py-2 text-left text-card-foreground transition-colors",
                    "hover:border-primary/50 hover:bg-accent hover:text-accent-foreground",
                  )}
                  onClick={() => onSelect(result)}
                  type="button"
                >
                  {result.imageUrl ? (
                    <div className="w-14 shrink-0 space-y-1">
                      <img
                        alt=""
                        className="size-14 rounded-md border border-border object-cover"
                        loading="lazy"
                        src={result.imageUrl}
                      />
                      {result.imageAttribution ? (
                        <p className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                          {result.imageAttribution}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className={cn("min-w-0 flex-1", !result.imageUrl && "py-0.5")}>
                    <p className="font-medium">{result.commonName || result.latinName}</p>
                    {result.latinName ? (
                      <p className="text-sm text-muted-foreground italic">{result.latinName}</p>
                    ) : null}
                    {result.cultivar ? (
                      <p className="text-sm text-muted-foreground">
                        &lsquo;{result.cultivar}&rsquo;
                      </p>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Names via{" "}
            <a
              className="underline-offset-4 hover:underline"
              href="https://perenual.com"
              rel="noreferrer"
              target="_blank"
            >
              Perenual
            </a>
            {" · "}
            Photos via{" "}
            <a
              className="underline-offset-4 hover:underline"
              href="https://www.inaturalist.org"
              rel="noreferrer"
              target="_blank"
            >
              iNaturalist
            </a>
          </p>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Close
          </Button>
        </div>
      </div>
    </dialog>
  );
}
