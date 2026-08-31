import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, History, PlayCircle } from "lucide-react";

import { AppShell, SectionTitle } from "../components/AppShell";
import { useI18n } from "../lib/i18n";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Match History & Replays — Ouk Chatrang" },
      {
        name: "description",
        content:
          "Review your past Ouk Chatrang matches, results and move counts, then replay them to study your play.",
      },
      { property: "og:title", content: "Match History & Replays — Ouk Chatrang" },
      {
        property: "og:description",
        content: "Browse past Khmer chess games with results, opponents and replays.",
      },
    ],
  }),
  component: HistoryPage,
});

const MATCHES: {
  id: string;
  opponent: string;
  result: "win" | "loss" | "draw";
  moves: number;
  date: string;
}[] = [
  { id: "m1", opponent: "Ouk AI · Master", result: "win", moves: 48, date: "2026-08-16" },
  { id: "m2", opponent: "Sokha Chan", result: "loss", moves: 61, date: "2026-08-15" },
  { id: "m3", opponent: "Local 2P", result: "draw", moves: 74, date: "2026-08-13" },
  { id: "m4", opponent: "Ouk AI · Apprentice", result: "win", moves: 35, date: "2026-08-11" },
];

const TONE = {
  win: "border-jade/40 bg-jade/10 text-jade",
  loss: "border-destructive/40 bg-destructive/10 text-destructive",
  draw: "border-gold/40 bg-gold/10 text-gold-dark",
} as const;

function HistoryPage() {
  const { t } = useI18n();

  return (
    <AppShell title={t("match_history_title")} subtitle={t("history_replays_desc")}>
      <SectionTitle icon={History}>{t("match_history_title")}</SectionTitle>
      {MATCHES.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {t("no_matches_yet")}
        </p>
      ) : (
        <ul className="stagger-children grid gap-2.5">
          {MATCHES.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/30 bg-secondary">
                <PlayCircle className="h-5 w-5 text-gold-dark" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-sm font-semibold text-foreground">
                  {m.opponent}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {m.date} · {m.moves} {t("move_history").toLowerCase()}
                </span>
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${TONE[m.result]}`}
              >
                {t(m.result)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
