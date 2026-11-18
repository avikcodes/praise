import { prisma } from "../src/lib/db/client.ts";
import { DEFAULT_QUESTIONS_CONFIG, CASE_STUDY_TEMPLATES } from "../src/lib/case-studies/templates.ts";

async function runTests() {
  console.log("=================================================");
  console.log("   PRAISE CASE STUDY COLLECTION VERIFICATION     ");
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

  let testWorkspace = null;
  let testProject = null;
  let testForm = null;
  let testTemplate = null;
  let testResponse = null;
  let testCustomer = null;

  try {
    // ---------------------------------------------------------------------------
    // 1. SYSTEM TEMPLATES VERIFICATION
    // ---------------------------------------------------------------------------
    console.log("1. Verifying Built-in Case Study Templates & Default Config...");
    assert(CASE_STUDY_TEMPLATES.length >= 5, `Found ${CASE_STUDY_TEMPLATES.length} built-in templates (>= 5 expected)`);
    
    const b2bTemplate = CASE_STUDY_TEMPLATES.find((t) => t.category === "SAAS");
    assert(!!b2bTemplate, "B2B SaaS template exists");
    assert(b2bTemplate?.questionsConfig?.initialProblem?.enabled === true, "B2B SaaS template enables initialProblem section");
    assert(b2bTemplate?.questionsConfig?.measurableOutcomes?.enabled === true, "B2B SaaS template enables measurable outcomes");

    const defaultSections = Object.keys(DEFAULT_QUESTIONS_CONFIG);
    assert(defaultSections.includes("customerBackground"), "Default config includes customerBackground section");
    assert(defaultSections.includes("companyRole"), "Default config includes companyRole section");
    assert(defaultSections.includes("initialProblem"), "Default config includes initialProblem section");
    assert(defaultSections.includes("previousSolution"), "Default config includes previousSolution section");
    assert(defaultSections.includes("productImplementation"), "Default config includes productImplementation section");
    assert(defaultSections.includes("resultsAchieved"), "Default config includes resultsAchieved section");
    assert(defaultSections.includes("measurableOutcomes"), "Default config includes measurableOutcomes section");
    assert(defaultSections.includes("quotes"), "Default config includes quotes section");
    assert(defaultSections.includes("mediaProof"), "Default config includes mediaProof section");

    // ---------------------------------------------------------------------------
    // 2. WORKSPACE & PROJECT SETUP
    // ---------------------------------------------------------------------------
    console.log("\n2. Setting up Test Workspace & Project...");
    const timestamp = Date.now();
    testWorkspace = await prisma.workspace.create({
      data: {
        name: `Case Study Test Workspace ${timestamp}`,
        slug: `cs-test-ws-${timestamp}`,
      },
    });
    assert(!!testWorkspace.id, `Created test workspace: ${testWorkspace.id}`);

    testProject = await prisma.project.create({
      data: {
        workspaceId: testWorkspace.id,
        name: `Acme Cloud Suite ${timestamp}`,
        slug: `acme-cloud-${timestamp}`,
      },
    });
    assert(!!testProject.id, `Created test project: ${testProject.id}`);

    // ---------------------------------------------------------------------------
    // 3. CASE STUDY TEMPLATE CREATION
    // ---------------------------------------------------------------------------
    console.log("\n3. Testing Custom Case Study Template Creation...");
    const customConfig = {
      ...DEFAULT_QUESTIONS_CONFIG,
      initialProblem: {
        ...DEFAULT_QUESTIONS_CONFIG.initialProblem,
        title: "Legacy Infrastructure Bottlenecks",
        promptText: "Describe the scaling limits of your previous on-prem deployment.",
      },
    };

    testTemplate = await prisma.caseStudyTemplate.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Enterprise Migration Template",
        description: "Tailored for large enterprise database transitions",
        category: "ENTERPRISE",
        configJson: JSON.stringify(customConfig),
      },
    });
    assert(!!testTemplate.id, `Created custom case study template: ${testTemplate.name}`);

    // ---------------------------------------------------------------------------
    // 4. CASE STUDY FORM CREATION
    // ---------------------------------------------------------------------------
    console.log("\n4. Testing Case Study Form Creation...");
    const formSlug = `enterprise-success-${timestamp}`;
    testForm = await prisma.caseStudyForm.create({
      data: {
        workspaceId: testWorkspace.id,
        projectId: testProject.id,
        templateId: testTemplate.id,
        title: "Share Your Scale Story with Acme",
        slug: formSlug,
        description: "Help other engineering leaders understand the impact of seamless sync",
        welcomeHeading: "We deeply appreciate your partnership and want to feature your achievements.",
        allowVideo: true,
        allowImages: true,
        accentColor: "#4f46e5",
        theme: "dark",
        status: "ACTIVE",
        questionsConfigJson: JSON.stringify(customConfig),
      },
    });
    assert(!!testForm.id, `Created case study form with slug: ${testForm.slug}`);
    assert(testForm.status === "ACTIVE", "Form status is ACTIVE");
    assert(testForm.allowVideo === true, "Form allows video responses");
    assert(testForm.allowImages === true, "Form allows screenshots and images");

    // ---------------------------------------------------------------------------
    // 5. PUBLIC SUBMISSION SIMULATION & INTEGRITY RULES
    // ---------------------------------------------------------------------------
    console.log("\n5. Testing Public Case Study Submission & Customer Auto-Linking...");
    
    // Simulate customer submission data
    const submissionEmail = `sarah.connor+${timestamp}@skytech-robotics.io`;
    const submissionData = {
      customerName: "Sarah Connor",
      customerEmail: submissionEmail,
      customerRole: "VP of Engineering",
      customerCompany: "SkyTech Robotics",
      customerWebsite: "https://skytech-robotics.io",
      companySize: "250-500",
      industry: "Robotics & AI Infrastructure",
      
      // Verbatim Statements
      initialProblem: "Our distributed compute nodes were experiencing high latency and replication lags of over 45 minutes.",
      previousSolution: "We previously maintained custom shell scripts and an open-source sync engine that frequently crashed under load.",
      productImplementation: "We migrated all 120 nodes in less than two weeks using Acme's zero-downtime replication connectors.",
      experienceSummary: "The interface gave our DevOps team immediate visibility, reducing pager alerts by 90%.",
      resultsAchieved: "We unlocked continuous live telemetry across all robotic fleets and reduced operational overhead significantly.",
      
      // Measurable Outcomes
      measurableOutcomes: [
        {
          metric: "Replication Lag",
          before: "45 mins",
          after: "< 2 secs",
          improvement: "99.9% reduction",
          timeframe: "First 14 days",
        },
        {
          metric: "Engineering Maintenance Hours",
          before: "15 hrs / week",
          after: "1 hr / week",
          improvement: "93% time saved",
          timeframe: "Ongoing monthly",
        },
      ],

      // Quotes & Peer Advice
      primaryQuote: "Acme delivered in 14 days what our internal team spent 9 months trying to solve.",
      peerAdvice: "Do not delay automated replication; moving early saved us months of engineering headache.",
      
      // Supporting Media
      supportingScreenshots: [
        "https://cdn.example.com/skytech-dashboard-latency.png",
        "https://cdn.example.com/skytech-architecture.png",
      ],
      videoResponseUrl: "https://cdn.example.com/skytech-video-interview.mp4",

      // Consent
      consentGranted: true,
      consentText: "I agree that Praise and Acme may feature this case study on their public website and marketing materials.",
    };

    // Auto-resolve or create customer record in CRM
    testCustomer = await prisma.customer.upsert({
      where: {
        workspaceId_email: {
          workspaceId: testWorkspace.id,
          email: submissionData.customerEmail,
        },
      },
      update: {
        name: submissionData.customerName,
        title: submissionData.customerRole,
        company: submissionData.customerCompany,
        website: submissionData.customerWebsite,
      },
      create: {
        workspaceId: testWorkspace.id,
        name: submissionData.customerName,
        email: submissionData.customerEmail,
        title: submissionData.customerRole,
        company: submissionData.customerCompany,
        website: submissionData.customerWebsite,
        stage: "ADVOCATE",
      },
    });
    assert(!!testCustomer.id, `Auto-resolved customer in CRM: ${testCustomer.name} (${testCustomer.company})`);

    // Create the CaseStudyResponse record
    testResponse = await prisma.caseStudyResponse.create({
      data: {
        workspaceId: testWorkspace.id,
        formId: testForm.id,
        projectId: testForm.projectId,
        customerId: testCustomer.id,
        
        customerName: submissionData.customerName,
        customerEmail: submissionData.customerEmail,
        customerRole: submissionData.customerRole,
        companyName: submissionData.customerCompany,
        companyWebsite: submissionData.customerWebsite,
        companySize: submissionData.companySize,
        companyIndustry: submissionData.industry,

        initialProblem: submissionData.initialProblem,
        previousSolution: submissionData.previousSolution,
        productImplementation: submissionData.productImplementation,
        experienceSummary: submissionData.experienceSummary,
        resultsAchieved: submissionData.resultsAchieved,
        measurableOutcomesJson: JSON.stringify(submissionData.measurableOutcomes),

        primaryQuote: submissionData.primaryQuote,
        peerAdvice: submissionData.peerAdvice,
        imageAssetIdsJson: JSON.stringify(submissionData.supportingScreenshots),
        videoAssetId: submissionData.videoResponseUrl,

        consentGranted: submissionData.consentGranted,
        consentText: submissionData.consentText,
        consentTimestamp: new Date(),
        status: "SUBMITTED",
      },
    });

    assert(!!testResponse.id, `Created CaseStudyResponse: ${testResponse.id}`);
    assert(testResponse.status === "SUBMITTED", "Default response status is SUBMITTED");
    assert(testResponse.customerId === testCustomer.id, "Response is linked to customer profile");
    assert(testResponse.consentGranted === true, "Publication consent recorded as true");
    assert(testResponse.consentText.includes("I agree"), "Consent text recorded verbatim");

    // Validate outcomes preservation (no fabrication, exact values kept)
    const outcomes = JSON.parse(testResponse.measurableOutcomesJson || "[]");
    assert(Array.isArray(outcomes) && outcomes.length === 2, "Measurable outcomes array preserved");
    assert(outcomes[0].metric === "Replication Lag", "Metric name accurately recorded");
    assert(outcomes[0].before === "45 mins" && outcomes[0].after === "< 2 secs", "Outcomes before/after accurately stored");
    assert(outcomes[0].improvement === "99.9% reduction", "Outcome improvement percentage accurately stored");

    // ---------------------------------------------------------------------------
    // 6. EDITORIAL WORKFLOW & STRICT SEPARATION OF VERBATIM VS EDITORIAL
    // ---------------------------------------------------------------------------
    console.log("\n6. Testing Review, Approval & Editorial Separation...");
    
    // Simulate Editorial Team reviewing and enriching without touching customer words
    const editorialUpdates = {
      status: "APPROVED",
      editorialTitle: "How SkyTech Slashed Compute Latency by 99% with Acme",
      editorialSubtitle: "Zero-downtime replication across 120 distributed robotics nodes in under 14 days.",
      editorialSummary: "SkyTech Robotics faced critical 45-minute sync delays with brittle shell scripts. In two weeks, Acme replaced the entire pipeline, saving 14 engineering hours per week.",
      editorialTakeawaysJson: JSON.stringify([
        "Eliminated 45-minute replication lags down to real-time (< 2s)",
        "Freed 14 hours per engineer per week from pipeline maintenance",
        "Zero-downtime deployment executed in under two weeks across 120 nodes",
      ]),
      featuredQuoteOverride: "Acme delivered in 14 days what our internal team spent 9 months trying to solve.",
      editorialNotes: "Approved by VP of Eng. Legal verified consent. Ready for case-study landing page feature.",
    };

    const updatedResponse = await prisma.caseStudyResponse.update({
      where: { id: testResponse.id },
      data: editorialUpdates,
    });

    assert(updatedResponse.status === "APPROVED", "Status successfully transitioned to APPROVED");
    assert(updatedResponse.editorialTitle === editorialUpdates.editorialTitle, "Editorial title saved");
    const parsedTakeaways = JSON.parse(updatedResponse.editorialTakeawaysJson || "[]");
    assert(Array.isArray(parsedTakeaways) && parsedTakeaways.length === 3, "Editorial takeaways saved");
    
    // Verify Customer Verbatim Statements REMAIN UNCHANGED
    assert(updatedResponse.initialProblem === submissionData.initialProblem, "Customer verbatim problem statement is UNCHANGED");
    assert(updatedResponse.previousSolution === submissionData.previousSolution, "Customer verbatim previous solution is UNCHANGED");
    assert(updatedResponse.resultsAchieved === submissionData.resultsAchieved, "Customer verbatim results statement is UNCHANGED");
    assert(updatedResponse.primaryQuote === submissionData.primaryQuote, "Customer verbatim quote is UNCHANGED");
    assert(updatedResponse.consentGranted === true, "Customer consent remains verified");

    // Test transition to PUBLISHED
    const publishedResponse = await prisma.caseStudyResponse.update({
      where: { id: testResponse.id },
      data: { status: "PUBLISHED" },
    });
    assert(publishedResponse.status === "PUBLISHED", "Response successfully transitioned to PUBLISHED");

  } catch (err) {
    console.error("Test execution failed with error:", err);
    failed++;
  } finally {
    // ---------------------------------------------------------------------------
    // 7. CLEANUP
    // ---------------------------------------------------------------------------
    console.log("\n7. Cleaning up test data...");
    try {
      if (testResponse?.id) {
        await prisma.caseStudyResponse.delete({ where: { id: testResponse.id } });
        console.log("  ✓ Deleted test response");
      }
      if (testForm?.id) {
        await prisma.caseStudyForm.delete({ where: { id: testForm.id } });
        console.log("  ✓ Deleted test form");
      }
      if (testTemplate?.id) {
        await prisma.caseStudyTemplate.delete({ where: { id: testTemplate.id } });
        console.log("  ✓ Deleted test template");
      }
      if (testCustomer?.id) {
        await prisma.customer.delete({ where: { id: testCustomer.id } });
        console.log("  ✓ Deleted test customer");
      }
      if (testProject?.id) {
        await prisma.project.delete({ where: { id: testProject.id } });
        console.log("  ✓ Deleted test project");
      }
      if (testWorkspace?.id) {
        await prisma.workspace.delete({ where: { id: testWorkspace.id } });
        console.log("  ✓ Deleted test workspace");
      }
    } catch (cleanupErr) {
      console.warn("  ⚠ Warning during cleanup:", cleanupErr.message);
    }
  }

  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
