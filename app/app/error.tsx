"use client";
import { useEffect } from "react";
import { Button, Icon } from "@/components/ds";

// Error boundary for the gated app. Renders inside the AppShell (nav stays put)
// so a server exception on any /app page degrades to a friendly retry instead
// of Next's raw "Application error" screen.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="screen">
      <div className="app-error-state">
        <div className="app-error-state__icon">
          <Icon name="alert" size={26} />
        </div>
        <h1 className="app-error-state__title">Something went wrong</h1>
        <p className="app-error-state__sub">
          We hit a snag loading this page. This is usually temporary — the live register can be briefly busy. Try again
          in a moment.
        </p>
        <div className="app-error-state__actions">
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
        </div>
        {error.digest ? <p className="app-error-state__ref mono">Ref: {error.digest}</p> : null}
      </div>
    </div>
  );
}
