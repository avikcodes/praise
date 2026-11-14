import type {
  TranscriptionProvider,
  TranscriptionResult,
  TranscriptionOptions,
} from "../types";

export interface MockProviderOptions {
  shouldFail?: boolean;
  failureMessage?: string;
  defaultText?: string;
  detectedLanguage?: string;
}

/**
 * Built-in local mock/offline transcription provider.
 * Ensures Praise runs completely offline without any mandatory external AI service.
 */
export class MockTranscriptionProvider implements TranscriptionProvider {
  readonly name = "mock";
  private options: MockProviderOptions;

  constructor(options?: MockProviderOptions) {
    this.options = {
      shouldFail: options?.shouldFail ?? process.env.MOCK_TRANSCRIPTION_FAIL === "true",
      failureMessage:
        options?.failureMessage ||
        "Simulated transcription engine failure for retry testing.",
      defaultText:
        options?.defaultText ||
        "Thank you so much for the great experience. Praise has transformed how we collect and share customer testimonials seamlessly across our site.",
      detectedLanguage: options?.detectedLanguage || "en",
    };
  }

  isAvailable(): boolean {
    return true;
  }

  async transcribe(
    audioBuffer: Buffer,
    _mimeType: string,
    _filename?: string,
    options?: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    // Artificial small delay to simulate background task
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (this.options.shouldFail) {
      throw new Error(this.options.failureMessage);
    }

    const estimatedDuration = Math.max(5, Math.round(audioBuffer.length / 16000));
    const language = options?.language || this.options.detectedLanguage || "en";
    const text = this.options.defaultText!;

    return {
      text,
      language,
      durationSeconds: estimatedDuration,
      confidence: 0.96,
      segments: [
        {
          id: 0,
          start: 0,
          end: Math.min(3, estimatedDuration),
          text: "Thank you so much for the great experience.",
        },
        {
          id: 1,
          start: Math.min(3, estimatedDuration),
          end: estimatedDuration,
          text: "Praise has transformed how we collect and share customer testimonials seamlessly across our site.",
        },
      ],
      rawMetadata: {
        provider: "mock",
        simulated: true,
        bufferSize: audioBuffer.length,
      },
    };
  }
}
