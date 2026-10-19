import type { ReactNode } from "react";

const STYLE: Record<string, string> = {
  yes: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  no: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  conditional: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  unverified: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
};

const LABEL: Record<string, string> = {
  yes: "yes",
  no: "no",
  conditional: "conditional",
  unverified: "⚠ unverified",
};

export function Verdict({ v }: { v: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${STYLE[v] ?? STYLE.unverified}`}>
      {LABEL[v] ?? v}
    </span>
  );
}

export function Panel({ title, tone = "plain", children }: { title: string; tone?: "plain" | "warn"; children: ReactNode }) {
  const border = tone === "warn" ? "border-[var(--color-warn)]" : "border-black/10 dark:border-white/15";
  return (
    <section className={`border ${border} rounded-lg p-5 mb-6`}>
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}
