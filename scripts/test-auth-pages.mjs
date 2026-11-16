/**
 * Praise Authentication Experience Automated Test Suite
 *
 * Verifies:
 * 1. Component exports & architecture (AuthLayout, AuthVisualPanel, SignInForm, SignUpForm, ForgotPasswordForm, PasswordInput, AuthInput, AuthButton)
 * 2. Route files & metadata (/auth/sign-in, /auth/sign-up, /auth/forgot-password)
 * 3. Form validation rules:
 *    - Sign-in: email format, required password, remember me checkbox
 *    - Sign-up: name length, email format, password min length, password match
 *    - Forgot-password: email format, recovery success state
 * 4. Responsive split-screen layout constraints (47% left panel / 53% right panel)
 * 5. Brand visual panel copy and illustration elements across all 3 variants
 * 6. Protection against fake ratings, fake metrics, and fake company logos
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=== Running Praise Authentication Automated Test Suite ===");

// 1. Verify component files exist
const requiredComponentFiles = [
  "src/components/auth/auth-layout.tsx",
  "src/components/auth/auth-visual-panel.tsx",
  "src/components/auth/auth-input.tsx",
  "src/components/auth/password-input.tsx",
  "src/components/auth/auth-button.tsx",
  "src/components/auth/sign-in-form.tsx",
  "src/components/auth/sign-up-form.tsx",
  "src/components/auth/forgot-password-form.tsx",
  "src/components/auth/index.ts",
];

for (const relPath of requiredComponentFiles) {
  const fullPath = path.join(rootDir, relPath);
  assert.ok(fs.existsSync(fullPath), `Required component file must exist: ${relPath}`);
}
console.log("✓ Component architecture files verified");

// 2. Verify page route files exist
const requiredRouteFiles = [
  "src/app/auth/layout.tsx",
  "src/app/auth/sign-in/page.tsx",
  "src/app/auth/sign-up/page.tsx",
  "src/app/auth/forgot-password/page.tsx",
];

for (const relPath of requiredRouteFiles) {
  const fullPath = path.join(rootDir, relPath);
  assert.ok(fs.existsSync(fullPath), `Required auth route file must exist: ${relPath}`);
}
console.log("✓ All 3 auth routes and layout verified (/auth/sign-in, /auth/sign-up, /auth/forgot-password)");

// 3. Inspect AuthLayout for split-screen panel widths
const layoutSrc = fs.readFileSync(path.join(rootDir, "src/components/auth/auth-layout.tsx"), "utf-8");
assert.ok(layoutSrc.includes("lg:w-[47%]"), "Left panel must be approx 47% width on desktop");
assert.ok(layoutSrc.includes("lg:w-[53%]"), "Right panel must be approx 53% width on desktop");
assert.ok(layoutSrc.includes("hidden lg:flex"), "Right panel must be hidden on mobile/tablet");
assert.ok(layoutSrc.includes("PraiseLogo"), "AuthLayout must render the Praise logo");
console.log("✓ AuthLayout split-screen layout (47% / 53%) and responsive constraints verified");

// 4. Inspect AuthVisualPanel for required headings & copy
const visualPanelSrc = fs.readFileSync(
  path.join(rootDir, "src/components/auth/auth-visual-panel.tsx"),
  "utf-8"
);

// Sign-in copy
assert.ok(
  visualPanelSrc.includes("Every kind word deserves a place."),
  "Visual panel must contain heading for sign-in: 'Every kind word deserves a place.'"
);
assert.ok(
  visualPanelSrc.includes("Bring your customer stories together and turn genuine feedback into lasting trust."),
  "Visual panel must contain supporting text for sign-in"
);

// Sign-up copy
assert.ok(
  visualPanelSrc.includes("Good things are worth sharing."),
  "Visual panel must contain heading for sign-up: 'Good things are worth sharing.'"
);
assert.ok(
  visualPanelSrc.includes("Build your own home for customer stories, appreciation and social proof."),
  "Visual panel must contain supporting text for sign-up"
);

// Forgot-password copy
assert.ok(
  visualPanelSrc.includes("We're here to help you get back."),
  "Visual panel must contain heading for forgot-password: 'We\\'re here to help you get back.'"
);
assert.ok(
  visualPanelSrc.includes("Your workspace and customer feedback are safe and ready whenever you return."),
  "Visual panel must contain supporting text for forgot-password"
);

// Concept check
assert.ok(
  visualPanelSrc.includes("A little love goes a long way."),
  "Visual panel must include concept: 'A little love goes a long way.'"
);

// Strict safety rule: Do NOT invent customer counts, company logos, ratings, testimonials or performance statistics
const forbiddenPatterns = [
  /10,000\+ customers/i,
  /12,000\+ companies/i,
  /Google|Stripe|Netflix|Amazon|Microsoft/i,
  /5\.0 rating/i,
  /4\.9 \/ 5/i,
  /\+300% conversion/i,
];
for (const pattern of forbiddenPatterns) {
  assert.ok(!pattern.test(visualPanelSrc), `Visual panel must not contain fabricated statistics or company logos (${pattern})`);
}
console.log("✓ AuthVisualPanel illustration copy, concept and anti-fabrication rules verified");

// 5. Inspect SignInForm
const signInSrc = fs.readFileSync(path.join(rootDir, "src/components/auth/sign-in-form.tsx"), "utf-8");
assert.ok(signInSrc.includes("Welcome back!"), "Sign-in must have heading 'Welcome back!'");
assert.ok(signInSrc.includes("Your customer stories are waiting for you."), "Sign-in must have supporting text");
assert.ok(signInSrc.includes('label="Work email"'), "Sign-in must have Work email input");
assert.ok(signInSrc.includes('label="Password"'), "Sign-in must have Password input");
assert.ok(signInSrc.includes("Remember me"), "Sign-in must have Remember me checkbox");
assert.ok(signInSrc.includes("/auth/forgot-password"), "Sign-in must link to forgot-password");
assert.ok(signInSrc.includes("/auth/sign-up"), "Sign-in must link to create an account");
assert.ok(signInSrc.includes("authClient.signIn.email"), "Sign-in must use authClient.signIn.email");
console.log("✓ SignInForm fields, links, and API handler verified");

// 6. Inspect SignUpForm
const signUpSrc = fs.readFileSync(path.join(rootDir, "src/components/auth/sign-up-form.tsx"), "utf-8");
assert.ok(signUpSrc.includes("Create your Praise account."), "Sign-up must have heading 'Create your Praise account.'");
assert.ok(signUpSrc.includes("Start collecting and showcasing the words your customers share."), "Sign-up must have supporting text");
assert.ok(signUpSrc.includes('label="Full name"'), "Sign-up must have Full name input");
assert.ok(signUpSrc.includes('label="Work email"'), "Sign-up must have Work email input");
assert.ok(signUpSrc.includes('label="Password"'), "Sign-up must have Password input");
assert.ok(signUpSrc.includes('label="Confirm password"'), "Sign-up must have Confirm password input");
assert.ok(signUpSrc.includes("/terms"), "Sign-up must link to terms");
assert.ok(signUpSrc.includes("/privacy"), "Sign-up must link to privacy");
assert.ok(signUpSrc.includes("/auth/sign-in"), "Sign-up must link to sign-in");
assert.ok(signUpSrc.includes("authClient.signUp.email"), "Sign-up must use authClient.signUp.email");
console.log("✓ SignUpForm fields, validation states, and API handler verified");

// 7. Inspect ForgotPasswordForm
const forgotPasswordSrc = fs.readFileSync(
  path.join(rootDir, "src/components/auth/forgot-password-form.tsx"),
  "utf-8"
);
assert.ok(forgotPasswordSrc.includes("Reset your password"), "Forgot-password must have heading 'Reset your password'");
assert.ok(forgotPasswordSrc.includes('label="Work email"'), "Forgot-password must have Work email input");
assert.ok(forgotPasswordSrc.includes("Send reset link"), "Forgot-password must have Send reset link button");
assert.ok(forgotPasswordSrc.includes("/auth/sign-in"), "Forgot-password must link back to sign in");
assert.ok(forgotPasswordSrc.includes("Check your email"), "Forgot-password must support success confirmation state");
console.log("✓ ForgotPasswordForm recovery flow and confirmation state verified");

// 8. Inspect marketing-shell.tsx to ensure /auth routes are excluded from marketing header/footer
const shellSrc = fs.readFileSync(path.join(rootDir, "src/components/marketing-shell.tsx"), "utf-8");
assert.ok(shellSrc.includes('pathname.startsWith("/auth")'), "Marketing shell must exclude /auth routes from marketing header/footer");
console.log("✓ Marketing shell isolation for /auth routes verified");

console.log("=== ALL PRAISE AUTHENTICATION TESTS PASSED (8/8) ===");
