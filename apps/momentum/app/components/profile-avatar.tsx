import { CircleUserRound } from "lucide-react";
import { Link } from "react-router";

import { cn } from "~/lib/utils";

type ProfileAvatarProps = {
  className?: string;
  size?: "sm" | "md";
  image?: string | null;
  name?: string | null;
};

export function ProfileAvatar({ className, size = "md", image, name }: ProfileAvatarProps) {
  const dim = size === "sm" ? "size-9" : "size-11";
  const icon = size === "sm" ? 18 : 22;

  return (
    <Link
      aria-label="Settings"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-card text-muted-foreground transition hover:border-border hover:opacity-100",
        image ? "opacity-90" : "shadow-soft",
        dim,
        className,
      )}
      to="/settings"
      title="Settings"
    >
      {image ? (
        <img
          alt={name ? `${name}'s profile` : "Profile"}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          src={image}
        />
      ) : (
        <CircleUserRound size={icon} strokeWidth={1.6} />
      )}
    </Link>
  );
}
