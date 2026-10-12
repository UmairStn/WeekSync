import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Shield,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/")({ component: HomePage });

const APP_SIGNUP_URL = "http://localhost:3001/signup";
const APP_LOGIN_URL = "http://localhost:3001/login";

export function HomePage() {
  // Interactive state for the live AI Plan Review demo
  const [isRewritten, setIsRewritten] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Top Announcement Bar */}
      <div className="border-b border-border/40 bg-muted/30 px-4 py-2 text-center text-xs font-mono text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          WeekSync 1.0 Release
        </span>
        <span className="mx-2 text-border">|</span>
        <span>
          The weekly alignment protocol for high-velocity engineering fleets
        </span>
        <a
          href={APP_SIGNUP_URL}
          className="ml-2.5 inline-flex items-center gap-1 text-primary hover:underline font-semibold"
        >
          Start free <ChevronRight className="size-3" />
        </a>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2">
              <Logo className="h-7 w-auto" />
            </a>

            <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
              <a
                href="#how-it-works"
                className="transition-colors hover:text-foreground"
              >
                How It Works
              </a>
              <a
                href="#ai-review"
                className="transition-colors hover:text-foreground"
              >
                AI Plan Coach
              </a>
              <a
                href="#teams"
                className="transition-colors hover:text-foreground"
              >
                For Teams
              </a>
              <a
                href="#cadence"
                className="transition-colors hover:text-foreground"
              >
                The Cadence
              </a>
              <a
                href="#faq"
                className="transition-colors hover:text-foreground"
              >
                FAQ
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={APP_LOGIN_URL}
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className:
                  "text-xs font-medium text-muted-foreground hover:text-foreground",
              })}
            >
              Sign In
            </a>
            <a
              href={APP_SIGNUP_URL}
              className={buttonVariants({
                size: "sm",
                className:
                  "bg-foreground hover:bg-foreground/90 text-background font-semibold text-xs px-4 shadow-sm rounded-full",
              })}
            >
              Start Free Week
              <ArrowRight className="ml-1 size-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          {/* Subtle Ambient Radial Glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[560px] w-[900px] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.03),transparent_70%)] blur-3xl"
          />

          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3.5 py-1 text-xs text-muted-foreground font-mono mb-6 shadow-xs">
              <span className="flex size-2 rounded-full bg-foreground" />
              <span>Zero standup fatigue · 100% checkable deliverables</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Monday commitments. <br className="hidden sm:inline" />
              <span className="text-foreground underline decoration-border decoration-wavy underline-offset-8">
                AI-coached outcomes.
              </span>{" "}
              <br className="hidden sm:inline" />
              Friday results.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-balance leading-relaxed">
              Replace 45-minute status meetings with a crisp weekly rhythm.
              Engineers set one main verifiable outcome, AI flags fuzzy tasks
              before leads review, and the whole team ships on schedule.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <a
                href={APP_SIGNUP_URL}
                className={buttonVariants({
                  size: "lg",
                  className:
                    "h-12 px-8 bg-foreground hover:bg-foreground/90 text-background font-semibold text-sm shadow-md rounded-full cursor-pointer",
                })}
              >
                Start Your Week Free
                <ArrowRight className="ml-2 size-4" />
              </a>
              <a
                href="#ai-review"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "h-12 px-6 text-sm font-medium rounded-full cursor-pointer",
                })}
              >
                <Bot className="mr-2 size-4 text-foreground" />
                See Live AI Review
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" /> Free 14-day trial
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" /> No credit card
                required
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" /> Set up in 2 minutes
              </span>
            </div>
          </div>
        </section>

        {/* CADENCE STATS / SOCIAL PROOF STRIP */}
        <section className="border-y border-border/50 bg-muted/20 py-8 px-6">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4 text-center">
            <div className="p-3">
              <div className="font-mono text-3xl font-bold tracking-tight text-foreground">
                5 min
              </div>
              <div className="mt-1 text-xs text-muted-foreground font-medium">
                Monday plan commitment
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-3xl font-bold tracking-tight text-primary">
                1 Main Goal
              </div>
              <div className="mt-1 text-xs text-muted-foreground font-medium">
                Per member per week
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-3xl font-bold tracking-tight text-foreground">
                100%
              </div>
              <div className="mt-1 text-xs text-muted-foreground font-medium">
                Checkable completion criteria
              </div>
            </div>
            <div className="p-3">
              <div className="font-mono text-3xl font-bold tracking-tight text-foreground">
                0
              </div>
              <div className="mt-1 text-xs text-muted-foreground font-medium">
                Wasted standup meetings
              </div>
            </div>
          </div>
        </section>

        {/* SHOW THE AI: REAL INTERACTIVE PLAN REVIEW */}
        <section id="ai-review" className="scroll-mt-20 px-6 py-20 bg-muted/10">
          <div className="mx-auto max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Badge
                variant="outline"
                className="mb-3 font-mono text-xs border-primary/30 text-primary bg-primary/5"
              >
                <Sparkles className="size-3 mr-1" />
                Intelligent Plan Review
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                AI that coaches engineers to write{" "}
                <span className="text-primary">real outcomes</span>
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Most weekly planning fails because tasks are vague descriptions
                of effort instead of checkable results. WeekSync AI reviews
                drafts in seconds, flags ambiguous scope, and drafts concrete
                rewrites.
              </p>
            </div>

            {/* Interactive Showcase Card */}
            <div className="rounded-xl border border-border/80 bg-card p-6 md:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border/70 gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bot className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      Weekly Plan Review Preview
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      Target: Week of Monday, Oct 12 · Engineering Fleet
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={isRewritten ? "outline" : "default"}
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => {
                      setIsRewritten(!isRewritten);
                    }}
                  >
                    {isRewritten
                      ? "Reset to Engineer's Draft"
                      : "Apply AI Suggested Rewrite"}
                  </Button>
                </div>
              </div>

              {/* Side by side / Comparison Grid */}
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* Left Side: The Engineer's Input */}
                <div className="space-y-4 rounded-lg border border-border/70 bg-background p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Main Task Commitment
                    </span>
                    <Badge
                      variant={isRewritten ? "outline" : "secondary"}
                      className={`font-mono text-[10px] ${
                        isRewritten
                          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                          : ""
                      }`}
                    >
                      {isRewritten ? "Rewritten & Verified" : "Needs Review"}
                    </Badge>
                  </div>

                  <div className="rounded-md border border-border/70 p-3.5 bg-card/60 transition-all">
                    <div className="text-xs text-muted-foreground font-mono mb-1">
                      Task Description:
                    </div>
                    <div className="font-medium text-sm text-foreground">
                      {isRewritten ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Stripe webhook idempotency key handling with expired
                          card retries verified on sandbox
                        </span>
                      ) : (
                        <span className="text-muted-foreground line-through decoration-destructive/60">
                          Work on billing webhook fixes and checkout bugs
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-border/70 p-3.5 bg-card/60">
                    <div className="text-xs text-muted-foreground font-mono mb-1">
                      Why it matters:
                    </div>
                    <div className="text-xs text-foreground leading-relaxed">
                      {isRewritten ? (
                        <span className="text-emerald-700 dark:text-emerald-300">
                          Eliminates duplicate charge risks during network
                          timeouts and closes customer support escalation issue
                          #412.
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">
                          (Left blank by member)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="font-mono text-xs text-muted-foreground mb-2">
                      Sub-goals:
                    </div>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-emerald-500" />
                        <span>
                          Integration test suite passes with simulated webhook
                          retries
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-emerald-500" />
                        <span>
                          Zero 500 errors on Stripe sandbox webhook simulation
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Right Side: The AI Coach Panel */}
                <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      <span className="font-mono text-xs font-semibold text-primary uppercase tracking-wider">
                        AI Coach Findings
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Pydantic-AI Coach
                    </span>
                  </div>

                  {isRewritten ? (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300 space-y-2">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                        All Criteria Met · Ready for Lead Approval
                      </div>
                      <p className="leading-relaxed">
                        Task represents a single checkable outcome.
                        Why-it-matters provides clear business context, and
                        deliverables fit cleanly in a 5-day cycle.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-destructive">
                          <AlertTriangle className="size-3.5" />
                          Unverifiable Work Description
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          &quot;Work on billing webhook fixes&quot; describes an
                          activity, not a verifiable state change. A teammate
                          cannot test or verify when this is finished.
                        </p>
                      </div>

                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="size-3.5" />
                          Missing &quot;Why It Matters&quot;
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Context was omitted. Team leads cannot assess priority
                          without knowing what customer or architecture problem
                          this solves.
                        </p>
                      </div>

                      <div className="rounded-lg border border-border/80 bg-card p-3 text-xs space-y-2">
                        <div className="font-mono font-semibold text-[11px] text-primary">
                          Suggested Rewrite:
                        </div>
                        <p className="text-[11px] text-foreground font-mono bg-muted/60 p-2 rounded">
                          &quot;Stripe webhook idempotency key handling with
                          expired card retries verified on sandbox&quot;
                        </p>
                        <Button
                          size="sm"
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-7 gap-1"
                          onClick={() => {
                            setIsRewritten(true);
                          }}
                        >
                          <Check className="size-3" /> Apply This Suggestion
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS: THE 3-STEP CADENCE */}
        <section id="how-it-works" className="scroll-mt-20 px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge variant="outline" className="mb-3 font-mono text-xs">
                The Cadence
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                A predictable rhythm that respects engineering focus
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Software doesn&apos;t get built in 15-minute daily
                interruptions. WeekSync establishes a calm, asynchronous
                contract between makers and team leads.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <Card className="border border-border/80 bg-card relative overflow-hidden flex flex-col justify-between shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      01 / MONDAY
                    </span>
                    <Calendar className="size-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-xl">Plan Commitment</CardTitle>
                  <CardDescription className="leading-relaxed pt-2">
                    Engineers specify their single Main Task, supporting
                    sub-goals, and go-to-market priorities. Paste messy raw
                    notes into the Brain-Dump tool to generate pre-filled drafts
                    in seconds.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded border border-border/80 bg-muted/30 p-2.5 font-mono text-[11px] text-muted-foreground">
                    Brain-dump notes → Typed weekly plan
                  </div>
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card className="border border-border/80 bg-card relative overflow-hidden flex flex-col justify-between shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      02 / TUESDAY–THURSDAY
                    </span>
                    <Bot className="size-4 text-primary" />
                  </div>
                  <CardTitle className="text-xl">
                    AI Review & Lead Sign-off
                  </CardTitle>
                  <CardDescription className="leading-relaxed pt-2">
                    WeekSync AI validates deliverables for checkable clarity.
                    Team leads approve with one click or send back with
                    constructive notes. Then makers enjoy uninterrupted deep
                    work.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded border border-border/80 bg-muted/30 p-2.5 font-mono text-[11px] text-muted-foreground">
                    1-click approve or send back with comment
                  </div>
                </CardContent>
              </Card>

              {/* Step 3 */}
              <Card className="border border-border/80 bg-card relative overflow-hidden flex flex-col justify-between shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      03 / FRIDAY
                    </span>
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  </div>
                  <CardTitle className="text-xl">
                    Outcomes & Shipped Goals
                  </CardTitle>
                  <CardDescription className="leading-relaxed pt-2">
                    Mark main tasks shipped. The team rollup automatically
                    aggregates what got delivered across the company,
                    celebrating wins and capturing lessons without retrospective
                    meetings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded border border-border/80 bg-muted/30 p-2.5 font-mono text-[11px] text-muted-foreground">
                    Automatic shipping recap & team velocity
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FOR TEAMS SECTION */}
        <section
          id="teams"
          className="scroll-mt-20 border-t border-border/50 bg-muted/10 px-6 py-20"
        >
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <Badge variant="outline" className="mb-3 font-mono text-xs">
                  For Engineering Leadership
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Complete team alignment in{" "}
                  <span className="text-primary">30 seconds flat</span>
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Stop chasing people on Slack to ask what they are working on.
                  WeekSync gives leads and managers a single bird&apos;s-eye
                  dashboard of every team member&apos;s active week, review
                  state, and shipping outcomes.
                </p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Check className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">
                        Zero Standup Overhead
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Save 3–5 engineering hours per person every week by
                        replacing synchronous status meetings.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                      <Target className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">
                        Protected Maker Time
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Engineers have clarity on their exact primary goal all
                        week long with zero mid-sprint scope creep.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                      <Shield className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">
                        Enterprise Tenancy & Privacy
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Organization isolation by default. Multi-team
                        management, invite links, and granular RBAC.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual preview card */}
              <div className="rounded-xl border border-border/80 bg-card p-6 shadow-md space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    <span className="font-semibold text-foreground">
                      Core Platform Team — Week of Oct 12
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  >
                    4 / 4 Approved
                  </Badge>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between rounded border border-border/70 bg-background p-3">
                    <div>
                      <div className="font-sans font-medium text-foreground">
                        Alex Chen · Senior Backend
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Main: Redis session revocation cluster deployed to
                        staging
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px]"
                    >
                      SHIPPED
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded border border-border/70 bg-background p-3">
                    <div>
                      <div className="font-sans font-medium text-foreground">
                        Sarah Miller · Tech Lead
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Main: Postgres partitioned audit log migration tested
                        with zero downtime
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px]"
                    >
                      APPROVED
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded border border-border/70 bg-background p-3">
                    <div>
                      <div className="font-sans font-medium text-foreground">
                        David Zhao · Frontend
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Main: TanStack Start optimistic mutation cache
                        invalidation
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px]"
                    >
                      APPROVED
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CADENCE COMPARISON TABLE */}
        <section id="cadence" className="scroll-mt-20 px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <Badge variant="outline" className="mb-3 font-mono text-xs">
                Comparison
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                The old way vs. The WeekSync way
              </h2>
            </div>

            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              <div className="grid grid-cols-2 border-b border-border/70 bg-muted/40 p-4 font-mono text-xs font-semibold uppercase tracking-wider">
                <div className="text-muted-foreground">
                  Traditional Status Meetings
                </div>
                <div className="text-primary">WeekSync Cadence</div>
              </div>

              <div className="divide-y divide-border/60 text-sm">
                <div className="grid grid-cols-2 p-4">
                  <div className="text-muted-foreground pr-4">
                    45 minutes spent talking in circles on Monday morning.
                  </div>
                  <div className="font-medium text-foreground">
                    5-minute asynchronous submission before lunchtime.
                  </div>
                </div>

                <div className="grid grid-cols-2 p-4">
                  <div className="text-muted-foreground pr-4">
                    Vague effort descriptions (&quot;Working on auth
                    refactor&quot;).
                  </div>
                  <div className="font-medium text-foreground">
                    Checkable outcome (&quot;JWT refresh token rotation verified
                    on staging&quot;).
                  </div>
                </div>

                <div className="grid grid-cols-2 p-4">
                  <div className="text-muted-foreground pr-4">
                    Surprise blockers revealed at 4 PM on Friday.
                  </div>
                  <div className="font-medium text-foreground">
                    AI flags oversized scope and fuzzy deliverables on Monday.
                  </div>
                </div>

                <div className="grid grid-cols-2 p-4">
                  <div className="text-muted-foreground pr-4">
                    Buried inside 300 Jira tickets no one reads.
                  </div>
                  <div className="font-medium text-foreground">
                    Clean, transparent weekly rollup across the organization.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section
          id="faq"
          className="scroll-mt-20 border-t border-border/50 bg-muted/10 px-6 py-20"
        >
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything you need to know about WeekSync and AI-coached weekly
                planning.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-border/80 bg-card p-5">
                <h3 className="font-semibold text-foreground text-sm">
                  Why a weekly cadence instead of daily standups?
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Daily standups interrupt maker flow and encourage reporting
                  trivia rather than outcomes. A weekly cadence gives engineers
                  5 full days of deep work to ship meaningful units of value,
                  while maintaining clear accountability.
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-card p-5">
                <h3 className="font-semibold text-foreground text-sm">
                  How does the AI plan review work?
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  WeekSync uses typed Pydantic AI models powered by Google
                  Gemini. The coach inspects task drafts for four criteria:
                  checkable deliverables, missing &quot;why it matters&quot;
                  context, missing go-to-market goals, and unrealistic 5-day
                  scope. It returns concrete suggestions you can accept with one
                  click.
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-card p-5">
                <h3 className="font-semibold text-foreground text-sm">
                  Does WeekSync train AI models on our company data?
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  No. We use standard enterprise Google Gemini API endpoints
                  that do not retain data for model training. Furthermore, our
                  platform internal staff console adheres to an Anti-Oracle
                  privacy design: platform administrators have zero visibility
                  into customer plan text.
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-card p-5">
                <h3 className="font-semibold text-foreground text-sm">
                  Can I invite my team and create multiple sub-teams?
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Yes. WeekSync supports multi-team organizations with Owners,
                  Admins, Team Leads, and Members. You can generate secure
                  invite links and organize your company into engineering,
                  product, and design pods.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-4xl rounded-2xl border border-border/80 bg-card p-10 md:p-14 text-center relative overflow-hidden shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-balance">
              Ready to ship your first verified week?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground text-balance leading-relaxed">
              Join high-velocity engineering teams that have replaced standup
              meetings with high-signal weekly alignment.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={APP_SIGNUP_URL}
                className={buttonVariants({
                  size: "lg",
                  className:
                    "h-12 px-8 bg-foreground hover:bg-foreground/90 text-background font-semibold text-sm shadow-md rounded-full",
                })}
              >
                Start Your Week Free
                <ArrowRight className="ml-2 size-4" />
              </a>
              <a
                href={APP_LOGIN_URL}
                className={buttonVariants({
                  variant: "ghost",
                  size: "lg",
                  className:
                    "h-12 px-6 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full",
                })}
              >
                Sign in to existing team
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/20 py-10 px-6">
        <div className="mx-auto max-w-6xl flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-6 w-auto" />
            <span className="text-xs text-muted-foreground font-mono">
              © {new Date().getFullYear()} WeekSync Inc. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground font-mono">
            <a href="#how-it-works" className="hover:text-foreground">
              Cadence
            </a>
            <a href="#ai-review" className="hover:text-foreground">
              AI Coach
            </a>
            <a href="#teams" className="hover:text-foreground">
              For Teams
            </a>
            <a href={APP_SIGNUP_URL} className="hover:text-primary">
              Sign Up
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
