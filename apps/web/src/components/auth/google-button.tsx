import { Button } from "@wire/ui";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { signIn } from "@/lib/auth-client.js";

/** Google's brand mark - its colors are mandated by Google's branding guidelines, not theme tokens. */
function GoogleMark(): React.JSX.Element {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" viewBox="0 0 24 24">
      <path
        d="M23.04 12.26c0-.82-.07-1.6-.2-2.36H12v4.46h6.19a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.43-4.96 3.43-8.47Z"
        fill="#4285F4"
      />
      <path
        d="M12 23.5c3.1 0 5.7-1.03 7.61-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.89 1.1-2.99 0-5.53-2.02-6.43-4.74H1.73v2.98A11.5 11.5 0 0 0 12 23.5Z"
        fill="#34A853"
      />
      <path
        d="M5.57 14.18a6.9 6.9 0 0 1 0-4.36V6.84H1.73a11.5 11.5 0 0 0 0 10.32l3.84-2.98Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.08c1.69 0 3.2.58 4.39 1.72l3.3-3.3A11.06 11.06 0 0 0 12 .5 11.5 11.5 0 0 0 1.73 6.84l3.84 2.98C6.47 7.1 9.01 5.08 12 5.08Z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * Starts Better Auth's Google OAuth flow. The API lives on a different origin, so both
 * callback URLs must be absolute - relative ones would resolve against the API.
 */
export function GoogleButton({
  onError,
}: {
  onError: (message: string) => void;
}): React.JSX.Element {
  const [redirecting, setRedirecting] = useState(false);

  async function handleClick(): Promise<void> {
    setRedirecting(true);
    const { origin } = window.location;
    const result = await signIn.social({
      provider: "google",
      callbackURL: `${origin}/workspaces`,
      errorCallbackURL: `${origin}/login`,
    });
    if (result.error) {
      setRedirecting(false);
      onError(
        result.error.code === "PROVIDER_NOT_FOUND"
          ? "Google sign-in isn't set up on this server yet."
          : (result.error.message ?? "Couldn't start Google sign-in")
      );
    }
  }

  return (
    <Button
      className="w-full"
      disabled={redirecting}
      onClick={() => void handleClick()}
      size="lg"
      type="button"
      variant="outline"
    >
      {redirecting ? (
        <Loader2 className="size-4 shrink-0 animate-spin" />
      ) : (
        <GoogleMark />
      )}
      Continue with Google
    </Button>
  );
}

export function AuthDivider(): React.JSX.Element {
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-[11px] font-medium tracking-wider uppercase">
      <span className="bg-border h-px flex-1" />
      or
      <span className="bg-border h-px flex-1" />
    </div>
  );
}
