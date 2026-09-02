import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";

import angkor from "../assets/angkor-hero.jpg";
import { KbachCorner, KbachDivider, LotusMandala } from "../components/KhmerOrnament";
import { LANGUAGES, useI18n, type Lang } from "../lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ouk Chatrang — Ancient Khmer Chess" },
      {
        name: "description",
        content:
          "Play Ouk Chatrang, the royal Khmer chess of Angkor: AI matches, tactics lessons, replays and global rankings.",
      },
      { property: "og:title", content: "Ouk Chatrang — Ancient Khmer Chess" },
      {
        property: "og:description",
        content: "Learn and play the royal Khmer chess of Angkor with the sacred chess guide.",
      },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { lang, setLang, t } = useI18n();
  const [picked, setPicked] = useState<Lang | null>(null);
  const navigate = useNavigate();
  const active = picked ?? lang;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <img
        src={angkor}
        alt="Angkor Wat at sunrise"
        width={1536}
        height={1024}
        className="absolute inset-x-0 top-0 h-[46vh] w-full object-cover"
      />
      <div className="absolute inset-x-0 top-0 h-[46vh] bg-gradient-to-b from-transparent via-background/40 to-background" />
      <LotusMandala className="animate-spin-slow absolute -right-20 top-24 h-64 w-64 opacity-25" />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-8 pt-6">
        <div className="animate-rise flex flex-col items-center text-center">
          <span className="rounded-full border border-gold/50 bg-card/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-dark backdrop-blur">
            Angkor · 802 AD
          </span>
          <h1 className="text-royal mt-4 text-3xl font-bold">{t("app_title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("app_subtitle")}</p>
        </div>

        <div className="relative mx-auto mt-2 flex justify-center">
          <span className="animate-glow absolute bottom-6 h-24 w-40 rounded-full bg-gold/40 blur-2xl" />
          <img
            src="/mascot.png"
            alt="Ouk Chatrang mascot"
            width={512}
            height={512}
            className="animate-float relative h-52 w-52 drop-shadow-xl object-contain"
          />
        </div>

        <div className="kbach-frame animate-rise relative rounded-3xl bg-card/85 p-5 backdrop-blur">
          <KbachCorner className="absolute -left-1 -top-1 h-8 w-8 opacity-70" />
          <KbachCorner className="absolute -right-1 -top-1 h-8 w-8 scale-x-[-1] opacity-70" />
          <p className="text-center font-serif text-lg font-semibold text-foreground">
            {t("welcome_greeting")}
          </p>
          <p className="mt-1 text-center text-sm text-muted-foreground">{t("welcome_tagline")}</p>

          <KbachDivider className="my-4" />

          <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            {t("choose_language")}
          </p>

          <div className="stagger-children grid grid-cols-2 gap-2.5">
            {LANGUAGES.map((l) => {
              const on = active === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setPicked(l.code);
                    setLang(l.code);
                  }}
                  className={`flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-left transition-all duration-300 ${
                    on
                      ? "border-gold bg-gold/15 shadow-gold scale-[1.02]"
                      : "border-border bg-secondary/60 hover:border-gold/60"
                  }`}
                >
                  <span className="text-xl leading-none">{l.flag}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {l.native}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {l.name}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => navigate({ to: "/home" })}
            className="shimmer-sheen bg-royal mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-serif text-base font-semibold text-primary-foreground shadow-gold transition-transform duration-300 active:scale-[0.98]"
          >
            {t("enter")}
            <ChevronRight className="h-4 w-4" />
          </button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">{t("welcome_note")}</p>
        </div>
      </div>
    </div>
  );
}
