import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Users2,
  History,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  Check,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { logout } from "@/api/endpoints/auth/auth";
import { useCurrentUser } from "@/contexts/user-context";
import { useTenant } from "@/contexts/tenant-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "My Weekly Plan", icon: CalendarDays },
  { href: "/team", label: "Team's Week", icon: Users2 },
  { href: "/history", label: "Plan History", icon: History },
  { href: "/settings", label: "Organization & Teams", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const {
    orgs,
    currentOrg,
    currentOrgId,
    setCurrentOrgId,
    teams,
    currentTeam,
    currentTeamId,
    setCurrentTeamId,
  } = useTenant();

  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await logout();
    },
    onSettled: () => {
      queryClient.clear();
      navigate({ to: "/login" });
    },
  });

  const initials =
    user &&
    `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();

  const roleLabel = currentOrg?.my_role?.toUpperCase() ?? "MEMBER";

  return (
    <aside className="flex h-screen max-h-screen w-[220px] shrink-0 flex-col border-r border-border bg-card select-none overflow-hidden">
      {/* Brand Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <Link
          to="/dashboard"
          aria-label="WeekSync"
          className="flex items-center gap-2"
        >
          <Logo className="h-6 w-auto" />
        </Link>
        <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-full border border-border bg-muted/40">
          <span className="size-1.5 rounded-full bg-foreground" />
          Live
        </span>
      </div>

      {/* Workspace Context Card (Org + Team Switcher) */}
      <div className="p-2.5 border-b border-border shrink-0">
        <DropdownMenu
          open={isWorkspaceMenuOpen}
          onOpenChange={setIsWorkspaceMenuOpen}
        >
          <DropdownMenuTrigger className="group w-full rounded-xl border border-border bg-background p-2 text-left transition-all hover:border-foreground/40 hover:shadow-xs cursor-pointer focus:outline-none">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex size-5 items-center justify-center rounded bg-foreground text-background">
                  <Building2 className="size-3" strokeWidth={2} />
                </div>
                <span className="truncate text-xs font-semibold text-foreground">
                  {currentOrg?.name ?? "Select Org"}
                </span>
              </div>
              <ChevronDown className="size-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
              <span className="font-mono text-muted-foreground truncate text-[10px]">
                {currentTeam?.name ? `Team: ${currentTeam.name}` : "No team"}
              </span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.2 text-[9px] font-mono font-medium border",
                  roleLabel === "OWNER" &&
                    "bg-foreground text-background border-foreground",
                  roleLabel === "ADMIN" &&
                    "bg-muted text-foreground border-border",
                  roleLabel === "MEMBER" &&
                    "bg-background text-muted-foreground border-border"
                )}
              >
                {roleLabel}
              </span>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-56 text-xs p-1.5 shadow-md"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1">
                Organizations
              </DropdownMenuLabel>
              {orgs.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => setCurrentOrgId(org.id)}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted"
                >
                  <span className="truncate font-medium">{org.name}</span>
                  {org.id === currentOrgId && (
                    <Check
                      className="size-3.5 text-foreground"
                      strokeWidth={2.5}
                    />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-1.5" />

            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1">
                Teams in {currentOrg?.name}
              </DropdownMenuLabel>
              {teams.length === 0 ? (
                <div className="px-2 py-1.5 text-muted-foreground text-[11px] italic">
                  No teams created yet
                </div>
              ) : (
                teams.map((team) => (
                  <DropdownMenuItem
                    key={team.id}
                    onClick={() => setCurrentTeamId(team.id)}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted"
                  >
                    <span className="truncate font-medium">{team.name}</span>
                    {team.id === currentTeamId && (
                      <Check
                        className="size-3.5 text-foreground"
                        strokeWidth={2.5}
                      />
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 p-2.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.98]",
                active
                  ? "bg-foreground text-background font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon
                className="size-4 shrink-0"
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* AI Assistant Quick Status */}
      <div className="mx-2.5 mb-2.5 p-2.5 rounded-xl border border-border bg-muted/30 text-xs shrink-0">
        <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
          <Sparkles className="size-3.5 text-foreground" />
          <span className="text-[11px]">AI Plan Coach</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          Verifies testable deliverables, impact metrics, and GTM goals on every
          plan.
        </p>
      </div>

      {/* User Session Footer */}
      <div className="border-t border-border p-2.5 space-y-2 shrink-0">
        {user && (
          <div className="flex items-center gap-2 rounded-lg p-2 bg-muted/20 border border-border/50">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-[10px] font-bold text-background">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {user.first_name} {user.last_name}
              </p>
              <p className="truncate text-[10px] font-mono text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="size-3.5 shrink-0 mr-2" strokeWidth={2} />
          {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    </aside>
  );
}
