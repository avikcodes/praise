/**
 * Praise Advanced Form Flows Engine
 * =================================
 * Provides deterministic condition evaluation, cycle-safe branching,
 * per-step validation, and answer preservation across navigation history.
 */

export type FlowConditionOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "CONTAINS"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "IS_EMPTY"
  | "IS_NOT_EMPTY";

export type FlowCondition = {
  fieldId: string; // standard ('rating', 'content', 'name', etc.) or custom question ID
  operator: FlowConditionOperator;
  value?: string | number | boolean;
};

export type FlowConditionGroup = {
  match: "ALL" | "ANY";
  conditions: FlowCondition[];
};

export type FlowBranchRule = {
  id: string;
  conditionGroup: FlowConditionGroup;
  targetStepId: string;
};

export type FormStepSection = {
  id: string;
  title?: string;
  description?: string;
  fieldIds: string[];
  conditions?: FlowConditionGroup | null;
};

export type FormStep = {
  id: string;
  title: string;
  description?: string;
  sections: FormStepSection[];
  branchRules?: FlowBranchRule[];
  defaultNextStepId?: string; // Optional custom default target instead of step[i+1]
};

export type FormFlowConfig = {
  enabled: boolean;
  progressStyle: "bar" | "steps" | "percentage" | "none";
  steps: FormStep[];
};

/**
 * Standard field IDs recognized across all Praise forms.
 */
export const STANDARD_FLOW_FIELDS = [
  { id: "rating", label: "Overall Rating (1-5 Stars)", category: "Review" },
  { id: "content", label: "Testimonial Content (Text / Video / Audio)", category: "Review" },
  { id: "name", label: "Customer Full Name", category: "Respondent" },
  { id: "email", label: "Customer Email Address", category: "Respondent" },
  { id: "company", label: "Company / Organization", category: "Respondent" },
  { id: "title", label: "Job Title / Role", category: "Respondent" },
  { id: "website", label: "Website / Profile URL", category: "Respondent" },
  { id: "avatar", label: "Profile Picture / Avatar", category: "Respondent" },
  { id: "consent", label: "Marketing Consent Agreement", category: "Legal" },
] as const;

export type StandardFlowFieldId = typeof STANDARD_FLOW_FIELDS[number]["id"];

/**
 * Evaluates a single condition against current form values.
 */
export function evaluateCondition(
  condition: FlowCondition,
  formValues: Record<string, unknown>
): boolean {
  const rawValue = formValues[condition.fieldId];
  const targetValue = condition.value;

  switch (condition.operator) {
    case "IS_EMPTY": {
      if (rawValue === undefined || rawValue === null) return true;
      if (typeof rawValue === "string") return rawValue.trim().length === 0;
      if (Array.isArray(rawValue)) return rawValue.length === 0;
      return false;
    }

    case "IS_NOT_EMPTY": {
      if (rawValue === undefined || rawValue === null) return false;
      if (typeof rawValue === "string") return rawValue.trim().length > 0;
      if (Array.isArray(rawValue)) return rawValue.length > 0;
      return true;
    }

    case "EQUALS": {
      if (rawValue === undefined || rawValue === null) return targetValue === undefined || targetValue === null || targetValue === "";
      if (typeof rawValue === "number" || typeof targetValue === "number") {
        return Number(rawValue) === Number(targetValue);
      }
      if (typeof rawValue === "boolean" || typeof targetValue === "boolean") {
        return Boolean(rawValue) === Boolean(targetValue);
      }
      return String(rawValue).trim().toLowerCase() === String(targetValue ?? "").trim().toLowerCase();
    }

    case "NOT_EQUALS": {
      return !evaluateCondition({ ...condition, operator: "EQUALS" }, formValues);
    }

    case "CONTAINS": {
      if (rawValue === undefined || rawValue === null) return false;
      const strVal = String(rawValue).toLowerCase();
      const search = String(targetValue ?? "").toLowerCase();
      return strVal.includes(search);
    }

    case "GREATER_THAN": {
      const numRaw = Number(rawValue);
      const numTarget = Number(targetValue);
      if (isNaN(numRaw) || isNaN(numTarget)) return false;
      return numRaw > numTarget;
    }

    case "LESS_THAN": {
      const numRaw = Number(rawValue);
      const numTarget = Number(targetValue);
      if (isNaN(numRaw) || isNaN(numTarget)) return false;
      return numRaw < numTarget;
    }

    default:
      return true;
  }
}

/**
 * Evaluates a condition group (ALL or ANY match).
 */
export function evaluateConditionGroup(
  group: FlowConditionGroup | null | undefined,
  formValues: Record<string, unknown>
): boolean {
  if (!group || !Array.isArray(group.conditions) || group.conditions.length === 0) {
    return true; // No conditions means always visible/true
  }

  if (group.match === "ANY") {
    return group.conditions.some((c) => evaluateCondition(c, formValues));
  }

  // Default is "ALL"
  return group.conditions.every((c) => evaluateCondition(c, formValues));
}

/**
 * Checks whether a specific section is visible given current form answers.
 */
export function isSectionVisible(
  section: FormStepSection,
  formValues: Record<string, unknown>
): boolean {
  if (!section.conditions) return true;
  return evaluateConditionGroup(section.conditions, formValues);
}

/**
 * Checks whether a field should be shown within a given flow step.
 * Returns true if the field's parent section is visible and any field-level condition passes.
 */
export function isFieldVisibleInStep(
  fieldId: string,
  step: FormStep,
  formValues: Record<string, unknown>,
  fieldConditionsMap?: Record<string, FlowConditionGroup>
): boolean {
  // Find which section holds this field
  const section = step.sections.find((s) => s.fieldIds.includes(fieldId));
  if (!section) return false;

  // Check section visibility
  if (!isSectionVisible(section, formValues)) return false;

  // Check field-specific conditions if any
  if (fieldConditionsMap && fieldConditionsMap[fieldId]) {
    return evaluateConditionGroup(fieldConditionsMap[fieldId], formValues);
  }

  return true;
}

/**
 * Determines the next step ID after completing the current step.
 * Safely evaluates branch rules first; falls back to defaultNextStepId or next sequential step.
 */
export function resolveNextStepId(
  currentStepId: string,
  flowConfig: FormFlowConfig,
  formValues: Record<string, unknown>
): string | "SUBMIT" {
  const steps = flowConfig.steps;
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);
  if (currentIndex === -1) return "SUBMIT";

  const currentStep = steps[currentIndex];

  // 1. Check custom branch rules
  if (currentStep.branchRules && currentStep.branchRules.length > 0) {
    for (const rule of currentStep.branchRules) {
      if (evaluateConditionGroup(rule.conditionGroup, formValues)) {
        // Verify target step actually exists
        const targetExists = steps.some((s) => s.id === rule.targetStepId);
        if (targetExists && rule.targetStepId !== currentStepId) {
          return rule.targetStepId;
        }
      }
    }
  }

  // 2. Check default next step override
  if (currentStep.defaultNextStepId) {
    const targetExists = steps.some((s) => s.id === currentStep.defaultNextStepId);
    if (targetExists && currentStep.defaultNextStepId !== currentStepId) {
      return currentStep.defaultNextStepId;
    }
  }

  // 3. Sequential progression
  if (currentIndex < steps.length - 1) {
    return steps[currentIndex + 1].id;
  }

  // Final step leads to submission
  return "SUBMIT";
}

/**
 * Cycle Detection Algorithm (Tarjan / DFS-based)
 * Returns any detected cycle loop (array of step IDs) or null if acyclic.
 */
export function detectCycles(steps: FormStep[]): string[] | null {
  const stepMap = new Map<string, FormStep>();
  for (const s of steps) {
    stepMap.set(s.id, s);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const currentPath: string[] = [];

  function dfs(stepId: string): string[] | null {
    visited.add(stepId);
    recursionStack.add(stepId);
    currentPath.push(stepId);

    const step = stepMap.get(stepId);
    if (step) {
      // Collect all potential targets
      const targets = new Set<string>();
      if (step.branchRules) {
        for (const rule of step.branchRules) {
          if (rule.targetStepId && stepMap.has(rule.targetStepId)) {
            targets.add(rule.targetStepId);
          }
        }
      }
      if (step.defaultNextStepId && stepMap.has(step.defaultNextStepId)) {
        targets.add(step.defaultNextStepId);
      }

      for (const target of targets) {
        if (!visited.has(target)) {
          const cycle = dfs(target);
          if (cycle) return cycle;
        } else if (recursionStack.has(target)) {
          // Cycle found! Extract the cycle path
          const cycleStartIndex = currentPath.indexOf(target);
          return currentPath.slice(cycleStartIndex).concat(target);
        }
      }
    }

    currentPath.pop();
    recursionStack.delete(stepId);
    return null;
  }

  for (const s of steps) {
    if (!visited.has(s.id)) {
      const cycle = dfs(s.id);
      if (cycle) return cycle;
    }
  }

  return null;
}

/**
 * Validates a FormFlowConfig for integrity.
 * Checks for missing steps, duplicate IDs, orphan targets, and cycles.
 */
export function validateFlowConfig(
  flowConfig: FormFlowConfig | null | undefined
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!flowConfig || !flowConfig.enabled) {
    return { valid: true, errors: [] };
  }

  if (!Array.isArray(flowConfig.steps) || flowConfig.steps.length === 0) {
    errors.push("A multi-step form must contain at least one step.");
    return { valid: false, errors };
  }

  const stepIds = new Set<string>();
  for (const step of flowConfig.steps) {
    if (!step.id || !step.id.trim()) {
      errors.push("All steps must have a unique non-empty ID.");
    } else if (stepIds.has(step.id)) {
      errors.push(`Duplicate step ID detected: "${step.id}".`);
    } else {
      stepIds.add(step.id);
    }
  }

  // Check branch targets and defaultNextStepId
  for (const step of flowConfig.steps) {
    if (step.branchRules) {
      for (const rule of step.branchRules) {
        if (rule.targetStepId && !stepIds.has(rule.targetStepId)) {
          errors.push(
            `Step "${step.title || step.id}" branches to non-existent step ID "${rule.targetStepId}".`
          );
        }
        if (rule.targetStepId === step.id) {
          errors.push(
            `Step "${step.title || step.id}" contains a self-referencing branch to itself.`
          );
        }
      }
    }

    if (step.defaultNextStepId) {
      if (!stepIds.has(step.defaultNextStepId)) {
        errors.push(
          `Step "${step.title || step.id}" has an invalid default next step ID "${step.defaultNextStepId}".`
        );
      }
      if (step.defaultNextStepId === step.id) {
        errors.push(
          `Step "${step.title || step.id}" has a default next step pointing to itself.`
        );
      }
    }
  }

  // Check circular dependencies
  const cycle = detectCycles(flowConfig.steps);
  if (cycle) {
    errors.push(`Circular navigation loop detected: ${cycle.join(" → ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates a clean 3-step default flow configuration based on enabled form fields.
 */
export function createDefaultFlowConfig(form?: {
  collectRating?: boolean;
  collectText?: boolean;
  collectName?: boolean;
  collectEmail?: boolean;
  collectCompany?: boolean;
  collectJobTitle?: boolean;
  collectWebsite?: boolean;
  collectAvatar?: boolean;
  collectConsent?: boolean;
  customFieldIds?: string[];
}): FormFlowConfig {
  const customIds = form?.customFieldIds || [];

  // Step 1: Rating & Testimonial
  const step1Fields: string[] = [];
  if (form?.collectRating ?? true) step1Fields.push("rating");
  if (form?.collectText ?? true) step1Fields.push("content");

  // Step 2: About You
  const step2Fields: string[] = [];
  if (form?.collectName ?? true) step2Fields.push("name");
  if (form?.collectEmail ?? true) step2Fields.push("email");
  if (form?.collectCompany ?? true) step2Fields.push("company");
  if (form?.collectJobTitle ?? false) step2Fields.push("title");
  if (form?.collectWebsite ?? false) step2Fields.push("website");
  if (form?.collectAvatar ?? true) step2Fields.push("avatar");

  // Step 3: Consent & Custom Questions
  const step3Fields: string[] = [...customIds];
  if (form?.collectConsent ?? true) step3Fields.push("consent");

  // If some step has no fields, ensure fallback
  if (step1Fields.length === 0) step1Fields.push("content");
  if (step2Fields.length === 0) step2Fields.push("email");

  const steps: FormStep[] = [
    {
      id: "step_review",
      title: "Your Experience",
      description: "Share your rating and thoughts on how our product helped you.",
      sections: [
        {
          id: "sec_review",
          title: "Feedback & Rating",
          fieldIds: step1Fields,
        },
      ],
    },
    {
      id: "step_author",
      title: "About You",
      description: "Help others know who provided this feedback.",
      sections: [
        {
          id: "sec_author",
          title: "Author Details",
          fieldIds: step2Fields,
        },
      ],
    },
  ];

  if (step3Fields.length > 0) {
    steps.push({
      id: "step_confirmation",
      title: "Review & Permissions",
      description: "Confirm your submission details and permissions.",
      sections: [
        {
          id: "sec_confirmation",
          title: "Consent & Additional Details",
          fieldIds: step3Fields,
        },
      ],
    });
  }

  return {
    enabled: true,
    progressStyle: "bar",
    steps,
  };
}

/**
 * Calculates all field IDs that were traversed and visible along the user's branch route
 * based on the provided submitted values.
 */
export function getTraversedVisibleFieldIds(
  flowConfig: FormFlowConfig | null | undefined,
  formValues: Record<string, unknown>,
  fieldConditionsMap?: Record<string, FlowConditionGroup>
): Set<string> {
  const visibleFields = new Set<string>();
  if (!flowConfig || !flowConfig.enabled || !Array.isArray(flowConfig.steps) || flowConfig.steps.length === 0) {
    return visibleFields;
  }

  const stepsMap = new Map<string, FormStep>();
  flowConfig.steps.forEach((s) => stepsMap.set(s.id, s));

  let currentStepId: string | "SUBMIT" = flowConfig.steps[0].id;
  const visited = new Set<string>();

  while (currentStepId && currentStepId !== "SUBMIT" && !visited.has(currentStepId)) {
    visited.add(currentStepId);
    const step = stepsMap.get(currentStepId);
    if (!step) break;

    for (const sec of step.sections) {
      if (isSectionVisible(sec, formValues)) {
        for (const fid of sec.fieldIds) {
          if (
            !fieldConditionsMap ||
            !fieldConditionsMap[fid] ||
            evaluateConditionGroup(fieldConditionsMap[fid], formValues)
          ) {
            visibleFields.add(fid);
          }
        }
      }
    }

    currentStepId = resolveNextStepId(currentStepId, flowConfig, formValues);
  }

  return visibleFields;
}

