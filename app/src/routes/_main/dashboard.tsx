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
} from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/contexts/tenant-context";
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

function WeeklyPlanPage() {
  const queryClient = useQueryClient();
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

  // 1. Fetch Plan for selected week
  const { data: plan } = useGetMyPlan(
    currentOrgId,
    {
      week_start_date: selectedMonday,
    },
    {
      query: {
        enabled: !!currentOrgId && !!selectedMonday,
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

  // Review modal state (for team leads)
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
  const [sendBackComment, setSendBackComment] = useState("");

  // AI Feature State
  const [brainDumpDialogOpen, setBrainDumpDialogOpen] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<PlanReviewResult | null>(
    null
  );
  const [aiReviewError, setAiReviewError] = useState<string | null>(null);

  const aiReviewMutation = useAiPlanReview({
    mutation: {
      onSuccess: (data) => {
        setAiReviewResult(data);
        setAiReviewError(null);
        if (data.ready_to_submit || data.verdict === "approve") {
          toast.success(
            "AI review complete: Plan looks solid and ready for submission!"
          );
        } else {
          toast.info(
            "AI review complete: Check recommended refinements below."
          );
        }
      },
      onError: (err: unknown) => {
        const msg = getErrorMessage(
          err,
          "AI review is temporarily unavailable. You can still save and submit your plan manually."
        );
        setAiReviewError(msg);
        toast.error(msg);
      },
    },
  });

  // Sync server plan state into local form
  useEffect(() => {
    if (plan) {
      const mainTask = plan.tasks.find((t) => t.category === "main");
      setMainTaskTitle(mainTask?.title ?? "");
      setMainTaskWhy(mainTask?.why_it_matters ?? "");

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
  }, [plan]);

  // Mutations
  const savePlanMutation = useCreateOrUpdatePlan({
    mutation: {
      onSuccess: () => {
        toast.success("Plan saved successfully");
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
        toast.success("Plan submitted for review!");
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
        toast.success("Plan sent back with comments");
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
        toast.success("Outcome recorded");
        queryClient.invalidateQueries();
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
    (plan ? 1 : 0) + (subGoals.length || 0) + (gtmGoals.length || 0);
  const completedTasks = plan?.tasks.filter((t) => t.is_completed).length || 0;

  if (!currentTeamId) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center space-y-3">
        <AlertCircle
          className="mx-auto size-8 text-muted-foreground"
          strokeWidth={1.5}
        />
        <h2 className="text-base font-semibold text-foreground">
          No team selected
        </h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Please select or create a team in the sidebar to begin weekly
          planning.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigator & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {currentTeam?.name} &bull; Week of
            </span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {selectedMonday}
            </span>
            {isCurrentWeek && (
              <span className="rounded-full bg-[#EDF3EC] px-2 py-0.5 text-[10px] font-mono text-[#346538]">
                CURRENT
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-normal tracking-tight text-foreground">
              {formattedWeekLabel}
            </h1>
            <div className="flex items-center gap-1 border border-border rounded-md bg-card p-0.5">
              <button
                type="button"
                onClick={goToPreviousWeek}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Previous Week"
              >
                <ChevronLeft className="size-4" />
              </button>
              {!isCurrentWeek && (
                <button
                  type="button"
                  onClick={goToCurrentWeek}
                  className="px-2 py-0.5 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                >
                  This Week
                </button>
              )}
              <button
                type="button"
                onClick={goToNextWeek}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Next Week"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Plan Status Pill & AI Actions */}
        <div className="flex items-center gap-3">
          {plan ? (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-mono uppercase tracking-wider font-medium",
                  plan.status === "approved" && "bg-[#EDF3EC] text-[#346538]",
                  plan.status === "submitted" && "bg-[#E1F3FE] text-[#1F6C9F]",
                  plan.status === "draft" && "bg-[#FBF3DB] text-[#956400]",
                  plan.status === "sent_back" && "bg-[#FDEBEC] text-[#9F2F2D]"
                )}
              >
                {plan.status.replace("_", " ")}
              </span>

              {plan.status === "approved" &&
                plan.main_task_shipped !== null && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-mono",
                      plan.main_task_shipped
                        ? "bg-[#EDF3EC] text-[#346538]"
                        : "bg-[#FDEBEC] text-[#9F2F2D]"
                    )}
                  >
                    {plan.main_task_shipped ? "Goal Shipped" : "Goal Missed"}
                  </span>
                )}
            </div>
          ) : (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              NOT CREATED
            </span>
          )}

          {/* AI Action Buttons */}
          {plan?.status !== "approved" && (
            <div className="flex items-center gap-2 border-l border-border pl-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBrainDumpDialogOpen(true)}
                className="h-8 gap-1.5 text-xs font-medium border-border hover:bg-muted cursor-pointer"
              >
                <Sparkles className="size-3.5 text-primary" />
                <span>Draft with AI</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTriggerAiReview}
                disabled={aiReviewMutation.isPending}
                className="h-8 gap-1.5 text-xs font-medium border-border hover:bg-muted cursor-pointer"
              >
                {aiReviewMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Reviewing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 text-primary" />
                    <span>AI Review</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Progress metric */}
          {plan && plan.tasks.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-muted-foreground border-l border-border pl-3">
              <span>
                {completedTasks}/{totalTasks}
              </span>
              <span>ticked</span>
            </div>
          )}
        </div>
      </div>

      {/* Fallback Banner for AI errors */}
      {aiReviewError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">AI Assistant Notice</p>
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
      {plan?.status === "sent_back" && plan.review_comment && (
        <div className="rounded-lg border border-[#FDEBEC] bg-[#FDEBEC]/30 p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-[#9F2F2D]">
            <RotateCcw className="size-4" />
            <span>Sent back by Team Lead for revisions</span>
          </div>
          <p className="text-xs text-foreground/80 pl-6 italic">
            &ldquo;{plan.review_comment}&rdquo;
          </p>
        </div>
      )}

      {/* Review Banner for Team Leads (if submitted) */}
      {isTeamLead && plan?.status === "submitted" && (
        <div className="flex items-center justify-between rounded-lg border border-[#E1F3FE] bg-[#E1F3FE]/20 p-4">
          <div className="flex items-center gap-2.5">
            <Clock className="size-4 text-[#1F6C9F]" />
            <div>
              <p className="text-xs font-semibold text-[#1F6C9F]">
                Plan awaiting your review
              </p>
              <p className="text-[11px] text-muted-foreground">
                As the Team Lead, verify this week&apos;s goals and approve or
                send back.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSendBackDialogOpen(true)}
              disabled={sendBackMutation.isPending}
              className="text-xs h-8 border-border text-[#9F2F2D] hover:bg-[#FDEBEC]"
            >
              Send Back...
            </Button>
            <Button
              size="sm"
              onClick={() =>
                approveMutation.mutate({
                  orgId: currentOrgId,
                  planId: plan.id,
                })
              }
              disabled={approveMutation.isPending}
              className="text-xs h-8 bg-foreground text-background hover:bg-foreground/90 font-medium"
            >
              <ThumbsUp className="size-3.5 mr-1.5" />
              Approve Plan
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 1: THE MAIN TASK (Single Primary Goal) */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Flag className="size-4 text-foreground" strokeWidth={2} />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Main Task (The One Thing to Ship)
            </h2>
          </div>
          <span className="text-[11px] font-mono uppercase text-muted-foreground">
            Strictly 1 Required
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              What will ship this week?
            </label>
            <Input
              value={mainTaskTitle}
              onChange={(e) => setMainTaskTitle(e.target.value)}
              placeholder="e.g. Multi-tenant database migrations & access isolation"
              className="text-xs font-medium"
              disabled={plan?.status === "approved"}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Why does it matter? (Strategic business impact)
            </label>
            <Textarea
              value={mainTaskWhy}
              onChange={(e) => setMainTaskWhy(e.target.value)}
              placeholder="e.g. Unblocks SOC2 compliance certification and prevents customer cross-tenant data leaks."
              rows={2}
              className="text-xs"
              disabled={plan?.status === "approved"}
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

          {/* End-of-week outcome toggle (if approved) */}
          {plan?.status === "approved" && (
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">
                  End of Week Outcome
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Did the main task actually ship by the end of the week?
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={
                    plan.main_task_shipped === true ? "default" : "outline"
                  }
                  onClick={() =>
                    outcomeMutation.mutate({
                      orgId: currentOrgId,
                      planId: plan.id,
                      data: { main_task_shipped: true },
                    })
                  }
                  className={cn(
                    "h-7 text-xs",
                    plan.main_task_shipped === true &&
                      "bg-[#EDF3EC] text-[#346538] hover:bg-[#EDF3EC]/80 border-0"
                  )}
                >
                  Yes, Shipped
                </Button>
                <Button
                  size="sm"
                  variant={
                    plan.main_task_shipped === false ? "default" : "outline"
                  }
                  onClick={() =>
                    outcomeMutation.mutate({
                      orgId: currentOrgId,
                      planId: plan.id,
                      data: { main_task_shipped: false },
                    })
                  }
                  className={cn(
                    "h-7 text-xs",
                    plan.main_task_shipped === false &&
                      "bg-[#FDEBEC] text-[#9F2F2D] hover:bg-[#FDEBEC]/80 border-0"
                  )}
                >
                  No, Missed
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: SUB-GOALS (Execution Checklist) */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Sub-Goals
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Smaller engineering and design deliverables supporting the main
              task.
            </p>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            {subGoals.filter((s) => s.is_completed).length}/{subGoals.length}{" "}
            done
          </span>
        </div>

        {/* Existing sub-goals list */}
        <div className="space-y-2">
          {subGoals.map((sub, idx) => (
            <div key={sub.id || idx} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-2.5 bg-background transition-colors hover:bg-muted/30">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleTaskCompleted(sub)}
                    disabled={!plan || plan.status === "draft"}
                    className="text-foreground shrink-0 transition-transform active:scale-90"
                  >
                    {sub.is_completed ? (
                      <CheckCircle2
                        className="size-4 text-[#346538]"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Circle
                        className="size-4 text-muted-foreground"
                        strokeWidth={1.5}
                      />
                    )}
                  </button>
                  <span
                    className={cn(
                      "text-xs truncate font-medium",
                      sub.is_completed && "line-through text-muted-foreground"
                    )}
                  >
                    {sub.title}
                  </span>
                </div>

                {plan?.status !== "approved" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSubGoal(idx)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Inline AI Review finding for this Sub-Goal */}
              {aiReviewResult &&
                (aiReviewResult.findings ?? [])
                  .filter(
                    (f) =>
                      (f.task_id && f.task_id === sub.id) ||
                      (!f.task_id &&
                        f.task &&
                        f.task.toLowerCase().trim() ===
                          sub.title.toLowerCase().trim())
                  )
                  .map((finding, fIdx) => (
                    <InlineFindingCard
                      key={finding.task_id ?? `sub-finding-${idx}-${fIdx}`}
                      finding={finding}
                      onApply={() => handleApplyRewrite(finding)}
                    />
                  ))}
            </div>
          ))}

          {subGoals.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-2">
              No sub-goals added yet.
            </p>
          )}
        </div>

        {/* Add sub-goal input */}
        {plan?.status !== "approved" && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newSubGoalInput}
              onChange={(e) => setNewSubGoalInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubGoal()}
              placeholder="Add sub-goal..."
              className="text-xs h-8"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddSubGoal}
              className="h-8 text-xs shrink-0"
            >
              <Plus className="size-3.5 mr-1" />
              Add
            </Button>
          </div>
        )}
      </div>

      {/* SECTION 3: GO-TO-MARKET GOALS */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Go-to-Market (GTM) Goals
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Documentation, release notes, demos, customer comms, or marketing
              announcements.
            </p>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            {gtmGoals.filter((g) => g.is_completed).length}/{gtmGoals.length}{" "}
            done
          </span>
        </div>

        {/* Existing GTM goals list */}
        <div className="space-y-2">
          {gtmGoals.map((gtm, idx) => (
            <div key={gtm.id || idx} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-2.5 bg-background transition-colors hover:bg-muted/30">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleTaskCompleted(gtm)}
                    disabled={!plan || plan.status === "draft"}
                    className="text-foreground shrink-0 transition-transform active:scale-90"
                  >
                    {gtm.is_completed ? (
                      <CheckCircle2
                        className="size-4 text-[#346538]"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Circle
                        className="size-4 text-muted-foreground"
                        strokeWidth={1.5}
                      />
                    )}
                  </button>
                  <span
                    className={cn(
                      "text-xs truncate font-medium",
                      gtm.is_completed && "line-through text-muted-foreground"
                    )}
                  >
                    {gtm.title}
                  </span>
                </div>

                {plan?.status !== "approved" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveGtmGoal(idx)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Inline AI Review finding for this GTM Goal */}
              {aiReviewResult &&
                (aiReviewResult.findings ?? [])
                  .filter(
                    (f) =>
                      (f.task_id && f.task_id === gtm.id) ||
                      (!f.task_id &&
                        f.task &&
                        f.task.toLowerCase().trim() ===
                          gtm.title.toLowerCase().trim())
                  )
                  .map((finding, fIdx) => (
                    <InlineFindingCard
                      key={finding.task_id ?? `gtm-finding-${idx}-${fIdx}`}
                      finding={finding}
                      onApply={() => handleApplyRewrite(finding)}
                    />
                  ))}
            </div>
          ))}

          {/* Missing GTM goal finding alert */}
          {aiReviewResult &&
            (aiReviewResult.findings ?? [])
              .filter((f) => f.issue_type === "missing_gtm")
              .map((finding, fIdx) => (
                <InlineFindingCard
                  key={finding.task_id ?? `gtm-missing-${fIdx}`}
                  finding={finding}
                  onApply={() => handleApplyRewrite(finding)}
                />
              ))}

          {gtmGoals.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-2">
              No GTM goals added yet.
            </p>
          )}
        </div>

        {/* Add GTM goal input */}
        {plan?.status !== "approved" && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newGtmGoalInput}
              onChange={(e) => setNewGtmGoalInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddGtmGoal()}
              placeholder="Add GTM goal (e.g. publish release note, update docs)..."
              className="text-xs h-8"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddGtmGoal}
              className="h-8 text-xs shrink-0"
            >
              <Plus className="size-3.5 mr-1" />
              Add
            </Button>
          </div>
        )}
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="text-xs text-muted-foreground">
          {plan?.status === "approved" ? (
            <span>
              Plan is approved. Tasks can be ticked done throughout the week.
            </span>
          ) : plan?.status === "submitted" ? (
            <span>Plan is submitted and awaiting team lead review.</span>
          ) : (
            <span>
              Save as draft or submit when you&apos;re ready for lead review.
            </span>
          )}
        </div>

        {plan?.status !== "approved" && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTriggerAiReview}
              disabled={aiReviewMutation.isPending}
              className="text-xs h-9 gap-1.5 border-border hover:bg-muted cursor-pointer"
            >
              {aiReviewMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Reviewing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5 text-primary" />
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
              className="text-xs h-9 cursor-pointer"
            >
              {savePlanMutation.isPending ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={
                submitPlanMutation.isPending || savePlanMutation.isPending
              }
              className="text-xs h-9 bg-foreground text-background hover:bg-foreground/90 font-medium cursor-pointer"
            >
              <Send className="size-3.5 mr-1.5" />
              {submitPlanMutation.isPending
                ? "Submitting..."
                : "Submit for Review"}
            </Button>
          </div>
        )}
      </div>

      {/* Send Back Dialog */}
      <Dialog open={sendBackDialogOpen} onOpenChange={setSendBackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Send Plan Back for Revisions
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide feedback for the team member on what needs clarification
              or adjustment.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={sendBackComment}
              onChange={(e) => setSendBackComment(e.target.value)}
              placeholder="e.g. The main task needs a clearer definition of done, and please add docs to GTM goals."
              rows={3}
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSendBackDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!plan) {
                  return;
                }
                sendBackMutation.mutate({
                  orgId: currentOrgId,
                  planId: plan.id,
                  data: {
                    comment: sendBackComment.trim() || undefined,
                  },
                });
              }}
              disabled={sendBackMutation.isPending}
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Send Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brain Dump Dialog */}
      <BrainDumpDialog
        open={brainDumpDialogOpen}
        onOpenChange={setBrainDumpDialogOpen}
        onApplyDraft={handleApplyBrainDump}
        orgId={currentOrgId}
      />
    </div>
  );
}
