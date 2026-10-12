import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ThumbsUp,
  Users2,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/contexts/tenant-context";
import { useCurrentUser } from "@/contexts/user-context";
import {
  useGetTeamWeek,
  useApprovePlan,
  useSendBackPlan,
} from "@/api/endpoints/plans/plans";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, getErrorMessage } from "@/lib/utils";
import type { MemberWeeklyStatus } from "@/api/model";

export const Route = createFileRoute("/_main/team")({
  component: TeamWeekPage,
});

function TeamWeekPage() {
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

  const user = useCurrentUser();

  // Send Back dialog state
  const [selectedPlanForSendBack, setSelectedPlanForSendBack] = useState<
    string | null
  >(null);
  const [sendBackComment, setSendBackComment] = useState("");

  // Fetch Team's Week Rollup
  const { data: teamWeek } = useGetTeamWeek(
    currentOrgId,
    currentTeamId,
    { week_start_date: selectedMonday },
    {
      query: {
        enabled:
          !!user && !!currentOrgId && !!currentTeamId && !!selectedMonday,
      },
    }
  );

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
        setSelectedPlanForSendBack(null);
        setSendBackComment("");
        queryClient.invalidateQueries();
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err, "Send back failed"));
      },
    },
  });

  if (!currentTeamId) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3 shadow-xs">
        <Users2
          className="mx-auto size-8 text-muted-foreground"
          strokeWidth={1.5}
        />
        <h2 className="text-base font-semibold text-foreground">
          No team selected
        </h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Please select a team in the sidebar to inspect the weekly team rollup.
        </p>
      </div>
    );
  }

  const members: MemberWeeklyStatus[] = teamWeek?.members ?? [];
  const submittedCount = members.filter(
    (m) => m.status && m.status !== "draft"
  ).length;
  const approvedCount = members.filter((m) => m.status === "approved").length;
  const shippedCount = members.filter(
    (m) => m.main_task_shipped === true
  ).length;

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header & Week Navigator */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Team Rollup &bull; {currentTeam?.name}
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

              <div className="flex items-center gap-1 border border-border rounded-lg bg-background p-0.5">
                <button
                  type="button"
                  onClick={goToPreviousWeek}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Previous Week"
                  aria-label="Previous Week"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {!isCurrentWeek && (
                  <button
                    type="button"
                    onClick={goToCurrentWeek}
                    className="px-2.5 py-1 text-[11px] font-mono font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                  >
                    Current
                  </button>
                )}
                <button
                  type="button"
                  onClick={goToNextWeek}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Next Week"
                  aria-label="Next Week"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Lead badge */}
          {isTeamLead && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground font-medium shrink-0">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>Team Lead Access</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Team Health KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Team Roster
          </p>
          <p className="font-mono text-2xl font-bold text-foreground">
            {members.length}
          </p>
          <p className="text-[10px] text-muted-foreground">Active engineers</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Submitted Plans
          </p>
          <p className="font-mono text-2xl font-bold text-foreground">
            {submittedCount}/{members.length}
          </p>
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${members.length > 0 ? (submittedCount / members.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Approved Plans
          </p>
          <p className="font-mono text-2xl font-bold text-primary">
            {approvedCount}/{members.length}
          </p>
          <p className="text-[10px] text-muted-foreground">Lead verified</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Goals Shipped
          </p>
          <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {shippedCount}
          </p>
          <p className="text-[10px] text-muted-foreground">Friday results</p>
        </div>
      </div>

      {/* 3. Team Member Weekly Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-tight text-foreground">
            Member Commitments for this Week
          </h2>
          <span className="text-xs font-mono text-muted-foreground">
            {members.length} engineers in team
          </span>
        </div>

        {members.map((member) => {
          const totalTasks = member.total_tasks ?? 0;
          const completedTasks = member.completed_tasks ?? 0;

          return (
            <div
              key={member.user_id}
              className="group rounded-2xl border border-border bg-card p-6 space-y-4 transition-all hover:border-primary/40 hover:shadow-xs"
            >
              {/* Member Row Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold font-mono">
                    {member.first_name.charAt(0)}
                    {member.last_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {member.first_name} {member.last_name}
                      </span>
                      {member.is_lead && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-mono uppercase font-semibold text-primary border border-primary/20">
                          LEAD
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Pills & Lead Actions */}
                <div className="flex items-center gap-2.5">
                  {member.status ? (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold border",
                        member.status === "approved" &&
                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                        member.status === "submitted" &&
                          "bg-primary/10 text-primary border-primary/20",
                        member.status === "draft" &&
                          "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
                        member.status === "sent_back" &&
                          "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      )}
                    >
                      {member.status.replace("_", " ")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground border border-border">
                      NO PLAN DRAFTED
                    </span>
                  )}

                  {member.main_task_shipped !== null &&
                    member.main_task_shipped !== undefined && (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-mono border font-semibold",
                          member.main_task_shipped
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        )}
                      >
                        {member.main_task_shipped ? "Shipped 🎉" : "Missed"}
                      </span>
                    )}

                  {/* Team Lead Inline Actions for submitted plans */}
                  {isTeamLead &&
                    member.plan_id &&
                    member.status === "submitted" && (
                      <div className="flex items-center gap-1.5 border-l border-border pl-3">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            if (member.plan_id) {
                              setSelectedPlanForSendBack(member.plan_id);
                            }
                          }}
                          disabled={sendBackMutation.isPending}
                          className="text-[11px] px-2 text-rose-600 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                        >
                          Send Back
                        </Button>
                        <Button
                          size="xs"
                          onClick={() => {
                            if (member.plan_id) {
                              approveMutation.mutate({
                                orgId: currentOrgId,
                                planId: member.plan_id,
                              });
                            }
                          }}
                          disabled={approveMutation.isPending}
                          className="text-[11px] px-2.5 font-semibold gap-1 cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <ThumbsUp className="size-3 mr-0.5" />
                          Approve
                        </Button>
                      </div>
                    )}
                </div>
              </div>

              {/* Main Task Commitment Preview */}
              {member.main_task_title ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Target className="size-4 text-primary shrink-0" />
                      <p className="text-xs sm:text-sm font-semibold text-foreground">
                        {member.main_task_title}
                      </p>
                    </div>
                    {member.main_task_why && (
                      <p className="text-xs text-muted-foreground pl-6 leading-relaxed">
                        <span className="font-semibold text-foreground/80">
                          Why it matters:{" "}
                        </span>
                        {member.main_task_why}
                      </p>
                    )}
                  </div>

                  {/* Progress & Task counts */}
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>
                      {completedTasks} of {totalTasks} deliverables verified
                    </span>
                    <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${
                            totalTasks > 0
                              ? Math.round((completedTasks / totalTasks) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic pl-2">
                  Engineer has not created a plan for this week yet.
                </p>
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground">
            No members in this team yet. Add members in the Organization
            Settings tab.
          </div>
        )}
      </div>

      {/* Send Back Dialog */}
      <Dialog
        open={!!selectedPlanForSendBack}
        onOpenChange={(open) => !open && setSelectedPlanForSendBack(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Send Plan Back with Feedback
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
              placeholder="e.g. Please clarify what 'Stripe handling' means. Include webhook idempotency and sandbox tests."
              rows={3}
              className="text-xs leading-relaxed"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPlanForSendBack(null)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (!selectedPlanForSendBack) {
                  return;
                }
                sendBackMutation.mutate({
                  orgId: currentOrgId,
                  planId: selectedPlanForSendBack,
                  data: {
                    comment: sendBackComment.trim() || undefined,
                  },
                });
              }}
              disabled={sendBackMutation.isPending}
              className="text-xs cursor-pointer"
            >
              Confirm Send Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
