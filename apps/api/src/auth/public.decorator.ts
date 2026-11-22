import { Reflector } from "@nestjs/core";

/**
 * Marks a route as exempt from SessionGuard and PermissionsGuard — both are
 * registered globally (see app.module.ts) and skip any handler carrying this.
 * Use sparingly: health checks, and anything else that must work unauthenticated.
 */
export const Public = Reflector.createDecorator<true>();
