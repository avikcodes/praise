/**
 * Praise Extension Popup Controller
 * Manages active-tab capture, server connection verification, duplicate detection,
 * and authenticated submission to the Praise moderation queue.
 */

// Global State
let config = {
  serverUrl: "http://localhost:3000",
  apiKey: "",
  selectedWorkspaceId: "",
  selectedProjectId: "",
};

let currentTabInfo = {
  url: "",
  title: "",
  platform: "WEB",
};

let debounceTimer = null;

// Storage Helper (supports both chrome.storage.sync/local and localStorage for polyfill/testing)
const storage = {
  get: (keys, cb) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(keys, cb);
    } else {
      const res = {};
      for (const k of keys) {
        res[k] = localStorage.getItem(`praise_${k}`) || "";
      }
      cb(res);
    }
  },
  set: (items, cb) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set(items, cb);
    } else {
      for (const [k, v] of Object.entries(items)) {
        localStorage.setItem(`praise_${k}`, String(v));
      }
      if (cb) cb();
    }
  },
};

// DOM Elements
const connectionPill = document.getElementById("connection-pill");
const toggleSettingsBtn = document.getElementById("toggle-settings-btn");
const noticeBanner = document.getElementById("notice-banner");

const settingsView = document.getElementById("settings-view");
const captureView = document.getElementById("capture-view");
const successView = document.getElementById("success-view");

const serverUrlInput = document.getElementById("server-url");
const apiKeyInput = document.getElementById("api-key");
const verifyBtn = document.getElementById("verify-btn");

const refreshSelectionBtn = document.getElementById("refresh-selection-btn");
const duplicateWarning = document.getElementById("duplicate-warning");
const duplicateReasonText = document.getElementById("duplicate-reason-text");

const captureForm = document.getElementById("capture-form");
const testimonialContent = document.getElementById("testimonial-content");
const charCountSpan = document.getElementById("char-count");
const authorNameInput = document.getElementById("author-name");
const authorHandleInput = document.getElementById("author-handle");
const authorTitleInput = document.getElementById("author-title");
const authorCompanyInput = document.getElementById("author-company");
const sourcePlatformSelect = document.getElementById("source-platform");
const sourceUrlInput = document.getElementById("source-url");
const workspaceSelect = document.getElementById("workspace-select");
const projectSelect = document.getElementById("project-select");
const internalNoteInput = document.getElementById("internal-note");
const ratingValInput = document.getElementById("rating-val");
const starsContainer = document.getElementById("star-rating-container");
const saveBtn = document.getElementById("save-btn");
const resetBtn = document.getElementById("reset-btn");

const viewInboxLink = document.getElementById("view-inbox-link");
const captureAnotherBtn = document.getElementById("capture-another-btn");

// Show/Hide Banner
function showBanner(message, type = "error") {
  noticeBanner.textContent = message;
  noticeBanner.className = `banner ${type}`;
  noticeBanner.classList.remove("hidden");
  setTimeout(() => {
    noticeBanner.classList.add("hidden");
  }, 6000);
}

// Switch Active View
function showView(viewName) {
  settingsView.classList.add("hidden");
  captureView.classList.add("hidden");
  successView.classList.add("hidden");

  if (viewName === "settings") settingsView.classList.remove("hidden");
  else if (viewName === "success") successView.classList.remove("hidden");
  else captureView.classList.remove("hidden");
}

// Update Interactive Stars
function setRating(rating) {
  ratingValInput.value = rating;
  const stars = starsContainer.querySelectorAll(".star");
  stars.forEach((star) => {
    const starR = Number(star.getAttribute("data-rating"));
    if (starR <= rating) {
      star.classList.add("active");
    } else {
      star.classList.remove("active");
    }
  });
}

// Initialize Stars Click Listener
starsContainer.addEventListener("click", (e) => {
  const target = e.target;
  if (target.classList.contains("star")) {
    const r = Number(target.getAttribute("data-rating"));
    setRating(r);
  }
});

// Character Count
testimonialContent.addEventListener("input", () => {
  charCountSpan.textContent = testimonialContent.value.length;
  triggerDuplicateCheck();
});

sourceUrlInput.addEventListener("input", triggerDuplicateCheck);

// Duplicate Check Debounce
function triggerDuplicateCheck() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(checkDuplicate, 400);
}

async function checkDuplicate() {
  const content = testimonialContent.value.trim();
  const sourceUrl = sourceUrlInput.value.trim();
  const workspaceId = workspaceSelect.value || config.selectedWorkspaceId;

  if (!content && !sourceUrl) {
    duplicateWarning.classList.add("hidden");
    return;
  }

  if (!config.serverUrl || !workspaceId) return;

  try {
    const res = await fetch(`${config.serverUrl}/api/v1/extension/check-duplicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { "x-api-key": config.apiKey } : {}),
      },
      body: JSON.stringify({
        workspaceId,
        content,
        sourceUrl,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.isDuplicate) {
        duplicateReasonText.textContent = data.duplicateReason || "A matching testimonial already exists in this workspace.";
        duplicateWarning.classList.remove("hidden");
      } else {
        duplicateWarning.classList.add("hidden");
      }
    }
  } catch (err) {
    // Non-blocking duplicate check error
  }
}

// Verify Server Connection & Load Workspaces
async function verifyConnection(silent = false) {
  const server = (serverUrlInput.value || config.serverUrl || "http://localhost:3000").replace(/\/$/, "");
  const apiKey = (apiKeyInput.value || config.apiKey || "").trim();

  const spinner = verifyBtn.querySelector(".spinner");
  const btnText = verifyBtn.querySelector(".btn-text");

  if (!silent) {
    spinner?.classList.remove("hidden");
    btnText.textContent = "Verifying...";
    verifyBtn.disabled = true;
  }

  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["x-api-key"] = apiKey;

    const res = await fetch(`${server}/api/v1/extension/verify`, {
      method: "GET",
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Connection failed.");
    }

    // Save Verified Config
    config.serverUrl = server;
    config.apiKey = apiKey;
    config.selectedWorkspaceId = data.workspace?.id || "";

    storage.set(
      {
        serverUrl: server,
        apiKey: apiKey,
        selectedWorkspaceId: data.workspace?.id || "",
      },
      () => {}
    );

    // Update Header Pill
    connectionPill.textContent = data.workspace?.name || "Connected";
    connectionPill.className = "status-pill connected";

    // Populate Workspaces Select
    workspaceSelect.innerHTML = "";
    const wsList = data.workspaces || [data.workspace];
    wsList.forEach((ws) => {
      const opt = document.createElement("option");
      opt.value = ws.id;
      opt.textContent = ws.name;
      if (ws.id === config.selectedWorkspaceId) opt.selected = true;
      workspaceSelect.appendChild(opt);
    });

    // Populate Projects Select
    projectSelect.innerHTML = '<option value="">General (No project)</option>';
    (data.projects || []).forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      projectSelect.appendChild(opt);
    });

    if (!silent) {
      showBanner(`Connected to ${data.workspace?.name}!`, "success");
      showView("capture");
    }

    return true;
  } catch (err) {
    connectionPill.textContent = "Not Connected";
    connectionPill.className = "status-pill disconnected";

    if (!silent) {
      showBanner(err instanceof Error ? err.message : "Failed to verify Praise connection.", "error");
    }
    return false;
  } finally {
    if (!silent) {
      spinner?.classList.add("hidden");
      btnText.textContent = "Connect & Verify Permissions";
      verifyBtn.disabled = false;
    }
  }
}

// User-Initiated Active Tab Capture
async function captureFromActiveTab() {
  if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabs.query) {
    // Development or standalone preview mode fallback
    return;
  }

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) return;

    const activeTab = tabs[0];
    if (!activeTab.id || !activeTab.url || activeTab.url.startsWith("chrome://")) {
      return;
    }

    currentTabInfo.url = activeTab.url;
    currentTabInfo.title = activeTab.title || "";

    // Execute extractor script inside active tab
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ["extractor.js"],
    });

    if (injectionResults && injectionResults[0] && injectionResults[0].result) {
      const data = injectionResults[0].result;

      if (data.content) {
        testimonialContent.value = data.content;
        charCountSpan.textContent = data.content.length;
      }

      if (data.sourceUrl) {
        sourceUrlInput.value = data.sourceUrl;
      }

      if (data.sourcePlatform) {
        sourcePlatformSelect.value = data.sourcePlatform;
      }

      if (data.authorName && !authorNameInput.value) {
        authorNameInput.value = data.authorName;
      }

      if (data.authorHandle && !authorHandleInput.value) {
        authorHandleInput.value = data.authorHandle;
      }

      if (data.authorTitle && !authorTitleInput.value) {
        authorTitleInput.value = data.authorTitle;
      }

      if (data.authorCompany && !authorCompanyInput.value) {
        authorCompanyInput.value = data.authorCompany;
      }

      triggerDuplicateCheck();
    }
  } catch (err) {
    console.error("Tab capture error:", err);
  }
}

// Form Submission -> Praise Moderation Queue
captureForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const content = testimonialContent.value.trim();
  const sourceUrl = sourceUrlInput.value.trim();
  const authorName = authorNameInput.value.trim();
  const authorHandle = authorHandleInput.value.trim();
  const authorTitle = authorTitleInput.value.trim();
  const authorCompany = authorCompanyInput.value.trim();
  const sourcePlatform = sourcePlatformSelect.value;
  const rating = Number(ratingValInput.value) || 5;
  const workspaceId = workspaceSelect.value || config.selectedWorkspaceId;
  const projectId = projectSelect.value || null;
  const internalNote = internalNoteInput.value.trim();

  if (!content) {
    showBanner("Please enter or highlight testimonial text.");
    return;
  }

  if (!authorName) {
    showBanner("Please provide the customer or author name.");
    return;
  }

  if (!sourceUrl) {
    showBanner("Source URL is required.");
    return;
  }

  if (!config.serverUrl) {
    showBanner("Praise server URL is not configured. Open settings.");
    showView("settings");
    return;
  }

  const spinner = saveBtn.querySelector(".spinner");
  const btnText = saveBtn.querySelector(".btn-text");

  spinner?.classList.remove("hidden");
  btnText.textContent = "Saving to Praise...";
  saveBtn.disabled = true;

  try {
    const res = await fetch(`${config.serverUrl}/api/v1/extension/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { "x-api-key": config.apiKey } : {}),
      },
      body: JSON.stringify({
        workspaceId,
        projectId,
        content,
        authorName,
        authorHandle,
        authorTitle,
        authorCompany,
        sourcePlatform,
        sourceUrl,
        rating,
        internalNote,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to save testimonial.");
    }

    // Configure success link to Praise Inbox
    const serverBase = config.serverUrl.replace(/\/$/, "");
    viewInboxLink.href = `${serverBase}/dashboard/testimonials`;

    showView("success");
  } catch (err) {
    showBanner(err instanceof Error ? err.message : "Failed to save testimonial to Praise.", "error");
  } finally {
    spinner?.classList.add("hidden");
    btnText.textContent = "Save to Moderation Queue";
    saveBtn.disabled = false;
  }
});

// Event Listeners
toggleSettingsBtn.addEventListener("click", () => {
  if (settingsView.classList.contains("hidden")) {
    showView("settings");
  } else {
    showView("capture");
  }
});

verifyBtn.addEventListener("click", (e) => {
  e.preventDefault();
  verifyConnection(false);
});

refreshSelectionBtn.addEventListener("click", (e) => {
  e.preventDefault();
  captureFromActiveTab();
});

resetBtn.addEventListener("click", () => {
  testimonialContent.value = "";
  charCountSpan.textContent = "0";
  authorNameInput.value = "";
  authorHandleInput.value = "";
  authorTitleInput.value = "";
  authorCompanyInput.value = "";
  internalNoteInput.value = "";
  duplicateWarning.classList.add("hidden");
  setRating(5);
});

captureAnotherBtn.addEventListener("click", () => {
  testimonialContent.value = "";
  charCountSpan.textContent = "0";
  duplicateWarning.classList.add("hidden");
  showView("capture");
  captureFromActiveTab();
});

// Initialize on Popup Load
document.addEventListener("DOMContentLoaded", () => {
  storage.get(["serverUrl", "apiKey", "selectedWorkspaceId"], (items) => {
    if (items.serverUrl) {
      config.serverUrl = items.serverUrl;
      serverUrlInput.value = items.serverUrl;
    }
    if (items.apiKey) {
      config.apiKey = items.apiKey;
      apiKeyInput.value = items.apiKey;
    }
    if (items.selectedWorkspaceId) {
      config.selectedWorkspaceId = items.selectedWorkspaceId;
    }

    // Attempt silent connection verification
    verifyConnection(true).then((connected) => {
      if (!connected && !config.apiKey) {
        showView("settings");
      } else {
        showView("capture");
        captureFromActiveTab();
      }
    });
  });
});
