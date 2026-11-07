This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Praise landing page

The landing-page foundation for **Praise** lives in `src/app` and `src/components`.

### Design system

Tokens and reusable styles are defined in `src/app/globals.css`:

- **Surfaces**: warm white (`--color-warm-50`, `--color-warm-100`) with subtle borders (`--color-line`).
- **Text**: dark charcoal ink (`--color-ink-900` … `--color-ink-400`).
- **Accent**: purple `#7049D8` (`--color-brand-500`) with soft lavender backgrounds (`bg-brand-50`, `bg-brand-100`).
- **Type**: Geist via `next/font`, mapped to Tailwind's `font-sans` / `font-mono`.

Component classes you can reuse anywhere:

| Class | Purpose |
| --- | --- |
| `.container-page` | Page gutter + max width |
| `.section` | Shared vertical rhythm + scroll offset for the sticky header |
| `.display`, `.heading-lg`, `.heading-md`, `.lead`, `.muted` | Type scale |
| `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm/md/lg` | Buttons |
| `.card`, `.surface`, `.icon-tile` | Surfaces |
| `.eyebrow`, `.tag`, `.chip`, `.avatar` | Small UI pieces |
| `.nav-link`, `.footer-link` | Navigation and footer links |
| `.link` | Inline text link inside section copy (underlined, brand accent) |

### Logo and brand assets

One logo, defined once:

- **`src/lib/logo.json`** is the single source of truth. It holds the colours
  (`#7049d8` purple, `#ffffff`, `#1b1a18` ink), the icon shapes on the 32 × 32
  grid (rounded speech bubble, tail, the Geist quotation-glyph path, sparkle),
  and the horizontal lockup — icon + the `Praise` wordmark as vector outlines
  generated from Geist SemiBold, so the wordmark needs no font to render.
- **`src/lib/logo.ts`** exposes that JSON as typed values for React.
- **`src/components/brand.tsx`** renders it: `<PraiseLogo>` (icon + wordmark)
  and `<PraiseIcon>` (mark only). Both accept `size` (`sm` 24, `md` 32, `lg` 48
  or any number), `className` and `decorative`. They expose `role="img"` with
  `aria-label="Praise"` by default, or `aria-hidden` when `decorative` is set
  because a parent link already carries the accessible name.
- **`scripts/export-brand.mjs`** writes every static asset from the same JSON.
  Edit the geometry, then run:

  ```bash
  npm run brand:export
  ```

| File | Purpose |
| --- | --- |
| `public/brand/praise-logo.svg` | Horizontal lockup (icon + wordmark) |
| `public/brand/praise-icon.svg` | Icon only |
| `public/brand/praise-icon-512.png` | 512 × 512 app icon on an opaque white tile |
| `public/brand/praise-social.png` | 1200 × 630 sharing card |
| `src/app/favicon.ico` | Browser tab icon, 16/32/48 multi-resolution |
| `src/app/icon.svg` | Browser tab icon, vector |
| `src/app/apple-icon.png` | 180 × 180 home-screen icon |

Where it appears: the navbar and footer both render `<PraiseLogo>` from the
root layout, so every route — landing page, and the product, documentation,
community and legal pages as they are added — carries the identical mark;
`opengraph-image.tsx` / `twitter-image.tsx` render the same component for
share cards. No page invents its own version, and no emoji or icon font
stands in for the logo. See `public/brand/README.md` for usage rules.

### Components

| Path | Purpose |
| --- | --- |
| `src/components/ui/button.tsx` | `Button` (element) and `ButtonLink` (`next/link`) with shared variants/sizes |
| `src/components/ui/container.tsx` | Page gutter + max width |
| `src/components/ui/section.tsx` | `Section` (colour band + container) and `SectionHeading` |
| `src/components/ui/feature-list.tsx` | `FeatureList` — check-mark capability bullets |
| `src/components/ui/planned-chip.tsx` | `PlannedChip` — labels capabilities that are not implemented yet |
| `src/components/site-header.tsx` | Sticky navigation with a mobile menu |
| `src/components/site-footer.tsx` | Footer with Product / Documentation / Community / GitHub link columns |
| `src/components/brand.tsx` | `PraiseLogo` and `PraiseIcon` — the logo components |
| `src/lib/logo.json` + `src/lib/logo.ts` | Logo geometry (single source of truth) and its typed accessors |
| `src/components/seo/json-ld.tsx` | `JsonLd` — structured data as a native `<script>` tag with `<` escaped |
| `src/components/seo/social-image.tsx` | `ImageResponse` renderer shared by the Open Graph and Twitter card images |
| `src/components/sections/*` | Hero, Features, How it works, Collect, Manage, Publish, Open source, Developers, AI integrations, Self-host, Security, FAQ, CTA |

Sections on the home page: `Hero` → `Features` → `Workflow` (`#how-it-works`) → `Collect` (`#collect`) → `Manage` (`#manage`) → `Publish` (`#publish`) → `OpenSource` (`#open-source`) → `Developers` (`#developers`) → `AiIntegrations` (`#ai`) → `SelfHost` (`#self-host`) → `Security` → `Faq` (`#faq`) → `CTA`.
The product explanation sections are `Workflow`, `Collect`, `Manage` and `Publish`: three steps, then one section each for collecting, managing and publishing testimonials. `OpenSource`, `Developers`, `AiIntegrations`, `SelfHost` and `Faq` cover licensing and data ownership, the API/embed/SDK/webhook surfaces, planned MCP connections, the Docker deployment and pre-adoption questions.
Product previews are static and structural — skeleton lines, chips and empty states instead of invented testimonials or numbers. Nothing that is not implemented (the MCP server, the ChatGPT/Claude connections) is presented without a `PlannedChip` label, and no repository URL, customer counts or ratings are invented; `href="#"` links are placeholders until those routes exist.
The header links to `#features`, `#how-it-works` and `#self-host`; `Documentation` and `GitHub` are `#` placeholders until those routes exist.
Copy and `href="#"` links are placeholders — swap them for real routes as they are built.

### SEO, structured data and indexing

Everything lives in `src/app` and `src/lib/site.ts` (the single source for the
origin, title and descriptions):

| File | Purpose |
| --- | --- |
| `src/app/layout.tsx` | `metadataBase`, `title` default + `%s \| Praise` template, description, `alternates.canonical`, Open Graph, Twitter card, `robots` (index/follow + `googlebot` snippet limits), and the `Organization` + `SoftwareApplication` JSON-LD |
| `src/app/page.tsx` | `FAQPage` JSON-LD, built from the same `faqs` array the section renders |
| `src/lib/faq.ts` | FAQ copy shared by the section and the schema, so they cannot drift |
| `src/app/sitemap.ts` | Single-URL sitemap (fragments are not URLs) |
| `src/app/robots.ts` | `Allow: /` plus the sitemap pointer |
| `src/app/opengraph-image.tsx`, `src/app/twitter-image.tsx` | 1200×630 card images generated at build time, with exported `alt` text |
| `src/app/not-found.tsx` | Branded 404 with `robots: noindex` and no canonical |

Heading structure: one `<h1>` (hero), section titles as `<h2>`, cards and FAQ
questions (inside `<summary>`) as `<h3>`. There is no `Article` schema because
there are no articles, and no `BreadcrumbList` because the site is a single
page. No ratings, reviews, prices, logo or social profiles are claimed in the
schema because none are established.

**Manual configuration**

1. Set `NEXT_PUBLIC_SITE_URL` (see `.env.example`) to the production origin
   *before* `next build` — canonical URLs, the sitemap, robots.txt and the
   JSON-LD `@id`s all resolve against it. The `http://localhost:3000` fallback
   must not ship.
2. `href="#"` links (Documentation, GitHub, API reference, Community, legal)
   are placeholders: replace them when the real routes or repository URL
   exist. They cannot be guessed without inventing a URL.
3. After deploy, submit `sitemap.xml` in Google Search Console / Bing
   Webmaster Tools and validate the JSON-LD with the Schema Markup Validator.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
