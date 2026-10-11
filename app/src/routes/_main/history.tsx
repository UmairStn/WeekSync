import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { History, Calendar, Flag, ArrowRight, Clock } from "lucide-react";
import { useTenant } from "@/contexts/tenant-context";
import { useListPlanHistory } from "@/api/endpoints/plans/plans";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_main/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { currentOrgId, currentTeam, currentTeamId, setSelectedMonday } =
    useTenant();

  const { data: history } = useListPlanHistory(
    currentOrgId,
    { team_id: currentTeamId },
    {
      query: {
        enabled: !!currentOrgId && !!currentTeamId,
      },
    }
  );

  const plans = history ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-5 space-y-1">
        <div className="flex items-center gap-2">
          <History className="size-4 text-foreground" strokeWidth={2} />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Archive &bull; {currentTeam?.name}
          </span>
        </div>
        <h1 className="font-serif text-2xl font-normal tracking-tight text-foreground">
          Weekly Plan History
        </h1>
        <p className="text-xs text-muted-foreground">
          Browse past weekly plans, shipped outcomes, and track consistency over
          time.
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
              className="rounded-xl border border-border bg-card p-5 space-y-3 transition-colors hover:border-foreground/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {weekRange}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider font-medium",
                      plan.status === "approved" &&
                        "bg-[#EDF3EC] text-[#346538]",
                      plan.status === "submitted" &&
                        "bg-[#E1F3FE] text-[#1F6C9F]",
                      plan.status === "draft" && "bg-[#FBF3DB] text-[#956400]",
                      plan.status === "sent_back" &&
                        "bg-[#FDEBEC] text-[#9F2F2D]"
                    )}
                  >
                    {plan.status.replace("_", " ")}
                  </span>

                  {plan.main_task_shipped !== null && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-mono",
                        plan.main_task_shipped
                          ? "bg-[#EDF3EC] text-[#346538]"
                          : "bg-[#FDEBEC] text-[#9F2F2D]"
                      )}
                    >
                      {plan.main_task_shipped ? "Goal Shipped" : "Goal Missed"}
                    </span>
                  )}
                </div>
              </div>

              {/* Main task summary */}
              {mainTask && (
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <Flag className="size-3.5 mt-0.5 text-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {mainTask.title}
                      </p>
                      {mainTask.why_it_matters && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {mainTask.why_it_matters}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer info & jump button */}
              <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-muted-foreground">
                <span>
                  {completedTasks}/{totalTasks} tasks completed
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedMonday(plan.week_start_date);
                    // navigate to dashboard
                    window.location.href = "/dashboard";
                  }}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  View Plan <ArrowRight className="size-3 ml-1" />
                </Button>
              </div>
            </div>
          );
        })}

        {plans.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-xs text-muted-foreground space-y-2">
            <Clock
              className="mx-auto size-8 text-muted-foreground"
              strokeWidth={1.5}
            />
            <p className="font-medium text-foreground">
              No past plans recorded yet
            </p>
            <p className="text-muted-foreground">
              Once you start creating and completing weekly plans, your history
              will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
