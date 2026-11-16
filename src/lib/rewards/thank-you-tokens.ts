/**
 * Replaces message tokens with personalized customer/testimonial variables.
 */
export function interpolateThankYouTokens(
  template: string,
  variables: {
    customerName?: string | null;
    companyName?: string | null;
    rating?: number | null;
    workspaceName?: string | null;
    rewardCode?: string | null;
  }
): string {
  const name = variables.customerName?.trim() || "there";
  const company = variables.companyName?.trim() || "";
  const ratingStr = variables.rating ? `${variables.rating}-star` : "";
  const workspace = variables.workspaceName?.trim() || "Our Team";
  const reward = variables.rewardCode?.trim() || "";

  return template
    .replace(/\{\{\s*(name|customerName)\s*\}\}/gi, name)
    .replace(/\{\{\s*(company|companyName)\s*\}\}/gi, company)
    .replace(/\{\{\s*rating\s*\}\}/gi, ratingStr)
    .replace(/\{\{\s*workspaceName\s*\}\}/gi, workspace)
    .replace(/\{\{\s*rewardCode\s*\}\}/gi, reward);
}
