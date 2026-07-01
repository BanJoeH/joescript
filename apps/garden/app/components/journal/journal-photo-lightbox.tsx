import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "~/components/ui/button";
import { photoPath } from "~/lib/household-path";
import type { PhotoRecord } from "~/services/photos.service";

export type PhotoLightboxItem = Pick<PhotoRecord, "id" | "role" | "width" | "height" | "caption">;

type PhotoLightboxContextValue = {
  householdId: string;
  photos: PhotoLightboxItem[];
  openAt: (index: number) => void;
};

const PhotoLightboxContext = createContext<PhotoLightboxContextValue | null>(null);

function usePhotoLightbox() {
  return useContext(PhotoLightboxContext);
}

type PhotoLightboxProviderProps = {
  householdId: string;
  photos: PhotoLightboxItem[];
  children: ReactNode;
};

export function PhotoLightboxProvider({
  householdId,
  photos,
  children,
}: PhotoLightboxProviderProps) {
  const parent = useContext(PhotoLightboxContext);
  if (parent) {
    return <>{children}</>;
  }

  return (
    <PhotoLightboxRoot householdId={householdId} photos={photos}>
      {children}
    </PhotoLightboxRoot>
  );
}

function PhotoLightboxRoot({ householdId, photos, children }: PhotoLightboxProviderProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const titleId = useId();

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrevious = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null || photos.length === 0) return current;
      return (current - 1 + photos.length) % photos.length;
    });
  }, [photos.length]);
  const showNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null || photos.length === 0) return current;
      return (current + 1) % photos.length;
    });
  }, [photos.length]);

  useEffect(() => {
    if (activeIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, close, showNext, showPrevious]);

  const activePhoto = activeIndex === null ? null : photos[activeIndex];

  return (
    <PhotoLightboxContext.Provider
      value={{
        householdId,
        photos,
        openAt: setActiveIndex,
      }}
    >
      {children}
      {activePhoto && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-labelledby={titleId}
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
              role="dialog"
            >
              <button
                aria-label="Close"
                className="absolute inset-0 cursor-default"
                onClick={close}
                type="button"
              />

              <div className="relative z-10 flex max-h-full w-full max-w-6xl flex-col items-center gap-3">
                <div className="flex w-full items-center justify-between gap-3 text-white">
                  <p className="text-sm capitalize text-white/80" id={titleId}>
                    {activePhoto.role}
                    {photos.length > 1 && activeIndex !== null ? (
                      <span className="text-white/60">
                        {" "}
                        · {activeIndex + 1} of {photos.length}
                      </span>
                    ) : null}
                  </p>
                  <Button
                    aria-label="Close"
                    className="shrink-0 text-white hover:bg-white/10 hover:text-white"
                    onClick={close}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X className="size-5" />
                  </Button>
                </div>

                <div className="relative flex w-full items-center justify-center">
                  {photos.length > 1 ? (
                    <Button
                      aria-label="Previous photo"
                      className="absolute left-0 z-10 text-white hover:bg-white/10 hover:text-white sm:left-2"
                      onClick={showPrevious}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <ChevronLeft className="size-6" />
                    </Button>
                  ) : null}

                  <img
                    alt=""
                    className="max-h-[75vh] w-auto max-w-full rounded-md object-contain"
                    src={photoPath(householdId, activePhoto.id)}
                  />

                  {photos.length > 1 ? (
                    <Button
                      aria-label="Next photo"
                      className="absolute right-0 z-10 text-white hover:bg-white/10 hover:text-white sm:right-2"
                      onClick={showNext}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <ChevronRight className="size-6" />
                    </Button>
                  ) : null}
                </div>

                {activePhoto.width && activePhoto.height ? (
                  <p className="text-xs text-white/60">
                    {activePhoto.width}×{activePhoto.height}
                  </p>
                ) : null}

                {activePhoto.caption ? (
                  <p className="max-w-2xl text-center text-sm whitespace-pre-wrap text-white/90">
                    {activePhoto.caption}
                  </p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </PhotoLightboxContext.Provider>
  );
}

type PhotoLightboxTriggerProps = {
  photo: PhotoLightboxItem;
  className?: string;
  children?: ReactNode;
};

export function PhotoLightboxTrigger({ photo, className, children }: PhotoLightboxTriggerProps) {
  const context = usePhotoLightbox();
  const index = context?.photos.findIndex((item) => item.id === photo.id) ?? -1;

  if (!context || index < 0) {
    return <>{children}</>;
  }

  return (
    <button
      className={className ?? "block cursor-zoom-in overflow-hidden rounded-md border p-0"}
      onClick={() => context.openAt(index)}
      type="button"
    >
      {children}
    </button>
  );
}

type PhotoLightboxMoreTriggerProps = {
  atIndex: number;
  className?: string;
  children: ReactNode;
};

export function PhotoLightboxMoreTrigger({
  atIndex,
  className,
  children,
}: PhotoLightboxMoreTriggerProps) {
  const context = usePhotoLightbox();

  if (!context) {
    return <span className={className}>{children}</span>;
  }

  return (
    <button
      className={className ?? "text-xs text-muted-foreground hover:underline"}
      onClick={() => context.openAt(atIndex)}
      type="button"
    >
      {children}
    </button>
  );
}
