import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "~/lib/utils";

type ToastInput = {
  title: string;
  message: string;
};

type ToastItem = ToastInput & { id: string };

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_MS = 2000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((input: ToastInput) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { ...input, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((item) => (
          <div
            className={cn(
              "pointer-events-auto w-full max-w-sm rounded-md border-2 border-white bg-white px-4 py-3 text-charcoal-0 shadow-[0_8px_24px_rgba(0,0,0,0.45)]",
              "animate-in zoom-in-95 slide-in-from-bottom-4 duration-150",
            )}
            key={item.id}
            role="status"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.06em] text-charcoal-0">
              {item.title}
            </p>
            <p className="text-sm text-charcoal-0/70">{item.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

/** Fire once when a fetcher finishes a submission with data. */
export function useFetcherSuccessToast<T>(
  fetcher: { state: string; data: T | undefined },
  onSuccess: (data: T) => void,
) {
  const prevState = useRef(fetcher.state);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    const wasBusy = prevState.current !== "idle";
    prevState.current = fetcher.state;
    if (!wasBusy || fetcher.state !== "idle" || fetcher.data === undefined) return;
    onSuccessRef.current(fetcher.data);
  }, [fetcher.state, fetcher.data]);
}
