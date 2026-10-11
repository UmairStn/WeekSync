import { Logomark } from "@/components/Logo";

export default function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Logomark className="size-16 animate-pulse" />
        <span className="font-sans text-sm font-medium tracking-tight text-muted-foreground animate-pulse">
          Loading WeekSync...
        </span>
      </div>
    </div>
  );
}
