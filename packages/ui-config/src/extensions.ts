import { z } from "zod";

/**
 * Forward-compatibility escape hatch. Any field a future version of this
 * schema wants to promote to a first-class, typed field can live here first
 * as a plain JSON value, namespaced by feature key (e.g. "messageDensity",
 * "experimentalCanvas"). This is what lets an AI agent — or a human — add a
 * new piece of UI-affecting config *today*, before a schema migration ships,
 * without the resolver treating it as invalid and discarding it.
 *
 * Rules enforced by convention, not by this type (document in
 * internal-docs/ui/config-schema.md):
 *  - Keys are kebab-case or camelCase feature identifiers, not dot-paths.
 *  - Values must be JSON-serializable (no functions/class instances).
 *  - Once a key graduates to a typed field elsewhere in the schema, it is
 *    removed from here in the same change — extensions is a staging area,
 *    not a permanent duplicate location for the same setting.
 */
export const extensionsSchema = z.record(z.string(), z.unknown());

export type Extensions = z.infer<typeof extensionsSchema>;
