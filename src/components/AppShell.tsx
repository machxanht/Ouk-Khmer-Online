import { Link, useRouterState } from "@tanstack/react-router";
import { Crown, Gamepad2, GraduationCap, Home, Settings, Users } from "lucide-react";
import { type ReactNode, useState } from "react";

import { useI18n } from "../lib/i18n";
import { useOnlineCount } from "../hooks/useOnlineCount";
import { KbachDivider, LotusMandala } from "./KhmerOrnament";
import { AccountHeader } from "./AccountHeader";
import { AuthModal } from "./AuthModal";
import { PlayerNameModal } from "./PlayerNameModal";
import { authManager } from "../lib/auth-manager";
import mascot from "../assets/mascot.png";

const NAV = [
  { to: "/home", icon: Home, key: "home" },
  { to: "/play", icon: Gamepad2, key: "play" },
  { to: "/tactics", icon: GraduationCap, key: "learn" },
  { to: "/leaderboard", icon: Crown, key: "ranks" },
  { to: "/settings", icon: Settings, key: "settings" },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
  headerRight,
  showAccountBar = true,
  compact = false,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  showAccountBar?: boolean;
  compact?: boolean;
}) {
  const { t, lang } = useI18n();
  const { formatted: onlineText } = useOnlineCount(lang);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="temple-grain absolute inset-0 opacity-60" />
        <LotusMandala className="animate-spin-slow absolute -right-24 -top-24 h-72 w-72 opacity-[0.18]" />
        <LotusMandala className="animate-spin-slow absolute -left-28 bottom-10 h-64 w-64 opacity-[0.12]" />
      </div>

      {/* Main Header with Title & Branding + Online Status on Left, Auth Module on Right */}
      <header className="bg-temple sticky top-0 z-20 border-b border-gold/30 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-2 px-3 py-1.5 sm:px-4 sm:py-2.5">
          {/* Left Column: Mascot & Branding/Title + Online Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <span className="animate-glow absolute inset-0 rounded-full bg-gold/40 blur-md" />
              <img
                src={mascot}
                alt="Ouk Chatrang mascot"
                width={40}
                height={40}
                loading="lazy"
                className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-gold/60 bg-transparent object-contain p-0.5"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif truncate text-sm sm:text-base font-bold text-foreground leading-tight">
                {title ?? t("app_title")}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-jade font-medium leading-tight mt-0.5">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jade opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-jade" />
                </span>
                <span className="truncate">{onlineText}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Auth Module & Sound Control */}
          <div className="flex items-center gap-1.5 shrink-0">
            {showAccountBar && (
              <AccountHeader
                onOpenAuth={() => setAuthModalOpen(true)}
                onEditName={() => setNameModalOpen(true)}
              />
            )}
            {headerRight}
          </div>
        </div>
        <KbachDivider className="h-2 opacity-70" />
      </header>

      <main
        className={`relative z-10 mx-auto w-full max-w-lg flex-1 ${
          compact ? "px-2 sm:px-4 pb-20 sm:pb-24 pt-1 sm:pt-2" : "px-4 pb-28 pt-3"
        }`}
      >
        {children}
      </main>

      <nav
        className="bg-temple fixed bottom-0 left-0 right-0 z-20 border-t border-gold/30 backdrop-blur-md"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <ul className="mx-auto flex w-full max-w-lg items-stretch justify-between px-2 py-1.5">
          {NAV.map(({ to, icon: Icon, key }) => {
            const active = pathname === to;
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 transition-all duration-300 ${
                    active
                      ? "bg-gold/15 text-gold-dark"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform duration-300 ${
                      active ? "-translate-y-0.5 scale-110" : ""
                    }`}
                  />
                  <span className="text-[10px] font-medium">{t(key)}</span>
                  <span
                    className={`h-0.5 w-5 rounded-full bg-royal transition-opacity duration-300 ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Root Managed Auth Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={() => {
          if (!authManager.isProfileNameConfigured()) {
            setNameModalOpen(true);
          }
        }}
      />

      <PlayerNameModal isOpen={nameModalOpen} onClose={() => setNameModalOpen(false)} />
    </div>
  );
}

export function SectionTitle({
  icon: Icon,
  children,
}: {
  icon?: typeof Users;
  children: ReactNode;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {Icon ? <Icon className="h-3.5 w-3.5 text-gold" /> : null}
      {children}
    </h2>
  );
}
