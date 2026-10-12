import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Building2,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useCurrentUser } from "@/contexts/user-context";
import { useUserList } from "@/api/endpoints/users/users";
import { useListInternalOrganizations } from "@/api/endpoints/orgs/orgs";
import { useGetAiUsageOverview } from "@/api/endpoints/ai-usage/ai-usage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/_main/dashboard")({
  component: DashboardPage,
});

export function DashboardPage() {
  const user = useCurrentUser();
  const { data: users } = useUserList({ limit: 1, offset: 0 });
  const { data: orgs } = useListInternalOrganizations({ limit: 1, offset: 0 });
  const { data: aiUsage } = useGetAiUsageOverview({ recent_limit: 5 });

  const totalCalls = aiUsage?.total_calls ?? 0;
  const successRate =
    totalCalls > 0 ? ((aiUsage?.success_calls ?? 0) / totalCalls) * 100 : 100;

  return (
    <div className="space-y-6">
      {/* Tactical Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-xl font-bold uppercase tracking-wider">
              Platform Command
            </h1>
            <span className="rounded bg-destructive/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-destructive border border-destructive/30">
              Staff Only
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground font-mono">
            WeekSync platform operations, tenant fleet telemetry, and AI quota
            surveillance.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-500" />
          <span>Operator: {user?.email}</span>
        </div>
      </div>

      {/* Fleet Summary KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Organizations Card */}
        <Card className="border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-[11px] uppercase flex items-center justify-between">
              Tenant Fleet
              <Building2 className="size-4 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="font-mono text-3xl font-bold">
              {orgs ? orgs.total.toLocaleString() : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-mono text-xs text-muted-foreground">
              Total active and suspended workspaces.
            </p>
            <Link
              to="/organizations"
              className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline font-semibold"
            >
              Inspect Fleet <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Users Card */}
        <Card className="border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-[11px] uppercase flex items-center justify-between">
              User Accounts
              <Users className="size-4 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="font-mono text-3xl font-bold">
              {users ? users.total.toLocaleString() : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-mono text-xs text-muted-foreground">
              Registered customers and staff operators.
            </p>
            <Link
              to="/users"
              className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline font-semibold"
            >
              Directory & Access <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>

        {/* AI Telemetry Card */}
        <Card className="border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-[11px] uppercase flex items-center justify-between">
              Gemini Telemetry
              <Bot className="size-4 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="font-mono text-3xl font-bold">
              {totalCalls.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-mono text-xs text-muted-foreground">
              {successRate.toFixed(1)}% success rate ·{" "}
              {aiUsage?.failure_calls ?? 0} failures
            </p>
            <Link
              to="/ai-usage"
              className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline font-semibold"
            >
              Telemetry Logs <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Security and Anti-Oracle Boundary Banner */}
      <div className="rounded-lg border border-border/80 bg-card/60 p-4 font-mono text-xs space-y-2">
        <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-foreground">
          <Lock className="size-4 text-primary" />
          Platform Governance & Data Privacy Safeguards (Decision 1)
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Platform staff have zero visibility into customer plan text, task
          descriptions, or team review commentary. Only structural counts,
          timestamps, account credentials, and Gemini API consumption logs are
          accessible to platform administrators.
        </p>
      </div>
    </div>
  );
}
