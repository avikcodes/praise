"use client";

import { useState } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  FileUp,
  Hash,
  HelpCircle,
  ListPlus,
  Phone,
  Plus,
  Sliders,
  Sparkles,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { FieldValidationRules, FormFieldItem } from "@/types/form-builder";
import {
  PRESET_COMPANY_SIZES,
  PRESET_CUSTOMER_ROLES,
  PRESET_PRODUCT_PLANS,
} from "@/lib/forms/templates";
import { cn } from "@/lib/utils";

type AdvancedFieldModalProps = {
  isOpen: boolean;
  onClose: () => void;
  field: FormFieldItem;
  fieldIndex: number;
  totalFields: number;
  onSave: (updatedField: FormFieldItem) => void;
};

export function AdvancedFieldModal({
  isOpen,
  onClose,
  field,
  fieldIndex,
  totalFields,
  onSave,
}: AdvancedFieldModalProps) {
  const [label, setLabel] = useState(field.label);
  const [description, setDescription] = useState(field.description || "");
  const [helpText, setHelpText] = useState(field.helpText || "");
  const [placeholder, setPlaceholder] = useState(field.placeholder || "");
  const [isRequired, setIsRequired] = useState(field.isRequired);
  const [orderIndex, setOrderIndex] = useState(field.orderIndex ?? fieldIndex);

  // Options state (for choices/dropdowns/role/sizes)
  const parseOptions = (): string[] => {
    if (!field.optionsJson) return ["Option 1", "Option 2", "Option 3"];
    try {
      const parsed = JSON.parse(field.optionsJson);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      return field.optionsJson.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return ["Option 1", "Option 2"];
  };

  const [options, setOptions] = useState<string[]>(parseOptions);
  const [newOptionText, setNewOptionText] = useState("");

  // Validation rules state
  const parseValidationRules = (): FieldValidationRules => {
    if (!field.validationRulesJson) return {};
    try {
      return JSON.parse(field.validationRulesJson);
    } catch {
      return {};
    }
  };

  const [validationRules, setValidationRules] = useState<FieldValidationRules>(parseValidationRules);

  if (!isOpen) return null;

  const isOptionField = [
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "DROPDOWN",
    "CUSTOMER_ROLE",
    "COMPANY_SIZE",
    "PRODUCT_PLAN",
  ].includes(field.type);

  const handleAddOption = () => {
    if (!newOptionText.trim()) return;
    setOptions((prev) => [...prev, newOptionText.trim()]);
    setNewOptionText("");
  };

  const handleRemoveOption = (idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateOption = (idx: number, text: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === idx ? text : opt)));
  };

  const handleLoadPreset = (presetList: string[]) => {
    setOptions([...presetList]);
  };

  const handleSave = () => {
    onSave({
      ...field,
      label: label.trim() || field.label,
      description: description.trim() || null,
      helpText: helpText.trim() || null,
      placeholder: placeholder.trim() || null,
      isRequired,
      orderIndex: Number(orderIndex) || fieldIndex,
      optionsJson: isOptionField ? JSON.stringify(options) : field.optionsJson || null,
      validationRulesJson:
        Object.keys(validationRules).length > 0
          ? JSON.stringify(validationRules)
          : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex flex-col h-[90vh] max-h-[680px] w-full max-w-2xl rounded-2xl border border-line bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Sliders size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink-900">
                Advanced Field Settings: {field.label}
              </h3>
              <p className="text-[11px] text-ink-500">
                Configure custom ordering, contextual help text, option presets, and validation rules.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-400 hover:bg-warm-100 hover:text-ink-700"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Configuration Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. General & Label Configuration */}
          <div className="space-y-3 rounded-xl border border-line/70 bg-warm-50/40 p-4">
            <h4 className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
              <Type size={13} className="text-brand-600" />
              <span>Label, Description &amp; Help Text</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                  Field Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full rounded-lg border border-line bg-white p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                  Input Placeholder
                </label>
                <input
                  type="text"
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                  placeholder="e.g. Type your response here..."
                  className="w-full rounded-lg border border-line bg-white p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                Contextual Help Text (Displayed beneath the input)
              </label>
              <input
                type="text"
                value={helpText}
                onChange={(e) => setHelpText(e.target.value)}
                placeholder="e.g. We will never share or sell your phone number or email."
                className="w-full rounded-lg border border-line bg-white p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-[10px] text-ink-400 mt-1 block">
                Provides subtle guidance or privacy disclaimers right below the field.
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-line/40 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-ink-800">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                />
                <span>Mandatory / Required Field</span>
              </label>

              <div className="flex items-center gap-2 text-[11px] text-ink-600">
                <span>Display Order:</span>
                <input
                  type="number"
                  min={0}
                  max={totalFields - 1}
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(Number(e.target.value))}
                  className="w-16 rounded border border-line bg-white p-1 text-center font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* 2. Options Management (For choice / dropdown / role / size / plan fields) */}
          {isOptionField && (
            <div className="space-y-3 rounded-xl border border-line/70 bg-warm-50/40 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
                  <ListPlus size={13} className="text-brand-600" />
                  <span>Configured Choices ({options.length})</span>
                </h4>

                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  {field.type === "CUSTOMER_ROLE" && (
                    <button
                      type="button"
                      onClick={() => handleLoadPreset(PRESET_CUSTOMER_ROLES)}
                      className="rounded bg-white border border-line px-2 py-0.5 text-[10px] font-semibold text-ink-600 hover:text-brand-600"
                    >
                      Reset Roles
                    </button>
                  )}
                  {field.type === "COMPANY_SIZE" && (
                    <button
                      type="button"
                      onClick={() => handleLoadPreset(PRESET_COMPANY_SIZES)}
                      className="rounded bg-white border border-line px-2 py-0.5 text-[10px] font-semibold text-ink-600 hover:text-brand-600"
                    >
                      Reset Sizes
                    </button>
                  )}
                  {field.type === "PRODUCT_PLAN" && (
                    <button
                      type="button"
                      onClick={() => handleLoadPreset(PRESET_PRODUCT_PLANS)}
                      className="rounded bg-white border border-line px-2 py-0.5 text-[10px] font-semibold text-ink-600 hover:text-brand-600"
                    >
                      Reset Plans
                    </button>
                  )}
                </div>
              </div>

              {/* Options list */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleUpdateOption(idx, e.target.value)}
                      className="flex-1 rounded-lg border border-line bg-white p-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="rounded p-1 text-ink-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Remove option"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add option */}
              <div className="flex items-center gap-2 pt-1 border-t border-line/40">
                <input
                  type="text"
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                  placeholder="New option label..."
                  className="flex-1 rounded-lg border border-line bg-white p-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="inline-flex items-center gap-1 rounded-lg bg-warm-200 px-3 py-1.5 text-xs font-semibold text-ink-800 hover:bg-warm-300"
                >
                  <Plus size={12} />
                  <span>Add</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Type-Specific Validation Rules */}
          <div className="space-y-3 rounded-xl border border-line/70 bg-warm-50/40 p-4">
            <h4 className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
              <AlertCircle size={13} className="text-brand-600" />
              <span>Validation Rules &amp; Input Boundaries</span>
            </h4>

            {/* Numeric Rules */}
            {field.type === "NUMBER" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                    Minimum Value
                  </label>
                  <input
                    type="number"
                    value={validationRules.minNumber ?? ""}
                    onChange={(e) =>
                      setValidationRules((prev) => ({
                        ...prev,
                        minNumber: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    placeholder="e.g. 1"
                    className="w-full rounded-lg border border-line bg-white p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                    Maximum Value
                  </label>
                  <input
                    type="number"
                    value={validationRules.maxNumber ?? ""}
                    onChange={(e) =>
                      setValidationRules((prev) => ({
                        ...prev,
                        maxNumber: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    placeholder="e.g. 100"
                    className="w-full rounded-lg border border-line bg-white p-2 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Date Rules */}
            {field.type === "DATE" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                    Earliest Allowed Date
                  </label>
                  <input
                    type="date"
                    value={validationRules.minDate ?? ""}
                    onChange={(e) =>
                      setValidationRules((prev) => ({
                        ...prev,
                        minDate: e.target.value || undefined,
                      }))
                    }
                    className="w-full rounded-lg border border-line bg-white p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                    Latest Allowed Date
                  </label>
                  <input
                    type="date"
                    value={validationRules.maxDate ?? ""}
                    onChange={(e) =>
                      setValidationRules((prev) => ({
                        ...prev,
                        maxDate: e.target.value || undefined,
                      }))
                    }
                    className="w-full rounded-lg border border-line bg-white p-2 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Text Length Rules */}
            {["SHORT_TEXT", "LONG_TEXT", "LONG_FORM"].includes(field.type) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                    Minimum Characters
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={validationRules.minLength ?? ""}
                    onChange={(e) =>
                      setValidationRules((prev) => ({
                        ...prev,
                        minLength: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    placeholder="e.g. 10"
                    className="w-full rounded-lg border border-line bg-white p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                    Maximum Characters
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={validationRules.maxLength ?? ""}
                    onChange={(e) =>
                      setValidationRules((prev) => ({
                        ...prev,
                        maxLength: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    placeholder="e.g. 500"
                    className="w-full rounded-lg border border-line bg-white p-2 text-xs"
                  />
                </div>
              </div>
            )}

            {/* File Upload Rules */}
            {field.type === "FILE_UPLOAD" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                    Maximum File Size Limit (MB)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={validationRules.maxFileSizeMb ?? 10}
                    onChange={(e) =>
                      setValidationRules((prev) => ({
                        ...prev,
                        maxFileSizeMb: e.target.value ? Number(e.target.value) : 10,
                      }))
                    }
                    className="w-full sm:w-48 rounded-lg border border-line bg-white p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                    Allowed File Extensions (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={(validationRules.allowedExtensions || ["pdf", "png", "jpg", "jpeg", "docx"]).join(", ")}
                    onChange={(e) =>
                      setValidationRules((prev) => ({
                        ...prev,
                        allowedExtensions: e.target.value
                          .split(",")
                          .map((s) => s.trim().toLowerCase().replace(/^\./, ""))
                          .filter(Boolean),
                      }))
                    }
                    placeholder="e.g. pdf, docx, png, jpg"
                    className="w-full rounded-lg border border-line bg-white p-2 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* Custom Error Message */}
            <div>
              <label className="block text-[11px] font-semibold text-ink-800 mb-1">
                Custom Validation Error Message (Optional)
              </label>
              <input
                type="text"
                value={validationRules.customErrorMessage || ""}
                onChange={(e) =>
                  setValidationRules((prev) => ({
                    ...prev,
                    customErrorMessage: e.target.value || undefined,
                  }))
                }
                placeholder="e.g. Please provide a valid work email or positive number."
                className="w-full rounded-lg border border-line bg-white p-2 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line px-6 py-3.5 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
          >
            <Check size={13} />
            <span>Apply Field Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
