import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Lock,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  getListInternalOrganizationsQueryKey,
  useListInternalOrganizations,
  useReinstateOrganization,
  useSuspendOrganization,
} from "@/api/endpoints/orgs/orgs";
import type { InternalOrganizationResponse } from "@/api/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_main/organizations")({
  component: OrganizationsPage,
});

const PAGE_SIZE = 25;

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Never";
  }
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "suspended"
  >("all");

  const [orgToSuspend, setOrgToSuspend] =
    useState<InternalOrganizationResponse | null>(null);
  const [orgToReinstate, setOrgToReinstate] =
    useState<InternalOrganizationResponse | null>(null);

  const offset = page * PAGE_SIZE;

  const { data, isLoading, isError } = useListInternalOrganizations({
    limit: PAGE_SIZE,
    offset,
    search: search.trim() ? search.trim() : undefined,
  });

  const suspendMutation = useSuspendOrganization({
    mutation: {
      onSuccess: () => {
        toast.success(`Suspended organization "${orgToSuspend?.name}"`);
        setOrgToSuspend(null);
        queryClient.invalidateQueries({
          queryKey: getListInternalOrganizationsQueryKey(),
        });
      },
      onError: (err) => {
        toast.error(
          `Failed to suspend organization: ${err?.message || "Unknown error"}`
        );
      },
    },
  });

  const reinstateMutation = useReinstateOrganization({
    mutation: {
      onSuccess: () => {
        toast.success(`Reinstated organization "${orgToReinstate?.name}"`);
        setOrgToReinstate(null);
        queryClient.invalidateQueries({
          queryKey: getListInternalOrganizationsQueryKey(),
        });
      },
      onError: (err) => {
        toast.error(
          `Failed to reinstate organization: ${err?.message || "Unknown error"}`
        );
      },
    },
  });

  const rawItems = data?.items ?? [];
  const items = rawItems.filter((org) => {
    if (statusFilter === "active") {
      return !org.is_suspended;
    }
    if (statusFilter === "suspended") {
      return org.is_suspended;
    }
    return true;
  });
  const total = data?.total ?? 0;
  const showingFrom = total === 0 ? 0 : offset + 1;
  const showingTo = offset + items.length;
  const canPrev = page > 0;
  const canNext = showingTo < total;

  return (
    <div className="space-y-6">
      {/* Tactical Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-xl font-bold uppercase tracking-wider">
              Tenant Fleet
            </h1>
            <span className="rounded bg-destructive/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-destructive border border-destructive/20">
              Staff Ops
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground font-mono">
            Platform-wide organization directory & emergency suspension
            killswitches. Customer plan text is strictly hidden.
          </p>
        </div>

        {/* Global Privacy Compliance Badge */}
        <div className="flex items-center gap-2 rounded border border-border/80 bg-background/50 px-3 py-1.5 font-mono text-xs text-muted-foreground">
          <ShieldAlert className="size-4 text-primary" />
          <span>Anti-Oracle Privacy Guard: Active</span>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search organizations by name or slug..."
            className="pl-9 font-mono text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-muted-foreground mr-1">Filter:</span>
          {(["all", "active", "suspended"] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "secondary" : "ghost"}
              size="sm"
              className="h-8 capitalize text-xs"
              onClick={() => {
                setStatusFilter(filter);
                setPage(0);
              }}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Organizations Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40 font-mono text-xs uppercase">
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead className="w-24 text-right">Members</TableHead>
              <TableHead className="w-24 text-right">Teams</TableHead>
              <TableHead className="w-24 text-right">Plans</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
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

            {!isLoading && isError && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center font-mono text-sm text-destructive"
                >
                  Failed to load organizations. Check internal session status.
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground font-mono">
                    <Building2 className="size-8 opacity-40" />
                    <p className="text-sm">
                      No organizations match current query.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              !isError &&
              items.map((org) => (
                <TableRow key={org.id} className="font-mono text-xs">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-sans font-semibold text-sm text-foreground">
                        {org.name}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        /{org.slug}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {org.member_count}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {org.team_count}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {org.plan_count}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(org.last_active)}
                  </TableCell>
                  <TableCell>
                    {org.is_suspended ? (
                      <Badge
                        variant="destructive"
                        className="font-mono text-[10px] tracking-wide"
                      >
                        SUSPENDED
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] tracking-wide"
                      >
                        ACTIVE
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {org.is_suspended ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 text-xs gap-1"
                        onClick={() => setOrgToReinstate(org)}
                      >
                        <RotateCcw className="size-3" />
                        Reinstate
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setOrgToSuspend(org)}
                      >
                        <Lock className="size-3" />
                        Suspend
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {/* Dense Pagination Footer */}
        <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 font-mono text-xs text-muted-foreground">
          <div>
            Showing {showingFrom}–{showingTo} of {total} organizations
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs font-mono"
              disabled={!canPrev}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs font-mono"
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Suspend Confirmation Dialog */}
      <Dialog
        open={Boolean(orgToSuspend)}
        onOpenChange={(open) => !open && setOrgToSuspend(null)}
      >
        <DialogContent className="font-mono text-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Suspend Organization
            </DialogTitle>
            <DialogDescription className="pt-2 font-mono text-xs text-muted-foreground">
              Are you sure you want to suspend{" "}
              <span className="font-bold text-foreground">
                {orgToSuspend?.name}
              </span>{" "}
              ({orgToSuspend?.slug})?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            All customer members belonging to this organization will be
            immediately blocked with an organization suspended error.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOrgToSuspend(null)}
              disabled={suspendMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={suspendMutation.isPending}
              onClick={() => {
                if (orgToSuspend) {
                  suspendMutation.mutate({ orgId: orgToSuspend.id });
                }
              }}
            >
              {suspendMutation.isPending
                ? "Suspending..."
                : "Confirm Suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reinstate Confirmation Dialog */}
      <Dialog
        open={Boolean(orgToReinstate)}
        onOpenChange={(open) => !open && setOrgToReinstate(null)}
      >
        <DialogContent className="font-mono text-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
              Reinstate Organization
            </DialogTitle>
            <DialogDescription className="pt-2 font-mono text-xs text-muted-foreground">
              Reinstate access for{" "}
              <span className="font-bold text-foreground">
                {orgToReinstate?.name}
              </span>{" "}
              ({orgToReinstate?.slug})?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
            This will immediately restore access for all members in this
            organization.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOrgToReinstate(null)}
              disabled={reinstateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
              disabled={reinstateMutation.isPending}
              onClick={() => {
                if (orgToReinstate) {
                  reinstateMutation.mutate({ orgId: orgToReinstate.id });
                }
              }}
            >
              {reinstateMutation.isPending
                ? "Reinstating..."
                : "Confirm Reinstatement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
