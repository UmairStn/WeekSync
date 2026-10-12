import {
  CheckCircle2,
  ArrowRight,
  X,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanFinding, PlanReviewResult } from "@/api/model";
import { cn } from "@/lib/utils";

interface PlanReviewPanelProps {
  review: PlanReviewResult;
  onClose: () => void;
  onApplyRewrite: (finding: PlanFinding) => void;
}

const ISSUE_TYPE_CONFIG: Record<string, { label: string; badgeClass: string }> =
  {
    vague_activity: {
      label: "Vague Activity",
      badgeClass:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    },
    missing_impact: {
      label: "Missing Impact",
      badgeClass:
        "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
    },
    missing_gtm: {
      label: "Missing GTM",
      badgeClass:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    },
    unrealistic_scope: {
      label: "Scope Too Broad",
      badgeClass:
        "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
    },
  };

export function PlanReviewPanel({
  review,
  onClose,
  onApplyRewrite,
}: PlanReviewPanelProps) {
  const isApproved = review.ready_to_submit || review.verdict === "approve";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header bar */}
      <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg border",
              isApproved
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
            )}
          >
            {isApproved ? (
              <CheckCircle2 className="size-4" strokeWidth={2} />
            ) : (
              <Sparkles className="size-4" strokeWidth={2} />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                AI Coach Assessment
              </h3>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium border",
                  isApproved
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                )}
              >
                {isApproved ? "Ready for Lead" : "Revisions Recommended"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              {review.overall_assessment}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          aria-label="Dismiss review"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Findings List */}
      <div className="space-y-2.5">
        {(review.findings ?? []).length === 0 ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              Zero issues identified. All tasks describe verifiable outcomes
              with proper business context.
            </span>
          </div>
        ) : (
          (review.findings ?? []).map((finding, idx) => {
            const config = ISSUE_TYPE_CONFIG[finding.issue_type] ?? {
              label: finding.issue_type,
              badgeClass: "bg-muted text-muted-foreground border-border",
            };

            return (
              <div
                key={finding.task_id ?? `finding-${idx}`}
                className="rounded-xl border border-border/80 bg-background/80 p-4 text-xs space-y-2.5 hover:border-border transition-colors"
              >
                {/* Header row of finding */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border shrink-0",
                        config.badgeClass
                      )}
                    >
                      {config.label}
                    </span>
                    {finding.task && (
                      <span className="truncate font-semibold text-foreground">
                        {finding.task}
                      </span>
                    )}
                  </div>
                </div>

                {/* Critique / Problem Statement */}
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {finding.critique || finding.problem}
                </p>

                {/* Suggested Rewrite with 1-Click Apply */}
                {finding.suggested_rewrite && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        Suggested Concrete Rewrite
                      </span>
                      <Button
                        type="button"
                        size="xs"
                        variant="default"
                        onClick={() => onApplyRewrite(finding)}
                        className="gap-1.5 px-2.5 text-[11px] font-medium cursor-pointer shadow-xs"
                      >
                        <span>Apply Rewrite</span>
                        <ArrowRight className="size-3" />
                      </Button>
                    </div>
                    <p className="font-mono text-xs text-foreground bg-card rounded-md border border-border/80 p-2.5">
                      {finding.suggested_rewrite}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function InlineFindingCard({
  finding,
  onApply,
}: {
  finding: PlanFinding;
  onApply: () => void;
}) {
  const config = ISSUE_TYPE_CONFIG[finding.issue_type] ?? {
    label: finding.issue_type,
    badgeClass: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="mt-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs space-y-2 animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border shrink-0",
              config.badgeClass
            )}
          >
            {config.label}
          </span>
        </div>
        {finding.suggested_rewrite && (
          <Button
            type="button"
            size="xs"
            onClick={onApply}
            className="gap-1 px-2 text-[10px] font-medium cursor-pointer"
          >
            <span>Apply</span>
            <ArrowRight className="size-2.5" />
          </Button>
        )}
      </div>
      <p className="text-xs text-foreground/90 leading-relaxed">
        {finding.critique || finding.problem}
      </p>
      {finding.suggested_rewrite && (
        <p className="font-mono text-[11px] text-muted-foreground bg-card rounded-md px-2.5 py-1.5 border border-border/60">
          Suggested: {finding.suggested_rewrite}
        </p>
      )}
    </div>
  );
}
