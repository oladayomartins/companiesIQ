"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Icon, IconButton, CompanyAvatar, type IconName } from "@/components/ds";

const NAV: { id: string; label: string; icon: IconName; href: string; count?: number }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid", href: "/app" },
  { id: "search", label: "Search", icon: "search", href: "/app/search" },
  { id: "discover", label: "Discover", icon: "star", href: "/app/discover" },
  { id: "watchlist", label: "Watchlists", icon: "bookmark", href: "/app/watchlists" },
  { id: "signals", label: "Signals", icon: "bell", href: "/app/signals" },
  { id: "analytics", label: "Analytics", icon: "barChart", href: "/app/analytics" },
  { id: "industries", label: "Industries", icon: "building", href: "/app/industries" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  if (href === "/app/search") return pathname.startsWith("/app/search") || pathname.startsWith("/app/company");
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
        router.push(`/app/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
      }}
    >
      <Icon name="search" size={17} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 5.3M companies, directors, SIC codes…" />
      <kbd className="kbd">/</kbd>
    </form>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-root ciq-dark">
      <aside className="sidebar">
        <Link className="brand" href="/app">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/ciq-mark-ink.svg" width={26} height={26} alt="" />
          <span className="brand__word">
            Companies<span className="brand__iq">IQ</span>
          </span>
        </Link>
        <nav className="side-nav">
          {NAV.map((n) => (
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
            <CompanyAvatar name="CIQ" size="sm" tone={0} />
            <div className="side-user__meta">
              <div className="side-user__name">Guest</div>
              <div className="side-user__plan">Free · sign in to save</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <Suspense fallback={<div className="topsearch" />}>
            <TopSearch />
          </Suspense>
          <div className="topbar__right">
            <span className="live-pill">
              <span className="live-dot" /> Live · Companies House
            </span>
            <IconButton icon="bell" label="Alerts" />
            <IconButton icon="download" label="Export" />
          </div>
        </header>
        <div className="app-scroll">{children}</div>
      </div>
    </div>
  );
}
