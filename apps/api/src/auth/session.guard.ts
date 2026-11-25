import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { RequestActor } from "../permissions/actor.js";
import type { Auth } from "./auth.config.js";
import { AUTH_INSTANCE } from "./auth.module.js";
import { Public } from "./public.decorator.js";

export interface AuthedRequest extends Request {
  /** Populated by PermissionsGuard — prefer the @CurrentActor()/@CurrentUser() param decorators. */
  actor?: RequestActor;
  session?: Awaited<ReturnType<Auth["api"]["getSession"]>>;
}

/**
 * Registered globally (app.module.ts) ahead of PermissionsGuard — populates
 * req.session so PermissionsGuard can resolve a role from it. Skips routes
 * marked @Public().
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(AUTH_INSTANCE) private readonly auth: Auth,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.get(Public, context.getHandler())) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AuthedRequest>();

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        headers.set(key, value.join(", "));
      }
    }

    const session = await this.auth.api.getSession({ headers });
    if (!session) {
      throw new UnauthorizedException("No active session");
    }

    req.session = session;
    return true;
  }
}
