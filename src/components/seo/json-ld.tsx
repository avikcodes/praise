type JsonLdProps = {
  data: object | object[];
};

/**
 * Structured data as a native `<script>` tag — the shape Next.js
 * recommends for JSON-LD (it is data, not executable code, so
 * `next/script` would be wrong). `<` is escaped so no string can break
 * out of the script element.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
