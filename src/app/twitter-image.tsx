import {
  contentType,
  renderSocialImage,
  size,
} from "@/components/seo/social-image";

/** Descriptive alt text for the generated card image. */
export const alt =
  "Praise — the free, open-source, self-hosted platform for collecting text, video and audio testimonials";

export { contentType, size };

/** Twitter/X card image. */
export default function Image() {
  return renderSocialImage();
}
