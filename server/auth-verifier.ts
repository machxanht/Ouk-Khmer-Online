import crypto from "crypto";
import { serverLogger } from "./logger";

export interface AuthenticatedUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified?: boolean;
}

interface FirebaseTokenPayload {
  aud?: string;
  iss?: string;
  sub?: string;
  user_id?: string;
  uid?: string;
  email?: string;
  name?: string;
  displayName?: string;
  picture?: string;
  photoURL?: string;
  email_verified?: boolean;
  exp?: number;
  iat?: number;
  auth_time?: number;
}

interface JwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

const FIREBASE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const CERT_CACHE_FALLBACK_MS = 60 * 60 * 1000;

/**
 * Production Firebase ID-token verifier without trusting client-decoded claims.
 * It verifies RS256 signatures against Google's Secure Token public certificates,
 * then validates Firebase issuer/audience/time claims.
 */
export class AuthVerifier {
  private certs: Record<string, string> = {};
  private certsExpireAt = 0;

  private getProjectId(): string | null {
    return (
      process.env.FIREBASE_PROJECT_ID ||
      process.env.VITE_FIREBASE_PROJECT_ID ||
      "project-by-khang"
    ).trim() || null;
  }

  private async getCertificates(): Promise<Record<string, string>> {
    if (Date.now() < this.certsExpireAt && Object.keys(this.certs).length > 0) {
      return this.certs;
    }

    const response = await fetch(FIREBASE_CERTS_URL, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Firebase certificate fetch failed (${response.status})`);
    }

    const certs = (await response.json()) as Record<string, string>;
    if (!certs || Object.keys(certs).length === 0) {
      throw new Error("Firebase certificate response was empty");
    }

    const cacheControl = response.headers.get("cache-control") || "";
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
    const maxAgeMs = maxAgeMatch
      ? Math.max(60_000, Number(maxAgeMatch[1]) * 1000)
      : CERT_CACHE_FALLBACK_MS;

    this.certs = certs;
    this.certsExpireAt = Date.now() + maxAgeMs;
    return certs;
  }

  private decodeJsonSegment<T>(segment: string): T {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
  }

  private validateClaims(payload: FirebaseTokenPayload, projectId: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    const expectedIssuer = `https://securetoken.google.com/${projectId}`;
    const uid = payload.sub || payload.user_id || payload.uid;

    if (!uid || typeof uid !== "string" || uid.length > 128) return false;
    if (payload.aud !== projectId) return false;
    if (payload.iss !== expectedIssuer) return false;
    if (!payload.exp || payload.exp <= now) return false;
    if (!payload.iat || payload.iat > now + 60) return false;
    if (payload.auth_time && payload.auth_time > now + 60) return false;
    return true;
  }

  public async verifyToken(token?: string | null): Promise<AuthenticatedUser | null> {
    if (!token || typeof token !== "string") return null;

    const trimmed = token.trim();
    if (!trimmed) return null;

    // Development tokens are never accepted in production. Tests can opt in explicitly.
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_DEV_AUTH_TOKENS === "true" &&
      (trimmed.startsWith("test_") || trimmed.startsWith("test-") || trimmed.startsWith("dev_"))
    ) {
      const uid = trimmed.replace(/^(test[_\-]|dev_)(token[_\-])?/, "");
      return uid
        ? {
            uid,
            email: `${uid}@example.com`,
            displayName: "Authenticated Player",
            emailVerified: true,
          }
        : null;
    }

    const projectId = this.getProjectId();
    if (!projectId) {
      serverLogger.error("ERROR", {
        details: { message: "FIREBASE_PROJECT_ID is not configured" },
      });
      return null;
    }

    const parts = trimmed.split(".");
    if (parts.length !== 3) return null;

    try {
      const [encodedHeader, encodedPayload, encodedSignature] = parts;
      const header = this.decodeJsonSegment<JwtHeader>(encodedHeader);
      const payload = this.decodeJsonSegment<FirebaseTokenPayload>(encodedPayload);

      if (header.alg !== "RS256" || !header.kid) return null;

      const certs = await this.getCertificates();
      const certificate = certs[header.kid];
      if (!certificate) {
        // Key rotation can occur before the prior cache expires. Refresh once.
        this.certsExpireAt = 0;
        const refreshed = await this.getCertificates();
        if (!refreshed[header.kid]) return null;
      }

      const publicCert = this.certs[header.kid];
      const signature = Buffer.from(encodedSignature, "base64url");
      const signedData = Buffer.from(`${encodedHeader}.${encodedPayload}`, "utf8");
      const signatureValid = crypto.verify("RSA-SHA256", signedData, publicCert, signature);

      if (!signatureValid || !this.validateClaims(payload, projectId)) return null;

      const uid = (payload.sub || payload.user_id || payload.uid)!;
      return {
        uid,
        email: payload.email || null,
        displayName: payload.name || payload.displayName || null,
        photoURL: payload.picture || payload.photoURL || null,
        emailVerified: Boolean(payload.email_verified),
      };
    } catch (err) {
      serverLogger.warn("ERROR", {
        details: { message: "Firebase token verification failed", error: String(err) },
      });
      return null;
    }
  }
}

export const authVerifier = new AuthVerifier();
