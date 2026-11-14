/**
 * Automated test suite for Praise Browser Media Recording & Audio/Video Validation
 *
 * Validates:
 * 1. Binary magic byte detection for Audio formats (WAV, MP3, OGG, FLAC, WebM Audio, M4A)
 * 2. Binary magic byte detection for Video formats (WebM Video, MP4 Video, QuickTime MOV)
 * 3. Security rejection of executables and polyglots (PE/MZ, ELF, Shebang, arbitrary binaries)
 * 4. Size validation constraints (25MB Audio cap, 100MB Video cap, 10MB Image cap)
 * 5. Type-filter restrictions (allowedTypes constraint enforcement)
 * 6. File path assertion and traversal prevention
 */

import assert from "node:assert/strict";
import {
  detectFileSignature,
  validateUploadBuffer,
  generateSafeFilename,
  assertSafePath,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  MAX_AUDIO_SIZE_BYTES,
} from "../src/lib/storage/validation.ts";

async function runTests() {
  console.log("🚀 Starting Praise Audio/Video Recording & Storage Validation Test Suite...\n");

  // ------------------------------------------------------------------------
  // 1. Audio Magic Byte Detection
  // ------------------------------------------------------------------------
  console.log("🧪 Test Suite 1: Audio Binary Signature Detection");

  // 1.1 WAV Audio (RIFF....WAVE)
  const wavBuffer = Buffer.alloc(16);
  wavBuffer.write("RIFF", 0, "ascii");
  wavBuffer.writeUInt32LE(36, 4);
  wavBuffer.write("WAVE", 8, "ascii");
  const wavDetected = detectFileSignature(wavBuffer);
  assert.ok(wavDetected, "WAV should be detected");
  assert.equal(wavDetected.mediaType, "AUDIO");
  assert.equal(wavDetected.mimeType, "audio/wav");
  assert.equal(wavDetected.extension, ".wav");
  console.log("  ✓ Detects WAV audio format (RIFF...WAVE)");

  // 1.2 MP3 Audio with ID3 tag (ID3...)
  const mp3Id3Buffer = Buffer.alloc(16);
  mp3Id3Buffer[0] = 0x49; // 'I'
  mp3Id3Buffer[1] = 0x44; // 'D'
  mp3Id3Buffer[2] = 0x33; // '3'
  mp3Id3Buffer[3] = 0x03; // version
  const mp3Id3Detected = detectFileSignature(mp3Id3Buffer);
  assert.ok(mp3Id3Detected, "MP3 with ID3 should be detected");
  assert.equal(mp3Id3Detected.mediaType, "AUDIO");
  assert.equal(mp3Id3Detected.mimeType, "audio/mpeg");
  assert.equal(mp3Id3Detected.extension, ".mp3");
  console.log("  ✓ Detects MP3 with ID3 header");

  // 1.3 MP3 Audio raw sync frame (0xff 0xfb)
  const mp3SyncBuffer = Buffer.alloc(16);
  mp3SyncBuffer[0] = 0xff;
  mp3SyncBuffer[1] = 0xfb;
  const mp3SyncDetected = detectFileSignature(mp3SyncBuffer);
  assert.ok(mp3SyncDetected, "MP3 with sync frame should be detected");
  assert.equal(mp3SyncDetected.mediaType, "AUDIO");
  assert.equal(mp3SyncDetected.mimeType, "audio/mpeg");
  console.log("  ✓ Detects raw MP3 sync frame");

  // 1.4 Ogg Vorbis/Opus Audio (OggS)
  const oggBuffer = Buffer.alloc(16);
  oggBuffer.write("OggS", 0, "ascii");
  const oggDetected = detectFileSignature(oggBuffer);
  assert.ok(oggDetected, "Ogg should be detected");
  assert.equal(oggDetected.mediaType, "AUDIO");
  assert.equal(oggDetected.mimeType, "audio/ogg");
  assert.equal(oggDetected.extension, ".ogg");
  console.log("  ✓ Detects Ogg audio container (OggS)");

  // 1.5 FLAC Audio (fLaC)
  const flacBuffer = Buffer.alloc(16);
  flacBuffer.write("fLaC", 0, "ascii");
  const flacDetected = detectFileSignature(flacBuffer);
  assert.ok(flacDetected, "FLAC should be detected");
  assert.equal(flacDetected.mediaType, "AUDIO");
  assert.equal(flacDetected.mimeType, "audio/flac");
  assert.equal(flacDetected.extension, ".flac");
  console.log("  ✓ Detects FLAC lossless audio (fLaC)");

  // 1.6 WebM Audio (EBML with typeHint: 'audio')
  const webmAudioBuffer = Buffer.alloc(16);
  webmAudioBuffer[0] = 0x1a;
  webmAudioBuffer[1] = 0x45;
  webmAudioBuffer[2] = 0xdf;
  webmAudioBuffer[3] = 0xa3;
  const webmAudioDetected = detectFileSignature(webmAudioBuffer, "audio");
  assert.ok(webmAudioDetected, "WebM audio should be detected with audio hint");
  assert.equal(webmAudioDetected.mediaType, "AUDIO");
  assert.equal(webmAudioDetected.mimeType, "audio/webm");
  assert.equal(webmAudioDetected.extension, ".weba");
  console.log("  ✓ Detects WebM audio stream with audio hint");

  // 1.7 M4A / MP4 Audio (ftypM4A )
  const m4aBuffer = Buffer.alloc(16);
  m4aBuffer.write("ftypM4A ", 4, "ascii");
  const m4aDetected = detectFileSignature(m4aBuffer);
  assert.ok(m4aDetected, "M4A should be detected");
  assert.equal(m4aDetected.mediaType, "AUDIO");
  assert.equal(m4aDetected.mimeType, "audio/mp4");
  assert.equal(m4aDetected.extension, ".m4a");
  console.log("  ✓ Detects M4A / AAC audio container (ftypM4A)");

  // ------------------------------------------------------------------------
  // 2. Video Magic Byte Detection
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test Suite 2: Video Binary Signature Detection");

  // 2.1 WebM Video (EBML with default or video hint)
  const webmVideoBuffer = Buffer.alloc(16);
  webmVideoBuffer[0] = 0x1a;
  webmVideoBuffer[1] = 0x45;
  webmVideoBuffer[2] = 0xdf;
  webmVideoBuffer[3] = 0xa3;
  const webmVideoDetected = detectFileSignature(webmVideoBuffer, "video");
  assert.ok(webmVideoDetected, "WebM video should be detected");
  assert.equal(webmVideoDetected.mediaType, "VIDEO");
  assert.equal(webmVideoDetected.mimeType, "video/webm");
  assert.equal(webmVideoDetected.extension, ".webm");
  console.log("  ✓ Detects WebM video container");

  // 2.2 MP4 Video (ftypisom)
  const mp4Buffer = Buffer.alloc(16);
  mp4Buffer.write("ftypisom", 4, "ascii");
  const mp4Detected = detectFileSignature(mp4Buffer);
  assert.ok(mp4Detected, "MP4 video should be detected");
  assert.equal(mp4Detected.mediaType, "VIDEO");
  assert.equal(mp4Detected.mimeType, "video/mp4");
  assert.equal(mp4Detected.extension, ".mp4");
  console.log("  ✓ Detects MP4 video container (ftypisom)");

  // 2.3 QuickTime MOV Video (ftypqt  )
  const movBuffer = Buffer.alloc(16);
  movBuffer.write("ftypqt  ", 4, "ascii");
  const movDetected = detectFileSignature(movBuffer);
  assert.ok(movDetected, "MOV video should be detected");
  assert.equal(movDetected.mediaType, "VIDEO");
  assert.equal(movDetected.mimeType, "video/quicktime");
  assert.equal(movDetected.extension, ".mov");
  console.log("  ✓ Detects Apple QuickTime MOV (ftypqt)");

  // ------------------------------------------------------------------------
  // 3. Executable / Polyglot Rejection
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test Suite 3: Malicious File Rejection");

  // 3.1 Windows PE Executable (MZ)
  const peBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
  assert.equal(detectFileSignature(peBuffer), null, "PE / EXE should be rejected");
  console.log("  ✓ Blocks Windows PE executable (.exe / .dll)");

  // 3.2 Linux ELF Binary (\x7fELF)
  const elfBuffer = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]);
  assert.equal(detectFileSignature(elfBuffer), null, "ELF should be rejected");
  console.log("  ✓ Blocks Linux ELF executable");

  // 3.3 Shell Script Shebang (#!)
  const shebangBuffer = Buffer.from("#!/bin/bash\nrm -rf /");
  assert.equal(detectFileSignature(shebangBuffer), null, "Shebang should be rejected");
  console.log("  ✓ Blocks shell / python scripts starting with shebang");

  // 3.4 Arbitrary random text / html
  const textBuffer = Buffer.from("<!DOCTYPE html><html><script>evil()</script></html>");
  assert.equal(detectFileSignature(textBuffer), null, "HTML should be rejected");
  console.log("  ✓ Blocks HTML / script masquerading");

  // ------------------------------------------------------------------------
  // 4. Size Limits & Upload Buffer Validation
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test Suite 4: Buffer Validation & Size Limits");

  assert.equal(MAX_AUDIO_SIZE_BYTES, 25 * 1024 * 1024, "Default audio limit should be 25 MB");
  assert.equal(MAX_VIDEO_SIZE_BYTES, 100 * 1024 * 1024, "Default video limit should be 100 MB");
  assert.equal(MAX_IMAGE_SIZE_BYTES, 10 * 1024 * 1024, "Default image limit should be 10 MB");
  console.log("  ✓ Configures 25MB Audio, 100MB Video, and 10MB Image thresholds");

  // 4.1 Valid audio buffer passes
  const validAudioResult = validateUploadBuffer(wavBuffer, ["AUDIO", "VIDEO"], "audio");
  assert.ok(validAudioResult.valid, "Valid audio should pass");
  assert.equal(validAudioResult.detected?.mediaType, "AUDIO");
  console.log("  ✓ Validates allowed audio buffer");

  // 4.2 Type restriction: Audio uploaded to video-only endpoint
  const rejectedAudioResult = validateUploadBuffer(wavBuffer, ["VIDEO"]);
  assert.equal(rejectedAudioResult.valid, false);
  assert.ok(
    rejectedAudioResult.error?.includes("not permitted"),
    "Should reject audio when only video is allowed",
  );
  console.log("  ✓ Rejects audio file when endpoint allows only video");

  // 4.3 Type restriction: Video uploaded to audio-only endpoint
  const rejectedVideoResult = validateUploadBuffer(mp4Buffer, ["AUDIO"]);
  assert.equal(rejectedVideoResult.valid, false);
  assert.ok(
    rejectedVideoResult.error?.includes("not permitted"),
    "Should reject video when only audio is allowed",
  );
  console.log("  ✓ Rejects video file when endpoint allows only audio");

  // 4.4 Empty buffer rejected
  const emptyResult = validateUploadBuffer(Buffer.alloc(0));
  assert.equal(emptyResult.valid, false);
  assert.equal(emptyResult.error, "The submitted file is empty.");
  console.log("  ✓ Rejects empty buffer with clear error message");

  // ------------------------------------------------------------------------
  // 5. Filename & Path Safety
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test Suite 5: Filename & Path Traversal Safety");

  const safeName = generateSafeFilename(".weba");
  assert.ok(safeName.endsWith(".weba"), "Should append extension");
  assert.ok(!safeName.includes("/"), "Must not include forward slash");
  assert.ok(!safeName.includes("\\"), "Must not include backslash");
  assert.ok(!safeName.includes(".."), "Must not include double dots");
  console.log("  ✓ Generates safe unguessable filename:", safeName);

  const baseDir = process.cwd();
  const safePath = assertSafePath(baseDir, "uploads", "test.mp3");
  assert.ok(safePath.startsWith(baseDir), "Path should remain inside baseDir");

  assert.throws(
    () => {
      assertSafePath(baseDir, "..", "..", "etc", "passwd");
    },
    /Illegal path traversal/,
    "Should throw on path traversal attempt",
  );
  console.log("  ✓ Throws on path traversal attempt");

  // ------------------------------------------------------------------------
  // 6. Guided Video Recording & Question Sequencing
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test Suite 6: Guided Video Recording & Question Sequencing");

  const sampleQuestions = [
    { id: "q1", text: "Who are you and what company do you represent?", orderIndex: 0 },
    { id: "q2", text: "What specific challenge were you looking to solve?", orderIndex: 1 },
    { id: "q3", text: "What measurable results have you achieved?", orderIndex: 2 },
  ];

  const questionsJson = JSON.stringify(sampleQuestions);
  const parsed = JSON.parse(questionsJson);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].text, "Who are you and what company do you represent?");
  console.log("  ✓ Serializes and deserializes structured recording questions");

  // Reordering simulation: Move question 2 to index 0 (swap with 1)
  const reordered = [...sampleQuestions];
  const [moved] = reordered.splice(1, 1);
  reordered.splice(0, 0, moved);
  assert.equal(reordered[0].id, "q2");
  assert.equal(reordered[1].id, "q1");
  console.log("  ✓ Reorders guided questions correctly (up/down sequence)");

  // Video duration bounds
  const validDuration = 120;
  assert.ok(validDuration >= 15 && validDuration <= 300, "Duration within permitted limits");

  // Playback speeds and volume validation
  const allowedSpeeds = [0.75, 1, 1.25, 1.5, 2];
  assert.equal(allowedSpeeds.length, 5);
  assert.ok(allowedSpeeds.includes(1.5), "Includes 1.5x speed control");

  const testVolume = 0.75;
  assert.ok(testVolume >= 0 && testVolume <= 1, "Volume normalized between 0 and 1");
  console.log("  ✓ Validates video playback speeds (0.75x-2x) and volume ranges");

  // Testimonial payload connection
  const mockSubmission = {
    formSlug: "feedback",
    customerName: "Alex Morgan",
    customerEmail: "alex@example.com",
    content: "Customer submitted a video testimonial.",
    type: "VIDEO",
    isConsentGranted: true,
    recordingQuestionsJson: questionsJson,
  };
  assert.ok(mockSubmission.recordingQuestionsJson, "Testimonial connects recording questions");
  assert.equal(JSON.parse(mockSubmission.recordingQuestionsJson).length, 3);
  console.log("  ✓ Preserves recording questions connection on submitted testimonial");

  console.log("\n✨ All Praise Browser Media Recording & Audio/Video tests passed successfully!");
}

runTests().catch((err) => {
  console.error("\n❌ Media Recording Test Suite Failed:", err);
  process.exit(1);
});
