import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import { logout } from "@/api/endpoints/auth/auth";
import { useCurrentUser } from "@/contexts/user-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// `as const` keeps the hrefs as literal types, so TanStack Router can
// type-check them against the generated route tree.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/users", label: "Users", icon: Users },
  { href: "/ai-usage", label: "AI Telemetry", icon: Activity },
] as const;

export function Sidebar() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await logout();
    },
    onSettled: () => {
      // Drop every cached query so the next session starts clean, then leave.
      queryClient.clear();
      navigate({ to: "/login" });
    },
  });

  const initials =
    user &&
    `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-border bg-card select-none">
      <div className="flex h-14 items-center justify-between px-4 border-b border-border">
        <Link to="/dashboard" aria-label="WeekSync Internal">
          <Logo className="h-6" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-2.5">
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
              <Icon className="size-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2.5 space-y-2">
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
          <LogOut className="size-3.5 mr-2" />
          {logoutMutation.isPending ? "Signing out..." : "Logout"}
        </Button>
      </div>
    </aside>
  );
}
