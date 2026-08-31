import React, { useState, useEffect } from "react";
import { User, Check, X, Sparkles, Loader2 } from "lucide-react";
import { authManager } from "../lib/auth-manager";
import { useI18n } from "../lib/i18n";

interface PlayerNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (name: string) => void;
  initialName?: string;
  forceRequired?: boolean;
}

export function PlayerNameModal({
  isOpen,
  onClose,
  onSuccess,
  initialName = "",
  forceRequired = false,
}: PlayerNameModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = initialName || authManager.getPlayerDisplayName();
      setName(current !== "Kỳ thủ" && current !== "Player" ? current : "");
      setError(null);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 30) {
      setError(t("auth_player_name_invalid"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (authManager.isAuthenticated()) {
        await authManager.updatePlayerDisplayName(trimmed);
      } else {
        localStorage.setItem("ouk_player_name", trimmed);
        localStorage.setItem("ouk_online_player_name", trimmed);
      }
      onSuccess?.(trimmed);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("auth_player_name_invalid");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
    >
      <div
        className="kbach-frame w-full max-w-md rounded-3xl border border-gold/60 bg-card p-6 shadow-2xl animate-pop text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gold/20 text-gold-dark border border-gold/40 shadow-xs">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-foreground">
                {t("auth_player_name_title")}
              </h2>
              <p className="text-xs text-muted-foreground">{t("auth_player_name_desc")}</p>
            </div>
          </div>
          {!forceRequired && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label={t("close")}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-400 animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="player-name-input"
              className="block text-xs font-semibold text-foreground/90"
            >
              {t("auth_player_name_input")}
            </label>
            <div className="relative">
              <input
                id="player-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: AngkorMaster, KỳThủ99..."
                maxLength={30}
                autoFocus
                className="w-full rounded-2xl border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-gold focus:bg-background focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all"
              />
              <span className="absolute right-3 top-2.5 text-[11px] font-mono text-muted-foreground">
                {name.trim().length}/30
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tên sẽ hiển thị trên bàn cờ, phòng thi đấu và bảng xếp hạng.
            </p>
          </div>

          <div className="flex gap-2.5 pt-2">
            {!forceRequired && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-border bg-secondary/60 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary active:scale-95 transition-all"
              >
                {t("cancel")}
              </button>
            )}
            <button
              type="submit"
              disabled={loading || name.trim().length < 2}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-gold bg-gradient-to-r from-gold to-amber-500 py-2.5 text-xs font-bold text-stone-900 shadow-md hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{t("auth_player_name_save")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
