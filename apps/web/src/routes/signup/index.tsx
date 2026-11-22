import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { signUp, useSession } from "@/lib/auth-client.js";
import { AuthLayout } from "@/components/auth/auth-layout.js";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button.js";
import { PasswordInput } from "@/components/auth/password-input.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";

const MIN_PASSWORD_LENGTH = 8;

export default function SignupRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session?.user) return <Navigate to="/workspaces" replace />;

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
      title="Create account"
      description={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Create a password"
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-hint"
            required
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        </div>

        {error ? (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={submitting} className="mt-1 w-full">
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
