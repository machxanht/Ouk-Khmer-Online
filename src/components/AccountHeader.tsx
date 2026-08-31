import { useState, useEffect, type ReactNode } from "react";
import { User, LogIn, LogOut, Edit2 } from "lucide-react";
import { authManager, UserProfile } from "../lib/auth-manager";
import { useI18n } from "../lib/i18n";
import { User as FirebaseUser } from "firebase/auth";

interface AccountHeaderProps {
  onOpenAuth: () => void;
  onEditName: () => void;
  className?: string;
}

export function AccountHeader({ onOpenAuth, onEditName, className = "" }: AccountHeaderProps) {
  const { t } = useI18n();
  const [user, setUser] = useState<FirebaseUser | null>(authManager.getCurrentUser());
  const [profile, setProfile] = useState<UserProfile | null>(authManager.getCurrentProfile());
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const unsub = authManager.onAuthChange((u, p) => {
      setUser(u);
      setProfile(p || null);
    });
    return unsub;
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authManager.logout();
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      setLoggingOut(false);
    }
  };

  const displayName = user
    ? profile?.displayName || user.displayName || user.email?.split("@")[0] || "Kỳ thủ"
    : t("auth_guest");

  return (
    <div
      aria-label="Player Auth Module"
      className={`flex flex-col items-end justify-center min-w-0 shrink-0 ${className}`}
    >
      {/* Top Row: Avatar & Display Name */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="relative shrink-0">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="h-6 w-6 sm:h-7 sm:w-7 rounded-full object-cover border border-gold/60 shadow-xs ring-1 ring-gold/40"
            />
          ) : (
            <div
              className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border font-serif font-bold text-xs shadow-xs ${
                user
                  ? "bg-gold/20 border-gold/60 text-gold-dark ring-1 ring-gold/40"
                  : "bg-secondary border-border text-muted-foreground"
              }`}
            >
              {user ? (
                displayName.slice(0, 1).toUpperCase()
              ) : (
                <User className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          )}
          {user && (
            <span
              title="Đang hoạt động"
              className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-card shadow-xs"
            />
          )}
        </div>

        <div className="flex items-center gap-1 min-w-0">
          <span className="font-serif text-xs sm:text-sm font-bold text-foreground truncate max-w-[85px] sm:max-w-[140px] leading-tight">
            {displayName}
          </span>
          {user && (
            <button
              type="button"
              onClick={onEditName}
              title={t("auth_edit_name")}
              className="inline-flex items-center rounded-md p-0.5 text-gold-dark hover:bg-gold/20 active:scale-95 transition-all shrink-0"
            >
              <Edit2 className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Login or Logout Button */}
      <div className="mt-1 flex items-center justify-end">
        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex h-5 sm:h-5.5 items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-1.5 sm:px-2 text-[10px] sm:text-[11px] font-semibold text-red-400 hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <LogOut className="h-2.5 w-2.5" />
            <span>{t("auth_logout")}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="flex h-5 sm:h-5.5 items-center gap-1 rounded-md border border-gold bg-gradient-to-r from-gold to-amber-500 px-2 sm:px-2.5 text-[10px] sm:text-[11px] font-bold text-stone-900 shadow-xs hover:brightness-105 active:scale-95 transition-all"
          >
            <LogIn className="h-2.5 w-2.5" />
            <span>{t("auth_login")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
