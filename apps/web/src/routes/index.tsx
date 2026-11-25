import { Navigate } from "react-router-dom";
import { useSession } from "@/lib/auth-client.js";

export default function HomeRoute(): React.JSX.Element {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="bg-background min-h-dvh" />;
  }
  return <Navigate replace to={session?.user ? "/workspaces" : "/login"} />;
}
