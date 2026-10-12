import { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAiBrainDump } from "@/api/endpoints/ai/ai";
import type { BrainDumpResult } from "@/api/model";
import { getErrorMessage } from "@/lib/utils";

interface BrainDumpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyDraft: (draft: BrainDumpResult) => void;
  orgId: string;
}

export function BrainDumpDialog({
  open,
  onOpenChange,
  onApplyDraft,
  orgId,
}: BrainDumpDialogProps) {
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const brainDumpMutation = useAiBrainDump({
    mutation: {
      onSuccess: (data) => {
        setErrorMessage(null);
        onApplyDraft(data);
        onOpenChange(false);
        setNotes("");
        toast.success(
          "Draft synthesized into form! Review and click Save Draft."
        );
      },
      onError: (err: unknown) => {
        const msg = getErrorMessage(
          err,
          "Failed to synthesize plan from notes"
        );
        setErrorMessage(msg);
      },
    },
  });

  const handleGenerate = () => {
    if (notes.trim().length < 5) {
      toast.error(
        "Please enter a few notes or bullet points to generate a plan"
      );
      return;
    }
    setErrorMessage(null);
    brainDumpMutation.mutate({
      orgId,
      data: {
        notes: notes.trim(),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="size-4" strokeWidth={2} />
            </div>
            <DialogTitle className="text-base font-semibold tracking-tight">
              Draft from Scratchpad Notes
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            Paste rough bullets, meeting notes, or stream-of-consciousness
            thoughts. AI will extract 1 checkable Main Task with business
            impact, tactical Sub-Goals, and Go-To-Market release hygiene.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={brainDumpMutation.isPending}
            placeholder="e.g. Finish Stripe customer portal integration this week so users can self-serve card updates. Need backend webhook handling for subscription.updated, billing redirect button in settings UI, and publish release documentation."
            className="min-h-36 resize-y font-mono text-xs leading-relaxed"
          />

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Minimum 5 characters</span>
            <span className="font-mono">{notes.length} chars</span>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={brainDumpMutation.isPending}
            className="text-xs cursor-pointer rounded-full"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={brainDumpMutation.isPending || notes.trim().length < 5}
            className="text-xs gap-1.5 cursor-pointer rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold"
          >
            {brainDumpMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Synthesizing Plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                <span>Generate Plan Draft</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
