import { GARDEN_LOGOS } from "~/lib/garden-logos";
import { cn } from "~/lib/utils";

const DEFAULT_LOGO = GARDEN_LOGOS[0];

type GardenBrandProps = {
  className?: string;
  logoClassName?: string;
  logoSrc?: string;
  titleClassName?: string;
};

export function GardenLogo({
  className,
  src = DEFAULT_LOGO,
}: {
  className?: string;
  src?: string;
}) {
  return (
    <img
      key={src}
      alt=""
      className={cn("size-14 shrink-0 rounded-md object-contain", className)}
      height={56}
      src={src}
      width={56}
    />
  );
}

export function GardenBrand({
  className,
  logoClassName,
  logoSrc,
  titleClassName,
}: GardenBrandProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 xs:max-w-full", className)}>
      <GardenLogo className={logoClassName} src={logoSrc} />
      <span className={cn("font-semibold tracking-tight xs:truncate", titleClassName)}>Garden</span>
    </span>
  );
}
