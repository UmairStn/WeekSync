import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import {
  History,
  Calendar,
  ArrowRight,
  Clock,
  Target,
  Users2,
  Building2,
} from "lucide-react";
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
  const { currentOrgId, currentOrg, teams, currentTeam, setSelectedMonday } =
    useTenant();

  const [filterTeamId, setFilterTeamId] = useState<string>("all");

  const queryParams =
    filterTeamId !== "all" ? { team_id: filterTeamId } : undefined;

  const { data: history, isLoading } = useListPlanHistory(
    currentOrgId,
    queryParams,
    {
      query: {
        enabled: !!user && !!currentOrgId,
      },
    }
  );

  const plans = history ?? [];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <History className="size-4 text-primary" strokeWidth={2} />
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Commitment Archive &bull; {currentOrg?.name ?? "Organization"}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Weekly Plan History
            </h1>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Review historical commitments, verify shipped deliverables, and
              track team execution consistency over time.
            </p>
          </div>

          {/* Active Context Badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs font-mono">
            <Building2 className="size-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">
              {currentOrg?.name ?? "Acme Corp"}
            </span>
            <span className="text-muted-foreground">&bull;</span>
            <span className="text-muted-foreground">
              {plans.length} {plans.length === 1 ? "plan" : "plans"}
            </span>
          </div>
        </div>

        {/* Team Filter Pills */}
        {teams.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mr-1">
              Filter Team:
            </span>
            <button
              type="button"
              onClick={() => setFilterTeamId("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer border font-mono",
                filterTeamId === "all"
                  ? "bg-foreground text-background font-semibold border-foreground shadow-xs"
                  : "bg-background text-muted-foreground hover:text-foreground border-border"
              )}
            >
              All Teams
            </button>
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterTeamId(t.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer border font-mono",
                  filterTeamId === t.id
                    ? "bg-foreground text-background font-semibold border-foreground shadow-xs"
                    : "bg-background text-muted-foreground hover:text-foreground border-border"
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
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

          const planTeamName =
            teams.find((t) => t.id === plan.team_id)?.name ?? currentTeam?.name;

          const initials = (plan.user_name || "Member")
            .split(" ")
            .map((s) => s.charAt(0))
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div
              key={plan.id}
              className="group rounded-2xl border border-border bg-card p-5 space-y-3.5 transition-all hover:border-foreground/30 hover:shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
                {/* Author & Week info */}
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted font-mono text-[11px] font-bold text-foreground border border-border shrink-0">
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {plan.user_name || "Team Member"}
                      </span>
                      {planTeamName && (
                        <span className="rounded px-1.5 py-0.2 text-[9px] font-mono text-muted-foreground bg-muted/60 border border-border">
                          {planTeamName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mt-0.5">
                      <Calendar className="size-3 text-muted-foreground" />
                      <span className="font-mono text-[11px]">{weekRange}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold border",
                      plan.status === "approved" &&
                        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                      plan.status === "done" &&
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
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground leading-snug">
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

        {plans.length === 0 && !isLoading && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground space-y-3">
            <Clock
              className="mx-auto size-8 text-muted-foreground"
              strokeWidth={1.5}
            />
            <p className="font-semibold text-foreground text-sm">
              {filterTeamId !== "all"
                ? `No historical plans for ${teams.find((t) => t.id === filterTeamId)?.name ?? "selected team"}`
                : "No historical plans found"}
            </p>
            <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {filterTeamId !== "all"
                ? "This squad does not have any weekly commitments recorded yet. Switch to 'All Teams' or 'Engineering' to see historical plans."
                : "If you just signed up with a new test account, switch to 'Acme Corp' in the sidebar to review the 16 pre-seeded weekly plans."}
            </p>
            {filterTeamId !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterTeamId("all")}
                className="text-xs mt-1 cursor-pointer"
              >
                <Users2 className="size-3 mr-1" />
                View All Teams
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
