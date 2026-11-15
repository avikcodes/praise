export type SubtitleSegment = {
  id: number;
  start: number; // In seconds (e.g. 1.250)
  end: number;   // In seconds (e.g. 4.500)
  text: string;
};

/**
 * Formats a timestamp in seconds to SRT format (00:00:01,250)
 */
export function formatTimestampSrt(seconds: number): string {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalMillis = Math.round(safeSeconds * 1000);
  const hrs = Math.floor(totalMillis / 3600000);
  const mins = Math.floor((totalMillis % 3600000) / 60000);
  const secs = Math.floor((totalMillis % 60000) / 1000);
  const millis = totalMillis % 1000;

  const hh = String(hrs).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const ms = String(millis).padStart(3, "0");

  return `${hh}:${mm}:${ss},${ms}`;
}

/**
 * Formats a timestamp in seconds to WebVTT format (00:00:01.250)
 */
export function formatTimestampVtt(seconds: number): string {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalMillis = Math.round(safeSeconds * 1000);
  const hrs = Math.floor(totalMillis / 3600000);
  const mins = Math.floor((totalMillis % 3600000) / 60000);
  const secs = Math.floor((totalMillis % 60000) / 1000);
  const millis = totalMillis % 1000;

  const hh = String(hrs).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const ms = String(millis).padStart(3, "0");

  return `${hh}:${mm}:${ss}.${ms}`;
}

/**
 * Parses an SRT or VTT timestamp string into seconds as a float.
 * Accepts: "00:01:23,450", "00:01:23.450", "01:23.450", or "83.45"
 */
export function parseTimestamp(timestamp: string): number {
  if (typeof timestamp !== "string") return 0;
  const clean = timestamp.trim().replace(",", ".");

  if (!clean.includes(":")) {
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : Math.max(0, val);
  }

  const parts = clean.split(":");
  let hrs = 0;
  let mins = 0;
  let secs = 0;

  if (parts.length === 3) {
    hrs = parseFloat(parts[0]) || 0;
    mins = parseFloat(parts[1]) || 0;
    secs = parseFloat(parts[2]) || 0;
  } else if (parts.length === 2) {
    mins = parseFloat(parts[0]) || 0;
    secs = parseFloat(parts[1]) || 0;
  }

  const total = hrs * 3600 + mins * 60 + secs;
  return Math.max(0, parseFloat(total.toFixed(3)));
}

/**
 * Generates SubRip (.srt) subtitle file content from segments.
 */
export function generateSrt(segments: SubtitleSegment[]): string {
  if (!Array.isArray(segments) || segments.length === 0) {
    return "";
  }

  const sorted = [...segments].sort((a, b) => a.start - b.start);

  return sorted
    .map((seg, idx) => {
      const index = idx + 1;
      const startStr = formatTimestampSrt(seg.start);
      const endStr = formatTimestampSrt(seg.end);
      const cleanText = (seg.text || "").trim();

      return `${index}\r\n${startStr} --> ${endStr}\r\n${cleanText}`;
    })
    .join("\r\n\r\n")
    .concat("\r\n");
}

/**
 * Generates WebVTT (.vtt) subtitle file content from segments.
 */
export function generateVtt(segments: SubtitleSegment[]): string {
  if (!Array.isArray(segments) || segments.length === 0) {
    return "WEBVTT\r\n\r\n";
  }

  const sorted = [...segments].sort((a, b) => a.start - b.start);

  const body = sorted
    .map((seg, idx) => {
      const index = idx + 1;
      const startStr = formatTimestampVtt(seg.start);
      const endStr = formatTimestampVtt(seg.end);
      const cleanText = (seg.text || "").trim();

      return `${index}\r\n${startStr} --> ${endStr}\r\n${cleanText}`;
    })
    .join("\r\n\r\n");

  return `WEBVTT\r\n\r\n${body}\r\n`;
}

/**
 * Parses raw SRT or WebVTT string into structured subtitle segments.
 */
export function parseSrtOrVtt(content: string): SubtitleSegment[] {
  if (!content || typeof content !== "string") {
    return [];
  }

  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const segments: SubtitleSegment[] = [];

  let currentStart = -1;
  let currentEnd = -1;
  let textLines: string[] = [];
  let currentId = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip WEBVTT header line
    if (line.startsWith("WEBVTT") || line.startsWith("NOTE")) {
      continue;
    }

    // Check for timestamp separator "-->"
    if (line.includes("-->")) {
      // Flush previous segment if any
      if (currentStart >= 0 && currentEnd >= 0 && textLines.length > 0) {
        segments.push({
          id: currentId++,
          start: currentStart,
          end: currentEnd,
          text: textLines.join(" ").trim(),
        });
        textLines = [];
      }

      const [startPart, endPart] = line.split("-->").map((s) => s.trim());
      // Strip any extra VTT positioning cues e.g. "align:start position:50%"
      const cleanEndPart = (endPart || "").split(/\s+/)[0];

      currentStart = parseTimestamp(startPart);
      currentEnd = parseTimestamp(cleanEndPart);
    } else if (line && !/^\d+$/.test(line)) {
      // Text line
      if (currentStart >= 0) {
        textLines.push(line);
      }
    } else if (!line && currentStart >= 0 && textLines.length > 0) {
      // Blank separator line - end of block
      segments.push({
        id: currentId++,
        start: currentStart,
        end: currentEnd,
        text: textLines.join(" ").trim(),
      });
      currentStart = -1;
      currentEnd = -1;
      textLines = [];
    }
  }

  // Flush tail segment
  if (currentStart >= 0 && currentEnd >= 0 && textLines.length > 0) {
    segments.push({
      id: currentId++,
      start: currentStart,
      end: currentEnd,
      text: textLines.join(" ").trim(),
    });
  }

  return segments;
}

/**
 * Validates a list of subtitle segments for correctness.
 */
export function validateSubtitleSegments(segments: SubtitleSegment[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(segments) || segments.length === 0) {
    return { valid: false, errors: ["At least one subtitle segment is required."] };
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const num = i + 1;

    if (typeof seg.start !== "number" || isNaN(seg.start) || seg.start < 0) {
      errors.push(`Segment #${num}: Start timestamp must be a non-negative number.`);
    }

    if (typeof seg.end !== "number" || isNaN(seg.end) || seg.end <= seg.start) {
      errors.push(`Segment #${num}: End timestamp must be greater than start timestamp.`);
    }

    if (typeof seg.text !== "string" || !seg.text.trim()) {
      errors.push(`Segment #${num}: Subtitle text cannot be empty.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Auto-generates estimated timed segments from raw text and total video duration
 * when Whisper timestamps are unavailable or when transcript was manually authored.
 */
export function buildEstimatedSegmentsFromText(
  fullText: string,
  totalDurationSeconds = 30,
): SubtitleSegment[] {
  const clean = (fullText || "").trim();
  if (!clean) return [];

  // Split into sentence or clause fragments (max ~8 words each for readability)
  const sentences = clean
    .split(/(?<=[.?!])\s+/)
    .flatMap((s) => {
      const words = s.split(/\s+/);
      if (words.length <= 10) return [s];
      // Chunk long sentences into halves
      const mid = Math.ceil(words.length / 2);
      return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
    })
    .filter((s) => s.trim().length > 0);

  if (sentences.length === 0) return [];

  const durationPerSegment = Math.max(
    1.5,
    Math.min(6.0, totalDurationSeconds / sentences.length),
  );

  return sentences.map((text, idx) => {
    const start = parseFloat((idx * durationPerSegment).toFixed(2));
    const end = parseFloat(
      Math.min(totalDurationSeconds, (idx + 1) * durationPerSegment).toFixed(2),
    );

    return {
      id: idx + 1,
      start,
      end: Math.max(start + 0.5, end),
      text: text.trim(),
    };
  });
}
