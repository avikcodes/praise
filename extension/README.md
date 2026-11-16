# Praise Browser Extension — Testimonial & Review Clipper

A lightweight, secure Manifest V3 browser extension for capturing customer testimonials, quotes, and reviews from any webpage directly into your Praise workspace.

---

## Features

- **Browser Toolbar Action**: Single-click access from your browser toolbar with a clean, Praise-branded popup interface.
- **User-Initiated Active Tab Capture**: Extracts the user's active highlighted quote or text without crawling or running background scripts.
- **Platform Auto-Detection**: Identifies source platforms from the hostname (e.g. X / Twitter, LinkedIn, Product Hunt, G2, Trustpilot, Reddit, Google Reviews, Capterra, or standard web pages).
- **Author & Source Provenance**: Automatically detects author display name, handle, company, role, avatar, and original canonical page URL.
- **Pre-Submission Review & Editing**: Allows full user review, rating selection (1–5 stars), and text editing before saving.
- **Workspace & Project Association**: Directs captures to any target workspace and optional project.
- **Real-Time Duplicate Detection**: Warns in real-time if a matching quote or URL already exists in your Praise workspace to prevent duplicate records.
- **Internal Team Notes**: Attach private notes (e.g. context, author identity) saved directly to the testimonial moderation record.
- **Safety Guarantee**: Captured testimonials are stored with `status: PENDING` and are held in your moderation inbox until approved.

---

## Security & Privacy Principles

The extension is designed around strict privacy and security principles:

1. **Minimal Browser Permissions**:
   - `activeTab`: Only grants temporary tab access when the user explicitly clicks the extension action.
   - `scripting`: Runs text and metadata extraction strictly on the active tab upon user initiation.
   - `storage`: Preserves your server URL and API key locally on your device.
   - **No `<all_urls>` permission**: Never tracks or inspects unprompted browser navigation.
2. **Zero Background Scraping**: No persistent background workers or silent page crawling.
3. **No Private Message Capture**: Does not read private messages, browser cookies, passwords, or data behind restricted access.
4. **Explicit User Action Required**: Content is only captured and submitted when the user clicks **"Save to Moderation Queue"**.
5. **Secure Connection**: Connects to your Praise instance using authenticated API keys via HTTPS/HTTP.

---

## Local Development & Installation

### Chrome, Brave, Edge, Opera (Chromium)

1. Open your browser and navigate to the extensions manager:
   - **Chrome / Brave**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Opera**: `opera://extensions`
2. Enable **"Developer mode"** (toggle in the top-right corner).
3. Click the **"Load unpacked"** button.
4. Select the `extension/` directory inside this repository:
   ```
   c:\Users\...\ossproject\extension
   ```
5. The extension icon **"Praise - Capture Testimonials"** will now appear in your browser toolbar. Pin it for quick access!

### Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **"Load Temporary Add-on..."**.
3. Select `extension/manifest.json`.

---

## Connecting to Praise

1. Start your local or deployed Praise instance:
   ```bash
   npm run dev
   ```
2. In Praise, go to **Workspace Settings &rarr; API Keys** (or generate an API key via `/api/workspaces/:id/api-keys`).
3. Click the Praise extension icon in your browser toolbar.
4. Click the **Gear icon (Settings)** in the top right:
   - **Praise Server URL**: `http://localhost:3000` (or your production Praise URL).
   - **Praise API Key**: Paste your `praise_live_sk_...` key.
5. Click **"Connect & Verify Permissions"**.
6. The status pill will turn green: **"Connected: [Workspace Name]"**.

---

## How to Capture a Testimonial

1. Navigate to any webpage (e.g., a tweet on X, a LinkedIn post, a Product Hunt review, or a blog post).
2. Highlight the quote or review text you want to capture.
3. Click the Praise extension icon in your toolbar.
4. The highlighted text, author name, platform, and source URL are automatically populated into the form.
5. Adjust the star rating, edit any details, or add an internal team note.
6. If the quote has already been saved, an amber **"Possible Duplicate"** warning will appear.
7. Click **"Save to Moderation Queue"**.
8. Once saved, click **"Open in Praise Moderation Queue"** to approve or feature the testimonial!
