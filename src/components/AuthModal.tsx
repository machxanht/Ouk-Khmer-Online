import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Lock,
  LogOut,
  LogIn,
  UserPlus,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import { authManager, type AuthUser } from "../lib/auth-manager";

export function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register" | "forgot";
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMsg(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await authManager.loginWithEmail(email, password);
        onClose();
      } else if (mode === "register") {
        await authManager.registerWithEmail(email, password, displayName);
        onClose();
      } else if (mode === "forgot") {
        await authManager.sendPasswordReset(email);
        setSuccessMsg(t("auth_reset_sent"));
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await authManager.signInWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Google Sign-In failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await authManager.signInWithFacebook();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Facebook Sign-In failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-gold/40 bg-card p-6 shadow-2xl shadow-gold/10">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground text-lg"
        >
          ✕
        </button>

        <div className="mb-6 text-center">
          <h2 className="font-serif text-2xl font-bold text-foreground">
            {mode === "login"
              ? t("auth_login")
              : mode === "register"
                ? t("auth_register")
                : t("auth_reset_password")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "login"
              ? "Sign in to sync your ratings and stats across devices"
              : mode === "register"
                ? "Create an account to participate in ranked multiplayer"
                : "Enter your email to receive a password reset link"}
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-jade/40 bg-jade/10 p-3 text-xs text-jade">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                {t("auth_display_name")}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Khmer Chess Master"
                  className="w-full rounded-xl border border-border bg-secondary/50 py-2 pl-9 pr-3 text-sm text-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              {t("auth_email")}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="master@khmerchess.org"
                className="w-full rounded-xl border border-border bg-secondary/50 py-2 pl-9 pr-3 text-sm text-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">{t("auth_password")}</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-[11px] text-gold-dark hover:underline"
                  >
                    {t("auth_forgot_password")}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-secondary/50 py-2 pl-9 pr-3 text-sm text-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-sm font-bold text-background transition hover:bg-gold-dark disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "login" ? (
              <>
                <LogIn className="h-4 w-4" />
                {t("auth_login")}
              </>
            ) : mode === "register" ? (
              <>
                <UserPlus className="h-4 w-4" />
                {t("auth_register")}
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                {t("auth_reset_password")}
              </>
            )}
          </button>
        </form>

        {mode !== "forgot" && (
          <>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("auth_or")}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-secondary/40 py-2 text-xs font-medium text-foreground transition hover:border-gold/60 hover:bg-secondary"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                {t("auth_continue_google")}
              </button>

              <button
                type="button"
                onClick={handleFacebookSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-secondary/40 py-2 text-xs font-medium text-foreground transition hover:border-gold/60 hover:bg-secondary"
              >
                <svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                {t("auth_continue_facebook")}
              </button>
            </div>
          </>
        )}

        <div className="mt-6 text-center text-xs text-muted-foreground">
          {mode === "login" ? (
            <p>
              {t("auth_no_account")}{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="font-semibold text-gold-dark hover:underline"
              >
                {t("auth_register")}
              </button>
            </p>
          ) : (
            <p>
              {t("auth_have_account")}{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-semibold text-gold-dark hover:underline"
              >
                {t("auth_login")}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function UserProfileCard({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { t } = useI18n();
  const [user, setUser] = useState<AuthUser | null>(authManager.getCurrentUser());
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = authManager.onAuthStateChanged((u) => {
      setUser(u);
    });
    return unsub;
  }, []);

  const handleSendVerification = async () => {
    setVerifying(true);
    setVerifyMsg(null);
    try {
      await authManager.sendVerificationEmail();
      setVerifyMsg(t("auth_verify_email_sent"));
    } catch (err: any) {
      setVerifyMsg(err?.message || "Failed to send verification");
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = async () => {
    await authManager.logout();
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-gold/40 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-gold/30 bg-secondary">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <span className="block font-serif text-sm font-bold text-foreground">
                {t("auth_guest")}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Sign in to save rating & stats
              </span>
            </div>
          </div>
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 rounded-xl bg-gold px-3 py-2 text-xs font-bold text-background transition hover:bg-gold-dark"
          >
            <LogIn className="h-3.5 w-3.5" />
            {t("auth_login")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gold/40 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || "Avatar"}
              className="h-10 w-10 rounded-xl border border-gold/50 object-cover"
            />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-gold/50 bg-gold/20 font-serif font-bold text-gold-dark">
              {(user.displayName || user.email || "P")[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-serif text-sm font-bold text-foreground">
                {user.displayName || "Player"}
              </span>
              {user.emailVerified && (
                <ShieldCheck className="h-3.5 w-3.5 text-jade shrink-0" title="Verified Account" />
              )}
            </div>
            <span className="block truncate text-[11px] text-muted-foreground">
              {user.email || "No email"}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1 rounded-xl border border-border bg-secondary/50 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
        >
          <LogOut className="h-3 w-3" />
          {t("auth_logout")}
        </button>
      </div>

      {!user.emailVerified && user.email && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
          <span>{t("auth_email_not_verified")}</span>
          <button
            onClick={handleSendVerification}
            disabled={verifying}
            className="flex items-center gap-1 font-semibold underline hover:text-amber-400"
          >
            {verifying && <Loader2 className="h-3 w-3 animate-spin" />}
            {t("auth_resend_verification")}
          </button>
        </div>
      )}

      {verifyMsg && <div className="mt-2 text-[11px] text-jade">{verifyMsg}</div>}
    </div>
  );
}
