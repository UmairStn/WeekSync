import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Home } from "lucide-react";

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
            Lost in the week?
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            The page you are looking for does not exist or may have been
            relocated.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/90 transition-colors shadow-xs"
          >
            <ArrowLeft className="size-3.5 mr-1.5" />
            Sign In
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Home className="size-3.5 mr-1.5" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
