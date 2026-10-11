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
    query: { enabled: !!currentOrgId },
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
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-5 space-y-1">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-foreground" strokeWidth={2} />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Workspace Configuration
          </span>
        </div>
        <h1 className="font-serif text-2xl font-normal tracking-tight text-foreground">
          {currentOrg?.name ?? "Organization Settings"}
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage team structures, member permissions, and copyable invite
          tokens.
        </p>
      </div>

      {/* SECTION 1: TEAMS MANAGEMENT */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Teams
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Functional squads inside {currentOrg?.name}. Members can belong to
              multiple teams.
            </p>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setCreateTeamDialogOpen(true)}
              className="h-8 text-xs bg-foreground text-background hover:bg-foreground/90 font-medium"
            >
              <Plus className="size-3.5 mr-1" />
              New Team
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="rounded-lg border border-border p-4 bg-background space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {team.name}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {team.member_count ?? 0} members
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                <UserCheck className="size-3.5 text-foreground" />
                <span>
                  {team.lead_user_id
                    ? `Lead Assigned (${team.lead_user_id.slice(0, 8)})`
                    : "Unassigned"}
                </span>
              </div>
            </div>
          ))}

          {teams.length === 0 && (
            <p className="text-xs text-muted-foreground italic col-span-2 py-2">
              No teams created yet.
            </p>
          )}
        </div>
      </div>

      {/* SECTION 2: INVITE TOKENS */}
      {isAdmin && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Copyable Invite Tokens
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Invite colleagues directly to {currentOrg?.name} without email
                sending.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateInviteDialogOpen(true)}
              className="h-8 text-xs"
            >
              <UserPlus className="size-3.5 mr-1" />
              Generate Token
            </Button>
          </div>

          <div className="space-y-2">
            {generatedTokens.map((inv, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 bg-background"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
                    {inv.role}
                  </span>
                  <span className="font-mono text-xs text-foreground truncate max-w-xs sm:max-w-md">
                    {inv.token}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(inv.token)}
                  className="h-7 text-xs shrink-0"
                >
                  {copiedToken === inv.token ? (
                    <>
                      <Check className="size-3.5 mr-1 text-[#346538]" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 mr-1" /> Copy
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
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Organization Members
            </h2>
            <p className="text-[11px] text-muted-foreground">
              All accounts with access to {currentOrg?.name}.
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
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 bg-background"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-foreground">
                  {member.first_name.charAt(0)}
                  {member.last_name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">
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
                    className="text-[11px] font-mono border border-border rounded px-2 py-1 bg-background text-foreground outline-none"
                  >
                    <option value="member">MEMBER</option>
                    <option value="admin">ADMIN</option>
                    <option value="owner">OWNER</option>
                  </select>
                ) : (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider",
                      member.org_role === "owner" &&
                        "bg-[#EDF3EC] text-[#346538]",
                      member.org_role === "admin" &&
                        "bg-[#E1F3FE] text-[#1F6C9F]",
                      member.org_role === "member" &&
                        "bg-muted text-muted-foreground"
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
            <DialogTitle className="text-sm font-semibold">
              Create Functional Team
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a team for weekly planning sync (e.g. Design, Backend,
              Growth).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Team Name
              </label>
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Growth & Marketing"
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Assign Team Lead (Optional)
              </label>
              <select
                value={newTeamLeadId}
                onChange={(e) => setNewTeamLeadId(e.target.value)}
                className="w-full text-xs border border-border rounded-md px-3 py-2 bg-background text-foreground outline-none"
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
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateTeamDialogOpen(false)}
              className="text-xs"
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
              className="text-xs bg-foreground text-background hover:bg-foreground/90"
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
            <DialogTitle className="text-sm font-semibold">
              Generate Invite Token
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Colleagues can enter this token upon signup to immediately join{" "}
              {currentOrg?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Assign Role
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInviteRole("member")}
                  className={cn(
                    "flex-1 rounded-md border p-2 text-xs text-center transition-colors",
                    inviteRole === "member"
                      ? "border-foreground bg-muted font-medium text-foreground"
                      : "border-border text-muted-foreground"
                  )}
                >
                  Member
                </button>
                <button
                  type="button"
                  onClick={() => setInviteRole("admin")}
                  className={cn(
                    "flex-1 rounded-md border p-2 text-xs text-center transition-colors",
                    inviteRole === "admin"
                      ? "border-foreground bg-muted font-medium text-foreground"
                      : "border-border text-muted-foreground"
                  )}
                >
                  Admin
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateInviteDialogOpen(false)}
              className="text-xs"
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
              className="text-xs bg-foreground text-background hover:bg-foreground/90"
            >
              Generate Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
