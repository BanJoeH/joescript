import { type LinkProps, Link as RouterLink } from "react-router";

export type { LinkProps };

export function Link({ prefetch = "intent", ...props }: LinkProps) {
  return <RouterLink prefetch={prefetch} {...props} />;
}
