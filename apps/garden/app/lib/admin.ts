export const GARDEN_ADMIN_EMAIL = "jch.harrison@gmail.com";

export function isGardenAdmin(email: string) {
  return email.trim().toLowerCase() === GARDEN_ADMIN_EMAIL;
}
