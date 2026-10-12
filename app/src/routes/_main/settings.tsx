import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  UserPlus,
  Copy,
  Check,
  Plus,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/contexts/tenant-context";
import { useCurrentUser } from "@/contexts/user-context";
import {
  useListMembers,
  useCreateInvite,
  useUpdateMemberRole,
} from "@/api/endpoints/organizations/organizations";
import { useCreateTeam } from "@/api/endpoints/teams/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, getErrorMessage } from "@/lib/utils";
import type { MemberResponse } from "@/api/model";

export const Route = createFileRoute("/_main/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const { currentOrg, currentOrgId, isOwner, isAdmin, teams } = useTenant();

  // Dialog states
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLeadId, setNewTeamLeadId] = useState<string>("");

  const [createInviteDialogOpen, setCreateInviteDialogOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [generatedTokens, setGeneratedTokens] = useState<
    Array<{ token: string; role: string }>
  >([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Queries
  const { data: membersData } = useListMembers(currentOrgId, {
    query: { enabled: !!user && !!currentOrgId },
  });
  const members: MemberResponse[] = membersData ?? [];

  // Mutations
  const createTeamMutation = useCreateTeam({
    mutation: {
      onSuccess: () => {
        toast.success("Team created successfully");
        setCreateTeamDialogOpen(false);
        setNewTeamName("");
        setNewTeamLeadId("");
        queryClient.invalidateQueries();
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err, "Failed to create team"));
      },
    },
  });

  const createInviteMutation = useCreateInvite({
    mutation: {
      onSuccess: (data) => {
        toast.success("Invite token generated!");
        setGeneratedTokens((prev) => [
          { token: data.token, role: data.role },
          ...prev,
        ]);
        queryClient.invalidateQueries();
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err, "Failed to generate invite"));
      },
    },
  });

  const updateRoleMutation = useUpdateMemberRole({
    mutation: {
      onSuccess: () => {
        toast.success("Member role updated");
        queryClient.invalidateQueries();
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err, "Failed to update role"));
      },
    },
  });

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    toast.success("Invite token copied to clipboard!");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-1.5">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-primary" strokeWidth={2} />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Workspace Configuration
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {currentOrg?.name ?? "Organization Settings"}
        </h1>
        <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
          Manage functional squad teams, member role permissions, and copyable
          invite tokens.
        </p>
      </div>

      {/* SECTION 1: TEAMS MANAGEMENT */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              Functional Teams
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Teams inside {currentOrg?.name}. Members can belong to multiple
              teams.
            </p>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setCreateTeamDialogOpen(true)}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              <Plus className="size-3.5" />
              <span>New Team</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="rounded-xl border border-border/80 p-4 bg-background/80 space-y-2 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {team.name}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
                  {team.member_count ?? 0} members
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                <UserCheck className="size-3.5 text-primary" />
                <span>
                  {team.lead_user_id
                    ? `Lead Assigned (${team.lead_user_id.slice(0, 8)})`
                    : "Unassigned Lead"}
                </span>
              </div>
            </div>
          ))}

          {teams.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground italic col-span-2">
              No teams created yet. Create your first engineering team to begin.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: INVITE TOKENS */}
      {isAdmin && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                Copyable Invite Tokens
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Invite colleagues directly to {currentOrg?.name} without
                outbound email setup.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateInviteDialogOpen(true)}
              className="h-8 text-xs font-medium gap-1.5 cursor-pointer shadow-xs rounded-full"
            >
              <UserPlus className="size-3.5" />
              <span>Generate Token</span>
            </Button>
          </div>

          <div className="space-y-2">
            {generatedTokens.map((inv, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5 bg-background/80"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono uppercase font-semibold text-primary border border-primary/20">
                    {inv.role}
                  </span>
                  <span className="font-mono text-xs text-foreground truncate max-w-xs sm:max-w-md">
                    {inv.token}
                  </span>
                </div>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => copyToClipboard(inv.token)}
                  className="gap-1.5 text-xs shrink-0 cursor-pointer"
                >
                  {copiedToken === inv.token ? (
                    <>
                      <Check className="size-3 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            ))}

            {generatedTokens.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-1">
                Click &ldquo;Generate Token&rdquo; to create a copyable invite
                token.
              </p>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: MEMBERS ROSTER */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              Organization Members
            </h2>
            <p className="text-[11px] text-muted-foreground">
              All accounts with authenticated access to {currentOrg?.name}.
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {members.length} members
          </span>
        </div>

        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5 bg-background/80 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground text-xs font-bold font-mono">
                  {member.first_name.charAt(0)}
                  {member.last_name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {member.first_name} {member.last_name}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {member.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOwner && member.user_id !== user?.id ? (
                  <select
                    value={member.org_role}
                    onChange={(e) =>
                      updateRoleMutation.mutate({
                        orgId: currentOrgId,
                        targetUserId: member.user_id,
                        data: { org_role: e.target.value },
                      })
                    }
                    className="text-[11px] font-mono border border-border rounded-lg px-2.5 py-1 bg-background text-foreground outline-none cursor-pointer hover:border-foreground/40"
                  >
                    <option value="member">MEMBER</option>
                    <option value="admin">ADMIN</option>
                    <option value="owner">OWNER</option>
                  </select>
                ) : (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold border",
                      member.org_role === "owner" &&
                        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                      member.org_role === "admin" &&
                        "bg-secondary text-secondary-foreground border border-secondary",
                      member.org_role === "member" &&
                        "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {member.org_role}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Team Dialog */}
      <Dialog
        open={createTeamDialogOpen}
        onOpenChange={setCreateTeamDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Create Functional Team
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a squad for weekly planning cadence (e.g. Core Engine,
              Infrastructure, Growth).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Team Name
              </label>
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Core Engine"
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Assign Team Lead (Optional)
              </label>
              <select
                value={newTeamLeadId}
                onChange={(e) => setNewTeamLeadId(e.target.value)}
                className="w-full text-xs border border-border rounded-md px-3 py-2 bg-background text-foreground outline-none cursor-pointer"
              >
                <option value="">No lead assigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.first_name} {m.last_name} ({m.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateTeamDialogOpen(false)}
              className="text-xs cursor-pointer rounded-full"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!newTeamName.trim()) {
                  toast.error("Please enter a team name");
                  return;
                }
                createTeamMutation.mutate({
                  orgId: currentOrgId,
                  data: {
                    name: newTeamName.trim(),
                    lead_user_id: newTeamLeadId || undefined,
                  },
                });
              }}
              disabled={createTeamMutation.isPending}
              className="text-xs font-semibold cursor-pointer shadow-xs rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Invite Dialog */}
      <Dialog
        open={createInviteDialogOpen}
        onOpenChange={setCreateInviteDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Generate Invite Token
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Colleagues can enter this token upon signup to immediately join{" "}
              {currentOrg?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Assign Initial Role
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInviteRole("member")}
                  className={cn(
                    "flex-1 rounded-md border p-2 text-xs text-center transition-colors cursor-pointer",
                    inviteRole === "member"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border text-muted-foreground"
                  )}
                >
                  Member
                </button>
                <button
                  type="button"
                  onClick={() => setInviteRole("admin")}
                  className={cn(
                    "flex-1 rounded-md border p-2 text-xs text-center transition-colors cursor-pointer",
                    inviteRole === "admin"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border text-muted-foreground"
                  )}
                >
                  Admin
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateInviteDialogOpen(false)}
              className="text-xs cursor-pointer rounded-full"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                createInviteMutation.mutate({
                  orgId: currentOrgId,
                  data: { role: inviteRole },
                });
                setCreateInviteDialogOpen(false);
              }}
              disabled={createInviteMutation.isPending}
              className="text-xs font-semibold cursor-pointer shadow-xs rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              Generate Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
