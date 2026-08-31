import { createFileRoute } from "@tanstack/react-router";
import { Crown, Medal, Trophy } from "lucide-react";
import { useState } from "react";

import { AppShell, SectionTitle } from "../components/AppShell";
import { useI18n } from "../lib/i18n";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Ouk Chatrang Rankings" },
      {
        name: "description",
        content:
          "Global, weekly and friends rankings for Ouk Chatrang players — track rating, wins and streaks.",
      },
      { property: "og:title", content: "Leaderboard — Ouk Chatrang Rankings" },
      {
        property: "og:description",
        content: "Track the top Khmer chess players across global, weekly and friends boards.",
      },
    ],
  }),
  component: LeaderboardPage,
});

const TABS = ["tab_global", "tab_weekly", "tab_friends"] as const;

const PLAYERS = [
  { name: "Sokha Chan", rating: 2412, wins: 318, flag: "🇰🇭" },
  { name: "Vibol Prak", rating: 2288, wins: 274, flag: "🇰🇭" },
  { name: "Minh Nguyen", rating: 2201, wins: 240, flag: "🇻🇳" },
  { name: "Dara Meas", rating: 2145, wins: 231, flag: "🇰🇭" },
  { name: "Claire Rey", rating: 2077, wins: 198, flag: "🇫🇷" },
  { name: "Rithy Sok", rating: 2010, wins: 187, flag: "🇰🇭" },
  { name: "Alex Grant", rating: 1954, wins: 172, flag: "🇬🇧" },
  { name: "Bopha Ly", rating: 1902, wins: 160, flag: "🇰🇭" },
];

const MEDALS = ["text-gold", "text-muted-foreground", "text-teak"];

function LeaderboardPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<(typeof TABS)[number]>("tab_global");
  const list =
    tab === "tab_friends" ? PLAYERS.slice(0, 3) : tab === "tab_weekly" ? PLAYERS.slice(2) : PLAYERS;

  return (
    <AppShell title={t("global_rankings")} subtitle={t("global_rankings_desc")}>
      <div className="animate-rise flex gap-1.5 rounded-2xl border border-border bg-card p-1.5">
        {TABS.map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => setTab(tb)}
            className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold transition-all duration-300 ${
              tab === tb
                ? "bg-gold/20 text-gold-dark"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(tb)}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <SectionTitle icon={Trophy}>{t("leaderboard")}</SectionTitle>
        <ul className="stagger-children grid gap-2">
          {list.map((p, i) => (
            <li
              key={p.name}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gold/30 bg-secondary text-xs font-bold text-foreground">
                {i < 3 ? (
                  i === 0 ? (
                    <Crown className={`h-4 w-4 ${MEDALS[0]}`} />
                  ) : (
                    <Medal className={`h-4 w-4 ${MEDALS[i]}`} />
                  )
                ) : (
                  i + 1
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-sm font-semibold text-foreground">
                  {p.flag} {p.name}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {p.wins} {t("win")}
                </span>
              </span>
              <span className="rounded-full border border-jade/40 bg-jade/10 px-2.5 py-1 text-[11px] font-bold text-jade">
                {p.rating}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
