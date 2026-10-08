// Internal target for HEAD requests to company pages (see middleware.ts).
//
// Next.js would otherwise render the whole company page for a HEAD — ~6
// Companies House calls — and discard the body. Middleware can't answer
// directly: Vercel drops content-type from middleware-built responses. So the
// middleware rewrites (URL unchanged for the client) to this handler, which
// answers with the headers only and never touches Companies House.
// Not linked anywhere; /api/ is disallowed in robots.txt.

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  png: "image/png",
};

function respond(kind: string): Response {
  return new Response(null, {
    status: 200,
    headers: {
      "content-type": TYPES[kind] ?? TYPES.html,
      // The company pages' own freshness (revalidate 300).
      "cache-control": "public, max-age=0, s-maxage=300, must-revalidate",
      "x-ciq-head": "short-circuit",
    },
  });
}

// The kind is a path segment, not a query param: query strings don't survive
// the middleware rewrite reliably.
export async function HEAD(_req: Request, ctx: { params: Promise<{ kind: string }> }): Promise<Response> {
  const { kind } = await ctx.params;
  return respond(kind);
}
