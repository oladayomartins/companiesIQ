"use client";
import { useEffect } from "react";
import { growthEvent, type BeaconEvent } from "@/lib/growth/beacon";

/** Fires one funnel event on mount — drop into server-rendered gates/pages. */
export function GrowthBeacon({ event, refName }: { event: BeaconEvent; refName?: string }) {
  useEffect(() => {
    growthEvent(event, { ref: refName });
  }, [event, refName]);
  return null;
}
