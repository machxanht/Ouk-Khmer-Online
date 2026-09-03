import {
  User as FirebaseUser,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  ActionCodeSettings,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, googleProvider, facebookProvider } from "./firebase";
import { onlineClient } from "./online-client";

export type AuthUser = FirebaseUser;

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerId: string;
  rating?: number;
  peakRating?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  winStreak?: number;
  gamesPlayed?: number;
  createdAt: number;
  updatedAt: number;
}

export type AuthStateCallback = (user: FirebaseUser | null, profile?: UserProfile | null) => void;

/**
 * Standard ActionCodeSettings pointing to the production web application.
 */
function getActionCodeSettings(): ActionCodeSettings {
  const url =
    typeof window !== "undefined" &&
    window.location.origin.startsWith("http") &&
    !window.location.origin.includes("localhost")
      ? window.location.origin
      : "https://ouk-khmer-online.vercel.app";

  return {
    url,
    handleCodeInApp: true,
  };
}

/**
 * Translates Firebase Auth error codes into human-readable messages.
 */
export function translateFirebaseAuthError(err: unknown): string {
  if (!err) return "Authentication error occurred.";
  const errorObj = err as { code?: string; message?: string };
  const code = errorObj?.code || "";
  const rawMsg = errorObj?.message || String(err);

  switch (code) {
    case "auth/unauthorized-domain":
      return "Tên miền này chưa được cấp phép trong Firebase Auth. Vui lòng thêm domain (bao gồm ouk-khmer-online.vercel.app, localhost) vào Firebase Console > Authentication > Settings > Authorized domains.";
    case "auth/popup-blocked":
      return "Cửa sổ đăng nhập đã bị trình duyệt chặn (Popup Blocked). Vui lòng nhấn Cho phép mở popup và thử lại.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Thao tác đăng nhập đã bị hủy.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email hoặc mật khẩu không chính xác.";
    case "auth/email-already-in-use":
      return "Địa chỉ email này đã được đăng ký tài khoản.";
    case "auth/weak-password":
      return "Mật khẩu phải có độ dài tối thiểu 6 ký tự.";
    case "auth/invalid-email":
      return "Địa chỉ email không đúng định dạng.";
    case "auth/network-request-failed":
      return "Lỗi kết nối mạng tới Firebase. Vui lòng kiểm tra lại kết nối internet.";
    case "auth/operation-not-allowed":
      return "Phương thức đăng nhập này chưa được kích hoạt trong Firebase Console (Authentication > Sign-in method).";
    case "auth/invalid-action":
    case "auth/invalid-action-code":
    case "auth/invalid-req-type":
      return "Yêu cầu xác thực không hợp lệ. Vui lòng kiểm tra lại kết nối hoặc thử lại sau.";
    case "auth/configuration-not-found":
      return "Cấu hình OAuth nhà cung cấp chưa được thiết lập trong Firebase Console.";
    case "auth/account-exists-with-different-credential":
      return "Tài khoản đã tồn tại với một phương thức đăng nhập khác (Google / Email).";
    case "auth/user-disabled":
      return "Tài khoản này đã bị tạm khóa.";
    case "auth/requires-recent-login":
      return "Vui lòng đăng nhập lại để thực hiện thao tác bảo mật này.";
    case "auth/too-many-requests":
      return "Quá nhiều yêu cầu đăng nhập. Vui lòng đợi trong giây lát và thử lại.";
    default:
      if (rawMsg.includes("unauthorized-domain") || rawMsg.includes("authorized domain")) {
        return "Domain chưa được cấp phép trong Firebase Auth. Vui lòng thêm domain vào Firebase Console > Authentication > Settings > Authorized domains.";
      }
      if (rawMsg.includes("The requested action is invalid") || rawMsg.includes("invalid-action")) {
        return "Yêu cầu xác thực không hợp lệ hoặc liên kết đã hết hạn.";
      }
      return (
        rawMsg
          .replace(/^Firebase:\s*/i, "")
          .replace(/\(auth\/[a-z0-9-]+\)\.?/i, "")
          .trim() || "Xác thực không thành công."
      );
  }
}

class AuthManager {
  private currentUser: FirebaseUser | null = null;
  private currentProfile: UserProfile | null = null;
  private listeners: Set<AuthStateCallback> = new Set();
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private async init() {
    // Attempt to set persistent session with safe fallbacks for mobile browsers/iframes/webviews
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      try {
        await setPersistence(auth, browserSessionPersistence);
      } catch {
        try {
          await setPersistence(auth, inMemoryPersistence);
        } catch {
          // ignore
        }
      }
    }

    // Check if returning from a redirect auth flow (mobile WebView fallback)
    try {
      const redirectResult = await getRedirectResult(auth);
      if (redirectResult && redirectResult.user) {
        this.currentUser = redirectResult.user;
        this.currentProfile = await this.syncUserProfile(redirectResult.user);
        this.notifyListeners();
      }
    } catch (redirectErr) {
      console.warn("Firebase redirect auth check notice:", redirectErr);
    }

    try {
      onFirebaseAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        if (user) {
          try {
            this.currentProfile = await this.syncUserProfile(user);
            if (this.currentProfile?.displayName) {
              try {
                localStorage.setItem("ouk_player_name", this.currentProfile.displayName);
                localStorage.setItem("ouk_online_player_name", this.currentProfile.displayName);
              } catch {
                /* ignore */
              }
            }
          } catch (err) {
            console.warn("Failed to sync Firestore profile:", err);
            this.currentProfile = this.createFallbackProfile(user);
          }
        } else {
          this.currentProfile = null;
        }
        this.initialized = true;
        this.notifyListeners();
      });
    } catch (e) {
      console.warn("Firebase Auth listener initialization notice:", e);
      this.initialized = true;
    }
  }

  private createFallbackProfile(user: FirebaseUser): UserProfile {
    const savedName =
      typeof window !== "undefined" ? localStorage.getItem("ouk_player_name") : null;
    let savedRating = 1200;
    try {
      const r = localStorage.getItem("ouk_player_rating");
      if (r) savedRating = parseInt(r, 10) || 1200;
    } catch {
      /* ignore */
    }
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || savedName || user.email?.split("@")[0] || "Kỳ thủ",
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      providerId: user.providerData?.[0]?.providerId || "password",
      rating: savedRating,
      peakRating: savedRating,
      wins: 0,
      losses: 0,
      draws: 0,
      winStreak: 0,
      gamesPlayed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  public async syncUserProfile(user: FirebaseUser): Promise<UserProfile> {
    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      const now = Date.now();
      const savedName =
        typeof window !== "undefined" ? localStorage.getItem("ouk_player_name") : null;
      let savedRating = 1200;
      try {
        const r = localStorage.getItem("ouk_player_rating");
        if (r) savedRating = parseInt(r, 10) || 1200;
      } catch {
        /* ignore */
      }

      if (!snap.exists()) {
        const initialDisplayName =
          user.displayName || savedName || user.email?.split("@")[0] || "Kỳ thủ";
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: initialDisplayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          providerId: user.providerData?.[0]?.providerId || "password",
          rating: savedRating,
          peakRating: savedRating,
          wins: 0,
          losses: 0,
          draws: 0,
          winStreak: 0,
          gamesPlayed: 0,
          createdAt: now,
          updatedAt: now,
        };

        await setDoc(userRef, {
          ...newProfile,
          serverCreatedAt: serverTimestamp(),
          serverUpdatedAt: serverTimestamp(),
        });
        return newProfile;
      } else {
        const data = snap.data() as UserProfile;
        const currentDisplayName =
          data.displayName ||
          user.displayName ||
          savedName ||
          user.email?.split("@")[0] ||
          "Kỳ thủ";
        const updates: Partial<UserProfile> = {
          email: user.email,
          displayName: currentDisplayName,
          photoURL: user.photoURL || data.photoURL,
          emailVerified: user.emailVerified,
          rating: data.rating ?? savedRating,
          peakRating: data.peakRating ?? data.rating ?? savedRating,
          wins: data.wins ?? 0,
          losses: data.losses ?? 0,
          draws: data.draws ?? 0,
          winStreak: data.winStreak ?? 0,
          gamesPlayed: data.gamesPlayed ?? 0,
          updatedAt: now,
        };
        await updateDoc(userRef, {
          ...updates,
          serverUpdatedAt: serverTimestamp(),
        });
        return { ...data, ...updates };
      }
    } catch (err) {
      console.warn("Firestore sync skipped or offline:", err);
      return this.createFallbackProfile(user);
    }
  }

  public getPlayerRating(): number {
    if (this.currentProfile?.rating) {
      return this.currentProfile.rating;
    }
    try {
      const local = localStorage.getItem("ouk_player_rating");
      if (local) return parseInt(local, 10) || 1200;
    } catch {
      // ignore
    }
    return 1200;
  }

  public async updatePlayerDisplayName(rawName: string): Promise<UserProfile> {
    const trimmed = rawName.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 30) {
      throw new Error("Tên kỳ thủ phải từ 2 đến 30 ký tự và không được để trống.");
    }

    if (!this.currentUser) {
      // Offline fallback
      try {
        localStorage.setItem("ouk_player_name", trimmed);
        localStorage.setItem("ouk_online_player_name", trimmed);
      } catch {
        /* ignore */
      }
      throw new Error("Vui lòng đăng nhập để lưu tên kỳ thủ vào hồ sơ tài khoản.");
    }

    // Update Firebase Auth user
    try {
      await updateProfile(this.currentUser, { displayName: trimmed });
    } catch (err) {
      console.warn("Auth updateProfile notice:", err);
    }

    // Update Firestore user document
    const now = Date.now();
    try {
      const userRef = doc(db, "users", this.currentUser.uid);
      await updateDoc(userRef, {
        displayName: trimmed,
        updatedAt: now,
        serverUpdatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Firestore displayName update notice:", err);
    }

    // Update local storage
    try {
      localStorage.setItem("ouk_player_name", trimmed);
      localStorage.setItem("ouk_online_player_name", trimmed);
    } catch {
      /* ignore */
    }

    if (this.currentProfile) {
      this.currentProfile = {
        ...this.currentProfile,
        displayName: trimmed,
        updatedAt: now,
      };
    } else {
      this.currentProfile = this.createFallbackProfile(this.currentUser);
      this.currentProfile.displayName = trimmed;
    }

    this.notifyListeners();
    return this.currentProfile;
  }

  public async fetchLeaderboard(limitCount = 50): Promise<UserProfile[]> {
    try {
      const usersCol = collection(db, "users");
      let querySnapshot;
      try {
        const q = query(usersCol, orderBy("rating", "desc"), limit(limitCount));
        querySnapshot = await getDocs(q);
      } catch (queryErr) {
        console.warn("Ordered query fallback, loading collection directly:", queryErr);
        querySnapshot = await getDocs(query(usersCol, limit(limitCount)));
      }
      const profiles: UserProfile[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && (data.displayName || data.email)) {
          profiles.push({
            uid: docSnap.id,
            email: data.email || null,
            displayName: data.displayName || "Kỳ thủ",
            photoURL: data.photoURL || null,
            emailVerified: Boolean(data.emailVerified),
            providerId: data.providerId || "password",
            rating: typeof data.rating === "number" ? data.rating : 1200,
            peakRating: typeof data.peakRating === "number" ? data.peakRating : data.rating || 1200,
            wins: typeof data.wins === "number" ? data.wins : 0,
            losses: typeof data.losses === "number" ? data.losses : 0,
            draws: typeof data.draws === "number" ? data.draws : 0,
            winStreak: typeof data.winStreak === "number" ? data.winStreak : 0,
            gamesPlayed: typeof data.gamesPlayed === "number" ? data.gamesPlayed : 0,
            createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
            updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
          });
        }
      });
      // Guarantee descending rating sort
      profiles.sort((a, b) => (b.rating || 1200) - (a.rating || 1200));
      return profiles;
    } catch (err) {
      console.warn("Error fetching real leaderboard from Firestore:", err);
      return [];
    }
  }

  public getPlayerDisplayName(guestFallback = "Khách vãng lai"): string {
    if (this.currentProfile?.displayName) return this.currentProfile.displayName;
    if (this.currentUser?.displayName) return this.currentUser.displayName;
    if (this.currentUser && typeof window !== "undefined") {
      const saved =
        localStorage.getItem("ouk_player_name") || localStorage.getItem("ouk_online_player_name");
      if (saved) return saved;
    }
    return guestFallback;
  }

  public isProfileNameConfigured(): boolean {
    const name = this.currentProfile?.displayName || this.currentUser?.displayName;
    return Boolean(name && name.trim().length >= 2);
  }

  public onAuthStateChanged(
    cb: (user: FirebaseUser | null, profile?: UserProfile | null) => void,
  ): () => void {
    const wrappedCb: AuthStateCallback = (user, profile) => cb(user, profile);
    this.listeners.add(wrappedCb);
    if (this.initialized) {
      cb(this.currentUser, this.currentProfile);
    }
    return () => this.listeners.delete(wrappedCb);
  }

  public onAuthChange(cb: AuthStateCallback): () => void {
    this.listeners.add(cb);
    if (this.initialized) {
      cb(this.currentUser, this.currentProfile);
    }
    return () => this.listeners.delete(cb);
  }

  private notifyListeners() {
    for (const cb of this.listeners) {
      try {
        cb(this.currentUser, this.currentProfile);
      } catch (err) {
        console.error("Auth listener error:", err);
      }
    }
  }

  public getCurrentUser(): FirebaseUser | null {
    return this.currentUser;
  }

  public getCurrentProfile(): UserProfile | null {
    return this.currentProfile;
  }

  public getUserProfile(): UserProfile | null {
    return this.currentProfile;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public async getIdToken(forceRefresh = false): Promise<string | null> {
    if (!this.currentUser) return null;
    try {
      return await this.currentUser.getIdToken(forceRefresh);
    } catch {
      return null;
    }
  }

  // --- Auth Actions ---

  public async registerWithEmail(
    email: string,
    pass: string,
    name?: string,
  ): Promise<FirebaseUser> {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const cleanName = name?.trim() || "";
      if (cleanName) {
        await updateProfile(cred.user, { displayName: cleanName });
      }
      try {
        const actionCodeSettings = getActionCodeSettings();
        await sendEmailVerification(cred.user, actionCodeSettings);
      } catch (e) {
        // Fallback without actionCodeSettings
        try {
          await sendEmailVerification(cred.user);
        } catch {
          console.warn("Email verification send notice:", e);
        }
      }
      this.currentProfile = await this.syncUserProfile(cred.user);
      if (cleanName) {
        await this.updatePlayerDisplayName(cleanName);
      }
      return cred.user;
    } catch (err) {
      throw new Error(translateFirebaseAuthError(err));
    }
  }

  public async loginWithEmail(email: string, pass: string): Promise<FirebaseUser> {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      this.currentProfile = await this.syncUserProfile(cred.user);
      return cred.user;
    } catch (err) {
      throw new Error(translateFirebaseAuthError(err));
    }
  }

  public async signInWithGoogle(): Promise<FirebaseUser> {
    return this.loginWithGoogle();
  }

  public async loginWithGoogle(): Promise<FirebaseUser | null> {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      this.currentProfile = await this.syncUserProfile(cred.user);
      return cred.user;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      const isMobileOrCapacitor =
        typeof window !== "undefined" &&
        (window.location.protocol === "capacitor:" ||
          window.location.hostname === "localhost" ||
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

      if (
        isMobileOrCapacitor &&
        (code === "auth/popup-blocked" ||
          code === "auth/unauthorized-domain" ||
          code === "auth/invalid-action" ||
          code === "auth/popup-closed-by-user")
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return null;
        } catch (redirectErr: unknown) {
          throw new Error(translateFirebaseAuthError(redirectErr));
        }
      }
      throw new Error(translateFirebaseAuthError(err));
    }
  }

  public async signInWithFacebook(): Promise<FirebaseUser | null> {
    return this.loginWithFacebook();
  }

  public async loginWithFacebook(): Promise<FirebaseUser | null> {
    try {
      const cred = await signInWithPopup(auth, facebookProvider);
      this.currentProfile = await this.syncUserProfile(cred.user);
      return cred.user;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      const isMobileOrCapacitor =
        typeof window !== "undefined" &&
        (window.location.protocol === "capacitor:" ||
          window.location.hostname === "localhost" ||
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

      if (
        isMobileOrCapacitor &&
        (code === "auth/popup-blocked" ||
          code === "auth/unauthorized-domain" ||
          code === "auth/invalid-action" ||
          code === "auth/popup-closed-by-user")
      ) {
        try {
          await signInWithRedirect(auth, facebookProvider);
          return null;
        } catch (redirectErr: unknown) {
          throw new Error(translateFirebaseAuthError(redirectErr));
        }
      }
      throw new Error(translateFirebaseAuthError(err));
    }
  }

  public async sendPasswordReset(email: string): Promise<void> {
    try {
      const actionCodeSettings = getActionCodeSettings();
      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
    } catch (err) {
      try {
        await sendPasswordResetEmail(auth, email.trim());
      } catch (fallbackErr) {
        throw new Error(translateFirebaseAuthError(fallbackErr));
      }
    }
  }

  public async sendVerificationEmail(): Promise<void> {
    return this.resendVerification();
  }

  public async resendVerification(): Promise<void> {
    if (this.currentUser) {
      try {
        const actionCodeSettings = getActionCodeSettings();
        await sendEmailVerification(this.currentUser, actionCodeSettings);
      } catch (err) {
        try {
          await sendEmailVerification(this.currentUser);
        } catch (fallbackErr) {
          throw new Error(translateFirebaseAuthError(fallbackErr));
        }
      }
    }
  }

  public async logout(): Promise<void> {
    try {
      // Disconnect socket from online multiplayer
      onlineClient.disconnect();
    } catch {
      /* ignore */
    }

    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("ouk_online_active_session");
        localStorage.removeItem("ouk_player_name");
        localStorage.removeItem("ouk_online_player_name");
      }
    } catch {
      /* ignore */
    }

    await firebaseSignOut(auth);
    this.currentUser = null;
    this.currentProfile = null;
    this.notifyListeners();
  }
}

export const authManager = new AuthManager();
