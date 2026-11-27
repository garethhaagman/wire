/**
 * Routes that do not require a session. Everything else is protected by
 * default in App - add a path here only when the page must be reachable
 * while signed out.
 */
export const PUBLIC_ROUTE_PATHS = new Set<string>(["/", "/login", "/signup"]);
