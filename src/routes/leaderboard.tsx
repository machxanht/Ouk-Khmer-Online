import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Crown,
  Flame,
  Globe2,
  Medal,
  RefreshCw,
  Swords,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell, SectionTitle } from "../components/AppShell";
import { authManager, type UserProfile } from "../lib/auth-manager";
import { useI18n } from "../lib/i18n";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Ouk Chatrang Real Rankings" },
      {
        name: "description",
        content:
          "Live real-time rankings and ELO ratings for Ouk Chatrang players worldwide — verified via Firestore.",
      },
      { property: "og:title", content: "Leaderboard — Ouk Chatrang Real Rankings" },
      {
        property: "og:description",
        content: "Track authentic ratings, win rates, and win streaks of real Khmer chess players.",
      },
    ],
  }),
  component: LeaderboardPage,
});

const TABS = ["tab_global", "tab_weekly", "tab_friends"] as const;

export function LeaderboardPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<(typeof TABS)[number]>("tab_global");
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(
    authManager.getUserProfile(),
  );

  const loadLeaderboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authManager.fetchLeaderboard(50);
      setPlayers(data);
    } catch (err: unknown) {
      console.warn("Leaderboard fetch error:", err);
      setError("Không thể tải bảng xếp hạng lúc này. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboardData();

    const unsub = authManager.onAuthStateChanged((_user, profile) => {
      setCurrentUserProfile(profile || null);
    });

    return () => unsub();
  }, []);

  // Filter and sort based on tab
  const getSortedList = (): UserProfile[] => {
    if (tab === "tab_weekly") {
      // Sort by win streak and total wins
      return [...players].sort((a, b) => {
        const streakDiff = (b.winStreak || 0) - (a.winStreak || 0);
        if (streakDiff !== 0) return streakDiff;
        return (b.wins || 0) - (a.wins || 0);
      });
    }

    if (tab === "tab_friends") {
      // Show top active players with games played
      return [...players].filter((p) => (p.gamesPlayed || 0) > 0);
    }

    // Default tab_global: Sort by Rating (ELO) descending
    return [...players].sort((a, b) => (b.rating || 1200) - (a.rating || 1200));
  };

  const list = getSortedList();

  // Find current user's rank in the active list
  const userRankIndex = currentUserProfile
    ? list.findIndex((p) => p.uid === currentUserProfile.uid)
    : -1;
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;

  return (
    <AppShell title={t("global_rankings")} subtitle={t("global_rankings_desc")}>
      {/* 1. Filter Tabs & Refresh Button */}
      <div className="animate-rise flex items-center gap-2">
        <div className="flex flex-1 gap-1.5 rounded-2xl border border-border bg-card p-1.5">
          {TABS.map((tb) => (
            <button
              key={tb}
              type="button"
              onClick={() => setTab(tb)}
              className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold transition-all duration-300 ${
                tab === tb
                  ? "bg-gold/20 text-gold-dark shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(tb)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={loadLeaderboardData}
          disabled={loading}
          title="Làm mới"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-card text-muted-foreground transition-all duration-200 hover:border-gold/60 hover:text-gold active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-gold" : ""}`} />
        </button>
      </div>

      {/* 2. Logged In User Ranking Status Card */}
      {currentUserProfile ? (
        <div className="mt-4 animate-rise rounded-2xl border border-gold/40 bg-gold/10 p-3.5 shadow-gold backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentUserProfile.photoURL ? (
                  <img
                    src={currentUserProfile.photoURL}
                    alt={currentUserProfile.displayName || "User"}
                    className="h-10 w-10 rounded-xl border border-gold/50 object-cover"
                  />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-gold/50 bg-secondary text-gold-dark font-serif font-bold">
                    {(currentUserProfile.displayName || "K")[0].toUpperCase()}
                  </div>
                )}
                {userRank && userRank <= 3 && (
                  <span className="absolute -top-1.5 -right-1.5 grid h-4 w-4 place-items-center rounded-full bg-gold text-[10px] font-bold text-royal shadow">
                    ★
                  </span>
                )}
              </div>
              <div>
                <span className="block font-serif text-sm font-bold text-foreground">
                  {currentUserProfile.displayName || "Kỳ thủ"}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {userRank ? `Hạng #${userRank} bảng đấu` : "Chưa có thứ hạng chính thức"}
                  {currentUserProfile.winStreak && currentUserProfile.winStreak > 1
                    ? ` • 🔥 ${currentUserProfile.winStreak} chuỗi thắng`
                    : ""}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="block rounded-full border border-jade/40 bg-jade/10 px-2.5 py-1 text-xs font-bold text-jade">
                {currentUserProfile.rating || 1200} ELO
              </span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                {currentUserProfile.wins || 0}W - {currentUserProfile.losses || 0}L
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 animate-rise rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <User className="h-4 w-4 text-gold" />
              <span>Đăng nhập để lưu điểm ELO và xếp hạng vào Bảng vàng hoàng gia.</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Real Leaderboard List */}
      <div className="mt-5">
        <SectionTitle icon={Trophy}>{t("leaderboard")}</SectionTitle>

        {loading ? (
          /* Skeleton Loading States */
          <div className="grid gap-2">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="flex animate-pulse items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="h-9 w-9 rounded-xl bg-muted/60" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-32 rounded bg-muted/60" />
                  <div className="h-3 w-20 rounded bg-muted/40" />
                </div>
                <div className="h-6 w-16 rounded-full bg-muted/50" />
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="text-xs text-destructive">{error}</p>
            <button
              type="button"
              onClick={loadLeaderboardData}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/20 px-3.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/30"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Thử lại
            </button>
          </div>
        ) : list.length === 0 ? (
          /* Empty Real State */
          <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
              <Swords className="h-6 w-6" />
            </div>
            <h4 className="mt-3 font-serif text-base font-bold text-foreground">
              Chưa có dữ liệu xếp hạng
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Hãy là kỳ thủ đầu tiên tham gia Đấu Online để ghi tên lên Bảng vàng hoàng gia!
            </p>
            <div className="mt-4">
              <Link
                to="/online"
                className="inline-flex items-center gap-2 rounded-xl bg-royal px-4 py-2 text-xs font-bold text-gold-light shadow-gold transition-transform hover:scale-105 active:scale-95"
              >
                <Globe2 className="h-4 w-4" />
                Đấu Online Ngay
              </Link>
            </div>
          </div>
        ) : (
          /* Real Ranking Rows */
          <ul className="stagger-children grid gap-2">
            {list.map((p, i) => {
              const isMe = currentUserProfile?.uid === p.uid;
              const totalGames = (p.wins || 0) + (p.losses || 0) + (p.draws || 0);
              const winRate = totalGames > 0 ? Math.round(((p.wins || 0) / totalGames) * 100) : 0;

              return (
                <li
                  key={p.uid || i}
                  className={`flex items-center gap-3 rounded-2xl border p-3 transition-all duration-300 hover:-translate-y-0.5 ${
                    isMe
                      ? "border-gold bg-gold/10 shadow-sm"
                      : "border-border bg-card hover:border-gold/60"
                  }`}
                >
                  {/* Rank Badge */}
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-xs font-bold ${
                      i === 0
                        ? "border-gold/60 bg-gold/20 text-gold-dark shadow-sm"
                        : i === 1
                          ? "border-muted-foreground/40 bg-muted/30 text-foreground"
                          : i === 2
                            ? "border-teak/40 bg-teak/20 text-teak"
                            : "border-border bg-secondary text-muted-foreground"
                    }`}
                  >
                    {i === 0 ? (
                      <Crown className="h-4 w-4 text-gold-dark" />
                    ) : i === 1 ? (
                      <Medal className="h-4 w-4 text-muted-foreground" />
                    ) : i === 2 ? (
                      <Medal className="h-4 w-4 text-teak" />
                    ) : (
                      i + 1
                    )}
                  </span>

                  {/* Player Name & Stats */}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate font-serif text-sm font-semibold text-foreground">
                      {p.displayName || "Kỳ thủ vô danh"}
                      {isMe && (
                        <span className="rounded bg-gold/20 px-1.5 py-0.2 text-[9px] font-bold text-gold-dark">
                          BẠN
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>
                        {p.wins || 0} {t("win")}
                        {p.losses ? ` • ${p.losses} ${t("loss")}` : ""}
                      </span>
                      {totalGames >= 3 && (
                        <span className="text-jade font-medium">({winRate}% thắng)</span>
                      )}
                      {p.winStreak && p.winStreak >= 2 ? (
                        <span className="flex items-center gap-0.5 text-gold-dark font-semibold">
                          <Flame className="h-3 w-3" />
                          {p.winStreak}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  {/* ELO Rating Badge */}
                  <div className="text-right shrink-0">
                    <span className="block rounded-full border border-jade/40 bg-jade/10 px-2.5 py-1 text-xs font-bold text-jade">
                      {p.rating || 1200}
                    </span>
                    {p.peakRating && p.peakRating > (p.rating || 1200) && (
                      <span className="mt-0.5 block text-[9px] text-muted-foreground">
                        Cao nhất: {p.peakRating}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
