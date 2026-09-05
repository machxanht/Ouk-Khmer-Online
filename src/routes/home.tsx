import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, ChevronRight, Crown, Globe2, Sparkles, Swords, Users, X } from "lucide-react";

import { AppShell, SectionTitle } from "../components/AppShell";
import { KbachDivider } from "../components/KhmerOrnament";
import { OukPiece } from "../components/OukPiece";
import mascot from "../assets/mascot.png";
import { useI18n } from "../lib/i18n";
import { getDailyQuote } from "../lib/daily-quotes";
import { PIECE_NAMES, type PieceType } from "../lib/khmer-chess";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — Ouk Chatrang Ancient Khmer Chess" },
      {
        name: "description",
        content:
          "Welcome to Ouk Chatrang, the authentic royal chess of Angkor: online matchmaking, play vs AI, 2-player pass & play, piece guides and traditional Khmer culture.",
      },
      { property: "og:title", content: "Home — Ouk Chatrang Ancient Khmer Chess" },
      {
        property: "og:description",
        content:
          "Authentic Cambodian Ouk Chaktrang pieces, online matchmaking and royal piece guide.",
      },
    ],
  }),
  component: HomePage,
});

/**
 * 6 Primary Cambodian Ouk Chaktrang pieces for Home 3x2 Grid Overview:
 * Row 1: Ang / Sdaach (King), Neang (Queen / Seed), Koul (Elephant / Noble)
 * Row 2: Ses (Horse), Tuuk (Boat), Trey (Fish)
 * (Trey Bork is the promotion form of Trey and is covered in detail in the Learn section)
 */
const HOME_OUK_PIECES: PieceType[] = ["k", "q", "b", "n", "r", "p"];

const AI_OPPONENTS = [
  {
    depth: 1,
    key: "novice",
    piece: "p" as PieceType,
    title: "Trey Scout",
    note: "Calm, forgiving, good for learning.",
  },
  {
    depth: 2,
    key: "apprentice",
    piece: "n" as PieceType,
    title: "Ses Rider",
    note: "Faster tactics and sharper replies.",
  },
  {
    depth: 3,
    key: "master",
    piece: "b" as PieceType,
    title: "Koul Strategist",
    note: "Plans ahead and punishes loose moves.",
  },
  {
    depth: 4,
    key: "grandmaster",
    piece: "k" as PieceType,
    title: "Angkor Grandmaster",
    note: "The strongest challenge on this board.",
  },
] as const;

function HomePage() {
  const { t, lang } = useI18n();
  const dailyQuote = getDailyQuote(lang);
  const [showAiGate, setShowAiGate] = useState(false);

  return (
    <AppShell>
      {/* 1. Hero Button: CHƠI ONLINE (Direct to Online Matchmaking) */}
      <section className="kbach-frame animate-rise relative overflow-hidden rounded-3xl bg-card p-4">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold/20 blur-2xl" />
        <Link
          to="/online"
          className="shimmer-sheen bg-royal flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-primary-foreground shadow-gold transition-transform duration-300 active:scale-[0.98]"
        >
          <span className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/20 border border-gold/40 text-gold">
              <Globe2 className="h-5 w-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <span className="block font-serif text-base font-bold tracking-wide text-gold-light">
                {t("play_online_hero")}
              </span>
              <span className="block text-[11px] text-white/80 font-medium">
                {t("play_online_hero_desc")}
              </span>
            </div>
          </span>
          <ChevronRight className="h-5 w-5 text-gold-light shrink-0" />
        </Link>
      </section>

      <div className="my-5">
        <KbachDivider />
      </div>

      {/* 2. Game Modes: [Đấu với AI] and [2 người cùng máy] */}
      <SectionTitle icon={Swords}>{t("game_modes")}</SectionTitle>
      <div className="animate-rise grid grid-cols-2 gap-3">
        {/* [Đấu với AI] */}
        <button
          type="button"
          onClick={() => setShowAiGate(true)}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-temple active:scale-[0.98]"
        >
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-gold/40 bg-secondary text-gold-dark transition-transform duration-300 group-hover:scale-105">
              <Bot className="h-5 w-5" />
            </span>
            <span className="flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gold-dark">
              <Sparkles className="h-3 w-3" /> 4 rivals
            </span>
          </div>
          <div className="mt-4">
            <h4 className="font-serif text-sm font-semibold text-foreground">{t("play_vs_ai")}</h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Choose your rival before entering the board.
            </p>
          </div>
        </button>

        {/* [2 người cùng máy] */}
        <Link
          to="/play"
          search={{ mode: "local" }}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-temple active:scale-[0.98]"
        >
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-gold/40 bg-secondary text-gold-dark transition-transform duration-300 group-hover:scale-105">
              <Users className="h-5 w-5" />
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-gold" />
          </div>
          <div className="mt-4">
            <h4 className="font-serif text-sm font-semibold text-foreground">{t("local_2p")}</h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t("local_2p_desc")}</p>
          </div>
        </Link>
      </div>

      <div className="my-5">
        <KbachDivider />
      </div>

      {/* 6 Ouk Chaktrang Pieces Section: 3 columns x 2 rows */}
      <SectionTitle icon={Crown}>{t("pieces_guide")}</SectionTitle>
      <ul className="animate-rise grid grid-cols-3 gap-2.5">
        {HOME_OUK_PIECES.map((p) => {
          const info = PIECE_NAMES[p];
          const localizedName =
            ((info as Record<string, string | number>)[lang] as string) ?? info.en;
          return (
            <li
              key={p}
              className="group flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-temple"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-gold/30 bg-secondary/80 p-1 transition-transform duration-300 group-hover:scale-105">
                <OukPiece type={p} color="w" className="h-10 w-10" />
              </div>
              <div className="min-w-0">
                <span className="block truncate font-serif text-xs font-semibold text-foreground">
                  {info.km}
                </span>
                <span className="block truncate text-[11px] font-medium text-gold-dark">
                  {localizedName}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {showAiGate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 p-3 backdrop-blur-sm"
          onClick={() => setShowAiGate(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Choose AI opponent"
            onClick={(event) => event.stopPropagation()}
            className="kbach-frame max-h-[calc(100dvh-7rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-gold/50 bg-card p-4 shadow-2xl animate-rise sm:p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-dark">
                  Temple challengers
                </p>
                <h3 className="mt-1 font-serif text-xl font-bold text-foreground">
                  Choose your AI rival
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  One tap starts the match. Rules use your saved default.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAiGate(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-secondary text-muted-foreground transition hover:border-gold/60 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {AI_OPPONENTS.map((opponent) => (
                <Link
                  key={opponent.depth}
                  to="/play"
                  search={{ mode: "ai", depth: opponent.depth }}
                  className="group rounded-2xl border border-border bg-secondary/40 p-3 transition-all hover:-translate-y-0.5 hover:border-gold/70 hover:bg-gold/10 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-gold/30 bg-card">
                      <OukPiece type={opponent.piece} color="w" className="h-9 w-9" />
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-gold-dark" />
                  </div>
                  <p className="mt-2 font-serif text-xs font-bold text-foreground">
                    {opponent.title}
                  </p>
                  <p className="text-[10px] font-semibold text-gold-dark">{t(opponent.key)}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    {opponent.note}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Daily Wisdom Section */}
      <section className="kbach-frame animate-rise mt-5 flex items-center gap-3.5 rounded-3xl border border-gold/30 bg-card/90 p-4 shadow-sm backdrop-blur">
        <div className="relative shrink-0">
          <span className="animate-glow absolute inset-0 rounded-full bg-gold/30 blur-md" />
          <img
            src={mascot}
            alt="Ouk Chatrang mascot"
            width={64}
            height={64}
            loading="lazy"
            className="animate-float relative h-16 w-16 object-contain drop-shadow-md"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-dark">
            {t("daily_wisdom")}
          </p>
          <p className="mt-1 font-serif text-xs italic leading-relaxed text-foreground/90">
            “{dailyQuote.quote}”
          </p>
          {dailyQuote.author ? (
            <p className="mt-1 text-[10px] font-medium text-gold-dark/80 text-right">
              — {dailyQuote.author}
            </p>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
