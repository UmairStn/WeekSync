import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { NotFoundComponent } from "@/components/NotFound";
import appCss from "@/styles.css?url";

// Document shell for every page. `head` replaces the Next.js `metadata`
// export — add per-route metadata with a `head` on that route's file.
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "WeekSync — The weekly cadence for high-velocity teams" },
      {
        name: "description",
        content:
          "Replace status meetings with high-signal weekly plans, AI-critiqued commitments, and Friday shipping rollups.",
      },
      {
        property: "og:title",
        content: "WeekSync — The weekly cadence for high-velocity teams",
      },
      {
        property: "og:description",
        content:
          "Replace status meetings with high-signal weekly plans, AI-critiqued commitments, and Friday shipping rollups.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icon.svg" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "WeekSync — Weekly alignment for teams that ship",
      },
      {
        name: "twitter:description",
        content:
          "High-signal Monday commitments, AI plan reviews that flag fuzzy tasks, and transparent team rollups.",
      },
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
      <body
        className="antialiased min-h-screen bg-background text-foreground"
        suppressHydrationWarning
      >
        {children}
        <Scripts />
      </body>
    </html>
  );
}
