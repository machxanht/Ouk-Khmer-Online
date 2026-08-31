import fs from "fs";
import path from "path";

interface AssetCheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: AssetCheckResult[] = [];

function checkFile(
  filePath: string,
  validator: (buf: Buffer, text: string) => { valid: boolean; reason?: string },
  description: string,
) {
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

console.log("==========================================");
console.log("   MEDIA ASSET INTEGRITY VERIFICATION    ");
console.log("==========================================");

// 1. Check Brand Mascot PNG
checkFile(
  "src/assets/mascot.png",
  (buf) => {
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buf.length < 8 || !buf.subarray(0, 8).equals(pngMagic)) {
      return {
        valid: false,
        reason: `Invalid PNG magic header: ${buf.subarray(0, 8).toString("hex")}`,
      };
    }
    return { valid: true };
  },
  "Brand Mascot PNG (Authentic Binary)",
);

// 2. Check Angkor Hero JPEG
checkFile(
  "src/assets/angkor-hero.jpg",
  (buf) => {
    if (buf.length < 3 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
      return {
        valid: false,
        reason: `Invalid JPEG magic header: ${buf.subarray(0, 4).toString("hex")}`,
      };
    }
    return { valid: true };
  },
  "Angkor Hero JPEG (Authentic Binary)",
);

// 3. Check Authentic Khmer Audio MP3
checkFile(
  "src/assets/khmer-audio-new.mp3",
  (buf) => {
    // ID3 header check (ID3 = 0x49 0x44 0x33) or MPEG sync frame (0xFF 0xFB / 0xFF 0xF3 / 0xFF 0xF2)
    const isId3 = buf.length >= 3 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33;
    const isMpeg = buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
    if (!isId3 && !isMpeg) {
      return {
        valid: false,
        reason: `Invalid MP3 header: ${buf.subarray(0, 4).toString("hex")}`,
      };
    }
    return { valid: true };
  },
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
console.log(`Total checks: ${results.length} (including ${totalSvgsChecked} SVG piece assets)`);

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
