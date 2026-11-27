import { Button, Input, Label } from "@wire/ui";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "@/components/auth/auth-layout.js";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button.js";
import { PasswordInput } from "@/components/auth/password-input.js";
import { signIn, useSession } from "@/lib/auth-client.js";

/** Better Auth redirects failed OAuth attempts back here with `?error=<code>`. */
function oauthErrorMessage(code: string | null): string | null {
  if (!code) {
    return null;
  }
  if (code === "access_denied") {
    return "Google sign-in was cancelled.";
  }
  return "Couldn't sign in with Google. Please try again.";
}

export default function LoginRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    oauthErrorMessage(searchParams.get("error"))
  );
  const [submitting, setSubmitting] = useState(false);

  if (session?.user) {
    return <Navigate replace to="/workspaces" />;
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn.email({
      email,
      password,
      callbackURL: `${window.location.origin}/workspaces`,
    });
    setSubmitting(false);
    if (result.error) {
      if (result.error.status === 403) {
        setError(
          "Please verify your email before signing in. We sent a new link if this account needs one."
        );
        return;
      }
      setError(result.error.message ?? "Sign in failed");
      return;
    }
    void navigate("/workspaces", { replace: true });
  }

  return (
    <AuthLayout
      description={
        <>
          Don&apos;t have an account?{" "}
          <Link
            className="text-foreground font-medium underline-offset-4 hover:underline"
            to="/signup"
          >
            Sign up
          </Link>
        </>
      }
      title="Sign in"
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            aria-invalid={error ? true : undefined}
            autoComplete="email"
            autoFocus
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            type="email"
            value={email}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            aria-invalid={error ? true : undefined}
            autoComplete="current-password"
            id="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            value={password}
          />
        </div>

        {error ? (
          <p
            className="border-destructive/20 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <Button
          className="mt-1 w-full"
          disabled={submitting}
          size="lg"
          type="submit"
        >
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
