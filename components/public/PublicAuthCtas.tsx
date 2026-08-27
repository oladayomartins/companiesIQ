"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ds";
import { getSupabaseBrowser } from "@/lib/supabase/client";

// Client islands for the public SEO chrome. The pages stay static (great for
// crawlers); these hydrate with the visitor's session so a signed-in user
// never sees "Sign in / Create a free account" — they get a path back into
// the app instead.
function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) {
      setSignedIn(false);
      return;
    }
    sb.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);
  return signedIn;
}

/** Header CTA: "Open app" when signed in, else "Sign in" + "Get full access". */
export function PublicHeaderCta() {
  const signedIn = useSignedIn();
  if (signedIn) {
    return (
      <Button href="/app" variant="primary" iconRight="arrowRight">
        Open app
      </Button>
    );
  }
  return (
    <>
      <Link className="rep-head__link" href="/sign-in">
        Sign in
      </Link>
      <Button href="/pricing" variant="primary" iconRight="arrowRight">
        Get full access
      </Button>
    </>
  );
}

/** Bottom conversion band body (sub + buttons) — swaps to an in-app prompt
 *  once the visitor is signed in, so logged-in users aren't asked to register.
 *  `ctaLabel` lets each page match the button to the visitor's micro-moment
 *  ("Find companies in Leeds", "Track this sector"); it defaults to the
 *  generic "Create a free account". */
export function PublicCtaBody({ sub, ctaLabel = "Create a free account" }: { sub: string; ctaLabel?: string }) {
  const signedIn = useSignedIn();
  // Render the signed-out copy until we know (avoids a register flash for
  // logged-in users only briefly; SEO crawlers see the signed-out version).
  if (signedIn) {
    return (
      <>
        <p className="public-cta__sub">You&apos;re signed in. Jump into the app to search, score and save companies.</p>
        <div className="public-cta__row">
          <Button href="/app" variant="primary" iconRight="arrowRight">
            Open in CompaniesIQ
          </Button>
        </div>
      </>
    );
  }
  return (
    <>
      <p className="public-cta__sub">{sub}</p>
      <div className="public-cta__row">
        <Button href="/sign-in" variant="primary" iconRight="arrowRight">
          {ctaLabel}
        </Button>
        <Button href="/pricing" variant="secondary">See plans</Button>
      </div>
    </>
  );
}
