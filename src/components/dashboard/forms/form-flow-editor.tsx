"use client";

import { useId, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  GitBranch,
  HelpCircle,
  Layers,
  ListPlus,
  Plus,
  SlidersHorizontal,
  Split,
  Trash2,
  X,
} from "lucide-react";
import {
  FlowBranchRule,
  FlowCondition,
  FlowConditionGroup,
  FlowConditionOperator,
  FormFlowConfig,
  FormStep,
  FormStepSection,
  STANDARD_FLOW_FIELDS,
  detectCycles,
  validateFlowConfig,
} from "@/lib/forms/flow-engine";
import { FormFieldItem } from "@/types/form-builder";
import { cn } from "@/lib/utils";

type FormFlowEditorProps = {
  flowConfig: FormFlowConfig;
  onChange: (updatedConfig: FormFlowConfig) => void;
  availableCustomFields: FormFieldItem[];
  accentColor?: string;
};

const OPERATOR_LABELS: Record<FlowConditionOperator, string> = {
  EQUALS: "Equals",
  NOT_EQUALS: "Does not equal",
  CONTAINS: "Contains text",
  GREATER_THAN: "Greater than (numeric)",
  LESS_THAN: "Less than (numeric)",
  IS_EMPTY: "Is empty / unanswered",
  IS_NOT_EMPTY: "Is answered / not empty",
};

export function FormFlowEditor({
  flowConfig,
  onChange,
  availableCustomFields,
  accentColor = "#7049D8",
}: FormFlowEditorProps) {
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [showCycleDetails, setShowCycleDetails] = useState(false);

  // Combine standard and custom field definitions for condition and allocation dropdowns
  const allFieldOptions = [
    ...STANDARD_FLOW_FIELDS.map((f) => ({
      id: f.id,
      label: `[Standard] ${f.label}`,
      category: f.category,
    })),
    ...availableCustomFields.map((f, idx) => ({
      id: f.id || `custom_${idx}`,
      label: `[Question] ${f.label}`,
      category: "Custom",
    })),
  ];

  const currentStep = flowConfig.steps[selectedStepIndex] || flowConfig.steps[0];

  // Cycle check
  const cycleLoop = detectCycles(flowConfig.steps);
  const validation = validateFlowConfig(flowConfig);

  const updateSteps = (newSteps: FormStep[]) => {
    onChange({
      ...flowConfig,
      steps: newSteps,
    });
  };

  const handleAddStep = () => {
    const newStepId = `step_${Date.now().toString(36)}`;
    const newStep: FormStep = {
      id: newStepId,
      title: `Step ${flowConfig.steps.length + 1}`,
      description: "Provide additional details",
      sections: [
        {
          id: `sec_${Date.now().toString(36)}`,
          title: "Section 1",
          fieldIds: [],
        },
      ],
      branchRules: [],
    };
    const updated = [...flowConfig.steps, newStep];
    updateSteps(updated);
    setSelectedStepIndex(updated.length - 1);
  };

  const handleDeleteStep = (indexToDelete: number) => {
    if (flowConfig.steps.length <= 1) return;
    const deletedId = flowConfig.steps[indexToDelete].id;
    // Remove references to deletedId in other steps' branchRules
    const updated = flowConfig.steps
      .filter((_, idx) => idx !== indexToDelete)
      .map((s) => ({
        ...s,
        branchRules: s.branchRules?.filter((r) => r.targetStepId !== deletedId),
        defaultNextStepId: s.defaultNextStepId === deletedId ? undefined : s.defaultNextStepId,
      }));

    updateSteps(updated);
    setSelectedStepIndex(Math.max(0, indexToDelete - 1));
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === flowConfig.steps.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...flowConfig.steps];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    updateSteps(reordered);
    setSelectedStepIndex(targetIndex);
  };

  const handleUpdateCurrentStep = (updates: Partial<FormStep>) => {
    if (!currentStep) return;
    const updated = flowConfig.steps.map((s, idx) =>
      idx === selectedStepIndex ? { ...s, ...updates } : s
    );
    updateSteps(updated);
  };

  // Section Handlers
  const handleAddSection = () => {
    if (!currentStep) return;
    const newSection: FormStepSection = {
      id: `sec_${Date.now().toString(36)}`,
      title: `Section ${currentStep.sections.length + 1}`,
      fieldIds: [],
    };
    handleUpdateCurrentStep({
      sections: [...currentStep.sections, newSection],
    });
  };

  const handleUpdateSection = (
    sectionId: string,
    updates: Partial<FormStepSection>
  ) => {
    if (!currentStep) return;
    const updatedSections = currentStep.sections.map((sec) =>
      sec.id === sectionId ? { ...sec, ...updates } : sec
    );
    handleUpdateCurrentStep({ sections: updatedSections });
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!currentStep || currentStep.sections.length <= 1) return;
    const updatedSections = currentStep.sections.filter((s) => s.id !== sectionId);
    handleUpdateCurrentStep({ sections: updatedSections });
  };

  const toggleFieldInSection = (sectionId: string, fieldId: string) => {
    if (!currentStep) return;
    const updatedSections = currentStep.sections.map((sec) => {
      if (sec.id === sectionId) {
        const hasField = sec.fieldIds.includes(fieldId);
        return {
          ...sec,
          fieldIds: hasField
            ? sec.fieldIds.filter((id) => id !== fieldId)
            : [...sec.fieldIds, fieldId],
        };
      }
      // If adding to this section, remove it from other sections of the same step
      return {
        ...sec,
        fieldIds: sec.fieldIds.filter((id) => id !== fieldId),
      };
    });
    handleUpdateCurrentStep({ sections: updatedSections });
  };

  // Branch Rule Handlers
  const handleAddBranchRule = () => {
    if (!currentStep) return;
    const availableTargets = flowConfig.steps.filter((s) => s.id !== currentStep.id);
    if (availableTargets.length === 0) return;

    const newRule: FlowBranchRule = {
      id: `rule_${Date.now().toString(36)}`,
      conditionGroup: {
        match: "ALL",
        conditions: [
          {
            fieldId: allFieldOptions[0]?.id || "rating",
            operator: "EQUALS",
            value: 5,
          },
        ],
      },
      targetStepId: availableTargets[0].id,
    };

    handleUpdateCurrentStep({
      branchRules: [...(currentStep.branchRules || []), newRule],
    });
  };

  const handleUpdateBranchRule = (
    ruleId: string,
    updates: Partial<FlowBranchRule>
  ) => {
    if (!currentStep || !currentStep.branchRules) return;
    const updatedRules = currentStep.branchRules.map((r) =>
      r.id === ruleId ? { ...r, ...updates } : r
    );
    handleUpdateCurrentStep({ branchRules: updatedRules });
  };

  const handleDeleteBranchRule = (ruleId: string) => {
    if (!currentStep || !currentStep.branchRules) return;
    const updatedRules = currentStep.branchRules.filter((r) => r.id !== ruleId);
    handleUpdateCurrentStep({ branchRules: updatedRules });
  };

  // Condition Handlers inside a Branch Rule
  const handleAddConditionToRule = (ruleId: string) => {
    if (!currentStep || !currentStep.branchRules) return;
    const updatedRules = currentStep.branchRules.map((rule) => {
      if (rule.id !== ruleId) return rule;
      const newCond: FlowCondition = {
        fieldId: allFieldOptions[0]?.id || "rating",
        operator: "EQUALS",
        value: "",
      };
      return {
        ...rule,
        conditionGroup: {
          ...rule.conditionGroup,
          conditions: [...rule.conditionGroup.conditions, newCond],
        },
      };
    });
    handleUpdateCurrentStep({ branchRules: updatedRules });
  };

  const handleUpdateConditionInRule = (
    ruleId: string,
    condIndex: number,
    updates: Partial<FlowCondition>
  ) => {
    if (!currentStep || !currentStep.branchRules) return;
    const updatedRules = currentStep.branchRules.map((rule) => {
      if (rule.id !== ruleId) return rule;
      const newConditions = rule.conditionGroup.conditions.map((c, i) =>
        i === condIndex ? { ...c, ...updates } : c
      );
      return {
        ...rule,
        conditionGroup: {
          ...rule.conditionGroup,
          conditions: newConditions,
        },
      };
    });
    handleUpdateCurrentStep({ branchRules: updatedRules });
  };

  const handleDeleteConditionFromRule = (ruleId: string, condIndex: number) => {
    if (!currentStep || !currentStep.branchRules) return;
    const updatedRules = currentStep.branchRules.map((rule) => {
      if (rule.id !== ruleId) return rule;
      const newConditions = rule.conditionGroup.conditions.filter(
        (_, i) => i !== condIndex
      );
      return {
        ...rule,
        conditionGroup: {
          ...rule.conditionGroup,
          conditions: newConditions,
        },
      };
    });
    handleUpdateCurrentStep({ branchRules: updatedRules });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header / Top Controls Bar */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch size={18} className="text-brand-600" />
              <h3 className="text-sm font-bold text-ink-900">
                Multi-Step Flow &amp; Conditional Logic Editor
              </h3>
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              Break feedback collection into sequential steps, sections, and intelligent branching paths.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink-800">
              <input
                type="checkbox"
                checked={flowConfig.enabled}
                onChange={(e) =>
                  onChange({ ...flowConfig, enabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
              />
              <span>Enable Multi-Step Experience</span>
            </label>
          </div>
        </div>

        {/* Progress Bar Style Selector */}
        {flowConfig.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-ink-800 mb-1">
                Progress Indicator Style
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: "bar", label: "Progress Bar" },
                    { id: "steps", label: "Step Dots" },
                    { id: "percentage", label: "Percentage" },
                    { id: "none", label: "Hidden" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onChange({ ...flowConfig, progressStyle: opt.id })
                    }
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg border text-center font-medium transition-all",
                      flowConfig.progressStyle === opt.id
                        ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold shadow-2xs"
                        : "border-line bg-white text-ink-700 hover:bg-warm-50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-line/60 bg-warm-50/60 p-3 text-[11px] text-ink-600 leading-relaxed flex items-start gap-2">
              <HelpCircle size={14} className="text-brand-600 shrink-0 mt-0.5" />
              <span>
                Respondents will navigate step-by-step. Answers are safely preserved when users navigate backwards. Only visible applicable fields are validated.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Validation Warnings (Cycles or Broken Branches) */}
      {flowConfig.enabled && !validation.valid && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle size={15} className="text-amber-600 shrink-0" />
            <span>Flow Configuration Alert</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {flowConfig.enabled && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 2. Step Navigator Sidebar (Left 4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
                <Layers size={14} className="text-brand-600" /> Steps ({flowConfig.steps.length})
              </span>
              <button
                type="button"
                onClick={handleAddStep}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-warm-50 transition-colors shadow-2xs"
              >
                <Plus size={12} />
                <span>Add Step</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {flowConfig.steps.map((step, idx) => {
                const isSelected = idx === selectedStepIndex;
                const totalFields = step.sections.reduce(
                  (sum, s) => sum + s.fieldIds.length,
                  0
                );
                const hasBranching =
                  step.branchRules && step.branchRules.length > 0;

                return (
                  <div
                    key={step.id}
                    onClick={() => setSelectedStepIndex(idx)}
                    className={cn(
                      "group relative flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all text-xs",
                      isSelected
                        ? "border-brand-500 bg-brand-50/40 shadow-xs ring-1 ring-brand-500"
                        : "border-line bg-white hover:bg-warm-50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold text-[11px]",
                          isSelected
                            ? "bg-brand-600 text-white"
                            : "bg-warm-100 text-ink-700"
                        )}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-ink-900 block truncate">
                          {step.title || `Step ${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-ink-500 mt-0.5">
                          <span>{step.sections.length} sect.</span>
                          <span>&bull;</span>
                          <span>{totalFields} fields</span>
                          {hasBranching && (
                            <>
                              <span>&bull;</span>
                              <span className="text-purple-700 font-semibold flex items-center gap-0.5">
                                <Split size={10} /> Branch
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step Actions */}
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveStep(idx, "up");
                        }}
                        disabled={idx === 0}
                        className="p-1 rounded text-ink-500 hover:bg-warm-100 disabled:opacity-30"
                        title="Move step up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveStep(idx, "down");
                        }}
                        disabled={idx === flowConfig.steps.length - 1}
                        className="p-1 rounded text-ink-500 hover:bg-warm-100 disabled:opacity-30"
                        title="Move step down"
                      >
                        <ArrowDown size={12} />
                      </button>
                      {flowConfig.steps.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStep(idx);
                          }}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50"
                          title="Delete step"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Selected Step Editor Panel (Right 8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {currentStep && (
              <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs space-y-6">
                {/* Step Metadata Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-ink-900 mb-1">
                      Step Title
                    </label>
                    <input
                      type="text"
                      value={currentStep.title}
                      onChange={(e) =>
                        handleUpdateCurrentStep({ title: e.target.value })
                      }
                      placeholder="e.g. Your Rating, About You, Review"
                      className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-900 mb-1">
                      Step Guidance / Subtitle (Optional)
                    </label>
                    <input
                      type="text"
                      value={currentStep.description || ""}
                      onChange={(e) =>
                        handleUpdateCurrentStep({ description: e.target.value })
                      }
                      placeholder="e.g. Tell us about your journey"
                      className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* 4. Sections within Step */}
                <div className="space-y-4 pt-4 border-t border-line">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-ink-900">
                        Sections &amp; Assigned Fields
                      </h4>
                      <p className="text-[11px] text-ink-500">
                        Group questions logically. Allocate which form fields render in each section.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-warm-50 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
                    >
                      <Plus size={12} />
                      <span>Add Section</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {currentStep.sections.map((sec, secIdx) => (
                      <div
                        key={sec.id}
                        className="rounded-xl border border-line bg-warm-50/40 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 max-w-sm">
                            <span className="text-[10px] font-bold text-ink-400 uppercase">
                              Sec {secIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={sec.title || ""}
                              onChange={(e) =>
                                handleUpdateSection(sec.id, {
                                  title: e.target.value,
                                })
                              }
                              placeholder="Section Header (Optional)"
                              className="w-full rounded border border-line bg-white px-2 py-1 text-xs font-semibold text-ink-800 focus:border-brand-500 focus:outline-none"
                            />
                          </div>

                          {currentStep.sections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(sec.id)}
                              className="text-ink-400 hover:text-rose-600 p-1 transition-colors"
                              title="Delete section"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* Fields selector pills */}
                        <div>
                          <label className="block text-[11px] font-semibold text-ink-600 mb-1.5">
                            Questions allocated to this section:
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {allFieldOptions.map((opt) => {
                              const isAllocatedToThis = sec.fieldIds.includes(opt.id);
                              const isAllocatedElsewhereInStep =
                                !isAllocatedToThis &&
                                currentStep.sections.some((otherSec) =>
                                  otherSec.fieldIds.includes(opt.id)
                                );

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() =>
                                    toggleFieldInSection(sec.id, opt.id)
                                  }
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition-all",
                                    isAllocatedToThis
                                      ? "bg-brand-600 text-white font-semibold shadow-2xs"
                                      : isAllocatedElsewhereInStep
                                      ? "bg-warm-100 text-ink-400 border border-line line-through"
                                      : "bg-white border border-line text-ink-700 hover:bg-warm-50"
                                  )}
                                  title={
                                    isAllocatedToThis
                                      ? "Click to remove from this section"
                                      : isAllocatedElsewhereInStep
                                      ? "Allocated to another section in this step"
                                      : "Click to assign to this section"
                                  }
                                >
                                  {isAllocatedToThis && <Check size={11} />}
                                  <span>{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Conditional Branching Rules for Step */}
                <div className="space-y-4 pt-4 border-t border-line">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Split size={14} className="text-purple-600" />
                        <h4 className="text-xs font-bold text-ink-900">
                          Conditional Branching Rules
                        </h4>
                      </div>
                      <p className="text-[11px] text-ink-500">
                        Route respondents to specific steps based on their answers (e.g., if rating &ge; 4 &rarr; Praise video).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddBranchRule}
                      disabled={flowConfig.steps.length <= 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-40"
                    >
                      <Plus size={12} />
                      <span>Add Branch Rule</span>
                    </button>
                  </div>

                  {(!currentStep.branchRules || currentStep.branchRules.length === 0) ? (
                    <div className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-ink-500">
                      No conditional branches configured. Completing this step advances to the next sequential step.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentStep.branchRules.map((rule, ruleIdx) => (
                        <div
                          key={rule.id}
                          className="rounded-xl border border-purple-200 bg-purple-50/30 p-3.5 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                              <span>Branch {ruleIdx + 1}:</span>
                              <span className="font-normal text-[11px] text-purple-700">
                                When conditions below match:
                              </span>
                            </span>

                            <button
                              type="button"
                              onClick={() => handleDeleteBranchRule(rule.id)}
                              className="text-ink-400 hover:text-rose-600 transition-colors"
                              title="Delete rule"
                            >
                              <X size={13} />
                            </button>
                          </div>

                          {/* Conditions list */}
                          <div className="space-y-2">
                            {rule.conditionGroup.conditions.map((cond, cIdx) => (
                              <div
                                key={cIdx}
                                className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2 rounded-lg border border-line text-xs"
                              >
                                {cIdx > 0 && (
                                  <span className="text-[10px] font-bold text-ink-400 px-1">
                                    AND
                                  </span>
                                )}

                                {/* Field selector */}
                                <select
                                  value={cond.fieldId}
                                  onChange={(e) =>
                                    handleUpdateConditionInRule(rule.id, cIdx, {
                                      fieldId: e.target.value,
                                    })
                                  }
                                  className="rounded border border-line bg-warm-50 px-2 py-1 text-xs font-medium text-ink-800"
                                >
                                  {allFieldOptions.map((f) => (
                                    <option key={f.id} value={f.id}>
                                      {f.label}
                                    </option>
                                  ))}
                                </select>

                                {/* Operator selector */}
                                <select
                                  value={cond.operator}
                                  onChange={(e) =>
                                    handleUpdateConditionInRule(rule.id, cIdx, {
                                      operator: e.target
                                        .value as FlowConditionOperator,
                                    })
                                  }
                                  className="rounded border border-line bg-warm-50 px-2 py-1 text-xs font-medium text-ink-800"
                                >
                                  {(
                                    Object.keys(
                                      OPERATOR_LABELS
                                    ) as FlowConditionOperator[]
                                  ).map((op) => (
                                    <option key={op} value={op}>
                                      {OPERATOR_LABELS[op]}
                                    </option>
                                  ))}
                                </select>

                                {/* Value input (hidden if IS_EMPTY or IS_NOT_EMPTY) */}
                                {cond.operator !== "IS_EMPTY" &&
                                  cond.operator !== "IS_NOT_EMPTY" && (
                                    <input
                                      type="text"
                                      value={String(cond.value ?? "")}
                                      onChange={(e) =>
                                        handleUpdateConditionInRule(
                                          rule.id,
                                          cIdx,
                                          {
                                            value: e.target.value,
                                          }
                                        )
                                      }
                                      placeholder="Target value..."
                                      className="flex-1 min-w-[100px] rounded border border-line px-2 py-1 text-xs text-ink-900"
                                    />
                                  )}

                                {rule.conditionGroup.conditions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteConditionFromRule(
                                        rule.id,
                                        cIdx
                                      )
                                    }
                                    className="text-ink-400 hover:text-rose-600 p-1"
                                    title="Remove condition"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() => handleAddConditionToRule(rule.id)}
                              className="text-[11px] font-semibold text-purple-700 hover:underline pt-0.5 inline-block"
                            >
                              + Add another condition
                            </button>
                          </div>

                          {/* Target Step Destination */}
                          <div className="flex items-center gap-2 pt-2 border-t border-purple-200/60 text-xs font-semibold text-purple-900">
                            <ArrowRight size={14} className="text-purple-600 shrink-0" />
                            <span>Then Jump Directly To:</span>
                            <select
                              value={rule.targetStepId}
                              onChange={(e) =>
                                handleUpdateBranchRule(rule.id, {
                                  targetStepId: e.target.value,
                                })
                              }
                              className="rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-xs font-semibold text-purple-900 focus:outline-none"
                            >
                              {flowConfig.steps
                                .filter((s) => s.id !== currentStep.id)
                                .map((targetStep) => (
                                  <option
                                    key={targetStep.id}
                                    value={targetStep.id}
                                  >
                                    {targetStep.title || targetStep.id}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
