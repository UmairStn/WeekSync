import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { QueryProvider } from "@/components/QueryProvider";
import { UserProvider } from "@/contexts/user-context";
import { TenantProvider } from "@/contexts/tenant-context";
import { Toaster } from "@/components/ui/sonner";
import { NotFoundComponent } from "@/components/NotFound";
import appCss from "@/styles.css?url";

// Document shell for the whole app. In SPA mode this is what gets prerendered
// into `_shell.html`, so everything here runs before any route does.
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "WeekSync — Weekly Planning for High-Output Teams" },
      {
        name: "description",
        content:
          "Align on what ships this week, why it matters, and review progress with your team.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/icon.svg" },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundComponent,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <QueryProvider>
          <UserProvider>
            <TenantProvider>
              {children}
              <Toaster />
            </TenantProvider>
          </UserProvider>
        </QueryProvider>
        <Scripts />
      </body>
    </html>
  );
}
