import fs from "fs";
import path from "path";

interface AssetCheckResult {
  name: string;
  passed: boolean;
  message: string;
}

type AssetValidator = (buf: Buffer, text: string) => { valid: boolean; reason?: string };

const results: AssetCheckResult[] = [];
const requireBuild = process.argv.includes("--require-build");
const buildDir = ".output/public";
const buildAssetsDir = `${buildDir}/app-assets`;

const pngValidator: AssetValidator = (buf) => {
  const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(pngMagic)) {
    return {
      valid: false,
      reason: `Invalid PNG magic header: ${buf.subarray(0, 8).toString("hex")}`,
    };
  }
  return { valid: true };
};

const jpegValidator: AssetValidator = (buf) => {
  if (buf.length < 3 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
    return {
      valid: false,
      reason: `Invalid JPEG magic header: ${buf.subarray(0, 4).toString("hex")}`,
    };
  }
  return { valid: true };
};

const mp3Validator: AssetValidator = (buf) => {
  const isId3 = buf.length >= 3 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33;
  const isMpeg = buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
  if (!isId3 && !isMpeg) {
    return {
      valid: false,
      reason: `Invalid MP3 header: ${buf.subarray(0, 4).toString("hex")}`,
    };
  }
  return { valid: true };
};

function withMinimumSize(minBytes: number, validator: AssetValidator): AssetValidator {
  return (buf, text) => {
    if (buf.length < minBytes) {
      return {
        valid: false,
        reason: `File too small: ${buf.length.toLocaleString()} bytes; expected at least ${minBytes.toLocaleString()}`,
      };
    }
    return validator(buf, text);
  };
}

function checkFile(filePath: string, validator: AssetValidator, description: string) {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    results.push({
      name: filePath,
      passed: false,
      message: `File not found: ${filePath} (${description})`,
    });
    return;
  }

  const stat = fs.statSync(fullPath);
  if (stat.size === 0) {
    results.push({
      name: filePath,
      passed: false,
      message: `File is empty (0 bytes): ${filePath}`,
    });
    return;
  }

  const buf = fs.readFileSync(fullPath);
  const text = buf.toString("utf8", 0, Math.min(buf.length, 1024));
  const res = validator(buf, text);
  if (!res.valid) {
    results.push({
      name: filePath,
      passed: false,
      message: `Validation failed for ${filePath}: ${res.reason || "Invalid format"}`,
    });
  } else {
    results.push({
      name: filePath,
      passed: true,
      message: `OK (${stat.size.toLocaleString()} bytes) - ${description}`,
    });
  }
}

function checkMustNotExist(filePath: string, description: string) {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    results.push({
      name: filePath,
      passed: false,
      message: `Legacy file MUST NOT exist: ${filePath} (${description})`,
    });
  } else {
    results.push({
      name: filePath,
      passed: true,
      message: `Confirmed absent: ${filePath} (${description})`,
    });
  }
}

function findBuiltAsset(prefix: string, extension: string): string | null {
  const fullDir = path.resolve(process.cwd(), buildAssetsDir);
  if (!fs.existsSync(fullDir)) return null;

  const match = fs
    .readdirSync(fullDir)
    .find((name) => name.startsWith(`${prefix}-`) && name.endsWith(extension));

  return match ? `${buildAssetsDir}/${match}` : null;
}

function checkBuiltReference(assetPath: string) {
  const assetName = path.basename(assetPath);
  const fullBuildDir = path.resolve(process.cwd(), buildDir);
  const searchableExtensions = new Set([".html", ".js", ".css"]);

  const filesToSearch: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (searchableExtensions.has(path.extname(entry.name))) {
        filesToSearch.push(fullPath);
      }
    }
  };

  walk(fullBuildDir);
  const referenced = filesToSearch.some((filePath) =>
    fs.readFileSync(filePath, "utf8").includes(assetName),
  );

  results.push({
    name: `bundle:${assetName}`,
    passed: referenced,
    message: referenced
      ? `Built bundle references ${assetName}`
      : `Built asset is orphaned: no HTML/JS/CSS references ${assetName}`,
  });
}

function checkBuiltOutput() {
  const fullBuildDir = path.resolve(process.cwd(), buildDir);
  const fullAssetsDir = path.resolve(process.cwd(), buildAssetsDir);

  if (!fs.existsSync(fullBuildDir) || !fs.existsSync(fullAssetsDir)) {
    results.push({
      name: buildAssetsDir,
      passed: false,
      message: `Production build output missing. Run npm run build before the dist integrity check.`,
    });
    return;
  }

  const indexPath = path.join(fullBuildDir, "index.html");
  const indexHtml = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
  const usesDedicatedAssetDir = indexHtml.includes("/app-assets/");
  results.push({
    name: `${buildDir}/index.html`,
    passed: usesDedicatedAssetDir,
    message: usesDedicatedAssetDir
      ? "Production HTML references the dedicated /app-assets/ path"
      : "Production HTML does not reference /app-assets/; stale asset-cache path may have returned",
  });

  const expectedAssets = [
    {
      prefix: "mascot",
      extension: ".png",
      validator: withMinimumSize(100_000, pngValidator),
      description: "Built mascot PNG",
    },
    {
      prefix: "angkor-hero",
      extension: ".jpg",
      validator: withMinimumSize(50_000, jpegValidator),
      description: "Built Angkor hero JPEG",
    },
    {
      prefix: "khmer-audio-new",
      extension: ".mp3",
      validator: withMinimumSize(500_000, mp3Validator),
      description: "Built Khmer audio MP3",
    },
  ] as const;

  for (const asset of expectedAssets) {
    const builtPath = findBuiltAsset(asset.prefix, asset.extension);
    if (!builtPath) {
      results.push({
        name: `${buildAssetsDir}/${asset.prefix}-*${asset.extension}`,
        passed: false,
        message: `Expected hashed production asset was not emitted: ${asset.prefix}-*${asset.extension}`,
      });
      continue;
    }

    checkFile(builtPath, asset.validator, asset.description);
    checkBuiltReference(builtPath);
  }
}

console.log("==========================================");
console.log("   MEDIA ASSET INTEGRITY VERIFICATION    ");
console.log("==========================================");

// 1. Check Brand Mascot PNG
checkFile(
  "src/assets/mascot.png",
  withMinimumSize(100_000, pngValidator),
  "Brand Mascot PNG (Authentic Binary)",
);

// 2. Check Angkor Hero JPEG
checkFile(
  "src/assets/angkor-hero.jpg",
  withMinimumSize(50_000, jpegValidator),
  "Angkor Hero JPEG (Authentic Binary)",
);

// 3. Check Authentic Khmer Audio MP3
checkFile(
  "src/assets/khmer-audio-new.mp3",
  withMinimumSize(500_000, mp3Validator),
  "Khmer Traditional Audio Track MP3",
);

// 4. Check Favicon ICO
checkFile(
  "public/favicon.ico",
  (buf) => {
    if (
      buf.length < 4 ||
      buf[0] !== 0x00 ||
      buf[1] !== 0x00 ||
      buf[2] !== 0x01 ||
      buf[3] !== 0x00
    ) {
      return {
        valid: false,
        reason: `Invalid ICO magic header: ${buf.subarray(0, 4).toString("hex")}`,
      };
    }
    return { valid: true };
  },
  "Application Favicon",
);

// 5. Check All 42 Ouk Piece SVGs
const pieceStyles = ["ada", "ada-red", "cambodian"];
const pieceColors = ["w", "b"];
const pieceTypes = ["K", "Q", "B", "N", "R", "P", "F"];

let totalSvgsChecked = 0;
for (const style of pieceStyles) {
  for (const color of pieceColors) {
    for (const type of pieceTypes) {
      const relPath = `public/pieces/${style}/${color}${type}.svg`;
      checkFile(
        relPath,
        (buf, text) => {
          const trimmed = text.trim();
          if (!trimmed.includes("<svg") || !buf.toString("utf8").includes("</svg>")) {
            return { valid: false, reason: "Content does not contain valid <svg> elements" };
          }
          return { valid: true };
        },
        `Piece SVG (${style} - ${color}${type})`,
      );
      totalSvgsChecked++;
    }
  }
}

// 6. Check Legacy files MUST NOT exist
checkMustNotExist("src/assets/khmer-audio.mp3", "Deprecated single audio");
checkMustNotExist("src/assets/khmer-audio-new-1.mp3", "Accidental duplicate copy");

// 7. Optional strict production-build verification. CI invokes this after `npm run build`.
if (requireBuild) {
  checkBuiltOutput();
}

// Summary & Evaluation
let allPassed = true;
for (const r of results) {
  if (!r.passed) {
    allPassed = false;
    console.error(`❌ FAIL: ${r.message}`);
  } else {
    console.log(`✓ PASS: ${r.message}`);
  }
}

console.log("------------------------------------------");
console.log(
  `Total checks: ${results.length} (including ${totalSvgsChecked} SVG piece assets${requireBuild ? ", plus production output" : ""})`,
);

if (allPassed) {
  console.log("==========================================");
  console.log("   ALL ASSET INTEGRITY CHECKS PASSED!     ");
  console.log("==========================================");
  process.exit(0);
} else {
  console.error("==========================================");
  console.error("   ASSET INTEGRITY CHECK FAILED!          ");
  console.error("==========================================");
  process.exit(1);
}