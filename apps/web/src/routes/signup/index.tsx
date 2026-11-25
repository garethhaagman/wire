import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/auth-layout.js";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button.js";
import { PasswordInput } from "@/components/auth/password-input.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { signUp, useSession } from "@/lib/auth-client.js";

const MIN_PASSWORD_LENGTH = 8;

export default function SignupRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session?.user) {
    return <Navigate replace to="/workspaces" />;
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signUp.email({ name, email, password });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? "Sign up failed");
      return;
    }
    void navigate("/workspaces", { replace: true });
  }

  return (
    <AuthLayout
      description={
        <>
          Already have an account?{" "}
          <Link
            className="text-foreground font-medium underline-offset-4 hover:underline"
            to="/login"
          >
            Sign in
          </Link>
        </>
      }
      title="Create account"
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            autoComplete="name"
            autoFocus
            id="name"
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            required
            value={name}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            autoComplete="email"
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
            aria-describedby="password-hint"
            autoComplete="new-password"
            id="password"
            minLength={MIN_PASSWORD_LENGTH}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            required
            value={password}
          />
          <p className="text-muted-foreground text-xs" id="password-hint">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
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
          {submitting ? "Creating account" : "Create account"}
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-6">
        <AuthDivider />
        <GoogleButton onError={setError} />
      </div>
    </AuthLayout>
  );
}
