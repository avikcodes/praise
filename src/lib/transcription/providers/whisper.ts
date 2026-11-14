import type {
  TranscriptionProvider,
  TranscriptionResult,
  TranscriptionOptions,
} from "../types";

export interface WhisperProviderConfig {
  apiUrl?: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

/**
 * Self-hosted Whisper-compatible transcription provider.
 * Works seamlessly with:
 * - Self-hosted Faster-Whisper server (e.g. fedirz/faster-whisper-server)
 * - Whisper.cpp HTTP server
 * - LocalAI whisper endpoint
 * - OpenAI / Azure OpenAI Whisper API
 */
export class WhisperCompatibleProvider implements TranscriptionProvider {
  readonly name = "whisper";
  private config: WhisperProviderConfig;

  constructor(config?: WhisperProviderConfig) {
    this.config = {
      apiUrl:
        config?.apiUrl ||
        process.env.WHISPER_API_URL ||
        (process.env.OPENAI_API_KEY
          ? "https://api.openai.com/v1/audio/transcriptions"
          : undefined),
      apiKey: config?.apiKey || process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY,
      model: config?.model || process.env.WHISPER_MODEL || "whisper-1",
      timeoutMs:
        config?.timeoutMs ||
        parseInt(process.env.WHISPER_TIMEOUT_MS || "60000", 10),
    };
  }

  isAvailable(): boolean {
    return Boolean(this.config.apiUrl);
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    filename = "media-audio.webm",
    options?: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    const endpoint = this.config.apiUrl;
    if (!endpoint) {
      throw new Error(
        "Whisper API URL is not configured. Set WHISPER_API_URL in environment or select a fallback provider.",
      );
    }

    // Build standard multipart/form-data payload compatible with Whisper HTTP API
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", blob, filename);
    formData.append("model", this.config.model || "whisper-1");
    formData.append("response_format", "verbose_json");

    if (options?.language || process.env.WHISPER_LANGUAGE) {
      formData.append(
        "language",
        options?.language || process.env.WHISPER_LANGUAGE || "",
      );
    }

    if (options?.prompt) {
      formData.append("prompt", options.prompt);
    }

    if (typeof options?.temperature === "number") {
      formData.append("temperature", options.temperature.toString());
    }

    const headers: Record<string, string> = {};
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorDetail = "";
        try {
          const errorJson = await response.json();
          errorDetail =
            errorJson?.error?.message ||
            errorJson?.message ||
            JSON.stringify(errorJson);
        } catch {
          errorDetail = await response.text().catch(() => "");
        }

        throw new Error(
          `Whisper server returned HTTP ${response.status}: ${
            errorDetail || response.statusText
          }`,
        );
      }

      const json = await response.json();

      const text = (json.text || "").trim();
      const language = json.language || null;
      const durationSeconds =
        typeof json.duration === "number"
          ? Math.round(json.duration)
          : undefined;

      const segments = Array.isArray(json.segments)
        ? json.segments.map((s: { id?: number; start?: number; end?: number; text?: string }, idx: number) => ({
            id: typeof s.id === "number" ? s.id : idx,
            start: typeof s.start === "number" ? s.start : 0,
            end: typeof s.end === "number" ? s.end : 0,
            text: (s.text || "").trim(),
          }))
        : undefined;

      return {
        text,
        language,
        durationSeconds,
        confidence: typeof json.confidence === "number" ? json.confidence : null,
        segments,
        rawMetadata: json,
      };
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          throw new Error(
            `Whisper transcription timed out after ${this.config.timeoutMs}ms.`,
          );
        }
        throw new Error(`Whisper transcription failed: ${err.message}`);
      }
      throw new Error("Unknown error during Whisper transcription.");
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
