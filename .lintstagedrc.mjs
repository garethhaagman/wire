import { spawn } from "node:child_process";
import { relative } from "node:path";

// ESLint's flat config `files` globs resolve relative to the config file's
// own directory, which only lines up with lint-staged's glob matching when
// the process `cwd` is actually inside the workspace — so each wire-rules
// workspace spawns `eslint` directly with `cwd` set, the same way
// `turbo run lint:wire-rules` runs bare `eslint .` from inside each package.
const eslintInWorkspace = (workspace) => ({
  title: `eslint (${workspace})`,
  task: (absolutePaths) =>
    new Promise((resolve, reject) => {
      const relativePaths = absolutePaths.map((file) =>
        relative(workspace, file)
      );
      const child = spawn("eslint", relativePaths, {
        cwd: workspace,
        stdio: "inherit",
      });
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`eslint exited with code ${code}`))
      );
    }),
});

export default {
  "*": "ultracite fix",
  "apps/api/**/*.ts": eslintInWorkspace("apps/api"),
  "apps/web/**/*.{ts,tsx}": eslintInWorkspace("apps/web"),
  "packages/db/**/*.ts": eslintInWorkspace("packages/db"),
  "packages/types/**/*.ts": eslintInWorkspace("packages/types"),
};
