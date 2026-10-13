import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Building,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Users2,
  Target,
} from "lucide-react";
import { auth } from "@/api/endpoints/auth/auth";
import { customInstance } from "@/lib/api-client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn, getErrorMessage } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z
  .object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    org_mode: z.enum(["create", "join"]),
    create_org_name: z.string().optional(),
    invite_token: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.org_mode === "create") {
        return !!data.create_org_name && data.create_org_name.trim().length > 0;
      }
      return !!data.invite_token && data.invite_token.trim().length > 0;
    },
    {
      message: "Organization name or invite token is required",
      path: ["create_org_name"],
    }
  );

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export const Route = createFileRoute("/login")({
  validateSearch: (
    search: Record<string, unknown>
  ): { mode?: "login" | "signup" } => {
    return {
      mode: search["mode"] === "signup" ? "signup" : undefined,
    };
  },
  component: Login,
});

const DEMO_PERSONAS = [
  {
    role: "Org Owner",
    name: "Acme Owner",
    email: "owner@acme.com",
    badge: "Full Access",
    desc: "Organization settings, member management, teams",
  },
  {
    role: "Team Lead",
    name: "Acme Lead",
    email: "lead@acme.com",
    badge: "Approvals",
    desc: "Team weekly view, plan reviews & approvals",
  },
  {
    role: "Team Member",
    name: "Acme Member",
    email: "member@acme.com",
    badge: "Planning",
    desc: "Single main goal, sub-goals, AI plan review",
  },
  {
    role: "Second Org",
    name: "Globex Owner",
    email: "owner@globex.com",
    badge: "Tenant B",
    desc: "Cross-tenant isolation & security boundary",
  },
];

function Login() {
  const search = Route.useSearch();
  const [tab, setTab] = useState<"login" | "signup">(() =>
    search["mode"] === "signup" ? "signup" : "login"
  );
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      org_mode: "create",
      create_org_name: "",
      invite_token: "",
    },
    mode: "onTouched",
  });

  const [orgMode, setOrgMode] = useState<"create" | "join">("create");

  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => auth(data),
    onSuccess: () => {
      setAuthError("");
      queryClient.clear();
      navigate({ to: "/dashboard" });
    },
    onError: (err: unknown) => {
      setAuthError(getErrorMessage(err, "Invalid email or password"));
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      return customInstance<{
        user: { id: string; email: string };
        organization_id: string;
      }>("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          first_name: data.first_name,
          last_name: data.last_name,
          org_name:
            data.org_mode === "create" ? data.create_org_name : undefined,
          invite_token:
            data.org_mode === "join" ? data.invite_token : undefined,
        }),
      });
    },
    onSuccess: () => {
      setAuthError("");
      queryClient.clear();
      navigate({ to: "/dashboard" });
    },
    onError: (err: unknown) => {
      setAuthError(
        getErrorMessage(err, "Sign up failed. Please check your details.")
      );
    },
  });

  const handleQuickLogin = (email: string) => {
    setAuthError("");
    loginForm.setValue("email", email);
    loginForm.setValue("password", "Password123!");
    loginMutation.mutate({ email, password: "Password123!" });
  };

  return (
    <div className="min-h-[100dvh] w-full grid lg:grid-cols-12 bg-background text-foreground">
      {/* LEFT COLUMN: Modern Authentication Panel */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between px-6 sm:px-12 py-10 lg:py-14 border-r border-border">
        {/* Top Branding Lockup */}
        <div className="flex items-center justify-between">
          <Logo className="h-7 w-auto" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-2.5 py-1 rounded-full border border-border bg-card">
            v1.0 SaaS
          </span>
        </div>

        {/* Center: Auth Card & Form */}
        <div className="my-auto w-full max-w-md mx-auto py-8">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {tab === "login" ? "Welcome back" : "Create an account"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {tab === "login"
                ? "Align your week with verifiable outcomes and lead sign-off."
                : "Join your team's weekly commitment cadence in seconds."}
            </p>
          </div>

          {/* Tab Switcher Pills */}
          <div className="flex rounded-full border border-border bg-muted/30 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setAuthError("");
              }}
              className={cn(
                "flex-1 rounded-full py-1.5 text-xs font-medium transition-all cursor-pointer",
                tab === "login"
                  ? "bg-foreground text-background font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("signup");
                setAuthError("");
              }}
              className={cn(
                "flex-1 rounded-full py-1.5 text-xs font-medium transition-all cursor-pointer",
                tab === "signup"
                  ? "bg-foreground text-background font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
              <span className="font-semibold shrink-0">Error:</span>
              <span className="leading-tight">{authError}</span>
            </div>
          )}

          {tab === "login" ? (
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit((d) =>
                  loginMutation.mutate(d)
                )}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Work Email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                          <Input
                            placeholder="name@company.com"
                            className="pl-9 text-xs h-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs font-medium">
                          Password
                        </FormLabel>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Default: Password123!
                        </span>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-9 pr-9 text-xs h-9"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full h-10 rounded-full text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {loginMutation.isPending
                    ? "Authenticating..."
                    : "Sign In to WeekSync"}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...signupForm}>
              <form
                onSubmit={signupForm.handleSubmit((d) =>
                  signupMutation.mutate(d)
                )}
                className="space-y-3.5"
              >
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={signupForm.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          First Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Umair"
                            className="text-xs h-9"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Last Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Khan"
                            className="text-xs h-9"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Work Email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                          <Input
                            placeholder="name@company.com"
                            className="pl-9 text-xs h-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Password (min 8 chars)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                          <Input
                            type={showSignupPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-9 pr-9 text-xs h-9"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowSignupPassword(!showSignupPassword)
                            }
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                            aria-label={
                              showSignupPassword
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showSignupPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                {/* Organization Selection Mode */}
                <div className="space-y-2 pt-1 border-t border-border">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                    Organization Workspace
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOrgMode("create");
                        signupForm.setValue("org_mode", "create");
                      }}
                      className={cn(
                        "flex-1 rounded-md border p-2 text-left text-xs transition-colors cursor-pointer",
                        orgMode === "create"
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <Building className="size-3.5 mb-1" />
                      <div>Create Org</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOrgMode("join");
                        signupForm.setValue("org_mode", "join");
                      }}
                      className={cn(
                        "flex-1 rounded-md border p-2 text-left text-xs transition-colors cursor-pointer",
                        orgMode === "join"
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <ShieldCheck className="size-3.5 mb-1" />
                      <div>Join via Invite</div>
                    </button>
                  </div>

                  {orgMode === "create" ? (
                    <FormField
                      control={signupForm.control}
                      name="create_org_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">
                            Organization Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Acme Engineering"
                              className="text-xs h-9"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={signupForm.control}
                      name="invite_token"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">
                            Invite Token
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Paste 64-char invite token"
                              className="text-xs font-mono h-9"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={signupMutation.isPending}
                  className="w-full h-10 rounded-full text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {signupMutation.isPending
                    ? "Creating Account..."
                    : "Create Account & Get Started"}
                </Button>
              </form>
            </Form>
          )}

          {/* Quick Demo Access Bar (Mobile Only) */}
          <div className="mt-8 lg:hidden rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                1-Click Demo Sandbox
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Password123!
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {DEMO_PERSONAS.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => handleQuickLogin(p.email)}
                  className="rounded-md border border-border p-2 text-left hover:bg-muted transition-colors cursor-pointer"
                >
                  <p className="font-medium text-foreground truncate">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {p.role}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[11px] font-mono text-muted-foreground flex items-center justify-between border-t border-border pt-4">
          <span>WeekSync Enterprise</span>
          <span>FastAPI + TanStack Start</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Editorial Showcase & Interactive Sandbox Picker */}
      <div className="lg:col-span-6 xl:col-span-7 bg-muted/30 p-8 lg:p-14 hidden lg:flex flex-col justify-between border-l border-border/60">
        {/* Top Product Value Pill */}
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-foreground" />
          <span className="font-mono text-xs text-muted-foreground">
            Continuous Engineering Commitment Protocol
          </span>
        </div>

        {/* Center: Interactive Demo Sandbox Selector */}
        <div className="max-w-lg space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Instant Evaluation Sandbox
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select any pre-seeded persona to test end-to-end multi-tenant
              isolation, role checks, weekly plan authoring, and lead review
              flows with zero typing.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {DEMO_PERSONAS.map((persona) => (
              <button
                key={persona.email}
                type="button"
                onClick={() => handleQuickLogin(persona.email)}
                className="group relative rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {persona.name}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary font-medium">
                    {persona.badge}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3 leading-snug">
                  {persona.desc}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground group-hover:text-foreground">
                  <span className="truncate">{persona.email}</span>
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>

          {/* 3-Pillar Commitment Guarantee */}
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <ShieldCheck className="size-4 text-primary" />
              <span>Multi-Tenant Security Invariant</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Every request is scoped by JWT membership. Tenant A and Tenant B
              data are hermetically isolated. Cross-tenant probes return
              non-revealing 404s.
            </p>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Target className="size-3.5 text-primary" />
            <span>1 Main Goal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span>Pydantic AI Coach</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users2 className="size-3.5 text-primary" />
            <span>Lead Sign-Off</span>
          </div>
        </div>
      </div>
    </div>
  );
}
