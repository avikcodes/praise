import { prisma } from "../src/lib/db/client.ts";
import {
  validateScore,
  validateFollowUpAnswers,
  calculateNps,
  calculateCsat,
  calculateCes,
} from "../src/types/surveys.ts";
import { SURVEY_TEMPLATES } from "../src/lib/surveys/templates.ts";

async function runTests() {
  console.log("=================================================");
  console.log("   PRAISE CUSTOMER SURVEY BUILDER VERIFICATION   ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. SCORE VALIDATION
  // ---------------------------------------------------------------------------
  console.log("1. Testing Score Ranges & Methodology Validation...");
  // NPS: 0 to 10
  assert(validateScore("NPS", 0).isValid, "NPS accepts 0");
  assert(validateScore("NPS", 10).isValid, "NPS accepts 10");
  assert(validateScore("NPS", 7).isValid, "NPS accepts 7");
  assert(!validateScore("NPS", -1).isValid, "NPS rejects -1");
  assert(!validateScore("NPS", 11).isValid, "NPS rejects 11");
  assert(!validateScore("NPS", 7.5).isValid, "NPS rejects non-integers");
  assert(!validateScore("NPS", null).isValid, "NPS rejects null");

  // CSAT: 1 to 5
  assert(validateScore("CSAT", 1).isValid, "CSAT accepts 1");
  assert(validateScore("CSAT", 5).isValid, "CSAT accepts 5");
  assert(!validateScore("CSAT", 0).isValid, "CSAT rejects 0");
  assert(!validateScore("CSAT", 6).isValid, "CSAT rejects 6");

  // CES: 1 to 7
  assert(validateScore("CES", 1).isValid, "CES accepts 1");
  assert(validateScore("CES", 7).isValid, "CES accepts 7");
  assert(!validateScore("CES", 0).isValid, "CES rejects 0");
  assert(!validateScore("CES", 8).isValid, "CES rejects 8");

  // FIVE_STAR: 1 to 5
  assert(validateScore("FIVE_STAR", 5).isValid, "FIVE_STAR accepts 5");
  assert(!validateScore("FIVE_STAR", 0).isValid, "FIVE_STAR rejects 0");

  // ---------------------------------------------------------------------------
  // 2. FOLLOW-UP QUESTIONS VALIDATION
  // ---------------------------------------------------------------------------
  console.log("\n2. Testing Follow-up Questions Constraints & Types...");
  const sampleQuestions = [
    {
      id: "q-req-text",
      label: "Required Feedback",
      type: "TEXT",
      isRequired: true,
      orderIndex: 0,
    },
    {
      id: "q-opt-choice",
      label: "Platform Choice",
      type: "SINGLE_CHOICE",
      isRequired: false,
      options: ["Web", "iOS", "Android"],
      orderIndex: 1,
    },
    {
      id: "q-rating",
      label: "Speed Rating",
      type: "RATING",
      minRating: 1,
      maxRating: 5,
      isRequired: true,
      orderIndex: 2,
    },
  ];

  const validAnswers = {
    "q-req-text": "Great interface!",
    "q-opt-choice": "Web",
    "q-rating": 5,
  };
  const check1 = validateFollowUpAnswers(sampleQuestions, validAnswers);
  assert(check1.isValid, "Valid follow-up answers pass validation");

  const missingRequired = {
    "q-opt-choice": "Web",
  };
  const check2 = validateFollowUpAnswers(sampleQuestions, missingRequired);
  assert(!check2.isValid && check2.errors["q-req-text"], "Fails when required text is missing");

  const invalidChoice = {
    "q-req-text": "Some text",
    "q-opt-choice": "Windows Phone", // not in options
    "q-rating": 4,
  };
  const check3 = validateFollowUpAnswers(sampleQuestions, invalidChoice);
  assert(!check3.isValid && check3.errors["q-opt-choice"], "Fails on invalid choice option");

  // ---------------------------------------------------------------------------
  // 3. METRIC AGGREGATION ALGORITHMS
  // ---------------------------------------------------------------------------
  console.log("\n3. Testing NPS, CSAT & CES Metric Aggregations...");
  // NPS: 3 Promoters (10, 10, 9), 1 Passive (8), 1 Detractor (4) => total 5
  // Promoters = 60%, Detractors = 20% => NPS = +40
  const npsResult = calculateNps([10, 10, 9, 8, 4]);
  assert(npsResult.nps === 40, `NPS calculated correctly: expected 40, got ${npsResult.nps}`);
  assert(npsResult.promoters === 3, "Promoters counted correctly");
  assert(npsResult.detractors === 1, "Detractors counted correctly");
  assert(npsResult.passives === 1, "Passives counted correctly");

  // CSAT: scores [5, 4, 3, 2, 5] => 3 satisfied (>=4) out of 5 => 60% CSAT, avg 3.8
  const csatResult = calculateCsat([5, 4, 3, 2, 5]);
  assert(csatResult.csatPercentage === 60, `CSAT percentage calculated correctly: ${csatResult.csatPercentage}%`);
  assert(csatResult.average === 3.8, `CSAT average calculated correctly: ${csatResult.average}`);

  // CES: scores [7, 6, 5, 2] => 3 low-effort (>=5) out of 4 => 75% low effort, avg 5.0
  const cesResult = calculateCes([7, 6, 5, 2]);
  assert(cesResult.lowEffortPct === 75, `CES low-effort pct: ${cesResult.lowEffortPct}%`);
  assert(cesResult.average === 5.0, `CES average: ${cesResult.average}`);

  // ---------------------------------------------------------------------------
  // 4. TEMPLATE INTEGRITY
  // ---------------------------------------------------------------------------
  console.log("\n4. Testing Survey Templates Library...");
  assert(SURVEY_TEMPLATES.length === 6, `Templates count is 6 (got ${SURVEY_TEMPLATES.length})`);
  const templateTypes = new Set(SURVEY_TEMPLATES.map((t) => t.type));
  assert(templateTypes.has("NPS"), "Template library includes NPS");
  assert(templateTypes.has("CSAT"), "Template library includes CSAT");
  assert(templateTypes.has("CES"), "Template library includes CES");
  assert(templateTypes.has("FIVE_STAR"), "Template library includes FIVE_STAR");

  // ---------------------------------------------------------------------------
  // 5. DATABASE PERSISTENCE & WORKSPACE ISOLATION
  // ---------------------------------------------------------------------------
  console.log("\n5. Testing Database Persistence, Response Storage & Security...");
  try {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      console.log("  ⚠ No workspace in DB, skipping live database test.");
    } else {
      const testSlug = `test-nps-${Date.now()}`;
      const survey = await prisma.survey.create({
        data: {
          workspaceId: workspace.id,
          title: "Automated Test Survey",
          slug: testSlug,
          type: "NPS",
          status: "ACTIVE",
          primaryPrompt: "How likely are you to recommend Praise?",
          feedbackPrompt: "Why did you choose this score?",
          questionsJson: JSON.stringify(sampleQuestions),
        },
      });
      assert(survey.id && survey.slug === testSlug, `Created test survey ${survey.id}`);

      // Create a response without a Praise account (simulating public respondent)
      const response = await prisma.surveyResponse.create({
        data: {
          surveyId: survey.id,
          workspaceId: workspace.id,
          score: 10,
          scoreType: "NPS",
          feedback: "Love the real-time preview and custom templates!",
          respondentName: "Alex Respondent",
          respondentEmail: "alex@example.com",
          answersJson: JSON.stringify({
            "q-req-text": "Amazing user experience",
            "q-rating": 5,
          }),
        },
      });
      assert(response.id && response.score === 10, `Saved public survey response ${response.id}`);

      // Verify response query with relation
      const fetched = await prisma.survey.findUnique({
        where: { id: survey.id },
        include: { responses: true },
      });
      assert(fetched?.responses?.length === 1, "Survey has 1 response recorded");
      assert(fetched?.responses[0].feedback?.includes("Love"), "Response feedback preserved correctly");

      // Cleanup test survey & cascade
      await prisma.survey.delete({ where: { id: survey.id } });
      const countAfter = await prisma.surveyResponse.count({ where: { surveyId: survey.id } });
      assert(countAfter === 0, "Cascaded response deletion on survey removal");

      // ---------------------------------------------------------------------------
      // 6. FEEDBACK ROUTING RULES & SAFETY INTEGRITY
      // ---------------------------------------------------------------------------
      console.log("\n6. Testing Feedback Routing Engine & Safety Gates...");
      const { isRuleMatching } = await import("../src/types/routing.ts");
      const { executeSurveyRouting } = await import("../src/lib/surveys/routing-engine.ts");

      // Test Condition Matching
      assert(
        isRuleMatching({ triggerCondition: "NPS_PROMOTER" }, { score: 10, scoreType: "NPS" }).matched,
        "NPS_PROMOTER matches score 10"
      );
      assert(
        !isRuleMatching({ triggerCondition: "NPS_PROMOTER" }, { score: 5, scoreType: "NPS" }).matched,
        "NPS_PROMOTER rejects score 5"
      );
      assert(
        isRuleMatching({ triggerCondition: "NPS_DETRACTOR" }, { score: 2, scoreType: "NPS" }).matched,
        "NPS_DETRACTOR matches score 2"
      );
      assert(
        isRuleMatching({ triggerCondition: "CSAT_SATISFIED" }, { score: 5, scoreType: "CSAT" }).matched,
        "CSAT_SATISFIED matches rating 5"
      );
      assert(
        !isRuleMatching({ triggerCondition: "CSAT_SATISFIED" }, { score: 2, scoreType: "CSAT" }).matched,
        "CSAT_SATISFIED rejects rating 2"
      );
      assert(
        isRuleMatching({ triggerCondition: "CES_LOW_EFFORT" }, { score: 6, scoreType: "CES" }).matched,
        "CES_LOW_EFFORT matches effort score 6"
      );
      assert(
        !isRuleMatching(
          { triggerCondition: "ALWAYS", requireFeedback: true },
          { score: 8, scoreType: "NPS", feedback: "" }
        ).matched,
        "Fails when required feedback is empty"
      );
      assert(
        isRuleMatching(
          { triggerCondition: "ALWAYS", keywordContains: "pricing, bug" },
          { score: 3, scoreType: "NPS", feedback: "There is a major bug in billing" }
        ).matched,
        "Matches keyword filter in feedback"
      );
      assert(
        !isRuleMatching(
          { triggerCondition: "ALWAYS", isEnabled: false },
          { score: 10, scoreType: "NPS" }
        ).matched,
        "Disabled rule returns matched: false"
      );

      // Create a survey to test live routing execution
      const routeTestSurvey = await prisma.survey.create({
        data: {
          workspaceId: workspace.id,
          title: "Routing Test Survey",
          slug: `routing-test-${Date.now()}`,
          type: "NPS",
          primaryPrompt: "How likely are you to recommend us?",
        },
      });

      // Rule A: Positive feedback -> Testimonial Request
      const rulePromoter = await prisma.surveyRoutingRule.create({
        data: {
          workspaceId: workspace.id,
          surveyId: routeTestSurvey.id,
          name: "Promoter to Testimonial",
          triggerCondition: "NPS_PROMOTER",
          actionType: "REQUEST_TESTIMONIAL",
          isEnabled: true,
          priority: 10,
        },
      });

      // Rule B: Detractor -> Internal Inbox
      const ruleDetractor = await prisma.surveyRoutingRule.create({
        data: {
          workspaceId: workspace.id,
          surveyId: routeTestSurvey.id,
          name: "Detractor to Inbox",
          triggerCondition: "NPS_DETRACTOR",
          actionType: "INTERNAL_INBOX",
          isEnabled: true,
          priority: 20,
        },
      });

      // Rule C: Malicious rule trying to turn negative feedback into a testimonial
      const ruleBad = await prisma.surveyRoutingRule.create({
        data: {
          workspaceId: workspace.id,
          surveyId: routeTestSurvey.id,
          name: "Bad Rule",
          triggerCondition: "ALWAYS",
          actionType: "REQUEST_TESTIMONIAL",
          isEnabled: true,
          priority: 5,
        },
      });

      // Submit Promoter response
      const promoterResp = await prisma.surveyResponse.create({
        data: {
          surveyId: routeTestSurvey.id,
          workspaceId: workspace.id,
          score: 10,
          scoreType: "NPS",
          feedback: "Incredible platform, solved all our social proof workflows!",
          respondentName: "Happy Founder",
          respondentEmail: "founder@happy.com",
        },
      });

      // Execute routing
      const exec1 = await executeSurveyRouting({
        workspaceId: workspace.id,
        surveyId: routeTestSurvey.id,
        responseId: promoterResp.id,
      });

      assert(exec1.executedRules >= 1, "Promoter executed routing rules");
      const promoterResult = exec1.results.find((r) => r.ruleId === rulePromoter.id);
      assert(promoterResult && promoterResult.status === "SUCCESS", "Promoter rule executed with status SUCCESS");

      // Verify unapproved draft testimonial was created (status PENDING, NOT published!)
      const draftTestimonial = await prisma.testimonial.findFirst({
        where: { workspaceId: workspace.id, sourceType: "SURVEY_ROUTING" },
        orderBy: { submittedAt: "desc" },
      });
      assert(draftTestimonial !== null, "Created draft testimonial from positive feedback");
      assert(draftTestimonial?.status === "PENDING", "Draft testimonial is PENDING (never auto-published)");

      // Idempotency test: Re-run routing on the same response
      const execDuplicate = await executeSurveyRouting({
        workspaceId: workspace.id,
        surveyId: routeTestSurvey.id,
        responseId: promoterResp.id,
      });
      const dupeResult = execDuplicate.results.find((r) => r.ruleId === rulePromoter.id);
      assert(
        dupeResult?.status === "SKIPPED" && dupeResult?.reason?.includes("Duplicate"),
        "Duplicate action prevented by idempotency check"
      );

      // Submit Detractor response
      const detractorResp = await prisma.surveyResponse.create({
        data: {
          surveyId: routeTestSurvey.id,
          workspaceId: workspace.id,
          score: 2,
          scoreType: "NPS",
          feedback: "The setup was extremely frustrating and buggy.",
          respondentName: "Frustrated User",
          respondentEmail: "user@angry.com",
        },
      });

      const exec2 = await executeSurveyRouting({
        workspaceId: workspace.id,
        surveyId: routeTestSurvey.id,
        responseId: detractorResp.id,
      });

      // Verify detractor routed to inbox
      const inboxResult = exec2.results.find((r) => r.ruleId === ruleDetractor.id);
      assert(inboxResult && inboxResult.status === "SUCCESS", "Detractor routed to internal inbox");

      // Safety check: Rule C (bad rule trying to make negative feedback a testimonial) must be BLOCKED
      const badResult = exec2.results.find((r) => r.ruleId === ruleBad.id);
      assert(
        badResult?.status === "SKIPPED" && badResult?.reason?.includes("Safety Block"),
        "Safety Gate: Blocked converting negative feedback into a testimonial request"
      );

      // Verify routing logs were recorded
      const logCount = await prisma.surveyRoutingLog.count({
        where: { surveyId: routeTestSurvey.id },
      });
      assert(logCount >= 3, `Auditable routing logs recorded (count = ${logCount})`);

      // Cleanup routing test survey
      await prisma.survey.delete({ where: { id: routeTestSurvey.id } });
      console.log("  ✓ Routing test resources cleanly cleaned up");
    }
  } catch (err) {
    console.error("Database test error:", err);
    failed++;
  }

  console.log("\n=================================================");
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
