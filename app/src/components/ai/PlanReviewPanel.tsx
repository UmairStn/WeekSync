import { CheckCircle2, ArrowRight, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanFinding, PlanReviewResult } from "@/api/model";
import { cn } from "@/lib/utils";

interface PlanReviewPanelProps {
  review: PlanReviewResult;
  onClose: () => void;
  onApplyRewrite: (finding: PlanFinding) => void;
}

const ISSUE_TYPE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  vague_activity: {
    label: "Vague Activity",
    bg: "bg-[#FBF3DB]",
    text: "text-[#956400]",
    border: "border-[#956400]/25",
  },
  missing_impact: {
    label: "Missing Impact",
    bg: "bg-[#FDEBEC]",
    text: "text-[#9F2F2D]",
    border: "border-[#9F2F2D]/25",
  },
  missing_gtm: {
    label: "Missing GTM",
    bg: "bg-[#E1F3FE]",
    text: "text-[#1F6C9F]",
    border: "border-[#1F6C9F]/25",
  },
  unrealistic_scope: {
    label: "Scope Too Broad",
    bg: "bg-[#F7EDF9]",
    text: "text-[#7B3888]",
    border: "border-[#7B3888]/25",
  },
};

export function PlanReviewPanel({
  review,
  onClose,
  onApplyRewrite,
}: PlanReviewPanelProps) {
  const isApproved = review.ready_to_submit || review.verdict === "approve";

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
      {/* Header bar */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-md border",
              isApproved
                ? "bg-[#EDF3EC] border-[#346538]/20 text-[#346538]"
                : "bg-[#FBF3DB] border-[#956400]/20 text-[#956400]"
            )}
          >
            {isApproved ? (
              <CheckCircle2 className="size-4" strokeWidth={2} />
            ) : (
              <Sparkles className="size-4" strokeWidth={2} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground tracking-tight">
                AI Plan Review
              </h3>
              <span
                className={cn(
                  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border",
                  isApproved
                    ? "bg-[#EDF3EC] text-[#346538] border-[#346538]/20"
                    : "bg-[#FBF3DB] text-[#956400] border-[#956400]/20"
                )}
              >
                {isApproved ? "Ready for Lead" : "Revisions Recommended"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {review.overall_assessment}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          aria-label="Dismiss review"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {(review.findings ?? []).length === 0 ? (
          <div className="rounded-lg border border-border/70 bg-background/50 p-3.5 text-xs text-muted-foreground">
            No issues found. Your plan describes clear checkable outcomes and is
            ready for lead approval.
          </div>
        ) : (
          (review.findings ?? []).map((finding, idx) => {
            const config = ISSUE_TYPE_CONFIG[finding.issue_type] ?? {
              label: finding.issue_type,
              bg: "bg-muted",
              text: "text-foreground",
              border: "border-border",
            };

            return (
              <div
                key={finding.task_id ?? `finding-${idx}`}
                className="rounded-lg border border-border bg-background p-3.5 text-xs space-y-2.5"
              >
                {/* Header row of finding */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border shrink-0",
                        config.bg,
                        config.text,
                        config.border
                      )}
                    >
                      {config.label}
                    </span>
                    {finding.task && (
                      <span className="truncate font-medium text-foreground">
                        {finding.task}
                      </span>
                    )}
                  </div>
                </div>

                {/* Critique / Problem Statement */}
                <p className="text-xs text-foreground/85 leading-relaxed">
                  {finding.critique || finding.problem}
                </p>

                {/* Suggested Rewrite with 1-Click Apply */}
                {finding.suggested_rewrite && (
                  <div className="rounded-md border border-border bg-muted/30 p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        Suggested Rewrite
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => onApplyRewrite(finding)}
                        className="h-6 gap-1.5 px-2 text-[11px] font-medium cursor-pointer"
                      >
                        <span>Apply to Plan</span>
                        <ArrowRight className="size-3" />
                      </Button>
                    </div>
                    <p className="font-mono text-xs text-foreground bg-background rounded border border-border/60 p-2">
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
    bg: "bg-muted",
    text: "text-foreground",
    border: "border-border",
  };

  return (
    <div className="mt-2 rounded-lg border border-border/80 bg-background/95 p-2.5 text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border shrink-0",
            config.bg,
            config.text,
            config.border
          )}
        >
          {config.label}
        </span>
        {finding.suggested_rewrite && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onApply}
            className="h-5 gap-1 px-2 text-[10px] font-medium cursor-pointer"
          >
            <span>Apply Suggestion</span>
            <ArrowRight className="size-2.5" />
          </Button>
        )}
      </div>
      <p className="text-xs text-foreground/85 leading-relaxed">
        {finding.critique || finding.problem}
      </p>
      {finding.suggested_rewrite && (
        <p className="font-mono text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1 border border-border/40">
          Suggested: {finding.suggested_rewrite}
        </p>
      )}
    </div>
  );
}
