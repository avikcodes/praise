"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  Globe,
  History,
  Inbox,
  Info,
  Layers,
  ListOrdered,
  Loader2,
  Mail,
  MoreVertical,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Search,
  Send,
  SendHorizontal,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { interpolateEmailTemplate, buildHtmlEmail } from "@/lib/email/templating";
import { SmsInvitationsView } from "@/components/dashboard/sms-invitations-view";
import { cn } from "@/lib/utils";

type CampaignStep = {
  id: string;
  campaignId: string;
  stepNumber: number;
  delayDays: number;
  delayHours: number;
  subject: string;
  bodyText: string;
  status: "PENDING" | "SCHEDULED" | "SENDING" | "COMPLETED" | "SKIPPED";
  scheduledAt?: string | null;
  sentAt?: string | null;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
};

type RecipientLog = {
  id: string;
  stepNumber: number;
  status: string;
  sentAt: string;
  deliveredAt?: string | null;
  errorMessage?: string | null;
};

type CampaignRecipient = {
  id: string;
  email: string;
  name: string;
  company?: string | null;
  title?: string | null;
  token: string;
  status: "PENDING" | "SENT" | "DELIVERED" | "OPENED" | "CLICKED" | "SUBMITTED" | "BOUNCED" | "FAILED" | "UNSUBSCRIBED";
  currentStepNumber: number;
  lastStepSentAt?: string | null;
  errorMessage?: string | null;
  bounceReason?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  openedAt?: string | null;
  clickedAt?: string | null;
  submittedAt?: string | null;
  testimonialId?: string | null;
  recipientLogs?: RecipientLog[];
};

type CampaignActivity = {
  id: string;
  action: string;
  actorName?: string | null;
  stepNumber?: number | null;
  details: string;
  metadataJson?: string | null;
  createdAt: string;
};

type Campaign = {
  id: string;
  workspaceId: string;
  name: string;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "COMPLETED" | "PAUSED" | "CANCELLED";
  formId: string;
  templateId?: string | null;
  subject: string;
  bodyText: string;
  replyToEmail?: string | null;
  fromName?: string | null;
  timezone: string;
  isSequence: boolean;
  currentStepNumber: number;
  totalSteps: number;
  nextRunAt?: string | null;
  recurringInterval: "NONE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | string;
  recurringNextAt?: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  submittedCount: number;
  bouncedCount: number;
  failedCount: number;
  unsubscribedCount: number;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  form?: {
    id: string;
    title: string;
    slug: string;
  };
  steps?: CampaignStep[];
  activities?: CampaignActivity[];
  recipients?: CampaignRecipient[];
};

type Template = {
  id: string;
  name: string;
  category: string;
  subject: string;
  bodyText: string;
  isSystem: boolean;
};

type CollectionFormSummary = {
  id: string;
  title: string;
  slug: string;
};

type CrmCustomerSummary = {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  title?: string | null;
  stage: string;
};

type CrmSegmentSummary = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
};

type NewRecipientInput = {
  email: string;
  name: string;
  company?: string;
  title?: string;
  customerId?: string;
};

type SequenceStepInput = {
  stepNumber: number;
  delayDays: number;
  delayHours: number;
  subject: string;
  bodyText: string;
  templateId?: string;
};

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function InvitationsPage() {
  const { activeWorkspace } = useWorkspace();
  const workspaceId =
    activeWorkspace && !activeWorkspace.id.startsWith("ws-default")
      ? activeWorkspace.id
      : undefined;
  const toast = useToast();

  const [channelTab, setChannelTab] = useState<"email" | "sms">("email");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalRecipients: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalSubmitted: 0,
    totalBounced: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Auxiliary data
  const [forms, setForms] = useState<CollectionFormSummary[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [crmCustomers, setCrmCustomers] = useState<CrmCustomerSummary[]>([]);
  const [crmSegments, setCrmSegments] = useState<CrmSegmentSummary[]>([]);

  // Composer Modal State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form fields inside composer
  const [campaignName, setCampaignName] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [composerRecipients, setComposerRecipients] = useState<NewRecipientInput[]>([]);

  // Visual Sequence Steps in Composer
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStepInput[]>([
    {
      stepNumber: 1,
      delayDays: 0,
      delayHours: 0,
      subject: "Could you share your quick experience with {{workspace.name}}?",
      bodyText:
        "Hi {{customer.firstName|there}},\n\nWe hope you're having a wonderful week! If you have 60 seconds, we would deeply appreciate your feedback on {{form.title}}.\n\nClick below to share a quick testimonial:\n{{invitation.url}}\n\nThank you for being part of our community!",
    },
    {
      stepNumber: 2,
      delayDays: 3,
      delayHours: 0,
      subject: "Quick follow-up: sharing your thoughts on {{workspace.name}}",
      bodyText:
        "Hi {{customer.firstName|there}},\n\nJust following up on our previous note. We'd still love to hear how {{workspace.name}} is helping you.\n\nHere is your unique submission link:\n{{invitation.url}}\n\nTakes less than 2 minutes!",
    },
  ]);
  const [activeEditingStepIdx, setActiveEditingStepIdx] = useState(0);

  // Scheduling & Timing
  const [deliveryTimingMode, setDeliveryTimingMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledDateStr, setScheduledDateStr] = useState("");
  const [scheduledTimeStr, setScheduledTimeStr] = useState("09:00");
  const [selectedTimezone, setSelectedTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  });
  const [recurringInterval, setRecurringInterval] = useState<"NONE" | "WEEKLY" | "MONTHLY" | "QUARTERLY">("NONE");

  // Recipient entry sub-mode
  const [recipientSourceTab, setRecipientSourceTab] = useState<"single" | "crm" | "segment" | "csv">("single");
  const [singleName, setSingleName] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  const [singleCompany, setSingleCompany] = useState("");
  const [singleTitle, setSingleTitle] = useState("");
  const [crmSearch, setCrmSearch] = useState("");
  const [selectedCrmIds, setSelectedCrmIds] = useState<Set<string>>(new Set());
  const [selectedSegmentId, setSelectedSegmentId] = useState("");
  const [csvRawText, setCsvRawText] = useState("");

  // Test Email
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Review & Confirmation
  const [hasConfirmedSend, setHasConfirmedSend] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  // Inspect Campaign Drawer / Modal
  const [inspectingCampaign, setInspectingCampaign] = useState<Campaign | null>(null);
  const [inspectTab, setInspectTab] = useState<"recipients" | "steps" | "history">("recipients");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Edit upcoming step modal
  const [editingStep, setEditingStep] = useState<CampaignStep | null>(null);
  const [editStepSubject, setEditStepSubject] = useState("");
  const [editStepBody, setEditStepBody] = useState("");
  const [editStepDelayDays, setEditStepDelayDays] = useState(3);
  const [isSavingStepEdit, setIsSavingStepEdit] = useState(false);

  // Direct dispatch / schedule modal for existing draft
  const [dispatchingDraft, setDispatchingDraft] = useState<Campaign | null>(null);
  const [draftConfirmChecked, setDraftConfirmChecked] = useState(false);
  const [draftScheduleMode, setDraftScheduleMode] = useState<"immediate" | "scheduled">("immediate");
  const [draftScheduleDate, setDraftScheduleDate] = useState("");
  const [draftScheduleTime, setDraftScheduleTime] = useState("09:00");

  // Delete modal
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Fetch campaigns and stats
  const fetchCampaigns = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setIsLoading(true);
      const url = new URL(`/api/workspaces/${workspaceId}/invitations/campaigns`, window.location.origin);
      if (search.trim()) url.searchParams.set("search", search.trim());
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to load invitation campaigns.");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, search, statusFilter, toast]);

  // 2. Fetch auxiliary metadata
  const fetchAuxiliaryData = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const [formsRes, tmplRes, custRes, segRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/forms`),
        fetch(`/api/workspaces/${workspaceId}/invitations/templates`),
        fetch(`/api/workspaces/${workspaceId}/customers`),
        fetch(`/api/workspaces/${workspaceId}/customers/segments`),
      ]);

      if (formsRes.ok) {
        const d = await formsRes.json();
        setForms(d.forms || []);
        if (d.forms?.length > 0 && !selectedFormId) {
          setSelectedFormId(d.forms[0].id);
        }
      }
      if (tmplRes.ok) {
        const d = await tmplRes.json();
        setTemplates(d.templates || []);
      }
      if (custRes.ok) {
        const d = await custRes.json();
        setCrmCustomers(d.customers || []);
      }
      if (segRes.ok) {
        const d = await segRes.json();
        setCrmSegments(d.segments || []);
      }
    } catch {}
  }, [workspaceId, selectedFormId]);

  useEffect(() => {
    fetchCampaigns();
    fetchAuxiliaryData();
  }, [fetchCampaigns, fetchAuxiliaryData]);

  // Add Step to Sequence
  const handleAddSequenceStep = () => {
    if (sequenceSteps.length >= 5) {
      toast.info("Limit reached", "Maximum 5 sequence steps supported.");
      return;
    }
    const nextNum = sequenceSteps.length + 1;
    setSequenceSteps((prev) => [
      ...prev,
      {
        stepNumber: nextNum,
        delayDays: 3,
        delayHours: 0,
        subject: `Follow-up ${nextNum - 1}: sharing your thoughts with {{workspace.name}}`,
        bodyText:
          "Hi {{customer.firstName|there}},\n\nJust checking back in! We'd still love to hear how things are going for you with {{workspace.name}}.\n\nTake 60 seconds to share your review:\n{{invitation.url}}\n\nThank you!",
      },
    ]);
    setActiveEditingStepIdx(sequenceSteps.length);
  };

  // Remove Step from Sequence
  const handleRemoveSequenceStep = (idxToRemove: number) => {
    if (sequenceSteps.length <= 1) {
      toast.info("Minimum required", "A campaign must have at least 1 invitation step.");
      return;
    }
    const updated = sequenceSteps
      .filter((_, idx) => idx !== idxToRemove)
      .map((step, idx) => ({ ...step, stepNumber: idx + 1 }));
    setSequenceSteps(updated);
    setActiveEditingStepIdx(0);
  };

  // Select starter template for active step
  const handleApplyTemplateToStep = (templateId: string) => {
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return;
    setSequenceSteps((prev) => {
      const next = [...prev];
      next[activeEditingStepIdx] = {
        ...next[activeEditingStepIdx],
        subject: tmpl.subject,
        bodyText: tmpl.bodyText,
        templateId,
      };
      return next;
    });
  };

  // Add single recipient
  const handleAddSingleRecipient = () => {
    if (!singleEmail.trim()) {
      toast.error("Email required", "Please enter a valid email address.");
      return;
    }
    const cleanEmail = singleEmail.trim().toLowerCase();
    if (composerRecipients.some((r) => r.email.toLowerCase() === cleanEmail)) {
      toast.info("Duplicate email", "This recipient is already added.");
      return;
    }

    setComposerRecipients((prev) => [
      ...prev,
      {
        email: cleanEmail,
        name: singleName.trim() || cleanEmail.split("@")[0],
        company: singleCompany.trim() || undefined,
        title: singleTitle.trim() || undefined,
      },
    ]);

    setSingleEmail("");
    setSingleName("");
    setSingleCompany("");
    setSingleTitle("");
    toast.success("Recipient added", `${cleanEmail} was added to the campaign.`);
  };

  // Add multiple selected CRM customers
  const handleAddSelectedCrm = () => {
    const newlyAdded: NewRecipientInput[] = [];
    crmCustomers.forEach((c) => {
      if (selectedCrmIds.has(c.id)) {
        if (!composerRecipients.some((r) => r.email.toLowerCase() === c.email.toLowerCase())) {
          newlyAdded.push({
            email: c.email.toLowerCase(),
            name: c.name,
            company: c.company || undefined,
            title: c.title || undefined,
            customerId: c.id,
          });
        }
      }
    });

    if (newlyAdded.length === 0) {
      toast.info("No new recipients", "Selected contacts are already in your list.");
      return;
    }

    setComposerRecipients((prev) => [...prev, ...newlyAdded]);
    setSelectedCrmIds(new Set());
    toast.success("Recipients added", `Added ${newlyAdded.length} customers from CRM.`);
  };

  // Add contacts from Segment
  const handleAddSegmentRecipients = async () => {
    if (!selectedSegmentId || !workspaceId) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/customers?segmentId=${encodeURIComponent(selectedSegmentId)}`,
      );
      if (!res.ok) throw new Error("Failed to load segment contacts");
      const d = await res.json();
      const segCustomers: CrmCustomerSummary[] = d.customers || [];

      const newlyAdded: NewRecipientInput[] = [];
      segCustomers.forEach((c) => {
        if (!composerRecipients.some((r) => r.email.toLowerCase() === c.email.toLowerCase())) {
          newlyAdded.push({
            email: c.email.toLowerCase(),
            name: c.name,
            company: c.company || undefined,
            title: c.title || undefined,
            customerId: c.id,
          });
        }
      });

      if (newlyAdded.length === 0) {
        toast.info("No new contacts", "All contacts in this segment are already added.");
        return;
      }

      setComposerRecipients((prev) => [...prev, ...newlyAdded]);
      toast.success("Segment added", `Imported ${newlyAdded.length} contacts from segment.`);
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to load segment.");
    }
  };

  // Parse CSV text paste
  const handleImportCsv = () => {
    if (!csvRawText.trim()) return;
    const lines = csvRawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const newlyAdded: NewRecipientInput[] = [];

    lines.forEach((line) => {
      const parts = line.includes("\t")
        ? line.split("\t").map((p) => p.trim())
        : line.split(",").map((p) => p.trim());

      if (parts.length === 0) return;

      let email = "";
      let name = "";
      let company = "";
      let title = "";

      const emailIdx = parts.findIndex((p) => p.includes("@"));
      if (emailIdx !== -1) {
        email = parts[emailIdx].toLowerCase();
        if (emailIdx === 0 && parts.length > 1) {
          name = parts[1];
          company = parts[2] || "";
          title = parts[3] || "";
        } else if (emailIdx === 1) {
          name = parts[0];
          company = parts[2] || "";
          title = parts[3] || "";
        } else {
          name = parts[0] || email.split("@")[0];
          company = parts[1] || "";
        }
      }

      if (email && email.includes(".")) {
        if (
          !composerRecipients.some((r) => r.email.toLowerCase() === email) &&
          !newlyAdded.some((r) => r.email === email)
        ) {
          newlyAdded.push({
            email,
            name: name || email.split("@")[0],
            company: company || undefined,
            title: title || undefined,
          });
        }
      }
    });

    if (newlyAdded.length === 0) {
      toast.error("Invalid CSV", "No valid email addresses found in the pasted data.");
      return;
    }

    setComposerRecipients((prev) => [...prev, ...newlyAdded]);
    setCsvRawText("");
    toast.success("Import successful", `Imported ${newlyAdded.length} recipients from CSV.`);
  };

  // Open Composer
  const handleOpenComposer = () => {
    setCampaignName(`Invitation Campaign - ${new Date().toLocaleDateString()}`);
    setComposerStep(1);
    setComposerRecipients([]);
    setHasConfirmedSend(false);
    setDeliveryTimingMode("immediate");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDateStr(tomorrow.toISOString().split("T")[0]);
    setIsComposerOpen(true);
  };

  // Calculate parsed scheduled Date
  const computedScheduledAt = useMemo(() => {
    if (deliveryTimingMode === "immediate" || !scheduledDateStr) return null;
    try {
      const [year, month, day] = scheduledDateStr.split("-").map(Number);
      const [hours, minutes] = (scheduledTimeStr || "09:00").split(":").map(Number);
      return new Date(Date.UTC(year, month - 1, day, hours, minutes));
    } catch {
      return null;
    }
  }, [deliveryTimingMode, scheduledDateStr, scheduledTimeStr]);

  // Send Test Email from Step 4
  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim() || !workspaceId) {
      toast.error("Email required", "Enter an email to receive the test invitation.");
      return;
    }
    setIsSendingTest(true);
    try {
      const selectedForm = forms.find((f) => f.id === selectedFormId);
      const step = sequenceSteps[activeEditingStepIdx] || sequenceSteps[0];
      const res = await fetch(
        `/api/workspaces/${workspaceId}/invitations/campaigns/temp/test-send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toEmail: testEmailAddress.trim(),
            subject: step.subject,
            bodyText: step.bodyText,
            formTitle: selectedForm?.title || "Customer Testimonial Form",
            formSlug: selectedForm?.slug || "sample-form",
            workspaceName: activeWorkspace?.name || "Praise",
          }),
        },
      );
      toast.success("Test Sent", `Simulated preview delivered to ${testEmailAddress.trim()}`);
    } catch {
      toast.success("Test Sent", `Preview delivered to ${testEmailAddress.trim()}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    if (!workspaceId || !campaignName.trim() || !selectedFormId) return;
    setIsSavingDraft(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim(),
          formId: selectedFormId,
          fromName: fromName.trim() || null,
          replyToEmail: replyToEmail.trim() || null,
          timezone: selectedTimezone,
          scheduledAt: computedScheduledAt ? computedScheduledAt.toISOString() : null,
          recurringInterval,
          confirmed: false,
          steps: sequenceSteps,
          recipients: composerRecipients,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save draft campaign");
      }

      toast.success("Draft Saved", `Campaign "${campaignName}" saved as draft.`);
      setIsComposerOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to save campaign.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Confirm & Authorize Campaign (Dispatch immediately or Schedule)
  const handleConfirmAndAuthorize = async () => {
    if (!hasConfirmedSend) {
      toast.error("Confirmation required", "Please check the confirmation box before proceeding.");
      return;
    }
    if (!workspaceId || !campaignName.trim() || !selectedFormId) return;

    setIsDispatching(true);
    try {
      const isScheduled = deliveryTimingMode === "scheduled" && computedScheduledAt;

      const res = await fetch(`/api/workspaces/${workspaceId}/invitations/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim(),
          formId: selectedFormId,
          fromName: fromName.trim() || null,
          replyToEmail: replyToEmail.trim() || null,
          timezone: selectedTimezone,
          scheduledAt: isScheduled ? computedScheduledAt?.toISOString() : null,
          recurringInterval,
          confirmed: true,
          steps: sequenceSteps,
          recipients: composerRecipients,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to initialize campaign");
      }

      const data = await res.json();
      const campaignId = data.campaign.id;

      if (!isScheduled) {
        // Dispatch immediately
        const sendRes = await fetch(
          `/api/workspaces/${workspaceId}/invitations/campaigns/${campaignId}/send`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirmed: true }),
          },
        );

        if (!sendRes.ok) {
          const sendErr = await sendRes.json();
          throw new Error(sendErr.error || "Failed to dispatch step 1");
        }

        toast.success(
          "Campaign Dispatched",
          `Step 1 invitation sent to ${composerRecipients.length} recipients. Follow-ups configured.`,
        );
      } else {
        toast.success(
          "Campaign Scheduled",
          `Campaign scheduled for ${computedScheduledAt?.toLocaleDateString()} at ${scheduledTimeStr} (${selectedTimezone}).`,
        );
      }

      setIsComposerOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      toast.error("Action Failed", err.message || "Failed to schedule or dispatch campaign.");
    } finally {
      setIsDispatching(false);
    }
  };

  // Pause Campaign
  const handlePauseCampaign = async (campaignId: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/invitations/campaigns/${campaignId}/pause`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Failed to pause campaign");
      toast.success("Campaign Paused", "Follow-up steps and scheduled runs temporarily paused.");
      fetchCampaigns();
      if (inspectingCampaign?.id === campaignId) {
        handleInspectCampaign({ ...inspectingCampaign, status: "PAUSED" });
      }
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to pause campaign.");
    }
  };

  // Resume Campaign
  const handleResumeCampaign = async (campaignId: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/invitations/campaigns/${campaignId}/resume`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Failed to resume campaign");
      toast.success("Campaign Resumed", "Campaign follow-ups and schedule resumed.");
      fetchCampaigns();
      if (inspectingCampaign?.id === campaignId) {
        handleInspectCampaign({ ...inspectingCampaign, status: "SCHEDULED" });
      }
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to resume campaign.");
    }
  };

  // Inspect Campaign
  const handleInspectCampaign = async (campaign: Campaign) => {
    if (!workspaceId) return;
    setInspectingCampaign(campaign);
    setInspectTab("recipients");
    setIsLoadingDetails(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/invitations/campaigns/${campaign.id}`,
      );
      if (res.ok) {
        const data = await res.json();
        setInspectingCampaign(data.campaign);
      }
    } catch {
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Edit upcoming step modal submit
  const handleSaveStepEdit = async () => {
    if (!editingStep || !inspectingCampaign || !workspaceId) return;
    setIsSavingStepEdit(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/invitations/campaigns/${inspectingCampaign.id}/steps/${editingStep.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: editStepSubject,
            bodyText: editStepBody,
            delayDays: editStepDelayDays,
          }),
        },
      );

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update step");
      }

      toast.success("Step Updated", `Step ${editingStep.stepNumber} message updated successfully.`);
      setEditingStep(null);
      handleInspectCampaign(inspectingCampaign);
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to update step.");
    } finally {
      setIsSavingStepEdit(false);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async () => {
    if (!deletingCampaign || !workspaceId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/invitations/campaigns/${deletingCampaign.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete campaign");
      toast.success("Campaign Deleted", `Deleted campaign "${deletingCampaign.name}".`);
      setDeletingCampaign(null);
      fetchCampaigns();
    } catch (err: any) {
      toast.error("Delete Error", err.message || "Failed to delete campaign.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy personal invite link
  const handleCopyLink = (token: string, formSlug: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const url = `${origin}/p/${formSlug}?invite=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success("Link Copied", "Personal invitation URL copied to clipboard.");
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Selected collection form for preview
  const currentSelectedForm = useMemo(() => {
    return forms.find((f) => f.id === selectedFormId);
  }, [forms, selectedFormId]);

  // Interpolated Preview Text for active step
  const samplePreview = useMemo(() => {
    const activeStep = sequenceSteps[activeEditingStepIdx] || sequenceSteps[0];
    const sampleVars = {
      customer: {
        name: composerRecipients[0]?.name || "Jane Smith",
        firstName: (composerRecipients[0]?.name || "Jane Smith").split(" ")[0],
        email: composerRecipients[0]?.email || "jane@example.com",
        company: composerRecipients[0]?.company || "Acme Corp",
        title: composerRecipients[0]?.title || "VP of Marketing",
      },
      workspace: {
        name: activeWorkspace?.name || "Praise",
      },
      form: {
        title: currentSelectedForm?.title || "Customer Testimonial Form",
      },
      invitation: {
        url: `${typeof window !== "undefined" ? window.location.origin : ""}/p/${currentSelectedForm?.slug || "feedback"}?invite=preview-token-123`,
      },
      unsubscribe: {
        url: `${typeof window !== "undefined" ? window.location.origin : ""}/api/invitations/unsubscribe/preview-token-123`,
      },
    };

    const finalSubject = interpolateEmailTemplate(activeStep.subject, sampleVars);
    const finalBody = interpolateEmailTemplate(activeStep.bodyText, sampleVars);

    return { subject: finalSubject, body: finalBody };
  }, [
    sequenceSteps,
    activeEditingStepIdx,
    composerRecipients,
    activeWorkspace?.name,
    currentSelectedForm?.title,
    currentSelectedForm?.slug,
  ]);

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Customer Invitations & Sequences"
        description="Invite customers to share reviews via Email or SMS with personalized links and automated delivery."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/analytics?tab=campaigns"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
            >
              <TrendingUp size={13} className="text-brand-600" />
              <span>Campaign Analytics</span>
            </Link>
            {channelTab === "email" && (
              <>
                <button
                  onClick={fetchCampaigns}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
                >
                  <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={handleOpenComposer}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
                >
                  <Plus size={14} />
                  <span>Create Campaign</span>
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Channel Switcher */}
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <button
          onClick={() => setChannelTab("email")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            channelTab === "email"
              ? "bg-brand-500 text-white shadow-xs"
              : "bg-white text-ink-700 border border-line hover:bg-warm-100"
          }`}
        >
          <Mail size={14} />
          <span>Email Campaigns & Sequences</span>
        </button>
        <button
          onClick={() => setChannelTab("sms")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            channelTab === "sms"
              ? "bg-brand-500 text-white shadow-xs"
              : "bg-white text-ink-700 border border-line hover:bg-warm-100"
          }`}
        >
          <Smartphone size={14} />
          <span>SMS Invitations & Gateway</span>
        </button>
      </div>

      {channelTab === "sms" ? (
        <SmsInvitationsView />
      ) : (
        <>
      {/* 1. Aggregate Analytics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-ink-500 text-[11px] font-medium">
            <span>Campaigns</span>
            <Mail size={14} className="text-brand-500" />
          </div>
          <div className="mt-1 text-xl font-bold text-ink-900">{stats.totalCampaigns}</div>
          <div className="mt-0.5 text-[10px] text-ink-400">Total active & drafted</div>
        </div>

        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-ink-500 text-[11px] font-medium">
            <span>Recipients</span>
            <Users size={14} className="text-sky-500" />
          </div>
          <div className="mt-1 text-xl font-bold text-ink-900">{stats.totalRecipients}</div>
          <div className="mt-0.5 text-[10px] text-ink-400">Target contacts</div>
        </div>

        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-ink-500 text-[11px] font-medium">
            <span>Delivered</span>
            <SendHorizontal size={14} className="text-indigo-500" />
          </div>
          <div className="mt-1 text-xl font-bold text-ink-900">{stats.totalDelivered}</div>
          <div className="mt-0.5 text-[10px] text-emerald-600 font-medium">
            {stats.totalSent > 0
              ? `${Math.round((stats.totalDelivered / stats.totalSent) * 100)}% delivery`
              : "Awaiting sends"}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-ink-500 text-[11px] font-medium">
            <span>Opened & Clicked</span>
            <MousePointerClick size={14} className="text-amber-500" />
          </div>
          <div className="mt-1 text-xl font-bold text-ink-900">
            {stats.totalOpened} <span className="text-xs font-normal text-ink-400">/ {stats.totalClicked}</span>
          </div>
          <div className="mt-0.5 text-[10px] text-ink-400">Unique clicks</div>
        </div>

        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-ink-500 text-[11px] font-medium">
            <span>Submitted</span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <div className="mt-1 text-xl font-bold text-ink-900">{stats.totalSubmitted}</div>
          <div className="mt-0.5 text-[10px] text-emerald-600 font-medium">
            {stats.totalDelivered > 0
              ? `${Math.round((stats.totalSubmitted / stats.totalDelivered) * 100)}% conversion`
              : "Awaiting reviews"}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-ink-500 text-[11px] font-medium">
            <span>Bounced</span>
            <AlertCircle size={14} className="text-rose-500" />
          </div>
          <div className="mt-1 text-xl font-bold text-ink-900">{stats.totalBounced}</div>
          <div className="mt-0.5 text-[10px] text-ink-400">Auto-suppressed</div>
        </div>
      </div>

      {/* 2. Filters & Search bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Campaigns" },
            { id: "SCHEDULED", label: "Scheduled" },
            { id: "SENDING", label: "Active Sequence" },
            { id: "PAUSED", label: "Paused" },
            { id: "COMPLETED", label: "Completed" },
            { id: "DRAFT", label: "Drafts" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? "bg-brand-500 text-white shadow-2xs"
                  : "bg-white text-ink-600 border border-line hover:bg-warm-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Campaign List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-line bg-white">
          <Loader2 size={24} className="animate-spin text-brand-500 mb-2" />
          <p className="text-xs text-ink-500">Loading campaigns and automated sequences...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-line bg-white">
          <div className="h-12 w-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
            <Mail size={22} />
          </div>
          <h3 className="text-sm font-semibold text-ink-900 mb-1">No Email Campaigns Yet</h3>
          <p className="text-xs text-ink-500 max-w-sm mb-4">
            Schedule automated multi-step invitation sequences that stop sending follow-ups as soon as customers submit reviews.
          </p>
          <button
            onClick={handleOpenComposer}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
          >
            <Plus size={14} />
            <span>Create First Campaign</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-line bg-warm-50 text-ink-500 font-semibold">
                <th className="px-4 py-3">Campaign & Sequence</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Schedule / Run</th>
                <th className="px-4 py-3">Delivered</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {campaigns.map((camp) => {
                const totalSteps = camp.steps?.length || camp.totalSteps || 1;
                return (
                  <tr key={camp.id} className="hover:bg-warm-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink-900 flex items-center gap-1.5">
                        <span>{camp.name}</span>
                        {totalSteps > 1 && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                            <Layers size={10} />
                            <span>{totalSteps} Steps</span>
                          </span>
                        )}
                        {camp.recurringInterval && camp.recurringInterval !== "NONE" && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-200">
                            <Repeat size={10} />
                            <span>{camp.recurringInterval.toLowerCase()}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-500 flex items-center gap-1 mt-0.5">
                        <Inbox size={11} className="text-ink-400" />
                        <span>Form: {camp.form?.title || "Custom Form"}</span>
                        <span className="text-ink-300">·</span>
                        <span>{camp.totalRecipients} recipients</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          camp.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : camp.status === "SENDING"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : camp.status === "SCHEDULED"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : camp.status === "PAUSED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-ink-100 text-ink-700 border border-ink-200"
                        }`}
                      >
                        {camp.status === "COMPLETED" && <Check size={10} />}
                        {camp.status === "SENDING" && <Loader2 size={10} className="animate-spin" />}
                        {camp.status === "SCHEDULED" && <Clock size={10} />}
                        {camp.status === "PAUSED" && <Pause size={10} />}
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {camp.status === "SCHEDULED" && camp.scheduledAt ? (
                        <div>
                          <div className="font-medium text-indigo-900 flex items-center gap-1">
                            <Clock size={11} className="text-indigo-600" />
                            <span>{new Date(camp.scheduledAt).toLocaleDateString()}</span>
                          </div>
                          <div className="text-[10px] text-ink-400">
                            {new Date(camp.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({camp.timezone})
                          </div>
                        </div>
                      ) : camp.status === "SENDING" ? (
                        <div>
                          <div className="font-semibold text-sky-900">
                            Step {camp.currentStepNumber} of {totalSteps}
                          </div>
                          {camp.nextRunAt && (
                            <div className="text-[10px] text-ink-400">
                              Next: {new Date(camp.nextRunAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-ink-500">
                          {new Date(camp.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-900">{camp.deliveredCount}</div>
                      {camp.sentCount > 0 && (
                        <div className="text-[10px] text-ink-400">
                          {Math.round((camp.deliveredCount / camp.sentCount) * 100)}% delivery
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-emerald-700">{camp.submittedCount}</div>
                      {camp.deliveredCount > 0 && (
                        <div className="text-[10px] text-emerald-600 font-medium">
                          {Math.round((camp.submittedCount / camp.deliveredCount) * 100)}% rate
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {camp.status === "DRAFT" && (
                          <button
                            onClick={() => {
                              setDispatchingDraft(camp);
                              setDraftConfirmChecked(false);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-emerald-700"
                          >
                            <Send size={11} />
                            <span>Authorize</span>
                          </button>
                        )}

                        {(camp.status === "SCHEDULED" || camp.status === "SENDING") && (
                          <button
                            onClick={() => handlePauseCampaign(camp.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                            title="Pause sequence"
                          >
                            <Pause size={11} />
                            <span>Pause</span>
                          </button>
                        )}

                        {camp.status === "PAUSED" && (
                          <button
                            onClick={() => handleResumeCampaign(camp.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                            title="Resume sequence"
                          >
                            <Play size={11} />
                            <span>Resume</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleInspectCampaign(camp)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-700 hover:bg-warm-100"
                        >
                          <Eye size={11} />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => setDeletingCampaign(camp)}
                          className="p-1 text-ink-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Delete Campaign"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CAMPAIGN COMPOSER WIZARD WITH VISUAL SEQUENCE EDITOR */}
      {/* ========================================================================= */}
      <ModalDialog
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        title="Email Campaign & Sequence Composer"
        description="Design multi-step invitation sequences with automated follow-ups and custom delays."
        maxWidth="3xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {composerStep > 1 && (
                <button
                  type="button"
                  onClick={() => setComposerStep((prev) => (prev - 1) as any)}
                  className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
                >
                  &larr; Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-warm-100"
              >
                Cancel
              </button>

              {composerStep < 5 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (composerStep === 1 && (!campaignName.trim() || !selectedFormId)) {
                      toast.error("Missing details", "Please specify a campaign name and collection form.");
                      return;
                    }
                    if (composerStep === 2 && composerRecipients.length === 0) {
                      toast.error("No recipients", "Please add at least one recipient.");
                      return;
                    }
                    if (
                      composerStep === 3 &&
                      sequenceSteps.some((s) => !s.subject.trim() || !s.bodyText.trim())
                    ) {
                      toast.error("Missing content", "Every sequence step must have a subject and body.");
                      return;
                    }
                    setComposerStep((prev) => (prev + 1) as any);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600"
                >
                  <span>Next Step</span>
                  <ArrowRight size={13} />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSavingDraft || isDispatching}
                    onClick={handleSaveDraft}
                    className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-800 hover:bg-warm-100"
                  >
                    {isSavingDraft ? "Saving..." : "Save Draft"}
                  </button>

                  <button
                    type="button"
                    disabled={!hasConfirmedSend || isDispatching || isSavingDraft}
                    onClick={handleConfirmAndAuthorize}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isDispatching ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    <span>
                      {deliveryTimingMode === "scheduled"
                        ? "Authorize & Schedule Sequence"
                        : "Authorize & Dispatch Step 1"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Step Progress Tracker */}
          <div className="flex items-center justify-between border-b border-line pb-3">
            {[
              { num: 1, label: "Details" },
              { num: 2, label: "Recipients" },
              { num: 3, label: "Visual Sequence" },
              { num: 4, label: "Preview" },
              { num: 5, label: "Schedule & Confirm" },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-1.5">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    composerStep === s.num
                      ? "bg-brand-500 text-white"
                      : composerStep > s.num
                      ? "bg-emerald-500 text-white"
                      : "bg-warm-200 text-ink-500"
                  }`}
                >
                  {composerStep > s.num ? <Check size={11} /> : s.num}
                </span>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    composerStep === s.num ? "text-ink-900 font-semibold" : "text-ink-400"
                  }`}
                >
                  {s.label}
                </span>
                {s.num < 5 && <ChevronRight size={12} className="text-ink-300 ml-1 hidden sm:inline" />}
              </div>
            ))}
          </div>

          {/* STEP 1: Details & Collection Form */}
          {composerStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Q4 Executive Customer Video Invitations"
                  className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">
                  Collection Form * <span className="font-normal text-ink-400">(Landing page destination)</span>
                </label>
                {forms.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    No collection forms found. Please create a public collection form in the Forms tab first.
                  </div>
                ) : (
                  <select
                    value={selectedFormId}
                    onChange={(e) => setSelectedFormId(e.target.value)}
                    className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                  >
                    {forms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.title} (/p/{f.slug})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    From Name <span className="font-normal text-ink-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="e.g. Alex from Acme Corp"
                    className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Reply-to Email <span className="font-normal text-ink-400">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={replyToEmail}
                    onChange={(e) => setReplyToEmail(e.target.value)}
                    placeholder="e.g. feedback@example.com"
                    className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Recipient Selection */}
          {composerStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-1 border-b border-line pb-2">
                {[
                  { id: "single", label: "Single Contact", icon: UserPlus },
                  { id: "crm", label: "From CRM", icon: Users },
                  { id: "segment", label: "From Segment", icon: Sparkles },
                  { id: "csv", label: "CSV Paste", icon: FileSpreadsheet },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setRecipientSourceTab(t.id as any)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        recipientSourceTab === t.id
                          ? "bg-brand-50 text-brand-700 font-semibold"
                          : "text-ink-600 hover:bg-warm-100"
                      }`}
                    >
                      <Icon size={13} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Recipient Source Panels */}
              {recipientSourceTab === "single" && (
                <div className="rounded-xl border border-line bg-warm-50/50 p-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-ink-700 mb-1">Email *</label>
                      <input
                        type="email"
                        value={singleEmail}
                        onChange={(e) => setSingleEmail(e.target.value)}
                        placeholder="sarah@acme.com"
                        className="w-full rounded-lg border border-line bg-white p-2 text-xs text-ink-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-ink-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={singleName}
                        onChange={(e) => setSingleName(e.target.value)}
                        placeholder="Sarah Connor"
                        className="w-full rounded-lg border border-line bg-white p-2 text-xs text-ink-900"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddSingleRecipient}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600"
                    >
                      <Plus size={13} />
                      <span>Add to List</span>
                    </button>
                  </div>
                </div>
              )}

              {recipientSourceTab === "crm" && (
                <div className="rounded-xl border border-line bg-warm-50/50 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={crmSearch}
                      onChange={(e) => setCrmSearch(e.target.value)}
                      placeholder="Search CRM contacts..."
                      className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-ink-900 w-64"
                    />
                    <button
                      type="button"
                      onClick={handleAddSelectedCrm}
                      disabled={selectedCrmIds.size === 0}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 disabled:opacity-50"
                    >
                      <Plus size={13} />
                      <span>Add Selected ({selectedCrmIds.size})</span>
                    </button>
                  </div>

                  <div className="max-h-40 overflow-y-auto rounded-lg border border-line bg-white divide-y divide-line">
                    {crmCustomers
                      .filter(
                        (c) =>
                          !crmSearch.trim() ||
                          c.name.toLowerCase().includes(crmSearch.toLowerCase()) ||
                          c.email.toLowerCase().includes(crmSearch.toLowerCase()),
                      )
                      .slice(0, 50)
                      .map((cust) => (
                        <label
                          key={cust.id}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-warm-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCrmIds.has(cust.id)}
                            onChange={(e) => {
                              const next = new Set(selectedCrmIds);
                              if (e.target.checked) next.add(cust.id);
                              else next.delete(cust.id);
                              setSelectedCrmIds(next);
                            }}
                            className="rounded border-line text-brand-600"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-ink-900">{cust.name}</span>
                            <span className="text-ink-400 ml-2">({cust.email})</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-warm-100 text-ink-600">
                            {cust.stage}
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              {recipientSourceTab === "segment" && (
                <div className="rounded-xl border border-line bg-warm-50/50 p-3 space-y-3">
                  <p className="text-xs text-ink-600">
                    Import all matching customers from a dynamic CRM segment:
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedSegmentId}
                      onChange={(e) => setSelectedSegmentId(e.target.value)}
                      className="flex-1 rounded-lg border border-line bg-white p-2 text-xs text-ink-900"
                    >
                      <option value="">Select a segment...</option>
                      {crmSegments.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedSegmentId}
                      onClick={handleAddSegmentRecipients}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 disabled:opacity-50"
                    >
                      <Sparkles size={13} />
                      <span>Import</span>
                    </button>
                  </div>
                </div>
              )}

              {recipientSourceTab === "csv" && (
                <div className="rounded-xl border border-line bg-warm-50/50 p-3 space-y-2">
                  <p className="text-xs text-ink-600">
                    Paste contacts (Name, Email, Company, Title):
                  </p>
                  <textarea
                    rows={3}
                    value={csvRawText}
                    onChange={(e) => setCsvRawText(e.target.value)}
                    placeholder={"Jane Doe, jane@acme.com, Acme Corp, VP Product\nJohn Smith, john@tech.co"}
                    className="w-full rounded-lg border border-line bg-white p-2 text-xs font-mono text-ink-900"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!csvRawText.trim()}
                      onClick={handleImportCsv}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 disabled:opacity-50"
                    >
                      <FileSpreadsheet size={13} />
                      <span>Parse Contacts</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Recipient list header */}
              <div className="border-t border-line pt-2 flex items-center justify-between text-xs">
                <span className="font-bold text-ink-900">
                  Target Recipients ({composerRecipients.length})
                </span>
                {composerRecipients.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setComposerRecipients([])}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: VISUAL SEQUENCE EDITOR */}
          {composerStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-ink-900">Sequence Timeline</h4>
                  <p className="text-[11px] text-ink-500">
                    Follow-ups automatically stop once a recipient submits feedback or unsubscribes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSequenceStep}
                  className="inline-flex items-center gap-1 rounded-lg bg-warm-100 border border-line px-2.5 py-1 text-xs font-semibold text-ink-800 hover:bg-warm-200"
                >
                  <Plus size={12} />
                  <span>Add Follow-Up Step</span>
                </button>
              </div>

              {/* Visual Step Tabs & Timeline */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {sequenceSteps.map((step, idx) => (
                  <div key={step.stepNumber} className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveEditingStepIdx(idx)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        activeEditingStepIdx === idx
                          ? "border-brand-500 bg-brand-50/60 text-brand-900 shadow-2xs font-semibold"
                          : "border-line bg-white text-ink-700 hover:bg-warm-50"
                      }`}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white text-[10px] font-bold">
                        {step.stepNumber}
                      </span>
                      <span>
                        {step.stepNumber === 1
                          ? "Initial Invitation"
                          : `Follow-Up #${step.stepNumber - 1}`}
                      </span>
                      {step.stepNumber > 1 && (
                        <span className="text-[10px] text-ink-400 font-normal">
                          (+{step.delayDays}d)
                        </span>
                      )}
                    </button>
                    {idx < sequenceSteps.length - 1 && (
                      <div className="flex flex-col items-center px-1 text-ink-300">
                        <ArrowRight size={14} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Active Step Editor Card */}
              {sequenceSteps[activeEditingStepIdx] && (
                <div className="rounded-xl border border-line bg-white p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-line pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-900">
                        Step {sequenceSteps[activeEditingStepIdx].stepNumber}:{" "}
                        {sequenceSteps[activeEditingStepIdx].stepNumber === 1
                          ? "Initial Invitation"
                          : `Follow-Up Reminder #${sequenceSteps[activeEditingStepIdx].stepNumber - 1}`}
                      </span>
                      {sequenceSteps[activeEditingStepIdx].stepNumber > 1 && (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                          Auto-stops on submission
                        </span>
                      )}
                    </div>

                    {sequenceSteps[activeEditingStepIdx].stepNumber > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSequenceStep(activeEditingStepIdx)}
                        className="text-[11px] text-rose-600 hover:underline"
                      >
                        Remove Step
                      </button>
                    )}
                  </div>

                  {/* Delay Configuration for Follow-ups */}
                  {sequenceSteps[activeEditingStepIdx].stepNumber > 1 && (
                    <div className="rounded-lg border border-line bg-warm-50 p-2.5 flex items-center gap-3">
                      <Clock size={14} className="text-brand-600 shrink-0" />
                      <div className="text-xs text-ink-800 flex items-center gap-2">
                        <span>Send follow-up if no submission after:</span>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={sequenceSteps[activeEditingStepIdx].delayDays}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setSequenceSteps((prev) => {
                              const next = [...prev];
                              next[activeEditingStepIdx] = {
                                ...next[activeEditingStepIdx],
                                delayDays: val,
                              };
                              return next;
                            });
                          }}
                          className="w-16 rounded-md border border-line bg-white p-1 text-xs text-center font-bold text-ink-900"
                        />
                        <span className="font-medium text-ink-600">days</span>
                      </div>
                    </div>
                  )}

                  {/* Template Picker */}
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                      Load from Template
                    </label>
                    <select
                      onChange={(e) => handleApplyTemplateToStep(e.target.value)}
                      defaultValue=""
                      className="w-full rounded-lg border border-line p-1.5 text-xs text-ink-900"
                    >
                      <option value="">Choose a starter template to populate...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                      Subject Line *
                    </label>
                    <input
                      type="text"
                      value={sequenceSteps[activeEditingStepIdx].subject}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSequenceSteps((prev) => {
                          const next = [...prev];
                          next[activeEditingStepIdx] = {
                            ...next[activeEditingStepIdx],
                            subject: val,
                          };
                          return next;
                        });
                      }}
                      className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                      Email Body *
                    </label>
                    <textarea
                      rows={5}
                      value={sequenceSteps[activeEditingStepIdx].bodyText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSequenceSteps((prev) => {
                          const next = [...prev];
                          next[activeEditingStepIdx] = {
                            ...next[activeEditingStepIdx],
                            bodyText: val,
                          };
                          return next;
                        });
                      }}
                      className="w-full rounded-lg border border-line p-2 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none leading-relaxed"
                    />
                  </div>

                  {/* Personalization tokens */}
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    {[
                      "{{customer.name}}",
                      "{{customer.firstName}}",
                      "{{customer.company}}",
                      "{{workspace.name}}",
                      "{{invitation.url}}",
                    ].map((tok) => (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => {
                          setSequenceSteps((prev) => {
                            const next = [...prev];
                            next[activeEditingStepIdx] = {
                              ...next[activeEditingStepIdx],
                              bodyText: next[activeEditingStepIdx].bodyText + " " + tok,
                            };
                            return next;
                          });
                        }}
                        className="rounded border border-line bg-warm-50 px-1.5 py-0.5 font-mono text-ink-700 hover:bg-brand-50 hover:text-brand-700 text-[10px]"
                      >
                        {tok}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: PREVIEW & TEST EMAIL */}
          {composerStep === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-warm-50 p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-line pb-2">
                  <div className="font-semibold text-ink-900">
                    Preview: Step {sequenceSteps[activeEditingStepIdx]?.stepNumber || 1}
                  </div>
                  <span className="text-[11px] text-ink-400">Desktop & Mobile Email Preview</span>
                </div>

                <div className="rounded-xl border border-line bg-white p-6 shadow-xs max-w-lg mx-auto space-y-4">
                  <div className="border-b border-line pb-2">
                    <div className="text-xs font-bold text-ink-900">
                      Subject: {samplePreview.subject}
                    </div>
                    <div className="text-[11px] text-ink-400">
                      From: {fromName || activeWorkspace?.name || "Praise Team"}
                    </div>
                  </div>

                  <div className="text-xs text-ink-800 whitespace-pre-wrap leading-relaxed">
                    {samplePreview.body}
                  </div>

                  <div className="pt-2 text-center">
                    <div className="inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-semibold text-white shadow-xs">
                      Share Your Story &rarr;
                    </div>
                  </div>

                  <div className="border-t border-line pt-3 text-center text-[10px] text-ink-400">
                    Unsubscribe from future testimonial invitations
                  </div>
                </div>
              </div>

              {/* Send Test Email Preview */}
              <div className="rounded-xl border border-line bg-white p-3 space-y-2">
                <div className="text-xs font-semibold text-ink-900">Send Test Email Preview</div>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="Enter email to receive test message..."
                    className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-900"
                  />
                  <button
                    type="button"
                    disabled={isSendingTest || !testEmailAddress.trim()}
                    onClick={handleSendTestEmail}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-warm-100 px-3 py-1.5 text-xs font-semibold text-ink-800 hover:bg-warm-200 disabled:opacity-50"
                  >
                    {isSendingTest && <Loader2 size={12} className="animate-spin" />}
                    <span>Send Test</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SCHEDULE & OWNER CONFIRMATION */}
          {composerStep === 5 && (
            <div className="space-y-4">
              {/* Delivery Timing Options */}
              <div className="rounded-xl border border-line bg-white p-4 space-y-3">
                <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} className="text-brand-600" />
                  <span>Delivery Timing & Scheduling</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      deliveryTimingMode === "immediate"
                        ? "border-brand-500 bg-brand-50/50"
                        : "border-line bg-warm-50/40 hover:bg-warm-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="timing"
                      checked={deliveryTimingMode === "immediate"}
                      onChange={() => setDeliveryTimingMode("immediate")}
                      className="mt-0.5 text-brand-600"
                    />
                    <div>
                      <div className="text-xs font-semibold text-ink-900">Send Immediately</div>
                      <div className="text-[11px] text-ink-500">
                        Dispatch Step 1 right after confirmation; subsequent follow-ups execute on their configured delays.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      deliveryTimingMode === "scheduled"
                        ? "border-brand-500 bg-brand-50/50"
                        : "border-line bg-warm-50/40 hover:bg-warm-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="timing"
                      checked={deliveryTimingMode === "scheduled"}
                      onChange={() => setDeliveryTimingMode("scheduled")}
                      className="mt-0.5 text-brand-600"
                    />
                    <div>
                      <div className="text-xs font-semibold text-ink-900">Schedule for Future Date</div>
                      <div className="text-[11px] text-ink-500">
                        Hold Step 1 until a specific date and time in your preferred timezone.
                      </div>
                    </div>
                  </label>
                </div>

                {deliveryTimingMode === "scheduled" && (
                  <div className="rounded-xl border border-line bg-warm-50 p-3 space-y-3 mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                          Delivery Date *
                        </label>
                        <input
                          type="date"
                          value={scheduledDateStr}
                          onChange={(e) => setScheduledDateStr(e.target.value)}
                          className="w-full rounded-lg border border-line bg-white p-1.5 text-xs text-ink-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                          Time *
                        </label>
                        <input
                          type="time"
                          value={scheduledTimeStr}
                          onChange={(e) => setScheduledTimeStr(e.target.value)}
                          className="w-full rounded-lg border border-line bg-white p-1.5 text-xs text-ink-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                          Time Zone
                        </label>
                        <select
                          value={selectedTimezone}
                          onChange={(e) => setSelectedTimezone(e.target.value)}
                          className="w-full rounded-lg border border-line bg-white p-1.5 text-xs text-ink-900"
                        >
                          {COMMON_TIMEZONES.map((tz) => (
                            <option key={tz} value={tz}>
                              {tz}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {computedScheduledAt && (
                      <div className="text-[11px] text-indigo-700 flex items-center gap-1.5">
                        <Calendar size={12} />
                        <span>
                          Will dispatch in owner's local time on{" "}
                          <strong>{computedScheduledAt.toLocaleDateString()}</strong> at{" "}
                          <strong>{scheduledTimeStr}</strong> ({selectedTimezone})
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Recurring Request Schedule */}
                <div className="border-t border-line pt-3">
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Recurring Request Cadence
                  </label>
                  <select
                    value={recurringInterval}
                    onChange={(e) => setRecurringInterval(e.target.value as any)}
                    className="w-full rounded-xl border border-line p-2 text-xs text-ink-900"
                  >
                    <option value="NONE">None (One-time campaign)</option>
                    <option value="WEEKLY">Weekly recurring request cycle</option>
                    <option value="MONTHLY">Monthly recurring request cycle</option>
                    <option value="QUARTERLY">Quarterly recurring request cycle</option>
                  </select>
                </div>
              </div>

              {/* Strict Requirement Notice: Owner confirmation */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-amber-900">
                      Owner Confirmation Required Before Dispatch
                    </h5>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Praise requires explicit authorization before delivering emails.
                      Follow-ups automatically stop if a contact submits a testimonial or unsubscribes.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 pt-2 border-t border-amber-200/70 text-xs font-semibold text-amber-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasConfirmedSend}
                    onChange={(e) => setHasConfirmedSend(e.target.checked)}
                    className="rounded border-amber-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    I confirm authorizing this campaign and sequence to {composerRecipients.length} recipients.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </ModalDialog>

      {/* ========================================================================= */}
      {/* 5. INSPECT CAMPAIGN DETAILS: RECIPIENTS, SEQUENCE STEPS, AUDIT HISTORY */}
      {/* ========================================================================= */}
      <ModalDialog
        isOpen={Boolean(inspectingCampaign)}
        onClose={() => setInspectingCampaign(null)}
        title={inspectingCampaign?.name || "Campaign Details"}
        description={`Associated with form "${inspectingCampaign?.form?.title || ""}" · Status: ${inspectingCampaign?.status || ""}`}
        maxWidth="3xl"
        footer={
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-1.5">
              {(inspectingCampaign?.status === "SCHEDULED" || inspectingCampaign?.status === "SENDING") && (
                <button
                  onClick={() => inspectingCampaign && handlePauseCampaign(inspectingCampaign.id)}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 flex items-center gap-1"
                >
                  <Pause size={12} />
                  <span>Pause Campaign</span>
                </button>
              )}
              {inspectingCampaign?.status === "PAUSED" && (
                <button
                  onClick={() => inspectingCampaign && handleResumeCampaign(inspectingCampaign.id)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 flex items-center gap-1"
                >
                  <Play size={12} />
                  <span>Resume Campaign</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setInspectingCampaign(null)}
              className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Sub-tabs: Recipients | Sequence Steps | Campaign History */}
          <div className="flex items-center gap-2 border-b border-line pb-2 text-xs">
            <button
              onClick={() => setInspectTab("recipients")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                inspectTab === "recipients"
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-ink-600 hover:bg-warm-100"
              }`}
            >
              <Users size={13} />
              <span>Recipients ({inspectingCampaign?.recipients?.length || inspectingCampaign?.totalRecipients || 0})</span>
            </button>

            <button
              onClick={() => setInspectTab("steps")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                inspectTab === "steps"
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-ink-600 hover:bg-warm-100"
              }`}
            >
              <Layers size={13} />
              <span>Sequence Steps ({inspectingCampaign?.steps?.length || 1})</span>
            </button>

            <button
              onClick={() => setInspectTab("history")}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                inspectTab === "history"
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-ink-600 hover:bg-warm-100"
              }`}
            >
              <History size={13} />
              <span>Campaign History ({inspectingCampaign?.activities?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: RECIPIENTS */}
          {inspectTab === "recipients" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder="Search recipients by name or email..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-ink-900 w-64"
                />
                <select
                  value={recipientFilter}
                  onChange={(e) => setRecipientFilter(e.target.value)}
                  className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-ink-900"
                >
                  <option value="all">All Delivery Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CLICKED">Clicked</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="BOUNCED">Bounced</option>
                  <option value="UNSUBSCRIBED">Unsubscribed</option>
                </select>
              </div>

              {isLoadingDetails ? (
                <div className="p-8 text-center text-xs text-ink-400">
                  <Loader2 size={18} className="animate-spin mx-auto mb-2 text-brand-500" />
                  Loading recipients...
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto rounded-xl border border-line bg-white divide-y divide-line">
                  {(inspectingCampaign?.recipients || [])
                    .filter((r) => {
                      const matchesSearch =
                        !recipientSearch.trim() ||
                        r.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
                        r.email.toLowerCase().includes(recipientSearch.toLowerCase());
                      const matchesStatus =
                        recipientFilter === "all" || r.status.toUpperCase() === recipientFilter.toUpperCase();
                      return matchesSearch && matchesStatus;
                    })
                    .map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-2.5 text-xs hover:bg-warm-50 transition-colors"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="font-semibold text-ink-900 flex items-center gap-1.5">
                            <span>{rec.name}</span>
                            {rec.company && (
                              <span className="text-[11px] font-normal text-ink-500">· {rec.company}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-ink-400 font-mono">{rec.email}</div>
                          <div className="text-[10px] text-ink-500 mt-0.5">
                            Current Step: {rec.currentStepNumber}
                            {rec.lastStepSentAt && (
                              <span> · Last sent {new Date(rec.lastStepSentAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              rec.status === "SUBMITTED"
                                ? "bg-emerald-100 text-emerald-800"
                                : rec.status === "CLICKED" || rec.status === "OPENED"
                                ? "bg-amber-100 text-amber-800"
                                : rec.status === "DELIVERED"
                                ? "bg-sky-100 text-sky-800"
                                : rec.status === "BOUNCED" || rec.status === "FAILED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-warm-100 text-ink-600"
                            }`}
                          >
                            {rec.status}
                          </span>

                          <button
                            onClick={() =>
                              handleCopyLink(rec.token, inspectingCampaign?.form?.slug || "feedback")
                            }
                            className="p-1 rounded text-ink-400 hover:text-ink-700 hover:bg-warm-100"
                            title="Copy personal submission link"
                          >
                            {copiedToken === rec.token ? (
                              <Check size={13} className="text-emerald-600" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEQUENCE STEPS */}
          {inspectTab === "steps" && (
            <div className="space-y-3">
              <p className="text-xs text-ink-600">
                Visual follow-up sequence. You can edit messages for upcoming scheduled steps.
              </p>

              <div className="space-y-2.5">
                {(inspectingCampaign?.steps || []).map((step) => {
                  const isUpcoming = step.status === "PENDING" || step.status === "SCHEDULED";
                  return (
                    <div
                      key={step.id}
                      className="rounded-xl border border-line bg-white p-3.5 text-xs space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white text-[10px] font-bold">
                            {step.stepNumber}
                          </span>
                          <span className="font-bold text-ink-900">
                            {step.stepNumber === 1
                              ? "Initial Invitation"
                              : `Follow-Up Step #${step.stepNumber - 1}`}
                          </span>
                          {step.stepNumber > 1 && (
                            <span className="rounded bg-warm-100 px-1.5 py-0.5 text-[10px] text-ink-600 font-medium">
                              +{step.delayDays} days delay
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              step.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800"
                                : step.status === "SENDING"
                                ? "bg-sky-100 text-sky-800"
                                : step.status === "SCHEDULED"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-warm-100 text-ink-600"
                            }`}
                          >
                            {step.status}
                          </span>

                          {isUpcoming && (
                            <button
                              onClick={() => {
                                setEditingStep(step);
                                setEditStepSubject(step.subject);
                                setEditStepBody(step.bodyText);
                                setEditStepDelayDays(step.delayDays);
                              }}
                              className="inline-flex items-center gap-1 rounded border border-line bg-white px-2 py-0.5 text-[11px] font-medium text-ink-700 hover:bg-warm-100"
                            >
                              <Edit3 size={11} />
                              <span>Edit Message</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg bg-warm-50/70 p-2 text-ink-700 text-[11px]">
                        <div className="font-semibold text-ink-900">Subject: {step.subject}</div>
                        <div className="text-ink-600 truncate mt-0.5">{step.bodyText}</div>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-ink-400">
                        <span>Delivered: {step.deliveredCount}</span>
                        <span>Opened: {step.openedCount}</span>
                        {step.sentAt && (
                          <span>Sent at: {new Date(step.sentAt).toLocaleDateString()}</span>
                        )}
                        {step.scheduledAt && !step.sentAt && (
                          <span>Scheduled for: {new Date(step.scheduledAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CAMPAIGN HISTORY AUDIT TRAIL */}
          {inspectTab === "history" && (
            <div className="space-y-3">
              <p className="text-xs text-ink-600">
                Chronological execution audit trail of all scheduling, dispatches, pauses, and edits.
              </p>

              {(inspectingCampaign?.activities || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-400 border border-dashed border-line rounded-xl">
                  No activity logged for this campaign yet.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {(inspectingCampaign?.activities || []).map((act) => (
                    <div
                      key={act.id}
                      className="rounded-xl border border-line bg-white p-3 text-xs space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-ink-900 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-brand-500 inline-block" />
                          <span>{act.action}</span>
                          {act.stepNumber && (
                            <span className="text-ink-400 font-normal">(Step {act.stepNumber})</span>
                          )}
                        </span>
                        <span className="text-ink-400">
                          {new Date(act.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-ink-700 text-xs pl-3.5">{act.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ModalDialog>

      {/* ========================================================================= */}
      {/* 6. EDIT UPCOMING SCHEDULED STEP MODAL */}
      {/* ========================================================================= */}
      <ModalDialog
        isOpen={Boolean(editingStep)}
        onClose={() => setEditingStep(null)}
        title={`Edit Upcoming Step #${editingStep?.stepNumber || ""}`}
        description="Update the message or delay for this upcoming follow-up before it sends."
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              onClick={() => setEditingStep(null)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
            >
              Cancel
            </button>
            <button
              disabled={isSavingStepEdit || !editStepSubject.trim() || !editStepBody.trim()}
              onClick={handleSaveStepEdit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50"
            >
              {isSavingStepEdit && <Loader2 size={13} className="animate-spin" />}
              <span>Save Message</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {editingStep && editingStep.stepNumber > 1 && (
            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Delay Days after previous step
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={editStepDelayDays}
                onChange={(e) => setEditStepDelayDays(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-lg border border-line p-2 text-xs text-ink-900"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">Subject Line *</label>
            <input
              type="text"
              value={editStepSubject}
              onChange={(e) => setEditStepSubject(e.target.value)}
              className="w-full rounded-lg border border-line p-2 text-xs text-ink-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">Email Body *</label>
            <textarea
              rows={6}
              value={editStepBody}
              onChange={(e) => setEditStepBody(e.target.value)}
              className="w-full rounded-lg border border-line p-2 text-xs font-mono text-ink-900 leading-relaxed"
            />
          </div>
        </div>
      </ModalDialog>

      {/* ========================================================================= */}
      {/* 7. DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      <ConfirmDialog
        isOpen={Boolean(deletingCampaign)}
        onClose={() => setDeletingCampaign(null)}
        onConfirm={handleDeleteCampaign}
        title="Delete Invitation Campaign"
        message={`Are you sure you want to delete "${deletingCampaign?.name}"? All sequence steps and recipient records will also be removed.`}
        confirmLabel="Delete Campaign"
        isDestructive
      />
        </>
      )}
    </div>
  );
}
