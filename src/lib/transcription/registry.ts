import type { TranscriptionProvider } from "./types";
import { WhisperCompatibleProvider } from "./providers/whisper";
import { MockTranscriptionProvider } from "./providers/mock";

const providerRegistry = new Map<string, TranscriptionProvider>();

// Register default built-in providers
providerRegistry.set("whisper", new WhisperCompatibleProvider());
providerRegistry.set("mock", new MockTranscriptionProvider());

/**
 * Registers a new or custom transcription provider into the runtime registry.
 */
export function registerTranscriptionProvider(provider: TranscriptionProvider): void {
  providerRegistry.set(provider.name.toLowerCase(), provider);
}

/**
 * Returns a configured transcription provider by name,
 * or determines the active provider from environment variables.
 */
export function getTranscriptionProvider(name?: string): TranscriptionProvider {
  const chosenName = (
    name ||
    process.env.TRANSCRIPTION_PROVIDER ||
    "auto"
  ).toLowerCase();

  if (chosenName !== "auto" && providerRegistry.has(chosenName)) {
    return providerRegistry.get(chosenName)!;
  }

  // Automatic provider resolution:
  // If Whisper is configured with an API URL or OpenAI key, use Whisper;
  // otherwise, fall back to the built-in mock/offline provider so external AI is not mandatory.
  const whisper = providerRegistry.get("whisper");
  if (whisper && whisper.isAvailable()) {
    return whisper;
  }

  return providerRegistry.get("mock") || new MockTranscriptionProvider();
}

/**
 * Lists all registered transcription providers.
 */
export function getAvailableProviders(): string[] {
  return Array.from(providerRegistry.keys());
}
