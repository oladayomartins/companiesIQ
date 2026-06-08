"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button, Icon } from "@/components/ds";

// Rotating, value-led examples so visitors immediately see what's possible
// (not "what do I type?").
const EXAMPLES = [
  "New care companies in Manchester",
  "Property firms incorporated this month",
  "AI startups in London",
  "Fast-growing fintech in the South East",
  "Construction companies registered this week",
];

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % EXAMPLES.length), 2800);
    return () => clearInterval(id);
  }, []);
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
      <input
        aria-label="Search the UK register"
        placeholder={`Try “${EXAMPLES[i]}”`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Button variant="primary" type="submit">
        Search
      </Button>
    </form>
  );
}
