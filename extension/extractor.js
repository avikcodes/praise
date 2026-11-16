/**
 * Injected script executed in active tab context upon user action.
 * Extracts highlighted text selection and metadata without storing passwords or cookies.
 */
function extractPageTestimonialData() {
  const selection = window.getSelection() ? window.getSelection().toString().trim() : "";
  const url = window.location.href;
  const title = document.title || "";
  const host = window.location.hostname.toLowerCase();

  let platform = "WEB";
  let authorName = "";
  let authorHandle = "";
  let authorTitle = "";
  let authorCompany = "";
  let authorAvatarUrl = "";

  // 1. Detect Platform from Hostname
  if (host.includes("twitter.com") || host.includes("x.com")) {
    platform = "X";
  } else if (host.includes("linkedin.com")) {
    platform = "LINKEDIN";
  } else if (host.includes("producthunt.com")) {
    platform = "PRODUCT_HUNT";
  } else if (host.includes("g2.com")) {
    platform = "G2";
  } else if (host.includes("trustpilot.com")) {
    platform = "TRUSTPILOT";
  } else if (host.includes("reddit.com")) {
    platform = "REDDIT";
  } else if (host.includes("google.com") || host.includes("maps.google.")) {
    platform = "GOOGLE";
  } else if (host.includes("capterra.com")) {
    platform = "CAPTERRA";
  }

  // 2. Platform-Specific Author Heuristics
  try {
    if (platform === "X") {
      // Find nearest tweet container to user's selection
      const activeRange = window.getSelection()?.rangeCount ? window.getSelection().getRangeAt(0) : null;
      let tweetEl = activeRange ? activeRange.commonAncestorContainer : null;
      if (tweetEl && tweetEl.nodeType !== 1) tweetEl = tweetEl.parentElement;
      while (tweetEl && !tweetEl.querySelector?.('[data-testid="User-Name"]') && tweetEl !== document.body) {
        tweetEl = tweetEl.parentElement;
      }

      const userNameEl = tweetEl?.querySelector?.('[data-testid="User-Name"]') || document.querySelector('[data-testid="User-Name"]');
      if (userNameEl) {
        const textParts = userNameEl.innerText.split("\n").filter(Boolean);
        if (textParts.length >= 1) authorName = textParts[0];
        const handleMatch = textParts.find((t) => t.startsWith("@"));
        if (handleMatch) authorHandle = handleMatch;
      }
      const avatarImg = tweetEl?.querySelector?.('img[src*="profile_images"]') || document.querySelector('img[src*="profile_images"]');
      if (avatarImg) authorAvatarUrl = avatarImg.src;
    } else if (platform === "REDDIT") {
      const authorEl = document.querySelector('a[href*="/user/"]');
      if (authorEl) {
        const handle = authorEl.innerText.trim();
        authorName = handle.startsWith("u/") ? handle : `u/${handle}`;
        authorHandle = authorName;
      }
    } else if (platform === "PRODUCT_HUNT") {
      const userEl = document.querySelector('a[data-test*="user-"]');
      if (userEl) authorName = userEl.innerText.trim();
    } else if (platform === "TRUSTPILOT") {
      const reviewerEl = document.querySelector('[data-consumer-name-typography]');
      if (reviewerEl) authorName = reviewerEl.innerText.trim();
    }
  } catch (err) {
    // Non-blocking heuristic error
  }

  // 3. Generic Meta Tags Fallback
  if (!authorName) {
    const metaAuthor =
      document.querySelector('meta[name="author"]')?.getAttribute("content") ||
      document.querySelector('meta[property="article:author"]')?.getAttribute("content") ||
      document.querySelector('[itemprop="author"]')?.textContent;
    if (metaAuthor) {
      authorName = metaAuthor.trim();
    }
  }

  return {
    content: selection,
    sourceUrl: url,
    sourcePlatform: platform,
    pageTitle: title,
    authorName,
    authorHandle,
    authorTitle,
    authorCompany,
    authorAvatarUrl,
  };
}

// When called via chrome.scripting.executeScript, return the result
extractPageTestimonialData();
