import assert from "node:assert/strict";
import {
  evaluateCondition,
  evaluateConditionGroup,
  isSectionVisible,
  isFieldVisibleInStep,
  resolveNextStepId,
  detectCycles,
  validateFlowConfig,
  getTraversedVisibleFieldIds,
  createDefaultFlowConfig,
} from "../src/lib/forms/flow-engine.ts";

console.log("------------------------------------------------------------");
console.log("Running Praise V2 Advanced Form Flows Test Suite");
console.log("------------------------------------------------------------\n");

// 1. TEST: Condition Operators
console.log("Test 1: Condition Operators Evaluation");
{
  const formValues = {
    rating: 5,
    role: "Engineering Lead",
    notes: "Everything is amazing",
    emptyField: "",
    zeroValue: 0,
  };

  // EQUALS
  assert.equal(
    evaluateCondition(
      { fieldId: "rating", operator: "EQUALS", value: "5" },
      formValues
    ),
    true,
    "rating 5 should EQUAL '5'"
  );
  assert.equal(
    evaluateCondition(
      { fieldId: "rating", operator: "EQUALS", value: "4" },
      formValues
    ),
    false,
    "rating 5 should NOT equal '4'"
  );

  // NOT_EQUALS
  assert.equal(
    evaluateCondition(
      { fieldId: "rating", operator: "NOT_EQUALS", value: "4" },
      formValues
    ),
    true,
    "rating 5 should NOT_EQUAL '4'"
  );

  // CONTAINS
  assert.equal(
    evaluateCondition(
      { fieldId: "role", operator: "CONTAINS", value: "Engineering" },
      formValues
    ),
    true,
    "role should CONTAIN 'Engineering'"
  );
  assert.equal(
    evaluateCondition(
      { fieldId: "role", operator: "CONTAINS", value: "Marketing" },
      formValues
    ),
    false,
    "role should not contain 'Marketing'"
  );

  // GREATER_THAN & LESS_THAN
  assert.equal(
    evaluateCondition(
      { fieldId: "rating", operator: "GREATER_THAN", value: "3" },
      formValues
    ),
    true,
    "5 GREATER_THAN 3"
  );
  assert.equal(
    evaluateCondition(
      { fieldId: "rating", operator: "LESS_THAN", value: "3" },
      formValues
    ),
    false,
    "5 NOT LESS_THAN 3"
  );

  // IS_EMPTY & IS_NOT_EMPTY
  assert.equal(
    evaluateCondition(
      { fieldId: "emptyField", operator: "IS_EMPTY", value: "" },
      formValues
    ),
    true,
    "emptyField IS_EMPTY"
  );
  assert.equal(
    evaluateCondition(
      { fieldId: "notes", operator: "IS_NOT_EMPTY", value: "" },
      formValues
    ),
    true,
    "notes IS_NOT_EMPTY"
  );

  console.log("  ✓ All condition operators evaluated correctly.");
}

// 2. TEST: Condition Groups (ALL vs ANY)
console.log("\nTest 2: Condition Group Logic (ALL / ANY)");
{
  const formValues = {
    rating: 4,
    company: "Acme Corp",
  };

  const groupAll = {
    match: "ALL",
    conditions: [
      { fieldId: "rating", operator: "GREATER_THAN", value: "3" },
      { fieldId: "company", operator: "EQUALS", value: "Acme Corp" },
    ],
  };

  assert.equal(evaluateConditionGroup(groupAll, formValues), true, "ALL match passed");

  const groupAllFailing = {
    match: "ALL",
    conditions: [
      { fieldId: "rating", operator: "GREATER_THAN", value: "4" }, // false
      { fieldId: "company", operator: "EQUALS", value: "Acme Corp" }, // true
    ],
  };
  assert.equal(evaluateConditionGroup(groupAllFailing, formValues), false, "ALL match fails when 1 condition is false");

  const groupAny = {
    match: "ANY",
    conditions: [
      { fieldId: "rating", operator: "GREATER_THAN", value: "4" }, // false
      { fieldId: "company", operator: "EQUALS", value: "Acme Corp" }, // true
    ],
  };
  assert.equal(evaluateConditionGroup(groupAny, formValues), true, "ANY match passes when 1 condition is true");

  console.log("  ✓ Condition groups (ALL/ANY) logic evaluated correctly.");
}

// 3. TEST: Dynamic Branching Resolution
console.log("\nTest 3: Conditional Branching Resolution");
{
  const flowConfig = {
    enabled: true,
    progressStyle: "bar",
    steps: [
      {
        id: "step_rating",
        title: "Rating & Impression",
        sections: [{ id: "sec_1", fieldIds: ["STANDARD_RATING"] }],
        branchRules: [
          {
            id: "rule_high_rating",
            conditionGroup: {
              match: "ALL",
              conditions: [{ fieldId: "rating", operator: "GREATER_THAN", value: "3" }],
            },
            targetStepId: "step_promoter",
          },
          {
            id: "rule_low_rating",
            conditionGroup: {
              match: "ALL",
              conditions: [{ fieldId: "rating", operator: "LESS_THAN", value: "4" }],
            },
            targetStepId: "step_feedback",
          },
        ],
        defaultNextStepId: "step_promoter",
      },
      {
        id: "step_promoter",
        title: "Promoter Experience",
        sections: [{ id: "sec_promoter", fieldIds: ["promoter_quote"] }],
        branchRules: [],
        defaultNextStepId: "step_contact",
      },
      {
        id: "step_feedback",
        title: "Constructive Feedback",
        sections: [{ id: "sec_feedback", fieldIds: ["improvement_area"] }],
        branchRules: [],
        defaultNextStepId: "step_contact",
      },
      {
        id: "step_contact",
        title: "Contact & Consent",
        sections: [{ id: "sec_contact", fieldIds: ["STANDARD_NAME", "STANDARD_EMAIL"] }],
        branchRules: [],
      },
    ],
  };

  // When rating is 5 -> branch to step_promoter
  const nextFor5 = resolveNextStepId("step_rating", flowConfig, { rating: 5 });
  assert.equal(nextFor5, "step_promoter", "Rating 5 should branch to step_promoter");

  // When rating is 2 -> branch to step_feedback
  const nextFor2 = resolveNextStepId("step_rating", flowConfig, { rating: 2 });
  assert.equal(nextFor2, "step_feedback", "Rating 2 should branch to step_feedback");

  // From step_promoter -> default next is step_contact
  const nextFromPromoter = resolveNextStepId("step_promoter", flowConfig, { rating: 5 });
  assert.equal(nextFromPromoter, "step_contact", "step_promoter should advance to step_contact");

  // From step_contact (last step) -> SUBMIT
  const nextFromContact = resolveNextStepId("step_contact", flowConfig, { rating: 5 });
  assert.equal(nextFromContact, "SUBMIT", "step_contact (last step) should resolve to SUBMIT");

  console.log("  ✓ Branching logic routed correctly based on answer values.");
}

// 4. TEST: Cycle Detection & Validation
console.log("\nTest 4: Cycle Detection & Graph Validation");
{
  // Acyclic steps
  const acyclicSteps = [
    {
      id: "s1",
      title: "Step 1",
      sections: [],
      branchRules: [{ id: "r1", conditionGroup: { match: "ALL", conditions: [] }, targetStepId: "s2" }],
    },
    {
      id: "s2",
      title: "Step 2",
      sections: [],
      branchRules: [],
    },
  ];
  assert.equal(detectCycles(acyclicSteps), null, "Acyclic flow should not detect cycles");

  // Self-loop cycle
  const selfLoopSteps = [
    {
      id: "s1",
      title: "Step 1",
      sections: [],
      branchRules: [{ id: "r1", conditionGroup: { match: "ALL", conditions: [] }, targetStepId: "s1" }],
    },
  ];
  const selfCycle = detectCycles(selfLoopSteps);
  assert.deepEqual(selfCycle, ["s1", "s1"], "Self loop cycle correctly detected");

  // Multi-step loop: s1 -> s2 -> s3 -> s1
  const multiLoopSteps = [
    {
      id: "s1",
      title: "Step 1",
      sections: [],
      branchRules: [{ id: "r1", conditionGroup: { match: "ALL", conditions: [] }, targetStepId: "s2" }],
    },
    {
      id: "s2",
      title: "Step 2",
      sections: [],
      branchRules: [{ id: "r2", conditionGroup: { match: "ALL", conditions: [] }, targetStepId: "s3" }],
    },
    {
      id: "s3",
      title: "Step 3",
      sections: [],
      branchRules: [{ id: "r3", conditionGroup: { match: "ALL", conditions: [] }, targetStepId: "s1" }],
    },
  ];
  const multiCycle = detectCycles(multiLoopSteps);
  assert.ok(multiCycle !== null && multiCycle.length > 0, "Multi-step circular cycle detected");

  // validateFlowConfig on cyclical config
  const cyclicalValidation = validateFlowConfig({
    enabled: true,
    progressStyle: "bar",
    steps: multiLoopSteps,
  });
  assert.equal(cyclicalValidation.valid, false, "Cyclical flow marked invalid");
  assert.ok(
    cyclicalValidation.errors.some((e) => e.includes("Circular navigation loop detected")),
    "Validation reports circular branching error"
  );

  console.log("  ✓ Cycle detection and graph validation correctly detected all loops.");
}

// 5. TEST: Traversed Field Visibility & Backward State Preservation
console.log("\nTest 5: Traversed Field Resolution for Server-Side Validation");
{
  const flowConfig = {
    enabled: true,
    progressStyle: "steps",
    steps: [
      {
        id: "step_1",
        title: "Step 1",
        sections: [
          {
            id: "sec_1",
            fieldIds: ["STANDARD_RATING"],
          },
        ],
        branchRules: [
          {
            id: "r_high",
            conditionGroup: {
              match: "ALL",
              conditions: [{ fieldId: "rating", operator: "GREATER_THAN", value: "3" }],
            },
            targetStepId: "step_high",
          },
        ],
        defaultNextStepId: "step_low",
      },
      {
        id: "step_high",
        title: "High Rating",
        sections: [
          {
            id: "sec_high",
            fieldIds: ["high_rating_feedback"],
          },
        ],
        branchRules: [],
        defaultNextStepId: "step_end",
      },
      {
        id: "step_low",
        title: "Low Rating",
        sections: [
          {
            id: "sec_low",
            fieldIds: ["low_rating_feedback"],
          },
        ],
        branchRules: [],
        defaultNextStepId: "step_end",
      },
      {
        id: "step_end",
        title: "Final Step",
        sections: [
          {
            id: "sec_end",
            fieldIds: ["STANDARD_NAME", "STANDARD_EMAIL"],
          },
        ],
        branchRules: [],
      },
    ],
  };

  // Promoter path (rating: 5)
  const promoterFields = getTraversedVisibleFieldIds(flowConfig, { rating: 5 });
  assert.ok(promoterFields.has("STANDARD_RATING"), "Rating included");
  assert.ok(promoterFields.has("high_rating_feedback"), "High rating question included");
  assert.ok(!promoterFields.has("low_rating_feedback"), "Low rating question EXCLUDED on promoter path");
  assert.ok(promoterFields.has("STANDARD_NAME"), "Name included");
  assert.ok(promoterFields.has("STANDARD_EMAIL"), "Email included");

  // Detractor path (rating: 2)
  const detractorFields = getTraversedVisibleFieldIds(flowConfig, { rating: 2 });
  assert.ok(detractorFields.has("STANDARD_RATING"), "Rating included");
  assert.ok(!detractorFields.has("high_rating_feedback"), "High rating question EXCLUDED on detractor path");
  assert.ok(detractorFields.has("low_rating_feedback"), "Low rating question included on detractor path");
  assert.ok(detractorFields.has("STANDARD_NAME"), "Name included");
  assert.ok(detractorFields.has("STANDARD_EMAIL"), "Email included");

  console.log("  ✓ Traversable fields accurately resolved for conditional branches.");
}

// 6. TEST: Default Flow Config
console.log("\nTest 6: Default Flow Config Structure");
{
  const defaultFlow = createDefaultFlowConfig();
  assert.equal(defaultFlow.enabled, true);
  assert.equal(defaultFlow.progressStyle, "bar");
  assert.ok(defaultFlow.steps.length >= 2);
  assert.ok(defaultFlow.steps[0].sections[0].fieldIds.length > 0);
  const validation = validateFlowConfig(defaultFlow);
  assert.equal(validation.valid, true, "Default flow config is valid");

  console.log("  ✓ Default flow config verified.");
}

console.log("\n------------------------------------------------------------");
console.log("ALL FORM FLOW TESTS PASSED SUCCESSFULLY (6/6)");
console.log("------------------------------------------------------------");
