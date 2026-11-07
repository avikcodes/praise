import type { IconShape } from "@/lib/logo";
import {
  BRAND_COLORS,
  ICON_HEIGHT,
  ICON_SHAPES,
  ICON_VIEWBOX,
  ICON_WIDTH,
  LOGO_GAP,
  LOGO_HEIGHT,
  LOGO_ICON_SCALE,
  LOGO_VIEWBOX,
  LOGO_WIDTH,
  LOGO_WORDMARK,
} from "@/lib/logo";
import { cn } from "@/lib/utils";

/**
 * The Praise logo.
 *
 * Both components render the vector geometry from `src/lib/logo.json` —
 * the same file the SVG exports, favicon, app icons and Open Graph card
 * are generated from — so the mark and wordmark are identical on every
 * page and in every asset. Nothing here is an icon-font or emoji glyph.
 *
 * The SVG scales from its `viewBox`, so one implementation is crisp at
 * any size; `size` only chooses the rendered height.
 */
const HEIGHTS = { sm: 24, md: 32, lg: 48 } as const;

export type LogoSize = keyof typeof HEIGHTS | number;

type SharedProps = {
  /** Rendered height in pixels (width follows the logo's aspect ratio). */
  size?: LogoSize;
  /** Hide from assistive tech when a parent element already names it. */
  decorative?: boolean;
  className?: string;
};

type LogoProps = SharedProps & {
  /** `full` = icon + wordmark, `icon` = the mark on its own. */
  variant?: "full" | "icon";
};

function heightOf(size: LogoSize) {
  return typeof size === "number" ? size : HEIGHTS[size];
}

/** The mark's shapes, shared by every variant. */
function MarkShapes() {
  return ICON_SHAPES.map((shape: IconShape, index) =>
    shape.type === "rect" ? (
      <rect key={index} {...shape} />
    ) : (
      <path key={index} {...shape} />
    ),
  );
}

function a11yProps(decorative?: boolean) {
  return decorative
    ? ({ "aria-hidden": true, focusable: "false" } as const)
    : ({ role: "img", "aria-label": "Praise" } as const);
}

/** Icon-only mark: speech bubble, quotation marks and sparkle. */
export function PraiseIcon({ size = "md", decorative, className }: SharedProps) {
  const h = heightOf(size);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={ICON_VIEWBOX}
      width={h * (ICON_WIDTH / ICON_HEIGHT)}
      height={h}
      className={cn("block shrink-0", className)}
      {...a11yProps(decorative)}
    >
      <MarkShapes />
    </svg>
  );
}

/** Horizontal lockup: mark + "Praise" wordmark. */
export function PraiseLogo({ size = "md", variant = "full", decorative, className }: LogoProps) {
  const h = heightOf(size);

  if (variant === "icon") {
    return <PraiseIcon size={h} decorative={decorative} className={className} />;
  }

  const wordmarkX = ICON_WIDTH * LOGO_ICON_SCALE + LOGO_GAP;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={LOGO_VIEWBOX}
      width={h * (LOGO_WIDTH / LOGO_HEIGHT)}
      height={h}
      className={cn("block shrink-0", className)}
      {...a11yProps(decorative)}
    >
      <g transform={`scale(${LOGO_ICON_SCALE})`}>
        <MarkShapes />
      </g>
      <path
        d={LOGO_WORDMARK.d}
        transform={`translate(${wordmarkX} ${LOGO_WORDMARK.baseline})`}
        fill={LOGO_WORDMARK.fill ?? BRAND_COLORS.ink}
      />
    </svg>
  );
}
