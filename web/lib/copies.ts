export const MAX_COPIES = 50;

/** Maakt van elke invoer een geldig aantal labels (geheel getal, 1 t/m MAX_COPIES). */
export function normalizeCopies(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(MAX_COPIES, Math.round(value)));
}
