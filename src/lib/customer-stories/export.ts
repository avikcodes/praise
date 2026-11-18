import type { CustomerStoryDetail } from "./types.ts";

/**
 * Formats a customer story as a clean GitHub-Flavored Markdown document.
 */
export function exportStoryToMarkdown(story: CustomerStoryDetail): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push("---");
  lines.push(`title: "${story.title.replace(/"/g, '\\"')}"`);
  if (story.subtitle) {
    lines.push(`subtitle: "${story.subtitle.replace(/"/g, '\\"')}"`);
  }
  lines.push(`slug: "${story.slug}"`);
  lines.push(`company: "${story.companyName.replace(/"/g, '\\"')}"`);
  if (story.customerName) {
    lines.push(`customer: "${story.customerName.replace(/"/g, '\\"')}"`);
  }
  if (story.customerTitle) {
    lines.push(`role: "${story.customerTitle.replace(/"/g, '\\"')}"`);
  }
  if (story.companyIndustry) {
    lines.push(`industry: "${story.companyIndustry.replace(/"/g, '\\"')}"`);
  }
  if (story.companySize) {
    lines.push(`company_size: "${story.companySize}"`);
  }
  if (story.publishedAt) {
    lines.push(`published_at: "${story.publishedAt}"`);
  }
  lines.push(`reading_time_minutes: ${story.readingTimeMinutes}`);
  lines.push(`permission_verified: ${story.permissionVerified}`);
  lines.push("---");
  lines.push("");

  // Document Heading
  lines.push(`# ${story.title}`);
  lines.push("");
  if (story.subtitle) {
    lines.push(`*${story.subtitle}*`);
    lines.push("");
  }

  // Company & Customer Meta
  lines.push(`**Company:** [${story.companyName}](${story.companyWebsite || "#"}) | ` +
    `**Industry:** ${story.companyIndustry || "Technology"} | ` +
    `**Company Size:** ${story.companySize || "N/A"}`);
  if (story.customerName) {
    lines.push(`**Featured Customer:** ${story.customerName}${story.customerTitle ? ` (${story.customerTitle})` : ""}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // Executive Summary
  if (story.summary) {
    lines.push("## Executive Summary");
    lines.push("");
    lines.push(story.summary);
    lines.push("");
  }

  // Key Takeaways
  if (story.keyTakeaways && story.keyTakeaways.length > 0) {
    lines.push("### Key Takeaways");
    lines.push("");
    for (const takeaway of story.keyTakeaways) {
      lines.push(`- ${takeaway}`);
    }
    lines.push("");
  }

  // Measurable Outcomes (ONLY if customer supplied them)
  if (story.measurableOutcomes && story.measurableOutcomes.length > 0) {
    lines.push("## Measurable Results");
    lines.push("");
    lines.push("| Metric | Before | After | Improvement | Timeframe |");
    lines.push("| :--- | :--- | :--- | :--- | :--- |");
    for (const outcome of story.measurableOutcomes) {
      lines.push(`| **${outcome.metric}** | ${outcome.before || "-"} | ${outcome.after || "-"} | **${outcome.improvement || "-"}** | ${outcome.timeframe || "-"} |`);
    }
    lines.push("");
  }

  // Featured Quotation
  if (story.featuredQuote) {
    lines.push("## Customer Perspective");
    lines.push("");
    lines.push(`> "${story.featuredQuote}"`);
    lines.push(`> `);
    lines.push(`> — **${story.featuredQuoteAuthor || story.customerName}**, ${story.featuredQuoteRole || story.customerTitle || story.companyName}`);
    lines.push("");
  }

  // Structured Sections
  if (story.sections && story.sections.length > 0) {
    for (const section of story.sections) {
      if (section.title) {
        lines.push(`## ${section.title}`);
        lines.push("");
      }
      if (section.content) {
        lines.push(section.content);
        lines.push("");
      }
      if (section.quote) {
        lines.push(`> "${section.quote}"`);
        if (section.quoteAuthor) {
          lines.push(`> `);
          lines.push(`> — *${section.quoteAuthor}${section.quoteRole ? `, ${section.quoteRole}` : ""}*`);
        }
        lines.push("");
      }
      if (section.mediaUrl) {
        lines.push(`![${section.caption || section.title || "Story Illustration"}](${section.mediaUrl})`);
        if (section.caption) {
          lines.push(`*${section.caption}*`);
        }
        lines.push("");
      }
    }
  }

  // Peer Advice
  if (story.peerAdvice) {
    lines.push("## Advice for Industry Peers");
    lines.push("");
    lines.push(`> "${story.peerAdvice}"`);
    lines.push("");
  }

  // Approved Media Gallery
  if (story.approvedMedia && story.approvedMedia.length > 0) {
    lines.push("## Visual Artifacts & Proof");
    lines.push("");
    for (const media of story.approvedMedia) {
      if (media.type === "IMAGE") {
        lines.push(`![${media.caption || "Customer Proof"}](${media.url})`);
      } else {
        lines.push(`[Watch Video Testimonial / Walkthrough](${media.url})`);
      }
      if (media.caption) {
        lines.push(`*${media.caption}*`);
      }
      lines.push("");
    }
  }

  // Legal Permission Footnote
  if (story.permissionVerified) {
    lines.push("---");
    lines.push("*Note: This customer story was published with documented consent from the customer.*");
  }

  return lines.join("\n");
}

/**
 * Formats a customer story as a polished, self-contained standalone HTML document.
 */
export function exportStoryToHtml(story: CustomerStoryDetail): string {
  const escapeHtml = (str: string | null | undefined): string => {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const title = escapeHtml(story.title);
  const subtitle = escapeHtml(story.subtitle);
  const companyName = escapeHtml(story.companyName);
  const customerName = escapeHtml(story.customerName);
  const customerTitle = escapeHtml(story.customerTitle);
  const summary = escapeHtml(story.summary);
  const featuredQuote = escapeHtml(story.featuredQuote);
  const quoteAuthor = escapeHtml(story.featuredQuoteAuthor || story.customerName);
  const quoteRole = escapeHtml(story.featuredQuoteRole || story.customerTitle || story.companyName);
  const peerAdvice = escapeHtml(story.peerAdvice);
  const accentColor = story.accentColor || "#4f46e5";

  // Outcomes HTML
  let outcomesHtml = "";
  if (story.measurableOutcomes && story.measurableOutcomes.length > 0) {
    const cards = story.measurableOutcomes
      .map(
        (o) => `
        <div class="metric-card">
          <div class="metric-name">${escapeHtml(o.metric)}</div>
          <div class="metric-value">${escapeHtml(o.improvement || o.after || "Significant")}</div>
          <div class="metric-details">
            ${o.before ? `<span>Before: <strong>${escapeHtml(o.before)}</strong></span> &rarr; ` : ""}
            ${o.after ? `<span>After: <strong>${escapeHtml(o.after)}</strong></span>` : ""}
          </div>
          ${o.timeframe ? `<div class="metric-timeframe">${escapeHtml(o.timeframe)}</div>` : ""}
        </div>
      `
      )
      .join("");

    outcomesHtml = `
      <section class="section metrics-section">
        <h2 class="section-title">Measurable Outcomes</h2>
        <div class="metrics-grid">
          ${cards}
        </div>
      </section>
    `;
  }

  // Key Takeaways HTML
  let takeawaysHtml = "";
  if (story.keyTakeaways && story.keyTakeaways.length > 0) {
    const listItems = story.keyTakeaways
      .map((t) => `<li>${escapeHtml(t)}</li>`)
      .join("");
    takeawaysHtml = `
      <div class="takeaways-box">
        <h3>Key Takeaways</h3>
        <ul>${listItems}</ul>
      </div>
    `;
  }

  // Sections HTML
  let sectionsHtml = "";
  if (story.sections && story.sections.length > 0) {
    sectionsHtml = story.sections
      .map((sec) => {
        let secContent = "";
        if (sec.title) {
          secContent += `<h2 class="section-title">${escapeHtml(sec.title)}</h2>`;
        }
        if (sec.content) {
          const paragraphs = sec.content
            .split("\n\n")
            .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
            .join("");
          secContent += paragraphs;
        }
        if (sec.quote) {
          secContent += `
            <blockquote class="story-blockquote">
              <p>&ldquo;${escapeHtml(sec.quote)}&rdquo;</p>
              ${
                sec.quoteAuthor
                  ? `<cite>&mdash; ${escapeHtml(sec.quoteAuthor)}${sec.quoteRole ? `, ${escapeHtml(sec.quoteRole)}` : ""}</cite>`
                  : ""
              }
            </blockquote>
          `;
        }
        if (sec.mediaUrl) {
          secContent += `
            <figure class="story-media">
              <img src="${escapeHtml(sec.mediaUrl)}" alt="${escapeHtml(sec.caption || "Proof")}" loading="lazy" />
              ${sec.caption ? `<figcaption>${escapeHtml(sec.caption)}</figcaption>` : ""}
            </figure>
          `;
        }
        return `<section class="section narrative-section">${secContent}</section>`;
      })
      .join("");
  }

  // Media Gallery HTML
  let mediaHtml = "";
  if (story.approvedMedia && story.approvedMedia.length > 0) {
    const mediaItems = story.approvedMedia
      .map((m) => {
        if (m.type === "IMAGE") {
          return `
            <figure class="gallery-item">
              <img src="${escapeHtml(m.url)}" alt="${escapeHtml(m.caption || "Customer Proof")}" />
              ${m.caption ? `<figcaption>${escapeHtml(m.caption)}</figcaption>` : ""}
            </figure>
          `;
        } else {
          return `
            <div class="gallery-item video-item">
              <video controls src="${escapeHtml(m.url)}"></video>
              ${m.caption ? `<p class="video-caption">${escapeHtml(m.caption)}</p>` : ""}
            </div>
          `;
        }
      })
      .join("");

    mediaHtml = `
      <section class="section gallery-section">
        <h2 class="section-title">Visual Proof & Media</h2>
        <div class="gallery-grid">${mediaItems}</div>
      </section>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | ${companyName} Customer Story</title>
  <meta name="description" content="${subtitle || summary || title}">
  <style>
    :root {
      --primary: ${accentColor};
      --text: #0f172a;
      --text-muted: #64748b;
      --bg: #ffffff;
      --surface: #f8fafc;
      --border: #e2e8f0;
      --card: #ffffff;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-family);
      color: var(--text);
      background-color: var(--bg);
      line-height: 1.65;
      padding: 2rem 1rem;
    }

    .container {
      max-width: 820px;
      margin: 0 auto;
    }

    /* Header */
    .story-header {
      margin-bottom: 2.5rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
    }
    .badge-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .company-pill {
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-weight: 600;
      color: var(--text);
    }
    .story-title {
      font-size: 2.5rem;
      line-height: 1.2;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 0.75rem;
      letter-spacing: -0.02em;
    }
    .story-subtitle {
      font-size: 1.25rem;
      color: var(--text-muted);
      line-height: 1.4;
      margin-bottom: 1.5rem;
    }

    /* Executive Summary */
    .summary-box {
      background: var(--surface);
      border-left: 4px solid var(--primary);
      padding: 1.5rem;
      border-radius: 0.5rem;
      margin-bottom: 2rem;
      font-size: 1.1rem;
    }

    /* Key Takeaways */
    .takeaways-box {
      background: #f1f5f9;
      border-radius: 0.5rem;
      padding: 1.25rem 1.5rem;
      margin-top: 1rem;
    }
    .takeaways-box h3 {
      font-size: 0.95rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
      color: var(--text);
    }
    .takeaways-box ul {
      padding-left: 1.25rem;
    }
    .takeaways-box li {
      margin-bottom: 0.4rem;
    }

    /* Featured Quote */
    .featured-quote-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 2rem;
      margin: 2.5rem 0;
      position: relative;
    }
    .featured-quote-card blockquote {
      font-size: 1.35rem;
      font-style: italic;
      color: var(--text);
      line-height: 1.5;
      margin-bottom: 1.25rem;
    }
    .quote-author {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 600;
      color: var(--text);
    }
    .quote-author .author-role {
      font-weight: 400;
      color: var(--text-muted);
    }

    /* Metrics Grid */
    .metrics-section {
      margin: 3rem 0;
    }
    .section-title {
      font-size: 1.6rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
      letter-spacing: -0.01em;
      color: var(--text);
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }
    .metric-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.5rem;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .metric-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.5rem;
    }
    .metric-value {
      font-size: 2.25rem;
      font-weight: 800;
      color: var(--primary);
      line-height: 1.1;
      margin-bottom: 0.5rem;
    }
    .metric-details {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .metric-timeframe {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }

    /* Narrative Sections */
    .narrative-section {
      margin: 2rem 0;
      font-size: 1.1rem;
      line-height: 1.75;
    }
    .narrative-section p {
      margin-bottom: 1.25rem;
    }
    .story-blockquote {
      border-left: 3px solid var(--primary);
      padding-left: 1.25rem;
      margin: 1.5rem 0;
      font-style: italic;
      color: #334155;
    }
    .story-blockquote cite {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.9rem;
      font-style: normal;
      font-weight: 600;
      color: var(--text-muted);
    }
    .story-media {
      margin: 2rem 0;
    }
    .story-media img {
      width: 100%;
      height: auto;
      border-radius: 0.5rem;
      border: 1px solid var(--border);
    }
    .story-media figcaption {
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
    }

    /* Gallery */
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
    }
    .gallery-item img, .gallery-item video {
      width: 100%;
      border-radius: 0.5rem;
      border: 1px solid var(--border);
    }
    .gallery-item figcaption, .video-caption {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 0.4rem;
    }

    /* Footer */
    .story-footer {
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    /* Print Styles for PDF generation */
    @media print {
      body {
        padding: 0;
        background: white;
        color: black;
      }
      .container {
        max-width: 100%;
      }
      .summary-box, .featured-quote-card, .metric-card {
        border: 1px solid #ccc;
        break-inside: avoid;
      }
      .metrics-grid {
        grid-template-columns: repeat(3, 1fr);
      }
      a {
        text-decoration: none;
        color: black;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="story-header">
      <div class="badge-bar">
        <span class="company-pill">${companyName}</span>
        ${story.companyIndustry ? `<span>&bull; ${escapeHtml(story.companyIndustry)}</span>` : ""}
        ${story.companySize ? `<span>&bull; ${escapeHtml(story.companySize)} employees</span>` : ""}
        <span>&bull; ${story.readingTimeMinutes} min read</span>
      </div>
      <h1 class="story-title">${title}</h1>
      ${subtitle ? `<p class="story-subtitle">${subtitle}</p>` : ""}
    </header>

    <main>
      ${
        summary
          ? `<div class="summary-box">
              <p>${summary}</p>
              ${takeawaysHtml}
            </div>`
          : ""
      }

      ${outcomesHtml}

      ${
        featuredQuote
          ? `<div class="featured-quote-card">
              <blockquote>&ldquo;${featuredQuote}&rdquo;</blockquote>
              <div class="quote-author">
                <div>
                  <strong>${quoteAuthor}</strong>
                  ${quoteRole ? `<div class="author-role">${quoteRole}</div>` : ""}
                </div>
              </div>
            </div>`
          : ""
      }

      ${sectionsHtml}

      ${
        peerAdvice
          ? `<section class="section narrative-section">
              <h2 class="section-title">Advice for Industry Peers</h2>
              <blockquote class="story-blockquote">
                <p>&ldquo;${peerAdvice}&rdquo;</p>
                <cite>&mdash; ${quoteAuthor}</cite>
              </blockquote>
            </section>`
          : ""
      }

      ${mediaHtml}
    </main>

    <footer class="story-footer">
      <p>Published with verified customer permission. All customer quotations preserved verbatim. &copy; ${new Date().getFullYear()} ${companyName}.</p>
    </footer>
  </div>
</body>
</html>
`;
}
