import { prisma } from "@/lib/db/client";
import { getStorageEngine } from "@/lib/storage/engine";
import { getTranscriptionProvider } from "./registry";
import { TranscriptionStatus } from "@prisma/client";

export interface CreateTranscriptionJobInput {
  workspaceId: string;
  mediaAssetId: string;
  testimonialId?: string | null;
  providerName?: string;
}

/**
 * Creates or resets a transcription job record in PENDING status.
 */
export async function createTranscriptionJob({
  workspaceId,
  mediaAssetId,
  testimonialId = null,
  providerName,
}: CreateTranscriptionJobInput) {
  const provider = getTranscriptionProvider(providerName);

  const existing = await prisma.mediaTranscription.findUnique({
    where: { mediaAssetId },
  });

  if (existing) {
    return prisma.mediaTranscription.update({
      where: { id: existing.id },
      data: {
        workspaceId,
        testimonialId: testimonialId || existing.testimonialId,
        provider: provider.name,
        status: TranscriptionStatus.PENDING,
        errorMessage: null,
      },
    });
  }

  return prisma.mediaTranscription.create({
    data: {
      workspaceId,
      mediaAssetId,
      testimonialId,
      provider: provider.name,
      status: TranscriptionStatus.PENDING,
    },
  });
}

/**
 * Executes transcription processing for a specific job.
 * Note: Reads original media non-destructively; never overwrites or alters original assets.
 */
export async function processTranscriptionJob(transcriptionId: string) {
  const job = await prisma.mediaTranscription.findUnique({
    where: { id: transcriptionId },
    include: {
      mediaAsset: true,
    },
  });

  if (!job || !job.mediaAsset) {
    throw new Error(`Transcription job or media asset not found for ID ${transcriptionId}`);
  }

  // Check attempt threshold
  if (job.attempts >= job.maxAttempts) {
    await prisma.mediaTranscription.update({
      where: { id: transcriptionId },
      data: {
        status: TranscriptionStatus.FAILED,
        errorMessage: `Maximum retry attempts (${job.maxAttempts}) reached.`,
      },
    });
    return;
  }

  // Update status to PROCESSING
  await prisma.mediaTranscription.update({
    where: { id: transcriptionId },
    data: {
      status: TranscriptionStatus.PROCESSING,
      startedAt: new Date(),
      errorMessage: null,
      attempts: { increment: 1 },
    },
  });

  try {
    const asset = job.mediaAsset;
    if (!asset.localPath) {
      throw new Error("Media asset does not have a valid storage key.");
    }

    // Non-destructive read from storage engine
    const engine = getStorageEngine();
    const fileResult = await engine.read(asset.localPath);
    if (!fileResult || !fileResult.buffer) {
      throw new Error(`Media file not found at storage path: ${asset.localPath}`);
    }

    const provider = getTranscriptionProvider(job.provider);
    const filename = `media-${asset.id}.${asset.mimeType.includes("mp4") ? "mp4" : asset.mimeType.includes("wav") ? "wav" : asset.mimeType.includes("mp3") ? "mp3" : "webm"}`;

    const result = await provider.transcribe(
      fileResult.buffer,
      asset.mimeType,
      filename,
    );

    // Persist completed transcript and detected language
    await prisma.mediaTranscription.update({
      where: { id: transcriptionId },
      data: {
        status: TranscriptionStatus.COMPLETED,
        text: result.text,
        rawText: result.text,
        language: result.language || null,
        confidence: result.confidence ?? null,
        durationSeconds: result.durationSeconds ?? asset.durationSeconds ?? null,
        metadataJson: result.rawMetadata
          ? JSON.stringify(result.rawMetadata)
          : result.segments
          ? JSON.stringify({ segments: result.segments })
          : null,
        completedAt: new Date(),
        errorMessage: null,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error during transcription.";

    await prisma.mediaTranscription.update({
      where: { id: transcriptionId },
      data: {
        status: TranscriptionStatus.FAILED,
        errorMessage: message,
      },
    });
  }
}

/**
 * Triggers background media transcription for an uploaded video or audio testimonial.
 * Does not block public form submission.
 */
export async function triggerMediaTranscription(
  testimonialId: string,
  mediaAssetId: string,
  workspaceId: string,
) {
  try {
    const job = await createTranscriptionJob({
      workspaceId,
      mediaAssetId,
      testimonialId,
    });

    // Fire and forget in the background
    void processTranscriptionJob(job.id).catch((err) => {
      console.error(`[Transcription Background Worker] Error in job ${job.id}:`, err);
    });

    return job;
  } catch (err) {
    console.error("[Transcription] Failed to initialize transcription job:", err);
    return null;
  }
}

/**
 * Retries a failed transcription job.
 */
export async function retryTranscriptionJob(
  transcriptionId: string,
  workspaceId: string,
) {
  const job = await prisma.mediaTranscription.findFirst({
    where: {
      id: transcriptionId,
      workspaceId,
    },
  });

  if (!job) {
    throw new Error("Transcription job not found or does not belong to this workspace.");
  }

  // Reset status to PENDING and clear previous error
  await prisma.mediaTranscription.update({
    where: { id: transcriptionId },
    data: {
      status: TranscriptionStatus.PENDING,
      errorMessage: null,
    },
  });

  // Launch execution asynchronously
  void processTranscriptionJob(job.id).catch((err) => {
    console.error(`[Transcription Retry] Error in job ${job.id}:`, err);
  });

  return job;
}

/**
 * Allows authorized users to manually correct or supply transcript text.
 */
export async function updateManualTranscript(
  transcriptionId: string,
  workspaceId: string,
  text: string,
  language?: string,
  userId?: string,
) {
  const job = await prisma.mediaTranscription.findFirst({
    where: {
      id: transcriptionId,
      workspaceId,
    },
  });

  if (!job) {
    throw new Error("Transcription job not found or does not belong to this workspace.");
  }

  const updated = await prisma.mediaTranscription.update({
    where: { id: transcriptionId },
    data: {
      text: text.trim(),
      language: language?.trim() || job.language,
      status: TranscriptionStatus.COMPLETED,
      isEdited: true,
      editedAt: new Date(),
      editedByUserId: userId || null,
      errorMessage: null,
    },
  });

  return updated;
}
