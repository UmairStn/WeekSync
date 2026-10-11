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
      <div className="flex h-screen overflow-hidden bg-[#FBFBFA] dark:bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl space-y-8 p-6 lg:p-10">
            <Outlet />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
