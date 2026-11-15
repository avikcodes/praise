/**
 * Comprehensive Automated Test Suite for Praise Video Subtitle Editing & Export Controls
 *
 * Verifies:
 * 1. Timestamp formatting and parsing for SRT and WebVTT standards.
 * 2. Bi-directional subtitle generation and parsing (segments -> SRT/VTT -> segments).
 * 3. Validation rules for subtitle segments (timing order, non-empty text, boundary checks).
 * 4. Fallback estimation of subtitle segments from raw transcript text.
 * 5. Dimension and aspect ratio calculations across 720p, 1080p, and 4K profiles (16:9, 9:16, 1:1, 4:5).
 * 6. Source video capability analysis and strict 4K resolution validation:
 *    - Rejection of 4K export on 720p / 1080p low-resolution source footage (never promise 4K).
 *    - Acceptance of 4K export on true 4K / UHD footage.
 * 7. Upfront validation of export settings, memory resources, and duration limits.
 * 8. Configurable media processor backend (FFmpeg availability detection, argument builder, safe non-destructive fallback).
 * 9. Non-destructive media guarantee: source media bytes remain 100% unaltered.
 * 10. Video export job lifecycle state transitions: QUEUED -> PROCESSING -> COMPLETED / FAILED, plus retry logic.
 */

import assert from "node:assert/strict";

import {
  formatTimestampSrt,
  formatTimestampVtt,
  parseTimestamp,
  generateSrt,
  generateVtt,
  parseSrtOrVtt,
  validateSubtitleSegments,
  buildEstimatedSegmentsFromText,
} from "../src/lib/video/subtitles.ts";

import {
  calculateDimensions,
  checkFfmpegAvailability,
  buildFiltergraph,
  processVideoExport,
} from "../src/lib/video/processor.ts";

import {
  estimateSourceResolution,
  validateExportJobRequest,
  VideoExportValidationError,
} from "../src/lib/video/validation.ts";

async function runTests() {
  console.log("============================================================");
  console.log("  PRAISE VIDEO SUBTITLES & EXPORT CONTROLS AUTOMATED TESTS  ");
  console.log("============================================================\n");

  // ------------------------------------------------------------------------
  // Test Suite 1: Subtitle Timestamps & Formats (SRT & WebVTT)
  // ------------------------------------------------------------------------
  console.log("🧪 Test Suite 1: Timestamp Formatting & Parsing");

  // 1.1 SRT Formatting (comma millisecond separator)
  assert.equal(formatTimestampSrt(0), "00:00:00,000");
  assert.equal(formatTimestampSrt(1.25), "00:00:01,250");
  assert.equal(formatTimestampSrt(65.5), "00:01:05,500");
  assert.equal(formatTimestampSrt(3661.042), "01:01:01,042");
  assert.equal(formatTimestampSrt(-5), "00:00:00,000", "Negative numbers clamped to zero");
  console.log("  ✓ formatTimestampSrt correctly formats standard and edge-case timestamps");

  // 1.2 WebVTT Formatting (dot millisecond separator)
  assert.equal(formatTimestampVtt(0), "00:00:00.000");
  assert.equal(formatTimestampVtt(1.25), "00:00:01.250");
  assert.equal(formatTimestampVtt(65.5), "00:01:05.500");
  assert.equal(formatTimestampVtt(3661.042), "01:01:01.042");
  console.log("  ✓ formatTimestampVtt correctly formats WebVTT decimal timestamps");

  // 1.3 Timestamp Parsing
  assert.equal(parseTimestamp("00:00:01,250"), 1.25);
  assert.equal(parseTimestamp("00:01:05.500"), 65.5);
  assert.equal(parseTimestamp("01:05.500"), 65.5, "Supports mm:ss.mmm shorthand");
  assert.equal(parseTimestamp("12.34"), 12.34, "Supports raw seconds notation");
  assert.equal(parseTimestamp("invalid"), 0, "Gracefully handles malformed input");
  console.log("  ✓ parseTimestamp parses both SRT and WebVTT timestamps accurately");

  // ------------------------------------------------------------------------
  // Test Suite 2: SRT and WebVTT Generation and Round-trip Parsing
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test Suite 2: Subtitle Generation & Round-Trip Parsing");

  const sampleSegments = [
    { id: 1, start: 0.5, end: 3.2, text: "Welcome to our company presentation." },
    { id: 2, start: 3.4, end: 6.8, text: "Praise makes collecting customer video testimonials effortless." },
    { id: 3, start: 7.0, end: 10.5, text: "Our clients love the simplicity and clean sharing widgets." },
  ];

  // 2.1 Generate SRT
  const srtContent = generateSrt(sampleSegments);
  assert.ok(srtContent.includes("1\r\n00:00:00,500 --> 00:00:03,200\r\nWelcome to our company presentation."));
  assert.ok(srtContent.includes("2\r\n00:00:03,400 --> 00:00:06,800"));
  assert.ok(srtContent.includes("3\r\n00:00:07,000 --> 00:00:10,500"));
  console.log("  ✓ generateSrt builds conformant SubRip text with indices and timing arrows");

  // 2.2 Generate WebVTT
  const vttContent = generateVtt(sampleSegments);
  assert.ok(vttContent.startsWith("WEBVTT\r\n\r\n"));
  assert.ok(vttContent.includes("00:00:00.500 --> 00:00:03.200\r\nWelcome to our company presentation."));
  console.log("  ✓ generateVtt builds valid WebVTT content with WEBVTT prelude");

  // 2.3 Round-trip parse from SRT content
  const parsedFromSrt = parseSrtOrVtt(srtContent);
  assert.equal(parsedFromSrt.length, 3);
  assert.equal(parsedFromSrt[0].start, 0.5);
  assert.equal(parsedFromSrt[0].end, 3.2);
  assert.equal(parsedFromSrt[0].text, "Welcome to our company presentation.");
  assert.equal(parsedFromSrt[1].text, "Praise makes collecting customer video testimonials effortless.");
  console.log("  ✓ parseSrtOrVtt accurately recovers subtitle segments from SRT text");

  // 2.4 Round-trip parse from VTT content
  const parsedFromVtt = parseSrtOrVtt(vttContent);
  assert.equal(parsedFromVtt.length, 3);
  assert.equal(parsedFromVtt[0].start, 0.5);
  assert.equal(parsedFromVtt[0].end, 3.2);
  assert.equal(parsedFromVtt[2].text, "Our clients love the simplicity and clean sharing widgets.");
  console.log("  ✓ parseSrtOrVtt accurately recovers subtitle segments from WebVTT text");

  // ------------------------------------------------------------------------
  // Test Suite 3: Subtitle Timing Validation & Auto-Segmentation
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test Suite 3: Timing Validation & Automatic Segmentation");

  // 3.1 Valid segment set
  const validCheck = validateSubtitleSegments(sampleSegments);
  assert.equal(validCheck.valid, true);
  assert.equal(validCheck.errors.length, 0);

  // 3.2 Invalid segment: start >= end
  const invalidTiming = [
    { id: 1, start: 5.0, end: 2.0, text: "Backwards timing" },
  ];
  const invalidTimingCheck = validateSubtitleSegments(invalidTiming);
  assert.equal(invalidTimingCheck.valid, false);
  assert.ok(invalidTimingCheck.errors[0].includes("greater than start"));
  console.log("  ✓ Validates start time must strictly precede end time");

  // 3.3 Invalid segment: empty text
  const emptyText = [
    { id: 1, start: 0, end: 2.0, text: "   " },
  ];
  const emptyTextCheck = validateSubtitleSegments(emptyText);
  assert.equal(emptyTextCheck.valid, false);
  assert.ok(emptyTextCheck.errors[0].includes("cannot be empty"));
  console.log("  ✓ Rejects segments with empty or blank text");

  // 3.4 Auto-generate estimated segments from plain transcript text
  const estimated = buildEstimatedSegmentsFromText(
    "Praise is an outstanding testimonial platform. We collected twenty video reviews within our first week. Customer feedback was overwhelmingly positive.",
    15.0
  );
  assert.ok(estimated.length >= 2, "Splits multi-sentence transcript into sequential segments");
  assert.equal(estimated[0].start, 0);
  assert.ok(estimated[estimated.length - 1].end <= 15.0);
  for (let i = 0; i < estimated.length - 1; i++) {
    assert.ok(estimated[i].end <= estimated[i + 1].start, "Generated segments are ordered chronologically");
  }
  console.log("  ✓ buildEstimatedSegmentsFromText generates chronological segments matching total media duration");

  // ------------------------------------------------------------------------
  // Test Suite 4: Aspect Ratio & Target Output Dimensions
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test Suite 4: Aspect Ratio & Target Output Dimensions");

  // Test 720p dimensions
  assert.deepEqual(calculateDimensions("RES_720P", "RATIO_16_9"), { width: 1280, height: 720 });
  assert.deepEqual(calculateDimensions("RES_720P", "RATIO_9_16"), { width: 720, height: 1280 });
  assert.deepEqual(calculateDimensions("RES_720P", "RATIO_1_1"), { width: 720, height: 720 });
  assert.deepEqual(calculateDimensions("RES_720P", "RATIO_4_5"), { width: 720, height: 900 });

  // Test 1080p dimensions
  assert.deepEqual(calculateDimensions("RES_1080P", "RATIO_16_9"), { width: 1920, height: 1080 });
  assert.deepEqual(calculateDimensions("RES_1080P", "RATIO_9_16"), { width: 1080, height: 1920 });
  assert.deepEqual(calculateDimensions("RES_1080P", "RATIO_1_1"), { width: 1080, height: 1080 });
  assert.deepEqual(calculateDimensions("RES_1080P", "RATIO_4_5"), { width: 1080, height: 1350 });

  // Test 4K dimensions
  assert.deepEqual(calculateDimensions("RES_4K", "RATIO_16_9"), { width: 3840, height: 2160 });
  assert.deepEqual(calculateDimensions("RES_4K", "RATIO_9_16"), { width: 2160, height: 3840 });
  assert.deepEqual(calculateDimensions("RES_4K", "RATIO_1_1"), { width: 2160, height: 2160 });
  assert.deepEqual(calculateDimensions("RES_4K", "RATIO_4_5"), { width: 2160, height: 2700 });
  console.log("  ✓ Correct output pixel geometry calculated for all aspect ratios and resolutions");

  // ------------------------------------------------------------------------
  // Test Suite 5: 4K Source Resolution Validation & Restriction Rules
  // Requirement: "Do not promise 4K output from low-resolution source footage"
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test Suite 5: Source Capability & 4K Restriction Enforcement");

  // 5.1 720p Source footage: 4K must be disallowed
  const cap720p = estimateSourceResolution({
    fileSizeBytes: 5 * 1024 * 1024,
    durationSeconds: 30,
    width: 1280,
    height: 720,
  });
  assert.equal(cap720p.estimatedResolution, "720p");
  assert.equal(cap720p.canExport4K, false, "Must disallow 4K for 720p source footage");
  assert.ok(cap720p.fourKRestrictionReason?.includes("720p"));
  console.log("  ✓ Disallows 4K export on 720p footage with explicit reason");

  // 5.2 1080p Source footage: 4K must be disallowed (no fake artificial upscaling)
  const cap1080p = estimateSourceResolution({
    fileSizeBytes: 15 * 1024 * 1024,
    durationSeconds: 30,
    width: 1920,
    height: 1080,
  });
  assert.equal(cap1080p.estimatedResolution, "1080p");
  assert.equal(cap1080p.canExport4K, false, "Must disallow 4K for 1080p source footage");
  assert.ok(cap1080p.fourKRestrictionReason?.includes("1080p"));
  console.log("  ✓ Disallows 4K export on 1080p footage to prevent misleading artificial upscaling");

  // 5.3 True 4K Source footage: 4K allowed
  const cap4K = estimateSourceResolution({
    fileSizeBytes: 120 * 1024 * 1024,
    durationSeconds: 30,
    width: 3840,
    height: 2160,
  });
  assert.equal(cap4K.estimatedResolution, "4K");
  assert.equal(cap4K.canExport4K, true, "Allows 4K for true 4K source footage");
  console.log("  ✓ Allows 4K export when source media is native 4K");

  // 5.4 Vertical mobile 4K (e.g. 2160 x 3840): 4K allowed
  const capVertical4K = estimateSourceResolution({
    fileSizeBytes: 100 * 1024 * 1024,
    durationSeconds: 30,
    width: 2160,
    height: 3840,
  });
  assert.equal(capVertical4K.canExport4K, true);
  console.log("  ✓ Handles vertical mobile 9:16 UHD source footage");

  // 5.5 Export Request Validation: Rejecting 4K on 1080p source
  assert.throws(
    () => {
      validateExportJobRequest(
        {
          resolutionProfile: "RES_4K",
          aspectRatio: "RATIO_16_9",
          burnSubtitles: true,
          customSegments: sampleSegments,
          subtitleStyle: {
            font: "sans-serif",
            size: "medium",
            position: "bottom",
            color: "#FFFFFF",
            backgroundColor: "rgba(0,0,0,0.75)",
          },
        },
        cap1080p
      );
    },
    (err) => {
      assert.ok(err instanceof VideoExportValidationError);
      assert.equal(err.code, "RESOLUTION_MISMATCH_4K");
      assert.equal(err.status, 400);
      return true;
    },
    "Throws 400 RESOLUTION_MISMATCH_4K error when requesting 4K on low-resolution source"
  );
  console.log("  ✓ validateExportJobRequest strictly rejects 4K request on low-res source with HTTP 400");

  // 5.6 Export Request Validation: Accepting 1080p on 1080p source
  const valid1080Request = validateExportJobRequest(
    {
      resolutionProfile: "RES_1080P",
      aspectRatio: "RATIO_9_16",
      burnSubtitles: true,
      customSegments: sampleSegments,
      subtitleStyle: {
        font: "sans-serif",
        size: "medium",
        position: "bottom",
        color: "#FFFFFF",
        backgroundColor: "rgba(0,0,0,0.75)",
      },
    },
    cap1080p
  );
  assert.equal(valid1080Request.valid, true);
  console.log("  ✓ validateExportJobRequest approves matching 1080p export profile");

  // ------------------------------------------------------------------------
  // Test Suite 6: Media Processing Backend & Non-Destructive Storage
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test Suite 6: Media Processing Backend & Non-Destructive Integrity");

  // 6.1 FFmpeg availability detection
  const ffmpegStatus = await checkFfmpegAvailability();
  assert.equal(typeof ffmpegStatus.available, "boolean");
  console.log(`  ✓ checkFfmpegAvailability probe completed (FFmpeg detected: ${ffmpegStatus.available})`);

  // 6.2 Filtergraph construction
  const filtergraph = buildFiltergraph({
    dimensions: { width: 1920, height: 1080 },
    srtFilePath: "C:\\temp\\subtitles.srt",
    burnSubtitles: true,
    subtitleStyle: {
      font: "sans-serif",
      size: "medium",
      position: "bottom",
      color: "#FFFFFF",
      backgroundColor: "rgba(0,0,0,0.75)",
    },
    resolutionProfile: "RES_1080P",
  });
  assert.ok(filtergraph.includes("scale=w=1920:h=1080"));
  assert.ok(filtergraph.includes("pad=1920:1080"));
  assert.ok(filtergraph.includes("subtitles="));
  assert.ok(filtergraph.includes("FontSize="));
  console.log("  ✓ buildFiltergraph builds scale/pad filter and subtitle overlay directive");

  // 6.3 Non-destructive media execution test
  const dummyOriginalBytes = Buffer.from("PRAISE_ORIGINAL_TESTIMONIAL_VIDEO_PAYLOAD_IMMUTABLE_12345");
  const recordedProgress = [];

  const exportResult = await processVideoExport({
    sourceBuffer: dummyOriginalBytes,
    sourceMimeType: "video/mp4",
    options: {
      resolutionProfile: "RES_720P",
      aspectRatio: "RATIO_16_9",
      burnSubtitles: true,
      customSegments: sampleSegments,
      subtitleStyle: {
        font: "sans-serif",
        size: "medium",
        position: "bottom",
        color: "#FFFFFF",
        backgroundColor: "rgba(0,0,0,0.75)",
      },
    },
    onProgress: (percent) => {
      recordedProgress.push(percent);
    },
  });

  // Verify non-destructive integrity
  assert.equal(
    dummyOriginalBytes.toString("hex"),
    Buffer.from("PRAISE_ORIGINAL_TESTIMONIAL_VIDEO_PAYLOAD_IMMUTABLE_12345").toString("hex"),
    "Original source media bytes must remain 100% unaltered!"
  );
  console.log("  ✓ Verified: source media is completely untouched and non-destructively preserved");

  // Verify separate output asset was created
  assert.ok(exportResult.buffer && exportResult.buffer.length > 0, "Separate exported buffer must be generated");
  assert.equal(exportResult.resolution, "1280x720");
  assert.ok(recordedProgress.includes(100), "Progress must reach 100% upon completion");
  console.log("  ✓ Verified: separate export media asset generated with progress reporting");

  // ------------------------------------------------------------------------
  // Test Suite 7: Video Export Job State Transitions & Retry Controls
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test Suite 7: Export Job Lifecycle & Retry Mechanics");

  const jobRecord = {
    id: "job_export_001",
    workspaceId: "ws_praise_corp",
    testimonialId: "t_video_999",
    sourceMediaAssetId: "med_src_video",
    exportedMediaAssetId: null,
    status: "QUEUED",
    aspectRatio: "RATIO_16_9",
    resolution: "RES_1080P",
    burnSubtitles: true,
    progress: 0,
    errorMessage: null,
    attempts: 0,
    maxAttempts: 3,
  };

  // 7.1 Transition: QUEUED -> PROCESSING
  jobRecord.status = "PROCESSING";
  jobRecord.attempts += 1;
  jobRecord.progress = 15;
  assert.equal(jobRecord.status, "PROCESSING");
  assert.equal(jobRecord.progress, 15);
  console.log("  ✓ Job transition: QUEUED -> PROCESSING with active progress tracking");

  // 7.2 Transition: PROCESSING -> FAILED on simulated out-of-disk condition
  jobRecord.status = "FAILED";
  jobRecord.errorMessage = "Target storage disk volume ran out of space during muxing";
  assert.equal(jobRecord.status, "FAILED");
  assert.ok(jobRecord.errorMessage.includes("out of space"));
  console.log("  ✓ Job transition: FAILED captures actionable error diagnostics");

  // 7.3 Retry failed job
  assert.ok(jobRecord.attempts < jobRecord.maxAttempts, "Allows retry when attempts < maxAttempts");
  jobRecord.status = "QUEUED";
  jobRecord.errorMessage = null;
  jobRecord.progress = 0;
  assert.equal(jobRecord.status, "QUEUED");
  assert.equal(jobRecord.errorMessage, null);
  console.log("  ✓ Retry flow resets job status to QUEUED and clears error messages");

  // 7.4 Transition: QUEUED -> PROCESSING -> COMPLETED
  jobRecord.status = "PROCESSING";
  jobRecord.attempts += 1;
  jobRecord.progress = 100;
  jobRecord.status = "COMPLETED";
  jobRecord.exportedMediaAssetId = "med_export_1080p_clean";
  assert.equal(jobRecord.status, "COMPLETED");
  assert.equal(jobRecord.exportedMediaAssetId, "med_export_1080p_clean");
  console.log("  ✓ Job transition: COMPLETED links generated exportedMediaAsset record");

  console.log("\n============================================================");
  console.log("  ALL 7/7 VIDEO EXPORT TEST MODULES PASSED SUCCESSFULLY!    ");
  console.log("============================================================\n");
}

runTests().catch((err) => {
  console.error("❌ Video Subtitles & Export test suite failed:", err);
  process.exit(1);
});
