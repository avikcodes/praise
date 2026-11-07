/**
 * Typed access to `logo.json` — the single source of truth for the Praise
 * logo.
 *
 * Every surface renders from this one file: the React components in
 * `src/components/brand.tsx` (header, footer, pages), the Open Graph card
 * in `src/components/seo/social-image.tsx`, and the static assets in
 * `public/brand/` plus the favicon and app icons, which `npm run
 * brand:export` writes from the same JSON. Change the geometry there and
 * regenerate — nothing can drift.
 */
import geometry from "./logo.json";

/** One shape of the icon, in the 32 × 32 icon grid. */
export type IconShape =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      rx: number;
      fill: string;
    }
  | {
      type: "path";
      d: string;
      transform?: string;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      strokeLinejoin?: "round" | "miter" | "bevel";
      strokeLinecap?: "round" | "butt" | "square";
    };

export const BRAND_COLORS = geometry.colors;

export const ICON_VIEWBOX = geometry.icon.viewBox;
export const ICON_WIDTH = geometry.icon.width;
export const ICON_HEIGHT = geometry.icon.height;
export const ICON_SHAPES = geometry.icon.elements as unknown as IconShape[];

export const LOGO_VIEWBOX = geometry.logo.viewBox;
export const LOGO_WIDTH = geometry.logo.width;
export const LOGO_HEIGHT = geometry.logo.height;
export const LOGO_ICON_SCALE = geometry.logo.iconScale;
export const LOGO_GAP = geometry.logo.gap;
export const LOGO_WORDMARK = geometry.logo.wordmark;
