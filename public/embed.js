/**
 * Praise Testimonial Widget Loader (embed.js)
 * High-performance, isolated, responsive script loader for external websites.
 *
 * Usage:
 *   <div data-praise-widget="your-widget-slug"></div>
 *   <script async src="https://yourdomain.com/embed.js"></script>
 */
(function (window, document) {
  "use strict";

  // Prevent multiple initializations of the core engine
  if (window.__PRAISE_EMBED_LOADED__) {
    if (window.Praise && typeof window.Praise.init === "function") {
      window.Praise.init();
    }
    return;
  }
  window.__PRAISE_EMBED_LOADED__ = true;

  var instanceCounter = 0;
  var widgetRegistry = {};

  // Detect script origin (fallback to current origin)
  function getPraiseOrigin() {
    try {
      if (document.currentScript && document.currentScript.src) {
        var parsed = new URL(document.currentScript.src);
        return parsed.origin;
      }
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].src || "";
        if (src.indexOf("/embed.js") !== -1) {
          var parsedUrl = new URL(src);
          return parsedUrl.origin;
        }
      }
    } catch {
      // Ignore URL parsing fallback
    }
    return window.location.origin;
  }

  var baseUrl = getPraiseOrigin();

  // Inject minimal CSS keyframes for smooth loading skeleton
  function injectLoaderStyles() {
    if (document.getElementById("praise-embed-keyframes")) return;
    try {
      var style = document.createElement("style");
      style.id = "praise-embed-keyframes";
      style.textContent =
        "@keyframes praise-pulse {" +
        "  0%, 100% { opacity: 1; transform: scale(1); }" +
        "  50% { opacity: 0.45; transform: scale(0.99); }" +
        "}" +
        ".praise-skeleton-card {" +
        "  background: #f8fafc;" +
        "  border: 1px solid #e2e8f0;" +
        "  border-radius: 14px;" +
        "  padding: 20px;" +
        "  animation: praise-pulse 1.8s ease-in-out infinite;" +
        "}";
      (document.head || document.documentElement).appendChild(style);
    } catch {
      // Ignore style injection if restricted
    }
  }

  // Create loading placeholder skeleton
  function createSkeleton(minHeight) {
    var loader = document.createElement("div");
    loader.className = "praise-embed-loader praise-skeleton-card";
    loader.setAttribute("aria-hidden", "true");
    loader.style.cssText =
      "width: 100%; box-sizing: border-box; min-height: " +
      (minHeight || "180px") +
      "; display: flex; flex-direction: column; justify-content: center; gap: 12px;";

    var line1 = document.createElement("div");
    line1.style.cssText =
      "width: 40%; height: 12px; background: #e2e8f0; border-radius: 6px;";

    var line2 = document.createElement("div");
    line2.style.cssText =
      "width: 85%; height: 10px; background: #e2e8f0; border-radius: 6px;";

    var line3 = document.createElement("div");
    line3.style.cssText =
      "width: 60%; height: 10px; background: #e2e8f0; border-radius: 6px;";

    loader.appendChild(line1);
    loader.appendChild(line2);
    loader.appendChild(line3);
    return loader;
  }

  // Graceful error notice when widget fails to load
  function showFallback(container, loader, iframe) {
    if (loader && loader.parentNode) {
      loader.parentNode.removeChild(loader);
    }
    if (iframe) {
      iframe.style.display = "none";
    }
    var notice = document.createElement("div");
    notice.className = "praise-embed-fallback";
    notice.style.cssText =
      "padding: 24px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #64748b; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; margin: 10px 0;";
    notice.textContent = "Unable to load customer testimonials at this time.";
    container.appendChild(notice);
  }

  // Initialize a single widget container
  function initContainer(container) {
    if (container.getAttribute("data-praise-initialized") === "true") {
      return;
    }
    container.setAttribute("data-praise-initialized", "true");

    var widgetId = container.getAttribute("data-praise-widget");
    if (!widgetId || !widgetId.trim()) {
      return;
    }
    widgetId = widgetId.trim();

    var type = container.getAttribute("data-type");
    var theme = container.getAttribute("data-theme");
    var accent = container.getAttribute("data-accent");
    var minHeight = container.getAttribute("data-min-height") || "180px";

    var instanceId = "praise-embed-" + (++instanceCounter) + "-" + Math.random().toString(36).substring(2, 7);

    // Build URL with query params
    var params = [];
    params.push("instanceId=" + encodeURIComponent(instanceId));
    if (type) params.push("type=" + encodeURIComponent(type));
    if (theme) params.push("theme=" + encodeURIComponent(theme));
    if (accent) params.push("accent=" + encodeURIComponent(accent));

    var iframeUrl = baseUrl + "/embed/" + encodeURIComponent(widgetId);
    if (params.length > 0) {
      iframeUrl += "?" + params.join("&");
    }

    // Configure container style
    container.style.position = "relative";
    container.style.width = "100%";
    container.style.boxSizing = "border-box";
    container.style.minHeight = minHeight;

    // Insert loading skeleton
    var loader = createSkeleton(minHeight);
    container.appendChild(loader);

    // Create isolated iframe
    var iframe = document.createElement("iframe");
    iframe.id = instanceId;
    iframe.name = instanceId;
    iframe.title = "Customer Testimonials";
    iframe.src = iframeUrl;
    iframe.scrolling = "no";
    iframe.frameBorder = "0";
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen");
    iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    iframe.style.cssText =
      "width: 100% !important; min-width: 100% !important; border: none !important; outline: none !important; display: block !important; overflow: hidden !important; background: transparent !important; opacity: 0; transition: opacity 0.3s ease, height 0.2s ease;";

    // Register instance for postMessage height routing
    widgetRegistry[instanceId] = {
      instanceId: instanceId,
      widgetId: widgetId,
      container: container,
      loader: loader,
      iframe: iframe,
      loaded: false,
    };

    // Error safety timeout (12s)
    var timeoutId = setTimeout(function () {
      var item = widgetRegistry[instanceId];
      if (item && !item.loaded) {
        showFallback(container, loader, iframe);
      }
    }, 12000);

    iframe.onerror = function () {
      clearTimeout(timeoutId);
      showFallback(container, loader, iframe);
    };

    iframe.onload = function () {
      var item = widgetRegistry[instanceId];
      if (item) {
        item.loaded = true;
        clearTimeout(timeoutId);
        // If height was not yet received, fade in with default height
        if (parseFloat(iframe.style.height || "0") > 50) {
          if (loader.parentNode) loader.parentNode.removeChild(loader);
          iframe.style.opacity = "1";
          container.style.minHeight = "0";
        }
      }
    };

    container.appendChild(iframe);
  }

  // Cross-origin message handler for dynamic height adjustment
  function handleMessage(event) {
    if (!event || !event.data || typeof event.data !== "object") {
      return;
    }

    // 1. Validate message origin
    if (baseUrl && baseUrl !== "null") {
      try {
        var baseOrigin = new URL(baseUrl).origin;
        if (
          event.origin &&
          event.origin !== "null" &&
          event.origin !== baseOrigin &&
          event.origin !== window.location.origin
        ) {
          return;
        }
      } catch {
        // Fallback
      }
    }

    // 2. Validate message content schema
    var data = event.data;
    if (data.type !== "praise-resize") {
      return;
    }

    if (
      typeof data.height !== "number" ||
      isNaN(data.height) ||
      data.height <= 0 ||
      data.height > 50000
    ) {
      return;
    }

    var matchedInstance = null;

    // Match by event.source window or instanceId
    for (var key in widgetRegistry) {
      if (Object.prototype.hasOwnProperty.call(widgetRegistry, key)) {
        var entry = widgetRegistry[key];
        if (
          (event.source && entry.iframe && entry.iframe.contentWindow === event.source) ||
          (data.instanceId && entry.instanceId === data.instanceId) ||
          (!data.instanceId && entry.widgetId === data.widgetId)
        ) {
          matchedInstance = entry;
          break;
        }
      }
    }

    if (matchedInstance && data.height && typeof data.height === "number") {
      matchedInstance.loaded = true;
      var newHeight = Math.max(data.height, 50);
      matchedInstance.iframe.style.height = newHeight + "px";
      matchedInstance.iframe.style.opacity = "1";
      matchedInstance.container.style.minHeight = "0";

      if (matchedInstance.loader && matchedInstance.loader.parentNode) {
        matchedInstance.loader.parentNode.removeChild(matchedInstance.loader);
      }
    }
  }

  // Scan and mount all [data-praise-widget] elements
  function init() {
    injectLoaderStyles();
    var elements = document.querySelectorAll("[data-praise-widget]");
    for (var i = 0; i < elements.length; i++) {
      initContainer(elements[i]);
    }
  }

  // Set up message listener once
  window.addEventListener("message", handleMessage, false);

  // Auto-run on document ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Secondary sweep for deferred elements
  window.addEventListener("load", init);

  // Expose global Praise API for Single Page Applications (Next.js, Vue, Webflow interactions)
  window.Praise = window.Praise || {};
  window.Praise.init = init;
  window.Praise.version = "1.0.0";
})(window, document);

