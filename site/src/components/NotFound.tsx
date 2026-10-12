import { Logo } from "@/components/logo";
import { Home } from "lucide-react";

export function NotFoundComponent() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground text-center select-none">
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-center">
          <Logo className="h-8 w-auto" />
        </div>
        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground px-2.5 py-1 rounded-full border border-border bg-muted/40 inline-block">
            404 &bull; Page Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            The page you are looking for does not exist on WeekSync.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Home className="size-3.5 mr-1.5" />
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
