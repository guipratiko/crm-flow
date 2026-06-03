export function normalizeCompanyDocument(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits.length ? digits : null;
}
