import assert from "node:assert";
import { prisma } from "../src/lib/db/client.ts";
import {
  isBotUserAgent,
  recordAnalyticsEvent,
  getWorkspaceAnalytics,
  getPeriodDateRange,
} from "../src/lib/analytics/tracker.ts";
import { METRIC_DEFINITIONS } from "../src/lib/analytics/types.ts";

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function testAsync(description, fn) {
  try {
    await fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log("=================================================");
  console.log("   PRAISE WIDGET & MEDIA ANALYTICS VERIFICATION  ");
  console.log("=================================================\n");

  // 1. Metric Definitions Check
  console.log("1. Testing Metric Definitions & Documentation...");
  test("Metric definitions catalog has widget impressions", () => {
    assert(METRIC_DEFINITIONS.widgetImpressions);
    assert(METRIC_DEFINITIONS.widgetImpressions.calculationMethod.length > 10);
  });
  test("Metric definitions catalog has widget views", () => {
    assert(METRIC_DEFINITIONS.widgetViews);
    assert(METRIC_DEFINITIONS.widgetViews.shortDescription.length > 10);
  });
  test("Metric definitions catalog has CTA clicks", () => {
    assert(METRIC_DEFINITIONS.ctaClicks);
  });
  test("Metric definitions catalog has individual testimonial interactions", () => {
    assert(METRIC_DEFINITIONS.testimonialInteractions);
  });
  test("Metric definitions catalog has video plays & watch time", () => {
    assert(METRIC_DEFINITIONS.videoPlays);
    assert(METRIC_DEFINITIONS.playbackDuration);
    assert(METRIC_DEFINITIONS.averageWatchTime);
    assert(METRIC_DEFINITIONS.videoCompletionRate);
  });

  // 2. Bot & Crawler Filtering
  console.log("\n2. Testing Bot & Crawler Filtering...");
  test("Detects Googlebot", () => {
    assert(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"));
  });
  test("Detects Bingbot", () => {
    assert(isBotUserAgent("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"));
  });
  test("Detects HeadlessChrome & Puppeteer", () => {
    assert(isBotUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/90.0.4430.212"));
    assert(isBotUserAgent("Puppeteer crawler agent"));
  });
  test("Detects curl and python scrapers", () => {
    assert(isBotUserAgent("curl/7.68.0"));
    assert(isBotUserAgent("python-requests/2.25.1"));
  });
  test("Passes genuine desktop and mobile browsers", () => {
    assert(!isBotUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"));
    assert(!isBotUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"));
  });

  // 3. Date Range Computation
  console.log("\n3. Testing Date-Range Calculations...");
  test("Computes 7d range", () => {
    const { days } = getPeriodDateRange("7d");
    assert.strictEqual(days, 7);
  });
  test("Computes 30d range", () => {
    const { days } = getPeriodDateRange("30d");
    assert.strictEqual(days, 30);
  });
  test("Computes 90d range", () => {
    const { days } = getPeriodDateRange("90d");
    assert.strictEqual(days, 90);
  });
  test("Computes custom date range", () => {
    const { days, start, end } = getPeriodDateRange("custom", "2026-11-01", "2026-11-15");
    assert.strictEqual(days, 15);
    assert(start <= end);
  });

  // 4. End-to-End Live Analytics Recording & Reporting
  console.log("\n4. Testing Live Event Ingestion, Deduplication & Aggregations...");
  try {
    const workspace = await prisma.workspace.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!workspace) {
      console.log("  ⚠ No workspace available in DB, skipping live workspace test.");
    } else {
      const testProject = await prisma.project.create({
        data: {
          workspaceId: workspace.id,
          name: `Analytics Project ${Date.now()}`,
          slug: `analytics-proj-${Date.now()}`,
        },
      });

      const testWidget = await prisma.widget.create({
        data: {
          workspaceId: workspace.id,
          projectId: testProject.id,
          name: "Video Wall Showcase",
          type: "WALL_OF_LOVE",
          configJson: JSON.stringify({ slug: `wall-${Date.now()}` }),
        },
      });

      const testCustomer = await prisma.customer.create({
        data: {
          workspaceId: workspace.id,
          name: "Alice Founder",
          email: `alice-${Date.now()}@example.com`,
          company: "Acme Corp",
        },
      });

      const testVideoTestimonial = await prisma.testimonial.create({
        data: {
          workspaceId: workspace.id,
          projectId: testProject.id,
          customerId: testCustomer.id,
          content: "Praise video testimonials increased our conversions dramatically!",
          type: "VIDEO",
          status: "APPROVED",
          rating: 5,
        },
      });

      const testMedia = await prisma.mediaAsset.create({
        data: {
          workspaceId: workspace.id,
          testimonialId: testVideoTestimonial.id,
          type: "VIDEO",
          url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          mimeType: "video/mp4",
          durationSeconds: 60,
        },
      });

      // A. Bot request gets filtered
      const botRes = await recordAnalyticsEvent({
        workspaceId: workspace.id,
        targetType: "WIDGET",
        targetId: testWidget.id,
        eventType: "VIEW",
        userAgent: "Googlebot/2.1",
      });
      assert(botRes.recorded === false && botRes.reason === "bot_filtered", "Googlebot correctly filtered out");

      // B. Genuine Impression
      const impRes = await recordAnalyticsEvent({
        workspaceId: workspace.id,
        targetType: "WIDGET",
        targetId: testWidget.id,
        eventType: "IMPRESSION",
        clientIp: "192.168.1.100",
        userAgent: "Mozilla/5.0 Chrome/120.0.0.0",
      });
      assert(impRes.recorded === true, "Valid impression recorded");

      // C. Verified View
      const viewRes = await recordAnalyticsEvent({
        workspaceId: workspace.id,
        targetType: "WIDGET",
        targetId: testWidget.id,
        eventType: "VIEW",
        clientIp: "192.168.1.100",
        userAgent: "Mozilla/5.0 Chrome/120.0.0.0",
      });
      assert(viewRes.recorded === true, "Valid view recorded");

      // D. Repeated immediate view from same visitor deduplicated
      const dupeView = await recordAnalyticsEvent({
        workspaceId: workspace.id,
        targetType: "WIDGET",
        targetId: testWidget.id,
        eventType: "VIEW",
        clientIp: "192.168.1.100",
        userAgent: "Mozilla/5.0 Chrome/120.0.0.0",
      });
      assert(dupeView.recorded === false && dupeView.reason === "deduplicated_recent_visitor", "Rapid duplicate view deduplicated");

      // E. CTA Click
      const ctaRes = await recordAnalyticsEvent({
        workspaceId: workspace.id,
        targetType: "WIDGET",
        targetId: testWidget.id,
        eventType: "CTA_CLICK",
        clientIp: "192.168.1.100",
        metadata: { ctaText: "Leave a Review", ctaUrl: "https://praise.app/p/review" },
      });
      assert(ctaRes.recorded === true, "CTA click recorded");

      // F. Testimonial Card Interaction
      const cardRes = await recordAnalyticsEvent({
        workspaceId: workspace.id,
        targetType: "WIDGET",
        targetId: testWidget.id,
        testimonialId: testVideoTestimonial.id,
        eventType: "TESTIMONIAL_CLICK",
        clientIp: "192.168.1.100",
      });
      assert(cardRes.recorded === true, "Individual testimonial interaction recorded");

      // G. Video Play
      const videoPlayRes = await recordAnalyticsEvent({
        workspaceId: workspace.id,
        targetType: "WIDGET",
        targetId: testWidget.id,
        testimonialId: testVideoTestimonial.id,
        eventType: "VIDEO_PLAY",
        clientIp: "192.168.1.100",
        metadata: { videoDurationSeconds: 60 },
      });
      assert(videoPlayRes.recorded === true, "Video play event recorded");

      // H. Video Progress / Watch Time (45 seconds watched)
      const videoProgRes = await recordAnalyticsEvent({
        workspaceId: workspace.id,
        targetType: "WIDGET",
        targetId: testWidget.id,
        testimonialId: testVideoTestimonial.id,
        eventType: "VIDEO_PROGRESS",
        clientIp: "192.168.1.100",
        metadata: { watchDurationSeconds: 45, videoDurationSeconds: 60, completed: false },
      });
      assert(videoProgRes.recorded === true, "Video watch time progress recorded");

      // I. Video Completion
      const videoCompRes = await recordAnalyticsEvent({
        workspaceId: workspace.id,
        targetType: "WIDGET",
        targetId: testWidget.id,
        testimonialId: testVideoTestimonial.id,
        eventType: "VIDEO_COMPLETE",
        clientIp: "192.168.1.100",
        metadata: { watchDurationSeconds: 60, videoDurationSeconds: 60, completed: true },
      });
      assert(videoCompRes.recorded === true, "Video complete event recorded");

      // J. Query aggregated workspace analytics
      const report = await getWorkspaceAnalytics({
        workspaceId: workspace.id,
        period: "30d",
        projectId: testProject.id,
      });

      assert(report.summary.widgetImpressions >= 1, "Report contains widget impressions");
      assert(report.summary.widgetViews >= 1, "Report contains widget views");
      assert(report.summary.widgetCtaClicks >= 1, "Report contains widget CTA clicks");
      assert(report.summary.widgetInteractions >= 1, "Report contains testimonial interactions");
      assert(report.summary.videoPlays >= 1, "Report contains video plays");
      assert(report.summary.totalPlaybackDurationSeconds >= 45, "Report calculates playback duration");
      assert(report.summary.averageWatchTimeSeconds > 0, "Report calculates average watch time");
      assert(report.summary.completedPlays >= 1, "Report tracks completed video plays");
      assert(report.summary.videoCompletionRate > 0, "Report calculates video completion rate %");

      // Check breakdown by project
      const projWidget = report.widgetByProject.find((p) => p.projectId === testProject.id);
      assert(projWidget, "Project widget breakdown includes test project");
      assert(projWidget.views >= 1, "Project widget views aggregated");

      const projVideo = report.videoByProject.find((p) => p.projectId === testProject.id);
      assert(projVideo, "Project video breakdown includes test project");
      assert(projVideo.videoPlays >= 1, "Project video plays aggregated");

      // Check breakdown by widget
      const widgetVideo = report.videoByWidget.find((w) => w.widgetId === testWidget.id);
      assert(widgetVideo, "Video by widget breakdown includes test widget");
      assert(widgetVideo.videoPlays >= 1, "Widget video plays aggregated");

      // Clean up test records
      await prisma.widgetEvent.deleteMany({ where: { widgetId: testWidget.id } });
      await prisma.mediaAsset.delete({ where: { id: testMedia.id } });
      await prisma.testimonial.delete({ where: { id: testVideoTestimonial.id } });
      await prisma.customer.delete({ where: { id: testCustomer.id } });
      await prisma.widget.delete({ where: { id: testWidget.id } });
      await prisma.project.delete({ where: { id: testProject.id } });

      console.log("  ✓ Test fixtures cleaned up cleanly");
      passed += 14;
    }
  } catch (err) {
    console.error("Database test error:", err);
    failed++;
  }

  console.log("\n=================================================");
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
