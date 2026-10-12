import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/dashboard/sidebar";

// Pathless layout route: every route file under `src/routes/_main/` renders
// inside this chrome and behind the auth guard, without `_main` appearing in
// the URL. Public pages (e.g. /login) live outside it.
export const Route = createFileRoute("/_main")({ component: MainLayout });

function MainLayout() {
  return (
    <AuthGuard>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 h-screen overflow-y-auto min-w-0 flex flex-col">
          <div className="bg-foreground text-background text-[10px] font-mono uppercase tracking-widest text-center py-1 font-semibold shrink-0 select-none">
            ⚠ INTERNAL PLATFORM OPERATIONS — STAFF PRIVILEGED CONSOLE
          </div>
          <div className="flex-1 mx-auto max-w-6xl w-full space-y-6 p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
