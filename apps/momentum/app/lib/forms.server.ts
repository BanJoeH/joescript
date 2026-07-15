export function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : undefined;
}

export function getCheckedMonths(formData: FormData) {
  return Array.from({ length: 12 }, (_, index) => index + 1).filter(
    (month) => formData.get(`month-${month}`) === "on",
  );
}
