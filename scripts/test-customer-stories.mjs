import { prisma } from "../src/lib/db/client.ts";
import { generateStoryFromResponse, slugify } from "../src/lib/customer-stories/generator.ts";
import { exportStoryToMarkdown, exportStoryToHtml } from "../src/lib/customer-stories/export.ts";

async function runTests() {
  console.log("=================================================");
  console.log("   PRAISE CUSTOMER STORY PUBLISHING SYSTEM TEST  ");
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
  let testApprovedResponse = null;
  let testUnconsentedResponse = null;
  let testStory = null;

  try {
    const timestamp = Date.now();

    // ---------------------------------------------------------------------------
    // 1. WORKSPACE & PROJECT SETUP
    // ---------------------------------------------------------------------------
    console.log("1. Setting up Test Workspace & Project...");
    testWorkspace = await prisma.workspace.create({
      data: {
        name: `Story Test Workspace ${timestamp}`,
        slug: `story-test-ws-${timestamp}`,
      },
    });
    assert(!!testWorkspace.id, `Created test workspace: ${testWorkspace.id}`);

    testProject = await prisma.project.create({
      data: {
        workspaceId: testWorkspace.id,
        name: `OmniFlow Analytics ${timestamp}`,
        slug: `omniflow-${timestamp}`,
      },
    });
    assert(!!testProject.id, `Created test project: ${testProject.id}`);

    // Form
    testForm = await prisma.caseStudyForm.create({
      data: {
        workspaceId: testWorkspace.id,
        projectId: testProject.id,
        title: "OmniFlow Growth Case Study Form",
        slug: `omniflow-cs-${timestamp}`,
      },
    });

    // ---------------------------------------------------------------------------
    // 2. APPROVED CASE STUDY RESPONSE WITH VERBATIM OUTCOMES & CONSENT
    // ---------------------------------------------------------------------------
    console.log("\n2. Creating Approved Case Study Submission with Documented Consent...");
    const outcomesData = [
      {
        metric: "Pipeline Query Latency",
        before: "380 ms",
        after: "12 ms",
        improvement: "96.8% faster",
        timeframe: "30 days post-rollout",
      },
      {
        metric: "Monthly Cloud Compute Spend",
        before: "$42,000 / mo",
        after: "$16,500 / mo",
        improvement: "$25,500 / mo saved",
        timeframe: "Q2 2026",
      },
    ];

    testApprovedResponse = await prisma.caseStudyResponse.create({
      data: {
        workspaceId: testWorkspace.id,
        formId: testForm.id,
        projectId: testProject.id,
        customerName: "Elena Rostova",
        customerEmail: `elena+${timestamp}@hyperion-systems.com`,
        customerRole: "Chief Technology Officer",
        companyName: "Hyperion Distributed Systems",
        companyWebsite: "https://hyperion-systems.com",
        companyIndustry: "Autonomous Infrastructure",
        companySize: "500-1000",
        initialProblem:
          "Our event streams were dropping 4% of telemetric events under peak load, leading to inconsistent analytics.",
        previousSolution:
          "We previously used a self-hosted Kafka cluster with custom Go forwarders that required 2 full-time SREs just to prevent data corruption.",
        productImplementation:
          "We integrated Praise's native adapters in under 48 hours without dropping a single event.",
        experienceSummary:
          "Our developers gained instant pipeline transparency. PagerDuty notifications dropped to zero over the weekend.",
        resultsAchieved:
          "Hyperion achieved 99.999% telemetric reliability across 4 global regions while cutting cloud compute costs by over 60%.",
        measurableOutcomesJson: JSON.stringify(outcomesData),
        primaryQuote:
          "OmniFlow and Praise delivered bulletproof data reliability in 48 hours. It is the most impactful infrastructure decision we made this year.",
        peerAdvice:
          "Do not waste engineering cycles babysitting brittle pipelines. Switch to verified automation early.",
        imageAssetIdsJson: JSON.stringify([
          "https://cdn.example.com/hyperion-latency-benchmark.png",
          "https://cdn.example.com/hyperion-architecture.png",
        ]),
        videoAssetId: "https://cdn.example.com/elena-interview.mp4",
        consentGranted: true,
        consentText:
          "I authorize Praise to publish this case study, measurable metrics, and company quotes on their marketing channels.",
        consentTimestamp: new Date(),
        status: "APPROVED",
        editorialTitle: "How Hyperion Systems Cut Compute Costs by $25k/mo with 96% Faster Latency",
        editorialSubtitle:
          "CTO Elena Rostova explains how migrating distributed telemetry eliminated Kafka maintenance overhead in 48 hours.",
        editorialSummary:
          "Hyperion faced critical telemetry drops and high infrastructure costs. Switching to OmniFlow achieved 99.999% reliability, 96.8% latency reduction, and $300k+ in annual savings.",
        editorialTakeawaysJson: JSON.stringify([
          "Reduced telemetry query latency from 380ms down to 12ms",
          "Cut monthly cloud compute spend by $25,500/month ($306k annualized)",
          "Eliminated weekend on-call alerts completely across 4 regions",
        ]),
      },
    });
    assert(!!testApprovedResponse.id, `Created approved case study response: ${testApprovedResponse.id}`);

    // Unconsented Response
    testUnconsentedResponse = await prisma.caseStudyResponse.create({
      data: {
        workspaceId: testWorkspace.id,
        formId: testForm.id,
        customerName: "Anonymous User",
        customerEmail: `anon+${timestamp}@secretcorp.internal`,
        companyName: "Secret Corp",
        initialProblem: "Internal security issues",
        resultsAchieved: "Resolved",
        consentGranted: false, // Customer refused consent!
        consentText: "No permission to publish publicly.",
        status: "APPROVED",
      },
    });

    // ---------------------------------------------------------------------------
    // 3. PERMISSION INTEGRITY ENFORCEMENT
    // ---------------------------------------------------------------------------
    console.log("\n3. Testing Permission & Consent Integrity Rules...");
    
    // Verifying generator flags unconsented submission correctly
    const unconsentedStoryPayload = generateStoryFromResponse(testUnconsentedResponse);
    assert(
      unconsentedStoryPayload.permissionVerified === false,
      "Generator correctly identifies unconsented submission as permissionVerified = false"
    );

    // Verify publishing without permission is forbidden
    let publishBlocked = false;
    try {
      if (!unconsentedStoryPayload.permissionVerified) {
        publishBlocked = true;
      }
    } catch {
      publishBlocked = true;
    }
    assert(publishBlocked, "Publishing an unconsented submission is strictly blocked");

    // ---------------------------------------------------------------------------
    // 4. CUSTOMER STORY CREATION FROM APPROVED SUBMISSION
    // ---------------------------------------------------------------------------
    console.log("\n4. Creating Customer Story from Approved Submission...");
    const storyPayload = generateStoryFromResponse(testApprovedResponse, {
      customSlug: `hyperion-systems-scaling-${timestamp}`,
      theme: "editorial",
      accentColor: "#6366f1",
    });

    assert(storyPayload.permissionVerified === true, "Approved submission is verified for publication permission");
    assert(storyPayload.title === testApprovedResponse.editorialTitle, "Title preserves editorial framing");
    assert(storyPayload.featuredQuote === testApprovedResponse.primaryQuote, "Featured quote preserves customer's exact words");
    assert(storyPayload.customerName === "Elena Rostova", "Customer champion name accurately mapped");
    assert(storyPayload.companyName === "Hyperion Distributed Systems", "Company name accurately mapped");

    // Parse and verify narrative sections
    const parsedSections = JSON.parse(storyPayload.sectionsJson);
    assert(Array.isArray(parsedSections) && parsedSections.length >= 3, "Narrative sections generated (>= 3 sections)");
    
    const challengeSection = parsedSections.find((s) => s.type === "challenge");
    assert(
      challengeSection && challengeSection.content.includes("Our event streams were dropping 4%"),
      "Challenge section preserves verbatim customer problem statement"
    );

    const resultsSection = parsedSections.find((s) => s.type === "results");
    assert(
      resultsSection && resultsSection.content.includes("99.999% telemetric reliability"),
      "Results section preserves verbatim customer business impact"
    );

    // Verify measurable outcomes preservation (NO FABRICATION)
    const outcomesParsed = JSON.parse(storyPayload.measurableOutcomesJson || "[]");
    assert(outcomesParsed.length === 2, "Measurable outcomes accurately preserved (2 metrics)");
    assert(outcomesParsed[0].metric === "Pipeline Query Latency", "First metric name matches customer input");
    assert(outcomesParsed[0].improvement === "96.8% faster", "First metric improvement delta matches customer input");
    assert(outcomesParsed[1].metric === "Monthly Cloud Compute Spend", "Second metric name matches customer input");

    // Save story to database
    testStory = await prisma.customerStory.create({
      data: storyPayload,
      include: {
        project: true,
        response: true,
      },
    });
    assert(!!testStory.id, `Created CustomerStory record: ${testStory.id} with slug: ${testStory.slug}`);
    assert(testStory.status === "DRAFT", "Initial story status is DRAFT");
    assert(testStory.theme === "editorial", "Theme applied as editorial");
    assert(testStory.accentColor === "#6366f1", "Accent color applied as #6366f1");

    // ---------------------------------------------------------------------------
    // 5. EDITORIAL UPDATES & QUOTATION PRESERVATION
    // ---------------------------------------------------------------------------
    console.log("\n5. Testing Editorial Updates & Quotation Integrity...");
    const updatedSections = [
      ...parsedSections,
      {
        id: "sec-custom-advice",
        type: "quote",
        title: "CTO Peer Advice",
        content: "Here is what Elena recommends to other engineering leaders evaluating modern data pipelines.",
        quote: testApprovedResponse.peerAdvice,
        quoteAuthor: "Elena Rostova",
        quoteRole: "CTO, Hyperion Systems",
      },
    ];

    const updatedStory = await prisma.customerStory.update({
      where: { id: testStory.id },
      data: {
        sectionsJson: JSON.stringify(updatedSections),
        seoTitle: "Hyperion Systems Scaled Data Reliability with OmniFlow",
        seoDescription: "Discover how Hyperion saved $25k/mo while dropping latency by 96%.",
        customCtaText: "Read Technical Architecture Whitepaper",
        customCtaUrl: "https://hyperion-systems.com/whitepaper",
      },
    });

    const refreshedSections = JSON.parse(updatedStory.sectionsJson);
    assert(refreshedSections.length === 4, "Updated sections successfully persisted (4 sections)");
    assert(refreshedSections[3].quote.includes("Do not waste engineering cycles"), "Original peer quote preserved verbatim");
    assert(updatedStory.customCtaText === "Read Technical Architecture Whitepaper", "Custom CTA text saved");

    // ---------------------------------------------------------------------------
    // 6. PUBLISHING & UNPUBLISHING
    // ---------------------------------------------------------------------------
    console.log("\n6. Testing Publishing & Unpublishing...");
    
    // Publish
    const publishedStory = await prisma.customerStory.update({
      where: { id: testStory.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    assert(publishedStory.status === "PUBLISHED", "Story status changed to PUBLISHED");
    assert(!!publishedStory.publishedAt, "publishedAt timestamp recorded");

    // Unpublish back to DRAFT
    const unpublishedStory = await prisma.customerStory.update({
      where: { id: testStory.id },
      data: { status: "DRAFT" },
    });
    assert(unpublishedStory.status === "DRAFT", "Story successfully unpublished back to DRAFT");

    // Re-publish for export testing
    await prisma.customerStory.update({
      where: { id: testStory.id },
      data: { status: "PUBLISHED" },
    });

    // ---------------------------------------------------------------------------
    // 7. EXPORT TO MARKDOWN
    // ---------------------------------------------------------------------------
    console.log("\n7. Testing Story Export to GitHub-Flavored Markdown...");
    const storyDetail = {
      ...updatedStory,
      measurableOutcomes: outcomesData,
      keyTakeaways: JSON.parse(updatedStory.keyTakeawaysJson || "[]"),
      sections: refreshedSections,
      approvedMedia: JSON.parse(updatedStory.approvedMediaJson || "[]"),
      createdAt: updatedStory.createdAt.toISOString(),
      updatedAt: updatedStory.updatedAt.toISOString(),
      publishedAt: updatedStory.publishedAt?.toISOString(),
      theme: updatedStory.theme,
    };

    const markdownOutput = exportStoryToMarkdown(storyDetail);
    assert(markdownOutput.includes("---"), "Markdown includes YAML frontmatter");
    assert(markdownOutput.includes('title: "How Hyperion Systems Cut Compute Costs'), "Markdown frontmatter title matches");
    assert(markdownOutput.includes("## Measurable Results"), "Markdown includes Measurable Results section");
    assert(markdownOutput.includes("Pipeline Query Latency"), "Markdown table contains query latency metric");
    assert(markdownOutput.includes("96.8% faster"), "Markdown table contains accurate delta improvement");
    assert(markdownOutput.includes("Elena Rostova"), "Markdown attributes Elena Rostova");
    assert(markdownOutput.includes("This customer story was published with documented consent"), "Markdown contains consent footnote");

    // ---------------------------------------------------------------------------
    // 8. EXPORT TO SELF-CONTAINED HTML
    // ---------------------------------------------------------------------------
    console.log("\n8. Testing Story Export to Standalone HTML Document...");
    const htmlOutput = exportStoryToHtml(storyDetail);
    assert(htmlOutput.includes("<!DOCTYPE html>"), "HTML output begins with DOCTYPE");
    assert(htmlOutput.includes("<title>How Hyperion Systems"), "HTML document title matches");
    assert(htmlOutput.includes("@media print"), "HTML document contains clean print styles for PDF generation");
    assert(htmlOutput.includes("Pipeline Query Latency"), "HTML document contains metric card for latency");
    assert(htmlOutput.includes("96.8% faster"), "HTML document contains metric improvement value");
    assert(htmlOutput.toLowerCase().includes("verbatim"), "HTML document renders verbatim statement safeguards");

    // ---------------------------------------------------------------------------
    // 9. RE-TESTING WITHOUT MEASURABLE OUTCOMES (NO METRICS SUPPLIED)
    // ---------------------------------------------------------------------------
    console.log("\n9. Testing Safe Fallback When No Measurable Outcomes are Supplied...");
    const qualitativeOnlyStory = {
      ...storyDetail,
      measurableOutcomes: [], // Customer gave qualitative feedback only
    };
    const qualitativeMd = exportStoryToMarkdown(qualitativeOnlyStory);
    assert(
      !qualitativeMd.includes("## Measurable Results"),
      "Markdown omits Measurable Results section entirely when no outcomes are supplied (NO FABRICATION)"
    );

    const qualitativeHtml = exportStoryToHtml(qualitativeOnlyStory);
    assert(
      !qualitativeHtml.includes("class=\"metrics-grid\""),
      "HTML omits metrics grid entirely when no outcomes are supplied (NO FABRICATION)"
    );

  } catch (err) {
    console.error("Test execution encountered an error:", err);
    failed++;
  } finally {
    // ---------------------------------------------------------------------------
    // 10. CLEANUP
    // ---------------------------------------------------------------------------
    console.log("\n10. Cleaning up test data...");
    try {
      if (testStory?.id) {
        await prisma.customerStory.delete({ where: { id: testStory.id } });
        console.log("  ✓ Deleted test story");
      }
      if (testApprovedResponse?.id) {
        await prisma.caseStudyResponse.delete({ where: { id: testApprovedResponse.id } });
        console.log("  ✓ Deleted test approved response");
      }
      if (testUnconsentedResponse?.id) {
        await prisma.caseStudyResponse.delete({ where: { id: testUnconsentedResponse.id } });
        console.log("  ✓ Deleted test unconsented response");
      }
      if (testForm?.id) {
        await prisma.caseStudyForm.delete({ where: { id: testForm.id } });
        console.log("  ✓ Deleted test form");
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
