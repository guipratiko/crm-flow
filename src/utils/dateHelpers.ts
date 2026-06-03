/** Helpers de data no fuso local do processo (TZ do servidor). */

export function startOfLocalDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfLocalDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function localDigestDay(d = new Date()): Date {
  return startOfLocalDay(d);
}

export function parseDueDate(value: string | null | undefined): Date | null {
  if (!value || !String(value).trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
