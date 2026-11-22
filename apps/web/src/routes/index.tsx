import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { baseUiConfig } from "@wire/ui-config";
import { useSession } from "@/lib/auth-client.js";
import { buttonVariants } from "@/components/ui/button.js";

export default function HomeRoute(): React.JSX.Element {
  const { data: session } = useSession();
  const productName = baseUiConfig.branding.productName;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-muted px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <MessageSquare className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{productName}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {session?.user ? `Signed in as ${session.user.email}.` : "Sign in to get to your workspaces."}
        </p>
      </div>
      {session?.user ? (
        <Link to="/workspaces" className={buttonVariants({ size: "lg" })}>
          Go to workspaces
        </Link>
      ) : (
        <Link to="/login" className={buttonVariants({ size: "lg" })}>
          Sign in
        </Link>
      )}
    </main>
  );
}
