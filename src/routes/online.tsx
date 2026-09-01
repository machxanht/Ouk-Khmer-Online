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
  const [selectedGameMode, setSelectedGameMode] = useState<OnlineGameMode>("folk");
  const [matchType, setMatchType] = useState<"random" | "create" | "join">("random");
  const [pinInput, setPinInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(authManager.getCurrentProfile());

  useEffect(() => {
    const unsub = authManager.onAuthChange((u, p) => {
      setIsAuthenticated(u !== null);
      setCurrentProfile(p || null);
    });
    return unsub;
  }, []);

  const playerName = currentProfile?.displayName || authManager.getPlayerDisplayName();

  const copyPin = useCallback(() => {
    if (!room?.pin) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(room.pin).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [room?.pin]);

  const handleStartMatch = () => {
    const rulesetId = selectedGameMode === "folk" ? "folk" : "international";
    const timeControl =
      selectedGameMode === "blitz"
        ? { type: "blitz" as const, initialSeconds: 300 }
        : { type: "standard" as const, initialSeconds: 3600 };

    if (matchType === "random") {
      startMatchmaking(playerName, rulesetId, selectedGameMode, timeControl);
    } else if (matchType === "create") {
      createPrivateRoom(playerName, rulesetId, selectedGameMode, timeControl);
    } else if (matchType === "join") {
      if (pinInput.trim().length === 6) {
        joinPrivateRoom(pinInput.trim(), playerName);
      }
    }
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

        {/* UNIFIED 3-STEP ONLINE MATCH PIPELINE */}
        <div className="space-y-4">
          {/* BƯỚC 1: CHỌN LUẬT CỜ */}
          <div className="space-y-2.5 rounded-2xl border border-gold/30 bg-card/85 p-3.5 shadow-xs backdrop-blur">
            <div className="flex items-center justify-between">
              <SectionTitle icon={Scroll}>{t("step_1_ruleset")}</SectionTitle>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-dark bg-gold/15 px-2 py-0.5 rounded-md border border-gold/30 font-mono">
                1 / 3
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-secondary/30 border border-border/60">
              {/* 1. Folk (60m) */}
              <button
                type="button"
                onClick={() => setSelectedGameMode("folk")}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 px-1.5 text-center transition-all ${
                  selectedGameMode === "folk"
                    ? "bg-royal text-primary-foreground shadow-gold font-bold scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 font-medium"
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
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 px-1.5 text-center transition-all ${
                  selectedGameMode === "international"
                    ? "bg-royal text-primary-foreground shadow-gold font-bold scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 font-medium"
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
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 px-1.5 text-center transition-all ${
                  selectedGameMode === "blitz"
                    ? "bg-royal text-primary-foreground shadow-gold font-bold scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 font-medium"
                }`}
              >
                <Zap className="h-4 w-4 shrink-0" />
                <span className="text-[11px] leading-tight line-clamp-1">
                  {t("blitz_ruleset_tag")}
                </span>
                <span className="text-[9px] opacity-80 font-mono">05:00</span>
              </button>
            </div>

            {/* Ruleset Summary Info */}
            <div className="rounded-xl border border-border/50 bg-background/50 p-2.5 text-[11px] text-muted-foreground">
              {selectedGameMode === "folk" && (
                <p className="leading-relaxed">
                  <strong className="text-foreground">{t("mode_folk_60m")}</strong>:{" "}
                  {t("mode_folk_60m_desc")}
                </p>
              )}
              {selectedGameMode === "international" && (
                <p className="leading-relaxed">
                  <strong className="text-foreground">{t("mode_intl_60m")}</strong>:{" "}
                  {t("mode_intl_60m_desc")}
                </p>
              )}
              {selectedGameMode === "blitz" && (
                <p className="leading-relaxed">
                  <strong className="text-foreground">{t("mode_blitz_5m")}</strong>:{" "}
                  {t("mode_blitz_5m_desc")}
                </p>
              )}
            </div>
          </div>

          {/* Flow Connector Arrow */}
          <div className="flex justify-center -my-2.5">
            <div className="h-5 w-0.5 bg-gradient-to-b from-gold/40 to-gold/10" />
          </div>

          {/* BƯỚC 2: CHỌN CÁCH GHÉP TRẬN */}
          <div className="space-y-2.5 rounded-2xl border border-gold/30 bg-card/85 p-3.5 shadow-xs backdrop-blur">
            <div className="flex items-center justify-between">
              <SectionTitle icon={Swords}>{t("step_2_match_type")}</SectionTitle>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-dark bg-gold/15 px-2 py-0.5 rounded-md border border-gold/30 font-mono">
                2 / 3
              </span>
            </div>

            <div className="grid gap-2">
              {/* Match Type 1: Random */}
              <button
                type="button"
                onClick={() => setMatchType("random")}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  matchType === "random"
                    ? "border-gold bg-gold/10 shadow-xs ring-1 ring-gold/40"
                    : "border-border/70 bg-background/50 hover:border-gold/50"
                }`}
              >
                <div
                  className={`grid h-8 w-8 place-items-center rounded-lg border shrink-0 ${
                    matchType === "random"
                      ? "border-gold bg-royal text-gold-light"
                      : "border-border bg-secondary text-muted-foreground"
                  }`}
                >
                  <Swords className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-xs font-bold text-foreground">
                      {t("match_type_random")}
                    </span>
                    {matchType === "random" && <span className="h-2 w-2 rounded-full bg-gold" />}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                    {t("match_type_random_desc")}
                  </p>
                </div>
              </button>

              {/* Match Type 2: Create Private Room */}
              <button
                type="button"
                onClick={() => setMatchType("create")}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  matchType === "create"
                    ? "border-gold bg-gold/10 shadow-xs ring-1 ring-gold/40"
                    : "border-border/70 bg-background/50 hover:border-gold/50"
                }`}
              >
                <div
                  className={`grid h-8 w-8 place-items-center rounded-lg border shrink-0 ${
                    matchType === "create"
                      ? "border-gold bg-royal text-gold-light"
                      : "border-border bg-secondary text-muted-foreground"
                  }`}
                >
                  <PlusCircle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-xs font-bold text-foreground">
                      {t("match_type_create_room")}
                    </span>
                    {matchType === "create" && <span className="h-2 w-2 rounded-full bg-gold" />}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                    {t("match_type_create_room_desc")}
                  </p>
                </div>
              </button>

              {/* Match Type 3: Join Private Room */}
              <button
                type="button"
                onClick={() => setMatchType("join")}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  matchType === "join"
                    ? "border-gold bg-gold/10 shadow-xs ring-1 ring-gold/40"
                    : "border-border/70 bg-background/50 hover:border-gold/50"
                }`}
              >
                <div
                  className={`grid h-8 w-8 place-items-center rounded-lg border shrink-0 ${
                    matchType === "join"
                      ? "border-gold bg-royal text-gold-light"
                      : "border-border bg-secondary text-muted-foreground"
                  }`}
                >
                  <Lock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-xs font-bold text-foreground">
                      {t("match_type_join_room")}
                    </span>
                    {matchType === "join" && <span className="h-2 w-2 rounded-full bg-gold" />}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                    {t("match_type_join_room_desc")}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Flow Connector Arrow */}
          <div className="flex justify-center -my-2.5">
            <div className="h-5 w-0.5 bg-gradient-to-b from-gold/40 to-gold/10" />
          </div>

          {/* BƯỚC 3: XÁC NHẬN & BẮT ĐẦU */}
          <div className="space-y-3 rounded-2xl border border-gold/40 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <SectionTitle icon={Sparkles}>{t("step_3_confirm_start")}</SectionTitle>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-dark bg-gold/15 px-2 py-0.5 rounded-md border border-gold/30 font-mono">
                3 / 3
              </span>
            </div>

            {/* Summary Box */}
            <div className="rounded-xl border border-border/70 bg-background/60 p-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-border/50">
                <span className="font-semibold text-muted-foreground">{t("match_summary")}</span>
                <span className="font-serif font-bold text-gold-dark">
                  {selectedGameMode === "folk"
                    ? t("folk_ruleset")
                    : selectedGameMode === "international"
                      ? t("international_ruleset")
                      : t("blitz_ruleset_tag")}{" "}
                  ({selectedGameMode === "blitz" ? "05:00" : "60:00"})
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 text-[11px]">
                <span className="text-muted-foreground">Hình thức thi đấu</span>
                <span className="font-semibold text-foreground">
                  {matchType === "random"
                    ? t("match_type_random")
                    : matchType === "create"
                      ? t("match_type_create_room")
                      : t("match_type_join_room")}
                </span>
              </div>

              {/* Input PIN if Join Mode */}
              {matchType === "join" && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
                    {t("enter_pin_prompt")}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="------"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-center font-mono text-base tracking-[0.25em] font-bold text-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/40"
                  />
                </div>
              )}
            </div>

            {/* Final Action Button */}
            <div>
              <button
                type="button"
                onClick={handleStartMatch}
                disabled={
                  connectionStatus !== "connected" ||
                  (matchType === "join" && pinInput.trim().length !== 6)
                }
                className="shimmer-sheen bg-royal flex items-center justify-center gap-2 w-full rounded-2xl px-4 py-3.5 font-serif text-sm font-bold text-gold-light shadow-gold transition-transform duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {matchType === "random" ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>{t("btn_find_match")}</span>
                  </>
                ) : matchType === "create" ? (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    <span>{t("btn_create_room_pin")}</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>{t("btn_join_room_pin")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        <PlayerNameModal
          isOpen={nameModalOpen}
          onClose={() => setNameModalOpen(false)}
          onSuccess={(newName) => {
            setCurrentProfile(authManager.getCurrentProfile());
          }}
        />
      </div>
    </AppShell>
  );
}
