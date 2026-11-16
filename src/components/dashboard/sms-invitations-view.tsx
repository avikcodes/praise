"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Smartphone,
  Send,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Trash2,
  Settings,
  ShieldAlert,
  Users,
  FileSpreadsheet,
  UserPlus,
  Eye,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import {
  calculateSmsSegments,
  interpolateSmsTemplate,
  DEFAULT_SMS_TEMPLATES,
  type SmsSegmentCalculation,
} from "@/lib/sms/templating";

interface SmsRecipient {
  id: string;
  phoneNumber: string;
  name?: string | null;
  token: string;
  status: "PENDING" | "SENT" | "DELIVERED" | "CLICKED" | "SUBMITTED" | "FAILED" | "OPTED_OUT" | string;
  segmentCount: number;
  providerMessageId?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  clickedAt?: string | null;
  submittedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  customer?: {
    company?: string | null;
    email?: string | null;
  } | null;
}

interface SmsCampaign {
  id: string;
  name: string;
  messageBody: string;
  status: "DRAFT" | "SENDING" | "COMPLETED" | "PARTIAL_FAILURE" | "FAILED" | string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  clickedCount: number;
  submittedCount: number;
  failedCount: number;
  optedOutCount: number;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  form?: {
    id: string;
    title: string;
    slug: string;
  };
  template?: {
    id: string;
    name: string;
    category: string;
    messageBody?: string;
  } | null;
  recipients?: SmsRecipient[];
}

interface SmsTemplate {
  id: string;
  name: string;
  category: string;
  messageBody: string;
  isSystem: boolean;
}

interface SmsProviderConfig {
  provider: "MOCK" | "TWILIO" | "WEBHOOK" | string;
  fromNumber?: string | null;
  webhookUrl?: string | null;
  accountSidMasked?: string | null;
  hasAuthToken?: boolean;
  webhookAuthHeader?: string | null;
  isEnabled: boolean;
  updatedAt?: string | null;
}

interface SmsSuppression {
  id: string;
  phoneNumber: string;
  reason: string;
  details?: string | null;
  createdAt: string;
}

export function SmsInvitationsView() {
  const { activeWorkspace } = useWorkspace();
  const toast = useToast();

  const [activeSubTab, setActiveSubTab] = useState<"campaigns" | "settings">("campaigns");

  // Campaign list state
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalRecipients: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalClicked: 0,
    totalSubmitted: 0,
    totalFailed: 0,
    totalOptOuts: 0,
  });
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Forms and templates
  const [forms, setForms] = useState<Array<{ id: string; title: string; slug: string }>>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);

  // Composer Modal State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerName, setComposerName] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [messageBody, setMessageBody] = useState(DEFAULT_SMS_TEMPLATES[0].messageBody);
  const [recipientMode, setRecipientMode] = useState<"single" | "bulk" | "crm">("single");

  // Single recipient input
  const [singlePhone, setSinglePhone] = useState("");
  const [singleName, setSingleName] = useState("");
  const [singleCompany, setSingleCompany] = useState("");

  // Bulk recipient input
  const [bulkCsvText, setBulkCsvText] = useState("");

  // CRM contacts with phone
  const [crmContacts, setCrmContacts] = useState<Array<{ id: string; name: string; phoneNumber?: string; company?: string; email?: string }>>([]);
  const [selectedCrmIds, setSelectedCrmIds] = useState<Set<string>>(new Set());

  // Test SMS state in composer
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Dispatch Confirmation Modal State
  const [confirmDispatchCampaign, setConfirmDispatchCampaign] = useState<SmsCampaign | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  // Inspect Campaign Drawer / Modal State
  const [inspectingCampaign, setInspectingCampaign] = useState<SmsCampaign | null>(null);

  // Delete draft state
  const [deletingCampaign, setDeletingCampaign] = useState<SmsCampaign | null>(null);

  // Settings & Configuration state
  const [providerConfig, setProviderConfig] = useState<SmsProviderConfig | null>(null);
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [cfgProviderType, setCfgProviderType] = useState<"MOCK" | "TWILIO" | "WEBHOOK">("MOCK");
  const [cfgFromPhone, setCfgFromPhone] = useState("");
  const [cfgAccountSid, setCfgAccountSid] = useState("");
  const [cfgAuthToken, setCfgAuthToken] = useState("");
  const [cfgWebhookUrl, setCfgWebhookUrl] = useState("");
  const [cfgCustomHeaders, setCfgCustomHeaders] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [verifyTestPhone, setVerifyTestPhone] = useState("");
  const [isVerifyingConnection, setIsVerifyingConnection] = useState(false);

  // Suppressions state
  const [suppressions, setSuppressions] = useState<SmsSuppression[]>([]);
  const [newSuppressionPhone, setNewSuppressionPhone] = useState("");
  const [isLoadingSuppressions, setIsLoadingSuppressions] = useState(false);

  // Segment calculation for current composer message
  const segmentStats: SmsSegmentCalculation = useMemo(() => {
    return calculateSmsSegments(messageBody);
  }, [messageBody]);

  // Interpolated preview text for phone mockup
  const previewText = useMemo(() => {
    const selectedForm = forms.find((f) => f.id === selectedFormId);
    return interpolateSmsTemplate(messageBody, {
      customer: {
        name: singleName.trim() || "Sarah Connor",
        firstName: (singleName.trim() || "Sarah").split(" ")[0],
        company: singleCompany.trim() || "Acme Corp",
      },
      workspace: {
        name: activeWorkspace?.name || "Our Team",
      },
      form: {
        title: selectedForm?.title || "Customer Testimonial",
      },
      invitation: {
        url: `https://praise.io/p/${selectedForm?.slug || "review"}?invite=demo123`,
      },
      optout: {
        text: "Reply STOP to opt out",
      },
    });
  }, [messageBody, singleName, singleCompany, selectedFormId, forms, activeWorkspace]);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setIsLoadingCampaigns(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invitations/sms/campaigns?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.campaigns || []);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      toast.error("Failed to load SMS campaigns");
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, [activeWorkspace?.id, searchQuery, statusFilter, toast]);

  // Fetch forms and templates
  const fetchMetadata = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    try {
      const [formsRes, tmplRes] = await Promise.all([
        fetch(`/api/workspaces/${activeWorkspace.id}/forms`),
        fetch(`/api/workspaces/${activeWorkspace.id}/invitations/sms/templates`),
      ]);
      const formsData = await formsRes.json();
      const tmplData = await tmplRes.json();

      if (formsData.forms) {
        setForms(formsData.forms);
        if (formsData.forms.length > 0 && !selectedFormId) {
          setSelectedFormId(formsData.forms[0].id);
        }
      }
      if (tmplData.templates) {
        setTemplates(tmplData.templates);
      }
    } catch {
      // Non-blocking
    }
  }, [activeWorkspace?.id, selectedFormId]);

  // Fetch provider config
  const fetchConfig = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invitations/sms/config`);
      const data = await res.json();
      if (data.success && data.config) {
        setProviderConfig(data.config);
        setCfgProviderType((data.config.provider as any) || "MOCK");
        setCfgFromPhone(data.config.fromNumber || "");
        setCfgWebhookUrl(data.config.webhookUrl || "");
        setCfgCustomHeaders(data.config.webhookAuthHeader || "");
      }
    } catch {
      toast.error("Failed to load SMS provider configuration");
    }
  }, [activeWorkspace?.id, toast]);

  // Fetch suppressions
  const fetchSuppressions = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setIsLoadingSuppressions(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invitations/sms/suppressions`);
      const data = await res.json();
      if (data.success) {
        setSuppressions(data.suppressions || []);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingSuppressions(false);
    }
  }, [activeWorkspace?.id]);

  // Fetch CRM contacts with phone
  const fetchCrmContacts = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/customers`);
      const data = await res.json();
      if (data.success && Array.isArray(data.customers)) {
        const withPhone = data.customers.filter((c: any) => Boolean(c.phoneNumber));
        setCrmContacts(withPhone);
      }
    } catch {
      // Non-blocking
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    fetchCampaigns();
    fetchMetadata();
  }, [fetchCampaigns, fetchMetadata]);

  useEffect(() => {
    if (activeSubTab === "settings") {
      fetchConfig();
      fetchSuppressions();
    }
  }, [activeSubTab, fetchConfig, fetchSuppressions]);

  // Open composer
  const handleOpenComposer = () => {
    setComposerName(`SMS Invitation - ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
    setMessageBody(DEFAULT_SMS_TEMPLATES[0].messageBody);
    setSelectedTemplateId(templates[0]?.id || "");
    setSinglePhone("");
    setSingleName("");
    setSingleCompany("");
    setBulkCsvText("");
    setSelectedCrmIds(new Set());
    setIsComposerOpen(true);
    fetchCrmContacts();
  };

  // Select template
  const handleSelectTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      setMessageBody(tmpl.messageBody);
    }
  };

  // Insert placeholder tag into message
  const handleInsertTag = (tag: string) => {
    setMessageBody((prev) => `${prev} ${tag}`);
  };

  // Send Test SMS from composer
  const handleSendTestSms = async () => {
    if (!testPhoneNumber.trim()) {
      toast.error("Please enter a test phone number with country code");
      return;
    }
    if (!activeWorkspace?.id) return;

    setIsSendingTest(true);
    try {
      const selectedForm = forms.find((f) => f.id === selectedFormId);
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invitations/sms/campaigns/dummy/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toPhone: testPhoneNumber.trim(),
          messageBody,
          formTitle: selectedForm?.title,
          formSlug: selectedForm?.slug,
          workspaceName: activeWorkspace.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Test SMS sent", data.message);
      } else {
        toast.error("Failed to send test SMS", data.error);
      }
    } catch {
      toast.error("Failed to send test SMS");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Create Campaign (Draft or ready to confirm)
  const handleCreateCampaign = async (launchImmediate = false) => {
    if (!composerName.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }
    if (!selectedFormId) {
      toast.error("Please select a collection form");
      return;
    }
    if (!messageBody.trim()) {
      toast.error("Please enter SMS message text");
      return;
    }

    // Build recipient list
    const recipients: Array<{ phoneNumber: string; name?: string; company?: string; customerId?: string }> = [];

    if (recipientMode === "single") {
      if (!singlePhone.trim()) {
        toast.error("Please enter a destination phone number");
        return;
      }
      recipients.push({
        phoneNumber: singlePhone.trim(),
        name: singleName.trim() || undefined,
        company: singleCompany.trim() || undefined,
      });
    } else if (recipientMode === "bulk") {
      const lines = bulkCsvText.split("\n").map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim());
        if (parts[0]) {
          recipients.push({
            phoneNumber: parts[0],
            name: parts[1] || undefined,
            company: parts[2] || undefined,
          });
        }
      }
      if (recipients.length === 0) {
        toast.error("No valid phone numbers found in CSV input");
        return;
      }
    } else if (recipientMode === "crm") {
      if (selectedCrmIds.size === 0) {
        toast.error("Please select at least one contact from CRM");
        return;
      }
      for (const id of selectedCrmIds) {
        const c = crmContacts.find((item) => item.id === id);
        if (c?.phoneNumber) {
          recipients.push({
            phoneNumber: c.phoneNumber,
            name: c.name,
            company: c.company,
            customerId: c.id,
          });
        }
      }
    }

    if (!activeWorkspace?.id) return;

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invitations/sms/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: composerName.trim(),
          formId: selectedFormId,
          templateId: selectedTemplateId || undefined,
          messageBody: messageBody.trim(),
          recipients,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        toast.error("Failed to create SMS campaign", data.error);
        return;
      }

      setIsComposerOpen(false);
      toast.success("SMS campaign created successfully!");
      fetchCampaigns();

      if (launchImmediate) {
        setConfirmDispatchCampaign(data.campaign);
      }
    } catch {
      toast.error("Failed to create SMS campaign");
    }
  };

  // Dispatch campaign after explicit owner confirmation
  const handleExecuteDispatch = async () => {
    if (!confirmDispatchCampaign || !activeWorkspace?.id) return;
    setIsDispatching(true);
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/invitations/sms/campaigns/${confirmDispatchCampaign.id}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmed: true }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("SMS Campaign Dispatched", data.message);
        setConfirmDispatchCampaign(null);
        fetchCampaigns();
      } else {
        toast.error("Failed to dispatch campaign", data.error);
      }
    } catch {
      toast.error("Failed to dispatch SMS campaign");
    } finally {
      setIsDispatching(false);
    }
  };

  // Inspect campaign details
  const handleInspect = async (campaign: SmsCampaign) => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invitations/sms/campaigns/${campaign.id}`);
      const data = await res.json();
      if (data.success) {
        setInspectingCampaign(data.campaign);
      }
    } catch {
      toast.error("Failed to load campaign details");
    }
  };

  // Delete draft campaign
  const handleDeleteDraft = async () => {
    if (!deletingCampaign || !activeWorkspace?.id) return;
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/invitations/sms/campaigns/${deletingCampaign.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Campaign deleted successfully");
        setDeletingCampaign(null);
        fetchCampaigns();
      } else {
        toast.error("Failed to delete campaign", data.error);
      }
    } catch {
      toast.error("Failed to delete campaign");
    }
  };

  // Save SMS Provider configuration
  const handleSaveConfig = async () => {
    if (!activeWorkspace?.id) return;
    setIsSavingConfig(true);
    try {
      const payload: any = {
        provider: cfgProviderType,
        fromNumber: cfgFromPhone,
        webhookUrl: cfgWebhookUrl,
        webhookAuthHeader: cfgCustomHeaders,
        isEnabled: true,
      };

      if (isEditingCredentials) {
        if (cfgAccountSid) payload.accountSid = cfgAccountSid;
        if (cfgAuthToken) payload.authToken = cfgAuthToken;
      }

      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invitations/sms/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Configuration Saved", "SMS Provider settings updated securely.");
        setProviderConfig(data.config);
        setIsEditingCredentials(false);
        setCfgAccountSid("");
        setCfgAuthToken("");
      } else {
        toast.error("Failed to save configuration", data.error);
      }
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Test provider connection
  const handleVerifyConnection = async () => {
    if (!verifyTestPhone.trim()) {
      toast.error("Please enter a destination phone number for connection testing");
      return;
    }
    if (!activeWorkspace?.id) return;

    setIsVerifyingConnection(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invitations/sms/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          provider: cfgProviderType,
          fromNumber: cfgFromPhone,
          accountSid: cfgAccountSid || undefined,
          authToken: cfgAuthToken || undefined,
          webhookUrl: cfgWebhookUrl || undefined,
          webhookAuthHeader: cfgCustomHeaders || undefined,
          testPhone: verifyTestPhone.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Connection Verified", data.message || "Test message sent successfully!");
      } else {
        toast.error("Connection Failed", data.message || data.error);
      }
    } catch {
      toast.error("Connection test failed");
    } finally {
      setIsVerifyingConnection(false);
    }
  };

  // Add suppression
  const handleAddSuppression = async () => {
    if (!newSuppressionPhone.trim() || !activeWorkspace?.id) return;
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/invitations/sms/suppressions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: newSuppressionPhone.trim(),
          reason: "MANUAL_OPTOUT",
          details: "Manually suppressed by workspace owner",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Phone Number Suppressed", "Added to SMS opt-out suppression ledger.");
        setNewSuppressionPhone("");
        fetchSuppressions();
      } else {
        toast.error("Failed to suppress phone number", data.error);
      }
    } catch {
      toast.error("Failed to suppress phone number");
    }
  };

  // Remove suppression
  const handleRemoveSuppression = async (phone: string) => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/invitations/sms/suppressions?phoneNumber=${encodeURIComponent(phone)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(`Removed ${phone} from suppression list.`);
        fetchSuppressions();
      } else {
        toast.error("Failed to remove suppression", data.error);
      }
    } catch {
      toast.error("Failed to remove suppression");
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("campaigns")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeSubTab === "campaigns"
                ? "bg-brand-50 text-brand-700"
                : "text-ink-600 hover:bg-warm-100"
            }`}
          >
            <Smartphone size={14} />
            <span>SMS Campaigns</span>
          </button>
          <button
            onClick={() => setActiveSubTab("settings")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeSubTab === "settings"
                ? "bg-brand-50 text-brand-700"
                : "text-ink-600 hover:bg-warm-100"
            }`}
          >
            <Settings size={14} />
            <span>SMS Provider & Opt-Outs</span>
          </button>
        </div>

        {activeSubTab === "campaigns" && (
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCampaigns}
              disabled={isLoadingCampaigns}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
            >
              <RefreshCw size={13} className={isLoadingCampaigns ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleOpenComposer}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
            >
              <Plus size={14} />
              <span>Send SMS Invitation</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. SMS CAMPAIGNS TAB */}
      {/* ========================================================================= */}
      {activeSubTab === "campaigns" && (
        <div className="space-y-6">
          {/* Aggregate Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">Total SMS</span>
              <p className="mt-1 text-xl font-bold text-ink-900">{stats.totalRecipients}</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">Delivered</span>
              <p className="mt-1 text-xl font-bold text-emerald-600">{stats.totalDelivered}</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">Delivery Rate</span>
              <p className="mt-1 text-xl font-bold text-ink-900">
                {stats.totalSent > 0 ? Math.round((stats.totalDelivered / stats.totalSent) * 100) : 0}%
              </p>
            </div>
            <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">Clicks</span>
              <p className="mt-1 text-xl font-bold text-blue-600">{stats.totalClicked}</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">Submissions</span>
              <p className="mt-1 text-xl font-bold text-brand-600">{stats.totalSubmitted}</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">Failed</span>
              <p className="mt-1 text-xl font-bold text-rose-600">{stats.totalFailed}</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
              <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">Opt-Outs</span>
              <p className="mt-1 text-xl font-bold text-amber-600">{stats.totalOptOuts}</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search SMS campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink-700 font-medium focus:border-brand-500 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SENDING">Sending</option>
                <option value="COMPLETED">Completed</option>
                <option value="PARTIAL_FAILURE">Partial Failure</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          {/* Campaigns Table */}
          {isLoadingCampaigns ? (
            <div className="flex flex-col items-center justify-center p-12 text-ink-400 space-y-2">
              <Loader2 size={24} className="animate-spin text-brand-500" />
              <span className="text-xs">Loading SMS campaigns...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-warm-50/50 p-12 text-center">
              <Smartphone size={32} className="mx-auto text-ink-300 mb-3" />
              <h3 className="text-sm font-semibold text-ink-900">No SMS campaigns found</h3>
              <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
                Invite your customers to submit video and text testimonials directly over SMS with personalized links.
              </p>
              <button
                onClick={handleOpenComposer}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
              >
                <Plus size={14} />
                <span>Create First SMS Campaign</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-white overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-warm-50/50 text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Campaign</th>
                    <th className="py-3 px-3">Form</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-center">Recipients</th>
                    <th className="py-3 px-3 text-center">Delivered</th>
                    <th className="py-3 px-3 text-center">Responses</th>
                    <th className="py-3 px-3 text-center">Opt-Outs</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {campaigns.map((camp) => {
                    const isDraft = camp.status === "DRAFT";
                    return (
                      <tr key={camp.id} className="hover:bg-warm-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleInspect(camp)}
                            className="font-semibold text-ink-900 hover:text-brand-600 transition-colors text-left"
                          >
                            {camp.name}
                          </button>
                          <div className="text-[11px] text-ink-400 mt-0.5">
                            Created {new Date(camp.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-ink-700">
                          {camp.form?.title || "Testimonial Form"}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              camp.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : camp.status === "SENDING"
                                ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                                : camp.status === "DRAFT"
                                ? "bg-warm-100 text-ink-700 border border-line"
                                : camp.status === "PARTIAL_FAILURE"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {camp.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-ink-900">
                          {camp.totalRecipients}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-semibold text-emerald-600">{camp.deliveredCount}</span>
                          <span className="text-ink-400 text-[10px]"> / {camp.sentCount}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-semibold text-brand-600">{camp.submittedCount}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-amber-600">
                          {camp.optedOutCount}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isDraft ? (
                              <>
                                <button
                                  onClick={() => setConfirmDispatchCampaign(camp)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
                                  title="Owner Confirmation & Send"
                                >
                                  <Send size={11} />
                                  <span>Send</span>
                                </button>
                                <button
                                  onClick={() => setDeletingCampaign(camp)}
                                  className="p-1 rounded text-ink-400 hover:text-rose-600 transition-colors"
                                  title="Delete Draft"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleInspect(camp)}
                                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
                              >
                                <Eye size={12} />
                                <span>Inspect</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SMS PROVIDER SETTINGS TAB */}
      {/* ========================================================================= */}
      {activeSubTab === "settings" && (
        <div className="space-y-6 max-w-4xl">
          {/* Provider Configuration Card */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-semibold text-ink-900">SMS Gateway Configuration</h3>
              <p className="text-xs text-ink-500 mt-1">
                Configure your preferred SMS delivery adapter. Praise supports built-in simulation for zero-cost testing, Twilio, or generic custom HTTP webhooks.
              </p>
            </div>

            {/* Provider Type Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "MOCK",
                  title: "Built-in Simulator",
                  subtitle: "Zero cost · In-memory sandbox with auto delivery",
                  badge: "Default",
                },
                {
                  id: "TWILIO",
                  title: "Twilio SMS",
                  subtitle: "Direct carrier routes via Twilio Messages API",
                  badge: "Official",
                },
                {
                  id: "WEBHOOK",
                  title: "Generic Webhook",
                  subtitle: "Connect any custom SMS gateway or aggregators",
                  badge: "Custom",
                },
              ].map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setCfgProviderType(prov.id as any)}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                    cfgProviderType === prov.id
                      ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-500"
                      : "border-line bg-white hover:bg-warm-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-ink-900">{prov.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-warm-100 text-ink-600">
                      {prov.badge}
                    </span>
                  </div>
                  <span className="text-[11px] text-ink-500 leading-relaxed">{prov.subtitle}</span>
                </button>
              ))}
            </div>

            {/* Provider Parameters */}
            <div className="space-y-4 pt-2 border-t border-line">
              {cfgProviderType === "MOCK" && (
                <div className="rounded-xl bg-warm-50/70 border border-line p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-ink-900 font-semibold">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>Built-in Simulator Active</span>
                  </div>
                  <p className="text-ink-600 text-[11px] leading-relaxed">
                    SMS invitations are simulated in-memory and marked sent or delivered without incurring telecom charges or requiring third-party credentials. Ideal for local development, staging, or testing testimonial workflows.
                  </p>
                </div>
              )}

              {cfgProviderType === "TWILIO" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink-900 mb-1">
                        Twilio Account SID *
                      </label>
                      {providerConfig?.accountSidMasked && !isEditingCredentials ? (
                        <div className="flex items-center justify-between rounded-xl border border-line bg-warm-50 px-3 py-2 text-xs font-mono text-ink-700">
                          <span>{providerConfig.accountSidMasked}</span>
                          <button
                            type="button"
                            onClick={() => setIsEditingCredentials(true)}
                            className="text-brand-600 hover:text-brand-700 text-xs font-sans font-semibold"
                          >
                            Update
                          </button>
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={cfgAccountSid}
                          onChange={(e) => setCfgAccountSid(e.target.value)}
                          className="w-full rounded-xl border border-line p-2 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink-900 mb-1">
                        Auth Token / API Secret *
                      </label>
                      {providerConfig?.hasAuthToken && !isEditingCredentials ? (
                        <div className="flex items-center justify-between rounded-xl border border-line bg-warm-50 px-3 py-2 text-xs font-mono text-ink-700">
                          <span>••••••••••••••••••••••••••••••••</span>
                          <button
                            type="button"
                            onClick={() => setIsEditingCredentials(true)}
                            className="text-brand-600 hover:text-brand-700 text-xs font-sans font-semibold"
                          >
                            Update
                          </button>
                        </div>
                      ) : (
                        <input
                          type="password"
                          placeholder="Your Twilio Auth Token"
                          value={cfgAuthToken}
                          onChange={(e) => setCfgAuthToken(e.target.value)}
                          className="w-full rounded-xl border border-line p-2 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      From Phone Number or Messaging Service SID *
                    </label>
                    <input
                      type="text"
                      placeholder="+1234567890 or MGxxxxxxxxxxxxxxxx"
                      value={cfgFromPhone}
                      onChange={(e) => setCfgFromPhone(e.target.value)}
                      className="w-full rounded-xl border border-line p-2 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {cfgProviderType === "WEBHOOK" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Webhook Gateway Endpoint URL *
                    </label>
                    <input
                      type="url"
                      placeholder="https://api.sms-gateway.com/v1/send"
                      value={cfgWebhookUrl}
                      onChange={(e) => setCfgWebhookUrl(e.target.value)}
                      className="w-full rounded-xl border border-line p-2 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Custom HTTP Auth Header / Token <span className="font-normal text-ink-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Bearer YOUR_SECRET_KEY"
                      value={cfgCustomHeaders}
                      onChange={(e) => setCfgCustomHeaders(e.target.value)}
                      className="w-full rounded-xl border border-line p-2 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-line">
              <div className="text-[11px] text-ink-400">
                Credentials are encrypted and securely stored.
              </div>
              <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {isSavingConfig && <Loader2 size={13} className="animate-spin" />}
                <span>Save Provider Settings</span>
              </button>
            </div>
          </div>

          {/* Test Provider Connection Card */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-2xs space-y-4">
            <h4 className="text-sm font-semibold text-ink-900">Verify SMS Connection</h4>
            <p className="text-xs text-ink-500">
              Send a real-time verification ping to verify credentials and sender configuration before sending live campaigns.
            </p>

            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                placeholder="+15551234567"
                value={verifyTestPhone}
                onChange={(e) => setVerifyTestPhone(e.target.value)}
                className="flex-1 rounded-xl border border-line p-2 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
              />
              <button
                onClick={handleVerifyConnection}
                disabled={isVerifyingConnection || !verifyTestPhone.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 disabled:opacity-50 transition-colors shrink-0"
              >
                {isVerifyingConnection ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Send Test Ping</span>
              </button>
            </div>
          </div>

          {/* Opt-out & Suppression Ledger */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-ink-900">SMS Opt-Out Suppression Ledger</h4>
                <p className="text-xs text-ink-500 mt-0.5">
                  Protects recipients who opted out via STOP replies or opt-out links. Future campaigns automatically skip these numbers.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-warm-100 text-ink-600">
                {suppressions.length} suppressed
              </span>
            </div>

            {/* Add manual suppression */}
            <div className="flex items-center gap-2 max-w-md pt-2">
              <input
                type="text"
                placeholder="Add phone e.g. +15551234567"
                value={newSuppressionPhone}
                onChange={(e) => setNewSuppressionPhone(e.target.value)}
                className="flex-1 rounded-xl border border-line p-2 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
              />
              <button
                onClick={handleAddSuppression}
                disabled={!newSuppressionPhone.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-black disabled:opacity-50 transition-colors shrink-0"
              >
                <ShieldAlert size={13} />
                <span>Suppress</span>
              </button>
            </div>

            {/* Suppression list */}
            {isLoadingSuppressions ? (
              <div className="p-4 text-center text-xs text-ink-400">Loading suppressions...</div>
            ) : suppressions.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-400 border border-dashed border-line rounded-xl">
                No phone numbers are currently suppressed in this workspace.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto rounded-xl border border-line divide-y divide-line">
                {suppressions.map((sup) => (
                  <div key={sup.id} className="flex items-center justify-between p-2.5 text-xs hover:bg-warm-50/50">
                    <div>
                      <span className="font-mono font-semibold text-ink-900">{sup.phoneNumber}</span>
                      <span className="ml-2 text-[10px] text-ink-400">({sup.reason})</span>
                      <div className="text-[10px] text-ink-400">
                        {sup.details || "Opted out"} · {new Date(sup.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveSuppression(sup.phoneNumber)}
                      className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold"
                    >
                      Unsuppress
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SMS CAMPAIGN COMPOSER MODAL (With Live Phone Mockup & Segment Counter) */}
      {/* ========================================================================= */}
      <ModalDialog
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        title="Compose SMS Testimonial Campaign"
        description="Craft personalized SMS messages with unique testimonial links and live character segment tracking."
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Test phone (+1...)"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                className="w-36 rounded-lg border border-line px-2 py-1.5 text-xs font-mono text-ink-900"
              />
              <button
                type="button"
                onClick={handleSendTestSms}
                disabled={isSendingTest || !testPhoneNumber.trim()}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 disabled:opacity-50"
              >
                {isSendingTest ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                <span>Test SMS</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCreateCampaign(false)}
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 shadow-2xs"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleCreateCampaign(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600"
              >
                <span>Continue to Send</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Left Form: Fields, Templates, Recipient Input (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Campaign Name & Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  value={composerName}
                  onChange={(e) => setComposerName(e.target.value)}
                  placeholder="e.g. November Customer Outreach"
                  className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">Collection Form *</label>
                <select
                  value={selectedFormId}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                >
                  {forms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Template Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-ink-900">Message Template</label>
                <span className="text-[10px] text-ink-400">Loads starter copy</span>
              </div>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full rounded-xl border border-line p-2 text-xs text-ink-700 font-medium focus:border-brand-500 focus:outline-none"
              >
                <option value="">Custom SMS Text</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </div>

            {/* SMS Body & Variable Helpers */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-ink-900">SMS Body *</label>
                <div className="flex items-center gap-1">
                  {[
                    "{{customer.firstName}}",
                    "{{workspace.name}}",
                    "{{invitation.url}}",
                    "{{optout.text}}",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertTag(tag)}
                      className="text-[10px] bg-warm-100 hover:bg-brand-50 hover:text-brand-700 text-ink-600 px-1.5 py-0.5 rounded font-mono font-medium transition-colors"
                      title={`Insert ${tag}`}
                    >
                      {tag.replace(/[{}]/g, "")}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={4}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 leading-relaxed font-sans focus:border-brand-500 focus:outline-none"
              />

              {/* Segment & Character Counter Indicator */}
              <div className="mt-1.5 flex items-center justify-between text-[11px] px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${
                      segmentStats.segmentCount > 1 ? "text-amber-600" : "text-ink-600"
                    }`}
                  >
                    {segmentStats.length} characters · {segmentStats.segmentCount} segment
                    {segmentStats.segmentCount > 1 ? "s" : ""}
                  </span>
                  <span className="text-ink-400">
                    ({segmentStats.remainingInCurrentSegment} remaining in segment)
                  </span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    segmentStats.hasUnicode
                      ? "bg-purple-100 text-purple-700"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {segmentStats.encoding}
                </span>
              </div>
            </div>

            {/* Recipient Source Selection */}
            <div className="pt-2 border-t border-line space-y-3">
              <label className="block text-xs font-semibold text-ink-900">Recipients</label>
              <div className="flex items-center gap-1 border-b border-line pb-2">
                {[
                  { id: "single", label: "Single Number", icon: UserPlus },
                  { id: "bulk", label: "CSV / Paste", icon: FileSpreadsheet },
                  { id: "crm", label: "From CRM", icon: Users },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRecipientMode(m.id as any)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        recipientMode === m.id
                          ? "bg-brand-50 text-brand-700 font-semibold"
                          : "text-ink-600 hover:bg-warm-100"
                      }`}
                    >
                      <Icon size={13} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Recipient Input Mode Panels */}
              {recipientMode === "single" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-warm-50/50 p-3 rounded-xl border border-line">
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-700 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      placeholder="+15551234567"
                      value={singlePhone}
                      onChange={(e) => setSinglePhone(e.target.value)}
                      className="w-full rounded-lg border border-line p-1.5 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-700 mb-1">Name</label>
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      className="w-full rounded-lg border border-line p-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-700 mb-1">Company</label>
                    <input
                      type="text"
                      placeholder="Acme"
                      value={singleCompany}
                      onChange={(e) => setSingleCompany(e.target.value)}
                      className="w-full rounded-lg border border-line p-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {recipientMode === "bulk" && (
                <div className="space-y-1 bg-warm-50/50 p-3 rounded-xl border border-line">
                  <div className="flex items-center justify-between text-[11px] text-ink-500">
                    <span>One per line: phone,name,company</span>
                    <span>Format: +15551234567,John Doe,Acme</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="+15551234567,Jane Doe,Acme Corp&#10;+15559876543,Bob Smith,Globex"
                    value={bulkCsvText}
                    onChange={(e) => setBulkCsvText(e.target.value)}
                    className="w-full rounded-lg border border-line p-2 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              )}

              {recipientMode === "crm" && (
                <div className="bg-warm-50/50 p-3 rounded-xl border border-line space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-ink-600">
                    <span>Select CRM contacts with phone numbers:</span>
                    <span>{selectedCrmIds.size} selected</span>
                  </div>
                  {crmContacts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-ink-400">
                      No CRM contacts with phone numbers found. Add phone numbers in Customer CRM first.
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {crmContacts.map((c) => {
                        const isSelected = selectedCrmIds.has(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              const next = new Set(selectedCrmIds);
                              if (isSelected) next.delete(c.id);
                              else next.add(c.id);
                              setSelectedCrmIds(next);
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                              isSelected ? "bg-brand-50 border border-brand-200" : "hover:bg-white"
                            }`}
                          >
                            <span className="font-semibold text-ink-900">{c.name}</span>
                            <span className="font-mono text-ink-600 text-[11px]">{c.phoneNumber}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Preview: Mobile Phone Mockup (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-start">
            <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wider mb-2">
              Live Mobile SMS Mockup
            </span>
            <div className="w-full max-w-[280px] rounded-[36px] border-[5px] border-ink-900 bg-white shadow-xl overflow-hidden flex flex-col h-[460px]">
              {/* Phone Speaker & Camera Notch */}
              <div className="bg-ink-900 py-2 flex items-center justify-center">
                <div className="h-1.5 w-12 rounded-full bg-ink-700" />
              </div>

              {/* Messages Header */}
              <div className="bg-warm-100 border-b border-line px-4 py-2.5 flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                  {activeWorkspace?.name ? activeWorkspace.name.charAt(0) : "P"}
                </div>
                <div>
                  <div className="text-xs font-bold text-ink-900 line-clamp-1">
                    {activeWorkspace?.name || "Our Team"}
                  </div>
                  <div className="text-[10px] text-ink-400">Messages · SMS</div>
                </div>
              </div>

              {/* Message Bubble Container */}
              <div className="flex-1 bg-warm-50/60 p-3 space-y-3 overflow-y-auto flex flex-col justify-end">
                <div className="text-[10px] text-center text-ink-400">Today · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                <div className="self-start max-w-[92%] bg-brand-600 text-white rounded-2xl rounded-bl-sm p-3 text-xs leading-relaxed shadow-xs">
                  <p className="whitespace-pre-wrap break-words">{previewText}</p>
                </div>
              </div>

              {/* Mockup Bottom Home Bar */}
              <div className="bg-white py-2 flex justify-center">
                <div className="h-1 w-20 rounded-full bg-ink-300" />
              </div>
            </div>
          </div>
        </div>
      </ModalDialog>

      {/* ========================================================================= */}
      {/* 4. EXPLICIT OWNER CONFIRMATION DISPATCH MODAL */}
      {/* ========================================================================= */}
      <ConfirmDialog
        isOpen={Boolean(confirmDispatchCampaign)}
        onClose={() => setConfirmDispatchCampaign(null)}
        onConfirm={handleExecuteDispatch}
        title="Confirm SMS Campaign Dispatch"
        message={`Are you sure you want to dispatch "${confirmDispatchCampaign?.name}" to ${confirmDispatchCampaign?.totalRecipients} recipient(s)? SMS messages will be immediately delivered via your configured SMS provider.`}
        confirmLabel={isDispatching ? "Dispatching..." : "Confirm & Send Now"}
      />

      {/* ========================================================================= */}
      {/* 5. INSPECT CAMPAIGN RECIPIENTS DRAWER */}
      {/* ========================================================================= */}
      <ModalDialog
        isOpen={Boolean(inspectingCampaign)}
        onClose={() => setInspectingCampaign(null)}
        title={inspectingCampaign?.name || "SMS Campaign Details"}
        description={`Status: ${inspectingCampaign?.status} · Form: ${inspectingCampaign?.form?.title}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-warm-50 border border-line">
              <span className="text-ink-400 text-[10px]">Total</span>
              <p className="font-bold text-ink-900">{inspectingCampaign?.totalRecipients}</p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-emerald-700 text-[10px]">Delivered</span>
              <p className="font-bold text-emerald-700">{inspectingCampaign?.deliveredCount}</p>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-blue-700 text-[10px]">Clicks</span>
              <p className="font-bold text-blue-700">{inspectingCampaign?.clickedCount}</p>
            </div>
            <div className="p-2 rounded-xl bg-brand-50 border border-brand-100">
              <span className="text-brand-700 text-[10px]">Submissions</span>
              <p className="font-bold text-brand-700">{inspectingCampaign?.submittedCount}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-ink-900">Message Text</h5>
            <div className="p-3 rounded-xl bg-warm-50 border border-line text-xs font-mono whitespace-pre-wrap text-ink-800">
              {inspectingCampaign?.messageBody}
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-ink-900">Recipients ({inspectingCampaign?.recipients?.length || 0})</h5>
            <div className="max-h-60 overflow-y-auto rounded-xl border border-line divide-y divide-line">
              {(inspectingCampaign?.recipients || []).map((r) => (
                <div key={r.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-warm-50/50">
                  <div>
                    <div className="font-mono font-semibold text-ink-900">{r.phoneNumber}</div>
                    <div className="text-[11px] text-ink-400">
                      {r.name || "Recipient"} {r.customer?.company ? `· ${r.customer.company}` : ""}
                    </div>
                    {r.errorMessage && (
                      <div className="text-[10px] text-rose-600 mt-0.5">{r.errorMessage}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        r.status === "SUBMITTED"
                          ? "bg-brand-100 text-brand-800"
                          : r.status === "DELIVERED"
                          ? "bg-emerald-100 text-emerald-800"
                          : r.status === "CLICKED"
                          ? "bg-blue-100 text-blue-800"
                          : r.status === "OPTED_OUT"
                          ? "bg-amber-100 text-amber-800"
                          : r.status === "FAILED"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-warm-100 text-ink-600"
                      }`}
                    >
                      {r.status}
                    </span>
                    <div className="text-[10px] text-ink-400 mt-0.5">
                      {r.segmentCount} segment{r.segmentCount > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ModalDialog>

      {/* ========================================================================= */}
      {/* 6. DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      <ConfirmDialog
        isOpen={Boolean(deletingCampaign)}
        onClose={() => setDeletingCampaign(null)}
        onConfirm={handleDeleteDraft}
        title="Delete Draft Campaign"
        message={`Are you sure you want to delete draft campaign "${deletingCampaign?.name}"?`}
        confirmLabel="Delete Draft"
        isDestructive
      />
    </div>
  );
}
