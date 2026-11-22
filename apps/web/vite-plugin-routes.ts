import path from "node:path";
import fg from "fast-glob";
import type { Plugin } from "vite";

/**
 * Minimal directory-based routing: scans src/routes/**\/*.tsx and generates a virtual
 * module exporting a react-router route config. Convention:
 *   routes/index.tsx         -> /
 *   routes/workspaces/index.tsx -> /workspaces
 *   routes/workspaces/[id].tsx  -> /workspaces/:id
 *
 * This is intentionally small (no nested layouts, no loaders codegen) — the skeleton's
 * job is to prove the convention, not replace TanStack Router/Next's file-based routing.
 */
const VIRTUAL_ID = "virtual:wire-routes";
const RESOLVED_VIRTUAL_ID = "\0" + VIRTUAL_ID;

function filePathToRoutePath(relativeFile: string): string {
  let routePath = relativeFile
    .replace(/\.tsx$/, "")
    .replace(/\/index$/, "")
    .replace(/^index$/, "");

  routePath = routePath.replace(/\[([^\]]+)\]/g, ":$1");

  return "/" + routePath;
}

export function wireRoutesPlugin(): Plugin {
  const routesDir = path.resolve(__dirname, "src/routes");

  async function generateModule(): Promise<string> {
    const files = await fg("**/*.tsx", { cwd: routesDir });
    files.sort();

    const imports: string[] = [];
    const entries: string[] = [];

    files.forEach((file, i) => {
      const routePath = filePathToRoutePath(file) || "/";
      const importName = `Route${i}`;
      const importPath = `/src/routes/${file}`;
      imports.push(`import ${importName} from "${importPath}";`);
      entries.push(`  { path: ${JSON.stringify(routePath)}, Component: ${importName} }`);
    });

    return `${imports.join("\n")}\n\nexport const routes = [\n${entries.join(",\n")}\n];\n`;
  }

  return {
    name: "wire-routes",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
      return undefined;
    },
    async load(id) {
      if (id === RESOLVED_VIRTUAL_ID) return generateModule();
      return undefined;
    },
    configureServer(server) {
      server.watcher.add(routesDir);
      server.watcher.on("all", (_, file) => {
        if (file.startsWith(routesDir)) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
            server.ws.send({ type: "full-reload" });
          }
        }
      });
    },
  };
}
