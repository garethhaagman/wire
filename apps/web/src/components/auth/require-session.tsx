import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "@/lib/auth-client.js";

/**
 * Session gate for authenticated surfaces. App wraps every route that is not
 * in PUBLIC_ROUTE_PATHS with this - do not re-wrap individual pages.
 * Pending → blank shell; no session → /login.
 */
export function RequireSession({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="bg-background min-h-dvh" />;
  }

  if (!session?.user) {
    return <Navigate replace to="/login" />;
  }

  return <>{children}</>;
}
