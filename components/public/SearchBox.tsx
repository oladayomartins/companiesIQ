"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Icon } from "@/components/ds";

export function SearchBox({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      className="hero__search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
      }}
    >
      <Icon name="search" size={18} />
      <input
        aria-label="Search UK companies"
        placeholder="Search 5.5M UK companies…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Button variant="primary" type="submit">
        Search
      </Button>
    </form>
  );
}
