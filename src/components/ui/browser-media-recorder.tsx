"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Lightbulb,
  Maximize2,
  Mic,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Square,
  SwitchCamera,
  Upload,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RecordedMediaResult = {
  blob: Blob;
  file: File;
  previewUrl: string;
  durationSeconds: number;
  type: "VIDEO" | "AUDIO";
  mimeType: string;
  filename: string;
};

export type BrowserMediaRecorderProps = {
  mode: "video" | "audio";
  maxDurationSeconds?: number;
  accentColor?: string;
  onMediaReady: (result: RecordedMediaResult) => void;
  onMediaClear: () => void;
  initialPreviewUrl?: string | null;
  className?: string;
  // Guided recording features
  videoInstructions?: string | null;
  recordingQuestions?: string[] | { id?: string; text: string }[] | null;
  recordingQuestionsJson?: string | null;
};

type RecordingState = "idle" | "ready" | "countdown" | "recording" | "paused" | "recorded";

function getSupportedMimeType(mode: "video" | "audio"): string {
  if (typeof window === "undefined" || !window.MediaRecorder) return "";

  if (mode === "video") {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4;codecs=avc1,mp4a.40.2",
      "video/mp4",
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return "";
  } else {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/aac",
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return "";
  }
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function BrowserMediaRecorder({
  mode,
  maxDurationSeconds = 120,
  accentColor = "#7049D8",
  onMediaReady,
  onMediaClear,
  initialPreviewUrl,
  className,
  videoInstructions,
  recordingQuestions,
  recordingQuestionsJson,
}: BrowserMediaRecorderProps) {
  const [activeTab, setActiveTab] = useState<"record" | "upload">("record");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [countdown, setCountdown] = useState<number>(3);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hardware devices
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [selectedMicId, setSelectedMicId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Media streams & recorders
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedSecondsRef = useRef<number>(0);

  // DOM Elements
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoPlayerContainerRef = useRef<HTMLDivElement | null>(null);

  // Audio Visualizer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [audioFrequencyLevels, setAudioFrequencyLevels] = useState<number[]>([10, 15, 20, 25, 20, 15, 10]);

  // Current Recorded Result
  const [currentResult, setCurrentResult] = useState<RecordedMediaResult | null>(null);
  const [isBrowserSupported, setIsBrowserSupported] = useState<boolean>(true);

  // Video Playback Controls State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState<number>(0);
  const [playbackDuration, setPlaybackDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Guided Questions Teleprompter State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isPrompterVisible, setIsPrompterVisible] = useState<boolean>(true);

  // Parse guided questions
  const parsedQuestions = useMemo<string[]>(() => {
    if (Array.isArray(recordingQuestions)) {
      return recordingQuestions
        .map((q) => (typeof q === "string" ? q : q.text))
        .filter((t): t is string => Boolean(t && t.trim()));
    }
    if (recordingQuestionsJson) {
      try {
        const parsed = JSON.parse(recordingQuestionsJson);
        if (Array.isArray(parsed)) {
          return parsed
            .map((q) => (typeof q === "string" ? q : q.text || q.label || ""))
            .filter((t): t is string => Boolean(t && t.trim()));
        }
      } catch {
        // ignore JSON errors
      }
    }
    return [];
  }, [recordingQuestions, recordingQuestionsJson]);

  // Check browser API compatibility on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const supported = Boolean(
        typeof navigator !== "undefined" &&
          navigator.mediaDevices &&
          typeof navigator.mediaDevices.getUserMedia === "function" &&
          typeof window !== "undefined" &&
          typeof window.MediaRecorder === "function",
      );
      setIsBrowserSupported(supported);
      if (!supported) {
        setActiveTab("upload");
      }
    }
  }, []);

  // Sync initialPreviewUrl if provided
  useEffect(() => {
    if (initialPreviewUrl && !currentResult) {
      const mockResult: RecordedMediaResult = {
        blob: new Blob(),
        file: new File([], `existing-media${mode === "video" ? ".mp4" : ".mp3"}`),
        previewUrl: initialPreviewUrl,
        durationSeconds: 0,
        type: mode === "video" ? "VIDEO" : "AUDIO",
        mimeType: mode === "video" ? "video/mp4" : "audio/mpeg",
        filename: `existing-media${mode === "video" ? ".mp4" : ".mp3"}`,
      };
      setCurrentResult(mockResult);
      setRecordingState("recorded");
    }
  }, [initialPreviewUrl, mode, currentResult]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Web Audio countdown audio cue
  const playBeep = useCallback((frequency = 600, duration = 0.08) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio playback non-blocking
    }
  }, []);

  // Stop all active stream tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [stopStream]);

  // Setup Audio Analyser for Visualizer
  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Map to 7 display bars
        const bars = [
          Math.max(10, Math.round((dataArray[1] / 255) * 100)),
          Math.max(10, Math.round((dataArray[2] / 255) * 100)),
          Math.max(10, Math.round((dataArray[3] / 255) * 100)),
          Math.max(10, Math.round((dataArray[4] / 255) * 100)),
          Math.max(10, Math.round((dataArray[5] / 255) * 100)),
          Math.max(10, Math.round((dataArray[6] / 255) * 100)),
          Math.max(10, Math.round((dataArray[7] / 255) * 100)),
        ];
        setAudioFrequencyLevels(bars);
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch {
      // Audio visualizer fallback
    }
  }, []);

  // Enumerate hardware devices
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
      setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
    } catch {
      // ignore
    }
  }, []);

  // Request permissions and initialize live stream
  const initializeMediaStream = useCallback(async () => {
    setErrorMessage(null);

    try {
      stopStream();

      const constraints: MediaStreamConstraints = {
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
      };

      if (mode === "video") {
        constraints.video = selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : {
              facingMode: facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Attach live stream to video element
      if (mode === "video" && liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.muted = true;
        await liveVideoRef.current.play().catch(() => {});
      }

      // Attach audio analyser
      setupAudioAnalyser(stream);

      // Refresh devices with actual labels after permission grant
      await refreshDevices();

      setRecordingState("ready");
    } catch (err: unknown) {
      const error = err as Error & { name?: string };
      console.warn("Media stream request failed:", error);

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setErrorMessage(
          "Camera or microphone permission was blocked. Please click the camera/lock icon in your browser address bar, switch permissions to 'Allow', and click Try Again.",
        );
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setErrorMessage(
          "No camera or microphone was detected on this device. You can upload a pre-recorded file instead.",
        );
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        setErrorMessage(
          "Your camera or microphone is in use by another application (such as Zoom, Teams, or Meet). Please close other apps and try again.",
        );
      } else if (error.name === "SecurityError") {
        setErrorMessage(
          "Media recording requires a secure origin (HTTPS or localhost).",
        );
      } else {
        setErrorMessage(
          error.message || "Failed to initialize camera or microphone. Please use file upload.",
        );
      }
      setRecordingState("idle");
    }
  }, [mode, selectedCameraId, selectedMicId, facingMode, stopStream, setupAudioAnalyser, refreshDevices]);

  // Start actual recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    try {
      recordedChunksRef.current = [];
      const mimeType = getSupportedMimeType(mode);

      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopStream();
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        const effectiveMime = recorder.mimeType || (mode === "video" ? "video/webm" : "audio/webm");
        const blob = new Blob(recordedChunksRef.current, { type: effectiveMime });
        const ext =
          mode === "video"
            ? effectiveMime.includes("mp4")
              ? ".mp4"
              : ".webm"
            : effectiveMime.includes("mp4")
            ? ".m4a"
            : effectiveMime.includes("ogg")
            ? ".ogg"
            : ".weba";
        const filename = `testimonial-${mode}-${Date.now()}${ext}`;
        const file = new File([blob], filename, { type: effectiveMime });
        const previewUrl = URL.createObjectURL(blob);

        const finalDuration = elapsedSecondsRef.current || 1;
        const result: RecordedMediaResult = {
          blob,
          file,
          previewUrl,
          durationSeconds: finalDuration,
          type: mode === "video" ? "VIDEO" : "AUDIO",
          mimeType: effectiveMime,
          filename,
        };

        setCurrentResult(result);
        setRecordingState("recorded");
        setPlaybackDuration(finalDuration);
        onMediaReady(result);
      };

      recorder.start(500); // 500ms chunk slices
      setRecordingState("recording");
      setElapsedSeconds(0);
      elapsedSecondsRef.current = 0;
      setCurrentQuestionIndex(0);

      // Start duration timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          elapsedSecondsRef.current = next;
          if (next >= maxDurationSeconds) {
            // Auto stop when max duration reached
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
              mediaRecorderRef.current.stop();
            }
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("Failed to start MediaRecorder:", err);
      setErrorMessage("Could not start recording with this browser's MediaRecorder.");
      setRecordingState("ready");
    }
  }, [mode, maxDurationSeconds, stopStream, onMediaReady]);

  // Initiate countdown before recording
  const handleTriggerCountdown = () => {
    setRecordingState("countdown");
    setCountdown(3);
    playBeep(600, 0.08);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        playBeep(1200, 0.15);
        startRecording();
      } else {
        setCountdown(count);
        playBeep(600, 0.08);
      }
    }, 1000);
  };

  // Pause Recording
  const handlePause = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setRecordingState("paused");
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // Resume Recording
  const handleResume = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setRecordingState("recording");

      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          elapsedSecondsRef.current = next;
          if (next >= maxDurationSeconds) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
              mediaRecorderRef.current.stop();
            }
          }
          return next;
        });
      }, 1000);
    }
  };

  // Stop Recording
  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // Retake Recording (resets state, restarts camera/mic stream, rewinds questions)
  const handleRetake = () => {
    if (currentResult) {
      try {
        URL.revokeObjectURL(currentResult.previewUrl);
      } catch {
        // ignore
      }
    }
    setCurrentResult(null);
    setElapsedSeconds(0);
    elapsedSecondsRef.current = 0;
    setCurrentQuestionIndex(0);
    setIsPlaying(false);
    setPlaybackCurrentTime(0);
    onMediaClear();
    initializeMediaStream();
  };

  // Remove Media
  const handleRemoveMedia = () => {
    if (currentResult) {
      try {
        URL.revokeObjectURL(currentResult.previewUrl);
      } catch {
        // ignore
      }
    }
    setCurrentResult(null);
    setElapsedSeconds(0);
    elapsedSecondsRef.current = 0;
    setRecordingState("idle");
    setIsPlaying(false);
    onMediaClear();
    stopStream();
  };

  // Handle Fallback File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = (mode === "video" ? 100 : 25) * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(
        `File exceeds maximum allowed size of ${mode === "video" ? "100 MB" : "25 MB"}.`,
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const result: RecordedMediaResult = {
      blob: file,
      file,
      previewUrl,
      durationSeconds: 0,
      type: mode === "video" ? "VIDEO" : "AUDIO",
      mimeType: file.type || (mode === "video" ? "video/mp4" : "audio/mpeg"),
      filename: file.name,
    };

    setCurrentResult(result);
    setRecordingState("recorded");
    onMediaReady(result);
  };

  // Video Playback Controls
  const togglePlay = () => {
    if (!playbackVideoRef.current) return;
    if (playbackVideoRef.current.paused || playbackVideoRef.current.ended) {
      playbackVideoRef.current.play().catch(() => {});
    } else {
      playbackVideoRef.current.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setPlaybackCurrentTime(time);
    if (playbackVideoRef.current) {
      playbackVideoRef.current.currentTime = time;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (playbackVideoRef.current) {
      playbackVideoRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (playbackVideoRef.current) {
      playbackVideoRef.current.volume = val;
      playbackVideoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!playbackVideoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    playbackVideoRef.current.muted = nextMuted;
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      playbackVideoRef.current.volume = 0.5;
    }
  };

  const toggleFullscreen = () => {
    const container = videoPlayerContainerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const progressPercent = Math.min(100, Math.round((elapsedSeconds / maxDurationSeconds) * 100));

  return (
    <div className={cn("space-y-3", className)}>
      {/* ----------------------------------------------------------------- */}
      {/* MODE TABS (Record in Browser vs Upload Existing File) */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-1">
          {isBrowserSupported && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("record");
                setErrorMessage(null);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                activeTab === "record"
                  ? "bg-warm-200 text-ink-900"
                  : "text-ink-600 hover:text-ink-900 hover:bg-warm-100",
              )}
            >
              {mode === "video" ? <Video size={13} /> : <Mic size={13} />}
              <span>Record in Browser</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab("upload");
              setErrorMessage(null);
              stopStream();
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              activeTab === "upload"
                ? "bg-warm-200 text-ink-900"
                : "text-ink-600 hover:text-ink-900 hover:bg-warm-100",
            )}
          >
            <Upload size={13} />
            <span>Upload File</span>
          </button>
        </div>

        <span className="text-[10px] text-ink-500 font-medium">
          {mode === "video" ? `Max ${maxDurationSeconds}s` : "High Fidelity"}
        </span>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* CLEAR PERMISSION ERROR BANNER */}
      {/* ----------------------------------------------------------------- */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 space-y-2 text-xs animate-in fade-in">
          <div className="flex items-start gap-2 text-rose-800">
            <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <span className="font-semibold block">Camera or Microphone Access Needed</span>
              <p className="text-[11px] text-rose-700 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-6 pt-1">
            <button
              type="button"
              onClick={initializeMediaStream}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 text-[11px] font-semibold shadow-2xs transition-colors"
            >
              <RotateCcw size={11} />
              <span>Try Again</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 px-3 py-1 text-[11px] font-semibold transition-colors"
            >
              <Upload size={11} />
              <span>Upload File Instead</span>
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* RECORD IN BROWSER TAB */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === "record" && (
        <div className="space-y-3">
          {/* STATE: IDLE (Requires explicit user action to enable media) */}
          {recordingState === "idle" && (
            <div className="space-y-3 animate-in fade-in">
              <div className="rounded-2xl border-2 border-dashed border-line bg-warm-50/60 p-6 text-center space-y-3">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center mx-auto text-white shadow-xs transition-transform hover:scale-105"
                  style={{ backgroundColor: accentColor }}
                >
                  {mode === "video" ? <Video size={22} /> : <Mic size={22} />}
                </div>

                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="text-xs font-bold text-ink-900">
                    {mode === "video" ? "Ready to record your video?" : "Ready to record a voice testimonial?"}
                  </h4>
                  <p className="text-[11px] text-ink-500 leading-relaxed">
                    {mode === "video"
                      ? `Click below to preview your camera. You can record up to ${maxDurationSeconds}s with live prompts.`
                      : "Click below to activate your microphone. You can pause and review before submitting."}
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={initializeMediaStream}
                    style={{ backgroundColor: accentColor }}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity"
                  >
                    {mode === "video" ? <Camera size={13} /> : <Mic size={13} />}
                    <span>{mode === "video" ? "Enable Camera & Microphone" : "Enable Microphone"}</span>
                  </button>
                </div>
              </div>

              {/* Pre-recording Instructions & Guided Prompts Preview */}
              {mode === "video" && (
                <div className="rounded-xl border border-line bg-warm-50/70 p-3.5 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
                      <Lightbulb size={13} className="text-amber-500" />
                      <span>{videoInstructions ? "Recording Instructions" : "Recording Tips"}</span>
                    </div>
                    <p className="text-[11px] text-ink-600 leading-relaxed whitespace-pre-line">
                      {videoInstructions ||
                        "Position your camera at eye level with good lighting on your face. Speak naturally, and don't worry about being scripted!"}
                    </p>
                  </div>

                  {parsedQuestions.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-line/70">
                      <div className="text-[11px] font-semibold text-ink-700 uppercase tracking-wider flex items-center justify-between">
                        <span>Prompts you&apos;ll be answering ({parsedQuestions.length})</span>
                        <span className="text-[10px] text-ink-400 font-normal">Shown on-screen while recording</span>
                      </div>
                      <ol className="space-y-1 text-xs text-ink-700">
                        {parsedQuestions.map((q, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="h-4 w-4 rounded-full bg-brand-100 text-brand-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-snug">{q}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STATE: READY / COUNTDOWN / RECORDING / PAUSED */}
          {(recordingState === "ready" ||
            recordingState === "countdown" ||
            recordingState === "recording" ||
            recordingState === "paused") && (
            <div className="space-y-3 animate-in fade-in">
              {/* Media Preview & Recording Stage */}
              <div className="rounded-2xl overflow-hidden bg-ink-950 aspect-video relative flex items-center justify-center shadow-inner">
                {mode === "video" ? (
                  <video
                    ref={liveVideoRef}
                    playsInline
                    muted
                    autoPlay
                    className={cn(
                      "w-full h-full object-cover",
                      facingMode === "user" ? "scale-x-[-1]" : "",
                    )}
                  />
                ) : (
                  /* Audio Visualizer Stage */
                  <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
                    <div
                      className={cn(
                        "h-16 w-16 rounded-full flex items-center justify-center text-white transition-all duration-300",
                        recordingState === "recording" ? "animate-pulse" : "",
                      )}
                      style={{ backgroundColor: accentColor }}
                    >
                      <Mic size={32} />
                    </div>

                    {/* Audio Level Graphic Equalizer */}
                    <div className="flex items-end justify-center gap-1.5 h-12 w-48">
                      {audioFrequencyLevels.map((lvl, idx) => (
                        <div
                          key={idx}
                          className="w-4 rounded-full transition-all duration-100"
                          style={{
                            height: `${lvl}%`,
                            backgroundColor:
                              recordingState === "recording" ? "#ef4444" : accentColor,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-ink-400 font-mono">
                      {recordingState === "recording" ? "Capturing Voice Audio..." : "Microphone Active"}
                    </span>
                  </div>
                )}

                {/* 3.. 2.. 1.. Countdown Overlay */}
                {recordingState === "countdown" && (
                  <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-200 z-20">
                    <div className="h-24 w-24 rounded-full bg-white/20 text-white border-4 border-white flex items-center justify-center text-5xl font-black animate-ping">
                      {countdown}
                    </div>
                  </div>
                )}

                {/* Top Status Bar Overlays */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-white text-[11px] font-mono z-10">
                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5 bg-ink-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-sm">
                    {recordingState === "recording" && (
                      <>
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                        <span className="font-bold text-rose-400 uppercase tracking-wider text-[10px]">REC</span>
                      </>
                    )}
                    {recordingState === "paused" && (
                      <>
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px]">PAUSED</span>
                      </>
                    )}
                    {recordingState === "ready" && (
                      <>
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="text-ink-200 text-[10px]">READY</span>
                      </>
                    )}
                    <span>{formatDuration(elapsedSeconds)}</span>
                    <span className="text-white/40">/ {formatDuration(maxDurationSeconds)}</span>
                  </div>

                  {/* Device switch controls */}
                  <div className="flex items-center gap-1.5">
                    {mode === "video" && videoDevices.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
                          setTimeout(initializeMediaStream, 50);
                        }}
                        className="rounded-full bg-ink-950/80 backdrop-blur-md p-1.5 text-white hover:bg-ink-800 transition-colors border border-white/10"
                        title="Flip Camera"
                      >
                        <SwitchCamera size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Teleprompter / Guided Questions Overlay (During Recording or Paused) */}
                {(recordingState === "recording" || recordingState === "paused") &&
                  mode === "video" &&
                  parsedQuestions.length > 0 &&
                  isPrompterVisible && (
                    <div className="absolute top-12 left-4 right-4 z-10 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="max-w-md mx-auto rounded-2xl bg-ink-950/85 backdrop-blur-md border border-white/15 p-3.5 shadow-2xl text-white">
                        <div className="flex items-center justify-between text-[10px] font-bold text-brand-300 uppercase tracking-wider mb-1.5">
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
                            <span>Prompt {currentQuestionIndex + 1} of {parsedQuestions.length}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsPrompterVisible(false)}
                            className="text-white/60 hover:text-white p-0.5 rounded transition-colors"
                            title="Hide teleprompter"
                          >
                            <EyeOff size={12} />
                          </button>
                        </div>

                        {/* Current Question Text */}
                        <p className="text-xs sm:text-sm font-semibold leading-snug text-white/95">
                          &ldquo;{parsedQuestions[currentQuestionIndex]}&rdquo;
                        </p>

                        {/* Navigation Arrows & Dot Indicators */}
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/10 text-xs">
                          <button
                            type="button"
                            disabled={currentQuestionIndex === 0}
                            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                            className="inline-flex items-center gap-1 text-[11px] text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <ChevronLeft size={13} />
                            <span>Previous</span>
                          </button>

                          <div className="flex items-center gap-1">
                            {parsedQuestions.map((_, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setCurrentQuestionIndex(idx)}
                                className={cn(
                                  "h-1.5 rounded-full transition-all",
                                  currentQuestionIndex === idx
                                    ? "w-4 bg-brand-400"
                                    : "w-1.5 bg-white/30 hover:bg-white/60",
                                )}
                                title={`Jump to prompt ${idx + 1}`}
                              />
                            ))}
                          </div>

                          <button
                            type="button"
                            disabled={currentQuestionIndex === parsedQuestions.length - 1}
                            onClick={() =>
                              setCurrentQuestionIndex((prev) =>
                                Math.min(parsedQuestions.length - 1, prev + 1),
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <span>Next</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Show Prompts Button if Teleprompter is hidden */}
                {(recordingState === "recording" || recordingState === "paused") &&
                  mode === "video" &&
                  parsedQuestions.length > 0 &&
                  !isPrompterVisible && (
                    <button
                      type="button"
                      onClick={() => setIsPrompterVisible(true)}
                      className="absolute top-12 left-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-ink-950/80 backdrop-blur-md border border-white/20 px-3 py-1 text-[11px] text-white font-medium hover:bg-ink-900 transition-colors shadow-lg"
                    >
                      <Eye size={12} />
                      <span>Show Prompts ({currentQuestionIndex + 1}/{parsedQuestions.length})</span>
                    </button>
                  )}

                {/* Bottom recording progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-10">
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Hardware Selection Dropdowns (if multiple devices present) */}
              {(videoDevices.length > 1 || audioDevices.length > 1) && recordingState === "ready" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {mode === "video" && videoDevices.length > 1 && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-line bg-white p-1.5">
                      <Camera size={13} className="text-ink-400 shrink-0" />
                      <select
                        value={selectedCameraId}
                        onChange={(e) => {
                          setSelectedCameraId(e.target.value);
                          setTimeout(initializeMediaStream, 50);
                        }}
                        className="w-full text-ink-800 text-[11px] bg-transparent focus:outline-none"
                      >
                        {videoDevices.map((d, i) => (
                          <option key={d.deviceId || i} value={d.deviceId}>
                            {d.label || `Camera ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {audioDevices.length > 1 && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-line bg-white p-1.5">
                      <Mic size={13} className="text-ink-400 shrink-0" />
                      <select
                        value={selectedMicId}
                        onChange={(e) => {
                          setSelectedMicId(e.target.value);
                          setTimeout(initializeMediaStream, 50);
                        }}
                        className="w-full text-ink-800 text-[11px] bg-transparent focus:outline-none"
                      >
                        {audioDevices.map((d, i) => (
                          <option key={d.deviceId || i} value={d.deviceId}>
                            {d.label || `Microphone ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Action Controls Bar */}
              <div className="flex items-center justify-center gap-3 pt-1">
                {/* STATE: READY -> Trigger Countdown/Record */}
                {recordingState === "ready" && (
                  <button
                    type="button"
                    onClick={handleTriggerCountdown}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 text-xs font-bold shadow-md transition-all hover:scale-102"
                  >
                    <span className="h-3 w-3 rounded-full bg-white animate-pulse" />
                    <span>Start Recording</span>
                  </button>
                )}

                {/* STATE: RECORDING -> Pause & Stop */}
                {recordingState === "recording" && (
                  <>
                    <button
                      type="button"
                      onClick={handlePause}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white hover:bg-warm-100 text-ink-700 px-4 py-2 text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <Pause size={13} />
                      <span>Pause</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStop}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-bold shadow-md transition-all hover:scale-102"
                    >
                      <Square size={13} className="fill-white" />
                      <span>Finish Recording</span>
                    </button>
                  </>
                )}

                {/* STATE: PAUSED -> Resume & Stop */}
                {recordingState === "paused" && (
                  <>
                    <button
                      type="button"
                      onClick={handleResume}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <Play size={13} className="fill-white" />
                      <span>Resume</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStop}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-bold shadow-md transition-all"
                    >
                      <Square size={13} className="fill-white" />
                      <span>Finish Recording</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STATE: RECORDED - Review, Video Playback Controls & Retake */}
          {recordingState === "recorded" && currentResult && (
            <div className="space-y-3 animate-in fade-in duration-300">
              {mode === "video" ? (
                /* Video Player Stage with Speed, Volume, Fullscreen, and Scrubber */
                <div
                  ref={videoPlayerContainerRef}
                  className="rounded-2xl overflow-hidden bg-ink-950 aspect-video flex items-center justify-center relative group shadow-md"
                >
                  <video
                    ref={playbackVideoRef}
                    playsInline
                    src={currentResult.previewUrl}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={togglePlay}
                    onTimeUpdate={() => {
                      if (playbackVideoRef.current) {
                        setPlaybackCurrentTime(playbackVideoRef.current.currentTime);
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (playbackVideoRef.current) {
                        setPlaybackDuration(playbackVideoRef.current.duration);
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />

                  {/* Center Play Overlay Indicator when paused */}
                  {!isPlaying && (
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg border border-white/20"
                    >
                      <Play size={24} className="fill-white ml-1" />
                    </button>
                  )}

                  {/* Custom Bottom Video Control Bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 flex flex-col gap-2 transition-opacity">
                    {/* Seekable Progress Scrubber */}
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={playbackDuration || currentResult.durationSeconds || 1}
                        step={0.1}
                        value={playbackCurrentTime}
                        onChange={handleSeek}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/30 accent-brand-500 hover:h-2 transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-between text-white text-xs">
                      {/* Left: Play/Pause, Time, Volume */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={togglePlay}
                          className="p-1 text-white hover:text-brand-300 transition-colors"
                          title={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? <Pause size={15} /> : <Play size={15} className="fill-white" />}
                        </button>

                        <span className="text-[11px] font-mono text-white/80">
                          {formatDuration(playbackCurrentTime)} /{" "}
                          {formatDuration(playbackDuration || currentResult.durationSeconds || 0)}
                        </span>

                        {/* Volume Controls */}
                        <div className="flex items-center gap-1.5 group/vol">
                          <button
                            type="button"
                            onClick={toggleMute}
                            className="p-1 text-white/80 hover:text-white transition-colors"
                            title={isMuted ? "Unmute" : "Mute"}
                          >
                            {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-14 sm:w-16 h-1 rounded-full appearance-none cursor-pointer bg-white/30 accent-brand-500"
                            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                          />
                        </div>
                      </div>

                      {/* Right: Speed Selector & Fullscreen */}
                      <div className="flex items-center gap-2">
                        {/* Playback Speed Controls */}
                        <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5 border border-white/10 text-[10px] font-semibold">
                          {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => handleSpeedChange(spd)}
                              className={cn(
                                "px-1.5 py-0.5 rounded transition-colors",
                                playbackRate === spd
                                  ? "bg-brand-500 text-white font-bold"
                                  : "text-white/70 hover:text-white hover:bg-white/10",
                              )}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>

                        {/* Fullscreen Button */}
                        <button
                          type="button"
                          onClick={toggleFullscreen}
                          className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Audio Player Stage */
                <div className="rounded-2xl bg-ink-950 aspect-video flex items-center justify-center p-6 text-center">
                  <div className="space-y-3 w-full max-w-sm">
                    <div
                      className="h-14 w-14 rounded-full flex items-center justify-center mx-auto text-white shadow-xs"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Volume2 size={24} />
                    </div>
                    <audio
                      ref={playbackAudioRef}
                      controls
                      src={currentResult.previewUrl}
                      className="w-full mt-2"
                    />
                  </div>
                </div>
              )}

              {/* Recording Metadata & Retake Bar */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-emerald-950 block">
                      {mode === "video" ? "Video Testimonial Ready" : "Voice Note Ready"}
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Duration: {formatDuration(currentResult.durationSeconds || elapsedSeconds)} &bull; Size:{" "}
                      {(currentResult.file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white hover:bg-warm-100 text-ink-700 px-3 py-1.5 text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <RotateCcw size={12} />
                    <span>Retake</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    className="p-1.5 text-ink-400 hover:text-rose-600 transition-colors"
                    title="Remove"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* FILE UPLOAD FALLBACK TAB */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === "upload" && (
        <div className="space-y-3">
          {currentResult ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <div>
                    <span className="font-semibold text-emerald-950 text-xs block">
                      {currentResult.filename}
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      {(currentResult.file.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for submission
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="rounded-lg p-1 text-ink-400 hover:text-rose-600 transition-colors"
                  title="Remove uploaded file"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-line bg-warm-50/60 p-6 text-center space-y-2 cursor-pointer hover:bg-warm-100/60 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-warm-200 flex items-center justify-center mx-auto text-ink-600">
                <Upload size={18} />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-ink-900 block">
                  Click or drag file to upload
                </span>
                <span className="text-[11px] text-ink-500 block">
                  {mode === "video"
                    ? "MP4, WebM, or MOV up to 100 MB"
                    : "WAV, MP3, OGG, or WebM Audio up to 25 MB"}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={mode === "video" ? "video/mp4,video/webm,video/quicktime" : "audio/*"}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
