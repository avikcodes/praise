import assert from "node:assert";
import { prisma } from "../src/lib/db/client.ts";
import {
  getWorkspaceCampaignAnalytics,
  generateCampaignCsv,
  generateRecipientCsv,
} from "../src/lib/analytics/campaign-tracker.ts";
import { METRIC_DEFINITIONS } from "../src/lib/analytics/types.ts";

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function testAsync(description, fn) {
  try {
    await fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log("==========================================================");
  console.log("   PRAISE INVITATION CAMPAIGN ANALYTICS VERIFICATION      ");
  console.log("==========================================================\n");

  // 1. Metric Definitions & Privacy Transparency
  console.log("1. Testing Metric Definitions & Documentation Catalog...");

  test("Metric definitions catalog has Recipients (Target Audience)", () => {
    assert(METRIC_DEFINITIONS.campaignRecipients);
    assert.strictEqual(METRIC_DEFINITIONS.campaignRecipients.category, "Campaign");
    assert(METRIC_DEFINITIONS.campaignRecipients.calculationMethod.includes("Count"));
  });

  test("Metric definitions catalog has Messages Sent (Outbound queue)", () => {
    assert(METRIC_DEFINITIONS.campaignMessagesSent);
    assert.strictEqual(METRIC_DEFINITIONS.campaignMessagesSent.category, "Campaign");
  });

  test("Metric definitions catalog has Delivery Successes (Provider Handshake)", () => {
    assert(METRIC_DEFINITIONS.campaignDeliverySuccess);
    assert.strictEqual(METRIC_DEFINITIONS.campaignDeliverySuccess.sourceType, "PROVIDER_REPORTED");
  });

  test("Metric definitions catalog has Delivery Failures", () => {
    assert(METRIC_DEFINITIONS.campaignDeliveryFailures);
    assert.strictEqual(METRIC_DEFINITIONS.campaignDeliveryFailures.sourceType, "PROVIDER_REPORTED");
  });

  test("Metric definitions catalog has Bounces (Hard & Soft Mailbox Rejections)", () => {
    assert(METRIC_DEFINITIONS.campaignBounces);
    assert.strictEqual(METRIC_DEFINITIONS.campaignBounces.sourceType, "PROVIDER_REPORTED");
  });

  test("Metric definitions catalog has Clicks as Verified Measured Event", () => {
    assert(METRIC_DEFINITIONS.campaignClicks);
    assert.strictEqual(METRIC_DEFINITIONS.campaignClicks.sourceType, "MEASURED_EVENT");
    assert(METRIC_DEFINITIONS.campaignClicks.calculationMethod.includes("/api/invitations/resolve"));
  });

  test("Metric definitions catalog has Responses & Submissions as Measured Event", () => {
    assert(METRIC_DEFINITIONS.campaignResponses);
    assert.strictEqual(METRIC_DEFINITIONS.campaignResponses.sourceType, "MEASURED_EVENT");
    assert(METRIC_DEFINITIONS.campaignResponses.calculationMethod.includes("Testimonial"));
  });

  test("Metric definitions catalog has Response Rate", () => {
    assert(METRIC_DEFINITIONS.campaignResponseRate);
    assert(METRIC_DEFINITIONS.campaignResponseRate.calculationMethod.includes("100"));
  });

  test("Metric definitions catalog includes Email Opens Privacy Disclaimer", () => {
    assert(METRIC_DEFINITIONS.emailOpensDisclaimer);
    assert(
      METRIC_DEFINITIONS.emailOpensDisclaimer.calculationMethod.includes("Apple Mail Privacy Protection") ||
        METRIC_DEFINITIONS.emailOpensDisclaimer.reliabilityNotice?.includes("Apple MPP")
    );
  });

  // 2. Live Database Testing: Campaigns, Recipients, Aggregations & CSV
  console.log("\n2. Testing Live Campaign Aggregations & Multi-Channel Reporting...");

  const testId = Date.now();
  let testWorkspace = null;
  let testProject = null;
  let testForm = null;
  let testEmailTemplate = null;
  let testSmsTemplate = null;
  let testEmailCampaign = null;
  let testSmsCampaign = null;
  let testTestimonial1 = null;
  let testTestimonial2 = null;
  let testCustomer1 = null;
  let testCustomer2 = null;

  try {
    testWorkspace = await prisma.workspace.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!testWorkspace) {
      console.log("  ⚠ No workspace available in DB, skipping live aggregation tests.");
      return;
    }

    testProject = await prisma.project.create({
      data: {
        workspaceId: testWorkspace.id,
        name: `Campaign Analytics Proj ${testId}`,
        slug: `camp-proj-${testId}`,
      },
    });

    testForm = await prisma.collectionForm.create({
      data: {
        workspaceId: testWorkspace.id,
        projectId: testProject.id,
        title: `Campaign Feedback Form ${testId}`,
        slug: `camp-form-${testId}`,
        headerPrompt: "We value your feedback!",
      },
    });

    testEmailTemplate = await prisma.invitationTemplate.create({
      data: {
        workspaceId: testWorkspace.id,
        name: `Email Template ${testId}`,
        subject: "How was your experience?",
        bodyText: "Hi {{customer.name}}, please share your thoughts at {{invitation.url}}",
        category: "CUSTOMER_SUCCESS",
      },
    });

    testSmsTemplate = await prisma.smsTemplate.create({
      data: {
        workspaceId: testWorkspace.id,
        name: `SMS Template ${testId}`,
        messageBody: "Hi {{name}}, share your feedback: {{link}}",
      },
    });

    const testCustomer1 = await prisma.customer.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Sarah Email Reviewer",
        email: `sarah-${testId}@example.com`,
        company: "TechFlow Inc",
      },
    });

    const testCustomer2 = await prisma.customer.create({
      data: {
        workspaceId: testWorkspace.id,
        name: "Marcus SMS Reviewer",
        email: `marcus-${testId}@example.com`,
      },
    });

    // Testimonial submissions linked to campaign recipients
    testTestimonial1 = await prisma.testimonial.create({
      data: {
        workspaceId: testWorkspace.id,
        projectId: testProject.id,
        customerId: testCustomer1.id,
        content: "Outstanding software, saved our team hours every week!",
        rating: 5,
        type: "TEXT",
        status: "APPROVED",
      },
    });

    testTestimonial2 = await prisma.testimonial.create({
      data: {
        workspaceId: testWorkspace.id,
        projectId: testProject.id,
        customerId: testCustomer2.id,
        content: "Super quick SMS invite and effortless form submission.",
        rating: 5,
        type: "TEXT",
        status: "APPROVED",
      },
    });

    // 1. Create Email Campaign with steps
    testEmailCampaign = await prisma.emailCampaign.create({
      data: {
        workspaceId: testWorkspace.id,
        formId: testForm.id,
        name: `Q4 Email Blast ${testId}`,
        subject: "We value your opinion",
        bodyText: "Please leave a review at {{invitation.url}}",
        templateId: testEmailTemplate.id,
        status: "COMPLETED",
        totalRecipients: 5,
        sentCount: 5,
        deliveredCount: 3,
        openedCount: 3,
        clickedCount: 2,
        submittedCount: 1,
        bouncedCount: 1,
        unsubscribedCount: 0,
        confirmedAt: new Date(),
        steps: {
          create: [
            {
              stepNumber: 1,
              delayDays: 0,
              delayHours: 0,
              subject: "We value your opinion",
              bodyText: "Please leave a review",
              templateId: testEmailTemplate.id,
              status: "COMPLETED",
              sentCount: 5,
              deliveredCount: 3,
              clickedCount: 2,
            },
          ],
        },
      },
    });

    // Create 5 Email Recipients with distinct audit lifecycle states
    await prisma.invitationRecipient.createMany({
      data: [
        // R1: Delivered -> Clicked -> Submitted (Completed Testimonial)
        {
          campaignId: testEmailCampaign.id,
          workspaceId: testWorkspace.id,
          email: `sarah-${testId}@example.com`,
          name: "Sarah Email Reviewer",
          company: "TechFlow Inc",
          status: "SUBMITTED",
          token: `token-email-sub-${testId}`,
          sentAt: new Date(Date.now() - 3600000 * 24 * 2),
          deliveredAt: new Date(Date.now() - 3600000 * 24 * 2 + 10000),
          clickedAt: new Date(Date.now() - 3600000 * 24 * 2 + 50000),
          submittedAt: new Date(Date.now() - 3600000 * 24 * 2 + 90000),
          testimonialId: testTestimonial1.id,
        },
        // R2: Delivered -> Clicked (No Submission)
        {
          campaignId: testEmailCampaign.id,
          workspaceId: testWorkspace.id,
          email: `dan-${testId}@example.com`,
          name: "Dan Clicker",
          status: "CLICKED",
          token: `token-email-click-${testId}`,
          sentAt: new Date(Date.now() - 3600000 * 24 * 3),
          deliveredAt: new Date(Date.now() - 3600000 * 24 * 3 + 12000),
          clickedAt: new Date(Date.now() - 3600000 * 24 * 3 + 45000),
        },
        // R3: Delivered (No click)
        {
          campaignId: testEmailCampaign.id,
          workspaceId: testWorkspace.id,
          email: `clara-${testId}@example.com`,
          name: "Clara Passive",
          status: "DELIVERED",
          token: `token-email-deliv-${testId}`,
          sentAt: new Date(Date.now() - 3600000 * 24 * 1),
          deliveredAt: new Date(Date.now() - 3600000 * 24 * 1 + 8000),
        },
        // R4: Bounced (Mailbox full)
        {
          campaignId: testEmailCampaign.id,
          workspaceId: testWorkspace.id,
          email: `bounced-${testId}@example.com`,
          name: "Bob Bounced",
          status: "BOUNCED",
          token: `token-email-bounce-${testId}`,
          sentAt: new Date(Date.now() - 3600000 * 24 * 1),
          bounceReason: "550 5.2.2 Mailbox full / quota exceeded",
        },
        // R5: Delivery Failed
        {
          campaignId: testEmailCampaign.id,
          workspaceId: testWorkspace.id,
          email: `failed-${testId}@example.com`,
          name: "Frank Failed",
          status: "FAILED",
          token: `token-email-fail-${testId}`,
          sentAt: new Date(Date.now() - 3600000 * 24 * 1),
          errorMessage: "550 5.1.1 Host destination rejected connection",
        },
      ],
    });

    // 2. Create SMS Campaign
    testSmsCampaign = await prisma.smsCampaign.create({
      data: {
        workspaceId: testWorkspace.id,
        formId: testForm.id,
        name: `VIP SMS Invite ${testId}`,
        messageBody: "Hi {{name}}, share feedback: {{link}}",
        templateId: testSmsTemplate.id,
        status: "COMPLETED",
        totalRecipients: 4,
        sentCount: 4,
        deliveredCount: 3,
        clickedCount: 2,
        submittedCount: 1,
        failedCount: 1,
        optedOutCount: 1,
      },
    });

    // Create 4 SMS Recipients
    await prisma.smsRecipient.createMany({
      data: [
        // S1: Delivered -> Clicked -> Submitted
        {
          campaignId: testSmsCampaign.id,
          workspaceId: testWorkspace.id,
          phoneNumber: `+1555000${testId.toString().slice(-4)}`,
          name: "Marcus SMS Reviewer",
          status: "SUBMITTED",
          token: `token-sms-sub-${testId}`,
          sentAt: new Date(Date.now() - 3600000 * 12),
          deliveredAt: new Date(Date.now() - 3600000 * 12 + 5000),
          clickedAt: new Date(Date.now() - 3600000 * 12 + 20000),
          submittedAt: new Date(Date.now() - 3600000 * 12 + 60000),
          testimonialId: testTestimonial2.id,
        },
        // S2: Delivered -> Clicked
        {
          campaignId: testSmsCampaign.id,
          workspaceId: testWorkspace.id,
          phoneNumber: `+1555111${testId.toString().slice(-4)}`,
          name: "Sam SMS Clicker",
          status: "CLICKED",
          token: `token-sms-click-${testId}`,
          sentAt: new Date(Date.now() - 3600000 * 10),
          deliveredAt: new Date(Date.now() - 3600000 * 10 + 6000),
          clickedAt: new Date(Date.now() - 3600000 * 10 + 15000),
        },
        // S3: Failed
        {
          campaignId: testSmsCampaign.id,
          workspaceId: testWorkspace.id,
          phoneNumber: `+1555222${testId.toString().slice(-4)}`,
          name: "Fiona SMS Failed",
          status: "FAILED",
          token: `token-sms-fail-${testId}`,
          sentAt: new Date(Date.now() - 3600000 * 8),
          errorMessage: "30008 Unknown error: carrier unreachable",
        },
        // S4: Opted Out
        {
          campaignId: testSmsCampaign.id,
          workspaceId: testWorkspace.id,
          phoneNumber: `+1555333${testId.toString().slice(-4)}`,
          name: "Oliver OptOut",
          status: "OPTED_OUT",
          token: `token-sms-optout-${testId}`,
          sentAt: new Date(Date.now() - 3600000 * 6),
          deliveredAt: new Date(Date.now() - 3600000 * 6 + 4000),
        },
      ],
    });

    // ========================================================
    // TEST SUITE: Querying getWorkspaceCampaignAnalytics
    // ========================================================

    await testAsync("Aggregates combined ALL channel campaign metrics", async () => {
      const result = await getWorkspaceCampaignAnalytics({
        workspaceId: testWorkspace.id,
        channel: "ALL",
        period: "30d",
      });

      assert(result.summary, "Result summary should exist");
      assert(result.summary.totalCampaigns >= 2, "Should count both email and sms campaigns");
      assert(result.summary.totalRecipients >= 9, "Should count email + sms recipients");
      assert(result.summary.totalSent >= 9, "Should count sent messages");
      assert(result.summary.totalDelivered >= 6, "Should count delivered messages");
      assert(result.summary.totalClicks >= 4, "Should count measured clicks");
      assert(result.summary.totalSubmissions >= 2, "Should count completed submissions");
      assert(result.summary.deliverabilityRate > 0, "Delivery rate percentage should be > 0");
      assert(result.summary.responseRate > 0, "Response rate percentage should be > 0");
    });

    await testAsync("Aggregates separate EMAIL channel metrics", async () => {
      const result = await getWorkspaceCampaignAnalytics({
        workspaceId: testWorkspace.id,
        channel: "EMAIL",
        period: "30d",
      });

      assert.strictEqual(result.channel, "EMAIL");
      const foundCamp = result.campaigns.find((c) => c.id === testEmailCampaign.id);
      assert(foundCamp, "Should find test email campaign");
      assert.strictEqual(foundCamp.channel, "EMAIL");
      assert.strictEqual(foundCamp.recipientsCount, 5);
      assert.strictEqual(foundCamp.submittedCount, 1);
      assert.strictEqual(foundCamp.bouncedCount, 1);
      assert(foundCamp.responseRate > 0);

      // Verify email summary channel metrics
      assert(result.summary.emailMetrics.sent >= 5);
      assert(result.summary.emailMetrics.bounces >= 1);
      assert.strictEqual(result.summary.smsMetrics.sent, 0); // Scoped to email
    });

    await testAsync("Aggregates separate SMS channel metrics", async () => {
      const result = await getWorkspaceCampaignAnalytics({
        workspaceId: testWorkspace.id,
        channel: "SMS",
        period: "30d",
      });

      assert.strictEqual(result.channel, "SMS");
      const foundCamp = result.campaigns.find((c) => c.id === testSmsCampaign.id);
      assert(foundCamp, "Should find test sms campaign");
      assert.strictEqual(foundCamp.channel, "SMS");
      assert.strictEqual(foundCamp.recipientsCount, 4);
      assert.strictEqual(foundCamp.optedOutCount, 1);
      assert.strictEqual(foundCamp.failedCount, 1);
      assert.strictEqual(foundCamp.submittedCount, 1);

      // Verify SMS summary channel metrics
      assert(result.summary.smsMetrics.sent >= 4);
      assert(result.summary.smsMetrics.optedOut >= 1);
      assert.strictEqual(result.summary.emailMetrics.sent, 0); // Scoped to SMS
    });

    await testAsync("Aggregates Template Performance across email and SMS", async () => {
      const result = await getWorkspaceCampaignAnalytics({
        workspaceId: testWorkspace.id,
        channel: "ALL",
        period: "30d",
      });

      const emailTmpl = result.templatePerformance.find((t) => t.templateId === testEmailTemplate.id);
      assert(emailTmpl, "Email template should be in performance list");
      assert.strictEqual(emailTmpl.channel, "EMAIL");
      assert(emailTmpl.sentCount >= 5);
      assert(emailTmpl.deliveredCount >= 3);
      assert(emailTmpl.submittedCount >= 1);

      const smsTmpl = result.templatePerformance.find((t) => t.templateId === testSmsTemplate.id);
      assert(smsTmpl, "SMS template should be in performance list");
      assert.strictEqual(smsTmpl.channel, "SMS");
      assert(smsTmpl.sentCount >= 4);
      assert(smsTmpl.deliveredCount >= 3);
      assert(smsTmpl.submittedCount >= 1);
    });

    await testAsync("Aggregates Daily Outbound & Response Trends", async () => {
      const result = await getWorkspaceCampaignAnalytics({
        workspaceId: testWorkspace.id,
        channel: "ALL",
        period: "30d",
      });

      assert(Array.isArray(result.dailyTrends), "Daily trends should be an array");
      assert(result.dailyTrends.length > 0, "Daily trends should not be empty");
      const todayTrend = result.dailyTrends[result.dailyTrends.length - 1];
      assert("date" in todayTrend, "Trend item must have date string");
      assert("sent" in todayTrend, "Trend item must have sent");
      assert("clicks" in todayTrend, "Trend item must have clicks");
      assert("submissions" in todayTrend, "Trend item must have submissions");
    });

    await testAsync("Provides granular Recipient Status Audit with provider & measured details", async () => {
      const result = await getWorkspaceCampaignAnalytics({
        workspaceId: testWorkspace.id,
        channel: "ALL",
        period: "30d",
      });

      assert(Array.isArray(result.recipients), "Recipients should be an array");
      
      const emailSubmitted = result.recipients.find(
        (r) => r.contact === `sarah-${testId}@example.com`
      );
      assert(emailSubmitted, "Should find Sarah's recipient audit row");
      assert.strictEqual(emailSubmitted.channel, "EMAIL");
      assert.strictEqual(emailSubmitted.status, "SUBMITTED");
      assert.strictEqual(emailSubmitted.testimonialId, testTestimonial1.id);
      assert(emailSubmitted.clickedAt, "Clicked timestamp should be recorded");
      assert(emailSubmitted.submittedAt, "Submitted timestamp should be recorded");

      const emailBounced = result.recipients.find(
        (r) => r.contact === `bounced-${testId}@example.com`
      );
      assert(emailBounced, "Should find Bounced recipient");
      assert(emailBounced.bounceReason?.includes("550"), "Should report provider bounce error code");

      const smsFailed = result.recipients.find(
        (r) => r.contact.includes(testId.toString().slice(-4)) && r.status === "FAILED"
      );
      assert(smsFailed, "Should find SMS failed recipient");
      assert(smsFailed.errorMessage?.includes("30008"), "Should report SMS carrier failure reason");
    });

    await testAsync("Filters analytics by specific campaignId", async () => {
      const result = await getWorkspaceCampaignAnalytics({
        workspaceId: testWorkspace.id,
        campaignId: testEmailCampaign.id,
        period: "30d",
      });

      assert.strictEqual(result.campaigns.length, 1);
      assert.strictEqual(result.campaigns[0].id, testEmailCampaign.id);
      assert.strictEqual(result.summary.totalCampaigns, 1);
      assert.strictEqual(result.summary.totalRecipients, 5);
    });

    await testAsync("Generates valid Campaign Summary CSV report", () => {
      const mockCampaigns = [
        {
          id: "camp-1",
          name: "Q4 Launch",
          channel: "EMAIL",
          status: "COMPLETED",
          formId: "form-1",
          formTitle: "Test Form",
          templateId: "tmpl-1",
          templateName: "Test Template",
          recipientsCount: 100,
          sentCount: 100,
          deliveredCount: 95,
          failedCount: 2,
          bouncedCount: 3,
          optedOutCount: 1,
          clickedCount: 25,
          submittedCount: 10,
          deliverabilityRate: 95.0,
          clickRate: 26.3,
          responseRate: 10.5,
          createdAt: new Date().toISOString(),
          scheduledAt: null,
          startedAt: null,
          completedAt: null,
        },
      ];

      const csv = generateCampaignCsv(mockCampaigns);
      assert(csv.startsWith("Campaign ID,Campaign Name,Channel,Status,Collection Form"), "CSV header invalid");
      assert(csv.includes('"Q4 Launch","EMAIL","COMPLETED"'));
      assert(csv.includes("95,2,3,1,25,10,95,26.3,10.5"));
    });

    await testAsync("Generates valid Recipient-Level Audit CSV report", () => {
      const mockRecipients = [
        {
          id: "rec-1",
          campaignId: "camp-1",
          campaignName: "Q4 Launch",
          channel: "EMAIL",
          name: "Alice Founder",
          contact: "alice@example.com",
          company: "Acme",
          status: "SUBMITTED",
          sentAt: "2026-11-18T10:00:00Z",
          deliveredAt: "2026-11-18T10:00:05Z",
          clickedAt: "2026-11-18T10:01:20Z",
          submittedAt: "2026-11-18T10:03:00Z",
          testimonialId: "test-abc-123",
          bounceReason: null,
          errorMessage: null,
        },
      ];

      const csv = generateRecipientCsv(mockRecipients);
      assert(
        csv.startsWith("Recipient ID,Name,Contact (Email/Phone)"),
        "Recipient CSV header invalid"
      );
      assert(csv.includes('"Alice Founder","alice@example.com","Acme","Q4 Launch","EMAIL","SUBMITTED"'));
      assert(csv.includes(",YES"));
    });
  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    console.log("\nCleaning up test artifacts...");
    try {
      if (testEmailCampaign) {
        await prisma.invitationRecipient.deleteMany({
          where: { campaignId: testEmailCampaign.id },
        });
        await prisma.emailCampaignStep.deleteMany({
          where: { campaignId: testEmailCampaign.id },
        });
        await prisma.emailCampaign.delete({
          where: { id: testEmailCampaign.id },
        });
      }
      if (testSmsCampaign) {
        await prisma.smsRecipient.deleteMany({
          where: { campaignId: testSmsCampaign.id },
        });
        await prisma.smsCampaign.delete({
          where: { id: testSmsCampaign.id },
        });
      }
      if (testTestimonial1) {
        await prisma.testimonial.delete({ where: { id: testTestimonial1.id } });
      }
      if (testTestimonial2) {
        await prisma.testimonial.delete({ where: { id: testTestimonial2.id } });
      }
      if (testCustomer1) {
        await prisma.customer.delete({ where: { id: testCustomer1.id } });
      }
      if (testCustomer2) {
        await prisma.customer.delete({ where: { id: testCustomer2.id } });
      }
      if (testEmailTemplate) {
        await prisma.invitationTemplate.delete({ where: { id: testEmailTemplate.id } });
      }
      if (testSmsTemplate) {
        await prisma.smsTemplate.delete({ where: { id: testSmsTemplate.id } });
      }
      if (testForm) {
        await prisma.collectionForm.delete({ where: { id: testForm.id } });
      }
      if (testProject) {
        await prisma.project.delete({ where: { id: testProject.id } });
      }
      console.log("Cleanup completed successfully.");
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
  }

  console.log("\n==========================================================");
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
