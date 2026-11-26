import { spawn } from "node:child_process";
import { relative } from "node:path";

const run = (command, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(`${command} ${args.join(" ")} exited with code ${code}`)
          )
    );
  });

// ESLint's flat config `files` globs resolve relative to the config file's
// own directory, which only lines up with lint-staged's glob matching when
// the process `cwd` is actually inside the workspace, so each wire-rules
// workspace spawns `eslint` directly with `cwd` set, the same way
// `turbo run lint:wire-rules` runs bare `eslint .` from inside each package.
// The extra scripts (`typecheck`, `check:theme`) check the whole workspace,
// not just staged files, so they run without file arguments. lint-staged
// only accepts a single `{ title, task }` object per glob, not an array.
const checkWorkspace = (workspace, scripts) => ({
  title: ["eslint", ...scripts]
    .map((step) => `${step} (${workspace})`)
    .join(", "),
  task: async (absolutePaths) => {
    const relativePaths = absolutePaths.map((file) =>
      relative(workspace, file)
    );
    await run("eslint", relativePaths, workspace);
    await Promise.all(
      scripts.map((script) => run("bun", ["run", script], workspace))
    );
  },
});

export default {
  "*": "ultracite fix",
  "apps/api/**/*.ts": checkWorkspace("apps/api", ["typecheck"]),
  "apps/web/**/*.{ts,tsx}": checkWorkspace("apps/web", [
    "typecheck",
    "check:theme",
  ]),
  "packages/db/**/*.ts": checkWorkspace("packages/db", ["typecheck"]),
  "packages/types/**/*.ts": checkWorkspace("packages/types", ["typecheck"]),
  "packages/ui/**/*.{ts,tsx}": checkWorkspace("packages/ui", [
    "typecheck",
    "check:theme",
  ]),
  "**/*.md": "markdownlint-cli2 --fix",
};
