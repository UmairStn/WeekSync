import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAiWeekSummary } from "@/api/endpoints/ai/ai";
import type { WeekSummaryResult } from "@/api/model";
import { getErrorMessage } from "@/lib/utils";

interface WeekSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  planId: string;
  weekStartDate?: string;
}

export function WeekSummaryDialog({
  open,
  onOpenChange,
  orgId,
  planId,
  weekStartDate,
}: WeekSummaryDialogProps) {
  const [summary, setSummary] = useState<WeekSummaryResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const summaryMutation = useAiWeekSummary({
    mutation: {
      onSuccess: (data) => {
        setErrorMessage(null);
        setSummary(data);
      },
      onError: (err: unknown) => {
        const msg = getErrorMessage(
          err,
          "Failed to generate end-of-week summary"
        );
        setErrorMessage(msg);
      },
    },
  });

  const { mutate: runSummaryMutation, isPending: isGenerating } =
    summaryMutation;

  const handleGenerate = useCallback(() => {
    setErrorMessage(null);
    runSummaryMutation({
      orgId,
      data: {
        plan_id: planId,
      },
    });
  }, [orgId, planId, runSummaryMutation]);

  // Auto-generate when opened if we don't have a summary yet
  useEffect(() => {
    if (open && !summary && !isGenerating && !errorMessage) {
      handleGenerate();
    }
  }, [open, summary, isGenerating, errorMessage, handleGenerate]);

  const handleCopy = () => {
    if (!summary) {
      return;
    }
    const lines = [
      `📊 End-of-Week Summary (${weekStartDate || "Week"})`,
      `Outcome: ${summary.headline}`,
      "",
      "Shipped:",
      ...(summary.shipped.length > 0
        ? summary.shipped.map((item) => `  ✓ ${item}`)
        : ["  (None)"]),
      "",
      "Not Shipped:",
      ...(summary.not_shipped.length > 0
        ? summary.not_shipped.map((item) => `  ✗ ${item}`)
        : ["  (None)"]),
    ];

    if (summary.why_not) {
      lines.push("", `Why: ${summary.why_not}`);
    }
    if (summary.next_week_suggestion) {
      lines.push("", `Next Week: ${summary.next_week_suggestion}`);
    }

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    toast.success("Summary copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 text-zinc-900">
              <Sparkles className="size-4" strokeWidth={2} />
            </div>
            <DialogTitle className="text-base font-semibold tracking-tight">
              End-of-Week Summary
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            AI synthesis of your week’s shipped outcomes versus incomplete work,
            with context on root causes and carryover advice.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Could not generate summary</p>
              <p className="text-amber-750 text-[11px] mt-0.5 leading-relaxed">
                {errorMessage}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                className="mt-2 text-xs h-7"
              >
                <RefreshCw className="size-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {summaryMutation.isPending && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="size-6 animate-spin text-zinc-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Analyzing completed commitments
              </p>
              <p className="text-xs text-muted-foreground">
                Synthesizing delivered tasks and draft retrospectives...
              </p>
            </div>
          </div>
        )}

        {summary && !summaryMutation.isPending && (
          <div className="space-y-4 py-2">
            {/* Headline card */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Weekly Outcome
              </span>
              <p className="text-sm font-semibold tracking-tight text-zinc-900 leading-snug">
                {summary.headline}
              </p>
            </div>

            {/* Shipped & Not Shipped Bento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Shipped */}
              <div className="rounded-lg border border-zinc-200 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>Shipped ({summary.shipped.length})</span>
                </div>
                {summary.shipped.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No tasks marked completed.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {summary.shipped.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-zinc-800 leading-relaxed"
                      >
                        <span className="text-emerald-600 font-bold mt-0.5">
                          •
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Not Shipped */}
              <div className="rounded-lg border border-zinc-200 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                  <XCircle className="size-3.5 text-zinc-500 shrink-0" />
                  <span>Not Shipped ({summary.not_shipped.length})</span>
                </div>
                {summary.not_shipped.length === 0 ? (
                  <p className="text-xs text-emerald-700 font-medium">
                    All planned tasks shipped!
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {summary.not_shipped.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-zinc-700 leading-relaxed"
                      >
                        <span className="text-zinc-400 font-bold mt-0.5">
                          •
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Why not analysis */}
            {summary.why_not && (
              <div className="rounded-lg border border-zinc-200 p-3 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  Why Work Remained Unfinished
                </span>
                <p className="text-xs text-zinc-700 leading-relaxed">
                  {summary.why_not}
                </p>
              </div>
            )}

            {/* Next week suggestion */}
            {summary.next_week_suggestion && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  Next Week Recommendation
                </span>
                <p className="text-xs text-zinc-700 leading-relaxed">
                  {summary.next_week_suggestion}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-zinc-100">
          {summary && (
            <div className="flex items-center gap-2 mr-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="text-xs h-8"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 mr-1 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 mr-1" />
                    Copy Summary
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="text-xs h-8 text-muted-foreground"
              >
                <RefreshCw className="size-3 mr-1" />
                Regenerate
              </Button>
            </div>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
