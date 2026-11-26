import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toTailwindThemeCss } from "@wire/ui-config";

const target = fileURLToPath(new URL("./theme.generated.css", import.meta.url));
const contents = `/* Generated from @wire/ui-config's colorRolesSchema by .storybook/generate-theme-css.ts. Do not edit, run \`bun run gen:theme\` in packages/ui. */\n${toTailwindThemeCss()}`;

if (process.argv.includes("--check")) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current !== contents) {
    console.error(
      "theme.generated.css is out of date with @wire/ui-config. Run `bun run gen:theme` in packages/ui."
    );
    process.exit(1);
  }
} else {
  writeFileSync(target, contents);
}
