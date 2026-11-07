#!/usr/bin/env node
/**
 * Regenerates every static brand asset from `src/lib/logo.json`.
 *
 *   public/brand/praise-logo.svg    horizontal lockup (icon + wordmark)
 *   public/brand/praise-icon.svg    icon only
 *   public/brand/praise-icon-512.png  app icon on an opaque background
 *   public/brand/praise-social.png  1200×630 sharing card
 *   src/app/icon.svg                browser tab icon (SVG)
 *   src/app/apple-icon.png          180×180 home-screen icon
 *   src/app/favicon.ico             16/32/48 multi-resolution favicon
 *
 * Run with `npm run brand:export` after editing `src/lib/logo.json`.
 * Nothing is hand-maintained: the React components, the Open Graph card
 * and these files all read the same geometry, so they cannot drift.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const geometry = JSON.parse(readFileSync(join(root, "src/lib/logo.json"), "utf8"));

const { colors } = geometry;
const icon = geometry.icon;
const logo = geometry.logo;

/* ---------------------------------------------------------------- *
 * SVG markup (kebab-case attributes, unlike the React props)
 * ---------------------------------------------------------------- */
function shapeMarkup(shape) {
  const { type, ...rest } = shape;
  return `<${type} ${attrs(rest)} />`;
}

function attrs(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}="${v}"`)
    .join(" ");
}

function iconShapes() {
  return icon.elements.map(shapeMarkup).join("\n  ");
}

function iconSvgFile() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}" width="${icon.width}" height="${icon.height}" fill="none">
  ${iconShapes()}
</svg>
`;
}

/** Icon + wordmark in the lockup's own coordinate system. */
function logoShapes() {
  const wm = logo.wordmark;
  const x = icon.width * logo.iconScale + logo.gap;
  return `<g transform="scale(${logo.iconScale})">
  ${iconShapes().split("\n").join("\n  ")}
</g>
  <path d="${wm.d}" transform="translate(${x} ${wm.baseline})" fill="${wm.fill}" />`;
}

function logoSvgFile() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logo.viewBox}" width="${logo.width}" height="${logo.height}" fill="none">
  ${logoShapes()}
</svg>
`;
}

/* ---------------------------------------------------------------- *
 * Raster helpers
 * ---------------------------------------------------------------- */
/** Render the icon scaled to `size` px and centred in a `canvas` px square. */
async function appIconSvg(canvas, fillRatio) {
  const size = Math.round(canvas * fillRatio);
  const offset = (canvas - size) / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}" fill="none">
  <rect width="${canvas}" height="${canvas}" fill="${fillRatio ===1 ? "none" : "#ffffff"}"/>
  <g transform="translate(${offset} ${offset}) scale(${size / icon.width})">
  ${iconShapes().split("\n").join("\n  ")}
  </g>
</svg>`,
  );
}

/* ---------------------------------------------------------------- *
 * Write files
 * ---------------------------------------------------------------- */
const brandDir = join(root, "public/brand");
const appDir = join(root, "src/app");
mkdirSync(brandDir, { recursive: true });

writeFileSync(join(brandDir, "praise-logo.svg"), logoSvgFile());
writeFileSync(join(brandDir, "praise-icon.svg"), iconSvgFile());
writeFileSync(join(appDir, "icon.svg"), iconSvgFile());

// App icon: opaque white tile, icon inset so platform masks never clip it.
await sharp(await appIconSvg(512, 0.86)).png().toFile(join(brandDir, "praise-icon-512.png"));
await sharp(await appIconSvg(180, 0.86)).png().toFile(join(appDir, "apple-icon.png"));

// Social sharing card: warm-white ground, centred lockup, brand rule.
const SOCIAL = { width: 1200, height: 630 };
const lockupWidth = 720;
const lockupScale = lockupWidth / logo.width;
const lockupHeight = logo.height * lockupScale;
const socialSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SOCIAL.width}" height="${SOCIAL.height}" viewBox="0 0 ${SOCIAL.width} ${SOCIAL.height}" fill="none">
  <rect width="${SOCIAL.width}" height="${SOCIAL.height}" fill="#fcfbf8"/>
  <g transform="translate(${(SOCIAL.width - lockupWidth) / 2} ${(SOCIAL.height - lockupHeight) / 2}) scale(${lockupScale})">
  ${logoShapes().split("\n").join("\n  ")}
  </g>
  <rect y="${SOCIAL.height - 8}" width="${SOCIAL.width}" height="8" fill="${colors.purple}" />
</svg>`,
);
await sharp(socialSvg).png().toFile(join(brandDir, "praise-social.png"));

// Favicon: three sizes in one .ico, transparent so it suits light and dark tabs.
const icoPngs = [];
for (const size of [48, 32, 16]) {
  const buf = await sharp(await appIconSvg(size, 1)).png().toBuffer();
  const path = join(root, `.favicon-${size}.png`);
  writeFileSync(path, buf);
  icoPngs.push(path);
}
writeFileSync(join(appDir, "favicon.ico"), "");
execFileSync(
  "python3",
  [
    "-c",
    `
from PIL import Image
src = Image.open(${JSON.stringify(icoPngs[0])})
src.save(${JSON.stringify(join(appDir, "favicon.ico"))}, format="ICO", sizes=[(16,16),(32,32),(48,48)])
`,
  ],
  { stdio: "inherit" },
);
for (const path of icoPngs) {
  execFileSync("rm", ["-f", path]);
}

console.log("brand assets written:");
for (const file of [
  "public/brand/praise-logo.svg",
  "public/brand/praise-icon.svg",
  "public/brand/praise-icon-512.png",
  "public/brand/praise-social.png",
  "src/app/icon.svg",
  "src/app/apple-icon.png",
  "src/app/favicon.ico",
]) {
  console.log("  " + file);
}
