"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Icon, IconButton, CompanyAvatar, type IconName } from "@/components/ds";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type NavItem = { id: string; label: string; icon: IconName; href: string; count?: number; role?: "admin" | "partner" };

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid", href: "/app" },
  { id: "companies", label: "Companies", icon: "search", href: "/app/companies" },
  { id: "markets", label: "Markets", icon: "barChart", href: "/app/markets" },
  { id: "industries", label: "Industries", icon: "building", href: "/app/industries" },
  { id: "prospects", label: "Prospects", icon: "bookmark", href: "/app/prospects" },
  { id: "alerts", label: "Alerts", icon: "bell", href: "/app/alerts" },
  { id: "watchlist", label: "Watchlists", icon: "list", href: "/app/watchlists" },
  // DigitWarehouse-exclusive funnel tooling.
  { id: "campaigns", label: "Campaigns", icon: "briefcase", href: "/app/campaigns", role: "partner" },
  // Blog CMS — admins only.
  { id: "blog", label: "Blog", icon: "file", href: "/app/blog", role: "admin" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  if (href === "/app/companies") return pathname.startsWith("/app/companies") || pathname.startsWith("/app/company");
  return pathname.startsWith(href);
}

function TopSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);
  return (
    <form
      className="topsearch"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/app/companies${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
      }}
    >
      <Icon name="search" size={17} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 5.3M companies, directors, SIC codes…" />
      <kbd className="kbd">/</kbd>
    </form>
  );
}

export function AppShell({
  children,
  admin = false,
  partner = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
  partner?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = NAV.filter((n) => (n.role === "admin" ? admin : n.role === "partner" ? partner : true));
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  // Resolve the signed-in user for the sidebar footer (null in dev when
  // Supabase isn't configured, or for the brief moment before it loads).
  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  async function signOut() {
    const sb = getSupabaseBrowser();
    if (sb) await sb.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }
  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);
  return (
    <div className={"app-root ciq-dark" + (menuOpen ? " app-root--menu-open" : "")}>
      <button
        type="button"
        className="nav-scrim"
        aria-label="Close menu"
        onClick={() => setMenuOpen(false)}
      />
      <aside className={"sidebar" + (menuOpen ? " sidebar--open" : "")}>
        <Link className="brand" href="/app">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/ciq-mark-ink.svg" width={26} height={26} alt="" />
          <span className="brand__word">
            Companies<span className="brand__iq">IQ</span>
          </span>
        </Link>
        <nav className="side-nav">
          {nav.map((n) => (
            <Link key={n.id} className={"side-item" + (isActive(pathname, n.href) ? " side-item--active" : "")} href={n.href}>
              <Icon name={n.icon} size={18} />
              <span className="side-item__label">{n.label}</span>
              {n.count != null ? <span className="side-item__count">{n.count}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <Link className={"side-item" + (pathname.startsWith("/app/settings") ? " side-item--active" : "")} href="/app/settings">
            <Icon name="settings" size={18} />
            <span className="side-item__label">Settings</span>
          </Link>
          <div className="side-user">
            <CompanyAvatar name={email ? email[0].toUpperCase() : "CIQ"} size="sm" tone={0} />
            <div className="side-user__meta">
              <div className="side-user__name">{email ? email.split("@")[0] : "Guest"}</div>
              <div className="side-user__plan">{email ?? "Not signed in"}</div>
            </div>
            {email ? (
              <IconButton icon="external" label="Sign out" size="sm" onClick={signOut} />
            ) : (
              <Link href="/sign-in" className="side-user__signin">
                <Icon name="arrowRight" size={16} />
              </Link>
            )}
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <IconButton
            icon="menu"
            label="Open menu"
            className="topbar__menu"
            onClick={() => setMenuOpen(true)}
          />
          <Suspense fallback={<div className="topsearch" />}>
            <TopSearch />
          </Suspense>
          <div className="topbar__right">
            {partner ? (
              <span className="partner-pill" title="DigitWarehouse partner account">
                <Icon name="briefcase" size={13} /> DigitWarehouse
              </span>
            ) : null}
            <span className="live-pill">
              <span className="live-dot" /> Live · Companies House
            </span>
            <IconButton
              icon="bell"
              label="Alerts"
              className={pathname.startsWith("/app/alerts") ? "is-active" : ""}
              onClick={() => router.push("/app/alerts")}
            />
            <IconButton icon="download" label="Search &amp; export companies" onClick={() => router.push("/app/companies")} />
          </div>
        </header>
        <div className="app-scroll">{children}</div>
      </div>
    </div>
  );
}
