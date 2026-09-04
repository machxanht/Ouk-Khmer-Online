import crypto from "node:crypto";
import fs from "node:fs";

const DEFAULT_FIRESTORE_DATABASE_ID =
  "ai-studio-oukkhmeronline-bf9c8f38-eb74-4b5e-bcbd-efb1abfaeebc";
const RULES_API = "https://firebaserules.googleapis.com";
const OAUTH_SCOPE = "https://www.googleapis.com/auth/firebase";

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required");

  let account;
  try {
    account = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }

  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error("Firebase service account is missing project_id, client_email, or private_key");
  }
  return account;
}

async function getAccessToken(account) {
  const tokenUri = account.token_uri || "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: OAUTH_SCOPE,
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), account.private_key);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(`Google OAuth token request failed (${response.status})`);
  }
  return payload.access_token;
}

async function rulesRequest(token, path, options = {}) {
  const response = await fetch(`${RULES_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function main() {
  if (process.env.CONFIRM_FIRESTORE_RULES_DEPLOY !== "1") {
    throw new Error("Refusing to deploy without CONFIRM_FIRESTORE_RULES_DEPLOY=1");
  }

  const account = loadServiceAccount();
  const projectId = account.project_id;
  const databaseId =
    process.env.FIRESTORE_DATABASE_ID?.trim() || DEFAULT_FIRESTORE_DATABASE_ID;
  const source = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const sourceBytes = Buffer.byteLength(source, "utf8");
  if (sourceBytes === 0 || sourceBytes > 256 * 1024) {
    throw new Error(`firestore.rules has invalid size (${sourceBytes} bytes)`);
  }

  const token = await getAccessToken(account);
  const fingerprint = crypto.createHash("sha256").update(source).digest("base64");

  const createRuleset = await rulesRequest(token, `/v1/projects/${projectId}/rulesets`, {
    method: "POST",
    body: JSON.stringify({
      source: {
        files: [{ name: "firestore.rules", content: source, fingerprint }],
      },
    }),
  });

  if (!createRuleset.response.ok || !createRuleset.payload.name) {
    const reason = createRuleset.payload?.error?.message || "ruleset creation failed";
    throw new Error(`Firebase Rules API rejected firestore.rules (${createRuleset.response.status}): ${reason}`);
  }

  const rulesetName = createRuleset.payload.name;
  const releaseName = `projects/${projectId}/releases/cloud.firestore/${databaseId}`;
  const currentRelease = await rulesRequest(token, `/v1/${releaseName}`, { method: "GET" });

  let releaseResult;
  if (currentRelease.response.status === 404) {
    releaseResult = await rulesRequest(token, `/v1/projects/${projectId}/releases`, {
      method: "POST",
      body: JSON.stringify({ name: releaseName, rulesetName }),
    });
  } else if (currentRelease.response.ok) {
    releaseResult = await rulesRequest(
      token,
      `/v1/${releaseName}?updateMask=rulesetName`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: releaseName, rulesetName }),
      },
    );
  } else {
    const reason = currentRelease.payload?.error?.message || "release lookup failed";
    throw new Error(`Unable to inspect current Firestore rules release (${currentRelease.response.status}): ${reason}`);
  }

  if (!releaseResult.response.ok) {
    const reason = releaseResult.payload?.error?.message || "release update failed";
    throw new Error(`Unable to publish Firestore rules (${releaseResult.response.status}): ${reason}`);
  }

  const verified = await rulesRequest(token, `/v1/${releaseName}`, { method: "GET" });
  if (!verified.response.ok || verified.payload.rulesetName !== rulesetName) {
    throw new Error("Firestore rules release verification did not match the new ruleset");
  }

  console.log(`Firestore rules deployed for ${projectId}/${databaseId}`);
  console.log(`Ruleset: ${rulesetName}`);
  console.log(`Release: ${releaseName}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
