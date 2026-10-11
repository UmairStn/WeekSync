import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ThumbsUp,
  Flag,
  Users2,
} from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/contexts/tenant-context";
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
        enabled: !!currentOrgId && !!currentTeamId && !!selectedMonday,
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
      <div className="rounded-xl border border-border bg-card p-12 text-center space-y-3">
        <Users2
          className="mx-auto size-8 text-muted-foreground"
          strokeWidth={1.5}
        />
        <h2 className="text-base font-semibold text-foreground">
          No team selected
        </h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Please select a team in the sidebar to view the team rollup.
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
    <div className="space-y-6">
      {/* Header & Week Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Team Rollup &bull; {currentTeam?.name}
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

        {/* Lead status badge */}
        {isTeamLead && (
          <div className="flex items-center gap-2 rounded-lg border border-[#EDF3EC] bg-[#EDF3EC]/30 px-3 py-1.5 text-xs text-[#346538]">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="font-medium">You are the Team Lead</span>
          </div>
        )}
      </div>

      {/* Summary KPI Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[11px] font-mono uppercase text-muted-foreground">
            Team Members
          </p>
          <p className="font-mono text-xl font-semibold text-foreground">
            {members.length}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[11px] font-mono uppercase text-muted-foreground">
            Submitted Plans
          </p>
          <p className="font-mono text-xl font-semibold text-foreground">
            {submittedCount}/{members.length}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[11px] font-mono uppercase text-muted-foreground">
            Approved Plans
          </p>
          <p className="font-mono text-xl font-semibold text-[#1F6C9F]">
            {approvedCount}/{members.length}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[11px] font-mono uppercase text-muted-foreground">
            Goals Shipped
          </p>
          <p className="font-mono text-xl font-semibold text-[#346538]">
            {shippedCount}
          </p>
        </div>
      </div>

      {/* Team Member Weekly Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Member Plans for this Week
          </h2>
          <span className="text-xs text-muted-foreground">
            {members.length} members in team
          </span>
        </div>

        {members.map((member) => {
          const totalTasks = member.total_tasks ?? 0;
          const completedTasks = member.completed_tasks ?? 0;

          return (
            <div
              key={member.user_id}
              className="rounded-xl border border-border bg-card p-5 space-y-4 transition-all hover:border-foreground/20"
            >
              {/* Member Row Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground">
                    {member.first_name.charAt(0)}
                    {member.last_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {member.first_name} {member.last_name}
                      </span>
                      {member.is_lead && (
                        <span className="rounded-full bg-[#E1F3FE] px-2 py-0.5 text-[9px] font-mono uppercase text-[#1F6C9F]">
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
                        "rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider font-medium",
                        member.status === "approved" &&
                          "bg-[#EDF3EC] text-[#346538]",
                        member.status === "submitted" &&
                          "bg-[#E1F3FE] text-[#1F6C9F]",
                        member.status === "draft" &&
                          "bg-[#FBF3DB] text-[#956400]",
                        member.status === "sent_back" &&
                          "bg-[#FDEBEC] text-[#9F2F2D]"
                      )}
                    >
                      {member.status.replace("_", " ")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
                      NO PLAN YET
                    </span>
                  )}

                  {member.main_task_shipped !== null &&
                    member.main_task_shipped !== undefined && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-mono",
                          member.main_task_shipped
                            ? "bg-[#EDF3EC] text-[#346538]"
                            : "bg-[#FDEBEC] text-[#9F2F2D]"
                        )}
                      >
                        {member.main_task_shipped ? "Shipped" : "Missed"}
                      </span>
                    )}

                  {/* Team Lead Inline Actions for submitted plans */}
                  {isTeamLead &&
                    member.plan_id &&
                    member.status === "submitted" && (
                      <div className="flex items-center gap-1.5 border-l border-border pl-2.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (member.plan_id) {
                              setSelectedPlanForSendBack(member.plan_id);
                            }
                          }}
                          disabled={sendBackMutation.isPending}
                          className="h-7 text-[11px] px-2 text-[#9F2F2D] hover:bg-[#FDEBEC]"
                        >
                          Send Back
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (member.plan_id) {
                              approveMutation.mutate({
                                orgId: currentOrgId,
                                planId: member.plan_id,
                              });
                            }
                          }}
                          disabled={approveMutation.isPending}
                          className="h-7 text-[11px] px-2.5 bg-foreground text-background hover:bg-foreground/90 font-medium"
                        >
                          <ThumbsUp className="size-3 mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                </div>
              </div>

              {/* Main Task Preview */}
              {member.main_task_title ? (
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <Flag className="size-3.5 mt-0.5 text-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {member.main_task_title}
                      </p>
                      {member.main_task_why && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-medium text-foreground/80">
                            Why it matters:{" "}
                          </span>
                          {member.main_task_why}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress & Task counts */}
                  <div className="flex items-center justify-between pt-2 text-[11px] font-mono text-muted-foreground">
                    <span>
                      {completedTasks} of {totalTasks} tasks completed
                    </span>
                    <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-foreground transition-all duration-300"
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
                <p className="text-xs text-muted-foreground italic">
                  Member has not drafted a plan for this week yet.
                </p>
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
            No members in this team yet. Add members in the settings tab.
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
            <DialogTitle className="text-sm font-semibold">
              Send Plan Back with Comments
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Explain why this weekly plan needs adjustments or more detail.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={sendBackComment}
              onChange={(e) => setSendBackComment(e.target.value)}
              placeholder="e.g. Please clarify the business outcome on the main goal, and add documentation to GTM goals."
              rows={3}
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPlanForSendBack(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
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
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Send Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
