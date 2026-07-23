"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

const attributionKeys = ["utm_source", "utm_medium", "utm_campaign", "source", "ref"] as const;
type AttributionEntry = [string, string];

function attributionEntries(): AttributionEntry[] {
  const current = new URLSearchParams(window.location.search);
  return attributionKeys.flatMap<AttributionEntry>((key) => {
    const value = current.get(key)?.trim().slice(0, 120);
    return value ? [[key, value]] : [];
  });
}

export function BookingLink({ className, children }: { className?: string; children: ReactNode }) {
  const [href, setHref] = useState("/book");

  useEffect(() => {
    const params = new URLSearchParams(attributionEntries());
    setHref(params.size ? `/book?${params.toString()}` : "/book");
  }, []);

  return <Link className={className} href={href}>{children}</Link>;
}

export function BookingAttributionFields() {
  const [entries, setEntries] = useState<AttributionEntry[]>([]);

  useEffect(() => {
    setEntries(attributionEntries());
  }, []);

  return entries.map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />);
}
