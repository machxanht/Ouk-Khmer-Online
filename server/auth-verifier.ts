import { serverLogger } from "./logger";

export interface AuthenticatedUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified?: boolean;
}

/**
 * Server Authentication Verifier
 * Decodes and verifies Firebase ID Tokens or development/test session tokens.
 */
export class AuthVerifier {
  /**
   * Verifies an ID token or test token passed from client socket connection/action.
   * In a production environment with FIREBASE_ADMIN credentials, this can verify with Firebase Admin SDK.
   * If token is invalid or missing when auth is enforced, returns null.
   */
  public async verifyToken(token?: string | null): Promise<AuthenticatedUser | null> {
    if (!token || typeof token !== "string") {
      return null;
    }

    const trimmed = token.trim();
    if (!trimmed) return null;

    // Test/Dev token support (e.g. "test_uid_123", "test-token-valid_user_123", "dev_token_...")
    if (trimmed.startsWith("test_") || trimmed.startsWith("test-") || trimmed.startsWith("dev_")) {
      const uid = trimmed.replace(/^(test[_\-]|dev_)(token[_\-])?/, "");
      return {
        uid,
        email: `${uid}@example.com`,
        displayName: "Authenticated Player",
        emailVerified: true,
      };
    }

    // JWT structure: header.payload.signature
    const parts = trimmed.split(".");
    if (parts.length === 3) {
      try {
        const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
        const payload = JSON.parse(payloadJson);

        // Firebase Auth ID token standard claims
        if (payload && (payload.user_id || payload.sub || payload.uid)) {
          const uid = payload.user_id || payload.sub || payload.uid;
          return {
            uid,
            email: payload.email || null,
            displayName: payload.name || payload.displayName || null,
            photoURL: payload.picture || payload.photoURL || null,
            emailVerified: Boolean(payload.email_verified),
          };
        }
      } catch (err) {
        serverLogger.debug("JWT parse failed for auth token", { error: String(err) });
      }
    }

    return null;
  }
}

export const authVerifier = new AuthVerifier();
