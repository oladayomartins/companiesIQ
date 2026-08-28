// Monthly API call allowance by plan. Kept separate from lib/api-keys.ts, which
// is server-only — the docs page and Settings UI need these numbers too.
export const API_QUOTAS: Record<string, number> = {
  free: 0,
  analyst: 0,
  team: 10_000,
  enterprise: 250_000,
};
