import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { QueryProvider } from "@/components/QueryProvider";
import { UserProvider } from "@/contexts/user-context";
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
      { title: "WeekSync Internal" },
      { name: "description", content: "WeekSync internal operations console." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
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
            {children}
            <Toaster />
          </UserProvider>
        </QueryProvider>
        <Scripts />
      </body>
    </html>
  );
}
