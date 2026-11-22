import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { signIn, useSession } from "@/lib/auth-client.js";
import { AuthLayout } from "@/components/auth/auth-layout.js";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button.js";
import { PasswordInput } from "@/components/auth/password-input.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";

/** Better Auth redirects failed OAuth attempts back here with `?error=<code>`. */
function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  if (code === "access_denied") return "Google sign-in was cancelled.";
  return "Couldn't sign in with Google. Please try again.";
}

export default function LoginRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => oauthErrorMessage(searchParams.get("error")));
  const [submitting, setSubmitting] = useState(false);

  if (session?.user) return <Navigate to="/workspaces" replace />;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn.email({ email, password });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? "Sign in failed");
      return;
    }
    void navigate("/workspaces", { replace: true });
  }

  return (
    <AuthLayout
      title="Sign in"
      description={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            autoFocus
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            required
          />
        </div>

        {error ? (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={submitting} className="mt-1 w-full">
          {submitting ? <Loader2 className="animate-spin" /> : null}
          {submitting ? "Signing in" : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-6">
        <AuthDivider />
        <GoogleButton onError={setError} />
      </div>
    </AuthLayout>
  );
}
