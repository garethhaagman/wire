/**
 * URL major version — breaking changes bump this. See internal-docs/api/versioning.md.
 * Mirrored in the /v1 URL prefix; kept as a constant so headers and envelopes can
 * report it without hardcoding the string in multiple places.
 */
export const API_VERSION = "v1";
