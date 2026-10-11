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
    currentTeamId,
    setCurrentTeamId,
  } = useTenant();

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

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
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-card">
      {/* Brand Header */}
      <div className="flex h-14 items-center border-b border-border px-5">
        <Link to="/dashboard" aria-label="WeekSync">
          <Logo className="h-6" />
        </Link>
      </div>

      {/* Organization & Team Selector */}
      <div className="border-b border-border p-3 space-y-2">
        <DropdownMenu
          open={isOrgDropdownOpen}
          onOpenChange={setIsOrgDropdownOpen}
        >
          <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50 cursor-pointer">
            <div className="flex items-center gap-2 truncate">
              <Building2
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={2}
              />
              <span className="truncate font-medium text-foreground">
                {currentOrg?.name ?? "Select Organization"}
              </span>
            </div>
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 text-xs">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Organizations
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {orgs.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => setCurrentOrgId(org.id)}
                  className="flex items-center justify-between py-1.5 cursor-pointer"
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
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Team Selector & Role Badge */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-mono uppercase text-muted-foreground">
              Team:
            </span>
            <select
              value={currentTeamId}
              onChange={(e) => setCurrentTeamId(e.target.value)}
              className="bg-transparent text-xs font-medium text-foreground outline-none truncate cursor-pointer hover:underline"
            >
              {teams.length === 0 && <option value="">No teams</option>}
              {teams.map((t) => (
                <option key={t.id} value={t.id} className="bg-background">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider shrink-0",
              roleLabel === "OWNER" && "bg-[#EDF3EC] text-[#346538]",
              roleLabel === "ADMIN" && "bg-[#E1F3FE] text-[#1F6C9F]",
              roleLabel === "MEMBER" && "bg-muted text-muted-foreground"
            )}
          >
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-all duration-150",
                active
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User & Session Footer */}
      <div className="border-t border-border p-3 space-y-2">
        {user && (
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 bg-muted/40 border border-border/50">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-[10px] font-semibold text-background">
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
          className="w-full justify-start text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
