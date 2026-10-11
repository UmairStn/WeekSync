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
} from "lucide-react";
import { auth } from "@/api/endpoints/auth/auth";
import { customInstance, ApiError } from "@/lib/api-client";
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
import { cn } from "@/lib/utils";

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

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    onError: (error: unknown) => {
      if (!(error instanceof ApiError)) {
        setAuthError(
          "Network error. Please check your connection and try again."
        );
        return;
      }
      if (error.status === 401) {
        setAuthError("Incorrect email or password.");
      } else if (error.status === 403) {
        setAuthError("This organization is suspended. Please contact support.");
      } else {
        setAuthError("Authentication failed. Please verify credentials.");
      }
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      return customInstance("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          first_name: data.first_name,
          last_name: data.last_name,
          create_org_name:
            data.org_mode === "create" ? data.create_org_name : null,
          invite_token: data.org_mode === "join" ? data.invite_token : null,
        }),
      });
    },
    onSuccess: () => {
      setAuthError("");
      queryClient.clear();
      navigate({ to: "/dashboard" });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        const errorData = error.data as { detail?: string };
        setAuthError(
          errorData?.detail || "Sign-up failed. Please check your inputs."
        );
      } else {
        setAuthError("Sign-up failed. Please try again.");
      }
    },
  });

  const handleQuickLogin = (email: string) => {
    setAuthError("");
    loginForm.setValue("email", email);
    loginForm.setValue("password", "Password123!");
    loginMutation.mutate({ email, password: "Password123!" });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FBFBFA] dark:bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Logo className="h-8" />
          <h1 className="font-serif text-3xl font-normal tracking-tight text-foreground">
            Align your week. Ship what matters.
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs">
            Weekly planning built around real execution: single main goals,
            clear business justifications, and team synchrony.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setAuthError("");
            }}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-medium transition-all",
              tab === "login"
                ? "bg-foreground text-background font-semibold"
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
              "flex-1 rounded-md py-1.5 text-xs font-medium transition-all",
              tab === "signup"
                ? "bg-foreground text-background font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Create Account
          </button>
        </div>

        {/* Card Form */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          {authError && (
            <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {authError}
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
                          <Mail
                            className="absolute left-3 top-2.5 size-4 text-muted-foreground"
                            strokeWidth={2}
                          />
                          <Input
                            placeholder="name@company.com"
                            className="pl-9 text-xs"
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
                      <FormLabel className="text-xs font-medium">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock
                            className="absolute left-3 top-2.5 size-4 text-muted-foreground"
                            strokeWidth={2}
                          />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-9 pr-9 text-xs"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" strokeWidth={2} />
                            ) : (
                              <Eye className="size-4" strokeWidth={2} />
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
                  className="w-full bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold h-9"
                >
                  {loginMutation.isPending ? "Authenticating..." : "Sign In"}
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
                            className="text-xs"
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
                            placeholder="Stone"
                            className="text-xs"
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
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="umair@example.com"
                          className="text-xs"
                          {...field}
                        />
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
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                {/* Organization mode selection */}
                <div className="space-y-2 pt-1 border-t border-border">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOrgMode("create");
                        signupForm.setValue("org_mode", "create");
                      }}
                      className={cn(
                        "flex-1 rounded-md border p-2 text-left text-xs transition-colors",
                        orgMode === "create"
                          ? "border-foreground bg-muted font-medium text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <Building
                        className="size-3.5 mb-1 text-foreground"
                        strokeWidth={2}
                      />
                      <div>Create New Org</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOrgMode("join");
                        signupForm.setValue("org_mode", "join");
                      }}
                      className={cn(
                        "flex-1 rounded-md border p-2 text-left text-xs transition-colors",
                        orgMode === "join"
                          ? "border-foreground bg-muted font-medium text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <ShieldCheck
                        className="size-3.5 mb-1 text-foreground"
                        strokeWidth={2}
                      />
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
                              className="text-xs"
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
                              placeholder="Paste token here"
                              className="text-xs font-mono"
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
                  className="w-full bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold h-9 mt-2"
                >
                  {signupMutation.isPending
                    ? "Creating account..."
                    : "Complete Sign Up"}
                </Button>
              </form>
            </Form>
          )}
        </div>

        {/* Quick Demo Credentials Switcher */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Instant Demo Access
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              Pass: Password123!
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin("owner@acme.com")}
              className="flex items-center justify-between rounded-md border border-border p-2 text-left hover:bg-muted/60 transition-colors"
            >
              <div>
                <p className="font-medium text-foreground">Acme Owner</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  owner@acme.com
                </p>
              </div>
              <ArrowRight className="size-3 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("lead@acme.com")}
              className="flex items-center justify-between rounded-md border border-border p-2 text-left hover:bg-muted/60 transition-colors"
            >
              <div>
                <p className="font-medium text-foreground">Acme Team Lead</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  lead@acme.com
                </p>
              </div>
              <ArrowRight className="size-3 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("member@acme.com")}
              className="flex items-center justify-between rounded-md border border-border p-2 text-left hover:bg-muted/60 transition-colors"
            >
              <div>
                <p className="font-medium text-foreground">Acme Member</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  member@acme.com
                </p>
              </div>
              <ArrowRight className="size-3 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("owner@globex.com")}
              className="flex items-center justify-between rounded-md border border-border p-2 text-left hover:bg-muted/60 transition-colors"
            >
              <div>
                <p className="font-medium text-foreground">Globex Owner</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  owner@globex.com
                </p>
              </div>
              <ArrowRight className="size-3 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
