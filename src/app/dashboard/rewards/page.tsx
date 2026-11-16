"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Gift,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  ExternalLink,
  Copy,
  Trash2,
  Edit3,
  ShieldCheck,
  Check,
  Filter,
  Info,
  Loader2,
  Star,
  Tag,
  Link as LinkIcon,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { DEFAULT_REWARD_DISCLOSURE } from "@/lib/rewards/constants";
import { STARTER_WHEEL_OPTIONS, DEFAULT_WHEEL_PALETTE, WheelRewardOption } from "@/lib/rewards/wheel";
import { SendThankYouModal } from "@/components/rewards/send-thank-you-modal";

interface RewardProgram {
  id: string;
  name: string;
  description?: string | null;
  rewardType: "COUPON_CODE" | "REWARD_URL" | "DIGITAL_GIFT" | "MANUAL" | "EXTERNAL_PROVIDER" | string;
  couponCode?: string | null;
  rewardUrl?: string | null;
  digitalGiftUrl?: string | null;
  instructions?: string | null;
  disclosureText?: string | null;
  deliveryMethod: "INSTANT_ON_SUBMISSION" | "MANUAL_REVIEW" | "EXTERNAL_DISPATCH" | string;
  providerType: "BUILT_IN" | "MANUAL" | "GENERIC_WEBHOOK" | string;
  providerConfigJson?: string | null;
  isActive: boolean;
  maxRewardsTotal?: number | null;
  claimsCount: number;
  wheelEnabled?: boolean;
  wheelConfigJson?: string | null;
  createdAt: string;
  forms?: Array<{ id: string; title: string; slug: string }>;
  _count?: { claims: number };
}

interface RewardClaim {
  id: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  rewardType: string;
  rewardCode?: string | null;
  rewardUrl?: string | null;
  isWheelSpin?: boolean;
  selectedOptionLabel?: string | null;
  status: "PENDING" | "DELIVERED" | "CLAIMED" | "REDEEMED" | "FAILED" | "REVOKED" | string;
  deliveryMethod: string;
  deliveredAt?: string | null;
  redeemedAt?: string | null;
  deliveredBy?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  rewardProgram?: {
    id: string;
    name: string;
    rewardType: string;
  };
  form?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  testimonial?: {
    id: string;
    rating?: number | null;
    type: string;
    content: string;
  } | null;
  customer?: {
    id: string;
    name: string;
    email: string;
    company?: string | null;
  } | null;
}

export default function RewardsPage() {
  const { activeWorkspace } = useWorkspace();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"programs" | "claims" | "appreciation">("programs");

  // Programs & Stats state
  const [programs, setPrograms] = useState<RewardProgram[]>([]);
  const [stats, setStats] = useState({
    totalPrograms: 0,
    activePrograms: 0,
    totalClaims: 0,
    deliveredClaims: 0,
    redeemedClaims: 0,
    pendingClaims: 0,
  });
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);

  // Claims history state
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");

  // Customer Appreciation / Thank-Yous state
  const [thankYous, setThankYous] = useState<any[]>([]);
  const [isLoadingThankYous, setIsLoadingThankYous] = useState(false);
  const [thankYouChannelFilter, setThankYouChannelFilter] = useState("ALL");
  const [isThankYouModalOpen, setIsThankYouModalOpen] = useState(false);
  const [thankYouTestimonialTarget, setThankYouTestimonialTarget] = useState<any>(null);
  const [thankYouCustomerTarget, setThankYouCustomerTarget] = useState<any>(null);

  // Available forms in workspace
  const [forms, setForms] = useState<Array<{ id: string; title: string; slug: string; rewardEnabled?: boolean }>>([]);

  // Create / Edit Program Modal State
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programName, setProgramName] = useState("");
  const [programDescription, setProgramDescription] = useState("");
  const [programRewardType, setProgramRewardType] = useState<string>("COUPON_CODE");
  const [programCouponCode, setProgramCouponCode] = useState("");
  const [programRewardUrl, setProgramRewardUrl] = useState("");
  const [programDigitalGiftUrl, setProgramDigitalGiftUrl] = useState("");
  const [programInstructions, setProgramInstructions] = useState("");
  const [programDisclosureText, setProgramDisclosureText] = useState(DEFAULT_REWARD_DISCLOSURE);
  const [programDeliveryMethod, setProgramDeliveryMethod] = useState<string>("INSTANT_ON_SUBMISSION");
  const [programProviderType, setProgramProviderType] = useState<string>("BUILT_IN");
  const [programWebhookUrl, setProgramWebhookUrl] = useState("");
  const [programAuthHeader, setProgramAuthHeader] = useState("");
  const [programSigningSecret, setProgramSigningSecret] = useState("");
  const [programIsActive, setProgramIsActive] = useState(true);
  const [programMaxQuota, setProgramMaxQuota] = useState<string>("");
  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(new Set());
  const [programWheelEnabled, setProgramWheelEnabled] = useState(false);
  const [wheelOptions, setWheelOptions] = useState<WheelRewardOption[]>(STARTER_WHEEL_OPTIONS);
  const [isSavingProgram, setIsSavingProgram] = useState(false);

  // Delete program state
  const [deletingProgram, setDeletingProgram] = useState<RewardProgram | null>(null);

  // Manual Delivery Modal State
  const [manualDeliverClaim, setManualDeliverClaim] = useState<RewardClaim | null>(null);
  const [manualRewardCode, setManualRewardCode] = useState("");
  const [manualRewardUrl, setManualRewardUrl] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [isDeliveringManual, setIsDeliveringManual] = useState(false);

  // Copy tracking helper
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Fetch reward programs
  const fetchPrograms = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setIsLoadingPrograms(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/rewards`);
      const data = await res.json();
      if (data.success) {
        setPrograms(data.programs || []);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      toast.error("Failed to load reward programs");
    } finally {
      setIsLoadingPrograms(false);
    }
  }, [activeWorkspace?.id, toast]);

  // Fetch claims history
  const fetchClaims = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setIsLoadingClaims(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (programFilter !== "all") params.set("programId", programFilter);

      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/rewards/claims?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setClaims(data.claims || []);
      }
    } catch {
      toast.error("Failed to load reward distribution claims");
    } finally {
      setIsLoadingClaims(false);
    }
  }, [activeWorkspace?.id, searchQuery, statusFilter, programFilter, toast]);

  // Fetch forms
  const fetchForms = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/forms`);
      const data = await res.json();
      if (data.forms) {
        setForms(data.forms);
      }
    } catch {
      // Non-blocking
    }
  }, [activeWorkspace?.id]);

  // Fetch customer appreciation / thank you notes
  const fetchThankYous = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setIsLoadingThankYous(true);
    try {
      const params = new URLSearchParams();
      if (thankYouChannelFilter !== "ALL") params.set("channel", thankYouChannelFilter);
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/thank-yous?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setThankYous(data.records || []);
      }
    } catch {
      toast.error("Failed to load thank-you history");
    } finally {
      setIsLoadingThankYous(false);
    }
  }, [activeWorkspace?.id, thankYouChannelFilter, toast]);

  useEffect(() => {
    fetchPrograms();
    fetchForms();
  }, [fetchPrograms, fetchForms]);

  useEffect(() => {
    if (activeTab === "claims") {
      fetchClaims();
    } else if (activeTab === "appreciation") {
      fetchThankYous();
    }
  }, [activeTab, fetchClaims, fetchThankYous]);

  // Deep-link from Testimonials or Customers to send a thank-you
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const tyName = url.searchParams.get("thankYouCustomer");
      const tyEmail = url.searchParams.get("email");
      if (tyName || tyEmail) {
        setThankYouCustomerTarget({ name: tyName || "Customer", email: tyEmail || "" });
        setIsThankYouModalOpen(true);
        setActiveTab("appreciation");
      }
    }
  }, []);

  // Open modal for new reward program
  const handleOpenCreateModal = () => {
    setEditingProgramId(null);
    setProgramName("");
    setProgramDescription("");
    setProgramRewardType("COUPON_CODE");
    setProgramCouponCode("THANKS20");
    setProgramRewardUrl("");
    setProgramDigitalGiftUrl("");
    setProgramInstructions("Apply promo code at checkout for 20% off your next purchase.");
    setProgramDisclosureText(DEFAULT_REWARD_DISCLOSURE);
    setProgramDeliveryMethod("INSTANT_ON_SUBMISSION");
    setProgramProviderType("BUILT_IN");
    setProgramWebhookUrl("");
    setProgramAuthHeader("");
    setProgramSigningSecret("");
    setProgramIsActive(true);
    setProgramMaxQuota("");
    setProgramWheelEnabled(false);
    setWheelOptions(STARTER_WHEEL_OPTIONS);
    setSelectedFormIds(new Set(forms.map((f) => f.id)));
    setIsProgramModalOpen(true);
  };

  // Open modal to edit existing program
  const handleOpenEditModal = (prog: RewardProgram) => {
    setEditingProgramId(prog.id);
    setProgramName(prog.name);
    setProgramDescription(prog.description || "");
    setProgramRewardType(prog.rewardType);
    setProgramCouponCode(prog.couponCode || "");
    setProgramRewardUrl(prog.rewardUrl || "");
    setProgramDigitalGiftUrl(prog.digitalGiftUrl || "");
    setProgramInstructions(prog.instructions || "");
    setProgramDisclosureText(prog.disclosureText || DEFAULT_REWARD_DISCLOSURE);
    setProgramDeliveryMethod(prog.deliveryMethod);
    setProgramProviderType(prog.providerType);
    setProgramIsActive(prog.isActive);
    setProgramMaxQuota(prog.maxRewardsTotal ? String(prog.maxRewardsTotal) : "");
    setProgramWheelEnabled(Boolean(prog.wheelEnabled));

    if (prog.wheelConfigJson) {
      try {
        const parsed = JSON.parse(prog.wheelConfigJson);
        if (Array.isArray(parsed.options)) {
          setWheelOptions(parsed.options);
        } else {
          setWheelOptions(STARTER_WHEEL_OPTIONS);
        }
      } catch {
        setWheelOptions(STARTER_WHEEL_OPTIONS);
      }
    } else {
      setWheelOptions(STARTER_WHEEL_OPTIONS);
    }

    // Parse provider config if present
    if (prog.providerConfigJson) {
      try {
        const parsed = JSON.parse(prog.providerConfigJson);
        setProgramWebhookUrl(parsed.webhookUrl || "");
        setProgramAuthHeader(parsed.authHeader || "");
        setProgramSigningSecret(parsed.signingSecret || "");
      } catch {}
    } else {
      setProgramWebhookUrl("");
      setProgramAuthHeader("");
      setProgramSigningSecret("");
    }

    const linkedIds = new Set((prog.forms || []).map((f) => f.id));
    setSelectedFormIds(linkedIds);
    setIsProgramModalOpen(true);
  };

  // Save reward program
  const handleSaveProgram = async () => {
    if (!programName.trim()) {
      toast.error("Please enter a reward program name");
      return;
    }
    if (!activeWorkspace?.id) return;

    setIsSavingProgram(true);
    try {
      let providerConfig: any = null;
      if (programProviderType === "GENERIC_WEBHOOK") {
        providerConfig = {
          webhookUrl: programWebhookUrl.trim(),
          authHeader: programAuthHeader.trim() || undefined,
          signingSecret: programSigningSecret.trim() || undefined,
        };
      }

      const payload = {
        name: programName.trim(),
        description: programDescription.trim() || undefined,
        rewardType: programRewardType,
        couponCode: programCouponCode.trim() || undefined,
        rewardUrl: programRewardUrl.trim() || undefined,
        digitalGiftUrl: programDigitalGiftUrl.trim() || undefined,
        instructions: programInstructions.trim() || undefined,
        disclosureText: programDisclosureText.trim() || DEFAULT_REWARD_DISCLOSURE,
        deliveryMethod: programDeliveryMethod,
        providerType: programProviderType,
        providerConfig: providerConfig || undefined,
        isActive: programIsActive,
        maxRewardsTotal: programMaxQuota ? parseInt(programMaxQuota, 10) : null,
        formIds: Array.from(selectedFormIds),
        wheelEnabled: programWheelEnabled,
        wheelConfig: programWheelEnabled ? { enabled: true, options: wheelOptions } : undefined,
      };

      const url = editingProgramId
        ? `/api/workspaces/${activeWorkspace.id}/rewards/${editingProgramId}`
        : `/api/workspaces/${activeWorkspace.id}/rewards`;
      const method = editingProgramId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          editingProgramId ? "Program Updated" : "Reward Program Created",
          data.message || "Reward program saved successfully."
        );
        setIsProgramModalOpen(false);
        fetchPrograms();
      } else {
        toast.error("Failed to save reward program", data.error);
      }
    } catch {
      toast.error("Failed to save reward program");
    } finally {
      setIsSavingProgram(false);
    }
  };

  // Delete program
  const handleDeleteProgram = async () => {
    if (!deletingProgram || !activeWorkspace?.id) return;
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/rewards/${deletingProgram.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Program Deleted", "Reward program removed.");
        setDeletingProgram(null);
        fetchPrograms();
      } else {
        toast.error("Failed to delete program", data.error);
      }
    } catch {
      toast.error("Failed to delete program");
    }
  };

  // Execute manual delivery
  const handleExecuteManualDelivery = async () => {
    if (!manualDeliverClaim || !activeWorkspace?.id) return;
    setIsDeliveringManual(true);
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/rewards/claims/${manualDeliverClaim.id}/deliver`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rewardCode: manualRewardCode.trim() || undefined,
            rewardUrl: manualRewardUrl.trim() || undefined,
            notes: manualNotes.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Reward Delivered", "Claim marked as delivered.");
        setManualDeliverClaim(null);
        fetchClaims();
        fetchPrograms();
      } else {
        toast.error("Failed to deliver reward", data.error);
      }
    } catch {
      toast.error("Failed to deliver reward");
    } finally {
      setIsDeliveringManual(false);
    }
  };

  // Mark claim redeemed
  const handleMarkRedeemed = async (claimId: string) => {
    try {
      const res = await fetch(`/api/rewards/redeem/${claimId}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Reward Redeemed", "Redemption timestamp recorded.");
        fetchClaims();
        fetchPrograms();
      } else {
        toast.error("Failed to mark redeemed", data.error);
      }
    } catch {
      toast.error("Failed to mark redeemed");
    }
  };

  // Revoke claim
  const handleRevokeClaim = async (claimId: string) => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/rewards/claims/${claimId}/revoke`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Manually revoked by workspace admin" }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Reward Revoked", "Claim status updated to REVOKED.");
        fetchClaims();
        fetchPrograms();
      } else {
        toast.error("Failed to revoke claim", data.error);
      }
    } catch {
      toast.error("Failed to revoke claim");
    }
  };

  // Copy code to clipboard
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Customer Rewards & Incentives"
        description="Offer non-incentivized thank-you gifts, coupon codes, and perks to customers for sharing honest reviews."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchPrograms();
                if (activeTab === "claims") fetchClaims();
              }}
              disabled={isLoadingPrograms || isLoadingClaims}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
            >
              <RefreshCw size={13} className={isLoadingPrograms || isLoadingClaims ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
            >
              <Plus size={14} />
              <span>Configure Reward</span>
            </button>
          </div>
        }
      />

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">Programs</span>
          <p className="mt-1 text-xl font-bold text-ink-900">{stats.totalPrograms}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">Active</span>
          <p className="mt-1 text-xl font-bold text-emerald-600">{stats.activePrograms}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">Total Claims</span>
          <p className="mt-1 text-xl font-bold text-ink-900">{stats.totalClaims}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">Delivered</span>
          <p className="mt-1 text-xl font-bold text-blue-600">{stats.deliveredClaims}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">Redeemed</span>
          <p className="mt-1 text-xl font-bold text-emerald-700">{stats.redeemedClaims}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">Pending Manual</span>
          <p className="mt-1 text-xl font-bold text-amber-600">{stats.pendingClaims}</p>
        </div>
      </div>

      {/* FTC & Consumer Review Fairness Compliance Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-start gap-3 shadow-2xs">
        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
          <ShieldCheck size={18} />
        </div>
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-emerald-950">
            Guaranteed Non-Incentivized Honesty Compliance
          </h4>
          <p className="text-emerald-900/90 leading-relaxed">
            In compliance with FTC guidelines and consumer review regulations, Praise guarantees that customer rewards are strictly non-discriminatory: rewards are never conditioned on positive ratings or sentiment. Customers who submit 1-star reviews or constructive criticism are 100% equally eligible for rewards. Praise never rewrites or alters customer feedback.
          </p>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <button
          onClick={() => setActiveTab("programs")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "programs"
              ? "bg-brand-500 text-white shadow-xs"
              : "bg-white text-ink-700 border border-line hover:bg-warm-100"
          }`}
        >
          <Gift size={14} />
          <span>Reward Programs & Configuration</span>
        </button>
        <button
          onClick={() => setActiveTab("claims")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "claims"
              ? "bg-brand-500 text-white shadow-xs"
              : "bg-white text-ink-700 border border-line hover:bg-warm-100"
          }`}
        >
          <Clock size={14} />
          <span>Reward Distribution History ({stats.totalClaims})</span>
        </button>
        <button
          onClick={() => setActiveTab("appreciation")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "appreciation"
              ? "bg-brand-500 text-white shadow-xs"
              : "bg-white text-ink-700 border border-line hover:bg-warm-100"
          }`}
        >
          <Send size={14} />
          <span>Customer Appreciation ({thankYous.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. REWARD PROGRAMS TAB */}
      {/* ========================================================================= */}
      {activeTab === "programs" && (
        <div className="space-y-4">
          {isLoadingPrograms ? (
            <div className="flex flex-col items-center justify-center p-12 text-ink-400 space-y-2">
              <Loader2 size={24} className="animate-spin text-brand-500" />
              <span className="text-xs">Loading reward programs...</span>
            </div>
          ) : programs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-warm-50/50 p-12 text-center space-y-3">
              <Gift size={36} className="mx-auto text-ink-300" />
              <h3 className="text-sm font-semibold text-ink-900">No Reward Programs Configured</h3>
              <p className="text-xs text-ink-500 max-w-sm mx-auto leading-relaxed">
                Offer your customers a coupon code, digital gift, or perk link for taking the time to share their honest feedback.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
              >
                <Plus size={14} />
                <span>Configure First Reward</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map((prog) => (
                <div
                  key={prog.id}
                  className="rounded-2xl border border-line bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          prog.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-warm-100 text-ink-600 border border-line"
                        }`}
                      >
                        {prog.isActive ? "Active" : "Paused"}
                      </span>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-warm-100 text-ink-600">
                        {prog.rewardType.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-ink-900">{prog.name}</h4>
                      {prog.description && (
                        <p className="text-xs text-ink-600 mt-0.5 line-clamp-2 leading-relaxed">
                          {prog.description}
                        </p>
                      )}
                    </div>

                    {/* Specific Reward Details */}
                    <div className="rounded-xl bg-warm-50/70 border border-line/70 p-2.5 text-xs space-y-1">
                      {prog.rewardType === "COUPON_CODE" && prog.couponCode && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-ink-400 uppercase font-semibold">Promo Code</span>
                          <code className="font-mono font-bold text-brand-700">{prog.couponCode}</code>
                        </div>
                      )}
                      {(prog.rewardType === "REWARD_URL" || prog.rewardType === "DIGITAL_GIFT") && (
                        <div className="flex items-center justify-between truncate">
                          <span className="text-[10px] text-ink-400 uppercase font-semibold">URL</span>
                          <span className="font-mono text-ink-700 truncate max-w-[170px]">
                            {prog.rewardUrl || prog.digitalGiftUrl}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-ink-500 pt-0.5">
                        <span>Delivery:</span>
                        <span className="font-medium text-ink-800">
                          {prog.deliveryMethod === "INSTANT_ON_SUBMISSION"
                            ? "Instant on Submit"
                            : prog.deliveryMethod === "MANUAL_REVIEW"
                            ? "Manual Fulfillment"
                            : "Provider Dispatch"}
                        </span>
                      </div>
                    </div>

                    {/* Linked Forms */}
                    <div className="text-xs space-y-1">
                      <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">
                        Linked Forms ({(prog.forms || []).length})
                      </span>
                      {(prog.forms || []).length === 0 ? (
                        <p className="text-[11px] text-ink-400 italic">Not currently enabled on any forms</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(prog.forms || []).map((f) => (
                            <span
                              key={f.id}
                              className="inline-block bg-warm-100 text-ink-700 text-[10px] px-2 py-0.5 rounded font-medium truncate max-w-[160px]"
                            >
                              {f.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-line flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-700">
                      {prog.claimsCount} claimed
                      {prog.maxRewardsTotal ? ` / ${prog.maxRewardsTotal} cap` : ""}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(prog)}
                        className="inline-flex items-center gap-1 p-1.5 rounded-lg border border-line bg-white text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs text-[11px] font-medium"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeletingProgram(prog)}
                        className="p-1.5 rounded-lg border border-line bg-white text-ink-400 hover:text-rose-600 transition-colors shadow-2xs"
                        title="Delete Program"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. REWARD DISTRIBUTION HISTORY TAB */}
      {/* ========================================================================= */}
      {activeTab === "claims" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search by recipient or reward code..."
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
                <option value="PENDING">Pending Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="REDEEMED">Redeemed</option>
                <option value="REVOKED">Revoked</option>
              </select>

              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink-700 font-medium focus:border-brand-500 focus:outline-none"
              >
                <option value="all">All Programs</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Claims Ledger Table */}
          {isLoadingClaims ? (
            <div className="flex flex-col items-center justify-center p-12 text-ink-400 space-y-2">
              <Loader2 size={24} className="animate-spin text-brand-500" />
              <span className="text-xs">Loading reward history...</span>
            </div>
          ) : claims.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-warm-50/50 p-12 text-center">
              <Gift size={32} className="mx-auto text-ink-300 mb-2" />
              <h3 className="text-sm font-semibold text-ink-900">No Reward Claims Yet</h3>
              <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
                Customer rewards will appear here once respondents submit feedback on forms with an active reward program.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-white overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-warm-50/50 text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-3">Testimonial & Rating</th>
                    <th className="py-3 px-3">Form</th>
                    <th className="py-3 px-3">Program & Type</th>
                    <th className="py-3 px-3">Reward Code / URL</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Delivered / Redeemed</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-warm-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink-900">
                          {claim.recipientName || "Public Respondent"}
                        </div>
                        <div className="text-[11px] text-ink-400">
                          {claim.recipientEmail || claim.recipientPhone || "Anonymous"}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-amber-500">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={
                                star <= (claim.testimonial?.rating || 5)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-ink-200 fill-transparent"
                              }
                            />
                          ))}
                          <span className="text-[10px] text-ink-500 ml-1 font-medium">
                            ({claim.testimonial?.rating || 5}★)
                          </span>
                        </div>
                        {claim.testimonial?.content && (
                          <div className="text-[11px] text-ink-600 line-clamp-1 italic mt-0.5 max-w-[180px]">
                            &ldquo;{claim.testimonial.content}&rdquo;
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-ink-700">
                        {claim.form?.title || "Testimonial Form"}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-ink-900">
                          {claim.rewardProgram?.name || "Reward Program"}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[10px] text-ink-400 font-mono">
                            {claim.rewardType}
                          </span>
                          {claim.isWheelSpin && (
                            <span className="inline-flex items-center gap-1 rounded bg-purple-50 text-purple-700 px-1.5 py-0.2 text-[9px] font-bold border border-purple-200">
                              🎡 {claim.selectedOptionLabel || "Wheel Spin"}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {claim.rewardCode ? (
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono font-bold text-brand-700 text-[11px]">
                              {claim.rewardCode}
                            </code>
                            <button
                              onClick={() => handleCopyCode(claim.rewardCode!, claim.id)}
                              className="text-ink-400 hover:text-ink-700 transition-colors"
                              title="Copy Code"
                            >
                              {copiedCodeId === claim.id ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        ) : claim.rewardUrl ? (
                          <a
                            href={claim.rewardUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-600 hover:underline font-mono text-[11px] truncate max-w-[120px]"
                          >
                            <span>Link</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-[11px] text-ink-400 italic">None assigned</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            claim.status === "REDEEMED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : claim.status === "DELIVERED"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : claim.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {claim.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-[11px] text-ink-600">
                        {claim.redeemedAt ? (
                          <div>
                            <span className="font-medium text-emerald-700">Redeemed:</span>{" "}
                            {new Date(claim.redeemedAt).toLocaleDateString()}
                          </div>
                        ) : claim.deliveredAt ? (
                          <div>
                            <span className="text-ink-400">Delivered:</span>{" "}
                            {new Date(claim.deliveredAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-ink-400 italic">Awaiting fulfillment</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {claim.status === "PENDING" && (
                            <button
                              onClick={() => {
                                setManualDeliverClaim(claim);
                                setManualRewardCode("");
                                setManualRewardUrl("");
                                setManualNotes("");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-2 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
                            >
                              <Send size={11} />
                              <span>Deliver</span>
                            </button>
                          )}

                          {claim.status === "DELIVERED" && (
                            <button
                              onClick={() => handleMarkRedeemed(claim.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Record Redemption"
                            >
                              <CheckCircle2 size={11} />
                              <span>Redeem</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setThankYouTestimonialTarget({
                                id: claim.testimonial?.id || "",
                                customerName: claim.recipientName,
                                customerEmail: claim.recipientEmail,
                                rewardClaim: { rewardCode: claim.rewardCode },
                              });
                              setThankYouCustomerTarget(claim.customer || null);
                              setIsThankYouModalOpen(true);
                            }}
                            className="p-1 rounded text-ink-400 hover:text-brand-600 transition-colors"
                            title="Send Personal Thank You"
                          >
                            <Send size={12} />
                          </button>

                          {claim.status !== "REVOKED" && (
                            <button
                              onClick={() => handleRevokeClaim(claim.id)}
                              className="p-1 rounded text-ink-400 hover:text-rose-600 transition-colors"
                              title="Revoke Reward"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2b. CUSTOMER APPRECIATION TAB */}
      {/* ========================================================================= */}
      {activeTab === "appreciation" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-700">Filter Channel:</span>
              <select
                value={thankYouChannelFilter}
                onChange={(e) => setThankYouChannelFilter(e.target.value)}
                className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink-800 shadow-2xs focus:border-brand-500 focus:outline-none"
              >
                <option value="ALL">All Channels</option>
                <option value="EMAIL">Personal Email</option>
                <option value="MANUAL_NOTE">Manual Note</option>
              </select>
            </div>
            <button
              onClick={() => {
                setThankYouTestimonialTarget(null);
                setThankYouCustomerTarget(null);
                setIsThankYouModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
            >
              <Send size={13} />
              <span>Compose Thank You</span>
            </button>
          </div>

          {isLoadingThankYous ? (
            <div className="flex items-center justify-center py-16 text-ink-400">
              <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
          ) : thankYous.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center space-y-3">
              <div className="mx-auto w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                <Send size={20} />
              </div>
              <h3 className="text-sm font-bold text-ink-900">No Thank-You Notes Sent Yet</h3>
              <p className="text-xs text-ink-500 max-w-sm mx-auto">
                Strengthen customer relationships by sending personalized thank-you emails or recording appreciation notes for respondents.
              </p>
              <button
                onClick={() => {
                  setThankYouTestimonialTarget(null);
                  setThankYouCustomerTarget(null);
                  setIsThankYouModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
              >
                <Send size={13} />
                <span>Send First Thank You</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {thankYous.map((note) => (
                <div
                  key={note.id}
                  className="rounded-2xl border border-line bg-white p-4 shadow-2xs space-y-3 text-xs hover:border-brand-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-line pb-2.5">
                    <div>
                      <div className="font-bold text-ink-900 text-xs sm:text-sm">
                        {note.recipientName}
                      </div>
                      {note.recipientEmail && (
                        <div className="text-[11px] text-ink-500 font-mono">
                          {note.recipientEmail}
                        </div>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        note.channel === "EMAIL"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-purple-50 text-purple-700 border border-purple-200"
                      }`}
                    >
                      {note.channel === "EMAIL" ? "Email" : "Manual Note"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="font-semibold text-ink-800 text-xs">{note.subject}</div>
                    <p className="text-ink-600 text-xs line-clamp-3 leading-relaxed whitespace-pre-line">
                      {note.message}
                    </p>
                  </div>

                  {note.videoUrl && (
                    <div className="rounded-lg bg-warm-50 p-2 flex items-center justify-between text-[11px] border border-line">
                      <span className="font-medium text-ink-700 flex items-center gap-1.5">
                        🎥 Video Note Attached
                      </span>
                      <a
                        href={note.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        <span>Watch</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between text-[10px] text-ink-400">
                    <span>Sent: {new Date(note.sentAt).toLocaleDateString()}</span>
                    <span>By: {note.sentByName || "Team"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CONFIGURE REWARD PROGRAM MODAL */}
      {/* ========================================================================= */}
      <ModalDialog
        isOpen={isProgramModalOpen}
        onClose={() => setIsProgramModalOpen(false)}
        title={editingProgramId ? "Edit Reward Program" : "Configure Customer Reward Program"}
        description="Reward respondents for sharing authentic testimonials with coupons, digital gifts, or perks."
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-[11px] text-ink-500 flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
              <span>Complies with FTC review guidelines</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsProgramModalOpen(false)}
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProgram}
                disabled={isSavingProgram || !programName.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {isSavingProgram && <Loader2 size={13} className="animate-spin" />}
                <span>{editingProgramId ? "Update Program" : "Save Reward Program"}</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Program Name & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Reward Program Name *
              </label>
              <input
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="e.g. 20% Off Next Order"
                className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Max Total Rewards Cap <span className="text-ink-400 font-normal">(Optional)</span>
              </label>
              <input
                type="number"
                min="1"
                value={programMaxQuota}
                onChange={(e) => setProgramMaxQuota(e.target.value)}
                placeholder="e.g. 100"
                className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Reward Description
            </label>
            <input
              type="text"
              value={programDescription}
              onChange={(e) => setProgramDescription(e.target.value)}
              placeholder="e.g. Enjoy 20% off your next purchase as our thank you for taking the time to share your review."
              className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Optional Spin-the-Wheel Toggle & Slices Configuration */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                  <span>🎡</span>
                  <span>Optional Appreciation Wheel (Spin-to-Reveal)</span>
                </span>
                <p className="text-[11px] text-purple-900/80 mt-0.5">
                  Present an interactive appreciation wheel on the thank-you screen. Respondents can spin or reveal directly.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={programWheelEnabled}
                  onChange={(e) => setProgramWheelEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-ink-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {programWheelEnabled && (
              <div className="space-y-3 pt-2 border-t border-purple-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-purple-900">
                    Wheel Slices & Probabilities ({wheelOptions.length} Options)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (wheelOptions.length >= 10) return;
                      const nextId = `opt-${wheelOptions.length + 1}-${Date.now()}`;
                      setWheelOptions([
                        ...wheelOptions,
                        {
                          id: nextId,
                          label: "Special Perk",
                          rewardType: "COUPON_CODE",
                          couponCode: "THANKS10",
                          probabilityWeight: 20,
                          color: DEFAULT_WHEEL_PALETTE[wheelOptions.length % DEFAULT_WHEEL_PALETTE.length],
                          description: "Customer appreciation discount",
                        },
                      ]);
                    }}
                    className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 underline"
                  >
                    + Add Slice
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {wheelOptions.map((opt, idx) => {
                    const totalWeight = wheelOptions.reduce(
                      (sum, o) => sum + (Number(o.probabilityWeight) || 0),
                      0
                    );
                    const odds =
                      totalWeight > 0
                        ? Math.round(((Number(opt.probabilityWeight) || 0) / totalWeight) * 100)
                        : 0;

                    return (
                      <div
                        key={opt.id || idx}
                        className="rounded-xl border border-line bg-white p-2.5 space-y-2 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={opt.color}
                            onChange={(e) => {
                              const updated = [...wheelOptions];
                              updated[idx] = { ...opt, color: e.target.value };
                              setWheelOptions(updated);
                            }}
                            className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                            title="Slice Color"
                          />
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) => {
                              const updated = [...wheelOptions];
                              updated[idx] = { ...opt, label: e.target.value };
                              setWheelOptions(updated);
                            }}
                            placeholder="Slice Label (e.g. 15% Off)"
                            className="flex-1 rounded-lg border border-line p-1 text-xs font-semibold text-ink-900 focus:outline-none"
                          />
                          <div className="flex items-center gap-1 text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            <span>Weight:</span>
                            <input
                              type="number"
                              min="1"
                              value={opt.probabilityWeight}
                              onChange={(e) => {
                                const updated = [...wheelOptions];
                                updated[idx] = {
                                  ...opt,
                                  probabilityWeight: Math.max(1, parseInt(e.target.value, 10) || 1),
                                };
                                setWheelOptions(updated);
                              }}
                              className="w-10 rounded border border-purple-300 p-0.5 text-center text-[11px] font-bold"
                            />
                            <span className="text-[10px] text-purple-500 font-sans">({odds}%)</span>
                          </div>
                          {wheelOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setWheelOptions(wheelOptions.filter((_, i) => i !== idx));
                              }}
                              className="text-ink-400 hover:text-rose-600 p-1"
                              title="Remove Slice"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <select
                              value={opt.rewardType}
                              onChange={(e) => {
                                const updated = [...wheelOptions];
                                updated[idx] = { ...opt, rewardType: e.target.value };
                                setWheelOptions(updated);
                              }}
                              className="w-full rounded-lg border border-line p-1 text-[11px] bg-white text-ink-700"
                            >
                              <option value="COUPON_CODE">Coupon Code</option>
                              <option value="DIGITAL_GIFT">Digital Gift Link</option>
                              <option value="REWARD_URL">Reward URL</option>
                              <option value="MANUAL">Manual Delivery</option>
                            </select>
                          </div>
                          <div>
                            {opt.rewardType === "COUPON_CODE" ? (
                              <input
                                type="text"
                                value={opt.couponCode || ""}
                                onChange={(e) => {
                                  const updated = [...wheelOptions];
                                  updated[idx] = { ...opt, couponCode: e.target.value };
                                  setWheelOptions(updated);
                                }}
                                placeholder="Promo Code (e.g. WIN15)"
                                className="w-full rounded-lg border border-line p-1 text-[11px] font-mono font-bold text-brand-700"
                              />
                            ) : (
                              <input
                                type="url"
                                value={opt.rewardUrl || ""}
                                onChange={(e) => {
                                  const updated = [...wheelOptions];
                                  updated[idx] = { ...opt, rewardUrl: e.target.value };
                                  setWheelOptions(updated);
                                }}
                                placeholder="https://..."
                                className="w-full rounded-lg border border-line p-1 text-[11px] font-mono"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Reward Type Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink-900">
              Reward Type *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: "COUPON_CODE",
                  title: "Coupon Code",
                  desc: "Display promo code with one-click copy",
                },
                {
                  id: "REWARD_URL",
                  title: "Reward URL",
                  desc: "Redirect to custom perks or redemption link",
                },
                {
                  id: "DIGITAL_GIFT",
                  title: "Digital Gift Link",
                  desc: "Asset download, ebook, or digital gift card",
                },
                {
                  id: "MANUAL",
                  title: "Manual Delivery",
                  desc: "Workspace staff manually issues custom gift",
                },
                {
                  id: "EXTERNAL_PROVIDER",
                  title: "External Provider",
                  desc: "Dispatch webhook to third-party reward API",
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setProgramRewardType(t.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    programRewardType === t.id
                      ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                      : "border-line bg-white hover:bg-warm-50"
                  }`}
                >
                  <div className="font-bold text-xs text-ink-900">{t.title}</div>
                  <div className="text-[11px] text-ink-500 leading-tight mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Inputs based on Reward Type */}
          <div className="rounded-xl border border-line bg-warm-50/60 p-3.5 space-y-3">
            {programRewardType === "COUPON_CODE" && (
              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">
                  Coupon / Promo Code *
                </label>
                <input
                  type="text"
                  value={programCouponCode}
                  onChange={(e) => setProgramCouponCode(e.target.value)}
                  placeholder="e.g. THANKS20"
                  className="w-full rounded-lg border border-line p-2 text-xs font-mono font-bold text-brand-700 bg-white focus:border-brand-500 focus:outline-none"
                />
              </div>
            )}

            {(programRewardType === "REWARD_URL" || programRewardType === "DIGITAL_GIFT") && (
              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">
                  {programRewardType === "DIGITAL_GIFT" ? "Digital Gift Download URL *" : "Perks / Reward URL *"}
                </label>
                <input
                  type="url"
                  value={programRewardType === "DIGITAL_GIFT" ? programDigitalGiftUrl : programRewardUrl}
                  onChange={(e) =>
                    programRewardType === "DIGITAL_GIFT"
                      ? setProgramDigitalGiftUrl(e.target.value)
                      : setProgramRewardUrl(e.target.value)
                  }
                  placeholder="https://example.com/redeem"
                  className="w-full rounded-lg border border-line p-2 text-xs font-mono text-ink-900 bg-white focus:border-brand-500 focus:outline-none"
                />
              </div>
            )}

            {programRewardType === "EXTERNAL_PROVIDER" && (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Reward Webhook Endpoint *
                  </label>
                  <input
                    type="url"
                    value={programWebhookUrl}
                    onChange={(e) => setProgramWebhookUrl(e.target.value)}
                    placeholder="https://perks-api.yourcompany.com/v1/fulfill"
                    className="w-full rounded-lg border border-line p-2 text-xs font-mono text-ink-900 bg-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-900 mb-1">
                      Authorization Header (Optional)
                    </label>
                    <input
                      type="password"
                      value={programAuthHeader}
                      onChange={(e) => setProgramAuthHeader(e.target.value)}
                      placeholder="Bearer YOUR_SECRET_KEY"
                      className="w-full rounded-lg border border-line p-1.5 text-xs font-mono text-ink-900 bg-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-900 mb-1">
                      HMAC Signature Secret (Optional)
                    </label>
                    <input
                      type="password"
                      value={programSigningSecret}
                      onChange={(e) => setProgramSigningSecret(e.target.value)}
                      placeholder="webhook_signing_secret"
                      className="w-full rounded-lg border border-line p-1.5 text-xs font-mono text-ink-900 bg-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {programRewardType === "MANUAL" && (
              <div className="text-xs text-ink-600 leading-relaxed">
                Reward claims will be placed into the <strong>Pending Manual Delivery</strong> queue upon form submission. Admins can fulfill each claim directly from the Reward Distribution History tab.
              </div>
            )}
          </div>

          {/* Delivery Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Fulfillment Timing *
              </label>
              <select
                value={programDeliveryMethod}
                onChange={(e) => setProgramDeliveryMethod(e.target.value)}
                className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 bg-white focus:border-brand-500 focus:outline-none"
              >
                <option value="INSTANT_ON_SUBMISSION">Instant on Submission (Thank you screen)</option>
                <option value="MANUAL_REVIEW">Manual Review before Delivery</option>
                <option value="EXTERNAL_DISPATCH">External Provider Dispatch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Status
              </label>
              <select
                value={programIsActive ? "active" : "inactive"}
                onChange={(e) => setProgramIsActive(e.target.value === "active")}
                className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 bg-white focus:border-brand-500 focus:outline-none"
              >
                <option value="active">Active (Offering to Customers)</option>
                <option value="inactive">Paused (Disabled)</option>
              </select>
            </div>
          </div>

          {/* Instructions for customer */}
          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Customer Redemption Instructions
            </label>
            <textarea
              rows={2}
              value={programInstructions}
              onChange={(e) => setProgramInstructions(e.target.value)}
              placeholder="e.g. Enter this code at checkout to claim your 20% discount."
              className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 bg-white focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Associated Collection Forms */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-ink-900">
                Offer On Collection Forms
              </label>
              <span className="text-[10px] text-ink-400">
                {selectedFormIds.size} of {forms.length} forms selected
              </span>
            </div>
            {forms.length === 0 ? (
              <p className="text-xs text-ink-400 italic">No collection forms found in workspace.</p>
            ) : (
              <div className="max-h-36 overflow-y-auto rounded-xl border border-line divide-y divide-line bg-white">
                {forms.map((f) => {
                  const isSelected = selectedFormIds.has(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => {
                        const next = new Set(selectedFormIds);
                        if (isSelected) next.delete(f.id);
                        else next.add(f.id);
                        setSelectedFormIds(next);
                      }}
                      className={`p-2 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isSelected ? "bg-brand-50/60" : "hover:bg-warm-50"
                      }`}
                    >
                      <span className="font-semibold text-ink-900">{f.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-ink-400">/p/{f.slug}</span>
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center border ${
                            isSelected
                              ? "bg-brand-500 border-brand-500 text-white"
                              : "border-line bg-white"
                          }`}
                        >
                          {isSelected && <Check size={11} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Compliance Disclosure Text */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-ink-900">
                Mandatory FTC & Consumer Disclosure
              </label>
              <span className="text-[10px] text-emerald-700 font-medium">Compliance Required</span>
            </div>
            <textarea
              rows={2}
              value={programDisclosureText}
              onChange={(e) => setProgramDisclosureText(e.target.value)}
              className="w-full rounded-xl border border-line p-2 text-xs text-ink-700 bg-warm-50/50 leading-relaxed focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
      </ModalDialog>

      {/* ========================================================================= */}
      {/* 4. MANUAL REWARD DELIVERY MODAL */}
      {/* ========================================================================= */}
      <ModalDialog
        isOpen={Boolean(manualDeliverClaim)}
        onClose={() => setManualDeliverClaim(null)}
        title="Deliver Customer Reward"
        description={`Fulfill pending reward for ${manualDeliverClaim?.recipientName || "customer"}.`}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => setManualDeliverClaim(null)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteManualDelivery}
              disabled={isDeliveringManual}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50"
            >
              {isDeliveringManual && <Loader2 size={13} className="animate-spin" />}
              <span>Confirm & Mark Delivered</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-warm-50 border border-line p-3 text-xs space-y-1">
            <div className="font-semibold text-ink-900">
              Recipient: {manualDeliverClaim?.recipientName || "Anonymous"}
            </div>
            <div className="text-ink-600 text-[11px]">
              {manualDeliverClaim?.recipientEmail || manualDeliverClaim?.recipientPhone || "No contact info provided"}
            </div>
            <div className="text-ink-500 text-[11px]">
              Program: <strong>{manualDeliverClaim?.rewardProgram?.name}</strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Voucher / Reward Code <span className="text-ink-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={manualRewardCode}
              onChange={(e) => setManualRewardCode(e.target.value)}
              placeholder="e.g. VIP-GIFT-9872"
              className="w-full rounded-xl border border-line p-2 text-xs font-mono font-bold text-brand-700 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Custom Gift URL / Download Link <span className="text-ink-400 font-normal">(Optional)</span>
            </label>
            <input
              type="url"
              value={manualRewardUrl}
              onChange={(e) => setManualRewardUrl(e.target.value)}
              placeholder="https://giftcards.example.com/claim/xyz"
              className="w-full rounded-xl border border-line p-2 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Internal Admin Notes <span className="text-ink-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="e.g. Dispatched digital gift card via Tremendous portal."
              className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
      </ModalDialog>

      {/* ========================================================================= */}
      {/* 5. DELETE PROGRAM CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      <ConfirmDialog
        isOpen={Boolean(deletingProgram)}
        onClose={() => setDeletingProgram(null)}
        onConfirm={handleDeleteProgram}
        title="Delete Reward Program"
        message={`Are you sure you want to delete "${deletingProgram?.name}"? It will be safely detached from all collection forms.`}
        confirmLabel="Delete Program"
        isDestructive
      />

      {/* ========================================================================= */}
      {/* 6. SEND CUSTOMER THANK-YOU MODAL */}
      {/* ========================================================================= */}
      {activeWorkspace?.id && (
        <SendThankYouModal
          workspaceId={activeWorkspace.id}
          isOpen={isThankYouModalOpen}
          onClose={() => {
            setIsThankYouModalOpen(false);
            setThankYouTestimonialTarget(null);
            setThankYouCustomerTarget(null);
          }}
          testimonial={thankYouTestimonialTarget}
          customer={thankYouCustomerTarget}
          onSuccess={() => {
            fetchThankYous();
            toast.success("Thank You Dispatched", "Customer appreciation successfully recorded.");
          }}
        />
      )}
    </div>
  );
}
