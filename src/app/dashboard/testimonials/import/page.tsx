"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileCode,
  FileSpreadsheet,
  Loader2,
  Mail,
  MessageSquareQuote,
  RefreshCw,
  Sparkles,
  Star,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import {
  autoGuessMappings,
  generateSampleCsv,
  generateSampleJson,
  parseCsvToRows,
  parseJsonToRows,
} from "@/lib/import/csv-parser";
import {
  DryRunResult,
  ImportResult,
  PRAISE_IMPORT_FIELDS,
  PraiseFieldKey,
} from "@/lib/import/types";

type Step = "upload" | "map" | "preview" | "results";

export default function ImportTestimonialsPage() {
  const toast = useToast();
  const { activeWorkspace, projects } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  // Wizard state
  const [currentStep, setCurrentStep] = useState<Step>("upload");

  // Step 1: File state
  const [fileName, setFileName] = useState("");
  const [fileSizeStr, setFileSizeStr] = useState("");
  const [fileType, setFileType] = useState<"csv" | "json">("csv");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);

  // Step 2: Mapping & settings
  const [mappings, setMappings] = useState<Record<string, PraiseFieldKey>>({});
  const [targetProjectId, setTargetProjectId] = useState<string>("auto");
  const [defaultStatus, setDefaultStatus] = useState<"PENDING" | "APPROVED">("PENDING");
  const [sourceTag, setSourceTag] = useState("CSV Import");

  // Step 3: Dry-run validation state
  const [isValidating, setIsValidating] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [skipInvalid, setSkipInvalid] = useState(true);

  // Step 4: Execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const content = generateSampleCsv();
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "praise-testimonials-sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sample Downloaded", "Sample CSV template ready for testing.");
  };

  // Download Sample JSON
  const handleDownloadSampleJson = () => {
    const content = generateSampleJson();
    const blob = new Blob([content], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "praise-testimonials-sample.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sample Downloaded", "Sample JSON template ready for testing.");
  };

  // Handle uploaded file
  const handleFileUpload = (file: File) => {
    // 1. File size validation (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(
        "File Too Large",
        "The uploaded file exceeds the 10MB limit. Please upload a smaller file."
      );
      return;
    }

    // 2. File type validation
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "json") {
      toast.error(
        "Invalid File Type",
        "Praise currently supports CSV (.csv) and JSON (.json) files."
      );
      return;
    }

    const detectedType = ext === "json" ? "json" : "csv";
    setFileType(detectedType);
    setFileName(file.name);
    setFileSizeStr((file.size / 1024).toFixed(1) + " KB");
    setSourceTag(detectedType === "json" ? "JSON Import" : "CSV Import");
    setIsParsingFile(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let parsed: { headers: string[]; rows: Record<string, string>[] };

        if (detectedType === "json") {
          parsed = parseJsonToRows(text);
        } else {
          parsed = parseCsvToRows(text);
        }

        if (parsed.headers.length === 0 || parsed.rows.length === 0) {
          toast.error(
            "Empty File",
            "No data rows could be detected in the uploaded file."
          );
          setIsParsingFile(false);
          return;
        }

        setRawHeaders(parsed.headers);
        setRawRows(parsed.rows);

        // Auto-guess initial field mappings
        const guessed = autoGuessMappings(parsed.headers);
        setMappings(guessed);

        toast.success(
          "File Parsed Successfully",
          `Found ${parsed.rows.length} rows and ${parsed.headers.length} columns.`
        );
        setCurrentStep("map");
      } catch (err: unknown) {
        console.error("File parse error:", err);
        toast.error(
          "Parsing Error",
          err instanceof Error ? err.message : "Failed to read the file structure."
        );
      } finally {
        setIsParsingFile(false);
      }
    };

    reader.onerror = () => {
      toast.error("File Read Error", "Could not read the selected file.");
      setIsParsingFile(false);
    };

    reader.readAsText(file);
  };

  // Step 2: Validate mapping and run dry-run validation
  const handleProceedToDryRun = async () => {
    if (!workspaceId) return;

    // Check that at least one column is mapped to "content"
    const hasContentMapping = Object.values(mappings).includes("content");
    if (!hasContentMapping) {
      toast.error(
        "Mapping Incomplete",
        "You must map at least one column to 'Testimonial Content / Review Text'."
      );
      return;
    }

    setIsValidating(true);
    try {
      // Transform raw rows into mapped records
      const mappedRecords = rawRows.map((row, idx) => {
        const record: Record<string, string | number | null> = { rowNumber: idx + 1 };
        for (const [header, praiseKey] of Object.entries(mappings)) {
          if (praiseKey !== "__ignore__") {
            record[praiseKey] = row[header] ?? null;
          }
        }
        return record;
      });

      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/import/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            records: mappedRecords,
            defaultProjectId: targetProjectId === "auto" ? null : targetProjectId,
            defaultStatus,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to validate records.");
      }

      setDryRunResult(data.dryRun);
      setCurrentStep("preview");
      toast.success(
        "Dry-Run Complete",
        `Validated ${data.dryRun.totalRows} records: ${data.dryRun.validCount} valid, ${data.dryRun.duplicateCount} duplicates.`
      );
    } catch (err: unknown) {
      console.error("Validation error:", err);
      toast.error(
        "Validation Failed",
        err instanceof Error ? err.message : "Error running dry-run validation."
      );
    } finally {
      setIsValidating(false);
    }
  };

  // Step 3: Execute final import
  const handleExecuteImport = async () => {
    if (!workspaceId || !dryRunResult) return;

    setIsImporting(true);
    try {
      // Filter records according to user toggle choices
      const recordsToImport = dryRunResult.records
        .filter((r) => {
          if (skipInvalid && r.validationErrors.length > 0) return false;
          if (skipDuplicates && r.isDuplicate) return false;
          return true;
        })
        .map((r) => ({
          rowNumber: r.rowNumber,
          content: r.content,
          customerName: r.customerName,
          customerEmail: r.customerEmail,
          customerCompany: r.customerCompany,
          customerTitle: r.customerTitle,
          customerWebsite: r.customerWebsite,
          customerAvatar: r.customerAvatar,
          rating: r.rating,
          submittedAt: r.submittedAt,
          projectName: r.projectName,
          tags: r.tags,
          source: r.source || sourceTag,
        }));

      if (recordsToImport.length === 0) {
        toast.error(
          "No Records to Import",
          "All records were excluded based on your duplicate or invalid filter settings."
        );
        setIsImporting(false);
        return;
      }

      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            records: recordsToImport,
            skipDuplicates,
            skipInvalid,
            defaultProjectId: targetProjectId === "auto" ? null : targetProjectId,
            defaultStatus,
            sourceLabel: sourceTag,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute import.");
      }

      setImportResult(data.result);
      setCurrentStep("results");
      toast.success(
        "Import Successful",
        `Imported ${data.result.successCount} testimonials into Praise.`
      );
    } catch (err: unknown) {
      console.error("Import execution error:", err);
      toast.error(
        "Import Failed",
        err instanceof Error ? err.message : "Could not complete the import process."
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Reset wizard to start over
  const handleReset = () => {
    setCurrentStep("upload");
    setFileName("");
    setRawHeaders([]);
    setRawRows([]);
    setMappings({});
    setDryRunResult(null);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Import Testimonials"
        description="Bulk import historical customer testimonials and reviews from CSV or JSON files."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/testimonials"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Back to Inbox</span>
            </Link>
          </div>
        }
      />

      {/* Step Indicator */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { id: "upload", label: "1. Upload File" },
            { id: "map", label: "2. Map Fields" },
            { id: "preview", label: "3. Dry-Run Validation" },
            { id: "results", label: "4. Summary & Results" },
          ].map((s, idx) => {
            const stepOrder = ["upload", "map", "preview", "results"];
            const currentIdx = stepOrder.indexOf(currentStep);
            const thisIdx = stepOrder.indexOf(s.id);
            const isCompleted = currentIdx > thisIdx;
            const isCurrent = currentStep === s.id;

            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                      ? "bg-brand-500 text-white shadow-xs"
                      : "bg-warm-100 text-ink-400"
                  }`}
                >
                  {isCompleted ? <Check size={14} /> : idx + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    isCurrent ? "text-ink-900 font-semibold" : "text-ink-500"
                  }`}
                >
                  {s.label}
                </span>
                {idx < 3 && (
                  <div
                    className={`h-0.5 w-6 sm:w-12 ml-2 transition-colors ${
                      isCompleted ? "bg-emerald-500" : "bg-warm-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: FILE UPLOAD */}
      {currentStep === "upload" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
            <h2 className="text-base font-semibold text-ink-900 mb-1">
              Select or Drop Your Import File
            </h2>
            <p className="text-xs text-ink-500 mb-6">
              Upload customer reviews exported from G2, Capterra, Trustpilot, Senja, or a custom spreadsheet.
            </p>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className="relative rounded-2xl border-2 border-dashed border-line hover:border-brand-500 bg-warm-50/40 hover:bg-warm-50 p-10 text-center transition-all cursor-pointer group"
            >
              <input
                type="file"
                accept=".csv,text/csv,.json,application/json"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-2xs border border-line mb-4 group-hover:scale-105 transition-transform text-brand-600">
                  {isParsingFile ? (
                    <Loader2 size={28} className="animate-spin text-brand-500" />
                  ) : (
                    <Upload size={28} />
                  )}
                </div>

                <h3 className="text-sm font-semibold text-ink-900">
                  {isParsingFile ? "Parsing file structure..." : "Click to browse or drag and drop your file here"}
                </h3>
                <p className="text-xs text-ink-400 mt-1">
                  Supported formats: CSV (.csv) or JSON (.json) up to 10MB
                </p>
              </div>
            </div>

            {/* Sample Templates Download */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-line text-xs">
              <span className="text-ink-500">
                Need a pre-formatted template to get started?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
                >
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  <span>Download Sample CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSampleJson}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
                >
                  <FileCode size={13} className="text-brand-600" />
                  <span>Download Sample JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* Guidelines Notice */}
          <div className="rounded-2xl border border-line bg-warm-50/60 p-5 text-xs text-ink-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-ink-900">
              <Sparkles size={16} className="text-brand-500" />
              <span>Import Safety Guarantees</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 leading-relaxed">
              <li>
                <strong>No Automatic Publishing:</strong> Imported testimonials default to pending moderation status so they won&apos;t accidentally display on your public widgets without review.
              </li>
              <li>
                <strong>Customer Deduplication:</strong> Existing customer profiles with matching emails are reused to prevent duplicate records.
              </li>
              <li>
                <strong>Unverified Marker:</strong> Imported testimonials are preserved with full source integrity and are clearly separated from direct Praise form verified submissions.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* STEP 2: FIELD MAPPING & SETTINGS */}
      {currentStep === "map" && (
        <div className="space-y-6">
          {/* File summary pill & Settings */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200 shrink-0">
                  {fileType === "json" ? <FileCode size={20} /> : <FileSpreadsheet size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">{fileName}</h3>
                  <p className="text-xs text-ink-500">
                    {rawRows.length} total rows detected &bull; {rawHeaders.length} columns &bull; {fileSizeStr}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-ink-500 hover:text-ink-800 transition-colors"
              >
                Change File
              </button>
            </div>

            {/* Global Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1">
                  Target Project
                </label>
                <select
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="auto">Auto-detect from row / Workspace Default</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-ink-400 mt-1">
                  Assign testimonials to a specific project or map dynamically from the file.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={defaultStatus}
                  onChange={(e) => setDefaultStatus(e.target.value as "PENDING" | "APPROVED")}
                  className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="PENDING">Pending (Recommended - Review first)</option>
                  <option value="APPROVED">Approved (Publishable on widgets)</option>
                </select>
                <p className="text-[10px] text-ink-400 mt-1">
                  We recommend Pending to review imported testimonials in your inbox.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1">
                  Source Label Tag
                </label>
                <input
                  type="text"
                  value={sourceTag}
                  onChange={(e) => setSourceTag(e.target.value)}
                  placeholder="e.g. G2, Capterra, CSV Import"
                  className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <p className="text-[10px] text-ink-400 mt-1">
                  Automatically attaches this tag to all imported testimonials.
                </p>
              </div>
            </div>
          </div>

          {/* Mapping Table */}
          <div className="rounded-2xl border border-line bg-white shadow-xs overflow-hidden">
            <div className="border-b border-line p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink-900">
                  Map File Columns to Praise Fields
                </h2>
                <p className="text-xs text-ink-500 mt-0.5">
                  Confirm how each incoming column should be interpreted. You can ignore columns you don&apos;t need.
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                <Sparkles size={13} />
                <span>Auto-mapped based on header names</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-warm-50/70 text-ink-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold w-1/4">Column in File</th>
                    <th className="py-3 px-4 font-semibold w-2/5">Sample Values (First 3 Rows)</th>
                    <th className="py-3 px-4 font-semibold w-1/3">Target Praise Field</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rawHeaders.map((header) => {
                    const currentMapping = mappings[header] || "__ignore__";
                    const samples = rawRows
                      .slice(0, 3)
                      .map((r) => r[header])
                      .filter(Boolean);

                    const isContentField = currentMapping === "content";

                    return (
                      <tr key={header} className="hover:bg-warm-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-ink-900">{header}</span>
                        </td>

                        <td className="py-3 px-4">
                          {samples.length > 0 ? (
                            <div className="space-y-0.5 max-w-md truncate">
                              {samples.map((s, i) => (
                                <div key={i} className="text-ink-600 truncate text-[11px]" title={s}>
                                  &bull; {s}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-ink-400 italic text-[11px]">No sample data</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={currentMapping}
                              onChange={(e) =>
                                setMappings((prev) => ({
                                  ...prev,
                                  [header]: e.target.value as PraiseFieldKey,
                                }))
                              }
                              className={`w-full rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                isContentField
                                  ? "border-brand-500 bg-brand-50/40 text-brand-900 font-semibold"
                                  : currentMapping === "__ignore__"
                                  ? "border-line bg-warm-50 text-ink-400"
                                  : "border-line bg-white text-ink-800"
                              } focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500`}
                            >
                              <option value="__ignore__">&mdash; Do Not Import (Ignore) &mdash;</option>
                              {PRAISE_IMPORT_FIELDS.map((f) => (
                                <option key={f.key} value={f.key}>
                                  {f.label} {f.required ? "(Required)" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 sm:p-5 border-t border-line bg-warm-50/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep("upload")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
              >
                <ArrowLeft size={13} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToDryRun}
                disabled={isValidating || !Object.values(mappings).includes("content")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50 shadow-xs"
              >
                {isValidating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ArrowRight size={14} />
                )}
                <span>Run Dry-Run Validation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: DRY-RUN VALIDATION & PREVIEW */}
      {currentStep === "preview" && dryRunResult && (
        <div className="space-y-6">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-medium text-ink-400 uppercase tracking-wider block">
                Total Rows
              </span>
              <span className="text-xl font-bold text-ink-900 mt-0.5 block">
                {dryRunResult.totalRows}
              </span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs">
              <span className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider block">
                Valid Records
              </span>
              <span className="text-xl font-bold text-emerald-800 mt-0.5 block">
                {dryRunResult.validCount}
              </span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-xs">
              <span className="text-[10px] font-medium text-amber-700 uppercase tracking-wider block">
                Likely Duplicates
              </span>
              <span className="text-xl font-bold text-amber-800 mt-0.5 block">
                {dryRunResult.duplicateCount}
              </span>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-xs">
              <span className="text-[10px] font-medium text-rose-700 uppercase tracking-wider block">
                Invalid Rows
              </span>
              <span className="text-xl font-bold text-rose-800 mt-0.5 block">
                {dryRunResult.invalidCount}
              </span>
            </div>

            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-medium text-ink-400 uppercase tracking-wider block">
                New Customers
              </span>
              <span className="text-xl font-bold text-ink-900 mt-0.5 block">
                {dryRunResult.newCustomersCount}
              </span>
            </div>

            <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-medium text-ink-400 uppercase tracking-wider block">
                New Tags
              </span>
              <span className="text-xl font-bold text-ink-900 mt-0.5 block">
                {dryRunResult.newTagsCount}
              </span>
            </div>
          </div>

          {/* Validation Options Bar */}
          <div className="rounded-2xl border border-line bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-ink-800 font-medium">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <span>Skip likely duplicates ({dryRunResult.duplicateCount})</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-ink-800 font-medium">
                <input
                  type="checkbox"
                  checked={skipInvalid}
                  onChange={(e) => setSkipInvalid(e.target.checked)}
                  className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <span>Skip invalid rows ({dryRunResult.invalidCount})</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep("map")}
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
              >
                Back to Mapping
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-xs disabled:opacity-50"
              >
                {isImporting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                <span>Confirm &amp; Import Testimonials</span>
              </button>
            </div>
          </div>

          {/* Error Summary Accordion (if any) */}
          {dryRunResult.errors.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs">
                <AlertTriangle size={15} />
                <span>Validation Notices ({dryRunResult.errors.length})</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                {dryRunResult.errors.map((err, i) => (
                  <div key={i} className="text-rose-700 text-[11px] flex items-start gap-1.5">
                    <span className="font-mono font-semibold">Row {err.rowNumber}:</span>
                    <span>{err.error}</span>
                    {err.snippet && <span className="text-rose-500 italic truncate">&mdash; &ldquo;{err.snippet}&rdquo;</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Records Preview Table */}
          <div className="rounded-2xl border border-line bg-white shadow-xs overflow-hidden">
            <div className="border-b border-line p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-ink-900">
                Parsed Records Preview ({dryRunResult.records.length})
              </h2>
              <p className="text-xs text-ink-500 mt-0.5">
                Review how your data will be saved. Duplicate records and validation errors are flagged below.
              </p>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-line bg-warm-50 text-ink-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold w-12">#</th>
                    <th className="py-3 px-4 font-semibold w-28">Status</th>
                    <th className="py-3 px-4 font-semibold w-48">Customer</th>
                    <th className="py-3 px-4 font-semibold">Testimonial Content</th>
                    <th className="py-3 px-4 font-semibold w-24">Rating</th>
                    <th className="py-3 px-4 font-semibold w-28">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {dryRunResult.records.map((r) => {
                    const hasError = r.validationErrors.length > 0;
                    return (
                      <tr
                        key={r.rowNumber}
                        className={`hover:bg-warm-50/50 transition-colors ${
                          hasError
                            ? "bg-rose-50/20"
                            : r.isDuplicate
                            ? "bg-amber-50/20"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-mono text-ink-400 text-[11px]">
                          {r.rowNumber}
                        </td>

                        <td className="py-3 px-4">
                          {hasError ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                              <XCircle size={11} />
                              <span>Invalid</span>
                            </span>
                          ) : r.isDuplicate ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                              title={r.duplicateReason || "Likely duplicate"}
                            >
                              <AlertTriangle size={11} />
                              <span>Duplicate</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              <CheckCircle2 size={11} />
                              <span>Valid</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-ink-900">{r.customerName}</div>
                          <div className="text-[11px] text-ink-500 flex flex-col gap-0.5">
                            {r.customerEmail && (
                              <span className="flex items-center gap-1">
                                <Mail size={10} className="text-ink-400" />
                                <span>{r.customerEmail}</span>
                              </span>
                            )}
                            {(r.customerCompany || r.customerTitle) && (
                              <span className="flex items-center gap-1 text-ink-400">
                                <Building2 size={10} />
                                <span>{[r.customerTitle, r.customerCompany].filter(Boolean).join(", ")}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-xs text-ink-800 line-clamp-2 italic" title={r.content}>
                            &ldquo;{r.content}&rdquo;
                          </div>
                          {hasError && (
                            <div className="text-[10px] text-rose-600 mt-1 font-medium">
                              {r.validationErrors.join(" ")}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={11}
                                className={
                                  s <= r.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-ink-200 fill-transparent"
                                }
                              />
                            ))}
                            <span className="text-[10px] font-semibold text-ink-600 ml-1">
                              {r.rating}★
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {r.tags.map((t, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center rounded-sm bg-warm-100 px-1.5 py-0.2 text-[9px] font-medium text-ink-700"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORT RESULTS & SUMMARY */}
      {currentStep === "results" && importResult && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-8 text-center shadow-xs">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-ink-900">
              Import Completed Successfully!
            </h2>
            <p className="text-xs text-ink-600 mt-1 max-w-md mx-auto">
              Your testimonials have been imported into Praise with full data integrity.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto mt-6 text-left">
              <div className="rounded-xl border border-emerald-200 bg-white p-3 shadow-2xs">
                <span className="text-[10px] font-medium text-emerald-700 uppercase block">
                  Imported
                </span>
                <span className="text-xl font-bold text-emerald-800 mt-0.5 block">
                  {importResult.successCount}
                </span>
              </div>

              <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
                <span className="text-[10px] font-medium text-ink-400 uppercase block">
                  Duplicates Skipped
                </span>
                <span className="text-xl font-bold text-ink-800 mt-0.5 block">
                  {importResult.skippedDuplicatesCount}
                </span>
              </div>

              <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
                <span className="text-[10px] font-medium text-ink-400 uppercase block">
                  Failed Records
                </span>
                <span className="text-xl font-bold text-ink-800 mt-0.5 block">
                  {importResult.failedCount}
                </span>
              </div>

              <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
                <span className="text-[10px] font-medium text-ink-400 uppercase block">
                  Customers Created
                </span>
                <span className="text-xl font-bold text-ink-800 mt-0.5 block">
                  {importResult.createdCustomersCount}
                </span>
              </div>

              <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
                <span className="text-[10px] font-medium text-ink-400 uppercase block">
                  Tags Created
                </span>
                <span className="text-xl font-bold text-ink-800 mt-0.5 block">
                  {importResult.createdTagsCount}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <Link
                href="/dashboard/testimonials"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
              >
                <MessageSquareQuote size={14} />
                <span>Go to Testimonial Inbox</span>
              </Link>
              <Link
                href="/dashboard/customers"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
              >
                <Users size={14} />
                <span>View Customer Profiles</span>
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
              >
                <RefreshCw size={13} />
                <span>Import Another File</span>
              </button>
            </div>
          </div>

          {/* Failed Records List if any */}
          {importResult.failures.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-white shadow-xs p-5 space-y-3">
              <h3 className="text-sm font-semibold text-rose-800 flex items-center gap-1.5">
                <XCircle size={15} />
                <span>Failed Records ({importResult.failures.length})</span>
              </h3>
              <p className="text-xs text-ink-500">
                These records could not be imported and were not discarded silently:
              </p>
              <div className="divide-y divide-line border border-line rounded-xl overflow-hidden">
                {importResult.failures.map((f, i) => (
                  <div key={i} className="p-3 text-xs bg-warm-50/40 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-ink-900">Row {f.rowNumber}:</span>{" "}
                      <span className="text-rose-600 font-medium">{f.error}</span>
                      {f.snippet && (
                        <div className="text-[11px] text-ink-500 italic mt-0.5">
                          &ldquo;{f.snippet}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

