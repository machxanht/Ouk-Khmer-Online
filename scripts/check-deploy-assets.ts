import fs from "fs";
import path from "path";

const root = process.cwd();
const failures: string[] = [];

function resolve(rel: string) {
  return path.resolve(root, rel);
}

function requireFile(rel: string) {
  const full = resolve(rel);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
    failures.push(`Missing file: ${rel}`);
    return null;
  }
  return fs.readFileSync(full);
}

function requireText(rel: string) {
  const buf = requireFile(rel);
  return buf ? buf.toString("utf8") : "";
}

function requireEqualBytes(source: string, alias: string) {
  const sourceBuf = requireFile(source);
  const aliasBuf = requireFile(alias);
  if (sourceBuf && aliasBuf && !sourceBuf.equals(aliasBuf)) {
    failures.push(`Media alias drifted from source: ${alias} != ${source}`);
  }
}

function requireContains(rel: string, expected: string) {
  const text = requireText(rel);
  if (text && !text.includes(expected)) {
    failures.push(`${rel} must contain ${JSON.stringify(expected)}`);
  }
}

function validateVercelConfig() {
  const raw = requireText("vercel.json");
  if (!raw) return;

  let config: any;
  try {
    config = JSON.parse(raw);
  } catch (error) {
    failures.push(`vercel.json is invalid JSON: ${String(error)}`);
    return;
  }

  if (config.outputDirectory !== ".output/public") {
    failures.push(`Vercel outputDirectory must stay .output/public, got ${config.outputDirectory}`);
  }

  const rewrites = Array.isArray(config.rewrites) ? config.rewrites : [];
  for (const rewrite of rewrites) {
    const source = String(rewrite?.source || "");
    if (
      source === "/(.*)" ||
      source.includes(":path*") ||
      source.startsWith("/assets") ||
      source.startsWith("/media") ||
      source.startsWith("/pieces")
    ) {
      failures.push(`Unsafe SPA rewrite can swallow static media: ${source}`);
    }
  }

  const headers = Array.isArray(config.headers) ? config.headers : [];
  const mediaRule = headers.find((rule: any) => rule?.source === "/media/(.*)");
  const cacheHeader = mediaRule?.headers?.find((header: any) => header?.key === "Cache-Control");
  if (!cacheHeader || !String(cacheHeader.value).includes("must-revalidate")) {
    failures.push("/media/(.*) must use revalidating cache headers so stable URLs cannot get stuck stale");
  }
}

console.log("==========================================");
console.log("   PRODUCTION MEDIA / ROUTING VERIFIER   ");
console.log("==========================================");

requireEqualBytes("src/assets/mascot.png", "public/media/mascot.png");
requireEqualBytes("src/assets/khmer-audio-new.mp3", "public/media/khmer-audio-new.mp3");

requireContains("src/components/AppShell.tsx", 'const MASCOT_URL = "/media/mascot.png"');
requireContains("src/routes/home.tsx", 'const MASCOT_URL = "/media/mascot.png"');
requireContains("src/lib/audio/tracks.ts", 'const khmerAudioUrl = "/media/khmer-audio-new.mp3"');
validateVercelConfig();

const distRoot = resolve(".output/public");
if (!fs.existsSync(distRoot)) {
  failures.push(".output/public is missing; run this verifier after vite build");
} else {
  requireEqualBytes("src/assets/mascot.png", ".output/public/media/mascot.png");
  requireEqualBytes("src/assets/khmer-audio-new.mp3", ".output/public/media/khmer-audio-new.mp3");
  requireFile(".output/public/index.html");
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`❌ ${failure}`);
  console.error("PRODUCTION MEDIA VERIFICATION FAILED");
  process.exit(1);
}

console.log("✓ stable mascot alias matches source bytes");
console.log("✓ stable Khmer audio alias matches source bytes");
console.log("✓ UI/audio code uses stable /media URLs");
console.log("✓ Vercel static routing cannot be swallowed by SPA rewrites");
console.log("✓ built output contains byte-identical stable media");
console.log("PRODUCTION MEDIA VERIFICATION PASSED");
