import type { MediaAsset } from "~/content/work.server";

export function MediaFrame({
  media,
  priority = false,
  framed = true,
}: {
  media: MediaAsset;
  priority?: boolean;
  framed?: boolean;
}) {
  return (
    <figure className={framed ? "media-frame border border-line" : "media-frame"}>
      <img
        src={media.src}
        alt={media.alt}
        width={media.width}
        height={media.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    </figure>
  );
}
