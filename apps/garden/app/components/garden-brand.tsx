import { cn } from "~/lib/utils";

type GardenBrandProps = {
  className?: string;
  logoClassName?: string;
  titleClassName?: string;
};

export function GardenLogo({ className }: { className?: string }) {
  return (
    <img
      alt=""
      className={cn("size-9 shrink-0 rounded-md object-cover", className)}
      height={36}
      src="/garden-logo.png"
      width={36}
    />
  );
}

export function GardenBrand({ className, logoClassName, titleClassName }: GardenBrandProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 xs:max-w-full", className)}>
      <GardenLogo className={logoClassName} />
      <span className={cn("font-semibold tracking-tight xs:truncate", titleClassName)}>Garden</span>
    </span>
  );
}
