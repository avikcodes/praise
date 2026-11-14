export class TranscriptionError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "TranscriptionError";
    this.status = status;
  }
}

export type TranscriptionSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
};

export type TranscriptionResult = {
  text: string;
  language?: string | null;
  confidence?: number | null;
  durationSeconds?: number | null;
  segments?: TranscriptionSegment[];
  rawMetadata?: Record<string, unknown>;
};

export type TranscriptionOptions = {
  language?: string;
  prompt?: string;
  temperature?: number;
};

/**
 * Pluggable transcription provider interface.
 * Allows self-hosted Whisper, cloud AI, or local offline processors to be used
 * interchangeably without touching core testimonial code.
 */
export interface TranscriptionProvider {
  readonly name: string;
  transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    filename?: string,
    options?: TranscriptionOptions,
  ): Promise<TranscriptionResult>;
  isAvailable(): boolean;
}
