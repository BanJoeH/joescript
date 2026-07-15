/** Display name for greetings: preferred name, else first word of full name. */
export function getPreferredDisplayName(user: {
  preferredName?: string | null;
  name?: string | null;
}) {
  const preferred = user.preferredName?.trim();
  if (preferred) return preferred;
  const fromName = user.name?.trim().split(/\s+/)[0];
  return fromName || "there";
}
