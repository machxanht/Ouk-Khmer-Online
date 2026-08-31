import { useEffect, useState, useCallback } from "react";
import mascot from "../assets/mascot.png";
import angkor from "../assets/angkor-hero.jpg";
import { LotusMandala } from "./KhmerOrnament";
import { useSettings } from "../lib/settings";

export function replaySplash() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ouk-replay-splash"));
  }
}

export function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const { dark } = useSettings();
  // Inversion Rule:
  // - Giao diện ngày (dark = false) -> Splash chuyển đêm (isNightSplash = true)
  // - Giao diện đêm (dark = true)   -> Splash ban ngày (isNightSplash = false)
  const isNightSplash = !dark;

  const [stage, setStage] = useState<"rotating" | "logo" | "text" | "fadeout">("rotating");
  const [mounted, setMounted] = useState(true);
  const [playCount, setPlayCount] = useState(0);

  const startAnimation = useCallback(() => {
    setMounted(true);
    setStage("rotating");

    // 0.0s - 0.38s: Rotating mandala appears
    // 0.38s: Logo smoothly scales and fades into center
    const tLogo = setTimeout(() => {
      setStage("logo");
    }, 380);

    // 0.9s: Khmer game title & subtitle fade in below
    const tText = setTimeout(() => {
      setStage("text");
    }, 900);

    // 2.4s: Smooth fadeout to active screen
    const tFade = setTimeout(() => {
      setStage("fadeout");
    }, 2400);

    // 3.0s: Completely remove Splash from DOM
    const tFinish = setTimeout(() => {
      setMounted(false);
      onFinish?.();
    }, 3000);

    return () => {
      clearTimeout(tLogo);
      clearTimeout(tText);
      clearTimeout(tFade);
      clearTimeout(tFinish);
    };
  }, [onFinish]);

  // Handle replay events
  useEffect(() => {
    const handleReplay = () => {
      setPlayCount((prev) => prev + 1);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("ouk-replay-splash", handleReplay);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("ouk-replay-splash", handleReplay);
      }
    };
  }, []);

  // Run on mount and whenever playCount triggers
  useEffect(() => {
    const cleanup = startAnimation();
    return cleanup;
  }, [playCount, startAnimation]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ease-out ${
        isNightSplash
          ? "bg-[#1A1412] text-[#F5E6BE]"
          : "bg-[oklch(0.985_0.014_88)] text-[oklch(0.26_0.035_55)]"
      } ${stage === "fadeout" ? "opacity-0 pointer-events-none" : "opacity-100"}`}
    >
      {/* Angkor Wat Hero Background Image with Theme-Aware Overlay */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src={angkor}
          alt="Angkor Wat Monumental Temple"
          width={1536}
          height={1024}
          className={`h-full w-full object-cover transition-opacity duration-1000 ${
            isNightSplash
              ? "opacity-30 mix-blend-luminosity brightness-75 contrast-125"
              : "opacity-45 mix-blend-multiply brightness-105"
          }`}
        />
        {/* Soft Vignette & Atmospheric Depth Gradients */}
        <div
          className={`absolute inset-0 ${
            isNightSplash
              ? "bg-gradient-to-b from-[#1A1412]/90 via-[#1A1412]/50 to-[#1A1412]/95"
              : "bg-gradient-to-b from-[oklch(0.985_0.014_88)]/80 via-transparent to-[oklch(0.985_0.014_88)]/90"
          }`}
        />
        {/* Ancient Temple Grain Texture */}
        <div
          className={`temple-grain absolute inset-0 ${isNightSplash ? "opacity-45" : "opacity-60"}`}
        />
      </div>

      {/* Centerpiece: Reused Khmer Lotus Mandala (Enlarged & 2.75x Faster Spin) */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4">
        <div className="relative flex items-center justify-center">
          {/* Royal Gold Ambient Halo */}
          <div
            className={`absolute h-60 w-60 rounded-full blur-3xl pointer-events-none ${
              isNightSplash ? "bg-gold/40" : "bg-gold/30"
            }`}
          />

          {/* Exact LotusMandala from KhmerOrnament with 8s rotation */}
          <LotusMandala
            className={`h-72 w-72 sm:h-80 sm:w-80 animate-[spin_8s_linear_infinite] opacity-95 ${
              isNightSplash
                ? "text-gold drop-shadow-[0_0_30px_color-mix(in_oklab,var(--gold)_65%,transparent)]"
                : "text-gold-dark drop-shadow-[0_0_22px_color-mix(in_oklab,var(--gold-dark)_45%,transparent)]"
            }`}
          />

          {/* Official Mascot / Logo Centered with Transparency */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
              stage === "rotating" ? "opacity-0 scale-75" : "opacity-100 scale-100"
            }`}
          >
            <img
              src={mascot}
              alt="Ouk Chatrang Mascot"
              width={140}
              height={140}
              className="h-28 w-28 sm:h-32 sm:w-32 object-contain bg-transparent drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Khmer Game Typography matching Royal Gold / Heritage Palette */}
        <div
          className={`mt-6 text-center transition-all duration-700 ease-out ${
            stage === "text" || stage === "fadeout"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3"
          }`}
        >
          <h1
            className={`font-serif text-3xl sm:text-4xl font-bold tracking-wider ${
              isNightSplash
                ? "text-royal drop-shadow-[0_2px_12px_color-mix(in_oklab,var(--gold)_40%,transparent)]"
                : "text-royal drop-shadow-sm"
            }`}
          >
            អុកចត្រង្គ
          </h1>
          <p
            className={`mt-1.5 text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] ${
              isNightSplash ? "text-gold-light" : "text-gold-dark"
            }`}
          >
            OUK CHATRANG
          </p>
        </div>
      </div>
    </div>
  );
}
