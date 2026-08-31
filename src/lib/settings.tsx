import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Color, PieceType, RuleSetId } from "./khmer-chess";
import { audioManager } from "./audio";

export type BoardTheme = "sandstone" | "teak" | "ivory" | "jade";
export type PieceStyle = "cambodian" | "ada" | "ada-red";

export interface PieceStyleInfo {
  id: PieceStyle;
  labelKey: string;
  descKey: string;
  appearance: "ivory" | "gold" | "red";
  previewPieces: { type: PieceType; color: Color }[];
}

export const PIECE_STYLES: Record<PieceStyle, PieceStyleInfo> = {
  cambodian: {
    id: "cambodian",
    labelKey: "cambodian_ivory",
    descKey: "cambodian_ivory_desc",
    appearance: "ivory",
    previewPieces: [
      { type: "k", color: "w" },
      { type: "n", color: "w" },
      { type: "f", color: "w" },
    ],
  },
  ada: {
    id: "ada",
    labelKey: "ada_gold",
    descKey: "ada_gold_desc",
    appearance: "gold",
    previewPieces: [
      { type: "k", color: "w" },
      { type: "n", color: "w" },
      { type: "f", color: "w" },
    ],
  },
  "ada-red": {
    id: "ada-red",
    labelKey: "ada_red",
    descKey: "ada_red_desc",
    appearance: "red",
    previewPieces: [
      { type: "k", color: "w" },
      { type: "n", color: "w" },
      { type: "f", color: "w" },
    ],
  },
};

export function getPieceSrc(pieceStyle: string, color: Color, type: PieceType): string {
  const code = type.toUpperCase();
  return `/pieces/${pieceStyle}/${color}${code}.svg`;
}

type Settings = {
  dark: boolean;
  sound: boolean;
  sfxVolume: number;
  bgmTrack: string;
  musicVolume: number;
  motion: boolean;
  boardTheme: BoardTheme;
  pieceStyle: PieceStyle;
  defaultRuleset: RuleSetId;
  allowCasualUndo: boolean;
};

const DEFAULTS: Settings = {
  dark: false,
  sound: true,
  sfxVolume: 0.7,
  bgmTrack: "angkor_dawn",
  musicVolume: 0.4,
  motion: true,
  boardTheme: "sandstone",
  pieceStyle: "ada",
  defaultRuleset: "folk",
  allowCasualUndo: true,
};

const KEY = "ouk.settings";

type Ctx = Settings & { update: (patch: Partial<Settings>) => void };

const SettingsContext = createContext<Ctx>({ ...DEFAULTS, update: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        setSettings({ ...DEFAULTS, ...parsed });
        if (typeof parsed.sound === "boolean") audioManager.setSfxEnabled(parsed.sound);
        if (typeof parsed.sfxVolume === "number") audioManager.setSfxVolume(parsed.sfxVolume);
        if (typeof parsed.bgmTrack === "string") audioManager.setBgmTrack(parsed.bgmTrack);
        if (typeof parsed.musicVolume === "number") audioManager.setMusicVolume(parsed.musicVolume);
      } catch {
        /* ignore malformed */
      }
    } else {
      audioManager.setSfxEnabled(DEFAULTS.sound);
      audioManager.setSfxVolume(DEFAULTS.sfxVolume);
      audioManager.setBgmTrack(DEFAULTS.bgmTrack);
      audioManager.setMusicVolume(DEFAULTS.musicVolume);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.dark);
  }, [settings.dark]);

  const value = useMemo<Ctx>(
    () => ({
      ...settings,
      update: (patch) =>
        setSettings((prev) => {
          const next = { ...prev, ...patch };
          window.localStorage.setItem(KEY, JSON.stringify(next));

          if (patch.sound !== undefined) audioManager.setSfxEnabled(patch.sound);
          if (patch.sfxVolume !== undefined) audioManager.setSfxVolume(patch.sfxVolume);
          if (patch.bgmTrack !== undefined) audioManager.setBgmTrack(patch.bgmTrack);
          if (patch.musicVolume !== undefined) audioManager.setMusicVolume(patch.musicVolume);

          return next;
        }),
    }),
    [settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}

export const BOARD_THEMES: Record<BoardTheme, { light: string; dark: string; label: string }> = {
  sandstone: { light: "oklch(0.93 0.045 84)", dark: "oklch(0.72 0.08 62)", label: "Angkor Stone" },
  teak: { light: "oklch(0.9 0.05 80)", dark: "oklch(0.55 0.09 52)", label: "Royal Teak" },
  ivory: { light: "oklch(0.96 0.02 90)", dark: "oklch(0.78 0.05 88)", label: "Lotus Ivory" },
  jade: { light: "oklch(0.93 0.03 150)", dark: "oklch(0.58 0.08 165)", label: "Jade Temple" },
};
