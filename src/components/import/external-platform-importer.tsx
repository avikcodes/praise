"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ExternalPlatformId,
  ImportPreviewResult,
  NormalizedImportItem,
} from "@/lib/import/external-types";
import { getAvailablePlatformCatalog } from "@/lib/import/adapters/registry";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Star,
  ExternalLink,
  History,
  RefreshCw,
  Building2,
  Mail,
  User,
  Check,
  X,
  FileCode,
  Globe,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/dashboard/toast-context";

interface ExternalPlatformImporterProps {
  workspaceId: string;
  projects?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

type WizardStage = "select-source" | "configure-input" | "preview-items" | "import-results";

export function ExternalPlatformImporter({
  workspaceId,
  projects = [],
  onSuccess,
}: ExternalPlatformImporterProps) {
  const toast = useToast();
  const catalog = getAvailablePlatformCatalog();

  // Wizard State
  const [stage, setStage] = useState<WizardStage>("select-source");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("GOOGLE");
  const [inputMode, setInputMode] = useState<"API" | "FILE" | "PASTE">("FILE");

  // API Credentials State
  const [apiCredentials, setApiCredentials] = useState<Record<string, string>>({});

  // File & Paste State
  const [pastedJson, setPastedJson] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [filePayload, setFilePayload] = useState<any>(null);

  // Settings State
  const [targetProjectId, setTargetProjectId] = useState<string>("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Loading & Execution State
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [itemsToImport, setItemsToImport] = useState<NormalizedImportItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeAdapter = catalog.find((c) => c.id === selectedPlatform) || catalog[0];

  // Set default input mode based on adapter capabilities
  useEffect(() => {
    if (activeAdapter.supportsAutomatedApi) {
      setInputMode("API");
    } else {
      setInputMode("FILE");
    }
    setErrorMessage(null);
  }, [selectedPlatform, activeAdapter]);

  // Handle File Upload (JSON or CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // Attempt JSON parse
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          setFilePayload(parsed);
        } else {
          // Pass raw text for CSV parsing in adapter
          setFilePayload(text);
        }
        setErrorMessage(null);
      } catch (err) {
        setErrorMessage("Failed to parse the uploaded file. Please ensure valid JSON or CSV.");
      }
    };
    reader.readAsText(file);
  };

  // Generate Preview & Run Duplicate Detection
  const handleGeneratePreview = async () => {
    setErrorMessage(null);
    setIsPreviewing(true);

    try {
      let rawData: any = null;
      let credentials: Record<string, string> | null = null;

      if (inputMode === "API") {
        credentials = apiCredentials;
      } else if (inputMode === "PASTE") {
        if (!pastedJson.trim()) {
          throw new Error("Please paste review data or JSON before proceeding.");
        }
        try {
          rawData = JSON.parse(pastedJson);
        } catch {
          // If not strict JSON, pass raw text
          rawData = pastedJson;
        }
      } else if (inputMode === "FILE") {
        if (!filePayload) {
          throw new Error("Please upload an export file before proceeding.");
        }
        rawData = filePayload;
      }

      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/import/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform,
          rawData,
          credentials,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse preview from source.");
      }

      setPreviewResult(data.preview);
      setItemsToImport(data.preview.items || []);
      setStage("preview-items");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error generating import preview.");
    } finally {
      setIsPreviewing(false);
    }
  };

  // Toggle Item Selection
  const toggleItemSelection = (index: number) => {
    setItemsToImport((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  // Select / Deselect All
  const toggleSelectAll = (select: boolean) => {
    setItemsToImport((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  // Execute Import
  const handleExecuteImport = async () => {
    const selectedItems = itemsToImport.filter((i) => i.selected);
    if (selectedItems.length === 0) {
      toast.error("No items selected", "Please select at least one review to import.");
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/import/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform,
          items: selectedItems,
          defaultProjectId: targetProjectId || undefined,
          skipDuplicates,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute external import.");
      }

      setImportSummary(data.result);
      setStage("import-results");
      toast.success("Import Completed", `Imported ${data.result.importedCount} reviews.`);
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error executing import.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Progress Header */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            {stage === "select-source" ? "1" : stage === "configure-input" ? "2" : stage === "preview-items" ? "3" : "4"}
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink-900">
              {stage === "select-source" && "Step 1: Select External Platform"}
              {stage === "configure-input" && `Step 2: Connect & Input (${activeAdapter.name})`}
              {stage === "preview-items" && "Step 3: Preview & Duplicate Detection"}
              {stage === "import-results" && "Step 4: Import Complete"}
            </h3>
            <p className="text-xs text-ink-500">
              {stage === "select-source" && "Choose an official review platform or social network to import from."}
              {stage === "configure-input" && "Connect via official API or upload an authorized vendor export."}
              {stage === "preview-items" && "Review author details, ratings, and potential duplicates before importing."}
              {stage === "import-results" && "Your imported reviews are queued in moderation as unapproved testimonials."}
            </p>
          </div>
        </div>

        {stage !== "select-source" && stage !== "import-results" && (
          <button
            type="button"
            onClick={() => {
              if (stage === "configure-input") setStage("select-source");
              if (stage === "preview-items") setStage("configure-input");
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink-600 hover:text-ink-900 transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Back</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 1: SOURCE SELECTION */}
      {/* ========================================================================= */}
      {stage === "select-source" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {catalog.map((platform) => {
              const isSelected = selectedPlatform === platform.id;
              return (
                <div
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={cn(
                    "relative rounded-2xl border p-4 cursor-pointer transition-all flex flex-col justify-between space-y-3",
                    isSelected
                      ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20 shadow-xs"
                      : "border-line bg-white hover:border-brand-300 hover:bg-warm-50/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-2xs"
                        style={{ backgroundColor: platform.color }}
                      >
                        {platform.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-ink-900">{platform.name}</div>
                        <span className="text-[10px] text-ink-400 capitalize">
                          {platform.category.toLowerCase().replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                    {platform.supportsAutomatedApi ? (
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        Official API
                      </span>
                    ) : (
                      <span className="rounded-full bg-warm-100 text-ink-600 border border-line px-2 py-0.5 text-[9px] font-semibold">
                        Vendor Export
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-ink-600 leading-relaxed line-clamp-2">
                    {platform.description}
                  </p>

                  <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[10px] text-ink-400">
                    <span>
                      {platform.supportsAutomatedApi
                        ? "API Key & Export Supported"
                        : "CSV / JSON Export Supported"}
                    </span>
                    <span className="font-bold text-brand-600">Select &rarr;</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compliance & Scraping Safeguard Banner */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-start gap-3 shadow-2xs">
            <div className="p-1 rounded-lg bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
              <ShieldCheck size={18} />
            </div>
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-emerald-950">Ethical &amp; Authorized Platform Integrations</h4>
              <p className="text-emerald-900/90 leading-relaxed">
                Praise uses only official developer APIs, authorized tokens, or official user-provided CSV/JSON exports from vendor portals. Praise strictly never performs unauthorized scraping, bot bypasses, or credential spoofing.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setStage("configure-input")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-600 transition-colors"
            >
              <span>Continue with {activeAdapter.name}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: CONFIGURE INPUT & CREDENTIALS */}
      {/* ========================================================================= */}
      {stage === "configure-input" && (
        <div className="space-y-5">
          {/* Platform Header Card */}
          <div className="rounded-2xl border border-line bg-white p-4 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-2xs"
                style={{ backgroundColor: activeAdapter.color }}
              >
                {activeAdapter.name[0]}
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-ink-900">{activeAdapter.name}</h4>
                <p className="text-[11px] text-ink-500">{activeAdapter.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStage("select-source")}
              className="text-xs text-brand-600 font-semibold hover:underline"
            >
              Change Platform
            </button>
          </div>

          {/* Input Mode Selector */}
          <div className="flex items-center gap-2 border-b border-line pb-2">
            {activeAdapter.supportsAutomatedApi && (
              <button
                type="button"
                onClick={() => setInputMode("API")}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
                  inputMode === "API"
                    ? "bg-brand-500 text-white shadow-2xs"
                    : "bg-white text-ink-700 border border-line hover:bg-warm-100"
                )}
              >
                Official API Connection
              </button>
            )}
            <button
              type="button"
              onClick={() => setInputMode("FILE")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
                inputMode === "FILE"
                  ? "bg-brand-500 text-white shadow-2xs"
                  : "bg-white text-ink-700 border border-line hover:bg-warm-100"
              )}
            >
              Upload Export File (JSON / CSV)
            </button>
            <button
              type="button"
              onClick={() => setInputMode("PASTE")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
                inputMode === "PASTE"
                  ? "bg-brand-500 text-white shadow-2xs"
                  : "bg-white text-ink-700 border border-line hover:bg-warm-100"
              )}
            >
              Paste Data / JSON Payload
            </button>
          </div>

          {/* Form Panel: Official API */}
          {inputMode === "API" && activeAdapter.supportsAutomatedApi && (
            <div className="rounded-2xl border border-line bg-white p-5 space-y-4 shadow-2xs">
              <div className="text-xs text-ink-600 leading-relaxed bg-brand-50/50 p-3 rounded-xl border border-brand-200/60">
                {activeAdapter.apiRequirementNote}
              </div>

              <div className="space-y-3">
                {activeAdapter.apiConfigFields?.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type={field.type}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={apiCredentials[field.key] || ""}
                      onChange={(e) =>
                        setApiCredentials({ ...apiCredentials, [field.key]: e.target.value })
                      }
                      className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 font-mono bg-white focus:border-brand-500 focus:outline-none"
                    />
                    {field.description && (
                      <p className="text-[10px] text-ink-400 mt-0.5">{field.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Panel: File Upload */}
          {inputMode === "FILE" && (
            <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-center space-y-3 shadow-2xs">
              <div className="mx-auto w-10 h-10 rounded-full bg-warm-100 text-ink-600 flex items-center justify-center">
                <Upload size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink-900">
                  {uploadFileName ? uploadFileName : `Upload ${activeAdapter.name} Export`}
                </h4>
                <p className="text-[11px] text-ink-500 mt-0.5">
                  Supports official CSV or JSON exports directly downloaded from your {activeAdapter.name} portal.
                </p>
              </div>

              <input
                type="file"
                id="external-import-file"
                accept=".json,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="external-import-file"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-warm-50 hover:bg-warm-100 px-4 py-2 text-xs font-semibold text-ink-800 cursor-pointer transition-colors"
              >
                <FileCode size={13} />
                <span>Choose JSON or CSV File</span>
              </label>

              {uploadFileName && (
                <div className="text-[11px] font-semibold text-emerald-600 flex items-center justify-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>File loaded ready for preview</span>
                </div>
              )}
            </div>
          )}

          {/* Form Panel: Paste Data */}
          {inputMode === "PASTE" && (
            <div className="rounded-2xl border border-line bg-white p-5 space-y-3 shadow-2xs">
              <label className="block text-xs font-semibold text-ink-900">
                Paste Raw JSON / Text Payload
              </label>
              <textarea
                rows={8}
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder='[{"author_name": "Jane Doe", "rating": 5, "text": "Outstanding product!", ...}]'
                className="w-full rounded-xl border border-line p-3 text-xs font-mono text-ink-900 bg-white focus:border-brand-500 focus:outline-none leading-relaxed"
              />
              <p className="text-[10px] text-ink-400">
                Paste structured review objects or array payloads copied from your platform console.
              </p>
            </div>
          )}

          {/* Target Project Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Assign to Project / Brand (Optional)
              </label>
              <select
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink-800 focus:border-brand-500 focus:outline-none"
              >
                <option value="">General (No Project)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-warm-50/50 self-end">
              <div>
                <span className="font-semibold text-xs text-ink-900">Skip Duplicate Reviews</span>
                <p className="text-[10px] text-ink-500">Auto-detect existing matching text or URLs</p>
              </div>
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Unpublished Safety Notice */}
          <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3.5 text-xs text-brand-900 flex items-start gap-2">
            <ShieldCheck size={16} className="text-brand-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Unpublished Guarantee:</strong> All imported testimonials are stored with status{" "}
              <code className="font-mono font-bold text-brand-700">PENDING</code> and remain strictly hidden from public widgets and walls until human moderation approval.
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStage("select-source")}
              className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isPreviewing}
              onClick={handleGeneratePreview}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {isPreviewing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Parsing Reviews &amp; Checking Duplicates...</span>
                </>
              ) : (
                <>
                  <span>Preview Reviews</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: PREVIEW & DUPLICATE DETECTION */}
      {/* ========================================================================= */}
      {stage === "preview-items" && previewResult && (
        <div className="space-y-4">
          {/* Summary Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
              <span className="text-[10px] text-ink-400 font-semibold uppercase">Total Parsed</span>
              <div className="text-lg font-bold text-ink-900">{previewResult.totalParsed}</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
              <span className="text-[10px] text-emerald-600 font-semibold uppercase">Ready to Import</span>
              <div className="text-lg font-bold text-emerald-700">{itemsToImport.filter((i) => i.selected).length}</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
              <span className="text-[10px] text-amber-600 font-semibold uppercase">Duplicates Detected</span>
              <div className="text-lg font-bold text-amber-700">{previewResult.duplicateCount}</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
              <span className="text-[10px] text-ink-400 font-semibold uppercase">Platform</span>
              <div className="text-xs font-bold text-ink-800 truncate mt-1">{previewResult.platformName}</div>
            </div>
          </div>

          {/* Bulk Selection Actions */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleSelectAll(true)}
                className="text-brand-600 hover:underline font-semibold text-[11px]"
              >
                Select All
              </button>
              <span className="text-ink-300">•</span>
              <button
                type="button"
                onClick={() => toggleSelectAll(false)}
                className="text-ink-500 hover:underline font-semibold text-[11px]"
              >
                Deselect All
              </button>
            </div>

            <span className="text-[11px] text-ink-500">
              {itemsToImport.filter((i) => i.selected).length} of {itemsToImport.length} selected for import
            </span>
          </div>

          {/* Preview Review List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {itemsToImport.map((item, idx) => (
              <div
                key={item.id || idx}
                className={cn(
                  "rounded-2xl border p-4 text-xs space-y-3 transition-colors",
                  item.isDuplicateCandidate
                    ? "border-amber-300 bg-amber-50/30"
                    : item.selected
                    ? "border-brand-300 bg-white shadow-2xs"
                    : "border-line bg-warm-50/50 opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItemSelection(idx)}
                      className="mt-1 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                    />

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-ink-900 text-xs sm:text-sm">
                          {item.authorName}
                        </span>
                        {item.authorHandle && (
                          <span className="text-[11px] text-ink-400 font-mono">
                            {item.authorHandle}
                          </span>
                        )}
                        {item.authorCompany && (
                          <span className="rounded bg-warm-100 text-ink-700 px-1.5 py-0.2 text-[10px] font-medium border border-line">
                            {item.authorCompany}
                          </span>
                        )}
                      </div>

                      {item.authorTitle && (
                        <div className="text-[10px] text-ink-500">{item.authorTitle}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.rating && (
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            className={s <= item.rating! ? "fill-amber-400 text-amber-400" : "text-ink-200 fill-transparent"}
                          />
                        ))}
                      </div>
                    )}
                    {item.originalRating && (
                      <span className="text-[10px] text-ink-400 font-mono">
                        ({item.originalRating})
                      </span>
                    )}
                  </div>
                </div>

                {/* Review Body */}
                <p className="text-ink-700 text-xs leading-relaxed whitespace-pre-line pl-7">
                  {item.content}
                </p>

                {/* Footer metadata & duplicate warnings */}
                <div className="pl-7 pt-2 border-t border-line/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-400">
                  <div className="flex items-center gap-2">
                    {item.originalDate && (
                      <span>Date: {new Date(item.originalDate).toLocaleDateString()}</span>
                    )}
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>View Source</span>
                        <ExternalLink size={9} />
                      </a>
                    )}
                  </div>

                  {item.isDuplicateCandidate && (
                    <div className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 font-semibold text-[10px]">
                      <AlertTriangle size={11} />
                      <span>{item.duplicateReason || "Duplicate Candidate"}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-line">
            <button
              type="button"
              onClick={() => setStage("configure-input")}
              className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
            >
              Back to Input
            </button>
            <button
              type="button"
              disabled={isImporting || itemsToImport.filter((i) => i.selected).length === 0}
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Importing Reviews into Moderation...</span>
                </>
              ) : (
                <>
                  <span>Import {itemsToImport.filter((i) => i.selected).length} Reviews</span>
                  <Check size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: IMPORT RESULTS & MODERATION QUEUE */}
      {/* ========================================================================= */}
      {stage === "import-results" && importSummary && (
        <div className="rounded-2xl border border-line bg-white p-8 text-center space-y-4 shadow-2xs max-w-lg mx-auto">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-ink-900">
              Import Completed Successfully
            </h3>
            <p className="text-xs text-ink-500">
              Batch <code className="font-mono text-ink-700">{importSummary.batchId}</code> has been processed.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 py-2">
            <div className="rounded-xl bg-emerald-50/60 p-2.5 border border-emerald-200">
              <span className="text-[10px] text-emerald-700 font-semibold block uppercase">Imported</span>
              <span className="text-lg font-bold text-emerald-800">{importSummary.importedCount}</span>
            </div>
            <div className="rounded-xl bg-amber-50/60 p-2.5 border border-amber-200">
              <span className="text-[10px] text-amber-700 font-semibold block uppercase">Duplicates</span>
              <span className="text-lg font-bold text-amber-800">{importSummary.duplicatesCount}</span>
            </div>
            <div className="rounded-xl bg-warm-100 p-2.5 border border-line">
              <span className="text-[10px] text-ink-600 font-semibold block uppercase">Total Handled</span>
              <span className="text-lg font-bold text-ink-900">{importSummary.totalRecords}</span>
            </div>
          </div>

          <div className="rounded-xl bg-warm-50 p-3 text-[11px] text-ink-600 leading-relaxed border border-line text-left">
            🔒 <strong>Moderation Rule:</strong> All {importSummary.importedCount} imported reviews are currently <strong>PENDING</strong> and unpublished. You can review, approve, tag, or feature them in your moderation queue.
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setStage("select-source");
                setFilePayload(null);
                setUploadFileName("");
                setPastedJson("");
              }}
              className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
            >
              Import Another Source
            </button>
            <Link
              href="/dashboard/testimonials?status=PENDING"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-600 transition-colors"
            >
              <span>Review in Moderation Queue</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
