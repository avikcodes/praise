"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { StatusPill } from "@/components/dashboard/status-pill";
import { useToast } from "@/components/dashboard/toast-context";
import { CollectionFormDetail, FormFieldItem } from "@/types/form-builder";
import {
  DEFAULT_LANGUAGE,
  getLanguageConfig,
  LanguageConfig,
  SUPPORTED_LANGUAGES,
} from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

interface FormTranslationRecord {
  id: string;
  formId: string;
  language: string;
  languageConfig: LanguageConfig;
  title: string;
  description?: string | null;
  headerPrompt: string;
  thankYouMessage?: string | null;
  consentText?: string | null;
  videoInstructions?: string | null;
  fieldTranslations: Record<
    string,
    { label?: string; description?: string; placeholder?: string }
  >;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormLanguagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: CollectionFormDetail | null;
  workspaceId: string;
  onUpdate?: () => void;
}

export function FormLanguagesModal({
  isOpen,
  onClose,
  form,
  workspaceId,
  onUpdate,
}: FormLanguagesModalProps) {
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [translations, setTranslations] = useState<FormTranslationRecord[]>([]);
  const [defaultLanguage, setDefaultLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [defaultLanguageConfig, setDefaultLanguageConfig] = useState<LanguageConfig>(
    getLanguageConfig(DEFAULT_LANGUAGE),
  );

  // Editor mode: null = list, "create" | langCode = editing
  const [activeLangEdit, setActiveLangEdit] = useState<string | null>(null);

  // Form translation editor state
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThankYou, setEditThankYou] = useState("");
  const [editConsent, setEditConsent] = useState("");
  const [editVideoInstructions, setEditVideoInstructions] = useState("");
  const [editFieldTranslations, setEditFieldTranslations] = useState<
    Record<string, { label: string; description: string; placeholder: string }>
  >({});
  const [editIsPublished, setEditIsPublished] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch translations for this form
  const fetchTranslations = async () => {
    if (!form || !workspaceId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/forms/${form.id}/translations`);
      if (res.ok) {
        const data = await res.json();
        setTranslations(data.translations || []);
        if (data.defaultLanguage) {
          setDefaultLanguage(data.defaultLanguage);
          setDefaultLanguageConfig(data.defaultLanguageConfig || getLanguageConfig(data.defaultLanguage));
        }
      }
    } catch {
      toast.error("Error", "Could not load translations for this form.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && form) {
      fetchTranslations();
      setActiveLangEdit(null);
    }
  }, [isOpen, form?.id]);

  if (!form) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Available languages not yet added as translation
  const existingLangCodes = new Set([
    defaultLanguage,
    ...translations.map((t) => t.language.toLowerCase()),
  ]);

  const candidateLanguages = SUPPORTED_LANGUAGES.filter(
    (l) => !existingLangCodes.has(l.code),
  );

  const startCreateVariant = () => {
    const firstAvailable = candidateLanguages[0]?.code || "";
    setSelectedLanguage(firstAvailable);
    setEditTitle(form.title || "");
    setEditPrompt(form.headerPrompt || "");
    setEditDescription(form.description || "");
    setEditThankYou(form.thankYouMessage || "");
    setEditConsent(form.consentText || "");
    setEditVideoInstructions(form.videoInstructions || "");

    const initialFieldMap: Record<string, { label: string; description: string; placeholder: string }> = {};
    (form.fields || []).forEach((f, idx) => {
      const fieldId = f.id || `field_${idx}`;
      initialFieldMap[fieldId] = {
        label: f.label || "",
        description: f.description || "",
        placeholder: f.placeholder || "",
      };
    });
    setEditFieldTranslations(initialFieldMap);
    setEditIsPublished(true);
    setActiveLangEdit("create");
  };

  const startEditVariant = (variant: FormTranslationRecord) => {
    setSelectedLanguage(variant.language);
    setEditTitle(variant.title || form.title || "");
    setEditPrompt(variant.headerPrompt || form.headerPrompt || "");
    setEditDescription(variant.description || form.description || "");
    setEditThankYou(variant.thankYouMessage || form.thankYouMessage || "");
    setEditConsent(variant.consentText || form.consentText || "");
    setEditVideoInstructions(variant.videoInstructions || form.videoInstructions || "");

    const initialFieldMap: Record<string, { label: string; description: string; placeholder: string }> = {};
    (form.fields || []).forEach((f, idx) => {
      const fieldId = f.id || `field_${idx}`;
      const existingF = variant.fieldTranslations?.[fieldId];
      initialFieldMap[fieldId] = {
        label: existingF?.label ?? f.label ?? "",
        description: existingF?.description ?? f.description ?? "",
        placeholder: existingF?.placeholder ?? f.placeholder ?? "",
      };
    });
    setEditFieldTranslations(initialFieldMap);
    setEditIsPublished(variant.isPublished);
    setActiveLangEdit(variant.language);
  };

  const handleSaveTranslation = async () => {
    if (!selectedLanguage) {
      toast.error("Language Required", "Please select a language for this translation variant.");
      return;
    }
    if (!editTitle.trim() || !editPrompt.trim()) {
      toast.error("Missing Fields", "Form title and header prompt translations are required.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/forms/${form.id}/translations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          title: editTitle.trim(),
          headerPrompt: editPrompt.trim(),
          description: editDescription.trim() || null,
          thankYouMessage: editThankYou.trim() || null,
          consentText: editConsent.trim() || null,
          videoInstructions: editVideoInstructions.trim() || null,
          fieldTranslations: editFieldTranslations,
          isPublished: editIsPublished,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(
          "Variant Saved",
          `Translation for ${getLanguageConfig(selectedLanguage).name} saved successfully.`,
        );
        await fetchTranslations();
        setActiveLangEdit(null);
        onUpdate?.();
      } else {
        toast.error("Save Failed", data.error || "Could not save translation variant.");
      }
    } catch {
      toast.error("Network Error", "An error occurred while saving the translation.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVariant = async (langCode: string) => {
    setIsDeleting(langCode);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/forms/${form.id}/translations/${langCode}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        toast.success(
          "Variant Removed",
          `Language variant removed. Underlying form identity and past submissions are preserved.`,
        );
        await fetchTranslations();
        if (activeLangEdit === langCode) setActiveLangEdit(null);
        onUpdate?.();
      } else {
        const data = await res.json();
        toast.error("Delete Failed", data.error || "Could not delete translation.");
      }
    } catch {
      toast.error("Network Error", "An error occurred while deleting the translation.");
    } finally {
      setIsDeleting(null);
    }
  };

  const copyLink = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success("Link Copied", "Public localized link copied to clipboard.");
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Language Variants & Localization"
      description={`Manage multilingual translations for "${form.title}" while preserving a unified form identity.`}
      maxWidth="3xl"
    >
      <div className="space-y-6 pt-2">
        {/* Core Identity Integrity Badge */}
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3.5 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-brand-900 font-semibold">
            <span className="flex items-center gap-1.5">
              <span>Form Identity (UUID):</span>
              <code className="bg-white/80 px-2 py-0.5 rounded font-mono text-[11px] text-ink-800 border border-brand-200">
                {form.id}
              </code>
            </span>
            <span className="rounded-full bg-brand-100 text-brand-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Unified Mapping
            </span>
          </div>
          <p className="text-[11px] text-ink-600 leading-relaxed">
            All language variants preserve the exact same form identity and field mappings. Submissions in any language feed into the same analytics and testimonial records without duplicating projects.
          </p>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: TRANSLATIONS LIST & OVERVIEW */}
        {/* ------------------------------------------------------------- */}
        {!activeLangEdit && (
          <div className="space-y-4">
            {/* Base Language Card */}
            <div className="rounded-xl border border-line bg-warm-50/70 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl leading-none">{defaultLanguageConfig.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-ink-900">
                        {defaultLanguageConfig.name} ({defaultLanguageConfig.nativeName})
                      </h4>
                      <span className="rounded bg-warm-200 px-1.5 py-0.5 text-[10px] font-semibold text-ink-700">
                        Base Language
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-500 mt-0.5">
                      Primary language configured for this collection form.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyLink(`${origin}/p/${form.slug}`, "base")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
                  >
                    {copiedKey === "base" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copiedKey === "base" ? "Copied" : "Copy Link"}</span>
                  </button>
                  <a
                    href={`/p/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-1.5 text-ink-500 hover:bg-warm-100 hover:text-ink-900 transition-colors"
                    title="Open public form"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>

            {/* Language Variants Header */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h4 className="text-xs font-bold text-ink-900">Translated Language Variants</h4>
                <p className="text-[11px] text-ink-500">
                  {translations.length} active language variant{translations.length === 1 ? "" : "s"}
                </p>
              </div>

              {candidateLanguages.length > 0 && (
                <button
                  type="button"
                  onClick={startCreateVariant}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-2xs"
                >
                  <Plus size={13} />
                  <span>Add Language Variant</span>
                </button>
              )}
            </div>

            {/* Variants Table / List */}
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 size={20} className="animate-spin text-brand-600 mx-auto mb-2" />
                <span className="text-xs text-ink-500">Loading language variants...</span>
              </div>
            ) : translations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-8 text-center space-y-2">
                <Globe size={28} className="text-ink-300 mx-auto" />
                <h5 className="text-xs font-bold text-ink-800">No Translations Created Yet</h5>
                <p className="text-[11px] text-ink-500 max-w-sm mx-auto">
                  Add translated versions of your form in Spanish, French, German, Japanese, Arabic, and more. Visitors will automatically be greeted in their preferred language.
                </p>
                {candidateLanguages.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={startCreateVariant}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-2xs"
                    >
                      <Plus size={13} />
                      <span>Create First Translation</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-line/60 rounded-xl border border-line bg-white shadow-2xs overflow-hidden">
                {translations.map((variant) => {
                  const cfg = variant.languageConfig || getLanguageConfig(variant.language);
                  const localizedQueryUrl = `${origin}/p/${form.slug}?lang=${variant.language}`;
                  const localizedPathUrl = `${origin}/p/${form.slug}/${variant.language}`;

                  return (
                    <div
                      key={variant.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-warm-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl leading-none">{cfg.flag}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-ink-900">
                              {cfg.name} ({cfg.nativeName})
                            </span>
                            <StatusPill
                              status={variant.isPublished ? "Published" : "Draft"}
                              variant={variant.isPublished ? "active" : "draft"}
                            />
                            {cfg.dir === "rtl" && (
                              <span className="rounded bg-indigo-50 text-indigo-700 px-1.5 py-0.5 text-[9px] font-bold border border-indigo-200">
                                RTL
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-ink-500 mt-0.5 flex items-center gap-3">
                            <span>Title: &ldquo;{variant.title}&rdquo;</span>
                            <span>&bull;</span>
                            <span className="font-mono text-ink-400">/{variant.language}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => copyLink(localizedPathUrl, variant.language)}
                          title="Copy direct localized URL (/p/slug/locale)"
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-xs font-medium text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
                        >
                          {copiedKey === variant.language ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                          <span>{copiedKey === variant.language ? "Copied" : "Copy URL"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditVariant(variant)}
                          className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(variant.language)}
                          disabled={isDeleting === variant.language}
                          className="rounded-lg p-1 text-ink-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-40"
                          title="Remove language variant"
                        >
                          {isDeleting === variant.language ? (
                            <Loader2 size={13} className="animate-spin text-rose-600" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: TRANSLATION EDITOR (SIDE-BY-SIDE / TABBED) */}
        {/* ------------------------------------------------------------- */}
        {activeLangEdit && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLangEdit(null)}
                  className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-warm-100 transition-colors"
                >
                  &larr; Back to Variants
                </button>
                <h4 className="text-xs font-bold text-ink-900">
                  {activeLangEdit === "create" ? "Add New Translation Variant" : "Edit Translation"}
                </h4>
              </div>

              {/* Publish Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink-800">
                <input
                  type="checkbox"
                  checked={editIsPublished}
                  onChange={(e) => setEditIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                />
                <span>Publish Variant</span>
              </label>
            </div>

            {/* Language Selector */}
            {activeLangEdit === "create" && (
              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">
                  Target Language
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full sm:w-72 rounded-lg border border-line bg-white p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {candidateLanguages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name} — {l.nativeName} ({l.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* General Form Fields Translation */}
            <div className="space-y-4 rounded-xl border border-line bg-warm-50/40 p-4">
              <h5 className="text-xs font-bold text-ink-900 border-b border-line/60 pb-1.5">
                Form Core Content Translation
              </h5>

              {/* Form Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-ink-800">
                    Form Title <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-ink-400">
                    Original: &ldquo;{form.title}&rdquo;
                  </span>
                </div>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Translated form title..."
                  className="w-full rounded-lg border border-line bg-white p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Header Prompt */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-ink-800">
                    Header Prompt <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-ink-400 truncate max-w-xs">
                    Original: &ldquo;{form.headerPrompt}&rdquo;
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Translated header prompt..."
                  className="w-full rounded-lg border border-line bg-white p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-ink-800">
                    Description (Optional)
                  </label>
                  {form.description && (
                    <span className="text-[10px] text-ink-400 truncate max-w-xs">
                      Original: &ldquo;{form.description}&rdquo;
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Translated form description..."
                  className="w-full rounded-lg border border-line bg-white p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Thank You Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-ink-800">
                    Thank You Message
                  </label>
                  {form.thankYouMessage && (
                    <span className="text-[10px] text-ink-400 truncate max-w-xs">
                      Original: &ldquo;{form.thankYouMessage}&rdquo;
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={editThankYou}
                  onChange={(e) => setEditThankYou(e.target.value)}
                  placeholder="Translated confirmation and appreciation message..."
                  className="w-full rounded-lg border border-line bg-white p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Consent Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-ink-800">
                    Consent Agreement Text
                  </label>
                  {form.consentText && (
                    <span className="text-[10px] text-ink-400 truncate max-w-xs">
                      Original: &ldquo;{form.consentText}&rdquo;
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={editConsent}
                  onChange={(e) => setEditConsent(e.target.value)}
                  placeholder="Translated marketing consent disclaimer..."
                  className="w-full rounded-lg border border-line bg-white p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Video Instructions */}
              {form.allowVideo && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-ink-800">
                      Video Instructions (Optional)
                    </label>
                    {form.videoInstructions && (
                      <span className="text-[10px] text-ink-400 truncate max-w-xs">
                        Original: &ldquo;{form.videoInstructions}&rdquo;
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editVideoInstructions}
                    onChange={(e) => setEditVideoInstructions(e.target.value)}
                    placeholder="Translated guidance for video recording..."
                    className="w-full rounded-lg border border-line bg-white p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              )}
            </div>

            {/* Custom Field Translations */}
            {form.fields && form.fields.length > 0 && (
              <div className="space-y-4 rounded-xl border border-line bg-warm-50/40 p-4">
                <div>
                  <h5 className="text-xs font-bold text-ink-900">
                    Custom Question Translations
                  </h5>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    Field IDs and question types are preserved identically. Only display text is localized.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  {form.fields.map((f, idx) => {
                    const fieldId = f.id || `field_${idx}`;
                    const currentTranslation = editFieldTranslations[fieldId] || {
                      label: f.label || "",
                      description: f.description || "",
                      placeholder: f.placeholder || "",
                    };

                    return (
                      <div
                        key={fieldId}
                        className="rounded-lg border border-line bg-white p-3 space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-ink-900">
                            Question #{idx + 1}: &ldquo;{f.label}&rdquo;
                          </span>
                          <span className="rounded bg-warm-100 text-ink-600 px-1.5 py-0.5 text-[10px] font-mono">
                            {f.type}
                          </span>
                        </div>

                        {/* Translated Label */}
                        <div>
                          <label className="block text-[11px] font-medium text-ink-700 mb-0.5">
                            Translated Question Label
                          </label>
                          <input
                            type="text"
                            value={currentTranslation.label}
                            onChange={(e) =>
                              setEditFieldTranslations((prev) => ({
                                ...prev,
                                [fieldId]: { ...currentTranslation, label: e.target.value },
                              }))
                            }
                            className="w-full rounded border border-line p-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </div>

                        {/* Translated Placeholder */}
                        <div>
                          <label className="block text-[11px] font-medium text-ink-700 mb-0.5">
                            Translated Placeholder (Optional)
                          </label>
                          <input
                            type="text"
                            value={currentTranslation.placeholder}
                            onChange={(e) =>
                              setEditFieldTranslations((prev) => ({
                                ...prev,
                                [fieldId]: { ...currentTranslation, placeholder: e.target.value },
                              }))
                            }
                            className="w-full rounded border border-line p-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setActiveLangEdit(null)}
                className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTranslation}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-2xs disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Save Translation Variant</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalDialog>
  );
}
