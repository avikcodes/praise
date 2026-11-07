import { ImageResponse } from "next/og";
import { PraiseLogo } from "@/components/brand";

/** Social card dimensions (Open Graph recommended size). */
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

/**
 * The social card: brand mark, wordmark, the product promise and the
 * formats it collects. Rendered by `opengraph-image.tsx` and
 * `twitter-image.tsx`; `ImageResponse` falls back to its bundled Geist
 * font, which is the typeface the site already uses.
 */
export function renderSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundColor: "#fcfbf8",
          color: "#1b1a18",
        }}
      >
        {/* The real lockup, rendered from the same logo geometry as the
            navbar, footer and favicon — not a stand-in glyph. */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <PraiseLogo size={64} decorative />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              lineHeight: 1.08,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            Collect customer love. Keep it yours.
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.4,
              color: "#6b675f",
              marginTop: 28,
              maxWidth: 940,
            }}
          >
            Free, open-source, self-hosted testimonial platform for text,
            video and audio.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            {["Text", "Video", "Audio"].map((format) => (
              <div
                key={format}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 22px",
                  borderRadius: 999,
                  border: "2px solid #e7e3da",
                  backgroundColor: "#ffffff",
                  fontSize: 24,
                  color: "#3c3a36",
                }}
              >
                {format}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 24, color: "#7a756c" }}>
            Runs on your own infrastructure
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
