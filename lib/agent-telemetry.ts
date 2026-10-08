// ============================================================
// Who is requesting company pages — counted by user-agent class.
//
// Telemetry (#60) showed crawler bursts on /company/[number] that drain the
// shared Companies House key, but Vercel's runtime logs carry no user agent.
// The company page records each request's agent here, and every instance
// prints one "[ch-agents]" JSON line a minute. Search the Vercel logs for it.
//
// Classification only: a known crawler's name, otherwise the product token of
// an unknown bot (letters/digits only, truncated), otherwise "browser" or
// "other". No IPs, no full user-agent strings. A user agent can be spoofed, so
// "Googlebot" here means "claims to be Googlebot".
// Pure apart from the console, with an injectable clock for tests.
// ============================================================

export const AGENT_FLUSH_MS = 60_000;

// Order matters: the first match wins (e.g. "Googlebot-Image" before "Googlebot").
const KNOWN: [RegExp, string][] = [
  [/Googlebot-Image/i, "Googlebot-Image"],
  [/Google-InspectionTool/i, "Google-InspectionTool"],
  [/Storebot-Google/i, "Storebot-Google"],
  [/Google-Extended|GoogleOther/i, "GoogleOther"],
  [/AdsBot-Google/i, "AdsBot-Google"],
  [/Googlebot/i, "Googlebot"],
  [/bingbot|BingPreview/i, "Bingbot"],
  [/GPTBot/i, "GPTBot"],
  [/OAI-SearchBot/i, "OAI-SearchBot"],
  [/ChatGPT-User/i, "ChatGPT-User"],
  [/ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai/i, "ClaudeBot"],
  [/PerplexityBot|Perplexity-User/i, "PerplexityBot"],
  [/Amazonbot/i, "Amazonbot"],
  [/Applebot/i, "Applebot"],
  [/Bytespider/i, "Bytespider"],
  [/meta-externalagent|facebookexternalhit|meta-externalfetcher/i, "Meta"],
  [/CCBot/i, "CCBot"],
  [/AhrefsBot|AhrefsSiteAudit/i, "AhrefsBot"],
  [/SemrushBot|SiteAuditBot/i, "SemrushBot"],
  [/MJ12bot/i, "MJ12bot"],
  [/DotBot/i, "DotBot"],
  [/DataForSeoBot/i, "DataForSeoBot"],
  [/YandexBot|YandexImages/i, "YandexBot"],
  [/Baiduspider/i, "Baiduspider"],
  [/DuckDuckBot|DuckAssistBot/i, "DuckDuckBot"],
  [/PetalBot/i, "PetalBot"],
  [/SeznamBot/i, "SeznamBot"],
  [/Twitterbot/i, "Twitterbot"],
  [/LinkedInBot/i, "LinkedInBot"],
  [/Slackbot/i, "Slackbot"],
  [/Discordbot/i, "Discordbot"],
  [/WhatsApp/i, "WhatsApp"],
  [/vercel-screenshot|vercel-favicon|Vercelbot/i, "Vercel"],
];

/** A short, non-identifying label for a user agent. */
export function classifyAgent(ua: string | null | undefined): string {
  if (!ua || !ua.trim()) return "none";
  for (const [re, name] of KNOWN) if (re.test(ua)) return name;
  const bot = ua.match(/([A-Za-z][A-Za-z0-9._-]{1,40}(?:bot|crawler|spider|scraper|fetcher))/i);
  if (bot) return `bot:${bot[1].replace(/[^A-Za-z0-9._-]/g, "").slice(0, 32)}`;
  if (/python-requests|aiohttp|httpx|curl\/|wget\/|Go-http-client|node-fetch|axios|okhttp|Java\/|libwww|Scrapy|HeadlessChrome|PhantomJS/i.test(ua)) {
    const tool = ua.match(/(python-requests|aiohttp|httpx|curl|wget|Go-http-client|node-fetch|axios|okhttp|Java|libwww-perl|Scrapy|HeadlessChrome|PhantomJS)/i);
    return `tool:${tool ? tool[1] : "unknown"}`;
  }
  if (/Mozilla\/5\.0/.test(ua) && /(Chrome|Firefox|Safari|Edg)\//.test(ua)) return "browser";
  return "other";
}

export class AgentCounter {
  private started: number;
  private counts: Record<string, number> = {};
  private total = 0;

  constructor(
    private readonly meta: Record<string, string | undefined>,
    private readonly log: (line: string) => void = (l) => console.info(l),
    private readonly now: () => number = Date.now
  ) {
    this.started = now();
  }

  record(ua: string | null | undefined): void {
    if (this.now() - this.started >= AGENT_FLUSH_MS) this.flush();
    const a = classifyAgent(ua);
    this.counts[a] = (this.counts[a] ?? 0) + 1;
    this.total++;
  }

  flush(): void {
    if (this.total > 0) {
      const top = Object.fromEntries(Object.entries(this.counts).sort((x, y) => y[1] - x[1]).slice(0, 12));
      this.log(
        "[ch-agents] " +
          JSON.stringify({
            route: "/company/[number]",
            ...this.meta,
            windowSec: Math.round((this.now() - this.started) / 1000),
            requests: this.total,
            agents: top,
          })
      );
    }
    this.started = this.now();
    this.counts = {};
    this.total = 0;
  }
}

export const companyPageAgents = new AgentCounter({
  deployment: typeof process !== "undefined" ? process.env.VERCEL_DEPLOYMENT_ID?.slice(-8) : undefined,
  instance: Math.random().toString(36).slice(2, 8),
});
