import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Edit2,
  Lock,
  LogIn,
  PlusCircle,
  Scroll,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  User,
  UserRound,
  Volume1,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { AppShell, SectionTitle } from "../components/AppShell";
import { KbachDivider, LotusMandala } from "../components/KhmerOrnament";
import { OnlineMatchArena } from "../components/OnlineMatchArena";
import { AuthModal, UserProfileCard } from "../components/AuthModal";
import { PlayerNameModal } from "../components/PlayerNameModal";
import { authManager, type AuthUser } from "../lib/auth-manager";
import { useSimpleOnlineGame } from "../hooks/useSimpleOnlineGame";
import { useI18n } from "../lib/i18n";
import type { OnlineGameMode } from "../lib/online-types";
import { useSettings } from "../lib/settings";

export const Route = createFileRoute("/online")({
  component: OnlineMatchPage,
});

function OnlineMatchPage() {
  const { t } = useI18n();
  const settings = useSettings();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(authManager.isAuthenticated());

  const initialName = useMemo(() => {
    return authManager.getPlayerDisplayName();
  }, []);

  const {
    connectionStatus,
    matchStatus,
    player,
    opponent,
    opponentNotice,
    room,
    gameState,
    error,
    queueSize,
    messages,
    drawOfferSent,
    drawOfferReceived,
    drawDeclinedNotice,
    rematchOfferSent,
    rematchOfferReceived,
    rematchDeclinedNotice,
    startMatchmaking,
    cancelMatchmaking,
    createPrivateRoom,
    joinPrivateRoom,
    makeMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    requestRematch,
    declineRematch,
    sendMessage,
    resetToMenu,
  } = useSimpleOnlineGame(initialName);

  // Local Lobby State
  const [playerNameInput, setPlayerNameInput] = useState(initialName);
  const [selectedGameMode, setSelectedGameMode] = useState<OnlineGameMode>("folk");
  const [pinInput, setPinInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [showVolumePopover, setShowVolumePopover] = useState(false);

  useEffect(() => {
    const unsub = authManager.onAuthChange((u, p) => {
      setIsAuthenticated(u !== null);
      if (p?.displayName) {
        setPlayerNameInput(p.displayName);
      } else if (u?.displayName) {
        setPlayerNameInput(u.displayName);
      }
    });
    return unsub;
  }, []);

  const handleNameChange = (name: string) => {
    setPlayerNameInput(name);
    try {
      localStorage.setItem("ouk_online_player_name", name);
    } catch {
      // ignore
    }
  };

  const copyPin = useCallback(() => {
    if (!room?.pin) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(room.pin).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [room?.pin]);

  const handleStartQuickMatch = () => {
    const rulesetId = selectedGameMode === "folk" ? "folk" : "international";
    const timeControl =
      selectedGameMode === "blitz"
        ? { type: "blitz" as const, initialSeconds: 300 }
        : { type: "standard" as const, initialSeconds: 3600 };

    startMatchmaking(playerNameInput, rulesetId, selectedGameMode, timeControl);
  };

  const handleCreatePrivateRoom = () => {
    const rulesetId = selectedGameMode === "folk" ? "folk" : "international";
    const timeControl =
      selectedGameMode === "blitz"
        ? { type: "blitz" as const, initialSeconds: 300 }
        : { type: "standard" as const, initialSeconds: 3600 };

    createPrivateRoom(playerNameInput, rulesetId, selectedGameMode, timeControl);
  };

  const volumeControl = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowVolumePopover((prev) => !prev)}
        aria-label={t("volume_control")}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-300 ${
          !settings.sound && settings.bgmTrack === "off"
            ? "border-border/60 bg-secondary/40 text-muted-foreground"
            : "border-gold/40 bg-secondary text-gold-dark shadow-xs"
        }`}
      >
        {!settings.sound && settings.bgmTrack === "off" ? (
          <VolumeX className="h-4 w-4" />
        ) : settings.sfxVolume > 0.5 ? (
          <Volume2 className="h-4 w-4" />
        ) : (
          <Volume1 className="h-4 w-4" />
        )}
      </button>

      {showVolumePopover && (
        <div className="kbach-frame absolute right-0 top-11 z-50 w-64 rounded-2xl border border-gold/40 bg-card p-3 shadow-xl animate-fade-in space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{t("sound_effects")}</span>
            <button
              type="button"
              onClick={() => settings.update({ sound: !settings.sound })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                settings.sound ? "bg-gold-dark" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  settings.sound ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{t("sfx_volume")}</span>
              <span className="font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={(e) => settings.update({ sfxVolume: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-gold-dark"
            />
          </div>

          <KbachDivider className="my-1" />

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{t("music_volume")}</span>
              <span className="font-mono">{Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.musicVolume}
              onChange={(e) => settings.update({ musicVolume: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-gold-dark"
            />
          </div>
        </div>
      )}
    </div>
  );

  // ----------------------------------------------------
  // 1. PLAYING / FINISHED SCREEN: DEDICATED ARENA (NO AppShell)
  // ----------------------------------------------------
  if ((matchStatus === "playing" || matchStatus === "finished") && gameState) {
    return (
      <OnlineMatchArena
        connectionStatus={connectionStatus}
        matchStatus={matchStatus}
        player={player}
        opponent={opponent}
        opponentNotice={opponentNotice}
        room={room}
        gameState={gameState}
        error={error}
        messages={messages}
        drawOfferSent={drawOfferSent}
        drawOfferReceived={drawOfferReceived}
        drawDeclinedNotice={drawDeclinedNotice}
        rematchOfferSent={rematchOfferSent}
        rematchOfferReceived={rematchOfferReceived}
        rematchDeclinedNotice={rematchDeclinedNotice}
        makeMove={makeMove}
        resign={resign}
        offerDraw={offerDraw}
        acceptDraw={acceptDraw}
        declineDraw={declineDraw}
        requestRematch={requestRematch}
        declineRematch={declineRematch}
        sendMessage={sendMessage}
        resetToMenu={resetToMenu}
      />
    );
  }

  // ----------------------------------------------------
  // 2. SEARCHING SCREEN (Random Matchmaking in Progress)
  // ----------------------------------------------------
  if (matchStatus === "searching") {
    return (
      <AppShell
        title={t("online_match")}
        subtitle={t("searching_opponent")}
        headerRight={volumeControl}
      >
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4 py-8 animate-rise">
          <div className="relative my-8">
            <div className="absolute inset-0 rounded-full bg-gold/20 animate-ping opacity-60" />
            <LotusMandala className="w-24 h-24 animate-spin-slow text-gold-dark opacity-80" />
          </div>

          <h2 className="font-serif text-xl font-bold text-foreground">
            {t("searching_opponent")}
          </h2>
          <p className="mt-2 text-xs text-muted-foreground max-w-xs leading-relaxed">
            {selectedGameMode === "blitz"
              ? t("mode_blitz_5m_desc")
              : selectedGameMode === "folk"
                ? t("mode_folk_60m_desc")
                : t("mode_intl_60m_desc")}
          </p>

          <div className="mt-5 px-4 py-1.5 rounded-full bg-secondary border border-gold/30 text-xs font-medium text-gold-dark">
            {t("players_in_queue")}: <span className="font-bold font-mono">{queueSize || 1}</span>
          </div>

          <button
            type="button"
            onClick={cancelMatchmaking}
            className="mt-8 px-6 py-2.5 rounded-2xl border border-border bg-secondary/60 text-xs font-semibold text-foreground hover:border-gold/60 transition-all active:scale-95"
          >
            {t("cancel_match")}
          </button>
        </div>
      </AppShell>
    );
  }

  // ----------------------------------------------------
  // 3. WAITING SCREEN (Private Room Created, Awaiting PIN Entry)
  // ----------------------------------------------------
  if (matchStatus === "waiting") {
    return (
      <AppShell title={t("online_match")} subtitle={t("private_match")} headerRight={volumeControl}>
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4 py-8 animate-rise">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-gold/40 bg-secondary text-gold-dark mb-3 shadow-gold">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="font-serif text-xl font-bold text-foreground">{t("private_match")}</h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs leading-relaxed">
            {t("waiting_pin_desc")}
          </p>

          <div className="kbach-frame my-6 p-5 rounded-3xl border border-gold/50 bg-card shadow-xl max-w-xs w-full">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground block">
              {t("enter_pin")}
            </span>
            <div className="text-3xl sm:text-4xl font-mono font-black tracking-[0.2em] text-gold-dark py-3">
              {room?.pin || "------"}
            </div>
            <button
              type="button"
              onClick={copyPin}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-secondary hover:bg-gold/15 text-xs font-semibold text-foreground transition-all border border-gold/30 active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{t("pin_copied")}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-gold-dark" />
                  <span>{t("copy_pin")}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
            <span>{t("waiting_pin_desc")}</span>
          </div>

          <button
            type="button"
            onClick={resetToMenu}
            className="mt-8 px-6 py-2.5 rounded-2xl border border-border bg-secondary/60 text-xs font-semibold text-foreground hover:border-gold/60 transition-all active:scale-95"
          >
            {t("cancel_room")}
          </button>
        </div>
      </AppShell>
    );
  }

  // ----------------------------------------------------
  // 3.5. AUTHENTICATION REQUIRED GATEKEEPER
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <AppShell
        title={t("online_match")}
        subtitle={t("auth_login_required_title")}
        headerRight={volumeControl}
      >
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4 py-8 animate-rise">
          <div className="grid h-16 w-16 place-items-center rounded-3xl border border-gold/60 bg-secondary text-gold-dark mb-4 shadow-temple">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
            {t("auth_login_required_title")}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed">
            {t("auth_login_required_online_desc")}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gold bg-gradient-to-r from-gold to-amber-500 py-3 text-xs font-bold text-stone-900 shadow-md hover:brightness-105 active:scale-95 transition-all"
            >
              <LogIn className="h-4 w-4" />
              <span>{t("auth_login_to_play_online")}</span>
            </button>
            <Link
              to="/home"
              className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-secondary/70 py-3 text-xs font-semibold text-foreground hover:bg-secondary active:scale-95 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("return_home")}</span>
            </Link>
          </div>
        </div>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onAuthenticated={() => {
            if (!authManager.isProfileNameConfigured()) {
              setNameModalOpen(true);
            }
          }}
        />
        <PlayerNameModal
          isOpen={nameModalOpen}
          onClose={() => setNameModalOpen(false)}
          onSuccess={(newName) => setPlayerNameInput(newName)}
        />
      </AppShell>
    );
  }

  // ----------------------------------------------------
  // 4. MAIN LOBBY SCREEN (Matchmaking Setup)
  // ----------------------------------------------------
  return (
    <AppShell
      title={t("online_match")}
      subtitle={t("online_matchmaking_desc")}
      headerRight={volumeControl}
    >
      <div className="space-y-4 animate-rise pb-10">
        {/* Connection Status Pill Bar */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-card border border-border text-xs">
          <div className="flex items-center gap-2">
            {connectionStatus === "connected" ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <span className="text-muted-foreground text-[11px]">
                  {t("server_status")}:{" "}
                  <strong className="text-foreground">{t("connected")}</strong>
                </span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-muted-foreground text-[11px]">
                  {t("server_status")}:{" "}
                  <strong className="text-foreground">{t("connecting")}</strong>
                </span>
              </>
            )}
          </div>
          <Link
            to="/home"
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t("home")}</span>
          </Link>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 rounded-2xl bg-red-950/60 border border-red-800 text-red-200 text-xs text-center animate-fade-in">
            {error}
          </div>
        )}

        {/* Player Profile & Authentication Section */}
        <div className="space-y-2">
          <SectionTitle icon={UserRound}>{t("auth_profile")}</SectionTitle>
          <UserProfileCard onOpenAuth={() => setAuthModalOpen(true)} />
          <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
          <PlayerNameModal
            isOpen={nameModalOpen}
            onClose={() => setNameModalOpen(false)}
            onSuccess={(newName) => setPlayerNameInput(newName)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionTitle icon={UserRound}>{t("player_name")}</SectionTitle>
            <button
              type="button"
              onClick={() => setNameModalOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold-dark hover:underline"
            >
              <Edit2 className="h-3 w-3" />
              <span>{t("auth_edit_name")}</span>
            </button>
          </div>
          <div className="p-3.5 rounded-3xl bg-card border border-border/80 shadow-sm flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-gold/40 bg-secondary text-gold-dark shrink-0">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={playerNameInput}
              maxLength={30}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t("enter_player_name")}
              className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-gold/40 focus:border-gold"
            />
          </div>
        </div>

        <div className="my-2">
          <KbachDivider />
        </div>

        {/* Section 2: Choose Game Mode (Folk 60m / International 60m / Blitz 5m) */}
        <div className="space-y-3">
          <SectionTitle icon={Scroll}>{t("ruleset_selection")}</SectionTitle>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-xs">
            {/* 1. Folk (60m) */}
            <button
              type="button"
              onClick={() => setSelectedGameMode("folk")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-center transition-all ${
                selectedGameMode === "folk"
                  ? "bg-royal text-primary-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground font-medium"
              }`}
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span className="text-[11px] leading-tight line-clamp-1">{t("folk_ruleset")}</span>
              <span className="text-[9px] opacity-80 font-mono">60:00</span>
            </button>

            {/* 2. International (60m) */}
            <button
              type="button"
              onClick={() => setSelectedGameMode("international")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-center transition-all ${
                selectedGameMode === "international"
                  ? "bg-royal text-primary-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground font-medium"
              }`}
            >
              <Trophy className="h-4 w-4 shrink-0" />
              <span className="text-[11px] leading-tight line-clamp-1">
                {t("international_ruleset")}
              </span>
              <span className="text-[9px] opacity-80 font-mono">60:00</span>
            </button>

            {/* 3. Blitz (5m) */}
            <button
              type="button"
              onClick={() => setSelectedGameMode("blitz")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-center transition-all ${
                selectedGameMode === "blitz"
                  ? "bg-royal text-primary-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground font-medium"
              }`}
            >
              <Zap className="h-4 w-4 shrink-0" />
              <span className="text-[11px] leading-tight line-clamp-1">
                {t("blitz_ruleset_tag")}
              </span>
              <span className="text-[9px] opacity-80 font-mono">05:00</span>
            </button>
          </div>

          {/* Active Ruleset Summary Card */}
          <div className="rounded-2xl border border-border bg-card/60 p-3.5 animate-rise">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="font-serif text-xs font-bold text-foreground">
                {selectedGameMode === "folk"
                  ? t("mode_folk_60m")
                  : selectedGameMode === "international"
                    ? t("mode_intl_60m")
                    : t("mode_blitz_5m")}
              </span>
              <span className="text-[11px] font-medium text-gold-dark">
                {selectedGameMode === "blitz" ? "⚡ Blitz" : "60m + AFK"}
              </span>
            </div>
            <ul className="grid gap-1 pt-2 text-[11px] text-muted-foreground">
              {selectedGameMode === "folk" && (
                <>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-gold" />
                    {t("folk_ruleset_desc_1")}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-gold" />
                    {t("folk_ruleset_desc_2")}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-gold" />
                    {t("mode_folk_60m_desc")}
                  </li>
                </>
              )}
              {selectedGameMode === "international" && (
                <>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-gold" />
                    {t("international_ruleset_desc_1")}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-gold" />
                    {t("international_ruleset_desc_2")}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-gold" />
                    {t("mode_intl_60m_desc")}
                  </li>
                </>
              )}
              {selectedGameMode === "blitz" && (
                <>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-gold" />
                    {t("blitz_ruleset_desc_1")}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-gold" />
                    {t("blitz_ruleset_desc_2")}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-gold" />
                    {t("international_ruleset_desc_1")}
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="my-2">
          <KbachDivider />
        </div>

        {/* Section 3: Modes (Quick Match & Private Match) */}
        <div className="space-y-4">
          <SectionTitle icon={Swords}>{t("game_modes")}</SectionTitle>

          {/* Mode 1: ĐẤU NGẪU NHIÊN (Random Matchmaking) */}
          <div className="kbach-frame relative overflow-hidden rounded-3xl border border-gold/40 bg-card p-4 transition-all duration-300">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold/20 blur-2xl pointer-events-none" />
            <div className="flex items-start gap-3.5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-gold/40 bg-secondary text-gold-dark shrink-0 shadow-sm">
                <Swords className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-base font-semibold text-foreground">
                  {t("quick_match")}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {t("quick_match_desc")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartQuickMatch}
              disabled={connectionStatus !== "connected"}
              className="shimmer-sheen bg-royal mt-4 flex items-center justify-center gap-2.5 w-full rounded-2xl px-4 py-3.5 font-serif text-base font-semibold text-primary-foreground shadow-gold transition-transform duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <Sparkles className="h-5 w-5" />
              <span>{t("find_match")}</span>
            </button>
          </div>

          {/* Mode 2: PHÒNG RIÊNG (Private Room - Create PIN / Join PIN) */}
          <div className="rounded-3xl border border-border bg-card p-4 transition-all duration-300 space-y-3.5">
            <div className="flex items-start gap-3.5">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-gold/40 bg-secondary text-gold-dark shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-sm font-semibold text-foreground">
                  {t("private_match")}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {t("online_matchmaking_desc")}
                </p>
              </div>
            </div>

            {/* Sub-action A: Create Room & get PIN */}
            <button
              type="button"
              onClick={handleCreatePrivateRoom}
              disabled={connectionStatus !== "connected"}
              className="flex items-center justify-center gap-2 w-full rounded-2xl border border-gold/40 bg-secondary/80 py-3 px-4 font-serif text-xs font-semibold text-foreground transition-all duration-300 hover:border-gold hover:bg-gold/10 active:scale-95 disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4 text-gold-dark" />
              <span>{t("create_room_pin")}</span>
            </button>

            {/* Sub-action B: Enter PIN to Join */}
            <div className="pt-2 border-t border-border/50">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-2 block">
                {t("enter_pin")}
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="------"
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-center font-mono text-sm tracking-widest text-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/40"
                />
                <button
                  type="button"
                  onClick={() => joinPrivateRoom(pinInput, playerNameInput)}
                  disabled={connectionStatus !== "connected" || pinInput.length !== 6}
                  className="shimmer-sheen bg-royal rounded-xl px-4 py-2 font-serif text-xs font-semibold text-primary-foreground shadow-gold transition-all active:scale-95 disabled:opacity-50"
                >
                  {t("join")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
