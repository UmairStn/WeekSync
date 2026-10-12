import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { History, Calendar, ArrowRight, Clock, Target } from "lucide-react";
import { useTenant } from "@/contexts/tenant-context";
import { useCurrentUser } from "@/contexts/user-context";
import { useListPlanHistory } from "@/api/endpoints/plans/plans";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_main/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { currentOrgId, currentTeam, currentTeamId, setSelectedMonday } =
    useTenant();

  const { data: history } = useListPlanHistory(
    currentOrgId,
    { team_id: currentTeamId },
    {
      query: {
        enabled: !!user && !!currentOrgId && !!currentTeamId,
      },
    }
  );

  const plans = history ?? [];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-1.5">
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" strokeWidth={2} />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Archive &bull; {currentTeam?.name}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Weekly Plan History
        </h1>
        <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
          Review historical commitments, verify shipped deliverables, and track
          consistency over time.
        </p>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {plans.map((plan) => {
          const mainTask = plan.tasks.find((t) => t.category === "main");
          const totalTasks = plan.tasks.length;
          const completedTasks = plan.tasks.filter(
            (t) => t.is_completed
          ).length;

          const mondayDate = parseISO(plan.week_start_date);
          const sundayDate = new Date(mondayDate);
          sundayDate.setDate(sundayDate.getDate() + 6);
          const weekRange = `${format(mondayDate, "MMM d")} – ${format(
            sundayDate,
            "MMM d, yyyy"
          )}`;

          return (
            <div
              key={plan.id}
              className="group rounded-2xl border border-border bg-card p-5 space-y-3.5 transition-all hover:border-foreground/30 hover:shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="font-mono text-xs font-bold text-foreground">
                    {weekRange}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold border",
                      plan.status === "approved" &&
                        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                      plan.status === "submitted" &&
                        "bg-secondary text-secondary-foreground border border-secondary",
                      plan.status === "draft" &&
                        "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
                      plan.status === "sent_back" &&
                        "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    )}
                  >
                    {plan.status.replace("_", " ")}
                  </span>

                  {plan.main_task_shipped !== null && (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-mono border font-semibold",
                        plan.main_task_shipped
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      )}
                    >
                      {plan.main_task_shipped ? "Shipped 🎉" : "Missed"}
                    </span>
                  )}
                </div>
              </div>

              {/* Main task summary */}
              {mainTask && (
                <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-1">
                  <div className="flex items-start gap-2">
                    <Target className="size-3.5 mt-0.5 text-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {mainTask.title}
                      </p>
                      {mainTask.why_it_matters && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {mainTask.why_it_matters}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer info & jump button */}
              <div className="flex items-center justify-between pt-1 text-xs font-mono text-muted-foreground">
                <span>
                  {completedTasks}/{totalTasks} deliverables completed
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setSelectedMonday(plan.week_start_date);
                    navigate({ to: "/dashboard" });
                  }}
                  className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <span>Open Week</span>
                  <ArrowRight className="size-3" />
                </Button>
              </div>
            </div>
          );
        })}

        {plans.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground space-y-2">
            <Clock
              className="mx-auto size-8 text-muted-foreground"
              strokeWidth={1.5}
            />
            <p className="font-semibold text-foreground">
              No historical plans found
            </p>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Once you start creating and submitting weekly commitments, your
              plan archive will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
