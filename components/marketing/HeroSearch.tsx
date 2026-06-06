"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Icon } from "@/components/ds";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const go = () => router.push(`/app/companies${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  return (
    <form
      className="hero__search"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <Icon name="search" size={18} />
      <input placeholder="Try “fintech · London · active”" value={q} onChange={(e) => setQ(e.target.value)} />
      <Button variant="primary" type="submit">
        Search
      </Button>
    </form>
  );
}
