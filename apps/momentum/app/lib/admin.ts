export const MOMENTUM_ADMIN_EMAIL = "jch.harrison@gmail.com";

export function isMomentumAdmin(email: string) {
  return email.trim().toLowerCase() === MOMENTUM_ADMIN_EMAIL;
}
