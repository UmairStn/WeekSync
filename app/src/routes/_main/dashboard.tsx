import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Send,
  AlertCircle,
  Clock,
  ThumbsUp,
  RotateCcw,
  Flag,
  Sparkles,
  Loader2,
  X,
  Target,
  Award,
  Zap,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/contexts/tenant-context";
import { useCurrentUser } from "@/contexts/user-context";
import {
  useGetMyPlan,
  useCreateOrUpdatePlan,
  useSubmitPlan,
  useApprovePlan,
  useSendBackPlan,
  useUpdateTaskCompletion,
  useUpdatePlanOutcome,
} from "@/api/endpoints/plans/plans";
import { useAiPlanReview } from "@/api/endpoints/ai/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PlanReviewPanel,
  InlineFindingCard,
} from "@/components/ai/PlanReviewPanel";
import { BrainDumpDialog } from "@/components/ai/BrainDumpDialog";
import { WeekSummaryDialog } from "@/components/ai/WeekSummaryDialog";
import { cn, getErrorMessage } from "@/lib/utils";
import type {
  TaskCreateRequest,
  PlanReviewResult,
  PlanFinding,
  BrainDumpResult,
  PlanReviewRequest,
} from "@/api/model";

export const Route = createFileRoute("/_main/dashboard")({
  component: WeeklyPlanPage,
});

const GTM_SUGGESTIONS = [
  "+ PostHog Telemetry",
  "+ Feature Flag Guard",
  "+ Docs & Changelog",
  "+ Staging Verification",
];

function WeeklyPlanPage() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const {
    currentOrgId,
    currentTeam,
    currentTeamId,
    selectedMonday,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    isCurrentWeek,
    formattedWeekLabel,
    isTeamLead,
  } = useTenant();

  // 1. Fetch Plan for selected week (guarded strictly by authenticated user)
  const { data: plan } = useGetMyPlan(
    currentOrgId,
    {
      week_start_date: selectedMonday,
    },
    {
      query: {
        enabled: !!user && !!currentOrgId && !!selectedMonday,
        retry: false,
      },
    }
  );

  // Local editing form state
  const [mainTaskTitle, setMainTaskTitle] = useState("");
  const [mainTaskWhy, setMainTaskWhy] = useState("");
  const [subGoals, setSubGoals] = useState<
    Array<{ id?: string; title: string; is_completed: boolean }>
  >([]);
  const [gtmGoals, setGtmGoals] = useState<
    Array<{ id?: string; title: string; is_completed: boolean }>
  >([]);
  const [newSubGoalInput, setNewSubGoalInput] = useState("");
  const [newGtmGoalInput, setNewGtmGoalInput] = useState("");

  // AI & Dialog States
  const [brainDumpDialogOpen, setBrainDumpDialogOpen] = useState(false);
  const [weekSummaryDialogOpen, setWeekSummaryDialogOpen] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<PlanReviewResult | null>(
    null
  );
  const [aiReviewError, setAiReviewError] = useState<string | null>(null);
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
  const [sendBackComment, setSendBackComment] = useState("");

  // Populate local form state when plan query resolves or changes
  useEffect(() => {
    if (plan) {
      const main = plan.tasks.find((t) => t.category === "main");
      setMainTaskTitle(main?.title ?? "");
      setMainTaskWhy(main?.why_it_matters ?? "");

      const subs = plan.tasks
        .filter((t) => t.category === "sub_goal")
        .map((t) => ({
          id: t.id,
          title: t.title,
          is_completed: t.is_completed,
        }));
      setSubGoals(subs);

      const gtms = plan.tasks
        .filter((t) => t.category === "gtm")
        .map((t) => ({
          id: t.id,
          title: t.title,
          is_completed: t.is_completed,
        }));
      setGtmGoals(gtms);
    } else {
      setMainTaskTitle("");
      setMainTaskWhy("");
      setSubGoals([]);
      setGtmGoals([]);
    }
    setAiReviewResult(null);
    setAiReviewError(null);
  }, [plan]);

  // Mutations
  const savePlanMutation = useCreateOrUpdatePlan({
    mutation: {
      onSuccess: () => {
        toast.success("Draft saved successfully");
        queryClient.invalidateQueries();
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err, "Failed to save plan"));
      },
    },
  });

  const submitPlanMutation = useSubmitPlan({
    mutation: {
      onSuccess: () => {
        toast.success("Plan submitted for lead review!");
        queryClient.invalidateQueries();
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err, "Failed to submit plan"));
      },
    },
  });

  const approveMutation = useApprovePlan({
    mutation: {
      onSuccess: () => {
        toast.success("Plan approved");
        queryClient.invalidateQueries();
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err, "Approval failed"));
      },
    },
  });

  const sendBackMutation = useSendBackPlan({
    mutation: {
      onSuccess: () => {
        toast.success("Plan sent back with feedback");
        setSendBackDialogOpen(false);
        setSendBackComment("");
        queryClient.invalidateQueries();
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err, "Send back failed"));
      },
    },
  });

  const updateTaskMutation = useUpdateTaskCompletion({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries();
      },
    },
  });

  const outcomeMutation = useUpdatePlanOutcome({
    mutation: {
      onSuccess: () => {
        toast.success("Shipping outcome recorded");
        queryClient.invalidateQueries();
      },
    },
  });

  const aiReviewMutation = useAiPlanReview({
    mutation: {
      onSuccess: (data) => {
        setAiReviewResult(data);
        setAiReviewError(null);
        toast.success("AI review complete! Inspect findings below.");
      },
      onError: (err: unknown) => {
        const message = getErrorMessage(
          err,
          "AI review unavailable. Planning continues without interruption."
        );
        setAiReviewError(message);
        toast.error("AI review temporarily unavailable");
      },
    },
  });

  // Handlers
  const handleAddSubGoal = () => {
    if (!newSubGoalInput.trim()) {
      return;
    }
    setSubGoals([
      ...subGoals,
      { title: newSubGoalInput.trim(), is_completed: false },
    ]);
    setNewSubGoalInput("");
  };

  const handleAddGtmGoal = () => {
    if (!newGtmGoalInput.trim()) {
      return;
    }
    setGtmGoals([
      ...gtmGoals,
      { title: newGtmGoalInput.trim(), is_completed: false },
    ]);
    setNewGtmGoalInput("");
  };

  const handleAddSuggestedGtm = (suggestion: string) => {
    const clean = suggestion.replace(/^\+\s*/, "");
    if (!gtmGoals.some((g) => g.title.toLowerCase() === clean.toLowerCase())) {
      setGtmGoals([...gtmGoals, { title: clean, is_completed: false }]);
      toast.success(`Added ${clean}`);
    }
  };

  const handleRemoveSubGoal = (index: number) => {
    setSubGoals(subGoals.filter((_, i) => i !== index));
  };

  const handleRemoveGtmGoal = (index: number) => {
    setGtmGoals(gtmGoals.filter((_, i) => i !== index));
  };

  const handleTriggerAiReview = () => {
    if (!mainTaskTitle.trim()) {
      toast.error(
        "Please enter what you plan to ship (Main Task) before requesting AI review."
      );
      return;
    }
    setAiReviewError(null);

    const tasksPayload: PlanReviewRequest["tasks"] = [
      {
        category: "main",
        title: mainTaskTitle.trim(),
        why_it_matters: mainTaskWhy.trim() || undefined,
      },
      ...subGoals.map((s) => ({
        id: s.id,
        category: "sub_goal",
        title: s.title,
      })),
      ...gtmGoals.map((g) => ({
        id: g.id,
        category: "gtm",
        title: g.title,
      })),
    ];

    aiReviewMutation.mutate({
      orgId: currentOrgId,
      data: {
        week_start_date: selectedMonday,
        tasks: tasksPayload,
      },
    });
  };

  const handleApplyRewrite = (finding: PlanFinding) => {
    if (!finding.suggested_rewrite) {
      return;
    }
    const rewrite = finding.suggested_rewrite.trim();

    if (finding.issue_type === "missing_impact") {
      setMainTaskWhy(rewrite);
      toast.success("Applied business impact explanation to Main Task!");
    } else if (finding.issue_type === "missing_gtm") {
      setGtmGoals((prev) => [...prev, { title: rewrite, is_completed: false }]);
      toast.success("Added suggested Go-To-Market goal!");
    } else if (finding.task_id) {
      const subIdx = subGoals.findIndex((s) => s.id === finding.task_id);
      if (subIdx !== -1) {
        setSubGoals((prev) =>
          prev.map((s, idx) => (idx === subIdx ? { ...s, title: rewrite } : s))
        );
        toast.success("Updated sub-goal title!");
      } else {
        const gtmIdx = gtmGoals.findIndex((g) => g.id === finding.task_id);
        if (gtmIdx !== -1) {
          setGtmGoals((prev) =>
            prev.map((g, idx) =>
              idx === gtmIdx ? { ...g, title: rewrite } : g
            )
          );
          toast.success("Updated GTM goal title!");
        } else {
          setMainTaskTitle(rewrite);
          toast.success("Updated Main Task title!");
        }
      }
    } else {
      setMainTaskTitle(rewrite);
      toast.success("Updated Main Task title!");
    }

    if (aiReviewResult) {
      setAiReviewResult({
        ...aiReviewResult,
        findings: (aiReviewResult.findings ?? []).filter((f) => f !== finding),
      });
    }
  };

  const handleApplyBrainDump = (draft: BrainDumpResult) => {
    setMainTaskTitle(draft.main_task.title);
    setMainTaskWhy(draft.main_task.why_it_matters ?? "");
    setSubGoals(
      draft.sub_goals.map((s) => ({
        title: s.title,
        is_completed: false,
      }))
    );
    setGtmGoals(
      draft.gtm_goals.map((g) => ({
        title: g.title,
        is_completed: false,
      }))
    );
    setAiReviewResult(null);
    setAiReviewError(null);
  };

  const handleToggleTaskCompleted = (task: {
    id?: string;
    is_completed: boolean;
  }) => {
    if (!plan || !task.id) {
      return;
    }
    updateTaskMutation.mutate({
      orgId: currentOrgId,
      planId: plan.id,
      taskId: task.id,
      data: { is_completed: !task.is_completed },
    });
  };

  const handleSaveDraft = () => {
    if (!mainTaskTitle.trim()) {
      toast.error("Please enter what you plan to ship (Main Task)");
      return;
    }
    if (!mainTaskWhy.trim()) {
      toast.error("Please provide why this matters (business impact)");
      return;
    }
    if (!currentTeamId) {
      toast.error("Please select a team first");
      return;
    }

    const tasksPayload: TaskCreateRequest[] = [
      {
        category: "main",
        title: mainTaskTitle.trim(),
        why_it_matters: mainTaskWhy.trim(),
        sort_order: 0,
      },
      ...subGoals.map((s, idx) => ({
        category: "sub_goal",
        title: s.title,
        sort_order: idx + 1,
      })),
      ...gtmGoals.map((g, idx) => ({
        category: "gtm",
        title: g.title,
        sort_order: idx + 20,
      })),
    ];

    savePlanMutation.mutate({
      orgId: currentOrgId,
      data: {
        team_id: currentTeamId,
        week_start_date: selectedMonday,
        tasks: tasksPayload,
      },
    });
  };

  const handleSubmit = () => {
    if (!plan) {
      handleSaveDraft();
      return;
    }
    submitPlanMutation.mutate({
      orgId: currentOrgId,
      planId: plan.id,
    });
  };

  const totalTasks =
    (mainTaskTitle ? 1 : 0) + (subGoals.length || 0) + (gtmGoals.length || 0);
  const completedTasks = plan?.tasks.filter((t) => t.is_completed).length || 0;

  if (!currentTeamId) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3 shadow-xs">
        <AlertCircle
          className="mx-auto size-8 text-muted-foreground"
          strokeWidth={1.5}
        />
        <h2 className="text-base font-semibold text-foreground">
          No team selected
        </h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Please select or create a team using the workspace switcher in the
          sidebar to begin weekly planning.
        </p>
      </div>
    );
  }

  // Calculate lifecycle stages
  const currentStatus = plan?.status ?? "draft";
  const isApproved = currentStatus === "approved";
  const isSubmitted = currentStatus === "submitted";
  const isSentBack = currentStatus === "sent_back";

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HEADER: Week Navigation, Status Stepper, and Actions */}
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {currentTeam?.name} &bull; Week Commencing
              </span>
              <span className="font-mono text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border">
                {selectedMonday}
              </span>
              {isCurrentWeek && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                  CURRENT WEEK
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {formattedWeekLabel}
              </h1>

              {/* Prev / Next Week Controls */}
              <div className="flex items-center gap-1 border border-border rounded-lg bg-background p-0.5">
                <button
                  type="button"
                  onClick={goToPreviousWeek}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Previous Week"
                  aria-label="Previous Week"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {!isCurrentWeek && (
                  <button
                    type="button"
                    onClick={goToCurrentWeek}
                    className="px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                  >
                    Current
                  </button>
                )}
                <button
                  type="button"
                  onClick={goToNextWeek}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Next Week"
                  aria-label="Next Week"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          {isApproved && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWeekSummaryDialogOpen(true)}
                className="gap-1.5 text-xs font-medium cursor-pointer rounded-full"
              >
                <FileText className="size-3.5 text-foreground" />
                <span>AI Week Summary</span>
              </Button>
            </div>
          )}
          {!isApproved && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBrainDumpDialogOpen(true)}
                className="gap-1.5 text-xs font-medium cursor-pointer rounded-full"
              >
                <Zap className="size-3.5 text-foreground" />
                <span>AI Brain Dump</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTriggerAiReview}
                disabled={aiReviewMutation.isPending}
                className="gap-1.5 text-xs font-medium cursor-pointer rounded-full"
              >
                {aiReviewMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Reviewing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 text-foreground" />
                    <span>AI Review</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={savePlanMutation.isPending}
                className="text-xs font-medium cursor-pointer shadow-xs rounded-full"
              >
                {savePlanMutation.isPending ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={submitPlanMutation.isPending}
                className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs bg-foreground hover:bg-foreground/90 text-background rounded-full"
              >
                <Send className="size-3.5" />
                <span>Submit for Review</span>
              </Button>
            </div>
          )}
        </div>

        {/* Streamlined Lifecycle Progress Strip */}
        <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-1">
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors",
                currentStatus === "draft"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  currentStatus === "draft"
                    ? "bg-background"
                    : "bg-muted-foreground/40"
                )}
              />
              <span>1. Draft</span>
            </div>
            <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors",
                currentStatus === "submitted"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  currentStatus === "submitted"
                    ? "bg-background"
                    : "bg-muted-foreground/40"
                )}
              />
              <span>2. In Review</span>
            </div>
            <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors",
                currentStatus === "approved"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "text-muted-foreground bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  currentStatus === "approved"
                    ? "bg-emerald-500"
                    : "bg-muted-foreground/40"
                )}
              />
              <span>3. Approved</span>
            </div>
            <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors",
                plan?.main_task_shipped === true
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : plan?.main_task_shipped === false
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                    : "text-muted-foreground bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  plan?.main_task_shipped === true
                    ? "bg-emerald-500"
                    : plan?.main_task_shipped === false
                      ? "bg-rose-500"
                      : "bg-muted-foreground/40"
                )}
              />
              <span>
                {plan?.main_task_shipped === true
                  ? "4. Shipped 🎉"
                  : plan?.main_task_shipped === false
                    ? "4. Missed"
                    : "4. Friday Shipped"}
              </span>
            </div>
          </div>

          <span className="font-mono text-[11px] text-muted-foreground hidden sm:inline">
            {completedTasks > 0
              ? `${completedTasks}/${totalTasks} deliverables ticked`
              : `${totalTasks} deliverables planned`}
          </span>
        </div>
      </div>

      {/* Fallback Banner for AI errors */}
      {aiReviewError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">AI Assistant Notice</p>
              <p className="mt-0.5 opacity-90 leading-relaxed">
                {aiReviewError}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAiReviewError(null)}
            className="rounded p-1 hover:bg-destructive/15 transition-colors cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* AI Review Results Panel */}
      {aiReviewResult && (
        <PlanReviewPanel
          review={aiReviewResult}
          onClose={() => setAiReviewResult(null)}
          onApplyRewrite={handleApplyRewrite}
        />
      )}

      {/* Review Feedback Alert (if sent back) */}
      {isSentBack && plan?.review_comment && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <RotateCcw className="size-4" />
            <span>Sent back by Team Lead for revisions</span>
          </div>
          <p className="text-xs text-foreground/90 pl-6 italic leading-relaxed">
            &ldquo;{plan.review_comment}&rdquo;
          </p>
        </div>
      )}

      {/* Lead Review Action Banner */}
      {isTeamLead && isSubmitted && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                Plan awaiting your review
              </p>
              <p className="text-[11px] text-muted-foreground">
                As Team Lead, verify this week&apos;s commitment and approve or
                send back with revisions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSendBackDialogOpen(true)}
              disabled={sendBackMutation.isPending}
              className="text-xs h-8 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 cursor-pointer"
            >
              Send Back...
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!plan) {
                  return;
                }
                approveMutation.mutate({
                  orgId: currentOrgId,
                  planId: plan.id,
                });
              }}
              disabled={approveMutation.isPending}
              className="text-xs h-8 font-semibold gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <ThumbsUp className="size-3.5" />
              <span>Approve Plan</span>
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 1: THE COMMITMENT HERO CARD (Main Task) */}
      <div className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Target className="size-4" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Main Task (The One Thing to Ship)
              </h2>
              <p className="text-[11px] text-muted-foreground">
                The single primary engineering initiative that must verifiably
                ship this week.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold px-2 py-0.5 rounded border border-border bg-muted/40">
            Strictly 1 Required
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              What will verifiably ship by Friday?
            </label>
            <Input
              value={mainTaskTitle}
              onChange={(e) => setMainTaskTitle(e.target.value)}
              placeholder="e.g. Stripe webhook idempotency key handling with expired card retries verified on sandbox"
              className="text-xs sm:text-sm font-medium h-10"
              disabled={isApproved}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Why does it matter? (Customer impact / Business justification)
              </label>
              <span className="text-[10px] font-mono text-muted-foreground">
                What metric improves?
              </span>
            </div>
            <Textarea
              value={mainTaskWhy}
              onChange={(e) => setMainTaskWhy(e.target.value)}
              placeholder="e.g. Eliminates double-charge chargebacks for recurring subscriptions and unblocks self-serve card updates without support tickets."
              rows={2}
              className="text-xs leading-relaxed"
              disabled={isApproved}
            />
          </div>

          {/* Inline AI Review findings for Main Task */}
          {aiReviewResult &&
            (aiReviewResult.findings ?? [])
              .filter(
                (f) =>
                  f.issue_type === "missing_impact" ||
                  (!f.task_id &&
                    (f.issue_type === "vague_activity" ||
                      f.issue_type === "unrealistic_scope"))
              )
              .map((finding, idx) => (
                <InlineFindingCard
                  key={finding.task_id ?? `main-finding-${idx}`}
                  finding={finding}
                  onApply={() => handleApplyRewrite(finding)}
                />
              ))}

          {/* End-of-week outcome celebration toggle (if approved) */}
          {isApproved && (
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 -mx-6 -mb-6 p-6 rounded-b-2xl">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">
                  Friday Outcome: Did the Main Task Ship?
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Record verifiable production status at the end of the sprint.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={
                    plan?.main_task_shipped === true ? "default" : "outline"
                  }
                  onClick={() => {
                    if (!plan) {
                      return;
                    }
                    outcomeMutation.mutate({
                      orgId: currentOrgId,
                      planId: plan.id,
                      data: { main_task_shipped: true },
                    });
                  }}
                  disabled={outcomeMutation.isPending}
                  className={cn(
                    "h-8 text-xs font-semibold gap-1.5 cursor-pointer",
                    plan?.main_task_shipped === true &&
                      "bg-emerald-600 hover:bg-emerald-700 text-white"
                  )}
                >
                  <Award className="size-3.5" />
                  <span>Shipped 🎉</span>
                </Button>
                <Button
                  size="sm"
                  variant={
                    plan?.main_task_shipped === false
                      ? "destructive"
                      : "outline"
                  }
                  onClick={() => {
                    if (!plan) {
                      return;
                    }
                    outcomeMutation.mutate({
                      orgId: currentOrgId,
                      planId: plan.id,
                      data: { main_task_shipped: false },
                    });
                  }}
                  disabled={outcomeMutation.isPending}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <span>Missed</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setWeekSummaryDialogOpen(true)}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer rounded-full"
                >
                  <Sparkles className="size-3.5 text-foreground" />
                  <span>AI Week Summary</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: DUAL-PILLAR EXECUTION BENTO */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT PILLAR: Tactical Sub-Goals */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-foreground" />
                <h3 className="text-sm font-bold text-foreground">
                  Tactical Sub-Goals
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {subGoals.length} tasks
              </span>
            </div>

            {/* Sub-goals List */}
            <div className="space-y-2 min-h-24">
              {subGoals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground italic">
                  No sub-goals added yet. Add bite-sized deliverables below.
                </div>
              ) : (
                subGoals.map((task, idx) => (
                  <div
                    key={task.id ?? `sub-${idx}`}
                    className="group rounded-xl border border-border bg-background p-3 text-xs flex items-center justify-between gap-2 hover:border-foreground/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {isApproved ? (
                        <button
                          type="button"
                          onClick={() => handleToggleTaskCompleted(task)}
                          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                        >
                          {task.is_completed ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : (
                            <Circle className="size-4" />
                          )}
                        </button>
                      ) : (
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                          {idx + 1}.
                        </span>
                      )}
                      <span
                        className={cn(
                          "truncate font-medium text-foreground",
                          task.is_completed &&
                            "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </span>
                    </div>

                    {!isApproved && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubGoal(idx)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity cursor-pointer"
                        aria-label="Remove sub-goal"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick-add row */}
          {!isApproved && (
            <div className="pt-3 border-t border-border flex items-center gap-2">
              <Input
                value={newSubGoalInput}
                onChange={(e) => setNewSubGoalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubGoal();
                  }
                }}
                placeholder="Add sub-goal (Press Enter)..."
                className="text-xs h-9"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddSubGoal}
                disabled={!newSubGoalInput.trim()}
                className="h-9 px-3 text-xs cursor-pointer shadow-xs"
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* RIGHT PILLAR: Go-To-Market & Release Hygiene */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Flag className="size-4 text-foreground" />
                <h3 className="text-sm font-bold text-foreground">
                  Go-To-Market & Release Hygiene
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {gtmGoals.length} items
              </span>
            </div>

            {/* Quick suggestions chips */}
            {!isApproved && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {GTM_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddSuggestedGtm(s)}
                    className="text-[10px] font-mono rounded-full bg-muted/60 px-2 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer border border-border/60"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* GTM goals List */}
            <div className="space-y-2 min-h-24">
              {gtmGoals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground italic">
                  No GTM tasks yet. Track telemetry, feature flags, and docs.
                </div>
              ) : (
                gtmGoals.map((task, idx) => (
                  <div
                    key={task.id ?? `gtm-${idx}`}
                    className="group rounded-xl border border-border bg-background p-3 text-xs flex items-center justify-between gap-2 hover:border-foreground/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {isApproved ? (
                        <button
                          type="button"
                          onClick={() => handleToggleTaskCompleted(task)}
                          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                        >
                          {task.is_completed ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : (
                            <Circle className="size-4" />
                          )}
                        </button>
                      ) : (
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                          {idx + 1}.
                        </span>
                      )}
                      <span
                        className={cn(
                          "truncate font-medium text-foreground",
                          task.is_completed &&
                            "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </span>
                    </div>

                    {!isApproved && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGtmGoal(idx)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity cursor-pointer"
                        aria-label="Remove GTM goal"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick-add row */}
          {!isApproved && (
            <div className="pt-3 border-t border-border flex items-center gap-2">
              <Input
                value={newGtmGoalInput}
                onChange={(e) => setNewGtmGoalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddGtmGoal();
                  }
                }}
                placeholder="Add release task (Press Enter)..."
                className="text-xs h-9"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddGtmGoal}
                disabled={!newGtmGoalInput.trim()}
                className="h-9 px-3 text-xs cursor-pointer shadow-xs"
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: FORM BOTTOM ACTIONS (Natural page flow, no floating dock) */}
      {!isApproved && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground font-mono">
            <span>{totalTasks} total planned tasks</span>
            <span className="mx-2">&bull;</span>
            <span>
              1 Main + {subGoals.length} Sub + {gtmGoals.length} GTM
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={savePlanMutation.isPending}
              className="text-xs font-medium cursor-pointer shadow-xs rounded-full"
            >
              {savePlanMutation.isPending ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={submitPlanMutation.isPending}
              className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs bg-foreground hover:bg-foreground/90 text-background rounded-full"
            >
              <Send className="size-3.5" />
              <span>Submit for Lead Review</span>
            </Button>
          </div>
        </div>
      )}

      {isApproved && plan && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground font-mono">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
              Plan {plan.status}
            </span>
            <span className="mx-2">&bull;</span>
            <span>
              {completedTasks} of {totalTasks} deliverables completed
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setWeekSummaryDialogOpen(true)}
              className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs bg-foreground hover:bg-foreground/90 text-background rounded-full"
            >
              <Sparkles className="size-3.5" />
              <span>Generate Week Summary</span>
            </Button>
          </div>
        </div>
      )}

      {/* Brain Dump Modal */}
      <BrainDumpDialog
        open={brainDumpDialogOpen}
        onOpenChange={setBrainDumpDialogOpen}
        onApplyDraft={handleApplyBrainDump}
        orgId={currentOrgId}
      />

      {/* Week Summary Modal */}
      {plan && (
        <WeekSummaryDialog
          open={weekSummaryDialogOpen}
          onOpenChange={setWeekSummaryDialogOpen}
          orgId={currentOrgId}
          planId={plan.id}
          weekStartDate={plan.week_start_date}
        />
      )}

      {/* Send Back Comment Dialog (Team Lead only) */}
      <Dialog open={sendBackDialogOpen} onOpenChange={setSendBackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Send Back Plan for Revisions
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide actionable guidance explaining what requires refinement
              before approval.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={sendBackComment}
              onChange={(e) => setSendBackComment(e.target.value)}
              placeholder="e.g. Please clarify what 'Stripe handling' means. Include webhook idempotency and test on sandbox."
              rows={3}
              className="text-xs"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSendBackDialogOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={sendBackMutation.isPending || !sendBackComment.trim()}
              onClick={() => {
                if (!plan) {
                  return;
                }
                sendBackMutation.mutate({
                  orgId: currentOrgId,
                  planId: plan.id,
                  data: { comment: sendBackComment.trim() },
                });
              }}
              className="text-xs cursor-pointer"
            >
              {sendBackMutation.isPending
                ? "Sending..."
                : "Send Back with Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
