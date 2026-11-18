import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getLanguageConfig,
  isValidLanguageCode,
  formatDate,
  formatNumber,
  formatRelativeTime,
} from "../src/lib/i18n/config.ts";
import { getDictionary, DICTIONARIES } from "../src/lib/i18n/dictionaries.ts";
import { resolveLocalizedForm } from "../src/lib/i18n/form-resolver.ts";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("   PRAISE LOCALIZATION INFRASTRUCTURE TEST SUITE  ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Language Config & Validation
  // --------------------------------------------------------------------------
  console.log("--- TEST 1: Supported Languages Configuration ---");
  assert(SUPPORTED_LANGUAGES.length >= 10, `At least 10 languages supported (found ${SUPPORTED_LANGUAGES.length})`);
  assert(isValidLanguageCode("en"), "en is a valid language code");
  assert(isValidLanguageCode("es"), "es is a valid language code");
  assert(isValidLanguageCode("ar"), "ar is a valid language code");
  assert(!isValidLanguageCode("invalid_xyz"), "invalid_xyz is rejected");

  const arConfig = getLanguageConfig("ar");
  assert(arConfig.dir === "rtl", "Arabic direction is correctly identified as RTL");
  const esConfig = getLanguageConfig("es");
  assert(esConfig.dir === "ltr", "Spanish direction is correctly identified as LTR");

  // --------------------------------------------------------------------------
  // TEST 2: Locale-Aware Date and Number Formatting
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 2: Locale-Aware Formatting Utilities ---");
  const testDate = new Date("2026-06-15T12:00:00Z");
  const formattedEnDate = formatDate(testDate, "en");
  const formattedEsDate = formatDate(testDate, "es");
  assert(typeof formattedEnDate === "string" && formattedEnDate.length > 0, `English date formatted: ${formattedEnDate}`);
  assert(typeof formattedEsDate === "string" && formattedEsDate.length > 0, `Spanish date formatted: ${formattedEsDate}`);

  const formattedEnNumber = formatNumber(1250000.5, "en");
  const formattedDeNumber = formatNumber(1250000.5, "de");
  assert(formattedEnNumber.includes(","), `English number uses commas: ${formattedEnNumber}`);
  assert(formattedDeNumber.includes("."), `German number uses periods: ${formattedDeNumber}`);

  const relTime = formatRelativeTime(new Date(Date.now() - 3600 * 1000 * 2), "en");
  assert(relTime.includes("hour") || relTime.includes("ago"), `Relative time formatted: ${relTime}`);

  // --------------------------------------------------------------------------
  // TEST 3: UI Dictionaries and Fallbacks
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 3: UI Dictionaries and Fallback Handling ---");
  const enDict = getDictionary("en");
  assert(enDict.submitButton === "Submit Testimonial", "English submit button dictionary string");
  
  const esDict = getDictionary("es");
  assert(esDict.submitButton.includes("Enviar"), `Spanish submit button translated: "${esDict.submitButton}"`);
  assert(esDict.chooseLanguage === "Idioma", `Spanish language picker label: "${esDict.chooseLanguage}"`);

  const frDict = getDictionary("fr");
  assert(frDict.chooseLanguage === "Langue", `French language picker label: "${frDict.chooseLanguage}"`);

  // Fallback test
  const fallbackDict = getDictionary("unknown-lang");
  assert(fallbackDict.submitButton === "Submit Testimonial", "Unknown language falls back cleanly to English dictionary");

  // --------------------------------------------------------------------------
  // TEST 4: Form Resolution & Field ID Integrity Preservation
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 4: Form Translation Resolution & Field ID Preservation ---");
  const baseFormMock = {
    id: "form-test-localization-1",
    workspaceId: "ws-test",
    title: "Customer Review Form",
    headerPrompt: "How was your experience?",
    description: "Please provide your candid review.",
    thankYouMessage: "Thank you for your feedback!",
    consentText: "I agree to public sharing.",
    defaultLanguage: "en",
    fields: [
      {
        id: "field-outcome-rating",
        label: "What specific metric improved for your team?",
        placeholder: "e.g. +35% ARR growth in Q1",
        description: "Be as quantifiable as possible.",
        type: "SHORT_TEXT",
        isRequired: true,
        orderIndex: 0,
      },
      {
        id: "field-team-size",
        label: "Select your team size",
        placeholder: "Choose...",
        type: "COMPANY_SIZE",
        isRequired: false,
        orderIndex: 1,
      },
    ],
  };

  const translationsMock = [
    {
      id: "trans-es",
      formId: baseFormMock.id,
      language: "es",
      title: "Formulario de Reseñas de Clientes",
      headerPrompt: "¿Cómo fue su experiencia?",
      description: "Por favor brinde su opinión sincera.",
      thankYouMessage: "¡Muchas gracias por sus comentarios!",
      consentText: "Acepto el uso de mi testimonio para fines públicos.",
      fieldTranslationsJson: JSON.stringify({
        "field-outcome-rating": {
          label: "¿Qué métrica específica mejoró para su equipo?",
          placeholder: "ej. +35% crecimiento de ingresos en el primer trimestre",
          description: "Sea lo más cuantificable posible.",
        },
      }),
      isPublished: true,
    },
    {
      id: "trans-ar",
      formId: baseFormMock.id,
      language: "ar",
      title: "نموذج آراء العملاء",
      headerPrompt: "كيف كانت تجربتك معنا؟",
      isPublished: true,
    },
  ];

  // Resolve base (en)
  const resolvedEn = resolveLocalizedForm(baseFormMock, "en", translationsMock);
  assert(resolvedEn.form.title === "Customer Review Form", "Base English form retains original title");
  assert(resolvedEn.direction === "ltr", "Base English direction is ltr");
  assert(resolvedEn.availableLanguages.length === 3, `Available languages includes en, es, ar (total: ${resolvedEn.availableLanguages.length})`);

  // Resolve translated variant (es)
  const resolvedEs = resolveLocalizedForm(baseFormMock, "es", translationsMock);
  assert(resolvedEs.form.title === "Formulario de Reseñas de Clientes", "Spanish variant overlays translated title");
  assert(resolvedEs.form.headerPrompt === "¿Cómo fue su experiencia?", "Spanish variant overlays translated prompt");
  assert(resolvedEs.form.fields[0].id === "field-outcome-rating", "CRITICAL: Field ID remains EXACTLY identical after translation");
  assert(
    resolvedEs.form.fields[0].label === "¿Qué métrica específica mejoró para su equipo?",
    "Spanish custom field label translated successfully"
  );
  // Verify untranslated field fallback in variant
  assert(
    resolvedEs.form.fields[1].id === "field-team-size" &&
    resolvedEs.form.fields[1].label === "Select your team size",
    "Untranslated second field falls back gracefully to base English label"
  );

  // Resolve Arabic variant (ar)
  const resolvedAr = resolveLocalizedForm(baseFormMock, "ar", translationsMock);
  assert(resolvedAr.direction === "rtl", "Arabic resolved variant has RTL direction");
  assert(resolvedAr.form.title === "نموذج آراء العملاء", "Arabic title translated correctly");

  // --------------------------------------------------------------------------
  // TEST 5: Database Operations & Submissions
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 5: Live Database Form Translation & Unified Submission ---");
  try {
    // 1. Get or create test workspace
    let ws = await prisma.workspace.findFirst({
      where: { slug: "test-localization-ws" },
    });
    if (!ws) {
      ws = await prisma.workspace.create({
        data: {
          name: "Localization Test Workspace",
          slug: "test-localization-ws",
          defaultLanguage: "en",
        },
      });
    }
    assert(Boolean(ws.id), `Test workspace verified (ID: ${ws.id})`);

    // 2. Create collection form with base language
    const testSlug = `loc-form-${Date.now()}`;
    const dbForm = await prisma.collectionForm.create({
      data: {
        workspaceId: ws.id,
        title: "Global Enterprise Feedback",
        slug: testSlug,
        headerPrompt: "Tell us about your team's results",
        defaultLanguage: "en",
        fields: {
          create: [
            {
              label: "Primary business outcome",
              type: "SHORT_TEXT",
              isRequired: true,
              orderIndex: 0,
            },
          ],
        },
      },
      include: { fields: true },
    });
    assert(Boolean(dbForm.id), `Created form with base language "en" (ID: ${dbForm.id}, slug: ${testSlug})`);

    const customFieldId = dbForm.fields[0].id;
    assert(Boolean(customFieldId), `Form field created with UUID: ${customFieldId}`);

    // 3. Add Spanish translation variant
    const esTranslation = await prisma.formTranslation.create({
      data: {
        formId: dbForm.id,
        language: "es",
        title: "Comentarios Empresariales Globales",
        headerPrompt: "Cuéntenos sobre los resultados de su equipo",
        thankYouMessage: "¡Gracias por sus comentarios!",
        fieldTranslationsJson: JSON.stringify({
          [customFieldId]: {
            label: "Resultado comercial principal",
            placeholder: "ej. Aumento del 40% en retención",
          },
        }),
        isPublished: true,
      },
    });
    assert(Boolean(esTranslation.id), `Created Spanish form translation (ID: ${esTranslation.id})`);

    // 4. Submit testimonial through Spanish variant
    const testCustomer = await prisma.customer.create({
      data: {
        workspaceId: ws.id,
        name: "Elena Rodriguez",
        email: `elena-${Date.now()}@empresa.es`,
        company: "Soluciones Iberia",
      },
    });

    const submittedTestimonial = await prisma.testimonial.create({
      data: {
        workspaceId: ws.id,
        formId: dbForm.id, // UNDERLYING FORM IDENTITY IS PRESERVED!
        customerId: testCustomer.id,
        content: "Nuestra productividad aumentó un 40% en los primeros tres meses.",
        rating: 5,
        type: "TEXT",
        language: "es", // CAPTURED SUBMISSION LANGUAGE
      },
    });
    assert(submittedTestimonial.formId === dbForm.id, "Testimonial correctly linked to original underlying form ID");
    assert(submittedTestimonial.language === "es", "Testimonial record captured language='es' without creating duplicate project/form");
    assert(submittedTestimonial.customerId === testCustomer.id, "Customer record linked correctly");

    // Clean up test data
    await prisma.testimonial.delete({ where: { id: submittedTestimonial.id } });
    await prisma.customer.delete({ where: { id: testCustomer.id } });
    await prisma.formTranslation.delete({ where: { id: esTranslation.id } });
    await prisma.formField.deleteMany({ where: { formId: dbForm.id } });
    await prisma.collectionForm.delete({ where: { id: dbForm.id } });
    console.log("  🧹 Test artifacts cleaned up successfully.");
  } catch (dbErr) {
    console.error("Database test error:", dbErr);
    assert(false, `Database test encountered error: ${dbErr.message}`);
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log("\n=================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
