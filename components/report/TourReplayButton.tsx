"use client";
// "How to read this" in the report header — replays the first-visit tour.
import { REPLAY_EVENT } from "@/components/report/ReportTour";

export function TourReplayButton() {
  return (
    <button type="button" className="rep-head__help" onClick={() => window.dispatchEvent(new Event(REPLAY_EVENT))}>
      <span className="rep-head__helpdot mono" aria-hidden="true">
        ?
      </span>
      How to read this
    </button>
  );
}
