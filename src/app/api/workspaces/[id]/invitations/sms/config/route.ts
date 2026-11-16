import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { getSmsProvider } from "@/lib/sms/provider";
import { normalizePhoneNumber } from "@/lib/sms/campaign-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function maskSecret(val: string | null | undefined): string | null {
  if (!val) return null;
  if (val.length <= 6) return "••••••••";
  return `${val.slice(0, 3)}••••••••${val.slice(-3)}`;
}

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const config = await prisma.smsProviderConfig.findUnique({
      where: { workspaceId },
    });

    if (!config) {
      return NextResponse.json({
        success: true,
        configured: false,
        config: {
          provider: "MOCK",
          fromNumber: null,
          webhookUrl: null,
          accountSidMasked: null,
          hasAuthToken: false,
          isEnabled: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      config: {
        id: config.id,
        provider: config.provider,
        fromNumber: config.fromNumber,
        webhookUrl: config.webhookUrl,
        accountSidMasked: maskSecret(config.accountSid),
        hasAuthToken: Boolean(config.authToken),
        webhookAuthHeader: config.webhookAuthHeader,
        isEnabled: config.isEnabled,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch SMS config:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch SMS configuration" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const {
      action,
      provider = "MOCK",
      providerType,
      accountSid,
      authToken,
      fromPhone,
      fromNumber,
      webhookUrl,
      customHeadersJson,
      webhookAuthHeader,
      isEnabled = true,
      testPhone,
    } = body;

    const effectiveProvider = provider || providerType || "MOCK";
    const effectiveFromNumber = fromNumber || fromPhone || null;
    const effectiveAuthHeader = webhookAuthHeader || customHeadersJson || null;

    // Handle test connection action
    if (action === "test") {
      if (!testPhone) {
        return NextResponse.json(
          { error: "Test phone number is required to verify provider connection." },
          { status: 400 }
        );
      }

      const normalized = normalizePhoneNumber(testPhone);
      if (!normalized) {
        return NextResponse.json(
          { error: "Invalid test phone number. Please enter a valid number with country code (e.g. +1...)." },
          { status: 400 }
        );
      }

      const existingConfig = await prisma.smsProviderConfig.findUnique({
        where: { workspaceId },
      });

      const effectiveConfig = {
        provider: effectiveProvider,
        accountSid: accountSid || existingConfig?.accountSid,
        authToken: authToken || existingConfig?.authToken,
        fromNumber: effectiveFromNumber || existingConfig?.fromNumber,
        webhookUrl: webhookUrl || existingConfig?.webhookUrl,
        webhookAuthHeader: effectiveAuthHeader || existingConfig?.webhookAuthHeader,
        isEnabled: true,
      };

      const providerInstance = getSmsProvider(effectiveConfig as any);
      const testResult = await providerInstance.send({
        to: normalized,
        body: "Test message from Praise SMS Provider verification. Your configuration is working properly!",
        from: effectiveConfig.fromNumber || undefined,
      });

      return NextResponse.json({
        success: testResult.success,
        result: testResult,
        message:
          testResult.success
            ? `Connection test passed! Sent via ${providerInstance.name}.`
            : `Connection test failed: ${testResult.error}`,
      });
    }

    // Save/Update configuration
    const updateData: any = {
      provider: effectiveProvider,
      isEnabled: Boolean(isEnabled),
    };

    if (effectiveFromNumber !== undefined) updateData.fromNumber = effectiveFromNumber?.trim() || null;
    if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl?.trim() || null;
    if (effectiveAuthHeader !== undefined) updateData.webhookAuthHeader = effectiveAuthHeader?.trim() || null;
    if (accountSid !== undefined && accountSid !== "") updateData.accountSid = accountSid.trim();
    if (authToken !== undefined && authToken !== "") updateData.authToken = authToken.trim();

    const config = await prisma.smsProviderConfig.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        provider: effectiveProvider,
        fromNumber: updateData.fromNumber,
        webhookUrl: updateData.webhookUrl,
        webhookAuthHeader: updateData.webhookAuthHeader,
        accountSid: updateData.accountSid || null,
        authToken: updateData.authToken || null,
        isEnabled: updateData.isEnabled,
      },
      update: updateData,
    });

    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        provider: config.provider,
        fromNumber: config.fromNumber,
        webhookUrl: config.webhookUrl,
        accountSidMasked: maskSecret(config.accountSid),
        hasAuthToken: Boolean(config.authToken),
        webhookAuthHeader: config.webhookAuthHeader,
        isEnabled: config.isEnabled,
        updatedAt: config.updatedAt,
      },
      message: "SMS Provider configuration saved securely.",
    });
  } catch (error: any) {
    console.error("Failed to update SMS configuration:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save SMS configuration" },
      { status: error.status || 500 }
    );
  }
}
