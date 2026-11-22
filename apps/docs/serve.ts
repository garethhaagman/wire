import { normalize, resolve } from "node:path";

const docsDir = import.meta.dir;
const repoRoot = resolve(docsDir, "../..");
const port = Number(process.env.PORT ?? 3000);

// Mirrors the Docker image's /site layout (see Dockerfile) without copying files.
// Only these paths are served — never anything else in the repo (.env files etc.).
const siteFiles: Record<string, string> = {
  "/": resolve(docsDir, "index.html"),
  "/index.html": resolve(docsDir, "index.html"),
  "/_sidebar.md": resolve(docsDir, "_sidebar.md"),
  "/README.md": resolve(repoRoot, "README.md"),
};
const internalDocsDir = resolve(repoRoot, "internal-docs");

function resolvePath(pathname: string): string | null {
  const fixed = siteFiles[pathname];
  if (fixed) return fixed;
  if (!pathname.startsWith("/internal-docs/")) return null;
  const candidate = resolve(repoRoot, normalize(`.${pathname}`));
  return candidate.startsWith(`${internalDocsDir}/`) ? candidate : null;
}

Bun.serve({
  port,
  async fetch(req) {
    const path = resolvePath(decodeURIComponent(new URL(req.url).pathname));
    const file = path ? Bun.file(path) : null;
    if (!file || !(await file.exists())) return new Response("Not found", { status: 404 });
    return new Response(file);
  },
});

console.warn(`wire docs at http://localhost:${port}`);
