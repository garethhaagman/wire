import { Link } from "react-router-dom";
import { useSession } from "@/lib/auth-client.js";

export default function HomeRoute(): React.JSX.Element {
  const { data: session } = useSession();

  return (
    <main>
      <h1>Wire</h1>
      {session?.user ? (
        <Link to="/workspaces">Workspaces</Link>
      ) : (
        <Link to="/login">Sign in</Link>
      )}
    </main>
  );
}
