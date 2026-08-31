import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Crown,
  Languages,
  Moon,
  Music,
  Palette,
  Play,
  Scroll,
  Sparkles,
  User,
  Volume2,
} from "lucide-react";

import { AppShell, SectionTitle } from "../components/AppShell";
import { KbachDivider } from "../components/KhmerOrnament";
import { OukPiece } from "../components/OukPiece";
import { SplashScreen, replaySplash } from "../components/SplashScreen";
import { AuthModal, UserProfileCard } from "../components/AuthModal";
import { LANGUAGES, useI18n } from "../lib/i18n";
import {
  BOARD_THEMES,
  PIECE_STYLES,
  useSettings,
  type BoardTheme,
  type PieceStyle,
} from "../lib/settings";
import type { RuleSetId } from "../lib/khmer-chess";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Ouk Chatrang Board Themes & Language" },
      {
        name: "description",
        content:
          "Choose your language, board theme, night temple mode, sound effects, BGM and animations for Ouk Chatrang.",
      },
      { property: "og:title", content: "Settings — Ouk Chatrang" },
      {
        property: "og:description",
        content: "Language, Angkor board themes, night mode, sound, BGM and motion preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const {
    dark,
    sound,
    sfxVolume,
    bgmTrack,
    musicVolume,
    motion,
    boardTheme,
    pieceStyle,
    defaultRuleset,
    update,
  } = useSettings();

  const toggles = [
    { key: "dark_mode", icon: Moon, on: dark, set: (v: boolean) => update({ dark: v }) },
    { key: "animations", icon: Sparkles, on: motion, set: (v: boolean) => update({ motion: v }) },
  ] as const;

  return (
    <AppShell title={t("settings")} subtitle={t("preferences")}>
      <SectionTitle icon={User}>{t("auth_profile")}</SectionTitle>
      <UserProfileCard onOpenAuth={() => setAuthModalOpen(true)} />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <div className="my-5">
        <KbachDivider />
      </div>

      <SectionTitle icon={Languages}>{t("language_section")}</SectionTitle>
      <div className="stagger-children grid grid-cols-2 gap-2.5">
        {LANGUAGES.map((l) => {
          const on = lang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-left transition-all duration-300 ${
                on
                  ? "border-gold bg-gold/15 shadow-gold"
                  : "border-border bg-card hover:border-gold/60"
              }`}
            >
              <span className="text-xl leading-none">{l.flag}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {l.native}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">{l.name}</span>
              </span>
              {on ? <Check className="h-4 w-4 text-gold-dark" /> : null}
            </button>
          );
        })}
      </div>

      <div className="my-5">
        <KbachDivider />
      </div>

      <SectionTitle icon={Scroll}>{t("game_ruleset")}</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        {(
          [
            { id: "folk", label: "folk_ruleset", tag: "folk_ruleset_tag" },
            {
              id: "international",
              label: "international_ruleset",
              tag: "international_ruleset_tag",
            },
          ] as const
        ).map((r) => {
          const on = (defaultRuleset ?? "folk") === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => update({ defaultRuleset: r.id as RuleSetId })}
              className={`flex flex-col justify-between rounded-2xl border p-3 text-left transition-all duration-300 ${
                on
                  ? "border-gold bg-gold/15 shadow-gold ring-1 ring-gold/40"
                  : "border-border bg-card hover:border-gold/60"
              }`}
            >
              <div>
                <span className="block font-serif text-xs font-semibold text-foreground">
                  {t(r.label)}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">{t(r.tag)}</span>
              </div>
              {on ? (
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-gold-dark">
                  <Check className="h-3 w-3" /> {t("selected")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="my-5">
        <KbachDivider />
      </div>

      <SectionTitle icon={Music}>{t("audio_section")}</SectionTitle>
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-3.5">
        {/* Audio ON / OFF Controls */}
        <div>
          <span className="block font-serif text-xs font-semibold text-foreground mb-2">
            {t("audio_on_off")}
          </span>
          <div className="grid grid-cols-1 gap-2">
            {/* Background Music Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextTrack = bgmTrack === "off" ? "angkor_dawn" : "off";
                update({ bgmTrack: nextTrack });
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 p-2.5 text-left transition-colors hover:border-gold/60"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-gold/30 bg-secondary">
                <Music className="h-3.5 w-3.5 text-gold-dark" />
              </span>
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-semibold text-foreground">
                  {t("bgm_track")}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {bgmTrack === "off" ? t("bgm_off") : t("unmute")}
                </span>
              </div>
              <span
                className={`relative h-5 w-9 rounded-full transition-colors duration-300 ${
                  bgmTrack !== "off" ? "bg-gold" : "bg-secondary"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform duration-300 ${
                    bgmTrack !== "off" ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>

            {/* Sound Effects Toggle */}
            <button
              type="button"
              onClick={() => update({ sound: !sound })}
              className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 p-2.5 text-left transition-colors hover:border-gold/60"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-gold/30 bg-secondary">
                <Volume2 className="h-3.5 w-3.5 text-gold-dark" />
              </span>
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-semibold text-foreground">
                  {t("sound_effects")}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {sound ? t("unmute") : t("mute")}
                </span>
              </div>
              <span
                className={`relative h-5 w-9 rounded-full transition-colors duration-300 ${
                  sound ? "bg-gold" : "bg-secondary"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform duration-300 ${
                    sound ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Volume Control Sliders */}
        <div className="mt-1 pt-2.5 border-t border-border/50 grid gap-3">
          <span className="block font-serif text-xs font-semibold text-foreground">
            {t("volume_control")}
          </span>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-foreground text-[11px]">{t("music_volume")}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {Math.round((musicVolume ?? 0.4) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume ?? 0.4}
              onChange={(e) => update({ musicVolume: parseFloat(e.target.value) })}
              className="w-full accent-gold cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-foreground text-[11px]">{t("sfx_volume")}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {Math.round((sfxVolume ?? 0.7) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume ?? 0.7}
              onChange={(e) => update({ sfxVolume: parseFloat(e.target.value) })}
              className="w-full accent-gold cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="my-5">
        <KbachDivider />
      </div>

      <SectionTitle icon={Crown}>{t("piece_style_section")}</SectionTitle>
      <div className="grid gap-2.5">
        {(Object.keys(PIECE_STYLES) as PieceStyle[]).map((key) => {
          const style = PIECE_STYLES[key];
          const on = (pieceStyle ?? "ada") === key;
          const isDefault = key === "ada";
          return (
            <button
              key={key}
              type="button"
              onClick={() => update({ pieceStyle: key })}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-300 ${
                on
                  ? "border-gold bg-gold/15 shadow-gold ring-1 ring-gold/40"
                  : "border-border bg-card hover:border-gold/60"
              }`}
            >
              {/* Preview 3 pieces (Ang/King, Ses/Horse, Trey Bork/Promoted Fish) */}
              <div className="flex shrink-0 items-center gap-1 rounded-xl border border-gold/30 bg-secondary/80 p-1.5 shadow-xs">
                {style.previewPieces.map((p, idx) => (
                  <OukPiece
                    key={idx}
                    type={p.type}
                    color={p.color}
                    pieceStyle={key}
                    className="h-8 w-8"
                  />
                ))}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-serif text-xs font-semibold text-foreground">
                    {t(style.labelKey)}
                  </span>
                  {isDefault ? (
                    <span className="rounded-md border border-gold/40 bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold text-gold-dark">
                      {t("selected")}
                    </span>
                  ) : null}
                </div>
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                  {t(style.descKey)}
                </span>
              </div>

              {on ? (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold text-background shadow-xs">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="my-5">
        <KbachDivider />
      </div>

      <SectionTitle icon={Palette}>{t("board_theme")}</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((key) => {
          const th = BOARD_THEMES[key];
          const on = boardTheme === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => update({ boardTheme: key })}
              className={`rounded-2xl border p-2.5 text-left transition-all duration-300 ${
                on
                  ? "border-gold bg-gold/10 shadow-gold"
                  : "border-border bg-card hover:border-gold/60"
              }`}
            >
              <span className="grid grid-cols-4 overflow-hidden rounded-lg">
                {Array.from({ length: 8 }, (_, i) => (
                  <span
                    key={i}
                    className="aspect-square"
                    style={{
                      background: (Math.floor(i / 4) + (i % 4)) % 2 === 1 ? th.dark : th.light,
                    }}
                  />
                ))}
              </span>
              <span className="mt-2 block truncate font-serif text-xs font-semibold text-foreground">
                {th.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="my-5">
        <KbachDivider />
      </div>

      <SectionTitle icon={Sparkles}>{t("preferences")}</SectionTitle>
      <ul className="grid gap-2">
        {toggles.map((o) => (
          <li key={o.key}>
            <button
              type="button"
              onClick={() => o.set(!o.on)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors duration-300 hover:border-gold/60"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-gold/30 bg-secondary">
                <o.icon className="h-4 w-4 text-gold-dark" />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">{t(o.key)}</span>
              <span
                className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${
                  o.on ? "bg-gold" : "bg-secondary"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform duration-300 ${
                    o.on ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => replaySplash()}
            className="flex w-full items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-3 text-left transition-colors duration-300 hover:bg-gold/20 hover:border-gold"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-gold/40 bg-gold/20">
              <Play className="h-4 w-4 text-gold-dark fill-gold-dark/30 ml-0.5" />
            </span>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                {t("preview_splash")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("preview_splash_desc")}
              </span>
            </div>
            <span className="rounded-lg border border-gold/40 bg-gold/20 px-2 py-1 text-[10px] font-bold text-gold-dark">
              {t("play_now")}
            </span>
          </button>
        </li>
      </ul>
    </AppShell>
  );
}
