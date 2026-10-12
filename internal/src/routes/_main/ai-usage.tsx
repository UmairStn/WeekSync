import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertOctagon,
  Bot,
  CheckCircle2,
  Layers,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useGetAiUsageOverview } from "@/api/endpoints/ai-usage/ai-usage";
import type { AICallLogResponse, OrgAIUsageSummary } from "@/api/model";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_main/ai-usage")({
  component: AIUsagePage,
});

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Never";
  }
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function AIUsagePage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, refetch } = useGetAiUsageOverview({
    recent_limit: 50,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const totalCalls = data?.total_calls ?? 0;
  const successCalls = data?.success_calls ?? 0;
  const successRate = totalCalls > 0 ? (successCalls / totalCalls) * 100 : 100;
  const failures = data?.failure_calls ?? 0;
  const rateLimits = data?.rate_limited_calls ?? 0;
  const totalTokens =
    (data?.total_prompt_tokens ?? 0) + (data?.total_completion_tokens ?? 0);

  const orgSummaries: OrgAIUsageSummary[] = data?.org_summaries ?? [];
  const recentLogs: AICallLogResponse[] = data?.recent_logs ?? [];

  return (
    <div className="space-y-6">
      {/* Tactical Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-xl font-bold uppercase tracking-wider">
              AI Telemetry & Quotas
            </h1>
            <span className="rounded bg-destructive/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-destructive border border-destructive/20">
              Gemini Ops
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground font-mono">
            Platform-wide Gemini Flash execution logs, latency tracking, failure
            rates, and token accounting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="font-mono text-xs gap-1.5 h-8"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-[11px] uppercase flex items-center justify-between">
              Total Invocations
              <Bot className="size-3.5 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="font-mono text-2xl font-bold">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                totalCalls.toLocaleString()
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-[10px] text-muted-foreground">
            Lifetime recorded
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-[11px] uppercase flex items-center justify-between">
              Success Rate
              <CheckCircle2 className="size-3.5 text-emerald-500" />
            </CardDescription>
            <CardTitle className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                `${successRate.toFixed(1)}%`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-[10px] text-muted-foreground">
            {successCalls.toLocaleString()} clean completions
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-[11px] uppercase flex items-center justify-between">
              Failures
              <AlertOctagon className="size-3.5 text-destructive" />
            </CardDescription>
            <CardTitle className="font-mono text-2xl font-bold text-destructive">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                failures.toLocaleString()
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-[10px] text-muted-foreground">
            Provider errors / exceptions
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-[11px] uppercase flex items-center justify-between">
              Rate Limits (429)
              <Zap className="size-3.5 text-amber-500" />
            </CardDescription>
            <CardTitle className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                rateLimits.toLocaleString()
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-[10px] text-muted-foreground">
            Quota throttle events
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-[11px] uppercase flex items-center justify-between">
              Total Tokens
              <Layers className="size-3.5 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="font-mono text-2xl font-bold">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                totalTokens.toLocaleString()
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-[10px] text-muted-foreground">
            Input + output tokens
          </CardContent>
        </Card>
      </div>

      {/* Per-Organization Breakdown Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Per-Organization Consumption
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            {orgSummaries.length} active tenants with AI usage
          </span>
        </div>

        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40 font-mono text-xs uppercase">
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead className="w-24 text-right">Invocations</TableHead>
                <TableHead className="w-28 text-right">Success %</TableHead>
                <TableHead className="w-24 text-right">Failures</TableHead>
                <TableHead className="w-24 text-right">Rate Limits</TableHead>
                <TableHead className="w-44 text-right">
                  Last Invocation
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isLoading && orgSummaries.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center font-mono text-xs text-muted-foreground"
                  >
                    No organization AI activity logged yet.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                orgSummaries.map((org) => {
                  const orgRate =
                    org.total_calls > 0
                      ? (org.success_calls / org.total_calls) * 100
                      : 100;

                  return (
                    <TableRow
                      key={org.organization_id}
                      className="font-mono text-xs"
                    >
                      <TableCell className="font-sans font-medium text-foreground">
                        {org.organization_name}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {org.total_calls}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {orgRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {org.failure_calls}
                      </TableCell>
                      <TableCell className="text-right text-amber-600 dark:text-amber-400">
                        {org.rate_limited_calls}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatTimestamp(org.last_call_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Recent Telemetry Invocations Audit Log */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Live Telemetry Audit (Last 50 Invocations)
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            Raw execution logs
          </span>
        </div>

        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40 font-mono text-xs uppercase">
              <TableRow>
                <TableHead className="w-40">Timestamp</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>User Email</TableHead>
                <TableHead className="w-28">Feature</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24 text-right">Latency</TableHead>
                <TableHead>Diagnostic Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isLoading && recentLogs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center font-mono text-xs text-muted-foreground"
                  >
                    No AI invocations have been triggered yet.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                recentLogs.map((log) => {
                  const tokens =
                    (log.prompt_tokens ?? 0) + (log.completion_tokens ?? 0);

                  return (
                    <TableRow key={log.id} className="font-mono text-xs">
                      <TableCell className="text-muted-foreground text-[11px]">
                        {formatTimestamp(log.created_at)}
                      </TableCell>
                      <TableCell className="font-sans font-medium text-foreground">
                        {log.organization_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.user_email || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] uppercase"
                        >
                          {log.feature.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.status === "success" && (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]"
                          >
                            SUCCESS
                          </Badge>
                        )}
                        {log.status === "rate_limited" && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 text-amber-600 dark:text-amber-400 font-mono text-[10px]"
                          >
                            RATE 429
                          </Badge>
                        )}
                        {log.status === "failure" && (
                          <Badge
                            variant="destructive"
                            className="font-mono text-[10px]"
                          >
                            FAILED
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {log.latency_ms !== null ? `${log.latency_ms}ms` : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate text-[11px]">
                        {log.error_message ? (
                          <span className="text-destructive font-mono">
                            {log.error_message}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">
                            OK ({tokens} tokens)
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
