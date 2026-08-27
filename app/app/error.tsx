"use client";
import { useEffect } from "react";
import { Button } from "@/components/ds";
import { ErrorState } from "@/components/app/ErrorState";

// Error boundary for the gated app. Renders inside the AppShell (nav stays put)
// so a server exception on any /app page degrades to a friendly retry instead
// of Next's raw "Application error" screen.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="screen">
      <ErrorState
        title="Something went wrong"
        body="We hit a snag loading this page. This is usually temporary — the live register can be briefly busy. Try again in a moment."
        ref={error.digest}
        actions={
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
