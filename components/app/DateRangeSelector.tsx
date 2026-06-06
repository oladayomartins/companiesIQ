"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ds";
import { RANGES, DEFAULT_RANGE } from "@/lib/ranges";

/** Chip-style date-range selector for the dashboard; drives the `range` URL param. */
export function DateRangeSelector() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("range") || DEFAULT_RANGE;
  return (
    <Tabs
      variant="pill"
      value={current}
      onChange={(id) => router.push(id === DEFAULT_RANGE ? "/app" : `/app?range=${id}`)}
      tabs={RANGES.map((r) => ({ id: r.id, label: r.short }))}
    />
  );
}
