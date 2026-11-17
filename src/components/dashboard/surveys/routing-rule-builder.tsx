"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  History,
  Inbox,
  Info,
  Layers,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  MessageSquareQuote,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Star,
  Tag,
  Trash2,
  UserCheck,
  Users2,
  X,
} from "lucide-react";
import {
  RoutingActionType,
  RoutingTriggerCondition,
  RoutingLogStatus,
  SurveyRoutingRuleDetail,
  SurveyRoutingLogItem,
  ActionConfig,
} from "@/types/routing";
import { SurveyType } from "@/types/surveys";
import { useToast } from "@/components/dashboard/toast-context";
import { cn } from "@/lib/utils";

interface RoutingRuleBuilderProps {
  workspaceId: string;
  surveyId: string;
  surveyType?: SurveyType;
  surveyTitle?: string;
}

const CONDITION_PRESETS: Array<{
  id: RoutingTriggerCondition;
  label: string;
  category: "NPS" | "CSAT" | "CES" | "FIVE_STAR" | "GENERAL";
  desc: string;
  color: string;
}> = [
  {
    id: "NPS_PROMOTER",
    label: "NPS Promoters (9–10)",
    category: "NPS",
    desc: "Happy advocates ready for testimonial requests",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    id: "NPS_PASSIVE",
    label: "NPS Passives (7–8)",
    category: "NPS",
    desc: "Neutral respondents needing product improvements",
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    id: "NPS_DETRACTOR",
    label: "NPS Detractors (0–6)",
    category: "NPS",
    desc: "Unhappy respondents needing urgent retention outreach",
    color: "text-rose-700 bg-rose-50 border-rose-200",
  },
  {
    id: "CSAT_SATISFIED",
    label: "CSAT Satisfied (4–5)",
    category: "CSAT",
    desc: "High satisfaction ratings",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    id: "CSAT_DISSATISFIED",
    label: "CSAT Dissatisfied (1–2)",
    category: "CSAT",
    desc: "Dissatisfied customers needing issue resolution",
    color: "text-rose-700 bg-rose-50 border-rose-200",
  },
  {
    id: "CES_LOW_EFFORT",
    label: "CES Low Effort (5–7)",
    category: "CES",
    desc: "Seamless interactions with zero friction",
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  {
    id: "CES_HIGH_EFFORT",
    label: "CES High Effort / Friction (1–3)",
    category: "CES",
    desc: "Frustrating or difficult workflows needing attention",
    color: "text-rose-700 bg-rose-50 border-rose-200",
  },
  {
    id: "FIVE_STAR_HIGH",
    label: "Positive Star Rating (4–5 Stars)",
    category: "FIVE_STAR",
    desc: "High-tier star reviews suitable for testimonials",
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    id: "FIVE_STAR_LOW",
    label: "Low Star Rating (1–2 Stars)",
    category: "FIVE_STAR",
    desc: "Poor reviews requiring internal triage",
    color: "text-rose-700 bg-rose-50 border-rose-200",
  },
  {
    id: "ALWAYS",
    label: "Always (All Responses)",
    category: "GENERAL",
    desc: "Applies to every submission meeting secondary filters",
    color: "text-zinc-700 bg-zinc-50 border-zinc-200",
  },
];

const ACTION_TYPES: Array<{
  id: RoutingActionType;
  title: string;
  badge: string;
  description: string;
  icon: typeof MessageSquareQuote;
  color: string;
}> = [
  {
    id: "REQUEST_TESTIMONIAL",
    title: "Route Positive Feedback to Testimonial Request",
    badge: "Social Proof",
    description: "Invites happy respondents to share a public testimonial. Enforces unapproved draft state.",
    icon: MessageSquareQuote,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    id: "INTERNAL_INBOX",
    title: "Route Negative Feedback to Priority Inbox",
    badge: "Triage & Retention",
    description: "Sends negative feedback into the team triage inbox with urgency tags.",
    icon: Inbox,
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
  {
    id: "CUSTOMER_SUCCESS_FOLLOWUP",
    title: "Assign Customer Success Follow-up Task",
    badge: "CRM Outreach",
    description: "Creates follow-up note in CRM. Validates customer consent and email suppression.",
    icon: Users2,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    id: "NOTIFY_TEAM",
    title: "Send Team Alert Notification",
    badge: "Alerts",
    description: "Triggers notification alert to team admins or customer success leads.",
    icon: Bell,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
];

export function RoutingRuleBuilder({
  workspaceId,
  surveyId,
  surveyType = "NPS",
  surveyTitle,
}: RoutingRuleBuilderProps) {
  const toast = useToast();

  const [rules, setRules] = useState<SurveyRoutingRuleDetail[]>([]);
  const [logs, setLogs] = useState<SurveyRoutingLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"rules" | "history">("rules");

  // Rule Editor Modal State
  const [editingRule, setEditingRule] = useState<Partial<SurveyRoutingRuleDetail> | null>(null);
  const [isSavingRule, setIsSavingRule] = useState(false);

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Fetch rules & logs
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [rulesRes, logsRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/surveys/${surveyId}/routing-rules`),
        fetch(`/api/workspaces/${workspaceId}/surveys/${surveyId}/routing-logs`),
      ]);

      const rulesData = await rulesRes.json();
      const logsData = await logsRes.json();

      if (rulesRes.ok) setRules(rulesData.rules || []);
      if (logsRes.ok) setLogs(logsData.logs || []);
    } catch (err: any) {
      toast.error("Error", err?.message || "Failed to load routing data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId && surveyId) {
      fetchData();
    }
  }, [workspaceId, surveyId]);

  // Toggle Rule Enabled State directly from list
  const handleToggleRule = async (rule: SurveyRoutingRuleDetail) => {
    const nextState = !rule.isEnabled;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/surveys/${surveyId}/routing-rules/${rule.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: nextState }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle rule.");

      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, isEnabled: nextState } : r))
      );
      toast.success(
        nextState ? "Rule Enabled" : "Rule Disabled",
        `"${rule.name}" is now ${nextState ? "active" : "disabled"}.`
      );
    } catch (err: any) {
      toast.error("Toggle Error", err?.message || "Could not update rule.");
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/surveys/${surveyId}/routing-rules/${ruleId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete rule.");

      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      toast.success("Rule Deleted", "Routing rule removed.");
    } catch (err: any) {
      toast.error("Delete Error", err?.message || "Could not delete rule.");
    }
  };

  // Save Rule (Create or Update)
  const handleSaveRule = async () => {
    if (!editingRule?.name?.trim()) {
      toast.error("Validation Error", "Rule name is required.");
      return;
    }

    setIsSavingRule(true);
    try {
      const isEdit = Boolean(editingRule.id);
      const url = isEdit
        ? `/api/workspaces/${workspaceId}/surveys/${surveyId}/routing-rules/${editingRule.id}`
        : `/api/workspaces/${workspaceId}/surveys/${surveyId}/routing-rules`;

      const payload = {
        name: editingRule.name.trim(),
        description: editingRule.description?.trim() || null,
        isEnabled: editingRule.isEnabled ?? true,
        priority: editingRule.priority ?? 0,
        triggerCondition: editingRule.triggerCondition || "NPS_PROMOTER",
        minScore: editingRule.minScore ?? null,
        maxScore: editingRule.maxScore ?? null,
        requireFeedback: editingRule.requireFeedback ?? false,
        keywordContains: editingRule.keywordContains?.trim() || null,
        requireEmail: editingRule.requireEmail ?? false,
        actionType: editingRule.actionType || "REQUEST_TESTIMONIAL",
        actionConfig: editingRule.actionConfig || {},
        applyToAllSurveys: editingRule.surveyId === null,
      };

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save rule.");

      toast.success(
        isEdit ? "Rule Updated" : "Rule Created",
        `Routing rule "${data.rule.name}" is active.`
      );

      setRules((prev) => {
        if (isEdit) {
          return prev.map((r) => (r.id === data.rule.id ? data.rule : r));
        }
        return [data.rule, ...prev];
      });

      setEditingRule(null);
      setSimulationResult(null);
    } catch (err: any) {
      toast.error("Save Error", err?.message || "Could not save routing rule.");
    } finally {
      setIsSavingRule(false);
    }
  };

  // Dry-run simulation against past responses
  const handleSimulateRule = async () => {
    if (!editingRule) return;
    setIsSimulating(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/surveys/${surveyId}/routing-rules/simulate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rule: editingRule }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Simulation failed.");
      setSimulationResult(data);
    } catch (err: any) {
      toast.error("Simulation Error", err?.message || "Dry-run failed.");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-ink-900 tracking-tight">
              Feedback Routing & Automations
            </h2>
            <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md">
              Rule Engine
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            Automatically route promoters to testimonial requests, triage detractors, and assign customer success tasks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs Switcher */}
          <div className="flex items-center rounded-xl border border-line bg-warm-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("rules")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors",
                activeTab === "rules"
                  ? "bg-white text-brand-700 shadow-2xs font-bold"
                  : "text-ink-600 hover:text-ink-900"
              )}
            >
              <Sliders size={13} />
              <span>Routing Rules ({rules.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors",
                activeTab === "history"
                  ? "bg-white text-brand-700 shadow-2xs font-bold"
                  : "text-ink-600 hover:text-ink-900"
              )}
            >
              <History size={13} />
              <span>Audit History ({logs.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingRule({
                name: "New Routing Rule",
                isEnabled: true,
                priority: 10,
                triggerCondition: "NPS_PROMOTER",
                actionType: "REQUEST_TESTIMONIAL",
                requireFeedback: false,
                requireEmail: false,
                actionConfig: {
                  priority: "HIGH",
                },
              });
              setSimulationResult(null);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span>Add Rule</span>
          </button>
        </div>
      </div>

      {/* Safety & Integrity Guarantee Notice */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 flex items-start gap-3">
        <ShieldCheck size={18} className="text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 space-y-0.5">
          <p className="font-bold">Automated Integrity & Safety Gates</p>
          <p className="text-indigo-800 leading-relaxed">
            Praise never automatically publishes raw survey responses. Testimonial requests enforce unapproved draft status. Negative feedback is blocked from becoming testimonials, and customer outreach is verified against opt-outs.
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: ROUTING RULES LIST */}
      {/* ===================================================================== */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-2xl border border-line bg-white p-10 flex flex-col items-center justify-center">
              <Loader2 size={24} className="animate-spin text-brand-600 mb-2" />
              <p className="text-xs text-ink-500">Loading routing rules...</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center space-y-3">
              <Sliders size={36} className="mx-auto text-ink-300" />
              <div>
                <h3 className="text-sm font-bold text-ink-900">No Routing Rules Configured</h3>
                <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1">
                  Add routing rules to automatically categorize positive and negative survey feedback.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingRule({
                    name: "Route Promoters to Testimonials",
                    isEnabled: true,
                    priority: 10,
                    triggerCondition: "NPS_PROMOTER",
                    actionType: "REQUEST_TESTIMONIAL",
                    requireFeedback: false,
                    requireEmail: false,
                    actionConfig: { priority: "HIGH" },
                  });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Plus size={14} />
                <span>Create Promoters Rule</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const actionInfo = ACTION_TYPES.find((a) => a.id === rule.actionType);
                const conditionInfo = CONDITION_PRESETS.find(
                  (c) => c.id === rule.triggerCondition
                );
                const ActionIcon = actionInfo?.icon || MessageSquareQuote;

                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "rounded-2xl border p-4 sm:p-5 bg-white transition-all space-y-3 shadow-2xs",
                      rule.isEnabled ? "border-line" : "border-zinc-200 opacity-60 bg-zinc-50/50"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Name & Badges */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-ink-900">{rule.name}</h3>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                              conditionInfo?.color || "text-zinc-700 bg-zinc-50 border-zinc-200"
                            )}
                          >
                            {conditionInfo?.label || rule.triggerCondition}
                          </span>
                          {rule.surveyId === null && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                              Workspace-Wide
                            </span>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-xs text-ink-500">{rule.description}</p>
                        )}
                      </div>

                      {/* Right: Enable Toggle & Actions */}
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.isEnabled}
                            onChange={() => handleToggleRule(rule)}
                            className="rounded border-line text-brand-600 h-4 w-4"
                          />
                          <span>{rule.isEnabled ? "Enabled" : "Disabled"}</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setEditingRule(rule)}
                          className="px-2.5 py-1 rounded-lg border border-line bg-white hover:bg-warm-100 text-xs font-semibold text-ink-700 transition-colors"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Rule"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Condition & Action Pathway */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-line text-xs">
                      {/* Condition Summary */}
                      <div className="rounded-xl border border-line bg-warm-50/60 p-3 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400 block">
                          When this condition matches:
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-ink-900">
                          <span>{conditionInfo?.label || rule.triggerCondition}</span>
                        </div>
                        <div className="space-y-0.5 text-[11px] text-ink-500">
                          {rule.requireFeedback && <p>• Requires written feedback</p>}
                          {rule.keywordContains && (
                            <p>• Keywords contain: &quot;{rule.keywordContains}&quot;</p>
                          )}
                          {rule.requireEmail && <p>• Requires respondent email</p>}
                        </div>
                      </div>

                      {/* Action Summary */}
                      <div className="rounded-xl border border-line bg-warm-50/60 p-3 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400 block">
                          Execute this action:
                        </span>
                        <div className="flex items-center gap-2 font-bold text-ink-900">
                          <ActionIcon size={14} className={actionInfo?.color.split(" ")[0]} />
                          <span>{actionInfo?.title || rule.actionType}</span>
                        </div>
                        <p className="text-[11px] text-ink-500">{actionInfo?.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: AUDIT LOGS & ROUTING HISTORY */}
      {/* ===================================================================== */}
      {activeTab === "history" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-ink-500">
            <span>
              Total Auditable Executions: <strong>{logs.length}</strong>
            </span>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-semibold"
            >
              <RefreshCw size={12} />
              <span>Refresh Log</span>
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center space-y-2">
              <History size={32} className="mx-auto text-ink-300" />
              <p className="text-xs text-ink-500">No routing actions have been executed yet.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-white divide-y divide-line overflow-hidden shadow-2xs">
              {logs.map((log) => {
                const actionInfo = ACTION_TYPES.find((a) => a.id === log.actionType);
                const ActionIcon = actionInfo?.icon || MessageSquareQuote;

                return (
                  <div key={log.id} className="p-4 space-y-2 hover:bg-warm-50/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            log.status === "SUCCESS"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : log.status === "SKIPPED"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          )}
                        >
                          {log.status}
                        </span>

                        <span className="font-bold text-ink-900">{log.ruleName}</span>
                        <span className="text-ink-400">·</span>
                        <div className="flex items-center gap-1 font-semibold text-ink-700">
                          <ActionIcon size={13} className="text-brand-600" />
                          <span>{actionInfo?.badge || log.actionType}</span>
                        </div>
                      </div>

                      <span className="text-[11px] text-ink-400">
                        {new Date(log.executedAt).toLocaleString()}
                      </span>
                    </div>

                    {log.reason && (
                      <p className="text-xs text-ink-700 bg-warm-100/60 p-2.5 rounded-lg font-medium leading-relaxed">
                        {log.reason}
                      </p>
                    )}

                    {log.actionPayload?.response && (
                      <div className="flex items-center gap-3 text-[11px] text-ink-500 pt-1">
                        <span>Score: <strong>{log.actionPayload.response.score}</strong></span>
                        <span>·</span>
                        <span>
                          Respondent: <strong>{log.actionPayload.response.respondentName || "Anonymous"}</strong>
                        </span>
                        {log.actionPayload.response.respondentEmail && (
                          <>
                            <span>·</span>
                            <span>{log.actionPayload.response.respondentEmail}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: VISUAL ROUTING RULE BUILDER */}
      {/* ===================================================================== */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-line space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-base font-bold text-ink-900">
                  {editingRule.id ? "Edit Routing Rule" : "Create Feedback Routing Rule"}
                </h3>
                <p className="text-xs text-ink-500">
                  Define condition triggers and automated actions for incoming survey submissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="p-1 rounded-lg text-ink-400 hover:bg-warm-100 text-ink-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Rule Name & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-ink-800">
                  Rule Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingRule.name || ""}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  placeholder="e.g. Route Promoters to Testimonials"
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-900 outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-end justify-between p-2 rounded-xl bg-warm-50 border border-line">
                <div>
                  <span className="text-xs font-bold text-ink-900 block">Rule Status</span>
                  <span className="text-[11px] text-ink-500">Enable or disable this rule</span>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.isEnabled ?? true}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, isEnabled: e.target.checked })
                    }
                    className="rounded border-line text-brand-600 h-4 w-4"
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>

            {/* ================================================================= */}
            {/* PANEL 1: CONDITION DEFINITION */}
            {/* ================================================================= */}
            <div className="rounded-xl border border-line p-4 space-y-4 bg-warm-50/40">
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-brand-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-900">
                  1. Condition Trigger
                </h4>
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {CONDITION_PRESETS.map((cond) => {
                  const isSelected = editingRule.triggerCondition === cond.id;
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() =>
                        setEditingRule({ ...editingRule, triggerCondition: cond.id })
                      }
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all",
                        isSelected
                          ? "border-brand-500 bg-brand-50 shadow-2xs ring-1 ring-brand-500"
                          : "border-line bg-white hover:border-ink-300"
                      )}
                    >
                      <span className="text-xs font-bold text-ink-900 block">{cond.label}</span>
                      <span className="text-[10px] text-ink-500 line-clamp-1">{cond.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Secondary Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-line">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-ink-700">
                    Keyword Filter (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editingRule.keywordContains || ""}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, keywordContains: e.target.value })
                    }
                    placeholder="e.g. bug, cancel, billing, love"
                    className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 outline-none"
                  />
                </div>

                <div className="flex flex-col justify-center space-y-1 pt-3 sm:pt-0">
                  <label className="flex items-center gap-2 text-xs font-medium text-ink-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRule.requireFeedback ?? false}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, requireFeedback: e.target.checked })
                      }
                      className="rounded border-line text-brand-600"
                    />
                    <span>Must include written feedback</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-ink-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRule.requireEmail ?? false}
                      onChange={(e) =>
                        setEditingRule({ ...editingRule, requireEmail: e.target.checked })
                      }
                      className="rounded border-line text-brand-600"
                    />
                    <span>Must provide respondent email</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* PANEL 2: ACTION DEFINITION */}
            {/* ================================================================= */}
            <div className="rounded-xl border border-line p-4 space-y-4 bg-warm-50/40">
              <div className="flex items-center gap-2">
                <ArrowRight size={15} className="text-brand-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-900">
                  2. Automated Action
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ACTION_TYPES.map((action) => {
                  const isSelected = editingRule.actionType === action.id;
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => setEditingRule({ ...editingRule, actionType: action.id })}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1",
                        isSelected
                          ? "border-brand-500 bg-brand-50 shadow-2xs ring-1 ring-brand-500"
                          : "border-line bg-white hover:border-ink-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-ink-900">
                          <Icon size={14} className={action.color.split(" ")[0]} />
                          <span>{action.badge}</span>
                        </div>
                        {isSelected && <Check size={14} className="text-brand-600" />}
                      </div>
                      <span className="text-xs font-bold text-ink-900 mt-0.5">{action.title}</span>
                      <p className="text-[11px] text-ink-500 leading-relaxed">{action.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Action Parameter Configuration */}
              <div className="p-3 rounded-xl border border-line bg-white space-y-3">
                {editingRule.actionType === "INTERNAL_INBOX" && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-ink-700">
                      Triage Priority Level
                    </label>
                    <select
                      value={editingRule.actionConfig?.priority || "HIGH"}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          actionConfig: {
                            ...editingRule.actionConfig,
                            priority: e.target.value as any,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-900"
                    >
                      <option value="URGENT">URGENT — Immediate Intervention</option>
                      <option value="HIGH">HIGH — Review Within 2 Hours</option>
                      <option value="MEDIUM">MEDIUM — Standard Triage</option>
                      <option value="LOW">LOW — Informational</option>
                    </select>
                  </div>
                )}

                {editingRule.actionType === "NOTIFY_TEAM" && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-ink-700">
                      Notification Recipient Email
                    </label>
                    <input
                      type="email"
                      value={editingRule.actionConfig?.notificationEmail || ""}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          actionConfig: {
                            ...editingRule.actionConfig,
                            notificationEmail: e.target.value,
                          },
                        })
                      }
                      placeholder="alerts@yourcompany.com"
                      className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 outline-none"
                    />
                  </div>
                )}

                {editingRule.actionType === "CUSTOMER_SUCCESS_FOLLOWUP" && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-ink-700">
                      Internal CS Assignment Note
                    </label>
                    <input
                      type="text"
                      value={editingRule.actionConfig?.internalNote || ""}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          actionConfig: {
                            ...editingRule.actionConfig,
                            internalNote: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. Schedule retention check-in call with founder"
                      className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 outline-none"
                    />
                    <p className="text-[10px] text-ink-400">
                      Outreach is strictly validated against customer consent and email suppressions.
                    </p>
                  </div>
                )}

                {editingRule.actionType === "REQUEST_TESTIMONIAL" && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-ink-700">
                      Target Testimonial Collection Form Slug (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingRule.actionConfig?.targetCollectionFormSlug || ""}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          actionConfig: {
                            ...editingRule.actionConfig,
                            targetCollectionFormSlug: e.target.value,
                          },
                        })
                      }
                      placeholder="Leave blank for workspace default collection form"
                      className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 outline-none font-mono"
                    />
                    <p className="text-[10px] text-ink-400">
                      Unapproved draft testimonials will be created in moderation queue for founder approval.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Dry Run Simulator */}
            <div className="rounded-xl border border-dashed border-line p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-ink-900 block">Dry-Run Simulator</span>
                  <span className="text-[11px] text-ink-500">
                    Test this rule against the last 20 responses without triggering actions.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateRule}
                  disabled={isSimulating}
                  className="px-3 py-1.5 rounded-lg border border-line bg-white hover:bg-warm-100 text-xs font-bold text-ink-800 transition-colors flex items-center gap-1"
                >
                  {isSimulating ? <Loader2 size={13} className="animate-spin" /> : <Play size={12} />}
                  <span>Test Rule</span>
                </button>
              </div>

              {simulationResult && (
                <div className="pt-2 text-xs space-y-1.5 border-t border-line text-ink-700">
                  <p className="font-semibold text-brand-700">
                    Simulation matched {simulationResult.totalMatched} of {simulationResult.totalTested} responses:
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] bg-warm-50 p-2 rounded-lg border border-line">
                    {simulationResult.results.map((r: any) => (
                      <div key={r.responseId} className="flex items-center justify-between">
                        <span>
                          Score: {r.score} · {r.respondentEmail || "anon"}
                        </span>
                        <span className={r.matched ? "text-emerald-600 font-bold" : "text-ink-400"}>
                          {r.matched ? "MATCHED" : r.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 rounded-xl border border-line bg-white text-xs font-bold text-ink-700 hover:bg-warm-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRule}
                disabled={isSavingRule}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingRule ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Save Rule</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
